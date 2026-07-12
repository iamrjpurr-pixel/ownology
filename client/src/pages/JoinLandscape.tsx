/**
 * /join/landscape — Marketing / competitive landscape reference.
 *
 * Public page. Designed to be pulled up on Rich's phone mid-conversation
 * when a winemaker asks "how's this different from Vivino / Wine Folly /
 * ChatGPT?" or "why now?".  Concise, printable, phone-friendly.
 *
 * Source: /app/memory/MARKETING_ANALYSIS.md — this page renders sections
 * 1, 2, 4, and 8 (the ones that matter mid-call). Full analysis stays in
 * the memory file for handoff continuity.
 */
import { Link } from "wouter";
import { ArrowLeft } from "lucide-react";

const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";
const SERIF = "'Fraunces', serif";

const CATEGORY_ROWS = [
  { cat: "Wine apps (scanning, ratings, community)", who: "The big-brand wine-scanner category", fits: "No scanning, no ratings, no crowd", verdict: "❌" },
  { cat: "Wine education", who: "The evergreen-content and certification category", fits: "Not evergreen articles, not certification-track", verdict: "❌" },
  { cat: "Wine media", who: "The editorial and reviews category", fits: "Not editorial", verdict: "❌" },
  { cat: "Enterprise winery software", who: "The heavy ERP category — $500-$3,000/mo tier", fits: "Too heavy, no AI, wrong price", verdict: "❌" },
  { cat: "AI wine tools (early)", who: "Shallow generic-AI wrappers and adjacent plays", fits: "Closest neighbours, but all shallow", verdict: "⚠️" },
  { cat: "Consumer AI Q&A (generic)", who: "Generic-purpose AI answer tools", fits: "No wine grounding, no persona, no memory", verdict: "❌" },
];

export default function JoinLandscape() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: HI,
        padding: "2rem 1.25rem 4rem",
        fontFamily: "'Lato', sans-serif",
      }}
      data-testid="landscape-page"
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <Link
          href="/join"
          style={{ color: LO, fontSize: "0.8rem", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.35rem" }}
          data-testid="landscape-back"
        >
          <ArrowLeft size={12} /> Back to Founding Partners
        </Link>

        <h1
          style={{ margin: "1rem 0 0.5rem", fontFamily: SERIF, fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)", color: HI, lineHeight: 1.15 }}
          data-testid="landscape-heading"
        >
          Where Ownology sits in the market.
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", color: MID, lineHeight: 1.55 }}>
          A quick landscape for anyone who wants to challenge or converse on positioning. This is what we do — and just as importantly, what we don&apos;t.
        </p>

        {/* SECTION 1 — Category map */}
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: SERIF, fontSize: "1.35rem", color: HI }}>
            1. What category are we in?
          </h2>
          <p style={{ margin: "0 0 1rem", color: MID, fontSize: "0.95rem", lineHeight: 1.55 }}>
            Not what you&apos;d assume. Ownology sits in a gap nobody currently owns.
          </p>
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, overflow: "hidden" }} data-testid="landscape-category-table">
            {CATEGORY_ROWS.map((r, i) => (
              <div
                key={i}
                style={{
                  padding: "0.85rem 1rem",
                  borderBottom: i < CATEGORY_ROWS.length - 1 ? `1px solid ${BORDER}` : "none",
                  display: "grid",
                  gridTemplateColumns: "1fr auto",
                  gap: "0.5rem",
                  fontSize: "0.85rem",
                }}
              >
                <div>
                  <p style={{ margin: 0, color: HI, fontWeight: 600 }}>{r.cat}</p>
                  <p style={{ margin: "0.15rem 0 0.35rem", color: LO, fontSize: "0.78rem" }}>{r.who}</p>
                  <p style={{ margin: 0, color: MID, fontSize: "0.82rem" }}>{r.fits}</p>
                </div>
                <div style={{ fontSize: "1.1rem", alignSelf: "start" }}>{r.verdict}</div>
              </div>
            ))}
          </div>
          <p style={{ margin: "1rem 0 0", color: HI, fontSize: "0.95rem", fontWeight: 600 }}>
            Ownology isn&apos;t in any of these boxes. It sits between them.
          </p>
        </section>

        {/* SECTION 2 — The gap */}
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: SERIF, fontSize: "1.35rem", color: HI }}>
            2. The gap we actually occupy
          </h2>
          <div style={{ padding: "1.25rem", background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: `1px solid ${AMBER}`, borderRadius: 8 }}>
            <p style={{ margin: 0, color: HI, fontSize: "1rem", fontWeight: 600, fontStyle: "italic", lineHeight: 1.5 }}>
              &quot;AI wine answer engine, grounded in the cellar references your team already trusts, with cellar-side infrastructure underneath.&quot;
            </p>
          </div>
          <p style={{ margin: "1.25rem 0 0.75rem", color: MID, fontSize: "0.95rem", lineHeight: 1.55 }}>
            That&apos;s the category nobody&apos;s playing in. Two flanks:
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: "none", display: "grid", gap: "0.75rem" }}>
            <li style={{ padding: "0.85rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: "0.9rem", color: MID, lineHeight: 1.5 }}>
              <strong style={{ color: HI }}>Consumer flank (DIY).</strong>{" "}
              Answer engine, real depth, voice. What every generic AI wine question is missing: grounding.
            </li>
            <li style={{ padding: "0.85rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: "0.9rem", color: MID, lineHeight: 1.5 }}>
              <strong style={{ color: HI }}>Professional flank (cellar).</strong>{" "}
              A cellar hand&apos;s voice with institutional memory. SOP-grounded, opinion-forward, remembers your vintages.
            </li>
          </ul>
          <p style={{ margin: "1rem 0 0", color: MID, fontSize: "0.9rem", lineHeight: 1.55 }}>
            Same AI infrastructure. Two audiences. Two front doors. Defensible not because the tech is unique (it isn&apos;t), but because the <strong style={{ color: HI }}>combination is</strong> — grounding + voice + memory + dual-market backbone.
          </p>
        </section>

        {/* SECTION 3 — Positioning */}
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: SERIF, fontSize: "1.35rem", color: HI }}>
            3. Positioning
          </h2>
          <div style={{ padding: "1.25rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8 }}>
            <p style={{ margin: 0, color: HI, fontSize: "1.05rem", fontFamily: SERIF, lineHeight: 1.45 }}>
              Ownology is the wine answer engine.<br />
              Grounded in the cellar references your team already trusts.<br />
              Delivered by Owen, the cellar hand who remembers.
            </p>
          </div>
          <div style={{ marginTop: "1rem", display: "grid", gap: "0.6rem" }}>
            <div style={{ padding: "0.75rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: "0.88rem" }}>
              <strong style={{ color: HI }}>Grounded, not vibes.</strong>{" "}
              <span style={{ color: MID }}>Rooted in the standard cellar references your team already trusts — not community opinion, not internet consensus, not LLM hallucination.</span>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: "0.88rem" }}>
              <strong style={{ color: HI }}>Direct, not deferential.</strong>{" "}
              <span style={{ color: MID }}>Owen has opinions. He&apos;ll tell you your $16 Barbera is over-oaked. Cellar-hand honesty, not sommelier flattery.</span>
            </div>
            <div style={{ padding: "0.75rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, fontSize: "0.88rem" }}>
              <strong style={{ color: HI }}>Yours, compounding.</strong>{" "}
              <span style={{ color: MID }}>Every question you ask becomes part of your library. Ask better questions over time.</span>
            </div>
          </div>
        </section>

        {/* SECTION 4 — Talking points */}
        <section style={{ marginTop: "2.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontFamily: SERIF, fontSize: "1.35rem", color: HI }}>
            4. When someone challenges you
          </h2>

          <div style={{ padding: "1rem 1.15rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: "0.75rem" }}>
            <p style={{ margin: 0, color: LO, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              &quot;What makes you different from the other wine apps and AI tools?&quot;
            </p>
            <p style={{ margin: "0.6rem 0 0", color: MID, fontStyle: "italic", fontSize: "0.9rem", lineHeight: 1.55 }}>
              &quot;Big wine apps tell you what the crowd thinks about a bottle. Wine-education sites teach evergreen concepts. Generic AI will guess at wine questions with confidence but no depth. Ownology sits somewhere else — it&apos;s the answer engine grounded in the cellar references your team already trusts, and on the professional side, a cellar hand that remembers your last three vintages. Different job. Different tool.&quot;
            </p>
          </div>

          <div style={{ padding: "1rem 1.15rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, marginTop: "0.75rem" }}>
            <p style={{ margin: 0, color: LO, fontSize: "0.75rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              &quot;Why now?&quot;
            </p>
            <p style={{ margin: "0.6rem 0 0", color: MID, fontStyle: "italic", fontSize: "0.9rem", lineHeight: 1.55 }}>
              &quot;Because the AU wine industry is contracting — you know that better than me — and the wineries that survive the shakeout are the ones running lean with tools that actually save time. Ownology&apos;s designed to be the one tool you don&apos;t cut when things get tight.&quot;
            </p>
          </div>
        </section>

        {/* Footer */}
        <section style={{ marginTop: "3rem", padding: "1.25rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, textAlign: "center" }}>
          <p style={{ margin: 0, fontSize: "0.9rem", color: MID }}>
            Interested in a Founding Pilot conversation?
          </p>
          <Link
            href="/join#book"
            style={{
              display: "inline-block", marginTop: "0.75rem",
              padding: "0.65rem 1.25rem", background: AMBER, color: "oklch(0.10 0.008 60)",
              borderRadius: 6, textDecoration: "none", fontWeight: 600, fontSize: "0.9rem",
            }}
            data-testid="landscape-book"
          >
            Book a call →
          </Link>
        </section>
      </div>
    </div>
  );
}
