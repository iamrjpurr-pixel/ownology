# Test credentials — Ownology

Authentication is **fully bypassed** (both production and dev — updated 28 Jun 2026).

Every request without a real session cookie is auto-authenticated as the
seed admin user (see `server/trpc.ts → DEV_BYPASS_USER`). The user is
auto-upserted into the `users` table on each request:

| Field   | Value                                  |
|---------|----------------------------------------|
| openId  | `seed-owner-001`                       |
| name    | `Redstone Ridge Wines`                 |
| email   | `cellar@redstoneridge.com.au`          |
| role    | `admin`                                |

To act as a different user, set the `app_session_id` cookie to a JWT
signed with the `JWT_SECRET` from `/app/.env` containing the desired
`{ openId, name, email, role }` payload (HS256).

> When real auth is wired (Emergent Google login or JWT email/password),
> this file should be updated with the seed account credentials.
