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

SOURCE: Wine Australia Regulations 2018 (F2018L00286), registered 16 March 2018, commenced 1 April 2018. Made under the Wine Australia Act 2013.
OFFICIAL URL: https://www.legislation.gov.au/current/F2018L00286

### Wine Australia Registration (Wine Australia Act 2013)
- Any person producing, exporting, or making wholesale sales of grape wine must register with Wine Australia before commencing commercial activity.
- No minimum production volume — even single-case boutique producers selling wholesale must register.
- Annual grape grower and winemaker levy applies, calculated on volume of grapes crushed or purchased.

### Label Integrity Program (LIP) — Wine Australia Regulations 2018, Part 4 and Part 5
The LIP is the record-keeping and audit framework that underpins all label claims. The specific numeric thresholds are set by the Regulations:

**Vintage (s.27):**
- Wine may be labelled as a single vintage if at least 850 mL/L (85%) of the wine is obtained from grapes harvested in that vintage.
- If wine is made from grapes harvested in more than one vintage and any vintage is referenced on the label, ALL vintages must be listed in descending order of proportion.
- For fortified wine, volume is calculated exclusive of the added grape spirit or brandy.

**Grape Variety (s.25):**
- Variety names used must be recognised by at least one of: International Organisation of Vine and Wine (OIV); International Union for the Protection of New Varieties of Plants (UPOV); or International Plant Genetic Resources Institute (IPGRI/Bioversity International).
- Single variety claim: at least 850 mL/L (85%) of the wine must be from that variety.
- Multi-variety blend: varieties must be listed in descending order of proportion; each named variety must be present in greater proportion than any unnamed variety; in total, at least 850 mL/L (85%) must come from the named varieties.
- Sweetening products and microorganism cultures up to 50 mL/L are excluded from variety proportion calculations.
- For fortified wine, volume is calculated exclusive of the added grape spirit or brandy.

**Geographical Indication — Single Australian GI (s.26(2)):**
- At least 850 mL/L (85%) of the wine must have been obtained from grapes grown in the region or locality in relation to which the GI is registered.

**Geographical Indication — Multiple GIs (Australian + others) (s.26(4)–(5)):**
- When 2 or 3 registered GIs are used (at least one Australian), the total from all named GIs must be at least 950 mL/L (95%).
- At least 50 mL/L must come from each individual GI region.
- GIs must be listed in descending order of proportion.

**Geographical Indication — Australian GI with Foreign Place Name (s.26(6)–(7)):**
- Total from all named GIs and foreign place names must be at least 950 mL/L (95%).
- At least 50 mL/L must come from each country, region or locality.
- Listed in descending order of proportion.

**Maximum number of GIs on a label (s.26(1)):**
- The total number of registered GIs and foreign place names used in the description and presentation of wine must be 3 or fewer.

**Multi-country wine (s.24):**
- If wine is made from grapes grown in more than one country, the label must identify the proportion originating from each country.
- Grape-derived additives up to 20 mL/L are excluded from country-of-origin proportion calculations.

**LIP record-keeping obligations (Wine Australia Act 2013, s.39F):**
- Records must be kept for all label claims (variety, GI, vintage) and retained for 5 years.
- Records include: grape receival records (variety, GI, vintage, weight), tank/barrel movement records, blending records, bottling records.
- The Authority may request copies of LIP records to verify any label claim (s.16(1)(d) of the Regulations).
- Failure to maintain LIP records can result in deregistration and prosecution.

### Export Licensing — Wine Australia Regulations 2018, Part 3

**Export conditions (s.7):**
Export of a grape product consignment is prohibited unless ALL of the following conditions are met:
1. The exporter holds a current Wine Australia export licence (s.9).
2. The grape product is approved for export under s.14 of the Regulations.
3. If conditions apply to the approval, the export complies with those conditions.
4. A current export certificate for the consignment is in force (s.20).
5. If conditions apply to the certificate, the export complies with those conditions.
6. If the Authority has issued a direction on export quantity (s.22), the export complies with that direction.

**Exemptions from export conditions (s.8):**
- Consignments of 100 litres or less (small quantity exemption). Note: 2 or more consignments on the same ship/aircraft to the same port by the same exporter or associated exporters are treated as a single consignment.
- Grape product in a traveller's personal luggage.
- Grape product belonging to an individual moving house, for domestic use.
- Grape product for display at a trade fair or comparable event.
- Grape product exported for a scientific or technical purpose.
- Grape product exported by a diplomatic, consular or similar establishment as part of its duty-free allowance.
- Grape product held on board international transport as victualling supplies.
- Grape product that is a commercial sample for a prospective buyer.

**Export licence (s.9–s.11):**
- Application must be made to Wine Australia in the approved form.
- In deciding whether to grant a licence, Wine Australia must consider: financial standing; Australian place of business; ability to obtain grape products from Australian suppliers; any matter that may adversely affect the export trade; any matter relating to promotion of exports; whether a previous licence held by the applicant or an associate has been suspended or cancelled; and whether the applicant is a fit and proper person.
- Fit and proper person test (s.10): considers prior convictions under the Act, outstanding debts under the Act, unpaid wine export charge, and prior refusals or revocations of approvals or certificates.
- Licence period: initial period must not exceed 3 years; may be extended in further periods of up to 3 years each (s.11).
- Licence may be suspended or cancelled for: material change in licensee circumstances; failure to notify Wine Australia of a change of business address within 14 days; exporting in contravention of the Act or Regulations; or unpaid wine export charge (s.13).

**Approved grape products (s.14):**
- A licensee must apply for each grape product to be approved for export.
- Wine Australia may approve the product if satisfied that: (a) it complies with the Australia New Zealand Food Standards Code (or any non-compliance will not compromise the reputation of Australian grape products); (b) it is sound and merchantable; and (c) its description and presentation is appropriate under the Act, Australian laws, and the laws of the destination country.
- Wine Australia must NOT approve a non-wine/brandy/grape spirit product if its label uses a registered GI other than "Australia" or a registered translation.
- Approval may be subject to conditions, including country-specific restrictions.
- An approval holder may authorise another licensee (in writing to Wine Australia) to export the same product (s.15); that authorised licensee cannot further sub-authorise.
- Wine Australia may request records or samples to verify compliance (s.16); failure to comply triggers mandatory suspension of the approval (s.17).

**Export certificates (s.18–s.21):**
- Application must be lodged at least 5 days before the export date.
- Application must identify: the export date; the destination country; and the consignee.
- Wine Australia must issue or refuse the certificate before the export date.
- Wine Australia must refuse to issue if: it reasonably believes the product cannot lawfully be sold in the destination country; or the licensee fails to comply with an information request under s.19.
- Wine Australia may request information demonstrating compliance with Australian labelling laws (e.g., organic certification) at least 2 days before the export date.
- Export certificates may be revoked if the export no longer meets the conditions under s.20(2).

**Quantity directions (s.22):**
- Wine Australia may direct a licensee on the quantity of grape product that may be exported generally, to a specific country, or to a specific person or agent.

**Review of decisions (s.23):**
The following decisions are reviewable by the Administrative Appeals Tribunal (AAT):
- Refusal to grant an export licence.
- Suspension or cancellation of an export licence.
- Refusal to approve a grape product for export.
- Imposition of conditions on an approval (including variation).
- Approval of a product that does not comply with the Food Standards Code.
- Revocation of a grape product approval.
- Refusal to issue an export certificate.
- Imposition of conditions on an export certificate.
- Revocation of an export certificate.
- A quantity direction under s.22.

### Exemptions from Labelling Offences — Wine Australia Regulations 2018, Part 5

**Small quantities exempt from description/presentation offences (s.28):**
- Up to 100 litres exported in a single consignment, packed in labelled containers ≤5 L with non-reusable closures.
- Up to 30 litres in a traveller's personal luggage.
- Up to 30 litres sent by one individual to another individual.
- Wine belonging to an individual moving house, for domestic use.
- Wine for display at a trade fair (in Australia or an agreement country), packed in containers ≤2 L with non-reusable closures.
- Up to 100 litres imported or exported for a scientific or technical purpose.
- Wine imported/exported by a diplomatic/consular establishment as part of its duty-free allowance.
- Wine held on international transport as victualling supplies.

**Marketing period exemption (s.31):**
- A wholesaler or retailer who lawfully produced wine before a new GI, registered translation, traditional expression, or additional term first applied is exempt from the relevant offence provisions for a transitional marketing period.
- Marketing period: 5 years for fortified wines; 3 years for all other wines.
- A retailer's exemption continues beyond the marketing period until existing stock is exhausted.

**Variety names that are also GIs (s.30):**
- Wine is exempt from GI offence provisions if a term is used solely to describe a grape variety recognised by OIV, UPOV, or IPGRI, and that term happens also to be a registered GI.

**Trade mark exemption (s.32):**
- Wine is exempt from GI offence provisions if the description is misleading only because a registered trade mark that resembles a GI is used, provided the origin of the wine is shown in a way that is not likely to mislead.

### Definitions — Wine Australia Regulations 2018, Part 1 (s.4)
- **Grape product**: includes wine and any product derived in whole or in part from prescribed goods (grapes) to which a Food Standards Code standard applies (s.5).
- **Prescribed geographical indication**: any GI included in the Register in relation to Australia (s.6).
- **Export certificate**: a certificate issued by Wine Australia under s.20.
- **Licensee**: the holder of a current export licence granted under s.9.
- **Approval holder**: the licensee to whom approval of a grape product for export was given under s.14.
- **Foreign place name**: a word or expression that is not a registered GI but identifies a country, region or locality (other than Australia) in which the wine originated (s.26(9)).

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
### Work Health and Safety (Occupational Health and Safety Act 2004 VIC)
Administered by WorkSafe Victoria.
- VIC uses the Occupational Health and Safety Act 2004 (OHS Act) rather than the Model WHS Act; obligations are substantively equivalent.
- Employers must provide and maintain a safe working environment, safe systems of work, and adequate information, instruction, training and supervision.
- Key winery-specific obligations: confined space management (fermentation tanks, underground cellars), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to WorkSafe Victoria immediately.
- Improvement and prohibition notices may be issued by WorkSafe inspectors.

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
### Work Health and Safety (Work Health and Safety Act 2011 NSW)
Administered by SafeWork NSW.
- NSW adopted the Model WHS Act — PCBU duty to eliminate or minimise risks so far as reasonably practicable.
- Key winery-specific obligations: confined space management (fermentation tanks), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, tartaric acid, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to SafeWork NSW immediately.
- Improvement and prohibition notices may be issued by SafeWork NSW inspectors.

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
- Margaret River and Swan Valley regions have specific local planning policies for wineries.
- Cellar doors in rural zones may require a change of use approval.
### Work Health and Safety (Work Health and Safety Act 2020 WA)
Administered by WorkSafe WA.
- WA adopted the Model WHS Act in 2020 (later than other states) — PCBU duty to eliminate or minimise risks so far as reasonably practicable.
- Key winery-specific obligations: confined space management (fermentation tanks), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to WorkSafe WA immediately.
- Improvement and prohibition notices may be issued by WorkSafe WA inspectors.

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
- Granite Belt and Scenic Rim regions have specific planning overlays for wineries.
- Cellar doors may require a material change of use approval.
### Work Health and Safety (Work Health and Safety Act 2011 QLD)
Administered by Workplace Health and Safety Queensland (WHSQ).
- QLD adopted the Model WHS Act — PCBU duty to eliminate or minimise risks so far as reasonably practicable.
- Key winery-specific obligations: confined space management (fermentation tanks), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to WHSQ immediately.
- Improvement and prohibition notices may be issued by WHSQ inspectors.

---

## TASMANIA (TAS) REGULATIONS

### Liquor Licensing (Liquor Licensing Act 1990 TAS)
Administered by the Tasmanian Liquor and Gaming Commission (Treasury and Finance Tasmania). Note: as of 2025–26, liquor licensing in Tasmania has been restructured — the Commission is the regulatory body; CBOS no longer administers liquor licences.

Relevant licence types:
- Winery Licence: allows production, wholesale, and cellar door sales and tastings.
- On-licence: required for cellar door with on-premises consumption.

Application requirements:
- Application via the Tasmanian Liquor and Gaming Commission (treasury.tas.gov.au/liquor-and-gaming)
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

### Planning (Land Use Planning and Approvals Act 1993 TAS / Tasmanian Planning Scheme)
- Winery and cellar door development requires a planning permit from the local council.
- Significant expansions require a planning permit application.
- The Tasmanian Planning Scheme (TPS) applies from 2022 — rural resource zone typically permits wineries as permitted or discretionary use.
- Derwent Valley, Huon Valley, and Coal River Valley regions have specific planning considerations.
### Work Health and Safety (Work Health and Safety Act 2012 TAS)
Administered by WorkSafe Tasmania.
- TAS adopted the Model WHS Act — PCBU duty to eliminate or minimise risks so far as reasonably practicable.
- Key winery-specific obligations: confined space management (fermentation tanks), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be reported to WorkSafe Tasmania immediately.
- Improvement and prohibition notices may be issued by WorkSafe Tasmania inspectors.

---

## NEW ZEALAND REGULATIONS

### Winemaking Registration (Wine Act 2003 NZ)
Administered by the Ministry for Primary Industries (MPI).
- All winemakers making wine for trade or retail sale must register a Wine Standards Management Plan (WSMP) with MPI before commencing production.
- The WSMP must be annually audited (verified) by an MPI-approved verifier.
- No winemaking licence is required — the WSMP is the primary compliance mechanism.
- Exemption: winemakers producing fewer than 20,000 litres over a two-year period AND not exporting may apply to MPI for an exemption.
- The WSMP comprises: WSMP outline, NZ Winegrowers Code of Practice, HACCP plan, winery site plan, and records.
- Contract winemakers must ensure WSMP records are maintained by contractors.
- Non-compliance must be reported to MPI within 24 hours of discovery.

### Cellar Door and Retail Sales (Sale and Supply of Alcohol Act 2012 NZ)
Administered by local councils (District Licensing Committees) and the Alcohol Regulatory and Licensing Authority (ARLA).
- On-Licence: required for cellar door tastings and on-site consumption.
- Off-Licence: required for retail sales to take away.
- Applications are made to the local District Licensing Committee.
- Licence holders must comply with host responsibility obligations, display licences, and maintain records.
- Remote sale licences are available for direct-to-consumer online sales.

### Labelling (Food (Safety) Regulations 2002 NZ and FSANZ Food Standards Code)
- Wine labels must comply with both the NZ Food (Safety) Regulations 2002 and the FSANZ Food Standards Code.
- Variety claims: wine must contain at least 75% of the stated grape variety.
- Vintage claims: wine must contain at least 75% from the stated vintage year.
- Geographical Indication (GI) claims: wine must contain at least 85% from the stated region.
- Pregnancy warning label: mandatory from 31 July 2023 (same as Australia).
- Allergen declarations: sulphites must be declared if present above 10mg/kg.

### Geographical Indications (Geographical Indications (Wine and Spirits) Registration Act 2006 NZ)
Administered by IPONZ (Intellectual Property Office of New Zealand).
- 18 NZ wine regions are registered as Geographical Indications including Marlborough, Hawke's Bay, Central Otago, Wairarapa, Nelson, Gisborne, and others.
- Use of a registered GI on a wine label requires the wine to contain at least 85% from that region.

### Export Requirements (Wine Act 2003 NZ and MPI Trade Certification)
Administered by MPI.
- All wine for export must comply with the Wine Act 2003 and have current export eligibility.
- Exporters must register with MPI and use the MPI Trade Certification system (formerly Wine e-Cert).
- All wine in a direct-to-consumer (DTC) consignment must be registered in MPI Trade Certification prior to export.
- Destination market requirements vary — check MPI's market access database for specific country requirements.
- Export documentation: Certificate of Analysis, Certificate of Origin, and phytosanitary certificate may be required depending on destination.

### Food Safety (Food Act 2014 NZ)
Administered by MPI.
- Applies to certain winemaking extension activities and partial processing (e.g., adding flavours, producing wine-based beverages).
- Requires a food control plan for activities that extend beyond standard winemaking under the Wine Act 2003.
- Wineries that also produce food products (e.g., wine vinegar, wine-based sauces) must register under the Food Act 2014.

### Work Health and Safety (Health and Safety at Work Act 2015 NZ)
Administered by WorkSafe New Zealand.
- PCBU (Person Conducting a Business or Undertaking) duty to eliminate or minimise risks so far as reasonably practicable.
- Key winery-specific obligations: confined space management (fermentation tanks), CO2 monitoring during fermentation, manual handling (barrels, cases), chemical handling (SO2, cleaning chemicals), working at heights.
- Incident reporting: serious injuries, dangerous incidents, and deaths must be notified to WorkSafe NZ immediately.
- Hazardous substances (SO2, pesticides, cleaning chemicals) must be managed under the Hazardous Substances and New Organisms Act 1996 (HSNO Act) administered by WorkSafe NZ and EPA NZ.

### Environmental and Planning (Resource Management Act 1991 NZ)
Administered by regional councils and district councils.
- Winery wastewater discharge to land or water requires a discharge permit from the relevant regional council.
- New national wastewater discharge standards took effect from December 2025.
- Land use consent is required for new winery buildings or significant expansions in rural zones.
- Water extraction (irrigation) requires a water permit from the regional council.
- Regional plans set specific rules for discharge volumes, treatment standards, and setback distances from waterways.
- Key regions: Marlborough District Council (MDC), Hawke's Bay Regional Council (HBRC), Otago Regional Council (ORC), Environment Canterbury (ECan).

### Biosecurity (Biosecurity Act 1993 NZ)
Administered by MPI Biosecurity New Zealand.
- Phylloxera management plans are required in affected regions (Marlborough, Hawke's Bay, Central Otago).
- Movement of plant material (cuttings, rootstocks) between regions is regulated.
- Biosecurity levy applies to grape growers.
- Freshwater Farm Plans are being introduced for properties with significant water use or discharge.

---

## ISO & QUALITY MANAGEMENT STANDARDS

### Overview
ISO 9000 defines the concepts underpinning Quality Management Systems (QMS). Wineries specifically seek **ISO 9001:2015** certification to standardise every stage of production — from grape harvesting and fermentation through to bottling and dispatch — ensuring consistent taste, safety, and regulatory compliance across all production batches.

### Why Wineries Use ISO 9001
- **Batch Consistency:** Standardises fermentation, aging, and bottling procedures so wine quality remains uniform year to year.
- **Global Market Access:** Proves adherence to strict international standards, easing export processes and satisfying major retail and wholesale buyers (EU, UK, USA supermarket chains increasingly require ISO 9001 or equivalent as a supply condition).
- **Waste Reduction:** Streamlines cellar and vineyard operations to reduce operational costs and spoilage.
- **Customer Confidence:** Demonstrates a verifiable commitment to quality — critical for retail consumers and hospitality/tourism.
- **Label Integrity Program alignment:** Wine Australia's LIP audit trail requirements (traceability from grape to bottle) align directly with ISO 9001 Clause 8.5.2 (Identification and Traceability).

### ISO 9001:2015 — Quality Management Systems
- **Standard:** ISO 9001:2015 (Quality Management Systems — Requirements)
- **Administering body (AU):** Standards Australia / SAI Global
- **Certification bodies (AU):** SAI Global, Bureau Veritas, SGS, DNV, LRQA
- **Key clauses relevant to wineries:**
  - Clause 7.1.5: Monitoring and measuring resources (lab equipment calibration)
  - Clause 8.5.2: Identification and traceability (batch/lot traceability from grape to bottle)
  - Clause 8.6: Release of products and services (pre-release quality checks)
  - Clause 8.7: Control of nonconforming outputs (off-spec wine management)
  - Clause 9.1: Monitoring, measurement, analysis and evaluation (sensory panels, analytical testing)
- **Relationship to NZ Wine WSMP:** The Wine Standards Management Plan required under the Wine Act 2003 (NZ) is structurally equivalent to an ISO 9001 QMS; some NZ certifiers accept a validated WSMP as partial evidence toward ISO 9001 certification.
- **Official URL:** https://www.iso.org/iso-9001-quality-management.html
- **Standards Australia:** https://www.standards.org.au

### ISO 22000:2018 — Food Safety Management Systems
- **Standard:** ISO 22000:2018 (Food Safety Management Systems — Requirements for any organisation in the food chain)
- **Relevance:** Directly applicable to winery food safety obligations under FSANZ Standard 3.2.1. Integrates HACCP principles (Hazard Analysis Critical Control Points) into a full management system framework.
- **Key winery hazards addressed:** SO2 allergen declaration, histamine/biogenic amines, pesticide residues, glass/cork contamination, microbiological hazards (Brettanomyces, acetic acid bacteria).
- **Relationship to FSANZ:** ISO 22000 certification is accepted as an alternative compliance pathway to a standalone HACCP plan under FSANZ Standard 3.2.1 (Food Safety Programs).
- **HACCP Critical Control Points for wineries:** Grape receival (pesticide/foreign matter), SO2 addition (allergen control), filtration (microbiological control), bottling line (fill level, closure integrity), labelling (allergen declaration accuracy).
- **Official URL:** https://www.iso.org/iso-22000-food-safety-management.html

### ISO 14001:2015 — Environmental Management Systems
- **Standard:** ISO 14001:2015 (Environmental Management Systems — Requirements with guidance for use)
- **Relevance:** Formalises sustainable viticulture, water usage, wastewater management, chemical storage, and waste management obligations that are also regulated under state environmental protection legislation.
- **Australian winery adoption:** Taylors Wines (Clare Valley) has held ISO 14001 certification since 2009; Wakefield Wines also certified. Wine Australia funded a McLaren Vale consortium ISO 14001 scoping study.
- **Relationship to AWISSP:** The Australian Wine Industry Standard of Sustainable Practice (AWISSP / Entwine Australia) incorporates ISO 14001 principles and is accepted as a complementary framework. Many wineries use AWISSP as a stepping stone to full ISO 14001 certification.
- **Key aspects for wineries:** Environmental aspects register (water, energy, waste, emissions), legal register (state EPA licence conditions), emergency response plans (chemical spills), supplier environmental requirements.
- **Official URL:** https://www.iso.org/iso-14001-environmental-management.html
- **Entwine Australia (AWISSP):** https://entwine.com.au

### ISO 45001:2018 — Occupational Health and Safety Management Systems
- **Standard:** ISO 45001:2018 (Occupational Health and Safety Management Systems — Requirements with guidance for use); adopted in Australia as AS/NZS 45001:2018.
- **Relevance:** Directly maps to WHS Act obligations across all Australian states and territories. Replaces the former AS/NZS 4801 standard.
- **Key winery hazards:** Confined space entry (fermentation tanks, storage vessels — CO2 asphyxiation risk), manual handling (barrel handling, bin tipping), chemical handling (SO2, caustic cleaning agents, pesticides), noise (bottling lines, pumps), working at heights (tank access platforms), seasonal worker management.
- **Certification bodies (AU):** SAI Global, Bureau Veritas, SGS, DNV, Safety Solutions WA
- **Relationship to WHS legislation:** ISO 45001 certification does not replace WHS Act compliance obligations but provides a documented management system that demonstrates due diligence to regulators (SafeWork SA, WorkSafe VIC, WorkSafe WA, etc.).
- **Official URL:** https://www.iso.org/iso-45001-occupational-health-and-safety.html

### AWISSP — Australian Wine Industry Standard of Sustainable Practice
- **Program:** Entwine Australia — the Australian Wine Industry Standard of Sustainable Practice (AWISSP)
- **Administering body:** Australian Grape and Wine (AGW) and Wine Australia
- **Relevance:** Industry-specific sustainability certification that integrates environmental, social, and quality management. Recognised by major export markets (EU, UK) as a credible sustainability credential alongside ISO 14001.
- **Key modules:** Vineyard sustainability, winery sustainability, chemical use, water management, energy, waste, biodiversity, social responsibility.
- **Relationship to ISO standards:** AWISSP is designed to complement ISO 14001 (environmental) and can be used as evidence toward ISO 14001 certification. It does not replace ISO 9001 or ISO 22000.
- **Official URL:** https://entwine.com.au
- **Wine Australia guidance:** https://www.wineaustralia.com/growing-making/sustainability

### Sustainable Winegrowing New Zealand (SWNZ)
- **Program:** Sustainable Winegrowing New Zealand (SWNZ) — administered by New Zealand Winegrowers
- **Relevance:** NZ equivalent of AWISSP. Membership is effectively mandatory for NZ wine export — the SWNZ logo appears on approximately 95% of NZ wine exported. Required by major UK and EU retail buyers.
- **Relationship to ISO 14001:** SWNZ has been evaluated against ISO 14001 and is accepted as equivalent by many international buyers.
- **Official URL:** https://www.nzwine.com/en/sustainability/sustainable-winegrowing-nz/

### Certification Pathway Summary
| Standard | Mandatory? | Export Benefit | Typical Cost (AU) | Timeframe |
|---|---|---|---|---|
| ISO 9001:2015 | No | High — EU/UK retail | $3,000–$8,000/yr | 6–18 months |
| ISO 22000:2018 | No (HACCP is) | High — food safety credibility | $4,000–$10,000/yr | 6–18 months |
| ISO 14001:2015 | No | Medium — sustainability claims | $3,000–$8,000/yr | 6–12 months |
| ISO 45001:2018 | No | Low (WHS compliance) | $3,000–$7,000/yr | 6–12 months |
| AWISSP/Entwine | No | High — AU/NZ export markets | ~$500–$2,000/yr | 3–6 months |
| SWNZ | Effectively yes (NZ) | Very High — NZ export | NZD ~$500/yr | 3–6 months |

---

## OPERATIONAL COMPLIANCE

### Overview
Operational compliance in a winery encompasses the day-to-day safety, sanitation, maintenance, and asset management obligations that sit alongside regulatory licensing and labelling requirements. These obligations arise primarily from the Work Health and Safety Act 2011 (Model WHS Act, adopted in NSW, SA, QLD, TAS, ACT, NT) and the Work Health and Safety Regulation 2011 (WHS Regulation), as well as FSANZ Standard 3.2.2 (Food Safety Practices and General Requirements), and relevant Australian Standards. In Victoria, equivalent obligations arise under the Occupational Health and Safety Act 2004 (VIC) and OHS Regulations 2017. In Western Australia, the Work Health and Safety Act 2020 (WA) applies. In New Zealand, the Health and Safety at Work Act 2015 (NZ) and Health and Safety at Work (General Risk and Workplace Management) Regulations 2016 apply.

The primary regulator for operational WHS in NSW is SafeWork NSW (safework.nsw.gov.au | 13 10 50). SafeWork NSW publishes the "Guide to Managing Risks in Wineries" which provides detailed, winery-specific guidance on all operational compliance topics below.

---

### Cleaning and Sanitation Compliance

#### Regulatory Basis
- FSANZ Standard 3.2.2 (Food Safety Practices and General Requirements): Requires food businesses (including wineries that process food/beverage for sale) to maintain food premises and equipment in a clean and sanitary condition. Clause 19 requires food contact surfaces to be cleaned and sanitised. Clause 20 requires single-use items to be used once only.
- WHS Regulation 2011 (NSW) Part 7.1 (Hazardous Chemicals): Governs the use of cleaning chemicals including caustic soda (NaOH), peracetic acid (PAA), citric acid, sodium hypochlorite, and SO2 solutions used in CIP (Clean-in-Place) systems.
- Safe Work Australia Code of Practice: Labelling of Workplace Hazardous Chemicals (2012): Requires all cleaning chemicals to be labelled in accordance with the Globally Harmonised System (GHS) of Classification and Labelling of Chemicals.

#### CIP (Clean-in-Place) Protocols
A CIP system circulates cleaning solutions through tanks, pipework, heat exchangers, and bottling lines without disassembly. Standard CIP sequence for winery tanks:
1. Pre-rinse with water (remove gross soils, marc residues, tartrate deposits)
2. Caustic wash (1-2% NaOH at 60-80 degrees C for 15-30 min) - removes organic soils, proteins, polysaccharides
3. Intermediate rinse with water
4. Acid wash (0.5-1% citric or nitric acid) - removes mineral deposits, tartrate scale
5. Final rinse with potable water
6. Sanitise with peracetic acid (PAA, 100-200 ppm) or SO2 solution (50-100 ppm) before use

For oak barrels: hot water rinse (80 degrees C), SO2 fumigation (5g sulphur wicks), or ozone treatment. Barrels must be stored bung-down or with SO2 solution to prevent microbial growth.

#### Confined Space Cleaning (Tanks, Presses, Vats)
Cleaning of wine tanks, presses, and open vats that constitute confined spaces must comply with WHS Regulation 2011 Part 4.1 (Confined Spaces). Key requirements:
- A confined space entry permit must be issued before any worker enters a tank for cleaning (WHS Reg s.66).
- Atmospheric testing must be conducted before entry: oxygen (19.5-23.5% acceptable range), CO2 (<0.5% or 5,000 ppm), flammable gases (<5% LEL).
- A standby person must be present outside the confined space at all times during cleaning.
- Workers must be provided with appropriate PPE: chemical-resistant gloves, eye protection, chemical-resistant apron, respiratory protection if chemical vapours are present.
- Cleaning should be conducted from outside the confined space where possible (e.g., using fixed or temporary spray balls - WHS Reg s.65).
- Emergency and rescue procedures must be in place before entry commences.

#### Chemical Register and SDS Requirements
Under WHS Regulation 2011 (NSW) Part 7.1:
- A hazardous chemicals register must be maintained at the winery listing all hazardous chemicals used, stored, or handled (WHS Reg s.346).
- Safety Data Sheets (SDS) must be obtained from the manufacturer/supplier for every hazardous chemical and kept accessible to workers (WHS Reg s.340).
- SDS must be in the 16-section Australian/GHS format.
- SDS must be reviewed and updated at least every 5 years.
- Chemicals must be stored in accordance with their SDS requirements (segregation, ventilation, containment).
- Labels must comply with the GHS third revised edition (mandatory from 1 January 2017).

#### Placard and Manifest Quantities
If hazardous chemicals are stored in quantities exceeding Schedule 11 of the WHS Regulation, placards and/or a manifest must be displayed. Common winery chemicals and their placard quantities:
- Caustic soda (NaOH, Class 8 PG II): placard at 250 kg
- Sodium hypochlorite solution (Class 8 PG III): placard at 1,000 L
- Calcium hypochlorite (Class 5.1 PG II): placard at 250 kg (manifest at 300 kg)
- Hydrochloric acid (Class 8 PG II): placard at 250 L
- Peracetic acid (Class 8 PG II): placard at 250 L
- Ethanol/wine spirit (Class 3 PG II flammable liquid): placard at 250 L

If placard quantities are exceeded, SafeWork NSW must be notified (WHS Reg s.349).

#### Bottling Line Hygiene
FSANZ Standard 3.2.2 Clause 19 requires that food contact surfaces (including bottling line fillers, hoses, tanks) are:
- Cleaned and sanitised as often as necessary to prevent contamination.
- Cleaned before use after any period of disuse.
- Constructed of materials that can be effectively cleaned (smooth, non-porous, non-toxic).

Bottling line CIP should be validated periodically (e.g., ATP bioluminescence testing, microbiological swabs) to confirm cleaning efficacy.

---

### Confined Spaces - Wine Tank Entry

#### Regulatory Basis
- WHS Regulation 2011 (NSW) Part 4.1 (Confined Spaces), ss.60-79
- Safe Work Australia Code of Practice: Confined Spaces (2013)
- SafeWork NSW Guide to Managing Risks in Wineries (2014)

#### Definition
A confined space is an enclosed or partially enclosed space that: (a) is not designed or intended primarily as a place of work; (b) is at atmospheric pressure while persons are in it; and (c) has a restricted means of entry or exit; and (d) has or is likely to have one or more of: (i) an atmosphere with potentially harmful levels of contaminant; (ii) an unsafe oxygen level; (iii) stored substances that could engulf a person (WHS Reg s.60).

In wineries, confined spaces include: stainless steel fermentation tanks, storage tanks, oak vats, presses, underground cellars, sumps, and pit areas.

#### CO2 and Asphyxiant Risks
CO2 is produced in large quantities during fermentation (up to 46 g CO2 per 100 g sugar fermented). CO2 is heavier than air (density 1.52 kg/m3 vs air 1.20 kg/m3) and accumulates at low points - including inside tanks, in barrel halls, and in underground cellars.
- CO2 at 1-2%: Headaches, shortness of breath
- CO2 at 3-4%: Dizziness, rapid breathing, impaired judgment
- CO2 at >5%: Unconsciousness within minutes
- CO2 at >10%: Death within minutes

Oxygen depletion also occurs in tanks where CO2 has displaced air. Normal atmospheric oxygen is 20.9%; below 19.5% is oxygen-deficient; below 16% causes impaired judgment; below 6% causes death.

#### Confined Space Entry Permit System
A confined space entry permit must be issued before any worker enters a confined space (WHS Reg s.66). The permit must specify:
- The confined space to which it relates
- The work to be carried out
- The hazards identified and control measures to be implemented
- The atmospheric testing results (oxygen, CO2, flammable gases)
- The names of all persons authorised to enter
- The standby person's name
- The duration of the permit
- Emergency and rescue procedures

The permit must be kept until work is completed and then retained for at least 2 years (WHS Reg s.67).

#### Atmospheric Testing Requirements
Before entry, and continuously during work in a confined space (WHS Reg s.70):
- Oxygen: must be between 19.5% and 23.5%
- CO2: must be below 0.5% (5,000 ppm)
- Flammable gases/vapours: must be below 5% of the Lower Explosive Limit (LEL)
- Toxic gases: must be below the relevant Workplace Exposure Standard (WES)

Testing must be conducted by a competent person using a calibrated multi-gas detector. Records of atmospheric tests must be kept.

#### Energy Isolation for Tank Entry
Before entry into any tank or confined space:
- All energy sources (electrical, pneumatic, hydraulic) must be isolated and locked out (WHS Reg ss.208-215).
- Valves on all inlet and outlet pipework must be closed, locked, and tagged (blank flanges/spades inserted where practicable).
- Refrigeration systems connected to the tank must be isolated.
- Pump agitators and any internal moving parts must be isolated.

#### Standby Person Requirements
A standby person must be stationed outside the confined space at all times during entry (WHS Reg s.71). The standby person must:
- Maintain continuous communication with workers inside
- Monitor atmospheric conditions
- Be trained in emergency and rescue procedures
- NOT enter the confined space to perform a rescue unless equipped with appropriate air-supplied respiratory protection

#### Training Requirements
All workers who enter, work in, or work near confined spaces must be trained in (WHS Reg s.79):
- The nature of hazards associated with confined spaces
- The confined space entry permit system
- Emergency and rescue procedures
- Use of atmospheric testing equipment
- Use of PPE including respiratory protection

Refresher training should be conducted annually or before each vintage season.

---

### Equipment Maintenance - Isolation and Lock-out/Tag-out

#### Regulatory Basis
- WHS Regulation 2011 (NSW) Part 5.1 (Management of Risks of Plant), ss.208-215
- Safe Work Australia Code of Practice: Managing the Risks of Plant in the Workplace (2013)
- SafeWork NSW Guide to Managing Risks in Wineries (2014), Section 13

#### Lock-out/Tag-out (LOTO) Procedure
Before any maintenance, cleaning, or non-production work on plant and equipment, a formal isolation procedure must be followed (WHS Reg s.208):

1. Shut down plant: Notify the plant operator. Shut down all energy sources in the correct sequence (electrical, pneumatic, hydraulic).
2. Isolate energy sources: Isolate all energy sources at the main isolation point. For electrical equipment, isolate at the circuit breaker or main switch. For pneumatic/hydraulic systems, close and lock valves.
3. De-energise stored energy: Release or restrain all stored energy (capacitors, springs, hydraulic accumulators, gravity-loaded components). Allow rotating parts to come to a complete stop.
4. Lock out isolation points - personal danger locks: Each person performing maintenance must attach their own personal danger lock to every isolation point. One lock per person per isolation point. Locks must remain on until work is complete.
5. Lock out - out of service locks: For work spanning multiple shifts or days, an out-of-service lock (yellow/black) is applied by a supervisor in addition to personal danger locks.
6. Tag out: Attach personal danger tags (red/white) to all isolation points after locking out. Tags identify who is working on the plant and must not be removed by anyone other than the person who attached them.
7. Confirm isolation: Test that the plant cannot be energised (attempt to start, check for residual pressure/voltage). Confirm all stored energy has been dissipated.

#### Plant Register Requirements
Under WHS Regulation 2011 (NSW) Part 5.1, a register of plant must be maintained for all registered plant (WHS Reg s.246). Registered plant in wineries typically includes:
- Pressure vessels (tanks with design pressure >50 kPa or capacity >500 L)
- Boilers
- Forklifts and other powered mobile plant
- Cranes and hoists
- Certain pumps and compressors

The plant register must record: plant item description, serial/identification number, design registration number, date of last inspection, next inspection due date, and any defects identified.

Registered plant must be inspected by a competent person at intervals specified by the designer or manufacturer, or at least every 2 years for pressure vessels.

#### Maintenance Records
Maintenance records must be kept for all plant and equipment (WHS Reg s.247). Records must include:
- Description of maintenance work performed
- Date of maintenance
- Name of person who performed maintenance
- Any defects identified and corrective actions taken
- Next scheduled maintenance date

For registered plant, records must be kept for the life of the plant.

#### Electrical Equipment Inspection and Testing
Under WHS Regulation 2011 (NSW) Part 4.7 (Electrical Risks), electrical equipment used in a hostile operating environment (including winery environments with moisture, heat, vibration, and corrosive chemicals) must be regularly inspected and tested by a competent person (WHS Reg s.150).

The applicable standard is AS/NZS 3760:2022 - In-service Safety Inspection and Testing of Electrical Equipment. Inspection and testing intervals for winery environments:
- Portable electrical equipment (leads, power tools): every 6 months in hostile environments
- Fixed electrical equipment: every 12 months
- RCDs (residual current devices): push-button test monthly; full test every 12 months

Records of electrical equipment testing must be kept until the equipment is next tested or permanently removed from service (WHS Reg s.152). Records must specify: tester's name, date of test, outcome, and next test due date. Records may be in the form of a tag attached to the equipment.

#### Residual Current Devices (RCDs)
RCDs (safety switches) must be used for all plug-in electrical equipment used in winery environments (WHS Reg s.154). This includes pumps, motors, lighting, power tools, and any equipment connected via socket outlets in areas exposed to moisture, heat, vibration, or corrosive chemicals.

Type II RCDs (tripping current <=30 mA, tripping time <=300 ms) are required for personal protection. RCDs must be tested regularly by a competent person (WHS Reg s.155). Records of RCD testing must be kept.

Classification per AS/NZS 3190:2011: Type I (<=10 mA, <=30 ms) for direct patient contact; Type II (<=30 mA, <=300 ms) for general workplace use.

---

### Asset Management - Winery Registers and Calibration

#### Tank Register
A tank register is a core operational compliance document. It should record for each tank:
- Tank identification number/name
- Capacity (litres)
- Material of construction (stainless steel grade, oak species)
- Pressure vessel registration number (if applicable)
- Last cleaning date and method
- Last inspection date and outcome
- Current contents (wine variety, vintage, volume)
- Temperature control status
- Confined space classification (yes/no)
- Last confined space entry permit number (if applicable)

The tank register supports compliance with: WHS Reg s.246 (plant register), FSANZ Standard 3.2.2 (cleaning records), and ISO 9001:2015 Clause 7.1.3 (infrastructure maintenance).

#### Barrel Inventory
Barrel inventory management supports compliance with:
- Wine Australia Label Integrity Program (LIP): vintage, variety, and geographical indication (GI) claims require traceability to individual barrels.
- FSANZ Standard 3.2.2: cleaning and sanitation records for food contact surfaces (barrel interiors).
- ISO 9001:2015 Clause 8.5.2: identification and traceability.

Barrel records should include: barrel number, cooperage, oak species, toast level, fill date, wine variety/vintage, number of fills, last SO2 treatment date, and current location.

#### Calibration Records
Under ISO 9001:2015 Clause 7.1.5 (Monitoring and Measuring Resources) and ISO 22000:2018 Clause 8.7 (Control of Monitoring and Measuring), measuring equipment used for critical process control must be calibrated at defined intervals.

Winery measuring equipment requiring calibration records:
- Refractometers (Brix measurement): calibrate with distilled water (0.0 Brix) before each use; annual calibration against NATA-accredited standard
- pH meters: two-point calibration with pH 4.0 and 7.0 buffer solutions before each use; electrode replacement every 12 months
- Free SO2 titration equipment (Ripper or aeration-oxidation method): verify with known SO2 standard solution; annual calibration
- Scales/balances (additions, dosing): calibrate with certified weights; annual calibration by NATA-accredited laboratory
- Thermometers (fermentation, storage): verify against reference thermometer; annual calibration
- Dissolved oxygen meters: calibrate per manufacturer instructions before each use
- Turbidity meters (NTU): calibrate with formazin standards; annual calibration

Calibration records must include: equipment ID, calibration date, calibration method, reference standard used, result (pass/fail), and next calibration due date. Records must be retained for at least 3 years (ISO 9001 Clause 7.5).

#### WHS Incident Register
Under WHS Act 2011 (NSW) s.38, the following must be notified to SafeWork NSW immediately:
- Death of a person
- Serious injury or illness (hospitalisation, amputation, loss of sight, serious head/spinal injury, serious burns, loss of bodily function)
- Dangerous incident (near miss with potential for serious injury, e.g., uncontrolled escape of gas/chemical, implosion/explosion, collapse of structure)

Records of all notifiable incidents must be kept for at least 5 years (WHS Act s.38(6)).

All other workplace injuries, near misses, and hazard reports should be recorded in a WHS incident register as part of a systematic approach to continuous improvement (ISO 45001:2018 Clause 9.1.1).

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
- Tasmanian Liquor and Gaming Commission: treasury.tas.gov.au/liquor-and-gaming | (03) 6166 4040
- EPA Tasmania (Environment): epa.tas.gov.au | 1800 005 171
- WorkSafe Tasmania (WHS): worksafe.tas.gov.au | 1300 366 322

### New Zealand
- MPI (Wine Act, WSMP, Export): mpi.govt.nz | 0800 00 83 33
- ARLA (Alcohol Licensing): justice.govt.nz/tribunals/arla
- NZ Winegrowers (Industry Body): nzwine.com | 09 303 3527
- WorkSafe NZ (WHS): worksafe.govt.nz | 0800 030 040
- IPONZ (Geographical Indications): iponz.govt.nz
- EPA NZ (Hazardous Substances): epa.govt.nz | 0800 376 234
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
      "## NEW ZEALAND REGULATIONS"
    )[0] ?? ""),
  NZ:
    "## NEW ZEALAND REGULATIONS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## NEW ZEALAND REGULATIONS")[1]?.split(
      "## ISO & QUALITY MANAGEMENT STANDARDS"
    )[0] ?? ""),
  ISO:
    "## ISO & QUALITY MANAGEMENT STANDARDS" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## ISO & QUALITY MANAGEMENT STANDARDS")[1]?.split(
      "## OPERATIONAL COMPLIANCE"
    )[0] ?? ""),
  Operational:
    "## OPERATIONAL COMPLIANCE" +
    (COMPLIANCE_KNOWLEDGE_BASE.split("## OPERATIONAL COMPLIANCE")[1]?.split(
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
    administeringAgency: "Tasmanian Liquor and Gaming Commission (Treasury and Finance Tasmania)",
    officialUrl: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-1990-062",
    monitorUrl: "https://www.treasury.tas.gov.au/liquor-and-gaming",
    monitorChannel: "Treasury TAS liquor-and-gaming page; legislation.tas.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Work Health and Safety Act 2012 (TAS)",
    jurisdiction: "TAS",
    category: "legislation",
    administeringAgency: "WorkSafe Tasmania",
    officialUrl: "https://www.legislation.tas.gov.au/view/html/inforce/current/act-2012-001",
    monitorUrl: "https://worksafe.tas.gov.au/",
    monitorChannel: "WorkSafe Tasmania website; legislation.tas.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── VICTORIA (additional) ─────────────────────────────────────────────────────
  {
    title: "Occupational Health and Safety Act 2004 (VIC)",
    jurisdiction: "VIC",
    category: "legislation",
    administeringAgency: "WorkSafe Victoria",
    officialUrl: "https://www.legislation.vic.gov.au/in-force/acts/occupational-health-and-safety-act-2004",
    monitorUrl: "https://www.worksafe.vic.gov.au/",
    monitorChannel: "WorkSafe Victoria website; legislation.vic.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── NEW SOUTH WALES (additional) ──────────────────────────────────────────────
  {
    title: "Work Health and Safety Act 2011 (NSW)",
    jurisdiction: "NSW",
    category: "legislation",
    administeringAgency: "SafeWork NSW",
    officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/act-2011-010",
    monitorUrl: "https://www.safework.nsw.gov.au/",
    monitorChannel: "SafeWork NSW website; legislation.nsw.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── WESTERN AUSTRALIA (additional) ────────────────────────────────────────────
  {
    title: "Work Health and Safety Act 2020 (WA)",
    jurisdiction: "WA",
    category: "legislation",
    administeringAgency: "WorkSafe WA",
    officialUrl: "https://www.legislation.wa.gov.au/legislation/statutes.nsf/main_mrtitle_14082_homepage.html",
    monitorUrl: "https://www.worksafe.wa.gov.au/",
    monitorChannel: "WorkSafe WA website; legislation.wa.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
    notes: "WA adopted the Model WHS Act in 2020, later than other states.",
  },

  // ── QUEENSLAND (additional) ────────────────────────────────────────────────────
  {
    title: "Work Health and Safety Act 2011 (QLD)",
    jurisdiction: "QLD",
    category: "legislation",
    administeringAgency: "Workplace Health and Safety Queensland (WHSQ)",
    officialUrl: "https://www.legislation.qld.gov.au/view/html/inforce/current/act-2011-018",
    monitorUrl: "https://www.worksafe.qld.gov.au/",
    monitorChannel: "WHSQ website; legislation.qld.gov.au",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },

  // ── NEW ZEALAND ───────────────────────────────────────────────────────────────
  {
    title: "Wine Act 2003 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "Ministry for Primary Industries (MPI)",
    officialUrl: "https://www.legislation.govt.nz/act/public/2003/0114/latest/whole.html",
    monitorUrl: "https://www.mpi.govt.nz/wine/",
    monitorChannel: "MPI wine page; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Sale and Supply of Alcohol Act 2012 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "Alcohol Regulatory and Licensing Authority (ARLA)",
    officialUrl: "https://www.legislation.govt.nz/act/public/2012/0120/latest/whole.html",
    monitorUrl: "https://www.justice.govt.nz/tribunals/arla/",
    monitorChannel: "ARLA website; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
    notes: "Alcohol Licensing Reform Bill 2026 may amend this act.",
  },
  {
    title: "Geographical Indications (Wine and Spirits) Registration Act 2006 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "Intellectual Property Office of New Zealand (IPONZ)",
    officialUrl: "https://www.legislation.govt.nz/act/public/2006/0060/latest/whole.html",
    monitorUrl: "https://www.iponz.govt.nz/manage-ip/geographical-indications/",
    monitorChannel: "IPONZ GI register; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Health and Safety at Work Act 2015 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "WorkSafe New Zealand",
    officialUrl: "https://www.legislation.govt.nz/act/public/2015/0070/latest/whole.html",
    monitorUrl: "https://www.worksafe.govt.nz/",
    monitorChannel: "WorkSafe NZ website; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Resource Management Act 1991 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "Regional and District Councils (NZ)",
    officialUrl: "https://www.legislation.govt.nz/act/public/1991/0069/latest/whole.html",
    monitorUrl: "https://environment.govt.nz/acts-and-regulations/acts/resource-management-act/",
    monitorChannel: "Ministry for the Environment website; legislation.govt.nz email alerts",
    updateFrequency: "Frequent (under reform)",
    lastKnownUpdate: "May 2026",
    notes: "RMA reform ongoing; Natural and Built Environments Act (NBA) may replace RMA.",
  },
  {
    title: "Food Act 2014 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "Ministry for Primary Industries (MPI)",
    officialUrl: "https://www.legislation.govt.nz/act/public/2014/0032/latest/whole.html",
    monitorUrl: "https://www.mpi.govt.nz/food-safety/food-act-2014/",
    monitorChannel: "MPI food safety page; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  {
    title: "Biosecurity Act 1993 (NZ)",
    jurisdiction: "NZ",
    category: "legislation",
    administeringAgency: "MPI Biosecurity New Zealand",
    officialUrl: "https://www.legislation.govt.nz/act/public/1993/0095/latest/whole.html",
    monitorUrl: "https://www.mpi.govt.nz/biosecurity/",
    monitorChannel: "MPI Biosecurity website; legislation.govt.nz email alerts",
    updateFrequency: "Occasional",
    lastKnownUpdate: "May 2026",
  },
  // ── ISO & QUALITY STANDARDS ──────────────────────────────────────────────────
  {
    title: "ISO 9001:2015 — Quality Management Systems",
    jurisdiction: "International",
    category: "standard",
    administeringAgency: "International Organisation for Standardisation (ISO) / Standards Australia / SAI Global",
    officialUrl: "https://www.iso.org/iso-9001-quality-management.html",
    monitorUrl: "https://www.iso.org/iso-9001-quality-management.html",
    monitorChannel: "ISO website; Standards Australia newsletter",
    updateFrequency: "Major revision every ~7 years; current version 2015",
    lastKnownUpdate: "2015 (ISO 9001:2015 current)",
    notes: "Wineries use for batch consistency, export market access, and LIP traceability alignment (Clause 8.5.2). NZ WSMP accepted as partial evidence toward ISO 9001 by some certifiers.",
  },
  {
    title: "ISO 22000:2018 — Food Safety Management Systems",
    jurisdiction: "International",
    category: "standard",
    administeringAgency: "International Organisation for Standardisation (ISO) / Standards Australia",
    officialUrl: "https://www.iso.org/iso-22000-food-safety-management.html",
    monitorUrl: "https://www.iso.org/iso-22000-food-safety-management.html",
    monitorChannel: "ISO website; FSANZ newsletter for related regulatory updates",
    updateFrequency: "Major revision every ~7 years; current version 2018",
    lastKnownUpdate: "2018 (ISO 22000:2018 current)",
    notes: "Integrates HACCP. Accepted as alternative compliance pathway to standalone HACCP plan under FSANZ Standard 3.2.1. Key CCPs: SO2 allergen, pesticide residues, bottling line.",
  },
  {
    title: "ISO 14001:2015 — Environmental Management Systems",
    jurisdiction: "International",
    category: "standard",
    administeringAgency: "International Organisation for Standardisation (ISO) / Standards Australia",
    officialUrl: "https://www.iso.org/iso-14001-environmental-management.html",
    monitorUrl: "https://www.iso.org/iso-14001-environmental-management.html",
    monitorChannel: "ISO website; Entwine Australia newsletter",
    updateFrequency: "Major revision every ~7 years; current version 2015",
    lastKnownUpdate: "2015 (ISO 14001:2015 current)",
    notes: "Complements AWISSP/Entwine Australia. Taylors Wines (Clare Valley) certified since 2009. Formalises wastewater, water, energy, and waste obligations already regulated under state EPA legislation.",
  },
  {
    title: "ISO 45001:2018 — Occupational Health and Safety Management Systems",
    jurisdiction: "International",
    category: "standard",
    administeringAgency: "International Organisation for Standardisation (ISO) / Standards Australia (AS/NZS 45001:2018)",
    officialUrl: "https://www.iso.org/iso-45001-occupational-health-and-safety.html",
    monitorUrl: "https://www.iso.org/iso-45001-occupational-health-and-safety.html",
    monitorChannel: "ISO website; Safe Work Australia newsletter",
    updateFrequency: "Major revision every ~7 years; current version 2018",
    lastKnownUpdate: "2018 (ISO 45001:2018 current; replaces AS/NZS 4801)",
    notes: "Maps to WHS Act obligations across all AU states. Key winery hazards: CO2 confined space, barrel manual handling, SO2 chemical handling, bottling line noise.",
  },
  {
    title: "AWISSP — Australian Wine Industry Standard of Sustainable Practice (Entwine Australia)",
    jurisdiction: "Federal",
    category: "standard",
    administeringAgency: "Australian Grape and Wine (AGW) / Wine Australia",
    officialUrl: "https://entwine.com.au",
    monitorUrl: "https://entwine.com.au/news",
    monitorChannel: "Entwine Australia newsletter; Wine Australia sustainability updates",
    updateFrequency: "Annual program updates",
    lastKnownUpdate: "May 2026",
    notes: "Industry-specific sustainability certification. Complements ISO 14001. Recognised by EU/UK export markets. Modules: vineyard, winery, chemicals, water, energy, waste, biodiversity, social.",
  },
  {
    title: "Sustainable Winegrowing New Zealand (SWNZ)",
    jurisdiction: "NZ",
    category: "standard",
    administeringAgency: "New Zealand Winegrowers",
    officialUrl: "https://www.nzwine.com/en/sustainability/sustainable-winegrowing-nz/",
    monitorUrl: "https://www.nzwine.com/en/sustainability/sustainable-winegrowing-nz/",
    monitorChannel: "NZ Winegrowers newsletter",
    updateFrequency: "Annual program updates",
    lastKnownUpdate: "May 2026",
    notes: "Effectively mandatory for NZ wine export — ~95% of NZ wine exported carries SWNZ logo. Required by major UK and EU retail buyers. Accepted as equivalent to ISO 14001 by many international buyers.",
  },
  // ── OPERATIONAL COMPLIANCE ───────────────────────────────────────────────────
  {
    title: "Work Health and Safety Regulation 2011 (NSW) — Part 4.1 Confined Spaces",
    jurisdiction: "NSW",
    category: "legislation",
    administeringAgency: "SafeWork NSW",
    officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.4.1",
    monitorUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674",
    monitorChannel: "NSW Legislation website email alerts; SafeWork NSW news (safework.nsw.gov.au/news)",
    updateFrequency: "Occasional amendments",
    lastKnownUpdate: "May 2026",
    notes: "Governs confined space entry permits, atmospheric testing, standby person requirements, and training for wine tank entry. Sections 60-79.",
  },
  {
    title: "Work Health and Safety Regulation 2011 (NSW) — Part 5.1 Plant Management",
    jurisdiction: "NSW",
    category: "legislation",
    administeringAgency: "SafeWork NSW",
    officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.5.1",
    monitorUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674",
    monitorChannel: "NSW Legislation website email alerts; SafeWork NSW news",
    updateFrequency: "Occasional amendments",
    lastKnownUpdate: "May 2026",
    notes: "Governs lock-out/tag-out (LOTO) procedures, plant register, and maintenance records. Sections 208-215 (isolation), 246-247 (register and records).",
  },
  {
    title: "Work Health and Safety Regulation 2011 (NSW) — Part 7.1 Hazardous Chemicals",
    jurisdiction: "NSW",
    category: "legislation",
    administeringAgency: "SafeWork NSW",
    officialUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674#pt.7.1",
    monitorUrl: "https://legislation.nsw.gov.au/view/html/inforce/current/sl-2011-0674",
    monitorChannel: "NSW Legislation website email alerts",
    updateFrequency: "Occasional amendments",
    lastKnownUpdate: "May 2026",
    notes: "Governs hazardous chemicals register, SDS requirements, GHS labelling, placard and manifest quantities. Sections 340, 346, 349.",
  },
  {
    title: "AS/NZS 3760:2022 — In-service Safety Inspection and Testing of Electrical Equipment",
    jurisdiction: "Federal",
    category: "standard",
    administeringAgency: "Standards Australia / Standards New Zealand",
    officialUrl: "https://www.standards.org.au/standards-catalogue/sa-snz/electrotechnology/el-043/as-nzs-3760-2022",
    monitorUrl: "https://www.standards.org.au/standards-catalogue/sa-snz/electrotechnology/el-043/as-nzs-3760-2022",
    monitorChannel: "Standards Australia update notifications (store.standards.org.au)",
    updateFrequency: "Major revision every ~5-10 years",
    lastKnownUpdate: "2022 (current edition)",
    notes: "Specifies inspection and testing intervals for electrical equipment in hostile environments including wineries. Portable equipment: 6-monthly; fixed: 12-monthly.",
  },
  {
    title: "SafeWork NSW Guide to Managing Risks in Wineries",
    jurisdiction: "NSW",
    category: "guidance",
    administeringAgency: "SafeWork NSW",
    officialUrl: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
    monitorUrl: "https://www.safework.nsw.gov.au/resource-library/list-of-all-resources/publications/guide-to-managing-risks-in-wineries",
    monitorChannel: "SafeWork NSW website; SafeWork NSW news email alerts",
    updateFrequency: "Infrequent (major revision every 5+ years)",
    lastKnownUpdate: "2014 (current edition)",
    notes: "Comprehensive winery-specific WHS guidance covering confined spaces, hazardous chemicals, plant maintenance, manual tasks, electrical safety, falls, and fire/explosion.",
  },
  {
    title: "Safe Work Australia Code of Practice: Confined Spaces",
    jurisdiction: "Federal",
    category: "code",
    administeringAgency: "Safe Work Australia",
    officialUrl: "https://www.safeworkaustralia.gov.au/doc/model-code-practice-confined-spaces",
    monitorUrl: "https://www.safeworkaustralia.gov.au/doc/model-code-practice-confined-spaces",
    monitorChannel: "Safe Work Australia website; Safe Work Australia news",
    updateFrequency: "Infrequent",
    lastKnownUpdate: "2013 (current edition)",
    notes: "Model Code of Practice adopted by NSW, SA, QLD, TAS, ACT, NT. Provides practical guidance on confined space entry permits, atmospheric testing, standby persons, and emergency procedures.",
  },
];
// ─── SOURCE DOCTRINE HELPERS ──────────────────────────────────────────────────

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
  // Operational compliance is cross-jurisdictional — always include
  parts.push(KB_SECTIONS.Operational ?? "");
  parts.push(KB_SECTIONS.Contacts);
  return parts.join("\n\n");
}
