/**
 * VintageEntrySheet
 * ─────────────────
 * Guided 5-step entry sheet for The Press → Vintage Log.
 * Renders as a bottom-sheet on mobile, centred modal on desktop.
 *
 * Steps:
 *   1. Tank — select from previous tanks or type a new one (+ vessel type selector)
 *   2. Variety — select common varieties or type free text (includes Kit Wine)
 *   3. Event type — Addition / Measurement / Racking / Inoculation / Observation / Other
 *   4. Details — contextual fields driven by event type
 *   5. Note — optional free-text note + confirm
 */

import { useState, useEffect, useRef, useCallback } from "react";
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

type EventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "pre_harvest_sample" | "bottling_run" | "weather_event" | "sanitation" | "other";

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
  "Kit Wine",
];

const VESSEL_TYPES: { id: string; label: string; icon: string }[] = [
  { id: "stainless_tank",    label: "Stainless Tank",      icon: "🥛" },
  { id: "open_fermenter",    label: "Open-top Fermenter",  icon: "🪣" },
  { id: "barrel",            label: "Barrel",              icon: "🛢" },
  { id: "demijohn",          label: "Demijohn",            icon: "🫙" },
  { id: "carboy",            label: "Carboy",              icon: "🧴" },
  { id: "big_mouth_bubbler", label: "Big Mouth Bubbler",   icon: "🫧" },
];

const EVENT_TYPES: { id: EventType; label: string; icon: string; description: string }[] = [
  { id: "addition",    label: "Addition",    icon: "⊕", description: "DAP, SO₂, acid, fining agents, oak" },
  { id: "measurement", label: "Measurement", icon: "◎", description: "Brix, YAN, SO₂, TA, pH, VA, temp" },
  { id: "racking",     label: "Racking",     icon: "⇄", description: "Transfer between vessels" },
  { id: "inoculation", label: "Inoculation", icon: "✦", description: "Yeast, MLF bacteria inoculation" },
  { id: "observation",       label: "Observation",       icon: "◉", description: "Sensory note, colour, aroma, visual" },
  { id: "pre_harvest_sample", label: "Pre-Harvest Sample", icon: "🌿", description: "Block sample: Brix, TA, pH, phenolics" },
  { id: "bottling_run",    label: "Bottling Run",    icon: "🍾", description: "Volume, format, lot number, label" },
  { id: "weather_event",   label: "Weather Event",   icon: "⛈", description: "Frost, heat wave, hail, smoke, rain" },
  { id: "sanitation",      label: "Sanitation",      icon: "✦", description: "Equipment cleaned, sanitant, contact time" },
  { id: "other",           label: "Other",           icon: "◈", description: "Anything else worth recording" },
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

// ─── SOP bridge: map event types to related SOP IDs in the Knowledge Platform ─
// IDs correspond to sop_library rows. Multiple IDs = multiple chips.
const EVENT_SOP_MAP: Partial<Record<string, { id: number; title: string; category: string }[]>> = {
  addition: [
    { id: 30, title: "Nutrient Management (YAN)", category: "Fermentation Management" },
    { id: 11, title: "SO₂ Management", category: "Tank Cleaning & Sanitation" },
  ],
  measurement: [
    { id: 21, title: "Brix & SG Measurement", category: "Laboratory Testing" },
    { id: 22, title: "pH & TA Measurement", category: "Laboratory Testing" },
    { id: 23, title: "Free SO₂ Analysis", category: "Laboratory Testing" },
  ],
  racking: [
    { id: 2, title: "Barrel-to-Barrel Transfer", category: "Barrel Management" },
    { id: 13, title: "Transfer & Racking Records", category: "Traceability" },
  ],
  inoculation: [
    { id: 26, title: "Yeast Inoculation", category: "Fermentation Management" },
    { id: 31, title: "MLF Inoculation & Monitoring", category: "Fermentation Management" },
  ],
  sanitation: [
    { id: 8, title: "Tank Cleaning & CIP", category: "Tank Cleaning & Sanitation" },
    { id: 9, title: "Barrel Sanitation", category: "Barrel Management" },
  ],
  bottling_run: [
    { id: 15, title: "Pre-Bottling Checklist", category: "Bottling Procedures" },
    { id: 16, title: "Bottling Line Operation", category: "Bottling Procedures" },
  ],
  observation: [
    { id: 3, title: "Barrel Inspection", category: "Barrel Management" },
    { id: 27, title: "Fermentation Monitoring", category: "Fermentation Management" },
  ],
};

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
        fontSize: "max(1rem, 16px)",
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
          fontSize: "max(1rem, 16px)",
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
              fontSize: "max(0.85rem, 16px)",
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
      <div>
        <FieldLabel>Cost per unit <span style={{fontWeight:400, opacity:0.6}}>(optional — for cost tracking)</span></FieldLabel>
        <div className="flex gap-2">
          <select
            value={details.costCurrency ?? "AUD"}
            onChange={(e) => set("costCurrency", e.target.value)}
            className="px-3 py-3 rounded"
            style={{
              background: "var(--ow-bg-inset)",
              border: "1px solid var(--ow-border-md)",
              color: "var(--ow-text-hi)",
              fontFamily: "'Fira Code', monospace",
              fontSize: "max(0.85rem, 16px)",
              minWidth: "5rem",
            }}
          >
            {["AUD","NZD","USD","EUR","GBP","ZAR"].map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <TextInput
            value={details.costPerUnit ?? ""}
            onChange={(v) => set("costPerUnit", v)}
            placeholder="e.g. 4.50"
            type="number"
          />
        </div>
        {details.costPerUnit && details.quantity && (
          <p style={{fontSize:"0.78rem", color:"var(--ow-text-lo)", marginTop:"0.4rem"}}>
            Total: {details.costCurrency ?? "AUD"} {(parseFloat(details.costPerUnit) * parseFloat(details.quantity)).toFixed(2)} {details.unit ?? ""}
          </p>
        )}
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
        <TextInput value={details.productName ?? ""} onChange={(v) => set("productName", v)} placeholder="e.g. EC-1118, Lalvin 71B, Viniflora CH11" autoFocus={!!details.what} />
      </div>
      <div>
        <FieldLabel>Rate (g/hL)</FieldLabel>
        <TextInput value={details.rate ?? ""} onChange={(v) => set("rate", v)} placeholder="e.g. 20" type="number" unit="g/hL" />
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
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  return (
    <div>
      <FieldLabel>Observation</FieldLabel>
      <textarea
        value={details.text ?? ""}
        onChange={(e) => set("text", e.target.value)}
        placeholder="Describe colour, aroma, clarity, cap activity, any sensory notes…"
        rows={5}
        autoFocus
        className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
        style={{
          background: "var(--ow-bg-inset)",
          border: "1px solid var(--ow-border-md)",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "max(1rem, 16px)",
          lineHeight: 1.6,
        }}
        onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
        onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border-md)")}
      />
    </div>
  );
}

function PreHarvestSampleDetails({
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
        <FieldLabel>Block / Vineyard name</FieldLabel>
        <TextInput value={details.blockName ?? ""} onChange={(v) => set("blockName", v)} placeholder="e.g. Block 3A, Home Vineyard" autoFocus />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Brix</FieldLabel>
          <TextInput value={details.brix ?? ""} onChange={(v) => set("brix", v)} placeholder="e.g. 24.5" type="number" unit="°Bx" />
        </div>
        <div>
          <FieldLabel>TA</FieldLabel>
          <TextInput value={details.ta ?? ""} onChange={(v) => set("ta", v)} placeholder="e.g. 6.2" type="number" unit="g/L" />
        </div>
        <div>
          <FieldLabel>pH</FieldLabel>
          <TextInput value={details.ph ?? ""} onChange={(v) => set("ph", v)} placeholder="e.g. 3.45" type="number" />
        </div>
        <div>
          <FieldLabel>YAN (mg/L)</FieldLabel>
          <TextInput value={details.yan ?? ""} onChange={(v) => set("yan", v)} placeholder="e.g. 150" type="number" unit="mg/L" />
        </div>
      </div>
      <div>
        <FieldLabel>Phenolics / colour notes</FieldLabel>
        <TextInput value={details.phenolics ?? ""} onChange={(v) => set("phenolics", v)} placeholder="e.g. Good colour, seeds browning 80%" />
      </div>
      <div>
        <FieldLabel>Additional notes</FieldLabel>
        <TextInput value={details.notes ?? ""} onChange={(v) => set("notes", v)} placeholder="e.g. Flavour development excellent, picking in 5 days" />
      </div>
    </div>
  );
}

function BottlingRunDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  const BOTTLE_FORMATS = ["750 mL", "375 mL (half)", "1.5 L (magnum)", "3 L (double magnum)", "Bag-in-box", "Other"];
  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Volume bottled</FieldLabel>
          <TextInput value={details.volumeL ?? ""} onChange={(v) => set("volumeL", v)} placeholder="e.g. 850" type="number" unit="L" autoFocus />
        </div>
        <div>
          <FieldLabel>Lot / Batch number</FieldLabel>
          <TextInput value={details.lotNumber ?? ""} onChange={(v) => set("lotNumber", v)} placeholder="e.g. SH-2024-001" />
        </div>
      </div>
      <div>
        <FieldLabel>Bottle format</FieldLabel>
        <div className="flex flex-col gap-2">
          {BOTTLE_FORMATS.map((f) => (
            <OptionButton key={f} selected={details.format === f} onClick={() => set("format", f)}>{f}</OptionButton>
          ))}
        </div>
      </div>
      <div>
        <FieldLabel>Label name</FieldLabel>
        <TextInput value={details.labelName ?? ""} onChange={(v) => set("labelName", v)} placeholder="e.g. Reserve Shiraz 2024" />
      </div>
      <div>
        <FieldLabel>Notes</FieldLabel>
        <TextInput value={details.notes ?? ""} onChange={(v) => set("notes", v)} placeholder="e.g. Free SO₂ at bottling: 32 mg/L" />
      </div>
    </div>
  );
}

function SanitationDetails({
  details,
  onChange,
}: {
  details: Record<string, string>;
  onChange: (d: Record<string, string>) => void;
}) {
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  const SANITANTS = ["Sodium metabisulfite (K-meta)", "Citric acid solution", "Peracetic acid", "Hot water (>80°C)", "Steam", "Ozone", "Other"];
  return (
    <div className="flex flex-col gap-4">
      <div>
        <FieldLabel>Equipment / vessel cleaned</FieldLabel>
        <TextInput value={details.equipment ?? ""} onChange={(v) => set("equipment", v)} placeholder="e.g. Tank 7, hoses, pump" autoFocus />
      </div>
      <div>
        <FieldLabel>Sanitant used</FieldLabel>
        <div className="flex flex-col gap-2">
          {SANITANTS.map((s) => (
            <OptionButton key={s} selected={details.sanitant === s} onClick={() => set("sanitant", s)}>{s}</OptionButton>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <FieldLabel>Concentration</FieldLabel>
          <TextInput value={details.concentration ?? ""} onChange={(v) => set("concentration", v)} placeholder="e.g. 200 ppm" />
        </div>
        <div>
          <FieldLabel>Contact time</FieldLabel>
          <TextInput value={details.contactTime ?? ""} onChange={(v) => set("contactTime", v)} placeholder="e.g. 15 min" />
        </div>
      </div>
      <div>
        <FieldLabel>Notes</FieldLabel>
        <TextInput value={details.notes ?? ""} onChange={(v) => set("notes", v)} placeholder="e.g. Rinsed 3× with cold water" />
      </div>
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
  const set = (k: string, v: string) => onChange({ ...details, [k]: v });
  return (
    <div>
      <FieldLabel>Notes</FieldLabel>
      <textarea
        value={details.text ?? ""}
        onChange={(e) => set("text", e.target.value)}
        placeholder="Describe what happened…"
        rows={5}
        autoFocus
        className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
        style={{
          background: "var(--ow-bg-inset)",
          border: "1px solid var(--ow-border-md)",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "max(1rem, 16px)",
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
  const [vesselType, setVesselType] = useState("");
  const [variety, setVariety] = useState("");
  const [varietyInput, setVarietyInput] = useState("");
  const [eventType, setEventType] = useState<EventType | "">("");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState("");
  const { data: usedTanks = [] } = trpc.vintageLog.getUsedTanks.useQuery();
  // Fetch last entry for repeat-last-entry chip
  const { data: lastEntries } = trpc.vintageLog.list.useQuery({ limit: 1 }, { enabled: !!open });
  const lastEntry = lastEntries?.[0];
  const [showRepeatChip, setShowRepeatChip] = useState(false);
  // Voice-to-text
  const [isListening, setIsListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recognitionRef = useRef<any>(null);
  const hasSpeechRecognition = typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);
  const startListening = useCallback(() => {
    if (!hasSpeechRecognition) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const W = window as any;
    const SpeechRecognitionAPI = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec: any = new SpeechRecognitionAPI();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = "en-AU";
    rec.onresult = (e: { results: { [k: number]: { [k: number]: { transcript: string } } } }) => {
      const transcript = e.results[0]?.[0]?.transcript ?? "";
      setNoteText((prev) => prev ? prev + " " + transcript : transcript);
    };
    rec.onend = () => setIsListening(false);
    rec.onerror = () => setIsListening(false);
    recognitionRef.current = rec;
    rec.start();
    setIsListening(true);
  }, [hasSpeechRecognition]);
  const stopListening = useCallback(() => {
    recognitionRef.current?.stop();
    setIsListening(false);
  }, []);
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
      setVesselType("");
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
    setVesselType("");
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
      if (eventType === "pre_harvest_sample") return !!details.blockName && !!details.brix;
      if (eventType === "bottling_run") return !!details.volumeL && !!details.lotNumber;
      if (eventType === "sanitation") return !!details.equipment?.trim();
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
    // Merge vesselType into details so it's persisted without schema change
    const mergedDetails = vesselType
      ? { ...details, vesselType }
      : details;
    addEntry.mutate({
      tankName: tankName.trim(),
      variety: variety.trim(),
      eventType,
      details: mergedDetails,
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

              {/* Vessel type selector */}
              <p className="text-xs mt-3" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}>
                Vessel type <span style={{ opacity: 0.5 }}>(optional)</span>
              </p>
              <div className="grid grid-cols-2 gap-2">
                {VESSEL_TYPES.map((vt) => (
                  <button
                    key={vt.id}
                    type="button"
                    onClick={() => setVesselType(vesselType === vt.id ? "" : vt.id)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-sm text-sm transition-all text-left"
                    style={{
                      background: vesselType === vt.id ? "oklch(from var(--ow-amber) l c h / 15%)" : "var(--ow-bg-inset)",
                      border: `1px solid ${vesselType === vt.id ? "var(--ow-amber)" : "var(--ow-border)"}`,
                      color: vesselType === vt.id ? "var(--ow-amber)" : "var(--ow-text-mid)",
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.8rem",
                    }}
                  >
                    <span style={{ fontSize: "1rem" }}>{vt.icon}</span>
                    {vt.label}
                  </button>
                ))}
              </div>
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
              {eventType === "observation"       && <ObservationDetails       details={details} onChange={setDetails} />}
              {eventType === "pre_harvest_sample" && <PreHarvestSampleDetails details={details} onChange={setDetails} />}
              {eventType === "bottling_run"       && <BottlingRunDetails       details={details} onChange={setDetails} />}
              {eventType === "sanitation"         && <SanitationDetails        details={details} onChange={setDetails} />}
              {eventType === "other"              && <OtherDetails             details={details} onChange={setDetails} />}
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
                    style={{ color: "var(--ow-text-lo)", fontFamily: "'Fira Code', monospace" }}
                  >
                    {eventType}
                  </span>
                  {vesselType && (
                    <span
                      className="text-xs px-2 py-0.5 rounded-full ml-auto"
                      style={{
                        background: "oklch(from var(--ow-amber) l c h / 10%)",
                        border: "1px solid oklch(from var(--ow-amber) l c h / 25%)",
                        color: "var(--ow-amber)",
                        fontFamily: "'Lato', sans-serif",
                      }}
                    >
                      {VESSEL_TYPES.find((v) => v.id === vesselType)?.icon}{" "}
                      {VESSEL_TYPES.find((v) => v.id === vesselType)?.label}
                    </span>
                  )}
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

              {/* SOP Bridge chips — Do→Know: link to related SOPs in Knowledge Platform */}
              {eventType && EVENT_SOP_MAP[eventType] && EVENT_SOP_MAP[eventType]!.length > 0 && (
                <div className="mb-3">
                  <p
                    className="text-xs mb-2"
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      color: "var(--ow-text-lo)",
                      letterSpacing: "0.06em",
                      textTransform: "uppercase",
                    }}
                  >
                    Related SOPs
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {EVENT_SOP_MAP[eventType]!.map((sop) => (
                      <a
                        key={sop.id}
                        href={`/knowledge/sop/${sop.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-sm"
                        style={{
                          background: "color-mix(in oklch, var(--ow-amber) 8%, var(--ow-bg-inset))",
                          border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                          color: "var(--ow-amber)",
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.75rem",
                          fontWeight: 500,
                          textDecoration: "none",
                          cursor: "pointer",
                        }}
                      >
                        <svg width="10" height="10" viewBox="0 0 10 10" fill="none" style={{ flexShrink: 0 }}>
                          <path d="M1 5h8M5 1l4 4-4 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        {sop.title}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Repeat last entry chip */}
              {lastEntry && !showRepeatChip && (
                <button
                  type="button"
                  onClick={() => {
                    setVariety(lastEntry.variety);
                    setVarietyInput(lastEntry.variety);
                    setEventType(lastEntry.eventType as EventType);
                    setDetails(lastEntry.details as Record<string, string>);
                    setNoteText(lastEntry.noteText ?? "");
                    setShowRepeatChip(true);
                    // Jump to note step
                    setStep(prefillTank ? 3 : 4);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-sm mb-3"
                  style={{
                    background: "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-inset))",
                    border: "1px dashed color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                    color: "var(--ow-text-mid)",
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.8125rem",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span style={{ color: "var(--ow-amber)", fontSize: "0.9rem" }}>↺</span>
                  <div>
                    <p style={{ fontWeight: 600, color: "var(--ow-text-hi)", marginBottom: "0.1rem" }}>Repeat last entry</p>
                    <p style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                      {lastEntry.eventType} · {lastEntry.variety} · {lastEntry.tankName}
                    </p>
                  </div>
                </button>
              )}

              <div>
                <div className="flex items-center justify-between mb-2">
                  <FieldLabel>Optional note</FieldLabel>
                  {hasSpeechRecognition && (
                    <button
                      type="button"
                      onClick={isListening ? stopListening : startListening}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-sm touch-target"
                      style={{
                        background: isListening ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "var(--ow-bg-inset)",
                        border: isListening ? "1px solid var(--ow-amber)" : "1px solid var(--ow-border)",
                        color: isListening ? "var(--ow-amber)" : "var(--ow-text-lo)",
                        fontFamily: "'Lato',sans-serif",
                        fontSize: "0.75rem",
                        cursor: "pointer",
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="4" y="1" width="4" height="6" rx="2" stroke="currentColor" strokeWidth="1.2" />
                        <path d="M2 6.5a4 4 0 0 0 8 0" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                        <path d="M6 10.5v1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                      </svg>
                      {isListening ? "Stop" : "Dictate"}
                    </button>
                  )}
                </div>
                <textarea
                  value={noteText}
                  onChange={(e) => setNoteText(e.target.value)}
                  placeholder="Any additional context, observations, or reminders…"
                  rows={4}
                  className="w-full px-4 py-3 rounded resize-none outline-none transition-all"
                  style={{
                    background: "var(--ow-bg-inset)",
                    border: isListening ? "1px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
                    color: "var(--ow-text-hi)",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "max(1rem, 16px)",
                    lineHeight: 1.6,
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
                  onBlur={(e) => { if (!isListening) e.currentTarget.style.borderColor = "var(--ow-border-md)"; }}
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
