/**
 * CellarTasks (Manage) — Equipment Register
 * DailyMe-inspired: light background, equipment cards, task management
 */

import { useState } from "react";

// ── Work Mode brand accent (amber) ───────────────────────────────────────────
const ACCENT = "#B0741A"; // deep amber
const ACCENT_INK = "#2A1E0A"; // near-black warm ink for text on amber fills

interface Equipment {
  id: string;
  name: string;
  type: string;
  capacity?: string;
  qty: number;
  lastCleaned?: string;
  lastInspected?: string;
}

const MOCK_EQUIPMENT: Equipment[] = [
  {
    id: "1",
    name: "Fermentation Tank",
    type: "Tank",
    capacity: "100L",
    qty: 3,
    lastCleaned: "June 5, 2026",
    lastInspected: "June 5, 2026",
  },
  {
    id: "2",
    name: "Oak Barrel",
    type: "Barrel",
    capacity: "60L",
    qty: 2,
    lastCleaned: "May 28, 2026",
    lastInspected: "May 28, 2026",
  },
];

export default function CellarTasks() {
  const [equipment, setEquipment] = useState<Equipment[]>(MOCK_EQUIPMENT);
  const [showAddEquipment, setShowAddEquipment] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    type: "Tank",
    capacity: "",
    qty: "1",
  });

  const handleAddEquipment = () => {
    if (!formData.name.trim()) return;

    const newEquipment: Equipment = {
      id: Date.now().toString(),
      name: formData.name,
      type: formData.type,
      capacity: formData.capacity || undefined,
      qty: parseInt(formData.qty) || 1,
      lastCleaned: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
      lastInspected: new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }),
    };

    setEquipment([...equipment, newEquipment]);
    setFormData({ name: "", type: "Tank", capacity: "", qty: "1" });
    setShowAddEquipment(false);
  };

  const handleDeleteEquipment = (id: string) => {
    setEquipment(equipment.filter((item) => item.id !== id));
  };

  const totalEquipment = equipment.length;
  const activeTasks = equipment.filter((e) => {
    const lastCleaned = e.lastCleaned ? new Date(e.lastCleaned) : new Date(0);
    const daysSinceCleaned = Math.floor((Date.now() - lastCleaned.getTime()) / (1000 * 60 * 60 * 24));
    return daysSinceCleaned > 14;
  }).length;

  return (
    <>
      <div style={{ padding: "1.5rem 1.25rem", maxWidth: "640px", margin: "0 auto", width: "100%" }}>
        {/* Dashboard Header */}
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
            Equipment Register
          </h2>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              color: "#666666",
            }}
          >
            Track your cellar equipment and maintenance schedule
          </p>
        </div>

        {/* Stats */}
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
              Equipment
            </div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                color: ACCENT,
              }}
            >
              {totalEquipment}
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
              Maintenance Due
            </div>
            <div
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                color: activeTasks > 0 ? "#DC2626" : "#10B981",
              }}
            >
              {activeTasks}
            </div>
          </div>
        </div>

        {/* Add Equipment Button */}
        <button
          onClick={() => setShowAddEquipment(true)}
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
            marginBottom: "2rem",
            transition: "opacity 0.2s",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.opacity = "0.9")}
          onMouseLeave={(e) => (e.currentTarget.style.opacity = "1")}
        >
          + Add Equipment
        </button>

        {/* Equipment List */}
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
            Your Equipment
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {equipment.map((item) => {
              const lastCleaned = item.lastCleaned ? new Date(item.lastCleaned) : new Date(0);
              const daysSinceCleaned = Math.floor((Date.now() - lastCleaned.getTime()) / (1000 * 60 * 60 * 24));
              const needsMaintenance = daysSinceCleaned > 14;

              return (
                <div
                  key={item.id}
                  style={{
                    background: "#FFFFFF",
                    border: needsMaintenance ? "2px solid #DC2626" : "1px solid #E8EAED",
                    borderRadius: "12px",
                    padding: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                      marginBottom: "0.75rem",
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.9rem",
                          fontWeight: 600,
                          color: ACCENT,
                          marginBottom: "0.25rem",
                        }}
                      >
                        {item.name}
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.8rem",
                          color: "#999999",
                        }}
                      >
                        {item.type}
                        {item.capacity && ` • ${item.capacity}`}
                        {item.qty > 1 && ` • Qty: ${item.qty}`}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteEquipment(item.id)}
                      style={{
                        background: "none",
                        border: "none",
                        fontSize: "1.25rem",
                        cursor: "pointer",
                        color: "#DC2626",
                        padding: 0,
                      }}
                    >
                      ×
                    </button>
                  </div>

                  {needsMaintenance && (
                    <div
                      style={{
                        background: "#FEE2E2",
                        border: "1px solid #FECACA",
                        borderRadius: "8px",
                        padding: "0.75rem",
                        marginBottom: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.8rem",
                          color: "#DC2626",
                          fontWeight: 600,
                        }}
                      >
                        ⚠️ Maintenance Due
                      </div>
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.75rem",
                          color: "#991B1B",
                          marginTop: "0.25rem",
                        }}
                      >
                        Last cleaned {daysSinceCleaned} days ago
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      display: "flex",
                      gap: "1rem",
                      fontSize: "0.85rem",
                      color: "#666666",
                    }}
                  >
                    {item.lastCleaned && <span>Cleaned: {item.lastCleaned}</span>}
                    {item.lastInspected && <span>Inspected: {item.lastInspected}</span>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Add Equipment Sheet */}
      {showAddEquipment && (
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
              Add Equipment
            </h3>
            <button
              onClick={() => setShowAddEquipment(false)}
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
                Equipment Name
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Fermentation Tank, Oak Barrel"
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
                Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
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
                <option>Tank</option>
                <option>Barrel</option>
                <option>Press</option>
                <option>Pump</option>
                <option>Filter</option>
                <option>Cooler</option>
                <option>Other</option>
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
                Capacity (optional)
              </label>
              <input
                type="text"
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                placeholder="e.g., 100L, 60L"
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
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={formData.qty}
                onChange={(e) => setFormData({ ...formData, qty: e.target.value })}
                placeholder="1"
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

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowAddEquipment(false)}
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
                onClick={handleAddEquipment}
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
                Add Equipment
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
