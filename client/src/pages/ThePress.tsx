/**
 * ThePress (Log) — Cellar Logbook
 * Light surface, amber Ownology brand accent, circular progress, entry cards, soft constraints.
 * Enhanced with cross-pillar bridges (Learn More, Try it now) and analytics tracking.
 *
 * NOTE: This component renders ONLY its own content. The WorkModeLayout shell
 * (top bar + bottom nav) is provided once by the route wrapper in App.tsx.
 * Do NOT wrap this component in WorkModeLayout here — doing so duplicates the header.
 */

import { useState } from "react";
import { SopBridgeChip } from "@/components/SopSidePanel";

// ── Work Mode brand accent (amber) ───────────────────────────────────────────
// The Work Mode app is a light surface; we use a deep amber for text/strokes so
// it stays legible, with near-black text on solid amber fills.
const ACCENT = "#B0741A"; // deep amber — text, strokes, active accents
const ACCENT_HOVER = "#9A6315"; // darker amber for hover on solids
const ACCENT_INK = "#2A1E0A"; // near-black warm ink for text on amber fills
const ACCENT_SOFT = "#FBF3E4"; // amber-tinted surface (cards / callouts)
const ACCENT_BORDER = "#E8D3A8"; // soft amber border

// S8-C: Map The Press event types to real sop_library categories (commercial audience).
// Event types with no relevant SOP (e.g. Pump-Over) are intentionally omitted.
const EVENT_SOP_CATEGORY: Record<string, string> = {
  "Racking": "Pressing & Juice Handling",
  "Pressing": "Pressing & Juice Handling",
  "MLF Inoculation": "Fermentation Management",
  "Measurement": "Laboratory Testing",
  "Bottling": "Bottling Procedures",
};

interface LogEntry {
  id: string;
  tank: string;
  event: string;
  brix?: number;
  ph?: number;
  temp?: number;
  notes: string;
  date: string;
}

interface Batch {
  id: string;
  tank: string;
  variety: string;
  startDate: string;
  currentBrix: number;
  fermentationProgress: number;
  status: "setup" | "fermenting" | "pressing" | "mlf" | "bottling" | "complete";
}

const MOCK_BATCH: Batch = {
  id: "batch-1",
  tank: "Tank 1",
  variety: "2026 Shiraz",
  startDate: "June 5, 2026",
  currentBrix: 8.4,
  fermentationProgress: 65,
  status: "fermenting",
};

const MOCK_ENTRIES: LogEntry[] = [
  {
    id: "1",
    tank: "Tank 1",
    event: "Inoculation",
    brix: 24.3,
    ph: 3.2,
    temp: 68,
    notes: "Yeast rehydrated at 38°C, added to must",
    date: "June 5, 2026",
  },
  {
    id: "2",
    tank: "Tank 1",
    event: "Measurement",
    brix: 18.5,
    ph: 3.1,
    temp: 70,
    notes: "Fermentation progressing normally",
    date: "June 6, 2026",
  },
];

export default function ThePress() {
  const [entries, setEntries] = useState<LogEntry[]>(MOCK_ENTRIES);
  const [batch] = useState<Batch>(MOCK_BATCH);
  const [showAddEntry, setShowAddEntry] = useState(false);
  const [formData, setFormData] = useState({
    event: "Measurement",
    brix: "",
    ph: "",
    temp: "",
    notes: "",
  });
  const [showBypassWarning, setShowBypassWarning] = useState(false);

  // Analytics tracking helper
  const trackEvent = (eventName: string, eventData?: Record<string, any>) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", eventName, {
        event_category: "work_mode",
        event_label: "the_press",
        ...eventData,
      });
    }
  };

  const handleAddEntry = () => {
    if (!formData.notes.trim()) return;

    if (formData.event === "Pressing" && batch.currentBrix > 2) {
      trackEvent("soft_constraint_triggered", {
        constraint_type: "pressing_brix",
        current_brix: batch.currentBrix,
        threshold: 2,
      });
      setShowBypassWarning(true);
      return;
    }

    trackEvent("log_entry_saved", {
      event_type: formData.event,
      has_measurements: !!(formData.brix || formData.ph || formData.temp),
    });

    const entry: LogEntry = {
      id: Date.now().toString(),
      tank: batch.tank,
      event: formData.event,
      brix: formData.brix ? parseFloat(formData.brix) : undefined,
      ph: formData.ph ? parseFloat(formData.ph) : undefined,
      temp: formData.temp ? parseFloat(formData.temp) : undefined,
      notes: formData.notes,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };

    setEntries([entry, ...entries]);
    setFormData({ event: "Measurement", brix: "", ph: "", temp: "", notes: "" });
    setShowAddEntry(false);
  };

  const handleBypassConfirm = () => {
    trackEvent("soft_constraint_bypassed", {
      constraint_type: "pressing_brix",
      current_brix: batch.currentBrix,
    });

    const entry: LogEntry = {
      id: Date.now().toString(),
      tank: batch.tank,
      event: formData.event,
      brix: formData.brix ? parseFloat(formData.brix) : undefined,
      ph: formData.ph ? parseFloat(formData.ph) : undefined,
      temp: formData.temp ? parseFloat(formData.temp) : undefined,
      notes: `[BYPASS] ${formData.notes}`,
      date: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };

    setEntries([entry, ...entries]);
    setFormData({ event: "Measurement", brix: "", ph: "", temp: "", notes: "" });
    setShowAddEntry(false);
    setShowBypassWarning(false);
  };

  const handleLearnMore = (topic: string) => {
    trackEvent("learn_more_clicked", {
      topic,
      source: "the_press",
    });
    window.location.href = `/knowledge?category=${topic}`;
  };

  const handleTryItNow = () => {
    trackEvent("try_it_now_clicked", {
      source: "the_press",
      destination: "free_run",
    });
    window.location.href = "/free-run";
  };

  const fieldStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.875rem",
    borderRadius: "10px",
    border: "1px solid #E2E4E8",
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.95rem",
    color: "#1A1A1A",
    boxSizing: "border-box",
    background: "#FFFFFF",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.9rem",
    fontWeight: 600,
    color: "#1A1A1A",
    display: "block",
    marginBottom: "0.5rem",
  };

  return (
    <div style={{ padding: "1.5rem 1.25rem", maxWidth: "640px", margin: "0 auto", width: "100%" }}>
      {/* Compare vintages CTA */}
      <div style={{ marginBottom: "1rem", textAlign: "right" }}>
        <a
          href="/the-press/compare"
          data-testid="the-press-compare-link"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8rem",
            fontWeight: 600,
            color: ACCENT,
            textDecoration: "none",
            borderBottom: `1px solid ${ACCENT}`,
            paddingBottom: "1px",
          }}
        >
          Compare vintages side-by-side →
        </a>
      </div>

      {/* Batch Header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          justifyContent: "space-between",
          gap: "1rem",
          marginBottom: "1.75rem",
          flexWrap: "wrap",
        }}
      >
        <div>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: ACCENT,
            }}
          >
            Active Batch
          </span>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.75rem",
              fontWeight: 700,
              color: "#1A1A1A",
              margin: "0.35rem 0 0.4rem",
              lineHeight: 1.1,
            }}
          >
            {batch.variety}
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              color: "#666666",
              margin: 0,
            }}
          >
            {batch.tank} • Started {batch.startDate}
          </p>
        </div>

        {/* Circular Progress Indicator */}
        <div
          style={{
            position: "relative",
            width: "104px",
            height: "104px",
            flexShrink: 0,
          }}
        >
          <svg width="104" height="104" style={{ transform: "rotate(-90deg)" }}>
            <circle cx="52" cy="52" r="44" fill="none" stroke="#EDEFF2" strokeWidth="8" />
            <circle
              cx="52"
              cy="52"
              r="44"
              fill="none"
              stroke={ACCENT}
              strokeWidth="8"
              strokeDasharray={`${(batch.fermentationProgress / 100) * 276.5} 276.5`}
              strokeLinecap="round"
              style={{ transition: "stroke-dasharray 0.3s" }}
            />
          </svg>
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.45rem",
                fontWeight: 700,
                color: ACCENT,
                lineHeight: 1,
              }}
            >
              {batch.fermentationProgress}%
            </div>
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.6rem",
                color: "#999999",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                marginTop: "0.15rem",
              }}
            >
              Fermenting
            </div>
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "1rem",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #EDEFF2",
            borderRadius: "14px",
            padding: "1.1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              color: "#999999",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.5rem",
            }}
          >
            Current Brix
          </div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.6rem",
              fontWeight: 700,
              color: "#1A1A1A",
            }}
          >
            {batch.currentBrix}°
          </div>
        </div>
        <div
          style={{
            background: "#FFFFFF",
            border: "1px solid #EDEFF2",
            borderRadius: "14px",
            padding: "1.1rem",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.72rem",
              color: "#999999",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.5rem",
            }}
          >
            Status
          </div>
          <div
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.1rem",
              fontWeight: 700,
              color: ACCENT,
              textTransform: "capitalize",
            }}
          >
            {batch.status}
          </div>
        </div>
      </div>

      {/* Add Entry Button */}
      <button
        onClick={() => {
          trackEvent("log_entry_opened");
          setShowAddEntry(true);
        }}
        style={{
          width: "100%",
          padding: "1rem",
          borderRadius: "24px",
          border: "none",
          background: ACCENT,
          color: ACCENT_INK,
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.95rem",
          fontWeight: 700,
          cursor: "pointer",
          marginBottom: "1.75rem",
          transition: "background 0.2s",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.background = ACCENT_HOVER)}
        onMouseLeave={(e) => (e.currentTarget.style.background = ACCENT)}
      >
        + Log Entry
      </button>

      {/* Cross-pillar bridge: Learn More section */}
      <div
        style={{
          background: ACCENT_SOFT,
          border: `1px solid ${ACCENT_BORDER}`,
          borderRadius: "14px",
          padding: "1.35rem",
          marginBottom: "1.75rem",
        }}
      >
        <h3
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.78rem",
            fontWeight: 700,
            color: ACCENT,
            textTransform: "uppercase",
            letterSpacing: "0.06em",
            marginBottom: "0.6rem",
          }}
        >
          Deepen Your Knowledge
        </h3>
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.9rem",
            color: "#5A4B33",
            marginBottom: "1.1rem",
            lineHeight: 1.55,
          }}
        >
          Explore wine science, fermentation techniques, and pressing decisions to make better cellar choices.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <button
            onClick={() => handleLearnMore("fermentation")}
            style={{
              padding: "0.8rem 1rem",
              background: "#FFFFFF",
              border: `1px solid ${ACCENT}`,
              borderRadius: "10px",
              color: ACCENT,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ACCENT;
              e.currentTarget.style.color = ACCENT_INK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.color = ACCENT;
            }}
          >
            Fermentation Science
          </button>
          <button
            onClick={() => handleTryItNow()}
            style={{
              padding: "0.8rem 1rem",
              background: "#FFFFFF",
              border: `1px solid ${ACCENT}`,
              borderRadius: "10px",
              color: ACCENT,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.85rem",
              fontWeight: 600,
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = ACCENT;
              e.currentTarget.style.color = ACCENT_INK;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "#FFFFFF";
              e.currentTarget.style.color = ACCENT;
            }}
          >
            Try it now
          </button>
        </div>
      </div>

      {/* Entry History */}
      <div>
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "1.2rem",
            fontWeight: 700,
            color: "#1A1A1A",
            marginBottom: "1rem",
          }}
        >
          Recent Entries
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>
          {entries.map((entry) => (
            <div
              key={entry.id}
              style={{
                background: "#FFFFFF",
                border: "1px solid #EDEFF2",
                borderLeft: `3px solid ${ACCENT}`,
                borderRadius: "12px",
                padding: "1.05rem 1.1rem",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "0.6rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.92rem",
                    fontWeight: 700,
                    color: ACCENT,
                  }}
                >
                  {entry.event}
                </div>
                <div
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.8rem",
                    color: "#999999",
                  }}
                >
                  {entry.date}
                </div>
              </div>
              {(entry.brix || entry.ph || entry.temp) && (
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: "1rem",
                    marginBottom: "0.6rem",
                    fontSize: "0.85rem",
                    color: "#666666",
                  }}
                >
                  {entry.brix && <span>Brix: {entry.brix}°</span>}
                  {entry.ph && <span>pH: {entry.ph}</span>}
                  {entry.temp && <span>Temp: {entry.temp}°F</span>}
                </div>
              )}
              <div
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  color: "#1A1A1A",
                  lineHeight: 1.5,
                }}
              >
                {entry.notes}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Add Entry Sheet */}
      {showAddEntry && (
        <div
          style={{
            position: "fixed",
            bottom: 0,
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "460px",
            background: "#FFFFFF",
            borderTop: "1px solid #EDEFF2",
            borderRadius: "20px 20px 0 0",
            padding: "1.5rem 1.25rem",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            zIndex: 50,
            maxHeight: "80vh",
            overflowY: "auto",
            boxShadow: "0 -8px 40px rgba(0,0,0,0.12)",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: "1.5rem",
            }}
          >
            <h3
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#1A1A1A",
              }}
            >
              Log Entry
            </h3>
            <button
              onClick={() => setShowAddEntry(false)}
              style={{
                background: "none",
                border: "none",
                fontSize: "1.5rem",
                cursor: "pointer",
                color: "#999999",
              }}
              aria-label="Close"
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label style={labelStyle}>Event Type</label>
              <select
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                style={fieldStyle}
              >
                <option>Measurement</option>
                <option>Pump-Over</option>
                <option>Racking</option>
                <option>Pressing</option>
                <option>MLF Inoculation</option>
                <option>Bottling</option>
              </select>
              {EVENT_SOP_CATEGORY[formData.event] && (
                <div style={{ marginTop: "0.65rem" }}>
                  <SopBridgeChip
                    category={EVENT_SOP_CATEGORY[formData.event]}
                    eventLabel={formData.event}
                    onOpen={() => trackEvent("sop_chip_opened", { event: formData.event })}
                  />
                </div>
              )}
            </div>

            <div>
              <label style={labelStyle}>Brix (optional)</label>
              <input
                type="number"
                step="0.1"
                value={formData.brix}
                onChange={(e) => setFormData({ ...formData, brix: e.target.value })}
                placeholder="e.g., 8.4"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>pH (optional)</label>
              <input
                type="number"
                step="0.1"
                value={formData.ph}
                onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                placeholder="e.g., 3.2"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Temperature °F (optional)</label>
              <input
                type="number"
                value={formData.temp}
                onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
                placeholder="e.g., 68"
                style={fieldStyle}
              />
            </div>

            <div>
              <label style={labelStyle}>Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observations, actions taken..."
                style={{ ...fieldStyle, minHeight: "80px", resize: "vertical" }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowAddEntry(false)}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  borderRadius: "24px",
                  border: "1px solid #E2E4E8",
                  background: "#FFFFFF",
                  color: "#1A1A1A",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  borderRadius: "24px",
                  border: "none",
                  background: ACCENT,
                  color: ACCENT_INK,
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bypass Warning Modal */}
      {showBypassWarning && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "1rem",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "1.5rem",
              maxWidth: "340px",
              textAlign: "center",
            }}
          >
            <h3
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#1A1A1A",
                marginBottom: "0.75rem",
              }}
            >
              ⚠️ Soft Constraint
            </h3>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.95rem",
                color: "#666666",
                marginBottom: "1rem",
                lineHeight: 1.5,
              }}
            >
              Current Brix is {batch.currentBrix}°B. Standard practice: press at ≤2°B. Are you proceeding with extended maceration?
            </p>
            <div
              style={{
                background: ACCENT_SOFT,
                border: `1px dashed ${ACCENT}`,
                borderRadius: "10px",
                padding: "0.75rem",
                marginBottom: "1rem",
              }}
            >
              <button
                onClick={() => handleLearnMore("pressing")}
                style={{
                  background: "none",
                  border: "none",
                  color: ACCENT,
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.85rem",
                  fontWeight: 700,
                  cursor: "pointer",
                  textDecoration: "underline",
                }}
              >
                Learn more about pressing decisions →
              </button>
            </div>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowBypassWarning(false)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "1px solid #E2E4E8",
                  background: "#FFFFFF",
                  color: "#1A1A1A",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleBypassConfirm}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "10px",
                  border: "none",
                  background: ACCENT,
                  color: ACCENT_INK,
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
