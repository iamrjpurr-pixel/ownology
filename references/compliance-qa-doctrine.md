# Ownology Compliance Q&A Doctrine Map

**Version:** 1.0 — May 2026  
**Maintained in:** `server/complianceQADoctrine.ts`  
**Source doctrine:** `server/complianceKnowledgeBase.ts` → `SOURCE_DOCTRINE`

---

## Purpose

This document is the authoritative mapping of canonical compliance questions to their answers and the exact regulatory sources they draw from. It serves three purposes:

1. **Grounding layer** — the Compliance Assistant LLM receives these Q&A pairs in its system prompt, so answers are grounded in verified regulatory text rather than generated from scratch.
2. **Audit trail** — every answer is traceable to a specific act, section, and official URL.
3. **Maintenance checklist** — when the weekly regulation monitor flags a new publication, review the affected entries below, update the answer, and bump `lastVerified`.

---

## How to Update This Doctrine

1. Open `server/complianceQADoctrine.ts`.
2. Find the affected `QAEntry` by its `id`.
3. Update the `answer` text and/or `citations` array.
4. Bump `lastVerified` to today's date (ISO format: `YYYY-MM-DD`).
5. Run `pnpm tsc --noEmit` to confirm no errors.
6. Save a checkpoint.

To **add a new Q&A entry**, copy an existing entry, assign a new unique `id`, and add it to the `QA_DOCTRINE` array. The LLM will automatically pick it up on the next request.

---

## Regulatory Source Doctrine

The following official sources are monitored for updates. All URLs are verified and stored in `SOURCE_DOCTRINE`.

| Source | Jurisdiction | Category | Monitor Channel |
|---|---|---|---|
| Wine Australia Act 2013 | Federal | Legislation | legislation.gov.au email alerts |
| Wine Australia Regulations 2018 | Federal | Legislation | legislation.gov.au email alerts |
| A New Tax System (Wine Equalisation Tax) Act 1999 | Federal | Legislation | ATO website; legislation.gov.au |
| Food Standards Code — Standard 2.7.1 (Wine) | Federal | Standard | FSANZ Food Standards News email |
| Food Standards Code — Standard 4.5.1 (Wine) | Federal | Standard | FSANZ Food Standards News email |
| Food Standards Code — Standard 1.2.1 (Labelling) | Federal | Standard | FSANZ Food Standards News email |
| Food Standards Code — Standard 1.2.3 (Allergens) | Federal | Standard | FSANZ Food Standards News email |
| Food Standards Code — Standard 3.2.2 (Food Safety) | Federal | Standard | FSANZ Food Standards News email |
| Food Standards Code — Standard 3.2.3 (Food Premises) | Federal | Standard | FSANZ Food Standards News email |
| Biosecurity Act 2015 | Federal | Legislation | DAFF website; legislation.gov.au |
| Liquor Licensing Act 1997 (SA) | SA | Legislation | legislation.sa.gov.au email alerts |
| Environment Protection Act 1993 (SA) | SA | Legislation | EPA SA website |
| Work Health and Safety Act 2012 (SA) | SA | Legislation | SafeWork SA website |
| Liquor Control Reform Act 1998 (VIC) | VIC | Legislation | VCGLR website |
| Liquor Act 2007 (NSW) | NSW | Legislation | Liquor & Gaming NSW website |
| Liquor Control Act 1988 (WA) | WA | Legislation | DLGSC website |
| Liquor Act 1992 (QLD) | QLD | Legislation | OLGR QLD website |
| Liquor Licensing Act 1990 (TAS) | TAS | Legislation | CBOS TAS website |

---

## Canonical Q&A Entries

### 1. Producer Registration & Licensing — Federal

**[fed-producer-registration]** Do I need to register as a wine producer with Wine Australia?  
*Last verified: 2026-05-01*  
**Sources:** Wine Australia Act 2013, Part 2; Wine Australia Regulations 2018, Division 2.1

---

**[fed-wet-registration]** When do I need to register for Wine Equalisation Tax (WET)?  
*Last verified: 2026-05-01*  
**Sources:** A New Tax System (Wine Equalisation Tax) Act 1999, Division 5

---

**[fed-wet-rebate]** How much is the Wine Producer Rebate and who is eligible?  
*Last verified: 2026-05-01*  
**Sources:** A New Tax System (Wine Equalisation Tax) Act 1999, Division 19  
**Note:** Rebate cap rises from $350,000 to $400,000 from 1 July 2026.

---

### 2. Cellar Door & On-Site Sales

**[sa-cellar-door-licence]** What licences do I need to open a cellar door in South Australia?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Licensing Act 1997 (SA), Part 4 — Producer's Licence, Class 2

---

**[vic-cellar-door-licence]** What licence do I need for a cellar door in Victoria?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Control Reform Act 1998 (VIC), Part 3

---

**[nsw-cellar-door-licence]** What licence do I need for a cellar door in New South Wales?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Act 2007 (NSW), Part 2

---

**[wa-cellar-door-licence]** What licence do I need for a cellar door in Western Australia?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Control Act 1988 (WA), Part 4  
**Note:** 2025 amendments permit digital ID forms for age verification.

---

**[qld-cellar-door-licence]** What licence do I need for a cellar door in Queensland?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Act 1992 (QLD), Part 4

---

**[tas-cellar-door-licence]** What licence do I need for a cellar door in Tasmania?  
*Last verified: 2026-05-01*  
**Sources:** Liquor Licensing Act 1990 (TAS), Part 3

---

### 3. Wine Labelling

**[fed-label-mandatory-info]** What information is mandatory on an Australian wine label?  
*Last verified: 2026-05-01*  
**Sources:** Food Standards Code — Standard 2.7.1; Standard 1.2.1; Wine Australia Act 2013, Part 5 (LIP)

---

**[fed-label-pregnancy-warning]** Is a pregnancy warning label required on wine?  
*Last verified: 2026-05-01*  
**Sources:** Food Standards Code — Standard 2.7.1 (pregnancy warning amendment 2022)  
**Note:** Mandatory from 31 July 2023. Sell-through of pre-2023 stock permitted until 30 June 2025.

---

**[fed-label-sulphites]** Do I need to declare sulphites on my wine label?  
*Last verified: 2026-05-01*  
**Sources:** Food Standards Code — Standard 1.2.3, allergen declarations

---

**[fed-label-gi-variety-vintage]** What are the rules for claiming a vintage, variety, or geographic indication on a label?  
*Last verified: 2026-05-01*  
**Sources:** Wine Australia Act 2013, Part 5 (LIP), s.40C; Wine Australia Regulations 2018, Part 4  
**Note:** 85% rule applies to vintage, variety, and GI claims. Records must be kept for 7 years.

---

### 4. Export Compliance

**[fed-export-licence]** What do I need to export wine from Australia?  
*Last verified: 2026-05-01*  
**Sources:** Wine Australia Act 2013, Parts 3 & 4; Wine Australia Regulations 2018, Part 3

---

### 5. Food Safety & Additives

**[fed-permitted-additives]** What additives are permitted in Australian wine production?  
*Last verified: 2026-05-01*  
**Sources:** Food Standards Code — Standard 4.5.1, Primary Production and Processing Standard for Wine

---

**[fed-food-business-registration]** Do wineries need to register as a food business?  
*Last verified: 2026-05-01*  
**Sources:** Food Standards Code — Standard 3.2.2; Standard 3.2.3; Standard 3.2.2A (mandatory from December 2023)

---

### 6. Work Health & Safety

**[fed-whs-co2]** What are the CO2 safety requirements during fermentation?  
*Last verified: 2026-05-01*  
**Sources:** Work Health and Safety Act 2012 (SA), Part 2; Confined Spaces Code of Practice

---

**[fed-whs-so2]** What are the WHS requirements for handling SO2 in the winery?  
*Last verified: 2026-05-01*  
**Sources:** Work Health and Safety Act 2012 (SA), Part 2; WHS Regulations — Schedule 1 (Exposure standards)  
**Note:** TWA 2 ppm; STEL 5 ppm.

---

### 7. Environmental & Water

**[sa-wastewater]** How must I manage winery wastewater in South Australia?  
*Last verified: 2026-05-01*  
**Sources:** Environment Protection Act 1993 (SA), Part 7; EPA SA Winery and Distillery Wastewater guidelines

---

### 8. Biosecurity

**[fed-phylloxera]** What are the biosecurity rules for moving grapevine material between states?  
*Last verified: 2026-05-01*  
**Sources:** Biosecurity Act 2015 (Federal), Part 3; DAFF Grapevine import conditions

---

## Monitoring Schedule

The weekly regulation monitor checks the following feeds every Monday at 09:00 UTC:

- **FSANZ Notification Circulars** — `foodstandards.gov.au/food-standards-code/circulars`
- **Wine Australia News** — `wineaustralia.com/news`

When a new publication is detected, you will receive an owner notification listing the title and URL. Review the affected Q&A entries above, update `complianceQADoctrine.ts`, and save a checkpoint.

---

*This document is auto-generated from `server/complianceQADoctrine.ts`. Edit that file, not this document.*
