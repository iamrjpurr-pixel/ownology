# Ownology — Structured Test Run Plan
**Version:** 1.0 — Post Sprint 4  
**Date:** June 2026  
**Purpose:** Verify that every Design Requirement (DR-01 through DR-27) is demonstrably met in the live build. Each test case specifies the exact navigation path, the action to take, and the expected outcome. A pass/fail column is provided for recording results.

---

## How to Use This Document

1. Open the app at the dev URL (or click Preview in the Management UI).
2. Work through each test case in order.
3. Record **PASS**, **FAIL**, or **PARTIAL** in the Result column.
4. Note any issues in the Notes column.
5. Any FAIL or PARTIAL should be raised as a new todo item referencing the DR number.

> **Dev bypass is active:** All write operations work without signing in. The app acts as the Redstone Ridge Wines seed account. Mock data is pre-loaded.

---

## Domain 1 — Production & Winemaking

### DR-01 · Fermentation Monitoring & AI Interpretation

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 1.1 | Navigate to `/the-press` | Page loads, Log tab is active, Tank 1 entries visible | | |
| 1.2 | Filter by "Tank 1" using the tank filter | Log narrows to Tank 1 (Shiraz) entries only | | |
| 1.3 | Find any Measurement entry (Brix or SG reading) | Entry card shows measurement value, date, and a grey "Interpret" button | | |
| 1.4 | Click "Interpret" on a Brix measurement | Button shows loading spinner, then a 2–4 sentence AI interpretation appears inline below the entry | | |
| 1.5 | Interpretation text references the variety and fermentation stage | Text is contextually relevant (not generic) | | |

---

### DR-02 · Reminders & Alarms

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 2.1 | Navigate to `/the-press` | Tank summary cards visible at top | | |
| 2.2 | Click the bell icon (🔔) on any tank card | TankReminderSheet slides open | | |
| 2.3 | Set a reminder: event type = Measurement, interval = 48 hours | Reminder saved, confirmation shown | | |
| 2.4 | Reminder appears in the list on the sheet | Reminder row shows event type, interval, and last triggered date | | |
| 2.5 | Delete the reminder | Reminder removed from list | | |

---

### DR-03 · Cellar Operations Vessel Linkage

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 3.1 | Navigate to `/cellar-tasks` | Task list loads with seeded tasks visible | | |
| 3.2 | Find a task with a vessel badge (🛢 or 🪵) | Badge shows vessel ID next to the task title | | |
| 3.3 | Click "+ Add Task" (manual) | Task creation form opens | | |
| 3.4 | Fill in task name, select vessel type = Tank, enter vessel ID = "Tank 1" | Form accepts the vessel fields | | |
| 3.5 | Save the task | New task appears with vessel badge showing "Tank 1" | | |

---

### DR-04 · Volume Tracking

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 4.1 | Navigate to `/the-press` → Batch Book tab | Batch list loads; 4 seeded batches visible | | |
| 4.2 | Click "Edit" on the Shiraz batch (26SHZ-001) | Batch edit form opens | | |
| 4.3 | Volume Litres field is present and populated (3,500 L) | Field shows 3500 | | |
| 4.4 | Change volume to 3,800, save | Batch updates; volume shown in Batch Book | | |
| 4.5 | Navigate to `/dashboard` | KPI card "In Ferment" shows litres figure reflecting the updated volume | | |

---

### DR-05 · Weather Event Logging

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 5.1 | Navigate to `/the-press` → Log tab | Log visible | | |
| 5.2 | Click "+ New Entry" | VintageEntrySheet opens | | |
| 5.3 | Step 1: Enter tank name "Tank 1" | Accepted | | |
| 5.4 | Step 2: Select variety "Shiraz" | Accepted | | |
| 5.5 | Step 3: Select event type "Weather Event" | Weather Event option appears in the event type list | | |
| 5.6 | Step 4: Weather details form shows: event type dropdown (Frost/Heat Wave/Hail/Heavy Rain/Smoke/Other), date, severity (1–5), affected tanks, notes | All fields present | | |
| 5.7 | Fill in: Heat Wave, severity 4, notes "40°C day 3", save | Entry saved; appears in log with "Weather Event" label | | |

---

## Domain 2 — Vineyard

### DR-06 · Vineyard Block Log

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 6.1 | Navigate to `/vineyard` | Vineyard page loads with "Vineyard Blocks" section | | |
| 6.2 | Click "+ Add Block" | Block form opens: block name, variety, area (ha), row count, soil type, notes | | |
| 6.3 | Add a block: "Block A", Shiraz, 2.5 ha, 800 rows | Block saved and appears in the block register | | |
| 6.4 | Click on the block to expand | Block detail shows all fields | | |
| 6.5 | Click "+ Log Observation" on the block | Observation form opens: date, observation type, notes, Brix, TA, pH | | |
| 6.6 | Add observation: Pre-harvest, Brix 22.5, TA 6.2, pH 3.4 | Observation saved and listed under the block | | |

---

## Domain 3 — Cellar Operations

### DR-07 · Pre-Harvest Sampling

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 7.1 | Navigate to `/the-press` → Log tab → "+ New Entry" | VintageEntrySheet opens | | |
| 7.2 | Step 3: Select event type "Pre-Harvest Sample" | Option present in event type list | | |
| 7.3 | Step 4: Form shows: block name, sample date, Brix, TA, pH, YAN, phenolic assessment dropdown, notes | All fields present | | |
| 7.4 | Fill in: Block A, Brix 23.1, TA 6.0, pH 3.35, phenolics = Ripe, save | Entry saved with "Pre-Harvest Sample" label in log | | |

---

### DR-08 · Barrel Sub-Module

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 8.1 | Navigate to `/the-press` → Barrels tab | Barrels tab loads; 8 seeded barrels visible | | |
| 8.2 | Barrel list shows: barrel ID, oak type, format, age, fill date, wine lot, last topped | All columns present | | |
| 8.3 | Click "+ Add Barrel" | Barrel form opens with all fields | | |
| 8.4 | Add barrel: B-009, French oak, 225L barrique, 2 years old, fill date today, wine lot 26SHZ-001 | Barrel saved and appears in list | | |
| 8.5 | Check overdue topping indicator | Barrels with last topped > 14 days show amber/red indicator | | |

---

## Domain 4 — Compliance & Traceability

### DR-09 · Regulatory Compliance AI

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 9.1 | Navigate to `/compliance` | Compliance page loads with state filter and question input | | |
| 9.2 | Select state filter "SA" | Filter applied | | |
| 9.3 | Ask: "What are the sulphur dioxide limits for red wine under SA regulations?" | AI responds with a specific, cited answer | | |
| 9.4 | Response includes source citations | Citation badges appear below the response | | |
| 9.5 | Copy button on the response | Clicking copy copies the text to clipboard | | |

---

### DR-10 · Equipment Maintenance

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 10.1 | Navigate to `/cellar-tasks` | Task list loads | | |
| 10.2 | Find a task with type "maintain" (e.g. Destemmer Service) | Task visible with maintain badge | | |
| 10.3 | Click "Generate AI Tasks" for a tank | AI generates tasks including a maintenance task | | |
| 10.4 | Equipment Register section shows seeded equipment | 10 equipment items visible | | |
| 10.5 | Click "+ Add Equipment" | Equipment form opens and saves successfully | | |

---

### DR-11 · Regulatory Export (LIP)

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 11.1 | Navigate to `/the-press` → Log tab | Log visible | | |
| 11.2 | Filter to Tank 1 | Tank 1 entries shown | | |
| 11.3 | Click "Export Log PDF" button (above the log list) | Print dialog opens with a formatted Winemaker's Log | | |
| 11.4 | PDF includes: winery name, tank name, variety, GI, date, event type, detail, note columns | All LIP fields present | | |
| 11.5 | Addition entries show product name and quantity | Additions formatted correctly | | |

---

### DR-12 · Lot Traceability

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 12.1 | Navigate to `/the-press` → Batch Book tab | Batch list loads | | |
| 12.2 | Scroll down to "Lot Traceability" section | Section visible below batch notes | | |
| 12.3 | Lot Traceability shows the bottling run entry (26SHZ-001-BTL-A) | Bottling run row shows lot number, date, volume, format | | |
| 12.4 | Row links back to the parent batch (26SHZ-001) | Batch name and variety shown in the row | | |
| 12.5 | Log a new Bottling Run via "+ New Entry" | New bottling run appears in Lot Traceability | | |

---

## Domain 5 — Inventory & Supply Chain

### DR-13 · Packaging Inventory

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 13.1 | Navigate to `/the-press` → Packaging tab | Packaging Inventory tab loads | | |
| 13.2 | Click "+ Add Item" | Form opens: item name, category, quantity on hand, unit, reorder level | | |
| 13.3 | Add: Bordeaux Bottle 750mL, category Bottles, qty 5000, reorder at 1000 | Item saved and appears in list | | |
| 13.4 | Add another item below reorder level (qty 200, reorder 500) | Item shows "Low Stock" warning badge | | |
| 13.5 | Edit quantity on existing item | Quantity updates correctly | | |

---

### DR-14 · Addition Cost Tracking

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 14.1 | Navigate to `/the-press` → Log tab → "+ New Entry" | VintageEntrySheet opens | | |
| 14.2 | Step 3: Select event type "Addition" | Addition selected | | |
| 14.3 | Step 4: Addition form shows: product name, quantity, unit, rate, cost per unit, currency | Cost per unit and currency fields present | | |
| 14.4 | Fill in: SO₂, 50g, cost $0.85/g, AUD | Entry saves with cost data in details JSON | | |
| 14.5 | Entry appears in log with addition label | Cost data visible in entry detail | | |

---

## Domain 6 — Business & Commercial

### DR-15 · Production Planning

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 15.1 | Navigate to `/dashboard` | Production Dashboard loads | | |
| 15.2 | Scroll to "Production Planning" section | Section visible with 3 cards | | |
| 15.3 | "Bottling Queue" card shows count of tanks 60–120 days post-inoculation | Number shown | | |
| 15.4 | "Active Ferments" card shows count of tanks ≤14 days post-inoculation | Number shown | | |
| 15.5 | "Task Planner" card links to `/cellar-tasks` | Link works | | |

---

### DR-16 · Vintage Card PDF

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 16.1 | Navigate to `/the-press` → Batch Book tab | Batch list loads | | |
| 16.2 | Scroll to "Generate Vintage Card" section | VintageCardPDF component visible | | |
| 16.3 | Select batch "26SHZ-001 — Shiraz" from dropdown | Batch selected | | |
| 16.4 | Click "Generate Vintage Card" | Loading state shown, then LLM-generated tasting note appears | | |
| 16.5 | Click "Print Vintage Card" | Print dialog opens with a formatted one-page vintage card | | |
| 16.6 | Card includes: winery name, variety, vintage year, GI, key measurements, tasting note | All fields present | | |

---

### DR-17 · Cellar Value

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 17.1 | Navigate to `/dashboard` | Dashboard loads | | |
| 17.2 | Scroll to "Cellar Value Estimate" section | Section visible (only shown when volume data exists) | | |
| 17.3 | "Volume in Cellar" shows total litres in active ferment | Correct figure from seeded data | | |
| 17.4 | "Est. Bottles" shows calculated bottle count at 85% fill efficiency | Correct calculation | | |
| 17.5 | "Tied Capital Range" shows $8–$25/L estimate range | Range displayed with disclaimer | | |

---

## Domain 7 — Data & Technology

### DR-18 · Mobile Usability

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 18.1 | Open the app on a mobile device (or resize browser to 375px) | All pages render without horizontal scroll | | |
| 18.2 | Navigate to `/the-press` on mobile | Tab bar scrolls horizontally, all tabs accessible | | |
| 18.3 | Open VintageEntrySheet on mobile | Sheet slides up from bottom, all steps usable | | |
| 18.4 | Open `/compliance` on mobile | Question input and response area are full-width | | |
| 18.5 | Hamburger menu opens and closes correctly | All nav links accessible | | |

---

### DR-19 · Production Dashboard

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 19.1 | Navigate to `/dashboard` | Dashboard loads without login | | |
| 19.2 | KPI grid shows: Active Tanks, In Ferment, Approaching Bottling, Log Entries | All 4 KPI cards present with numbers | | |
| 19.3 | Tank Status table shows all 4 seeded tanks with status, days, last event, volume | All rows present | | |
| 19.4 | Quick Access cards link to The Press, Cellar Tasks, Compliance, Batch Book | All links work | | |
| 19.5 | Dashboard auto-refreshes every 60 seconds (check browser network tab) | Periodic refetch visible | | |

---

### DR-20 · Export & Reporting

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 20.1 | Navigate to `/the-press` → Log tab | Log visible | | |
| 20.2 | "Export Log PDF" button visible above log list | Button present | | |
| 20.3 | Click Export Log PDF with no filter active | Print dialog opens with all entries | | |
| 20.4 | Apply tank filter "Tank 1", then click Export | PDF contains only Tank 1 entries | | |
| 20.5 | PDF is formatted as a table with headers | Professional table layout, not raw text | | |

---

## Domain 8 — Small Winery Specific

### DR-21 · Boutique Winery Positioning

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 21.1 | Navigate to `/` (home page) | Hero copy references boutique/small winery context | | |
| 21.2 | Navigate to `/why-ownology` | Comparison page positions Ownology vs enterprise tools | | |
| 21.3 | Navigate to `/pricing` | Pricing tiers are accessible to small operations (free tier present) | | |

---

### DR-22 · Simplified Onboarding

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 22.1 | Navigate to `/quick-entry` | Quick Entry page loads | | |
| 22.2 | Form allows entering a tank name, variety, event type, and note in one step | Single-screen entry form | | |
| 22.3 | Submit a quick entry | Entry saved and confirmation shown | | |

---

### DR-23 · Offline-Capable Design

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 23.1 | Navigate to `/the-press` while online | Page loads and data is visible | | |
| 23.2 | Note: Full offline capability (service worker) is a future sprint item | Partial — pages load from browser cache if previously visited | | |

---

## Domain 9 — Home Winemaker Specific

### DR-24 · Home Winemaker Entry Point

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 24.1 | Navigate to `/for-home-winemakers` | Dedicated landing page loads | | |
| 24.2 | Page includes: hero, feature grid, sample questions, resource links | All sections present | | |
| 24.3 | "Ask Ownology" CTA links to Compliance with HomeWinemaker filter | CTA works | | |

---

### DR-25 · Kit Wine Tracker

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 25.1 | Navigate to `/the-press` → Log tab | Log visible | | |
| 25.2 | Filter to "Tank 4" (Kit Wine tank in seeded data) | Tank 4 entries visible | | |
| 25.3 | Kit Wine Tracker checklist appears below the tank summary | Checklist with 8 steps visible | | |
| 25.4 | Checklist shows correct step as active based on days since inoculation | Current step highlighted | | |
| 25.5 | Check off a step | Checkbox state persists (localStorage) | | |

---

### DR-26 · Home Winemaker Troubleshooting

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 26.1 | Navigate to `/for-home-winemakers/troubleshooting` | Troubleshooting page loads | | |
| 26.2 | 8 fault accordion items visible | All faults listed | | |
| 26.3 | Search for "stuck" | Stuck Fermentation accordion highlighted | | |
| 26.4 | Expand Stuck Fermentation | Shows causes and fixes | | |

---

### DR-27 · Home Winemaker Glossary

| # | Step | Expected Result | Result | Notes |
|---|---|---|---|---|
| 27.1 | Navigate to `/for-home-winemakers/glossary` | Glossary page loads | | |
| 27.2 | 50+ terms visible | Full term list present | | |
| 27.3 | Type "Brix" in search | Brix definition highlighted | | |
| 27.4 | Click letter filter "M" | Only M-terms shown | | |

---

## Summary Scorecard

| Domain | DRs | Tests | Expected Pass |
|---|---|---|---|
| Production & Winemaking | DR-01 to DR-05 | 25 | All |
| Vineyard | DR-06 | 6 | All |
| Cellar Operations | DR-07 to DR-08 | 10 | All |
| Compliance & Traceability | DR-09 to DR-12 | 20 | All |
| Inventory & Supply Chain | DR-13 to DR-14 | 10 | All |
| Business & Commercial | DR-15 to DR-17 | 15 | All |
| Data & Technology | DR-18 to DR-20 | 15 | All |
| Small Winery Specific | DR-21 to DR-23 | 7 | DR-23 Partial |
| Home Winemaker Specific | DR-24 to DR-27 | 20 | All |
| **Total** | **27** | **128** | **127 Full, 1 Partial** |

---

## Known Limitations (Pre-Launch)

| Item | Detail | Resolution |
|---|---|---|
| DR-23 Offline | Service worker / PWA not yet implemented | Sprint 5 candidate |
| DR-17 Cost per litre | Cellar Value uses industry estimate range, not user-entered cost | User can enter actual cost in Batch Book notes; formula update is Sprint 5 |
| DR-15 Vintage comparison | Planning section shows current vintage only; multi-vintage comparison deferred | Sprint 5 candidate |
| Dev bypass active | All writes work without login — remove before launch | Delete dev bypass in `server/_core/trpc.ts` before publishing |

---

*Test Run Plan v1.0 — Ownology · Generated post Sprint 4 · All 27 DRs covered*
