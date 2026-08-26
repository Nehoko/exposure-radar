import { useState } from "preact/hooks";

interface PortfolioAccessProps {
  error?: string;
  submitting: boolean;
  onAuthenticate: (token: string) => Promise<void>;
  onCreate: () => Promise<void>;
}

export default function PortfolioAccess(
  { error, submitting, onAuthenticate, onCreate }: PortfolioAccessProps,
) {
  const [token, setToken] = useState("");

  return (
    <section class="access-section">
      <div class="access-intro">
        <p class="eyebrow">Private by default</p>
        <h1>Open your portfolio.</h1>
        <p>
          Your portfolio secret works like a key. We store only its salted
          hash—not the secret itself.
        </p>
        <div class="security-note">
          <span aria-hidden="true">✓</span>
          <p>
            Assets and positions stay in private tables. Save your secret
            somewhere safe: it cannot be recovered.
          </p>
        </div>
      </div>

      <div class="access-card panel">
        <div class="panel-heading">
          <span class="step-number">KEY</span>
          <div>
            <h2>Portfolio access</h2>
            <p>Enter an existing secret or create an empty portfolio.</p>
          </div>
        </div>

        <form
          class="access-form"
          onSubmit={(event) => {
            event.preventDefault();
            void onAuthenticate(token);
          }}
        >
          <label>
            <span>Portfolio secret</span>
            <input
              name="portfolioToken"
              type="password"
              value={token}
              onInput={(event) => setToken(event.currentTarget.value)}
              placeholder="er_…"
              autocomplete="off"
              spellcheck={false}
              required
            />
          </label>

          {error && <p class="form-error" role="alert">{error}</p>}

          <button
            class="submit-button"
            type="submit"
            disabled={submitting || token.trim().length === 0}
          >
            {submitting ? "Checking…" : "Open portfolio"}
          </button>
        </form>

        <div class="access-divider">
          <span>or</span>
        </div>

        <button
          class="secondary-button"
          type="button"
          onClick={() => void onCreate()}
          disabled={submitting}
        >
          Create a new portfolio
        </button>
      </div>
    </section>
  );
}
