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

const SUPPRESS_PREFIXES = ["/admin", "/hi/", "/auth/", "/login", "/cellar-brief", "/onboarding", "/try"];

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

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string; testid?: string }> }> = [
  {
    heading: "Product",
    links: [
      { label: "Pricing", href: "/pricing" },
      { label: "Cellar Brief", href: "/cellar-brief", testid: "footer-cellar-brief" },
      { label: "Guide", href: "/guide" },
    ],
  },
  {
    heading: "Learn",
    links: [
      { label: "Cellar Journal", href: "/cellar-journal", testid: "footer-cellar-journal" },
      { label: "Try the sandbox", href: "/try", testid: "footer-try" },
      { label: "Public roadmap", href: "/todo", testid: "footer-todo" },
      { label: "Wine Quiz", href: "/quiz", testid: "footer-quiz" },
      { label: "Our Story", href: "/#our-story" },
      { label: "Weight of Harvest", href: "/#weight-of-harvest" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "Join", href: "/join" },
      { label: "Onboarding", href: "/onboarding" },
    ],
  },
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
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 md:gap-10">
          <div>
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
            © 2026 Ownology. Made in Adelaide Hills.
          </p>
          <div className="flex gap-4">
            <a
              href="/api/cellar-journal/rss.xml"
              style={{ ...footerLinkStyle, padding: 0 }}
              onMouseEnter={hover}
              onMouseLeave={unhover}
              data-testid="footer-rss"
            >
              RSS
            </a>
            <Link
              href="/site-map"
              style={{ ...footerLinkStyle, padding: 0 }}
              onMouseEnter={hover}
              onMouseLeave={unhover}
              data-testid="footer-sitemap-page"
            >
              Site map
            </Link>
            <a
              href="/api/sitemap.xml"
              style={{ ...footerLinkStyle, padding: 0 }}
              onMouseEnter={hover}
              onMouseLeave={unhover}
              data-testid="footer-sitemap-xml"
            >
              Sitemap.xml
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
