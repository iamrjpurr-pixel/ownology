/**
 * FeedbackWidget — thumbs-up / thumbs-down on AI answers.
 *
 * Built per VALUE-ENGINEERING doctrine: tiny client component, single mutation,
 * stateless (no LLM cost). Captured feedback flows to ai_answer_feedback table.
 */
import { useState } from "react";
import { trpc } from "../lib/trpc";

function hashString(s: string): string {
  // tiny djb2-style hash → 32-char hex. Just to dedupe answers across sessions.
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0").slice(0, 32);
}

export function FeedbackWidget({
  question,
  answer,
  procName,
}: {
  question: string;
  answer: string;
  procName: string;
}) {
  const [submitted, setSubmitted] = useState<null | "up" | "down">(null);
  const [note, setNote] = useState("");
  const [showNote, setShowNote] = useState(false);
  const rate = trpc.tutor.rateAnswer.useMutation();

  if (!question || !answer) return null;
  const answerHash = hashString(answer);

  const send = async (score: 1 | -1, withNote = false) => {
    try {
      await rate.mutateAsync({
        procName,
        question: question.slice(0, 2000),
        answerHash,
        score,
        note: withNote && note.trim() ? note.trim() : undefined,
      });
      setSubmitted(score === 1 ? "up" : "down");
      setShowNote(false);
    } catch {
      /* non-fatal */
    }
  };

  if (submitted) {
    return (
      <div data-testid="feedback-thanks" style={{ marginTop: "0.75rem", fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
        {submitted === "up" ? "Thanks — saved." : "Thanks — we'll improve this answer."}
      </div>
    );
  }

  return (
    <div data-testid="feedback-widget" style={{ marginTop: "0.875rem", display: "flex", flexDirection: "column", gap: "0.5rem" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
        <span style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", marginRight: "0.25rem" }}>Was this helpful?</span>
        <button
          data-testid="feedback-up"
          onClick={() => send(1)}
          disabled={rate.isPending}
          aria-label="Yes"
          style={{
            background: "transparent",
            border: "1px solid var(--ow-border)",
            borderRadius: 14,
            padding: "3px 10px",
            cursor: "pointer",
            color: "var(--ow-text-mid)",
            fontSize: "0.85rem",
          }}
        >
          👍
        </button>
        <button
          data-testid="feedback-down"
          onClick={() => setShowNote(true)}
          disabled={rate.isPending}
          aria-label="No"
          style={{
            background: "transparent",
            border: "1px solid var(--ow-border)",
            borderRadius: 14,
            padding: "3px 10px",
            cursor: "pointer",
            color: "var(--ow-text-mid)",
            fontSize: "0.85rem",
          }}
        >
          👎
        </button>
      </div>
      {showNote && (
        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem" }}>
          <input
            data-testid="feedback-note-input"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value.slice(0, 200))}
            placeholder="What was wrong? (optional)"
            style={{
              flex: 1,
              fontSize: "0.78rem",
              padding: "4px 8px",
              borderRadius: 4,
              border: "1px solid var(--ow-border)",
              background: "var(--ow-bg-card)",
              color: "var(--ow-text-hi)",
            }}
          />
          <button
            data-testid="feedback-submit-down"
            onClick={() => send(-1, true)}
            style={{
              fontSize: "0.78rem",
              padding: "4px 12px",
              borderRadius: 4,
              border: "none",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Send
          </button>
        </div>
      )}
    </div>
  );
}
