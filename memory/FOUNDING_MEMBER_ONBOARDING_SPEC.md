# Founding-Member Onboarding Wizard — Build Doc

> Status: **DRAFT** · Feb 2026 · Author: e1 handoff · Related: `BRANDING_SCRAPER_UPSELL.md` (branding scraper cost-benefit already resolved: bundle inside this wizard, not standalone).

---

## The problem we're solving

**Today**: User completes Stripe checkout → lands on `/founding-member/success` → sees "Your welcome email will arrive within 24 hours."

That's an IOU on the highest-emotion moment of the customer journey. The winemaker just paid $997. They want to log in and *feel it*. We're punting them to email.

**Cost of the status quo**:
- 24-hour cold gap between "I paid" and "I can use it" → refund-request risk
- No captured brand assets → their first LIP PDF or Cellar Brief PDF renders in default amber, not theirs
- No captured pain point → we don't know what they came for, can't personalise the next 30 days
- No captured referral attribution → if they came from a `?ref=CODE`, we lose the conversion event to the referrer

**Goal**: convert the checkout moment into a 60-second "wow, this is already mine" experience — while capturing the data we need to make every subsequent surface feel bespoke.

---

## Design principle: **60-second wow, then get out of their way**

Four steps, one screen each, each takes ≤ 15 seconds. No step is mandatory (skippable), but each one visibly rewards completion. **The wizard's job is to make the winemaker feel Ownology is already tuned to their cellar before they've done any real work.**

Progressive-disclosure order matters — start with the highest-wow step (branding scrape) while dopamine is highest, end with the lowest-effort ask (subscribe to daily brief).

---

## The 4 steps

### Step 1 · Name your winery (5 sec)
- Fields: `wineryName` (required), `contactName` "Your first name — used in invite links and emails" (optional but nudged), `region` (autocomplete: Barossa, Hunter, Marlborough, etc.)
- Copy: *"So Ownology knows what to call you."*
- CTA: **Continue →**
- Persistence: `winery.update({name, contactName, region})` — already wired.

### Step 2 · The magic moment — brand scrape (10–20 sec)
- Field: `websiteUrl` (validated as https://…)
- CTA: **Grab my branding** (spins a "🎨 Analysing…" loader)
- Backend: new `winery.scrapeBranding({url})` tRPC procedure
  - Fetches URL with 5s timeout, 5MB cap, SSRF-guarded (blocks private IPs)
  - Extracts logo: prefers `<link rel="icon">` sized ≥ 60×60, then Open Graph `og:image`, then first `<img>` in `<header>` matching common logo heuristics (`logo`, `brand`, `mark` in filename or class)
  - Extracts brand colors via `node-vibrant` on the logo image + hero-section screenshot: returns 3 candidates ranked by Vibrant/DarkVibrant/LightVibrant scores
- UI reveal: **"We found this."** — big centred logo preview + 3 colour-swatch pills the user can click through, live preview of a mini "sample LIP PDF header" beside them so they see the payoff instantly
- Fallback if scrape fails: **"Couldn't detect that — upload your logo and pick a colour instead"** (existing `winery-logo-url-input` + `winery-brand-color-input` from `AdminSettings.tsx`)
- CTA: **Looks great, next →** (or **Skip, I'll do it later**)
- Persistence: `winery.update({logoUrl, brandColor})`

**This is where the branding-scraper investment lives.** It's the only step whose per-use cost > free-tier plan, and it's the one that visibly makes the paid tier feel paid. Cross-ref: `BRANDING_SCRAPER_UPSELL.md` recommendation was to bundle it here rather than sell standalone.

### Step 3 · What are you here to solve? (10 sec)
- Choice chips (single-select, but stored as `primaryUseCase` on the user row):
  - 🏛️ **LIP audit prep** — "I dread audit week. Make it painless."
  - 🧪 **Cellar decisions** — "Ask Ownology anything, get grounded answers."
  - 📸 **Marketing / IG captions** — "Turn cellar work into stories."
  - 📊 **Team memory** — "Multiple winemakers, one source of truth."
  - 🤷 **Just exploring** — "Show me what you've got."
- Copy: *"We'll surface the parts of Ownology that solve this first."*
- Why this matters:
  - Powers a **personalised dashboard** — first Cellar Brief runs with the relevant pillar promoted (compliance-first vs. AI-first vs. content-first)
  - Feeds a **welcome-email fork** — Resend template picks the right pillar walkthrough
  - Powers the **/founding-member/thank-you** copy — mirrors their answer back to them ("Perfect. Here's how Ownology cuts LIP prep from 20 hours to 20 minutes…")
  - CRO data — 6 months in we'll know which pillar closes the most Founding Members, sharpens `/pricing` copy
- Persistence: new column `users.primary_use_case ENUM(...) NULL`

### Step 4 · Bring your first vintage in (15 sec) — SOFT ASK
- Two choices:
  - **A. Import from CSV** — file input + parser hint ("last 90 days of vintage log entries"). Reuses existing `/import` route logic. On success, redirects wizard-end to `/cellar-brief` with real data.
  - **B. Start fresh** — no import. Wizard ends with a seed prompt: "Log your first entry" → deep link to `/quick-entry`.
- Optionally: **C. Use demo data** — reuses `scripts/seed-mock-data.mjs` gated to this user (Founding Members should NOT see demo data by default in prod — this is only for previewing the app).
- Copy: *"The Cellar Brief needs at least 5 entries to feel alive. Import your last month?"*

### Step 5 (bonus — 5 sec) · Referral back-attribution
- **Only fires if** the user's cookie or localStorage `ow-referral-code` was set from a `/join?ref=CODE` visit before checkout.
- Auto-runs `referrals.applyToCurrent` mutation (not yet built — spec below in **New procedures**).
- Shows a delight moment: *"Great — Sarah at Redstone Ridge just earned 30 free days for referring you. We'll let her know."* → sends a Resend congrats to the referrer.
- No user action required. Just confirmation.

### Landing after wizard
Redirect to `/cellar-brief`. First thing the user sees is a Cellar Brief that ALREADY has their winery name, logo, and brand color rendered — plus the pillar they chose in Step 3 promoted at the top. **That's the payoff for the 60 seconds.**

---

## New tRPC procedures to add

| Procedure | Purpose | Guard |
|---|---|---|
| `winery.scrapeBranding({url})` | Fetch page, extract logo + palette; return preview object `{ logoUrl, colors: [hex,hex,hex], detectedName?, detectedRegion? }`. Does NOT persist — user confirms in the UI. | Founding-Member / paid tier only. SSRF-guard. Rate-limited to 5/day per winery. |
| `referrals.applyToCurrent({code})` | Look up referrer, mark referral `converted`, grant `+30 trial_credits_days` to referrer, send Resend congrats. Idempotent. | Called at most once per user account. |
| `onboarding.markComplete({step})` | Log step-completion events for funnel measurement. Writes to new `onboarding_events` table. | Auth required. |

## New DB columns / tables

```sql
ALTER TABLE users ADD COLUMN primary_use_case ENUM(
  'lip_audit','cellar_decisions','marketing','team_memory','exploring'
) NULL AFTER role;

ALTER TABLE users ADD COLUMN onboarding_completed_at BIGINT NULL AFTER primary_use_case;

CREATE TABLE onboarding_events (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  winery_id INT,
  step VARCHAR(64) NOT NULL,    -- 'name','branding_scraped','branding_skipped','usecase','import_csv','start_fresh','completed'
  metadata_json TEXT,
  created_at BIGINT NOT NULL,
  INDEX (user_id), INDEX (step), INDEX (created_at)
);
```

Migration script pattern: `scripts/add-onboarding-fields.mjs` (idempotent, follows `add-nurture-fields.mjs` shape).

---

## Frontend surface

- New route: `/onboarding` (post-Stripe redirect target instead of `/founding-member/success`)
- Component: `client/src/pages/Onboarding.tsx` — single-file, 4-step reducer state machine
- Success page **retained** at `/founding-member/success` but repurposed: shown ONLY if user hits it directly (skip-signup, back-button, etc.) — the primary flow is `/onboarding` now
- New route: `/onboarding/complete` — final "you're all set" screen with 3 CTAs (Open Cellar Brief · Ask Ownology anything · Share your invite link)

Stripe success_url should switch from `/founding-member/success` → `/onboarding?session_id={CHECKOUT_SESSION_ID}`

---

## Success metrics (what we measure)

Ship the wizard behind a feature flag; measure vs. control (current dead-end page):

| Metric | Baseline | Target after 30 days |
|---|---|---|
| % of paying users who complete step 2 (branding) | 0% (doesn't exist) | ≥ 60% |
| % who complete all 4 steps | ~0% (via manual email nag) | ≥ 40% |
| Time from checkout to first Cellar Brief opened | ~2–3 days (email round-trip) | ≤ 3 min |
| 30-day activation (≥ 5 vintage_log_entries logged) | Not tracked | ≥ 50% |
| Refund requests within 7 days of checkout | Unknown, treat as our baseline | ≤ half of baseline |

Data source: `onboarding_events` table + existing analytics.

---

## Build effort estimate

| Milestone | Effort | Notes |
|---|---|---|
| Migration + schema (users.primary_use_case + onboarding_events) | 0.5 hr | Copy `add-nurture-fields.mjs` pattern |
| `Onboarding.tsx` shell + reducer + 4 step components | 4 hr | New page, no new components — reuses `AdminSettings.tsx` field patterns |
| `winery.scrapeBranding` procedure + SSRF guard + node-vibrant | 5 hr | Main risk area — network reliability + fallback UX |
| `referrals.applyToCurrent` + Resend congrats | 1.5 hr | Extends existing `nurtureEmail.ts` sender pattern |
| Stripe success_url swap + `/onboarding/complete` page | 1 hr | Trivial |
| Feature-flag + measurement wiring | 1 hr | Env var + logging |
| Testing agent E2E + polish | 2 hr | Full happy-path + skip-every-step path |
| **Total** | **~15 hr** | ~2 solid days |

Cost per install (Founding-Member flow only, low volume): ~$0.001 (single fetch + node-vibrant CPU) — negligible.

---

## Rollout plan

1. **Ship behind `ENABLE_ONBOARDING_WIZARD=true`** — dark launch. Only your test winery hits it.
2. **Run through it yourself end-to-end** — mostly to feel the copy pacing on mobile.
3. **Flip to on for all new Founding Members** — measure 30 days.
4. **If metrics hit target**: extend to all new signups (not just Founding). Trial users benefit too.
5. **If step 2 completion < 40%**: audit the scraper failure mode. Most likely a WordPress/CDN edge case.

---

## Risks & mitigation

| Risk | Mitigation |
|---|---|
| Scraper fails on JS-rendered logos (React SPAs, Wix, Squarespace) | Fallback UX at step 2 is a first-class citizen, not an error state. Copy: "Couldn't detect that — upload manually" with a chirpy tone. |
| SSRF attack via `websiteUrl` | Guard: block `10.*`, `192.168.*`, `127.*`, `169.254.*`, resolved IPs must be public. Timeout 5s, response cap 5MB. |
| User abandons at step 2 with no branding saved | Auto-run `onboarding_events` write on unmount — we still know they hit it, still send a reminder email 24h later. |
| Referral back-attribution double-counts | `referrals.applyToCurrent` idempotency check on `referred_user_id NOT NULL`. |
| Wizard adds 60s to a stressed post-checkout moment | All steps skippable. Skip button is same visual weight as continue. Total time visible in header ("Step 2 of 4 · About 40 seconds left"). |

---

## Explicitly out of scope for v1

- **Team-member invites** during onboarding — winery is single-user in the wizard. Team-seat flow is a separate future spec.
- **Payment method management** — Stripe already handled that pre-wizard.
- **Multi-currency / GST tax collection** — Stripe handles.
- **A/B testing framework** — the feature flag is binary on/off. Real A/B is a future investment.
- **In-wizard tutorial / product tour** — different UX. If we want that, it belongs on `/guide`, not here.

---

## Related files (for the agent who builds this)

- `/app/client/src/pages/FoundingMemberSuccess.tsx` — will be repurposed, keep for fallback
- `/app/client/src/pages/AdminSettings.tsx` — winery name / logo / brand color field patterns to reuse
- `/app/server/routers/foundingMembers.ts` — where Stripe success_url is set
- `/app/server/routers/winery.ts` — where `update` mutation lives (already accepts contactName, brandColor, logoUrl)
- `/app/server/scheduled/nurtureEmail.ts` — Resend send pattern to copy for `applyToCurrent` congrats
- `/app/scripts/add-nurture-fields.mjs` — migration pattern
- `/app/server/lipAuditPackPdf.ts` — will render with the newly-captured logo + brandColor immediately after wizard completes. Zero extra work — it already reads these fields.

---

## Why now (vs. later)

Every day a paying customer's first document renders in default amber instead of their brand is a day of missed "worth $997" signal. The LIP Audit Pack we just shipped (iter-24) is regulator-ready — but if their name is missing or in the wrong colour, they'll re-generate it once we ship this wizard, and the second impression matters less than the first.

Ship this **before** the next 5 paid conversions to lock in first-impression control.
