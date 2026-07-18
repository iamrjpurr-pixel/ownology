/**
 * Curriculum access — feature-based tier gating.
 *
 * Every paying tier gets the FULL curriculum content. Tiers differ on FEATURES.
 *
 *   Free Run       — Skim mode only across all 30 lessons.
 *   Cellar Hand    — + Deep + Flash modes, MCQs playable (not persisted).
 *   The Press      — + Scored MCQs, saved progress, individual attainment PDF.
 *   The Vigneron   — + Team seats, admin dashboard, branded team attainment PDFs.
 *
 * Demo bypass: ?preview=free | cellar_hand | press | vigneron
 * Server-side subscription enforcement is a follow-up.
 */

import { useAuth } from "./useAuth";

export type CurriculumTier = "free" | "cellar_hand" | "press" | "vigneron";

const TIER_RANK: Record<CurriculumTier, number> = {
  free: 0,
  cellar_hand: 1,
  press: 2,
  vigneron: 3,
};

function normaliseTier(raw: string): CurriculumTier {
  const t = raw.toLowerCase().replace(/[\s-]+/g, "_").replace(/^the_/, "");
  if (t === "vigneron") return "vigneron";
  if (t === "press") return "press";
  if (t === "cellar_hand" || t === "cellarhand") return "cellar_hand";
  return "free";
}

export function useCurriculumAccess() {
  const auth = useAuth();
  const user = auth?.user;

  const url = typeof window !== "undefined" ? new URL(window.location.href) : null;
  const previewParam = url?.searchParams.get("preview") ?? null;

  const anyUser = (user ?? {}) as Record<string, unknown>;
  const rawPlan =
    (anyUser.plan as string | undefined) ||
    (anyUser.tier as string | undefined) ||
    (anyUser.subscription_plan as string | undefined) ||
    "";

  const tier: CurriculumTier = previewParam
    ? normaliseTier(previewParam)
    : rawPlan
    ? normaliseTier(rawPlan)
    : "free";

  const rank = TIER_RANK[tier];
  const atLeast = (t: CurriculumTier) => rank >= TIER_RANK[t];

  return {
    tier,
    isAuthenticated: Boolean(user),
    // Content
    canRead: {
      titles: true,                // all tiers
      tldr: true,                  // all tiers
      skim: true,                  // all tiers
      deep: atLeast("cellar_hand"),
      flash: atLeast("cellar_hand"),
      workedExample: atLeast("cellar_hand"),
      decisionTree: atLeast("cellar_hand"),
      mcqPlay: atLeast("cellar_hand"),
      citations: atLeast("cellar_hand"),
    },
    // Features (persistence + attainment)
    canPersist: {
      progress: atLeast("press"),
      scoredMcq: atLeast("press"),
      bookmarks: atLeast("press"),
      individualAttainment: atLeast("press"),
    },
    canBusiness: {
      teamSeats: atLeast("vigneron"),
      adminDashboard: atLeast("vigneron"),
      brandedTeamPdf: atLeast("vigneron"),
    },
  };
}
