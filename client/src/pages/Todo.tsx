/**
 * Todo — the public Ownology roadmap.
 *
 * Renders /app/client/src/data/todoData.ts as a clean, browseable roadmap
 * at ownology.ai/todo. Public URL. No signup. Prospects and investors can
 * see exactly what Rich & Gel are building, in what order, and why.
 *
 * Design philosophy: grouped by priority band, colour-coded by band, plain
 * English descriptions (not developer-speak), with a "recently shipped"
 * section at the bottom to signal momentum.
 *
 * Update rule: whenever a TODO item ships, fixes, or gets added — edit
 * /app/client/src/data/todoData.ts and this page updates itself. No CMS,
 * no drift.
 */
import { TODO, RECENTLY_SHIPPED, LAST_UPDATED, type TodoItem, type TodoPriority } from "@/data/todoData";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Link } from "wouter";

// ─── Tokens ────────────────────────────────────────────────────────────
const AMBER = "var(--ow-amber)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const BORDER = "var(--ow-border)";
const CARD_BG = "var(--ow-card-bg)";
const BG = "var(--ow-bg)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'JetBrains Mono', monospace";

// ─── Priority meta ─────────────────────────────────────────────────────
const PRIORITY_META: Record<TodoPriority, { label: string; caption: string; colour: string; order: number }> = {
  p0: {
    label: "P0",
    caption: "Must ship before first paying customer",
    colour: "oklch(0.62 0.20 25)",   // red
    order: 0,
  },
  p1: {
    label: "P1",
    caption: "Launch protection & growth",
    colour: "oklch(0.68 0.15 65)",   // amber-orange
    order: 1,
  },
  p2: {
    label: "P2",
    caption: "Conversion polish — after real usage data",
    colour: "oklch(0.75 0.14 90)",   // gold
    order: 2,
  },
  blocked: {
    label: "Blocked",
    caption: "Waiting on someone or something outside the codebase",
    colour: "oklch(0.62 0.02 260)",  // grey-blue
    order: 3,
  },
  p3: {
    label: "P3",
    caption: "Backlog / hygiene",
    colour: "oklch(0.55 0.02 260)",  // grey
    order: 4,
  },
};

// ─── Group + sort ──────────────────────────────────────────────────────
function groupByPriority(items: TodoItem[]): Record<TodoPriority, TodoItem[]> {
  const groups: Record<TodoPriority, TodoItem[]> = {
    p0: [], p1: [], p2: [], p3: [], blocked: [],
  };
  for (const item of items) groups[item.priority].push(item);
  return groups;
}

// ─── Sub-components ────────────────────────────────────────────────────
function StatusBadge({ status }: { status: TodoItem["status"] }) {
  const map = {
    "not-started": { label: "Not started", colour: LO },
    "in-progress": { label: "In progress", colour: AMBER },
    "done": { label: "Shipped ✓", colour: "oklch(0.62 0.16 145)" },
    "blocked": { label: "Blocked", colour: "oklch(0.62 0.02 260)" },
  };
  const { label, colour } = map[status];
  return (
    <span
      style={{
        fontFamily: SANS,
        fontSize: "0.62rem",
        letterSpacing: "0.1em",
        textTransform: "uppercase",
        color: colour,
        fontWeight: 700,
        marginLeft: "auto",
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </span>
  );
}

function TodoCard({ item }: { item: TodoItem }) {
  const bandColour = PRIORITY_META[item.priority].colour;
  return (
    <article
      data-testid={`todo-item-${item.id}`}
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderLeft: `3px solid ${bandColour}`,
        borderRadius: 4,
        padding: "1.15rem 1.25rem",
        marginBottom: "0.85rem",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.35rem" }}>
        <span
          style={{
            fontFamily: SANS,
            fontSize: "0.6rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            color: bandColour,
            fontWeight: 700,
          }}
        >
          {item.category}
        </span>
        <span style={{ color: LO, fontSize: "0.62rem" }}>·</span>
        <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: LO }}>{item.effort}</span>
        <StatusBadge status={item.status} />
      </div>
      <h3
        style={{
          fontFamily: SERIF,
          fontSize: "1.1rem",
          color: HI,
          margin: 0,
          marginBottom: "0.5rem",
          lineHeight: 1.3,
        }}
      >
        {item.title}
      </h3>
      <p
        style={{
          fontFamily: SANS,
          fontSize: "0.86rem",
          color: MID,
          margin: 0,
          lineHeight: 1.6,
        }}
      >
        {item.description}
      </p>
    </article>
  );
}

function PriorityBand({ priority, items }: { priority: TodoPriority; items: TodoItem[] }) {
  if (items.length === 0) return null;
  const meta = PRIORITY_META[priority];
  return (
    <section data-testid={`todo-band-${priority}`} style={{ marginBottom: "2.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.7rem",
          marginBottom: "0.9rem",
          paddingBottom: "0.5rem",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <span
          style={{
            display: "inline-block",
            width: 10,
            height: 10,
            borderRadius: 999,
            background: meta.colour,
          }}
        />
        <h2 style={{ fontFamily: SERIF, fontSize: "1.35rem", color: HI, margin: 0 }}>
          {meta.label}
        </h2>
        <span style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO }}>
          · {meta.caption}
        </span>
        <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: LO, marginLeft: "auto" }}>
          {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </div>
      {items.map((item) => (
        <TodoCard key={item.id} item={item} />
      ))}
    </section>
  );
}

function ShippedSection() {
  if (RECENTLY_SHIPPED.length === 0) return null;
  return (
    <section data-testid="todo-shipped" style={{ marginTop: "3.5rem" }}>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: "0.7rem",
          marginBottom: "0.9rem",
          paddingBottom: "0.5rem",
          borderBottom: `1px solid ${BORDER}`,
        }}
      >
        <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 999, background: "oklch(0.62 0.16 145)" }} />
        <h2 style={{ fontFamily: SERIF, fontSize: "1.35rem", color: HI, margin: 0 }}>Recently shipped</h2>
        <span style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO }}>
          · What actually got built this fortnight
        </span>
      </div>
      {RECENTLY_SHIPPED.map((s) => (
        <article
          key={s.id}
          data-testid={`todo-shipped-${s.id}`}
          style={{
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderLeft: `3px solid oklch(0.62 0.16 145)`,
            borderRadius: 4,
            padding: "1rem 1.15rem",
            marginBottom: "0.7rem",
          }}
        >
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: "0.5rem", marginBottom: "0.35rem" }}>
            <h3 style={{ fontFamily: SERIF, fontSize: "1rem", color: HI, margin: 0 }}>{s.title}</h3>
            <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: LO }}>{s.shippedAt}</span>
          </div>
          <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, margin: 0, lineHeight: 1.6 }}>
            {s.description}
          </p>
        </article>
      ))}
    </section>
  );
}

// ─── Main ──────────────────────────────────────────────────────────────
export default function Todo() {
  const grouped = groupByPriority(TODO);
  const totalOpen = TODO.filter((t) => t.status !== "done").length;
  const orderedPriorities: TodoPriority[] = ["p0", "p1", "p2", "blocked", "p3"];

  return (
    <div style={{ minHeight: "100vh", background: BG, paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.75rem" }}>
          <OwnologyLogo size={26} />
          <Link
            href="/"
            style={{ fontFamily: SANS, fontSize: "0.8rem", color: LO, textDecoration: "none", letterSpacing: "0.06em" }}
          >
            ownology.ai
          </Link>
          <span style={{ color: LO, fontSize: "0.75rem", marginLeft: "auto" }}>
            Last updated: <strong style={{ color: MID, fontFamily: MONO }}>{LAST_UPDATED}</strong>
          </span>
        </div>

        {/* Eyebrow */}
        <p
          data-testid="todo-eyebrow"
          style={{ color: AMBER, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: SANS, marginBottom: "0.6rem" }}
        >
          Internal roadmap · {totalOpen} open items
        </p>

        {/* Title */}
        <h1
          data-testid="todo-title"
          style={{ fontFamily: SERIF, fontSize: "clamp(2rem, 5vw, 3rem)", color: HI, lineHeight: 1.1, marginBottom: "1rem" }}
        >
          What we're building next.
        </h1>

        <p style={{ fontFamily: SANS, fontSize: "0.95rem", color: MID, lineHeight: 1.6, maxWidth: 640, marginBottom: "0.6rem" }}>
          The honest, blunt working roadmap. Includes known gaps, security items, and internal notes that aren't ready
          for public consumption. Members-only — anonymous visitors get redirected to <code style={{ fontFamily: MONO, fontSize: "0.85em", background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.4rem", borderRadius: 2 }}>/try</code>.
        </p>
        <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: LO, marginBottom: "2.25rem", lineHeight: 1.55 }}>
          When we're ready for a public roadmap, we'll build a sanitised customer-safe version at{" "}
          <code style={{ fontFamily: MONO, fontSize: "0.85em", background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.4rem", borderRadius: 2 }}>/public-roadmap</code>{" "}
          — see the "How to keep it fresh" note at the bottom.
        </p>

        {/* Priority bands */}
        {orderedPriorities.map((p) => (
          <PriorityBand key={p} priority={p} items={grouped[p]} />
        ))}

        {/* Recently shipped */}
        <ShippedSection />

        {/* Footer note */}
        <div
          style={{
            marginTop: "3rem",
            padding: "1rem 1.15rem",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            fontFamily: SANS,
            fontSize: "0.8rem",
            color: LO,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: HI }}>How this page stays fresh:</strong> the roadmap lives at{" "}
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.4rem", borderRadius: 2, fontSize: "0.75rem" }}>
            client/src/data/todoData.ts
          </code>{" "}
          in our codebase. Every time we ship, add, or reprioritise an item, that file gets edited and this page
          updates in the same deploy. No CMS, no drift, no aspirational fluff.
        </div>

        {/* Back to sandbox / pricing CTAs */}
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "2rem", flexWrap: "wrap" }}>
          <Link
            href="/try"
            data-testid="todo-cta-try"
            style={{
              background: AMBER,
              color: "white",
              padding: "0.7rem 1.3rem",
              borderRadius: 4,
              fontFamily: SANS,
              fontSize: "0.85rem",
              fontWeight: 700,
              textDecoration: "none",
            }}
          >
            Try the sandbox →
          </Link>
          <Link
            href="/pricing"
            data-testid="todo-cta-pricing"
            style={{
              color: MID,
              padding: "0.7rem 1rem",
              fontFamily: SANS,
              fontSize: "0.85rem",
              textDecoration: "none",
              borderBottom: `1px solid ${BORDER}`,
            }}
          >
            Reserve a Founding Member spot
          </Link>
        </div>
      </div>
    </div>
  );
}
