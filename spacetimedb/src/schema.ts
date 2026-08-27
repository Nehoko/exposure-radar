import {
  type InferSchema,
  type ProcedureCtx,
  type ReducerCtx,
  schema,
  t,
  table,
} from "spacetimedb/server";

export const person = table({ public: true }, { name: t.string() });

export const asset = table({ name: "asset" }, {
  id: t.u64().primaryKey().autoInc(),
  owner: t.identity().index("btree"),
  symbol: t.string(),
  asset_type: t.string(),
  portfolio_id: t.u64().default(0n).index("btree"),
});

export const position = table({ name: "position" }, {
  id: t.u64().primaryKey().autoInc(),
  owner: t.identity().index("btree"),
  asset_id: t.u64().index("btree"),
  amount: t.f64(),
  purchase_price: t.f64(),
  portfolio_id: t.u64().default(0n).index("btree"),
});

export const price = table({ name: "price" }, {
  asset_id: t.u64().primaryKey(),
  portfolio_id: t.u64().index("btree"),
  value: t.f64(),
  updated_at: t.timestamp(),
  change: t.f64().default(0),
  source: t.string().default("manual"),
});

export const test_price_feed = table({ name: "test_price_feed" }, {
  portfolio_id: t.u64().primaryKey(),
  is_running: t.bool(),
});

export const test_price_tick = table({ name: "test_price_tick" }, {
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  portfolio_id: t.u64().unique(),
});

export const real_price_feed = table({ name: "real_price_feed" }, {
  portfolio_id: t.u64().primaryKey(),
  is_running: t.bool(),
  last_attempt_at: t.option(t.timestamp()),
  last_success_at: t.option(t.timestamp()),
  message: t.string().default(""),
});

export const real_price_tick = table({ name: "real_price_tick" }, {
  scheduled_id: t.u64().primaryKey().autoInc(),
  scheduled_at: t.scheduleAt(),
  portfolio_id: t.u64().unique(),
});

export const etf_holding = table({ name: "etf_holding", public: true }, {
  key: t.string().primaryKey(),
  etf_symbol: t.string().index("btree"),
  holding_symbol: t.string().index("btree"),
  holding_name: t.string(),
  weight: t.f64(),
});

export const portfolio = table({ name: "portfolio" }, {
  id: t.u64().primaryKey().autoInc(),
});

export const portfolio_credential = table({ name: "portfolio_credential" }, {
  token_id: t.string().primaryKey(),
  portfolio_id: t.u64().unique(),
  salt: t.string(),
  token_hash: t.string(),
});

export const portfolio_access = table({ name: "portfolio_access" }, {
  identity: t.identity().primaryKey(),
  portfolio_id: t.u64().index("btree"),
});

export const exposure_limit = table({ name: "exposure_limit" }, {
  portfolio_id: t.u64().primaryKey(),
  maximum_percentage: t.f64(),
});

export const exposure_breach = table({ name: "exposure_breach" }, {
  key: t.string().primaryKey(),
  portfolio_id: t.u64().index("btree"),
  symbol: t.string(),
  percentage: t.f64(),
});

export const exposure_warning = table({ name: "exposure_warning" }, {
  id: t.u64().primaryKey().autoInc(),
  portfolio_id: t.u64().index("btree"),
  symbol: t.string(),
  percentage: t.f64(),
  limit: t.f64(),
  exposure_value: t.f64(),
  portfolio_value: t.f64(),
  created_at: t.timestamp(),
});

const spacetimedb = schema({
  person,
  asset,
  position,
  price,
  test_price_feed,
  test_price_tick,
  real_price_feed,
  real_price_tick,
  etf_holding,
  portfolio,
  portfolio_credential,
  portfolio_access,
  exposure_limit,
  exposure_breach,
  exposure_warning,
});

export default spacetimedb;
export type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;
export type ProcCtx = ProcedureCtx<InferSchema<typeof spacetimedb>>;
