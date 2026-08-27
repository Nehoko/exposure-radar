import { sha256 } from "@noble/hashes/sha2.js";
import { bytesToHex, hexToBytes, utf8ToBytes } from "@noble/hashes/utils.js";
import { SenderError, t } from "spacetimedb/server";
import { requirePortfolioId } from "./access";
import { evaluateExposureWarnings } from "./exposure";
import spacetimedb from "./schema";

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
    const created = ctx.db.portfolio.insert({ id: 0n });
    ctx.db.portfolio_credential.insert({
      token_id: tokenId,
      portfolio_id: created.id,
      salt,
      token_hash: hashSecret(salt, secret),
    });
    ctx.db.portfolio_access.insert({
      identity: ctx.sender,
      portfolio_id: created.id,
    });
  },
);

export const authenticatePortfolio = spacetimedb.reducer(
  { token: t.string() },
  (ctx, { token }) => {
    const { tokenId, secret } = parsePortfolioToken(token);
    const credential = ctx.db.portfolio_credential.token_id.find(tokenId);
    if (!credential) throw new SenderError("Invalid portfolio secret");

    const calculatedHash = sha256(utf8ToBytes(`${credential.salt}:${secret}`));
    const storedHash = hexToBytes(credential.token_hash);
    if (!equalHash(calculatedHash, storedHash)) {
      throw new SenderError("Invalid portfolio secret");
    }

    const existing = ctx.db.portfolio_access.identity.find(ctx.sender);
    const access = {
      identity: ctx.sender,
      portfolio_id: credential.portfolio_id,
    };
    if (existing) ctx.db.portfolio_access.identity.update(access);
    else ctx.db.portfolio_access.insert(access);
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
  if (!normalizedSymbol) throw new SenderError("Symbol is required");
  if (!allowedAssetTypes.has(normalizedType)) {
    throw new SenderError("Asset type must be stock, ETF, or crypto");
  }
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new SenderError("Amount must be greater than zero");
  }
  if (!Number.isFinite(purchasePrice) || purchasePrice < 0) {
    throw new SenderError("Purchase price cannot be negative");
  }

  let ownedAsset = [...ctx.db.asset.portfolio_id.filter(portfolioId)].find(
    (row) =>
      row.symbol === normalizedSymbol && row.asset_type === normalizedType,
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
  { positionId: t.u64() },
  (ctx, { positionId }) => {
    const portfolioId = requirePortfolioId(ctx);
    const row = ctx.db.position.id.find(positionId);
    if (!row) throw new SenderError("Position not found");
    if (row.portfolio_id !== portfolioId) {
      throw new SenderError("You cannot remove this position");
    }
    ctx.db.position.id.delete(positionId);
    evaluateExposureWarnings(ctx, portfolioId);
  },
);

function parsePortfolioToken(
  token: string,
): { tokenId: string; secret: string } {
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
