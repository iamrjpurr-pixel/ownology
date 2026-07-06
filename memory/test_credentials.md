# Test credentials — Ownology

## Authentication (Emergent Google OAuth — Feb 2026)

Real auth is now wired. Two modes:

### Dev / preview (default)
- `ENABLE_DEV_BYPASS=true` (or unset) → every request is auto-authenticated
  as the seed admin below. No login required.
- `/admin/*` SPA pages and admin tRPC endpoints are open.
- This is the current mode in the preview environment.

| Field   | Value (auto-injected)                  |
|---------|----------------------------------------|
| openId  | `seed-owner-001`                       |
| name    | `Ownology Cellars`                     |
| email   | `richard@ownology.ai`                  |
| role    | `admin`                                |

### Production (Railway)
- Set `ENABLE_DEV_BYPASS=false` AND `NODE_ENV=production`.
- Users sign in via `/login` → `https://auth.emergentagent.com` → Google →
  `/auth/callback#session_id=…` → backend exchange → `app_session_id` JWT cookie.
- Admins are determined by the comma-separated `ADMIN_EMAILS` env var.
  Add your own email here to be granted `role=admin` on first login.
- Legacy Basic Auth (`ADMIN_AUTH_USER` / `ADMIN_AUTH_PASS`) still works as a
  fallback for curl/cron — leave blank to require JWT only.

### Endpoints
- `POST /api/auth/exchange` — body `{ session_id }`, sets cookie
- `GET  /api/auth/me`       — returns user from cookie or 401
- `POST /api/auth/logout`   — clears cookie

Check `/app/memory/test_credentials.md` and `OWNOLOGY_GATE_PASSWORD` in `/app/.env` (Password is `middx99` — rotated Feb 2026).

### To act as a specific user in tests
Sign a JWT with the `JWT_SECRET` from `/app/.env` containing
`{ openId, name, email, role }` (HS256) and set it as the `app_session_id`
cookie. Or just hit `/login` in a real browser.

### Gate wall password (preview + prod)
- `OWNOLOGY_GATE_PASSWORD=middx99` (rotated Feb 2026 from the default `changeme-set-real-password`).
- Used at `/api/gate/verify` (POST { password }) → sets `ow_gate` cookie → 24-month expiry.
- The gate wall protects all non-allowlisted SPA routes under default-deny (see `server/index.ts` `PUBLIC_EXACT` + `PUBLIC_PREFIXES`).
- Alternative bypass: mint a per-prospect magic link at `/admin/gate-invites` → share `/i/<token>` URL.
