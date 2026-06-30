# Auth Testing Playbook (Emergent Google Auth)

Saved from integration_playbook_expert_v2 — Feb 2026.
This app uses Express + tRPC + MySQL (Drizzle), not FastAPI/Mongo. Adapt the
MongoDB examples to the existing `users` table.

## Flow
1. Frontend "Sign in with Google" → `window.location.href = https://auth.emergentagent.com/?redirect=${origin}/auth/callback`
2. User returns to `/auth/callback#session_id=<token>`
3. Frontend AuthCallback reads `session_id` from URL fragment (synchronously, not in useEffect)
4. Frontend POSTs `session_id` to backend `/api/auth/exchange`
5. Backend calls `GET https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data` with header `X-Session-ID`
6. Backend upserts user in MySQL users table (by email), sets `app_session_id` JWT cookie (HS256 with JWT_SECRET, payload `{ openId, name, email, role }`, 7d expiry)
7. Frontend redirects to `/admin` (or stored intended path)

## Cookie shape (must NOT change — used by every tRPC procedure)
`app_session_id` = HS256 JWT, payload `{ openId, name, email, role }`

## Dev-bypass
When env `ENABLE_DEV_BYPASS=true` (default in non-prod), tRPC continues to
auto-authenticate as seed admin if no real cookie present. A real cookie
always takes priority.

## Admin gating
`/admin/*` Express middleware checks JWT → if role !== 'admin' → 403.

## Endpoints
- POST `/api/auth/exchange` { session_id } → sets cookie, returns user
- GET  `/api/auth/me` → returns user from cookie or 401
- POST `/api/auth/logout` → clears cookie

## Critical Rules
- Do NOT hardcode redirect URL. Use `window.location.origin + '/auth/callback'`
- Use `useRef` (not state) for processed flag in AuthCallback to avoid StrictMode double-fire
- Detect `session_id` synchronously during render, before any auth check fires
