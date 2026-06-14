# Ownology — Full-Platform Human Factors Audit

**Version:** 1.0
**Date:** June 2026
**Scope:** All nine major product surfaces, post-Sprint 7
**Methodology:** 10-lens HF framework (adapted from ISO 9241-11 usability principles and Nielsen's heuristics)
**Reference:** Value Engineering Roadmap v2 (`references/value-engineering-roadmap.md`), Sprint 8 HF Assessment (`ownology-sprint8-hf-assessment.md`)

---

## Audit Framework

This audit applies ten human factors lenses to each of the nine major product surfaces. The lenses are:

1. **Cognitive Load** — Does the surface minimise the mental effort required to complete a task?
2. **Error Prevention** — Does the surface prevent or catch common user errors before they have consequences?
3. **Learnability** — Can a new user understand the surface's purpose and core workflow within 60 seconds?
4. **Efficiency** — Can an expert user complete their most common task with minimal steps?
5. **Feedback & Status** — Does the surface communicate system state clearly and promptly?
6. **Consistency** — Are interaction patterns, terminology, and visual language consistent with the rest of the platform?
7. **Accessibility** — Is the surface usable on mobile, in low-light cellar conditions, with gloved hands?
8. **Error Recovery** — If a user makes a mistake, can they recover without data loss?
9. **Discoverability** — Can a user find this surface from the main nav or from a related surface without help?
10. **Strategic Alignment** — Does the surface serve the platform's four-pillar architecture (Do/Know/Learn/Guide)?

Each finding is rated: **Pass**, **Minor** (low-priority improvement), **Moderate** (should fix before Sprint 9), or **Critical** (must fix in Sprint 8).

---

## Surface 1 — Home Page & Navigation (`/`)

The Home page serves two distinct user populations: prospective users encountering Ownology for the first time, and authenticated users returning to the platform. The navigation architecture must serve both without compromise.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Moderate** | The primary nav has five columns (Features, How It Works, See Demo, Why Ownology, Build Index) plus a "More" dropdown with three sub-columns. The total nav item count is approximately 22 items. This exceeds Miller's Law (7 ± 2) for working memory. A returning winemaker looking for The Press must scan 22 items to find it. |
| Error Prevention | Pass | No form inputs on the home page; error prevention is not applicable. |
| Learnability | **Critical** | The nav labels "In the Cellar," "Compliance," and "About & More" are not self-explanatory to a first-time winery user. "In the Cellar" is evocative but does not communicate that it contains the core operational tools. A new user cannot determine from the nav alone that Ownology has four distinct pillars. |
| Efficiency | **Moderate** | A returning user's most common action is navigating to The Press. This requires: hover on "More" dropdown, scan three columns, click "The Press." Three interactions to reach the primary work surface. A direct "Go to App" CTA for authenticated users would reduce this to one interaction. |
| Feedback & Status | **Minor** | The "What's New" ribbon links to The Press but does not indicate whether the user is logged in. An authenticated user sees the same ribbon as an unauthenticated visitor. |
| Consistency | **Critical** | The "Build Index" link appears in the primary nav alongside marketing links (Features, How It Works). This is an internal testing tool that should not be visible to end users. Its presence creates confusion about the platform's intended audience. |
| Accessibility | **Minor** | The nav dropdown requires hover interaction on desktop. On mobile, the hamburger menu is implemented but the three-column layout collapses to a flat list, which is appropriate. Touch targets appear adequate. |
| Error Recovery | Pass | No destructive actions on the home page. |
| Discoverability | **Critical** | The Knowledge Platform (`/knowledge`) is not in the main nav. A user who has never been told about the Knowledge Platform cannot discover it from the home page. This is the highest-priority discoverability failure on the platform. |
| Strategic Alignment | **Moderate** | The nav architecture reflects the original two-pillar structure (Do + Compliance). The four-pillar architecture (Do/Know/Learn/Guide) is not represented. Free Run appears under "About & More" rather than as a primary pillar. |

**Sprint 8 Actions Required:**
- S8-A: Add /knowledge to main nav under a new "Knowledge" column or as a top-level item
- S8-B: Remove Build Index from nav
- S8-I: Add post-login redirect to /guide for new users
- Moderate: Reduce nav item count by consolidating marketing pages; promote The Press as a direct CTA for authenticated users

---

## Surface 2 — The Press (`/the-press`)

The Press is the operational core of the platform — the primary surface for vintage logging, batch management, barrel tracking, and packaging inventory. It is the most mature surface and the one winemakers will use most frequently during harvest.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Moderate** | The Press has seven tabs: Log, Calculations, Batches, Calendar, Barrels, Packaging, Export Docs. Seven tabs is at the upper limit of comfortable tab navigation. The Calculations tab contains four sub-calculators (SO2, acid, sugar, YAN) which are not immediately visible from the tab label. |
| Error Prevention | **Moderate** | The VintageEntrySheet does not validate that a tank name has been entered before allowing event type selection. A user can select "Bottling Run" without specifying a tank, which would create an orphaned log entry. |
| Learnability | **Minor** | The tab order (Log, Calculations, Batches, Calendar, Barrels, Packaging, Export Docs) does not reflect the frequency of use. Most users will use Log and Batches far more than Export Docs. The most-used tabs should be leftmost. |
| Efficiency | Pass | The Quick Entry shortcut (`/quick-entry`) provides a fast path for harvest-day logging. The VintageEntrySheet is well-structured for rapid entry. The Fermentation Watch banner surfaces active tanks immediately. |
| Feedback & Status | Pass | The Fermentation Watch banner provides clear status for active ferment tanks. Tank Summary cards show days-since-inoculation and last event type. The colour-coded status rings (amber/green/grey) are effective. |
| Consistency | **Minor** | The "Export Log" button in the Log tab and the "Export Docs" tab both relate to export functionality but are in different locations. A user looking for export functionality may not find both. |
| Accessibility | **Minor** | The VintageEntrySheet form fields are appropriately sized for touch input. However, the tab bar on mobile may be difficult to navigate with gloved hands — the touch targets are approximately 40px wide, which is at the minimum recommended size. |
| Error Recovery | **Moderate** | There is no confirmation dialog before deleting a log entry. A misclick on a delete button in a harvest context (where the user may be wearing gloves and working quickly) could result in permanent data loss. |
| Discoverability | **Minor** | The Barrels tab is not prominently signposted from the main nav or from the Batch Book. A user who has registered barrels but doesn't know about the Barrels tab may not find it. |
| Strategic Alignment | **Critical** | The Press has no cross-pillar bridges to the Knowledge Platform. A winemaker logging a Racking event has no prompt to consult the Racking SOP. A winemaker logging an Addition has no link to the relevant SOP for that addition type. This is the primary Do-to-Know bridge gap. |

**Sprint 8 Actions Required:**
- S8-C: Add contextual SOP chips to event log entries (Do to Know bridge)
- Moderate: Add delete confirmation dialog for log entries
- Moderate: Validate tank name before event type selection in VintageEntrySheet
- Minor: Reorder tabs by frequency of use

---

## Surface 3 — Compliance AI (`/compliance`)

The Compliance AI is the platform's original differentiating feature — an AI assistant scoped to Australian winery regulatory and practical winemaking guidance. It uses a two-stage triage router to distinguish regulatory queries from practical cellar questions.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | Pass | The Compliance AI interface is simple: a text input, a jurisdiction filter, and a response area. The two-stage triage router is invisible to the user, which is correct — complexity should be hidden. |
| Error Prevention | **Minor** | The jurisdiction filter defaults to "All States." A user in Western Australia asking about WA-specific regulations may receive a response that includes irrelevant interstate information before the relevant WA content. A default jurisdiction based on user profile would reduce this. |
| Learnability | Pass | The interface is self-explanatory. The example queries in the placeholder text guide new users effectively. |
| Efficiency | Pass | The AI response is typically generated within 3–5 seconds. The response is formatted with clear headings and bullet points. The "Ask a follow-up" affordance is present. |
| Feedback & Status | **Minor** | The loading state during AI response generation shows a spinner but no progress indication. For queries that take longer than 5 seconds, a "Still thinking..." message would reduce user anxiety. |
| Consistency | **Minor** | The Compliance AI uses a different visual treatment (chat-style interface) from the rest of the platform (form-based). This is appropriate for the use case but creates a mild consistency gap. |
| Accessibility | Pass | The text input is large and touch-friendly. The response area scrolls appropriately on mobile. |
| Error Recovery | Pass | If the AI returns an unhelpful response, the user can rephrase and resubmit. There is no destructive action in this surface. |
| Discoverability | **Moderate** | The Compliance AI is under "Compliance" in the nav, which is appropriate. However, it is not surfaced from within The Press as a "Get guidance" option when a winemaker encounters an unfamiliar situation. A contextual link from The Press to the Compliance AI would increase its use. |
| Strategic Alignment | **Moderate** | The Compliance AI is positioned as a standalone tool rather than as part of the Know pillar. Its knowledge base overlaps significantly with the Knowledge Platform's SOP library, but there are no cross-references between the two. A user who receives a Compliance AI answer about SO2 management should be able to navigate directly to the SO2 Management SOP. |

**Sprint 8 Actions Required:**
- Moderate: Add a "View related SOP" link in Compliance AI responses when a relevant SOP exists
- Minor: Add jurisdiction detection or profile-based default for the jurisdiction filter

---

## Surface 4 — Knowledge Platform (`/knowledge`)

The Knowledge Platform is the newest major surface, built in Sprint 7. It contains the SOP library (31 SOPs across 8 categories), Decision Logic, Tribal Knowledge capture, Vintage Lessons Log, and Training Records. It is the Know pillar.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Moderate** | The Knowledge Platform landing page presents 8 SOP categories plus 4 additional sections (Decision Logic, Tribal Knowledge, Vintage Lessons, Training Records) as a grid. This is 12 entry points on a single page. The visual hierarchy does not clearly distinguish the SOP library from the meta-knowledge sections. |
| Error Prevention | Pass | The Knowledge Platform is primarily a read surface. The Tribal Knowledge and Training Records sections have write affordances, but these are low-risk (no irreversible actions). |
| Learnability | **Moderate** | The distinction between "Decision Logic" and "Tribal Knowledge" is not immediately clear to a new user. Decision Logic captures the reasoning behind decisions; Tribal Knowledge captures experience and heuristics. These are meaningfully different, but the labels alone do not communicate the difference. A one-sentence description beneath each section header would resolve this. |
| Efficiency | Pass | The SOP search is functional. Category navigation is clear. The SOP detail view is well-structured with category, description, and content. |
| Feedback & Status | **Minor** | When a user adds a Tribal Knowledge entry, there is no confirmation that the entry was saved. A toast notification on save would provide appropriate feedback. |
| Consistency | **Minor** | The Knowledge Platform uses a slightly different card style from The Press (lighter background, different border treatment). This is not a serious inconsistency but is noticeable when switching between surfaces. |
| Accessibility | Pass | The Knowledge Platform is primarily a reading surface. Text sizes are appropriate. The category grid is responsive. |
| Error Recovery | Pass | No destructive actions in the primary SOP library. Tribal Knowledge and Training Records entries can be reviewed before submission. |
| Discoverability | **Critical** | The Knowledge Platform is not in the main nav. A user who has not been explicitly directed to `/knowledge` cannot discover it from the home page or from any other surface. This is the most severe discoverability failure on the platform. |
| Strategic Alignment | **Critical** | The Knowledge Platform has no outbound bridges to the Learn pillar (Free Run) or the Do pillar (The Press). A winemaker reading a Fermentation Management SOP has no link to the Free Run lesson on fermentation chemistry, and no CTA to log a measurement in The Press. The Know pillar is internally complete but externally isolated. |

**Sprint 8 Actions Required:**
- S8-A: Add /knowledge to main nav (Critical — immediate)
- S8-D: Add "Learn more" links from SOPs to relevant Free Run lessons (Know to Learn bridge)
- S8-H: Add quick_steps field to knowledge_sops for cellar-ready summaries
- Moderate: Add one-sentence descriptions to Decision Logic and Tribal Knowledge section headers

---

## Surface 5 — Free Run (`/free-run`)

Free Run is the Learn pillar — the education surface for winemakers. It contains the CSU Academic Backbone (6 subject cards), a lesson library (mostly placeholder), and winemaking calculators. The Sprint 7 bridge banner links to the Knowledge Platform.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Moderate** | The Free Run page presents lesson cards, CSU subject cards, and a bridge banner in a single scrolling view. The lesson cards are mostly locked placeholders, which creates a visual field of unavailable content. A user scanning the page sees more locked content than available content, which may create a perception of incompleteness. |
| Error Prevention | Pass | Free Run is a read-only surface. No destructive actions. |
| Learnability | **Minor** | The distinction between "lessons" and "CSU subject cards" is not immediately clear. The CSU subject cards are academic reference material; the lessons are intended to be interactive learning modules. The visual treatment is similar, which blurs the distinction. |
| Efficiency | **Moderate** | The winemaking calculators (SO2, acid, sugar, YAN) are available in The Press Calculations tab, not in Free Run. A winemaker who discovers Free Run as a learning resource may not find the calculators there. The calculators could be surfaced in Free Run as a "Tools" section to reinforce the Learn-to-Do connection. |
| Feedback & Status | **Minor** | The locked lesson cards do not indicate when content will be available. A "Coming soon" label or a progress indicator (e.g., "3 of 12 lessons available") would set appropriate expectations. |
| Consistency | **Minor** | The bridge banner to the Knowledge Platform (added in Sprint 7) uses a different visual treatment from the rest of the page. It is effective but slightly jarring. |
| Accessibility | Pass | The page is responsive and readable on mobile. The CSU subject cards are appropriately sized for touch. |
| Error Recovery | Pass | No destructive actions. |
| Discoverability | **Moderate** | Free Run appears under "About & More" in the nav, which positions it as a secondary feature rather than a primary pillar. Its placement suggests it is supplementary content rather than a core product surface. |
| Strategic Alignment | **Critical** | Free Run has no outbound bridge to The Press (Learn to Do). A winemaker who completes a lesson on fermentation management has no CTA to log a measurement or start a new tank record. The bridge banner to the Knowledge Platform (Know) exists, but the bridge to The Press (Do) does not. |

**Sprint 8 Actions Required:**
- S8-E: Add "Try it now" CTAs from Free Run lessons to The Press (Learn to Do bridge)
- Moderate: Add a progress indicator for lesson availability
- Moderate: Reposition Free Run in the nav to reflect its status as a primary pillar

---

## Surface 6 — Vineyard (`/vineyard`)

The Vineyard page is the platform's most domain-specific surface — a block register with observation logging for disease, pest, and weather events. It was built in Sprint 4 and enhanced in Sprint 6 with structured disease/pest event types.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | Pass | The Vineyard page has a clear two-panel structure: block register on the left, observation log on the right. The block register is compact and scannable. |
| Error Prevention | **Minor** | The block area field accepts free text (e.g., "2.3 ha"). A numeric-only field with a unit selector would prevent inconsistent data entry (e.g., "2.3", "2.3ha", "2.3 hectares"). |
| Learnability | Pass | The block register and observation log are self-explanatory. The disease/pest event type dropdown is well-labelled. |
| Efficiency | Pass | Adding a new block or observation is a single-step form. The observation log is filterable by block and event type. |
| Feedback & Status | Pass | Block records show variety, area, and observation count. The observation log shows event type, date, and severity with colour-coded badges. |
| Consistency | Pass | The Vineyard page uses the same card and form patterns as The Press. The visual language is consistent. |
| Accessibility | **Minor** | The block register on mobile requires horizontal scrolling to see all columns. A responsive card layout would be more appropriate for mobile use. |
| Error Recovery | **Minor** | Deleting a block record also deletes all associated observations. There is no warning about this cascade. A confirmation dialog should list the number of observations that will be deleted. |
| Discoverability | Pass | Vineyard is in the main nav under "In the Cellar." It is appropriately positioned as a primary operational tool. |
| Strategic Alignment | **Minor** | The Vineyard page has no bridge to the Knowledge Platform's disease/pest SOPs. A winemaker logging a powdery mildew observation has no prompt to consult the Powdery Mildew Management SOP. This is a secondary Do-to-Know bridge opportunity. |

**Sprint 8 Actions Required:**
- Minor: Add cascade warning on block deletion
- Minor: Add contextual SOP chip for disease/pest observations (secondary Do-to-Know bridge)

---

## Surface 7 — Cellar Tasks (`/cellar-tasks`)

Cellar Tasks is the platform's task management surface — a tracker for cleaning, maintenance, and operational tasks with equipment registration, AI-generated task lists, and vessel linkage.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Minor** | The Cellar Tasks page presents equipment items and tasks in a combined view. On a winery with 20+ equipment items, the equipment list becomes long. A filter by equipment type or a search field would reduce cognitive load. |
| Error Prevention | Pass | Task creation requires equipment selection and task type. The vessel linkage field is optional, which is appropriate. |
| Learnability | Pass | The task creation flow is straightforward. The AI task generator is well-labelled ("Generate cleaning protocol for this equipment"). |
| Efficiency | Pass | The preset loader (20 common cellar tasks in one tap) is a significant efficiency win for new users. The AI task generator reduces the cognitive burden of writing task descriptions. |
| Feedback & Status | Pass | Task cards show status (pending/complete), due date, and assigned-to field. Completed tasks are visually distinguished. |
| Consistency | Pass | Cellar Tasks uses the same card and form patterns as The Press and Vineyard. |
| Accessibility | Pass | Task cards are appropriately sized for touch. The status toggle is a large tap target. |
| Error Recovery | **Minor** | Completing a task is irreversible — there is no "undo complete" action. For tasks completed by mistake, the only recovery is to create a new task. An undo option (within 5 seconds of completion) would be appropriate. |
| Discoverability | Pass | Cellar Tasks is in the main nav under "In the Cellar." |
| Strategic Alignment | **Minor** | Cellar Tasks has no bridge to the Knowledge Platform's cleaning and sanitation SOPs. A user creating a cleaning task for a tank has no prompt to consult the Tank Cleaning SOP. This is a tertiary Do-to-Know bridge opportunity. |

**Sprint 8 Actions Required:**
- Minor: Add contextual SOP chip for cleaning tasks (tertiary Do-to-Know bridge)
- Minor: Add undo option for task completion

---

## Surface 8 — Production Dashboard (`/dashboard`)

The Production Dashboard is the platform's command centre — KPI cards for active tanks, litres in ferment, bottling queue, and cellar value, plus the multi-vintage comparison table and production planning section.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | **Minor** | The dashboard presents 4 KPI cards, a production planning section with 3 sub-cards, a multi-vintage comparison table, and a cellar value section. This is a substantial amount of information on a single page. The visual hierarchy is clear, but the page is long on mobile. |
| Error Prevention | Pass | The dashboard is read-only. No destructive actions. |
| Learnability | **Minor** | The "Cellar Value" section shows an ACTUAL badge when a cost-per-litre is set and an industry-range estimate otherwise. The distinction between ACTUAL and estimated values is important but may not be immediately clear to a new user. A tooltip explaining the badge would help. |
| Efficiency | Pass | The dashboard is the fastest way to get a cross-vintage overview. The multi-vintage comparison table is sortable and filterable. |
| Feedback & Status | Pass | KPI cards update in real time from the database. The bottling queue card links to the relevant tank records. |
| Consistency | Pass | The dashboard uses the same card and table patterns as the rest of the platform. |
| Accessibility | **Minor** | The multi-vintage comparison table on mobile requires horizontal scrolling. A card-based mobile layout for the table would be more appropriate. |
| Error Recovery | Pass | No destructive actions. |
| Discoverability | Pass | Dashboard is in the main nav under "In the Cellar." |
| Strategic Alignment | **Minor** | The dashboard has no bridge to the Knowledge Platform. A winery owner reviewing the cellar value section has no prompt to review the relevant SOPs for the wines in production. This is a low-priority bridge opportunity. |

**Sprint 8 Actions Required:**
- Minor: Add tooltip to ACTUAL/estimated badge in Cellar Value section
- Minor: Improve mobile layout for multi-vintage comparison table

---

## Surface 9 — Quick Entry (`/quick-entry`)

Quick Entry is the platform's harvest-day rapid logging surface — a simplified form optimised for mobile use during active harvest, with a reduced event type set and minimal navigation.

### Findings

| Lens | Rating | Finding |
|---|---|---|
| Cognitive Load | Pass | Quick Entry is deliberately minimal. The event type set is reduced to 6 types (measurement, addition, racking, inoculation, observation, other). The form fields are large and touch-friendly. |
| Error Prevention | **Moderate** | Quick Entry bypasses authentication in the development build (`isLoggedIn = true`). This bypass must be removed before production launch. In production, Quick Entry should require authentication to prevent unauthorised log entries. |
| Learnability | Pass | The Quick Entry interface is self-explanatory. The large event type buttons and simplified form make it immediately usable. |
| Efficiency | Pass | Quick Entry is the fastest path to logging a measurement or addition. The tank name field uses autocomplete from existing tank names. |
| Feedback & Status | Pass | The form provides clear success feedback on submission. The entry appears in The Press log immediately. |
| Consistency | **Minor** | Quick Entry uses a slightly different visual treatment (larger buttons, more whitespace) than The Press. This is intentional for mobile use but creates a mild consistency gap. |
| Accessibility | Pass | Quick Entry is designed for mobile use. Touch targets are large. The form is single-column and scrolls naturally. |
| Error Recovery | **Minor** | Quick Entry does not have a draft save feature. If a user is interrupted mid-entry (e.g., a phone call during harvest), the form state is lost. A localStorage draft save would prevent data loss. |
| Discoverability | Pass | Quick Entry is in the main nav under "In the Cellar." |
| Strategic Alignment | **Minor** | Quick Entry has no bridge to the Knowledge Platform. A cellar hand logging a measurement has no prompt to consult the relevant SOP. Given the harvest-day context, this bridge should be passive (a chip, not a prompt) to avoid disrupting the rapid entry flow. |

**Sprint 8 Actions Required:**
- Critical: Remove authentication bypass before production launch
- Minor: Add localStorage draft save for interrupted entries
- Minor: Add passive SOP chip for relevant event types

---

## Cross-Surface Findings

### Finding X-1: The Four-Pillar Architecture is Not Visible in the Nav

The most significant cross-surface finding is that the platform's four-pillar architecture (Do/Know/Learn/Guide) is not represented in the navigation. The nav groups features by operational category ("In the Cellar," "Compliance," "About & More") rather than by pillar. This means a user cannot understand the platform's strategic structure from the nav alone.

**Recommendation:** Restructure the nav to reflect the four pillars. The primary nav should have four top-level items: **Do** (The Press, Cellar Tasks, Vineyard, Quick Entry, Dashboard), **Know** (Knowledge Platform), **Learn** (Free Run), and **Guide** (once built). This is a Sprint 8 item.

### Finding X-2: No Cross-Pillar Bridges Exist

None of the nine surfaces has a deliberate UX bridge to another pillar. The Sprint 7 bridge banner in Free Run (linking to the Knowledge Platform) is the only cross-pillar link on the platform, and it is a one-way, non-contextual link. There are no contextual bridges — links that appear in the context of a specific task and point to a specific related resource in another pillar.

**Recommendation:** Implement contextual SOP chips on event log entries (Do to Know), "Learn more" links from SOPs to Free Run (Know to Learn), and "Try it now" CTAs from Free Run to The Press (Learn to Do). These are Sprint 8 items S8-C, S8-D, and S8-E.

### Finding X-3: The Build Index Must Be Removed Before Launch

The Build Index (`/build-index`) is an internal testing tool that lists every page, feature, and DR reference on the platform. It is linked from the primary nav. This must be removed from the nav before the platform is presented to end users. The page itself can remain for internal use, but the nav link must be removed.

**Recommendation:** Remove the Build Index link from the nav. This is Sprint 8 item S8-B.

### Finding X-4: Authentication Bypass in Quick Entry

The Quick Entry page bypasses authentication in the development build. This is appropriate for build-phase testing but must be removed before production launch. If this bypass is present in production, any unauthenticated user can create log entries.

**Recommendation:** Remove the authentication bypass from Quick Entry before launch. This is a Critical finding.

---

## Audit Summary

The table below summarises all findings by surface and severity.

| Surface | Critical | Moderate | Minor | Pass |
|---|---|---|---|---|
| Home / Nav | 3 | 1 | 2 | 2 |
| The Press | 1 | 3 | 2 | 4 |
| Compliance AI | 0 | 2 | 2 | 6 |
| Knowledge Platform | 2 | 1 | 2 | 5 |
| Free Run | 1 | 2 | 2 | 5 |
| Vineyard | 0 | 0 | 3 | 7 |
| Cellar Tasks | 0 | 0 | 3 | 7 |
| Dashboard | 0 | 0 | 3 | 7 |
| Quick Entry | 1 | 1 | 3 | 5 |
| **Cross-Surface** | **2** | **0** | **0** | — |
| **Total** | **10** | **10** | **22** | **49** |

### Critical Findings Summary (Sprint 8 Must-Fix)

1. **Nav: /knowledge not in nav** — The Knowledge Platform is invisible from the home page. Fix: S8-A.
2. **Nav: Build Index in nav** — Internal testing tool visible to end users. Fix: S8-B.
3. **Nav: Learnability failure** — Nav does not communicate four-pillar architecture. Fix: Sprint 8 nav restructure.
4. **Knowledge Platform: Not in nav** — Duplicates finding 1 from the Knowledge Platform perspective.
5. **Knowledge Platform: No outbound bridges** — Know pillar isolated from Learn and Do. Fix: S8-D.
6. **Free Run: No Learn-to-Do bridge** — No CTA from lessons to The Press. Fix: S8-E.
7. **The Press: No Do-to-Know bridge** — No SOP chips on event log entries. Fix: S8-C.
8. **Quick Entry: Auth bypass** — Must be removed before production launch.
9. **Cross-Surface: No cross-pillar bridges** — Duplicates findings 5, 6, 7 at the platform level.
10. **Cross-Surface: Build Index in nav** — Duplicates finding 2 at the platform level.

### Moderate Findings Summary (Sprint 8 Should-Fix)

1. The Press: No delete confirmation on log entries
2. The Press: No tank validation before event type selection
3. Compliance AI: No jurisdiction default from user profile
4. Compliance AI: No cross-reference to Knowledge Platform SOPs
5. Knowledge Platform: Decision Logic and Tribal Knowledge labels need descriptions
6. Free Run: Locked lesson cards create perception of incompleteness
7. Free Run: Calculators not surfaced in Free Run
8. Home: Nav item count exceeds cognitive load threshold
9. Home: No direct CTA for authenticated users to reach The Press
10. Quick Entry: No localStorage draft save

---

*This audit is maintained in `references/platform-hf-audit.md`. It should be updated after each sprint to reflect resolved findings and any new findings introduced by new features.*
