import { ScheduleAt, Timestamp } from "spacetimedb";
import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import { evaluateExposureWarnings } from "./exposure";
import { CoinGeckoQuoteProvider } from "./market_data/providers/coingecko";
import { YahooQuoteProvider } from "./market_data/providers/yahoo";
import { QuoteService } from "./market_data/quote_service";
import type { MarketQuote } from "./market_data/types";
import spacetimedb, { type Ctx, type ProcCtx, real_price_tick } from "./schema";

const HOURLY = 3_600_000_000n;
const quoteService = new QuoteService([
  new YahooQuoteProvider(),
  new CoinGeckoQuoteProvider(),
]);

const RefreshResult = t.object("RefreshResult", {
  updated: t.u32(),
  failed: t.u32(),
  message: t.string(),
});

export const startRealPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  setRealFeedState(ctx, portfolioId, true, "Waiting for first refresh");
  if (!ctx.db.real_price_tick.portfolio_id.find(portfolioId)) {
    ctx.db.real_price_tick.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(HOURLY),
      portfolio_id: portfolioId,
    });
  }
  ctx.db.test_price_tick.portfolio_id.delete(portfolioId);
  const testFeed = ctx.db.test_price_feed.portfolio_id.find(portfolioId);
  if (testFeed?.is_running) {
    ctx.db.test_price_feed.portfolio_id.update({
      ...testFeed,
      is_running: false,
    });
  }
});

export const stopRealPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  setRealFeedState(ctx, portfolioId, false, "Real prices stopped");
  ctx.db.real_price_tick.portfolio_id.delete(portfolioId);
});

export const refreshRealPrices = spacetimedb.procedure(
  {},
  RefreshResult,
  (ctx) => {
    const portfolioId = ctx.withTx((tx) => requirePortfolioId(tx));
    return refreshPortfolio(ctx, portfolioId);
  },
);

export const updateRealPrices = spacetimedb.procedure(
  { onSchedule: real_price_tick },
  { tick: real_price_tick.rowType },
  t.unit(),
  (ctx, { tick }) => {
    if (ctx.connectionId) {
      throw new SenderError("Scheduled refresh cannot be called by a client");
    }
    const enabled = ctx.withTx((tx) =>
      tx.db.real_price_feed.portfolio_id.find(tick.portfolio_id)?.is_running ??
        false
    );
    if (enabled) refreshPortfolio(ctx, tick.portfolio_id);
    return {};
  },
);

function refreshPortfolio(
  ctx: ProcCtx,
  portfolioId: bigint,
): { updated: number; failed: number; message: string } {
  const assets = ctx.withTx((tx) =>
    [...tx.db.asset.portfolio_id.filter(portfolioId)].map((asset) => ({
      id: asset.id,
      symbol: asset.symbol,
      assetType: asset.asset_type,
    }))
  );
  const quotes = new Map<bigint, MarketQuote>();
  const failures: string[] = [];

  for (const asset of assets) {
    const result = quoteService.fetch(ctx, asset);
    if (result.quote) quotes.set(asset.id, result.quote);
    else failures.push(`${asset.symbol}: ${result.error}`);
  }

  const message = buildStatusMessage(quotes.size, failures);
  ctx.withTx((tx) => {
    const existingFeed = tx.db.real_price_feed.portfolio_id.find(portfolioId);
    const nextFeed = {
      portfolio_id: portfolioId,
      is_running: existingFeed?.is_running ?? false,
      last_attempt_at: tx.timestamp,
      last_success_at: quotes.size > 0
        ? tx.timestamp
        : existingFeed?.last_success_at,
      message,
    };
    if (existingFeed) tx.db.real_price_feed.portfolio_id.update(nextFeed);
    else tx.db.real_price_feed.insert(nextFeed);

    for (const [assetId, quote] of quotes) {
      const existing = tx.db.price.asset_id.find(assetId);
      const next = {
        asset_id: assetId,
        portfolio_id: portfolioId,
        value: quote.value,
        updated_at: quote.marketTimeMicros
          ? new Timestamp(quote.marketTimeMicros)
          : tx.timestamp,
        change: existing ? quote.value - existing.value : 0,
        source: quote.source,
      };
      if (existing) tx.db.price.asset_id.update(next);
      else tx.db.price.insert(next);
    }
    evaluateExposureWarnings(tx, portfolioId);
  });

  return { updated: quotes.size, failed: failures.length, message };
}

function setRealFeedState(
  ctx: Ctx,
  portfolioId: bigint,
  isRunning: boolean,
  message: string,
): void {
  const existing = ctx.db.real_price_feed.portfolio_id.find(portfolioId);
  const next = {
    portfolio_id: portfolioId,
    is_running: isRunning,
    last_attempt_at: existing?.last_attempt_at,
    last_success_at: existing?.last_success_at,
    message,
  };
  if (existing) ctx.db.real_price_feed.portfolio_id.update(next);
  else ctx.db.real_price_feed.insert(next);
}

function buildStatusMessage(updated: number, failures: string[]): string {
  if (failures.length === 0) return `Updated ${updated} assets`;
  const details = failures.slice(0, 3).join("; ");
  return `Updated ${updated}; failed ${failures.length}. ${details}`;
}
