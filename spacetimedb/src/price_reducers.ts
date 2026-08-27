import { ScheduleAt } from "spacetimedb";
import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import { evaluateExposureWarnings } from "./exposure";
import spacetimedb, { type Ctx, test_price_tick } from "./schema";

export const setPrice = spacetimedb.reducer(
  { assetId: t.u64(), value: t.f64() },
  (ctx, { assetId, value }) => {
    const portfolioId = requirePortfolioId(ctx);
    if (!Number.isFinite(value) || value < 0) {
      throw new SenderError("Price cannot be negative");
    }
    const asset = ctx.db.asset.id.find(assetId);
    if (!asset || asset.portfolio_id !== portfolioId) {
      throw new SenderError("Asset not found");
    }
    const existing = ctx.db.price.asset_id.find(assetId);
    const next = {
      asset_id: assetId,
      portfolio_id: portfolioId,
      value,
      updated_at: ctx.timestamp,
      change: existing ? value - existing.value : 0,
      source: "manual",
    };
    if (existing) ctx.db.price.asset_id.update(next);
    else ctx.db.price.insert(next);
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

export const startTestPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  setFeedState(ctx, portfolioId, true);
  ctx.db.real_price_tick.portfolio_id.delete(portfolioId);
  const realFeed = ctx.db.real_price_feed.portfolio_id.find(portfolioId);
  if (realFeed?.is_running) {
    ctx.db.real_price_feed.portfolio_id.update({
      ...realFeed,
      is_running: false,
      message: "Real prices stopped",
    });
  }
  if (!ctx.db.test_price_tick.portfolio_id.find(portfolioId)) {
    ctx.db.test_price_tick.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(5_000_000n),
      portfolio_id: portfolioId,
    });
  }
  updatePortfolioTestPrices(ctx, portfolioId);
});

export const stopTestPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  setFeedState(ctx, portfolioId, false);
  ctx.db.test_price_tick.portfolio_id.delete(portfolioId);
});

export const updateTestPrices = spacetimedb.reducer(
  { onSchedule: test_price_tick },
  { tick: test_price_tick.rowType },
  (ctx, { tick }) => {
    const feed = ctx.db.test_price_feed.portfolio_id.find(tick.portfolio_id);
    if (feed?.is_running) updatePortfolioTestPrices(ctx, tick.portfolio_id);
  },
);

function setFeedState(ctx: Ctx, portfolioId: bigint, isRunning: boolean): void {
  const existing = ctx.db.test_price_feed.portfolio_id.find(portfolioId);
  const next = { portfolio_id: portfolioId, is_running: isRunning };
  if (existing) ctx.db.test_price_feed.portfolio_id.update(next);
  else ctx.db.test_price_feed.insert(next);
}

function updatePortfolioTestPrices(ctx: Ctx, portfolioId: bigint): void {
  for (const asset of ctx.db.asset.portfolio_id.filter(portfolioId)) {
    const firstPosition =
      ctx.db.position.asset_id.filter(asset.id).next().value;
    if (!firstPosition) continue;
    const existing = ctx.db.price.asset_id.find(asset.id);
    const previousValue = existing?.value ??
      Math.max(firstPosition.purchase_price, 0.01);
    const movement = ctx.random.integerInRange(-100, 100) / 10_000;
    const nextValue = Math.max(
      0.01,
      Math.round(previousValue * (1 + movement) * 10_000) / 10_000,
    );
    const next = {
      asset_id: asset.id,
      portfolio_id: portfolioId,
      value: nextValue,
      updated_at: ctx.timestamp,
      change: nextValue - previousValue,
      source: "test",
    };
    if (existing) ctx.db.price.asset_id.update(next);
    else ctx.db.price.insert(next);
  }
  evaluateExposureWarnings(ctx, portfolioId);
}
