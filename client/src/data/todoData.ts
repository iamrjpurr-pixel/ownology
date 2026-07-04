/**
 * todoData.ts — Ownology public roadmap.
 *
 * Source of truth for the /todo page. Update this file every time we
 * finish, add, reprioritise, or reword an item. Whatever's here is what
 * ships to the public roadmap — no separate DB, no CMS, no drift.
 *
 * Voice principle: plain English. If a prospect landed on /todo they
 * should understand every line without a glossary. Reference internal
 * URLs (like `/try`, `/cellar-brief`) sparingly and always link.
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
export const LAST_UPDATED = "2026-02-04";

export const TODO: TodoItem[] = [
  // ═══ 🔴 P0 · Must-fix before first paying customer ═══
  {
    id: "auth-scope-endpoints",
    title: "Hide member data from anonymous visitors",
    description:
      "Right now if a stranger types /dashboard or /cellar-brief in the URL bar, our backend defaults to seed-owner-001 and returns the live Ownology Cellars cellar data. The /try redirect wall blocks the browser page, but the API endpoints themselves are still open — a determined attacker could pull the data directly. We need to scope every backend endpoint so it requires a logged-in user and returns only that user's own winery data. Same fix applies to the LIP Audit Pack PDF.",
    priority: "p0",
    effort: "~4-6 hours",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-02-04",
  },

  // ═══ 🟠 P1 · Launch protection & growth ═══
  {
    id: "rate-limiting",
    title: "Rate-limit the API",
    description:
      "Add automatic throttling on our tRPC endpoints and the scheduled email cron. Protects against brute-force attempts and stops us accidentally burning through the Resend email quota. Standard launch hygiene — nothing to see for the user, but essential before we invite strangers in.",
    priority: "p1",
    effort: "~1 hour",
    status: "not-started",
    category: "Safety",
    updatedAt: "2026-02-04",
  },
  {
    id: "vivid-outreach-push",
    title: "Send /try to the first 10 warm contacts",
    description:
      "Actually send the ownology.ai/try link to 5-10 of the seeded VIVID contacts we already have. Watch conversations, note where prospects drop off, feed observations back into the sandbox. Zero code — 15 minutes of Rich's time. Everything else on this roadmap benefits from real data first.",
    priority: "p1",
    effort: "~15 min (Rich)",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-04",
  },
  {
    id: "winery-directory-plus-cold-email",
    title: "Australia + NZ winery directory & cold-email engine",
    description:
      "Import ~2,600 Australian producers (from the public Wine Australia licence register) plus ~700 NZ producers (from NZ Winegrowers' member directory). Build a 3-touch email sequence with region-specific hooks, sent via Resend, with proper Australian Spam Act 2003 compliance (unsubscribe + sender ID). Gives us a scaled outreach engine so we're not stuck at 32 hand-picked contacts. SMS pipeline stays for warm/hot leads only.",
    priority: "p1",
    effort: "~7 hours (Phase 1 directory + Phase 2 email engine)",
    status: "not-started",
    category: "Growth",
    updatedAt: "2026-02-04",
  },
  {
    id: "import-engine-voice-ocr",
    title: "Import Anything engine — CSV, OCR paper logs, voice-memo transcription",
    description:
      "Kill the switching-cost objection at Day 1. Build the pipeline that ingests: (a) Excel/Google Sheets/CSV via drag-drop, (b) photographs of paper cellar logs via OCR (GPT-5.2 multimodal or Google Cloud Vision), and (c) voice memos via Whisper transcription that get parsed into chemistry-grade log entries. This is the 'Import Anything' promise we make in the /try sandbox — needs the actual engine behind it before we take the first paying customer.",
    priority: "p1",
    effort: "~8-10 hours (three lanes: CSV, OCR, Whisper)",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-04",
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

  // ═══ 🟡 P2 · Conversion polish (do after data) ═══
  {
    id: "live-llm-try-step-5",
    title: "Live LLM in /try Step 5",
    description:
      "Right now Step 5 of the /try sandbox uses a hardcoded scripted answer for the 'Ask Ownology' question. It's convincing but static. Upgrade to a real LLM call (via the Emergent LLM key) with a system prompt that pins the model to Ownology Cellars' demo data only. Do this after we've watched 5 prospects actually go through /try so we know what they ask.",
    priority: "p2",
    effort: "~45 min",
    status: "not-started",
    category: "Product",
    updatedAt: "2026-02-04",
  },
  {
    id: "hi-name-personalized-landing",
    title: "Personalized landing at /hi/{name}",
    description:
      "Add a URL pattern like ownology.ai/try?name=Sam that prepends 'Rich sent this to you, Sam' at the top of Step 1. Small touch, high-leverage for cold outreach. Feels handmade to the prospect.",
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

  // ═══ ⚪ Blocked / waiting ═══
  {
    id: "live-stripe-keys",
    title: "Swap Stripe test key for live keys",
    description:
      "The Stripe integration currently uses a test-mode stub. Once Rich provides live Stripe keys (from the Stripe dashboard), we swap them in and we can accept real payments. Blocked on the key handoff.",
    priority: "blocked",
    effort: "~15 min once keys arrive",
    status: "blocked",
    category: "Payments",
    updatedAt: "2026-02-04",
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
    id: "refactor-python-tests",
    title: "Refactor Python test files",
    description:
      "Clean up the older Python test files inherited from previous sessions. Not blocking anything — cosmetic. Do when Rich or the agent has spare time between features.",
    priority: "p3",
    effort: "~2 hours",
    status: "not-started",
    category: "Hygiene",
    updatedAt: "2026-02-04",
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
    id: "try-sandbox",
    title: "The /try sandbox",
    description:
      "A 10-minute guided walkthrough of a real winemaker's morning — stuck ferment, decision, log, Ask Ownology, publish. Uses Ownology Cellars data. No signup, no writes.",
    shippedAt: "2026-02-04",
  },
  {
    id: "try-hf10-pass",
    title: "/try Human-Factors 10-Lens conversion pass",
    description:
      "Save/resume state (7-day expiry), mobile-first pass, 'Your Day 1' timeline at the CTA, and 'keep your spreadsheet' reassurance in Step 1. Four fixes chosen by structured behavioural framework, not intuition.",
    shippedAt: "2026-02-04",
  },
  {
    id: "try-isolation-wall",
    title: "/try isolation and member-route redirect wall",
    description:
      "Anonymous visitors typing /dashboard, /cellar-brief etc. now get 302'd to /try?from=<path>. On Step 1 they see a contextual 'you reached for X' banner. At Step 7 they see a personalised unlock line matching the route they wanted. Chrome (trial banner, theme popups, PWA nag) suppressed on /try.",
    shippedAt: "2026-02-04",
  },
  {
    id: "try-og-share-card",
    title: "/try social share card",
    description:
      "Custom 1200x630 OG image so when Rich shares ownology.ai/try on WhatsApp/SMS/Twitter/LinkedIn, a proper thumbnail renders with 'Run a winery for ten minutes.' headline. Per-route meta-injection middleware means any future page can get its own share card in 3 lines of config.",
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
  {
    id: "sitemap-footer-link",
    title: "Human-readable site map with footer link",
    description:
      "The /site-map page (a clickable directory of every route in the app) is now linked from the footer alongside RSS and Sitemap.xml.",
    shippedAt: "2026-02-04",
  },
];
