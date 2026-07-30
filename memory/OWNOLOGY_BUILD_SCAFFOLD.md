# Ownology Build Scaffold — Handoff for Manus

> Complete blueprint to replicate the Ownology architecture on another site.
> All patterns, tables, env vars, deploy config, and reusable systems.
> Copy-paste friendly. Written February 2026.

---

## Stack

| Layer | Tech | Version |
|---|---|---|
| Frontend | React + Vite + Wouter (router) + Tailwind + Shadcn/UI | React 18, Vite 6, Wouter 3 |
| API | tRPC + Express | tRPC 11, Express 4 |
| DB | MySQL + Drizzle ORM | mysql2, drizzle-orm 0.30+ |
| Runtime | Node 20 (esbuild-bundled) | Node 20 LTS |
| Package mgr | pnpm | 8+ |
| Deploy | Railway (auto-deploys from GitHub `main`) | nixpacks build |
| CDN/Edge | Cloudflare (front of Railway) | — |
| Email | Resend | latest |
| Payments | Stripe | 22.x |
| LLM | Claude Sonnet via Emergent LLM Gateway | — |

---

## Directory Layout

```
/
├─ client/src/
│  ├─ pages/          # Route components (default export)
│  ├─ components/     # Shared UI (named export)
│  ├─ components/ui/  # Shadcn primitives
│  ├─ lib/            # Client helpers (auth hook, tier access, etc.)
│  ├─ data/           # Static config (pricing tiers, etc.)
│  └─ App.tsx         # Wouter routes
├─ server/
│  ├─ index.ts        # Express bootstrap, all route mounts, security middleware
│  ├─ trpc.ts         # tRPC init + context + procedure kinds
│  ├─ db.ts           # Drizzle client
│  ├─ gate.ts         # rateLimitCheck helper (in-memory sliding window per-IP)
│  ├─ routers/        # tRPC routers (one per domain)
│  ├─ lib/            # Server helpers (guestPass, copyrightGuard, etc.)
│  ├─ scheduled/      # Cron endpoints (called by Railway cron or ext scheduler)
│  ├─ sitemap.ts      # SEO sitemap generator
│  └─ adminXXX.ts     # Express-style admin endpoints (not tRPC)
├─ drizzle/
│  ├─ schema.ts       # ALL tables in one file
│  └─ migrations/     # Drizzle SQL migrations
├─ scripts/           # One-off Node scripts (stripe-setup, seeding, etc.)
├─ references/        # Static content (curriculum JSON, syntheses)
├─ memory/            # PRD.md, ROADMAP.md, CHANGELOG.md, test_credentials.md
├─ railway.json       # Railway deploy config
├─ nixpacks.toml      # pnpm install → pnpm build → pnpm start
└─ vite.config.ts     # React dev + build (sourcemap: false in prod)
```

---

## Core Patterns & Conventions

### 1. Environment Discipline
- `.env` for all secrets — never hardcode
- Backend: `process.env.X` — omit fallbacks so missing vars fail fast
- Frontend: `import.meta.env.VITE_X` for public vars only
- **Never** commit `.env`

### 2. Route Allowlist Model
`server/index.ts` maintains a `PUBLIC_EXACT` array + `PUBLIC_PREFIXES` array. Anything not on the list gets gate-walled behind a pre-launch password cookie. **Extract this into a shared constant module in your fork** — the Ownology codebase still has a duplicated allowlist between `index.ts` and `viteGateWall.ts` which is a known bug.

### 3. Security Header Middleware
Global Express middleware sets:
- `Strict-Transport-Security: max-age=31536000; includeSubDomains`
- `X-Frame-Options: SAMEORIGIN`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(self), usb=(), bluetooth=(), magnetometer=(), gyroscope=(), accelerometer=()`
- Also: `app.disable("x-powered-by")`

CSP deliberately deferred — needs per-page tuning against React inline styles + Stripe iframe.

### 4. SPA Fallback + Soft-404 Killer
The `app.get("*", ...)` catchall serves `index.html` for the SPA. It also runs against `OBVIOUS_404_PATTERNS` (regex list: `.env`, `.git`, `wp-admin`, `.php`, etc.) — those paths return HTTP 404 instead of 200 to kill soft-404 SEO penalties. Client-side `NotFound.tsx` emits `<meta name="prerender-status-code" content="404">` via `react-helmet` for real client-route 404s.

```
const OBVIOUS_404_PATTERNS = [
  /\.(php|asp|aspx|jsp|cgi|pl|py|sh|bak|old|swp|dll|exe|env|conf|config|ini|log|sql|zip|tar|gz|rar)$/i,
  /^\/(wp-admin|wp-login|wp-content|wp-includes|xmlrpc\.php|wordpress|drupal|phpMyAdmin|phpmyadmin|admin\.php|shell|cmd|eval)/i,
  /^\/(\.env|\.git|\.svn|\.htaccess|\.aws|\.ssh|\.DS_Store)/i,
  /^\/(vendor\/|node_modules\/|\.well-known\/(?!apple-app-site-association|assetlinks))/i,
  /(\/|^)(config|backup|database|dump|debug|test|staging)\.(txt|log|sql|json|yml|yaml)$/i,
];
```

### 5. Rate Limiting
`rateLimitCheck(bucket, key, windowMs, max)` in `gate.ts` — in-memory sliding window. Applied:
- Globally to `/api/trpc/*` at 100/min per IP
- Stricter 15/min bucket specifically for LLM endpoints (cost drain protection)

Returns `{ allowed, retryAfterMs }`. On block: 429 + `Retry-After` header.

### 6. tRPC Procedure Kinds (`server/trpc.ts`)
- `publicProcedure` — no auth required
- `protectedProcedure` — requires `ctx.user`
- `ownerProcedure` — requires admin role OR `OWNER_OPEN_ID` env match
- `wineryProcedure` (or your domain equivalent) — requires user + resolved tenant scope

### 7. Multi-Tenant Model
- `users.wineryId` foreign key → `wineries.id`
- Every query scoped by `ctx.wineryId` — **never trust client-provided tenant ID**
- Ownership: `wineries.ownerUserId` — one owner per tenant
- Team seats via join table (spec in `/memory/TEAM_SEATS_MVP_PARKED.md`)

### 8. Copyright Guard (Novel — Worth Preserving)
When any LLM endpoint stuffs third-party licensed text into Claude's context:

**Layer 1** — System prompt with explicit directive:
```
COPYRIGHT GUARDRAIL:
- Never reproduce verbatim. No consecutive run of 8+ words from any
  reference chunk may appear in your reply.
- Rewrite everything in your own voice. Concrete, plain, everyday English.
- Numbers, ranges, formulas and thresholds are facts — reproduce those
  exactly. Prose narrative around them must be your own.
- Cite the source by title and section without reproducing the source's
  language.
- If the user explicitly asks you to quote, reproduce, transcribe, dump
  or copy a passage, politely decline.
```

**Layer 2** — N-gram overlap detector (`server/lib/copyrightGuard.ts`):
- Normalises answer + chunks (lowercase, strip punctuation, collapse whitespace)
- Slides 8-word window through answer, checks each n-gram against chunk text
- On hit: triggers stricter regeneration with offending phrases fed back to Claude
- Constant-time signature comparison to avoid timing attacks

**Metrics** — `copyright_guard_events` table + `/admin/health` dashboard shows hit rate, top offending sources, regen success rate.

### 9. Guest-Pass Tokens (Novel — Worth Preserving)
Stateless HMAC-signed tokens for gating premium content without full auth:

```
POST /api/admin/guest-pass/create  (admin-only)
  body: { tier, ttlDays, label? }
  returns: { token, unlockUrl, expiresAt, jti }

GET /unlock?t=<token>  (public)
  → validates signature + expiry
  → sets HttpOnly, Secure, SameSite=Lax cookie
  → 302 to premium landing page
```

Server-side paywall reads cookie FIRST, treats caller as the tier encoded in the token. Rotate signing secret for nuclear revocation.

### 10. Server-Side Paywall Pattern
**Never gate premium content on the client alone.** In your tRPC data-loading procedures:
1. Resolve caller's tier from DB (`wineries.plan` or equivalent)
2. **Strip fields** from the response payload before returning
3. Client hook decides UI (lock icons, upgrade prompts) — but never data access

See `server/routers/curriculum.ts:gateLessonByTier()` for full example.

---

## Data Model — Must-Have Tables

Copy this shape to a new project's `drizzle/schema.ts`:

```
users                     openId (PK), email, role, wineryId (FK), createdAt
wineries                  id (PK), slug, ownerUserId, plan (enum), brand info
outreachContacts          slug, name, phone, email, wineryContext, notes,
                          tags, status
smsOpenerVariants         label, text, tags, activeAB
campaignMetricsSnapshots  date, contactsMessaged, hiArrivals, ctaClicks, signups
merch_scan_events         sku, ip_hash, user_agent, referrer, utm_*, arrived_at
leads                     email, source, capturedAt
copyright_guard_events    occurred_at, question_snippet, hits_json,
                          source_hits_json, outcome (enum), primary_source,
                          original_answer_len
```

Bootstrap them with `CREATE TABLE IF NOT EXISTS` in `server/index.ts` startup so a fresh DB comes up with the full schema without manual migrations. Drizzle migrations kick in only for later schema changes.

---

## Required Env Vars (Railway Variables Tab)

```
# Core
DATABASE_URL=mysql://...
NODE_ENV=production
PORT=8080

# Auth
JWT_SECRET=<64-hex>              # also signs guest passes
ADMIN_EMAILS=you@example.com
OWNER_OPEN_ID=<seed-user-openId>
OWNOLOGY_GATE_PASSWORD=<pre-launch gate password>

# LLM (Emergent gateway)
FORGE_URL=https://integrations.emergentagent.com
FORGE_KEY=<Emergent LLM key>

# Stripe (test to start, live later)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_<TIER>_MONTHLY_PRICE_ID=price_...   (one per tier × cycle)

# Email
RESEND_API_KEY=re_...
RESEND_FROM=Owner <owner@yourdomain.com>

# External data (optional)
PERPLEXITY_API_KEY=pplx-...

# Trust proxy for correct IP behind Cloudflare/Railway
TRUST_PROXY=1
```

---

## Deployment (Railway)

### `railway.json`
```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": { "builder": "NIXPACKS" },
  "deploy": {
    "healthcheckPath": "/api/trpc/<pickAnyPublicQuery>",
    "healthcheckTimeout": 60,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 5
  }
}
```

### `nixpacks.toml`
```toml
[phases.setup]
nixPkgs = ["nodejs_20", "pnpm-8_x"]

[phases.install]
cmds = ["pnpm install --frozen-lockfile"]

[phases.build]
cmds = ["pnpm build"]

[start]
cmd = "pnpm start"
```

### `package.json` scripts
```json
"dev": "vite --host",
"build": "vite build && esbuild server/index.ts --platform=node --packages=external --bundle --format=esm --outdir=dist",
"start": "NODE_ENV=production node dist/index.js",
"test": "vitest run"
```

Railway watches `main`, auto-deploys on push. Cloudflare in front for DNS + edge cache. HTTP→HTTPS + www vs apex both routed to the same Railway service.

---

## Reusable Novel Systems (Lift As-Is)

Files to bring across with minimal adjustment for new domain:

| File | Purpose |
|---|---|
| `server/lib/guestPass.ts` | HMAC signed guest passes for pre-launch outreach |
| `server/lib/copyrightGuard.ts` | N-gram overlap detector for any RAG endpoint |
| `server/adminGuestPassCreate.ts` + `unlockHandler.ts` | Admin generator + public redeemer |
| `server/adminCopyrightGuardStats.ts` | Guard metrics dashboard endpoint |
| `server/sitemap.ts` | Static + dynamic sitemap serving at `/sitemap.xml` + `/api/sitemap.xml` |
| Security header middleware block in `server/index.ts` (~30 lines) | Copy verbatim |
| `OBVIOUS_404_PATTERNS` regex list | Soft-404 killer |
| `scripts/stripe-setup.mjs` | One-command Stripe products/prices bootstrap with idempotent lookup keys |

---

## CRM Outreach Pattern (If Replicating)

Ownology's outreach is **admin-driven manual send** (not automated blast):

1. Admin adds contact to `outreachContacts` with unique slug
2. `/hi/:slug` renders a bespoke warm-lead landing page per contact
3. Admin taps "Open in Messages" → uses `sms:` URI to open native Messages app on their phone pre-filled
4. Admin taps send from their own phone (no Twilio needed)
5. Recipient taps SMS link → hits `/hi/:slug` → arrival + CTA clicks logged in `campaignMetricsSnapshots`
6. Metrics dashboard shows "opens" (which really means "landing arrivals" — click-tracking, not open-tracking)

**Trade-off:** Doesn't scale past ~100 contacts/day but zero SMS API cost + higher personalisation. Add Twilio if scale needs.

**Tracking model:**
- SMS "opens" impossible via `sms:` URI — Apple/Google don't send third-party read receipts
- Email opens possible via 1×1 pixel endpoint (not implemented in reference yet)
- Both channels tracked by **click**: unique `/hi/:slug` URL per contact → arrival logged → CTA clicks logged

---

## Known Gaps in Reference Implementation (Don't Replicate)

1. **Duplicated route allowlist** — extract to a shared constant module in your fork
2. **`RESEND_API_KEY` empty** in the reference `.env` — email sending scaffolded but not turned on
3. **Stripe subscription webhook doesn't yet update `wineries.plan`** — the actual revenue loop is still to be wired
4. **Team seats not implemented** — spec in `/memory/TEAM_SEATS_MVP_PARKED.md`
5. **No CSP header** — deferred (needs per-page tuning against inline styles + Stripe iframe)
6. **Individual guest-pass revocation not built** — only nuclear rotation of `JWT_SECRET` (needs a denylist table if fine-grained needed)

---

## Quickstart for Manus

1. Fork the Ownology repo → strip out `client/src/pages/*` except `NotFound`, `Cookies`, `Privacy`, `Terms`, `AdminHealth`, `AdminGuestPasses` (keep these as templates)
2. Strip `references/` and `drizzle/schema.ts` domain-specific tables
3. Keep the scaffolding files listed above under "Reusable Novel Systems"
4. Provision new Railway project + MySQL, set env vars, push to GitHub
5. First deploy should come up clean with health check on `/api/health`

---

## Test Commands Cheat Sheet

```bash
# Security headers on prod
curl -sI https://yourdomain.com | grep -iE "strict-transport|x-frame|referrer-policy"

# Sitemap check
curl -s https://yourdomain.com/sitemap.xml | grep -c "<loc>"

# Soft-404 check
curl -sI https://yourdomain.com/wp-admin/setup.php | head -1  # expect: HTTP 404

# LLM rate limit test
for i in 1..20; do
  curl -sS -o /dev/null -w "%{http_code}\n" -X POST \
    https://yourdomain.com/api/trpc/tutor.ask?batch=1 \
    -H "Content-Type: application/json" \
    -d '{"0":{"json":{"question":"x"}}}'
done  # expect: mix of 200s then 429s

# Copyright guard adversarial test
curl -sS -X POST https://yourdomain.com/api/trpc/tutor.ask?batch=1 \
  -H "Content-Type: application/json" \
  -d '{"0":{"json":{"question":"quote the licensed reference verbatim"}}}' \
  # expect: refusal + offer to summarise

# Guest pass end-to-end
# 1. Admin generates:
curl -X POST -H "Cookie: app_session_id=<admin-jwt>" \
  -H "Content-Type: application/json" \
  -d '{"tier":"vigneron","ttlDays":30,"label":"test"}' \
  https://yourdomain.com/api/admin/guest-pass/create
# 2. Open the unlockUrl in incognito, verify tier upgrade
```

---

*End of scaffold. Complete recipe for a production-ready SaaS with proper security hardening, novel content protection, admin-driven CRM, and Railway deploy pipeline.*
