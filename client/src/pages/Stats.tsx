/**
 * Public /stats — cost transparency page.
 *
 * Pulls from admin.llmStats (already shipped) and presents the live LLM spend
 * + cost-per-query publicly. Unique trust signal — no SaaS does this.
 *
 * Value-engineering check: 4/5 — pure UI on existing data. Zero LLM cost.
 */
import { trpc } from "../lib/trpc";

function fmtUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(6)}`;
  if (n < 1) return `$${n.toFixed(4)}`;
  return `$${n.toFixed(2)}`;
}

export default function Stats() {
  const { data } = trpc.admin.llmStats.useQuery(undefined, {
    refetchInterval: 60_000,
    retry: false,
  });
  const stats = data;
  const totals = stats?.totals;
  const callsPerHour = stats && stats.uptimeSec > 0 ? (totals?.calls ?? 0) / (stats.uptimeSec / 3600) : 0;
  const costPerCall = totals && totals.calls > 0 ? totals.costUsd / totals.calls : 0;

  return (
    <div data-testid="stats-page" className="container py-12 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)" }}>Cost transparency · live</p>
        <h1 className="text-3xl font-semibold mt-2" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
          What Ownology actually costs to run
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--ow-text-mid)" }}>
          We hide nothing. Every AI call, every model, every cent. Refreshes every minute.
        </p>
      </div>

      {!stats && (
        <p data-testid="stats-loading" style={{ color: "var(--ow-text-mid)" }}>Loading live stats…</p>
      )}

      {stats && (
        <div className="flex flex-col gap-6">
          {/* Headline KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Kpi label="Total LLM calls" value={String(totals?.calls ?? 0)} data-testid="stats-total-calls" />
            <Kpi label="Total cost (since deploy)" value={fmtUsd(totals?.costUsd ?? 0)} data-testid="stats-total-cost" />
            <Kpi label="Cost per call" value={fmtUsd(costPerCall)} data-testid="stats-cost-per-call" />
            <Kpi label="Calls / hour" value={callsPerHour.toFixed(1)} data-testid="stats-calls-per-hour" />
          </div>

          {/* Daily budget guard */}
          {stats.daily && (
            <div
              data-testid="stats-daily-budget"
              className="rounded p-4"
              style={{
                background: "var(--ow-bg-card)",
                border: `1px solid ${stats.daily.exceeded ? "#b91c1c" : "var(--ow-border)"}`,
              }}
            >
              <div className="flex items-baseline justify-between mb-2">
                <p className="text-xs uppercase tracking-widest" style={{ color: stats.daily.exceeded ? "#b91c1c" : "var(--ow-amber)" }}>
                  Today&apos;s budget · {stats.daily.dateKey}{stats.daily.exceeded ? " · OVERALL PAUSED" : ""}
                </p>
                <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.85rem", color: "var(--ow-text-mid)" }}>
                  {fmtUsd(stats.daily.spendUsd)}{" "}
                  {stats.daily.budgetUsd !== null ? `/ ${fmtUsd(stats.daily.budgetUsd)}` : "/ unlimited"}
                </p>
              </div>
              {stats.daily.budgetUsd !== null && (
                <div style={{ height: 8, background: "var(--ow-border)", borderRadius: 4, overflow: "hidden" }}>
                  <div
                    style={{
                      width: `${Math.min(100, (stats.daily.spendUsd / stats.daily.budgetUsd) * 100)}%`,
                      height: "100%",
                      background: stats.daily.exceeded ? "#b91c1c" : "var(--ow-amber)",
                      transition: "width 0.4s",
                    }}
                  />
                </div>
              )}
              <p className="mt-2 mb-3" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
                {stats.daily.budgetUsd === null
                  ? "No overall budget configured — set DAILY_LLM_BUDGET_USD to enable the safety cap."
                  : stats.daily.exceeded
                    ? "Overall cap hit — ALL chat completions (including system) return a graceful \"paused\" response until UTC midnight or admin reset."
                    : `${fmtUsd(stats.daily.remainingUsd ?? 0)} remaining today across all tiers. Resets at UTC midnight.`}
              </p>

              {/* Per-tier rows */}
              {stats.daily.tiers && (
                <div className="mt-3 pt-3" style={{ borderTop: "1px dashed var(--ow-border)" }}>
                  <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-text-lo)" }}>
                    Per-tier guard
                  </p>
                  {(["free", "premium", "system"] as const).map((tier) => {
                    const t = stats.daily.tiers[tier];
                    const label = tier === "free" ? "Free tier" : tier === "premium" ? "Premium" : "System (uncapped)";
                    const desc =
                      tier === "free"
                        ? "Anonymous & free-quota Curiosity questions. Pauses first."
                        : tier === "premium"
                          ? "Tutor + paying-tier features."
                          : "Internal classifiers, embeddings, scheduled jobs. Never paused at the tier level.";
                    return (
                      <div
                        key={tier}
                        data-testid={`stats-daily-tier-${tier}`}
                        className="mb-2"
                      >
                        <div className="flex items-baseline justify-between">
                          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: t.exceeded ? "#b91c1c" : "var(--ow-text-mid)", fontWeight: 600 }}>
                            {label}{t.exceeded ? " · PAUSED" : ""}
                          </span>
                          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
                            {fmtUsd(t.spendUsd)} {t.budgetUsd !== null ? `/ ${fmtUsd(t.budgetUsd)}` : "/ unlimited"}
                          </span>
                        </div>
                        {t.budgetUsd !== null && (
                          <div style={{ height: 4, background: "var(--ow-border)", borderRadius: 2, overflow: "hidden", marginTop: 2 }}>
                            <div
                              style={{
                                width: `${Math.min(100, (t.spendUsd / t.budgetUsd) * 100)}%`,
                                height: "100%",
                                background: t.exceeded ? "#b91c1c" : tier === "free" ? "#6b7280" : tier === "premium" ? "var(--ow-amber)" : "#10b981",
                                transition: "width 0.4s",
                              }}
                            />
                          </div>
                        )}
                        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", marginTop: 2, lineHeight: 1.4 }}>
                          {desc}
                        </p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* By Model */}
          <Section title="By Model">
            <Table
              headers={["Model", "Calls", "Tokens In", "Tokens Out", "Cost"]}
              rows={(stats.byModel ?? []).map((r) => [
                r.key,
                String(r.calls),
                r.tokensIn.toLocaleString(),
                r.tokensOut.toLocaleString(),
                fmtUsd(r.costUsd),
              ])}
            />
          </Section>

          {/* By Source */}
          <Section title="By Source (feature)">
            <Table
              headers={["Source", "Calls", "Tokens In", "Tokens Out", "Cost"]}
              rows={(stats.bySource ?? []).map((r) => [
                r.key,
                String(r.calls),
                r.tokensIn.toLocaleString(),
                r.tokensOut.toLocaleString(),
                fmtUsd(r.costUsd),
              ])}
            />
          </Section>

          {/* Pricing context */}
          <div className="rounded p-4" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
            <p className="text-sm font-semibold mb-2" style={{ color: "var(--ow-text-hi)" }}>What this means for Premium ($99/mo)</p>
            <p className="text-sm" style={{ color: "var(--ow-text-mid)" }}>
              At today&apos;s per-call rate, your $99/mo Premium subscription covers approximately{" "}
              <strong style={{ color: "var(--ow-amber)" }}>{costPerCall > 0 ? Math.floor(99 / costPerCall).toLocaleString() : "—"}</strong>{" "}
              AI calls before we lose money. We won&apos;t hide the maths from you.
            </p>
          </div>

          <p className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
            Note: counters reset on each Railway deploy. Coverage: instrumented LLM calls only — see VALUE-ENGINEERING.md for the in-progress coverage roadmap.
          </p>
        </div>
      )}
    </div>
  );
}

function Kpi({ label, value, "data-testid": dt }: { label: string; value: string; "data-testid"?: string }) {
  return (
    <div data-testid={dt} className="rounded p-3" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>{label}</p>
      <p className="text-2xl font-bold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-text-lo)" }}>{title}</h2>
      {children}
    </div>
  );
}

function Table({ headers, rows }: { headers: string[]; rows: string[][] }) {
  return (
    <div className="overflow-x-auto rounded" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
      <table className="w-full text-sm">
        <thead>
          <tr>
            {headers.map((h) => (
              <th key={h} className="px-3 py-2 text-left text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)", borderBottom: "1px solid var(--ow-border)" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 && (
            <tr><td colSpan={headers.length} className="px-3 py-3 text-center" style={{ color: "var(--ow-text-lo)" }}>No data yet.</td></tr>
          )}
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((c, j) => (
                <td key={j} className="px-3 py-2" style={{ color: "var(--ow-text-mid)", borderTop: i > 0 ? "1px solid var(--ow-border)" : undefined, fontFamily: j > 0 ? "'Fira Code',monospace" : undefined, fontSize: j > 0 ? "0.85rem" : undefined }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
