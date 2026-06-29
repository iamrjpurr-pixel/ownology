/**
 * /admin/marketing-kit — single reference page for outreach assets.
 *
 * Bookmark this. One-click copy for:
 *  - Variant-specific sample-vintage-log demo URLs (large / hunter / boutique)
 *  - Email signatures (preview-domain + ownology.ai variants)
 *  - LinkedIn DM templates (Hunter / Boutique / Production-scale)
 *
 * No backend calls — everything is local copy. The "Live links" section
 * uses window.location.origin so URLs always match the current deployment
 * (preview today, ownology.ai when DNS is pointed).
 */
import { useState } from "react";
import { Link } from "wouter";

type Copyable = { id: string; label: string; content: string; hint?: string };

const DEMO_URL_VARIANTS: Array<{ slug: string; label: string; subtext: string; param: string }> = [
  { slug: "large",    label: "Default (128 tanks)",       subtext: "Production-scale producers · multi-region",      param: "" },
  { slug: "hunter",   label: "Hunter Valley (24 tanks)",  subtext: "Hunter wineries · Semillon & Shiraz country",   param: "?variant=hunter" },
  { slug: "boutique", label: "Boutique (12 tanks)",       subtext: "Indie labels · family-scale producers",          param: "?variant=boutique" },
];

const LINKEDIN_DM_A_HUNTER = (origin: string) => `G'day [First name] — saw you're at [Winery] in the Hunter.

Building a cellar AI grounded in your own vintage logs — so "Brix on T-03 plateaued for 36h, what's typical for this clone here?" actually gets answered against your history, not a forum guess.

90-sec mockup of what it'd look like at Hunter scale (24 tanks, Semillon & Shiraz country):
${origin}/sample-vintage-log?variant=hunter

No signup, no sales pitch. Just curious if it'd be useful to you. Happy to chat anytime.

— Jamie`;

const LINKEDIN_DM_B_BOUTIQUE = (origin: string) => `G'day [First name] — love what you're doing with [Winery].

Been building a cellar AI for small producers — answers grounded in your own logs, not Vinepair threads. The kind of thing that remembers what you did in T-04 last vintage and references it next time.

12-tank, family-scale mockup of how it surfaces what matters:
${origin}/sample-vintage-log?variant=boutique

No signup. Keen to hear what you'd want it to do differently.

— Jamie`;

const LINKEDIN_DM_C_LARGE = (origin: string) => `G'day [First name] — building a cellar AI for production-scale wineries.

Grounds every recommendation in your own vintage logs — so "what did we do in T-47 last year?" gets answered, not auto-completed.

128-tank sample dashboard:
${origin}/sample-vintage-log

20-min demo if you've got 5 min curious:
calendly.com/ownology/new-meeting

— Jamie`;

const EMAIL_SIG_PREVIEW = (origin: string) => `— Jamie · Ownology
Cellar AI grounded in your own vintage logs — built for working winemakers
↳ ${origin.replace(/^https?:\/\//, "")}/sample-vintage-log`;

const EMAIL_SIG_PROD = `— Jamie · Ownology
Cellar AI grounded in your own vintage logs — built for working winemakers
↳ ownology.ai/sample-vintage-log`;

export default function AdminMarketingKit() {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const [copiedId, setCopiedId] = useState<string | null>(null);

  function copy(id: string, content: string) {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      navigator.clipboard.writeText(content);
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1500);
    }
  }

  const linkedInTemplates: Copyable[] = [
    { id: "dm-hunter",    label: "Hunter Valley prospects",        content: LINKEDIN_DM_A_HUNTER(origin),   hint: "Use when prospect is at a Hunter Valley winery" },
    { id: "dm-boutique",  label: "Boutique / indie label prospects", content: LINKEDIN_DM_B_BOUTIQUE(origin), hint: "Use for small/cult/single-vineyard labels" },
    { id: "dm-large",     label: "Production-scale prospects",      content: LINKEDIN_DM_C_LARGE(origin),    hint: "Ends with Calendly — production folks book direct" },
  ];

  const emailSigs: Copyable[] = [
    { id: "sig-preview", label: "Current (preview domain)",   content: EMAIL_SIG_PREVIEW(origin), hint: "Use today — points at the live preview URL" },
    { id: "sig-prod",    label: "Future (ownology.ai)",        content: EMAIL_SIG_PROD,            hint: "Swap to this once DNS is pointed" },
  ];

  return (
    <div data-testid="admin-marketing-kit-page" className="container py-8" style={{ maxWidth: 960 }}>
      <Link
        href="/admin"
        style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}
      >
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
        Outreach assets
      </p>
      <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
        Marketing kit
      </h1>
      <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 680 }}>
        Bookmark this page. Every URL, email signature, and LinkedIn DM template you need to drip Ownology into the wild — one tap to copy each.
      </p>

      {/* DEMO URLS */}
      <Section title="Sample vintage log — variant URLs" subtitle="One demo file, three audiences. Send the one that matches the prospect.">
        {DEMO_URL_VARIANTS.map((v) => {
          const url = `${origin}/sample-vintage-log${v.param}`;
          return (
            <CopyRow
              key={v.slug}
              id={`demo-${v.slug}`}
              label={v.label}
              subtext={v.subtext}
              content={url}
              copiedId={copiedId}
              onCopy={copy}
              renderContent={() => (
                <code style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.78rem", color: "var(--ow-text-hi)", wordBreak: "break-all" }}>
                  {url}
                </code>
              )}
              extra={
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.72rem",
                    color: "var(--ow-amber)",
                    textDecoration: "none",
                    border: "1px solid var(--ow-amber)",
                    padding: "4px 10px",
                    borderRadius: 4,
                  }}
                  data-testid={`demo-${v.slug}-open`}
                >
                  Open ↗
                </a>
              }
            />
          );
        })}
      </Section>

      {/* EMAIL SIGNATURES */}
      <Section title="Email signature" subtitle="Drop into Gmail / Outlook / Apple Mail. Auto-trickle traffic to the sample dashboard.">
        {emailSigs.map((sig) => (
          <CopyRow
            key={sig.id}
            id={sig.id}
            label={sig.label}
            subtext={sig.hint}
            content={sig.content}
            copiedId={copiedId}
            onCopy={copy}
            renderContent={() => (
              <pre style={preStyle}>{sig.content}</pre>
            )}
          />
        ))}
      </Section>

      {/* LINKEDIN DM TEMPLATES */}
      <Section title="LinkedIn DM templates" subtitle="Replace [First name] and [Winery] before sending. Under 90 words each so LinkedIn doesn't truncate.">
        {linkedInTemplates.map((dm) => (
          <CopyRow
            key={dm.id}
            id={dm.id}
            label={dm.label}
            subtext={dm.hint}
            content={dm.content}
            copiedId={copiedId}
            onCopy={copy}
            renderContent={() => (
              <pre style={preStyle}>{dm.content}</pre>
            )}
          />
        ))}
      </Section>

      {/* QUICK LINKS */}
      <Section title="Operational links" subtitle="The other tools you'll use alongside this kit.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
          <QuickLink href="/admin/contacts" label="Contacts CRM" subtext="Add / edit / triage prospects" />
          <QuickLink href="/admin/contacts/pipeline" label="Pipeline board" subtext="Trello-style outreach board" />
          <QuickLink href="/admin/funnel" label="Conversion funnel" subtext="Source attribution + Conv %" />
        </div>
      </Section>

      <p className="mt-6" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", maxWidth: 680 }}>
        Tip: paste any of the variant URLs into your phone&apos;s notes app once. Then in the field at a wine event, you can text or AirDrop the right one to a winemaker in seconds.
      </p>
    </div>
  );
}

function Section({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: 36 }}>
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", color: "var(--ow-text-hi)", margin: 0 }}>
        {title}
      </h2>
      {subtitle && (
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", margin: "4px 0 14px" }}>
          {subtitle}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
    </section>
  );
}

function CopyRow({
  id,
  label,
  subtext,
  content,
  copiedId,
  onCopy,
  renderContent,
  extra,
}: {
  id: string;
  label: string;
  subtext?: string;
  content: string;
  copiedId: string | null;
  onCopy: (id: string, c: string) => void;
  renderContent: () => React.ReactNode;
  extra?: React.ReactNode;
}) {
  const copied = copiedId === id;
  return (
    <div
      data-testid={`mk-row-${id}`}
      className="rounded p-3"
      style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
    >
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10, flexWrap: "wrap", marginBottom: 6 }}>
        <div>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-hi)", margin: 0, fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>
            {label}
          </p>
          {subtext && (
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: 0, fontStyle: "italic" }}>
              {subtext}
            </p>
          )}
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {extra}
          <button
            type="button"
            data-testid={`mk-copy-${id}`}
            onClick={() => onCopy(id, content)}
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              fontWeight: 700,
              padding: "4px 10px",
              border: copied ? "1px solid #10b981" : "1px solid var(--ow-amber)",
              background: copied ? "#10b981" : "var(--ow-amber)",
              color: copied ? "white" : "oklch(0.10 0.008 60)",
              borderRadius: 4,
              cursor: "pointer",
              minWidth: 64,
              transition: "all 120ms ease",
            }}
          >
            {copied ? "✓ Copied" : "Copy"}
          </button>
        </div>
      </div>
      <div>{renderContent()}</div>
    </div>
  );
}

function QuickLink({ href, label, subtext }: { href: string; label: string; subtext: string }) {
  return (
    <Link
      href={href}
      data-testid={`mk-quicklink-${href.replace(/[^a-z0-9]+/gi, "-")}`}
      style={{
        display: "block",
        padding: "10px 12px",
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
        borderLeft: "3px solid var(--ow-amber)",
        borderRadius: 4,
        textDecoration: "none",
      }}
    >
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-hi)", margin: 0, fontWeight: 700 }}>
        {label} →
      </p>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "2px 0 0" }}>
        {subtext}
      </p>
    </Link>
  );
}

const preStyle: React.CSSProperties = {
  margin: 0,
  padding: 10,
  background: "color-mix(in oklch, var(--ow-amber) 4%, transparent)",
  border: "1px solid var(--ow-border)",
  borderRadius: 4,
  fontFamily: "'Fira Code',monospace",
  fontSize: "0.78rem",
  color: "var(--ow-text-hi)",
  whiteSpace: "pre-wrap",
  lineHeight: 1.55,
};
