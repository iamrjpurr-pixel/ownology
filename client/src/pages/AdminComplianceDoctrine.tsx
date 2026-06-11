/**
 * OWNOLOGY — /admin/compliance-doctrine
 * Owner-only read-only view of the Q&A Doctrine Map.
 * Shows all canonical Q&A entries grouped by topic, with jurisdiction badges,
 * keywords, citations, and last-verified dates.
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Jurisdiction badge colours ───────────────────────────────────────────────

const JURISDICTION_COLOURS: Record<string, string> = {
  Federal: "oklch(0.55 0.15 260)",
  SA: "oklch(0.55 0.15 30)",
  VIC: "oklch(0.50 0.15 145)",
  NSW: "oklch(0.55 0.15 220)",
  WA: "oklch(0.55 0.15 310)",
  QLD: "oklch(0.55 0.15 55)",
  TAS: "oklch(0.50 0.15 190)",
  NZ: "oklch(0.50 0.15 0)",
  All: "oklch(0.55 0.12 75)",
};

function JurisdictionBadge({ j }: { j: string }) {
  const bg = JURISDICTION_COLOURS[j] ?? "oklch(0.45 0.05 75)";
  return (
    <span
      className="inline-block px-2 py-0.5 rounded-sm text-xs font-medium"
      style={{
        background: `${bg}22`,
        color: bg,
        border: `1px solid ${bg}44`,
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.65rem",
        letterSpacing: "0.08em",
        textTransform: "uppercase",
      }}
    >
      {j}
    </span>
  );
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)" }}>
      <div
        className="w-8 h-8 rounded-full border-2 animate-spin"
        style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }}
      />
    </div>
  );
}

// ─── Access denied ────────────────────────────────────────────────────────────

function AccessDenied({ isForbidden }: { isForbidden: boolean }) {
  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center gap-6"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
    >
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: "oklch(0.72 0.12 75 / 12%)", color: "var(--ow-amber)" }}
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      </div>
      <div className="text-center">
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "1.5rem",
            color: "var(--ow-text-hi)",
            marginBottom: "0.5rem",
          }}
        >
          {isForbidden ? "Owner access required" : "Sign in required"}
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", fontSize: "0.9rem" }}>
          {isForbidden
            ? "This page is restricted to the site owner."
            : "Please sign in to access the admin panel."}
        </p>
      </div>
      {!isForbidden && (
        <a
          href={getLoginUrl()}
          className="px-6 py-2.5 rounded-sm text-sm font-medium"
          style={{
            background: "var(--ow-amber)",
            color: "oklch(0.12 0.01 60)",
            fontFamily: "'Lato',sans-serif",
            textDecoration: "none",
          }}
        >
          Sign in
        </a>
      )}
      <Link href="/admin">
        <a style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>
          ← Back to admin
        </a>
      </Link>
    </div>
  );
}

// ─── Entry card ───────────────────────────────────────────────────────────────

type DoctrineEntry = {
  id: string;
  topic: string;
  jurisdiction: string;
  question: string;
  keywords: string[];
  answer: string;
  citations: { title: string; section: string | null; jurisdiction: string; url: string | null }[];
  lastVerified: string;
};

function EntryCard({ entry, index }: { entry: DoctrineEntry; index: number }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      className="rounded-sm"
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
      }}
    >
      {/* Header row — always visible */}
      <button
        className="w-full text-left px-5 py-4 flex items-start gap-4"
        onClick={() => setExpanded((v) => !v)}
        style={{ background: "transparent", border: "none", cursor: "pointer" }}
      >
        {/* Index */}
        <span
          className="flex-shrink-0 w-7 h-7 rounded-sm flex items-center justify-center text-xs font-mono mt-0.5"
          style={{
            background: "oklch(0.72 0.12 75 / 10%)",
            color: "var(--ow-amber)",
            fontFamily: "'Fira Code',monospace",
            fontSize: "0.65rem",
          }}
        >
          {String(index + 1).padStart(2, "0")}
        </span>

        {/* Question + badges */}
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1.5">
            <JurisdictionBadge j={entry.jurisdiction} />
            <span
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.65rem",
                color: "var(--ow-text-lo)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {entry.topic}
            </span>
          </div>
          <p
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 600,
              fontSize: "0.95rem",
              color: "var(--ow-text-hi)",
              lineHeight: 1.4,
            }}
          >
            {entry.question}
          </p>
        </div>

        {/* Expand chevron */}
        <svg
          width="16"
          height="16"
          viewBox="0 0 16 16"
          fill="none"
          className="flex-shrink-0 mt-1"
          style={{
            color: "var(--ow-text-lo)",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s",
          }}
        >
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Expanded body */}
      {expanded && (
        <div
          className="px-5 pb-5"
          style={{ borderTop: "1px solid var(--ow-border)" }}
        >
          {/* Answer */}
          <div className="pt-4">
            <p
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.65rem",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "var(--ow-amber)",
                marginBottom: "0.5rem",
              }}
            >
              Canonical Answer
            </p>
            <div
              className="rounded-sm p-4"
              style={{
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-border)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontSize: "0.85rem",
                  lineHeight: 1.7,
                  color: "var(--ow-text-mid)",
                  whiteSpace: "pre-wrap",
                }}
              >
                {entry.answer}
              </p>
            </div>
          </div>

          {/* Citations */}
          {entry.citations.length > 0 && (
            <div className="pt-4">
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber)",
                  marginBottom: "0.5rem",
                }}
              >
                Citations ({entry.citations.length})
              </p>
              <div className="flex flex-col gap-2">
                {entry.citations.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 rounded-sm px-4 py-3"
                    style={{
                      background: "var(--ow-bg-raised)",
                      border: "1px solid var(--ow-border)",
                    }}
                  >
                    <span
                      className="flex-shrink-0 w-5 h-5 rounded-sm flex items-center justify-center text-xs"
                      style={{
                        background: "oklch(0.72 0.12 75 / 12%)",
                        color: "var(--ow-amber)",
                        fontFamily: "'Fira Code',monospace",
                        fontSize: "0.6rem",
                      }}
                    >
                      {i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-0.5">
                        <JurisdictionBadge j={c.jurisdiction} />
                        {c.url ? (
                          <a
                            href={c.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontFamily: "'Lato',sans-serif",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "var(--ow-amber)",
                              textDecoration: "none",
                            }}
                            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = "underline")}
                            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.textDecoration = "none")}
                          >
                            {c.title} ↗
                          </a>
                        ) : (
                          <span
                            style={{
                              fontFamily: "'Lato',sans-serif",
                              fontWeight: 600,
                              fontSize: "0.8rem",
                              color: "var(--ow-text-hi)",
                            }}
                          >
                            {c.title}
                          </span>
                        )}
                      </div>
                      {c.section && (
                        <p
                          style={{
                            fontFamily: "'Fira Code',monospace",
                            fontSize: "0.7rem",
                            color: "var(--ow-text-lo)",
                            lineHeight: 1.4,
                          }}
                        >
                          {c.section}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Keywords + metadata row */}
          <div className="pt-4 flex flex-wrap items-start gap-6">
            <div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ow-text-lo)",
                  marginBottom: "0.4rem",
                }}
              >
                Keywords
              </p>
              <div className="flex flex-wrap gap-1.5">
                {entry.keywords.map((kw) => (
                  <span
                    key={kw}
                    className="px-2 py-0.5 rounded-sm text-xs"
                    style={{
                      background: "var(--ow-bg-raised)",
                      border: "1px solid var(--ow-border)",
                      color: "var(--ow-text-lo)",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.65rem",
                    }}
                  >
                    {kw}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ow-text-lo)",
                  marginBottom: "0.4rem",
                }}
              >
                Entry ID
              </p>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  color: "var(--ow-text-lo)",
                }}
              >
                {entry.id}
              </span>
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.65rem",
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "var(--ow-text-lo)",
                  marginBottom: "0.4rem",
                }}
              >
                Last Verified
              </p>
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  color: "var(--ow-text-lo)",
                }}
              >
                {entry.lastVerified}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminComplianceDoctrine() {
  const { data, isLoading, error } = trpc.admin.complianceDoctrine.useQuery();
  const [selectedTopic, setSelectedTopic] = useState<string>("All Topics");
  const [search, setSearch] = useState("");

  if (isLoading) return <Spinner />;

  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized =
    error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");

  if (isForbidden || isUnauthorized) {
    return <AccessDenied isForbidden={isForbidden} />;
  }

  const topics = ["All Topics", ...(data?.topics ?? [])];
  const allEntries = data?.entries ?? [];

  const filtered = allEntries.filter((e) => {
    const matchesTopic = selectedTopic === "All Topics" || e.topic === selectedTopic;
    const q = search.toLowerCase();
    const matchesSearch =
      !q ||
      e.question.toLowerCase().includes(q) ||
      e.answer.toLowerCase().includes(q) ||
      e.keywords.some((k) => k.toLowerCase().includes(q)) ||
      e.id.toLowerCase().includes(q);
    return matchesTopic && matchesSearch;
  });

  // Group filtered entries by topic
  const grouped: Record<string, typeof filtered> = {};
  for (const e of filtered) {
    if (!grouped[e.topic]) grouped[e.topic] = [];
    grouped[e.topic].push(e);
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ow-border)" }}>
        <div className="container py-6">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <a style={{ textDecoration: "none" }}>
                  <OwnologyLogo size={32} />
                </a>
              </Link>
              <div style={{ width: "1px", height: "28px", background: "var(--ow-border-md)" }} />
              <div>
                <p
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.65rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ow-amber)",
                  }}
                >
                  Admin · Compliance
                </p>
                <h1
                  style={{
                    fontFamily: "'Fraunces',serif",
                    fontWeight: 700,
                    fontSize: "clamp(1.2rem,2.5vw,1.6rem)",
                    color: "var(--ow-text-hi)",
                    lineHeight: 1.1,
                  }}
                >
                  Q&A <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Doctrine Map</em>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                style={{
                  fontFamily: "'Fira Code',monospace",
                  fontSize: "0.7rem",
                  color: "var(--ow-text-lo)",
                  letterSpacing: "0.04em",
                }}
              >
                {filtered.length} / {allEntries.length} entries
              </span>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ borderBottom: "1px solid var(--ow-border)", background: "var(--ow-bg-raised)" }}>
        <div className="container py-4">
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1" style={{ minWidth: "220px", maxWidth: "400px" }}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: "var(--ow-text-lo)" }}
              >
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
              </svg>
              <input
                type="text"
                placeholder="Search questions, answers, keywords…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-sm text-sm"
                style={{
                  background: "var(--ow-bg-card)",
                  border: "1px solid var(--ow-border)",
                  color: "var(--ow-text-hi)",
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.85rem",
                  outline: "none",
                }}
              />
            </div>

            {/* Topic filter pills */}
            <div className="flex flex-wrap gap-2">
              {topics.map((t) => (
                <button
                  key={t}
                  onClick={() => setSelectedTopic(t)}
                  className="px-3 py-1.5 rounded-sm text-xs transition-colors"
                  style={{
                    background: selectedTopic === t ? "var(--ow-amber)" : "var(--ow-bg-card)",
                    color: selectedTopic === t ? "oklch(0.12 0.01 60)" : "var(--ow-text-mid)",
                    border: `1px solid ${selectedTopic === t ? "var(--ow-amber)" : "var(--ow-border)"}`,
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.72rem",
                    letterSpacing: "0.04em",
                    cursor: "pointer",
                  }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container py-8">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4"
            style={{ color: "var(--ow-text-lo)" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.35-4.35" />
            </svg>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>
              No entries match your search.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-10">
            {Object.entries(grouped).map(([topic, entries]) => (
              <section key={topic}>
                {/* Topic heading */}
                <div className="flex items-center gap-3 mb-4">
                  <h2
                    style={{
                      fontFamily: "'Fraunces',serif",
                      fontWeight: 700,
                      fontSize: "1.1rem",
                      color: "var(--ow-text-hi)",
                    }}
                  >
                    {topic}
                  </h2>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs"
                    style={{
                      background: "oklch(0.72 0.12 75 / 12%)",
                      color: "var(--ow-amber)",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.65rem",
                    }}
                  >
                    {entries.length}
                  </span>
                  <div className="flex-1 h-px" style={{ background: "var(--ow-border)" }} />
                </div>

                {/* Entry cards */}
                <div className="flex flex-col gap-2">
                  {entries.map((entry, i) => (
                    <EntryCard
                      key={entry.id}
                      entry={entry}
                      index={allEntries.findIndex((e) => e.id === entry.id)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <div
        className="container py-6"
        style={{ borderTop: "1px solid var(--ow-border)" }}
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.75rem",
              color: "var(--ow-text-lo)",
            }}
          >
            {allEntries.length} canonical Q&A entries across {data?.topics.length ?? 0} topic areas.
            This doctrine map is injected into the Compliance Assistant system prompt.
          </p>
          <Link href="/admin">
            <a
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.75rem",
                color: "var(--ow-text-lo)",
                textDecoration: "none",
              }}
            >
              ← Back to admin hub
            </a>
          </Link>
        </div>
      </div>
    </div>
  );
}
