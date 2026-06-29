/**
 * /admin/contacts/pipeline — Trello-style sales pipeline board.
 *
 * Five columns, derived from existing outreach_contacts timestamps:
 *   Lead      → no SMS sent yet (status=warm/lukewarm/cold, NOT sales/skip)
 *   Sent      → smsSentAt set, viewCount=0
 *   Awaiting  → smsSentAt set, viewCount>0, no reply, no booking
 *   Replied   → repliedAt set, not booked
 *   Booked    → demoBookedAt set
 *
 * HTML5 native drag-and-drop (no external lib). Drop fires
 * `outreach.setPipelineStage` which atomically rewrites the timestamps so
 * the derived view stays consistent on the next refetch.
 *
 * Sales/skip-tagged contacts are filtered out — they're vendors or
 * deliberately-archived; they belong on /admin/contacts only.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type Stage = "lead" | "sent" | "awaiting" | "replied" | "booked";

type Contact = {
  slug: string;
  firstName: string;
  lastName: string | null;
  winery: string | null;
  event: string | null;
  mobileAu: string | null;
  status: string | null;
  smsSentAt: number | null;
  firstViewedAt: number | null;
  viewCount: number | null;
  repliedAt: number | null;
  demoBookedAt: number | null;
};

const STAGES: { id: Stage; label: string; color: string; description: string }[] = [
  { id: "lead",     label: "Lead",     color: "#6b7280", description: "Not messaged yet" },
  { id: "sent",     label: "Sent",     color: "#0ea5e9", description: "SMS out — no read receipt" },
  { id: "awaiting", label: "Awaiting", color: "#b45309", description: "Opened the link, no reply yet" },
  { id: "replied",  label: "Replied",  color: "#7c3aed", description: "Replied to the SMS" },
  { id: "booked",   label: "Booked",   color: "#10b981", description: "Demo booked on Calendly" },
];

function deriveStage(c: Contact): Stage | null {
  if (c.status === "sales" || c.status === "skip") return null;
  if (c.demoBookedAt) return "booked";
  if (c.repliedAt) return "replied";
  if (c.smsSentAt && (c.viewCount ?? 0) > 0) return "awaiting";
  if (c.smsSentAt) return "sent";
  return "lead";
}

function fmtAgo(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

export default function AdminContactsPipeline() {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.outreach.list.useQuery();
  const setStage = trpc.outreach.setPipelineStage.useMutation();

  const [draggedSlug, setDraggedSlug] = useState<string | null>(null);
  const [hoverStage, setHoverStage] = useState<Stage | null>(null);

  // Group contacts by derived stage; sales/skip filtered out
  const byStage = useMemo(() => {
    const buckets: Record<Stage, Contact[]> = { lead: [], sent: [], awaiting: [], replied: [], booked: [] };
    for (const c of (data?.contacts ?? []) as Contact[]) {
      const s = deriveStage(c);
      if (!s) continue;
      buckets[s].push(c);
    }
    return buckets;
  }, [data]);

  const totalInPipeline = useMemo(
    () => Object.values(byStage).reduce((sum, arr) => sum + arr.length, 0),
    [byStage]
  );

  // Calendly-booked = our north-star metric
  const conversionPct = useMemo(() => {
    if (totalInPipeline === 0) return 0;
    return Number(((byStage.booked.length / totalInPipeline) * 100).toFixed(1));
  }, [byStage, totalInPipeline]);

  function handleDrop(targetStage: Stage) {
    if (!draggedSlug) return;
    const currentStage = deriveStage(
      ((data?.contacts ?? []) as Contact[]).find((c) => c.slug === draggedSlug)!
    );
    setDraggedSlug(null);
    setHoverStage(null);
    if (currentStage === targetStage) return; // no-op
    setStage.mutate(
      { slug: draggedSlug, stage: targetStage },
      { onSuccess: () => utils.outreach.list.invalidate() }
    );
  }

  return (
    <div data-testid="admin-pipeline-page" className="container py-8" style={{ maxWidth: 1400 }}>
      <div className="mb-6">
        <Link href="/admin/contacts" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
          ← Back to contacts list
        </Link>
        <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
          Sales Pipeline
        </p>
        <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
          Outreach board
        </h1>
        <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
          Drag a card across columns to update its stage. Cards move forward automatically as soon as the prospect
          opens the SMS link (<em>Sent → Awaiting</em>). Sales/vendor contacts are filtered out here — they live on the contacts list.
        </p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="In pipeline" value={totalInPipeline} testid="pipeline-kpi-total" />
        <Kpi label="Awaiting reply" value={byStage.awaiting.length + byStage.replied.length} testid="pipeline-kpi-engaged" />
        <Kpi label="Booked demos" value={byStage.booked.length} testid="pipeline-kpi-booked" />
        <Kpi label="Booking rate" value={`${conversionPct}%`} testid="pipeline-kpi-rate" />
      </div>

      {isLoading && <p style={{ color: "var(--ow-text-mid)" }}>Loading pipeline…</p>}

      {/* Board */}
      <div
        data-testid="pipeline-board"
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
          gap: 12,
        }}
      >
        {STAGES.map((stage) => {
          const cards = byStage[stage.id];
          const isHover = hoverStage === stage.id;
          return (
            <div
              key={stage.id}
              data-testid={`pipeline-column-${stage.id}`}
              onDragOver={(e) => {
                e.preventDefault();
                setHoverStage(stage.id);
              }}
              onDragLeave={() => setHoverStage((cur) => (cur === stage.id ? null : cur))}
              onDrop={() => handleDrop(stage.id)}
              style={{
                background: isHover
                  ? `color-mix(in oklch, ${stage.color} 18%, var(--ow-bg-card))`
                  : "var(--ow-bg-card)",
                border: `1px solid ${isHover ? stage.color : "var(--ow-border)"}`,
                borderRadius: 8,
                padding: 10,
                minHeight: 360,
                transition: "background 120ms ease, border-color 120ms ease",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <span
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: "50%",
                    background: stage.color,
                    flexShrink: 0,
                  }}
                />
                <h2
                  style={{
                    fontFamily: "'Lato',sans-serif",
                    fontSize: "0.78rem",
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "var(--ow-text-hi)",
                    fontWeight: 700,
                    margin: 0,
                    flexGrow: 1,
                  }}
                >
                  {stage.label}
                </h2>
                <span
                  data-testid={`pipeline-count-${stage.id}`}
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.78rem",
                    color: "var(--ow-text-lo)",
                  }}
                >
                  {cards.length}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.7rem",
                  color: "var(--ow-text-lo)",
                  margin: "0 0 12px 0",
                  fontStyle: "italic",
                }}
              >
                {stage.description}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {cards.length === 0 && (
                  <p
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.75rem",
                      color: "var(--ow-text-lo)",
                      margin: 0,
                      padding: "1.5rem 0",
                      textAlign: "center",
                      opacity: 0.5,
                    }}
                  >
                    No contacts
                  </p>
                )}
                {cards.map((c) => (
                  <PipelineCard
                    key={c.slug}
                    contact={c}
                    stageColor={stage.color}
                    onDragStart={() => setDraggedSlug(c.slug)}
                    onDragEnd={() => {
                      setDraggedSlug(null);
                      setHoverStage(null);
                    }}
                    isDragging={draggedSlug === c.slug}
                  />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <p
        className="mt-6"
        style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}
      >
        Tip: cards in <strong>Awaiting</strong> have already opened the link — they&apos;re your hottest list. A
        soft follow-up SMS in the next 24h converts at 2-3× the cold rate.
      </p>
    </div>
  );
}

function PipelineCard({
  contact,
  stageColor,
  onDragStart,
  onDragEnd,
  isDragging,
}: {
  contact: Contact;
  stageColor: string;
  onDragStart: () => void;
  onDragEnd: () => void;
  isDragging: boolean;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        e.dataTransfer.setData("text/plain", contact.slug);
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      data-testid={`pipeline-card-${contact.slug}`}
      style={{
        background: "color-mix(in oklch, var(--ow-bg-card) 70%, transparent)",
        border: `1px solid ${stageColor}`,
        borderLeft: `3px solid ${stageColor}`,
        borderRadius: 4,
        padding: "8px 10px",
        cursor: "grab",
        opacity: isDragging ? 0.4 : 1,
        transition: "opacity 100ms ease",
      }}
    >
      <p
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: "0.92rem",
          color: "var(--ow-text-hi)",
          margin: 0,
          fontWeight: 600,
        }}
      >
        {contact.firstName} {contact.lastName ?? ""}
      </p>
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.72rem",
          color: "var(--ow-text-lo)",
          margin: "2px 0 0",
          lineHeight: 1.3,
        }}
      >
        {contact.winery ?? "—"}
      </p>
      <div
        style={{
          display: "flex",
          gap: 6,
          marginTop: 6,
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.66rem",
          color: "var(--ow-text-lo)",
        }}
      >
        {(contact.viewCount ?? 0) > 0 && (
          <span title="Times the prospect opened the link">
            👁 {contact.viewCount}
          </span>
        )}
        {contact.smsSentAt && (
          <span title="Time since SMS sent">📨 {fmtAgo(contact.smsSentAt)}</span>
        )}
        {contact.repliedAt && (
          <span title="Time since reply">💬 {fmtAgo(contact.repliedAt)}</span>
        )}
        {contact.demoBookedAt && (
          <span title="Time since booking">✅ {fmtAgo(contact.demoBookedAt)}</span>
        )}
      </div>
    </div>
  );
}

function Kpi({ label, value, testid }: { label: string; value: number | string; testid: string }) {
  return (
    <div
      data-testid={testid}
      className="rounded p-3"
      style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}
    >
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.68rem",
          textTransform: "uppercase",
          letterSpacing: "0.1em",
          color: "var(--ow-text-lo)",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Fraunces',serif",
          fontSize: "1.5rem",
          fontWeight: 700,
          color: "var(--ow-text-hi)",
          margin: "4px 0 0",
        }}
      >
        {value}
      </p>
    </div>
  );
}
