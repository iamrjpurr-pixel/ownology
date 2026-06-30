# Multi-Tenant Phase 2 — Per-Line Execution Checklist

Generated Feb 2026 from a static grep audit of all 109 tRPC procedures.
Next session: open this file as the worklist. Each item is mechanical.

## How to execute (standard pattern)

For each procedure listed below:
1. Swap `protectedProcedure` / `ownerProcedure` → keep the same level but
   read `ctx.user.wineryId` from the resolved user (already in context).
2. Add `eq(schema.<table>.wineryId, ctx.user.wineryId)` to every WHERE
   clause that reads or filters this user's data.
3. In every `.values()` insert call, add `wineryId: ctx.user.wineryId`.
4. After all touches: `npx drizzle-kit generate` then a migration that
   flips the `winery_id` columns to NOT NULL with FK constraints.

To resolve `ctx.user.wineryId`, extend `server/trpc.ts` `getUserFromCookie`
to ALSO return the user's `winery_id` from the users table. Currently it
only returns `{ openId, name, email, role }`. Adding `wineryId` is one
line.

## Tables that need a `winery_id` column added (currently missing)

The bootstrap on boot in `server/index.ts` should be extended to add
`winery_id INT NULL` + backfill on each of these tables. Mirror the
pattern already used for the `users` table.

**Customer-domain tables (require winery_id):**
- `vintage_logs` and its line-item tables (`vintage_log_line_items`, etc.)
- `sop_library` — IF/WHEN customers can author their own SOPs. v1
  decision: SOPs are platform-supplied content, KEEP shared. Skip.
- `sop_vintage_notes` — per-user annotations on SOPs → need winery_id
- `sop_training_records` — per-user → need winery_id
- `wine_batches` and `wine_batch_*` family (find via grep on schema)
- `barrels`, `barrel_history`
- `packaging_inventory`, `packaging_orders`
- `cellar_tasks`, `cellar_equipment`
- `vineyards`
- `compliance_records`, `lip_audit_pack_*`
- `cellar_journal`, `cellar_journal_drafts`
- `vintage_intelligence` — IF this stores user-specific data; if it's
  a shared knowledge base, SKIP.
- `vintage_reminder` family
- `voice_journal` family if exists

**Platform-level (SKIP — no winery_id needed):**
- `users`, `wineries` — auth/tenancy primitives
- `pricing_views`, `pricing_funnel_events` — anonymous marketing telemetry
- `theme_picks`, `theme_suggestions` — anonymous telemetry
- `outreach_contacts` — the FOUNDER's sales CRM, not a customer's. v1
  keeps platform-level. Could become per-winery in v2 when wineries
  manage their own customer outreach.
- `diy_knowledge_chunks` — shared knowledge base for AI grounding
- `founding_members`, `merch_orders` — founder-side sales data
- `free_run_daily_usage` — currently keyed by openId; KEEP this (a user
  has the same free-tier quota regardless of which winery they own)
- `site_content` — admin-edited shared content
- `trinity_newsletter_drafts` — platform editorial workflow

## Procedure-by-procedure checklist

**Format**: `file:line procedureName — action`

### server/routers/vintageLog.ts (13 procedures) — ALL need winery_id
- `:49 create` — add `wineryId: ctx.user.wineryId` to `.values()`
- `:89 list` — add `eq(schema.vintageLogs.wineryId, ctx.user.wineryId)` to WHERE
- `:101 getUsedTanks` — add same WHERE filter
- `:113 alerts` — same
- `:128 reasoning` — same (reads multiple tanks)
- Remaining 8 procedures in this file: audit each `.where()` and `.values()`

### server/routers/knowledge.ts (8 procedures)
- `:14 list` (sopLibrary) — platform content, SKIP
- `:31 getById` (sopLibrary) — platform content, SKIP
- `:42 getVintageNotes` — annotations are per-user → add winery_id WHERE
- `:47 getTrainingRecords` — per-user → add winery_id WHERE
- Other 4: audit individually

### server/routers/outreach.ts (10 procedures)
ALL SKIP — founder's sales CRM, platform-level by v1 decision.

### server/routers/pricing.ts (2 procedures)
ALL SKIP — pricing funnel is platform marketing telemetry.

### server/routers/themes.ts (3 procedures)
ALL SKIP — anonymous theme telemetry.

### server/routers/tutor.ts (2 procedures)
- `:118 ask` — uses ctx.user. The actual ASK is per-user but doesn't
  store winery-scoped data; the reads (`sopLibrary`, `diyKnowledgeChunks`,
  `vintageIntelligence`) are platform-content. SKIP unless adding
  per-winery custom knowledge later.

### server/routers/wbsAdmin.ts (7 procedures)
ALL SKIP — knowledge base editing is platform admin work.

### server/freeRunRouter.ts (6 procedures)
- All keyed by `openId` not winery_id. v1 decision: free-tier quota
  follows the USER not the winery. KEEP as-is. SKIP.

### server/routers.ts (61 procedures) — the big one
This file is the legacy monolith. Audit each procedure:
- `getLatest`, `list`, `getCount` of `trinity_newsletter_drafts`,
  `site_content`, etc. → platform-level, SKIP
- The `adminRouter` block (lines ~321+): mostly platform admin work,
  SKIP unless touching winery-domain data
- `vintageLog`, `wineBatch`, `barrel`, `cellarTask`, `cellarEquipment`,
  `packaging`, `compliance`, `vineyard`, `cellarJournal`, `voiceJournal`
  inline routers (if they exist here vs in routers/) → ALL need filter

**Rough estimate**: of 109 total procedures, **~30-35 actually need
winery_id filtering**. The rest are platform-level and stay untouched.
That's smaller than the "40 procedures" original estimate. Good news.

## ctx.user.wineryId — implementation

In `server/trpc.ts`, extend `getUserFromCookie` (or the equivalent
helper) to:

```ts
// After JWT verify
const dbUser = await db.query.users.findFirst({
  where: eq(schema.users.openId, payload.openId as string),
  columns: { wineryId: true },
});
return {
  openId: payload.openId,
  name: payload.name,
  email: payload.email,
  role: payload.role,
  wineryId: dbUser?.wineryId ?? null,
};
```

Then every protectedProcedure can read `ctx.user.wineryId`. Create a
helper `wineryProcedure` that asserts non-null:

```ts
export const wineryProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (!ctx.user.wineryId) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No winery membership" });
  }
  return next({ ctx: { ...ctx, wineryId: ctx.user.wineryId } });
});
```

Use `wineryProcedure` for everything in the "need filtering" list above.

## Migration: nullable → NOT NULL

After every customer-domain table has `winery_id` backfilled and every
procedure now writes it on insert, run:

```sql
ALTER TABLE vintage_logs MODIFY winery_id INT NOT NULL;
ALTER TABLE vintage_logs ADD CONSTRAINT fk_vintage_logs_winery
  FOREIGN KEY (winery_id) REFERENCES wineries(id) ON DELETE CASCADE;
-- repeat for each customer-domain table
```

Do this AFTER the code changes are deployed and have been live for 24
hours so any pending NULL inserts have been flushed.

## Test plan (run testing_agent_v3_fork after refactor)

1. **Cross-winery isolation test**: create two wineries via test
   users. User A writes a vintage_log row. Sign in as user B. Confirm
   user B cannot see user A's row in `.list()`, `.alerts()`, etc.
2. **Insert smoke test**: every write procedure should pick up the
   user's winery_id automatically. Spot-check 5 random procedures.
3. **Performance check**: `EXPLAIN` on the heaviest queries to confirm
   the new `winery_id` indexes are used.
4. **Regression test**: full UI walk-through of /admin/* in dev-bypass
   mode (which is still Default Winery) — everything should work as before.

## Rollback plan (if Phase 2 explodes mid-session)

The Phase 1 column is NULLABLE. If Phase 2 query refactors cause
visible bugs:
- Revert the deploy
- Existing data still has `winery_id = 1` (Default Winery)
- Phase 1 scaffolding remains; no DB rollback needed
- Try again with smaller batches

— Ownology, Feb 2026
