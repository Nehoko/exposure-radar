import type { ProcCtx } from "../schema";
import type { AssetReference, QuoteProvider, QuoteResult } from "./types";

export class QuoteService {
  constructor(private readonly providers: readonly QuoteProvider[]) {}

  fetch(ctx: ProcCtx, asset: AssetReference): QuoteResult {
    const failures: string[] = [];
    for (const provider of this.providers) {
      if (!provider.supports(asset)) continue;
      const result = provider.fetchQuote(ctx, asset);
      if (result.quote) return result;
      failures.push(`${provider.name} failed (${result.error})`);
    }
    return { error: failures.join("; ") || "no provider supports this asset" };
  }
}
