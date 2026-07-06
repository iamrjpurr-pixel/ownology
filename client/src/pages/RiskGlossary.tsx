/**
 * RiskGlossary — deep-dive definitions of every technical term used in
 * the Ownology risk framework.
 *
 * Where /risk-briefing gives cellar staff the operational playbook, this
 * page is for anyone who wants to understand the vocabulary — usually
 * compliance officers, auditors, importers, new hires with viticulture
 * degrees who want to double-check our definitions match the AWRI /
 * OIV / Wine Australia bibles.
 *
 * Grouped by category then alphabetised within category. Every term has:
 *   - A plain-English one-liner
 *   - A "why it matters" (compliance/operational relevance)
 *   - A source citation the reader can look up independently
 *
 * Member-only under the default-deny gate. Linked from /risk-briefing
 * (the "Related surfaces" strip at the top) so staff can jump between
 * the operational manual and the reference book seamlessly.
 */
import { useEffect } from "react";
import { Link } from "wouter";

const AMBER = "var(--ow-amber)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const BORDER = "var(--ow-border)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'JetBrains Mono', monospace";

interface Term {
  term: string;
  definition: string;
  whyItMatters: string;
  source: string;
  alsoKnownAs?: string;
}

interface Category {
  id: string;
  title: string;
  intro: string;
  accent: string;
  terms: Term[];
}

const CATEGORIES: Category[] = [
  {
    id: "methodology",
    title: "1 · Methodology terms — how we classify a risk",
    intro:
      "These describe the family a risk belongs to, not the risk itself. Getting these three straight is what makes the whole framework coherent.",
    accent: "#4a5568",
    terms: [
      {
        term: "Quantitative",
        definition:
          "A risk you can COUNT. Expressed as a number: parts per million (ppm), grams per litre (g/L), degrees Brix (°Bx), degrees Celsius (°C), days elapsed.",
        whyItMatters:
          "Because it's numeric, it's comparable across batches, vintages, and wineries. It's also auditable — a regulator or importer can verify the reading against your logbook without needing to taste anything.",
        source: "Research methodology, e.g. Creswell (2014) 'Research Design'. Standard usage in AWRI + OIV literature.",
      },
      {
        term: "Qualitative",
        definition:
          "A risk you PERCEIVE but cannot readily measure with a probe. Requires trained sensory judgement — nose, palate, sight — and is captured as a categorical flag with an optional note.",
        whyItMatters:
          "Some of the most costly wine faults (Brett, TCA, oxidation) don't reliably appear on an instrument until after they've compromised the wine. Qualitative flags catch them earlier — the winemaker's nose is often the first sensor to trip.",
        source: "Research methodology, e.g. Creswell (2014). Sensory-analysis usage per Meilgaard, Civille & Carr, 'Sensory Evaluation Techniques' (5th ed.).",
      },
      {
        term: "Environmental (in Ownology's framework)",
        definition:
          "A wine-quality risk imposed by the ambient physical environment — humidity, temperature, dew point, atmospheric pressure. Distinct from 'occupational environment' (WHS) or 'sustainability environment' (viticulture).",
        whyItMatters:
          "You don't control the weather, but you do control the cellar's exposure to it. Tier 3 gives you 48h lead time so ventilation, insulation, and dehumidification can happen before a spike hits your barrels.",
        source: "AWRI Technical Review 227 (2017) on cellar humidity; AWRI Bulletin 2019 on wine storage temperature. OIV Compendium on tartrate stability.",
      },
      {
        term: "Tier (Tier 1 / Tier 2 / Tier 3)",
        definition:
          "Ownology's shorthand for the three risk families above, ordered by how the alert reaches you: system → operator → environment. Not a hierarchy of importance — a Tier 3 humidity spike can cost you a barrel just as fast as a Tier 1 stuck ferment.",
        whyItMatters:
          "Naming the tier on every card teaches new staff where to LOOK for the alert (Dashboard banner vs Cellar Brief flag vs Weather widget) — critical during a busy vintage.",
        source: "House convention. See /risk-briefing Section 1.",
      },
    ],
  },
  {
    id: "quant-terms",
    title: "2 · Quantitative vocabulary — what the numbers mean",
    intro:
      "These are the specific measurements the Cellar Brief engine watches. Each one has an established science and a wine-industry standard for how to record it.",
    accent: "#059669",
    terms: [
      {
        term: "Brix (°Bx)",
        definition:
          "A percentage-by-weight of sucrose in a solution, historically measured with a hydrometer or now with a refractometer. In wine, it's used loosely for total soluble solids — mostly glucose + fructose — during ferment.",
        whyItMatters:
          "Watching Brix drop from ~24°Bx (harvest) to ~0°Bx (dryness) is how we track ferment progress. A flatline above dryness for 12+ hours = alert 'possible stuck ferment' (Tier 1).",
        source: "AWRI Fact Sheet: Fermentation. OIV Compendium of International Methods of Analysis of Wine and Must.",
        alsoKnownAs: "Sometimes reported as Baumé (°Bé) in older Australian records — 1°Bé ≈ 1.8°Bx.",
      },
      {
        term: "Free SO₂ / Molecular SO₂ / Total SO₂",
        definition:
          "Sulfur dioxide added to wine as a preservative. FREE SO₂ = the reactive fraction available to bind O₂ and inhibit microbes. MOLECULAR SO₂ = the tiny fraction that actively kills microbes (pH-dependent). TOTAL SO₂ = free + bound (bound = already reacted with acetaldehyde etc).",
        whyItMatters:
          "Regulatory limits (Wine Australia + EU + US TTB) are on TOTAL SO₂. Sensory / antimicrobial protection is on MOLECULAR SO₂. Ownology flags aging vessels below the free SO₂ target for their colour/pH class.",
        source: "AWRI Fact Sheet: Sulfur dioxide, use in wine. FSANZ Food Standards Code Standard 1.3.1 (permitted preservatives).",
      },
      {
        term: "Malic acid",
        definition:
          "One of the two dominant grape acids (the other is tartaric). Tastes sharp / green-apple. Present at 2-6 g/L in must, higher in cool-climate fruit.",
        whyItMatters:
          "In Malolactic Fermentation (MLF), lactic bacteria convert malic → lactic acid (softer, creamier). Ownology's MLF-drift alert fires when malic stays > 0.3 g/L four weeks after inoculation — a signal the ML strain didn't establish.",
        source: "AWRI Fact Sheet: Malolactic fermentation. OIV Method: Enzymatic determination of L-malic acid.",
      },
      {
        term: "MLF (Malolactic Fermentation)",
        definition:
          "A secondary bacterial fermentation (typically Oenococcus oeni) that converts sharp malic acid into softer lactic acid + CO₂. Universal for reds; a stylistic choice for whites.",
        whyItMatters:
          "Wines destined for bottle before MLF is complete can spontaneously start it in-bottle → cloudy, fizzy, off-styles. Tier 1 tracks stall/drift; Tier 2 catches sensory red flags (VA creep, mousiness) that instruments miss.",
        source: "AWRI Fact Sheet: Malolactic fermentation. Wine Australia MLF technical guide.",
      },
      {
        term: "pH (in wine)",
        definition:
          "The negative log of hydrogen-ion concentration. Wine pH runs 3.0-3.8 typically. Lower = more acidic. It determines Molecular SO₂ effectiveness, colour extraction, and microbial stability.",
        whyItMatters:
          "Two wines at 40 ppm free SO₂ but different pH (3.2 vs 3.7) have wildly different microbial protection. Ownology's SO₂-decay alert scales the threshold to the vessel's current pH.",
        source: "AWRI Bulletin: Understanding wine pH. Iland et al., 'Chemical Analysis of Grapes and Wine' (2004).",
      },
      {
        term: "YAN (Yeast Assimilable Nitrogen)",
        definition:
          "The pool of nitrogen (ammonia + α-amino acids) yeast can actually consume during ferment. Measured in mg N/L. Ideal 200-350 depending on Brix.",
        whyItMatters:
          "Low YAN = sluggish ferment + H₂S / reduction risk (Tier 2 flag). Ownology's ferment-nutrition workflow tracks YAN targets against varietal-specific benchmarks.",
        source: "AWRI Fact Sheet: Nitrogen management in wine.",
      },
      {
        term: "DAP (Diammonium Phosphate)",
        definition:
          "The most common nitrogen supplement for winemaking. Formula (NH₄)₂HPO₄. Adds ~200 mg N/L per gram/L of DAP.",
        whyItMatters:
          "The go-to fix when YAN is low or an H₂S sniff appears. Ownology's Quick Entry offers DAP addition as a 1-tap event that logs quantity + timing.",
        source: "AWRI Fact Sheet: Nitrogen management in wine.",
      },
      {
        term: "VA (Volatile Acidity)",
        definition:
          "Mainly acetic acid + ethyl acetate — the vinegar / nail-polish smell. Measured in g/L acetic. Elevated by acetobacter or lactic-bacteria stress.",
        whyItMatters:
          "Wine Australia + FSANZ set a legal ceiling (typically 1.2 g/L). Ownology flags creeping VA as an early Tier 2 sensory cue before it hits a lab-confirmed number.",
        source: "AWRI Fact Sheet: Volatile acidity. FSANZ Food Standards Code 4.5.1.",
      },
    ],
  },
  {
    id: "qual-terms",
    title: "3 · Qualitative vocabulary — the fault glossary",
    intro:
      "Every one of these has a distinctive sensory signature. Learning them by nose + palate is what separates 'someone who works in a cellar' from 'a winemaker'.",
    accent: "#b45309",
    terms: [
      {
        term: "Brett (Brettanomyces)",
        definition:
          "A spoilage yeast (Brettanomyces bruxellensis) that thrives in barrel-aged reds. Produces volatile phenols (4-ethylphenol, 4-ethylguaiacol) with barnyard / band-aid / horse-stable aromas.",
        whyItMatters:
          "Low levels can add complexity — 'controversial character'. High levels destroy fruit expression and mark a wine as flawed to WSET-trained palates.",
        source: "AWRI Fact Sheet: Brettanomyces. Chatonnet et al., 'Différenciation des caractères...' J. Sci. Food Agric. 1992.",
      },
      {
        term: "TCA (2,4,6-Trichloroanisole)",
        definition:
          "A haloanisole compound that produces the classic 'corked' smell — wet cardboard, musty basement, damp attic. Sensory threshold 2-6 ng/L (parts per trillion).",
        whyItMatters:
          "Even below your personal threshold, TCA flattens fruit and finish. Contamination sources include chlorine-cleaned corks, contaminated timber, and cardboard packaging near barrels.",
        source: "AWRI Fact Sheet: 2,4,6-Trichloroanisole (TCA) and related off-flavours.",
      },
      {
        term: "Oxidation (as a fault)",
        definition:
          "Chemical degradation of a wine's colour + aromatics from excessive O₂ exposure. Colour drifts (whites → gold/brown, reds → brick), fruit fades, sherry / bruised-apple notes appear.",
        whyItMatters:
          "Every racking, sample, top-up is an O₂ event. Cumulative exposure matters. Ownology's Tier 1 SO₂ alerts + Tier 2 oxidation flag work together — the reading + the nose confirm each other.",
        source: "AWRI Fact Sheet: Oxygen management in wine.",
      },
      {
        term: "H₂S (Hydrogen sulfide / reduction)",
        definition:
          "The rotten-egg / struck-match smell during ferment. Produced by stressed yeast when nutrition (nitrogen) is inadequate or sulfur assimilation misfires.",
        whyItMatters:
          "If untreated it evolves into mercaptans (skunky) then disulfides (garlic/onion) — the last two are much harder to reverse. Cu additions can strip disulfides but at a lees-cost. Splash-rack + DAP handles most cases if caught during ferment.",
        source: "AWRI Fact Sheet: Reductive characters in wine.",
      },
      {
        term: "Sanitation lapse",
        definition:
          "Any interruption or omission in the clean-in-place cycle (caustic → rinse → citric → rinse → sanitiser → rinse) between vessel uses. Signs: biofilm on hoses, chalky tank residue, off-clean smell.",
        whyItMatters:
          "A single missed sanitation cycle can cross-contaminate the entire next batch through the hose or pump manifold. Traceability requires the observation logged so downstream faults can trace back.",
        source: "AWRI Fact Sheet: Cleaning and sanitation in the winery.",
      },
    ],
  },
  {
    id: "env-terms",
    title: "4 · Environmental vocabulary — the ambient science",
    intro:
      "The Tier 3 thresholds are numbers pulled from AWRI + OIV literature. Understanding what they mean makes the alert self-explanatory.",
    accent: "#1e40af",
    terms: [
      {
        term: "Relative humidity (RH %)",
        definition:
          "The percentage of water vapour in air, relative to the maximum that air could hold at the current temperature. 100% RH = saturated → condensation forms on any surface at or below the dew point.",
        whyItMatters:
          "AWRI TR227 identifies 70-75% as the ideal cellar band. Above ~80% mould forms on labels + corks; below 55% corks dry and let O₂ in.",
        source: "AWRI Technical Review 227 (2017): Cellar humidity considerations for bottled wine storage.",
      },
      {
        term: "Dew point (°C)",
        definition:
          "The temperature at which the current air's water vapour would begin to condense out. If ambient dew point >= surface temp of a cool tank / barrel, water condenses on that surface immediately.",
        whyItMatters:
          "Dew point rising close to your cellar temp is a stealthy risk — RH % might not look scary but a cool barrel head will still get wet. Ownology's Tier 3 dew-point-approach alert catches this.",
        source: "Bureau of Meteorology definitions. AWRI TR227 cellar-condensation guidance.",
      },
      {
        term: "Barometric pressure (hPa)",
        definition:
          "Atmospheric pressure, measured in hectopascals. Standard sea-level is 1013 hPa. High-pressure systems (>1020) bring stable dry weather; low pressure (<1005) brings storms and rapid humidity swings.",
        whyItMatters:
          "Pressure isn't a direct wine risk but it's a leading indicator of humidity + temperature swings coming your way. Displayed on the widget for context.",
        source: "Bureau of Meteorology / OIV general meteorology references.",
      },
      {
        term: "Tartrate precipitation ('wine diamonds')",
        definition:
          "Potassium bitartrate crystals that fall out of solution when a wine is exposed to sub-10°C temperatures. Harmless but visually alarming to end-consumers.",
        whyItMatters:
          "If your cellar drops below 10°C ambient during winter — common for boutique wineries without climate control — the bottled wine downstream may throw diamonds. Cold-stabilisation pre-bottling is the prevention.",
        source: "AWRI Fact Sheet: Tartrate stability. OIV Compendium (Tartrate stability tests).",
      },
      {
        term: "Ideal storage temperature",
        definition:
          "The AWRI-cited range for bottled wine: 10-15°C constant. Every 8°C rise roughly doubles the rate of oxidation kinetics — so a wine at 22°C ages twice as fast as at 14°C.",
        whyItMatters:
          "Tier 3 warns when ambient exceeds 18°C. That's not 'immediately damaging' — it's 'your product life is quietly shortening'. Insulation / A/C during hot windows preserves quality.",
        source: "AWRI Bulletin: Wine storage temperature. Robinson et al., 'The Oxford Companion to Wine' 4th ed.",
      },
    ],
  },
  {
    id: "compliance-terms",
    title: "5 · Compliance + regulatory vocabulary",
    intro:
      "These are the acronyms that show up on labels, in audit reports, and in export dossiers. If you're the person who answers importer or auditor emails, live in this section.",
    accent: "var(--ow-amber)",
    terms: [
      {
        term: "AWRI",
        definition:
          "Australian Wine Research Institute — the national R&D body for Australian wine. Publishes Fact Sheets, Bulletins, Technical Reviews (TR###) that are the de-facto reference for AU cellar practice.",
        whyItMatters:
          "Every quantitative threshold in Ownology cites an AWRI source. If an auditor questions a number, you can point them at a specific AWRI Fact Sheet by name.",
        source: "awri.com.au",
      },
      {
        term: "OIV",
        definition:
          "Organisation Internationale de la Vigne et du Vin — the intergovernmental body that publishes international wine analysis methods + reference thresholds. Australia is a member state.",
        whyItMatters:
          "Export dossiers to EU importers must reference OIV methods. Ownology's tartrate + storage-temp citations come from OIV Compendium.",
        source: "oiv.int",
      },
      {
        term: "FSANZ",
        definition:
          "Food Standards Australia New Zealand — the joint regulator that publishes the Food Standards Code. Standard 4.5.1 (Wine Production Requirements) is the core wine-specific chapter.",
        whyItMatters:
          "The audit trail Ownology builds — every reading, every flag, every environmental event — feeds directly into evidence for FSANZ 4.5.1 compliance. One-click PDF at /admin → LIP Audit Pack.",
        source: "foodstandards.gov.au — Food Standards Code Standard 4.5.1.",
      },
      {
        term: "LIP (Label Integrity Program)",
        definition:
          "The Wine Australia programme that requires wineries to substantiate label claims (variety %, region %, vintage %) via a documented paper trail from grape delivery to bottle.",
        whyItMatters:
          "LIP-tagged batches are treated with elevated priority by Ownology — every FSANZ reading window, every silent-barrel alert, fires against LIP tags specifically so nothing is missed.",
        source: "wineaustralia.com — Label Integrity Program.",
      },
      {
        term: "WHS (Work Health & Safety)",
        definition:
          "Safe Work Australia's national framework for workplace safety — covers chemical handling, confined-space entry, forklift tickets, JSEA/SWMS documentation.",
        whyItMatters:
          "Explicitly OUT of Ownology's scope. We watch wine-quality risks, not people-safety risks. For WHS, refer to Safe Work Australia + your state regulator + AWRI Safety. This scope choice is deliberate.",
        source: "safeworkaustralia.gov.au. State variants: WorkSafe NSW / WorkSafe Vic / SafeWork SA etc.",
      },
      {
        term: "JSEA / SWMS",
        definition:
          "Job Safety & Environmental Analysis (JSEA) or Safe Work Method Statement (SWMS) — written procedures documenting the safety controls for a specific task (e.g. barrel handling, SO₂ addition).",
        whyItMatters:
          "Required by WHS legislation for high-risk construction work + increasingly demanded by winery insurance policies. Long-term Ownology v2 vision is to help GENERATE these documents from your asset registry — see /todo (JSEA / SWMS on-demand generator).",
        source: "Safe Work Australia model Code of Practice: Construction Work.",
      },
      {
        term: "Audit trail",
        definition:
          "A chronological, tamper-evident record of every reading, decision, and event on a batch. When a regulator, importer, or lawyer asks 'what happened?' the audit trail answers.",
        whyItMatters:
          "This is Ownology's core compliance value proposition. Every input feeds one audit trail — flags, environmental events, quantitative readings, resolution notes. PDF export at /admin → LIP Audit Pack.",
        source: "Standard concept, formalised in ISO 27001 + FSANZ traceability rules.",
      },
    ],
  },
];

export default function RiskGlossary() {
  // Wouter (SPA client-side routing) doesn't auto-scroll to URL hashes the
  // way the browser does on a full page load. If the user arrives from
  // /risk-briefing → /risk-glossary#lip-... via a client-side Link, we
  // need to manually scroll to the target on mount + when the hash changes.
  useEffect(() => {
    const scrollToHash = () => {
      const hash = window.location.hash.replace(/^#/, "");
      if (!hash) return;
      const el = document.getElementById(hash);
      if (el) {
        // Small delay lets the layout settle before scrolling.
        setTimeout(() => el.scrollIntoView({ behavior: "smooth", block: "start" }), 60);
      }
    };
    scrollToHash();
    window.addEventListener("hashchange", scrollToHash);
    return () => window.removeEventListener("hashchange", scrollToHash);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", paddingBottom: "5rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: 0 }}>
          Reference · Ownology risk glossary
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 5vw, 3rem)", color: HI, margin: "0.75rem 0 1rem", lineHeight: 1.1 }}>
          Every term, defined.
        </h1>
        <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MID, lineHeight: 1.65, maxWidth: 720 }}>
          This is the reference book behind <Link href="/risk-briefing" style={{ color: AMBER }}>/risk-briefing</Link>. Every technical term that appears anywhere in the risk framework — the categorical labels (Quantitative / Qualitative / Environmental), the chemical names (Brix, MLF, VA), the regulatory acronyms (LIP, FSANZ, WHS) — is defined here with a plain-English one-liner, a &lsquo;why it matters&rsquo; note, and a source citation you can look up independently.
        </p>
        <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: LO, lineHeight: 1.55, marginTop: "0.75rem" }}>
          Written for anyone who wants to double-check the science: cellar staff, compliance officers, auditors, importers, new hires with WSET / viticulture backgrounds, curious investors. Use browser find (Ctrl/⌘-F) to jump to any term.
        </p>

        {/* ── Anchor navigation ── */}
        <nav
          data-testid="glossary-nav"
          style={{ marginTop: "1.75rem", padding: "0.85rem 1rem", background: RAISED, border: `1px solid ${BORDER}`, borderRadius: 6 }}
        >
          <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>
            Jump to category
          </p>
          <ul style={{ margin: "0.55rem 0 0", padding: 0, listStyle: "none", display: "flex", flexWrap: "wrap", gap: "0.5rem 0.85rem" }}>
            {CATEGORIES.map((c) => (
              <li key={c.id}>
                <a href={`#${c.id}`} style={{ fontFamily: SANS, fontSize: "0.85rem", color: AMBER, textDecoration: "none" }}>
                  {c.title.replace(/^\d+ · /, "")}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        {/* ── Category sections ── */}
        {CATEGORIES.map((cat) => (
          <section key={cat.id} id={cat.id} style={{ marginTop: "2.75rem" }} data-testid={`glossary-${cat.id}`}>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: HI, margin: 0, marginBottom: "0.35rem" }}>
              {cat.title}
            </h2>
            <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: MID, lineHeight: 1.65, marginBottom: "1.25rem", maxWidth: 680 }}>
              {cat.intro}
            </p>
            <div style={{ display: "grid", gap: "0.7rem" }}>
              {cat.terms.map((t) => {
                const slug = t.term
                  .replace(/[^A-Za-z0-9]+/g, "-")
                  .replace(/^-|-$/g, "")
                  .toLowerCase();
                return (
                <article
                  key={t.term}
                  id={slug}
                  data-testid={`glossary-term-${slug}`}
                  style={{
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderLeft: `3px solid ${cat.accent}`,
                    borderRadius: 6,
                    padding: "0.85rem 1rem",
                    scrollMarginTop: "1.5rem",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                    <h3 style={{ fontFamily: SERIF, fontSize: "1.1rem", color: HI, margin: 0 }}>{t.term}</h3>
                    {t.alsoKnownAs && (
                      <span style={{ fontFamily: SANS, fontSize: "0.7rem", color: LO, fontStyle: "italic" }}>
                        Also: {t.alsoKnownAs}
                      </span>
                    )}
                  </div>
                  <p style={{ fontFamily: SANS, fontSize: "0.86rem", color: HI, lineHeight: 1.6, margin: "0.4rem 0 0" }}>
                    {t.definition}
                  </p>
                  <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, lineHeight: 1.6, margin: "0.4rem 0 0" }}>
                    <strong style={{ color: cat.accent }}>Why it matters:</strong> {t.whyItMatters}
                  </p>
                  <p style={{ fontFamily: MONO, fontSize: "0.7rem", color: LO, margin: "0.5rem 0 0" }}>
                    Source: {t.source}
                  </p>
                </article>
                );
              })}
            </div>
          </section>
        ))}

        {/* ── Footer / cross-links ── */}
        <div style={{ marginTop: "3rem", padding: "1rem 1.15rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: SANS, fontSize: "0.85rem", color: MID, lineHeight: 1.6 }}>
          <strong style={{ color: HI }}>Next stops</strong> — see how these terms show up in practice:
          <ul style={{ margin: "0.55rem 0 0", paddingLeft: "1.15rem" }}>
            <li style={{ marginBottom: "0.3rem" }}>
              <Link href="/risk-briefing" style={{ color: AMBER }}>/risk-briefing</Link> — the operational staff manual (what fires, what to do)
            </li>
            <li style={{ marginBottom: "0.3rem" }}>
              <Link href="/risk-management" style={{ color: AMBER }}>/risk-management</Link> — the public doctrine we show prospects
            </li>
            <li style={{ marginBottom: "0.3rem" }}>
              <Link href="/dashboard" style={{ color: AMBER }}>/dashboard</Link> — the live widgets that use every term above
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
