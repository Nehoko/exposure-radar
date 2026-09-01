import type { ProcCtx } from "../../schema";
import { errorMessage, MARKET_DATA_USER_AGENT } from "../http";
import type {
  EtfHoldingsProvider,
  EtfHoldingsResult,
  EtfReference,
  MarketEtfHolding,
} from "../types";

const holdingSymbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class EulerpoolEtfHoldingsProvider implements EtfHoldingsProvider {
  readonly name = "eulerpool";

  constructor(private readonly apiKey: string | undefined) {}

  supports(reference: EtfReference): boolean {
    return Boolean(this.apiKey && reference.symbol.trim());
  }

  fetchHoldings(
    ctx: ProcCtx,
    reference: EtfReference,
  ): EtfHoldingsResult {
    if (!this.apiKey) return { error: "not configured" };
    const symbol = reference.symbol.trim().toUpperCase();
    const identifier = symbol === "VWCE" ? "VWCE.DE" : symbol;
    const url = `https://api.eulerpool.com/api/1/etf/holdings/${
      encodeURIComponent(identifier)
    }`;
    try {
      const response = ctx.http.fetch(url, {
        headers: {
          "user-agent": MARKET_DATA_USER_AGENT,
          accept: "application/json",
          authorization: `Bearer ${this.apiKey}`,
        },
      });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      const payload = response.json();
      if (!Array.isArray(payload)) return { error: "invalid response" };
      const holdings = normalizeHoldings(payload);
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
    const name = typeof holding.name === "string" ? holding.name.trim() : "";
    const weight = Number(holding.percent);
    if (
      !holdingSymbolPattern.test(symbol) || !name ||
      !Number.isFinite(weight) || weight <= 0
    ) return [];
    return [{ symbol, name, weight }];
  }).sort((left, right) => right.weight - left.weight).slice(0, 1_000);
}
