# Responsive Audit — Feb 2026

## How to re-run
Visit `/admin/responsive` → use the 10 preset buttons to spot-check any
page at iPhone (390×844), iPad (768×1024) and Desktop (1440×900) widths
simultaneously. Click "↻ Refresh all" after pushing a fix.

## First-pass audit (Feb 2026)

Surfaces checked: `/home`, `/why-ownology`, `/knowledge`, `/knowledge/sop/18`,
`/free-run`, `/hi/nathan-brokenwood-wines`, `/sample-vintage-log`,
`/cascade-demo`, `/pricing`, `/compliance` — at mobile, tablet, desktop.

### Bugs fixed
- 🔴 **UserMenu colliding with marketing-page nav** (`/pricing`, etc.)
  Root cause: UserMenu rendered globally on every route when authenticated,
  but marketing pages already have a top-right slot ("← Back to Home" /
  "Work Mode" button). Fix: gated by `isAuthSurface(path)` whitelist —
  only shows on `/admin/*`, `/cellar/*`, `/work-mode`, `/free-run/dashboard`.

### Deferred (P2 polish — not blockers)
- `/home` mobile: theme-toggle widget bottom-right ~36×36 (should be 44×44
  per Apple/Google guidance). Cosmetic — easily reachable.
- `/home` mobile: "Preview harvest mode →" link is text-xs; bump to text-sm.

### Verified clean
- `/pricing` mobile — cards stack correctly, sticky CTA bar spacing fine,
  no horizontal scroll.
- `/hi/:slug` mobile — greeting renders, CTAs full-width, no overflow.
- `/admin` mobile — UserMenu top-right, all owner panels stack cleanly.
