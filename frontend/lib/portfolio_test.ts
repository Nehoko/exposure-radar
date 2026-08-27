import { ok, strictEqual } from "node:assert";
import {
  calculatePortfolioExposures,
  calculatePortfolioTotals,
  calculatePositionMetrics,
  getPriceMovement,
} from "./portfolio.ts";

Deno.test("calculates value and profit for a priced position", () => {
  const metrics = calculatePositionMetrics(
    { assetId: 1n, amount: 2, purchasePrice: 100 },
    new Map([[1n, { value: 125 }]]),
  );

  strictEqual(metrics.investedValue, 200);
  strictEqual(metrics.currentValue, 250);
  strictEqual(metrics.profitLoss, 50);
});

Deno.test("keeps missing prices out of value and profit", () => {
  const totals = calculatePortfolioTotals(
    [
      { assetId: 1n, amount: 2, purchasePrice: 100 },
      { assetId: 2n, amount: 3, purchasePrice: 50 },
    ],
    new Map([[1n, { value: 125 }]]),
  );

  strictEqual(totals.investedValue, 350);
  strictEqual(totals.currentValue, 250);
  strictEqual(totals.profitLoss, 50);
  strictEqual(totals.pricedPositions, 1);
});

Deno.test("describes the latest price movement", () => {
  strictEqual(getPriceMovement(0.01), "up");
  strictEqual(getPriceMovement(-0.01), "down");
  strictEqual(getPriceMovement(0), "flat");
});

Deno.test("combines direct and ETF exposure to the same company", () => {
  const result = calculatePortfolioExposures(
    [
      { id: 1n, symbol: "AAPL", assetType: "stock" },
      { id: 2n, symbol: "VOO", assetType: "etf" },
    ],
    [
      { assetId: 1n, amount: 1, purchasePrice: 90 },
      { assetId: 2n, amount: 2, purchasePrice: 400 },
    ],
    new Map([[1n, { value: 100 }], [2n, { value: 500 }]]),
    [{
      etfSymbol: "VOO",
      holdingSymbol: "AAPL",
      holdingName: "Apple",
      weight: 7,
    }],
  );

  strictEqual(result.portfolioValue, 1100);
  strictEqual(result.exposures[0].symbol, "AAPL");
  strictEqual(result.exposures[0].directValue, 100);
  strictEqual(result.exposures[0].indirectValue, 70);
  strictEqual(result.exposures[0].totalValue, 170);
  ok(Math.abs(result.unanalysedEtfValue - 930) < 0.000001);
});

Deno.test("marks unsupported ETF value as unanalysed", () => {
  const result = calculatePortfolioExposures(
    [{ id: 1n, symbol: "UNKNOWN", assetType: "etf" }],
    [{ assetId: 1n, amount: 2, purchasePrice: 100 }],
    new Map([[1n, { value: 125 }]]),
    [],
  );

  strictEqual(result.portfolioValue, 250);
  strictEqual(result.exposures.length, 0);
  strictEqual(result.unanalysedEtfValue, 250);
});
