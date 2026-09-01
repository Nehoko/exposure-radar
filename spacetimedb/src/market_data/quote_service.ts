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
        if (!isStale(result.quote.marketTimeMicros, nowMicros)) return result;
        if (
          !newestStale?.quote ||
          (result.quote.marketTimeMicros ?? 0n) >
            (newestStale.quote.marketTimeMicros ?? 0n)
        ) newestStale = result;
        continue;
      }
      failures.push(`${provider.name} failed (${result.error})`);
    }
    if (newestStale) return newestStale;
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
