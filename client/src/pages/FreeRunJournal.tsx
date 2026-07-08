/**
 * /free-run/journal — the user's private archive of Divine Trinity
 * reveals. Every paid reveal (and the one free "hook" reveal) is stored
 * permanently against their account; this page lets them come back and
 * re-read any of it.
 *
 * Design goal: turn "$0.25 per question" into "$0.25 per permanent,
 * searchable, ownable answer" — that's the value story the credit
 * packs need to justify themselves.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Reveal = {
  id: number;
  question: string;
  topicTag: string | null;
  surfaceAnswer: string;
  sciencePanel: string | null;
  vineyardPanel: string | null;
  craftPanel: string | null;
  wasFreeHook: boolean;
  createdAt: number;
};

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function FreeRunJournal() {
  const { data, isLoading, error } = trpc.freeRun.listMyReveals.useQuery();
  const reveals: Reveal[] = (data?.reveals ?? []) as Reveal[];
  const [q, setQ] = useState("");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Client-side filter — cheap over ≤200 rows, no need to hit the server.
  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return reveals;
    return reveals.filter(
      (r) =>
        r.question.toLowerCase().includes(needle) ||
        (r.topicTag ?? "").toLowerCase().includes(needle),
    );
  }, [reveals, q]);

  // Group by month for a diary-style scan.
  const groups = useMemo(() => {
    const map = new Map<string, Reveal[]>();
    for (const r of filtered) {
      const d = new Date(r.createdAt);
      const key = d.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries());
  }, [filtered]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", color: "var(--ow-text-hi)", padding: "2rem 1rem 6rem" }}>
      <div style={{ maxWidth: 900, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-baseline justify-between mb-6 flex-wrap gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}>
              Free Run · My Journal
            </p>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: "0.25rem 0 0", lineHeight: 1.1 }}>
              Every reveal you've ever unlocked.
            </h1>
            <p className="text-sm mt-3" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", maxWidth: 620, lineHeight: 1.6 }}>
              Your paid Divine Trinity reveals are stored here forever — searchable,
              re-readable, yours. Credits never expire; neither do the answers they
              unlock.
            </p>
          </div>
          <Link
            href="/ask"
            data-testid="journal-back-to-ask"
            style={{
              padding: "0.5rem 1rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            + Ask something new
          </Link>
        </div>

        {/* Search */}
        {reveals.length > 3 && (
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search your journal…"
            data-testid="journal-search"
            style={{
              width: "100%",
              padding: "0.7rem 0.9rem",
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              color: "var(--ow-text-hi)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.9rem",
              marginBottom: "1.5rem",
            }}
          />
        )}

        {/* States */}
        {isLoading && (
          <p style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}>
            Loading your journal…
          </p>
        )}
        {error && (
          <div
            data-testid="journal-error"
            style={{
              padding: "1rem",
              background: "color-mix(in oklch, #dc2626 12%, transparent)",
              border: "1px solid color-mix(in oklch, #dc2626 30%, transparent)",
              borderRadius: 6,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.9rem",
              color: "#dc2626",
            }}
          >
            Couldn't load journal — {error.message}
          </div>
        )}
        {!isLoading && !error && reveals.length === 0 && (
          <EmptyState />
        )}

        {/* Reveals grouped by month */}
        {groups.map(([month, items]) => (
          <div key={month} style={{ marginBottom: "2rem" }}>
            <p
              className="text-xs uppercase tracking-widest"
              style={{
                fontFamily: "'Lato',sans-serif",
                color: "var(--ow-text-lo)",
                marginBottom: "0.75rem",
                paddingBottom: "0.5rem",
                borderBottom: "1px solid var(--ow-border)",
              }}
            >
              {month} · {items.length} reveal{items.length === 1 ? "" : "s"}
            </p>
            {items.map((r) => (
              <RevealCard
                key={r.id}
                reveal={r}
                open={expandedId === r.id}
                onToggle={() => setExpandedId((cur) => (cur === r.id ? null : r.id))}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div
      data-testid="journal-empty"
      style={{
        border: "1px dashed var(--ow-border)",
        borderRadius: 6,
        padding: "3rem 1.5rem",
        textAlign: "center",
        fontFamily: "'Lato',sans-serif",
        color: "var(--ow-text-lo)",
      }}
    >
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", color: "var(--ow-text-hi)", marginBottom: "0.75rem" }}>
        Your journal is empty — for now.
      </p>
      <p style={{ fontSize: "0.9rem", lineHeight: 1.6, maxWidth: 500, margin: "0 auto 1.5rem" }}>
        Ask a curiosity question on Free Run, then unlock the Divine Trinity
        (The Science, The Vineyard, The Craft). Your first reveal is on the
        house — every reveal after that lives here forever.
      </p>
      <Link
        href="/ask"
        style={{
          display: "inline-block",
          padding: "0.6rem 1.4rem",
          background: "var(--ow-amber)",
          color: "oklch(0.10 0.008 60)",
          borderRadius: 4,
          fontFamily: "'Lato',sans-serif",
          fontWeight: 700,
          fontSize: "0.9rem",
          textDecoration: "none",
        }}
      >
        Ask your first question →
      </Link>
    </div>
  );
}

function RevealCard({
  reveal,
  open,
  onToggle,
}: {
  reveal: Reveal;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      data-testid={`journal-reveal-${reveal.id}`}
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
        borderRadius: 6,
        marginBottom: "0.75rem",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        data-testid={`journal-toggle-${reveal.id}`}
        style={{
          width: "100%",
          textAlign: "left",
          padding: "1rem 1.1rem",
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--ow-text-hi)",
          fontFamily: "'Lato',sans-serif",
        }}
      >
        <div className="flex items-baseline justify-between gap-3 flex-wrap">
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", margin: 0, lineHeight: 1.4, flex: 1, minWidth: 260 }}>
            {reveal.question}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0" style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
            {reveal.topicTag && (
              <span
                style={{
                  padding: "0.15rem 0.55rem",
                  borderRadius: 999,
                  background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                  color: "var(--ow-amber)",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  fontWeight: 700,
                  fontSize: "0.65rem",
                }}
              >
                {reveal.topicTag}
              </span>
            )}
            {reveal.wasFreeHook && (
              <span style={{ color: "#16a34a", fontSize: "0.7rem", fontWeight: 700 }}>
                FREE
              </span>
            )}
            <span>{formatDate(reveal.createdAt)}</span>
            <span aria-hidden style={{ marginLeft: "0.25rem" }}>
              {open ? "▾" : "▸"}
            </span>
          </div>
        </div>
      </button>

      {open && (
        <div style={{ padding: "0 1.1rem 1.25rem", borderTop: "1px solid var(--ow-border)", fontFamily: "'Lato',sans-serif" }}>
          {reveal.surfaceAnswer && (
            <Section title="The surface answer" body={reveal.surfaceAnswer} />
          )}
          {reveal.sciencePanel && (
            <Section title="The Science" body={reveal.sciencePanel} />
          )}
          {reveal.vineyardPanel && (
            <Section title="The Vineyard" body={reveal.vineyardPanel} />
          )}
          {reveal.craftPanel && (
            <Section title="The Craft" body={reveal.craftPanel} />
          )}
        </div>
      )}
    </div>
  );
}

function Section({ title, body }: { title: string; body: string }) {
  return (
    <div style={{ marginTop: "1.1rem" }}>
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.68rem",
          color: "var(--ow-amber)",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          marginBottom: "0.4rem",
          fontWeight: 700,
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.9rem",
          color: "var(--ow-text-mid)",
          lineHeight: 1.7,
          whiteSpace: "pre-wrap",
          margin: 0,
        }}
      >
        {body}
      </p>
    </div>
  );
}
