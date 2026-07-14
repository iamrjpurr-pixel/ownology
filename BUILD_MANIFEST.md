# Ownology — Build Manifest

Human-readable checkpoint of the scope currently in the codebase.
The machine-readable equivalent lives at `GET /api/build-info` and is
compared side-by-side against production at `/admin/build-check`.

## How to verify prod is current

1. Push work: hit **"Save to Github"** in the Emergent chat input.
2. Wait ~2–3 min for Railway to redeploy.
3. Open `/admin/build-check` — it fetches `/api/build-info` from both
   this build and prod, then diffs every field. Any red row = prod is
   behind on that dimension.

The page auto-refreshes every 30s, so you can leave it on a second
monitor while a deploy converges.

## What the endpoint returns

| Field | Meaning |
|---|---|
| `commit` | Short git SHA of the build. Mismatch = prod is behind. |
| `commitAt` | ISO timestamp of the commit itself. |
| `computedAt` | Wall-clock when the manifest was rendered. |
| `swCacheVersion` | `CACHE_VERSION` from `client/public/sw.js`. Bump this to force clients to redownload assets after a UI change. |
| `trpcProcedures` | Count of tRPC procedures across `server/routers/*.ts`. Drop between local and prod = something didn't ship. |
| `dbTables` | Count of Drizzle `mysqlTable` declarations. Drop = missing migration on prod. |
| `clientPages` | Count of `.tsx` pages under `client/src/pages/` (excludes tests). |
| `latestChange` | Title of the top entry in `memory/CHANGELOG.md`. |
| `appVersion` | `package.json` version field. |
| `nodeEnv` | Should be `production` on prod, `development` locally. |

## Scope currently in this build

Truth lives in `memory/CHANGELOG.md`. Highlights of the current
codebase, high-WBS-level:

### CRM + Outreach
- Contacts CRM with SMS/Email pipeline, event-ingest tool, and Kanban board
- Claude-powered SMS rewriting (single + bulk) with context-aware
  "acknowledge, don't quote" pattern
- Perplexity-powered per-contact deep research
- Reply capture with Claude sentiment auto-tag + auto-status advance
- Engagement analytics + auto Hot Alert (email owner at 3+ views)
- Region-aware cohort bulk actions + TSV copy

### Your Vintage / Cellar Journal
- Wine Batch Book (LIP-compliant s.39F Wine Australia Act)
- Cellar equipment register — **19 WBS types** across 6 phases
  (receival, crushing, fermentation, pressing/transfer, storage/ageing,
  bottling) sourced from AWRI Practices Survey 2019 + Iland & Boulton.
- **Batch ↔ equipment traceability thread** (`batch_equipment_uses`)
  linking every fill/empty/pass event with a sanitation snapshot at the
  moment of use. FSANZ 3.2.2 Clause 20 evidence trail.
- **Cellar Board** at `/admin/cellar-board` — RAG state per vessel
  (Green/Amber/Red/Grey), computed from event log, 30s auto-refresh.
- Cellar tasks (clean, sanitise, inspect, maintain, fault log)
- AI Apprentice ("Owen") for cellar Q&A
- Public Cellar Journal SEO surface

### Admin / Owner
- Owner panel with waitlist, Founding Member count, merch, LLM budget
- Admin health probes + daily digest email
- **Build check** (`/admin/build-check`) — public `/api/build-info`
  endpoint + auto-diffing UI. Answers "is prod current?" every 30s.
- Nuke cache button (unregisters SW + clears localStorage)
- Brand assets page (auto-cropped social sizes via sharp)

### Gate + Public Routes
- Password gate (`ow_gate` cookie) with rate limiter
- Public route audit — visitor-only surfaces strictly gated
- OG previews + robots.txt hardening

## Backlog — not yet in this build

Kept in sync with `memory/ROADMAP.md`. Short version:

- **Weekly BD Digest email** (Monday Resend cron) — still open
- **Batch phase logger UI** on Your Vintage — surfaces `cellarBoard.logUse`
  inline with per-phase batch notes (schema + backend already live)
- **24h sanitation warning banner** when logging a phase against an
  Amber/Red vessel
- **Printable per-batch traceability sheet** (audit-ready PDF) driven
  by `cellarBoard.batchEquipment`
- **Per-winery sanitation freshness override** — `winery_settings` table
  to replace the hardcoded 72h default
- **Vessel fault → out-of-service task automation** (auto-open the
  repair task on fault_log so grey ↔ back-to-amber transitions are
  operator-driven)
- Refactor `server/routers/outreach.ts` (>3300 lines)
- SW `CACHE_VERSION` auto-bump from commit hash
- Multi-tenant winery model (Vigneron tier)

If any of the above ships to this build, the CHANGELOG top entry
updates, and the diff at `/admin/build-check` will show it.
