/**
 * Demo — /demo public conversion tool.
 *
 * Product intent (Feb 2026, Rich): a stranger lands here, pastes any
 * old vintage notes, and within 30 seconds sees the AI quoting THEIR
 * OWN winemaking decisions back to them. Highest-leverage single
 * conversion flow on the site — outperforms any pricing page.
 *
 * Three stages on one page (no route changes, no re-renders):
 *   1. Paste — big textarea, one clear CTA
 *   2. Question — AI has read the notes and asks ONE specific question
 *   3. Reveal — AI weaves their answer + verbatim citations from notes
 *
 * Public. No login required. Email capture chip is optional and sits
 * at the tail of Stage 3.
 *
 * Backend: server/routers/demoRouter.ts — analyze (Stage 1→2) and
 * answer (Stage 2→3), Claude Sonnet 4.6 via Emergent Universal LLM.
 */

import { useState } from "react";
import { trpc } from "@/lib/trpc";

const BASE = "var(--ow-bg-base)";
const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BORDER = "var(--ow-border)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const SANS = "'Lato', system-ui, sans-serif";
const SERIF = "'Fraunces', 'Cormorant Garamond', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

const SAMPLE_NOTES = `18 Mar 2023 — T-04 Shiraz. Brix 24.2, pH 3.68, TA 6.1 g/L. Cool day. Cap firm. Racked off gross lees.
22 Mar — T-04 Shiraz. Added 30 ppm SO2. TA now 5.9. Colour deepening.
28 Mar — T-04 stuck at 4.2 Brix. Warmed to 26°C, added DAP 0.4 kg. Nervous.
03 Apr — T-04 finally through. 0.8 Brix. Pressed off, into T-12 for MLF.
15 Apr — T-12 malolactic finished. Chromatography clean. SO2 30 ppm total to lock in.
02 May — T-12 first taste after 2 weeks post-MLF. Riper than expected. Sound.`;

type Stage = "paste" | "question" | "reveal";

export default function Demo() {
  const [stage, setStage] = useState<Stage>("paste");
  const [notes, setNotes] = useState<string>("");
  const [sourceHint, setSourceHint] = useState<string>("");
  const [sessionId, setSessionId] = useState<string>("");
  const [extract, setExtract] = useState<string>("");
  const [question, setQuestion] = useState<string>("");
  const [focusTank, setFocusTank] = useState<string>("");
  const [userAnswer, setUserAnswer] = useState<string>("");
  const [aiResponse, setAiResponse] = useState<string>("");
  const [email, setEmail] = useState<string>("");
  const [emailCaptured, setEmailCaptured] = useState<boolean>(false);

  const analyze = trpc.demo.analyze.useMutation();
  const answer = trpc.demo.answer.useMutation();
  const captureEmail = trpc.demo.captureEmail.useMutation();
  const recentCount = trpc.demo.recentCount.useQuery();

  async function onAnalyze() {
    const result = await analyze.mutateAsync({ notes, sourceHint: sourceHint || undefined });
    setSessionId(result.sessionId);
    setExtract(result.extract);
    setQuestion(result.question);
    setFocusTank(result.focusTank);
    setStage("question");
  }

  async function onAnswer() {
    const result = await answer.mutateAsync({ sessionId, userAnswer });
    setAiResponse(result.aiResponse);
    setStage("reveal");
  }

  async function onCaptureEmail() {
    await captureEmail.mutateAsync({ sessionId, email });
    setEmailCaptured(true);
  }

  return (
    <div
      data-testid="demo-page"
      style={{ background: BASE, minHeight: "100vh", padding: "56px 20px 80px", color: MID, fontFamily: SANS }}
    >
      <div style={{ maxWidth: 780, margin: "0 auto" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <p data-testid="demo-kicker" style={{ fontSize: "0.72rem", letterSpacing: "0.20em", textTransform: "uppercase", color: AMBER, margin: 0, fontFamily: MONO }}>
            30-second demo · no signup
          </p>
          <h1
            data-testid="demo-headline"
            style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "clamp(2rem, 4vw, 2.75rem)", color: HI, margin: "12px 0 12px", letterSpacing: "-0.02em", lineHeight: 1.15 }}
          >
            Paste any old winemaking notes.
            <br />
            <span style={{ color: AMBER, fontStyle: "italic" }}>See what Ownology finds.</span>
          </h1>
          <p style={{ fontSize: "1.05rem", color: MID, maxWidth: 560, margin: "0 auto", lineHeight: 1.55 }}>
            No login. No email. Paste a handful of dated tank readings or vintage log entries — Ownology reads them,
            picks the one moment worth talking about, and asks you one specific question about it.
          </p>
          {recentCount.data && recentCount.data.count > 0 && (
            <p style={{ fontSize: "0.75rem", color: LO, marginTop: 12, fontFamily: MONO }}>
              {recentCount.data.count} winemaker{recentCount.data.count === 1 ? " has" : "s have"} tried this in the last 24 h
            </p>
          )}
        </div>

        <div style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }}>
          {(["paste", "question", "reveal"] as const).map((s, i) => {
            const done = (s === "paste" && stage !== "paste") || (s === "question" && stage === "reveal");
            const current = s === stage;
            return (
              <span
                key={s}
                data-testid={`demo-step-${i + 1}`}
                style={{ width: 36, height: 3, borderRadius: 2, background: current || done ? AMBER : BORDER, transition: "background 300ms" }}
              />
            );
          })}
        </div>

        {stage === "paste" && (
          <div data-testid="demo-stage-paste" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24 }}>
            <label
              htmlFor="demo-notes"
              style={{ display: "block", fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: LO, marginBottom: 10, fontFamily: MONO }}
            >
              Paste your notes here
            </label>
            <textarea
              id="demo-notes"
              data-testid="demo-notes-input"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={"Anything you've got — a handful of dated tank readings, decisions, additions, temps. The more you paste, the sharper the question.\n\nOr click 'Use a sample' below to see it work with example notes."}
              rows={12}
              style={{
                width: "100%", background: BASE, color: HI, border: `1px solid ${BORDER}`, borderRadius: 6, padding: 14,
                fontFamily: MONO, fontSize: "0.85rem", lineHeight: 1.55, resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 12, marginTop: 14, flexWrap: "wrap", alignItems: "center" }}>
              <input
                data-testid="demo-hint-input"
                type="text"
                value={sourceHint}
                onChange={(e) => setSourceHint(e.target.value)}
                placeholder="Optional: region + vintage (e.g. 'Hunter Valley 2023')"
                style={{
                  flex: "1 1 260px", minWidth: 200, background: BASE, color: MID, border: `1px solid ${BORDER}`,
                  borderRadius: 4, padding: "8px 12px", fontSize: "0.82rem", fontFamily: SANS,
                }}
              />
              <button
                data-testid="demo-sample-btn"
                onClick={() => setNotes(SAMPLE_NOTES)}
                style={{
                  background: "transparent", color: MID, padding: "8px 14px", border: `1px solid ${BORDER}`,
                  borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                Use a sample
              </button>
              <button
                data-testid="demo-analyze-btn"
                onClick={onAnalyze}
                disabled={notes.trim().length < 20 || analyze.isPending}
                style={{
                  background: notes.trim().length < 20 ? RAISED : AMBER,
                  color: notes.trim().length < 20 ? LO : "#2A1E0A",
                  padding: "10px 20px", border: "none", borderRadius: 4, fontFamily: SANS,
                  fontSize: "0.9rem", fontWeight: 600,
                  cursor: notes.trim().length < 20 ? "not-allowed" : "pointer", letterSpacing: "0.02em",
                }}
              >
                {analyze.isPending ? "Reading your notes…" : "Show me what Ownology sees →"}
              </button>
            </div>
            {analyze.error && (
              <p data-testid="demo-analyze-error" style={{ marginTop: 10, color: "oklch(0.75 0.18 25)", fontFamily: MONO, fontSize: "0.75rem" }}>
                {analyze.error.message}
              </p>
            )}
            <p style={{ marginTop: 16, fontSize: "0.72rem", color: LO, textAlign: "center" }}>
              Your notes stay private. Nothing published. Nothing added to a mailing list.
            </p>
          </div>
        )}

        {stage === "question" && (
          <div data-testid="demo-stage-question" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24 }}>
            <p style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: 8, fontFamily: MONO }}>
              Ownology read your notes
            </p>
            <p data-testid="demo-extract" style={{ fontSize: "0.95rem", color: MID, lineHeight: 1.55, marginBottom: 20 }}>
              {extract}
            </p>
            <div style={{ padding: 16, background: BASE, border: `1px solid ${AMBER}`, borderRadius: 6, marginBottom: 16 }}>
              <p style={{ fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: 8, fontFamily: MONO }}>
                Question about {focusTank || "your notes"}
              </p>
              <p data-testid="demo-question" style={{ fontFamily: SERIF, fontSize: "1.15rem", color: HI, lineHeight: 1.4, fontWeight: 500 }}>
                {question}
              </p>
            </div>
            <textarea
              data-testid="demo-answer-input"
              value={userAnswer}
              onChange={(e) => setUserAnswer(e.target.value)}
              placeholder="Your answer, in your words…"
              rows={4}
              style={{
                width: "100%", background: BASE, color: HI, border: `1px solid ${BORDER}`, borderRadius: 6,
                padding: 12, fontFamily: SANS, fontSize: "0.95rem", lineHeight: 1.5, resize: "vertical",
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 14, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button
                data-testid="demo-back-btn"
                onClick={() => setStage("paste")}
                style={{
                  background: "transparent", color: LO, padding: "10px 16px", border: `1px solid ${BORDER}`,
                  borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer",
                }}
              >
                ← back
              </button>
              <button
                data-testid="demo-submit-answer-btn"
                onClick={onAnswer}
                disabled={userAnswer.trim().length < 3 || answer.isPending}
                style={{
                  background: userAnswer.trim().length < 3 ? RAISED : AMBER,
                  color: userAnswer.trim().length < 3 ? LO : "#2A1E0A",
                  padding: "10px 20px", border: "none", borderRadius: 4, fontFamily: SANS,
                  fontSize: "0.9rem", fontWeight: 600,
                  cursor: userAnswer.trim().length < 3 ? "not-allowed" : "pointer",
                }}
              >
                {answer.isPending ? "Reading again…" : "See the answer →"}
              </button>
            </div>
            {answer.error && (
              <p style={{ marginTop: 10, color: "oklch(0.75 0.18 25)", fontFamily: MONO, fontSize: "0.75rem" }}>
                {answer.error.message}
              </p>
            )}
          </div>
        )}

        {stage === "reveal" && (
          <div data-testid="demo-stage-reveal" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${AMBER}`, borderRadius: 8, padding: 24 }}>
              <p style={{ fontSize: "0.72rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, marginBottom: 12, fontFamily: MONO }}>
                Ownology&rsquo;s answer — grounded in what you actually wrote
              </p>
              <p
                data-testid="demo-ai-response"
                style={{ fontFamily: SERIF, fontSize: "1.1rem", color: HI, lineHeight: 1.65, whiteSpace: "pre-wrap" }}
              >
                {aiResponse}
              </p>
            </div>

            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24 }}>
              <p style={{ fontFamily: SERIF, fontSize: "1.05rem", color: HI, lineHeight: 1.5, marginBottom: 12 }}>
                That&rsquo;s the sort of thing that stops needing to be rediscovered each vintage.
              </p>
              <p style={{ fontSize: "0.9rem", color: MID, lineHeight: 1.55, marginBottom: 20 }}>
                Ownology is quality and risk management for winemakers — quality panels, vintage-log reasoning
                and asset trail on one thread, so productivity and profit compound instead of restarting each year.
              </p>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                <a
                  data-testid="demo-cta-full-run"
                  href="/free-run"
                  style={{
                    background: AMBER, color: "#2A1E0A", padding: "10px 18px", borderRadius: 4,
                    fontFamily: SANS, fontSize: "0.88rem", fontWeight: 600, textDecoration: "none", letterSpacing: "0.02em",
                  }}
                >
                  Try Free Run — full app
                </a>
                <a
                  data-testid="demo-cta-pricing"
                  href="/pricing"
                  style={{
                    background: "transparent", color: MID, padding: "10px 18px", borderRadius: 4,
                    border: `1px solid ${BORDER}`, fontFamily: SANS, fontSize: "0.88rem", textDecoration: "none",
                  }}
                >
                  See pricing
                </a>
                <button
                  data-testid="demo-restart-btn"
                  onClick={() => {
                    setStage("paste"); setNotes(""); setSourceHint(""); setExtract("");
                    setQuestion(""); setFocusTank(""); setUserAnswer(""); setAiResponse("");
                    setEmail(""); setEmailCaptured(false); setSessionId("");
                  }}
                  style={{
                    background: "transparent", color: LO, padding: "10px 16px", border: `1px solid ${BORDER}`,
                    borderRadius: 4, fontFamily: SANS, fontSize: "0.82rem", cursor: "pointer",
                  }}
                >
                  Try another vintage
                </button>
              </div>
            </div>

            <div style={{ background: RAISED, border: `1px dashed ${BORDER}`, borderRadius: 8, padding: 20 }}>
              {emailCaptured ? (
                <p style={{ fontSize: "0.9rem", color: HI, margin: 0 }} data-testid="demo-email-captured">
                  Thanks — Rich will be in touch within a day.
                </p>
              ) : (
                <>
                  <p style={{ fontFamily: SERIF, fontSize: "1rem", color: HI, marginBottom: 10 }}>
                    Want Rich to walk you through what a full Ownology setup would look like for your winery?
                  </p>
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <input
                      data-testid="demo-email-input"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="your@email.com"
                      style={{
                        flex: "1 1 220px", minWidth: 180, background: BASE, color: HI,
                        border: `1px solid ${BORDER}`, borderRadius: 4, padding: "9px 12px",
                        fontSize: "0.9rem", fontFamily: SANS,
                      }}
                    />
                    <button
                      data-testid="demo-capture-email-btn"
                      onClick={onCaptureEmail}
                      disabled={!/^\S+@\S+\.\S+$/.test(email) || captureEmail.isPending}
                      style={{
                        background: /^\S+@\S+\.\S+$/.test(email) ? AMBER : RAISED,
                        color: /^\S+@\S+\.\S+$/.test(email) ? "#2A1E0A" : LO,
                        padding: "9px 16px", border: "none", borderRadius: 4, fontFamily: SANS,
                        fontSize: "0.88rem", fontWeight: 600,
                        cursor: /^\S+@\S+\.\S+$/.test(email) ? "pointer" : "not-allowed",
                      }}
                    >
                      {captureEmail.isPending ? "Sending…" : "Send me a walkthrough"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
