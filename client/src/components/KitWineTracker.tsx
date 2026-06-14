/**
 * KitWineTracker
 * ──────────────
 * A client-side checklist of standard wine kit steps tied to days-since-inoculation.
 * Shown in The Press when a Kit Wine tank is active (variety === "Kit Wine").
 *
 * Steps are derived from standard wine kit instructions:
 *   Day 1:   Add bentonite, pitch yeast, fit airlock
 *   Day 5:   Check SG (should be below 1.020)
 *   Day 10:  Rack to secondary (carboy / demijohn)
 *   Day 28:  Add sorbate + K-meta (potassium metabisulfite)
 *   Day 30:  Add fining agent (kieselsol + chitosan or similar)
 *   Day 35:  Check clarity — wine should be clearing
 *   Day 42:  Final SG check (target: ≤ 0.998)
 *   Day 270+ Bottling window
 *
 * State is persisted to localStorage per tank name so it survives page refreshes.
 */

import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";

const SANS = "'Lato', sans-serif";
const MONO = "'Fira Code', monospace";

interface KitStep {
  id: string;
  day: number;
  label: string;
  description: string;
  icon: string;
  /** If true, this step is the last one — marks the wine as ready to bottle */
  isFinal?: boolean;
}

const KIT_STEPS: KitStep[] = [
  {
    id: "bentonite",
    day: 1,
    label: "Add bentonite & pitch yeast",
    description: "Dissolve bentonite in warm water, add to must. Rehydrate yeast per packet instructions and pitch. Fit airlock.",
    icon: "🧪",
  },
  {
    id: "sg-check-1",
    day: 5,
    label: "Check SG (target: below 1.020)",
    description: "Take a hydrometer reading. Active fermentation should have dropped SG below 1.020 by now. If not, check temperature and yeast health.",
    icon: "📏",
  },
  {
    id: "rack-secondary",
    day: 10,
    label: "Rack to secondary vessel",
    description: "Siphon wine off gross lees into a clean carboy or demijohn. Top up to minimise headspace. Refit airlock.",
    icon: "⇄",
  },
  {
    id: "sorbate-kmeta",
    day: 28,
    label: "Add sorbate + K-meta",
    description: "Add potassium sorbate (to prevent re-fermentation) and potassium metabisulfite (K-meta) per kit instructions. Stir gently.",
    icon: "⊕",
  },
  {
    id: "fining-agent",
    day: 30,
    label: "Add fining agent",
    description: "Add kieselsol (Part A) and stir. Wait 1 hour, then add chitosan (Part B) and stir again. Fit airlock and leave undisturbed.",
    icon: "🔬",
  },
  {
    id: "clarity-check",
    day: 35,
    label: "Check clarity",
    description: "Wine should be noticeably clearing. If still cloudy, wait another week. Do not rack until clear.",
    icon: "👁",
  },
  {
    id: "final-sg",
    day: 42,
    label: "Final SG check (target: ≤ 0.998)",
    description: "Confirm fermentation is complete. SG should be at or below 0.998. Taste for balance — adjust sweetness if desired using wine conditioner.",
    icon: "✅",
  },
  {
    id: "bottling",
    day: 270,
    label: "Bottling window",
    description: "Wine is ready to bottle. Sanitise bottles, siphon carefully to avoid splashing (oxidation), cork or cap immediately. Age for at least 3 months before opening.",
    icon: "🍾",
    isFinal: true,
  },
];

function storageKey(tankName: string) {
  return `ownology-kit-tracker-${tankName.replace(/\s+/g, "-").toLowerCase()}`;
}

interface Props {
  tankName: string;
  inoculationDate: number; // UTC ms
}

export default function KitWineTracker({ tankName, inoculationDate }: Props) {
  const [checked, setChecked] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem(storageKey(tankName));
      if (raw) return new Set<string>(JSON.parse(raw) as string[]);
    } catch {
      // ignore
    }
    return new Set<string>();
  });

  // Persist to localStorage whenever checked changes
  useEffect(() => {
    try {
      localStorage.setItem(storageKey(tankName), JSON.stringify(Array.from(checked)));
    } catch {
      // ignore
    }
  }, [checked, tankName]);

  const toggle = useCallback((id: string) => {
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const daysSince = Math.floor((Date.now() - inoculationDate) / 86_400_000);
  const completedCount = checked.size;
  const totalCount = KIT_STEPS.length;
  const progressPct = Math.round((completedCount / totalCount) * 100);

  return (
    <div
      style={{
        background: "var(--ow-bg-raised)",
        border: "1px solid oklch(0.72 0.12 75 / 20%)",
        borderRadius: "4px",
        padding: "1.25rem",
        marginBottom: "1rem",
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <p
            style={{
              fontFamily: MONO,
              fontSize: "0.65rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              color: "oklch(0.72 0.12 75)",
              marginBottom: "0.25rem",
            }}
          >
            🍷 Kit Wine Tracker
          </p>
          <p
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "1rem",
              color: "var(--ow-text-hi)",
            }}
          >
            {tankName}
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--ow-text-lo)", marginTop: "0.1rem" }}>
            Day {daysSince} since inoculation
          </p>
        </div>
        <div style={{ textAlign: "right" }}>
          <p style={{ fontFamily: MONO, fontSize: "0.75rem", color: "oklch(0.72 0.12 75)", fontWeight: 700 }}>
            {completedCount}/{totalCount}
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.65rem", color: "var(--ow-text-lo)" }}>steps done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "4px",
          background: "var(--ow-bg-inset)",
          borderRadius: "2px",
          marginBottom: "1.25rem",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progressPct}%`,
            background: "oklch(0.72 0.12 75)",
            borderRadius: "2px",
            transition: "width 0.3s ease",
          }}
        />
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-2">
        {KIT_STEPS.map((step) => {
          const isDue = daysSince >= step.day;
          const isChecked = checked.has(step.id);
          const isOverdue = isDue && !isChecked && step.day < daysSince - 3;

          return (
            <button
              key={step.id}
              type="button"
              onClick={() => toggle(step.id)}
              className="flex items-start gap-3 text-left rounded-sm px-3 py-2.5 transition-all w-full"
              style={{
                background: isChecked
                  ? "oklch(0.55 0.20 150 / 8%)"
                  : isOverdue
                  ? "oklch(0.72 0.12 75 / 6%)"
                  : "var(--ow-bg-inset)",
                border: `1px solid ${
                  isChecked
                    ? "oklch(0.55 0.20 150 / 30%)"
                    : isOverdue
                    ? "oklch(0.72 0.12 75 / 25%)"
                    : "var(--ow-border)"
                }`,
              }}
            >
              {/* Checkbox */}
              <div
                className="flex-shrink-0 mt-0.5"
                style={{
                  width: "18px",
                  height: "18px",
                  borderRadius: "3px",
                  border: `2px solid ${isChecked ? "oklch(0.55 0.20 150)" : "var(--ow-border-md)"}`,
                  background: isChecked ? "oklch(0.55 0.20 150)" : "transparent",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {isChecked && (
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span style={{ fontSize: "0.875rem" }}>{step.icon}</span>
                  <span
                    style={{
                      fontFamily: SANS,
                      fontWeight: 600,
                      fontSize: "0.8125rem",
                      color: isChecked ? "var(--ow-text-lo)" : "var(--ow-text-hi)",
                      textDecoration: isChecked ? "line-through" : "none",
                    }}
                  >
                    {step.label}
                  </span>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "0.65rem",
                      color: isOverdue && !isChecked ? "oklch(0.72 0.12 75)" : "var(--ow-text-lo)",
                      letterSpacing: "0.06em",
                    }}
                  >
                    Day {step.day}
                    {isOverdue && !isChecked && " · OVERDUE"}
                    {isDue && !isOverdue && !isChecked && " · DUE"}
                    {!isDue && ` · in ${step.day - daysSince}d`}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: SANS,
                    fontSize: "0.75rem",
                    color: "var(--ow-text-lo)",
                    lineHeight: 1.5,
                    marginTop: "0.2rem",
                    display: isChecked ? "none" : "block",
                  }}
                >
                  {step.description}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer hint */}
      <p
        style={{
          fontFamily: SANS,
          fontSize: "0.7rem",
          color: "var(--ow-text-lo)",
          marginTop: "1rem",
          lineHeight: 1.5,
        }}
      >
        Tap a step to mark it complete. Progress is saved locally on this device.{" "}
        <Link href="/free-run" style={{ color: "oklch(0.72 0.12 75)", textDecoration: "none" }}>
          Ask Ownology a question →
        </Link>
      </p>
    </div>
  );
}
