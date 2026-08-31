import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import { evaluateExposureWarnings } from "./exposure";
import spacetimedb, { type Ctx } from "./schema";

const sampleEtfHoldings = [
  ["VOO", "NVDA", "NVIDIA", 8.0],
  ["VOO", "AAPL", "Apple", 7.0],
  ["VOO", "MSFT", "Microsoft", 6.2],
  ["VOO", "AMZN", "Amazon", 3.8],
  ["VOO", "META", "Meta Platforms", 2.6],
  ["QQQ", "NVDA", "NVIDIA", 9.2],
  ["QQQ", "MSFT", "Microsoft", 8.0],
  ["QQQ", "AAPL", "Apple", 7.5],
  ["QQQ", "AMZN", "Amazon", 5.4],
  ["QQQ", "AVGO", "Broadcom", 4.8],
  ["VWCE", "NVDA", "NVIDIA", 4.5],
  ["VWCE", "AAPL", "Apple", 4.2],
  ["VWCE", "MSFT", "Microsoft", 3.7],
  ["VWCE", "AMZN", "Amazon", 2.3],
  ["VWCE", "META", "Meta Platforms", 1.6],
] as const;

const ImportedEtfHolding = t.object("ImportedEtfHolding", {
  symbol: t.string(),
  name: t.string(),
  weight: t.f64(),
});

const holdingSymbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const providerNamePattern = /^[a-z0-9][a-z0-9-]{0,31}$/;

export const init = spacetimedb.init((ctx) => seedSampleEtfHoldings(ctx));

export const loadSampleEtfHoldings = spacetimedb.reducer((ctx) => {
  seedSampleEtfHoldings(ctx);
  const access = ctx.db.portfolio_access.identity.find(ctx.sender);
  if (access) evaluateExposureWarnings(ctx, access.portfolio_id);
});

export const replaceEtfHoldings = spacetimedb.reducer(
  {
    etfSymbol: t.string(),
    source: t.string(),
    holdings: t.array(ImportedEtfHolding),
  },
  (ctx, { etfSymbol, source, holdings }) => {
    const portfolioId = requirePortfolioId(ctx);
    const normalizedEtf = etfSymbol.trim().toUpperCase();
    const normalizedSource = source.trim().toLowerCase();
    if (!providerNamePattern.test(normalizedSource)) {
      throw new SenderError("ETF holdings source is invalid");
    }
    const ownedEtf = [...ctx.db.asset.portfolio_id.filter(portfolioId)].some(
      (asset) => asset.asset_type === "etf" && asset.symbol === normalizedEtf,
    );
    if (!ownedEtf) throw new SenderError("ETF not found in this portfolio");
    if (holdings.length === 0 || holdings.length > 5_000) {
      throw new SenderError("ETF holdings count must be between 1 and 5000");
    }

    const normalized = new Map<
      string,
      { symbol: string; name: string; weight: number }
    >();
    let totalWeight = 0;
    for (const holding of holdings) {
      const symbol = holding.symbol.trim().toUpperCase();
      const name = holding.name.trim().slice(0, 160);
      if (!holdingSymbolPattern.test(symbol) || !name) {
        continue;
      }
      if (
        !Number.isFinite(holding.weight) || holding.weight <= 0 ||
        holding.weight > 100
      ) {
        throw new SenderError("ETF holding weight must be between 0 and 100");
      }
      const existing = normalized.get(symbol);
      if (existing) existing.weight += holding.weight;
      else normalized.set(symbol, { symbol, name, weight: holding.weight });
      totalWeight += holding.weight;
    }
    if (normalized.size === 0) {
      throw new SenderError("ETF holdings contain no usable company rows");
    }
    if (totalWeight > 101) {
      throw new SenderError("ETF holding weights exceed 101%");
    }

    for (
      const existing of ctx.db.portfolio_etf_holding.by_portfolio_etf.filter([
        portfolioId,
        normalizedEtf,
      ])
    ) {
      ctx.db.portfolio_etf_holding.key.delete(existing.key);
    }
    for (const holding of normalized.values()) {
      ctx.db.portfolio_etf_holding.insert({
        key: `${portfolioId}:${normalizedEtf}:${holding.symbol}`,
        portfolio_id: portfolioId,
        etf_symbol: normalizedEtf,
        holding_symbol: holding.symbol,
        holding_name: holding.name,
        weight: holding.weight,
        source: normalizedSource,
        fetched_at: ctx.timestamp,
      });
    }
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

function seedSampleEtfHoldings(ctx: Ctx): void {
  for (
    const [etfSymbol, holdingSymbol, holdingName, weight] of sampleEtfHoldings
  ) {
    const key = `${etfSymbol}:${holdingSymbol}`;
    if (ctx.db.etf_holding.key.find(key)) continue;
    ctx.db.etf_holding.insert({
      key,
      etf_symbol: etfSymbol,
      holding_symbol: holdingSymbol,
      holding_name: holdingName,
      weight,
    });
  }
}
