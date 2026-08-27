import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { ScheduleAt } from "spacetimedb";
import {
  type InferSchema,
  type ReducerCtx,
  schema,
  SenderError,
  t,
  table,
} from "spacetimedb/server";

const person = table(
  { public: true },
  { name: t.string() },
);
const asset = table(
  {
    name: "asset",
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index("btree"),
    symbol: t.string(),
    asset_type: t.string(),
    portfolio_id: t.u64().default(0n).index("btree"),
  },
);
const position = table(
  {
    name: "position",
  },
  {
    id: t.u64().primaryKey().autoInc(),
    owner: t.identity().index("btree"),
    asset_id: t.u64().index("btree"),
    amount: t.f64(),
    purchase_price: t.f64(),
    portfolio_id: t.u64().default(0n).index("btree"),
  },
);

const price = table(
  { name: "price" },
  {
    asset_id: t.u64().primaryKey(),
    portfolio_id: t.u64().index("btree"),
    value: t.f64(),
    updated_at: t.timestamp(),
    change: t.f64().default(0),
  },
);

const test_price_feed = table(
  { name: "test_price_feed" },
  {
    portfolio_id: t.u64().primaryKey(),
    is_running: t.bool(),
  },
);

const test_price_tick = table(
  { name: "test_price_tick" },
  {
    scheduled_id: t.u64().primaryKey().autoInc(),
    scheduled_at: t.scheduleAt(),
    portfolio_id: t.u64().unique(),
  },
);

const etf_holding = table(
  { name: "etf_holding", public: true },
  {
    key: t.string().primaryKey(),
    etf_symbol: t.string().index("btree"),
    holding_symbol: t.string().index("btree"),
    holding_name: t.string(),
    weight: t.f64(),
  },
);

const portfolio = table(
  { name: "portfolio" },
  { id: t.u64().primaryKey().autoInc() },
);

const portfolio_credential = table(
  { name: "portfolio_credential" },
  {
    token_id: t.string().primaryKey(),
    portfolio_id: t.u64().unique(),
    salt: t.string(),
    token_hash: t.string(),
  },
);

const portfolio_access = table(
  { name: "portfolio_access" },
  {
    identity: t.identity().primaryKey(),
    portfolio_id: t.u64().index("btree"),
  },
);

const exposure_limit = table(
  { name: "exposure_limit" },
  {
    portfolio_id: t.u64().primaryKey(),
    maximum_percentage: t.f64(),
  },
);

const exposure_breach = table(
  { name: "exposure_breach" },
  {
    key: t.string().primaryKey(),
    portfolio_id: t.u64().index("btree"),
    symbol: t.string(),
    percentage: t.f64(),
  },
);

const exposure_warning = table(
  { name: "exposure_warning" },
  {
    id: t.u64().primaryKey().autoInc(),
    portfolio_id: t.u64().index("btree"),
    symbol: t.string(),
    percentage: t.f64(),
    limit: t.f64(),
    exposure_value: t.f64(),
    portfolio_value: t.f64(),
    created_at: t.timestamp(),
  },
);

const spacetimedb = schema({
  person,
  asset,
  position,
  price,
  test_price_feed,
  test_price_tick,
  etf_holding,
  portfolio,
  portfolio_credential,
  portfolio_access,
  exposure_limit,
  exposure_breach,
  exposure_warning,
});
export default spacetimedb;

type Ctx = ReducerCtx<InferSchema<typeof spacetimedb>>;

export const myPortfolio = spacetimedb.view(
  { name: "my_portfolio", public: true },
  t.array(portfolio.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (!access) return [];

    const ownedPortfolio = ctx.db.portfolio.id.find(access.portfolio_id);
    return ownedPortfolio ? [ownedPortfolio] : [];
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

    const feed = ctx.db.test_price_feed.portfolio_id.find(
      access.portfolio_id,
    );
    return feed ? [feed] : [];
  },
);

export const myExposureLimit = spacetimedb.view(
  { name: "my_exposure_limit", public: true },
  t.array(exposure_limit.rowType),
  (ctx) => {
    const access = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (!access) return [];

    const limit = ctx.db.exposure_limit.portfolio_id.find(access.portfolio_id);
    return limit ? [limit] : [];
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

export const init = spacetimedb.init((ctx) => {
  seedSampleEtfHoldings(ctx);
});

export const onConnect = spacetimedb.clientConnected((_ctx) => {
  // Called every time a new client connects
});

export const onDisconnect = spacetimedb.clientDisconnected((_ctx) => {
  // Called every time a client disconnects
});

export const add = spacetimedb.reducer(
  { name: t.string() },
  (ctx, { name }) => {
    ctx.db.person.insert({ name });
  },
);

export const sayHello = spacetimedb.reducer((ctx) => {
  for (const person of ctx.db.person.iter()) {
    console.info(`Hello, ${person.name}!`);
  }
  console.info("Hello, World!");
});

export const loadSampleEtfHoldings = spacetimedb.reducer((ctx) => {
  seedSampleEtfHoldings(ctx);
  const access = ctx.db.portfolio_access.identity.find(ctx.sender);
  if (access) evaluateExposureWarnings(ctx, access.portfolio_id);
});

const allowedAssetTypes = new Set(["stock", "etf", "crypto"]);
const portfolioTokenPattern = /^er_([0-9a-f]{24})_([0-9a-f]{64})$/;

export const createPortfolio = spacetimedb.reducer(
  { token: t.string() },
  (ctx, { token }) => {
    if (ctx.db.portfolio_access.identity.find(ctx.sender)) {
      throw new SenderError("This device already has access to a portfolio");
    }

    const { tokenId, secret } = parsePortfolioToken(token);
    if (ctx.db.portfolio_credential.token_id.find(tokenId)) {
      throw new SenderError("Could not create the portfolio");
    }

    const salt = bytesToHex(ctx.random.fill(new Uint8Array(16)));
    const createdPortfolio = ctx.db.portfolio.insert({ id: 0n });
    ctx.db.portfolio_credential.insert({
      token_id: tokenId,
      portfolio_id: createdPortfolio.id,
      salt,
      token_hash: hashSecret(salt, secret),
    });
    ctx.db.portfolio_access.insert({
      identity: ctx.sender,
      portfolio_id: createdPortfolio.id,
    });
  },
);

export const authenticatePortfolio = spacetimedb.reducer(
  { token: t.string() },
  (ctx, { token }) => {
    const { tokenId, secret } = parsePortfolioToken(token);
    const credential = ctx.db.portfolio_credential.token_id.find(tokenId);
    if (!credential) throw new SenderError("Invalid portfolio secret");

    const calculatedHash = sha256(
      utf8ToBytes(`${credential.salt}:${secret}`),
    );
    const storedHash = hexToBytes(credential.token_hash);
    if (!equalHash(calculatedHash, storedHash)) {
      throw new SenderError("Invalid portfolio secret");
    }

    const existingAccess = ctx.db.portfolio_access.identity.find(ctx.sender);
    if (existingAccess) {
      ctx.db.portfolio_access.identity.update({
        ...existingAccess,
        portfolio_id: credential.portfolio_id,
      });
    } else {
      ctx.db.portfolio_access.insert({
        identity: ctx.sender,
        portfolio_id: credential.portfolio_id,
      });
    }
  },
);

export const logoutPortfolio = spacetimedb.reducer((ctx) => {
  ctx.db.portfolio_access.identity.delete(ctx.sender);
});

export const addPosition = spacetimedb.reducer({
  symbol: t.string(),
  assetType: t.string(),
  amount: t.f64(),
  purchasePrice: t.f64(),
}, (ctx, { symbol, assetType, amount, purchasePrice }) => {
  const portfolioId = requirePortfolioId(ctx);
  const normalizedSymbol = symbol.trim().toUpperCase();
  const normalizedType = assetType.trim().toLowerCase();

  if (normalizedSymbol.length === 0) {
    throw new Error("Symbol is required");
  }
  if (!allowedAssetTypes.has(normalizedType)) {
    throw new Error("Asset type must be stock, ETF, or crypto");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be greater than zero");
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    throw new Error("Purchase price cannot be negative");
  }

  let ownedAsset = [...ctx.db.asset.portfolio_id.filter(portfolioId)].find((
    row,
  ) =>
    row.symbol === normalizedSymbol &&
    row.asset_type === normalizedType
  );

  if (!ownedAsset) {
    ownedAsset = ctx.db.asset.insert({
      id: 0n,
      owner: ctx.sender,
      symbol: normalizedSymbol,
      asset_type: normalizedType,
      portfolio_id: portfolioId,
    });
  }
  ctx.db.position.insert({
    id: 0n,
    owner: ctx.sender,
    asset_id: ownedAsset.id,
    purchase_price: purchasePrice,
    amount,
    portfolio_id: portfolioId,
  });
  evaluateExposureWarnings(ctx, portfolioId);
});

export const removePosition = spacetimedb.reducer(
  {
    positionId: t.u64(),
  },
  (ctx, { positionId }) => {
    const portfolioId = requirePortfolioId(ctx);
    const position = ctx.db.position.id.find(positionId);
    if (!position) {
      throw new SenderError("Position not found");
    }
    if (position.portfolio_id !== portfolioId) {
      throw new SenderError("You cannot remove this position");
    }
    ctx.db.position.id.delete(positionId);
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

export const setPrice = spacetimedb.reducer(
  {
    assetId: t.u64(),
    value: t.f64(),
  },
  (ctx, { assetId, value }) => {
    const portfolioId = requirePortfolioId(ctx);
    if (!Number.isFinite(value) || value < 0) {
      throw new SenderError("Price cannot be negative");
    }

    const asset = ctx.db.asset.id.find(assetId);
    if (!asset || asset.portfolio_id !== portfolioId) {
      throw new SenderError("Asset not found");
    }

    const existingPrice = ctx.db.price.asset_id.find(assetId);
    const nextPrice = {
      asset_id: assetId,
      portfolio_id: portfolioId,
      value,
      updated_at: ctx.timestamp,
      change: existingPrice ? value - existingPrice.value : 0,
    };

    if (existingPrice) {
      ctx.db.price.asset_id.update(nextPrice);
    } else {
      ctx.db.price.insert(nextPrice);
    }
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

export const setExposureLimit = spacetimedb.reducer(
  { maximumPercentage: t.f64() },
  (ctx, { maximumPercentage }) => {
    const portfolioId = requirePortfolioId(ctx);
    if (
      !Number.isFinite(maximumPercentage) ||
      maximumPercentage < 1 ||
      maximumPercentage > 100
    ) {
      throw new SenderError("Exposure limit must be between 1% and 100%");
    }

    const existing = ctx.db.exposure_limit.portfolio_id.find(portfolioId);
    const next = {
      portfolio_id: portfolioId,
      maximum_percentage: maximumPercentage,
    };
    if (existing) {
      ctx.db.exposure_limit.portfolio_id.update(next);
    } else {
      ctx.db.exposure_limit.insert(next);
    }
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

export const startTestPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  const feed = ctx.db.test_price_feed.portfolio_id.find(portfolioId);

  if (feed) {
    ctx.db.test_price_feed.portfolio_id.update({
      ...feed,
      is_running: true,
    });
  } else {
    ctx.db.test_price_feed.insert({
      portfolio_id: portfolioId,
      is_running: true,
    });
  }

  if (!ctx.db.test_price_tick.portfolio_id.find(portfolioId)) {
    ctx.db.test_price_tick.insert({
      scheduled_id: 0n,
      scheduled_at: ScheduleAt.interval(5_000_000n),
      portfolio_id: portfolioId,
    });
  }

  updatePortfolioTestPrices(ctx, portfolioId);
});

export const stopTestPrices = spacetimedb.reducer((ctx) => {
  const portfolioId = requirePortfolioId(ctx);
  const feed = ctx.db.test_price_feed.portfolio_id.find(portfolioId);

  if (feed) {
    ctx.db.test_price_feed.portfolio_id.update({
      ...feed,
      is_running: false,
    });
  } else {
    ctx.db.test_price_feed.insert({
      portfolio_id: portfolioId,
      is_running: false,
    });
  }

  ctx.db.test_price_tick.portfolio_id.delete(portfolioId);
});

export const updateTestPrices = spacetimedb.reducer(
  { onSchedule: test_price_tick },
  { tick: test_price_tick.rowType },
  (ctx, { tick }) => {
    const feed = ctx.db.test_price_feed.portfolio_id.find(tick.portfolio_id);
    if (!feed?.is_running) return;

    updatePortfolioTestPrices(ctx, tick.portfolio_id);
  },
);

function updatePortfolioTestPrices(ctx: Ctx, portfolioId: bigint): void {
  for (const asset of ctx.db.asset.portfolio_id.filter(portfolioId)) {
    const firstPosition =
      ctx.db.position.asset_id.filter(asset.id).next().value;
    if (!firstPosition) continue;

    const existingPrice = ctx.db.price.asset_id.find(asset.id);
    const previousValue = existingPrice?.value ??
      Math.max(firstPosition.purchase_price, 0.01);
    const movement = ctx.random.integerInRange(-100, 100) / 10_000;
    const nextValue = Math.max(
      0.01,
      Math.round(previousValue * (1 + movement) * 10_000) / 10_000,
    );
    const nextPrice = {
      asset_id: asset.id,
      portfolio_id: portfolioId,
      value: nextValue,
      updated_at: ctx.timestamp,
      change: nextValue - previousValue,
    };

    if (existingPrice) {
      ctx.db.price.asset_id.update(nextPrice);
    } else {
      ctx.db.price.insert(nextPrice);
    }
  }
  evaluateExposureWarnings(ctx, portfolioId);
}

const sampleEtfHoldings = [
  ["VOO", "NVDA", "NVIDIA", 8.0],
  ["VOO", "AAPL", "Apple", 7.0],
  ["VOO", "MSFT", "Microsoft", 6.2],
  ["VOO", "AMZN", "Amazon", 3.8],
  ["VOO", "META", "Meta Platforms", 2.6],
  ["QQQ", "NVDA", "NVIDIA", 9.2],
  ["QQQ", "MSFT", "Microsoft", 8.0],
  ["QQQ", "AAPL", "Apple", 7.5],
  ["QQQ", "AMZN", "Amazon", 5.4],
  ["QQQ", "AVGO", "Broadcom", 4.8],
  ["VWCE", "NVDA", "NVIDIA", 4.5],
  ["VWCE", "AAPL", "Apple", 4.2],
  ["VWCE", "MSFT", "Microsoft", 3.7],
  ["VWCE", "AMZN", "Amazon", 2.3],
  ["VWCE", "META", "Meta Platforms", 1.6],
] as const;

function seedSampleEtfHoldings(ctx: Ctx): void {
  for (
    const [etfSymbol, holdingSymbol, holdingName, weight] of sampleEtfHoldings
  ) {
    const key = `${etfSymbol}:${holdingSymbol}`;
    if (ctx.db.etf_holding.key.find(key)) continue;

    ctx.db.etf_holding.insert({
      key,
      etf_symbol: etfSymbol,
      holding_symbol: holdingSymbol,
      holding_name: holdingName,
      weight,
    });
  }
}

interface CompanyExposureValue {
  symbol: string;
  value: number;
}

function calculateCompanyExposures(
  ctx: Ctx,
  portfolioId: bigint,
): { portfolioValue: number; exposures: CompanyExposureValue[] } {
  const exposureBySymbol = new Map<string, number>();
  let portfolioValue = 0;

  for (const position of ctx.db.position.portfolio_id.filter(portfolioId)) {
    const asset = ctx.db.asset.id.find(position.asset_id);
    const currentPrice = ctx.db.price.asset_id.find(position.asset_id);
    if (!asset || !currentPrice) continue;

    const value = position.amount * currentPrice.value;
    portfolioValue += value;

    if (asset.asset_type === "stock") {
      addCompanyExposure(exposureBySymbol, asset.symbol, value);
      continue;
    }
    if (asset.asset_type !== "etf") continue;

    for (
      const holding of ctx.db.etf_holding.etf_symbol.filter(
        asset.symbol.toUpperCase(),
      )
    ) {
      addCompanyExposure(
        exposureBySymbol,
        holding.holding_symbol,
        value * holding.weight / 100,
      );
    }
  }

  return {
    portfolioValue,
    exposures: [...exposureBySymbol].map(([symbol, value]) => ({
      symbol,
      value,
    })),
  };
}

function addCompanyExposure(
  exposures: Map<string, number>,
  rawSymbol: string,
  value: number,
): void {
  const symbol = rawSymbol.toUpperCase();
  exposures.set(symbol, (exposures.get(symbol) ?? 0) + value);
}

function evaluateExposureWarnings(ctx: Ctx, portfolioId: bigint): void {
  const setting = ctx.db.exposure_limit.portfolio_id.find(portfolioId);
  if (!setting) return;

  const { portfolioValue, exposures } = calculateCompanyExposures(
    ctx,
    portfolioId,
  );
  const currentBreaches = new Set<string>();

  for (const exposure of exposures) {
    const percentage = portfolioValue > 0
      ? exposure.value / portfolioValue * 100
      : 0;
    if (percentage <= setting.maximum_percentage) continue;

    const key = `${portfolioId}:${exposure.symbol}`;
    currentBreaches.add(key);
    const existing = ctx.db.exposure_breach.key.find(key);
    if (!existing) {
      ctx.db.exposure_warning.insert({
        id: 0n,
        portfolio_id: portfolioId,
        symbol: exposure.symbol,
        percentage,
        limit: setting.maximum_percentage,
        exposure_value: exposure.value,
        portfolio_value: portfolioValue,
        created_at: ctx.timestamp,
      });
      ctx.db.exposure_breach.insert({
        key,
        portfolio_id: portfolioId,
        symbol: exposure.symbol,
        percentage,
      });
    } else {
      ctx.db.exposure_breach.key.update({ ...existing, percentage });
    }
  }

  for (const breach of ctx.db.exposure_breach.portfolio_id.filter(portfolioId)) {
    if (!currentBreaches.has(breach.key)) {
      ctx.db.exposure_breach.key.delete(breach.key);
    }
  }
  trimWarningHistory(ctx, portfolioId);
}

function trimWarningHistory(ctx: Ctx, portfolioId: bigint): void {
  const warnings = [
    ...ctx.db.exposure_warning.portfolio_id.filter(portfolioId),
  ].sort((left, right) => {
    const leftTime = left.created_at.microsSinceUnixEpoch;
    const rightTime = right.created_at.microsSinceUnixEpoch;
    return leftTime < rightTime ? -1 : leftTime > rightTime ? 1 : 0;
  });

  for (const warning of warnings.slice(0, Math.max(0, warnings.length - 20))) {
    ctx.db.exposure_warning.id.delete(warning.id);
  }
}

function requirePortfolioId(ctx: Ctx): bigint {
  const access = ctx.db.portfolio_access.identity.find(ctx.sender);
  if (!access) throw new SenderError("Enter a portfolio secret first");
  return access.portfolio_id;
}

function parsePortfolioToken(token: string): {
  tokenId: string;
  secret: string;
} {
  const match = portfolioTokenPattern.exec(token.trim().toLowerCase());
  if (!match) throw new SenderError("Invalid portfolio secret");
  return { tokenId: match[1], secret: match[2] };
}

function hashSecret(salt: string, secret: string): string {
  return bytesToHex(sha256(utf8ToBytes(`${salt}:${secret}`)));
}

function equalHash(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;

  let difference = 0;
  for (let index = 0; index < left.length; index++) {
    difference |= left[index] ^ right[index];
  }
  return difference === 0;
}
