/**
 * HomeWinemakerGlossary
 * ─────────────────────
 * A searchable A–Z glossary of home winemaking and oenology terms.
 * Styled to match the Ownology dark artisan theme.
 */

import { useState, useMemo } from "react";
import { Link } from "wouter";

const SANS = "'Lato', sans-serif";
const SERIF = "'Fraunces', serif";
const MONO = "'Fira Code', monospace";

interface GlossaryTerm {
  term: string;
  definition: string;
  /** Optional unit or typical range */
  unit?: string;
}

const TERMS: GlossaryTerm[] = [
  { term: "Acetaldehyde", definition: "An oxidation by-product that gives wine a bruised apple or sherry-like aroma. Formed when ethanol is oxidised. Bound by SO₂ additions.", unit: "mg/L" },
  { term: "Acidity (Total — TA)", definition: "The sum of all acids in wine, expressed as tartaric acid equivalents. Typical range for finished wine is 5–8 g/L. Low TA wines taste flat; high TA wines taste sharp.", unit: "g/L" },
  { term: "Addition", definition: "Any substance added to must or wine during winemaking — nutrients, SO₂, fining agents, oak products, acid, etc." },
  { term: "Airlock", definition: "A one-way valve fitted to a fermentation vessel that allows CO₂ to escape while preventing oxygen and contaminants from entering." },
  { term: "Alcohol (Ethanol)", definition: "Produced by yeast converting sugar. Each degree Brix at the start of fermentation yields approximately 0.55% ABV. Typical wine range: 11–15% ABV.", unit: "% ABV" },
  { term: "Ascorbic acid", definition: "Vitamin C. Used as an antioxidant at bottling (50–100 mg/L) to scavenge dissolved oxygen. Must always be used with SO₂, never alone." },
  { term: "Baumé (°Bé)", definition: "A measure of sugar concentration in must. 1 °Bé ≈ 1.8 °Brix. Used widely in Australian winemaking.", unit: "°Bé" },
  { term: "Bentonite", definition: "A volcanic clay fining agent used to remove proteins that cause heat haze in white wines. Added at 0.5–2 g/L; bench trial recommended." },
  { term: "Brettanomyces (Brett)", definition: "A spoilage yeast that produces phenolic off-flavours described as barnyard, band-aid, or smoky. Controlled by SO₂ and good cellar hygiene." },
  { term: "Brix (°Bx)", definition: "A measure of dissolved sugar in must or juice. 1 °Brix = 1 g sucrose per 100 g solution. Harvest Brix typically 20–26 °Bx.", unit: "°Bx" },
  { term: "Cap management", definition: "The practice of submerging or breaking up the grape skin cap during red wine fermentation to extract colour, tannin, and flavour. Methods include pump-over, plunging, and rack-and-return." },
  { term: "Carboy", definition: "A large glass or plastic vessel (typically 5–23 L) used for secondary fermentation and wine storage. Also called a demijohn." },
  { term: "Chitosan", definition: "A fining agent derived from crustacean shells (or fungal sources for vegan use). Used in combination with kieselsol to clarify wine." },
  { term: "Cold stabilisation", definition: "Chilling wine to 0–4 °C for 2–3 weeks to precipitate potassium bitartrate (cream of tartar) crystals before bottling." },
  { term: "Cream of tartar", definition: "Potassium bitartrate — a naturally occurring salt that precipitates as harmless crystals in wine, especially at cold temperatures." },
  { term: "DAP (Diammonium phosphate)", definition: "A yeast nutrient providing assimilable nitrogen (YAN). Added at inoculation and/or ⅓ sugar depletion. Typical dose: 0.25–0.5 g/L.", unit: "g/L" },
  { term: "Demijohn", definition: "A large glass vessel (typically 4–25 L) used for secondary fermentation and bulk ageing. Equivalent to a carboy." },
  { term: "Élevage", definition: "French term for the post-fermentation ageing and maturation of wine, including racking, fining, and SO₂ management." },
  { term: "Fermentation (primary)", definition: "The conversion of grape sugars to alcohol and CO₂ by yeast. Typically lasts 7–14 days for reds, 10–21 days for whites." },
  { term: "Fermentation (secondary / malolactic — MLF)", definition: "The bacterial conversion of sharp malic acid to softer lactic acid. Reduces acidity and adds complexity. Common in reds and barrel-fermented whites." },
  { term: "Fermaid-K / Fermaid-O", definition: "Complex yeast nutrient blends providing YAN, vitamins, and minerals. Fermaid-O is organic (yeast hulls); Fermaid-K contains DAP. Staggered additions reduce H₂S risk." },
  { term: "Fining", definition: "Adding a substance (bentonite, egg white, gelatin, kieselsol, chitosan) to wine to remove unwanted compounds by adsorption and settling." },
  { term: "Free SO₂", definition: "The active, protective form of sulphur dioxide in wine. Protects against oxidation and microbial spoilage. Target: 20–35 mg/L (pH-dependent).", unit: "mg/L" },
  { term: "Gross lees", definition: "The coarse sediment of dead yeast cells, grape solids, and tartrates that settles after primary fermentation. Racked off within 1–3 weeks." },
  { term: "Headspace", definition: "The air gap between the wine surface and the vessel closure. Minimise headspace during élevage to reduce oxidation risk." },
  { term: "Hydrogen sulphide (H₂S)", definition: "A rotten egg off-odour caused by yeast nutrient deficiency or reductive conditions. Treated by splash racking and nutrient additions." },
  { term: "Hydrometer", definition: "An instrument that measures the specific gravity (SG) of must or wine to track sugar content and fermentation progress." },
  { term: "Inoculation", definition: "The addition of yeast (or MLF bacteria) to must to initiate fermentation. Yeast is typically rehydrated in warm water (37–40 °C) before pitching." },
  { term: "K-meta (Potassium metabisulfite)", definition: "A powder source of SO₂ used to sanitise equipment and protect wine. 1 g/L of K-meta releases approximately 570 mg/L of SO₂." },
  { term: "Kieselsol", definition: "A silica-based fining agent used in combination with chitosan to clarify wine. Added first; chitosan follows 1 hour later." },
  { term: "Lees", definition: "The sediment of dead yeast cells and grape solids that accumulates at the bottom of a vessel during and after fermentation." },
  { term: "Malolactic fermentation (MLF)", definition: "See Fermentation (secondary / malolactic)." },
  { term: "Metatartaric acid", definition: "A stabilising agent that inhibits tartrate crystal formation. Effective for 12–18 months; degrades over time." },
  { term: "Must", definition: "Freshly crushed grape juice, skins, seeds, and pulp before or during fermentation." },
  { term: "pH", definition: "A measure of acidity on a logarithmic scale. Wine pH typically ranges from 3.0 to 3.8. Lower pH = more acid, better microbial stability, more effective SO₂.", unit: "" },
  { term: "Peristaltic pump / Racking cane", definition: "Tools used to transfer wine between vessels (racking) without disturbing the lees." },
  { term: "Potassium sorbate", definition: "A fermentation inhibitor added at bottling (200 mg/L) to prevent re-fermentation of residual sugar. Always used with SO₂." },
  { term: "Pump-over (remontage)", definition: "Drawing wine from the bottom of a tank and spraying it over the cap to extract colour, tannin, and flavour during red fermentation." },
  { term: "Racking", definition: "Transferring wine from one vessel to another, leaving lees behind. Clarifies wine and can add controlled aeration." },
  { term: "Rehydration (yeast)", definition: "The process of dissolving dried yeast in warm water (37–40 °C) before pitching to ensure maximum viability." },
  { term: "Residual sugar (RS)", definition: "The sugar remaining in wine after fermentation. Dry wine: <4 g/L. Off-dry: 4–12 g/L. Sweet: >45 g/L.", unit: "g/L" },
  { term: "Saignée", definition: "French for 'bleeding' — drawing off a portion of red must juice before fermentation to concentrate the remaining wine and produce a rosé." },
  { term: "Specific gravity (SG)", definition: "The density of must or wine relative to water. Used to track fermentation progress. Starting SG ~1.090–1.110; finished wine ~0.990–0.998." },
  { term: "Sorbate", definition: "See Potassium sorbate." },
  { term: "SO₂ (Sulphur dioxide)", definition: "A preservative and antioxidant used throughout winemaking. Exists as free SO₂ (active) and bound SO₂ (inactive). Target free SO₂: 20–35 mg/L.", unit: "mg/L" },
  { term: "Tannin", definition: "Polyphenolic compounds extracted from grape skins, seeds, and stems (or oak). Provide structure, astringency, and contribute to ageing potential." },
  { term: "Tartaric acid", definition: "The dominant acid in grapes. Added to must to lower pH and increase TA. Typical addition: 1–3 g/L.", unit: "g/L" },
  { term: "Total SO₂", definition: "The sum of free and bound SO₂. Legal limits vary by country and wine style. EU: 150 mg/L (red), 200 mg/L (white/rosé).", unit: "mg/L" },
  { term: "VA (Volatile acidity)", definition: "Primarily acetic acid (vinegar). Acceptable up to 0.8 g/L; above 1.2 g/L is a fault. Caused by Acetobacter or Brett.", unit: "g/L" },
  { term: "Viognier", definition: "A white grape variety often co-fermented with Shiraz to stabilise colour and add aromatic complexity." },
  { term: "Volatile acidity", definition: "See VA." },
  { term: "Wine kit", definition: "A packaged winemaking kit containing concentrated grape juice, yeast, nutrients, fining agents, and instructions. Typically produces 23 L in 4–8 weeks." },
  { term: "YAN (Yeast assimilable nitrogen)", definition: "The nitrogen available to yeast during fermentation. Low YAN (<150 mg/L) causes stuck ferments and H₂S. Target: 200–250 mg/L for high-Brix musts.", unit: "mg/L" },
  { term: "Yeast hulls", definition: "Dead yeast cell walls used as a nutrient supplement and detoxifier during fermentation. Help absorb fatty acids that inhibit yeast." },
];

export default function HomeWinemakerGlossary() {
  const [search, setSearch] = useState("");
  const [activeLetter, setActiveLetter] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let list = TERMS;
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) => t.term.toLowerCase().includes(q) || t.definition.toLowerCase().includes(q)
      );
    }
    if (activeLetter) {
      list = list.filter((t) => t.term[0].toUpperCase() === activeLetter);
    }
    return list.sort((a, b) => a.term.localeCompare(b.term));
  }, [search, activeLetter]);

  const availableLetters = useMemo(() => {
    return Array.from(new Set(TERMS.map((t) => t.term[0].toUpperCase()))).sort();
  }, []);

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
          background: "var(--ow-nav-bg)",
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
          Glossary
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
              color: "var(--ow-amber)",
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
            Winemaking Glossary
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: "var(--ow-text-mid)", maxWidth: "560px" }}>
            Plain-English definitions of oenology and home winemaking terms — from Brix to volatile acidity.
          </p>
        </div>

        {/* Search */}
        <div className="mb-4">
          <input
            type="search"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setActiveLetter(null); }}
            placeholder="Search terms or definitions…"
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
            onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
          />
        </div>

        {/* A–Z filter */}
        {!search.trim() && (
          <div className="flex flex-wrap gap-1.5 mb-6">
            <button
              type="button"
              onClick={() => setActiveLetter(null)}
              style={{
                fontFamily: MONO,
                fontSize: "0.7rem",
                padding: "0.25rem 0.6rem",
                borderRadius: "3px",
                background: !activeLetter ? "var(--ow-amber)" : "var(--ow-bg-inset)",
                border: `1px solid ${!activeLetter ? "var(--ow-amber)" : "var(--ow-border)"}`,
                color: !activeLetter ? "var(--ow-bg-base)" : "var(--ow-text-lo)",
                cursor: "pointer",
              }}
            >
              All
            </button>
            {availableLetters.map((letter) => (
              <button
                key={letter}
                type="button"
                onClick={() => setActiveLetter(activeLetter === letter ? null : letter)}
                style={{
                  fontFamily: MONO,
                  fontSize: "0.7rem",
                  padding: "0.25rem 0.6rem",
                  borderRadius: "3px",
                  background: activeLetter === letter ? "var(--ow-amber)" : "var(--ow-bg-inset)",
                  border: `1px solid ${activeLetter === letter ? "var(--ow-amber)" : "var(--ow-border)"}`,
                  color: activeLetter === letter ? "var(--ow-bg-base)" : "var(--ow-text-lo)",
                  cursor: "pointer",
                }}
              >
                {letter}
              </button>
            ))}
          </div>
        )}

        {/* Term count */}
        <p style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--ow-text-lo)", marginBottom: "1rem", letterSpacing: "0.06em" }}>
          {filtered.length} {filtered.length === 1 ? "term" : "terms"}
        </p>

        {/* Terms list */}
        <div className="flex flex-col gap-0" style={{ borderTop: "1px solid var(--ow-border)" }}>
          {filtered.length === 0 && (
            <p style={{ color: "var(--ow-text-lo)", fontStyle: "italic", textAlign: "center", padding: "2rem 0" }}>
              No terms match your search.
            </p>
          )}
          {filtered.map((term, i) => (
            <div
              key={term.term}
              style={{
                padding: "1rem 0",
                borderBottom: "1px solid var(--ow-border)",
                display: "grid",
                gridTemplateColumns: "1fr 2fr",
                gap: "1rem",
                alignItems: "baseline",
              }}
            >
              <div>
                <p
                  style={{
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: "0.875rem",
                    color: "var(--ow-amber)",
                    lineHeight: 1.3,
                  }}
                >
                  {term.term}
                </p>
                {term.unit !== undefined && term.unit !== "" && (
                  <p style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--ow-text-lo)", marginTop: "0.15rem" }}>
                    {term.unit}
                  </p>
                )}
              </div>
              <p
                style={{
                  fontFamily: SANS,
                  fontSize: "0.8125rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.6,
                }}
              >
                {term.definition}
              </p>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1.25rem",
            background: "var(--ow-bg-raised)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
            borderRadius: "4px",
            textAlign: "center",
          }}
        >
          <p style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.1rem", color: "var(--ow-text-hi)", marginBottom: "0.5rem" }}>
            Want to go deeper?
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "var(--ow-text-mid)", marginBottom: "1rem", lineHeight: 1.6 }}>
            Ask Ownology any winemaking question — from nutrient calculations to troubleshooting off-flavours.
          </p>
          <Link
            href="/free-run"
            style={{
              display: "inline-block",
              padding: "0.6rem 1.5rem",
              background: "var(--ow-amber)",
              color: "var(--ow-bg-base)",
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
