# Ownology — Backlog & Ideas

Living document. Every "Potential improvement 💡" and "Next Action Item" from agent sessions lands here so nothing gets lost across forks/sessions.

Last consolidated: 16 Jul 2026 (evening — P1 restructured, first-paying-customer triggers isolated).


---

## ✅ Shipped Jul 2026

- **Weekly Cellar Digest — Monday-morning heartbeat**. New `/admin/weekly-digest` preview surface + Send-now button. Layers three sections on top of the existing vessel-status cron: cellar tasks rollup (completed / new / overdue / due-next-7), Open-Meteo temperature-outlier scan (compared to `weather_thresholds_json`), and pipeline moves (new contacts / first opens / replies / demo bookings + top-3 most-engaged). Verified live via Resend id `d262eeb6-…`. Cron endpoint already registered — Railway just needs to hit Mon 07:00 Sydney with `x-cron-secret`.
- **PWA launch → dashboard, not marketing page.** `manifest.json` `start_url` bumped to `/?src=pwa`; `MobileHomeRoute` detects PWA (query flag OR `display-mode: standalone` OR iOS `navigator.standalone`) and hard-redirects to `/dashboard` when authed, `/login?next=/dashboard` when anon. Fixes "I open the PWA and get the landing page with three or four other options".
- **Fresh-build banner + poll.** `registerServiceWorker.ts` shows a top-right "New version available — Refresh" toast when a waiting SW is detected. Polls `registration.update()` every 30 min so long-lived tabs pick up deploys without a manual reload. `sw.js` gains a `SKIP_WAITING` message handler.
- **`/admin/environment` — build chip + cache reset.** Displays current commit + SW cache version + latest CHANGELOG title. One-tap **Reset app cache** wipes Cache Storage, unregisters SWs, and reloads. Escape hatch for any "the app looks stale" complaint.
- **Winery region editor (P0 from last session).** `/admin/environment` gains an editable `Wine region` field (AU/NZ datalist), a **Use my GPS** button, and geocoder-pick auto-fills region from `admin1` when blank. Persists via `region` field added to `weather.saveWineryConfig` mutation.
- **Windows "Pick an application" SMS dialog killed.** `/hi/:slug` desktop clicks intercept the `sms:` link, parse number + prefilled body, copy both to clipboard, and show an inline amber confirmation strip. Touch devices keep native SMS behaviour untouched.
- **Outreach router split.** `server/routers/outreach.ts` 3,698 → 3,167 lines (–14%). Pure sync helpers → `outreach-helpers.ts` (194 lines); async Claude/Perplexity helpers → `outreach-ai-helpers.ts` (370 lines). All 50 tRPC procedures unchanged in place, zero external imports touched.
- **Open card → new tab.** Both `top5-open-card-*` and `queue-open-*` on `/admin/contacts/outbound-queue` swapped from wouter `<Link>` to plain `<a target="_blank" rel="noopener noreferrer">` so middle-click / Ctrl-click / right-click actually work.
- **Sender sweep + reply-follow-up generator + brand-assets page.** Jamie→Rich across 5 files + 51 SMS drafts. `outreach.replyFollowupAI` drafts the next SMS grounded in pasted reply text. `/admin/brand-assets` catalogs 16 brand images with copy/download.
- **Reply sentiment + auto-advance.** `saveReply` runs Claude classification inline (interested / objection / not-now / cold), stamps `reply_sentiment`, auto-advances status forward-only. Colour-coded on `/admin/contacts/engagement`.
- **Auto-rewrite on ingest.** `outreach.create` runs Claude rewrite + region inference inline. New contacts land with a warm SMS draft + backfilled region — zero manual "Rewrite with AI" clicks.
- **Region-aware cohort bulk + TSV copy.** Bulk AI rewrite strip is context-aware, shows cohort badge, and offers "Copy N SMSes as TSV" for paste-into-Messages workflows.
- **Passwordless magic-link auth + open sign-up.** Resend-backed link login with auto-provisioning of user + winery on first request. Admin allowlist via `ADMIN_EMAILS` env.
- **`/admin/users` — user management.** KPI strip + 200-row table + per-row "resend fresh link" that bypasses public 3/hr rate-limit for stuck sign-ins.
- **Multi-channel outbound queue markers.** `insta_contacted_at` · `linkedin_contacted_at` · `facebook_contacted_at` columns + toggles on the contact card. Queue filter now excludes any row with a timestamp on ANY of the five outbound-channel columns.
- **Instagram handle backfill (Perplexity Sonar).** Manual button + nightly cron. Auto-populates `insta_handle` on contacts with only a name + winery.
- **RED keyword removed from customer-facing copy.** SMS bodies rewritten to sound like the customer composed them.
- **PWA install banner hero variant.** Fires on `/dashboard` with a 7-day snooze (previously permanent-dismiss). Value-forward subtitle.
- **WeatherWidget coordinates fix.** `wineries.id=1` corrected to Pokolbin coords + owner user id fixed.


---

## ✅ Shipped Feb 2026

- **QR scan attribution stack** — `/api/qr-scan/:sku` endpoint + `merch_scan_events` MySQL table + `/admin/qr-scans` dashboard. Every merch QR now encodes the short tracked URL; scans log per-SKU with UTMs so Rich can see whether bar runners or coasters convert. Auto-refresh dashboard.
- **`refresh-todo.ts` script** — parses CHANGELOG.md and rewrites `RECENTLY_SHIPPED` in `todoData.ts`. No more manual sync.
- **SW cache invalidation automated** — Vite plugin injects git commit hash into `sw.js` at dev serve + build time. Every deploy → new hash → automatic old-cache purge.
- **robots.txt AI-crawler reinforcement** — GPTBot/Claude/Perplexity/Google-Extended named blocks; Perplexity gets scoped Allow for high-value SEO pages.
- **`/your-journey` canonical route** — added alongside `/your-vintage` and `/roadmap` aliases. Tier-dimming already wired via `Roadmap` component.
- **`/vs/innovint-vintrace` public comparison landing** — three-way honest positioning, sitemap-indexed. Deep-links to `/for-innovint-users`, `/for-vintrace-users`, `/pricing-comparison`.
- **Migration guides ungated + refreshed** — `/for-innovint-users` + `/for-vintrace-users` now public + robots-crawlable + sitemapped. Fake testimonials replaced with honest "Example use-case" framing.
- **`/competitive-advantage` retired with 301** — permanent redirect to `/vs/innovint-vintrace` (dev + prod mirror). Stale "0 direct competitors" claim neutralised.
- **Home Winery Kit units toggle** — metric (23 L) ↔ imperial (6 gal), default metric, localStorage-persisted.
- **Competitor research memo** at `/app/memory/COMPETITOR_RESEARCH_INNOVINT_VINTRACE.md` — 11 cited sources.
- **Merch artwork downloader (`/admin/merch-artwork`)** — VistaPrint-ready PNG composer at 300 DPI. Bar Runner + Square Coaster shipped, one-line extensible for more SKUs.
- **`ownerProcedure` audit** — `/orders.list` + `/campaignMetrics.getHistory + upsert` verified locked. No fix needed.
- **BD Digest verified** — env ready, dry-run computes real digest. Awaits Monday cron wiring in Railway deploy.

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

### Response Rate Tracking · variant analytics 🆕 (Jul 2026 — top priority)
Stamp `sent_variant_key` (and `sent_at`) on `outreach_contacts` the moment an operator taps "Copy SMS" for a fresh row (or explicitly "mark SMS sent"). After 20+ sends per variant, compute reply-rate per lens by joining `sent_variant_key` × `replied_at IS NOT NULL`. Surface a small chart on `/admin/sms-openers` — sends, replies, reply-rate — so the winning psychology angle surfaces itself instead of being a hunch. Directly compounds the SMS opener variants system that just shipped.
> **Files**: schema addition (`sent_variant_key varchar(64)`, `sent_at bigint`); wire the queue's Copy-SMS handler + `markSmsSent` mutation to stamp; new `smsOpeners.responseStats` query; small chart on `/admin/sms-openers`.

### Sanitised Story Card — consumer-facing batch surface 🆕 (Jul 2026)
Replaces the earlier idea of putting auditor cellar books on bottle QRs. A public `/batch/:slug` page that shows the batch's story — variety, region, vintage, milestones, cellar notes — but suppresses chemistry, timestamps, and cellar-floor operational notes. Every bottle QR points here; cellar auditors see the full private book on `/cellar-book/:id`. Two surfaces, same underlying batch record.
> **Files**: new `client/src/pages/StoryCard.tsx`, extension of `server/routers/vintageLog.ts` with a `publicStoryCard` procedure that redacts.

### Founding-Cohort Live Counter 🆕 (Jul 2026)
Live tally on `/pricing` and `/founding-member` — "12 of 99 seats claimed" with a small spinner so scarcity feels genuine, not fabricated. Reads from `users.plan = "founding_member"` count.
> **Files**: extend `pricing.ts` router with a `foundingSeatsClaimed` query; add the counter component to `/pricing` and `/founding-member`.

### Reply Capture Inline 🆕 (Jul 2026)
Let the operator paste an Instagram / LinkedIn reply directly from the queue row so the Claude sentiment classifier auto-warms the card. Currently the flow requires opening the contact card, clicking the reply-capture button, pasting, saving — four clicks. Should be one paste-and-tab.
> **Files**: `client/src/pages/AdminOutboundQueue.tsx` (inline reply textarea per row); reuse existing `outreach.saveReply` mutation.

### Digest Feedback Loop 🆕 (Jul 2026)
One-tap 👍 / 👎 links at the bottom of every Monday cellar-digest email so we learn which weeks the copy resonates. Stores to a new `digest_feedback` table keyed on digest date + user id + polarity + optional freeform note.
> **Files**: new `digest_feedback` schema; extend `server/scheduled/weeklyCellarDigest.ts` email footer with tokenised feedback links; new `/api/digest/feedback` handler.

### Middle-click Everywhere audit 🆕 (Jul 2026)
Swap wouter `<Link>` → plain `<a>` on every admin surface where the operator wants "keep list open, peek at detail" behaviour. Confirmed done on `/admin/contacts/outbound-queue`; remaining candidates: `/admin/contacts`, `/admin/contacts/engagement`, `/admin/event-ingest`, `/admin/qr-scans`, `/admin/brand-assets`. ~20-30 min.

### Real-time push notifications
Once the email loop works, add browser push / SMS (Twilio) for high-severity alerts (stuck ferment, high temp >26°C). Cellar floor doesn't always check email.

### Real Stripe price IDs + product setup
Currently using stubbed test keys. Need:
- Real Stripe account at stripe.com
- Create products: Free, Press, Amphora, Coopers, Founding Member (see current `/pricing` for tier structure)
- Add Price IDs to Railway env vars
- Switch keys from `sk_test_*` → `sk_live_*`

---

## 🕰 First-paying-customer triggers (park until then)

These have no value while Ownology is single-user (Rich testing on his own cellar). The day the first founding member signs up, work through them.

### Set CRON_SECRET on Railway + wire nightly digests to real inboxes
The Monday cellar digest and daily alert are ALREADY wired to send via Resend when `CRON_SECRET` is configured. Right now they'd only email Rich (dry-run + manual `/admin/weekly-digest` Send-now already covers that use case). The moment a real founding member's email is in `users.email`, generate a strong random `CRON_SECRET` on Railway prod → add cron schedule `0 20 * * 0` (Mon 07:00 AEDT) for the weekly digest and `0 20 * * *` for daily alerts. Test with `?dryRun=1` first.

### ~~Nightly Mobile Cron~~ — killed
Considered wiring `outreach.bulkEnrichMobiles` on a nightly cron. Decision: DO NOT BUILD. Reasons: current backlog is ~90 email-only rows (4 taps = done); new-contact intake is 5-10/week so the cron would process 1-2 rows/night — theatre; the manual button gives an eyeball-QC checkpoint on Perplexity's confidence classifier, which a cron removes. Deleted from backlog.

---

## 🟡 P2 — Product depth

### Railway cron trigger for Weekly Cellar Digest 🆕 (Jul 2026)
Code is shipped. Railway just needs a cron: `0 20 * * 0` (Sunday 20:00 UTC ≈ Monday 07:00 AEDT) hitting `POST /api/scheduled/weekly-cellar-digest` with `x-cron-secret: $CRON_SECRET` header. Similar wiring already exists for `daily-alert-email`.

### `server/routers/outreach.ts` further split 🆕 (Jul 2026)
Jul 2026 helper extraction cut 559 lines. Remaining 3,167-line router could still split into: `outreach/public.ts` (bySlug, markViewed, markCtaClicked — ~700 lines) and `outreach/admin.ts` (~2,500 lines with all owner procedures). Only worth doing when next major feature adds to the file.

### `server/index.ts` split (found Feb 2026 pre-demo E2E)
File is 1168 LOC — well past the 700-line threshold. Candidates for extraction: gate middleware + invite handler → `server/gateHandlers.ts`; scheduled handlers → `server/scheduled/index.ts`; SPA meta injection → `server/spaMeta.ts`; sample-vintage-log alias + audit route → `server/publicRoutes.ts`.

### The Press post-harvest correlation engine
Strategy-doc P0 for vintage debrief. For each finished batch, generate a debrief: *"Your tanks fermented at 18°C averaged 1.5 days faster than 19°C tanks. Recommend 18°C as 2027 standard."* Needs:
- A `vintage_summaries` table (winery_id, vintage_year, batch_id, final_metrics_json, quality_score, AI_debrief_md)
- Cron job that runs after a batch is marked Complete
- LLM call that correlates events + final metrics + quality scores → narrative debrief
- UI surface at `/the-press/vintage/{year}`

### Multi-tenant winery model (Phase 3)
Phase 2 scaffolding shipped Feb 2026 (`winery_id` on all customer-domain tables + auto-provision on signup). Phase 3 = cellar-team roles:
- `winery_members` (winery_id, user_id, role: owner/cellar_lead/harvest_intern)
- Role-based gating in `trpc.ts` (only owner can edit SOPs; cellar_lead can log; intern can only view)
- Invite flow that reuses the magic-link path

### Voice input on QuickEntry
Strategy doc lists it as a must-have. Web Speech API for browsers, fall back to OpenAI Whisper via Emergent integration for accuracy. "Tank 7 Shiraz, Brix 24.3, time 14:30" → parsed and pre-filled.

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
| Authentication | ✅ **Live** — Google OAuth + magic-link (Jul 2026) |
| Custom domain `ownology.ai` | ✅ **Live** — production is on `https://www.ownology.ai` (Jul 2026) |
| Email (Resend) | ✅ **Live** — daily alert + weekly cellar digest both wired; production cron for weekly still pending Railway config |
| Stripe payments | Test keys only (`sk_test_stub`) — real IDs + live keys pending |
| Push notifications | Not wired |
| SMS alerts (Twilio) | Not wired — the outbound `SMS_INBOUND_NUMBER` is Rich's real mobile; no automated inbound reply parsing |
| File uploads | Disabled |

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
