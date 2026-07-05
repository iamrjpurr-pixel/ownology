/**
 * Quiz.tsx — /quiz — the 6-question wine recommender.
 * Voice: Gel & Rich, two-person plural, unashamedly amateur.
 * Zero LLM at runtime — all data lives in quizData.ts. See it for the moat.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { pickWine, pickWineWithHonesty, getCurveballs, detectRegion, type QuizAnswers, type Budget, type QuizResult, type Region } from "@/data/quizData";

const AMBER = "var(--ow-amber)";
const BG = "var(--ow-bg-base)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border-md)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";

type Citation = {
  /** Short one-line description shown when the disclosure opens. */
  text: string;
};

type Q = {
  key: keyof QuizAnswers;
  prompt: string;
  options: { emoji: string; label: string; value: string; onlyFor?: "red" | "white"; hoverInfo?: string }[];
  /** Optional "About this question" citation shown as a collapsible
   *  disclosure. Present on the 4 palate questions (Q2-Q5). Skipped on
   *  Q1 Red/White (self-evident) and Q6 Budget (subjective). */
  citation?: Citation;
};

const QUESTIONS: Q[] = [
  {
    key: "wineType",
    prompt: "Reds or whites tonight?",
    options: [
      { emoji: "🍷", label: "Red — anything from a light Pinot to a big Shiraz", value: "red" },
      { emoji: "🥂", label: "White — bone-dry Riesling all the way to buttery Chardonnay", value: "white" },
    ],
  },
  {
    key: "fruit",
    prompt: "When you smell a wine, which pulls you in first?",
    options: [
      // Red-only options — red-fruit and dark-fruit only exist in reds
      { emoji: "🍒", label: "Bright red fruit — strawberry, cherry, cranberry", value: "red", onlyFor: "red",
        hoverInfo: "WSET SAT Level 3 primary-aroma 'red fruit' family. Canonical descriptors: strawberry, cherry, raspberry, cranberry, redcurrant. Signals cool-climate reds: Pinot Noir, Gamay, cool-climate Grenache." },
      { emoji: "🍇", label: "Dark and brooding — blackberry, plum, blueberry", value: "dark", onlyFor: "red",
        hoverInfo: "WSET SAT 'black fruit' family. Canonical descriptors: blackberry, blueberry, black plum, cassis. Signals warm-climate reds: Shiraz, Cabernet Sauvignon, Malbec." },
      // White-only — citrus/stone/tropical is a white-wine descriptor
      { emoji: "🍋", label: "Citrus, stone fruit, tropical", value: "citrus", onlyFor: "white",
        hoverInfo: "WSET SAT collapses three white-fruit families here — citrus (lemon, grapefruit), stone (peach, apricot), tropical (pineapple, mango). Combining them keeps the quiz snappy; the algorithm still ranks against each variety's specific profile." },
      // Both — savoury / earthy shows up on both sides (Nebbiolo, aged Riesling)
      { emoji: "🍄", label: "Something savoury — earth, mushroom, wet leaves", value: "savoury",
        hoverInfo: "Halliday-standard descriptor; WSET SAT 'earthy / vegetal / tertiary'. Genuinely applies to both reds (Nebbiolo, aged Pinot) and whites (aged Riesling, Assyrtiko, skin-contact whites)." },
    ],
    citation: {
      text: "Aroma-family clustering follows the WSET Systematic Approach to Tasting (SAT) primary-aroma categories, cross-referenced with UC Davis Viticulture & Enology sensory research on varietal aroma compounds.",
    },
  },
  {
    key: "body",
    prompt: "Close your eyes. The wine you love feels like…",
    options: [
      // WSET teaching analogy — light/medium/full body taught by asking
      // students to hold water, milk, then cream in the mouth to feel the
      // three viscosity levels. Named varieties anchor intent.
      { emoji: "💧", label: "Water — light-bodied (Pinot Grigio, Beaujolais, light Pinot Noir)", value: "light",
        hoverInfo: "WSET Level 1 teaches body with the water-milk-cream mouthfeel test: hold water in your mouth, then milk, then cream — that's the three viscosity levels. Light-bodied wines feel like water: <11% alcohol typically, low phenolics, low dry-extract." },
      { emoji: "🥛", label: "Milk — medium-bodied (Chianti, dry Riesling, Sangiovese)", value: "medium",
        hoverInfo: "Same WSET water-milk-cream test. Medium-bodied wines feel like milk on the palate — noticeable weight without coating. Typically 11.5–13.5% alcohol." },
      { emoji: "🥃", label: "Cream — full-bodied, coats the palate (Shiraz, oaked Chardonnay, Cabernet)", value: "full",
        hoverInfo: "Same WSET water-milk-cream test. Full-bodied wines coat the palate like cream — high alcohol (13.5%+), high phenolics, high dry-extract. Typical of warm-climate reds and oaked whites." },
    ],
    citation: {
      text: "Body scale per WSET SAT (light / medium / full), taught with the water-milk-cream mouthfeel test that all Level 1 students practise. Ties to alcohol level (<11% → light, 13.5%+ → full), phenolics, and dry extract. Naked Wines' consumer matcher uses the same three buckets because non-experts recognise them instantly.",
    },
  },
  {
    key: "sweetness",
    prompt: "How dry are we talking?",
    options: [
      // WSET SAT residual-sugar bands — every label ties to the numeric g/L
      // threshold so intent is verifiable, not invented.
      { emoji: "🏜️", label: "Bone-dry — under 2 g/L (most reds, Chablis, Barossa Shiraz)", value: "bone_dry",
        hoverInfo: "WSET SAT 'bone-dry' band: residual sugar under 2 g/L. Every classical dry red and most Old-World whites (Chablis, Sancerre, Barossa Shiraz) sit here. You cannot taste any sweetness." },
      { emoji: "🌾", label: "Dry — up to 12 g/L (dry Riesling, most Sauvignon Blanc)", value: "hint",
        hoverInfo: "WSET SAT 'dry' band: residual sugar between 2 and 12 g/L. Balanced by acidity, so sweetness is imperceptible or barely a hint. Includes 'Trocken' Riesling, most New-World Sauvignon Blanc." },
      { emoji: "🍯", label: "Off-dry / medium — 12–45 g/L (Kabinett Riesling, Vouvray)", value: "off_dry",
        hoverInfo: "WSET SAT 'off-dry to medium' band: residual sugar between 12 and 45 g/L. Detectable sweetness balanced against acidity. Includes Kabinett Riesling, demi-sec Vouvray, off-dry Chenin Blanc." },
      // Dessert wines in our pool are all curveballs (Sauternes, Port) — kept
      // in the primary pool this would be misleading. Point users at the
      // wildcards reveal instead.
      { emoji: "🍮", label: "Sweet / dessert — 45+ g/L (opens wildcards: Sauternes, Port)", value: "sweet",
        hoverInfo: "WSET SAT 'sweet' band: over 45 g/L residual sugar. All dessert wines (Sauternes, ice-wine, late-harvest) and fortified sweet wines (Port, PX Sherry). In our pool these are all curveballs — picking this opens the wildcards reveal on the result page." },
    ],
    citation: {
      text: "Residual-sugar bands per WSET SAT: bone-dry (<2 g/L), dry (2–12 g/L), off-dry / medium (12–45 g/L), sweet (>45 g/L). James Halliday uses this same scale throughout the Australian Wine Companion tasting notes.",
    },
  },
  {
    key: "grip",
    prompt: "A great wine makes your mouth feel…",
    options: [
      // Bright acid — the primary structural element in whites, also present
      // in light reds (Pinot, Gamay). Shown to both.
      { emoji: "💦", label: "Watering — bright, salivating, food-friendly", value: "bright",
        hoverInfo: "Naked Wines consumer-label for WSET SAT 'high acidity'. The saliva response is a physiological signal: your palate is watering to buffer the acid. Classical food-wine trait — Sancerre, Chablis, Barbera, Chianti Classico." },
      // Grippy tannin — a red-wine descriptor. Skin-contact whites can have
      // grip but they're rare enough to skip at Q1-choice level.
      { emoji: "✋", label: "Grippy — mouth-drying, tea-tannin, structured", value: "grippy", onlyFor: "red",
        hoverInfo: "Naked Wines consumer-label for WSET SAT 'medium-plus to high tannin'. The mouth-drying feel is tannins binding to salivary proteins — same reaction as strong black tea. Nebbiolo, young Cabernet, tannic Shiraz." },
      // Soft — mainly applies to whites and light reds. Kept universal.
      { emoji: "☁️", label: "Soft — no drying, no puckering, just smooth", value: "soft",
        hoverInfo: "WSET SAT 'low tannin / medium acidity' territory. No drying, no puckering — wines that feel round and easy. Merlot, oaked Chardonnay, ripe Grenache, Viognier." },
      // Both — explicitly a big-red descriptor. Never applies to whites.
      { emoji: "🥊", label: "Both bright and grippy — big red territory", value: "both", onlyFor: "red",
        hoverInfo: "Halliday's shorthand for structural big reds — high acidity AND high tannin together. Old-World classics (Barolo, Chianti Classico Riserva) and structured New-World (Coonawarra Cab, Barossa Shiraz)." },
    ],
    citation: {
      text: "Tannin and acidity structure follows WSET SAT (low / medium / high on each axis). Naked Wines simplified the two into consumer-friendly labels — 'bright' (high acid) and 'grippy' (high tannin) — because that's how people describe mouth-feel without a wine vocabulary.",
    },
  },
  {
    key: "age",
    prompt: "You want the wine to taste…",
    options: [
      { emoji: "🌱", label: "Just picked — recent vintage, fruity, vibrant", value: "young",
        hoverInfo: "WSET SAT 'youthful' — primary aromas dominate. Fresh fruit, floral, herbaceous. Drink within 2 years of vintage. Most New-World wines are designed for this window." },
      { emoji: "🍁", label: "Some time on it — developed, tertiary notes appearing", value: "developed",
        hoverInfo: "WSET SAT 'developing' — secondary aromas (yeast, oak, MLF) and early tertiary (nut, dried fruit, honey) alongside remaining primary. 3–8 years typically." },
      { emoji: "🏛️", label: "Old soul — 10+ years, mushroom, leather, forest floor", value: "old",
        hoverInfo: "WSET SAT 'fully developed / tertiary'. Primary fruit has faded; tertiary aromas dominate — mushroom, leather, forest floor, tobacco. UC Davis research: driven by sotolon, aldehyde formation, ester hydrolysis. Halliday's canonical 'old soul' language." },
    ],
    citation: {
      text: "Development stage per WSET SAT primary / secondary / tertiary aroma classification. James Halliday's cellaring windows (drink-through-year ranges) inform the developed vs. old boundary. UC Davis research on aging-driven aldehyde and sotolon formation underpins the tertiary aroma set.",
    },
  },
  {
    key: "budget",
    prompt: "Where does this bottle land?",
    options: [
      { emoji: "🍕", label: "A Tuesday night — under $25 AUD", value: "under_25" },
      { emoji: "🍽️", label: "A dinner with friends — $25–50", value: "25_50" },
      { emoji: "🥂", label: "A moment — $50–100", value: "50_100" },
      { emoji: "🎁", label: "A big deal — $100+", value: "100_plus" },
    ],
  },
];

export default function Quiz() {
  const [step, setStep] = useState(-1); // -1 = intro, 0..5 = questions, 6 = result
  const [answers, setAnswers] = useState<Partial<QuizAnswers>>({});
  // User's home market. Starts from browser locale (which now defaults
  // to AU per detectRegion), then the AU/NZ toggle chip on the result
  // page lets them flip. We keep US/UK reachable via the same chip for
  // completeness but they're de-emphasised — Ownology's audience today
  // is Aus + Kiwi winemakers.
  const [region, setRegion] = useState<Region>(() => detectRegion());

  const complete = QUESTIONS.every((q) => answers[q.key]);
  const wine = useMemo(() => (complete ? pickWine(answers as QuizAnswers, region) : null), [answers, complete, region]);
  const honest: QuizResult | null = useMemo(
    () => (complete ? pickWineWithHonesty(answers as QuizAnswers, region) : null),
    [answers, complete, region]
  );

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
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>We don&apos;t do any of that.</p>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "1rem" }}>
              I&apos;m <strong style={{ color: HI }}>Rich</strong> — short for Richard, not a lifestyle. Teaching myself to make wine in the Adelaide Hills. My partner <strong style={{ color: HI }}>Gel</strong> — Geraldine — runs the numbers when I get things wrong (which is often).
            </p>
            <p style={{ fontFamily: SANS, fontSize: "1rem", color: MID, lineHeight: 1.65, marginBottom: "2rem" }}>
              This quiz gives you <em>our</em> pick. Not an algorithm&apos;s. Six questions, one bottle. And if you&apos;re curious what it takes to make wine like that — we&apos;ll show you at the end.
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
              {QUESTIONS[step].options
                .filter((opt) => !opt.onlyFor || opt.onlyFor === answers.wineType)
                .map((opt) => (
                <button
                  key={opt.value}
                  data-testid={`quiz-answer-${QUESTIONS[step].key}-${opt.value}`}
                  onClick={() => pick(QUESTIONS[step].key, opt.value)}
                  title={opt.hoverInfo ?? undefined}
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
                  <span style={{ flex: 1 }}>{opt.label}</span>
                  {opt.hoverInfo && (
                    <span
                      aria-hidden="true"
                      title={opt.hoverInfo}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        width: 20,
                        height: 20,
                        borderRadius: "50%",
                        border: `1px solid ${BORDER}`,
                        color: LO,
                        fontSize: "0.72rem",
                        fontFamily: SANS,
                        flexShrink: 0,
                      }}
                    >
                      ⓘ
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Q1 reassurance sub-copy — reduces decision anxiety on the
                binary Red/White gate without offering a third path. */}
            {QUESTIONS[step].key === "wineType" && (
              <p
                data-testid="quiz-q1-subcopy"
                style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, marginTop: "1rem", lineHeight: 1.55 }}
              >
                Not sure? Pick the one you had last time — a 15-second retake if it misses.
                Sparkling, rosé, orange, and dessert wines are curveballs — they&apos;re on the result page as wildcards.
              </p>
            )}

            {/* Citation disclosure — collapsed by default. WSET / Naked Wines
                / Halliday / UC Davis grounding for the four palate axes. */}
            {QUESTIONS[step].citation && (
              <details
                data-testid={`quiz-citation-${QUESTIONS[step].key}`}
                style={{
                  marginTop: "1.4rem",
                  padding: "0.6rem 0.9rem",
                  border: `1px solid ${BORDER}`,
                  borderRadius: 4,
                  background: "color-mix(in oklch, white 2%, transparent)",
                }}
              >
                <summary
                  style={{
                    cursor: "pointer",
                    fontFamily: SANS,
                    fontSize: "0.74rem",
                    color: LO,
                    letterSpacing: "0.06em",
                    listStyle: "none",
                  }}
                >
                  About this question — how we cluster
                </summary>
                <p style={{ fontFamily: SANS, fontSize: "0.82rem", color: MID, lineHeight: 1.65, margin: "0.7rem 0 0.2rem" }}>
                  {QUESTIONS[step].citation!.text}
                </p>
              </details>
            )}

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

            {/* ── Honest trade-off narration (only when budget-constrained) ── */}
            {honest?.honestFraming && (
              <div
                data-testid="quiz-honest-tradeoff"
                style={{
                  background: "color-mix(in oklch, var(--ow-amber) 6%, transparent)",
                  border: `1px dashed color-mix(in oklch, var(--ow-amber) 40%, transparent)`,
                  borderRadius: 6,
                  padding: "0.9rem 1.1rem",
                  marginBottom: "1.2rem",
                }}
              >
                <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 6px" }}>
                  Being honest with you
                </p>
                <p
                  style={{ fontFamily: SANS, fontSize: "0.84rem", color: MID, lineHeight: 1.6, margin: 0 }}
                  dangerouslySetInnerHTML={{
                    __html: honest.honestFraming.replace(/\*\*(.+?)\*\*/g, `<strong style="color: var(--ow-text-hi)">$1</strong>`),
                  }}
                />
              </div>
            )}

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

            {/* ── Regional availability + tariff/tax context ─────────────── */}
            {honest?.regionalNote && (
              <div
                data-testid="quiz-regional-note"
                style={{
                  background: CARD,
                  border: `1px solid ${BORDER}`,
                  borderRadius: 6,
                  padding: "1rem 1.2rem",
                  marginBottom: "1.5rem",
                }}
              >
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center", marginBottom: 10 }}>
                  <span style={{ fontFamily: SANS, fontSize: "0.68rem", color: LO, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
                    Buying in
                  </span>
                  {/* AU + NZ are surfaced first — that's the audience. US /
                      UK live behind an opt-in reveal so expat / travel
                      viewers can still get context without polluting the
                      primary card. */}
                  {(["AU", "NZ"] as const).map((r) => (
                    <button
                      key={r}
                      type="button"
                      data-testid={`quiz-region-${r.toLowerCase()}`}
                      onClick={() => setRegion(r)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        border: `1px solid ${region === r ? AMBER : BORDER}`,
                        background: region === r ? "color-mix(in oklch, var(--ow-amber) 22%, transparent)" : "transparent",
                        color: region === r ? HI : MID,
                        fontFamily: SANS,
                        fontSize: "0.74rem",
                        fontWeight: region === r ? 700 : 500,
                        cursor: "pointer",
                      }}
                    >
                      {regionLabel(r)}
                    </button>
                  ))}
                  {(region === "US" || region === "UK") && (
                    <button
                      key={region}
                      type="button"
                      data-testid={`quiz-region-${region.toLowerCase()}`}
                      onClick={() => setRegion(region)}
                      style={{
                        padding: "3px 10px",
                        borderRadius: 999,
                        border: `1px solid ${AMBER}`,
                        background: "color-mix(in oklch, var(--ow-amber) 22%, transparent)",
                        color: HI,
                        fontFamily: SANS,
                        fontSize: "0.74rem",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      {regionLabel(region)}
                    </button>
                  )}
                  <details style={{ display: "inline-block" }}>
                    <summary
                      data-testid="quiz-region-more"
                      style={{
                        listStyle: "none",
                        cursor: "pointer",
                        fontFamily: SANS,
                        fontSize: "0.72rem",
                        color: LO,
                        padding: "3px 8px",
                      }}
                    >
                      travelling?
                    </summary>
                    <div style={{ display: "inline-flex", gap: 6, marginLeft: 6 }}>
                      {(["US", "UK"] as const).map((r) => (
                        <button
                          key={r}
                          type="button"
                          data-testid={`quiz-region-${r.toLowerCase()}`}
                          onClick={() => setRegion(r)}
                          style={{
                            padding: "3px 10px",
                            borderRadius: 999,
                            border: `1px solid ${region === r ? AMBER : BORDER}`,
                            background: region === r ? "color-mix(in oklch, var(--ow-amber) 22%, transparent)" : "transparent",
                            color: region === r ? HI : MID,
                            fontFamily: SANS,
                            fontSize: "0.74rem",
                            fontWeight: region === r ? 700 : 500,
                            cursor: "pointer",
                          }}
                        >
                          {regionLabel(r)}
                        </button>
                      ))}
                    </div>
                  </details>
                </div>
                <p style={{ fontFamily: SANS, fontSize: "0.68rem", color: LO, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                  {availabilityLabel(honest.regionalNote.availability)} · {honest.regionalNote.priceRange}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.83rem", color: MID, lineHeight: 1.6, margin: 0 }}>
                  {honest.regionalNote.advice}
                </p>
              </div>
            )}

            {/* Bridge CTA — the Trojan horse */}
            <div style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: `1.5px solid ${AMBER}`, borderRadius: 6, padding: "1.4rem 1.4rem 1.2rem", marginBottom: "1.4rem" }}>
              <p style={{ fontFamily: SANS, fontSize: "0.7rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 8px" }}>
                The winemaker&apos;s move
              </p>
              <h3 style={{ fontFamily: SERIF, fontSize: "1.4rem", fontWeight: 500, margin: "0 0 8px", lineHeight: 1.25 }}>
                Curious what it&apos;d take to make one yourself?
              </h3>
              <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: MID, lineHeight: 1.55, margin: "0 0 1rem" }}>
                Ownology&apos;s the tool we built for exactly this. Your first cellar plan, grounded in real winemaking manuals, tailored to the style you just picked.
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

            {/* ── Curveballs — wildcards reveal ─────────────────────────
                A delight-surprise for the adventurous. Rosé, sparkling,
                dessert, fortified, and vermouth all live here. Kept out of
                the main Q1 filter so the primary rec stays predictable. */}
            {complete && (
              <CurveballReveal answers={answers as QuizAnswers} />
            )}

            {/* ── Framework citation footer ─────────────────────────────
                The credibility payoff. Consolidated at the end so the
                quiz feels defensible without feeling academic. */}
            <div
              data-testid="quiz-citation-footer"
              style={{
                marginTop: "2.5rem",
                paddingTop: "1.2rem",
                borderTop: `1px solid ${BORDER}`,
                fontFamily: SANS,
                fontSize: "0.72rem",
                color: LO,
                lineHeight: 1.65,
              }}
            >
              <p style={{ margin: "0 0 0.5rem", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700, color: MID, fontSize: "0.66rem" }}>
                Recommendation reasoning grounded in
              </p>
              <p style={{ margin: 0 }}>
                <strong style={{ color: MID }}>WSET SAT</strong> — the industry-standard Systematic Approach to Tasting scales (body, sweetness, tannin, acidity, development).
                <br />
                <strong style={{ color: MID }}>Naked Wines consumer matcher</strong> — proven consumer-friendly labels (bright / grippy / soft) that translate expert vocabulary.
                <br />
                <strong style={{ color: MID }}>James Halliday</strong> — Australian regional-varietal defaults and cellaring windows.
                <br />
                <strong style={{ color: MID }}>UC Davis Viticulture & Enology</strong> — grape chemistry and sensory-research backbone.
              </p>
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

function regionLabel(r: string): string {
  return { AU: "Australia 🇦🇺", NZ: "New Zealand 🇳🇿", US: "the US 🇺🇸", UK: "the UK 🇬🇧", OTHER: "your region" }[r as "AU"|"NZ"|"US"|"UK"|"OTHER"] || "your region";
}

function availabilityLabel(a: string): string {
  return { easy: "Widely available", moderate: "Moderate availability", hard: "Hard to find", rare: "Rare — worth the hunt" }[a as "easy"|"moderate"|"hard"|"rare"] || "Availability varies";
}

// ─── CurveballReveal — the "wildcards" delight-surprise ─────────────────
// Excluded from Q1 to keep the primary rec clean, but too interesting to
// drop entirely. Collapsed by default. One tap reveals top 3 curveballs
// matched to the user's palate + budget. Zero re-quiz needed.
function CurveballReveal({ answers }: { answers: QuizAnswers }) {
  const [open, setOpen] = useState(false);
  const curveballs = useMemo(() => getCurveballs(answers, 3), [answers]);
  if (curveballs.length === 0) return null; // budget too low to show any

  return (
    <div
      data-testid="quiz-curveballs"
      style={{ marginTop: "2rem", padding: "1.2rem 1.3rem", background: CARD, border: `1px solid ${BORDER}`, borderRadius: 6 }}
    >
      {!open ? (
        <button
          data-testid="quiz-curveballs-reveal-btn"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            padding: 0,
            color: HI,
            fontFamily: SANS,
            fontSize: "0.92rem",
            cursor: "pointer",
            textAlign: "left",
            width: "100%",
          }}
        >
          <span style={{ fontFamily: SANS, fontSize: "0.66rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, display: "block", marginBottom: 6 }}>
            Feeling adventurous?
          </span>
          Show me the wildcards →
          <span style={{ display: "block", fontFamily: SANS, fontSize: "0.76rem", color: LO, lineHeight: 1.55, marginTop: 6 }}>
            Rosé, sparkling, dessert, fortified, vermouth. Left out of the main rec on purpose — but if you fancy something unexpected, we&apos;ve picked three that match your palate.
          </span>
        </button>
      ) : (
        <>
          <p style={{ fontFamily: SANS, fontSize: "0.66rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: "0 0 12px" }}>
            The wildcards
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {curveballs.map((w) => (
              <div
                key={w.slug}
                data-testid={`quiz-curveball-${w.slug}`}
                style={{ paddingBottom: 12, borderBottom: `1px solid ${BORDER}` }}
              >
                <p style={{ fontFamily: SERIF, fontSize: "1.1rem", color: HI, margin: "0 0 2px", fontWeight: 500 }}>
                  {w.variety}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO, margin: "0 0 6px" }}>
                  {w.region}, {w.country} · {budgetLabel(w.price)}
                </p>
                <p style={{ fontFamily: SANS, fontSize: "0.84rem", color: MID, lineHeight: 1.55, margin: 0 }}>
                  {w.gelsNote}
                </p>
              </div>
            ))}
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{ marginTop: 10, background: "transparent", border: "none", color: LO, fontFamily: SANS, fontSize: "0.78rem", cursor: "pointer", padding: 0 }}
          >
            Hide wildcards
          </button>
        </>
      )}
    </div>
  );
}

