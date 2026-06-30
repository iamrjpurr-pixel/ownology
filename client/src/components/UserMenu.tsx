/**
 * UserMenu — fixed top-right widget showing signed-in identity + sign-out.
 *
 * Only rendered when an authenticated session exists. Anonymous users
 * never see it, so the public site stays clean.
 *
 * Click the trigger to open a small panel with:
 *   - Avatar (Google picture if we have it, otherwise initials)
 *   - Name + email
 *   - Role badge (ADMIN / USER)
 *   - Sign-out button → POST /api/auth/logout → hard reload to /
 *
 * Multi-tenant note: once we wire winery accounts, this is where the
 * "Switch winery" entry will live. For now it's identity + logout.
 */
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/lib/useAuth";

function initialsOf(name?: string, email?: string): string {
  const src = (name || email || "?").trim();
  const parts = src.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return src.slice(0, 2).toUpperCase();
}

export default function UserMenu() {
  const { user, status, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [open]);

  if (status !== "authed" || !user) return null;

  const initials = initialsOf(user.name, user.email);

  return (
    <div
      ref={ref}
      data-testid="user-menu"
      style={{
        position: "fixed",
        top: "calc(0.9rem + env(safe-area-inset-top, 0px))",
        right: "0.9rem",
        zIndex: 9998,
        fontFamily: "'Lato',sans-serif",
      }}
    >
      <button
        type="button"
        data-testid="user-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        aria-label="Account menu"
        aria-expanded={open}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          background: "var(--ow-bg-card)",
          border: "1px solid var(--ow-border-md)",
          borderRadius: 999,
          padding: "4px 10px 4px 4px",
          cursor: "pointer",
          boxShadow: "0 6px 18px rgba(0,0,0,0.18)",
        }}
      >
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "var(--ow-amber)",
            color: "white",
            fontSize: "0.74rem",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {user.picture ? (
            <img
              src={user.picture}
              alt=""
              referrerPolicy="no-referrer"
              style={{ width: "100%", height: "100%", borderRadius: "50%" }}
            />
          ) : (
            initials
          )}
        </span>
        <span
          style={{
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--ow-text-hi)",
          }}
        >
          {user.role === "admin" ? "Admin" : "Account"}
        </span>
      </button>

      {open && (
        <div
          role="menu"
          data-testid="user-menu-panel"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            right: 0,
            minWidth: 260,
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "12px 12px 8px",
            boxShadow: "0 16px 40px rgba(0,0,0,0.32)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "var(--ow-amber)",
                color: "white",
                fontSize: "0.86rem",
                fontWeight: 700,
              }}
            >
              {user.picture ? (
                <img
                  src={user.picture}
                  alt=""
                  referrerPolicy="no-referrer"
                  style={{ width: "100%", height: "100%", borderRadius: "50%" }}
                />
              ) : (
                initials
              )}
            </span>
            <div style={{ minWidth: 0, flexGrow: 1 }}>
              {user.name && (
                <div
                  style={{
                    fontSize: "0.86rem",
                    fontWeight: 700,
                    color: "var(--ow-text-hi)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                  data-testid="user-menu-name"
                >
                  {user.name}
                </div>
              )}
              <div
                style={{
                  fontSize: "0.74rem",
                  color: "var(--ow-text-lo)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
                data-testid="user-menu-email"
              >
                {user.email || user.openId}
              </div>
            </div>
          </div>

          <div style={{ marginBottom: 10 }}>
            <span
              data-testid="user-menu-role"
              style={{
                display: "inline-block",
                fontSize: "0.62rem",
                fontWeight: 700,
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: user.role === "admin" ? "var(--ow-amber)" : "var(--ow-text-mid)",
                border: `1px solid ${user.role === "admin" ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
                borderRadius: 3,
                padding: "2px 7px",
              }}
            >
              {user.role}
            </span>
          </div>

          <button
            type="button"
            data-testid="user-menu-logout"
            onClick={() => {
              setOpen(false);
              logout();
            }}
            style={{
              display: "block",
              width: "100%",
              padding: "8px 12px",
              background: "transparent",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.78rem",
              fontWeight: 700,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              color: "var(--ow-text-hi)",
              textAlign: "center",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background =
                "color-mix(in oklch, var(--ow-amber) 8%, transparent)";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-amber)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "transparent";
              (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-border-md)";
            }}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
