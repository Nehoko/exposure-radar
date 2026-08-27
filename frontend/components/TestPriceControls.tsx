interface TestPriceControlsProps {
  running: boolean;
  submitting: boolean;
  disabled: boolean;
  error?: string;
  onToggle: () => Promise<void>;
}

export default function TestPriceControls(
  { running, submitting, disabled, error, onToggle }: TestPriceControlsProps,
) {
  return (
    <section class="test-price-panel panel" aria-live="polite">
      <div class="panel-heading test-price-heading">
        <span class="step-number">04</span>
        <div>
          <h3>Live test prices</h3>
          <p>Move every five seconds using simulated data.</p>
        </div>
        <span class={`feed-status ${running ? "is-running" : "is-stopped"}`}>
          <span aria-hidden="true" />
          {running ? "Running" : "Stopped"}
        </span>
      </div>

      <p class="test-price-note">
        This is not market data. The same generated prices appear immediately in
        every browser that has this portfolio open.
      </p>

      {error && <p class="form-error" role="alert">{error}</p>}

      <button
        class={`feed-toggle-button ${running ? "stop" : "start"}`}
        type="button"
        onClick={() => void onToggle()}
        disabled={disabled || submitting}
      >
        {submitting
          ? running ? "Stopping…" : "Starting…"
          : running
          ? "Stop test prices"
          : "Start test prices"}
      </button>
    </section>
  );
}
