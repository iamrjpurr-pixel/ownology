/**
 * Guide — /guide
 * Sprint 8 · S8-F: Induction & orientation experience for new Ownology users.
 *
 * Four sections:
 *   1. Four Pillars Overview — what the platform is and what you can do
 *   2. Interactive Workflow Map — vintage cycle mapped to the four pillars
 *   3. Getting Started Checklist — 7 tasks for your first week (localStorage)
 *   4. Role-Based Paths — three starting points by role
 *
 * localStorage keys:
 *   ownology_guide_seen = "1"   — set on mount; used by App.tsx for redirect logic
 *   ownology_checklist  = JSON  — array of completed checklist item IDs
 */

import { useEffect, useState } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import {
  ClipboardList,
  BookOpen,
  FlaskConical,
  ShieldCheck,
  ChevronRight,
  CheckCircle2,
  Circle,
  ArrowRight,
  Grape,
  Beaker,
  Package,
  Layers,
  MapPin,
  Compass,
} from "lucide-react";

// ─── Design tokens (matches Ownology dark theme) ─────────────────────────────
const BG       = "var(--ow-bg-base)";
const BG_CARD  = "var(--ow-bg-card)";
const BG_RAISED= "var(--ow-bg-raised)";
const BORDER   = "var(--ow-border)";
const AMBER    = "var(--ow-amber)";
const TEXT_HI  = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO  = "var(--ow-text-lo)";
const SERIF    = "'Fraunces', serif";
const SANS     = "'Lato', sans-serif";
const MONO     = "'Fira Code', monospace";

// ─── Types ────────────────────────────────────────────────────────────────────
interface ChecklistItem {
  id: string;
  label: string;
  description: string;
  href: string;
  linkLabel: string;
}

interface RolePath {
  role: string;
  tagline: string;
  icon: React.ReactNode;
  steps: { label: string; href: string }[];
  startHref: string;
  startLabel: string;
}

// ─── Checklist data ───────────────────────────────────────────────────────────
const CHECKLIST: ChecklistItem[] = [
  {
    id: "register-tank",
    label: "Register your first tank",
    description: "Add a tank to The Press so you can start logging fermentation events against it.",
    href: "/the-press",
    linkLabel: "Open The Press",
  },
  {
    id: "log-inoculation",
    label: "Log your first vintage entry",
    description: "Record an Inoculation event — the starting point of every fermentation in Ownology.",
    href: "/the-press",
    linkLabel: "Open The Press",
  },
  {
    id: "browse-sops",
    label: "Browse the SOP library",
    description: "38 industry-standard SOPs across 12 categories are ready to use from day one.",
    href: "/knowledge",
    linkLabel: "Open Knowledge Platform",
  },
  {
    id: "cellar-task",
    label: "Set up your first Cellar Task",
    description: "Register a piece of equipment and generate an AI cleaning or maintenance task.",
    href: "/cellar-tasks",
    linkLabel: "Open Cellar Tasks",
  },
  {
    id: "vineyard-blocks",
    label: "Register your vineyard blocks",
    description: "Add your blocks so you can log observations and link them to your batches.",
    href: "/vineyard",
    linkLabel: "Open Vineyard",
  },
  {
    id: "free-run",
    label: "Ask Free Run a question",
    description: "Try the AI assistant with a question relevant to your current vintage stage.",
    href: "/free-run",
    linkLabel: "Open Free Run",
  },
  {
    id: "tribal-knowledge",
    label: "Add your first Tribal Knowledge entry",
    description: "Open any SOP in the Knowledge Platform and record a site-specific note in the Tribal Knowledge field.",
    href: "/knowledge",
    linkLabel: "Open Knowledge Platform",
  },
];

// ─── Role paths ───────────────────────────────────────────────────────────────
const ROLE_PATHS: RolePath[] = [
  {
    role: "Winery Owner",
    tagline: "Production visibility, cost intelligence, and compliance readiness.",
    icon: <Layers className="w-6 h-6" />,
    steps: [
      { label: "Dashboard — KPIs & tank status", href: "/dashboard" },
      { label: "The Press — Cellar Value tab", href: "/the-press" },
      { label: "The Press — Export Docs tab", href: "/the-press" },
      { label: "Compliance AI — regulatory Q&A", href: "/compliance" },
    ],
    startHref: "/dashboard",
    startLabel: "Start with Dashboard",
  },
  {
    role: "Head Winemaker",
    tagline: "Fermentation control, protocol management, and decision capture.",
    icon: <FlaskConical className="w-6 h-6" />,
    steps: [
      { label: "The Press — Vintage Log", href: "/the-press" },
      { label: "Knowledge Platform — SOPs & Decision Logic", href: "/knowledge" },
      { label: "Free Run — AI assistant", href: "/free-run" },
      { label: "Knowledge — Vintage Debrief", href: "/knowledge" },
    ],
    startHref: "/the-press",
    startLabel: "Start with The Press",
  },
  {
    role: "Cellar Hand",
    tagline: "Fast entry, clear tasks, and protocol access on the floor.",
    icon: <ClipboardList className="w-6 h-6" />,
    steps: [
      { label: "Quick Entry — rapid log entry", href: "/quick-entry" },
      { label: "Cellar Tasks — equipment & tasks", href: "/cellar-tasks" },
      { label: "Knowledge Platform — SOP library", href: "/knowledge" },
      { label: "Vineyard — block observations", href: "/vineyard" },
    ],
    startHref: "/quick-entry",
    startLabel: "Start with Quick Entry",
  },
];

// ─── Workflow map data ────────────────────────────────────────────────────────
interface WorkflowNode {
  stage: string;
  pillar: "do" | "know" | "learn";
  label: string;
  href: string;
  description: string;
}

interface WorkflowStage {
  id: string;
  title: string;
  icon: React.ReactNode;
  nodes: WorkflowNode[];
}

const PILLAR_COLORS: Record<string, string> = {
  do:    "var(--ow-amber)",    // amber — operational
  know:  "oklch(0.62 0.10 45)",    // warm brown — knowledge
  learn: "oklch(0.65 0.10 220)",   // blue — learning
};

const PILLAR_LABELS: Record<string, string> = {
  do:    "DO",
  know:  "KNOW",
  learn: "LEARN",
};

const WORKFLOW_STAGES: WorkflowStage[] = [
  {
    id: "pre-harvest",
    title: "Pre-Harvest",
    icon: <Grape className="w-4 h-4" />,
    nodes: [
      { stage: "pre-harvest", pillar: "do",    label: "Vineyard Blocks",     href: "/vineyard",    description: "Register blocks and log observations" },
      { stage: "pre-harvest", pillar: "know",  label: "Harvest SOP",         href: "/knowledge",   description: "Review your harvest protocol" },
      { stage: "pre-harvest", pillar: "do",    label: "Pre-Harvest Sample",  href: "/the-press",   description: "Log pre-harvest Brix and pH readings" },
    ],
  },
  {
    id: "harvest",
    title: "Harvest & Reception",
    icon: <MapPin className="w-4 h-4" />,
    nodes: [
      { stage: "harvest", pillar: "do",    label: "Batch Registration",    href: "/the-press",   description: "Create a wine batch in the Batch Book" },
      { stage: "harvest", pillar: "know",  label: "Fermentation SOP",      href: "/knowledge",   description: "Review your inoculation protocol" },
      { stage: "harvest", pillar: "do",    label: "Inoculation Event",     href: "/the-press",   description: "Log inoculation in the Vintage Log" },
    ],
  },
  {
    id: "fermentation",
    title: "Fermentation",
    icon: <Beaker className="w-4 h-4" />,
    nodes: [
      { stage: "fermentation", pillar: "do",    label: "Daily Measurements",  href: "/the-press",   description: "Log Brix, temp, pH, and SO₂ readings" },
      { stage: "fermentation", pillar: "learn", label: "Free Run — YAN & DAP", href: "/free-run",    description: "Ask the AI about nutrient additions" },
      { stage: "fermentation", pillar: "do",    label: "Additions",           href: "/the-press",   description: "Log DAP, nutrients, and adjustments" },
    ],
  },
  {
    id: "post-ferment",
    title: "Post-Fermentation",
    icon: <FlaskConical className="w-4 h-4" />,
    nodes: [
      { stage: "post-ferment", pillar: "do",    label: "Racking Event",       href: "/the-press",   description: "Log racking and update tank volumes" },
      { stage: "post-ferment", pillar: "know",  label: "Clarification SOP",   href: "/knowledge",   description: "Review fining and stabilisation protocol" },
      { stage: "post-ferment", pillar: "do",    label: "Barrel Management",   href: "/the-press",   description: "Register barrels and log topping" },
    ],
  },
  {
    id: "bottling",
    title: "Bottling",
    icon: <Package className="w-4 h-4" />,
    nodes: [
      { stage: "bottling", pillar: "know",  label: "Packaging SOP",       href: "/knowledge",   description: "Review your bottling line protocol" },
      { stage: "bottling", pillar: "do",    label: "Bottling Run",        href: "/the-press",   description: "Log the bottling event" },
      { stage: "bottling", pillar: "do",    label: "Export Docs",         href: "/the-press",   description: "Generate AWBC Movement Advice" },
    ],
  },
];

// ─── Pillar card ──────────────────────────────────────────────────────────────
function PillarCard({
  pillar, label, description, href, icon, color,
}: {
  pillar: string; label: string; description: string; href: string;
  icon: React.ReactNode; color: string;
}) {
  return (
    <Link href={href}
      style={{
        display: "block",
        background: BG_CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: "4px",
        padding: "1.5rem",
        textDecoration: "none",
        transition: "border-color 0.2s",
        cursor: "pointer",
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = `color-mix(in oklch, ${color} 50%, transparent)`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = BORDER;
      }}
    >
      <div className="flex items-start gap-4">
        <div style={{
          width: "2.5rem", height: "2.5rem", borderRadius: "4px", flexShrink: 0,
          background: `color-mix(in oklch, ${color} 15%, transparent)`,
          border: `1px solid color-mix(in oklch, ${color} 30%, transparent)`,
          display: "flex", alignItems: "center", justifyContent: "center",
          color,
        }}>
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <p style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.12em", color, textTransform: "uppercase", marginBottom: "0.25rem" }}>
            {pillar}
          </p>
          <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI, marginBottom: "0.5rem", lineHeight: 1.2 }}>
            {label}
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, lineHeight: 1.6 }}>
            {description}
          </p>
        </div>
        <ChevronRight className="w-4 h-4 flex-shrink-0 mt-1" style={{ color: TEXT_LO }} />
      </div>
    </Link>
  );
}

// ─── Workflow node button ─────────────────────────────────────────────────────
function WorkflowNode({ node }: { node: WorkflowNode }) {
  const color = PILLAR_COLORS[node.pillar];
  return (
    <Link href={node.href}
      title={node.description}
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        gap: "0.25rem",
        padding: "0.625rem 0.75rem",
        background: `color-mix(in oklch, ${color} 8%, var(--ow-bg-base))`,
        border: `1px solid color-mix(in oklch, ${color} 25%, transparent)`,
        borderRadius: "4px",
        textDecoration: "none",
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        minWidth: 0,
      }}
      onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = `color-mix(in oklch, ${color} 55%, transparent)`;
        e.currentTarget.style.background = `color-mix(in oklch, ${color} 14%, var(--ow-bg-base))`;
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => {
        e.currentTarget.style.borderColor = `color-mix(in oklch, ${color} 25%, transparent)`;
        e.currentTarget.style.background = `color-mix(in oklch, ${color} 8%, var(--ow-bg-base))`;
      }}
    >
      <span style={{ fontFamily: MONO, fontSize: "0.55rem", letterSpacing: "0.1em", color, textTransform: "uppercase" }}>
        {PILLAR_LABELS[node.pillar]}
      </span>
      <span style={{ fontFamily: SANS, fontWeight: 500, fontSize: "0.8125rem", color: TEXT_HI, lineHeight: 1.3 }}>
        {node.label}
      </span>
    </Link>
  );
}

// ─── Checklist item ───────────────────────────────────────────────────────────
function ChecklistRow({
  item, completed, onToggle,
}: {
  item: ChecklistItem; completed: boolean; onToggle: () => void;
}) {
  return (
    <div
      className="flex items-start gap-4 py-4"
      style={{ borderBottom: `1px solid ${BORDER}` }}
    >
      <button
        onClick={onToggle}
        aria-label={completed ? "Mark incomplete" : "Mark complete"}
        style={{ background: "none", border: "none", cursor: "pointer", padding: 0, flexShrink: 0, marginTop: "2px" }}
      >
        {completed
          ? <CheckCircle2 className="w-5 h-5" style={{ color: "oklch(0.72 0.15 145)" }} />
          : <Circle className="w-5 h-5" style={{ color: TEXT_LO }} />
        }
      </button>
      <div className="flex-1 min-w-0">
        <p style={{
          fontFamily: SANS, fontWeight: 500, fontSize: "0.9375rem",
          color: completed ? TEXT_LO : TEXT_HI,
          textDecoration: completed ? "line-through" : "none",
          lineHeight: 1.4, marginBottom: "0.25rem",
        }}>
          {item.label}
        </p>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID, lineHeight: 1.5 }}>
          {item.description}
        </p>
      </div>
      <Link href={item.href}
        style={{
          flexShrink: 0,
          fontFamily: SANS, fontSize: "0.75rem", fontWeight: 600,
          color: AMBER, textDecoration: "none",
          letterSpacing: "0.04em",
          display: "flex", alignItems: "center", gap: "0.25rem",
          marginTop: "2px",
          opacity: completed ? 0.5 : 1,
        }}
      >
        {item.linkLabel}
        <ArrowRight className="w-3 h-3" />
      </Link>
    </div>
  );
}

// ─── Role path card ───────────────────────────────────────────────────────────
function RoleCard({ path }: { path: RolePath }) {
  return (
    <div style={{
      background: BG_CARD,
      border: `1px solid ${BORDER}`,
      borderRadius: "4px",
      padding: "1.75rem",
      display: "flex",
      flexDirection: "column",
      gap: "1.25rem",
    }}>
      <div className="flex items-start gap-3">
        <div style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "4px", flexShrink: 0,
          background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: AMBER,
        }}>
          {path.icon}
        </div>
        <div>
          <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI, marginBottom: "0.25rem" }}>
            {path.role}
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID, lineHeight: 1.5 }}>
            {path.tagline}
          </p>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        {path.steps.map((step, i) => (
          <Link key={i} href={step.href}
            style={{
              display: "flex", alignItems: "center", gap: "0.5rem",
              padding: "0.5rem 0.625rem",
              background: "var(--ow-bg-base)",
              borderRadius: "3px",
              textDecoration: "none",
              fontFamily: SANS, fontSize: "0.8125rem", fontWeight: 300, color: TEXT_MID,
              transition: "color 0.15s",
            }}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = TEXT_HI; }}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => { e.currentTarget.style.color = TEXT_MID; }}
          >
            <span style={{ fontFamily: MONO, fontSize: "0.55rem", color: AMBER, letterSpacing: "0.08em", flexShrink: 0 }}>
              {String(i + 1).padStart(2, "0")}
            </span>
            {step.label}
          </Link>
        ))}
      </div>
      <Link href={path.startHref}
        className="btn-amber"
        style={{ textAlign: "center", textDecoration: "none", display: "block" }}
      >
        {path.startLabel}
      </Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Guide() {
  // Mark guide as seen on mount — used by App.tsx redirect logic
  useEffect(() => {
    try { localStorage.setItem("ownology_guide_seen", "1"); } catch { /* ignore */ }
  }, []);

  // Checklist state — persisted in localStorage
  const [completed, setCompleted] = useState<Set<string>>(() => {
    try {
      const raw = localStorage.getItem("ownology_checklist");
      if (!raw) return new Set();
      return new Set(JSON.parse(raw) as string[]);
    } catch { return new Set(); }
  });

  const toggleItem = (id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      try { localStorage.setItem("ownology_checklist", JSON.stringify(Array.from(next))); } catch { /* ignore */ }
      return next;
    });
  };

  const completedCount = completed.size;
  const totalCount = CHECKLIST.length;

  return (
    <div style={{ background: BG, minHeight: "100vh" }}>
      {/* ── Back nav ── */}
      <div className="container pt-6 pb-0" style={{ maxWidth: "960px", margin: "0 auto" }}>
        <Link href="/"
          className="inline-flex items-center gap-2 text-xs"
          style={{ color: TEXT_LO, fontFamily: SANS, textDecoration: "none" }}
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Back to Ownology
        </Link>
      </div>

      <div className="container pt-10 pb-24" style={{ maxWidth: "960px", margin: "0 auto" }}>

        {/* ── Page header ── */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-2">
            <Compass className="w-5 h-5" style={{ color: AMBER }} />
            <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
              Guide
            </p>
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", color: TEXT_HI, lineHeight: 1.1, letterSpacing: "-0.02em", marginBottom: "0.75rem", textWrap: "balance" as "balance" }}>
            Welcome to Ownology.
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", color: TEXT_MID, lineHeight: 1.7, maxWidth: "560px" }}>
            Ownology is a four-pillar platform for boutique winery teams. This page explains what each pillar does, how they connect, and where to start.
          </p>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Section 1 — Four Pillars Overview                                  */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: "1px", height: "1.5rem", background: AMBER }} />
            <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
              The Four Pillars
            </p>
          </div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
            What Ownology does
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.7, marginBottom: "1.5rem", maxWidth: "520px" }}>
            Every feature in Ownology belongs to one of four pillars. Understanding the pillars is the fastest way to understand the platform.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <PillarCard
              pillar="Do"
              label="Cellar Operations — The Press"
              description="The Press is your harvest floor command centre. Log fermentation events, track tanks and barrels, manage vineyard blocks, assign cellar tasks, and generate export documentation."
              href="/the-press"
              icon={<ClipboardList className="w-5 h-5" />}
              color="var(--ow-amber)"
            />
            <PillarCard
              pillar="Know"
              label="Knowledge Platform"
              description="38 industry-standard SOPs across 12 categories. Capture Decision Logic, Tribal Knowledge, and Vintage Notes. Your winery's institutional memory, permanent and searchable."
              href="/knowledge"
              icon={<BookOpen className="w-5 h-5" />}
              color="oklch(0.62 0.10 45)"
            />
            <PillarCard
              pillar="Learn"
              label="Free Run — AI Assistant"
              description="Ask anything about winemaking science, regulatory requirements, or your own protocols. The AI draws on your SOPs and world-class wine science, then cites its sources."
              href="/free-run"
              icon={<FlaskConical className="w-5 h-5" />}
              color="oklch(0.65 0.10 220)"
            />
            <PillarCard
              pillar="Guide"
              label="Compliance & Orientation"
              description="Compliance AI answers regulatory questions across LIP, FSANZ, and state licensing. This Guide page orients new users and maps the vintage workflow."
              href="/compliance"
              icon={<ShieldCheck className="w-5 h-5" />}
              color="oklch(0.65 0.10 160)"
            />
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Section 2 — Interactive Workflow Map                               */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div style={{ background: BG_RAISED, borderRadius: "4px", border: `1px solid ${BORDER}`, padding: "2rem" }}>
            <div className="flex items-center gap-3 mb-2">
              <div style={{ width: "1px", height: "1.5rem", background: AMBER }} />
              <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
                Vintage Workflow
              </p>
            </div>
            <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
              The vintage cycle, mapped to Ownology
            </h2>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, lineHeight: 1.6, marginBottom: "1.75rem", maxWidth: "520px" }}>
              Each stage of the vintage maps to one or more pillars. Click any node to go directly to that feature.
            </p>

            {/* Pillar legend */}
            <div className="flex flex-wrap gap-4 mb-6">
              {Object.entries(PILLAR_COLORS).map(([key, color]) => (
                <div key={key} className="flex items-center gap-2">
                  <div style={{ width: "8px", height: "8px", borderRadius: "2px", background: color }} />
                  <span style={{ fontFamily: MONO, fontSize: "0.6rem", letterSpacing: "0.1em", color: TEXT_LO, textTransform: "uppercase" }}>
                    {PILLAR_LABELS[key]}
                  </span>
                </div>
              ))}
            </div>

            {/* Workflow stages */}
            <div className="flex flex-col gap-0">
              {WORKFLOW_STAGES.map((stage, stageIdx) => (
                <div key={stage.id}>
                  {/* Stage header */}
                  <div className="flex items-center gap-3 py-3">
                    <div style={{
                      width: "1.75rem", height: "1.75rem", borderRadius: "50%", flexShrink: 0,
                      background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      color: AMBER,
                    }}>
                      {stage.icon}
                    </div>
                    <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI, letterSpacing: "0.01em" }}>
                      {stage.title}
                    </p>
                    <div style={{ flex: 1, height: "1px", background: BORDER }} />
                  </div>
                  {/* Nodes */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pb-3 pl-9">
                    {stage.nodes.map((node, nodeIdx) => (
                      <WorkflowNode key={nodeIdx} node={node} />
                    ))}
                  </div>
                  {/* Connector arrow between stages */}
                  {stageIdx < WORKFLOW_STAGES.length - 1 && (
                    <div className="flex justify-center py-1 pl-9">
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <path d="M8 2v10M4 8l4 4 4-4" stroke="color-mix(in oklch, var(--ow-amber) 40%, transparent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Section 3 — Getting Started Checklist                              */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <div style={{ width: "1px", height: "1.5rem", background: AMBER }} />
                <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
                  Getting Started
                </p>
              </div>
              <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", color: TEXT_HI }}>
                Your first week on Ownology
              </h2>
            </div>
            {/* Progress indicator */}
            <div style={{
              background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: "4px",
              padding: "0.625rem 1rem", display: "flex", alignItems: "center", gap: "0.75rem",
            }}>
              <div style={{ position: "relative", width: "2.5rem", height: "2.5rem" }}>
                <svg viewBox="0 0 36 36" style={{ width: "100%", height: "100%", transform: "rotate(-90deg)" }}>
                  <circle cx="18" cy="18" r="15" fill="none" stroke={BORDER} strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="15" fill="none"
                    stroke="oklch(0.72 0.15 145)"
                    strokeWidth="3"
                    strokeDasharray={`${(completedCount / totalCount) * 94.25} 94.25`}
                    strokeLinecap="round"
                  />
                </svg>
                <span style={{
                  position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: MONO, fontSize: "0.6rem", fontWeight: 700, color: completedCount === totalCount ? "oklch(0.72 0.15 145)" : TEXT_HI,
                }}>
                  {completedCount}/{totalCount}
                </span>
              </div>
              <div>
                <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.8125rem", color: TEXT_HI, lineHeight: 1.2 }}>
                  {completedCount === totalCount ? "All done!" : `${totalCount - completedCount} remaining`}
                </p>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.75rem", color: TEXT_LO }}>
                  Saved in this browser
                </p>
              </div>
            </div>
          </div>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.7, marginBottom: "0.5rem", maxWidth: "520px" }}>
            These 7 tasks will have you using every major feature of Ownology. Check them off as you go — your progress is saved in this browser.
          </p>
          <div>
            {CHECKLIST.map(item => (
              <ChecklistRow
                key={item.id}
                item={item}
                completed={completed.has(item.id)}
                onToggle={() => toggleItem(item.id)}
              />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Section 4 — Role-Based Paths                                       */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: "1px", height: "1.5rem", background: AMBER }} />
            <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
              Role-Based Paths
            </p>
          </div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
            Where to start, based on your role
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.7, marginBottom: "1.5rem", maxWidth: "520px" }}>
            These are navigational shortcuts — not profile settings. Pick the path that best matches your role and start from there.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {ROLE_PATHS.map(path => (
              <RoleCard key={path.role} path={path} />
            ))}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* Section 5 — Pillar Access by Tier                                    */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <section className="mb-16">
          <div className="flex items-center gap-3 mb-6">
            <div style={{ width: "1px", height: "1.5rem", background: AMBER }} />
            <p style={{ fontFamily: MONO, fontSize: "0.65rem", letterSpacing: "0.14em", color: AMBER, textTransform: "uppercase" }}>
              Membership
            </p>
          </div>
          <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.5rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
            Which pillars do you need?
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.7, marginBottom: "1.75rem", maxWidth: "560px" }}>
            Not every winery needs every pillar. Your membership tier determines which pillars you can access — so you only pay for what your operation actually uses.
          </p>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {([
              {
                tier: "Free Run",
                price: "Free",
                audience: "Curious about winemaking",
                highlight: false,
                pillars: [
                  { label: "GUIDE", color: "oklch(0.65 0.10 160)", desc: "Orientation, compliance basics, 5 queries/mo" },
                ],
                href: "/pricing",
                cta: "Start free",
              },
              {
                tier: "The Cellar Hand",
                price: "$16/mo",
                audience: "Home winemakers & wine students",
                highlight: false,
                pillars: [
                  { label: "LEARN", color: "oklch(0.65 0.10 220)", desc: "Full Free Run AI tutor, 40+ subjects" },
                  { label: "GUIDE", color: "oklch(0.65 0.10 160)", desc: "Unlimited Compliance AI queries" },
                ],
                href: "/pricing",
                cta: "Join The Cellar Hand",
              },
              {
                tier: "The Press",
                price: "$41/mo",
                audience: "Boutique winery teams",
                highlight: true,
                pillars: [
                  { label: "DO",    color: "var(--ow-amber)",  desc: "Full cellar operations suite" },
                  { label: "KNOW",  color: "oklch(0.62 0.10 45)",  desc: "38 SOPs, Decision Logic, Tribal Knowledge" },
                  { label: "GUIDE", color: "oklch(0.65 0.10 160)", desc: "Priority Compliance AI" },
                ],
                href: "/pricing",
                cta: "Enter The Press",
              },
              {
                tier: "The Vigneron",
                price: "$83/mo",
                audience: "Owner-operator boutique vignerons",
                highlight: false,
                pillars: [
                  { label: "DO",    color: "var(--ow-amber)",  desc: "Full cellar operations + 3 team seats" },
                  { label: "KNOW",  color: "oklch(0.62 0.10 45)",  desc: "Knowledge Platform + team editing" },
                  { label: "LEARN", color: "oklch(0.65 0.10 220)", desc: "Unlimited AI tutor credits" },
                  { label: "GUIDE", color: "oklch(0.65 0.10 160)", desc: "Onboarding call + annual review" },
                ],
                href: "/pricing",
                cta: "Claim The Vigneron",
              },
            ] as Array<{ tier: string; price: string; audience: string; highlight: boolean; pillars: Array<{ label: string; color: string; desc: string }>; href: string; cta: string }>).map(t => (
              <div key={t.tier} style={{
                background: t.highlight ? "oklch(0.16 0.012 60)" : BG_CARD,
                border: t.highlight ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : `1px solid ${BORDER}`,
                borderRadius: "4px",
                padding: "1.25rem",
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}>
                <div>
                  <div className="flex items-baseline justify-between gap-2 mb-0.5">
                    <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.0625rem", color: TEXT_HI }}>{t.tier}</span>
                    <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: t.highlight ? AMBER : TEXT_MID }}>{t.price}</span>
                  </div>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.75rem", color: TEXT_LO, fontStyle: "italic" }}>{t.audience}</p>
                </div>
                <div className="flex flex-col gap-2">
                  {t.pillars.map(p => (
                    <div key={p.label} className="flex items-start gap-2">
                      <span style={{ fontFamily: MONO, fontSize: "0.58rem", letterSpacing: "0.1em", color: p.color, border: `1px solid ${p.color}`, borderRadius: "2px", padding: "1px 5px", flexShrink: 0, marginTop: "2px" }}>
                        {p.label}
                      </span>
                      <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.78125rem", color: TEXT_MID, lineHeight: 1.5 }}>{p.desc}</span>
                    </div>
                  ))}
                </div>
                <Link href={t.href} style={{
                  display: "block",
                  textAlign: "center",
                  padding: "0.5rem 1rem",
                  borderRadius: "2px",
                  fontFamily: SANS,
                  fontWeight: 600,
                  fontSize: "0.75rem",
                  letterSpacing: "0.06em",
                  textTransform: "uppercase" as const,
                  textDecoration: "none",
                  marginTop: "auto",
                  background: t.highlight ? AMBER : "transparent",
                  color: t.highlight ? "var(--ow-bg-base)" : AMBER,
                  border: t.highlight ? "none" : "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                }}>
                  {t.cta}
                </Link>
              </div>
            ))}
          </div>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_LO, marginTop: "1rem" }}>
            All tiers include the Getting Started Guide and the public Resources library.{" "}
            <Link href="/pricing" style={{ color: AMBER, textDecoration: "none" }}>See full pricing →</Link>
          </p>
        </section>

        {/* ── Section 6 — Your First Fermentation ── */}
        <section>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.5rem", color: TEXT_HI, marginBottom: "0.5rem" }}>
            Your First Fermentation
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, marginBottom: "1.5rem", maxWidth: "600px" }}>
            Follow these seven steps from empty tank to bottled wine. Each step links to the right tool and its SOP.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem" }}>
            {([
              { step: 1, title: "Clean Your Tank", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "Cellar Tasks", toolHref: "/cellar-tasks", sopTitle: "Tank Cleaning & Sanitisation", sopHref: "/knowledge/category/Tank%20Cleaning%20%26%20Sanitation", desc: "Verify cleaning record, inspect valves and seals, confirm tank ID." },
              { step: 2, title: "Receive Your Grapes", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "The Press", toolHref: "/the-press", sopTitle: "Red Wine Fermentation", sopHref: "/knowledge/category/Fermentation%20Management", desc: "Record vineyard block, variety, date, Brix, pH, and TA at intake." },
              { step: 3, title: "Add Your Yeast", pillarLabel: "KNOW", pillarColor: "var(--ow-amber)", tool: "Knowledge Platform", toolHref: "/knowledge", sopTitle: "Yeast Rehydration & Inoculation", sopHref: "/knowledge/category/Fermentation%20Management", desc: "Rehydrate yeast correctly. Record batch number and inoculation time." },
              { step: 4, title: "Monitor Daily", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "Quick Entry", toolHref: "/quick-entry", sopTitle: "Pump-Over Protocol", sopHref: "/knowledge/category/Fermentation%20Management", desc: "Measure temperature, Brix, and sensory observations every day." },
              { step: 5, title: "Manage the Cap", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "The Press", toolHref: "/the-press", sopTitle: "Pump-Over Protocol", sopHref: "/knowledge/category/Fermentation%20Management", desc: "Conduct pump-overs per your fermentation schedule. Record duration." },
              { step: 6, title: "Press the Wine", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "The Press", toolHref: "/the-press", sopTitle: "Wine Press Operation & Pressing", sopHref: "/knowledge/category/Fermentation%20Management", desc: "Confirm residual sugar target. Separate free-run from press fractions." },
              { step: 7, title: "Bottle Your Wine", pillarLabel: "DO", pillarColor: "oklch(0.65 0.10 220)", tool: "The Press", toolHref: "/the-press", sopTitle: "Bottling & Packaging", sopHref: "/knowledge/category/Bottling%20Procedures", desc: "Check clarity and SO₂. Fill, seal, label, and record your batch." },
            ] as Array<{ step: number; title: string; pillarLabel: string; pillarColor: string; tool: string; toolHref: string; sopTitle: string; sopHref: string; desc: string }>).map(item => (
              <div key={item.step} style={{
                background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: "4px",
                padding: "0.875rem 1.125rem",
                display: "grid", gridTemplateColumns: "2.25rem 1fr", gap: "0.875rem", alignItems: "start",
              }}>
                <div style={{
                  width: "2.25rem", height: "2.25rem", borderRadius: "50%",
                  background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: SERIF, fontWeight: 700, fontSize: "0.875rem", color: AMBER, flexShrink: 0,
                }}>
                  {item.step}
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.2rem", flexWrap: "wrap" }}>
                    <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.9375rem", color: TEXT_HI }}>{item.title}</span>
                    <span style={{
                      fontFamily: MONO, fontSize: "0.6rem", fontWeight: 600, letterSpacing: "0.1em",
                      textTransform: "uppercase" as const, color: item.pillarColor,
                      background: `color-mix(in oklch, ${item.pillarColor} 12%, transparent)`,
                      border: `1px solid color-mix(in oklch, ${item.pillarColor} 28%, transparent)`,
                      borderRadius: "3px", padding: "1px 5px",
                    }}>{item.pillarLabel}</span>
                  </div>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID, marginBottom: "0.4rem" }}>{item.desc}</p>
                  <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                    <Link href={item.toolHref} style={{ fontFamily: SANS, fontSize: "0.75rem", color: AMBER, textDecoration: "none" }}>→ {item.tool}</Link>
                    <Link href={item.sopHref} style={{ fontFamily: SANS, fontSize: "0.75rem", color: "oklch(0.65 0.10 220)", textDecoration: "none" }}>📖 {item.sopTitle}</Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Footer note ── */}
        <div style={{
          background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: "4px",
          padding: "1.25rem 1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem",
          flexWrap: "wrap",
        }}>
          <div>
            <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: TEXT_HI, marginBottom: "0.25rem" }}>
              This page is always here.
            </p>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID }}>
              Access it any time from the navigation menu under <span style={{ color: AMBER }}>More → Guide</span>.
            </p>
          </div>
          <Link href="/the-press"
            className="btn-amber"
            style={{ textDecoration: "none", whiteSpace: "nowrap" }}
          >
            Open The Press
          </Link>
        </div>

      </div>
    </div>
  );
}
