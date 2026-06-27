import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { Request, Response } from "express";
import { jwtVerify } from "jose";
import { parse as parseCookies } from "cookie";
import { COOKIE_NAME } from "../shared/const.js";

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

// DEV BYPASS: When not in production, if no authenticated user is present,
// inject the seed owner account so all features are testable without login.
// This bypass is DISABLED in production (NODE_ENV=production).
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
  // DEV BYPASS: in non-production, if no real session cookie was presented,
  // inject the seed owner so `ctx.user` is populated on EVERY procedure
  // (including public ones like `freeRun.authCheck`). This makes the browser
  // UI behave as if logged in, with zero auth wiring needed during dev.
  const isProduction = process.env.NODE_ENV === "production";
  const user = cookieUser ?? (isProduction ? null : DEV_BYPASS_USER);
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
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "OWNER_OPEN_ID not configured",
    });
  }
  if (!ctx.user || ctx.user.openId !== ownerOpenId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Owner access required" });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});
