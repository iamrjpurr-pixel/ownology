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

const TOOLS: AdminTool[] = [
  {
    label: "Campaign Metrics",
    description: "Week-by-week KPI snapshots — waitlist growth, MRR trajectory, email open rates, organic sessions, and compliance query volume.",
    href: "/campaign-metrics",
    icon: <IconChart />,
    badge: "Weekly cron",
  },
  {
    label: "Orders",
    description: "Live Stripe checkout session history — order table, customer emails, line items, revenue summary, and direct links to the Stripe dashboard.",
    href: "/orders",
    icon: <IconOrders />,
    badge: "Live Stripe",
  },
  {
    label: "Founding Members",
    description: "View and manage founding member registrations. Add members manually, track winery names and states, and monitor tier distribution.",
    href: "/campaign-metrics",
    icon: <IconMembers />,
  },
  {
    label: "Compliance Agent",
    description: "The owner-facing view of the AI regulatory Q&A tool. Test questions across all seven jurisdictions and review knowledge base coverage.",
    href: "/compliance",
    icon: <IconCompliance />,
  },
  {
    label: "Merch Store",
    description: "The public-facing merch store. Review product listings, artwork, cart behaviour, and Stripe checkout flow before publishing.",
    href: "/merch",
    icon: <IconMerch />,
  },
  {
    label: "Pricing Page",
    description: "Review subscription tiers, credit packs, founding member counter, and the Buttondown waitlist capture CTA.",
    href: "/pricing",
    icon: <IconPricing />,
  },
  {
    label: "Lead CRM",
    description: "Every email sign-up stored in your own database — source tag, date, winery name, and inline notes. CSV export included.",
    href: "/admin/leads",
    icon: <IconLeads />,
    badge: "New",
  },
  {
    label: "Compliance Doctrine Map",
    description: "Read-only view of all canonical Q&A doctrine entries — grouped by topic, with jurisdiction badges, citations, keywords, and last-verified dates.",
    href: "/admin/compliance-doctrine",
    icon: <IconCompliance />,
    badge: "Doctrine",
  },
  {
    label: "Vintage Intelligence",
    description: "Manage regional vintage data (2024 and beyond) that is automatically injected into the Free Run AI Tutor when a user mentions a region or vintage year.",
    href: "/admin/vintage-intelligence",
    icon: <IconVintage />,
    badge: "AI Context",
  },
  {
    label: "WBS Knowledge Publisher",
    description: "Control which Red Wine Bible (and White Wine Bible) chapters are live in the DIY home winemaker tutor. Toggle individual chapters or entire WBS domains.",
    href: "/admin/wbs",
    icon: <IconKnowledge />,
    badge: "DIY Tutor",
  },
  {
    label: "Trinity Review",
    description: "Review community blog pieces auto-drafted nightly from clusters of real Free Run questions. Promote the best to Featured, suppress duplicates, and action accuracy flags.",
    href: "/admin/trinity",
    icon: <IconKnowledge />,
    badge: "Pipeline",
  },
  {
    label: "Conversion Funnel",
    description: "Where do paid signups actually come from? Every /pricing visit is tagged by source (free-paused, homepage, press CTA, cellar-journal…) so you can tune budgets and CTAs against real conversion data.",
    href: "/admin/funnel",
    icon: <IconLeads />,
    badge: "Attribution",
  },
  {
    label: "Personal SMS Contacts",
    description: "Outreach pipeline for warm leads met at wine events. Add a winemaker → get a personalised /hi/<slug> landing page + ready-to-send SMS draft. Tracks who opened the link and who booked a demo.",
    href: "/admin/contacts",
    icon: <IconLeads />,
    badge: "Outreach",
  },
  {
    label: "Marketing Kit",
    description: "Every outreach asset in one place — sample-vintage-log variant URLs (Hunter / Boutique / Large), email signature templates, and LinkedIn DM copy. One-click copy for each. Bookmark this.",
    href: "/admin/marketing-kit",
    icon: <IconLeads />,
    badge: "Assets",
  },
];

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

      {/* Tool cards grid */}
      <div className="container py-10">
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
            marginBottom: "1.5rem",
          }}
        >
          Owner Tools
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {TOOLS.map((tool) => (
            <ToolCard key={tool.href + tool.label} tool={tool} />
          ))}
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
