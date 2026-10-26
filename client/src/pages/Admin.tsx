/**
 * OWNOLOGY — /admin
 * Owner-only hub page. Gated by ownerProcedure (trpc.admin.summary).
 * Shows a summary KPI row and navigation cards to all owner tools.
 * Not linked from public navigation — access by direct URL only,
 * plus a conditional "Admin" link in the More dropdown for the owner.
 */
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Tool card definition ─────────────────────────────────────────────────────

interface AdminTool {
  label: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  badge?: string;
}

// ─── Icons ────────────────────────────────────────────────────────────────────

function IconChart() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

function IconOrders() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
      <line x1="3" y1="6" x2="21" y2="6" />
      <path d="M16 10a4 4 0 0 1-8 0" />
    </svg>
  );
}

function IconMembers() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconCompliance() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconMerch() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="21" r="1" />
      <circle cx="20" cy="21" r="1" />
      <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
    </svg>
  );
}

function IconPricing() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23" />
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
    </svg>
  );
}

function IconLeads() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      <path d="M21 21v-2a4 4 0 0 0-3-3.87" />
    </svg>
  );
}

// ─── KPI stat card ────────────────────────────────────────────────────────────

function IconVintage() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2" />
      <path d="M12 6v6l4 2" />
      <path d="M8 14s1.5 2 4 2 4-2 4-2" />
    </svg>
  );
}

function IconKnowledge() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      <line x1="9" y1="7" x2="15" y2="7" />
      <line x1="9" y1="11" x2="15" y2="11" />
    </svg>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="flex flex-col gap-1 px-6 py-5 rounded-sm"
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
      }}
    >
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.65rem",
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color: "var(--ow-text-lo)",
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "var(--ow-text-hi)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Tool card ────────────────────────────────────────────────────────────────

function ToolCard({ tool }: { tool: AdminTool }) {
  return (
    <Link href={tool.href}>
      <a
        className="group flex flex-col gap-4 p-6 rounded-sm transition-all duration-200 cursor-pointer"
        style={{
          background: "var(--ow-bg-card)",
          border: "1px solid var(--ow-border)",
          textDecoration: "none",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-amber)";
          (e.currentTarget as HTMLElement).style.background = "var(--ow-bg-raised)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--ow-border)";
          (e.currentTarget as HTMLElement).style.background = "var(--ow-bg-card)";
        }}
      >
        {/* Icon + badge row */}
        <div className="flex items-start justify-between">
          <div
            className="flex items-center justify-center w-12 h-12 rounded-sm"
            style={{
              background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
              color: "var(--ow-amber)",
            }}
          >
            {tool.icon}
          </div>
          {tool.badge && (
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{
                background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                color: "var(--ow-amber)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {tool.badge}
            </span>
          )}
        </div>

        {/* Label + description */}
        <div>
          <p
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 600,
              fontSize: "1.05rem",
              color: "var(--ow-text-hi)",
              marginBottom: "0.35rem",
            }}
          >
            {tool.label}
          </p>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.85rem",
              lineHeight: 1.55,
              color: "var(--ow-text-mid)",
            }}
          >
            {tool.description}
          </p>
        </div>

        {/* Arrow */}
        <div className="flex items-center gap-1 mt-auto" style={{ color: "var(--ow-amber)" }}>
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", letterSpacing: "0.06em" }}>
            Open
          </span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </a>
    </Link>
  );
}

// ─── Loading spinner ──────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)" }}>
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ isForbidden }: { isForbidden: boolean }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: "var(--ow-amber)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="text-center">
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "1.5rem",
            color: "var(--ow-text-hi)",
            marginBottom: "0.5rem",
          }}
        >
          {isForbidden ? "Owner access required" : "Sign in required"}
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", fontSize: "0.9rem" }}>
          {isForbidden
            ? "This page is restricted to the site owner."
            : "Please sign in to access the admin panel."}
        </p>
      </div>
      {!isForbidden && (
        <a
          href={getLoginUrl()}
          className="px-6 py-2.5 rounded-sm text-sm font-medium"
          style={{
            background: "var(--ow-amber)",
            color: "oklch(0.12 0.01 60)",
            fontFamily: "'Lato',sans-serif",
            textDecoration: "none",
          }}
        >
          Sign in
        </a>
      )}
      <Link href="/">
        <a style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>
          ← Back to site
        </a>
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

// Operator's Marketing quick-links — the ex-mega-menu that used to live in
// the public "More" dropdown. Feb 2026: moved here so prospects never see
// a sitemap-style menu, but admins keep one-click access for spot-checks.
// Columns mirror the four product pillars.
const QUICKLINK_COLUMNS: Array<{
  label: string;
  hint?: string;
  links: Array<{ label: string; href: string }>;
}> = [
  {
    label: "Do",
    hint: "In the cellar",
    links: [
      { label: "The Press",    href: "/the-press" },
      { label: "Dashboard",    href: "/dashboard" },
      { label: "Cellar Tasks", href: "/cellar-tasks" },
      { label: "Vineyard",     href: "/vineyard" },
    ],
  },
  {
    label: "Know",
    links: [
      { label: "Free Run",           href: "/free-run" },
      { label: "Knowledge Platform", href: "/knowledge" },
      { label: "Compliance AI",      href: "/compliance" },
    ],
  },
  {
    label: "Learn",
    links: [
      { label: "Blog",                href: "/blog" },
      { label: "Why Ownology",        href: "/why-ownology" },
      { label: "For Home Winemakers", href: "/for-home-winemakers" },
    ],
  },
  {
    label: "Guide",
    links: [
      { label: "Getting Started",     href: "/guide" },
      { label: "Your Vintage",       href: "/your-vintage" },
      { label: "Induction Style Guide (PDF)", href: "/admin/style-guide/induction" },
      { label: "User Journey Deck (PDF)", href: "/admin/deck/user-journey" },
      { label: "Regulations Library", href: "/regulations" },
      { label: "FAQ",                 href: "/#faq" },
      { label: "Our Story",           href: "/#our-story" },
    ],
  },
];

const T = (label: string, href: string, description: string, icon: React.ReactNode, badge?: string): AdminTool => ({ label, href, description, icon, badge });

// Grouped by job-to-be-done. Help, health & developer starts collapsed.
const SECTIONS: { title: string; hint: string; collapsed?: boolean; tools: AdminTool[] }[] = [
  {
    title: "People & CRM",
    hint: "Who's out there, who's interested, who's paying",
    tools: [
      T("People", "/admin/people", "Everyone once, matched by email — outreach, sign-ups, quiz, demo, survey, founding reservations, paying members, access links and accounts. Filter 'Wants to pay' to see who to call.", <IconMembers />, "Start here"),
      T("Outreach contacts", "/admin/contacts", "Your outreach list: add a winemaker, get their personal /hi link and SMS draft, track opens, replies and bookings.", <IconLeads />, "Outreach"),
      T("Outbound queue", "/admin/contacts/outbound-queue", "Who to contact next, with AI-rewritten SMS drafts and bulk enrichment.", <IconLeads />),
      T("Replies & follow-ups", "/admin/contacts/engagement", "Paste a reply, get its tone and a follow-up draft. See who needs chasing.", <IconLeads />),
      T("Activity", "/admin/activity", "Click-by-click visits from invited prospects and signed-in members.", <IconChart />, "Live"),
      T("Access", "/admin/access", "Members and personal invite links in one place — see progress, pause, revoke.", <IconMembers />, "Access"),
      T("Producers", "/admin/producers", "AU + NZ winery directory — the source list for new outreach.", <IconLeads />),
      T("Press bypass requests", "/admin/press-bypass", "Wine writers and judges asking for preview access to The Press. Grant in one click.", <IconMembers />),
    ],
  },
  {
    title: "Sales & money",
    hint: "Orders, conversion and what visitors see",
    tools: [
      T("Orders", "/admin/orders", "Live Stripe checkout history — customers, line items, revenue and Stripe links.", <IconOrders />, "Live Stripe"),
      T("Conversion funnel", "/admin/funnel", "Where paid sign-ups come from, by source tag.", <IconLeads />, "Attribution"),
      T("Campaign metrics", "/admin/campaign-metrics", "Week-by-week KPIs — waitlist, MRR, open rates, sessions.", <IconChart />, "Weekly"),
      T("Pricing page", "/pricing", "Check tiers, credit packs and the founding counter as visitors see them.", <IconPricing />),
      T("Merch store", "/merch", "The public merch store and its checkout.", <IconMerch />),
    ],
  },
  {
    title: "Marketing",
    hint: "Daily ritual and ready-to-use assets",
    tools: [
      T("Marketing Ops", "/admin/marketing-ops", "Today's marketing to-dos from the AI coach, streak and reply-rate KPI.", <IconLeads />, "AI Coach"),
      T("Marketing kit", "/admin/marketing-kit", "Sample-log URLs, email signatures and DM copy, one click to copy.", <IconLeads />, "Assets"),
      T("SMS openers", "/admin/sms-openers", "The opening lines used in outreach texts, by region.", <IconLeads />),
    ],
  },
  {
    title: "Content & AI",
    hint: "What Owen and the tutors know",
    tools: [
      T("Compliance doctrine", "/admin/compliance-doctrine", "Every canonical compliance answer with citations and last-verified dates.", <IconCompliance />),
      T("Compliance agent", "/compliance", "Test the regulatory Q&A across all seven jurisdictions.", <IconCompliance />),
      T("Vintage intelligence", "/admin/vintage-intelligence", "Regional vintage data fed to Owen when a region or year comes up.", <IconVintage />, "AI Context"),
      T("WBS knowledge publisher", "/admin/wbs", "Which wine-bible chapters are live in the home-winemaker tutor.", <IconKnowledge />),
      T("Trinity review", "/admin/trinity", "Nightly AI-drafted community pieces — promote, suppress, fix.", <IconKnowledge />),
    ],
  },
  {
    title: "Help, health & developer",
    hint: "Manuals, diagnostics and internal tools",
    collapsed: true,
    tools: [
      T("Operator guide", "/admin/operator-guide", "The manual — daily rhythm, when to use what, troubleshooting.", <IconKnowledge />),
      T("Site map", "/site-map", "Every page on the site, grouped by audience.", <IconKnowledge />),
      T("App health", "/admin/health", "Live status of env vars, database, email, AI and sign-in.", <IconMembers />),
      T("Email deliverability check", "/api/scheduled/resend-health", "One-URL verdict on email sending. Add ?to=you@example.com for a test send.", <IconMembers />),
      T("Weekly cellar digest — dry run", "/api/scheduled/weekly-cellar-digest?dryRun=1", "Preview the Monday cellar email (goes to your test address).", <IconMembers />),
      T("Old lead list", "/admin/leads", "The original email sign-up table (now also shown inside People).", <IconLeads />),
      T("Quiz picks", "/admin/quiz-picks", "What the /quiz recommender is picking and click-through.", <IconLeads />, "Telemetry"),
      T("Theme picks", "/admin/themes-stats", "Which site themes visitors choose.", <IconLeads />, "Telemetry"),
      T("Users", "/admin/users", "Every account, recent magic links, resend a login link.", <IconMembers />),
      T("Build index", "/admin/build-index", "Internal index of builds and pages.", <IconKnowledge />),
    ],
  },
];

function SectionGrid({ tools }: { tools: AdminTool[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {tools.map((tool) => <ToolCard key={tool.href + tool.label} tool={tool} />)}
    </div>
  );
}

function SectionHead({ title, hint }: { title: string; hint: string }) {
  return (
    <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
      <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", color: "var(--ow-text-hi)" }}>{title}</span>
      <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>{hint}</span>
    </span>
  );
}

export default function Admin() {
  const { data, isLoading, error } = trpc.admin.summary.useQuery();

  if (isLoading) return <Spinner />;

  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized =
    error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");

  if (isForbidden || isUnauthorized) {
    return <AccessDenied isForbidden={isForbidden} />;
  }

  const fmCount = data?.foundingMemberCount ?? 0;
  const waitlist = data?.waitlistCount ?? 0;
  const orders = data?.stripeOrderCount ?? 0;
  const revenue = data?.stripeRevenueCents ?? 0;
  const revenueAud = (revenue / 100).toLocaleString("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  const latestWeek = data?.latestWeek;
  const snapshotDate = data?.snapshotAt
    ? new Date(data.snapshotAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })
    : null;

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ow-border)" }}>
        <div className="container py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/">
                <a style={{ textDecoration: "none" }}>
                  <OwnologyLogo size={32} />
                </a>
              </Link>
              <div style={{ width: "1px", height: "28px", background: "var(--ow-border-md)" }} />
              <div>
                <p
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ow-amber)",
                  }}
                >
                  Owner Panel
                </p>
                <h1
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontWeight: 700,
                    fontSize: "clamp(1.2rem,2.5vw,1.6rem)",
                    color: "var(--ow-text-hi)",
                    lineHeight: 1.1,
                    textWrap: "balance" as "balance",
                  }}
                >
                  Admin <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Hub</em>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {latestWeek && (
                <p
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.7rem",
                    color: "var(--ow-text-lo)",
                    letterSpacing: "0.04em",
                  }}
                >
                  Last snapshot: {latestWeek}
                  {snapshotDate ? ` · ${snapshotDate}` : ""}
                </p>
              )}
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* KPI summary row */}
      <div style={{ borderBottom: "1px solid var(--ow-border)", background: "var(--ow-bg-raised)" }}>
        <div className="container py-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Stat label="Waitlist" value={waitlist.toLocaleString()} sub="total subscribers" />
            <Stat
              label="Founding Members"
              value={fmCount.toLocaleString()}
              sub={`${Math.max(0, 99 - fmCount)} spots remaining`}
            />
            <Stat label="Merch Orders" value={orders.toLocaleString()} sub="completed (last 100)" />
            <Stat label="Merch Revenue" value={revenueAud} sub="AUD, last 100 sessions" />
          </div>
        </div>
      </div>

      {/* Tool sections */}
      <div className="container py-10 space-y-10" data-testid="admin-sections">
        {SECTIONS.map((sec) => {
          const id = `admin-section-${sec.title.split(" ")[0].toLowerCase()}`;
          return sec.collapsed ? (
            <details key={sec.title} data-testid={id}>
              <summary className="cursor-pointer mb-4"><SectionHead title={sec.title} hint={sec.hint} /></summary>
              <SectionGrid tools={sec.tools} />
            </details>
          ) : (
            <section key={sec.title} data-testid={id}>
              <div className="mb-4"><SectionHead title={sec.title} hint={sec.hint} /></div>
              <SectionGrid tools={sec.tools} />
            </section>
          );
        })}
      </div>

      {/* Marketing quick-links — moved out of the public "More" mega-menu
          (Feb 2026). Public visitors never need to see the 4-column DO/
          KNOW/LEARN/GUIDE grid; it was pure operator convenience so it
          belongs here. Each column mirrors a customer-facing product
          pillar so you can spot-check a page in one click. */}
      <div className="container pb-10">
        <div
          style={{
            border: "1px solid var(--ow-border)",
            borderRadius: 6,
            padding: "1.5rem",
            background: "var(--ow-bg-card)",
          }}
        >
          <div className="flex items-baseline justify-between flex-wrap gap-2 mb-4">
            <p
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.7rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "var(--ow-text-lo)",
              }}
            >
              Marketing Quick-Links
            </p>
            <button
              type="button"
              onClick={() => {
                localStorage.clear();
                sessionStorage.clear();
                document.cookie.split(";").forEach((c) => {
                  document.cookie = c
                    .replace(/^ +/, "")
                    .replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/");
                });
                window.location.reload();
              }}
              data-testid="admin-clear-cache"
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.72rem",
                color: "var(--ow-text-lo)",
                background: "none",
                border: "1px solid var(--ow-border)",
                borderRadius: 4,
                padding: "0.35rem 0.75rem",
                cursor: "pointer",
              }}
            >
              ⟳ Clear Cache & Reload
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {QUICKLINK_COLUMNS.map((col) => (
              <div key={col.label}>
                <p
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.62rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ow-amber)",
                    marginBottom: "0.15rem",
                  }}
                >
                  {col.label}
                </p>
                {col.hint && (
                  <p
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.62rem",
                      color: "var(--ow-text-lo)",
                      fontStyle: "italic",
                      marginBottom: "0.6rem",
                    }}
                  >
                    {col.hint}
                  </p>
                )}
                <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                  {col.links.map((l) => (
                    <li key={l.href}>
                      <Link
                        href={l.href}
                        data-testid={`admin-quicklink-${l.href.replace(/[^a-z0-9]+/gi, "-")}`}
                        style={{
                          fontFamily: "'Lato',sans-serif",
                          fontSize: "0.85rem",
                          fontWeight: 300,
                          color: "var(--ow-text-mid)",
                          textDecoration: "none",
                          display: "block",
                          padding: "0.3rem 0",
                        }}
                      >
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="container pb-10">
        <div
          className="flex items-center gap-4 pt-6"
          style={{ borderTop: "1px solid var(--ow-border)" }}
        >
          <div className="amber-rule flex-1" style={{ height: "1px", background: "var(--ow-amber)", opacity: 0.2 }} />
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.7rem",
              color: "var(--ow-text-lo)",
              letterSpacing: "0.06em",
            }}
          >
            OWNOLOGY OWNER PANEL · NOT PUBLICLY LINKED
          </p>
          <div className="amber-rule flex-1" style={{ height: "1px", background: "var(--ow-amber)", opacity: 0.2 }} />
        </div>
      </div>
    </div>
  );
}
