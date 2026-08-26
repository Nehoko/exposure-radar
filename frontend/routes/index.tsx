import { Head } from "fresh/runtime";
import SpacetimeStatus from "../islands/SpacetimeStatus.tsx";
import { define } from "../utils.ts";

const assetTypes = [
  { symbol: "NVDA", name: "Stock", color: "violet" },
  { symbol: "VWCE", name: "ETF", color: "blue" },
  { symbol: "BTC", name: "Crypto", color: "orange" },
];

export default define.page(function Home() {
  return (
    <>
      <Head>
        <title>Exposure Radar</title>
      </Head>

      <div class="page-shell">
        <header class="site-header">
          <a class="brand" href="/" aria-label="Exposure Radar home">
            <span class="brand-mark" aria-hidden="true">ER</span>
            <span>Exposure Radar</span>
          </a>
          <SpacetimeStatus />
        </header>

        <main>
          <section class="hero">
            <div class="hero-copy">
              <p class="eyebrow">One portfolio. The full picture.</p>
              <h1>See what you really own.</h1>
              <p class="hero-text">
                Exposure Radar will combine stocks, ETFs, and crypto so you can
                spot hidden concentration in your portfolio.
              </p>
              <div class="hero-actions">
                <a class="primary-action" href="#preview">View preview</a>
                <span class="helper-text">Portfolio editing comes next.</span>
              </div>
            </div>

            <div class="radar-card" aria-label="Exposure preview">
              <div class="radar-grid" aria-hidden="true">
                <span class="ring ring-one" />
                <span class="ring ring-two" />
                <span class="ring ring-three" />
                <span class="radar-line" />
                <span class="radar-sweep" />
                <span class="radar-point point-one" />
                <span class="radar-point point-two" />
                <span class="radar-point point-three" />
              </div>
              <div class="radar-label">
                <span>Largest exposure</span>
                <strong>Coming soon</strong>
              </div>
            </div>
          </section>

          <section class="preview" id="preview">
            <div class="section-heading">
              <div>
                <p class="eyebrow">Portfolio preview</p>
                <h2>Different assets, one clear view</h2>
              </div>
              <p>Sample data</p>
            </div>

            <div class="asset-grid">
              {assetTypes.map((asset) => (
                <article class="asset-card" key={asset.symbol}>
                  <span class={`asset-icon ${asset.color}`}>
                    {asset.symbol.slice(0, 1)}
                  </span>
                  <div>
                    <strong>{asset.symbol}</strong>
                    <p>{asset.name}</p>
                  </div>
                  <span class="placeholder-value">—</span>
                </article>
              ))}
            </div>
          </section>
        </main>

        <footer>
          Educational project only. No investment advice or trading.
        </footer>
      </div>
    </>
  );
});
