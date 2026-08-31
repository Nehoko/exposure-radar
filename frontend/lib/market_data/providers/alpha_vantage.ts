import {
  type EtfHolding,
  type EtfHoldingsProvider,
  type EtfHoldingsSnapshot,
  type EtfReference,
  MarketDataError,
} from "../types.ts";

interface AlphaVantagePayload {
  Information?: string;
  Note?: string;
  holdings?: Array<{
    symbol?: unknown;
    description?: unknown;
    weight?: unknown;
  }>;
}

const holdingSymbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;

export class AlphaVantageEtfHoldingsProvider implements EtfHoldingsProvider {
  readonly name = "alpha-vantage";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly symbols: Readonly<Record<string, string>>,
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  supports(reference: EtfReference): boolean {
    return reference.symbol.toUpperCase() in this.symbols;
  }

  async fetchHoldings(
    reference: EtfReference,
  ): Promise<EtfHoldingsSnapshot> {
    const providerSymbol = this.symbols[reference.symbol.toUpperCase()];
    if (!providerSymbol) {
      throw new MarketDataError(
        this.name,
        `${reference.symbol} is not supported by Alpha Vantage`,
        404,
      );
    }
    if (!this.apiKey) {
      throw new MarketDataError(
        this.name,
        "Alpha Vantage is not configured",
        503,
      );
    }

    const url = new URL("https://www.alphavantage.co/query");
    url.searchParams.set("function", "ETF_PROFILE");
    url.searchParams.set("symbol", providerSymbol);
    url.searchParams.set("apikey", this.apiKey);
    const response = await this.fetcher(url, {
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new MarketDataError(
        this.name,
        `Alpha Vantage returned HTTP ${response.status}`,
        502,
      );
    }

    const payload = await response.json() as AlphaVantagePayload;
    if (payload.Information || payload.Note) {
      throw new MarketDataError(
        this.name,
        "Alpha Vantage rate limit reached. Try again later.",
        429,
      );
    }
    if (!Array.isArray(payload.holdings) || payload.holdings.length === 0) {
      throw new MarketDataError(
        this.name,
        `Alpha Vantage has no holdings for ${providerSymbol}`,
        404,
      );
    }

    const holdings = normalizeHoldings(payload.holdings);
    if (holdings.length === 0) {
      throw new MarketDataError(
        this.name,
        "ETF holdings response was empty",
        502,
      );
    }

    return {
      provider: this.name,
      providerIdentifier: providerSymbol,
      holdings,
      fetchedAt: new Date().toISOString(),
    };
  }
}

function normalizeHoldings(
  rows: NonNullable<AlphaVantagePayload["holdings"]>,
): EtfHolding[] {
  return rows.flatMap((holding) => {
    const symbol = typeof holding.symbol === "string"
      ? holding.symbol.trim().toUpperCase()
      : "";
    const name = typeof holding.description === "string"
      ? holding.description.trim()
      : "";
    const fractionalWeight = typeof holding.weight === "string" ||
        typeof holding.weight === "number"
      ? Number(holding.weight)
      : NaN;
    if (
      !holdingSymbolPattern.test(symbol) || !name ||
      !Number.isFinite(fractionalWeight) || fractionalWeight <= 0
    ) return [];
    return [{ symbol, name, weight: fractionalWeight * 100 }];
  });
}
