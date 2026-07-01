/**
 * WorkModeLayout — Ownology Work Mode Shell (DailyMe-Inspired)
 *
 * Light, minimal design with:
 *   - Light gray background (#F8F9FA)
 *   - White cards and surfaces
 *   - Pill-shaped buttons (24px border radius)
 *   - Circular progress indicators
 *   - Clean typography
 *   - Lots of white space
 *
 * Usage:
 *   <WorkModeLayout title="The Press" activeTab="press">
 *     <ThePress />
 *   </WorkModeLayout>
 */

import { useLocation } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Link } from "wouter";

interface WorkModeLayoutProps {
  children: React.ReactNode;
  title?: string;
  activeTab?: "ask" | "press" | "log" | "tasks" | "more";
  hideBottomNav?: boolean;
  /**
   * Opt-in wider desktop shell. Mobile (< 1024px) still gets the canonical
   * 430px mobile-first PWA shell. lg+ screens expand to 1280px so dense
   * content pages like /knowledge can breathe instead of squashing
   * `xl:grid-cols-4` into ~430px. Bottom nav stays centered + 430px wide
   * regardless of shell width so it keeps its thumb-zone feel.
   */
  wide?: boolean;
}

const NAV_ITEMS = [
  {
    id: "ask" as const,
    label: "Ask",
    href: "/free-run",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M9 10C9 8.343 10.343 7 12 7s3 1.343 3 3c0 1.5-1.5 2-1.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="12" cy="17" r="1" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "press" as const,
    label: "Press",
    href: "/the-press",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="3" width="16" height="18" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 9h8M8 12h8M8 15h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "log" as const,
    label: "Log",
    href: "/quick-entry",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
        <path d="M12 8v4l2.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "tasks" as const,
    label: "Tasks",
    href: "/cellar-tasks",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <rect x="4" y="4" width="16" height="16" rx="2" stroke="currentColor" strokeWidth="1.5" />
        <path d="M8 12l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "more" as const,
    label: "More",
    href: "/dashboard",
    icon: (
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
        <circle cx="6" cy="12" r="1.5" fill="currentColor" />
        <circle cx="12" cy="12" r="1.5" fill="currentColor" />
        <circle cx="18" cy="12" r="1.5" fill="currentColor" />
      </svg>
    ),
  },
];

export default function WorkModeLayout({
  children,
  title,
  activeTab,
  hideBottomNav = false,
  wide = false,
}: WorkModeLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#F8F9FA",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Desktop surround — light gray on sides */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "#E8EAED",
          zIndex: -1,
        }}
        className="hidden md:block"
      />

      {/* App shell — 430px on mobile; widens to 1280px on lg+ when wide=true. */}
      <div
        className={wide ? "ow-work-shell ow-work-shell--wide" : "ow-work-shell"}
        style={{
          width: "100%",
          maxWidth: "430px",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "#F8F9FA",
          position: "relative",
        }}
      >
        {/* lg+ override for wide shells — bumps the max-width to 1280px so
            content-dense pages like /knowledge breathe instead of squashing
            the responsive grid into a 430px column. */}
        <style>{`
          @media (min-width: 1024px) {
            .ow-work-shell--wide { max-width: 1280px !important; }
          }
        `}</style>
        {/* ── Top bar ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem",
            paddingTop: "calc(1rem + env(safe-area-inset-top, 0px))",
            borderBottom: "1px solid #E8EAED",
            background: "#FFFFFF",
            position: "sticky",
            top: "var(--ow-trial-banner-h, 0px)",
            zIndex: 50,
          }}
        >
          <Link href="/">
            <button style={{ background: "none", border: "none", cursor: "pointer", padding: 0, display: "flex", alignItems: "center" }} aria-label="Back to home">
              <OwnologyLogo size={28} showWordmark={false} showIABadge={false} showTheoryCard={false} />
            </button>
          </Link>
          {title && (
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "#1A1A1A",
                letterSpacing: "-0.01em",
              }}
            >
              {title}
            </span>
          )}
          {/* Profile / settings icon */}
          <button
            onClick={() => navigate("/dashboard")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#666666",
              padding: "0.5rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "color 0.2s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = "#1A1A1A")}
            onMouseLeave={(e) => (e.currentTarget.style.color = "#666666")}
            aria-label="Profile and settings"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="9" r="4" stroke="currentColor" strokeWidth="1.5" />
              <path d="M4 20c0-4.418 3.582-8 8-8h0c4.418 0 8 3.582 8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>
        </header>

        {/* ── Main content ── */}
        <main
          style={{
            flex: 1,
            overflowY: "auto",
            paddingBottom: hideBottomNav
              ? "env(safe-area-inset-bottom, 0px)"
              : "calc(5rem + env(safe-area-inset-bottom, 0px))",
          }}
        >
          {children}
        </main>

        {/* ── Bottom navigation ── */}
        {!hideBottomNav && (
          <nav
            style={{
              position: "fixed",
              bottom: 0,
              left: "50%",
              transform: "translateX(-50%)",
              width: "100%",
              maxWidth: "430px",
              background: "#FFFFFF",
              borderTop: "1px solid #E8EAED",
              paddingBottom: "env(safe-area-inset-bottom, 0px)",
              zIndex: 40,
              display: "flex",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => navigate(item.href)}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "0.25rem",
                    padding: "0.75rem 0.5rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive ? "#B0741A" : "#999999",
                    transition: "color 0.15s",
                    minHeight: "60px",
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.625rem",
                      fontWeight: isActive ? 600 : 400,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                      color: isActive ? "#B0741A" : "#999999",
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}
