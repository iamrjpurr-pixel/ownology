/**
 * UI feature flags — small, deliberately-typed switches for reversible UX.
 *
 * Design principle: any high-risk visual change (hero, primary nav, layout)
 * lives behind a flag here for a short window (weeks, not months). If the
 * new variant survives real-user contact, we delete the flag + the old code.
 * If it doesn't, we flip one boolean and revert instantly — no git surgery,
 * no rebuild.
 *
 * URL override: append `?ui=v0` to any page to force the OLD variant for
 * this session only (via sessionStorage). Append `?ui=v1` to force the NEW
 * variant. Handy for Rich to A/B a prospect on a live call without deploys.
 *
 * When you ship a variant permanently, delete the flag AND every reference
 * to the old branch. Do NOT leave dormant flag paths lying around.
 */
const V0 = "v0" as const;
const V1 = "v1" as const;

const URL_OVERRIDE_KEY = "ow_ui_override";

function readOverride(): typeof V0 | typeof V1 | null {
  if (typeof window === "undefined") return null;
  try {
    // URL param wins for the current request…
    const url = new URLSearchParams(window.location.search).get("ui");
    if (url === V0 || url === V1) {
      window.sessionStorage.setItem(URL_OVERRIDE_KEY, url);
      return url;
    }
    // …then fall back to whatever this session already picked.
    const stored = window.sessionStorage.getItem(URL_OVERRIDE_KEY);
    if (stored === V0 || stored === V1) return stored;
  } catch {
    /* private mode, storage disabled — ignore */
  }
  return null;
}

/**
 * UI_PILLARS_V1 — the 4-pillar (Do · Know · Learn · Guide) hero + Work Mode
 * nav experiment.
 *
 * Ship date: Feb 2026. Review at: Mar 2026 (~4 weeks of prospect contact).
 * If conversion holds or improves → delete flag + `HeroPillarsSection` +
 * old hero code. If it hurts → flip to `false`, cut losses, delete
 * `HeroPillarsSection`.
 */
export function useUiPillarsV1(): boolean {
  const override = readOverride();
  if (override === V1) return true;
  if (override === V0) return false;
  // Default: ON. Rich wants the new variant live for the outbound push;
  // anyone wanting the old hero can hit `?ui=v0` to compare.
  return true;
}
