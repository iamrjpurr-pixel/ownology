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
export const LAST_UPDATED = "2026-02-15";

export const TODO: TodoItem[] = [
  // ═══ 🔴 P0 · Must-fix before first paying customer ═══
  {
    id: "daily-cellar-brief-email-cron",
    title: "Wire Railway cron for the 7am Sydney Cellar Brief email",
    description:
      "ENDPOINT + PIPELINE ARE LIVE (shipped Feb 06 — verified real send with Resend). All that's left: a scheduled trigger. Options: (a) Railway cron entry `0 21 * * *` UTC = 7am AEDT, POST to /api/scheduled/daily-alert-email with x-cron-secret header — recommended once prod deploy sync unblocks. (b) External free scheduler (cron-job.org, EasyCron) hitting the preview URL. (c) Emergent's built-in scheduler if available. ~5 minutes to configure whichever path.",
    priority: "p1",
    effort: "~5 min config",
    status: "in-progress",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "weather-widget-per-winery-config",
    title: "Per-winery weather widget location + threshold config",
    description:
      "Widget shipped Feb 06 with hardcoded Hunter Valley GPS + default AWRI-aligned thresholds. Widget component already accepts lat/lng/label as tRPC input. Slice 2 needed: (a) add lat/lng + weather_thresholds_json columns to wineries table via ALTER TABLE (or new winery_environmental_config table), (b) build /admin/settings/environment inputs for winery lat/lng (address → geocode via Open-Meteo geocoding API, no key), cellar type (passive/active/mixed), and custom threshold overrides, (c) rewire WeatherWidget to first fetch winery.currentEnv config then pass lat/lng into weather.currentAndForecast. Highest demo-value item for tomorrow's calls — prospects not in Hunter Valley see the wrong weather right now.",
    priority: "p0",
    effort: "~2-3 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "ask-seo-flywheel",
    title: "Public /ask page — SEO flywheel",
    description:
      "Single new public page where any visitor types any winemaking question → AI answers grounded in our private bible-RAG → every Q auto-saves to cellar_journal as a gated public SEO page. cellar_journal table already has embedding + variants columns for Trinity-style dedup — leverage that. Include JSON-LD Article schema in HTML source for Google. Each answer = 1 new SEO entry growing organic traffic for free. Zero infrastructure cost, compounds monthly.",
    priority: "p2",
    effort: "~2 hours",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-06",
  },
  {
    id: "weather-widget-sop-and-vintage-log-integration",
    title: "Weather widget → SOP deep-links",
    description:
      "Vintage-log logging is SHIPPED (Feb 06) — see 'Weather widget · Log environmental observation' in Recently Shipped. Slice 3 remaining: deep-link the alert to a matching SOP ('Increase Ventilation SOP', 'Cellar Insulation SOP', 'Cold-Stabilisation SOP') from sop_library. Requires authoring 2-3 environmental SOPs first (~1 hour each, MoreWine references + AWRI TR227). Once shipped, each alert card gets a '📖 See the SOP' link alongside the Ask AI + Log This buttons.",
    priority: "p2",
    effort: "~1 hour wiring + ~3 hours SOP authoring",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-06",
  },
  {
    id: "auth-scope-endpoints",
    title: "Hide member data from anonymous API calls",
    description:
      "PARTIAL AUDIT COMPLETE Feb 2026 — verified `orders.list` and `campaignMetrics.getHistory + upsert` are correctly locked to ownerProcedure (only `campaignMetrics.getLatest` is publicProcedure and that's safe, it drives the /pricing founding-member counter). STILL OPEN: sweep every remaining tRPC procedure across all routers to confirm no member data falls back to seed-owner-001 on missing session. Same fix applies to the LIP Audit Pack PDF and any /api/admin/* raw handlers (they currently sit outside the gate wall because /api/ requests skip the HTML gate).",
    priority: "p0",
    effort: "~4-6 hours",
    status: "in-progress",
    category: "Safety",
    updatedAt: "2026-02-15",
  },
  {
    id: "rotate-jwt-secret",
    title: "Rotate JWT_SECRET and gate password before first paying member",
    description:
      "SHIPPED Jul 13 — JWT_SECRET rotated on Railway prod, gate password rotated to `middx99`, preview + prod now use different secrets. Follow-up hardening also shipped: correct gate password always bypasses the rate limiter (server/gate.ts::resetGateAttempts), and a global 401 interceptor in main.tsx auto-logs-out stale sessions after any future secret rotation (previously admin pages ghost-rendered as empty).",
    priority: "p0",
    effort: "~10 min",
    status: "done",
    category: "Safety",
    updatedAt: "2026-07-13",
  },

  // ═══ 🟠 P1 · Launch protection & growth ═══
  {
    id: "gate-rate-limiter-hardening",
    title: "Redis-backed gate rate limiter (multi-pod safe)",
    description:
      "PARTIAL FIX SHIPPED Jul 13 — correct password now always wins (never rate-limited), and IPs in OWNOLOGY_GATE_IP_ALLOWLIST env skip the limiter entirely (server/gate.ts). This kills the 'self-tripped during QA' pain. STILL OPEN: swap in-memory store for Redis so multi-replica Railway prod deploys can't be dodged by pod-rotation. Widen to ~30/hour failed attempts once Redis is in.",
    priority: "p2",
    effort: "~90 min",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-07-13",
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
      "SHIPPED Feb 2026 — Namecheap DNS surgery complete. `ownology.ai` and `www.ownology.ai` now resolve directly to Railway via ALIAS + CNAME records (Cloudflare proxy disabled). See CHANGELOG.md 'Prod cutover · Ownology.ai now served by new Railway build'.",
    priority: "p1",
    effort: "~10 min once Emergent Support unblocks deploy",
    status: "done",
    category: "Ops",
    updatedAt: "2026-07-13",
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
  {
    id: "merch-more-skus",
    title: "Add mug + sticker + business-card SKUs to /admin/merch-artwork",
    description:
      "Bar Runner + Square Coaster shipped Feb 2026 with QR + UTM tracking via /api/qr-scan/:sku. Extending the SKUS array to more products is a one-line addition per SKU. Waiting on Rich to paste VistaPrint bleed/trim/safety values for: (a) 11oz ceramic mug, (b) square 60mm sticker, (c) 85×55mm business card. Once specs land, ~5 minutes per SKU.",
    priority: "p2",
    effort: "~5 min per SKU",
    status: "blocked",
    category: "Product",
    updatedAt: "2026-02-15",
  },
  {
    id: "merch-test-print-batch",
    title: "Order test print — 1 bar runner + 1 coaster",
    description:
      "The merch artwork downloader is shipped and the QR encodes /api/qr-scan/:sku with per-SKU UTM tagging + attribution logging in /admin/qr-scans. Only real-world validation left: order one of each through VistaPrint, scan the QR on the bench, watch the arrival land live in the dashboard, confirm amber colour + felt texture match the brand. Cheap to catch a colour miss on one unit vs a bulk order.",
    priority: "p2",
    effort: "~15 min (Rich to order) + wait for delivery",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-15",
  },
  {
    id: "weekly-bd-digest-cron",
    title: "Wire Monday cron for the BD Digest email",
    description:
      "Handler + dry-run at /api/scheduled/weekly-bd-digest verified Feb 2026 — env vars set (RESEND_API_KEY, ALERT_TEST_TO, CRON_SECRET), computes real digest (contacts, view events, hot alerts, replies). Live-send path: hit endpoint with x-cron-secret header, no ?dryRun=1. Only remaining step is a Railway cron entry for Monday 9am AEDT so the digest actually lands in Rich's inbox weekly. Same shape as the daily-cellar-brief-email-cron item.",
    priority: "p1",
    effort: "~5 min config",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-15",
  },
  {
    id: "outreach-router-split",
    title: "Refactor server/routers/outreach.ts (3,500+ lines)",
    description:
      "The single biggest file in the codebase and a merge-conflict magnet. Split into modular services: cold-call pipeline (Perplexity hooks, Claude SMS drafts, bulk rewrites), contact CRUD, campaign tracking + A/B rendering, /hi/:slug renderer, vCard export. Same disciplined approach as the Phase 2 router refactor: BEFORE deleting a sub-router from outreach.ts, grep for every symbol reference and audit which the remaining routers still need. High-risk change — do in a dedicated session, not batched with feature work.",
    priority: "p2",
    effort: "~4-6 hours",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-15",
  },
  {
    id: "quick-entry-clean-sanitise",
    title: "Add Clean + Sanitise tiles to /quick-entry",
    description:
      "Wire two new blind-calculator tiles that log to `logEquipmentUse`. Every equipment use ticks the vessel's cleanliness lifecycle so the Cellar Board RAG status transitions from Green (recently sanitised) → Amber (needs recheck) → Red (unsafe until re-sanitised). Requires: understanding the existing quick-entry data model + logEquipmentUse mutation shape + Cellar Board RAG state machine. Not a batch-with-features change — do focused.",
    priority: "p2",
    effort: "~2-3 hours",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-15",
  },
  {
    id: "cross-page-copy-audit",
    title: "Cross-page copy consistency (Terms · Privacy · Refund · Pricing)",
    description:
      "Unify voice, tense, and product-name usage across the four legal + pricing pages. Right now some pages say 'the winemaker's second brain', others say 'AI cellar assistant', a few slip into 'CRM'. Needs Rich's editorial pass — the AI shouldn't guess final legal wording without a human review. Ship as a single PR so tone stays consistent across all four.",
    priority: "p2",
    effort: "~1 hour (Rich review) + ~30 min wiring",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-15",
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
    id: "p1p2-batch-qr-analytics-refresh-todo-sw-automation",
    title: "P1/P2 batch: QR analytics, refresh-todo, SW automation",
    description:
      "Ploughed through the remaining P1 items plus quick-win P2s in one session.",
    shippedAt: "2026-02-15",
  },
  {
    id: "p0-sweep-comparison-plumbing-home-winery-kit-units",
    title: "P0 sweep: comparison plumbing + Home Winery Kit units",
    description:
      "P0.1 — Ungate + refresh the two migration guides /for-innovint-users + /for-vintrace-users now in PUBLIC_EXACT on both server/index.ts and viteGateWall.ts (they were gated for pre-existing tortious-interference concerns which no longer apply now that /vs/innovint-vintrace publishes the same names openly and honestly) R…",
    shippedAt: "2026-02-15",
  },
  {
    id: "vsinnovint-vintrace-public-comparison-landing-qr-wired-merch",
    title: "`/vs/innovint-vintrace` public comparison landing + QR-wired merch",
    description:
      "Rich pushed back on my thin competitor knowledge before I wrote comparison copy. Rebuilt Ownology's competitive positioning from first-principles research.",
    shippedAt: "2026-02-15",
  },
  {
    id: "merch-artwork-downloader-adminmerch-artwork",
    title: "Merch artwork downloader (`/admin/merch-artwork`)",
    description:
      "Rich asked \"Did you finish merchnimages?\" and provided VistaPrint spec sheets for the Pro Felt Bar Runner (856×225 mm bleed) and Square Coaster (100×100 mm bleed / 90×90 mm safety). Built a client-side print-artwork composer:",
    shippedAt: "2026-02-15",
  },
  {
    id: "quiz-full-quality-pass-waves-a-b-c-d-e",
    title: "Quiz full quality pass (Waves A + B + C + D + E)",
    description:
      "Rich flagged the Gewürztraminer recommendation as broken (\"we don't grow that here\" false + \"Riesling isn't the swap\"). Root-cause audit surfaced a class of bugs: home-market swap picked highest-scoring AU/NZ wine regardless of grape identity, so Alsatian Gewürz → Clare Riesling instead of Aus Gewürz. Same failure mode…",
    shippedAt: "2026-02-15",
  },
  {
    id: "design-pass-on-hi-and-admincontacts",
    title: "Design pass on `/hi/*` and `/admin/contacts`",
    description:
      "Rich called the /hi/* and admin/contacts pages \"ugly, confused typeface\" — full brand pass shipped.",
    shippedAt: "2026-02-15",
  },
  {
    id: "outreach-workflow-additions",
    title: "Outreach workflow additions",
    description:
      "<AdminOutboundQueue> vCard export button — downloads .vcf for AirDrop/email to phone; iOS + Android Contacts absorb it; Google Messages + WhatsApp autocomplete winemaker names (prefixed \"OW ·\" for easy find/purge later) <AdminOutboundQueue> Force toggle on Bulk AI rewrite — red-bordered checkbox lets operator overwrite…",
    shippedAt: "2026-02-15",
  },
  {
    id: "test-infrastructure-hardening",
    title: "Test infrastructure hardening",
    description:
      "test_feb2026_batch.py hardcoded gate password → os.environ[\"OWNOLOGY_GATE_PASSWORD\"] with module-level skip if unset is→== sweep: 51 mechanical fixes across 11 test files (correctly preserving is None idioms) 5 high-complexity tests refactored with named helpers — cyclomatic complexity 15-21 → under 10 each",
    shippedAt: "2026-02-15",
  },
];
