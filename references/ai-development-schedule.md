# Ownology AI Development Schedule
## Value-Engineered Sprint Plan — "From Chatbot to Winemaking Intelligence"

**Governing principle:** Every sprint must produce a demonstrable improvement to the AI Tutor's answer quality. No sprint is purely infrastructure. Each sprint ends with a "demo moment" — a specific question the AI can now answer better than before.

---

## Current State Baseline

The AI Tutor today:
- Answers from Layer A (SOP content) — good
- Answers from Layer B (industry vintage intelligence) — partial (region/year detection only)
- Cannot access Layer C (live cellar readings) — gap
- Cannot access Layer B member-specific vintage notes — gap
- Gives the same answer to every winery for the same question — no personalisation
- Has no intent classification — treats all questions the same way

**Demo moment today:** "What DAP addition do I need for a Shiraz at 24 Brix, YAN 120ppm?" → reasonable generic answer.

**Demo moment at completion:** "Why is fermentation slowing in Tank 7?" → personalised answer citing the member's own 2024 Shiraz readings, their 2023 vintage note about that tank, the relevant SOP section, and a ranked action list.

---

## Sprint 1 — Fix the Stats Bar + DIY Filter Integrity
**Value:** Removes misleading numbers; makes the DIY view feel intentional, not broken.
**Effort:** 1 session

### Tasks
- [ ] Stats bar: show context-aware counts (DIY mode: 3 categories, 7 SOPs; All mode: 8 categories, 45 SOPs)
- [ ] Category page: when accessed from DIY mode, filter SOP list to show only `is_template = false` (DIY) SOPs first, with professional templates collapsed/secondary
- [ ] Remove hardcoded "8 Categories" and "5 Knowledge Layers" — make dynamic or remove entirely
- [ ] Add "DIY" badge on DIY SOP cards so users know they're reading a home-winemaker version

**Demo moment:** DIY filter shows exactly 7 SOPs across 3 categories, no confusion with professional templates.

---

## Sprint 2 — Complete the DIY SOP Library
**Value:** A home winemaker can now follow Ownology from grape to bottle without gaps.
**Effort:** 1 session

### Tasks
- [ ] Add DIY SOP: Grape Sourcing & Receival — Home Winemaker (selecting grapes, checking Brix at pickup, transport)
- [ ] Add DIY SOP: SO₂ Management (Simplified) — Home Winemaker (Campden tablets, basic additions, no lab)
- [ ] Add DIY SOP: White Wine Fermentation — Home Winemaker (cool ferment, no pump-overs, clarification)
- [ ] Add DIY SOP: Basic Fining & Stabilisation — Home Winemaker (bentonite, cold stabilisation, filtration options)
- [ ] Add DIY SOP: Oak Alternatives — Home Winemaker (chips, staves, spirals — dosage and timing)
- [ ] Add DIY SOP: Basic Wine Chemistry for Home Winemakers (what to test, when, with cheap equipment)
- [ ] Expand DIY_CATEGORIES set in Knowledge.tsx to include the new categories

**Demo moment:** A home winemaker can navigate the full winemaking journey — 13 SOPs across 6 categories — without hitting a dead end.

---

## Sprint 3 — Wire Member Vintage Notes into AI Tutor (Layer B Personalisation)
**Value:** The AI Tutor starts giving personalised answers. This is the first "wow" moment for paying members.
**Effort:** 1 session

### Tasks
- [ ] In `tutorRouter.ask`: query `sop_vintage_notes` for the authenticated user's winery, last 3 vintages
- [ ] Build `memberVintageContext` string: format as "Your 2024 Fermentation notes: [whatWorked] / [whatFailed]"
- [ ] Inject `memberVintageContext` as a third context block in the system prompt (after SOP context, after industry vintage context)
- [ ] Add label in the AI response UI: "This answer includes your winery's vintage history"
- [ ] Test: ask "What went wrong in my fermentations last year?" — should cite the member's own notes

**Demo moment:** "What went wrong in my fermentations last year?" → AI cites the member's own SOP vintage notes by name, not generic advice.

---

## Sprint 4 — Wire Live Cellar Readings into AI Tutor (Layer C)
**Value:** The AI can now answer "what is happening right now" questions. This is the harvest-critical feature.
**Effort:** 1–2 sessions

### Tasks
- [ ] In `tutorRouter.ask`: accept optional `tankId` and `vintageYear` parameters from the frontend
- [ ] Query `vintage_log_entries` for the last 7 days of readings for that tank/vintage
- [ ] Build `liveDataContext` string: "Tank 7 — last 7 readings: [date, Brix, temp, pH, notes]"
- [ ] Inject `liveDataContext` as a fourth context block
- [ ] Frontend: add a "Which tank are you asking about?" optional selector in the AI Tutor UI
- [ ] Frontend: pre-populate tank selector from the user's active tanks
- [ ] Test: "Why is fermentation slowing in Tank 7?" with real readings → AI cites actual Brix trend

**Demo moment:** "Why is fermentation slowing in Tank 7?" → AI cites the last 5 Brix readings, identifies the trend, cross-references the SOP stuck fermentation protocol, and checks vintage notes for prior Tank 7 issues.

---

## Sprint 5 — Intent Classification (Query Understanding Pipeline)
**Value:** The AI stops treating all questions the same. Diagnostic questions get diagnostic answers. Procedure questions get step-by-step answers. This dramatically improves answer precision.
**Effort:** 1–2 sessions

### Tasks
- [ ] Build `classifyIntent(question)` function: calls LLM with a structured JSON schema response
- [ ] Intent schema: `{ mode: "procedure|diagnostic|learning|predictive|onboarding", process: string, issue: string|null, asset: string|null, priority: "high|medium|low" }`
- [ ] Route context retrieval based on mode:
  - `procedure` → SOP content only, formatted as numbered steps
  - `diagnostic` → SOP + vintage notes + live data, formatted as ranked causes + actions
  - `learning` → vintage comparison across years, formatted as timeline
  - `predictive` → live data trend + historical patterns, formatted as forecast
  - `onboarding` → SOP + quick steps + common mistakes, formatted as checklist
- [ ] Adjust system prompt dynamically based on classified intent
- [ ] Log intent classifications for future analysis (which modes are used most)

**Demo moment:** "How do I do a pump-over?" → numbered steps only. "Why is my ferment stuck?" → diagnostic mode with ranked causes. Same AI, dramatically different response quality.

---

## Sprint 6 — Tank-Specific Memory (Tribal Knowledge Linking)
**Value:** The AI knows that "Tank 14 runs hot" without being told every time. This is the compound learning effect.
**Effort:** 1 session

### Tasks
- [ ] Add `asset_tag` field to `sop_library.tribal_knowledge` entries (or create a separate `asset_notes` table: `asset_id`, `asset_type`, `note`, `created_by`)
- [ ] When a question mentions a tank name/number, query asset notes for that tank
- [ ] Inject asset-specific notes into the context: "Known about Tank 14: runs 1–2°C warmer than probe"
- [ ] Frontend: add "Add note about this tank" shortcut from the cellar log view
- [ ] Test: "What should I watch for in Tank 14?" → AI cites the tank-specific tribal knowledge

**Demo moment:** "What should I watch for in Tank 14?" → AI cites the stored tank note without the user having to mention it.

---

## Sprint 7 — The Holy Grail Query
**Value:** The system can now answer the most complex, highest-value question a winemaker can ask. This is the sales demo closer.
**Effort:** 1 session

### Tasks
- [ ] Implement multi-vintage comparison query: aggregate vintage notes across years for a given process/variety
- [ ] Build `bestPracticeContext`: "Across your 2022, 2023, 2024 Shiraz fermentations: what worked consistently, what failed, what changed"
- [ ] Inject into AI response with a "Based on your winery's history" framing
- [ ] Add a dedicated "Best Practice" query mode to the AI Tutor UI (a button: "What's worked best for us?")
- [ ] Test: "What is the best way we've ever handled a slow Shiraz fermentation?" → cites 3 vintages, ranks interventions by success rate

**Demo moment:** "What is the best way we've ever handled a slow Shiraz fermentation in warm vintages?" → AI returns SOP baseline + 3 past vintages + what worked best + what failed + recommended current action. This is the product vision fully realised.

---

## Sprint 8 — Education Layer (DIY + Onboarding Mode)
**Value:** Converts the DIY tier from "free content" into a genuine learning pathway. Supports the onboarding search mode.
**Effort:** 1–2 sessions

### Tasks
- [ ] Add `education_links` field to `sop_library` (JSON array: `[{title, url, type: "video|article|course", provider}]`)
- [ ] Seed DIY SOPs with relevant free YouTube/WSC links for each procedure
- [ ] Add "Learn More" tab to SOP detail page (shows education links)
- [ ] In onboarding mode AI responses, append "Want to learn more? [SOP title] links to [resource]"
- [ ] Consider: in-app micro-lessons (3–5 question quizzes per SOP) — assess feasibility

**Demo moment:** A home winemaker asks "Show me how to do a pump-over" → gets the SOP steps + a curated YouTube video link + a 3-question quiz to confirm understanding.

---

## Sprint 9 — Predictive Mode (Forward-Looking Intelligence)
**Value:** The AI moves from reactive to proactive. This is the premium tier differentiator.
**Effort:** 2 sessions

### Tasks
- [ ] Build fermentation kinetics model: given current Brix trend + temperature + YAN, estimate days to dryness
- [ ] Compare current trajectory against historical vintages for same variety
- [ ] Generate "risk flags": if trajectory deviates from historical norm by >X%, flag as at-risk
- [ ] Add proactive alerts: "Tank 7 Shiraz is tracking 2 days slower than your 2023 Shiraz at the same stage"
- [ ] Integrate with existing tank reminder system

**Demo moment:** "Will Tank 7 finish dry by Friday?" → AI gives a date estimate with confidence range, based on current Brix curve and historical patterns.

---

## Sprint 10 — Polish, Performance & Sales Demo Mode
**Value:** Makes the product presentable to investors and paying customers.
**Effort:** 1 session

### Tasks
- [ ] Create a "Demo Mode" with pre-loaded winery data (fictional but realistic: 3 tanks, 2 vintages, 15 SOP notes)
- [ ] Ensure the holy grail query works flawlessly in demo mode
- [ ] Response latency: ensure AI Tutor responds in under 4 seconds for all query types
- [ ] Add "Sources cited" footer to every AI response (which layers were used)
- [ ] Add conversation history (last 5 exchanges) so the AI has follow-up context
- [ ] Mobile UX review: the AI Tutor must work on a phone in a cellar

**Demo moment:** A complete end-to-end demo — from "show me the fermentation SOP" to "what's the best we've ever done with stuck Shiraz" — in under 5 minutes, on a phone, in a winery.

---

## Value Delivery Summary

| Sprint | What Gets Better | Sellable After? |
|---|---|---|
| 1 | DIY UX integrity | No (housekeeping) |
| 2 | DIY content complete | Yes (DIY tier) |
| 3 | Personalised answers | **Yes — first real demo moment** |
| 4 | Harvest-critical live data | **Yes — strongest harvest demo** |
| 5 | Intent-aware responses | Yes — noticeably smarter |
| 6 | Tank memory | Yes — "it knows our cellar" |
| 7 | Holy grail query | **Yes — sales demo closer** |
| 8 | Education layer | Yes — DIY tier upsell |
| 9 | Predictive alerts | Yes — premium tier |
| 10 | Demo mode + polish | **Yes — investor ready** |

**Minimum viable sales demo:** Sprints 1–4 complete. That's the version you can put in front of a winery owner and close a trial.

**Full vision:** All 10 sprints. Estimated total: 12–16 sessions.
