/**
 * /hi/:slug — personalised landing page for warm winemaker SMS leads.
 *
 * The owner texts a URL like https://ownology.ai/hi/sarah-brokenwood.
 * Sarah taps it on her phone → instantly sees:
 *   - "G'day Sarah" + reference to where you met
 *   - A reminder of the pain you discussed
 *   - ONE big "Book a 20-min demo" CTA → Calendly
 *   - Secondary "Try the AI now" CTA → /free-run
 *
 * Fires outreach.markViewed on mount so the owner sees who opened the link
 * in /admin/contacts.
 */
import { useEffect, useRef } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";

const CALENDLY_FALLBACK_LABEL = "Book a 20-min demo";

export default function HiContact() {
  const [, params] = useRoute("/hi/:slug");
  const slug = params?.slug ?? "";
  const { data: contact, isLoading } = trpc.outreach.bySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false }
  );
  const markViewed = trpc.outreach.markViewed.useMutation();
  const fired = useRef(false);

  useEffect(() => {
    if (!slug || fired.current) return;
    fired.current = true;
    markViewed.mutate({ slug });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  if (isLoading) {
    return (
      <div style={loading} data-testid="hi-loading">
        Loading…
      </div>
    );
  }
  if (!contact) {
    return (
      <div style={wrap} data-testid="hi-notfound">
        <p style={{ fontFamily: "'Lato',sans-serif", color: "#9ca3af", textAlign: "center" }}>
          This personal link wasn&apos;t recognised.
        </p>
        <Link href="/" style={{ color: "#b45309", textDecoration: "none" }}>← Visit Ownology</Link>
      </div>
    );
  }

  const calendlyUrl = contact.calendlyOverride || ""; // empty falls back to /free-run secondary
  const tryNowHref = `/free-run?from=sms-${encodeURIComponent(contact.slug)}`;

  return (
    <div style={wrap} data-testid="hi-page">
      {/* Top accent bar */}
      <div style={{ height: 4, background: "#b45309", width: "100%" }} />

      <div style={inner}>
        {/* Brand mark */}
        <div style={{ marginBottom: "2rem" }}>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: 11, letterSpacing: 3, color: "#b45309", textTransform: "uppercase", fontWeight: 700, margin: 0 }}>
            Ownology · Cellar Intelligence
          </p>
        </div>

        {/* Personalised hero */}
        <h1
          data-testid="hi-greeting"
          style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(2rem, 7vw, 3rem)", color: "#111827", margin: 0, lineHeight: 1.1, fontWeight: 600 }}
        >
          G&apos;day {contact.firstName}.
        </h1>

        {contact.event && (
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", color: "#374151", marginTop: "0.6rem", marginBottom: 0, fontStyle: "italic" }}>
            Great chatting at <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.event}</strong>
            {contact.winery ? <> — and bringing <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.winery}</strong> into the chat.</> : "."}
          </p>
        )}

        {/* Pain hook */}
        {contact.painPoint && (
          <div
            data-testid="hi-pain"
            style={{
              marginTop: "1.75rem",
              padding: "1rem 1.25rem",
              background: "#FEF3C7",
              borderLeft: "3px solid #b45309",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.95rem",
              lineHeight: 1.55,
              color: "#1f2937",
            }}
          >
            You mentioned <em>{contact.painPoint}</em>. That&apos;s exactly the kind of question Ownology is built to answer — grounded in your actual vintage logs, not a guess from a forum.
          </div>
        )}

        {/* Value bullets */}
        <ul style={{ listStyle: "none", padding: 0, margin: "2rem 0", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", color: "#374151" }}>
          {[
            "AI cellar assistant grounded in 348 chunks of winemaking bibles + AU/NZ regulations",
            "Tracks YOUR vintage log → recommendations reference your actual tanks and tracks",
            "30 seconds on your phone in the cellar — no laptop, no 40 tabs",
          ].map((s, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.7rem" }}>
              <span style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }}>✦</span>
              <span>{s}</span>
            </li>
          ))}
        </ul>

        {/* Primary CTA */}
        {calendlyUrl ? (
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="hi-cta-primary"
            style={btnPrimary}
          >
            📅 {CALENDLY_FALLBACK_LABEL} →
          </a>
        ) : (
          <Link
            href={tryNowHref}
            data-testid="hi-cta-primary"
            style={btnPrimary}
          >
            👋 See the AI in action →
          </Link>
        )}

        {/* Secondary CTA */}
        <Link
          href={tryNowHref}
          data-testid="hi-cta-secondary"
          style={btnSecondary}
        >
          Or try it right now — no signup →
        </Link>

        {/* Signature */}
        <p style={{ marginTop: "3rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "#6b7280" }}>
          — Built by a working winemaker, for working winemakers.
        </p>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "#9ca3af", marginTop: "2rem" }}>
          This page is personalised for you. Reply STOP to opt out of future messages.
        </p>
      </div>
    </div>
  );
}

const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#FAFAF9",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const inner: React.CSSProperties = {
  width: "100%",
  maxWidth: 540,
  padding: "2.5rem 1.5rem 4rem",
};
const loading: React.CSSProperties = {
  minHeight: "100dvh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: "'Lato',sans-serif",
  color: "#9ca3af",
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};
const btnPrimary: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "1rem 1.25rem",
  background: "#b45309",
  color: "#fff",
  fontFamily: "'Lato',sans-serif",
  fontWeight: 700,
  fontSize: "1rem",
  textAlign: "center",
  textDecoration: "none",
  borderRadius: 6,
  letterSpacing: "0.02em",
};
const btnSecondary: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.9rem 1.25rem",
  background: "transparent",
  color: "#b45309",
  fontFamily: "'Lato',sans-serif",
  fontWeight: 600,
  fontSize: "0.9rem",
  textAlign: "center",
  textDecoration: "none",
  marginTop: "0.75rem",
  border: "1px solid #b45309",
  borderRadius: 6,
};
