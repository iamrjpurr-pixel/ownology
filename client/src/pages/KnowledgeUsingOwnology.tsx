/**
 * /knowledge/using-ownology — the member-facing "how to use Ownology" hub.
 *
 * Contains the two flash-card decks that emerged from the operator-guide
 * audit as transferrable to end users: Compliance workflow (minus the
 * operator-only APCO deck) and the Import & OCR workflow. The other two
 * decks in /admin/operator-guide (CRM + Pipeline board) stay internal-only
 * because they describe outbound sales flow, not winemaker workflow.
 *
 * Gating: not added to PUBLIC_PREFIXES → the default-DENY gate wall covers
 * it. Any member past the gate cookie (or an authenticated session) gets in.
 *
 * Deep-links: #compliance-flash-cards and #import-flash-cards work here
 * exactly as they do on /admin/operator-guide, so /compliance and /import
 * can link back with anchors instead of query-strings.
 */
import { useEffect } from "react";
import { Link } from "wouter";
import { ArrowRight, GraduationCap } from "lucide-react";
import { ComplianceFlashCards } from "@/components/ComplianceFlashCards";
import { ImportFlashCards } from "@/components/ImportFlashCards";

export default function KnowledgeUsingOwnology() {
  useEffect(() => {
    document.title = "How to use Ownology — Knowledge base";
    // If the URL includes an anchor, jump after the deck lazy-mounts.
    if (typeof window !== "undefined" && window.location.hash) {
      const anchor = window.location.hash.slice(1);
      setTimeout(() => {
        const el = document.getElementById(anchor);
        if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 200);
    }
  }, []);

  return (
    <div
      data-testid="knowledge-using-ownology-page"
      style={{
        minHeight: "100dvh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        padding: "2.5rem 1.25rem 4rem",
        fontFamily: "'Lato', system-ui, sans-serif",
      }}
    >
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "2.5rem" }}>
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "5px 12px",
              borderRadius: 999,
              background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
              color: "var(--ow-amber)",
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              fontWeight: 600,
              marginBottom: 14,
            }}
          >
            <GraduationCap size={14} /> Knowledge base
          </div>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "clamp(2rem, 4vw, 2.8rem)",
              fontWeight: 700,
              lineHeight: 1.1,
              margin: "0 0 0.6rem",
            }}
          >
            How to use Ownology.
          </h1>
          <p
            style={{
              fontSize: "1rem",
              lineHeight: 1.55,
              color: "var(--ow-text-mid)",
              maxWidth: 640,
              margin: 0,
            }}
          >
            Two decks of flash cards written for the moments that matter:
            when you&apos;re importing years of history, when a regulator
            emails asking for evidence, or when you just want to know
            which button does what. Skim the deck labels first — jump into
            the card that matches what you&apos;re trying to do.
          </p>

          {/* Deck quick-nav */}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 22 }}>
            <a
              href="#import-flash-cards"
              data-testid="knowledge-jump-import"
              style={jumpStyle}
            >
              Import & OCR workflow <ArrowRight size={14} />
            </a>
            <a
              href="#compliance-flash-cards"
              data-testid="knowledge-jump-compliance"
              style={jumpStyle}
            >
              Compliance workflow <ArrowRight size={14} />
            </a>
          </div>
        </div>

        {/* ── Import deck (winemakers' most-used surface) ────────────── */}
        <div style={{ marginBottom: "3.5rem" }}>
          <ImportFlashCards />
        </div>

        {/* ── Compliance deck (APCO deck excluded — operator-only) ───── */}
        <div>
          <ComplianceFlashCards excludeDecks={["apco"]} />
        </div>

        {/* ── Foot ───────────────────────────────────────────────────── */}
        <div
          style={{
            marginTop: "3rem",
            paddingTop: "1.5rem",
            borderTop: "1px solid color-mix(in oklch, var(--ow-text-lo) 20%, transparent)",
            fontSize: "0.85rem",
            color: "var(--ow-text-lo)",
            lineHeight: 1.6,
          }}
        >
          Missing a workflow? Something unclear? Email{" "}
          <a href="mailto:hello@ownology.ai" style={{ color: "var(--ow-amber)" }}>
            hello@ownology.ai
          </a>{" "}
          — we add cards based on real questions. Live surfaces referenced
          above: <Link href="/import" style={{ color: "var(--ow-amber)" }}>/import</Link>,{" "}
          <Link href="/compliance" style={{ color: "var(--ow-amber)" }}>/compliance</Link>,{" "}
          <Link href="/quick-entry" style={{ color: "var(--ow-amber)" }}>/quick-entry</Link>,{" "}
          <Link href="/the-press" style={{ color: "var(--ow-amber)" }}>/the-press</Link>.
        </div>
      </div>
    </div>
  );
}

const jumpStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  padding: "8px 14px",
  borderRadius: 8,
  background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
  color: "var(--ow-amber)",
  fontSize: "0.85rem",
  fontWeight: 600,
  textDecoration: "none",
};
