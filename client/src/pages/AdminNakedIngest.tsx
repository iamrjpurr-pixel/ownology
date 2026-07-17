/**
 * AdminNakedIngest — /admin/naked-ingest
 *
 * Bulk-ingest Naked Wines "Angel" profile URLs into outreach_contacts.
 * Client-side loop calls `outreach.ingestNakedAngel` once per URL so
 * each Perplexity call gets its own tRPC timeout (avoids the 12-minute
 * batch timeout that a single server-side loop would hit).
 *
 * UX: paste list of URLs → click "Ingest all" → live progress table
 * with per-URL status (queued / running / created / skipped / failed).
 * Retry lives on the row itself for failed items.
 *
 * Feb 2026, Rich — first cohort ingest of the year.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BASE = "var(--ow-bg-base)";
const BORDER = "var(--ow-border)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const SANS = "'Lato', system-ui, sans-serif";
const SERIF = "'Fraunces', 'Cormorant Garamond', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

// The 71 URLs scraped from https://www.nakedwines.com.au/sitemap.xml.
// Editable — paste any subset into the textarea to run a smaller batch.
const DEFAULT_URL_LIST_HINT = "https://www.nakedwines.com.au/winemakers/...";

type RowStatus = "queued" | "running" | "created" | "skipped" | "failed";

interface Row {
  url: string;
  status: RowStatus;
  slug?: string;
  firstName?: string;
  winery?: string;
  region?: string | null;
  reason?: string;
  autoRewroteSms?: boolean;
}

export default function AdminNakedIngest() {
  const [urlsText, setUrlsText] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [isRunning, setIsRunning] = useState(false);
  const cancelRef = useRef(false);

  const ingest = trpc.outreach.ingestNakedAngel.useMutation();

  const parsedUrls = useMemo(
    () =>
      urlsText
        .split(/[\n,\s]+/)
        .map((s) => s.trim())
        .filter((s) => /^https:\/\/www\.nakedwines\.com\.au\/winemakers\/[a-z0-9-]+/.test(s)),
    [urlsText],
  );

  // Load the persisted URL list from /app/scripts/naked_urls.txt on mount.
  // Handy shortcut so the operator doesn't have to paste 71 URLs manually.
  const loadSeed = trpc.outreach.nakedAngelSeedUrls.useQuery(undefined, { enabled: false });
  useEffect(() => {
    if (loadSeed.data?.urls?.length && !urlsText) {
      setUrlsText(loadSeed.data.urls.join("\n"));
    }
  }, [loadSeed.data, urlsText]);

  async function runIngestion() {
    if (parsedUrls.length === 0) return;
    setIsRunning(true);
    cancelRef.current = false;
    const initial: Row[] = parsedUrls.map((url) => ({ url, status: "queued" as const }));
    setRows(initial);

    for (let i = 0; i < parsedUrls.length; i += 1) {
      if (cancelRef.current) break;
      const url = parsedUrls[i];
      setRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, status: "running" } : r)));
      try {
        const result = await ingest.mutateAsync({ profileUrl: url });
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? {
                  ...r,
                  status: result.status,
                  slug: result.slug,
                  firstName: "firstName" in result ? result.firstName ?? undefined : undefined,
                  winery: "winery" in result ? result.winery ?? undefined : undefined,
                  region: "region" in result ? result.region ?? null : null,
                  reason: "reason" in result ? result.reason : undefined,
                  autoRewroteSms: "autoRewroteSms" in result ? result.autoRewroteSms : undefined,
                }
              : r,
          ),
        );
      } catch (err) {
        setRows((prev) =>
          prev.map((r, idx) =>
            idx === i
              ? { ...r, status: "failed", reason: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) }
              : r,
          ),
        );
      }
    }
    setIsRunning(false);
  }

  async function retryRow(rowIndex: number) {
    const row = rows[rowIndex];
    if (!row) return;
    setRows((prev) => prev.map((r, idx) => (idx === rowIndex ? { ...r, status: "running" } : r)));
    try {
      const result = await ingest.mutateAsync({ profileUrl: row.url });
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === rowIndex
            ? {
                ...r,
                status: result.status,
                slug: result.slug,
                firstName: "firstName" in result ? result.firstName ?? undefined : undefined,
                winery: "winery" in result ? result.winery ?? undefined : undefined,
                region: "region" in result ? result.region ?? null : null,
                reason: "reason" in result ? result.reason : undefined,
                autoRewroteSms: "autoRewroteSms" in result ? result.autoRewroteSms : undefined,
              }
            : r,
        ),
      );
    } catch (err) {
      setRows((prev) =>
        prev.map((r, idx) =>
          idx === rowIndex
            ? { ...r, status: "failed", reason: err instanceof Error ? err.message.slice(0, 200) : String(err).slice(0, 200) }
            : r,
        ),
      );
    }
  }

  const stats = useMemo(() => {
    const s = { queued: 0, running: 0, created: 0, skipped: 0, failed: 0 };
    for (const r of rows) s[r.status] += 1;
    return s;
  }, [rows]);

  const totalDone = stats.created + stats.skipped + stats.failed;

  return (
    <div
      data-testid="admin-naked-ingest"
      style={{ background: BASE, minHeight: "100vh", padding: "32px 24px 80px", color: MID, fontFamily: SANS }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ marginBottom: 24 }}>
          <p style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: AMBER, margin: 0, fontFamily: MONO }}>
            Bulk ingest · Naked Wines Angels
          </p>
          <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "2rem", color: HI, margin: "6px 0 0", letterSpacing: "-0.01em" }}>
            Perplexity-enriched cohort import
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: LO, margin: "6px 0 0", maxWidth: 720, lineHeight: 1.55 }}>
            Paste Naked Wines Angel profile URLs (one per line). Each URL becomes a Perplexity Sonar-Pro call
            that extracts firstName, real estate name, region, painPoint, and a fresh public signal. Then
            Claude drafts the SMS opener in the Naked-Angel lens. ~$0.01 + ~12 sec per URL.
          </p>
        </div>

        <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 16, marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <label style={{ fontSize: "0.72rem", letterSpacing: "0.12em", textTransform: "uppercase", color: LO, fontFamily: MONO }}>
              URL list ({parsedUrls.length} valid)
            </label>
            <button
              data-testid="load-seed-btn"
              onClick={() => loadSeed.refetch()}
              disabled={isRunning || loadSeed.isFetching}
              style={{
                fontSize: "0.72rem",
                padding: "4px 10px",
                border: `1px solid ${BORDER}`,
                background: "transparent",
                color: MID,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: SANS,
              }}
            >
              {loadSeed.isFetching ? "Loading…" : "Load 71 seed URLs"}
            </button>
          </div>
          <textarea
            data-testid="urls-textarea"
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            placeholder={DEFAULT_URL_LIST_HINT}
            disabled={isRunning}
            rows={8}
            style={{
              width: "100%",
              background: BASE,
              color: MID,
              border: `1px solid ${BORDER}`,
              borderRadius: 4,
              padding: 10,
              fontFamily: MONO,
              fontSize: "0.75rem",
              lineHeight: 1.5,
              resize: "vertical",
            }}
          />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 12, gap: 12, flexWrap: "wrap" }}>
            <p style={{ fontSize: "0.72rem", color: LO, margin: 0, fontFamily: MONO }}>
              Est. cost: ~${(parsedUrls.length * 0.01).toFixed(2)} · Est. time: ~
              {Math.max(1, Math.round((parsedUrls.length * 12) / 60))} min
            </p>
            {isRunning ? (
              <button
                data-testid="cancel-btn"
                onClick={() => { cancelRef.current = true; }}
                style={{
                  background: "oklch(0.65 0.20 25)",
                  color: "white",
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  fontFamily: SANS,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel remaining
              </button>
            ) : (
              <button
                data-testid="ingest-btn"
                onClick={runIngestion}
                disabled={parsedUrls.length === 0}
                style={{
                  background: parsedUrls.length === 0 ? RAISED : AMBER,
                  color: parsedUrls.length === 0 ? LO : "#2A1E0A",
                  padding: "8px 16px",
                  borderRadius: 4,
                  border: "none",
                  fontFamily: SANS,
                  fontSize: "0.82rem",
                  fontWeight: 600,
                  cursor: parsedUrls.length === 0 ? "not-allowed" : "pointer",
                }}
              >
                Ingest {parsedUrls.length} Angel{parsedUrls.length === 1 ? "" : "s"}
              </button>
            )}
          </div>
        </div>

        {rows.length > 0 && (
          <>
            <div data-testid="stats-strip" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12, padding: "10px 14px", background: RAISED, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
              <StatChip label="Total" n={rows.length} color={MID} />
              <StatChip label="Created" n={stats.created} color="oklch(0.75 0.15 145)" />
              <StatChip label="Skipped" n={stats.skipped} color={AMBER} />
              <StatChip label="Failed" n={stats.failed} color="oklch(0.75 0.18 25)" />
              <StatChip label="Running" n={stats.running} color="oklch(0.75 0.15 210)" />
              <StatChip label="Queued" n={stats.queued} color={LO} />
              <span style={{ marginLeft: "auto", fontSize: "0.72rem", color: LO, fontFamily: MONO }}>
                {totalDone}/{rows.length} done · {rows.length > 0 ? Math.round((totalDone / rows.length) * 100) : 0}%
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              {rows.map((r, idx) => (
                <IngestRow key={r.url} row={r} index={idx} onRetry={() => retryRow(idx)} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatChip({ label, n, color }: { label: string; n: number; color: string }) {
  return (
    <span style={{ fontSize: "0.72rem", padding: "3px 10px", border: `1px solid ${BORDER}`, background: BASE, borderRadius: 999, fontFamily: MONO, color }}>
      {label} <strong style={{ fontWeight: 700 }}>{n}</strong>
    </span>
  );
}

function IngestRow({ row, index, onRetry }: { row: Row; index: number; onRetry: () => void }) {
  const suffix = row.url.split("/winemakers/")[1] ?? "";
  const statusColor: Record<RowStatus, string> = {
    queued: LO,
    running: "oklch(0.75 0.15 210)",
    created: "oklch(0.75 0.15 145)",
    skipped: AMBER,
    failed: "oklch(0.75 0.18 25)",
  };
  return (
    <div
      data-testid={`ingest-row-${index}`}
      style={{
        display: "flex",
        gap: 12,
        alignItems: "center",
        padding: "8px 12px",
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 4,
        fontSize: "0.78rem",
        flexWrap: "wrap",
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: LO, minWidth: 32 }}>#{index + 1}</span>
      <span style={{ fontFamily: MONO, color: statusColor[row.status], textTransform: "uppercase", fontSize: "0.68rem", letterSpacing: "0.1em", minWidth: 70 }}>
        {row.status}
      </span>
      <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: MID, flex: "1 1 200px", minWidth: 160 }}>
        {suffix}
      </span>
      {row.firstName && (
        <span style={{ color: HI, fontFamily: SERIF }}>
          {row.firstName} {row.winery ? `· ${row.winery}` : ""}
        </span>
      )}
      {row.region && (
        <span style={{ fontSize: "0.66rem", padding: "1px 6px", borderRadius: 999, background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: AMBER, textTransform: "capitalize" }}>
          {row.region.replaceAll("-", " ")}
        </span>
      )}
      {row.autoRewroteSms && (
        <span style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 3, background: "color-mix(in oklch, oklch(0.75 0.15 145) 15%, transparent)", color: "oklch(0.85 0.15 145)" }}>
          SMS drafted
        </span>
      )}
      {row.reason && (
        <span style={{ fontSize: "0.7rem", color: LO, flexBasis: "100%" }}>
          → {row.reason}
        </span>
      )}
      {row.slug && row.status === "created" && (
        <a
          data-testid={`open-contact-${index}`}
          href={`/admin/contacts?slug=${row.slug}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: MONO, fontSize: "0.7rem", color: LO, textDecoration: "underline" }}
        >
          open contact ↗
        </a>
      )}
      {row.status === "failed" && (
        <button
          data-testid={`retry-${index}`}
          onClick={onRetry}
          style={{
            fontSize: "0.68rem",
            padding: "2px 8px",
            border: `1px solid ${BORDER}`,
            background: "transparent",
            color: MID,
            borderRadius: 3,
            cursor: "pointer",
            fontFamily: SANS,
          }}
        >
          retry
        </button>
      )}
    </div>
  );
}
