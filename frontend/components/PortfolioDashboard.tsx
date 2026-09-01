import {
  calculatePortfolioExposures,
  calculatePortfolioTotals,
} from "../lib/portfolio.ts";
import type { EtfHoldingValue } from "../lib/portfolio.ts";
import type {
  Asset,
  ExposureLimit,
  ExposureWarning,
  MarketDataProviderStatus,
  PortfolioEtfHolding,
  Position,
  Price,
  RealPriceFeed,
} from "../src/module_bindings/types.ts";
import AddPositionForm from "./AddPositionForm.tsx";
import ExposureBreakdown from "./ExposureBreakdown.tsx";
import ExposureWarningPanel from "./ExposureWarningPanel.tsx";
import PortfolioSummary from "./PortfolioSummary.tsx";
import PositionsPanel from "./PositionsPanel.tsx";
import MarketDataSettings from "./MarketDataSettings.tsx";
import PriceEditor from "./PriceEditor.tsx";
import RealPriceControls from "./RealPriceControls.tsx";
import TestPriceControls from "./TestPriceControls.tsx";

export interface PortfolioDashboardProps {
  showTestPrices?: boolean;
  assets: Asset[];
  assetsById: Map<bigint, Asset>;
  positions: Position[];
  pricesByAssetId: Map<bigint, Price>;
  realPriceFeed?: RealPriceFeed;
  marketDataProviders: MarketDataProviderStatus[];
  etfHoldings: EtfHoldingValue[];
  actualEtfHoldings: PortfolioEtfHolding[];
  exposureLimit?: ExposureLimit;
  exposureWarnings: ExposureWarning[];
  symbol: string;
  assetType: string;
  amount: string;
  purchasePrice: string;
  formError?: string;
  priceError?: string;
  testPriceError?: string;
  realPriceError?: string;
  exposureError?: string;
  etfHoldingsError?: string;
  etfHoldingsMessage?: string;
  warningError?: string;
  submitting: boolean;
  savingPrice: boolean;
  testPricesRunning: boolean;
  changingTestPrices: boolean;
  changingRealPrices: boolean;
  refreshingRealPrices: boolean;
  refreshingEtfHoldings: boolean;
  savingMarketDataProvider?: string;
  marketDataError?: string;
  savingWarningLimit: boolean;
  removingId?: bigint;
  onSymbolChange: (value: string) => void;
  onAssetTypeChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPurchasePriceChange: (value: string) => void;
  onAdd: (event: SubmitEvent) => Promise<void>;
  onRemove: (positionId: bigint) => Promise<void>;
  onSavePrice: (assetId: bigint, value: number) => Promise<void>;
  onToggleTestPrices: () => Promise<void>;
  onToggleRealPrices: () => Promise<void>;
  onRefreshRealPrices: () => Promise<void>;
  onRefreshEtfHoldings: () => Promise<void>;
  onSaveMarketDataCredential: (
    provider: string,
    apiKey: string,
  ) => Promise<void>;
  onRemoveMarketDataCredential: (provider: string) => Promise<void>;
  onSaveExposureLimit: (maximumPercentage: number) => Promise<void>;
}

export default function PortfolioDashboard(props: PortfolioDashboardProps) {
  const totals = calculatePortfolioTotals(
    props.positions,
    props.pricesByAssetId,
  );
  const holdingCount = new Set(
    props.positions.map((position) => position.assetId),
  ).size;
  const exposureResult = calculatePortfolioExposures(
    props.assets,
    props.positions,
    props.pricesByAssetId,
    props.etfHoldings,
  );
  const portfolioEtfs = new Set(
    props.assets.filter((asset) => asset.assetType === "etf")
      .map((asset) => asset.symbol),
  );
  const supportedEtfs = [
    ...new Set(
      props.etfHoldings
        .map((holding) => holding.etfSymbol)
        .filter((symbol) => portfolioEtfs.has(symbol)),
    ),
  ].sort();
  const actualEtfs = [
    ...new Set(
      props.actualEtfHoldings
        .map((holding) => holding.etfSymbol)
        .filter((symbol) => portfolioEtfs.has(symbol)),
    ),
  ].sort();
  const actualEtfSet = new Set(actualEtfs);
  const sampleEtfs = supportedEtfs.filter((symbol) =>
    !actualEtfSet.has(symbol)
  );
  const latestHoldingsAt = props.actualEtfHoldings.reduce<Date | undefined>(
    (latest, holding) => {
      const fetchedAt = new Date(
        Number(holding.fetchedAt.microsSinceUnixEpoch / 1_000n),
      );
      return !latest || fetchedAt > latest ? fetchedAt : latest;
    },
    undefined,
  );

  return (
    <>
      <section class="hero">
        <div class="hero-copy">
          <p class="eyebrow">One portfolio. The full picture.</p>
          <h1>See what you really own.</h1>
          <p class="hero-text">
            Save your stocks, ETFs, and crypto in one place. Exposure Radar
            calculates current value and profit as your prices change.
          </p>
          <div class="hero-actions">
            <a class="primary-action" href="#portfolio">Add a position</a>
            <span class="helper-text">
              Prices update every connected browser immediately.
            </span>
          </div>
        </div>

        <div class="radar-card" aria-label="Portfolio overview">
          <div class="radar-grid" aria-hidden="true">
            <span class="ring ring-one" />
            <span class="ring ring-two" />
            <span class="ring ring-three" />
            <span class="radar-line" />
            <span class="radar-sweep" />
            <span class="radar-point point-one" />
            <span class="radar-point point-two" />
            <span class="radar-point point-three" />
          </div>
          <div class="radar-label">
            <span>Current value</span>
            <strong>{formatPrice(totals.currentValue)}</strong>
          </div>
        </div>
      </section>

      <section class="portfolio" id="portfolio">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Your portfolio</p>
            <h2>Value and manage positions</h2>
          </div>
          <p>Private live data</p>
        </div>

        <PortfolioSummary
          currentValue={totals.currentValue}
          investedValue={totals.investedValue}
          profitLoss={totals.profitLoss}
          pricedPositions={totals.pricedPositions}
          totalPositions={holdingCount}
        />

        <div class="portfolio-layout">
          <div class="portfolio-forms">
            <AddPositionForm
              symbol={props.symbol}
              assetType={props.assetType}
              amount={props.amount}
              purchasePrice={props.purchasePrice}
              error={props.formError}
              submitting={props.submitting}
              onSymbolChange={props.onSymbolChange}
              onAssetTypeChange={props.onAssetTypeChange}
              onAmountChange={props.onAmountChange}
              onPurchasePriceChange={props.onPurchasePriceChange}
              onSubmit={props.onAdd}
            />
            <PriceEditor
              assets={props.assets}
              pricesByAssetId={props.pricesByAssetId}
              error={props.priceError}
              submitting={props.savingPrice}
              locked={props.testPricesRunning}
              onSave={props.onSavePrice}
            />
            <RealPriceControls
              feed={props.realPriceFeed}
              submitting={props.changingRealPrices}
              refreshing={props.refreshingRealPrices}
              disabled={props.assets.length === 0}
              error={props.realPriceError}
              onToggle={props.onToggleRealPrices}
              onRefresh={props.onRefreshRealPrices}
            />
            {props.showTestPrices && (
              <TestPriceControls
                running={props.testPricesRunning}
                submitting={props.changingTestPrices}
                disabled={props.assets.length === 0}
                error={props.testPriceError}
                onToggle={props.onToggleTestPrices}
              />
            )}
            <MarketDataSettings
              providers={props.marketDataProviders}
              savingProvider={props.savingMarketDataProvider}
              error={props.marketDataError}
              onSave={props.onSaveMarketDataCredential}
              onRemove={props.onRemoveMarketDataCredential}
            />
          </div>

          <PositionsPanel
            stepNumber={props.showTestPrices ? "05" : "04"}
            assetsById={props.assetsById}
            positions={props.positions}
            pricesByAssetId={props.pricesByAssetId}
            removingId={props.removingId}
            onRemove={props.onRemove}
          />
        </div>

        {props.exposureError && (
          <p class="form-error exposure-error" role="alert">
            {props.exposureError}
          </p>
        )}
        <ExposureWarningPanel
          exposures={exposureResult.exposures}
          limit={props.exposureLimit}
          warnings={props.exposureWarnings}
          saving={props.savingWarningLimit}
          error={props.warningError}
          onSave={props.onSaveExposureLimit}
        />
        <ExposureBreakdown
          exposures={exposureResult.exposures}
          portfolioValue={exposureResult.portfolioValue}
          unanalysedEtfValue={exposureResult.unanalysedEtfValue}
          actualEtfs={actualEtfs}
          sampleEtfs={sampleEtfs}
          latestHoldingsAt={latestHoldingsAt}
          refreshing={props.refreshingEtfHoldings}
          error={props.etfHoldingsError}
          message={props.etfHoldingsMessage}
          onRefresh={props.onRefreshEtfHoldings}
        />
      </section>
    </>
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}
