import ConnectionStatus from "../components/ConnectionStatus.tsx";
import GeneratedSecret from "../components/GeneratedSecret.tsx";
import PortfolioAccess from "../components/PortfolioAccess.tsx";
import PortfolioDashboard from "../components/PortfolioDashboard.tsx";
import { usePortfolioController } from "../hooks/usePortfolioController.ts";

export default function PortfolioApp() {
  const portfolio = usePortfolioController();
  return (
    <div class="page-shell">
      <header class="site-header">
        <a class="brand" href="/" aria-label="Exposure Radar home">
          <span class="brand-mark" aria-hidden="true">ER</span>
          <span>Exposure Radar</span>
        </a>
        <div class="header-actions">
          <ConnectionStatus
            status={portfolio.status}
            identity={portfolio.identity}
            error={portfolio.connectionError}
          />
          {portfolio.hasPortfolio && (
            <button
              class="logout-button"
              type="button"
              onClick={portfolio.logout}
              disabled={portfolio.loggingOut}
            >
              {portfolio.loggingOut ? "Signing out…" : "Sign out"}
            </button>
          )}
        </div>
      </header>

      <main>
        {!portfolio.ready
          ? <LoadingAccess />
          : !portfolio.hasPortfolio
          ? (
            <PortfolioAccess
              error={portfolio.accessError}
              submitting={portfolio.authenticating}
              onAuthenticate={portfolio.authenticatePortfolio}
              onCreate={portfolio.createPortfolio}
            />
          )
          : (
            <>
              {portfolio.generatedToken && (
                <GeneratedSecret
                  token={portfolio.generatedToken}
                  onSaved={portfolio.dismissGeneratedToken}
                />
              )}
              <PortfolioDashboard {...portfolio.dashboardProps} />
            </>
          )}
      </main>

      <footer>
        Educational project only. No investment advice or trading.
      </footer>
    </div>
  );
}

function LoadingAccess() {
  return (
    <section class="access-section access-loading">
      <div>
        <p class="eyebrow">Private by default</p>
        <h1>Opening Exposure Radar.</h1>
        <p>Connecting securely to SpacetimeDB…</p>
      </div>
    </section>
  );
}
