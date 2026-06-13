# Ownology — Build History Log

This document is the authoritative record of every improvement built, every suggestion made, and every decision taken during the development of ownology.ai. Items are correlated by date and grouped by session. Suggested improvements that have not yet been built are logged here as **Suggested** until approved and moved to **Built**.

---

## Format

Each entry follows this pattern:

```
### YYYY-MM-DD — Session title
**Built:** items completed in this session
**Suggested:** items proposed but not yet approved
**Decisions:** architectural or strategic decisions made
```

---

## 2026-05 — Foundation Phase

### 2026-05 (early) — Initial scaffold and landing page
**Built:**
- Initial landing page (Home.tsx) — dark artisan design, Fraunces/Lato/Fira Code typography
- OwnologyLogo component
- FounderStory component
- FAQ component with accordion
- ForWinemakers page (/for-winemakers)
- Waitlist signup with Buttondown integration
- Demo request form with owner notification
- notifyOwner wired into waitlist.subscribe

### 2026-05 (mid) — Content and competitive positioning
**Built:**
- Regional language audit — removed Hunter Valley, Marlborough, Sonoma, Semillon, Verdelho references
- FounderStory geographic neutralisation
- FAQ entries distinguishing Ownology from WineryCopilot and InnoVint
- Competitive landscape presentation script
- /why-ownology comparison page (Ownology vs InnoVint, vs WineryCopilot)
- /why-ownology wired into App.tsx routing
- Why Ownology link added to footer and main nav
- /why-ownology CTA upgraded with email capture
- /for-innovint-users landing page wired into routing

### 2026-05 (late) — Theme, visual identity, and blog
**Built:**
- Light "cellar daylight" theme CSS variables (warm cream/parchment, amber gold)
- ThemeToggle component with localStorage persistence and nav integration
- Light theme applied to Home.tsx, WhyOwnology.tsx, FAQ.tsx, FounderStory.tsx
- /for-vintrace-users landing page wired into routing
- Demo video placeholder section added to Home.tsx
- Founder couple photo replaced solo portrait in FounderStory.tsx
- Small image gallery added below founder portrait
- AI portrait of Geraldine generated (chemistry/science aesthetic, cellar/lab setting)
- Thought leadership article — winemaker psychology, harvest burnout, cognitive load relief
- FAQ entries: 'Will this replace me?' and 'Will AI homogenise wine?'
- 'The Weight of Harvest' homepage section
- Geraldine portrait regenerated using couple photo as reference
- Geraldine named explicitly in FounderStory copy (Chemistry & Science Lead)
- 'See Demo' nav link added (desktop + mobile drawer)
- Rich named as narrator in FounderStory copy
- /blog index page with article card
- /blog/weight-of-harvest full article page with SEO meta tags
- /blog and /blog/:slug routes wired in App.tsx
- Blog link added to nav and footer
- Dynamic /blog/:slug route with 404 fallback
- Rich solo portrait generated (winery chemistry equipment)
- Boutique vs commercial blog article wired into /blog
- 'What Ownology Knows' section added to homepage and website

---

## 2026-05 (late) — Regulations and Compliance KB Phase

### 2026-05 — Regulations and Compliance pages launched
**Built:**
- SA winery regulatory requirements researched and saved
- /resources page with Federal and SA regulations, wired into App.tsx and nav/footer
- /compliance AI search agent page with tRPC procedure, LLM streaming, source citations
- Nav consolidated — secondary links moved into More dropdown
- VIC and NSW regulatory requirements researched and saved
- Compliance KB updated with VIC and NSW content
- 'Ask a compliance question' CTA added to homepage hero
- State selector filter added to Compliance page (Federal / SA / VIC / NSW / All)
- /resources page updated with VIC and NSW cards
- 'Last verified' date badge added to each regulatory reference card
- WA regulatory requirements researched and saved
- WA tab and data added to Resources page (liquor, DWER, WorkSafe WA, planning, water, food)
- WA added to Compliance KB and sample questions
- Two-stage triage router implemented in Compliance tRPC procedure
- Out-of-scope guard added (polite message for off-topic questions)
- System prompt scoped to relevant jurisdiction sections based on classifier result
- 'Knowledge base last updated' timestamp added to Compliance page header
- QLD regulatory requirements researched and saved
- QLD added to Compliance KB, state filter, sample questions
- QLD tab and 6 resource cards added to Resources page
- TAS regulatory requirements researched and saved
- TAS added to Compliance KB, state filter, sample questions, badge, contacts
- TAS tab and 6 resource cards added to Resources page

---

## 2026-05 (late) — Operational Tools Phase

### 2026-05 — Free Run and The Press launched
**Built:**
- Free Run (Chalk) learning board page — lesson cards, domain filters, vocabulary section
- The Press (working board) page — vintage log, calculation history, notes
- Free Run and The Press added to navigation and App.tsx routing
- Onboarding welcome copy using full winemaking vocabulary
- /pricing page with tier cards (Free Run / The Cellar / The Press / Cellar Master), credit packs, FAQ, founding member banner
- /pricing route wired in App.tsx, Pricing nav link updated
- 'Start Free Trial' CTA section added to Pricing page
- 'Start Free Trial' nav button fixed to route to /pricing
- Founding member counter added to Pricing page (live countdown, database-backed)
- Cost model spreadsheet built (tiers, credit packs, cost vs revenue, margin forecasts)

---

## 2026-05 (late) — DB + Server Upgrade Phase

### 2026-05 — Full web-db-user template upgrade
**Built:**
- Project upgraded to full DB + server template (webdev_add_feature web-db-user)
- Existing merch API and server/index.ts migrated into new tRPC/Express scaffold
- campaign_metrics_snapshots table added to drizzle schema
- Server procedures: getCampaignMetrics query + updateCampaignMetrics mutation (owner-only)
- /api/scheduled/campaign-metrics Heartbeat handler (weekly Monday 09:00 AEST)
- Weekly Heartbeat cron registered — task_uid: G2Krha4rUqFEFBhCgNLLvn
- CampaignMetrics dashboard page with trend charts and KPI cards
- /campaign-metrics route added to App.tsx
- Vitest tests for campaign metrics procedures
- Compliance.tsx missing import error fixed
- heartbeat.ts TypeScript errors fixed
- Founding member badge/glyph artwork generated
- Cellar door coaster designs generated (2 variants)
- Bar towel design generated
- Bottle label sticker generated
- Pocket notebook cover design generated
- Stripe feature scaffold added and secret keys configured
- merch_orders table added (Stripe stores order data — minimal local schema)
- Express API: GET /api/merch/products, POST /api/merch/checkout, POST /api/stripe/webhook
- /merch page with product cards (coasters, bar towel, notebook)
- /merch/success and /merch/cancel redirect pages
- Stripe webhook wired for order fulfilment and owner notification
- Merch link added to nav and footer
- Artwork zoom-on-hover effect on merch product cards
- Slide-out shopping cart drawer with multi-item cart state, quantity controls, Stripe checkout
- Tap-to-zoom modal / swipeable image gallery for mobile merch inspection
- Customer review and star-rating section below each merch product card
- Copy-to-clipboard button on each AI response on Compliance page
- tRPC ownerProcedure orders.list — last 50 Stripe checkout sessions
- /orders owner-only page — order table, KPI summary, status badges
- /orders route wired in App.tsx, Orders link added to More dropdown
- Vitest tests for orders.list procedure
- JWT cookie auth implemented in createContext
- /admin owner-only hub page (Admin.tsx) — grid linking to Campaign Metrics, Orders, Founding Members
- /admin route wired in App.tsx
- Conditional "Admin" link added to More dropdown (owner-only)

---

## 2026-05 (late) — Vintage Log and Reminders Phase

### 2026-05 — Vintage Log, Reminders, Quick Entry
**Built:**
- vintage_log_entries table added to drizzle schema, migration pushed
- DB helpers for vintage log (addVintageEntry, listVintageEntries, getUsedTankNames)
- vintageLog tRPC router (add, list, getUsedTankNames) with protectedProcedure
- VintageEntrySheet.tsx — 5-step guided bottom-sheet/modal with Quick-Entry mode
- ThePress.tsx Vintage Log tab replaced with live data, real entry sheet, search/filter
- Vitest tests for vintage log auto-tagging logic and input validation
- tank_reminders table added to schema
- DB helpers: upsertTankReminder, listTankReminders, getOverdueTanks
- vintageReminder tRPC router: setReminder, listReminders, deleteReminder
- /api/scheduled/vintage-reminders Heartbeat handler mounted
- Reminder Settings UI added to ThePress Vintage Log tab
- /quick-entry dedicated page — rapid multi-tank logging, keyboard-optimised
- /quick-entry route wired in App.tsx, added to mobile hamburger drawer
- Presentation script: 5-step Vintage Log entry flow walkthrough
- Vitest tests for reminder threshold logic and overdue detection

---

## 2026-05 (late) — Mobile Polish Phase

### 2026-05 — Mobile responsiveness across all pages
**Built:**
- Nav bar text readability fixed in both light and dark modes
- Nav hover states fixed (accessible, human-factors appropriate)
- Responsive layout across PC, Mac, iOS, Android (mobile-first breakpoints)
- Mobile horizontal overflow fixed on Samsung Chrome
- Mobile hamburger drawer rebuilt (full-screen slide-in, 44px touch targets, safe-area insets)
- viewport-fit=cover added to index.html meta viewport tag
- env(safe-area-inset-*) padding added to nav bar and mobile drawer
- Mobile hero polish (font size, stacked CTAs, full-width buttons, padding)
- Mobile Compliance page (larger textarea, bigger submit button, full-width citations, iOS font-size fix)
- Mobile ThePress page (full-width tabs, 44px touch targets, scrollable tab bar, short labels)
- Pricing mobile: single-column tier cards, sticky CTA bar at bottom
- Pricing mobile: billing toggle on mobile card layout
- Pricing mobile: info icons next to complex features
- Pricing mobile: pulse animation on The Press card via sticky CTA
- Pricing mobile: scroll-to-top button at bottom of page

---

## 2026-05 (late) — Competitive Intelligence Phase

### 2026-05 — Competitive Advantage page
**Built:**
- Deep-dive research on 7 competitor products
- Competitive intelligence report (ownology-competitive-intelligence-2026.md)
- /competitive-advantage page: hero, unoccupied market, 7-product grid, feature matrix, compliance moat, investment thesis, waitlist CTA
- /competitive-advantage route wired, added to More dropdown and footer
- Feature matrix: interactive tooltips on six capability column headers
- Competitor grid: threat-level and status filter pills
- Australian Compliance Moat: interactive SVG map with hover/tap state panel

---

## 2026-06-12 — Wine Australia Regulations 2018 Ingestion + Rename

### 2026-06-12 — Wine Australia Regulations 2018 ingested
**Built:**
- Wine Australia Regulations 2018 (F2018L00286) fetched from WIPO Lex (all 19 sections)
- complianceKnowledgeBase.ts Federal section replaced with regulation-grounded version (ss.7–27)
- complianceQADoctrine.ts updated: fed-label-gi-variety-vintage, fed-export-licence updated; fed-export-product-approval and fed-export-certificate added; stale citation URL on fed-producer-registration corrected
- Checkpoint: ff415082

**Suggested (not yet built):**
- NT tab on Regulations page (later approved and built in batch 2)
- Query param pre-fill on Compliance page (approved, in progress)
- Recently asked section on Compliance (approved, in progress)

### 2026-06-12 — Resources → Regulations rename
**Built:**
- Resources.tsx renamed to Regulations.tsx, export function renamed
- App.tsx: /regulations route added, /resources redirect added
- Home.tsx nav: "Resources" → "Regulations", href updated
- Home.tsx footer: "Resources" → "Regulations", href updated
- Preview.tsx: Resources tab renamed to Regulations
- Checkpoint: 88df6f80

**Decisions:**
- "Regulations" = the what (the law, static reference)
- "Compliance" = the how (achieving the compliant state, AI chat)
- "The Press" and "The Free Run" locked as brand identity — never rename

### 2026-06-12 — Compliance moat map agency corrections
**Built:**
- SA: LBSA → CBS SA (Consumer and Business Services SA)
- QLD: DESI → DES (Department of Environment and Science); WHSQ acronym corrected
- TAS: CBOS → Tasmanian Liquor and Gaming Commission (CBOS no longer administers liquor)
- TAS KB updated: Commissioner for Licensing → Tasmanian Liquor and Gaming Commission across KB text, contacts, and source doctrine
- Checkpoint: a66444e2

### 2026-06-12 — Regulations/Compliance page clarity + nav restructure
**Built:**
- Regulations page h1 fixed: removed "Compliance Resources" wording
- Regulations page eyebrow and body copy updated to clearly signal static reference library
- Regulations page: crosslink CTA added ("Know the rules. Now confirm you're meeting them →")
- Compliance page h1 updated: "Stay Compliant — Compliance Assistant"
- Compliance page eyebrow updated to distinguish from Regulations
- Compliance page: reverse crosslink added ("Need to read the actual rules? →")
- Home.tsx More dropdown restructured into three labelled pillars: In the Cellar / Compliance / About & More
- Regulations and Compliance placed together in the Compliance pillar
- Checkpoint: 94be04bb

---

## 2026-06-13 — UX Batch 1 (10 items)

### 2026-06-13 — 10-item UX improvement batch
**Built:**
- Regulations page: bottom-of-card Compliance CTA strip inside every expanded card
- Regulations page: jurisdiction tab count badges (e.g. "SA (8)")
- Regulations page: WET card "Last verified: June 2026" date badge
- Compliance page: NT filter chip and NT sample question added
- Compliance page: jurisdiction filter row made sticky below nav
- Compliance page: owFadeIn fade-in page transition (keyframe added to index.css)
- The Press: SVG press illustration added to empty state welcome card
- NT added to compliance KB (NT Liquor Commission, NT EPA, NT WorkSafe)
- NT marked as covered on the compliance moat map (stat updated to 7 states)
- Compliance page: NT added to STATE_FILTERS, STATE_LABELS, PDF meta, footer disclaimer
- Checkpoint: aa224799

**Suggested (not yet built at time of suggestion):**
- NT tab on Regulations page ← approved and in progress (batch 2)
- Query param pre-fill on Compliance ← approved and in progress (batch 2)
- Recently asked section on Compliance ← approved and in progress (batch 2)

---

## 2026-06-13 — UX Batch 2 (10 items) — IN PROGRESS

### 2026-06-13 — Batch 2 items approved and in progress
**Built so far:**
- NT_SECTIONS data added to Regulations.tsx (4 cards: Liquor, EPA, WorkSafe, Planning)
- ResourceTab type updated to include "nt"
- TAB_LABELS and TAB_COUNTS updated for NT
- Tab array updated to include "nt"
- TypeScript error fix in progress (double bracket from sed replacement)

**Remaining to build:**
- Fix TypeScript error in Regulations.tsx tab array
- Compliance page: ?q= query param pre-fill on mount
- Compliance page: "Recently asked" section using localStorage (last 5 questions as chips)
- Compliance page: answer confidence indicator badge (sources matched count)
- Regulations page: cross-tab search bar (client-side filter)
- Regulations page: print/PDF export button
- Regulations page: page-level freshness banner
- The Press: batch summary card per tank
- Compliance page: conversation persistence to localStorage
- Home page: "What's new" ribbon/badge

---

## Suggested Improvements Log (not yet approved)

*Items suggested but awaiting approval. When approved, they move to the relevant session above.*

| Date suggested | Item | Status |
|---|---|---|
| 2026-06-13 | Add NT to Regulations page tab | ✅ Approved → Batch 2 |
| 2026-06-13 | Query param pre-fill on Compliance | ✅ Approved → Batch 2 |
| 2026-06-13 | Recently asked section on Compliance | ✅ Approved → Batch 2 |
| 2026-06-13 | Confidence indicator on Compliance answers | ✅ Approved → Batch 2 |
| 2026-06-13 | Cross-tab search bar on Regulations | ✅ Approved → Batch 2 |
| 2026-06-13 | Print/PDF export on Regulations | ✅ Approved → Batch 2 |
| 2026-06-13 | Page-level freshness banner on Regulations | ✅ Approved → Batch 2 |
| 2026-06-13 | Batch summary card per tank in The Press | ✅ Approved → Batch 2 |
| 2026-06-13 | Conversation persistence on Compliance | ✅ Approved → Batch 2 |
| 2026-06-13 | What's New ribbon on Home page | ✅ Approved → Batch 2 |
| 2026-06-13 | Wire Regulations CTA to pre-fill Compliance ?q= | Pending |
| 2026-06-13 | Verify WET rebate cap against ATO post-1 Jul 2026 | Pending |
| 2026-06-13 | SOP feature build (3-tier templates, 6 process stages) | Pending — reference material saved |
| 2026-06-13 | skill-creator: make regulation ingestion process into a reusable skill | Pending |
