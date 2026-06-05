/**
 * OWNOLOGY — /admin/leads
 * Owner-only CRM page. Shows every email sign-up captured from any page,
 * with source tag, date, inline notes editing, manual add, and CSV export.
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface Lead {
  id: number;
  email: string;
  source: string;
  tags: string[];
  name: string | null;
  wineryName: string | null;
  notes: string | null;
  createdAt: number;
  updatedAt: number;
}

// ─── Source badge colours ─────────────────────────────────────────────────────

const SOURCE_COLOURS: Record<string, string> = {
  preview: "oklch(0.72 0.12 75 / 20%)",
  pricing: "oklch(0.55 0.18 250 / 20%)",
  event: "oklch(0.55 0.18 150 / 20%)",
  blog: "oklch(0.55 0.18 320 / 20%)",
  manual: "oklch(0.55 0.02 75 / 20%)",
  unknown: "oklch(0.4 0.01 75 / 20%)",
};

const SOURCE_TEXT: Record<string, string> = {
  preview: "oklch(0.72 0.12 75)",
  pricing: "oklch(0.65 0.18 250)",
  event: "oklch(0.65 0.18 150)",
  blog: "oklch(0.65 0.18 320)",
  manual: "oklch(0.65 0.02 75)",
  unknown: "oklch(0.55 0.01 75)",
};

function sourceBg(source: string) {
  return SOURCE_COLOURS[source] ?? SOURCE_COLOURS.unknown;
}
function sourceText(source: string) {
  return SOURCE_TEXT[source] ?? SOURCE_TEXT.unknown;
}

// ─── CSV export ───────────────────────────────────────────────────────────────

function exportCsv(leads: Lead[]) {
  const header = ["ID", "Email", "Source", "Tags", "Name", "Winery", "Notes", "Date"];
  const rows = leads.map((l) => [
    l.id,
    l.email,
    l.source,
    l.tags.join("|"),
    l.name ?? "",
    l.wineryName ?? "",
    (l.notes ?? "").replace(/\n/g, " "),
    new Date(l.createdAt).toISOString(),
  ]);
  const csv = [header, ...rows]
    .map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `ownology-leads-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Inline notes cell ────────────────────────────────────────────────────────

function NotesCell({ lead, onSave }: { lead: Lead; onSave: (id: number, notes: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(lead.notes ?? "");

  if (editing) {
    return (
      <div className="flex flex-col gap-1.5" style={{ minWidth: 220 }}>
        <textarea
          autoFocus
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          rows={3}
          className="w-full text-sm px-2 py-1.5 rounded-sm resize-none"
          style={{
            background: "var(--ow-bg-raised)",
            border: "1px solid var(--ow-amber)",
            color: "var(--ow-text-hi)",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.8rem",
            outline: "none",
          }}
        />
        <div className="flex gap-2">
          <button
            onClick={() => { onSave(lead.id, draft); setEditing(false); }}
            className="px-3 py-1 rounded-sm text-xs font-medium"
            style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif" }}
          >
            Save
          </button>
          <button
            onClick={() => { setDraft(lead.notes ?? ""); setEditing(false); }}
            className="px-3 py-1 rounded-sm text-xs"
            style={{ background: "var(--ow-bg-card)", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", border: "1px solid var(--ow-border)" }}
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="cursor-pointer group flex items-start gap-1.5"
      onClick={() => setEditing(true)}
      title="Click to edit notes"
    >
      <span
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.8rem",
          color: lead.notes ? "var(--ow-text-mid)" : "var(--ow-text-lo)",
          lineHeight: 1.5,
          maxWidth: 260,
          display: "block",
          whiteSpace: "pre-wrap",
          wordBreak: "break-word",
        }}
      >
        {lead.notes || <em style={{ opacity: 0.5 }}>Add note…</em>}
      </span>
      <svg
        width="12" height="12" viewBox="0 0 16 16" fill="none"
        className="flex-shrink-0 mt-0.5 opacity-0 group-hover:opacity-60"
        style={{ color: "var(--ow-amber)" }}
      >
        <path d="M11.5 2.5a1.5 1.5 0 0 1 2.12 2.12L5 13.25l-3 .75.75-3L11.5 2.5z"
          stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

// ─── Add lead modal ───────────────────────────────────────────────────────────

function AddLeadModal({ onClose, onAdded }: { onClose: () => void; onAdded: () => void }) {
  const [email, setEmail] = useState("");
  const [source, setSource] = useState("manual");
  const [name, setName] = useState("");
  const [winery, setWinery] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const addMutation = trpc.leads.add.useMutation({
    onSuccess: () => { onAdded(); onClose(); },
    onError: (e) => setError(e.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) { setError("Email is required"); return; }
    addMutation.mutate({
      email: email.trim(),
      source: source.trim() || "manual",
      name: name.trim() || undefined,
      wineryName: winery.trim() || undefined,
      notes: notes.trim() || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    background: "var(--ow-bg-raised)",
    border: "1px solid var(--ow-border-md)",
    color: "var(--ow-text-hi)",
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.875rem",
    borderRadius: "2px",
    padding: "0.5rem 0.75rem",
    width: "100%",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.7rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase" as const,
    color: "var(--ow-text-lo)",
    display: "block",
    marginBottom: "0.35rem",
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "oklch(0 0 0 / 0.7)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-md rounded-sm p-6"
        style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border-md)" }}
      >
        <div className="flex items-center justify-between mb-5">
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.15rem", color: "var(--ow-text-hi)" }}>
            Add Lead Manually
          </h2>
          <button onClick={onClose} style={{ color: "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", fontSize: "1.2rem" }}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label style={labelStyle}>Email *</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} style={inputStyle} placeholder="winemaker@example.com" required />
          </div>
          <div>
            <label style={labelStyle}>Source</label>
            <input type="text" value={source} onChange={(e) => setSource(e.target.value)} style={inputStyle} placeholder="event / preview / manual" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label style={labelStyle}>Name</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} placeholder="Jane Smith" />
            </div>
            <div>
              <label style={labelStyle}>Winery</label>
              <input type="text" value={winery} onChange={(e) => setWinery(e.target.value)} style={inputStyle} placeholder="Cellar Estate" />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Notes</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} style={{ ...inputStyle, resize: "none" }} placeholder="Met at Wine Australia conference…" />
          </div>

          {error && (
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "oklch(0.65 0.18 25)" }}>{error}</p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              disabled={addMutation.isPending}
              className="flex-1 py-2.5 rounded-sm text-sm font-medium"
              style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", cursor: addMutation.isPending ? "wait" : "pointer", opacity: addMutation.isPending ? 0.7 : 1 }}
            >
              {addMutation.isPending ? "Adding…" : "Add Lead"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-sm text-sm"
              style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", border: "1px solid var(--ow-border)" }}
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Spinner / Access denied ──────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }} />
    </div>
  );
}

function AccessDenied({ isForbidden }: { isForbidden: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.5rem" }}>
        {isForbidden ? "Owner access required" : "Sign in required"}
      </h1>
      {!isForbidden && (
        <a href={getLoginUrl()} className="px-6 py-2.5 rounded-sm text-sm" style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", textDecoration: "none" }}>
          Sign in
        </a>
      )}
      <Link href="/admin"><a style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>← Back to Admin</a></Link>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AdminLeads() {
  const utils = trpc.useUtils();
  const { data: rawLeads, isLoading, error } = trpc.leads.list.useQuery();
  const updateNotesMutation = trpc.leads.updateNotes.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });
  const deleteMutation = trpc.leads.delete.useMutation({
    onSuccess: () => utils.leads.list.invalidate(),
  });

  const [search, setSearch] = useState("");
  const [sourceFilter, setSourceFilter] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  if (isLoading) return <Spinner />;

  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized = error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");
  if (isForbidden || isUnauthorized) return <AccessDenied isForbidden={isForbidden} />;

  const leads: Lead[] = rawLeads ?? [];

  // Unique sources for filter pills
  const allSources = Array.from(new Set(leads.map((l) => l.source))).sort();

  // Filtered leads
  const filtered = useMemo(() => {
    let result = leads;
    if (sourceFilter !== "all") result = result.filter((l) => l.source === sourceFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.email.toLowerCase().includes(q) ||
          (l.name ?? "").toLowerCase().includes(q) ||
          (l.wineryName ?? "").toLowerCase().includes(q) ||
          (l.notes ?? "").toLowerCase().includes(q) ||
          l.source.toLowerCase().includes(q) ||
          l.tags.some((t) => t.toLowerCase().includes(q))
      );
    }
    return result;
  }, [leads, sourceFilter, search]);

  const handleSaveNotes = (id: number, notes: string) => {
    updateNotesMutation.mutate({ id, notes });
  };

  const handleDelete = (id: number) => {
    deleteMutation.mutate({ id });
    setDeleteConfirm(null);
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Header */}
      <div style={{ borderBottom: "1px solid var(--ow-border)" }}>
        <div className="container py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin">
                <a style={{ textDecoration: "none" }}>
                  <OwnologyLogo size={28} />
                </a>
              </Link>
              <div style={{ width: "1px", height: "24px", background: "var(--ow-border-md)" }} />
              <div>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-amber)" }}>
                  Owner Panel
                </p>
                <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.1rem,2.5vw,1.4rem)", color: "var(--ow-text-hi)", lineHeight: 1.1 }}>
                  Lead <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>CRM</em>
                </h1>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/admin">
                <a style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>
                  ← Admin Hub
                </a>
              </Link>
              <ThemeToggle />
            </div>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ borderBottom: "1px solid var(--ow-border)", background: "var(--ow-bg-raised)" }}>
        <div className="container py-4">
          <div className="flex items-center gap-6 flex-wrap">
            <div>
              <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-text-lo)" }}>Total Leads</p>
              <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.5rem", color: "var(--ow-text-hi)", lineHeight: 1.1 }}>{leads.length}</p>
            </div>
            {allSources.map((src) => (
              <div key={src}>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.6rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "var(--ow-text-lo)" }}>{src}</p>
                <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.5rem", color: sourceText(src), lineHeight: 1.1 }}>
                  {leads.filter((l) => l.source === src).length}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="container pt-6 pb-3">
        <div className="flex items-center gap-3 flex-wrap justify-between">
          {/* Left: search + source filter */}
          <div className="flex items-center gap-3 flex-wrap">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email, name, winery, notes…"
              className="rounded-sm px-3 py-2 text-sm"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border-md)",
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.85rem",
                width: "clamp(200px,30vw,320px)",
                outline: "none",
              }}
            />
            {/* Source filter pills */}
            <div className="flex items-center gap-2 flex-wrap">
              {["all", ...allSources].map((src) => (
                <button
                  key={src}
                  onClick={() => setSourceFilter(src)}
                  className="px-3 py-1 rounded-full text-xs transition-all"
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.7rem",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    background: sourceFilter === src
                      ? (src === "all" ? "var(--ow-amber)" : sourceBg(src))
                      : "var(--ow-bg-card)",
                    color: sourceFilter === src
                      ? (src === "all" ? "oklch(0.12 0.01 60)" : sourceText(src))
                      : "var(--ow-text-lo)",
                    border: `1px solid ${sourceFilter === src ? "transparent" : "var(--ow-border)"}`,
                    cursor: "pointer",
                  }}
                >
                  {src}
                </button>
              ))}
            </div>
          </div>

          {/* Right: add + export */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm"
              style={{
                background: "oklch(0.72 0.12 75 / 12%)",
                border: "1px solid oklch(0.72 0.12 75 / 30%)",
                color: "var(--ow-amber)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v12M2 8h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
              Add Lead
            </button>
            <button
              onClick={() => exportCsv(filtered)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-sm text-sm"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                color: "var(--ow-text-mid)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.8rem",
                cursor: "pointer",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M2 11v3h12v-3M8 2v9M5 8l3 3 3-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              Export CSV
            </button>
          </div>
        </div>

        {/* Result count */}
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", marginTop: "0.75rem" }}>
          {filtered.length === leads.length
            ? `${leads.length} lead${leads.length !== 1 ? "s" : ""}`
            : `${filtered.length} of ${leads.length} leads`}
        </p>
      </div>

      {/* Table */}
      <div className="container pb-12">
        {filtered.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-sm"
            style={{ border: "1px dashed var(--ow-border)", background: "var(--ow-bg-card)" }}
          >
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" style={{ color: "var(--ow-text-lo)", marginBottom: "1rem" }}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "var(--ow-text-mid)" }}>
              {leads.length === 0 ? "No leads yet" : "No leads match your filters"}
            </p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-lo)", marginTop: "0.4rem" }}>
              {leads.length === 0
                ? "Sign-ups from the /preview page and other forms will appear here."
                : "Try clearing the search or changing the source filter."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-sm" style={{ border: "1px solid var(--ow-border)" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: "'Lato',sans-serif" }}>
              <thead>
                <tr style={{ background: "var(--ow-bg-raised)", borderBottom: "1px solid var(--ow-border)" }}>
                  {["Email", "Source", "Name / Winery", "Date", "Notes", ""].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "0.75rem 1rem",
                        textAlign: "left",
                        fontSize: "0.65rem",
                        letterSpacing: "0.1em",
                        textTransform: "uppercase",
                        color: "var(--ow-text-lo)",
                        fontWeight: 500,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((lead, i) => (
                  <tr
                    key={lead.id}
                    style={{
                      background: i % 2 === 0 ? "var(--ow-bg-card)" : "var(--ow-bg-base)",
                      borderBottom: "1px solid var(--ow-border)",
                    }}
                  >
                    {/* Email */}
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.85rem", color: "var(--ow-text-hi)", whiteSpace: "nowrap" }}>
                      <a
                        href={`mailto:${lead.email}`}
                        style={{ color: "var(--ow-amber)", textDecoration: "none" }}
                      >
                        {lead.email}
                      </a>
                    </td>

                    {/* Source */}
                    <td style={{ padding: "0.85rem 1rem", whiteSpace: "nowrap" }}>
                      <span
                        className="px-2 py-0.5 rounded-full text-xs"
                        style={{
                          background: sourceBg(lead.source),
                          color: sourceText(lead.source),
                          fontFamily: "'Lato',sans-serif",
                          fontSize: "0.68rem",
                          letterSpacing: "0.06em",
                          textTransform: "uppercase",
                        }}
                      >
                        {lead.source}
                      </span>
                      {lead.tags.filter((t) => t !== lead.source).slice(0, 2).map((tag) => (
                        <span
                          key={tag}
                          className="ml-1 px-1.5 py-0.5 rounded-full text-xs"
                          style={{
                            background: "var(--ow-bg-raised)",
                            color: "var(--ow-text-lo)",
                            fontSize: "0.62rem",
                            letterSpacing: "0.04em",
                          }}
                        >
                          {tag}
                        </span>
                      ))}
                    </td>

                    {/* Name / Winery */}
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.82rem", color: "var(--ow-text-mid)" }}>
                      {lead.name || lead.wineryName ? (
                        <div>
                          {lead.name && <div style={{ color: "var(--ow-text-hi)" }}>{lead.name}</div>}
                          {lead.wineryName && <div style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>{lead.wineryName}</div>}
                        </div>
                      ) : (
                        <span style={{ color: "var(--ow-text-lo)", opacity: 0.5 }}>—</span>
                      )}
                    </td>

                    {/* Date */}
                    <td style={{ padding: "0.85rem 1rem", fontSize: "0.78rem", color: "var(--ow-text-lo)", whiteSpace: "nowrap" }}>
                      {new Date(lead.createdAt).toLocaleDateString("en-AU", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      <div style={{ fontSize: "0.7rem", opacity: 0.7 }}>
                        {new Date(lead.createdAt).toLocaleTimeString("en-AU", { hour: "2-digit", minute: "2-digit" })}
                      </div>
                    </td>

                    {/* Notes */}
                    <td style={{ padding: "0.85rem 1rem" }}>
                      <NotesCell lead={lead} onSave={handleSaveNotes} />
                    </td>

                    {/* Delete */}
                    <td style={{ padding: "0.85rem 1rem", textAlign: "right", whiteSpace: "nowrap" }}>
                      {deleteConfirm === lead.id ? (
                        <div className="flex items-center gap-2">
                          <span style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>Delete?</span>
                          <button
                            onClick={() => handleDelete(lead.id)}
                            className="px-2 py-0.5 rounded-sm text-xs"
                            style={{ background: "oklch(0.55 0.18 25 / 20%)", color: "oklch(0.65 0.18 25)", fontFamily: "'Lato',sans-serif", border: "none", cursor: "pointer" }}
                          >
                            Yes
                          </button>
                          <button
                            onClick={() => setDeleteConfirm(null)}
                            className="px-2 py-0.5 rounded-sm text-xs"
                            style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", border: "1px solid var(--ow-border)", cursor: "pointer" }}
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeleteConfirm(lead.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "var(--ow-text-lo)", opacity: 0.5, padding: "4px" }}
                          title="Delete lead"
                        >
                          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                            <path d="M2 4h12M5 4V2h6v2M6 7v5M10 7v5M3 4l1 10h8l1-10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add lead modal */}
      {showAddModal && (
        <AddLeadModal
          onClose={() => setShowAddModal(false)}
          onAdded={() => utils.leads.list.invalidate()}
        />
      )}
    </div>
  );
}
