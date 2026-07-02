/**
 * DevBypassToggle — admin-only card on /admin/dev that flips the runtime
 * auth bypass on or off without editing .env or restarting the server.
 *
 * Why runtime, not env-only:
 *   Testing the real Google-OAuth flow used to require restarting the server
 *   with `ENABLE_DEV_BYPASS=false`. This runtime override is ephemeral (24h
 *   hard cap on the backend, resets on restart) so nothing can accidentally
 *   leak to prod.
 *
 * Precedence (backend):
 *   1. Real session cookie always wins.
 *   2. Runtime override (this UI) — auto-injects the seed owner.
 *   3. Env var ENABLE_DEV_BYPASS=true — same behaviour, but static.
 *   4. Otherwise: no user, all protected/owner procedures throw UNAUTHORIZED.
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";

const DURATION_OPTIONS = [
  { minutes: 15, label: "15 min" },
  { minutes: 60, label: "1 hour" },
  { minutes: 240, label: "4 hours" },
  { minutes: 1440, label: "24 hours" },
];

function fmtCountdown(expiresAt: number): string {
  const msLeft = expiresAt - Date.now();
  if (msLeft <= 0) return "expired";
  const mins = Math.round(msLeft / 60_000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.floor(mins / 60);
  const rem = mins % 60;
  return rem === 0 ? `${hrs}h left` : `${hrs}h ${rem}m left`;
}

export function DevBypassToggle() {
  const [minutes, setMinutes] = useState(60);
  const utils = trpc.useUtils();
  const state = trpc.admin.getDevBypassState.useQuery(undefined, {
    refetchInterval: 30_000, // keep the countdown fresh
  });
  const toggle = trpc.admin.setDevBypass.useMutation({
    onSuccess: () => utils.admin.getDevBypassState.invalidate(),
  });

  const runtime = state.data?.runtime;
  const envActive = state.data?.envActive ?? false;
  const effectiveActive = state.data?.effectiveActive ?? false;
  const runtimeActive = runtime?.active ?? false;

  const handleEnable = () => toggle.mutate({ active: true, minutes });
  const handleDisable = () => toggle.mutate({ active: false, minutes: 1 });

  return (
    <div
      data-testid="dev-bypass-toggle-card"
      style={{
        background: "var(--ow-bg-card)",
        border: `1px solid ${effectiveActive ? "color-mix(in oklch, var(--ow-amber) 45%, transparent)" : "var(--ow-border-md)"}`,
        borderRadius: 6,
        padding: "1.1rem 1.2rem",
        marginBottom: "2rem",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
        <div style={{ flex: "1 1 320px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
            <h2
              style={{
                fontFamily: "'Fraunces',serif",
                fontSize: "1.05rem",
                fontWeight: 700,
                margin: 0,
              }}
            >
              Dev Auth Bypass
            </h2>
            <span
              data-testid="dev-bypass-status-pill"
              style={{
                fontSize: "0.66rem",
                fontWeight: 700,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                padding: "0.2rem 0.5rem",
                borderRadius: 4,
                background: effectiveActive ? "var(--ow-amber)" : "color-mix(in oklch, var(--ow-text-lo) 15%, transparent)",
                color: effectiveActive ? "white" : "var(--ow-text-mid)",
              }}
            >
              {effectiveActive ? "ON" : "OFF"}
            </span>
          </div>
          <p style={{ fontSize: "0.82rem", color: "var(--ow-text-mid)", margin: "0 0 0.6rem", lineHeight: 1.45 }}>
            When ON, every request is auto-logged-in as the seed owner. Turn OFF to test the real Google OAuth flow without editing <code>.env</code> or restarting.
          </p>
          <div style={{ fontSize: "0.76rem", color: "var(--ow-text-lo)", lineHeight: 1.5 }}>
            <div>
              <strong>Env var:</strong> <code>ENABLE_DEV_BYPASS={state.data?.envValue === null ? "(unset)" : `"${state.data?.envValue}"`}</code>{" "}
              <span style={{ color: envActive ? "var(--ow-amber)" : "var(--ow-text-lo)" }}>
                → {envActive ? "active" : "inactive"}
              </span>
            </div>
            <div>
              <strong>Runtime override:</strong>{" "}
              {runtimeActive ? (
                <span data-testid="dev-bypass-runtime-active">
                  active · {fmtCountdown(runtime?.expiresAt ?? 0)}
                  {runtime?.setBy ? <> · set by {runtime.setBy}</> : null}
                </span>
              ) : (
                <span>inactive</span>
              )}
            </div>
            {envActive ? (
              <div style={{ marginTop: 6, color: "color-mix(in oklch, var(--ow-amber) 80%, black)" }}>
                Env var is forcing bypass ON. Set <code>ENABLE_DEV_BYPASS=false</code> in prod to lock down.
              </div>
            ) : null}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
          <label style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", fontWeight: 700, letterSpacing: "0.05em", textTransform: "uppercase" }}>
            Duration
          </label>
          <select
            data-testid="dev-bypass-duration"
            value={minutes}
            onChange={(e) => setMinutes(Number(e.target.value))}
            disabled={runtimeActive || toggle.isPending}
            style={{
              background: "var(--ow-bg-base)",
              color: "var(--ow-text-hi)",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 4,
              padding: "0.4rem 0.6rem",
              fontSize: "0.82rem",
              fontFamily: "inherit",
            }}
          >
            {DURATION_OPTIONS.map((o) => (
              <option key={o.minutes} value={o.minutes}>{o.label}</option>
            ))}
          </select>

          {runtimeActive ? (
            <button
              data-testid="dev-bypass-disable-btn"
              onClick={handleDisable}
              disabled={toggle.isPending}
              style={{
                background: "var(--ow-text-hi)",
                color: "var(--ow-bg-base)",
                border: "none",
                borderRadius: 4,
                padding: "0.55rem 0.9rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                cursor: toggle.isPending ? "not-allowed" : "pointer",
                opacity: toggle.isPending ? 0.6 : 1,
              }}
            >
              {toggle.isPending ? "Disabling…" : "Disable bypass"}
            </button>
          ) : (
            <button
              data-testid="dev-bypass-enable-btn"
              onClick={handleEnable}
              disabled={toggle.isPending}
              style={{
                background: "var(--ow-amber)",
                color: "white",
                border: "none",
                borderRadius: 4,
                padding: "0.55rem 0.9rem",
                fontSize: "0.82rem",
                fontWeight: 700,
                letterSpacing: "0.04em",
                cursor: toggle.isPending ? "not-allowed" : "pointer",
                opacity: toggle.isPending ? 0.6 : 1,
              }}
            >
              {toggle.isPending ? "Enabling…" : "Enable bypass"}
            </button>
          )}

          {toggle.isError ? (
            <div data-testid="dev-bypass-error" style={{ fontSize: "0.72rem", color: "var(--ow-red, #b23a3a)" }}>
              {toggle.error?.message || "Toggle failed"}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
