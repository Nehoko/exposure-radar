import { strictEqual } from "node:assert";
import { EtfHoldingsService } from "./etf_holdings_service.ts";
import {
  type EtfHoldingsProvider,
  type EtfHoldingsSnapshot,
  type EtfReference,
  MarketDataError,
} from "./types.ts";

Deno.test("ETF holdings service falls back to the next provider", async () => {
  const first = fakeProvider("first", () => {
    throw new MarketDataError("first", "unavailable", 502);
  });
  const second = fakeProvider("second", (reference) => ({
    provider: "second",
    providerIdentifier: reference.symbol,
    fetchedAt: "2026-08-31T00:00:00.000Z",
    holdings: [{ symbol: "AAPL", name: "Apple", weight: 5 }],
  }));

  const snapshot = await new EtfHoldingsService([first, second]).fetch({
    symbol: "TEST",
  });

  strictEqual(snapshot.provider, "second");
  strictEqual(snapshot.holdings[0].symbol, "AAPL");
});

function fakeProvider(
  name: string,
  fetchHoldings: (reference: EtfReference) => EtfHoldingsSnapshot,
): EtfHoldingsProvider {
  return {
    name,
    supports: () => true,
    fetchHoldings: (reference) => Promise.resolve(fetchHoldings(reference)),
  };
}
