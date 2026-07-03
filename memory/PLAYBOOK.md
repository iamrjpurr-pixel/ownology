# Ownology Playbook — Rich & Gel

_Last updated: Feb 2026 · Living document · Update as the app grows_

> The one-page you print. The rest is a reference. If you only read one section, read **§1 The Daily 10 Minutes**.

---

## §1 · THE DAILY 10 MINUTES

Every morning, in order. Timer at the top of your phone.

| # | Action | URL | Time |
|---|---|---|---|
| 1 | Open the Cellar Brief email in your inbox | (Gmail) | 30 sec |
| 2 | Skim the alerts — any red? Click into the alert. | `/cellar-brief` | 2 min |
| 3 | For each red alert: open the referenced tank/batch, decide action, close the alert or convert to a task | `/dashboard` | 3-4 min |
| 4 | Log any additions or observations from yesterday you forgot | `/quick-entry` | 2 min |
| 5 | Check `/cellar-tasks` — do any tasks due today. Snooze the rest. | `/cellar-tasks` | 2 min |

**Rule**: If any single item takes >5 min, log it as a task and move on. The Daily 10 is a triage pass, not a deep work session.

---

## §2 · THE WEEKLY 30 MINUTES

Every **Monday at 9am** (or first working morning of the week).

1. **Vintage plan for the week** — `/cellar-tasks` filter by "next 7 days". Confirm each task has a barrel/tank assigned. Move anything undoable this week to `Later`.
2. **Sales pipeline pass** — `/admin/contacts/pipeline`. For every contact in `Reached out` older than 5 days: decide *reply / bump / drop*. For every contact in `New`: send the pre-written SMS via the pipeline UI.
3. **Founding Reservations** — `/admin/settings` → Recent Reservations widget. Any reservations from the last 7 days you haven't personally replied to? Reply now, direct from your Gmail.
4. **Content flywheel** — publish 1 Cellar Journal entry. Even 200 words. This is the SEO compounder. Draft anywhere, paste into `/admin/cellar-journal/new`.
5. **Numbers pulse** — `/admin/funnel`. Note: visits, quiz completions, reservation rate, unsubscribe rate. Write a one-line thought in your journal.

**Rule**: If you skip the weekly for 2 weeks in a row, the vintage AND the sales pipeline both slip. Reset with a 60-minute make-up session, not a "wait till next month".

---

## §3 · VINTAGE-CRITICAL CHECKPOINTS

These are the moments where letting a day slip actually damages wine. Non-negotiable.

| Trigger | Deadline | Where in Ownology |
|---|---|---|
| Fermentation Brix stalled ≥2 days | 24 hours to intervene | `/cellar-brief` alert → check YAN, temp, yeast viability |
| MLF complete (malic <0.15 g/L) | 48 hours to add SO₂ | `/quick-entry` → log measurement → alert triggers |
| Barrel topping | Weekly minimum | `/cellar-tasks` weekly recurring task |
| Cold-stab test | Before bottling | `/cellar-tasks` one-off before bottling window |
| Free SO₂ recheck on reds | Fortnightly during aging | `/cellar-tasks` fortnightly recurring |
| Founding member reservation received | 4 hours to reply personally | Gmail + `/admin/settings` |

**Rule**: When these fire, the Daily 10 becomes the Daily 30. Set the timer accordingly.

---

## §4 · THE FIVE WORKFLOW SOPs

### SOP 1 — Log a bench trial or addition (2 min)
**When**: any time you add something (SO₂, DAP, PMS, bentonite, fining agent) OR you run a bench trial.

1. Open `/quick-entry`
2. Pick the tank/barrel from the dropdown
3. Choose event type: `addition`, `measurement`, `bench_trial`, `observation`, or `racking`
4. Fill the JSON fields exactly as the form asks. Chemistry values ONLY. No fluff.
5. Add tags: `SO2`, `bottling-prep`, `MLF`, `stuck-ferment` etc. (Reused tags = better search later.)
6. Hit save. Confirmation flash appears.
7. If the addition was above your usual rate, the AI will flag it in tomorrow's Cellar Brief. Check for that.

**Gotcha**: Don't paste tasting notes into the note field — they belong in the Cellar Journal (SOP 4). This field is chemistry + immediate context only.

### SOP 2 — Act on a Cellar Brief alert (3-5 min per alert)
**When**: every morning, from the Cellar Brief email or `/cellar-brief`.

1. Read the alert's ONE-LINE summary. Understand what the AI thinks is wrong.
2. Click the alert → opens the batch/tank detail with recent log entries pre-loaded.
3. Cross-check the chemistry: does the AI's diagnosis match what you'd expect given the last 3 entries?
4. Decide: **Act now** (add something, take a measurement) OR **Convert to task** (schedule for tomorrow/this week).
5. If acting now: perform the action in the cellar, then log it via SOP 1. That closes the alert.
6. If converting to task: click "Convert to task" on the alert. Assign due date + owner (Rich or Gel).

**Gotcha**: Some alerts are stale (based on old data). If a measurement 3 days ago triggered the alert but you've since fixed it and just haven't logged the fix — LOG THE FIX (SOP 1). The alert vanishes on next scheduled run.

### SOP 3 — Send outreach to a VIVID contact (3 min per contact)
**When**: Monday weekly sweep, or ad-hoc when you meet someone.

1. Open `/admin/contacts/pipeline`
2. Filter by status = `New` (or the segment you want to work)
3. Click a contact → the pre-written SMS draft loads on the right
4. Read it. Personalise the FIRST LINE ONLY (mention what you talked about, or what caught your eye about their winery)
5. Copy the draft. Paste into your SMS app. Send.
6. Back in Ownology, click "Mark sent" — moves them to `Reached out`, timestamps it.
7. Set a follow-up reminder for 5 days later (auto-done by the pipeline).

**Gotcha**: NEVER send generic drafts unpersonalised. First line personalisation is what makes them reply. If you're too rushed to personalise, skip them and come back — sending the generic template WILL burn the contact for good.

### SOP 4 — Publish a Cellar Journal entry (10-20 min for 200-500 words)
**When**: weekly, minimum once. This is your SEO flywheel — every entry ranks for a long-tail winemaking question over time.

1. Pick a question you actually answered this week. Format: "Why did my [X] happen?" or "How much [Y] should I add?" or "What's the difference between [A] and [B]?"
2. `/admin/cellar-journal/new`
3. Write in your own voice. Rich & Gel — amateur, curious, honest. Cite AWRI, WSET, or specific producers where relevant.
4. Aim for 200-500 words. Include one specific chemistry number (SO₂ ppm, TA g/L, pH). Include one specific producer or region.
5. Add 3-5 tags. Reuse existing tags where you can.
6. Preview. Fix typos. Publish.
7. On publish, Ownology auto-generates the OG image and pings the RSS feed. Sitemap updates within 24h.

**Gotcha**: Don't over-edit. The point is compounding volume, not perfect posts. If it took >30 min, ship it and move on.

### SOP 5 — Handle a Founding Member reservation (10 min per reservation)
**When**: as soon as one lands. You get an email. `/admin/settings` shows the widget.

1. Open the reservation email in Gmail (or `/admin/settings` → Recent Reservations)
2. Reply within 4 hours from `support@ownology.ai`. Personal, short. Use the phrase: *"Rich here — Gel's on the way in. We saw your reservation. Are you free for a 20-min call this week?"*
3. If they reply yes: schedule via Calendly link (in your email signature) or manually. Note in your calendar.
4. On the call: hear their story. Don't pitch. Ask about their vintage, their bottleneck, their tools. If Ownology fits, close on the founding-member offer.
5. After call: update reservation status in `/admin/settings` widget: `contacted` → `booked` → `paid` (once card cleared).
6. If they no-show or ghost: 3 gentle follow-ups over 10 days, then archive.

**Gotcha**: The reservation is a soft signal, not a sale. Founding members convert when they FEEL you're the real deal. First 4 hours matter more than any offer terms.

---

## §5 · WHERE THINGS LIVE (a map)

Quick reference. Bookmark these.

### Public (customer-facing)
| Path | What it does |
|---|---|
| `/` | Home — hero, pricing, blog teasers |
| `/quiz` | Wine Recommender Quiz — 6 questions → wine pick → founding-member CTA |
| `/pricing` | Founding Member plans + reservation modal |
| `/cellar-journal` | Public SOP + Q&A index |
| `/free-run` · `/the-press` | Product story pages |
| `/blog` | Long-form marketing content |
| `/our-story` | Rich & Geraldine's origin (full names here — everywhere else uses Rich & Gel) |

### Winemaker (day-to-day)
| Path | What it does |
|---|---|
| `/dashboard` | Live cellar overview, alerts, tank status, active batches |
| `/cellar-brief` | Daily AI brief (also emailed each morning) |
| `/cellar-tasks` | To-dos with due dates, one-off + recurring |
| `/quick-entry` | The primary logging surface — additions, measurements, bench trials |
| `/onboarding` | Only for new users — you shouldn't see this unless testing |

### Admin (once a week or less)
| Path | What it does |
|---|---|
| `/admin` | Landing page — links to everything below |
| `/admin/settings` | Winery name, contact, Recent Reservations widget, dev-bypass toggle |
| `/admin/contacts/pipeline` | VIVID pipeline — 31 contacts + SMS drafts |
| `/admin/funnel` | Traffic, quiz completions, reservation rate |
| `/admin/leads` | Inbound leads from any source |
| `/admin/cellar-journal/new` | Publish a Cellar Journal SOP or Q&A |
| `/admin/vintage-intelligence` | Deep-dive analytics on vintage patterns |
| `/admin/trinity` | Content dedupe / clustering (rarely needed) |
| `/admin/wbs` | Work Breakdown Structure — internal roadmap |

### Rarely-touched but critical
| Path | What it does |
|---|---|
| Emergent Dashboard | Deploy button. Environment variables. **Only clickable by you.** |
| Namecheap DNS | Domain records. MX, SPF, DKIM. Touch when adding services (Resend, Google Workspace). |
| Resend dashboard | Email domain verification + send logs |
| Railway MySQL | Data. Don't touch directly unless you know why. |
| GitHub repo | Code. Auto-updated when you click "Save to GitHub" |

---

## §6 · WHEN THINGS BREAK

### "Emails aren't sending"
1. `curl https://ownology.ai/api/scheduled/daily-alert-email?dryRun=1` → check response for "not verified"
2. If not verified: log into Resend → domains → click Verify. If already verified, check `ALERT_FROM_EMAIL` matches a verified domain.
3. If verified but silent: check spam folder. First 20 emails from a new domain sometimes ghost-drop.

### "The site looks wrong / theme is stuck"
1. Hard refresh (⌘⇧R)
2. Check bottom-right theme pill. Click it, cycle through themes, confirm they visibly change.
3. Open DevTools → console — any red errors? Screenshot and send to Rich for triage.

### "My changes aren't showing at ownology.ai"
1. Preview vs prod check: is the change visible at your preview URL? If YES → you need to redeploy.
2. Emergent Dashboard → Deploy button. Takes 2-4 minutes.
3. After deploy, hard-refresh ownology.ai. Cloudflare cache is 5 min so you may see stale for a few more min.

### "I lost the Emergent LLM key balance"
1. Emergent Dashboard → Profile → Universal Key → Add Balance. Enable auto-topup.
2. If already zero: Cellar Brief AI generation pauses until balance restored. Chemistry logs still work.

### "A reservation didn't come through"
1. Check `/admin/settings` Recent Reservations widget
2. Check Gmail spam
3. Check Railway MySQL: `SELECT * FROM founding_reservations ORDER BY created_at DESC LIMIT 5;`
4. If nothing in DB: the form submission failed. Ask the user to retry via the reservation modal on `/pricing`.

---

## §7 · WHAT NOT TO DO

- **Don't touch the seed winery row (id=1) in MySQL directly.** Use the seeder script instead.
- **Don't set `ALERT_TEST_TO` in production.** It funnels all alert emails to one address — real users won't get theirs.
- **Don't hardcode secrets in code.** All secrets go through Emergent Production Secrets + preview `.env`.
- **Don't send generic outreach SMS.** Personalise the first line every time, or skip.
- **Don't publish a Cellar Journal entry that just paraphrases AWRI.** Add your own voice or a specific number/producer, or don't publish.
- **Don't chase every metric.** Reservation rate is the only one that matters right now. Everything else is vanity until you have paying members.

---

## §8 · THE 90-DAY GOAL

Every SOP above serves one goal: **5 paying founding members by end of April 2026.**

Right now (Feb 2026):
- 12 batches in the cellar (2026 vintage seeded ✅)
- 31 VIVID contacts in the pipeline
- 0 founding members
- Wine Quiz live, Cellar Journal SOPs indexing, email pipeline verified

The math: 31 contacts × 15% reply rate × 30% call rate × 50% close rate = **~0.7 members**. You need to work the top of the funnel harder OR raise conversion at each step. Both are in this playbook.

If you're at 0/5 by end of Feb, revisit outreach — the SMS opener is probably wrong.
If you're at 0/5 by end of March, revisit pricing or offer.
If you're at 0/5 by end of April, revisit ICP — you're targeting the wrong winemakers.

Ship, measure, adjust. Everything else is noise.

---

*— Written for Rich & Gel · Ownology · Adelaide Hills, SA*
*Update this doc as the app grows. Delete SOPs that no longer match reality. Add ones for new workflows as they emerge.*
