import type { ProcCtx } from "../../schema";
import { errorMessage, MARKET_DATA_USER_AGENT, validPrice } from "../http";
import type { AssetReference, QuoteProvider, QuoteResult } from "../types";

export class AlphaVantageQuoteProvider implements QuoteProvider {
  readonly name = "alpha-vantage";

  constructor(private readonly apiKey: string | undefined) {}

  supports(asset: AssetReference): boolean {
    return Boolean(this.apiKey) && asset.assetType !== "crypto";
  }

  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    if (!this.apiKey) return { error: "not configured" };
    const url = "https://www.alphavantage.co/query?function=GLOBAL_QUOTE" +
      `&symbol=${encodeURIComponent(asset.symbol)}` +
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
      const providerMessage = payload?.Information ?? payload?.Note;
      if (typeof providerMessage === "string") {
        const prefix = /rate limit|call frequency|requests per day/i.test(
            providerMessage,
          )
          ? "rate limited"
          : "provider message";
        return { error: `${prefix}: ${providerMessage.slice(0, 240)}` };
      }
      if (typeof payload?.["Error Message"] === "string") {
        return { error: "symbol not found" };
      }
      const quote = payload?.["Global Quote"];
      const value = Number(quote?.["05. price"]);
      const marketTimeMicros = parseDateMicros(
        quote?.["07. latest trading day"],
      );
      return validPrice(value)
        ? { quote: { value, source: this.name, marketTimeMicros } }
        : { error: "price missing" };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }
}

function parseDateMicros(value: unknown): bigint | undefined {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return undefined;
  }
  const millis = Date.parse(`${value}T00:00:00Z`);
  return Number.isFinite(millis) ? BigInt(millis) * 1_000n : undefined;
}
