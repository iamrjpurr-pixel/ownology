/**
 * OWNOLOGY — Compliance Knowledge Base (server-side)
 * Australian winery regulatory knowledge base: Federal + all states.
 * Kept server-side so the full text is never exposed to the browser and
 * LLM calls use the high-capacity BUILT_IN_FORGE_API_KEY.
 */

export const COMPLIANCE_KNOWLEDGE_BASE = `
# Australian Winery Regulatory Knowledge Base
Covers: Federal, South Australia (SA), Victoria (VIC), New South Wales (NSW), Western Australia (WA), Queensland (QLD), Tasmania (TAS)

## FEDERAL REGULATIONS

### Wine Australia Registration (Wine Australia Act 2013)
- Any person producing, exporting, or making wholesale sales of grape wine must register with Wine Australia before commencing commercial activity.
- No minimum production volume — even single-case boutique producers selling wholesale must register.
- Annual grape grower and winemaker levy applies, calculated on volume of grapes crushed or purchased.

### Label Integrity Program (LIP)
- Mandatory record-keeping and audit system for all label claims.
- Vintage year: ≥85% of wine must be from that vintage.
- Single variety: ≥85% must be from that variety.
- Blend varieties: listed in descending order; each ≥5%.
- Geographical Indication (GI): ≥85% must be sourced from that GI.
- LIP records must be retained for 5 years and include: grape receival records (variety, GI, vintage, weight), tank/barrel movement records, blending records, bottling records.
- Failure to maintain LIP records can result in deregistration and prosecution.

### Export Licensing
- Separate Wine Australia export licence required for any winery exporting wine.
- Each export shipment requires a Wine Australia export permit and Certificate of Origin or Health Certificate.
- Labels for export must be pre-registered in the Wine Australia Label Directory before shipment.
- EU, UK, USA, and China each have specific documentation and compositional rules.

### Food Standards Code — Standard 4.5.1 (Wine Production Requirements)
Administered by FSANZ. Governs composition, additives, and processing aids.

Permitted additives:
- Sulphur dioxide (wine <35 g/L sugars): maximum 250 mg/L
- Sulphur dioxide (wine >35 g/L sugars): maximum 300 mg/L
- Sorbic acid / Potassium sorbate: maximum 200 mg/L
- Potassium polyaspartate: maximum 100 mg/L
- Tartaric acid, Malic acid, Lactic acid, Citric acid, Tannins, Gum Arabic, Metatartaric acid, Yeast mannoproteins, Carbon dioxide: GMP (Good Manufacturing Practice — lowest level necessary)

Permitted processing aids: bentonite, gelatin, isinglass, egg white, casein, activated carbon, PVPP, diatomaceous earth, perlite, enzymes, oak, nitrogen, argon, oxygen, copper sulphate (GMP), dimethyl dicarbonate (max 200 mg/L), potassium ferrocyanide (GMP), yeast and bacterial cultures.

Water additions: may only be added to incorporate an additive, facilitate fermentation by diluting high-sugar must (not below 13.5° Brix), or incidentally. Total added water must not exceed 70 mL/L (7%) of final wine volume.

### Food Business Registration (Standards 3.2.2 and 3.2.3)
- Wineries are food businesses and must register with the relevant local council as a food premises.
- Must maintain food safety practices, adequate water supply, drainage, pest control, cleaning and sanitising procedures.
- Standard 3.2.2A (mandatory from December 2023) may require a food safety management system depending on winery classification.

### Wine Equalisation Tax (WET)
- WET is a 29% tax on the wholesale value of wine, applied at the last wholesale sale.
- Administered by the ATO.
- Wine producers, wholesalers, and retailers may be liable depending on their role in the supply chain.
- Wine Producer Rebate: eligible producers can claim a rebate of WET paid, up to a cap of $350,000 per financial year (rising to $400,000 from 1 July 2026).
- Eligibility: must be an Australian resident, produce wine from grapes, honey, fruit, or vegetables, and sell under their own brand or in bulk.
- Ineligible if: associated with another wine producer that has already claimed the full rebate, or if the wine is sold in bulk to another producer who will rebrand it.
- WET registration required if annual WET liability exceeds $1,000.

### Biosecurity and Imports (DAFF)
- Phylloxera: all plant material (grapevines, cuttings, rootlings) must comply with state and federal biosecurity requirements. Interstate movement of grapevine material is regulated.
- Imported winemaking inputs (oak barrels, corks, additives) must comply with Australian biosecurity import conditions.
- Winery waste (marc, lees, grape skins) must be managed to prevent pest and disease spread.

### Work Health and Safety (WHS)
- Model WHS Act and Regulations apply federally; SA has adopted these as the Work Health and Safety Act 2012 (SA).
- Key winery-specific obligations: confined space management (fermentation tanks, underground cellars), CO₂ monitoring (fermentation produces dangerous CO₂ levels), manual handling (barrels, cases), chemical handling (SO₂, cleaning chemicals), and working at heights (barrel stacks, mezzanines).
- Duty of care extends to workers, contractors, visitors, and cellar door customers.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to SafeWork SA immediately.

---

## SOUTH AUSTRALIA REGULATIONS

### Liquor Licensing (Liquor Licensing Act 1997 SA)
Administered by Consumer and Business Services (CBS).

Producer's Licence classes:
- Class 1: Production and wholesale/direct sales only; no on-site consumption.
- Class 2: Cellar door — tastings and sales; on-site consumption permitted. Most common for boutique wineries.
- Class 3: Full retail and on-site consumption including restaurant/dining.

Application requirements for Class 2:
- Completed application via Liquor and Gaming Online (LGO) portal
- Proof of production premises (lease or title)
- Floor plan of premises
- Council development consent for the use
- Evidence of production capacity and intent
- RSA certification for all staff serving alcohol
- Application fee approximately $1,000–$2,500 for Class 2

Ongoing obligations:
- Annual licence renewal and fee payment
- Responsible Service of Alcohol (RSA) training for all staff
- Maintain a register of incidents (intoxication, refusals, disturbances)
- Display licence and trading hours prominently
- Minors: no minors on licensed premises unless accompanied by a responsible adult; no service to minors

Extended trading: requires a separate Extended Trading Authorisation (ETA) for trading beyond standard hours.

### Environmental Protection (Environment Protection Act 1993 SA)
Administered by the EPA SA.

Winery-specific obligations:
- Winery wastewater (winery wash water, grape marc, lees) must be managed under an Environment Protection Policy.
- Discharge to land: requires an EPA licence if volumes exceed prescribed thresholds; must comply with the Winery and Distillery Wastewater EPA guidelines.
- Irrigation of wastewater: must comply with soil application rates; no discharge to waterways.
- Air emissions: SO₂ fumigation must comply with ambient air quality standards.
- Noise: must comply with the Environment Protection (Noise) Policy 2007.
- Prescribed activities (large wineries): require an Environment Protection Licence (EPL).

### Water Licensing (Natural Resources Management Act 2004 SA)
- Extraction of groundwater or surface water for winery operations requires a water licence from the relevant NRM Board.
- Water allocation trading is permitted within prescribed water resource areas.
- Metering and reporting of water use is mandatory for licensed water users.

### Development Approval (Development Act 1993 SA / Planning, Development and Infrastructure Act 2016 SA)
- Change of use to winery or cellar door requires development approval from the relevant council.
- Significant expansions (new buildings, car parks, event spaces) require a development application.
- Heritage-listed properties have additional requirements.

---

## VICTORIA (VIC) REGULATIONS

### Liquor Licensing (Liquor Control Reform Act 1998 VIC)
Administered by the Victorian Commission for Gambling and Liquor Regulation (VCGLR).

Relevant licence types for wineries:
- Producer's Licence: allows production, wholesale, and cellar door sales and tastings.
- General Licence: required for restaurants, bars, or events open to the public.

Application requirements:
- Online application via VCGLR portal
- Proof of production premises
- Floor plan
- Planning permit (if required by local council)
- RSA training for all staff
- Community impact statement (for some applications)
- Application fee: approximately $500–$2,000 depending on licence type

Ongoing obligations:
- Annual renewal and fee
- RSA compliance
- Minors policy compliance
- Incident register

Extended trading: Authorisation required for trading beyond standard hours (Sunday–Thursday 11pm; Friday–Saturday 1am).

### Environmental Regulations (Environment Protection Act 2017 VIC)
Administered by the EPA Victoria.

- General Environmental Duty (GED): all businesses must take reasonably practicable steps to minimise risks of harm to human health and the environment.
- Winery wastewater: must be managed to prevent discharge to waterways or groundwater.
- Scheduled premises: large wineries may be scheduled premises requiring an EPA licence.
- Noise: must comply with the Noise Protocol for Industry.

### Water Licensing (Water Act 1989 VIC)
- Groundwater and surface water extraction requires a licence from the relevant water corporation or Catchment Management Authority.
- Irrigation of winery wastewater to land must comply with EPA guidelines.
- Water licences are issued under a water management plan for the relevant catchment.

### Planning (Planning and Environment Act 1987 VIC)
- Winery and cellar door development requires a planning permit from the local council.
- Significant expansions require a planning permit amendment.
- Green Wedge and farming zones have specific rules for cellar door and event activities.

---

## NEW SOUTH WALES (NSW) REGULATIONS

### Liquor Licensing (Liquor Act 2007 NSW)
Administered by Liquor & Gaming NSW.

Relevant licence types:
- Producer/Wholesaler Licence: allows production, wholesale, and limited retail sales from the winery.
- Hotel Licence / Small Bar Licence: required for cellar door with on-premises consumption.

Application requirements:
- Online application via Liquor & Gaming NSW portal
- Proof of production premises
- Floor plan
- Community impact statement (for some applications)
- RSA training for all staff
- Local council development consent
- Application fee: approximately $500–$2,500

Ongoing obligations:
- Annual renewal and fee
- RSA compliance
- Minors policy compliance
- Incident register

Extended trading: Authorisation required for trading beyond standard hours.

### Environmental Regulations (Protection of the Environment Operations Act 1997 NSW)
Administered by the EPA NSW.

- Scheduled activities: large wineries may be scheduled premises requiring an Environment Protection Licence (EPL).
- Winery wastewater: must be managed to prevent pollution of waterways or groundwater.
- Noise: must comply with the NSW Industrial Noise Policy.
- Air emissions: SO₂ and other emissions must comply with ambient air quality standards.

### Water Licensing (Water Management Act 2000 NSW)
- Extraction of groundwater or surface water requires a water access licence from WaterNSW or the relevant water authority.
- Metering and reporting of water use is mandatory.
- Irrigation of winery wastewater to land must comply with EPA guidelines.

### Planning (Environmental Planning and Assessment Act 1979 NSW)
- Winery and cellar door development requires development consent from the local council.
- State Environmental Planning Policy (Primary Production and Rural Development) 2019 applies to rural winery developments.
- Significant expansions require a development application.

---

## WESTERN AUSTRALIA (WA) REGULATIONS

### Liquor Licensing (Liquor Control Act 1988 WA)
Administered by the Department of Local Government, Sport and Cultural Industries (Racing, Gaming and Liquor).

Relevant licence types:
- Producer's Licence: allows production, wholesale, and cellar door sales and tastings.
- Restaurant Licence: required for cellar door with meals and on-premises consumption.

Application requirements:
- Application via the Liquor Licensing Portal
- Proof of production premises
- Floor plan
- Local council approval
- RSA training for all staff
- Application fee: approximately $500–$2,000

Ongoing obligations:
- Annual renewal and fee
- RSA compliance
- Minors policy compliance
- Incident register

Extended trading: Authorisation required for trading beyond standard hours.

### Environmental Regulations (Environmental Protection Act 1986 WA)
Administered by the Department of Water and Environmental Regulation (DWER).

- Works approval and licence: large wineries may require a works approval and operating licence.
- Winery wastewater: must be managed to prevent discharge to waterways or groundwater.
- Noise: must comply with the Environmental Protection (Noise) Regulations 1997.

### Water Licensing (Rights in Water and Irrigation Act 1914 WA)
- Extraction of groundwater or surface water requires a licence from DWER.
- Metering and reporting of water use is mandatory for licensed water users.

### Planning (Planning and Development Act 2005 WA)
- Winery and cellar door development requires development approval from the local council or WAPC.
- Significant expansions require a development application.

---

## QUEENSLAND (QLD) REGULATIONS

### Liquor Licensing (Liquor Act 1992 QLD)
Administered by the Office of Liquor and Gaming Regulation (OLGR).

Relevant licence types:
- Producer/Wholesaler Licence: allows production, wholesale, and cellar door sales and tastings.
- Commercial Hotel Licence / Subsidiary on-premises licence: required for cellar door with on-premises consumption.

Application requirements:
- Online application via OLGR portal
- Proof of production premises
- Floor plan
- Local government approval
- RSA training for all staff
- Application fee: approximately $500–$2,000

Ongoing obligations:
- Annual renewal and fee
- RSA compliance
- Minors policy compliance
- Incident register

Extended trading: Authorisation required for trading beyond standard hours.

### Environmental Regulations (Environmental Protection Act 1994 QLD)
Administered by the Department of Environment and Science (DES).

- Environmentally relevant activities (ERAs): large wineries may be ERAs requiring an environmental authority.
- Winery wastewater: must be managed to prevent discharge to waterways or groundwater.
- Noise: must comply with the Environmental Protection (Noise) Policy 2008.

### Water Licensing (Water Act 2000 QLD)
- Extraction of groundwater or surface water requires a water licence from the Department of Regional Development, Manufacturing and Water.
- Metering and reporting of water use is mandatory.

### Planning (Planning Act 2016 QLD)
- Winery and cellar door development requires development approval from the local council.
- Significant expansions require a development application.

---

## TASMANIA (TAS) REGULATIONS

### Liquor Licensing (Liquor Licensing Act 1990 TAS)
Administered by the Commissioner for Licensing.

Relevant licence types:
- Winery Licence: allows production, wholesale, and cellar door sales and tastings.
- On-licence: required for cellar door with on-premises consumption.

Application requirements:
- Application via the Commissioner for Licensing
- Proof of production premises
- Floor plan
- Local council development approval
- RSA training for all staff
- Application fee: approximately $500–$1,500

Ongoing obligations:
- Annual renewal and fee
- RSA compliance
- Minors policy compliance
- Incident register

Extended trading: Authorisation required for trading beyond standard hours.

### Environmental Regulations (Environmental Management and Pollution Control Act 1994 TAS)
Administered by the Environment Protection Authority Tasmania (EPA TAS).

- Scheduled activities: large wineries may be scheduled activities requiring an environment protection notice.
- Winery wastewater: must be managed to prevent discharge to waterways or groundwater.
- Noise: must comply with the Environmental Management and Pollution Control (Noise) Regulations 2016.

### Water Licensing (Water Management Act 1999 TAS)
- Extraction of groundwater or surface water requires a water licence from NRE Tasmania.
- Metering and reporting of water use is mandatory.
- Water licences are issued under a water management plan for the relevant catchment.
- Contact NRE Tasmania for licence applications and current allocation status in your catchment.

### Planning (Land Use Planning and Approvals Act 1993 TAS)
- Winery and cellar door development requires a planning permit from the local council.
- Significant expansions require a planning permit application.

---

## KEY CONTACTS

### Federal
- Wine Australia: wineaustralia.com | 1300 363 959
- FSANZ (Food Standards Australia New Zealand): foodstandards.gov.au
- ATO (Wine Equalisation Tax): ato.gov.au/business/wine-equalisation-tax
- DAFF (Biosecurity): agriculture.gov.au/biosecurity
- Safe Work Australia (WHS model laws): safeworkaustralia.gov.au

### South Australia
- Consumer and Business Services (Liquor Licensing): cbs.sa.gov.au | 131 882
- EPA SA (Environment): epa.sa.gov.au | 1800 623 445
- SafeWork SA (WHS): safework.sa.gov.au | 1300 365 255
- NRM Boards (Water): naturalresources.sa.gov.au

### Victoria
- VCGLR (Liquor Licensing): vcglr.vic.gov.au | 1300 182 457
- EPA Victoria (Environment): epa.vic.gov.au | 1300 372 842
- WorkSafe Victoria (WHS): worksafe.vic.gov.au | 1800 136 089

### New South Wales
- Liquor & Gaming NSW: liquorandgaming.nsw.gov.au | 1300 024 720
- EPA NSW (Environment): epa.nsw.gov.au | 131 555
- SafeWork NSW (WHS): safework.nsw.gov.au | 13 10 50

### Western Australia
- Racing, Gaming and Liquor (Liquor Licensing): dlgsc.wa.gov.au | 1800 634 541
- DWER (Environment and Water): dwer.wa.gov.au | 6364 7000
- WorkSafe WA (WHS): worksafe.wa.gov.au | 1300 307 877

### Queensland
- OLGR (Liquor Licensing): olgr.qld.gov.au | 13 74 68
- DES (Environment): des.qld.gov.au | 13 74 68
- Workplace Health and Safety QLD: worksafe.qld.gov.au | 1300 362 128

### Tasmania
- Commissioner for Licensing (Liquor): cbos.tas.gov.au | 1300 654 499
- EPA Tasmania (Environment): epa.tas.gov.au | 1800 005 171
- WorkSafe Tasmania (WHS): worksafe.tas.gov.au | 1300 366 322
`;

// ─── Jurisdiction section splitter ───────────────────────────────────────────

const KB_SECTIONS: Record<string, string> = {
  Federal: COMPLIANCE_KNOWLEDGE_BASE.split("## SOUTH AUSTRALIA REGULATIONS")[0],
  SA:
    "## SOUTH AUSTRALIA REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## SOUTH AUSTRALIA REGULATIONS")[1]?.split(
      "## VICTORIA (VIC) REGULATIONS"
    )[0] ?? ""),
  VIC:
    "## VICTORIA (VIC) REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## VICTORIA (VIC) REGULATIONS")[1]?.split(
      "## NEW SOUTH WALES (NSW) REGULATIONS"
    )[0] ?? ""),
  NSW:
    "## NEW SOUTH WALES (NSW) REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## NEW SOUTH WALES (NSW) REGULATIONS")[1]?.split(
      "## WESTERN AUSTRALIA (WA) REGULATIONS"
    )[0] ?? ""),
  WA:
    "## WESTERN AUSTRALIA (WA) REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## WESTERN AUSTRALIA (WA) REGULATIONS")[1]?.split(
      "## QUEENSLAND (QLD) REGULATIONS"
    )[0] ?? ""),
  QLD:
    "## QUEENSLAND (QLD) REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## QUEENSLAND (QLD) REGULATIONS")[1]?.split(
      "## TASMANIA (TAS) REGULATIONS"
    )[0] ?? ""),
  TAS:
    "## TASMANIA (TAS) REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## TASMANIA (TAS) REGULATIONS")[1]?.split(
      "## KEY CONTACTS"
    )[0] ?? ""),
  Contacts: "## KEY CONTACTS" + (COMPLIANCE_KNOWLEDGE_BASE.split("## KEY CONTACTS")[1] ?? ""),
};

// ─── SOURCE DOCTRINE ─────────────────────────────────────────────────────────
// Authoritative map of every regulation in the knowledge base.
// Each entry carries: the official legislation URL, the monitoring/update channel,
// update frequency, and the administering agency.
// Used by:
//   1. The LLM citation prompt (verified URLs only — no hallucinated links)
//   2. The scheduled regulation monitor (feeds to check for new publications)
//   3. The Admin KB management page (shows what to check and when)

export type SourceDoctrineEntry = {
  title: string;
  jurisdiction: string;
  category: "legislation" | "standard" | "code" | "guidance";
  administeringAgency: string;
  officialUrl: string;
  monitorUrl: string;       // The page/feed to check for updates
  monitorChannel: string;   // How to subscribe: email, RSS, manual check
  updateFrequency: string;  // How often changes typically occur
  lastKnownUpdate: string;  // Last update reflected in this knowledge base
  notes?: string;
};

export const SOURCE_DOCTRINE: SourceDoctrineEntry[] = [
  // ── FEDERAL ──────────────────────────────────────────────────────────────────
  {
    title: "Wine Australia Act 2013",
    jurisdiction: "Federal",
    category: "legislation",
    administeringAgency: "Wine Australia",
    officialUrl: "https://www.legislation.gov.au/C2013A00051/latest/text",
    monitorUrl: "https://www.legislation.gov.au/C2013A00051",
    monitorChannel: "Free email alert — create account at legislation.gov.au/sign-up and subscribe to this act",
    updateFrequency: "Infrequent (major amendments every 2–5 years)",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Wine Australia Regulations 2018",
    jurisdiction: "Federal",
    category: "legislation",
    administeringAgency: "Wine Australia",
    officialUrl: "https://www.legislation.gov.au/F2018L00567/latest/text",
    monitorUrl: "https://www.legislation.gov.au/F2018L00567",
    monitorChannel: "Free email alert — legislation.gov.au/sign-up",
    updateFrequency: "Occasional (1–2 amendments per year)",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Food Standards Code — Standard 4.5.1 (Wine Production Requirements)",
    jurisdiction: "Federal",
    category: "standard",
    administeringAgency: "Food Standards Australia New Zealand (FSANZ)",
    officialUrl: "https://www.legislation.gov.au/F2015L00403/latest/text",
    monitorUrl: "https://www.foodstandards.gov.au/food-standards-code/circulars",
    monitorChannel: "Free email subscription — foodstandards.gov.au/subscribe → 'Food Standards News'",
    updateFrequency: "Occasional (amendments gazetted via Notification Circulars)",
    lastKnownUpdate: "May 2026",
    notes: "FSANZ Notification Circulars are the authoritative update channel. Each circular is published at foodstandards.gov.au/food-standards-code/circulars.",
  },
  {
    title: "Food Standards Code — Standard 3.2.2 (Food Safety Practices)",
    jurisdiction: "Federal",
    category: "standard",
    administeringAgency: "Food Standards Australia New Zealand (FSANZ)",
    officialUrl: "https://www.legislation.gov.au/F2015L00404/latest/text",
    monitorUrl: "https://www.foodstandards.gov.au/food-standards-code/circulars",
    monitorChannel: "Free email subscription — foodstandards.gov.au/subscribe",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Food Standards Code — Standard 3.2.2A (Food Safety Management Statements)",
    jurisdiction: "Federal",
    category: "standard",
    administeringAgency: "Food Standards Australia New Zealand (FSANZ)",
    officialUrl: "https://www.legislation.gov.au/F2021L01342/latest/text",
    monitorUrl: "https://www.foodstandards.gov.au/food-standards-code/circulars",
    monitorChannel: "Free email subscription — foodstandards.gov.au/subscribe",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
    notes: "Mandatory food safety management statements for certain food businesses from December 2023.",
  },
  {
    title: "A New Tax System (Wine Equalisation Tax) Act 1999",
    jurisdiction: "Federal",
    category: "legislation",
    administeringAgency: "Australian Taxation Office (ATO)",
    officialUrl: "https://www.legislation.gov.au/C2004A00451/latest/text",
    monitorUrl: "https://www.ato.gov.au/businesses-and-organisations/income-deductions-and-concessions/wine-equalisation-tax",
    monitorChannel: "ATO website updates; Federal Budget announcements for rebate cap changes",
    updateFrequency: "Annual (rebate cap adjusted in Federal Budget)",
    lastKnownUpdate: "May 2026",
    notes: "WET Producer Rebate cap: $350,000 FY2025–26, rising to $400,000 from 1 July 2026.",
  },
  {
    title: "Work Health and Safety Act 2011 (Cth) — Model WHS Act",
    jurisdiction: "Federal",
    category: "legislation",
    administeringAgency: "Safe Work Australia",
    officialUrl: "https://www.legislation.gov.au/C2011A00137/latest/text",
    monitorUrl: "https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws",
    monitorChannel: "Safe Work Australia website; free email updates via safeworkaustralia.gov.au",
    updateFrequency: "Infrequent (major reviews every 5 years)",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Wine Australia Licensing and Compliance Guide",
    jurisdiction: "Federal",
    category: "guidance",
    administeringAgency: "Wine Australia",
    officialUrl: "https://www.wineaustralia.com/selling/regulatory-services",
    monitorUrl: "https://www.wineaustralia.com/news",
    monitorChannel: "Free Wine Australia newsletter — wineaustralia.com (create free account)",
    updateFrequency: "Annual (guide updated; news published continuously)",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "AWRI Regulatory Assistance — Fact Sheets and Helpdesk",
    jurisdiction: "Federal",
    category: "guidance",
    administeringAgency: "Australian Wine Research Institute (AWRI)",
    officialUrl: "https://www.awri.com.au/industry_support/regulatory_assistance/",
    monitorUrl: "https://www.awri.com.au/industry_support/regulatory_assistance/",
    monitorChannel: "AWRI website — free fact sheets; free helpdesk for levy payers",
    updateFrequency: "Continuous (fact sheets updated as standards change)",
    lastKnownUpdate: "May 2026",
    notes: "Free to all Australian grapegrowers and winemakers who pay the Winegrapes and/or Grape Research levies.",
  },

  // ── SOUTH AUSTRALIA ───────────────────────────────────────────────────────────
  {
    title: "Liquor Licensing Act 1997 (SA)",
    jurisdiction: "SA",
    category: "legislation",
    administeringAgency: "Consumer and Business Services (CBS) SA",
    officialUrl: "https://www.legislation.sa.gov.au/LZ/C/A/LIQUOR%20LICENSING%20ACT%201997.aspx",
    monitorUrl: "https://legislation.sa.gov.au/about-this-site/subscribe-to-updates",
    monitorChannel: "Free email alert — legislation.sa.gov.au/about-this-site/subscribe-to-updates",
    updateFrequency: "Occasional (Stage 2 reforms underway as of 2026)",
    lastKnownUpdate: "May 2026",
    notes: "CBS SA administers licensing. Stage 2 reforms introduce tougher penalties and expanded minor protections.",
  },
  {
    title: "Environment Protection Act 1993 (SA)",
    jurisdiction: "SA",
    category: "legislation",
    administeringAgency: "Environment Protection Authority (EPA) SA",
    officialUrl: "https://www.legislation.sa.gov.au/LZ/C/A/ENVIRONMENT%20PROTECTION%20ACT%201993.aspx",
    monitorUrl: "https://www.epa.sa.gov.au/",
    monitorChannel: "EPA SA website; legislation.sa.gov.au email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Work Health and Safety Act 2012 (SA)",
    jurisdiction: "SA",
    category: "legislation",
    administeringAgency: "SafeWork SA",
    officialUrl: "https://www.legislation.sa.gov.au/LZ/C/A/WORK%20HEALTH%20AND%20SAFETY%20ACT%202012.aspx",
    monitorUrl: "https://www.safework.sa.gov.au/",
    monitorChannel: "SafeWork SA website; legislation.sa.gov.au email alerts",
    updateFrequency: "Infrequent",
    lastKnownUpdate: "May 2026",
  },

  // ── VICTORIA ──────────────────────────────────────────────────────────────────
  {
    title: "Liquor Control Reform Act 1998 (VIC)",
    jurisdiction: "VIC",
    category: "legislation",
    administeringAgency: "Victorian Commission for Gambling and Liquor Regulation (VCGLR)",
    officialUrl: "https://www.legislation.vic.gov.au/in-force/acts/liquor-control-reform-act-1998",
    monitorUrl: "https://www.vcglr.vic.gov.au/",
    monitorChannel: "VCGLR website updates; legislation.vic.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── NEW SOUTH WALES ───────────────────────────────────────────────────────────
  {
    title: "Liquor Act 2007 (NSW)",
    jurisdiction: "NSW",
    category: "legislation",
    administeringAgency: "Liquor & Gaming NSW",
    officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2007-090",
    monitorUrl: "https://www.liquorandgaming.nsw.gov.au/",
    monitorChannel: "Liquor & Gaming NSW website; legislation.nsw.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── WESTERN AUSTRALIA ─────────────────────────────────────────────────────────
  {
    title: "Liquor Control Act 1988 (WA)",
    jurisdiction: "WA",
    category: "legislation",
    administeringAgency: "Department of Local Government, Sport and Cultural Industries (DLGSC)",
    officialUrl: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_540_homepage.html",
    monitorUrl: "https://www.cits.wa.gov.au/department",
    monitorChannel: "DLGSC website; legislation.wa.gov.au",
    updateFrequency: "Occasional (2025 amendments in effect)",
    lastKnownUpdate: "May 2026",
    notes: "2025 amendments include acceptance of digital ID forms.",
  },

  // ── QUEENSLAND ────────────────────────────────────────────────────────────────
  {
    title: "Liquor Act 1992 (QLD)",
    jurisdiction: "QLD",
    category: "legislation",
    administeringAgency: "Office of Liquor and Gaming Regulation (OLGR) QLD",
    officialUrl: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-1992-055",
    monitorUrl: "https://www.olgr.qld.gov.au/",
    monitorChannel: "OLGR QLD website; legislation.qld.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── TASMANIA ──────────────────────────────────────────────────────────────────
  {
    title: "Liquor Licensing Act 1990 (TAS)",
    jurisdiction: "TAS",
    category: "legislation",
    administeringAgency: "Consumer, Building and Occupational Services (CBOS) TAS",
    officialUrl: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-1990-062",
    monitorUrl: "https://www.cbos.tas.gov.au/",
    monitorChannel: "CBOS TAS website; legislation.tas.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
];

// ─── SOURCE DOCTRINE HELPERS ─────────────────────────────────────────────────

/** Returns the doctrine entry for a given act title (case-insensitive partial match). */
export function findSourceEntry(title: string): SourceDoctrineEntry | undefined {
  const lower = title.toLowerCase();
  return SOURCE_DOCTRINE.find(
    (e) => e.title.toLowerCase().includes(lower) || lower.includes(e.title.toLowerCase())
  );
}

/** Builds a compact URL reference block to inject into the LLM system prompt. */
export function buildSourceDoctrineSummary(): string {
  const lines = SOURCE_DOCTRINE.map(
    (e) => `- ${e.title} [${e.jurisdiction}]: ${e.officialUrl}`
  );
  return [
    "## VERIFIED SOURCE URLS",
    "Use ONLY these verified URLs when populating the url field in citations. Do not invent URLs.",
    ...lines,
  ].join("\n");
}

export function buildScopedKnowledgeBase(jurisdictions: string[]): string {
  const parts: string[] = [KB_SECTIONS.Federal];
  for (const j of jurisdictions) {
    if (j !== "Federal" && KB_SECTIONS[j]) parts.push(KB_SECTIONS[j]);
  }
  parts.push(KB_SECTIONS.Contacts);
  return parts.join("\n\n");
}
