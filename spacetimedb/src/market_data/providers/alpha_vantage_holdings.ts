import type { ProcCtx } from "../../schema";
import { errorMessage, MARKET_DATA_USER_AGENT } from "../http";
import type {
  EtfHoldingsProvider,
  EtfHoldingsResult,
  EtfReference,
  MarketEtfHolding,
} from "../types";

const supportedSymbols = new Set(["QQQ", "VOO"]);
const holdingSymbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class AlphaVantageEtfHoldingsProvider implements EtfHoldingsProvider {
  readonly name = "alpha-vantage";

  constructor(private readonly apiKey: string | undefined) {}

  supports(reference: EtfReference): boolean {
    return Boolean(
      this.apiKey && supportedSymbols.has(reference.symbol.toUpperCase()),
    );
  }

  fetchHoldings(
    ctx: ProcCtx,
    reference: EtfReference,
  ): EtfHoldingsResult {
    if (!this.apiKey) return { error: "not configured" };
    const symbol = reference.symbol.trim().toUpperCase();
    const url = "https://www.alphavantage.co/query?function=ETF_PROFILE" +
      `&symbol=${encodeURIComponent(symbol)}` +
      `&apikey=${encodeURIComponent(this.apiKey)}`;
    try {
      const response = ctx.http.fetch(url, {
        headers: {
          "user-agent": MARKET_DATA_USER_AGENT,
          accept: "application/json",
        },
      });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      const payload = response.json();
      if (payload?.Information || payload?.Note) {
        return { error: "rate limited" };
      }
      if (!Array.isArray(payload?.holdings)) {
        return { error: "holdings missing" };
      }
      const holdings = normalizeHoldings(payload.holdings);
      return holdings.length > 0
        ? { snapshot: { provider: this.name, holdings } }
        : { error: "holdings missing" };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }
}

function normalizeHoldings(rows: unknown[]): MarketEtfHolding[] {
  return rows.flatMap((row) => {
    const holding = row as Record<string, unknown>;
    const symbol = typeof holding.symbol === "string"
      ? holding.symbol.trim().toUpperCase()
      : "";
    const name = typeof holding.description === "string"
      ? holding.description.trim()
      : "";
    const fractionalWeight = Number(holding.weight);
    if (
      !holdingSymbolPattern.test(symbol) || !name ||
      !Number.isFinite(fractionalWeight) || fractionalWeight <= 0
    ) return [];
    return [{ symbol, name, weight: fractionalWeight * 100 }];
  });
}
