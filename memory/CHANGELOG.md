# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

### Failure-only push alert for App Health · `/api/scheduled/health-watch` (Feb 2026, Rich)

Companion to the daily health digest. Rich no longer has to wait until 07:00 AEST to hear that Resend/MySQL/LLM died at midnight — a 15-min Railway cron now fires an **immediate** Resend email the moment any probe transitions.

- **New table** `health_probe_state` — one row per probe (Env vars · MySQL · Resend · Emergent LLM key · Auth), persisted so redeploys don't cause spurious "just failed" alerts. Bootstrapped via `CREATE TABLE IF NOT EXISTS` on server boot; also exists in Drizzle schema.
- **New endpoint** `GET /api/scheduled/health-watch` — reuses the same probe set as `healthDigest.ts` (extracted `runAllProbes()` + shared types). Compares each observation against the last-known row, emits **failure** alerts on OK/WARN/SKIP → FAIL and **recovery** alerts on FAIL → OK/WARN. Same `CRON_SECRET` + `ADMIN_EMAILS` config as the daily digest.
- **Suppression window**: 30 min per probe (via `lastAlertedAt`) to prevent duplicate emails inside a settling event. `?force=1` overrides. Dry-run by default; `?send=1` actually mails.
- **Email format**: distinct "JUST FAILED" / "RECOVERED" badges, previous→current status arrow, detail line, hint. Subject line lists the failing probe(s) directly (`[Ownology ALERT] MySQL just failed`) so a phone lock-screen preview is enough context.
- **Railway cron entry** added to `DEPLOY_TO_RAILWAY.md`: `*/15 * * * *` UTC.

**Verified**: initial state seeded, recovery transition detected via forced DB flip, repeat runs correctly silent, dry-run default respected, no lint issues.

---



### Jargon audit sweep · `/guide` + email templates (Feb 2026, Rich)

Applied same lens as the `/try` audit. Six changes across four surfaces.

**`/guide` (Guide.tsx):**
- "Dashboard — KPIs & tank status" → **"Dashboard — your cellar at a glance"** (removed enterprise "KPIs" language)
- Cellar Manager tagline "Production visibility, cost intelligence, and compliance readiness" → **"See the whole cellar. Know what it cost. Know it's audit-ready."** (winemaker verbs, not consultant nouns)
- Head Winemaker tagline "Fermentation control, protocol management, and decision capture" → **"Ferment control, protocols at hand, decisions captured for next vintage."** (grounded in daily reality)
- "Free Run — AI assistant" → **"Free Run — Owen, your AI apprentice"** (Owen brand consistency)
- Pillar card description rewritten around **"Ask Owen anything… He reads your SOPs, cross-references the Red & White Wine Bibles and MoreWine, and cites every source back to you."** (personalised, source-cited framing)
- LIP-audit blurb "exports directly to this schema" → **"exports match this format field-for-field"** (killed "schema")
- WineMaker Magazine blurb "pre-Ownology stage debugging" → **"pre-Ownology reading if you're just starting out"** (killed "debugging")

**Email templates:**
- `foundingReservationEmail.ts` — 5 rewrites: "Founding-Member" → **"Founding Cohort · 2026"** across subject line, HTML header, HTML paragraph, text body, and owner-side notification. Bonus: "the 60-second onboarding" → **"your first login — about 60 seconds"** (removed "onboarding" jargon).
- `nurtureEmail.ts` — HTML + text sync: "at 7am" → **"at 5:30am"** (aligned with Cellar Brief cadence everywhere else), "Ask Ownology" → **"Ask Owen"** (brand consistency).
- `marketingCoachEmail.ts` — audited but not touched. Owner-only internal email (Rich is the audience), winemaker-facing language doesn't apply.
- `dailyAlertEmail.ts` — audited, clean. Already in Owen voice with cellar-native language.

**Verified**: `/guide` renders correctly with new copy ("SEE YOUR VINTAGE" pill, "Ask Owen" pillar). Zero TS regressions. Lint clean.

---

### Weekly Cellar Digest email + User Journey Deck (Feb 2026, Rich)

**Weekly Cellar Digest — SHIPPED end-to-end**
- New `server/scheduled/weeklyCellarDigest.ts` — Monday 05:30 AEST digest email built from `generateCellarBrief(wineryId, "weekly")`. Same data shape as the homepage teaser + `/cellar-brief` page.
- Reused existing Resend integration (`RESEND_API_KEY` already in env), existing `ALERT_FROM_EMAIL=owen@ownology.ai`, existing test-to override, existing CRON_SECRET pattern.
- HTML template + text fallback + winery-name sender personalisation ("Owen · Chalk Hill" style) + STOP-to-pause opt-out language.
- Registered at `/api/scheduled/weekly-cellar-digest` (GET+POST). Owner-triggerable via new `/admin` tile "Weekly Cellar Digest — send now" (opens dry-run in a new tab).
- Dry-run tested live: 6 users scanned, 2 dry-run sends queued for iamrjpurr@gmail.com (testTo override working), 31 cards computed, zero errors.
- Value-engineering: zero new schema, zero new env vars, zero new dependencies. Copy-adapted from `dailyAlertEmail.ts`.

**User Journey Deck — SHIPPED**
- New `client/src/pages/UserJourneyDeck.tsx` — publication-format 9-slide deck at `/admin/deck/user-journey`. Cover + at-a-glance strip + 9 stage slides + colophon. A4 landscape print CSS. Each slide: eyebrow, title, primary CTA card (dashed amber), page reference, "what's on the page" bullets, "human factors" pull-block. Linked from Admin Guide submenu.

---

### Positioning audit execution · Batches 1-4 (Feb 2026, Rich)

Delivered the positioning audit's "this-week" P0 items in full plus all "next-30-days" P1 items including the biggest visual upgrade — live Cellar Brief teaser on homepage.

**Batch 4 — Cellar Brief live-demo hero on homepage:**
- New `client/src/components/CellarBriefTeaser.tsx` — compact 3-row live preview of the /cellar-brief page. Fetches `trpc.cellarBrief.latest`, renders vessel · variety · status pill · stage + days-in-stage.
- Dynamic headline computed from card statuses ("N vessel needs attention today." / "One tank to watch. Everything else steady." / "All clear. Steady vintage.").
- Falls back to a curated 3-card sample from our own cellar (Shiraz T-04 attention · Grenache T-11 watch · Cabernet B-27 ok) when unauthenticated so the marketing surface never breaks.
- Replaces the Manus-era "Demo video coming soon" placeholder in Home.tsx `#demo` section.
- Verified live rendering real data — Barrel 12A · Burgundy 228L (2nd fill) Pinot Noir · pre-ferment day 18 · WATCH; Barrel Rack A · 3× Burgundy 228L Chardonnay · pre-ferment day 9 · WATCH; Barrel Rack B · 4× hogshead + 1× puncheon Shiraz · pre-ferment day 8 · WATCH.

**Enemy line — HF-analysed and locked:** *"The spreadsheet in your winery is lying to you."* — inserted into hero between H1 and subheading. Concrete + universal + emotionally-loaded + product-truth aligned. Beat "Built for cellars, not corporations" on van der Meer's concreteness-emotion research and Sherif in-group bonding.

**Owen keep-decision — HF-analysed:** Owen name kept. The team-of-three story we just landed requires three named characters — killing the name kills the story. Zero rebrand cost. Familiarity effect (Zajonc) means existing beta users already know him. Reposition-only was sufficient.

**Total this session:**
- Homepage hero: category noun + audience + enemy line
- Meet the Cellar (Rich · Gel · Owen apprentice) section
- Founding Cohort · 2026 rename across 5 surfaces
- `/roadmap` → `/your-vintage` rename with legacy alias
- Pricing tier chooser (3-question wizard)
- Live Cellar Brief teaser replacing the placeholder

**Verified live**: `/home` renders hero → team → live-cellar-teaser → pricing → tier-chooser. `/your-vintage` renders progressive gates with correct title. `/pricing` chooser end-to-end tested (boutique/daily/critical → Vigneron recommendation). Zero tsc errors. All new components lint-clean.

**Deferred to afternoon (optional Batch 5/6):**
- `/compliance-score` tool (~90 min · lead-gen + SEO)
- Jargon audit sweep on `/guide` + `/pricing` + email templates (~30 min)

---

### Induction system — P0→P2 fixes shipped (Feb 2026, Rich · human-factors round-2)

Round-2 of the induction system after Rich's human-factors challenge. Value-engineered the deferred list into a single shipped batch.

**P0 — reveal-law compliance on `/the-press`.** Page now consults `roadmapStatus` at render top. Three states:
- **Locked** (no racking, no bottling, no bypass) → new `ThePressLockedPlaceholder` renders instead of the mock batch. Copy explains the reveal law honestly, offers two paths out ("earn it" → `/quick-entry` · "request preview access" → `/roadmap`).
- **Preview access** (bypass granted, no racking) → mock batch renders WITH an amber `preview-ribbon` at the top explaining "curated sample, not your own vintage."
- **Naturally unlocked** (racking or bottling logged) → mock batch renders unchanged (still mock — the real-data refactor is a separate future task).

Files: `client/src/pages/ThePress.tsx` (renamed inner body to `ThePressContent`, wrapped default export with gate check + skeleton loader).

**P0 — first-invite redirect.** `/i/<token>` route in `server/index.ts` now checks `invite.firstUsedAt`. First use → `302 /roadmap?welcome=1`. Repeat uses → `/admin` as before. New `Roadmap` renders a welcome banner when the query flag is present.

**P1 — owner UI to grant press bypass.** New `/admin/press-bypass` page + two new tRPC procedures (both `ownerProcedure`):
- `listPressBypassRequests` → groups `press_bypass_request` + `press_bypass_granted` events by userId, returns pending-first / granted-second.
- `grantPressBypass({userId})` → writes idempotent `press_bypass_granted` event.

One-click grant, no modal, no confirmation dance. Also listed in `/admin` hub. Files: `client/src/pages/AdminPressBypass.tsx`, `server/routers/onboarding.ts`, `client/src/App.tsx`, `client/src/pages/Admin.tsx`.

**P1 — Skim mode visibility indicator.** Fixes the hidden-state UX risk (Nielsen H1). New `GuideSkimIndicator` small dashed-amber pill on `/guide` renders only when localStorage `ow_skim_mode === "1"`. Links back to `/roadmap` where the toggle lives.

**P1 — bypass request confirmation loop.** Already partially shipped in round 1 (persistent "Requested — we'll be in touch" state). Round 2 added the visible admin queue AND the closable loop (grant → `roadmapStatus.pressBypassGranted:true` → Press card flips to "Preview access" ribbon variant).

**P2 — varied locked-gate CTAs.** Softens reactance risk (Brehm). Each gate now has an optional secondary `learnCta` linking to the "why" — `/guide#pillar-journal`, `/cellar-journal`, `/guide#pillar-copilot`, `/ask`, `/the-press`, `/regulations` — so skimmers have a route to context, not always `/quick-entry`.

**Bonus — `/try` copy jargon audit.** Rich spotted "🔒 In real Ownology this hits the sitemap, RSS, and OG image queue" as engineer-speak leaking to prospects on the public sandbox. Fixed three chips + one blurb:
- Step 1: "Same schema" → "Same layout"
- Step 4 lock chip: "In real Ownology this saves. Here it's the demo" → "…saves to your vintage log — searchable, cited, and yours."
- Step 6 blurb: "meta tags, pings the sitemap, adds it to your RSS" → "handles the SEO plumbing — the write-up, the preview card, the sitemap — quietly, in the background."
- Step 6 lock chip: "hits the sitemap, RSS, and OG image queue" → "goes live on your public cellar journal — where Google and wine drinkers find you."

**Verified live**: seed admin request/grant flow → `listPressBypassRequests` returns 1 pending → click "Grant preview access" → row flips to "Granted" with timestamp → `roadmapStatus.pressBypassGranted:true`. `/the-press` correctly renders three states. Lint + tsc clean.

**Still deferred** (small, non-blocking):
- Auto-confirmation email/SMS on bypass request submit (in-app pending banner covers this for now).
- `/roadmap-preview` public sample variant for pitches/SEO.
- `/admin/deck-editor` — DB-backed flashcards.

---

### `/roadmap` conditional-flow gate graph + floating "Back to Admin" pill + Skim Mode + Press Bypass — SHIPPED (Feb 2026, Rich)

**Why:** Rich flagged progressive-disclosure UX — *"we must be careful not to go too deep into The Press too soon"* — but also flagged the dual need: *"we must allow for wine professionals to ingest info and want to bypass all the detail"*. So the induction system has to serve novices (earn depth) AND experts (skim + request bypass) without picking one.

**Two-lens design:**
- **Novice lens (default)** — 7-gate progressive spine. Locked cards show one-line "Unlocks →" summaries. Full description hidden until earned.
- **Expert lens (opt-in "Skim mode")** — client-side toggle on `/roadmap`. Every gate's full description paragraph becomes visible even when locked. Features stay gated — only the *reading* is unlocked, not the *doing*. LocalStorage `ow_skim_mode`.
- **Wine-professional / press bypass** — locked Press card shows an inline "I'm a wine professional — request preview access" form (role · publication/winery · optional note). Writes `press_bypass_request` to `member_activity`. Rich grants by writing a matching `press_bypass_granted` event. Once granted, the Press card unlocks regardless of Gate 6/7 with a "Preview access" ribbon and preview-sample copy.

**Files:**
- `server/routers/onboarding.ts` — `roadmapStatus` (protectedProcedure) now returns `pressBypassRequested` + `pressBypassGranted` derived from `member_activity` events. New `requestPressBypass` (publicProcedure) mutation. Fermentation proxy = any inoculation OR ≥3 measurements.
- `server/memberActivity.ts` — added `press_bypass_request` and `press_bypass_granted` to `ActivityKind`.
- `client/src/pages/Roadmap.tsx` — new page. 7-node spine, Skim toggle (Eye/EyeOff icons), extracted `<PressReveal>` sub-component with 4 states (naturallyUnlocked · bypassGranted · bypassRequested · locked). Bypass request form: role required, pub/note optional, no email (gate cookie identifies).
- `client/src/components/BackToAdminBadge.tsx` — floating pill, mounted once in `App.tsx`. Uses cached `admin.summary` probe. Auto-hides on `/admin/*`, Work Mode, `/free-run`, `/login`, `/join/qr`, `/try`.
- `client/src/pages/StyleGuideInduction.tsx` — publication-format print page at `/admin/style-guide/induction`. Cover / TOC / 9 sections / colophon. `@media print` rules produce clean A4 PDF via browser Print → Save as PDF.
- `client/src/App.tsx` — mounted `<BackToAdminBadge />`; repointed `/roadmap` → Roadmap component; added `/admin/style-guide/induction` route.
- `client/src/pages/Admin.tsx` — added Roadmap + Induction Style Guide links to the Guide submenu.
- `client/src/pages/Guide.tsx` — amber pill "→ SEE YOUR ROADMAP" under the intro paragraph.
- `server/index.ts` — removed `/roadmap` from `DEV_ONLY_PATHS`. `/todo` stays dev-only.
- `memory/INDUCTION_STYLE_GUIDE.md` — publication-format source doc (Markdown).

**Verified live on preview**: `/api/trpc/onboarding.requestPressBypass` returns `{ok:true}`; a subsequent `roadmapStatus` returns `pressBypassRequested:true`. Roadmap page renders correctly, Skim toggle persists to localStorage, TypeScript + lint clean.

**Deferred**:
- **`ThePress.tsx` in-page gating** — page still uses demo/mock batch. Best addressed alongside a real batch-lifecycle refactor.
- **Owner UI to grant bypass** — currently a SQL insert. Small admin panel needed at `/admin/members` (list pending `press_bypass_request` events, one-click grant).
- **First-invite redirect to `/roadmap`** — first-time invite still lands on `/admin` or `/guide`.

---

### `/admin/audio-hook` tool — Whisper + Claude turn any IG reel into a tier-2 SMS opener (Feb 2026, Rich)

**The problem this solves:**
Perplexity Sonar is text-only and IG is login-walled — social video content is dark to any generic outreach AI. Rich can screen-record or export the audio manually; this tool closes the loop.

**Pipeline:**
1. Drop audio file (m4a/mp3/mp4/wav/webm, ≤25MB) at `/admin/audio-hook`.
2. Optionally paste source URL (IG post, YouTube episode) → becomes `hookSourceUrl` for later verify-source link.
3. Optionally add context ("Matteo from Primo Estate, pitching cellar AI") → sharpens Claude's angle.
4. Backend `outreach.audioHookPropose` runs Whisper → Claude → returns transcript + 3 hook candidates (technique / quoted_voice / question angles).
5. Operator picks/edits, filters contacts by name/winery, hits "Save hook to contact".
6. `outreach.audioHookSave` writes `hookTier=quoted_voice` + `hookText` + `hookSourceUrl` to the chosen row. SMS template + `/hi/:slug` amber hero automatically use it.

**Voice rules baked into the Claude system prompt:**
- Lower-case start, no exclamation marks, no emoji.
- Max 140 chars, Australian idiom OK, never fabricate — only echo transcript details.
- Three angles must attack DIFFERENT hooks (technique · quoted_voice · question).

**Backend procedures added to `outreach` router:**
- `audioHookPropose` (ownerProcedure): base64 audio + optional context → `{ transcription, candidates: [{angle, text}] }`. 60s Whisper timeout, 25MB payload cap.
- `audioHookSave` (ownerProcedure): writes hook fields against an existing contact by slug.

**Frontend:**
- New page `AdminAudioHook.tsx` with 3-step wizard (drop → review → save), inline editable final hook textarea, contact-filter list.
- New "+ Audio hook →" pill button on `/admin/contacts` header (next to Event ingest / Pipeline).
- Route registered in `App.tsx`: `/admin/audio-hook`.

**Verified E2E:** Real Primo Estate 2024 Pecorino tasting reel (795KB m4a) → Whisper transcribed cleanly ("I mean seriously that is awesome…") → Claude returned three usable hooks in Rich's voice. Matteo Grilli's contact row (`matteo-primo-estate-wines`) manually seeded with a hookText derived from cross-referencing both his IG reels + the primoestate.com.au product page.


### Hook Waterfall — Perplexity outreach opener v2 + operator-guide auto-links (Feb 2026, Rich)

**Hook Waterfall (kills generic "family-owned winery" AI slop):**
- Perplexity `deepResearch` prompt rewritten to hunt FOUR tiers in strict priority, returning whichever tier can be sourced with a real citation:
  1. `recent_signal` — a dated event in the last ~90 days (award, review, release, IG post)
  2. `quoted_voice` — a direct quote from the winemaker (podcast, newsletter, blog)
  3. `peer_signal` — a specific thing a neighbouring producer just did
  4. `vintage_pain` — current regional vintage conditions (smoke, drought, rainfall)
- Fabrication guardrail: if none of the four tiers can be cited, all hook fields return `null`. No made-up quotes, scores, or dates.
- Voice rules baked into the prompt: lower-case start, no exclamation marks, max 140 chars, Australian idiom OK.
- Response schema extended: `hookTier`, `hookText`, `hookSourceUrl` (all-or-nothing linked).

**DB + persistence wiring:**
- Migration `scripts/add-outreach-hook-columns.mjs` adds `hook_tier` (VARCHAR 32), `hook_text` (VARCHAR 400), `hook_source_url` (VARCHAR 500) to `outreach_contacts`.
- Drizzle schema updated with matching column types.
- `outreach.create` / `outreach.importContacts` / `outreach.exportAllContacts` all accept + persist + emit the new fields.
- `outreach.bySlug` returns them so `/hi/:slug` can render the same opener the SMS used.
- `AdminEventIngest.tsx` passes hook fields through when saving deep-researched leads.

**SMS template + admin UX:**
- `smsDraft()` in `AdminContacts.tsx` now prefers `hookText` over `painPoint`. Fallback chain: hookText → painPoint → generic honest cold-open.
- Admin row shows the polished hook line in italics with an amber tier badge (`recent signal` / `quoted voice` / etc.) and a "verify source ↗" link to the citation URL. Operator can sanity-check before sending.
- `HiContact.tsx` renders the hook in the amber hero card (takes precedence over painPoint) so the landing-page opener matches the SMS opener — reinforces the "someone who did their homework" impression.

**Operator-guide flashcards auto-linkify internal paths:**
- New `linkifyPaths()` helper in `components/FlashCardDeck.tsx` turns any occurrence of `/admin/...`, `/hi/...`, `/apprentice`, `/import`, etc. inside step text, outcome lines, or gotcha boxes into a clickable amber-underlined wouter `<Link>`.
- Root-relative paths resolve against the current origin — works identically in dev preview and production, zero env-var plumbing.
- Placeholder paths containing `<` (e.g. `/hi/<slug>`) are intentionally NOT linkified — they're templates, not URLs.


### Deck 2 · Vineyard & Viticulture (20 cards) + Dev-only theme picker (Feb 2026, Rich)

**Deck 2 · Vineyard & Viticulture — 20 cards:**
- New `viticulture` category in `client/src/content/oenologyFlashcards.ts`.
- Deck total now **95 cards** across 12 categories.
- Cards cover Site & Soil (4), Vine Genetics (4), Canopy & Vine Management (5), Phenology & Ripening (3), and Vineyard Health (4):
  - Aspect · Soil types · Water availability · Elevation & mesoclimate · Rootstock selection · Clonal selection · Own-rooted vs grafted · Variety-site matching · Canopy management (VSP/sprawl/Scott Henry) · Pruning styles (spur/cane/cordon) · Vine balance (Ravaz index) · Yield restriction · Bud fruitfulness · Phenology stages · GDD · Water stress / regulated deficit irrigation · Powdery mildew · Downy mildew · Botrytis (noble vs bunch rot) · Spray programs.
- Same dual-language SOP + plain format as prior decks. Completes Rich's stated learning-goal spectrum (chemistry ✓ · consulting ✓ · business ✓ · viticulture ✓).

**Dev-only theme picker** (`DevThemePicker` component in `App.tsx`):
- Floating pill in bottom-left corner: `🎨 theme`. Expands to 3 options — Auto (time + weather) · Parchment (day) · Soft Cellar (night).
- Renders **ONLY** when Vite dev mode is active (`import.meta.env.DEV === true`) OR URL contains `?dev=1`. Never renders in production builds — respects Rich's "no theme toggles in prod" rule.
- Writes to `window.__ownologyThemeOverride`; `AutoThemeByTime` reads that variable and uses it as-is when set, ignoring time-of-day mapping. Dispatches `ownology:dev-theme-override` event so the theme applies instantly on click without a page reload.
- Rationale: Rich was iterating on component colours and the auto-theme was flipping erratically. Now he can freeze the theme in dev without waiting on Open-Meteo.
- Testids: `dev-theme-picker`, `dev-theme-picker-toggle`, `dev-theme-{auto,parchment,soft-cellar}`.


### WhatsApp channel on `/hi/:slug` + Deck 4 · Business of Wine (Feb 2026, Rich)

**WhatsApp option on outreach landing:**
- New helper `buildWaHref()` in `server/routers/outreach.ts` — returns `wa.me/[digits]?text=...` link with same pre-filled body as SMS reply. Falls back to `SMS_INBOUND_NUMBER` if `WHATSAPP_INBOUND_NUMBER` not set (same SIM covers both).
- `outreach.bySlug` now returns `waHref` alongside `smsReplyHref`. Shown regardless of A/B `ctaVariant` — always offered when a number is configured.
- `HiContact.tsx` renders a quieter green-tinted button under the primary CTA: *"Have WhatsApp? Easier for photos & docs →"* with `data-testid="hi-cta-whatsapp"` and `data-cta-channel="whatsapp"` for analytics splits.
- Doctrine: SMS = universal door, WhatsApp = richer couch. Zero API cost, no approval needed — pure URL scheme.

**Deck 4 · Business of Wine (10 cards)** added to `/apprentice`:
- New `business` category. Deck total now **75 cards** across 11 categories.
- Cards: COGS · 3-tier margin stack · DTC vs Trade · Cellar door economics · Wine club economics · APCO · WET · Winery liability & liquor licensing · Vintage yield economics · Vintage cash cycle.
- Same dual-language SOP + plain format. Emphasis on the money side of a winery — what a consultant must be conversant on to be trusted.

Verified both via lint (zero errors).


### Deck 3 · Consultant's Toolkit — 15 cards for sales calls (Feb 2026, Rich · URGENT for tomorrow's calls)
- **Context**: Rich has sales calls tomorrow. Needed a cheat-sheet of what to actually SAY when a prospect asks common questions.
- **Change**: added `consulting` category to `FlashcardCategory` + `CATEGORY_META` in `client/src/content/oenologyFlashcards.ts`.
- **15 new cards, split**:
  - **10 objection-handlers** — Elevator pitch · Hallucination worry · vs InnoVint/Vintrace · Data privacy · Replaces consultant? · Import story · Pricing · Who is Owen · AI wrong risk · SOP onboarding · Team access.
  - **5 decision-frameworks** — When to press · When to blend · When to hold vs release · When to escalate (know Rich's own limit) · (Bench trial discipline folded into When-to-blend).
- **SOP field** on consulting cards = the actual phrases Rich can say aloud on a call. Written to be scanned mid-conversation.
- **Deck totals now**: 65 cards across 10 categories.
- Verified via screenshot on `/apprentice` — filter shows Consultant's Toolkit, first card renders correctly, dual-language format preserved.


### `/learn` · Owen Deck — 50-card SRS flashcards (Feb 2026, Rich)
- **Context**: Rich starting his oenology education. Needs both technical fluency (to talk with winemakers) AND consultant-level knowledge (for customer conversations). This is Deck 1 of a planned multi-deck curriculum.
- **New route**: `/learn` → `client/src/pages/Learn.tsx`. Unlinked from nav, gated behind existing site password. Localstorage-persisted progress.
- **Content**: `client/src/content/oenologyFlashcards.ts` — 50 cards across 9 categories (Sugar/Ferment ×10, Acid/pH ×7, SO₂ ×6, MLF ×4, Oak ×5, Faults ×6, Sensory ×4, Regions ×5, Pairing ×3).
- **Dual-language format on every card**:
  - `sop`: SOP / technical language as it would appear in a cellar procedure or AWRI reference — Rich uses this to sound fluent with winemakers.
  - `plain`: plain-English translation — how Rich actually learns it.
  - Plus `why` / `when` / `ruleOfThumb` / `cited` fields.
- **SRS**: Leitner box scheduler (`client/src/lib/leitnerScheduler.ts`) — 5 boxes with 1/2/4/7/14 day intervals. Grade: Again / Good / Easy. Two study modes: `Due today` (SRS-scheduled) and `All cards` (shuffle). Category filter.
- **Testids**: `learn-page`, `learn-card`, `learn-card-term`, `learn-card-sop`, `learn-card-plain`, `learn-reveal-btn`, `learn-grade-{again,good,easy}`, `learn-mode-{due,all}`, `learn-category-filter`, `progress-{due,reviewing,mastered,total}`, `learn-reset`, `learn-skip`.
- **Phase 2 decks noted for backlog** (Rich's stated learning goals):
  - **Deck 2 — Vineyard & Viticulture** (~20 cards): canopy management, phenology, water stress, disease pressure, rootstocks, spray programs, clones, pruning styles.
  - **Deck 3 — Consultant's Toolkit** (~15 cards): client objections, decision frameworks, when-to-blend / when-to-hold / when-to-release, sensory evaluation for consulting.
  - **Deck 4 — Business of Wine** (~10 cards): pricing/margins, distribution, DTC vs trade, cellar door economics, insurance, compliance overview.
- Verified via screenshot: reveal, grade, next-card advance, filter, and localStorage all working.


### Why-window rotating technical Q&As (Feb 2026, Rich)
- **Change**: the "window" in `WhyOwnologyBoxes.tsx` now cycles through 3 realistic cellar-diagnostic Q&As on an 8s cadence (pauses on hover, clickable dot nav).
- **Scenes**:
  1. **MLF stall** (mid-vintage) — pH 3.42, 14°C. Cited: Zoecklein ch.8 + AWRI MLF bulletin.
  2. **SO₂ dosing** (pre-bottling) — Chardonnay, molecular target 0.8 mg/L → 26-28 mg/L free at pH 3.40. Cited: Boulton et al ch.12 + AWRI SO₂ calculator.
  3. **Stuck ferment restart** — Shiraz at 8.4 Brix, YAN test + Uvaferm 43 restart. Cited: Fugelsang & Edwards ch.5 + Lallemand restart protocol.
- Each question spans a different vintage-timeline moment so a returning visitor sees varied proof.
- Testids: `why-ownology-window-scene-{id}`, `why-ownology-window-dot-{id}`, `why-ownology-window-dots`, `why-ownology-window-citation` + `-1` for second citation pill.
- Answered Rich's separate question about pricing in the hero slides: **Scene 2 placement is correct** (answers the cost objection primed by naming InnoVint/Vintrace); don't spread pricing to other scenes; use `/pricing-comparison` for the deep dive.


### Owen positioning shift · "con·science" motif + Why-section product window (Feb 2026, Rich)
- **Positioning change**: Rich pulled Owen away from "apprentice / never leaves the cellar" (junior/loyalty framing) toward experience + competence + science.
- **New Hero Scene 1 copy** (`HeroCarousel.tsx`):
  - H1: **"The oenology you can talk to."** (amber emphasis on "talk to")
  - Sub: *"Your con·science, cellar-side."* (amber-bold "con·science", middle-dot)
  - Micro monospace: `not internet CON · backed IN SCIENCE` — CON dimmed + strikethrough, SCIENCE amber-bold, unpacks the wordplay in one glance.
  - Wordplay logic: **CON + SCIENCE = CONSCIENCE** (Owen is not internet snake-oil; he's science, made conversational).
- **New "window" in Why Ownology section** (`WhyOwnologyBoxes.tsx` addition, placed above the 3 boxes):
  - Rendered mock (no image asset) — browser chrome (3 dots + `ownology.com/ask` URL bar) + user question in amber bubble + Owen answer with amber "O" avatar.
  - Question: *"MLF stuck at pH 3.42, temp dropped to 14°C. Restart or wait?"* (cellar-realistic technical diagnostic).
  - Answer references *Oenococcus oeni* activity threshold, 18–20°C rewarm, nutrient re-check.
  - **Two amber citation pills** — `Zoecklein · Wine Analysis & Production, ch. 8` + `AWRI · MLF technical bulletin`.
  - Footer strip echoes the hero wordplay: `EVERY ANSWER CITED · NOT INTERNET CON · BACKED IN SCIENCE`.
  - This is the "window" Rich sensed the section was missing — visual proof of the science-backed positioning, not marketing prose.
- **Testids added**: `hero-scene-owen-subline`, `hero-scene-owen-wordplay`, `why-ownology-window`, `why-ownology-window-question|answer|citation`.
- Verified via screenshot.


### `/pricing-comparison` — sales-defense receipt page (Feb 2026, Rich)
- **Context**: Scene 2 of the hero carousel now claims "~95% less" vs InnoVint/Vintrace. Rich wanted a defensible receipt he can share with skeptical prospects mid-sales-call.
- **New route**: `/pricing-comparison` → `client/src/pages/PricingComparison.tsx`. Unlinked from all nav, direct-URL only, "RATE SHEET · SHAREABLE" banner at top.
- **Content**:
  1. Header: "The pricing math · on the record — What a boutique winery actually pays."
  2. Claim box: "For a typical mid-tier boutique winery, Ownology comes in at roughly one-tenth the loaded cost of a Vintrace or InnoVint quote."
  3. **6-row side-by-side comparison table**: Home DIY → Serious home → Boutique starter → Boutique typical → Owner-operator vigneron → Enterprise. Each row shows InnoVint / Vintrace / Ownology price + tier + note + savings percentage.
  4. Two disclosed footnotes (loaded-cost caveat, enterprise-quote caveat).
  5. 4-box "Why we can price this low" rational-proof (no per-user fees, no implementation consultant, AI where it earns keep, built by a winemaker not a boardroom).
  6. **Sources cited inline**: SoftwareAdvice, Capterra, GetApp + link back to own `/pricing`.
  7. Quiet exit CTAs (Ask Owen free / See pricing page).
- **Pricing intel** (verified via web search Feb 2026):
  - InnoVint: $99 / $169 / $299 monthly tiers (public list).
  - Vintrace: from ~$95/mo, mid-tier $200–500 loaded, enterprise $500–2000+ (quote-only, from customer reports).
  - Ownology (from `/pricing`): Cellar Hand $22 / The Press $44 / Vigneron $88 monthly (annual billing).
- **Marketer's rewrite** of Rich's literal instruction: replaced "95% cheaper" with "roughly one-tenth the loaded cost" for the claim block, but the table still displays the true math per row (`~54%`, `~74–91%`, `~70–85%`, `90%+`). Honest math beats a slogan.
- **Testids**: `pricing-comparison-page`, `pc-header`, `pc-claim-box`, `pc-comparison-table`, `pc-row-0..5`, `pc-sources`, `pc-cta-ask`, `pc-cta-pricing`.
- Verified via screenshot: all sections render, table shows all 6 rows correctly, zero nav links point at the page.


### HeroCarousel Scene 2 · pricing "noise" injection (Feb 2026, Rich)
- **Problem** (Rich's insight): Scene 2 names InnoVint & Vintrace, which primes visitors to think "$$$". Without an immediate cost counter, the visitor's expectation collapses to "same category = same price" → bounce. Rich's ask: make a noise that we're **~95% cheaper for commercial teams** and **on par (or better) for home winemakers**.
- **Change** (`HeroCarousel.tsx` scene "gap"): replaced the "Ownology is the same category / cellar intelligence" paragraph with a two-column **price-differential card** (amber-bordered, scannable within one visual beat).
  - Column 1 — `COMMERCIAL TEAMS` · **~95% less** · "than InnoVint or Vintrace"
  - Column 2 — `HOME WINEMAKERS` · **On par (or better)** · "than any DIY tool"
- Closing italic tightened: "Same category. Different math. Before you spend another year on the wrong tool."
- **No specific competitor $ amounts named** (comparative-advertising safety). Percentage claim is qualitative ("~95%") not a formal comparison.
- Testids: `hero-scene-gap-pricing`, `hero-scene-gap-price-commercial`, `hero-scene-gap-price-diy`.
- Verified via screenshot on preview.


### `/our-story` standalone page — quiet rebuild for iteration (Feb 2026, Rich)
- **Context**: Rich uploaded `ownology-our-story.zip` — component + copy but no image binaries. Zip's 3 `/manus-storage/*` image paths (founders-couple, vineyard, lab) are dead in the Emergent build; only the 2 Cloudfront portraits (Rich, Geraldine — the "AI photos" from Manus) still resolve. Rich's ask: rebuild as a **dedicated page**, kept unlinked, structured for a future founder video, no home-page changes.
- **New route**: `/our-story` → `client/src/pages/OurStory.tsx`. Added to `App.tsx` route table but **not linked from Nav, Footer, or any content page** — direct-URL access only.
- **Page structure** (top → bottom):
  1. Video hero slot — 16:9 placeholder card with amber play icon + drop-in instructions (`/media/our-story.mp4`).
  2. Pull quote — Rich's 2005 boutique-shed anchor line, cellar-key SVG mark above.
  3. Founder portraits — Rich + Geraldine, 3:4 side-by-side, both Cloudfront (`d2xsxph8kpxj0f.cloudfront.net`, 200 OK verified).
  4. 4-paragraph body copy verbatim from Rich's upload with amber-left highlighted insight card.
  5. Education credential card (Advanced Cert Viticulture & Winemaking — Oenology).
  6. Back-to-home footer link.
- **What's NOT included** (deliberate — Rich to fill later): founders-couple hero photo, vineyard + lab small gallery. Structure supports adding them back once assets are shot.
- **Testids**: `our-story-page|video-slot|pullquote|founder-rich|founder-geraldine|body|highlight|credential|back-home|return-home`.
- **Header**: sticky "Ownology ← / PREVIEW · UNLINKED" banner so Rich knows it's not live.
- **Verified via screenshot**: all sections render, both portraits load from Cloudfront, video placeholder shows drop-in hint.


### HeroCarousel v4 · "The Apprentice Arc" — reordered 4-scene carousel + `WhyOwnologyBoxes` below-fold (Feb 2026, Rich)
- **Problem**: v3 opened on 3:47am panic → gap → Owen. Rich wanted to reverse the emotional arc: lead with warmth (Owen), then category (Gap), then pain (3:47am), then invite (Get Started). Also wanted rational-proof boxes below-fold.
- **v4 carousel scenes** (`client/src/components/HeroCarousel.tsx`, full rewrite):
  1. **Meet Owen** (5s) — persona/identity anchor. Amber apprentice mark + "The apprentice who never leaves the cellar."
  2. **The Gap** (6s) — unchanged from v3 Angle D (InnoVint/Vintrace category chips + "Before you spend another year on the wrong tool.").
  3. **3:47am** (5s) — pain peak, same copy as v3 opener.
  4. **Get Started** (6s) — invite close. Body pulled from old Owen-CTA scene; primary CTA testids preserved so bookmarked analytics survive.
- **Below-fold `WhyOwnologyBoxes.tsx`** (new component) — 3 rational-proof cards with Rich's own copy verbatim:
  - "The problem we're solving" (Notebook icon) — institutional knowledge loss / SOPs in binders.
  - "Built for mobile, during harvest" (Smartphone icon) — one-handed, wet-gloves, grounded in own docs.
  - "Your data stays yours" (Lock icon) — never used to train AI models, searchable only by team.
- **Wire-up**: `Home.tsx` now renders `HeroCarousel → WhyOwnologyBoxes → TrustChips → …`. FAQ section (`<FAQ />`) untouched — deferred per Rich ("skip FAQs entirely for now").
- **Data-testids**: `hero-scene-owen|gap|panic|start`, `hero-carousel-dot-*`, `hero-carousel-cta-pro|curious`, `why-ownology-boxes`, `why-ownology-box-{problem,mobile,data}`.
- **Verified via screenshot**: all 4 scenes cycle + dot-jump correctly on load; Why boxes render below fold with amber accent bars.


### `Import.tsx` split into per-tab modules — code-hygiene refactor  (Feb 2026, Rich)
- **Problem**: `client/src/pages/Import.tsx` had grown to 2,236 lines — five tab implementations (Voice/Camera/Paste/CSV/Bulk) + shared helpers + main composer, all in one file. Painful to navigate, review, or hand off.
- **Solution**: moved to `client/src/pages/Import/` directory with one file per concern:
  - `shared.tsx` — types (`EventType`, `ParsedEntry`, `Tab`, `ImportSource`), helpers (`eventLabel`, `eventColor`, `detailSummary`, `assignIds`, `parseCSVText`), and the shared `PreviewTable` component.
  - `VoiceTab.tsx` — MediaRecorder + Whisper flow.
  - `CameraTab.tsx` — phone camera + Claude Sonnet vision.
  - `PasteTab.tsx` — text + clipboard-image OCR + side-by-side reference view.
  - `CsvTab.tsx` — column-mapped CSV import.
  - `BulkTab.tsx` — folder drop + parallel multi-file router (image/text/pdf/xlsx/whatsapp/audio) with RAG confidence badges.
  - `index.tsx` — thin composer (tab selector + preview + save).
- **Public surface unchanged**: `import("./pages/Import")` in `App.tsx` still resolves via Node module resolution to `pages/Import/index.tsx`. All `data-testid` selectors preserved so existing tests don't break.
- **Zero new TypeScript errors** (pre-existing `App.tsx` Promise widening + `Guide.tsx` RevealCard prop issue remain untouched).
- **Result**: largest file dropped from 2,236 → 220 lines (index.tsx); each tab now edits/reviews independently.

### Auto-theme fallback moved from Barossa Valley → Hunter Valley (Pokolbin)  (Feb 2026, Rich)
- Open-Meteo fallback coords in `AutoThemeByTime` updated from Barossa (−34.53, 138.95) to Pokolbin (−32.78, 151.29). Localises the default weather-driven accent to Rich's home region for visitors who haven't granted geolocation.


## Feb 2026
### HeroCarousel Scene 2 refactored to Angle D (recognition-anchor) — data-picked  (Feb 2026, Rich)
- **Problem**: original Scene 2 was abstract stats ("40 hrs / 3:47am / $50k+ / 0") — Rich flagged as "tech heavy" and reminded me the original doctrine positioned Ownology vs InnoVint/Vintrace.
- **Solution**: applied 6-principle psychology matrix (choice overload · loss aversion · anchoring · cognitive load · craft-identity respect · F-pattern scan time) against 4 candidate framings. Angle D — "You already know InnoVint & Vintrace. You've probably priced them." — won on 5/6 axes.
- **Copy landed**:
  - Eyebrow: "The gap · where you sit"
  - H2: "You already know InnoVint & Vintrace. You've probably priced them."
  - Chip row: three category peers — InnoVint · Vintrace · **Ownology** (amber-lit)
  - Paragraph: "Ownology is the same category — cellar intelligence — priced and paced for boutique winemakers. Every answer cited, every SOP editable, APCO built in."
  - Loss-aversion italic footer: "Before you spend another year on the wrong tool."
- **Design choices**: recognition memory as anchor (not attack), respects Australian winemaker collegiality (industry <2k producers), mirrors how winemakers themselves sell (story + recognition > spec sheets).


### Cycling landing hero + /guide progressive reveal — cognitive-overload fix  (Feb 2026, Rich, post-deploy iteration)
- **HeroCarousel** replaces the dense pillars hero on `/home` — three auto-cycling scenes: (1) 3:47am ferment panic cold open (3s), (2) market-gap analysis with 4 stat cards — 40hrs/yr · 3:47am · $50k+ · 0 (6s), (3) Meet Owen apprentice reveal + dual CTA (6s). Auto-cycles 15s loop · pauses on hover · dots for manual jump · skip-intro button.
- **FounderStory temporarily hidden** on `/home` — Rich flagged the Rich+Gel winery photos as visually broken. Section commented out until reshoot/restyle.
- **`/guide` progressive reveal** — only Four Pillars visible above the fold; Workflow Map · Getting Started Checklist · Role Paths · Tier Access · First Fermentation · Further Reading all sit behind amber "Reveal →" cards. Persisted via localStorage.
- **Reusable `RevealCard`** at module scope in Guide.tsx (satisfies `react/no-unstable-nested-components`).
- **Doctrine restored**: fewer things visible on first landing, respect the visitor's attention, reveal complexity only on explicit user intent.

### Contact migration bridge + Namecheap → Emergent domain switch  (Feb 2026, Rich)
- **`/admin/contacts-migrate`** — two-button flow: download all contacts as JSON on dev, upload JSON on prod. Volatile pipeline state (sms/reply/booking timestamps · view counts) stripped so prod starts with fresh state. Upsert-by-slug (skips duplicates).
- **Backend**: `outreach.exportAllContacts` (query, ownerProcedure) + `outreach.importContacts` (mutation, ownerProcedure, upserts by slug, max 500 per batch).
- **Domain unlinked** from `ownership-dev` (preview) and linked to production Emergent app pointing at `ownology.ai`. Stale bundle bug (React hook order) resolved. Namecheap DNS auto-updated via Emergent's Entri integration. All 5 TXT records (Google verification + email DKIM/SPF/DMARC) preserved.


### CRM business-card / email-signature OCR + Import side-by-side layout  (Feb 2026, Rich)
- **CRM OCR panel** on `/admin/contacts` — new dashed-amber container ABOVE the Add contact form. Paste a screenshot (or click to upload) → 2-stage vision-LLM pipeline (verbatim OCR → structured extraction) auto-fills firstName, lastName, mobileAu, winery, notes (email + address if present), persona.
- **Backend**: new `outreach.ocrContactCard` ownerProcedure. Returns `{ rawOcrText, fields, totalWords, recognisedWords, confidencePct }` with the same colour-coded quality score model as `vintageLog.ocrImageToCleanText`.
- **Quality score card**: green ≥85% · amber 60–84% · red <60%, matching the Import Paste tab so operator UX is consistent.
- **Auto-fill discipline**: MERGE not overwrite — anything the operator already typed is preserved. Persona only gets overridden if the operator hadn't set a non-default persona. Discard clears the OCR result but keeps the form fields.
- **Import Paste side-by-side layout**: original image (up to 340px, click-to-enlarge in new tab) on the LEFT, cleaned OCR text on the RIGHT — a proper reference layout so winemakers can visually cross-check and hand-type any words the OCR missed. Rich's stated 80%-recognition + hand-fill-delta workflow.
- **Testing**: `testing_agent_v3_fork` iteration_35 — 100% pass both features. Business-card image (Nathan Bailey / Brokenwood Wines) → 9/9 words · 100% confidence · all form fields auto-populated correctly. Side-by-side layout verified via bounding-rect x-coords (preview left, text right).
- **Regression rescue**: my initial `search_replace` accidentally dropped `parseFromUrl: ownerProcedure` when inserting the new endpoint above it → backend crashed on boot → gate unlock returned 502 "Network error". Testing agent identified the orphaned `.input(...)` block, restored the missing procedure declaration. Fix landed at line 588 of `outreach.ts`.


### Import surface: Paste tab accepts clipboard IMAGES + OCR + spell-check + quality score  (Feb 2026)
- **Backend**: New tRPC mutation `vintageLog.ocrImageToCleanText` — 2-stage pipeline. Stage 1 = verbatim vision OCR (marks uncertain words with `[unclear?]`). Stage 2 = spell/grammar clean-up returning JSON with `cleanedText` + a `corrections[]` array of `{original, corrected, reason}`.
- **Frontend PasteTab**: `onPaste` handler detects `clipboardData.items` containing `image/*`, prevents default text-paste, converts to base64, calls the new endpoint.
- **Score card UI** renders after OCR: "N / M words recognised · X%" — green ≥85, amber 60–84, red <60. Colour-coded per Rich's ask ("47 out of 234 words maybe??").
- **Raw vs Cleaned toggle** — operators can flip between the verbatim OCR and the spell-checked version. Disabled + tooltipped when no corrections were needed (nit from testing agent, addressed).
- **Corrections list** — shows the first 8 word-level corrections inline (e.g. "shrza → Shiraz — spelling"), collapsible if more.
- **Image preview** — pasted screenshot renders as a thumbnail so operators can see what they pasted.
- **Auto-fills the textarea** with cleaned text so the existing `Extract Entries` flow just works. No new save path.
- **Testing**: end-to-end validated via testing_agent_v3_fork — 100% pass on frontend + backend. Simulated ClipboardEvent → OCR round-trip (~30s) → score card renders → discard clears state.

### Operator Guide: 4 flash-card decks · 69 cards total  (Feb 2026)
- **CRM deck** (20 cards) — Add · Prep · Send SMS · Call · Track · Bulk · Fix.
- **Pipeline board deck** (14 cards) — 5 columns · KPIs · drag rules · morning ritual · common pitfalls.
- **Compliance deck** (16 cards) — Ask · Audit trail PDF · LIP Audit Pack · APCO · Regulations · When to escalate.
- **Import & OCR deck** (19 cards) — Voice · Camera OCR · Paste (now with image + OCR score) · CSV · Bulk · Review · Fix.
- Reusable `FlashCardDeck.tsx` renderer — future decks are ~200 lines of typed data instead of 500 lines of UI + data.
- Live at `/admin/operator-guide` with `#crm-flash-cards`, `#pipeline-flash-cards`, `#compliance-flash-cards`, `#import-flash-cards` anchors.

### /home-v3 mockup — "The Storytelling Scroll"  (Feb 2026)
- Third homepage experiment: cinematic dark palette, cold-open at 3:47am, 7-chapter narrative (old way → transition → the answer → four chapters → cost → the choice).
- Live at `/home-v3` behind the gate (allowlisted). `/home-v2` remains as reference.


### Home 1 shop-window polish — trust chips · APCO strip · sync pricing · bookend router  (Feb 2026)
- **Audience router pill strip** added under the 4-pillar hero grid ("Which are you? 🍷 Just curious about wine → · 🍇 Making wine yourself →"). Borrowed the self-sort UX from `/home-v2` mockup without importing the Owen-heavy framing Rich flagged.
- **Trust chip strip** — compact credibility band directly below the hero: 🇦🇺 Australian-built · Wine Australia LIP-audit ready · APCO Assistant · Founding cohort 99.
- **APCO strip** — new compliance-wedge section between FounderStory and Pricing. Two-column layout: strip narrative + "What Ownology handles" bullet card. Deep-links to `/apco` and `/pricing`.
- **Home Pricing block synced** — was showing stale $16 / $41 / $83; now correctly reflects `/pricing` values with founding-→-retail ladder: $22/$28 · $44/$59 · $88/$124 + inline strikethrough retail chip.
- **Final CTA enhanced** — replaced generic "Talk to Us" mailto with "Play the 10-min sandbox" + bookend audience-router chips ("Not sure yet? 🍷 Try answer engine · 🍇 Book a winemaker call").
- **Verdict from user**: Home V2 was "very Owen", Home 1 "very rich and gel when you scrolled". Kept Home 1's density, added V2's best structural moves (self-sort + trust chips + APCO strip). `/home-v2` remains as hidden reference mockup.



### Nav slim-down — public gets 3 links, operator quick-links move to /admin  (Feb 2026)
- **C. Public "More" dropdown deleted from desktop chrome entirely.** Old
  version had 6 links (Our Story, Pricing, Getting Started, Blog, For
  Home Winemakers, FAQ). Prospects now see just PRIMARY_NAV (Ask Owen ·
  For winemakers · Pricing) + the hero pillar cards. Mobile drawer
  keeps a compact 3-item MORE_NAV (Our Story · Getting Started · FAQ)
  for touch users.
- **B. 4-column DO/KNOW/LEARN/GUIDE mega-menu moved to `/admin`.** Now
  lives as a "Marketing Quick-Links" panel below the Owner Tools grid,
  with the Clear Cache & Reload button relocated to its top-right.
  Public visitors never see a sitemap-style menu; operator keeps
  one-click access from the admin dashboard.
- **Mobile "Clear Cache" gated to admins only** — was globally visible
  before, no reason a prospect ever needs it.
- Dead code removed from Home.tsx: `MoreDropdown`, `NavLink`,
  `VINTAGE_NAV`, `KNOWLEDGE_NAV`, `BUSINESS_NAV`, `GUIDE_NAV`,
  `publicLinks`, `NAV_LINKS` (~130 LOC).

### Pre-redeploy de-risk sweep — public-surface audit  (Feb 2026)
- **Fake social proof killed**: removed the "N of 99 claimed" progress
  bar + counter from `/pricing`. Kept the founding-member offer copy
  itself. Stripe is still `sk_test_stub`, so the live counter was going
  to embarrass us the moment a savvy prospect clicked View Source.
- **Third-party manual name-drop swept**: `MoreWine and Scott Labs
  manuals` removed from every public-facing meta description, OG tag,
  and outbound email. Replaced with "industry-standard oenology
  references". Internal RAG code still references the actual manuals
  (correct — that's the ground truth). Files touched:
  `client/index.html`, `server/index.ts` (ROUTE_META + journal meta),
  `server/foundingReservationEmail.ts`.
- **Competitor-migration pages pulled from public**: `/for-innovint-users`
  and `/for-vintrace-users` removed from `PUBLIC_EXACT`, from the
  sitemap `STATIC_PAGES`, and explicitly `Disallow`-ed in both
  `client/public/robots.txt` and the dynamic `/api/robots.txt`. Routes
  still work for warm-outreach links; a raw crawler now hits the gate
  wall instead of a legally-adjacent competitor takeover page.
- **Pricing reconciled across `/guide` and `/pricing`**: `/guide` tier
  card prices updated from stale $41/$83 to matching $34/$69.
- **12 vs 99 founding-partner contradiction fixed**: "twelve founding
  partners" replaced with "a small circle of founding partners" on
  `FoundingPartners.tsx` + both `ROUTE_META` blocks. Keeps the
  exclusivity feel without contradicting the 99-subscriber offer on
  `/pricing`.
- **Undelivered feature claims trimmed**: The Press dropped "Phone &
  chat support" → "Email support" (no phone line wired). The Vigneron
  dropped "3 team seats included" + "Onboarding call — 30 min" →
  "Team seats (roll-out with multi-tenant)" (honest about status). FAQ
  answer on team seats updated to match.

### Event Ingest tool — `/admin/event-ingest`  (Feb 2026)
- New admin surface: paste any wine-event URL (Humanitix, Eventbrite,
  festival page). LLM extracts event metadata + full producer lineup,
  operator ticks who to research, per-row Perplexity deep-research fills
  in each contact draft, then batch-save into the CRM with the `event`
  field pre-filled.
- Backend: `outreach.parseEventUrl` tRPC procedure (built-in Claude
  Sonnet forge; no Perplexity credits burned at parse time).
- **Persistent ingest history**: every parse is upserted into a new
  `event_ingests` table (schema v22). Powers a forthcoming "Recent
  event ingests" panel + one-click "Add more from this event" — full
  producer snapshot re-hydrates without another LLM call.
- Backend also ships `outreach.listIngests` / `outreach.getIngest` /
  `outreach.deleteIngest` for the history UI.
- HiContact `/hi/:slug` warm-open copy is now future-aware: when the
  contact's notes carry a future `EventDate:`, the greeting flips from
  past-tense "We crossed paths at ___" to forward-tense "Looking forward
  to catching you at ___".
- First seed use case: Lost in the F.O.G. (Sat 1 Aug 2026, Sydney) —
  20+ Grenache producers ready to research.

### Sort selector on `/admin/contacts`  (Feb 2026)
- New dropdown next to the status-filter chips: Newest, Oldest,
  Name (A→Z), Winery (A→Z), Region (A→Z), State (A→Z), Status
  (Warm→Cold).
- Region parsed from `Region:` field in notes (populated by
  deep-research + event-ingest). State inferred from a curated
  AU-region→state map covering NSW/VIC/SA/WA/TAS/QLD/ACT/NT.
- Preference persists to `localStorage` under `ow_contacts_sort` so
  the operator's choice survives page reloads.

### Floating badge stack cleanup  (Feb 2026)
- Bug: The bottom-left `AdminQrBadge` and `GlobalThemeToggle` collided
  because both anchored to the same corner. QR badge now sits ~3.25rem
  above the theme pill (and lifts an extra 3.5rem when the PWA install
  banner is visible), so the two never overlap.

---

Older shipped work lives inline in PRD.md (pre-Feb-2026); future entries
should land here so PRD.md can stay a spec, not a diary.
