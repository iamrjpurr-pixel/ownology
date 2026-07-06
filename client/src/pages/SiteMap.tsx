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
    title: "Public — marketing surfaces",
    blurb: "Anyone can visit these. Send prospects here from cold email, SMS, LinkedIn, or Google.",
    routes: [
      { path: "/",                     label: "Home",                desc: "Hero, pricing teaser, blog feed", audience: "public" },
      { path: "/home",                 label: "Home (alias)",        desc: "Same page as /", audience: "public" },
      { path: "/try",                  label: "Try Ownology (sandbox)", desc: "10-min guided demo using Ownology Cellars data — no signup, no writes. Send this URL to cold prospects.", audience: "public" },
      { path: "/quiz",                 label: "Wine Recommender Quiz", desc: "6 questions → wine pick → Founding Member funnel. Public SEO surface.", audience: "public" },
      { path: "/pricing",              label: "Pricing",             desc: "Founding Member plans + reservation modal", audience: "public" },
      { path: "/why-ownology",         label: "Why Ownology",        desc: "Long-form value proposition", audience: "public" },
      { path: "/risk-management",      label: "Risk Management doctrine", desc: "The 12 wine-quality risks Ownology watches (7 Quant + 5 Qual). Sales weapon, links from cold email + /why-ownology. Feb 2026.", audience: "public" },
      { path: "/risk-briefing",         label: "Risk Briefing (staff)", desc: "MEMBER-only staff training page. How to use the 3-tier risk tool day-to-day + compliance benefits (FSANZ + LIP + AWRI TR227 + OIV). Bookmark for new hires. Feb 2026.", audience: "member" },
      { path: "/risk-glossary",          label: "Risk Glossary (reference)", desc: "MEMBER-only vocabulary reference. Every technical term used across the risk framework — methodology (Quant/Qual/Env), chemistry (Brix, SO₂, MLF, YAN), sensory faults (Brett, TCA, H₂S), regulatory (LIP, FSANZ, OIV, WHS). Alphabetised + sourced. Feb 2026.", audience: "member" },
      { path: "/competitive-advantage", label: "Competitive Advantage", desc: "How Ownology compares to Vintrace / InnoVint / spreadsheets. GATED under default-deny — add to allowlist if it should be public.", audience: "member" },
      { path: "/free-run",             label: "Free Run (product intro)", desc: "Product page — AI assistant intro. Note: /free-run/dashboard is gated.", audience: "public" },
      { path: "/guide",                label: "Guide",               desc: "How to use Ownology (public overview)", audience: "public" },
      { path: "/demo",                 label: "Demo",                desc: "Marketing demo landing", audience: "public" },
      { path: "/preview",              label: "Preview",             desc: "Marketing preview landing", audience: "public" },
      { path: "/waitlist",             label: "Waitlist",            desc: "Email capture for early access", audience: "public" },
      { path: "/for-innovint-users",   label: "For InnoVint users",  desc: "Migration-story landing for InnoVint refugees", audience: "public" },
      { path: "/for-vintrace-users",   label: "For Vintrace users",  desc: "Migration-story landing for Vintrace refugees", audience: "public" },
    ],
  },
  {
    title: "Cellar Journal & content flywheel",
    blurb: "SEO compounder — every Free Run question becomes an indexable page.",
    routes: [
      { path: "/cellar-journal",       label: "Cellar Journal index", desc: "Public Q&A + SOP index — editorial view with topic chips + search", audience: "public" },
      { path: "/cellar-journal/rescuing-stuck-fermentation", label: "Cellar Journal — example entry", desc: "Sample entry page (any /cellar-journal/:slug renders the entry view)", audience: "public" },
      { path: "/blog",                 label: "Blog index",          desc: "Long-form marketing content", audience: "public" },
      { path: "/blog/weight-of-harvest", label: "Blog — Weight of Harvest", desc: "Featured post", audience: "public" },
      { path: "/blog/two-philosophies",  label: "Blog — Two Philosophies", desc: "Featured post", audience: "public" },
    ],
  },
  {
    title: "For Home Winemakers (DIY track)",
    blurb: "Free tier + SEO. Not the same tool as the professional cellar app.",
    routes: [
      { path: "/for-home-winemakers",  label: "DIY landing",         desc: "Home winemaker track hub", audience: "public" },
      { path: "/for-home-winemakers/troubleshooting", label: "DIY — Troubleshooting", desc: "Home winemaker fault library", audience: "public" },
      { path: "/for-home-winemakers/glossary", label: "DIY — Glossary", desc: "Home winemaker term index", audience: "public" },
      { path: "/for-home-winemakers/knowledge", label: "DIY — Knowledge", desc: "Home winemaker SOP browser", audience: "public" },
      { path: "/resources",            label: "Resources",           desc: "Curated external winemaking references", audience: "public" },
      { path: "/resources/home-winery-kit", label: "Home winery kit", desc: "Recommended equipment for hobbyists", audience: "public" },
      { path: "/reference/vine",       label: "Vine reference",      desc: "Grapevine varietal reference", audience: "public" },
    ],
  },
  {
    title: "Compliance & regulations",
    blurb: "FSANZ · Wine Australia · state licensing. Now gated under default-deny (Feb 2026) — members only.",
    routes: [
      { path: "/compliance",           label: "Compliance",          desc: "LIP FSANZ + state licensing overview + audit-trail PDF export. GATED.", audience: "member" },
      { path: "/regulations",          label: "Regulations",         desc: "Wine Australia + FSANZ regulatory links index. GATED.", audience: "member" },
      { path: "/regulations/detail",   label: "Regulations detail",  desc: "Per-regulation deep-dive. Public SEO surface.", audience: "public" },
    ],
  },
  {
    title: "Winemaker daily surfaces (login required)",
    blurb: "Your Daily 10 lives here. Anonymous visitors get redirected to /try.",
    routes: [
      { path: "/dashboard",            label: "Dashboard",           desc: "Live cellar overview + alerts + tank status", audience: "member" },
      { path: "/cellar-brief",         label: "Cellar Brief",        desc: "Today's AI-triaged tasks (also emailed at 5:30am)", audience: "member" },
      { path: "/cellar-tasks",         label: "Cellar Tasks",        desc: "One-off + recurring to-dos with due dates", audience: "member" },
      { path: "/quick-entry",          label: "Quick Entry",         desc: "The primary logging surface — additions, measurements, trials", audience: "member" },
      { path: "/import",               label: "Import Anything",     desc: "Voice memo · camera · paste · CSV. 4 tabs, one preview-then-save flow.", audience: "member" },
      { path: "/the-press",            label: "The Press",           desc: "The live vintage log — every entry, filterable. GATED.", audience: "member" },
      { path: "/the-press/compare",    label: "Vintage Comparison",  desc: "Side-by-side compare of 2–6 tanks", audience: "member" },
      { path: "/free-run",             label: "Free Run — ask AI",   desc: "Ask any winemaking question. Auto-saves to Cellar Journal.", audience: "member" },
      { path: "/today",                label: "Today",               desc: "Single-column alert feed for cellar-floor use", audience: "member" },
      { path: "/knowledge",            label: "Knowledge",           desc: "SOP library (professional tier)", audience: "member" },
      { path: "/vineyard",             label: "Vineyard",            desc: "Vineyard blocks + observations", audience: "member" },
      { path: "/tank-qr",              label: "Tank QR codes",       desc: "Printable QR per tank → scan opens pre-filled Quick Entry", audience: "member" },
      { path: "/orders",               label: "Orders",              desc: "Merch orders (if you sell any)", audience: "member" },
      { path: "/stats",                label: "LLM Stats",           desc: "Live LLM cost meter + per-tier daily budget. Allowlisted PUBLIC — safe to link from investor deck.", audience: "public" },
      { path: "/campaign-metrics",     label: "Campaign Metrics",    desc: "Weekly KPI snapshots — waitlist, MRR, opens, sessions", audience: "member" },
    ],
  },
  {
    title: "Merch",
    blurb: "Public store + post-Stripe callbacks.",
    routes: [
      { path: "/merch",                label: "Merch store",         desc: "Founding Member merch (cap, apron, tumbler)", audience: "public" },
      { path: "/merch/success",        label: "Merch success",       desc: "Post-checkout confirmation (Stripe callback)", audience: "public" },
      { path: "/merch/cancel",         label: "Merch cancelled",     desc: "Checkout-cancelled fallback", audience: "public" },
      { path: "/founding-member/success", label: "Founding Member success", desc: "Post-checkout confirmation for FM plans", audience: "public" },
    ],
  },
  {
    title: "Admin — sales, content, ops",
    blurb: "Weekly cadence. /admin/operator-guide is your manual; /admin/playbook is the checklist.",
    routes: [
      { path: "/admin",                label: "Admin landing",       desc: "Cards linking to every admin tool", audience: "admin" },
      { path: "/admin/operator-guide", label: "Operator Guide",      desc: "The manual — daily rhythm + when-to-use-what. Bookmark this.", audience: "admin" },
      { path: "/admin/playbook",       label: "Playbook",            desc: "Clickable SOP checklist — Daily 10 / Weekly 30 / Vintage-critical", audience: "admin" },
      { path: "/site-map",             label: "Site Map (this page)", desc: "Every route on the site. You're here.", audience: "admin" },
      { path: "/admin/contacts",       label: "Contacts CRM",        desc: "VIVID 31-contact SMS pipeline — per-row status + inline SMS editor", audience: "admin" },
      { path: "/admin/contacts/pipeline", label: "Pipeline Board",   desc: "Trello-style board: Lead → Sent → Awaiting → Replied → Booked", audience: "admin" },
      { path: "/admin/producers",      label: "Producers · Perplexity",  desc: "Cold-outreach engine: bulk region-bootstrap (Perplexity), per-row winemaker enrichment, 1-click Compose modal, mailto: send. Feb 2026.", audience: "admin" },
      { path: "/admin/marketing-ops",  label: "Marketing Ops · AI Coach", desc: "Daily/weekly ritual dashboard — season strip, Claude-generated coach line, KPI streak, Today's focus, weekly rhythm board. 7am Sydney email push. Feb 2026.", audience: "admin" },
      { path: "/admin/gate-invites",   label: "Gate Invite Tokens",  desc: "Generate /i/:token magic-link URLs that bypass the default-deny gate. For beta testers + demo prospects. Feb 2026.", audience: "admin" },
      { path: "/admin/quiz-picks",     label: "Quiz Picks + Gate Audit", desc: "Wine quiz result tally + gate_events audit log (last 50 verify attempts, top failing IPs).", audience: "admin" },
      { path: "/admin/marketing-kit",  label: "Marketing Kit",       desc: "One-click copy for sample-vintage-log URLs, LinkedIn DMs, email signatures", audience: "admin" },
      { path: "/admin/funnel",         label: "Conversion Funnel",   desc: "Where paid signups come from — per-source visits + Conv %", audience: "admin" },
      { path: "/admin/leads",          label: "Leads CRM",           desc: "Every inbound email + source tag + notes + CSV export", audience: "admin" },
      { path: "/admin/themes-stats",   label: "Theme Picks",         desc: "Anonymous tally of which themes operators choose", audience: "admin" },
      { path: "/admin/analytics/themes", label: "Theme Analytics",   desc: "Deep-dive theme telemetry", audience: "admin" },
      { path: "/admin/vintage-intelligence", label: "Vintage Intelligence", desc: "AI-context regional vintage data manager", audience: "admin" },
      { path: "/admin/trinity",        label: "Trinity Review",      desc: "Auto-drafted community blog dedupe / promote / suppress", audience: "admin" },
      { path: "/admin/wbs",            label: "WBS Publisher",       desc: "Toggle Red/White Wine Bible chapters live in the DIY tutor", audience: "admin" },
      { path: "/admin/compliance-doctrine", label: "Compliance Doctrine", desc: "Editable compliance knowledge base", audience: "admin" },
      { path: "/admin/settings",       label: "Admin Settings",      desc: "Winery name, public audit toggle, dev-bypass runtime override", audience: "admin" },
      { path: "/admin/dev",            label: "Dev Mode",            desc: "Toggle auth bypass at runtime (useful for testing anonymous flows)", audience: "admin" },
      { path: "/admin/responsive",     label: "Responsive Audit",    desc: "Grid overlay to check page layouts at every breakpoint", audience: "admin" },
    ],
  },
  {
    title: "SMS outreach & cold-email previews",
    blurb: "Per-prospect personalised landings + warm-intro paths + cold-email Cellar Brief previews.",
    routes: [
      { path: "/hi/nathan-brokenwood-wines", label: "SMS landing — example (Nathan)", desc: "Any /hi/:slug renders a personalised card. Nathan resolves to Hunter + Book demo variant.", audience: "public" },
      { path: "/hi/producers/8",       label: "Cellar Brief preview — example (Felton Road)", desc: "Public Cellar Brief mockup baked into every cold email. Any /hi/producers/:id renders a region-aware sample. Zero LLM cost. Feb 2026.", audience: "public" },
      { path: "/i/example-token",      label: "Invite magic link",   desc: "Any /i/:token bypasses the default-deny gate for one prospect. Generated at /admin/gate-invites.", audience: "public" },
      { path: "/join",                 label: "Join / warm intro",   desc: "Warm-intro entry point for referred prospects", audience: "public" },
      { path: "/invite",               label: "Invite",              desc: "Invitation-code entry (per-prospect gated onboarding)", audience: "public" },
      { path: "/trial-ending",         label: "Trial ending",        desc: "End-of-trial nudge page", audience: "public" },
    ],
  },
  {
    title: "SEO / machine-facing feeds",
    blurb: "Consumed by Google, RSS readers, and social platforms. Don't share with humans.",
    routes: [
      { path: "/api/sitemap.xml",              label: "Root XML sitemap",         desc: "All marketing pages + Cellar Journal entries (Google-facing)", audience: "public" },
      { path: "/api/cellar-journal/sitemap.xml", label: "Cellar Journal sitemap", desc: "Just journal entries (bots that only want the SEO compounder)", audience: "public" },
      { path: "/api/cellar-journal/rss.xml",     label: "Cellar Journal RSS 2.0", desc: "Zapier / IFTTT / Feedly / Mastodon feed", audience: "public" },
      { path: "/api/robots.txt",                 label: "robots.txt",             desc: "Crawler policy + sitemap declarations", audience: "public" },
      { path: "/api/compliance/audit-trail.pdf", label: "Audit trail PDF",        desc: "Regulator-ready chronological export (owner-only)", audience: "admin" },
      { path: "/api/compliance/lip-audit-pack.pdf", label: "LIP audit pack PDF",  desc: "Wine Australia LIP compliance pack", audience: "admin" },
      { path: "/api/scheduled/daily-alert-email?dryRun=1", label: "Daily alert email — dry run", desc: "Preview the Cellar Brief email without sending", audience: "admin" },
      { path: "/api/scheduled/nurture-email?dryRun=1", label: "Nurture email — dry run", desc: "Preview the founding-member nurture sequence without sending", audience: "admin" },
      { path: "/sample-vintage-log?variant=large",    label: "Sample vintage log — Large",    desc: "Static HTML demo mockup — 128-tank producer", audience: "public" },
      { path: "/sample-vintage-log?variant=hunter",   label: "Sample vintage log — Hunter",   desc: "Static HTML demo mockup — Hunter Valley 24-tank estate", audience: "public" },
      { path: "/sample-vintage-log?variant=boutique", label: "Sample vintage log — Boutique", desc: "Static HTML demo mockup — 12-tank family cellar", audience: "public" },
    ],
  },
  {
    title: "Auth flow",
    blurb: "You shouldn't need these day-to-day. Emergent Google OAuth handles most of it.",
    routes: [
      { path: "/login",              label: "Login",              desc: "Emergent Google OAuth entry", audience: "public" },
      { path: "/auth/callback",      label: "Auth callback",      desc: "OAuth redirect handler (don't visit directly)", audience: "public" },
      { path: "/onboarding",         label: "Onboarding",         desc: "First-time winemaker setup — only shows for new users", audience: "member" },
      { path: "/privacy",            label: "Privacy policy",     desc: "Consumer policy", audience: "public" },
      { path: "/terms",              label: "Terms of service",   desc: "Consumer policy", audience: "public" },
      { path: "/refund",             label: "Refund policy",      desc: "Consumer policy", audience: "public" },
    ],
  },
  {
    title: "Dev-only & internal (preview host)",
    blurb: "/todo and /roadmap deliberately return 404 on ownology.ai; only visible on the preview host. The mockups are technically allowlisted PUBLIC so demo screenshots work, but they're not on any customer nav.",
    routes: [
      { path: "/todo",               label: "Internal roadmap",    desc: "Working backlog — honest, blunt, includes security items. Also at /roadmap. GATED on prod (404).", audience: "admin" },
      { path: "/roadmap",            label: "Roadmap (alias)",     desc: "Same as /todo. GATED on prod (404).", audience: "admin" },
      { path: "/cascade-demo",       label: "Cascade demo",        desc: "Test rig for the harvest-crush theme cascade animation. Allowlisted PUBLIC.", audience: "public" },
      { path: "/copilot-mockup",     label: "Copilot mockup",      desc: "UX prototype — not wired to real data. GATED.", audience: "admin" },
      { path: "/branding-mockup",    label: "Branding mockup",     desc: "Visual identity exploration. Allowlisted PUBLIC.", audience: "public" },
      { path: "/onboarding-mockup",  label: "Onboarding mockup",   desc: "UX prototype of the first-time-user flow. Allowlisted PUBLIC.", audience: "public" },
      { path: "/resume",             label: "Resume",              desc: "Founder résumé (used for warm-intro credibility). Allowlisted PUBLIC.", audience: "public" },
      { path: "/build-index",        label: "Build index",         desc: "Internal indexing utility. GATED.", audience: "admin" },
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
      {/* Print stylesheet — turns the dark UI into a clean, ink-friendly PDF
          when the user hits "Save as PDF" from the browser print dialog.
          Every anchor stays clickable in the exported PDF. */}
      <style>{`
        @media print {
          body, html { background: #ffffff !important; }
          .no-print, footer, header, nav { display: none !important; }
          [data-testid="sitemap-eyebrow"] { color: #8a5a2c !important; }
          h1, h2 { color: #111 !important; break-after: avoid; }
          p, span, div { color: #222 !important; }
          section { break-inside: avoid; page-break-inside: avoid; }
          a { color: #1e4d8a !important; text-decoration: underline !important; }
          code { background: #f2efe8 !important; color: #111 !important; }
          .sitemap-row { border-color: #ddd !important; background: #fff !important; }
          @page { margin: 15mm 12mm; }
        }
      `}</style>
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
          Grouped by audience. <span style={{ color: AMBER }}>Amber = PUBLIC</span> (in the default-deny allowlist). <span style={{ color: "#4a9d8a" }}>Teal = MEMBER</span> (gated — anonymous visitors redirect to /try). <span style={{ color: "#b0413e" }}>Red = ADMIN</span>. Every link opens in this tab so you can chain them together.
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: TEXT_LO, marginBottom: "1.25rem" }}>
          Entry: <span style={{ color: AMBER }}>{entry}</span> · Cross-reference this against <a href="https://github.com" style={{ color: AMBER }}>your repo&apos;s App.tsx</a> if a route is missing.
        </p>

        {/* Save as PDF — uses the browser's native print-to-PDF. Keeps every
            link clickable in the exported PDF. Bookmarkable via /site-map#print. */}
        <div
          className="no-print"
          style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", marginBottom: "2rem" }}
        >
          <button
            data-testid="sitemap-print-btn"
            onClick={() => window.print()}
            style={{
              background: AMBER,
              color: "oklch(0.10 0.008 60)",
              border: "none",
              padding: "0.75rem 1.25rem",
              borderRadius: 4,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.88rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: "pointer",
            }}
          >
            Save as PDF / print
          </button>
          <button
            data-testid="sitemap-copy-btn"
            onClick={async () => {
              const lines: string[] = [`Ownology · Site Map · ${totalRoutes} routes\n`];
              const base = window.location.origin;
              SECTIONS.forEach((s) => {
                lines.push(`\n## ${s.title}`);
                lines.push(s.blurb);
                s.routes.forEach((r) => lines.push(`  ${r.label} — ${base}${r.path}\n    ${r.desc}`));
              });
              try {
                await navigator.clipboard.writeText(lines.join("\n"));
                alert(`Copied ${totalRoutes} URLs to clipboard as plain text.`);
              } catch {
                alert("Copy failed — please try the Save as PDF button instead.");
              }
            }}
            style={{
              background: "transparent",
              color: AMBER,
              border: `1px solid ${AMBER}`,
              padding: "0.75rem 1.25rem",
              borderRadius: 4,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.88rem",
              fontWeight: 700,
              letterSpacing: "0.03em",
              cursor: "pointer",
            }}
          >
            Copy all URLs as text
          </button>
          <span
            className="no-print"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              color: TEXT_LO,
              alignSelf: "center",
            }}
          >
            Tip: in the print dialog, choose <em>Save as PDF</em> as the destination — every link stays clickable.
          </span>
        </div>

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
