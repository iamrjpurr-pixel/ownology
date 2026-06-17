/**
 * FreeRun — Wine Knowledge Assistant (Ask)
 * 
 * Simple, readable UI for asking wine questions:
 * - Question input field (44px height)
 * - Ask button (prominent, amber)
 * - Question history list (clean cards)
 * - Mock data for immediate interactivity
 */

import { useState } from "react";
import { Send } from "lucide-react";

interface QAPair {
  id: string;
  question: string;
  answer: string;
  timestamp: string;
}

export default function FreeRun() {
  const [question, setQuestion] = useState("");
  const [pairs, setPairs] = useState<QAPair[]>([]);
  const [isAsking, setIsAsking] = useState(false);

  const handleAsk = async () => {
    if (!question.trim() || isAsking) return;

    setIsAsking(true);
    const q = question.trim();
    setQuestion("");

    // Simulate API call delay
    await new Promise((resolve) => setTimeout(resolve, 800));

    // Mock responses based on question
    let answer = "";
    if (q.toLowerCase().includes("tannin")) {
      answer =
        "Tannins are polyphenolic compounds found primarily in grape skins, seeds, and stems. They're responsible for the drying sensation in your mouth when drinking red wine. During fermentation, tannins extract from the solids into the juice. They play a crucial role in wine aging and structure.";
    } else if (q.toLowerCase().includes("brix")) {
      answer =
        "Brix measures the sugar content in grape juice on a scale of 0-40. One degree Brix equals 1 gram of sugar per 100 grams of liquid. Typical harvest Brix ranges from 20-25 for table wines, with higher values indicating riper grapes. Brix is essential for predicting final alcohol content.";
    } else if (q.toLowerCase().includes("ferment")) {
      answer =
        "Fermentation is the metabolic process where yeast converts sugars into alcohol and CO₂. Temperature control is critical — most wine yeasts work optimally between 50-86°F (10-30°C). Red wines ferment warmer than whites. Monitoring fermentation progress via Brix and temperature helps ensure a healthy, complete fermentation.";
    } else {
      answer =
        "That's a great question about winemaking. The answer depends on many factors including your specific vintage, grape variety, climate, and cellar conditions. I'd recommend consulting your winemaking notes and considering how similar situations were handled in previous vintages.";
    }

    const pair: QAPair = {
      id: crypto.randomUUID(),
      question: q,
      answer,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    setPairs([pair, ...pairs]);
    setIsAsking(false);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#0a0a0a", color: "#f5f5f5", display: "flex", flexDirection: "column" }}>
      {/* Header */}
      <div style={{ padding: "24px 16px", borderBottom: "1px solid #333333" }}>
        <h1 style={{ fontSize: "24px", fontWeight: 600, marginBottom: "8px" }}>Ask Ownology</h1>
        <p style={{ fontSize: "14px", color: "#a0a0a0", lineHeight: 1.5 }}>
          Ask anything about wine — the flavours, the science, the stories behind the glass.
        </p>
      </div>

      {/* Content Area */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px" }}>
        {pairs.length === 0 ? (
          // Empty State with Curiosity Prompts
          <div style={{ paddingTop: "32px" }}>
            <div style={{ textAlign: "center", marginBottom: "32px" }}>
              <div style={{ fontSize: "48px", marginBottom: "16px", opacity: 0.5 }}>💬</div>
              <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "8px" }}>
                Start exploring
              </h2>
              <p style={{ fontSize: "14px", color: "#a0a0a0", lineHeight: 1.6 }}>
                Ask anything about wine — fermentation, flavours, technique, science, or stories.
              </p>
            </div>

            {/* Curiosity Prompts */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              {[
                "What are tannins?",
                "How does fermentation work?",
                "What is Brix?",
                "How to prevent oxidation?",
                "What is malolactic fermentation?",
                "How to age wine?",
              ].map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => {
                    setQuestion(prompt);
                    setTimeout(() => {
                      // Trigger ask after state updates
                      const input = document.querySelector("input") as HTMLInputElement;
                      if (input) input.focus();
                    }, 0);
                  }}
                  style={{
                    backgroundColor: "#1a1a1a",
                    border: "1px solid #333333",
                    borderRadius: "4px",
                    padding: "12px",
                    color: "#a0a0a0",
                    fontSize: "13px",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    textAlign: "left",
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = "#d4a574";
                    e.currentTarget.style.color = "#d4a574";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "#333333";
                    e.currentTarget.style.color = "#a0a0a0";
                  }}
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        ) : (
          // Question History
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {pairs.map((pair) => (
              <div
                key={pair.id}
                style={{
                  backgroundColor: "#1a1a1a",
                  border: "1px solid #333333",
                  borderRadius: "4px",
                  padding: "16px",
                }}
              >
                {/* Question */}
                <div style={{ fontSize: "14px", fontWeight: 600, color: "#d4a574", marginBottom: "12px" }}>
                  {pair.question}
                </div>

                {/* Answer */}
                <div style={{ fontSize: "13px", color: "#a0a0a0", lineHeight: 1.6, marginBottom: "8px" }}>
                  {pair.answer}
                </div>

                {/* Timestamp */}
                <div style={{ fontSize: "11px", color: "#666666" }}>
                  {pair.timestamp}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Input Area */}
      <div style={{ padding: "16px", borderTop: "1px solid #333333", backgroundColor: "#1a1a1a", position: "sticky", bottom: "64px" }}>
        <div style={{ display: "flex", gap: "8px" }}>
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isAsking) handleAsk();
            }}
            placeholder="Ask about wine..."
            disabled={isAsking}
            style={{
              flex: 1,
              height: "44px",
              backgroundColor: "#0a0a0a",
              border: "1px solid #333333",
              borderRadius: "4px",
              color: "#f5f5f5",
              padding: "0 12px",
              fontSize: "14px",
              boxSizing: "border-box",
              opacity: isAsking ? 0.5 : 1,
            }}
          />
          <button
            onClick={handleAsk}
            disabled={isAsking || !question.trim()}
            style={{
              width: "44px",
              height: "44px",
              backgroundColor: "#d4a574",
              color: "#0a0a0a",
              border: "none",
              borderRadius: "4px",
              cursor: isAsking || !question.trim() ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              opacity: isAsking || !question.trim() ? 0.5 : 1,
              transition: "opacity 0.2s",
            }}
            onMouseEnter={(e) => {
              if (!isAsking && question.trim()) {
                e.currentTarget.style.opacity = "0.9";
              }
            }}
            onMouseLeave={(e) => {
              if (!isAsking && question.trim()) {
                e.currentTarget.style.opacity = "1";
              }
            }}
          >
            <Send size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}
