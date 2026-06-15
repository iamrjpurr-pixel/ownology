/**
 * AdminWbs — /admin/wbs
 * Owner-only page to manage the published status of DIY bible knowledge chunks.
 * Organised by WBS domain. Toggle individual chapters or entire domains.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";

const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'Fira Code', monospace";

const WBS_DOMAIN_LABELS: Record<string, string> = {
  "2": "Domain 2 — Harvest & Intake",
  "3": "Domain 3 — Crush & Pre-Fermentation",
  "4": "Domain 4 — Fermentation & Winemaking",
  "5": "Domain 5 — Cellar Operations & Ageing",
  "6": "Domain 6 — Stabilisation & Filtration",
  "7": "Domain 7 — Packaging & Dispatch",
  "8": "Domain 8 — Quality, Lab & Compliance",
};

const DOC_LABELS: Record<string, string> = {
  red_wine_bible: "Red Wine Bible",
  white_wine_bible: "White Wine Bible",
};

type ChapterGroup = {
  wbsDomain: string | null;
  wbsCode: string | null;
  chapterTitle: string | null;
  sourceDoc: string | null;
  totalChunks: number;
  publishedChunks: number;
  chunkIds: number[];
};

export default function AdminWbs() {
  const [expandedDomains, setExpandedDomains] = useState<Set<string>>(new Set(["4"]));
  const [pendingKey, setPendingKey] = useState<string | null>(null);

  const utils = trpc.useUtils();

  const { data: domains, isLoading, error } = trpc.wbsAdmin.listDomains.useQuery(undefined, {
    retry: false,
  });

  const { data: summary } = trpc.wbsAdmin.summary.useQuery(undefined, {
    retry: false,
  });

  const setChapterPublished = trpc.wbsAdmin.setChapterPublished.useMutation({
    onSuccess: () => {
      utils.wbsAdmin.listDomains.invalidate();
      utils.wbsAdmin.summary.invalidate();
      setPendingKey(null);
    },
    onError: () => setPendingKey(null),
  });

  const setDomainPublished = trpc.wbsAdmin.setDomainPublished.useMutation({
    onSuccess: () => {
      utils.wbsAdmin.listDomains.invalidate();
      utils.wbsAdmin.summary.invalidate();
      setPendingKey(null);
    },
    onError: () => setPendingKey(null),
  });

  // Auth guard — ownerProcedure returns UNAUTHORIZED if not logged in
  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized = error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");
  if (isForbidden || isUnauthorized) {
    return (
      <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: "1rem" }}>
        <p style={{ fontFamily: SANS, color: "oklch(0.75 0.013 75)" }}>
          {isForbidden ? "This page is restricted to the site owner." : "Please log in to access this page."}
        </p>
        {isUnauthorized && (
          <a href={getLoginUrl("/admin/wbs")} style={{ fontFamily: SANS, fontSize: "0.875rem", color: "var(--ow-amber)" }}>Log in →</a>
        )}
      </div>
    );
  }

  // Group chapters by domain
  const byDomain: Record<string, ChapterGroup[]> = {};
  for (const group of (domains ?? [])) {
    const domain = group.wbsDomain ?? "none";
    if (!byDomain[domain]) byDomain[domain] = [];
    byDomain[domain].push(group);
  }

  const domainKeys = Object.keys(byDomain).sort((a, b) => parseFloat(a) - parseFloat(b));

  function toggleDomainExpand(domain: string) {
    setExpandedDomains((prev) => {
      const next = new Set(prev);
      if (next.has(domain)) next.delete(domain);
      else next.add(domain);
      return next;
    });
  }

  function handleChapterToggle(group: ChapterGroup, published: boolean) {
    if (!group.chapterTitle || !group.sourceDoc) return;
    const key = `chapter::${group.chapterTitle}::${group.sourceDoc}`;
    setPendingKey(key);
    setChapterPublished.mutate({
      chapterTitle: group.chapterTitle,
      sourceDoc: group.sourceDoc,
      published,
    });
  }

  function handleDomainToggle(domain: string, published: boolean) {
    const key = `domain::${domain}`;
    setPendingKey(key);
    setDomainPublished.mutate({ wbsDomain: domain, published });
  }

  const isDomainFullyPublished = (groups: ChapterGroup[]) =>
    groups.every((g) => g.publishedChunks === g.totalChunks);
  const isDomainPartiallyPublished = (groups: ChapterGroup[]) =>
    groups.some((g) => g.publishedChunks > 0) && !isDomainFullyPublished(groups);

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100vh" }}>
      {/* Admin nav */}
      <nav
        style={{
          borderBottom: "1px solid oklch(1 0 0 / 0.08)",
          background: "var(--ow-bg-base)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div className="container" style={{ display: "flex", alignItems: "center", gap: "1.5rem", paddingTop: "1rem", paddingBottom: "1rem" }}>
          <Link href="/admin" style={{ fontFamily: SANS, fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>
            ← Admin
          </Link>
          <span style={{ color: "oklch(0.30 0.008 75)" }}>|</span>
          <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "var(--ow-amber)", letterSpacing: "0.04em" }}>
            WBS Knowledge Publisher
          </span>
        </div>
      </nav>

      <div className="container" style={{ paddingTop: "2.5rem", paddingBottom: "4rem", maxWidth: "860px" }}>
        {/* Header */}
        <div style={{ marginBottom: "2rem" }}>
          <h1
            style={{
              fontFamily: SERIF,
              fontWeight: 700,
              fontSize: "2rem",
              color: "var(--ow-text-hi)",
              marginBottom: "0.5rem",
            }}
          >
            WBS Knowledge Publisher
          </h1>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: "var(--ow-text-lo)", lineHeight: 1.6 }}>
            Control which bible chapters are visible in the DIY home winemaker tutor.
            Published chapters are retrieved when users ask questions. Unpublished chapters are hidden.
          </p>
        </div>

        {/* Summary bar */}
        {summary && (
          <div
            style={{
              display: "flex",
              gap: "1.5rem",
              flexWrap: "wrap",
              marginBottom: "2rem",
              padding: "1rem 1.25rem",
              background: "var(--ow-bg-raised)",
              border: "1px solid color-mix(in oklch, var(--ow-amber) 15%, transparent)",
              borderRadius: "4px",
            }}
          >
            <div>
              <p style={{ fontFamily: MONO, fontSize: "1.5rem", color: "var(--ow-amber)", margin: 0 }}>{summary.total}</p>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "oklch(0.48 0.010 75)", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>Total chunks</p>
            </div>
            <div>
              <p style={{ fontFamily: MONO, fontSize: "1.5rem", color: "oklch(0.60 0.14 145)", margin: 0 }}>{summary.published}</p>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "oklch(0.48 0.010 75)", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>Published</p>
            </div>
            <div>
              <p style={{ fontFamily: MONO, fontSize: "1.5rem", color: "var(--ow-text-lo)", margin: 0 }}>{summary.unpublished}</p>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "oklch(0.48 0.010 75)", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>Unpublished</p>
            </div>
            {Object.entries(summary.byDoc).map(([doc, counts]) => (
              <div key={doc}>
                <p style={{ fontFamily: MONO, fontSize: "1.5rem", color: "var(--ow-text-mid)", margin: 0 }}>
                  {counts.published}/{counts.total}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: "oklch(0.48 0.010 75)", margin: 0, letterSpacing: "0.06em", textTransform: "uppercase" }}>
                  {DOC_LABELS[doc] ?? doc}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Loading / error */}
        {isLoading && (
          <p style={{ fontFamily: SANS, color: "var(--ow-text-lo)", fontStyle: "italic" }}>Loading knowledge map…</p>
        )}
        {error && (
          <div style={{ padding: "1rem", background: "oklch(0.55 0.12 30 / 12%)", border: "1px solid oklch(0.55 0.12 30 / 35%)", borderRadius: "4px" }}>
            <p style={{ fontFamily: SANS, color: "oklch(0.75 0.08 30)", fontSize: "0.875rem" }}>
              {error.message.includes("FORBIDDEN") ? "Owner access required." : `Error: ${error.message}`}
            </p>
          </div>
        )}

        {/* Domain accordion */}
        {domainKeys.map((domain) => {
          const groups = byDomain[domain];
          const isExpanded = expandedDomains.has(domain);
          const fullyPublished = isDomainFullyPublished(groups);
          const partiallyPublished = isDomainPartiallyPublished(groups);
          const domainLabel = WBS_DOMAIN_LABELS[domain] ?? `Domain ${domain}`;
          const domainPendingKey = `domain::${domain}`;
          const isDomainPending = pendingKey === domainPendingKey;

          return (
            <div
              key={domain}
              style={{
                marginBottom: "0.75rem",
                border: `1px solid ${fullyPublished ? "oklch(0.60 0.14 145 / 30%)" : partiallyPublished ? "color-mix(in oklch, var(--ow-amber) 25%, transparent)" : "oklch(1 0 0 / 0.08)"}`,
                borderRadius: "4px",
                overflow: "hidden",
              }}
            >
              {/* Domain header */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "0.875rem 1.25rem",
                  background: "var(--ow-bg-raised)",
                  cursor: "pointer",
                  gap: "1rem",
                }}
                onClick={() => toggleDomainExpand(domain)}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", flex: 1 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: "0.7rem",
                      color: fullyPublished ? "oklch(0.60 0.14 145)" : partiallyPublished ? "var(--ow-amber)" : "oklch(0.40 0.008 75)",
                      letterSpacing: "0.04em",
                      background: fullyPublished ? "oklch(0.60 0.14 145 / 12%)" : partiallyPublished ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "oklch(1 0 0 / 0.05)",
                      border: `1px solid ${fullyPublished ? "oklch(0.60 0.14 145 / 30%)" : partiallyPublished ? "color-mix(in oklch, var(--ow-amber) 25%, transparent)" : "oklch(1 0 0 / 0.08)"}`,
                      borderRadius: "2px",
                      padding: "0.15rem 0.5rem",
                    }}
                  >
                    {fullyPublished ? "LIVE" : partiallyPublished ? "PARTIAL" : "HIDDEN"}
                  </span>
                  <span style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.875rem", color: "var(--ow-text-hi)" }}>
                    {domainLabel}
                  </span>
                  <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
                    {groups.reduce((s, g) => s + g.publishedChunks, 0)}/{groups.reduce((s, g) => s + g.totalChunks, 0)} chunks published
                  </span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                  {/* Domain bulk toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDomainToggle(domain, !fullyPublished);
                    }}
                    disabled={isDomainPending}
                    style={{
                      padding: "0.3rem 0.75rem",
                      background: fullyPublished ? "oklch(0.55 0.12 30 / 15%)" : "oklch(0.60 0.14 145 / 15%)",
                      border: `1px solid ${fullyPublished ? "oklch(0.55 0.12 30 / 35%)" : "oklch(0.60 0.14 145 / 35%)"}`,
                      borderRadius: "2px",
                      cursor: isDomainPending ? "not-allowed" : "pointer",
                      fontFamily: SANS,
                      fontSize: "0.72rem",
                      fontWeight: 600,
                      color: fullyPublished ? "oklch(0.75 0.08 30)" : "oklch(0.60 0.14 145)",
                      letterSpacing: "0.04em",
                      opacity: isDomainPending ? 0.5 : 1,
                    }}
                  >
                    {isDomainPending ? "…" : fullyPublished ? "Unpublish All" : "Publish All"}
                  </button>
                  <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: "oklch(0.40 0.008 75)" }}>
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>
              </div>

              {/* Chapter rows */}
              {isExpanded && (
                <div style={{ background: "var(--ow-bg-base)" }}>
                  {groups.map((group) => {
                    const chKey = `chapter::${group.chapterTitle}::${group.sourceDoc}`;
                    const isChapterPublished = group.publishedChunks === group.totalChunks;
                    const isChapterPending = pendingKey === chKey;
                    const docLabel = DOC_LABELS[group.sourceDoc ?? ""] ?? group.sourceDoc ?? "";

                    return (
                      <div
                        key={chKey}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "space-between",
                          padding: "0.75rem 1.25rem 0.75rem 2rem",
                          borderTop: "1px solid oklch(1 0 0 / 0.05)",
                          gap: "1rem",
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "oklch(0.75 0.013 75)", margin: 0, marginBottom: "0.2rem" }}>
                            {group.chapterTitle ?? "Unknown chapter"}
                          </p>
                          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
                            <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ow-text-lo)" }}>
                              WBS {group.wbsCode ?? "—"}
                            </span>
                            <span style={{ fontFamily: SANS, fontSize: "0.68rem", color: "oklch(0.40 0.008 75)" }}>
                              {docLabel}
                            </span>
                            <span style={{ fontFamily: SANS, fontSize: "0.68rem", color: "oklch(0.40 0.008 75)" }}>
                              {group.publishedChunks}/{group.totalChunks} chunks
                            </span>
                          </div>
                        </div>

                        {/* Toggle switch */}
                        <button
                          onClick={() => handleChapterToggle(group, !isChapterPublished)}
                          disabled={isChapterPending}
                          aria-label={isChapterPublished ? "Unpublish chapter" : "Publish chapter"}
                          style={{
                            width: "44px",
                            height: "24px",
                            borderRadius: "12px",
                            background: isChapterPublished ? "oklch(0.60 0.14 145)" : "oklch(0.25 0.008 60)",
                            border: `1px solid ${isChapterPublished ? "oklch(0.60 0.14 145)" : "oklch(1 0 0 / 0.15)"}`,
                            cursor: isChapterPending ? "not-allowed" : "pointer",
                            position: "relative",
                            transition: "background 0.2s ease",
                            flexShrink: 0,
                            opacity: isChapterPending ? 0.5 : 1,
                          }}
                        >
                          <span
                            style={{
                              position: "absolute",
                              top: "3px",
                              left: isChapterPublished ? "22px" : "3px",
                              width: "16px",
                              height: "16px",
                              borderRadius: "50%",
                              background: "var(--ow-text-hi)",
                              transition: "left 0.2s ease",
                            }}
                          />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}

        {/* White Wine Bible note */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem 1.25rem",
            background: "var(--ow-bg-raised)",
            border: "1px dashed color-mix(in oklch, var(--ow-amber) 20%, transparent)",
            borderRadius: "4px",
          }}
        >
          <p style={{ fontFamily: SANS, fontWeight: 600, fontSize: "0.8rem", color: "var(--ow-amber)", marginBottom: "0.375rem" }}>
            White Wine Bible — ingested
          </p>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.78rem", color: "oklch(0.48 0.010 75)", lineHeight: 1.6, margin: 0 }}>
            White Wine Bible (127 chunks) and MoreWine! White Outline (7 sections) are published and active.
          </p>
        </div>

        {/* Ghost Questions section */}
        <GhostQuestionsPanel />
      </div>
    </div>
  );
}

function GhostQuestionsPanel() {
  const [wbsFilter, setWbsFilter] = useState("");
  const [wineTypeFilter, setWineTypeFilter] = useState("");
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const { data: summary } = trpc.wbsAdmin.ghostQuestionsSummary.useQuery(undefined, { retry: false });
  const { data, isLoading } = trpc.wbsAdmin.listGhostQuestions.useQuery(
    {
      wbsCode: wbsFilter || undefined,
      wineType: wineTypeFilter || undefined,
      limit: PAGE_SIZE,
      offset: page * PAGE_SIZE,
    },
    { retry: false }
  );

  const SERIF = "'Fraunces', serif";
  const SANS = "'Lato', sans-serif";
  const MONO = "'Fira Code', monospace";

  const totalPages = data ? Math.ceil(data.total / PAGE_SIZE) : 0;
  const uniqueWbsCodes = summary ? Array.from(new Set(summary.map((s) => s.wbsCode))).sort() : [];

  return (
    <div style={{ marginTop: "3rem" }}>
      <div style={{ marginBottom: "1.5rem", borderTop: "1px solid var(--ow-border-md)", paddingTop: "2rem" }}>
        <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "1.4rem", color: "var(--ow-text-hi)", marginBottom: "0.4rem" }}>
          Ghost Questions
        </h2>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.85rem", color: "var(--ow-text-lo)", lineHeight: 1.6, margin: 0 }}>
          {summary ? `${summary.reduce((a, s) => a + Number(s.cnt), 0)} AI-generated questions` : "Loading..."} mapped to WBS nodes.
          These questions will surface contextually as users progress through the home winemaking journey.
        </p>
      </div>

      {/* Summary pills */}
      {summary && (
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <button
            onClick={() => { setWbsFilter(""); setWineTypeFilter(""); setPage(0); }}
            style={{
              padding: "0.3rem 0.75rem",
              borderRadius: "2px",
              border: `1px solid ${!wbsFilter && !wineTypeFilter ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
              background: !wbsFilter && !wineTypeFilter ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "transparent",
              color: !wbsFilter && !wineTypeFilter ? "var(--ow-amber)" : "var(--ow-text-lo)",
              fontFamily: MONO,
              fontSize: "0.72rem",
              cursor: "pointer",
            }}
          >
            All ({summary.reduce((a, s) => a + Number(s.cnt), 0)})
          </button>
          {["red", "white"].map((wt) => {
            const cnt = summary.filter((s) => s.wineType === wt).reduce((a, s) => a + Number(s.cnt), 0);
            return (
              <button
                key={wt}
                onClick={() => { setWineTypeFilter(wineTypeFilter === wt ? "" : wt); setPage(0); }}
                style={{
                  padding: "0.3rem 0.75rem",
                  borderRadius: "2px",
                  border: `1px solid ${wineTypeFilter === wt ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
                  background: wineTypeFilter === wt ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "transparent",
                  color: wineTypeFilter === wt ? "var(--ow-amber)" : "var(--ow-text-lo)",
                  fontFamily: MONO,
                  fontSize: "0.72rem",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {wt} ({cnt})
              </button>
            );
          })}
        </div>
      )}

      {/* WBS code filter */}
      <div style={{ marginBottom: "1rem", display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <select
          value={wbsFilter}
          onChange={(e) => { setWbsFilter(e.target.value); setPage(0); }}
          style={{
            fontFamily: MONO,
            fontSize: "0.78rem",
            padding: "0.4rem 0.75rem",
            background: "var(--ow-bg-raised)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: "2px",
            color: "var(--ow-text-mid)",
            cursor: "pointer",
          }}
        >
          <option value="">All WBS nodes</option>
          {uniqueWbsCodes.map((code) => (
            <option key={code} value={code}>{code}</option>
          ))}
        </select>
        {data && (
          <span style={{ fontFamily: SANS, fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
            {data.total} question{data.total !== 1 ? "s" : ""}
          </span>
        )}
      </div>

      {/* Questions list */}
      {isLoading ? (
        <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--ow-text-lo)" }}>Loading questions...</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
          {(data?.questions ?? []).map((q, i) => (
            <div
              key={q.id}
              style={{
                display: "flex",
                gap: "1rem",
                padding: "0.6rem 0",
                borderBottom: "1px solid var(--ow-border-lo)",
                alignItems: "flex-start",
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: "0.68rem", color: "var(--ow-amber)", minWidth: "48px", paddingTop: "2px" }}>
                {q.wbsCode}
              </span>
              <span
                style={{
                  fontFamily: SANS,
                  fontWeight: 300,
                  fontSize: "0.82rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.5,
                  flex: 1,
                }}
              >
                {q.question}
              </span>
              <span
                style={{
                  fontFamily: MONO,
                  fontSize: "0.65rem",
                  color: q.wineType === "red" ? "oklch(0.55 0.12 30)" : q.wineType === "white" ? "oklch(0.65 0.10 220)" : "var(--ow-text-lo)",
                  minWidth: "40px",
                  textAlign: "right",
                  paddingTop: "2px",
                }}
              >
                {q.wineType}
              </span>
            </div>
          ))}
          {(data?.questions ?? []).length === 0 && (
            <p style={{ fontFamily: SANS, fontSize: "0.85rem", color: "var(--ow-text-lo)", padding: "1rem 0" }}>No questions found.</p>
          )}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "1.25rem", alignItems: "center" }}>
          <button
            disabled={page === 0}
            onClick={() => setPage((p) => p - 1)}
            style={{ fontFamily: MONO, fontSize: "0.75rem", padding: "0.3rem 0.75rem", background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border-md)", borderRadius: "2px", color: page === 0 ? "var(--ow-text-lo)" : "var(--ow-text-mid)", cursor: page === 0 ? "default" : "pointer" }}
          >
            ← Prev
          </button>
          <span style={{ fontFamily: MONO, fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
            {page + 1} / {totalPages}
          </span>
          <button
            disabled={page >= totalPages - 1}
            onClick={() => setPage((p) => p + 1)}
            style={{ fontFamily: MONO, fontSize: "0.75rem", padding: "0.3rem 0.75rem", background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border-md)", borderRadius: "2px", color: page >= totalPages - 1 ? "var(--ow-text-lo)" : "var(--ow-text-mid)", cursor: page >= totalPages - 1 ? "default" : "pointer" }}
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
