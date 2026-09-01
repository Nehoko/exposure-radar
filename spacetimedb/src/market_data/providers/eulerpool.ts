import type { ProcCtx } from "../../schema";
import { errorMessage, MARKET_DATA_USER_AGENT, validPrice } from "../http";
import type { AssetReference, QuoteProvider, QuoteResult } from "../types";

export class EulerpoolQuoteProvider implements QuoteProvider {
  readonly name = "eulerpool";

  constructor(private readonly apiKey: string | undefined) {}

  supports(asset: AssetReference): boolean {
    return Boolean(this.apiKey) && asset.assetType !== "crypto";
  }

  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    if (!this.apiKey) return { error: "not configured" };
    const identifier = asset.symbol === "VWCE" ? "VWCE.DE" : asset.symbol;
    const url = `https://api.eulerpool.com/v1/equities/${
      encodeURIComponent(identifier)
    }/quote`;
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
      const value = firstValidPrice([
        payload?.price,
        payload?.last,
        payload?.lastPrice,
        payload?.close,
      ]);
      const marketTimeMicros = parseTimestampMicros(
        payload?.timestamp ?? payload?.updated_at ?? payload?.updatedAt,
      );
      return value === undefined
        ? { error: "price missing" }
        : { quote: { value, source: this.name, marketTimeMicros } };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }
}

function firstValidPrice(values: unknown[]): number | undefined {
  for (const candidate of values) {
    const value = typeof candidate === "string" ? Number(candidate) : candidate;
    if (validPrice(value)) return value;
  }
  return undefined;
}

function parseTimestampMicros(value: unknown): bigint | undefined {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return BigInt(
      Math.trunc(value < 10_000_000_000 ? value * 1_000_000 : value * 1_000),
    );
  }
  if (typeof value !== "string") return undefined;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? BigInt(millis) * 1_000n : undefined;
}
