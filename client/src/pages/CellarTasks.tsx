/**
 * CellarTasks — Equipment Register + Cleaning & Maintenance Task List
 * Phone-first: large touch targets, bottom sheet for add/edit, task tick-off.
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Loader2,
  Wand2,
  X,
  Pencil,
  FlaskConical,
  Wrench,
  Eye,
  Sparkles,
  ClipboardList,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

type EquipmentType =
  | "fermentation_tank"
  | "barrel"
  | "press"
  | "pump"
  | "sorting_table"
  | "destemmer"
  | "cold_room"
  | "hose"
  | "other";

type EquipmentMaterial = "stainless" | "wood" | "concrete" | "fibreglass" | "other";

const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  fermentation_tank: "Fermentation Tank",
  barrel: "Barrel",
  press: "Press",
  pump: "Pump",
  sorting_table: "Sorting Table",
  destemmer: "Destemmer / Crusher",
  cold_room: "Cold Room",
  hose: "Hose",
  other: "Other",
};

const MATERIAL_LABELS: Record<EquipmentMaterial, string> = {
  stainless: "Stainless Steel",
  wood: "Wood",
  concrete: "Concrete",
  fibreglass: "Fibreglass",
  other: "Other",
};

const TASK_TYPE_ICONS: Record<string, React.ReactNode> = {
  clean: <FlaskConical size={14} />,
  sanitise: <Sparkles size={14} />,
  inspect: <Eye size={14} />,
  maintain: <Wrench size={14} />,
  other: <ClipboardList size={14} />,
};

const TASK_TYPE_COLOURS: Record<string, string> = {
  clean: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  sanitise: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  inspect: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  maintain: "bg-green-500/15 text-green-300 border-green-500/20",
  other: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    setIsDesktop(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDesktop(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isDesktop;
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.75rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: "oklch(0.55 0.015 75)",
        display: "block",
        marginBottom: "0.4rem",
      }}
    >
      {children}
    </label>
  );
}

function SelectInput({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{
        width: "100%",
        background: "oklch(0.18 0.010 60)",
        border: "1px solid oklch(1 0 0 / 12%)",
        borderRadius: "6px",
        color: "oklch(0.88 0.015 75)",
        fontSize: "1rem",
        padding: "0.75rem 1rem",
        fontFamily: "'Lato', sans-serif",
        appearance: "none",
        WebkitAppearance: "none",
      }}
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function TextInput({
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <input
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        width: "100%",
        background: "oklch(0.18 0.010 60)",
        border: "1px solid oklch(1 0 0 / 12%)",
        borderRadius: "6px",
        color: "oklch(0.88 0.015 75)",
        fontSize: "1rem",
        padding: "0.75rem 1rem",
        fontFamily: "'Lato', sans-serif",
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 60%)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "oklch(1 0 0 / 12%)")}
    />
  );
}

// ─── Equipment Sheet ──────────────────────────────────────────────────────────

interface EquipmentSheetProps {
  open: boolean;
  onClose: () => void;
  editItem?: {
    id: number;
    name: string;
    equipmentType: string;
    material: string;
    capacityL: number | null;
    quantity: number;
    notes: string | null;
  } | null;
}

function EquipmentSheet({ open, onClose, editItem }: EquipmentSheetProps) {
  const isDesktop = useIsDesktop();
  const utils = trpc.useUtils();

  const [name, setName] = useState("");
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("fermentation_tank");
  const [material, setMaterial] = useState<EquipmentMaterial>("stainless");
  const [capacityL, setCapacityL] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      if (editItem) {
        setName(editItem.name);
        setEquipmentType(editItem.equipmentType as EquipmentType);
        setMaterial(editItem.material as EquipmentMaterial);
        setCapacityL(editItem.capacityL ? String(editItem.capacityL) : "");
        setQuantity(String(editItem.quantity));
        setNotes(editItem.notes ?? "");
      } else {
        setName("");
        setEquipmentType("fermentation_tank");
        setMaterial("stainless");
        setCapacityL("");
        setQuantity("1");
        setNotes("");
      }
    }
  }, [open, editItem]);

  const addMutation = trpc.cellarEquipment.add.useMutation({
    onSuccess: () => {
      utils.cellarEquipment.list.invalidate();
      toast.success(`Equipment added: ${name}`);
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const updateMutation = trpc.cellarEquipment.update.useMutation({
    onSuccess: () => {
      utils.cellarEquipment.list.invalidate();
      toast.success("Equipment updated");
      onClose();
    },
    onError: (e) => toast.error(e.message),
  });

  const isLoading = addMutation.isPending || updateMutation.isPending;

  function handleSubmit() {
    if (!name.trim()) {
      toast.error("Name required");
      return;
    }
    const payload = {
      name: name.trim(),
      equipmentType,
      material,
      capacityL: capacityL ? parseInt(capacityL) : undefined,
      quantity: parseInt(quantity) || 1,
      notes: notes.trim() || undefined,
    };
    if (editItem) {
      updateMutation.mutate({ id: editItem.id, ...payload });
    } else {
      addMutation.mutate(payload);
    }
  }

  if (!open) return null;

  const sheetStyle: React.CSSProperties = isDesktop
    ? {
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }
    : {
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "flex-end",
      };

  const panelStyle: React.CSSProperties = isDesktop
    ? {
        background: "oklch(0.14 0.008 60)",
        border: "1px solid oklch(1 0 0 / 10%)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "480px",
        padding: "1.5rem",
        maxHeight: "90vh",
        overflowY: "auto",
      }
    : {
        background: "oklch(0.14 0.008 60)",
        borderTop: "1px solid oklch(1 0 0 / 10%)",
        borderRadius: "16px 16px 0 0",
        width: "100%",
        padding: "1.5rem 1.5rem 2.5rem",
        maxHeight: "85vh",
        overflowY: "auto",
      };

  return (
    <div style={sheetStyle}>
      {/* Backdrop */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "oklch(0 0 0 / 60%)",
          zIndex: -1,
        }}
        onClick={onClose}
      />
      <div style={panelStyle}>
        {/* Handle (mobile) */}
        {!isDesktop && (
          <div
            style={{
              width: "40px",
              height: "4px",
              borderRadius: "2px",
              background: "oklch(1 0 0 / 20%)",
              margin: "0 auto 1.25rem",
            }}
          />
        )}

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.25rem",
              color: "oklch(0.92 0.018 75)",
              margin: 0,
            }}
          >
            {editItem ? "Edit Equipment" : "Add Equipment"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "oklch(0.55 0.015 75)", padding: "4px" }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <div>
            <FieldLabel>Equipment Name *</FieldLabel>
            <TextInput value={name} onChange={setName} placeholder="e.g. Tank 7, Bladder Press, Basket Press" />
          </div>

          <div>
            <FieldLabel>Equipment Type</FieldLabel>
            <SelectInput
              value={equipmentType}
              onChange={(v) => setEquipmentType(v as EquipmentType)}
              options={Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>

          <div>
            <FieldLabel>Material</FieldLabel>
            <SelectInput
              value={material}
              onChange={(v) => setMaterial(v as EquipmentMaterial)}
              options={Object.entries(MATERIAL_LABELS).map(([value, label]) => ({ value, label }))}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
            <div>
              <FieldLabel>Capacity (L)</FieldLabel>
              <TextInput value={capacityL} onChange={setCapacityL} placeholder="e.g. 5000" type="number" />
            </div>
            <div>
              <FieldLabel>Quantity</FieldLabel>
              <TextInput value={quantity} onChange={setQuantity} placeholder="1" type="number" />
            </div>
          </div>

          <div>
            <FieldLabel>Notes (optional)</FieldLabel>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. French oak, 2021 vintage, Seguin Moreau"
              rows={2}
              style={{
                width: "100%",
                background: "oklch(0.18 0.010 60)",
                border: "1px solid oklch(1 0 0 / 12%)",
                borderRadius: "6px",
                color: "oklch(0.88 0.015 75)",
                fontSize: "1rem",
                padding: "0.75rem 1rem",
                fontFamily: "'Lato', sans-serif",
                resize: "vertical",
                outline: "none",
              }}
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            style={{
              marginTop: "0.5rem",
              width: "100%",
              padding: "0.875rem",
              borderRadius: "8px",
              border: "none",
              background: isLoading ? "oklch(0.55 0.08 75)" : "oklch(0.72 0.12 75)",
              color: "oklch(0.10 0.008 60)",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "1rem",
              cursor: isLoading ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.5rem",
            }}
          >
            {isLoading && <Loader2 size={16} className="animate-spin" />}
            {editItem ? "Save Changes" : "Add Equipment"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Equipment Card ───────────────────────────────────────────────────────────

interface EquipmentCardProps {
  item: {
    id: number;
    name: string;
    equipmentType: string;
    material: string;
    capacityL: number | null;
    quantity: number;
    notes: string | null;
  };
  tasks: Array<{
    id: number;
    taskType: string;
    title: string;
    methodNotes: string | null;
    frequency: string;
    completedAt: number | null;
    completedBy: string | null;
    aiGenerated: number;
  }>;
  userName: string;
  onEdit: () => void;
  onDelete: () => void;
}

function EquipmentCard({ item, tasks, userName, onEdit, onDelete }: EquipmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  const utils = trpc.useUtils();

  const completeMutation = trpc.cellarTasks.complete.useMutation({
    onSuccess: () => utils.cellarTasks.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const uncompleteMutation = trpc.cellarTasks.uncomplete.useMutation({
    onSuccess: () => utils.cellarTasks.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteTaskMutation = trpc.cellarTasks.delete.useMutation({
    onSuccess: () => utils.cellarTasks.list.invalidate(),
    onError: (e) => toast.error(e.message),
  });

  const deleteEquipmentMutation = trpc.cellarEquipment.delete.useMutation({
    onSuccess: () => {
      utils.cellarEquipment.list.invalidate();
      utils.cellarTasks.list.invalidate();
      toast.success("Equipment removed");
    },
    onError: (e) => toast.error(e.message),
  });

  const generateMutation = trpc.cellarTasks.generateForEquipment.useMutation({
    onSuccess: (data) => {
      utils.cellarTasks.list.invalidate();
      setGenerating(false);
      setExpanded(true);
      toast.success(`${data.count} tasks generated for ${item.name}`);
    },
    onError: (e) => {
      setGenerating(false);
      toast.error(e.message);
    },
  });

  function handleGenerate() {
    setGenerating(true);
    generateMutation.mutate({
      equipmentId: item.id,
      equipmentName: item.name,
      equipmentType: item.equipmentType as EquipmentType,
      material: item.material as EquipmentMaterial,
      capacityL: item.capacityL ?? undefined,
      quantity: item.quantity,
      notes: item.notes ?? undefined,
    });
  }

  const pendingTasks = tasks.filter((t) => !t.completedAt);
  const completedTasks = tasks.filter((t) => t.completedAt);

  const statusColour =
    tasks.length === 0
      ? "oklch(0.45 0.010 60)"
      : pendingTasks.length === 0
      ? "oklch(0.60 0.14 145)"
      : "oklch(0.72 0.12 75)";

  return (
    <div
      style={{
        background: "oklch(0.14 0.008 60)",
        border: `1px solid oklch(1 0 0 / 8%)`,
        borderLeft: `3px solid ${statusColour}`,
        borderRadius: "10px",
        overflow: "hidden",
      }}
    >
      {/* Card header */}
      <div
        style={{ padding: "1rem 1rem 0.875rem", cursor: "pointer" }}
        onClick={() => setExpanded((e) => !e)}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.5rem" }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "1rem",
                  color: "oklch(0.92 0.018 75)",
                  fontWeight: 600,
                }}
              >
                {item.name}
              </span>
              {item.quantity > 1 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "oklch(0.55 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  ×{item.quantity}
                </span>
              )}
            </div>
            <div
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                color: "oklch(0.55 0.015 75)",
                marginTop: "0.2rem",
              }}
            >
              {EQUIPMENT_TYPE_LABELS[item.equipmentType as EquipmentType] ?? item.equipmentType} ·{" "}
              {MATERIAL_LABELS[item.material as EquipmentMaterial] ?? item.material}
              {item.capacityL ? ` · ${item.capacityL.toLocaleString()}L` : ""}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexShrink: 0 }}>
            {tasks.length > 0 && (
              <span
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.75rem",
                  color: pendingTasks.length === 0 ? "oklch(0.60 0.14 145)" : "oklch(0.72 0.12 75)",
                }}
              >
                {completedTasks.length}/{tasks.length}
              </span>
            )}
            {expanded ? (
              <ChevronUp size={16} style={{ color: "oklch(0.55 0.015 75)" }} />
            ) : (
              <ChevronDown size={16} style={{ color: "oklch(0.55 0.015 75)" }} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid oklch(1 0 0 / 6%)", padding: "0.875rem 1rem 1rem" }}>
          {/* Action row */}
          <div style={{ display: "flex", gap: "0.5rem", marginBottom: "0.875rem", flexWrap: "wrap" }}>
            <button
              onClick={handleGenerate}
              disabled={generating}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: "1px solid oklch(0.72 0.12 75 / 30%)",
                background: "oklch(0.72 0.12 75 / 10%)",
                color: "oklch(0.72 0.12 75)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              {generating ? "Generating…" : tasks.length > 0 ? "Regenerate tasks" : "Generate tasks"}
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: "1px solid oklch(1 0 0 / 10%)",
                background: "transparent",
                color: "oklch(0.65 0.015 75)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <Pencil size={13} />
              Edit
            </button>

            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Remove ${item.name} and all its tasks?`)) {
                  deleteEquipmentMutation.mutate({ id: item.id });
                }
              }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: "1px solid oklch(0.55 0.18 25 / 30%)",
                background: "transparent",
                color: "oklch(0.65 0.18 25)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <Trash2 size={13} />
              Remove
            </button>
          </div>

          {/* Tasks */}
          {tasks.length === 0 ? (
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.85rem",
                color: "oklch(0.45 0.010 60)",
                fontStyle: "italic",
                margin: 0,
              }}
            >
              No tasks yet — tap "Generate tasks" to create AI-powered cleaning and maintenance tasks for this equipment.
            </p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {tasks.map((task) => (
                <div
                  key={task.id}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "0.75rem",
                    padding: "0.75rem",
                    borderRadius: "8px",
                    background: task.completedAt
                      ? "oklch(0.12 0.006 60)"
                      : "oklch(0.17 0.010 60)",
                    opacity: task.completedAt ? 0.6 : 1,
                  }}
                >
                  {/* Tick button */}
                  <button
                    onClick={() => {
                      if (task.completedAt) {
                        uncompleteMutation.mutate({ id: task.id });
                      } else {
                        completeMutation.mutate({ id: task.id, completedBy: userName });
                      }
                    }}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      padding: "2px",
                      flexShrink: 0,
                      color: task.completedAt ? "oklch(0.60 0.14 145)" : "oklch(0.45 0.010 60)",
                      marginTop: "1px",
                    }}
                  >
                    {task.completedAt ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                  </button>

                  {/* Task content */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.9rem",
                          color: task.completedAt ? "oklch(0.50 0.010 60)" : "oklch(0.85 0.015 75)",
                          textDecoration: task.completedAt ? "line-through" : "none",
                          fontWeight: 500,
                        }}
                      >
                        {task.title}
                      </span>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs border ${TASK_TYPE_COLOURS[task.taskType] ?? TASK_TYPE_COLOURS.other}`}
                        style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem" }}
                      >
                        {TASK_TYPE_ICONS[task.taskType]}
                        {task.taskType}
                      </span>
                      {task.aiGenerated === 1 && (
                        <span
                          style={{
                            fontSize: "0.65rem",
                            color: "oklch(0.55 0.015 75)",
                            fontFamily: "'Lato', sans-serif",
                          }}
                        >
                          AI
                        </span>
                      )}
                    </div>

                    <div
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.75rem",
                        color: "oklch(0.50 0.012 75)",
                        marginTop: "0.15rem",
                      }}
                    >
                      {task.frequency}
                    </div>

                    {task.methodNotes && (
                      <p
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.8rem",
                          color: "oklch(0.60 0.012 75)",
                          margin: "0.4rem 0 0",
                          lineHeight: 1.5,
                        }}
                      >
                        {task.methodNotes}
                      </p>
                    )}

                    {task.completedAt && task.completedBy && (
                      <p
                        style={{
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "0.7rem",
                          color: "oklch(0.50 0.010 60)",
                          margin: "0.3rem 0 0",
                        }}
                      >
                        ✓ {task.completedBy} · {new Date(task.completedAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>

                  {/* Delete task */}
                  <button
                    onClick={() => deleteTaskMutation.mutate({ id: task.id })}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "oklch(0.40 0.010 60)",
                      padding: "2px",
                      flexShrink: 0,
                    }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function CellarTasks() {
  const [loading] = useState(false);
  const isAuthenticated = true; // page is accessible to all users like ThePress
  const user = { name: "Me" };
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState<EquipmentCardProps["item"] | null>(null);
  const [filter, setFilter] = useState<"all" | "pending" | "done">("all");

  const { data: equipment = [], isLoading: equipLoading } = trpc.cellarEquipment.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  const { data: tasks = [], isLoading: tasksLoading } = trpc.cellarTasks.list.useQuery(
    undefined,
    { enabled: isAuthenticated }
  );

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "oklch(0.11 0.008 60)",
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: "oklch(0.72 0.12 75)" }} />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "oklch(0.11 0.008 60)",
          gap: "1rem",
        }}
      >
        <p style={{ fontFamily: "'Lato', sans-serif", color: "oklch(0.65 0.015 75)" }}>
          Sign in to access Cellar Tasks
        </p>
        <Button onClick={() => (window.location.href = getLoginUrl())}>Sign In</Button>
      </div>
    );
  }

  const isLoading = equipLoading || tasksLoading;
  const userName = user?.name ?? "Me";

  // Group tasks by equipment id
  const tasksByEquipment = tasks.reduce(
    (acc, t) => {
      const key = t.equipmentId ?? -1;
      if (!acc[key]) acc[key] = [];
      acc[key].push(t);
      return acc;
    },
    {} as Record<number, typeof tasks>
  );

  // Filter equipment based on task status
  const filteredEquipment = equipment.filter((eq) => {
    if (filter === "all") return true;
    const eqTasks = tasksByEquipment[eq.id] ?? [];
    if (filter === "pending") return eqTasks.some((t) => !t.completedAt);
    if (filter === "done") return eqTasks.length > 0 && eqTasks.every((t) => t.completedAt);
    return true;
  });

  const totalTasks = tasks.length;
  const completedCount = tasks.filter((t) => t.completedAt).length;
  const pendingCount = totalTasks - completedCount;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "oklch(0.11 0.008 60)",
        paddingBottom: "6rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "oklch(0.13 0.008 60)",
          borderBottom: "1px solid oklch(1 0 0 / 6%)",
          padding: "1.25rem 1rem 1rem",
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ maxWidth: "640px", margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <h1
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "1.4rem",
                  color: "oklch(0.92 0.018 75)",
                  margin: 0,
                  fontWeight: 700,
                }}
              >
                Cellar Tasks
              </h1>
              {totalTasks > 0 && (
                <p
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.75rem",
                    color: pendingCount === 0 ? "oklch(0.60 0.14 145)" : "oklch(0.72 0.12 75)",
                    margin: "0.2rem 0 0",
                  }}
                >
                  {completedCount}/{totalTasks} tasks complete
                </p>
              )}
            </div>

            <button
              onClick={() => { setEditItem(null); setSheetOpen(true); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
                padding: "0.625rem 1rem",
                borderRadius: "8px",
                border: "none",
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.10 0.008 60)",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: "0.875rem",
                cursor: "pointer",
              }}
            >
              <Plus size={16} />
              Add Equipment
            </button>
          </div>

          {/* Filter tabs */}
          {equipment.length > 0 && (
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.875rem" }}>
              {(["all", "pending", "done"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  style={{
                    padding: "0.375rem 0.875rem",
                    borderRadius: "20px",
                    border: `1px solid ${filter === f ? "oklch(0.72 0.12 75 / 50%)" : "oklch(1 0 0 / 10%)"}`,
                    background: filter === f ? "oklch(0.72 0.12 75 / 15%)" : "transparent",
                    color: filter === f ? "oklch(0.72 0.12 75)" : "oklch(0.55 0.015 75)",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.8rem",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {f === "all" ? `All (${equipment.length})` : f === "pending" ? `Pending (${equipment.filter(eq => (tasksByEquipment[eq.id] ?? []).some(t => !t.completedAt)).length})` : `Done (${equipment.filter(eq => { const et = tasksByEquipment[eq.id] ?? []; return et.length > 0 && et.every(t => t.completedAt); }).length})`}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: "640px", margin: "0 auto", padding: "1rem 1rem 0" }}>
        {isLoading ? (
          <div style={{ display: "flex", justifyContent: "center", paddingTop: "3rem" }}>
            <Loader2 size={28} className="animate-spin" style={{ color: "oklch(0.72 0.12 75)" }} />
          </div>
        ) : equipment.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              paddingTop: "4rem",
              paddingBottom: "2rem",
            }}
          >
            <Wrench
              size={48}
              style={{ color: "oklch(0.35 0.010 60)", margin: "0 auto 1rem" }}
            />
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.25rem",
                color: "oklch(0.65 0.015 75)",
                marginBottom: "0.5rem",
              }}
            >
              No equipment registered yet
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.9rem",
                color: "oklch(0.45 0.010 60)",
                maxWidth: "320px",
                margin: "0 auto 1.5rem",
                lineHeight: 1.6,
              }}
            >
              Add your cellar equipment and Ownology will generate cleaning and maintenance tasks specific to each item.
            </p>
            <button
              onClick={() => { setEditItem(null); setSheetOpen(true); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                border: "none",
                background: "oklch(0.72 0.12 75)",
                color: "oklch(0.10 0.008 60)",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: "1rem",
                cursor: "pointer",
              }}
            >
              <Plus size={18} />
              Add First Equipment
            </button>
          </div>
        ) : filteredEquipment.length === 0 ? (
          <p
            style={{
              textAlign: "center",
              paddingTop: "2rem",
              fontFamily: "'Lato', sans-serif",
              color: "oklch(0.45 0.010 60)",
              fontStyle: "italic",
            }}
          >
            No equipment matches this filter.
          </p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filteredEquipment.map((eq) => (
              <EquipmentCard
                key={eq.id}
                item={eq}
                tasks={tasksByEquipment[eq.id] ?? []}
                userName={userName}
                onEdit={() => { setEditItem(eq); setSheetOpen(true); }}
                onDelete={() => {}}
              />
            ))}
          </div>
        )}
      </div>

      {/* Equipment Sheet */}
      <EquipmentSheet
        open={sheetOpen}
        onClose={() => { setSheetOpen(false); setEditItem(null); }}
        editItem={editItem}
      />
    </div>
  );
}
