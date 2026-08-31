import type { ProcCtx } from "../../schema";
import {
  errorMessage,
  MARKET_DATA_USER_AGENT,
  secondsToMicros,
  validPrice,
} from "../http";
import type { AssetReference, QuoteProvider, QuoteResult } from "../types";

export class YahooQuoteProvider implements QuoteProvider {
  readonly name = "yahoo";

  supports(_asset: AssetReference): boolean {
    return true;
  }

  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    const yahooSymbol = asset.assetType === "crypto"
      ? `${asset.symbol}-USD`
      : asset.symbol;
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${
      encodeURIComponent(yahooSymbol)
    }?interval=1d&range=5d`;
    try {
      const response = ctx.http.fetch(url, {
        headers: {
          "user-agent": MARKET_DATA_USER_AGENT,
          accept: "application/json",
        },
      });
      if (!response.ok) return { error: `HTTP ${response.status}` };
      const payload = response.json();
      const meta = payload?.chart?.result?.[0]?.meta;
      const value = meta?.regularMarketPrice;
      const marketTimeMicros = secondsToMicros(meta?.regularMarketTime);
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
