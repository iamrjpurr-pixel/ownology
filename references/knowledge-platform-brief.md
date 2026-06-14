# Ownology Knowledge Platform — Product Brief
## Version 1.0 | June 2026

---

## The Core Insight

Most winery software solves the wrong problem. It stores documents. It tracks inventory. It generates compliance reports. What it does not do is capture the one thing that actually determines wine quality year after year: **the winemaker's mind**.

Every boutique winery has SOPs. Very few capture the experience and reasoning behind them.

> "Why did we choose EC1118 for the 2023 Shiraz? Because the 2021 stuck at 4.2 Brix and cost us three weeks. That's not in any SOP — it's in someone's head."

When that person leaves, retires, or gets sick during harvest, the knowledge leaves with them. Ownology changes that.

---

## The Value Proposition

**Ownology is not a document repository. It is a winery knowledge management system.**

The distinction matters. A document repository stores what to do. Ownology captures:

| Layer | What it stores | Example |
|---|---|---|
| **Procedure** | What to do and in what order | Tank cleaning SOP: 7-step CIP procedure |
| **Decision logic** | Why you do it this way | "We use peracetic acid not caustic because our gaskets are EPDM" |
| **Vintage notes** | What happened and what you learned | "2024: MLF stuck in Tank 3 — ambient temp dropped to 12°C. Added Lalvin 31 and held at 18°C for 10 days." |
| **Tribal knowledge** | Site-specific quirks and preferences | "Press #2 runs 0.3 bar high — calibrate before every vintage" |
| **Training records** | Who was trained, when, and to what standard | "Jake completed Vintage Worker Induction — 14 June 2026" |

---

## The Eight High-Value SOP Categories

These are the procedures boutique wineries care about most — the ones that directly affect wine quality, compliance, and staff safety.

### 1. Fermentation Management
**Why it matters:** Fermentation is where wine is made or broken. A stuck ferment at harvest costs weeks and thousands of dollars.

**What Ownology captures:**
- Standard yeast selection criteria and rationale
- YAN targets by variety and style
- Temperature management protocols
- Cap management schedules (pump-over frequency, duration, timing)
- Troubleshooting decision trees (stuck ferment, H₂S, volatile acidity)
- Vintage-specific notes: what worked, what failed, why

**CSU academic backbone:** WSC202 Wine Production 1, WSC318 Wine Microbiology, WSC115 Wine Science 1

---

### 2. Tank Cleaning and Sanitation
**Why it matters:** Contamination events are silent until they are catastrophic. Consistent sanitation is the foundation of wine quality.

**What Ownology captures:**
- CIP (Clean-In-Place) procedures by tank type and previous contents
- Sanitant selection rationale (peracetic acid vs caustic vs SO₂)
- Contact time and concentration standards
- Pre-fill inspection checklist
- Equipment-specific quirks (e.g., valve types, dead legs)
- Sanitation event log (already built in Sprint 6 — DR-03)

**CSU academic backbone:** WSC318 Wine Microbiology, WSC202 Wine Production 1

---

### 3. Barrel Management
**Why it matters:** Barrels represent significant capital and directly shape wine character. Poor management leads to spoilage, oxidation, and financial loss.

**What Ownology captures:**
- Topping schedules by variety, style, and season
- Barrel inspection and maintenance procedures
- Preferred cooper rationale (why this toast level, why this forest)
- Vintage notes on barrel performance (which barrels contributed what)
- Barrel retirement criteria and decision logic
- Barrel inventory and age tracking (already built — Barrels tab)

**CSU academic backbone:** WSC303 Wine Production 2, WSC317 Wine Science 2

---

### 4. Bottling Procedures
**Why it matters:** Bottling is the last point of control before the wine leaves the winery. Errors here are irreversible.

**What Ownology captures:**
- Bottling line setup and pre-run checklist
- Fill level and headspace standards
- Closure selection rationale (screwcap vs cork — why, for which wines)
- Label verification procedure
- Dissolved oxygen targets and monitoring
- Finished goods release criteria
- Packaging event log (already built — Packaging tab)

**CSU academic backbone:** WSC303 Wine Production 2, WSC321 Winery Engineering

---

### 5. Laboratory Testing
**Why it matters:** Analytical data drives every winemaking decision. Inconsistent sampling or measurement protocols produce unreliable data.

**What Ownology captures:**
- Sampling procedures by event type (fermentation, post-MLF, pre-bottling)
- Measurement protocols: pH, TA, Brix/SG, free SO₂, molecular SO₂, VA, YAN
- Instrument calibration schedules and records
- Reference ranges by variety and style
- Corrective action triggers (what measurement result triggers what action)
- Lab record keeping and traceability

**CSU academic backbone:** WSC319 Wine Chemistry, WSC318 Wine Microbiology, CHM115/CHM107

---

### 6. Vintage Worker Onboarding
**Why it matters:** Seasonal workers are the hands of harvest. Poorly trained workers cause accidents, contamination, and quality failures.

**What Ownology captures:**
- Pre-vintage induction checklist (safety, hygiene, site orientation)
- Role-specific training guides (crusher operator, pump-over crew, lab assistant)
- Safety inductions: CO₂ awareness, chemical handling, confined space, forklift exclusion zones
- Site-specific rules and quirks
- Training completion records with date and sign-off
- Vintage debrief template (what to capture at end of vintage)

**CSU academic backbone:** AHT274 Industry Practice, WSC202 Wine Production 1

---

### 7. Food Safety and Compliance
**Why it matters:** FSANZ Standard 4.5.1 governs wine production. Non-compliance risks product recall, export suspension, and reputational damage.

**What Ownology captures:**
- HACCP plan template and critical control points
- Allergen management (fining agents: egg white, casein, isinglass)
- Traceability procedure: lot coding, batch records, chain of custody
- Corrective action and recall procedure
- Document control and version management
- Regulatory calendar (AWBC returns, state EPA reporting, food safety audits)

**CSU academic backbone:** AGR202 Food Environment and Culture, WSC319 Wine Chemistry

---

### 8. Traceability
**Why it matters:** Traceability is both a compliance requirement and a quality management tool. It answers: where did this wine come from, what went into it, and where did it go?

**What Ownology captures:**
- Grape receival records: grower, block, variety, date, weight, Brix at receival
- Lot coding system and rationale
- Addition records: what was added, when, at what rate, by whom
- Blending records: component batches, volumes, final blend composition
- Packaging records: bottling date, closure, label, pallet, destination
- Export movement advice (AWBC format — already built in Sprint 6 — DR-11)

**CSU academic backbone:** WSC202 Wine Production 1, WSC303 Wine Production 2, AHT274 Industry Practice

---

## The Knowledge Layer Model

What makes Ownology different is not the SOP itself — it is the **knowledge layers** attached to it.

```
SOP Document
    └── Decision Logic Note
            "We use this approach because..."
    └── Vintage Lesson
            "In 2024 we deviated because..."
    └── Equipment Quirk
            "Note: Tank 4 valve sticks at 2 bar"
    └── Preferred Supplier
            "We use Lallemand — contact: Sarah, 0412 xxx xxx"
    └── Training Record
            "Jake trained: 14 June 2026 ✓"
    └── Video Attachment
            [30-second clip: correct pump-over technique]
```

This is the knowledge that walks out the door when a winemaker leaves. Ownology keeps it.

---

## CSU Academic Integration Strategy

Charles Sturt University's Bachelor of Wine Science provides the **educational backbone** for the SOP content library. The strategy:

1. **Use publicly available subject outlines** (handbook.csu.edu.au) as the topic framework for each SOP category — not as content, but as a quality signal that the content is academically grounded.
2. **Write original SOP content** drawing from primary sources: Wine Australia technical notes, FSANZ standards, Safe Work Australia WHS guides, and state EPA requirements.
3. **Link each SOP to the relevant CSU subject** so users understand the academic context: "This procedure is grounded in WSC318 Wine Microbiology principles."
4. **Do not reproduce CSU lecture or assessment content** — only use publicly available handbook information.

| SOP Category | Primary CSU Subject | Secondary Sources |
|---|---|---|
| Fermentation Management | WSC202, WSC318 | Wine Australia Tech Notes, Lallemand protocols |
| Tank Cleaning & Sanitation | WSC318, WSC202 | FSANZ 4.5.1, Ecolab CIP guides |
| Barrel Management | WSC303, WSC317 | Wine Australia Barrel Care guide |
| Bottling Procedures | WSC303, WSC321 | AWBC packaging guidelines |
| Laboratory Testing | WSC319, WSC318 | OIV compendium, Vintessential lab guides |
| Vintage Worker Onboarding | AHT274, WSC202 | Safe Work Australia, state WHS regulators |
| Food Safety & Compliance | AGR202, WSC319 | FSANZ Standard 4.5.1, Wine Australia HACCP guide |
| Traceability | WSC202, WSC303 | AWBC movement advice requirements |

---

## Sprint 7 — Knowledge Platform Build

### What gets built:

**1. Knowledge Base architecture** — a new section in the app (accessible from the main nav) with:
- SOP Library: 8 categories, each with 3–6 individual SOPs
- Each SOP has: procedure text, decision logic notes, vintage lesson slots, equipment quirk notes, training record attachment
- Search and filter by category, tag, and vintage year

**2. Free Run education integration** — the existing `/free-run` page becomes the learning companion to the SOP library:
- Each SOP links to its corresponding Free Run lesson
- CSU subject references appear as "Learn More" links
- Winemaker judgement criteria are explained in plain language

**3. Training Records module** — a simple sign-off system:
- Create a training session (SOP + date + trainer)
- Add trainees and mark completion
- Generate a training record PDF for compliance purposes

**4. Vintage Lessons log** — a structured end-of-vintage debrief:
- What worked / what failed / what to change
- Linked to specific batches and events in the Vintage Log
- Searchable across years

### What this is NOT:
- Not a video hosting platform (link to external video, do not host)
- Not a document management system (no version control, no approval workflows — keep it simple)
- Not a replacement for formal compliance documentation (it supplements, not replaces)

---

## Competitive Differentiation

| Platform | What it does | What it misses |
|---|---|---|
| Vintrace | Cellar management, compliance | No knowledge capture, no training records |
| Wine Wizard | Batch tracking | No SOPs, no decision logic |
| Google Drive / SharePoint | Document storage | No winery context, no training records, no vintage integration |
| **Ownology** | **Cellar management + knowledge capture + training records + vintage lessons** | **Nothing in this space does all four** |

---

## The Pitch in One Sentence

> Ownology is the only winery platform that captures not just what your team does, but why — so the knowledge stays in the business when the people move on.

---

*Document version: 1.0 | Author: Ownology Product Team | Date: June 2026*
*Next review: Sprint 7 kickoff*
