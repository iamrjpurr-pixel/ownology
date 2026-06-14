/**
 * LotTraceability — DR-12
 * Shows all Bottling Run log entries with their lot numbers, linked to batch
 * records for a complete lot-to-batch trace. Renders in The Press Batch Book tab.
 */

import { trpc } from "@/lib/trpc";

function FieldRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-2 items-baseline">
      <span
        style={{
          fontFamily: "'Fira Code', monospace",
          fontSize: "0.7rem",
          color: "oklch(0.50 0.012 75)",
          minWidth: "110px",
          flexShrink: 0,
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.82rem",
          color: "oklch(0.85 0.015 75)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function LotTraceability() {
  const { data: entries = [], isLoading } = trpc.vintageLog.list.useQuery({ limit: 200 });
  const { data: batches = [] } = trpc.wineBatch.list.useQuery();

  // Filter to bottling_run entries only
  const bottlingEntries = entries.filter((e) => e.eventType === "bottling_run");

  if (isLoading) {
    return (
      <div
        style={{
          padding: "2rem",
          textAlign: "center",
          color: "oklch(0.50 0.012 75)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
        }}
      >
        Loading lot records…
      </div>
    );
  }

  if (bottlingEntries.length === 0) {
    return (
      <div
        style={{
          padding: "2rem 1rem",
          textAlign: "center",
          color: "oklch(0.50 0.012 75)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
          lineHeight: 1.6,
        }}
      >
        <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>🍾</div>
        <p style={{ color: "oklch(0.75 0.015 75)", marginBottom: "0.5rem", fontWeight: 500 }}>
          No bottling runs logged yet
        </p>
        <p>
          Log a <strong>Bottling Run</strong> event in the Vintage Log to create a
          traceable lot record here.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        style={{
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.75rem",
          color: "oklch(0.50 0.012 75)",
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          paddingBottom: "0.5rem",
          borderBottom: "1px solid oklch(1 0 0 / 8%)",
        }}
      >
        Lot Traceability — {bottlingEntries.length} bottling run{bottlingEntries.length !== 1 ? "s" : ""}
      </div>

      {bottlingEntries.map((entry) => {
        const d = entry.details as Record<string, string>;
        // Find matching batch by tank name
        const matchedBatch = batches.find(
          (b) => b.tankName?.toLowerCase() === entry.tankName?.toLowerCase()
        );

        return (
          <div
            key={entry.id}
            style={{
              background: "oklch(0.14 0.008 60)",
              border: "1px solid oklch(1 0 0 / 8%)",
              borderLeft: "3px solid oklch(0.72 0.12 75)",
              borderRadius: "8px",
              padding: "1rem",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <span style={{ fontSize: "1rem" }}>🍾</span>
                <span
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontSize: "0.95rem",
                    color: "oklch(0.92 0.018 75)",
                    fontWeight: 600,
                  }}
                >
                  {d.lotNumber ?? "No lot number"}
                </span>
              </div>
              <span
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.7rem",
                  color: "oklch(0.50 0.012 75)",
                }}
              >
                {new Date(entry.entryAt).toLocaleDateString("en-AU", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </span>
            </div>

            {/* Bottling details */}
            <div className="flex flex-col gap-1.5 mb-3">
              <FieldRow label="Tank / Vessel" value={entry.tankName} />
              <FieldRow label="Variety" value={entry.variety} />
              <FieldRow label="Volume" value={d.volumeL ? `${d.volumeL} L` : undefined} />
              <FieldRow label="Format" value={d.format} />
              <FieldRow label="Label" value={d.labelName} />
              {d.notes && <FieldRow label="Notes" value={d.notes} />}
              {entry.noteText && <FieldRow label="Log note" value={entry.noteText} />}
            </div>

            {/* Batch link */}
            {matchedBatch ? (
              <div
                style={{
                  background: "oklch(0.72 0.12 75 / 6%)",
                  border: "1px solid oklch(0.72 0.12 75 / 20%)",
                  borderRadius: "6px",
                  padding: "0.6rem 0.75rem",
                }}
              >
                <div
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.65rem",
                    color: "oklch(0.72 0.12 75)",
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    marginBottom: "0.4rem",
                  }}
                >
                  Linked Batch Record
                </div>
                <div className="flex flex-col gap-1">
                  <FieldRow label="Batch ID" value={matchedBatch.batchId} />
                  <FieldRow label="Vintage" value={matchedBatch.vintage?.toString()} />
                  <FieldRow label="GI / Region" value={matchedBatch.gi} />
                  <FieldRow label="Grower" value={matchedBatch.growerDetails} />
                </div>
              </div>
            ) : (
              <div
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.75rem",
                  color: "oklch(0.50 0.012 75)",
                  fontStyle: "italic",
                }}
              >
                No batch record linked to tank "{entry.tankName}" — register a batch in the Batch Book to complete this trace.
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
