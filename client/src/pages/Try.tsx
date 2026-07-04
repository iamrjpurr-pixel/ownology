/**
 * Try — the /try conversion sandbox.
 *
 * A 7-step guided sandbox that walks a prospect through a real winemaking
 * workflow (stuck ferment → triage → decision → log → ask → journal → sub-
 * scribe) using Ownology Cellars' seed data. Static content only — no
 * backend calls, no DB writes, no auth. Safe to open to the internet.
 *
 * The design principle: at every step, show the user what Ownology
 * *feels like* on a normal day, and put a soft paywall on the action
 * buttons ("🔒 In real Ownology this saves"). No overlay. No modal. Just
 * an honest sandbox with a persistent CTA.
 *
 * Mounted at /try. Suppressed from SiteFooter to keep the frame clean.
 */
import { useState, useCallback } from "react";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import {
  WINERY,
  ALERTS,
  BATCH_04_CONTEXT,
  DECISIONS,
  QUICK_ENTRY_DRAFT,
  SCRIPTED_QA,
  JOURNAL_DRAFT,
  FINAL_CTA_COPY,
  type DemoDecision,
} from "@/data/tryDemoData";

const TOTAL_STEPS = 7;

// ─── Design tokens ──────────────────────────────────────────────────────
const AMBER = "var(--ow-amber)";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";
const BORDER = "var(--ow-border)";
const CARD_BG = "var(--ow-card-bg)";
const BG = "var(--ow-bg)";

// ─── Shared UI bits ─────────────────────────────────────────────────────
function ProgressBar({ step }: { step: number }) {
  const pct = (step / TOTAL_STEPS) * 100;
  return (
    <div
      data-testid="try-progress-bar"
      style={{
        position: "sticky",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        background: BG,
        borderBottom: `1px solid ${BORDER}`,
        padding: "0.75rem 1.5rem",
      }}
    >
      <div style={{ maxWidth: 820, margin: "0 auto", display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
        <OwnologyLogo size={22} />
        <span
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.7rem",
            color: TEXT_MID,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Sandbox · Step {step} of {TOTAL_STEPS} · Ownology Cellars
        </span>
        <div style={{ flex: 1, minWidth: 100, height: 4, background: BORDER, borderRadius: 2, overflow: "hidden" }}>
          <div
            data-testid="try-progress-fill"
            style={{ width: `${pct}%`, height: "100%", background: AMBER, transition: "width 350ms ease" }}
          />
        </div>
      </div>
    </div>
  );
}

function StickyCta() {
  return (
    <Link
      href="/pricing"
      data-testid="try-sticky-cta"
      style={{
        position: "fixed",
        right: "1.25rem",
        bottom: "1.25rem",
        zIndex: 50,
        background: AMBER,
        color: "white",
        padding: "0.7rem 1.15rem",
        borderRadius: 999,
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.82rem",
        fontWeight: 700,
        textDecoration: "none",
        boxShadow: "0 6px 18px oklch(0 0 0 / 0.20)",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}
    >
      Get real →
    </Link>
  );
}

function Chip({ children, testid }: { children: React.ReactNode; testid?: string }) {
  return (
    <span
      data-testid={testid}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.3rem",
        background: "oklch(from var(--ow-amber) l c h / 0.10)",
        color: AMBER,
        padding: "0.2rem 0.55rem",
        borderRadius: 999,
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.04em",
      }}
    >
      🔒 {children}
    </span>
  );
}

function GelSays({ children, testid }: { children: React.ReactNode; testid?: string }) {
  return (
    <div
      data-testid={testid}
      style={{
        borderLeft: `2px solid ${AMBER}`,
        paddingLeft: "0.9rem",
        margin: "1rem 0",
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.85rem",
        color: TEXT_MID,
        lineHeight: 1.6,
        fontStyle: "italic",
      }}
    >
      <strong style={{ color: TEXT_HI, fontStyle: "normal" }}>Gel says: </strong>
      {children}
    </div>
  );
}

function StepCard({
  eyebrow,
  title,
  children,
  onNext,
  nextLabel = "Continue →",
  nextDisabled = false,
  testid,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onNext?: () => void;
  nextLabel?: string;
  nextDisabled?: boolean;
  testid: string;
}) {
  return (
    <section
      data-testid={testid}
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2.5rem 1.5rem 4rem",
      }}
    >
      <p
        style={{
          color: AMBER,
          fontSize: "0.7rem",
          letterSpacing: "0.18em",
          textTransform: "uppercase",
          fontFamily: "'Lato', sans-serif",
          marginBottom: "0.6rem",
        }}
      >
        {eyebrow}
      </p>
      <h1
        data-testid={`${testid}-title`}
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
          color: TEXT_HI,
          lineHeight: 1.15,
          marginBottom: "1.5rem",
        }}
      >
        {title}
      </h1>
      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", color: TEXT_MID, lineHeight: 1.65 }}>
        {children}
      </div>
      {onNext && (
        <div style={{ marginTop: "2rem" }}>
          <button
            type="button"
            onClick={onNext}
            disabled={nextDisabled}
            data-testid={`${testid}-next`}
            style={{
              background: nextDisabled ? BORDER : AMBER,
              color: nextDisabled ? TEXT_LO : "white",
              border: "none",
              padding: "0.85rem 1.6rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.9rem",
              fontWeight: 700,
              borderRadius: 4,
              cursor: nextDisabled ? "not-allowed" : "pointer",
              letterSpacing: "0.02em",
            }}
          >
            {nextLabel}
          </button>
        </div>
      )}
    </section>
  );
}

// ─── Step 1 — Landing ────────────────────────────────────────────────────
function Step1Landing({ onNext }: { onNext: () => void }) {
  return (
    <StepCard
      testid="try-step-1"
      eyebrow="Welcome to the sandbox"
      title={`You're the winemaker at ${WINERY.name} for the next 10 minutes.`}
      onNext={onNext}
      nextLabel="Start my morning →"
    >
      <p>
        A real winery. <strong>{WINERY.batches} batches</strong> in the shed. <strong>Vintage {WINERY.vintage}</strong> in
        full swing. Semillon fermenting. Shiraz through malo. Chardonnay in barrel.
      </p>
      <p style={{ marginTop: "1rem" }}>
        You just walked into the cellar. Your phone buzzes — the Cellar Brief for today is ready. It's the same brief
        Rich and Gel get every morning at 5:30am, generated from every log entry, every measurement, every alert.
      </p>
      <p style={{ marginTop: "1rem" }}>
        No signup. No credit card. Nothing you do here saves. When you're done, you'll know if Ownology's the tool
        you've been reaching for.
      </p>
      <GelSays testid="try-step-1-gel">
        Everything you see is real data from our actual cellar. Same schema we'd use for your winery. Same alerts we
        get. Same brief we read. What you can't do is break anything.
      </GelSays>
    </StepCard>
  );
}

// ─── Step 2 — Cellar Brief with alerts ──────────────────────────────────
function Step2Brief({
  onNext,
  onPickAlert,
  pickedAlert,
}: {
  onNext: () => void;
  onPickAlert: (id: string) => void;
  pickedAlert: string | null;
}) {
  return (
    <StepCard
      testid="try-step-2"
      eyebrow="Step 1 of Rich's Daily 10"
      title="This is what you see with your first coffee."
      onNext={onNext}
      nextLabel="Investigate the red alert →"
      nextDisabled={pickedAlert !== "alert-1"}
    >
      <p>
        Three alerts this morning. Colour tells you severity. Click into the <strong style={{ color: "oklch(0.62 0.20 25)" }}>red</strong>{" "}
        one — that's the one that damages wine if you ignore it.
      </p>
      <div style={{ marginTop: "1.5rem", display: "flex", flexDirection: "column", gap: "0.75rem" }}>
        {ALERTS.map((alert) => {
          const severityColor =
            alert.severity === "high" ? "oklch(0.62 0.20 25)" : alert.severity === "medium" ? "oklch(0.68 0.15 65)" : TEXT_LO;
          const isPicked = pickedAlert === alert.id;
          return (
            <button
              key={alert.id}
              type="button"
              onClick={() => onPickAlert(alert.id)}
              data-testid={`try-alert-${alert.id}`}
              style={{
                background: CARD_BG,
                border: `1px solid ${isPicked ? AMBER : BORDER}`,
                borderRadius: 4,
                padding: "1rem 1.15rem",
                textAlign: "left",
                cursor: "pointer",
                display: "flex",
                gap: "0.9rem",
                alignItems: "flex-start",
                fontFamily: "'Lato', sans-serif",
                color: TEXT_HI,
                boxShadow: isPicked ? "0 0 0 3px oklch(from var(--ow-amber) l c h / 0.14)" : "none",
                transition: "border-color 120ms, box-shadow 120ms",
              }}
            >
              <span
                aria-hidden
                style={{ width: 8, height: 8, borderRadius: 999, background: severityColor, marginTop: "0.45rem", flexShrink: 0 }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "0.5rem", marginBottom: "0.15rem" }}>
                  <strong style={{ fontSize: "0.9rem" }}>{alert.headline}</strong>
                  <span style={{ fontSize: "0.7rem", color: TEXT_LO, whiteSpace: "nowrap" }}>{alert.age}</span>
                </div>
                <p style={{ margin: 0, fontSize: "0.78rem", color: TEXT_MID, marginBottom: "0.35rem" }}>
                  {alert.batch} · {alert.tank}
                </p>
                <p style={{ margin: 0, fontSize: "0.78rem", color: TEXT_LO, lineHeight: 1.55 }}>
                  {alert.detail}
                </p>
              </div>
            </button>
          );
        })}
      </div>
      {pickedAlert && pickedAlert !== "alert-1" && (
        <p
          data-testid="try-step-2-hint"
          style={{ marginTop: "1rem", fontSize: "0.8rem", color: TEXT_LO, fontStyle: "italic" }}
        >
          That one can wait until after coffee. Pick the red alert — the stuck ferment. Every hour we don't act, it gets
          worse.
        </p>
      )}
    </StepCard>
  );
}

// ─── Step 3 — Diagnose and decide ───────────────────────────────────────
function Step3Diagnose({
  onNext,
  onPickDecision,
  pickedDecision,
}: {
  onNext: () => void;
  onPickDecision: (key: string) => void;
  pickedDecision: DemoDecision | null;
}) {
  return (
    <StepCard
      testid="try-step-3"
      eyebrow="The 3-minute triage"
      title="Look at the chemistry. What would you do first?"
      onNext={onNext}
      nextLabel={pickedDecision?.outcome === "correct" ? "Log the fix →" : pickedDecision ? "Try another option" : "Pick an action"}
      nextDisabled={pickedDecision?.outcome !== "correct"}
    >
      <p>
        Here's the vintage log for Batch 04. Same view you'd see if you clicked into the alert. Read the last three
        rows — that's where the story is.
      </p>

      <div
        data-testid="try-step-3-chemistry"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          padding: "0.9rem 1rem",
          marginTop: "1rem",
        }}
      >
        <p style={{ margin: 0, fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: TEXT_LO, marginBottom: "0.5rem" }}>
          {BATCH_04_CONTEXT.tank} · Inoculated {BATCH_04_CONTEXT.inoculationDate} · Yeast: {BATCH_04_CONTEXT.yeast}
        </p>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
          <thead>
            <tr style={{ color: TEXT_LO, textAlign: "left" }}>
              <th style={{ padding: "0.35rem 0", fontWeight: 700 }}>Day</th>
              <th style={{ padding: "0.35rem 0", fontWeight: 700 }}>Brix</th>
              <th style={{ padding: "0.35rem 0", fontWeight: 700 }}>Temp</th>
              <th style={{ padding: "0.35rem 0", fontWeight: 700 }}>Note</th>
            </tr>
          </thead>
          <tbody>
            {BATCH_04_CONTEXT.history.map((row, idx) => (
              <tr key={idx} style={{ color: idx >= 4 ? TEXT_HI : TEXT_MID, fontWeight: idx >= 4 ? 500 : 400 }}>
                <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", fontFamily: "'JetBrains Mono', monospace" }}>{row.day}</td>
                <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", fontFamily: "'JetBrains Mono', monospace" }}>{row.brix}</td>
                <td style={{ padding: "0.3rem 0.5rem 0.3rem 0", fontFamily: "'JetBrains Mono', monospace" }}>{row.temp}</td>
                <td style={{ padding: "0.3rem 0" }}>{row.event}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", color: TEXT_HI, marginTop: "1.5rem", marginBottom: "0.75rem" }}>
        What's the FIRST move?
      </h3>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
        {DECISIONS.map((d) => {
          const isPicked = pickedDecision?.key === d.key;
          const outcomeColor =
            d.outcome === "correct" ? "oklch(0.62 0.16 145)" : d.outcome === "risky" ? "oklch(0.68 0.15 65)" : "oklch(0.62 0.20 25)";
          return (
            <button
              key={d.key}
              type="button"
              onClick={() => onPickDecision(d.key)}
              data-testid={`try-decision-${d.key}`}
              style={{
                background: CARD_BG,
                border: `1px solid ${isPicked ? outcomeColor : BORDER}`,
                borderRadius: 4,
                padding: "0.85rem 1rem",
                textAlign: "left",
                cursor: "pointer",
                fontFamily: "'Lato', sans-serif",
                color: TEXT_HI,
                fontSize: "0.87rem",
                display: "flex",
                gap: "0.7rem",
                alignItems: "center",
              }}
            >
              <span
                aria-hidden
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 999,
                  border: `1.5px solid ${isPicked ? outcomeColor : BORDER}`,
                  background: isPicked ? outcomeColor : "transparent",
                  flexShrink: 0,
                }}
              />
              {d.label}
            </button>
          );
        })}
      </div>

      {pickedDecision && (
        <GelSays testid={`try-decision-feedback-${pickedDecision.key}`}>{pickedDecision.gelSays}</GelSays>
      )}
    </StepCard>
  );
}

// ─── Step 4 — Log the fix ────────────────────────────────────────────────
function Step4Log({ onNext }: { onNext: () => void }) {
  const [saved, setSaved] = useState(false);
  return (
    <StepCard
      testid="try-step-4"
      eyebrow="Log what you did"
      title="Two taps to record the fix — the ferment doesn't forgive undocumented changes."
      onNext={onNext}
      nextLabel="Ask Ownology why this happened →"
    >
      <p>
        This is Quick Entry — the primary logging surface. Pre-filled from your decision. In your real cellar you'd type
        it yourself in ~40 seconds. Here, we've filled it for you.
      </p>

      <div
        data-testid="try-step-4-form"
        style={{
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          padding: "1rem 1.15rem",
          marginTop: "1.25rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
        }}
      >
        <FormRow label="Batch">{QUICK_ENTRY_DRAFT.batch}</FormRow>
        <FormRow label="Event type"><code style={mono}>{QUICK_ENTRY_DRAFT.eventType}</code></FormRow>
        <FormRow label="Action">{QUICK_ENTRY_DRAFT.action}</FormRow>
        {QUICK_ENTRY_DRAFT.chemistryFields.map((f) => (
          <FormRow key={f.label} label={f.label}>
            <code style={mono}>{f.value}</code>
          </FormRow>
        ))}
        <FormRow label="Tags">
          {QUICK_ENTRY_DRAFT.tags.map((t) => (
            <span key={t} style={tagStyle}>
              {t}
            </span>
          ))}
        </FormRow>
        <FormRow label="Reasoning (optional)">
          <span style={{ color: TEXT_MID, fontStyle: "italic" }}>"{QUICK_ENTRY_DRAFT.reasoning}"</span>
        </FormRow>

        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={() => setSaved(true)}
            data-testid="try-step-4-save"
            disabled={saved}
            style={{
              background: saved ? "oklch(0.62 0.16 145)" : AMBER,
              color: "white",
              border: "none",
              padding: "0.6rem 1.1rem",
              fontSize: "0.83rem",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              borderRadius: 4,
              cursor: saved ? "default" : "pointer",
            }}
          >
            {saved ? "✓ Logged" : "Save entry"}
          </button>
          <Chip testid="try-step-4-lock">In real Ownology this saves. Here it's the demo.</Chip>
        </div>
      </div>

      {saved && (
        <GelSays testid="try-step-4-gel">
          A logged reasoning line ("cool tank first, then chemistry") is what turns a spreadsheet into a knowledge base.
          Six months from now when you hit another stuck ferment, tomorrow-you will search "stuck-ferment" and find this
          exact entry. That's the compounding.
        </GelSays>
      )}
    </StepCard>
  );
}

function FormRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.75rem", padding: "0.35rem 0", borderBottom: `1px dashed ${BORDER}` }}>
      <span style={{ color: TEXT_LO, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.02em" }}>{label}</span>
      <span style={{ color: TEXT_HI, fontSize: "0.82rem", display: "flex", flexWrap: "wrap", gap: "0.3rem", alignItems: "center" }}>
        {children}
      </span>
    </div>
  );
}
const mono: React.CSSProperties = { fontFamily: "'JetBrains Mono', monospace", fontSize: "0.78rem", background: "oklch(0 0 0 / 0.12)", padding: "0.05rem 0.35rem", borderRadius: 2 };
const tagStyle: React.CSSProperties = { background: "oklch(from var(--ow-amber) l c h / 0.10)", color: AMBER, padding: "0.15rem 0.5rem", borderRadius: 999, fontSize: "0.7rem", fontFamily: "'Lato', sans-serif", fontWeight: 700 };

// ─── Step 5 — Ask Ownology ──────────────────────────────────────────────
function Step5Ask({ onNext }: { onNext: () => void }) {
  const [asked, setAsked] = useState(false);
  return (
    <StepCard
      testid="try-step-5"
      eyebrow="Ask Ownology"
      title="Now ask the assistant — it knows your cellar, not just wine in general."
      onNext={onNext}
      nextLabel="Publish today's lesson →"
    >
      <p>
        Ask Ownology answers using YOUR log entries, YOUR chemistry, YOUR batches. Not a generic sommelier chatbot — a
        winemaker's assistant grounded in your own cellar's history.
      </p>

      <div
        data-testid="try-step-5-question"
        style={{
          marginTop: "1.5rem",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          padding: "1rem 1.15rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
        }}
      >
        <p style={{ color: TEXT_LO, fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, marginBottom: "0.5rem" }}>
          Question
        </p>
        <p style={{ margin: 0, color: TEXT_HI, fontSize: "0.95rem", lineHeight: 1.5 }}>
          {SCRIPTED_QA.question}
        </p>
        {!asked && (
          <button
            type="button"
            onClick={() => setAsked(true)}
            data-testid="try-step-5-ask"
            style={{
              background: AMBER,
              color: "white",
              border: "none",
              padding: "0.55rem 1rem",
              borderRadius: 4,
              cursor: "pointer",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.82rem",
              fontWeight: 700,
              marginTop: "1rem",
            }}
          >
            Ask →
          </button>
        )}
      </div>

      {asked && (
        <div
          data-testid="try-step-5-answer"
          style={{
            marginTop: "1rem",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            padding: "1.15rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.87rem",
            color: TEXT_HI,
            lineHeight: 1.65,
          }}
        >
          <p style={{ color: AMBER, fontSize: "0.68rem", letterSpacing: "0.14em", textTransform: "uppercase", margin: 0, marginBottom: "0.6rem" }}>
            Ownology's answer
          </p>
          {SCRIPTED_QA.answer.split("\n\n").map((para, idx) => (
            <p key={idx} style={{ margin: idx === 0 ? "0 0 0.9rem" : "0.6rem 0", whiteSpace: "pre-line" }}>
              {para.split(/(\*\*[^*]+\*\*)/).map((chunk, i) =>
                chunk.startsWith("**") && chunk.endsWith("**") ? (
                  <strong key={i} style={{ color: TEXT_HI }}>{chunk.slice(2, -2)}</strong>
                ) : (
                  <span key={i}>{chunk}</span>
                )
              )}
            </p>
          ))}
          <div style={{ marginTop: "1rem", padding: "0.75rem", background: "oklch(0 0 0 / 0.08)", borderRadius: 3 }}>
            <p style={{ color: TEXT_LO, fontSize: "0.68rem", letterSpacing: "0.08em", textTransform: "uppercase", margin: 0, marginBottom: "0.4rem" }}>
              Grounded in
            </p>
            {SCRIPTED_QA.citations.map((c) => (
              <p key={c} style={{ margin: 0, fontSize: "0.75rem", color: TEXT_MID, lineHeight: 1.5 }}>
                · {c}
              </p>
            ))}
          </div>
        </div>
      )}
    </StepCard>
  );
}

// ─── Step 6 — Publish journal ───────────────────────────────────────────
function Step6Journal({ onNext }: { onNext: () => void }) {
  const [published, setPublished] = useState(false);
  return (
    <StepCard
      testid="try-step-6"
      eyebrow="The SEO flywheel"
      title="Publish what you learned. Rank on Google. Compound over time."
      onNext={onNext}
      nextLabel="See what you'd get →"
    >
      <p>
        Every stuck ferment you solve is a Cellar Journal entry someone else is Googling right now. Publish once,
        Ownology writes the meta tags, pings the sitemap, adds it to your RSS. In six months, wine students in New
        Zealand find it and remember your name.
      </p>

      <div
        data-testid="try-step-6-preview"
        style={{
          marginTop: "1.25rem",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          padding: "1.2rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
          color: TEXT_HI,
          lineHeight: 1.6,
        }}
      >
        <p style={{ color: TEXT_LO, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, marginBottom: "0.4rem" }}>
          Cellar Journal · {WINERY.name}
        </p>
        <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.2rem", color: TEXT_HI, margin: "0 0 0.5rem" }}>
          {JOURNAL_DRAFT.title}
        </h3>
        <p style={{ margin: 0, whiteSpace: "pre-line", fontSize: "0.83rem" }}>{JOURNAL_DRAFT.bodyMd}</p>
        <div style={{ marginTop: "0.9rem", display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
          {JOURNAL_DRAFT.tags.map((t) => (
            <span key={t} style={tagStyle}>
              {t}
            </span>
          ))}
        </div>
        <p style={{ marginTop: "0.9rem", color: TEXT_LO, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace" }}>
          URL: ownology.ai/cellar-journal/{JOURNAL_DRAFT.slug}
        </p>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", marginTop: "1rem", flexWrap: "wrap" }}>
        <button
          type="button"
          onClick={() => setPublished(true)}
          data-testid="try-step-6-publish"
          disabled={published}
          style={{
            background: published ? "oklch(0.62 0.16 145)" : AMBER,
            color: "white",
            border: "none",
            padding: "0.6rem 1.1rem",
            fontSize: "0.83rem",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            borderRadius: 4,
            cursor: published ? "default" : "pointer",
          }}
        >
          {published ? "✓ Published" : "Publish entry"}
        </button>
        <Chip>In real Ownology this hits the sitemap, RSS, and OG image queue.</Chip>
      </div>

      {published && (
        <GelSays testid="try-step-6-gel">
          200 words. 20 minutes to write. In two years, 40 posts like this rank for hundreds of long-tail winemaking
          questions. That's how a boutique winery gets found without paying a marketer.
        </GelSays>
      )}
    </StepCard>
  );
}

// ─── Step 7 — CTA close ─────────────────────────────────────────────────
function Step7Close() {
  return (
    <StepCard testid="try-step-7" eyebrow="Ten minutes, one workflow" title={FINAL_CTA_COPY.headline}>
      <p>{FINAL_CTA_COPY.narration}</p>
      <p style={{ marginTop: "1rem" }}>{FINAL_CTA_COPY.offer}</p>

      <div style={{ marginTop: "2rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
        <Link
          href="/pricing"
          data-testid="try-step-7-primary-cta"
          style={{
            background: AMBER,
            color: "white",
            padding: "0.9rem 1.7rem",
            borderRadius: 4,
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.92rem",
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          {FINAL_CTA_COPY.ctaLabel} →
        </Link>
        <Link
          href="/quiz"
          data-testid="try-step-7-secondary-cta"
          style={{
            color: TEXT_MID,
            padding: "0.9rem 1rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            textDecoration: "none",
            borderBottom: `1px solid ${BORDER}`,
          }}
        >
          Or try the Wine Quiz first
        </Link>
      </div>

      <div style={{ marginTop: "2rem", padding: "1rem", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4 }}>
        <p style={{ color: TEXT_LO, fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", margin: 0, marginBottom: "0.5rem" }}>
          What you just did (in real winemaking terms)
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.2rem", color: TEXT_MID, fontSize: "0.85rem", lineHeight: 1.7 }}>
          <li>Diagnosed a stuck fermentation from vintage-log data</li>
          <li>Made a temperature-first triage decision</li>
          <li>Logged a chemistry-grade action with reasoning</li>
          <li>Extracted a grounded explanation citing your own batch history</li>
          <li>Published a searchable Cellar Journal SOP for future you</li>
        </ul>
      </div>
    </StepCard>
  );
}

// ─── Main container ─────────────────────────────────────────────────────
export default function Try() {
  const [step, setStep] = useState(1);
  const [pickedAlert, setPickedAlert] = useState<string | null>(null);
  const [pickedDecision, setPickedDecision] = useState<DemoDecision | null>(null);

  const goNext = useCallback(() => {
    setStep((s) => Math.min(TOTAL_STEPS, s + 1));
    // scroll to top after step change
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, []);

  const onPickDecision = useCallback((key: string) => {
    const found = DECISIONS.find((d) => d.key === key) ?? null;
    setPickedDecision(found);
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      <ProgressBar step={step} />

      {step === 1 && <Step1Landing onNext={goNext} />}
      {step === 2 && (
        <Step2Brief onNext={goNext} onPickAlert={setPickedAlert} pickedAlert={pickedAlert} />
      )}
      {step === 3 && (
        <Step3Diagnose onNext={goNext} onPickDecision={onPickDecision} pickedDecision={pickedDecision} />
      )}
      {step === 4 && <Step4Log onNext={goNext} />}
      {step === 5 && <Step5Ask onNext={goNext} />}
      {step === 6 && <Step6Journal onNext={goNext} />}
      {step === 7 && <Step7Close />}

      <StickyCta />
    </div>
  );
}
