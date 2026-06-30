/**
 * Knowledge Platform — Sprint 7
 * /knowledge — Category grid landing page
 * /knowledge/:category — SOP list for a category
 * /knowledge/sop/:id — Individual SOP with all five layers
 * /knowledge/training — Training records overview
 * /knowledge/vintage-debrief — Vintage debrief view
 */

import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import FreeRunBridgeLink from "@/components/FreeRunBridgeLink";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

// S8-D: Map real SOP categories to Free Run curiosity topics.
// Categories with no clear curiosity counterpart are omitted (no link shown).
const CATEGORY_FREE_RUN_TOPIC: Record<string, string> = {
  "Fermentation Management": "Fermentation Chemistry",
  "Yeast & Fermentation": "Fermentation Chemistry",
  "SO₂ Management": "Wine Analysis",
  "Malolactic Fermentation": "Fermentation Chemistry",
  "Racking & Clarification": "How Wine Is Made",
  "Additions & Chemistry": "Wine Analysis",
  "Harvest & Receival": "How Wine Is Made",
  "Pressing & Free-Run": "How Wine Is Made",
  "Bottling & Packaging": "Packaging & Ageing",
  "Sanitation & Equipment": "Microbiology & Sanitation",
  "Fault Diagnosis": "Wine Analysis",
  "Laboratory Testing": "Wine Analysis",
};
import {
  BookOpen,
  FlaskConical,
  Droplets,
  Wine,
  Package,
  TestTube,
  Users,
  ShieldCheck,
  Barcode,
  ChevronRight,
  ArrowLeft,
  Brain,
  Lightbulb,
  BookMarked,
  GraduationCap,
  Printer,
  Plus,
  Trash2,
  ExternalLink,
} from "lucide-react";

// ─── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<string, {
  label: string;
  icon: React.ReactNode;
  color: string;
  industryRef: string;
  description: string;
}> = {
  "Harvest & Receival": {
    label: "Harvest & Receival",
    icon: <Wine className="w-6 h-6" />,
    color: "oklch(0.62 0.12 30)",
    industryRef: "Oenology 1 · Oenology 2",
    description: "Harvest decision, sampling, fruit reception, sorting, and pre-fermentation handling.",
  },
  "Fermentation Management": {
    label: "Fermentation Management",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "var(--ow-amber)",
    industryRef: "Oenology 2 · Oenology 4",
    description: "Red and white ferment management, temperature, cap management, and extraction strategy.",
  },
  "Yeast & Fermentation": {
    label: "Yeast & Fermentation",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "oklch(0.65 0.12 80)",
    industryRef: "Oenology 4",
    description: "Strain selection, rehydration and inoculation, YAN management and DAP additions.",
  },
  "SO₂ Management": {
    label: "SO₂ Management",
    icon: <Droplets className="w-6 h-6" />,
    color: "oklch(0.65 0.12 220)",
    industryRef: "Oenology 3 · Oenology 6",
    description: "SO₂ at the crush, post-MLF adjustment, and free vs molecular SO₂ calculation.",
  },
  "Malolactic Fermentation": {
    label: "Malolactic Fermentation",
    icon: <FlaskConical className="w-6 h-6" />,
    color: "oklch(0.62 0.12 120)",
    industryRef: "Oenology 4 · Oenology 5",
    description: "MLF management, inoculation strategy, and co-inoculation with primary yeast.",
  },
  "Pressing & Free-Run": {
    label: "Pressing & Free-Run",
    icon: <Wine className="w-6 h-6" />,
    color: "oklch(0.62 0.10 15)",
    industryRef: "Oenology 2 · Oenology 5",
    description: "Press cycle selection, free-run vs press-run separation, and whole-bunch pressing.",
  },
  "Racking & Clarification": {
    label: "Racking & Clarification",
    icon: <Droplets className="w-6 h-6" />,
    color: "oklch(0.65 0.10 200)",
    industryRef: "Oenology 5 · Oenology 6",
    description: "Racking off gross lees, bâtonnage, cold stabilisation, and protein fining.",
  },
  "Additions & Chemistry": {
    label: "Additions & Chemistry",
    icon: <TestTube className="w-6 h-6" />,
    color: "oklch(0.65 0.10 280)",
    industryRef: "Oenology 3 · Oenology 6",
    description: "Acid and sugar adjustment, tannin and oak programme decisions.",
  },
  "Bottling & Packaging": {
    label: "Bottling & Packaging",
    icon: <Package className="w-6 h-6" />,
    color: "oklch(0.62 0.10 145)",
    industryRef: "Oenology 8",
    description: "Pre-bottling filtration, line setup, closure selection, and finished goods release.",
  },
  "Sanitation & Equipment": {
    label: "Sanitation & Equipment",
    icon: <ShieldCheck className="w-6 h-6" />,
    color: "oklch(0.65 0.10 160)",
    industryRef: "Oenology 2 · Oenology 3",
    description: "Tank cleaning, barrel topping, hose/pump hygiene and CIP best practice.",
  },
  "Fault Diagnosis": {
    label: "Fault Diagnosis",
    icon: <Brain className="w-6 h-6" />,
    color: "oklch(0.60 0.14 30)",
    industryRef: "Oenology 5 · Oenology 6",
    description: "Stuck ferments, Brettanomyces, volatile acidity, and reductive fault response.",
  },
  "Laboratory Testing": {
    label: "Laboratory Testing",
    icon: <TestTube className="w-6 h-6" />,
    color: "oklch(0.65 0.10 280)",
    industryRef: "Oenology 3 · Oenology 6",
    description: "Brix/SG monitoring, pH and TA, bench trials for fining and acid adjustment.",
  },
};

const ALL_CATEGORIES = Object.keys(CATEGORY_META);

// Categories that contain DIY home winemaker SOPs
const DIY_CATEGORIES = new Set([
  "Fermentation Management",
  "Yeast & Fermentation",
  "Malolactic Fermentation",
  "Sanitation & Equipment",
  "Bottling & Packaging",
]);

// ─── Knowledge Home ───────────────────────────────────────────────────────────

function KnowledgeHome() {
  const [search, setSearch] = useState("");
  const [layerFilter, setLayerFilter] = useState<string | null>(null);
  const [tooltipOpen, setTooltipOpen] = useState(false);
  const { data: allSops = [] } = trpc.knowledge.listSops.useQuery({ audience: "commercial" });

  const baseCategories = ALL_CATEGORIES;

  const filteredCategories = baseCategories.filter((cat) => {
    const meta = CATEGORY_META[cat];
    const catsOps = allSops.filter((s) => s.category === cat);
    
    // If layerFilter is set, only show categories with SOPs that have that layer populated
    if (layerFilter) {
      const hasLayer = catsOps.some((s) => {
        if (layerFilter === "Procedure") return s.procedureText?.trim();
        if (layerFilter === "Decision Logic") return s.decisionLogic?.trim();
        if (layerFilter === "Tribal Knowledge") return s.tribalKnowledge?.trim();
        if (layerFilter === "Vintage Notes") return (s as any).vintageNotes?.trim();
        if (layerFilter === "Training") return (s as any).training?.trim();
        return false;
      });
      if (!hasLayer) return false;
    }
    
    // Apply search filter
    if (search.trim()) {
      const matchCat = cat.toLowerCase().includes(search.toLowerCase());
      const matchSop = catsOps.some(
        (s) => s.title.toLowerCase().includes(search.toLowerCase())
      );
      const matchDesc = meta?.description.toLowerCase().includes(search.toLowerCase());
      return matchCat || matchSop || matchDesc;
    }
    
    return true;
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      {/* Header */}
      <div
        className="border-b"
        style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}
      >
        <div className="container py-8 px-4 md:px-6">
          <Link href="/">
            <button
              className="flex items-center gap-2 text-sm mb-6 transition-colors hover:opacity-80"
              style={{ color: "var(--ow-text-lo)" }}
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Ownology
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4 md:gap-6 flex-wrap">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <BookOpen className="w-7 h-7" style={{ color: "var(--ow-amber)" }} />
                <h1
                  className="text-3xl font-bold"
                  style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}
                >
                  Knowledge Platform
                </h1>
              </div>
              <p style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}>
                SOPs, decision logic, vintage lessons, and training records — all in one place.
              </p>
            </div>
            <div className="flex gap-2 md:gap-3 flex-wrap">
              <Link href="/knowledge/training">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs md:text-sm"
                  style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}
                >
                  <GraduationCap className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Training Records</span>
                  <span className="sm:hidden">Training</span>
                </Button>
              </Link>
              <Link href="/knowledge/vintage-debrief">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2 text-xs md:text-sm"
                  style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}
                >
                  <BookMarked className="w-4 h-4 flex-shrink-0" />
                  <span className="hidden sm:inline">Vintage Debrief</span>
                  <span className="sm:hidden">Debrief</span>
                </Button>
              </Link>
            </div>
          </div>

          {/* Search + audience filter */}
          <div className="mt-6 flex flex-wrap gap-3 items-center">
            <Input
              placeholder="Search SOPs, categories, or topics…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="bg-transparent border-white/10 text-sm flex-1 min-w-[200px] max-w-sm"
              style={{ color: "var(--ow-text-hi)" }}
            />
            <Link href="/for-home-winemakers">
              <button
                className="px-3 py-1.5 text-xs rounded transition-all"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  background: "transparent",
                  border: "1px solid oklch(0.65 0.10 220 / 40%)",
                  color: "oklch(0.65 0.10 220)",
                }}
              >
                🍷 DIY Home Winemaker →
              </button>
            </Link>
          </div>
        </div>
      </div>

      {/* Category grid */}
        <div className="container py-8 md:py-10 px-4 md:px-6">
        {/* Stats row */}
          <div className="flex gap-6 md:gap-8 mb-8 flex-wrap">
          <div>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-amber)" }}>
              {baseCategories.length}
            </p>
            <p className="text-xs" style={{ color: "var(--ow-text-lo)" }}>Categories</p>
          </div>
          <div>
            <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-amber)" }}>
              {allSops.length}
            </p>
            <p className="text-xs" style={{ color: "var(--ow-text-lo)" }}>SOPs</p>
          </div>
          <div className="relative">
            <p className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-amber)" }}>5</p>
            <button
              onClick={() => setTooltipOpen(!tooltipOpen)}
              className="text-xs flex items-center gap-1 cursor-pointer hover:opacity-80 transition-opacity"
              style={{ color: "var(--ow-text-lo)" }}
              aria-label="Toggle Knowledge Layers info"
            >
              Knowledge Layers
              <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.5, flexShrink: 0 }}>
                <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.1"/>
                <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                <circle cx="6" cy="3.75" r="0.6" fill="currentColor"/>
              </svg>
            </button>
            {/* Tooltip */}
            <div
              className="absolute bottom-full left-0 mb-2 z-20 pointer-events-auto transition-opacity duration-150"
              style={{ width: "220px", opacity: tooltipOpen ? 1 : 0, pointerEvents: tooltipOpen ? "auto" : "none" }}
            >
              <div style={{
                background: "oklch(0.14 0.008 60)",
                border: "1px solid oklch(0.72 0.12 75 / 30%)",
                borderRadius: "4px",
                padding: "0.625rem 0.75rem",
                boxShadow: "0 4px 20px oklch(0 0 0 / 0.35)",
              }}>
                <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", fontWeight: 600, color: "var(--ow-amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>5 Layers per SOP</p>
                {[
                  ["Procedure", "Step-by-step method"],
                  ["Decision Logic", "When and why to deviate"],
                  ["Tribal Knowledge", "What the textbooks don't say"],
                  ["Vintage Notes", "What actually happened"],
                  ["Training", "How to teach it"],
                ].map(([layer, desc], i) => (
                  <div
                    key={layer}
                    onClick={() => setLayerFilter(layerFilter === layer ? null : layer)}
                    style={{
                      marginBottom: i < 4 ? "0.375rem" : 0,
                      cursor: "pointer",
                      padding: "0.375rem",
                      borderRadius: "3px",
                      background: layerFilter === layer ? "oklch(0.72 0.12 75 / 20%)" : "transparent",
                      transition: "background 150ms",
                    }}
                  >
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.88 0.015 75)", lineHeight: 1.4 }}>
                      <span style={{ color: "var(--ow-amber)", marginRight: "0.375rem", fontFamily: "'Fira Code', monospace", fontSize: "0.65rem" }}>{i + 1}.</span>
                      <strong style={{ fontWeight: 500 }}>{layer}</strong>
                    </p>
                    <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: "oklch(0.60 0.012 75)", lineHeight: 1.4, paddingLeft: "1rem" }}>{desc}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
          {filteredCategories.map((cat) => {
            const meta = CATEGORY_META[cat];
            const sopCount = allSops.filter((s) => s.category === cat).length;
            return (
              <Link key={cat} href={`/knowledge/category/${encodeURIComponent(cat)}`}>
                <div
                  className="rounded-lg p-5 cursor-pointer transition-all active:scale-95"
                  style={{
                    background: "var(--ow-bg-raised)",
                    border: "1px solid var(--ow-border)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = `${meta?.color ?? "var(--ow-amber)"} / 40%`;
                    (e.currentTarget as HTMLDivElement).style.background = "var(--ow-bg-inset)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "var(--ow-border)";
                    (e.currentTarget as HTMLDivElement).style.background = "var(--ow-bg-raised)";
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-lg flex items-center justify-center mb-3 flex-shrink-0"
                    style={{ background: `${meta?.color ?? "var(--ow-amber)"} / 15%`, color: meta?.color ?? "var(--ow-amber)" }}
                  >
                    {meta?.icon}
                  </div>
                  <h3
                    className="font-semibold text-sm mb-2 line-clamp-2"
                    style={{ color: "var(--ow-text-hi)" }}
                  >
                    {cat}
                  </h3>
                  <p
                    className="text-xs mb-3 leading-relaxed line-clamp-3"
                    style={{ color: "var(--ow-text-lo)" }}
                  >
                    {meta?.description}
                  </p>
                  <div className="flex items-center justify-between gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs flex-shrink-0"
                      style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-lo)" }}
                    >
                      {sopCount} SOP{sopCount !== 1 ? "s" : ""}
                    </Badge>
                    <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ow-text-lo)" }} />
                  </div>
                  {meta?.industryRef && (
                    <p className="text-xs mt-2 line-clamp-1" style={{ color: "var(--ow-text-lo)" }}>
                      Further Study: {meta.industryRef}
                    </p>
                  )}
                </div>
              </Link>
            );
          })}
        </div>

        {filteredCategories.length === 0 && (
          <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>
            <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No categories match your search.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Category Page ────────────────────────────────────────────────────────────

function KnowledgeCategory({ category }: { category: string }) {
  const decodedCat = decodeURIComponent(category);
  const meta = CATEGORY_META[decodedCat];
  const { data: sops = [], isLoading } = trpc.knowledge.listSops.useQuery({ category: decodedCat, audience: "commercial" });

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      <div className="border-b" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}>
        <div className="container py-8">
          <Link href="/knowledge">
            <button className="flex items-center gap-2 text-sm mb-4 transition-colors" style={{ color: "var(--ow-text-lo)" }}>
              <ArrowLeft className="w-4 h-4" />
              Knowledge Platform
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: `${meta?.color ?? "var(--ow-amber)"} / 15%`, color: meta?.color ?? "var(--ow-amber)" }}>
              {meta?.icon}
            </div>
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>
              {decodedCat}
            </h1>
          </div>
          <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>{meta?.description}</p>
          {meta?.industryRef && (
            <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>
              Industry Curriculum: {meta.industryRef}
            </p>
          )}
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>Loading SOPs…</div>
        ) : (
          <div className="space-y-3">
            {sops.map((sop) => (
              <Link key={sop.id} href={`/knowledge/sop/${sop.id}`}>
                <div
                  className="rounded-lg p-5 cursor-pointer transition-all flex items-center justify-between gap-4"
                  style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--ow-bg-inset)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.background = "var(--ow-bg-raised)"; }}
                >
                  <div>
                    <h3 className="font-medium text-sm mb-1" style={{ color: "var(--ow-text-hi)" }}>{sop.title}</h3>
                    <div className="flex gap-2 flex-wrap">
                      {sop.decisionLogic && <Badge variant="outline" className="text-xs gap-1" style={{ borderColor: "color-mix(in oklch, var(--ow-amber) 30%, transparent)", color: "var(--ow-amber)" }}><Brain className="w-3 h-3" />Decision Logic</Badge>}
                      {sop.tribalKnowledge && <Badge variant="outline" className="text-xs gap-1" style={{ borderColor: "oklch(0.65 0.10 220 / 30%)", color: "oklch(0.65 0.10 220)" }}><Lightbulb className="w-3 h-3" />Tribal Knowledge</Badge>}
                      {sop.csuSubjectRef && <Badge variant="outline" className="text-xs" style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-lo)" }}>Further Study: {sop.csuSubjectRef}</Badge>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "var(--ow-text-lo)" }} />
                </div>
              </Link>
            ))}
            {sops.length === 0 && (
              <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>
                <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No SOPs in this category yet. They will appear once seeded.</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── SOP Detail Page ──────────────────────────────────────────────────────────

function SopDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const { data: sop, isLoading } = trpc.knowledge.getSop.useQuery({ id });
  const [activeTab, setActiveTab] = useState<"procedure" | "decision" | "tribal" | "vintage" | "training">("procedure");
  const [editingDecision, setEditingDecision] = useState(false);
  const [editingTribal, setEditingTribal] = useState(false);
  const [decisionText, setDecisionText] = useState("");
  const [tribalText, setTribalText] = useState("");

  // Vintage note form
  const [showVintageForm, setShowVintageForm] = useState(false);
  const [vintageYear, setVintageYear] = useState(new Date().getFullYear());
  const [whatWorked, setWhatWorked] = useState("");
  const [whatFailed, setWhatFailed] = useState("");
  const [whatToChange, setWhatToChange] = useState("");

  // Training record form
  const [showTrainingForm, setShowTrainingForm] = useState(false);
  const [trainerName, setTrainerName] = useState("");
  const [traineeName, setTraineeName] = useState("");
  const [traineeRole, setTraineeRole] = useState("");
  const [trainingNotes, setTrainingNotes] = useState("");

  const updateDecision = trpc.knowledge.updateDecisionLogic.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); setEditingDecision(false); toast.success("Decision logic saved"); },
  });
  const updateTribal = trpc.knowledge.updateTribalKnowledge.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); setEditingTribal(false); toast.success("Tribal knowledge saved"); },
  });
  const addVintageNote = trpc.knowledge.addVintageNote.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); setShowVintageForm(false); setWhatWorked(""); setWhatFailed(""); setWhatToChange(""); toast.success("Vintage note added"); },
  });
  const deleteVintageNote = trpc.knowledge.deleteVintageNote.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); toast.success("Note deleted"); },
  });
  const addTraining = trpc.knowledge.addTrainingRecord.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); setShowTrainingForm(false); setTrainerName(""); setTraineeName(""); setTraineeRole(""); setTrainingNotes(""); toast.success("Training record added"); },
  });
  const deleteTraining = trpc.knowledge.deleteTrainingRecord.useMutation({
    onSuccess: () => { utils.knowledge.getSop.invalidate({ id }); toast.success("Record deleted"); },
  });

  if (isLoading) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-lo)" }}>Loading SOP…</div>;
  if (!sop) return <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-lo)" }}>SOP not found.</div>;

  const meta = CATEGORY_META[sop.category];

  const TABS = [
    { key: "procedure", label: "Procedure", icon: <BookOpen className="w-4 h-4" /> },
    { key: "decision", label: "Decision Logic", icon: <Brain className="w-4 h-4" /> },
    { key: "tribal", label: "Tribal Knowledge", icon: <Lightbulb className="w-4 h-4" /> },
    { key: "vintage", label: `Vintage Notes (${sop.vintageNotes?.length ?? 0})`, icon: <BookMarked className="w-4 h-4" /> },
    { key: "training", label: `Training (${sop.trainingRecords?.length ?? 0})`, icon: <GraduationCap className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}>
        <div className="container py-6">
          <Link href={`/knowledge/category/${encodeURIComponent(sop.category)}`}>
            <button className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--ow-text-lo)" }}>
              <ArrowLeft className="w-4 h-4" />
              {sop.category}
            </button>
          </Link>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold mb-1" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>{sop.title}</h1>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-xs" style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-lo)" }}>{sop.category}</Badge>
                {sop.csuSubjectRef && <Badge variant="outline" className="text-xs" style={{ borderColor: "oklch(0.65 0.10 280 / 30%)", color: "oklch(0.65 0.10 280)" }}>Further Study: {sop.csuSubjectRef}</Badge>}
                {sop.isTemplate && <Badge variant="outline" className="text-xs" style={{ borderColor: "color-mix(in oklch, var(--ow-amber) 30%, transparent)", color: "var(--ow-amber)" }}>Platform Template</Badge>}
              </div>
            </div>
            <div className="flex gap-2 flex-wrap print:hidden">
              <Link href={`/free-run?q=${encodeURIComponent(`Tell me more about: ${sop.title}`)}`}>
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-2"
                  style={{ borderColor: "color-mix(in oklch, var(--ow-amber) 30%, transparent)", color: "var(--ow-amber)" }}
                >
                  <ExternalLink className="w-4 h-4" />
                  Ask AI Tutor
                </Button>
              </Link>
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.print()}
                style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}
              >
                <Printer className="w-4 h-4" />
                Print SOP
              </Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="container">
          <div className="flex gap-0 overflow-x-auto">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className="flex items-center gap-2 px-4 py-3 text-sm whitespace-nowrap border-b-2 transition-colors"
                style={{
                  borderColor: activeTab === tab.key ? "var(--ow-amber)" : "transparent",
                  color: activeTab === tab.key ? "var(--ow-amber)" : "var(--ow-text-lo)",
                }}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Tab content */}
      <div className="container py-8 max-w-4xl">

        {/* ── Quick Steps panel — shown at top of Procedure tab when available ── */}
        {activeTab === "procedure" && sop.quickSteps && (
          <div
            className="mb-8 p-5 rounded-sm"
            style={{
              background: "var(--ow-bg-raised)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.6rem",
                  letterSpacing: "0.12em",
                  color: "var(--ow-bg-base)",
                  background: "var(--ow-amber)",
                  fontWeight: 700,
                }}
              >
                QUICK STEPS
              </span>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                Cellar-ready checklist
              </span>
            </div>
            <ul className="space-y-2">
              {sop.quickSteps.split("\n").filter((l: string) => l.trim().startsWith("-")).map((line: string, i: number) => (
                <li key={i} className="flex items-start gap-2.5">
                  <span
                    className="mt-1.5 flex-shrink-0"
                    style={{ width: "6px", height: "6px", borderRadius: "50%", background: "var(--ow-amber)", display: "inline-block", marginTop: "8px" }}
                  />
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "var(--ow-text-hi)", lineHeight: 1.6 }}>
                    {line.replace(/^-\s*/, "")}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* ── Procedure ── */}
        {activeTab === "procedure" && (
          <div>
            <div className="prose prose-invert max-w-none" style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato', sans-serif", lineHeight: 1.8 }}>
              {sop.procedureText ? (
                <pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: "'Lato', sans-serif" }}>{sop.procedureText}</pre>
              ) : (
                <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
                  <BookOpen className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>Procedure text will appear here once SOPs are seeded.</p>
                </div>
              )}
            </div>

            {/* Wine Bible chapter cross-refs (Feb 2026). Hydrated by the
                getSop procedure — turns the hidden 220-chunk reference
                library into a visible "Deepen your understanding" sidebar.
                Same RAG source the AI tutor uses to ground answers, now
                surfaced as a tangible educational artefact. */}
            {Array.isArray((sop as { bibleRefs?: unknown }).bibleRefs) && (sop as { bibleRefs: Array<{ sourceDoc: string; chapterRef: string; chapterTitle: string; label: string }> }).bibleRefs.length > 0 && (
              <div
                data-testid="sop-bible-refs"
                className="mt-6 rounded-md p-5"
                style={{
                  background: "var(--ow-bg-base)",
                  border: "1px solid var(--ow-border-md)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden style={{ flexShrink: 0 }}>
                    <path d="M2 2.5A1.5 1.5 0 0 1 3.5 1H11v11H3.5A1.5 1.5 0 0 1 2 10.5v-8Z" stroke="var(--ow-text-mid)" strokeWidth="1.2" fill="none" />
                    <path d="M11 1v11" stroke="var(--ow-text-mid)" strokeWidth="1.2" />
                    <path d="M4 4h5M4 6.5h5M4 9h3" stroke="var(--ow-text-mid)" strokeWidth="0.9" strokeLinecap="round" />
                  </svg>
                  <span
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      color: "var(--ow-text-mid)",
                      textTransform: "uppercase",
                    }}
                  >
                    Deepen your understanding
                  </span>
                </div>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {(sop as { bibleRefs: Array<{ sourceDoc: string; chapterRef: string; chapterTitle: string; label: string }> }).bibleRefs.map((ref, i) => (
                    <li
                      key={`${ref.sourceDoc}-${ref.chapterRef}-${i}`}
                      data-testid={`sop-bible-ref-${i}`}
                      style={{ display: "flex", gap: "0.6rem", alignItems: "baseline", lineHeight: 1.5 }}
                    >
                      <span
                        style={{
                          fontFamily: "'Lato',sans-serif",
                          fontSize: "0.72rem",
                          fontWeight: 700,
                          color: "var(--ow-amber)",
                          letterSpacing: "0.02em",
                          whiteSpace: "nowrap",
                          flexShrink: 0,
                        }}
                      >
                        {ref.label}
                      </span>
                      <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.86rem", color: "var(--ow-text-hi)" }}>
                        {ref.chapterTitle}
                      </span>
                    </li>
                  ))}
                </ul>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", margin: "0.9rem 0 0", lineHeight: 1.5 }}>
                  Source material grounding the cellar AI's answers on this topic.
                </p>
              </div>
            )}

            {/* Boutique-scale companion — only present on the 7 SOPs that map onto
                Red Wine Making Outline sections. Renders as a distinct amber-bordered
                sidebar so boutique winemakers immediately see scale-appropriate
                guidance alongside the commercial procedure above. */}
            {sop.boutiqueCompanion && (
              <div
                data-testid="sop-boutique-companion"
                className="mt-6 rounded-md p-5"
                style={{
                  background: "color-mix(in oklch, var(--ow-amber) 6%, var(--ow-bg-card))",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <span
                    style={{
                      background: "var(--ow-amber)",
                      color: "white",
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.62rem",
                      fontWeight: 800,
                      letterSpacing: "0.1em",
                      padding: "0.18rem 0.5rem",
                      borderRadius: 3,
                      textTransform: "uppercase",
                    }}
                  >
                    Boutique scale
                  </span>
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "var(--ow-text-mid)" }}>
                    Same procedure, home/cellar-door units · 5 US gal (~19 L)
                  </span>
                </div>
                <pre
                  className="whitespace-pre-wrap text-sm"
                  style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-mid)", lineHeight: 1.7, margin: 0 }}
                >
                  {sop.boutiqueCompanion}
                </pre>
              </div>
            )}

            {/* S8-D: Know→Learn bridge — link to the related Free Run curiosity topic */}
            {CATEGORY_FREE_RUN_TOPIC[sop.category] && (
              <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--ow-border)" }}>
                <FreeRunBridgeLink
                  topic={CATEGORY_FREE_RUN_TOPIC[sop.category]}
                  seedQuestion={`Tell me about ${CATEGORY_FREE_RUN_TOPIC[sop.category].toLowerCase()}`}
                />
              </div>
            )}
          </div>
        )}

        {/* ── Decision Logic ── */}
        {activeTab === "decision" && (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--ow-text-hi)" }}>Decision Logic</h2>
                <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
                  Why does your winery do it this way? Capture the reasoning behind this procedure.
                </p>
              </div>
              {!editingDecision && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setDecisionText(sop.decisionLogic ?? ""); setEditingDecision(true); }}
                  style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}
                >
                  {sop.decisionLogic ? "Edit" : "Add"}
                </Button>
              )}
            </div>

            {/* Prompt questions */}
            <div className="rounded-lg p-4 mb-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "var(--ow-amber)" }}>Prompts to consider:</p>
              <ul className="text-xs space-y-1" style={{ color: "var(--ow-text-lo)" }}>
                <li>• Why this yeast strain / sanitant / protocol?</li>
                <li>• What experience led to this approach?</li>
                <li>• What alternatives were considered and why rejected?</li>
                <li>• What conditions or vintage characteristics trigger a different approach?</li>
              </ul>
            </div>

            {editingDecision ? (
              <div className="space-y-3">
                <Textarea
                  value={decisionText}
                  onChange={(e) => setDecisionText(e.target.value)}
                  rows={10}
                  placeholder="Write your decision logic here…"
                  className="bg-transparent border-white/10 text-sm resize-none"
                  style={{ color: "var(--ow-text-hi)" }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateDecision.mutate({ id, decisionLogic: decisionText })} disabled={updateDecision.isPending} style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}>
                    {updateDecision.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingDecision(false)} style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}>Cancel</Button>
                </div>
              </div>
            ) : sop.decisionLogic ? (
              <div className="rounded-lg p-5" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                <pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: "'Lato', sans-serif", color: "var(--ow-text-mid)", lineHeight: 1.8 }}>{sop.decisionLogic}</pre>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
                <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No decision logic recorded yet. Click Add to capture your winemaker's reasoning.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Tribal Knowledge ── */}
        {activeTab === "tribal" && (
          <div>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--ow-text-hi)" }}>Tribal Knowledge</h2>
                <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
                  Things you need to know that aren't in any manual — equipment quirks, supplier contacts, site-specific practices.
                </p>
              </div>
              {!editingTribal && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => { setTribalText(sop.tribalKnowledge ?? ""); setEditingTribal(true); }}
                  style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}
                >
                  {sop.tribalKnowledge ? "Edit" : "Add"}
                </Button>
              )}
            </div>

            <div className="rounded-lg p-4 mb-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "oklch(0.65 0.10 220)" }}>Examples:</p>
              <ul className="text-xs space-y-1" style={{ color: "var(--ow-text-lo)" }}>
                <li>• "Press #2 runs 0.3 bar high — calibrate before every vintage."</li>
                <li>• "For Shiraz we prefer Lalvin ICV D254 at 25g/hL. Contact: Sarah at Lallemand, 0412 xxx xxx."</li>
                <li>• "Tank 4 bottom valve sticks at 2 bar. Use the wooden mallet on the east side."</li>
              </ul>
            </div>

            {editingTribal ? (
              <div className="space-y-3">
                <Textarea
                  value={tribalText}
                  onChange={(e) => setTribalText(e.target.value)}
                  rows={10}
                  placeholder="Write tribal knowledge here…"
                  className="bg-transparent border-white/10 text-sm resize-none"
                  style={{ color: "var(--ow-text-hi)" }}
                />
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => updateTribal.mutate({ id, tribalKnowledge: tribalText })} disabled={updateTribal.isPending} style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}>
                    {updateTribal.isPending ? "Saving…" : "Save"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setEditingTribal(false)} style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}>Cancel</Button>
                </div>
              </div>
            ) : sop.tribalKnowledge ? (
              <div className="rounded-lg p-5" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                <pre className="whitespace-pre-wrap text-sm" style={{ fontFamily: "'Lato', sans-serif", color: "var(--ow-text-mid)", lineHeight: 1.8 }}>{sop.tribalKnowledge}</pre>
              </div>
            ) : (
              <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
                <Lightbulb className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No tribal knowledge recorded yet. Click Add to capture what only your team knows.</p>
              </div>
            )}
          </div>
        )}

        {/* ── Vintage Notes ── */}
        {activeTab === "vintage" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--ow-text-hi)" }}>Vintage Notes</h2>
                <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>What worked, what failed, what to change next vintage.</p>
              </div>
              <Button
                size="sm"
                className="gap-2"
                onClick={() => setShowVintageForm(true)}
                style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}
              >
                <Plus className="w-4 h-4" />
                Add Note
              </Button>
            </div>

            {showVintageForm && (
              <div className="rounded-lg p-5 mb-6 space-y-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}>
                <h3 className="font-medium text-sm" style={{ color: "var(--ow-text-hi)" }}>New Vintage Note</h3>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ow-text-lo)" }}>Vintage Year</label>
                  <Input type="number" value={vintageYear} onChange={(e) => setVintageYear(Number(e.target.value))} className="bg-transparent border-white/10 text-sm w-32" style={{ color: "var(--ow-text-hi)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "oklch(0.65 0.10 160)" }}>What Worked</label>
                  <Textarea value={whatWorked} onChange={(e) => setWhatWorked(e.target.value)} rows={3} placeholder="What went well this vintage?" className="bg-transparent border-white/10 text-sm resize-none" style={{ color: "var(--ow-text-hi)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "oklch(0.65 0.10 30)" }}>What Failed</label>
                  <Textarea value={whatFailed} onChange={(e) => setWhatFailed(e.target.value)} rows={3} placeholder="What didn't work or caused problems?" className="bg-transparent border-white/10 text-sm resize-none" style={{ color: "var(--ow-text-hi)" }} />
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ow-amber)" }}>What to Change</label>
                  <Textarea value={whatToChange} onChange={(e) => setWhatToChange(e.target.value)} rows={3} placeholder="What will you do differently next vintage?" className="bg-transparent border-white/10 text-sm resize-none" style={{ color: "var(--ow-text-hi)" }} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => addVintageNote.mutate({ sopId: id, vintageYear, whatWorked: whatWorked || undefined, whatFailed: whatFailed || undefined, whatToChange: whatToChange || undefined })} disabled={addVintageNote.isPending} style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}>
                    {addVintageNote.isPending ? "Saving…" : "Save Note"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowVintageForm(false)} style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {(sop.vintageNotes ?? []).map((note) => (
                <div key={note.id} className="rounded-lg p-5" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="font-semibold" style={{ color: "var(--ow-amber)", fontFamily: "'Fraunces', serif" }}>Vintage {note.vintageYear}</span>
                    <button onClick={() => deleteVintageNote.mutate({ id: note.id })} className="opacity-40 hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" style={{ color: "oklch(0.65 0.15 30)" }} />
                    </button>
                  </div>
                  {note.whatWorked && <div className="mb-2"><span className="text-xs font-medium" style={{ color: "oklch(0.65 0.10 160)" }}>What Worked: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatWorked}</span></div>}
                  {note.whatFailed && <div className="mb-2"><span className="text-xs font-medium" style={{ color: "oklch(0.65 0.10 30)" }}>What Failed: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatFailed}</span></div>}
                  {note.whatToChange && <div><span className="text-xs font-medium" style={{ color: "var(--ow-amber)" }}>What to Change: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatToChange}</span></div>}
                  {note.createdBy && <p className="text-xs mt-3" style={{ color: "var(--ow-text-lo)" }}>Recorded by {note.createdBy}</p>}
                </div>
              ))}
              {(sop.vintageNotes ?? []).length === 0 && !showVintageForm && (
                <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
                  <BookMarked className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No vintage notes yet. Add your first entry after harvest.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Training Records ── */}
        {activeTab === "training" && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-semibold mb-1" style={{ color: "var(--ow-text-hi)" }}>Training Records</h2>
                <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>Who has been trained on this SOP, when, and by whom.</p>
              </div>
              <Button size="sm" className="gap-2" onClick={() => setShowTrainingForm(true)} style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}>
                <Plus className="w-4 h-4" />
                Log Training
              </Button>
            </div>

            {showTrainingForm && (
              <div className="rounded-lg p-5 mb-6 space-y-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}>
                <h3 className="font-medium text-sm" style={{ color: "var(--ow-text-hi)" }}>Log Training Session</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--ow-text-lo)" }}>Trainer Name *</label>
                    <Input value={trainerName} onChange={(e) => setTrainerName(e.target.value)} placeholder="e.g. Sarah Chen" className="bg-transparent border-white/10 text-sm" style={{ color: "var(--ow-text-hi)" }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--ow-text-lo)" }}>Trainee Name *</label>
                    <Input value={traineeName} onChange={(e) => setTraineeName(e.target.value)} placeholder="e.g. James O'Brien" className="bg-transparent border-white/10 text-sm" style={{ color: "var(--ow-text-hi)" }} />
                  </div>
                  <div>
                    <label className="text-xs mb-1 block" style={{ color: "var(--ow-text-lo)" }}>Trainee Role</label>
                    <Input value={traineeRole} onChange={(e) => setTraineeRole(e.target.value)} placeholder="e.g. Cellar Hand" className="bg-transparent border-white/10 text-sm" style={{ color: "var(--ow-text-hi)" }} />
                  </div>
                </div>
                <div>
                  <label className="text-xs mb-1 block" style={{ color: "var(--ow-text-lo)" }}>Notes</label>
                  <Textarea value={trainingNotes} onChange={(e) => setTrainingNotes(e.target.value)} rows={3} placeholder="What was covered, any gaps identified…" className="bg-transparent border-white/10 text-sm resize-none" style={{ color: "var(--ow-text-hi)" }} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => { if (!trainerName || !traineeName) { toast.error("Trainer and trainee names are required"); return; } addTraining.mutate({ sopId: id, trainedAt: Date.now(), trainerName, traineeName, traineeRole: traineeRole || undefined, notes: trainingNotes || undefined }); }} disabled={addTraining.isPending} style={{ background: "var(--ow-amber)", color: "var(--ow-bg-base)" }}>
                    {addTraining.isPending ? "Saving…" : "Save Record"}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setShowTrainingForm(false)} style={{ borderColor: "var(--ow-border)", color: "var(--ow-text-mid)" }}>Cancel</Button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {(sop.trainingRecords ?? []).map((rec) => (
                <div key={rec.id} className="rounded-lg p-4 flex items-start justify-between gap-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--ow-text-hi)" }}>{rec.traineeName} {rec.traineeRole && <span style={{ color: "var(--ow-text-lo)" }}>— {rec.traineeRole}</span>}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)" }}>Trained by {rec.trainerName} · {new Date(rec.trainedAt).toLocaleDateString()}</p>
                    {rec.notes && <p className="text-xs mt-1" style={{ color: "var(--ow-text-lo)" }}>{rec.notes}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: rec.status === "completed" ? "oklch(0.65 0.10 160 / 40%)" : "var(--ow-border)", color: rec.status === "completed" ? "oklch(0.65 0.10 160)" : "var(--ow-text-lo)" }}>{rec.status}</Badge>
                    <button onClick={() => deleteTraining.mutate({ id: rec.id })} className="opacity-40 hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" style={{ color: "oklch(0.65 0.15 30)" }} />
                    </button>
                  </div>
                </div>
              ))}
              {(sop.trainingRecords ?? []).length === 0 && !showTrainingForm && (
                <div className="text-center py-12" style={{ color: "var(--ow-text-lo)" }}>
                  <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                  <p>No training records yet. Log a session to start building your compliance record.</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Training Overview ────────────────────────────────────────────────────────

function TrainingOverview() {
  const [searchName, setSearchName] = useState("");
  const { data: records = [], isLoading } = trpc.knowledge.listTrainingRecords.useQuery(
    searchName ? { traineeName: searchName } : undefined
  );

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      <div className="border-b" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}>
        <div className="container py-8">
          <Link href="/knowledge">
            <button className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--ow-text-lo)" }}>
              <ArrowLeft className="w-4 h-4" />
              Knowledge Platform
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <GraduationCap className="w-7 h-7" style={{ color: "var(--ow-amber)" }} />
            <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>Training Records</h1>
          </div>
          <p className="text-sm mb-4" style={{ color: "var(--ow-text-lo)" }}>All training sessions across all SOPs. Filter by trainee name to see an individual's training history.</p>
          <Input placeholder="Filter by trainee name…" value={searchName} onChange={(e) => setSearchName(e.target.value)} className="bg-transparent border-white/10 text-sm max-w-xs" style={{ color: "var(--ow-text-hi)" }} />
        </div>
      </div>
      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>Loading…</div>
        ) : records.length === 0 ? (
          <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>
            <GraduationCap className="w-10 h-10 mx-auto mb-3 opacity-40" />
            <p>No training records found. Open an SOP and log a training session.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {records.map((rec) => (
              <div key={rec.id} className="rounded-lg p-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <p className="font-medium text-sm" style={{ color: "var(--ow-text-hi)" }}>{rec.traineeName} {rec.traineeRole && <span style={{ color: "var(--ow-text-lo)" }}>— {rec.traineeRole}</span>}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)" }}>
                      <span style={{ color: "var(--ow-amber)" }}>{rec.sopTitle}</span> · {rec.sopCategory}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)" }}>Trained by {rec.trainerName} · {new Date(rec.trainedAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs" style={{ borderColor: rec.status === "completed" ? "oklch(0.65 0.10 160 / 40%)" : "var(--ow-border)", color: rec.status === "completed" ? "oklch(0.65 0.10 160)" : "var(--ow-text-lo)" }}>{rec.status}</Badge>
                    <Link href={`/knowledge/sop/${rec.sopId}`}>
                      <button className="opacity-40 hover:opacity-100 transition-opacity">
                        <ExternalLink className="w-4 h-4" style={{ color: "var(--ow-amber)" }} />
                      </button>
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Vintage Debrief ──────────────────────────────────────────────────────────

// ─── Vintage Debrief helpers ──────────────────────────────────────────────────

const STATE_ORDER = ["SA", "VIC", "NSW", "WA", "TAS", "QLD"];
const STATE_LABELS: Record<string, string> = {
  SA: "South Australia",
  VIC: "Victoria",
  NSW: "New South Wales",
  WA: "Western Australia",
  TAS: "Tasmania",
  QLD: "Queensland",
};

const QUALITY_META: Record<number, { label: string; color: string }> = {
  1: { label: "Poor", color: "oklch(0.55 0.18 30)" },
  2: { label: "Below Average", color: "oklch(0.60 0.14 50)" },
  3: { label: "Average", color: "var(--ow-amber)" },
  4: { label: "Excellent", color: "oklch(0.68 0.14 145)" },
  5: { label: "Exceptional", color: "var(--ow-amber)" },
};

function QualityStars({ rating }: { rating: number }) {
  const info = QUALITY_META[rating] ?? QUALITY_META[3];
  return (
    <span className="flex items-center gap-1">
      {Array.from({ length: 5 }).map((_, i) => (
        <span key={i} style={{ color: i < rating ? info.color : "var(--ow-border)", fontSize: "0.7rem" }}>★</span>
      ))}
      <span className="text-xs ml-1" style={{ color: info.color }}>{info.label}</span>
    </span>
  );
}

function VintageDebrief() {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const years = Array.from({ length: 6 }, (_, i) => currentYear - i);

  // Industry intelligence from Wine Australia (state-level)
  const { data: industryData = [], isLoading: loadingIndustry } =
    trpc.vintageIntelligence.list.useQuery({ year: selectedYear });

  // Member's own vintage notes (SOP-linked)
  const { data: memberNotes = [], isLoading: loadingNotes } =
    trpc.knowledge.getVintageDebrief.useQuery({ vintageYear: selectedYear });

  const isLoading = loadingIndustry || loadingNotes;

  // Sort industry data by canonical state order
  const sortedIndustry = [...industryData].sort((a, b) => {
    const ai = STATE_ORDER.indexOf(a.state);
    const bi = STATE_ORDER.indexOf(b.state);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const filteredIndustry = selectedState
    ? sortedIndustry.filter((r) => r.state === selectedState)
    : sortedIndustry;

  const availableStates = Array.from(new Set(sortedIndustry.map((r) => r.state)));

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Header */}
      <div className="border-b" style={{ borderColor: "var(--ow-border)", background: "var(--ow-bg-base)" }}>
        <div className="container py-8">
          <Link href="/knowledge">
            <button className="flex items-center gap-2 text-sm mb-4" style={{ color: "var(--ow-text-lo)" }}>
              <ArrowLeft className="w-4 h-4" />
              Knowledge Platform
            </button>
          </Link>
          <div className="flex items-center gap-3 mb-2">
            <BookMarked className="w-7 h-7" style={{ color: "var(--ow-amber)" }} />
            <div>
              <h1 className="text-2xl font-bold" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-hi)" }}>Vintage Debrief</h1>
              <p className="text-xs mt-0.5" style={{ color: "var(--ow-text-lo)" }}>Industry intelligence from Wine Australia · layered with your cellar notes</p>
            </div>
          </div>

          {/* Year tabs */}
          <div className="flex gap-2 flex-wrap mt-5 mb-4">
            {years.map((y) => (
              <button
                key={y}
                onClick={() => { setSelectedYear(y); setSelectedState(null); }}
                className="px-4 py-1.5 rounded text-sm transition-all"
                style={{
                  background: selectedYear === y ? "var(--ow-amber)" : "var(--ow-bg-inset)",
                  color: selectedYear === y ? "var(--ow-bg-base)" : "var(--ow-text-mid)",
                  border: "1px solid var(--ow-border)",
                  fontWeight: selectedYear === y ? 600 : 400,
                }}
              >
                {y}
              </button>
            ))}
          </div>

          {/* State filter pills */}
          {availableStates.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setSelectedState(null)}
                className="px-3 py-1 rounded-full text-xs transition-all"
                style={{
                  background: selectedState === null ? "var(--ow-bg-inset)" : "transparent",
                  color: selectedState === null ? "var(--ow-text-hi)" : "var(--ow-text-lo)",
                  border: `1px solid ${selectedState === null ? "color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "var(--ow-border)"}`,
                }}
              >
                All States
              </button>
              {availableStates.map((st) => (
                <button
                  key={st}
                  onClick={() => setSelectedState(st === selectedState ? null : st)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={{
                    background: selectedState === st ? "var(--ow-bg-inset)" : "transparent",
                    color: selectedState === st ? "var(--ow-text-hi)" : "var(--ow-text-lo)",
                    border: `1px solid ${selectedState === st ? "color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "var(--ow-border)"}`,
                  }}
                >
                  {st}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="container py-8">
        {isLoading ? (
          <div className="text-center py-16" style={{ color: "var(--ow-text-lo)" }}>Loading…</div>
        ) : (
          <div className="space-y-10">

            {/* ── Industry Intelligence Layer ──────────────────────────────── */}
            {filteredIndustry.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-5">
                  <div className="w-1 h-5 rounded-full" style={{ background: "var(--ow-amber)" }} />
                  <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "var(--ow-amber)" }}>Industry Intelligence — {selectedYear}</h2>
                  <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>Wine Australia National Vintage Report</span>
                </div>
                <div className="grid gap-4 md:grid-cols-2">
                  {filteredIndustry.map((row) => (
                    <div
                      key={row.id}
                      className="rounded-lg p-5"
                      style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}
                    >
                      {/* State header */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1.5">
                            <span
                              className="text-xs font-bold px-2 py-0.5 rounded"
                              style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: "var(--ow-amber)", letterSpacing: "0.08em" }}
                            >
                              {row.state}
                            </span>
                            <span className="font-semibold text-sm" style={{ color: "var(--ow-text-hi)" }}>
                              {STATE_LABELS[row.state] ?? row.region}
                            </span>
                          </div>
                          <QualityStars rating={row.qualityRating} />
                        </div>
                      </div>

                      {/* Yield */}
                      {row.yieldAssessment && (
                        <p className="text-xs mb-3 leading-relaxed" style={{ color: "var(--ow-text-lo)" }}>
                          <span style={{ color: "var(--ow-text-lo)" }}>Yield: </span>{row.yieldAssessment}
                        </p>
                      )}

                      {/* Standout varieties */}
                      {row.standoutVarieties && (
                        <div className="flex flex-wrap gap-1.5 mb-3">
                          {row.standoutVarieties.split(",").map((v) => v.trim()).filter(Boolean).map((v) => (
                            <span
                              key={v}
                              className="text-xs px-2 py-0.5 rounded-full"
                              style={{ background: "var(--ow-bg-inset)", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)" }}
                            >
                              {v}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Conditions */}
                      <p className="text-sm leading-relaxed" style={{ color: "var(--ow-text-mid)" }}>
                        {row.conditions.length > 300 ? row.conditions.slice(0, 300) + "…" : row.conditions}
                      </p>

                      {/* Winemaking notes */}
                      {row.winemakingNotes && (
                        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--ow-border)" }}>
                          <p className="text-xs font-medium mb-1" style={{ color: "var(--ow-amber)" }}>Winemaking Implications</p>
                          <p className="text-xs leading-relaxed" style={{ color: "var(--ow-text-lo)" }}>
                            {row.winemakingNotes.length > 220 ? row.winemakingNotes.slice(0, 220) + "…" : row.winemakingNotes}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </section>
            )}

            {filteredIndustry.length === 0 && !loadingIndustry && (
              <div className="rounded-lg p-6 text-center" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
                  No industry intelligence available for {selectedYear}{selectedState ? ` · ${selectedState}` : ""}.
                </p>
              </div>
            )}

            {/* ── Member Cellar Notes Layer ─────────────────────────────────── */}
            <section>
              <div className="flex items-center gap-2 mb-5">
                <div className="w-1 h-5 rounded-full" style={{ background: "oklch(0.65 0.10 220)" }} />
                <h2 className="text-xs font-semibold tracking-widest uppercase" style={{ color: "oklch(0.65 0.10 220)" }}>Your Cellar Notes — {selectedYear}</h2>
              </div>
              {loadingNotes ? (
                <div style={{ color: "var(--ow-text-lo)" }} className="text-sm">Loading…</div>
              ) : memberNotes.length === 0 ? (
                <div className="rounded-lg p-6 text-center" style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(0.65 0.10 220 / 15%)" }}>
                  <BookMarked className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm" style={{ color: "var(--ow-text-lo)" }}>
                    No cellar notes for {selectedYear}. Add notes from individual SOP pages.
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm mb-4" style={{ color: "var(--ow-text-lo)" }}>
                    {memberNotes.length} note{memberNotes.length !== 1 ? "s" : ""} recorded
                  </p>
                  <div className="space-y-3">
                    {memberNotes.map((note) => (
                      <div key={note.id} className="rounded-lg p-4" style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(0.65 0.10 220 / 20%)" }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="font-semibold text-sm" style={{ color: "oklch(0.65 0.10 220)" }}>{note.sopTitle}</span>
                          <span style={{ color: "var(--ow-text-lo)" }}>·</span>
                          <span className="text-xs" style={{ color: "var(--ow-text-lo)" }}>{note.sopCategory}</span>
                        </div>
                        {note.whatWorked && <div className="mb-1.5"><span className="text-xs font-medium" style={{ color: "oklch(0.65 0.10 160)" }}>✓ Worked: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatWorked}</span></div>}
                        {note.whatFailed && <div className="mb-1.5"><span className="text-xs font-medium" style={{ color: "oklch(0.65 0.10 30)" }}>✗ Failed: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatFailed}</span></div>}
                        {note.whatToChange && <div><span className="text-xs font-medium" style={{ color: "var(--ow-amber)" }}>→ Change: </span><span className="text-sm" style={{ color: "var(--ow-text-mid)" }}>{note.whatToChange}</span></div>}
                        {note.createdBy && <p className="text-xs mt-2" style={{ color: "var(--ow-text-lo)" }}>— {note.createdBy}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>

          </div>
        )}
      </div>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────

export default function Knowledge() {
  // wouter v3: useLocation returns the full path from the root
  const [wouterLoc] = useLocation();
  // Normalise: use wouter location but fall back to window.location.pathname
  // to handle cases where wouter returns a sub-path in wildcard routes
  const loc = (wouterLoc && wouterLoc.startsWith("/knowledge"))
    ? wouterLoc
    : (typeof window !== "undefined" ? window.location.pathname : "/knowledge");

  // /knowledge/sop/:id
  const sopMatch = loc.match(/^\/knowledge\/sop\/(\d+)$/);
  if (sopMatch) return <SopDetail id={parseInt(sopMatch[1], 10)} />;

  // /knowledge/category/:cat (handles URL-encoded category names)
  const catMatch = loc.match(/^\/knowledge\/category\/(.+)$/);
  if (catMatch) return <KnowledgeCategory category={catMatch[1]} />;

  // /knowledge/training
  if (loc === "/knowledge/training") return <TrainingOverview />;

  // /knowledge/vintage-debrief
  if (loc === "/knowledge/vintage-debrief") return <VintageDebrief />;

  // /knowledge
  return <KnowledgeHome />;
}
