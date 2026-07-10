/**
 * /home-v2 — mockup of the proposed home-page re-order.
 *
 * Purpose: let Rich see the new information architecture side-by-side with
 * the live /home before committing to a full swap. This page is intentionally
 * a leaner sketch — sections are representative, not final. Copy is placeholder.
 *
 * Design principles applied (from the human-factors review):
 *   1. HERO does the audience self-sort in one click (two CTAs)
 *   2. PROGRESSIVE DISCLOSURE — plain language → jargon (later)
 *   3. TWO DOORS labelled clearly so each audience feels welcome
 *   4. TECHNICAL DEPTH pushed below the two-door split so amateurs don't bounce
 *   5. FOUR-PILLAR GRID moved to zone 6 (summary, not intro)
 *
 * When Rich approves, we port this ordering into Home.tsx surgically.
 */
import { Link } from "wouter";

export default function HomeV2() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", color: "var(--ow-text-hi)" }}>
      {/* Preview banner so Rich never mistakes this for prod */}
      <div
        data-testid="v2-preview-banner"
        style={{
          background: "var(--ow-amber)",
          color: "oklch(0.10 0.008 60)",
          padding: "0.5rem 1rem",
          textAlign: "center",
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.7rem",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          fontWeight: 700,
        }}
      >
        Mockup · Home v2 · Not live · Compare to <a href="/home" style={{ color: "inherit", textDecoration: "underline" }}>/home</a>
      </div>

      {/* ── Zone 1: HERO — audience self-sort ────────────────────────── */}
      <section style={{ padding: "clamp(3rem, 8vw, 6rem) 1.25rem 3.5rem", maxWidth: 1000, margin: "0 auto", textAlign: "center" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "1rem" }}>
          Ownology · Est. 2026 · Meet Owen
        </p>
        <h1
          data-testid="v2-hero-headline"
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "clamp(2.25rem, 6vw, 3.75rem)",
            lineHeight: 1.05,
            margin: 0,
            letterSpacing: "-0.01em",
            maxWidth: 900,
            marginInline: "auto",
          }}
        >
          Owen is the apprentice
          <br />
          who <span style={{ color: "var(--ow-amber)" }}>never leaves the cellar</span>.
        </h1>
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "clamp(1rem, 1.6vw, 1.2rem)",
            lineHeight: 1.65,
            color: "var(--ow-text-mid)",
            marginTop: "1.5rem",
            maxWidth: 640,
            marginInline: "auto",
          }}
        >
          Read every wine book. Answers in seconds. Free to ask —
          professional-grade if you make it for a living.
        </p>

        {/* The audience self-sort — Owen-first CTAs */}
        <div className="flex flex-wrap justify-center gap-4 mt-10" data-testid="v2-hero-cta-row">
          <Link
            href="/ask"
            data-testid="v2-cta-curious"
            style={{
              padding: "1rem 2rem",
              background: "var(--ow-bg-card)",
              color: "var(--ow-text-hi)",
              border: "1.5px solid var(--ow-border)",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontSize: "1rem",
              textDecoration: "none",
              minWidth: 260,
              textAlign: "center",
              fontWeight: 500,
            }}
          >
            <span style={{ display: "block", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              For the curious
            </span>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem" }}>
              Ask Owen a question →
            </span>
          </Link>
          <Link
            href="/join"
            data-testid="v2-cta-pro"
            style={{
              padding: "1rem 2rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "1.5px solid var(--ow-amber)",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontSize: "1rem",
              textDecoration: "none",
              minWidth: 260,
              textAlign: "center",
              fontWeight: 700,
            }}
          >
            <span style={{ display: "block", fontSize: "0.7rem", opacity: 0.7, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.35rem" }}>
              For professionals
            </span>
            <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem" }}>
              Hire Owen for your cellar →
            </span>
          </Link>
        </div>
      </section>

      {/* ── Zone 2: Trust chip strip ─────────────────────────────────── */}
      <section
        style={{
          borderTop: "1px solid var(--ow-border)",
          borderBottom: "1px solid var(--ow-border)",
          padding: "1.25rem 1rem",
          background: "var(--ow-bg-card)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", flexWrap: "wrap", justifyContent: "center", gap: "1.5rem 2.5rem", fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
          <span>🇦🇺 Australian-built</span>
          <span>Wine Australia LIP-audit ready</span>
          <span>APCO Assistant · 31 March deadline</span>
          <span>Founding cohort · 99 partners</span>
        </div>
      </section>

      {/* ── Zone 3: The Free Run door (DIY-friendly, warm) ────────────── */}
      <section
        style={{
          padding: "4rem 1.25rem",
          maxWidth: 1000,
          margin: "0 auto",
        }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: "3rem", alignItems: "center" }} className="v2-two-col">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
              Door #1 · Free Run · For anyone curious about wine
            </p>
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: 0, lineHeight: 1.15 }}>
              Ask Owen anything.
              <br />
              Free, forever.
            </h2>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", color: "var(--ow-text-mid)", lineHeight: 1.7, marginTop: "1rem" }}>
              Curious what MLF actually means? Wondering why one Grenache smells like strawberries and another like leather? Ownology's answer engine is grounded in industry-standard oenology references — free to ask, no signup, every answer saved to a public journal for the next curious drinker.
            </p>
            <Link
              href="/ask"
              data-testid="v2-zone3-cta"
              style={{
                display: "inline-block",
                marginTop: "1.5rem",
                padding: "0.75rem 1.5rem",
                background: "var(--ow-bg-card)",
                color: "var(--ow-text-hi)",
                border: "1px solid var(--ow-border)",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 500,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              Ask a question →
            </Link>
          </div>
          {/* DIY-friendly example query card */}
          <div
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 8,
              padding: "1.5rem",
              fontFamily: "'Lato',sans-serif",
            }}
          >
            <p style={{ fontSize: "0.7rem", color: "var(--ow-amber)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "0.75rem", fontWeight: 700 }}>
              Example
            </p>
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "var(--ow-text-hi)", lineHeight: 1.4, margin: 0, fontStyle: "italic" }}>
              "What's the difference between malolactic fermentation and regular fermentation, and why does it make Chardonnay taste buttery?"
            </p>
            <p style={{ fontSize: "0.85rem", color: "var(--ow-text-mid)", lineHeight: 1.7, marginTop: "1rem" }}>
              Owen answers in plain English first — then offers the Divine Trinity (The Science · The Vineyard · The Craft) for deeper detail. Every answer becomes part of the shared Cellar Journal.
            </p>
          </div>
        </div>
      </section>

      {/* ── Zone 4: The Winemaker door (professional, dense) ──────────── */}
      <section
        style={{
          background: "oklch(0.14 0.010 60)",
          padding: "4rem 1.25rem",
          color: "oklch(0.95 0.010 75)",
        }}
      >
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
            Door #2 · The Press · For professional winemaking teams
          </p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: 0, lineHeight: 1.15, color: "oklch(0.95 0.010 75)" }}>
            The cellar tools your team needs.
            <br />
            Nothing they don't.
          </h2>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", color: "oklch(0.75 0.015 75)", lineHeight: 1.7, marginTop: "1rem", maxWidth: 720 }}>
            Voice-logged fermentations. Handwritten lab slips OCR'd into structured data. Trajectory alerts before a tank goes off. APCO Assistant drafts your Annual Report. Included with The Press ($44/mo founding · $59 retail).
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4" style={{ marginTop: "2.5rem" }}>
            {[
              {
                label: "DO · The Press",
                title: "Smart Cellar Logbook",
                body: "Voice or photo entry. OCR extracts your handwritten lab slips into structured, versioned records. Brix · Temp · pH · Free SO₂ · TA — all indexed, all searchable.",
                data: [{ k: "Brix", v: "14.2" }, { k: "Temp", v: "22°C" }, { k: "pH", v: "3.61" }, { k: "Free SO₂", v: "28ppm" }],
              },
              {
                label: "DO · The Press",
                title: "Fermentation Dashboard",
                body: "Every active fermentation on one board. Deviations from expected Brix trajectory flag proactively — before it becomes a crisis.",
                data: [{ k: "Tank 7 · Shiraz", v: "Day 8" }, { k: "Start Brix", v: "24.3" }, { k: "Current", v: "8.4" }, { k: "Trajectory", v: "On track" }],
              },
              {
                label: "KNOW · Knowledge Platform",
                title: "Institutional Memory",
                body: "38 industry-standard SOPs · 12 categories. Decision Logic captures the reasoning. Tribal Knowledge preserves what your team accumulated over vintages.",
                data: [{ k: "SOPs", v: "38" }, { k: "Categories", v: "12" }, { k: "Decision Logs", v: "Unlimited" }, { k: "Team seats", v: "Vigneron" }],
              },
            ].map((f) => (
              <div
                key={f.title}
                style={{
                  background: "oklch(0.18 0.010 60)",
                  border: "1px solid oklch(0.28 0.010 60)",
                  borderRadius: 6,
                  padding: "1.35rem",
                  fontFamily: "'Lato',sans-serif",
                }}
              >
                <p style={{ fontSize: "0.6rem", color: "var(--ow-amber)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, marginBottom: "0.4rem" }}>
                  {f.label}
                </p>
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.15rem", color: "oklch(0.96 0.010 75)", margin: 0 }}>
                  {f.title}
                </p>
                <p style={{ fontSize: "0.85rem", color: "oklch(0.72 0.015 75)", lineHeight: 1.65, marginTop: "0.5rem" }}>
                  {f.body}
                </p>
                <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem 1rem", borderTop: "1px solid oklch(0.28 0.010 60)", paddingTop: "0.75rem" }}>
                  {f.data.map((d) => (
                    <div key={d.k} style={{ display: "flex", justifyContent: "space-between", fontFamily: "'Fira Code',monospace", fontSize: "0.72rem" }}>
                      <span style={{ color: "oklch(0.60 0.015 75)" }}>{d.k}</span>
                      <span style={{ color: "oklch(0.90 0.010 75)", fontWeight: 700 }}>{d.v}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-3 mt-8">
            <Link
              href="/join"
              data-testid="v2-zone4-cta-join"
              style={{
                padding: "0.85rem 1.75rem",
                background: "var(--ow-amber)",
                color: "oklch(0.10 0.008 60)",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                textDecoration: "none",
                letterSpacing: "0.02em",
              }}
            >
              Founding Partner enquiry →
            </Link>
            <Link
              href="/apco"
              data-testid="v2-zone4-cta-apco"
              style={{
                padding: "0.85rem 1.75rem",
                background: "transparent",
                color: "oklch(0.95 0.010 75)",
                border: "1px solid oklch(0.28 0.010 60)",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 500,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              See APCO Assistant →
            </Link>
          </div>
        </div>
      </section>

      {/* ── Zone 5: Why Ownology (unchanged content, moved down) ──────── */}
      <section style={{ padding: "4rem 1.25rem", maxWidth: 1000, margin: "0 auto" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem" }}>
          Why Ownology
        </p>
        <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: 0 }}>
          Built by winemakers, for winemakers.
        </h2>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", color: "var(--ow-text-lo)", fontStyle: "italic", marginTop: "0.75rem", maxWidth: 720 }}>
          [Existing 3-box "Why Ownology" content lives here — keeping the current copy, just moved to zone 5]
        </p>
      </section>

      {/* ── Zone 6: 4-pillar grid — NOW a summary, not an intro ──────── */}
      <section style={{ padding: "4rem 1.25rem", background: "var(--ow-bg-card)", borderTop: "1px solid var(--ow-border)", borderBottom: "1px solid var(--ow-border)" }}>
        <div style={{ maxWidth: 1000, margin: "0 auto" }}>
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", marginBottom: "0.75rem", textAlign: "center" }}>
            The four pillars
          </p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.5rem, 3vw, 2rem)", margin: 0, textAlign: "center", lineHeight: 1.2 }}>
            Everything Ownology does — organised.
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-8">
            {[
              { label: "DO", tag: "In the cellar", link: "/the-press" },
              { label: "KNOW", tag: "The knowledge platform", link: "/knowledge" },
              { label: "LEARN", tag: "Free Run · Q&A", link: "/free-run" },
              { label: "GUIDE", tag: "Getting started", link: "/guide" },
            ].map((p) => (
              <Link
                key={p.label}
                href={p.link}
                style={{
                  background: "var(--ow-bg)",
                  border: "1px solid var(--ow-border)",
                  borderRadius: 6,
                  padding: "1.25rem",
                  textAlign: "center",
                  textDecoration: "none",
                  color: "var(--ow-text-hi)",
                  fontFamily: "'Lato',sans-serif",
                  display: "block",
                }}
              >
                <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.5rem", margin: 0, color: "var(--ow-amber)" }}>
                  {p.label}
                </p>
                <p style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", marginTop: "0.35rem" }}>
                  {p.tag}
                </p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Zone 7-10: reference stubs for what continues below ──────── */}
      <section style={{ padding: "3rem 1.25rem", maxWidth: 1000, margin: "0 auto", opacity: 0.6, fontFamily: "'Lato',sans-serif" }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", marginBottom: "0.75rem" }}>
          Then below this…
        </p>
        <ul style={{ fontSize: "0.9rem", color: "var(--ow-text-mid)", lineHeight: 1.8, listStyle: "none", padding: 0 }}>
          <li>Zone 7 — APCO strip (already exists, moves here)</li>
          <li>Zone 8 — Pricing preview with founding→retail ladder (already lives on /pricing, mirror here)</li>
          <li>Zone 9 — Social proof (LITF founder testimonials once they sign)</li>
          <li>Zone 10 — Final CTA mirroring the hero (I'm curious / I make wine)</li>
        </ul>
      </section>

      {/* Preview footer */}
      <div
        style={{
          padding: "2rem 1rem",
          textAlign: "center",
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.7rem",
          color: "var(--ow-text-lo)",
        }}
      >
        End of v2 mockup · <a href="/home" style={{ color: "var(--ow-amber)" }}>Compare to current /home</a>
      </div>
    </div>
  );
}
