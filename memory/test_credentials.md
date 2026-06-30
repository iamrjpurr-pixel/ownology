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
| name    | `Redstone Ridge Wines`                 |
| email   | `cellar@redstoneridge.com.au`          |
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

### To act as a specific user in tests
Sign a JWT with the `JWT_SECRET` from `/app/.env` containing
`{ openId, name, email, role }` (HS256) and set it as the `app_session_id`
cookie. Or just hit `/login` in a real browser.
