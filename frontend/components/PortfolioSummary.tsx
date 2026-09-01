interface PortfolioSummaryProps {
  currentValue: number;
  investedValue: number;
  profitLoss?: number;
  pricedPositions: number;
  totalPositions: number;
}

export default function PortfolioSummary(
  {
    currentValue,
    investedValue,
    profitLoss,
    pricedPositions,
    totalPositions,
  }: PortfolioSummaryProps,
) {
  const missingPrices = totalPositions - pricedPositions;

  return (
    <div class="summary-grid" aria-label="Portfolio totals">
      <article class="summary-card">
        <span>Current value</span>
        <strong>{formatMoney(currentValue)}</strong>
        <small>
          {totalPositions === 0
            ? "No holdings yet"
            : missingPrices === 0
            ? "All holdings priced"
            : `${missingPrices} ${
              missingPrices === 1 ? "holding needs" : "holdings need"
            } a price`}
        </small>
      </article>

      <article class="summary-card">
        <span>Amount invested</span>
        <strong>{formatMoney(investedValue)}</strong>
        <small>Amount × purchase price</small>
      </article>

      <article class="summary-card">
        <span>Profit / loss</span>
        <strong
          class={profitLoss === undefined
            ? ""
            : profitLoss >= 0
            ? "value-positive"
            : "value-negative"}
        >
          {profitLoss === undefined ? "—" : formatSignedMoney(profitLoss)}
        </strong>
        <small>
          {pricedPositions === 0
            ? "Add a current price"
            : missingPrices > 0
            ? "For priced holdings only"
            : "Current value − invested"}
        </small>
      </article>
    </div>
  );
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(value);
}

function formatSignedMoney(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${formatMoney(value)}`;
}
