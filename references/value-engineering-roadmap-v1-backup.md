# Ownology — Value Engineering Roadmap to Full Requirements Compliance

**Version:** 1.0  
**Date:** June 2026  
**Status:** Active build plan  
**Reference:** Design Requirements Repository v1.0 (`references/design-requirements-repository.md`)

---

## Executive Summary

Ownology currently satisfies **9 of 27 design requirements in full** and **18 partially**. Zero requirements are entirely unaddressed. This means the platform has a complete structural foundation — every domain is touched — and the remaining work is depth, not breadth. That is the most cost-effective position to be in.

This roadmap sequences the 18 partial requirements into **four build sprints**, ordered strictly by the ratio of **user-visible impact to engineering effort**. Each sprint is self-contained: it can be built, shipped, and measured before the next sprint begins. No sprint depends on external data, third-party integrations, or decisions that require your input. Every item can be built autonomously by the AI agent.

The governing principle throughout is **value engineering**: do the most with the least. Where a single feature closes multiple requirements simultaneously, it is prioritised. Where a requirement can be closed by extending an existing component rather than building a new one, that path is always taken.

---

## Effort and Impact Scoring

Each gap is scored on two axes:

**Impact (1–5):** How directly does closing this gap improve the daily experience of a paying commercial winery user? A score of 5 means the gap is visible and painful on day one of use. A score of 1 means it is a nice-to-have that a user might not notice for months.

**Effort (1–5):** How much new code is required? A score of 1 means the gap can be closed by extending an existing component with minimal new schema. A score of 5 means a new database table, new tRPC router, new page, and significant UI work are all required.

**Value Score = Impact ÷ Effort.** Higher is better. Sprints are ordered by the average value score of their constituent items.

| DR | Requirement Gap | Impact | Effort | Value Score |
|---|---|---|---|---|
| DR-01 | Inline AI interpretation on measurement log entries | 5 | 2 | **2.50** |
| DR-02 | Reminders & Alarms for overdue measurements | 5 | 3 | **1.67** |
| DR-19 | Production dashboard (tank utilisation, ferment count, bottling queue) | 5 | 2 | **2.50** |
| DR-20 | One-click PDF/CSV export for a tank or vintage period | 5 | 2 | **2.50** |
| DR-04 | Tank volume field + barrel topping tracker | 4 | 2 | **2.00** |
| DR-08 | Barrel sub-module (age, fill history, topping schedule) | 4 | 3 | **1.33** |
| DR-12 | Lot traceability: bottling run linked to tank events | 4 | 3 | **1.33** |
| DR-11 | Compliance: LIP-compliant Winemaker's Log PDF export | 4 | 2 | **2.00** |
| DR-03 | Sanitation log linked to tank/barrel IDs | 3 | 2 | **1.50** |
| DR-07 | Pre-harvest sampling log (block, Brix, TA, pH, phenolic) | 3 | 2 | **1.50** |
| DR-10 | Equipment maintenance log (fault type, resolution, downtime) | 3 | 2 | **1.50** |
| DR-14 | Cost-per-unit field on additions + cost summary view | 3 | 2 | **1.50** |
| DR-05 | Structured weather-event field linked to tank/block | 2 | 2 | **1.00** |
| DR-06 | Vineyard block log with disease/pest event types | 2 | 3 | **0.67** |
| DR-13 | Packaging inventory tracker (bottles, corks, capsules, labels) | 3 | 3 | **1.00** |
| DR-15 | Production planning dashboard (volumes, release dates, history) | 3 | 4 | **0.75** |
| DR-16 | Vintage card / wine club update export from Batch Book | 2 | 2 | **1.00** |
| DR-17 | Cash-flow view: aging inventory as tied capital estimate | 2 | 3 | **0.67** |

---

## Sprint Structure

The 18 partial requirements are grouped into four sprints. Each sprint is ordered so that the highest-value items are built first within the sprint. Total estimated build sessions across all four sprints: **12–16 AI agent sessions** of the type already completed on this project.

---

## Sprint 1 — Visibility & Intelligence Layer
**Theme:** Make the data already in the system work harder. No new schema required for most items. Closes DR-01, DR-19, DR-20, DR-04, DR-11.  
**Average Value Score: 2.30**  
**Estimated sessions: 3–4**

### S1-A · Production Dashboard (DR-19)

A new `/dashboard` page that aggregates across all tanks and presents the owner with a single-screen status view. The data is already in the database — this is purely a new read-only page that queries existing tRPC procedures.

The dashboard must display: total active tanks, count of tanks in active ferment (≤14 days since inoculation), count of tanks approaching bottling (within Milestone Calendar window), total addition events this vintage, and a compact tank status grid (one row per tank: name, variety, vessel type, days since inoculation, last event). No new database tables. No new tRPC procedures beyond a single aggregation query.

**Closes:** DR-19 (Full), contributes to DR-04.

---

### S1-B · Inline AI Interpretation on Measurement Entries (DR-01)

When a winemaker logs a Measurement event (Brix, SG, pH, temperature, free SO₂, TA, VA, YAN), the system should immediately call the LLM with the measurement value, the tank's variety, and the days-since-inoculation, and return a one-sentence interpretation displayed inline on the log entry card.

This requires: one new tRPC procedure (`vintageLog.interpretMeasurement`) that calls `invokeLLM` with a structured prompt, and a small UI addition to the log entry card that shows the interpretation beneath the measurement value. No schema change. The LLM call is cheap (single-sentence output).

**Closes:** DR-01 (Full).

---

### S1-C · One-Click Report Export (DR-20)

A "Export Log" button on The Press that generates a PDF of all log entries for a selected tank and vintage period. The PDF uses the existing `manus-md-to-pdf` pipeline server-side, formatted as a Winemaker's Production Log with the Batch Book metadata in the header.

This also closes DR-11 because the same export, when formatted with LIP-required fields (lot number, variety, GI, grower, additions with quantities and dates, racking history), constitutes a compliant Winemaker's Log under Australian regulations.

**Closes:** DR-20 (Full), DR-11 (Full — closes the export documentation gap).

---

### S1-D · Tank Volume Field (DR-04)

Add a `volumeLitres` field to the `vintage_batches` table (or the tank-level record). Surface it in the VintageEntrySheet and Tank Summary cards. This is a one-field schema change, one migration, and a small UI addition. It enables the Production Dashboard to show total litres in ferment and total litres approaching bottling.

**Closes:** DR-04 (Partial → near-Full; barrel topping tracker deferred to Sprint 2).

---

## Sprint 2 — Operational Depth
**Theme:** Add the structured logs that turn Ownology from a notebook into an operational system. Closes DR-02, DR-08, DR-03, DR-07, DR-10, DR-12.  
**Average Value Score: 1.47**  
**Estimated sessions: 4–5**

### S2-A · Reminders & Alarms (DR-02)

The highest-impact remaining feature for commercial winery users. A winemaker sets a measurement schedule per tank (e.g., "log Brix every 2 days during active ferment"). If the schedule is missed, a banner appears in The Press and a Heartbeat notification fires.

Implementation: a `tank_reminders` table (tank_id, event_type, interval_hours, last_triggered), a tRPC procedure to create/update reminders, a UI in The Press to set reminders per tank, and a Heartbeat handler that checks for overdue reminders daily and fires `notifyOwner`. This is the most complex item in Sprint 2 but the most commercially differentiating.

**Closes:** DR-02 (Full).

---

### S2-B · Barrel Sub-Module (DR-08)

A dedicated Barrel view within The Press (new tab alongside Log / Calc / Batches / Calendar). Each barrel record stores: barrel ID, oak type, age (years), fill date, last topped date, current wine lot, and notes. Topping events are logged with date and volume added.

Implementation: a `barrels` table, tRPC procedures for CRUD, and a new tab component. The vessel type field already captures "Barrel" in VintageEntrySheet, so barrel records can be linked to existing tank/lot records.

**Closes:** DR-08 (Full), contributes to DR-04 (barrel topping tracker).

---

### S2-C · Sanitation Log Linked to Vessel IDs (DR-03)

Extend the Cellar Tasks system to allow a task to be linked to a specific tank or barrel ID. When a cleaning task is completed, the completion record stores the vessel ID alongside the timestamp and completed-by field. This creates the traceability link from cleaning event to wine lot.

Implementation: add a `vessel_id` nullable field to the `cellar_tasks` table, a vessel selector in the task creation UI, and a filter in the task history view by vessel.

**Closes:** DR-03 (Full for commercial wineries).

---

### S2-D · Pre-Harvest Sampling Log (DR-07)

A new event type — "Pre-Harvest Sample" — in the Vintage Log, with structured fields: block name, sample date, Brix, TA, pH, and a phenolic assessment dropdown (unripe / developing / ripe / over-ripe). This event type appears before the Inoculation event in the tank timeline and provides the documented rationale for harvest timing.

Implementation: add "Pre-Harvest Sample" to the event type enum in the schema, add the structured fields to VintageEntrySheet for this event type, and render the fields in the log entry card.

**Closes:** DR-07 (Full).

---

### S2-E · Equipment Maintenance Log (DR-10)

Extend the Cellar Tasks system with a second task category: "Maintenance" (alongside the existing "Cleaning" category). Maintenance tasks have additional fields: fault type (dropdown: mechanical / electrical / seal / filter / other), resolution notes, and downtime duration (hours). A maintenance history tab on the equipment record shows the fault pattern over time.

Implementation: add `fault_type`, `resolution_notes`, and `downtime_hours` nullable fields to `cellar_tasks`, add the fields to the task creation UI when category is "Maintenance", and add a maintenance history view.

**Closes:** DR-10 (Full).

---

### S2-F · Lot Traceability: Bottling Run Linkage (DR-12)

A "Bottling Run" event type in the Vintage Log, with fields: bottling date, volume bottled (litres), bottle format (750ml / 375ml / 1.5L / other), lot number, and label name. When a Bottling Run event is logged, it creates a permanent link between the bottling lot number and all prior events on that tank. A "Trace Lot" query in The Press takes a lot number and returns the complete event chain.

Implementation: add "Bottling Run" to the event type enum, add the structured fields to VintageEntrySheet, add a lot number field to the batch record, and build a Trace Lot query UI.

**Closes:** DR-12 (Full).

---

## Sprint 3 — Commercial Intelligence
**Theme:** Add the cost, supply chain, and business intelligence features that make Ownology useful to the owner, not just the winemaker. Closes DR-14, DR-13, DR-05, DR-16.  
**Average Value Score: 1.13**  
**Estimated sessions: 3–4**

### S3-A · Cost-Per-Unit on Additions (DR-14)

Add an optional `costPerUnit` field to the Addition event type. The Tank Summary card and the Export Log report then show a total input cost per tank for the vintage. A cost comparison view across tanks and vintages is available on the Production Dashboard.

Implementation: add `cost_per_unit` and `cost_currency` nullable fields to the `vintage_log_entries` table, add the fields to the Addition step in VintageEntrySheet (optional, labelled "Cost tracking"), and add a cost summary section to the Production Dashboard.

**Closes:** DR-14 (Full).

---

### S3-B · Packaging Inventory Tracker (DR-13)

A simple inventory register for packaging materials: bottles, corks, capsules, labels, and cartons. Each item has a current stock quantity and a reorder threshold. When a Bottling Run event is logged (from Sprint 2), the system deducts from stock automatically. A low-stock warning appears on the Production Dashboard.

Implementation: a `packaging_inventory` table (item_type, quantity, unit, reorder_threshold), tRPC CRUD procedures, a Packaging tab on the Production Dashboard, and automatic deduction logic in the Bottling Run event handler.

**Closes:** DR-13 (Full).

---

### S3-C · Structured Weather Event Field (DR-05)

Add a "Weather Event" event type to the Vintage Log with structured fields: event type (frost / heat wave / hail / heavy rain / smoke / other), date, severity (low / medium / high), and affected blocks or tanks (multi-select from existing tank names). This replaces the current free-text observation workaround with a queryable, structured record.

Implementation: add "Weather Event" to the event type enum, add the structured fields to VintageEntrySheet, and add a weather event filter to the log entry list.

**Closes:** DR-05 (Full).

---

### S3-D · Vintage Card Export from Batch Book (DR-16)

A "Share Vintage" button on each Batch Book record that generates a one-page vintage card: variety, GI, grower, vintage year, key measurements (peak Brix, final SG, TA, pH), notable additions, and a tasting note generated by the LLM from the observation log entries. The card is exported as a PDF and can be shared directly with wine club members or used in DTC marketing.

Implementation: a new tRPC procedure that assembles the batch data and calls `invokeLLM` to generate a tasting note, then renders the card as a PDF using the server-side PDF pipeline.

**Closes:** DR-16 (Full).

---

## Sprint 4 — Strategic Completeness
**Theme:** Close the remaining requirements that are strategically important but lower in daily-use frequency. Closes DR-06, DR-15, DR-17.  
**Average Value Score: 0.69**  
**Estimated sessions: 2–3**

### S4-A · Vineyard Block Log (DR-06)

A new "Vineyard" section (accessible from the main nav) with a block register. Each block record stores: block name, variety, area (ha), row/vine count, and a log of disease/pest events (event type from a dropdown: powdery mildew / downy mildew / botrytis / leafroll virus / insect pressure / other, date, severity, treatment applied). Blocks link to tank records via the Pre-Harvest Sampling Log (Sprint 2).

Implementation: `vineyard_blocks` and `vineyard_events` tables, tRPC CRUD procedures, and a new Vineyard page.

**Closes:** DR-06 (Full).

---

### S4-B · Production Planning Dashboard (DR-15)

Extend the Production Dashboard (Sprint 1) with a planning tab that shows: projected bottling dates for all active tanks (from Milestone Calendar), estimated litres per tank at bottling (from volume field, Sprint 1), and a vintage comparison table (current vintage vs. prior vintages by variety and volume). This is a read-only aggregation of existing data — no new schema required.

**Closes:** DR-15 (Full).

---

### S4-C · Inventory Aging & Cash-Flow View (DR-17)

Add a "Cellar Value" section to the Production Dashboard that estimates tied capital. The user enters a cost-per-litre figure for their wine (or it is derived from the addition cost tracking in Sprint 3). The system then multiplies volume × cost-per-litre × days-aging to produce an estimated tied capital figure per tank and a total. This is a calculation view only — no new data is required beyond what Sprint 1 and Sprint 3 provide.

**Closes:** DR-17 (Full).

---

## Full Compliance Summary

Upon completion of all four sprints, the requirements coverage moves from 9 Full / 18 Partial / 0 Gap to **27 Full / 0 Partial / 0 Gap**.

| Sprint | Requirements Closed | New DB Tables | New Pages | Estimated Sessions |
|---|---|---|---|---|
| Sprint 1 — Visibility & Intelligence | DR-01, DR-04, DR-11, DR-19, DR-20 | 0–1 | 1 (Dashboard) | 3–4 |
| Sprint 2 — Operational Depth | DR-02, DR-03, DR-07, DR-08, DR-10, DR-12 | 3 (barrels, tank_reminders, packaging) | 1 (Barrel tab) | 4–5 |
| Sprint 3 — Commercial Intelligence | DR-05, DR-13, DR-14, DR-16 | 1 (packaging_inventory) | 0 (extensions only) | 3–4 |
| Sprint 4 — Strategic Completeness | DR-06, DR-15, DR-17 | 2 (vineyard_blocks, vineyard_events) | 1 (Vineyard) | 2–3 |
| **Total** | **18 requirements → Full** | **6–7 new tables** | **3 new pages** | **12–16 sessions** |

---

## Build Strategy: How to Do This Cost-Effectively

The following principles govern how each sprint should be executed to minimise wasted effort.

**Extend before building new.** Every Sprint 1 item is an extension of an existing component. The Production Dashboard queries existing procedures. The measurement interpretation adds one LLM call to an existing log entry. The export adds one server-side PDF render. No new tables are needed for Sprint 1. This means Sprint 1 can be completed in a single focused session with zero risk of breaking existing functionality.

**Schema changes are the only irreversible decisions.** Every new database table added in Sprints 2–4 must be designed correctly the first time because migrations are not easily reversed. The schema for each sprint is documented in the todo items below so that the agent can review it before writing any migration.

**The LLM is already paid for — use it more.** The inline measurement interpretation (S1-B) and the vintage card tasting note (S3-D) both use the existing `invokeLLM` helper at zero marginal infrastructure cost. Both are high-impact, low-effort features that make the product feel intelligent. Any time a gap can be closed by an LLM call rather than a new UI component, that path should be taken.

**Build the Production Dashboard first.** It is the single highest-leverage item in the roadmap. Once it exists, every subsequent feature has a natural home — cost summaries, packaging stock, aging value, and planning views all live there. Building it first means every subsequent sprint adds a panel to an existing page rather than creating a new navigation destination.

**Defer the vineyard module.** DR-06 (Vineyard Block Log) is the only requirement that creates a genuinely new product surface. It is important for completeness but not for the core cellar-use case. It belongs in Sprint 4, after everything else is proven.

---

## Immediate Next Action

Sprint 1 begins with the Production Dashboard. The agent should:

1. Create a `/dashboard` route in App.tsx.
2. Build a `ProductionDashboard.tsx` page that queries existing tRPC procedures for tank count, active ferment count, bottling queue, and total log entries.
3. Add a `volumeLitres` field to the batch schema and push the migration.
4. Add the `vintageLog.interpretMeasurement` tRPC procedure.
5. Add the Export Log button to The Press with server-side PDF generation.
6. Add the LIP-compliant Winemaker's Log format to the PDF export.

All six steps are buildable in a single session without any input from you.

---

*This roadmap is maintained in `references/value-engineering-roadmap.md`. It should be updated after each sprint to reflect completed items and revised estimates.*
