---
title: The Ownology Induction Style Guide
subtitle: How new users are inducted, how detail is revealed, and why
doc_type: Publication brief
audience: Prospective winemakers · founding partners · internal comms
version: v1.0
published: February 2026
owner: Rich Middlebrook · Ownology
---

# The Ownology Induction Style Guide

**How new users are inducted, how detail is revealed, and why we hold back the good stuff on purpose.**

*A publication brief · Ownology · v1.0 · February 2026*

---

## Contents

1. The problem we're solving
2. The principle: *earn the depth*
3. The four induction surfaces
4. The seven gates
5. The Press reveal law
6. Where the user finds their roadmap
7. What we deliberately do **not** do
8. What "success" looks like
9. Roadmap for the roadmap

---

## 1. The problem we're solving

Boutique winemaking software has two failure modes.

**Failure mode A — the empty dashboard.** The user signs up, lands on a screen full of feature tiles with no data, and bounces within ninety seconds. They cannot tell what the product *is* because there is nothing in it yet.

**Failure mode B — the overwhelming brochure.** The product shows the user everything it *could* do, including deep post-vintage analysis, compliance exports, and multi-year trend graphs. The user is a small-batch producer who hasn't crushed yet. They feel outclassed, close the tab, and don't return.

Ownology has to solve both without picking one. The Induction Style Guide is how.

---

## 2. The principle: *earn the depth*

> **"We must be careful not to go too deep into The Press too soon. We can reveal press architecture but we don't reveal detail until detail has been entered or calculated by the app."** — Rich, February 2026

That sentence is the whole philosophy. It becomes three rules:

1. **Never show a stock photo of the user's own future.** A ferment analysis panel populated with fake numbers is worse than no panel at all — it teaches the user to distrust the numbers when they're finally real.
2. **Always show the shape of the mountain.** The user must be able to see *that* there is a summit called The Press. They just can't visit it yet.
3. **Unlock is earned by real work, not by clicks.** No "acknowledge tutorial" buttons. The gate opens when the user has done the work that makes the next layer honest.

Everything in the induction system flows from those three rules.

---

## 3. The four induction surfaces

There is no single onboarding page. There are four surfaces, each doing one job.

### 3.1 The gate wall — *credibility filter*

A single password (`middx99` today, member-issued tokens tomorrow) stands between the public marketing pages and the working app. Its job is not security. Its job is **intent filtering**. A prospective winemaker who wants to see inside must pause, ask, and be handed a key. That pause is the first micro-commitment.

### 3.2 `/guide` — *the map of the pillars*

Once inside, `/guide` explains the four pillars of Ownology (Journal · Copilot · Cellar Brief · Compliance) in plain English. It is a **conceptual introduction**. No data required. No CTA overload. A five-dot progress meter at the top shows the operator which pillars they have touched. This is where a new user comes to understand *what the product does*.

### 3.3 `/roadmap` — *the journey*

The new page. Seven gates from first tank to first bottling. Each gate is either unlocked (with your live count against it) or locked (with a one-line CTA to the exact action that unlocks it). This is where a new user comes to understand *where they are and what comes next*. It is the induction spine.

### 3.4 The floating admin pill — *the return path*

When an admin previews any invite link, a small "← Back to Admin" pill appears bottom-left. It is invisible chrome to members. It is a lifeline to owners testing the induction they built. This is the piece of the system that lets the operator stay inside the induction loop instead of getting stranded in it.

### 3.5 Two lenses on the roadmap — *novice by default, expert on request*

Progressive disclosure is a novice tactic. A wine writer, a purchasing manager, or a consulting winemaker evaluating Ownology for a client is not a novice — they are a **skimmer**. Making them "earn" every card would be an insult to their time.

The Roadmap therefore ships with two lenses.

- **Novice lens (default).** Locked cards show a one-line "Unlocks →" summary and the CTA to the next action. Full descriptions hidden until earned.
- **Expert lens — Skim mode.** A single toggle at the top of `/roadmap` reveals every gate's full description paragraph regardless of whether it is unlocked. The *reading* is expanded. The *doing* is not. The feature stays gated; the story does not.

Skim mode is client-side, opt-in, sticky. It is not a bypass. It is a **respect signal** — Ownology telling professionals that they can inspect the ceiling before deciding whether to climb.

### 3.6 The wine-professional bypass — *earned depth, requested depth*

A wine writer with a review deadline cannot log a racking event to unlock The Press debrief. A judge cannot invent a batch. A consulting winemaker evaluating Ownology on behalf of eight clients cannot run a demo vintage.

The Roadmap therefore carries a small form on the locked Press card:

> *"I'm a wine professional — request preview access"*

Three fields: role, publication or winery, and an optional note. On submit, Ownology writes a `press_bypass_request` event to the activity log. When Rich (or a future operator role) grants it, a matching `press_bypass_granted` event unlocks The Press card for that user regardless of gate state, with a **"Preview access"** ribbon and copy that clearly says *this is a curated sample, not your own vintage*.

The bypass is not automatic. It is a **light-friction human handshake** — the operator confirms the requester is who they say they are, and grants access. This turns a locked door into a warm introduction, which is worth more than either extreme (fully locked or fully open) would be.

---

## 4. The seven gates

The full progression, in order. Each row of this table maps to a card on `/roadmap`.

| # | Gate | Trigger (from live data) | What unlocks next |
|---|------|--------------------------|--------------------|
| **1** | **Register** | Account exists | Cellar Brief · Ask Owen · this Roadmap page itself |
| **2** | **Register a tank** | Any tank name in the vintage log | Tank-tag autofill · vessel-scoped brief cards |
| **3** | **Register a batch** | ≥1 row in `wine_batches` (variety + tank + vintage) | The Press *architecture card* · per-batch brief cards · SOP suggestions |
| **4** | **First measurement** | ≥1 measurement event (Brix / pH / temp) | Alerts engine (stuck ferment · temp excursion · SO₂ decay) · trend lines |
| **5** | **Ferment in progress** | Any inoculation event, or ≥3 measurements on one vessel | Live-ferment card on the brief · MLF prompts · tasting flywheel |
| **6** | **Post-ferment (racking)** | ≥1 racking event | **The Press full debrief** · vintage comparison |
| **7** | **Bottling** | ≥1 bottling run | Vintage archive · compliance PDF export · Insta Copilot |

**How the gate state is computed.** A single server procedure — `trpc.onboarding.roadmapStatus` — reads the operator's real `vintage_log_entries` and `wine_batches` rows and returns seven booleans plus counts. There is no separate "onboarding completion" table. The user's actual work *is* the completion signal. This means the gate state is always honest, cannot be gamed by dismissing prompts, and cannot drift from reality.

---

## 5. The Press reveal law

The Press is Ownology's post-vintage debrief. It is the most emotionally valuable surface in the product — the moment the operator sees their own vintage narrated back to them with data. Because it is the payoff, it is also the most tempting thing to show too early. The reveal law prevents that.

**Before Gate 3** — The Press is not mentioned. No card. No tile. No hint.

**At Gate 3 (batch registered)** — The Press appears on `/roadmap` as an **architecture card**: what it is, what it will do, what it will contain. No sample data. No mock numbers. The card explicitly says *"we deliberately keep the detail locked until you've racked a batch — a debrief without your own data would be a stock photo."*

**At Gate 6 (racking logged)** — The Press unlocks in full. The architecture card flips to solid amber. The "Open The Press" CTA becomes live. The operator can now read their own post-ferment story, cited back to their own timeline.

**At Gate 7 (bottling)** — The Press adds vintage-year archive and compliance PDF export.

The reveal law is not a marketing tactic. It is a **product ethics** decision. It is how we tell the operator, without saying it, that Ownology only speaks when it has something true to say.

---

## 6. Where the user finds their roadmap

Three entry points, sequenced by user intent.

**Primary — from `/guide`.** Below the intro paragraph is an amber pill: `→ SEE YOUR ROADMAP`. A member coming to understand the product finds it in the natural reading order of the page. This is the ninety-percent path.

**Secondary — from `/admin` → Guide → Roadmap.** For owners previewing member experience. Not surfaced to members.

**Direct — anyone with the gate cookie can visit `/roadmap`.** Bookmarkable. Sharable to a co-founder or advisor.

No first-run modal. No forced tour. The Roadmap is available on demand, and referenced whenever the user's next step matters. This is deliberate — Ownology treats operators as adults.

---

## 7. What we deliberately do **not** do

The absence of these patterns is as much the style guide as the presence of the others.

- **No "acknowledge to continue" tutorial overlays.** The operator's time is their capital. We do not tax it.
- **No fake data on any surface an authenticated user can reach.** Cellar Journal public posts are curated case studies; every other data-bearing surface reflects reality.
- **No progress badges, no gamified rewards, no streaks.** This is a professional tool. The reward for logging a racking is a better ferment analysis, not confetti.
- **No forced first-run wizard.** The Roadmap is a reference, not a rail.
- **No dark patterns to inflate gate completion.** The seven gates measure *winemaking activity*, not *app engagement*. We would rather have a Gate-2 member for six months than trick them into faking Gate-4.

---

## 8. What "success" looks like

Induction succeeds when three things are true at ninety days.

1. **The operator has crossed Gate 4** — first measurement. This is the point at which Ownology starts giving back more than it takes.
2. **The operator has opened The Press at least once**, either as an architecture card (post-Gate-3) or as a debrief (post-Gate-6). This tells us the reveal law is working — the operator is curious about the summit but not misled about the trail.
3. **The operator has invited at least one collaborator** — a co-founder, a consulting winemaker, a compliance advisor. Ownology becomes structurally valuable when it holds shared context.

If those three are true, the operator will still be here at three hundred and sixty days. Everything in the induction system is built to make those three true.

---

## 9. Roadmap for the roadmap

Three things this document does not yet cover, because they are next.

- **In-page gating of `/the-press` itself.** The Roadmap correctly hides the entry point pre-Gate-6, but a deep-linked visit to `/the-press` today still renders the demo batch. Next release will wire the page to `roadmapStatus` and render either the locked placeholder or the operator's own real batch. No middle ground.
- **First-invite redirect to `/roadmap`.** Today, a first-time gate-verify lands on `/admin` or `/guide`. Next release will route first-use invite tokens straight to `/roadmap` so the induction spine is the operator's *first* Ownology surface, not their third.
- **Public roadmap preview.** A `/roadmap-preview` variant with sample data, mounted under the marketing gate, so prospects can see the shape of the journey before they take it. Doubles as an SEO surface for terms like *"winemaking software workflow"* and *"cellar journal onboarding."*

---

## Colophon

This guide is version 1.0, published February 2026 by Rich Middlebrook for Ownology.
It documents the induction system as shipped in the Roadmap release
(`/roadmap` · `roadmapStatus` procedure · Back-to-Admin pill · Guide Roadmap CTA).
Source of truth: `/app/memory/INDUCTION_STYLE_GUIDE.md`.
Printable in-app version: `/admin/style-guide/induction`.

Ownology is a cellar intelligence platform for boutique winemakers.
Founded 2025 · Adelaide, South Australia · [ownology.ai](https://ownology.ai)

*The map is not the territory. The roadmap is not the vintage.*
