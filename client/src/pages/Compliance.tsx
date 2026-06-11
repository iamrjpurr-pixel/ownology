/**
 * OWNOLOGY — Compliance AI Search Agent
 * Knowledge base lives server-side; LLM calls use the server BUILT_IN_FORGE_API_KEY.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { toast } from "sonner";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";


// ─── Types & constants ───────────────────────────────────────────────────────
type StateFilter = "All" | "Federal" | "SA" | "VIC" | "NSW" | "WA" | "QLD" | "TAS";
type Message = { role: "user" | "assistant"; content: string };

const STATE_FILTERS: StateFilter[] = ["All", "Federal", "SA", "VIC", "NSW", "WA", "QLD", "TAS"];

const STATE_LABELS: Record<StateFilter, string> = {
  All: "All Jurisdictions",
  Federal: "Federal",
  SA: "South Australia",
  VIC: "Victoria",
  NSW: "New South Wales",
  WA: "Western Australia",
  QLD: "Queensland",
  TAS: "Tasmania",
};

const SAMPLE_QUESTIONS: { q: string; state: StateFilter }[] = [
  { q: "What licences do I need to open a cellar door in South Australia?", state: "SA" },
  { q: "What is the Wine Producer Rebate cap for 2026?", state: "Federal" },
  { q: "What are the WET registration thresholds?", state: "Federal" },
  { q: "What are the SO₂ limits under the Food Standards Code?", state: "Federal" },
  { q: "What is the Label Integrity Program and what records must I keep?", state: "Federal" },
  { q: "Do I need an EPA licence for my winery wastewater in SA?", state: "SA" },
  { q: "What are the CO₂ WHS obligations for fermentation tanks?", state: "Federal" },
  { q: "What liquor licence do I need to open a cellar door in Victoria?", state: "VIC" },
  { q: "What is the Producer/Wholesaler licence in NSW and how do I apply?", state: "NSW" },
  { q: "What is a WA Producer's Licence and what trading hours apply?", state: "WA" },
  { q: "What wine producer licence do I need to operate a winery in Queensland?", state: "QLD" },
  { q: "What liquor licence do I need to operate a cellar door in Tasmania?", state: "TAS" },
];

// ─── CopyButton — clipboard icon with animated checkmark feedback ─────────────
function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast.success("Copied to clipboard", { duration: 2000 });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Copy failed — please select and copy manually");
    }
  }, [text]);

  return (
    <button
      onClick={handleCopy}
      title={copied ? "Copied!" : "Copy answer"}
      className="mt-3 flex items-center gap-1.5 transition-all"
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        padding: "4px 8px",
        borderRadius: "4px",
        display: "flex",
        alignItems: "center",
        gap: "6px",
        color: copied ? "var(--ow-amber)" : "var(--ow-text-lo)",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        opacity: copied ? 1 : 0.7,
        transition: "color 0.2s, opacity 0.2s",
      }}
      onMouseEnter={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.opacity = "1"; }}
      onMouseLeave={e => { if (!copied) (e.currentTarget as HTMLButtonElement).style.opacity = "0.7"; }}
    >
      {copied ? (
        // Checkmark icon
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <circle cx="6.5" cy="6.5" r="5.5" stroke="var(--ow-amber)" strokeWidth="1.2" />
          <path d="M4 6.5l2 2 3-3" stroke="var(--ow-amber)" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        // Clipboard icon
        <svg width="13" height="13" viewBox="0 0 13 13" fill="none" aria-hidden="true">
          <rect x="4" y="1.5" width="7" height="9" rx="1" stroke="currentColor" strokeWidth="1.2" />
          <path d="M4 3H3a1 1 0 00-1 1v7a1 1 0 001 1h6a1 1 0 001-1v-1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
          <path d="M6 1.5h2a1 1 0 010 2H6a1 1 0 010-2z" stroke="currentColor" strokeWidth="1.2" />
        </svg>
      )}
      {copied ? "Copied!" : "Copy"}
    </button>
  );
}

export default function Compliance() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState<"classifying" | "answering" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<StateFilter>("All");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const filteredQuestions = stateFilter === "All"
    ? SAMPLE_QUESTIONS
    : SAMPLE_QUESTIONS.filter(item => item.state === stateFilter || item.state === "Federal");

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const askMutation = trpc.compliance.ask.useMutation();

  const ask = async (question: string) => {
    if (!question.trim() || loading) return;
    setError(null);

    const userMsg: Message = { role: "user", content: question.trim() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setLoading(true);
    setLoadingStage("classifying");

    try {
      const result = await askMutation.mutateAsync({
        question: question.trim(),
        stateFilter: stateFilter,
        history: messages.slice(-10).map(m => ({ role: m.role, content: m.content })),
      });

      setMessages(prev => [...prev, { role: "assistant", content: result.answer }]);
    } catch (err) {
      setError("Unable to get a response. Please try again.");
      console.error("Compliance agent error:", err);
    } finally {
      setLoading(false);
      setLoadingStage(null);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    ask(input);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      ask(input);
    }
  };

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-border)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <OwnologyLogo size={30} />
          </Link>
          <div className="flex items-center gap-4">
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.12em" }}
            >
              Compliance Assistant
            </span>
            <ThemeToggle compact />
          </div>
        </div>
      </nav>

      <div className="container pt-24 pb-8" style={{ maxWidth: "860px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-8">
          <p
            className="section-label mb-3"
            style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
          >
            Australian Winery Regulatory Intelligence
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem,4vw,2.75rem)",
              lineHeight: 1.1,
              color: "var(--ow-text-hi)",
            }}
          >
            Compliance <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Search</em>
          </h1>
          <p
            className="mt-3"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              lineHeight: 1.7,
              color: "var(--ow-text-lo)",
              maxWidth: "560px",
            }}
          >
            Ask any question about Australian winery regulations — federal (Wine Australia, FSANZ, WET, WHS, biosecurity) or state-specific rules for South Australia, Victoria, New South Wales, and Western Australia. Use the jurisdiction filter below to focus on your state.
          </p>
          <div
            className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-sm text-xs"
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              color: "var(--ow-text-lo)",
              fontFamily: "'Lato',sans-serif",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
              <circle cx="6" cy="6" r="5" stroke="var(--ow-amber)" strokeWidth="1.2" />
              <path d="M6 4v3M6 8.5v.5" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            Knowledge base: Federal · SA · VIC · NSW · WA · QLD · TAS — last updated May 2026
          </div>
        </div>

        {/* State selector */}
        <div className="mb-6">
          <p
            className="mb-2 text-xs tracking-wider uppercase"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}
          >
            Jurisdiction
          </p>
          <div className="flex flex-wrap gap-2">
            {STATE_FILTERS.map(s => (
              <button
                key={s}
                onClick={() => setStateFilter(s)}
                className="px-3 py-1.5 rounded-sm text-xs transition-all"
                style={{
                  fontFamily: "'Lato',sans-serif",
                  letterSpacing: "0.06em",
                  fontWeight: stateFilter === s ? 600 : 300,
                  background: stateFilter === s
                    ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                    : "var(--ow-bg-card)",
                  border: stateFilter === s
                    ? "1px solid var(--ow-amber)"
                    : "1px solid var(--ow-border)",
                  color: stateFilter === s ? "var(--ow-amber)" : "var(--ow-text-lo)",
                  cursor: "pointer",
                }}
              >
                {STATE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Sample questions */}
        {messages.length === 0 && (
          <div className="mb-8">
            <p
              className="mb-3 text-xs tracking-wider uppercase"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}
            >
              Example questions
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {filteredQuestions.map(item => (
                <button
                  key={item.q}
                  onClick={() => ask(item.q)}
                  className="text-left px-4 py-3 rounded-sm transition-all text-sm"
                  style={{
                    background: "var(--ow-bg-card)",
                    border: "1px solid var(--ow-border)",
                    color: "var(--ow-text-mid)",
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 300,
                    lineHeight: 1.5,
                    cursor: "pointer",
                    minHeight: "52px",
                    touchAction: "manipulation",
                  }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-amber)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-text-hi)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLButtonElement).style.borderColor = "var(--ow-border)";
                    (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-text-mid)";
                  }}
                >
                  <span
                    className="inline-block mr-2 px-1.5 py-0.5 rounded-sm text-xs"
                    style={{
                      background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                      border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
                      color: "var(--ow-amber)",
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.65rem",
                      letterSpacing: "0.04em",
                      verticalAlign: "middle",
                    }}
                  >
                    {item.state}
                  </span>
                  {item.q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Conversation */}
        {messages.length > 0 && (
          <div className="mb-6 space-y-5">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === "user" ? "flex justify-end" : "flex justify-start"}>
                {msg.role === "assistant" && (
                  <div
                    className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mr-3 mt-1"
                    style={{ background: "var(--ow-amber-dim, oklch(0.72 0.12 75 / 15%))", border: "1px solid var(--ow-amber)" }}
                  >
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <circle cx="5" cy="5" r="3.5" stroke="var(--ow-amber)" strokeWidth="1.2" />
                      <path d="M5 3v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
                    </svg>
                  </div>
                )}
                <div
                  className="rounded-sm px-4 py-3 text-sm"
                  style={{
                    maxWidth: "80%",
                    background: msg.role === "user" ? "var(--ow-bg-card)" : "transparent",
                    border: msg.role === "user" ? "1px solid var(--ow-border)" : "none",
                    color: "var(--ow-text-hi)",
                    fontFamily: "'Lato',sans-serif",
                    fontWeight: 300,
                    lineHeight: 1.7,
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {msg.content}
                  {msg.role === "assistant" && (
                    <CopyButton text={msg.content} />
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div
                  className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mr-3 mt-1"
                  style={{ background: "oklch(0.72 0.12 75 / 15%)", border: "1px solid var(--ow-amber)" }}
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="var(--ow-amber)" strokeWidth="1.2" />
                    <path d="M5 3v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round" />
                  </svg>
                </div>
                <div
                  className="px-4 py-3 text-sm rounded-sm"
                  style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontStyle: "italic" }}
                >
                  {loadingStage === "classifying" ? "Analysing question…" : "Searching regulatory knowledge base…"}
                </div>
              </div>
            )}

            {error && (
              <div
                className="px-4 py-3 rounded-sm text-sm"
                style={{
                  background: "oklch(0.3 0.08 25 / 20%)",
                  border: "1px solid oklch(0.5 0.12 25 / 40%)",
                  color: "oklch(0.75 0.08 25)",
                  fontFamily: "'Lato',sans-serif",
                }}
              >
                {error}
              </div>
            )}

            <div ref={bottomRef} />
          </div>
        )}

        {/* Input */}
        <form
          onSubmit={handleSubmit}
          className="sticky-bottom-safe"
        >
          <div
            className="flex gap-3 items-end rounded-sm p-3"
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              boxShadow: "0 8px 32px var(--ow-shadow)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask a compliance question…"
              rows={2}
              className="flex-1 resize-none bg-transparent outline-none text-sm"
              style={{
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontWeight: 300,
                lineHeight: 1.6,
                border: "none",
                padding: "4px 0",
                fontSize: "16px", /* Prevent iOS auto-zoom on focus */
              }}
              disabled={loading}
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="touch-target flex-shrink-0 rounded-sm text-xs font-medium transition-all"
              style={{
                background: loading || !input.trim() ? "var(--ow-border)" : "var(--ow-amber)",
                color: loading || !input.trim() ? "var(--ow-text-lo)" : "oklch(0.12 0.01 60)",
                fontFamily: "'Lato',sans-serif",
                cursor: loading || !input.trim() ? "not-allowed" : "pointer",
                letterSpacing: "0.05em",
                padding: "0 1rem",
                touchAction: "manipulation",
              }}
            >
              {loading ? "…" : "Ask"}
            </button>
          </div>
          <p
            className="mt-2 text-center text-xs"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
          >
            Answers are AI-generated from our curated knowledge base (Federal, SA, VIC, NSW, WA, QLD, TAS). Always verify with the relevant agency or a qualified compliance professional.
          </p>
        </form>

        {/* Clear conversation */}
        {messages.length > 0 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => { setMessages([]); setError(null); }}
              className="text-xs transition-colors"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-lo)")}
            >
              Clear conversation
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
