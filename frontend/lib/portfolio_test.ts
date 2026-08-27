import { strictEqual } from "node:assert";
import {
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
