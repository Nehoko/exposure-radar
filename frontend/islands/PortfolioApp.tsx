import { useEffect, useMemo, useState } from "preact/hooks";
import ConnectionStatus, {
  type ConnectionState,
} from "../components/ConnectionStatus.tsx";
import ExposureBreakdown from "../components/ExposureBreakdown.tsx";
import GeneratedSecret from "../components/GeneratedSecret.tsx";
import PortfolioAccess from "../components/PortfolioAccess.tsx";
import PortfolioSummary from "../components/PortfolioSummary.tsx";
import PriceEditor from "../components/PriceEditor.tsx";
import TestPriceControls from "../components/TestPriceControls.tsx";
import {
  connectToSpacetimeDB,
  forgetSpacetimeDBToken,
} from "../lib/spacetimedb.ts";
import {
  calculatePortfolioExposures,
  calculatePortfolioTotals,
  calculatePositionMetrics,
  getPriceMovement,
} from "../lib/portfolio.ts";
import { type DbConnection, tables } from "../src/module_bindings/index.ts";
import type {
  Asset,
  EtfHolding,
  Position,
  Price,
  TestPriceFeed,
} from "../src/module_bindings/types.ts";

const assetTypeLabels: Record<string, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
};

export default function PortfolioApp() {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [identity, setIdentity] = useState<string>();
  const [connection, setConnection] = useState<DbConnection>();
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [etfHoldings, setEtfHoldings] = useState<EtfHolding[]>([]);
  const [testPriceFeeds, setTestPriceFeeds] = useState<TestPriceFeed[]>([]);
  const [symbol, setSymbol] = useState("");
  const [assetType, setAssetType] = useState("stock");
  const [amount, setAmount] = useState("");
  const [purchasePrice, setPurchasePrice] = useState("");
  const [formError, setFormError] = useState<string>();
  const [priceError, setPriceError] = useState<string>();
  const [accessError, setAccessError] = useState<string>();
  const [connectionError, setConnectionError] = useState<string>();
  const [generatedToken, setGeneratedToken] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  const [savingPrice, setSavingPrice] = useState(false);
  const [changingTestPrices, setChangingTestPrices] = useState(false);
  const [testPriceError, setTestPriceError] = useState<string>();
  const [exposureError, setExposureError] = useState<string>();
  const [authenticating, setAuthenticating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [removingId, setRemovingId] = useState<bigint>();

  useEffect(() => {
    let disposed = false;

    const conn = connectToSpacetimeDB({
      onConnected(activeConnection, connectedIdentity) {
        if (disposed) return;

        const syncPortfolio = () => {
          if (disposed) return;
          setHasPortfolio(activeConnection.db.myPortfolio.count() > 0n);
          setAssets([...activeConnection.db.myAssets.iter()]);
          setPositions([...activeConnection.db.myPositions.iter()]);
          setPrices([...activeConnection.db.myPrices.iter()]);
          setEtfHoldings([...activeConnection.db.etfHolding.iter()]);
          setTestPriceFeeds([
            ...activeConnection.db.myTestPriceFeed.iter(),
          ]);
        };

        setConnection(activeConnection);
        setIdentity(connectedIdentity.toHexString());
        setStatus("connected");
        setConnectionError(undefined);

        activeConnection.db.myPortfolio.onInsert(syncPortfolio);
        activeConnection.db.myPortfolio.onDelete(syncPortfolio);
        activeConnection.db.myAssets.onInsert(syncPortfolio);
        activeConnection.db.myAssets.onDelete(syncPortfolio);
        activeConnection.db.myAssets.onUpdate(syncPortfolio);
        activeConnection.db.myPositions.onInsert(syncPortfolio);
        activeConnection.db.myPositions.onDelete(syncPortfolio);
        activeConnection.db.myPositions.onUpdate(syncPortfolio);
        activeConnection.db.myPrices.onInsert(syncPortfolio);
        activeConnection.db.myPrices.onDelete(syncPortfolio);
        activeConnection.db.myPrices.onUpdate(syncPortfolio);
        activeConnection.db.myTestPriceFeed.onInsert(syncPortfolio);
        activeConnection.db.myTestPriceFeed.onDelete(syncPortfolio);
        activeConnection.db.myTestPriceFeed.onUpdate(syncPortfolio);
        activeConnection.db.etfHolding.onInsert(syncPortfolio);
        activeConnection.db.etfHolding.onDelete(syncPortfolio);
        activeConnection.db.etfHolding.onUpdate(syncPortfolio);

        activeConnection.subscriptionBuilder()
          .onApplied(() => {
            if (disposed) return;
            syncPortfolio();
            setSubscriptionReady(true);
            if (activeConnection.db.etfHolding.count() === 0n) {
              activeConnection.reducers.loadSampleEtfHoldings({}).catch(
                (error) => {
                  if (disposed) return;
                  setExposureError(
                    getErrorMessage(error, "Could not load sample ETF data."),
                  );
                },
              );
            }
          })
          .onError((ctx) => {
            if (disposed) return;
            setStatus("error");
            setConnectionError(ctx.event?.message ?? "Subscription failed");
          })
          .subscribe([
            tables.myPortfolio,
            tables.myAssets,
            tables.myPositions,
            tables.myPrices,
            tables.myTestPriceFeed,
            tables.etfHolding,
          ]);
      },
      onDisconnected(error) {
        if (disposed) return;
        setStatus("disconnected");
        setSubscriptionReady(false);
        setConnection(undefined);
        if (error) setConnectionError(error.message);
      },
      onError(error) {
        if (disposed) return;
        setStatus("error");
        setConnectionError(error.message);
      },
    });

    return () => {
      disposed = true;
      conn.disconnect();
    };
  }, []);

  const assetsById = useMemo(
    () => new Map(assets.map((asset) => [asset.id, asset])),
    [assets],
  );

  const pricesByAssetId = useMemo(
    () => new Map(prices.map((price) => [price.assetId, price])),
    [prices],
  );

  async function authenticatePortfolio(token: string) {
    if (!connection || !subscriptionReady) return;

    setAuthenticating(true);
    setAccessError(undefined);
    try {
      await connection.reducers.authenticatePortfolio({ token: token.trim() });
    } catch (error) {
      setAccessError(getErrorMessage(error, "Could not open the portfolio."));
    } finally {
      setAuthenticating(false);
    }
  }

  async function createPortfolio() {
    if (!connection || !subscriptionReady) return;

    const token = generatePortfolioToken();
    setAuthenticating(true);
    setAccessError(undefined);
    try {
      await connection.reducers.createPortfolio({ token });
      setGeneratedToken(token);
    } catch (error) {
      setAccessError(getErrorMessage(error, "Could not create the portfolio."));
    } finally {
      setAuthenticating(false);
    }
  }

  async function logout() {
    if (!connection) return;

    setLoggingOut(true);
    setConnectionError(undefined);
    try {
      await connection.reducers.logoutPortfolio({});
      forgetSpacetimeDBToken();
      globalThis.location.reload();
    } catch (error) {
      setConnectionError(getErrorMessage(error, "Could not sign out."));
      setLoggingOut(false);
    }
  }

  async function addPosition(event: SubmitEvent) {
    event.preventDefault();
    if (!connection || !subscriptionReady || !hasPortfolio) return;

    const parsedAmount = Number(amount);
    const parsedPrice = Number(purchasePrice);
    const cleanSymbol = symbol.trim().toUpperCase();

    if (!cleanSymbol) {
      setFormError("Enter an asset symbol, for example VWCE.");
      return;
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFormError("Amount must be greater than zero.");
      return;
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      setFormError("Purchase price cannot be negative.");
      return;
    }

    setSubmitting(true);
    setFormError(undefined);
    try {
      await connection.reducers.addPosition({
        symbol: cleanSymbol,
        assetType,
        amount: parsedAmount,
        purchasePrice: parsedPrice,
      });
      setSymbol("");
      setAmount("");
      setPurchasePrice("");
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not add the position."));
    } finally {
      setSubmitting(false);
    }
  }

  async function removePosition(positionId: bigint) {
    if (!connection) return;

    setRemovingId(positionId);
    setFormError(undefined);
    try {
      await connection.reducers.removePosition({ positionId });
    } catch (error) {
      setFormError(getErrorMessage(error, "Could not remove the position."));
    } finally {
      setRemovingId(undefined);
    }
  }

  async function savePrice(assetId: bigint, value: number) {
    if (!connection || !hasPortfolio) return;

    if (!Number.isFinite(value) || value < 0) {
      setPriceError("Price cannot be negative.");
      return;
    }

    setSavingPrice(true);
    setPriceError(undefined);
    try {
      await connection.reducers.setPrice({ assetId, value });
    } catch (error) {
      setPriceError(getErrorMessage(error, "Could not save the price."));
    } finally {
      setSavingPrice(false);
    }
  }

  async function toggleTestPrices() {
    if (!connection || !hasPortfolio) return;

    const running = testPriceFeeds[0]?.isRunning ?? false;
    setChangingTestPrices(true);
    setTestPriceError(undefined);
    try {
      if (running) {
        await connection.reducers.stopTestPrices({});
      } else {
        await connection.reducers.startTestPrices({});
      }
    } catch (error) {
      setTestPriceError(
        getErrorMessage(
          error,
          `Could not ${running ? "stop" : "start"} prices.`,
        ),
      );
    } finally {
      setChangingTestPrices(false);
    }
  }

  const ready = status === "connected" && subscriptionReady;

  return (
    <div class="page-shell">
      <header class="site-header">
        <a class="brand" href="/" aria-label="Exposure Radar home">
          <span class="brand-mark" aria-hidden="true">ER</span>
          <span>Exposure Radar</span>
        </a>
        <div class="header-actions">
          <ConnectionStatus
            status={status}
            identity={identity}
            error={connectionError}
          />
          {hasPortfolio && (
            <button
              class="logout-button"
              type="button"
              onClick={logout}
              disabled={loggingOut}
            >
              {loggingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      </header>

      <main>
        {!ready ? <LoadingAccess /> : !hasPortfolio
          ? (
            <PortfolioAccess
              error={accessError}
              submitting={authenticating}
              onAuthenticate={authenticatePortfolio}
              onCreate={createPortfolio}
            />
          )
          : (
            <>
              {generatedToken && (
                <GeneratedSecret
                  token={generatedToken}
                  onSaved={() => setGeneratedToken(undefined)}
                />
              )}
              <PortfolioDashboard
                assets={assets}
                assetsById={assetsById}
                positions={positions}
                pricesByAssetId={pricesByAssetId}
                etfHoldings={etfHoldings}
                symbol={symbol}
                assetType={assetType}
                amount={amount}
                purchasePrice={purchasePrice}
                formError={formError}
                priceError={priceError}
                submitting={submitting}
                savingPrice={savingPrice}
                testPricesRunning={testPriceFeeds[0]?.isRunning ?? false}
                changingTestPrices={changingTestPrices}
                testPriceError={testPriceError}
                exposureError={exposureError}
                removingId={removingId}
                onSymbolChange={setSymbol}
                onAssetTypeChange={setAssetType}
                onAmountChange={setAmount}
                onPurchasePriceChange={setPurchasePrice}
                onAdd={addPosition}
                onRemove={removePosition}
                onSavePrice={savePrice}
                onToggleTestPrices={toggleTestPrices}
              />
            </>
          )}
      </main>

      <footer>
        Educational project only. No investment advice or trading.
      </footer>
    </div>
  );
}

interface PortfolioDashboardProps {
  assets: Asset[];
  assetsById: Map<bigint, Asset>;
  positions: Position[];
  pricesByAssetId: Map<bigint, Price>;
  etfHoldings: EtfHolding[];
  symbol: string;
  assetType: string;
  amount: string;
  purchasePrice: string;
  formError?: string;
  priceError?: string;
  submitting: boolean;
  savingPrice: boolean;
  testPricesRunning: boolean;
  changingTestPrices: boolean;
  testPriceError?: string;
  exposureError?: string;
  removingId?: bigint;
  onSymbolChange: (value: string) => void;
  onAssetTypeChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPurchasePriceChange: (value: string) => void;
  onAdd: (event: SubmitEvent) => Promise<void>;
  onRemove: (positionId: bigint) => Promise<void>;
  onSavePrice: (assetId: bigint, value: number) => Promise<void>;
  onToggleTestPrices: () => Promise<void>;
}

function PortfolioDashboard(props: PortfolioDashboardProps) {
  const {
    assets,
    assetsById,
    positions,
    pricesByAssetId,
    etfHoldings,
    symbol,
    assetType,
    amount,
    purchasePrice,
    formError,
    priceError,
    submitting,
    savingPrice,
    testPricesRunning,
    changingTestPrices,
    testPriceError,
    exposureError,
    removingId,
  } = props;

  const totals = calculatePortfolioTotals(positions, pricesByAssetId);
  const exposureResult = calculatePortfolioExposures(
    assets,
    positions,
    pricesByAssetId,
    etfHoldings,
  );
  const supportedEtfs = [
    ...new Set(
      etfHoldings.map((holding) => holding.etfSymbol),
    ),
  ].sort();

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
          totalPositions={positions.length}
        />

        <div class="portfolio-layout">
          <div class="portfolio-forms">
            <form class="position-form panel" onSubmit={props.onAdd}>
              <div class="panel-heading">
                <span class="step-number">01</span>
                <div>
                  <h3>Add a position</h3>
                  <p>Enter what you bought and its purchase price.</p>
                </div>
              </div>

              <label>
                <span>Symbol</span>
                <input
                  name="symbol"
                  value={symbol}
                  onInput={(event) =>
                    props.onSymbolChange(event.currentTarget.value)}
                  placeholder="VWCE"
                  autocomplete="off"
                  maxlength={16}
                  required
                />
              </label>

              <label>
                <span>Asset type</span>
                <select
                  name="assetType"
                  value={assetType}
                  onChange={(event) =>
                    props.onAssetTypeChange(event.currentTarget.value)}
                >
                  <option value="stock">Stock</option>
                  <option value="etf">ETF</option>
                  <option value="crypto">Crypto</option>
                </select>
              </label>

              <div class="form-row">
                <label>
                  <span>Amount</span>
                  <input
                    name="amount"
                    type="number"
                    value={amount}
                    onInput={(event) =>
                      props.onAmountChange(event.currentTarget.value)}
                    placeholder="10"
                    min="0"
                    step="any"
                    required
                  />
                </label>
                <label>
                  <span>Purchase price (USD)</span>
                  <input
                    name="purchasePrice"
                    type="number"
                    value={purchasePrice}
                    onInput={(event) =>
                      props.onPurchasePriceChange(event.currentTarget.value)}
                    placeholder="125.50"
                    min="0"
                    step="any"
                    required
                  />
                </label>
              </div>

              {formError && <p class="form-error" role="alert">{formError}</p>}

              <button class="submit-button" type="submit" disabled={submitting}>
                {submitting ? "Adding…" : "Add position"}
              </button>
            </form>

            <PriceEditor
              assets={assets}
              pricesByAssetId={pricesByAssetId}
              error={priceError}
              submitting={savingPrice}
              locked={testPricesRunning}
              onSave={props.onSavePrice}
            />

            <TestPriceControls
              running={testPricesRunning}
              submitting={changingTestPrices}
              disabled={assets.length === 0}
              error={testPriceError}
              onToggle={props.onToggleTestPrices}
            />
          </div>

          <div class="positions-panel panel">
            <div class="panel-heading positions-heading">
              <span class="step-number">04</span>
              <div>
                <h3>Saved positions</h3>
                <p>
                  {positions.length === 0
                    ? "Your portfolio is empty."
                    : `${positions.length} ${
                      positions.length === 1 ? "position" : "positions"
                    } saved.`}
                </p>
              </div>
            </div>

            {positions.length === 0
              ? (
                <div class="empty-state">
                  <span class="empty-state-mark">+</span>
                  <strong>No positions yet</strong>
                  <p>Use the form to add your first asset.</p>
                </div>
              )
              : (
                <div class="positions-table-wrap">
                  <table class="positions-table">
                    <thead>
                      <tr>
                        <th>Asset</th>
                        <th>Amount</th>
                        <th>Purchase price</th>
                        <th>Current price</th>
                        <th>Value</th>
                        <th>Profit / loss</th>
                        <th>
                          <span class="visually-hidden">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {positions.map((position) => {
                        const asset = assetsById.get(position.assetId);
                        const metrics = calculatePositionMetrics(
                          position,
                          pricesByAssetId,
                        );
                        const rowIsRemoving = removingId === position.id;
                        const movement = getPriceMovement(
                          pricesByAssetId.get(position.assetId)?.change ?? 0,
                        );
                        return (
                          <tr key={String(position.id)}>
                            <td>
                              <span class="asset-symbol">
                                {asset?.symbol ?? "Unknown"}
                              </span>
                              <span class="asset-type">
                                {assetTypeLabels[asset?.assetType ?? ""] ??
                                  asset?.assetType ?? "Asset"}
                              </span>
                            </td>
                            <td>{formatAmount(position.amount)}</td>
                            <td>{formatPrice(position.purchasePrice)}</td>
                            <td>
                              {metrics.currentPrice !== undefined
                                ? (
                                  <span class="current-price">
                                    {formatPrice(metrics.currentPrice)}
                                    {movement !== "flat" && (
                                      <span
                                        class={`price-movement movement-${movement}`}
                                        aria-label={`Price moved ${movement}`}
                                      >
                                        {movement === "up" ? "↑" : "↓"}
                                      </span>
                                    )}
                                  </span>
                                )
                                : <span class="missing-value">Not set</span>}
                            </td>
                            <td>
                              {metrics.currentValue === undefined
                                ? "—"
                                : formatPrice(metrics.currentValue)}
                            </td>
                            <td
                              class={metrics.profitLoss === undefined
                                ? ""
                                : metrics.profitLoss >= 0
                                ? "value-positive"
                                : "value-negative"}
                            >
                              {metrics.profitLoss === undefined
                                ? "—"
                                : formatSignedPrice(metrics.profitLoss)}
                            </td>
                            <td>
                              <button
                                class="remove-button"
                                type="button"
                                onClick={() => props.onRemove(position.id)}
                                disabled={rowIsRemoving}
                                aria-label={`Remove ${
                                  asset?.symbol ?? "position"
                                }`}
                              >
                                {rowIsRemoving ? "Removing…" : "Remove"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
          </div>
        </div>

        {exposureError && (
          <p class="form-error exposure-error" role="alert">
            {exposureError}
          </p>
        )}
        <ExposureBreakdown
          exposures={exposureResult.exposures}
          portfolioValue={exposureResult.portfolioValue}
          unanalysedEtfValue={exposureResult.unanalysedEtfValue}
          supportedEtfs={supportedEtfs}
        />
      </section>
    </>
  );
}

function LoadingAccess() {
  return (
    <section class="access-section access-loading">
      <div>
        <p class="eyebrow">Private by default</p>
        <h1>Opening Exposure Radar.</h1>
        <p>Connecting securely to SpacetimeDB…</p>
      </div>
    </section>
  );
}

function generatePortfolioToken(): string {
  return `er_${randomHex(12)}_${randomHex(32)}`;
}

function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(
    value,
  );
}

function formatPrice(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedPrice(value: number): string {
  return `${value > 0 ? "+" : ""}${formatPrice(value)}`;
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
