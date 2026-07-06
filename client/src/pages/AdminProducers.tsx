/**
 * /admin/producers — AU + NZ winery directory (A2).
 *
 * Powers the future 3-touch cold-email engine. Operator workflow:
 *   1. Click "Seed 10 sample" to populate the pipeline with real
 *      AU + NZ wineries for testing.
 *   2. OR drop a CSV in (Name, Country, Region, Website, Email,
 *      ContactName, ContactRole, SizeBracket) — dedupes on
 *      (name + country) so re-imports are safe.
 *   3. Review the pipeline board: untouched → touch 1/2/3 → replied
 *      / booked / opted_out.
 *   4. Advance status manually per row (touch 1 sent etc.) — future
 *      A3 (Resend cron) will do this automatically.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";
const AMBER = "var(--ow-amber)";
const BORDER = "var(--ow-border)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const CARD = "var(--ow-bg-card)";

type Row = {
  name: string;
  country: "AU" | "NZ";
  region?: string;
  website?: string;
  email?: string;
  contactName?: string;
  contactRole?: string;
  sizeBracket?: "boutique" | "mid" | "large";
};

/** Parse a CSV blob. Deliberately hand-rolled: keeps the dep count zero
 *  and handles the two edge cases (quoted commas, trailing newline). */
function parseCsv(text: string): { headers: string[]; rows: Row[]; errors: string[] } {
  const errors: string[] = [];
  const rows: Row[] = [];
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows, errors: ["File is empty"] };
  const headers = splitCsvLine(lines[0]).map((h) => h.trim().toLowerCase());
  const need = ["name", "country"];
  for (const n of need) {
    if (!headers.includes(n)) errors.push(`Missing required column: ${n}`);
  }
  if (errors.length > 0) return { headers, rows, errors };
  for (let i = 1; i < lines.length; i += 1) {
    const cells = splitCsvLine(lines[i]);
    const record: Record<string, string> = {};
    headers.forEach((h, idx) => {
      record[h] = (cells[idx] ?? "").trim();
    });
    const country = record.country?.toUpperCase();
    if (country !== "AU" && country !== "NZ") {
      errors.push(`Row ${i + 1}: country must be AU or NZ (got "${record.country}")`);
      continue;
    }
    if (!record.name) {
      errors.push(`Row ${i + 1}: name is empty`);
      continue;
    }
    const size = record.sizebracket || record["size_bracket"] || record["size bracket"] || "";
    const sizeNorm = ["boutique", "mid", "large"].includes(size.toLowerCase())
      ? (size.toLowerCase() as "boutique" | "mid" | "large")
      : undefined;
    rows.push({
      name: record.name,
      country: country as "AU" | "NZ",
      region: record.region || undefined,
      website: record.website || record.url || undefined,
      email: record.email || undefined,
      contactName: record.contactname || record["contact_name"] || record["contact name"] || undefined,
      contactRole: record.contactrole || record["contact_role"] || record["contact role"] || undefined,
      sizeBracket: sizeNorm,
    });
  }
  return { headers, rows, errors };
}

function splitCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i];
    if (ch === '"' && line[i + 1] === '"') {
      cur += '"';
      i += 1;
    } else if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

export default function AdminProducers() {
  const utils = trpc.useUtils();
  const { data: stats } = trpc.producers.stats.useQuery();
  const [country, setCountry] = useState<"AU" | "NZ" | "all">("all");
  const { data: listData, isLoading } = trpc.producers.list.useQuery(
    country === "all" ? undefined : { country }
  );
  const seedMutation = trpc.producers.seedSample.useMutation();
  const bulkImport = trpc.producers.bulkImport.useMutation();
  const updateStatus = trpc.producers.updateStatus.useMutation();
  const removeMut = trpc.producers.remove.useMutation();
  const enrichMut = trpc.producers.enrichContact.useMutation();
  const needsEnrichQ = trpc.producers.needsEnrichment.useQuery();
  const bootstrapMut = trpc.producers.bootstrapRegion.useMutation();

  // Region bootstrap state — the review panel between LLM output and DB insert.
  const [bootstrapRegion, setBootstrapRegion] = useState("");
  const [bootstrapCountry, setBootstrapCountry] = useState<"AU" | "NZ">("AU");
  const [bootstrapPreview, setBootstrapPreview] = useState<
    | null
    | {
        source: string;
        candidates: Array<{
          name: string;
          country: "AU" | "NZ";
          region: string;
          website?: string;
          description?: string;
          alreadyInDb: boolean;
          selected: boolean;
        }>;
      }
  >(null);

  // Batch enrichment state
  const [batchState, setBatchState] = useState<
    | { phase: "idle" }
    | { phase: "running"; current: number; total: number; currentName: string; found: number; skipped: number; failed: number }
    | { phase: "done"; total: number; found: number; skipped: number; failed: number }
  >({ phase: "idle" });
  const [rowEnriching, setRowEnriching] = useState<number | null>(null);

  // Compose modal — pre-fills a personalized draft using enriched data and
  // opens it either in the operator's default mail client (mailto:) or on
  // the clipboard. NEVER sends anything — this is deliberately manual
  // because a hand-touched send from Rich's own inbox out-performs any
  // automated sequence for a 21-prospect cohort. Preview URL is baked into
  // the templates so a click from the recipient hits /hi/producers/:id.
  const [composeFor, setComposeFor] = useState<
    | null
    | {
        id: number;
        name: string;
        region: string | null;
        country: "AU" | "NZ";
        email: string;
        contactName: string;
        contactRole: string | null;
      }
  >(null);

  const [preview, setPreview] = useState<Row[] | null>(null);
  const [previewErrors, setPreviewErrors] = useState<string[]>([]);
  const [previewSource, setPreviewSource] = useState<string>("csv_upload");
  const [csvText, setCsvText] = useState<string>("");

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setPreviewSource(f.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      setCsvText(text);
      const parsed = parseCsv(text);
      setPreview(parsed.rows);
      setPreviewErrors(parsed.errors);
    };
    reader.readAsText(f);
  }

  async function doImport() {
    if (!preview || preview.length === 0) return;
    await bulkImport.mutateAsync({ source: previewSource, producers: preview });
    setPreview(null);
    setCsvText("");
    setPreviewErrors([]);
    utils.producers.list.invalidate();
    utils.producers.stats.invalidate();
  }

  /**
   * Bootstrap a region — hits Perplexity Sonar Pro for a candidate list
   * of ~25 wineries. Returned to the preview panel; NOT committed yet.
   * User toggles selected, then clicks Import.
   */
  async function runBootstrap() {
    if (bootstrapRegion.trim().length < 2) return;
    try {
      const result = await bootstrapMut.mutateAsync({
        region: bootstrapRegion.trim(),
        country: bootstrapCountry,
        limit: 25,
        focus: "boutique",
      });
      setBootstrapPreview({
        source: result.source,
        candidates: result.candidates.map((c) => ({
          ...c,
          country: c.country as "AU" | "NZ",
          selected: !c.alreadyInDb, // pre-select only new ones
        })),
      });
    } catch (err) {
      alert(`Bootstrap failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function commitBootstrap() {
    if (!bootstrapPreview) return;
    const rows = bootstrapPreview.candidates
      .filter((c) => c.selected && !c.alreadyInDb)
      .map((c) => ({ name: c.name, country: c.country, region: c.region, website: c.website }));
    if (rows.length === 0) return;
    await bulkImport.mutateAsync({ source: bootstrapPreview.source, producers: rows });
    setBootstrapPreview(null);
    setBootstrapRegion("");
    utils.producers.list.invalidate();
    utils.producers.stats.invalidate();
    utils.producers.needsEnrichment.invalidate();
  }

  /**
   * Batch-enrich all producers that don't yet have a contactName. We run
   * serially (not Promise.all) because Perplexity Sonar Pro is rate-limited
   * and the shared PERPLEXITY_API_KEY has finite QPS. Between calls we
   * pause 700ms so we're a good citizen. If a single call fails we log and
   * continue — one bad row shouldn't kill the batch.
   */
  async function enrichAll() {
    const queue = needsEnrichQ.data ?? [];
    if (queue.length === 0) return;
    if (!confirm(`Enrich ${queue.length} producer${queue.length === 1 ? "" : "s"} via Perplexity Sonar Pro?\n\nThis takes ~10-20s each (${Math.round((queue.length * 15) / 60)} min total) and consumes your Perplexity credits.`)) return;
    let found = 0;
    let skipped = 0;
    let failed = 0;
    for (let i = 0; i < queue.length; i++) {
      const row = queue[i];
      setBatchState({ phase: "running", current: i + 1, total: queue.length, currentName: row.name, found, skipped, failed });
      try {
        const result = await enrichMut.mutateAsync({ id: row.id });
        if (result.ok && !result.skipped) found++;
        else skipped++;
      } catch {
        failed++;
      }
      // small pause between calls to be nice to the shared API key
      await new Promise((r) => setTimeout(r, 700));
    }
    setBatchState({ phase: "done", total: queue.length, found, skipped, failed });
    utils.producers.list.invalidate();
    utils.producers.needsEnrichment.invalidate();
  }

  async function enrichOne(id: number) {
    setRowEnriching(id);
    try {
      await enrichMut.mutateAsync({ id });
    } catch (err) {
      alert(`Enrichment failed: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setRowEnriching(null);
      utils.producers.list.invalidate();
      utils.producers.needsEnrichment.invalidate();
    }
  }

  return (
    <div data-testid="admin-producers-page" className="container py-8" style={{ maxWidth: 1280 }}>
      <Link href="/admin" style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO }}>
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: AMBER }}>
        Directory · AU + NZ
      </p>
      <h1 className="text-3xl font-semibold mt-1" style={{ color: HI, fontFamily: SERIF }}>
        Wine producers
      </h1>
      <p className="mt-2 mb-6" style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, maxWidth: 720, lineHeight: 1.55 }}>
        The AU + NZ winery pipeline. Foundation for the 3-touch cold-email engine (A3). Drop a CSV, seed sample data, or advance individual rows through the state machine (untouched → touch 1/2/3 → replied → booked).
      </p>

      {/* KPI strip */}
      {stats && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 10, marginBottom: 24 }}>
          <Kpi label="Total" value={String(stats.total)} testid="prod-kpi-total" />
          {stats.byCountry.map((c) => (
            <Kpi key={c.country} label={c.country === "AU" ? "Australia" : "New Zealand"} value={String(c.count)} testid={`prod-kpi-${c.country.toLowerCase()}`} />
          ))}
          {stats.byStatus.map((s) => (
            <Kpi key={s.status} label={s.status.replace(/_/g, " ")} value={String(s.count)} testid={`prod-kpi-status-${s.status}`} />
          ))}
        </div>
      )}

      {/* Import / seed panel */}
      <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1.2rem", marginBottom: 24 }}>
        <p className="text-xs uppercase tracking-widest" style={{ color: LO, fontFamily: SANS, fontWeight: 700 }}>
          Add producers
        </p>
        <h3 style={{ fontFamily: SERIF, fontSize: "1.05rem", color: HI, margin: "4px 0 12px" }}>
          Seed sample data or drop a CSV
        </h3>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
          <button
            type="button"
            data-testid="prod-seed-btn"
            disabled={seedMutation.isPending}
            onClick={async () => {
              await seedMutation.mutateAsync();
              utils.producers.list.invalidate();
              utils.producers.stats.invalidate();
            }}
            style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${AMBER}`, background: AMBER, color: "#111", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
          >
            {seedMutation.isPending ? "Seeding…" : "Seed 10 real AU+NZ wineries →"}
          </button>
          <label
            style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "transparent", color: MID, fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
          >
            <input type="file" accept=".csv,text/csv" onChange={onFile} data-testid="prod-csv-input" style={{ display: "none" }} />
            Upload CSV…
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              data-testid="prod-bootstrap-region"
              type="text"
              value={bootstrapRegion}
              onChange={(e) => setBootstrapRegion(e.target.value)}
              placeholder="Region (e.g. Barossa Valley)"
              style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "var(--ow-bg-inset)", color: HI, fontFamily: SANS, fontSize: "0.82rem", minWidth: 180 }}
            />
            <select
              data-testid="prod-bootstrap-country"
              value={bootstrapCountry}
              onChange={(e) => setBootstrapCountry(e.target.value as "AU" | "NZ")}
              style={{ padding: "6px 8px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "var(--ow-bg-inset)", color: HI, fontFamily: SANS, fontSize: "0.82rem" }}
            >
              <option value="AU">AU</option>
              <option value="NZ">NZ</option>
            </select>
            <button
              type="button"
              data-testid="prod-bootstrap-btn"
              disabled={bootstrapMut.isPending || bootstrapRegion.trim().length < 2}
              onClick={runBootstrap}
              style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "color-mix(in oklch, gold 12%, transparent)", color: HI, fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: bootstrapMut.isPending ? "wait" : "pointer" }}
            >
              {bootstrapMut.isPending ? "Asking Perplexity…" : "▶ Bootstrap region (Perplexity)"}
            </button>
          </div>
          {(needsEnrichQ.data?.length ?? 0) > 0 && (
            <button
              type="button"
              data-testid="prod-enrich-all-btn"
              disabled={batchState.phase === "running"}
              onClick={enrichAll}
              style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "color-mix(in oklch, white 4%, transparent)", color: HI, fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: batchState.phase === "running" ? "wait" : "pointer" }}
            >
              {batchState.phase === "running"
                ? `Enriching ${batchState.current}/${batchState.total}…`
                : `▶ Enrich ${needsEnrichQ.data?.length} missing contact${needsEnrichQ.data?.length === 1 ? "" : "s"} (Perplexity)`}
            </button>
          )}
        </div>
        {batchState.phase === "running" && (
          <div data-testid="prod-enrich-progress" style={{ marginTop: 12, padding: "10px 14px", background: "color-mix(in oklch, gold 8%, transparent)", border: `1px solid ${AMBER}`, borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", color: HI }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 6 }}>
              <span>Enriching <strong>{batchState.currentName}</strong>… ({batchState.current}/{batchState.total})</span>
              <span style={{ color: MID }}>found <strong style={{ color: "#059669" }}>{batchState.found}</strong> · skipped {batchState.skipped} · failed {batchState.failed}</span>
            </div>
            <div style={{ height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
              <div style={{ width: `${(batchState.current / batchState.total) * 100}%`, height: "100%", background: AMBER, transition: "width 0.3s" }} />
            </div>
          </div>
        )}
        {batchState.phase === "done" && (
          <div data-testid="prod-enrich-done" style={{ marginTop: 12, padding: "8px 14px", background: "color-mix(in oklch, forestgreen 8%, transparent)", border: `1px solid #059669`, borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", color: HI }}>
            ✓ Enrichment run complete — <strong>{batchState.found}</strong> contacts found · {batchState.skipped} skipped (no data) · {batchState.failed} failed
          </div>
        )}
        {bootstrapPreview && (
          <div data-testid="bootstrap-preview" style={{ marginTop: 12, padding: "14px 16px", background: CARD, border: `1px solid ${AMBER}`, borderRadius: 6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 8 }}>
              <div>
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.1em", color: AMBER, textTransform: "uppercase", margin: 0, fontWeight: 700 }}>
                  Perplexity candidates · {bootstrapPreview.source}
                </p>
                <p style={{ fontFamily: SANS, color: MID, fontSize: "0.82rem", margin: "4px 0 0" }}>
                  {bootstrapPreview.candidates.length} returned · {bootstrapPreview.candidates.filter((c) => c.selected).length} selected · {bootstrapPreview.candidates.filter((c) => c.alreadyInDb).length} already in DB
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  data-testid="bootstrap-import"
                  onClick={commitBootstrap}
                  disabled={bulkImport.isPending || bootstrapPreview.candidates.filter((c) => c.selected && !c.alreadyInDb).length === 0}
                  style={{ padding: "6px 14px", borderRadius: 4, border: "none", background: AMBER, color: "#111", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, cursor: "pointer" }}
                >
                  {bulkImport.isPending ? "Importing…" : `▶ Import ${bootstrapPreview.candidates.filter((c) => c.selected && !c.alreadyInDb).length} selected`}
                </button>
                <button
                  type="button"
                  data-testid="bootstrap-cancel"
                  onClick={() => setBootstrapPreview(null)}
                  style={{ padding: "6px 10px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "transparent", color: MID, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.78rem", marginTop: 6 }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: LO, fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, width: 40 }}>✓</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: LO, fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Winery</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: LO, fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Sub-region</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: LO, fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Website</th>
                  <th style={{ padding: "4px 8px", textAlign: "left", color: LO, fontSize: "0.66rem", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700 }}>Note</th>
                </tr>
              </thead>
              <tbody>
                {bootstrapPreview.candidates.map((c, i) => (
                  <tr key={i} data-testid={`bootstrap-row-${i}`} style={{ borderBottom: `1px solid ${BORDER}`, opacity: c.alreadyInDb ? 0.5 : 1 }}>
                    <td style={{ padding: "6px 8px" }}>
                      <input
                        type="checkbox"
                        data-testid={`bootstrap-check-${i}`}
                        checked={c.selected}
                        disabled={c.alreadyInDb}
                        onChange={() =>
                          setBootstrapPreview((prev) =>
                            prev ? { ...prev, candidates: prev.candidates.map((x, j) => (j === i ? { ...x, selected: !x.selected } : x)) } : prev
                          )
                        }
                      />
                    </td>
                    <td style={{ padding: "6px 8px", color: HI, fontWeight: 600 }}>
                      {c.name}
                      {c.alreadyInDb && <span style={{ marginLeft: 6, fontSize: "0.66rem", color: LO }}>· in DB</span>}
                    </td>
                    <td style={{ padding: "6px 8px", color: MID }}>{c.region}</td>
                    <td style={{ padding: "6px 8px" }}>
                      {c.website ? (
                        <a href={c.website} target="_blank" rel="noreferrer" style={{ color: AMBER, textDecoration: "none" }}>
                          {c.website.replace(/^https?:\/\/(www\.)?/, "").slice(0, 32)}
                        </a>
                      ) : (
                        <span style={{ color: LO }}>—</span>
                      )}
                    </td>
                    <td style={{ padding: "6px 8px", color: LO, fontStyle: "italic" }}>{c.description ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <details style={{ marginBottom: 8 }}>
          <summary style={{ cursor: "pointer", fontFamily: SANS, fontSize: "0.78rem", color: LO }}>
            CSV format
          </summary>
          <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: MID, background: "color-mix(in oklch, white 4%, transparent)", padding: 10, borderRadius: 4, marginTop: 6, overflowX: "auto" }}>
{`name,country,region,website,email,contactName,contactRole,sizeBracket
Yalumba,AU,Barossa Valley,https://yalumba.com,info@yalumba.com,,GM,mid
Cloudy Bay,NZ,Marlborough,https://cloudybay.co.nz,,Nick Blampied,winemaker,mid
...`}
          </pre>
          <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: LO, margin: "6px 0 0" }}>
            Required: name, country (AU or NZ). Everything else optional. Duplicates (same name + country) are skipped automatically.
          </p>
        </details>
        {preview && (
          <div data-testid="prod-preview" style={{ marginTop: 12, padding: "10px 12px", background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: `1px solid ${BORDER}`, borderRadius: 4 }}>
            <p style={{ margin: 0, fontFamily: SANS, fontSize: "0.85rem", color: HI }}>
              <strong>{preview.length} rows ready.</strong> Source: {previewSource}
            </p>
            {previewErrors.length > 0 && (
              <ul style={{ margin: "6px 0 0 16px", fontFamily: SANS, fontSize: "0.72rem", color: "#ef4444" }}>
                {previewErrors.slice(0, 5).map((e) => (
                  <li key={e}>{e}</li>
                ))}
                {previewErrors.length > 5 && <li>… and {previewErrors.length - 5} more</li>}
              </ul>
            )}
            <div style={{ marginTop: 8, display: "flex", gap: 8 }}>
              <button
                type="button"
                data-testid="prod-import-btn"
                onClick={doImport}
                disabled={bulkImport.isPending || preview.length === 0}
                style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${AMBER}`, background: AMBER, color: "#111", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
              >
                {bulkImport.isPending ? "Importing…" : `Import ${preview.length} →`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setPreview(null);
                  setCsvText("");
                  setPreviewErrors([]);
                }}
                style={{ padding: "6px 14px", borderRadius: 4, border: `1px solid ${BORDER}`, background: "transparent", color: MID, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer" }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
        {bulkImport.isSuccess && bulkImport.data && (
          <p data-testid="prod-import-result" style={{ margin: "8px 0 0", fontFamily: SANS, fontSize: "0.82rem", color: "#10b981" }}>
            ✓ Imported {bulkImport.data.inserted} · Skipped {bulkImport.data.skipped} (duplicates)
          </p>
        )}
        {csvText.length > 0 && !preview && (
          <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: LO, margin: "6px 0 0" }}>
            Parsing… {csvText.slice(0, 60)}…
          </p>
        )}
      </div>

      {/* Filter + list */}
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        {(["all", "AU", "NZ"] as const).map((c) => (
          <button
            key={c}
            type="button"
            data-testid={`prod-filter-${c}`}
            onClick={() => setCountry(c)}
            style={{ padding: "4px 12px", borderRadius: 999, border: `1px solid ${country === c ? AMBER : BORDER}`, background: country === c ? "color-mix(in oklch, var(--ow-amber) 22%, transparent)" : "transparent", color: country === c ? HI : MID, fontFamily: SANS, fontSize: "0.78rem", fontWeight: country === c ? 700 : 500, cursor: "pointer" }}
          >
            {c === "all" ? "All" : c}
          </button>
        ))}
      </div>

      {isLoading && <p style={{ fontFamily: SANS, color: LO }}>Loading…</p>}
      {listData && listData.producers.length === 0 && (
        <p data-testid="prod-empty" style={{ fontFamily: SANS, fontSize: "0.85rem", color: LO, fontStyle: "italic" }}>
          No producers yet. Click <strong>Seed 10 real AU+NZ wineries</strong> above to populate the pipeline.
        </p>
      )}
      {listData && listData.producers.length > 0 && (
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.82rem" }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                <Th>Name</Th>
                <Th>Region</Th>
                <Th>Country</Th>
                <Th>Website</Th>
                <Th>Email</Th>
                <Th>Contact</Th>
                <Th>Status</Th>
                <Th>Touches</Th>
                <Th>Action</Th>
              </tr>
            </thead>
            <tbody>
              {listData.producers.map((p) => (
                <tr key={p.id} data-testid={`prod-row-${p.id}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Td><strong style={{ color: HI }}>{p.name}</strong></Td>
                  <Td>{p.region ?? "—"}</Td>
                  <Td>{p.country}</Td>
                  <Td>{p.website ? <a href={p.website} target="_blank" rel="noreferrer" style={{ color: AMBER, textDecoration: "none" }}>{p.website.replace(/^https?:\/\//, "")}</a> : "—"}</Td>
                  <Td>{p.email ?? "—"}</Td>
                  <Td>
                    {p.contactName ? (
                      <div style={{ display: "flex", gap: 8, alignItems: "baseline", flexWrap: "wrap" }}>
                        <span>{p.contactName}{p.contactRole ? ` (${p.contactRole})` : ""}</span>
                        {p.email && (
                          <button
                            type="button"
                            data-testid={`prod-compose-${p.id}`}
                            onClick={() =>
                              setComposeFor({
                                id: p.id,
                                name: p.name,
                                region: p.region ?? null,
                                country: p.country,
                                email: p.email!,
                                contactName: p.contactName!,
                                contactRole: p.contactRole ?? null,
                              })
                            }
                            style={{ background: "transparent", border: "none", color: AMBER, fontFamily: SANS, fontSize: "0.7rem", cursor: "pointer", textDecoration: "underline dotted", padding: 0 }}
                          >
                            ▶ Compose
                          </button>
                        )}
                      </div>
                    ) : (
                      <button
                        type="button"
                        data-testid={`prod-enrich-${p.id}`}
                        disabled={rowEnriching === p.id || batchState.phase === "running"}
                        onClick={() => enrichOne(p.id)}
                        style={{ background: "transparent", border: "none", color: rowEnriching === p.id ? LO : AMBER, fontFamily: SANS, fontSize: "0.75rem", cursor: rowEnriching === p.id ? "wait" : "pointer", textDecoration: "underline dotted", padding: 0 }}
                      >
                        {rowEnriching === p.id ? "Enriching…" : "Enrich →"}
                      </button>
                    )}
                  </Td>
                  <Td>
                    <select
                      data-testid={`prod-status-${p.id}`}
                      value={p.outreachStatus}
                      onChange={async (e) => {
                        await updateStatus.mutateAsync({
                          id: p.id,
                          status: e.target.value as "untouched" | "touch_1_sent" | "touch_2_sent" | "touch_3_sent" | "replied" | "booked" | "opted_out",
                        });
                        utils.producers.list.invalidate();
                        utils.producers.stats.invalidate();
                      }}
                      style={{ background: CARD, color: HI, border: `1px solid ${BORDER}`, borderRadius: 3, padding: "3px 6px", fontFamily: SANS, fontSize: "0.75rem" }}
                    >
                      {["untouched", "touch_1_sent", "touch_2_sent", "touch_3_sent", "replied", "booked", "opted_out"].map((s) => (
                        <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
                      ))}
                    </select>
                  </Td>
                  <Td>{p.touchCount}</Td>
                  <Td>
                    <button
                      type="button"
                      data-testid={`prod-remove-${p.id}`}
                      onClick={async () => {
                        if (!confirm(`Remove ${p.name}?`)) return;
                        await removeMut.mutateAsync({ id: p.id });
                        utils.producers.list.invalidate();
                        utils.producers.stats.invalidate();
                      }}
                      style={{ background: "transparent", border: "none", color: LO, fontFamily: SANS, fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline dotted" }}
                    >
                      Remove
                    </button>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {composeFor && <ComposeModal producer={composeFor} onClose={() => setComposeFor(null)} />}
    </div>
  );
}

// ── Compose modal ─────────────────────────────────────────────────────────
// Three deliberately different template variants. Each substitutes {first},
// {winery}, {region}, {previewUrl}, {countryLabel}. Rich reviews + edits in
// the modal, then either copies to clipboard or launches mailto: — so the
// email leaves from HIS inbox with HIS reputation, not an automated sender.
type ComposeProducer = {
  id: number;
  name: string;
  region: string | null;
  country: "AU" | "NZ";
  email: string;
  contactName: string;
  contactRole: string | null;
};

type TemplateKey = "brief_demo" | "vintage_intro" | "peer_share";

const TEMPLATES: Record<
  TemplateKey,
  { label: string; subject: (p: ComposeProducer) => string; body: (p: ComposeProducer, previewUrl: string) => string }
> = {
  brief_demo: {
    label: "Cellar Brief demo",
    subject: (p) => `${p.contactName.split(" ")[0]} — a Monday morning brief for ${p.name}`,
    body: (p, url) => {
      const first = p.contactName.split(" ")[0];
      const region = p.region ?? (p.country === "NZ" ? "New Zealand" : "Australia");
      return `Hi ${first},

I built a plausible preview of what an Ownology Cellar Brief could look like for ${p.name} on a Monday morning during vintage — no data entry, just synthesized from your existing lab logs and tank sheets.

Quick look (30 seconds, no login): ${url}

The cards are a ${region} template at your scale — your real cellar would replace them with your actual vessels. If it's off-target I'd rather know than not.

Happy to walk you through the real thing on a 20-min call if it's useful.

Cheers,
Rich
Ownology`;
    },
  },
  vintage_intro: {
    label: "Vintage-log intro",
    subject: (p) => `Vintage log tool — thought of ${p.name}`,
    body: (p, url) => {
      const first = p.contactName.split(" ")[0];
      const role = p.contactRole?.toLowerCase() ?? "team";
      return `Hi ${first},

Short one — I've been building a vintage log tool aimed at boutique winemakers who don't have time to babysit spreadsheets. ${p.contactRole?.includes("Winemaker") ? `As ${p.name}'s ${role}` : `At ${p.name}`}, you're exactly the operator I've been designing for.

Rough sketch of what your Monday brief could look like: ${url}

Would 20 mins on a call in the next week or two be useful? I'd rather learn what breaks than pitch.

Cheers,
Rich
Ownology`;
    },
  },
  peer_share: {
    label: "Peer share (soft)",
    subject: (p) => `Something for ${p.name}'s cellar`,
    body: (p, url) => {
      const first = p.contactName.split(" ")[0];
      return `Hi ${first},

I've been building something in the winemaker-ops space and wanted to share a preview I made specifically for ${p.name}: ${url}

It's a mock-up of a daily Cellar Brief, region-tuned. Zero data-collection until you actually connect anything — it's just a preview.

If it looks useful, reply and I'll set up a real demo. If not, delete this and no hard feelings.

Cheers,
Rich
Ownology`;
    },
  },
};

function ComposeModal({ producer, onClose }: { producer: ComposeProducer; onClose: () => void }) {
  const [templateKey, setTemplateKey] = useState<TemplateKey>("brief_demo");
  const previewUrl = `${window.location.origin}/hi/producers/${producer.id}`;
  const template = TEMPLATES[templateKey];
  const [subject, setSubject] = useState(template.subject(producer));
  const [body, setBody] = useState(template.body(producer, previewUrl));
  const [copied, setCopied] = useState<"none" | "body" | "all">("none");

  // Re-generate copy when the user swaps templates.
  const swapTemplate = (k: TemplateKey) => {
    setTemplateKey(k);
    setSubject(TEMPLATES[k].subject(producer));
    setBody(TEMPLATES[k].body(producer, previewUrl));
    setCopied("none");
  };

  const mailtoHref = `mailto:${encodeURIComponent(producer.email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

  const copyBody = async () => {
    await navigator.clipboard.writeText(body);
    setCopied("body");
    setTimeout(() => setCopied("none"), 2000);
  };
  const copyAll = async () => {
    await navigator.clipboard.writeText(`To: ${producer.email}\nSubject: ${subject}\n\n${body}`);
    setCopied("all");
    setTimeout(() => setCopied("none"), 2000);
  };

  return (
    <div
      data-testid="compose-modal"
      onClick={(e) => e.target === e.currentTarget && onClose()}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in oklch, black 55%, transparent)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: "40px 20px",
        zIndex: 100,
        overflow: "auto",
      }}
    >
      <div
        style={{
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 12,
          width: "100%",
          maxWidth: 720,
          padding: "22px 24px",
          boxShadow: "0 20px 60px color-mix(in oklch, black 40%, transparent)",
        }}
      >
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
          <div>
            <p style={{ fontFamily: SANS, fontSize: "0.68rem", letterSpacing: "0.12em", color: AMBER, textTransform: "uppercase", margin: 0 }}>Compose personalized email</p>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.35rem", color: HI, margin: "4px 0 0" }}>
              {producer.contactName} · {producer.name}
            </h2>
          </div>
          <button
            type="button"
            data-testid="compose-close"
            onClick={onClose}
            style={{ background: "transparent", border: "none", color: LO, fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}
            aria-label="Close"
          >
            ×
          </button>
        </header>

        {/* Template picker */}
        <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
          {(Object.keys(TEMPLATES) as TemplateKey[]).map((k) => (
            <button
              key={k}
              type="button"
              data-testid={`compose-template-${k}`}
              onClick={() => swapTemplate(k)}
              style={{
                fontFamily: SANS,
                fontSize: "0.72rem",
                padding: "5px 12px",
                borderRadius: 999,
                border: templateKey === k ? `1px solid ${AMBER}` : `1px solid ${BORDER}`,
                background: templateKey === k ? "color-mix(in oklch, gold 12%, transparent)" : "transparent",
                color: templateKey === k ? HI : MID,
                fontWeight: templateKey === k ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {TEMPLATES[k].label}
            </button>
          ))}
        </div>

        {/* To */}
        <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 8, fontFamily: SANS, fontSize: "0.75rem", color: MID }}>
          <span style={{ letterSpacing: "0.08em", textTransform: "uppercase", color: LO, minWidth: 60, fontSize: "0.65rem", fontWeight: 700 }}>To</span>
          <span data-testid="compose-to" style={{ color: HI }}>{producer.email}</span>
        </div>

        {/* Subject */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>
            Subject
          </label>
          <input
            data-testid="compose-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            style={{ display: "block", width: "100%", padding: "8px 10px", marginTop: 4, background: "var(--ow-bg-inset)", border: `1px solid ${BORDER}`, borderRadius: 6, color: HI, fontFamily: SANS, fontSize: "0.85rem" }}
          />
        </div>

        {/* Body */}
        <div style={{ marginBottom: 10 }}>
          <label style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>
            Body — edit before sending
          </label>
          <textarea
            data-testid="compose-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={14}
            style={{ display: "block", width: "100%", padding: "10px 12px", marginTop: 4, background: "var(--ow-bg-inset)", border: `1px solid ${BORDER}`, borderRadius: 6, color: HI, fontFamily: SANS, fontSize: "0.85rem", lineHeight: 1.5, resize: "vertical" }}
          />
          <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: LO, marginTop: 6 }}>
            Preview URL <a href={previewUrl} target="_blank" rel="noreferrer" style={{ color: AMBER, textDecoration: "none" }}>{previewUrl}</a> is baked into every template.
          </p>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 16 }}>
          <a
            data-testid="compose-open-mail"
            href={mailtoHref}
            onClick={onClose}
            style={{ padding: "8px 18px", background: AMBER, color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, borderRadius: 4, textDecoration: "none", letterSpacing: "0.02em" }}
          >
            ▶ Open in mail app
          </a>
          <button
            type="button"
            data-testid="compose-copy-body"
            onClick={copyBody}
            style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${BORDER}`, color: MID, fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, borderRadius: 4, cursor: "pointer" }}
          >
            {copied === "body" ? "✓ Copied" : "Copy body"}
          </button>
          <button
            type="button"
            data-testid="compose-copy-all"
            onClick={copyAll}
            style={{ padding: "8px 14px", background: "transparent", border: `1px solid ${BORDER}`, color: MID, fontFamily: SANS, fontSize: "0.82rem", fontWeight: 600, borderRadius: 4, cursor: "pointer" }}
          >
            {copied === "all" ? "✓ Copied To+Subject+Body" : "Copy all (To/Subject/Body)"}
          </button>
        </div>

        <p style={{ marginTop: 14, fontFamily: SANS, fontSize: "0.7rem", color: LO }}>
          Ownology never sends this for you. Your inbox, your reputation, your handwritten voice — that&apos;s the whole point.
        </p>
      </div>
    </div>
  );
}

function Kpi({ label, value, testid }: { label: string; value: string; testid: string }) {
  return (
    <div data-testid={testid} style={{ padding: "0.7rem 1rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
      <p style={{ fontFamily: SANS, fontSize: "0.62rem", color: LO, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 4px" }}>
        {label}
      </p>
      <p style={{ fontFamily: SERIF, fontSize: "1.3rem", color: HI, margin: 0, lineHeight: 1 }}>
        {value}
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: SANS, fontSize: "0.68rem", color: LO, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "6px 8px", color: MID }}>
      {children}
    </td>
  );
}
