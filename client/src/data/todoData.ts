/**
 * todoData.ts — Ownology internal roadmap.
 *
 * Source of truth for the /todo page. /todo is now MEMBER-only (default-deny
 * gate wall, Feb 2026) — anonymous visitors 302 → /try, and the page 404s on
 * the production hostname `ownology.ai`. That means we can be blunt and
 * technical here without hiding items.
 *
 * Update rule: every time we ship, add, or reprioritise something, edit
 * this file. The /todo page re-renders on next deploy. No CMS, no drift.
 *
 * Priority key:
 *   p0       — must ship before first paying customer
 *   p1       — launch protection or high-leverage growth
 *   p2       — polish, done after real usage data
 *   p3       — hygiene / backlog
 *   blocked  — waiting on someone/something outside the codebase
 *
 * Status key:
 *   not-started · in-progress · done · blocked
 */

export type TodoPriority = "p0" | "p1" | "p2" | "p3" | "blocked";
export type TodoStatus = "not-started" | "in-progress" | "done" | "blocked";

export interface TodoItem {
  id: string;
  title: string;
  /** 1-3 sentences a non-technical reader understands. */
  description: string;
  priority: TodoPriority;
  effort: string;
  status: TodoStatus;
  /** Grouping label — appears as small caption above the title. */
  category: string;
  /** ISO date (YYYY-MM-DD) — when Rich/agent added it or last touched it. */
  updatedAt: string;
}

/** ISO timestamp of the last edit to this file. Bump when you edit anything.
 *  Displayed at the top of /todo so visitors can see the roadmap is alive. */
export const LAST_UPDATED = "2026-02-06";

export const TODO: TodoItem[] = [
  // ═══ 🔴 P0 · Must-fix before first paying customer ═══
  {
    id: "auth-scope-endpoints",
    title: "Hide member data from anonymous API calls",
    description:
      "The default-deny gate wall (Feb 2026) blocks browser access to /dashboard, /cellar-brief, /admin etc. But the tRPC endpoints themselves still default to seed-owner-001 when there's no session — a determined attacker could pull live Ownology Cellars data via /api/trpc directly. We need every member endpoint to require a real logged-in user and scope by winery_id. Same fix applies to the LIP Audit Pack PDF.",
    priority: "p0",
    effort: "~4-6 hours",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-02-06",
  },
  {
    id: "rotate-jwt-secret",
    title: "Rotate JWT_SECRET and gate password before first paying member",
    description:
      "JWT_SECRET is still the seeded default in /app/.env. Gate password was `changeme-set-real-password` up to Feb 06 (now rotated to a real value). Both need one more rotation on the Railway prod deploy so preview and prod use different secrets. Zero code change — env update only.",
    priority: "p0",
    effort: "~10 min",
    status: "in-progress",
    category: "Safety",
    updatedAt: "2026-02-06",
  },

  // ═══ 🟠 P1 · Launch protection & growth ═══
  {
    id: "gate-rate-limiter-hardening",
    title: "Redis-backed gate rate limiter + IP allowlist",
    description:
      "Current limiter is in-memory (5 attempts / 15 min per IP) and per-pod, so multi-replica Railway prod deploys let an attacker dodge by rotating pods. Also trips too easily under legitimate QA — self-tripped 3× during pre-demo validation. Swap for Redis-backed limiter, widen to ~30/hour, add OWNOLOGY_GATE_RATE_LIMIT_ALLOWLIST env for preview/office IPs. Found during Feb 2026 pre-demo E2E.",
    priority: "p1",
    effort: "~90 min",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-02-06",
  },
  {
    id: "daily-cellar-brief-email-cron",
    title: "Schedule the 7am Sydney Cellar Brief + Marketing Coach emails",
    description:
      "Code is fully shipped in server/scheduled/dailyAlertEmail.ts and marketingCoachEmail.ts. Just needs (a) a Railway cron entry `0 21 * * *` UTC ≈ 7am Sydney AEDT, (b) verified sender domain in Resend for cellar@ownology.ai, (c) CRON_SECRET set in Railway env. Turns Ownology from 'log-in-when-I-remember' into a daily habit — highest-leverage retention move.",
    priority: "p1",
    effort: "~30 min (Railway dashboard + Resend DNS)",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "vivid-outreach-push",
    title: "Send /try + /hi/producers/:id previews to first 10 warm contacts",
    description:
      "Actually send the ownology.ai/try link and a personal Cellar Brief preview URL to 5-10 of the seeded VIVID contacts we already have. Watch conversations, note where prospects drop off, feed observations back into the sandbox. Zero code — 15 minutes of Rich's time. Everything else on this roadmap benefits from real data first.",
    priority: "p1",
    effort: "~15 min (Rich)",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "cold-email-3-touch-resend",
    title: "3-touch Resend cold-email sequence",
    description:
      "Deferred until the prospect list hits 200+. Currently we're on manual Compose modal flow (mailto: from Rich's inbox). When AU+NZ producer directory expands past 200 rows, wire an automated 3-touch Resend engine with unsubscribe + Australian Spam Act 2003 compliance. SMS pipeline stays for warm/hot leads only.",
    priority: "p1",
    effort: "~5-7 hours",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "csv-ocr-import-lanes",
    title: "Complete Import Anything — CSV + OCR lanes",
    description:
      "Voice → Whisper lane is SHIPPED (see /import VoiceTab). Still needed: (a) Excel/Google Sheets/CSV drag-drop with column mapping UI, (b) photograph of paper cellar log → OCR via GPT-5.2 multimodal or Google Cloud Vision → parsed entries. Kills the switching-cost objection at Day 1. Voice was the hardest lane; CSV+OCR are shorter builds.",
    priority: "p1",
    effort: "~4-5 hours (CSV) + ~3 hours (OCR)",
    status: "in-progress",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "quiz-red-white-and-v-and-v",
    title: "Quiz refactor: Red or White as Q1, plus source citations everywhere",
    description:
      "Fix the crossover confusion where someone picks 'red fruit' but the quiz can return a white wine (or vice versa). Make Red-or-White the first hard-filter question, then the remaining questions operate inside that colour family. At the same time, add source citations under every quiz question — blending UC Davis Wine Aroma Wheel (Ann Noble, 1987), WSET Level 2 tasting framework, Naked Wines and Wine Folly consumer descriptions, and Halliday Wine Companion regional anchors. Every answer defensible if a curious prospect asks 'who says?'",
    priority: "p1",
    effort: "~2.5 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-04",
  },
  {
    id: "custom-domain-dns",
    title: "Point ownology.ai DNS to Railway",
    description:
      "In Railway → ownology service → Settings → Networking → Custom Domain. Add ownology.ai (and www.ownology.ai), get a CNAME/A record value, add to DNS host. Blocked on deployment-sync issue that Emergent Support is fixing (see Blocked section).",
    priority: "p1",
    effort: "~10 min once Emergent Support unblocks deploy",
    status: "not-started",
    category: "Ops",
    updatedAt: "2026-02-06",
  },

  // ═══ 🟡 P2 · Conversion polish (do after data) ═══
  {
    id: "server-index-split",
    title: "Split server/index.ts (1168 LOC)",
    description:
      "Well past the 700-line threshold. Extract: gate middleware + invite handler → server/gateHandlers.ts; scheduled handlers → server/scheduled/index.ts; SPA meta injection → server/spaMeta.ts; sample-vintage-log alias + audit routes → server/publicRoutes.ts. Prevents merge conflicts as team grows. Do this as part of the Phase 2 router refactor.",
    priority: "p2",
    effort: "~2-3 hours",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-06",
  },
  {
    id: "phase-2-router-refactor",
    title: "Phase 2 router refactor — extract 4 remaining sub-routers",
    description:
      "server/routers.ts is 1556 LOC after Phase 1 (was 3239). Next targets: complianceRouter (~212 LOC), siteContentRouter (~213 LOC), cellarTasksRouter (~148 LOC), cellarEquipmentRouter (~98 LOC). Playbook: BEFORE deleting a sub-router from routers.ts, grep for all `from '../db.js'` and `from './trpc.js'` symbol references AND audit which are still needed by the remaining routers. The Phase 1 dashboard.getStats regression was caused by skipping this step.",
    priority: "p2",
    effort: "~3-4 hours",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-06",
  },
  {
    id: "ask-seo-flywheel",
    title: "Public /ask page — SEO flywheel",
    description:
      "Single new public page where any visitor types any winemaking question → AI answers grounded in our private bible-RAG → every Q auto-saves to cellar_journal as a gated public SEO page. Trinity clustering already handles canonicalisation. Each answer = 1 new SEO entry growing organic traffic for free.",
    priority: "p2",
    effort: "~2 hours",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "the-press-vintage-debrief",
    title: "/the-press post-harvest correlation engine",
    description:
      "For each finished batch, generate a debrief: 'Your tanks fermented at 18°C averaged 1.5 days faster than 19°C tanks. Recommend 18°C as 2027 standard.' Needs: vintage_summaries table (winery_id, vintage_year, batch_id, final_metrics_json, quality_score, AI_debrief_md); cron job after a batch is marked Complete; LLM correlation call. UI at /the-press/vintage/{year}.",
    priority: "p2",
    effort: "~4-5 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "multi-tenant-winery-model",
    title: "Multi-tenant winery model",
    description:
      "Add `wineries` (id, owner_id, name, region, total_tanks) + `winery_members` (winery_id, user_id, role: owner/cellar_lead/harvest_intern). Add winery_id FK to vintage_log_entries, sop_library, cellar_journal. Role-based gating in trpc.ts. Required for the enterprise tier and any cellar-team subscription.",
    priority: "p2",
    effort: "~1-2 days",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "live-llm-try-step-5",
    title: "Live LLM in /try Step 5",
    description:
      "Step 5 of the /try sandbox — verify the Ask-Ownology step is actually live (via Emergent LLM key). If the previous 'hardcoded scripted' concern is fixed, mark this done. Otherwise upgrade with a system prompt that pins the model to Ownology Cellars' demo data only. Do this after we've watched 5 prospects actually go through /try.",
    priority: "p2",
    effort: "~45 min (verify + refine)",
    status: "in-progress",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "hi-name-personalized-landing",
    title: "Personalized landing at /hi/{name}",
    description:
      "Add a URL pattern like ownology.ai/try?name=Sam that prepends 'Rich sent this to you, Sam' at the top of Step 1. Small touch, high-leverage for cold outreach. Feels handmade to the prospect. Sibling to the already-shipped /hi/producers/:id Cellar Brief preview.",
    priority: "p2",
    effort: "~30 min",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-04",
  },
  {
    id: "alerts-2-and-3-branching",
    title: "Branch Alerts 2 and 3 through the /try workflow",
    description:
      "Only the red alert (stuck ferment) currently advances the sandbox tour. If observed prospects click the yellow (MLF/SO₂) or green (barrel topping) alerts and hit a dead-end, build full branches for those too — each with its own chemistry, decision options, sources, and journal entry. Only worth building if the data shows prospects actually click them.",
    priority: "p2",
    effort: "~1 hour",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-04",
  },
  {
    id: "sentry-error-monitoring",
    title: "Error monitoring (Sentry)",
    description:
      "Basic error tracking so we know when the app breaks in production. Right now if a prospect hits an error, we find out from them. Sentry gives us the stack trace immediately.",
    priority: "p2",
    effort: "~30 min",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-02-04",
  },
  {
    id: "cost-guardrail-alert-email",
    title: "Cost guard-rail alert emails",
    description:
      "When a tier flips to PAUSED (free-tier budget hit), fire a Resend email to the operator: 'Free tier paused at 9:14am Sydney — 47 free-tier calls served, $3.00 spent. Consider raising DAILY_FREE_BUDGET_USD?' Catches budget-tuning issues in real time instead of finding out from user complaints.",
    priority: "p2",
    effort: "~20 min",
    status: "not-started",
    category: "Ops",
    updatedAt: "2026-02-06",
  },

  // ═══ ⚪ Blocked / waiting ═══
  {
    id: "prod-deploy-sync",
    title: "Emergent production deploy sync",
    description:
      "Preview environment builds fine, but pushing to production has a stale-bundle / commit-sync mismatch. Blocked on Emergent Support. Once cleared, every fix on the preview URL (including today's /i/:token routing patch and default-deny gate wall) can be released to ownology.ai.",
    priority: "blocked",
    effort: "~0 (Emergent Support)",
    status: "blocked",
    category: "Ops",
    updatedAt: "2026-02-06",
  },
  {
    id: "live-stripe-keys",
    title: "Swap Stripe test key for live keys",
    description:
      "The Stripe integration currently uses a test-mode stub (sk_test_stub). Once Rich provides live Stripe keys (from the Stripe dashboard), we swap them in and we can accept real payments. Blocked on the key handoff.",
    priority: "blocked",
    effort: "~15 min once keys arrive",
    status: "blocked",
    category: "Payments",
    updatedAt: "2026-02-06",
  },
  {
    id: "halliday-lookup-launcher",
    title: "Halliday personal-lookup launcher",
    description:
      "Small tool inside Ownology (at /admin/producer-lookup) that lets Rich type a winery name and deep-link straight to that producer's Halliday Wine Companion profile. Uses Rich's own Halliday login — no scraping. Just a bookmark launcher so Rich doesn't lose flow when researching a prospect. Optional.",
    priority: "blocked",
    effort: "~30 min",
    status: "not-started",
    category: "Ops",
    updatedAt: "2026-02-04",
  },

  // ═══ 🔵 P3 · Backlog / hygiene ═══
  {
    id: "twilio-sms-outbound",
    title: "Twilio SMS outbound",
    description:
      "Wire Twilio for high-severity cellar alerts (stuck ferment, high temp >26°C). Cellar floor doesn't always check email. Deliberately deferred — only worth building after manual SMS volume exceeds 200/week.",
    priority: "p3",
    effort: "~2 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "jsea-swms-generator",
    title: "JSEA / SWMS on-demand generator (v2 vision)",
    description:
      "The compounding-data thesis. Once a winery populates its asset list and training records, drive operator training manuals + SWMS/JSEA docs using the existing 13 indexed MoreWine SOPs + Model WHS Act. Requires asset registry model + employee training model first. Estimated 3-4 weeks after data models are in — don't start until wine-quality product has retained users.",
    priority: "p3",
    effort: "~3-4 weeks",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "native-mobile-apps",
    title: "Native iOS + Android apps",
    description:
      "Wrap the existing PWA in Capacitor for app-store distribution + real push notifications. Lets daily-alert-email become daily push (much higher engagement). Worth it once 50+ wineries onboard and they're complaining about iPad-only cellar use.",
    priority: "p3",
    effort: "~1-2 weeks",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "file-image-upload-archive",
    title: "File/image upload archive (Emergent Object Storage)",
    description:
      "Photos of harvest, lab reports, certificates of analysis, must samples. Vector-RAG over OCR'd content unlocks 'ask the AI about this barrel's chromatography from last year'. Currently deferred — AI flow extracts structured data straight to vintage_log_entries so raw PDFs/photos aren't strictly needed.",
    priority: "p3",
    effort: "~4 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "compliance-audit-pdf-onboarding",
    title: "Winery onboarding wizard",
    description:
      "First-time setup: name, region, tank count, varieties grown → seeds initial SOPs filtered by region. Make the first 5 minutes feel magical. Depends on multi-tenant winery model.",
    priority: "p3",
    effort: "~3 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "drizzle-migrations-baseline",
    title: "Re-baseline __drizzle_migrations",
    description:
      "drizzle-kit migrate currently doesn't record applied migrations (0 rows in __drizzle_migrations). Recent schema changes had to be applied via raw SQL. Either re-baseline by inserting historical migration tags, or switch the workflow to drizzle-kit push for live DBs.",
    priority: "p3",
    effort: "~1 hour",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-06",
  },
  {
    id: "refactor-python-tests",
    title: "Refactor Python test files",
    description:
      "Clean up the older Python test files inherited from previous sessions (test_iter18/19/20 all crash on collection because REACT_APP_BACKEND_URL isn't set at import time). Not blocking anything — cosmetic. Do when Rich or the agent has spare time between features.",
    priority: "p3",
    effort: "~2 hours",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-06",
  },
  {
    id: "branding-scraper-node-vibrant",
    title: "Winery branding scraper",
    description:
      "Small utility that takes a winery URL and pulls out their brand colours and logo using node-vibrant. Useful for auto-styling their /free-run/dashboard preview so new signups feel personalised immediately. Nice-to-have, not urgent.",
    priority: "p3",
    effort: "~2 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-04",
  },
  {
    id: "prospect-analytics",
    title: "Prospect analytics on /try",
    description:
      "Add a lightweight beacon that records which /try step people drop off on, feeding a widget on /admin/funnel. Only worth building once traffic on /try is over 20 visits per week — until then, 5-minute follow-up calls with real prospects tell us more than any dashboard would.",
    priority: "p3",
    effort: "~40 min",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-04",
  },
];

/** Recently-completed items — kept for momentum signalling on the public
 *  roadmap. Shown separately in the UI ("shipped in the last two weeks")
 *  so visitors can see we're actually building, not just talking. Prune
 *  entries older than ~60 days when this grows. */
export interface ShippedItem {
  id: string;
  title: string;
  description: string;
  shippedAt: string; // ISO date
}

export const RECENTLY_SHIPPED: ShippedItem[] = [
  {
    id: "invite-token-routing-fix",
    title: "/i/:token magic-link invite routing fix",
    description:
      "Express handler for the invite bypass was being swallowed by the K8s ingress on the preview URL (non-/api paths land on Vite, not Express). Added /i to vite.config.ts server.proxy — anonymous GET /i/<token> now returns 302 → /admin + sets ow_gate cookie. Demo attendees can be invited via magic link on preview.",
    shippedAt: "2026-02-06",
  },
  {
    id: "sitemap-audience-realignment",
    title: "SiteMap.tsx audience tags realigned with default-deny",
    description:
      "Cross-checked every route in the registry against server/index.ts PUBLIC_EXACT + PUBLIC_PREFIXES allowlist. Fixed 4 wrongly-tagged PUBLIC → MEMBER (/competitive-advantage, /compliance, /regulations), 4 wrongly-tagged ADMIN → PUBLIC (/cascade-demo, /branding-mockup, /onboarding-mockup, /resume), added 4 missing admin surfaces (/admin/producers, /admin/marketing-ops, /admin/gate-invites, /admin/quiz-picks) plus /hi/producers/:id. 102 routes now accurate.",
    shippedAt: "2026-02-06",
  },
  {
    id: "gate-password-rotated",
    title: "Gate password rotated from default",
    description:
      "OWNOLOGY_GATE_PASSWORD changed from the seeded `changeme-set-real-password` default to a real value. Backend restarted; new password verified accepted, old value rejected.",
    shippedAt: "2026-02-06",
  },
  {
    id: "pre-demo-e2e-validation",
    title: "Pre-marketing-calls E2E validation",
    description:
      "Full testing_agent_v3_fork sweep of every demo-critical surface: gate wall enforcement, /hi/producers/:id cold-email preview, /admin/producers Compose flow, /admin/marketing-ops AI coach, /try LLM sandbox, /risk-management doctrine, /pricing, sample-vintage-log 3 variants, sitemap, health, Perplexity + Resend + Emergent LLM keys. 54/56 pytest green.",
    shippedAt: "2026-02-06",
  },
  {
    id: "au-producer-bootstrap-perplexity",
    title: "AU/NZ producer bootstrap via Perplexity",
    description:
      "New /admin/producers page with Perplexity Sonar Pro region-bootstrap (~25 producers per region, ~$0.02/call, human-in-the-loop review before import) + per-row winemaker enrichment (91% first-pass hit rate). Verified live on Barossa Valley + McLaren Vale — zero hallucinated wineries.",
    shippedAt: "2026-02-06",
  },
  {
    id: "compose-modal-cellar-brief-preview",
    title: "Compose modal + public /hi/producers/:id Cellar Brief preview",
    description:
      "1-click Compose button on producer rows with 3 pill-style templates (Cellar Brief demo / Vintage-log intro / Peer share soft), mailto: send from Rich's own inbox. Every cold email now includes a personalised /hi/producers/:id preview URL that renders a region-aware Cellar Brief mockup (Central Otago pinot, Marlborough sauv blanc, Hawke's Bay syrah). Zero LLM cost per view.",
    shippedAt: "2026-02-06",
  },
  {
    id: "risk-management-doctrine-v1",
    title: "Risk Management doctrine v1",
    description:
      "New public /risk-management page — 12 wine-quality risks (7 quantitative from lab readings + 5 qualitative one-tap flags: Brett/TCA/oxidation/H₂S/sanitation). Explicit scope footer points prospects to Safe Work Australia + AWRI for WHS (positions Ownology as focused, not evasive). Qualitative capture UI live on every Cellar Brief vessel card.",
    shippedAt: "2026-02-06",
  },
  {
    id: "gate-wall-default-deny-flip",
    title: "Gate wall flipped to default-DENY",
    description:
      "Previously opt-in (block-list — any new page not added leaked publicly). Now default-deny (allowlist of ~50 explicit public paths + 6 prefixes — anything else redirects to /try). Correct fail direction for startup with private customer cellar data. Mirrored in Express prod + Vite dev.",
    shippedAt: "2026-02-06",
  },
  {
    id: "marketing-ops-dashboard-and-email",
    title: "Marketing Ops dashboard + 7am Sydney coach email",
    description:
      "/admin/marketing-ops — winemaker-psychology-aware daily/weekly ritual dashboard. Season strip (Sydney TZ), Claude-Sonnet-generated coach line (daily-cached, ~$0.005/day), KPI streak, today's focus tasks, weekly rhythm board. Handler for 7am Sydney Resend push shares the same cache (zero extra LLM cost). Code ready — awaiting Railway cron schedule + verified sender domain.",
    shippedAt: "2026-02-06",
  },
  {
    id: "nz-directory-scraper",
    title: "NZ Wine directory scraper — Sip+Dine cohort",
    description:
      "Cheerio-based scraper (scripts/scrape-nz-winery-directory.mjs) filtered to keyword=winery × tourism=sip+dine — the 23 highest-value NZ wineries (cellar-door hospitality + food = actively marketing cohort). 23/23 rows imported; 21 with emails, all 23 with regions.",
    shippedAt: "2026-02-06",
  },
  {
    id: "voice-import-whisper",
    title: "Voice memo → Whisper → structured entries",
    description:
      "The flagship 'Import Anything' voice lane. Winemakers speak a memo in the cellar (hands-free, muddy hands) → Whisper via Emergent LLM key transcribes with domain vocabulary hints (DAP, YAN, Brix, MLF, EC1118) → structuring LLM parses into vintage_log entries → user reviews + saves. Verified 3/3 entries from test memo ('Tank 7 Shiraz, added 2.6 kg DAP, Brix 14.2, pH 3.42').",
    shippedAt: "2026-01-27",
  },
  {
    id: "try-sandbox",
    title: "The /try sandbox",
    description:
      "A 10-minute guided walkthrough of a real winemaker's morning — stuck ferment, decision, log, Ask Ownology, publish. Uses Ownology Cellars data. No signup, no writes.",
    shippedAt: "2026-02-04",
  },
  {
    id: "admin-playbook",
    title: "Clickable Playbook at /admin/playbook",
    description:
      "45 SOP steps grouped by cadence (Daily / Weekly / Vintage-critical / 5 workflow SOPs / Troubleshooting). Every step is a clickable link to the actual URL where the work happens. Local checkboxes reset daily/weekly. Learning by clicking, not by reading.",
    shippedAt: "2026-02-03",
  },
  {
    id: "quiz-scoring-fixes",
    title: "Wine Quiz algorithm hardening",
    description:
      "Exhaustive test of all 2,304 answer combinations. Fixed: red-sweet no longer returns Sauternes (added colour-family scoring); Vermouth no longer dominates 14.7% of picks (specialty penalty); Sauv Blanc, Assyrtiko and entry Pinot Noir now reachable (palate differentiation).",
    shippedAt: "2026-02-04",
  },
];
