import type { ProcCtx } from "../schema";
import type {
  EtfHoldingsProvider,
  EtfHoldingsResult,
  EtfReference,
} from "./types";

export class EtfHoldingsService {
  constructor(private readonly providers: readonly EtfHoldingsProvider[]) {}

  fetch(ctx: ProcCtx, reference: EtfReference): EtfHoldingsResult {
    const failures: string[] = [];
    for (const provider of this.providers) {
      if (!provider.supports(reference)) continue;
      const result = provider.fetchHoldings(ctx, reference);
      if (result.snapshot) return result;
      failures.push(`${provider.name} failed (${result.error})`);
    }
    return {
      error: failures.join("; ") || "no provider supports this ETF",
    };
  }
}
