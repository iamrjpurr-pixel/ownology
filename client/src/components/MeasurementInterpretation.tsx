/**
 * MeasurementInterpretation — DR-01
 * Inline AI interpretation button for measurement log entries.
 * Renders a small "Interpret" button that calls the LLM and shows
 * a 2-4 sentence professional interpretation inline below the entry.
 */
import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Sparkles, ChevronDown, ChevronUp, Loader2 } from "lucide-react";

interface Props {
  tankName: string;
  variety: string;
  details: Record<string, unknown>;
  /** Optional: a brief string summary of recent entries for the same tank */
  recentContext?: string;
}

export default function MeasurementInterpretation({
  tankName,
  variety,
  details,
  recentContext,
}: Props) {
  const [expanded, setExpanded] = useState(false);
  const [interpretation, setInterpretation] = useState<string | null>(null);

  const interpret = trpc.vintageLog.interpretMeasurement.useMutation({
    onSuccess: (data) => {
      setInterpretation(data.interpretation);
      setExpanded(true);
    },
  });

  const handleClick = () => {
    if (interpretation) {
      // Toggle visibility if already fetched
      setExpanded((v) => !v);
      return;
    }
    interpret.mutate({ tankName, variety, details, recentContext });
  };

  return (
    <div className="mt-2">
      {/* Trigger button */}
      <button
        onClick={handleClick}
        disabled={interpret.isPending}
        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded transition-colors"
        style={{
          background: "oklch(0.72 0.12 75 / 10%)",
          color: "oklch(0.72 0.12 75)",
          border: "1px solid oklch(0.72 0.12 75 / 25%)",
          cursor: interpret.isPending ? "wait" : "pointer",
        }}
      >
        {interpret.isPending ? (
          <Loader2 className="w-3 h-3 animate-spin" />
        ) : (
          <Sparkles className="w-3 h-3" />
        )}
        {interpret.isPending
          ? "Interpreting…"
          : interpretation
          ? expanded
            ? "Hide interpretation"
            : "Show interpretation"
          : "Interpret"}
        {interpretation && !interpret.isPending && (
          expanded ? (
            <ChevronUp className="w-3 h-3 ml-0.5" />
          ) : (
            <ChevronDown className="w-3 h-3 ml-0.5" />
          )
        )}
      </button>

      {/* Interpretation panel */}
      {expanded && interpretation && (
        <div
          className="mt-2 rounded p-3 text-sm leading-relaxed"
          style={{
            background: "oklch(0.16 0.010 60)",
            border: "1px solid oklch(0.72 0.12 75 / 20%)",
            color: "oklch(0.78 0.015 75)",
            fontFamily: "'Lato', sans-serif",
          }}
        >
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="w-3 h-3 flex-shrink-0" style={{ color: "oklch(0.72 0.12 75)" }} />
            <span
              className="text-xs uppercase tracking-widest"
              style={{ color: "oklch(0.55 0.012 75)" }}
            >
              Ownology Interpretation
            </span>
          </div>
          <p style={{ lineHeight: 1.65 }}>{interpretation}</p>
        </div>
      )}

      {/* Error state */}
      {interpret.isError && (
        <p className="mt-1 text-xs" style={{ color: "oklch(0.65 0.15 25)" }}>
          Interpretation failed — please try again.
        </p>
      )}
    </div>
  );
}
