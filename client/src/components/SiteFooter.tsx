/**
 * SiteFooter — global footer mounted on public marketing pages via App.tsx.
 * Was previously inlined only in Home.tsx which left /pricing, /cellar-journal,
 * /join, /privacy, /terms, /refund without any legal-link footer — a launch
 * blocker for AU Privacy Act / GDPR trust signals and Google-visible legal
 * links from every page.
 *
 * Auto-hides on kiosk-y routes (/admin/*, /hi/*, /auth/*, /cellar-brief) where
 * a marketing footer would clutter the working UI.
 */
import { Link, useLocation } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

// Suppress on any page that provides its own minimal footer or has none at
// all (admin surfaces, gated auth flows, work-mode-adjacent pages). This
// keeps prospect surfaces free of the shopping-mall marketing footer.
const SUPPRESS_PREFIXES = ["/admin", "/hi/", "/auth/", "/login", "/cellar-brief", "/onboarding", "/try", "/founding-partners", "/join", "/call-playbook"];

const footerLinkStyle: React.CSSProperties = {
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.8125rem",
  color: "var(--ow-text-lo)",
  textDecoration: "none",
  display: "block",
  padding: "0.15rem 0",
  transition: "color 180ms ease",
};

const hover = (e: React.MouseEvent<HTMLAnchorElement>) =>
  (e.currentTarget.style.color = "var(--ow-amber)");
const unhover = (e: React.MouseEvent<HTMLAnchorElement>) =>
  (e.currentTarget.style.color = "var(--ow-text-lo)");

// ── Public footer ───────────────────────────────────────────────────────
// Rich, Feb 2026: "we're sharing too much info on the main site."
// Trimmed from 4 columns × ~13 links → single essentials-only column
// (Legal only). Everything else — Pricing, Try, Cellar Journal, Cellar
// Brief, Guide, Blog — lives in primary nav, in-page pillar cards, or
// contextual links. Prospects should not need a shopping-mall footer to
// find their way around.
const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; testid?: string }> }> = [
  {
    heading: "Legal",
    links: [
      { label: "Privacy policy", href: "/privacy", testid: "footer-privacy" },
      { label: "Terms of service", href: "/terms", testid: "footer-terms" },
      { label: "Refund policy", href: "/refund", testid: "footer-refund" },
    ],
  },
];

export function SiteFooter() {
  const [pathname] = useLocation();
  if (SUPPRESS_PREFIXES.some((p) => pathname.startsWith(p))) return null;

  return (
    <footer className="py-12" data-testid="site-footer" style={{ borderTop: "1px solid var(--ow-border)" }}>
      <div className="container">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-8">
          <div style={{ maxWidth: "360px" }}>
            <OwnologyLogo size={28} />
            <p
              className="mt-4"
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.8125rem",
                color: "var(--ow-text-lo)",
                lineHeight: 1.55,
                margin: "1rem 0 0",
              }}
            >
              AI knowledge assistant for boutique winemakers.
              <br />
              Aus &middot; NZ &middot; US.
            </p>
            <p
              data-testid="footer-strapline"
              style={{
                fontFamily: "Georgia, serif",
                fontSize: "0.85rem",
                color: "var(--ow-amber)",
                fontStyle: "italic",
                lineHeight: 1.4,
                margin: "0.75rem 0 0",
                letterSpacing: "0.01em",
              }}
            >
              You are the must.
              <br />
              Ownology is the ferment.
            </p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ow-text-mid)",
                  margin: "0 0 0.75rem 0",
                  fontWeight: 700,
                }}
              >
                {col.heading}
              </p>
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  data-testid={l.testid}
                  style={footerLinkStyle}
                  onMouseEnter={hover}
                  onMouseLeave={unhover}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3"
          style={{ borderTop: "1px solid var(--ow-border)" }}
        >
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.75rem",
              color: "var(--ow-text-lo)",
              margin: 0,
            }}
          >
            © 2026 Ownology.
          </p>
        </div>
      </div>
    </footer>
  );
}
