interface PositionValue {
  assetId: bigint;
  amount: number;
  purchasePrice: number;
}

interface PriceValue {
  value: number;
}

interface AssetValue {
  id: bigint;
  symbol: string;
  assetType: string;
}

export interface EtfHoldingValue {
  etfSymbol: string;
  holdingSymbol: string;
  holdingName: string;
  weight: number;
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

export interface PortfolioExposure {
  symbol: string;
  name: string;
  kind: "company" | "crypto";
  directValue: number;
  indirectValue: number;
  totalValue: number;
  percentage: number;
}

export interface PortfolioExposureResult {
  exposures: PortfolioExposure[];
  portfolioValue: number;
  unanalysedEtfValue: number;
}

export function getPriceMovement(change: number): PriceMovement {
  if (change > 0) return "up";
  if (change < 0) return "down";
  return "flat";
}

export function calculatePortfolioExposures(
  assets: AssetValue[],
  positions: PositionValue[],
  pricesByAssetId: Map<bigint, PriceValue>,
  etfHoldings: EtfHoldingValue[],
): PortfolioExposureResult {
  const assetsById = new Map(assets.map((asset) => [asset.id, asset]));
  const holdingsByEtf = new Map<string, EtfHoldingValue[]>();
  const exposureBySymbol = new Map<
    string,
    Omit<PortfolioExposure, "totalValue" | "percentage">
  >();
  let portfolioValue = 0;
  let unanalysedEtfValue = 0;

  for (const holding of etfHoldings) {
    const symbol = holding.etfSymbol.toUpperCase();
    const holdings = holdingsByEtf.get(symbol) ?? [];
    holdings.push(holding);
    holdingsByEtf.set(symbol, holdings);
  }

  for (const position of positions) {
    const asset = assetsById.get(position.assetId);
    const price = pricesByAssetId.get(position.assetId);
    if (!asset || !price) continue;

    const positionValue = position.amount * price.value;
    portfolioValue += positionValue;

    if (asset.assetType !== "etf") {
      addExposure(
        exposureBySymbol,
        asset.symbol,
        asset.symbol,
        asset.assetType === "crypto" ? "crypto" : "company",
        positionValue,
        0,
      );
      continue;
    }

    const holdings = holdingsByEtf.get(asset.symbol.toUpperCase()) ?? [];
    if (holdings.length === 0) {
      unanalysedEtfValue += positionValue;
      continue;
    }

    let coveredWeight = 0;
    for (const holding of holdings) {
      coveredWeight += holding.weight;
      addExposure(
        exposureBySymbol,
        holding.holdingSymbol,
        holding.holdingName,
        "company",
        0,
        positionValue * holding.weight / 100,
      );
    }
    unanalysedEtfValue += positionValue *
      Math.max(0, 1 - coveredWeight / 100);
  }

  const exposures = [...exposureBySymbol.values()]
    .map((exposure) => {
      const totalValue = exposure.directValue + exposure.indirectValue;
      return {
        ...exposure,
        totalValue,
        percentage: portfolioValue > 0 ? totalValue / portfolioValue * 100 : 0,
      };
    })
    .sort((left, right) => right.totalValue - left.totalValue);

  return { exposures, portfolioValue, unanalysedEtfValue };
}

function addExposure(
  exposures: Map<
    string,
    Omit<PortfolioExposure, "totalValue" | "percentage">
  >,
  rawSymbol: string,
  name: string,
  kind: PortfolioExposure["kind"],
  directValue: number,
  indirectValue: number,
): void {
  const symbol = rawSymbol.toUpperCase();
  const mapKey = `${kind}:${symbol}`;
  const existing = exposures.get(mapKey);
  if (existing) {
    existing.directValue += directValue;
    existing.indirectValue += indirectValue;
    if (name !== symbol) existing.name = name;
    return;
  }

  exposures.set(mapKey, {
    symbol,
    name,
    kind,
    directValue,
    indirectValue,
  });
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
