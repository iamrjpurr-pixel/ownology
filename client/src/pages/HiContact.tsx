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
import { useAutoCascade } from "@/hooks/useAutoCascade";
import { HI_VARIANTS_BY_PERSONA, type HiPersona } from "@/lib/hi-personas";
import { OWNOLOGY_SELL_STACK } from "@/lib/ownology-descriptor";

const CALENDLY_FALLBACK_LABEL = "Book a 20-min demo";

export default function HiContact() {
  const [, params] = useRoute("/hi/:slug");
  const slug = params?.slug ?? "";
  const { data: contact, isLoading } = trpc.outreach.bySlug.useQuery(
    { slug },
    { enabled: !!slug, retry: false }
  );
  const markViewed = trpc.outreach.markViewed.useMutation();
  const markCtaClicked = trpc.outreach.markCtaClicked.useMutation();
  const fired = useRef(false);

  // Auto-fire the harvest crush cascade ~2.5s after the SMS prospect lands,
  // matched to their winery profile (Hunter / red producers → Red Crush,
  // white/sparkling producers → White Crush). One-shot per browser tab.
  useAutoCascade({
    themeId: contact?.crushVariant,
    enabled: !!contact?.slug,
    sessionKey: "ow_hi_cascade_played",
  });

  useEffect(() => {
    // Only log the view if the contact actually exists — avoids dirty 400s
    // on /hi/<typo> URLs.
    if (!contact?.slug || fired.current) return;
    fired.current = true;
    markViewed.mutate({ slug: contact.slug });
  }, [contact?.slug]);

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

  const calendlyUrl = contact.calendlyUrl || ""; // server resolves override → CALENDLY_DEFAULT_URL → null
  // A/B variant — "reply" gives a one-tap SMS pre-fill back to the operator;
  // "book" keeps the existing Calendly flow. Server-side deterministic
  // assignment per slug. Falls back to "book" if SMS_INBOUND_NUMBER unset.
  const ctaVariant: "book" | "reply" = contact.ctaVariant ?? "book";
  const smsReplyHref: string | null = contact.smsReplyHref ?? null;
  const waHref: string | null = (contact as { waHref?: string | null }).waHref ?? null;
  // A/B variant for the "What Ownology does" summary line — soft-launch
  // of QMS framing (Feb 2026). "qms" is the punchy 3-letter category;
  // "quality-system" is the plain-English hedge for non-corporate readers.
  // Deterministic per slug, independent of ctaVariant (different hash).
  const qmsVariant: "qms" | "quality-system" =
    (contact as { qmsVariant?: "qms" | "quality-system" | null }).qmsVariant ?? "qms";
  const qmsSummary =
    qmsVariant === "qms"
      ? "A winemaking QMS with an AI apprentice."
      : "A winemaking quality system with an AI apprentice.";

  function logCtaClick() {
    if (contact?.slug) markCtaClicked.mutate({ slug: contact.slug });
  }
  // Sample-vintage-log URL is resolved server-side based on contact.winery /
  // event — Hunter Valley prospects get a Hunter-themed view, small/cult
  // labels get a 12-tank boutique view, everyone else gets the 128-tank
  // default. Falls back to the static asset if older API responses don't
  // include the field. Funnel attribution via `from=sms-<slug>` is already
  // baked into the resolved URL.
  const tryNowHref = contact.sampleVintageLogUrl
    ?? `/sample-vintage-log.html?from=sms-${encodeURIComponent(contact.slug)}`;

  // Detect if this contact is tied to a *future* event (via EventDate stashed
  // in notes by /admin/event-ingest). Future events flip the warm-open copy
  // from past-tense "We crossed paths at" → forward-tense "Looking forward
  // to catching you at" — so the pitch lands right on either side of the
  // tasting.
  const eventDateMatch = contact.notes?.match(/EventDate:\s*(\d{4}-\d{2}-\d{2})/);
  const eventIsFuture = eventDateMatch
    ? new Date(eventDateMatch[1]).getTime() >= Date.now() - 24 * 3_600_000
    : false;

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
            {eventIsFuture ? (
              <>
                Looking forward to catching you at <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.event}</strong>
                {contact.winery ? <> — sending this ahead for <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.winery}</strong>.</> : "."}
              </>
            ) : (
              <>
                We crossed paths at <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.event}</strong>
                {contact.winery ? <> — sending this your way for <strong style={{ color: "#b45309", fontStyle: "normal" }}>{contact.winery}</strong>.</> : "."}
              </>
            )}
          </p>
        )}

        {/* Hook (Perplexity-sourced opener) — takes precedence over painPoint.
            This is the same line that opened the SMS, so the landing-page
            reinforces the "someone who did their homework" impression. */}
        {(contact as { hookText?: string | null }).hookText && (
          <div
            data-testid="hi-hook"
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
            <em>{(contact as { hookText?: string | null }).hookText}</em> — that&apos;s what got me thinking Ownology could actually be useful here. {OWNOLOGY_SELL_STACK}
          </div>
        )}

        {/* Pain hook (only if explicitly captured AND no hookText available) */}
        {!(contact as { hookText?: string | null }).hookText && contact.painPoint && (
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
            Thought this might be relevant: <em>{contact.painPoint}</em>. {OWNOLOGY_SELL_STACK}
          </div>
        )}

        {/* Honest framing for cold/brief contacts */}
        {!(contact as { hookText?: string | null }).hookText && !contact.painPoint && (
          <p
            data-testid="hi-intro"
            style={{
              marginTop: "1.5rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.95rem",
              lineHeight: 1.6,
              color: "#374151",
            }}
          >
            We didn&apos;t get long to chat — I&apos;ve since shipped something I reckon could save your wine making heroes real time through the vintage. {OWNOLOGY_SELL_STACK} 90-second look below; no signup needed.
          </p>
        )}

        {/* 3-tile "What Ownology does" — sales-psych Interest block. Sits
            after the personalised hook (rapport) and before the persona
            bullets (personalised desire). Generic + static — same on every
            /hi/:slug page — so a cold visitor gets a clean "here's what
            this thing is" moment before we ask them to book. Soft-launch
            of QMS framing per Feb 2026 positioning decision — kept
            confined to /hi/* until we A/B against the current Home hero. */}
        <div
          data-testid="hi-what-ownology-does"
          data-qms-variant={qmsVariant}
          style={{ marginTop: "2.25rem" }}
        >
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: 10,
              letterSpacing: "0.28em",
              color: "#b45309",
              textTransform: "uppercase",
              fontWeight: 700,
              margin: "0 0 0.9rem 0",
            }}
          >
            ✦ What Ownology does
          </p>
          <div style={{ display: "grid", gap: "0.6rem" }}>
            <WhatTile
              testid="hi-tile-records"
              kicker="Records"
              body="Every batch, every vessel — one source of truth across the vintage."
            />
            <WhatTile
              testid="hi-tile-compliance"
              kicker="Compliance"
              body="WBS, LIP and HACCP records auto-log as you work. Audit-ready PDF in 60 seconds."
            />
            <WhatTile
              testid="hi-tile-ai"
              kicker="AI apprentice"
              body="Owen answers with citations — grounded in AWRI, Boulton, Iland, and your own logs."
            />
          </div>
          <p
            data-testid="hi-what-summary"
            style={{
              marginTop: "1rem",
              fontFamily: "'Fraunces',serif",
              fontStyle: "italic",
              fontSize: "0.98rem",
              lineHeight: 1.4,
              color: "#4b5563",
              textAlign: "center",
            }}
          >
            {qmsSummary}
          </p>
        </div>

        {/* Authority strip — moved up from the footer per sales-psych audit
            (Feb 2026). Lands the "working winemaker" credential BEFORE
            the ask, not after. Tight, muted, no logo/photo — the words
            do the work. */}
        <p
          data-testid="hi-authority"
          style={{
            marginTop: "1.75rem",
            padding: "0.7rem 0.9rem",
            background: "rgba(180, 83, 9, 0.05)",
            borderTop: "1px solid rgba(180, 83, 9, 0.25)",
            borderBottom: "1px solid rgba(180, 83, 9, 0.25)",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.82rem",
            lineHeight: 1.5,
            color: "#374151",
            textAlign: "center",
          }}
        >
          Built by a working winemaker · Cited from 12+ industry bibles including AWRI, Boulton and Iland.
        </p>

        {/* Value bullets — persona-tuned. Each persona has 5 variants (see
            /app/client/src/lib/hi-personas.ts). Starting variant is
            deterministic per contact slug (so first-time visitors see a
            stable index that's different across prospects). Each subsequent
            view advances by one, so a returning visitor gets fresh copy.

            Persona is set on outreach_contacts.persona (auto-suggested by
            outreach.deepResearch from Perplexity's role + notes, operator
            can override on save). Null falls back to "winemaker" — the
            largest cold-call bucket and the safest generic pitch. */}
        {(() => {
          const persona: HiPersona = ((contact.persona as HiPersona | null) ?? "winemaker");
          const VARIANTS = HI_VARIANTS_BY_PERSONA[persona] ?? HI_VARIANTS_BY_PERSONA.winemaker;
          // Deterministic per-slug starting index → each prospect gets a
          // stable "first look" that differs across contacts.
          let h = 0;
          for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
          const startIdx = Math.abs(h) % VARIANTS.length;
          // Advance one variant per prior view — first visit = startIdx,
          // second visit = startIdx+1, etc. Cycles back around after 5.
          const viewCount = contact.viewCount ?? 0;
          const bullets = VARIANTS[(startIdx + viewCount) % VARIANTS.length];
          return (
            <ul style={{ listStyle: "none", padding: 0, margin: "2rem 0", fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", color: "#374151" }} data-testid={`hi-bullets-${persona}`}>
              {bullets.map((s, i) => (
                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: "0.6rem", marginBottom: "0.7rem" }}>
                  <span style={{ color: "#b45309", flexShrink: 0, marginTop: 2 }}>✦</span>
                  <span dangerouslySetInnerHTML={{ __html: s }} />
                </li>
              ))}
            </ul>
          );
        })()}

        {/* Topical journal snippet — surfaces 1 recently-asked question from
            the public journal as instant social proof. Stable per-contact via
            slug hash so the same visitor sees the same question on refresh. */}
        <TopicalJournalCard slug={contact.slug} />

        {/* Primary CTA — A/B variant chosen server-side per slug. */}
        {ctaVariant === "reply" && smsReplyHref ? (
          <a
            href={smsReplyHref}
            data-testid="hi-cta-primary"
            data-cta-variant="reply"
            onClick={logCtaClick}
            style={btnPrimary}
          >
            💬 Reply RED to lock my onboarding →
          </a>
        ) : calendlyUrl ? (
          <a
            href={calendlyUrl}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="hi-cta-primary"
            data-cta-variant="book"
            onClick={logCtaClick}
            style={btnPrimary}
          >
            📅 {CALENDLY_FALLBACK_LABEL} →
          </a>
        ) : (
          <a
            href={tryNowHref}
            data-testid="hi-cta-primary"
            data-cta-variant="fallback"
            onClick={logCtaClick}
            style={btnPrimary}
          >
            👋 See a real-time vintage log →
          </a>
        )}

        {/* WhatsApp offer — appears whenever a WA number is configured,
             regardless of the primary CTA variant. SMS is universal (door),
             WhatsApp is the couch: better for photos, PDFs, and threaded
             follow-up. Deliberately quieter styling than the primary CTA so
             it reads as an option, not a demand. Feb 2026 · Rich. */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="hi-cta-whatsapp"
            data-cta-channel="whatsapp"
            onClick={logCtaClick}
            style={btnWhatsApp}
          >
            <span style={{ marginRight: "0.4rem" }}>📱</span>
            Have WhatsApp? Easier for photos &amp; docs →
          </a>
        )}

        {/* Secondary CTA — opens the polished 128-tank sample dashboard so the
            prospect can visualise their own operation in Ownology. Plain <a>
            because the target is a static .html outside the React router. */}
        <a
          href={tryNowHref}
          data-testid="hi-cta-secondary"
          style={btnSecondary}
        >
          See a sample 2026 vintage log →
        </a>

        {/* Tertiary CTA — the LIVE Cellar Brief running on real seeded vintage
            data. Lets prospects flip from the static sample (above) to the
            actual daily-driver workflow. Tagged for funnel attribution. */}
        <Link
          href={`/cellar-brief?from=sms-${contact.slug}`}
          data-testid="hi-cta-cellar-brief"
          style={btnTertiary}
        >
          ✦ See today&apos;s live Cellar Brief →
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

/**
 * TopicalJournalCard — surfaces 1 recently-asked question from the public
 * /cellar-journal as instant social proof + a soft trust signal for cold
 * SMS prospects. The choice is deterministic per contact slug so the
 * same visitor sees the same card across refreshes (avoids the "it changed
 * between taps" surprise) while different prospects see variety.
 */
function TopicalJournalCard({ slug }: { slug: string }) {
  const { data } = trpc.cellarJournal.list.useQuery({ limit: 24 }, { retry: false });
  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;
  // Deterministic pick — same contact always sees the same journal entry.
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  const pick = rows[Math.abs(hash) % rows.length];
  return (
    <div
      data-testid="hi-journal-card"
      style={{
        marginTop: "2rem",
        padding: "1rem 1.1rem",
        background: "rgba(180, 83, 9, 0.05)",
        border: "1px dashed rgba(180, 83, 9, 0.35)",
        borderRadius: 8,
      }}
    >
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.7rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "#78350f",
          margin: 0,
          fontWeight: 700,
        }}
      >
        ✦ Recently asked in the journal
      </p>
      <p
        data-testid="hi-journal-q"
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: "1.02rem",
          lineHeight: 1.35,
          color: "#111827",
          margin: "0.5rem 0 0.7rem 0",
        }}
      >
        {pick.question}
      </p>
      <Link
        href={`/cellar-journal/${pick.slug}?from=hi-${slug}`}
        data-testid="hi-journal-readmore"
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.82rem",
          color: "#b45309",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Read the answer →
      </Link>
    </div>
  );
}

const inner: React.CSSProperties = {
  width: "100%",
  maxWidth: 540,
  padding: "2.5rem 1.5rem 4rem",
};
const wrap: React.CSSProperties = {
  minHeight: "100dvh",
  background: "#FAFAF9",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
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
// WhatsApp button — green-tinted so the channel identity reads instantly.
// Sized between primary and tertiary: it's a real option, not a decoration.
const btnWhatsApp: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.85rem 1.25rem",
  background: "rgba(37, 211, 102, 0.10)",
  color: "#128C7E",
  fontFamily: "'Lato',sans-serif",
  fontWeight: 600,
  fontSize: "0.9rem",
  textAlign: "center",
  textDecoration: "none",
  marginTop: "0.5rem",
  border: "1px solid rgba(37, 211, 102, 0.45)",
  borderRadius: 6,
};
const btnTertiary: React.CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.85rem 1.25rem",
  background: "rgba(180, 83, 9, 0.04)",
  color: "#7c3a07",
  fontFamily: "'Lato',sans-serif",
  fontWeight: 600,
  fontSize: "0.88rem",
  textAlign: "center",
  textDecoration: "none",
  marginTop: "0.6rem",
  border: "1px dashed rgba(180, 83, 9, 0.5)",
  borderRadius: 6,
  letterSpacing: "0.01em",
};

/**
 * WhatTile — one row of the /hi/:slug "What Ownology does" 3-tile block.
 * Small, dense, mobile-first. Amber kicker (category noun) + serif body
 * (concrete deliverable). No icons — the words do the work.
 */
function WhatTile({ kicker, body, testid }: { kicker: string; body: string; testid: string }) {
  return (
    <div
      data-testid={testid}
      style={{
        padding: "0.75rem 0.9rem",
        background: "#fff",
        border: "1px solid rgba(180, 83, 9, 0.18)",
        borderRadius: 6,
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "start",
        gap: "0.85rem",
      }}
    >
      <span
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "#b45309",
          fontWeight: 800,
          whiteSpace: "nowrap",
          paddingTop: 3,
          minWidth: 74,
        }}
      >
        {kicker}
      </span>
      <span
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.88rem",
          lineHeight: 1.45,
          color: "#1f2937",
        }}
      >
        {body}
      </span>
    </div>
  );
}

