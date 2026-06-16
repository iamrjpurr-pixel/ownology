/**
 * FREE RUN — Wine Curiosity Experience
 * ─────────────────────────────────────────────────────────────────────────────
 * Audience: wine lovers, curious drinkers, food & wine enthusiasts.
 * NOT for winemakers — no SOPs, no production guides.
 *
 * Mechanics:
 *  - 3 curiosity questions/day (midnight UTC reset)
 *  - Every answer has a "Deep Dive" button (1 credit, first one free)
 *  - Deep Dive unlocks the Triangle: Science / Vineyard / Craft
 *  - Thumbs up/down per panel for quality analytics
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import { ThumbsUp, ThumbsDown, ChevronDown, ChevronUp, Beaker, Sprout, Wine, Sparkles, ArrowRight } from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TriangleReveal {
  revealId: number;
  sciencePanel: string;
  vineyardPanel: string;
  craftPanel: string;
  wasFreeHook: boolean;
}

interface QAPair {
  id: string;
  question: string;
  answer: string;
  topicTag: string | null;
  reveal: TriangleReveal | null;
  openPanels: Set<"science" | "vineyard" | "craft">;
  feedback: Map<"science" | "vineyard" | "craft", boolean>;
}

// ─── Curiosity prompt chips ───────────────────────────────────────────────────

const CURIOSITY_PROMPTS = [
  { label: "Buttery Chardonnay", q: "Why does some Chardonnay taste buttery?" },
  { label: "Tannins", q: "What are tannins and why do they make my mouth dry?" },
  { label: "Natural wine", q: "What actually makes a wine 'natural'?" },
  { label: "Terroir", q: "What does terroir actually mean — is it real?" },
  { label: "Pinot Noir", q: "Why is Pinot Noir so hard to grow and make?" },
  { label: "Orange wine", q: "What is orange wine and why is it orange?" },
  { label: "Biodynamic", q: "What is biodynamic wine and does it taste different?" },
  { label: "Vintage variation", q: "Why does the same wine taste different every year?" },
];

// ─── Analytics helper ─────────────────────────────────────────────────────────

function trackEvent(name: string, props?: Record<string, string | number | boolean>) {
  try {
    // @ts-expect-error umami is injected globally
    window.umami?.track(name, props);
  } catch {
    // analytics not available
  }
}

// ─── Deep Dive Triangle Panel ─────────────────────────────────────────────────

interface PanelProps {
  icon: React.ReactNode;
  label: string;
  color: string;
  content: string;
  panelKey: "science" | "vineyard" | "craft";
  isOpen: boolean;
  onToggle: () => void;
  feedback: boolean | undefined;
  onFeedback: (thumbsUp: boolean) => void;
}

function TrianglePanel({ icon, label, color, content, isOpen, onToggle, feedback, onFeedback }: PanelProps) {
  return (
    <div
      className="rounded-sm overflow-hidden"
      style={{ border: `1px solid color-mix(in oklch, ${color} 25%, transparent)` }}
    >
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between px-4 py-3 text-left transition-all"
        style={{
          background: isOpen
            ? `color-mix(in oklch, ${color} 12%, transparent)`
            : `color-mix(in oklch, ${color} 6%, transparent)`,
        }}
      >
        <div className="flex items-center gap-2.5">
          <span style={{ color }}>{icon}</span>
          <span
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.8rem",
              fontWeight: 600,
              color: "oklch(0.82 0.015 75)",
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {label}
          </span>
        </div>
        <span style={{ color: "oklch(0.55 0.015 75)" }}>
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pt-3 pb-4">
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "0.9rem",
              lineHeight: 1.75,
              color: "oklch(0.75 0.015 75)",
              whiteSpace: "pre-wrap",
            }}
          >
            {content}
          </p>

          <div className="flex items-center gap-3 mt-4 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.7rem",
                color: "oklch(0.45 0.012 75)",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              Useful?
            </span>
            <button
              onClick={() => onFeedback(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all text-xs"
              style={{
                background: feedback === true ? "color-mix(in oklch, oklch(0.65 0.18 145) 20%, transparent)" : "transparent",
                border: `1px solid ${feedback === true ? "oklch(0.65 0.18 145)" : "oklch(1 0 0 / 0.12)"}`,
                color: feedback === true ? "oklch(0.65 0.18 145)" : "oklch(0.50 0.012 75)",
                fontFamily: "'Lato', sans-serif",
                cursor: "pointer",
              }}
            >
              <ThumbsUp size={11} />&nbsp;Yes
            </button>
            <button
              onClick={() => onFeedback(false)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-sm transition-all text-xs"
              style={{
                background: feedback === false ? "color-mix(in oklch, oklch(0.55 0.18 25) 20%, transparent)" : "transparent",
                border: `1px solid ${feedback === false ? "oklch(0.55 0.18 25)" : "oklch(1 0 0 / 0.12)"}`,
                color: feedback === false ? "oklch(0.55 0.18 25)" : "oklch(0.50 0.012 75)",
                fontFamily: "'Lato', sans-serif",
                cursor: "pointer",
              }}
            >
              <ThumbsDown size={11} />&nbsp;Not really
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function FreeRun() {
  const authCheckQuery = trpc.freeRun.authCheck.useQuery(undefined, { retry: false });
  const isAuthenticated = authCheckQuery.data?.isAuthenticated ?? false;
  const authLoading = authCheckQuery.isLoading;
  const [question, setQuestion] = useState("");
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [isAsking, setIsAsking] = useState(false);
  const [isRevealing, setIsRevealing] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const statusQuery = trpc.freeRun.status.useQuery(undefined, { enabled: isAuthenticated });
  const askMutation = trpc.freeRun.curiosityAsk.useMutation();
  const goDeeperMutation = trpc.freeRun.goDeeper.useMutation();
  const feedbackMutation = trpc.freeRun.submitFeedback.useMutation();
  const [pendingPackId, setPendingPackId] = useState<string | null>(null);
  const checkoutMutation = trpc.freeRun.createCreditPackCheckout.useMutation({
    onSuccess: (data) => {
      if (data.url) {
        trackEvent('credit-pack-checkout-start', { pack: pendingPackId ?? 'unknown' });
        window.open(data.url, '_blank');
      }
      setPendingPackId(null);
    },
    onError: () => setPendingPackId(null),
  });

  function handleBuyCredits(packId: 'bottle' | 'case' | 'obsessed') {
    setPendingPackId(packId);
    checkoutMutation.mutate({ packId, origin: window.location.origin });
  }

  const status = statusQuery.data;

  useEffect(() => {
    if (pairs.length > 0) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [pairs.length]);

  async function handleAsk(q?: string) {
    const text = (q ?? question).trim();
    if (!text || isAsking) return;
    setQuestion("");
    setIsAsking(true);
    trackEvent("freerun-question", { topic: text.slice(0, 50) });

    try {
      const result = await askMutation.mutateAsync({ question: text });
      const id = crypto.randomUUID();

      if (result.limitReached) {
        setPairs((prev) => [
          ...prev,
          {
            id,
            question: text,
            answer: `You've used your 3 questions for today — your daily curiosity allowance resets at midnight.\n\nMeanwhile, if you're ready to deep dive into the craft of winemaking, The Press is waiting.`,
            topicTag: null,
            reveal: null,
            openPanels: new Set(),
            feedback: new Map(),
          },
        ]);
        return;
      }

      setPairs((prev) => [
        ...prev,
        {
          id,
          question: text,
          answer: result.answer ?? "",
          topicTag: result.topicTag ?? null,
          reveal: null,
          openPanels: new Set(),
          feedback: new Map(),
        },
      ]);
      statusQuery.refetch();
    } catch {
      const id = crypto.randomUUID();
      setPairs((prev) => [
        ...prev,
        {
          id,
          question: text,
          answer: "Something went wrong — please try again.",
          topicTag: null,
          reveal: null,
          openPanels: new Set(),
          feedback: new Map(),
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  }

  async function handleGoDeeper(pairId: string) {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair || pair.reveal || isRevealing) return;
    setIsRevealing(pairId);
    trackEvent("freerun-go-deeper-click", { topic: pair.topicTag ?? "unknown" });

    try {
      const result = await goDeeperMutation.mutateAsync({
        question: pair.question,
        surfaceAnswer: pair.answer,
        topicTag: pair.topicTag ?? undefined,
      });

      if (result.insufficientCredits) {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === pairId
              ? { ...p, reveal: { revealId: -1, sciencePanel: "", vineyardPanel: "", craftPanel: "", wasFreeHook: false } }
              : p
          )
        );
        return;
      }

      if (result.success && result.sciencePanel) {
        setPairs((prev) =>
          prev.map((p) =>
            p.id === pairId
              ? {
                  ...p,
                  reveal: {
                    revealId: result.revealId ?? 0,
                    sciencePanel: result.sciencePanel!,
                    vineyardPanel: result.vineyardPanel!,
                    craftPanel: result.craftPanel!,
                    wasFreeHook: result.wasFreeHook ?? false,
                  },
                }
              : p
          )
        );
        trackEvent("freerun-go-deeper-unlocked", { topic: pair.topicTag ?? "unknown", wasFreeHook: result.wasFreeHook ?? false });
        statusQuery.refetch();
      }
    } catch {
      // silently fail
    } finally {
      setIsRevealing(null);
    }
  }

  function togglePanel(pairId: string, panel: "science" | "vineyard" | "craft") {
    setPairs((prev) =>
      prev.map((p) => {
        if (p.id !== pairId) return p;
        const next = new Set(p.openPanels);
        if (next.has(panel)) {
          next.delete(panel);
        } else {
          next.add(panel);
          trackEvent("freerun-panel-open", { panel, topic: p.topicTag ?? "unknown" });
        }
        return { ...p, openPanels: next };
      })
    );
  }

  function handleFeedback(pairId: string, panel: "science" | "vineyard" | "craft", thumbsUp: boolean) {
    const pair = pairs.find((p) => p.id === pairId);
    if (!pair?.reveal || pair.reveal.revealId <= 0) return;
    feedbackMutation.mutate({ revealId: pair.reveal.revealId, panel, thumbsUp });
    trackEvent("freerun-panel-feedback", { panel, thumbsUp, topic: pair.topicTag ?? "unknown" });
    setPairs((prev) =>
      prev.map((p) => {
        if (p.id !== pairId) return p;
        const next = new Map(p.feedback);
        next.set(panel, thumbsUp);
        return { ...p, feedback: next };
      })
    );
  }

  // ── Login gate ─────────────────────────────────────────────────────────────
  if (authLoading) {
    return (
      <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: "24px", height: "24px", border: "2px solid oklch(0.72 0.12 75)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
        <div className="container pt-6" style={{ maxWidth: "760px", margin: "0 auto" }}>
          <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "oklch(0.50 0.012 75)", textDecoration: "none", fontFamily: "'Lato',sans-serif" }}>
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
            Back to Ownology
          </Link>
        </div>
        <div className="container" style={{ maxWidth: "760px", margin: "0 auto", paddingTop: "80px", paddingBottom: "80px", textAlign: "center" }}>
          <div
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-sm mb-8"
            style={{
              background: "color-mix(in oklch, oklch(0.72 0.12 75) 10%, transparent)",
              border: "1px solid color-mix(in oklch, oklch(0.72 0.12 75) 30%, transparent)",
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.7rem",
              color: "oklch(0.72 0.12 75)",
              letterSpacing: "0.06em",
            }}
          >
            <span>◈</span>&nbsp;FREE RUN
          </div>

          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, color: "oklch(0.95 0.018 75)", letterSpacing: "-0.02em", marginBottom: "20px" }}>
            Understand wine<br />
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>from the inside out.</em>
          </h1>

          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.05rem", lineHeight: 1.75, color: "oklch(0.65 0.015 75)", maxWidth: "480px", margin: "0 auto 40px" }}>
            Ask anything about wine — the flavours, the science, the stories behind the glass. Real oenology, not dumbed down.
          </p>

          <div className="flex flex-col items-center gap-4">
            <a
              href={getLoginUrl("/free-run")}
              style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 28px", background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.9rem", letterSpacing: "0.04em", textDecoration: "none", borderRadius: "2px" }}
            >
              Sign in to start exploring <ArrowRight size={15} />
            </a>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.45 0.012 75)" }}>
              Free account · 3 questions per day · No card required
            </p>
          </div>

          <div className="flex flex-wrap justify-center gap-2 mt-12">
            {CURIOSITY_PROMPTS.slice(0, 6).map((p) => (
              <div key={p.label} className="px-3 py-1.5 rounded-sm text-xs" style={{ background: "oklch(0.16 0.010 60)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.60 0.015 75)", fontFamily: "'Lato', sans-serif" }}>
                {p.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Authenticated view ─────────────────────────────────────────────────────
  const questionsRemaining = status?.questionsRemaining ?? 3;
  const questionsUsed = status?.questionsUsedToday ?? 0;
  const creditBalance = status?.creditBalance ?? 0;
  const hasQuestionsLeft = questionsRemaining > 0;

  return (
    <div style={{ background: "oklch(0.11 0.008 60)", minHeight: "100vh" }}>
      <div className="container pt-6 pb-0" style={{ maxWidth: "760px", margin: "0 auto" }}>
        <Link href="/" style={{ display: "inline-flex", alignItems: "center", gap: "6px", fontSize: "0.75rem", color: "oklch(0.50 0.012 75)", textDecoration: "none", fontFamily: "'Lato',sans-serif" }}>
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M9 2L4 7l5 5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
          Back to Ownology
        </Link>
      </div>

      <div className="container pt-8 pb-24" style={{ maxWidth: "760px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div
                className="px-3 py-1.5 rounded-sm text-xs flex items-center gap-2"
                style={{ background: "color-mix(in oklch, oklch(0.72 0.12 75) 10%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.72 0.12 75) 30%, transparent)", fontFamily: "'Fira Code',monospace", color: "oklch(0.72 0.12 75)", letterSpacing: "0.06em" }}
              >
                <span style={{ fontSize: "0.8rem" }}>◈</span> FREE RUN
              </div>
              <div className="flex items-center gap-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="w-2 h-2 rounded-full" style={{ background: i < questionsUsed ? "oklch(0.72 0.12 75)" : "oklch(1 0 0 / 0.12)" }} />
                ))}
                <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.65rem", color: "oklch(0.45 0.012 75)", marginLeft: "4px" }}>
                  {questionsRemaining} left today
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {creditBalance > 0 && (
                <div
                  className="px-2.5 py-1 rounded-sm text-xs flex items-center gap-1.5"
                  style={{ background: "color-mix(in oklch, oklch(0.65 0.18 145) 10%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.65 0.18 145) 25%, transparent)", fontFamily: "'Fira Code',monospace", color: "oklch(0.65 0.18 145)", letterSpacing: "0.04em" }}
                >
                  <Sparkles size={10} />
                  {creditBalance} credit{creditBalance !== 1 ? "s" : ""}
                </div>
              )}
              <Link
                href="/pricing"
                onClick={() => trackEvent('press-cta-click', { location: 'header' })}
                style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 12px", background: "oklch(0.16 0.010 60)", border: "1px solid oklch(1 0 0 / 0.10)", color: "oklch(0.60 0.015 75)", fontFamily: "'Lato',sans-serif", textDecoration: "none", letterSpacing: "0.04em", fontSize: "0.75rem", borderRadius: "2px" }}
              >
                The Press →
              </Link>
            </div>
          </div>

          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(1.8rem, 3.5vw, 2.5rem)", lineHeight: 1.1, color: "oklch(0.95 0.018 75)", letterSpacing: "-0.02em", marginBottom: "12px" }}>
            What do you want to understand about wine?
          </h1>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.95rem", color: "oklch(0.60 0.015 75)", lineHeight: 1.6 }}>
            Ask anything — flavours, aromas, regions, science, stories. Grounded in real oenology.
          </p>
        </div>

        {/* Conversation */}
        {pairs.length > 0 && (
          <div className="mb-8 flex flex-col gap-8">
            {pairs.map((pair) => (
              <div key={pair.id}>
                {/* Question */}
                <div className="flex justify-end mb-4">
                  <div
                    className="px-4 py-3 rounded-sm max-w-lg"
                    style={{ background: "oklch(0.18 0.010 60)", border: "1px solid oklch(1 0 0 / 0.08)", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem", color: "oklch(0.85 0.015 75)", lineHeight: 1.6 }}
                  >
                    {pair.question}
                  </div>
                </div>

                {/* Answer */}
                <div className="px-5 py-4 rounded-sm mb-4" style={{ background: "oklch(0.14 0.008 60)", border: "1px solid oklch(1 0 0 / 0.06)" }}>
                  {pair.topicTag && (
                    <div
                      className="inline-block px-2 py-0.5 rounded-sm text-xs mb-3"
                      style={{ background: "color-mix(in oklch, oklch(0.72 0.12 75) 10%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.72 0.12 75) 20%, transparent)", fontFamily: "'Fira Code',monospace", color: "oklch(0.65 0.10 75)", letterSpacing: "0.05em", fontSize: "0.65rem" }}
                    >
                      {pair.topicTag}
                    </div>
                  )}

                  <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.9rem", lineHeight: 1.8, color: "oklch(0.75 0.015 75)", whiteSpace: "pre-wrap" }}>
                    {pair.answer}
                  </p>

                  {!pair.reveal && !pair.answer.includes("daily curiosity allowance") && (
                    <div className="mt-4 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
                      <button
                        onClick={() => handleGoDeeper(pair.id)}
                        disabled={isRevealing === pair.id}
                        className="flex items-center gap-2 px-4 py-2 rounded-sm text-sm transition-all"
                        style={{
                          background: "color-mix(in oklch, oklch(0.72 0.12 75) 12%, transparent)",
                          border: "1px solid color-mix(in oklch, oklch(0.72 0.12 75) 35%, transparent)",
                          color: "oklch(0.72 0.12 75)",
                          fontFamily: "'Lato', sans-serif",
                          fontWeight: 600,
                          letterSpacing: "0.03em",
                          cursor: isRevealing === pair.id ? "wait" : "pointer",
                          opacity: isRevealing === pair.id ? 0.6 : 1,
                        }}
                      >
                        {isRevealing === pair.id ? (
                          <>
                            <div style={{ width: "12px", height: "12px", border: "1.5px solid oklch(0.72 0.12 75)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                            Revealing the triangle…
                          </>
                        ) : (
                          <>
                            <Sparkles size={13} />
                            Deep Dive
                            {creditBalance === 0 && (
                              <span style={{ fontSize: "0.7rem", opacity: 0.7, marginLeft: "2px" }}>(first one free)</span>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  )}

                  {pair.reveal?.revealId === -1 && (
                    <div className="mt-4 pt-3" style={{ borderTop: "1px solid oklch(1 0 0 / 0.06)" }}>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "oklch(0.60 0.015 75)", marginBottom: "12px" }}>
                        You've used your free reveal. Top up to deep dive.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {(["bottle", "case", "obsessed"] as const).map((packId) => {
                          const labels = { bottle: "5 credits — $4", case: "15 credits — $9", obsessed: "40 credits — $19" };
                          const isLoading = pendingPackId === packId && checkoutMutation.isPending;
                          return (
                            <button
                              key={packId}
                              onClick={() => handleBuyCredits(packId)}
                              disabled={checkoutMutation.isPending}
                              style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: packId === 'bottle' ? "oklch(0.72 0.12 75)" : "oklch(0.18 0.010 60)", border: `1px solid ${packId === 'bottle' ? 'oklch(0.72 0.12 75)' : 'oklch(1 0 0 / 0.12)'}`, color: packId === 'bottle' ? "oklch(0.11 0.008 60)" : "oklch(0.72 0.015 75)", fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.8rem", borderRadius: "2px", cursor: checkoutMutation.isPending ? "wait" : "pointer", opacity: checkoutMutation.isPending && !isLoading ? 0.5 : 1 }}
                            >
                              {isLoading ? <div style={{ width: "11px", height: "11px", border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : null}
                              {labels[packId]}
                            </button>
                          );
                        })}
                      </div>
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.40 0.010 75)", marginTop: "8px" }}>
                        Or get unlimited with <Link href="/pricing" style={{ color: "oklch(0.72 0.12 75)", textDecoration: "none" }}>The Press — $41/month</Link>
                      </p>
                    </div>
                  )}
                </div>

                {/* Triangle reveal */}
                {pair.reveal && pair.reveal.revealId !== -1 && (
                  <div className="flex flex-col gap-2 mb-4">
                    {pair.reveal.wasFreeHook && (
                      <div
                        className="px-3 py-2 rounded-sm text-xs mb-1 flex items-center gap-2"
                        style={{ background: "color-mix(in oklch, oklch(0.65 0.18 145) 8%, transparent)", border: "1px solid color-mix(in oklch, oklch(0.65 0.18 145) 20%, transparent)", fontFamily: "'Lato', sans-serif", color: "oklch(0.65 0.18 145)" }}
                      >
                        <Sparkles size={11} />
                        Your first Deep Dive is free — welcome to the rabbit hole.
                      </div>
                    )}

                    <TrianglePanel
                      icon={<Beaker size={14} />}
                      label="The Science"
                      color="oklch(0.60 0.18 220)"
                      content={pair.reveal.sciencePanel}
                      panelKey="science"
                      isOpen={pair.openPanels.has("science")}
                      onToggle={() => togglePanel(pair.id, "science")}
                      feedback={pair.feedback.get("science")}
                      onFeedback={(v) => handleFeedback(pair.id, "science", v)}
                    />
                    <TrianglePanel
                      icon={<Sprout size={14} />}
                      label="The Vineyard"
                      color="oklch(0.65 0.18 145)"
                      content={pair.reveal.vineyardPanel}
                      panelKey="vineyard"
                      isOpen={pair.openPanels.has("vineyard")}
                      onToggle={() => togglePanel(pair.id, "vineyard")}
                      feedback={pair.feedback.get("vineyard")}
                      onFeedback={(v) => handleFeedback(pair.id, "vineyard", v)}
                    />
                    <TrianglePanel
                      icon={<Wine size={14} />}
                      label="The Craft"
                      color="oklch(0.72 0.12 75)"
                      content={pair.reveal.craftPanel}
                      panelKey="craft"
                      isOpen={pair.openPanels.has("craft")}
                      onToggle={() => togglePanel(pair.id, "craft")}
                      feedback={pair.feedback.get("craft")}
                      onFeedback={(v) => handleFeedback(pair.id, "craft", v)}
                    />

                    <div
                      className="mt-2 px-4 py-3 rounded-sm flex items-center justify-between"
                      style={{ background: "oklch(0.14 0.008 60)", border: "1px solid oklch(1 0 0 / 0.06)" }}
                    >
                      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8rem", color: "oklch(0.55 0.015 75)", fontStyle: "italic" }}>
                        Ready to make it, not just drink it?
                      </p>
                      <Link
                        href="/pricing"
                        onClick={() => trackEvent('press-cta-click', { location: 'answer-card' })}
                        style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "6px 14px", background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 700, textDecoration: "none", letterSpacing: "0.03em", fontSize: "0.75rem", borderRadius: "2px", whiteSpace: "nowrap" }}
                      >
                        The Press <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>
        )}

        {/* Empty state prompts */}
        {pairs.length === 0 && (
          <div className="mb-8">
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.45 0.012 75)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: "12px" }}>
              Try asking…
            </p>
            <div className="flex flex-wrap gap-2">
              {CURIOSITY_PROMPTS.map((p) => (
                <button
                  key={p.label}
                  onClick={() => handleAsk(p.q)}
                  className="px-3 py-2 rounded-sm text-xs transition-all"
                  style={{ background: "oklch(0.15 0.008 60)", border: "1px solid oklch(1 0 0 / 0.08)", color: "oklch(0.65 0.015 75)", fontFamily: "'Lato', sans-serif", cursor: "pointer" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "color-mix(in oklch, oklch(0.72 0.12 75) 40%, transparent)"; e.currentTarget.style.color = "oklch(0.72 0.12 75)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "oklch(1 0 0 / 0.08)"; e.currentTarget.style.color = "oklch(0.65 0.015 75)"; }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input */}
        <div
          className="sticky bottom-6"
          style={{ background: "oklch(0.13 0.008 60)", border: "1px solid oklch(1 0 0 / 0.10)", borderRadius: "4px", padding: "12px" }}
        >
          {!hasQuestionsLeft ? (
            <div className="text-center py-2">
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.85rem", color: "oklch(0.55 0.015 75)", marginBottom: "8px" }}>
                You've used your 3 questions for today. Come back tomorrow.
              </p>
              <Link
                href="/pricing"
                onClick={() => trackEvent('press-cta-click', { location: 'daily-limit' })}
                style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif", fontWeight: 700, textDecoration: "none", fontSize: "0.8rem", borderRadius: "2px" }}
              >
                Upgrade to The Press for unlimited <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="flex gap-3 items-center">
              <input
                ref={inputRef}
                type="text"
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); handleAsk(); } }}
                placeholder="Ask anything about wine…"
                disabled={isAsking}
                style={{ flex: 1, background: "transparent", border: "none", outline: "none", fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.95rem", color: "oklch(0.85 0.015 75)", lineHeight: 1.6, padding: "4px 0", caretColor: "oklch(0.72 0.12 75)" }}
              />
              <button
                onClick={() => handleAsk()}
                disabled={!question.trim() || isAsking}
                style={{ width: "36px", height: "36px", background: question.trim() && !isAsking ? "oklch(0.72 0.12 75)" : "oklch(0.20 0.010 60)", border: "none", borderRadius: "2px", cursor: question.trim() && !isAsking ? "pointer" : "not-allowed", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
              >
                {isAsking ? (
                  <div style={{ width: "14px", height: "14px", border: "1.5px solid oklch(0.72 0.12 75)", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                ) : (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M2 12L12 7 2 2v3.5l7 1.5-7 1.5V12z" fill={question.trim() ? "oklch(0.11 0.008 60)" : "oklch(0.45 0.012 75)"} />
                  </svg>
                )}
              </button>
            </div>
          )}
        </div>

        {/* Credit upsell nudge */}
        {creditBalance === 0 && pairs.some((p) => p.reveal && p.reveal.revealId !== -1) && (
          <div
            className="mt-6 px-5 py-4 rounded-sm"
            style={{ background: "oklch(0.14 0.008 60)", border: "1px solid color-mix(in oklch, oklch(0.72 0.12 75) 20%, transparent)" }}
          >
            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.85rem", color: "oklch(0.85 0.015 75)", marginBottom: "4px" }}>
              Want to deep dive on your next question?
            </p>
            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: "oklch(0.55 0.015 75)", marginBottom: "12px" }}>
              Pick a pack — credits never expire.
            </p>
            <div className="flex flex-wrap gap-2">
              {(["bottle", "case", "obsessed"] as const).map((packId) => {
                const labels = { bottle: "5 credits — $4", case: "15 credits — $9", obsessed: "40 credits — $19" };
                const names = { bottle: "A Bottle of Curiosity", case: "A Case of Questions", obsessed: "The Obsessive" };
                const isLoading = pendingPackId === packId && checkoutMutation.isPending;
                return (
                  <button
                    key={packId}
                    onClick={() => handleBuyCredits(packId)}
                    disabled={checkoutMutation.isPending}
                    title={names[packId]}
                    style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "7px 14px", background: packId === 'bottle' ? "oklch(0.72 0.12 75)" : "oklch(0.18 0.010 60)", border: `1px solid ${packId === 'bottle' ? 'oklch(0.72 0.12 75)' : 'oklch(1 0 0 / 0.12)'}`, color: packId === 'bottle' ? "oklch(0.11 0.008 60)" : "oklch(0.72 0.015 75)", fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.8rem", borderRadius: "2px", cursor: checkoutMutation.isPending ? "wait" : "pointer", opacity: checkoutMutation.isPending && !isLoading ? 0.5 : 1 }}
                  >
                    {isLoading ? <div style={{ width: "11px", height: "11px", border: "1.5px solid currentColor", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} /> : null}
                    {labels[packId]}
                  </button>
                );
              })}
            </div>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.40 0.010 75)", marginTop: "10px" }}>
              Or get unlimited with <Link href="/pricing" style={{ color: "oklch(0.72 0.12 75)", textDecoration: "none" }}>The Press — $41/month</Link>
            </p>
          </div>
        )}
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
