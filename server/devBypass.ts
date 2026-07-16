/**
 * devBypass — single source of truth for `ENABLE_DEV_BYPASS`.
 *
 * Previously three copies of `isDevBypassActive()` lived in
 * `server/index.ts`, `server/authRouter.ts`, and `server/trpc.ts` and had to
 * be kept in lockstep by hand. The Feb 2026 audit fixed one bug across all
 * three; the Jul 2026 audit (SEC-001) surfaced a different failure mode:
 *
 *   PREVIEW environments were running with `ENABLE_DEV_BYPASS=true` AND
 *   sharing the production Railway MySQL database. Any anonymous internet
 *   visitor to the preview URL therefore got a full-admin identity that
 *   could read/write production data (contacts, wineries, magic tokens).
 *
 * This module hardens the check with SEC-001's fix: even if the flag is
 * turned on by a misconfigured .env, the bypass MUST additionally satisfy
 * a "safe host" gate. Anything reachable from the public internet — cloud
 * preview hosts, tunnels, non-localhost bindings — refuses to honour the
 * bypass, forcing a real cookie session for admin access.
 *
 * The gate has three layers:
 *
 *   1. NODE_ENV !== "production"   — production never bypasses, period.
 *   2. HOST binding is loopback     — the process listens on 127.0.0.1
 *                                     / ::1 (i.e. not exposed).
 *      OR
 *      DEV_BYPASS_ALLOW_PUBLIC="i-know-what-im-doing" — the explicit
 *      escape hatch for automated preview environments the operator
 *      intentionally accepts anonymous-admin risk on (e.g. an ephemeral
 *      Emergent preview that shares no data with prod).
 *
 * Runtime override (`/admin/dev-mode`) still works when the process is
 * already bound to a safe host; it can't upgrade an internet-reachable
 * pod to bypass mode.
 */

import { isRuntimeBypassActive } from "./devBypassRuntime.js";

/** Detect whether the process is listening on a loopback / private host.
 *  Best-effort — reads HOST or BIND_HOST from env; falls back to "0.0.0.0"
 *  which is the platform default and is considered INTERNET-REACHABLE. */
function isBoundToLoopback(): boolean {
  const host = (process.env.HOST || process.env.BIND_HOST || "").trim().toLowerCase();
  if (!host) return false; // no explicit bind → assume 0.0.0.0 (unsafe)
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

/** One-off "I accept the risk" opt-in. Set this env var to the literal
 *  string `i-know-what-im-doing` to permit ENABLE_DEV_BYPASS=true on an
 *  internet-reachable host. Any other value refuses. */
function operatorHasAcceptedPublicBypassRisk(): boolean {
  return process.env.DEV_BYPASS_ALLOW_PUBLIC?.trim() === "i-know-what-im-doing";
}

let warnedAboutRefusedBypass = false;

export function isDevBypassActive(): boolean {
  // Layer 0 — hard "off" always wins.
  if (process.env.ENABLE_DEV_BYPASS === "false") return false;

  const wants = isRuntimeBypassActive() || process.env.ENABLE_DEV_BYPASS === "true";
  if (!wants) return false;

  // Layer 1 — production never bypasses. This closes the historical hole
  // where NODE_ENV was unset and the code fell through to "allow".
  if (process.env.NODE_ENV === "production") {
    if (!warnedAboutRefusedBypass) {
      console.warn("[devBypass] refusing to activate — NODE_ENV=production overrides ENABLE_DEV_BYPASS.");
      warnedAboutRefusedBypass = true;
    }
    return false;
  }

  // Layer 2 — internet-reachable hosts require explicit opt-in.
  const safeHost = isBoundToLoopback();
  const explicitPublicOptIn = operatorHasAcceptedPublicBypassRisk();
  if (!safeHost && !explicitPublicOptIn) {
    if (!warnedAboutRefusedBypass) {
      console.warn(
        "[devBypass] refusing to activate — process is not bound to loopback " +
        "(HOST=" + JSON.stringify(process.env.HOST || "unset") + "). " +
        "This is the SEC-001 hardening from the Jul 2026 audit — anonymous " +
        "admin over a shared prod DB is not allowed on public preview URLs. " +
        "Set DEV_BYPASS_ALLOW_PUBLIC=i-know-what-im-doing to override (do NOT " +
        "do this if the preview shares a database with production)."
      );
      warnedAboutRefusedBypass = true;
    }
    return false;
  }

  return true;
}
