# Sprint 7 — Knowledge Platform Scope Document
## Ownology Winery Knowledge Management System
### Version 1.0 | June 2026

---

## Strategic Context

Sprints 1–6 built the **operational infrastructure**: logging, measurement, compliance, reminders, packaging, exports, and equipment management. Every DR is now fully met.

Sprint 7 builds the **knowledge layer** on top of that infrastructure. The goal is to transform Ownology from a record-keeping tool into a **living institutional memory** for the winery — capturing not just what was done, but why, by whom, and what was learned.

This is the feature that makes Ownology defensible against any competitor. Vintrace can track a batch. No one else captures the winemaker's reasoning.

---

## The Five Knowledge Layers

Every SOP in the Ownology Knowledge Platform has five layers:

| Layer | What it captures | Who writes it |
|---|---|---|
| **1. Procedure** | Step-by-step instructions | Platform (pre-written, editable) |
| **2. Decision Logic** | Why this approach was chosen | Winemaker |
| **3. Vintage Notes** | What happened, what worked, what failed | Winemaker (per vintage) |
| **4. Tribal Knowledge** | Equipment quirks, supplier preferences, site-specific practices | Winemaker / cellar team |
| **5. Training Record** | Who was trained, when, to what standard | Winemaker / cellar manager |

---

## Sprint 7 Feature Breakdown

### Feature 1: Knowledge Base — SOP Library

**Location:** New top-level nav item "Knowledge" (or accessible from the existing Free Run page)

**What it builds:**
- A structured library of 8 SOP categories, each containing 4–6 individual SOPs
- Each SOP has: procedure text (pre-written, editable), a Decision Logic note field, a Vintage Notes section (one entry per vintage year), and a Tribal Knowledge free-text field
- Category filter and keyword search
- Print-to-PDF button per SOP (for physical binder use in the cellar)
- "CSU Academic Reference" tag on each SOP linking to the relevant subject

**The 8 SOP Categories and their pre-written SOPs:**

| Category | SOPs Included | CSU Subject |
|---|---|---|
| Fermentation Management | Yeast selection criteria; YAN management; Temperature protocol; Cap management; Stuck ferment response | WSC202, WSC318 |
| Tank Cleaning & Sanitation | Pre-vintage CIP; Post-ferment tank clean; Barrel sanitation; Hose and pump sanitation | WSC318, WSC202 |
| Barrel Management | Topping schedule; Barrel inspection; Cooper selection criteria; Barrel retirement | WSC303, WSC317 |
| Bottling Procedures | Bottling line setup; Fill level and headspace; Closure selection; Label verification; Finished goods release | WSC303 |
| Laboratory Testing | Sampling procedure; pH and TA measurement; Brix/SG protocol; Free SO₂ by aspiration; YAN by NOPA/NOPA+HTST; VA by steam distillation | WSC319, WSC318 |
| Vintage Worker Onboarding | Site induction; Safety induction (CO₂, chemicals, confined space); Role-specific training (crusher, pump-over, lab); End-of-vintage debrief | AHT274, WSC202 |
| Food Safety & Compliance | HACCP critical control points; Allergen management; Traceability and lot coding; Corrective action procedure; Document control | AGR202, WSC319 |
| Traceability | Grape receival record; Addition record; Blending record; Packaging record; Export movement advice | WSC202, WSC303 |

**Database changes required:**
- New table: `sop_library` (id, category, title, procedure_text, decision_logic, tribal_knowledge, csu_subject_ref, created_at, updated_at)
- New table: `sop_vintage_notes` (id, sop_id, vintage_year, notes, what_worked, what_failed, created_at)
- New table: `sop_training_records` (id, sop_id, trainee_name, trained_by, trained_at, notes)

---

### Feature 2: Decision Logic Notes

**Location:** Attached to each SOP in the Knowledge Base

**What it builds:**
- A rich-text field on each SOP for the winemaker to record *why* they do things a particular way
- Prompted with example questions: "Why this yeast strain?", "Why this sanitant?", "Why this cooper?"
- Timestamped and attributed (shows who wrote it and when)
- Visible to all team members; editable only by the winemaker/admin

**This is the core differentiator.** It captures the institutional knowledge that walks out the door when a winemaker leaves.

---

### Feature 3: Vintage Lessons Log

**Location:** Attached to each SOP, and as a standalone section on the Dashboard

**What it builds:**
- Per-SOP vintage notes: one entry per vintage year with fields for "What worked", "What failed", "What to change next vintage"
- Linked to specific batches in the Vintage Log where relevant (optional batch tag)
- A "Vintage Debrief" view on the Dashboard: all lessons from a selected vintage year in one scrollable view
- Export as PDF for end-of-vintage review meetings

**Example entry:**
```
Vintage: 2024
SOP: Fermentation Management — Stuck Ferment Response
What worked: Early YAN supplementation at inoculation (200ppm target)
What failed: Tank 3 stuck at 4.2 Brix — ambient temp dropped to 12°C before we caught it
What to change: Set a temperature alarm at 14°C for all red ferments during cold snaps
Linked batch: Redstone Ridge Shiraz 2024 (Batch #RS-24-001)
```

---

### Feature 4: Training Records Module

**Location:** Accessible from each SOP and as a standalone "Training" section under Knowledge

**What it builds:**
- Create a training session: select SOP, date, trainer name
- Add trainees: name, role, completion status (Completed / In Progress / Not Started)
- Notes field: what was covered, any gaps identified
- Generate a Training Record PDF: winery name, SOP title, date, trainer, trainees, sign-off line
- Training history view per SOP: who has been trained, when, by whom
- Training history view per person: all SOPs a team member has been trained on

**Compliance value:** This is the record that demonstrates due diligence in a food safety audit or WorkSafe inspection.

---

### Feature 5: Free Run Education Integration

**Location:** Existing `/free-run` page, expanded

**What it builds:**
- Each Free Run lesson card gains a "Related SOP" link — clicking it opens the corresponding SOP in the Knowledge Base
- A new "CSU Wine Science" section in Free Run with 8 topic cards (one per CSU subject), each with:
  - Subject code and name
  - 3–5 key concepts from the publicly available syllabus
  - A "Learn More" link to the CSU handbook page
  - A "Related Ownology Features" list (e.g., WSC318 → Fermentation Watch, Measurement events, Sanitation log)
- The existing lesson cards are reorganised to match the 8 SOP categories

**This closes the loop:** a user reads a Free Run lesson, sees the related SOP, opens it, adds their decision logic, and trains their team. Learning → Procedure → Knowledge → Training.

---

### Feature 6: Tribal Knowledge Capture

**Location:** Attached to each SOP, and as a standalone "Notes" section per equipment item in Cellar Tasks

**What it builds:**
- A free-text "Tribal Knowledge" field on each SOP: "Things you need to know that aren't in any manual"
- Prompted with example categories: Equipment quirks, Preferred suppliers, Site-specific practices, Seasonal observations
- Per-equipment tribal knowledge in Cellar Tasks: each equipment item gets a "Notes" tab with a free-text field for quirks, calibration history, and preferred service contacts
- Searchable across all tribal knowledge entries

**Example entries:**
- "Press #2 runs 0.3 bar high — calibrate before every vintage. Last calibrated: March 2024 by John at Winery Services."
- "Tank 4 bottom valve sticks at 2 bar. Use the wooden mallet on the east side. Do NOT use the wrench."
- "For Shiraz, we prefer Lallemand Lalvin ICV D254 at 25g/hL. Contact: Sarah at Lallemand, 0412 xxx xxx."

---

## Technical Implementation Plan

### Database Schema Additions

```sql
-- SOP Library
CREATE TABLE sop_library (
  id INT PRIMARY KEY AUTO_INCREMENT,
  winery_id INT NOT NULL,
  category VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  procedure_text TEXT,
  decision_logic TEXT,
  tribal_knowledge TEXT,
  csu_subject_ref VARCHAR(50),
  is_template BOOLEAN DEFAULT TRUE,
  created_at BIGINT,
  updated_at BIGINT
);

-- Vintage Notes per SOP
CREATE TABLE sop_vintage_notes (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sop_id INT NOT NULL,
  vintage_year INT NOT NULL,
  what_worked TEXT,
  what_failed TEXT,
  what_to_change TEXT,
  linked_batch_id INT,
  created_by VARCHAR(255),
  created_at BIGINT
);

-- Training Records
CREATE TABLE sop_training_records (
  id INT PRIMARY KEY AUTO_INCREMENT,
  sop_id INT NOT NULL,
  trained_at BIGINT NOT NULL,
  trainer_name VARCHAR(255) NOT NULL,
  trainee_name VARCHAR(255) NOT NULL,
  trainee_role VARCHAR(100),
  status VARCHAR(50) DEFAULT 'completed',
  notes TEXT,
  created_at BIGINT
);
```

### New tRPC Procedures

- `knowledge.getSopLibrary` — list all SOPs with optional category filter
- `knowledge.getSopById` — get single SOP with all layers
- `knowledge.updateSopDecisionLogic` — update decision logic note
- `knowledge.updateSopTribalKnowledge` — update tribal knowledge note
- `knowledge.addVintageNote` — add a vintage lesson to an SOP
- `knowledge.getVintageNotes` — get all vintage notes for a vintage year (for debrief view)
- `knowledge.addTrainingRecord` — create a training record
- `knowledge.getTrainingRecords` — list training records for an SOP or person
- `knowledge.generateTrainingPdf` — generate training record PDF

### New Pages / Routes

- `/knowledge` — Knowledge Base home (category grid)
- `/knowledge/:category` — SOP list for a category
- `/knowledge/sop/:id` — Individual SOP with all five layers
- `/knowledge/training` — Training records overview
- `/knowledge/vintage-debrief` — Vintage debrief view (all lessons from a selected year)

### Seed Data

Pre-write the 8 × 4–6 SOP procedure texts as template content. These are marked `is_template: true` and can be edited by the winery. They are written from primary sources (Wine Australia technical notes, FSANZ standards, Safe Work Australia guides) and cross-referenced with CSU subject syllabi.

---

## Content Sources for SOP Pre-Writing

| Source | What it covers | Access |
|---|---|---|
| Wine Australia Technical Notes | Fermentation, additions, SO₂ management, oak, fining | wineaustralia.com — free, open access |
| FSANZ Standard 4.5.1 | Food safety, allergens, permitted additives | foodstandards.gov.au — free |
| Safe Work Australia WHS guides | Chemical handling, CO₂, confined space, manual handling | safeworkaustralia.gov.au — free |
| OIV Compendium of International Methods | Laboratory analysis methods (pH, TA, SO₂, VA) | oiv.int — free for method references |
| Lallemand Winemaking | Yeast selection, YAN management, MLF | lallemandwine.com — free tech notes |
| Scott Laboratories | Fining agents, filtration, additions | scottlaboratories.com — free tech notes |
| CSU Handbook (public) | Subject outlines only — not lecture content | handbook.csu.edu.au — free |

---

## Sprint 7 Acceptance Criteria

| Feature | Acceptance Criteria |
|---|---|
| SOP Library | 8 categories, 4–6 SOPs each, all with pre-written procedure text, editable, printable |
| Decision Logic | Each SOP has a decision logic field; winemaker can write and save notes |
| Vintage Lessons | Each SOP has a vintage notes section; debrief view shows all lessons for a selected year |
| Training Records | Training records can be created, listed, and exported as PDF |
| Free Run Integration | Each Free Run lesson links to its related SOP; CSU subject cards are present |
| Tribal Knowledge | Each SOP and each equipment item has a tribal knowledge field |
| Build Index | Sprint 7 section added with all 6 features listed as LIVE |

---

## What Sprint 7 Does NOT Build

To keep scope manageable:

- **No video hosting** — link to external video (YouTube, Vimeo) from the tribal knowledge field; do not host video files
- **No approval workflows** — SOPs are editable by the winemaker; no draft/review/approve cycle
- **No version history** — SOPs are live documents; no change tracking (this can be Sprint 8)
- **No multi-user permissions** — all authenticated users can view; only admin/winemaker can edit
- **No CSU content reproduction** — only public handbook information (subject codes, names, learning outcomes); no lecture notes, assessment content, or proprietary material

---

## Estimated Complexity

| Feature | Complexity | Estimated sessions |
|---|---|---|
| Database schema + tRPC procedures | Medium | 1 |
| SOP Library UI (category grid + SOP detail page) | Medium | 1–2 |
| Decision Logic + Tribal Knowledge fields | Low | 0.5 |
| Vintage Lessons + Debrief view | Medium | 1 |
| Training Records + PDF export | Medium | 1 |
| Free Run integration + CSU cards | Low | 0.5 |
| SOP content pre-writing (48 SOPs) | High | 2–3 |
| Build Index update | Low | 0.25 |

**Total estimated sessions: 7–9**

---

## The Pitch After Sprint 7

> "Ownology is the only winery platform where your SOPs, your winemaker's reasoning, your vintage lessons, and your training records all live in one place — connected to the batches that produced them, searchable across years, and printable for the cellar wall."

---

*Document version: 1.0 | Author: Ownology Product Team | Date: June 2026*
*Approved for Sprint 7 kickoff: pending*
