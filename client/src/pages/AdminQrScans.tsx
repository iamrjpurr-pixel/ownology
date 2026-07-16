/**
 * /admin/qr-scans — physical-to-digital attribution dashboard.
 *
 * Reads /api/admin/qr-scans and shows:
 *   • Total scans per SKU (bar runner vs coaster vs future SKUs)
 *   • 20 most-recent arrivals with UA + referrer
 *   • Auto-refresh every 30s so Rich can watch scans arrive during an event
 *
 * The QR endpoint (/api/qr-scan/:sku) fires the redirect BEFORE the DB write,
 * so scanners never wait. This dashboard is where the write shows up.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { RefreshCw, ExternalLink } from "lucide-react";

type Totals = { sku: string; scans: number; last_at: number };
type Recent = { sku: string; ip_hash: string | null; user_agent: string | null; referrer: string | null; arrived_at: number };
type ApiShape = { totals: Totals[]; recent: Recent[] };

function fmtWhen(ms: number): string {
  const d = new Date(ms);
  const diff = Date.now() - ms;
  if (diff < 60_000) return `${Math.round(diff / 1000)}s ago`;
  if (diff < 3600_000) return `${Math.round(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.round(diff / 3600_000)}h ago`;
  return d.toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
}

function fmtUa(ua: string | null): string {
  if (!ua) return "—";
  // Simple UA short-name — good enough for Rich to eyeball at a glance
  if (/iPhone|iPad/i.test(ua)) return "iPhone/iPad";
  if (/Android/i.test(ua)) return "Android";
  if (/Macintosh/i.test(ua)) return "Mac";
  if (/Windows/i.test(ua)) return "Windows";
  return ua.slice(0, 40);
}

export default function AdminQrScans() {
  const [data, setData] = useState<ApiShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastFetched, setLastFetched] = useState<number>(0);

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const r = await fetch("/api/admin/qr-scans", { credentials: "include" });
      if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
      const j = (await r.json()) as ApiShape;
      setData(j);
      setLastFetched(Date.now());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // Auto-refresh every 30 seconds while the page is open
    const iv = window.setInterval(refresh, 30_000);
    return () => window.clearInterval(iv);
  }, []);

  const grandTotal = useMemo(() => (data?.totals ?? []).reduce((sum, t) => sum + Number(t.scans), 0), [data]);
  const maxScans = useMemo(() => Math.max(1, ...(data?.totals ?? []).map((t) => Number(t.scans))), [data]);

  return (
    <div data-testid="admin-qr-scans" style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato', sans-serif" }}>
      {/* Header */}
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.68rem", color: "var(--ow-amber)", textTransform: "uppercase", letterSpacing: "0.10em", margin: 0 }}>
            Merch analytics · physical → digital
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>
            QR scan attribution
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Every merch QR encodes <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.75rem", color: "var(--ow-amber)" }}>/api/qr-scan/&lt;sku&gt;</code> — arrivals log here in real-time.
          </p>
        </div>
        <button
          data-testid="qr-refresh"
          onClick={refresh}
          disabled={loading}
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            padding: "8px 14px", background: "transparent",
            color: "var(--ow-amber)", border: "1px solid var(--ow-border)", borderRadius: 4,
            fontFamily: "'Lato', sans-serif", fontSize: "0.82rem", cursor: loading ? "wait" : "pointer",
          }}
        >
          <RefreshCw size={13} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Refreshing…" : "Refresh"}
        </button>
        <Link href="/admin/merch-artwork" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>
          merch artwork →
        </Link>
      </header>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      <div style={{ padding: 24, display: "grid", gridTemplateColumns: "1fr", gap: 24, maxWidth: 1000, margin: "0 auto" }}>
        {error && (
          <div data-testid="qr-error" style={{ padding: 16, background: "color-mix(in oklch, oklch(0.55 0.22 27) 15%, transparent)", border: "1px solid oklch(0.55 0.22 27)", borderRadius: 4, fontSize: "0.85rem" }}>
            <strong>Load failed:</strong> {error}
          </div>
        )}

        {/* Grand total */}
        <section data-testid="qr-grand-total" style={{ padding: 24, background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4 }}>
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-text-lo)", margin: 0 }}>
            Total scans, all-time
          </p>
          <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "3rem", margin: "4px 0 0", color: "var(--ow-amber)", letterSpacing: "-0.02em", lineHeight: 1 }}>
            {grandTotal.toLocaleString()}
          </p>
          <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "6px 0 0", fontFamily: "'Fira Code', monospace" }}>
            Last refreshed {lastFetched ? fmtWhen(lastFetched) : "—"} · auto-refresh every 30s
          </p>
        </section>

        {/* Per-SKU breakdown */}
        <section data-testid="qr-by-sku" style={{ padding: 24, background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", margin: "0 0 16px", fontWeight: 600 }}>
            Which SKU is doing the work
          </h2>
          {data?.totals && data.totals.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {data.totals.map((t) => {
                const pct = (Number(t.scans) / maxScans) * 100;
                return (
                  <div key={t.sku} data-testid={`sku-row-${t.sku}`}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                      <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.85rem", color: "var(--ow-text-hi)" }}>{t.sku}</span>
                      <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
                        {Number(t.scans).toLocaleString()} scans · last {fmtWhen(Number(t.last_at))}
                      </span>
                    </div>
                    <div style={{ height: 8, background: "var(--ow-bg-inset)", borderRadius: 2, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: "var(--ow-amber)", transition: "width 0.3s" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--ow-text-lo)", margin: 0, fontStyle: "italic" }}>
              No scans yet. Print the merch, put it in front of humans, watch this table fill up.
            </p>
          )}
        </section>

        {/* Recent arrivals */}
        <section data-testid="qr-recent" style={{ padding: 24, background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4 }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", margin: "0 0 16px", fontWeight: 600 }}>
            20 most recent arrivals
          </h2>
          {data?.recent && data.recent.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem", minWidth: 640 }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--ow-border)" }}>
                    <th style={cellHead}>When</th>
                    <th style={cellHead}>SKU</th>
                    <th style={cellHead}>Device</th>
                    <th style={cellHead}>Referrer</th>
                    <th style={cellHead}>Visitor</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recent.map((r, i) => (
                    <tr key={i} data-testid={`recent-row-${i}`} style={{ borderBottom: "1px solid var(--ow-bg-inset)" }}>
                      <td style={cellBody}>{fmtWhen(Number(r.arrived_at))}</td>
                      <td style={{ ...cellBody, fontFamily: "'Fira Code', monospace", color: "var(--ow-amber)" }}>{r.sku}</td>
                      <td style={cellBody}>{fmtUa(r.user_agent)}</td>
                      <td style={cellBody}>
                        {r.referrer ? (
                          <a href={r.referrer} target="_blank" rel="noreferrer" style={{ color: "var(--ow-text-mid)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: 4 }}>
                            {r.referrer.slice(0, 40)} <ExternalLink size={10} />
                          </a>
                        ) : "—"}
                      </td>
                      <td style={{ ...cellBody, fontFamily: "'Fira Code', monospace", fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>{r.ip_hash || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p style={{ fontSize: "0.85rem", color: "var(--ow-text-lo)", margin: 0, fontStyle: "italic" }}>
              No arrivals yet.
            </p>
          )}
        </section>
      </div>
    </div>
  );
}

const cellHead: React.CSSProperties = {
  textAlign: "left",
  padding: "0.6rem 0.75rem",
  fontFamily: "'Fira Code', monospace",
  fontSize: "0.64rem",
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  color: "var(--ow-text-lo)",
  fontWeight: 700,
};
const cellBody: React.CSSProperties = {
  padding: "0.7rem 0.75rem",
  color: "var(--ow-text-mid)",
  verticalAlign: "top",
};
