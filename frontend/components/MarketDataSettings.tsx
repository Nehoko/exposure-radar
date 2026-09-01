import { useState } from "preact/hooks";
import type { MarketDataProviderStatus } from "../src/module_bindings/types.ts";

interface MarketDataSettingsProps {
  providers: MarketDataProviderStatus[];
  savingProvider?: string;
  error?: string;
  onSave: (provider: string, apiKey: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}

const PROVIDERS = [
  {
    id: "eulerpool",
    label: "Eulerpool",
    purpose: "European ETF holdings and stock/ETF prices",
  },
  {
    id: "alpha-vantage",
    label: "Alpha Vantage",
    purpose: "US ETF holdings and stock/ETF prices",
  },
] as const;

export default function MarketDataSettings(props: MarketDataSettingsProps) {
  const configured = new Set(
    props.providers.filter((provider) => provider.enabled)
      .map((provider) => provider.provider),
  );

  return (
    <section class="market-data-settings panel">
      <div class="panel-heading">
        <span class="step-number">Data</span>
        <div>
          <h3>Market data keys</h3>
          <p>Keys are stored only in SpacetimeDB's private table.</p>
        </div>
      </div>

      <div class="provider-settings">
        {PROVIDERS.map((provider) => (
          <ProviderKeyForm
            key={provider.id}
            {...provider}
            configured={configured.has(provider.id)}
            saving={props.savingProvider === provider.id}
            onSave={props.onSave}
            onRemove={props.onRemove}
          />
        ))}
      </div>
      {props.error && <p class="form-error" role="alert">{props.error}</p>}
    </section>
  );
}

interface ProviderKeyFormProps {
  id: string;
  label: string;
  purpose: string;
  configured: boolean;
  saving: boolean;
  onSave: (provider: string, apiKey: string) => Promise<void>;
  onRemove: (provider: string) => Promise<void>;
}

function ProviderKeyForm(props: ProviderKeyFormProps) {
  const [apiKey, setApiKey] = useState("");

  async function save(event: SubmitEvent) {
    event.preventDefault();
    const key = apiKey.trim();
    if (!key) return;
    await props.onSave(props.id, key);
    setApiKey("");
  }

  return (
    <form class="provider-key-form" onSubmit={save}>
      <div class="provider-key-heading">
        <div>
          <strong>{props.label}</strong>
          <small>{props.purpose}</small>
        </div>
        <span class={`provider-state ${props.configured ? "is-ready" : ""}`}>
          {props.configured ? "Configured" : "Optional"}
        </span>
      </div>
      <label for={`${props.id}-key`}>API key</label>
      <input
        id={`${props.id}-key`}
        type="password"
        value={apiKey}
        autocomplete="off"
        placeholder={props.configured ? "Enter a replacement key" : "Paste key"}
        onInput={(event) => setApiKey(event.currentTarget.value)}
      />
      <div class="feed-actions">
        <button
          class="refresh-price-button"
          type="submit"
          disabled={props.saving || !apiKey.trim()}
        >
          {props.saving ? "Saving…" : props.configured ? "Replace" : "Save"}
        </button>
        {props.configured && (
          <button
            class="provider-remove-button"
            type="button"
            disabled={props.saving}
            onClick={() => void props.onRemove(props.id)}
          >
            Remove
          </button>
        )}
      </div>
    </form>
  );
}
