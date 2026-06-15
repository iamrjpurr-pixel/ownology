/**
 * QUICK ENTRY — Harvest Floor Logging (S9-A)
 *
 * Blind-calculator model: large-target tap-only interface for cellar-floor use.
 * No keyboard appears except on Observation/Other note fields.
 * Designed for: gloved hands, bright sunlight, 30-second logging windows.
 *
 * Four screens:
 *   1. Event Type  — 6 full-height tiles
 *   2. Tank        — large tiles from wine batches + log history
 *   3. Detail      — context-specific: number pad, addition tiles, or text
 *   4. Confirm     — summary card + single LOG IT button
 *
 * Auth: handled server-side via protectedProcedure (dev bypass in trpc.ts).
 */
import { useState, useCallback, useRef } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

// ─── Design tokens ────────────────────────────────────────────────────────────
const AMBER       = "var(--ow-amber)";
const AMBER_DIM   = "color-mix(in oklch, var(--ow-amber) 18%, transparent)";
const AMBER_BDR   = "color-mix(in oklch, var(--ow-amber) 35%, transparent)";
const BG          = "oklch(0.10 0.008 60)";
const CARD        = "var(--ow-bg-raised)";
const CARD_ACT    = "var(--ow-bg-inset)";
const BDR         = "oklch(1 0 0 / 0.09)";
const TEXT_HI     = "var(--ow-text-hi)";
const TEXT_MID    = "var(--ow-text-mid)";
const TEXT_LO     = "var(--ow-text-lo)";
const GREEN       = "oklch(0.65 0.15 145)";
const GREEN_DIM   = "oklch(0.65 0.15 145 / 15%)";

// ─── Types ────────────────────────────────────────────────────────────────────
type EventTypeId = "training" | "addition" | "measurement" | "racking" | "inoculation" | "observation" | "other";
type Screen = "event" | "training_person" | "training_sop" | "training_confirm" | "tank" | "detail" | "confirm" | "success";
type AddStep = "type" | "qty" | "timing";
type InoStep = "type" | "rate";

// ─── Constants ────────────────────────────────────────────────────────────────
const EVENT_TILES: { id: EventTypeId; label: string; icon: string; color: string }[] = [
  { id: "training",    label: "Training",    icon: "🎓", color: "oklch(0.62 0.14 260)" },
  { id: "addition",    label: "Addition",    icon: "＋", color: "oklch(0.62 0.14 150)" },
  { id: "measurement", label: "Measurement", icon: "◉",  color: "oklch(0.62 0.14 200)" },
  { id: "racking",     label: "Racking",     icon: "⇄",  color: "oklch(0.62 0.14 280)" },
  { id: "inoculation", label: "Inoculation", icon: "⬡",  color: "oklch(0.62 0.14 320)" },
  { id: "observation", label: "Observation", icon: "◎",  color: AMBER },
  { id: "other",       label: "Other",       icon: "…",   color: TEXT_LO },
];

const MEASURES = [
  { label: "Brix",        unit: "°Bx" },
  { label: "SG",          unit: "" },
  { label: "pH",          unit: "" },
  { label: "TA",          unit: "g/L" },
  { label: "Free SO₂",    unit: "ppm" },
  { label: "Total SO₂",   unit: "ppm" },
  { label: "Temperature", unit: "°C" },
  { label: "VA",          unit: "g/L" },
  { label: "YAN",         unit: "ppm" },
  { label: "Alcohol",     unit: "%" },
];

const ADD_TYPES    = ["DAP", "SO₂ (KMBS)", "Tartaric acid", "Bentonite", "Oak chips", "Yeast nutrients", "Enzyme", "Fining agent", "Other"];
const ADD_UNITS    = ["g", "kg", "mL", "L", "g/hL"];
const ADD_TIMINGS  = ["At inoculation", "⅓ sugar depletion", "½ sugar depletion", "Post-ferment", "Pre-bottling", "Other"];
const LEES_OPTS    = ["Gross lees", "Fine lees", "Clean"];
const INO_TYPES    = ["Yeast", "MLF Bacteria", "Other"];

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Large-target number pad with display */
function NumberPad({ value, onChange, label, unit }: { value: string; onChange: (v: string) => void; label: string; unit: string }) {
  const append = (ch: string) => {
    if (ch === "." && value.includes(".")) return;
    if (value === "0" && ch !== ".") { onChange(ch); return; }
    onChange((value + ch).slice(0, 8));
  };
  const bsp = () => onChange(value.length > 1 ? value.slice(0, -1) : "0");
  const keys = ["7","8","9","4","5","6","1","2","3",".","0","⌫"];
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12, alignItems: "center" }}>
      <div style={{ width: "100%", maxWidth: 320, background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: "16px 20px", display: "flex", alignItems: "baseline", justifyContent: "flex-end", gap: 8 }}>
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "2.4rem", color: TEXT_HI, letterSpacing: "-0.02em" }}>{value || "0"}</span>
        {unit && <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", color: AMBER }}>{unit}</span>}
      </div>
      <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.08em", margin: 0 }}>{label}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, width: "100%", maxWidth: 320 }}>
        {keys.map((k) => (
          <button key={k} onClick={() => k === "⌫" ? bsp() : append(k)}
            style={{ height: 72, borderRadius: 10, background: k === "⌫" ? "var(--ow-bg-inset)" : CARD, border: `1px solid ${BDR}`, color: k === "⌫" ? AMBER : TEXT_HI, fontFamily: k === "⌫" ? "system-ui" : "'Fira Code',monospace", fontSize: k === "⌫" ? "1.4rem" : "1.5rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" }}
            onPointerDown={e => (e.currentTarget as HTMLButtonElement).style.background = k === "⌫" ? "oklch(0.25 0.012 60)" : CARD_ACT}
            onPointerUp={e => (e.currentTarget as HTMLButtonElement).style.background = k === "⌫" ? "var(--ow-bg-inset)" : CARD}
          >{k}</button>
        ))}
      </div>
    </div>
  );
}

/** Generic tile grid for option selection */
function Tiles<T extends string>({ options, selected, onSelect, getLabel, getColor, cols = 2 }: { options: T[]; selected: T | null; onSelect: (v: T) => void; getLabel?: (v: T) => string; getColor?: (v: T) => string; cols?: number }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: 10 }}>
      {options.map((opt) => {
        const active = opt === selected;
        const color = getColor ? getColor(opt) : AMBER;
        return (
          <button key={opt} onClick={() => onSelect(opt)}
            style={{ minHeight: 64, padding: "14px 12px", borderRadius: 10, background: active ? `${color.replace(")", " / 20%)")}` : CARD, border: `1.5px solid ${active ? color : BDR}`, color: active ? color : TEXT_MID, fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", fontWeight: active ? 600 : 400, cursor: "pointer", textAlign: "center", lineHeight: 1.3, WebkitTapHighlightColor: "transparent" }}
          >{getLabel ? getLabel(opt) : opt}</button>
        );
      })}
    </div>
  );
}

/** Progress bar + back button header */
function Header({ step, total, title, sub, onBack }: { step: number; total: number; title: string; sub?: string; onBack?: () => void }) {
  return (
    <div style={{ marginBottom: 20 }}>
      <div style={{ display: "flex", gap: 6, marginBottom: 16 }}>
        {Array.from({ length: total }).map((_, i) => (
          <div key={i} style={{ height: 3, flex: 1, borderRadius: 2, background: i < step ? AMBER : BDR, transition: "background 0.2s" }} />
        ))}
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        {onBack && (
          <button onClick={onBack} style={{ width: 40, height: 40, borderRadius: 8, background: CARD, border: `1px solid ${BDR}`, color: TEXT_MID, fontSize: "1.2rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>←</button>
        )}
        <div>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", fontWeight: 700, color: TEXT_HI, margin: 0, lineHeight: 1.2 }}>{title}</h2>
          {sub && <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: TEXT_LO, margin: "4px 0 0" }}>{sub}</p>}
        </div>
      </div>
    </div>
  );
}

// ─── Training SOP Picker ─────────────────────────────────────────────────────
function TrainingSopPicker({
  selected, onSelect, onBack, onNext, traineeName, trainingNotes, onNotesChange
}: {
  selected: number | null;
  onSelect: (id: number, title: string) => void;
  onBack: () => void;
  onNext: () => void;
  traineeName: string;
  trainingNotes: string;
  onNotesChange: (v: string) => void;
}) {
  const { data: sops = [], isLoading } = trpc.knowledge.listSops.useQuery({ audience: "commercial" });
  return (
    <div>
      <Header step={3} total={4} title="Which SOP?" sub={`Trainee: ${traineeName}`} onBack={onBack} />
      {isLoading ? (
        <p style={{ color: TEXT_LO, fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>Loading SOPs…</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, maxHeight: "45dvh", overflowY: "auto" }}>
          {sops.map(sop => (
            <button key={sop.id} onClick={() => onSelect(sop.id, sop.title)}
              style={{ minHeight: 64, borderRadius: 10, background: selected === sop.id ? AMBER_DIM : CARD, border: `1.5px solid ${selected === sop.id ? AMBER : BDR}`, color: selected === sop.id ? AMBER : TEXT_MID, fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", fontWeight: selected === sop.id ? 600 : 400, cursor: "pointer", textAlign: "left", padding: "12px 16px", lineHeight: 1.3, WebkitTapHighlightColor: "transparent" }}
            >
              <span style={{ display: "block", fontSize: "0.7rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{sop.category}</span>
              {sop.title}
            </button>
          ))}
        </div>
      )}
      <div style={{ marginTop: 16 }}>
        <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Notes <span style={{ fontWeight: 300 }}>(optional)</span></p>
        <textarea
          placeholder="Any notes about this training session…"
          value={trainingNotes}
          onChange={e => onNotesChange(e.target.value)}
          rows={2}
          style={{ width: "100%", background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, padding: "10px 14px", color: TEXT_HI, fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", lineHeight: 1.5, resize: "none", outline: "none", boxSizing: "border-box" }}
        />
      </div>
      <div style={{ marginTop: 16 }}>
        <button
          onClick={onNext}
          disabled={!selected}
          style={{ width: "100%", height: 72, background: AMBER, color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 12, fontFamily: "'Fraunces',serif", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "0.04em", cursor: selected ? "pointer" : "default", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent", opacity: selected ? 1 : 0.4 }}
        >
          Review →
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function QuickEntry() {
  // Data
  const { data: batches = [] } = trpc.wineBatch.list.useQuery();
  const { data: usedTanks = [] } = trpc.vintageLog.getUsedTanks.useQuery();
  const utils = trpc.useUtils();

  // Build tank list: batches with tankName first, then log-only tanks
  const batchTanks = batches.filter(b => b.tankName).map(b => ({ name: b.tankName!, variety: b.variety }));
  const batchNames = new Set(batchTanks.map(t => t.name));
  const logOnly = usedTanks.filter(t => !batchNames.has(t)).map(t => ({ name: t, variety: "" }));
  const allTanks = [...batchTanks, ...logOnly];

  // Screen
  const [screen, setScreen] = useState<Screen>("event");

  // Entry state
  const [eventType, setEventType] = useState<EventTypeId | null>(null);
  const [tankName, setTankName]   = useState<string | null>(null);
  const [variety, setVariety]     = useState("");

  // Measurement
  const [mType,  setMType]  = useState("Brix");
  const [mValue, setMValue] = useState("0");

  // Addition
  const [aType,    setAType]    = useState("DAP");
  const [aQty,     setAQty]     = useState("0");
  const [aUnit,    setAUnit]    = useState("kg");
  const [aTiming,  setATiming]  = useState("At inoculation");
  const [aStep,    setAStep]    = useState<AddStep>("type");

  // Racking
  const [rackTo,   setRackTo]   = useState<string | null>(null);
  const [lees,     setLees]     = useState("Fine lees");

  // Inoculation
  const [iType,    setIType]    = useState("Yeast");
  const [iProd,    setIProd]    = useState("");
  const [iRate,    setIRate]    = useState("0");
  const [iStep,    setIStep]    = useState<InoStep>("type");

  // Observation / Other
  const [noteText, setNoteText] = useState("");
  const [listening, setListening] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef = useRef<any>(null);

  // Training state
  const [traineeName, setTraineeName] = useState("");
  const [trainerName, setTrainerName] = useState("");
  const [trainingSopId, setTrainingSopId] = useState<number | null>(null);
  const [trainingSopTitle, setTrainingSopTitle] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");

  // Session log
  const [sessionLog, setSessionLog] = useState<{ tank: string; summary: string; ts: Date }[]>([]);

  // Training mutation
  const addTrainingMutation = trpc.knowledge.addTrainingRecord.useMutation({
    onSuccess: () => {
      const summary = `${trainingSopTitle} — ${traineeName}`;
      setSessionLog(prev => [{ tank: "Training", summary, ts: new Date() }, ...prev]);
      setScreen("success");
      setTimeout(() => {
        setScreen("event");
        setEventType(null); setTraineeName(""); setTrainerName("");
        setTrainingSopId(null); setTrainingSopTitle(""); setTrainingNotes("");
      }, 1800);
    },
    onError: err => toast.error(err.message),
  });

  // Mutation
  const addMutation = trpc.vintageLog.add.useMutation({
    onSuccess: () => {
      utils.vintageLog.list.invalidate();
      const summary = buildSummary();
      setSessionLog(prev => [{ tank: tankName!, summary, ts: new Date() }, ...prev]);
      setScreen("success");
      setTimeout(() => {
        setScreen("event");
        setEventType(null); setTankName(null); setVariety("");
        setMValue("0"); setAQty("0"); setAStep("type");
        setIRate("0"); setIStep("type"); setNoteText(""); setRackTo(null);
      }, 1800);
    },
    onError: err => toast.error(err.message),
  });

  // Helpers
  function buildSummary(): string {
    if (!eventType) return "";
    if (eventType === "measurement") { const u = MEASURES.find(m => m.label === mType)?.unit ?? ""; return `${mType}: ${mValue} ${u}`.trim(); }
    if (eventType === "addition")    return `${aType} ${aQty} ${aUnit} — ${aTiming}`;
    if (eventType === "racking")     return `Racked → ${rackTo ?? "?"} (${lees})`;
    if (eventType === "inoculation") return `${iType}${iProd ? ` (${iProd})` : ""} @ ${iRate} g/hL`;
    if (eventType === "observation") return noteText.slice(0, 80) || "Observation";
    return noteText.slice(0, 80) || "Other entry";
  }

  function buildDetails(): Record<string, string> {
    if (eventType === "measurement") { const u = MEASURES.find(m => m.label === mType)?.unit ?? ""; return { what: mType, value: mValue, unit: u }; }
    if (eventType === "addition")    return { what: aType, quantity: aQty, unit: aUnit, timing: aTiming };
    if (eventType === "racking")     return { to: rackTo ?? "", leesStatus: lees };
    if (eventType === "inoculation") return { inoculationType: iType, productName: iProd, rate: iRate, unit: "g/hL" };
    if (eventType === "observation") return { observation: noteText };
    return { note: noteText };
  }

  function handleSubmitTraining() {
    if (!traineeName.trim() || !trainingSopId) return;
    addTrainingMutation.mutate({
      sopId: trainingSopId,
      trainedAt: Date.now(),
      trainerName: trainerName.trim() || "Self-directed",
      traineeName: traineeName.trim(),
      notes: trainingNotes.trim() || undefined,
    });
  }

  function handleSubmit() {
    if (!tankName || !eventType) return;
    addMutation.mutate({ tankName, variety: variety || "Unknown", eventType: eventType as Exclude<EventTypeId, "training">, details: buildDetails(), noteText: (eventType === "observation" || eventType === "other") ? noteText : undefined });
  }

  function canProceed(): boolean {
    if (eventType === "measurement") return parseFloat(mValue) > 0;
    if (eventType === "addition") { if (aStep === "qty") return parseFloat(aQty) > 0; return true; }
    if (eventType === "racking") return !!rackTo;
    if (eventType === "inoculation") { if (iStep === "rate") return parseFloat(iRate) > 0; return true; }
    return true;
  }

  function detailNext() {
    if (eventType === "addition") { if (aStep === "type") { setAStep("qty"); return; } if (aStep === "qty") { setAStep("timing"); return; } }
    if (eventType === "inoculation" && iStep === "type") { setIStep("rate"); return; }
    setScreen("confirm");
  }

  function detailBack() {
    if (eventType === "addition" && aStep !== "type") { setAStep(aStep === "timing" ? "qty" : "type"); return; }
    if (eventType === "inoculation" && iStep !== "type") { setIStep("type"); return; }
    setScreen("tank");
  }

  function detailNextLabel(): string {
    if (eventType === "addition") { if (aStep === "type") return "Set quantity →"; if (aStep === "qty") return "Set timing →"; return "Review →"; }
    if (eventType === "inoculation" && iStep === "type") return "Set rate →";
    return "Review →";
  }

  const startDictation = useCallback(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) { toast.error("Voice not supported in this browser"); return; }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rec = new SR() as any;
    rec.lang = "en-AU"; rec.interimResults = false; rec.maxAlternatives = 1;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    rec.onresult = (e: any) => { setNoteText(prev => prev ? `${prev} ${e.results[0][0].transcript}` : e.results[0][0].transcript); setListening(false); };
    rec.onerror = () => { setListening(false); toast.error("Couldn't hear that — try typing"); };
    rec.onend = () => setListening(false);
    recRef.current = rec; rec.start(); setListening(true);
  }, []);

  // Shared button styles
  const primaryBtn: React.CSSProperties = { width: "100%", height: 72, background: AMBER, color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 12, fontFamily: "'Fraunces',serif", fontSize: "1.3rem", fontWeight: 700, letterSpacing: "0.04em", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };
  const secondaryBtn: React.CSSProperties = { width: "100%", height: 56, background: "transparent", color: TEXT_MID, border: `1px solid ${BDR}`, borderRadius: 10, fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", WebkitTapHighlightColor: "transparent" };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: "100dvh", fontFamily: "'Lato',sans-serif", paddingBottom: "env(safe-area-inset-bottom,24px)" }}>

      {/* Top bar */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "16px 20px 0", paddingTop: "max(16px,env(safe-area-inset-top,16px))" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: AMBER }} />
          <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1rem", color: TEXT_HI, fontWeight: 600 }}>Quick Entry</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          {sessionLog.length > 0 && (
            <span style={{ background: AMBER_DIM, color: AMBER, border: `1px solid ${AMBER_BDR}`, borderRadius: 20, padding: "3px 10px", fontSize: "0.75rem", fontWeight: 600 }}>
              {sessionLog.length} logged
            </span>
          )}
          <Link href="/the-press" style={{ color: TEXT_LO, fontSize: "0.8rem", textDecoration: "none" }}>Full Entry</Link>
        </div>
      </div>

      {/* Screen content */}
      <div style={{ padding: "20px 20px 0", maxWidth: 480, margin: "0 auto" }}>

        {/* ── SCREEN 1: Event type ── */}
        {screen === "event" && (
          <div>
            <Header step={1} total={4} title="What happened?" sub="Tap the event type" />
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {EVENT_TILES.map(tile => (
                <button key={tile.id} onClick={() => { setEventType(tile.id); if (tile.id === "training") { setScreen("training_person"); } else { setScreen("tank"); } }}
                  style={{ height: 80, borderRadius: 12, background: CARD, border: `1.5px solid ${BDR}`, display: "flex", alignItems: "center", gap: 20, padding: "0 24px", cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                  onPointerDown={e => (e.currentTarget as HTMLButtonElement).style.background = CARD_ACT}
                  onPointerUp={e => (e.currentTarget as HTMLButtonElement).style.background = CARD}
                >
                  <span style={{ fontSize: "1.8rem", color: tile.color, width: 36, textAlign: "center" }}>{tile.icon}</span>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontWeight: 600, color: TEXT_HI }}>{tile.label}</span>
                </button>
              ))}
            </div>
            {sessionLog.length > 0 && (
              <div style={{ marginTop: 28 }}>
                <p style={{ fontSize: "0.72rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 8 }}>This session</p>
                {sessionLog.slice(0, 5).map((e, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 0", borderBottom: i < Math.min(sessionLog.length, 5) - 1 ? `1px solid ${BDR}` : "none" }}>
                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: GREEN, flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: "0.88rem", color: TEXT_HI, fontWeight: 500 }}>{e.tank}</span>
                      <span style={{ fontSize: "0.82rem", color: TEXT_LO, marginLeft: 8 }}>{e.summary}</span>
                    </div>
                    <span style={{ fontSize: "0.72rem", color: TEXT_LO, flexShrink: 0 }}>{e.ts.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCREEN T2: Training — person name ── */}
        {screen === "training_person" && (
          <div>
            <Header step={2} total={4} title="Who was trained?" sub="Training record" onBack={() => setScreen("event")} />
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Trainee name</p>
                <input
                  type="text"
                  placeholder="e.g. Sarah Chen"
                  value={traineeName}
                  onChange={e => setTraineeName(e.target.value)}
                  autoFocus
                  style={{ width: "100%", background: CARD, border: `1.5px solid ${traineeName.trim() ? AMBER_BDR : BDR}`, borderRadius: 10, padding: "16px 18px", color: TEXT_HI, fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontWeight: 600, outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Trainer name <span style={{ color: TEXT_LO, fontWeight: 300 }}>(optional)</span></p>
                <input
                  type="text"
                  placeholder="e.g. James Halliday"
                  value={trainerName}
                  onChange={e => setTrainerName(e.target.value)}
                  style={{ width: "100%", background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: "14px 18px", color: TEXT_HI, fontFamily: "'Lato',sans-serif", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <button
                  onClick={() => setScreen("training_sop")}
                  disabled={!traineeName.trim()}
                  style={{ ...primaryBtn, opacity: traineeName.trim() ? 1 : 0.4, cursor: traineeName.trim() ? "pointer" : "default" }}
                >
                  Select SOP →
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── SCREEN T3: Training — SOP selection ── */}
        {screen === "training_sop" && (
          <TrainingSopPicker
            selected={trainingSopId}
            onSelect={(id, title) => { setTrainingSopId(id); setTrainingSopTitle(title); }}
            onBack={() => setScreen("training_person")}
            onNext={() => setScreen("training_confirm")}
            traineeName={traineeName}
            trainingNotes={trainingNotes}
            onNotesChange={setTrainingNotes}
          />
        )}

        {/* ── SCREEN T4: Training — confirm ── */}
        {screen === "training_confirm" && (
          <div>
            <Header step={4} total={4} title="Confirm training" onBack={() => setScreen("training_sop")} />
            <div style={{ background: CARD, border: `1.5px solid ${AMBER_BDR}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: "1.6rem" }}>🎓</span>
                <div>
                  <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, color: TEXT_HI, margin: 0 }}>Training Record</p>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: AMBER, margin: "2px 0 0" }}>{traineeName}</p>
                </div>
              </div>
              <div style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.9rem", color: TEXT_HI, background: "oklch(0.10 0.008 60)", border: `1px solid ${BDR}`, borderRadius: 8, padding: "12px 14px", lineHeight: 1.6 }}>
                <div><span style={{ color: TEXT_LO }}>SOP: </span>{trainingSopTitle}</div>
                {trainerName && <div style={{ marginTop: 4 }}><span style={{ color: TEXT_LO }}>Trainer: </span>{trainerName}</div>}
                {trainingNotes && <div style={{ marginTop: 4 }}><span style={{ color: TEXT_LO }}>Notes: </span>{trainingNotes.slice(0, 80)}{trainingNotes.length > 80 ? "…" : ""}</div>}
              </div>
            </div>
            <button onClick={handleSubmitTraining} disabled={addTrainingMutation.isPending} style={{ ...primaryBtn, opacity: addTrainingMutation.isPending ? 0.7 : 1 }}>
              {addTrainingMutation.isPending ? "Logging…" : "LOG IT"}
            </button>
            <button onClick={() => setScreen("event")} style={{ ...secondaryBtn, marginTop: 10 }}>Cancel</button>
          </div>
        )}

        {/* ── SCREEN 2: Tank selector ── */}
        {screen === "tank" && (
          <div>
            <Header step={2} total={4} title="Which tank?" sub={eventType ? EVENT_TILES.find(t => t.id === eventType)?.label : undefined} onBack={() => setScreen("event")} />
            {allTanks.length === 0 ? (
              <div style={{ background: CARD, border: `1px solid ${BDR}`, borderRadius: 12, padding: 24, textAlign: "center" }}>
                <p style={{ color: TEXT_MID, fontSize: "0.95rem", marginBottom: 12 }}>No tanks registered yet.</p>
                <Link href="/the-press" style={{ color: AMBER, fontSize: "0.9rem" }}>Add a batch in The Press →</Link>
              </div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                {allTanks.map(t => (
                  <button key={t.name} onClick={() => { setTankName(t.name); setVariety(t.variety || ""); setAStep("type"); setIStep("type"); setScreen("detail"); }}
                    style={{ minHeight: 80, borderRadius: 12, background: CARD, border: `1.5px solid ${BDR}`, display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "center", padding: "14px 16px", cursor: "pointer", WebkitTapHighlightColor: "transparent", textAlign: "left" }}
                    onPointerDown={e => { (e.currentTarget as HTMLButtonElement).style.background = CARD_ACT; (e.currentTarget as HTMLButtonElement).style.borderColor = AMBER_BDR; }}
                    onPointerUp={e => { (e.currentTarget as HTMLButtonElement).style.background = CARD; (e.currentTarget as HTMLButtonElement).style.borderColor = BDR; }}
                  >
                    <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", fontWeight: 700, color: TEXT_HI, lineHeight: 1.2 }}>{t.name}</span>
                    {t.variety && <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: AMBER, marginTop: 4 }}>{t.variety}</span>}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── SCREEN 3: Detail ── */}
        {screen === "detail" && eventType && (
          <div>
            <Header step={3} total={4}
              title={
                eventType === "measurement" ? "What was measured?" :
                eventType === "addition" ? (aStep === "type" ? "What was added?" : aStep === "qty" ? "How much?" : "When?") :
                eventType === "racking" ? "Racking details" :
                eventType === "inoculation" ? (iStep === "type" ? "What was inoculated?" : "At what rate?") :
                "Add a note"
              }
              sub={`${tankName}${variety ? ` · ${variety}` : ""}`}
              onBack={detailBack}
            />

            {/* Measurement */}
            {eventType === "measurement" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 8 }}>
                  {MEASURES.map(m => (
                    <button key={m.label} onClick={() => setMType(m.label)}
                      style={{ height: 52, borderRadius: 8, background: mType === m.label ? AMBER_DIM : CARD, border: `1.5px solid ${mType === m.label ? AMBER : BDR}`, color: mType === m.label ? AMBER : TEXT_MID, fontFamily: "'Lato',sans-serif", fontSize: "0.88rem", fontWeight: mType === m.label ? 600 : 400, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                    >{m.label}</button>
                  ))}
                </div>
                <NumberPad value={mValue} onChange={setMValue} label={mType} unit={MEASURES.find(m => m.label === mType)?.unit ?? ""} />
              </div>
            )}

            {/* Addition — type */}
            {eventType === "addition" && aStep === "type" && <Tiles options={ADD_TYPES} selected={aType} onSelect={setAType} cols={2} />}

            {/* Addition — quantity */}
            {eventType === "addition" && aStep === "qty" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5,1fr)", gap: 8 }}>
                  {ADD_UNITS.map(u => (
                    <button key={u} onClick={() => setAUnit(u)}
                      style={{ height: 48, borderRadius: 8, background: aUnit === u ? AMBER_DIM : CARD, border: `1.5px solid ${aUnit === u ? AMBER : BDR}`, color: aUnit === u ? AMBER : TEXT_MID, fontFamily: "'Fira Code',monospace", fontSize: "0.85rem", fontWeight: aUnit === u ? 600 : 400, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                    >{u}</button>
                  ))}
                </div>
                <NumberPad value={aQty} onChange={setAQty} label={aType} unit={aUnit} />
              </div>
            )}

            {/* Addition — timing */}
            {eventType === "addition" && aStep === "timing" && <Tiles options={ADD_TIMINGS} selected={aTiming} onSelect={setATiming} cols={1} />}

            {/* Racking */}
            {eventType === "racking" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                <div>
                  <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Racking to</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {allTanks.filter(t => t.name !== tankName).map(t => (
                      <button key={t.name} onClick={() => setRackTo(t.name)}
                        style={{ minHeight: 64, borderRadius: 10, background: rackTo === t.name ? AMBER_DIM : CARD, border: `1.5px solid ${rackTo === t.name ? AMBER : BDR}`, color: rackTo === t.name ? AMBER : TEXT_MID, fontFamily: "'Fraunces',serif", fontSize: "1rem", fontWeight: 600, cursor: "pointer", WebkitTapHighlightColor: "transparent" }}
                      >{t.name}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Lees status</p>
                  <Tiles options={LEES_OPTS} selected={lees} onSelect={setLees} cols={3} />
                </div>
              </div>
            )}

            {/* Inoculation — type */}
            {eventType === "inoculation" && iStep === "type" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <Tiles options={INO_TYPES} selected={iType} onSelect={setIType} cols={3} />
                <div>
                  <p style={{ fontSize: "0.78rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Product name (optional)</p>
                  <input type="text" placeholder="e.g. EC1118, Lalvin 71B" value={iProd} onChange={e => setIProd(e.target.value)}
                    style={{ width: "100%", background: CARD, border: `1px solid ${BDR}`, borderRadius: 8, padding: "12px 14px", color: TEXT_HI, fontFamily: "'Lato',sans-serif", fontSize: "1rem", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
              </div>
            )}

            {/* Inoculation — rate */}
            {eventType === "inoculation" && iStep === "rate" && (
              <NumberPad value={iRate} onChange={setIRate} label={`${iType} rate`} unit="g/hL" />
            )}

            {/* Observation / Other */}
            {(eventType === "observation" || eventType === "other") && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <textarea placeholder={eventType === "observation" ? "Describe what you observed — colour, aroma, clarity…" : "Add a note…"} value={noteText} onChange={e => setNoteText(e.target.value)} rows={5}
                  style={{ width: "100%", background: CARD, border: `1px solid ${BDR}`, borderRadius: 10, padding: "14px 16px", color: TEXT_HI, fontFamily: "'Lato',sans-serif", fontSize: "1rem", lineHeight: 1.6, resize: "vertical", outline: "none", boxSizing: "border-box" }}
                />
                <button onClick={startDictation} disabled={listening}
                  style={{ height: 52, borderRadius: 10, background: listening ? AMBER_DIM : CARD, border: `1.5px solid ${listening ? AMBER : BDR}`, color: listening ? AMBER : TEXT_MID, fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", cursor: listening ? "default" : "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, WebkitTapHighlightColor: "transparent" }}
                >
                  <span style={{ fontSize: "1.1rem" }}>{listening ? "🎙" : "🎤"}</span>
                  {listening ? "Listening…" : "Dictate note"}
                </button>
              </div>
            )}

            <div style={{ marginTop: 24 }}>
              <button onClick={detailNext} disabled={!canProceed()}
                style={{ ...primaryBtn, opacity: canProceed() ? 1 : 0.4, cursor: canProceed() ? "pointer" : "default" }}
              >{detailNextLabel()}</button>
            </div>
          </div>
        )}

        {/* ── SCREEN 4: Confirm ── */}
        {screen === "confirm" && eventType && (
          <div>
            <Header step={4} total={4} title="Confirm entry" onBack={() => setScreen("detail")} />
            <div style={{ background: CARD, border: `1.5px solid ${AMBER_BDR}`, borderRadius: 16, padding: 24, marginBottom: 24 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                <span style={{ fontSize: "1.6rem", color: EVENT_TILES.find(t => t.id === eventType)?.color ?? AMBER }}>{EVENT_TILES.find(t => t.id === eventType)?.icon}</span>
                <div>
                  <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, color: TEXT_HI, margin: 0 }}>{EVENT_TILES.find(t => t.id === eventType)?.label}</p>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: AMBER, margin: "2px 0 0" }}>{tankName}{variety ? ` · ${variety}` : ""}</p>
                </div>
              </div>
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "1rem", color: TEXT_HI, background: "oklch(0.10 0.008 60)", border: `1px solid ${BDR}`, borderRadius: 8, padding: "12px 14px", margin: 0, lineHeight: 1.5 }}>
                {buildSummary()}
              </p>
            </div>
            <button onClick={handleSubmit} disabled={addMutation.isPending} style={{ ...primaryBtn, opacity: addMutation.isPending ? 0.7 : 1 }}>
              {addMutation.isPending ? "Logging…" : "LOG IT"}
            </button>
            <button onClick={() => setScreen("event")} style={{ ...secondaryBtn, marginTop: 10 }}>Cancel</button>
          </div>
        )}

        {/* ── SCREEN 5: Success ── */}
        {screen === "success" && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", minHeight: "60dvh", gap: 16, textAlign: "center" }}>
            <div style={{ width: 80, height: 80, borderRadius: "50%", background: GREEN_DIM, border: `2px solid ${GREEN}`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "2.2rem" }}>✓</div>
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", fontWeight: 700, color: TEXT_HI, margin: 0 }}>Logged</p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", color: TEXT_LO, margin: 0 }}>{tankName}</p>
          </div>
        )}

      </div>
    </div>
  );
}
