# Ownology — Document Tree & Workflow Architecture

*Updated: June 2026. Reflects current codebase, knowledge base, and reference library after Sprint 8.*

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
│   ├── Compliance           ← "the how" — AI compliance chat
│   └── Knowledge Platform   ← SOP library (38 SOPs, 10 categories) + AI Tutor
│       ├── /knowledge                — SOP library browse & search
│       ├── /knowledge/category/:cat  — filtered by category
│       ├── /knowledge/sop/:id        — SOP detail (procedure, quick steps, notes, training)
│       └── /free-run                 — AI winemaking tutor (scoped RAG)
│
├── OPERATIONAL SURFACE (cellar tools) — BRAND ID
│   ├── The Press            ← vintage log, batch tracking, calculations
│   │   ├── VintageEntrySheet — 5-step guided entry (with SOP bridge chips)
│   │   └── QuickEntry        — rapid single-field entry
│   └── Guide                ← new-user onboarding guide (/guide)
│
└── ADMIN SURFACE (owner-only)
    ├── Admin (dashboard)
    ├── Admin Leads
    ├── Admin Compliance Doctrine
    ├── Build Index           ← owner-only (not in public nav)
    ├── Campaign Metrics
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

## 4. SOP Knowledge Platform (LIVE — Sprint 8)

The SOP library is stored in the `sop_library` database table and served via the `/knowledge` routes.

```
SOP KNOWLEDGE PLATFORM
│
├── sop_library table (38 SOPs across 10 categories)
│   ├── Fields: id, title, category, purpose, scope, procedure (JSON steps),
│   │           materials, safetyNotes, references, csuSubjectRef, isTemplate,
│   │           quickSteps (NEW — Sprint 8: cellar-ready bullet checklist)
│   │
│   ├── Categories (10):
│   │   ├── Barrel Management (5 SOPs)
│   │   ├── Bottling Procedures (4 SOPs)
│   │   ├── Crushing & Fermentation (4 SOPs)
│   │   ├── Fermentation Management (6 SOPs)
│   │   ├── Laboratory Testing (5 SOPs)
│   │   ├── Pre-Harvest (3 SOPs)
│   │   ├── Tank Cleaning & Sanitation (4 SOPs)
│   │   ├── Traceability (3 SOPs)
│   │   ├── Vineyard Operations (2 SOPs)
│   │   └── Winery Safety (2 SOPs)
│   │
│   └── SOP Detail Tabs:
│       ├── Procedure — step-by-step with QUICK STEPS panel (Sprint 8)
│       ├── Notes     — winemaker vintage notes (linked to vintage_log_entries)
│       └── Training  — training record log
│
├── sop_vintage_notes table — winemaker notes per SOP
├── sop_training_records table — training completions per SOP
│
└── AI Tutor (Free Run) — scoped RAG over sop_library
    ├── Retrieves top-5 relevant SOPs by keyword match
    ├── Returns JSON: { answer, sopTitles[], disclaimer }
    └── Supports conversation history (multi-turn)
```

---

## 5. Cross-Pillar Bridges (Sprint 8)

The three pillars — **Do** (The Press), **Know** (Knowledge Platform), **Learn** (Free Run) — are now interconnected.

```
CROSS-PILLAR BRIDGES
│
├── Do → Know  (VintageEntrySheet → Knowledge Platform)
│   ├── Location: Step 4 (note step) of VintageEntrySheet
│   ├── Trigger: When event type is addition / measurement / racking /
│   │            inoculation / sanitation / bottling_run / observation
│   ├── Display: Amber "Related SOPs" chips above the note textarea
│   └── Action: Opens SOP detail page in new tab (/knowledge/sop/:id)
│
├── Know → Learn  (SOP detail → Free Run)
│   ├── Location: SOP detail page header (next to Print SOP button)
│   ├── Display: Amber "Ask AI Tutor" button
│   └── Action: Opens /free-run?q=Tell+me+more+about:+{sop.title}
│               (auto-submits the question via ?q= param)
│
└── Learn → Do  (Free Run → The Press)
    ├── Location: Bottom of each answer card in Free Run
    ├── Display: Amber "Log it in The Press" chip + helper text
    └── Action: Links to /the-press (user opens VintageEntrySheet)
```

---

## 6. User Workflow — Compliance Journey

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
├── Knowledge path (wants to learn or look up a procedure)
│   └── Nav → Knowledge
│       ├── Browse by category (10 categories, 38 SOPs)
│       ├── Search by keyword
│       ├── SOP detail: procedure + quick steps + notes + training
│       ├── Ask AI Tutor → Free Run (pre-filled question)
│       └── Print SOP
│
└── Operational path (in the cellar, doing the work)
    └── Nav → The Press
        ├── Wine batch selection / creation
        ├── Vintage log entry (addition / measurement / racking / inoculation / observation)
        │   └── Step 4 (note step): Related SOP chips → Knowledge Platform
        ├── Tank reminders
        └── Quick entry mode
```

---

## 7. Data Flow — Compliance Chat

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

## 8. Data Flow — AI Tutor (Free Run)

```
USER QUESTION
     │
     ▼
[Stage 1] SOP Retrieval (keyword match)
     │    → Queries sop_library for top-5 relevant SOPs
     │    → Matches on title + category + procedure text
     │
     ▼
[Stage 2] Context Assembly
     │    → Builds sopContext string from retrieved SOPs
     │    → Includes: title, category, purpose, procedure steps
     │
     ▼
[Stage 3] LLM Answer Generation
     │    → System prompt: expert winemaking assistant (professional or home)
     │    → Context: sopContext + conversation history
     │    → Output: JSON { answer, sopTitles[], disclaimer }
     │
     ▼
USER RECEIVES ANSWER
     │    → Displayed with SOP source badges
     │    → "Log it in The Press" CTA → The Press
     └──→ Conversation history maintained for multi-turn
```

---

## 9. Database Tables

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
├── regulation_monitor_seen   — tracks which regulation updates user has seen
├── sop_library               — 38 SOPs (title, category, procedure, quickSteps, ...)
├── sop_vintage_notes         — winemaker notes per SOP (linked to user + sop_id)
└── sop_training_records      — training completions per SOP (linked to user + sop_id)
```

---

## 10. Gap Analysis — What Is Missing

| Area | Current state | Priority |
|---|---|---|
| NT (Northern Territory) | Not in KB — greyed out on map | Medium |
| WET rebate cap 2026–27 | $400k figure — needs ATO verification post 1 Jul 2026 | High |
| FSANZ Standard 1.2.7 (nutrition) | Not in KB | Low |
| Organic certification (ACO / NASAA) | Not in KB | Medium |
| NZ GI / Geographical Indications | Partial in KB | Medium |
| SOP bridge: event log → SOP chips | Live (Sprint 8) — static mapping, not dynamic | Future: dynamic by addition.what |
| Crosslink: Regulations → Compliance | No CTA linking the two pages | Low |
| NT compliance map | Map shows NT as black / uncovered | Medium |
| SOP quick_steps | Live (Sprint 8) — 38 SOPs seeded | Ongoing: refine per winemaker feedback |

---

*Document tree maintained in `references/ownology-document-tree.md`*
