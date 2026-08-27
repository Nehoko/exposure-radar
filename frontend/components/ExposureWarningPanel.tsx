import { useEffect, useMemo, useState } from "preact/hooks";
import type { PortfolioExposure } from "../lib/portfolio.ts";
import type {
  ExposureLimit,
  ExposureWarning,
} from "../src/module_bindings/types.ts";

interface ExposureWarningPanelProps {
  exposures: PortfolioExposure[];
  limit?: ExposureLimit;
  warnings: ExposureWarning[];
  saving: boolean;
  error?: string;
  onSave: (maximumPercentage: number) => Promise<void>;
}

export default function ExposureWarningPanel(props: ExposureWarningPanelProps) {
  const savedLimit = props.limit?.maximumPercentage;
  const [input, setInput] = useState(savedLimit?.toString() ?? "20");

  useEffect(() => {
    if (savedLimit !== undefined) setInput(savedLimit.toString());
  }, [savedLimit]);

  const companyExposures = props.exposures.filter((row) =>
    row.kind === "company"
  );
  const breaches = savedLimit === undefined
    ? []
    : companyExposures.filter((row) => row.percentage > savedLimit);
  const history = useMemo(
    () =>
      [...props.warnings].sort((left, right) => {
        const leftTime = left.createdAt.microsSinceUnixEpoch;
        const rightTime = right.createdAt.microsSinceUnixEpoch;
        return leftTime > rightTime ? -1 : leftTime < rightTime ? 1 : 0;
      }),
    [props.warnings],
  );

  async function submit(event: SubmitEvent) {
    event.preventDefault();
    await props.onSave(Number(input));
  }

  return (
    <section class="warning-panel panel" aria-labelledby="warning-title">
      <div class="warning-copy">
        <p class="eyebrow">Concentration warning</p>
        <h3 id="warning-title">Keep one company below your limit</h3>
        {savedLimit === undefined
          ? <p>Choose a percentage. We will watch direct and ETF exposure.</p>
          : breaches.length > 0
          ? (
            <div class="warning-alert" role="alert">
              <strong>
                {breaches.length === 1
                  ? `${breaches[0].symbol} is over your limit.`
                  : `${breaches.length} companies are over your limit.`}
              </strong>
              <span>
                {breaches.map((row) =>
                  `${row.symbol} ${formatPercentage(row.percentage)}`
                ).join(" · ")}
              </span>
            </div>
          )
          : (
            <div class="warning-safe" role="status">
              <strong>
                No company is over {formatPercentage(savedLimit)}.
              </strong>
              <span>
                Exposure is checked after every position or price change.
              </span>
            </div>
          )}
      </div>

      <form class="warning-form" onSubmit={submit}>
        <label>
          <span>Maximum company exposure</span>
          <span class="warning-input-wrap">
            <input
              type="number"
              min="1"
              max="100"
              step="0.1"
              value={input}
              onInput={(event) => setInput(event.currentTarget.value)}
              required
            />
            <span>%</span>
          </span>
        </label>
        <button class="submit-button" type="submit" disabled={props.saving}>
          {props.saving
            ? "Saving…"
            : savedLimit === undefined
            ? "Start watching"
            : "Save limit"}
        </button>
        {props.error && <p class="form-error" role="alert">{props.error}</p>}
      </form>

      <div class="warning-history">
        <div>
          <strong>Warning history</strong>
          <span>Newest first · up to 20 saved</span>
        </div>
        {history.length === 0
          ? <p class="warning-history-empty">No warnings yet.</p>
          : (
            <ol>
              {history.slice(0, 6).map((warning) => (
                <li key={String(warning.id)}>
                  <strong>{warning.symbol}</strong>
                  <span>
                    {formatPercentage(warning.percentage)} crossed a{"  "}
                    {formatPercentage(warning.limit)} limit
                  </span>
                  <time>
                    {formatTime(warning.createdAt.microsSinceUnixEpoch)}
                  </time>
                </li>
              ))}
            </ol>
          )}
      </div>
    </section>
  );
}

function formatPercentage(value: number): string {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(
    value,
  ) + "%";
}

function formatTime(microseconds: bigint): string {
  return new Intl.DateTimeFormat("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(Number(microseconds / 1000n)));
}
