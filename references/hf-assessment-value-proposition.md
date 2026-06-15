# Ownology — Human Factors Assessment & Value Proposition

**Version:** 1.0
**Date:** June 2026
**Status:** Active reference document
**Prepared by:** Manus AI, in collaboration with the Ownology founding team

---

## Part I — Why We Started: The Founding Thesis

### The Gap We Saw

In May 2026, a systematic review of every commercially available winemaking and viticulture application produced a finding that was both surprising and actionable: **no product in the market answers winemakers' questions, knows their regulatory obligations, or reasons over their own documents.** Seven products were researched. Zero direct competitors were found in the specific intersection of operational logging, AI-grounded decision support, and institutional knowledge capture.

The gap is not about features. Every winery management system on the market — InnoVint, Vintrace, WineryCopilot, and their peers — solves the record-keeping problem competently. They store what happened. What none of them do is help a winemaker decide what to do next, retrieve the reasoning behind a past decision, or answer a regulatory question at 11pm during harvest without a phone call to a consultant.

The founding insight is precise: **the winemaker's mind is the most valuable and most fragile asset in a boutique winery, and no software captures it.** When the head winemaker leaves, retires, or gets sick during harvest, the institutional knowledge — why EC1118 was chosen for the 2023 Shiraz, why Tank 3 runs 2°C hot, why the 2021 stuck at 4.2 Brix — leaves with them. That knowledge is not in any SOP. It is in someone's head.

Ownology was built to change that.

### The Four Capabilities That Define the Gap

The market review identified four specific capabilities that no existing product provides:

| Capability | What it means | Why it matters |
|---|---|---|
| **Natural language question answering** | A winemaker can ask "what should I do about my stuck ferment?" and receive a grounded, specific answer | Winemakers make decisions under time pressure, not at a desk with a browser |
| **Australian state-by-state compliance** | SA, VIC, NSW, WA, QLD, and TAS regulatory requirements in one searchable place | Compliance errors are costly; the information is fragmented across six state frameworks |
| **Cellar log + AI reasoning layer** | Structured data capture that the AI can reason over — not just store | The log becomes a knowledge asset, not just a record |
| **Mobile-first, cellar-floor design** | Built for use on a phone during harvest, not at a desk | The moment of need is in the cellar, not the office |

### The Positioning Principle

Ownology is not a replacement for InnoVint or Vintrace. It is the intelligence layer that sits alongside them — or, for boutique wineries that do not use enterprise winery management software, the complete operational and knowledge system in one place. The distinction is between a system that records facts ("Tank 7 Brix reading: 8.4") and a system that answers what to do next. Ownology does both.

---

## Part II — The Product Architecture

### The Four-Pillar Model

Seven sprints of build work have produced a platform with four distinct but related functions. These were not planned as a four-pillar architecture from the start — they emerged from the build, and the strategic insight that named them came from the founding team during Sprint 7.

**Do** is the operational core. The Press, Cellar Tasks, Vineyard, Quick Entry, and the Production Dashboard. This is where winemakers spend most of their time during harvest and throughout the vintage. It is the most mature pillar, with the deepest feature coverage. The vintage log — the original founding product — lives here.

**Know** is the knowledge layer. The Knowledge Platform (`/knowledge`): SOP library, Decision Logic, Tribal Knowledge capture, Vintage Lessons Log, and Training Records. This is where the winery's institutional knowledge lives. The differentiating insight is that most wineries have SOPs; very few capture the reasoning and experience behind them. Tribal Knowledge and Decision Logic are the retention moat.

**Learn** is the education layer. Free Run (`/free-run`): an AI tutor backed by the SOP library, the CSU Academic Backbone, and winemaking calculators. This is where winemakers develop their knowledge base. The AI tutor uses scoped retrieval — it finds the most relevant SOPs for a question and answers from them directly, citing its sources. It is not a general-purpose chatbot; it is a cellar-floor knowledge assistant.

**Guide** is the induction layer. Not yet built. This is the pillar that teaches users how to use Ownology for their winery — not just how to use the software, but how to integrate it into their actual winery workflow. It includes a workflow map, a getting-started checklist, role-based induction paths, and contextual bridges between the other three pillars.

### The Vintage Log as the Anchor

The vintage log is the product's founding purpose and its most important surface. Everything else — the AI tutor, the compliance tool, the knowledge platform, the education layer — is built around the log and draws its value from it. A winemaker who logs consistently in Ownology builds a data asset that the AI can reason over, the Knowledge Platform can reference, and the Guide can use to personalise induction paths.

This primacy of the vintage log must be reflected in the site architecture, the navigation, and the onboarding experience. A new user arriving at ownology.ai should understand within 30 seconds that the core product is a vintage log — and that the AI, compliance, and knowledge features are the intelligence layer on top of it.

---

## Part III — Human Factors Assessment

### Methodology

This assessment applies ten human factors lenses to each major product surface, drawing on the full-platform HF audit conducted post-Sprint 7 (`references/platform-hf-audit.md`). The lenses are adapted from ISO 9241-11 usability principles and Nielsen's heuristics: Cognitive Load, Error Prevention, Learnability, Efficiency, Feedback & Status, Consistency, Accessibility, Error Recovery, Discoverability, and Strategic Alignment.

Findings are rated: **Pass**, **Minor**, **Moderate**, or **Critical**.

### Summary of Findings

The platform has 91 individual findings across nine surfaces. The distribution is:

| Severity | Count | Priority |
|---|---|---|
| Critical | 10 | Must fix before public launch |
| Moderate | 10 | Should fix in Sprint 8 |
| Minor | 22 | Fix in Sprint 8 or 9 |
| Pass | 49 | No action required |

The ten Critical findings are:

1. **The Knowledge Platform is not in the main nav.** A user who has never been explicitly directed to `/knowledge` cannot discover it from the home page. This is the most severe discoverability failure on the platform — the most differentiated feature is invisible.

2. **The Build Index is in the main nav.** An internal testing tool (`/build-index`) is linked from the primary nav alongside marketing pages. This must be removed before the platform is presented to end users.

3. **The nav does not communicate the four-pillar architecture.** The nav groups features by operational category ("In the Cellar," "Compliance," "About & More") rather than by pillar. A first-time user cannot understand the platform's strategic structure from the nav alone.

4. **The Knowledge Platform has no outbound bridges to Learn or Do.** A winemaker reading a Fermentation Management SOP has no link to the Free Run lesson on fermentation chemistry, and no CTA to log a measurement in The Press. The Know pillar is internally complete but externally isolated.

5. **Free Run has no Learn-to-Do bridge.** A winemaker who asks the AI tutor about stuck ferment management has no CTA to log a measurement or start a new tank record in The Press.

6. **The Press has no Do-to-Know bridge.** A winemaker logging a Racking event has no prompt to consult the Racking SOP. The most-used surface has no connection to the knowledge layer.

7. **Quick Entry bypasses authentication.** The harvest-day rapid logging surface has an authentication bypass in the current build. This must be removed before production launch.

8. **No cross-pillar bridges exist anywhere on the platform.** None of the nine surfaces has a deliberate UX bridge to another pillar. Each pillar is internally coherent but externally isolated.

9. **The vintage log is not the primary experience the site presents.** The homepage hero leads with the AI assistant demo. A visitor to ownology.ai today would not know that logging vintage data is the core product.

10. **Free Run's 19 lesson cards were fabricated scaffolding.** The lesson cards were invented to give the UI something to render. They have been replaced with a live AI tutor, but the CSU Academic Backbone section still presents 6 subject cards as interactive when they are informational only.

### Surface-by-Surface Assessment

#### The Press (`/the-press`) — Vintage Log

The Press is the platform's founding surface and its most important. It is also the most mature, with the deepest feature coverage. The core vintage log workflow — logging an event, reviewing the log, searching by tank or event type — is efficient and well-designed for cellar-floor use.

The primary human factors failure is the absence of cross-pillar bridges. A winemaker logging a Racking event has no prompt to consult the Racking SOP. A winemaker logging an Addition has no link to the relevant SOP for that addition type. The log is a data-capture surface; it should also be a knowledge-access surface.

Secondary findings include the absence of a delete confirmation dialog (a misclick during harvest could result in permanent data loss), and the absence of tank validation before event type selection (a user can select "Bottling Run" without specifying a tank, creating an orphaned log entry).

#### Free Run (`/free-run`) — AI Tutor

Free Run has been transformed from a placeholder lesson grid into a live AI tutor backed by the SOP library. The tutor uses scoped retrieval — it finds the most relevant SOPs for a question and answers from them directly. This is the correct architecture: it does not compete with the AWRI's authoritative content, it surfaces the right AWRI resource at the right moment and answers the immediate operational question from Ownology's own SOP library.

The primary human factors failure is the absence of a Learn-to-Do bridge. After receiving an answer about stuck ferment management, a winemaker has no CTA to log a measurement in The Press. The tutor answers the question but does not close the loop to action.

The secondary failure is positioning. Free Run appears under "About & More" in the nav, which positions it as supplementary content rather than a primary pillar. The AI tutor is one of the platform's most differentiating features and should be discoverable from the primary nav.

#### Compliance AI (`/compliance`)

The Compliance AI is the platform's original differentiating feature and remains one of its strongest. The two-stage triage router (classifier + answer) is invisible to the user, which is correct. The response quality is high. The interface is simple and self-explanatory.

The primary human factors finding is a moderate one: the Compliance AI has no cross-reference to the Knowledge Platform's SOP library. A user who receives a Compliance AI answer about SO₂ management should be able to navigate directly to the SO₂ Management SOP. The two knowledge systems are currently siloed.

#### Knowledge Platform (`/knowledge`)

The Knowledge Platform is the most differentiated feature on the platform and the least discoverable. It is not in the main nav. A user who has not been explicitly directed to `/knowledge` cannot find it.

The platform contains the SOP library, Decision Logic, Tribal Knowledge capture, Vintage Lessons Log, and Training Records. The SOP library was seeded with 7 core SOPs in June 2026 and is the primary source for the Free Run AI tutor. The tribal knowledge and decision logic capture layers are the platform's retention moat — once a winery has captured three vintages of reasoning in Ownology, that data is not portable to any other system.

The primary human factors finding is discoverability. The secondary finding is the absence of outbound bridges: a winemaker reading a Fermentation Management SOP has no link to the Free Run lesson on fermentation chemistry, and no CTA to log a measurement in The Press.

---

## Part IV — The Value Proposition

### For Boutique Winery Operators

The boutique winery operator — typically the owner, head winemaker, or both — faces a specific set of problems that no existing software solves. They make consequential decisions under time pressure with incomplete information. They carry institutional knowledge that is not written down anywhere. They have compliance obligations across multiple regulatory frameworks that are fragmented and hard to navigate. And they are typically working on a phone in a cellar, not at a desk.

Ownology's value proposition for this user is:

> **Ownology is the vintage log that thinks.** It captures every cellar decision, surfaces the reasoning behind it, answers your questions from your own documents, and tells you what your regulatory obligations are — all from a phone, in the cellar, during harvest.

The specific value drivers are:

**Institutional knowledge retention.** When a winemaker leaves, their knowledge stays. The Decision Logic and Tribal Knowledge layers capture the reasoning behind every SOP — why EC1118, why peracetic acid, why Tank 3 runs 2°C hot. This is the switching-cost moat: after three vintages of captured reasoning, Ownology is irreplaceable.

**Compliance confidence.** The Compliance AI covers Australian state-by-state regulatory requirements in one place. A winemaker in SA asking about SO₂ limits, a winery in WA asking about export documentation, a home winemaker in QLD asking about personal use limits — all answered in seconds, with citations.

**Harvest-day decision support.** The AI tutor answers operational questions from the SOP library. "My fermentation has stalled at 1.020 SG — what should I do?" gets a grounded answer from the Red Wine Fermentation SOP, not a generic LLM response. The AWRI fact sheet on stuck fermentation is cited for deeper reading.

**The AWRI relationship.** Ownology does not compete with the AWRI. It surfaces the right AWRI resource at the right moment. When a question exceeds what the SOP library can answer, the tutor cites the relevant AWRI fact sheet and links to it. This positions Ownology as the intelligent triage layer between the winemaker and the authoritative source — a position the AWRI itself does not occupy.

### For Home Winemakers

The home winemaker market is large, underserved, and growing. The garagiste movement in Australia, New Zealand, and the United States represents tens of thousands of hobbyist winemakers who make wine in quantities from 20 to 500 litres per year. They have the same questions as commercial winemakers — fermentation management, SO₂ additions, equipment sanitation, stuck ferments — but none of the institutional support.

Ownology's value proposition for this user is:

> **Ownology is the winemaking knowledge you don't have yet.** Ask it anything about your kit, your ferment, or your equipment. It knows the science, the procedure, and the common faults — and it tells you what to do next.

The specific value drivers are:

**Immediate answers to operational questions.** "My fermentation has stalled at 1.020 SG — what should I do?" answered in seconds, from a phone, without a forum post or a phone call to a more experienced winemaker.

**Equipment-specific guidance.** The home winemaker knowledge base covers the Big Mouth Bubbler, the 23L carboy, the standard kit wine schedule, and the common faults associated with each. This is content that the AWRI does not produce and that no other platform provides.

**A pathway to deeper knowledge.** The CSU Academic Backbone in Free Run provides a structured reference to the university-level wine science curriculum. A home winemaker who wants to understand why their fermentation stalled can follow the link to WSC202 Wine Production 1 and understand the science behind the answer.

### The Competitive Position

The competitive landscape as of May 2026 shows no direct competitor in the specific intersection of operational logging, AI-grounded decision support, and institutional knowledge capture. The closest competitors are:

| Competitor | What they do | What they don't do |
|---|---|---|
| InnoVint | Enterprise winery management, batch tracking, compliance reporting | AI question answering, institutional knowledge capture, mobile-first cellar design |
| Vintrace | Production management, inventory, export documentation | AI decision support, tribal knowledge capture, home winemaker market |
| WineryCopilot | AI-generated winery marketing copy | Operational logging, compliance, knowledge management |
| AWRI | Authoritative wine science research, fact sheets, helpdesk | Operational logging, personalised decision support, institutional knowledge capture |

Ownology's defensible position is the intersection that none of these occupy: **the operational log that is also a knowledge management system, with an AI layer that reasons over both.**

---

## Part V — Sprint 8 Priorities

The Human Factors assessment identifies the following as the highest-priority actions for Sprint 8, ordered by value score (Impact / Effort):

| Item | Action | Impact | Effort | Value Score |
|---|---|---|---|---|
| S8-A | Add `/knowledge` to main nav | 5 | 1 | 5.00 |
| S8-B | Remove Build Index from nav | 4 | 1 | 4.00 |
| S8-I | Post-login redirect to `/guide` for new users | 4 | 1 | 4.00 |
| S8-C | Do-to-Know bridge: contextual SOP chips on event log entries | 5 | 2 | 2.50 |
| S8-H | Add `quick_steps` field to knowledge_sops | 4 | 2 | 2.00 |
| S8-D | Know-to-Learn bridge: "Learn more" links from SOPs to Free Run | 4 | 2 | 2.00 |
| S8-E | Learn-to-Do bridge: "Try it now" CTAs from Free Run to The Press | 4 | 2 | 2.00 |
| S8-F | Build `/guide` page: workflow map, getting started checklist | 5 | 4 | 1.25 |

The governing principle for Sprint 8 is the same as for all previous sprints: **value engineering — do the most with the least. Extend before building new.**

The most important single action is S8-A: adding the Knowledge Platform to the main nav. The most differentiated feature on the platform is currently invisible to new users. This is a one-line change with a value score of 5.00.

The most important architectural action is S8-C: the Do-to-Know bridge. The vintage log and the knowledge platform are the two pillars that define Ownology's competitive position. Connecting them — so that a winemaker logging a racking event is prompted to consult the Racking SOP — is the action that makes the platform's value proposition tangible in the moment of use.

---

## Part VI — The AWRI Relationship

### The Correct Positioning

The AWRI is the authoritative source for Australian wine science — 70+ years of research, a full library, a helpdesk, and 200+ webinars. Ownology does not compete with this. The correct relationship is: **Ownology surfaces the right AWRI resource at the right moment.**

This means the AI tutor should:

1. Answer the immediate operational question from the SOP library (the cellar-floor answer)
2. Cite the relevant AWRI fact sheet for deeper reading ("For more on this, the AWRI has a detailed fact sheet: [Procedure for rescue slow or stuck fermentation]")
3. Know when to say "the AWRI helpdesk is the right place for this" — for complex analytical or research questions that go beyond what an SOP can cover

This positions Ownology as the intelligent triage layer between the winemaker and the authoritative source — a position that adds genuine value and does not require Ownology to compete with the AWRI's depth of research.

### The 8 AWRI Fact Sheets Downloaded

The following AWRI fact sheets have been downloaded to `references/awri-fact-sheets/` as primary sources for future SOP development. They are not reproduced in Ownology's content; they are the reference library the AI tutor draws from when deciding which AWRI resource to cite.

| Fact Sheet | SOP it supports | AWRI URL |
|---|---|---|
| Procedure for rescue slow or stuck fermentation | Stuck Ferment SOP | awri.com.au/wp-content/uploads/TN05.pdf |
| Malolactic fermentation in red wine | MLF Management SOP | awri.com.au/wp-content/uploads/2020/09/MLF-in-red-wine.pdf |
| Achieving successful malolactic fermentation | MLF Management SOP | awri.com.au/wp-content/uploads/2011/06/Malolactic-fermentation.pdf |
| Controlling Brettanomyces during winemaking | Wine Faults SOP | awri.com.au/wp-content/uploads/2014/05/Brett-fact-sheet.pdf |
| Avoiding spoilage from lactic acid bacteria | Wine Faults SOP | awri.com.au/wp-content/uploads/2011/06/Avoiding-spoilage-from-LAB.pdf |
| Protein stability | White Wine Fining SOP | awri.com.au/wp-content/uploads/2020/03/protein-stability-fact-sheet.pdf |
| Managing Botrytis-infected fruit | Harvest Decision SOP | awri.com.au/wp-content/uploads/managing_botrytis_infected_fruit_fact_sheet.pdf |
| Reducing ethanol levels in wine | Winemaking Adjustments SOP | awri.com.au/wp-content/uploads/Reducing-ethanol-levels-in-wine.pdf |

---

## Appendix — Design Requirements Coverage

All 27 original design requirements are at Full coverage as of Sprint 7. The three Sprint 8 gaps (DR-25, DR-26, DR-27) address cross-pillar navigation, induction experience, and workflow discoverability — the connective tissue that makes the four-pillar architecture legible to a new user.

| DR | Requirement | Sprint Closed | Coverage |
|---|---|---|---|
| DR-01 | Consistent Wine Quality | Sprint 1 | Full |
| DR-02 | Fermentation Monitoring | Sprint 2 | Full |
| DR-03 | Contamination Risk | Sprint 6 | Full |
| DR-04 | Inventory Visibility | Sprint 6 | Full |
| DR-05 | Weather Uncertainty | Sprint 3 | Full |
| DR-06 | Disease & Pest Management | Sprint 6 | Full |
| DR-07 | Harvest Timing | Sprint 2 | Full |
| DR-08 | Tank and Barrel Management | Sprint 2 | Full |
| DR-09 | Labour Shortages | Sprint 1 | Full |
| DR-10 | Equipment Downtime | Sprint 6 | Full |
| DR-11 | Regulatory Compliance | Sprint 6 | Full |
| DR-12 | Traceability | Sprint 2 | Full |
| DR-13 | Packaging Material Shortages | Sprint 3 | Full |
| DR-14 | Cost Management | Sprint 3 | Full |
| DR-15 | Forecasting Demand | Sprint 4 | Full |
| DR-16 | Direct-to-Consumer Sales | Sprint 3 | Full |
| DR-17 | Inventory Aging | Sprint 4 | Full |
| DR-18 | Disconnected Systems | Sprint 1 | Full |
| DR-19 | Poor Real-Time Visibility | Sprint 1 | Full |
| DR-20 | Export & Reporting | Sprint 1 | Full |
| DR-21 | Knowledge Transfer | Sprint 7 | Full |
| DR-22 | Onboarding & Training | Sprint 7 | Partial — Sprint 8 |
| DR-23 | Mobile Accessibility | Sprint 5 | Full |
| DR-24 | Seasonal Workflow Guidance | Sprint 7 | Partial — Sprint 8 |
| DR-25 | Cross-Pillar Navigation | Not yet built | Gap — Sprint 8 |
| DR-26 | Induction Experience | Not yet built | Gap — Sprint 8 |
| DR-27 | Workflow Discoverability | Not yet built | Gap — Sprint 8 |

---

*This document is maintained in `references/hf-assessment-value-proposition.md`. It should be updated after each sprint to reflect the current state of the platform and any changes to the value proposition or competitive position.*
