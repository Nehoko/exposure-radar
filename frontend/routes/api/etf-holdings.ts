import { EtfHoldingsService } from "../../lib/market_data/etf_holdings_service.ts";
import { AlphaVantageEtfHoldingsProvider } from "../../lib/market_data/providers/alpha_vantage.ts";
import { EulerpoolEtfHoldingsProvider } from "../../lib/market_data/providers/eulerpool.ts";
import {
  type EtfHoldingsSnapshot,
  MarketDataError,
} from "../../lib/market_data/types.ts";
import { define } from "../../utils.ts";

const providerSymbols: Record<string, string> = {
  QQQ: "QQQ",
  VOO: "VOO",
};
const eulerpoolAliases: Record<string, string> = {
  VWCE: "VWCE.DE",
};
const holdingsService = new EtfHoldingsService([
  new EulerpoolEtfHoldingsProvider(
    Deno.env.get("EULERPOOL_KEY")?.trim(),
    eulerpoolAliases,
  ),
  new AlphaVantageEtfHoldingsProvider(
    Deno.env.get("ALPHA_VANTAGE_KEY")?.trim(),
    providerSymbols,
  ),
]);
const cache = new Map<
  string,
  { expiresAt: number; snapshot: EtfHoldingsSnapshot }
>();
const inFlight = new Map<string, Promise<EtfHoldingsSnapshot>>();
const CACHE_DURATION_MS = 24 * 60 * 60 * 1_000;

export const handler = define.handlers({
  async GET(ctx) {
    const requestedSymbol = ctx.url.searchParams.get("symbol")?.trim()
      .toUpperCase();
    if (!requestedSymbol) return json({ error: "ETF symbol is required" }, 400);

    const cached = cache.get(requestedSymbol);
    if (cached && cached.expiresAt > Date.now()) {
      return json({ requestedSymbol, ...cached.snapshot });
    }

    try {
      let pending = inFlight.get(requestedSymbol);
      if (!pending) {
        pending = holdingsService.fetch({ symbol: requestedSymbol });
        inFlight.set(requestedSymbol, pending);
      }
      const snapshot = await pending;
      cache.set(requestedSymbol, {
        expiresAt: Date.now() + CACHE_DURATION_MS,
        snapshot,
      });
      return json({ requestedSymbol, ...snapshot });
    } catch (error) {
      const status = error instanceof MarketDataError ? error.status : 502;
      const message = error instanceof MarketDataError
        ? error.message
        : "Could not load ETF holdings";
      return json({ error: message }, status);
    } finally {
      inFlight.delete(requestedSymbol);
    }
  },
});

function json(data: unknown, status = 200): Response {
  return Response.json(data, {
    status,
    headers: { "cache-control": "private, max-age=300" },
  });
}
