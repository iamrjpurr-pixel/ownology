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
  // DR-10: fault log
  fault_log: <Wrench size={14} />,
  other: <ClipboardList size={14} />,
};

const TASK_TYPE_COLOURS: Record<string, string> = {
  clean: "bg-blue-500/15 text-blue-300 border-blue-500/20",
  sanitise: "bg-purple-500/15 text-purple-300 border-purple-500/20",
  inspect: "bg-amber-500/15 text-amber-300 border-amber-500/20",
  maintain: "bg-green-500/15 text-green-300 border-green-500/20",
  // DR-10: fault log — red-orange to signal an issue
  fault_log: "bg-red-500/15 text-red-300 border-red-500/20",
  other: "bg-zinc-500/15 text-zinc-300 border-zinc-500/20",
};

/// ─── Home Winery Kit Preset ──────────────────────────────────────────────────

const HOME_WINERY_KIT_PRESET = [
  // Fermentation & Storage
  { name: "Big Mouth Bubbler (6.5 gal)", equipmentType: "fermentation_tank" as const, material: "other" as const, capacityL: 25, quantity: 1, notes: "Plastic primary fermenter. Wide-mouth for easy cleaning and punchdowns. Category: Fermentation & Storage" },
  { name: "Glass Carboy (6 gal)", equipmentType: "fermentation_tank" as const, material: "other" as const, capacityL: 23, quantity: 1, notes: "Secondary fermentation and clearing vessel. Category: Fermentation & Storage" },
  { name: "Airlock", equipmentType: "other" as const, material: "other" as const, quantity: 2, notes: "One-way CO₂ valve. Fill with sulphite solution (not plain water). Category: Fermentation & Storage" },
  { name: "Bung (Rubber Stopper)", equipmentType: "other" as const, material: "other" as const, quantity: 2, notes: "Seals carboy neck. Replace if cracked or hardened. Category: Fermentation & Storage" },
  { name: "Fermenter Lid", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Seals primary fermenter. Category: Fermentation & Storage" },
  // Transfer & Bottling
  { name: "Auto Siphon", equipmentType: "hose" as const, material: "other" as const, quantity: 1, notes: "Spring-loaded racking cane. Avoids disturbing lees. Category: Transfer & Bottling" },
  { name: "5 ft Food-Grade Tubing", equipmentType: "hose" as const, material: "other" as const, quantity: 1, notes: "Connects siphon to carboy or bottle filler. Replace every 1–2 years or if discoloured. Category: Transfer & Bottling" },
  { name: "Bottle Filler (Needle Valve)", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Spring-tip valve fills to correct headspace automatically. Category: Transfer & Bottling" },
  { name: "Impact Corker", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Mallet-style corking machine. Drives #9 straight corks flush with bottle top. Category: Transfer & Bottling" },
  // Measuring & Testing
  { name: "Hydrometer", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Measures specific gravity (Brix/sugar). Check for chips — affects accuracy. Category: Measuring & Testing" },
  { name: "Hydrometer Test Jar", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Tall cylinder holds sample for hydrometer float. Category: Measuring & Testing" },
  { name: "Wine Thief (3-piece sampler)", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Extracts sample from carboy without disturbing lees. Disassemble for cleaning. Category: Measuring & Testing" },
  { name: "Thermometer", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Digital or glass. Check fermentation temperature daily. Category: Measuring & Testing" },
  { name: "Stick-on Fermenter Thermometer", equipmentType: "other" as const, material: "other" as const, quantity: 2, notes: "Adhesive strip on outside of fermenter. Continuous temperature read. Category: Measuring & Testing" },
  // Mixing & Processing
  { name: "Plastic Stirring Spoon (Long-handle)", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Sanitise before each use. Category: Mixing & Processing" },
  { name: "Degassing Whip + Electric Drill", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Removes dissolved CO₂ after fermentation. Use on low speed. Check blades for cracks. Category: Mixing & Processing" },
  // Cleaning
  { name: "Carboy Brush", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Long-handle brush reaches bottom of carboy. Category: Cleaning" },
  { name: "Bottle Brush", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Cleans inside wine bottles before sanitising. Category: Cleaning" },
  { name: "Funnel", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Used to pour sanitiser into bottles. Category: Cleaning" },
  { name: "Trigger Spray Bottle (Sanitiser)", equipmentType: "other" as const, material: "other" as const, quantity: 1, notes: "Fill with potassium metabisulfite solution. Spray all contact surfaces before use. Category: Cleaning" },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

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
        color: "var(--ow-text-lo)",
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
        background: "var(--ow-bg-inset)",
        border: "1px solid var(--ow-border)",
        borderRadius: "6px",
        color: "var(--ow-text-hi)",
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
        background: "var(--ow-bg-inset)",
        border: "1px solid var(--ow-border)",
        borderRadius: "6px",
        color: "var(--ow-text-hi)",
        fontSize: "1rem",
        padding: "0.75rem 1rem",
        fontFamily: "'Lato', sans-serif",
        outline: "none",
      }}
      onFocus={(e) => (e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 60%, transparent)")}
      onBlur={(e) => (e.currentTarget.style.borderColor = "var(--ow-border)")}
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
        background: "var(--ow-bg-raised)",
        border: "1px solid var(--ow-border)",
        borderRadius: "12px",
        width: "100%",
        maxWidth: "480px",
        padding: "1.5rem",
        maxHeight: "90vh",
        overflowY: "auto",
      }
    : {
        background: "var(--ow-bg-raised)",
        borderTop: "1px solid var(--ow-border)",
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
          background: "var(--ow-bg-overlay)",
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
              color: "var(--ow-text-hi)",
              margin: 0,
            }}
          >
            {editItem ? "Edit Equipment" : "Add Equipment"}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ow-text-lo)", padding: "4px" }}
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
                background: "var(--ow-bg-inset)",
                border: "1px solid var(--ow-border)",
                borderRadius: "6px",
                color: "var(--ow-text-hi)",
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
              background: isLoading ? "color-mix(in oklch, var(--ow-amber) 70%, var(--ow-bg-base))" : "var(--ow-amber)",
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
    vesselId: string | null;
    vesselType: string | null;
  }>
  userName: string;
  onEdit: () => void;
  onDelete: () => void;
}

function EquipmentCard({ item, tasks, userName, onEdit, onDelete }: EquipmentCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [generating, setGenerating] = useState(false);
  // DR-10: fault log form state
  const [faultFormOpen, setFaultFormOpen] = useState(false);
  const [faultTitle, setFaultTitle] = useState("");
  const [faultNotes, setFaultNotes] = useState("");
  const [faultDowntime, setFaultDowntime] = useState("");
  const [faultResolution, setFaultResolution] = useState("");
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

  const addFaultMutation = trpc.cellarTasks.add.useMutation({
    onSuccess: () => {
      utils.cellarTasks.list.invalidate();
      setFaultFormOpen(false);
      setFaultTitle("");
      setFaultNotes("");
      setFaultDowntime("");
      setFaultResolution("");
      toast.success("Fault logged");
    },
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
      : "var(--ow-amber)";

  return (
    <div
      style={{
        background: "var(--ow-bg-raised)",
        border: `1px solid var(--ow-border)`,
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
                  color: "var(--ow-text-hi)",
                  fontWeight: 600,
                }}
              >
                {item.name}
              </span>
              {item.quantity > 1 && (
                <span
                  style={{
                    fontSize: "0.7rem",
                    color: "var(--ow-text-lo)",
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
                color: "var(--ow-text-lo)",
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
                  color: pendingTasks.length === 0 ? "oklch(0.60 0.14 145)" : "var(--ow-amber)",
                }}
              >
                {completedTasks.length}/{tasks.length}
              </span>
            )}
            {expanded ? (
              <ChevronUp size={16} style={{ color: "var(--ow-text-lo)" }} />
            ) : (
              <ChevronDown size={16} style={{ color: "var(--ow-text-lo)" }} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded content */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--ow-border)", padding: "0.875rem 1rem 1rem" }}>
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
                border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                color: "var(--ow-amber)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                cursor: generating ? "not-allowed" : "pointer",
                opacity: generating ? 0.6 : 1,
              }}
            >
              {generating ? <Loader2 size={13} className="animate-spin" /> : <Wand2 size={13} />}
              {generating ? "Generating…" : tasks.length > 0 ? "Regenerate tasks" : "Generate tasks"}
            </button>

            {/* DR-10: Log Fault button */}
            <button
              onClick={(e) => { e.stopPropagation(); setFaultFormOpen(o => !o); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: "1px solid oklch(0.55 0.18 25 / 30%)",
                background: faultFormOpen ? "oklch(0.55 0.18 25 / 10%)" : "transparent",
                color: "oklch(0.65 0.18 25)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <Wrench size={13} />
              Log Fault
            </button>

            <button
              onClick={(e) => { e.stopPropagation(); onEdit(); }}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.375rem",
                padding: "0.5rem 0.875rem",
                borderRadius: "6px",
                border: "1px solid var(--ow-border)",
                background: "transparent",
                color: "var(--ow-text-mid)",
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

          {/* DR-10: Fault Log Form */}
          {faultFormOpen && (
            <div
              style={{
                background: "var(--ow-bg-raised)",
                border: "1px solid oklch(0.55 0.18 25 / 25%)",
                borderRadius: "8px",
                padding: "1rem",
                marginBottom: "0.875rem",
              }}
            >
              <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "oklch(0.65 0.18 25)", letterSpacing: "0.1em", marginBottom: "0.75rem", margin: "0 0 0.75rem" }}>LOG EQUIPMENT FAULT</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
                <div>
                  <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "oklch(0.50 0.010 60)", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>FAULT DESCRIPTION *</p>
                  <input
                    type="text"
                    value={faultTitle}
                    onChange={e => setFaultTitle(e.target.value)}
                    placeholder="e.g. Pump seal leaking, temperature probe fault"
                    style={{ width: "100%", background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", borderRadius: "6px", padding: "0.5rem 0.75rem", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.625rem" }}>
                  <div>
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "oklch(0.50 0.010 60)", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>DOWNTIME (hrs)</p>
                    <input
                      type="number"
                      value={faultDowntime}
                      onChange={e => setFaultDowntime(e.target.value)}
                      placeholder="0"
                      min="0"
                      step="0.5"
                      style={{ width: "100%", background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", borderRadius: "6px", padding: "0.5rem 0.75rem", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                  <div>
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "oklch(0.50 0.010 60)", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>RESOLUTION</p>
                    <input
                      type="text"
                      value={faultResolution}
                      onChange={e => setFaultResolution(e.target.value)}
                      placeholder="e.g. Replaced seal, called technician"
                      style={{ width: "100%", background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", borderRadius: "6px", padding: "0.5rem 0.75rem", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", outline: "none", boxSizing: "border-box" }}
                    />
                  </div>
                </div>
                <div>
                  <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.6rem", color: "oklch(0.50 0.010 60)", letterSpacing: "0.08em", marginBottom: "0.25rem" }}>ADDITIONAL NOTES</p>
                  <textarea
                    value={faultNotes}
                    onChange={e => setFaultNotes(e.target.value)}
                    placeholder="Any additional context, parts ordered, follow-up required..."
                    rows={2}
                    style={{ width: "100%", background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", borderRadius: "6px", padding: "0.5rem 0.75rem", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.875rem", outline: "none", resize: "vertical", boxSizing: "border-box" }}
                  />
                </div>
                <div style={{ display: "flex", gap: "0.5rem", justifyContent: "flex-end" }}>
                  <button
                    type="button"
                    onClick={() => setFaultFormOpen(false)}
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid var(--ow-border)", background: "transparent", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", cursor: "pointer" }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!faultTitle.trim() || addFaultMutation.isPending}
                    onClick={() => {
                      if (!faultTitle.trim()) return;
                      const methodParts = [];
                      if (faultDowntime) methodParts.push(`Downtime: ${faultDowntime} hrs`);
                      if (faultResolution) methodParts.push(`Resolution: ${faultResolution}`);
                      if (faultNotes) methodParts.push(faultNotes);
                      addFaultMutation.mutate({
                        equipmentId: item.id,
                        equipmentName: item.name,
                        taskType: "fault_log",
                        title: faultTitle,
                        methodNotes: methodParts.join(" | ") || undefined,
                        frequency: "Once",
                        aiGenerated: false,
                      });
                    }}
                    style={{ padding: "0.5rem 1rem", borderRadius: "6px", border: "1px solid oklch(0.55 0.18 25 / 40%)", background: "oklch(0.55 0.18 25 / 15%)", color: "oklch(0.65 0.18 25)", fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", cursor: faultTitle.trim() ? "pointer" : "not-allowed", opacity: faultTitle.trim() ? 1 : 0.5 }}
                  >
                    {addFaultMutation.isPending ? "Saving…" : "Log Fault"}
                  </button>
                </div>
              </div>
            </div>
          )}

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
                      : "var(--ow-bg-inset)",
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
                          color: task.completedAt ? "oklch(0.50 0.010 60)" : "var(--ow-text-hi)",
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
                            color: "var(--ow-text-lo)",
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
                        color: "var(--ow-text-lo)",
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

                    {task.vesselId && (
                      <p
                        style={{
                          fontFamily: "'Fira Code', monospace",
                          fontSize: "0.7rem",
                          color: "oklch(0.55 0.12 75)",
                          margin: "0.25rem 0 0",
                        }}
                      >
                        {task.vesselType === "barrel" ? "🪵" : task.vesselType === "tank" ? "🛢" : "📦"} {task.vesselId}
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
                      color: "var(--ow-text-lo)",
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
  const [loadingPreset, setLoadingPreset] = useState(false);
  const utils = trpc.useUtils();

  const batchAddMutation = trpc.cellarEquipment.batchAdd.useMutation({
    onSuccess: (data) => {
      utils.cellarEquipment.list.invalidate();
      setLoadingPreset(false);
      toast.success(`Home Winery Kit loaded — ${data.count} items added. Tap “Generate Tasks” on each item to create cleaning tasks.`);
    },
    onError: (e) => {
      setLoadingPreset(false);
      toast.error(e.message);
    },
  });

  function handleLoadPreset() {
    setLoadingPreset(true);
    batchAddMutation.mutate(HOME_WINERY_KIT_PRESET);
  }

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
          background: "var(--ow-bg-base)",
        }}
      >
        <Loader2 size={32} className="animate-spin" style={{ color: "var(--ow-amber)" }} />
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
          background: "var(--ow-bg-base)",
          gap: "1rem",
        }}
      >
        <p style={{ fontFamily: "'Lato', sans-serif", color: "var(--ow-text-mid)" }}>
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
        background: "var(--ow-bg-base)",
        paddingBottom: "6rem",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "var(--ow-bg-base)",
          borderBottom: "1px solid var(--ow-border)",
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
                  color: "var(--ow-text-hi)",
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
                    color: pendingCount === 0 ? "oklch(0.60 0.14 145)" : "var(--ow-amber)",
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
                background: "var(--ow-amber)",
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
                    border: `1px solid ${filter === f ? "color-mix(in oklch, var(--ow-amber) 50%, transparent)" : "var(--ow-border)"}`,
                    background: filter === f ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                    color: filter === f ? "var(--ow-amber)" : "var(--ow-text-lo)",
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
            <Loader2 size={28} className="animate-spin" style={{ color: "var(--ow-amber)" }} />
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
                color: "var(--ow-text-mid)",
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
            {/* Home Winery Kit preset loader */}
            <div
              style={{
                background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                maxWidth: "340px",
                margin: "0 auto 1.25rem",
                textAlign: "left",
              }}
            >
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.8rem",
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber)",
                  margin: "0 0 0.4rem",
                }}
              >
                🍇 Home Winery Kit
              </p>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.85rem",
                  color: "var(--ow-text-mid)",
                  margin: "0 0 0.875rem",
                  lineHeight: 1.5,
                }}
              >
                Using a 6-gallon wine kit? Load all 20 standard home winery items in one tap.
              </p>
              <button
                onClick={handleLoadPreset}
                disabled={loadingPreset}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.5rem 1rem",
                  borderRadius: "6px",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
                  background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                  color: "var(--ow-amber)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: loadingPreset ? "not-allowed" : "pointer",
                  opacity: loadingPreset ? 0.6 : 1,
                }}
              >
                {loadingPreset ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                {loadingPreset ? "Loading kit..." : "Load Home Winery Kit"}
              </button>
            </div>

            <button
              onClick={() => { setEditItem(null); setSheetOpen(true); }}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                padding: "0.75rem 1.5rem",
                borderRadius: "8px",
                border: "none",
                background: "var(--ow-amber)",
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
