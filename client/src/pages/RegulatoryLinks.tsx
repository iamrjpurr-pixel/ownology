/**
 * OWNOLOGY — Regulatory Reference Library
 * A curated links page pointing directly to the authoritative primary sources
 * for Australian winery regulation. We do not paraphrase legislation here —
 * we send you to the people who write and maintain it.
 */
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const AMBER = "var(--ow-amber)";
const BG = "var(--ow-bg-base)";
const CARD_BG = "var(--ow-bg-raised)";
const BORDER = "color-mix(in oklch, var(--ow-amber) 15%, transparent)";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";

interface RegLink {
  label: string;
  url: string;
  description: string;
}

interface RegSection {
  heading: string;
  note?: string;
  links: RegLink[];
}

const SECTIONS: RegSection[] = [
  {
    heading: "Best Starting Point",
    note: "The AWRI's regulatory hub is the most comprehensive and up-to-date single resource for Australian winery compliance.",
    links: [
      {
        label: "AWRI — Regulatory Assistance Hub",
        url: "https://www.awri.com.au/industry_support/regulatory_assistance/",
        description: "A curated map of all compliance requirements for Australian winemakers — maintained by the Australian Wine Research Institute and updated as legislation changes. This is the right first stop for any compliance question.",
      },
    ],
  },
  {
    heading: "Federal — Wine-Specific",
    note: "These apply to all Australian wine producers regardless of state.",
    links: [
      {
        label: "Wine Australia — Registration, LIP & Labelling",
        url: "https://www.wineaustralia.com/regulation/compliance",
        description: "Wine Australia registration, Label Integrity Programme (LIP), mandatory labelling requirements, and export licensing.",
      },
      {
        label: "FSANZ Food Standards Code",
        url: "https://www.foodstandards.gov.au/food-standards-code",
        description: "The authoritative source for labelling, additives, contaminants, and composition standards. Standard 4.5.1 covers wine composition; Standard 1.3.1 covers SO₂ limits. Pregnancy warning label requirements are here.",
      },
      {
        label: "ATO — Wine Equalisation Tax (WET)",
        url: "https://www.ato.gov.au/businesses-and-organisations/gst-excise-and-indirect-taxes/wine-equalisation-tax",
        description: "WET obligations, producer rebate eligibility (cap rising to $400,000 from 1 July 2026), and lodgement requirements.",
      },
      {
        label: "Safe Work Australia — Model WHS Laws",
        url: "https://www.safeworkaustralia.gov.au/law-and-regulation/model-whs-laws",
        description: "The national WHS framework covering CO₂ confined space entry, chemical handling (SO₂, caustic soda), and seasonal worker obligations.",
      },
    ],
  },
  {
    heading: "State Liquor Licensing",
    note: "Each state administers its own liquor licensing regime. Go directly to the relevant authority.",
    links: [
      {
        label: "SA — Consumer and Business Services",
        url: "https://www.cbs.sa.gov.au/licences/liquor",
        description: "Producer's Licence, cellar door approvals, and RSA requirements in South Australia.",
      },
      {
        label: "VIC — Victorian Commission for Gambling and Liquor Regulation",
        url: "https://www.vcglr.vic.gov.au/licences-and-permits",
        description: "Winery Producer's Licence and cellar door requirements in Victoria.",
      },
      {
        label: "NSW — Liquor & Gaming NSW",
        url: "https://www.liquorandgaming.nsw.gov.au/licences-and-permits",
        description: "Producer/wholesaler licence and on-premises requirements in New South Wales.",
      },
      {
        label: "QLD — Office of Liquor and Gaming Regulation",
        url: "https://www.business.qld.gov.au/industries/hospitality-tourism-sport/liquor/licences",
        description: "Producer/wholesaler licence requirements in Queensland.",
      },
      {
        label: "WA — Department of Racing, Gaming and Liquor",
        url: "https://www.rgl.wa.gov.au/liquor-licences.aspx",
        description: "Producer's licence and cellar door requirements in Western Australia.",
      },
      {
        label: "TAS — Commissioner for Licensing",
        url: "https://www.treasury.tas.gov.au/liquor-and-gaming/liquor/liquor-licensing",
        description: "Liquor licensing requirements in Tasmania.",
      },
    ],
  },
  {
    heading: "Environment & Winemaking Practices",
    links: [
      {
        label: "AWRI — Winemaking Practices Library",
        url: "https://www.awri.com.au/industry_support/winemaking_resources/winemaking-practices/",
        description: "Practical guidance on 21 specific winemaking practices — cap management, cold soak, MLF timing, yeast choice, and more. The authoritative Australian reference for cellar operations.",
      },
      {
        label: "AWRI — Winemaking Calculators",
        url: "https://www.awri.com.au/industry_support/winemaking_resources/winemaking-practices/",
        description: "Free SO₂, YAN, acid addition, and alcohol calculators maintained by the AWRI.",
      },
      {
        label: "EPA SA — Winery Environmental Guidelines",
        url: "https://www.epa.sa.gov.au/business_and_industry/wineries",
        description: "Wastewater management, odour, noise, and EPA licensing requirements for SA wineries.",
      },
    ],
  },
  {
    heading: "New Zealand",
    links: [
      {
        label: "Wine Institute of New Zealand — Compliance",
        url: "https://www.wineinstitute.co.nz/industry/compliance",
        description: "NZ wine labelling, export, and regulatory compliance resources.",
      },
      {
        label: "MPI — Food Act and Wine Standards",
        url: "https://www.mpi.govt.nz/food-business/food-act-2014/",
        description: "New Zealand Food Act requirements applicable to wine producers.",
      },
    ],
  },
];

function ExternalLinkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ flexShrink: 0, marginTop: 2 }}>
      <path d="M5 2H2a1 1 0 00-1 1v7a1 1 0 001 1h7a1 1 0 001-1V7M8 1h3m0 0v3m0-3L5 7" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

export default function RegulatoryLinks() {
  return (
    <div style={{ background: BG, minHeight: "100vh", color: TEXT_HI }}>
      {/* Nav */}
      <nav style={{ borderBottom: `1px solid ${BORDER}`, padding: "20px 0" }}>
        <div className="container flex items-center justify-between">
          <Link href="/"><OwnologyLogo size={32} /></Link>
          <div className="flex items-center gap-6">
            <Link href="/regulations/detail" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_MID, textDecoration: "none" }}>
              Detailed Reference →
            </Link>
            <Link href="/compliance" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: AMBER, textDecoration: "none" }}>
              Ask the Compliance AI →
            </Link>
          </div>
        </div>
      </nav>

      {/* Header */}
      <div className="container" style={{ paddingTop: "3.5rem", paddingBottom: "2rem", maxWidth: 760 }}>
        <p style={{ fontFamily: SANS, fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: TEXT_LO, marginBottom: "0.75rem" }}>
          Regulatory Reference
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: 1.1, color: TEXT_HI, marginBottom: "1rem" }}>
          Australian Winery<br />
          <em style={{ color: AMBER, fontStyle: "italic" }}>Regulatory Library</em>
        </h1>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: TEXT_MID, maxWidth: 580 }}>
          We don't paraphrase legislation — we send you directly to the people who write and maintain it.
          Every link below goes to the authoritative primary source. For specific compliance questions,
          use the Compliance AI.
        </p>
      </div>

      {/* Sections */}
      <div className="container" style={{ maxWidth: 760, paddingBottom: "4rem" }}>
        {SECTIONS.map((section) => (
          <div key={section.heading} style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI, marginBottom: "0.25rem" }}>
              {section.heading}
            </h2>
            {section.note && (
              <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO, marginBottom: "1rem", lineHeight: 1.5 }}>
                {section.note}
              </p>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
              {section.links.map((link) => (
                <a
                  key={link.url}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "block",
                    padding: "1rem 1.25rem",
                    background: CARD_BG,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 2,
                    textDecoration: "none",
                    transition: "border-color 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 40%, transparent)")}
                  onMouseLeave={(e) => (e.currentTarget.style.borderColor = BORDER)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem", marginBottom: "0.375rem" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: AMBER, lineHeight: 1.3 }}>
                      {link.label}
                    </span>
                    <ExternalLinkIcon />
                  </div>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID, lineHeight: 1.5, margin: 0 }}>
                    {link.description}
                  </p>
                </a>
              ))}
            </div>
          </div>
        ))}

        {/* Detailed reference link */}
        <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "2rem", marginBottom: "2rem" }}>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, lineHeight: 1.6, marginBottom: "0.75rem" }}>
            Need the full state-by-state breakdown with key points and source citations?
          </p>
          <Link href="/regulations/detail" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "8px 18px", background: "transparent",
            border: `1px solid ${BORDER}`, color: TEXT_MID,
            fontFamily: SANS, fontSize: "0.8125rem", letterSpacing: "0.04em",
            textDecoration: "none", borderRadius: 2,
          }}>
            View Detailed Reference →
          </Link>
        </div>

        {/* Compliance AI CTA */}
        <div style={{ padding: "1.5rem", background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: `1px solid ${BORDER}`, borderRadius: 2 }}>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.6, margin: "0 0 1rem 0" }}>
            Have a specific compliance question — labelling, additives, licensing, WET? The Compliance AI answers from the primary legislation and cites the exact standard and section.
          </p>
          <Link href="/compliance" style={{
            display: "inline-flex", alignItems: "center", gap: "0.5rem",
            padding: "10px 22px", background: AMBER, color: "oklch(0.10 0.008 60)",
            fontFamily: SANS, fontWeight: 700, fontSize: "0.8125rem", letterSpacing: "0.06em",
            textTransform: "uppercase", textDecoration: "none", borderRadius: 2,
          }}>
            Ask the Compliance AI →
          </Link>
        </div>
      </div>
    </div>
  );
}
