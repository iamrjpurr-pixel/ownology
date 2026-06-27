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

**Auth (current)**
- Manus OAuth removed. `protectedProcedure` falls back to a seed admin user (`DEV_BYPASS_USER` — id `seed-owner-001`) when `NODE_ENV !== "production"`. The user has been INSERTed into `users` table (id=1). Note: the `freeRun.authCheck` public procedure still reports `isAuthenticated: false` for unauthenticated browser sessions, so the UI shows a "Create account" modal. Backend API works without auth via curl/server-side.

**LLM (wired 27 Jan 2026 — hybrid)**
- All traffic routes through Emergent Universal LLM Key proxy at `https://integrations.emergentagent.com/llm/`.
- **Premium tier** (`claude-sonnet-4-6`) — explicit calls from `server/_core/llm.ts` adapter. Used by `freeRunRouter.ts` user-facing answers (`callLLM`, `callLLMJson`).
- **Cheap tier** (`gpt-5.4-mini`) — default for every other call site. Wired transparently via a `fetch` shim in `server/_core/forgeShim.ts` that intercepts POSTs to `…/chat/completions`, injects a `model` field if missing, and rewrites `max_tokens` → `max_completion_tokens` for GPT-5 family.
- Existing `BUILT_IN_FORGE_API_URL` / `BUILT_IN_FORGE_API_KEY` env vars now point at the Emergent proxy — zero changes needed to the ~30 call sites in `routers.ts`, `queryRouter.ts`, `sopEmbeddings.ts`, `trinityPipeline.ts`, `complianceKnowledgeBase.ts`, and scheduled jobs.
- Embeddings endpoint: `https://integrations.emergentagent.com/llm/openai/v1/embeddings` with `text-embedding-3-small`. Exposed via `embed()` in the adapter.
- Smoke-tested end-to-end: `freeRun.curiosityAsk` returns real, oenology-grounded answers + auto-extracted topic tags.

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

## What's been implemented (27 Jan 2026)
- Mockup page in Emergent's default React stack ("Cellar Journal" aesthetic) — used as design exploration before the lift-and-shift.
- Full lift-and-shift import of the Manus codebase into `/app`.
- pnpm install of all 100+ deps; Drizzle schema pushed to Railway MySQL.
- Supervisor reconfigured; Vite (3000) + Express (8001) both running.
- Smoke-tested pages render: `/`, `/the-press`, `/knowledge`, `/free-run`.
- 7 core SOPs seeded (`seed-sops.mjs`).

## Backlog / Next actions
**P0 — finish the import**
- [x] ~~Pick LLM model and wire~~ → DONE (claude-sonnet-4-6 + gpt-5.4-mini hybrid).
- [ ] Decide if the "Create account" modal blocking Free Run/Press in the browser should be auto-bypassed in dev (quick fix: make `authCheck` return `isAuthenticated: true` when bypass is active).
- [ ] Drop the **Guide to Red Winemaking** + **White Wine Bible** PDFs into `/app/references/` so I can chunk + embed them into `diy_knowledge_chunks`.
- [ ] Pick **real auth direction** (Emergent Google login / JWT email-password / keep dev bypass).
- [ ] Pick **storage** (Cloudinary or skip) — only needed if file uploads matter near-term.
- [ ] Pick **Stripe** (Emergent test key vs own keys) — only needed for merch / pricing flows.
- [ ] Seed the remaining 31 SOPs to reach the 38 advertised (current scripts only ship 7).

**P1 — known issues**
- `seed-mock-data.mjs` references `openId` column (schema uses `open_id`) — fails. Script bug, low priority.
- `seed-quick-steps.mjs` expects SOP ids 60005–60042; only 60001–60007 exist after current seed.
- Light/dark theme — currently defaults to dark; verify intended.
- Audit any remaining `import.meta.env.VITE_FRONTEND_FORGE_*` usages on the client.

**P2 — features deferred**
- Re-evaluate the 60+ pages, prune anything off-roadmap.
- Wire scheduled jobs (campaign metrics, vintage reminders, regulation monitor, fermentation watch, trinity cluster, trinity newsletter) into a cron runner.
- PWA install banner + service worker check.

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
