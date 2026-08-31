import type { ProcCtx } from "../../schema";
import {
  errorMessage,
  MARKET_DATA_USER_AGENT,
  secondsToMicros,
  validPrice,
} from "../http";
import type { AssetReference, QuoteProvider, QuoteResult } from "../types";

export class CoinGeckoQuoteProvider implements QuoteProvider {
  readonly name = "coingecko";

  supports(asset: AssetReference): boolean {
    return asset.assetType === "crypto";
  }

  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    const normalized = asset.symbol.trim().toLowerCase();
    const encodedSymbol = encodeURIComponent(normalized);
    const url =
      `https://api.coingecko.com/api/v3/simple/price?symbols=${encodedSymbol}&vs_currencies=usd&include_last_updated_at=true`;
    try {
      const response = ctx.http.fetch(url, {
        headers: {
          "user-agent": MARKET_DATA_USER_AGENT,
          accept: "application/json",
        },
      });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      const payload = response.json();
      const value = payload?.[normalized]?.usd;
      const marketTimeMicros = secondsToMicros(
        payload?.[normalized]?.last_updated_at,
      );
      return validPrice(value)
        ? {
          quote: {
            value,
            source: this.name,
            marketTimeMicros,
          },
        }
        : { error: "price missing" };
    } catch (error) {
      return { error: errorMessage(error) };
    }
  }
}
