/**
 * QUICK ENTRY — Rapid Cellar Logging
 *
 * Designed for harvest: log multiple tanks in rapid succession without
 * navigating away. Each entry fires immediately, the sheet resets to the
 * next tank, and a running session log shows what's been recorded.
 *
 * Mobile-first — 44px touch targets, bottom-sheet entry form, safe-area insets.
 */

import { useState, useRef, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";

// ─── Design tokens ────────────────────────────────────────────────────────────
const AMBER = "oklch(0.72 0.12 75)";
const BG = "oklch(0.11 0.008 60)";
const CARD_BG = "oklch(0.15 0.008 60)";
const BORDER = "oklch(1 0 0 / 0.08)";
const BORDER_MD = "oklch(1 0 0 / 0.14)";
const TEXT_HI = "oklch(0.92 0.015 75)";
const TEXT_MID = "oklch(0.72 0.015 75)";
const TEXT_LO = "oklch(0.52 0.012 75)";

// ─── Event type config ────────────────────────────────────────────────────────
const EVENT_TYPES = [
  { id: "measurement", label: "Measurement", icon: "📊", color: "oklch(0.60 0.12 200)" },
  { id: "addition", label: "Addition", icon: "⚗", color: "oklch(0.60 0.12 150)" },
  { id: "racking", label: "Racking", icon: "🔄", color: "oklch(0.60 0.12 280)" },
  { id: "inoculation", label: "Inoculation", icon: "🧫", color: "oklch(0.60 0.12 320)" },
  { id: "observation", label: "Observation", icon: "👁", color: AMBER },
  { id: "other", label: "Other", icon: "📝", color: TEXT_LO },
] as const;

type EventTypeId = typeof EVENT_TYPES[number]["id"];

// ─── Measurement options ──────────────────────────────────────────────────────
const MEASUREMENTS: { label: string; unit: string }[] = [
  { label: "Brix", unit: "°Bx" },
  { label: "YAN", unit: "ppm" },
  { label: "Free SO₂", unit: "ppm" },
  { label: "Total SO₂", unit: "ppm" },
  { label: "TA", unit: "g/L" },
  { label: "pH", unit: "" },
  { label: "VA", unit: "g/L" },
  { label: "Temperature", unit: "°C" },
  { label: "Alcohol", unit: "%" },
  { label: "Other", unit: "" },
];

const ADDITIONS = ["DAP", "SO₂ (potassium metabisulphite)", "Tartaric acid", "Bentonite", "Oak chips", "Yeast nutrients", "Enzyme", "Fining agent", "Other"];
const ADDITION_UNITS = ["g", "kg", "mL", "L", "g/hL"];
const ADDITION_TIMINGS = ["At inoculation", "⅓ sugar depletion", "½ sugar depletion", "Post-ferment", "Pre-bottling", "Other"];
const LEES_OPTIONS = ["Gross lees", "Fine lees", "Clean"];

// ─── Session log entry type ───────────────────────────────────────────────────
interface SessionEntry {
  id: string;
  tank: string;
  variety: string;
  eventType: EventTypeId;
  summary: string;
  timestamp: Date;
}

// ─── Shared input style ───────────────────────────────────────────────────────
const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "oklch(0.18 0.008 60)",
  border: `1px solid ${BORDER_MD}`,
  borderRadius: 6,
  padding: "10px 12px",
  color: TEXT_HI,
  fontFamily: "'Lato', sans-serif",
  fontSize: "1rem",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.78rem",
  color: TEXT_LO,
  marginBottom: 4,
  fontFamily: "'Lato', sans-serif",
  textTransform: "uppercase",
  letterSpacing: "0.06em",
};

// ─── Detail fields per event type ────────────────────────────────────────────
function MeasurementFields({
  details, setDetails,
}: { details: Record<string, string>; setDetails: (d: Record<string, string>) => void }) {
  const selectedMeasure = details.measureType ?? "Brix";
  const unit = MEASUREMENTS.find((m) => m.label === selectedMeasure)?.unit ?? "";

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>What was measured?</label>
        <select
          value={selectedMeasure}
          onChange={(e) => setDetails({ ...details, measureType: e.target.value, unit: MEASUREMENTS.find((m) => m.label === e.target.value)?.unit ?? "" })}
          style={inputStyle}
        >
          {MEASUREMENTS.map((m) => <option key={m.label} value={m.label}>{m.label}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Value</label>
          <input
            type="number"
            inputMode="decimal"
            placeholder="0.0"
            value={details.value ?? ""}
            onChange={(e) => setDetails({ ...details, value: e.target.value })}
            style={inputStyle}
          />
        </div>
        <div style={{ width: 80 }}>
          <label style={labelStyle}>Unit</label>
          <input
            type="text"
            value={unit || details.unit || ""}
            onChange={(e) => setDetails({ ...details, unit: e.target.value })}
            placeholder="unit"
            style={inputStyle}
          />
        </div>
      </div>
    </div>
  );
}

function AdditionFields({
  details, setDetails,
}: { details: Record<string, string>; setDetails: (d: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>What was added?</label>
        <select value={details.additionType ?? "DAP"} onChange={(e) => setDetails({ ...details, additionType: e.target.value })} style={inputStyle}>
          {ADDITIONS.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Quantity</label>
          <input type="number" inputMode="decimal" placeholder="0.0" value={details.quantity ?? ""} onChange={(e) => setDetails({ ...details, quantity: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ width: 80 }}>
          <label style={labelStyle}>Unit</label>
          <select value={details.unit ?? "kg"} onChange={(e) => setDetails({ ...details, unit: e.target.value })} style={inputStyle}>
            {ADDITION_UNITS.map((u) => <option key={u} value={u}>{u}</option>)}
          </select>
        </div>
      </div>
      <div>
        <label style={labelStyle}>Timing</label>
        <select value={details.timing ?? "At inoculation"} onChange={(e) => setDetails({ ...details, timing: e.target.value })} style={inputStyle}>
          {ADDITION_TIMINGS.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>
    </div>
  );
}

function RackingFields({
  details, setDetails,
}: { details: Record<string, string>; setDetails: (d: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>From</label>
          <input type="text" placeholder="Tank 7" value={details.from ?? ""} onChange={(e) => setDetails({ ...details, from: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>To</label>
          <input type="text" placeholder="Tank 12" value={details.to ?? ""} onChange={(e) => setDetails({ ...details, to: e.target.value })} style={inputStyle} />
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Volume (L)</label>
          <input type="number" inputMode="decimal" placeholder="0" value={details.volume ?? ""} onChange={(e) => setDetails({ ...details, volume: e.target.value })} style={inputStyle} />
        </div>
        <div style={{ flex: 1 }}>
          <label style={labelStyle}>Lees status</label>
          <select value={details.leesStatus ?? "Gross lees"} onChange={(e) => setDetails({ ...details, leesStatus: e.target.value })} style={inputStyle}>
            {LEES_OPTIONS.map((l) => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

function InoculationFields({
  details, setDetails,
}: { details: Record<string, string>; setDetails: (d: Record<string, string>) => void }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div>
        <label style={labelStyle}>What was inoculated?</label>
        <select value={details.inoculationType ?? "Yeast"} onChange={(e) => setDetails({ ...details, inoculationType: e.target.value })} style={inputStyle}>
          {["Yeast", "MLF bacteria", "Other"].map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>
      <div>
        <label style={labelStyle}>Product name</label>
        <input type="text" placeholder="e.g. EC-1118, VP41" value={details.productName ?? ""} onChange={(e) => setDetails({ ...details, productName: e.target.value })} style={inputStyle} />
      </div>
      <div>
        <label style={labelStyle}>Rate (g/hL)</label>
        <input type="number" inputMode="decimal" placeholder="20" value={details.rate ?? ""} onChange={(e) => setDetails({ ...details, rate: e.target.value })} style={inputStyle} />
      </div>
    </div>
  );
}

function ObservationFields({
  details, setDetails,
}: { details: Record<string, string>; setDetails: (d: Record<string, string>) => void }) {
  return (
    <div>
      <label style={labelStyle}>Sensory note</label>
      <textarea
        rows={4}
        placeholder="Colour, aroma, visual observation…"
        value={details.observation ?? ""}
        onChange={(e) => setDetails({ ...details, observation: e.target.value })}
        style={{ ...inputStyle, resize: "vertical", minHeight: 96 }}
      />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function QuickEntry() {
  // Auth check via vintage log query (build phase: treat auth errors as open access)
  const { data: logEntries, isLoading: authLoading } = trpc.vintageLog.list.useQuery(
    { limit: 1 },
    { retry: false }
  );
  // Build phase: always treat as logged in so the form is accessible without sign-in
  const isLoggedIn = true;
  void logEntries; // suppress unused warning

  // Known tank names for autocomplete
  const { data: tankNamesData } = trpc.vintageLog.getUsedTanks.useQuery(undefined, {
    enabled: isLoggedIn,
  });
  const tankNames = tankNamesData ?? [];

  // Form state
  const [tank, setTank] = useState("");
  const [variety, setVariety] = useState("Shiraz");
  const [eventType, setEventType] = useState<EventTypeId>("measurement");
  const [details, setDetails] = useState<Record<string, string>>({});
  const [note, setNote] = useState("");
  const [tankSuggestions, setTankSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Session log
  const [sessionLog, setSessionLog] = useState<SessionEntry[]>([]);
  const [sessionCount, setSessionCount] = useState(0);
  const tankInputRef = useRef<HTMLInputElement>(null);

  const utils = trpc.useUtils();
  const addMutation = trpc.vintageLog.add.useMutation({
    onSuccess: () => {
      // Build summary string
      let summary = "";
      if (eventType === "measurement") summary = `${details.measureType ?? "Measurement"}: ${details.value ?? "—"} ${details.unit ?? ""}`.trim();
      else if (eventType === "addition") summary = `${details.additionType ?? "Addition"} ${details.quantity ?? ""} ${details.unit ?? ""}`.trim();
      else if (eventType === "racking") summary = `Racked → ${details.to ?? "?"}`;
      else if (eventType === "inoculation") summary = `${details.inoculationType ?? "Inoculation"} — ${details.productName ?? ""}`.trim();
      else if (eventType === "observation") summary = (details.observation ?? "").slice(0, 60);
      else summary = note.slice(0, 60) || "Entry logged";

      const newEntry: SessionEntry = {
        id: Date.now().toString(),
        tank,
        variety,
        eventType,
        summary,
        timestamp: new Date(),
      };
      setSessionLog((prev) => [newEntry, ...prev]);
      setSessionCount((c) => c + 1);
      utils.vintageLog.list.invalidate();
      toast.success(`Logged: ${tank}`);

      // Reset for next entry — keep tank and variety for rapid repeat logging
      setDetails({});
      setNote("");
      // Focus tank input for next entry
      setTimeout(() => tankInputRef.current?.focus(), 100);
    },
    onError: (err) => toast.error(err.message),
  });

  function handleTankInput(val: string) {
    setTank(val);
    if (val.length >= 1) {
      const matches = tankNames.filter((t) => t.toLowerCase().includes(val.toLowerCase()));
      setTankSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  // Reset details when event type changes
  useEffect(() => { setDetails({}); }, [eventType]);

  function handleSubmit() {
    if (!tank.trim()) { toast.error("Enter a tank name"); return; }
    addMutation.mutate({
      tankName: tank.trim(),
      variety,
      eventType,
      details,
      noteText: note || undefined,
    });
  }

  const VARIETIES = ["Shiraz", "Cabernet Sauvignon", "Merlot", "Pinot Noir", "Grenache", "Tempranillo", "Chardonnay", "Sauvignon Blanc", "Riesling", "Pinot Gris", "Viognier", "Semillon", "Blend", "Other"];

  if (authLoading) {
    return (
      <div style={{ background: BG, minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: 32, height: 32, borderRadius: "50%", border: `2px solid ${BORDER_MD}`, borderTopColor: AMBER, animation: "spin 0.8s linear infinite" }} />
      </div>
    );
  }

  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "env(safe-area-inset-bottom, 24px)" }}>
      {/* Header */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 10,
          background: "oklch(0.11 0.008 60 / 95%)",
          backdropFilter: "blur(8px)",
          borderBottom: `1px solid ${BORDER}`,
          paddingTop: "env(safe-area-inset-top, 0px)",
        }}
      >
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "12px 16px", display: "flex", alignItems: "center", gap: 12 }}>
          <Link href="/the-press" style={{ color: TEXT_LO, textDecoration: "none", display: "flex", alignItems: "center", gap: 4, flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
          <div style={{ flex: 1 }}>
            <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: TEXT_HI, margin: 0, lineHeight: 1.2 }}>
              Quick Entry
            </h1>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: TEXT_LO, margin: 0 }}>
              Rapid cellar logging
            </p>
          </div>
          {sessionCount > 0 && (
            <div
              style={{
                background: "oklch(0.72 0.12 75 / 15%)",
                border: `1px solid oklch(0.72 0.12 75 / 30%)`,
                borderRadius: 20,
                padding: "3px 10px",
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.75rem",
                color: AMBER,
                flexShrink: 0,
              }}
            >
              {sessionCount} logged
            </div>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: "0 auto", padding: "16px" }}>

        {/* ── Entry form card ─────────────────────────────────────────────── */}
        <div
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER_MD}`,
            borderRadius: 12,
            padding: "20px",
            marginBottom: 20,
          }}
        >
          {/* Tank + Variety row */}
          <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
            {/* Tank */}
            <div style={{ flex: 1, position: "relative" }}>
              <label style={labelStyle}>Tank</label>
              <input
                ref={tankInputRef}
                type="text"
                placeholder="Tank 7"
                value={tank}
                onChange={(e) => handleTankInput(e.target.value)}
                onFocus={() => tank.length >= 1 && setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                autoFocus
                style={inputStyle}
              />
              {showSuggestions && (
                <div
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: 0,
                    right: 0,
                    background: "oklch(0.18 0.008 60)",
                    border: `1px solid ${BORDER_MD}`,
                    borderRadius: 6,
                    zIndex: 20,
                    maxHeight: 160,
                    overflowY: "auto",
                  }}
                >
                  {tankSuggestions.map((t: string) => (
                    <button
                      key={t}
                      onMouseDown={() => { setTank(t); setShowSuggestions(false); }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "10px 12px",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: TEXT_HI,
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.9rem",
                      }}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Variety */}
            <div style={{ flex: 1 }}>
              <label style={labelStyle}>Variety</label>
              <select value={variety} onChange={(e) => setVariety(e.target.value)} style={inputStyle}>
                {VARIETIES.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>

          {/* Event type pills */}
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Event type</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {EVENT_TYPES.map((et) => (
                <button
                  key={et.id}
                  onClick={() => setEventType(et.id)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 5,
                    padding: "7px 12px",
                    borderRadius: 20,
                    border: `1px solid ${eventType === et.id ? et.color : BORDER}`,
                    background: eventType === et.id ? `${et.color}20` : "transparent",
                    color: eventType === et.id ? et.color : TEXT_MID,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    transition: "all 0.15s",
                    minHeight: 36,
                  }}
                >
                  <span>{et.icon}</span>
                  <span>{et.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Contextual detail fields */}
          <div style={{ marginBottom: 14 }}>
            {eventType === "measurement" && <MeasurementFields details={details} setDetails={setDetails} />}
            {eventType === "addition" && <AdditionFields details={details} setDetails={setDetails} />}
            {eventType === "racking" && <RackingFields details={details} setDetails={setDetails} />}
            {eventType === "inoculation" && <InoculationFields details={details} setDetails={setDetails} />}
            {eventType === "observation" && <ObservationFields details={details} setDetails={setDetails} />}
          </div>

          {/* Optional note */}
          {eventType !== "observation" && (
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Note (optional)</label>
              <textarea
                rows={2}
                placeholder="Any additional context…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ ...inputStyle, resize: "vertical", minHeight: 60 }}
              />
            </div>
          )}

          {/* Log button */}
          <button
            onClick={handleSubmit}
            disabled={addMutation.isPending || !tank.trim()}
            style={{
              width: "100%",
              padding: "14px",
              background: tank.trim() ? AMBER : "oklch(0.25 0.008 60)",
              border: "none",
              borderRadius: 8,
              color: tank.trim() ? "oklch(0.11 0.008 60)" : TEXT_LO,
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: tank.trim() && !addMutation.isPending ? "pointer" : "not-allowed",
              transition: "all 0.15s",
              minHeight: 48,
            }}
          >
            {addMutation.isPending ? "Logging…" : "⚡ Log Entry"}
          </button>
        </div>

        {/* ── Session log ─────────────────────────────────────────────────── */}
        {sessionLog.length > 0 && (
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: TEXT_LO, textTransform: "uppercase", letterSpacing: "0.08em" }}>
                This session
              </span>
              <div style={{ flex: 1, height: 1, background: BORDER }} />
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: AMBER }}>
                {sessionCount} {sessionCount === 1 ? "entry" : "entries"}
              </span>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {sessionLog.map((entry) => {
                const et = EVENT_TYPES.find((e) => e.id === entry.eventType);
                return (
                  <div
                    key={entry.id}
                    style={{
                      background: CARD_BG,
                      border: `1px solid ${BORDER}`,
                      borderRadius: 8,
                      padding: "10px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                    }}
                  >
                    <span style={{ fontSize: "1rem", flexShrink: 0 }}>{et?.icon ?? "📝"}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI }}>
                          {entry.tank}
                        </span>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: TEXT_LO }}>
                          {entry.variety}
                        </span>
                      </div>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: TEXT_MID, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {entry.summary}
                      </p>
                    </div>
                    <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", color: TEXT_LO, flexShrink: 0 }}>
                      {entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: 16, textAlign: "center" }}>
              <Link
                href="/the-press"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.85rem",
                  color: AMBER,
                  textDecoration: "none",
                }}
              >
                View full Vintage Log →
              </Link>
            </div>
          </div>
        )}

        {/* Empty state hint */}
        {sessionLog.length === 0 && (
          <div style={{ textAlign: "center", padding: "24px 0", color: TEXT_LO }}>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", lineHeight: 1.6 }}>
              Fill in the form above and tap <strong style={{ color: AMBER }}>Log Entry</strong> to start your session.
              <br />Each entry saves instantly — keep going without navigating away.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
