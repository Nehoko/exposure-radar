interface PositionValue {
  assetId: bigint;
  amount: number;
  purchasePrice: number;
}

interface PriceValue {
  value: number;
}

export interface PositionMetrics {
  currentPrice?: number;
  currentValue?: number;
  investedValue: number;
  profitLoss?: number;
}

export interface PortfolioTotals {
  currentValue: number;
  investedValue: number;
  profitLoss?: number;
  pricedPositions: number;
}

export type PriceMovement = "up" | "down" | "flat";

export function getPriceMovement(change: number): PriceMovement {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export function calculatePositionMetrics(
  position: PositionValue,
  pricesByAssetId: Map<bigint, PriceValue>,
): PositionMetrics {
  const investedValue = position.amount * position.purchasePrice;
  const price = pricesByAssetId.get(position.assetId);
  if (!price) return { investedValue };

  const currentValue = position.amount * price.value;
  return {
    currentPrice: price.value,
    currentValue,
    investedValue,
    profitLoss: currentValue - investedValue,
  };
}

export function calculatePortfolioTotals(
  positions: PositionValue[],
  pricesByAssetId: Map<bigint, PriceValue>,
): PortfolioTotals {
  let currentValue = 0;
  let investedValue = 0;
  let pricedInvestedValue = 0;
  let pricedPositions = 0;

  for (const position of positions) {
    const metrics = calculatePositionMetrics(position, pricesByAssetId);
    investedValue += metrics.investedValue;
    if (metrics.currentValue === undefined) continue;

    currentValue += metrics.currentValue;
    pricedInvestedValue += metrics.investedValue;
    pricedPositions++;
  }

  return {
    currentValue,
    investedValue,
    profitLoss: pricedPositions > 0
      ? currentValue - pricedInvestedValue
      : undefined,
    pricedPositions,
  };
}
