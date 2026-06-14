# Ownology — Design Requirements Repository

**Version:** 1.0  
**Date:** June 2026  
**Purpose:** This document establishes the canonical set of design requirements for the Ownology platform, derived from the 20 documented winery and home winemaker pain-point categories. Each requirement is stated as a measurable design intent, mapped to the current state of the application, and assigned a coverage rating. This repository is the reference against which all future feature work and design decisions are measured.

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

**Current Ownology Coverage:** The Vintage Log in *The Press* (`/the-press`) captures six event types — Addition, Measurement, Racking, Inoculation, Observation, and Other — with structured fields for quantity, unit, timing, and free-text notes. The Compliance AI (`/compliance`) can be queried against the accumulated knowledge base for guidance on fermentation issues including stuck ferments, volatile acidity, and sulphur off-aromas. The Batch Book tab records variety, GI, grower, and vintage metadata per lot.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a structured, searchable cellar log that documents every quality-affecting decision per tank; the remaining gap is a direct link from a logged measurement to an AI-generated interpretation (e.g., "your Brix reading of 4.2 with a stalled SG suggests a stuck ferment — here is the protocol"), which is the next feature to build.

---

### DR-02 · Fermentation Monitoring

**Requirement:** The application must provide a real-time or near-real-time view of active fermentation tanks, surfacing the key parameters (temperature, Brix/SG, pH, days since inoculation) that indicate whether fermentation is progressing normally.

**Current Ownology Coverage:** The Fermentation Watch banner in *The Press* automatically identifies tanks with an inoculation event logged within the past 14 days and displays days-since-inoculation alongside variety. The Tank Summary cards show last-event type and date. Measurements (Brix, SG, pH, temperature, free SO₂, YAN, TA, VA) are captured as structured log entries. The Milestone Calendar projects the expected fermentation window based on inoculation date and variety.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology surfaces active fermentation tanks with a day-count banner and structured measurement logging; the gap is automated alerting when a measurement is overdue or outside a target range, which requires the Reminders & Alarms feature (planned).

---

### DR-03 · Contamination Risk

**Requirement:** The application must provide sanitation protocols for all cellar equipment and support the logging of cleaning events so that contamination risk is documented and traceable.

**Current Ownology Coverage:** Cellar Tasks (`/cellar-tasks`) provides a task tracker with equipment-specific cleaning and sanitisation protocols. The "Load Home Winery Kit" preset populates 20 equipment items with categories. The Compliance AI includes a HOME_WINEMAKER_KB section with cleaning protocols for 16 specific items (Big Mouth Bubbler, carboy, auto siphon, corker, etc.). The Troubleshooting Guide (`/for-home-winemakers/troubleshooting`) covers Brett and contamination causes and remedies.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides AI-guided sanitation protocols and a task tracker for equipment cleaning; the gap for commercial wineries is a formal sanitation log linked to specific tank or barrel IDs, which would close the traceability loop from cleaning event to wine lot.

---

### DR-04 · Inventory Visibility

**Requirement:** The application must allow a winery to answer, at any time, which tanks contain wine, what additives have been used, and which lots are approaching bottling readiness.

**Current Ownology Coverage:** The Tank Summary cards in *The Press* show per-tank addition counts, last-event type, and days since inoculation. The Batch Book records lot-level metadata. The Milestone Calendar projects bottling windows. The Compliance AI can be queried for inventory-related questions.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a tank-level summary view and projected bottling windows; the gap is a formal inventory volume field (litres per tank) and a barrel topping tracker, which are the next inventory features to build.

---

## Domain 2 — Vineyard-Related Challenges

### DR-05 · Weather Uncertainty

**Requirement:** The application must acknowledge weather as a primary vintage risk factor and provide a mechanism for winemakers to log weather-related observations and their impact on decisions.

**Current Ownology Coverage:** The Observation event type in the Vintage Log supports free-text sensory and environmental notes. The Compliance AI can be queried on weather-related topics (smoke taint, frost impact, heat wave protocols). The Milestone Calendar's harvest timing projections implicitly account for weather-driven vintage variation.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology supports weather-related observation logging and AI-guided queries on weather impacts; the gap is a structured weather-event field (type, date, severity) linked to a tank or block, which would enable retrospective analysis of weather-to-quality correlations.

---

### DR-06 · Disease & Pest Management

**Requirement:** The application must provide a reference resource for common vineyard diseases and pests, enabling a winemaker to log disease-related observations and query for management options.

**Current Ownology Coverage:** The Compliance AI knowledge base covers vineyard disease topics. The Observation event type supports free-text disease notes. The Regulations page (`/regulations`) covers relevant Australian regulatory requirements.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology supports disease-related queries via the Compliance AI and free-text observation logging; the gap is a structured vineyard block log with disease/pest event types, which is a planned vineyard module.

---

### DR-07 · Harvest Timing

**Requirement:** The application must support the winemaker in documenting harvest timing decisions, including the Brix, acid, and phenolic ripeness readings that drove the decision, so that the rationale is preserved for future vintages.

**Current Ownology Coverage:** The Vintage Log captures Brix and Measurement events with values and units. The Inoculation event records the harvest date implicitly. The Compliance AI can be queried for harvest timing guidance. The Milestone Calendar uses inoculation date as the harvest anchor.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology captures the key measurements that inform harvest timing decisions; the gap is a dedicated pre-harvest sampling log (block, date, Brix, TA, pH, phenolic assessment) that precedes the inoculation event and provides a complete decision trail.

---

## Domain 3 — Cellar Operations

### DR-08 · Tank and Barrel Management

**Requirement:** The application must provide a per-vessel record showing occupancy, wine movement history, cleaning schedule, and current wine status, accessible without requiring paper records or whiteboards.

**Current Ownology Coverage:** The Tank Summary cards in *The Press* show per-tank event history, addition counts, and days since inoculation. Racking events capture source, destination, volume, and lees status. The Cellar Tasks tracker manages cleaning schedules per equipment item. The vessel type field in VintageEntrySheet records whether a vessel is a Tank, Carboy, Barrel, or Demijohn.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a digital tank record with movement history and cleaning task tracking; the gap is a barrel-specific sub-module tracking barrel age, fill history, and topping schedule, which is the next cellar operations feature.

---

### DR-09 · Labor Shortages

**Requirement:** The application must reduce the cognitive and administrative burden on winery staff by making cellar knowledge instantly accessible, reducing the time spent searching for protocols, calculations, or regulatory information.

**Current Ownology Coverage:** This is the primary value proposition of Ownology. The Compliance AI (`/compliance`) provides instant, document-grounded answers to cellar questions from a mobile phone. The Quick Entry page (`/quick-entry`) enables rapid log entries without navigating the full interface. The Cellar Tasks tracker reduces the need for verbal handover of cleaning protocols.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology directly addresses labour burden by providing instant AI-guided cellar knowledge, rapid mobile entry, and protocol automation — reducing the time a winemaker or cellar hand spends searching for answers during harvest.

---

### DR-10 · Equipment Downtime

**Requirement:** The application must provide a mechanism for logging equipment faults and maintenance events, so that downtime history is documented and patterns can be identified.

**Current Ownology Coverage:** The "Other" event type in the Vintage Log can capture equipment observations. The Cellar Tasks tracker records equipment-specific tasks. The Compliance AI can be queried for equipment troubleshooting guidance.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology supports equipment fault logging via the Vintage Log and Cellar Tasks; the gap is a dedicated equipment maintenance log with fault type, resolution, and downtime duration fields, which would enable pattern analysis across vintages.

---

## Domain 4 — Compliance & Traceability

### DR-11 · Regulatory Compliance

**Requirement:** The application must provide access to current Australian winery regulatory requirements (production records, lot traceability, label compliance, tax reporting, export documentation) and support the generation of compliant records.

**Current Ownology Coverage:** The Regulations page (`/regulations`) is a searchable reference library of Australian federal and state regulatory requirements. The Compliance AI (`/compliance`) is scoped to regulatory and practical winemaking guidance. The Batch Book generates LIP-compliant Winemaker's Log entries with vintage, variety, GI, and grower details. The Vintage Log provides the production record backbone.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a regulatory reference library, AI-guided compliance queries, and LIP-compliant batch records; the gap is automated export documentation generation (e.g., pre-filled AWBC export forms) and direct tax reporting integration.

---

### DR-12 · Traceability

**Requirement:** The application must enable end-to-end traceability from grape intake through fermentation lot, racking history, and bottling run, so that a quality issue can be traced to its source within minutes.

**Current Ownology Coverage:** The Vintage Log records the full event chain per tank (inoculation → additions → measurements → rackings → observations). The Batch Book links lot-level metadata (variety, GI, grower, vintage) to the log. Racking events capture source and destination vessels.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a per-tank event chain that supports forward and backward traceability; the gap is a formal lot-linking system that connects a bottling run ID back to the specific tank events and batch records, enabling a single-query audit trail.

---

## Domain 5 — Inventory & Supply Chain

### DR-13 · Packaging Material Shortages

**Requirement:** The application must support the winemaker in planning bottling runs by providing visibility of wine readiness alongside a mechanism to note packaging material availability.

**Current Ownology Coverage:** The Milestone Calendar projects bottling windows per tank. The Batch Book records lot readiness metadata. The Compliance AI can be queried for bottling readiness criteria.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology projects bottling windows and supports readiness queries; the gap is a packaging inventory tracker (bottles, corks, capsules, labels) linked to the bottling run planner, which would close the supply chain visibility loop.

---

### DR-14 · Cost Management

**Requirement:** The application must support cost awareness by enabling the logging of additions with quantities and units, so that input costs per tank can be estimated and compared across vintages.

**Current Ownology Coverage:** The Addition event type captures what was added, quantity, and unit. The Vintage Log provides a per-tank addition history. The Compliance AI can be queried for cost-effective alternatives to expensive additions.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology logs all additions with quantities, providing the raw data for cost-per-tank analysis; the gap is a cost-per-unit field on additions and a cost summary view, which would enable direct margin tracking within the application.

---

## Domain 6 — Business & Commercial

### DR-15 · Forecasting Demand

**Requirement:** The application must support production planning by providing a view of current inventory volumes, projected bottling dates, and historical vintage data that informs how much wine to produce and age.

**Current Ownology Coverage:** The Milestone Calendar provides projected timelines per tank. The Batch Book records vintage and variety metadata. Historical log data is retained per tank across vintages.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides vintage timeline projections and batch metadata; the gap is a production planning dashboard that aggregates volumes, projected release dates, and historical sell-through data to support demand forecasting.

---

### DR-16 · Direct-to-Consumer Sales

**Requirement:** The application must not duplicate existing DTC platforms but must provide a clear pathway for winemakers to connect cellar production data to their customer-facing story (wine club, tasting notes, vintage narrative).

**Current Ownology Coverage:** The Blog (`/blog`) and article pages provide a content channel for vintage narratives. The Compliance AI generates tasting note and vintage story content when queried. The Batch Book records the provenance data that underpins DTC storytelling.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides the production record and content channel that supports DTC storytelling; the gap is a direct export of batch and vintage data into a customer-facing format (e.g., a shareable vintage card or wine club update template).

---

### DR-17 · Inventory Aging

**Requirement:** The application must provide visibility of wine age per vessel (tank, barrel, warehouse) so that cash-flow pressure from aging inventory is visible to the winery owner.

**Current Ownology Coverage:** The Milestone Calendar shows projected timelines from inoculation to bottling. Days-since-inoculation is surfaced on Tank Summary cards. The Batch Book records vintage year.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology surfaces days-since-inoculation and projected bottling windows; the gap is a cash-flow view that converts aging inventory into estimated tied capital, which is a planned business intelligence feature.

---

## Domain 7 — Data & Technology

### DR-18 · Disconnected Systems

**Requirement:** The application must serve as a single point of truth for cellar data, replacing the need for parallel spreadsheets, paper logs, and disconnected software by providing a mobile-accessible, cloud-stored record.

**Current Ownology Coverage:** Ownology is a cloud-hosted web application accessible from any device. All log entries, batch records, and compliance queries are stored in a central database. The Quick Entry page (`/quick-entry`) is optimised for mobile use during harvest. The application replaces the whiteboard and paper log as the primary cellar record.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology is a cloud-hosted, mobile-accessible single record system that replaces paper logs and spreadsheets; winemakers can log, query, and retrieve any cellar event from any device without switching between systems.

---

### DR-19 · Poor Real-Time Visibility

**Requirement:** The application must provide an at-a-glance dashboard view of current fermentation status, tank utilisation, and production progress that requires no manual report generation.

**Current Ownology Coverage:** The Tank Summary cards in *The Press* provide an at-a-glance view of all active tanks with status colour rings (amber = active ferment, green = stable, grey = no inoculation). The Fermentation Watch banner highlights tanks in active ferment. The Milestone Calendar provides a timeline view of all tanks simultaneously.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides a real-time tank status view with colour-coded fermentation indicators; the gap is a single-screen production dashboard (tank utilisation %, total volume in ferment, bottling queue) that gives an owner an instant production snapshot without navigating between tabs.

---

### DR-20 · Reporting Burden

**Requirement:** The application must reduce the time required to generate compliance, production, and owner reports by providing structured data export and AI-assisted report generation.

**Current Ownology Coverage:** The Batch Book generates LIP-compliant Winemaker's Log entries. The Compliance AI can generate narrative summaries of cellar decisions when queried. The Vintage Log provides structured, exportable event data per tank.

**Coverage Rating:** **Partial**

**Assurance Statement:** Ownology provides structured batch records and AI-assisted narrative generation; the gap is a one-click report export (PDF or CSV) covering a selected tank or vintage period, which is the next reporting feature to build.

---

## Domain 8 — Small Winery Specific

### DR-21 · Owner Wearing Multiple Hats

**Requirement:** The application must be operable by a single person performing multiple roles simultaneously (winemaker, salesperson, marketer) without requiring dedicated IT support or complex configuration.

**Current Ownology Coverage:** Ownology requires no installation, no IT configuration, and no dedicated administrator. The interface is designed for single-user operation from a mobile phone during harvest. The Compliance AI provides instant answers without requiring the user to navigate a manual or call a consultant.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology is a zero-configuration, mobile-first tool that a single owner-winemaker can operate without IT support, enabling them to log cellar events, query regulations, and manage tasks from the same device they use for everything else.

---

### DR-22 · Manual Record Keeping

**Requirement:** The application must make digital record-keeping faster and less error-prone than paper, with a mobile-optimised entry interface that requires fewer taps than a spreadsheet row.

**Current Ownology Coverage:** The Quick Entry page (`/quick-entry`) provides a streamlined mobile entry flow. The VintageEntrySheet uses a multi-step wizard with pre-populated dropdowns (variety, event type, vessel type) to minimise typing. The Tank Summary cards provide one-tap access to add an entry for a specific tank.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology's mobile-optimised entry wizard and quick-add buttons make digital logging faster than a paper log; the structured dropdowns reduce typing errors, and all entries are immediately searchable and filterable.

---

## Domain 9 — Home Winemaker Specific

### DR-23 · Equipment Knowledge

**Requirement:** The application must provide a complete, categorised equipment reference for home winemakers that is printable and trackable, covering all items required for a 23-litre batch.

**Current Ownology Coverage:** The Home Winery Kit page (`/resources/home-winery-kit`) provides a 20-item categorised checklist with tick-off progress tracking and PDF export. The Cellar Tasks "Load Home Winery Kit" preset populates all items automatically.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides a complete, printable home winery equipment checklist with progress tracking; a home winemaker can tick off items as they are purchased and export the list as a PDF shopping guide.

---

### DR-24 · Process Timeline

**Requirement:** The application must provide a day-by-day process timeline for home winemakers, covering the key steps from inoculation to bottling, with due-date indicators based on the actual inoculation date.

**Current Ownology Coverage:** The KitWineTracker component in *The Press* provides an 8-step day-by-day checklist (bentonite Day 1 → bottling Day 270) with due-date indicators calculated from the logged inoculation date. The Milestone Calendar projects the full timeline for Kit Wine variety tanks.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology's Kit Wine Tracker automatically calculates step due dates from the logged inoculation date and displays overdue, due, and upcoming steps in a persistent checklist that survives page refreshes.

---

### DR-25 · Sanitation and Contamination (Home)

**Requirement:** The application must provide plain-English sanitation protocols for home winemaking equipment and a reference for identifying and treating contamination when it occurs.

**Current Ownology Coverage:** The Compliance AI HOME_WINEMAKER_KB includes sanitation protocols for 16 home winemaking items. The Troubleshooting Guide (`/for-home-winemakers/troubleshooting`) covers Brett, VA, and oxidation with causes, remedies, and prevention. The Cellar Tasks preset includes all home winery equipment with cleaning categories.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology provides equipment-specific sanitation protocols via the Compliance AI and a searchable troubleshooting guide covering the most common home winemaking contamination faults.

---

### DR-26 · Measurement Interpretation (Home)

**Requirement:** The application must help home winemakers take and interpret hydrometer readings, understand what the numbers mean, and know what action to take based on the result.

**Current Ownology Coverage:** The Compliance AI can be queried with specific SG readings and will provide interpretation and action guidance. The Glossary (`/for-home-winemakers/glossary`) defines Brix, SG, specific gravity, and related terms. The Troubleshooting Guide covers stuck fermentation (stalled SG) with remedies.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology enables a home winemaker to enter their SG reading into the Compliance AI and receive a plain-English interpretation with recommended next steps; the Glossary and Troubleshooting Guide provide supporting reference material.

---

### DR-27 · Achieving Clarity Before Bottling

**Requirement:** The application must guide home winemakers through the fining and clarification process, including the correct sequence, timing, and products to use.

**Current Ownology Coverage:** The KitWineTracker includes fining agent steps (kieselsol Day 30, clarity check Day 35) with descriptions. The Compliance AI HOME_WINEMAKER_KB covers fining protocols. The Troubleshooting Guide covers persistent cloudiness with causes and remedies. The Glossary defines kieselsol, chitosan, bentonite, and fining.

**Coverage Rating:** **Full**

**Assurance Statement:** Ownology guides home winemakers through the fining sequence with day-specific checklist steps, AI-guided protocol queries, and a troubleshooting reference for persistent haze.

---

## Coverage Summary

| Domain | Requirements | Full | Partial | Gap |
|---|---|---|---|---|
| Production & Winemaking | DR-01 to DR-04 | 0 | 4 | 0 |
| Vineyard | DR-05 to DR-07 | 0 | 3 | 0 |
| Cellar Operations | DR-08 to DR-10 | 1 | 2 | 0 |
| Compliance & Traceability | DR-11 to DR-12 | 0 | 2 | 0 |
| Inventory & Supply Chain | DR-13 to DR-14 | 0 | 2 | 0 |
| Business & Commercial | DR-15 to DR-17 | 0 | 3 | 0 |
| Data & Technology | DR-18 to DR-20 | 1 | 2 | 0 |
| Small Winery Specific | DR-21 to DR-22 | 2 | 0 | 0 |
| Home Winemaker Specific | DR-23 to DR-27 | 5 | 0 | 0 |
| **Total** | **27** | **9 (33%)** | **18 (67%)** | **0 (0%)** |

---

## Priority Gap Closure Roadmap

The following partial requirements represent the highest-value next build targets, ordered by impact on the core commercial winery audience:

| Priority | Requirement | Gap Description | Suggested Feature |
|---|---|---|---|
| 1 | DR-02 Fermentation Monitoring | No automated alerting for overdue or out-of-range measurements | Reminders & Alarms system (planned) |
| 2 | DR-19 Real-Time Visibility | No single-screen production dashboard | Production Dashboard page |
| 3 | DR-20 Reporting Burden | No one-click report export | PDF/CSV export for tank or vintage period |
| 4 | DR-12 Traceability | No formal lot-linking from bottling run to tank events | Lot Traceability module |
| 5 | DR-08 Tank & Barrel Management | No barrel-specific sub-module | Barrel Tracker (age, fill history, topping) |
| 6 | DR-01 Consistent Quality | No measurement-to-AI-interpretation link | Inline AI interpretation on measurement log entries |
| 7 | DR-04 Inventory Visibility | No volume field per tank | Tank volume field + barrel topping tracker |
| 8 | DR-11 Regulatory Compliance | No automated export documentation | Export document generator (AWBC forms) |

---

*This document is maintained in `/references/design-requirements-repository.md` and should be reviewed and updated at the start of each development sprint. Coverage ratings must be re-assessed whenever a new feature is shipped.*
