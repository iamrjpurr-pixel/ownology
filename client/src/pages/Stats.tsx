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
              At today's per-call rate, your $99/mo Premium subscription covers approximately{" "}
              <strong style={{ color: "var(--ow-amber)" }}>{costPerCall > 0 ? Math.floor(99 / costPerCall).toLocaleString() : "—"}</strong>{" "}
              AI calls before we lose money. We won't hide the maths from you.
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
