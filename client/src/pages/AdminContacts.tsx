/**
 * /admin/contacts — owner-only outreach pipeline.
 *
 * Workflow: paste a winemaker's details → get a /hi/:slug landing-page URL
 * + an SMS draft ready to copy & send. Tracks who opened the link and who
 * booked a demo.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const PREVIEW_BASE = typeof window !== "undefined" ? window.location.origin : "";

function fmtAgo(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function smsDraft(c: { firstName: string; winery?: string | null; event?: string | null; painPoint?: string | null; slug: string }): string {
  const where = c.event ? `at ${c.event}` : "the other day";
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  if (c.painPoint) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `G'day ${c.firstName} — we crossed paths ${where}${wineryBit}. You mentioned ${c.painPoint}; I've since built a cellar AI that answers exactly that, grounded in your own vintage logs. 90 sec look: ${url} — Jamie`;
  }
  // Honest cold-contact version — no faux familiarity
  const wineryBit = c.winery ? `, sending this to ${c.winery} too` : "";
  return `G'day ${c.firstName} — we crossed paths ${where}${wineryBit}. I've since built a cellar AI grounded in your own vintage logs — figured you might find it useful. 90 sec look: ${url} — Jamie`;
}

type ContactStatus = "warm" | "lukewarm" | "cold" | "sales" | "skip";

const STATUS_OPTIONS: { value: ContactStatus; label: string; color: string }[] = [
  { value: "warm",     label: "Warm",     color: "#16a34a" },
  { value: "lukewarm", label: "Lukewarm", color: "#ca8a04" },
  { value: "cold",     label: "Cold",     color: "#6b7280" },
  { value: "sales",    label: "Sales/Vendor", color: "#7c3aed" },
  { value: "skip",     label: "Skip",     color: "#9ca3af" },
];

const STATUS_META: Record<ContactStatus, { label: string; color: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, { label: o.label, color: o.color }])
) as Record<ContactStatus, { label: string; color: string }>;

export default function AdminContacts() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.outreach.list.useQuery();
  const createMutation = trpc.outreach.create.useMutation();
  const markSmsSentMutation = trpc.outreach.markSmsSent.useMutation();
  const markBookedMutation = trpc.outreach.markBooked.useMutation();
  const setStatusMutation = trpc.outreach.setStatus.useMutation();
  const setSmsDraftMutation = trpc.outreach.setSmsDraft.useMutation();
  const removeMutation = trpc.outreach.remove.useMutation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobileAu: "",
    winery: "",
    event: "",
    painPoint: "",
    calendlyOverride: "",
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<string, "url" | "sms" | null>>({});
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");

  const allContacts = useMemo(() => data?.contacts ?? [], [data]);
  const contacts = useMemo(() => {
    if (statusFilter === "all") return allContacts;
    return allContacts.filter((c) => (c.status ?? "cold") === statusFilter);
  }, [allContacts, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<ContactStatus, number> = { warm: 0, lukewarm: 0, cold: 0, sales: 0, skip: 0 };
    for (const c of allContacts) {
      const s = (c.status ?? "cold") as ContactStatus;
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allContacts]);

  const stats = useMemo(() => {
    // KPIs are computed over the FULL list (not the filtered view) so the
    // headline numbers stay stable as the operator clicks filter chips.
    const total = allContacts.length;
    const sent = allContacts.filter((c) => c.smsSentAt).length;
    const opened = allContacts.filter((c) => (c.viewCount ?? 0) > 0).length;
    const booked = allContacts.filter((c) => c.demoBookedAt).length;
    return { total, sent, opened, booked };
  }, [allContacts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.firstName.trim()) {
      setErr("First name is required.");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setForm({ firstName: "", lastName: "", mobileAu: "", winery: "", event: form.event, painPoint: "", calendlyOverride: form.calendlyOverride, notes: "" });
      utils.outreach.list.invalidate();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function copy(slug: string, kind: "url" | "sms", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((s) => ({ ...s, [slug]: kind }));
      setTimeout(() => setCopyState((s) => ({ ...s, [slug]: null })), 1600);
    } catch {
      window.prompt("Copy:", text);
    }
  }

  return (
    <div data-testid="admin-contacts-page" className="container py-8" style={{ maxWidth: 1100 }}>
      <div className="mb-6">
        <Link href="/admin" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
          ← Back to Admin hub
        </Link>
        <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
          Outreach pipeline
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
              Personal SMS contacts
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
              Add a winemaker from your event notes → get a personalised <code>/hi/&lt;slug&gt;</code> URL + ready-to-send SMS draft. Track who opened the link and who booked a demo.
            </p>
          </div>
          <Link
            href="/admin/contacts/pipeline"
            data-testid="link-to-pipeline"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "8px 14px",
              border: "1px solid var(--ow-amber)",
              borderRadius: 6,
              color: "var(--ow-amber)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Pipeline board →
          </Link>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Contacts" value={stats.total} testid="contacts-kpi-total" />
        <Kpi label="SMS sent" value={stats.sent} testid="contacts-kpi-sent" />
        <Kpi label="Opened link" value={stats.opened} testid="contacts-kpi-opened" />
        <Kpi label="Demo booked" value={stats.booked} testid="contacts-kpi-booked" />
      </div>

      {/* Triage filter chips */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="status-filter-bar">
        <FilterChip
          label={`All (${allContacts.length})`}
          active={statusFilter === "all"}
          color="#b45309"
          onClick={() => setStatusFilter("all")}
          testid="filter-all"
        />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s.value}
            label={`${s.label} (${statusCounts[s.value]})`}
            active={statusFilter === s.value}
            color={s.color}
            onClick={() => setStatusFilter(s.value)}
            testid={`filter-${s.value}`}
          />
        ))}
      </div>

      {/* Add form */}
      <form onSubmit={handleCreate} className="mb-8 rounded p-5" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--ow-amber)" }}>Add contact</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="First name *" testid="form-firstName" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <Field label="Last name" testid="form-lastName" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          <Field label="Mobile (AU)" placeholder="0412 345 678" testid="form-mobile" value={form.mobileAu} onChange={(v) => setForm({ ...form, mobileAu: v })} />
          <Field label="Winery" testid="form-winery" value={form.winery} onChange={(v) => setForm({ ...form, winery: v })} />
          <Field label="Event" placeholder="McLaren Vale 2025" testid="form-event" value={form.event} onChange={(v) => setForm({ ...form, event: v })} />
          <Field label="Calendly URL (optional override)" testid="form-calendly" value={form.calendlyOverride} onChange={(v) => setForm({ ...form, calendlyOverride: v })} />
        </div>
        <Field label="Pain point they mentioned" testid="form-pain" value={form.painPoint} placeholder="VA issues on Tank 9 last year" onChange={(v) => setForm({ ...form, painPoint: v })} />
        <Field label="Private notes" testid="form-notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        {err && <p data-testid="form-error" style={{ color: "#b91c1c", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}
        <button
          type="submit"
          disabled={createMutation.isPending}
          data-testid="form-submit"
          style={{
            marginTop: 12,
            padding: "0.7rem 1.5rem",
            background: "var(--ow-amber)",
            color: "oklch(0.10 0.008 60)",
            fontFamily: "'Lato',sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "none",
            borderRadius: 4,
            cursor: createMutation.isPending ? "wait" : "pointer",
            opacity: createMutation.isPending ? 0.6 : 1,
          }}
        >
          {createMutation.isPending ? "Saving…" : "Save contact"}
        </button>
      </form>

      {/* Table */}
      {isLoading && <p style={{ color: "var(--ow-text-mid)" }}>Loading…</p>}
      {!isLoading && contacts.length === 0 && (
        <p data-testid="contacts-empty" style={{ color: "var(--ow-text-lo)", fontStyle: "italic" }}>
          No contacts yet — add one above to generate your first SMS-ready landing page.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {contacts.map((c) => {
          const url = `${PREVIEW_BASE}/hi/${c.slug}`;
          const templateSms = smsDraft({ firstName: c.firstName, winery: c.winery, event: c.event, painPoint: c.painPoint, slug: c.slug });
          const effectiveSms = c.smsDraftOverride ?? templateSms;
          const copied = copyState[c.slug];
          const status = ((c.status ?? "cold") as ContactStatus);
          const meta = STATUS_META[status] ?? STATUS_META.cold;
          const isSilent = status === "sales" || status === "skip";
          return (
            <div
              key={c.slug}
              data-testid={`contact-row-${c.slug}`}
              className="rounded p-4"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                opacity: isSilent ? 0.55 : 1,
              }}
            >
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                <div>
                  <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: 0 }}>
                    {c.firstName} {c.lastName ?? ""}
                  </h3>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", margin: 0 }}>
                    {c.winery ?? "—"} · {c.event ?? "—"} · {c.mobileAu ?? "no mobile"}
                  </p>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  <select
                    data-testid={`status-select-${c.slug}`}
                    value={status}
                    onChange={(e) =>
                      setStatusMutation.mutate(
                        { slug: c.slug, status: e.target.value as ContactStatus },
                        { onSuccess: () => utils.outreach.list.invalidate() }
                      )
                    }
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--ow-border)",
                      background: "var(--ow-bg-card)",
                      color: "var(--ow-text-mid)",
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {c.smsSentAt && <Pill color="#6b7280">SMS sent {fmtAgo(c.smsSentAt)}</Pill>}
                  {(c.viewCount ?? 0) > 0 && <Pill color="#b45309">{c.viewCount} view{c.viewCount === 1 ? "" : "s"}</Pill>}
                  {c.demoBookedAt && <Pill color="#10b981">Booked {fmtAgo(c.demoBookedAt)}</Pill>}
                </div>
              </div>
              {c.painPoint && <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", fontStyle: "italic", marginBottom: 8 }}>“{c.painPoint}”</p>}
              {isSilent ? (
                <p
                  data-testid={`silent-note-${c.slug}`}
                  style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", fontStyle: "italic", marginTop: 8 }}
                >
                  {status === "sales" ? "Sales/vendor — SMS draft hidden so you don't accidentally pitch a rep." : "Marked skip — kept for reference only."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    data-testid={`copy-url-${c.slug}`}
                    onClick={() => copy(c.slug, "url", url)}
                    style={btn}
                  >
                    {copied === "url" ? "✓ URL copied" : `Copy link`}
                  </button>
                  <button
                    data-testid={`copy-sms-${c.slug}`}
                    onClick={() => copy(c.slug, "sms", effectiveSms)}
                    style={{ ...btn, background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", fontWeight: 700 }}
                  >
                    {copied === "sms" ? "✓ SMS copied" : "Copy SMS draft"}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: "none" }}>
                    Preview /hi/{c.slug}
                  </a>
                  {!c.smsSentAt && (
                    <button
                      data-testid={`mark-sent-${c.slug}`}
                      onClick={() => markSmsSentMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() })}
                      style={btn}
                    >
                      Mark SMS sent
                    </button>
                  )}
                  {!c.demoBookedAt && (
                    <button
                      data-testid={`mark-booked-${c.slug}`}
                      onClick={() => markBookedMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() })}
                      style={btn}
                    >
                      Mark booked
                    </button>
                  )}
                  <button
                    data-testid={`remove-${c.slug}`}
                    onClick={() => {
                      if (confirm(`Delete ${c.firstName}?`)) {
                        removeMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() });
                      }
                    }}
                    style={{ ...btn, color: "#b91c1c" }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {!isSilent && (
                <SmsDraftEditor
                  slug={c.slug}
                  templateSms={templateSms}
                  override={c.smsDraftOverride ?? null}
                  onSave={(draft) =>
                    setSmsDraftMutation.mutate(
                      { slug: c.slug, draft },
                      { onSuccess: () => utils.outreach.list.invalidate() }
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, testid }: { label: string; value: number; testid: string }) {
  return (
    <div className="rounded p-3" data-testid={testid} style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>{label}</p>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--ow-text-hi)", margin: 0 }}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, testid, placeholder }: { label: string; value: string; onChange: (v: string) => void; testid: string; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
      {label}
      <input
        type="text"
        data-testid={testid}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "0.55rem 0.7rem",
          borderRadius: 4,
          border: "1px solid var(--ow-border)",
          background: "color-mix(in oklch, var(--ow-bg-card) 70%, white)",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.9rem",
          color: "var(--ow-text-hi)",
        }}
      />
    </label>
  );
}

function SmsDraftEditor({
  slug,
  templateSms,
  override,
  onSave,
}: {
  slug: string;
  templateSms: string;
  override: string | null;
  onSave: (draft: string | null) => void;
}) {
  const [value, setValue] = useState<string>(override ?? templateSms);
  const [savedHint, setSavedHint] = useState<"saved" | "reset" | null>(null);
  const isOverride = override !== null && override.length > 0;
  const dirty = value !== (override ?? templateSms);

  function handleBlur() {
    if (!dirty) return;
    const trimmed = value.trim();
    // Treat "same as template" as a reset (clears override so future
    // template changes auto-apply to this contact).
    if (trimmed === templateSms.trim()) {
      onSave(null);
      setSavedHint("reset");
    } else {
      onSave(trimmed.length > 0 ? trimmed : null);
      setSavedHint(trimmed.length > 0 ? "saved" : "reset");
    }
    setTimeout(() => setSavedHint(null), 2200);
  }

  function handleReset() {
    setValue(templateSms);
    onSave(null);
    setSavedHint("reset");
    setTimeout(() => setSavedHint(null), 2200);
  }

  return (
    <div data-testid={`sms-editor-${slug}`} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          SMS Draft
        </span>
        {isOverride && (
          <span
            data-testid={`sms-editor-badge-${slug}`}
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.65rem",
              padding: "1px 6px",
              borderRadius: 8,
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Custom
          </span>
        )}
        <span style={{ flexGrow: 1 }} />
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.68rem", color: value.length > 160 ? "#dc2626" : "var(--ow-text-lo)" }}>
          {value.length} chars · {value.length <= 160 ? "1 SMS" : value.length <= 306 ? "2 SMS" : `${Math.ceil(value.length / 153)} SMS`}
        </span>
      </div>
      <textarea
        data-testid={`sms-editor-input-${slug}`}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 500))}
        onBlur={handleBlur}
        rows={4}
        style={{
          width: "100%",
          padding: 10,
          background: "color-mix(in oklch, var(--ow-amber) 4%, transparent)",
          border: `1px solid ${dirty ? "var(--ow-amber)" : "var(--ow-border)"}`,
          borderRadius: 4,
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.78rem",
          color: "var(--ow-text-hi)",
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
          transition: "border-color 120ms ease",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        {isOverride && (
          <button
            type="button"
            data-testid={`sms-editor-reset-${slug}`}
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              color: "var(--ow-text-lo)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset to template
          </button>
        )}
        <span style={{ flexGrow: 1 }} />
        {savedHint === "saved" && (
          <span data-testid={`sms-editor-saved-${slug}`} style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "#10b981" }}>
            ✓ Saved
          </span>
        )}
        {savedHint === "reset" && (
          <span data-testid={`sms-editor-reset-confirm-${slug}`} style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
            ↺ Reverted to template
          </span>
        )}
        {dirty && !savedHint && (
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-amber)" }}>
            Click outside to save
          </span>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  color,
  onClick,
  testid,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 16,
        border: `1px solid ${active ? color : "var(--ow-border)"}`,
        background: active ? color : "transparent",
        color: active ? "white" : "var(--ow-text-mid)",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.78rem",
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.02em",
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {label}
    </button>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "white",
        background: color,
        padding: "2px 8px",
        borderRadius: 10,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

const btn: React.CSSProperties = {
  padding: "0.5rem 0.9rem",
  background: "var(--ow-bg-card)",
  color: "var(--ow-text-mid)",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.78rem",
  fontWeight: 600,
  border: "1px solid var(--ow-border)",
  borderRadius: 4,
  cursor: "pointer",
};
