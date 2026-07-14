/**
 * AdminBuildCheck — "Is prod current?" answered without me being in the loop.
 *
 * Fetches /api/build-info from two places:
 *   1. This host (local / preview / whatever URL is loaded)
 *   2. The prod URL entered in the input (persisted to localStorage)
 *
 * Diffs the two manifests field-by-field. Any mismatch turns red with a
 * plain-English hint. Green tick = prod matches, safe to move on. Red row
 * on `commit` = prod is behind, hit "Save to Github" and wait for Railway.
 *
 * Runs every 30s while the tab is open so the user can leave it on a
 * second monitor and watch the deploy converge.
 */
import { useEffect, useMemo, useState, useCallback } from "react";
import { Link } from "wouter";
import { ArrowLeft, RefreshCw, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

type BuildInfo = {
  commit: string;
  commitAt: string;
  computedAt: string;
  swCacheVersion: string;
  trpcProcedures: number;
  dbTables: number;
  clientPages: number;
  latestChange: string;
  appVersion: string;
  nodeEnv: string;
};

type FetchResult =
  | { ok: true; data: BuildInfo; ms: number }
  | { ok: false; error: string; ms: number };

const DEFAULT_PROD_URL = "https://ownology.app";
const LS_KEY = "ow_build_check_prod_url";
const REFRESH_MS = 30_000;

async function fetchBuildInfo(base: string): Promise<FetchResult> {
  const start = Date.now();
  try {
    const url = base.replace(/\/+$/, "") + "/api/build-info";
    const r = await fetch(url, { credentials: "omit", cache: "no-store" });
    if (!r.ok) return { ok: false, error: `HTTP ${r.status}`, ms: Date.now() - start };
    const data = (await r.json()) as BuildInfo;
    return { ok: true, data, ms: Date.now() - start };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e), ms: Date.now() - start };
  }
}

const FIELDS: Array<{ key: keyof BuildInfo; label: string; hint: string }> = [
  { key: "commit", label: "Commit", hint: "Git short-hash of the running build. Mismatch = prod is behind." },
  { key: "commitAt", label: "Commit time", hint: "Wall-clock of the commit itself." },
  { key: "appVersion", label: "App version", hint: "package.json version field." },
  { key: "swCacheVersion", label: "SW cache", hint: "Bump this in sw.js to force clients to redownload assets." },
  { key: "trpcProcedures", label: "tRPC procedures", hint: "Count of backend endpoints. Drop = something didn't ship." },
  { key: "dbTables", label: "DB tables", hint: "Count of Drizzle tables. Drop = missing migration on prod." },
  { key: "clientPages", label: "Client pages", hint: "Count of .tsx pages under client/src/pages." },
  { key: "latestChange", label: "Latest CHANGELOG entry", hint: "Top heading of memory/CHANGELOG.md." },
  { key: "nodeEnv", label: "NODE_ENV", hint: "Should be 'production' on prod, 'development' locally." },
];

export default function AdminBuildCheck() {
  const [prodUrl, setProdUrl] = useState<string>(() => {
    if (typeof window === "undefined") return DEFAULT_PROD_URL;
    return window.localStorage.getItem(LS_KEY) || DEFAULT_PROD_URL;
  });
  const [localResult, setLocalResult] = useState<FetchResult | null>(null);
  const [prodResult, setProdResult] = useState<FetchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<number>(0);

  const runCheck = useCallback(async () => {
    setLoading(true);
    const localBase =
      typeof window !== "undefined" ? window.location.origin : "";
    const [local, prod] = await Promise.all([
      fetchBuildInfo(localBase),
      fetchBuildInfo(prodUrl),
    ]);
    setLocalResult(local);
    setProdResult(prod);
    setLastRunAt(Date.now());
    setLoading(false);
  }, [prodUrl]);

  useEffect(() => {
    runCheck();
    const id = setInterval(runCheck, REFRESH_MS);
    return () => clearInterval(id);
  }, [runCheck]);

  const saveProdUrl = (value: string) => {
    const trimmed = value.trim();
    setProdUrl(trimmed);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(LS_KEY, trimmed);
    }
  };

  const summary = useMemo(() => {
    if (!localResult?.ok || !prodResult?.ok) return null;
    const l = localResult.data;
    const p = prodResult.data;
    const mismatched = FIELDS.filter((f) => String(l[f.key]) !== String(p[f.key]));
    return {
      total: FIELDS.length,
      matched: FIELDS.length - mismatched.length,
      mismatched: mismatched.map((m) => m.label),
    };
  }, [localResult, prodResult]);

  const inSync = summary && summary.mismatched.length === 0;

  return (
    <div style={{ maxWidth: 960, margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <Link
        href="/admin/dev"
        data-testid="build-check-back-link"
        style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--muted-foreground, #6b7280)", textDecoration: "none", fontSize: 14, marginBottom: 16 }}
      >
        <ArrowLeft size={14} /> Back to Admin / Dev
      </Link>

      <h1 style={{ fontSize: "1.75rem", margin: "0 0 0.5rem", fontWeight: 600 }}>
        Build Check
      </h1>
      <p style={{ color: "var(--muted-foreground, #6b7280)", fontSize: 14, marginBottom: 24, maxWidth: 640 }}>
        Compares this build against prod. Any red row = the last "Save to Github" push hasn&apos;t landed on Railway yet. Refreshes every {REFRESH_MS / 1000}s so you can leave it open during a deploy.
      </p>

      <div style={{ display: "flex", gap: 8, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 24 }}>
        <label style={{ flex: "1 1 320px", fontSize: 13, color: "var(--muted-foreground, #6b7280)" }}>
          Production URL
          <input
            type="url"
            data-testid="build-check-prod-url-input"
            value={prodUrl}
            onChange={(e) => saveProdUrl(e.target.value)}
            style={{
              width: "100%",
              marginTop: 4,
              padding: "8px 10px",
              fontSize: 14,
              border: "1px solid var(--border, #d4d4d8)",
              borderRadius: 6,
              background: "var(--background, white)",
              color: "var(--foreground, #111)",
            }}
          />
        </label>
        <button
          type="button"
          data-testid="build-check-refresh-button"
          onClick={runCheck}
          disabled={loading}
          style={{
            padding: "9px 14px",
            fontSize: 14,
            border: "1px solid var(--border, #d4d4d8)",
            borderRadius: 6,
            background: "var(--background, white)",
            color: "var(--foreground, #111)",
            cursor: loading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <RefreshCw size={14} style={{ animation: loading ? "spin 1s linear infinite" : "none" }} />
          {loading ? "Checking…" : "Refresh"}
        </button>
      </div>

      {summary && (
        <div
          data-testid="build-check-summary"
          style={{
            padding: "14px 16px",
            borderRadius: 8,
            marginBottom: 20,
            border: `1px solid ${inSync ? "#4a7c47" : "#b91c1c"}`,
            background: inSync ? "rgba(74,124,71,0.08)" : "rgba(185,28,28,0.06)",
            color: inSync ? "#2f5230" : "#7f1d1d",
            fontSize: 14,
            display: "flex",
            alignItems: "center",
            gap: 10,
          }}
        >
          {inSync ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
          <span>
            {inSync
              ? `Prod matches local — ${summary.matched}/${summary.total} fields in sync. Safe to move on.`
              : `Prod is behind on ${summary.mismatched.length} field${summary.mismatched.length === 1 ? "" : "s"}: ${summary.mismatched.join(", ")}. Hit "Save to Github" and wait for Railway.`}
          </span>
        </div>
      )}

      {lastRunAt > 0 && (
        <div style={{ fontSize: 12, color: "var(--muted-foreground, #6b7280)", marginBottom: 12 }}>
          Last checked {new Date(lastRunAt).toLocaleTimeString()}
        </div>
      )}

      <ResultTable local={localResult} prod={prodResult} prodUrl={prodUrl} />

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function ResultTable({
  local,
  prod,
  prodUrl,
}: {
  local: FetchResult | null;
  prod: FetchResult | null;
  prodUrl: string;
}) {
  return (
    <div style={{ overflowX: "auto", border: "1px solid var(--border, #e5e7eb)", borderRadius: 8 }}>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
        <thead>
          <tr style={{ background: "var(--muted, #f4f4f5)", textAlign: "left" }}>
            <th style={{ padding: "10px 12px", fontWeight: 600 }}>Field</th>
            <th style={{ padding: "10px 12px", fontWeight: 600 }}>Local (this build)</th>
            <th style={{ padding: "10px 12px", fontWeight: 600 }}>Prod ({prodUrl.replace(/^https?:\/\//, "")})</th>
            <th style={{ padding: "10px 12px", fontWeight: 600, width: 60 }}>Match</th>
          </tr>
        </thead>
        <tbody>
          {(!local?.ok || !prod?.ok) && (
            <tr>
              <td colSpan={4} style={{ padding: "16px 12px", color: "#7f1d1d", fontSize: 13 }}>
                {!local?.ok && <div data-testid="build-check-local-error">Local: {local && !local.ok ? local.error : "waiting…"}</div>}
                {!prod?.ok && <div data-testid="build-check-prod-error">Prod: {prod && !prod.ok ? prod.error : "waiting…"}</div>}
              </td>
            </tr>
          )}
          {local?.ok && prod?.ok &&
            FIELDS.map((f) => {
              const lv = String(local.data[f.key]);
              const pv = String(prod.data[f.key]);
              const match = lv === pv;
              return (
                <tr key={f.key} style={{ borderTop: "1px solid var(--border, #e5e7eb)", background: match ? "transparent" : "rgba(185,28,28,0.04)" }}>
                  <td style={{ padding: "10px 12px", fontWeight: 500 }} title={f.hint}>
                    {f.label}
                  </td>
                  <td data-testid={`build-check-local-${f.key}`} style={{ padding: "10px 12px", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
                    {lv}
                  </td>
                  <td data-testid={`build-check-prod-${f.key}`} style={{ padding: "10px 12px", fontFamily: "ui-monospace, monospace", fontSize: 13, color: match ? undefined : "#7f1d1d" }}>
                    {pv}
                  </td>
                  <td style={{ padding: "10px 12px" }}>
                    {match ? <CheckCircle2 size={16} color="#4a7c47" /> : <XCircle size={16} color="#b91c1c" />}
                  </td>
                </tr>
              );
            })}
        </tbody>
      </table>
    </div>
  );
}
