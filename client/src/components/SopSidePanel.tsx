/**
 * SopSidePanel — S8-C (Do→Know bridge)
 *
 * Renders one or more SOPs for a given category inside a slide-in Sheet,
 * without navigating away from the calling form. Shows the SOP title,
 * quick_steps (cellar-ready bullets) if present, and the full procedure text.
 *
 * Design: passive, dismissable, read-only. The winemaker can open it for
 * reference and close it with form state fully preserved.
 */
import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc";
import { Loader2, BookOpen, ListChecks } from "lucide-react";

interface SopSidePanelProps {
  /** SOP category to load (must match a sop_library.category value) */
  category: string;
  /** Human-friendly label shown in the header, e.g. "Racking" */
  eventLabel: string;
  /** Controls open state */
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Parse quick_steps text into an array of bullet lines. */
function parseQuickSteps(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return raw
    .split(/\r?\n|•|\u2022/)
    .map((s) => s.replace(/^[\s\-*]+/, "").trim())
    .filter((s) => s.length > 0);
}

export default function SopSidePanel({
  category,
  eventLabel,
  open,
  onOpenChange,
}: SopSidePanelProps) {
  const { data: sops, isLoading } = trpc.knowledge.listSops.useQuery(
    { category, audience: "commercial" },
    { enabled: open },
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-lg overflow-y-auto"
        style={{ background: "#FFFFFF" }}
      >
        <SheetHeader>
          <SheetTitle
            style={{
              fontFamily: "'Lato', sans-serif",
              color: "#1A1A1A",
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
            }}
          >
            <BookOpen size={18} style={{ color: "#7A1F2B" }} />
            {eventLabel} — Reference SOP
          </SheetTitle>
          <SheetDescription style={{ color: "#6B7280" }}>
            Quick reference. Your log entry is preserved — close this panel any time.
          </SheetDescription>
        </SheetHeader>

        <div style={{ marginTop: "1.25rem", paddingBottom: "2rem" }}>
          {isLoading && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                color: "#6B7280",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              <Loader2 size={16} className="animate-spin" /> Loading SOP…
            </div>
          )}

          {!isLoading && (!sops || sops.length === 0) && (
            <p style={{ color: "#6B7280", fontFamily: "'Lato', sans-serif" }}>
              No SOP found for this event type yet.
            </p>
          )}

          {!isLoading &&
            sops &&
            sops.map((sop) => {
              const steps = parseQuickSteps(sop.quickSteps);
              return (
                <div key={sop.id} style={{ marginBottom: "1.75rem" }}>
                  <h3
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 700,
                      fontSize: "1.05rem",
                      color: "#1A1A1A",
                      marginBottom: "0.5rem",
                    }}
                  >
                    {sop.title}
                  </h3>

                  {steps.length > 0 && (
                    <div
                      style={{
                        background: "#FBF6EF",
                        border: "1px solid #EADFCE",
                        borderRadius: "10px",
                        padding: "0.875rem 1rem",
                        marginBottom: "0.875rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 700,
                          fontSize: "0.8rem",
                          letterSpacing: "0.04em",
                          textTransform: "uppercase",
                          color: "#7A1F2B",
                          marginBottom: "0.5rem",
                        }}
                      >
                        <ListChecks size={15} /> Quick Steps
                      </div>
                      <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                        {steps.map((step, i) => (
                          <li
                            key={i}
                            style={{
                              fontFamily: "'Lato', sans-serif",
                              fontSize: "0.9rem",
                              color: "#1A1A1A",
                              lineHeight: 1.5,
                              marginBottom: "0.25rem",
                            }}
                          >
                            {step}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {sop.procedureText && (
                    <p
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.9rem",
                        color: "#374151",
                        lineHeight: 1.65,
                        whiteSpace: "pre-wrap",
                      }}
                    >
                      {sop.procedureText}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * SopBridgeChip — the passive, dismissable chip that opens the SopSidePanel.
 * Renders only when `category` is non-null.
 */
export function SopBridgeChip({
  category,
  eventLabel,
  onOpen,
}: {
  category: string;
  eventLabel: string;
  onOpen?: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          onOpen?.();
        }}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.4rem",
          background: "#FBF6EF",
          border: "1px solid #EADFCE",
          color: "#7A1F2B",
          borderRadius: "999px",
          padding: "0.4rem 0.85rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.82rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        <BookOpen size={14} /> View {eventLabel} SOP
      </button>
      <SopSidePanel
        category={category}
        eventLabel={eventLabel}
        open={open}
        onOpenChange={setOpen}
      />
    </>
  );
}
