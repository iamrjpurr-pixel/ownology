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
import { isRuntimeBypassActive } from "./devBypassRuntime.js";

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
 * POST /api/auth/magic-link/request
 * Body: { email: string }
 *
 * Passwordless login for winemakers without a Google account. Generates a
 * one-time token, hashes it (SHA-256) into `magic_login_tokens`, emails the
 * plaintext to the user via Resend. Rate limit: 3 sends per email per hour.
 * Rejects unknown emails to avoid accidental account provisioning (users
 * must be created first via Google OAuth or admin seed).
 *
 * Jul 2026 addition — sits alongside Google OAuth, not replacing it.
 */
const MAGIC_LINK_TTL_MS = 15 * 60 * 1000; // 15 minutes
const MAGIC_LINK_RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAGIC_LINK_RATE_MAX = 3;

router.post("/magic-link/request", express.json(), async (req: Request, res: Response) => {
  const emailRaw = typeof req.body?.email === "string" ? req.body.email : "";
  const email = emailRaw.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }
  try {
    // Reject unknown emails — don't auto-provision accounts via this path.
    const user = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });
    if (!user) {
      // Intentionally return 200 with the same message shape so we don't
      // leak which emails have accounts (enumeration protection). The email
      // just never arrives.
      return res.json({ ok: true, sent: true });
    }

    // Rate-limit: count sends for this email in the last hour.
    const { sql, gte, and } = await import("drizzle-orm");
    const cutoff = Date.now() - MAGIC_LINK_RATE_WINDOW_MS;
    const recent = await db
      .select({ count: sql<number>`count(*)` })
      .from(schema.magicLoginTokens)
      .where(and(
        eq(schema.magicLoginTokens.email, email),
        gte(schema.magicLoginTokens.createdAt, cutoff),
      ));
    const recentCount = Number(recent[0]?.count ?? 0);
    if (recentCount >= MAGIC_LINK_RATE_MAX) {
      return res.status(429).json({
        error: "Too many login links requested. Try again in an hour.",
      });
    }

    // Generate token — 32 random bytes → hex. Store SHA-256 hash only.
    const { randomBytes, createHash } = await import("node:crypto");
    const tokenPlaintext = randomBytes(32).toString("hex");
    const tokenHash = createHash("sha256").update(tokenPlaintext).digest("hex");
    const now = Date.now();
    const expiresAt = now + MAGIC_LINK_TTL_MS;
    const clientIp = (req.headers["x-forwarded-for"] as string)?.split(",")[0]?.trim()
      || req.socket.remoteAddress
      || null;

    await db.insert(schema.magicLoginTokens).values({
      tokenHash,
      email,
      userId: user.id,
      expiresAt,
      consumedAt: null,
      createdAt: now,
      requestIp: clientIp?.slice(0, 63) ?? null,
    });

    // Build the callback URL. PUBLIC_SITE_URL wins in prod; falls back to
    // the request's own origin so preview environments work without config.
    const siteUrl = process.env.PUBLIC_SITE_URL
      || `${req.protocol}://${req.get("host")}`;
    const magicUrl = `${siteUrl}/api/auth/magic-link/verify?token=${tokenPlaintext}`;

    // Send via Resend. Non-blocking on failure — we still return 200 to the
    // client so a Resend hiccup doesn't leak "this email doesn't exist" via
    // a differential error message.
    const resendKey = process.env.RESEND_API_KEY;
    const fromEmail = process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev";
    if (resendKey) {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      const displayName = user.name || email.split("@")[0];
      const html = `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <tr><td style="padding:32px 32px 8px;border-top:6px solid #b8860b">
      <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:22px;color:#b8860b;font-weight:700">Ownology</h1>
    </td></tr>
    <tr><td style="padding:8px 32px 24px">
      <p style="margin:0 0 12px;font-size:16px">G&rsquo;day ${displayName.replace(/[<>]/g, "")},</p>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151">Here&rsquo;s your one-tap login link. It expires in 15 minutes and can only be used once.</p>
      <p style="margin:20px 0 24px;text-align:center">
        <a href="${magicUrl}" style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px">Sign in to Ownology</a>
      </p>
      <p style="margin:0 0 8px;font-size:12px;color:#6b7280;line-height:1.5">If the button doesn&rsquo;t work, paste this into your browser:<br><span style="word-break:break-all;color:#374151">${magicUrl}</span></p>
      <p style="margin:24px 0 0;font-size:12px;color:#9ca3af;line-height:1.5">Didn&rsquo;t request this? Ignore it — the link expires shortly and no account changes were made.</p>
    </td></tr>
  </table>
</body></html>`;
      try {
        await resend.emails.send({
          from: fromEmail,
          to: email,
          subject: "Your Ownology login link",
          html,
        });
      } catch (sendErr) {
        console.error("[auth/magic-link] Resend failed:", (sendErr as Error).message);
      }
    } else {
      // Dev / preview without Resend key — log the link so operator can
      // still complete a test flow.
      console.log(`[auth/magic-link] (dev) link for ${email}: ${magicUrl}`);
    }

    return res.json({ ok: true, sent: true });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[auth/magic-link/request] failed:", msg);
    return res.status(500).json({ error: "Could not send login link. Try again shortly." });
  }
});

/**
 * GET /api/auth/magic-link/verify?token=<hex>
 * User clicks the link in their email → we verify, mint the same JWT
 * cookie the Google OAuth exchange sets, then 302 to /dashboard.
 * Token is single-use — consumed_at is stamped so replay attempts fail.
 */
router.get("/magic-link/verify", async (req: Request, res: Response) => {
  const tokenPlaintext = typeof req.query.token === "string" ? req.query.token : "";
  const siteUrl = process.env.PUBLIC_SITE_URL || `${req.protocol}://${req.get("host")}`;
  if (!tokenPlaintext || !/^[a-f0-9]{40,80}$/i.test(tokenPlaintext)) {
    return res.redirect(302, `${siteUrl}/login?err=invalid`);
  }
  try {
    const { createHash } = await import("node:crypto");
    const tokenHash = createHash("sha256").update(tokenPlaintext).digest("hex");
    const row = await db.query.magicLoginTokens.findFirst({
      where: eq(schema.magicLoginTokens.tokenHash, tokenHash),
    });
    if (!row) return res.redirect(302, `${siteUrl}/login?err=invalid`);
    if (row.consumedAt) return res.redirect(302, `${siteUrl}/login?err=used`);
    if (row.expiresAt < Date.now()) return res.redirect(302, `${siteUrl}/login?err=expired`);

    // Load user, then stamp the token as consumed BEFORE minting the cookie
    // so a network error mid-response can't leave an unconsumed token.
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, row.userId),
    });
    if (!user) return res.redirect(302, `${siteUrl}/login?err=invalid`);
    await db
      .update(schema.magicLoginTokens)
      .set({ consumedAt: Date.now() })
      .where(eq(schema.magicLoginTokens.id, row.id));

    const jwt = await signSessionJwt({
      openId: user.openId,
      name: user.name,
      email: user.email,
      role: (user.role === "admin" ? "admin" : "user"),
    });
    setSessionCookie(res, jwt);
    // Land on /dashboard by default (same as post-Google-callback landing).
    return res.redirect(302, `${siteUrl}/dashboard`);
  } catch (err: unknown) {
    console.error("[auth/magic-link/verify] failed:", (err as Error).message);
    return res.redirect(302, `${siteUrl}/login?err=server`);
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
  // SAFE-BY-DEFAULT (Feb 2026 audit) — flipped from "default allow" to
  // "default deny". Prod NODE_ENV wasn't guaranteed to be set which meant
  // the fall-through at the bottom allowed anonymous admin access on
  // www.ownology.ai. Now: bypass ONLY activates if explicitly opted in
  // via ENABLE_DEV_BYPASS=true or the runtime flag. Preview + local dev
  // both set ENABLE_DEV_BYPASS=true in their .env files.
  if (process.env.ENABLE_DEV_BYPASS === "false") return false;
  if (isRuntimeBypassActive()) return true;
  if (process.env.ENABLE_DEV_BYPASS === "true") return true;
  // Any other combination (missing NODE_ENV, missing ENABLE_DEV_BYPASS,
  // production, ambiguous) — DENY. Was previously "allow" and that was
  // the security hole.
  return false;
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
        name: process.env.OWNER_NAME || "Ownology Cellars",
        email: "richard@ownology.ai",
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
