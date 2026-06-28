/**
 * FreeRun (Ask) — Wine Curiosity Experience
 * DailyMe-inspired: light background, curiosity cards, daily question limit (3/day)
 * Deep Dive triangle: Science / Vineyard / Craft panels with credit system
 */

import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import ThePressCtaCard from "@/components/ThePressCtaCard";
import VoiceMicButton from "@/components/VoiceMicButton";
import { getLoginUrl } from "@/const";
import { Loader2, ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";

// ── Work Mode brand accent (amber) ───────────────────────────────────────────
const ACCENT = "#B0741A"; // deep amber — text, strokes, active accents
const ACCENT_INK = "#2A1E0A"; // near-black warm ink for text on amber fills
const ACCENT_SOFT = "#FBF3E4"; // amber-tinted surface
const ACCENT_BORDER = "#E8D3A8"; // soft amber border

// Lightweight analytics helper (mirrors ThePress.trackEvent)
function trackFreeRunEvent(eventName: string, eventData?: Record<string, unknown>) {
  if (typeof window !== "undefined" && (window as unknown as { gtag?: (...a: unknown[]) => void }).gtag) {
    (window as unknown as { gtag: (...a: unknown[]) => void }).gtag("event", eventName, eventData ?? {});
  }
}

interface Message {
  id: string;
  question: string;
  surfaceAnswer: string;
  topicTag?: string;
  timestamp: Date;
  deepDiveExpanded?: boolean;
  sciencePanel?: string;
  vineyardPanel?: string;
  craftPanel?: string;
  /** True when this row is the synthetic "AI budget paused" message — UI
   *  renders an upgrade CTA instead of Deep Dive controls. */
  isPaused?: boolean;
}

/**
 * CommunityBadge — anonymised "shared with the community" pill shown on a Go Deeper
 * reveal when the Trinity pipeline has published that reveal as a community blog piece.
 */
function CommunityBadge({ messageId }: { messageId: string }) {
  const revealId = parseInt(messageId, 10);
  const { data } = trpc.trinity.getByReveal.useQuery(
    { revealId },
    { enabled: !isNaN(revealId) && revealId > 0 }
  );
  if (!data?.shared) return null;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        padding: "0.5rem 0.85rem",
        borderRadius: "999px",
        background: "color-mix(in oklch, var(--ow-amber, #C99A4B) 12%, transparent)",
        border: "1px solid color-mix(in oklch, var(--ow-amber, #C99A4B) 35%, transparent)",
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.78rem",
        color: "var(--ow-amber, #9A6B2F)",
        width: "fit-content",
      }}
      title="An anonymised version of this answer was published to the community blog"
    >
      <span aria-hidden>✦</span>
      <span>This answer was shared with the community</span>
    </div>
  );
}

const CURIOSITY_CARDS = [
  { id: 1, label: "Wine Science", emoji: "🧪", desc: "Fermentation, tannins, acidity" },
  { id: 2, label: "Flavour & Aroma", emoji: "👃", desc: "Tasting notes and sensory science" },
  { id: 3, label: "Vineyard & Terroir", emoji: "🍇", desc: "Climate, soil, and regional character" },
  { id: 4, label: "Varietals", emoji: "🍷", desc: "Grape types and their personalities" },
  { id: 5, label: "Food Pairing", emoji: "🍽️", desc: "Wine and food harmony" },
  { id: 6, label: "Wine History", emoji: "📚", desc: "Origins, traditions, and evolution" },
];

export default function FreeRun() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [expandedMessageId, setExpandedMessageId] = useState<string | null>(null);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [questionsUsed, setQuestionsUsed] = useState<number>(0);
  const [showSignInNudge, setShowSignInNudge] = useState(false);

  // tRPC queries/mutations
  const authCheckQuery = trpc.freeRun.authCheck.useQuery();
  const curiosityAskMutation = trpc.freeRun.curiosityAsk.useMutation();
  const goDeepperMutation = trpc.freeRun.goDeeper.useMutation();
  const submitFeedbackMutation = trpc.freeRun.submitFeedback.useMutation();

  const isAuthenticated = authCheckQuery.data?.isAuthenticated ?? false;

  // Load messages from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem("ow_free_run_messages");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setMessages(parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) })));
      } catch {
        // Ignore parse errors
      }
    }
  }, []);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("ow_free_run_messages", JSON.stringify(messages));
  }, [messages]);

  // S8-D: prefill the input from a ?q= deep link (e.g. from a Knowledge SOP "Learn more" link).
  // We prefill but do NOT auto-send, so the user keeps control of their daily question budget.
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        setInput(q);
        trackFreeRunEvent("free_run_seeded_from_sop", { q });
      }
    } catch {
      // ignore
    }
  }, []);

  const handleCuriosityCardClick = (label: string) => {
    setInput(`Tell me about ${label.toLowerCase()}`);
  };

  // Guards against an in-flight request so a voice transcript can't double-send.
  const sendingRef = useRef(false);

  // Core send: takes an explicit question string so voice input can submit
  // its transcript directly without waiting for the input state to flush.
  const submitQuestion = async (question: string) => {
    const q = question.trim();
    if (!q || sendingRef.current) return;
    // Work Mode is open: anyone can browse. Asking a question requires an account
    // (daily limit + credits are tracked server-side), so nudge — don't hard-gate.
    if (!isAuthenticated) {
      setShowSignInNudge(true);
      return;
    }
    sendingRef.current = true;

    setIsLoading(true);
    try {
      const result = await curiosityAskMutation.mutateAsync({ question: q });

      if (result.paused) {
        // Friendly budget-paused state. NOT a quota issue — the AI service
        // itself is throttled. Surface upgrade CTA + retry-at hint.
        const retryAt = result.retryAt ? new Date(result.retryAt) : null;
        const retryStr = retryAt
          ? retryAt.toLocaleTimeString("en-AU", { hour: "numeric", minute: "2-digit", timeZone: "Australia/Sydney" })
          : "midnight UTC";
        const pausedMessage: Message = {
          id: Date.now().toString(),
          question: q,
          surfaceAnswer: `${result.pausedMessage ?? "We've reached today's free-tier AI budget."} Try again after ${retryStr} (Sydney) — or upgrade to Premium for unlimited Curiosity questions.`,
          topicTag: undefined,
          timestamp: new Date(),
          deepDiveExpanded: false,
          isPaused: true,
        };
        setMessages((prev) => [...prev, pausedMessage]);
      } else if (result.limitReached) {
        // Show daily limit reached message
        const limitMessage: Message = {
          id: Date.now().toString(),
          question: q,
          surfaceAnswer: `You've reached your daily limit of ${result.questionsTotal} questions. Come back tomorrow to explore more!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, limitMessage]);
      } else {
        // Add new message with surface answer
        const newMessage: Message = {
          id: Date.now().toString(),
          question: q,
          surfaceAnswer: result.answer || "",
          topicTag: result.topicTag ?? undefined,
          timestamp: new Date(),
          deepDiveExpanded: false,
        };
        setMessages((prev) => [...prev, newMessage]);
        setQuestionsUsed(result.questionsUsed ?? 0);
      }

      setInput("");
    } catch (error) {
      console.error("Error sending question:", error);
    } finally {
      setIsLoading(false);
      sendingRef.current = false;
    }
  };

  // Manual send from the text input / Enter key.
  const handleSend = () => submitQuestion(input);

  // Voice: prefill the input for visibility, then auto-submit the transcript.
  const handleVoiceTranscript = (text: string) => {
    setInput(text);
    trackFreeRunEvent("free_run_voice_input", { length: text.length });
    submitQuestion(text);
  };

  const handleDeepDive = async (messageId: string) => {
    const message = messages.find((m) => m.id === messageId);
    if (!message) return;

    setIsLoading(true);
    try {
      const result = await goDeepperMutation.mutateAsync({
        question: message.question,
        surfaceAnswer: message.surfaceAnswer,
        topicTag: message.topicTag,
      });

      if (result.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === messageId
              ? {
                  ...m,
                  deepDiveExpanded: true,
                  sciencePanel: result.sciencePanel || "",
                  vineyardPanel: result.vineyardPanel || "",
                  craftPanel: result.craftPanel || "",
                }
              : m
          )
        );
        if (result.balance !== null) {
          setUserCredits(result.balance);
        }
      } else if (result.insufficientCredits) {
        // Show credit purchase prompt
        alert("You need credits to unlock Deep Dive. Purchase a credit pack to continue.");
      }
    } catch (error) {
      console.error("Error unlocking Deep Dive:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFeedback = async (messageId: string, panel: "science" | "vineyard" | "craft", thumbsUp: boolean) => {
    try {
      const revealIdNum = parseInt(messageId, 10);
      if (isNaN(revealIdNum)) return;
      await submitFeedbackMutation.mutateAsync({
        revealId: revealIdNum,
        panel,
        thumbsUp,
      });
      // Optional: Show feedback confirmation toast
    } catch (error) {
      console.error("Error submitting feedback:", error);
    }
  };

  return (
    <>
      <div style={{ padding: "1.5rem 1rem", maxWidth: "640px", margin: "0 auto", width: "100%" }}>
        {/* Daily limit indicator */}
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.75rem 1rem",
            background: ACCENT_SOFT,
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "#1A1A1A", fontWeight: 600 }}>
            Today&apos;s Questions
          </span>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: ACCENT, fontWeight: 700 }}>
            {questionsUsed} / 3
          </span>
        </div>

        {/* If no messages, show curiosity cards */}
        {messages.length === 0 ? (
          <div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.75rem",
                fontWeight: 700,
                color: "#1A1A1A",
                marginBottom: "0.5rem",
                lineHeight: 1.2,
              }}
            >
              Understand wine from the inside out
            </h2>
            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.95rem",
                color: "#666666",
                marginBottom: "2rem",
                lineHeight: 1.5,
              }}
            >
              Ask anything about wine science, flavours, regions, or pairings. Powered by real oenology.
            </p>

            {/* Curiosity cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              {CURIOSITY_CARDS.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleCuriosityCardClick(card.label)}
                  style={{
                    padding: "1.25rem 1rem",
                    background: "#FFFFFF",
                    border: "1px dashed #E8EAED",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "center",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = ACCENT_SOFT;
                    e.currentTarget.style.borderColor = ACCENT;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = "#FFFFFF";
                    e.currentTarget.style.borderColor = "#E8EAED";
                  }}
                >
                  <div style={{ fontSize: "1.75rem", marginBottom: "0.5rem" }}>{card.emoji}</div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.875rem",
                      fontWeight: 600,
                      color: "#1A1A1A",
                      marginBottom: "0.25rem",
                    }}
                  >
                    {card.label}
                  </div>
                  <div
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.75rem",
                      color: "#999",
                      lineHeight: 1.3,
                    }}
                  >
                    {card.desc}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages view */
          <div style={{ marginBottom: "1rem" }}>
            {messages.map((msg) => (
              <div key={msg.id} style={{ marginBottom: "1.5rem" }}>
                {/* User question */}
                <div
                  style={{
                    marginBottom: "0.75rem",
                    display: "flex",
                    justifyContent: "flex-end",
                  }}
                >
                  <div
                    style={{
                      maxWidth: "85%",
                      padding: "0.875rem 1rem",
                      borderRadius: "12px",
                      background: ACCENT,
                      color: ACCENT_INK,
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.95rem",
                      lineHeight: 1.5,
                    }}
                  >
                    {msg.question}
                  </div>
                </div>

                {/* Surface answer */}
                <div
                  data-testid={msg.isPaused ? `freerun-paused-card-${msg.id}` : `freerun-answer-card-${msg.id}`}
                  style={{
                    maxWidth: "85%",
                    padding: "1rem",
                    borderRadius: "12px",
                    background: msg.isPaused ? "#FEF3C7" : "#FFFFFF",
                    border: msg.isPaused ? `1px solid ${ACCENT}` : "1px solid #E8EAED",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    color: "#1A1A1A",
                  }}
                >
                  {msg.isPaused && (
                    <div
                      style={{
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.7rem",
                        letterSpacing: "0.12em",
                        textTransform: "uppercase",
                        color: ACCENT,
                        fontWeight: 700,
                        marginBottom: "0.5rem",
                      }}
                    >
                      ✦ Daily AI budget reached
                    </div>
                  )}
                  <p style={{ margin: 0, marginBottom: "0.75rem" }}>{msg.surfaceAnswer}</p>

                  {/* Paused → Upgrade CTA */}
                  {msg.isPaused && (
                    <a
                      href="/pricing"
                      data-testid={`freerun-paused-upgrade-${msg.id}`}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 1rem",
                        background: ACCENT,
                        color: ACCENT_INK,
                        borderRadius: "20px",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.85rem",
                        fontWeight: 700,
                        textDecoration: "none",
                      }}
                    >
                      Upgrade to Premium →
                    </a>
                  )}

                  {/* Deep Dive button — hidden when paused */}
                  {!msg.isPaused && !msg.deepDiveExpanded && (
                    <button
                      onClick={() => handleDeepDive(msg.id)}
                      disabled={isLoading}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        background: ACCENT_SOFT,
                        border: `1px solid ${ACCENT}`,
                        borderRadius: "20px",
                        color: ACCENT,
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        cursor: isLoading ? "not-allowed" : "pointer",
                        opacity: isLoading ? 0.5 : 1,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />
                      ) : (
                        "△ Deep Dive"
                      )}
                    </button>
                  )}
                </div>

                {/* Deep Dive triangle panels */}
                {msg.deepDiveExpanded && (
                  <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
                    <CommunityBadge messageId={msg.id} />
                    {/* Science panel */}
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "#F8F9FA",
                        border: "1px solid #E8EAED",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          marginBottom: "0.5rem",
                        }}
                      >
                        🧬 The Science
                      </div>
                      <p
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.9rem",
                          lineHeight: 1.6,
                          color: "#1A1A1A",
                          margin: 0,
                          marginBottom: "0.75rem",
                        }}
                      >
                        {msg.sciencePanel}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleFeedback(msg.id, "science", true)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "science", false)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Vineyard panel */}
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "#F8F9FA",
                        border: "1px solid #E8EAED",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          marginBottom: "0.5rem",
                        }}
                      >
                        🍇 The Vineyard
                      </div>
                      <p
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.9rem",
                          lineHeight: 1.6,
                          color: "#1A1A1A",
                          margin: 0,
                          marginBottom: "0.75rem",
                        }}
                      >
                        {msg.vineyardPanel}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleFeedback(msg.id, "vineyard", true)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "vineyard", false)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>

                    {/* Craft panel */}
                    <div
                      style={{
                        padding: "1rem",
                        borderRadius: "12px",
                        background: "#F8F9FA",
                        border: "1px solid #E8EAED",
                      }}
                    >
                      <div
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.875rem",
                          fontWeight: 700,
                          color: "#1A1A1A",
                          marginBottom: "0.5rem",
                        }}
                      >
                        🎨 The Craft
                      </div>
                      <p
                        style={{
                          fontFamily: "'Lato', sans-serif",
                          fontSize: "0.9rem",
                          lineHeight: 1.6,
                          color: "#1A1A1A",
                          margin: 0,
                          marginBottom: "0.75rem",
                        }}
                      >
                        {msg.craftPanel}
                      </p>
                      <div style={{ display: "flex", gap: "0.5rem" }}>
                        <button
                          onClick={() => handleFeedback(msg.id, "craft", true)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsUp size={12} />
                        </button>
                        <button
                          onClick={() => handleFeedback(msg.id, "craft", false)}
                          style={{
                            padding: "0.375rem 0.75rem",
                            background: "#FFFFFF",
                            border: "1px solid #E8EAED",
                            borderRadius: "6px",
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            fontFamily: "'Lato', sans-serif",
                            fontSize: "0.75rem",
                            color: "#666",
                          }}
                        >
                          <ThumbsDown size={12} />
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* S8-E: Learn→Do bridge — contextual Press CTA after at least one answer */}
            {messages.length > 0 && !isLoading && (
              <ThePressCtaCard onClick={() => trackFreeRunEvent("press_cta_clicked")} />
            )}

            {isLoading && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  padding: "1rem",
                  background: "#FFFFFF",
                  borderRadius: "12px",
                  border: "1px solid #E8EAED",
                }}
              >
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: ACCENT,
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: ACCENT,
                    animation: "pulse 1.5s ease-in-out infinite 0.2s",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: ACCENT,
                    animation: "pulse 1.5s ease-in-out infinite 0.4s",
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Input field (always visible) */}
      {questionsUsed < 3 && (
        <div
          style={{
            position: "fixed",
            bottom: "5rem",
            left: "50%",
            transform: "translateX(-50%)",
            width: "100%",
            maxWidth: "430px",
            padding: "1rem",
            background: "linear-gradient(to top, #F8F9FA, transparent)",
            display: "flex",
            gap: "0.75rem",
            zIndex: 30,
          }}
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === "Enter" && handleSend()}
            placeholder="Ask a question..."
            style={{
              flex: 1,
              padding: "0.875rem 1rem",
              borderRadius: "24px",
              border: "1px solid #E8EAED",
              background: "#FFFFFF",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.95rem",
              color: "#1A1A1A",
              outline: "none",
              transition: "border-color 0.2s",
            }}
            onFocus={(e) => (e.currentTarget.style.borderColor = ACCENT)}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E8EAED")}
          />
          <VoiceMicButton
            onTranscript={handleVoiceTranscript}
            disabled={isLoading}
            accent={ACCENT}
            idleBg="#FFFFFF"
            idleBorder="#E8EAED"
            idleColor="#666666"
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "24px",
              border: "none",
              background: input.trim() && !isLoading ? ACCENT : "#E8EAED",
              color: input.trim() && !isLoading ? ACCENT_INK : "#999999",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: input.trim() && !isLoading ? "pointer" : "not-allowed",
              transition: "background 0.2s",
            }}
          >
            Send
          </button>
        </div>
      )}

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>

      {/* Inline sign-in nudge (Work Mode is open; asking needs an account) */}
      {showSignInNudge && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 60,
            padding: "1rem",
          }}
          onClick={() => setShowSignInNudge(false)}
        >
          <div
            style={{
              background: "#FFFFFF",
              borderRadius: "16px",
              padding: "1.75rem 1.5rem",
              maxWidth: "340px",
              textAlign: "center",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.25rem", fontWeight: 700, color: "#1A1A1A", marginBottom: "0.6rem" }}>
              Create a free account
            </h3>
            <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.92rem", color: "#666", marginBottom: "1.25rem", lineHeight: 1.5 }}>
              Browsing is open. To ask Ownology, sign in for 3 free curiosity questions a day.
            </p>
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={() => setShowSignInNudge(false)}
                style={{
                  flex: 1,
                  padding: "0.8rem",
                  borderRadius: "24px",
                  border: "1px solid #E2E4E8",
                  background: "#FFFFFF",
                  color: "#1A1A1A",
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Not now
              </button>
              <button
                onClick={() => { window.location.href = getLoginUrl("/free-run"); }}
                style={{
                  flex: 1,
                  padding: "0.8rem",
                  borderRadius: "24px",
                  border: "none",
                  background: ACCENT,
                  color: ACCENT_INK,
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.9rem",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Sign In
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
