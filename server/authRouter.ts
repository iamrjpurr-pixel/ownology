/**
 * authRouter.ts — Emergent-managed Google OAuth, adapted for Express + MySQL.
 *
 * REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH.
 *
 * Flow:
 *   1. Frontend Login button →
 *        window.location.href = https://auth.emergentagent.com/?redirect=${origin}/auth/callback
 *   2. Emergent redirects back to /auth/callback#session_id=<token>
 *   3. Frontend POSTs { session_id } to /api/auth/exchange
 *   4. We call demobackend.emergentagent.com/auth/v1/env/oauth/session-data to
 *      verify, upsert the user in MySQL by email, sign a JWT (HS256) and set
 *      `app_session_id` httpOnly cookie. JWT payload shape:
 *        { openId, name, email, role }
 *      — UNCHANGED from the legacy Manus session so every existing
 *      protectedProcedure / ownerProcedure keeps working.
 *
 * Admins: any user whose email matches a comma-separated entry in
 * ADMIN_EMAILS env is granted role="admin". Falls back to "user".
 */
import express from "express";
import type { Request, Response } from "express";
import { SignJWT } from "jose";
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { eq } from "drizzle-orm";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const.js";

const EMERGENT_SESSION_DATA_URL =
  "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data";

const SESSION_TTL_DAYS = 7;
const SESSION_TTL_MS = SESSION_TTL_DAYS * 24 * 60 * 60 * 1000;

type EmergentSessionData = {
  id: string;
  email: string;
  name: string;
  picture?: string;
  session_token: string;
};

function isAdminEmail(email: string | undefined | null): boolean {
  if (!email) return false;
  const list = (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return list.includes(email.toLowerCase());
}

async function signSessionJwt(payload: {
  openId: string;
  name?: string | null;
  email?: string | null;
  role: "admin" | "user";
}): Promise<string> {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) throw new Error("JWT_SECRET missing");
  const secretBytes = new TextEncoder().encode(jwtSecret);
  return new SignJWT({
    openId: payload.openId,
    name: payload.name ?? undefined,
    email: payload.email ?? undefined,
    role: payload.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_DAYS}d`)
    .sign(secretBytes);
}

function setSessionCookie(res: Response, jwt: string) {
  // Cross-origin friendly: secure + SameSite=None so iframe previews work.
  // Browsers require Secure when SameSite=None.
  const isHttps = (process.env.PUBLIC_SITE_URL || "").startsWith("https://") ||
    process.env.NODE_ENV === "production";
  res.cookie(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
    maxAge: SESSION_TTL_MS,
  });
}

function clearSessionCookie(res: Response) {
  const isHttps = (process.env.PUBLIC_SITE_URL || "").startsWith("https://") ||
    process.env.NODE_ENV === "production";
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isHttps,
    sameSite: isHttps ? "none" : "lax",
    path: "/",
  });
}

/**
 * Upsert a winemaker into the users table keyed by email (Emergent's id is
 * a Google identifier but emails are the stable join key for our existing
 * lead/founding-member tables). When email is missing for whatever reason
 * we fall back to the Emergent id.
 *
 * Multi-tenant (Phase 1): every NEW user also gets a freshly-provisioned
 * Winery row, named after them (e.g. "Sarah's Winery"). They become its
 * owner. Returning users keep their existing winery_id untouched.
 */
async function upsertUserFromEmergent(
  data: EmergentSessionData
): Promise<{ openId: string; name: string; email: string; role: "admin" | "user"; isNew: boolean }> {
  const email = data.email?.toLowerCase().trim();
  const role: "admin" | "user" = isAdminEmail(email) ? "admin" : "user";
  const openId = `emergent:${data.id}`;
  const now = Date.now();

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.openId, openId),
  });
  if (existing) {
    await db
      .update(schema.users)
      .set({
        name: data.name || existing.name,
        email: email || existing.email,
        role,
      })
      .where(eq(schema.users.id, existing.id));
    return { openId, name: data.name || existing.name || "", email: email || existing.email || "", role, isNew: false };
  }

  // Brand-new user — create the row, then provision their Winery.
  const inserted = await db.insert(schema.users).values({
    openId,
    name: data.name || null,
    email: email || null,
    role,
    createdAt: now,
  });
  // Drizzle for MySQL returns `[ResultSetHeader, ...]` from execute()s but
  // .insert() returns a less-typed shape — re-query by openId to get the
  // canonical id back so we always have a stable handle for the winery
  // owner_user_id FK.
  const justCreated = await db.query.users.findFirst({
    where: eq(schema.users.openId, openId),
  });
  if (justCreated?.id) {
    const wineryName = (data.name || email || "My").split(/\s+/)[0] + "'s Winery";
    const baseSlug = (data.name || email || "winery")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 48) || "winery";
    // Slug uniqueness — append a short suffix if collision.
    const suffix = Math.random().toString(36).slice(2, 6);
    const slug = `${baseSlug}-${suffix}`;
    try {
      await db.insert(schema.wineries).values({
        name: wineryName,
        slug,
        ownerUserId: justCreated.id,
        plan: "free",
        createdAt: now,
      });
      const newWinery = await db.query.wineries.findFirst({
        where: eq(schema.wineries.slug, slug),
      });
      if (newWinery?.id) {
        await db
          .update(schema.users)
          .set({ wineryId: newWinery.id })
          .where(eq(schema.users.id, justCreated.id));
      }
    } catch (e) {
      // Winery table may not exist yet on a very fresh DB before bootstrap.
      // Auth still succeeds — user just lands in legacy shared mode until
      // next boot runs the bootstrap.
      console.warn("[auth] winery provisioning skipped:", (e as Error).message);
    }
  }
  return { openId, name: data.name || "", email: email || "", role, isNew: true };
}

const router = express.Router();

/**
 * POST /api/auth/exchange
 * Body: { session_id: string }
 *
 * Trades a one-time Emergent session_id for a long-lived signed JWT cookie.
 */
router.post("/exchange", express.json(), async (req: Request, res: Response) => {
  const sessionId = typeof req.body?.session_id === "string" ? req.body.session_id : "";
  if (!sessionId) {
    return res.status(400).json({ error: "session_id required" });
  }
  try {
    const upstream = await fetch(EMERGENT_SESSION_DATA_URL, {
      method: "GET",
      headers: { "X-Session-ID": sessionId },
    });
    if (!upstream.ok) {
      return res
        .status(401)
        .json({ error: `Emergent rejected session_id (${upstream.status})` });
    }
    const data = (await upstream.json()) as EmergentSessionData;
    if (!data?.id) {
      return res.status(500).json({ error: "Emergent returned no user id" });
    }

    const user = await upsertUserFromEmergent(data);
    const jwt = await signSessionJwt(user);
    setSessionCookie(res, jwt);
    return res.json({
      user: {
        openId: user.openId,
        name: user.name,
        email: user.email,
        role: user.role,
        picture: data.picture || null,
      },
      isNew: user.isNew,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    const stack = err instanceof Error ? err.stack : undefined;
    console.error("[auth/exchange] failed:", msg, stack);
    return res.status(500).json({ error: "session exchange failed", detail: msg });
  }
});

/**
 * GET /api/auth/me
 * Verifies the existing `app_session_id` cookie and returns the user. The
 * cookie verification reuses the same logic as tRPC's getUserFromCookie so
 * this endpoint stays the single source of truth on the frontend.
 *
 * Dev-bypass: when ENABLE_DEV_BYPASS is on (or NODE_ENV !== production
 * without explicit "false"), and no real cookie is present, return the
 * seed admin user. Mirrors the tRPC bypass so the client AuthProvider
 * sees a consistent identity in preview and dev.
 */
function isDevBypassActive(): boolean {
  if (process.env.ENABLE_DEV_BYPASS === "false") return false;
  if (process.env.NODE_ENV === "production" &&
      process.env.ENABLE_DEV_BYPASS !== "true") return false;
  return true;
}

router.get("/me", async (req: Request, res: Response) => {
  const { jwtVerify } = await import("jose");
  const { parse: parseCookies } = await import("cookie");
  // 1. Try the real cookie first.
  try {
    const cookieHeader = req.headers.cookie;
    if (cookieHeader) {
      const cookies = parseCookies(cookieHeader);
      const token = cookies[COOKIE_NAME];
      const jwtSecret = process.env.JWT_SECRET;
      if (token && jwtSecret) {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
        return res.json({
          user: {
            openId: payload.openId,
            name: payload.name,
            email: payload.email,
            role: payload.role,
          },
        });
      }
    }
  } catch { /* fall through to dev-bypass / 401 */ }

  // 2. Dev-bypass: surface the seed admin so the client AuthProvider has a
  //    user to show in preview environments.
  if (isDevBypassActive()) {
    return res.json({
      user: {
        openId: process.env.OWNER_OPEN_ID || "seed-owner-001",
        name: process.env.OWNER_NAME || "Redstone Ridge Wines",
        email: "cellar@redstoneridge.com.au",
        role: "admin",
      },
    });
  }

  return res.status(401).json({ error: "no session" });
});

/**
 * POST /api/auth/logout
 * Clears the session cookie. (We don't keep server-side session state — the
 * JWT carries everything — so this is a pure cookie-clear.)
 */
router.post("/logout", (_req: Request, res: Response) => {
  clearSessionCookie(res);
  return res.json({ ok: true });
});

// Keep ONE_YEAR_MS reachable to prevent unused-import warnings while leaving
// it available if future code wants a long-lived "remember me" cookie.
void ONE_YEAR_MS;

export default router;
