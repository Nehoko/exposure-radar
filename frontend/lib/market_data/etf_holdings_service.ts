import {
  type EtfHoldingsProvider,
  type EtfHoldingsSnapshot,
  type EtfReference,
  MarketDataError,
} from "./types.ts";

export class EtfHoldingsService {
  constructor(private readonly providers: readonly EtfHoldingsProvider[]) {}

  async fetch(reference: EtfReference): Promise<EtfHoldingsSnapshot> {
    const providers = this.providers.filter((provider) =>
      provider.supports(reference)
    );
    if (providers.length === 0) {
      throw new MarketDataError(
        "market-data",
        `${reference.symbol} is not supported yet`,
        404,
      );
    }

    const failures: string[] = [];
    let lastError: MarketDataError | undefined;
    for (const provider of providers) {
      try {
        return await provider.fetchHoldings(reference);
      } catch (error) {
        lastError = error instanceof MarketDataError
          ? error
          : new MarketDataError(provider.name, "Request failed", 502);
        failures.push(`${provider.name}: ${lastError.message}`);
      }
    }

    throw new MarketDataError(
      lastError?.provider ?? "market-data",
      failures.join("; ") || "ETF holdings are unavailable",
      lastError?.status ?? 502,
    );
  }
}
