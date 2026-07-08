# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

## Feb 2026
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
