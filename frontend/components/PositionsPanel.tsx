import { Fragment } from "preact";
import { useState } from "preact/hooks";
import {
  calculatePositionMetrics,
  getPriceMovement,
  groupPositionsByAsset,
} from "../lib/portfolio.ts";
import type { Asset, Position, Price } from "../src/module_bindings/types.ts";

const assetTypeLabels: Record<string, string> = {
  stock: "Stock",
  etf: "ETF",
  crypto: "Crypto",
};

interface PositionsPanelProps {
  stepNumber: string;
  assetsById: Map<bigint, Asset>;
  positions: Position[];
  pricesByAssetId: Map<bigint, Price>;
  removingId?: bigint;
  onRemove: (positionId: bigint) => Promise<void>;
}

export default function PositionsPanel(props: PositionsPanelProps) {
  const [expandedAssetIds, setExpandedAssetIds] = useState<Set<bigint>>(
    new Set(),
  );
  const holdings = groupPositionsByAsset(props.positions).sort((left, right) =>
    (props.assetsById.get(left.assetId)?.symbol ?? "").localeCompare(
      props.assetsById.get(right.assetId)?.symbol ?? "",
    )
  );

  function togglePurchases(assetId: bigint) {
    setExpandedAssetIds((current) => {
      const next = new Set(current);
      if (next.has(assetId)) next.delete(assetId);
      else next.add(assetId);
      return next;
    });
  }

  return (
    <div class="positions-panel panel">
      <div class="panel-heading positions-heading">
        <span class="step-number">{props.stepNumber}</span>
        <div>
          <h3>Holdings</h3>
          <p>
            {props.positions.length === 0
              ? "Your portfolio is empty."
              : `${holdings.length} ${
                holdings.length === 1 ? "holding" : "holdings"
              } from ${props.positions.length} ${
                props.positions.length === 1 ? "purchase" : "purchases"
              }.`}
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
                {holdings.map((holding) => {
                  const asset = props.assetsById.get(holding.assetId);
                  const metrics = calculatePositionMetrics(
                    {
                      assetId: holding.assetId,
                      amount: holding.amount,
                      purchasePrice: holding.averagePurchasePrice,
                    },
                    props.pricesByAssetId,
                  );
                  const movement = getPriceMovement(
                    props.pricesByAssetId.get(holding.assetId)?.change ?? 0,
                  );
                  const price = props.pricesByAssetId.get(holding.assetId);
                  const expanded = expandedAssetIds.has(holding.assetId);
                  return (
                    <Fragment key={String(holding.assetId)}>
                      <tr>
                        <td>
                          <span class="asset-symbol">
                            {asset?.symbol ?? "Unknown"}
                          </span>
                          <span class="asset-type">
                            {assetTypeLabels[asset?.assetType ?? ""] ??
                              asset?.assetType ?? "Asset"}
                          </span>
                        </td>
                        <td>{formatAmount(holding.amount)}</td>
                        <td>
                          {formatPrice(holding.averagePurchasePrice)}
                          <small class="average-price-label">Average</small>
                        </td>
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
                            class="purchases-toggle"
                            type="button"
                            onClick={() => togglePurchases(holding.assetId)}
                            aria-expanded={expanded}
                          >
                            {holding.purchases.length}{" "}
                            {holding.purchases.length === 1
                              ? "purchase"
                              : "purchases"} {expanded ? "▴" : "▾"}
                          </button>
                        </td>
                      </tr>
                      {expanded && (
                        <tr class="purchase-history-row">
                          <td colSpan={7}>
                            <div class="purchase-history">
                              <strong>
                                {asset?.symbol ?? "Asset"} purchases
                              </strong>
                              <table>
                                <thead>
                                  <tr>
                                    <th>Purchase</th>
                                    <th>Amount</th>
                                    <th>Price</th>
                                    <th>Cost</th>
                                    <th>
                                      <span class="visually-hidden">
                                        Actions
                                      </span>
                                    </th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {holding.purchases.map((purchase, index) => {
                                    const removing =
                                      props.removingId === purchase.id;
                                    return (
                                      <tr key={String(purchase.id)}>
                                        <td>#{index + 1}</td>
                                        <td>{formatAmount(purchase.amount)}</td>
                                        <td>
                                          {formatPrice(purchase.purchasePrice)}
                                        </td>
                                        <td>
                                          {formatPrice(
                                            purchase.amount *
                                              purchase.purchasePrice,
                                          )}
                                        </td>
                                        <td>
                                          <button
                                            class="remove-button"
                                            type="button"
                                            onClick={() =>
                                              props.onRemove(purchase.id)}
                                            disabled={removing}
                                            aria-label={`Remove purchase ${
                                              index + 1
                                            } of ${asset?.symbol ?? "asset"}`}
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
                          </td>
                        </tr>
                      )}
                    </Fragment>
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
  if (source === "eulerpool") return "Eulerpool";
  if (source === "alpha-vantage") return "Alpha Vantage";
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
