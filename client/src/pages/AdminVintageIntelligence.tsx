/**
 * OWNOLOGY — /admin/vintage-intelligence
 * Owner-only page to manage regional vintage intelligence entries.
 * Entries are injected into the Free Run AI Tutor system prompt when
 * a user's question mentions a known region or vintage year.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Types ────────────────────────────────────────────────────────────────────

interface VintageEntry {
  id: number;
  region: string;
  year: number;
  state: string;
  country: string;
  conditions: string;
  standoutVarieties: string | null;
  qualityRating: number;
  yieldAssessment: string | null;
  winemakingNotes: string | null;
  source: string | null;
  createdAt: number;
  updatedAt: number;
}

const QUALITY_LABELS: Record<number, { label: string; color: string }> = {
  1: { label: "Poor", color: "oklch(0.55 0.18 30)" },
  2: { label: "Below Avg", color: "oklch(0.65 0.12 60)" },
  3: { label: "Average", color: "oklch(0.65 0.12 200)" },
  4: { label: "Excellent", color: "oklch(0.65 0.18 150)" },
  5: { label: "Exceptional", color: "oklch(0.72 0.12 75)" },
};

const AU_STATES = ["National", "SA", "WA", "VIC", "NSW", "QLD", "TAS"];

// ─── Upsert Modal ─────────────────────────────────────────────────────────────

function UpsertModal({
  entry,
  onClose,
  onSaved,
}: {
  entry: Partial<VintageEntry> | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = !!entry?.id;
  const [form, setForm] = useState({
    region: entry?.region ?? "",
    year: entry?.year ?? new Date().getFullYear(),
    state: entry?.state ?? "SA",
    country: entry?.country ?? "Australia",
    conditions: entry?.conditions ?? "",
    standoutVarieties: entry?.standoutVarieties ?? "",
    qualityRating: entry?.qualityRating ?? 3,
    yieldAssessment: entry?.yieldAssessment ?? "",
    winemakingNotes: entry?.winemakingNotes ?? "",
    source: entry?.source ?? "",
  });
  const [error, setError] = useState<string | null>(null);

  const upsert = trpc.vintageIntelligence.upsert.useMutation({
    onSuccess: () => { onSaved(); onClose(); },
    onError: (e) => setError(e.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    upsert.mutate({
      region: form.region,
      year: Number(form.year),
      state: form.state,
      country: form.country,
      conditions: form.conditions,
      standoutVarieties: form.standoutVarieties || undefined,
      qualityRating: Number(form.qualityRating),
      yieldAssessment: form.yieldAssessment || undefined,
      winemakingNotes: form.winemakingNotes || undefined,
      source: form.source || undefined,
    });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: "oklch(0 0 0 / 0.65)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-2xl mx-4 rounded-md overflow-y-auto"
        style={{
          background: "var(--ow-bg-card)",
          border: "1px solid oklch(1 0 0 / 0.08)",
          maxHeight: "90vh",
        }}
      >
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid oklch(1 0 0 / 0.08)" }}
        >
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontSize: "1.25rem",
              color: "var(--ow-text-primary)",
            }}
          >
            {isEdit ? "Edit Vintage Entry" : "Add Vintage Entry"}
          </h2>
          <button
            onClick={onClose}
            style={{ color: "var(--ow-text-muted)", fontSize: "1.25rem", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 flex flex-col gap-4">
          {/* Region + Year */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Region *
              </label>
              <input
                required
                value={form.region}
                onChange={(e) => setForm((f) => ({ ...f, region: e.target.value }))}
                placeholder="e.g. Barossa Valley"
                className="px-3 py-2 rounded-sm text-sm"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Vintage Year *
              </label>
              <input
                required
                type="number"
                min={2000}
                max={2100}
                value={form.year}
                onChange={(e) => setForm((f) => ({ ...f, year: Number(e.target.value) }))}
                className="px-3 py-2 rounded-sm text-sm"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
              />
            </div>
          </div>

          {/* State + Quality Rating */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                State *
              </label>
              <select
                required
                value={form.state}
                onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))}
                className="px-3 py-2 rounded-sm text-sm"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
              >
                {AU_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
                Quality Rating (1–5) *
              </label>
              <select
                required
                value={form.qualityRating}
                onChange={(e) => setForm((f) => ({ ...f, qualityRating: Number(e.target.value) }))}
                className="px-3 py-2 rounded-sm text-sm"
                style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
              >
                {[1, 2, 3, 4, 5].map((n) => (
                  <option key={n} value={n}>{n} — {QUALITY_LABELS[n].label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Yield Assessment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Yield Assessment
            </label>
            <input
              value={form.yieldAssessment}
              onChange={(e) => setForm((f) => ({ ...f, yieldAssessment: e.target.value }))}
              placeholder="e.g. Below average — 50–90% of normal"
              className="px-3 py-2 rounded-sm text-sm"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
            />
          </div>

          {/* Standout Varieties */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Standout Varieties
            </label>
            <input
              value={form.standoutVarieties}
              onChange={(e) => setForm((f) => ({ ...f, standoutVarieties: e.target.value }))}
              placeholder="e.g. Grenache, Shiraz, Riesling"
              className="px-3 py-2 rounded-sm text-sm"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
            />
          </div>

          {/* Growing Season Conditions */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Growing Season Conditions *
            </label>
            <textarea
              required
              rows={6}
              value={form.conditions}
              onChange={(e) => setForm((f) => ({ ...f, conditions: e.target.value }))}
              placeholder="Describe the growing season — weather, rainfall, bud burst timing, disease pressure, harvest window..."
              className="px-3 py-2 rounded-sm text-sm resize-y"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)", minHeight: 120 }}
            />
          </div>

          {/* Winemaking Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Winemaking Implications
            </label>
            <textarea
              rows={4}
              value={form.winemakingNotes}
              onChange={(e) => setForm((f) => ({ ...f, winemakingNotes: e.target.value }))}
              placeholder="Key winemaking implications — extraction, timing, disease management, tank scheduling..."
              className="px-3 py-2 rounded-sm text-sm resize-y"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)", minHeight: 90 }}
            />
          </div>

          {/* Source */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: "var(--ow-text-muted)", letterSpacing: "0.06em", textTransform: "uppercase" }}>
              Source Attribution
            </label>
            <input
              value={form.source}
              onChange={(e) => setForm((f) => ({ ...f, source: e.target.value }))}
              placeholder="e.g. Barossa Australia Vintage Report 2024"
              className="px-3 py-2 rounded-sm text-sm"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid oklch(1 0 0 / 0.12)", color: "var(--ow-text-primary)" }}
            />
          </div>

          {error && (
            <p className="text-sm" style={{ color: "oklch(0.65 0.18 30)" }}>{error}</p>
          )}

          <div className="flex gap-3 justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-sm text-sm"
              style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-muted)", border: "1px solid oklch(1 0 0 / 0.12)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={upsert.isPending}
              className="px-5 py-2 rounded-sm text-sm font-medium"
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)" }}
            >
              {upsert.isPending ? "Saving…" : isEdit ? "Save Changes" : "Add Entry"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminVintageIntelligence() {
  const [modalEntry, setModalEntry] = useState<Partial<VintageEntry> | null | false>(false);
  const [filterYear, setFilterYear] = useState<string>("");
  const [filterState, setFilterState] = useState<string>("");
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  const utils = trpc.useUtils();

  const { data, isLoading, error } = trpc.vintageIntelligence.list.useQuery(
    { year: filterYear ? Number(filterYear) : undefined, state: filterState || undefined },
    { retry: false }
  );

  const deleteMutation = trpc.vintageIntelligence.delete.useMutation({
    onSuccess: () => {
      utils.vintageIntelligence.list.invalidate();
      setDeleteConfirm(null);
    },
  });

  // Auth guard
  if (error?.data?.code === "FORBIDDEN" || error?.data?.code === "UNAUTHORIZED") {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ow-bg-page)" }}
      >
        <div className="text-center" style={{ color: "var(--ow-text-muted)" }}>
          <p className="text-lg mb-4" style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-text-primary)" }}>
            Owner access required
          </p>
          <a href={getLoginUrl()} className="text-sm underline" style={{ color: "oklch(0.72 0.12 75)" }}>
            Sign in
          </a>
        </div>
      </div>
    );
  }

  const entries: VintageEntry[] = (data as VintageEntry[] | undefined) ?? [];

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-page)", color: "var(--ow-text-primary)" }}>
      {/* Nav */}
      <nav
        className="sticky top-0 z-40"
        style={{ background: "oklch(0.11 0.008 60 / 97%)", borderBottom: "1px solid oklch(1 0 0 / 0.06)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <div className="flex items-center gap-6">
            <Link href="/">
              <OwnologyLogo size={28} />
            </Link>
            <span style={{ color: "var(--ow-text-muted)", fontSize: "0.75rem", letterSpacing: "0.08em", textTransform: "uppercase" }}>
              Admin / Vintage Intelligence
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/admin" className="text-sm" style={{ color: "var(--ow-text-muted)" }}>
              ← Admin
            </Link>
            <ThemeToggle />
          </div>
        </div>
      </nav>

      <div className="container py-8">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1
              style={{ fontFamily: "'Fraunces', serif", fontSize: "1.75rem", color: "var(--ow-text-primary)", fontWeight: 700 }}
            >
              Vintage Intelligence
            </h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ow-text-muted)", maxWidth: 520 }}>
              Regional vintage data injected into the Free Run AI Tutor when a user mentions a region or year.
              Entries are matched by region name and vintage year.
            </p>
          </div>
          <button
            onClick={() => setModalEntry({})}
            className="px-4 py-2 rounded-sm text-sm font-medium"
            style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)" }}
          >
            + Add Entry
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-3 mb-6">
          <input
            type="number"
            placeholder="Filter by year…"
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="px-3 py-2 rounded-sm text-sm w-36"
            style={{ background: "var(--ow-bg-card)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--ow-text-primary)" }}
          />
          <select
            value={filterState}
            onChange={(e) => setFilterState(e.target.value)}
            className="px-3 py-2 rounded-sm text-sm"
            style={{ background: "var(--ow-bg-card)", border: "1px solid oklch(1 0 0 / 0.1)", color: "var(--ow-text-primary)" }}
          >
            <option value="">All states</option>
            {AU_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          {(filterYear || filterState) && (
            <button
              onClick={() => { setFilterYear(""); setFilterState(""); }}
              className="text-sm px-3 py-2 rounded-sm"
              style={{ color: "var(--ow-text-muted)", background: "var(--ow-bg-raised)" }}
            >
              Clear
            </button>
          )}
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="py-16 text-center" style={{ color: "var(--ow-text-muted)" }}>Loading…</div>
        ) : entries.length === 0 ? (
          <div className="py-16 text-center" style={{ color: "var(--ow-text-muted)" }}>
            No vintage intelligence entries found.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-md" style={{ border: "1px solid oklch(1 0 0 / 0.08)" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: "1px solid oklch(1 0 0 / 0.08)", background: "oklch(1 0 0 / 0.02)" }}>
                  {["Region", "Year", "State", "Quality", "Yield", "Standout Varieties", "Actions"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left"
                      style={{ color: "var(--ow-text-muted)", fontWeight: 500, letterSpacing: "0.04em", fontSize: "0.7rem", textTransform: "uppercase" }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((entry) => {
                  const q = QUALITY_LABELS[entry.qualityRating] ?? { label: "?", color: "var(--ow-text-muted)" };
                  return (
                    <tr
                      key={entry.id}
                      style={{ borderBottom: "1px solid oklch(1 0 0 / 0.05)" }}
                    >
                      <td className="px-4 py-3 font-medium" style={{ color: "var(--ow-text-primary)" }}>
                        {entry.region}
                      </td>
                      <td className="px-4 py-3" style={{ color: "oklch(0.72 0.12 75)", fontFamily: "'Fira Code', monospace", fontWeight: 600 }}>
                        {entry.year}
                      </td>
                      <td className="px-4 py-3" style={{ color: "var(--ow-text-muted)" }}>
                        {entry.state}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="px-2 py-0.5 rounded-sm text-xs font-medium"
                          style={{ background: `${q.color}22`, color: q.color }}
                        >
                          {entry.qualityRating}/5 {q.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 max-w-xs" style={{ color: "var(--ow-text-muted)", fontSize: "0.75rem" }}>
                        {entry.yieldAssessment
                          ? entry.yieldAssessment.length > 60
                            ? entry.yieldAssessment.slice(0, 60) + "…"
                            : entry.yieldAssessment
                          : "—"}
                      </td>
                      <td className="px-4 py-3 max-w-xs" style={{ color: "var(--ow-text-muted)", fontSize: "0.75rem" }}>
                        {entry.standoutVarieties ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2">
                          <button
                            onClick={() => setModalEntry(entry)}
                            className="px-3 py-1 rounded-sm text-xs"
                            style={{ background: "oklch(0.72 0.12 75 / 15%)", color: "oklch(0.72 0.12 75)", border: "1px solid oklch(0.72 0.12 75 / 30%)" }}
                          >
                            Edit
                          </button>
                          {deleteConfirm === entry.id ? (
                            <div className="flex gap-1">
                              <button
                                onClick={() => deleteMutation.mutate({ id: entry.id })}
                                disabled={deleteMutation.isPending}
                                className="px-2 py-1 rounded-sm text-xs"
                                style={{ background: "oklch(0.55 0.18 30 / 20%)", color: "oklch(0.65 0.18 30)" }}
                              >
                                Confirm
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="px-2 py-1 rounded-sm text-xs"
                                style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-muted)" }}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(entry.id)}
                              className="px-3 py-1 rounded-sm text-xs"
                              style={{ background: "oklch(0.55 0.18 30 / 10%)", color: "oklch(0.65 0.18 30)", border: "1px solid oklch(0.55 0.18 30 / 20%)" }}
                            >
                              Delete
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Info callout */}
        <div
          className="mt-8 p-4 rounded-md text-sm"
          style={{ background: "oklch(0.72 0.12 75 / 8%)", border: "1px solid oklch(0.72 0.12 75 / 20%)", color: "var(--ow-text-muted)" }}
        >
          <strong style={{ color: "oklch(0.72 0.12 75)" }}>How it works:</strong>{" "}
          When a user asks the Free Run AI Tutor a question that mentions a known Australian wine region (e.g. "Barossa Valley",
          "McLaren Vale") or a vintage year (e.g. "2024"), the system automatically fetches the matching entry from this table
          and appends it to the AI's context window. This gives the tutor real, sourced vintage intelligence without the user
          needing to provide it.
        </div>
      </div>

      {/* Upsert Modal */}
      {modalEntry !== false && (
        <UpsertModal
          entry={modalEntry}
          onClose={() => setModalEntry(false)}
          onSaved={() => utils.vintageIntelligence.list.invalidate()}
        />
      )}
    </div>
  );
}
