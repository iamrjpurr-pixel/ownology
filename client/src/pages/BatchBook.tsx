/**
 * BatchBook — the live browser rendering of the Cellar Book (per-batch
 * equipment traceability). Same content as /api/compliance/cellar-book.pdf,
 * no download required. Mounted on TWO routes:
 *
 *   /b/:token                        — public token-scoped view for auditors
 *                                      and buyers (uses cellarBoard.getBatchBookByToken)
 *   /admin/batch-book/:batchId       — auth-scoped self-serve for the
 *                                      winemaker (uses cellarBoard.getBatchBook)
 *
 * Design goals: mobile-friendly, printable (see @media print rules), and
 * lets the recipient download the same PDF with one click. The brand
 * colour comes from the winery record so an auditor immediately sees who
 * generated the record — no chance of mistaken-identity provenance.
 */
import { useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useEffect } from "react";

const PHASE_LABEL: Record<string, string> = {
  receival: "1. Receival",
  crushing: "2. Crushing",
  fermentation: "3. Fermentation",
  pressing_transfer: "4. Pressing & Transfer",
  storage_ageing: "5. Storage & Ageing",
  bottling: "6. Bottling",
  other: "Other",
};

const DIRECTION_LABEL: Record<string, string> = {
  in: "In",
  out: "Out",
  pass: "Pass-through",
  note: "Note",
};

type UseRow = {
  id: number;
  usedAt: number;
  phase: string;
  direction: string;
  equipmentId: number;
  equipmentName: string;
  equipmentType: string | null;
  equipmentMaterial: string | null;
  sanitiseOkAtUse: number;
  sanitiseAgeHours: number | null;
  notes: string | null;
};

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleString("en-AU", { dateStyle: "medium", timeStyle: "short" });
}

function fmtDate(ms: number | null | undefined): string {
  if (!ms) return "—";
  return new Date(ms).toLocaleDateString("en-AU", { day: "2-digit", month: "short", year: "numeric" });
}

// ─── Public token-scoped variant ──────────────────────────────────────────
export function BatchBookByToken() {
  const params = useParams<{ token: string }>();
  const token = params?.token ?? "";
  const q = trpc.cellarBoard.getBatchBookByToken.useQuery(
    { token },
    { enabled: token.length > 0, retry: false }
  );

  useEffect(() => {
    // Give the tab a proper title once we know the batch.
    if (q.data && "payload" in q.data && q.data.ok) {
      document.title = `Cellar Book — ${q.data.payload.batch.batchId} · ${q.data.payload.winery.name}`;
    } else {
      document.title = "Cellar Book — Ownology";
    }
  }, [q.data]);

  if (q.isLoading) return <BatchBookSkeleton />;
  if (q.isError || !q.data) return <BatchBookError message="Could not load this Cellar Book. The link may be invalid." />;
  if (!q.data.ok) {
    const msg =
      q.data.status === "revoked" ? "This Cellar Book link has been revoked by the winemaker."
      : q.data.status === "expired" ? "This Cellar Book link has expired. Ask the winemaker for a fresh one."
      : "This Cellar Book link is invalid.";
    return <BatchBookError message={msg} />;
  }
  return (
    <BatchBookLayout
      payload={q.data.payload}
      pdfHref={`/api/compliance/cellar-book.pdf?token=${token}`}
      shareContext={q.data.token ? { label: q.data.token.label, expiresAt: q.data.token.expiresAt } : null}
    />
  );
}

// ─── Auth-scoped variant (winemaker's own dashboard use) ─────────────────
export function BatchBookByBatchId() {
  const params = useParams<{ batchId: string }>();
  const batchId = Number(params?.batchId ?? 0);
  const q = trpc.cellarBoard.getBatchBook.useQuery(
    { batchId },
    { enabled: Number.isFinite(batchId) && batchId > 0 }
  );

  useEffect(() => {
    if (q.data) document.title = `Cellar Book — ${q.data.batch.batchId} · ${q.data.winery.name}`;
  }, [q.data]);

  if (q.isLoading) return <BatchBookSkeleton />;
  if (q.isError || !q.data) return <BatchBookError message="Could not load this batch. It may not exist or belong to another account." />;
  return (
    <BatchBookLayout
      payload={q.data}
      pdfHref={`/api/compliance/cellar-book.pdf?batchId=${batchId}`}
      shareContext={null}
    />
  );
}

// ─── Shared layout ────────────────────────────────────────────────────────
function BatchBookLayout({
  payload,
  pdfHref,
  shareContext,
}: {
  payload: {
    winery: { name: string; region: string | null; brandColor: string; logoUrl: string | null };
    batch: {
      id: number; batchId: string; vintage: number; variety: string; gi: string | null;
      growerDetails: string | null; tankName: string | null; quantityValue: string | null;
      quantityUnit: string | null; volumeLitres: number | null; receivedAt: number | null;
    };
    uses: UseRow[];
    summary: { totalUses: number; uniqueVessels: number; sanitisedAtUseCount: number; breachCount: number };
    generatedAt: number;
  };
  pdfHref: string;
  shareContext: { label: string | null; expiresAt: number } | null;
}) {
  const { winery, batch, uses, summary, generatedAt } = payload;

  return (
    <div data-testid="batch-book-page" className="bb-root" style={{ minHeight: "100dvh", background: "#f8f6f0", padding: "24px 16px 48px", fontFamily: "'Lato', system-ui, sans-serif" }}>
      <style>{`
        /* ── Print stylesheet ──────────────────────────────────────────
           Goal: Cmd+P → Save-as-PDF from the browser produces a layout
           that matches the pdfkit-generated /api/compliance/cellar-book.pdf
           closely enough that a winemaker can pick either path and get an
           audit-defensible artefact. Highlights:
             * Hide interactive UI (no-print class covers Download / attrib)
             * Force brand colours to print (Chrome strips backgrounds by
               default — print-color-adjust: exact overrides that)
             * A4 page size with a comfortable 15mm margin
             * No shadows, no rounded corners — clean paper aesthetic
             * Force text sizes to points so line-height renders reliably
             * Keep individual event rows together (page-break-inside)
             * Repeat the Attestation on the last page only (natural flow) */
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          html, body {
            background: #fff !important;
            color: #000;
            font-size: 10pt;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print { display: none !important; }
          .bb-root { padding: 0 !important; background: #fff !important; }
          .bb-card {
            max-width: none !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
          }
          .bb-brand-bar {
            /* Chrome by default strips the top-band brand colour — force it. */
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bb-share-banner { display: none !important; } /* internal-only context */
          .bb-summary-cell {
            background: #f5f5f2 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bb-use-row {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .bb-attestation {
            page-break-before: auto;
            background: #f9f9f6 !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .bb-footer-attrib { display: none !important; }
          h1, h2, h3, h4 {
            page-break-after: avoid;
            break-after: avoid;
          }
          a[href], a[href]:visited {
            color: inherit !important;
            text-decoration: none !important;
          }
        }
      `}</style>

      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        {shareContext && (
          <div
            data-testid="batch-book-share-banner"
            className="no-print bb-share-banner"
            style={{ padding: "8px 14px", background: "#fef7e0", border: "1px solid #f0d780", borderRadius: 6, fontSize: 13, color: "#78350f", marginBottom: 18 }}
          >
            You are viewing a shared Cellar Book{shareContext.label ? ` — ${shareContext.label}` : ""}. Link expires {fmtDate(shareContext.expiresAt)}.
          </div>
        )}

        <div className="bb-card" style={{ background: "#fff", borderRadius: 10, boxShadow: "0 4px 20px rgba(0,0,0,0.06)", overflow: "hidden" }}>
          {/* ── Header ── */}
          <div className="bb-brand-bar" style={{ borderTop: `6px solid ${winery.brandColor}`, padding: "24px 28px 20px", display: "flex", alignItems: "center", gap: 16 }}>
            {winery.logoUrl && (
              <img
                src={winery.logoUrl}
                alt=""
                style={{ width: 56, height: 56, objectFit: "contain", borderRadius: 6 }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              />
            )}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div data-testid="batch-book-winery-name" style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: winery.brandColor, lineHeight: 1.2 }}>
                {winery.name}
              </div>
              <div style={{ fontSize: 13, color: "#6b7280", marginTop: 2 }}>
                Cellar Book — Batch Equipment Traceability
              </div>
            </div>
            <a
              href={pdfHref}
              target="_blank"
              rel="noopener noreferrer"
              className="no-print"
              data-testid="batch-book-download-pdf"
              style={{
                display: "inline-flex", alignItems: "center", gap: 6, padding: "8px 16px",
                borderRadius: 6, background: winery.brandColor, color: "#fff", textDecoration: "none",
                fontSize: 13, fontWeight: 600, whiteSpace: "nowrap",
              }}
            >
              Download PDF
            </a>
          </div>

          {/* ── Batch identity ── */}
          <div style={{ padding: "18px 28px 6px", borderTop: "1px solid #f0eee7" }}>
            <div data-testid="batch-book-batch-header" style={{ fontFamily: "'Fraunces', serif", fontSize: 20, fontWeight: 600, color: "#1f2937", marginBottom: 6 }}>
              Batch {batch.batchId} · {batch.vintage} {batch.variety}
              {batch.gi ? <span style={{ color: "#6b7280", fontWeight: 400 }}> · {batch.gi}</span> : null}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "6px 20px", fontSize: 13, color: "#4b5563", marginTop: 8 }}>
              {winery.region && <div><span style={{ color: "#9ca3af" }}>Winery region: </span>{winery.region}</div>}
              {batch.growerDetails && <div><span style={{ color: "#9ca3af" }}>Grower: </span>{batch.growerDetails}</div>}
              {batch.tankName && <div><span style={{ color: "#9ca3af" }}>Primary tank: </span>{batch.tankName}</div>}
              {batch.quantityValue && (
                <div>
                  <span style={{ color: "#9ca3af" }}>Quantity received: </span>
                  {batch.quantityValue}{batch.quantityUnit ? ` ${batch.quantityUnit}` : ""}
                </div>
              )}
              {batch.volumeLitres && <div><span style={{ color: "#9ca3af" }}>Volume: </span>{batch.volumeLitres.toLocaleString()} L</div>}
              {batch.receivedAt && <div><span style={{ color: "#9ca3af" }}>Received: </span>{fmtDate(batch.receivedAt)}</div>}
              <div><span style={{ color: "#9ca3af" }}>Report generated: </span>{new Date(generatedAt).toLocaleString("en-AU")}</div>
            </div>
          </div>

          {/* ── Sanitation summary ── */}
          <div style={{ padding: "18px 28px 6px" }} data-testid="batch-book-summary">
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600, marginBottom: 8 }}>
              Sanitation summary
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: 10 }}>
              <SummaryCell label="Events logged" value={summary.totalUses} />
              <SummaryCell label="Unique vessels" value={summary.uniqueVessels} />
              <SummaryCell label="Sanitised at use" value={`${summary.sanitisedAtUseCount} of ${summary.totalUses}`} />
              <SummaryCell
                label="Breaches on wine contact"
                value={summary.breachCount}
                tone={summary.breachCount > 0 ? "red" : summary.totalUses > 0 ? "green" : "neutral"}
              />
            </div>
          </div>

          <div style={{ padding: "10px 28px 4px", fontSize: 12, color: "#6b7280", lineHeight: 1.5 }}>
            Chronological record of every piece of cellar equipment this batch touched.
            Each row is drawn from the underlying event log; the sanitation flag is a
            snapshot captured at the moment of use, never edited afterwards.
          </div>

          {/* ── Chronological log ── */}
          <div style={{ padding: "8px 28px 28px" }}>
            <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", color: "#9ca3af", fontWeight: 600, marginBottom: 8 }}>
              Chronological equipment log
            </div>
            {uses.length === 0 ? (
              <div
                data-testid="batch-book-empty"
                style={{ padding: 20, textAlign: "center", background: "#f9f9f6", borderRadius: 6, color: "#6b7280", fontSize: 13, border: "1px dashed #d4d4d8" }}
              >
                No equipment uses have been logged for this batch yet.
              </div>
            ) : (
              <div data-testid="batch-book-log">
                {uses.map((u) => (
                  <UseRowCard key={u.id} u={u} />
                ))}
              </div>
            )}
          </div>

          {/* ── Attestation footer ── */}
          <div className="bb-attestation" style={{ padding: "20px 28px", background: "#fafaf7", borderTop: "1px solid #f0eee7", fontSize: 12, color: "#6b7280", lineHeight: 1.55 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#374151", marginBottom: 6 }}>Attestation</div>
            <p style={{ margin: 0 }}>
              The equipment uses recorded above are a true and complete record of every vessel this batch touched,
              and sanitation status was captured at the moment of each use.
            </p>
            <p style={{ margin: "10px 0 0" }}>
              {winery.name} — Cellar Book generated by Ownology Cellar Intelligence Platform.
              FSANZ 3.2.2 audit-defensible: state computed from the event log, never edited by hand.
            </p>
          </div>
        </div>

        <div className="no-print bb-footer-attrib" style={{ marginTop: 14, textAlign: "center", fontSize: 12, color: "#9ca3af" }}>
          Powered by <a href="/" style={{ color: winery.brandColor, textDecoration: "none", fontWeight: 600 }}>Ownology</a>
        </div>
      </div>
    </div>
  );
}

function SummaryCell({ label, value, tone }: { label: string; value: string | number; tone?: "red" | "green" | "neutral" }) {
  const color = tone === "red" ? "#7f1d1d" : tone === "green" ? "#2f5230" : "#1f2937";
  return (
    <div className="bb-summary-cell" style={{ padding: "8px 12px", background: "#f9f9f6", borderRadius: 6 }}>
      <div style={{ fontSize: 11, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color, marginTop: 2 }}>{value}</div>
    </div>
  );
}

function UseRowCard({ u }: { u: UseRow }) {
  const sanit = (() => {
    if (u.sanitiseOkAtUse === 1) {
      const age = u.sanitiseAgeHours != null ? ` (${u.sanitiseAgeHours}h)` : "";
      return { label: `OK${age}`, color: "#2f5230", bg: "#eaf3ec" };
    }
    if (u.direction === "in" || u.direction === "pass") {
      const age = u.sanitiseAgeHours != null ? ` (age ${u.sanitiseAgeHours}h)` : " (no record)";
      return { label: `BREACH${age}`, color: "#7f1d1d", bg: "#fdecec" };
    }
    return { label: "—", color: "#6b7280", bg: "#f3f4f6" };
  })();
  const vesselDesc = u.equipmentType
    ? `${u.equipmentName} · ${u.equipmentType.replace(/_/g, " ")}${u.equipmentMaterial ? ` · ${u.equipmentMaterial}` : ""}`
    : u.equipmentName;

  return (
    <div
      data-testid={`batch-book-use-${u.id}`}
      className="bb-use-row"
      style={{ padding: "10px 12px", borderTop: "1px solid #f0eee7", display: "grid", gridTemplateColumns: "160px 130px 1fr auto auto", gap: 12, alignItems: "baseline", fontSize: 13 }}
    >
      <div style={{ color: "#4b5563", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 }}>{fmtDateTime(u.usedAt)}</div>
      <div style={{ color: "#6b7280" }}>{PHASE_LABEL[u.phase] ?? u.phase}</div>
      <div style={{ color: "#111827", fontWeight: 500 }}>
        {vesselDesc}
        {u.notes ? <div style={{ fontSize: 12, color: "#6b7280", marginTop: 2, fontWeight: 400 }}>Note: {u.notes}</div> : null}
      </div>
      <div style={{ color: "#4b5563", fontSize: 12 }}>{DIRECTION_LABEL[u.direction] ?? u.direction}</div>
      <div style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, fontWeight: 600, background: sanit.bg, color: sanit.color, whiteSpace: "nowrap" }}>
        {sanit.label}
      </div>
    </div>
  );
}

function BatchBookSkeleton() {
  return (
    <div style={{ minHeight: "100dvh", background: "#f8f6f0", padding: 48, fontFamily: "'Lato', system-ui, sans-serif" }}>
      <div style={{ maxWidth: 880, margin: "0 auto", background: "#fff", borderRadius: 10, padding: 40, textAlign: "center", color: "#9ca3af" }}>
        Loading Cellar Book…
      </div>
    </div>
  );
}

function BatchBookError({ message }: { message: string }) {
  return (
    <div style={{ minHeight: "100dvh", background: "#f8f6f0", padding: 48, fontFamily: "'Lato', system-ui, sans-serif" }}>
      <div
        data-testid="batch-book-error"
        style={{ maxWidth: 640, margin: "0 auto", background: "#fff", borderRadius: 10, padding: 32, textAlign: "center" }}
      >
        <div style={{ fontFamily: "'Fraunces', serif", fontSize: 22, fontWeight: 700, color: "#7f1d1d", marginBottom: 10 }}>
          Cellar Book unavailable
        </div>
        <p style={{ color: "#4b5563", fontSize: 14, margin: 0 }}>{message}</p>
        <a href="/" style={{ display: "inline-block", marginTop: 20, color: "#78350f", fontSize: 13, fontWeight: 600 }}>
          ← Return to Ownology
        </a>
      </div>
    </div>
  );
}

// Default export = the public token variant. This matches wouter's expected
// single-export shape when the App.tsx route is <Route component={BatchBook} />.
export default BatchBookByToken;
