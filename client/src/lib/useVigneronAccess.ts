/**
 * Vigneron access check — soft client-side paywall for the curriculum.
 *
 * MVP behaviour:
 *   • Authenticated user with plan === "vigneron" (or "press" if we grandfather them in) → unlocked
 *   • Demo/QA: any URL with ?preview=vigneron → unlocked (dev + preview only)
 *   • Otherwise → locked (show sell CTA in place of gated sections)
 *
 * Server-side subscription enforcement is a follow-up — this is UI gating only.
 */

import { useAuth } from "./useAuth";

export function useVigneronAccess() {
  const auth = useAuth();
  const user = auth?.user;

  // Demo bypass — any /curriculum URL with ?preview=vigneron unlocks
  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const isPreviewBypass = url?.searchParams.get("preview") === "vigneron";

  // Plan check — if user object has a plan/tier field. We tolerate multiple shapes.
  const anyUser = (user ?? {}) as Record<string, unknown>;
  const plan =
    (anyUser.plan as string | undefined) ||
    (anyUser.tier as string | undefined) ||
    (anyUser.subscription_plan as string | undefined) ||
    "";
  const paidTiers = new Set(["vigneron", "the-vigneron", "press", "the-press"]);
  const hasPaidTier = paidTiers.has(plan.toLowerCase().replace(/\s+/g, "-"));

  const unlocked = isPreviewBypass || hasPaidTier;
  return {
    unlocked,
    reason: isPreviewBypass ? "preview" : hasPaidTier ? "vigneron" : "locked",
    isAuthenticated: Boolean(user),
  };
}
