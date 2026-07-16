/**
 * /hi/:slug — personalised landing page for warm winemaker SMS leads.
 *
 * Feb 2026 design pass:
 *   - Every colour + background sourced from CSS design tokens
 *     (--ow-bg-base, --ow-text-hi, etc.) — the site's theme picker
 *     drives the palette. This file never hardcodes hex values.
 *   - Typography reduced to a two-family system:
 *       Fraunces serif → H1 greeting only + one italic accent line
 *       Lato sans     → everything else (kickers, body, bullets, CTAs)
 *   - One card style — `panelStyle` — applied to hook block, tile block,
 *     journal card, and authority strip. Content differentiates them,
 *     not the frame.
 *   - Amber budget: 3 surfaces max — brand kicker, primary CTA button,
 *     click-count accents (winery name, view counter). No amber-tinted
 *     panel backgrounds anywhere on this page.
 *   - Winemaking acronyms wrapped in <AcronymTooltip> so a first-tap
 *     visitor can decode WBS / LIP / HACCP / AWRI without leaving.
 *
 * The owner texts a URL like https://ownology.ai/hi/sarah-brokenwood.
 * Sarah taps it on her phone → instantly sees:
 *   - "G'day Sarah" + reference to where you met
 *   - What Ownology does (3 tiles, generic)
 *   - Persona-tuned bullets (why it fits her specifically)
 *   - ONE big "Book a 20-min demo" CTA → Calendly
 *   - Secondary "Try the AI now" CTA → /free-run
 *
 * Fires outreach.markViewed on mount so the owner sees who opened the
 * link in /admin/contacts.
 */
import { CSSProperties, useEffect, useRef, useState } from "react";
import { useRoute, Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAutoCascade } from "@/hooks/useAutoCascade";
import { HI_VARIANTS_BY_PERSONA, type HiPersona } from "@/lib/hi-personas";
import { OWNOLOGY_SELL_STACK } from "@/lib/ownology-descriptor";
import { AcronymTooltip } from "@/components/AcronymTooltip";

const CALENDLY_FALLBACK_LABEL = "Book a 20-min demo";

// --- Design tokens (this page only) -----------------------------------
// Sourced from --ow-* CSS variables so the site's theme picker wins.
const SANS  = "'Lato', sans-serif";
const SERIF = "'Fraunces', serif";

/** Shared panel treatment — matches the /admin/contacts sectionPanel
 *  contract. Neutral card bg, subtle border, single 2px amber accent on
 *  the top edge. This is THE only panel style on the page. */
const panelStyle: CSSProperties = {
  background: "var(--ow-bg-card)",
  border: "1px solid var(--ow-border)",
  borderTop: "2px solid color-mix(in oklch, var(--ow-amber) 55%, transparent)",
  borderRadius: 8,
  padding: "1rem 1.15rem",
};

/** Small-caps section eyebrow — amber, tight tracking, tiny. */
const eyebrowStyle: CSSProperties = {
  fontFamily: SANS,
  fontSize: 10,
  letterSpacing: "0.24em",
  color: "var(--ow-amber)",
  textTransform: "uppercase",
  fontWeight: 700,
  margin: 0,
};

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
  const [smsCopyHint, setSmsCopyHint] = useState<string | null>(null);

  // Auto-fire the harvest crush cascade ~2.5s after the SMS prospect lands,
  // matched to their winery profile. One-shot per browser tab.
  useAutoCascade({
    themeId: contact?.crushVariant,
    enabled: !!contact?.slug,
    sessionKey: "ow_hi_cascade_played",
  });

  useEffect(() => {
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
        <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)", textAlign: "center" }}>
          This personal link wasn&apos;t recognised.
        </p>
        <Link href="/" style={{ color: "var(--ow-amber)", textDecoration: "none" }}>← Visit Ownology</Link>
      </div>
    );
  }

  const calendlyUrl = contact.calendlyUrl || "";
  const ctaVariant: "book" | "reply" = contact.ctaVariant ?? "book";
  const smsReplyHref: string | null = contact.smsReplyHref ?? null;
  const waHref: string | null = (contact as { waHref?: string | null }).waHref ?? null;
  const qmsVariant: "qms" | "quality-system" =
    (contact as { qmsVariant?: "qms" | "quality-system" | null }).qmsVariant ?? "qms";
  const qmsSummary =
    qmsVariant === "qms"
      ? "A winemaking QMS with a working memory."
      : "A winemaking quality-and-risk system, across the whole business.";

  function logCtaClick() {
    if (contact?.slug) markCtaClicked.mutate({ slug: contact.slug });
  }

  /** Desktop OSes (Windows, macOS without Messages continuity) have no
   *  registered `sms:` handler, so clicking the CTA pops a "Pick an app"
   *  chooser. On desktop we intercept the click, parse the number + body
   *  out of the sms: URI, copy the pre-filled text + phone number to
   *  the clipboard, and show a tiny confirmation strip. Phones keep the
   *  native `sms:` behaviour. Feb 2026, Rich. */
  function handleSmsCtaClick(e: React.MouseEvent<HTMLAnchorElement>) {
    logCtaClick();
    if (typeof window === "undefined") return;
    const isTouch = window.matchMedia("(pointer: coarse)").matches;
    if (isTouch) return; // phones + tablets — native sms: works fine
    e.preventDefault();
    const href = smsReplyHref || "";
    // sms:<number>?[&]body=<encoded>  — split on the query separator
    const numMatch = href.match(/^sms:([^?&]+)/i);
    const bodyMatch = href.match(/[?&]body=([^&]+)/i);
    const number = numMatch ? decodeURIComponent(numMatch[1]) : "";
    const body = bodyMatch ? decodeURIComponent(bodyMatch[1]) : "";
    const combined = body ? `${body}\n\n(Text this to ${number})` : number;
    const okMsg = `Copied. Text this to ${number} from your phone.`;
    const failMsg = `Text ${number}: "${body}"`;
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(combined).then(
        () => setSmsCopyHint(okMsg),
        () => setSmsCopyHint(failMsg),
      );
    } else {
      setSmsCopyHint(failMsg);
    }
  }

  const tryNowHref = contact.sampleVintageLogUrl
    ?? `/sample-vintage-log.html?from=sms-${encodeURIComponent(contact.slug)}`;

  const eventDateMatch = contact.notes?.match(/EventDate:\s*(\d{4}-\d{2}-\d{2})/);
  const eventIsFuture = eventDateMatch
    ? new Date(eventDateMatch[1]).getTime() >= Date.now() - 24 * 3_600_000
    : false;

  const hookText = (contact as { hookText?: string | null }).hookText;

  return (
    <div style={wrap} data-testid="hi-page">
      {/* Top accent bar — the only full-width amber surface on the page */}
      <div style={{ height: 3, background: "var(--ow-amber)", width: "100%" }} />

      <div style={inner}>
        {/* Brand kicker */}
        <p style={{ ...eyebrowStyle, marginBottom: "1.5rem" }}>
          Ownology · Cellar Intelligence
        </p>

        {/* Personalised hero */}
        <h1
          data-testid="hi-greeting"
          style={{
            fontFamily: SERIF,
            fontSize: "clamp(2rem, 7vw, 3rem)",
            color: "var(--ow-text-hi)",
            margin: 0,
            lineHeight: 1.1,
            fontWeight: 600,
          }}
        >
          G&apos;day {contact.firstName}.
        </h1>

        {contact.event && (
          <p style={eventLine}>
            {eventIsFuture ? (
              <>
                Looking forward to catching you at <strong style={amberInline}>{contact.event}</strong>
                {contact.winery ? <> — sending this ahead for <strong style={amberInline}>{contact.winery}</strong>.</> : "."}
              </>
            ) : (
              <>
                We crossed paths at <strong style={amberInline}>{contact.event}</strong>
                {contact.winery ? <> — sending this your way for <strong style={amberInline}>{contact.winery}</strong>.</> : "."}
              </>
            )}
          </p>
        )}

        {/* Hook (Perplexity-sourced opener) — takes precedence over painPoint. */}
        {hookText && (
          <div data-testid="hi-hook" style={{ ...panelStyle, marginTop: "1.75rem" }}>
            <p style={{ ...eyebrowStyle, marginBottom: "0.55rem" }}>Something I noticed</p>
            <p style={bodyStyle}>
              <em style={{ color: "var(--ow-text-hi)" }}>{hookText}</em>
            </p>
            <p style={{ ...bodyStyle, marginTop: "0.6rem", color: "var(--ow-text-mid)" }}>
              That&apos;s what got me thinking Ownology could actually be useful here. {OWNOLOGY_SELL_STACK}
            </p>
          </div>
        )}

        {/* Pain hook — only if explicitly captured AND no hookText available */}
        {!hookText && contact.painPoint && (
          <div data-testid="hi-pain" style={{ ...panelStyle, marginTop: "1.75rem" }}>
            <p style={{ ...eyebrowStyle, marginBottom: "0.55rem" }}>You mentioned</p>
            <p style={bodyStyle}>
              <em style={{ color: "var(--ow-text-hi)" }}>{contact.painPoint}</em>
            </p>
            <p style={{ ...bodyStyle, marginTop: "0.6rem", color: "var(--ow-text-mid)" }}>
              {OWNOLOGY_SELL_STACK}
            </p>
          </div>
        )}

        {/* Honest framing for cold/brief contacts */}
        {!hookText && !contact.painPoint && (
          <div data-testid="hi-intro" style={{ ...panelStyle, marginTop: "1.75rem" }}>
            <p style={bodyStyle}>
              We didn&apos;t get long to chat — I&apos;ve since shipped something I reckon could save your winemaking heroes real time through the vintage. {OWNOLOGY_SELL_STACK}
            </p>
            <p style={{ ...bodyStyle, marginTop: "0.6rem", color: "var(--ow-text-mid)", fontStyle: "italic" }}>
              90-second look below; no signup needed.
            </p>
          </div>
        )}

        {/* 3-tile "What Ownology does" block. Same panelStyle as the hook
            block — one consistent card treatment across the page. Acronym
            tooltips inline so a first-tap winemaker can decode WBS / LIP /
            HACCP / AWRI without leaving. */}
        <div
          data-testid="hi-what-ownology-does"
          data-qms-variant={qmsVariant}
          style={{ ...panelStyle, marginTop: "1.25rem" }}
        >
          <p style={{ ...eyebrowStyle, marginBottom: "0.9rem" }}>What Ownology does</p>
          <div style={{ display: "grid", gap: "0.55rem" }}>
            <WhatTile
              testid="hi-tile-records"
              kicker="Records"
              body={<>Every batch, every vessel — one source of truth across the vintage.</>}
            />
            <WhatTile
              testid="hi-tile-compliance"
              kicker="Compliance"
              body={
                <>
                  <AcronymTooltip term="WBS" />, <AcronymTooltip term="LIP" /> and{" "}
                  <AcronymTooltip term="HACCP" /> records auto-log as you work. Audit-ready PDF in 60 seconds.
                </>
              }
            />
            <WhatTile
              testid="hi-tile-ai"
              kicker="Working memory"
              body={
                <>
                  Owen answers with citations — grounded in <AcronymTooltip term="AWRI" />,
                  Boulton, Iland, and your own logs.
                </>
              }
            />
          </div>
          <p
            data-testid="hi-what-summary"
            style={{
              marginTop: "0.9rem",
              fontFamily: SERIF,
              fontStyle: "italic",
              fontSize: "0.98rem",
              lineHeight: 1.4,
              color: "var(--ow-text-mid)",
              textAlign: "center",
            }}
          >
            {qmsVariant === "qms" ? (
              <>
                A winemaking <AcronymTooltip term="QMS" /> with a working memory.
              </>
            ) : (
              qmsSummary
            )}
          </p>
        </div>

        {/* Authority strip — moved up from footer per Feb 2026 sales-psych
            audit. Same panel treatment as everything else on the page. */}
        <div data-testid="hi-authority" style={{ ...panelStyle, marginTop: "1.25rem", textAlign: "center" }}>
          <p style={{ ...bodyStyle, color: "var(--ow-text-mid)" }}>
            Built by a working winemaker · Cited from 12+ industry bibles including{" "}
            <AcronymTooltip term="AWRI" />, Boulton and Iland.
          </p>
        </div>

        {/* Persona-tuned value bullets — 5 variants per persona (see
            /app/client/src/lib/hi-personas.ts). Starting variant is
            deterministic per contact slug so first-time visitors see a
            stable index that differs across prospects. Each subsequent
            view advances by one so returning visitors get fresh copy. */}
        {(() => {
          const persona: HiPersona = ((contact.persona as HiPersona | null) ?? "winemaker");
          const VARIANTS = HI_VARIANTS_BY_PERSONA[persona] ?? HI_VARIANTS_BY_PERSONA.winemaker;
          let h = 0;
          for (let i = 0; i < slug.length; i++) h = (h * 31 + slug.charCodeAt(i)) | 0;
          const startIdx = Math.abs(h) % VARIANTS.length;
          const viewCount = contact.viewCount ?? 0;
          const bullets = VARIANTS[(startIdx + viewCount) % VARIANTS.length];
          return (
            <ul
              style={{ listStyle: "none", padding: 0, margin: "1.75rem 0 0" }}
              data-testid={`hi-bullets-${persona}`}
            >
              {bullets.map((s, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.7rem",
                    marginBottom: "0.85rem",
                    fontFamily: SANS,
                    fontSize: "0.95rem",
                    lineHeight: 1.55,
                    color: "var(--ow-text-mid)",
                  }}
                >
                  <span style={{ color: "var(--ow-amber)", flexShrink: 0, marginTop: 2 }}>✦</span>
                  <span dangerouslySetInnerHTML={{ __html: s }} />
                </li>
              ))}
            </ul>
          );
        })()}

        {/* Topical journal card — social proof */}
        <TopicalJournalCard slug={contact.slug} />

        {/* Primary CTA — A/B variant chosen server-side per slug */}
        {ctaVariant === "reply" && smsReplyHref ? (
          <>
            <a
              href={smsReplyHref}
              data-testid="hi-cta-primary"
              data-cta-variant="reply"
              onClick={handleSmsCtaClick}
              style={btnPrimary}
            >
              Text me to lock my onboarding →
            </a>
            {smsCopyHint && (
              <p
                data-testid="hi-cta-sms-hint"
                style={{
                  marginTop: "0.6rem",
                  fontFamily: SANS,
                  fontSize: "0.82rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.45,
                  padding: "0.55rem 0.75rem",
                  background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                  borderRadius: 6,
                }}
              >
                {smsCopyHint}
              </p>
            )}
          </>
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
            {CALENDLY_FALLBACK_LABEL} →
          </a>
        ) : (
          <a
            href={tryNowHref}
            data-testid="hi-cta-primary"
            data-cta-variant="fallback"
            onClick={logCtaClick}
            style={btnPrimary}
          >
            See a real-time vintage log →
          </a>
        )}

        {/* WhatsApp offer — appears whenever a WA number is configured.
             Deliberately quieter than the primary CTA. */}
        {waHref && (
          <a
            href={waHref}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="hi-cta-whatsapp"
            data-cta-channel="whatsapp"
            onClick={logCtaClick}
            style={btnSecondary}
          >
            Have WhatsApp? Easier for photos &amp; docs →
          </a>
        )}

        {/* Secondary CTA — sample vintage log */}
        <a
          href={tryNowHref}
          data-testid="hi-cta-secondary"
          style={btnSecondary}
        >
          See a sample 2026 vintage log →
        </a>

        {/* Tertiary CTA — the LIVE Cellar Brief running on real seeded data */}
        <Link
          href={`/cellar-brief?from=sms-${contact.slug}`}
          data-testid="hi-cta-cellar-brief"
          style={btnTertiary}
        >
          See today&apos;s live Cellar Brief →
        </Link>

        {/* Signature */}
        <p style={{
          marginTop: "2.5rem",
          fontFamily: SANS,
          fontSize: "0.82rem",
          color: "var(--ow-text-lo)",
          textAlign: "center",
        }}>
          — Built by a working winemaker, for working winemakers.
        </p>
        <p style={{
          fontFamily: SANS,
          fontSize: "0.72rem",
          color: "var(--ow-text-lo)",
          marginTop: "1.75rem",
          textAlign: "center",
          opacity: 0.8,
        }}>
          This page is personalised for you. Reply STOP to opt out of future messages.
        </p>
      </div>
    </div>
  );
}

/**
 * WhatTile — one row of the "What Ownology does" 3-tile block.
 * Sits inside the parent panel (no border of its own) so the 3 rows
 * feel like items in a list, not competing panels.
 */
function WhatTile({ kicker, body, testid }: { kicker: string; body: React.ReactNode; testid: string }) {
  return (
    <div
      data-testid={testid}
      style={{
        display: "grid",
        gridTemplateColumns: "auto 1fr",
        alignItems: "start",
        gap: "0.85rem",
        padding: "0.55rem 0",
        borderTop: "1px solid var(--ow-border)",
      }}
    >
      <span
        style={{
          fontFamily: SANS,
          fontSize: 10,
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          color: "var(--ow-amber)",
          fontWeight: 800,
          whiteSpace: "nowrap",
          paddingTop: 3,
          minWidth: 78,
        }}
      >
        {kicker}
      </span>
      <span
        style={{
          fontFamily: SANS,
          fontSize: "0.88rem",
          lineHeight: 1.5,
          color: "var(--ow-text-hi)",
        }}
      >
        {body}
      </span>
    </div>
  );
}

/**
 * TopicalJournalCard — surfaces 1 recently-asked question from the public
 * /cellar-journal as instant social proof. Deterministic pick per slug so
 * the same visitor sees the same card across refreshes.
 */
function TopicalJournalCard({ slug }: { slug: string }) {
  const { data } = trpc.cellarJournal.list.useQuery({ limit: 24 }, { retry: false });
  const rows = data?.rows ?? [];
  if (rows.length === 0) return null;
  let hash = 0;
  for (let i = 0; i < slug.length; i++) hash = (hash * 31 + slug.charCodeAt(i)) | 0;
  const pick = rows[Math.abs(hash) % rows.length];
  return (
    <div
      data-testid="hi-journal-card"
      style={{ ...panelStyle, marginTop: "1.75rem" }}
    >
      <p style={{ ...eyebrowStyle, marginBottom: "0.55rem" }}>
        Recently asked in the journal
      </p>
      <p
        data-testid="hi-journal-q"
        style={{
          fontFamily: SERIF,
          fontStyle: "italic",
          fontSize: "1.02rem",
          lineHeight: 1.35,
          color: "var(--ow-text-hi)",
          margin: 0,
        }}
      >
        {pick.question}
      </p>
      <Link
        href={`/cellar-journal/${pick.slug}?from=hi-${slug}`}
        data-testid="hi-journal-readmore"
        style={{
          display: "inline-block",
          marginTop: "0.6rem",
          fontFamily: SANS,
          fontSize: "0.82rem",
          color: "var(--ow-amber)",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Read the answer →
      </Link>
    </div>
  );
}

// --- Layout tokens -----------------------------------------------------
const inner: CSSProperties = {
  width: "100%",
  maxWidth: 540,
  padding: "2rem 1.25rem 4rem",
};
const wrap: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--ow-bg-base)",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
};
const loading: CSSProperties = {
  minHeight: "100dvh",
  background: "var(--ow-bg-base)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  fontFamily: SANS,
  color: "var(--ow-text-lo)",
  fontSize: "0.85rem",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
};

// --- Typography tokens -------------------------------------------------
const bodyStyle: CSSProperties = {
  fontFamily: SANS,
  fontSize: "0.94rem",
  lineHeight: 1.55,
  color: "var(--ow-text-hi)",
  margin: 0,
};
const eventLine: CSSProperties = {
  fontFamily: SERIF,
  fontStyle: "italic",
  fontSize: "1.15rem",
  lineHeight: 1.35,
  color: "var(--ow-text-mid)",
  marginTop: "0.55rem",
  marginBottom: 0,
};
const amberInline: CSSProperties = {
  color: "var(--ow-amber)",
  fontStyle: "normal",
  fontWeight: 600,
};

// --- Button tokens -----------------------------------------------------
const btnPrimary: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.95rem 1.25rem",
  marginTop: "1.75rem",
  background: "var(--ow-amber)",
  color: "oklch(0.15 0.012 60)",
  fontFamily: SANS,
  fontWeight: 700,
  fontSize: "0.98rem",
  textAlign: "center",
  textDecoration: "none",
  borderRadius: 6,
  letterSpacing: "0.02em",
};
const btnSecondary: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.8rem 1.25rem",
  marginTop: "0.55rem",
  background: "transparent",
  color: "var(--ow-text-hi)",
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: "0.88rem",
  textAlign: "center",
  textDecoration: "none",
  border: "1px solid var(--ow-border)",
  borderRadius: 6,
};
const btnTertiary: CSSProperties = {
  display: "block",
  width: "100%",
  padding: "0.75rem 1.25rem",
  marginTop: "0.55rem",
  background: "transparent",
  color: "var(--ow-text-mid)",
  fontFamily: SANS,
  fontWeight: 600,
  fontSize: "0.85rem",
  textAlign: "center",
  textDecoration: "none",
  border: "1px dashed var(--ow-border)",
  borderRadius: 6,
  letterSpacing: "0.01em",
};
