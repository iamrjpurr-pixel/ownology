import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const.js";
import { upsertUser } from "./db.js";

// --- Context ------------------------------------------------------------------
export type User = {
  openId: string;
  name?: string;
  email?: string;
  role: "admin" | "user";
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
    };
  } catch {
    return null;
  }
}

// AUTH BYPASS: Auth is currently disabled site-wide. Every request is treated
// as the seed owner account so all features work without login.
// To re-enable real auth, restore the NODE_ENV check below.
const DEV_BYPASS_USER: User = {
  openId: "seed-owner-001",
  name: "Redstone Ridge Wines",
  email: "cellar@redstoneridge.com.au",
  role: "admin",
};

export async function createContext({
  req,
  res,
}: {
  req: Request;
  res: Response;
}): Promise<Context> {
  const cookieUser = await getUserFromCookie(req);
  // AUTH BYPASS: always inject the seed owner if no real session cookie present.
  // This makes the entire app accessible without login (production + dev).
  const user = cookieUser ?? DEV_BYPASS_USER;
  // Ensure the bypass user exists in the DB so protected routes (which call
  // getUserByOpenId) don't fail. Best-effort; ignore errors.
  if (user === DEV_BYPASS_USER) {
    upsertUser(user.openId, user.name, user.email).catch(() => {});
  }
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
