/**
 * DIY Knowledge Hub — /for-home-winemakers/knowledge
 * Beginner-friendly SOP library for home winemakers.
 * Uses the same sop_library table filtered to audience='diy'.
 * Routes:
 *   /for-home-winemakers/knowledge              — category grid
 *   /for-home-winemakers/knowledge/category/:cat — SOP list
 *   /for-home-winemakers/knowledge/sop/:id       — SOP detail (read-only, no training/vintage layers)
 */
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Design tokens ────────────────────────────────────────────────────────────
const SERIF = "'Fraunces', serif";
const SANS  = "'Lato', sans-serif";
const MONO  = "'Fira Code', monospace";

// ─── Category metadata ────────────────────────────────────────────────────────
const CAT_META: Record<string, { icon: string; color: string; description: string }> = {
  "Fermentation Management": {
    icon: "🍇",
    color: "oklch(0.72 0.12 75)",
    description: "Red wine fermentation, yeast rehydration, pump-overs, MLF, and pressing — the core of home winemaking.",
  },
  "Tank Cleaning & Sanitation": {
    icon: "🧼",
    color: "oklch(0.65 0.10 220)",
    description: "How to clean and sanitise your Big Mouth Bubbler, carboy, demijohn, and all your equipment before and after use.",
  },
  "Bottling Procedures": {
    icon: "🍾",
    color: "oklch(0.65 0.10 160)",
    description: "Preparing bottles, filling, corking, and labelling your finished home wine.",
  },
};

// ─── Shared nav ───────────────────────────────────────────────────────────────
function DIYNav({ backHref, backLabel }: { backHref: string; backLabel: string }) {
  return (
    <nav
      className="sticky top-0 z-50 border-b"
      style={{ background: "oklch(0.11 0.008 60)", borderColor: "oklch(1 0 0 / 0.08)" }}
    >
      <div className="container flex items-center justify-between py-4">
        <Link href="/">
          <OwnologyLogo size={28} />
        </Link>
        <div className="flex items-center gap-6">
          <Link
            href="/free-run"
            style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.72 0.12 75)", letterSpacing: "0.02em" }}
          >
            Ask a Question →
          </Link>
          <Link
            href={backHref}
            style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.50 0.010 75)", letterSpacing: "0.02em" }}
          >
            ← {backLabel}
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Home: category grid ──────────────────────────────────────────────────────
function DIYKnowledgeHome() {
  const { data: allSops = [], isLoading } = trpc.knowledge.listSops.useQuery({ audience: "diy" });

  const categories = Array.from(new Set(allSops.map((s) => s.category)));

  return (
    <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
      <DIYNav backHref="/for-home-winemakers" backLabel="Home Winemakers" />

      {/* Hero */}
      <section className="pt-16 pb-12 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-3xl">
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1rem" }}>
            DIY Knowledge Hub
          </p>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.1, color: "oklch(0.92 0.018 75)", letterSpacing: "-0.02em", marginBottom: "1rem" }}>
            Step-by-step guides for<br />
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>home winemakers.</em>
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.75, color: "oklch(0.68 0.013 75)", maxWidth: "520px" }}>
            Plain-English procedures written for garage and kitchen winemakers — no commercial licence, no jargon. Each guide covers what to do, when to do it, and why it matters.
          </p>
        </div>
      </section>

      {/* Stats bar */}
      <section className="py-6 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-3xl">
          <div className="flex items-center gap-8">
            {[
              { label: "Guides", value: isLoading ? "…" : String(allSops.length) },
              { label: "Categories", value: isLoading ? "…" : String(categories.length) },
              { label: "Audience", value: "Home winemakers" },
            ].map((s) => (
              <div key={s.label}>
                <p style={{ fontFamily: MONO, fontSize: "1.25rem", fontWeight: 700, color: "oklch(0.72 0.12 75)", margin: 0 }}>{s.value}</p>
                <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: "oklch(0.50 0.010 75)", margin: "2px 0 0", letterSpacing: "0.06em", textTransform: "uppercase" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Category grid */}
      <section className="py-12">
        <div className="container max-w-3xl">
          {isLoading ? (
            <div className="flex flex-col gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 120, background: "oklch(0.14 0.009 60)", borderRadius: 4, border: "1px solid oklch(1 0 0 / 0.08)", opacity: 0.5 }} />
              ))}
            </div>
          ) : categories.length === 0 ? (
            <p style={{ fontFamily: SANS, color: "oklch(0.50 0.010 75)", fontSize: "0.95rem" }}>No guides available yet.</p>
          ) : (
            <div className="flex flex-col gap-4">
              {categories.map((cat) => {
                const meta = CAT_META[cat] ?? { icon: "📋", color: "oklch(0.72 0.12 75)", description: "" };
                const count = allSops.filter((s) => s.category === cat).length;
                return (
                  <Link
                    key={cat}
                    href={`/for-home-winemakers/knowledge/category/${encodeURIComponent(cat)}`}
                    style={{ textDecoration: "none" }}
                  >
                    <div
                      style={{
                        background: "oklch(0.14 0.009 60)",
                        border: "1px solid oklch(1 0 0 / 0.08)",
                        borderRadius: 4,
                        padding: "1.5rem",
                        display: "flex",
                        alignItems: "center",
                        gap: "1.25rem",
                        cursor: "pointer",
                        transition: "border-color 0.15s ease",
                      }}
                      onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.72 0.12 75)")}
                      onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "oklch(1 0 0 / 0.08)")}
                    >
                      <div style={{ fontSize: "2rem", width: 48, textAlign: "center", flexShrink: 0 }}>{meta.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div className="flex items-center gap-3 flex-wrap" style={{ marginBottom: "0.35rem" }}>
                          <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.1rem", color: "oklch(0.92 0.018 75)", margin: 0 }}>{cat}</p>
                          <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: meta.color, background: `${meta.color.replace(")", " / 12%)")}`, padding: "2px 8px", borderRadius: 20 }}>
                            {count} {count === 1 ? "guide" : "guides"}
                          </span>
                        </div>
                        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.50 0.010 75)", lineHeight: 1.6, margin: 0 }}>{meta.description}</p>
                      </div>
                      <span style={{ color: "oklch(0.72 0.12 75)", fontSize: "1.2rem", flexShrink: 0 }}>→</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* CTA strip */}
      <section className="py-12 border-t" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-3xl">
          <div style={{ background: "oklch(0.14 0.009 60)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 4, padding: "1.75rem 2rem", display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.1rem", color: "oklch(0.92 0.018 75)", margin: 0, marginBottom: "0.35rem" }}>Can't find what you need?</p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.50 0.010 75)", margin: 0 }}>Ask Ownology a question in plain English — it searches all guides for you.</p>
            </div>
            <Link
              href="/free-run"
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.65rem 1.25rem", background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontWeight: 700, fontSize: "0.875rem", borderRadius: 2, textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}
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
  const meta = CAT_META[decodedCat] ?? { icon: "📋", color: "oklch(0.72 0.12 75)", description: "" };

  return (
    <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
      <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />

      <section className="pt-14 pb-10 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-3xl">
          <Link href="/for-home-winemakers/knowledge" style={{ fontFamily: SANS, fontSize: "0.8rem", color: "oklch(0.50 0.010 75)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.25rem" }}>
            ← All categories
          </Link>
          <div className="flex items-center gap-4" style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "2rem" }}>{meta.icon}</span>
            <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.1, color: "oklch(0.92 0.018 75)", letterSpacing: "-0.02em", margin: 0 }}>{decodedCat}</h1>
          </div>
          {meta.description && (
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", lineHeight: 1.7, color: "oklch(0.68 0.013 75)", maxWidth: "520px", margin: 0 }}>{meta.description}</p>
          )}
        </div>
      </section>

      <section className="py-10">
        <div className="container max-w-3xl">
          {isLoading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 80, background: "oklch(0.14 0.009 60)", borderRadius: 4, border: "1px solid oklch(1 0 0 / 0.08)", opacity: 0.5 }} />
              ))}
            </div>
          ) : sops.length === 0 ? (
            <p style={{ fontFamily: SANS, color: "oklch(0.50 0.010 75)" }}>No guides in this category yet.</p>
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
                      background: "oklch(0.14 0.009 60)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      borderRadius: 4,
                      padding: "1.25rem 1.5rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "1rem",
                      cursor: "pointer",
                      transition: "border-color 0.15s ease",
                    }}
                    onMouseEnter={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "oklch(0.72 0.12 75)")}
                    onMouseLeave={(e) => ((e.currentTarget as HTMLDivElement).style.borderColor = "oklch(1 0 0 / 0.08)")}
                  >
                    <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "oklch(0.50 0.010 75)", width: 24, flexShrink: 0, textAlign: "right" }}>{String(idx + 1).padStart(2, "0")}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: "oklch(0.92 0.018 75)", margin: 0, lineHeight: 1.3 }}>
                        {sop.title.replace(/ — DIY Home Winemaker$/, "")}
                      </p>
                      {sop.procedureText && (
                        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.82rem", color: "oklch(0.50 0.010 75)", margin: "4px 0 0", lineHeight: 1.5 }}>
                          {sop.procedureText.slice(0, 120).replace(/\n/g, " ")}{sop.procedureText.length > 120 ? "…" : ""}
                        </p>
                      )}
                    </div>
                    <span style={{ color: "oklch(0.72 0.12 75)", fontSize: "1rem", flexShrink: 0 }}>→</span>
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
      <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
        <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />
        <div className="container max-w-3xl pt-16">
          <p style={{ fontFamily: SANS, color: "oklch(0.50 0.010 75)" }}>Loading guide…</p>
        </div>
      </div>
    );
  }

  if (!sop) {
    return (
      <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
        <DIYNav backHref="/for-home-winemakers/knowledge" backLabel="Knowledge Hub" />
        <div className="container max-w-3xl pt-16">
          <p style={{ fontFamily: SANS, color: "oklch(0.50 0.010 75)" }}>Guide not found.</p>
        </div>
      </div>
    );
  }

  const displayTitle = sop.title.replace(/ — DIY Home Winemaker$/, "");
  const meta = CAT_META[sop.category] ?? { icon: "📋", color: "oklch(0.72 0.12 75)", description: "" };

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
    <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
      <DIYNav backHref={`/for-home-winemakers/knowledge/category/${encodeURIComponent(sop.category)}`} backLabel={sop.category} />

      {/* Header */}
      <section className="pt-12 pb-8 border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
        <div className="container max-w-3xl">
          <Link
            href={`/for-home-winemakers/knowledge/category/${encodeURIComponent(sop.category)}`}
            style={{ fontFamily: SANS, fontSize: "0.8rem", color: "oklch(0.50 0.010 75)", textDecoration: "none", display: "inline-flex", alignItems: "center", gap: "0.3rem", marginBottom: "1.25rem" }}
          >
            ← {sop.category}
          </Link>
          <div className="flex items-center gap-3" style={{ marginBottom: "0.75rem" }}>
            <span style={{ fontSize: "1.5rem" }}>{meta.icon}</span>
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.16em", textTransform: "uppercase", color: meta.color }}>
              DIY Guide
            </span>
          </div>
          <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)", lineHeight: 1.1, color: "oklch(0.92 0.018 75)", letterSpacing: "-0.02em", marginBottom: "0.75rem" }}>
            {displayTitle}
          </h1>
          {sop.procedureText && (
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", lineHeight: 1.7, color: "oklch(0.68 0.013 75)", maxWidth: "560px", margin: 0 }}>
              {sop.procedureText.slice(0, 180).replace(/\n/g, " ")}{sop.procedureText.length > 180 ? "…" : ""}
            </p>
          )}
        </div>
      </section>

      {/* Tabs */}
      {TABS.length > 1 && (
        <div className="border-b" style={{ borderColor: "oklch(1 0 0 / 0.08)" }}>
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
                    color: activeTab === tab.id ? "oklch(0.72 0.12 75)" : "oklch(0.50 0.010 75)",
                    background: "transparent",
                    border: "none",
                    borderBottom: activeTab === tab.id ? "2px solid oklch(0.72 0.12 75)" : "2px solid transparent",
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
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1.25rem" }}>
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
                      background: "oklch(0.14 0.009 60)",
                      border: "1px solid oklch(1 0 0 / 0.08)",
                      borderRadius: 4,
                      padding: "1rem 1.25rem",
                    }}
                  >
                    <span style={{ fontFamily: MONO, fontSize: "0.9rem", color: "oklch(0.72 0.12 75)", fontWeight: 700, flexShrink: 0, minWidth: 24, paddingTop: 2 }}>{i + 1}.</span>
                    <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "oklch(0.68 0.013 75)", lineHeight: 1.65 }}>{step}</span>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Why It Matters */}
          {activeTab === "why" && sop.decisionLogic && (
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1.25rem" }}>
                Why it matters
              </p>
              <div style={{ background: "oklch(0.14 0.009 60)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "oklch(0.68 0.013 75)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.decisionLogic}
                </p>
              </div>
            </div>
          )}

          {/* Tips & Tricks */}
          {activeTab === "tips" && sop.tribalKnowledge && (
            <div>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1.25rem" }}>
                Tips & tricks
              </p>
              <div style={{ background: "oklch(0.14 0.009 60)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.95rem", color: "oklch(0.68 0.013 75)", lineHeight: 1.8, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.tribalKnowledge}
                </p>
              </div>
            </div>
          )}

          {/* Full procedure (always shown below tabs) */}
          {sop.procedureText && (
            <div style={{ marginTop: "2.5rem" }}>
              <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.16em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1.25rem" }}>
                Full procedure
              </p>
              <div style={{ background: "oklch(0.14 0.009 60)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 4, padding: "1.5rem" }}>
                <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: "oklch(0.68 0.013 75)", lineHeight: 1.85, margin: 0, whiteSpace: "pre-wrap" }}>
                  {sop.procedureText}
                </p>
              </div>
            </div>
          )}

          {/* Ask Ownology CTA */}
          <div style={{ marginTop: "2.5rem", padding: "1.5rem", background: "oklch(0.14 0.009 60)", border: "1px solid oklch(1 0 0 / 0.08)", borderRadius: 4, display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div>
              <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1rem", color: "oklch(0.92 0.018 75)", margin: 0, marginBottom: "0.3rem" }}>Have a question about this guide?</p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.82rem", color: "oklch(0.50 0.010 75)", margin: 0 }}>Ask Ownology — it will search this guide and all others to find the answer.</p>
            </div>
            <Link
              href={`/free-run?q=${encodeURIComponent(`Question about: ${displayTitle}`)}`}
              style={{ display: "inline-flex", alignItems: "center", gap: "0.4rem", padding: "0.6rem 1.1rem", background: "oklch(0.72 0.12 75)", color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontWeight: 700, fontSize: "0.82rem", borderRadius: 2, textDecoration: "none", letterSpacing: "0.04em", textTransform: "uppercase", flexShrink: 0 }}
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
