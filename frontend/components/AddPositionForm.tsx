interface AddPositionFormProps {
  symbol: string;
  assetType: string;
  amount: string;
  purchasePrice: string;
  error?: string;
  submitting: boolean;
  onSymbolChange: (value: string) => void;
  onAssetTypeChange: (value: string) => void;
  onAmountChange: (value: string) => void;
  onPurchasePriceChange: (value: string) => void;
  onSubmit: (event: SubmitEvent) => Promise<void>;
}

export default function AddPositionForm(props: AddPositionFormProps) {
  return (
    <form class="position-form panel" onSubmit={props.onSubmit}>
      <div class="panel-heading">
        <span class="step-number">01</span>
        <div>
          <h3>Add a position</h3>
          <p>Enter what you bought and its purchase price.</p>
        </div>
      </div>

      <label>
        <span>Symbol</span>
        <input
          name="symbol"
          value={props.symbol}
          onInput={(event) => props.onSymbolChange(event.currentTarget.value)}
          placeholder="VWCE"
          autocomplete="off"
          maxlength={16}
          required
        />
      </label>

      <label>
        <span>Asset type</span>
        <select
          name="assetType"
          value={props.assetType}
          onChange={(event) =>
            props.onAssetTypeChange(event.currentTarget.value)}
        >
          <option value="stock">Stock</option>
          <option value="etf">ETF</option>
          <option value="crypto">Crypto</option>
        </select>
      </label>

      <div class="form-row">
        <label>
          <span>Amount</span>
          <input
            name="amount"
            type="number"
            value={props.amount}
            onInput={(event) => props.onAmountChange(event.currentTarget.value)}
            placeholder="10"
            min="0"
            step="any"
            required
          />
        </label>
        <label>
          <span>Purchase price (USD)</span>
          <input
            name="purchasePrice"
            type="number"
            value={props.purchasePrice}
            onInput={(event) =>
              props.onPurchasePriceChange(event.currentTarget.value)}
            placeholder="125.50"
            min="0"
            step="any"
            required
          />
        </label>
      </div>

      {props.error && <p class="form-error" role="alert">{props.error}</p>}

      <button class="submit-button" type="submit" disabled={props.submitting}>
        {props.submitting ? "Adding…" : "Add position"}
      </button>
    </form>
  );
}
