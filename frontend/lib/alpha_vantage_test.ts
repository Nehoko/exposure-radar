import { rejects, strictEqual } from "node:assert";
import { AlphaVantageEtfHoldingsProvider } from "./market_data/providers/alpha_vantage.ts";
import { MarketDataError } from "./market_data/types.ts";

Deno.test("normalizes Alpha Vantage ETF holding weights", async () => {
  const provider = new AlphaVantageEtfHoldingsProvider(
    "test-key",
    { QQQ: "QQQ" },
    () =>
      Promise.resolve(Response.json({
        holdings: [{
          symbol: " nvda ",
          description: "NVIDIA Corporation",
          weight: "0.075",
        }, {
          symbol: "N/A",
          description: "CASH",
          weight: "0.0012",
        }],
      })),
  );
  const snapshot = await provider.fetchHoldings({ symbol: "QQQ" });

  strictEqual(snapshot.provider, "alpha-vantage");
  strictEqual(snapshot.providerIdentifier, "QQQ");
  strictEqual(snapshot.holdings[0].symbol, "NVDA");
  strictEqual(snapshot.holdings[0].weight, 7.5);
  strictEqual(snapshot.holdings.length, 1);
});

Deno.test("reports Alpha Vantage rate limits without exposing the key", async () => {
  const provider = new AlphaVantageEtfHoldingsProvider(
    "secret-key",
    { QQQ: "QQQ" },
    () => Promise.resolve(Response.json({ Note: "rate limit" })),
  );

  await rejects(
    () => provider.fetchHoldings({ symbol: "QQQ" }),
    (error) =>
      error instanceof MarketDataError && error.status === 429 &&
      !error.message.includes("secret-key"),
  );
});
