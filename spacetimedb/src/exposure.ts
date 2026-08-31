import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import spacetimedb, { type Ctx } from "./schema";

interface CompanyExposureValue {
  symbol: string;
  value: number;
}

export const setExposureLimit = spacetimedb.reducer(
  { maximumPercentage: t.f64() },
  (ctx, { maximumPercentage }) => {
    const portfolioId = requirePortfolioId(ctx);
    if (
      !Number.isFinite(maximumPercentage) || maximumPercentage < 1 ||
      maximumPercentage > 100
    ) {
      throw new SenderError("Exposure limit must be between 1% and 100%");
    }
    const next = {
      portfolio_id: portfolioId,
      maximum_percentage: maximumPercentage,
    };
    if (ctx.db.exposure_limit.portfolio_id.find(portfolioId)) {
      ctx.db.exposure_limit.portfolio_id.update(next);
    } else {
      ctx.db.exposure_limit.insert(next);
    }
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

export function evaluateExposureWarnings(ctx: Ctx, portfolioId: bigint): void {
  const setting = ctx.db.exposure_limit.portfolio_id.find(portfolioId);
  if (!setting) return;
  const { portfolioValue, exposures } = calculateCompanyExposures(
    ctx,
    portfolioId,
  );
  const currentBreaches = new Set<string>();

  for (const exposure of exposures) {
    const percentage = portfolioValue > 0
      ? exposure.value / portfolioValue * 100
      : 0;
    if (percentage <= setting.maximum_percentage) continue;
    const key = `${portfolioId}:${exposure.symbol}`;
    currentBreaches.add(key);
    const existing = ctx.db.exposure_breach.key.find(key);
    if (!existing) {
      ctx.db.exposure_warning.insert({
        id: 0n,
        portfolio_id: portfolioId,
        symbol: exposure.symbol,
        percentage,
        limit: setting.maximum_percentage,
        exposure_value: exposure.value,
        portfolio_value: portfolioValue,
        created_at: ctx.timestamp,
      });
      ctx.db.exposure_breach.insert({
        key,
        portfolio_id: portfolioId,
        symbol: exposure.symbol,
        percentage,
      });
    } else {
      ctx.db.exposure_breach.key.update({ ...existing, percentage });
    }
  }

  for (
    const breach of ctx.db.exposure_breach.portfolio_id.filter(portfolioId)
  ) {
    if (!currentBreaches.has(breach.key)) {
      ctx.db.exposure_breach.key.delete(
        breach.key,
      );
    }
  }
  trimWarningHistory(ctx, portfolioId);
}

function calculateCompanyExposures(
  ctx: Ctx,
  portfolioId: bigint,
): { portfolioValue: number; exposures: CompanyExposureValue[] } {
  const exposureBySymbol = new Map<string, number>();
  let portfolioValue = 0;
  for (const position of ctx.db.position.portfolio_id.filter(portfolioId)) {
    const asset = ctx.db.asset.id.find(position.asset_id);
    const currentPrice = ctx.db.price.asset_id.find(position.asset_id);
    if (!asset || !currentPrice) continue;
    const value = position.amount * currentPrice.value;
    portfolioValue += value;
    if (asset.asset_type === "stock") {
      addCompanyExposure(exposureBySymbol, asset.symbol, value);
    } else if (asset.asset_type === "etf") {
      const etfSymbol = asset.symbol.toUpperCase();
      const imported = [
        ...ctx.db.portfolio_etf_holding.by_portfolio_etf.filter([
          portfolioId,
          etfSymbol,
        ]),
      ];
      const holdings = imported.length > 0
        ? imported
        : [...ctx.db.etf_holding.etf_symbol.filter(etfSymbol)];
      for (const holding of holdings) {
        addCompanyExposure(
          exposureBySymbol,
          holding.holding_symbol,
          value * holding.weight / 100,
        );
      }
    }
  }
  return {
    portfolioValue,
    exposures: [...exposureBySymbol].map(([symbol, value]) => ({
      symbol,
      value,
    })),
  };
}

function addCompanyExposure(
  exposures: Map<string, number>,
  rawSymbol: string,
  value: number,
): void {
  const symbol = rawSymbol.toUpperCase();
  exposures.set(symbol, (exposures.get(symbol) ?? 0) + value);
}

function trimWarningHistory(ctx: Ctx, portfolioId: bigint): void {
  const warnings = [...ctx.db.exposure_warning.portfolio_id.filter(portfolioId)]
    .sort((left, right) => {
      const leftTime = left.created_at.microsSinceUnixEpoch;
      const rightTime = right.created_at.microsSinceUnixEpoch;
      return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
    });
  for (const warning of warnings.slice(0, Math.max(0, warnings.length - 20))) {
    ctx.db.exposure_warning.id.delete(warning.id);
  }
}
