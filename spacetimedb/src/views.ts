import { t } from "spacetimedb/server";
import spacetimedb, {
  asset,
  exposure_limit,
  exposure_warning,
  portfolio,
  position,
  price,
  test_price_feed,
} from "./schema";

export const myPortfolio = spacetimedb.view(
  { name: "my_portfolio", public: true },
  t.array(portfolio.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (!access) return [];
    const row = ctx.db.portfolio.id.find(access.portfolio_id);
    return row ? [row] : [];
  },
);

export const myAssets = spacetimedb.view(
  { name: "my_assets", public: true },
  t.array(asset.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    return access
      ? [...ctx.db.asset.portfolio_id.filter(access.portfolio_id)]
      : [];
  },
);

export const myPositions = spacetimedb.view(
  { name: "my_positions", public: true },
  t.array(position.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    return access
      ? [...ctx.db.position.portfolio_id.filter(access.portfolio_id)]
      : [];
  },
);

export const myPrices = spacetimedb.view(
  { name: "my_prices", public: true },
  t.array(price.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    return access
      ? [...ctx.db.price.portfolio_id.filter(access.portfolio_id)]
      : [];
  },
);

export const myTestPriceFeed = spacetimedb.view(
  { name: "my_test_price_feed", public: true },
  t.array(test_price_feed.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (!access) return [];
    const row = ctx.db.test_price_feed.portfolio_id.find(access.portfolio_id);
    return row ? [row] : [];
  },
);

export const myExposureLimit = spacetimedb.view(
  { name: "my_exposure_limit", public: true },
  t.array(exposure_limit.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (!access) return [];
    const row = ctx.db.exposure_limit.portfolio_id.find(access.portfolio_id);
    return row ? [row] : [];
  },
);

export const myExposureWarnings = spacetimedb.view(
  { name: "my_exposure_warnings", public: true },
  t.array(exposure_warning.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    return access
      ? [...ctx.db.exposure_warning.portfolio_id.filter(access.portfolio_id)]
      : [];
  },
);
