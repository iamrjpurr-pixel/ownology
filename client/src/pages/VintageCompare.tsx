/**
 * /the-press/compare — Vintage Comparison Debrief
 *
 * Pick 2-6 tanks, see them side-by-side. Pure data composition over existing
 * vintage_log_entries (no LLM, no new schema). Value-engineering score 5/5.
 *
 * Use case: post-vintage debrief. "Tank 7 Shiraz fermented in 6 days at EC1118.
 * Tank 9 Shiraz, same yeast, took 9 days. Why?" — the operator's own data,
 * surfaced side-by-side.
 */
import { useEffect, useMemo, useState } from "react";
import { trpc } from "../lib/trpc";
import { Link } from "wouter";

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function fmtNum(n: number | null | undefined, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}

export default function VintageCompare() {
  const { data: usedTanks } = trpc.vintageLog.getUsedTanks.useQuery();
  const [selected, setSelected] = useState<string[]>([]);

  // Pre-fill with the first two tanks once loaded
  useEffect(() => {
    if (usedTanks && usedTanks.length >= 2 && selected.length === 0) {
      setSelected(usedTanks.slice(0, 2));
    }
  }, [usedTanks, selected.length]);

  const enabled = selected.length >= 2;
  const { data: compareData, isFetching } = trpc.vintageLog.compareTanks.useQuery(
    { tankNames: selected },
    { enabled, retry: false }
  );

  const tanks = useMemo(() => compareData?.tanks ?? [], [compareData]);

  function toggleTank(tank: string) {
    setSelected((prev) =>
      prev.includes(tank)
        ? prev.filter((t) => t !== tank)
        : prev.length < 6
          ? [...prev, tank]
          : prev
    );
  }

  return (
    <div data-testid="vintage-compare-page" className="container py-8" style={{ maxWidth: 1280 }}>
      <div className="mb-6">
        <Link href="/the-press" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
          ← Back to The Press
        </Link>
        <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>Vintage debrief</p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
          Compare tanks side-by-side
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
          Pick 2–6 tanks from your cellar history. Each card distils the full life-cycle —
          yeast, ferment duration, temp peaks, YAN, additions, decisions captured. Your data,
          your debrief.
        </p>
      </div>

      {/* Tank chip picker */}
      <div className="mb-6">
        <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-text-lo)" }}>
          Select tanks ({selected.length}/6)
        </p>
        <div className="flex flex-wrap gap-2">
          {(usedTanks ?? []).map((t) => {
            const on = selected.includes(t);
            return (
              <button
                key={t}
                onClick={() => toggleTank(t)}
                data-testid={`compare-tank-chip-${t.replace(/\s+/g, "-").toLowerCase()}`}
                className="px-3 py-1.5 rounded text-sm"
                style={{
                  background: on ? "var(--ow-amber)" : "var(--ow-bg-card)",
                  color: on ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
                  border: `1px solid ${on ? "var(--ow-amber)" : "var(--ow-border)"}`,
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: on ? 700 : 400,
                  cursor: "pointer",
                }}
              >
                {t}
              </button>
            );
          })}
          {usedTanks && usedTanks.length === 0 && (
            <p data-testid="compare-no-tanks" style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem" }}>
              No tanks logged yet. <Link href="/quick-entry" style={{ color: "var(--ow-amber)" }}>Add your first entry →</Link>
            </p>
          )}
        </div>
      </div>

      {!enabled && selected.length === 1 && (
        <p data-testid="compare-need-more" className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
          Select one more tank to compare.
        </p>
      )}

      {isFetching && (
        <p data-testid="compare-loading" style={{ color: "var(--ow-text-mid)" }}>Distilling…</p>
      )}

      {/* Comparison grid */}
      {tanks.length >= 2 && (
        <div
          data-testid="compare-grid"
          className="grid gap-4"
          style={{
            gridTemplateColumns: `repeat(${Math.min(tanks.length, 3)}, minmax(0, 1fr))`,
          }}
        >
          {tanks.map((t) => (
            <div
              key={t.tankName}
              data-testid={`compare-card-${t.tankName.replace(/\s+/g, "-").toLowerCase()}`}
              className="rounded p-5"
              style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
            >
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)" }}>
                {t.variety}
              </p>
              <h2 className="text-xl font-bold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
                {t.tankName}
              </h2>

              {!t.found ? (
                <p className="mt-4 text-sm" style={{ color: "var(--ow-text-lo)" }}>
                  No log entries for this tank.
                </p>
              ) : (
                <>
                  <Stat label="First entry → Last entry" value={`${fmtDate(t.firstAt)} → ${fmtDate(t.lastAt)}`} />
                  <Stat label="Total events" value={String(t.totalEvents)} />
                  <Stat label="Yeast strain" value={t.yeastStrain} />
                  <Stat label="Ferment duration (inoc → dry)" value={t.fermentDays !== null ? `${fmtNum(t.fermentDays, 1)} days` : "—"} />

                  <Divider />
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Chemistry</p>
                  <Stat label="Start Brix" value={`${fmtNum(t.startBrix, 1)}°Bx`} />
                  <Stat label="Final Brix" value={`${fmtNum(t.finalBrix, 1)}°Bx`} />
                  <Stat label="YAN range" value={t.minYan !== null ? `${fmtNum(t.minYan, 0)}–${fmtNum(t.maxYan, 0)} ppm` : "—"} />
                  <Stat label="Peak temp" value={t.peakTemp !== null ? `${fmtNum(t.peakTemp, 1)}°C` : "—"} />
                  <Stat label="Avg pH" value={fmtNum(t.avgPh, 2)} />

                  <Divider />
                  <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Interventions</p>
                  <Stat label="DAP additions" value={String(t.dapAdditions)} />
                  <Stat label="SO₂ additions" value={String(t.so2Additions)} />

                  {t.reasonings.length > 0 && (
                    <>
                      <Divider />
                      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Recent decisions</p>
                      <ul className="mt-2 space-y-2">
                        {t.reasonings.map((r, i) => (
                          <li key={i} style={{ fontSize: "0.8rem", color: "var(--ow-text-mid)", lineHeight: 1.45 }}>
                            <span style={{ color: "var(--ow-amber)", fontFamily: "'Fira Code',monospace", fontSize: "0.72rem" }}>{r.date} · {r.eventType}</span>
                            <br />
                            <span style={{ fontStyle: "italic" }}>“{r.reasoning}”</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between items-baseline mt-2" style={{ borderBottom: "1px dashed var(--ow-border)", paddingBottom: "0.4rem" }}>
      <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>{label}</span>
      <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.85rem", color: "var(--ow-text-hi)" }}>{value}</span>
    </div>
  );
}

function Divider() {
  return <div style={{ height: 14 }} />;
}
