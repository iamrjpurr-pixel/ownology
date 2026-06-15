# Ownology — Full Site Connectivity & Content Audit
*Conducted: June 2026*

---

## Summary Verdict

The site has 30 routes. Of those:
- **12 are core product** — well-built, connected, and earning their place
- **6 are legitimate marketing** — useful for SEO and conversion
- **5 are duplicates or near-duplicates** — same content in two places
- **4 are placeholders** — built but not yet useful
- **3 are internal/admin** — correct to exist, not public-facing

The single biggest structural problem: **Regulations.tsx and Resources.tsx are near-identical pages** — both contain the same state-by-state regulatory summaries, both link to the Compliance AI, and neither adds original value over the primary sources they summarise.

---

## Page-by-Page Assessment

### CORE PRODUCT (Keep, maintain)

| Route | Page | Verdict |
|---|---|---|
| `/the-press` | ThePress.tsx | ✅ Core — the vintage log. Most important page on the site. 10 inbound links. |
| `/dashboard` | ProductionDashboard.tsx | ✅ Core — KPI overview. Linked from nav and Guide. |
| `/quick-entry` | QuickEntry.tsx | ✅ Core — rapid log entry. Linked from Guide. |
| `/cellar-tasks` | CellarTasks.tsx | ✅ Core — task management. 2 inbound links. |
| `/vineyard` | Vineyard.tsx | ✅ Core — block observations. Linked from Guide. |
| `/knowledge` | Knowledge.tsx | ✅ Core — SOP library. 21 inbound links (most-linked internal page). |
| `/compliance` | Compliance.tsx | ✅ Core — AI regulatory Q&A. 18 inbound links. |
| `/free-run` | FreeRun.tsx | ✅ Core — AI tutor (just rebuilt). 8 inbound links. |
| `/guide` | Guide.tsx | ✅ Core — onboarding journey map. 3 inbound links. |
| `/pricing` | Pricing.tsx | ✅ Core — conversion page. 17 inbound links. |
| `/` | Home.tsx | ✅ Core — landing page. 49 inbound links (homepage). |
| `/for-home-winemakers` | ForHomeWinemakers.tsx | ✅ Core — home winemaker audience page. 2 inbound links. |

---

### MARKETING (Keep, low maintenance)

| Route | Page | Verdict |
|---|---|---|
| `/why-ownology` | WhyOwnology.tsx | ✅ Keep — 436 lines, positions Ownology vs production management tools. 9 inbound links. |
| `/blog` | Blog.tsx | ✅ Keep — 2 real articles, good SEO value. 9 inbound links. |
| `/blog/two-philosophies` | BlogTwoPhilosophies.tsx | ✅ Keep — original thought leadership article. |
| `/blog/weight-of-harvest` | BlogWeightOfHarvest.tsx | ✅ Keep — original thought leadership article. |
| `/for-home-winemakers/troubleshooting` | HomeWinemakerTroubleshooting.tsx | ✅ Keep — useful resource, links to Free Run. |
| `/for-home-winemakers/glossary` | HomeWinemakerGlossary.tsx | ✅ Keep — useful resource, links to Free Run. |

---

### DUPLICATES — ACTION REQUIRED

| Route | Page | Problem | Recommendation |
|---|---|---|---|
| `/regulations` | Regulations.tsx | 1,626 lines of paraphrased state-by-state regulatory summaries. Same content as Resources.tsx. Not authoritative. Cannot be kept current. | **Replace with a curated links page** — one section per jurisdiction, each linking directly to the primary regulator. 50 lines max. |
| `/resources` | Resources.tsx | 1,438 lines — near-identical to Regulations.tsx. Only 1 inbound link (BuildIndex). Route also maps to Regulations.tsx in App.tsx (both `/resources` and `/regulations` render the same component — this is a bug). | **Delete Resources.tsx entirely.** The route `/resources` should redirect to `/regulations` (the replacement version). |
| `/competitive-advantage` | CompetitiveAdvantage.tsx | 980 lines. Overlaps heavily with WhyOwnology.tsx. Only 1 inbound link (footer). | **Merge key content into WhyOwnology.tsx** and remove this page, or keep as a deep-link target but remove from footer. |
| `/for-innovint-users` | ForInnoVintUsers.tsx | Audience-specific landing page for InnoVint users. 4 inbound links. Overlaps with WhyOwnology. | **Keep but deprioritise** — useful for paid search targeting. Remove from footer, keep as a URL you can share. |
| `/for-vintrace-users` | ForVintraceUsers.tsx | Same as above for Vintrace users. 3 inbound links. | **Keep but deprioritise** — same rationale. |

---

### PLACEHOLDERS — DECIDE

| Route | Page | Problem | Recommendation |
|---|---|---|---|
| `/resources/home-winery-kit` | HomeWineryKit.tsx | Home winemaker kit page. 1 inbound link. Has 3 example questions that now correctly route to `/free-run`. | ✅ Keep — it's a useful resource page. Add it to the `/for-home-winemakers` nav. |
| `/merch` | Merch.tsx | Sells 4 branded items (coasters, bar runner, notebook). Has **fabricated customer reviews** hardcoded as `SEED_REVIEWS` — "James R., Barossa Valley", "Sophie M., McLaren Vale" etc. These are fake. | **Remove the SEED_REVIEWS immediately** — fake reviews are a credibility and legal risk. Keep the store but show empty review state until real reviews come in. |
| `/preview` | Preview.tsx | Internal preview page. | Keep as internal tool. |
| `/founding-member/success` | FoundingMemberSuccess.tsx | Post-purchase success page. | Keep — needed for Stripe flow. |

---

### INTERNAL/ADMIN (Correct to exist)

| Route | Page | Notes |
|---|---|---|
| `/admin` | Admin.tsx | Owner-only admin panel. Correct. |
| `/admin/leads` | AdminLeads.tsx | Lead management. Correct. |
| `/admin/compliance-doctrine` | AdminComplianceDoctrine.tsx | Compliance KB management. Correct. |
| `/build-index` | BuildIndex.tsx | Internal build tracker. Correct. |
| `/campaign-metrics` | CampaignMetrics.tsx | Marketing analytics. Correct. |

---

## The Regulations Problem — Detailed

The `/regulations` page contains paraphrased summaries of:
- Federal: Wine Australia Registration, FSANZ Standard 4.5.1, WET, Labelling, Biosecurity, WHS
- SA: 6 state-specific items
- VIC: 5 state-specific items
- NSW: 5 state-specific items
- WA: 5 state-specific items
- QLD: 5 state-specific items
- TAS: 5 state-specific items
- NT: 4 state-specific items

**Every one of these has a better primary source** that is publicly accessible, authoritative, and kept current by the relevant government body. Ownology's summaries add no original value and create maintenance debt and accuracy risk.

### Recommended replacement structure for `/regulations`

A single page with 3 sections:

**1. Federal (Wine-specific)**
- Wine Australia — Registration & Licensing: wineaustralia.com/selling
- FSANZ Food Standards Code: foodstandards.gov.au
- ATO Wine Equalisation Tax: ato.gov.au/wet
- AWRI Regulatory Information (curated hub): awri.com.au/industry_support/regulatory_assistance/

**2. State Liquor Licensing (direct links to each regulator)**
- SA: Consumer and Business Services SA
- VIC: Victorian Commission for Gambling and Liquor Regulation
- NSW: Liquor & Gaming NSW
- QLD: Office of Liquor and Gaming Regulation
- WA: Department of Racing, Gaming and Liquor
- TAS: Commissioner for Licensing
- NT: NT Licensing Commission
- ACT: ACT Gambling and Racing Commission

**3. "For complex compliance questions, use the Compliance AI →"**

This replaces 1,626 lines with ~80 lines, is more useful, and requires zero maintenance.

---

## The Merch Problem — Detailed

The `SEED_REVIEWS` object in Merch.tsx contains fabricated customer reviews attributed to named individuals at specific wineries:
- "James R., Barossa Valley"
- "Sophie M., McLaren Vale"
- "Tom W., Yarra Valley"
- "Claire D., Margaret River"
- "Ben K., Hunter Valley"
- "Anna L., Clare Valley"

These people do not exist. These reviews were never submitted. This is a legal and credibility risk — Australian Consumer Law (ACL) prohibits misleading conduct, and fake reviews fall squarely within that prohibition. They must be removed before the site goes live publicly.

---

## Navigation Gaps

Pages that exist but are **not in the main nav** and are hard to discover:
- `/knowledge` — the most-linked internal page, but not in the primary nav (only in the More dropdown)
- `/guide` — the onboarding page, only in the More dropdown
- `/for-home-winemakers/troubleshooting` — only reachable from the home winemaker page
- `/for-home-winemakers/glossary` — only reachable from the home winemaker page
- `/resources/home-winery-kit` — only 1 inbound link

**The Knowledge Platform should be in the primary nav.** It is the most differentiated feature on the platform and is currently buried in a dropdown.

---

## Recommended Actions (Priority Order)

1. **Remove SEED_REVIEWS from Merch.tsx** — legal risk, do this today
2. **Replace Regulations.tsx with curated links page** — 1,626 lines → ~80 lines
3. **Delete Resources.tsx** — duplicate of Regulations, only 1 inbound link
4. **Add Knowledge Platform to primary nav** — most important feature, currently buried
5. **Remove CompetitiveAdvantage from footer** — merge key content into WhyOwnology
6. **Add HomeWineryKit to the for-home-winemakers sub-nav** — currently orphaned

---

*This document should be updated after each sprint that changes page structure or navigation.*
