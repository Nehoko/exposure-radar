import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "../access";
import spacetimedb from "../schema";

export const EULERPOOL_PROVIDER = "eulerpool";
export const ALPHA_VANTAGE_PROVIDER = "alpha-vantage";
const supportedProviders = new Set([
  EULERPOOL_PROVIDER,
  ALPHA_VANTAGE_PROVIDER,
]);

export const setMarketDataCredential = spacetimedb.reducer(
  { provider: t.string(), apiKey: t.string() },
  (ctx, { provider, apiKey }) => {
    requirePortfolioId(ctx);
    const normalizedProvider = normalizeProvider(provider);
    const normalizedKey = apiKey.trim();
    if (!normalizedKey || normalizedKey.length > 512) {
      throw new SenderError("API key must be between 1 and 512 characters");
    }
    const existing = ctx.db.market_data_credential.provider.find(
      normalizedProvider,
    );
    const next = {
      provider: normalizedProvider,
      api_key: normalizedKey,
      enabled: true,
      updated_at: ctx.timestamp,
    };
    if (existing) ctx.db.market_data_credential.provider.update(next);
    else ctx.db.market_data_credential.insert(next);
  },
);

export const removeMarketDataCredential = spacetimedb.reducer(
  { provider: t.string() },
  (ctx, { provider }) => {
    requirePortfolioId(ctx);
    ctx.db.market_data_credential.provider.delete(normalizeProvider(provider));
  },
);

function normalizeProvider(provider: string): string {
  const normalized = provider.trim().toLowerCase();
  if (!supportedProviders.has(normalized)) {
    throw new SenderError("Unknown market-data provider");
  }
  return normalized;
}
