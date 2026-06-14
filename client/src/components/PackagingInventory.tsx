import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Package, Plus, Pencil, Trash2, AlertTriangle, X, Check } from "lucide-react";

type PackagingCategory = "bottle" | "label" | "capsule" | "cork" | "box" | "other";

const CATEGORY_LABELS: Record<PackagingCategory, string> = {
  bottle: "Bottle",
  label: "Label",
  capsule: "Capsule",
  cork: "Cork / Screwcap",
  box: "Box / Carton",
  other: "Other",
};

const CATEGORY_ICONS: Record<PackagingCategory, string> = {
  bottle: "🍾",
  label: "🏷️",
  capsule: "🔵",
  cork: "🔩",
  box: "📦",
  other: "◈",
};

const CATEGORY_COLORS: Record<PackagingCategory, string> = {
  bottle: "oklch(0.72 0.12 75)",
  label: "oklch(0.65 0.15 220)",
  capsule: "oklch(0.65 0.15 160)",
  cork: "oklch(0.65 0.12 40)",
  box: "oklch(0.65 0.10 280)",
  other: "oklch(0.55 0.015 75)",
};

interface FormState {
  itemName: string;
  category: PackagingCategory;
  quantityOnHand: string;
  reorderLevel: string;
  unit: string;
  notes: string;
}

const EMPTY_FORM: FormState = {
  itemName: "",
  category: "bottle",
  quantityOnHand: "0",
  reorderLevel: "0",
  unit: "units",
  notes: "",
};

export default function PackagingInventory() {
  const utils = trpc.useUtils();
  const { data: items = [], isLoading } = trpc.packaging.list.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [filterCategory, setFilterCategory] = useState<PackagingCategory | "all">("all");

  const addItem = trpc.packaging.add.useMutation({
    onSuccess: () => {
      utils.packaging.list.invalidate();
      setShowForm(false);
      setForm(EMPTY_FORM);
      toast.success("Item added");
    },
    onError: (e) => toast.error(e.message),
  });

  const updateItem = trpc.packaging.update.useMutation({
    onSuccess: () => {
      utils.packaging.list.invalidate();
      setEditId(null);
      setForm(EMPTY_FORM);
      toast.success("Item updated");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteItem = trpc.packaging.delete.useMutation({
    onSuccess: () => {
      utils.packaging.list.invalidate();
      toast.success("Item removed");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleSubmit() {
    const payload = {
      itemName: form.itemName.trim(),
      category: form.category,
      quantityOnHand: parseInt(form.quantityOnHand) || 0,
      reorderLevel: parseInt(form.reorderLevel) || 0,
      unit: form.unit.trim() || "units",
      notes: form.notes.trim() || undefined,
    };
    if (!payload.itemName) { toast.error("Item name is required"); return; }
    if (editId !== null) {
      updateItem.mutate({ id: editId, ...payload });
    } else {
      addItem.mutate(payload);
    }
  }

  function startEdit(item: typeof items[0]) {
    setEditId(item.id);
    setForm({
      itemName: item.itemName,
      category: item.category as PackagingCategory,
      quantityOnHand: String(item.quantityOnHand),
      reorderLevel: String(item.reorderLevel),
      unit: item.unit,
      notes: item.notes ?? "",
    });
    setShowForm(true);
  }

  function cancelForm() {
    setShowForm(false);
    setEditId(null);
    setForm(EMPTY_FORM);
  }

  const filtered = filterCategory === "all"
    ? items
    : items.filter((i) => i.category === filterCategory);

  const lowStockCount = items.filter((i) => i.quantityOnHand <= i.reorderLevel && i.reorderLevel > 0).length;

  // Group by category for display
  const grouped = filtered.reduce<Record<string, typeof items>>((acc, item) => {
    const cat = item.category;
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(item);
    return acc;
  }, {});

  return (
    <div style={{ fontFamily: "'Lato', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Package size={20} style={{ color: "oklch(0.72 0.12 75)" }} />
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.25rem", color: "oklch(0.92 0.018 75)", fontWeight: 600 }}>
            Packaging Inventory
          </h2>
          {lowStockCount > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded text-xs"
              style={{ background: "oklch(0.55 0.18 30 / 20%)", color: "oklch(0.75 0.18 30)", border: "1px solid oklch(0.55 0.18 30 / 30%)" }}>
              <AlertTriangle size={11} />
              {lowStockCount} low stock
            </span>
          )}
        </div>
        <Button size="sm" onClick={() => { setShowForm(true); setEditId(null); setForm(EMPTY_FORM); }}
          style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}>
          <Plus size={14} className="mr-1" /> Add Item
        </Button>
      </div>

      {/* Category filter */}
      <div className="flex flex-wrap gap-2 mb-5">
        {(["all", "bottle", "label", "capsule", "cork", "box", "other"] as const).map((cat) => (
          <button key={cat} onClick={() => setFilterCategory(cat)}
            className="px-3 py-1 rounded text-xs transition-all"
            style={{
              background: filterCategory === cat ? "oklch(0.72 0.12 75 / 20%)" : "oklch(0.16 0.010 60)",
              color: filterCategory === cat ? "oklch(0.72 0.12 75)" : "oklch(0.60 0.015 75)",
              border: filterCategory === cat ? "1px solid oklch(0.72 0.12 75 / 40%)" : "1px solid oklch(1 0 0 / 8%)",
              fontFamily: "'Lato', sans-serif",
            }}>
            {cat === "all" ? "All" : `${CATEGORY_ICONS[cat]} ${CATEGORY_LABELS[cat]}`}
          </button>
        ))}
      </div>

      {/* Add / Edit form */}
      {showForm && (
        <div className="rounded-lg p-5 mb-6" style={{ background: "oklch(0.14 0.010 60)", border: "1px solid oklch(0.72 0.12 75 / 25%)" }}>
          <div className="flex items-center justify-between mb-4">
            <h3 style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Fraunces', serif", fontSize: "1rem", fontWeight: 600 }}>
              {editId !== null ? "Edit Item" : "Add Packaging Item"}
            </h3>
            <button onClick={cancelForm}><X size={16} style={{ color: "oklch(0.55 0.015 75)" }} /></button>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>ITEM NAME *</Label>
              <Input value={form.itemName} onChange={(e) => setForm({ ...form, itemName: e.target.value })}
                placeholder="e.g. 750mL Bordeaux Bottle"
                style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)" }} />
            </div>
            <div>
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>CATEGORY</Label>
              <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v as PackagingCategory })}>
                <SelectTrigger style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)" }}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Object.keys(CATEGORY_LABELS) as PackagingCategory[]).map((cat) => (
                    <SelectItem key={cat} value={cat}>{CATEGORY_ICONS[cat]} {CATEGORY_LABELS[cat]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>UNIT</Label>
              <Input value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                placeholder="units"
                style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)" }} />
            </div>
            <div>
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>QTY ON HAND</Label>
              <Input type="number" min="0" value={form.quantityOnHand} onChange={(e) => setForm({ ...form, quantityOnHand: e.target.value })}
                style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)" }} />
            </div>
            <div>
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>REORDER LEVEL</Label>
              <Input type="number" min="0" value={form.reorderLevel} onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
                placeholder="Alert when below this"
                style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)" }} />
            </div>
            <div className="col-span-2">
              <Label style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.08em" }}>NOTES (OPTIONAL)</Label>
              <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="Supplier, SKU, specifications..."
                rows={2}
                style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 15%)", color: "oklch(0.90 0.015 75)", resize: "none" }} />
            </div>
          </div>
          <div className="flex gap-3 mt-4">
            <Button onClick={handleSubmit} disabled={addItem.isPending || updateItem.isPending}
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}>
              <Check size={14} className="mr-1" /> {editId !== null ? "Save Changes" : "Add Item"}
            </Button>
            <Button variant="ghost" onClick={cancelForm}
              style={{ color: "oklch(0.55 0.015 75)", fontFamily: "'Lato', sans-serif" }}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Items list */}
      {isLoading ? (
        <div style={{ color: "oklch(0.55 0.015 75)", textAlign: "center", padding: "3rem 0" }}>Loading inventory...</div>
      ) : filtered.length === 0 ? (
        <div style={{ color: "oklch(0.50 0.012 75)", textAlign: "center", padding: "3rem 0" }}>
          <Package size={32} style={{ margin: "0 auto 1rem", opacity: 0.4 }} />
          <p>No packaging items yet. Add your first item to track stock levels.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(grouped).map(([cat, catItems]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <span style={{ fontSize: "1rem" }}>{CATEGORY_ICONS[cat as PackagingCategory]}</span>
                <h3 style={{ color: "oklch(0.65 0.015 75)", fontSize: "0.75rem", letterSpacing: "0.1em", textTransform: "uppercase", fontFamily: "'Lato', sans-serif" }}>
                  {CATEGORY_LABELS[cat as PackagingCategory]}
                </h3>
                <div style={{ flex: 1, height: "1px", background: "oklch(1 0 0 / 8%)" }} />
              </div>
              <div className="space-y-2">
                {catItems.map((item) => {
                  const isLow = item.quantityOnHand <= item.reorderLevel && item.reorderLevel > 0;
                  return (
                    <div key={item.id} className="flex items-center gap-4 px-4 py-3 rounded"
                      style={{ background: "oklch(0.14 0.010 60)", border: `1px solid ${isLow ? "oklch(0.55 0.18 30 / 30%)" : "oklch(1 0 0 / 8%)"}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-2">
                          <span style={{ color: "oklch(0.88 0.018 75)", fontWeight: 500, fontSize: "0.9rem" }}>{item.itemName}</span>
                          {isLow && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 rounded text-xs"
                              style={{ background: "oklch(0.55 0.18 30 / 15%)", color: "oklch(0.75 0.18 30)" }}>
                              <AlertTriangle size={10} /> Low
                            </span>
                          )}
                        </div>
                        {item.notes && (
                          <p style={{ color: "oklch(0.50 0.012 75)", fontSize: "0.78rem", marginTop: "0.15rem" }}>{item.notes}</p>
                        )}
                      </div>
                      <div className="text-right" style={{ minWidth: "120px" }}>
                        <div style={{ color: isLow ? "oklch(0.75 0.18 30)" : CATEGORY_COLORS[cat as PackagingCategory], fontWeight: 700, fontSize: "1.1rem", fontFamily: "'Fira Code', monospace" }}>
                          {item.quantityOnHand.toLocaleString()}
                        </div>
                        <div style={{ color: "oklch(0.50 0.012 75)", fontSize: "0.72rem" }}>
                          {item.unit} · reorder @ {item.reorderLevel.toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="p-1.5 rounded transition-colors"
                          style={{ color: "oklch(0.55 0.015 75)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.72 0.12 75)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.55 0.015 75)")}>
                          <Pencil size={13} />
                        </button>
                        <button onClick={() => { if (confirm(`Remove "${item.itemName}"?`)) deleteItem.mutate({ id: item.id }); }}
                          className="p-1.5 rounded transition-colors"
                          style={{ color: "oklch(0.55 0.015 75)" }}
                          onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.65 0.18 25)")}
                          onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.55 0.015 75)")}>
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
