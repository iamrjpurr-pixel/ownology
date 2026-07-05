/**
 * /admin/quiz-picks — telemetry dashboard for the wine recommender quiz.
 *
 * Answers the "can I see what the quiz is picking behind the scenes?"
 * question. Powered by trpc.quiz.stats + trpc.quiz.list.
 *
 * Shows for the rolling N-day window:
 *   - Total completions, swap rate (winner ≠ trueMatch),
 *     Founding-Member CTA click rate
 *   - Region distribution (AU / NZ / US / UK / OTHER)
 *   - Winner distribution — which wines are actually being recommended
 *   - Recent picks table with the full answer context so you can
 *     eyeball whether a specific combo is producing a bad result and
 *     tune quizData.ts accordingly.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";

const REGION_LABEL: Record<string, string> = {
  AU: "Australia 🇦🇺",
  NZ: "New Zealand 🇳🇿",
  US: "United States 🇺🇸",
  UK: "United Kingdom 🇬🇧",
  OTHER: "Other",
};

function fmtPct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function fmtDate(ms: number): string {
  try {
    const d = new Date(ms);
    return d.toLocaleString("en-AU", { dateStyle: "short", timeStyle: "short" });
  } catch {
    return String(ms);
  }
}

export default function AdminQuizPicks() {
  const [days, setDays] = useState<number>(30);
  const { data: stats, isLoading: statsLoading } = trpc.quiz.stats.useQuery({ days });
  const { data: listData, isLoading: listLoading } = trpc.quiz.list.useQuery({ limit: 100 });
  const { data: leadsData } = trpc.quiz.leads.useQuery({ limit: 50 });
  const { data: gateData } = trpc.quiz.gateLog.useQuery({ limit: 50 });

  const totalRegion = (stats?.regions ?? []).reduce((sum, r) => sum + r.count, 0);
  const totalWinners = (stats?.winners ?? []).reduce((sum, w) => sum + w.count, 0);

  return (
    <div data-testid="admin-quiz-picks-page" className="container py-8" style={{ maxWidth: 1200 }}>
      <Link href="/admin" style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
        Telemetry · quiz
      </p>
      <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: SERIF }}>
        Quiz picks
      </h1>
      <p className="mt-2 mb-6" style={{ fontFamily: SANS, fontSize: "0.9rem", color: "var(--ow-text-mid)", maxWidth: 760, lineHeight: 1.55 }}>
        What the /quiz recommender is actually picking in the wild. Swap rate = how often the algorithm overrode the pure-palate best (usually because of budget or the AU/NZ home-market bias). CTA rate = how often the picked wine led to a Founding-Member click. Use this to fine-tune quizData.ts.
      </p>

      {/* Window selector */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 24 }}>
        <span style={{ fontFamily: SANS, fontSize: "0.72rem", color: "var(--ow-text-lo)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Window
        </span>
        {[7, 30, 90, 365].map((d) => (
          <button
            key={d}
            type="button"
            data-testid={`admin-quiz-window-${d}`}
            onClick={() => setDays(d)}
            style={{
              padding: "4px 12px",
              borderRadius: 999,
              border: `1px solid ${days === d ? "var(--ow-amber)" : "var(--ow-border)"}`,
              background: days === d ? "color-mix(in oklch, var(--ow-amber) 22%, transparent)" : "transparent",
              color: days === d ? "var(--ow-text-hi)" : "var(--ow-text-mid)",
              fontFamily: SANS,
              fontSize: "0.78rem",
              fontWeight: days === d ? 700 : 500,
              cursor: "pointer",
            }}
          >
            {d === 365 ? "1y" : `${d}d`}
          </button>
        ))}
      </div>

      {statsLoading && (
        <p data-testid="admin-quiz-loading" style={{ fontFamily: SANS, color: "var(--ow-text-lo)" }}>
          Loading…
        </p>
      )}

      {stats && (
        <>
          {/* KPIs */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 28 }}>
            <Kpi label="Completions" value={String(stats.total)} testid="admin-quiz-kpi-total" />
            <Kpi
              label="Swap rate"
              value={fmtPct(stats.swapRate)}
              hint="winner ≠ trueMatch"
              testid="admin-quiz-kpi-swap"
            />
            <Kpi
              label="CTA click rate"
              value={fmtPct(stats.ctaRate)}
              hint="→ Founding-Member"
              testid="admin-quiz-kpi-cta"
            />
          </div>

          {/* Region distribution */}
          <Section title="Buying-market context">
            {stats.regions.length === 0 ? (
              <Empty>No picks yet in this window.</Empty>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {stats.regions.map((r) => (
                  <div
                    key={r.region}
                    data-testid={`admin-quiz-region-${r.region.toLowerCase()}`}
                    style={{
                      padding: "0.5rem 0.9rem",
                      background: "var(--ow-bg-card)",
                      border: "1px solid var(--ow-border)",
                      borderRadius: 6,
                      fontFamily: SANS,
                      fontSize: "0.82rem",
                      color: "var(--ow-text-mid)",
                    }}
                  >
                    {REGION_LABEL[r.region] ?? r.region} · <strong style={{ color: "var(--ow-text-hi)" }}>{r.count}</strong>
                    {totalRegion > 0 && (
                      <span style={{ color: "var(--ow-text-lo)", marginLeft: 6 }}>
                        ({fmtPct(r.count / totalRegion)})
                      </span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Winner distribution */}
          <Section title="What's actually being recommended">
            {stats.winners.length === 0 ? (
              <Empty>Nothing yet — no completions in this window.</Empty>
            ) : (
              <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ow-border)" }}>
                    <Th>Wine</Th>
                    <Th right>Picks</Th>
                    <Th right>Share</Th>
                    <Th right>CTA clicks</Th>
                  </tr>
                </thead>
                <tbody>
                  {stats.winners.map((w) => (
                    <tr key={w.slug} data-testid={`admin-quiz-winner-${w.slug}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                      <Td>{w.slug}</Td>
                      <Td right>{w.count}</Td>
                      <Td right>{totalWinners > 0 ? fmtPct(w.count / totalWinners) : "—"}</Td>
                      <Td right>{w.ctas}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Section>
        </>
      )}

      {/* Recent picks */}
      <Section title="Recent picks (last 100)">
        {listLoading && <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)" }}>Loading…</p>}
        {listData && listData.picks.length === 0 && <Empty>No picks logged yet.</Empty>}
        {listData && listData.picks.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ow-border)" }}>
                  <Th>When</Th>
                  <Th>Region</Th>
                  <Th>Answers</Th>
                  <Th>Winner</Th>
                  <Th>True match</Th>
                  <Th>CTA</Th>
                </tr>
              </thead>
              <tbody>
                {listData.picks.map((p) => (
                  <tr key={p.id} data-testid={`admin-quiz-pick-${p.id}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                    <Td>{fmtDate(Number(p.pickedAt))}</Td>
                    <Td>{p.region}</Td>
                    <Td>
                      <code style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: "0.72rem", color: "var(--ow-text-mid)" }}>
                        {p.wineType}/{p.fruit}/{p.body}/{p.sweetness}/{p.grip}/{p.age}/{p.budget}
                      </code>
                    </Td>
                    <Td>
                      <strong style={{ color: "var(--ow-text-hi)" }}>{p.winnerSlug}</strong>
                    </Td>
                    <Td style={{ color: p.winnerSlug === p.trueMatchSlug ? "var(--ow-text-lo)" : "var(--ow-amber)" }}>
                      {p.trueMatchSlug}
                      {p.winnerSlug !== p.trueMatchSlug && " · swap"}
                    </Td>
                    <Td>{p.ctaClickedAt ? "✓" : ""}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      {/* Quiz leads (A5) — email captures from post-result form. */}
      <Section title="Recent quiz leads">
        {leadsData && leadsData.leads.length === 0 && <Empty>No email captures yet.</Empty>}
        {leadsData && leadsData.leads.length > 0 && (
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--ow-border)" }}>
                <Th>When</Th>
                <Th>Email</Th>
                <Th>Name</Th>
                <Th>Winery</Th>
                <Th>Pick</Th>
                <Th>Region</Th>
              </tr>
            </thead>
            <tbody>
              {leadsData.leads.map((l) => (
                <tr key={l.id} data-testid={`admin-quiz-lead-${l.id}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                  <Td>{fmtDate(Number(l.capturedAt))}</Td>
                  <Td><strong style={{ color: "var(--ow-text-hi)" }}>{l.email}</strong></Td>
                  <Td>{l.firstName ?? "—"}</Td>
                  <Td>{l.winery ?? "—"}</Td>
                  <Td>{l.winnerSlug ?? "—"}</Td>
                  <Td>{l.region ?? "—"}</Td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      {/* Gate audit log (S3) — every unlock attempt. */}
      <Section title="Gate access log · brute-force watch">
        {gateData && gateData.topFailingIps.length > 0 && (
          <div style={{ marginBottom: 12, padding: "8px 12px", background: "color-mix(in oklch, #ef4444 12%, transparent)", border: "1px solid color-mix(in oklch, #ef4444 30%, transparent)", borderRadius: 4 }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.78rem", color: "var(--ow-text-hi)", fontWeight: 700 }}>
              Top failing IPs (last {gateData.events.length} events):
            </p>
            <p style={{ margin: "4px 0 0", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
              {gateData.topFailingIps.map((f) => `${f.ip} (${f.count})`).join(" · ")}
            </p>
          </div>
        )}
        {gateData && gateData.events.length === 0 && <Empty>No gate events yet.</Empty>}
        {gateData && gateData.events.length > 0 && (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.78rem" }}>
              <thead>
                <tr style={{ borderBottom: "1px solid var(--ow-border)" }}>
                  <Th>When</Th>
                  <Th>Kind</Th>
                  <Th>IP</Th>
                  <Th>Path</Th>
                  <Th>User-agent</Th>
                </tr>
              </thead>
              <tbody>
                {gateData.events.map((e) => (
                  <tr key={e.id} data-testid={`admin-gate-event-${e.id}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                    <Td>{fmtDate(Number(e.occurredAt))}</Td>
                    <Td style={{ color: e.kind === "success" ? "#10b981" : e.kind === "fail" || e.kind === "rate_limited" ? "#ef4444" : "var(--ow-text-mid)" }}>
                      {e.kind}
                    </Td>
                    <Td><code style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem" }}>{e.ip}</code></Td>
                    <Td>{e.path ?? "—"}</Td>
                    <Td style={{ maxWidth: 300, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.userAgent ?? "—"}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>
    </div>
  );
}

function Kpi({ label, value, hint, testid }: { label: string; value: string; hint?: string; testid: string }) {
  return (
    <div
      data-testid={testid}
      style={{
        padding: "1rem 1.2rem",
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
        borderRadius: 6,
      }}
    >
      <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: "var(--ow-text-lo)", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
        {label}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: "1.7rem", color: "var(--ow-text-hi)", margin: 0, lineHeight: 1 }}>
        {value}
      </p>
      {hint && (
        <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: "var(--ow-text-lo)", margin: "6px 0 0", fontStyle: "italic" }}>
          {hint}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <h2 style={{ fontFamily: SERIF, fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: "0 0 12px" }}>
        {title}
      </h2>
      {children}
    </div>
  );
}

function Th({ children, right }: { children: React.ReactNode; right?: boolean }) {
  return (
    <th style={{ padding: "8px 10px", textAlign: right ? "right" : "left", fontFamily: SANS, fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
      {children}
    </th>
  );
}

function Td({ children, right, style }: { children: React.ReactNode; right?: boolean; style?: React.CSSProperties }) {
  return (
    <td style={{ padding: "8px 10px", textAlign: right ? "right" : "left", color: "var(--ow-text-mid)", ...(style ?? {}) }}>
      {children}
    </td>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
      {children}
    </p>
  );
}
