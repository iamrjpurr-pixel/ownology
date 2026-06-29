# Ownology — PRD

## Original problem statement
> Import the existing project at https://github.com/iamrjpurr-pixel/ownology (originally built on Manus / ownology.ai) into Emergent and continue development.

## Architecture (after import — 27 Jan 2026)

**Stack (kept from upstream)**
- Frontend: React 19 + Vite 7 + Tailwind v4 + Radix UI + wouter + tRPC client + framer-motion + recharts
- Backend: Express 4 + tRPC 11 + Drizzle ORM + jose JWT + Stripe + superjson
- Database: **MySQL 9.4 on Railway** (`reseau.proxy.rlwy.net:34291/railway`)
- Package manager: pnpm 10.4

**Emergent container adaptations**
- Supervisor `backend` → `pnpm tsx watch server/index.ts` on port **8001**
- Supervisor `frontend` → `pnpm vite --host 0.0.0.0 --port 3000`
- All Manus-proprietary Vite plugins stripped (`vite-plugin-manus-runtime`, `jsxLocPlugin`, debug-collector, storage-proxy, merch + api dev proxies)
- Vite dev proxies `/api/*` → `127.0.0.1:8001`
- `vite.config.ts` rewritten; `server/index.ts` listens on PORT env (8001)
- Schema fixes: `barrels.format` enum → varchar(64) (drizzle-kit enum-with-paren bug); `regulation_monitor_seen.publication_url` varchar(1024) → varchar(512) (utf8mb4 key-length limit)

**Real-time Alerts Engine (wired 28 Jun 2026)**
- New `vintageLog.alerts` protectedProcedure (`server/routers.ts` ~line 478) scans the user's last 400 `vintage_log_entries` grouped by tank, and emits up to 6 actionable alerts sorted high → medium → low.
- Five rules:
  1. **dap_due** (high if YAN<150, else medium) — last YAN reading <200 ppm AND no DAP added since
  2. **high_temp** (high if temp>26°C, medium if >22°C) — last temp reading within 24h above 22°C
  3. **stuck_ferment** (always high) — 2+ Brix readings with <1° movement over 2+ days AND post-inoculation AND latest >4°Bx
  4. **ready_to_rack** (medium) — last Brix ≤2°Bx within 96h AND no racking recorded since AND post-inoculation
  5. **tank_quiet** (low) — post-inoculation tank with no events in 5-14 days
- Tanks where the last event was >120 days ago are excluded (past vintage).
- Dashboard renders `[data-testid=dashboard-alerts-banner]` with severity-color chips and an "↥ Import past vintages" link in the header. Empty state (no alerts AND no tanks) shows a prominent Import CTA card.
- Seed script `scripts/seed-alert-triggers.mjs` populates Tanks 2/4/5/8/9 with deliberately alert-triggering data so the engine fires 5 alerts immediately.

**Decision-Logic Capture (Tier 2 — wired 28 Jun 2026)**
- QuickEntry confirm screen now has an optional 240-char "Why?" textarea (`[data-testid=quick-entry-reasoning-input]`).
- The reasoning is stored in `vintage_log_entries.detailsJson` under the `reasoning` key (no schema change).
- `getUserCellarContext` extracts the reasoning per entry and appends ` · why: "..."` to the prompt line, so the AI tutor can quote the winemaker's own decision logic back when answering future questions.
- Verified live (iter 2 test report): tutor verbatim quoted *"Cool morning measurement to track diurnal swing"* back to the user. ✅

**Import Discoverability (wired 28 Jun 2026)**
- `[data-testid=quick-entry-import-link]` on QuickEntry header.
- `[data-testid=dashboard-import-link]` in the alerts-banner header.
- `[data-testid=dashboard-import-cta]` on the empty-state card when user has zero tanks AND zero alerts.

**API polish (28 Jun 2026)**
- `vintageLog.add` mutation now returns `{success: true, id}` (was just `{success: true}`). `addVintageLogEntry` in `server/db.ts` now returns the new row's `insertId`. Enables client to chain edits/deletes/optimistic updates without a re-list round-trip.

**Refactor — server/routers.ts split (28 Jun 2026)**
- `server/routers.ts` went from **3,239 → 1,556 LOC** (−52%). Now a slim composition file importing 4 extracted sub-routers + 20 still-inline sub-routers.
- New `server/routers/` directory:
  - `tutor.ts` (770 LOC) — `tutorRouter` + `KEYWORD_CATEGORY_MAP` + `detectSopCategories`. Hosts `tutor.ask` with the learning loop wired via `getUserCellarContext`.
  - `vintageLog.ts` (533 LOC) — `vintageLogRouter` + `EVENT_TYPES` + `generateTags`. Hosts add/list/delete/bulkSave/parseFromImage/parseFromText/alerts.
  - `knowledge.ts` (227 LOC) — `knowledgeRouter` (SOP library CRUD + training records).
  - `wbsAdmin.ts` (194 LOC) — `wbsAdminRouter` (domain publish/unpublish).
- Regression caught and fixed during iteration: `dashboard.getStats` 500 because `listVintageLogEntries` (in `db.ts`) was accidentally removed from the routers.ts import list. Re-added; 32/32 tests pass on live (test report `/app/test_reports/iteration_4.json`).
- All 4 extracted routers verified live: alerts engine returns 5 alerts, knowledge returns 38 SOPs, wbsAdmin returns 83 domains, tutor still cites Tank 7 Shiraz history correctly.
- Refactor playbook for next pass (when splitting the remaining 20 sub-routers): always grep the moved router for ALL `from "../db.js"` and `from "./trpc.js"` symbol references BEFORE deleting from routers.ts, and audit which symbols are STILL needed by the remaining routers in routers.ts (the `dashboard.getStats` regression was caused by skipping this audit step).

**Value Engineering Operationalized (28 Jun 2026)**
- New file `/app/memory/VALUE-ENGINEERING.md` — codifies the cost-control doctrine. Includes 5-question filter, cost-saving levers per resource (LLM/polling/code volume/storage/testing), retroactive audit of all ROADMAP items with score 1–5/5, standing rules for agent (e.g. never default to gpt-5.4, no polling <60s, extend before build).
- Two pure-win edits applied:
  1. `server/freeRunRouter.ts → callLLMJson` model switched from `MODELS.PREMIUM` (Claude Sonnet) to `MODELS.CHEAP` (gpt-5.4-mini). Tag classification is 3-word categorisation — zero quality loss, ~20× cheaper.
  2. `client/src/pages/ProductionDashboard.tsx` polling interval `60_000 → 300_000` + `refetchOnWindowFocus: true` for both `dashboard.getStats` and `vintageLog.alerts`. ~80% DB IOPS reduction.
- LLM cost meter shipped: new `server/_core/llmMeter.ts` (in-memory aggregator, ~120 LOC), instrumented in `_core/llm.ts → chatCompletion` so every `freeRunRouter` LLM call is tracked. Source-tagged: `freeRun.curiosityAsk`, `freeRun.tag`, `freeRun.goDeeper.{science,vineyard,craft}`. Exposed via 2 ownerProcedures in `routers.ts`: `admin.llmStats` (read) and `admin.resetLlmStats` (mutation).
- Coverage gap (documented, intentional v1): direct `fetch()` LLM call sites in `routers/tutor.ts`, `routers/vintageLog.ts`, `merch/api.ts`, `trinityPipeline.ts`, `queryRouter.ts` are NOT yet metered. Those use the CHEAP model by default so cost-per-call is small. Extend coverage when a measured reason appears.
- Verified live: cheap tag classification costs $0.000021 vs premium curiosity answer $0.005778 — **0.4% of premium cost**, matching the 95% saving projection.

**Auth (current — bypassed 28 Jun 2026)**
- Manus OAuth removed. As of 28 Jun 2026 auth is **fully bypassed in production AND dev**: `createContext` in `server/trpc.ts` always injects `DEV_BYPASS_USER` (openId `seed-owner-001`, role `admin`) when no real session cookie is present. The bypass user is auto-upserted into the `users` table on every request (idempotent). `ownerProcedure` accepts any `role === "admin"` user, so the bypass user has owner privileges too. To re-enable real auth later, restore the `NODE_ENV` check in `createContext` and remove the auto-upsert.

**Learning Loop (CORE USP — wired 28 Jun 2026)**
- The single most important feature: AI advice grounded in the winemaker's OWN cellar history, not just generic bibles.
- `server/db.ts → getUserCellarContext(userId)` distils the last 120 `vintage_log_entries` into a compact prompt block:
  - Tank inventory + variety crossing
  - Event-type frequency mix (additions, measurements, racking, inoculation, observation, etc.)
  - Top 25 most-recent events as compact `date · tank · variety · type · details · note` lines
- Injected into `tutor.ask` commercial path (after SOPs + Regional Vintage Context). Empty-string safe — new users with zero history get standard SOP-grounded answers; personalisation grows as they upload more.
- System prompt rule: *"PERSONAL HISTORY PRIORITY: When the question relates to a tank/variety/event in their history, CITE specific past entries by date + tank. Speak naturally — never expose source labels."*
- Smoke-tested 28 Jun 2026 (local prod): asking *"What did I do last vintage on Tank 7 with the Shiraz?"* returns a chronological recap of the user's actual logged events (24.3°Bx at crush → YAN 120ppm → split DAP → EC1118 → press at 2.0°Bx → MLF) and grounds the new advice in those past decisions. ✅
- Seed script: `scripts/seed-test-cellar-history.mjs` populates 16 sample entries across 3 tanks (Shiraz, Chardonnay, Pinot Noir) so you can demo the personalisation without uploading real data.

**RAG Knowledge Base (re-ingested 28 Jun 2026 — Railway prod MySQL)**
- `diy_knowledge_chunks`: **348 total / 184 published** (was empty before re-ingestion)
  - `red_wine_bible`: 102 (25 published) — `Guide_to_Red_Winemaking.pdf`
  - `white_wine_bible`: 104 (17 published) — `Guide_to_White_Wine_Making.pdf`
  - `morew_red_outline`: 7 (all published) — `Red_Wine_Making_Outline.pdf` proceduralised
  - `morew_white_outline`: 7 (all published) — white wine procedural outline
  - 🆕 `au_regulations__*`: 72 chunks (all published) — 13 markdown files: federal, NSW/VIC/QLD/SA/WA/TAS/NZ wine regulations, IP/labelling (WIPO), liquor licensing, agritourism
  - 🆕 `au_equipment__*`: 9 chunks (all published) — boutique winery equipment cost breakdown + minimum tool list (AU suppliers)
  - 🆕 `oenology_education__*`: 47 chunks (all published) — CSU/Adelaide curricula, Bachelor-level oenology references, microbiology slides (MCR101), Field-to-Glass overview, Two-Philosophies essay, oenology comparison
- `sop_library`: 38 SOPs (38 published)
- `cellar_journal`: 11 entries (live, growing as users ask questions)
- Schema change applied 28 Jun 2026: `diy_knowledge_chunks.wbs_process_family` widened from `varchar(10)` → `varchar(64)`; `wbs_domain` and `wbs_code` widened to `varchar(16)` to fit human-readable names used by the morew ingestion scripts.
- Generic ingestion helper: `scripts/ingest-knowledge-folder.mjs --folder <dir> --source-prefix <prefix>` — reads markdown from `references/<dir>/`, chunks ~600 words, marks all chunks PUBLISHED, idempotent re-runs (deletes by prefix first).

**LLM (wired 27 Jan 2026 — hybrid)**
- All traffic routes through Emergent Universal LLM Key proxy at `https://integrations.emergentagent.com/llm/`.
- **Premium tier** (`claude-sonnet-4-6`) — explicit calls from `server/_core/llm.ts` adapter. Used by `freeRunRouter.ts` user-facing answers (`callLLM`, `callLLMJson`).
- **Cheap tier** (`gpt-5.4-mini`) — default for every other call site. Wired transparently via a `fetch` shim in `server/_core/forgeShim.ts` that intercepts POSTs to `…/chat/completions`, injects a `model` field if missing, and rewrites `max_tokens` → `max_completion_tokens` for GPT-5 family.
- Existing `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` env vars now point at the Emergent proxy — zero changes needed to the ~30 call sites in `routers.ts`, `queryRouter.ts`, `sopEmbeddings.ts`, `trinityPipeline.ts`, `complianceKnowledgeBase.ts`, and scheduled jobs.
- Embeddings endpoint: `https://integrations.emergentagent.com/llm/openai/v1/embeddings` with `text-embedding-3-small`. Exposed via `embed()` in the adapter.
- Smoke-tested end-to-end: `freeRun.curiosityAsk` returns real, oenology-grounded answers + auto-extracted topic tags.

**Social flywheel (27 Jan 2026)**
- **RSS feed** at `/api/cellar-journal/rss.xml` — RSS 2.0, last 50 entries with categories/GUIDs/pubDates. Ingested out-of-the-box by Zapier, IFTTT, Buffer, Mastodon bots, Bluesky bridges, Feedly, NetNewsWire.
- **`trending`** tRPC procedure — top-asked entries in last N days (default 7), ordered by askedCount → viewCount → recency. Drives the "Trending this week" rail on the index.
- **`weeklyDigest`** tRPC — returns per-entry social drafts (Twitter ≤280, LinkedIn long-form, Markdown for newsletters) AND a rolled-up "best of the week" post for all three platforms. Zero composition needed — paste straight into any channel.
- **`composeSocialDraft()`** helper produces three platform-specific drafts from a single (question, diagnosis, topic, slug).
- **Outbound webhook** — when a NEW canonical journal entry is created, fire-and-forget POST to `CELLAR_JOURNAL_WEBHOOK_URL` (configurable in `.env`). Payload includes `event`, `slug`, `url`, `question`, `topic`, `diagnosis`, `teaser`, `askedCount`, and pre-composed `socialDraft` (twitter/linkedin/markdown). Webhook is OPTIONAL — silent no-op if not configured. Pairs perfectly with Zapier/Make/n8n/Discord/Slack — those handle all the per-platform auth, we just emit clean events.
- **Share row** on every entry page: X/Twitter, LinkedIn, Reddit, Copy Link buttons. Standard share-intent URLs, no API needed.
- **Open Graph + Twitter Card** meta tags on entry pages (`og:title`, `og:description`, `og:url`, `og:type=article`, `twitter:card=summary_large_image`, etc.) so links unfurl as rich cards on every social platform.

**Cellar Journal — SEO/CTA growth engine (27 Jan 2026, updated)**
- New `cellar_journal` table — slug, question, full_answer, teaser_answer (~40% cutoff at paragraph boundary), diagnosis, topicTag, citations (JSON), wineType, viewCount, askedCount, featured, published, **embedding** (1536-dim JSON from `text-embedding-3-small`), **variants** (JSON array of paraphrase questions that mapped to this canonical entry).
- Auto-persists on every `tutor.ask` and `freeRun.curiosityAsk` (fire-and-forget). Dedupe pipeline:
  1. Exact-slug match → bump askedCount + update lastAskedAt.
  2. **Trinity semantic clustering** — embed the new Q, cosine-sim ≥ 0.80 against all entries in the same topic → fold as variant of canonical entry. Threshold empirically tuned for `text-embedding-3-small` (paraphrases score 0.82-0.94; truly different Qs stay below 0.70).
  3. No match → create new canonical entry.
- Verified end-to-end: 3 paraphrases of "stuck at SG 1.020" funnel into ONE canonical journal page with `askedCount=3`. The two paraphrase variants render as "↳ ALSO ASKED AS" beneath the wax-sealed wall — SEO gold (multiple keyword variants pointing at one indexable URL).
- Topic inference via curated regex catalogue (`server/cellarJournalRouter.ts → TOPIC_KEYWORDS`) — 17 canonical topics (Stuck Fermentation, MLF, SO₂ & Sulphites, Racking & Lees, …). Rejects LLM-hallucinated chapter labels.
- Public pages:
  - `/cellar-journal` — editorial index, topic chip filter (with counts), live search, entry cards with diagnosis teaser.
  - `/cellar-journal/:slug` — single entry: question headline, diagnosis pull-quote, teaser content, **wax-sealed CTA wall**, citations, **"Also asked as" variants block**, 3 related entries from same topic.
- SEO infrastructure:
  - Per-entry JSON-LD `Article` schema with `isAccessibleForFree: false` + `hasPart` (Google flexible-sampling spec — no cloaking penalty).
  - Off-screen `.cj-paid-content` div with full answer for crawlers.
  - **`/robots.txt`** (static at `/app/client/public/`) declaring two sitemap URLs.
  - **`/sitemap.xml`** (static sitemap index) at root → points to dynamic sitemap.
  - **`/api/cellar-journal/sitemap.xml`** dynamic XML — auto-generated from DB, priority weighted by featured/askedCount, lastmod from lastAskedAt. 10-min cache header.
  - **`/api/robots.txt`** also served from Express (belt-and-suspenders).
- Backfill script: `scripts/backfill-cj-embeddings.mjs` — idempotent.

**Knowledge corpus (27 Jan 2026)**
- **38 SOPs** in `sop_library` across the canonical 12 categories (all published, all AI-authored via `gpt-5.4-mini` grounded in bible chunks, with full procedure_text + decision_logic + tribal_knowledge + quick_steps + WBS codes):
  - Harvest & Receival (3), Fermentation Management (4), Yeast & Fermentation (3),
    SO₂ Management (3), Malolactic Fermentation (2), Pressing & Free-Run (3),
    Racking & Clarification (4), Additions & Chemistry (4), Bottling & Packaging (3),
    Sanitation & Equipment (3), Fault Diagnosis (3), Laboratory Testing (3).
  - Seed script: `scripts/seed-38-sops.mjs` (idempotent — re-runs UPDATE, doesn't dup).
- **213 bible chunks** in `diy_knowledge_chunks`:
  - Red Wine Bible (MoreWine! / Shea AJ Comfort, 74p) — 102 chunks, 25 published (Domain-4 fermentation)
  - White Wine Bible (MoreWine! 2009 edition, 92p) — 104 chunks, 17 published
  - MoreWine Red Outline (3p quick-ref) — 7 chunks, all published
- Frontend `Knowledge.tsx` `CATEGORY_META` + `CATEGORY_FREE_RUN_TOPIC` + `DIY_CATEGORIES` updated to the canonical 12 (was showing 12 stale hardcoded categories that didn't match DB).

**Stubbed / disabled (awaiting user decision)**
- Stripe — env contains `sk_test_stub` / `whsec_stub`. Merch checkout won't process real payments.
- Forge storage — Manus' proprietary blob store stubbed; any file-upload feature will fail.
- LLM (Free Run / Compliance / Trinity pipelines) — no provider wired; AI panels return without answers.
- OAuth portal — replaced with placeholder; the `OAuthCallback.tsx` page can be revisited when real auth is chosen.
- Buttondown newsletter — `BUTTONDOWN_API_KEY` empty; newsletter scheduled job will no-op.

**Admin Basic-Auth Gate — Stopgap Protection (28 Jun 2026, this session)**
- Added `adminGate` Express middleware in `server/index.ts` that protects `/admin`, `/admin/*` (SPA pages) and `/api/trpc/admin.*` + `/api/trpc/pricing.funnelStats` (admin tRPC routes) behind HTTP Basic Auth.
- Reads `ADMIN_AUTH_USER` and `ADMIN_AUTH_PASS` from env. **When either is unset → gate disabled** (dev convenience). **When both are set → gate active.**
- Verified live in dev with creds enabled: unauth API calls return 401 with `WWW-Authenticate: Basic realm="Ownology Admin"`; correct creds return 200; wrong password returns 401; public endpoints unaffected.
- Note on dev vs prod: the Emergent preview environment routes non-`/api/*` URLs to Vite directly (port 3000), so `/admin` SPA pages aren't gated in dev. In Railway production, Express serves the SPA via `app.get("*")` after `adminGate` runs, so the gate WILL catch `/admin/*` pages too. ✓
- **This is a stopgap.** Proper auth (Emergent Google login or JWT) is still on the P0 roadmap. The gate buys 2–3 months of safety while you onboard the first 5 paying winemakers.

**SMS Outreach / CRM — VIVID Event Lead Triage (28 Jun 2026, this session)**
- New routes wired in `App.tsx`: `/hi/:slug` (public personalised landing) + `/admin/contacts` (owner CRM). Both were lazy-imported but had no `<Route>` definitions; now fixed.
- `outreach_contacts` table extended with `status varchar(16) NOT NULL DEFAULT 'cold'` + `oc_status_idx` index. Triage states: `warm | lukewarm | cold | sales | skip`. Migration applied via `scripts/add-outreach-status-column.mjs` (raw SQL).
- 31 contacts seeded from the **VIVID Event (Cult & Classic) Jun 2026** list via `scripts/seed-vivid-contacts.mjs`. Idempotent. Manly Spirits + Archie Rose pre-flipped to `sales`; James Agnew (Audrey Wilkinson / Pooles Rock) flipped to `warm`.
- New `outreach.setStatus` ownerProcedure (zod enum, 400 on invalid). `outreach.create` now accepts optional `status`.
- `/admin/contacts` UI: filter chip bar (`status-filter-bar`) above the form with per-state counts; per-row status dropdown (`status-select-<slug>`); rows for `sales`/`skip` dimmed to 0.55 opacity, silent-mode notice, Copy-SMS / Copy-link / Mark-sent / Mark-booked HIDDEN.
- **Honest copy refactor** (user feedback: *"didn't really chat much; some are just sales people"*). Removed "Great chatting at…" framing.
  - `/hi/:slug` greeting: *"We crossed paths at <event> — sending this your way for <winery>."*
  - No-painPoint intro (operator-supplied): *"We didn't get long to chat — I've since shipped something I reckon could save your wine making heroes real time through the vintage. 90-second look below; no signup needed."*
  - With-painPoint hook: *"Thought this might be relevant: <pain>. Ownology is built to answer that kind of question grounded in your actual vintage logs."*
  - SMS draft templates rewritten to match.
- `HiContact.tsx` `markViewed` gated on `contact?.slug` so unknown slugs don't fire a 400 (test-agent cosmetic flag, now fixed).
- Admin hub (`/admin`) has a new "Personal SMS Contacts" tool card.
- Verified live (`/app/test_reports/iteration_12.json`, **11/11 backend + 100% frontend pass, 0 critical, 0 minor**).


**Lazy Code-Splitting for Cold Pages (28 Jun 2026, this session)**
- 30+ rarely-visited pages converted from static `import` to `React.lazy(() => import(...))` in `client/src/App.tsx`. Suspense wraps the entire Switch with a tiny "Loading…" skeleton (`data-testid="page-loading"`).
- **Eager (kept synchronous)**: Home, FreeRun, ThePress, QuickEntry, CellarTasks, Today, Pricing, WorkModeLayout, PwaInstallBanner. These are first-paint or PWA bottom-nav critical.

**Three-feature drop — Sales Validation Polish (28 Jun 2026, this session)**

1. **QuickEntry — Decision-logic "Why?" preset chips.** Event-type-aware preset chips render above the reasoning textarea on the Confirm screen. Tap a chip → prefills the 240-char textarea verbatim (operator can refine). REPLACES previous text on subsequent taps (no append spam). 6 chips for `addition` (YAN, Brix, pH, bench trial, cap mgmt, SOP), 6 for `measurement` (diurnal, routine, post-add, pre-rack, compliance, baseline), 6 for `racking`, `inoculation`, `observation`, 4 for `training`, 5 for `other`. Goal: 10× the reasoning-capture rate vs. blank textarea — feeds the Learning Loop. `getReasoningPresets(eventType)` helper at top of `QuickEntry.tsx`.

2. **Default Calendly URL for `/hi/:slug`.** New env `CALENDLY_DEFAULT_URL=https://calendly.com/ownology`. `outreach.bySlug` now resolves server-side: per-contact `calendlyOverride` wins, else env default, else null. Frontend reads new `contact.calendlyUrl` field. Every personalised SMS landing page now has a working "📅 Book a 20-min demo →" CTA without per-contact setup. `calendlyOverride` still on the payload for backward-compat.

3. **Signup-conversion column on `/admin/funnel`.** Zero-schema-change design via `<source>:converted` suffix idiom.
   - New `pricing.logConversion({source})` public mutation. Normalises (lowercase, punct→`-`), caps base at 22 chars to preserve the 10-char `:converted` suffix within the 32-char `pricing_views.source` column. Verified that a max-32-char input still ends with `:converted` (edge case from code review).
   - `pricing.funnelStats` refactored: splits views vs conversions by suffix, merges onto canonical source name, returns `{conversions, conversionPct}` per row and in `totals`.
   - New `useConversionAttribution` hook (`/app/client/src/hooks/useConversionAttribution.ts`) — drop into any post-payment / success page. Reads `localStorage.ow_pricing_source` (24h freshness window), fires `pricing.logConversion`, clears stash. Ref-gated so StrictMode double-mount is safe.
   - `Pricing.tsx` stashes `{source, at: Date.now()}` to localStorage on every `/pricing` mount (in parallel with the existing `logView` call).
   - `MerchSuccess.tsx` + `FoundingMemberSuccess.tsx` call the hook — Stripe-stub-friendly, also future-proof for real Stripe webhooks.
   - `/admin/funnel` UI: new Conversions KPI block (count + overall %), 6-column table (Source/Visits/**Converted**/**Conv %**/Share/Last visit), amber-bold Converted cell when >0, green Conv % cell when ≥5% so winning channels jump off the page.
- Verified live (`/app/test_reports/iteration_13.json`, **13/13 backend pytest + 100% frontend, 0 critical, 0 minor**). One latent suffix-truncation bug from the code review was fixed in the same session.

- **Lazy (code-split into own chunks)**: WhyOwnology, ForInnoVintUsers, ForVintraceUsers, Blog, BlogArticle, Regulations, RegulatoryLinks, Compliance, Merch×3, CampaignMetrics, Orders, Admin, HomeWineryKit, ForHomeWinemakers, DIYKnowledge, HomeWinemakerTroubleshooting, HomeWinemakerGlossary, CompetitiveAdvantage, Preview, AdminLeads, AdminComplianceDoctrine, AdminVintageIntelligence, AdminWbs, AdminTrinity, AdminFunnel, FoundingMemberSuccess, OAuthCallback, ProductionDashboard, BuildIndex, Vineyard, Knowledge, CellarJournalIndex/Entry (named exports rewrapped), Guide, Import, Demo, Waitlist, VineReference, Resume, Stats, TankQr, VintageCompare.
- Verified live: with 250 KB/s network throttling, the `page-loading` skeleton briefly flashes when navigating to a fresh lazy chunk; the page then renders correctly. Eager routes feel instant.

**Sales Pipeline Board — `/admin/contacts/pipeline` (28 Jun 2026, this session)**
- New page `/app/client/src/pages/AdminContactsPipeline.tsx` — Trello-style 5-column board (Lead → Sent → Awaiting → Replied → Booked), HTML5 native drag-and-drop (no external lib).
- Stage **derivation, not storage**: columns are computed from existing timestamps (`smsSentAt`, `viewCount`, `repliedAt`, `demoBookedAt`) so Awaiting → Sent transitions happen automatically as soon as the prospect opens the SMS link. Sales/skip-tagged contacts filtered out entirely.
- New `outreach.setPipelineStage({slug, stage})` ownerProcedure — atomically rewrites the timestamps so dropping a card on a column persists exactly that derived state. Idempotent: existing timestamps preserved when the stage doesn't require zeroing them.
- New `replied_at` bigint column on `outreach_contacts` (raw SQL migration via `scripts/add-outreach-replied-column.mjs`). Drizzle schema updated.
- KPI bar: In pipeline / Awaiting reply / Booked demos / Booking rate % — the booking rate is the north-star metric for sales validation.
- **Optimistic UI** on drop — applies the same timestamp rewrite client-side via `utils.outreach.list.setData()` so the card moves instantly. Roll-back on error.
- **Multi-tab safety** — `refetchOnWindowFocus: true` + 30s polling so SMS-open events bubble across tabs without manual refresh.
- Cross-link `Pipeline board →` added to `/admin/contacts` header.
- **Updated** `CALENDLY_DEFAULT_URL=https://calendly.com/ownology/new-meeting` (user-supplied specific meeting-type link).
- Verified live (`/app/test_reports/iteration_14.json`, **11/11 backend pytest + 100% frontend, 0 critical, 0 minor**). All 5 code-review polish notes were forward-looking (UX surprise on `sent` vs `awaiting` drop when viewCount>0, lossy timeline on lead→booked) — the two most user-visible (optimistic update + multi-tab refetch) were fixed in the same session; mobile layout deferred to backlog.

- **Net effect**: first JS payload meaningfully smaller — winemakers on rural 3G during vintage will feel the win on `/`, `/free-run`, `/the-press` loads. Admin/Trinity/Knowledge chunks only download when someone actually visits those routes.

**Work-Mode Desktop Layout Audit (28 Jun 2026, this session)**
After shipping the `wide` prop on `WorkModeLayout` to fix `/knowledge`, swept every page rendered inside `WorkModeLayout` at 1920×1080:

**Per-contact SMS draft editor (28 Jun 2026, this session)**
- New `sms_draft_override varchar(500)` column on `outreach_contacts` (raw SQL migration `scripts/add-outreach-sms-override.mjs`).
- New `outreach.setSmsDraft({slug, draft})` ownerProcedure — accepts null/empty to clear, atomic write.
- `/admin/contacts` row UI: read-only `<details><pre>` SMS preview replaced with an inline `SmsDraftEditor` component (`AdminContacts.tsx`). Features:
  - Editable `<textarea>` pre-filled from `smsDraftOverride ?? smsDraft(template)`
  - Live character count + SMS segment indicator (`147 chars · 1 SMS` / amber border when ≥160 / red badge when >160)
  - Auto-saves on blur. Visual states: dirty (amber border + "Click outside to save"), saved (green "✓ Saved"), reverted ("↺ Reverted to template")
  - **CUSTOM** amber badge in the section header when an override is active
  - "Reset to template" link clears the override; if the textarea exactly matches the auto-generated template it also auto-clears (so future template edits propagate)
- `Copy SMS draft` button now copies the effective draft (override if set, else template).
- Operator workflow change: phone the prospect first → tweak each SMS to match the call context ("thanks for the chat" vs "tried to ring") → copy + send from real iPhone → mark sent.

- ✅ `/compliance` — already standalone (not in WorkModeLayout), full-width, no fix needed.

**Marketing demo asset for cold prospects (28 Jun 2026, this session)**
- Saved `ownology-vintage-log-mockup` (Manus-built, 869 lines) to `/app/client/public/sample-vintage-log.html` as a static asset. Polished 128-tank 2026-Harvest dashboard mockup: KPI cards (47 active fermentations, 12 racking, 69 aging, 3 alerts), Tank Status Overview with status-coded cards (T-01..T-88), T-01 Shiraz detail panel (Brix 12.4°, YAN, days fermenting, brix decline rate), event timeline. No JS interactivity required — purely visual proof.
- `/hi/:slug` secondary CTA rewired: was `/free-run?from=sms-<slug>` → now `/sample-vintage-log.html?from=sms-<slug>`. Cold prospects see a tangible "what could my operation look like here" mockup instead of being dropped into the AI chat. Funnel attribution preserved via `from=sms-<slug>`.
- Primary CTA fallback (when no Calendly URL) and secondary CTA both updated to the new copy: "See a real-time vintage log →" / "See a sample 2026 vintage log →".
- `<Link>` → `<a>` swap on both CTAs (target is a static `.html` outside wouter's React router).

- ✅ `/the-press` — narrow batch-focused content, mobile-first design intentional.
- ✅ `/cellar-tasks` — equipment list, naturally narrow.

**Region/scale variants for `/sample-vintage-log` (28 Jun 2026, this session)**
- Single HTML file (`/app/client/public/sample-vintage-log.html`) now supports `?variant=hunter|boutique|large` query param. Inline script + 3 datasets swap title, subtitle, 4 KPI numbers, 4 KPI detail lines, and document.title at load. CSS class `body.vw-boutique` hides 3 tank cards (`data-vw-boutique-hide`) so boutique drops from 9 → 6 cards visible. Falls back to "large" if JS disabled or unknown variant.
- Three datasets baked in:
  - **`large`** (default): "Vintage Log — 2026 Harvest" · 128 tanks · 47/12/69/3 KPIs
  - **`hunter`**: "Hunter Valley Estate — 2026 Vintage" · 24 tanks · Semillon & Shiraz country · 8/2/12/1 KPIs · alert text Hunter-flavoured
  - **`boutique`**: "Boutique Cellar — 2026 Vintage" · 12 tanks · Family-scale single-vineyard · 4/1/6/0 KPIs · "All clear"
- Backend `outreach.bySlug` now returns `sampleVintageLogUrl` + `sampleVintageLogVariant`. `pickSampleVintageVariant({winery, event})` heuristic — order: Hunter region (region trumps winery name list) → known multi-region large producer → boutique label list → fallback heuristic (winery name ≤14 chars after stripping "Wines/Estate/Cellars/Vineyards" → boutique) → "large".
- HUNTER_MARKERS includes all known Hunter Valley contacts from the seeded VIVID list (Brokenwood, Tyrrells, Margan, Mount Pleasant, De Iuliis, Thomas Wines, Audrey Wilkinson, Pooles Rock, M+J Becker, Usher Tinkler, Charteris, Majama + region keywords).
- HiContact.tsx `tryNowHref` now reads `contact.sampleVintageLogUrl` (server-resolved) and falls back gracefully if older API responses don't include it. `from=sms-<slug>` attribution param baked in by the server.
- Verified live: Nathan/Jane/Sarah/Ollie all resolve to `hunter`; Sally/Tim/Hamish-Mada/Paul/Jared resolve to `boutique`; Bryan-Ravensworth (Canberra) resolves to `large`. Variant pages render correctly (titles, KPIs, boutique tank-card hiding all confirmed via screenshot).

- ✅ `/today` — single-column alert feed, intentionally narrow.

**Clean URL `/sample-vintage-log` (28 Jun 2026, this session)**
- Express route in `server/index.ts` serves `client/public/sample-vintage-log.html` at the no-extension path `/sample-vintage-log`. Query params (`?variant=…&from=…`) pass through. Old `.html` URL keeps working — both routes are valid entry points.
- Matching dev-mode Vite middleware plugin (`sampleVintageLogAlias` in `vite.config.ts`) so the clean URL works locally too (Vite serves the frontend in dev; Express only in prod build).
- Backend `outreach.bySlug` now hands `/hi/:slug` the clean URL: `sampleVintageLogUrl = "/sample-vintage-log?variant=<v>&from=sms-<slug>"`.
- Verified in dev: `/sample-vintage-log?variant=hunter` renders Hunter Valley Estate mockup with correct KPIs (8/2/12/1), title, and subtitle.

- 🔴 → ✅ **`/dashboard`** — opted into `wide` (`<WorkModeLayout title="Dashboard" activeTab="more" wide>`). KPI row (`grid-cols-2 md:grid-cols-4`) was being forced into a 430px column → labels wrapped to "Activi Tanks / In Fermen / Approa Bottli". Now renders the proper 4-up grid with full labels + descriptions + Tank Status table's 6 columns at full readability. Mobile pixel-identical to before.


**Marketing Kit reference page (28 Jun 2026, this session)**
- New page `/app/client/src/pages/AdminMarketingKit.tsx` at `/admin/marketing-kit`. Single bookmarkable URL with one-click copy for every outreach asset.
- Sections:
  - **Sample vintage log URLs** (3 variants — Default/Hunter/Boutique) — each has `Open ↗` preview + `Copy` button
  - **Email signature** — preview-domain version (use today) + ownology.ai version (use post-DNS)
  - **LinkedIn DM templates** — 3 variants matching the sample-vintage-log variants
  - **Operational links** — quicklinks to Contacts CRM, Pipeline board, Funnel
- Origin computed via `window.location.origin` so all URLs reflect the current deployment automatically when DNS is pointed.
- Admin hub (`/admin`) now has a "Marketing Kit · Assets" card linking here.
- Verified live: 8 copy rows, Copy → ✓ Copied feedback works.

**Knowledge Page Desktop Layout Fix (28 Jun 2026, this session)**
- Bug: `/knowledge` was wrapped in `WorkModeLayout` (mobile-first 430px shell) but its inner grid uses `xl:grid-cols-4` — on desktop the page was rendering 4 cards in a ~430px column with text truncated to "Harv…", "Ferme…", "Yeast…".

**Multi-theme registry + first-time onboarding (28 Jun 2026, this session)**
- Per user feedback ("wineries swing between cellar-dark and harvest-pad bright; theme choice is a key interface decision before they start working"), the existing 2-theme toggle was rebuilt as a 4-theme registry with first-time onboarding.
- New CSS theme **`theme-soft-cellar`** added alongside the existing default dark + `theme-parchment` (existing light, also aliased as `light-mode`). Soft-cellar uses oklch(0.18 0.015 60) base + 0.84 L body text — softer warm umber, ~8.5:1 contrast (WCAG AAA), no astigmatism halo. Brand amber unchanged. Spec from `design_guidelines.json` (design subagent).
- New file `/app/client/src/lib/themes.ts` — `THEMES` registry with id, label, htmlClass, kind, description. `getEnabledThemes()` filters by `VITE_ENABLED_THEMES` env (comma list of ids). Empty/missing env = all enabled. `applyThemeToDom(id)` strips all known theme classes then applies the target. `resolveAutoTheme()` returns soft-cellar or parchment based on `prefers-color-scheme`.
- `ThemeToggle.tsx` rebuilt as a registry-driven dropdown picker — single-tap shows all enabled themes with descriptions, ✓ active marker, keyboard accessible (outside-click + Esc to close). `useOwnologyTheme()` hook kept stable (`isLight`, `cycle`, `toggle` shims) so existing pages don't break.
- Legacy localStorage values auto-mapped: `dark` → `soft-cellar` (returning users get the gentler dark), `light` → `parchment`, `system` → `auto`. Zero migration friction.
- New component `/app/client/src/components/ThemeOnboarding.tsx` — bottom-anchored "Choose your working light" card shown once for first-time visitors (no `ownology-theme` + no `ownology-theme-onboarded` localStorage keys). 800ms after page paint. Tap any theme → saves + dismisses. Auto-suppressed on `/admin/*`, `/hi/:slug`, `/founding-member/success`, `/merch/success`.
- New default for new users: **`auto`** — honours OS `prefers-color-scheme` and listens for live changes via MediaQueryList event handler.
- Smooth 240ms color transitions added globally (`background-color`, `color`, `border-color`, `fill`, `stroke`). Skipped when `prefers-reduced-motion`. Interactive elements (a/button/[role=button]) get a snappier 180ms tier for tactile feedback.
- Wired into App.tsx as `<ThemeOnboarding />` outside `<Suspense>` so it shows before route lazy-loading completes.
- Verified live: first-time visitor sees the onboarding card with all 4 enabled themes; returning user with `theme-soft-cellar` sees soft-warm umber page + the picker in nav; clicking picker opens dropdown with all themes + descriptions; OS-level light/dark flip when in `auto` updates the page in real-time.

- Fix: added a `wide` prop to `WorkModeLayout`. When `wide={true}`, the shell stays 430px on mobile (`< lg`) but expands to **1280px on lg+** via a small media-query injected `<style>` block. Bottom nav stays centered at phone width regardless of shell width (thumb-zone pattern preserved).
- `/knowledge` opts in via `<WorkModeLayout title="Knowledge" wide>`. Mobile rendering is pixel-identical to before; desktop now shows proper 4-col responsive grid with full text + breathing room.
- The `wide` prop is reusable for any other content-dense work-mode page (e.g. `/the-press`, `/compliance`, `/dashboard`) that needs more horizontal real-estate on desktop.

**Conversion-Attribution Funnel (28 Jun 2026, this session)**
- New table `pricing_views(id, source, userId, referer, userAgent, viewedAt)` + 2 indexes. Created via raw SQL since `drizzle-kit migrate` wasn't recording in `__drizzle_migrations` (pre-existing baseline issue — flagged for future cleanup; consider re-baselining or switching to `drizzle-kit push`).
- New `pricingRouter` in `/app/server/routers/pricing.ts` (124 LOC):
  - `pricing.logView({source, referer?, userAgent?})` — public mutation, anonymous-friendly. Normalises source (lowercase, strip non-alphanumeric, cap 32 chars), defaults to `"direct"` when empty.
  - `pricing.funnelStats({days?})` — owner query. Returns `{windowDays, totals, bySource[], daily[]}` with daily zero-fill so the sparkline never lies.
- `Pricing.tsx` auto-logs every visit on mount with `?from=<source>` extracted from URL. `useRef` gate ensures EXACTLY one log per mount (no React StrictMode double-fire).
- **4 highest-value CTAs tagged**:
  - `FreeRun.tsx` paused upgrade button → `from=free-paused` (the budget-guard funnel — defence-to-conversion lever)
  - `Home.tsx` 3 CTAs → `from=homepage-hero|homepage-nav|homepage-mobile`
  - `CompetitiveAdvantage.tsx` → `from=competitive-advantage`
  - `CellarJournal.tsx` → `from=cellar-journal`

**Theme telemetry — `/admin/themes-stats` (28 Jun 2026, this session)**
- New `theme_picks` MySQL table (`scripts/add-theme-picks-table.mjs`) — `id / theme_id / session_id / is_first_pick / picked_at`, indexed on theme_id + picked_at. Drizzle schema entry in `schema.ts` (`themePicks`).
- New `themes` tRPC router (`server/routers/themes.ts`):
  - **`themes.logPick`** (public) — accepts `{themeId ∈ [soft-cellar|parchment|cellar|auto], sessionId(6-64), isFirstPick}`. Zero PII.
  - **`themes.stats`** (owner) — windowed (1-365 days, default 30) breakdown: first-picks vs switched-to per theme, plus "currently using" derived from the LATEST pick per session and a share percentage of total sessions in window.
- New `useThemeTelemetry()` hook (`/app/client/src/hooks/useThemeTelemetry.ts`) — stable anonymous session id in localStorage (`ownology-tid`, 24-char base36). Fire-and-forget mutation; failures silent so telemetry never blocks UX. `isFirstPick` detected by absence of `ownology-theme` localStorage key (which is why telemetry must record BEFORE persistence — wired correctly in both ThemeToggle.select and ThemeOnboarding.choose).
- New page `/admin/themes-stats` (`AdminThemesStats.tsx`) — 3 KPIs (sessions / picks / avg picks/session), 4/7/30/90/365-day window selector, per-theme table with colour dots + green highlight when current share ≥40%, tip line on how to read it.
- Wired into Admin hub as "Theme Picks · Telemetry" card.
- Verified live with 5 seeded test picks: Soft Cellar 60% (green), Parchment 20%, Auto 20%, Cellar Night 0%.

  - Untagged visits default to `direct`
- **New `/admin/funnel` page** (`AdminFunnel.tsx`, 200 LOC): inline SVG sparkline (no chart lib), window selector (7/30/90 days), sortable per-source table with friendly display labels, share-of-traffic %, and last-visit-ago. Tip text at the bottom suggests *"if free-paused converts well, consider lowering `DAILY_FREE_BUDGET_USD` to surface the prompt sooner"* — pairs naturally with the tiered budget guard.
- **Admin hub** (`/admin`) now exposes a "Conversion Funnel" tool card → `/admin/funnel`.
- Verified live (iter 11, **21/21 backend + 100% frontend pass, 0 critical**): 10 seeded views aggregated correctly (free-paused 30%, homepage-hero 20%, 5 others 10% each); window selector refetches; pricing page auto-logs exactly once; tagged CTAs carry correct `?from=`; regression pages all return 200.
- **Polish applied**: removed dead-code ternary, made `userId: number | null = null` explicit, kept `KNOWN_SOURCES` as documentation-only.

**Friendly Free-Tier Paused UX → Sales Funnel (28 Jun 2026, this session)**
- When free-tier LLM budget is exhausted, `freeRun.curiosityAsk` returns a structured `paused` payload (questions not charged, message not persisted), and `/free-run` renders an amber "Daily AI Budget Reached" card with a Premium upsell CTA. Direct conversion driver — the guard-rail doubles as a sales funnel.

**Red Crush + White Crush themes + theatrical cascade (28 Jun 2026)**
- Two harvest-themed light themes: 🍇 Red Crush (rose-pink `--ow-accent-live`) and 🍏 White Crush (apple-green). 19:1 contrast, stronger borders for sun-glare survival.
- `CrushCascade` component fires a 1700ms juice-wave animation only when switching INTO red-crush/white-crush. Deep colour washes down with caption ("Pink of Pinot juice on the press" / "Apple-green of Chardonnay fresh off the picker"). Pure CSS, scoped inline. Respects `prefers-reduced-motion`.

**Cascade hardening + Theatrical hero pattern + 4-second cinematic crush (29 Jun 2026, this session)**
- **Bug fix + redesign**: User initially reported cascade not visible after Git push, then after first hardening reported "transitions feel instant — I never see the full crush header colour". Cascade was redesigned for theatrical impact AND robustness:
  - **Duration 1700ms → 4000ms** with explicit hold-phase keyframes: `0%→-100% / 22%→0% / 72%→0% / 100%→100%`. Gives a ~2-second hold where the entire viewport is a SOLID deep wine-rose / apple-green wash with the full title + emoji + story caption visible.
  - **Wave element 100vh → 200vh tall**, gradient stops 0% / 78% / 92% / 100% so the top 78% is opaque solid color. When translated to peak (`translateY(0%)`), the entire viewport sees the SOLID portion — no background bleed-through.
  - **Caption upsized**: emoji 3.5rem → 5rem; title 1.8rem → 2.6rem; story 0.95rem → 1.05rem. Subtle 1.0→1.03 scale-up animation during hold for cinematic feel.
  - **MutationObserver fallback** — fires cascade even if `ownology:crush` event is missed (e.g., a deploy path that programmatically sets the theme class).
  - **Page-load suppression** — `initialClasses` Set pre-populated from `localStorage.ownology-theme` so a returning visitor with a stored crush theme does NOT see a false-fire on page load.
  - **De-dup cooldown** 400ms → 600ms to account for slower animation; prevents event + observer race.
- **New diagnostic page `/cascade-demo`** (`/app/client/src/pages/CascadeDemo.tsx`) — three test sections with hammer-able buttons: (1) Event-only (just dispatches the event); (2) Class-only (toggles `theme-red-crush` on `<html>` via classList to verify observer path); (3) Full flow (real picker behaviour). Live event log shows every fire. Solves "I don't see the cascade" on third-party deploys by isolating the animation from any unrelated UI.
- **Picker sync fix** (`/app/client/src/components/ThemeToggle.tsx`): Home has TWO `ThemeToggle` instances (desktop nav + floating bottom-right). Each had its own `useState`, so switching via one left the other displaying a stale label. New `ownology:theme` custom event + `storage` event listener inside `useOwnologyTheme` keeps every picker in sync.
- **New `<HeroTheatricalPattern />` component** (`/app/client/src/components/HeroTheatricalPattern.tsx`, ~140 LOC) — persistent ambient overlay for marketing heroes. 7 vertical translucent stripes (CSS-only infinite keyframe loop) drift slowly down the hero. Theme-reactive via `--ow-accent-live`. Blend mode auto-flips between `screen` (dark) and `multiply` (parchment) so the pattern stays visible on every theme. `pointer-events:none` + `zIndex:1`.
- **Wired into 3 marketing heroes**: `/home`, `/why-ownology`, `/competitive-advantage`.
- Verified live: 4s cascade captured at 600ms (wash-in), 1500ms (full hold), 2500ms (still hold), 3500ms (draining) — every frame shows the full solid color wash with crisp title visible during the hold phase.

**Drizzle migration baseline (29 Jun 2026, this session)**
- **Problem**: Live Railway MySQL had all 34 tables (originally from Manus' `drizzle-kit push` + augmented via raw SQL scripts), but `__drizzle_migrations` tracking table was EMPTY. Any future `drizzle-kit migrate` would have attempted to re-CREATE every existing table → `ER_TABLE_EXISTS_ERROR`.
- **Fix**:
  1. Ran `drizzle-kit generate --name resync_baseline` to capture drift between `schema.ts` and snapshot 0020 → produced `drizzle/migrations/0021_resync_baseline.sql` with the two missing tables (`outreach_contacts` + `theme_picks`) and their indexes.
  2. Tightened `themePicks.isFirstPick` from `int` → `boolean` in `schema.ts` to match the live DB's actual `tinyint(1)` column type (set by `scripts/add-theme-picks-table.mjs`).
  3. Created `scripts/baseline-drizzle-migrations.mjs` — reads every entry from `_journal.json`, computes SHA-256 of each `.sql` file content (Drizzle's exact algorithm per `node_modules/drizzle-orm/migrator.js:23`), and INSERTS one row per migration into `__drizzle_migrations` with the original `when` epoch as `created_at`. Idempotent.
  4. Ran the script — 22/22 migrations recorded (0000 through 0021). Verified `drizzle-kit migrate` is now a clean no-op ("migrations applied successfully" with zero new statements). Verified `drizzle-kit generate` reports "No schema changes, nothing to migrate" — confirming schema.ts and live DB are fully aligned.
- **Net effect**: Future `drizzle-kit migrate` is now SAFE on Railway prod — only newly-generated migration files will run, and the schema-vs-DB drift that bypassed migrations is resolved.


  1. **Doesn't charge a question** against the user's daily 3/3 quota (free user not punished for an outage)
  2. **Doesn't persist the synthetic message** to the Cellar Journal
  3. **Returns a structured payload** `{ paused: true, pausedTier, pausedMessage, retryAt, questionsUsed, questionsTotal }` so the UI can render the right state
- Detection: substring match on the canonical synthetic phrase "temporarily paused" (case-insensitive) — robust to em-dash / en-dash / hyphen copy-edits in the underlying shim message.
- Tier-aware copy: `free` tier gets "Premium members keep going — upgrade for unlimited"; `overall` tier gets the neutral "we'll be back at UTC midnight" message.
- `/free-run` UI: amber-tinted card (#FEF3C7) with "✦ DAILY AI BUDGET REACHED" badge and a bright "Upgrade to Premium →" CTA pointing at `/pricing`. Deep Dive button suppressed on paused cards. Uses wouter `<Link>` for SPA navigation (no full-page reload).
- Verified live (iter 10, 5/5 backend + 5/5 frontend pass, 0 issues): paused calls leave `questionsUsed=1` unchanged across 3 consecutive paused requests; `cellarJournal.list` row count identical before/after paused interactions; restored budget produces real answers again.
- **Direct conversion driver** — the guard-rail is no longer just a defensive cap; it's a sales funnel that surfaces Premium upsell at the exact moment of unmet demand.

**Tiered LLM Budget Guard (28 Jun 2026, this session)**
- Three tiers with independent budgets:
  - **free** (`DAILY_FREE_BUDGET_USD`, default $3) — anonymous & free-quota Curiosity calls. Pauses first.
  - **premium** (`DAILY_PREMIUM_BUDGET_USD`, default $8) — tutor, paying-tier features. Pauses second.
  - **system** (intentionally uncapped) — internal classifiers, embeddings, scheduled jobs. Only subject to the overall `DAILY_LLM_BUDGET_USD` ($10) safety cap.
- **Classifier** in `llmMeter.classifySource(source)`: maps `x-ow-source` header (or stack-trace-derived `direct:<file>:<line>` tag) to a tier via prefix matching. Unknown sources default to `free` AND emit a one-time WARN so silent mis-attribution is impossible.
- **Enforcement** in `forgeShim.isCallPaused(source)`: tier budget checked first, overall cap second. Synthetic OpenAI-shaped response returned with tier-specific copy: "AI free-tier service temporarily paused — Premium members are still served" vs "AI service temporarily paused — overall budget hit".
- **Critical bug fixed during impl**: shim was checking pause status BEFORE deriving the stack-trace source, so ALL direct-fetch sites (tutor, vintageLog, queryRouter, …) were misclassified as `free` tier. Fix: `sourceForGuard = sourceFromHeader ?? deriveSourceFromStack()` computed BEFORE the pause check.
- **Visibility**: `/stats` page now shows a "Per-tier guard" section with 3 rows. Each row has its own progress bar, colour (grey / amber / green), and "PAUSED" red label when exceeded. System row shows "uncapped" instead of a bar.
- **Verified live** (iter 9, 27/27 backend + frontend pass): with free=$0.0005, freeRun.curiosityAsk #2 paused while tutor.ask immediately returned a real Riesling answer — exactly the "paying members never starved by a free spike" guarantee. Overall-cap regression with budget=$0.0003: even system-bound queryRouter paused when overall hit.
- Synthetic responses carry headers `x-ow-budget-paused: 1`, `x-ow-budget-reason: tier|overall`, `x-ow-budget-tier: free|premium|system` for downstream log filtering.

**Daily LLM Budget Guard-Rail (28 Jun 2026, this session)**
- New env var `DAILY_LLM_BUDGET_USD` (default $10). When today's accumulated spend reaches the budget, `server/_core/forgeShim.ts` returns a synthetic OpenAI-shaped success response with content `"AI service temporarily paused — Ownology has reached today's AI budget…"` for every chat-completion request. Every existing caller's `data.choices[0].message.content` access works unchanged — they just receive the graceful message instead of a real answer.
- Counter auto-resets at UTC midnight via `rollDailyIfNeeded()`. Manual override: new `admin.resetDailyBudget` owner mutation.
- Surfaced on `/stats`: new "Today's Budget" card with progress bar, remaining-$ message, red border + PAUSED label when exceeded.
- `admin.llmStats` now includes `daily: { dateKey, spendUsd, budgetUsd, exceeded, remainingUsd }`.
- Verified live (iter 8, 16/16 backend + all 3 frontend states pass): with a $0.0003 test budget, call 1 spent $0.00043 (under budget → real answer), call 2 hit the guard and returned synthetic "paused" response. `admin.resetDailyBudget` cleared spend; subsequent calls succeeded again.
- Synthetic responses do NOT increment the meter (usage:0/0/0) — so /stats KPIs remain accurate.

**Three P1 Items Shipped (28 Jun 2026, this session)**
- **Daily Cellar Brief email** — `GET/POST /api/scheduled/daily-alert-email` Express route. Uses Resend SDK. Loops over users, computes alerts via `computeAlertsForUser()` (extracted from the tRPC alerts proc into a reusable export), renders HTML+text email with severity-coded alert blocks, sends via Resend. Env knobs: `RESEND_API_KEY` (set), `ALERT_FROM_EMAIL` (`onboarding@resend.dev` for sandbox), `ALERT_FROM_NAME`, `ALERT_TEST_TO` (Resend sandbox only delivers to the verified account email — set to `iamrjpurr@gmail.com`), `CRON_SECRET` (optional guard for live sends; dry-runs always open). Live send verified — Resend message ID `a206cc1b-15e7-4850-8d30-a757187c922d`. Cron schedule for prod: Railway cron → `7 0 * * *` UTC ≈ Sydney 10am AEST (adjust for daylight). Dry-run via `?dryRun=1`.
- **Vintage Comparison view** (`/the-press/compare`) — pure data composition over `vintage_log_entries`. Pick 2-6 tanks; each card shows variety, yeast strain, ferment duration (inoc→dry), start/final Brix, YAN range, peak temp, avg pH, DAP/SO₂ addition counts, last 5 decisions ("Why?" reasoning). New tRPC proc `vintageLog.compareTanks(tankNames[])`. Discoverability link added at top of `/the-press`. Standalone full-width page (bypasses WorkModeLayout's 430px mobile cap).
- **`admin.resetFreeRunQuota`** owner mutation — optional `userId` (omit → clears today's quota for all users). Closes the CI friction point the testing agent flagged.

**LLM Cost Meter — Universal coverage (28 Jun 2026, this session)**
- Closed the coverage gap flagged earlier. Previously only `freeRunRouter` calls (via `chatCompletion`) were metered; ~15 direct `fetch()` LLM call sites in `routers/tutor.ts`, `routers/vintageLog.ts`, `merch/api.ts`, `queryRouter.ts`, `trinityPipeline.ts`, `routers.ts`, `sopEmbeddings.ts` were invisible.
- **Architecture change**: `server/_core/forgeShim.ts` is now the SINGLE SOURCE OF TRUTH for metering. The shim already wraps `globalThis.fetch` to inject default model + rewrite `max_tokens`. It now ALSO clones every successful chat/completion response, parses `usage.prompt_tokens` + `usage.completion_tokens`, and calls `recordLlmCall(model, in, out, source)`.
- **Source tagging** (priority):
  1. Explicit `x-ow-source` request header (set by `chatCompletion()` in `_core/llm.ts` from `opts.source`). Produces clean tags like `freeRun.curiosityAsk`, `tutor.ask`.
  2. Stack-trace walk in `deriveSourceFromStack()` — finds first frame inside `/server/`, returns `direct:<basename>.ts:<line>` (e.g. `direct:tutor.ts:725`). Auto-captures every untagged direct fetch site for free.
  3. Fallback: `direct:unknown`.
- `chatCompletion()` no longer calls `recordLlmCall` itself (would double-count). It just injects the `x-ow-source` header.
- Unknown-model warning: `recordLlmCall` now logs `console.warn` the first time a model is seen without a PRICING entry, so silent miscosts can't accumulate when a new model is introduced.
- Verified live (iter 6, 8/8 backend pass): freeRun.curiosityAsk + tutor.ask + 3 parallel tutor.ask all metered correctly. `/stats` now displays 4 source rows including `direct:tutor.ts:725` + `direct:queryRouter.ts:89` that were previously invisible.
- Caveat for production: stack-trace tagging requires source maps / unminified server — works in `tsx` dev mode and Railway nixpacks (no bundler). If a future build step minifies the server, source tags will collapse to `direct:bundle.js:<line>` and lose attribution — at which point the path forward is to add explicit `x-ow-source` headers to each direct fetch call site.

**Batch 2 — Value Engineered feature upgrades (28 Jun 2026)**
- **Tank QR codes** (`/tank-qr`) — printable QR code per unique tank in cellar history (`client/src/pages/TankQr.tsx`, 90 LOC). Each QR encodes `/quick-entry?tank=<TankName>&variety=<Variety>` so cellar staff scan with phone → land on pre-filled QuickEntry. Bridges physical → digital. QuickEntry already supports the URL params (line 263-269). Verified live: 10 QR cards render (Tank 1/12/2/3/4/5/7/8/9/Test 1).
- **Compliance Audit Trail PDF** (`GET /api/compliance/audit-trail.pdf?days=N`) — Express endpoint using `pdfkit`. Filters `vintage_log_entries` to compliance-relevant events (event type: addition/racking/inoculation/measurement OR keyword match: so2/yan/dap/ph/ta/abv/brix/mlf etc) and produces a regulator-ready chronological export with timestamps, tank, variety, details, notes, and operator reasoning. CTA button placed on `/compliance` page (`compliance-audit-trail-download`). Verified live: returns 5256-byte valid PDF starting with `%PDF-1.3`.
- **Public Stats transparency page** (`/stats`) — pulls from `admin.llmStats` and surfaces total LLM spend, by-model breakdown, by-source breakdown, and a "$99/mo covers ~X AI calls" explainer. Refetches every 60s. Unique trust signal — no SaaS does this. **Caveat**: currently behind `ownerProcedure` but works in dev because auth-bypass user is admin. Convert `llmStats` to `publicProcedure` when real auth lands, or `/stats` will 401 publicly.
- All three verified end-to-end in `/app/test_reports/iteration_5.json` (15/15 backend + 8/8 frontend).
- Regression file: `/app/backend/tests/test_batch2_features.py`.

## What's been implemented (27 Jan 2026)
- Mockup page in Emergent's default React stack ("Cellar Journal" aesthetic) — used as design exploration before the lift-and-shift.
- Full lift-and-shift import of the Manus codebase into `/app`.
- pnpm install of all 100+ deps; Drizzle schema pushed to Railway MySQL.
- Supervisor reconfigured; Vite (3000) + Express (8001) both running.
- Smoke-tested pages render: `/`, `/the-press`, `/knowledge`, `/free-run`.
- 7 core SOPs seeded (`seed-sops.mjs`).

## Backlog / Next actions

(See the consolidated P0–P3 roadmap below — the older 27 Jan 2026 backlog items
have been folded in or marked complete.)

**P0 — Ship blockers for first paying member**
- [ ] **Real auth** — replace HTTP Basic Auth gate (Emergent Google Login or JWT).
- [ ] **Real Stripe wiring** — `sk_test_stub` is the current placeholder; wire Founding Member + merch checkout end-to-end with `sk_test_emergent`.
- [ ] **Custom domain DNS** — point `ownology.ai` at Railway (or Emergent preview).
- [ ] **Verify Railway auto-deploy** post Drizzle baseline.

**P1 — High-value compounders**
- [ ] Trigger cascade from a homepage CTA so cold SMS prospects see the wow moment.
- [ ] Auto-bypass "Create account" modal in dev (`authCheck` → `isAuthenticated: true` when bypass user active).
- [ ] Drop Red/White Wine Bible PDFs into `/app/references/` for next ingest pass (USER ACTION required to supply files).
- [ ] Convert `admin.llmStats` → `publicProcedure` so `/stats` works post-auth.

**P2 — Polish & operational resilience**
- [ ] Theme × conversion A/B card on `/admin/themes-stats`.
- [ ] Wire scheduled cron jobs (campaign metrics, vintage reminders, regulation monitor, fermentation watch, trinity cluster, trinity newsletter).
- [ ] `pnpm db:migrate` prestart hook for Railway auto-migrate.
- [ ] Prune off-roadmap pages (60+ from Manus import).
- [ ] PWA install banner + service worker check.
- [ ] Fix seed scripts: `seed-mock-data.mjs` (uses `openId`, schema is `open_id`), `seed-quick-steps.mjs` (expects SOP ids 60005–60042 that don't exist).
- [ ] Audit remaining `import.meta.env.VITE_FRONTEND_FORGE_*` usages.
- [ ] HeroTheatricalPattern `blendMode` prop + StrictMode keyframe hardening (forward-looking from iter_15 review).

**P3 — Future / post-PMF**
- [ ] Multi-tenant winery data model (`winery_id` FKs throughout).
- [ ] File/Image uploads via Emergent Object Storage.
- [ ] Native iOS/Android apps.
- [ ] Suppress `outreach.markViewed` 400s on non-`/hi` routes (carried from iter_12).
- [ ] AdminContactsPipeline mobile layout polish (deferred from iter_14).

**Completed (historical — kept for audit trail)**
- [x] Lift-and-shift Manus codebase into `/app` (27 Jan 2026)
- [x] LLM model + wiring → claude-sonnet-4-6 + gpt-5.4-mini hybrid (27 Jan 2026)
- [x] All 38 SOPs seeded across 12 canonical categories (27 Jan 2026, verified 29 Jun 2026: total=38, published=38)
- [x] Drizzle migration baseline — `__drizzle_migrations` populated with all 22 records (29 Jun 2026)
- [x] CrushCascade 4-second cinematic redesign + diagnostic page + picker sync fix (29 Jun 2026)
- [x] HeroTheatricalPattern wired into 3 marketing pages (29 Jun 2026)

## Test credentials
- Dev bypass user (auto-injected when NODE_ENV != production):
  - openId: `seed-owner-001`
  - name: `Redstone Ridge Wines`
  - email: `cellar@redstoneridge.com.au`
  - role: `admin`
- No real login required during development.

## Service URLs
- Preview: https://ownership-dev.preview.emergentagent.com
- DB: Railway MySQL — `reseau.proxy.rlwy.net:34291/railway`
- Repo: https://github.com/iamrjpurr-pixel/ownology
