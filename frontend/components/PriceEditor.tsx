import { useEffect, useState } from "preact/hooks";
import type { Asset, Price } from "../src/module_bindings/types.ts";

interface PriceEditorProps {
  assets: Asset[];
  pricesByAssetId: Map<bigint, Price>;
  error?: string;
  submitting: boolean;
  locked: boolean;
  onSave: (assetId: bigint, value: number) => Promise<void>;
}

export default function PriceEditor(
  { assets, pricesByAssetId, error, submitting, locked, onSave }:
    PriceEditorProps,
) {
  const [selectedAssetId, setSelectedAssetId] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (assets.length === 0) {
      setSelectedAssetId("");
      setValue("");
      return;
    }

    const selectedStillExists = assets.some((asset) =>
      String(asset.id) === selectedAssetId
    );
    if (!selectedStillExists) {
      selectAsset(String(assets[0].id));
    } else if (locked) {
      const currentPrice = pricesByAssetId.get(BigInt(selectedAssetId));
      setValue(currentPrice ? String(currentPrice.value) : "");
    }
  }, [assets, pricesByAssetId, locked]);

  function selectAsset(assetId: string) {
    setSelectedAssetId(assetId);
    const existingPrice = pricesByAssetId.get(BigInt(assetId));
    setValue(existingPrice ? String(existingPrice.value) : "");
  }

  return (
    <form
      class="price-form panel"
      onSubmit={(event) => {
        event.preventDefault();
        if (!selectedAssetId) return;
        void onSave(BigInt(selectedAssetId), Number(value));
      }}
    >
      <div class="panel-heading">
        <span class="step-number">02</span>
        <div>
          <h3>Update a price</h3>
          <p>
            {locked
              ? "Stop test prices to enter a price manually."
              : "Enter the current market price manually."}
          </p>
        </div>
      </div>

      <label>
        <span>Asset</span>
        <select
          name="priceAsset"
          value={selectedAssetId}
          onChange={(event) => selectAsset(event.currentTarget.value)}
          disabled={assets.length === 0}
        >
          {assets.length === 0
            ? <option value="">Add a position first</option>
            : assets.map((asset) => (
              <option value={String(asset.id)} key={String(asset.id)}>
                {asset.symbol} · {formatAssetType(asset.assetType)}
              </option>
            ))}
        </select>
      </label>

      <label>
        <span>Current price (USD)</span>
        <input
          name="currentPrice"
          type="number"
          value={value}
          onInput={(event) => setValue(event.currentTarget.value)}
          placeholder="125.50"
          min="0"
          step="any"
          disabled={assets.length === 0 || locked}
          required
        />
      </label>

      {error && <p class="form-error" role="alert">{error}</p>}

      <button
        class="submit-button"
        type="submit"
        disabled={assets.length === 0 || submitting || locked || value === ""}
      >
        {submitting ? "Saving…" : "Save current price"}
      </button>
    </form>
  );
}

function formatAssetType(value: string): string {
  if (value === "etf") return "ETF";
  return value.charAt(0).toUpperCase() + value.slice(1);
}
