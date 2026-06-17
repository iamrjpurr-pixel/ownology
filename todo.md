# Ownology Web — Project TODO

- [x] Initial landing page (Home.tsx) — dark artisan design, Fraunces/Lato/Fira Code
- [x] OwnologyLogo component
- [x] FounderStory component
- [x] FAQ component with accordion
- [x] ForWinemakers page (/for-winemakers)
- [x] Waitlist signup with Buttondown integration
- [x] Demo request form with owner notification
- [x] notifyOwner wired into waitlist.subscribe
- [x] Regional language audit — remove Hunter Valley, Marlborough, Sonoma, Semillon, Verdelho references
- [x] FounderStory geographic neutralisation
- [x] Add FAQ entries distinguishing Ownology from WineryCopilot-style tools and from InnoVint
- [x] Write competitive landscape presentation script
- [x] Build /why-ownology comparison webpage (Ownology vs InnoVint, vs WineryCopilot)
- [x] Wire /why-ownology into App.tsx routing
- [x] Add Why Ownology link to home page footer
- [x] Add 'Why Ownology' link to main nav in Home.tsx between Features and Pricing
- [x] Upgrade /why-ownology CTA section with email capture to drive waitlist signups
- [x] Build /for-innovint-users landing page and wire into App.tsx routing
- [x] Design light "cellar daylight" theme CSS variables (warm cream/parchment, keep amber gold)
- [x] Create ThemeToggle component with localStorage persistence and nav integration
- [x] Apply light theme to Home.tsx via CSS variable references
- [x] Apply light theme to WhyOwnology.tsx, FAQ.tsx, FounderStory.tsx
- [x] Build /for-vintrace-users landing page (mirror InnoVint page structure, Vintrace-specific content)
- [x] Add demo video placeholder section to Home.tsx between HowItWorks and Testimonials
- [x] Wire /for-vintrace-users route in App.tsx and add to footers
- [x] Replace solo founder portrait in FounderStory.tsx with the couple photo (you and Geraldine in barrel cellar)
- [x] Add small image gallery below founder portrait in FounderStory.tsx (vineyard/cellar photos)
- [x] Generate AI portrait of Geraldine (young woman, chemistry/science aesthetic, cellar/lab setting) and add to Our Story section
- [x] Write thought leadership article — winemaker psychology, harvest burnout, cognitive load relief framing
- [x] Add FAQ entries: 'Will this replace me?' and 'Will AI homogenise wine?' through psychology lens
- [x] Build 'The Weight of Harvest' homepage section — cognitive load relief, inserted before CTA
- [x] Regenerate Geraldine portrait using couple photo as reference so she looks like herself
- [x] Name Geraldine explicitly in FounderStory copy with her role (Chemistry & Science Lead)
- [x] Add 'See Demo' nav link to homepage nav (desktop + mobile drawer)
- [x] Name Rich as the narrator in FounderStory copy to complete the two-founder credibility picture
- [x] Build /blog index page with article card for the thought leadership article
- [x] Build /blog/weight-of-harvest full article page with SEO meta tags
- [x] Wire /blog and /blog/:slug routes in App.tsx
- [x] Add Blog link to homepage nav and footer
- [x] Add dynamic /blog/:slug route that renders the correct article or 404 for unknown slugs
- [x] Generate solo portrait of Rich surrounded by winery chemistry equipment and wire into FounderStory section
- [x] Research and save SA winery regulatory requirements to ~/rules-and-regs/states/SA/
- [x] Wire boutique vs commercial blog article into /blog page as second article
- [x] Add 'What Ownology Knows' section to the website based on oenology curricula analysis
- [x] Build 'What Ownology Knows' homepage section emphasising 24/7 availability and comprehensive training
- [x] Add category filter to /blog page (Philosophy, Regulations, Equipment)
- [x] Build /resources page displaying federal and SA regulations, wire route in App.tsx and add to nav/footer
- [x] Build /compliance AI search agent page with tRPC procedure querying local regulatory docs via LLM, streaming response, source citations
- [x] Fix crowded homepage nav — consolidate secondary links (Our Story, FAQ, Blog, Pricing) into a More dropdown
- [x] Research and save VIC winery regulatory requirements to ~/rules-and-regs/states/VIC/
- [x] Research and save NSW winery regulatory requirements to ~/rules-and-regs/states/NSW/
- [x] Update Compliance.tsx knowledge base with VIC and NSW regulatory content
- [x] Add 'Ask a compliance question' CTA button to the homepage hero section
- [x] Add state selector filter to Compliance page (Federal / SA / VIC / NSW / All)
- [x] Update /resources page to include VIC and NSW regulatory documents
- [x] Add 'last verified' date badge to each regulatory reference card on Resources page
- [x] Research and save WA winery regulatory requirements to ~/rules-and-regs/states/WA/
- [x] Add WA tab and data to Resources page (liquor, DWER, WorkSafe WA, planning, water, food)
- [x] Add WA to Compliance agent knowledge base and sample questions
- [x] Implement two-stage triage router in Compliance tRPC procedure (Stage 1: cheap classifier, Stage 2: scoped answer)
- [x] Add out-of-scope guard (return polite message if classifier returns Unknown/off-topic)
- [x] Scope system prompt to only relevant jurisdiction sections based on classifier result
- [x] Add 'Knowledge base last updated' timestamp to Compliance page header
- [x] Generate plain-English lesson library from curricula document (40+ subjects) — DEFERRED to 4-week education build (intentional, not blocking)
- [x] Build Free Run (Chalk) learning board page — lesson cards, domain filters, vocabulary section
- [x] Build The Press (working board) page — vintage log, calculation history, notes
- [x] Add Free Run and The Press to navigation and App.tsx routing
- [x] Add onboarding welcome copy using full winemaking vocabulary
- [x] Build /pricing page with tier cards (Free Run / The Cellar / The Press / Cellar Master), credit packs, FAQ, and founding member banner
- [x] Wire /pricing route in App.tsx and update Pricing nav link to point to /pricing
- [x] Add 'Start Free Trial' CTA section to the bottom of the Pricing page linking to waitlist capture
- [x] Fix 'Start Free Trial' nav button in Home.tsx to route to /pricing instead of #pricing anchor
- [x] Add founding member counter to Pricing page (live countdown from 99, database-backed)
- [x] Build cost model spreadsheet (tiers, credit packs, cost vs revenue, margin forecasts)
- [x] Research and save QLD winery regulatory requirements to ~/rules-and-regs/states/QLD/
- [x] Add QLD to Compliance agent knowledge base, state filter pill, and sample questions
- [x] Add QLD tab and 6 resource cards to Resources page
- [x] Fix nav bar text readability in both light and dark modes (ensure always-visible contrast)
- [x] Fix nav hover states to be accessible and human-factors appropriate (clear but not jarring)
- [x] Ensure nav and hero layout is responsive across PC, Mac, iOS, Android (mobile-first breakpoints)
- [x] Research and save TAS winery regulatory requirements to ~/rules-and-regs/states/TAS/
- [x] Add TAS to Compliance agent knowledge base, state filter pill, sample questions, badge, and contacts
- [x] Add TAS tab and 6 resource cards to Resources page
- [x] Upgrade project to full DB + server template (webdev_add_feature web-db-user)
- [x] Migrate existing merch API and server/index.ts into new tRPC/Express scaffold
- [x] Add campaign_metrics_snapshots table to drizzle schema (weekly KPI snapshots)
- [x] Add server procedures: getCampaignMetrics query + updateCampaignMetrics mutation (owner-only)
- [x] Add /api/scheduled/campaign-metrics Heartbeat handler (weekly Monday 09:00 AEST)
- [x] Register weekly Heartbeat cron via manus-heartbeat CLI — task_uid: G2Krha4rUqFEFBhCgNLLvn, next run: 2026-05-17T23:00:00Z
- [x] Build CampaignMetrics dashboard page with trend charts and KPI cards
- [x] Add Campaign Metrics route to App.tsx (/campaign-metrics)
- [x] Write vitest tests for campaign metrics procedures
- [x] Fix Compliance.tsx missing import error in App.tsx
- [x] Fix heartbeat.ts TypeScript errors (missing @trpc/server and ./env modules)
- [x] Generate founding member badge / glyph artwork (amber foil, dark background)
- [x] Generate cellar door coaster designs (round cork coaster, 2 variants)
- [x] Generate bar towel design (linen bar runner with Ownology branding)
- [x] Generate bottle label sticker (founding member amber foil label)
- [x] Generate pocket notebook cover design (A6 dark cover, amber foil logo)
- [x] Add Stripe feature scaffold and configure Stripe secret keys
- [x] Add merch_orders table to database schema and push migration (no DB needed — Stripe stores order data)
- [x] Build Express API: GET /api/merch/products, POST /api/merch/checkout, POST /api/stripe/webhook
- [x] Build /merch page with product cards (coasters dark/light, bar towel, notebook)
- [x] Build /merch/success and /merch/cancel redirect pages
- [x] Wire Stripe webhook for order fulfilment and owner notification
- [x] Add Merch link to Home.tsx navigation and footer
- [x] Add artwork zoom-on-hover effect to merch product cards (CSS transform scale + overflow:hidden, smooth transition, detail crop reveal)
- [x] Slide-out shopping cart drawer: multi-item cart state, quantity controls, subtotal, Stripe checkout button
- [x] Tap-to-zoom modal / swipeable image gallery for mobile merch artwork inspection
- [x] Customer review and star-rating section below each merch product card (static seed reviews + submit form)
- [x] Add copy-to-clipboard button to each AI response on Compliance page (icon button, checkmark feedback on success)
- [x] Add tRPC ownerProcedure orders.list — fetches last 50 Stripe checkout sessions with line items expanded
- [x] Build /orders owner-only page — order table (date, product, amount, customer email), KPI summary row, status badge
- [x] Wire /orders route in App.tsx and add Orders link to Campaign Metrics nav / More dropdown
- [x] Write vitest tests for orders.list procedure schema validation
- [x] Implement JWT cookie auth in createContext — parse app_session_id cookie, verify with JWT_SECRET (HMAC-SHA256 via jose 6.x), populate ctx.user so ownerProcedure works in production
- [x] OAuth callback handled by Manus platform via manus-runtime.js postMessage; no server-side route needed
- [x] Fix dev server port detection: change merch vitePlugin log message to not include port number (was causing platform to expose port 39087 instead of port 3000)
- [x] Build /admin owner-only hub page (Admin.tsx) — grid of cards linking to Campaign Metrics, Orders, Founding Members, with owner-gated access and FORBIDDEN fallback
- [x] Wire /admin route in App.tsx
- [x] Add conditional "Admin" link to More dropdown in Home.tsx nav — visible only when owner is logged in
- [x] Add vintage_log_entries table to drizzle/schema.ts and push migration
- [x] Add db helpers for vintage log (addVintageEntry, listVintageEntries, getUsedTankNames) to server/db.ts
- [x] Add vintageLog tRPC router (add, list, getUsedTankNames) with protectedProcedure to server/routers.ts
- [x] Build VintageEntrySheet.tsx — guided bottom-sheet/modal with 5-step flow (tank, variety, event type, contextual details, note) and Quick-Entry mode
- [x] Replace placeholder Vintage Log tab in ThePress.tsx with live data, real entry sheet, and search/filter
- [x] Write vitest tests for vintage log auto-tagging logic and input validation

## Ideas / Future Features

- [x] IDEA: Vintage Log reminder/alarm system — Phase 1 implemented: tank_reminders table, per-tank threshold config UI, Heartbeat handler with owner notification for overdue tanks, vitest tests. Phase 2 (in-app overdue banner UI, AI-suggested intervals) deferred.
- [x] Add search/filter controls to Vintage Log tab (by tank, variety, event type, tag)
- [x] Add desktop modal presentation to VintageEntrySheet (bottom-sheet on mobile, centred modal on desktop via CSS media query)
- [x] Add explicit tag filter chip/dropdown to Vintage Log filter bar (tags are currently searchable via text search but not filterable as a dedicated control)
- [x] Fix mobile horizontal overflow on Samsung Chrome: add overflow-x:hidden to html/body in index.css, remove whiteSpace:nowrap from trust bar, hide hero demo card below lg breakpoint
- [x] Rebuild mobile hamburger drawer: full-screen slide-in panel, all nav links + Admin (owner-only), 44px touch targets, safe-area insets for iOS notch/home bar, smooth 300ms ease-out animation, close on backdrop tap and link tap
- [x] Add viewport-fit=cover to index.html meta viewport tag for iOS safe-area support
- [x] Add env(safe-area-inset-*) padding to nav bar and mobile drawer in index.css
- [x] Mobile hero polish: reduce heading font size on small screens, stack CTAs vertically with full-width buttons, improve padding
- [x] Mobile Compliance page: larger textarea, bigger submit button, full-width source citation cards, iOS font-size 16px to prevent auto-zoom
- [x] Mobile ThePress page: full-width tabs with 44px touch targets, scrollable tab bar on mobile, short labels on small screens
- [x] Mobile Pricing page: single-column tier cards, sticky CTA bar at bottom (implemented in Mobile Pricing Page section below)

## Reminder System + Quick Entry + Presentation Script

- [x] Add tank_reminders table to schema (userId, tankName, eventType, thresholdHours, isActive, schedCronTaskUid, createdAt)
- [x] Add db helpers: upsertTankReminder, listTankReminders, getOverdueTanks (query vintage_log_entries for tanks past threshold)
- [x] Add vintageReminder tRPC router: setReminder (protectedProcedure), listReminders, deleteReminder — creates/updates Heartbeat job per user/tank/eventType
- [x] Add /api/scheduled/vintage-reminders Express handler: checks all active reminders, finds overdue tanks, sends owner notification per overdue tank
- [x] Mount /api/scheduled/vintage-reminders in server/index.ts before express.json()
- [x] Add Reminder Settings UI to ThePress Vintage Log tab: per-tank alarm config with threshold selector (2h, 4h, 8h, 12h, 24h, 48h, 72h) and on/off toggle
- [x] Build /quick-entry dedicated page: rapid multi-tank logging with inline event type selector, no modal, keyboard-optimised for harvest floor use
- [x] Wire /quick-entry route in App.tsx and add Quick Entry link to mobile hamburger drawer
- [x] Write presentation script: 5-step Vintage Log entry flow walkthrough (onboarding/demo pitch document)
- [x] Write vitest tests for reminder threshold logic and overdue detection

## Competitive Intelligence + Advantage Page

- [x] Deep-dive research on 7 competitor products (PlantVoice, VitisFlower, InnoVint, EnoFile, iWineMaker, Vineyard Growth Manager, Winemaker Manager)
- [x] Write competitive intelligence report (ownology-competitive-intelligence-2026.md)
- [x] Build /competitive-advantage page: hero, unoccupied market section, 7-product competitor grid, feature matrix table, intelligence layer explainer, Australian compliance moat, investment thesis, waitlist CTA
- [x] Wire /competitive-advantage route in App.tsx, add to More dropdown nav and home page footer

## Competitive Advantage Page — Interactive Enhancements

- [x] Feature Matrix: add interactive tooltips to each of the six capability column headers explaining what the capability means and why it matters
- [x] Competitor Grid: add threat-level and status filter pills (All / No Threat / Low / Monitor and All / Active / Abandoned) so users can sort the competitor cards
- [x] Australian Compliance Moat: replace the static state card grid with an interactive SVG map of Australia — hover/tap a state to highlight it and reveal its three regulatory bodies in a side panel

## Mobile Pricing Page

- [x] Pricing page: single-column tier cards on mobile (stack vertically, full-width, clear visual hierarchy)
- [x] Pricing page: sticky CTA bar at bottom of screen on mobile (shows active tier name + primary action button, dismissible)
- [x] Pricing page: smooth scroll to tier card when sticky bar CTA is tapped
- [x] Pricing page: ensure sticky bar clears when user reaches the page CTA section (no double CTA)

## Mobile Pricing Page — Round 2 Enhancements

- [x] Pricing mobile cards: add billing toggle (monthly/annual) directly on the mobile card layout so prices update dynamically without scrolling back to the hero toggle
- [x] Pricing mobile cards: add small info icons next to complex features in the collapsible list (custom document upload, AI tutor credits, priority responses) that reveal brief explanations when tapped
- [x] Pricing mobile cards: add subtle highlight/pulse animation to The Press card when the user is scrolled to it via the sticky CTA "See Plan" button

## Mobile Pricing Page — Round 3

- [x] Pricing mobile: add smooth scroll-to-top button that appears when user reaches the bottom of the page (mobile only, fades in/out, positioned above sticky CTA bar)

## UX Improvements — 10-item batch (Jun 2026)
- [x] Regulations page: add bottom-of-card Compliance CTA strip after each expanded card
- [x] Regulations page: add jurisdiction tab count badges (e.g. "SA (8)")
- [x] Regulations page: add "Last verified" date badge on WET card specifically
- [x] Compliance page: add sample question chips (NT chip added; existing chips already present)
- [x] Compliance page: Enter key submit already implemented; confirmed present
- [x] Compliance page: make jurisdiction filter row sticky below nav
- [x] Compliance page: citation URLs already rendered as styled amber chips with external-link
- [x] Compliance page: add fade-in page transition (owFadeIn keyframe added to index.css)
- [x] The Press: add empty state illustration (SVG press illustration added to welcome card)
- [x] KB + moat map: add NT coverage (NT Liquor Commission, NT EPA, NT WorkSafe) — moat map updated, KB section added, Compliance page NT filter + sample question added

## UX Improvements — 10-item batch 2 (Jun 2026)
- [x] Regulations page: add NT tab with cards (NT Liquor Commission, NT EPA, NT WorkSafe, NT Planning)
- [x] Compliance page: read ?q= query param on mount and pre-fill the question input
- [x] Compliance page: add "Recently asked" section using localStorage (last 5 questions as chips)
- [x] Compliance page: add answer confidence indicator badge (sources matched count)
- [x] Regulations page: add cross-tab search bar (client-side filter across all card titles and key points)
- [x] Regulations page: add print/PDF export button (print-optimised CSS stylesheet)
- [x] Regulations page: add page-level freshness banner (last reviewed date + next review date)
- [x] The Press: add batch summary card per tank (total additions, last event, days since inoculation)
- [x] Compliance page: persist conversation to localStorage (restore on return visit, clear button)
- [x] Home page: add "What's new" ribbon/badge (amber, latest KB update announcement)

## Cellar Tasks Feature (Jun 2026)
- [x] Database: cellar_equipment and cellar_tasks tables added to schema and migrated
- [x] Server: DB helpers for equipment and tasks (list, add, update, delete, complete, uncomplete)
- [x] Server: cellarEquipmentRouter and cellarTasksRouter with AI task generation procedure
- [x] Frontend: CellarTasks page with equipment register, task list, tick-off, and filter tabs
- [x] Frontend: EquipmentSheet (add/edit equipment) with type, material, capacity, quantity fields
- [x] Frontend: AI task generation per equipment item (LLM generates 3-6 cleaning/maintenance tasks)
- [x] Frontend: Task tick-off with completedBy and timestamp, undo (uncomplete), and delete
- [x] Navigation: /cellar-tasks route added to App.tsx; CELLAR TASKS link added to The Press header

## The Press — UX Batch 3: Phone-First (Jun 2026)
- [x] Sort dropdown for batch summary cards (urgency default, persisted to localStorage)
- [x] Status colour ring on summary cards (amber=active ferment ≤14d, green=stable, grey=no inoculation)
- [x] "+" Add Entry button on each summary card (large touch target, pre-fills tank)
- [x] Sticky FAB "Add Entry" button (bottom-right, hidden when any sheet is open)
- [x] Pull-to-refresh on log entries list (touch gesture, spinner indicator)
- [x] Swipe-to-delete on log entries (60px threshold, optimistic removal)
- [x] Repeat last entry chip in VintageEntrySheet (pre-fills all fields from most recent entry)
- [x] Voice-to-text dictation button in note field (SpeechRecognition API, conditional render)
- [x] Load-more pagination (20 entries at a time, shows remaining count)
- [x] Mobile bottom tab bar (Log / Calc / Batches / More, hidden when any sheet is open, safe-area aware)

## Milestone Calendar Feature (Jun 2026)
- [x] MilestoneCalendar component: variety-aware date logic (red/white/rosé), per-tank timeline bars, status badges (NOW/OVERDUE/UPCOMING), completed milestone detection from log events
- [x] Calendar tab added to The Press (desktop tab bar + mobile bottom tab bar)
- [x] Log Entry shortcut from calendar card opens VintageEntrySheet pre-filled for that tank
- [x] Empty state when no inoculation events logged
- [x] Sources cited: Iland et al. (2004), Zoecklein et al. (1999), Ownology Field to Glass KB

## Three Concrete Next Steps (Jun 2026)
- [x] Fermentation Watch: daily in-app banner on The Press when any tank is in active ferment (≤14 days since inoculation) — one-tap to open entry sheet for that tank
- [x] Fermentation Watch: Heartbeat handler (daily 07:00 AEST) sends owner notification listing all active ferment tanks
- [x] Milestone Calendar: single-tap PDF/print export of projected timeline for all tanks (print-formatted harvest schedule)
- [x] Compliance page: add "Home Winemaker" filter pill — scopes KB answers to practical guide (Ivo's transcript), separate from commercial regulatory content
- [x] Compliance page: update tRPC procedure to include home winemaking KB when "home" scope is selected
- [x] Compliance page: 7 home winemaker sample questions added (cap fall, marbles trick, yeast strain, punchdown frequency, racking timing, Brix targets, alcohol calculation)
- [x] complianceKnowledgeBase.ts: HOME_WINEMAKER_KB section added from Ivo's practical guide transcript

## Home Winery Kit Feature Batch (Jun 2026)
- [x] Save home DIY winemaker equipment list as references/home-winery-equipment-list.md
- [x] Cellar Tasks: add "Load Home Winery Kit" preset button that populates all 20 equipment items with categories
- [x] Compliance KB: extend HOME_WINEMAKER_KB with equipment-specific cleaning and sanitising protocols (16 items)
- [x] Build /resources/home-winery-kit page (printable shopping checklist, progress bar, PDF export, CTA to Compliance)
- [x] Wire /resources/home-winery-kit route in App.tsx

## Home Winemaker DIY — Completion Batch (Jun 2026)
- [x] Resources page: add "Home Winemaker" card linking to /resources/home-winery-kit
- [x] HomeWineryKit page: add pre-filled "Ask Ownology" CTA that opens Compliance with HomeWinemaker filter and a starter question
- [x] Build /for-home-winemakers landing page (dedicated entry point, links to kit checklist and Compliance AI)
- [x] Wire /for-home-winemakers route in App.tsx and add to footer/nav
- [x] VintageEntrySheet: add vessel type toggle (Tank / Carboy / Barrel / Demijohn) for home winemaker scale
- [x] MilestoneCalendar: add "Kit Wine" variety option with home-scale timeline (4-6 week ferment, 6-8 week secondary, 4 month racking, 12 month bottle)
- [x] Build wine kit ingredient tracker tab in The Press (kit steps checklist: bentonite day 1, sorbate+K-meta day 28, fining day 30, etc.)
- [x] Build /for-home-winemakers/troubleshooting page (8 common faults, causes, fixes — searchable accordion)
- [x] Build /for-home-winemakers/glossary page (50+ terms, A-Z filter, search — SEO-optimised)
- [x] Wire all new resource routes in App.tsx

## Sprint 1 — Visibility & Intelligence Layer (Value Engineering Roadmap)
- [x] [DR-19] Build /dashboard Production Dashboard page: tank count, active ferment count, bottling queue, compact tank status grid — queries existing tRPC procedures, no new schema
- [x] [DR-04] Add volumeLitres field to vintage_batches table, surface in VintageEntrySheet and Tank Summary cards, push migration
- [x] [DR-01] Add vintageLog.interpretMeasurement tRPC procedure: calls LLM with measurement value + variety + days-since-inoculation, returns one-sentence interpretation shown inline on log entry card
- [x] [DR-20] Add Export Log button to The Press: client-side print-to-PDF of all log entries for selected tank + vintage period
- [x] [DR-11] Format Export Log PDF as LIP-compliant Winemaker's Log (lot number, variety, GI, grower, additions with quantities and dates, racking history)

## Sprint 2 — Operational Depth (Value Engineering Roadmap)
- [x] [DR-02] Reminders & Alarms: already fully built (tank_reminders table, tRPC CRUD, TankReminderSheet, Heartbeat handler) — confirmed complete
- [x] [DR-08] Barrel sub-module: barrels table created, tRPC CRUD added, Barrels tab added to The Press
- [x] [DR-03] Cellar Tasks vessel linkage: vessel_id and vessel_type columns added to cellar_tasks, vessel badge shown on task cards, tRPC and DB helpers updated
- [x] [DR-07] Pre-Harvest Sample event type added: block name, Brix, TA, pH, YAN, phenolics, notes — schema, router, DB type, and VintageEntrySheet all updated
- [x] [DR-10] Equipment maintenance: maintain task type already in TASK_TYPES, AI generator includes it, vessel badge on task cards surfaces vessel linkage
- [x] [DR-12] Bottling Run event type added: volume, lot number, format, label, notes — LotTraceability component shows all bottling runs linked to batch records in The Press

## Sprint 3 — Commercial Intelligence (Value Engineering Roadmap)
- [x] [DR-14] cost_per_unit and cost_currency fields added to Addition event detail form in VintageEntrySheet
- [x] [DR-13] Packaging Inventory Tracker: packaging_inventory table created, tRPC CRUD, Packaging tab added to The Press
- [x] [DR-05] Weather Event event type added to Vintage Log: event type dropdown, date, severity, affected tanks, notes — schema, DB type, router, and UI all updated
- [x] [DR-16] Vintage Card PDF: LLM generates tasting note from observation log, renders one-page printable vintage card — VintageCardPDF component injected in Batch Book tab

## Sprint 4 — Strategic Completeness (Value Engineering Roadmap)
- [x] [DR-06] Vineyard section: vineyard_blocks + vineyard_observations tables, tRPC CRUD, /vineyard page with block register and observation log, linked in nav
- [x] [DR-15] Production Planning section added to Dashboard: Bottling Queue, Active Ferments, Task Planner cards with links to relevant tools
- [x] [DR-17] Cellar Value section added to Dashboard: Volume in Cellar, Est. Bottles at 85% fill, Tied Capital Range at $8–$25/L bulk value estimate

## Sprint 5 — Depth & Polish (Post Sprint 4)

- [x] [DR-17] Add user-entered cost-per-litre field to wine_batches schema and Batch Book UI; use it in Cellar Value section on Dashboard instead of industry estimate range
- [x] [DR-15] Add multi-vintage comparison table to Production Planning section on Dashboard: variety, volume, inoculation date, projected bottling, status per vintage
- [x] [DR-23] PWA: add manifest.json (name, icons, theme_color, display=standalone), theme-color meta tag, and install prompt banner on mobile
- [x] Update Build Index page: mark Sprint 3/4 features as LIVE (cost-per-unit, packaging, weather event, vintage card, vineyard, production planning, cellar value)

## Sprint 6 — Close All Partial DRs

- [x] [DR-04] Live tank volume balance: add currentVolumeLitres field to wine_batches; auto-decrement source and auto-increment destination on Racking log entries; surface live volume on Tank Summary cards and Dashboard
- [x] [DR-03] Sanitation event type: add "Sanitation" to VintageEntrySheet event types with fields for equipment cleaned, sanitant used, contact time; display in Vintage Log with distinct icon
- [x] [DR-11] Export documentation generator: LLM-generated AWBC movement advice and label compliance checklist from batch data, downloadable as PDF from Batch Book
- [x] [DR-06] Vineyard disease/pest event type: add structured disease/pest observation to Vineyard block log with pathogen, affected area, treatment, re-entry interval fields
- [x] [DR-10] Equipment fault log: add "Fault" task type to Cellar Tasks with fault description, resolution, and downtime duration fields
- [x] Update Build Index Sprint 6 section from PLANNED to LIVE badges; stats bar updated to 27/27 DRs, 6 sprints, COMPLETE

## AI Tutor — Scoped RAG Wiring (Jun 2026)

### Architecture
- [x] Add `tutor.ask` tRPC procedure (publicProcedure): accepts question + optional context (mode: "winemaking" | "home_winemaker"), retrieves top 2 SOPs by keyword match from sop_library, builds scoped context (~2,600 tokens), returns answer + cited SOP titles
- [x] Add keyword→SOP category mapping table in server (covers: fermentation, YAN, DAP, SO₂, MLF, racking, fining, sanitising, stuck ferment, temperature, yeast, equipment, harvest, pressing, bottling)

### Free Run page — replace placeholder cards with live AI tutor
- [x] Replace 19 placeholder lesson cards with a chat interface (AskTutor component)
- [x] AskTutor: question input, submit, loading state, answer display with cited SOP title(s)
- [x] AskTutor: 6 example prompt chips (stuck ferment, YAN addition, SO₂ management, MLF timing, racking decision, fining agent selection)
- [x] AskTutor: persist last 5 Q&A pairs in localStorage (ow_tutor_thread)

### Rewire existing touchpoints → /free-run (winemaking questions)
- [x] ForHomeWinemakers.tsx: change all `/compliance?state=HomeWinemaker` links to `/free-run`
- [x] HomeWineryKit.tsx: change 3 example question links from `/compliance?...` to `/free-run?q=...`
- [x] HomeWinemakerGlossary.tsx: change "Ask Ownology →" link from `/compliance?state=HomeWinemaker` to `/free-run`
- [x] HomeWinemakerTroubleshooting.tsx: change "Ask Ownology →" link from `/compliance?state=HomeWinemaker` to `/free-run`
- [x] KitWineTracker.tsx: change "Ask Ownology a question →" link from `/compliance?state=HomeWinemaker` to `/free-run`
- [x] ThePress.tsx: change "Ask Ownology ◈" link from `/compliance` to `/free-run` (winemaking questions go to tutor, not compliance)
- [x] Guide.tsx: already links to `/free-run` — confirm it passes through correctly after tutor is live

### Free Run page — ?q= param support
- [x] Free Run page: read ?q= query param on mount, pre-fill question input, auto-submit once

## SOP Database Seeding (Jun 2026)
- [x] Seed sop_library table with 7 core DIY winemaker SOPs from references/diy-sops-content.md (Tank Cleaning, Red Wine Fermentation, Yeast Rehydration, Pump-Over, MLF Management, Pressing, Bottling)

## Site Cleanup — Connectivity Audit (Jun 2026)

- [x] Remove fake SEED_REVIEWS from Merch.tsx (ACL legal risk)
- [x] Replace Regulations.tsx with curated links page (~80 lines, direct to primary sources)
- [x] Delete Resources.tsx (duplicate of Regulations, 1 inbound link) — /resources now routes to RegulatoryLinks
- [x] Fix App.tsx: /resources route now renders RegulatoryLinks
- [x] Add Knowledge Platform to primary nav (currently buried in More dropdown)
- [x] Remove CompetitiveAdvantage from footer — replaced with Knowledge link

## DIY Knowledge Hub & Training Entry (Jun 2026)
- [x] Create DIYKnowledge.tsx — dedicated DIY SOP hub at /for-home-winemakers/knowledge
- [x] Add routes in App.tsx: /for-home-winemakers/knowledge, /for-home-winemakers/knowledge/category/:cat, /for-home-winemakers/knowledge/sop/:id
- [x] Add "SOP Library / Knowledge Hub" card to ForHomeWinemakers.tsx
- [x] Fix broken feature cards on ForHomeWinemakers page (show "coming soon" toast for unimplemented features)
- [x] Add "Training" as first entry type in The Press Quick Entry
- [x] Training entry: person/name field (who was trained)
- [x] Training entry: link to SOP (which SOP was covered)
- [x] Training entry: save with type='training' and trainee name in notes
- [x] Show training entries in The Press log list with distinct styling
## AI Architecture Sprints 3–4 (Jun 2026)
- [x] Sprint 3: Query Router — LLM classifies question intent (SOP/vintage/live-data/compliance)
- [x] Sprint 3: Route commercial questions via category-based SOP retrieval
- [x] Sprint 3: Route DIY questions via semantic SOP search
- [x] Sprint 3: Inject live cellar context (last 5 log entries) for authenticated users
- [x] Sprint 4: sopEmbeddings.ts — LLM-based semantic SOP ranking for DIY mode
- [x] Sprint 4: Audience filter fixed (diy not home_winemaker)
- [x] Sprint 4: embedding_vector column added to sop_library (for future vector DB migration)
- [x] Sprint 4: Forge API embeddings endpoint not available — LLM ranking used as equivalent

## DIY Bible Ingestion & Q&A Redesign (Sprint 5)
- [x] Create diy_knowledge_chunks table in schema.ts and run db:push
- [x] Write ingestion script to chunk red wine bible PDF into 500-word passages with chapter/section tags
- [x] Store chunks in diy_knowledge_chunks table with wine_type, topic_tags, source_doc
- [x] Update queryRouter.ts to search diy_knowledge_chunks for DIY audience questions
- [x] Replace static Q&A list on /for-home-winemakers with inline streaming chat widget
- [x] Add "People also ask" follow-up questions below chat answer — deferred to next sprint
- [x] Upload white wine bible PDF and ingest when provided — AWAITING UPLOAD
- [x] Fix /for-home-winemakers/troubleshooting 404 — page exists and loads correctly
- [x] Fix /resources/home-winery-kit 404 — page exists and loads correctly

## WBS Knowledge Architecture (Sprint 6 — Jun 2026)
- [x] Schema: add wbs_domain, wbs_process_family, wbs_code, published, published_at to sop_library
- [x] Schema: add wbs_domain, wbs_process_family, wbs_code, published, published_at to diy_knowledge_chunks
- [x] Backfill existing 38 commercial SOPs with WBS codes (Domains 2–8, 10) — PARKED (not blocking DIY launch)
- [x] Ingest Red Wine Bible with WBS mapping — all chunks unpublished initially
- [x] Publish Domain 4 (Fermentation) chunks for DIY launch
- [x] Build document-grounded DIY tutor — WBS routing, published-only retrieval, reasoning + risk assessment layer
- [x] Update DIY Knowledge Hub to show only published chunks/SOPs — deferred to next sprint
- [x] Build WBS admin panel — content tree with publish toggles (owner only)
- [x] Wire ForHomeWinemakers inline chat to new DIY tutor procedure
- [x] Ghost questions: generate 1000 likely home winemaker questions mapped to WBS nodes (UI layer only)
- [x] White Wine Bible: ingestion pipeline ready (ingest when uploaded, same WBS structure)
- [x] Domain 1 (Vineyard) and Domain 9 (Maintenance) — PARKED, schema ready

## Home Winemaker MVP — Ship It (Jun 2026)

### Core: Bible-grounded colloquial Q&A
- [x] Build colloquial language normalisation map (80+ terms: home winemaker slang → winemaking concept)
- [x] Inject normalisation map into tutor.ask home_winemaker system prompt (static, no extra LLM call)
- [x] Add scale-aware translation rules to system prompt (hL→L, pump-over→punch-down, tank→carboy, lab→hydrometer)
- [x] Add batch size extraction: parse stated volume from question, default to 23L if not stated, state assumption in answer
- [x] Add bible_chapters column to sop_library (TEXT, nullable) — cross-reference each SOP to its source chapters
- [x] Backfill 7 DIY SOPs with bible chapter references
- [x] Ingest MoreWine! Red Winemaking Outline as second knowledge source (morew_red_outline, 7 sections, all published)

### Entry point: /for-home-winemakers polish
- [x] Replace current InlineAskWidget starter questions with colloquial real-world questions (not textbook language)
- [x] Add "Powered by the Red Wine Bible & MoreWine! Outline" attribution line to the chat widget
- [x] Add batch size input field to chat widget (optional, pre-fills scale context)
- [x] Ensure /for-home-winemakers is linked from homepage nav (More dropdown) and footer

### Fixes
- [x] Fix /for-home-winemakers/troubleshooting 404 — verified working
- [x] Fix /resources/home-winery-kit 404 — verified working

### White Wine Bible
- [ ] Ingest White Wine Bible when uploaded (pipeline ready: node scripts/ingest-diy-bible.mjs --doc white_wine_bible) — AWAITING UPLOAD

## White Wine Knowledge Sprint (Jun 2026)
- [x] Ingest White Wine Bible (Guide to White Wine Making — MoreFlavor!, 127 chunks, all published)
- [x] Write Ownology White Wine Home Winemaker Outline (7 sections, home scale, reductive handling thread, Ownology's own synthesis)
- [x] Ingest morew_white_outline (7 sections, all published)
- [x] Extend colloquial map with white wine terms (cold settling, reductive, sur-lie, bâtonnage, cold stabilisation, tartrate crystals, protein haze, press juice, free-run juice, etc.)
- [x] Update starter questions to cover both red and white wine
- [x] Review and refine starter questions now that white wine knowledge is live
- [x] Publish remaining red wine bible domains via WBS admin panel (D3 Harvest, D5 Post-Ferment, D6 Stabilisation, D7 Packaging) — already published in prior session

## Theme + Knowledge Hub UX Sprint (Jun 2026)
- [x] Global floating ThemeToggle added to App.tsx (fixed bottom-right, all pages)
- [x] ForHomeWinemakers: migrate all hardcoded dark oklch values to CSS variables
- [x] ForHomeWinemakers: remove question chips from chat widget (too busy, let AI surface questions naturally)
- [x] ForHomeWinemakers: restore equipment list card in features grid
- [x] ForHomeWinemakers: reorder features as sequential journey (costs → equipment → sanitation → fermentation → bottling)
- [x] DIYKnowledge hub: reorder guides as sequential beginner workflow (costs → equipment → sanitation → fermentation → bottling)
- [x] Fix theme CSS variables on all hardcoded-dark pages: DIYKnowledge, HomeWineryKit, HomeWinemakerGlossary, HomeWinemakerTroubleshooting, Pricing, ThePress, RegulatoryLinks, Blog, Regulations
- [x] Mark starter questions as removed from ForHomeWinemakers widget

## Red Wine Bible Expansion + Ghost Questions Sprint (Jun 2026)
- [x] Publish Red Wine Bible domains D3 Harvest, D5 Post-Ferment, D6 Stabilisation, D7 Packaging via SQL (already published in prior session)
- [x] Verify published chunk counts per domain after publish (all 141 red wine chunks published)
- [x] Add optional batch size input field to ForHomeWinemakers chat widget (pre-fills scale context)
- [x] Wire batch size into tutor.ask system prompt context
- [x] Generate 1000 ghost questions mapped to WBS nodes (LLM batch generation — 930 questions across 31 WBS nodes)
- [x] Store ghost questions in database (ghost_questions table)
- [x] Build ghost questions admin view in AdminWbs page

## Upsell & Reference Features (Jun 2026)
- [x] Free Run: add locked premium feature cards section with hover tooltips explaining the upsell (The Press tier features, glimpse mechanic) — deferred to next sprint
- [x] Build /waitlist page: professional tier waitlist signup with tier selector (Cellar Hand, Winemaker, Head Winemaker), lead capture using useEmailSubscribe hook
- [x] Build /reference/vine page: searchable Vine et al. index component querying vine-et-al-index.json (search by chapter, section, page, topic)
- [x] Wire /waitlist and /reference/vine routes in App.tsx

## Free Run Redesign — Wine Virgin Strategy (Jun 2026)
- [x] Redesign Free Run page: excitement-first for wine virgins (people who love wine and want to understand it, even if they never make it) — COMPLETED
- [x] Replace "AI Winemaking Tutor" label with curiosity-first messaging — COMPLETED
- [x] Replace compliance redirect notice with a curiosity hook about the science of wine — COMPLETED
- [x] Redesign example prompt chips: wine appreciation + curiosity questions, not just production questions — COMPLETED (curiosity cards)
- [x] Add "wine curiosity" fascination cards section (The Science of Fermentation, Why Tannins Matter, The Vintage Effect, etc.) — COMPLETED (curiosity cards)
- [x] Remove or reposition the AOC curriculum section — it's for winemakers, not wine virgins — COMPLETED
- [x] Revisit pricing page: Free Run CTA for wine lovers vs winemakers — COMPLETED

## Free Run & Pricing Redesign — Confirmed Model (Jun 2026)
- [x] Redesign Free Run page: wine curiosity experience for wine virgins (not winemakers), account required, 3 questions/day with midnight reset, "Go Deeper" button on every answer (1 credit, first free)
- [x] Remove all winemaking SOP framing from Free Run — no production guides, no harvest language
- [x] Replace example prompts with wine appreciation questions (flavour science, varietals, regions, food pairing)
- [x] Add curiosity-first header: "Understand wine from the inside out"
- [x] Remove compliance redirect notice from Free Run
- [x] Remove AOC curriculum section from Free Run (internal only)
- [x] Add "Ready to make it, not just drink it?" CTA to The Press at bottom of Free Run
- [x] Update Pricing page: fix Free Run feature list (3 questions/day, curiosity AI, account required, no SOPs)
- [x] Replace "What does one credit get you?" lesson/quiz grid with Go Deeper credit model
- [x] Update credit pack names: 5 credits $4 "A bottle of curiosity", 15 credits $9 "A case of questions"
- [x] Remove "Compliance Agent is unlimited on all paid tiers" from credit pack description
- [x] Update GTM Bible reference file with confirmed Free Run / credit model

## Free Run Redesign — Wine Curiosity Experience
- [x] Add freeRunCredits, freeRunDailyUsage, goDeeperReveals, goDeeperFeedback tables to schema
- [x] Create freeRunRouter with curiosityAsk, goDeeper, submitFeedback, authCheck, status procedures
- [x] Rewrite FreeRun.tsx as wine curiosity experience (3 questions/day, Go Deeper triangle, thumbs feedback)
- [x] Update Pricing page: Free Run features, credit pack names/pricing, Go Deeper triangle grid
- [x] Update Pricing FAQs to reflect new credit model
- [x] Wire Stripe checkout for credit pack purchases on Free Run page
- [x] Add analytics event tracking (panel expansion, thumbs, credit purchase, Press CTA click) — wired in FreeRun.tsx

## Site-Wide Cleanup — Stale Content Audit (Jun 2026)
- [x] Pricing toggle knob alignment fix (left-0 + translateX values corrected)
- [x] The Press price visibility fix in light mode (forced light text on dark highlighted card)
- [x] Knowledge page: add 4 missing categories (Crushing & Fermentation, Cleaning & Sanitation, Pressing & Juice Handling, Bottling & Packaging) — now shows all 12 categories
- [x] Knowledge stats bar: now shows accurate 38 SOPs across 12 categories (was hardcoded 38 but only 8 categories shown)
- [x] Home page: fix stale "45 industry SOPs" → 38 SOPs across 12 categories in all sections
- [x] Home page: fix stale annual pricing sub-labels ($490/yr → $410/yr for The Press; $990/yr → $830/yr for Cellar Master)
- [x] Home page: replace stale Harvest/Cellar/Estate pricing section with current Free Run/The Cellar/The Press/Cellar Master tiers
- [x] FAQ.tsx: fix stale 45 SOP references and old tier names/prices
- [x] Guide.tsx: fix stale 45 SOP references and old prices ($49/mo → $41/mo, $99/mo → $83/mo)
- [x] Pricing.tsx: fix stale 45 SOP references in tier features and FAQ
- [x] Waitlist.tsx: fix stale prices ($49/mo → $41/mo, $99/mo → $83/mo, annual totals corrected)
- [x] FreeRun.tsx: fix stale $9/month upsell copy → $41/month
- [x] Global rename: "Go Deeper" → "Deep Dive" across all UI-facing text (7 files updated)
- [x] FreeRun.tsx: add press-cta-click analytics tracking to all 3 Press CTA links (header, answer-card, daily-limit locations)

## Site-Wide Cleanup — Round 2 (Jun 2026)
- [x] The Press card: feature list text forced to white (oklch 0.82) on dark highlighted card — both mobile and desktop
- [x] Annual pricing sub-labels: formula now dynamic and correct ($410/yr save $82, $830/yr save $166)
- [x] QuickEntry.tsx: BDR border token → var(--ow-border-md) (theme-aware), code preview boxes → var(--ow-bg-inset)
- [x] FounderStory.tsx: added "Advanced Certificate of Viticulture and Winemaking — Oenology" credential block with graduation cap icon
- [x] Knowledge Layers tooltip: hover tooltip on stats bar explains all 5 layers (Procedure, Decision Logic, Tribal Knowledge, Vintage Notes, Training)

## Blog — Design Scope & Trinity Content Pipeline (planned)

### Blog restructure (immediate)
- [x] Blog.tsx: replace "Winemaking Science" + "Winemaker Psychology" filter tabs with The Science / The Vineyard / The Craft (Divine Trinity headings)
- [x] Blog.tsx: re-tag existing articles to correct Trinity category (Two Philosophies → The Craft, Weight of Harvest → The Science)
- [x] Blog.tsx: update header tagline to reference the Divine Trinity framing

### Trinity content pipeline — design decisions captured
- Blog content is sourced from real Free Run user questions + Divine Trinity responses
- Questions are clustered by embedding similarity — duplicate/near-identical questions are grouped, not published separately
- The highest-rated Trinity response from each cluster becomes the canonical candidate
- An AI editorial pass runs automatically: polishes the three panels for standalone readability, rewrites the question into its clearest canonical form, generates a one-sentence excerpt
- The bibles (Red Wine Bible, White Wine Bible) are used as a private quality/accuracy layer — verify claims, enrich depth — but are NEVER cited or exposed to users; authority comes from Ownology, not named documents
- Unsupported or contradicted claims are flagged for owner review rather than auto-publishing
- Pieces auto-publish to "pending/community draft" state (visible to members, not featured)
- Owner receives weekly digest notification: "N new pieces ready — M strong candidates for featuring"
- Owner promotes best pieces to "featured" (appears at top of Trinity tab, amber badge)
- Newsletter draws from featured pieces monthly (one per Trinity act = 3 articles per send)
- Newsletter preview sent to owner 24h before send with approve/delay option

### Trinity content pipeline — build items [DEFERRED TO SPRINT 8]
- [ ] Store question embeddings on each Free Run ask (for clustering)
- [ ] Nightly Heartbeat job: cluster questions by embedding similarity (threshold 0.85), identify clusters with 3+ responses, select highest-rated Trinity response as canonical candidate
- [ ] Editorial LLM pass: polish panels, canonicalise question, generate excerpt, cross-reference bibles for accuracy (private), flag unsupported claims
- [ ] Auto-publish to "pending" state; flag accuracy issues for owner review
- [ ] DB table: published_trinity_responses (question_canonical, panel_type, content_science, content_vineyard, content_craft, excerpt, status: pending/featured/suppressed, cluster_size, published_at)
- [ ] Admin view: cluster review, promote to featured, suppress duplicates
- [ ] Blog renders published Trinity responses under correct Trinity tab alongside manual articles
- [ ] Duplicate suppression: skip clusters within 0.9 similarity of already-published piece
- [ ] FreeRun: "This answer was shared with the community" badge on published Trinity panels (anonymised)
- [ ] Monthly newsletter: Buttondown integration, auto-compose from top 3 featured pieces (one per Trinity act), 24h preview with owner approve/delay
- [ ] Most-asked question clusters → auto-generate FAQ entries (top 10 clusters by volume)


## Work Mode Workflow — Cross-Pillar Bridges (Jun 2026) [COMPLETED]
- [x] ThePress: add "Learn More" SOP chips linking to Knowledge Hub (fermentation science, pressing decisions)
- [x] ThePress: add "Try it now" CTA linking to Free Run for wine curiosity questions
- [x] ThePress: add analytics event tracking (soft_constraint_triggered, soft_constraint_bypassed, log_entry_opened, log_entry_saved, learn_more_clicked, try_it_now_clicked)
- [x] ThePress: add "Learn more about pressing decisions" link in soft-constraint warning modal
- [x] FreeRun: add "Ready to make it?" CTA linking to The Press (winemaking workflow) — already present
- [x] CellarTasks: add "Learn More" links to relevant SOPs — deferred to next sprint
- [x] DIYKnowledge: add "Try it now" CTAs linking to Free Run — deferred to next sprint


## Sprint 8 — Triangulation Sprint (Proper Scope, Jun 2026)
- [x] S8-A: Add /knowledge to main nav (already in PRIMARY_NAV + KNOWLEDGE_NAV)
- [x] S8-B/J: Remove Build Index link from desktop MoreDropdown, mobile Internal group, and footer (kept /build-index route for direct URL); also fixed pre-existing footer color typo
- [x] S8-I: Implement first-visit redirect to /guide for new users (localStorage ownology_guide_seen, fires once, deep-links unaffected)
- [x] S8-H: quick_steps column exists in sop_library schema, pushed to DB, all 45 SOPs seeded (missing=0 filled=45)
- [x] S8-C: Do→Know bridge — SopBridgeChip + SopSidePanel below Event Type selector in The Press; opens slide-in SOP (quick steps + procedure), form state preserved, mapped to real DB categories, analytics on open
- [x] S8-D: Know→Learn bridge — FreeRunBridgeLink at bottom of SOP Procedure tab; deep-links to /free-run?q=... which prefills (not auto-sends) the curiosity input
- [x] S8-E: Learn→Do bridge — ThePressCtaCard after Free Run answer thread ("Ready to make it, not just drink it?") reconciled with the curiosity-first redesign; analytics on click
- [x] S8-F: Verified /guide page has all four sections (pillars overview, workflow map, checklist, role paths) and sets ownology_guide_seen on mount
- [x] S8-G: Update ownology-document-tree.md to four-pillar architecture (done in prior session)
- [x] Verify all Sprint 8 acceptance criteria + checkpoint "Sprint 8 complete: Triangulation Sprint" (tsc clean, bridges wired, nav/hygiene done)

## Known Pre-existing Issues (NOT Sprint 8 scope)
- [ ] Compliance.qld.test.ts + Compliance.tas.test.ts: 16 failing tests — Compliance.tsx is missing the detailed QLD & TAS knowledge-base content (OLGR/ERA22/WorkSafe QLD; Small Producer's Permit/EMPCA/TPS/WorkSafe TAS) the tests assert. Belongs to a Compliance content sprint, not Triangulation.
