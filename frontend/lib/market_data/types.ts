export interface EtfReference {
  symbol: string;
  isin?: string;
}

export interface EtfHolding {
  symbol: string;
  name: string;
  weight: number;
}

export interface EtfHoldingsSnapshot {
  provider: string;
  providerIdentifier: string;
  holdings: EtfHolding[];
  fetchedAt: string;
}

export interface EtfHoldingsProvider {
  readonly name: string;
  supports(reference: EtfReference): boolean;
  fetchHoldings(reference: EtfReference): Promise<EtfHoldingsSnapshot>;
}

export class MarketDataError extends Error {
  constructor(
    readonly provider: string,
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}
