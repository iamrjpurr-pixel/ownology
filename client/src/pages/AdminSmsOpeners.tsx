/**
 * AdminSmsOpeners — /admin/sms-openers
 *
 * Rich's control panel for the first-contact SMS variants. Reads/writes
 * `sms_opener_variants`. Preview shows the interpolated copy against a
 * real contact (Fiona Donald · Seppeltsfield by default) with a live
 * char count so 320-char SMS caps stay visible.
 *
 * Design: minimal, one-column, no chrome — the copy IS the interface.
 * Each variant card has: toggle-active pill · name · lens · char count ·
 * template textarea · preview strip · notes textarea · save/delete row.
 */

import { useEffect, useMemo, useState } from "react";
import { trpc } from "@/lib/trpc";

const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BORDER = "var(--ow-border-hi)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const SANS = "'Lato', system-ui, sans-serif";
const SERIF = "'Fraunces', 'Cormorant Garamond', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

type Variant = {
  id: number;
  key: string;
  name: string;
  lens: string;
  template: string;
  active: number;
  sortIndex: number;
  notes: string | null;
};

export default function AdminSmsOpeners() {
  const list = trpc.smsOpeners.list.useQuery();
  const setActive = trpc.smsOpeners.setActive.useMutation({ onSuccess: () => list.refetch() });
  const update = trpc.smsOpeners.update.useMutation({ onSuccess: () => list.refetch() });
  const create = trpc.smsOpeners.create.useMutation({ onSuccess: () => { list.refetch(); setCreating(false); setDraft(EMPTY_DRAFT); } });
  const remove = trpc.smsOpeners.remove.useMutation({ onSuccess: () => list.refetch() });
  const clearStale = trpc.smsOpeners.clearStaleDrafts.useMutation();
  const stalePreview = trpc.smsOpeners.clearStaleDrafts.useMutation();
  const [staleCount, setStaleCount] = useState<number | null>(null);
  const [flushResult, setFlushResult] = useState<{ cleared: number } | null>(null);

  // Fire a dryRun on mount so we can show the banner right away.
  useEffect(() => {
    stalePreview.mutateAsync({ dryRun: true }).then((r) => setStaleCount(r.matched)).catch(() => setStaleCount(null));
  }, []);

  async function runFlush() {
    if (!confirm(`Clear ${staleCount ?? "?"} stale SMS drafts that contain banned language ("second brain", "cellar AI", "winemaker's second...")?\n\nThe contacts fall back to your active variant (Continuity by default). Their smsDraftOverride is set to NULL — you can rewrite via Claude later if you want.`)) return;
    setFlushResult(null);
    const r = await clearStale.mutateAsync({ dryRun: false });
    setFlushResult(r);
    setStaleCount(0);
  }

  const [creating, setCreating] = useState(false);
  const [draft, setDraft] = useState<{ key: string; name: string; lens: string; template: string }>(EMPTY_DRAFT);
  const activeCount = useMemo(() => list.data?.variants.filter((v) => v.active === 1).length ?? 0, [list.data]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-primary)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 820, margin: "0 auto" }}>
        <header style={{ marginBottom: "1.75rem" }}>
          <div style={{ fontFamily: SANS, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700 }}>
            Admin · Outbound
          </div>
          <h1 style={{ fontFamily: SERIF, fontSize: "2rem", fontWeight: 600, color: HI, margin: "0.35rem 0 0.5rem", lineHeight: 1.15 }}>
            SMS opener variants
          </h1>
          <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, margin: 0, lineHeight: 1.55 }}>
            First-contact copy — the single most important sentence in the pitch. Cycle psychology angles here without redeploying.
            Marking multiple variants active runs a deterministic A/B (same prospect always sees the same one).
            The Perplexity Claude rewrite path is untouched and still available for per-contact regional / brief polish.
          </p>
          <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, marginTop: "0.7rem", lineHeight: 1.5 }}>
            Tokens: <code style={{ fontFamily: MONO, background: RAISED, padding: "1px 5px", borderRadius: 3 }}>${"{firstName}"}</code>{" "}
            <code style={{ fontFamily: MONO, background: RAISED, padding: "1px 5px", borderRadius: 3 }}>${"{winery}"}</code>{" "}
            <code style={{ fontFamily: MONO, background: RAISED, padding: "1px 5px", borderRadius: 3 }}>${"{wineryOr}"}</code> (natural &quot; at Seppeltsfield&quot; or empty){" "}
            <code style={{ fontFamily: MONO, background: RAISED, padding: "1px 5px", borderRadius: 3 }}>${"{url}"}</code>
          </p>
          <p data-testid="active-count" style={{ fontFamily: SANS, fontSize: "0.82rem", color: activeCount === 0 ? "oklch(0.65 0.20 25)" : HI, marginTop: "0.8rem", fontWeight: 600 }}>
            {activeCount === 0
              ? "⚠ No variants active — every fresh contact falls back to the hardcoded Continuity opener."
              : `${activeCount} variant${activeCount === 1 ? "" : "s"} active${activeCount > 1 ? " · rotating deterministically per slug" : ""}.`}
          </p>

          {staleCount !== null && staleCount > 0 && (
            <div
              data-testid="stale-drafts-banner"
              style={{
                marginTop: "0.9rem",
                padding: "0.75rem 1rem",
                border: `1px solid oklch(0.60 0.20 25)`,
                background: `color-mix(in oklch, oklch(0.60 0.20 25) 8%, transparent)`,
                borderRadius: 6,
                display: "flex",
                gap: "0.85rem",
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, fontFamily: SANS, fontSize: "0.85rem", color: HI, lineHeight: 1.5 }}>
                <strong style={{ color: "oklch(0.65 0.20 25)" }}>{staleCount} contacts</strong> still carry pre-Jul-2026 SMS drafts using banned language (&ldquo;second brain&rdquo;, &ldquo;cellar AI&rdquo;). These override the active variant. Flush them to fall back to Continuity.
              </div>
              <button
                data-testid="flush-stale-drafts-btn"
                onClick={runFlush}
                disabled={clearStale.isPending}
                style={{
                  background: "oklch(0.60 0.20 25)",
                  color: "white",
                  border: 0,
                  padding: "0.5rem 1.15rem",
                  borderRadius: 4,
                  fontFamily: SANS,
                  fontWeight: 700,
                  fontSize: "0.85rem",
                  cursor: clearStale.isPending ? "wait" : "pointer",
                }}
              >
                {clearStale.isPending ? "Flushing…" : `Flush ${staleCount} drafts`}
              </button>
            </div>
          )}
          {flushResult && (
            <p data-testid="flush-result" style={{ fontFamily: SANS, fontSize: "0.82rem", color: "oklch(0.65 0.14 145)", marginTop: "0.5rem", fontWeight: 600 }}>
              ✓ Flushed {flushResult.cleared} stale drafts. They&apos;ll fall back to the active variant on next queue reload.
            </p>
          )}
        </header>

        {list.isLoading && <p style={{ fontFamily: SANS, color: MID }}>Loading variants…</p>}
        {list.error && <p style={{ fontFamily: SANS, color: "oklch(0.65 0.20 25)" }}>Error: {list.error.message}</p>}

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          {list.data?.variants.map((v) => (
            <VariantCard key={v.id} variant={v} onSetActive={(active) => setActive.mutate({ id: v.id, active })} onUpdate={(patch) => update.mutate({ id: v.id, ...patch })} onDelete={() => { if (confirm(`Delete variant "${v.name}"? This can't be undone.`)) remove.mutate({ id: v.id }); }} />
          ))}
        </div>

        <div style={{ marginTop: "2rem" }}>
          {!creating ? (
            <button
              data-testid="add-variant-btn"
              onClick={() => setCreating(true)}
              style={{ background: "transparent", color: AMBER, border: `1px dashed ${AMBER}`, padding: "0.7rem 1.5rem", borderRadius: 6, fontFamily: SANS, fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}
            >
              + Add a new variant
            </button>
          ) : (
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: "1.25rem" }} data-testid="new-variant-card">
              <h3 style={{ fontFamily: SERIF, fontSize: "1.1rem", color: HI, margin: "0 0 0.9rem" }}>New variant</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.5rem", marginBottom: "0.5rem" }}>
                <input placeholder="key (e.g. legacy-v1)" value={draft.key} onChange={(e) => setDraft({ ...draft, key: e.target.value })} style={inputStyle} data-testid="new-variant-key" />
                <input placeholder="Display name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={inputStyle} data-testid="new-variant-name" />
              </div>
              <input placeholder="lens (continuity / vintage-fog / craft / audit / legacy / …)" value={draft.lens} onChange={(e) => setDraft({ ...draft, lens: e.target.value })} style={{ ...inputStyle, marginBottom: "0.5rem" }} data-testid="new-variant-lens" />
              <textarea
                placeholder={`Template with $\{firstName\}, $\{winery\}, $\{wineryOr\}, $\{url\}. Aim for 250-320 chars.`}
                value={draft.template}
                onChange={(e) => setDraft({ ...draft, template: e.target.value })}
                rows={5}
                style={{ ...inputStyle, fontFamily: MONO, fontSize: "0.82rem" }}
                data-testid="new-variant-template"
              />
              <div style={{ marginTop: "0.7rem", display: "flex", gap: "0.5rem" }}>
                <button
                  data-testid="save-new-variant"
                  onClick={() => create.mutate({ ...draft, active: false, sortIndex: 100 })}
                  disabled={!draft.key || !draft.name || !draft.lens || draft.template.length < 30 || create.isPending}
                  style={{ background: AMBER, color: "oklch(0.12 0.008 60)", border: 0, padding: "0.55rem 1.4rem", borderRadius: 4, fontFamily: SANS, fontWeight: 700, fontSize: "0.88rem", cursor: create.isPending ? "wait" : "pointer", opacity: (!draft.key || !draft.name || !draft.lens || draft.template.length < 30) ? 0.5 : 1 }}
                >
                  {create.isPending ? "Saving…" : "Save variant"}
                </button>
                <button
                  onClick={() => { setCreating(false); setDraft(EMPTY_DRAFT); }}
                  style={{ background: "transparent", color: MID, border: `1px solid ${BORDER}`, padding: "0.55rem 1rem", borderRadius: 4, fontFamily: SANS, fontSize: "0.88rem", cursor: "pointer" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const EMPTY_DRAFT = { key: "", name: "", lens: "", template: "" };

const inputStyle: React.CSSProperties = {
  background: RAISED,
  color: HI,
  border: `1px solid ${BORDER}`,
  padding: "0.55rem 0.75rem",
  borderRadius: 4,
  fontFamily: SANS,
  fontSize: "0.88rem",
  width: "100%",
  boxSizing: "border-box",
};

function VariantCard({ variant, onSetActive, onUpdate, onDelete }: { variant: Variant; onSetActive: (active: boolean) => void; onUpdate: (patch: { name?: string; lens?: string; template?: string; notes?: string; sortIndex?: number }) => void; onDelete: () => void }) {
  const [template, setTemplate] = useState(variant.template);
  const [name, setName] = useState(variant.name);
  const [lens, setLens] = useState(variant.lens);
  const [notes, setNotes] = useState(variant.notes ?? "");
  const preview = trpc.smsOpeners.preview.useQuery({ template });
  const dirty = template !== variant.template || name !== variant.name || lens !== variant.lens || (notes || "") !== (variant.notes || "");

  const charCount = template.length;
  const previewChars = preview.data?.charCount ?? 0;
  const isActive = variant.active === 1;

  return (
    <div
      data-testid={`variant-card-${variant.key}`}
      style={{
        background: CARD,
        border: `1px solid ${isActive ? AMBER : BORDER}`,
        borderRadius: 8,
        padding: "1.1rem 1.25rem",
        boxShadow: isActive ? `0 0 0 1px color-mix(in oklch, ${AMBER} 30%, transparent)` : "none",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <button
          data-testid={`toggle-active-${variant.key}`}
          onClick={() => onSetActive(!isActive)}
          style={{
            background: isActive ? AMBER : "transparent",
            color: isActive ? "oklch(0.12 0.008 60)" : MID,
            border: `1px solid ${isActive ? AMBER : BORDER}`,
            padding: "0.3rem 0.85rem",
            borderRadius: 999,
            fontFamily: SANS,
            fontSize: "0.72rem",
            fontWeight: 700,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            cursor: "pointer",
          }}
        >
          {isActive ? "● Active" : "○ Inactive"}
        </button>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          data-testid={`variant-name-${variant.key}`}
          style={{ flex: 1, background: "transparent", color: HI, border: 0, fontFamily: SERIF, fontSize: "1.1rem", fontWeight: 600, outline: "none", padding: "0.25rem 0", minWidth: 200 }}
        />
        <input
          value={lens}
          onChange={(e) => setLens(e.target.value)}
          data-testid={`variant-lens-${variant.key}`}
          title="Psychology angle tag"
          style={{ background: RAISED, color: MID, border: `1px solid ${BORDER}`, padding: "0.25rem 0.6rem", borderRadius: 3, fontFamily: MONO, fontSize: "0.72rem", width: 120 }}
        />
        <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: LO }}>#{variant.key}</span>
      </div>

      <label style={{ display: "block", marginBottom: "0.4rem" }}>
        <div style={{ fontFamily: SANS, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: LO, fontWeight: 700, marginBottom: "0.25rem", display: "flex", justifyContent: "space-between" }}>
          <span>Template</span>
          <span style={{ color: charCount > 320 ? "oklch(0.65 0.20 25)" : LO }}>{charCount} chars (template)</span>
        </div>
        <textarea
          value={template}
          onChange={(e) => setTemplate(e.target.value)}
          rows={4}
          data-testid={`variant-template-${variant.key}`}
          style={{ ...inputStyle, fontFamily: MONO, fontSize: "0.82rem", lineHeight: 1.55 }}
        />
      </label>

      {preview.data && (
        <div
          data-testid={`variant-preview-${variant.key}`}
          style={{
            marginTop: "0.4rem",
            padding: "0.7rem 0.9rem",
            background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
            border: `1px dashed ${AMBER}`,
            borderRadius: 4,
            fontFamily: SANS,
            fontSize: "0.85rem",
            color: HI,
            lineHeight: 1.55,
            whiteSpace: "pre-wrap",
          }}
        >
          <div style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, marginBottom: "0.35rem" }}>
            Preview → Fiona Donald · Seppeltsfield ({previewChars} chars rendered)
          </div>
          {preview.data.rendered}
        </div>
      )}

      <label style={{ display: "block", marginTop: "0.7rem" }}>
        <div style={{ fontFamily: SANS, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: LO, fontWeight: 700, marginBottom: "0.25rem" }}>
          Notes (why this variant, response-rate hunches — for your eyes only)
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          data-testid={`variant-notes-${variant.key}`}
          placeholder="e.g. testing week of Jul 21 — expecting higher response from small family-run wineries"
          style={{ ...inputStyle, fontFamily: SANS, fontSize: "0.82rem" }}
        />
      </label>

      <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.85rem", flexWrap: "wrap" }}>
        <button
          data-testid={`save-variant-${variant.key}`}
          disabled={!dirty}
          onClick={() => onUpdate({ name, lens, template, notes })}
          style={{
            background: dirty ? AMBER : "transparent",
            color: dirty ? "oklch(0.12 0.008 60)" : LO,
            border: `1px solid ${dirty ? AMBER : BORDER}`,
            padding: "0.45rem 1.15rem",
            borderRadius: 4,
            fontFamily: SANS,
            fontWeight: 700,
            fontSize: "0.82rem",
            cursor: dirty ? "pointer" : "not-allowed",
            opacity: dirty ? 1 : 0.5,
          }}
        >
          {dirty ? "Save changes" : "Saved"}
        </button>
        <button
          data-testid={`delete-variant-${variant.key}`}
          onClick={onDelete}
          style={{ background: "transparent", color: "oklch(0.55 0.20 25)", border: `1px solid color-mix(in oklch, oklch(0.55 0.20 25) 40%, transparent)`, padding: "0.45rem 1rem", borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer", marginLeft: "auto" }}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
