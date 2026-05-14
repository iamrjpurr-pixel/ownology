/**
 * VintageEntrySheet
 * ─────────────────
 * Guided 5-step entry sheet for The Press → Vintage Log.
 * Renders as a bottom-sheet on mobile, centred modal on desktop.
 *
 * Steps:
 *   1. Tank — select from previous tanks or type a new one
 *   2. Variety — select common varieties or type free text
 *   3. Event type — Addition / Measurement / Racking / Inoculation / Observation / Other
 *   4. Details — contextual fields driven by event type
 *   5. Note — optional free-text note + confirm
 */

import { useState, useEffect, useRef } from "react";
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

type EventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "other";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  /** When set, skips step 1 and pre-fills the tank name (Quick-Entry mode) */
  prefillTank?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const COMMON_VARIETIES = [
  "Shiraz", "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Grenache",
  "Tempranillo", "Sangiovese", "Nebbiolo", "Chardonnay", "Sauvignon Blanc",
  "Riesling", "Pinot Gris", "Viognier", "Semillon", "Gewürztraminer",
];

const EVENT_TYPES: { id: EventType; label: string; icon: string; description: string }[] = [
  { id: "addition",    label: "Addition",    icon: "⊕", description: "DAP, SO₂, acid, fining agents, oak" },
  { id: "measurement", label: "Measurement", icon: "◎", description: "Brix, YAN, SO₂, TA, pH, VA, temp" },
  { id: "racking",     label: "Racking",     icon: "⇄", description: "Transfer between vessels" },
  { id: "inoculation", label: "Inoculation", icon: "✦", description: "Yeast, MLF bacteria inoculation" },
  { id: "observation", label: "Observation", icon: "◉", description: "Sensory note, colour, aroma, visual" },
  { id: "other",       label: "Other",       icon: "◈", description: "Anything else worth recording" },
];

const ADDITION_WHAT = ["DAP", "Fermaid-O", "Fermaid-K", "SO₂ (sulfite)", "Tartaric acid", "Citric acid", "Bentonite", "Egg white fining", "Gelatin", "Oak chips", "Oak staves", "Tannin", "Yeast hulls", "Other"];
const ADDITION_TIMING = ["At inoculation", "⅓ sugar depletion", "½ sugar depletion", "Post-ferment", "Pre-bottling", "Other"];
const ADDITION_UNITS = ["g", "kg", "mL", "L", "g/hL", "mg/L"];

const MEASUREMENT_WHAT = ["Brix", "°Baumé", "YAN (mg/L)", "Free SO₂ (mg/L)", "Total SO₂ (mg/L)", "TA (g/L)", "pH", "VA (g/L)", "Alcohol (%)", "Temperature (°C)", "Volume (L)", "Other"];
const MEASUREMENT_UNIT_MAP: Record<string, string> = {
  "Brix": "°Bx", "°Baumé": "°Bé", "YAN (mg/L)": "mg/L", "Free SO₂ (mg/L)": "mg/L",
  "Total SO₂ (mg/L)": "mg/L", "TA (g/L)": "g/L", "pH": "", "VA (g/L)": "g/L",
  "Alcohol (%)": "%", "Temperature (°C)": "°C", "Volume (L)": "L", "Other": "",
};

const RACKING_LEES = ["Gross lees", "Fine lees", "Clean (no lees)"];
const INOCULATION_WHAT = ["Yeast", "MLF bacteria", "Other"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StepIndicator({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-1.5 mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <div
          key={i}
          className="h-1 rounded-full transition-all duration-300"
          style={{
            flex: i < step ? "1 1 0" : "0.4 1 0",
            background: i < step
              ? "var(--ow-amber)"
              : i === step
              ? "oklch(from var(--ow-amber) l c h / 40%)"
              : "var(--ow-border-md)",
          }}
        />
      ))}
    </div>
  );
}

function OptionButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left px-4 py-3 rounded transition-all"
      style={{
        background: selected ? "oklch(from var(--ow-amber) l c h / 12%)" : "var(--ow-bg-inset)",
        border: `1px solid ${selected ? "var(--ow-amber)" : "var(--ow-border)"}`,
        color: selected ? "var(--ow-amber)" : "var(--ow-text-mid)",
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.9rem",
      }}
    >
      {children}
    </button>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
  unit,
  autoFocus,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  unit?: string;
  autoFocus?: boolean;
}) {
  return (
    <div className="relative">
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        autoFocus={autoFocus}
        className="w-full px-4 py-3 rounded outline-none transition-all"
        style={{
          background: "var(--ow-bg-inset)",
          border: "1px solid var(--ow-border-md)",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.9rem",
          paddingRight: unit ? "3.5rem" : undefined,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
      />
      {unit && (
        <span
          className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
          style={{ color: "var(--ow-text-lo)", fontFamily: "'Fira Code', monospace" }}
        >
          {unit}
        </span>
      )}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-2 text-xs uppercase tracking-widest"
      style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}
    >
      {children}
    </p>
  );
}

// ─── Details steps per event type ─────────────────────────────────────────────

function AdditionDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>What was added?</FieldLabel>
        <div className="flex flex-col gap-2">
          {ADDITION_WHAT.map((w) => (
            <OptionButton key={w} selected={details.what === w} onClick={() => set("what", w)}>
              {w}
            </OptionButton>
          ))}
          {details.what === "Other" && (
            <TextInput
              value={details.whatCustom ?? ""}
              onChange={(v) => set("whatCustom", v)}
              placeholder="Describe what was added…"
              autoFocus
            />
          )}
        </div>
      </div>
      <div>
        <FieldLabel>Quantity</FieldLabel>
        <div className="flex gap-2">
          <TextInput
            value={details.quantity ?? ""}
            onChange={(v) => set("quantity", v)}
            placeholder="Amount"
            type="number"
          />
          <select
            value={details.unit ?? "g"}
            onChange={(e) => set("unit", e.target.value)}
            className="px-3 py-3 rounded"
            style={{
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border-md)",
              color: "var(--ow-text-hi)",
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.85rem",
              minWidth: "5rem",
            }}
          >
            {ADDITION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <FieldLabel>Timing</FieldLabel>
        <div className="flex flex-col gap-2">
          {ADDITION_TIMING.map((t) => (
            <OptionButton key={t} selected={details.timing === t} onClick={() => set("timing", t)}>
              {t}
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function MeasurementDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  const unit = MEASUREMENT_UNIT_MAP[details.what ?? ""] ?? "";
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>What was measured?</FieldLabel>
        <div className="flex flex-col gap-2">
          {MEASUREMENT_WHAT.map((w) => (
            <OptionButton key={w} selected={details.what === w} onClick={() => set("what", w)}>
              {w}
            </OptionButton>
          ))}
        </div>
      </div>
      {details.what && (
        <div>
          <FieldLabel>Value{unit ? ` (${unit})` : ""}</FieldLabel>
          <TextInput
            value={details.value ?? ""}
            onChange={(v) => set("value", v)}
            placeholder={`Enter ${details.what} reading`}
            type="number"
            unit={unit || undefined}
            autoFocus
          />
        </div>
      )}
    </div>
  );
}

function RackingDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>From (vessel / location)</FieldLabel>
        <TextInput value={details.fromLocation ?? ""} onChange={(v) => set("fromLocation", v)} placeholder="e.g. Tank 7, Barrel 12A" autoFocus />
      </div>
      <div>
        <FieldLabel>To (vessel / location)</FieldLabel>
        <TextInput value={details.toLocation ?? ""} onChange={(v) => set("toLocation", v)} placeholder="e.g. Tank 3, Barrel 8B" />
      </div>
      <div>
        <FieldLabel>Volume racked</FieldLabel>
        <TextInput value={details.volumeL ?? ""} onChange={(v) => set("volumeL", v)} placeholder="Litres" type="number" unit="L" />
      </div>
      <div>
        <FieldLabel>Lees status</FieldLabel>
        <div className="flex flex-col gap-2">
          {RACKING_LEES.map((l) => (
            <OptionButton key={l} selected={details.leesStatus === l} onClick={() => set("leesStatus", l)}>
              {l}
            </OptionButton>
          ))}
        </div>
      </div>
    </div>
  );
}

function InoculationDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>What was inoculated?</FieldLabel>
        <div className="flex flex-col gap-2">
          {INOCULATION_WHAT.map((w) => (
            <OptionButton key={w} selected={details.what === w} onClick={() => set("what", w)}>
              {w}
            </OptionButton>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Product name</FieldLabel>
        <TextInput value={details.productName ?? ""} onChange={(v) => set("productName", v)} placeholder="e.g. EC1118, Enoferm Alpha" autoFocus />
      </div>
      <div>
        <FieldLabel>Rate</FieldLabel>
        <TextInput value={details.rate ?? ""} onChange={(v) => set("rate", v)} placeholder="Rate" type="number" unit="g/hL" />
      </div>
    </div>
  );
}

function ObservationDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  return (
    <div>
      <FieldLabel>Sensory observation</FieldLabel>
      <textarea
        value={details.text ?? ""}
        onChange={(e) => onChange({ ...details, text: e.target.value })}
        placeholder="Colour, clarity, aroma, taste, visual observation…"
        rows={5}
        autoFocus
        className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
        style={{
          background: "var(--ow-bg-inset)",
          border: "1px solid var(--ow-border-md)",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
      />
    </div>
  );
}

function OtherDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  return (
    <div>
      <FieldLabel>Description</FieldLabel>
      <textarea
        value={details.text ?? ""}
        onChange={(e) => onChange({ ...details, text: e.target.value })}
        placeholder="Describe what happened…"
        rows={5}
        autoFocus
        className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
        style={{
          background: "var(--ow-bg-inset)",
          border: "1px solid var(--ow-border-md)",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.9rem",
          lineHeight: 1.6,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function VintageEntrySheet({ open, onClose, onSaved, prefillTank }: Props) {
  const isDesktop = useIsDesktop();
  const totalSteps = prefillTank ? 4 : 5;
  const [step, setStep] = useState(0);

  // Form state
  const [tankName, setTankName] = useState(prefillTank ?? "");
  const [tankInput, setTankInput] = useState(prefillTank ?? "");
  const [variety, setVariety] = useState("");
  const [varietyInput, setVarietyInput] = useState("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState("");

  const { data: usedTanks = [] } = trpc.vintageLog.getUsedTanks.useQuery();
  const utils = trpc.useUtils();
  const addEntry = trpc.vintageLog.add.useMutation({
    onSuccess: () => {
      utils.vintageLog.list.invalidate();
      utils.vintageLog.getUsedTanks.invalidate();
      toast.success("Entry logged to your Vintage Log");
      onSaved();
      resetForm();
    },
    onError: (e) => toast.error(e.message),
  });

  // Reset when opened
  useEffect(() => {
    if (open) {
      setStep(prefillTank ? 1 : 0);
      setTankName(prefillTank ?? "");
      setTankInput(prefillTank ?? "");
      setVariety("");
      setVarietyInput("");
      setEventType("");
      setDetails({});
      setNoteText("");
    }
  }, [open, prefillTank]);

  function resetForm() {
    setStep(prefillTank ? 1 : 0);
    setTankName(prefillTank ?? "");
    setTankInput(prefillTank ?? "");
    setVariety("");
    setVarietyInput("");
    setEventType("");
    setDetails({});
    setNoteText("");
  }

  // Step labels (adjusted for prefillTank)
  const stepLabels = prefillTank
    ? ["Variety", "Event type", "Details", "Note"]
    : ["Tank", "Variety", "Event type", "Details", "Note"];

  const currentLabel = stepLabels[step] ?? "";

  // Step validity
  function canAdvance(): boolean {
    const s = prefillTank ? step + 1 : step;
    if (s === 0) return tankName.trim().length > 0;
    if (s === 1) return variety.trim().length > 0;
    if (s === 2) return eventType !== "";
    if (s === 3) {
      if (eventType === "addition") return !!details.what && !!details.quantity && !!details.timing;
      if (eventType === "measurement") return !!details.what && !!details.value;
      if (eventType === "racking") return !!details.fromLocation && !!details.toLocation;
      if (eventType === "inoculation") return !!details.what && !!details.productName;
      if (eventType === "observation" || eventType === "other") return !!details.text?.trim();
      return false;
    }
    return true;
  }

  function handleNext() {
    if (step < totalSteps - 1) setStep((s) => s + 1);
    else handleSubmit();
  }

  function handleSubmit() {
    if (!eventType) return;
    addEntry.mutate({
      tankName: tankName.trim(),
      variety: variety.trim(),
      eventType,
      details,
      noteText: noteText.trim() || undefined,
    });
  }

  // Determine absolute step index (accounting for prefillTank offset)
  const absStep = prefillTank ? step + 1 : step;

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40"
        style={{ background: "oklch(0 0 0 / 0.6)", backdropFilter: "blur(4px)" }}
        onClick={onClose}
      />

      {/* Sheet — bottom-sheet on mobile, centred modal on desktop */}
      <div
        className="fixed z-50 flex flex-col"
        style={isDesktop ? {
          // Desktop: centred modal
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: "min(560px, 92vw)",
          maxHeight: "88dvh",
          background: "var(--ow-bg-raised)",
          border: "1px solid var(--ow-border-md)",
          borderRadius: "1rem",
          boxShadow: "0 32px 80px oklch(0 0 0 / 0.6)",
        } : {
          // Mobile: bottom sheet
          bottom: 0,
          left: 0,
          right: 0,
          maxHeight: "92dvh",
          background: "var(--ow-bg-raised)",
          borderTop: "1px solid var(--ow-border-md)",
          borderRadius: "1.25rem 1.25rem 0 0",
          boxShadow: "0 -24px 80px oklch(0 0 0 / 0.5)",
        }}
      >
        {/* Drag handle — mobile bottom-sheet only */}
        {!isDesktop && (
          <div className="flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 rounded-full" style={{ background: "var(--ow-border-md)" }} />
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-3 pb-2">
          <div>
            <p
              className="text-xs uppercase tracking-widest mb-0.5"
              style={{ color: "var(--ow-amber)", fontFamily: "'Fira Code', monospace" }}
            >
              {currentLabel}
            </p>
            <p
              className="text-lg font-semibold"
              style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces', serif" }}
            >
              {absStep === 0 && "Which tank?"}
              {absStep === 1 && "Grape variety?"}
              {absStep === 2 && "What happened?"}
              {absStep === 3 && "Details"}
              {absStep === 4 && "Any notes?"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
            style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-lo)" }}
          >
            ✕
          </button>
        </div>

        {/* Progress */}
        <div className="px-6">
          <StepIndicator step={step} total={totalSteps} />
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-6 pb-4">

          {/* Step 0 — Tank (skipped when prefillTank set) */}
          {absStep === 0 && (
            <div className="flex flex-col gap-3">
              <TextInput
                value={tankInput}
                onChange={(v) => { setTankInput(v); setTankName(v); }}
                placeholder="e.g. Tank 7, Barrel 12A, Stainless 3"
                autoFocus
              />
              {usedTanks.length > 0 && (
                <>
                  <p className="text-xs mt-2" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}>
                    Previous tanks
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {usedTanks.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => { setTankName(t); setTankInput(t); }}
                        className="px-3 py-1.5 rounded-sm text-sm transition-all"
                        style={{
                          background: tankName === t ? "oklch(from var(--ow-amber) l c h / 15%)" : "var(--ow-bg-inset)",
                          border: `1px solid ${tankName === t ? "var(--ow-amber)" : "var(--ow-border)"}`,
                          color: tankName === t ? "var(--ow-amber)" : "var(--ow-text-mid)",
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "0.8rem",
                        }}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}

          {/* Step 1 — Variety */}
          {absStep === 1 && (
            <div className="flex flex-col gap-3">
              <TextInput
                value={varietyInput}
                onChange={(v) => { setVarietyInput(v); setVariety(v); }}
                placeholder="e.g. Shiraz, Chardonnay, Grenache Blanc"
                autoFocus
              />
              <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}>
                Common varieties
              </p>
              <div className="flex flex-wrap gap-2">
                {COMMON_VARIETIES.map((v) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => { setVariety(v); setVarietyInput(v); }}
                    className="px-3 py-1.5 rounded-sm text-sm transition-all"
                    style={{
                      background: variety === v ? "oklch(from var(--ow-amber) l c h / 15%)" : "var(--ow-bg-inset)",
                      border: `1px solid ${variety === v ? "var(--ow-amber)" : "var(--ow-border)"}`,
                      color: variety === v ? "var(--ow-amber)" : "var(--ow-text-mid)",
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                    }}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 2 — Event type */}
          {absStep === 2 && (
            <div className="flex flex-col gap-2">
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.id}
                  type="button"
                  onClick={() => { setEventType(et.id); setDetails({}); }}
                  className="flex items-start gap-4 px-4 py-3.5 rounded text-left transition-all"
                  style={{
                    background: eventType === et.id ? "oklch(from var(--ow-amber) l c h / 10%)" : "var(--ow-bg-inset)",
                    border: `1px solid ${eventType === et.id ? "var(--ow-amber)" : "var(--ow-border)"}`,
                  }}
                >
                  <span
                    className="text-xl mt-0.5 flex-shrink-0"
                    style={{ color: eventType === et.id ? "var(--ow-amber)" : "var(--ow-text-lo)" }}
                  >
                    {et.icon}
                  </span>
                  <div>
                    <p
                      className="font-semibold text-sm"
                      style={{
                        color: eventType === et.id ? "var(--ow-amber)" : "var(--ow-text-hi)",
                        fontFamily: "'Lato', sans-serif",
                      }}
                    >
                      {et.label}
                    </p>
                    <p
                      className="text-xs mt-0.5"
                      style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}
                    >
                      {et.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step 3 — Details */}
          {absStep === 3 && (
            <>
              {eventType === "addition"    && <AdditionDetails    details={details} onChange={setDetails} />}
              {eventType === "measurement" && <MeasurementDetails details={details} onChange={setDetails} />}
              {eventType === "racking"     && <RackingDetails     details={details} onChange={setDetails} />}
              {eventType === "inoculation" && <InoculationDetails details={details} onChange={setDetails} />}
              {eventType === "observation" && <ObservationDetails details={details} onChange={setDetails} />}
              {eventType === "other"       && <OtherDetails       details={details} onChange={setDetails} />}
            </>
          )}

          {/* Step 4 — Note */}
          {absStep === 4 && (
            <div className="flex flex-col gap-4">
              {/* Summary card */}
              <div
                className="rounded p-4"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span style={{ color: "var(--ow-amber)", fontSize: "0.75rem", fontFamily: "'Fira Code', monospace" }}>
                    {EVENT_TYPES.find((e) => e.id === eventType)?.icon}
                  </span>
                  <span
                    className="text-xs uppercase tracking-widest"
                    style={{ color: "var(--ow-amber)", fontFamily: "'Fira Code', monospace" }}
                  >
                    {eventType}
                  </span>
                </div>
                <p className="text-sm font-semibold" style={{ color: "var(--ow-text-hi)", fontFamily: "'Lato', sans-serif" }}>
                  {tankName} · {variety}
                </p>
                {eventType === "addition" && details.what && (
                  <p className="text-xs mt-1" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif" }}>
                    {details.what} · {details.quantity}{details.unit} · {details.timing}
                  </p>
                )}
                {eventType === "measurement" && details.what && (
                  <p className="text-xs mt-1" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif" }}>
                    {details.what}: {details.value} {MEASUREMENT_UNIT_MAP[details.what] ?? ""}
                  </p>
                )}
                {eventType === "racking" && (
                  <p className="text-xs mt-1" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif" }}>
                    {details.fromLocation} → {details.toLocation} · {details.volumeL}L · {details.leesStatus}
                  </p>
                )}
                {eventType === "inoculation" && (
                  <p className="text-xs mt-1" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif" }}>
                    {details.what} · {details.productName} · {details.rate} g/hL
                  </p>
                )}
                {(eventType === "observation" || eventType === "other") && details.text && (
                  <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif" }}>
                    {details.text}
                  </p>
                )}
              </div>

              <div>
                <FieldLabel>Optional note</FieldLabel>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Any additional context, observations, or reminders…"
                  rows={4}
                  className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
                  style={{
                    background: "var(--ow-bg-inset)",
                    border: "1px solid var(--ow-border-md)",
                    color: "var(--ow-text-hi)",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9rem",
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
                  onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center gap-3 px-6 py-4"
          style={{ borderTop: "1px solid var(--ow-border)", background: "var(--ow-bg-raised)" }}
        >
          {step > 0 && (
            <button
              type="button"
              onClick={() => setStep((s) => s - 1)}
              className="px-4 py-3 rounded text-sm transition-colors"
              style={{
                background: "var(--ow-bg-inset)",
                border: "1px solid var(--ow-border)",
                color: "var(--ow-text-mid)",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={handleNext}
            disabled={!canAdvance() || addEntry.isPending}
            className="flex-1 py-3 rounded text-sm font-semibold transition-all"
            style={{
              background: canAdvance() && !addEntry.isPending ? "var(--ow-amber)" : "var(--ow-bg-inset)",
              color: canAdvance() && !addEntry.isPending ? "oklch(0.11 0.008 60)" : "var(--ow-text-lo)",
              fontFamily: "'Lato', sans-serif",
              cursor: canAdvance() && !addEntry.isPending ? "pointer" : "not-allowed",
              border: "none",
            }}
          >
            {addEntry.isPending
              ? "Saving…"
              : step === totalSteps - 1
              ? "Save to Log"
              : "Next →"}
          </button>
        </div>
      </div>
    </>
  );
}
