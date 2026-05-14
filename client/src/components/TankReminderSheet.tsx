/**
 * TankReminderSheet — slide-up sheet for managing tank reminders.
 * Opens from the Vintage Log tab via the bell icon on each tank row,
 * or from a dedicated "Reminders" button in the tab header.
 *
 * Lets the winemaker set: which tank, which event type to watch,
 * and how many hours before a warning fires.
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Bell, BellOff, Trash2, Plus, X, Clock } from "lucide-react";
import { toast } from "sonner";

const EVENT_TYPE_OPTIONS = [
  { value: "any", label: "Any activity" },
  { value: "measurement", label: "Measurement" },
  { value: "addition", label: "Addition" },
  { value: "racking", label: "Racking" },
  { value: "inoculation", label: "Inoculation" },
  { value: "observation", label: "Observation" },
] as const;

const THRESHOLD_OPTIONS = [
  { value: 6, label: "6 hours" },
  { value: 12, label: "12 hours" },
  { value: 24, label: "24 hours (1 day)" },
  { value: 48, label: "48 hours (2 days)" },
  { value: 72, label: "3 days" },
  { value: 120, label: "5 days" },
  { value: 168, label: "7 days" },
];

const AMBER = "oklch(0.72 0.12 75)";
const BG = "oklch(0.11 0.008 60)";
const CARD_BG = "oklch(0.15 0.008 60)";
const BORDER = "oklch(1 0 0 / 0.08)";
const TEXT_MAIN = "oklch(0.92 0.015 75)";
const TEXT_MUTED = "oklch(0.60 0.012 75)";

interface Props {
  open: boolean;
  onClose: () => void;
  /** Pre-fill the tank name when opened from a specific tank row */
  defaultTankName?: string;
  /** All known tank names for the autocomplete */
  tankNames: string[];
}

export default function TankReminderSheet({ open, onClose, defaultTankName, tankNames }: Props) {
  const utils = trpc.useUtils();

  // ── Fetch existing reminders ──────────────────────────────────────────────
  const { data: reminders = [], isLoading } = trpc.vintageReminder.list.useQuery(undefined, {
    enabled: open,
  });

  // ── New reminder form state ───────────────────────────────────────────────
  const [tankName, setTankName] = useState(defaultTankName ?? "");
  const [eventType, setEventType] = useState<string>("any");
  const [thresholdHours, setThresholdHours] = useState(24);
  const [showForm, setShowForm] = useState(false);
  const [tankSuggestions, setTankSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Sync default tank name when prop changes
  useEffect(() => {
    if (defaultTankName) {
      setTankName(defaultTankName);
      setShowForm(true);
    }
  }, [defaultTankName]);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const upsertMutation = trpc.vintageReminder.upsert.useMutation({
    onSuccess: () => {
      utils.vintageReminder.list.invalidate();
      setShowForm(false);
      setTankName(defaultTankName ?? "");
      setEventType("any");
      setThresholdHours(24);
      toast.success("Reminder saved");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.vintageReminder.delete.useMutation({
    onSuccess: () => {
      utils.vintageReminder.list.invalidate();
      toast.success("Reminder removed");
    },
    onError: (err) => toast.error(err.message),
  });

  const toggleMutation = trpc.vintageReminder.upsert.useMutation({
    onSuccess: () => utils.vintageReminder.list.invalidate(),
    onError: (err) => toast.error(err.message),
  });

  // ── Tank autocomplete ─────────────────────────────────────────────────────
  function handleTankInput(val: string) {
    setTankName(val);
    if (val.length >= 1) {
      const matches = tankNames.filter((t) =>
        t.toLowerCase().includes(val.toLowerCase())
      );
      setTankSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  }

  function handleSave() {
    if (!tankName.trim()) {
      toast.error("Please enter a tank name");
      return;
    }
    upsertMutation.mutate({
      tankName: tankName.trim(),
      eventType: eventType as "addition" | "measurement" | "racking" | "inoculation" | "observation" | "any",
      thresholdHours,
      isActive: true,
    });
  }

  if (!open) return null;

  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 50,
          background: "oklch(0 0 0 / 0.6)",
          backdropFilter: "blur(2px)",
        }}
      />

      {/* Sheet / Modal */}
      <div
        style={{
          position: "fixed",
          zIndex: 51,
          background: BG,
          border: `1px solid ${BORDER}`,
          ...(isDesktop
            ? {
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: "480px",
                maxHeight: "85vh",
                borderRadius: "12px",
                overflowY: "auto",
              }
            : {
                bottom: 0,
                left: 0,
                right: 0,
                borderRadius: "16px 16px 0 0",
                maxHeight: "90vh",
                overflowY: "auto",
                paddingBottom: "env(safe-area-inset-bottom, 0px)",
              }),
        }}
      >
        {/* Drag handle (mobile) */}
        {!isDesktop && (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "12px", paddingBottom: "4px" }}>
            <div style={{ width: 36, height: 4, borderRadius: 2, background: "oklch(1 0 0 / 0.15)" }} />
          </div>
        )}

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Bell size={18} style={{ color: AMBER }} />
            <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", color: TEXT_MAIN }}>
              Tank Reminders
            </span>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, padding: 4 }}
          >
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "16px 20px" }}>
          {/* Existing reminders list */}
          {isLoading ? (
            <div style={{ color: TEXT_MUTED, fontSize: "0.875rem", textAlign: "center", padding: "24px 0" }}>
              Loading reminders…
            </div>
          ) : reminders.length === 0 && !showForm ? (
            <div style={{ textAlign: "center", padding: "24px 0" }}>
              <Bell size={32} style={{ color: TEXT_MUTED, margin: "0 auto 12px" }} />
              <p style={{ color: TEXT_MUTED, fontSize: "0.875rem", marginBottom: 16 }}>
                No reminders set. Add one to get notified when a tank is overdue for a log entry.
              </p>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: reminders.length > 0 ? 16 : 0 }}>
              {reminders.map((r) => {
                const eventLabel = EVENT_TYPE_OPTIONS.find((e) => e.value === r.eventType)?.label ?? r.eventType;
                const thresholdLabel = THRESHOLD_OPTIONS.find((t) => t.value === r.thresholdHours)?.label ?? `${r.thresholdHours}h`;
                return (
                  <div
                    key={r.id}
                    style={{
                      background: CARD_BG,
                      border: `1px solid ${r.isActive ? "oklch(0.72 0.12 75 / 25%)" : BORDER}`,
                      borderRadius: 8,
                      padding: "12px 14px",
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    {/* Toggle active */}
                    <button
                      onClick={() =>
                        toggleMutation.mutate({
                          tankName: r.tankName,
                          eventType: r.eventType as "addition" | "measurement" | "racking" | "inoculation" | "observation" | "any",
                          thresholdHours: r.thresholdHours,
                          isActive: !r.isActive,
                        })
                      }
                      style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}
                      title={r.isActive ? "Disable reminder" : "Enable reminder"}
                    >
                      {r.isActive ? (
                        <Bell size={16} style={{ color: AMBER }} />
                      ) : (
                        <BellOff size={16} style={{ color: TEXT_MUTED }} />
                      )}
                    </button>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.9rem", color: TEXT_MAIN }}>
                          {r.tankName}
                        </span>
                        <span
                          style={{
                            fontSize: "0.7rem",
                            padding: "1px 6px",
                            borderRadius: 4,
                            background: "oklch(0.72 0.12 75 / 15%)",
                            color: AMBER,
                            fontFamily: "'Fira Code', monospace",
                          }}
                        >
                          {eventLabel}
                        </span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 2 }}>
                        <Clock size={11} style={{ color: TEXT_MUTED }} />
                        <span style={{ fontSize: "0.75rem", color: TEXT_MUTED, fontFamily: "'Lato', sans-serif" }}>
                          Warn after {thresholdLabel} without entry
                        </span>
                      </div>
                    </div>

                    {/* Delete */}
                    <button
                      onClick={() => deleteMutation.mutate({ id: r.id })}
                      style={{ background: "none", border: "none", cursor: "pointer", color: TEXT_MUTED, flexShrink: 0 }}
                      title="Remove reminder"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add new reminder form */}
          {showForm ? (
            <div
              style={{
                background: CARD_BG,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "16px",
              }}
            >
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: TEXT_MUTED, marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                New Reminder
              </p>

              {/* Tank name */}
              <div style={{ marginBottom: 12, position: "relative" }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: 4, fontFamily: "'Lato', sans-serif" }}>
                  Tank
                </label>
                <input
                  type="text"
                  value={tankName}
                  onChange={(e) => handleTankInput(e.target.value)}
                  onFocus={() => tankName.length >= 1 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                  placeholder="e.g. Tank 7"
                  style={{
                    width: "100%",
                    background: "oklch(0.18 0.008 60)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    color: TEXT_MAIN,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "1rem",
                    outline: "none",
                    boxSizing: "border-box",
                  }}
                />
                {showSuggestions && (
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      background: "oklch(0.18 0.008 60)",
                      border: `1px solid ${BORDER}`,
                      borderRadius: 6,
                      zIndex: 10,
                      maxHeight: 160,
                      overflowY: "auto",
                    }}
                  >
                    {tankSuggestions.map((t) => (
                      <button
                        key={t}
                        onMouseDown={() => { setTankName(t); setShowSuggestions(false); }}
                        style={{
                          display: "block",
                          width: "100%",
                          textAlign: "left",
                          padding: "10px 12px",
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: TEXT_MAIN,
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

              {/* Event type */}
              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: 4, fontFamily: "'Lato', sans-serif" }}>
                  Watch for
                </label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  style={{
                    width: "100%",
                    background: "oklch(0.18 0.008 60)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    color: TEXT_MAIN,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                >
                  {EVENT_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
              </div>

              {/* Threshold */}
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: "block", fontSize: "0.8rem", color: TEXT_MUTED, marginBottom: 4, fontFamily: "'Lato', sans-serif" }}>
                  Warn after
                </label>
                <select
                  value={thresholdHours}
                  onChange={(e) => setThresholdHours(Number(e.target.value))}
                  style={{
                    width: "100%",
                    background: "oklch(0.18 0.008 60)",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    padding: "10px 12px",
                    color: TEXT_MAIN,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "1rem",
                    outline: "none",
                  }}
                >
                  {THRESHOLD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label} without entry</option>
                  ))}
                </select>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => setShowForm(false)}
                  style={{
                    flex: 1,
                    padding: "10px",
                    background: "none",
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    color: TEXT_MUTED,
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9rem",
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={upsertMutation.isPending}
                  style={{
                    flex: 2,
                    padding: "10px",
                    background: AMBER,
                    border: "none",
                    borderRadius: 6,
                    color: "oklch(0.11 0.008 60)",
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.9rem",
                    cursor: upsertMutation.isPending ? "not-allowed" : "pointer",
                    opacity: upsertMutation.isPending ? 0.7 : 1,
                  }}
                >
                  {upsertMutation.isPending ? "Saving…" : "Save Reminder"}
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                width: "100%",
                padding: "12px",
                background: "oklch(0.72 0.12 75 / 10%)",
                border: `1px dashed oklch(0.72 0.12 75 / 40%)`,
                borderRadius: 8,
                color: AMBER,
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Reminder
            </button>
          )}
        </div>
      </div>
    </>
  );
}
