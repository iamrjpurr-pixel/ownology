/**
 * /demo — Past-Vintage AI Personalisation Demo
 *
 * The conversion funnel: visitor pastes any old harvest notes → parseFromText
 * extracts structured entries → tutor.ask cites their data back to them.
 * Zero-friction demo of the learning-loop moat.
 *
 * Value-engineering check: 4/5 — reuses parseFromText + tutor.ask (already wired).
 * No new LLM call types. No new tables. ~150 LOC of glue UI.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";

const SAMPLE_NOTES = `Tank 7 - Shiraz - 2024 Vintage
18 March: Brix 24.3, YAN 120ppm. Pretty hot day, fruit picked at 14 brix lab confirm.
19 March: Inoculated EC1118 at 25 g/hL, added GoFerm with hydration
21 March: First DAP split addition — 0.6 kg, Brix 18.5, taste profile coming along
24 March: Second DAP, 0.6 kg as planned, ferment running 18-19°C
28 March: Brix down to 2.0, almost dry. Cap firm, colour deep.
29 March: Pressed and racked off gross lees into Tank 12. Got 850L clean.
`;

type Step = "paste" | "parsing" | "review" | "asking" | "answer";

export default function Demo() {
  const [step, setStep] = useState<Step>("paste");
  const [notes, setNotes] = useState("");
  const [extracted, setExtracted] = useState<Array<{ tank: string; variety: string; type: string; details: string }>>([]);
  const [answer, setAnswer] = useState("");
  const [question, setQuestion] = useState("");

  const parseMutation = trpc.vintageLog.parseFromText.useMutation();
  const askMutation = trpc.tutor.ask.useMutation();

  const handleParse = async () => {
    if (!notes.trim()) return;
    setStep("parsing");
    try {
      const res = await parseMutation.mutateAsync({ pastedText: notes.trim() });
      const rows = (res?.entries ?? []).slice(0, 8).map((e: { tankName?: string; variety?: string; eventType?: string; details?: Record<string, unknown> }) => ({
        tank: e.tankName ?? "—",
        variety: e.variety ?? "—",
        type: e.eventType ?? "—",
        details: e.details ? Object.entries(e.details).slice(0, 3).map(([k, v]) => `${k}: ${v}`).join(", ") : "",
      }));
      setExtracted(rows);
      // Auto-suggest a question based on what was parsed
      const firstTank = rows[0]?.tank;
      const firstVariety = rows[0]?.variety;
      setQuestion(firstTank && firstVariety
        ? `Looking at my notes for ${firstTank} ${firstVariety}, what would you recommend differently next vintage?`
        : "What patterns do you see in my notes?");
      setStep("review");
    } catch {
      setStep("paste");
    }
  };

  const handleAsk = async () => {
    if (!question.trim()) return;
    setStep("asking");
    try {
      // Inject the parsed notes as context via the question itself
      // (no DB write — keeping the demo stateless)
      const contextualised = `${question}\n\n--- My notes ---\n${notes.trim()}`;
      const res = await askMutation.mutateAsync({ question: contextualised, mode: "winemaking" });
      setAnswer(res?.answer ?? "");
      setStep("answer");
    } catch {
      setStep("review");
    }
  };

  const reset = () => {
    setStep("paste");
    setNotes("");
    setExtracted([]);
    setAnswer("");
    setQuestion("");
  };

  return (
    <div data-testid="demo-page" className="container py-12 max-w-3xl">
      <div className="mb-8">
        <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)" }}>30-second demo</p>
        <h1 className="text-3xl font-semibold mt-2" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
          Watch Ownology cite YOUR cellar back to you
        </h1>
        <p className="mt-3 text-base" style={{ color: "var(--ow-text-mid)" }}>
          Paste any past harvest notes — Ownology extracts the structured data and uses it to ground your next answer.
          No signup. No commitment.
        </p>
      </div>

      {step === "paste" && (
        <div className="flex flex-col gap-3">
          <label className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Paste past vintage notes</label>
          <textarea
            data-testid="demo-notes-input"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={SAMPLE_NOTES}
            rows={12}
            className="w-full p-3 rounded font-mono text-sm"
            style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)", resize: "vertical" }}
          />
          <div className="flex gap-3 items-center">
            <button
              data-testid="demo-parse-button"
              onClick={handleParse}
              disabled={!notes.trim()}
              className="px-5 py-2.5 rounded font-semibold disabled:opacity-40"
              style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}
            >
              Parse my notes →
            </button>
            <button onClick={() => setNotes(SAMPLE_NOTES)} className="text-sm underline" style={{ color: "var(--ow-text-lo)" }}>
              Use a sample
            </button>
          </div>
        </div>
      )}

      {step === "parsing" && (
        <div data-testid="demo-parsing" className="text-center py-8" style={{ color: "var(--ow-text-mid)" }}>
          <p>Parsing your notes…</p>
        </div>
      )}

      {step === "review" && (
        <div className="flex flex-col gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Extracted from your notes</p>
            <div className="mt-2 flex flex-col gap-1" data-testid="demo-extracted">
              {extracted.length === 0 && <p style={{ color: "var(--ow-text-lo)" }}>No structured events detected — try the sample.</p>}
              {extracted.map((r, i) => (
                <div key={i} className="text-xs px-3 py-2 rounded" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
                  <strong style={{ color: "var(--ow-amber)" }}>{r.tank}</strong> · {r.variety} · {r.type}{r.details ? ` · ${r.details}` : ""}
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>Ask the AI a question grounded in your notes</label>
            <textarea
              data-testid="demo-question-input"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              className="w-full mt-2 p-3 rounded text-sm"
              style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)" }}
            />
            <div className="flex gap-3 mt-2">
              <button data-testid="demo-ask-button" onClick={handleAsk} disabled={!question.trim()} className="px-5 py-2.5 rounded font-semibold disabled:opacity-40" style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}>
                Ask Ownology
              </button>
              <button onClick={reset} className="text-sm underline" style={{ color: "var(--ow-text-lo)" }}>Start over</button>
            </div>
          </div>
        </div>
      )}

      {step === "asking" && (
        <div data-testid="demo-asking" className="text-center py-8" style={{ color: "var(--ow-text-mid)" }}>
          <p>Reading your notes + the bibles…</p>
        </div>
      )}

      {step === "answer" && (
        <div className="flex flex-col gap-4">
          <div data-testid="demo-answer" className="rounded p-4" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-amber)" }}>
            <p className="text-xs uppercase tracking-widest mb-2" style={{ color: "var(--ow-amber)" }}>Grounded in YOUR notes + 348 bible references</p>
            <div className="whitespace-pre-wrap" style={{ color: "var(--ow-text-hi)", lineHeight: 1.6 }}>{answer || "(no answer)"}</div>
          </div>
          <div className="flex gap-3">
            <Link href="/waitlist" data-testid="demo-signup-link" className="px-5 py-2.5 rounded font-semibold" style={{ background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)" }}>
              Save my cellar — start free trial
            </Link>
            <button onClick={reset} className="text-sm underline" style={{ color: "var(--ow-text-lo)" }}>Try another vintage</button>
          </div>
        </div>
      )}
    </div>
  );
}
