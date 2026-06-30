# Multi-Tenant Winery Model — Execution Plan

Drafted Feb 2026. Status: NOT STARTED. Estimated effort: 1 focused
session (~2-3 hours of agent work). Do NOT execute piecemeal — this is
a foundational refactor that should land as a single coherent change
with a thorough test pass.

## Decisions locked (Feb 2026, by founder)

- **Entity name in UI**: **Winery** ("Welcome to your winery." · "Switch winery." · "Invite a teammate to your winery.")
- **Multi-user per winery in v1**: **NO** — one user per winery. Defer teams to v2 until a customer asks. Simpler ship.
- **Branding scope in v1**: **Name + logo only**. Custom brand colors + custom domains deferred to v2.
- **Brand identity unchanged**: The platform brand is "Ownology AI." The Winery is the *customer's* container inside it. These are not in conflict.

## Phase 1 — Status: DONE (Feb 2026)

Shipped in the same session as the plan above:
- ✅ `wineries` table created via idempotent CREATE TABLE IF NOT EXISTS on boot
- ✅ `winery_id` column added to `users` (nullable for now)
- ✅ Default Winery "Redstone Ridge Wines" seeded with the founder as owner
- ✅ Backfill: every legacy user assigned to Default Winery
- ✅ New Google sign-ins auto-provision their own Winery (named `"{firstName}'s Winery"`)
- ✅ `admin.me` tRPC returns the user's `winery` object
- ✅ UserMenu pill + dropdown surfaces the winery name
- ✅ Verified end-to-end in preview

What this gets us: foundation laid, ZERO existing queries touched, no regression risk. The plumbing is in.

What it DOES NOT get us: actual data isolation. Phase 2 is still required before any second paying customer onboards.

## Phase 2 — Next session

Execute the per-router refactor checklist below. The tRPC procedures
need a `winery_id` filter in their WHERE clauses + an insert default in
their `.values()` calls. Foundation is already in place via
`ctx.user.wineryId` (available in every protectedProcedure).

## Why this matters

Right now every Founding Member who signs up shares one global data
pool. Their vintage logs, SOPs, contacts, batches — all visible to every
other admin. That's fine for Demo Day. It is NOT fine for paying
customer #1. Multi-tenancy is the literal blocker to onboarding the
first real customer.

## End-state goal

- Every signed-in user belongs to exactly one **winery** (multi-winery
  for the same user is out of scope for v1 — defer to v2 if it ever
  matters).
- Every domain row (vintage_log, sop, contacts, wine_batch, …) has a
  `winery_id` and is filtered by it at the tRPC layer.
- Cross-winery access is impossible by construction. The seed admin
  (Redstone Ridge) becomes one winery among many.
- New signups either:
  - **Create a new winery** (default — "Set up your cellar"), OR
  - **Join an existing one via invite code** (planned for v2 when teams
    actually start showing up).

## Schema changes

### New table

```sql
CREATE TABLE wineries (
  id           INT PRIMARY KEY AUTO_INCREMENT,
  name         VARCHAR(255) NOT NULL,
  slug         VARCHAR(64) NOT NULL UNIQUE,    -- url-safe, used in /winery/:slug
  owner_user_id INT NOT NULL,                  -- the founder; cascade lock
  plan         ENUM('free','press','amphora','coopers','founding_member') NOT NULL DEFAULT 'free',
  region       VARCHAR(128),                   -- e.g. 'Hunter Valley, NSW'
  brand_color  VARCHAR(16),                    -- hex for branded exports
  logo_url     VARCHAR(512),                   -- emergent object storage URL
  created_at   BIGINT NOT NULL,
  INDEX wineries_owner_idx (owner_user_id)
);
```

### Existing tables — add `winery_id`

Every domain-owned table needs `winery_id INT NOT NULL` plus an index.
Inventory of tables that need this column (search-grep audit):

- `users` — but with caveat: a user CAN exist before joining a winery
  (during the auth-exchange handoff). Column is `winery_id INT NULL`
  with onboarding wizard required before any data write.
- `vintage_logs` (+ all line items)
- `sop_library` and any SOP-derived tables
- `outreach_contacts`
- `wine_batches`, `wine_batch_*`
- `cellar_tasks`, `cellar_equipment`
- `barrels`, `packaging_inventory`
- `compliance_records`, `lip_audit_pack_*`
- `vineyards`
- `theme_picks`, `theme_suggestions` — DON'T add; these are anonymous
  telemetry across the whole app.
- `theme_picks`, `outreach_contacts` — actually outreach IS per-winery
  later (when wineries want to manage their own customer list), but for
  v1 keep contacts at the platform level (it's the founder's sales CRM,
  not a customer's).

Final per-table decision matrix lives in this doc — UPDATE this list
when starting execution to reflect current schema.

## Backend changes

### tRPC context

`server/trpc.ts` `createContext`: resolve `wineryId` from the user's
`winery_id` column. Add to ctx as `ctx.wineryId`. Procedures use
`ctx.wineryId` everywhere they currently do nothing.

### New procedure level: `wineryProcedure`

Like `protectedProcedure` but also asserts `ctx.wineryId != null`. Any
domain query MUST use this. Bare `protectedProcedure` becomes "auth
only, no winery yet" (i.e. the onboarding wizard, the settings page).

### Per-router refactor checklist

About 40 tRPC procedures need a `winery_id` filter added to their query
WHERE clauses. The diff per procedure is one line + the procedure type
swap. **Important**: don't forget the `.insert()` calls — they need
`wineryId: ctx.wineryId` added to the values block.

Routers to audit:
- vintageLog, knowledge, outreach (decide above), wbsAdmin
- cellarJournal, vintageReminder
- wineBatch, barrel, packaging
- cellarEquipment, cellarTasks
- compliance, vineyard, dashboard
- siteContent (probably platform-level, decide on a case-by-case)

### Bootstrap script (one-time)

```ts
// scripts/migrate-to-multitenant.ts
// 1. CREATE TABLE wineries (idempotent)
// 2. INSERT a "Default Winery" with name "Redstone Ridge Wines" and
//    owner_user_id = the seed-admin user id.
// 3. ALTER TABLE for each domain table — add winery_id column NULL
// 4. UPDATE each domain table SET winery_id = <default winery id>
//    WHERE winery_id IS NULL
// 5. ALTER TABLE — flip winery_id to NOT NULL
// 6. Add foreign key constraints
```

Run this against Railway prod ONCE during the cutover window.

## Frontend changes

### Onboarding wizard
- After first sign-in, if `user.wineryId IS NULL`, route to
  `/onboarding/winery` and force completion before any data write.
- Form: winery name, region, slug (auto-generated), plan (default free).
- Submit creates a `wineries` row + sets `users.winery_id`.

### UserMenu
- Add a "Switch winery" entry when a user has multiple memberships
  (deferred to v2 — but leave the menu item commented in place).
- Replace generic "Admin" badge with the winery name.

### Branding hookup
- When `wineries.brand_color` and `wineries.logo_url` are set, exports
  and the dashboard header use them instead of the default Ownology
  branding. (`/branding-mockup` already shows what this looks like.)

## Test plan

1. **Cutover dry run on staging Railway DB** (clone of prod).
2. **Two-user manual test**: sign in as user A → create wine batch.
   Sign in as user B → confirm user A's batch is NOT visible.
3. **testing_agent_v3_fork run** — full E2E pass with a fresh test user.
4. **Performance check** — `EXPLAIN` on the heaviest queries to confirm
   the `winery_id` index is being used.

## Rollback plan

The migration is additive in the first 4 steps (new column NULL,
backfill). If step 5 (NOT NULL flip) or 6 (FK constraints) causes
issues, drop them — domain queries still work because they filter on
`ctx.wineryId` which is set from the user's column.

Full rollback path:
- Restore Railway MySQL from automatic backup point (taken pre-cutover)
- Revert the deploy

## Out of scope for v1

- Multi-winery per user (user A is admin at both Redstone Ridge AND
  Hunter Valley Cellars). Deferred until anyone asks.
- Cross-winery role variations (one user admin at A, viewer at B).
- Public winery profile pages (separate feature).
- Per-winery custom domains (separate feature; tied to branding).

## When to start

Start when:
- Stripe is wired (P0 #2) — so you can sell while onboarding.
- You have at least one prospective customer ready to be customer #1
  and willing to wait 48h for setup.

Do not start when:
- You're context-switching every 30 minutes.
- You haven't budgeted time to test all 40+ tRPC procedures.

— Ownology, Feb 2026
