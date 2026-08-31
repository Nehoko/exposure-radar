import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { ConnectionState } from "../components/ConnectionStatus.tsx";
import type { PortfolioDashboardProps } from "../components/PortfolioDashboard.tsx";
import {
  connectToSpacetimeDB,
  forgetSpacetimeDBToken,
} from "../lib/spacetimedb.ts";
import { type DbConnection, tables } from "../src/module_bindings/index.ts";
import type {
  Asset,
  EtfHolding,
  ExposureLimit,
  ExposureWarning,
  PortfolioEtfHolding,
  Position,
  Price,
  RealPriceFeed,
  TestPriceFeed,
} from "../src/module_bindings/types.ts";

export function usePortfolioController() {
  const [status, setStatus] = useState<ConnectionState>("connecting");
  const [identity, setIdentity] = useState<string>();
  const [connection, setConnection] = useState<DbConnection>();
  const [subscriptionReady, setSubscriptionReady] = useState(false);
  const [hasPortfolio, setHasPortfolio] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [positions, setPositions] = useState<Position[]>([]);
  const [prices, setPrices] = useState<Price[]>([]);
  const [etfHoldings, setEtfHoldings] = useState<EtfHolding[]>([]);
  const [portfolioEtfHoldings, setPortfolioEtfHoldings] = useState<
    PortfolioEtfHolding[]
  >([]);
  const [exposureLimits, setExposureLimits] = useState<ExposureLimit[]>([]);
  const [exposureWarnings, setExposureWarnings] = useState<ExposureWarning[]>(
    [],
  );
  const [testPriceFeeds, setTestPriceFeeds] = useState<TestPriceFeed[]>([]);
  const [realPriceFeeds, setRealPriceFeeds] = useState<RealPriceFeed[]>([]);
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
  const [changingRealPrices, setChangingRealPrices] = useState(false);
  const [refreshingRealPrices, setRefreshingRealPrices] = useState(false);
  const [testPriceError, setTestPriceError] = useState<string>();
  const [realPriceError, setRealPriceError] = useState<string>();
  const [exposureError, setExposureError] = useState<string>();
  const [etfHoldingsError, setEtfHoldingsError] = useState<string>();
  const [etfHoldingsMessage, setEtfHoldingsMessage] = useState<string>();
  const [refreshingEtfHoldings, setRefreshingEtfHoldings] = useState(false);
  const [warningError, setWarningError] = useState<string>();
  const [savingWarningLimit, setSavingWarningLimit] = useState(false);
  const [authenticating, setAuthenticating] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [removingId, setRemovingId] = useState<bigint>();
  const attemptedEtfRefresh = useRef(false);

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
          setPortfolioEtfHoldings([
            ...activeConnection.db.myEtfHoldings.iter(),
          ]);
          setExposureLimits([...activeConnection.db.myExposureLimit.iter()]);
          setExposureWarnings([
            ...activeConnection.db.myExposureWarnings.iter(),
          ]);
          setTestPriceFeeds([
            ...activeConnection.db.myTestPriceFeed.iter(),
          ]);
          setRealPriceFeeds([
            ...activeConnection.db.myRealPriceFeed.iter(),
          ]);
        };

        setConnection(activeConnection);
        setIdentity(connectedIdentity.toHexString());
        setStatus("connected");
        setConnectionError(undefined);
        registerTableListeners(activeConnection, syncPortfolio);
        activeConnection.subscriptionBuilder()
          .onApplied(() => {
            if (disposed) return;
            syncPortfolio();
            setSubscriptionReady(true);
            if (activeConnection.db.etfHolding.count() === 0n) {
              activeConnection.reducers.loadSampleEtfHoldings({}).catch(
                (error) => {
                  if (!disposed) {
                    setExposureError(
                      getErrorMessage(
                        error,
                        "Could not load sample ETF data.",
                      ),
                    );
                  }
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
            tables.myRealPriceFeed,
            tables.etfHolding,
            tables.myEtfHoldings,
            tables.myExposureLimit,
            tables.myExposureWarnings,
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
  const effectiveEtfHoldings = useMemo(() => {
    const importedEtfs = new Set(
      portfolioEtfHoldings.map((holding) => holding.etfSymbol),
    );
    return [
      ...etfHoldings.filter((holding) => !importedEtfs.has(holding.etfSymbol)),
      ...portfolioEtfHoldings,
    ];
  }, [etfHoldings, portfolioEtfHoldings]);

  useEffect(() => {
    if (
      !connection || !subscriptionReady || !hasPortfolio ||
      attemptedEtfRefresh.current
    ) return;
    const etfs = assets.filter((asset) => asset.assetType === "etf");
    if (etfs.length === 0) return;
    attemptedEtfRefresh.current = true;
    const oneDayAgoMicros = BigInt(Date.now() - 24 * 60 * 60 * 1_000) * 1_000n;
    const freshEtfs = new Set(
      portfolioEtfHoldings
        .filter((holding) =>
          holding.fetchedAt.microsSinceUnixEpoch >= oneDayAgoMicros
        )
        .map((holding) => holding.etfSymbol),
    );
    if (etfs.some((asset) => !freshEtfs.has(asset.symbol))) {
      void refreshEtfHoldings();
    }
  }, [
    connection,
    subscriptionReady,
    hasPortfolio,
    assets,
    portfolioEtfHoldings,
  ]);

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
      return setFormError("Enter an asset symbol, for example VWCE.");
    }
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      return setFormError("Amount must be greater than zero.");
    }
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return setFormError("Purchase price cannot be negative.");
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
      return setPriceError("Price cannot be negative.");
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
      await (running
        ? connection.reducers.stopTestPrices({})
        : connection.reducers.startTestPrices({}));
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

  async function toggleRealPrices() {
    if (!connection || !hasPortfolio) return;
    const running = realPriceFeeds[0]?.isRunning ?? false;
    setChangingRealPrices(true);
    setRealPriceError(undefined);
    try {
      if (running) {
        await connection.reducers.stopRealPrices({});
      } else {
        await connection.reducers.startRealPrices({});
        await refreshRealPrices();
      }
    } catch (error) {
      setRealPriceError(
        getErrorMessage(
          error,
          `Could not ${running ? "stop" : "start"} market prices.`,
        ),
      );
    } finally {
      setChangingRealPrices(false);
    }
  }

  async function refreshRealPrices() {
    if (!connection || !hasPortfolio) return;
    setRefreshingRealPrices(true);
    setRealPriceError(undefined);
    try {
      await connection.procedures.refreshRealPrices({});
    } catch (error) {
      setRealPriceError(
        getErrorMessage(error, "Could not refresh market prices."),
      );
    } finally {
      setRefreshingRealPrices(false);
    }
  }

  async function refreshEtfHoldings() {
    if (!connection || !hasPortfolio) return;
    const symbols = [
      ...new Set(
        assets.filter((asset) => asset.assetType === "etf")
          .map((asset) => asset.symbol.toUpperCase()),
      ),
    ];
    if (symbols.length === 0) return;

    setRefreshingEtfHoldings(true);
    setEtfHoldingsError(undefined);
    setEtfHoldingsMessage(undefined);
    const imported: string[] = [];
    const unavailable: string[] = [];
    try {
      for (const symbol of symbols) {
        const response = await fetch(
          `/api/etf-holdings?symbol=${encodeURIComponent(symbol)}`,
        );
        if (!response.ok) {
          unavailable.push(symbol);
          continue;
        }
        const profile = await response.json() as {
          provider: string;
          holdings: Array<{ symbol: string; name: string; weight: number }>;
        };
        await connection.reducers.replaceEtfHoldings({
          etfSymbol: symbol,
          source: profile.provider,
          holdings: profile.holdings,
        });
        imported.push(symbol);
      }
      const messages = [];
      if (imported.length > 0) {
        messages.push(`Updated real holdings: ${imported.join(", ")}.`);
      }
      if (unavailable.length > 0) {
        messages.push(
          `Sample data remains for unsupported ETFs: ${
            unavailable.join(", ")
          }.`,
        );
      }
      setEtfHoldingsMessage(messages.join(" "));
    } catch (error) {
      setEtfHoldingsError(
        getErrorMessage(error, "Could not refresh ETF holdings."),
      );
    } finally {
      setRefreshingEtfHoldings(false);
    }
  }

  async function saveExposureLimit(maximumPercentage: number) {
    if (!connection || !hasPortfolio) return;
    if (
      !Number.isFinite(maximumPercentage) ||
      maximumPercentage < 1 ||
      maximumPercentage > 100
    ) {
      return setWarningError("Choose a percentage between 1 and 100.");
    }
    setSavingWarningLimit(true);
    setWarningError(undefined);
    try {
      await connection.reducers.setExposureLimit({ maximumPercentage });
    } catch (error) {
      setWarningError(getErrorMessage(error, "Could not save the limit."));
    } finally {
      setSavingWarningLimit(false);
    }
  }

  const dashboardProps: PortfolioDashboardProps = {
    assets,
    assetsById,
    positions,
    pricesByAssetId,
    realPriceFeed: realPriceFeeds[0],
    etfHoldings: effectiveEtfHoldings,
    actualEtfHoldings: portfolioEtfHoldings,
    exposureLimit: exposureLimits[0],
    exposureWarnings,
    symbol,
    assetType,
    amount,
    purchasePrice,
    formError,
    priceError,
    testPriceError,
    realPriceError,
    exposureError,
    etfHoldingsError,
    etfHoldingsMessage,
    warningError,
    submitting,
    savingPrice,
    testPricesRunning: testPriceFeeds[0]?.isRunning ?? false,
    changingTestPrices,
    changingRealPrices,
    refreshingRealPrices,
    refreshingEtfHoldings,
    savingWarningLimit,
    removingId,
    onSymbolChange: setSymbol,
    onAssetTypeChange: setAssetType,
    onAmountChange: setAmount,
    onPurchasePriceChange: setPurchasePrice,
    onAdd: addPosition,
    onRemove: removePosition,
    onSavePrice: savePrice,
    onToggleTestPrices: toggleTestPrices,
    onToggleRealPrices: toggleRealPrices,
    onRefreshRealPrices: refreshRealPrices,
    onRefreshEtfHoldings: refreshEtfHoldings,
    onSaveExposureLimit: saveExposureLimit,
  };

  return {
    status,
    identity,
    connectionError,
    ready: status === "connected" && subscriptionReady,
    hasPortfolio,
    accessError,
    authenticating,
    loggingOut,
    generatedToken,
    dashboardProps,
    authenticatePortfolio,
    createPortfolio,
    logout,
    dismissGeneratedToken: () => setGeneratedToken(undefined),
  };
}

function registerTableListeners(
  connection: DbConnection,
  syncPortfolio: () => void,
): void {
  const reactiveTables = [
    connection.db.myPortfolio,
    connection.db.myAssets,
    connection.db.myPositions,
    connection.db.myPrices,
    connection.db.myTestPriceFeed,
    connection.db.myRealPriceFeed,
    connection.db.etfHolding,
    connection.db.myEtfHoldings,
    connection.db.myExposureLimit,
    connection.db.myExposureWarnings,
  ];
  for (const table of reactiveTables) {
    table.onInsert(syncPortfolio);
    table.onDelete(syncPortfolio);
    table.onUpdate(syncPortfolio);
  }
}

function generatePortfolioToken(): string {
  return `er_${randomHex(12)}_${randomHex(32)}`;
}

function randomHex(byteLength: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(byteLength));
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function getErrorMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}
