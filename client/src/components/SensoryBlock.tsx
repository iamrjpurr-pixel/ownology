/**
 * SensoryBlock — 5-icon flavor profile + 5-dimension structure bar.
 *
 * Inspiration: the Sometimes-Always sensory rubric (fruit / earth / oak
 * / spice / floral flavor pillars, plus structure axes body / acid /
 * tannin / sweetness / finish). Winemakers scan this in under 2 seconds
 * and get an accurate mental picture of where the wine is right now.
 *
 * Ships as a pure-visualisation component:
 *   - Every dimension = 0..5 integer (5 = maximum expression)
 *   - Icons render at low opacity when the value is 0, full amber at 5
 *   - Structure bars use OKLCH gradients so they inherit theme correctly
 *
 * Feed it real sensory-evaluation SOP data once wired up (see
 * scripts/seed-sensory-evaluation-sop.mjs). Until then, callers pass
 * `null` and the block auto-hides — no misleading fake numbers.
 */
import {
  Grape,      // fruit — the driver of most tastings
  Mountain,   // earth / minerality
  Trees,      // oak
  Flame,      // spice / heat
  Flower2,    // floral / aromatics
} from "lucide-react";

const FLAVOR_ICONS = [
  { key: "fruit", label: "Fruit", Icon: Grape },
  { key: "earth", label: "Earth", Icon: Mountain },
  { key: "oak", label: "Oak", Icon: Trees },
  { key: "spice", label: "Spice", Icon: Flame },
  { key: "floral", label: "Floral", Icon: Flower2 },
] as const;

const STRUCTURE_AXES = [
  { key: "body", label: "Body" },
  { key: "acid", label: "Acidity" },
  { key: "tannin", label: "Tannin" },
  { key: "sweetness", label: "Sweetness" },
  { key: "finish", label: "Finish" },
] as const;

export type FlavorProfile = {
  fruit: number;    // 0..5
  earth: number;
  oak: number;
  spice: number;
  floral: number;
};

export type StructureProfile = {
  body: number;     // 0..5
  acid: number;
  tannin: number;
  sweetness: number;
  finish: number;
};

export function SensoryBlock({
  flavor,
  structure,
  assessedAt,
  compact = false,
  testid = "sensory-block",
}: {
  flavor: FlavorProfile | null;
  structure: StructureProfile | null;
  /** ISO string or ms — shown as "assessed 3d ago". Optional. */
  assessedAt?: number | null;
  /** Compact = smaller icons + shorter bars for card interiors. */
  compact?: boolean;
  testid?: string;
}) {
  // Auto-hide with no data — DESIGN_RULES.md: no claim without evidence.
  if (!flavor && !structure) return null;

  const iconSize = compact ? 14 : 18;
  const barH = compact ? 4 : 6;

  return (
    <div
      data-testid={testid}
      style={{
        marginTop: compact ? "0.75rem" : "1rem",
        padding: compact ? "0.75rem 0.9rem" : "1rem 1.15rem",
        background: "var(--ow-bg-inset, rgba(0,0,0,0.03))",
        border: "1px solid var(--ow-border)",
        borderRadius: 8,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          marginBottom: "0.6rem",
        }}
      >
        <div
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: compact ? "0.65rem" : "0.7rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: "var(--ow-text-lo)",
          }}
        >
          Sensory snapshot
        </div>
        {assessedAt && (
          <div
            style={{
              fontSize: compact ? "0.62rem" : "0.7rem",
              color: "var(--ow-text-lo)",
              fontStyle: "italic",
            }}
          >
            {formatAgo(assessedAt)}
          </div>
        )}
      </div>

      {/* Flavor icons row */}
      {flavor && (
        <div
          data-testid={`${testid}-flavor`}
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(5, 1fr)",
            gap: "0.35rem",
            marginBottom: structure ? "0.85rem" : 0,
          }}
        >
          {FLAVOR_ICONS.map(({ key, label, Icon }) => {
            const v = clamp05((flavor as unknown as Record<string, number>)[key] ?? 0);
            const opacity = 0.25 + (v / 5) * 0.75; // 0.25 min, 1.0 max
            return (
              <div
                key={key}
                data-testid={`${testid}-flavor-${key}`}
                title={`${label}: ${v}/5`}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 2,
                }}
              >
                <Icon
                  size={iconSize}
                  style={{
                    color: "var(--ow-amber)",
                    opacity,
                  }}
                  strokeWidth={1.6}
                />
                <div
                  style={{
                    fontSize: compact ? "0.6rem" : "0.65rem",
                    color: "var(--ow-text-lo)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    fontSize: compact ? "0.55rem" : "0.6rem",
                    color: "var(--ow-text-mid)",
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 600,
                  }}
                >
                  {v}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Structure bars */}
      {structure && (
        <div
          data-testid={`${testid}-structure`}
          style={{ display: "flex", flexDirection: "column", gap: 5 }}
        >
          {STRUCTURE_AXES.map(({ key, label }) => {
            const v = clamp05((structure as unknown as Record<string, number>)[key] ?? 0);
            const pct = (v / 5) * 100;
            return (
              <div
                key={key}
                data-testid={`${testid}-structure-${key}`}
                title={`${label}: ${v}/5`}
                style={{
                  display: "grid",
                  gridTemplateColumns: "68px 1fr 18px",
                  alignItems: "center",
                  gap: "0.55rem",
                }}
              >
                <div
                  style={{
                    fontSize: compact ? "0.62rem" : "0.68rem",
                    color: "var(--ow-text-mid)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  {label}
                </div>
                <div
                  style={{
                    height: barH,
                    background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                    borderRadius: 999,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background:
                        "linear-gradient(90deg, color-mix(in oklch, var(--ow-amber) 60%, transparent), var(--ow-amber))",
                      transition: "width 320ms ease",
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: compact ? "0.6rem" : "0.65rem",
                    color: "var(--ow-text-lo)",
                    fontFamily: "'Lato', sans-serif",
                    textAlign: "right",
                  }}
                >
                  {v}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function clamp05(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(5, Math.round(n)));
}

function formatAgo(ts: number): string {
  const diff = Date.now() - ts;
  const d = Math.floor(diff / (24 * 3600 * 1000));
  if (d <= 0) return "assessed today";
  if (d === 1) return "assessed 1d ago";
  if (d < 30) return `assessed ${d}d ago`;
  const m = Math.floor(d / 30);
  return m === 1 ? "assessed 1mo ago" : `assessed ${m}mo ago`;
}
