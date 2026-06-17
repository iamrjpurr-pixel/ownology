/**
 * ThePress (Log) — Cellar Logbook
 * DailyMe-inspired: light background, circular progress, entry cards, soft constraints
 */

import { useState } from "react";
import WorkModeLayout from "@/components/WorkModeLayout";

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

  const handleAddEntry = () => {
    if (!formData.notes.trim()) return;

    if (formData.event === "Pressing" && batch.currentBrix > 2) {
      setShowBypassWarning(true);
      return;
    }

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

  return (
    <WorkModeLayout title="The Press" activeTab="press">
      <div style={{ padding: "1.5rem 1rem" }}>
        {/* Batch Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "0.5rem",
            }}
          >
            {batch.variety}
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              color: "#666666",
            }}
          >
            {batch.tank} • Started {batch.startDate}
          </p>
        </div>

        {/* Circular Progress Indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              position: "relative",
              width: "120px",
              height: "120px",
            }}
          >
            <svg
              width="120"
              height="120"
              style={{
                transform: "rotate(-90deg)",
              }}
            >
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#E8EAED"
                strokeWidth="8"
              />
              <circle
                cx="60"
                cy="60"
                r="50"
                fill="none"
                stroke="#2563EB"
                strokeWidth="8"
                strokeDasharray={`${(batch.fermentationProgress / 100) * 314} 314`}
                strokeLinecap="round"
                style={{
                  transition: "stroke-dasharray 0.3s",
                }}
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
                  fontSize: "1.75rem",
                  fontWeight: 700,
                  color: "#2563EB",
                }}
              >
                {batch.fermentationProgress}%
              </div>
              <div
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.75rem",
                  color: "#999999",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
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
            marginBottom: "2rem",
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              border: "1px solid #E8EAED",
              borderRadius: "12px",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                color: "#999999",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Current Brix
            </div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.5rem",
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
              border: "1px solid #E8EAED",
              borderRadius: "12px",
              padding: "1rem",
              textAlign: "center",
            }}
          >
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                color: "#999999",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                marginBottom: "0.5rem",
              }}
            >
              Status
            </div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1rem",
                fontWeight: 700,
                color: "#2563EB",
                textTransform: "capitalize",
              }}
            >
              {batch.status}
            </div>
          </div>
        </div>

        {/* Add Entry Button */}
        <button
          onClick={() => setShowAddEntry(true)}
          style={{
            width: "100%",
            padding: "1rem",
            borderRadius: "24px",
            border: "none",
            background: "#2563EB",
            color: "#FFFFFF",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.95rem",
            fontWeight: 600,
            cursor: "pointer",
            marginBottom: "2rem",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Log Entry
        </button>

        {/* Entry History */}
        <div>
          <h3
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.125rem",
              fontWeight: 700,
              color: "#1A1A1A",
              marginBottom: "1rem",
            }}
          >
            Recent Entries
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  background: "#FFFFFF",
                  border: "1px solid #E8EAED",
                  borderRadius: "12px",
                  padding: "1rem",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.75rem",
                  }}
                >
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      color: "#2563EB",
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
                      gap: "1rem",
                      marginBottom: "0.75rem",
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
            maxWidth: "430px",
            background: "#FFFFFF",
            borderTop: "1px solid #E8EAED",
            borderRadius: "20px 20px 0 0",
            padding: "1.5rem 1rem",
            paddingBottom: "calc(1.5rem + env(safe-area-inset-bottom, 0px))",
            zIndex: 50,
            maxHeight: "80vh",
            overflowY: "auto",
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
            >
              ×
            </button>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            <div>
              <label
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Event Type
              </label>
              <select
                value={formData.event}
                onChange={(e) => setFormData({ ...formData, event: e.target.value })}
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.95rem",
                  color: "#1A1A1A",
                }}
              >
                <option>Measurement</option>
                <option>Pump-Over</option>
                <option>Racking</option>
                <option>Pressing</option>
                <option>MLF Inoculation</option>
                <option>Bottling</option>
              </select>
            </div>

            <div>
              <label
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Brix (optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.brix}
                onChange={(e) => setFormData({ ...formData, brix: e.target.value })}
                placeholder="e.g., 8.4"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.95rem",
                  color: "#1A1A1A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                pH (optional)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.ph}
                onChange={(e) => setFormData({ ...formData, ph: e.target.value })}
                placeholder="e.g., 3.2"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.95rem",
                  color: "#1A1A1A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Temperature °F (optional)
              </label>
              <input
                type="number"
                value={formData.temp}
                onChange={(e) => setFormData({ ...formData, temp: e.target.value })}
                placeholder="e.g., 68"
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.95rem",
                  color: "#1A1A1A",
                  boxSizing: "border-box",
                }}
              />
            </div>

            <div>
              <label
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  color: "#1A1A1A",
                  display: "block",
                  marginBottom: "0.5rem",
                }}
              >
                Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Observations, actions taken..."
                style={{
                  width: "100%",
                  padding: "0.875rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.95rem",
                  color: "#1A1A1A",
                  boxSizing: "border-box",
                  minHeight: "80px",
                  resize: "vertical",
                }}
              />
            </div>

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowAddEntry(false)}
                style={{
                  flex: 1,
                  padding: "0.875rem",
                  borderRadius: "24px",
                  border: "1px solid #E8EAED",
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
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bypass Warning */}
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
          }}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "1.5rem",
              maxWidth: "320px",
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
                marginBottom: "1.5rem",
                lineHeight: 1.5,
              }}
            >
              Current Brix is {batch.currentBrix}°B. Standard practice: press at ≤2°B. Are you proceeding with extended maceration?
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowBypassWarning(false)}
                style={{
                  flex: 1,
                  padding: "0.75rem",
                  borderRadius: "8px",
                  border: "1px solid #E8EAED",
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
                  borderRadius: "8px",
                  border: "none",
                  background: "#2563EB",
                  color: "#FFFFFF",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Proceed
              </button>
            </div>
          </div>
        </div>
      )}
    </WorkModeLayout>
  );
}
