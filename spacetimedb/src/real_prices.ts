import { ScheduleAt, Timestamp } from "spacetimedb";
import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import { evaluateExposureWarnings } from "./exposure";
import spacetimedb, {
  type Ctx,
  type ProcCtx,
  real_price_tick,
} from "./schema";

const HOURLY = 3_600_000_000n;
const USER_AGENT = "ExposureRadar/0.1";

const RefreshResult = t.object("RefreshResult", {
  updated: t.u32(),
  failed: t.u32(),
  message: t.string(),
});

interface AssetSnapshot {
  id: bigint;
  symbol: string;
  assetType: string;
}

interface MarketQuote {
  value: number;
  source: "yahoo" | "coingecko";
  marketTimeMicros?: bigint;
}

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
    const result = fetchMarketQuote(ctx, asset);
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

function fetchMarketQuote(
  ctx: ProcCtx,
  asset: AssetSnapshot,
): { quote?: MarketQuote; error?: string } {
  const yahoo = fetchYahooQuote(ctx, asset);
  if (yahoo.quote) return yahoo;
  if (asset.assetType !== "crypto") return yahoo;

  const coingecko = fetchCoinGeckoQuote(ctx, asset.symbol);
  if (coingecko.quote) return coingecko;
  return {
    error: `Yahoo failed (${yahoo.error}); CoinGecko failed (${coingecko.error})`,
  };
}

function fetchYahooQuote(
  ctx: ProcCtx,
  asset: AssetSnapshot,
): { quote?: MarketQuote; error?: string } {
  const yahooSymbol = asset.assetType === "crypto"
    ? `${asset.symbol}-USD`
    : asset.symbol;
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${
    encodeURIComponent(yahooSymbol)
  }?interval=1d&range=5d`;
  try {
    const response = ctx.http.fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    const payload = response.json();
    const meta = payload?.chart?.result?.[0]?.meta;
    const value = meta?.regularMarketPrice;
    const marketTimeMicros = secondsToMicros(meta?.regularMarketTime);
    return validPrice(value)
      ? { quote: { value, source: "yahoo", marketTimeMicros } }
      : { error: "price missing" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
}

function fetchCoinGeckoQuote(
  ctx: ProcCtx,
  symbol: string,
): { quote?: MarketQuote; error?: string } {
  const normalized = symbol.trim().toLowerCase();
  const url = `https://api.coingecko.com/api/v3/simple/price?symbols=${
    encodeURIComponent(normalized)
  }&vs_currencies=usd&include_last_updated_at=true`;
  try {
    const response = ctx.http.fetch(url, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
    });
    if (!response.ok) return { error: `HTTP ${response.status}` };
    const payload = response.json();
    const value = payload?.[normalized]?.usd;
    const marketTimeMicros = secondsToMicros(
      payload?.[normalized]?.last_updated_at,
    );
    return validPrice(value)
      ? { quote: { value, source: "coingecko", marketTimeMicros } }
      : { error: "price missing" };
  } catch (error) {
    return { error: errorMessage(error) };
  }
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

function validPrice(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function secondsToMicros(value: unknown): bigint | undefined {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0
    ? BigInt(value) * 1_000_000n
    : undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "request failed";
}
