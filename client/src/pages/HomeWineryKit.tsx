/**
 * HomeWineryKit — /resources/home-winery-kit
 * Printable shopping checklist for a complete home winery setup.
 * SEO-friendly, print-optimised, PDF export via window.print().
 */
import { useState } from "react";
import { Link } from "wouter";
import { Printer, ArrowLeft, CheckSquare, Square, ExternalLink } from "lucide-react";

// ─── Equipment data ────────────────────────────────────────────────────────────

const CATEGORIES = [
  {
    id: "fermentation",
    label: "Fermentation & Storage",
    emoji: "🍇",
    items: [
      { id: "bubbler", name: "6.5-gallon Big Mouth Bubbler", note: "Plastic primary fermenter; wide mouth makes cleaning easy" },
      { id: "carboy", name: "6-gallon glass carboy", note: "Secondary fermentation vessel; glass is inert and easy to inspect" },
      { id: "lid", name: "Fermenter lid", note: "Fits the primary fermenter; keeps out fruit flies and dust" },
      { id: "bung", name: "Rubber bung (stopper)", note: "Drilled to accept the airlock; replace if cracked or hard" },
      { id: "airlock", name: "3-piece airlock", note: "Fill with K-meta solution, not plain water" },
    ],
  },
  {
    id: "transfer",
    label: "Transfer & Bottling",
    emoji: "🍾",
    items: [
      { id: "siphon", name: "Auto siphon", note: "Spring-loaded; much easier than mouth-siphoning" },
      { id: "tubing", name: "5 ft food-grade tubing", note: "Fits standard auto siphon; replace every 1–2 years" },
      { id: "filler", name: "Bottle filler with needle valve", note: "Spring-loaded bottom valve; fills to correct headspace automatically" },
      { id: "bottles", name: "Wine bottles × 30", note: "Standard 750 mL; a 6-gallon batch yields approximately 28–30 bottles" },
      { id: "corks", name: "Corks × 30 (#9 straight)", note: "Soak in K-meta solution 20–30 min before use; do not boil" },
      { id: "corker", name: "Impact corker", note: "Hand-held; adequate for 30 bottles. Floor corker for larger batches." },
    ],
  },
  {
    id: "measuring",
    label: "Measuring & Testing",
    emoji: "🔬",
    items: [
      { id: "thermometer", name: "Thermometer", note: "Instant-read; target fermentation range 18–24 °C (65–75 °F)" },
      { id: "stick-therm", name: "Stick-on fermenter thermometers", note: "Adhesive strip on the outside of the carboy for continuous monitoring" },
      { id: "hydrometer", name: "Hydrometer", note: "Measures sugar content (Brix/SG); use to track fermentation progress" },
      { id: "test-jar", name: "Hydrometer test jar", note: "Tall cylinder; fill with must sample, float hydrometer" },
      { id: "thief", name: "Wine thief (3-piece sampler)", note: "Extracts a sample without disturbing the wine; disassemble to clean" },
    ],
  },
  {
    id: "mixing",
    label: "Mixing & Processing",
    emoji: "🌀",
    items: [
      { id: "spoon", name: "Plastic stirring spoon", note: "Long-handled; replace if scratched (harbours bacteria)" },
      { id: "degasser", name: "Clean Bottle Express degasser whip", note: "Attaches to electric drill; removes CO₂ before fining" },
      { id: "drill", name: "Electric drill", note: "Used with degasser; variable speed, low setting" },
    ],
  },
  {
    id: "cleaning",
    label: "Cleaning & Sanitising",
    emoji: "🧼",
    items: [
      { id: "carboy-brush", name: "Carboy brush", note: "Long-handled; reaches the shoulders and base of the carboy" },
      { id: "bottle-brush", name: "Bottle brush", note: "For cleaning wine bottles before bottling" },
      { id: "cloths", name: "Cleaning cloths", note: "Microfibre; keep a dedicated set for winery use only" },
      { id: "funnel", name: "Funnel", note: "For pouring sanitiser into bottles; wide-mouth preferred" },
      { id: "one-step", name: "One Step No-Rinse Cleaner/Sanitizer", note: "Oxygen-based; 1 tbsp per gallon of warm water; no rinse required" },
      { id: "kmeta", name: "Potassium metabisulfite powder (K-meta)", note: "1 tsp per 4 L of cool water = sanitising solution; mix fresh each session" },
      { id: "spray", name: "Trigger spray bottle", note: "Fill with K-meta solution; label clearly; discard after 24 hours" },
    ],
  },
  {
    id: "kit",
    label: "Wine Kit Ingredients",
    emoji: "📦",
    items: [
      { id: "juice", name: "Grape juice concentrate / juice bag", note: "The core ingredient; choose style (red, white, rosé) and quality tier" },
      { id: "yeast", name: "Wine yeast (included in kit)", note: "Commercial strains are more consistent than wild yeast" },
      { id: "bentonite", name: "Bentonite (included in kit)", note: "Fining agent; added at start to help clarification" },
      { id: "sorbate", name: "Potassium sorbate (included in kit)", note: "Stabiliser; prevents re-fermentation after sweetening" },
      { id: "kmeta-kit", name: "Potassium metabisulfite (included in kit)", note: "Antioxidant and antimicrobial; added at stabilisation and bottling" },
      { id: "fining", name: "Fining agent / Chitosan (included in kit)", note: "Clears the wine; add after degassing" },
      { id: "oak", name: "Oak powder or chips (optional, kit-dependent)", note: "Adds oak character; use sparingly for home-scale batches" },
    ],
  },
  {
    id: "optional",
    label: "Optional Finishing Supplies",
    emoji: "✨",
    items: [
      { id: "labels", name: "Wine labels", note: "Printable on standard label paper; personalise your bottles" },
      { id: "capsules", name: "Shrink capsules for bottle tops", note: "Heat-shrink over the cork; cosmetic finish; use a heat gun or boiling water" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeWineryKit() {
  const [checked, setChecked] = useState<Set<string>>(new Set());

  const toggle = (id: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const totalItems = CATEGORIES.reduce((sum, c) => sum + c.items.length, 0);
  const checkedCount = checked.size;

  const handlePrint = () => window.print();

  return (
    <div
      id="home-winery-kit-root"
      style={{
        minHeight: "100vh",
        background: "oklch(0.11 0.008 60)",
        color: "oklch(0.90 0.015 75)",
        fontFamily: "'Lato', sans-serif",
        paddingBottom: "4rem",
      }}
    >
      {/* ── Print-only header ── */}
      <div className="print-only" style={{ display: "none" }}>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.75rem", marginBottom: "0.25rem" }}>
          Home Winery Kit — Complete Shopping Checklist
        </h1>
        <p style={{ fontSize: "0.85rem", color: "#666", marginBottom: "1.5rem" }}>
          Ownology · ownology.app/resources/home-winery-kit · {new Date().toLocaleDateString("en-AU", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ── Screen nav ── */}
      <div className="no-print" style={{ borderBottom: "1px solid oklch(1 0 0 / 8%)", padding: "1rem 0" }}>
        <div className="container" style={{ maxWidth: "760px", margin: "0 auto", padding: "0 1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem" }}>
            <Link href="/">
              <a style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", color: "oklch(0.65 0.015 75)", fontSize: "0.875rem", textDecoration: "none" }}>
                <ArrowLeft size={15} />
                Back to Ownology
              </a>
            </Link>
            <button
              onClick={handlePrint}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.5rem 1rem",
                borderRadius: "6px",
                border: "1px solid oklch(0.72 0.12 75 / 40%)",
                background: "oklch(0.72 0.12 75 / 15%)",
                color: "oklch(0.72 0.12 75)",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <Printer size={14} />
              Print / Save PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Header ── */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "2.5rem 1.25rem 1.5rem" }}>
        <p style={{ fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "0.5rem" }}>
          Resources · Home Winemaking
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 700,
            fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
            lineHeight: 1.1,
            color: "oklch(0.95 0.018 75)",
            marginBottom: "0.75rem",
          }}
        >
          Home Winery Kit
        </h1>
        <p style={{ fontSize: "1rem", lineHeight: 1.7, color: "oklch(0.68 0.015 75)", maxWidth: "560px", marginBottom: "1.25rem" }}>
          Everything you need to make your first 6-gallon (approximately 30 bottles) batch of wine at home — from fermentation to bottling. Tick items off as you gather them.
        </p>

        {/* Progress bar */}
        <div className="no-print" style={{ marginBottom: "0.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8rem", color: "oklch(0.60 0.015 75)", marginBottom: "0.35rem" }}>
            <span>{checkedCount} of {totalItems} items gathered</span>
            <span>{Math.round((checkedCount / totalItems) * 100)}%</span>
          </div>
          <div style={{ height: "4px", background: "oklch(1 0 0 / 8%)", borderRadius: "2px", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${(checkedCount / totalItems) * 100}%`,
                background: "oklch(0.72 0.12 75)",
                borderRadius: "2px",
                transition: "width 0.3s ease",
              }}
            />
          </div>
        </div>
      </div>

      {/* ── Checklist ── */}
      <div style={{ maxWidth: "760px", margin: "0 auto", padding: "0 1.25rem" }}>
        {CATEGORIES.map(cat => (
          <div key={cat.id} style={{ marginBottom: "2rem" }}>
            {/* Category header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid oklch(0.72 0.12 75 / 20%)",
              }}
            >
              <span style={{ fontSize: "1.1rem" }}>{cat.emoji}</span>
              <h2
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: "1.1rem",
                  color: "oklch(0.88 0.018 75)",
                  margin: 0,
                }}
              >
                {cat.label}
              </h2>
              <span
                className="no-print"
                style={{
                  marginLeft: "auto",
                  fontSize: "0.75rem",
                  color: "oklch(0.55 0.015 75)",
                }}
              >
                {cat.items.filter(i => checked.has(i.id)).length}/{cat.items.length}
              </span>
            </div>

            {/* Items */}
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {cat.items.map(item => {
                const isChecked = checked.has(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="no-print"
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "8px",
                      background: isChecked ? "oklch(0.72 0.12 75 / 8%)" : "oklch(1 0 0 / 3%)",
                      border: `1px solid ${isChecked ? "oklch(0.72 0.12 75 / 25%)" : "oklch(1 0 0 / 6%)"}`,
                      cursor: "pointer",
                      transition: "background 0.15s, border-color 0.15s",
                      minHeight: "44px",
                    }}
                  >
                    <div style={{ flexShrink: 0, paddingTop: "1px" }}>
                      {isChecked
                        ? <CheckSquare size={18} color="oklch(0.72 0.12 75)" />
                        : <Square size={18} color="oklch(0.45 0.012 75)" />
                      }
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: isChecked ? "oklch(0.72 0.12 75)" : "oklch(0.88 0.015 75)",
                          textDecoration: isChecked ? "line-through" : "none",
                          lineHeight: 1.4,
                        }}
                      >
                        {item.name}
                      </p>
                      {item.note && (
                        <p
                          style={{
                            margin: "0.2rem 0 0",
                            fontSize: "0.8rem",
                            color: "oklch(0.55 0.012 75)",
                            lineHeight: 1.4,
                          }}
                        >
                          {item.note}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Print-only version of items (no interactivity) */}
              {cat.items.map(item => (
                <div
                  key={`print-${item.id}`}
                  className="print-only"
                  style={{ display: "none", alignItems: "flex-start", gap: "0.6rem", padding: "0.4rem 0", borderBottom: "1px solid #eee" }}
                >
                  <div style={{ width: "16px", height: "16px", border: "1px solid #999", borderRadius: "2px", flexShrink: 0, marginTop: "2px" }} />
                  <div>
                    <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{item.name}</span>
                    {item.note && <span style={{ fontSize: "0.8rem", color: "#666", marginLeft: "0.4rem" }}>— {item.note}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {/* ── Footer note ── */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1.25rem",
            borderRadius: "10px",
            background: "oklch(0.72 0.12 75 / 6%)",
            border: "1px solid oklch(0.72 0.12 75 / 20%)",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.875rem", lineHeight: 1.6, color: "oklch(0.65 0.015 75)" }}>
            <strong style={{ color: "oklch(0.72 0.12 75)" }}>Tip:</strong> Most homebrew supply shops sell starter kits that bundle the fermenter, carboy, airlock, siphon, tubing, hydrometer, and a wine kit together at a discount. The wine kit itself (juice concentrate, yeast, fining agents) is the most important purchase — choose a quality kit from a reputable supplier for the best results.
          </p>
        </div>

        {/* ── CTA ── */}
        <div className="no-print" style={{ marginTop: "2.5rem", textAlign: "center" }}>
          <p style={{ fontSize: "0.875rem", color: "oklch(0.55 0.015 75)", marginBottom: "0.75rem" }}>
            Want AI-powered answers to your home winemaking questions?
          </p>
          <Link href="/compliance">
            <a
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.625rem 1.25rem",
                borderRadius: "8px",
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.10 0.008 60)",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Ask Ownology
              <ExternalLink size={14} />
            </a>
          </Link>
        </div>
      </div>

      {/* ── Print styles ── */}
      <style>{`
        @media print {
          #home-winery-kit-root { background: white !important; color: black !important; }
          .no-print { display: none !important; }
          .print-only { display: flex !important; }
          h1, h2 { color: black !important; font-family: Georgia, serif !important; }
          p { color: #333 !important; }
        }
        @media screen {
          .print-only { display: none !important; }
        }
      `}</style>
    </div>
  );
}
