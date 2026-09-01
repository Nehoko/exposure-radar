import type { ProcCtx } from "../../schema";
import { errorMessage, MARKET_DATA_USER_AGENT, validPrice } from "../http";
import type { AssetReference, QuoteProvider, QuoteResult } from "../types";

const ISIN_PATTERN = /^[A-Z]{2}[A-Z0-9]{9}[0-9]$/;
const EIGHT_DAYS_MICROS = 8n * 24n * 60n * 60n * 1_000_000n;
const KNOWN_ETF_ISINS = new Map([
  ["VOO", "US9229083632"],
  ["VOOG", "US9219325050"],
  ["VWCE", "IE00BK5BQT80"],
  ["VWCE.DE", "IE00BK5BQT80"],
]);

export class EulerpoolQuoteProvider implements QuoteProvider {
  readonly name = "eulerpool";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly nowMicros: bigint,
  ) {}

  supports(asset: AssetReference): boolean {
    return Boolean(this.apiKey) && asset.assetType !== "crypto";
  }

  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    if (!this.apiKey) return { error: "not configured" };
    try {
      const isin = this.resolveIsin(ctx, asset);
      if (!isin) return { error: "security identifier not found" };

      const endMillis = this.nowMicros / 1_000n;
      const startMillis = (this.nowMicros - EIGHT_DAYS_MICROS) / 1_000n;
      const url = `https://api.eulerpool.com/api/1/equity/quotes/${isin}` +
        `?startdate=${startMillis}&enddate=${endMillis}`;
      const response = this.fetch(ctx, url);
      if (!response.ok) return { error: `HTTP ${response.status}` };
      const payload = response.json();
      if (!Array.isArray(payload)) return { error: "invalid response" };
      const latest = latestQuote(payload);
      return latest
        ? { quote: { ...latest, source: this.name } }
        : { error: "price missing" };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }

  private resolveIsin(
    ctx: ProcCtx,
    asset: AssetReference,
  ): string | undefined {
    const symbol = asset.symbol.trim().toUpperCase();
    const known = KNOWN_ETF_ISINS.get(symbol);
    if (known) return known;

    const profileUrl = `https://api.eulerpool.com/api/1/equity/profile/${
      encodeURIComponent(symbol)
    }`;
    const profileResponse = this.fetch(ctx, profileUrl);
    if (profileResponse.ok) {
      const isin = validIsin(profileResponse.json()?.isin);
      if (isin) return isin;
    }

    const searchUrl = "https://api.eulerpool.com/api/1/equity/search" +
      `?q=${encodeURIComponent(symbol)}`;
    const searchResponse = this.fetch(ctx, searchUrl);
    if (!searchResponse.ok) return undefined;
    const results = searchResponse.json()?.results;
    if (!Array.isArray(results)) return undefined;
    const exact = results.find((result) =>
      typeof result?.ticker === "string" &&
      result.ticker.toUpperCase() === symbol
    );
    return validIsin(exact?.isin);
  }

  private fetch(ctx: ProcCtx, url: string) {
    return ctx.http.fetch(url, {
      headers: {
        "user-agent": MARKET_DATA_USER_AGENT,
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
    });
  }
}

function latestQuote(rows: unknown[]): {
  value: number;
  marketTimeMicros: bigint;
} | undefined {
  let latest: { value: number; marketTimeMicros: bigint } | undefined;
  for (const row of rows) {
    const quote = row as Record<string, unknown>;
    const rawValue = typeof quote.price === "string"
      ? Number(quote.price)
      : quote.price;
    const marketTimeMicros = parseTimestampMicros(quote.timestamp);
    if (!validPrice(rawValue) || marketTimeMicros === undefined) continue;
    if (!latest || marketTimeMicros > latest.marketTimeMicros) {
      latest = { value: rawValue, marketTimeMicros };
    }
  }
  return latest;
}

function validIsin(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const normalized = value.trim().toUpperCase();
  return ISIN_PATTERN.test(normalized) ? normalized : undefined;
}

function parseTimestampMicros(value: unknown): bigint | undefined {
  if (typeof value === "number" && Number.isSafeInteger(value) && value > 0) {
    const timestamp = BigInt(value);
    if (timestamp < 100_000_000_000n) return timestamp * 1_000_000n;
    if (timestamp < 100_000_000_000_000n) return timestamp * 1_000n;
    return timestamp;
  }
  if (typeof value !== "string") return undefined;
  const millis = Date.parse(value);
  return Number.isFinite(millis) ? BigInt(millis) * 1_000n : undefined;
}
