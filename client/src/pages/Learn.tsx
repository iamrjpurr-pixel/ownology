/**
 * Learn — Ownology's spaced-repetition flashcard study page (Feb 2026, Rich).
 *
 * Status: UNLINKED from all nav on purpose. Direct URL only: /learn.
 * Behind the main site gate wall, so no additional auth here.
 *
 * Doctrine:
 *   • Say it SOP; understand it plain.
 *   • Every card ships both a technical (SOP-language) explanation AND a
 *     plain-English translation. Rich learns the plain; talks the SOP.
 *   • Leitner box scheduler in localStorage — 1 / 2 / 4 / 7 / 14 day
 *     intervals. Cards graded Again / Good / Easy.
 *   • Two study modes:
 *       - "Due today" (default) — respects the SRS schedule
 *       - "All cards" — shuffle through the whole deck for a first pass
 */

import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  RotateCcw,
  Shuffle,
  ArrowRight,
  Check,
  Zap,
  BookOpen,
} from "lucide-react";
import { FLASHCARDS, CATEGORY_META, type Flashcard, type FlashcardCategory } from "../content/oenologyFlashcards";
import {
  applyGrade,
  computeProgress,
  ensureCard,
  loadState,
  resetState,
  saveState,
  selectDue,
  type CardState,
  type Grade,
} from "../lib/leitnerScheduler";

type Mode = "due" | "all";

// Shuffle helper for "all cards" mode. Uses Math.random, sufficient for a
// study deck (not cryptographic).
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export default function Learn() {
  const allIds = useMemo(() => FLASHCARDS.map((c) => c.id), []);
  const cardsById = useMemo(() => Object.fromEntries(FLASHCARDS.map((c) => [c.id, c])) as Record<string, Flashcard>, []);

  const [state, setState] = useState<Record<string, CardState>>(() => loadState());
  const [mode, setMode] = useState<Mode>("due");
  const [categoryFilter, setCategoryFilter] = useState<FlashcardCategory | "all">("all");
  const [queue, setQueue] = useState<string[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);

  // Rebuild the queue whenever mode, filter, or state changes.
  useEffect(() => {
    const filtered = allIds.filter((id) => {
      if (categoryFilter === "all") return true;
      return cardsById[id].category === categoryFilter;
    });
    if (mode === "due") {
      setQueue(selectDue(state, filtered));
    } else {
      setQueue(shuffle(filtered));
    }
    setRevealed(false);
  }, [mode, categoryFilter]);

  const currentId = queue[0];
  const currentCard: Flashcard | undefined = currentId ? cardsById[currentId] : undefined;
  const progress = computeProgress(state, allIds);

  function grade(g: Grade) {
    if (!currentId) return;
    const prev = ensureCard(state, currentId);
    const next = applyGrade(prev, g);
    const newState = { ...state, [currentId]: next };
    setState(newState);
    saveState(newState);
    setQueue((q) => q.slice(1));
    setRevealed(false);
    setSessionCount((n) => n + 1);
  }

  function skipCard() {
    setQueue((q) => q.slice(1));
    setRevealed(false);
  }

  function handleReset() {
    if (typeof window !== "undefined" && !window.confirm("Reset all study progress? This can't be undone.")) return;
    resetState();
    setState({});
    setSessionCount(0);
    // Force queue rebuild
    setMode((m) => (m === "due" ? "due" : "all"));
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }} data-testid="learn-page">
      {/* Quiet sticky header */}
      <div className="sticky top-0 z-10" style={{ background: "color-mix(in oklch, var(--ow-bg-base) 92%, transparent)", backdropFilter: "blur(12px)", borderBottom: "1px solid var(--ow-bg-inset)" }}>
        <div className="container max-w-4xl flex items-center justify-between py-4">
          <Link href="/" data-testid="learn-back-home" style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", textDecoration: "none", letterSpacing: "0.03em" }}>
            <ArrowLeft size={14} /> Ownology
          </Link>
          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", letterSpacing: "0.14em", color: "var(--ow-text-lo)", textTransform: "uppercase" }}>
            /apprentice · preview · unlinked
          </span>
        </div>
      </div>

      <div className="container max-w-4xl py-12 md:py-16 space-y-8">
        {/* ── Header ────────────────────────────────────────────────── */}
        <header>
          <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", letterSpacing: "0.24em", color: "var(--ow-amber)", textTransform: "uppercase", marginBottom: "1rem" }}>
            The Owen Deck
          </p>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.75rem)", lineHeight: 1.15, letterSpacing: "-0.015em", color: "var(--ow-text-hi)", margin: 0, textWrap: "balance" as "balance" }}>
            Wine science, flavours, regions, or pairings.{" "}
            <span style={{ color: "var(--ow-amber)" }}>Powered by real oenology.</span>
          </h1>
          <p style={{ fontFamily: "'Fraunces',serif", fontStyle: "italic", fontSize: "1rem", color: "var(--ow-text-mid)", marginTop: "1.25rem", maxWidth: 720 }}>
            Every card is written twice — the SOP language you&apos;ll use with a
            winemaker, and the plain-English translation for your head.
            Say it SOP; understand it plain.
          </p>
        </header>

        {/* ── Progress bar ──────────────────────────────────────────── */}
        <section data-testid="learn-progress" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)", borderRadius: 8, padding: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.85rem" }}>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
              Your Progress
            </p>
            <button type="button" data-testid="learn-reset" onClick={handleReset} style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", background: "transparent", border: "1px solid var(--ow-bg-inset)", borderRadius: 4, padding: "0.25rem 0.6rem", cursor: "pointer" }}>
              <RotateCcw size={11} /> Reset
            </button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))", gap: "0.9rem" }}>
            {[
              { label: "Due today", value: progress.due, color: "var(--ow-amber)", testId: "progress-due" },
              { label: "Reviewing", value: progress.reviewing, color: "oklch(0.75 0.12 75)", testId: "progress-reviewing" },
              { label: "Mastered", value: progress.mastered, color: "oklch(0.65 0.15 145)", testId: "progress-mastered" },
              { label: "Total cards", value: progress.total, color: "var(--ow-text-mid)", testId: "progress-total" },
            ].map((m) => (
              <div key={m.label} data-testid={m.testId}>
                <p style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.6rem", color: m.color, margin: 0, lineHeight: 1 }}>{m.value}</p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.35rem 0 0", letterSpacing: "0.04em", textTransform: "uppercase" }}>{m.label}</p>
              </div>
            ))}
          </div>
          {sessionCount > 0 && (
            <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", color: "var(--ow-text-lo)", marginTop: "0.85rem", letterSpacing: "0.06em" }}>
              {sessionCount} {sessionCount === 1 ? "card" : "cards"} reviewed this session
            </p>
          )}
        </section>

        {/* ── Controls ──────────────────────────────────────────────── */}
        <section style={{ display: "flex", flexWrap: "wrap", gap: "0.5rem", alignItems: "center" }}>
          <div style={{ display: "inline-flex", background: "var(--ow-bg-raised)", borderRadius: 6, padding: 3, border: "1px solid var(--ow-bg-inset)" }}>
            {[
              { id: "due" as const, label: "Due today", icon: <Zap size={12} /> },
              { id: "all" as const, label: "All cards", icon: <Shuffle size={12} /> },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                data-testid={`learn-mode-${m.id}`}
                onClick={() => setMode(m.id)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.35rem",
                  padding: "0.4rem 0.85rem",
                  border: "none",
                  borderRadius: 4,
                  background: mode === m.id ? "var(--ow-amber)" : "transparent",
                  color: mode === m.id ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.8rem",
                  fontWeight: mode === m.id ? 700 : 500,
                  cursor: "pointer",
                }}
              >
                {m.icon} {m.label}
              </button>
            ))}
          </div>
          <select
            data-testid="learn-category-filter"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as FlashcardCategory | "all")}
            style={{ padding: "0.4rem 0.75rem", borderRadius: 4, border: "1px solid var(--ow-bg-inset)", background: "var(--ow-bg-raised)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontSize: "0.8rem" }}
          >
            <option value="all">All categories</option>
            {Object.entries(CATEGORY_META).map(([k, m]) => (
              <option key={k} value={k}>{m.label}</option>
            ))}
          </select>
          <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)", marginLeft: "auto" }}>
            {queue.length} in queue
          </span>
        </section>

        {/* ── The card ──────────────────────────────────────────────── */}
        {!currentCard ? (
          <section data-testid="learn-empty" style={{ padding: "3rem 1.5rem", background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)", borderRadius: 8, textAlign: "center" }}>
            <BookOpen size={40} strokeWidth={1.4} style={{ color: "var(--ow-amber)", margin: "0 auto 1rem" }} />
            <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", color: "var(--ow-text-hi)", margin: 0 }}>
              {mode === "due" ? "Nothing due right now." : "Deck exhausted."}
            </p>
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.9rem", color: "var(--ow-text-mid)", margin: "0.75rem 0 0", maxWidth: 480, marginLeft: "auto", marginRight: "auto" }}>
              {mode === "due"
                ? "Come back later when cards are due — or switch to All cards to keep grinding."
                : "Reshuffle to start again, or switch to Due today mode."}
            </p>
            <button type="button" onClick={() => setMode(mode === "due" ? "all" : "due")} style={{ marginTop: "1.5rem", padding: "0.75rem 1.5rem", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 6, fontFamily: "'Lato',sans-serif", fontWeight: 700, fontSize: "0.9rem", cursor: "pointer" }}>
              Switch to {mode === "due" ? "All cards" : "Due today"}
            </button>
          </section>
        ) : (
          <>
            {/* Card face */}
            <section
              data-testid="learn-card"
              key={currentCard.id}
              style={{
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-bg-inset)",
                borderRadius: 10,
                overflow: "hidden",
                boxShadow: "0 24px 60px oklch(0 0 0 / 0.35)",
                animation: "learn-fade 400ms ease",
              }}
            >
              {/* Card header — category chip + progress hint */}
              <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid var(--ow-bg-inset)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "color-mix(in oklch, var(--ow-amber) 5%, transparent)" }}>
                <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", padding: "0.2rem 0.55rem", borderRadius: 999, background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)", color: "var(--ow-amber)" }}>
                  {CATEGORY_META[currentCard.category].label}
                </span>
                <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", color: "var(--ow-text-lo)" }}>
                  Box {state[currentCard.id]?.box ?? 1} / 5
                </span>
              </div>

              {/* Term */}
              <div style={{ padding: "2.5rem 1.5rem 1.5rem", textAlign: "center" }}>
                <h2 data-testid="learn-card-term" style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "clamp(1.75rem, 4vw, 2.5rem)", lineHeight: 1.15, letterSpacing: "-0.015em", color: "var(--ow-text-hi)", margin: 0, textWrap: "balance" as "balance" }}>
                  {currentCard.term}
                </h2>
                {!revealed && (
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-lo)", marginTop: "1.25rem", fontStyle: "italic" }}>
                    What is it? Why does it matter? When do we care?
                  </p>
                )}
              </div>

              {/* Answer body — revealed */}
              {revealed && (
                <div data-testid="learn-card-answer" style={{ padding: "0 1.5rem 1.5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                  {/* SOP block */}
                  <div style={{ padding: "1rem 1.25rem", borderRadius: 6, background: "oklch(0.14 0.008 60)", border: "1px solid var(--ow-bg-inset)" }}>
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
                      SOP language
                    </p>
                    <p data-testid="learn-card-sop" style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "0.95rem", lineHeight: 1.65, color: "var(--ow-text-hi)", margin: "0.6rem 0 0" }}>
                      {currentCard.sop}
                    </p>
                  </div>

                  {/* Plain block */}
                  <div style={{ padding: "1rem 1.25rem", borderRadius: 6, background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}>
                    <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
                      In plain English
                    </p>
                    <p data-testid="learn-card-plain" style={{ fontFamily: "'Fraunces',serif", fontWeight: 400, fontSize: "1.05rem", lineHeight: 1.6, color: "var(--ow-text-hi)", margin: "0.6rem 0 0" }}>
                      {currentCard.plain}
                    </p>
                  </div>

                  {/* Why / When / Rule / Cited grid */}
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "0.75rem" }}>
                    <MetaLine label="Why we care" value={currentCard.why} />
                    <MetaLine label="When" value={currentCard.when} />
                    {currentCard.ruleOfThumb && <MetaLine label="Rule of thumb" value={currentCard.ruleOfThumb} mono />}
                    {currentCard.cited && <MetaLine label="Cited" value={currentCard.cited} mono />}
                  </div>
                </div>
              )}

              {/* Card footer — reveal / grade buttons */}
              <div style={{ padding: "1rem 1.5rem", borderTop: "1px solid var(--ow-bg-inset)", background: "oklch(0.14 0.008 60)" }}>
                {!revealed ? (
                  <button
                    type="button"
                    data-testid="learn-reveal-btn"
                    onClick={() => setRevealed(true)}
                    style={{ width: "100%", padding: "0.85rem", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 6, fontFamily: "'Lato',sans-serif", fontWeight: 700, fontSize: "0.95rem", cursor: "pointer", letterSpacing: "0.02em" }}
                  >
                    Reveal answer ↓
                  </button>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "0.5rem" }}>
                    <GradeBtn testId="learn-grade-again" grade="again" label="Again" hint="Back to box 1" onClick={() => grade("again")} />
                    <GradeBtn testId="learn-grade-good" grade="good" label="Good" hint="+1 box" onClick={() => grade("good")} />
                    <GradeBtn testId="learn-grade-easy" grade="easy" label="Easy" hint="+2 boxes" onClick={() => grade("easy")} />
                  </div>
                )}
              </div>
            </section>

            {/* Below-card actions */}
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                data-testid="learn-skip"
                onClick={skipCard}
                style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem", fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", background: "transparent", border: "none", cursor: "pointer" }}
              >
                Skip this card <ArrowRight size={12} />
              </button>
            </div>
          </>
        )}

        {/* Footer note */}
        <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.66rem", color: "var(--ow-text-lo)", textAlign: "center", letterSpacing: "0.08em", paddingTop: "2rem", borderTop: "1px solid var(--ow-bg-inset)" }}>
          Progress stored locally in this browser. No account needed.
        </p>
      </div>

      <style>{`@keyframes learn-fade { from { opacity: 0.1; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }`}</style>
    </div>
  );
}

// ── Small local components ───────────────────────────────────────────
function MetaLine({ label, value, mono = false }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ padding: "0.75rem 1rem", borderRadius: 4, background: "var(--ow-bg-raised)", border: "1px solid var(--ow-bg-inset)" }}>
      <p style={{ fontFamily: "'Lato',sans-serif", fontWeight: 700, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "var(--ow-amber)", margin: 0 }}>
        {label}
      </p>
      <p style={{ fontFamily: mono ? "'Fira Code',monospace" : "'Lato',sans-serif", fontWeight: mono ? 500 : 400, fontSize: mono ? "0.78rem" : "0.85rem", lineHeight: 1.5, color: "var(--ow-text-mid)", margin: "0.4rem 0 0" }}>
        {value}
      </p>
    </div>
  );
}

function GradeBtn({ testId, grade, label, hint, onClick }: { testId: string; grade: Grade; label: string; hint: string; onClick: () => void }) {
  const colours: Record<Grade, { bg: string; border: string; text: string; icon: React.ReactNode }> = {
    again: { bg: "oklch(0.18 0.05 25 / 40%)", border: "oklch(0.40 0.12 25 / 50%)", text: "oklch(0.72 0.13 25)", icon: <RotateCcw size={14} /> },
    good:  { bg: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "color-mix(in oklch, var(--ow-amber) 40%, transparent)", text: "var(--ow-amber)", icon: <Check size={14} /> },
    easy:  { bg: "oklch(0.18 0.08 145 / 40%)", border: "oklch(0.40 0.12 145 / 50%)", text: "oklch(0.72 0.12 145)", icon: <Zap size={14} /> },
  };
  const c = colours[grade];
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      style={{
        padding: "0.85rem 0.5rem",
        background: c.bg,
        border: `1px solid ${c.border}`,
        borderRadius: 6,
        color: c.text,
        fontFamily: "'Lato',sans-serif",
        fontWeight: 700,
        fontSize: "0.9rem",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "0.25rem",
        letterSpacing: "0.02em",
      }}
    >
      <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>{c.icon} {label}</span>
      <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.62rem", fontWeight: 400, opacity: 0.75, letterSpacing: "0.06em", textTransform: "uppercase" }}>{hint}</span>
    </button>
  );
}
