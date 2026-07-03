/**
 * SiteMap — human-readable map of every route on ownology.ai.
 *
 * Two ways in:
 *   1. Logged in as admin — full access (dev bypass or Emergent Google OAuth admin)
 *   2. Anyone with the shared key: /site-map?k=carrie2026 — Rich & Gel's
 *      bookmark for "where does X live?" without needing to log in.
 *
 * This page is client-side only — no backend call. It reads a hand-maintained
 * registry below. If a new route is added to App.tsx, add it here too so this
 * stays a useful map of the app. Deliberately not auto-generated: some routes
 * are staff-only mockups we don't want on the customer-facing map.
 */
import { Link } from "wouter";
import { SiteFooter } from "@/components/SiteFooter";

const SHARED_KEY = "carrie2026";

interface Route {
  path: string;
  label: string;
  desc: string;
  audience?: "public" | "member" | "admin";
}

interface Section {
  title: string;
  blurb: string;
  routes: Route[];
}

const SECTIONS: Section[] = [
  {
    title: "Public — for people who found you",
    blurb: "Anyone can hit these. This is what real users see.",
    routes: [
      { path: "/",                     label: "Home",                desc: "Hero, pricing teaser, blog feed", audience: "public" },
      { path: "/quiz",                 label: "Wine Recommender Quiz", desc: "6 questions → wine pick → Founding Member funnel", audience: "public" },
      { path: "/pricing",              label: "Pricing",             desc: "Founding Member plans + reservation modal", audience: "public" },
      { path: "/cellar-journal",       label: "Cellar Journal",      desc: "Public SOPs + Q&A index — the SEO compounder", audience: "public" },
      { path: "/our-story",            label: "Our Story",           desc: "Richard & Geraldine's origin", audience: "public" },
      { path: "/why-ownology",         label: "Why Ownology",        desc: "The value proposition long-form", audience: "public" },
      { path: "/the-press",            label: "The Press",           desc: "Product page — cellar operations", audience: "public" },
      { path: "/free-run",             label: "Free Run",            desc: "Product page — AI assistant", audience: "public" },
      { path: "/blog",                 label: "Blog",                desc: "Long-form marketing content index", audience: "public" },
      { path: "/blog/weight-of-harvest", label: "Blog — Weight of Harvest", desc: "Featured post", audience: "public" },
      { path: "/blog/two-philosophies",  label: "Blog — Two Philosophies", desc: "Featured post", audience: "public" },
      { path: "/for-home-winemakers",  label: "For Home Winemakers", desc: "DIY track landing", audience: "public" },
      { path: "/for-home-winemakers/troubleshooting", label: "DIY — Troubleshooting", desc: "Home winemaker fault library", audience: "public" },
      { path: "/for-home-winemakers/glossary", label: "DIY — Glossary", desc: "Home winemaker term index", audience: "public" },
      { path: "/for-home-winemakers/knowledge", label: "DIY — Knowledge", desc: "Home winemaker SOP browser", audience: "public" },
      { path: "/compliance",           label: "Compliance",          desc: "LIP FSANZ + state licensing overview", audience: "public" },
      { path: "/regulations",          label: "Regulations",         desc: "Wine Australia + FSANZ regulatory links", audience: "public" },
      { path: "/resources",            label: "Resources",           desc: "Curated external winemaking references", audience: "public" },
      { path: "/merch",                label: "Merch",               desc: "Founding Member merch (cap, apron, tumbler)", audience: "public" },
      { path: "/refund",               label: "Refund policy",       desc: "Consumer policy", audience: "public" },
    ],
  },
  {
    title: "Founder / winemaker daily use",
    blurb: "This is where you spend your Daily 10 minutes. See the Playbook (§1) for the routine.",
    routes: [
      { path: "/dashboard",            label: "Dashboard",           desc: "Live cellar overview + alerts + tank status", audience: "member" },
      { path: "/cellar-brief",         label: "Cellar Brief",        desc: "Today's AI-triaged tasks + additions (also emailed 5:30am)", audience: "member" },
      { path: "/cellar-tasks",         label: "Cellar Tasks",        desc: "One-off + recurring to-dos with due dates", audience: "member" },
      { path: "/quick-entry",          label: "Quick Entry",         desc: "The primary logging surface — additions, measurements, trials", audience: "member" },
      { path: "/orders",               label: "Orders",              desc: "Merch orders (if you sell any)", audience: "member" },
      { path: "/dashboard#free-run-widget", label: "Free Run AI (embed)", desc: "Ask winemaking questions inline", audience: "member" },
    ],
  },
  {
    title: "Admin — sales, content, ops",
    blurb: "Weekly cadence. Section §2 of the Playbook lives here.",
    routes: [
      { path: "/admin",                label: "Admin landing",       desc: "Links to everything below", audience: "admin" },
      { path: "/admin/settings",       label: "Admin Settings",      desc: "Winery name, contact, Recent Reservations, dev-bypass toggle", audience: "admin" },
      { path: "/admin/contacts",       label: "Contacts Pipeline",   desc: "VIVID 31-contact SMS pipeline", audience: "admin" },
      { path: "/admin/leads",          label: "Leads",               desc: "Inbound leads from all sources", audience: "admin" },
      { path: "/admin/funnel",         label: "Funnel Analytics",    desc: "Traffic, quiz completions, reservation rate", audience: "admin" },
      { path: "/admin/vintage-intelligence", label: "Vintage Intelligence", desc: "Deep-dive analytics on vintage patterns", audience: "admin" },
      { path: "/admin/trinity",        label: "Trinity",             desc: "Content dedupe / semantic clustering", audience: "admin" },
      { path: "/admin/wbs",            label: "Work Breakdown",      desc: "Internal product roadmap", audience: "admin" },
      { path: "/admin/compliance-doctrine", label: "Compliance Doctrine", desc: "Editable compliance knowledge base", audience: "admin" },
    ],
  },
  {
    title: "SEO / machine-facing feeds",
    blurb: "Consumed by Google, RSS readers, and social platforms. Don't share with humans.",
    routes: [
      { path: "/api/sitemap.xml",              label: "Root sitemap",              desc: "All marketing pages + Cellar Journal entries (Google-facing)", audience: "public" },
      { path: "/api/cellar-journal/sitemap.xml", label: "Cellar Journal sitemap",  desc: "Just journal entries (bots that only want the SEO compounder)", audience: "public" },
      { path: "/api/cellar-journal/rss.xml",     label: "Cellar Journal RSS 2.0",  desc: "Zapier / IFTTT / Feedly / Mastodon feed", audience: "public" },
      { path: "/api/robots.txt",                 label: "robots.txt",              desc: "Crawler policy + sitemap declarations", audience: "public" },
    ],
  },
  {
    title: "Auth flow",
    blurb: "You shouldn't need these day-to-day. Emergent Google OAuth handles most of it.",
    routes: [
      { path: "/login",              label: "Login",              desc: "Emergent Google OAuth entry", audience: "public" },
      { path: "/auth/callback",      label: "Auth callback",      desc: "OAuth redirect handler (don't visit directly)", audience: "public" },
      { path: "/onboarding",         label: "Onboarding",         desc: "First-time winemaker setup — only shows for new users", audience: "member" },
      { path: "/join",               label: "Join / warm intro",  desc: "Warm-intro entry point for referred prospects", audience: "public" },
      { path: "/founding-member/success", label: "Founding-member post-checkout", desc: "Confirmation screen after Stripe (currently mocked)", audience: "public" },
    ],
  },
];

// ─── Component ────────────────────────────────────────────────────────────

const CARD_BG   = "var(--ow-bg-card)";
const BORDER    = "var(--ow-border-md)";
const AMBER     = "var(--ow-amber)";
const TEXT_HI   = "var(--ow-text-hi)";
const TEXT_MID  = "var(--ow-text-mid)";
const TEXT_LO   = "var(--ow-text-lo)";

function badgeStyle(audience?: Route["audience"]): React.CSSProperties {
  const map = {
    public: { bg: "oklch(from var(--ow-amber) l c h / 0.10)", color: AMBER, label: "PUBLIC" },
    member: { bg: "oklch(from #4a9d8a l c h / 0.10)",           color: "#4a9d8a", label: "MEMBER" },
    admin:  { bg: "oklch(from #b0413e l c h / 0.10)",           color: "#b0413e", label: "ADMIN"  },
  };
  const m = map[audience ?? "public"];
  return {
    display: "inline-block",
    background: m.bg,
    color: m.color,
    padding: "0.15rem 0.5rem",
    borderRadius: 3,
    fontSize: "0.55rem",
    letterSpacing: "0.12em",
    textTransform: "uppercase",
    fontWeight: 700,
    fontFamily: "'Lato', sans-serif",
    marginLeft: "0.5rem",
    verticalAlign: "middle",
  };
}
function audienceLabel(a: Route["audience"]): string {
  return { public: "PUBLIC", member: "MEMBER", admin: "ADMIN" }[a ?? "public"];
}

export default function SiteMap() {
  const key = new URLSearchParams(window.location.search).get("k");
  const hasSharedKey = key === SHARED_KEY;
  // If not shared-key, the /admin gate would have blocked us server-side.
  // This UI note just tells the user how they got in.
  const entry = hasSharedKey ? "shared key" : "admin session";

  const totalRoutes = SECTIONS.reduce((n, s) => n + s.routes.length, 0);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        <p
          data-testid="sitemap-eyebrow"
          style={{ color: AMBER, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'Lato', sans-serif", marginBottom: "0.6rem" }}
        >
          Site Map · {totalRoutes} routes
        </p>
        <h1
          data-testid="sitemap-title"
          style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 5vw, 3rem)", color: TEXT_HI, lineHeight: 1.1, marginBottom: "1rem" }}
        >
          Every page on Ownology.
        </h1>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", color: TEXT_MID, lineHeight: 1.6, maxWidth: 620, marginBottom: "0.6rem" }}>
          Grouped by audience. Green = public. Teal = for logged-in winemakers. Red = admin. Every link opens in this tab so you can chain them together.
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: TEXT_LO, marginBottom: "2rem" }}>
          Entry: <span style={{ color: AMBER }}>{entry}</span> · Cross-reference this against <a href="https://github.com" style={{ color: AMBER }}>your repo's App.tsx</a> if a route is missing.
        </p>

        {SECTIONS.map((section) => (
          <section key={section.title} data-testid={`sitemap-section-${section.title.split(" ")[0].toLowerCase()}`} style={{ marginBottom: "2.5rem" }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.35rem", color: TEXT_HI, marginBottom: "0.35rem" }}>
              {section.title}
            </h2>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.82rem", color: TEXT_LO, marginBottom: "1rem", lineHeight: 1.55 }}>
              {section.blurb}
            </p>
            <div style={{ background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "0.6rem" }}>
              {section.routes.map((r) => (
                <div key={r.path} style={{ padding: "0.65rem 0.65rem", borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.15rem" }}>
                    {r.path.startsWith("/api/") ? (
                      <a
                        href={r.path}
                        target="_blank"
                        rel="noreferrer"
                        data-testid={`sitemap-link-${r.path.replace(/[^a-z0-9]+/gi, "-")}`}
                        style={{ color: AMBER, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "0.86rem", textDecoration: "none" }}
                      >
                        {r.path}
                      </a>
                    ) : (
                      <Link
                        href={r.path}
                        data-testid={`sitemap-link-${r.path.replace(/[^a-z0-9]+/gi, "-")}`}
                        style={{ color: AMBER, fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "0.86rem", textDecoration: "none" }}
                      >
                        {r.path}
                      </Link>
                    )}
                    <span style={badgeStyle(r.audience)} aria-label={audienceLabel(r.audience)}>
                      {audienceLabel(r.audience)}
                    </span>
                    <span style={{ color: TEXT_MID, fontSize: "0.85rem", fontFamily: "'Fraunces', serif" }}>
                      {r.label}
                    </span>
                  </div>
                  <p style={{ fontSize: "0.75rem", color: TEXT_LO, margin: 0, lineHeight: 1.5, fontFamily: "'Lato', sans-serif" }}>
                    {r.desc}
                  </p>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginTop: "3rem", padding: "1rem", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: TEXT_LO, lineHeight: 1.6 }}>
          <strong style={{ color: TEXT_HI }}>Keep this in sync with the code.</strong> The registry lives in
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.35rem", margin: "0 0.25rem", borderRadius: 2 }}>
            client/src/pages/SiteMap.tsx
          </code>
          — add new routes there when they land in App.tsx. Also check
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.35rem", margin: "0 0.25rem", borderRadius: 2 }}>
            server/sitemap.ts
          </code>
          if the new page should be Google-indexed (SEO sitemap).
        </div>
      </div>
      <SiteFooter />
    </div>
  );
}
