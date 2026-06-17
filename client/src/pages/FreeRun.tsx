/**
 * FreeRun (Ask) — Wine Curiosity Experience
 * DailyMe-inspired: light background, curiosity cards, daily question limit (3/day)
 * Deep Dive triangle: Science / Vineyard / Craft panels with credit system
 */

import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import WorkModeLayout from "@/components/WorkModeLayout";
import { Loader2, ChevronDown, ThumbsUp, ThumbsDown } from "lucide-react";

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

  const handleCuriosityCardClick = (label: string) => {
    setInput(`Tell me about ${label.toLowerCase()}`);
  };

  const handleSend = async () => {
    if (!input.trim() || !isAuthenticated) return;

    setIsLoading(true);
    try {
      const result = await curiosityAskMutation.mutateAsync({ question: input });

      if (result.limitReached) {
        // Show daily limit reached message
        const limitMessage: Message = {
          id: Date.now().toString(),
          question: input,
          surfaceAnswer: `You've reached your daily limit of ${result.questionsTotal} questions. Come back tomorrow to explore more!`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, limitMessage]);
      } else {
        // Add new message with surface answer
        const newMessage: Message = {
          id: Date.now().toString(),
          question: input,
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
    }
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

  if (!isAuthenticated) {
    return (
      <WorkModeLayout title="Ask Ownology" activeTab="ask">
        <div style={{ padding: "2rem 1rem", textAlign: "center" }}>
          <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", marginBottom: "1rem", color: "#1A1A1A" }}>
            Sign in to explore wine
          </h2>
          <p style={{ color: "#666", marginBottom: "2rem" }}>
            Create an account to unlock 3 free curiosity questions per day.
          </p>
          <button
            style={{
              padding: "0.875rem 1.5rem",
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              borderRadius: "24px",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.95rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Sign In
          </button>
        </div>
      </WorkModeLayout>
    );
  }

  return (
    <WorkModeLayout title="Ask Ownology" activeTab="ask">
      <div style={{ padding: "1.5rem 1rem" }}>
        {/* Daily limit indicator */}
        <div
          style={{
            marginBottom: "1.5rem",
            padding: "0.75rem 1rem",
            background: "#F0F4FF",
            borderRadius: "8px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "#1A1A1A", fontWeight: 600 }}>
            Today's Questions
          </span>
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "#2563EB", fontWeight: 700 }}>
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
                    e.currentTarget.style.background = "#F0F4FF";
                    e.currentTarget.style.borderColor = "#2563EB";
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
                      background: "#2563EB",
                      color: "#FFFFFF",
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
                  style={{
                    maxWidth: "85%",
                    padding: "1rem",
                    borderRadius: "12px",
                    background: "#FFFFFF",
                    border: "1px solid #E8EAED",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.6,
                    color: "#1A1A1A",
                  }}
                >
                  <p style={{ margin: 0, marginBottom: "0.75rem" }}>{msg.surfaceAnswer}</p>

                  {/* Deep Dive button */}
                  {!msg.deepDiveExpanded && (
                    <button
                      onClick={() => handleDeepDive(msg.id)}
                      disabled={isLoading}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.5rem",
                        padding: "0.5rem 1rem",
                        background: "#F0F4FF",
                        border: "1px solid #2563EB",
                        borderRadius: "20px",
                        color: "#2563EB",
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
                    background: "#2563EB",
                    animation: "pulse 1.5s ease-in-out infinite",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#2563EB",
                    animation: "pulse 1.5s ease-in-out infinite 0.2s",
                  }}
                />
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#2563EB",
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
            onFocus={(e) => (e.currentTarget.style.borderColor = "#2563EB")}
            onBlur={(e) => (e.currentTarget.style.borderColor = "#E8EAED")}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              padding: "0.875rem 1.5rem",
              borderRadius: "24px",
              border: "none",
              background: input.trim() && !isLoading ? "#2563EB" : "#E8EAED",
              color: input.trim() && !isLoading ? "#FFFFFF" : "#999999",
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
    </WorkModeLayout>
  );
}
