/**
 * Ownology theme registry.
 *
 * Adds soft-cellar (the rebalanced dark) and treats themes as a registry,
 * not a hardcoded toggle. Operators can pick whichever theme matches their
 * working light — cellar floor at dawn, harvest pad at noon, lab in the
 * evening — and the choice persists per browser via localStorage.
 *
 * Admin can enable/disable themes via VITE_ENABLED_THEMES env (comma-list
 * of theme ids). Default: all enabled. Empty/missing env = all enabled.
 */
export type ThemeId = "soft-cellar" | "parchment" | "cellar" | "auto" | "red-crush" | "white-crush";

export type Theme = {
  id: ThemeId;
  label: string;
  description: string;
  /** HTML class to apply. null = no class (auto resolves at runtime). */
  htmlClass: string | null;
  /** Whether this theme is fundamentally dark, light, or system-derived. */
  kind: "dark" | "light" | "system";
};

/** Canonical theme catalogue. Order = the cycle order in the nav picker. */
export const THEMES: Theme[] = [
  {
    id: "soft-cellar",
    label: "Soft Cellar",
    description: "Warm soft umber + boosted contrast. Best for long sessions in low ambient light.",
    htmlClass: "theme-soft-cellar",
    kind: "dark",
  },
  {
    id: "parchment",
    label: "Parchment",
    description: "Warm cream daylight. Best for harvest pad / lab / outdoors / long-form reading.",
    htmlClass: "theme-parchment light-mode",
    kind: "light",
  },
  {
    id: "red-crush",
    label: "Red Crush",
    description: "🍇 Pure white + rose-pink accent — the colour of Pinot juice on the press. Sun-readable.",
    htmlClass: "theme-red-crush light-mode",
    kind: "light",
  },
  {
    id: "white-crush",
    label: "White Crush",
    description: "🍏 Pure white + apple-green accent — the colour of Chardonnay fresh off the picker.",
    htmlClass: "theme-white-crush light-mode",
    kind: "light",
  },
  {
    id: "auto",
    label: "Auto",
    description: "Follows your phone or laptop's light/dark setting. Switches automatically.",
    htmlClass: null,
    kind: "system",
  },
  {
    id: "cellar",
    label: "Cellar Night",
    description: "Original near-black. Some operators prefer this — kept available.",
    htmlClass: null,
    kind: "dark",
  },
];

/** New-user default. Auto follows the device's light/dark preference, so
 *  morning-cellar operators land in soft-cellar, afternoon-outdoors land
 *  in parchment, without ever having to click anything. */
export const DEFAULT_THEME_ID: ThemeId = "auto";

/** Read enabled themes from Vite env. Missing/empty → all enabled. */
function getEnabledThemeIds(): Set<ThemeId> {
  const raw: string = String(import.meta.env.VITE_ENABLED_THEMES ?? "").trim();
  if (!raw) return new Set(THEMES.map((t) => t.id));
  const ids = raw.split(",").map((s: string) => s.trim().toLowerCase()).filter(Boolean);
  const valid = new Set<string>(THEMES.map((t) => String(t.id)));
  return new Set(ids.filter((id: string): id is ThemeId => valid.has(id)));
}

/** Themes that admin has enabled for end users. Includes the default
 *  even if accidentally disabled, so users are never stranded. */
export function getEnabledThemes(): Theme[] {
  const enabled = getEnabledThemeIds();
  enabled.add(DEFAULT_THEME_ID); // safety: never strand the default
  return THEMES.filter((t) => enabled.has(t.id));
}

export function getTheme(id: ThemeId | string | null | undefined): Theme {
  const found = THEMES.find((t) => t.id === id);
  return found ?? THEMES.find((t) => t.id === DEFAULT_THEME_ID)!;
}

/** Resolve "auto" → the concrete dark or light theme right now. Used by
 *  the toggle button for display purposes (so users see Night/Daylight
 *  reflected rather than a generic Auto icon at all times).
 *
 *  Device-aware policy (Feb 2026, Rich):
 *  - Desktop/mouse (fine pointer) → parchment (light). Rich's PC has
 *    system=dark but he prefers the light theme when working at a desk.
 *  - Touch device (coarse pointer, phones/tablets) → respect system
 *    dark/light preference so late-night SMS-follow-ups don't blast
 *    the operator's eyes.
 *  A user's explicit pick (via the picker) always overrides — this
 *  function only fires when the picker is set to "auto". */
export function resolveAutoTheme(): Theme {
  if (typeof window === "undefined") return getTheme("parchment");
  // "coarse" pointer = touch primary → phone/tablet.
  const isTouch = window.matchMedia("(pointer: coarse)").matches;
  if (!isTouch) {
    // Desktop → light default regardless of OS dark-mode setting.
    return getTheme("parchment");
  }
  // Mobile → honour system preference.
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  return getTheme(prefersDark ? "soft-cellar" : "parchment");
}

/** Apply a theme to <html>. Strips all known theme classes first to keep
 *  the class list clean. Auto resolves dynamically. Also manages the
 *  shadcn/Tailwind `dark` class so it always tracks the resolved theme's
 *  kind (dark vs light) — this prevents a stale `dark` class from leaking
 *  into hover cards / portaled UI when the user switches to a light theme. */
export function applyThemeToDom(themeId: ThemeId): void {
  if (typeof document === "undefined") return;
  const html = document.documentElement;
  // Strip any previously-applied theme classes (any token from any theme)
  const classesToStrip = new Set<string>();
  for (const t of THEMES) {
    if (!t.htmlClass) continue;
    for (const c of t.htmlClass.split(/\s+/)) classesToStrip.add(c);
  }
  // Also strip the shadcn dark-mode flag — we re-add it below only if the
  // resolved theme is dark-kind. This is what keeps the OwnologyLogo hover
  // card / theory panel in sync with the active theme.
  classesToStrip.add("dark");
  classesToStrip.forEach((c) => html.classList.remove(c));

  const theme = getTheme(themeId);
  const target = theme.kind === "system" ? resolveAutoTheme() : theme;
  if (target.htmlClass) {
    target.htmlClass.split(/\s+/).forEach((c) => html.classList.add(c));
  }
  if (target.kind === "dark") {
    html.classList.add("dark");
  }
}
