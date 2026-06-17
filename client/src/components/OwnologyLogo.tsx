/**
 * OwnologyLogo — The Living Trinity
 *
 * Three interlocking arcs (Vine · Cellar · Knowledge) with a vine tendril
 * growing from the convergence and a hidden owl eye at the centre.
 *
 * Scale-aware vine:
 *   < 28px  — mark only, no vine (too fine to read)
 *   28–44px — vine visible, single leaf, bold stroke
 *   45–80px — expressive vine, double curl, two leaves
 *   > 80px  — full vine, triple curl, three leaves
 *
 * Hover theory card reveals the design intent (opt-in via showTheoryCard prop).
 *
 * Props:
 *   size            Height in px. Default: 32
 *   showWordmark    Show "Ownology" wordmark. Default: true
 *   showIABadge     Show the I.A. cycling badge. Default: false
 *   showTheoryCard  Enable hover theory disclosure. Default: true
 *   variant         "gold" | "light" | "dark". Default: "gold"
 *   wordmarkColor   Override wordmark colour.
 */

import { useEffect, useRef, useState } from "react";

interface OwnologyLogoProps {
  size?: number;
  showWordmark?: boolean;
  showIABadge?: boolean;
  showTheoryCard?: boolean;
  variant?: "gold" | "light" | "dark";
  wordmarkColor?: string;
}

const AMBER = "#D4A853";
const CREAM = "#F0E6D3";
const DARK  = "#1C1917";

const IA_EXPANSIONS = [
  "Artisan Intelligence",
  "Always Informed",
  "Awake at 1am",
  "Actual Inspiration",
  "Accumulated Intelligence",
  "Answers Instantly",
];

/** Async typewriter: AI → backspace → I.A. → initials → loop */
async function runIABadge(
  el: HTMLSpanElement,
  signal: AbortSignal,
  delay = 0
) {
  const sleep = (ms: number) =>
    new Promise<void>((res, rej) => {
      const t = setTimeout(res, ms);
      signal.addEventListener("abort", () => { clearTimeout(t); rej(); }, { once: true });
    });

  try {
    await sleep(delay);
    let i = 0;
    while (!signal.aborted) {
      // Show "AI"
      el.textContent = "AI";
      await sleep(1400);
      // Backspace to "A"
      el.textContent = "A";
      await sleep(110);
      // Backspace to ""
      el.textContent = "";
      await sleep(150);
      // Type "I.A."
      for (const ch of ["I", "I.", "I.A", "I.A."]) {
        el.textContent = ch;
        await sleep(110);
      }
      await sleep(2200);
      // Show initials of current expansion
      const exp = IA_EXPANSIONS[i % IA_EXPANSIONS.length];
      const initials = exp.split(" ").map((w) => w[0]).join(".") + ".";
      el.textContent = initials;
      await sleep(1800);
      i++;
    }
  } catch {
    // aborted — clean exit
  }
}

export default function OwnologyLogo({
  size = 32,
  showWordmark = true,
  showIABadge = false,
  showTheoryCard = true,
  variant = "gold",
  wordmarkColor,
}: OwnologyLogoProps) {
  const markColor = variant === "dark" ? DARK : variant === "light" ? CREAM : AMBER;
  const wmColor   = wordmarkColor ?? "var(--ow-logo-wordmark)";

  const [hovered, setHovered] = useState(false);
  const badgeRef  = useRef<HTMLSpanElement>(null);
  const abortRef  = useRef<AbortController | null>(null);

  // I.A. badge animation
  useEffect(() => {
    if (!showIABadge || !badgeRef.current) return;
    const ac = new AbortController();
    abortRef.current = ac;
    runIABadge(badgeRef.current, ac.signal, 600);
    return () => ac.abort();
  }, [showIABadge]);

  // Scale tiers
  const showVine    = size >= 28;
  const vineLevel   = size >= 80 ? 3 : size >= 45 ? 2 : 1;
  const vineStroke  = size >= 45 ? 1.7 : 2.2;
  const arcStroke   = size >= 60 ? 4.2 : size >= 36 ? 4.8 : 5.2;

  // Card position: above the mark
  const cardStyle: React.CSSProperties = {
    position: "absolute",
    bottom: "calc(100% + 12px)",
    left: "50%",
    transform: hovered ? "translateX(-50%) translateY(0)" : "translateX(-50%) translateY(6px)",
    width: 260,
    background: "oklch(0.16 0.010 60)",
    border: "1px solid oklch(0.72 0.12 75 / 28%)",
    padding: "0.9rem 1rem 0.8rem",
    pointerEvents: "none",
    opacity: hovered ? 1 : 0,
    transition: "opacity 0.2s ease, transform 0.2s ease",
    zIndex: 9999,
    boxShadow: "0 16px 40px oklch(0 0 0 / 60%)",
    fontFamily: "'Lato', sans-serif",
    color: "oklch(0.70 0.015 75)",
  };

  return (
    <div
      style={{ display: "flex", alignItems: "center", gap: size * 0.28, position: "relative" }}
      onMouseEnter={() => showTheoryCard && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* ── Trinity Mark ── */}
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-label="Ownology — The Living Trinity"
        style={{ transition: "filter 0.3s ease", filter: hovered ? `drop-shadow(0 0 8px ${markColor}80)` : "none", flexShrink: 0 }}
      >
        {/* ── Three arcs ── */}
        {/* Arc 1 — Vine (top-right) */}
        <path
          d="M32 7 C46 7, 57 18, 57 32 C57 40, 54 47, 47 52"
          stroke={markColor} strokeWidth={arcStroke} fill="none" strokeLinecap="round"
        />
        {/* Arc 2 — Cellar (bottom) */}
        <path
          d="M47 52 C40 61, 24 61, 17 52 C13 45, 13 38, 17 30"
          stroke={markColor} strokeWidth={arcStroke} fill="none" strokeLinecap="round"
        />
        {/* Arc 3 — Knowledge (top-left) */}
        <path
          d="M17 30 C10 19, 18 7, 32 7"
          stroke={markColor} strokeWidth={arcStroke} fill="none" strokeLinecap="round"
        />

        {/* ── Owl Eye (convergence) ── */}
        <path
          d="M32 26 C35.5 30, 35.5 36, 32 40 C28.5 36, 28.5 30, 32 26Z"
          fill={markColor}
        />
        {size >= 36 && (
          <circle cx="32" cy="33" r={size >= 60 ? 1.8 : 1.4} fill="oklch(0.11 0.008 60)" opacity="0.55" />
        )}

        {/* ── Vine tendril (scale-aware) ── */}
        {showVine && vineLevel === 1 && (
          <>
            <path
              d="M32 40 C29 44, 25 46, 23 43 C21 40, 24 37, 28 40"
              stroke={markColor} strokeWidth={vineStroke} fill="none" strokeLinecap="round" opacity="0.85"
            />
            <path
              d="M23 43 C20 41, 19 45, 22 46 C25 47, 26 44, 23 43Z"
              fill={markColor} opacity="0.75"
            />
          </>
        )}
        {showVine && vineLevel === 2 && (
          <>
            <path
              d="M32 40 C29 45, 24 49, 20 46 C17 43, 20 38, 26 42 C28 43, 29 46, 26 48"
              stroke={markColor} strokeWidth={vineStroke} fill="none" strokeLinecap="round" opacity="0.85"
            />
            <path d="M20 46 C17 44, 16 48, 19 49 C22 50, 23 47, 20 46Z" fill={markColor} opacity="0.70" />
            <path d="M26 48 C24 47, 23 50, 25 51 C27 52, 28 49, 26 48Z" fill={markColor} opacity="0.60" />
          </>
        )}
        {showVine && vineLevel === 3 && (
          <>
            <path
              d="M32 40 C29 45, 23 50, 19 47 C15 44, 18 38, 25 42 C27 43.5, 28 47, 25 49 C23 51, 20 50, 19 48"
              stroke={markColor} strokeWidth={vineStroke} fill="none" strokeLinecap="round" opacity="0.85"
            />
            <path d="M19 47 C16 45, 15 49, 18 50 C21 51, 22 48, 19 47Z" fill={markColor} opacity="0.70" />
            <path d="M25 49 C23 48, 22 51, 24 52 C26 53, 27 50, 25 49Z" fill={markColor} opacity="0.60" />
            <path d="M19 48 C17 47, 16 50, 18 51 C20 52, 21 49, 19 48Z" fill={markColor} opacity="0.45" />
          </>
        )}
      </svg>

      {/* ── Wordmark ── */}
      {showWordmark && (
        <svg
          height={size}
          viewBox="0 0 110 44"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-label="Ownology"
          style={{ overflow: "visible", flexShrink: 0 }}
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

      {/* ── I.A. cycling badge ── */}
      {showIABadge && (
        <span
          ref={badgeRef}
          style={{
            fontFamily: "'Fira Code', 'Courier New', monospace",
            fontSize: Math.max(size * 0.38, 10),
            color: AMBER,
            minWidth: "1.8em",
            display: "inline-block",
            letterSpacing: "0.02em",
            lineHeight: 1,
          }}
          aria-label="I.A. — Artisan Intelligence"
        >
          AI
        </span>
      )}

      {/* ── Theory card ── */}
      {showTheoryCard && (
        <div style={cardStyle} role="tooltip" aria-hidden={!hovered}>
          <p style={{ fontSize: "0.52rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: "0.4rem", opacity: 0.85 }}>
            Design Theory
          </p>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: "0.88rem", fontWeight: 600, color: "oklch(0.95 0.018 75)", marginBottom: "0.4rem", lineHeight: 1.3 }}>
            The Living Trinity
          </p>
          <p style={{ fontSize: "0.7rem", lineHeight: 1.65, marginBottom: "0.55rem" }}>
            Three arcs. One vine. A hidden eye.
          </p>
          <div style={{ borderTop: "1px solid oklch(1 0 0 / 7%)", margin: "0.5rem 0" }} />
          {[
            ["Three arcs", "Vine · Cellar · Knowledge. The three acts of every vintage."],
            ["The vine tendril", "Craft is organic, not mechanical. It grows with every vintage."],
            ["The eye", "The owl lives here, in the convergence. You found it."],
            ["I.A.", "Not AI. The intelligence is the winemaker's. Ownology holds it."],
          ].map(([label, desc]) => (
            <div key={label} style={{ display: "flex", gap: "0.4rem", alignItems: "flex-start", marginBottom: "0.35rem" }}>
              <div style={{ width: 4, height: 4, borderRadius: "50%", background: AMBER, flexShrink: 0, marginTop: "0.38rem", opacity: 0.7 }} />
              <p style={{ fontSize: "0.68rem", lineHeight: 1.55 }}>
                <span style={{ color: AMBER }}>{label}</span> — {desc}
              </p>
            </div>
          ))}
          <div style={{ borderTop: "1px solid oklch(1 0 0 / 7%)", margin: "0.55rem 0 0.4rem" }} />
          <p style={{ fontSize: "0.62rem", opacity: 0.5, fontStyle: "italic", lineHeight: 1.55 }}>
            The best brand marks reward the curious. We never announce the owl. We let the right people find it.
          </p>
          {/* Caret */}
          <div style={{ position: "absolute", top: "100%", left: "50%", transform: "translateX(-50%)", width: 0, height: 0, borderLeft: "6px solid transparent", borderRight: "6px solid transparent", borderTop: "6px solid oklch(0.72 0.12 75 / 28%)" }} />
        </div>
      )}
    </div>
  );
}
