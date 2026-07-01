# Ownology — Go-Live Audit & 48-Hour Launch Plan

> Compiled Feb 2026 · Codebase state: iter-25 (LIP badge shipped) · Target: warm-contact launch

---

## Executive summary

**We can go live in 48 hours** — with one honest constraint: full Stripe checkout probably won't be live in time, so the plan pivots the offer from **"pay now"** → **"reserve your Founding-Member slot, we'll invoice you"**. That's a stronger warm-contact move anyway — it prices out cold traffic and rewards the people who trust you enough to say yes on a promise.

**Three genuine P0 blockers to fix:**

1. **Google OAuth is not configured for prod** (`OAUTH_SERVER_URL=example.invalid`) — no one can log in
2. **`ENABLE_DEV_BYPASS` must be explicitly `false` in prod** — currently empty, would auto-log-in every visitor as the seed owner (huge security hole)
3. **No legal pages** (Privacy / T&Cs / Refund) — required to accept email addresses in AU/EU

Everything else is either fixable in <2hrs or genuinely deferrable to post-launch.

---

## 1 · Critical findings by severity

### 🔴 P0 — Blockers for launch

| # | Issue | File / Location | Impact | Fix effort |
|---|---|---|---|---|
| 1 | `OAUTH_SERVER_URL=https://example.invalid` in `.env` | `/app/.env` | Google OAuth login flow returns error. No user can complete signup. | Set to real OAuth URL at deploy time (or use trial-signup form workaround, see §3) |
| 2 | `ENABLE_DEV_BYPASS=""` (empty → treated as true in non-prod) | `/app/server/index.ts:84`, `/app/server/trpc.ts:109` | Every visitor to prod would auto-log-in as the seed owner "Redstone Ridge Wines". Data leak + auth bypass. | Set `ENABLE_DEV_BYPASS=false` explicitly in prod env |
| 3 | `NODE_ENV=development` in `.env` | `/app/.env` | Combined with #2, dev-bypass activates. Also disables prod-mode React optimisations. | Set `NODE_ENV=production` in deploy env |
| 4 | No Privacy Policy / Terms / Refund page | Missing routes | Legally required to accept emails (GDPR/AU Privacy Act). Also required by Stripe. | Draft 3 pages, ~1hr each. Copy templates below in §5 |
| 5 | `CRON_SECRET=""` (empty) | `/app/.env` | `POST /api/scheduled/nurture-email` and `daily-alert-email` are publicly triggerable. Anyone can spam Resend, blow through your quota. | Set a 32-char random secret in prod env |
| 6 | `STRIPE_SECRET_KEY=sk_test_stub` | `/app/.env` + `/app/server/routers.ts:81`, `/app/server/merch/api.ts:17` | Real payments impossible. Founding-Member checkout hits `throw new Error("STRIPE_SECRET_KEY is not configured")` if you flip it to real, breaks Pricing page CTA. | See §3 — pivot to reservation form; wire real Stripe post-launch |
| 7 | DNS for `ownology.ai` — status unknown | External | If DNS isn't pointing at the deployment, the sitemap URLs (`https://ownology.ai/cellar-journal/...`) resolve to nothing → Google won't index. | Verify with `dig ownology.ai` before submitting to Search Console |

### 🟡 P1 — Should fix in 48hrs if time allows

| # | Issue | Impact | Fix effort |
|---|---|---|---|
| 8 | No analytics (PostHog / Plausible / GA) | Can't measure launch performance, no attribution for the outreach blast | 30min: paste snippet in `client/index.html` |
| 9 | Home meta description is thin ("AI co-pilot for boutique winemakers…") | Weaker CTR from Google/social shares | 15min: rewrite with concrete number ("236 winemaker Q&As, grounded in real MoreWine manuals") |
| 10 | No Open Graph image / Twitter card | Every share on IG/LinkedIn/WhatsApp renders as a plain link, no visual | 30min: static 1200×630 PNG + `<meta property="og:image">` |
| 11 | No global rate limiting on `/api/trpc/*` | Someone could brute-force `referrals.trackClick` to poison the funnel data | 45min: `express-rate-limit` middleware, 100/min/IP |
| 12 | No error monitoring (Sentry / equivalent) | If prod breaks, you find out from the first customer email, not from an alert | 1hr: Sentry SDK + DSN env var (free tier is fine for <5k events/mo) |

### 🟢 P2 — Post-launch tightening

| # | Issue | Fix effort |
|---|---|---|
| 13 | Nested `<a>` inside `<a>` on `/founding-member/success` (hydration warning) | 5min |
| 14 | `cellarBrief.history` pagination cursor bug | 30min |
| 15 | 40+ oenology curricula chunks pruned but 15 MoreWine PDFs alone don't cover Sparkling MLF well | 2hr, add 3–4 more PDFs |
| 16 | Free-tier gate not enforced on `/api/compliance/lip-audit-pack.pdf` — anyone with a user cookie downloads it | 15min: add `winery.plan === 'paid' \|\| userIsFoundingMember` check |

---

## 2 · What's actually working (the good news)

**Content depth is production-ready.** 279 Ghost Questions live in `/cellar-journal`, 106 real MoreWine chunks in the RAG DB, `sitemap.xml` returning 308 URLs, `robots.txt` correctly disallowing `/admin` and `/api`, health check at `/api/health` returns 200.

**Feature completeness for the story you're selling:**
- Cellar Brief live with LIP compliance badge (iter-25 shipped)
- LIP Audit Pack PDF regulator-ready (iter-24)
- 14-day trial banner + `/trial-ending` conversion page (iter-21)
- Referral engine end-to-end (iter-22): click → email capture → auto-nurture Resend email at day 3 (iter-23)
- Editable winery identity ("Sarah at Redstone Ridge") (iter-23)
- Trinity brand tooltip theme-aware (last bug fixed)

**Deployment infrastructure is honest:** all URLs come from env vars, no hardcoded secrets, health endpoint responds, migrations are idempotent scripts. The code isn't the problem — the config is.

---

## 3 · The 48-hour launch plan

Working backwards from "Sunday evening, contacts blast goes out."

### Track A · Code / content (agent tasks, ~4–6 hours total)

**Hour 0–2 · Legal + trust page shell**
- [ ] Create `/app/client/src/pages/Privacy.tsx`, `Terms.tsx`, `Refund.tsx` (~1hr) — templates in §5 below
- [ ] Add routes to `App.tsx`
- [ ] Add footer links to Home, Pricing, Compliance pages
- [ ] Add analytics snippet to `client/index.html` — recommend Plausible (privacy-friendly, one-line, ~$9/mo, no cookie banner needed)

**Hour 2–4 · Reservation-flow pivot (removes Stripe blocker)**
- [ ] Add a `foundingMembers.reserve({name, email, winery, phone, source})` mutation → writes to a new `founding_reservations` table
- [ ] Swap the Pricing "Start Founding Member" CTA to open a modal reservation form instead of Stripe checkout
- [ ] Send confirmation email via Resend: *"Slot #X reserved for you — I'll DM you within 24hrs to arrange payment"*
- [ ] Alert email to `ALERT_TEST_TO` (you) so you know when someone reserves

**Hour 4–5 · SEO & sharing polish**
- [ ] Rewrite Home `<meta description>` with a concrete metric ("236 winemaker Q&As grounded in real MoreWine manuals")
- [ ] Add Open Graph image (`og:image`) — 1200×630 static PNG with logo + tagline
- [ ] Verify all `/cellar-journal/*` pages have per-page `<title>` and `<meta description>`

**Hour 5–6 · Rate limiting + monitoring**
- [ ] `express-rate-limit`: 100/min/IP on `/api/trpc/*`, 5/hr/IP on `/api/scheduled/*`
- [ ] Sentry integration (or self-hosted logtail equivalent)

### Track B · Ops / deploy (user tasks, ~1–2 hours total)

**Hour 0–1 · Domain + deploy**
- [ ] Verify `dig ownology.ai` returns the deployment's CNAME/A record
- [ ] If not: point DNS at Railway / whatever host you're using
- [ ] SSL cert (Railway auto-issues via Let's Encrypt — 5min after DNS)
- [ ] Set the following env vars in the production deployment:
  ```
  NODE_ENV=production
  ENABLE_DEV_BYPASS=false
  CRON_SECRET=<generate 32-char random>
  OAUTH_SERVER_URL=<real Emergent OAuth URL, or leave for now if using reservation-only flow>
  PUBLIC_SITE_URL=https://ownology.ai
  ALERT_TEST_TO=your-real-email@wherever.com   (was iamrjpurr@gmail.com)
  ```
- [ ] Run the migration script against the prod DB: `node scripts/add-nurture-fields.mjs` (idempotent, safe to re-run)

**Hour 1 · Google Search Console**
- [ ] Add `ownology.ai` as a property (DNS TXT verification is fastest)
- [ ] Submit `https://ownology.ai/api/sitemap.xml` and `https://ownology.ai/api/cellar-journal/sitemap.xml`
- [ ] Expect 24–48hr for first indexing pass; some pages will appear within hours

**Hour 1–2 · Content warm-up**
- [ ] Publish 1 tweet + 1 LinkedIn post *before* the contact blast — creates social proof for anyone who Googles you
- [ ] IG bio update: swap the bio link to `ownology.ai/join?ref=<your-code>` so every follower is attributed
- [ ] Slack / WhatsApp status: "Launching Ownology this weekend"

### Track C · Outreach (user tasks, day-of)

**Sunday evening (send order matters — start with warmest):**
1. Personal DMs to the 5 warmest contacts first (~30min, one at a time — no batching, no templates)
2. 1hr later: email blast to the medium-warmth tier (~15–30 contacts) — templates in §5
3. Following morning: LinkedIn post + IG story
4. Day 2 evening: send a "here's what happened yesterday" follow-up to the medium tier (creates urgency + FOMO for anyone who didn't reply)

---

## 4 · The two acceptable launch outcomes

Neither of these is failure. Set expectations accordingly:

### Outcome A — "Momentum launch"
- 20–40 reservations from the warm list
- 3–5 personal DMs turn into paying Founding Members within the following week
- Zero cold traffic conversions (Google indexing takes 4–8 weeks)
- **What this proves:** the offer resonates. Iteration is on scaling the same message to new lists.

### Outcome B — "Signal launch"
- 5–10 reservations
- 1–2 real conversations booked
- **What this proves:** the offer needs sharpening before scaling — or the list wasn't as warm as it felt. Both are cheap lessons.

**Avoid outcome C** (blast to everyone at once with no personal DMs first): it burns the list for later, and the reply rate on unpersonalised launches is <2%.

---

## 5 · Copy templates

### 5.1 · Personal DM (warmest 5 contacts) — no template, but structure:

```
[Their name] —

[One sentence recalling a specific conversation we've had about their cellar,
or something they said on a podcast/post recently.]

I've built the thing I told you about — [one sentence describing Ownology
as it applies to their specific problem]. It's called Ownology.

I'm opening 99 Founding-Member spots this weekend. Locked-in pricing forever,
your name in the Our Story section if you want it, direct input on what I
build next. $997 one-off, 44-day trial included.

Not asking you to commit today. Just wanted you to see it first.
[ownology.ai/join?ref=YOUR-CODE]

If it's not for you, no pressure — but a 5-minute "here's why not" reply
would be gold.

— Sarah
```

**Why this works:** references shared history, no CTA on paid conversion, asks for feedback instead of money, includes a referral link (attribution works even if they don't reply).

### 5.2 · Warm-email blast (15–30 contacts) — Resend / manual

**Subject line options (A/B if you can, otherwise pick one):**
- `A small thing I built — 30 seconds of your time?`
- `The winemaker's answer engine — Founding-Member spots open`
- `[Their winery] — this might be for you`

**Body:**
```
Hey [name],

Two years ago I got frustrated searching PDFs at 6am to answer a
fermentation question. So I built something.

Ownology is a cellar intelligence tool for boutique winemakers.
Ask any question — SO₂, YAN, LIP compliance, sparkling MLF — and get
an answer grounded in the same manuals your consultants charge $2k
to explain (MoreWine, Scott Labs, Wine Australia).

Three things it does that nothing else does:
  • A daily Cellar Brief at 5:30am — every tank, what needs your
    attention today, and why
  • Live LIP compliance — see the 85% rule against your batches
    months before the audit, not the week before
  • Auto-generated regulator PDFs (Wine Australia s.39F LIP Audit Pack)
    branded with your winery's logo and colours

I'm opening 99 Founding-Member spots this weekend:
  • Locked-in pricing forever ($99/mo tier for the price of the trial)
  • Your name in the Our Story section (optional)
  • Direct input on what I build next
  • $997 one-off — reserved by email, invoice sent later this week
  • 44-day trial included (extra 30 days beyond the 14-day standard)

Reserve a spot: ownology.ai/founding-member?ref=YOUR-CODE
Or just hit reply with any question. I read every one.

— Sarah at Redstone Ridge Wines
Cellar Ops @ Ownology
```

**Why this works:** starts with the origin story (relatable, not sales-y), three concrete features with proof-points (numbers, brand names), an offer with clear pricing and scarcity, two low-friction CTAs (reserve OR reply).

### 5.3 · LinkedIn post (Sunday evening, right after DMs)

```
Two years ago I got frustrated searching PDFs at 6am to answer a
fermentation question.

Today I'm opening 99 Founding-Member spots for Ownology — the cellar
intelligence tool I wish I'd had.

If you're a boutique winemaker, or you know one who dreads LIP audit
week, this is for you. Link in comments.

— Sarah
```
(Post the ownology.ai link in the first comment, not in the post itself — LinkedIn algo penalises external links in the body.)

### 5.4 · IG story (24hr expiry, do this Monday morning)

Single image: your cellar with the Ownology dashboard on your phone in-frame. Caption:
> `99 Founding-Member spots. Locked pricing forever. Link in bio.`

Bio link goes to `ownology.ai/join?ref=YOUR-CODE` — every follower who taps is attributable via the referrals table you already have.

### 5.5 · Follow-up email (Day 2 evening)

**Subject:** `Update from launch weekend`

```
Quick update — [X] of the 99 Founding-Member spots have gone since
Saturday, from winemakers in [region 1], [region 2], and [region 3].

If you were on the fence, the offer's still open through [date].

If it's a "no" — I really do want to know why. 30 seconds of "not for me
because ___" is worth more to me than the sale.

Reply, or reserve here: ownology.ai/founding-member?ref=YOUR-CODE

— Sarah
```

**Why this works:** social proof (`X of 99 gone`) creates urgency without hype, explicit permission-to-say-no keeps warmth, references specific regions (details reduce spam-feel).

---

## 6 · Launch-day runbook

### Saturday morning (pre-launch — 4hr window)
- Deploy latest code with all env vars set correctly (Track B checklist above)
- Manual smoke test the full path yourself:
  1. Open `ownology.ai` in an incognito window
  2. `/cellar-journal` — read 3 random Q&As, check they render
  3. `/pricing` — click "Start Founding Member" → reservation modal opens
  4. Complete reservation with a real (throwaway) email
  5. Check you get the confirmation Resend email
  6. Check `/api/health` returns 200
  7. Check `/api/sitemap.xml` returns 308 URLs
  8. Google `site:ownology.ai` — see what's indexed (probably nothing yet, that's OK)

### Saturday afternoon
- Post to LinkedIn (personal profile)
- Update IG bio link
- Send 5 personal DMs (one every 15 min — leaves you fresh, doesn't feel like a blast)

### Sunday evening
- Send email blast to medium-warmth tier
- Post IG story
- Monitor `founding_reservations` table via `/admin/settings` (add a quick "recent reservations" widget in Track A if time)

### Monday morning
- Reply personally to every reservation (even a one-liner: *"Got it, invoice coming Thursday"*)
- Screenshot the reservation count for social proof in the follow-up email

### Monday evening
- Send Day-2 follow-up email
- If reservations > 15: consider a LinkedIn post celebrating (softly — "wow, [X] winemakers have said yes")

### Tuesday morning
- Book any calls that came from reservations
- Start the invoice send (Stripe live-mode by now, or manual bank-transfer invoices via any invoicing tool)

---

## 7 · Fallback / abort criteria

If by Tuesday evening you have **<3 reservations**, don't panic — but also don't push harder on the same list. Signals to interpret:

- **>50% open rate but 0 reservations** → the *offer* isn't landing. The email got read but no one moved. Iterate the offer, don't blast more emails.
- **<20% open rate** → the subject lines/from-name are wrong. Try again in 3 weeks with a different subject and a different persona.
- **High open, high reply, low reservation** → they liked the message but the reservation flow scared them. Simplify to just an email-capture next time.

Any of the above is FINE and normal for a first launch. The list is still warm for round 2 as long as you don't burn it now.

---

## Appendix — env var reference sheet for the deploy

Copy-paste this into your deploy provider (Railway / Vercel / Fly.io — whichever you're using):

```env
# Core
NODE_ENV=production
PORT=8001
PUBLIC_SITE_URL=https://ownology.ai
ENABLE_DEV_BYPASS=false

# Database (already set from Railway)
DATABASE_URL=<your Railway MySQL URL>

# Auth
OAUTH_SERVER_URL=<Emergent OAuth URL from your Emergent dashboard>
JWT_SECRET=<32-char random secret, regenerate for prod>

# LLM
EMERGENT_LLM_KEY=<your Emergent Universal Key>

# Email (Resend)
RESEND_API_KEY=<your Resend API key>
ALERT_FROM_EMAIL=onboarding@ownology.ai   # must be a verified sender in Resend
ALERT_FROM_NAME=Ownology
ALERT_TEST_TO=<your real email — replaces the dev iamrjpurr@gmail.com fallback>

# Cron (nurture + daily alert)
CRON_SECRET=<generate 32-char random secret; also set in Railway cron header>

# Stripe (post-launch — leave as stub for reservation-only flow, or set for full paid)
STRIPE_SECRET_KEY=sk_test_stub    # or your live key when ready
STRIPE_WEBHOOK_SECRET=whsec_stub  # or your live webhook secret

# Owner (seed identity — used by seed scripts, not user-facing)
OWNER_OPEN_ID=seed-owner-001
OWNER_NAME=Sarah

# Optional but recommended
BUTTONDOWN_API_KEY=<if you're using Buttondown for newsletter>
CELLAR_JOURNAL_WEBHOOK_URL=<if you want new-journal-entry alerts on Slack/Discord>
```

---

## Decision points for you

1. **Reservation-only vs. real Stripe by launch:** if you can get Stripe live keys before Saturday, we build the real checkout. If not, we ship the reservation modal — I strongly recommend the reservation path because it lets you personally onboard the first 5–10 customers, which is priceless learning.

2. **Which tier of contacts to send first:** I'd start with the 5 warmest personal DMs before ANY email blast. If those 5 don't reply within 12hrs, the offer needs work before we blast wider.

3. **Analytics choice:** Plausible ($9/mo, no cookie banner) or PostHog (free tier for <1M events, more features but adds a cookie banner requirement). I'd pick Plausible for launch simplicity.

4. **Open-graph image:** I can generate a text-only OG image programmatically in ~10min, or you can supply a photo. Photo is stronger. Your call.

5. **Track A vs Track B ordering:** I can start on Track A now (legal pages, reservation flow, analytics). You handle Track B (DNS, env vars, Search Console) whenever you're ready.

Which of the 5 above should I address first?
