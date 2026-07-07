# Ownology — Backlog & Ideas

Living document. Every "Potential improvement 💡" and "Next Action Item" from agent sessions lands here so nothing gets lost across forks/sessions.

Last consolidated: 28 Jun 2026.

---

## 🆕 TODO — Copilot Fork B · Vintage-log → regional narrative (Feb 2026)

**Idea (from Rich)**: Winemakers already publish their vintage logs into Ownology's Insta Copilot. Take the *narrative* from those logs, anonymise the winery-specific bits, and auto-write a **generic sub-regional narrative** (e.g. "What Adelaide Hills tanks look like this week" / "Marlborough Sauv Blanc ferments — Vintage 2026") for LinkedIn / Instagram.

**Why it matters (SEO + brand)**:
- Google search Feb 2026 for *"wineries across Australia and New Zealand full production what's in the tank"* returns individual-winery vintage reports (Tyrrells, Elderton, Misha's Vineyard, Babich, Crabtree, Pyramids Road) but **no industry-wide aggregation**. Massive content vacuum.
- Positions Ownology as the "single source of vintage-wide truth" — the aggregator no one else can produce because no one else holds the private vintage-log data across many boutique wineries.
- Individual wineries get their tank story amplified anonymously in a regional narrative — social-currency incentive to keep logging in Ownology.
- Compounds year-on-year: 2026 vs 2027 vs 2028 vintage comparisons at regional scale become uniquely ours.

**Prior art shipped in same session** (proof of the manual angle):
- `/blog/whats-in-the-tank-2026` — hand-crafted cross-country snapshot citing 7 public winery vintage reports. Proof the content angle works. Auto-generation is the scaled version.

**Feature scope (Copilot Fork B)**:
1. **Regional aggregator engine**: reads all logged `vintage_log_entries` across wineries in the same sub-region (e.g. Adelaide Hills, Marlborough) filtered by variety + week-of-vintage.
2. **Anonymisation pass**: strips winery names, tank IDs, staff names. Preserves varietal / regional / stage-of-ferment / notable-observation shape.
3. **LLM narrative synth**: passes anonymised aggregate to Claude Sonnet with a brief-writer prompt. Output: 300-word narrative + suggested LinkedIn caption + suggested Insta caption (already the Copilot format).
4. **Publication path**: post to Ownology's own LinkedIn + Insta on a weekly cadence during vintage (Feb-May AU/NZ). Each post links back to `/blog/whats-in-the-tank-{year}` for the deep-dive.
5. **Opt-in per winery**: participating wineries get a badge and their sub-region gets earlier/more coverage. Non-participating wineries excluded from aggregation entirely.

**Dependencies**:
- Existing Insta Copilot (already in Fork B scope).
- `vintage_log_entries` table (already exists).
- `wineries.location_label` (already exists).
- Multi-tenant `winery_id` FKs (currently in P2 backlog — this feature makes multi-tenant urgent).

**Owner**: Copilot Fork B session.

---

## 🌱 v2 Vision — Safety + Training Compliance (Feb 2026, deferred by design)

**Original problem**: Rich flagged the SafeWork NSW Winery Guide (Model WHS Act) as a potential product surface. We chose to keep Ownology focused on **wine-quality risk** for v1 (see `/risk-management`) — but stored the safety/training thesis here so it survives session compaction.

### The compounding-data thesis

Ownology's real moat activates when three data sets are populated for a winery:

1. **Asset list** — specific equipment (crusher-destemmer model X, press model Y, tank vintage/size Z, forklift make/model). Structured, per-winery, versioned.
2. **Vintage records** — historical + live vessel journal (already in the app).
3. **Employee + training records** — who's on-site during vintage, what tickets they hold (forklift, confined-space, first aid, senior first aid, chemical handling).

Once you have all three, several compounding features become trivial to ship:

### Feature 1 — Equipment-specific operating training manuals
- **Input**: winemaker registers a `willmes-basket-press-1200`.
- **Ownology synthesizes**: a training manual using (a) the 13 MoreWine SOP references already indexed in `cellarBriefEngine.ts` (SO₂ mgmt, sanitation, MLF paper, yeast pairing, inert gas, sparkling protocols, etc), (b) manufacturer manuals if uploaded, (c) AWRI equipment-specific technical notes if they exist.
- **Output**: a printable / signable "Operator Training Manual for the Willmes 1200" scoped to that winery's exact asset + varietal use.
- **Business value**: winemakers currently patch this together from PDFs. Ownology turns "operator training documentation" into a single-click artifact.

### Feature 2 — On-demand JSEA / SWMS generation
- **Input**: an activity ("cleaning tank T3", "pressing white grapes", "confined-space entry into T7") + which employees will do it + the asset involved.
- **Ownology synthesizes**: a **Job Safety and Environmental Analysis (JSEA)** or **Safe Work Method Statement (SWMS)** using Model WHS Act principles + SafeWork state-specific compliance + AWRI safety references + the winery's own asset + employee training data (so the SWMS shows which trained ops can perform which steps).
- **Output**: signable PDF ready for the on-site whiteboard and audit trail.
- **Regulatory anchor**: Model WHS Act 2011 (7 of 8 AU jurisdictions harmonized; WA joined March 2022; Victoria uses OHS Act 2004 with functionally equivalent principles).
- **State adaptivity**: winery region determines which regulator + reporting form appears in the "notify" footer of the SWMS (mapping table already sketched in Feb 2026 session).

### Feature 3 — Employee-training compliance dashboard
- **Input**: employee records + training tickets + expiry dates.
- **Ownology surfaces**: who's coming up for renewal, which activities they're currently cleared for, which vessels/assets they can operate, gap analysis (are we vintage-crew-ready?).
- **Cross-links**: the Marketing Ops daily coach could nudge Rich when a critical ticket is 30 days from expiring during vintage prep.

### Positioning discipline

**Not until asset + training data is in the app.** These features REQUIRE the underlying data to be present — otherwise they're guessing, which is worse than nothing. The v1 doctrine at `/risk-management` deliberately says WHS is out of scope (points to Safe Work Australia + AWRI + state regulators) precisely so the v2 pivot is EARNED by data, not oversold prematurely.

### Rough sequencing
1. Ship v1 Risk Management (Quant + Qual wine-quality) — Feb 2026 (**this session**)
2. Get 5 paying members using the wine-quality product
3. Add asset registry as a first-class model (small addition to schema)
4. Add employee + training record model
5. Feature 1 — Equipment operating training manuals (leverages existing MoreWine SOPs)
6. Feature 3 — Employee training compliance dashboard
7. Feature 2 — JSEA / SWMS on-demand (needs all prior three)

Estimated combined build: 3-4 weeks after data models are in. Don't start until the wine-quality product has retained users.



---

## 🎯 P0 — Strategic / Revenue

### Gate rate-limiter hardening (found Feb 2026 pre-demo E2E)
`/api/gate/verify` uses in-memory 5-attempts-per-15min-per-IP bucket. Two issues:
1. Trips too easily under legitimate QA / operator retries (self-tripped 3× during pre-demo validation).
2. In-memory per-pod — multi-replica Railway prod deploys would let attackers dodge it by hitting different pods.
Fix: swap for Redis-backed limiter, widen window to 30/hour, and add optional allowlist env var `OWNOLOGY_GATE_RATE_LIMIT_ALLOWLIST` for preview / office IPs. ~90 min build.

### `server/index.ts` split (found Feb 2026 pre-demo E2E)
File is 1168 LOC — well past the 700-line threshold. Candidates for extraction: gate middleware + invite handler → `server/gateHandlers.ts`; scheduled handlers → `server/scheduled/index.ts`; SPA meta injection → `server/spaMeta.ts`; sample-vintage-log alias + audit route → `server/publicRoutes.ts`. Do this as part of the Phase 2 router refactor already planned.

### Demo to a real winemaker
The full moat (personal history + reasoning + alerts + bibles + AU/NZ regulations) is **end-to-end demoable** on the live URL right now. Outreach targets:
- Tamburlaine (Orange, NSW) — boutique premium
- Tyrrell's (Hunter Valley) — heritage
- Brokenwood, Yarrh, Murray Street — boutique
- Tom Carson / Yabby Lake (Mornington) — Pinot
- Any cellar-floor team running 50–300+ tanks during a vintage

The pitch: "Send me one past vintage's notes. I'll show you the AI tutor citing your own decisions back to you within 15 minutes."

### "Past-vintage notes" homepage demo form 💡
A single `/demo` page on the homepage: visitor pastes any old harvest notebook → system parses → asks them one Tank-specific question → AI replies with their own data cited. Zero-friction demo of the moat, with the parsed data optionally seeding their trial account. **Single best conversion flow** — outperforms any pricing page.

### Cellar-Journal SEO flywheel: `/ask` page 💡
A single new public page `/ask` where ANY visitor types any winemaking question → AI answers grounded in our private bible-RAG → every Q auto-saves to `cellar_journal` as a gated public SEO page. Trinity clustering already handles canonicalisation. Each answer = 1 new SEO entry growing organic traffic for free.

---

## 🟠 P1 — Engagement / Retention

### Daily 7am alert email (via Resend) 💡
Wire a daily cron that scans each user's `vintageLog.alerts` and sends a morning briefing email: *"Good morning — Tank 9 Shiraz needs DAP today, Tank 5 Cab is running hot, Tank 2 Merlot is ready to rack."* The "AI assistant who actually walks the cellar with you" moment that investors and winemakers both fall in love with. Drives app-open frequency.

### Real-time push notifications
Once the email loop works, add browser push / SMS (Twilio) for high-severity alerts (stuck ferment, high temp >26°C). Cellar floor doesn't always check email.

### Custom domain `ownology.ai`
Point DNS to Railway. ~10 minutes on your DNS provider. Step-by-step:
1. In Railway → ownology service → Settings → Networking → Custom Domain
2. Add `ownology.ai` (and optionally `www.ownology.ai`)
3. Railway gives you a CNAME / A record value
4. In your DNS host, create the record and wait 5–60 min for propagation

### Real Stripe price IDs + product setup
Currently using stubbed test keys. Need:
- Real Stripe account at stripe.com
- Create 3 products: Free, Premium ($99/mo), Enterprise ($499/mo)
- Add Price IDs to Railway env vars (`STRIPE_PREMIUM_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`)
- Switch keys from `sk_test_*` → `sk_live_*`

---

## 🟡 P2 — Product depth

### The Press post-harvest correlation engine
Strategy-doc P0 for vintage debrief. For each finished batch, generate a debrief: *"Your tanks fermented at 18°C averaged 1.5 days faster than 19°C tanks. Recommend 18°C as 2027 standard."* Needs:
- A `vintage_summaries` table (winery_id, vintage_year, batch_id, final_metrics_json, quality_score, AI_debrief_md)
- Cron job that runs after a batch is marked Complete
- LLM call that correlates events + final metrics + quality scores → narrative debrief
- UI surface at `/the-press/vintage/{year}`

### Multi-tenant winery model
Strategy doc calls for `wineries` table + cellar-team roles. Build when the first winery onboards multiple staff. Schema additions:
- `wineries` (id, owner_id, name, region, total_tanks)
- `winery_members` (winery_id, user_id, role: owner/cellar_lead/harvest_intern)
- Add `winery_id` FK to `vintage_log_entries`, `sop_library`, `cellar_journal`
- Role-based gating in `trpc.ts` (e.g. only owner can edit SOPs; cellar_lead can log; intern can only view)

### Voice input on QuickEntry
Strategy doc lists it as a must-have. Web Speech API for browsers, fall back to OpenAI Whisper via Emergent integration for accuracy. "Tank 7 Shiraz, Brix 24.3, time 14:30" → parsed and pre-filled.

### Phase 2 router refactor
Continue the `routers.ts` split (1,556 LOC remaining). Next 4 extraction targets:
- `complianceRouter` (~212 LOC)
- `siteContentRouter` (~213 LOC)
- `cellarTasksRouter` (~148 LOC)
- `cellarEquipmentRouter` (~98 LOC)
**Playbook (learnt from Phase 1 regression):** BEFORE deleting a sub-router from `routers.ts`, grep the moved router for ALL `from "../db.js"` and `from "./trpc.js"` symbol references AND audit which symbols are still needed by the routers staying behind. The Phase 1 regression (`listVintageLogEntries` dropped from imports → dashboard.getStats 500) was caused by skipping this step.

### Router-level performance dashboard `/admin/perf` 💡
tRPC middleware tracking p50/p95/p99 latency + cost per procedure. Each extracted sub-router file becomes a measurable unit. Useful for the investor pitch ("our most expensive AI call is X ms; cost per query is Y").

---

## 🟢 P3 — Polish / Future

### Native mobile apps (iOS / Android)
Strategy doc has these as Q4 2026 / Q1 2027 goal. React Native — share most of the business logic. Worth it once 50+ wineries onboard and they're complaining about iPad-only cellar use.

### File/image upload archive (Cloudinary or Emergent storage)
Originally requested but deferred — current AI flow extracts structured data straight to `vintage_log_entries`, so raw PDFs/photos aren't strictly needed. Add only if winemakers want a permanent archive of original lab slips, vintage photos, etc.

### Compliance audit trail PDF export
Strategy doc lists: regulator turns up, "generate audit trail" button on Compliance page → exports all `vintage_log_entries` with `compliance_records` matched, formatted for inspection. Big trust signal.

### Winery onboarding wizard
First-time setup: name, region, tank count, varieties grown → seeds initial SOPs filtered by region. Make the first 5 minutes feel magical.

---

## 📦 Mocked / Stubbed (not actively built)

| Feature | State |
|---|---|
| Authentication | **Fully bypassed** (auto-injects seed admin) — restore via `NODE_ENV` check in `server/trpc.ts` when ready |
| Stripe payments | Test keys only |
| File uploads | Disabled |
| Push notifications | Not wired |
| SMS alerts (Twilio) | Not wired |
| Email (Resend) | ✅ Wired (28 Jun 2026) — live send verified, awaiting Railway cron schedule + domain verification |

---

## 💡 Saved enhancement ideas (28 Jun 2026)

End-of-session ideas that didn't make this sprint. All small, all valuable, listed in build order from highest leverage to lowest. Pick the next one off the top when you're ready.

### 🔴 P0/P1 (high leverage, small lift)

**1. Signup-conversion measurement on `/admin/funnel`** (~30 LOC)
> Today `/admin/funnel` shows visits-by-source. Add the *conversion column* by hooking the Stripe Checkout success webhook (or the `pricing.createCheckout` success redirect) to log a second row into `pricing_views` with `source = "<original>:converted"`. The funnel page then shows `homepage-hero: 340 visits → 8 converted (2.4%)` vs `free-paused: 87 visits → 12 converted (13.8%)`. Turns the dashboard from "interesting" to "operational" — you'll know exactly which channel to invest in.
> **Files**: `server/routers.ts` (createCheckout), `server/scheduled/` (Stripe webhook handler), `server/routers/pricing.ts` (extend funnelStats with conversion math), `client/src/pages/AdminFunnel.tsx` (new column).

**2. Decision-logic "Why?" quick-select buttons on QuickEntry** (P1 from finish backlog)
> Pre-set reasons: BMV detected · Brix plateaued · regulatory cap reached · yield protection · experimentation · house-style match. Tap-to-fill, then user can refine. Captures reasoning at 10× the rate. Powers the Learning Loop's grounding even better.
> **Files**: `client/src/pages/QuickEntry.tsx` (add chip selector above the reasoning textarea).

**3. Railway cron schedule for `/api/scheduled/daily-alert-email`**
> Cron line: `0 21 * * *` UTC ≈ 7am Sydney AEDT. Set `CRON_SECRET` env in Railway and pass it via `?cronSecret=` in the cron request URL. Verify a domain in Resend (`ownology.ai`) so `ALERT_FROM_EMAIL=cellar@ownology.ai` and `ALERT_TEST_TO` can be removed.
> **Files**: Railway dashboard only. Code is already shipped.

### 🟠 P1 (operational + tuning)

**4. Cost guard-rail dashboard alerts** (~20 LOC)
> When a tier flips to PAUSED, fire a Resend email to the operator ("Free tier paused at 9:14am Sydney — 47 free-tier calls served, $3.00 spent. Consider raising DAILY_FREE_BUDGET_USD?"). Catches budget-tuning issues in real time instead of the operator finding out from user complaints.
> **Files**: `server/_core/llmMeter.ts` (hook into the existing one-time WARN), new `server/scheduled/budgetAlertEmail.ts`.

**5. Tier classification from `users.plan` column** (P2 from finish backlog)
> Once real auth lands and we have `users.plan = free|premium|enterprise`, tier classification should read from the *request user* rather than just the source tag. A premium user calling `freeRun.curiosityAsk` should be classified as `premium` tier (not free), so their queries don't pause when free-tier hits its cap.
> **Files**: `server/_core/llmMeter.ts` (`classifySource` extended to take optional user plan), `server/_core/llm.ts` (chatCompletion injects user plan as new header `x-ow-plan`).

### 🟡 P2 (polish + product surface)

**6. Decision-logic templates expand to Compliance + Free Run**
> Same "Why?" preset pattern applied to: every time the AI gives a regulatory answer, surface a "Save this decision" button that pre-fills QuickEntry with the AI's recommendation + reasoning. Closes the loop from advice → recorded action.

**7. Voice input on QuickEntry** (P2 from finish backlog)
> Web Speech API → Whisper fallback. The cellar floor is loud and gloved — typing is the friction. *"Tank 9, racked off gross lees, 15 ppm SO₂ added"* should be a 3-second speak, not a 30-second tap.

**8. Custom domain DNS for `ownology.ai`** (P2)
> A/AAAA records to Railway's edge. Required before launch.

### 🟢 P3 (long-horizon)

**9. Multi-tenant winery model**
> Add `winery_id` foreign key across vintage_log_entries, cellar_tasks, etc. Allows one winery to invite multiple operators. Required for the "enterprise" plan tier.

**10. Native iOS/Android apps**
> Wrap the existing PWA in Capacitor for app-store distribution + push notifications. Lets daily-alert-email become daily push notification (much higher engagement).

**11. File/image upload archive** (Emergent Object Storage)
> Photos of harvest, lab reports, certificates of analysis, must samples. Vector-RAG over OCR'd content unlocks "ask the AI about this barrel's chromatography from last year".

**12. `/the-press/compare` exportable PDF**
> The vintage comparison view is the natural moment a winemaker wants to share with their distributor or family business partner. Add an "Export as PDF" button using the same `pdfkit` we shipped for audit-trail.

**13. Re-baseline `__drizzle_migrations`** (tech debt)
> `drizzle-kit migrate` currently doesn't record applied migrations (0 rows in `__drizzle_migrations`). Future schema changes had to be applied via raw SQL during the funnel work. Either re-baseline by inserting historical migration tags, or switch the workflow to `drizzle-kit push` for live DBs.

---

## 🔁 Discoverability rules for future agent sessions

When the agent finishes a feature and writes a "Potential improvement 💡" or "Next Action Items" block:
1. The block goes into the chat (user sees it once)
2. **AND** it must be appended/merged into the "💡 Saved enhancement ideas" section above
3. Each item: title + priority + 1–2 sentence why + acceptance criteria if obvious

This way new forks pick up the full backlog by reading this file alongside `PRD.md`.
