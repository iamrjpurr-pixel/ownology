/**
 * DIY Knowledge Hub — /for-home-winemakers/knowledge
 * Beginner-friendly SOP library for home winemakers.
 * Uses the same sop_library table filtered to audience='diy'.
 * Routes:
 *   /for-home-winemakers/knowledge              — category grid (sequential journey)
 *   /for-home-winemakers/knowledge/category/:cat — SOP list
 *   /for-home-winemakers/knowledge/sop/:id       — SOP detail
 *
 * Uses CSS variables throughout so it responds to light/dark theme toggle.
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Design tokens ────────────────────────────────────────────────────────────
const SERIF = "'Fraunces', serif";
const SANS  = "'Lato', sans-serif";
const MONO  = "'Fira Code', monospace";

// ─── Journey steps — the sequential beginner workflow ─────────────────────────
// Each step is either a DB category (linked to the SOP list) or an external link.
interface JourneyStep {
  step: number;
  icon: string;
  title: string;
  description: string;
  /** If set, links to this external path instead of the category SOP list */
  externalHref?: string;
  /** DB category name — if set, links to /knowledge/category/:cat */
  category?: string;
}

const JOURNEY_STEPS: JourneyStep[] = [
  {
    step: 1,
    icon: "💰",
    title: "Costs & Planning",
    description: "What does it actually cost to make wine at home? Equipment, grapes, consumables — understand the full picture before you spend a cent.",
    externalHref: "/resources/home-winery-kit",
  },
  {
    step: 2,
    icon: "🧰",
    title: "Equipment You Need",
    description: "A complete checklist of every piece of equipment for a 23-litre home batch — Big Mouth Bubbler, hydrometer, siphon, corker, and more. With approximate costs.",
    externalHref: "/resources/home-winery-kit",
  },
  {
    step: 3,
    icon: "🧼",
    title: "Cleaning & Sanitation",
    description: "The most important step in winemaking. How to clean and sanitise every piece of equipment before and after use — and why it matters more than anything else.",
    category: "Tank Cleaning & Sanitation",
  },
  {
    step: 4,
    icon: "🍇",
    title: "Fermentation",
    description: "Red wine fermentation, yeast rehydration, punch-downs, MLF, and pressing — the core of home winemaking from crush to dry.",
    category: "Fermentation Management",
  },
  {
    step: 5,
    icon: "🍾",
    title: "Bottling",
    description: "Preparing bottles, filling, corking, and labelling your finished home wine. When to bottle and how to do it cleanly.",
    category: "Bottling Procedures",
  },
];

// ─── Category metadata (for SOP list pages) ──────────────────────────────────
const CAT_META: Record<string, { icon: string; description: string }> = {
  "Fermentation Management": {
    icon: "🍇",
    description: "Red wine fermentation, yeast rehydration, pump-overs, MLF, and pressing — the core of home winemaking.",
  },
  "Tank Cleaning & Sanitation": {
    icon: "🧼",
    description: "How to clean and sanitise your Big Mouth Bubbler, carboy, demijohn, and all your equipment before and after use.",
  },
  "Bottling Procedures": {
    icon: "🍾",
    description: "Preparing bottles, filling, corking, and labelling your finished home wine.",
  },
};

// ─── Shared nav ───────────────────────────────────────────────────────────────
function DIYNav({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-border)" }}
    >
      <div className="container flex items-center justify-between py-4">
        <Link href="/">
          <OwnologyLogo size={28} />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/free-run"
            style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-amber)", letterSpacing: "0.02em" }}
          >
            Ask a Question →
          </Link>
          <Link
            href={backHref}
            style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", letterSpacing: "0.02em" }}
          >
            ← {backLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Home: sequential journey grid ───────────────────────────────────────────
function DIYKnowledgeHome() {
  const { data: allSops = [], isLoading } = trpc.knowledge.listSops.useQuery({ audience: "diy" });

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      <DIYNav backHref="/for-home-winemakers" backLabel="Home Winemakers" />

      {/* Hero */}
      <section className="pt-16 pb-12 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-3xl">
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "1rem" }}>
            DIY Knowledge Hub
          </p>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.1, color: "var(--ow-text-hi)", letterSpacing: "-0.02em", marginBottom: "1rem", textWrap: "balance" as "balance" }}>
            Your step-by-step guide to<br />
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>making wine at home.</em>
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.75, color: "var(--ow-text-mid)", maxWidth: "520px" }}>
            Follow the journey from first-time buyer to bottling day. Each step builds on the last — start at Step 1 and work your way through.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-6 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-3xl">
          <div className="flex items-center gap-8">

            {/* Guides — with tooltip */}
            <div className="relative group cursor-default">
              <p style={{ fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700, color: "var(--ow-amber)", margin: 0 }}>{isLoading ? "…" : String(allSops.length)}</p>
              <p className="flex items-center gap-1" style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--ow-text-lo)", margin: "2px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Guides
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
                  <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  <circle cx="6" cy="3.75" r="0.6" fill="currentColor"/>
                </svg>
              </p>
              <div className="absolute bottom-full left-0 mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ width: "230px" }}>
                <div style={{ background: "oklch(0.14 0.008 60)", border: "1px solid oklch(0.72 0.12 75 / 30%)", borderRadius: "4px", padding: "0.625rem 0.75rem", boxShadow: "0 4px 20px oklch(0 0 0 / 0.35)" }}>
                  <p style={{ fontFamily: MONO, fontSize: "0.65rem", fontWeight: 600, color: "var(--ow-amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.375rem" }}>What are guides?</p>
                  <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "oklch(0.82 0.015 75)", lineHeight: 1.55, margin: 0 }}>Each guide is a step-by-step SOP (Standard Operating Procedure) drawn from the Red Wine Bible and MoreWine! Outline — written for home scale, not commercial production.</p>
                </div>
              </div>
            </div>

            {/* Journey Steps — with tooltip */}
            <div className="relative group cursor-default">
              <p style={{ fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700, color: "var(--ow-amber)", margin: 0 }}>5</p>
              <p className="flex items-center gap-1" style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--ow-text-lo)", margin: "2px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Journey Steps
                <svg width="11" height="11" viewBox="0 0 12 12" fill="none" style={{ opacity: 0.45, flexShrink: 0 }}>
                  <circle cx="6" cy="6" r="5.25" stroke="currentColor" strokeWidth="1.1"/>
                  <path d="M6 5.5v3" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round"/>
                  <circle cx="6" cy="3.75" r="0.6" fill="currentColor"/>
                </svg>
              </p>
              <div className="absolute bottom-full left-0 mb-2 z-20 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-150" style={{ width: "240px" }}>
                <div style={{ background: "oklch(0.14 0.008 60)", border: "1px solid oklch(0.72 0.12 75 / 30%)", borderRadius: "4px", padding: "0.625rem 0.75rem", boxShadow: "0 4px 20px oklch(0 0 0 / 0.35)" }}>
                  <p style={{ fontFamily: MONO, fontSize: "0.65rem", fontWeight: 600, color: "var(--ow-amber)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: "0.5rem" }}>The 5-step journey</p>
                  {[
                    ["1", "Costs & Planning", "What it costs before you start"],
                    ["2", "Equipment", "Everything you need for a 23L batch"],
                    ["3", "Cleaning & Sanitation", "The most important step"],
                    ["4", "Fermentation", "Crush to dry — the core of it"],
                    ["5", "Bottling", "Filling, corking, labelling"],
                  ].map(([num, title, desc]) => (
                    <div key={num} style={{ marginBottom: num !== "5" ? "0.35rem" : 0 }}>
                      <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "oklch(0.88 0.015 75)", lineHeight: 1.35, margin: 0 }}>
                        <span style={{ fontFamily: MONO, fontSize: "0.65rem", color: "var(--ow-amber)", marginRight: "0.35rem" }}>{num}.</span>
                        <strong style={{ fontWeight: 500 }}>{title}</strong>
                      </p>
                      <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: "oklch(0.58 0.012 75)", lineHeight: 1.35, margin: 0, paddingLeft: "1rem" }}>{desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Audience — plain */}
            <div>
              <p style={{ fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700, color: "var(--ow-amber)", margin: 0 }}>Home winemakers</p>
              <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--ow-text-lo)", margin: "2px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>Audience</p>
            </div>

          </div>
        </div>
      </section>

      {/* Journey steps */}
      <section className="py-12">
        <div className="container max-w-3xl">
          <div className="flex flex-col gap-4">
            {JOURNEY_STEPS.map((step) => {
              const href = step.externalHref
                ? step.externalHref
                : `/for-home-winemakers/knowledge/category/${encodeURIComponent(step.category!)}`;
              const sopCount = step.category
                ? allSops.filter((s) => s.category === step.category).length
                : null;

              return (
                <Link key={step.step} href={href} style={{ textDecoration: "none" }}>
                  <div
                    style={{
                      background: "var(--ow-bg-raised)",
                      border: "1px solid var(--ow-border)",
                      borderRadius: 4,
                      padding: "1.5rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "1.25rem",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--ow-amber)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--ow-border)")}
                  >
                    {/* Step number */}
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: "50%",
                        background: "var(--ow-bg-inset)",
                        border: "1px solid var(--ow-border-md)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{ fontFamily: MONO, fontSize: "0.85rem", fontWeight: 700, color: "var(--ow-amber)" }}>
                        {step.step}
                      </span>
                    </div>

                    {/* Content */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "0.4rem" }}>
                        <span style={{ fontSize: "1.1rem" }}>{step.icon}</span>
                        <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: 0 }}>
                          {step.title}
                        </p>
                        {sopCount !== null && sopCount > 0 && (
                          <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ow-amber)", background: "oklch(from var(--ow-amber) l c h / 0.12)", padding: "2px 8px", borderRadius: 20 }}>
                            {sopCount} {sopCount === 1 ? "guide" : "guides"}
                          </span>
                        )}
                        {step.externalHref && (
                          <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: "var(--ow-text-lo)", background: "var(--ow-bg-inset)", padding: "2px 8px", borderRadius: 20 }}>
                            checklist
                          </span>
                        )}
                      </div>
                      <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", lineHeight: 1.65, margin: 0 }}>
                        {step.description}
                      </p>
                    </div>

                    <span style={{ color: "var(--ow-amber)", fontSize: "1.2rem", flexShrink: 0, paddingTop: 8 }}>→</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-12 border-t" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-3xl">
          <div style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: 4, padding: "1.75rem 2rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: 0, marginBottom: "0.35rem" }}>Can't find what you need?</p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", margin: 0 }}>Ask Ownology a question in plain English — it searches all guides for you.</p>
            </div>
            <Link
              href="/free-run"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.65rem 1.25rem", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontWeight: 700, fontSize: "0.875rem", borderRadius: 2, textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}
            >
              Ask a Question
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Category: SOP list ───────────────────────────────────────────────────────
function DIYKnowledgeCategory({ category }: { category: string }) {
  const decodedCat = decodeURIComponent(category);
  const { data: sops = [], isLoading } = trpc.knowledge.listSops.useQuery({ category: decodedCat, audience: "diy" });
  const meta = CAT_META[decodedCat] ?? { icon: "📋", description: "" };

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />

      <section className="pt-14 pb-10 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-3xl">
          <Link href="/for-home-winemakers/knowledge" style={{ fontFamily: SANS, fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.25rem" }}>
            ← All steps
          </Link>
          <div className="flex items-center gap-4" style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "2rem" }}>{meta.icon}</span>
            <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.1, color: "var(--ow-text-hi)", letterSpacing: "-0.02em", margin: 0 , textWrap: "balance" as "balance" }}>{decodedCat}</h1>
          </div>
          {meta.description && (
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ow-text-mid)", maxWidth: "520px", margin: 0 }}>{meta.description}</p>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="container max-w-3xl">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 80, background: "var(--ow-bg-raised)", borderRadius: 4, border: "1px solid var(--ow-border)", opacity: 0.5 }} />
              ))}
            </div>
          ) : sops.length === 0 ? (
            <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)" }}>No guides in this category yet.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {sops.map((sop, idx) => (
                <Link
                  key={sop.id}
                  href={`/for-home-winemakers/knowledge/sop/${sop.id}`}
                  style={{ textDecoration: "none" }}
                >
                  <div
                    style={{
                      background: "var(--ow-bg-raised)",
                      border: "1px solid var(--ow-border)",
                      borderRadius: 4,
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--ow-amber)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "var(--ow-border)")}
                  >
                    <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--ow-text-lo)", width: 24, flexShrink: 0, textAlign: "right" }}>{String(idx + 1).padStart(2, "0")}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: "var(--ow-text-hi)", margin: 0, lineHeight: 1.3 }}>
                        {sop.title.replace(/ — DIY Home Winemaker$/, "")}
                      </p>
                      {sop.procedureText && (
                        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.82rem", color: "var(--ow-text-lo)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          {sop.procedureText.slice(0, 120).replace(/\n/g, " ")}{sop.procedureText.length > 120 ? "…" : ""}
                        </p>
                      )}
                    </div>
                    <span style={{ color: "var(--ow-amber)", fontSize: "1rem", flexShrink: 0 }}>→</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

// ─── SOP Detail ───────────────────────────────────────────────────────────────
function DIYSopDetail({ id }: { id: number }) {
  const { data: sop, isLoading } = trpc.knowledge.getSop.useQuery({ id });
  const [activeTab, setActiveTab] = useState<"steps" | "why" | "tips">("steps");

  if (isLoading) {
    return (
      <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
        <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />
        <div className="container max-w-3xl pt-16">
          <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)" }}>Loading guide…</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
        <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />
        <div className="container max-w-3xl pt-16">
          <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)" }}>Guide not found.</p>
        </div>
      </div>
    );
  }

  const displayTitle = sop.title.replace(/ — DIY Home Winemaker$/, "");
  const meta = CAT_META[sop.category] ?? { icon: "📋", description: "" };

  // Parse quick steps
  const quickSteps = sop.quickSteps
    ? sop.quickSteps.split("\n").filter((l: string) => l.trim().startsWith("-")).map((l: string) => l.replace(/^-\s*/, "").trim())
    : [];

  const TABS = [
    { id: "steps" as const, label: "Quick Steps", available: quickSteps.length > 0 },
    { id: "why" as const, label: "Why It Matters", available: !!sop.decisionLogic },
    { id: "tips" as const, label: "Tips & Tricks", available: !!sop.tribalKnowledge },
  ].filter((t) => t.available);

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      <DIYNav backHref={`/for-home-winemakers/knowledge/category/${encodeURIComponent(sop.category)}`} backLabel={sop.category} />

      {/* Header */}
      <section className="pt-12 pb-8 border-b" style={{ borderColor: "var(--ow-border)" }}>
        <div className="container max-w-3xl">
          <Link
            href={`/for-home-winemakers/knowledge/category/${encodeURIComponent(sop.category)}`}
            style={{ fontFamily: SANS, fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.25rem" }}
          >
            ← {sop.category}
          </Link>
          <div className="flex items-center gap-3" style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>{meta.icon}</span>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ow-amber)" }}>
              DIY Guide
            </span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.1, color: "var(--ow-text-hi)", letterSpacing: "-0.02em", marginBottom: "0.75rem" , textWrap: "balance" as "balance" }}>
            {displayTitle}
          </h1>
          {sop.procedureText && (
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: "var(--ow-text-mid)", maxWidth: "560px", margin: 0 }}>
              {sop.procedureText.slice(0, 180).replace(/\n/g, " ")}{sop.procedureText.length > 180 ? "…" : ""}
            </p>
          )}
        </div>
      </section>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="border-b" style={{ borderColor: "var(--ow-border)" }}>
          <div className="container max-w-3xl">
            <div className="flex gap-0">
              {TABS.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  style={{
                    fontFamily: SANS,
                    fontWeight: activeTab === tab.id ? 600 : 300,
                    fontSize: "0.875rem",
                    color: activeTab === tab.id ? "var(--ow-amber)" : "var(--ow-text-lo)",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid var(--ow-amber)" : "2px solid transparent",
                    padding: "0.875rem 1.25rem",
                    cursor: "pointer",
                    letterSpacing: "0.02em",
                    marginBottom: -1,
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <section className="py-10">
        <div className="container max-w-3xl">

          {/* Quick Steps */}
          {(activeTab === "steps" || TABS.length === 1) && quickSteps.length > 0 && (
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "1.25rem" }}>
                Step-by-step
              </p>
              <ol className="flex flex-col gap-3" style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {quickSteps.map((step: string, i: number) => (
                  <li
                    key={i}
                    style={{
                      display: "flex",
                      gap: "1rem",
                      alignItems: "flex-start",
                      background: "var(--ow-bg-raised)",
                      border: "1px solid var(--ow-border)",
                      borderRadius: 4,
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: "0.9rem", color: "var(--ow-amber)", fontWeight: 700, flexShrink: 0, minWidth: 24, paddingTop: 2 }}>{i + 1}.</span>
                    <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "var(--ow-text-mid)", lineHeight: 1.65 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Why It Matters */}
          {activeTab === "why" && sop.decisionLogic && (
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "1.25rem" }}>
                Why it matters
              </p>
              <div style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "var(--ow-text-mid)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.decisionLogic}
                </p>
              </div>
            </div>
          )}

          {/* Tips & Tricks */}
          {activeTab === "tips" && sop.tribalKnowledge && (
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "1.25rem" }}>
                Tips & tricks
              </p>
              <div style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "var(--ow-text-mid)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.tribalKnowledge}
                </p>
              </div>
            </div>
          )}

          {/* Full procedure (always shown below tabs) */}
          {sop.procedureText && (
            <div style={{ marginTop: "2.5rem" }}>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "1.25rem" }}>
                Full procedure
              </p>
              <div style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: "var(--ow-text-mid)", lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.procedureText}
                </p>
              </div>
            </div>
          )}

          {/* Ask Ownology CTA */}
          <div style={{ marginTop: "2.5rem", padding: "1.5rem", background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: 4, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: "var(--ow-text-hi)", margin: 0, marginBottom: "0.3rem" }}>Have a question about this guide?</p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.82rem", color: "var(--ow-text-lo)", margin: 0 }}>Ask Ownology — it will search this guide and all others to find the answer.</p>
            </div>
            <Link
              href={`/free-run?q=${encodeURIComponent(`Question about: ${displayTitle}`)}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.1rem", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem", borderRadius: 2, textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}
            >
              Ask Ownology →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────────
export default function DIYKnowledge() {
  const [wouterLoc] = useLocation();
  const loc = (wouterLoc && wouterLoc.startsWith("/for-home-winemakers/knowledge"))
    ? wouterLoc
    : (typeof window !== "undefined" ? window.location.pathname : "/for-home-winemakers/knowledge");

  // /for-home-winemakers/knowledge/sop/:id
  const sopMatch = loc.match(/^\/for-home-winemakers\/knowledge\/sop\/(\d+)$/);
  if (sopMatch) return <DIYSopDetail id={parseInt(sopMatch[1], 10)} />;

  // /for-home-winemakers/knowledge/category/:cat
  const catMatch = loc.match(/^\/for-home-winemakers\/knowledge\/category\/(.+)$/);
  if (catMatch) return <DIYKnowledgeCategory category={catMatch[1]} />;

  // /for-home-winemakers/knowledge
  return <DIYKnowledgeHome />;
}
