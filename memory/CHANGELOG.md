# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

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
