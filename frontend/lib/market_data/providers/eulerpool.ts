import {
  type EtfHolding,
  type EtfHoldingsProvider,
  type EtfHoldingsSnapshot,
  type EtfReference,
  MarketDataError,
} from "../types.ts";

interface EulerpoolHolding {
  symbol?: unknown;
  name?: unknown;
  percent?: unknown;
}

const holdingSymbolPattern = /^[A-Z0-9][A-Z0-9._-]{0,31}$/;
const maximumHoldings = 1_000;

export class EulerpoolEtfHoldingsProvider implements EtfHoldingsProvider {
  readonly name = "eulerpool";

  constructor(
    private readonly apiKey: string | undefined,
    private readonly aliases: Readonly<Record<string, string>> = {},
    private readonly fetcher: typeof fetch = fetch,
  ) {}

  supports(reference: EtfReference): boolean {
    return Boolean(reference.isin?.trim() || reference.symbol.trim());
  }

  async fetchHoldings(
    reference: EtfReference,
  ): Promise<EtfHoldingsSnapshot> {
    if (!this.apiKey) {
      throw new MarketDataError(
        this.name,
        "Eulerpool is not configured",
        503,
      );
    }

    const symbol = reference.symbol.trim().toUpperCase();
    const providerIdentifier = reference.isin?.trim().toUpperCase() ||
      this.aliases[symbol] || symbol;
    const url = new URL(
      `/api/1/etf/holdings/${encodeURIComponent(providerIdentifier)}`,
      "https://api.eulerpool.com",
    );
    const response = await this.fetcher(url, {
      headers: {
        accept: "application/json",
        authorization: `Bearer ${this.apiKey}`,
      },
    });
    if (!response.ok) {
      throw new MarketDataError(
        this.name,
        response.status === 404
          ? `Eulerpool has no holdings for ${providerIdentifier}`
          : `Eulerpool returned HTTP ${response.status}`,
        response.status === 404 ? 404 : 502,
      );
    }

    const payload = await response.json() as unknown;
    if (!Array.isArray(payload)) {
      throw new MarketDataError(
        this.name,
        "Eulerpool returned an invalid response",
        502,
      );
    }

    const holdings = normalizeHoldings(payload);
    if (holdings.length === 0) {
      throw new MarketDataError(
        this.name,
        `Eulerpool has no valid holdings for ${providerIdentifier}`,
        404,
      );
    }

    return {
      provider: this.name,
      providerIdentifier,
      holdings,
      fetchedAt: new Date().toISOString(),
    };
  }
}

function normalizeHoldings(rows: EulerpoolHolding[]): EtfHolding[] {
  return rows.flatMap((holding) => {
    const symbol = typeof holding.symbol === "string"
      ? holding.symbol.trim().toUpperCase()
      : "";
    const name = typeof holding.name === "string" ? holding.name.trim() : "";
    const weight = typeof holding.percent === "number" ||
        typeof holding.percent === "string"
      ? Number(holding.percent)
      : NaN;
    if (
      !holdingSymbolPattern.test(symbol) || !name ||
      !Number.isFinite(weight) || weight <= 0
    ) return [];
    return [{ symbol, name, weight }];
  }).sort((left, right) => right.weight - left.weight).slice(
    0,
    maximumHoldings,
  );
}
