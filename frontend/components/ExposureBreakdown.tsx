import type { PortfolioExposure } from "../lib/portfolio.ts";

interface ExposureBreakdownProps {
  exposures: PortfolioExposure[];
  portfolioValue: number;
  unanalysedEtfValue: number;
  supportedEtfs: string[];
}

export default function ExposureBreakdown(
  {
    exposures,
    portfolioValue,
    unanalysedEtfValue,
    supportedEtfs,
  }: ExposureBreakdownProps,
) {
  return (
    <section class="exposure-panel panel" aria-labelledby="exposure-title">
      <div class="exposure-heading">
        <div>
          <p class="eyebrow">Inside your assets</p>
          <h3 id="exposure-title">Largest real exposures</h3>
          <p>
            Direct assets are combined with the sample companies held inside
            supported ETFs.
          </p>
        </div>
        <span class="sample-badge">Sample ETF data</span>
      </div>

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
            <p>Add a stock, crypto asset, or one of the sample ETFs.</p>
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
          Supported samples:{" "}
          {supportedEtfs.length > 0 ? supportedEtfs.join(", ") : "loading…"}
        </span>
        {unanalysedEtfValue > 0 && (
          <span>
            {formatMoney(unanalysedEtfValue)}{" "}
            of ETF value is outside the sample holdings.
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
