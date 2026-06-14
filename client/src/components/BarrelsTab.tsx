/**
 * BarrelsTab — DR-08
 * Barrel sub-module for The Press. Shows a list of barrels with oak type,
 * format, age, current wine lot, and days since last topping. Supports
 * add, edit, record-topping, and delete operations.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Plus, Droplets, Edit2, Trash2, Check } from "lucide-react";

const OAK_TYPES = ["French", "American", "Hungarian", "Slavonian", "Other"] as const;
const BARREL_FORMATS = [
  "Barrique (225L)",
  "Hogshead (300L)",
  "Puncheon (500L)",
  "Foudre (>500L)",
  "Other",
] as const;

type OakType = (typeof OAK_TYPES)[number];
type BarrelFormat = (typeof BARREL_FORMATS)[number];

interface BarrelFormState {
  barrelId: string;
  oakType: OakType;
  format: BarrelFormat;
  ageYears: number;
  fillDate: string;
  wineLot: string;
  notes: string;
}

const EMPTY_FORM: BarrelFormState = {
  barrelId: "",
  oakType: "French",
  format: "Barrique (225L)",
  ageYears: 0,
  fillDate: "",
  wineLot: "",
  notes: "",
};

function daysSince(ts: number | null | undefined): string {
  if (!ts) return "—";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days}d ago`;
}

function toppingUrgency(ts: number | null | undefined): "ok" | "warn" | "overdue" {
  if (!ts) return "overdue";
  const days = Math.floor((Date.now() - ts) / 86400000);
  if (days <= 14) return "ok";
  if (days <= 21) return "warn";
  return "overdue";
}

export default function BarrelsTab() {
  const { data: barrels = [], refetch } = trpc.barrel.list.useQuery();
  const createBarrel = trpc.barrel.create.useMutation({ onSuccess: () => refetch() });
  const updateBarrel = trpc.barrel.update.useMutation({ onSuccess: () => refetch() });
  const recordTopping = trpc.barrel.recordTopping.useMutation({ onSuccess: () => refetch() });
  const deleteBarrel = trpc.barrel.delete.useMutation({ onSuccess: () => refetch() });

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<BarrelFormState>(EMPTY_FORM);
  const [toppingId, setToppingId] = useState<number | null>(null);

  const openAdd = () => {
    setEditId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (b: (typeof barrels)[0]) => {
    setEditId(b.id);
    setForm({
      barrelId: b.barrelId,
      oakType: (b.oakType as OakType) ?? "French",
      format: (b.format as BarrelFormat) ?? "Barrique (225L)",
      ageYears: b.ageYears ?? 0,
      fillDate: b.fillDate ? new Date(b.fillDate).toISOString().slice(0, 10) : "",
      wineLot: b.wineLot ?? "",
      notes: b.notes ?? "",
    });
    setShowForm(true);
  };

  const handleSubmit = () => {
    const payload = {
      barrelId: form.barrelId,
      oakType: form.oakType,
      format: form.format,
      ageYears: form.ageYears,
      fillDate: form.fillDate ? new Date(form.fillDate).getTime() : undefined,
      wineLot: form.wineLot || undefined,
      notes: form.notes || undefined,
    };
    if (editId !== null) {
      updateBarrel.mutate({ id: editId, ...payload }, { onSuccess: () => setShowForm(false) });
    } else {
      createBarrel.mutate(payload, { onSuccess: () => setShowForm(false) });
    }
  };

  const urgencyColor = {
    ok: "oklch(0.55 0.14 145)",
    warn: "oklch(0.72 0.12 75)",
    overdue: "oklch(0.60 0.18 25)",
  };

  return (
    <div style={{ fontFamily: "'Lato', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.125rem", color: "var(--ow-text-hi)", fontWeight: 600 }}>
            Barrel Register
          </h3>
          <p style={{ fontSize: "0.8125rem", color: "var(--ow-text-lo)", marginTop: "2px" }}>
            {barrels.filter((b) => b.isActive).length} active barrel{barrels.filter((b) => b.isActive).length !== 1 ? "s" : ""}
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded text-sm"
          style={{
            background: "oklch(0.72 0.12 75 / 12%)",
            color: "oklch(0.72 0.12 75)",
            border: "1px solid oklch(0.72 0.12 75 / 28%)",
            cursor: "pointer",
          }}
        >
          <Plus className="w-4 h-4" />
          Add Barrel
        </button>
      </div>

      {/* Add / Edit Form */}
      {showForm && (
        <div
          className="rounded p-5 mb-5"
          style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)" }}
        >
          <h4 style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--ow-text-hi)", marginBottom: "1rem" }}>
            {editId !== null ? "Edit Barrel" : "New Barrel"}
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Barrel ID */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Barrel ID *
              </label>
              <input
                value={form.barrelId}
                onChange={(e) => setForm((f) => ({ ...f, barrelId: e.target.value }))}
                placeholder="e.g. B-001"
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              />
            </div>
            {/* Oak Type */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Oak Type
              </label>
              <select
                value={form.oakType}
                onChange={(e) => setForm((f) => ({ ...f, oakType: e.target.value as OakType }))}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              >
                {OAK_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            {/* Format */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Format
              </label>
              <select
                value={form.format}
                onChange={(e) => setForm((f) => ({ ...f, format: e.target.value as BarrelFormat }))}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              >
                {BARREL_FORMATS.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </div>
            {/* Age */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Age at first fill (years)
              </label>
              <input
                type="number"
                min={0}
                max={100}
                value={form.ageYears}
                onChange={(e) => setForm((f) => ({ ...f, ageYears: parseInt(e.target.value) || 0 }))}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              />
            </div>
            {/* Fill Date */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Fill Date
              </label>
              <input
                type="date"
                value={form.fillDate}
                onChange={(e) => setForm((f) => ({ ...f, fillDate: e.target.value }))}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              />
            </div>
            {/* Wine Lot */}
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Wine Lot / Batch
              </label>
              <input
                value={form.wineLot}
                onChange={(e) => setForm((f) => ({ ...f, wineLot: e.target.value }))}
                placeholder="e.g. 2024 Shiraz Block 3"
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
              />
            </div>
            {/* Notes */}
            <div className="sm:col-span-2">
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", display: "block", marginBottom: "4px" }}>
                Notes
              </label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full px-3 py-2 rounded text-sm"
                style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)", resize: "vertical" }}
              />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!form.barrelId || createBarrel.isPending || updateBarrel.isPending}
              className="px-4 py-2 rounded text-sm"
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)", fontWeight: 600, cursor: "pointer" }}
            >
              {editId !== null ? "Save Changes" : "Add Barrel"}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded text-sm"
              style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-lo)", cursor: "pointer" }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Empty state */}
      {barrels.length === 0 && !showForm && (
        <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
          <Droplets className="w-8 h-8 mx-auto mb-3 opacity-40" />
          <p style={{ fontSize: "0.875rem" }}>No barrels registered yet.</p>
          <p style={{ fontSize: "0.8125rem", marginTop: "4px", fontStyle: "italic" }}>
            Add your first barrel to start tracking topping schedules and wine lots.
          </p>
        </div>
      )}

      {/* Barrel list */}
      <div className="flex flex-col gap-3">
        {barrels.map((b) => {
          const urgency = toppingUrgency(b.lastToppedDate ?? null);
          return (
            <div
              key={b.id}
              className="rounded p-4"
              style={{
                background: "var(--ow-bg-inset)",
                border: `1px solid ${b.isActive ? "var(--ow-border)" : "var(--ow-border)"}`,
                opacity: b.isActive ? 1 : 0.55,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  {/* Top row */}
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.8125rem", fontWeight: 700, color: "var(--ow-amber)" }}>
                      {b.barrelId}
                    </span>
                    <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                      {b.oakType} · {b.format}
                    </span>
                    {b.ageYears !== null && b.ageYears !== undefined && (
                      <span style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                        {b.ageYears === 0 ? "New oak" : `${b.ageYears}yr oak`}
                      </span>
                    )}
                  </div>
                  {/* Wine lot */}
                  {b.wineLot && (
                    <p style={{ fontSize: "0.8125rem", color: "var(--ow-text-mid)", marginBottom: "4px" }}>
                      {b.wineLot}
                    </p>
                  )}
                  {/* Topping status */}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    <span
                      className="px-2 py-0.5 rounded-sm text-xs"
                      style={{
                        background: `${urgencyColor[urgency]}18`,
                        color: urgencyColor[urgency],
                        border: `1px solid ${urgencyColor[urgency]}40`,
                        fontFamily: "'Fira Code', monospace",
                      }}
                    >
                      Last topped: {daysSince(b.lastToppedDate ?? null)}
                    </span>
                    {b.fillDate && (
                      <span style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                        Filled {new Date(b.fillDate).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                    )}
                    {b.notes && (
                      <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>
                        {b.notes.slice(0, 80)}{b.notes.length > 80 ? "…" : ""}
                      </span>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {/* Record topping */}
                  <button
                    type="button"
                    onClick={() => {
                      setToppingId(b.id);
                      recordTopping.mutate({ id: b.id }, { onSuccess: () => setToppingId(null) });
                    }}
                    disabled={recordTopping.isPending && toppingId === b.id}
                    title="Record topping"
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{
                      background: "oklch(0.55 0.14 145 / 12%)",
                      border: "1px solid oklch(0.55 0.14 145 / 30%)",
                      color: "oklch(0.55 0.14 145)",
                      cursor: "pointer",
                    }}
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  {/* Edit */}
                  <button
                    type="button"
                    onClick={() => openEdit(b)}
                    title="Edit barrel"
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-lo)", cursor: "pointer" }}
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  {/* Delete */}
                  <button
                    type="button"
                    onClick={() => deleteBarrel.mutate({ id: b.id })}
                    title="Remove barrel"
                    className="w-8 h-8 rounded flex items-center justify-center"
                    style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "oklch(0.60 0.18 25)", cursor: "pointer" }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
