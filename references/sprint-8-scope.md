# Ownology — Sprint 8 Scope Document

**Version:** 1.0
**Date:** June 2026
**Sprint Name:** The Triangulation Sprint
**Status:** Ready to build
**Input documents:**
- Value Engineering Roadmap v2 (`references/value-engineering-roadmap.md`)
- Full-Platform HF Audit (`references/platform-hf-audit.md`)
- Sprint 8 HF Assessment (`ownology-sprint8-hf-assessment.md`)

---

## Sprint 8 in One Sentence

Sprint 8 connects the three built pillars (Do, Know, Learn) through contextual UX bridges, builds the fourth pillar (Guide), fixes the navigation architecture, and removes internal testing artefacts before launch.

---

## Strategic Context

Seven sprints have produced a platform with 62 features, 27 design requirements at Full coverage, and four distinct product pillars. The problem is that three of those pillars are invisible from the navigation, none of them are connected by deliberate UX bridges, and the fourth pillar does not exist yet. A new user landing on Ownology for the first time cannot understand what the platform does, where to start, or how the pieces relate to each other.

Sprint 8 does not add features. It adds **coherence**. The work is: fix the navigation, build the bridges, build the Guide, and clean up the launch hygiene. Every item in Sprint 8 either makes the existing platform more discoverable, more connected, or more legible to a new user.

The value engineering principle applies: every item in Sprint 8 is either an extension of an existing component (bridges, nav update) or a new page that references existing data (Guide). No new database tables are required except one nullable field addition.

---

## Sprint 8 Items — Full Specification

### S8-A — Add /knowledge to Main Nav

**Priority:** Critical (Value Score: 5.00)
**Estimated effort:** 1 session
**DRs closed:** DR-25 (Cross-Pillar Navigation), DR-27 (Workflow Discoverability)

**Problem:** The Knowledge Platform (`/knowledge`) is not in the main navigation. A user who has not been explicitly directed to the URL cannot discover it. This is the highest-priority discoverability failure on the platform.

**Implementation:** In `client/src/pages/Home.tsx`, add a "Knowledge" item to the `KNOWLEDGE_NAV` array (or create a new nav column). The nav item should link to `/knowledge` and be labelled "Knowledge Platform" or "Know" depending on the nav restructure approach chosen.

**Acceptance criteria:**
- `/knowledge` is accessible from the main nav on both desktop and mobile
- The nav item is present in the "More" dropdown under an appropriate column
- The nav item is visible to both authenticated and unauthenticated users (the page itself handles auth gating)

---

### S8-B — Remove Build Index Link from Nav

**Priority:** Critical (Value Score: 4.00)
**Estimated effort:** 0.5 sessions (combined with S8-J)
**DRs closed:** Launch hygiene

**Problem:** The Build Index (`/build-index`) is an internal testing tool that is linked from the primary navigation. It lists every page, feature, and DR reference on the platform. This must not be visible to end users.

**Implementation:** In `client/src/pages/Home.tsx`, remove the Build Index entry from the `PRIMARY_NAV` array. The `/build-index` route in `App.tsx` can remain for internal access via direct URL — only the nav link is removed.

**Acceptance criteria:**
- Build Index link is not visible in the primary nav
- `/build-index` is still accessible via direct URL for internal testing
- No other nav items are affected

---

### S8-I — Post-Login Redirect to /guide for New Users

**Priority:** Critical (Value Score: 4.00)
**Estimated effort:** 1 session
**DRs closed:** DR-26 (Induction Experience)

**Problem:** New users land on the home page after authentication with no guidance on where to start. The Guide page (S8-F) will be the correct entry point for new users, but it must not interrupt returning users.

**Implementation:** In `client/src/App.tsx` or the auth callback handler, add a check after successful authentication: if `localStorage.getItem('ownology_guide_seen')` is null or undefined, redirect to `/guide`. On the Guide page, set `localStorage.setItem('ownology_guide_seen', 'true')` on mount. This ensures the redirect fires once per browser, not on every login.

**Note:** This item creates the `/guide` route stub. The full Guide page content is built in S8-F. The stub can be a simple "Getting Started" placeholder page that sets the localStorage flag and provides basic navigation.

**Acceptance criteria:**
- New users (no localStorage flag) are redirected to `/guide` after login
- Returning users (flag set) are not redirected
- The flag is set on the Guide page mount, not on redirect
- The redirect does not fire if the user navigates directly to a specific URL after login

---

### S8-J — Remove /build-index from Production Nav

**Priority:** High (Value Score: 3.00)
**Estimated effort:** Combined with S8-B
**DRs closed:** Launch hygiene

**Implementation:** Combined with S8-B. No additional work required beyond the S8-B implementation.

---

### S8-G — Update ownology-document-tree.md to Four-Pillar Architecture

**Priority:** High (Value Score: 3.00)
**Estimated effort:** 1 session
**DRs closed:** Documentation

**Problem:** The `ownology-document-tree.md` file still describes the Knowledge Platform as "Future SOP Feature — Planned Architecture" and does not reflect the four-pillar structure. It is the primary architecture reference document and is materially stale.

**Implementation:** Rewrite `references/ownology-document-tree.md` to reflect:
- The four-pillar architecture (Do/Know/Learn/Guide) as the top-level structure
- The current state of each pillar (Do: 7 surfaces; Know: /knowledge with 31 SOPs; Learn: /free-run with CSU backbone; Guide: Sprint 8 build)
- The cross-pillar bridge architecture (Sprint 8 additions)
- The updated route inventory (all routes in App.tsx as of Sprint 7)
- The DB schema summary (all tables including Sprint 7 additions)

**Acceptance criteria:**
- Document accurately reflects the four-pillar architecture
- All Sprint 7 features are described (no "Planned" labels for built features)
- The Guide pillar is described as "Sprint 8 build" with a link to this scope document
- The document is readable by a new developer joining the project

---

### S8-H — Add quick_steps Field to knowledge_sops Table

**Priority:** High (Value Score: 2.00)
**Estimated effort:** 1 session
**DRs closed:** DR-21 (Knowledge Transfer), DR-22 (Onboarding & Training)

**Problem:** The current SOP records contain full procedure text, which is appropriate for detailed reference but too verbose for cellar-day use. A cellar hand who needs to perform a racking procedure needs 3–5 actionable bullet points, not a full SOP. The `quick_steps` field provides this.

**Schema change:** Add `quick_steps TEXT NULL` to the `knowledge_sops` table. Apply via `webdev_execute_sql` (not `pnpm db:push`, which has been timing out). Also update `drizzle/schema.ts` to reflect the new field.

```sql
ALTER TABLE knowledge_sops ADD COLUMN quick_steps TEXT NULL;
```

**Content requirement:** The `quick_steps` field must contain 3–5 bullet points in the format "Action verb + specific instruction." Examples:
- "Check tank temperature is below 15°C before starting"
- "Add 50mg/L SO2 immediately after racking"
- "Record source and destination vessel IDs in the log"

**Implementation:** After the schema change, update the SOP seed script (`scripts/seed-sops.mjs`) to populate `quick_steps` for all 31 SOPs. Update the Knowledge Platform SOP detail view to display `quick_steps` as a prominent "Quick Steps" card above the full procedure text.

**Acceptance criteria:**
- `quick_steps` field exists on all 31 seeded SOPs
- Quick Steps are displayed prominently on the SOP detail page
- Quick Steps are 3–5 bullet points each
- Quick Steps use action verbs and specific instructions (not academic summaries)
- The schema change does not break any existing SOP queries

---

### S8-C — Do to Know Bridge: Contextual SOP Chips on Event Log Entries

**Priority:** High (Value Score: 2.50)
**Estimated effort:** 1–2 sessions
**DRs closed:** DR-25 (Cross-Pillar Navigation)

**Problem:** A winemaker logging a Racking event in The Press has no prompt to consult the Racking SOP in the Knowledge Platform. The Do and Know pillars are operationally related but UX-isolated.

**Design constraints (from HF assessment):**
- Bridge chips must be passive and dismissable — never interrupting prompts
- Chips must open SOPs in a side panel, not navigate away from the form
- The chip must be ignorable — a winemaker in a hurry must not be forced to engage

**Implementation:**

1. Create a `SopBridgeChip` component in `client/src/components/SopBridgeChip.tsx`. The component accepts a `sopCategory` prop and renders a small chip with a book icon and the label "View [Category] SOP." On click, it opens a `Sheet` (shadcn/ui side panel) containing the SOP content fetched via `trpc.knowledge.getSopsByCategory`.

2. Create an `SopSidePanel` component in `client/src/components/SopSidePanel.tsx`. The panel renders the SOP title, quick_steps (if available), and full procedure text. It has a close button and does not navigate away from the current page.

3. Add `SopBridgeChip` to the VintageEntrySheet in `client/src/pages/ThePressPage.tsx` (or wherever the event entry form lives). Map event types to SOP categories:

| Event Type | SOP Category |
|---|---|
| Racking | Cellar Operations |
| Addition | Additions & Nutrients |
| Inoculation | Fermentation Management |
| Measurement | Analytical |
| Bottling Run | Packaging & Bottling |
| Sanitation | Cleaning & Sanitation |
| Pre-Harvest Sample | Harvest & Reception |

4. The chip should only appear when the event type is selected — not before. It should be positioned below the event type selector and above the first field.

**Acceptance criteria:**
- A SOP chip appears when a relevant event type is selected in VintageEntrySheet
- Clicking the chip opens a side panel with the relevant SOP content
- The side panel does not navigate away from the form
- The form state is preserved when the side panel is open and closed
- The chip can be dismissed/ignored without affecting form submission
- The chip does not appear for event types with no mapped SOP (e.g., Observation, Weather Event)

---

### S8-D — Know to Learn Bridge: Learn More Links from SOPs to Free Run

**Priority:** High (Value Score: 2.00)
**Estimated effort:** 1 session
**DRs closed:** DR-25 (Cross-Pillar Navigation)

**Problem:** A winemaker reading a Fermentation Management SOP has no link to the Free Run lesson on fermentation chemistry. The Know and Learn pillars cover overlapping subject matter but are not connected.

**Design constraints:**
- Links must be inline, not modal
- Links must open Free Run in a new tab or navigate to Free Run (navigating away from a SOP is acceptable — the user is in a reading context, not a form context)

**Implementation:**

1. Create a `FreeRunBridgeLink` component in `client/src/components/FreeRunBridgeLink.tsx`. The component accepts a `lessonTopic` prop and renders an inline link with a graduation cap icon and the label "Learn more: [Topic] on Free Run."

2. Add a `free_run_lesson_id` nullable field to the SOP category metadata in `Knowledge.tsx` (client-side only — no schema change required). This field maps SOP categories to Free Run lesson topics.

3. Map SOP categories to Free Run lesson topics:

| SOP Category | Free Run Topic |
|---|---|
| Fermentation Management | Fermentation Chemistry |
| Additions & Nutrients | Nutrition & Additives |
| Analytical | Wine Analysis |
| Cleaning & Sanitation | Microbiology & Sanitation |
| Harvest & Reception | Viticulture & Harvest |
| Packaging & Bottling | Packaging Technology |

4. Add the `FreeRunBridgeLink` to the SOP detail view in `Knowledge.tsx`, positioned at the bottom of the SOP content, above the back navigation.

**Acceptance criteria:**
- A "Learn more on Free Run" link appears at the bottom of relevant SOP detail pages
- The link navigates to the relevant Free Run section
- The link is not present for SOP categories with no mapped Free Run topic
- The link is visually distinct from the SOP content (icon + different text colour)

---

### S8-E — Learn to Do Bridge: Try It Now CTAs from Free Run to The Press

**Priority:** High (Value Score: 2.00)
**Estimated effort:** 1 session
**DRs closed:** DR-25 (Cross-Pillar Navigation)

**Problem:** A winemaker who completes a Free Run lesson on fermentation management has no CTA to log a measurement or start a new tank record in The Press. The Learn and Do pillars are educationally related but UX-isolated.

**Design constraints:**
- CTAs must be contextual — they should appear at the end of a lesson or subject card, not as a persistent banner
- CTAs should link to the most relevant action in The Press (e.g., a fermentation lesson links to the Measurement event type in The Press)

**Implementation:**

1. Create a `ThePressCtaCard` component in `client/src/components/ThePressCtaCard.tsx`. The component accepts an `eventType` prop and renders a card with a flask icon, a headline ("Ready to apply this?"), and a CTA button ("Log a [Event Type] in The Press") that links to `/the-press`.

2. Add `ThePressCtaCard` to the bottom of each CSU subject card in `FreeRun.tsx`. Map subject areas to event types:

| Subject Area | Event Type |
|---|---|
| Fermentation Chemistry | Measurement |
| Viticulture & Harvest | Pre-Harvest Sample |
| Wine Analysis | Measurement |
| Packaging Technology | Bottling Run |
| Microbiology & Sanitation | Sanitation |
| Nutrition & Additives | Addition |

3. The CTA card should appear below the subject card description, not inside it. It should be visually distinct (amber accent border) to signal that it is an action prompt, not educational content.

**Acceptance criteria:**
- A "Try it now" CTA card appears below each CSU subject card with a relevant event type
- Clicking the CTA navigates to `/the-press`
- The CTA is visually distinct from the educational content
- The CTA does not appear for subject areas with no mapped event type

---

### S8-F — Build /guide Page: Workflow Map, Getting Started Checklist, Role-Based Paths

**Priority:** High (Value Score: 1.25)
**Estimated effort:** 2–3 sessions
**DRs closed:** DR-22 (Onboarding & Training), DR-24 (Seasonal Workflow Guidance), DR-26 (Induction Experience), DR-27 (Workflow Discoverability)

**Problem:** There is no induction experience for new users. A winery owner who signs up for Ownology has no guided path to set up their winery, understand the four pillars, or know where to start. The Guide pillar is the frame that makes the rest of the platform legible.

**Design constraints (from HF assessment):**
- The workflow map must be interactive HTML/CSS, not a static image
- Clicking a workflow node must navigate to the relevant page or open a relevant SOP
- The Guide page must be shown once to new users (localStorage flag) and accessible from nav thereafter
- Role-based paths must be selectable by the user, not inferred from profile data

**Page structure:**

The `/guide` page has four sections:

**Section 1: Welcome & Four Pillars Overview**
A brief introduction to the four-pillar architecture with four cards (Do, Know, Learn, Guide). Each card has a one-sentence description, an icon, and a link to the pillar's primary page. This section answers the question: "What is Ownology and what can I do with it?"

**Section 2: Interactive Workflow Map**
An HTML/CSS workflow diagram showing the vintage cycle mapped onto the four pillars. The diagram has nodes for:
- Pre-Harvest (Vineyard → Know: Harvest SOP → Do: Pre-Harvest Sample)
- Harvest & Reception (Do: Inoculation → Know: Fermentation SOP → Learn: Fermentation Chemistry)
- Fermentation (Do: Measurements → Know: Decision Logic → Do: Additions)
- Post-Fermentation (Do: Racking → Know: Clarification SOP → Do: Barrel Management)
- Bottling (Do: Bottling Run → Know: Packaging SOP → Do: Packaging Inventory)

Each node is a clickable button that navigates to the relevant page or opens a relevant SOP in a side panel. The diagram uses CSS flexbox/grid — not SVG or canvas — to ensure it is responsive and maintainable.

**Section 3: Getting Started Checklist**
A 7-item checklist for a new winery's first week on Ownology:
1. Register your first tank in The Press
2. Log your first vintage entry (Inoculation event)
3. Browse the SOP library in the Knowledge Platform
4. Set up your first Cellar Task
5. Register your vineyard blocks in Vineyard
6. Explore Free Run for a subject relevant to your current vintage stage
7. Add your first Tribal Knowledge entry

Each checklist item has a checkbox (stored in localStorage, not the database — no schema change required), a one-sentence description, and a link to the relevant page. The checklist is not a gate — users can skip items and return to them later.

**Section 4: Role-Based Paths**
Three path cards for different user roles:
- **Winery Owner** — Focus on Dashboard, Cellar Value, Multi-Vintage Comparison, and Export Docs
- **Head Winemaker** — Focus on The Press, Knowledge Platform, Compliance AI, and Vintage Debrief
- **Cellar Hand** — Focus on Quick Entry, Cellar Tasks, and the SOP Quick Steps

Each path card has a "Start this path" button that links to the first page in the path. The role selection is not stored — it is a navigational shortcut, not a profile setting.

**Implementation:**

1. Create `client/src/pages/Guide.tsx` with the four sections described above.
2. Add the `/guide` route to `App.tsx`.
3. Add "Guide" to the main nav (under a new column or as a top-level item).
4. Implement the localStorage flag logic for the new-user redirect (from S8-I).
5. The workflow map nodes should use the `SopSidePanel` component from S8-C where relevant.

**Acceptance criteria:**
- `/guide` route exists and renders the Guide page
- The four-pillar overview section renders four cards with correct links
- The workflow map renders as an interactive HTML/CSS diagram (not a static image)
- Each workflow node is clickable and navigates to the correct page or opens the correct SOP
- The getting started checklist renders 7 items with localStorage-backed checkboxes
- The role-based paths render three cards with correct links
- The page is responsive on mobile
- The localStorage flag is set on page mount
- The Guide page is accessible from the main nav

---

## Sprint 8 Summary Table

| Item | Description | Priority | Sessions | DRs Closed |
|---|---|---|---|---|
| S8-A | Add /knowledge to main nav | Critical | 0.5 | DR-25, DR-27 |
| S8-B + S8-J | Remove Build Index from nav | Critical | 0.5 | Launch hygiene |
| S8-I | Post-login redirect to /guide for new users | Critical | 0.5 | DR-26 |
| S8-H | Add quick_steps field to knowledge_sops | High | 1 | DR-21, DR-22 |
| S8-C | Do to Know bridge: SOP chips on event entries | High | 1–2 | DR-25 |
| S8-D | Know to Learn bridge: Learn more links from SOPs | High | 1 | DR-25 |
| S8-E | Learn to Do bridge: Try it now CTAs from Free Run | High | 1 | DR-25 |
| S8-F | Build /guide page | High | 2–3 | DR-22, DR-24, DR-26, DR-27 |
| S8-G | Update ownology-document-tree.md | Medium | 1 | Documentation |
| **Total** | | | **8–10 sessions** | **DR-21, DR-22, DR-24, DR-25, DR-26, DR-27** |

---

## Sprint 8 Technical Constraints

### Database

The only schema change in Sprint 8 is the addition of `quick_steps TEXT NULL` to the `knowledge_sops` table. This must be applied via `webdev_execute_sql` (not `pnpm db:push`, which has been timing out on this project). The Drizzle schema file must also be updated to reflect the change.

```sql
ALTER TABLE knowledge_sops ADD COLUMN quick_steps TEXT NULL;
```

After applying the migration, update `drizzle/schema.ts`:
```typescript
quickSteps: text('quick_steps'),
```

### New Components Required

| Component | Path | Used By |
|---|---|---|
| SopBridgeChip | client/src/components/SopBridgeChip.tsx | VintageEntrySheet (S8-C) |
| SopSidePanel | client/src/components/SopSidePanel.tsx | SopBridgeChip, Guide workflow map (S8-C, S8-F) |
| FreeRunBridgeLink | client/src/components/FreeRunBridgeLink.tsx | Knowledge SOP detail view (S8-D) |
| ThePressCtaCard | client/src/components/ThePressCtaCard.tsx | Free Run subject cards (S8-E) |
| Guide | client/src/pages/Guide.tsx | /guide route (S8-F) |

### New Routes Required

| Route | Component | Auth Required |
|---|---|---|
| /guide | Guide.tsx | Yes (authenticated users only) |

### New tRPC Procedures Required

None. All Sprint 8 features use existing tRPC procedures. The SopSidePanel fetches SOP content via the existing `trpc.knowledge.getSopsByCategory` procedure.

### LocalStorage Keys

| Key | Value | Used By |
|---|---|---|
| ownology_guide_seen | 'true' | Post-login redirect (S8-I), Guide page mount (S8-F) |
| ownology_guide_checklist | JSON array of completed item IDs | Getting started checklist (S8-F) |

---

## Sprint 8 Acceptance Criteria — Full Platform

Upon completion of Sprint 8, the following must be true of the full platform:

1. `/knowledge` is accessible from the main nav on all devices
2. The Build Index link is not visible in the nav
3. New users are redirected to `/guide` after first login
4. All 31 SOPs have a `quick_steps` field with 3–5 cellar-ready bullet points
5. Contextual SOP chips appear on relevant event types in VintageEntrySheet
6. SOP chips open in a side panel without navigating away from the form
7. "Learn more on Free Run" links appear at the bottom of relevant SOP detail pages
8. "Try it now" CTA cards appear below CSU subject cards in Free Run
9. The `/guide` page exists with all four sections (pillars overview, workflow map, checklist, role paths)
10. The workflow map is interactive HTML/CSS (not a static image)
11. The getting started checklist uses localStorage for progress persistence
12. The Guide page is accessible from the main nav
13. `ownology-document-tree.md` reflects the four-pillar architecture
14. No authentication bypass exists in Quick Entry in production

---

## Sprint 8 Definition of Done

Sprint 8 is complete when:

- All 10 acceptance criteria above are verified in the browser
- The Build Index is confirmed absent from the nav in a fresh browser session
- A new-user flow has been tested (clear localStorage, log in, confirm redirect to /guide)
- The SOP chip side panel has been tested on mobile (confirm form state is preserved)
- The workflow map has been tested on mobile (confirm all nodes are tappable)
- `todo.md` has been updated with all Sprint 8 items marked complete
- A checkpoint has been saved with the message "Sprint 8 complete: Triangulation Sprint"

---

*This scope document is maintained in `references/sprint-8-scope.md`. It should be updated as Sprint 8 progresses to reflect completed items and any scope changes.*
