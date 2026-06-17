/**
 * WorkModeLayout — Ownology Work Mode Shell
 *
 * A mobile-first app shell that wraps all working pages (Free Run, The Press,
 * Quick Entry, Cellar Tasks, Dashboard). Provides:
 *   - Minimal top bar: Trinity logo + page title only, no marketing nav
 *   - Cross-app bottom navigation: Ask · Press · Log · Tasks · More
 *   - Safe-area padding for notched phones
 *   - On desktop: centred at 430px max-width with dark surround (phone-on-desk feel)
 *
 * Usage:
 *   <WorkModeLayout title="The Press" activeTab="press">
 *     <ThePress />
 *   </WorkModeLayout>
 */

import { useLocation } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

interface WorkModeLayoutProps {
  children: React.ReactNode;
  title?: string;
  /** Which bottom nav tab is active */
  activeTab?: "ask" | "press" | "log" | "tasks" | "more";
  /** Hide the bottom nav (e.g. when a sheet/modal is open) */
  hideBottomNav?: boolean;
}

const NAV_ITEMS = [
  {
    id: "ask" as const,
    label: "Ask",
    href: "/free-run",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M8.5 9C8.5 7.619 9.619 6.5 11 6.5s2.5 1.119 2.5 2.5c0 1.5-1.5 2-1.5 3.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <circle cx="11" cy="15.5" r="0.9" fill="currentColor" />
      </svg>
    ),
  },
  {
    id: "press" as const,
    label: "Press",
    href: "/the-press",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3.5" y="2.5" width="15" height="17" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7 8h8M7 11h8M7 14h5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "log" as const,
    label: "Log",
    href: "/quick-entry",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="11" cy="11" r="8.5" stroke="currentColor" strokeWidth="1.4" />
        <path d="M11 7v4l2.5 2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 3.5L5 1M14.5 3.5L17 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "tasks" as const,
    label: "Tasks",
    href: "/cellar-tasks",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <rect x="3.5" y="3.5" width="15" height="15" rx="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M7.5 11l2.5 2.5 5-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  {
    id: "more" as const,
    label: "More",
    href: "/dashboard",
    icon: (
      <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
        <circle cx="6" cy="11" r="1.4" fill="currentColor" />
        <circle cx="11" cy="11" r="1.4" fill="currentColor" />
        <circle cx="16" cy="11" r="1.4" fill="currentColor" />
      </svg>
    ),
  },
];

export default function WorkModeLayout({
  children,
  title,
  activeTab,
  hideBottomNav = false,
}: WorkModeLayoutProps) {
  const [, navigate] = useLocation();

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "var(--ow-bg)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* Desktop surround — dark bleed on sides when viewport > 430px */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0.08 0.005 60)",
          zIndex: -1,
        }}
        className="hidden md:block"
      />

      {/* App shell — max 430px, full height */}
      <div
        style={{
          width: "100%",
          maxWidth: "430px",
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          background: "var(--ow-bg)",
          position: "relative",
        }}
      >
        {/* ── Top bar ── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0.75rem 1rem",
            paddingTop: "calc(0.75rem + env(safe-area-inset-top, 0px))",
            borderBottom: "1px solid var(--ow-border)",
            background: "var(--ow-bg-card)",
            position: "sticky",
            top: 0,
            zIndex: 50,
          }}
        >
          <OwnologyLogo size={28} showWordmark={false} showIABadge={false} showTheoryCard={false} />
          {title && (
            <span
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1rem",
                fontWeight: 600,
                color: "var(--ow-text-hi)",
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
              color: "var(--ow-text-lo)",
              padding: "0.25rem",
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
            aria-label="Profile and settings"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <circle cx="11" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.4" />
              <path d="M4 19c0-3.866 3.134-7 7-7h0c3.866 0 7 3.134 7 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
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
              : "calc(4.5rem + env(safe-area-inset-bottom, 0px))",
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
              background: "var(--ow-bg-card)",
              borderTop: "1px solid var(--ow-border)",
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
                    gap: "0.2rem",
                    padding: "0.6rem 0.25rem",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: isActive ? "var(--ow-amber)" : "var(--ow-text-lo)",
                    transition: "color 0.15s",
                    minHeight: "56px",
                  }}
                  aria-label={item.label}
                  aria-current={isActive ? "page" : undefined}
                >
                  {item.icon}
                  <span
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.625rem",
                      fontWeight: isActive ? 700 : 400,
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
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
