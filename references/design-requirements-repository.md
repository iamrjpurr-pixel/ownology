# Ownology — Design Requirements Repository

**Version:** 2.0
**Previous Version:** 1.0 (June 2026)
**Updated:** June 2026
**Purpose:** This document establishes the canonical set of design requirements for the Ownology platform, derived from the 20 documented winery and home winemaker pain-point categories. Each requirement is stated as a measurable design intent, mapped to the current state of the application after five completed development sprints, and assigned a coverage rating. This repository is the reference against which all future feature work and design decisions are measured.

**v2 Audit Scope:** All 27 DRs have been re-assessed against the features shipped in Sprints 1–5. Coverage ratings have been updated where new features close or narrow existing gaps. Assurance statements have been rewritten to reflect the current application state. The Priority Gap Closure Roadmap has been revised accordingly.

---

## How to Use This Document

Each requirement entry contains four fields:

- **Requirement** — a precise, testable statement of what the application must do to address the pain point.
- **Current Ownology Coverage** — a description of which existing features, pages, or components address this requirement, with the relevant route or component name.
- **Coverage Rating** — a three-level assessment: **Full** (requirement is substantially met), **Partial** (requirement is addressed but with known gaps), or **Gap** (requirement is not yet addressed).
- **Assurance Statement** — a single sentence that can be read aloud to a stakeholder or auditor to confirm how the requirement is met. If the rating is Partial or Gap, the statement also names the next concrete action required.

---

## Domain 1 — Production & Winemaking

### DR-01 · Consistent Wine Quality

**Requirement:** The application must enable a winemaker to log, query, and retrieve cellar decisions (additions, measurements, observations) for any tank at any point in the vintage, so that quality-affecting decisions are documented and reproducible.

**Current Ownology Coverage (v2):** The Vintage Log in *The Press* (`/the-press`) captures eight event types — Addition, Measurement, Racking, Inoculation, Observation, Pre-Harvest Sample, Bottling Run, and Weather Event — with structured fields for quantity, unit, timing, and free-text notes. The Inline AI Interpretation feature (Sprint 1) provides a one-tap LLM interpretation of any measurement entry in the context of variety and days since inoculation. The Batch Book records variety, GI, grower, and vintage metadata per lot. The Compliance AI (`/compliance`) can be queried for guidance on fermentation issues. Search and filter controls allow retrieval by tank, variety, event type, and tag.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a structured, searchable cellar log documenting every quality-affecting decision per tank, with inline AI interpretation of measurement readings in context — a winemaker can log a Brix reading and receive an immediate LLM-generated interpretation without leaving the entry screen.

---

### DR-02 · Fermentation Monitoring

**Requirement:** The application must provide a real-time or near-real-time view of active fermentation tanks, surfacing the key parameters (temperature, Brix/SG, pH, days since inoculation) that indicate whether fermentation is progressing normally.

**Current Ownology Coverage (v2):** The Fermentation Watch banner in *The Press* automatically identifies tanks with an inoculation event logged within the past 14 days and displays days-since-inoculation alongside variety. A daily Heartbeat handler (07:00 AEST) sends an owner notification listing all active ferment tanks. The Reminders & Alarms system (Sprint 2) allows per-tank reminder intervals to be set; the Heartbeat handler fires an owner notification when a tank is overdue. The Tank Summary cards show last-event type and date with colour-coded status rings (amber = active ferment ≤14 days, green = stable, grey = no inoculation). Measurements (Brix, SG, pH, temperature, free SO₂, YAN, TA, VA) are captured as structured log entries. The Milestone Calendar projects the expected fermentation window.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology surfaces active fermentation tanks with a day-count banner, colour-coded status rings, per-tank reminder alerts, and a daily owner notification — a winemaker receives an automated morning summary of all tanks in active ferment without opening the application.

---

### DR-03 · Contamination Risk

**Requirement:** The application must provide sanitation protocols for all cellar equipment and support the logging of cleaning events so that contamination risk is documented and traceable.

**Current Ownology Coverage (v2):** Cellar Tasks (`/cellar-tasks`) provides a task tracker with equipment-specific cleaning and sanitisation protocols, AI-generated task lists per equipment item, and vessel linkage (vessel_id and vessel_type on every task). The Compliance AI includes a HOME_WINEMAKER_KB section with cleaning protocols for 16 specific items. The Troubleshooting Guide covers Brett and contamination causes and remedies. Cleaning tasks can be ticked off with a completedBy timestamp, creating a documented cleaning history.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides AI-guided sanitation protocols and a timestamped cleaning task tracker linked to specific vessels; the remaining gap for commercial wineries is a formal sanitation log entry type in the Vintage Log that creates a traceable cleaning event directly against a tank ID within the production record.

---

### DR-04 · Inventory Visibility

**Requirement:** The application must allow a winery to answer, at any time, which tanks contain wine, what additives have been used, and which lots are approaching bottling readiness.

**Current Ownology Coverage (v2):** The Tank Summary cards in *The Press* show per-tank addition counts, last-event type, and days since inoculation. The Batch Book records lot-level metadata including volume in litres (Sprint 1). The Milestone Calendar projects bottling windows. The Production Dashboard (`/dashboard`) provides KPI cards for active tank count, total litres in ferment, and bottling queue. The Multi-Vintage Comparison table (Sprint 5) groups all batches by vintage year with variety, tank, volume, inoculation date, and status badge.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a tank-level summary view, volume tracking per batch, and a production dashboard with bottling queue visibility; the remaining gap is a formal per-tank volume field (litres currently in vessel) that updates automatically when racking events are logged, enabling a live inventory balance.

---

## Domain 2 — Vineyard-Related Challenges

### DR-05 · Weather Uncertainty

**Requirement:** The application must acknowledge weather as a primary vintage risk factor and provide a mechanism for winemakers to log weather-related observations and their impact on decisions.

**Current Ownology Coverage (v2):** The Weather Event event type (Sprint 3) in the Vintage Log provides a structured weather logging form with fields for event type (frost, hail, heat event, rain, wind, other), date, severity, affected tanks, and notes. The Observation event type supports additional free-text environmental notes. The Compliance AI can be queried on weather-related topics (smoke taint, frost impact, heat wave protocols). The Vineyard page (`/vineyard`, Sprint 4) provides a block register where weather impacts can be noted in vineyard observations.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a structured weather event log with severity and affected-tank fields, enabling winemakers to document frost, hail, and heat events at the time they occur and retrieve a complete weather history for any vintage.

---

### DR-06 · Disease & Pest Management

**Requirement:** The application must provide a reference resource for common vineyard diseases and pests, enabling a winemaker to log disease-related observations and query for management options.

**Current Ownology Coverage (v2):** The Compliance AI knowledge base covers vineyard disease topics. The Observation event type supports free-text disease notes. The Vineyard page (`/vineyard`, Sprint 4) provides a block register with an observation log where disease events can be recorded per block. The Regulations page covers relevant Australian regulatory requirements including chemical use.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology supports disease-related queries via the Compliance AI and free-text observation logging at both the tank and vineyard block level; the remaining gap is a structured disease/pest event type in the Vineyard observation log with fields for pathogen, affected area, and treatment applied.

---

### DR-07 · Harvest Timing

**Requirement:** The application must support the winemaker in documenting harvest timing decisions, including the Brix, acid, and phenolic ripeness readings that drove the decision, so that the rationale is preserved for future vintages.

**Current Ownology Coverage (v2):** The Pre-Harvest Sample event type (Sprint 2) captures block name, Brix, TA, pH, YAN, phenolics, and notes as a structured log entry preceding inoculation. The Inoculation event records the harvest date. The Milestone Calendar uses inoculation date as the harvest anchor. The Vineyard page block register links blocks to the production record.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology captures the complete pre-harvest decision trail — block name, Brix, TA, pH, YAN, and phenolic assessment — in a structured log entry that precedes inoculation, preserving the full rationale for harvest timing for every tank across every vintage.

---

## Domain 3 — Cellar Operations

### DR-08 · Tank and Barrel Management

**Requirement:** The application must provide a per-vessel record showing occupancy, wine movement history, cleaning schedule, and current wine status, accessible without requiring paper records or whiteboards.

**Current Ownology Coverage (v2):** The Tank Summary cards in *The Press* show per-tank event history, addition counts, and days since inoculation with colour-coded status rings. Racking events capture source, destination, volume, and lees status. The Cellar Tasks tracker manages cleaning schedules per equipment item with vessel linkage. The Barrels tab (Sprint 2) provides a dedicated barrel register with oak type, age, fill date, wine lot, and topping log. The vessel type field records Tank, Carboy, Barrel, or Demijohn per entry.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a complete digital vessel record covering tank event history, racking movement, cleaning task tracking, and a dedicated barrel sub-module with topping log — a winemaker can retrieve the full history of any vessel without paper records.

---

### DR-09 · Labor Shortages

**Requirement:** The application must reduce the cognitive and administrative burden on winery staff by making cellar knowledge instantly accessible, reducing the time spent searching for protocols, calculations, or regulatory information.

**Current Ownology Coverage (v2):** The Compliance AI (`/compliance`) provides instant, document-grounded answers to cellar questions from a mobile phone. The Quick Entry page (`/quick-entry`) enables rapid log entries without navigating the full interface. The Cellar Tasks tracker reduces the need for verbal handover of cleaning protocols. The Winemaking Calculators (SO₂, acid, sugar, YAN) are available in The Press Calculations tab. The AI Cellar Scenarios tab generates structured response plans for any described cellar problem.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology directly addresses labour burden by providing instant AI-guided cellar knowledge, rapid mobile entry, protocol automation, and on-demand winemaking calculators — reducing the time a winemaker or cellar hand spends searching for answers during harvest.

---

### DR-10 · Equipment Downtime

**Requirement:** The application must provide a mechanism for logging equipment faults and maintenance events, so that downtime history is documented and patterns can be identified.

**Current Ownology Coverage (v2):** The Cellar Tasks tracker includes a "maintain" task type in the AI task generator. Equipment items are registered with type, material, capacity, and quantity. Tasks are ticked off with a completedBy timestamp. The vessel badge on task cards links each maintenance task to a specific vessel ID.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology supports equipment maintenance task logging with vessel linkage and completion timestamps; the remaining gap is a dedicated fault log entry type (fault description, resolution, downtime duration) that would enable pattern analysis across vintages and support a preventive maintenance schedule.

---

## Domain 4 — Compliance & Traceability

### DR-11 · Regulatory Compliance

**Requirement:** The application must provide access to current Australian winery regulatory requirements (production records, lot traceability, label compliance, tax reporting, export documentation) and support the generation of compliant records.

**Current Ownology Coverage (v2):** The Regulations page (`/regulations`) is a searchable reference library covering Federal, SA, VIC, NSW, WA, QLD, TAS, and NT regulatory requirements with last-verified dates. The Compliance AI is scoped to regulatory and practical winemaking guidance with jurisdiction filtering and a two-stage triage router. The Batch Book generates LIP-compliant Winemaker's Log PDFs (Sprint 1) with vintage, variety, GI, grower, and full event history. The Vintage Card PDF (Sprint 3) generates a shareable vintage summary from observation log data.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a comprehensive regulatory reference library covering all Australian states and territories, AI-guided compliance queries, and LIP-compliant batch record PDFs; the remaining gap is automated export documentation generation (e.g., pre-filled AWBC export forms) and direct integration with tax reporting systems.

---

### DR-12 · Traceability

**Requirement:** The application must enable end-to-end traceability from grape intake to bottling, so that any lot can be traced back to its source blocks, additions, and processing decisions.

**Current Ownology Coverage (v2):** The Vintage Log records the full event chain per tank (inoculation → additions → measurements → rackings → observations → bottling run). The Batch Book links lot-level metadata (variety, GI, grower, vintage) to the log. The Lot Traceability panel (Sprint 2) in the Batch Book tab lists all bottling runs linked to their registered batch, enabling a lot → batch trace. Racking events capture source and destination vessels. The Pre-Harvest Sample event links block-level data to the production record.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides end-to-end lot traceability from pre-harvest block sampling through inoculation, additions, racking, and bottling run — the Lot Traceability panel in the Batch Book presents a single-screen audit trail from lot number back to source batch and all associated tank events.

---

## Domain 5 — Inventory & Supply Chain

### DR-13 · Packaging Material Shortages

**Requirement:** The application must support the winemaker in planning bottling runs by providing visibility of wine readiness alongside a mechanism to note packaging material availability.

**Current Ownology Coverage (v2):** The Packaging Inventory tab (Sprint 3) in *The Press* provides a full packaging stock tracker for bottles, closures, labels, capsules, and cartons with quantity-on-hand, low-stock threshold alerts, and a usage log. The Milestone Calendar projects bottling windows per tank. The Production Dashboard bottling queue card links projected bottling dates to the packaging inventory view.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a packaging inventory tracker with low-stock alerts alongside projected bottling windows — a winemaker can confirm that sufficient bottles, corks, and labels are on hand before committing to a bottling run date.

---

### DR-14 · Cost Management

**Requirement:** The application must support cost awareness by enabling the logging of additions with quantities and units, so that input costs per tank can be estimated and compared across vintages.

**Current Ownology Coverage (v2):** The Addition event type captures what was added, quantity, and unit. Cost-per-unit and cost-currency fields (Sprint 3) are available on addition log entries. The cost-per-litre field on wine batches (Sprint 5) enables a user-entered bulk wine value per lot. The Cellar Value section on the Production Dashboard (Sprint 3, enhanced Sprint 5) calculates tied capital from active ferment volumes, showing an ACTUAL badge when a user-entered cost is present and an industry-range estimate otherwise.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology supports cost tracking at both the addition level (cost-per-unit on every addition event) and the batch level (cost-per-litre on every wine batch), with a Cellar Value dashboard widget that converts these inputs into a tied-capital estimate — a winery owner can see their estimated inventory value at a glance.

---

## Domain 6 — Business & Commercial

### DR-15 · Forecasting Demand

**Requirement:** The application must support production planning by providing a view of current inventory volumes, projected bottling dates, and historical vintage data that informs how much wine to produce and age.

**Current Ownology Coverage (v2):** The Production Dashboard (`/dashboard`, Sprint 1 and Sprint 4) provides KPI cards for active tanks, litres in ferment, and bottling queue. The Production Planning section (Sprint 4) includes Bottling Queue, Active Ferments, and AI Cellar Tasks cards. The Multi-Vintage Comparison table (Sprint 5) groups all batches by vintage year with variety, tank, volume, inoculation date, and colour-coded status badge, providing a cross-vintage production view. The Milestone Calendar projects bottling windows per tank.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a production planning dashboard with a multi-vintage comparison table that aggregates volumes, projected bottling dates, and status across all active and historical batches — a winery owner can assess production capacity and timing without manual spreadsheet work.

---

### DR-16 · Direct-to-Consumer Sales

**Requirement:** The application must not duplicate existing DTC platforms but must provide a clear pathway for winemakers to connect cellar production data to their customer-facing story (wine club, tasting notes, vintage narrative).

**Current Ownology Coverage (v2):** The Vintage Card PDF (Sprint 3) generates an LLM-authored shareable vintage summary from the batch's observation log, formatted as a printable one-page vintage card. The Blog (`/blog`) provides a content channel for vintage narratives. The Batch Book records the provenance data (variety, GI, grower, vintage) that underpins DTC storytelling. The Compliance AI generates tasting note and vintage story content when queried.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a direct pathway from production data to customer-facing content via the Vintage Card PDF — a winemaker can generate a shareable, LLM-authored vintage narrative from their observation log with a single click, without duplicating existing DTC platforms.

---

### DR-17 · Inventory Aging

**Requirement:** The application must provide visibility of wine age per vessel (tank, barrel, warehouse) so that cash-flow pressure from aging inventory is visible to the winery owner.

**Current Ownology Coverage (v2):** The Cellar Value section on the Production Dashboard (Sprint 3, enhanced Sprint 5) calculates tied capital from active ferment volumes. Days-since-inoculation is surfaced on Tank Summary cards. The cost-per-litre field on wine batches (Sprint 5) enables a user-entered bulk wine value, and the Dashboard shows an ACTUAL tied-capital figure when this is set. The Multi-Vintage Comparison table surfaces aging status (Fermenting / Maturing / Awaiting Bottling / Bottled) per batch.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a Cellar Value dashboard widget that converts aging inventory into estimated tied capital using either a user-entered cost-per-litre or an industry range estimate, giving a winery owner a real-time cash-flow pressure indicator without manual calculation.

---

## Domain 7 — Data & Technology

### DR-18 · Disconnected Systems

**Requirement:** The application must serve as a single point of truth for cellar data, replacing the need for parallel spreadsheets, paper logs, and disconnected software by providing a mobile-accessible, cloud-stored record.

**Current Ownology Coverage (v2):** Ownology is a cloud-hosted web application accessible from any device. All log entries, batch records, and compliance queries are stored in a central database. The Quick Entry page is optimised for mobile use during harvest. The application is published at `ownology.ai` with a custom domain. The PWA manifest (Sprint 5) enables installation on mobile devices as a home-screen app with offline-capable shell.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology is a cloud-hosted, mobile-accessible, installable single record system that replaces paper logs and spreadsheets; winemakers can log, query, and retrieve any cellar event from any device, and install the application on their phone home screen for harvest-day access.

---

### DR-19 · Poor Real-Time Visibility

**Requirement:** The application must provide an at-a-glance dashboard view of current fermentation status, tank utilisation, and production progress that requires no manual report generation.

**Current Ownology Coverage (v2):** The Production Dashboard (`/dashboard`) provides KPI cards for active tank count, total litres in ferment, and bottling queue. The Production Planning section (Sprint 4) adds Bottling Queue, Active Ferments, and AI Cellar Tasks cards. The Multi-Vintage Comparison table (Sprint 5) provides a cross-vintage status view. The Tank Summary cards in *The Press* provide colour-coded fermentation status rings. The Fermentation Watch banner highlights tanks in active ferment.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a single-screen production dashboard with KPI cards, a production planning section, and a multi-vintage comparison table — a winery owner receives an instant production snapshot covering fermentation status, bottling queue, and cross-vintage volume without navigating between tabs.

---

### DR-20 · Reporting Burden

**Requirement:** The application must reduce the time required to generate compliance, production, and owner reports by providing structured data export and AI-assisted report generation.

**Current Ownology Coverage (v2):** The Export Log PDF button (Sprint 1) generates a LIP-compliant Winemaker's Log PDF for any selected tank and vintage period. The Vintage Card PDF (Sprint 3) generates an LLM-authored vintage summary from observation log data. The Milestone Calendar provides a print-formatted harvest schedule PDF. The Compliance AI generates narrative summaries when queried.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides three distinct report outputs — a LIP-compliant Winemaker's Log PDF, an LLM-authored Vintage Card PDF, and a printable Milestone Calendar — covering compliance, production, and customer-facing reporting without manual document assembly.

---

## Domain 8 — Small Winery Specific

### DR-21 · Owner Wearing Multiple Hats

**Requirement:** The application must be operable by a single person performing multiple roles simultaneously (winemaker, salesperson, marketer) without requiring dedicated IT support or complex configuration.

**Current Ownology Coverage (v2):** Ownology requires no installation, no IT configuration, and no dedicated administrator. The interface is designed for single-user operation from a mobile phone during harvest. The Compliance AI provides instant answers without requiring the user to navigate a manual or call a consultant. The PWA install prompt (Sprint 5) enables one-tap home-screen installation on mobile devices.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology is a zero-configuration, mobile-first tool that a single owner-winemaker can operate without IT support, enabling them to log cellar events, query regulations, and manage tasks from the same device they use for everything else — and install it on their phone in one tap.

---

### DR-22 · Manual Record Keeping

**Requirement:** The application must make digital record-keeping faster and less error-prone than paper, with a mobile-optimised entry interface that requires fewer taps than a spreadsheet row.

**Current Ownology Coverage (v2):** The Quick Entry page provides a streamlined mobile entry flow. The VintageEntrySheet uses a multi-step wizard with pre-populated dropdowns to minimise typing. The Tank Summary cards provide one-tap access to add an entry for a specific tank. The Sticky FAB button enables log entry from any screen. The Repeat Last Entry chip pre-fills all fields from the most recent entry. Voice-to-text dictation is available in the note field. Swipe-to-delete and pull-to-refresh are implemented for mobile ergonomics.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology's mobile-optimised entry wizard, one-tap tank shortcuts, repeat-last-entry chip, and voice dictation make digital logging faster than a paper log; the structured dropdowns reduce typing errors, and all entries are immediately searchable and filterable.

---

## Domain 9 — Home Winemaker Specific

### DR-23 · Equipment Knowledge

**Requirement:** The application must provide a complete, categorised equipment reference for home winemakers that is printable and trackable, covering all items required for a 23-litre batch.

**Current Ownology Coverage (v2):** The Home Winery Kit page (`/resources/home-winery-kit`) provides a 20-item categorised checklist with tick-off progress tracking and PDF export. The Cellar Tasks "Load Home Winery Kit" preset populates all items automatically. The PWA manifest (Sprint 5) enables the application to be installed on a home winemaker's phone for offline reference.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a complete, printable home winery equipment checklist with progress tracking and PDF export; a home winemaker can tick off items as they are purchased, export the list as a PDF shopping guide, and access it from their phone home screen via the installed PWA.

---

### DR-24 · Process Timeline

**Requirement:** The application must provide a day-by-day process timeline for home winemakers, covering the key steps from inoculation to bottling, with due-date indicators based on the actual inoculation date.

**Current Ownology Coverage (v2):** The KitWineTracker component in *The Press* provides an 8-step day-by-day checklist (bentonite Day 1 → bottling Day 270) with due-date indicators calculated from the logged inoculation date. The Milestone Calendar projects the full timeline for Kit Wine variety tanks with overdue, due, and upcoming step indicators.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology's Kit Wine Tracker automatically calculates step due dates from the logged inoculation date and displays overdue, due, and upcoming steps in a persistent checklist that survives page refreshes.

---

### DR-25 · Sanitation and Contamination (Home)

**Requirement:** The application must provide plain-English sanitation protocols for home winemaking equipment and a reference for identifying and treating contamination when it occurs.

**Current Ownology Coverage (v2):** The Compliance AI HOME_WINEMAKER_KB includes sanitation protocols for 16 home winemaking items. The Troubleshooting Guide (`/for-home-winemakers/troubleshooting`) covers Brett, VA, and oxidation with causes, remedies, and prevention. The Cellar Tasks preset includes all home winery equipment with cleaning categories.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides equipment-specific sanitation protocols via the Compliance AI and a searchable troubleshooting guide covering the most common home winemaking contamination faults.

---

### DR-26 · Measurement Interpretation (Home)

**Requirement:** The application must help home winemakers take and interpret hydrometer readings, understand what the numbers mean, and know what action to take based on the result.

**Current Ownology Coverage (v2):** The Compliance AI can be queried with specific SG readings and will provide interpretation and action guidance. The Inline AI Interpretation feature (Sprint 1) provides a one-tap LLM interpretation of any measurement log entry in context of variety and days since inoculation. The Glossary defines Brix, SG, specific gravity, and related terms. The Troubleshooting Guide covers stuck fermentation with remedies.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology enables a home winemaker to enter their SG reading into the Compliance AI or log it in the Vintage Log and receive a plain-English interpretation with recommended next steps; the Glossary and Troubleshooting Guide provide supporting reference material.

---

### DR-27 · Achieving Clarity Before Bottling

**Requirement:** The application must guide home winemakers through the fining and clarification process, including the correct sequence, timing, and products to use.

**Current Ownology Coverage (v2):** The KitWineTracker includes fining agent steps (kieselsol Day 30, clarity check Day 35) with descriptions. The Compliance AI HOME_WINEMAKER_KB covers fining protocols. The Troubleshooting Guide covers persistent cloudiness with causes and remedies. The Glossary defines kieselsol, chitosan, bentonite, and fining.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology guides home winemakers through the fining sequence with day-specific checklist steps, AI-guided protocol queries, and a troubleshooting reference for persistent haze.

---

## Coverage Summary — v2

| Domain | DRs | Full | Partial | Gap | v1 Full | Change |
|---|---|---|---|---|---|---|
| Production & Winemaking | DR-01 to DR-04 | 2 | 2 | 0 | 0 | +2 |
| Vineyard | DR-05 to DR-07 | 2 | 1 | 0 | 0 | +2 |
| Cellar Operations | DR-08 to DR-10 | 2 | 1 | 0 | 1 | +1 |
| Compliance & Traceability | DR-11 to DR-12 | 1 | 1 | 0 | 0 | +1 |
| Inventory & Supply Chain | DR-13 to DR-14 | 2 | 0 | 0 | 0 | +2 |
| Business & Commercial | DR-15 to DR-17 | 3 | 0 | 0 | 0 | +3 |
| Data & Technology | DR-18 to DR-20 | 3 | 0 | 0 | 1 | +2 |
| Small Winery Specific | DR-21 to DR-22 | 2 | 0 | 0 | 2 | 0 |
| Home Winemaker Specific | DR-23 to DR-27 | 5 | 0 | 0 | 5 | 0 |
| **Total** | **27** | **22 (81%)** | **5 (19%)** | **0 (0%)** | **9 (33%)** | **+13** |

**v1 → v2 movement:** 13 requirements upgraded from Partial to Full. No requirements remain at Gap. Five Partial requirements remain, all with clear next-build actions identified below.

---

## Remaining Partial Requirements — Priority Gap Closure Roadmap

The following five requirements represent the highest-value next build targets for Sprint 6 and beyond. They are ordered by impact on the core commercial winery audience.

| Priority | Requirement | Remaining Gap | Suggested Feature |
|---|---|---|---|
| 1 | DR-04 · Inventory Visibility | No live per-tank volume field that updates on racking events | Tank volume balance: auto-decrement source tank, auto-increment destination tank on each Racking log entry |
| 2 | DR-03 · Contamination Risk | No formal sanitation log entry type in the Vintage Log linked to a tank ID | Add "Sanitation" event type to VintageEntrySheet with fields: equipment cleaned, sanitant used, contact time |
| 3 | DR-11 · Regulatory Compliance | No automated export documentation generation | Export document generator: pre-filled AWBC movement advice and label compliance checklist from batch data |
| 4 | DR-06 · Disease & Pest Management | No structured disease/pest event type in Vineyard observation log | Add disease/pest event type to Vineyard block observations: pathogen, affected area, treatment, re-entry interval |
| 5 | DR-10 · Equipment Downtime | No dedicated fault log with downtime duration and resolution fields | Add "Fault" task type to Cellar Tasks with fault description, resolution, and downtime duration fields |

---

*This document is maintained in `/references/design-requirements-repository.md` and should be reviewed and updated at the start of each development sprint. Coverage ratings must be re-assessed whenever a new feature is shipped.*
