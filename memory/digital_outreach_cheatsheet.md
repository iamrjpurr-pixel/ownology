# Ownology · Digital Outreach Cheatsheet

**Purpose**: the modern outreach workflow — Perplexity → `/hi/{slug}` → track opens → follow up.
**Companion to**: `cold_call_playbook.md` (the phone-script bible — still valid, still evergreen).
**Version**: v1.0 · Feb 2026

---

## The 20-minute Monday-morning routine

1. **Coffee.** Open `/admin/members` (or `/admin/contacts`).
2. **Yesterday's page-openers.** Any row with `viewCount > 0` and no `demoBookedAt` — those are your warm leads. Follow up.
3. **Add 5 new contacts** using Perplexity research (see below). 15 seconds each.
4. **Send 5 messages** — one line + their `ownology.ai/hi/{slug}` URL. 5 minutes.
5. **Nudge 2 old ghosts** — resend the URL. The page will show them a **different** pitch (variant rotation).
6. **Done.** Back to the cellar.

**Weekly funnel target**: 25 touches → 10 opens → 3 replies → 1 booked demo.

---

## The two URLs — know when to use which

| URL | When to use | Why |
|---|---|---|
| **`ownology.ai/join?ref=firstname`** | Cold, no prior context, no research | Generic Founding Partner pitch — same page for everyone, `?ref=` just personalises the eyebrow greeting |
| **`ownology.ai/hi/{slug}`** ⭐ | Researched (Perplexity) OR met in person | Fully personal: their name, their winery, their role-persona pitch, their source-of-contact, tracked opens, variant rotation on re-open |

**Default to `/hi/`** whenever you've saved them in the DB. It's dramatically more effective.

---

## Adding a contact — three ways

### Way 1: Perplexity research (fastest — 15 seconds)

1. In `/admin/contacts`, top-right box: type winery name.
2. Hit **Research**. Perplexity returns name + IG + LinkedIn + region + pain-point + citations.
3. **Persona is auto-suggested** — Perplexity flags Owner / MD / Sales Rep / Winemaker based on the person's role.
4. Review and tweak. Fill in `Event` field with the source: `"Perplexity research"`, `"Cold IG scroll"`, or a real event name if applicable.
5. Hit **Save contact**. Personal URL is created: `ownology.ai/hi/{firstname-winery}`.

### Way 2: URL Quick-Add (paste a winery website)

1. Paste a URL — winery homepage, LinkedIn profile, IG page, Google Business listing.
2. System extracts contact fields into the form.
3. Set persona manually (Perplexity suggestion isn't available here — default is Winemaker).
4. Save.

### Way 3: Manual add (met them in person)

1. Fill the form directly.
2. **CRITICAL: fill the `Event` field** with where you met them — e.g. `"Pluto Wine Bar takeover winemakers dinner"`, `"VIVID Cult & Classic Jun 2026"`, `"McLaren Vale Sundowners 2026"`.
3. Set persona (MD / Winemaker / Owner / Sales Rep — think about which pitch fits them best).
4. Save.

---

## The four personas — which pitch does what

Same URL. Different bullets depending on `persona` field. **Pick with care — this frames the whole pitch.**

| Persona | Who it fits | Sample bullet |
|---|---|---|
| **MD** *(Managing Director / GM / CEO)* | Business decision-maker. Cares about cashflow, staff hours, board reporting. | *"$9/month costs less than the coffees your winemaker buys on the way to the cellar."* |
| **Winemaker** *(default)* | Chief / assistant winemaker. Cares about cellar, chemistry, 3am peace of mind. | *"Vintage is chaos. Ownology is the quiet assistant who remembers what you did to tank 4 on Tuesday."* |
| **Owner** *(Founder / Family)* | Brand-holder, generational, legacy-focused. | *"The next generation of your winery will inherit clean records, not shoeboxes of paper."* |
| **Sales Rep** *(Trade / Cellar door / Distribution)* | Not the buyer — the amplifier. Cares about pocket cheat-sheets at trade shows. | *"Every wine you sell has a story. Ownology puts that story on your phone at the tasting bench."* |

**When in doubt → Winemaker.** Largest cold-call bucket, safest generic pitch.

**Spirits/beer/cider makers** → Sales Rep (honest pitch that doesn't over-promise on wine-specific chemistry).

---

## What Sarah sees when she taps her URL

Say you saved Sarah Feehan (Parley Wines) via Perplexity with `persona=owner` and `event="Perplexity research"`.

Her phone opens `ownology.ai/hi/sarah-parley-wines` and shows:

> **G'day Sarah.**
>
> *(if event was set to a real place)* *We crossed paths at Pluto Wine Bar takeover — sending this your way for Parley Wines.*
> *(if event was "Perplexity research" or blank)* Honest fallback: *"We didn't get long to chat — I've since shipped something I reckon could save you real time."*
>
> **Thought this might be relevant**: *Female-led small-batch producer with lightweight record-keeping across production and DTC sales.*
>
> ✦ The next generation of your winery will inherit clean records, not shoeboxes of paper.
> ✦ Your name on the bottle deserves better than 40 open tabs.
> ✦ Founding-partner pilot: $9/month, shape the tool with us, keep the founder's rate forever.
>
> **📅 Book a 20-min demo →**

If she doesn't book and you resend the URL 3 days later, she sees a **different set of bullets** (variant idx 1 of 5). Same URL. Fresh pitch.

---

## Sending the URL — templates

### SMS (winemaker on the road)

> Sam — Rich Ownology. Cellar tool built for boutique makers. Have a peek when you're near a screen: ownology.ai/hi/sam-{winery} — your name's on the top of the page.

### IG DM (natural / small-batch producers)

> Sarah — Rich from Ownology in Vic. Loved the Young Gun of Wine piece on you & Melissa. Built a cellar tool that thought you two might appreciate. Have a peek when you get a chance: ownology.ai/hi/sarah-parley-wines

### Email (formal / MD-level)

> **Subject**: Cellar intelligence tool for {winery} — 60-second look
>
> Hi James,
>
> Rich from Ownology — building a cellar intelligence platform for boutique winemakers. Twelve founding partners this quarter, and Poole's Rock came to mind given the Sem/Shiraz depth.
>
> 60-second look, personalised: **ownology.ai/hi/james-poole-s-rock**
>
> If it clicks, book a 20-min chat straight from the page. If not, no chase.
>
> — Rich

---

## Track who opened

Back in `/admin/contacts`:

- **`viewCount > 0`** → they tapped the link. Warm lead.
- **`smsSentAt` set, `viewCount = 0`** → sent but not opened. Wait 3 days, resend.
- **`ctaClickedAt` set** → they hit the primary CTA (Book Demo / Reply RED). Follow up within 24hr.
- **`demoBookedAt` set** → they booked. 🎉 Prep for the call.
- **`repliedAt` set** → they replied but haven't booked yet. Push for the calendar.

**Rule**: if a lead opens 3+ times without booking, they're stuck. Send one more human message ("thoughts?") and move on. Don't chase.

---

## Do & Don't

**Do:**
- ✅ Always fill the `Event` field — it makes the greeting personal.
- ✅ Set persona consciously — the pitch changes completely.
- ✅ Send the URL slowly, once. Trust the page.
- ✅ Watch for opens in `/admin/contacts` before you follow up.
- ✅ Use `/join/qr` at trade shows for scan-and-go.

**Don't:**
- ❌ Send `/join?ref=` when you've done research — use `/hi/{slug}` instead.
- ❌ Argue with an objection over DM — the page's variants do the work.
- ❌ Blast the same URL twice in one week without a reason.
- ❌ Over-promise on beer/spirits — set persona to `sales-rep` and be honest.

---

## When something doesn't work

- **Page not personalising** → confirm the slug matches. `ownology.ai/hi/sarah` won't work if the slug is `sarah-parley-wines`.
- **Wrong pitch showing** → check the persona field in `/admin/contacts`. Change it, refresh.
- **Greeting missing "we met at..."** → the `event` field is blank. Add it and reload.
- **They opened but didn't book** → resend after 3 days. They'll see a fresh variant.

---

## Companion docs

- **`cold_call_playbook.md`** — phone-first scripts (opener, branches, objections, voicemail, email follow-up). Still fully current.
- **`MARKETING_ANALYSIS.md`** — positioning, competitive landscape, geographic strategy.
- **`DESIGN_RULES.md`** — the three rules every new pitch surface must follow.

---

*"You are the must. Ownology is the ferment."*

**Version**: v1.0 · Feb 2026 · digital outreach flow (Perplexity + `/hi/{slug}` + persona-tuned pitches)
