# Ownology — Value Engineering Roadmap v2

**Version:** 2.0
**Date:** June 2026
**Status:** Active build plan — Sprint 8 open
**Previous version:** v1.0 (Sprints 1–4 original plan, now superseded)
**Reference:** Design Requirements Repository v2 (`references/design-requirements-repository.md`)

---

## Executive Summary

The original Value Engineering Roadmap (v1.0) was written before a single sprint had been completed. It projected four sprints to close 18 partial requirements and achieve full coverage of all 27 design requirements. That plan has been executed, and then exceeded.

Seven sprints have now been completed. All 27 design requirements are at Full coverage. The platform has grown from a compliance-focused AI assistant to a four-pillar winery knowledge management system. The original four-sprint plan took three additional sprints to complete — not because the estimates were wrong, but because the product vision expanded materially during build. The Knowledge Platform (Sprint 7) was not in the original roadmap at all. It emerged from a strategic insight: the differentiating value of Ownology is not the SOP library, but the capture of the reasoning and experience behind it.

This v2 roadmap serves three purposes. First, it closes out the record of Sprints 1–7 with a completion table and a revised DR coverage map. Second, it introduces the four-pillar architecture — **Do, Know, Learn, Guide** — that has emerged as the product's strategic frame. Third, it re-scores Sprint 8 candidates using the same Impact / Effort value methodology, and defines Sprint 8 as the **Triangulation Sprint**: the work that connects the three built pillars into a coherent whole and builds the fourth pillar that was always implied but never built.

The governing principle remains unchanged: **value engineering — do the most with the least. Extend before building new.**

---

## Part I — Sprint Completion Record (Sprints 1–7)

### 1.1 Original Scope vs. Actual Delivery

The original v1 roadmap projected 12–16 AI agent sessions across four sprints to close 18 partial requirements. The actual delivery required seven sprints and approximately 20 sessions, but delivered substantially more than the original plan specified. The Knowledge Platform (Sprint 7) added three new database tables, 31 seeded SOPs, a full knowledge management interface, and a CSU academic backbone integration — none of which were in scope for v1.

| Sprint | Theme | DRs Closed | New DB Tables | New Pages / Major Features | Status |
|---|---|---|---|---|---|
| Sprint 1 | Visibility & Intelligence | DR-01, DR-04, DR-11, DR-19, DR-20 | 1 (volumeLitres field) | Dashboard, Export Log PDF, AI Interpretation | **Complete** |
| Sprint 2 | Operational Depth | DR-02, DR-03, DR-07, DR-08, DR-10, DR-12 | 3 (barrels, tank_reminders, packaging) | Barrels tab, Reminders, Pre-Harvest Sample, Lot Traceability | **Complete** |
| Sprint 3 | Commercial Intelligence | DR-05, DR-13, DR-14, DR-16 | 1 (packaging_inventory) | Packaging tab, Cost tracking, Vintage Card PDF, Weather Event | **Complete** |
| Sprint 4 | Strategic Completeness | DR-06, DR-15, DR-17 | 2 (vineyard_blocks, vineyard_events) | Vineyard page, Production Planning, Cellar Value | **Complete** |
| Sprint 5 | Polish & PWA | DR-23 (PWA), DR-17 (enhanced), DR-15 (enhanced) | 0 | PWA manifest, Multi-Vintage Comparison, cost-per-litre field | **Complete** |
| Sprint 6 | DR Gap Closure | DR-03 (Full), DR-04 (Full), DR-06 (Full), DR-10 (Full), DR-11 (Full) | 0 (SQL direct) | Live volume balance, Export Docs tab, Sanitation event, Vineyard disease types, Equipment fault log | **Complete** |
| Sprint 7 | Knowledge Platform | New platform pillar (Know) | 3 (knowledge_sops, knowledge_vintage_notes, knowledge_training_records) | /knowledge page, SOP library (31 SOPs), Decision Logic, Tribal Knowledge, Training Records, Vintage Debrief, CSU Academic Backbone in Free Run | **Complete** |

### 1.2 Design Requirements Coverage — Final State

All 27 original design requirements are at Full coverage as of Sprint 7. The table below records the sprint in which each DR reached Full status. DRs 22–27 are v2 extensions introduced to capture the strategic gaps identified through the four-pillar architecture analysis.

| DR | Requirement | Sprint Closed | Coverage |
|---|---|---|---|
| DR-01 | Consistent Wine Quality | Sprint 1 | **Full** |
| DR-02 | Fermentation Monitoring | Sprint 2 | **Full** |
| DR-03 | Contamination Risk | Sprint 6 | **Full** |
| DR-04 | Inventory Visibility | Sprint 6 | **Full** |
| DR-05 | Weather Uncertainty | Sprint 3 | **Full** |
| DR-06 | Disease & Pest Management | Sprint 6 | **Full** |
| DR-07 | Harvest Timing | Sprint 2 | **Full** |
| DR-08 | Tank and Barrel Management | Sprint 2 | **Full** |
| DR-09 | Labour Shortages | Sprint 1 (baseline) | **Full** |
| DR-10 | Equipment Downtime | Sprint 6 | **Full** |
| DR-11 | Regulatory Compliance | Sprint 6 | **Full** |
| DR-12 | Traceability | Sprint 2 | **Full** |
| DR-13 | Packaging Material Shortages | Sprint 3 | **Full** |
| DR-14 | Cost Management | Sprint 3 | **Full** |
| DR-15 | Forecasting Demand | Sprint 4 | **Full** |
| DR-16 | Direct-to-Consumer Sales | Sprint 3 | **Full** |
| DR-17 | Inventory Aging | Sprint 4 | **Full** |
| DR-18 | Disconnected Systems | Sprint 1 (baseline) | **Full** |
| DR-19 | Poor Real-Time Visibility | Sprint 1 | **Full** |
| DR-20 | Export & Reporting | Sprint 1 | **Full** |
| DR-21 | Knowledge Transfer | Sprint 7 | **Full** |
| DR-22 | Onboarding & Training | Sprint 7 (partial) | **Partial — Sprint 8** |
| DR-23 | Mobile Accessibility | Sprint 5 | **Full** |
| DR-24 | Seasonal Workflow Guidance | Sprint 7 (partial) | **Partial — Sprint 8** |
| DR-25 | Cross-Pillar Navigation | Not yet built | **Gap — Sprint 8** |
| DR-26 | Induction Experience | Not yet built | **Gap — Sprint 8** |
| DR-27 | Workflow Discoverability | Not yet built | **Gap — Sprint 8** |

---

## Part II — The Four-Pillar Architecture

### 2.1 How the Architecture Emerged

The original product vision was a compliance-focused AI assistant for winemakers. Seven sprints of build work have produced something more substantial: a winery knowledge management platform with four distinct but related functions. These functions were not planned as a four-pillar architecture from the start — they emerged from the build, and the strategic insight that named them came from the user during Sprint 7.

The four pillars are:

**Do** — The operational core. The Press, Cellar Tasks, Vineyard, Quick Entry, and the Production Dashboard. This is where winemakers spend most of their time during harvest and throughout the vintage. It is the most mature pillar, with the deepest feature coverage.

**Know** — The knowledge layer. The Knowledge Platform (`/knowledge`) built in Sprint 7: SOP library, Decision Logic, Tribal Knowledge capture, Vintage Lessons Log, and Training Records. This is where the winery's institutional knowledge lives. The differentiating insight is that most wineries have SOPs; very few capture the reasoning and experience behind them. Tribal Knowledge and Decision Logic are the retention moat.

**Learn** — The education layer. Free Run (`/free-run`): the CSU Academic Backbone, lesson library, and winemaking calculators. This is where winemakers develop their knowledge base. Currently the least complete pillar — most lesson content is placeholder, and the CSU subject cards are informational rather than interactive.

**Guide** — The induction layer. Not yet built. This is the pillar that teaches users how to use Ownology for their winery — not just how to use the software, but how to integrate it into their actual winery workflow. It includes a workflow map, a getting-started checklist, role-based induction paths, and contextual bridges between the other three pillars.

### 2.2 The Triangulation Problem

The three built pillars are not connected by deliberate UX bridges. A winemaker logging a racking event in The Press has no prompt to consult the Racking SOP in the Knowledge Platform. A winemaker reading a Clarification SOP has no link to the Free Run lesson on fining agents. A winemaker completing a Free Run lesson on fermentation management has no CTA to log a measurement in The Press. Each pillar is internally coherent but externally isolated.

This is the central UX problem that Sprint 8 must solve. The solution is not to rebuild any of the three pillars — it is to add the connective tissue between them, and to build the Guide pillar that makes the whole system legible to a new user.

### 2.3 The Valuation Story

The four-pillar architecture has a direct bearing on the platform's resale value. Operational logging (Do) is a commodity — every winery management system does it. Compliance AI (Know, partially) is differentiating but replicable. The tribal knowledge capture layer — Decision Logic and Tribal Knowledge within the Knowledge Platform — is the retention moat. Once a winery has captured three vintages of decision reasoning and tribal knowledge in Ownology, that data is not portable to any other system. The switching cost becomes prohibitive.

Sprint 8 deepens this moat by making the tribal knowledge layer more accessible (Guide pillar), more connected (cross-pillar bridges), and more discoverable (nav update and workflow map). Every feature in Sprint 8 increases the switching cost for existing users and reduces the time-to-value for new users.

---

## Part III — Sprint 8 Value Scoring

### 3.1 Scoring Methodology

The same methodology as v1 applies. **Impact (1–5):** how directly does this feature improve the daily experience of a paying commercial winery user or reduce time-to-value for a new user? **Effort (1–5):** how much new code is required? **Value Score = Impact / Effort.** Higher is better.

Sprint 8 candidates are drawn from three sources: the four-pillar architecture gap analysis, the full-platform HF audit (see `references/platform-hf-audit.md`), and the six items identified in the Sprint 8 HF assessment (`ownology-sprint8-hf-assessment.md`).

### 3.2 Sprint 8 Candidate Scoring

| Item | Description | Impact | Effort | Value Score | DR Closed |
|---|---|---|---|---|---|
| S8-A | Add /knowledge to main nav | 5 | 1 | **5.00** | DR-25, DR-27 |
| S8-B | Remove Build Index link from nav | 4 | 1 | **4.00** | Launch hygiene |
| S8-I | Post-login redirect to /guide for new users (one-time, localStorage flag) | 4 | 1 | **4.00** | DR-26 |
| S8-G | Update ownology-document-tree.md to four-pillar architecture | 3 | 1 | **3.00** | Documentation |
| S8-J | Remove /build-index route from production nav | 3 | 1 | **3.00** | Launch hygiene |
| S8-C | Do to Know bridge: contextual SOP chips on event log entries | 5 | 2 | **2.50** | DR-25 |
| S8-H | Add quick_steps field to knowledge_sops table (3–5 bullet cellar-ready summary) | 4 | 2 | **2.00** | DR-21, DR-22 |
| S8-D | Know to Learn bridge: Learn more links from SOPs to Free Run | 4 | 2 | **2.00** | DR-25 |
| S8-E | Learn to Do bridge: Try it now CTAs from Free Run to The Press | 4 | 2 | **2.00** | DR-25 |
| S8-F | Build /guide page: workflow map, getting started checklist, role-based paths | 5 | 4 | **1.25** | DR-22, DR-24, DR-26, DR-27 |

### 3.3 Sprint 8 Sequencing

Items are ordered by value score, with the constraint that S8-A (nav update) and S8-B/S8-J (launch hygiene) are executed first because they have the highest score and zero risk. The Guide page (S8-F) is the most complex item and is built last, after the bridge components are in place, so that the Guide page can reference them.

**Recommended execution order:**

1. S8-A — Add /knowledge to main nav (immediate discoverability fix, 1 session)
2. S8-B + S8-J — Remove Build Index from nav, clean up launch hygiene (1 session)
3. S8-I — Post-login redirect to /guide for new users (1 session, builds the route stub)
4. S8-H — Add quick_steps field to knowledge_sops (schema change, 1 session)
5. S8-C — Do to Know bridge: contextual SOP chips on event log entries (1–2 sessions)
6. S8-D — Know to Learn bridge: Learn more links from SOPs to Free Run (1 session)
7. S8-E — Learn to Do bridge: Try it now CTAs from Free Run to The Press (1 session)
8. S8-F — Build /guide page with workflow map, checklist, role-based paths (2–3 sessions)
9. S8-G — Update ownology-document-tree.md (1 session, documentation)

**Total estimated sessions: 10–12**

---

## Part IV — Sprint 8 Strategic Context

### 4.1 Why This Sprint Matters More Than the Others

Sprints 1–7 built features. Sprint 8 builds coherence. A platform with seven sprints of features but no coherent entry point is harder to sell, harder to onboard, and harder to retain than a platform with five sprints of features and a clear induction path. The Guide pillar is not a nice-to-have — it is the frame that makes the rest of the platform legible.

The specific value of the Guide pillar for the target market (boutique and medium-sized wineries in AU/NZ/US) is that winery owners are not software product managers. They do not intuit how a four-pillar knowledge management system maps onto their actual winery operations. The Guide pillar must do that mapping for them: here is how your vintage cycle maps onto the Do/Know/Learn/Guide structure; here is the first thing to do in your first week; here is the path for a cellar hand vs. a head winemaker vs. an owner.

### 4.2 Design Constraints Inherited from HF Assessment

The Sprint 8 HF assessment (`ownology-sprint8-hf-assessment.md`) identified three High-risk human factors issues and five design decisions that must be resolved before build. These constraints are binding on Sprint 8 scope:

**Bridge components must be passive, not intrusive.** Cross-pillar bridges must be implemented as dismissable chips or inline links — never as modal interruptions or navigation-away prompts. A winemaker in the middle of logging a racking event must not be forced to engage with a bridge. The bridge must be present but ignorable.

**Bridges must open in side panels, not navigate away.** When a winemaker taps a "View Racking SOP" chip while logging a racking event, the SOP must open in a side panel overlay — not navigate away from the form. Losing form state is a critical error in a harvest-day context.

**The Guide page must be default post-login for new users only.** The redirect to /guide must be gated by a localStorage flag (`ownology_guide_seen`) so that returning users are never redirected. New users see the Guide once; after that, it is accessible from the nav but not forced.

**The workflow map must be interactive HTML/CSS, not a static image.** The workflow map on the Guide page must be a navigable component — clicking a workflow node navigates to the relevant page or opens a relevant SOP. A static image is not acceptable because it cannot be updated without a design asset change.

**Quick Steps must be cellar-ready, not academic.** The `quick_steps` field on each SOP must contain 3–5 bullet points that a cellar hand can act on immediately — not a summary of the SOP's academic content. The distinction is: "Add 50mg/L SO2 after racking" vs. "This SOP covers the principles of SO2 management."

### 4.3 What Sprint 8 Does Not Include

Sprint 8 is scoped deliberately to avoid scope creep. The following items are explicitly deferred to Sprint 9 or later:

- Full lesson content for Free Run (most lessons are still placeholder — this requires content creation, not engineering)
- Stripe payment integration or subscription gating (the platform is pre-revenue; gating is premature)
- User account management beyond the existing Manus OAuth flow
- Any new database tables beyond quick_steps on knowledge_sops
- AI-generated SOP customisation (the SOPs are seeded as industry templates; user customisation is a Sprint 9 feature)
- Export documentation automation (AWBC forms, tax reporting integration — deferred from DR-11 partial)

---

## Part V — Post-Sprint 8 Horizon

### 5.1 Sprint 9 Candidates

The following items are not in Sprint 8 scope but are the highest-value candidates for Sprint 9, ordered by estimated value score:

| Item | Description | Estimated Value Score |
|---|---|---|
| Free Run content completion | Replace placeholder lesson cards with real winemaking content (LLM generation seeded from CSU syllabi) | 2.50 |
| SOP customisation | Allow winery owners to edit seeded SOPs and save custom versions | 2.00 |
| Export docs automation | Pre-filled AWBC export forms from batch data | 1.75 |
| Tribal Knowledge AI assist | LLM-assisted capture of tribal knowledge entries (prompt-based interview) | 1.50 |
| Multi-user roles | Cellar hand vs. head winemaker vs. owner role-based access control | 1.25 |

### 5.2 The Resale Readiness Checklist

Before the platform is positioned for acquisition or investment, the following items must be complete:

- [ ] Sprint 8 complete (Guide pillar, cross-pillar bridges, nav update)
- [ ] Build Index link removed from production nav
- [ ] Free Run lesson content at least 50% real (not placeholder)
- [ ] At least one winery has customised their SOP library (tribal knowledge moat demonstrated)
- [ ] Stripe subscription flow live (revenue signal for acquirers)
- [ ] ownology-document-tree.md updated to four-pillar architecture

---

## Appendix — Build Strategy Principles (Unchanged from v1)

The following principles from v1 remain in force for Sprint 8 and beyond.

**Extend before building new.** The cross-pillar bridges (S8-C, S8-D, S8-E) are extensions of existing components — a chip added to an existing log entry card, a link added to an existing SOP card. No new pages are required for the bridge work. Only the Guide page (S8-F) is genuinely new.

**Schema changes are the only irreversible decisions.** The quick_steps field addition (S8-H) is the only schema change in Sprint 8. It must be designed correctly before the migration is run. The field should be TEXT NULL to allow gradual population without breaking existing SOP records.

**The LLM is already paid for — use it more.** The Guide page's role-based induction paths can be partially generated by the LLM from the existing SOP library and the user's winery profile. The workflow map's contextual descriptions can be LLM-generated from the existing event type documentation. Both are zero marginal cost.

**Navigation is the highest-leverage surface.** Adding /knowledge to the main nav (S8-A) is the single highest-value item in Sprint 8. It costs one session and immediately makes the Knowledge Platform discoverable to every user who has never found it. The nav is the product's most-read surface — every change to it has outsized impact.

---

*This roadmap is maintained in `references/value-engineering-roadmap.md`. It should be updated after Sprint 8 to reflect completed items and introduce Sprint 9 candidates.*
