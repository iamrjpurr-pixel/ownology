/**
 * AdminDev — the single jump-off page for every dev-time tooling surface.
 *
 * Why this exists:
 *   Scattered internal tools (responsive viewer, theme picker, cascade
 *   demo, A/B funnel stats, contacts pipeline) lived behind URLs nobody
 *   remembered. If you forget the tool exists, you don't use it, bugs
 *   pile up, rework burns credits.
 *
 *   /admin/dev = ONE bookmark. Every internal check tool is one click away.
 *   Cards are grouped by *when you would use them* so you never have to
 *   remember the URL — you remember the task ("I just changed the theme")
 *   and the page tells you which tool to open.
 *
 * Not shown in production unless an admin is signed in (gated by
 * /admin/* route protection).
 */
import { Link } from "wouter";

type ToolCard = {
  title: string;
  blurb: string;
  href: string;
  internal: boolean; // true → wouter Link, false → external <a>
  cta: string;
};

type ToolGroup = {
  groupTitle: string;
  groupBlurb: string;
  tools: ToolCard[];
};

const GROUPS: ToolGroup[] = [
  {
    groupTitle: "After a UI change",
    groupBlurb: "Run these before you push. Catches layout regressions across phone/tablet/desktop in one shot.",
    tools: [
      {
        title: "Responsive viewer",
        blurb: "All three viewports (iPhone, iPad, Desktop) side-by-side. Type any path, see breakage instantly.",
        href: "/admin/responsive",
        internal: true,
        cta: "Open viewer",
      },
      {
        title: "Compare themes",
        blurb: "Re-open the theme picker any time. Click through all 6 themes on the current page to spot mode-specific bugs.",
        href: "#open-theme-picker",
        internal: false,
        cta: "Open picker",
      },
      {
        title: "Crush cascade test",
        blurb: "Trigger the Red Crush / White Crush cinematic animation in isolation to verify timing + colour wash.",
        href: "/cascade-demo",
        internal: true,
        cta: "Run animation",
      },
    ],
  },
  {
    groupTitle: "Sales & traction",
    groupBlurb: "Live metrics on the conversion funnel — waitlist, A/B test wins, prospect pipeline.",
    tools: [
      {
        title: "Owner panel",
        blurb: "Waitlist size, Founding Member count, merch orders, LLM budget burn.",
        href: "/admin",
        internal: true,
        cta: "Open panel",
      },
      {
        title: "Contacts CRM",
        blurb: "SMS-prospect pipeline: list view + Kanban board. Track sent / clicked / booked / closed.",
        href: "/admin/contacts",
        internal: true,
        cta: "Open contacts",
      },
      {
        title: "A/B funnel stats",
        blurb: "Live wins for Reply RED vs Book Demo CTAs on /hi/:slug landings.",
        href: "/admin/contacts",
        internal: true,
        cta: "Open funnel",
      },
    ],
  },
  {
    groupTitle: "Content & SOPs",
    groupBlurb: "Quick links into the content library to audit copy, formulas, and regulation references.",
    tools: [
      {
        title: "SOP library",
        blurb: "All 38 SOPs across 12 categories. Boutique companions, metric defaults.",
        href: "/knowledge",
        internal: true,
        cta: "Browse",
      },
      {
        title: "Free Run preview",
        blurb: "Public AI cellar assistant view. Test what cold prospects experience.",
        href: "/free-run",
        internal: true,
        cta: "Open Free Run",
      },
      {
        title: "Sample vintage log",
        blurb: "The seeded sample data shown to /hi/:slug prospects. Verify recommendation grounding.",
        href: "/sample-vintage-log",
        internal: true,
        cta: "View log",
      },
    ],
  },
  {
    groupTitle: "Reference docs",
    groupBlurb: "Strategic specs + architecture in /app/memory/.",
    tools: [
      {
        title: "PRD",
        blurb: "Current product requirements & in-flight backlog. /app/memory/PRD.md",
        href: "/admin",
        internal: true,
        cta: "(see editor)",
      },
      {
        title: "Responsive audit",
        blurb: "Last layout audit findings + how to re-run. /app/memory/RESPONSIVE_AUDIT.md",
        href: "/admin",
        internal: true,
        cta: "(see editor)",
      },
      {
        title: "Test credentials",
        blurb: "Auth setup, dev-bypass behaviour. /app/memory/test_credentials.md",
        href: "/admin",
        internal: true,
        cta: "(see editor)",
      },
    ],
  },
];

function handleClick(href: string, e: React.MouseEvent) {
  if (href === "#open-theme-picker") {
    e.preventDefault();
    window.dispatchEvent(new CustomEvent("ownology:open-theme-picker"));
  }
}

export default function AdminDev() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        padding: "2rem 1.5rem 4rem",
        fontFamily: "'Lato',sans-serif",
      }}
      data-testid="admin-dev-page"
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <Link
            to="/admin"
            style={{
              fontSize: "0.74rem",
              color: "var(--ow-text-lo)",
              textDecoration: "none",
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              fontWeight: 700,
            }}
          >
            ← Admin
          </Link>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontSize: "2rem",
              fontWeight: 700,
              margin: "0.5rem 0 0.4rem",
              letterSpacing: "-0.01em",
            }}
          >
            Dev Tools
          </h1>
          <p
            style={{
              fontSize: "0.94rem",
              color: "var(--ow-text-mid)",
              maxWidth: 640,
              lineHeight: 1.5,
            }}
          >
            One bookmark for every internal check tool. After a UI change, scan the
            cards under <strong>"After a UI change"</strong> below — that's the
            difference between catching a bug in 30 seconds and pushing it to prod.
          </p>
        </div>

        {/* Quick-check banner */}
        <div
          data-testid="dev-quick-check"
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            borderRadius: 6,
            padding: "0.9rem 1.1rem",
            marginBottom: "2rem",
            display: "flex",
            alignItems: "center",
            gap: 12,
            flexWrap: "wrap",
          }}
        >
          <span
            style={{
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
            }}
          >
            Quick check
          </span>
          <span style={{ fontSize: "0.86rem", color: "var(--ow-text-hi)" }}>
            Just changed something? Open
          </span>
          <Link
            to="/admin/responsive"
            style={{
              background: "var(--ow-amber)",
              color: "white",
              padding: "0.4rem 0.9rem",
              borderRadius: 4,
              textDecoration: "none",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
            }}
            data-testid="dev-jump-responsive"
          >
            Responsive viewer →
          </Link>
        </div>

        {/* Tool groups */}
        {GROUPS.map((g) => (
          <section key={g.groupTitle} style={{ marginBottom: "2.4rem" }}>
            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: "1.1rem",
                fontWeight: 700,
                margin: "0 0 0.2rem",
              }}
            >
              {g.groupTitle}
            </h2>
            <p
              style={{
                fontSize: "0.84rem",
                color: "var(--ow-text-lo)",
                marginTop: 0,
                marginBottom: "0.9rem",
                maxWidth: 720,
              }}
            >
              {g.groupBlurb}
            </p>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
                gap: 12,
              }}
            >
              {g.tools.map((t) => {
                const linkProps = {
                  "data-testid": `dev-tool-${t.title.toLowerCase().replace(/\s+/g, "-")}`,
                  style: {
                    display: "block",
                    background: "var(--ow-bg-card)",
                    border: "1px solid var(--ow-border-md)",
                    borderRadius: 6,
                    padding: "0.95rem 1rem 0.85rem",
                    textDecoration: "none",
                    color: "inherit",
                    transition: "border-color 0.15s, transform 0.15s",
                  },
                };
                const cardBody = (
                  <>
                    <div
                      style={{
                        fontFamily: "'Fraunces',serif",
                        fontSize: "0.96rem",
                        fontWeight: 700,
                        color: "var(--ow-text-hi)",
                        marginBottom: 2,
                      }}
                    >
                      {t.title}
                    </div>
                    <div
                      style={{
                        fontSize: "0.78rem",
                        color: "var(--ow-text-mid)",
                        lineHeight: 1.4,
                        marginBottom: "0.6rem",
                      }}
                    >
                      {t.blurb}
                    </div>
                    <div
                      style={{
                        fontSize: "0.7rem",
                        fontWeight: 700,
                        color: "var(--ow-amber)",
                        letterSpacing: "0.05em",
                      }}
                    >
                      {t.cta} →
                    </div>
                  </>
                );
                return t.internal ? (
                  <Link key={t.title} to={t.href} {...linkProps}>
                    {cardBody}
                  </Link>
                ) : (
                  <a
                    key={t.title}
                    href={t.href}
                    onClick={(e) => handleClick(t.href, e)}
                    {...linkProps}
                  >
                    {cardBody}
                  </a>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
