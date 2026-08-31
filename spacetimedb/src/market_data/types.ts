import type { ProcCtx } from "../schema";

export interface AssetReference {
  id: bigint;
  symbol: string;
  assetType: string;
}

export interface MarketQuote {
  value: number;
  source: string;
  marketTimeMicros?: bigint;
}

export interface QuoteResult {
  quote?: MarketQuote;
  error?: string;
}

export interface QuoteProvider {
  readonly name: string;
  supports(asset: AssetReference): boolean;
  fetchQuote(ctx: ProcCtx, asset: AssetReference): QuoteResult;
}
