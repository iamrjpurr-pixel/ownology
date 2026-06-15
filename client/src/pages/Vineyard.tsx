import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { Plus, Trash2, Leaf, Eye, ChevronDown, ChevronUp, MapPin } from "lucide-react";

const TRAINING_SYSTEMS = ["VSP", "Scott Henry", "Smart-Dyson", "Pergola", "Bush Vine", "Other"] as const;
const OBSERVATION_TYPES = [
  { value: "budburst", label: "Budburst" },
  { value: "flowering", label: "Flowering" },
  { value: "veraison", label: "Veraison" },
  { value: "harvest_date", label: "Harvest Date" },
  { value: "spray_application", label: "Spray Application" },
  { value: "irrigation", label: "Irrigation" },
  { value: "canopy_management", label: "Canopy Management" },
  { value: "disease_scouting", label: "Disease Scouting" },
  // DR-06: structured disease/pest event types
  { value: "pest_scouting", label: "Pest Scouting" },
  { value: "disease_pest_event", label: "Disease / Pest Event" },
  { value: "yield_estimate", label: "Yield Estimate" },
  { value: "other", label: "Other" },
] as const;

const CURRENT_YEAR = new Date().getFullYear();

type Block = {
  id: number;
  blockName: string;
  variety: string;
  areaHa: number | null;
  plantingYear: number | null;
  rootstock: string | null;
  trainingSystem: string | null;
  soilType: string | null;
  aspect: string | null;
  notes: string | null;
  isActive: boolean;
};

type Observation = {
  id: number;
  blockId: number;
  observationType: string;
  observedAt: number;
  vintageYear: number;
  value: number | null;
  unit: string | null;
  notes: string | null;
};

function BlockCard({
  block,
  observations,
  onDelete,
  onAddObservation,
  onDeleteObservation,
}: {
  block: Block;
  observations: Observation[];
  onDelete: (id: number) => void;
  onAddObservation: (blockId: number) => void;
  onDeleteObservation: (id: number) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const blockObs = observations.filter((o) => o.blockId === block.id);

  return (
    <div
      style={{
        background: "var(--ow-bg-raised)",
        border: "1px solid var(--ow-bg-inset)",
        borderRadius: "8px",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4">
        <div
          className="w-8 h-8 rounded flex items-center justify-center flex-shrink-0"
          style={{ background: "oklch(0.55 0.15 145 / 20%)", border: "1px solid oklch(0.55 0.15 145 / 40%)" }}
        >
          <Leaf size={14} style={{ color: "oklch(0.65 0.15 145)" }} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, color: "var(--ow-text-hi)", fontSize: "0.95rem" }}>
              {block.blockName}
            </span>
            <span
              className="px-2 py-0.5 rounded text-xs"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)", color: "var(--ow-amber)", fontFamily: "'Lato', sans-serif" }}
            >
              {block.variety}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-0.5" style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
            {block.areaHa && <span>{block.areaHa} ha</span>}
            {block.plantingYear && <span>Planted {block.plantingYear}</span>}
            {block.trainingSystem && <span>{block.trainingSystem}</span>}
            {block.aspect && (
              <span className="flex items-center gap-1">
                <MapPin size={10} />
                {block.aspect}
              </span>
            )}
            <span style={{ color: "oklch(0.45 0.010 60)" }}>·</span>
            <span>{blockObs.length} observation{blockObs.length !== 1 ? "s" : ""}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onAddObservation(block.id)}
            style={{ color: "var(--ow-amber)", fontSize: "0.75rem", height: "28px", padding: "0 8px" }}
          >
            <Plus size={12} className="mr-1" /> Log
          </Button>
          <button
            onClick={() => setExpanded((e) => !e)}
            style={{ color: "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            onClick={() => onDelete(block.id)}
            style={{ color: "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", padding: "4px" }}
          >
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded observations */}
      {expanded && (
        <div style={{ borderTop: "1px solid var(--ow-bg-inset)", padding: "12px 16px" }}>
          {block.notes && (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "oklch(0.60 0.012 75)", marginBottom: "12px", fontStyle: "italic" }}>
              {block.notes}
            </p>
          )}
          {blockObs.length === 0 ? (
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "oklch(0.45 0.010 60)", textAlign: "center", padding: "12px 0" }}>
              No observations logged yet
            </p>
          ) : (
            <div className="flex flex-col gap-2">
              {blockObs.map((obs) => (
                <div
                  key={obs.id}
                  className="flex items-center gap-3 p-2 rounded"
                  style={{ background: "oklch(0.11 0.006 60)" }}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "var(--ow-text-mid)", textTransform: "capitalize" }}>
                        {obs.observationType.replace(/_/g, " ")}
                      </span>
                      {obs.value !== null && (
                        <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.75rem", color: "var(--ow-amber)" }}>
                          {obs.value}{obs.unit ? ` ${obs.unit}` : ""}
                        </span>
                      )}
                      <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: "oklch(0.45 0.010 60)" }}>
                        {new Date(obs.observedAt).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" })}
                      </span>
                      <span
                        className="px-1.5 py-0.5 rounded text-xs"
                        style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-lo)" }}
                      >
                        {obs.vintageYear}
                      </span>
                    </div>
                    {obs.notes && (
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: "oklch(0.50 0.010 60)", marginTop: "2px" }}>
                        {obs.notes}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => onDeleteObservation(obs.id)}
                    style={{ color: "oklch(0.45 0.010 60)", background: "none", border: "none", cursor: "pointer", padding: "4px", flexShrink: 0 }}
                  >
                    <Trash2 size={12} />
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

export default function Vineyard() {
  const utils = trpc.useUtils();

  const { data: blocks = [], isLoading } = trpc.vineyard.listBlocks.useQuery();
  const { data: observations = [] } = trpc.vineyard.listObservations.useQuery();

  // Add block dialog
  const [showAddBlock, setShowAddBlock] = useState(false);
  const [blockForm, setBlockForm] = useState({
    blockName: "",
    variety: "",
    areaHa: "",
    plantingYear: "",
    rootstock: "",
    trainingSystem: "VSP" as typeof TRAINING_SYSTEMS[number],
    soilType: "",
    aspect: "",
    notes: "",
  });

  // Add observation dialog
  const [obsBlockId, setObsBlockId] = useState<number | null>(null);
  const [obsForm, setObsForm] = useState({
    observationType: "budburst" as typeof OBSERVATION_TYPES[number]["value"],
    observedAt: new Date().toISOString().split("T")[0],
    vintageYear: String(CURRENT_YEAR),
    value: "",
    unit: "",
    notes: "",
  });

  const addBlock = trpc.vineyard.addBlock.useMutation({
    onSuccess: () => {
      utils.vineyard.listBlocks.invalidate();
      setShowAddBlock(false);
      setBlockForm({ blockName: "", variety: "", areaHa: "", plantingYear: "", rootstock: "", trainingSystem: "VSP", soilType: "", aspect: "", notes: "" });
      toast.success("Block added");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteBlock = trpc.vineyard.deleteBlock.useMutation({
    onSuccess: () => { utils.vineyard.listBlocks.invalidate(); toast.success("Block removed"); },
    onError: (e) => toast.error(e.message),
  });

  const addObservation = trpc.vineyard.addObservation.useMutation({
    onSuccess: () => {
      utils.vineyard.listObservations.invalidate();
      setObsBlockId(null);
      setObsForm({ observationType: "budburst", observedAt: new Date().toISOString().split("T")[0], vintageYear: String(CURRENT_YEAR), value: "", unit: "", notes: "" });
      toast.success("Observation logged");
    },
    onError: (e) => toast.error(e.message),
  });

  const deleteObservation = trpc.vineyard.deleteObservation.useMutation({
    onSuccess: () => { utils.vineyard.listObservations.invalidate(); toast.success("Observation deleted"); },
    onError: (e) => toast.error(e.message),
  });

  const handleAddBlock = () => {
    if (!blockForm.blockName.trim() || !blockForm.variety.trim()) {
      toast.error("Block name and variety are required");
      return;
    }
    addBlock.mutate({
      blockName: blockForm.blockName.trim(),
      variety: blockForm.variety.trim(),
      areaHa: blockForm.areaHa ? parseFloat(blockForm.areaHa) : undefined,
      plantingYear: blockForm.plantingYear ? parseInt(blockForm.plantingYear) : undefined,
      rootstock: blockForm.rootstock || undefined,
      trainingSystem: blockForm.trainingSystem,
      soilType: blockForm.soilType || undefined,
      aspect: blockForm.aspect || undefined,
      notes: blockForm.notes || undefined,
    });
  };

  const handleAddObservation = () => {
    if (!obsBlockId) return;
    addObservation.mutate({
      blockId: obsBlockId,
      observationType: obsForm.observationType,
      observedAt: new Date(obsForm.observedAt).getTime(),
      vintageYear: parseInt(obsForm.vintageYear),
      value: obsForm.value ? parseFloat(obsForm.value) : undefined,
      unit: obsForm.unit || undefined,
      notes: obsForm.notes || undefined,
    });
  };

  // Summary stats
  const totalHa = (blocks as Block[]).reduce((sum, b) => sum + (b.areaHa ?? 0), 0);
  const varieties = Array.from(new Set((blocks as Block[]).map((b) => b.variety)));

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", fontFamily: "'Lato', sans-serif" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ow-bg-inset)", padding: "24px 0" }}>
        <div className="container">
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.8rem", color: "var(--ow-text-hi)" }}>
                Vineyard
              </h1>
              <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginTop: "4px" }}>
                Block register · Phenology · Observations
              </p>
            </div>
            <Button
              onClick={() => setShowAddBlock(true)}
              style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}
            >
              <Plus size={16} className="mr-2" /> Add Block
            </Button>
          </div>

          {/* Summary bar */}
          {(blocks as Block[]).length > 0 && (
            <div className="flex items-center gap-6 mt-4">
              {[
                { label: "Blocks", value: String((blocks as Block[]).length) },
                { label: "Total Area", value: totalHa > 0 ? `${totalHa.toFixed(1)} ha` : "—" },
                { label: "Varieties", value: String(varieties.length) },
                { label: "Observations", value: String((observations as Observation[]).length) },
              ].map((stat) => (
                <div key={stat.label}>
                  <div style={{ fontFamily: "'Fira Code', monospace", fontSize: "1.1rem", color: "var(--ow-amber)", fontWeight: 600 }}>
                    {stat.value}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "oklch(0.50 0.010 60)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container" style={{ paddingTop: "24px", paddingBottom: "48px" }}>
        {isLoading ? (
          <div style={{ textAlign: "center", color: "oklch(0.50 0.010 60)", padding: "48px 0" }}>Loading blocks…</div>
        ) : (blocks as Block[]).length === 0 ? (
          <div style={{ textAlign: "center", padding: "64px 0" }}>
            <Leaf size={40} style={{ color: "oklch(0.30 0.010 60)", margin: "0 auto 16px" }} />
            <p style={{ color: "var(--ow-text-lo)", fontSize: "1rem", marginBottom: "8px" }}>No vineyard blocks registered yet</p>
            <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginBottom: "24px" }}>
              Add your first block to start tracking phenology, spray applications, and harvest data.
            </p>
            <Button
              onClick={() => setShowAddBlock(true)}
              style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)", fontFamily: "'Lato', sans-serif", fontWeight: 600 }}
            >
              <Plus size={16} className="mr-2" /> Add First Block
            </Button>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {(blocks as Block[]).map((block) => (
              <BlockCard
                key={block.id}
                block={block}
                observations={observations as Observation[]}
                onDelete={(id) => deleteBlock.mutate({ id })}
                onAddObservation={(blockId) => setObsBlockId(blockId)}
                onDeleteObservation={(id) => deleteObservation.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>

      {/* Add Block Dialog */}
      <Dialog open={showAddBlock} onOpenChange={setShowAddBlock}>
        <DialogContent style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>Add Vineyard Block</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Block Name *</label>
                <Input
                  value={blockForm.blockName}
                  onChange={(e) => setBlockForm((f) => ({ ...f, blockName: e.target.value }))}
                  placeholder="e.g. Block A, North Slope"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Variety *</label>
                <Input
                  value={blockForm.variety}
                  onChange={(e) => setBlockForm((f) => ({ ...f, variety: e.target.value }))}
                  placeholder="e.g. Shiraz"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Area (ha)</label>
                <Input
                  type="number"
                  value={blockForm.areaHa}
                  onChange={(e) => setBlockForm((f) => ({ ...f, areaHa: e.target.value }))}
                  placeholder="e.g. 2.5"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Planted</label>
                <Input
                  type="number"
                  value={blockForm.plantingYear}
                  onChange={(e) => setBlockForm((f) => ({ ...f, plantingYear: e.target.value }))}
                  placeholder="e.g. 1998"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Training</label>
                <Select value={blockForm.trainingSystem} onValueChange={(v) => setBlockForm((f) => ({ ...f, trainingSystem: v as typeof TRAINING_SYSTEMS[number] }))}>
                  <SelectTrigger style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)" }}>
                    {TRAINING_SYSTEMS.map((t) => (
                      <SelectItem key={t} value={t} style={{ color: "var(--ow-text-hi)" }}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Rootstock</label>
                <Input
                  value={blockForm.rootstock}
                  onChange={(e) => setBlockForm((f) => ({ ...f, rootstock: e.target.value }))}
                  placeholder="e.g. 1103P"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Aspect</label>
                <Input
                  value={blockForm.aspect}
                  onChange={(e) => setBlockForm((f) => ({ ...f, aspect: e.target.value }))}
                  placeholder="e.g. North-facing"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Soil Type</label>
              <Input
                value={blockForm.soilType}
                onChange={(e) => setBlockForm((f) => ({ ...f, soilType: e.target.value }))}
                placeholder="e.g. Red-brown earth over limestone"
                style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
              />
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Notes</label>
              <Textarea
                value={blockForm.notes}
                onChange={(e) => setBlockForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Any additional notes about this block…"
                rows={2}
                style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px", resize: "none" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setShowAddBlock(false)} style={{ color: "var(--ow-text-lo)" }}>Cancel</Button>
            <Button
              onClick={handleAddBlock}
              disabled={addBlock.isPending}
              style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)", fontWeight: 600 }}
            >
              {addBlock.isPending ? "Adding…" : "Add Block"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Observation Dialog */}
      <Dialog open={obsBlockId !== null} onOpenChange={(open) => { if (!open) setObsBlockId(null); }}>
        <DialogContent style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)" }}>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>
              Log Observation — {(blocks as Block[]).find((b) => b.id === obsBlockId)?.blockName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Observation Type</label>
                <Select value={obsForm.observationType} onValueChange={(v) => setObsForm((f) => ({ ...f, observationType: v as typeof obsForm.observationType }))}>
                  <SelectTrigger style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)" }}>
                    {OBSERVATION_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value} style={{ color: "var(--ow-text-hi)" }}>{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Date</label>
                <Input
                  type="date"
                  value={obsForm.observedAt}
                  onChange={(e) => setObsForm((f) => ({ ...f, observedAt: e.target.value }))}
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Vintage Year</label>
                <Input
                  type="number"
                  value={obsForm.vintageYear}
                  onChange={(e) => setObsForm((f) => ({ ...f, vintageYear: e.target.value }))}
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Value</label>
                <Input
                  type="number"
                  value={obsForm.value}
                  onChange={(e) => setObsForm((f) => ({ ...f, value: e.target.value }))}
                  placeholder="e.g. 24.5"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
              <div>
                <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Unit</label>
                <Input
                  value={obsForm.unit}
                  onChange={(e) => setObsForm((f) => ({ ...f, unit: e.target.value }))}
                  placeholder="e.g. °Brix"
                  style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px" }}
                />
              </div>
            </div>
            <div>
              <label style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", letterSpacing: "0.06em", textTransform: "uppercase" }}>Notes</label>
              <Textarea
                value={obsForm.notes}
                onChange={(e) => setObsForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Observation notes…"
                rows={2}
                style={{ background: "oklch(0.11 0.006 60)", border: "1px solid var(--ow-bg-inset)", color: "var(--ow-text-hi)", marginTop: "4px", resize: "none" }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setObsBlockId(null)} style={{ color: "var(--ow-text-lo)" }}>Cancel</Button>
            <Button
              onClick={handleAddObservation}
              disabled={addObservation.isPending}
              style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)", fontWeight: 600 }}
            >
              {addObservation.isPending ? "Logging…" : "Log Observation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
