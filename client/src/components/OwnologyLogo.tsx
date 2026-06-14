/**
 * OwnologyLogo — Cellar Key Brand Mark
 * Design: Vintage skeleton key with neural network node pattern in the bow.
 * Key icon: always amber gold.
 * Wordmark: theme-aware via CSS variable --ow-logo-wordmark
 *   dark mode  → cream  (oklch(0.92 0.018 75))
 *   light mode → warm dark grey (oklch(0.28 0.012 60))
 * Scales cleanly at any size. Use `size` prop to control height in px.
 */

interface OwnologyLogoProps {
  /** Height of the logo in px. Width scales proportionally. Default: 32 */
  size?: number;
  /** Show wordmark beside the icon. Default: true */
  showWordmark?: boolean;
  /** Colour variant for the key icon. Default: "gold" */
  variant?: "gold" | "light" | "dark";
  /** Override wordmark colour. Defaults to CSS var --ow-logo-wordmark. */
  wordmarkColor?: string;
}

const AMBER  = "#D4A853";
const CREAM  = "#F0E6D3";
const DARK   = "#1C1917";

export default function OwnologyLogo({
  size = 32,
  showWordmark = true,
  variant = "gold",
  wordmarkColor,
}: OwnologyLogoProps) {
  const keyColor = variant === "dark" ? DARK : variant === "light" ? CREAM : AMBER;
  // Use explicit override, or fall back to the CSS variable set per-theme in index.css
  const wmColor  = wordmarkColor ?? "var(--ow-logo-wordmark)";

  // Key icon proportions: 20 wide × 44 tall viewBox
  const iconH = size;
  const iconW = size * (20 / 44);

  return (
    <div style={{ display: "flex", alignItems: "center", gap: size * 0.3 }}>
      {/* ── Key Icon ── */}
      <svg
        width={iconW}
        height={iconH}
        viewBox="0 0 20 44"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Ownology key mark"
      >
        {/* Bow — outer circle */}
        <circle cx="10" cy="9" r="8" stroke={keyColor} strokeWidth="1.6" fill="none" />

        {/* Neural network inside bow */}
        {/* Centre node */}
        <circle cx="10" cy="9" r="1.2" fill={keyColor} />
        {/* Outer nodes at 6 positions */}
        <circle cx="10"   cy="3.8" r="0.9" fill={keyColor} />   {/* top */}
        <circle cx="14.5" cy="6"   r="0.9" fill={keyColor} />   {/* top-right */}
        <circle cx="14.5" cy="12"  r="0.9" fill={keyColor} />   {/* bottom-right */}
        <circle cx="10"   cy="14.2" r="0.9" fill={keyColor} />  {/* bottom */}
        <circle cx="5.5"  cy="12"  r="0.9" fill={keyColor} />   {/* bottom-left */}
        <circle cx="5.5"  cy="6"   r="0.9" fill={keyColor} />   {/* top-left */}
        {/* Connection lines from centre to outer nodes */}
        <line x1="10" y1="9" x2="10"   y2="3.8"  stroke={keyColor} strokeWidth="0.7" />
        <line x1="10" y1="9" x2="14.5" y2="6"    stroke={keyColor} strokeWidth="0.7" />
        <line x1="10" y1="9" x2="14.5" y2="12"   stroke={keyColor} strokeWidth="0.7" />
        <line x1="10" y1="9" x2="10"   y2="14.2" stroke={keyColor} strokeWidth="0.7" />
        <line x1="10" y1="9" x2="5.5"  y2="12"   stroke={keyColor} strokeWidth="0.7" />
        <line x1="10" y1="9" x2="5.5"  y2="6"    stroke={keyColor} strokeWidth="0.7" />

        {/* Shaft */}
        <rect x="9.1" y="17" width="1.8" height="18" rx="0.4" fill={keyColor} />

        {/* Collar detail */}
        <rect x="8.2" y="17" width="3.6" height="1.2" rx="0.3" fill={keyColor} />
        <rect x="8.6" y="18.8" width="2.8" height="0.7" rx="0.2" fill={keyColor} />

        {/* Bit — key teeth */}
        <rect x="10.9" y="30" width="3.2" height="1.4" rx="0.3" fill={keyColor} />
        <rect x="10.9" y="33" width="2.2" height="1.4" rx="0.3" fill={keyColor} />

        {/* Tip */}
        <rect x="9.1" y="35" width="1.8" height="1.2" rx="0.4" fill={keyColor} />
        <path d="M9.5 36.2 L10 38 L10.5 36.2Z" fill={keyColor} />
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <svg
          height={iconH}
          viewBox="0 0 110 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Ownology"
          style={{ overflow: "visible" }}
        >
          <text
            x="0"
            y="32"
            fontFamily="'Fraunces', 'Georgia', serif"
            fontStyle="italic"
            fontWeight="400"
            fontSize="28"
            fill={wmColor}
            letterSpacing="-0.5"
          >
            Ownology
          </text>
        </svg>
      )}
    </div>
  );
}
