import type { PortfolioExposure } from "../lib/portfolio.ts";

interface ExposureBreakdownProps {
  exposures: PortfolioExposure[];
  portfolioValue: number;
  unanalysedEtfValue: number;
  actualEtfs: string[];
  sampleEtfs: string[];
  latestHoldingsAt?: Date;
  refreshing: boolean;
  error?: string;
  message?: string;
  onRefresh: () => Promise<void>;
}

export default function ExposureBreakdown(
  {
    exposures,
    portfolioValue,
    unanalysedEtfValue,
    actualEtfs,
    sampleEtfs,
    latestHoldingsAt,
    refreshing,
    error,
    message,
    onRefresh,
  }: ExposureBreakdownProps,
) {
  return (
    <section class="exposure-panel panel" aria-labelledby="exposure-title">
      <div class="exposure-heading">
        <div>
          <p class="eyebrow">Inside your assets</p>
          <h3 id="exposure-title">Largest real exposures</h3>
          <p>
            Direct assets are combined with companies held inside your ETFs.
            Real fund holdings replace sample data when available.
          </p>
        </div>
        <div class="exposure-actions">
          <span class={`sample-badge ${actualEtfs.length > 0 ? "live" : ""}`}>
            {actualEtfs.length > 0 ? "Real ETF data" : "Sample ETF data"}
          </span>
          <button
            class="refresh-holdings-button"
            type="button"
            disabled={refreshing}
            onClick={() => void onRefresh()}
          >
            {refreshing ? "Refreshing…" : "Refresh holdings"}
          </button>
        </div>
      </div>

      {error && <p class="etf-holdings-status error" role="alert">{error}</p>}
      {message && <p class="etf-holdings-status">{message}</p>}

      {portfolioValue === 0
        ? (
          <div class="exposure-empty">
            <strong>Add current prices to see exposures.</strong>
            <p>Only priced positions can be calculated.</p>
          </div>
        )
        : exposures.length === 0
        ? (
          <div class="exposure-empty">
            <strong>No supported exposures yet.</strong>
            <p>Add a stock, crypto asset, or supported ETF.</p>
          </div>
        )
        : (
          <ol class="exposure-list">
            {exposures.slice(0, 8).map((exposure, index) => (
              <li key={`${exposure.kind}:${exposure.symbol}`}>
                <span class="exposure-rank">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <div class="exposure-identity">
                  <strong>{exposure.symbol}</strong>
                  <span>{exposure.name}</span>
                </div>
                <div class="exposure-measure">
                  <div class="exposure-values">
                    <span>{describeSources(exposure)}</span>
                    <strong>
                      {formatMoney(exposure.totalValue)} ·{" "}
                      {formatPercentage(exposure.percentage)}
                    </strong>
                  </div>
                  <span class="exposure-track" aria-hidden="true">
                    <span
                      style={{
                        width: String(Math.min(100, exposure.percentage)) + "%",
                      }}
                    />
                  </span>
                </div>
              </li>
            ))}
          </ol>
        )}

      <div class="exposure-footnote">
        <span>
          {actualEtfs.length > 0
            ? `Real holdings: ${actualEtfs.join(", ")}${
              latestHoldingsAt
                ? ` · fetched ${formatDate(latestHoldingsAt)}`
                : ""
            }`
            : "No real ETF holdings imported yet."}
          {sampleEtfs.length > 0
            ? ` Sample fallback: ${sampleEtfs.join(", ")}.`
            : ""}
        </span>
        {unanalysedEtfValue > 0 && (
          <span>
            {formatMoney(unanalysedEtfValue)}{" "}
            of ETF value is outside known holdings.
          </span>
        )}
      </div>
    </section>
  );
}

function describeSources(exposure: PortfolioExposure): string {
  if (exposure.directValue > 0 && exposure.indirectValue > 0) {
    return "Direct " + formatMoney(exposure.directValue) + " + ETFs " +
      formatMoney(exposure.indirectValue);
  }
  if (exposure.indirectValue > 0) {
    return "Through ETFs " + formatMoney(exposure.indirectValue);
  }
  return exposure.kind === "crypto"
    ? "Direct crypto " + formatMoney(exposure.directValue)
    : "Direct " + formatMoney(exposure.directValue);
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: 1,
  }).format(value) + "%";
}

function formatDate(value: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}
