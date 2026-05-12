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
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

function RegCard({
  section,
}: {
  section: (typeof FEDERAL_SECTIONS)[0];
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
            className="flex items-center gap-3 mt-4 pt-4"
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

export default function Resources() {
  const [activeTab, setActiveTab] = useState<"federal" | "sa">("federal");
  const [search, setSearch] = useState("");

  const sections = activeTab === "federal" ? FEDERAL_SECTIONS : SA_SECTIONS;
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
            A structured reference covering federal and South Australian regulatory requirements for
            boutique wine producers. Use the Compliance Agent to ask specific questions.
          </p>
        </div>
      </section>

      {/* Main content */}
      <section className="py-12">
        <div className="container max-w-4xl">
          {/* Tab + Search row */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-8">
            {/* Tabs */}
            <div className="flex gap-2">
              {(["federal", "sa"] as const).map((tab) => (
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
                  {tab === "federal" ? "Federal" : "South Australia"}
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
