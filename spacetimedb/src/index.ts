import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
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

const spacetimedb = schema({
  person,
  asset,
  position,
  price,
  portfolio,
  portfolio_credential,
  portfolio_access,
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

export const init = spacetimedb.init((_ctx) => {
  // Called when the module is initially published
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
    };

    if (existingPrice) {
      ctx.db.price.asset_id.update(nextPrice);
    } else {
      ctx.db.price.insert(nextPrice);
    }
  },
);

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
