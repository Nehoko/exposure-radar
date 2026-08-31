import { rejects, strictEqual } from "node:assert";
import { EulerpoolEtfHoldingsProvider } from "./eulerpool.ts";
import { MarketDataError } from "../types.ts";

Deno.test("normalizes and limits Eulerpool ETF holdings", async () => {
  let requestedUrl = "";
  let authorization = "";
  const rows = Array.from({ length: 1_005 }, (_, index) => ({
    symbol: `S${index}`,
    name: `Company ${index}`,
    percent: index + 1,
  }));
  rows.push({ symbol: "", name: "Cash", percent: 1 });
  const provider = new EulerpoolEtfHoldingsProvider(
    "test-key",
    { VWCE: "VWCE.DE" },
    (input, init) => {
      requestedUrl = String(input);
      authorization = new Headers(init?.headers).get("authorization") ?? "";
      return Promise.resolve(Response.json(rows));
    },
  );

  const snapshot = await provider.fetchHoldings({ symbol: "vwce" });

  strictEqual(requestedUrl.endsWith("/VWCE.DE"), true);
  strictEqual(authorization, "Bearer test-key");
  strictEqual(snapshot.provider, "eulerpool");
  strictEqual(snapshot.providerIdentifier, "VWCE.DE");
  strictEqual(snapshot.holdings.length, 1_000);
  strictEqual(snapshot.holdings[0].symbol, "S1004");
  strictEqual(snapshot.holdings[0].weight, 1_005);
});

Deno.test("reports missing Eulerpool configuration without exposing a key", async () => {
  const provider = new EulerpoolEtfHoldingsProvider(undefined);

  await rejects(
    () => provider.fetchHoldings({ symbol: "VWCE.DE" }),
    (error) =>
      error instanceof MarketDataError && error.status === 503 &&
      error.provider === "eulerpool",
  );
});
