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
- see the total portfolio value;
- see simple profit or loss;
- see direct and indirect exposure from supported ETFs;
- watch the screen update immediately when data changes.

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

Milestone 2 is complete. A user can create a private portfolio, add positions,
and remove them.

## Portfolio secret

A portfolio is protected by one long secret. The app shows it only when the
portfolio is created. Save it somewhere safe because it cannot be recovered.

The database stores only a salted hash of the secret. It does not store the
original secret. After the secret is checked, SpacetimeDB remembers that
browser's identity until the user signs out.

## Important note

Exposure Radar is an educational project. It does not provide financial advice
and it does not execute trades.
