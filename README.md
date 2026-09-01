# Exposure Radar

Exposure Radar is a small app for monitoring stocks, ETFs, and crypto in one
place.

The app will help answer two simple questions:

1. What do I really own?
2. What is moving my portfolio today?

## The idea

An ETF contains many companies. If you own an ETF and also own some of its
companies directly, your real exposure can be larger than it looks.

For example, you may own NVIDIA shares directly and also own NVIDIA indirectly
through several ETFs. Exposure Radar will add these positions together and show
the total.

Later, the app may also explain which assets caused the biggest change in the
portfolio and warn when one exposure becomes too large.

## First version

The first useful version will be deliberately small. It will let a user:

- create one portfolio;
- add stocks, ETFs, and crypto manually;
- enter or update prices manually;
- run simulated prices that change every five seconds;
- fetch hourly market prices from Yahoo Finance, then try configured providers
  when Yahoo data is missing or old;
- see the total portfolio value;
- see simple profit or loss;
- see direct and indirect exposure from supported ETFs;
- inspect current Eulerpool holdings for European and US ETFs, with Alpha
  Vantage as a fallback for VOO and QQQ;
- use clearly labelled sample holdings when real fund data is unavailable;
- watch the screen update immediately when data changes.

Set `EXPOSURE_RADAR_DEBUG=true` in `.env.local` to show the simulated-price
controls and market-data key settings. They are hidden by default.

## Not in the first version

These features are useful, but they would make the first version too difficult:

- broker connections;
- trading or placing orders;
- paid realtime market data;
- AI-generated investment advice;
- advanced risk models;
- tax calculations;
- mobile applications.

They can be considered only after the basic app works.

## Why SpacetimeDB?

This is a learning project for SpacetimeDB. SpacetimeDB will store the portfolio
and prices. The web app will subscribe to this data, so changes can appear
immediately without refreshing the page.

## Planned technology

- SpacetimeDB with a TypeScript module
- Deno and Fresh web application
- A simple web interface

## Project plan

See [PLAN.md](PLAN.md) for small development milestones.

## Project status

Milestone 6 is complete. A user can create a private portfolio, add positions,
run shared simulated prices, see combined company exposure, and receive an
immediate warning when one company exceeds a chosen limit.

Milestone 7 is complete. Market-price support uses Yahoo Finance first. When
Yahoo data is missing or old, the backend tries Eulerpool and Alpha Vantage for
stocks and ETFs, or CoinGecko for crypto. If all backups fail, the app keeps the
old Yahoo price. Prices refresh hourly and can also be refreshed manually.

ETF exposure uses Eulerpool fund holdings first, including European UCITS ETFs.
Alpha Vantage is a fallback for VOO and QQQ. SpacetimeDB fetches and stores the
holdings; Fresh only displays them. To keep updates small, the app imports the
1,000 largest valid holdings from each fund. Educational sample holdings remain
available when no provider recognizes a fund.

## Market data keys

Eulerpool and Alpha Vantage keys are optional. Yahoo and CoinGecko work without
keys. To configure a key, sign in and use the **Market data keys** panel. The
key is sent directly to SpacetimeDB and stored in a private table. The web app
can see whether a provider is configured, but cannot read the key back.

For now, the application connects to Maincloud. `compose.yml` is a small base
for a later self-hosted SpacetimeDB deployment. A production deployment should
pin the image version and put TLS/reverse-proxy protection in front of it.

## Portfolio secret

A portfolio is protected by one long secret. The app shows it only when the
portfolio is created. Save it somewhere safe because it cannot be recovered.

The database stores only a salted hash of the secret. It does not store the
original secret. After the secret is checked, SpacetimeDB remembers that
browser's identity until the user signs out.

## Important note

Exposure Radar is an educational project. It does not provide financial advice
and it does not execute trades.
