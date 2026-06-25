/**
 * Resume — Web version of Richard Purr's CV, tailored to the Tamburlaine
 * Organic Wines Cellar Hand role. Self-contained styling (inline) so it renders
 * identically regardless of global theme. Includes a print / save-as-PDF action.
 */
import { useEffect } from "react";

const AMBER = "#B0741A";
const AMBER_SOFT = "#FBF3E4";
const AMBER_BORDER = "#E3D6BE";
const INK = "#1C1813";
const BODY = "#423B30";
const MUTE = "#8A7E6C";
const PAGE_BG = "#F6F1E7";
const CARD = "#FFFFFF";

const SERIF = "'Fraunces', Georgia, 'Times New Roman', serif";
const SANS = "'Lato', 'Helvetica Neue', Arial, sans-serif";

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: SERIF,
        fontSize: "1.05rem",
        color: INK,
        letterSpacing: "0.01em",
        borderBottom: `1px solid ${AMBER_BORDER}`,
        paddingBottom: "5px",
        margin: "0 0 12px",
      }}
    >
      {children}
    </h2>
  );
}

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li style={{ position: "relative", paddingLeft: "16px", marginBottom: "7px", color: BODY, lineHeight: 1.6 }}>
      <span
        style={{
          position: "absolute",
          left: 0,
          top: "9px",
          width: "5px",
          height: "5px",
          background: AMBER,
          borderRadius: "50%",
        }}
      />
      {children}
    </li>
  );
}

function Job({
  title,
  meta,
  children,
}: {
  title: string;
  meta?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "16px" }}>
      <div style={{ fontWeight: 700, color: INK, fontSize: "1rem" }}>{title}</div>
      {meta && (
        <div style={{ color: MUTE, fontSize: "0.82rem", fontStyle: "italic", marginBottom: "5px" }}>{meta}</div>
      )}
      <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>{children}</ul>
    </div>
  );
}

const SKILLS = [
  "Qualified electrician",
  "Pumps · motors · refrigeration",
  "Presses & control panels",
  "Preventive maintenance",
  "Asset management",
  "SOP & WHS discipline",
  "Traceability & records",
  "Sanitation rigour",
  "Organic-aware",
  "Physical stamina",
];

export default function Resume() {
  useEffect(() => {
    document.title = "Richard Purr — Resume | Cellar Hand";
  }, []);

  return (
    <div style={{ background: PAGE_BG, minHeight: "100vh", fontFamily: SANS, color: BODY, padding: "0 0 60px" }}>
      {/* Print styles */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          .resume-sheet { box-shadow: none !important; margin: 0 !important; max-width: 100% !important; }
          body { background: #fff !important; }
        }
        @media (max-width: 760px) {
          .resume-cols { flex-direction: column !important; }
          .resume-cols .resume-left, .resume-cols .resume-right { width: 100% !important; }
        }
      `}</style>

      {/* Action bar */}
      <div
        className="no-print"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          maxWidth: "860px",
          margin: "0 auto",
          padding: "20px 24px 14px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
        <a
          href="/home"
          style={{ color: MUTE, fontSize: "0.85rem", textDecoration: "none", letterSpacing: "0.02em" }}
        >
          ← Ownology
        </a>
        <button
          onClick={() => window.print()}
          style={{
            background: AMBER,
            color: "#FFF8EC",
            border: "none",
            padding: "10px 20px",
            borderRadius: "3px",
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.8rem",
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          Download / Print PDF
        </button>
      </div>

      {/* Sheet */}
      <div
        className="resume-sheet"
        style={{
          maxWidth: "860px",
          margin: "0 auto",
          background: CARD,
          boxShadow: "0 18px 50px rgba(40,30,15,0.12)",
          padding: "clamp(28px, 5vw, 56px)",
        }}
      >
        {/* Header */}
        <header style={{ borderBottom: `3px solid ${AMBER}`, paddingBottom: "18px", marginBottom: "26px" }}>
          <div
            style={{
              fontFamily: SERIF,
              fontSize: "clamp(2rem, 5vw, 2.75rem)",
              fontWeight: 700,
              letterSpacing: "-0.02em",
              color: INK,
              lineHeight: 1.05,
            }}
          >
            Richard Purr
          </div>
          <div
            style={{
              fontSize: "0.8rem",
              fontWeight: 700,
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: AMBER,
              marginTop: "8px",
            }}
          >
            Cellar Hand — Tamburlaine Organic Wines, Orange Region
          </div>
          <div style={{ fontSize: "0.85rem", color: MUTE, marginTop: "8px", fontStyle: "italic" }}>
            Qualified electrician · Engineering manager (built &amp; sold own business) · Owner-builder · Founder &amp; CEO,
            Ownology · Father of three
          </div>
          <div style={{ fontSize: "0.85rem", color: MUTE, marginTop: "10px" }}>
            <b style={{ color: INK }}>0408 105 067</b> &nbsp;·&nbsp; Australian citizen — full working rights
          </div>
        </header>

        {/* Columns */}
        <div className="resume-cols" style={{ display: "flex", gap: "38px" }}>
          {/* LEFT */}
          <div className="resume-left" style={{ width: "62%" }}>
            <SectionTitle>Profile</SectionTitle>
            <p style={{ color: BODY, lineHeight: 1.7, marginBottom: "8px" }}>
              A hands-on, process-disciplined candidate bringing a rare combination to the cellar floor: a qualified
              electrician with strong asset management and maintenance experience, an engineering manager from a
              rail-industry consulting background (having built and sold his own small business), the practical
              capability of an owner-builder, two decades of genuine immersion in boutique and organic wine, and formal
              study currently underway in Viticulture &amp; Winemaking (Oenology). Comfortable with the physical,
              safety-critical, repeatable work of vintage — and able to help keep winery plant and electrical machinery
              running. Self-sufficient on accommodation and available for the full 6–12 month contract.
            </p>

            <div style={{ height: "22px" }} />
            <SectionTitle>Experience</SectionTitle>

            <Job title="Founder & CEO — Ownology" meta="AI knowledge assistant for boutique wineries">
              <Bullet>
                Built and leads a working platform that gives winery teams instant, document-grounded answers from their
                own SOPs, vintage records, and house-style protocols — designed to preserve cellar knowledge across staff
                and sites.
              </Bullet>
              <li style={{ listStyle: "none", marginTop: "6px" }}>
                <div
                  style={{
                    background: AMBER_SOFT,
                    borderLeft: `2px solid ${AMBER}`,
                    padding: "9px 12px",
                    fontStyle: "italic",
                    color: "#5A4A2A",
                    fontSize: "0.9rem",
                    lineHeight: 1.55,
                  }}
                >
                  Would welcome the opportunity to demonstrate Ownology to the Tamburlaine team — well suited to a
                  multi-site organic producer that needs to retain and share institutional cellar knowledge.
                </div>
              </li>
            </Job>

            <Job title="Qualified Electrician & Maintenance / Asset Management">
              <Bullet>
                Licensed electrician with practical knowledge of industrial electric machinery and controls — directly
                applicable to winery pumps, motors, refrigeration, and presses.
              </Bullet>
              <Bullet>
                Asset management and maintenance experience: preventive maintenance, equipment reliability, and
                minimising operational downtime.
              </Bullet>
              <Bullet>
                Shortlisted/interviewed for a winery asset-development role (buildings, council/regulatory approvals,
                equipment upgrades) where owner-builder knowledge of architecture, engineering, and council development
                applications was directly relevant.
              </Bullet>
            </Job>

            <Job title="Engineering Manager (Consulting) — Rail Industry" meta="Built and sold own small business">
              <Bullet>
                Led engineering delivery and teams in a safety-critical, standards-driven environment; accountable for
                process adherence, documentation, risk management, and quality.
              </Bullet>
              <Bullet>
                Daily practice in WHS, methodical procedures, and accurate technical record-keeping — the same
                disciplines that underpin good cellar work.
              </Bullet>
            </Job>

            <Job title="Owner-Builder">
              <Bullet>
                Planned and executed building works hands-on, including architecture, engineering coordination, and
                council development applications — plus practical mechanical/equipment skills and physical stamina.
              </Bullet>
            </Job>

            <Job title="Wine Collector & Independent Student of Boutique Winemaking" meta="2005 – present">
              <Bullet>
                Two decades collecting and studying boutique-producer wines; member days, private tastings, vineyard
                tours, and extensive time alongside winemakers in production sheds — learning the practical realities of
                each vintage firsthand.
              </Bullet>
            </Job>
          </div>

          {/* RIGHT */}
          <div className="resume-right" style={{ width: "38%" }}>
            <SectionTitle>Why This Role</SectionTitle>
            <ul style={{ listStyle: "none", margin: "0 0 22px", padding: 0 }}>
              <Bullet>Keen to contribute to Australia's largest organic wine producer and a pioneer of organic viticulture.</Bullet>
              <Bullet>Fit for the realities of vintage: long hours, plant and equipment, sanitation, and accurate records.</Bullet>
              <Bullet>Electrical, maintenance, and safety skills are a genuine on-site asset.</Bullet>
              <Bullet>Reliable and self-sufficient — own accommodation, ready for the full contract.</Bullet>
            </ul>

            <SectionTitle>Cellar-Ready Strengths</SectionTitle>
            <div style={{ marginBottom: "22px" }}>
              {SKILLS.map((s) => (
                <span
                  key={s}
                  style={{
                    display: "inline-block",
                    background: "#F3ECDD",
                    color: "#5A4A2A",
                    padding: "4px 10px",
                    borderRadius: "3px",
                    fontSize: "0.78rem",
                    margin: "0 5px 6px 0",
                  }}
                >
                  {s}
                </span>
              ))}
            </div>

            <SectionTitle>Education &amp; Qualifications</SectionTitle>
            <div style={{ marginBottom: "22px" }}>
              <div style={{ marginBottom: "11px" }}>
                <div style={{ fontWeight: 700, color: INK }}>Master of Engineering (Management)</div>
                <div style={{ color: MUTE, fontSize: "0.82rem" }}>Southern Cross University</div>
              </div>
              <div style={{ marginBottom: "11px" }}>
                <div style={{ fontWeight: 700, color: INK }}>Electrical Licence — Qualified Electrician</div>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: INK }}>
                  Advanced Certificate of Viticulture &amp; Winemaking — Oenology
                </div>
                <div style={{ color: MUTE, fontSize: "0.82rem" }}>In progress — currently studying</div>
              </div>
            </div>

            <SectionTitle>Logistics</SectionTitle>
            <div>
              {[
                ["Accom.", "Own motorhome — no housing required"],
                ["Avail.", "Full-time, full 6–12 month contract (from 15/06/2026)"],
                ["Status", "Australian citizen — full working rights"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", marginBottom: "8px" }}>
                  <div
                    style={{
                      width: "62px",
                      flexShrink: 0,
                      fontSize: "0.72rem",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: AMBER,
                      fontWeight: 700,
                      paddingTop: "2px",
                    }}
                  >
                    {k}
                  </div>
                  <div style={{ color: INK, lineHeight: 1.5 }}>{v}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div style={{ marginTop: "26px", fontSize: "0.82rem", color: "#9A8F7C", fontStyle: "italic" }}>
          Referees available on request.
        </div>
      </div>
    </div>
  );
}
