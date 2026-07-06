/**
 * RiskBriefing — staff briefing page for the Ownology risk framework.
 *
 * Distinct from /risk-management (which is a public doctrine page for
 * prospects). This is the internal, member-only, staff-training version:
 *   - How to use each tier day-to-day (Quantitative dashboard, Qualitative
 *     one-tap flags, Environmental weather widget)
 *   - What each risk means + what to look for on the floor
 *   - The compliance value (LIP, FSANZ, WHS-adjacent, audit-trail export)
 *
 * Gated: member/admin only via the default-deny wall. Not on any public
 * marketing surface — it's an operational manual for a paying winery's
 * cellar team.
 */
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

const QUANT_ROWS = [
  {
    name: "SO₂ decay in aging vessels",
    fires_when: "Free SO₂ < 25 ppm for reds / < 30 ppm for whites, or > 21 days since last reading in aging vessels.",
    what_to_do: "Sample, calculate molecular SO₂ against current pH, dose within the shift.",
    source: "AWRI Fact Sheet: Sulfur dioxide, use in wine",
  },
  {
    name: "Stuck / sluggish ferment",
    fires_when: "Brix flatlined ≥12 hrs above dryness, or primary_slowing >48 hrs with no movement.",
    what_to_do: "Verify temperature, taste for reduction/off-notes, plan restart (nutrient + rehydrated culture) within 24 hrs.",
    source: "AWRI Fact Sheet: Restarting stuck ferments",
  },
  {
    name: "Ferment temp excursion",
    fires_when: "Reds > 30°C cap temp; whites > 18°C for aromatics, > 20°C for barrel-ferment Chardonnay.",
    what_to_do: "Cool via jacket + shorten cap contact (reds); jacket + reduce yeast nutrient (whites).",
    source: "AWRI Bulletin: Managing red-wine ferment temperature",
  },
  {
    name: "MLF drift / stall",
    fires_when: "Malic > 0.3 g/L after 4 weeks post-inoc, or unresolved decrease trend > 14 days.",
    what_to_do: "Verify cellar temp ≥ 18°C, taste for VA creep, consider re-inoc with a robust ML strain.",
    source: "AWRI Fact Sheet: Malolactic fermentation",
  },
  {
    name: "Silent barrel / tank",
    fires_when: "An aging vessel that hasn't been checked in > 30 days.",
    what_to_do: "Walk the cellar. Taste, check ullage, log the observation to reset the clock.",
    source: "House rule — traceability + tribal knowledge.",
  },
  {
    name: "LIP / compliance drift",
    fires_when: "A LIP-tagged batch missed its scheduled compliance record (SO₂, alcohol, blend %) inside FSANZ Standard 4.5.1 windows.",
    what_to_do: "Record the missed reading; regenerate the LIP audit pack once the value lands.",
    source: "FSANZ Food Standards Code 4.5.1; Wine Australia LIP program.",
  },
  {
    name: "Days-since-check drift",
    fires_when: "Escalating days without a reading on any active-inventory vessel (30, 45, 60 days).",
    what_to_do: "Add to today's walk. Even a nose-check + ullage note is enough to reset.",
    source: "House rule — see /admin/playbook for cadence.",
  },
];

const QUAL_ROWS = [
  {
    name: "Brett (Brettanomyces)",
    look: "Barnyard, band-aid, sweaty leather, horse-stable. Volatile phenols (4-EP, 4-EG). Barrel-aged reds most at risk.",
    then: "Confirm on the palate. Isolate the vessel, tighten SO₂, taste weekly. Escalate to blend/bottling call within 2 weeks.",
    source: "AWRI Fact Sheet: Brettanomyces",
  },
  {
    name: "TCA / cork taint",
    look: "Musty basement, wet cardboard, damp cellar. Even 2-3 ng/L flattens fruit + finish.",
    then: "Never one-off — check adjacent barrels, corks, hoses. Blind bench-taste with two others.",
    source: "AWRI Fact Sheet: 2,4,6-Trichloroanisole",
  },
  {
    name: "Oxidation",
    look: "Colour drift (browning whites / brick reds), sherry / bruised-apple aroma, faded fruit, metallic finish.",
    then: "Check ullage + headspace + last SO₂. Top up, dose SO₂ against pH/molecular target, reduce racking exposure.",
    source: "AWRI Fact Sheet: Oxygen management",
  },
  {
    name: "H₂S / reduction",
    look: "Rotten egg, struck match, burnt rubber, drain. Mid-to-late ferment. Untreated → mercaptan (skunky) → disulfide (garlic).",
    then: "Splash-rack immediately; add DAP if pre-inoc; add Cu (5-10 mg/L) if post-inoc & persistent. Retaste in 24h.",
    source: "AWRI Fact Sheet: Reductive characters in wine",
  },
  {
    name: "Sanitation lapse",
    look: "Visible mould, biofilm on hoses, chalky residue on tank walls, off-clean smell, sticky fittings.",
    then: "Re-clean full cycle: caustic → rinse → citric → rinse → sanitiser → rinse. Log it so downstream issues trace back.",
    source: "AWRI Fact Sheet: Cleaning + sanitation in the winery",
  },
];

const ENV_ROWS = [
  { name: "Humidity high (>75% RH)", why: "Mould on labels + corks, condensation on cool surfaces.", action: "Ventilate cool hours; dehumidifier standby." },
  { name: "Humidity low (<55% RH)", why: "Cork drying → oxygen ingress; angel's-share evaporation.", action: "Introduce moisture; bottles on side." },
  { name: "Temperature high (>18°C)", why: "Oxidation kinetics double every 8°C. Shortens shelf life.", action: "Insulate, close during hot hours, or A/C." },
  { name: "Temperature low (<10°C)", why: "Tartrate precipitation ('wine diamonds') in bottled wine.", action: "Cold-stabilise pre-bottling if exposure is chronic." },
  { name: "Dew-point approach", why: "Ambient DP meeting a cool surface = condensation = mould + label risk.", action: "Close cellar to hot humid air; wipe cool surfaces dry." },
  { name: "Forecast pre-warning (48h)", why: "Early notice so you can prep before the spike hits.", action: "Insulation, standby dehumidifier, move sensitive lots." },
];

const COMPLIANCE_ITEMS = [
  {
    heading: "FSANZ Food Standards Code 4.5.1 — Wine Production Requirements",
    body: "The quantitative engine flags LIP / compliance drift automatically. Every reading you take goes to the audit trail export (/admin at LIP Audit Pack). If a regulator turns up, you generate the PDF in one click — chronological, cited, tamper-evident.",
    audience: "Owner / Head Winemaker",
    glossaryAnchor: "fsanz",
  },
  {
    heading: "Wine Australia LIP (Label Integrity Program)",
    body: "The Cellar Brief engine tags any batch with LIP-declared varieties or regions. Silent-barrel + missed-compliance alerts fire specifically against those tags so you cannot miss a required reading window.",
    audience: "Head Winemaker / Cellar Lead",
    glossaryAnchor: "lip-label-integrity-program",
  },
  {
    heading: "AWRI Technical Review 227 (cellar humidity)",
    body: "The Tier 3 environmental thresholds (55-75% RH ideal) come directly from AWRI TR227. Every environmental alert is defensible — no numbers we made up.",
    audience: "Anyone facing an auditor or importer",
    glossaryAnchor: "awri",
  },
  {
    heading: "OIV / OIV-OENO compendium",
    body: "Tartrate stability + storage temperature thresholds source from OIV. If you export, cite this in your production dossier.",
    audience: "Export-focused wineries",
    glossaryAnchor: "oiv",
  },
  {
    heading: "WHS positioning — deliberately out of scope",
    body: "Ownology does NOT replace Safe Work Australia, AWRI Safety, or state WHS regulators. For chemical handling, confined-space entry, forklift tickets, and JSEA/SWMS documentation, refer to your state regulator + AWRI Safety. Ownology's risk tool covers wine-quality risks only. This is a deliberate scope choice — see /risk-management for the public doctrine.",
    audience: "All staff",
    glossaryAnchor: "whs-work-health-safety",
  },
];

export default function RiskBriefing() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", paddingBottom: "5rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: 0 }}>
          Staff briefing · Ownology risk framework
        </p>
        <h1 style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 5vw, 3rem)", color: HI, margin: "0.75rem 0 1rem", lineHeight: 1.1 }}>
          How we watch a vintage.
        </h1>
        <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MID, lineHeight: 1.65, maxWidth: 720 }}>
          This page is for you — the cellar team. It explains the three tiers of risk Ownology watches, exactly what each alert means when it fires on your screen, and where to find the compliance-audit trail every reading feeds. Bookmark it. Point new hires at it on day one.
        </p>
        <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: LO, lineHeight: 1.55, marginTop: "0.75rem" }}>
          Related surfaces: <Link href="/risk-management" style={{ color: AMBER }}>/risk-management</Link> (public doctrine), <Link href="/risk-glossary" style={{ color: AMBER }}>/risk-glossary</Link> (every term defined, with citations), <Link href="/dashboard" style={{ color: AMBER }}>/dashboard</Link> (live widgets), <Link href="/cellar-brief" style={{ color: AMBER }}>/cellar-brief</Link> (today&rsquo;s cards + one-tap qual flags), <Link href="/admin/playbook" style={{ color: AMBER }}>/admin/playbook</Link> (Daily 10 / Weekly 30 / Vintage-critical cadence).
        </p>

        {/* ═══ Section 1 — Three tiers ═══ */}
        <section style={{ marginTop: "2.75rem" }} data-testid="briefing-three-tiers">
          <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: HI, margin: 0, marginBottom: "0.35rem" }}>
            1 · Three tiers, one framework
          </h2>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, lineHeight: 1.65, marginBottom: "1.25rem" }}>
            Every risk that can cost a barrel falls into one of three families. Each tier has a different <em>who catches it</em>, a different <em>where it lives</em> in the app, and a different <em>what you do next</em>.
          </p>
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <TierRow
              tier="Tier 1"
              color="#059669"
              name="Quantitative"
              tierExplainer={
                "Quantitative = risks you can COUNT.\n\n" +
                "Anything expressed in numbers: SO₂ in ppm, Brix in °Bx, temperature in °C, malic acid in g/L, days since last check. The Cellar Brief engine reads these values from your log and fires an alert the moment they cross a threshold — no operator judgement needed.\n\n" +
                "The word comes from research methodology (quantitative vs qualitative research). It signals: measurable, comparable across batches, auditable."
              }
              who="The system — from lab readings you enter"
              where="/dashboard Cellar Alerts banner + /cellar-brief card status colour"
              example="Tank 2 Brix flatlined 12 hrs above dryness → red alert 'Possible stuck ferment'"
            />
            <TierRow
              tier="Tier 2"
              color="#b45309"
              name="Qualitative"
              tierExplainer={
                "Qualitative = risks you can PERCEIVE but not (easily) measure.\n\n" +
                "No probe catches Brett, TCA, oxidation, H₂S, or a dirty hose — those need a trained nose, palate, and eye. Tier 2 turns each observation into a one-tap record: pick the flag, add a note, submit. Two seconds, permanent audit trail.\n\n" +
                "'Qualitative' comes from the same research-methodology pair as Quantitative. Different mode of knowing, same rigour."
              }
              who="You — nose, palate, sight"
              where="/cellar-brief 🚩 flag button on every vessel card"
              example="Barrel Rack A smells barnyardy during pump-over → tap Brett → 2-second capture"
            />
            <TierRow
              tier="Tier 3"
              color="#1e40af"
              name="Environmental"
              tierExplainer={
                "Environmental = risks the OUTSIDE world imposes on your cellar.\n\n" +
                "Ambient humidity, temperature, dew point, atmospheric pressure — things you don't control but that quietly shape how your wine ages. Streamed live from Open-Meteo, cross-referenced to AWRI TR227 thresholds.\n\n" +
                "Distinct from Occupational Environment (people-safety, covered by Safe Work Australia — deliberately NOT our scope). This tier watches the wine-quality effects only: humidity → mould/condensation, temp → oxidation kinetics, dew point → surface wetness."
              }
              who="The sky — streamed live from local weather"
              where="/dashboard Cellar Environment widget"
              example="Ambient RH 82% + 97% forecast Friday → dehumidifier standby before the spike"
            />
          </div>
        </section>

        {/* ═══ Section 2 — Quantitative reference ═══ */}
        <Section title="2 · Quantitative alerts — what fires + what to do" testId="briefing-quant">
          <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: MID, lineHeight: 1.65, marginBottom: "0.85rem" }}>
            These fire without you asking — the Cellar Brief engine watches your entries in real time. Colour on the vessel card = severity. Every alert has a source citation you can quote to an auditor or a director.
          </p>
          {QUANT_ROWS.map((r) => (
            <RiskRow key={r.name} accent="#059669" name={r.name} left={{ label: "Fires when", text: r.fires_when }} right={{ label: "Do this", text: r.what_to_do }} source={r.source} />
          ))}
        </Section>

        {/* ═══ Section 3 — Qualitative reference ═══ */}
        <Section title="3 · Qualitative flags — what to look for + what to do" testId="briefing-qual">
          <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: MID, lineHeight: 1.65, marginBottom: "0.85rem" }}>
            These need your nose or palate — no probe catches them. When you notice something, one tap on the vessel card captures it forever (audit trail includes both the flag and the resolution note).
          </p>
          {QUAL_ROWS.map((r) => (
            <RiskRow key={r.name} accent="#b45309" name={r.name} left={{ label: "Look for", text: r.look }} right={{ label: "Do this", text: r.then }} source={r.source} />
          ))}
        </Section>

        {/* ═══ Section 4 — Environmental reference ═══ */}
        <Section title="4 · Environmental telemetry — how the weather widget helps" testId="briefing-env">
          <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: MID, lineHeight: 1.65, marginBottom: "0.85rem" }}>
            Live humidity, temperature, dew-point, pressure — streamed from Open-Meteo, cross-referenced against AWRI TR227 thresholds. Founding-Member+ tiers get AI-contextualised advice that names your specific barrels + tanks. All members can log the observation to their vintage log.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "0.6rem" }}>
            {ENV_ROWS.map((r) => (
              <div key={r.name} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: "3px solid #1e40af", borderRadius: 6, padding: "0.7rem 0.85rem" }}>
                <p style={{ fontFamily: SERIF, fontSize: "0.95rem", color: HI, margin: 0 }}>{r.name}</p>
                <p style={{ fontFamily: SANS, fontSize: "0.76rem", color: MID, margin: "0.3rem 0 0", lineHeight: 1.55 }}>
                  <strong style={{ color: HI }}>Why:</strong> {r.why}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.76rem", color: "#1e40af", margin: "0.2rem 0 0", lineHeight: 1.55, fontWeight: 600 }}>
                  → {r.action}
                </p>
              </div>
            ))}
          </div>
        </Section>

        {/* ═══ Section 5 — How to use it day to day ═══ */}
        <Section title="5 · The daily / weekly / vintage rhythm" testId="briefing-rhythm">
          <div style={{ display: "grid", gap: "0.85rem" }}>
            <RhythmRow
              cadence="Daily (Daily 10 · Cellar Brief)"
              actions={[
                "Scan /dashboard alerts banner top-to-bottom. Any red status? Deal first.",
                "Open /cellar-brief. Anything with 🚩 already flagged? Resolve or update.",
                "Walk the cellar. Anything you smell / see, tap the vessel → 🚩 flag → capture.",
                "Glance at the Weather widget. Amber humidity days? Prep ventilation before evening.",
              ]}
            />
            <RhythmRow
              cadence="Weekly (Weekly 30)"
              actions={[
                "Review silent barrels (>30 days since last check). Walk them. Reset the clock.",
                "Full sensory bench on any Tier-2 flagged barrels still unresolved.",
                "Export LIP Audit Pack PDF if you had any regulatory-window entries this week.",
              ]}
            />
            <RhythmRow
              cadence="Vintage-critical (Feb-May Southern Hemisphere)"
              actions={[
                "Environmental widget humidity spikes above 90% during harvest week → active dehumidification.",
                "Ferment temp excursions get high priority — respond before the next log-in.",
                "MLF drift alerts monitored every 3-4 days once inoculated.",
              ]}
            />
          </div>
        </Section>

        {/* ═══ Section 6 — Compliance benefits ═══ */}
        <Section title="6 · Compliance benefits" testId="briefing-compliance">
          <p style={{ fontFamily: SANS, fontSize: "0.88rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>
            Every reading, flag, and environmental log builds a chronological, cited, tamper-evident audit trail. When something goes to court, an importer, or an auditor, you export a PDF in seconds instead of scrambling.
          </p>
          {COMPLIANCE_ITEMS.map((c) => (
            <div key={c.heading} style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${AMBER}`, borderRadius: 6, padding: "0.85rem 1rem", marginBottom: "0.65rem" }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: "0.5rem", alignItems: "baseline", flexWrap: "wrap" }}>
                <h3 style={{ fontFamily: SERIF, fontSize: "1.02rem", color: HI, margin: 0 }}>{c.heading}</h3>
                <span style={{ fontFamily: SANS, fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700 }}>
                  {c.audience}
                </span>
              </div>
              <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: MID, lineHeight: 1.6, margin: "0.4rem 0 0" }}>
                {c.body}
              </p>
              <Link
                href={`/risk-glossary#${c.glossaryAnchor}`}
                data-testid={`compliance-glossary-link-${c.glossaryAnchor}`}
                style={{
                  display: "inline-block",
                  marginTop: "0.5rem",
                  fontFamily: SANS,
                  fontSize: "0.72rem",
                  letterSpacing: "0.06em",
                  color: AMBER,
                  fontWeight: 700,
                  textDecoration: "none",
                }}
              >
                📖 See in glossary →
              </Link>
            </div>
          ))}
          <div style={{ marginTop: "1rem", padding: "0.85rem 1rem", background: RAISED, border: `1px dashed ${AMBER}`, borderRadius: 6 }}>
            <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: HI, margin: 0, lineHeight: 1.55 }}>
              <strong>One-click audit trail:</strong> from <Link href="/admin" style={{ color: AMBER }}>/admin</Link> → LIP Audit Pack. Chronological, PDF, includes every reading + flag + resolution + environmental event for the requested date range. Feed straight to auditors, importers, or your legal team.
            </p>
          </div>
        </Section>

        {/* ═══ Footer ═══ */}
        <div style={{ marginTop: "3rem", padding: "1rem 1.15rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontFamily: SANS, fontSize: "0.8rem", color: LO, lineHeight: 1.6 }}>
          <strong style={{ color: HI }}>Keep this page fresh.</strong> The briefing lives at{" "}
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.4rem", borderRadius: 2, fontSize: "0.75rem", fontFamily: MONO }}>
            client/src/pages/RiskBriefing.tsx
          </code>. When we add a new risk type or citation, this file gets edited and the page updates in the same deploy. Send new hires here on day 1. Bookmark it.
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────
function TierRow({ tier, color, name, tierExplainer, who, where, example }: { tier: string; color: string; name: string; tierExplainer: string; who: string; where: string; example: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `4px solid ${color}`, borderRadius: 6, padding: "0.9rem 1rem" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", flexWrap: "wrap" }}>
        <span style={{ fontFamily: SANS, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color, fontWeight: 700, padding: "0.15rem 0.5rem", background: `color-mix(in oklch, ${color} 15%, transparent)`, borderRadius: 3 }}>
          {tier}
        </span>
        <h3 style={{ fontFamily: SERIF, fontSize: "1.15rem", color: HI, margin: 0, display: "inline-flex", alignItems: "center" }}>
          {name}
          <span
            data-testid={`tier-info-${name.toLowerCase()}`}
            title={tierExplainer}
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 15,
              height: 15,
              borderRadius: "50%",
              border: `1px solid ${color}`,
              background: `color-mix(in oklch, ${color} 12%, transparent)`,
              color,
              fontSize: "0.6rem",
              fontWeight: 700,
              marginLeft: "0.5rem",
              cursor: "help",
              userSelect: "none",
              lineHeight: 1,
              fontFamily: SANS,
            }}
            aria-label={`What ${name} means`}
          >
            i
          </span>
        </h3>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.3rem 0.9rem", marginTop: "0.55rem", fontFamily: SANS, fontSize: "0.82rem", color: MID }}>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.64rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Who</span>
        <span>{who}</span>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.64rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Where</span>
        <span>{where}</span>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.64rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Example</span>
        <span style={{ fontStyle: "italic" }}>{example}</span>
      </div>
    </div>
  );
}

function Section({ title, testId, children }: { title: string; testId: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "2.75rem" }} data-testid={testId}>
      <h2 style={{ fontFamily: SERIF, fontSize: "1.5rem", color: HI, margin: 0, marginBottom: "0.65rem" }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

function RiskRow({ accent, name, left, right, source }: { accent: string; name: string; left: { label: string; text: string }; right: { label: string; text: string }; source: string }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderLeft: `3px solid ${accent}`, borderRadius: 6, padding: "0.85rem 1rem", marginBottom: "0.55rem" }}>
      <h3 style={{ fontFamily: SERIF, fontSize: "1.02rem", color: HI, margin: "0 0 0.4rem" }}>{name}</h3>
      <div style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "0.25rem 0.9rem", fontFamily: SANS, fontSize: "0.8rem", color: MID }}>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.62rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>{left.label}</span>
        <span style={{ lineHeight: 1.55 }}>{left.text}</span>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.62rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>{right.label}</span>
        <span style={{ lineHeight: 1.55, color: HI }}>{right.text}</span>
        <span style={{ color: LO, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.62rem", fontWeight: 700, alignSelf: "start", paddingTop: 3 }}>Source</span>
        <span style={{ color: LO, fontStyle: "italic", fontSize: "0.76rem" }}>{source}</span>
      </div>
    </div>
  );
}

function RhythmRow({ cadence, actions }: { cadence: string; actions: string[] }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "0.85rem 1rem" }}>
      <p style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: 0, marginBottom: "0.5rem" }}>
        {cadence}
      </p>
      <ul style={{ margin: 0, paddingLeft: "1.1rem", fontFamily: SANS, fontSize: "0.85rem", color: MID, lineHeight: 1.6 }}>
        {actions.map((a, i) => (
          <li key={i} style={{ marginBottom: "0.35rem" }}>{a}</li>
        ))}
      </ul>
    </div>
  );
}
