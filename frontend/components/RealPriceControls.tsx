import type { RealPriceFeed } from "../src/module_bindings/types.ts";

interface RealPriceControlsProps {
  feed?: RealPriceFeed;
  submitting: boolean;
  refreshing: boolean;
  disabled: boolean;
  error?: string;
  onToggle: () => Promise<void>;
  onRefresh: () => Promise<void>;
}

export default function RealPriceControls(
  { feed, submitting, refreshing, disabled, error, onToggle, onRefresh }:
    RealPriceControlsProps,
) {
  const running = feed?.isRunning ?? false;
  return (
    <section class="real-price-panel panel" aria-live="polite">
      <div class="panel-heading test-price-heading">
        <span class="step-number">03</span>
        <div>
          <h3>Market prices</h3>
          <p>Yahoo first, CoinGecko backup for crypto.</p>
        </div>
        <span class={`feed-status ${running ? "is-running" : "is-stopped"}`}>
          <span aria-hidden="true" />
          {running ? "Hourly" : "Stopped"}
        </span>
      </div>

      <p class="test-price-note">
        Prices refresh once per hour. Data can be delayed. Manual prices remain
        available when a provider cannot find an asset.
      </p>

      {feed?.message && <p class="feed-message">{feed.message}</p>}
      {feed?.lastAttemptAt && (
        <p class="feed-time">
          Last attempt:{" "}
          {formatTimestamp(feed.lastAttemptAt.microsSinceUnixEpoch)}
        </p>
      )}
      {error && <p class="form-error" role="alert">{error}</p>}

      <div class="feed-actions">
        <button
          class={`feed-toggle-button ${running ? "stop" : "start"}`}
          type="button"
          onClick={() => void onToggle()}
          disabled={disabled || submitting || refreshing}
        >
          {submitting
            ? running ? "Stopping…" : "Starting…"
            : running
            ? "Stop market prices"
            : "Start market prices"}
        </button>
        <button
          class="refresh-price-button"
          type="button"
          onClick={() => void onRefresh()}
          disabled={disabled || submitting || refreshing}
        >
          {refreshing ? "Refreshing…" : "Refresh now"}
        </button>
      </div>
    </section>
  );
}

function formatTimestamp(micros: bigint): string {
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(micros / 1000n)));
}
