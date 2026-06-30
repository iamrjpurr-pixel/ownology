/**
 * BrandingMockup — visual storyboard of the Settings → Branding flow.
 *
 * NOT a working feature — pure mockup with hardcoded Brokenwood example
 * so Roy can preview the Brand auto-detect + Ownology attribution
 * tier-based controls + sample branded SOP export before committing.
 */
import { Link } from "wouter";

const BRAND = {
  url: "https://brokenwood.com.au",
  title: "Brokenwood Wines",
  logoUrl: "BW", // mock — would be an actual image URL
  primary: "#7A1F2B",   // deep wine rose (would come from node-vibrant)
  secondary: "#D4A574", // warm amber
};

function Card({ children, testId }: { children: React.ReactNode; testId?: string }) {
  return (
    <div
      data-testid={testId}
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border-md)",
        borderRadius: 8,
        padding: "1.5rem",
        marginBottom: "1.25rem",
      }}
    >
      {children}
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0, marginBottom: 10 }}>
      {children}
    </p>
  );
}

function BrandSection() {
  return (
    <Card testId="brand-section">
      <SectionLabel>Your winery brand</SectionLabel>
      <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: 0, marginBottom: 4 }}>
        Detect your branding from your website
      </h3>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.84rem", color: "var(--ow-text-mid)", margin: 0, marginBottom: 14 }}>
        We&apos;ll pull your logo, brand colours, and winery name from your site&apos;s favicon and meta tags. Edit any of it before saving.
      </p>

      {/* URL input */}
      <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
        <input
          type="url"
          defaultValue={BRAND.url}
          style={{ flex: 1, background: "var(--ow-bg-base)", border: "1px solid var(--ow-border-md)", borderRadius: 4, padding: "0.65rem 0.85rem", fontFamily: "'Lato',sans-serif", fontSize: "0.92rem", color: "var(--ow-text-hi)" }}
        />
        <button type="button" style={{ background: "var(--ow-amber)", color: "white", fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", fontWeight: 700, padding: "0.65rem 1.1rem", border: "none", borderRadius: 4, letterSpacing: "0.06em", textTransform: "uppercase", cursor: "default" }}>
          ✦ Detect from URL
        </button>
      </div>

      {/* Result preview */}
      <div style={{ background: "var(--ow-bg-base)", border: "1px dashed color-mix(in oklch, var(--ow-amber) 35%, transparent)", borderRadius: 6, padding: "1rem 1.1rem" }}>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-text-lo)", fontWeight: 600, margin: 0, marginBottom: 12 }}>
          Detected ↓
        </p>
        <div style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          {/* Mock logo circle */}
          <div style={{ width: 56, height: 56, borderRadius: 8, background: BRAND.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "1.2rem", fontFamily: "'Fraunces',serif" }}>
            {BRAND.logoUrl}
          </div>
          <div style={{ flex: 1, minWidth: 180 }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1rem", color: "var(--ow-text-hi)" }}>
              {BRAND.title}
            </div>
            <div style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.72rem", color: "var(--ow-text-lo)", marginTop: 3 }}>
              {BRAND.url}
            </div>
          </div>
          {/* Colour swatches */}
          <div style={{ display: "flex", gap: 8 }}>
            <div title="Primary" style={{ width: 40, height: 40, borderRadius: 4, background: BRAND.primary, border: "1px solid rgba(0,0,0,0.1)" }} />
            <div title="Secondary" style={{ width: 40, height: 40, borderRadius: 4, background: BRAND.secondary, border: "1px solid rgba(0,0,0,0.1)" }} />
          </div>
        </div>
        <div style={{ marginTop: 14, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
          ✓ Logo extracted · ✓ Primary <code style={{ fontFamily: "'Fira Code',monospace", color: BRAND.primary }}>{BRAND.primary}</code> · ✓ Secondary <code style={{ fontFamily: "'Fira Code',monospace", color: BRAND.secondary }}>{BRAND.secondary}</code>
        </div>
      </div>
    </Card>
  );
}

function AttributionSection() {
  const opts = [
    { id: "footer", label: "Show footer + QR code", desc: "Free tier — discreet but visible footer with a scannable QR linking to your free-trial referral", tier: "Free", current: true },
    { id: "mark", label: "Show discreet mark only", desc: "Premium — single-line greyscale credit at page bottom (no QR)", tier: "Premium" },
    { id: "hide", label: "Hide attribution entirely", desc: "Studio tier exclusive — fully white-label exports", tier: "Studio", locked: true },
  ];
  return (
    <Card testId="attribution-section">
      <SectionLabel>Ownology attribution</SectionLabel>
      <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: 0, marginBottom: 4 }}>
        How Ownology appears on your exports
      </h3>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.84rem", color: "var(--ow-text-mid)", margin: 0, marginBottom: 16 }}>
        Every PDF, SOP, and vintage log you export from Ownology can optionally include a small &quot;Made with Ownology&quot; mark.
      </p>

      <div style={{ display: "grid", gap: 10 }}>
        {opts.map((o) => (
          <label
            key={o.id}
            style={{
              display: "flex",
              gap: 12,
              padding: "0.9rem 1rem",
              background: o.current ? "color-mix(in oklch, var(--ow-amber) 8%, var(--ow-bg-base))" : "var(--ow-bg-base)",
              border: `1px solid ${o.current ? "color-mix(in oklch, var(--ow-amber) 50%, transparent)" : "var(--ow-border-md)"}`,
              borderRadius: 6,
              cursor: o.locked ? "not-allowed" : "pointer",
              opacity: o.locked ? 0.55 : 1,
            }}
          >
            <input type="radio" checked={!!o.current} readOnly style={{ marginTop: 4 }} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 3 }}>
                <span style={{ fontFamily: "'Lato',sans-serif", fontWeight: 700, color: "var(--ow-text-hi)", fontSize: "0.92rem" }}>
                  {o.label} {o.locked && "🔒"}
                </span>
                <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700 }}>
                  {o.tier}
                </span>
              </div>
              <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
                {o.desc}
              </div>
            </div>
          </label>
        ))}
      </div>

      {/* The empathy line */}
      <div style={{ marginTop: 14, padding: "0.8rem 1rem", background: "color-mix(in oklch, var(--ow-amber) 8%, var(--ow-bg-base))", borderRadius: 6, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-mid)", fontStyle: "italic", lineHeight: 1.55 }}>
        ⓘ Attribution helps fellow winemakers discover Ownology. Every export with the badge becomes a free referral — and helps keep your subscription affordable.
      </div>
    </Card>
  );
}

function SopExportPreview() {
  return (
    <Card testId="export-preview">
      <SectionLabel>Preview · branded SOP export</SectionLabel>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", margin: 0, marginBottom: 14 }}>
        Here&apos;s how your <strong style={{ color: "var(--ow-text-hi)" }}>SO₂ at the Crush</strong> SOP would look as a printed PDF — uses your detected brand colours, with Free-tier footer + QR code at bottom.
      </p>
      <div style={{ background: "#fdfaf5", borderRadius: 6, border: "1px solid #e9dfd0", overflow: "hidden", color: "#1a1512", padding: "1.5rem 1.8rem", fontFamily: "'Lato',sans-serif" }}>
        {/* Branded header bar */}
        <div style={{ display: "flex", alignItems: "center", gap: 12, paddingBottom: 14, borderBottom: `3px solid ${BRAND.primary}` }}>
          <div style={{ width: 42, height: 42, borderRadius: 4, background: BRAND.primary, display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontFamily: "'Fraunces',serif" }}>
            {BRAND.logoUrl}
          </div>
          <div>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.95rem" }}>{BRAND.title}</div>
            <div style={{ fontSize: "0.7rem", color: "#7a6e57", letterSpacing: "0.05em", textTransform: "uppercase" }}>Cellar Operating Procedure</div>
          </div>
          <div style={{ marginLeft: "auto", fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "#7a6e57" }}>SOP-018 · v2.0</div>
        </div>

        {/* SOP title + content */}
        <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.4rem", margin: "16px 0 6px", color: BRAND.primary }}>
          SO₂ at the Crush
        </h1>
        <p style={{ fontSize: "0.78rem", color: "#7a6e57", margin: 0, marginBottom: 12, letterSpacing: "0.04em", textTransform: "uppercase" }}>
          SO₂ Management · Wine Bible Ch. A2
        </p>
        <p style={{ fontSize: "0.86rem", lineHeight: 1.65, margin: 0, marginBottom: 14 }}>
          <strong style={{ color: BRAND.primary }}>Step 1.</strong> Add 50 ppm potassium metabisulphite as soon as the fruit is crushed. For a 20 L must this is <strong>0.9 g K-meta</strong>; for 100 L, <strong>4.5 g</strong>. Dissolve in cool clean water, mix thoroughly through the must with a sanitised paddle.
        </p>
        <p style={{ fontSize: "0.86rem", lineHeight: 1.65, margin: 0, marginBottom: 14 }}>
          <strong style={{ color: BRAND.primary }}>Step 2.</strong> Allow <strong>4–24 hours</strong> for the SO₂ to bind before adding cultured yeast or enzymes.
        </p>

        {/* Tribal knowledge block — Brokenwood's specific notes */}
        <div style={{ background: `color-mix(in oklch, ${BRAND.secondary} 18%, transparent)`, padding: "0.9rem 1.1rem", borderRadius: 4, marginBottom: 14, borderLeft: `4px solid ${BRAND.secondary}` }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, color: BRAND.primary, margin: 0, marginBottom: 5 }}>
            Brokenwood tribal knowledge
          </p>
          <p style={{ fontSize: "0.82rem", lineHeight: 1.55, margin: 0, color: "#3a3530" }}>
            On Hunter Shiraz, we run 60 ppm at crush (not the textbook 50) — the warm picks consistently show more wild yeast pressure. Source: Iain&apos;s 2019 vintage notes.
          </p>
        </div>

        {/* Free-tier footer with QR */}
        <div style={{ marginTop: 22, paddingTop: 12, borderTop: "1px dashed #d9cfbe", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
          <div style={{ fontSize: "0.72rem", color: "#7a6e57", fontStyle: "italic" }}>
            <strong style={{ color: BRAND.primary, fontStyle: "normal", fontFamily: "'Fraunces',serif" }}>Made with Ownology</strong> · cellar intelligence for working winemakers
            <br />
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", color: "#a39a87" }}>
              ownology.ai/?ref=brokenwood-wines
            </span>
          </div>
          {/* Mock QR */}
          <div style={{ width: 56, height: 56, padding: 4, background: "white", border: "1px solid #d9cfbe", borderRadius: 4, display: "grid", gridTemplateColumns: "repeat(8, 1fr)", gap: 1 }}>
            {Array.from({ length: 64 }).map((_, i) => (
              <div key={i} style={{ background: Math.random() > 0.5 ? "#1a1512" : "transparent" }} />
            ))}
          </div>
        </div>
      </div>

      <p style={{ marginTop: 14, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", lineHeight: 1.55 }}>
        The QR encodes <code style={{ fontFamily: "'Fira Code',monospace", color: "var(--ow-amber)" }}>ownology.ai/?ref=brokenwood-wines&doc=sop-18</code>. When a contractor or auditor scans it, Brokenwood gets a referral credit + you see them in the funnel.
      </p>
    </Card>
  );
}

export default function BrandingMockup() {
  return (
    <div data-testid="branding-mockup-page" style={{ minHeight: "100vh", background: "var(--ow-bg-base)", padding: "3rem 1.5rem 5rem", color: "var(--ow-text-hi)" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, marginBottom: "0.6rem" }}>
          Storyboard · Settings → Branding
        </p>
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.8rem, 4vw, 2.6rem)", fontWeight: 700, lineHeight: 1.08, letterSpacing: "-0.02em", margin: 0, marginBottom: "0.8rem" }}>
          Your winery&apos;s brand on every export.
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", lineHeight: 1.6, color: "var(--ow-text-mid)", maxWidth: 620, marginBottom: "2.2rem" }}>
          Detect your branding from your website in one click. Choose how the Ownology mark appears on the documents you export. Tier-based — same Calendly / Linktree / Notion playbook.
        </p>

        <BrandSection />
        <AttributionSection />
        <SopExportPreview />

        <p style={{ marginTop: "2rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem" }}>
          <Link href="/home" style={{ color: "var(--ow-amber)", fontWeight: 700 }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
