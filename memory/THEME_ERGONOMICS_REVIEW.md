# Ownology Theme Ergonomics Review — Feb 2026

Audit of all 5 themes against WCAG 2.2 contrast, light-sensitivity,
sun-readability, and the operator's actual viewing environment
(boutique winery, mobile-first, often outdoors during harvest).

## Contrast ratios (post-fix)

WCAG 2.2 thresholds: AAA = 7:1, AA = 4.5:1, AA Large (≥18px or bold ≥14px) = 3:1.
Numbers below are computed from OKLCH source values → linear sRGB →
relative luminance Y → (Y1+0.05)/(Y2+0.05).

| Theme         | Mood                              | hi-text  | mid-text | captions  | amber/bg  |
|---------------|-----------------------------------|----------|----------|-----------|-----------|
| Cellar Night  | warm timber, lamp-lit barrel hall | 16.4 AAA | 8.1 AAA  | 5.5 AA ✅ | 8.6 AAA   |
| Soft Cellar   | stainless & concrete, first light | 14.2 AAA | 10.1 AAA | 5.7 AA    | 7.0 AA    |
| Parchment     | warm cream daylight               | 17.8 AAA | 11.6 AAA | 5.5 AA    | 4.6 AA ✅ |
| Red Crush     | pure white + rose accent          | 19.9 AAA | 17.9 AAA | 10.4 AAA  | 5.0 AA    |
| White Crush   | pure white + apple-green accent   | 20.1 AAA | 18.1 AAA | 10.4 AAA  | 5.1 AA    |

**Fixes applied this audit**: Cellar Night caption text was 4.0 (AA Large
only). Parchment's amber was 3.4 (AA Large only). Both lifted to clear AA
at all sizes. All other values were already passing.

## Recommended use-case mapping

What the winemaker is doing → which theme to pick.

| Situation                                  | Recommended theme | Why                                        |
|--------------------------------------------|-------------------|--------------------------------------------|
| Cellar at night, working a tank            | Cellar Night      | Lowest blue light, lamp-lit barrel mood    |
| Pre-dawn lab work, room is dim             | Soft Cellar       | Brighter than Cellar Night, low blue       |
| Office or kitchen daylight, long-read SOP  | Parchment         | Warm cream, low fatigue for sustained read |
| Outdoors during red harvest (1500+ lux)    | Red Crush         | Pure white + bold text, sun-survivable     |
| Outdoors during white harvest (1500+ lux)  | White Crush       | Same ergonomic backbone, story differentiator |
| Don't want to choose                       | Auto              | Follows OS; falls back Soft Cellar / Parchment |

## Light-sensitivity & ergonomic checks

### Blue-light load (melanopic concern for evening use)
All themes are deliberately low on blue chroma:
- Cellar Night, Soft Cellar: amber/cream palette, near-zero blue components.
- Parchment, Red Crush, White Crush: light backgrounds will emit more total
  blue light by sheer luminance, but warm/rose/green tints reduce peak
  short-wave content vs a pure white tech UI.

**Verdict**: safe for evening cellar work in Cellar Night / Soft Cellar.
Avoid Parchment / Red Crush after 9pm if photosensitive.

### Photophobia / migraine considerations
- No pure-saturated reds anywhere. The rose accent in Red Crush sits at
  c=0.24 h=5, perceived as warm pink (not Times Square red).
- No flashing motion in default UI. The cinematic CrushCascade animation
  is 4 seconds, fires once on theme change, and is fully suppressed if
  `prefers-reduced-motion: reduce` is set in the OS.
- Parchment is the warmest light option for photosensitive users — its
  hue (75) and chroma (0.014) avoid the cold-white glare that triggers
  migraines.

### Sun-readability (1500+ lux outdoor cellar conditions)
- **Pure-white themes (Red/White Crush)**: bg L=0.985, text L=0.06 →
  effective contrast holds up under sun-wash because both lightness AND
  hue are signalling. Heading weights bumped to 800/700 (the
  "redundancy beyond colour" Google guideline).
- **Parchment** is too warm/dim for direct sun — fine for shaded office,
  loses contrast under glare.
- **Dark themes (Cellar Night, Soft Cellar)** are unreadable under
  sun-wash by design — they're night themes. App should auto-prompt
  switching to a Crush variant if device ambient-light sensor reports
  >1500 lux. (Not implemented yet — backlog item.)

### Color-vision-deficiency safety
- **Deuteranopia / Protanopia** (~6% of male population):
  - Cellar Night, Soft Cellar, Parchment: amber + terracotta —
    accent identification still works because chroma + lightness
    contrast carries the signal.
  - Red Crush: rose (h=5) + amber (h=65) — modest hue separation for
    deutans (~60° spread). Adequate but not ideal. Mitigation: rose
    only used for "live/active" 5-10% accent, never as primary signal.
  - White Crush: apple-green (h=140) + amber (h=65) — wider hue spread
    (~75°), better deutan separation. Safer choice for color-blind
    operators working with both crush variants.
- **Tritanopia** (~0.01% — blue-yellow): amber on dark bg may look
  similar to other warm tones. Heading weights and border thickness
  compensate. No critical signal relies on hue alone.

### Touch-target ergonomics
Theme-independent. Current findings (carried over from Responsive Audit):
- Global theme-toggle widget bottom-right is ~36×36 px. **Should be 44×44**
  per Apple HIG and Google Material guidance. Backlog P2.
- All primary CTAs are 44px+ height. ✅
- Compare-themes link in the picker is full-width on mobile. ✅

### Font weight ergonomics
- Body text uses Lato 400 / 300 on dark themes. Slightly thin on
  Soft Cellar's lifted bg (0.24 L) — may want to push body to 400
  globally if user feedback says "feels light." Currently passing AAA so
  not urgent.
- Headings: Fraunces 700 / 800. Renders crisply at all sizes ≥18px.
- Sun-mode crush themes auto-bump h1→800, h2/h3/strong→700 for the
  "redundancy beyond colour" rule.

## Outstanding items (not blockers)

1. **Ambient-light auto-switch**: detect device `prefers-light-scheme` AND
   ambient lux > threshold → suggest Red/White Crush. Requires device
   sensor permissions — defer until customer count > 0 with feedback.
2. **Touch-target ≥44px on theme toggle**: 30-second CSS fix, P2 polish.
3. **Color-blind preview mode**: a temporary filter that re-renders the
   page through deutan/protan simulation, so the operator can verify
   their own custom branding (when Branding settings ship) is CVD-safe.
4. **APCA / Lc check** on dark themes — WCAG sometimes flags pure-white
   on dark as "too punchy" (halation). Mathematical follow-up only;
   doesn't block ship.
5. **`prefers-reduced-motion` already respected** in CrushCascade — no
   action.

## Focus indicators (WCAG 2.4.7 + 2.4.13 + 1.4.11) — Feb 2026

Global `:focus-visible` rule added to `index.css`:
- `outline: 2px solid var(--ow-amber)` with 2px offset
- Targets `:focus-visible` only — mouse clicks don't paint rings, only
  keyboard tab does (matches modern accessibility convention)
- Amber contrasts ≥4.6:1 on every theme bg → clears WCAG 1.4.11 (3:1
  non-text minimum) and WCAG 2.4.13 (3:1 focus indicator vs background)
- 2px width meets WCAG 2.4.13 (new in 2.2) minimum thickness
- Body/html/non-interactive containers explicitly opt out so a stray
  Tab into a layout div doesn't paint a misleading ring

Verified: Tab navigation on `/home` shows visible amber ring around nav
links and CTAs on all themes.

## Methodology
Computed via `/tmp/theme_audit.py` (Björn Ottosson OKLab → linear sRGB
transform → WCAG relative luminance Y). Same math the browser uses to
render — no eyeball estimates. Re-run after any theme edit:
```
python3 /tmp/theme_audit.py
```

— Ownology, Feb 2026
