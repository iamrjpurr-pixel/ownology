/**
 * /admin/event-ingest — Event lineup → CRM prospects, in one paste.
 *
 * Workflow:
 *   1. Paste any wine-event URL (Humanitix, Eventbrite, festival page).
 *   2. Backend fetches + LLM-extracts: event metadata + producer lineup.
 *   3. Operator ticks the producers worth researching.
 *   4. Per-row Perplexity deep-research generates a contact draft.
 *   5. Batch-save selected drafts into the CRM with `event` pre-filled
 *      and a warm-open line baked into their /hi/:slug landing page.
 *
 * Design notes:
 *   - Sequential Perplexity calls (~15-30s each) — we run them one at a
 *     time to stay under Sonar's rate limit and to keep the UI honest
 *     about progress.
 *   - We stash EventDate + Venue into the notes field so HiContact can
 *     render context-aware warm-opens ("see you at" vs "loved your").
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Producer = {
  winery: string;
  winemakerName: string | null;
  role: string | null;
  notes: string | null;
};

type EventDraft = {
  eventName: string | null;
  eventDateIso: string | null;
  eventDateDisplay: string | null;
  venue: string | null;
  address: string | null;
  city: string | null;
  ticketsUrl: string | null;
  eventKind: string | null;
  producers: Producer[];
};

type ResearchState =
  | { status: "pending" }
  | { status: "running" }
  | { status: "done"; draft: Record<string, unknown> | null; suggestedPersona: string; emailGuesses: string[]; citations: string[] }
  | { status: "error"; message: string }
  | { status: "saved"; slug: string };

function slugify(...parts: string[]): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export default function AdminEventIngest() {
  const [url, setUrl] = useState("");
  const [event, setEvent] = useState<EventDraft | null>(null);
  const [eventStatus, setEventStatus] = useState<"past" | "future" | "unknown">("unknown");
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [research, setResearch] = useState<Record<number, ResearchState>>({});
  const [isResearching, setIsResearching] = useState(false);

  const parseMutation = trpc.outreach.parseEventUrl.useMutation();
  const deepResearchMutation = trpc.outreach.deepResearch.useMutation();
  const createMutation = trpc.outreach.create.useMutation();

  const producers = event?.producers ?? [];
  const selectedCount = selected.size;
  const savedCount = useMemo(
    () => Object.values(research).filter((r) => r.status === "saved").length,
    [research]
  );

  async function handleParse(e: React.FormEvent) {
    e.preventDefault();
    if (!url.trim()) return;
    setEvent(null);
    setSelected(new Set());
    setResearch({});
    try {
      const result = await parseMutation.mutateAsync({ url: url.trim() });
      if (!result.draft || !result.draft.eventName) {
        alert("That doesn't look like a wine event page — no event name or producers found.");
        return;
      }
      setEvent(result.draft);
      setEventStatus(result.eventStatus);
      // Auto-tick every named producer (operator can untick).
      setSelected(new Set(result.draft.producers.map((_, i) => i)));
    } catch (err) {
      alert(`Parse failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  function toggle(idx: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  async function handleResearchAll() {
    if (!event || selected.size === 0) return;
    setIsResearching(true);
    const indices = Array.from(selected).sort((a, b) => a - b);
    // Init all to "pending".
    setResearch((prev) => {
      const next = { ...prev };
      for (const i of indices) next[i] = { status: "pending" };
      return next;
    });

    for (const idx of indices) {
      const producer = event.producers[idx];
      if (!producer) continue;

      setResearch((prev) => ({ ...prev, [idx]: { status: "running" } }));

      // Build a rich search string — winery + winemaker name gives Sonar
      // a much better hit rate than winery alone.
      const searchName = producer.winemakerName
        ? `${producer.winemakerName} — ${producer.winery} (Australian wine)`
        : `${producer.winery} winery Australia`;

      try {
        const result = await deepResearchMutation.mutateAsync({ businessName: searchName });
        setResearch((prev) => ({
          ...prev,
          [idx]: {
            status: "done",
            draft: result.draft as Record<string, unknown> | null,
            suggestedPersona: result.suggestedPersona,
            emailGuesses: result.emailGuesses,
            citations: result.citations,
          },
        }));
      } catch (err) {
        setResearch((prev) => ({
          ...prev,
          [idx]: { status: "error", message: err instanceof Error ? err.message : String(err) },
        }));
      }
    }
    setIsResearching(false);
  }

  async function handleSave(idx: number) {
    if (!event) return;
    const producer = event.producers[idx];
    const r = research[idx];
    if (!producer || !r || r.status !== "done" || !r.draft) return;

    const draft = r.draft;
    const firstName = String(draft.firstName ?? producer.winemakerName?.split(" ")[0] ?? "").trim();
    if (!firstName) {
      alert("No first name to save — Perplexity couldn't identify a named contact.");
      return;
    }
    const lastName = String(draft.lastName ?? "").trim() || undefined;
    const winery = String(draft.winery ?? producer.winery).trim();
    const mobile = String(draft.mobileAu ?? "").trim() || undefined;

    // Build notes with event context stashed so HiContact can pick it up.
    const notesParts: string[] = [];
    if (event.eventDateIso) notesParts.push(`EventDate: ${event.eventDateIso}`);
    if (event.venue) notesParts.push(`Venue: ${event.venue}`);
    if (event.city) notesParts.push(`City: ${event.city}`);
    if (draft.instagram) notesParts.push(`IG: @${String(draft.instagram).replace(/^@/, "")}`);
    if (draft.instagramPersonal) notesParts.push(`IG-personal: @${String(draft.instagramPersonal).replace(/^@/, "")}`);
    if (draft.linkedin) notesParts.push(`LinkedIn: ${draft.linkedin}`);
    if (draft.email) notesParts.push(`Email: ${draft.email}`);
    if (draft.website) notesParts.push(`Web: ${draft.website}`);
    if (draft.region) notesParts.push(`Region: ${draft.region}`);
    if (producer.notes) notesParts.push(`Context: ${producer.notes}`);
    if (draft.notes) notesParts.push(String(draft.notes));

    const persona = (["md", "winemaker", "owner", "sales-rep"].includes(r.suggestedPersona)
      ? r.suggestedPersona
      : "winemaker") as "md" | "winemaker" | "owner" | "sales-rep";

    try {
      const res = await createMutation.mutateAsync({
        firstName,
        lastName,
        mobileAu: mobile,
        winery: winery || undefined,
        event: event.eventName ?? undefined,
        painPoint: draft.painPoint ? String(draft.painPoint) : undefined,
        notes: notesParts.join(" · ").slice(0, 500) || undefined,
        slug: slugify(firstName, winery),
        persona,
        status: "cold",
      });
      setResearch((prev) => ({ ...prev, [idx]: { status: "saved", slug: res.slug } }));
    } catch (err) {
      alert(`Save failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  const doneCount = Object.values(research).filter((r) => r.status === "done").length;
  const errorCount = Object.values(research).filter((r) => r.status === "error").length;

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", color: "var(--ow-text-hi)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}>
              Outreach Ops
            </p>
            <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "clamp(1.75rem, 4vw, 2.5rem)", margin: "0.25rem 0 0", lineHeight: 1.1 }}>
              Event Ingest
            </h1>
            <p className="text-sm" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", marginTop: "0.5rem", maxWidth: 640 }}>
              Paste a wine-event URL. We&apos;ll pull the full producer lineup, run
              Perplexity deep-research on each, and drop them into the CRM with
              the event pre-filled — so every <code>/hi/:slug</code> pitch gets a
              natural warm-open line.
            </p>
          </div>
          <Link
            href="/admin/contacts"
            data-testid="back-to-contacts"
            style={{
              padding: "0.5rem 1rem",
              background: "var(--ow-bg-card)",
              color: "var(--ow-text-hi)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            ← Contacts CRM
          </Link>
        </div>

        {/* Step 1: paste URL */}
        <form
          onSubmit={handleParse}
          data-testid="event-url-form"
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
            border: "1.5px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
            borderRadius: 6,
            padding: "1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}>
              Step 1 — Paste event URL
            </p>
            <p className="text-xs" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>
              Humanitix · Eventbrite · winery page · festival site
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://events.humanitix.com/lost-in-the-fog"
              disabled={parseMutation.isPending}
              data-testid="event-url-input"
              style={{
                flex: 1,
                minWidth: 280,
                padding: "0.65rem 0.85rem",
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                borderRadius: 4,
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.9rem",
              }}
            />
            <button
              type="submit"
              disabled={parseMutation.isPending || url.trim().length < 8}
              data-testid="parse-event-btn"
              style={{
                padding: "0.65rem 1.4rem",
                background: "var(--ow-amber)",
                color: "oklch(0.10 0.008 60)",
                border: "none",
                borderRadius: 4,
                fontFamily: "'Lato',sans-serif",
                fontWeight: 700,
                fontSize: "0.9rem",
                cursor: parseMutation.isPending || url.trim().length < 8 ? "not-allowed" : "pointer",
                opacity: parseMutation.isPending || url.trim().length < 8 ? 0.5 : 1,
              }}
            >
              {parseMutation.isPending ? "Parsing…" : "Pull lineup"}
            </button>
          </div>
          {parseMutation.isError && (
            <p className="text-xs mt-2" style={{ color: "#dc2626", fontFamily: "'Lato',sans-serif" }} data-testid="parse-error">
              {parseMutation.error?.message}
            </p>
          )}
        </form>

        {/* Step 2: Event card + producer checklist */}
        {event && (
          <>
            <div
              data-testid="event-summary"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                borderRadius: 6,
                padding: "1.25rem",
                marginBottom: "1rem",
              }}
            >
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-3">
                <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.5rem", margin: 0 }}>
                  {event.eventName ?? "Untitled event"}
                </h2>
                <span
                  data-testid="event-status-chip"
                  style={{
                    padding: "0.25rem 0.7rem",
                    borderRadius: 999,
                    fontSize: "0.7rem",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                    background:
                      eventStatus === "future"
                        ? "color-mix(in oklch, #16a34a 20%, transparent)"
                        : eventStatus === "past"
                        ? "color-mix(in oklch, #6b7280 20%, transparent)"
                        : "color-mix(in oklch, #ca8a04 20%, transparent)",
                    color:
                      eventStatus === "future" ? "#16a34a" : eventStatus === "past" ? "#6b7280" : "#ca8a04",
                  }}
                >
                  {eventStatus === "future" ? "Upcoming" : eventStatus === "past" ? "Past event" : "Date unknown"}
                </span>
              </div>
              <div style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-lo)", lineHeight: 1.7 }}>
                {event.eventDateDisplay && <div>📅 {event.eventDateDisplay}</div>}
                {event.venue && (
                  <div>
                    📍 {event.venue}
                    {event.address ? `, ${event.address}` : event.city ? `, ${event.city}` : ""}
                  </div>
                )}
                {event.ticketsUrl && (
                  <div>
                    🎟{" "}
                    <a href={event.ticketsUrl} target="_blank" rel="noreferrer" style={{ color: "var(--ow-amber)" }}>
                      Tickets
                    </a>
                  </div>
                )}
                {event.eventKind && <div>🏷 {event.eventKind}</div>}
              </div>
            </div>

            <div className="flex items-baseline justify-between mb-3 flex-wrap gap-2">
              <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}>
                Step 2 — Tick producers to research
              </p>
              <div className="flex gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setSelected(new Set(producers.map((_, i) => i)))}
                  data-testid="select-all-btn"
                  style={{ padding: "0.35rem 0.75rem", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }}
                >
                  All ({producers.length})
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set())}
                  data-testid="select-none-btn"
                  style={{ padding: "0.35rem 0.75rem", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }}
                >
                  None
                </button>
                <button
                  type="button"
                  onClick={() => setSelected(new Set(producers.map((_, i) => i).filter((i) => producers[i].winemakerName)))}
                  data-testid="select-named-btn"
                  style={{ padding: "0.35rem 0.75rem", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4, fontSize: "0.75rem", cursor: "pointer" }}
                >
                  Only named ({producers.filter((p) => p.winemakerName).length})
                </button>
                <button
                  type="button"
                  onClick={handleResearchAll}
                  disabled={isResearching || selectedCount === 0}
                  data-testid="research-selected-btn"
                  style={{
                    padding: "0.35rem 1rem",
                    background: "var(--ow-amber)",
                    color: "oklch(0.10 0.008 60)",
                    border: "none",
                    borderRadius: 4,
                    fontSize: "0.75rem",
                    fontWeight: 700,
                    cursor: isResearching || selectedCount === 0 ? "not-allowed" : "pointer",
                    opacity: isResearching || selectedCount === 0 ? 0.5 : 1,
                  }}
                >
                  {isResearching
                    ? `Researching… (${doneCount + errorCount}/${selectedCount})`
                    : `Research ${selectedCount} selected →`}
                </button>
              </div>
            </div>

            <div style={{ display: "grid", gap: "0.5rem", marginBottom: "1.5rem" }}>
              {producers.map((p, i) => {
                const r = research[i];
                const isSelected = selected.has(i);
                return (
                  <div
                    key={i}
                    data-testid={`producer-row-${i}`}
                    style={{
                      background: "var(--ow-bg-card)",
                      border: `1px solid ${isSelected ? "color-mix(in oklch, var(--ow-amber) 60%, transparent)" : "var(--ow-border)"}`,
                      borderRadius: 6,
                      padding: "0.85rem 1rem",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "0.75rem",
                      fontFamily: "'Lato',sans-serif",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => toggle(i)}
                      disabled={isResearching || r?.status === "saved"}
                      data-testid={`producer-checkbox-${i}`}
                      style={{ marginTop: "0.3rem", cursor: "pointer" }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--ow-text-hi)" }}>
                        {p.winery}
                        {p.winemakerName && (
                          <span style={{ marginLeft: "0.5rem", fontWeight: 400, color: "var(--ow-text-lo)", fontSize: "0.85rem" }}>
                            — {p.winemakerName}
                            {p.role && ` (${p.role})`}
                          </span>
                        )}
                      </div>
                      {p.notes && (
                        <div style={{ fontSize: "0.8rem", color: "var(--ow-text-lo)", marginTop: "0.25rem", lineHeight: 1.5 }}>
                          {p.notes}
                        </div>
                      )}
                      {/* Research + Save UI */}
                      {r && r.status !== "pending" && (
                        <ResearchResultBlock
                          state={r}
                          onSave={() => handleSave(i)}
                          isSaving={createMutation.isPending}
                        />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {savedCount > 0 && (
              <div
                data-testid="saved-summary"
                style={{
                  background: "color-mix(in oklch, #16a34a 12%, transparent)",
                  border: "1px solid color-mix(in oklch, #16a34a 40%, transparent)",
                  borderRadius: 6,
                  padding: "1rem 1.25rem",
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.9rem",
                }}
              >
                ✓ Saved <strong>{savedCount}</strong> contact{savedCount === 1 ? "" : "s"} to the CRM.{" "}
                <Link href="/admin/contacts" style={{ color: "var(--ow-amber)" }}>
                  Open Contacts CRM →
                </Link>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function ResearchResultBlock({
  state,
  onSave,
  isSaving,
}: {
  state: ResearchState;
  onSave: () => void;
  isSaving: boolean;
}) {
  if (state.status === "running") {
    return (
      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--ow-amber)" }}>
        ⏳ Perplexity searching…
      </div>
    );
  }
  if (state.status === "error") {
    return (
      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#dc2626" }} data-testid="research-error">
        ✕ {state.message}
      </div>
    );
  }
  if (state.status === "saved") {
    return (
      <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "#16a34a" }} data-testid="saved-badge">
        ✓ Saved to CRM ·{" "}
        <a href={`/hi/${state.slug}`} target="_blank" rel="noreferrer" style={{ color: "var(--ow-amber)" }}>
          /hi/{state.slug} →
        </a>
      </div>
    );
  }
  if (state.status === "done") {
    const draft = state.draft;
    if (!draft) {
      return (
        <div style={{ marginTop: "0.75rem", fontSize: "0.8rem", color: "var(--ow-text-lo)" }}>
          Perplexity found nothing useful for this producer.
        </div>
      );
    }
    return (
      <div
        style={{
          marginTop: "0.75rem",
          padding: "0.75rem",
          background: "var(--ow-bg)",
          border: "1px solid var(--ow-border)",
          borderRadius: 4,
          fontSize: "0.8rem",
          color: "var(--ow-text-lo)",
          lineHeight: 1.6,
        }}
        data-testid="research-result"
      >
        <div>
          <strong style={{ color: "var(--ow-text-hi)" }}>
            {String(draft.firstName ?? "?")} {String(draft.lastName ?? "")}
          </strong>{" "}
          {draft.role ? <span>— {String(draft.role)}</span> : null}
        </div>
        {draft.mobileAu ? <div>📞 {String(draft.mobileAu)}</div> : null}
        {draft.email ? <div>✉ {String(draft.email)}</div> : null}
        {draft.instagram ? <div>📸 @{String(draft.instagram)}</div> : null}
        {draft.painPoint ? <div style={{ marginTop: "0.35rem", fontStyle: "italic" }}>&ldquo;{String(draft.painPoint)}&rdquo;</div> : null}
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <span
            style={{
              padding: "0.15rem 0.5rem",
              borderRadius: 999,
              fontSize: "0.7rem",
              background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
              color: "var(--ow-amber)",
              textTransform: "uppercase",
              letterSpacing: "0.05em",
              fontWeight: 700,
            }}
          >
            Persona: {state.suggestedPersona}
          </span>
          <button
            type="button"
            onClick={onSave}
            disabled={isSaving}
            data-testid="save-contact-btn"
            style={{
              padding: "0.35rem 0.9rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: 4,
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: isSaving ? "not-allowed" : "pointer",
              opacity: isSaving ? 0.5 : 1,
              marginLeft: "auto",
            }}
          >
            {isSaving ? "Saving…" : "+ Add to CRM"}
          </button>
        </div>
      </div>
    );
  }
  return null;
}
