/**
 * Campaign Metrics Dashboard — /campaign-metrics
 *
 * Owner-only page showing week-by-week campaign KPIs:
 * - Founding member count and MRR trajectory
 * - Waitlist growth
 * - Email open/click rates
 * - Organic sessions and top keyword rank
 * - Merch orders and revenue
 * - Compliance agent query volume
 *
 * Data is loaded from the campaign_metrics_snapshots table via tRPC.
 * The weekly Heartbeat cron auto-inserts a snapshot every Monday 09:00 AEST.
 * External metrics (email, SEO) can be manually updated via the edit panel.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Loader2, TrendingUp, Users, ShoppingBag, Search, Mail, Zap, RefreshCw, PlusCircle } from "lucide-react";
import { toast } from "sonner";

// ─── Colour tokens ────────────────────────────────────────────────────────────
const AMBER = "var(--ow-amber)";
const AMBER_DIM = "oklch(0.55 0.09 75)";
const WARM_WHITE = "oklch(0.92 0.010 75)";

// ─── KPI card ─────────────────────────────────────────────────────────────────
function KpiCard({
  title,
  value,
  sub,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  trend?: number; // positive = up, negative = down
}) {
  return (
    <Card
      style={{
        background: "var(--ow-bg-base)",
        border: "1px solid var(--ow-bg-inset)",
      }}
    >
      <CardContent className="pt-5 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              {title}
            </p>
            <p
              className="mt-1"
              style={{ fontFamily: "'Fraunces',serif", fontSize: "2rem", fontWeight: 700, color: WARM_WHITE, lineHeight: 1.1 }}
            >
              {value}
            </p>
            {sub && (
              <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)", marginTop: "0.25rem" }}>
                {sub}
              </p>
            )}
          </div>
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}
          >
            <Icon size={18} style={{ color: AMBER }} />
          </div>
        </div>
        {trend !== undefined && (
          <div className="mt-3 flex items-center gap-1.5">
            <span
              style={{
                fontSize: "0.7rem",
                fontFamily: "'Lato',sans-serif",
                color: trend >= 0 ? "oklch(0.65 0.14 145)" : "oklch(0.60 0.14 25)",
                fontWeight: 600,
              }}
            >
              {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}% vs last week
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Chart tooltip ────────────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "var(--ow-bg-base)",
        border: "1px solid var(--ow-bg-inset)",
        borderRadius: "6px",
        padding: "10px 14px",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.8rem",
      }}
    >
      <p style={{ color: "var(--ow-text-lo)", marginBottom: "6px" }}>{label}</p>
      {payload.map((p: any) => (
        <p key={p.dataKey} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{p.value}</strong>
        </p>
      ))}
    </div>
  );
}

// ─── Add / Edit snapshot form ─────────────────────────────────────────────────
function SnapshotForm({ onSuccess }: { onSuccess: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    weekLabel: "",
    waitlistCount: "",
    emailOpenRate: "",
    emailClickRate: "",
    organicSessions: "",
    topKeywordRank: "",
    foundingMemberCount: "",
    mrr: "",
    merchOrders: "",
    merchRevenue: "",
    complianceQueries: "",
    notes: "",
  });

  const upsert = trpc.campaignMetrics.upsert.useMutation({
    onSuccess: () => {
      toast.success("Snapshot saved");
      setOpen(false);
      onSuccess();
    },
    onError: (err) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weekLabel.match(/^\d{4}-W\d{2}$/)) {
      toast.error("Week label must be in format YYYY-Wnn e.g. 2026-W20");
      return;
    }
    upsert.mutate({
      weekLabel: form.weekLabel,
      waitlistCount: form.waitlistCount ? parseInt(form.waitlistCount) : undefined,
      emailOpenRate: form.emailOpenRate ? Math.round(parseFloat(form.emailOpenRate) * 100) : undefined,
      emailClickRate: form.emailClickRate ? Math.round(parseFloat(form.emailClickRate) * 100) : undefined,
      organicSessions: form.organicSessions ? parseInt(form.organicSessions) : undefined,
      topKeywordRank: form.topKeywordRank ? parseInt(form.topKeywordRank) : undefined,
      foundingMemberCount: form.foundingMemberCount ? parseInt(form.foundingMemberCount) : undefined,
      mrr: form.mrr ? Math.round(parseFloat(form.mrr) * 100) : undefined,
      merchOrders: form.merchOrders ? parseInt(form.merchOrders) : undefined,
      merchRevenue: form.merchRevenue ? Math.round(parseFloat(form.merchRevenue) * 100) : undefined,
      complianceQueries: form.complianceQueries ? parseInt(form.complianceQueries) : undefined,
      notes: form.notes || undefined,
    });
  };

  if (!open) {
    return (
      <Button
        onClick={() => setOpen(true)}
        variant="outline"
        size="sm"
        style={{ borderColor: "color-mix(in oklch, var(--ow-amber) 40%, transparent)", color: AMBER }}
      >
        <PlusCircle size={14} className="mr-1.5" /> Add / Update Snapshot
      </Button>
    );
  }

  return (
    <Card style={{ background: "var(--ow-bg-base)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}>
      <CardHeader>
        <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
          Add or Update Weekly Snapshot
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label style={{ color: "var(--ow-text-mid)" }}>Week Label (YYYY-Wnn) *</Label>
            <Input
              placeholder="e.g. 2026-W20"
              value={form.weekLabel}
              onChange={(e) => setForm((f) => ({ ...f, weekLabel: e.target.value }))}
              style={{ background: "var(--ow-bg-inset)", borderColor: "oklch(0.25 0.010 60)", color: WARM_WHITE }}
              required
            />
          </div>
          {[
            { key: "waitlistCount", label: "Waitlist Count", placeholder: "e.g. 142" },
            { key: "emailOpenRate", label: "Email Open Rate (%)", placeholder: "e.g. 42.5" },
            { key: "emailClickRate", label: "Email Click Rate (%)", placeholder: "e.g. 8.3" },
            { key: "organicSessions", label: "Organic Sessions", placeholder: "e.g. 320" },
            { key: "topKeywordRank", label: "Top Keyword Rank", placeholder: "e.g. 4" },
            { key: "foundingMemberCount", label: "Founding Members", placeholder: "e.g. 12" },
            { key: "mrr", label: "MRR (AUD $)", placeholder: "e.g. 348" },
            { key: "merchOrders", label: "Merch Orders", placeholder: "e.g. 3" },
            { key: "merchRevenue", label: "Merch Revenue (AUD $)", placeholder: "e.g. 54" },
            { key: "complianceQueries", label: "Compliance Queries", placeholder: "e.g. 87" },
          ].map(({ key, label, placeholder }) => (
            <div key={key}>
              <Label style={{ color: "var(--ow-text-mid)" }}>{label}</Label>
              <Input
                placeholder={placeholder}
                value={(form as any)[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                style={{ background: "var(--ow-bg-inset)", borderColor: "oklch(0.25 0.010 60)", color: WARM_WHITE }}
              />
            </div>
          ))}
          <div className="col-span-2">
            <Label style={{ color: "var(--ow-text-mid)" }}>Notes</Label>
            <Textarea
              placeholder="Optional notes for this week..."
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              style={{ background: "var(--ow-bg-inset)", borderColor: "oklch(0.25 0.010 60)", color: WARM_WHITE }}
            />
          </div>
          <div className="col-span-2 flex gap-3">
            <Button
              type="submit"
              disabled={upsert.isPending}
              style={{ background: AMBER, color: "var(--ow-bg-base)", fontWeight: 600 }}
            >
              {upsert.isPending ? <Loader2 size={14} className="mr-1.5 animate-spin" /> : null}
              Save Snapshot
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} style={{ color: "var(--ow-text-lo)" }}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function CampaignMetrics() {
  const { data, isLoading, refetch } = trpc.campaignMetrics.getHistory.useQuery({ limit: 26 });

  const rows = [...(data ?? [])].reverse(); // chronological order for charts

  // Compute week-on-week trend for founding members
  const latestFM = rows.at(-1)?.foundingMemberCount ?? 0;
  const prevFM = rows.at(-2)?.foundingMemberCount ?? 0;
  const fmTrend = prevFM > 0 ? Math.round(((latestFM - prevFM) / prevFM) * 100) : 0;

  const latestMRR = rows.at(-1)?.mrr ?? 0;
  const prevMRR = rows.at(-2)?.mrr ?? 0;
  const mrrTrend = prevMRR > 0 ? Math.round(((latestMRR - prevMRR) / prevMRR) * 100) : 0;

  const latestWaitlist = rows.at(-1)?.waitlistCount ?? 0;
  const prevWaitlist = rows.at(-2)?.waitlistCount ?? 0;
  const waitlistTrend = prevWaitlist > 0 ? Math.round(((latestWaitlist - prevWaitlist) / prevWaitlist) * 100) : 0;

  const chartData = rows.map((r) => ({
    week: r.weekLabel.replace(/^\d{4}-/, ""), // "W20"
    "Founding Members": r.foundingMemberCount,
    "MRR ($)": (r.mrr / 100).toFixed(0),
    Waitlist: r.waitlistCount,
    "Open Rate (%)": (r.emailOpenRate / 100).toFixed(1),
    "Click Rate (%)": (r.emailClickRate / 100).toFixed(1),
    "Organic Sessions": r.organicSessions,
    "Compliance Queries": r.complianceQueries,
    "Merch Orders": r.merchOrders,
  }));

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", fontFamily: "'Lato',sans-serif" }}
    >
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ow-bg-inset)" }}>
        <div className="container py-8">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <p style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.12em", textTransform: "uppercase" }}>
                Post-Vintage Campaign
              </p>
              <h1
                style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.6rem,3vw,2.2rem)", color: WARM_WHITE, marginTop: "0.25rem" }}
              >
                Campaign Metrics
              </h1>
              <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginTop: "0.4rem" }}>
                Weekly snapshots — May to October 2026
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge
                style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", color: AMBER, border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)", fontSize: "0.7rem" }}
              >
                {rows.length} weeks tracked
              </Badge>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                style={{ color: "var(--ow-text-lo)" }}
              >
                <RefreshCw size={14} className="mr-1.5" /> Refresh
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-8 space-y-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="animate-spin" style={{ color: AMBER }} />
          </div>
        ) : (
          <>
            {/* KPI cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <KpiCard
                title="Founding Members"
                value={latestFM}
                sub="Target: 99 by Oct 2026"
                icon={Users}
                trend={fmTrend}
              />
              <KpiCard
                title="MRR"
                value={`$${(latestMRR / 100).toFixed(0)}`}
                sub="AUD — target $2,871"
                icon={TrendingUp}
                trend={mrrTrend}
              />
              <KpiCard
                title="Waitlist"
                value={latestWaitlist}
                sub="Email subscribers"
                icon={Mail}
                trend={waitlistTrend}
              />
              <KpiCard
                title="Compliance Queries"
                value={rows.at(-1)?.complianceQueries ?? 0}
                sub="This week"
                icon={Zap}
              />
            </div>

            {/* Founding members + MRR chart */}
            <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                  Founding Members &amp; MRR
                </CardTitle>
              </CardHeader>
              <CardContent>
                {chartData.length === 0 ? (
                  <div className="flex items-center justify-center py-16 text-center">
                    <div>
                      <p style={{ color: "var(--ow-text-lo)", fontSize: "0.9rem" }}>No data yet.</p>
                      <p style={{ color: "var(--ow-text-lo)", fontSize: "0.8rem", marginTop: "0.5rem" }}>
                        The weekly Heartbeat will auto-insert a snapshot every Monday.<br />
                        You can also add a snapshot manually below.
                      </p>
                    </div>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                      <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fill: "var(--ow-text-lo)", fontSize: 11 }} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fill: "var(--ow-text-lo)", fontSize: 11 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }} />
                      <Line
                        yAxisId="left"
                        type="monotone"
                        dataKey="Founding Members"
                        stroke={AMBER}
                        strokeWidth={2}
                        dot={{ fill: AMBER, r: 3 }}
                      />
                      <Line
                        yAxisId="right"
                        type="monotone"
                        dataKey="MRR ($)"
                        stroke={AMBER_DIM}
                        strokeWidth={2}
                        strokeDasharray="4 2"
                        dot={{ fill: AMBER_DIM, r: 3 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>

            {/* Waitlist + email chart */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                    Waitlist Growth
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                      <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="Waitlist" fill={AMBER} radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                    Email Engagement
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                      <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend wrapperStyle={{ fontSize: "0.7rem", color: "var(--ow-text-lo)" }} />
                      <Line type="monotone" dataKey="Open Rate (%)" stroke={AMBER} strokeWidth={2} dot={{ r: 2 }} />
                      <Line type="monotone" dataKey="Click Rate (%)" stroke={AMBER_DIM} strokeWidth={2} strokeDasharray="4 2" dot={{ r: 2 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Compliance + merch chart */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                    Compliance Agent Queries
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                      <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="Compliance Queries" fill="oklch(0.55 0.09 75)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                    Merch Orders
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                      <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                      <Tooltip content={<ChartTooltip />} />
                      <Bar dataKey="Merch Orders" fill="oklch(0.65 0.10 75)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {/* Organic sessions chart */}
            <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
              <CardHeader>
                <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                  <Search size={14} className="inline mr-2" style={{ color: AMBER }} />
                  Organic Search Sessions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--ow-bg-inset)" />
                    <XAxis dataKey="week" tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "var(--ow-text-lo)", fontSize: 10 }} />
                    <Tooltip content={<ChartTooltip />} />
                    <Bar dataKey="Organic Sessions" fill={AMBER} radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Manual snapshot form */}
            <SnapshotForm onSuccess={() => refetch()} />

            {/* Snapshot history table */}
            {rows.length > 0 && (
              <Card style={{ background: "var(--ow-bg-base)", border: "1px solid var(--ow-bg-inset)" }}>
                <CardHeader>
                  <CardTitle style={{ fontFamily: "'Fraunces',serif", color: WARM_WHITE, fontSize: "1rem" }}>
                    Snapshot History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem", fontFamily: "'Lato',sans-serif" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--ow-bg-inset)" }}>
                          {["Week", "FM", "MRR", "Waitlist", "Open%", "Click%", "Sessions", "Queries", "Merch"].map((h) => (
                            <th
                              key={h}
                              style={{ padding: "8px 10px", textAlign: "right", color: "var(--ow-text-lo)", fontWeight: 400, letterSpacing: "0.06em", textTransform: "uppercase", fontSize: "0.68rem" }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...rows].reverse().map((r) => (
                          <tr
                            key={r.id}
                            style={{ borderBottom: "1px solid var(--ow-bg-inset)" }}
                          >
                            <td style={{ padding: "7px 10px", color: AMBER, fontWeight: 600 }}>{r.weekLabel}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{r.foundingMemberCount}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>${(r.mrr / 100).toFixed(0)}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{r.waitlistCount}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{(r.emailOpenRate / 100).toFixed(1)}%</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{(r.emailClickRate / 100).toFixed(1)}%</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{r.organicSessions}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{r.complianceQueries}</td>
                            <td style={{ padding: "7px 10px", textAlign: "right", color: WARM_WHITE }}>{r.merchOrders}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}
