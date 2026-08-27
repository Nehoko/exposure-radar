import {
  calculatePositionMetrics,
  getPriceMovement,
} from "../lib/portfolio.ts";
import type { Asset, Position, Price } from "../src/module_bindings/types.ts";

const assetTypeLabels: Record<string, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
};

interface PositionsPanelProps {
  assetsById: Map<bigint, Asset>;
  positions: Position[];
  pricesByAssetId: Map<bigint, Price>;
  removingId?: bigint;
  onRemove: (positionId: bigint) => Promise<void>;
}

export default function PositionsPanel(props: PositionsPanelProps) {
  return (
    <div class="positions-panel panel">
      <div class="panel-heading positions-heading">
        <span class="step-number">05</span>
        <div>
          <h3>Saved positions</h3>
          <p>
            {props.positions.length === 0
              ? "Your portfolio is empty."
              : `${props.positions.length} ${
                props.positions.length === 1 ? "position" : "positions"
              } saved.`}
          </p>
        </div>
      </div>

      {props.positions.length === 0
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
                {props.positions.map((position) => {
                  const asset = props.assetsById.get(position.assetId);
                  const metrics = calculatePositionMetrics(
                    position,
                    props.pricesByAssetId,
                  );
                  const movement = getPriceMovement(
                    props.pricesByAssetId.get(position.assetId)?.change ?? 0,
                  );
                  const price = props.pricesByAssetId.get(position.assetId);
                  const removing = props.removingId === position.id;
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
                        {metrics.currentPrice === undefined
                          ? <span class="missing-value">Not set</span>
                          : (
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
                              {price && (
                                <small
                                  class={`price-source ${
                                    isStale(price) ? "is-stale" : ""
                                  }`}
                                >
                                  {formatPriceSource(price.source)}
                                  {isStale(price) ? " · old" : ""}
                                </small>
                              )}
                            </span>
                          )}
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
                          disabled={removing}
                          aria-label={`Remove ${asset?.symbol ?? "position"}`}
                        >
                          {removing ? "Removing…" : "Remove"}
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
  );
}

function formatAmount(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 8 }).format(
    value,
  );
}

function formatPriceSource(source: string): string {
  if (source === "coingecko") return "CoinGecko";
  if (source === "yahoo") return "Yahoo";
  if (source === "test") return "Test";
  return "Manual";
}

function isStale(price: Price): boolean {
  const ageMicros = BigInt(Date.now()) * 1000n -
    price.updatedAt.microsSinceUnixEpoch;
  return ageMicros > 2n * 60n * 60n * 1_000_000n;
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
