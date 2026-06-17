/**
 * FreeRun (Ask) — Wine Knowledge Assistant
 * DailyMe-inspired: light background, goal cards, input field, AI responses
 */

import { useState } from "react";
import WorkModeLayout from "@/components/WorkModeLayout";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

const GOAL_CARDS = [
  { id: 1, label: "Fermentation Science", emoji: "🧪" },
  { id: 2, label: "Tasting & Flavours", emoji: "👅" },
  { id: 3, label: "Vineyard & Harvest", emoji: "🍇" },
  { id: 4, label: "Cellar Techniques", emoji: "🍷" },
  { id: 5, label: "Equipment & Tools", emoji: "🔧" },
  { id: 6, label: "Winemaking History", emoji: "📚" },
];

export default function FreeRun() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleGoalClick = (label: string) => {
    setInput(label);
  };

  const handleSend = async () => {
    if (!input.trim()) return;

    // Add user message
    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: input,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `Great question about "${input}"! This is a placeholder response. In the full implementation, this would be powered by the Ownology AI tutor with access to the SOP library and CSU Academic Backbone.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMessage]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <WorkModeLayout title="Ask Ownology" activeTab="ask">
      <div style={{ padding: "1.5rem 1rem" }}>
        {/* If no messages, show goal cards */}
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
              What would you like to know?
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
              Ask anything about wine, fermentation, vineyard management, or cellar techniques.
            </p>

            {/* Goal cards grid */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "1rem",
                marginBottom: "2rem",
              }}
            >
              {GOAL_CARDS.map((card) => (
                <button
                  key={card.id}
                  onClick={() => handleGoalClick(card.label)}
                  style={{
                    padding: "1.25rem 1rem",
                    background: "#FFFFFF",
                    border: "1px solid #E8EAED",
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
                    }}
                  >
                    {card.label}
                  </div>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages view */
          <div style={{ marginBottom: "1rem" }}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: "1.25rem",
                  display: "flex",
                  justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
                }}
              >
                <div
                  style={{
                    maxWidth: "85%",
                    padding: "0.875rem 1rem",
                    borderRadius: "12px",
                    background: msg.role === "user" ? "#2563EB" : "#FFFFFF",
                    color: msg.role === "user" ? "#FFFFFF" : "#1A1A1A",
                    border: msg.role === "assistant" ? "1px solid #E8EAED" : "none",
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.95rem",
                    lineHeight: 1.5,
                  }}
                >
                  {msg.content}
                </div>
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
      `}</style>
    </WorkModeLayout>
  );
}
