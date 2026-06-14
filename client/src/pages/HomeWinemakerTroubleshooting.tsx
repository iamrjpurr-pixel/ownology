/**
 * HomeWinemakerTroubleshooting
 * ────────────────────────────
 * A static reference page for home winemakers covering common fermentation
 * problems and their remedies. Styled to match the Ownology dark artisan theme.
 */

import { useState } from "react";
import { Link } from "wouter";

const SANS = "'Lato', sans-serif";
const SERIF = "'Fraunces', serif";
const MONO = "'Fira Code', monospace";

interface Issue {
  id: string;
  symptom: string;
  icon: string;
  causes: string[];
  remedies: string[];
  prevention: string;
}

const ISSUES: Issue[] = [
  {
    id: "stuck-ferment",
    symptom: "Stuck or sluggish fermentation",
    icon: "🛑",
    causes: [
      "Yeast nutrient deficiency (low YAN)",
      "Temperature too low (<15 °C) or too high (>35 °C)",
      "High initial sugar (>26 Brix) causing osmotic stress",
      "Yeast pitched into must that was too cold or too warm",
      "Alcohol toxicity in late ferment",
    ],
    remedies: [
      "Warm must to 18–22 °C and maintain stable temperature",
      "Add a rehydrated yeast starter (Fermaid-O or DAP at ⅓ sugar depletion)",
      "Gently stir or pump over to rouse settled yeast",
      "Add a fresh, acclimatised yeast starter (EC-1118 or Lalvin 43) to restart",
      "If SG is below 1.010, consider blending with a healthy fermenting batch",
    ],
    prevention: "Measure YAN before inoculation. Target 200–250 mg/L for high-Brix musts. Pitch yeast at 20–22 °C.",
  },
  {
    id: "h2s",
    symptom: "Hydrogen sulphide (rotten egg smell)",
    icon: "🥚",
    causes: [
      "Yeast nutrient deficiency — sulphur is diverted to amino acid synthesis",
      "Reductive conditions (no pump-overs, no aeration)",
      "Certain yeast strains are more H₂S-prone (e.g., EC-1118)",
      "Excessive SO₂ additions early in ferment",
    ],
    remedies: [
      "Splash rack or pump over vigorously to volatilise H₂S",
      "Add Fermaid-O or DAP to address nutrient deficiency",
      "Add copper sulphate solution (0.5 mg/L Cu²⁺ max) — trial bench first",
      "If persistent, fine with bentonite and rack off lees",
    ],
    prevention: "Use a staggered nutrient addition protocol (at inoculation and ⅓ sugar depletion). Ensure adequate pump-overs.",
  },
  {
    id: "va",
    symptom: "High volatile acidity (vinegar smell / sharp bite)",
    icon: "🍶",
    causes: [
      "Acetobacter contamination (oxygen exposure)",
      "Brettanomyces (Brett) activity",
      "Damaged or split grapes introducing bacteria",
      "Insufficient SO₂ protection",
    ],
    remedies: [
      "Rack immediately and top up vessel to minimise headspace",
      "Add free SO₂ to 30–35 mg/L to inhibit further bacterial activity",
      "If VA is above 1.2 g/L, blending with a low-VA wine is the most practical fix",
      "Reverse osmosis (commercial option) can reduce VA in severe cases",
    ],
    prevention: "Keep free SO₂ above 20 mg/L throughout. Minimise oxygen exposure. Sanitise all equipment thoroughly.",
  },
  {
    id: "brett",
    symptom: "Brettanomyces / Brett (barnyard, band-aid, smoky off-flavours)",
    icon: "🐴",
    causes: [
      "Brettanomyces yeast contamination (often from barrels or equipment)",
      "Low SO₂ levels during élevage",
      "High residual sugar post-ferment",
      "Warm storage temperatures",
    ],
    remedies: [
      "Raise free SO₂ to 40–50 mg/L immediately",
      "Rack off lees and fine with bentonite",
      "If in barrel, consider retiring or steam-sanitising the barrel",
      "Blending can mask low-level Brett but does not eliminate it",
    ],
    prevention: "Maintain free SO₂ above 25 mg/L. Store wine below 15 °C. Sanitise barrels with SO₂ solution between fills.",
  },
  {
    id: "oxidation",
    symptom: "Oxidation (flat, nutty, brown colour, loss of fruit)",
    icon: "🍂",
    causes: [
      "Excessive oxygen exposure during racking or transfers",
      "Insufficient SO₂ protection",
      "Large headspace in vessel",
      "Faulty closures or airlocks",
    ],
    remedies: [
      "Add free SO₂ to target level (20–35 mg/L depending on pH)",
      "Rack under inert gas (CO₂ or argon) if available",
      "Top up vessel to eliminate headspace",
      "Ascorbic acid (50 mg/L) can help scavenge oxygen short-term",
    ],
    prevention: "Always transfer wine under CO₂ blanket. Check airlocks weekly. Keep SO₂ topped up throughout élevage.",
  },
  {
    id: "crystals",
    symptom: "Tartrate crystals in bottle",
    icon: "💎",
    causes: [
      "Wine was not cold-stabilised before bottling",
      "Potassium bitartrate (cream of tartar) precipitating at cold temperatures",
    ],
    remedies: [
      "Crystals are harmless — decant wine before serving",
      "For future batches, cold-stabilise at 0–4 °C for 2–3 weeks before bottling",
    ],
    prevention: "Cold-stabilise wine before bottling. Metatartaric acid (100 mg/L) provides short-term protection but degrades over 12–18 months.",
  },
  {
    id: "re-ferment",
    symptom: "Re-fermentation in bottle (fizzy, cloudy, corks popping)",
    icon: "💥",
    causes: [
      "Residual sugar left in wine at bottling",
      "Potassium sorbate not added (or insufficient dose)",
      "Yeast cells not removed before bottling",
    ],
    remedies: [
      "Refrigerate bottles immediately to slow fermentation",
      "If caught early, open bottles and re-treat with sorbate + K-meta, then re-bottle",
      "Severe cases may require discarding",
    ],
    prevention: "Confirm SG ≤ 0.998 before bottling. Add potassium sorbate (200 mg/L) and K-meta together. Fine and filter if possible.",
  },
  {
    id: "cloudy",
    symptom: "Persistent cloudiness or haze",
    icon: "🌫",
    causes: [
      "Protein haze (especially in white wines)",
      "Pectin haze (from fruit wines or damaged grapes)",
      "Yeast or bacterial haze",
      "Fining agents not added or insufficient",
    ],
    remedies: [
      "Bentonite fining (1–2 g/L) removes protein haze — bench trial first",
      "Pectic enzyme (pectinase) treats pectin haze",
      "Cold crash at 0–4 °C for 1–2 weeks to drop yeast",
      "Kieselsol + chitosan fining kit for general clearing",
    ],
    prevention: "Add bentonite at ferment start for white wines. Use pectic enzyme on fruit wines. Cold crash before bottling.",
  },
];

export default function HomeWinemakerTroubleshooting() {
  const [openId, setOpenId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const filtered = ISSUES.filter((issue) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      issue.symptom.toLowerCase().includes(q) ||
      issue.causes.some((c) => c.toLowerCase().includes(q)) ||
      issue.remedies.some((r) => r.toLowerCase().includes(q))
    );
  });

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        fontFamily: SANS,
      }}
    >
      {/* Nav */}
      <nav
        style={{
          position: "sticky",
          top: 0,
          zIndex: 40,
          background: "oklch(0.11 0.008 60 / 95%)",
          backdropFilter: "blur(8px)",
          borderBottom: "1px solid var(--ow-border)",
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.75rem",
        }}
      >
        <Link
          href="/for-home-winemakers"
          style={{ color: "var(--ow-amber)", fontFamily: MONO, fontSize: "0.75rem", textDecoration: "none", opacity: 0.8 }}
        >
          ← Home Winemakers
        </Link>
        <span style={{ color: "var(--ow-border-md)" }}>·</span>
        <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
          Troubleshooting Guide
        </span>
      </nav>

      <div className="container" style={{ maxWidth: "720px", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
        {/* Hero */}
        <div className="mb-8">
          <p
            style={{
              fontFamily: MONO,
              fontSize: "0.65rem",
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "0.5rem",
            }}
          >
            Home Winemakers · Reference
          </p>
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 4vw, 2.5rem)",
              lineHeight: 1.1,
              color: "var(--ow-text-hi)",
              marginBottom: "0.75rem",
            }}
          >
            Troubleshooting Guide
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: "var(--ow-text-mid)", maxWidth: "560px" }}>
            Common fermentation problems, their causes, and practical remedies for home winemakers and kit wine producers.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search symptoms, causes, or remedies…"
            style={{
              width: "100%",
              padding: "0.75rem 1rem",
              background: "var(--ow-bg-raised)",
              border: "1px solid var(--ow-border-md)",
              borderRadius: "4px",
              color: "var(--ow-text-hi)",
              fontFamily: SANS,
              fontSize: "1rem",
              outline: "none",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
          />
        </div>

        {/* Issues accordion */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 && (
            <p style={{ color: "var(--ow-text-lo)", fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>
              No issues match your search.
            </p>
          )}
          {filtered.map((issue) => {
            const isOpen = openId === issue.id;
            return (
              <div
                key={issue.id}
                style={{
                  background: "var(--ow-bg-raised)",
                  border: `1px solid ${isOpen ? "oklch(0.72 0.12 75 / 40%)" : "var(--ow-border)"}`,
                  borderRadius: "4px",
                  overflow: "hidden",
                }}
              >
                <button
                  type="button"
                  onClick={() => setOpenId(isOpen ? null : issue.id)}
                  className="w-full flex items-center gap-3 text-left px-4 py-3.5"
                  style={{ background: "transparent", border: "none", cursor: "pointer" }}
                >
                  <span style={{ fontSize: "1.25rem", flexShrink: 0 }}>{issue.icon}</span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontWeight: 600,
                      fontSize: "0.9375rem",
                      color: "var(--ow-text-hi)",
                      flex: 1,
                    }}
                  >
                    {issue.symptom}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "0.75rem",
                      color: "var(--ow-amber)",
                      transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
                      transition: "transform 0.2s",
                      flexShrink: 0,
                    }}
                  >
                    ▾
                  </span>
                </button>

                {isOpen && (
                  <div
                    style={{
                      padding: "0 1rem 1.25rem",
                      borderTop: "1px solid var(--ow-border)",
                    }}
                  >
                    <div className="grid md:grid-cols-2 gap-4 mt-4">
                      {/* Causes */}
                      <div>
                        <p
                          style={{
                            fontFamily: MONO,
                            fontSize: "0.65rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "oklch(0.72 0.12 75)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Likely Causes
                        </p>
                        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                          {issue.causes.map((c, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span style={{ color: "oklch(0.72 0.12 75)", flexShrink: 0, marginTop: "0.1rem" }}>·</span>
                              <span style={{ fontFamily: SANS, fontSize: "0.8125rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>{c}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Remedies */}
                      <div>
                        <p
                          style={{
                            fontFamily: MONO,
                            fontSize: "0.65rem",
                            letterSpacing: "0.1em",
                            textTransform: "uppercase",
                            color: "oklch(0.55 0.20 150)",
                            marginBottom: "0.5rem",
                          }}
                        >
                          Remedies
                        </p>
                        <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.4rem", counterReset: "remedy-counter" }}>
                          {issue.remedies.map((r, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span
                                style={{
                                  fontFamily: MONO,
                                  fontSize: "0.65rem",
                                  color: "oklch(0.55 0.20 150)",
                                  flexShrink: 0,
                                  marginTop: "0.15rem",
                                  minWidth: "1rem",
                                }}
                              >
                                {i + 1}.
                              </span>
                              <span style={{ fontFamily: SANS, fontSize: "0.8125rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>{r}</span>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </div>

                    {/* Prevention */}
                    <div
                      style={{
                        marginTop: "1rem",
                        padding: "0.75rem",
                        background: "oklch(0.72 0.12 75 / 6%)",
                        border: "1px solid oklch(0.72 0.12 75 / 18%)",
                        borderRadius: "3px",
                      }}
                    >
                      <p
                        style={{
                          fontFamily: MONO,
                          fontSize: "0.6rem",
                          letterSpacing: "0.1em",
                          textTransform: "uppercase",
                          color: "oklch(0.72 0.12 75)",
                          marginBottom: "0.3rem",
                        }}
                      >
                        Prevention
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: "var(--ow-text-mid)", lineHeight: 1.55 }}>
                        {issue.prevention}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1.25rem",
            background: "var(--ow-bg-raised)",
            border: "1px solid oklch(0.72 0.12 75 / 20%)",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.1rem", color: "var(--ow-text-hi)", marginBottom: "0.5rem" }}>
            Still stuck?
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "var(--ow-text-mid)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Ask Ownology a specific question about your wine — describe the symptoms, your current readings, and what you've tried.
          </p>
          <Link
            href="/free-run"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.5rem",
              background: "oklch(0.72 0.12 75)",
              color: "oklch(0.11 0.008 60)",
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: "0.875rem",
              borderRadius: "3px",
              textDecoration: "none",
            }}
          >
            Ask Ownology →
          </Link>
        </div>
      </div>
    </div>
  );
}
