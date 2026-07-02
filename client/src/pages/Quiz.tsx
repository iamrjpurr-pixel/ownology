/**
 * Quiz.tsx — /quiz — the 6-question wine recommender.
 * Voice: Gel & Rich, two-person plural, unashamedly amateur.
 * Zero LLM at runtime — all data lives in quizData.ts. See it for the moat.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { pickWine, type QuizAnswers, type Budget } from "@/data/quizData";

const AMBER = "var(--ow-amber)";
const BG = "var(--ow-bg-base)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border-md)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";

type Q = { key: keyof QuizAnswers; prompt: string; options: { emoji: string; label: string; value: string }[] };

const QUESTIONS: Q[] = [
  { key: "fruit", prompt: "When you smell a wine, which pulls you in first?", options: [
    { emoji: "🍒", label: "Bright red fruit — strawberry, cherry, cranberry", value: "red" },
    { emoji: "🍇", label: "Dark and brooding — blackberry, plum, blueberry", value: "dark" },
    { emoji: "🍋", label: "Citrus, stone fruit, tropical", value: "citrus" },
    { emoji: "🍄", label: "Something savoury — earth, mushroom, wet leaves", value: "savoury" },
  ]},
  { key: "body", prompt: "Close your eyes. The wine you love feels like…", options: [
    { emoji: "💧", label: "Water for wine — light, refreshing", value: "light" },
    { emoji: "🥛", label: "Milk — medium, some weight", value: "medium" },
    { emoji: "🥃", label: "Cream — full, coating your mouth", value: "full" },
  ]},
  { key: "sweetness", prompt: "How dry are we talking?", options: [
    { emoji: "🏜️", label: "Bone dry — nothing sweet at all", value: "bone_dry" },
    { emoji: "🌾", label: "Barely a hint", value: "hint" },
    { emoji: "🍯", label: "Off-dry / medium — you can taste it", value: "off_dry" },
    { emoji: "🍮", label: "Give me dessert wine", value: "sweet" },
  ]},
  { key: "grip", prompt: "A great wine makes your mouth feel…", options: [
    { emoji: "💦", label: "Watering — bright, salivating, food-friendly", value: "bright" },
    { emoji: "✋", label: "Grippy — mouth-drying, tea-tannin, structured", value: "grippy" },
    { emoji: "☁️", label: "Soft — no drying, no puckering, just smooth", value: "soft" },
    { emoji: "🥊", label: "Both bright and grippy — big red territory", value: "both" },
  ]},
  { key: "age", prompt: "You want the wine to taste…", options: [
    { emoji: "🌱", label: "Just picked — recent vintage, fruity, vibrant", value: "young" },
    { emoji: "🍁", label: "Some time on it — developed, tertiary notes appearing", value: "developed" },
    { emoji: "🏛️", label: "Old soul — 10+ years, mushroom, leather, forest floor", value: "old" },
  ]},
  { key: "budget", prompt: "Where does this bottle land?", options: [
    { emoji: "🍕", label: "A Tuesday night — under $25 AUD", value: "under_25" },
    { emoji: "🍽️", label: "A dinner with friends — $25–50", value: "25_50" },
    { emoji: "🥂", label: "A moment — $50–100", value: "50_100" },
    { emoji: "🎁", label: "A big deal — $100+", value: "100_plus" },
  ]},
];

export default function Quiz() {
  const [step, setStep] = useState(-1); // -1 = intro, 0..5 = questions, 6 = result
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});

  const complete = QUESTIONS.every((q) => answers[q.key]);
  const wine = useMemo(() => (complete ? pickWine(answers as QuizAnswers) : null), [answers, complete]);

  function pick(key: keyof QuizAnswers, value: string) {
    const next = { ...answers, [key]: value } as Partial<QuizAnswers>;
    setAnswers(next);
    if (step < QUESTIONS.length - 1) setStep(step + 1);
    else setStep(QUESTIONS.length); // → result
  }

  function reset() {
    setAnswers({});
    setStep(-1);
  }

  const progress = step >= 0 && step < QUESTIONS.length ? ((step + 1) / QUESTIONS.length) * 100 : step >= QUESTIONS.length ? 100 : 0;

  return (
    <div style={{ minHeight: "100vh", background: BG, color: HI, padding: "3rem 1.5rem 5rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        {/* Progress bar */}
        {step >= 0 && (
          <div data-testid="quiz-progress" style={{ marginBottom: "2rem" }}>
            <div style={{ height: 3, background: "color-mix(in oklch, white 6%, transparent)", borderRadius: 2 }}>
              <div style={{ height: "100%", width: `${progress}%`, background: AMBER, borderRadius: 2, transition: "width 400ms ease" }} />
            </div>
            <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: LO, marginTop: 6, letterSpacing: "0.08em" }}>
              {step < QUESTIONS.length ? `Question ${step + 1} of ${QUESTIONS.length}` : "Your pick"}
            </p>
          </div>
        )}

        {/* Intro */}
        {step === -1 && (
          <div data-testid="quiz-intro">
            <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
              The Wine Quiz
            </p>
            <h1 style={{ fontFamily: SERIF, fontSize: "2.4rem", fontWeight: 500, lineHeight: 1.15, margin: "0 0 1.5rem" }}>
              From two people who are <em>actually</em> trying to make it.
            </h1>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>
              There are lots of good wine quizzes on the internet. <strong style={{ color: HI }}>Vivino</strong> knows the market.{" "}
              <strong style={{ color: HI }}>Good Pair Days</strong> ships bottles. <strong style={{ color: HI }}>Naked Wines</strong> funds indie winemakers.
            </p>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>We don't do any of that.</p>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>
              We're <strong style={{ color: HI }}>Rich</strong> — teaching myself to make wine in the Adelaide Hills. And <strong style={{ color: HI }}>Gel</strong> — my very patient, very technical partner who runs the numbers when I get things wrong (which is often).
            </p>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "2rem" }}>
              This quiz gives you <em>our</em> pick. Not an algorithm's. Six questions, one bottle. And if you're curious what it takes to make wine like that — we'll show you at the end.
            </p>
            <button data-testid="quiz-start-btn" onClick={() => setStep(0)} style={ctaStyle}>Start the quiz →</button>
          </div>
        )}

        {/* Question */}
        {step >= 0 && step < QUESTIONS.length && (
          <div data-testid={`quiz-question-${step}`}>
            <h2 style={{ fontFamily: SERIF, fontSize: "1.85rem", fontWeight: 500, lineHeight: 1.25, margin: "0 0 1.6rem" }}>
              {QUESTIONS[step].prompt}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {QUESTIONS[step].options.map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`quiz-answer-${QUESTIONS[step].key}-${opt.value}`}
                  onClick={() => pick(QUESTIONS[step].key, opt.value)}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "1rem 1.2rem",
                    background: CARD,
                    border: `1px solid ${BORDER}`,
                    borderRadius: 6,
                    color: HI,
                    fontFamily: SANS,
                    fontSize: "0.95rem",
                    textAlign: "left",
                    cursor: "pointer",
                    transition: "border-color 180ms ease, transform 120ms ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = AMBER;
                    e.currentTarget.style.transform = "translateX(4px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = BORDER;
                    e.currentTarget.style.transform = "translateX(0)";
                  }}
                >
                  <span style={{ fontSize: "1.6rem" }}>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
            {step > 0 && (
              <button
                data-testid="quiz-back-btn"
                onClick={() => setStep(step - 1)}
                style={{ marginTop: "1.4rem", background: "transparent", border: "none", color: LO, fontFamily: SANS, fontSize: "0.86rem", cursor: "pointer" }}
              >
                ← Back
              </button>
            )}
          </div>
        )}

        {/* Result */}
        {step >= QUESTIONS.length && wine && (
          <div data-testid="quiz-result">
            <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
              The pick
            </p>
            <h1 data-testid="quiz-result-variety" style={{ fontFamily: SERIF, fontSize: "2.8rem", fontWeight: 500, lineHeight: 1.1, margin: "0 0 8px" }}>
              {wine.variety}
            </h1>
            <p style={{ fontFamily: SERIF, fontSize: "1.2rem", color: MID, marginTop: 0, marginBottom: 4 }}>
              from {wine.region}, {wine.country}
            </p>
            <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: LO, marginBottom: "1.6rem" }}>
              {wine.ageWindow} · {budgetLabel(wine.price)}
            </p>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6, padding: "1.2rem 1.3rem", marginBottom: "1rem" }}>
              <p style={{ fontFamily: SERIF, fontSize: "1rem", color: HI, lineHeight: 1.65, margin: 0 }}>
                {wine.richsPick}
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: AMBER, marginTop: 12, marginBottom: 0, fontStyle: "italic", letterSpacing: "0.04em" }}>
                — Rich says
              </p>
            </div>

            <div style={{ background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: `1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)`, borderRadius: 6, padding: "0.85rem 1.1rem", marginBottom: "1.4rem", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: "1rem" }}>⚗️</span>
              <p style={{ fontFamily: SANS, fontSize: "0.83rem", color: MID, lineHeight: 1.55, margin: 0 }}>
                <strong style={{ color: HI }}>Gel adds:</strong> {wine.gelsNote}
              </p>
            </div>

            <div style={{ marginBottom: "2rem" }}>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: LO, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                Producers to look for
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: HI, margin: 0 }}>
                {wine.producers.join(" · ")}
              </p>
            </div>

            <div style={{ marginBottom: "2.5rem" }}>
              <p style={{ fontFamily: SANS, fontSize: "0.72rem", color: LO, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                If this is your speed, also try
              </p>
              <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, margin: 0 }}>
                {wine.alsoTry.join(" · ")}
              </p>
            </div>

            {/* Bridge CTA — the Trojan horse */}
            <div style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: `1.5px solid ${AMBER}`, borderRadius: 6, padding: "1.4rem 1.4rem 1.2rem", marginBottom: "1.4rem" }}>
              <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                The winemaker's move
              </p>
              <h3 style={{ fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.25 }}>
                Curious what it'd take to make one yourself?
              </h3>
              <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, lineHeight: 1.55, margin: "0 0 1rem" }}>
                Ownology's the tool we built for exactly this. Your first cellar plan, grounded in real winemaking manuals, tailored to the style you just picked.
              </p>
              <Link href="/pricing" data-testid="quiz-cta-founding" style={ctaStyle}>
                See a Founding-Member plan →
              </Link>
            </div>

            <div style={{ display: "flex", gap: 12, justifyContent: "center", marginTop: "1.6rem" }}>
              <button data-testid="quiz-retake-btn" onClick={reset} style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "0.6rem 1rem", borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer" }}>
                Retake the quiz
              </button>
              <Link
                href="/cellar-journal"
                style={{ background: "transparent", border: `1px solid ${BORDER}`, color: MID, padding: "0.6rem 1rem", borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", textDecoration: "none", display: "inline-block" }}
              >
                Read the journal
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const ctaStyle: React.CSSProperties = {
  display: "inline-block",
  background: AMBER,
  color: BG,
  border: "none",
  padding: "0.85rem 1.4rem",
  borderRadius: 4,
  fontFamily: SANS,
  fontSize: "0.82rem",
  fontWeight: 700,
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};

function budgetLabel(b: Budget): string {
  return { under_25: "under $25 AUD", "25_50": "$25–50 AUD", "50_100": "$50–100 AUD", "100_plus": "$100+ AUD" }[b];
}
