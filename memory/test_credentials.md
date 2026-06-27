# Test credentials — Ownology

Authentication is currently in **dev bypass mode** (no real login required).

When `NODE_ENV != "production"`, every protected tRPC procedure auto-injects
this seed admin user (see `server/trpc.ts → DEV_BYPASS_USER`):

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
