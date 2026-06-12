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
type StateFilter = "All" | "Federal" | "SA" | "VIC" | "NSW" | "WA" | "QLD" | "TAS" | "NT" | "NZ";
type Citation = {
  title: string;
  section: string | null;
  jurisdiction: string;
  url: string | null;
};

type Message = {
  role: "user" | "assistant";
  content: string;
  citations?: Citation[];
  disclaimer?: string;
};

const STATE_FILTERS: StateFilter[] = ["All", "Federal", "SA", "VIC", "NSW", "WA", "QLD", "TAS", "NT", "NZ"];

const STATE_LABELS: Record<StateFilter, string> = {
  All: "All Jurisdictions",
  Federal: "Federal",
  SA: "South Australia",
  VIC: "Victoria",
  NSW: "New South Wales",
  WA: "Western Australia",
  QLD: "Queensland",
  TAS: "Tasmania",
  NT: "Northern Territory",
  NZ: "New Zealand",
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
  { q: "What liquor producer authority do I need to sell wine in the Northern Territory?", state: "NT" },
  { q: "What is a Wine Standards Management Plan (WSMP) and is it mandatory in NZ?", state: "NZ" },
  { q: "What licences do I need to sell wine from a cellar door in New Zealand?", state: "NZ" },
  { q: "What are the NZ wine labelling requirements for export to Australia?", state: "NZ" },
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

      setMessages(prev => [...prev, {
        role: "assistant",
        content: result.answer,
        citations: result.citations ?? [],
        disclaimer: result.disclaimer,
      }]);
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

  const downloadPdf = () => {
    const date = new Date().toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" });
    const escHtml = (s: string) =>
      s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

    const threadHtml = messages
      .map((msg, i) => {
        if (msg.role === "user") {
          return `<div class="msg user"><div class="label">Question ${Math.ceil((i + 1) / 2)}</div><p>${escHtml(msg.content)}</p></div>`;
        }
        const citationsHtml =
          msg.citations && msg.citations.length > 0
            ? `<div class="citations">
                <div class="citations-heading">Source References</div>
                <ol>${msg.citations
                  .map(
                    (c) =>
                      `<li><span class="jur">${escHtml(c.jurisdiction)}</span> <strong>${escHtml(c.title)}</strong>${c.section ? ` &mdash; ${escHtml(c.section)}` : ""}${c.url ? ` <a href="${escHtml(c.url)}">${escHtml(c.url)}</a>` : ""}</li>`
                  )
                  .join("")}</ol>
              </div>`
            : "";
        const disclaimerHtml = msg.disclaimer
          ? `<p class="disclaimer">${escHtml(msg.disclaimer)}</p>`
          : "";
        return `<div class="msg assistant"><div class="label">Answer</div><p>${escHtml(msg.content)}</p>${citationsHtml}${disclaimerHtml}</div>`;
      })
      .join("");

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>Ownology Compliance Q&amp;A — ${date}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Fraunces:wght@700&family=Lato:wght@300;400;600&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Lato', sans-serif; font-weight: 300; font-size: 11pt; color: #1a1410; background: #fff; padding: 48px 56px; max-width: 820px; margin: 0 auto; }
  h1 { font-family: 'Fraunces', serif; font-weight: 700; font-size: 22pt; color: #1a1410; margin-bottom: 4px; }
  .meta { font-size: 9pt; color: #888; margin-bottom: 32px; border-bottom: 1px solid #e8e0d4; padding-bottom: 16px; }
  .msg { margin-bottom: 24px; page-break-inside: avoid; }
  .label { font-size: 8pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #b8860b; margin-bottom: 6px; }
  .msg.user p { background: #f7f4ef; border: 1px solid #e8e0d4; border-radius: 4px; padding: 12px 16px; line-height: 1.6; }
  .msg.assistant p { line-height: 1.75; white-space: pre-wrap; }
  .citations { margin-top: 16px; padding-top: 14px; border-top: 1px solid #e8e0d4; }
  .citations-heading { font-size: 8pt; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: #b8860b; margin-bottom: 8px; }
  .citations ol { padding-left: 18px; }
  .citations li { font-size: 9.5pt; line-height: 1.55; margin-bottom: 5px; color: #444; }
  .jur { display: inline-block; font-size: 7.5pt; font-family: monospace; background: #fdf5e6; border: 1px solid #e8c97a; color: #b8860b; padding: 1px 5px; border-radius: 3px; margin-right: 5px; vertical-align: middle; }
  .citations a { color: #555; font-size: 8.5pt; word-break: break-all; }
  .disclaimer { margin-top: 10px; font-size: 8.5pt; color: #999; font-style: italic; line-height: 1.5; }
  .footer { margin-top: 40px; padding-top: 16px; border-top: 1px solid #e8e0d4; font-size: 8pt; color: #aaa; text-align: center; }
  @media print { body { padding: 0; } }
</style>
</head>
<body>
  <h1>Ownology Compliance Q&amp;A</h1>
  <div class="meta">Generated ${date} &bull; Knowledge base: Federal &bull; SA &bull; VIC &bull; NSW &bull; WA &bull; QLD &bull; TAS &bull; NT &bull; NZ (last updated June 2026)</div>
  ${threadHtml}
  <div class="footer">Ownology &mdash; AI Knowledge Assistant for Winemakers &bull; ownology.ai &bull; Always verify with the relevant agency or a qualified compliance professional.</div>
</body>
</html>`;

    const win = window.open("", "_blank");
    if (!win) {
      toast.error("Pop-up blocked — please allow pop-ups for this site and try again.");
      return;
    }
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 600);
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

      <div className="container pt-24 pb-8" style={{ maxWidth: "860px", margin: "0 auto", animation: "owFadeIn 0.3s ease forwards" }}>
        {/* Header */}
        <div className="mb-8">
          <p
            className="section-label mb-3"
            style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
          >
            Stay Compliant
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
            Compliance <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Assistant</em>
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
            Ask any question about Australian and New Zealand winery regulations and get a cited, jurisdiction-specific answer instantly. Federal (Wine Australia, FSANZ, WET, WHS, biosecurity), all Australian states and territories, and New Zealand covered. You stay compliant — we keep track of the rules.
          </p>
          {/* Crosslink to Regulations */}
          <div className="mt-4 flex items-center gap-3">
            <Link
              href="/regulations"
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
                fontFamily: "'Lato',sans-serif",
                fontWeight: 600,
                fontSize: "0.8125rem",
                color: "var(--ow-text-lo)",
                letterSpacing: "0.01em",
                textDecoration: "none",
                borderBottom: "1px solid var(--ow-border)",
                paddingBottom: "1px",
              }}
            >
              Browse the full regulations library
              <svg width="13" height="13" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M3 7h8M8 4l3 3-3 3" stroke="var(--ow-text-lo)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </div>
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
            Knowledge base: Federal · SA · VIC · NSW · WA · QLD · TAS · NT · NZ — last updated June 2026
          </div>
        </div>

        {/* State selector — sticky below nav */}
        <div className="mb-6" style={{ position: "sticky", top: "61px", zIndex: 30, background: "var(--ow-bg-base)", paddingTop: "0.75rem", paddingBottom: "0.75rem", marginLeft: "-1rem", marginRight: "-1rem", paddingLeft: "1rem", paddingRight: "1rem", borderBottom: "1px solid var(--ow-border)" }}>
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

                  {/* Citations reference list */}
                  {msg.role === "assistant" && msg.citations && msg.citations.length > 0 && (
                    <div
                      className="mt-4 pt-4"
                      style={{ borderTop: "1px solid var(--ow-border)" }}
                    >
                      <p
                        className="mb-2 text-xs tracking-wider uppercase"
                        style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em", fontWeight: 600 }}
                      >
                        Source References
                      </p>
                      <ol className="space-y-1.5" style={{ paddingLeft: "1.25rem", margin: 0 }}>
                        {msg.citations.map((c, ci) => (
                          <li key={ci} style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", lineHeight: 1.5 }}>
                            <span
                              className="inline-block mr-1.5 px-1 py-0.5 rounded-sm text-xs"
                              style={{
                                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                                border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
                                color: "var(--ow-amber)",
                                fontFamily: "'Fira Code',monospace",
                                fontSize: "0.62rem",
                                letterSpacing: "0.04em",
                                verticalAlign: "middle",
                              }}
                            >
                              {c.jurisdiction}
                            </span>
                            {c.url ? (
                              <a
                                href={c.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{ color: "var(--ow-text-hi)", textDecoration: "underline", textUnderlineOffset: "3px" }}
                              >
                                <strong style={{ fontWeight: 500 }}>{c.title}</strong>
                                {c.section ? ` — ${c.section}` : ""}
                              </a>
                            ) : (
                              <span>
                                <strong style={{ fontWeight: 500 }}>{c.title}</strong>
                                {c.section ? ` — ${c.section}` : ""}
                              </span>
                            )}
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Disclaimer */}
                  {msg.role === "assistant" && msg.disclaimer && (
                    <p
                      className="mt-3 text-xs"
                      style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontStyle: "italic", lineHeight: 1.5 }}
                    >
                      {msg.disclaimer}
                    </p>
                  )}

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
            Answers are AI-generated from our curated knowledge base (Federal, SA, VIC, NSW, WA, QLD, TAS, NT, NZ). Always verify with the relevant agency or a qualified compliance professional.
          </p>
        </form>

        {/* Clear conversation + Download PDF */}
        {messages.length > 0 && (
          <div className="mt-4 flex items-center justify-center gap-6">
            <button
              onClick={() => { setMessages([]); setError(null); }}
              className="text-xs transition-colors"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-lo)")}
            >
              Clear conversation
            </button>
            <button
              onClick={downloadPdf}
              className="text-xs transition-colors flex items-center gap-1.5"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", background: "none", border: "none", cursor: "pointer" }}
              onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
              onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-lo)")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M6 1v7M3.5 6l2.5 2.5L8.5 6" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M1.5 10h9" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
              </svg>
              Download PDF
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
