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
        </div>
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
                  <Td>{p.contactName ? `${p.contactName}${p.contactRole ? ` (${p.contactRole})` : ""}` : "—"}</Td>
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
