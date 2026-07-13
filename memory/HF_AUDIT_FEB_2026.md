# HF Audit · Feb 2026 · Ownology Site Revamp

**Purpose**: Reconstruct the human-factors engineering audit that drove the Feb 2026 site revamp. The audit itself was a conversation whose scope survived only in the execution record — this doc reifies both the scope AND the shipped state so it survives future context resets.

**Audit lead**: Rich (winemaker + founder, doing the HF thinking himself)
**Format**: audit → prioritized batches → shipped items → deferred items
**Timeframe**: Late June 2026 through Feb 12 2026 (spanning ~6 working sessions)

---

## §1 · What was audited

Every public-facing surface a cold visitor could reach without authentication, plus the induction flow that runs on first-login. Explicitly:

- Homepage (`/`)
- Hero carousel across 4 scenes
- Meet-the-team / About-us surfaces (`/our-story`, `/founding-partners`)
- Pricing (`/pricing`)
- Free Run (`/free-run`, `/ask`) — enthusiast/DIY tier
- Cellar Journal (`/cellar-journal/*`)
- Guide (`/guide`)
- Try/sandbox (`/try`)
- Warm-outreach landing (`/join`, `/hi/:slug`)
- Post-login induction flow (`/roadmap` → renamed `/your-vintage`)
- The Press (`/the-press`) — professional tier flagship
- Admin operator guide (`/admin/operator-guide`)
- Email templates (weekly digest, daily alert, marketing coach)

**NOT in scope for the HF audit** (excluded intentionally): the operations pages themselves (Cellar Brief live view, Batch Book, Vintage Log, Barrels, Packaging) — those are utility surfaces used by paid customers who have already committed; HF-optimising them is a different problem.

---

## §2 · Findings (the "before")

Nine problems identified, ranked P0/P1/P2 by conversion damage:

### P0 · Kills conversions in the first 5 seconds
1. **Category confusion**: cold visitors couldn't articulate what Ownology *is* in one sentence. Site read as "wine software" but "wine software" is either Commerce7 (DTC) or InnoVint/Vintrace (production) — Ownology sat in neither slot cleanly.
2. **No emotional hook in the hero**: subheading described features, not the pain. Visitor's system-1 brain had nothing to grip onto.
3. **Hero AI persona ambiguity**: "Owen" was described inconsistently across surfaces — "AI winemaker" (over-claim), "assistant" (under-claim), "AI apprentice" (correct but not yet consistent).
4. **The Press gating violation**: authenticated users who hadn't crushed a vintage saw a MOCK Shiraz batch presented as if it were real. Reveal-law breach — undermines the "no fake data" promise.

### P1 · Damages positioning
5. **"Roadmap" naming**: the induction flow was labeled `/roadmap`, which sounds like a product roadmap (future features), not a personal journey. Fought the "your vintage" narrative Rich wanted.
6. **Founding cohort ambiguity**: no clear "Founding 99" number visible, no urgency signal, no scarcity anchor. Founding member concept was implicit but not scannable.
7. **No tier chooser**: 4 subscription tiers on Pricing but no wizard to help self-selecting visitors identify which one they were. High cognitive load → decision paralysis → bounce.
8. **Textbook jargon leakage on winemaker-facing surfaces**: phrases like *"industry-standard oenology references"*, *"world-class wine science literature"*, *"decision-support layer"*, *"institutional knowledge"* — consultant-noun language on pages targeting boutique winemakers who don't speak that way.

### P2 · Consistency + polish
9. **Character-of-three story fragmented**: Rich (winemaker), Gel (partner/story), and Owen (AI apprentice) were mentioned in scattered places but never introduced as a coherent team. Weakened the "not a Silicon Valley product" positioning.

---

## §3 · Prioritized batches (the plan)

The audit output was 4 batches, ordered for maximum conversion lift per unit of work:

### Batch 1 · Homepage hero + team narrative (highest conversion lift)
- Rewrite hero using **category noun + audience + enemy line** pattern
- Lock the enemy line via formal HF scoring (van der Meer + Sherif frameworks)
- Build "Meet the Cellar" section introducing Rich · Gel · Owen as a three-person team
- Confirm Owen name via HF analysis (familiarity effect · Zajonc · reposition-only sufficient)

### Batch 2 · Induction flow rename + tier chooser
- Rename `/roadmap` → `/your-vintage` (with legacy alias for existing links)
- Add 3-question tier chooser to Pricing
- Rename "Founding Members" → "Founding Cohort · 2026" across 5 surfaces

### Batch 3 · Reveal-law compliance on The Press
- Three-state gating: locked / preview-bypass / naturally-unlocked
- Preview access ribbon on bypass state (evaluator-facing)
- First-invite redirect to `/your-vintage`
- Admin `/admin/press-bypass` UI for one-click grant

### Batch 4 · Live proof replaces "coming soon" placeholder
- Replace "Demo video coming soon" section with **live Cellar Brief teaser** — real cellar data preview, three vessel cards, dynamic headline

### Deferred (P2, "next 30 days")
- `/compliance-score` SEO lead-gen tool
- Jargon audit sweep across `/guide` + `/pricing` + email templates
- Cellar Journal tier signaling (Free Run vs The Press)

---

## §4 · What shipped, mapped to files + git commits

All commits on `main`, all pushed to Railway prod. Every URL below returns 200 on `https://www.ownology.ai`.

| Batch | Ship | Commit | Date | Files |
|---|---|---|---|---|
| 1 | Meet the Cellar section (Home.tsx 1250-1316) | `1abe7bd` | 2026-07-12 07:52 | Home.tsx |
| 1 | Hero: category noun + enemy line | `8aaa26d` | 2026-07-12 08:07 | Home.tsx |
| 1 | HeroCarousel v4 · "The Apprentice Arc" (4 scenes) | earlier | ~2026-07-08 | HeroCarousel.tsx, WhyOwnologyBoxes.tsx |
| 1 | Owen "con·science" motif + Why-window | earlier | ~2026-07-06 | HeroCarousel, WhyOwnologyBoxes |
| 2 | Founding Cohort · 2026 rename × 5 | `ca9c5df` | 2026-07-12 08:15 | Pricing, FoundingPartners, JoinLandscape, Home |
| 2 | `/roadmap` → `/your-vintage` + alias | `d1cf52e` | 2026-07-12 10:15 | App.tsx, Roadmap.tsx |
| 2 | Pricing 3-question tier chooser | `d1cf52e` | 2026-07-12 10:15 | Pricing.tsx |
| 3 | Reveal-law on `/the-press` (3 states) | `2b20a66` | 2026-07-11 23:44 | ThePress.tsx |
| 3 | First-invite redirect → `/your-vintage?welcome=1` | `2b20a66` | 2026-07-11 23:44 | server/index.ts, Roadmap.tsx |
| 3 | `/admin/press-bypass` owner UI | `783492b` | 2026-07-12 00:06 | AdminPressBypass.tsx, onboarding.ts |
| 3 | Skim Mode indicator (Nielsen H1) | `783492b` | 2026-07-12 00:06 | GuideSkimIndicator |
| 3 | Varied locked-gate CTAs (Brehm) | `783492b` | 2026-07-12 00:06 | Roadmap.tsx |
| 3 | `/try` jargon audit (3 chips + 1 blurb) | `783492b` | 2026-07-12 00:06 | Try.tsx |
| 4 | Live Cellar Brief teaser on homepage | `171a3a1` | 2026-07-12 09:55 | new CellarBriefTeaser.tsx |
| — | UserJourneyDeck at `/admin/deck/user-journey` | `fb44fdb` | 2026-07-12 21:38 | UserJourneyDeck.tsx |
| — | Weekly Cellar Digest email pipeline | `fb44fdb` | 2026-07-12 21:38 | weeklyCellarDigest.ts |
| Deferred → today | Jargon sweep (Bucket B + C3 audience split) | today | 2026-07-12 | ~15 files, hero "The cellar you can talk to" |
| Deferred → today | Cellar Journal tier chip (Free Run · home-scale) | today | 2026-07-12 | CellarJournal.tsx |
| Deferred → today | `/compliance-score` SEO tool | today | 2026-07-12 | new ComplianceScore.tsx + leads.complianceScore mutation |
| Deferred → today | App Health Dashboard + failure-only push | today | 2026-07-12 | AdminHealth.tsx, healthWatch.ts |

---

## §5 · HF frameworks referenced during the audit

- **van der Meer** — concreteness-emotion research. Used to score enemy-line candidates. "The spreadsheet in your winery is lying to you." scored highest on concrete-object + universal-emotion.
- **Sherif** — in-group bonding via shared enemy. Adopted for the enemy-line pattern.
- **Zajonc** — mere exposure / familiarity effect. Used to defend keeping "Owen" name after beta users had already been exposed. Rebranding would cost accumulated familiarity for zero position gain.
- **Nielsen H1** (Visibility of System Status) — drove the Skim Mode indicator on `/guide` (hidden modes cause UX risk).
- **Brehm** — reactance theory. Drove the varied locked-gate CTAs on `/your-vintage` — always-same "unlock via quick entry" CTAs would produce reactance; varying the secondary "learn why" link reduces this.
- **Hick's Law** — surfaced today (Feb 12) as pushback against adding a third CTA to the Cellar Journal paywall block. Adding CTAs statistically reduces click-through on the others.
- **Reveal law** (Rich's own coinage) — users must earn depth; features stay locked until behaviour proves competence. Codified in `/app/memory/INDUCTION_STYLE_GUIDE.md`.

---

## §6 · Style rules that came out of the audit

Codified in `/app/memory/INDUCTION_STYLE_GUIDE.md` §7 ("What we deliberately do **not** do"):

- **No textbook-oenology copy**. Banned: *vinification*, *preparation of high-quality wines*, *the winemaking process* (as noun), *oenological practices*. Winemaker verbs, not consultant nouns.
- **No "wine software" positioning**. Ownology positions as "the winemaker's second brain" — a category of one.
- **Owen is the AI Apprentice**, not the AI Winemaker. He retrieves, cites, structures — never judges.
- **Never present mock data as if real** for authenticated users. Always label "Sample vintage" / "Preview access" / "Free Run · home-scale" when the underlying content is a demo.
- **Founding Cohort · 2026** — that specific phrasing, not "founding members" or "founding partners" or "early access".
- **Three-persona team** always: Rich · Gel · Owen. Not "our team" or "the founders" — the three specific characters, always named.

---

## §7 · What remains deferred (still not shipped)

- **Option B · Professional-tier parallel tutor pipeline** — separate corpus (Boulton, Ribéreau-Gayon, AWRI Technical Reviews, Iland), separate system prompt without home-scale defaults, own Cellar Journal sub-index at `/cellar-journal/pro/*`. Roadmap: Q2 2026, ~2-3 weeks work. Only worth building once you have paid users demanding depth.
- **Real batch pipelining into The Press** — Cellar Journal currently labels itself as sample; The Press still renders `MOCK_BATCH` under a "Sample vintage" ribbon. Real data pull deferred until first customer with real vintage completes.
- **Multi-tenant Vigneron tier** — required before you can onboard a second winery.
- **`/admin/deck-editor`** — DB-backed CRUD for the 4 flash-card decks (currently hardcoded in `oenologyFlashcards.ts`).
- **Redis-backed rate limiter** — currently in-memory (resets on redeploy, not per-IP).
- **`server/index.ts` split** — gate handlers + meta injection to extract for maintainability.
- **`/your-vintage-preview` public variant** — for pitches without gate.
- **Stripe live keys** — deferred by Rich (waiting on billing readiness).
- **Real OAuth** — deferred until public signups open (currently stubbed at `example.invalid`).

---

## §8 · How to re-run this audit

Every ~90 days, or after any significant shipping session (like today):

1. **Cold-visitor test**: Open the site in incognito. Set 5 seconds. Can you articulate what Ownology does in one sentence?
2. **HF lens on the hero**: does the enemy line still land? Is the team-of-three still visible?
3. **Reveal-law check**: are any authenticated pages showing mock data without a "Sample" ribbon?
4. **Jargon sweep**: `grep -rn "oenology\|wine science\|institutional knowledge" client/src/pages client/src/components`
5. **Tier consistency**: does every mention of "Free Run" position it as home-scale? Does every mention of "The Press" position it as commercial-scale?
6. **Cross-reference against this doc**: any new problems in §2 to add? Any deferred items in §7 now ready to ship?

---

**Last audit run**: Feb 12, 2026 · Rich + main-agent
**Next audit due**: ~May 12, 2026 or after next major shipping session
