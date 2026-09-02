# Market Data and Provider Licensing

Exposure Radar's software licence does not grant rights to market data returned
by Yahoo, CoinGecko, Alpha Vantage, Eulerpool, exchanges, fund managers, or any
other provider.

## Self-hosted installations

The operator is responsible for:

- obtaining provider accounts and API keys;
- choosing a plan that permits the intended personal or commercial use;
- following display, attribution, caching, retention, and redistribution rules;
- paying provider and exchange fees when required;
- removing data when a provider agreement requires it.

Do not use a personal or evaluation key to serve other users unless its licence
explicitly permits that use.

## Included provider integrations

- [Eulerpool](https://eulerpool.com/financial-data-api/licensing) publishes
  separate rules for personal use, commercial display, caching, and data resale.
- [CoinGecko](https://www.coingecko.com/en/api/pricing) permits commercial use
  only under the conditions of the selected plan and may require attribution.
- [Alpha Vantage](https://www.alphavantage.co/terms_of_service/) requires
  commercial users to arrange appropriate commercial rights.
- Yahoo endpoints used by this project are not a dependable commercial data
  contract. Review
  [Yahoo's API terms](https://legal.yahoo.com/us/en/yahoo/terms/product-atos/apiforydn/index.html)
  before relying on them in a paid service.

Provider terms and prices can change. These links are informational, not legal
advice or a sublicense from the project maintainers.

## Credentials and stored data

Provider keys are sent to SpacetimeDB and stored in a private table. Clients can
see configuration status but cannot read a stored key back. Keys must never be
baked into Docker images or committed to this repository.

Cached quotes and ETF holdings remain subject to their provider's licence. A
derived exposure calculation does not automatically grant permission to
redistribute its underlying raw data.
