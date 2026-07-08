# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

## Feb 2026

### Event Ingest tool — `/admin/event-ingest`  (Feb 2026)
- New admin surface: paste any wine-event URL (Humanitix, Eventbrite,
  festival page). LLM extracts event metadata + full producer lineup,
  operator ticks who to research, per-row Perplexity deep-research fills
  in each contact draft, then batch-save into the CRM with the `event`
  field pre-filled.
- Backend: `outreach.parseEventUrl` tRPC procedure (built-in Claude
  Sonnet forge; no Perplexity credits burned at parse time).
- Frontend: `/app/client/src/pages/AdminEventIngest.tsx` + new "+ Event
  ingest →" link on `/admin/contacts` header.
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
