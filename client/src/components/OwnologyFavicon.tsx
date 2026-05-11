/**
 * OwnologyFavicon — Simplified Cellar Key icon for favicon, app icon, and small-scale use.
 * Design: Key bow (circle) with neural network node at centre, in amber gold on warm black.
 * Use at: 16px, 32px, 64px, 180px (Apple touch icon).
 */

interface OwnologyFaviconProps {
  size?: number;
  className?: string;
}

export default function OwnologyFavicon({ size = 32, className = "" }: OwnologyFaviconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Ownology"
    >
      {/* Background circle — warm black */}
      <circle cx="32" cy="32" r="32" fill="#1a1208" />

      {/* Outer key bow ring — amber gold */}
      <circle cx="32" cy="28" r="16" stroke="#c9853a" strokeWidth="3.5" fill="none" />

      {/* Inner ring — subtle */}
      <circle cx="32" cy="28" r="10" stroke="#c9853a" strokeWidth="1.5" fill="none" opacity="0.5" />

      {/* Neural network nodes — 4 cardinal points on inner ring */}
      <circle cx="32" cy="18" r="2.5" fill="#c9853a" />
      <circle cx="42" cy="28" r="2.5" fill="#c9853a" />
      <circle cx="32" cy="38" r="2.5" fill="#c9853a" />
      <circle cx="22" cy="28" r="2.5" fill="#c9853a" />

      {/* Neural network connections */}
      <line x1="32" y1="18" x2="42" y2="28" stroke="#c9853a" strokeWidth="1" opacity="0.6" />
      <line x1="42" y1="28" x2="32" y2="38" stroke="#c9853a" strokeWidth="1" opacity="0.6" />
      <line x1="32" y1="38" x2="22" y2="28" stroke="#c9853a" strokeWidth="1" opacity="0.6" />
      <line x1="22" y1="28" x2="32" y2="18" stroke="#c9853a" strokeWidth="1" opacity="0.6" />
      {/* Diagonal connections */}
      <line x1="32" y1="18" x2="32" y2="38" stroke="#c9853a" strokeWidth="0.8" opacity="0.3" />
      <line x1="22" y1="28" x2="42" y2="28" stroke="#c9853a" strokeWidth="0.8" opacity="0.3" />

      {/* Centre node — brightest point */}
      <circle cx="32" cy="28" r="3.5" fill="#c9853a" />
      <circle cx="32" cy="28" r="1.5" fill="#f5ede0" />

      {/* Key shaft — drops down from bow */}
      <rect x="30" y="43" width="4" height="12" rx="2" fill="#c9853a" />

      {/* Key teeth — two notches on shaft */}
      <rect x="34" y="47" width="4" height="2.5" rx="1" fill="#c9853a" />
      <rect x="34" y="51" width="3" height="2" rx="1" fill="#c9853a" />
    </svg>
  );
}
