/**
 * devBypassRuntime.ts — runtime kill-switch for the dev-auth bypass.
 *
 * There are two ways the bypass can be on:
 *   1. Env var — `ENABLE_DEV_BYPASS=true` OR (NODE_ENV≠production AND not
 *      explicitly `=false`). This is the historical behaviour; unchanged.
 *   2. Runtime override — an admin flips it on via `/admin/dev-mode`. The
 *      override is *ephemeral*: it lives in this module's memory only, and
 *      auto-expires after `expiresAt`. A server restart resets it to off,
 *      which is the safe default.
 *
 * Both sources OR together — either being on activates bypass. This means
 * a prod deploy with `ENABLE_DEV_BYPASS=false` starts fully locked, and an
 * authenticated admin can temporarily open it via the UI for testing.
 *
 * Consumers: `server/index.ts::isDevBypassActive`, `server/authRouter.ts
 * ::isDevBypassEnabled`, and `server/trpc.ts::createContext`.
 */

type RuntimeState = {
  active: boolean;
  expiresAt: number; // ms epoch. 0 = no expiry set (i.e. active===false).
  setBy: string | null; // admin openId who flipped it, for logging only.
  setAt: number;
};

const state: RuntimeState = {
  active: false,
  expiresAt: 0,
  setBy: null,
  setAt: 0,
};

const MAX_DURATION_MS = 24 * 60 * 60 * 1000; // Hard cap: 24 hours.

export function isRuntimeBypassActive(): boolean {
  if (!state.active) return false;
  if (Date.now() >= state.expiresAt) {
    // Auto-expire — flip back to off. Cheap; no timer needed.
    state.active = false;
    state.expiresAt = 0;
    state.setBy = null;
    return false;
  }
  return true;
}

export function getRuntimeBypassState(): RuntimeState & { active: boolean } {
  // Force expiry check so callers see fresh state.
  const live = isRuntimeBypassActive();
  return { ...state, active: live };
}

export function setRuntimeBypass(active: boolean, minutes: number, setBy: string | null): RuntimeState {
  if (!active) {
    state.active = false;
    state.expiresAt = 0;
    state.setBy = null;
    state.setAt = Date.now();
    console.warn(`[dev-bypass] runtime override DISABLED by ${setBy ?? "(unknown)"}`);
    return { ...state };
  }
  const safeMinutes = Math.max(1, Math.min(minutes, MAX_DURATION_MS / 60_000));
  state.active = true;
  state.expiresAt = Date.now() + safeMinutes * 60_000;
  state.setBy = setBy;
  state.setAt = Date.now();
  console.warn(`[dev-bypass] runtime override ENABLED by ${setBy ?? "(unknown)"} for ${safeMinutes} min (expires ${new Date(state.expiresAt).toISOString()})`);
  return { ...state };
}
