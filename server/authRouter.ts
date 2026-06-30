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
 */
async function upsertUserFromEmergent(
  data: EmergentSessionData
): Promise<{ openId: string; name: string; email: string; role: "admin" | "user" }> {
  const email = data.email?.toLowerCase().trim();
  const role: "admin" | "user" = isAdminEmail(email) ? "admin" : "user";
  // The `users` table uses `open_id` as the unique external identifier.
  // We use the Emergent id as our openId so a returning Google user always
  // matches the same row.
  const openId = `emergent:${data.id}`;
  const now = Date.now();

  const existing = await db.query.users.findFirst({
    where: eq(schema.users.openId, openId),
  });
  if (existing) {
    // Keep role + name + email fresh on every login (admin allowlist changes
    // should take effect immediately).
    await db
      .update(schema.users)
      .set({
        name: data.name || existing.name,
        email: email || existing.email,
        role,
      })
      .where(eq(schema.users.id, existing.id));
    return { openId, name: data.name || existing.name || "", email: email || existing.email || "", role };
  }

  await db.insert(schema.users).values({
    openId,
    name: data.name || null,
    email: email || null,
    role,
    createdAt: now,
  });
  return { openId, name: data.name || "", email: email || "", role };
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
 */
router.get("/me", async (req: Request, res: Response) => {
  const { jwtVerify } = await import("jose");
  const { parse: parseCookies } = await import("cookie");
  try {
    const cookieHeader = req.headers.cookie;
    if (!cookieHeader) return res.status(401).json({ error: "no cookie" });
    const cookies = parseCookies(cookieHeader);
    const token = cookies[COOKIE_NAME];
    if (!token) return res.status(401).json({ error: "no session" });
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) return res.status(500).json({ error: "jwt secret missing" });
    const { payload } = await jwtVerify(token, new TextEncoder().encode(jwtSecret));
    return res.json({
      user: {
        openId: payload.openId,
        name: payload.name,
        email: payload.email,
        role: payload.role,
      },
    });
  } catch {
    return res.status(401).json({ error: "invalid session" });
  }
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
