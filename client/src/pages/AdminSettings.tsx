/**
 * AdminSettings — operator-facing preferences. Single source of truth for
 * per-user toggles (unit system, theme suggestions, future: branding).
 *
 * Surfaces are organised "what they control" not "where they live in the DB"
 * — winemakers don't care that unit_system is a column. They care that
 * "this app shows me metric numbers."
 *
 * Mounted at /admin/settings (admin-only because it operates on the
 * currently-signed-in user; tomorrow this becomes per-winery settings).
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type UnitSystem = "metric" | "imperial";

export default function AdminSettings() {
  const { data: me, refetch } = trpc.admin.me.useQuery();
  const updateUnits = trpc.admin.updateUnitSystem.useMutation({
    onSuccess: () => refetch(),
  });
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (me?.unitSystem === "imperial" || me?.unitSystem === "metric") {
      setUnitSystem(me.unitSystem);
    }
  }, [me?.unitSystem]);

  function pick(u: UnitSystem) {
    if (u === unitSystem) return;
    setUnitSystem(u);
    updateUnits.mutate(
      { unitSystem: u },
      {
        onSuccess: () => {
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 1800);
        },
      }
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        padding: "2rem 1.5rem 4rem",
        fontFamily: "'Lato',sans-serif",
      }}
      data-testid="admin-settings"
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link to="/admin" style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
          ← Admin
        </Link>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "2rem",
            fontWeight: 700,
            margin: "0.5rem 0 2rem",
            letterSpacing: "-0.01em",
          }}
        >
          Settings
        </h1>

        {/* Unit system */}
        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.4rem 1.4rem 1.2rem",
            marginBottom: "1.4rem",
          }}
          data-testid="settings-unit-system"
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
            Units of measurement
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            How Ownology talks to you and prints exports. Boutique-scale defaults assume metric (L, kg, °C). The AI silently converts imperial to metric on input so this affects display, not data.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { id: "metric" as const, label: "Metric", subtitle: "L · kg · °C · g/L" },
              { id: "imperial" as const, label: "Imperial", subtitle: "gal · lb · °F" },
            ].map((opt) => {
              const active = unitSystem === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`unit-${opt.id}`}
                  onClick={() => pick(opt.id)}
                  disabled={updateUnits.isPending}
                  style={{
                    flexBasis: 200,
                    flexGrow: 1,
                    minHeight: 44,
                    padding: "0.7rem 1rem",
                    background: active ? "color-mix(in oklch, var(--ow-amber) 14%, transparent)" : "transparent",
                    border: active ? "1.5px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
                    borderRadius: 6,
                    cursor: updateUnits.isPending ? "wait" : "pointer",
                    textAlign: "left",
                    color: "var(--ow-text-hi)",
                  }}
                >
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.96rem" }}>
                    {opt.label} {active && <span style={{ color: "var(--ow-amber)", marginLeft: 4 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", marginTop: 2 }}>
                    {opt.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
          {savedFlash && (
            <div data-testid="settings-saved" style={{ marginTop: "0.9rem", fontSize: "0.78rem", color: "var(--ow-amber)" }}>
              Saved.
            </div>
          )}
        </section>

        {/* Theme suggestion opt-out (reads localStorage) */}
        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.4rem",
            marginBottom: "1.4rem",
          }}
          data-testid="settings-theme-suggestions"
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
            Theme suggestions
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: "0 0 0.9rem", lineHeight: 1.5 }}>
            Once-a-day banner that recommends a theme based on local time (e.g. Soft Cellar at dawn, Cellar Night after 7pm).
          </p>
          <ThemeSuggestionOptOutToggle />
        </section>

        {/* Account */}
        {me && (
          <section
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 8,
              padding: "1.4rem",
            }}
            data-testid="settings-account"
          >
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.6rem" }}>
              Account
            </h2>
            <div style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", lineHeight: 1.7 }}>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Name</span> · {me.name || "—"}</div>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Email</span> · {me.email || "—"}</div>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Role</span> · {me.role || "user"}</div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function ThemeSuggestionOptOutToggle() {
  const [optedOut, setOptedOut] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOptedOut(window.localStorage.getItem("ownology-theme-suggest-opt-out") === "1");
  }, []);
  function toggle() {
    const next = !optedOut;
    setOptedOut(next);
    try {
      if (next) window.localStorage.setItem("ownology-theme-suggest-opt-out", "1");
      else window.localStorage.removeItem("ownology-theme-suggest-opt-out");
    } catch { /* noop */ }
  }
  return (
    <button
      type="button"
      data-testid="theme-suggest-toggle"
      onClick={toggle}
      style={{
        minHeight: 44,
        padding: "0.6rem 1.2rem",
        background: optedOut ? "transparent" : "var(--ow-amber)",
        color: optedOut ? "var(--ow-text-mid)" : "white",
        border: optedOut ? "1px solid var(--ow-border-md)" : "none",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {optedOut ? "Currently off — Turn on" : "Currently on — Turn off"}
    </button>
  );
}
