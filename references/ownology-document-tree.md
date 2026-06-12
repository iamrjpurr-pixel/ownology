# Ownology — Document Tree & Workflow Architecture

*Generated: June 2026. Reflects current codebase, knowledge base, and reference library.*

---

## 1. Product Architecture Overview

```
OWNOLOGY
│
├── PUBLIC SURFACE (marketing & acquisition)
│   ├── Home (landing page)
│   ├── Why Ownology
│   ├── Competitive Advantage
│   ├── Pricing
│   ├── Blog
│   ├── For InnoVint Users
│   ├── For Vintrace Users
│   ├── Merch
│   └── Preview (demo mode)
│
├── KNOWLEDGE SURFACE (reference & compliance)
│   ├── Regulations          ← "the what" — static reference library
│   └── Compliance           ← "the how" — AI compliance chat
│
├── OPERATIONAL SURFACE (cellar tools) — BRAND ID
│   ├── The Press            ← vintage log, batch tracking, calculations
│   └── The Free Run         ← unfiltered content / early access stream
│
└── ADMIN SURFACE (owner-only)
    ├── Admin (dashboard)
    ├── Admin Leads
    ├── Admin Compliance Doctrine
    ├── Campaign Metrics
    ├── Quick Entry
    └── Orders
```

---

## 2. Knowledge Base Structure

The compliance knowledge base (`server/complianceKnowledgeBase.ts`) contains **41 entries** across 9 jurisdictions.

```
COMPLIANCE KNOWLEDGE BASE
│
├── Federal (12 entries)
│   ├── Wine Australia Act 2013 — producer registration
│   ├── Wine Australia Regulations 2018 (F2018L00286) — export licence, product approval,
│   │   export certificate, quantity directions, LIP label thresholds (ss.7–27)
│   ├── FSANZ Food Standards Code — Standard 4.5.1 (wine definitions, additives, SO₂)
│   ├── WET Act 1999 — rebate eligibility, cap ($350k → $400k from 1 Jul 2026)
│   ├── Biosecurity Act 2015 — import/export biosecurity
│   ├── Fair Work Act 2009 — employment obligations
│   ├── National Employment Standards
│   └── WHS Model Law (Safe Work Australia)
│
├── South Australia (3 entries)
│   ├── Liquor Licensing Act 1997 — CBS SA
│   ├── Environment Protection Act 1993 — EPA SA
│   └── Work Health and Safety Act 2012 — SafeWork SA
│
├── Victoria (2 entries)
│   ├── Liquor Control Reform Act 1998 — VCGLR
│   └── Occupational Health and Safety Act 2004 — WorkSafe VIC
│
├── New South Wales (6 entries)
│   ├── Liquor Act 2007 — Liquor and Gaming NSW
│   ├── Protection of the Environment Operations Act 1997 — EPA NSW
│   └── Work Health and Safety Act 2011 — SafeWork NSW
│
├── Western Australia (2 entries)
│   ├── Liquor Control Act 1988 — DLGSC / Racing Gaming and Liquor
│   └── Work Health and Safety Act 2020 — WorkSafe WA
│
├── Queensland (2 entries)
│   ├── Liquor Act 1992 — OLGR
│   └── Environmental Protection Act 1994 — DES (Dept of Environment and Science)
│
├── Tasmania (2 entries)
│   ├── Liquor Licensing Act 1990 — Tasmanian Liquor and Gaming Commission
│   └── Work Health and Safety Act 2012 — WorkSafe Tasmania
│
├── New Zealand (8 entries)
│   ├── Sale and Supply of Alcohol Act 2012
│   ├── Wine Act 2003
│   ├── Resource Management Act 1991
│   ├── Health and Safety at Work Act 2015
│   └── Food Act 2014
│
└── International (4 entries)
    ├── EU Wine Regulations (import/export)
    ├── US TTB requirements
    └── OIV standards
```

---

## 3. Q&A Doctrine Structure

The compliance Q&A doctrine (`server/complianceQADoctrine.ts`) contains **54 pre-authored entries** that seed the AI compliance chat with authoritative, citation-grounded answers.

```
Q&A DOCTRINE (54 entries)
│
├── Federal — Wine Australia (8 entries)
│   ├── fed-producer-registration
│   ├── fed-export-licence
│   ├── fed-export-product-approval        ← new (Wine Australia Regs 2018)
│   ├── fed-export-certificate             ← new (Wine Australia Regs 2018)
│   ├── fed-label-gi-variety-vintage       ← updated with ss.24–27 thresholds
│   ├── fed-wet-rebate
│   ├── fed-biosecurity
│   └── fed-nrs-labelling
│
├── Federal — FSANZ (4 entries)
│   ├── fed-fsanz-additives
│   ├── fed-fsanz-so2-limits
│   ├── fed-fsanz-allergens
│   └── fed-fsanz-organic-claims
│
├── State — Liquor Licensing (7 entries, one per state)
├── State — Environmental (6 entries)
├── State — WHS (6 entries)
├── New Zealand (8 entries)
└── Cross-jurisdictional (15 entries)
    ├── LIP thresholds (variety/vintage/GI)
    ├── Export documentation workflow
    ├── Cellar door licence conditions
    └── Water licensing obligations
```

---

## 4. SOP Reference Library

Stored in `references/sop-starting-points.md`. This is the **foundational source material** for future SOP creation — not yet built into the product.

```
SOP REFERENCE LIBRARY (references/)
│
├── Source 1: Fhyzics SOP Manual for Wineries
│   └── 50 SOP titles across 5 pillars:
│       ├── Viticulture (harvest, pruning, pest, irrigation, soil)
│       ├── Cellar Operations (fermentation, pressing, MLF, blending, barrel)
│       ├── Packaging & QC (bottling, labelling, sensory, QC testing)
│       ├── Compliance & Safety (recordkeeping, export, waste, WHS, emergency)
│       └── Commercial (tasting room, wine club, events, distribution)
│
└── Source 2: Winemaker Magazine — Garagiste 2023 (Jenne Baldwin-Eaton)
    └── 6-stage winemaking SOP framework:
        ├── Stage 1: Harvest (picking params, method, transport, vessel, fruit condition)
        ├── Stage 2: Pre-fermentation (enzyme/tannin, cold soak, carbonic mac, SO₂)
        ├── Stage 3: Fermentation (yeast strategy, rehydration, temp, nitrogen, MLF, oak)
        ├── Stage 4: Post-fermentation / aging (maceration, sur lie, oak, oxidation, microbial)
        ├── Stage 5: Bottling prep (blending → fining → stabilities → filtering → bottle)
        └── Philosophy: SOPs are living roadmaps, not perfection checklists
```

---

## 5. User Workflow — Compliance Journey

```
USER ARRIVES AT OWNOLOGY
│
├── Discovery path (new user)
│   ├── Home → hero CTA → Waitlist / Founding Member signup
│   ├── Home → "Why Ownology" → CompetitiveAdvantage → Pricing
│   └── Home → Blog → article → CTA
│
├── Reference path (knows the rules, needs to look them up)
│   └── Nav → Regulations
│       ├── Search bar (keyword filter)
│       ├── Jurisdiction tabs (Federal / SA / VIC / NSW / WA / QLD / TAS / NZ)
│       ├── Accordion cards (each card = one regulatory obligation)
│       └── Source links → legislation.gov.au / state regulator
│
├── Compliance path (has a question, needs an answer)
│   └── Nav → Compliance
│       ├── Jurisdiction filter chip (All / Federal / State)
│       ├── Sample questions (pre-seeded from doctrine)
│       ├── Free-text question input
│       ├── AI answer with section-level citations
│       └── PDF export of conversation
│
└── Operational path (in the cellar, doing the work)
    └── Nav → The Press
        ├── Wine batch selection / creation
        ├── Vintage log entry (addition / measurement / racking / inoculation / observation)
        ├── Tank reminders
        ├── Quick entry mode
        └── [Future] SOP guidance at each stage
```

---

## 6. Data Flow — Compliance Chat

```
USER QUESTION
     │
     ▼
[Stage 1] Jurisdiction Classifier (LLM, JSON response)
     │    → Detects relevant jurisdictions from question text
     │    → Returns: { jurisdictions: [...], inScope: bool }
     │
     ▼
[Stage 2] KB Retrieval
     │    → Filters complianceKnowledgeBase.ts by detected jurisdictions
     │    → Selects relevant sections (title + content + citations)
     │
     ▼
[Stage 3] Doctrine Lookup
     │    → Checks complianceQADoctrine.ts for matching pre-authored Q&A
     │    → If match found: injects as high-confidence context
     │
     ▼
[Stage 4] LLM Answer Generation
     │    → System prompt: Australian winery compliance expert
     │    → Context: KB sections + doctrine entries + conversation history
     │    → Output: cited prose answer with regulation references
     │
     ▼
USER RECEIVES ANSWER
     │    → Displayed with jurisdiction tags and citation links
     └──→ PDF export available
```

---

## 7. Database Tables

```
DATABASE (MySQL / TiDB)
│
├── users                     — auth, role (admin | user), stripe_customer_id
├── founding_members          — waitlist / founding member signups
├── leads                     — campaign lead captures
├── vintage_log_entries       — cellar event log (The Press)
├── wine_batches              — batch / tank registry (The Press)
├── tank_reminders            — scheduled cellar reminders
├── campaign_metrics_snapshots — marketing analytics
├── site_content              — CMS-style editable content blocks
├── doctrine_verified         — admin-verified Q&A doctrine entries
└── regulation_monitor_seen   — tracks which regulation updates user has seen
```

---

## 8. Future SOP Feature — Planned Architecture

*Not yet built. Starting points stored in `references/sop-starting-points.md`.*

```
SOP FEATURE (planned)
│
├── SOP Template Library
│   ├── Tier 1: General winery (all styles)
│   ├── Tier 2: Style family (red / white / sparkling / fortified / orange)
│   └── Tier 3: Individual wine (winery-specific customisation)
│
├── SOP Stages (from Garagiste 2023 framework)
│   ├── Harvest
│   ├── Pre-fermentation
│   ├── Fermentation
│   ├── Post-fermentation / aging
│   ├── Bottling prep
│   └── [Compliance checkpoints at each stage — linked to KB]
│
├── SOP Versioning
│   ├── Review date tracking
│   ├── Revision history
│   └── Incident / exception notes
│
└── Integration points
    ├── The Press → log entries can reference SOP step
    ├── Compliance → SOP steps can link to relevant KB section
    └── Regulations → SOP compliance checkpoints cite regulation source
```

---

## 9. Gap Analysis — What Is Missing

| Area | Current state | Priority |
|---|---|---|
| NT (Northern Territory) | Not in KB — greyed out on map | Medium |
| WET rebate cap 2026–27 | $400k figure — needs ATO verification post 1 Jul 2026 | High |
| FSANZ Standard 1.2.7 (nutrition) | Not in KB | Low |
| Organic certification (ACO / NASAA) | Not in KB | Medium |
| NZ GI / Geographical Indications | Partial in KB | Medium |
| SOP feature | Reference material only — not built | Future |
| Crosslink: Regulations → Compliance | No CTA linking the two pages | Low |
| NT compliance map | Map shows NT as black / uncovered | Medium |

---

*Document tree maintained in `references/ownology-document-tree.md`*
