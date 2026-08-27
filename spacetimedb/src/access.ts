import { SenderError } from "spacetimedb/server";
import type { Ctx } from "./schema";

export function requirePortfolioId(ctx: Ctx): bigint {
  const access = ctx.db.portfolio_access.identity.find(ctx.sender);
  if (!access) throw new SenderError("Enter a portfolio secret first");
  return access.portfolio_id;
}
