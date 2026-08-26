# Exposure Radar Plan

The goal is to build one small working feature at a time. Each milestone should leave the app in a usable state.

## Milestone 1: Start the project

Goal: Open a basic web page and connect it to SpacetimeDB.

- [ ] Create a TypeScript SpacetimeDB project.
- [ ] Create a simple web application.
- [ ] Connect the web application to the local SpacetimeDB server.
- [ ] Show `Connected` or `Disconnected` on the page.

Done when: the page can connect to SpacetimeDB.

## Milestone 2: Create a portfolio

Goal: Save a small list of assets.

- [ ] Add an `asset` table.
- [ ] Add a `position` table.
- [ ] Add a form for a symbol, asset type, amount, and purchase price.
- [ ] Show all positions in a table.
- [ ] Allow a position to be removed.

Done when: a user can add and remove positions and the data remains after a page refresh.

## Milestone 3: Show portfolio value

Goal: Calculate the current value and simple profit or loss.

- [ ] Add a `price` table.
- [ ] Add a small form for updating a price manually.
- [ ] Calculate the value of every position.
- [ ] Show the total portfolio value.
- [ ] Show simple profit or loss.

Done when: changing a price immediately updates all totals.

## Milestone 4: Add live test prices

Goal: Learn how realtime updates work without paying for market data.

- [ ] Create a small test price generator.
- [ ] Update prices every few seconds.
- [ ] Show whether an asset is moving up or down.
- [ ] Add a button to start or stop test prices.

Done when: two open browser windows show the same changing prices and totals.

## Milestone 5: Look inside ETFs

Goal: Show hidden company exposure inside a few supported ETFs.

- [ ] Add an `etf_holding` table.
- [ ] Add sample holdings for two or three ETFs.
- [ ] Calculate indirect company exposure.
- [ ] Combine direct and indirect exposure.
- [ ] Show the largest real exposures.

Done when: the app can show that the same company is owned directly and through an ETF.

## Milestone 6: Add one useful warning

Goal: Warn when one company becomes too large in the portfolio.

- [ ] Let the user choose a maximum exposure percentage.
- [ ] Check the combined direct and indirect exposure.
- [ ] Show a warning when the limit is passed.
- [ ] Save a short history of warnings.

Done when: a price or position change can create a warning immediately.

## Milestone 7: Try real data

Goal: Replace test prices with a small amount of real or delayed market data.

- [ ] Compare free and paid data providers.
- [ ] Choose one provider for a small experiment.
- [ ] Import delayed prices for a few assets.
- [ ] Handle missing or old prices clearly.
- [ ] Keep manual prices as a fallback.

Done when: the app can update a few prices without manual input.

## Later ideas

Do not start these until Milestones 1–7 work:

- CSV portfolio import;
- more ETFs and currencies;
- several portfolios;
- more alert types;
- user accounts;
- broker connections;
- shared portfolio views;
- deployment to a server;
- testing whether people would pay for the app.
