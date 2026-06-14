/**
 * ExportDocsGenerator — DR-11
 * Generates two export documents from batch data:
 *  1. AWBC-style Movement Advice (wine movement notification)
 *  2. Label Compliance Checklist (Australian wine labelling requirements)
 */
import { useState } from "react";
import { toast } from "sonner";

type Batch = {
  id: number;
  batchId: string;
  vintage: number;
  variety: string;
  gi: string;
  tankName?: string | null;
  volumeLitres?: number | null;
  currentVolumeLitres?: number | null;
  quantityValue?: string | null;
  quantityUnit?: string | null;
  growerDetails?: string | null;
  costPerLitre?: number | null;
};

type LogEntry = {
  id: number;
  tankName: string;
  variety: string;
  eventType: string;
  details: Record<string, unknown>;
  entryAt: number;
  noteText?: string | null;
};

interface Props {
  batches: Batch[];
  logEntries: LogEntry[];
}

const LABEL_CHECKLIST = [
  { id: "product_name", label: "Product name / brand name", required: true },
  { id: "vintage", label: "Vintage year (if claimed)", required: true },
  { id: "variety", label: "Variety / varietal (if claimed, ≥85% required)", required: true },
  { id: "gi", label: "Geographic Indication (GI) — if claimed, ≥85% required", required: true },
  { id: "volume", label: "Liquid volume declaration (e.g. 750 mL)", required: true },
  { id: "std_drinks", label: "Standard drinks statement", required: true },
  { id: "alcohol", label: "Alcohol by volume (% alc/vol)", required: true },
  { id: "contains_sulfites", label: "Contains Sulphites / Preservative 220 statement", required: true },
  { id: "country", label: "Country of origin (Product of Australia)", required: true },
  { id: "responsible_person", label: "Name and address of responsible person (importer/exporter)", required: true },
  { id: "lot_id", label: "Lot identification code", required: true },
  { id: "allergens", label: "Allergen declaration (egg, milk, fish — if fining agents used)", required: false },
  { id: "organic", label: "Organic certification claim (if applicable)", required: false },
  { id: "halal", label: "Halal certification (if applicable)", required: false },
  { id: "pregnancy", label: "Pregnancy warning (voluntary in AU, mandatory in some markets)", required: false },
];

function generateMovementAdviceText(batch: Batch, logEntries: LogEntry[], destination: string, consignee: string, transportMode: string): string {
  const bottlingEntries = logEntries.filter(e => e.tankName === batch.tankName && e.eventType === "bottling_run");
  const latestBottling = bottlingEntries[0];
  const lotNumber = latestBottling ? (latestBottling.details.lotNumber as string ?? "—") : "—";
  const volumeBottled = latestBottling ? (latestBottling.details.volumeL as string ?? "—") : "—";
  const vol = batch.currentVolumeLitres ?? batch.volumeLitres ?? 0;

  const lines = [
    "WINE MOVEMENT ADVICE",
    "====================",
    `Date: ${new Date().toLocaleDateString("en-AU", { day: "2-digit", month: "long", year: "numeric" })}`,
    "",
    "CONSIGNOR DETAILS",
    "-----------------",
    "Name: [Your Winery Name]",
    "Address: [Your Winery Address]",
    "AWBC Licence No.: [Your Licence Number]",
    "",
    "CONSIGNEE DETAILS",
    "-----------------",
    `Name: ${consignee || "[Consignee Name]"}`,
    `Destination: ${destination || "[Destination]"}`,
    "",
    "WINE DETAILS",
    "------------",
    `Batch ID: ${batch.batchId}`,
    `Vintage: ${batch.vintage}`,
    `Variety: ${batch.variety}`,
    `Geographic Indication: ${batch.gi || "—"}`,
    `Tank / Vessel: ${batch.tankName || "—"}`,
    `Volume (bulk): ${vol > 0 ? vol + " L" : "—"}`,
    `Volume (bottled): ${volumeBottled !== "—" ? volumeBottled + " L" : "—"}`,
    `Lot Number: ${lotNumber}`,
    `Grower / Supplier: ${batch.growerDetails || "—"}`,
    "",
    "TRANSPORT",
    "---------",
    `Mode: ${transportMode || "[Road / Rail / Sea / Air]"}`,
    "Carrier: [Carrier Name]",
    "Expected Dispatch Date: [Date]",
    "Expected Arrival Date: [Date]",
    "",
    "DECLARATION",
    "-----------",
    "I declare that the information provided in this movement advice is true and correct.",
    "",
    "Signed: ________________________",
    "Name:   ________________________",
    "Date:   ________________________",
    "",
    "---",
    "Note: This document is generated from Ownology batch records.",
    "Verify all details against your AWBC licence conditions before dispatch.",
  ];
  return lines.join("\n");
}

export default function ExportDocsGenerator({ batches, logEntries }: Props) {
  const [selectedBatchId, setSelectedBatchId] = useState<string>("");
  const [destination, setDestination] = useState("");
  const [consignee, setConsignee] = useState("");
  const [transportMode, setTransportMode] = useState("Road");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [activeDoc, setActiveDoc] = useState<"movement" | "label">("movement");

  const selectedBatch = batches.find(b => b.batchId === selectedBatchId);

  function toggleCheck(id: string) {
    setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
  }

  function copyToClipboard(text: string) {
    navigator.clipboard.writeText(text).then(() => {
      toast.success("Copied to clipboard");
    }).catch(() => {
      toast.error("Could not copy — please select and copy manually");
    });
  }

  function downloadTxt(text: string, filename: string) {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Downloaded ${filename}`);
  }

  const movementText = selectedBatch
    ? generateMovementAdviceText(selectedBatch, logEntries, destination, consignee, transportMode)
    : "";

  const requiredCount = LABEL_CHECKLIST.filter(i => i.required).length;
  const checkedRequired = LABEL_CHECKLIST.filter(i => i.required && checkedItems[i.id]).length;
  const allRequiredDone = checkedRequired === requiredCount;

  return (
    <div className="flex flex-col gap-6">
      {/* Doc type selector */}
      <div className="flex gap-2">
        {(["movement", "label"] as const).map(doc => (
          <button
            key={doc}
            type="button"
            onClick={() => setActiveDoc(doc)}
            className="flex-1 py-3 rounded-sm text-sm font-medium transition-all"
            style={{
              fontFamily: "'Lato',sans-serif",
              background: activeDoc === doc
                ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                : "var(--ow-bg-card)",
              border: activeDoc === doc
                ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
                : "1px solid var(--ow-border)",
              color: activeDoc === doc ? "var(--ow-amber)" : "var(--ow-text-mid)",
              cursor: "pointer",
            }}
          >
            {doc === "movement" ? "📋 Movement Advice" : "✅ Label Compliance"}
          </button>
        ))}
      </div>

      {/* Batch selector */}
      <div>
        <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.5rem" }}>SELECT BATCH</p>
        {batches.length === 0 ? (
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
            No batches registered yet. Add a batch in the Batch Book tab first.
          </p>
        ) : (
          <select
            value={selectedBatchId}
            onChange={e => setSelectedBatchId(e.target.value)}
            className="w-full px-4 py-3 rounded-sm outline-none"
            style={{
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border-md)",
              color: selectedBatchId ? "var(--ow-text-hi)" : "var(--ow-text-lo)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.875rem",
            }}
          >
            <option value="">— Choose a batch —</option>
            {batches.map(b => (
              <option key={b.batchId} value={b.batchId}>
                {b.batchId} · {b.vintage} {b.variety} · {b.gi}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Movement Advice */}
      {activeDoc === "movement" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>DESTINATION</p>
              <input
                type="text"
                value={destination}
                onChange={e => setDestination(e.target.value)}
                placeholder="e.g. Melbourne, VIC"
                className="w-full px-3 py-2.5 rounded-sm outline-none text-sm"
                style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border-md)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
              />
            </div>
            <div>
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>CONSIGNEE</p>
              <input
                type="text"
                value={consignee}
                onChange={e => setConsignee(e.target.value)}
                placeholder="e.g. Acme Distributors"
                className="w-full px-3 py-2.5 rounded-sm outline-none text-sm"
                style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border-md)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}
                onFocus={e => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
                onBlur={e => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
              />
            </div>
            <div>
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", marginBottom: "0.4rem" }}>TRANSPORT MODE</p>
              <select
                value={transportMode}
                onChange={e => setTransportMode(e.target.value)}
                className="w-full px-3 py-2.5 rounded-sm outline-none text-sm"
                style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border-md)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}
              >
                {["Road", "Rail", "Sea", "Air"].map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
          </div>

          {selectedBatch ? (
            <>
              <div
                className="rounded-sm p-4 overflow-auto"
                style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)", maxHeight: "420px" }}
              >
                <pre style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-mid)", lineHeight: 1.7, whiteSpace: "pre-wrap", margin: 0 }}>
                  {movementText}
                </pre>
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => copyToClipboard(movementText)}
                  className="flex-1 py-2.5 rounded-sm text-sm font-medium"
                  style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", cursor: "pointer" }}
                >
                  Copy to Clipboard
                </button>
                <button
                  type="button"
                  onClick={() => downloadTxt(movementText, `movement-advice-${selectedBatch.batchId}.txt`)}
                  className="flex-1 py-2.5 rounded-sm text-sm font-medium"
                  style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", cursor: "pointer" }}
                >
                  Download .txt
                </button>
              </div>
            </>
          ) : (
            <div
              className="rounded-sm p-6 text-center"
              style={{ background: "var(--ow-bg-card)", border: "1px dashed var(--ow-border)" }}
            >
              <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                Select a batch above to generate the movement advice document.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Label Compliance Checklist */}
      {activeDoc === "label" && (
        <div className="flex flex-col gap-4">
          {/* Progress bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em" }}>
                MANDATORY ITEMS: {checkedRequired} / {requiredCount}
              </p>
              {allRequiredDone && (
                <span
                  className="text-xs px-2 py-0.5 rounded-sm"
                  style={{ background: "color-mix(in oklch, oklch(0.65 0.15 145) 15%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.65 0.15 145) 40%, transparent)", color: "oklch(0.65 0.15 145)", fontFamily: "'Fira Code',monospace", letterSpacing: "0.06em" }}
                >
                  ALL MANDATORY ✓
                </span>
              )}
            </div>
            <div className="w-full rounded-full overflow-hidden" style={{ height: "4px", background: "var(--ow-border)" }}>
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${requiredCount > 0 ? (checkedRequired / requiredCount) * 100 : 0}%`,
                  background: allRequiredDone ? "oklch(0.65 0.15 145)" : "var(--ow-amber)",
                }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {LABEL_CHECKLIST.map(item => (
              <button
                key={item.id}
                type="button"
                onClick={() => toggleCheck(item.id)}
                className="flex items-start gap-3 px-4 py-3 rounded-sm text-left transition-all"
                style={{
                  background: checkedItems[item.id] ? "color-mix(in oklch, oklch(0.65 0.15 145) 8%, transparent)" : "var(--ow-bg-card)",
                  border: checkedItems[item.id] ? "1px solid color-mix(in oklch, oklch(0.65 0.15 145) 30%, transparent)" : "1px solid var(--ow-border)",
                  cursor: "pointer",
                }}
              >
                <div
                  className="flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center mt-0.5"
                  style={{
                    background: checkedItems[item.id] ? "oklch(0.65 0.15 145)" : "var(--ow-bg-inset)",
                    border: checkedItems[item.id] ? "1px solid oklch(0.65 0.15 145)" : "1px solid var(--ow-border-md)",
                  }}
                >
                  {checkedItems[item.id] && (
                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                      <path d="M1 4l3 3 5-6" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <div className="flex-1">
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", color: checkedItems[item.id] ? "var(--ow-text-mid)" : "var(--ow-text-hi)", lineHeight: 1.4 }}>
                    {item.label}
                  </p>
                  {!item.required && (
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", marginTop: "0.15rem" }}>
                      OPTIONAL
                    </p>
                  )}
                </div>
                {item.required && !checkedItems[item.id] && (
                  <span
                    className="flex-shrink-0 text-xs px-1.5 py-0.5 rounded-sm self-start mt-0.5"
                    style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)", color: "var(--ow-amber)", fontFamily: "'Fira Code',monospace", fontSize: "0.55rem", letterSpacing: "0.06em" }}
                  >
                    REQUIRED
                  </span>
                )}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const lines = [
                `LABEL COMPLIANCE CHECKLIST — ${selectedBatch ? selectedBatch.batchId + " · " + selectedBatch.vintage + " " + selectedBatch.variety : "All Batches"}`,
                `Generated: ${new Date().toLocaleDateString("en-AU")}`,
                "",
                ...LABEL_CHECKLIST.map(item =>
                  `[${checkedItems[item.id] ? "X" : " "}] ${item.label}${item.required ? " (REQUIRED)" : " (optional)"}`
                ),
                "",
                allRequiredDone ? "STATUS: All mandatory items confirmed ✓" : `STATUS: ${requiredCount - checkedRequired} mandatory item(s) outstanding`,
              ];
              downloadTxt(lines.join("\n"), `label-compliance-${selectedBatch?.batchId ?? "checklist"}.txt`);
            }}
            className="py-2.5 rounded-sm text-sm font-medium"
            style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", cursor: "pointer" }}
          >
            Download Checklist .txt
          </button>
        </div>
      )}
    </div>
  );
}
