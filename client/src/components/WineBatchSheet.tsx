/**
 * WineBatchSheet
 * ──────────────
 * Slide-in form for creating a new Wine Batch record (Winemaker's Batch Book).
 * Collects LIP-mandatory fields: Batch ID, Vintage, Variety, GI, Grower/Supplier,
 * Receival Date, Quantity, and linked Tank.
 *
 * Renders as a bottom-sheet on mobile, centred modal on desktop.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Media query hook ─────────────────────────────────────────────────────────
function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia("(min-width: 768px)").matches : false
  );
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

// ─── Types ────────────────────────────────────────────────────────────────────
interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: (newBatchId?: string) => void;
  /** Pre-fill the tank name (e.g. from Vintage Log context) */
  prefillTank?: string;
  /** Suggested batch ID prefix (e.g. "26") */
  suggestedYear?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────
const COMMON_VARIETIES = [
  "Shiraz", "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Grenache",
  "Tempranillo", "Sangiovese", "Nebbiolo", "Chardonnay", "Sauvignon Blanc",
  "Riesling", "Pinot Gris", "Viognier", "Semillon", "Gewürztraminer",
  "Muscat", "Zinfandel", "Mourvedre", "Barbera", "Blend",
];

const COMMON_GIS = [
  "Barossa Valley", "Eden Valley", "Clare Valley", "McLaren Vale",
  "Coonawarra", "Langhorne Creek", "Padthaway", "Riverland",
  "Margaret River", "Great Southern", "Swan Valley", "Frankland River",
  "Hunter Valley", "Mudgee", "Orange", "Hilltops", "Canberra District",
  "Yarra Valley", "Mornington Peninsula", "Heathcote", "Rutherglen",
  "Grampians", "Pyrenees", "Macedon Ranges",
  "Marlborough", "Central Otago", "Hawke's Bay",
  "Napa Valley", "Sonoma County",
  "Other / Not Applicable",
];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function generateBatchId(vintage: number, variety: string, existing: string[]): string {
  const yr = String(vintage).slice(2); // "26"
  const varCode = variety
    .toUpperCase()
    .replace(/[^A-Z]/g, "")
    .slice(0, 3)
    .padEnd(3, "X"); // "SHZ"
  let n = 1;
  while (existing.includes(`${yr}${varCode}-${String(n).padStart(3, "0")}`)) n++;
  return `${yr}${varCode}-${String(n).padStart(3, "0")}`;
}

function LipBadge() {
  return (
    <span
      className="inline-flex items-center gap-1 text-xs px-1.5 py-0.5 rounded"
      style={{
        background: "oklch(0.72 0.12 75 / 12%)",
        color: "oklch(0.72 0.12 75)",
        fontFamily: "'Lato', sans-serif",
        letterSpacing: "0.05em",
      }}
    >
      LIP
    </span>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function WineBatchSheet({ open, onClose, onSaved, prefillTank, suggestedYear }: Props) {
  const isDesktop = useIsDesktop();
  const utils = trpc.useUtils();

  const currentYear = new Date().getFullYear();
  const [vintage, setVintage] = useState(suggestedYear ?? currentYear);
  const [variety, setVariety] = useState("");
  const [gi, setGi] = useState("");
  const [growerDetails, setGrowerDetails] = useState("");
  const [receivedDate, setReceivedDate] = useState("");
  const [quantityValue, setQuantityValue] = useState("");
  const [quantityUnit, setQuantityUnit] = useState<"kg" | "t" | "L">("t");
  const [tankName, setTankName] = useState(prefillTank ?? "");
  const [batchId, setBatchId] = useState("");
  const [batchIdManual, setBatchIdManual] = useState(false);
  const [costPerLitre, setCostPerLitre] = useState("");
  const [varietyOpen, setVarietyOpen] = useState(false);
  const [giOpen, setGiOpen] = useState(false);

  // Fetch existing batch IDs to avoid collisions
  const { data: existingBatches } = trpc.wineBatch.list.useQuery(undefined, { enabled: open });
  const existingIds = (existingBatches ?? []).map((b) => b.batchId);

  // Auto-generate batch ID when vintage + variety change
  useEffect(() => {
    if (!batchIdManual && variety.trim()) {
      setBatchId(generateBatchId(vintage, variety, existingIds));
    }
  }, [vintage, variety, batchIdManual, existingIds.join(",")]);

  // Reset when opened
  useEffect(() => {
    if (open) {
      setVintage(suggestedYear ?? currentYear);
      setVariety("");
      setGi("");
      setGrowerDetails("");
      setReceivedDate("");
      setQuantityValue("");
      setQuantityUnit("t");
      setTankName(prefillTank ?? "");
      setBatchId("");
      setBatchIdManual(false);
      setCostPerLitre("");
    }
  }, [open]);

  const createMutation = trpc.wineBatch.create.useMutation({
    onSuccess: () => {
      utils.wineBatch.list.invalidate();
      toast.success("Batch created", {
        description: `${batchId} — ${variety} ${vintage} added to your Batch Book.`,
      });
      onSaved(batchId.trim());
    },
    onError: (err) => {
      toast.error("Could not save batch", { description: err.message });
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variety.trim()) { toast.error("Variety is required"); return; }
    if (!batchId.trim()) { toast.error("Batch ID is required"); return; }
    createMutation.mutate({
      batchId: batchId.trim(),
      vintage,
      variety: variety.trim(),
      gi: gi.trim(),
      growerDetails: growerDetails.trim() || undefined,
      receivedAt: receivedDate ? new Date(receivedDate).getTime() : undefined,
      quantityValue: quantityValue.trim() || undefined,
      quantityUnit: quantityValue.trim() ? quantityUnit : undefined,
      tankName: tankName.trim() || undefined,
      costPerLitre: costPerLitre.trim() ? Math.round(parseFloat(costPerLitre)) : undefined,
    });
  }

  if (!open) return null;

  const content = (
    <form onSubmit={handleSubmit} className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between px-6 py-5 border-b"
        style={{ borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <div>
          <p
            className="text-xs uppercase tracking-widest mb-1"
            style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Lato', sans-serif" }}
          >
            New Wine Batch
          </p>
          <h2
            className="text-xl font-bold"
            style={{ fontFamily: "'Fraunces', serif", color: "oklch(0.92 0.015 75)" }}
          >
            Register a Batch
          </h2>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 flex items-center justify-center rounded-full transition-colors"
          style={{ color: "oklch(0.55 0.015 75)" }}
          onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.72 0.12 75)")}
          onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.55 0.015 75)")}
        >
          ✕
        </button>
      </div>

      {/* LIP notice */}
      <div
        className="mx-6 mt-4 px-3 py-2 rounded text-xs"
        style={{
          background: "oklch(0.72 0.12 75 / 8%)",
          color: "oklch(0.70 0.015 75)",
          fontFamily: "'Lato', sans-serif",
          lineHeight: 1.5,
        }}
      >
        <strong style={{ color: "oklch(0.72 0.12 75)" }}>LIP fields</strong> — marked fields are
        required under the Wine Australia Label Integrity Program. Records must be retained for 7 years.
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">

        {/* Batch ID */}
        <div>
          <label className="field-label flex items-center gap-2">
            Wine Batch ID <LipBadge />
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={batchId}
              onChange={(e) => { setBatchId(e.target.value); setBatchIdManual(true); }}
              placeholder="e.g. 26SHZ-001"
              maxLength={32}
              className="press-input flex-1"
              required
            />
            {batchIdManual && (
              <button
                type="button"
                className="text-xs px-3 py-2 rounded"
                style={{
                  background: "oklch(0.20 0.010 60)",
                  color: "oklch(0.72 0.12 75)",
                  fontFamily: "'Lato', sans-serif",
                }}
                onClick={() => { setBatchIdManual(false); }}
              >
                Auto
              </button>
            )}
          </div>
          <p className="field-hint">Format: YY + variety code + sequence (e.g. 26SHZ-001)</p>
        </div>

        {/* Vintage + Variety row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label flex items-center gap-2">
              Vintage <LipBadge />
            </label>
            <input
              type="number"
              value={vintage}
              onChange={(e) => setVintage(Number(e.target.value))}
              min={1900}
              max={2100}
              className="press-input w-full"
              required
            />
          </div>
          <div>
            <label className="field-label flex items-center gap-2">
              Variety <LipBadge />
            </label>
            <div className="relative">
              <input
                type="text"
                value={variety}
                onChange={(e) => { setVariety(e.target.value); setVarietyOpen(true); }}
                onFocus={() => setVarietyOpen(true)}
                onBlur={() => setTimeout(() => setVarietyOpen(false), 150)}
                placeholder="e.g. Shiraz"
                maxLength={128}
                className="press-input w-full"
                required
              />
              {varietyOpen && (
                <div
                  className="absolute z-20 left-0 right-0 top-full mt-1 rounded max-h-48 overflow-y-auto"
                  style={{ background: "oklch(0.16 0.010 60)", border: "1px solid oklch(1 0 0 / 10%)" }}
                >
                  {COMMON_VARIETIES.filter((v) =>
                    v.toLowerCase().includes(variety.toLowerCase())
                  ).map((v) => (
                    <button
                      key={v}
                      type="button"
                      className="w-full text-left px-3 py-2 text-sm transition-colors"
                      style={{ color: "oklch(0.82 0.015 75)", fontFamily: "'Lato', sans-serif" }}
                      onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.20 0.010 60)")}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                      onMouseDown={() => { setVariety(v); setVarietyOpen(false); }}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* GI */}
        <div>
          <label className="field-label flex items-center gap-2">
            Geographical Indication (GI) <LipBadge />
          </label>
          <div className="relative">
            <input
              type="text"
              value={gi}
              onChange={(e) => { setGi(e.target.value); setGiOpen(true); }}
              onFocus={() => setGiOpen(true)}
              onBlur={() => setTimeout(() => setGiOpen(false), 150)}
              placeholder="e.g. Barossa Valley"
              maxLength={128}
              className="press-input w-full"
            />
            {giOpen && (
              <div
                className="absolute z-20 left-0 right-0 top-full mt-1 rounded max-h-48 overflow-y-auto"
                style={{ background: "oklch(0.16 0.010 60)", border: "1px solid oklch(1 0 0 / 10%)" }}
              >
                {COMMON_GIS.filter((g) =>
                  g.toLowerCase().includes(gi.toLowerCase())
                ).map((g) => (
                  <button
                    key={g}
                    type="button"
                    className="w-full text-left px-3 py-2 text-sm transition-colors"
                    style={{ color: "oklch(0.82 0.015 75)", fontFamily: "'Lato', sans-serif" }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = "oklch(0.20 0.010 60)")}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    onMouseDown={() => { setGi(g); setGiOpen(false); }}
                  >
                    {g}
                  </button>
                ))}
              </div>
            )}
          </div>
          <p className="field-hint">Full GI name as registered with Wine Australia</p>
        </div>

        {/* Grower / Supplier */}
        <div>
          <label className="field-label flex items-center gap-2">
            Grower / Supplier <LipBadge />
          </label>
          <textarea
            value={growerDetails}
            onChange={(e) => setGrowerDetails(e.target.value)}
            placeholder="Name, address, lot number, vineyard block…"
            maxLength={1000}
            rows={2}
            className="press-input w-full resize-none"
          />
          <p className="field-hint">Required for LIP traceability. Include property name and address.</p>
        </div>

        {/* Receival Date + Quantity row */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="field-label flex items-center gap-2">
              Receival Date <LipBadge />
            </label>
            <input
              type="date"
              value={receivedDate}
              onChange={(e) => setReceivedDate(e.target.value)}
              className="press-input w-full"
            />
          </div>
          <div>
            <label className="field-label">Quantity</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={quantityValue}
                onChange={(e) => setQuantityValue(e.target.value)}
                placeholder="e.g. 8.4"
                maxLength={16}
                className="press-input flex-1"
              />
              <select
                value={quantityUnit}
                onChange={(e) => setQuantityUnit(e.target.value as "kg" | "t" | "L")}
                className="press-input w-16"
              >
                <option value="t">t</option>
                <option value="kg">kg</option>
                <option value="L">L</option>
              </select>
            </div>
          </div>
        </div>

        {/* Tank */}
        <div>
          <label className="field-label">Receiving Tank / Vessel</label>
          <input
            type="text"
            value={tankName}
            onChange={(e) => setTankName(e.target.value)}
            placeholder="e.g. Tank 7, Fermenter A"
            maxLength={128}
            className="press-input w-full"
          />
          <p className="field-hint">All vessels must be numbered or named for LIP compliance.</p>
        </div>

        {/* Cost Per Litre */}
        <div>
          <label className="field-label">Cost Per Litre (AUD)</label>
          <div className="flex items-center gap-2">
            <span className="text-sm" style={{ color: "oklch(0.55 0.012 75)" }}>$</span>
            <input
              type="number"
              value={costPerLitre}
              onChange={(e) => setCostPerLitre(e.target.value)}
              placeholder="e.g. 12"
              min={0}
              max={100000}
              step={1}
              className="press-input flex-1"
            />
            <span className="text-sm" style={{ color: "oklch(0.55 0.012 75)" }}>/L</span>
          </div>
          <p className="field-hint">Optional. Used by the Production Dashboard to calculate tied capital with your actual cost instead of the industry estimate range.</p>
        </div>
      </div>

      {/* Footer */}
      <div
        className="px-6 py-4 border-t flex gap-3"
        style={{ borderColor: "oklch(1 0 0 / 8%)" }}
      >
        <button
          type="button"
          onClick={onClose}
          className="flex-1 py-3 rounded text-sm font-medium"
          style={{
            background: "oklch(0.20 0.010 60)",
            color: "oklch(0.65 0.015 75)",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={createMutation.isPending}
          className="flex-1 py-3 rounded text-sm font-semibold transition-opacity"
          style={{
            background: createMutation.isPending ? "oklch(0.72 0.12 75 / 50%)" : "oklch(0.72 0.12 75)",
            color: "oklch(0.11 0.008 60)",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          {createMutation.isPending ? "Saving…" : "Register Batch"}
        </button>
      </div>
    </form>
  );

  if (isDesktop) {
    return (
      <>
        {/* Backdrop */}
        <div
          className="fixed inset-0 z-40"
          style={{ background: "oklch(0 0 0 / 60%)" }}
          onClick={onClose}
        />
        {/* Modal */}
        <div
          className="fixed z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-lg rounded-lg overflow-hidden flex flex-col"
          style={{
            background: "oklch(0.13 0.008 60)",
            border: "1px solid oklch(1 0 0 / 10%)",
            maxHeight: "90vh",
          }}
        >
          {content}
        </div>
      </>
    );
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 60%)" }}
        onClick={onClose}
      />
      {/* Bottom sheet */}
      <div
        className="fixed z-50 bottom-0 left-0 right-0 rounded-t-2xl overflow-hidden flex flex-col"
        style={{
          background: "oklch(0.13 0.008 60)",
          border: "1px solid oklch(1 0 0 / 10%)",
          maxHeight: "92vh",
        }}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto mt-3 mb-1"
          style={{ background: "oklch(1 0 0 / 20%)" }}
        />
        {content}
      </div>
    </>
  );
}
