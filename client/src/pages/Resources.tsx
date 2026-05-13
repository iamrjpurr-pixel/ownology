/**
 * Resources — Ownology Regulatory Reference Library
 * A structured, searchable reference page for Australian winery regulations.
 * Covers federal framework and South Australia state requirements.
 */

import { useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'Fira Code', monospace";

// ─── Data ─────────────────────────────────────────────────────────────────────

const FEDERAL_SECTIONS = [
  {
    id: "wine-australia",
    title: "Wine Australia Registration & LIP",
    agency: "Wine Australia",
    tags: ["registration", "LIP", "labels", "export"],
    summary:
      "Any producer making a wholesale sale of grape wine must register with Wine Australia before commencing commercial activity — regardless of volume. The Label Integrity Program (LIP) requires records for every batch covering vintage, variety, and GI claims.",
    keyPoints: [
      "Registration required before first commercial sale — no minimum volume",
      "Annual grape grower and winemaker levy on volume crushed",
      "LIP: ≥ 85% vintage, ≥ 85% variety, ≥ 85% GI for label claims",
      "LIP records must be retained for 5 years and available on request",
      "Export licence required separately; export permits per shipment",
      "Labels for export must be pre-registered in Wine Australia Label Directory",
    ],
    source: "Wine Australia Act 2013 / Wine Australia Regulations 2018",
    sourceUrl: "https://www.wineaustralia.com/regulation/compliance",
    verifiedDate: "May 2026",
  },
  {
    id: "fsanz",
    title: "FSANZ Standard 4.5.1 — Wine Composition",
    agency: "FSANZ",
    tags: ["additives", "SO2", "food standards", "composition"],
    summary:
      "Standard 4.5.1 of the Australia New Zealand Food Standards Code governs permitted additives, processing aids, and compositional requirements for wine. Key limits include SO₂ at 250 mg/L (dry) and 300 mg/L (sweet), with most other additives at GMP.",
    keyPoints: [
      "SO₂ max: 250 mg/L (< 35 g/L residual sugar), 300 mg/L (> 35 g/L)",
      "Sorbic acid / potassium sorbate: max 200 mg/L",
      "Tartaric, malic, lactic, citric acid: GMP (lowest effective level)",
      "Copper sulfate: max 1 mg/L (as Cu) in finished wine",
      "Dimethyl dicarbonate (DMDC): max 200 mg/L, must be undetectable at bottling",
      "Water addition: only permitted to adjust alcohol in table wine, strictly limited",
      "Pregnancy warning label mandatory on all wine sold in Australia from 31 July 2023",
    ],
    source: "FSANZ Standard 4.5.1",
    sourceUrl: "https://www.foodstandards.gov.au/food-standards-code/primary-production-and-processing-standards/wine-production-requirements",
    verifiedDate: "May 2026",
  },
  {
    id: "wet",
    title: "Wine Equalisation Tax (WET) & Producer Rebate",
    agency: "ATO",
    tags: ["tax", "WET", "rebate", "excise"],
    summary:
      "WET is a 29% wholesale value tax on wine. Most boutique producers are eligible for the WET Producer Rebate, which offsets WET liability up to an annual cap. The cap is rising to $400,000 from 1 July 2026.",
    keyPoints: [
      "WET rate: 29% of the taxable value (wholesale selling price)",
      "WET Producer Rebate cap: $350,000 (2025–26), rising to $400,000 (2026–27)",
      "Eligibility: must own the wine at the time of the assessable dealing",
      "Cellar door sales are assessable dealings — WET applies",
      "Must be registered for GST to claim the rebate",
      "Annual WET return lodged with BAS or separately",
    ],
    source: "A New Tax System (Wine Equalisation Tax) Act 1999",
    sourceUrl: "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/wine-equalisation-tax",
    verifiedDate: "May 2026",
  },
  {
    id: "labelling",
    title: "Mandatory Labelling Requirements",
    agency: "FSANZ / Wine Australia",
    tags: ["labels", "pregnancy warning", "allergens", "GI"],
    summary:
      "Australian wine labels must include specific mandatory elements under both FSANZ and Wine Australia rules. The pregnancy warning became mandatory from 31 July 2023 and is the most recent significant change.",
    keyPoints: [
      "Pregnancy warning: mandatory from 31 July 2023 — specific wording and graphic required",
      "Allergen declaration: sulphites (if > 10 mg/L SO₂), egg, milk, fish, gluten",
      "Alcohol content: must be stated as % v/v, within ±1.5% of actual",
      "Standard drinks: mandatory on all containers",
      "Country of origin: required on all wine sold in Australia",
      "LIP claims (vintage, variety, GI) must be supported by LIP records",
    ],
    source: "FSANZ Standard 2.7.1 / Wine Australia Act 2013",
    sourceUrl: "https://www.wineaustralia.com/regulation/labelling",
    verifiedDate: "May 2026",
  },
  {
    id: "biosecurity",
    title: "Biosecurity & Import Controls",
    agency: "DAFF",
    tags: ["biosecurity", "import", "phylloxera", "plant material"],
    summary:
      "The Department of Agriculture, Fisheries and Forestry (DAFF) administers biosecurity controls relevant to wineries — particularly for imported plant material, oak products, and winemaking equipment.",
    keyPoints: [
      "Imported oak barrels and staves require biosecurity clearance",
      "Imported winemaking additives (enzymes, yeasts) require import permits",
      "Phylloxera management: state-based but underpinned by national biosecurity framework",
      "Grape vine material (cuttings, rootstock) subject to strict import controls",
      "Winemaking equipment imported from phylloxera-affected regions requires treatment",
    ],
    source: "Biosecurity Act 2015",
    sourceUrl: "https://www.agriculture.gov.au/biosecurity-trade",
    verifiedDate: "May 2026",
  },
  {
    id: "whs-federal",
    title: "Work Health & Safety (Federal Model Law)",
    agency: "Safe Work Australia",
    tags: ["WHS", "safety", "CO2", "confined space"],
    summary:
      "Safe Work Australia's model WHS laws (adopted in SA, NSW, QLD, ACT, NT, TAS) impose specific obligations on wineries around CO₂ confined space entry, chemical handling, and manual tasks.",
    keyPoints: [
      "CO₂ is a confined space hazard — entry requires permit, atmospheric testing, standby person",
      "SO₂ handling: SDS required, PPE mandatory, exposure standard 0.5 ppm TWA",
      "Caustic soda (NaOH): SDS, PPE, emergency eyewash within 10 seconds of exposure",
      "Manual tasks: risk assessment required for repetitive lifting (barrel handling, hose work)",
      "Electrical: 3-phase equipment requires licensed electrician for installation",
      "Incident notification: serious injuries must be reported to regulator immediately",
    ],
    source: "Work Health and Safety Act 2011 (Cth model)",
    sourceUrl: "https://www.safeworkaustralia.gov.au",
    verifiedDate: "May 2026",
  },
];

const SA_SECTIONS = [
  {
    id: "sa-liquor",
    title: "Liquor Licensing — Producer's Licence",
    agency: "Consumer and Business Services SA",
    tags: ["liquor licence", "cellar door", "wholesale", "CBS"],
    summary:
      "SA wineries require a Producer's Licence under the Liquor Licensing Act 1997 to sell wine. The licence permits cellar door sales, wholesale, and limited on-premises consumption. Applications go through CBS SA.",
    keyPoints: [
      "Producer's Licence required for any sale of wine produced on premises",
      "Cellar door sales permitted under Producer's Licence — no separate retail licence needed",
      "Wholesale sales to licensees permitted without additional licence",
      "Application fee: approx. $500–$1,500 depending on turnover category",
      "Annual licence fee applies — tiered by turnover",
      "Responsible Service of Alcohol (RSA) training required for all staff serving alcohol",
      "Extended trading hours (beyond 11pm) require separate approval",
    ],
    source: "Liquor Licensing Act 1997 (SA)",
    sourceUrl: "https://www.cbs.sa.gov.au/licences/liquor-licences",
    verifiedDate: "May 2026",
  },
  {
    id: "sa-epa",
    title: "EPA Environmental Obligations",
    agency: "Environment Protection Authority SA",
    tags: ["EPA", "wastewater", "odour", "scheduled premises"],
    summary:
      "SA wineries generating > 100 kL of winery wastewater per year are 'scheduled premises' under the Environment Protection Act 1993 and require an EPA licence. Key obligations cover wastewater disposal, odour, and noise.",
    keyPoints: [
      "Scheduled premises threshold: > 100 kL wastewater per year (most boutique wineries)",
      "EPA licence required before commencing operations at scheduled premises",
      "Wastewater must be managed via approved irrigation, evaporation, or treatment system",
      "Wastewater application rates: typically 50–100 mm/application, 30-day rest period",
      "Odour: must not cause unreasonable interference to neighbours",
      "Noise: must comply with EPA noise guidelines (typically 52 dB(A) daytime)",
      "Annual environmental performance report may be required",
      "Spill bunding: all chemical storage areas must be bunded to 110% of largest container",
    ],
    source: "Environment Protection Act 1993 (SA) / EPA Guidelines for Wineries",
    sourceUrl: "https://www.epa.sa.gov.au/business_and_industry/wineries",
    verifiedDate: "May 2026",
  },
  {
    id: "sa-planning",
    title: "Planning & Development Approval",
    agency: "Local Council / State Planning Commission",
    tags: ["planning", "development approval", "zoning", "council"],
    summary:
      "Establishing or expanding a winery in SA requires development approval under the Planning, Development and Infrastructure Act 2016. Cellar door facilities, processing buildings, and effluent systems all require approval.",
    keyPoints: [
      "Development approval required for new winery buildings, processing facilities, and cellar doors",
      "Primary production zones generally permit winery use — check local council zone",
      "Cellar door with food service may require additional assessment (tourist/commercial use)",
      "Effluent irrigation system requires council/planning approval and EPA input",
      "Building Rules consent required for all new structures",
      "Heritage zones: additional constraints if property is heritage listed",
      "Application to local council Development Assessment Panel (DAP) for significant proposals",
    ],
    source: "Planning, Development and Infrastructure Act 2016 (SA)",
    sourceUrl: "https://www.sa.gov.au/topics/housing-property-and-land/planning-and-development",
    verifiedDate: "May 2026",
  },
  {
    id: "sa-safework",
    title: "SafeWork SA — WHS Obligations",
    agency: "SafeWork SA",
    tags: ["WHS", "safety", "CO2", "harvest", "SafeWork"],
    summary:
      "SafeWork SA administers the Work Health and Safety Act 2012 (SA). Wineries have specific obligations around CO₂ confined space entry, chemical handling, and seasonal harvest worker safety.",
    keyPoints: [
      "CO₂ confined space: written permit system, atmospheric testing, trained standby person required",
      "Seasonal workers: induction required before commencing work — language barriers must be addressed",
      "Forklift operators: must hold a High Risk Work Licence (HRWL) — no exceptions",
      "Electrical safety: all portable electrical equipment must be tested and tagged",
      "Chemical register: SDS required for all hazardous chemicals on site",
      "Manual handling: risk assessment for barrel rolling, hose work, grape receival",
      "Incident reporting: serious injuries, dangerous incidents must be notified to SafeWork SA immediately",
    ],
    source: "Work Health and Safety Act 2012 (SA)",
    sourceUrl: "https://www.safework.sa.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "sa-water",
    title: "Water Licensing & NRM",
    agency: "Department for Environment and Water SA",
    tags: ["water", "NRM", "irrigation", "licence"],
    summary:
      "Wineries in SA that extract water from a watercourse, aquifer, or prescribed water resource require a water licence under the Natural Resources Management Act 2004. Winery wastewater irrigation is also regulated.",
    keyPoints: [
      "Water extraction licence required for bores, dams, or watercourse extraction",
      "Annual water allocation: set by NRM Board for each region",
      "Wastewater irrigation: must comply with EPA guidelines and NRM water quality rules",
      "Metering: water meters required on all licensed extraction points",
      "Trading: water allocations can be leased or traded within the same water resource",
      "Barossa Prescribed Water Resources Area: strict allocation limits apply",
    ],
    source: "Natural Resources Management Act 2004 (SA)",
    sourceUrl: "https://www.environment.sa.gov.au/topics/water",
    verifiedDate: "May 2026",
  },
  {
    id: "sa-food",
    title: "Food Act Registration",
    agency: "Local Council / SA Health",
    tags: ["food safety", "food act", "registration", "council"],
    summary:
      "Wineries with cellar door food service, tasting rooms serving food, or on-site restaurants must register as a food business under the Food Act 2001 (SA) with their local council.",
    keyPoints: [
      "Food business registration required if food is prepared or served on premises",
      "Tasting room serving cheese, charcuterie, or any food = food business",
      "Annual registration fee: approx. $200–$600 depending on risk category",
      "Food safety supervisor required for higher-risk food businesses",
      "Council food safety inspection: typically annual or biennial",
      "Food handler training: all staff handling food must have basic food safety training",
    ],
    source: "Food Act 2001 (SA)",
    sourceUrl: "https://www.sahealth.sa.gov.au/food",
    verifiedDate: "May 2026",
  },
];

const VIC_SECTIONS = [
  {
    id: "vic-liquor",
    title: "Liquor Licensing — Winery Producer's Licence",
    agency: "Liquor Control Victoria (VCGLR)",
    tags: ["liquor licence", "cellar door", "producer", "VCGLR"],
    summary:
      "Victorian wineries require a Producer's Licence under the Liquor Control Reform Act 1998 to manufacture and sell wine. The licence covers cellar door sales, wholesale to licensees, and limited on-site consumption. Applications are lodged with the Victorian Commission for Gambling and Liquor Regulation (VCGLR).",
    keyPoints: [
      "Producer's Licence required before manufacturing or selling wine commercially",
      "Cellar door sales permitted under Producer's Licence — no separate retail licence needed",
      "Wholesale to other licensees permitted without additional licence",
      "Application lodged online via VCGLR — processing time typically 4–8 weeks",
      "Annual licence fee: tiered by turnover category (approx. $300–$2,000+)",
      "Responsible Service of Alcohol (RSA) training mandatory for all staff serving alcohol",
      "Extended trading hours or entertainment activities may require variation or additional approval",
      "Minors: strict rules on presence of minors in licensed areas — check VCGLR guidance",
    ],
    source: "Liquor Control Reform Act 1998 (Vic)",
    sourceUrl: "https://www.vcglr.vic.gov.au/liquor/licences-and-permits",
    verifiedDate: "May 2026",
  },
  {
    id: "vic-epa",
    title: "EPA Environmental Obligations — D09 Exemption",
    agency: "Environment Protection Authority Victoria",
    tags: ["EPA", "wastewater", "D09", "scheduled premises", "environment"],
    summary:
      "Most boutique Victorian wineries are exempt from EPA licensing under the D09 beverage manufacturing exemption in the Environment Protection Regulations 2021, provided they meet specific conditions on wastewater volume and land application. Larger operations may require an EPA Works Approval or Licence.",
    keyPoints: [
      "D09 exemption applies to beverage manufacturing (including wine) below prescribed thresholds",
      "Exempt wineries must still comply with the general environmental duty under the EP Act 2017",
      "Wastewater must be land-applied in accordance with EPA guidelines — no discharge to waterways",
      "Wineries exceeding D09 thresholds require an EPA Works Approval before construction and a Licence to operate",
      "General environmental duty: must take reasonably practicable steps to minimise risk of harm",
      "Odour and noise must not cause unreasonable interference to neighbours",
      "Chemical bunding: all chemical storage must be bunded to 110% of largest container",
      "Spill response plan recommended for all wineries regardless of licensing status",
    ],
    source: "Environment Protection Act 2017 (Vic) / Environment Protection Regulations 2021 (Vic)",
    sourceUrl: "https://www.epa.vic.gov.au/for-business/find-your-industry/food-and-beverage",
    verifiedDate: "May 2026",
  },
  {
    id: "vic-worksafe",
    title: "WorkSafe Victoria — OHS Obligations",
    agency: "WorkSafe Victoria",
    tags: ["OHS", "safety", "CO2", "confined space", "WorkSafe"],
    summary:
      "WorkSafe Victoria administers the Occupational Health and Safety Act 2004 (Vic). Victorian wineries have specific obligations around CO₂ confined space entry, chemical handling, seasonal harvest worker safety, and plant and equipment registration.",
    keyPoints: [
      "CO₂ confined space: written confined space entry permit required, atmospheric testing, standby person",
      "SO₂ handling: SDS required, PPE mandatory, exposure standard 0.5 ppm TWA",
      "Forklift operators: must hold a High Risk Work Licence (HRWL) — no exceptions",
      "Seasonal workers: induction required before commencing work — language barriers must be addressed",
      "Electrical: all portable electrical equipment must be tested and tagged",
      "Chemical register: SDS required for all hazardous substances on site",
      "Incident reporting: serious injuries and dangerous incidents must be notified to WorkSafe Victoria immediately",
      "Designer/manufacturer duties: any custom-built winery equipment must meet OHS design standards",
    ],
    source: "Occupational Health and Safety Act 2004 (Vic)",
    sourceUrl: "https://www.worksafe.vic.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "vic-planning",
    title: "Planning & Development Approval",
    agency: "Local Council / DELWP",
    tags: ["planning", "development", "zoning", "permit", "council"],
    summary:
      "Establishing or expanding a winery in Victoria requires a planning permit under the Planning and Environment Act 1987. Requirements vary by zone and overlay — farming zones generally permit winery use, but cellar doors and tourist facilities often require a permit.",
    keyPoints: [
      "Planning permit required for new winery buildings, processing facilities, and cellar doors in most zones",
      "Farming Zone (FZ): winery use generally permitted; cellar door may require permit depending on scale",
      "Rural Activity Zone (RAZ): winery and cellar door use typically requires permit",
      "Heritage overlay, bushfire management overlay, or environmental significance overlay may add requirements",
      "Building permit required for all new structures under the Building Act 1993",
      "Wastewater/effluent system: EPA and council input required for land application systems",
      "Application to local council — processing time varies; pre-application meetings recommended",
    ],
    source: "Planning and Environment Act 1987 (Vic)",
    sourceUrl: "https://www.planning.vic.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "vic-water",
    title: "Water Licensing",
    agency: "Department of Energy, Environment and Climate Action (DEECA)",
    tags: ["water", "licence", "extraction", "irrigation"],
    summary:
      "Victorian wineries that extract water from a waterway, bore, or other water resource require a water licence under the Water Act 1989. Wastewater irrigation is also regulated and must comply with EPA guidelines.",
    keyPoints: [
      "Water licence required for extraction from waterways, bores, or prescribed water resources",
      "Annual water allocation: set by the relevant Catchment Management Authority (CMA)",
      "Wastewater irrigation: must comply with EPA guidelines and not cause waterway contamination",
      "Metering: water meters required on all licensed extraction points",
      "Water trading: allocations can be traded within the same water system",
      "Groundwater: separate licence required for bore extraction in prescribed areas",
    ],
    source: "Water Act 1989 (Vic)",
    sourceUrl: "https://www.water.vic.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "vic-food",
    title: "Food Act Registration",
    agency: "Local Council / Department of Health Vic",
    tags: ["food safety", "food act", "registration", "cellar door"],
    summary:
      "Victorian wineries with cellar door food service, tasting rooms serving food, or on-site restaurants must register as a food business under the Food Act 1984 (Vic) with their local council.",
    keyPoints: [
      "Food business registration required if food is prepared or served on premises",
      "Tasting room serving cheese, charcuterie, or any food = food business registration required",
      "Annual registration fee: approx. $100–$500 depending on risk category and council",
      "Food Safety Supervisor required for Class 1 and Class 2 food businesses",
      "Council food safety inspection: typically annual",
      "Food handler training: all staff handling food must have basic food safety training",
    ],
    source: "Food Act 1984 (Vic)",
    sourceUrl: "https://www.health.vic.gov.au/food-safety",
    verifiedDate: "May 2026",
  },
];

const NSW_SECTIONS = [
  {
    id: "nsw-liquor",
    title: "Liquor Licensing — Producer/Wholesaler Licence",
    agency: "Liquor & Gaming NSW",
    tags: ["liquor licence", "cellar door", "producer", "L&G NSW"],
    summary:
      "NSW wineries require a Producer/Wholesaler Licence under the Liquor Act 2007 to manufacture and sell wine. The licence permits cellar door retail sales, wholesale to other licensees, and limited on-site consumption. Applications are lodged with Liquor & Gaming NSW.",
    keyPoints: [
      "Producer/Wholesaler Licence required before manufacturing or selling wine commercially",
      "Cellar door retail sales permitted under Producer/Wholesaler Licence",
      "Wholesale to other licensees permitted without additional licence",
      "Application lodged online via Liquor & Gaming NSW — processing time typically 4–8 weeks",
      "Annual licence fee: tiered by turnover (approx. $500–$3,000+)",
      "Responsible Service of Alcohol (RSA) training mandatory for all staff serving alcohol",
      "Community impact statement may be required for new applications in sensitive areas",
      "Minors: strict rules on presence of minors in licensed areas — check L&G NSW guidance",
    ],
    source: "Liquor Act 2007 (NSW)",
    sourceUrl: "https://www.liquorandgaming.nsw.gov.au/licences-and-permits",
    verifiedDate: "May 2026",
  },
  {
    id: "nsw-epa",
    title: "EPA Environment Protection Licence (EPL)",
    agency: "NSW EPA",
    tags: ["EPA", "EPL", "wastewater", "scheduled activity", "POEO"],
    summary:
      "NSW wineries that are 'scheduled premises' under the Protection of the Environment Operations Act 1997 (POEO Act) require an Environment Protection Licence (EPL). The threshold for beverage manufacturing is typically a production capacity of 750 kL/year or more. Smaller wineries are not scheduled but must still comply with the general environmental duty.",
    keyPoints: [
      "EPL required for wineries at or above the scheduled activity threshold (beverage manufacturing ≥ 750 kL/year production capacity)",
      "Boutique wineries below the threshold are not scheduled but must comply with the general environmental duty",
      "Wastewater must be managed via approved land application, evaporation, or treatment — no discharge to waterways",
      "General environmental duty: must not pollute land, water, or air without lawful authority",
      "Odour and noise must not cause unreasonable interference to neighbours",
      "Chemical bunding: all chemical storage must be bunded to 110% of largest container",
      "Pollution incidents must be reported to the NSW EPA immediately",
      "Annual return required for EPL holders",
    ],
    source: "Protection of the Environment Operations Act 1997 (NSW)",
    sourceUrl: "https://www.epa.nsw.gov.au/licensing-and-regulation/licensing",
    verifiedDate: "May 2026",
  },
  {
    id: "nsw-safework",
    title: "SafeWork NSW — WHS Obligations",
    agency: "SafeWork NSW",
    tags: ["WHS", "safety", "CO2", "confined space", "SafeWork"],
    summary:
      "SafeWork NSW administers the Work Health and Safety Act 2011 (NSW). NSW wineries have specific obligations around CO₂ confined space entry, chemical handling, seasonal harvest worker safety, and plant registration.",
    keyPoints: [
      "CO₂ confined space: written confined space entry permit required, atmospheric testing, standby person",
      "SO₂ handling: SDS required, PPE mandatory, exposure standard 0.5 ppm TWA",
      "Forklift operators: must hold a High Risk Work Licence (HRWL) — no exceptions",
      "Seasonal workers: induction required before commencing work — language barriers must be addressed",
      "Electrical: all portable electrical equipment must be tested and tagged",
      "Chemical register: SDS required for all hazardous chemicals on site",
      "Incident reporting: serious injuries and dangerous incidents must be notified to SafeWork NSW immediately",
      "Plant registration: pressure vessels and certain plant items require registration with SafeWork NSW",
    ],
    source: "Work Health and Safety Act 2011 (NSW)",
    sourceUrl: "https://www.safework.nsw.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "nsw-planning",
    title: "Planning & Development Approval",
    agency: "Local Council / NSW Department of Planning",
    tags: ["planning", "development", "DA", "zoning", "council"],
    summary:
      "Establishing or expanding a winery in NSW requires development consent (DA) under the Environmental Planning and Assessment Act 1979. Requirements vary by zone and local environmental plan (LEP) — rural and primary production zones generally permit winery use, but cellar doors and tourist facilities often require consent.",
    keyPoints: [
      "Development consent (DA) required for new winery buildings, processing facilities, and cellar doors in most zones",
      "Rural zones (RU1, RU2): winery use generally permitted; cellar door may require consent depending on scale",
      "State Environmental Planning Policy (SEPP) Primary Production and Rural Development may apply",
      "Heritage conservation area or item: additional requirements if property is heritage listed",
      "Building approval required for all new structures under the Building Code of Australia",
      "Wastewater/effluent system: EPA and council input required for land application systems",
      "Application to local council — pre-DA meeting recommended for significant proposals",
    ],
    source: "Environmental Planning and Assessment Act 1979 (NSW)",
    sourceUrl: "https://www.planning.nsw.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "nsw-water",
    title: "Water Licensing — NRAR",
    agency: "Natural Resources Access Regulator (NRAR)",
    tags: ["water", "licence", "NRAR", "extraction", "irrigation"],
    summary:
      "NSW wineries that extract water from a waterway, bore, or other regulated water source require a water access licence under the Water Management Act 2000. The Natural Resources Access Regulator (NRAR) enforces water licensing compliance.",
    keyPoints: [
      "Water access licence required for extraction from regulated rivers, bores, or prescribed water sources",
      "Annual water allocation: set by the relevant Water Sharing Plan for the water source",
      "Wastewater irrigation: must comply with EPA guidelines and not cause waterway contamination",
      "Metering: water meters required on all licensed extraction points",
      "Water trading: access licences and allocations can be traded within the same water source",
      "Groundwater: separate licence required for bore extraction in regulated areas",
      "Non-compliance: NRAR has strong enforcement powers including stop-work orders and significant penalties",
    ],
    source: "Water Management Act 2000 (NSW)",
    sourceUrl: "https://www.nrar.nsw.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "nsw-food",
    title: "Food Business Notification — NSW Food Authority",
    agency: "NSW Food Authority / Local Council",
    tags: ["food safety", "food act", "notification", "cellar door"],
    summary:
      "NSW wineries with cellar door food service, tasting rooms serving food, or on-site restaurants must notify the NSW Food Authority and/or register as a food business with their local council under the Food Act 2003 (NSW).",
    keyPoints: [
      "Food business notification required if food is prepared or served on premises",
      "Tasting room serving cheese, charcuterie, or any food = food business notification required",
      "Winery with restaurant or significant food service: registration with local council required",
      "Annual registration fee: approx. $100–$500 depending on risk category and council",
      "Food Safety Supervisor required for businesses handling potentially hazardous food",
      "Council food safety inspection: typically annual",
      "Food handler training: all staff handling food must have basic food safety training",
    ],
    source: "Food Act 2003 (NSW)",
    sourceUrl: "https://www.foodauthority.nsw.gov.au",
    verifiedDate: "May 2026",
  },
];

const WA_SECTIONS = [
  {
    id: "wa-liquor",
    title: "Liquor Licensing — Producer's Licence",
    agency: "DLGSC Racing, Gaming and Liquor",
    tags: ["liquor licence", "cellar door", "producer", "DLGSC"],
    summary:
      "WA wineries require a Producer's Licence under the Liquor Control Act 1988 to manufacture and sell wine. The licence permits cellar door sales, wholesale, home delivery, and online sales. Applications are lodged with the Department of Local Government, Industry Regulation and Safety (DLGSC).",
    keyPoints: [
      "Producer's Licence required before manufacturing or selling wine commercially",
      "Cellar door tastings and sales permitted on licensed premises",
      "Home delivery and online sales permitted; must check Banned Drinker Register for restricted areas",
      "Cellar door Extended Trading Permit (ETP) available for off-site sales locations",
      "Applicant must demonstrate genuine production business within 12 months",
      "Blended wine: at least 50% must be fermented by or under the direction of the licensee",
      "Record-keeping mandatory for all alcohol transactions; failure is an offence ($10,000 fine)",
      "Responsible Service of Alcohol (RSA) training required for all staff serving alcohol",
    ],
    source: "Liquor Control Act 1988 (WA)",
    sourceUrl: "https://www.dlgsc.wa.gov.au/liquor-gaming/liquor/licences-and-permits",
    verifiedDate: "May 2026",
  },
  {
    id: "wa-dwer",
    title: "Environmental Obligations — DWER Prescribed Premises",
    agency: "Department of Water and Environmental Regulation (DWER)",
    tags: ["EPA", "wastewater", "prescribed premises", "DWER", "environment"],
    summary:
      "WA wineries producing 350 kL of wine per year (approximately 500 tonnes of grapes) or more are Prescribed Premises under the Environmental Protection Regulations 1987 and require a Works Approval and Licence from DWER. Smaller wineries must still comply with the general environmental duty.",
    keyPoints: [
      "Prescribed premises threshold: ≥ 350 kL wine per year",
      "Prescribed premises require a Works Approval before construction and a Licence to operate",
      "Boutique wineries below threshold must comply with the general environmental duty",
      "Winery wastewater must not be discharged to waterways, drains, or groundwater",
      "Land application must comply with DWER Water Quality Protection Note 73 (Wineries and Distilleries)",
      "Nutrient and irrigation plan required for land application systems",
      "Chemical bunding: all chemical storage must be bunded",
      "Odour and noise must not cause unreasonable interference to neighbours",
    ],
    source: "Environmental Protection Act 1986 (WA) / Environmental Protection Regulations 1987 (WA)",
    sourceUrl: "https://www.dwer.wa.gov.au/licences-permits/environment-protection-licences",
    verifiedDate: "May 2026",
  },
  {
    id: "wa-worksafe",
    title: "WorkSafe WA — WHS Obligations",
    agency: "WorkSafe WA (DEMIRS)",
    tags: ["WHS", "safety", "CO2", "confined space", "WorkSafe WA"],
    summary:
      "WorkSafe WA administers the Work Health and Safety Act 2020 (WA). WA wineries have specific obligations around CO₂ confined space entry, chemical handling, seasonal harvest worker safety, and plant registration.",
    keyPoints: [
      "Provide and maintain a safe working environment, so far as is reasonably practicable",
      "Confined space entry: written permit system, atmospheric testing, trained standby person required",
      "CO₂ monitoring mandatory during active fermentation",
      "SO₂ handling: SDS required, PPE mandatory, exposure standard 0.5 ppm TWA",
      "Forklift operators: must hold a High Risk Work Licence (HRWL)",
      "Chemical register: SDS required for all hazardous chemicals on site",
      "Incident reporting: serious injuries and dangerous incidents must be notified to WorkSafe WA immediately",
    ],
    source: "Work Health and Safety Act 2020 (WA)",
    sourceUrl: "https://www.worksafe.wa.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "wa-planning",
    title: "Planning & Development Approval",
    agency: "Local Council / DPLH",
    tags: ["planning", "development", "DA", "zoning", "council"],
    summary:
      "Establishing or expanding a winery in WA requires a development application (DA) to the relevant local government under the Planning and Development Act 2005. Most vineyard land is zoned Rural or Agricultural; cellar door facilities typically require separate development approval.",
    keyPoints: [
      "Development application (DA) required for new winery buildings, processing facilities, and cellar doors",
      "Rural/Agricultural zones: winery use generally requires development approval",
      "Cellar door premises typically require separate DA with conditions on hours, patron numbers, and signage",
      "State Planning Policy 6.1 (Leeuwin-Naturaliste Ridge) applies in the Margaret River wine region",
      "Building permit required for all new structures under the Building Code of Australia",
      "Wastewater/effluent system: DWER and council input required for land application systems",
      "Pre-application meeting with council recommended for significant proposals",
    ],
    source: "Planning and Development Act 2005 (WA)",
    sourceUrl: "https://www.planning.wa.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "wa-water",
    title: "Water Licensing — DWER",
    agency: "Department of Water and Environmental Regulation (DWER)",
    tags: ["water", "licence", "bore", "extraction", "irrigation"],
    summary:
      "WA wineries that extract water from a waterway, bore, or other regulated water resource require a water licence under the Rights in Water and Irrigation Act 1914. Groundwater bore licences are required in proclaimed groundwater areas, including most of the South West (Margaret River, Great Southern).",
    keyPoints: [
      "Water licence required for extraction from waterways, bores, or prescribed water resources",
      "Annual water allocation: set by the relevant water resource management plan",
      "Groundwater: bore licence required in proclaimed groundwater areas (includes Margaret River, Great Southern)",
      "Water use must be metered and reported annually",
      "Wastewater irrigation: must comply with DWER Water Quality Protection Note 73",
      "Water trading: licences and allocations can be traded within the same water resource",
    ],
    source: "Rights in Water and Irrigation Act 1914 (WA)",
    sourceUrl: "https://www.dwer.wa.gov.au/licences-permits/water-licences",
    verifiedDate: "May 2026",
  },
  {
    id: "wa-food",
    title: "Food Business Registration — Local Council",
    agency: "Local Council / Department of Health WA",
    tags: ["food safety", "food act", "registration", "cellar door"],
    summary:
      "WA wineries that sell wine for consumption are classified as food businesses under the Food Act 2008 (WA). Cellar door food service requires food business registration with the local council. All food businesses must comply with the FSANZ Food Standards Code.",
    keyPoints: [
      "Food business registration required if food is prepared or served on premises",
      "Tasting room serving cheese, charcuterie, or any food = food business registration required",
      "Registration with local government environmental health department",
      "Annual registration fee: varies by council and risk category",
      "Food Safety Supervisor required for higher-risk food businesses",
      "Council food safety inspection: typically annual",
      "Food handler training: all staff handling food must have basic food safety training",
    ],
    source: "Food Act 2008 (WA)",
    sourceUrl: "https://www.health.wa.gov.au/Articles/F_I/Food-safety-and-hygiene",
    verifiedDate: "May 2026",
  },
];

const QLD_SECTIONS = [
  {
    id: "qld-liquor",
    title: "Wine Producer Licence — OLGR",
    agency: "Office of Liquor and Gaming Regulation (OLGR)",
    tags: ["liquor licence", "cellar door", "wine producer", "OLGR", "Wine Industry Act"],
    summary:
      "Queensland wineries require a wine producer licence under the Wine Industry Act 1994 (Qld) to manufacture and sell wine. The licence permits on-premises tasting, takeaway sales, and sales at satellite cellar doors. Applications are lodged with the Office of Liquor and Gaming Regulation (OLGR).",
    keyPoints: [
      "Wine producer licence required before manufacturing or selling wine commercially in Queensland",
      "Allows on-premises tasting and consumption, takeaway sales, and satellite cellar door sales",
      "Other producers' wine may be sold on-premises, provided it does not exceed 49% of annual sales",
      "Approved wine nominee must be present on each licensed premises",
      "Annual licence fees due by 31 July each year via OLGR client portal",
      "Annual return required: lists wine produced, sold, purchased, and blended",
      "Application: Form 1 + Form 5; criminal history and probity checks required",
      "Processing time: approximately 2\u20133 months",
      "Satellite cellar door approval (Form 10) available for sales at a separate premises",
    ],
    source: "Wine Industry Act 1994 (Qld) / Wine Industry Regulation 2009 (Qld)",
    sourceUrl: "https://www.business.qld.gov.au/industries/hospitality-tourism-sport/liquor-gaming/liquor/licensing/licences-permits/types",
    verifiedDate: "May 2026",
  },
  {
    id: "qld-era",
    title: "Environmental Authority — ERA 22 Beverage Production",
    agency: "Department of the Environment, Tourism, Science and Innovation (DETSI)",
    tags: ["ERA", "environmental authority", "wastewater", "DETSI", "beverage production"],
    summary:
      "Queensland wineries producing 1 megalitre (1,000 kL) or more of alcoholic beverages per year require an Environmental Authority (EA) under ERA 22(2) \u2014 Beverage Production. Operating without an EA is an offence under the Environmental Protection Act 1994 (Qld).",
    keyPoints: [
      "ERA 22(2) threshold: \u2265 1 megalitre (1,000 kL) of alcoholic beverages per year",
      "Environmental Authority (EA) required before commencing production at or above threshold",
      "Operating without an EA is an offence under section 426 of the Environmental Protection Act 1994",
      "Annual fee for ERA 22(2): approximately $17,281 (Aggregate Environmental Score = 55, 2025 rate)",
      "Applications lodged via DETSI Online Services; contact PALM (palm@detsi.qld.gov.au)",
      "Winery wastewater (grape marc, wash water, fermentation residues) must comply with EA conditions",
      "Boutique wineries below 1 ML/year must still comply with the general environmental duty",
      "ERA 23 (Bottling or canning \u2265 200 tonnes of food) may also apply to larger operations",
    ],
    source: "Environmental Protection Act 1994 (Qld) / Environmental Protection Regulation 2019 (Qld)",
    sourceUrl: "https://www.detsi.qld.gov.au/",
    verifiedDate: "May 2026",
  },
  {
    id: "qld-worksafe",
    title: "WorkSafe Queensland \u2014 WHS Obligations",
    agency: "WorkSafe Queensland",
    tags: ["WHS", "safety", "CO2", "confined space", "WorkSafe Queensland"],
    summary:
      "WorkSafe Queensland administers the Work Health and Safety Act 2011 (Qld). Queensland wineries have specific obligations around CO\u2082 confined space entry, chemical handling, seasonal harvest worker safety, and plant registration.",
    keyPoints: [
      "Provide and maintain a safe working environment, so far as is reasonably practicable",
      "Confined space entry: written permit system, atmospheric testing, trained standby person required",
      "CO\u2082 monitoring mandatory during active fermentation",
      "SO\u2082 handling: SDS required, PPE mandatory, exposure standard 0.5 ppm TWA",
      "Forklift operators: must hold a High Risk Work Licence (HRWL)",
      "Chemical register: SDS required for all hazardous chemicals on site",
      "Workers\u2019 Compensation insurance (WorkCover Queensland) is mandatory for all employers",
      "Incident reporting: serious injuries and dangerous incidents must be notified to WorkSafe Queensland immediately",
    ],
    source: "Work Health and Safety Act 2011 (Qld)",
    sourceUrl: "https://www.worksafe.qld.gov.au",
    verifiedDate: "May 2026",
  },
  {
    id: "qld-planning",
    title: "Planning & Development Approval",
    agency: "Local Government / Queensland Planning",
    tags: ["planning", "development", "DA", "zoning", "agritourism", "cellar door"],
    summary:
      "Establishing or expanding a winery in Queensland requires a development approval (DA) from the relevant local government under the Planning Act 2016 (Qld). Wineries are typically located in rural zones; cellar doors and tourism facilities may require separate approvals.",
    keyPoints: [
      "Development approval (DA) required for new winery buildings, processing facilities, and cellar doors",
      "Rural zones: winery may be accepted development or may require code or impact assessment",
      "Cellar doors with on-site dining, events, or accommodation may require separate DA",
      "State Planning Policy (Agriculture) supports wineries, rural industry, and agritourism on agricultural land",
      "Agritourism provisions in local planning schemes may facilitate cellar door, farm stay, and farm tour activities",
      "Building permit required for all new structures under the National Construction Code",
      "Pre-application meeting with local council recommended for significant proposals",
    ],
    source: "Planning Act 2016 (Qld) / Planning Regulation 2017 (Qld)",
    sourceUrl: "https://www.planning.qld.gov.au/",
    verifiedDate: "May 2026",
  },
  {
    id: "qld-water",
    title: "Water Licensing \u2014 Dept Regional Development",
    agency: "Department of Regional Development, Manufacturing and Water",
    tags: ["water", "licence", "bore", "extraction", "irrigation"],
    summary:
      "Queensland wineries that take water from a waterway, bore, or other regulated water resource require a water licence under the Water Act 2000 (Qld). Water licences attach to land and may only be used on the land to which they are attached.",
    keyPoints: [
      "Water licence required for taking surface water (watercourse, lake, or spring) for irrigation or commercial use",
      "Water licence required for taking underground water in groundwater areas",
      "Licence states either a maximum annual volume or a maximum irrigable area",
      "Exceeding licensed limits is an offence under the Water Act 2000",
      "Water use is subject to routine property audits",
      "Water licences attach to land and may only be used on the land to which they are attached",
    ],
    source: "Water Act 2000 (Qld)",
    sourceUrl: "https://www.business.qld.gov.au/industries/mining-energy-water/water/authorisations/licences/requirements",
    verifiedDate: "May 2026",
  },
  {
    id: "qld-food",
    title: "Food Safety \u2014 Local Council",
    agency: "Local Council / Queensland Health",
    tags: ["food safety", "food act", "licence", "cellar door"],
    summary:
      "Under the Food Act 2006 (Qld), the sale of alcoholic drinks (including wine) is exempt from the food business licence requirement. However, cellar doors that manufacture food or sell unpackaged food by retail require a food business licence from the local council.",
    keyPoints: [
      "Sale of wine and other alcoholic drinks is exempt from the food business licence requirement",
      "Food business licence required if the cellar door manufactures food (e.g., cheeseboards, prepared meals)",
      "Food business licence required if unpackaged food is sold by retail on the premises",
      "Food Safety Supervisor certificate required for Category 1 and Category 2 food businesses",
      "All food handling must comply with the Australia New Zealand Food Standards Code and Food Act 2006",
      "Registration with local council environmental health department required if licence is needed",
    ],
    source: "Food Act 2006 (Qld)",
    sourceUrl: "https://www.qld.gov.au/health/staying-healthy/food-pantry/starting-a-food-business/food-business-licences/do-i-need-a-food-business-licence",
    verifiedDate: "May 2026",
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function RegCard({
  section,
}: {
  section: (typeof FEDERAL_SECTIONS)[0] & { verifiedDate?: string };
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: "var(--ow-bg-raised)",
        border: "1px solid var(--ow-border)",
        borderRadius: "2px",
        overflow: "hidden",
        transition: "border-color 0.15s ease",
      }}
      onMouseEnter={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor =
          "color-mix(in oklch, var(--ow-amber) 40%, transparent)")
      }
      onMouseLeave={(e) =>
        ((e.currentTarget as HTMLElement).style.borderColor = "var(--ow-border)")
      }
    >
      {/* Card header */}
      <button
        className="w-full text-left p-6"
        onClick={() => setExpanded((v) => !v)}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  color: "var(--ow-amber)",
                  background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                  padding: "0.15rem 0.5rem",
                  borderRadius: "2px",
                }}
              >
                {section.agency}
              </span>
              {section.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.65rem",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--ow-text-lo)",
                    border: "1px solid var(--ow-border)",
                    padding: "0.1rem 0.45rem",
                    borderRadius: "2px",
                  }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <h3
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.0625rem",
                color: "var(--ow-text-hi)",
                lineHeight: 1.25,
                marginBottom: "0.5rem",
              }}
            >
              {section.title}
            </h3>
            <p
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                lineHeight: 1.65,
                color: "var(--ow-text-mid)",
              }}
            >
              {section.summary}
            </p>
          </div>
          <span
            style={{
              color: "var(--ow-amber)",
              fontSize: "1.25rem",
              flexShrink: 0,
              transition: "transform 0.2s ease",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
              display: "block",
              marginTop: "0.25rem",
            }}
          >
            ↓
          </span>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div
          style={{
            borderTop: "1px solid var(--ow-border)",
            padding: "1.5rem 1.5rem 1.5rem 1.5rem",
          }}
        >
          <h4
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1rem",
            }}
          >
            Key Requirements
          </h4>
          <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
            {section.keyPoints.map((pt) => (
              <li
                key={pt}
                className="flex items-start gap-3 mb-3"
                style={{
                  fontFamily: SANS,
                  fontWeight: 300,
                  fontSize: "0.875rem",
                  lineHeight: 1.65,
                  color: "var(--ow-text-mid)",
                }}
              >
                <span
                  style={{
                    color: "var(--ow-amber)",
                    flexShrink: 0,
                    marginTop: "0.35rem",
                    fontSize: "0.5rem",
                  }}
                >
                  ◆
                </span>
                {pt}
              </li>
            ))}
          </ul>
          <div
            className="flex flex-wrap items-center gap-3 mt-4 pt-4"
            style={{ borderTop: "1px solid var(--ow-border)" }}
          >
            <span
              style={{
                fontFamily: MONO,
                fontSize: "0.7rem",
                color: "var(--ow-text-lo)",
              }}
            >
              Source: {section.source}
            </span>
            {section.verifiedDate && (
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  letterSpacing: "0.06em",
                  color: "oklch(0.65 0.10 145)",
                  background: "oklch(0.65 0.10 145 / 12%)",
                  border: "1px solid oklch(0.65 0.10 145 / 30%)",
                  padding: "0.1rem 0.5rem",
                  borderRadius: "2px",
                  whiteSpace: "nowrap",
                }}
              >
                ✓ Verified {section.verifiedDate}
              </span>
            )}
            <a
              href={section.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                fontFamily: SANS,
                fontSize: "0.75rem",
                color: "var(--ow-amber)",
                marginLeft: "auto",
              }}
              onClick={(e) => e.stopPropagation()}
            >
              Official source ↗
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

type ResourceTab = "federal" | "sa" | "vic" | "nsw" | "wa" | "qld";

const TAB_LABELS: Record<ResourceTab, string> = {
  federal: "Federal",
  sa: "South Australia",
  vic: "Victoria",
  nsw: "New South Wales",
  wa: "Western Australia",
  qld: "Queensland",
};

export default function Resources() {
  const [activeTab, setActiveTab] = useState<ResourceTab>("federal");
  const [search, setSearch] = useState("");

  const sections =
    activeTab === "federal" ? FEDERAL_SECTIONS
    : activeTab === "sa" ? SA_SECTIONS
    : activeTab === "vic" ? VIC_SECTIONS
    : activeTab === "nsw" ? NSW_SECTIONS
    : activeTab === "wa" ? WA_SECTIONS
    : QLD_SECTIONS;

  const filtered = search.trim()
    ? sections.filter(
        (s) =>
          s.title.toLowerCase().includes(search.toLowerCase()) ||
          s.summary.toLowerCase().includes(search.toLowerCase()) ||
          s.tags.some((t) => t.toLowerCase().includes(search.toLowerCase())) ||
          s.agency.toLowerCase().includes(search.toLowerCase())
      )
    : sections;

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-50 border-b"
        style={{ background: "var(--ow-bg-base)", borderColor: "var(--ow-border)" }}
      >
        <div className="container flex items-center justify-between py-5">
          <Link href="/">
            <OwnologyLogo size={32} />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/compliance"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "var(--ow-amber)",
                letterSpacing: "0.02em",
              }}
            >
              Ask the Compliance Agent →
            </Link>
            <Link
              href="/"
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "var(--ow-text-lo)",
                letterSpacing: "0.02em",
              }}
            >
              ← Back to Ownology
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="pt-20 pb-16 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-4xl">
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1.25rem",
            }}
          >
            Regulatory Reference Library
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(2rem, 4.5vw, 3rem)",
              lineHeight: 1.1,
              color: "var(--ow-text-hi)",
              letterSpacing: "-0.02em",
              marginBottom: "1.25rem",
            }}
          >
            Australian Winery<br />
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Compliance Resources</em>
          </h1>
          <p
            style={{
              fontFamily: SANS,
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
              maxWidth: "560px",
            }}
          >
            A structured reference covering federal and state regulatory requirements for boutique wine producers across South Australia, Victoria, New South Wales, Western Australia, and Queensland. Use the Compliance Agent to ask specific questions.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-12">
        <div className="container max-w-4xl">
          {/* Tab + Search row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            {/* Tabs */}
            <div className="flex flex-wrap gap-2">
              {(["federal", "sa", "vic", "nsw", "wa", "qld"] as ResourceTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  style={{
                    fontFamily: SANS,
                    fontWeight: activeTab === tab ? 700 : 300,
                    fontSize: "0.8125rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    padding: "0.45rem 1.25rem",
                    borderRadius: "2px",
                    border: activeTab === tab
                      ? "1px solid var(--ow-amber)"
                      : "1px solid var(--ow-border)",
                    background: activeTab === tab
                      ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)"
                      : "transparent",
                    color: activeTab === tab ? "var(--ow-amber)" : "var(--ow-text-lo)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  {TAB_LABELS[tab]}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search regulations…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{
                flex: 1,
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-border)",
                borderRadius: "2px",
                padding: "0.5rem 1rem",
                fontFamily: SANS,
                fontSize: "0.875rem",
                color: "var(--ow-text-hi)",
                outline: "none",
                minWidth: 0,
              }}
              onFocus={(e) =>
                ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--ow-amber)")
              }
              onBlur={(e) =>
                ((e.currentTarget as HTMLInputElement).style.borderColor = "var(--ow-border)")
              }
            />
          </div>

          {/* Cards */}
          {filtered.length === 0 ? (
            <p
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: "var(--ow-text-lo)",
                textAlign: "center",
                padding: "3rem 0",
              }}
            >
              No results for "{search}". Try a different search term.
            </p>
          ) : (
            <div className="flex flex-col gap-4">
              {filtered.map((section) => (
                <RegCard key={section.id} section={section} />
              ))}
            </div>
          )}

          {/* Compliance agent CTA */}
          <div
            className="mt-12 p-8 text-center"
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
              borderRadius: "2px",
            }}
          >
            <p
              style={{
                fontFamily: SERIF,
                fontWeight: 600,
                fontSize: "1.25rem",
                color: "var(--ow-text-hi)",
                marginBottom: "0.75rem",
              }}
            >
              Have a specific compliance question?
            </p>
            <p
              style={{
                fontFamily: SANS,
                fontWeight: 300,
                fontSize: "0.9375rem",
                color: "var(--ow-text-mid)",
                marginBottom: "1.5rem",
                maxWidth: "480px",
                margin: "0 auto 1.5rem",
                lineHeight: 1.7,
              }}
            >
              The Ownology Compliance Agent searches across federal and state regulations to give you
              a grounded, cited answer in seconds.
            </p>
            <Link href="/compliance" className="btn-amber">
              Ask the Compliance Agent
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
