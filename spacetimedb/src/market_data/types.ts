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

export interface EtfReference {
  symbol: string;
}

export interface MarketEtfHolding {
  symbol: string;
  name: string;
  weight: number;
}

export interface EtfHoldingsSnapshot {
  provider: string;
  holdings: MarketEtfHolding[];
}

export interface EtfHoldingsResult {
  snapshot?: EtfHoldingsSnapshot;
  error?: string;
}

export interface EtfHoldingsProvider {
  readonly name: string;
  supports(reference: EtfReference): boolean;
  fetchHoldings(ctx: ProcCtx, reference: EtfReference): EtfHoldingsResult;
}
