/**
 * ThePress — Cellar Logbook (Vintage Log)
 * 
 * Simple, readable UI for logging cellar events:
 * - Vintage status badge
 * - Log entries list (empty state shown)
 * - Add Entry button (prominent, 44px)
 * - Clean typography and spacing
 */

import { useState } from "react";
import { Plus } from "lucide-react";

interface LogEntry {
  id: string;
  tank: string;
  event: string;
  date: string;
  notes: string;
}

export default function ThePress() {
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [showAddSheet, setShowAddSheet] = useState(false);
  const [newEntry, setNewEntry] = useState({ tank: "", event: "measurement", notes: "" });

  const handleAddEntry = () => {
    if (!newEntry.tank.trim()) return;
    
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      tank: newEntry.tank,
      event: newEntry.event,
      date: new Date().toLocaleDateString(),
      notes: newEntry.notes,
    };
    
    setEntries([entry, ...entries]);
    setNewEntry({ tank: "", event: "measurement", notes: "" });
    setShowAddSheet(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#f5f5f5" }}>
      {/* Header */}
      <div style={{ padding: "24px 16px", borderBottom: "1px solid #333333" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>The Press</h1>
        <p style={{ fontSize: "14px", color: "#a0a0a0", lineHeight: 1.5 }}>
          Record every cellar event — additions, measurements, rackings, inoculations.
        </p>
      </div>

      {/* Vintage Status */}
      <div style={{ padding: "16px", backgroundColor: "#1a1a1a", borderBottom: "1px solid #333333" }}>
        <div style={{ fontSize: "12px", color: "#d4a574", fontWeight: 600, letterSpacing: "0.5px", marginBottom: "8px" }}>
          VINTAGE 2026 — IN PROGRESS
        </div>
        <div style={{ fontSize: "13px", color: "#a0a0a0" }}>
          0 log entries · 0 calculations
        </div>
      </div>

      {/* Content Area */}
      <div style={{ padding: "24px 16px" }}>
        {entries.length === 0 ? (
          // Empty State
          <div style={{ textAlign: "center", paddingTop: "48px", paddingBottom: "48px" }}>
            <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>📋</div>
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
              Your vintage log is ready
            </h2>
            <p style={{ fontSize: "14px", color: "#a0a0a0", lineHeight: 1.6, marginBottom: "24px" }}>
              Log every cellar event — additions, measurements, rackings, inoculations — and Ownology builds a permanent, searchable record of your vintage.
            </p>
          </div>
        ) : (
          // Entries List
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  padding: "16px",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "8px" }}>
                  <div style={{ fontSize: "14px", fontWeight: 600, color: "#f5f5f5" }}>
                    {entry.tank}
                  </div>
                  <div style={{ fontSize: "12px", color: "#a0a0a0" }}>
                    {entry.date}
                  </div>
                </div>
                <div style={{ fontSize: "13px", color: "#d4a574", marginBottom: "8px" }}>
                  {entry.event.charAt(0).toUpperCase() + entry.event.slice(1)}
                </div>
                {entry.notes && (
                  <div style={{ fontSize: "13px", color: "#a0a0a0", lineHeight: 1.5 }}>
                    {entry.notes}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Button */}
      <div style={{ padding: "16px", position: "sticky", bottom: "64px" }}>
        <button
          onClick={() => setShowAddSheet(true)}
          style={{
            width: "100%",
            height: "44px",
            backgroundColor: "#d4a574",
            color: "#0a0a0a",
            border: "none",
            borderRadius: "4px",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "8px",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          <Plus size={18} />
          Log Entry
        </button>
      </div>

      {/* Add Entry Sheet */}
      {showAddSheet && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            backgroundColor: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "flex-end",
            zIndex: 100,
          }}
          onClick={() => setShowAddSheet(false)}
        >
          <div
            style={{
              backgroundColor: "#1a1a1a",
              width: "100%",
              borderRadius: "12px 12px 0 0",
              padding: "24px 16px",
              paddingBottom: "calc(24px + env(safe-area-inset-bottom))",
              maxHeight: "80vh",
              overflowY: "auto",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "20px" }}>
              Log Entry
            </h2>

            {/* Tank Input */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#a0a0a0", display: "block", marginBottom: "8px" }}>
                Tank Name
              </label>
              <input
                type="text"
                value={newEntry.tank}
                onChange={(e) => setNewEntry({ ...newEntry, tank: e.target.value })}
                placeholder="e.g. Tank 7, Barrel A1"
                style={{
                  width: "100%",
                  height: "44px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  color: "#f5f5f5",
                  padding: "0 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Event Type Select */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ fontSize: "12px", color: "#a0a0a0", display: "block", marginBottom: "8px" }}>
                Event Type
              </label>
              <select
                value={newEntry.event}
                onChange={(e) => setNewEntry({ ...newEntry, event: e.target.value })}
                style={{
                  width: "100%",
                  height: "44px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  color: "#f5f5f5",
                  padding: "0 12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                }}
              >
                <option value="measurement">Measurement (Brix, pH, SO₂)</option>
                <option value="addition">Addition (DAP, SO₂, tartaric)</option>
                <option value="inoculation">Inoculation (Yeast)</option>
                <option value="racking">Racking</option>
                <option value="note">General Note</option>
              </select>
            </div>

            {/* Notes Input */}
            <div style={{ marginBottom: "20px" }}>
              <label style={{ fontSize: "12px", color: "#a0a0a0", display: "block", marginBottom: "8px" }}>
                Notes (Optional)
              </label>
              <textarea
                value={newEntry.notes}
                onChange={(e) => setNewEntry({ ...newEntry, notes: e.target.value })}
                placeholder="Add any details..."
                style={{
                  width: "100%",
                  minHeight: "100px",
                  backgroundColor: "#0a0a0a",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  color: "#f5f5f5",
                  padding: "12px",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  resize: "vertical",
                }}
              />
            </div>

            {/* Action Buttons */}
            <div style={{ display: "flex", gap: "12px" }}>
              <button
                onClick={() => setShowAddSheet(false)}
                style={{
                  flex: 1,
                  height: "44px",
                  backgroundColor: "#333333",
                  color: "#f5f5f5",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.8")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Cancel
              </button>
              <button
                onClick={handleAddEntry}
                style={{
                  flex: 1,
                  height: "44px",
                  backgroundColor: "#d4a574",
                  color: "#0a0a0a",
                  border: "none",
                  borderRadius: "4px",
                  fontSize: "14px",
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "opacity 0.2s",
                }}
                onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
                onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
