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

export const init = spacetimedb.init((ctx) => seedSampleEtfHoldings(ctx));

export const loadSampleEtfHoldings = spacetimedb.reducer((ctx) => {
  seedSampleEtfHoldings(ctx);
  const access = ctx.db.portfolio_access.identity.find(ctx.sender);
  if (access) evaluateExposureWarnings(ctx, access.portfolio_id);
});

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
