# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

## Feb 2026

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
