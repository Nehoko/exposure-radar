import type { ProcCtx } from "../schema";
import type { AssetReference, QuoteProvider, QuoteResult } from "./types";

export class QuoteService {
  constructor(private readonly providers: readonly QuoteProvider[]) {}

  fetch(
    ctx: ProcCtx,
    asset: AssetReference,
    nowMicros: bigint,
  ): QuoteResult {
    const failures: string[] = [];
    let newestStale: QuoteResult | undefined;
    for (const provider of this.providers) {
      if (!provider.supports(asset)) continue;
      const result = provider.fetchQuote(ctx, asset);
      if (result.quote) {
        const stale = isStale(result.quote.marketTimeMicros, nowMicros);
        console.info(
          `market_quote: symbol=${asset.symbol} provider=${provider.name} result=${
            stale ? "stale" : "fresh"
          }`,
        );
        if (!stale) return result;
        if (
          !newestStale?.quote ||
          (result.quote.marketTimeMicros ?? 0n) >
            (newestStale.quote.marketTimeMicros ?? 0n)
        ) newestStale = result;
        continue;
      }
      console.warn(
        `market_quote: symbol=${asset.symbol} provider=${provider.name} result=failed error=${result.error}`,
      );
      failures.push(`${provider.name} failed (${result.error})`);
    }
    if (newestStale?.quote) {
      const failedBackups = failures.length > 0
        ? `; ${failures.join("; ")}`
        : "";
      return {
        quote: newestStale.quote,
        warning: `kept ${newestStale.quote.source} old${failedBackups}`,
      };
    }
    return { error: failures.join("; ") || "no provider supports this asset" };
  }
}

function isStale(
  marketTimeMicros: bigint | undefined,
  nowMicros: bigint,
): boolean {
  if (!marketTimeMicros) return false;
  return nowMicros - marketTimeMicros > 2n * 60n * 60n * 1_000_000n;
}
