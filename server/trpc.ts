import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const.js";
import { upsertUser, db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { isRuntimeBypassActive } from "./devBypassRuntime.js";

// --- Context ------------------------------------------------------------------
export type User = {
  openId: string;
  name?: string;
  email?: string;
  role: "admin" | "user";
  // Multi-tenant container — Phase 2 (Feb 2026). Null only for legacy rows
  // not yet backfilled or users created before the bootstrap migration ran.
  // wineryProcedure asserts non-null before allowing the procedure to run.
  wineryId: number | null;
  // DB user id (users.id). Cached on context so procedures don't repeat the
  // openId → id lookup that nearly every customer-domain procedure needs.
  userId: number | null;
};

export type Context = {
  req: Request;
  res: Response;
  user: User | null;
};

/**
 * Parse and verify the app_session_id JWT cookie.
 * The Manus platform sets this cookie via postMessage (manus-runtime.js).
 * The JWT is signed with JWT_SECRET (HMAC-SHA256) and contains user identity.
 */
async function getUserFromCookie(req: Request): Promise<User | null> {
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return null;
    const cookies = parseCookies(cookieHeader);
    const sessionToken = cookies[COOKIE_NAME];
    if (!sessionToken) return null;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return null;
    // jose 6.x accepts Uint8Array directly for HMAC secrets
    const secretBytes = new TextEncoder().encode(jwtSecret);
    const { payload } = await jwtVerify(sessionToken, secretBytes);
    const openId =
      (payload.openId as string) ||
      (payload.sub as string) ||
      (payload.userId as string);
    if (!openId) return null;
    return {
      openId,
      name: (payload.name as string) || undefined,
      email: (payload.email as string) || undefined,
      role: (payload.role as "admin" | "user") || "user",
      wineryId: null,
      userId: null,
    };
  } catch {
    return null;
  }
}

/**
 * Resolve the user's winery_id + DB id from the users table. Cheap single
 * query keyed on the indexed open_id column; called once per request.
 * Best-effort: failure leaves both fields null and the procedure decides.
 */
async function hydrateMembership(user: User): Promise<User> {
  try {
    const row = await db.query.users.findFirst({
      where: eq(schema.users.openId, user.openId),
      columns: { id: true, wineryId: true },
    });
    if (row) {
      return { ...user, userId: row.id, wineryId: row.wineryId ?? null };
    }
  } catch {
    // DB hiccup — leave fields null, procedures will fall back to lookup.
  }
  return user;
}

// Dev-bypass — auto-injects the seed owner when either the env-var says so
// OR an admin has flipped the runtime override on via /admin/dev-mode. This
// mirrors authRouter::isDevBypassActive and server/index.ts::isDevBypassActive
// so all three surfaces (auth /me endpoint, tRPC context, admin gate) stay
// in lockstep. When both env AND runtime say off, tRPC returns ctx.user=null
// and any protectedProcedure throws UNAUTHORIZED.
function isDevBypassActive(): boolean {
  if (isRuntimeBypassActive()) return true;
  if (process.env.ENABLE_DEV_BYPASS === "false") return false;
  if (process.env.NODE_ENV === "production" &&
      process.env.ENABLE_DEV_BYPASS !== "true") return false;
  return true;
}

const DEV_BYPASS_USER: User = {
  openId: "seed-owner-001",
  name: "Redstone Ridge Wines",
  email: "cellar@redstoneridge.com.au",
  role: "admin",
  wineryId: null,
  userId: null,
};

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  const cookieUser = await getUserFromCookie(req);
  // Real cookie wins first. When no cookie, only fall back to the seed owner
  // if the dev-bypass is active (env var OR runtime override). Otherwise
  // leave user null so protectedProcedure/ownerProcedure gate correctly.
  let baseUser: User | null = cookieUser;
  if (!baseUser && isDevBypassActive()) {
    baseUser = DEV_BYPASS_USER;
    // Ensure the seed user exists in the DB so downstream getUserByOpenId
    // lookups don't fail. Best-effort; ignore errors.
    await upsertUser(DEV_BYPASS_USER.openId, DEV_BYPASS_USER.name, DEV_BYPASS_USER.email).catch(() => {});
  }
  // Hydrate the winery membership + DB user id. Cheap indexed lookup.
  const user = baseUser ? await hydrateMembership(baseUser) : null;
  return { req, res, user };
}

// --- tRPC init ----------------------------------------------------------------
const t = initTRPC.context<Context>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const ownerProcedure = t.procedure.use(({ ctx, next }) => {
  // AUTH BYPASS: allow any admin-role user (the bypass user has role: "admin"),
  // or fall back to the OWNER_OPEN_ID env check for real cookie-authenticated users.
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  const isOwnerByEnv = ownerOpenId && ctx.user.openId === ownerOpenId;
  const isOwnerByRole = ctx.user.role === "admin";
  if (!isOwnerByEnv && !isOwnerByRole) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

/**
 * wineryProcedure — like protectedProcedure but asserts the user has been
 * assigned to a winery (winery_id is non-null). Use this for any procedure
 * that reads or writes customer-domain data (vintage logs, batches, barrels,
 * cellar tasks, etc). The narrowed `ctx.wineryId` and `ctx.userId` are
 * available to the resolver as plain numbers.
 *
 * Multi-tenant Phase 2 (Feb 2026): the bootstrap backfills NULL winery_id
 * for legacy users to the Default Winery, and authRouter auto-provisions
 * a fresh winery for every new sign-up. So this guard should never fire
 * in practice — it's defence-in-depth to catch a regression that bypassed
 * the bootstrap.
 */
export const wineryProcedure = t.procedure.use(({ ctx, next }) => {
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Please login (10001)" });
  }
  const { wineryId, userId } = ctx.user;
  if (wineryId === null || userId === null) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No winery membership — contact support if this persists",
    });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
      wineryId,
      userId,
    },
  });
});
