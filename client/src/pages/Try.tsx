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
import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import {
  WINERY,
  ALERTS,
  ALERT_RESOLUTIONS,
  BATCH_04_CONTEXT,
  DECISIONS,
  QUICK_ENTRY_DRAFT,
  SCRIPTED_QA,
  JOURNAL_DRAFT,
  FINAL_CTA_COPY,
  type DemoDecision,
} from "@/data/tryDemoData";

// ─── Resume state (Lens 5 · Fatigue) ───────────────────────────────────
// Real prospects get interrupted. Phone rings, kid cries, tasting starts.
// If we lose their progress on refresh, we lose the conversion. Persist
// current step + picks in localStorage with a 7-day TTL so a busy user
// can come back tomorrow and pick up where they left off.
const RESUME_KEY = "ownology_try_state_v1";
const RESUME_TTL_MS = 7 * 24 * 60 * 60 * 1000;

interface ResumeState {
  step: number;
  pickedAlert: string | null;
  pickedDecision: string | null;
  savedAt: number;
}

function loadResumeState(): ResumeState | null {
  if (typeof window === "undefined") return null;
  try {
    // Explicit ?intro=1 forces the visitor back into the 3-page story
    // intro (bypassing localStorage resume). Bookmarkable + shareable —
    // e.g. tell a prospect "check https://ownology.ai/try?intro=1".
    const params = new URLSearchParams(window.location.search);
    if (params.get("intro") === "1") {
      window.localStorage.removeItem(RESUME_KEY);
      return null;
    }
    const raw = window.localStorage.getItem(RESUME_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ResumeState;
    if (!parsed.savedAt || Date.now() - parsed.savedAt > RESUME_TTL_MS) {
      window.localStorage.removeItem(RESUME_KEY);
      return null;
    }
    if (parsed.step < 1 || parsed.step > TOTAL_STEPS) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveResumeState(s: Omit<ResumeState, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    const payload: ResumeState = { ...s, savedAt: Date.now() };
    window.localStorage.setItem(RESUME_KEY, JSON.stringify(payload));
  } catch {
    // storage quota / private mode — silent fallback
  }
}

function clearResumeState() {
  if (typeof window === "undefined") return;
  try { window.localStorage.removeItem(RESUME_KEY); } catch { /* noop */ }
}

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
function ProgressBar({ step, onRestart, onReplayIntro }: { step: number; onRestart: () => void; onReplayIntro: () => void }) {
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
        <button
          type="button"
          onClick={onReplayIntro}
          data-testid="try-intro-replay"
          className="try-restart-btn"
          style={{
            background: "none",
            border: `1px solid ${BORDER}`,
            padding: "0.3rem 0.65rem",
            borderRadius: 4,
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.7rem",
            color: AMBER,
            cursor: "pointer",
            letterSpacing: "0.04em",
          }}
        >
          ▶ Story intro
        </button>
        {step > 1 && (
          <button
            type="button"
            onClick={onRestart}
            data-testid="try-restart-btn"
            className="try-restart-btn"
            style={{
              background: "none",
              border: `1px solid ${BORDER}`,
              padding: "0.3rem 0.65rem",
              borderRadius: 4,
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.7rem",
              color: TEXT_LO,
              cursor: "pointer",
              letterSpacing: "0.04em",
            }}
          >
            Start over
          </button>
        )}
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
      <strong style={{ color: TEXT_HI, fontStyle: "normal" }}>Owen says: </strong>
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
        You just walked into the cellar. Your phone buzzes — the Cellar Brief for today is ready. It's the same brief{" "}
        <abbr
          data-testid="try-owen-intro-tooltip"
          title="Owen (also Eoghan / Owain) — a Celtic name meaning 'well-born' or 'noble'. Owen is Ownology's AI cellar-hand: he reads yesterday's logs while you sleep and writes the brief you wake up to."
          style={{
            textDecoration: "underline dotted",
            textUnderlineOffset: "3px",
            textDecorationColor: AMBER,
            cursor: "help",
            fontStyle: "normal",
          }}
        >
          Owen
        </abbr>{" "}
        — Ownology's AI cellar-hand — writes for us every morning at 7am, generated from every log entry, every
        measurement, every alert.
      </p>
      <p style={{ marginTop: "1rem" }}>
        No signup. No credit card. Nothing you do here saves. When you're done, you'll know if Ownology's the tool
        you've been reaching for.
      </p>
      <GelSays testid="try-step-1-gel">
        Everything you see is real data from our actual cellar. Same layout you&apos;d get for your winery. Same alerts we
        read every morning. Same brief I write. What you can&apos;t do is break anything.
      </GelSays>
      <div
        data-testid="try-step-1-excel"
        style={{
          marginTop: "1.25rem",
          padding: "1rem 1.15rem",
          border: `1px dashed ${AMBER}`,
          borderRadius: 4,
          background: "oklch(from var(--ow-amber) l c h / 0.06)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.85rem",
          color: TEXT_MID,
          lineHeight: 1.6,
        }}
      >
        <p style={{ color: AMBER, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700, margin: 0, marginBottom: "0.5rem" }}>
          Import Anything — Day 1
        </p>
        <p style={{ margin: 0 }}>
          <strong style={{ color: TEXT_HI }}>Already have a spreadsheet, paper logs, or voice memos?</strong> Good —
          keep all of it. On Day 1 Ownology ingests whatever you've got:
        </p>
        <ul style={{ margin: "0.6rem 0 0", padding: "0 0 0 1.1rem", color: TEXT_MID, fontSize: "0.82rem" }}>
          <li>Excel, Google Sheets, CSV, or exports from any winery software</li>
          <li>Photograph paper logs — OCR digitises them into structured entries</li>
          <li>Record a voice memo — we transcribe it into a chemistry-grade log line</li>
          <li>Email us a scanned notebook — we handle it</li>
        </ul>
        <p style={{ margin: "0.6rem 0 0", fontStyle: "italic", fontSize: "0.78rem", color: TEXT_LO }}>
          On Day 30 you'll notice you've stopped opening the spreadsheet. We earn our place — we don't ask you to
          switch systems on trust.
        </p>
      </div>
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
  const resolution = pickedAlert ? ALERT_RESOLUTIONS[pickedAlert] : null;
  return (
    <StepCard
      testid="try-step-2"
      eyebrow="The Cellar Brief · Step 1 of the Daily 10"
      title="This is your morning at 7am."
      onNext={onNext}
      nextLabel={resolution?.ctaLabel ?? "Pick an alert to continue →"}
      nextDisabled={!pickedAlert}
    >
      <p>
        The <strong>Cellar Brief</strong> is Ownology's daily AI summary, written by Owen — one email at 7am, one bookmarkable page
        at <code style={mono}>/cellar-brief</code>. Same data, same alerts, same colour language you see here.
      </p>
      <p style={{ marginTop: "0.75rem" }}>
        Three alerts this morning. Colour tells you severity. Click any one — Ownology handles each differently, and we'll show you how.
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

      {/* Quiet-batch reinforcement — the story of "12 batches" needs to land */}
      <p
        data-testid="try-step-2-quiet-line"
        style={{
          marginTop: "0.9rem",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.78rem",
          color: TEXT_LO,
          fontStyle: "italic",
        }}
      >
        · and 9 more batches quietly doing their thing — no alerts today.
      </p>

      {/* Per-severity resolution card — inline expansion after picking any
          alert. Teaches the prospect the actual severity-differentiated
          handling: crisis / scheduled / task-queue. Grounded citations
          (AWRI, Halliday) build credibility. */}
      {resolution && (
        <div
          data-testid={`try-alert-resolution-${pickedAlert}`}
          style={{
            marginTop: "1.4rem",
            padding: "1rem 1.15rem",
            background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
            border: `1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)`,
            borderRadius: 4,
            fontFamily: "'Lato', sans-serif",
          }}
        >
          <p style={{ margin: 0, fontSize: "0.68rem", color: AMBER, letterSpacing: "0.14em", textTransform: "uppercase", fontWeight: 700 }}>
            {resolution.heading}
          </p>
          {resolution.lines.map((line, i) => (
            <p key={i} style={{ margin: "8px 0 0", fontSize: "0.85rem", color: TEXT_MID, lineHeight: 1.55 }}>
              {line}
            </p>
          ))}
          {resolution.citation && (
            <p style={{ margin: "10px 0 0", fontSize: "0.72rem", color: TEXT_LO, fontStyle: "italic" }}>
              Source: {resolution.citation.source}
            </p>
          )}
        </div>
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
        <>
          <GelSays testid={`try-decision-feedback-${pickedDecision.key}`}>{pickedDecision.gelSays}</GelSays>
          <SourcesPanel sources={pickedDecision.sources} testid={`try-decision-sources-${pickedDecision.key}`} />
        </>
      )}
    </StepCard>
  );
}

/** Compact "Cited from" panel — small, unshouty, rendered below Gel's
 *  voice. Every claim in the sandbox should be defensible against a
 *  challenge like "who says?" from a scientist parent. */
function SourcesPanel({ sources, testid }: { sources: import("@/data/tryDemoData").DemoSource[]; testid: string }) {
  if (!sources || sources.length === 0) return null;
  return (
    <div
      data-testid={testid}
      style={{
        marginTop: "0.75rem",
        padding: "0.85rem 1rem",
        background: "oklch(0 0 0 / 0.06)",
        borderRadius: 4,
        border: `1px solid ${BORDER}`,
      }}
    >
      <p
        style={{
          color: TEXT_LO,
          fontSize: "0.66rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          fontFamily: "'Lato', sans-serif",
          fontWeight: 700,
          margin: 0,
          marginBottom: "0.6rem",
        }}
      >
        Cited from
      </p>
      <ol style={{ margin: 0, padding: 0, listStyle: "none" }}>
        {sources.map((s, idx) => (
          <li
            key={idx}
            style={{
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.78rem",
              color: TEXT_MID,
              lineHeight: 1.55,
              paddingBottom: idx === sources.length - 1 ? 0 : "0.55rem",
              marginBottom: idx === sources.length - 1 ? 0 : "0.55rem",
              borderBottom: idx === sources.length - 1 ? "none" : `1px dashed ${BORDER}`,
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              gap: "0.55rem",
            }}
          >
            <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: TEXT_LO }}>
              [{idx + 1}]
            </span>
            <span>
              <strong style={{ color: TEXT_HI, fontWeight: 700 }}>{s.publisher}</strong>
              <span style={{ color: TEXT_LO }}> — </span>
              {s.url ? (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{ color: AMBER, textDecoration: "none", borderBottom: `1px dotted ${AMBER}` }}
                >
                  {s.title}
                </a>
              ) : (
                <em style={{ color: TEXT_HI }}>{s.title}</em>
              )}
              {s.detail && (
                <p style={{ margin: "0.25rem 0 0", color: TEXT_LO, fontSize: "0.75rem", lineHeight: 1.5 }}>
                  {s.detail}
                </p>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
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
          <Chip testid="try-step-4-lock">In real Ownology this saves to your vintage log — searchable, cited, and yours.</Chip>
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

// ─── Step 5 — Ask Ownology (C2 live LLM) ────────────────────────────────
function Step5Ask({ onNext }: { onNext: () => void }) {
  const [question, setQuestion] = useState<string>(SCRIPTED_QA.question);
  const [answer, setAnswer] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "limit" | "err">("idle");
  const [errMsg, setErrMsg] = useState<string>("");
  const askMutation = trpc.tutor.sandboxAsk.useMutation();
  // Persist session id across renders — Ask limit is per session, not per mount.
  const sessionIdRef = useRef<string>("");
  if (!sessionIdRef.current && typeof window !== "undefined") {
    const KEY = "ow-try-session";
    const existing = window.sessionStorage.getItem(KEY);
    if (existing) {
      sessionIdRef.current = existing;
    } else {
      const rand = Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
      window.sessionStorage.setItem(KEY, rand);
      sessionIdRef.current = rand;
    }
  }

  async function ask() {
    if (!question.trim() || status === "loading") return;
    setStatus("loading");
    setAnswer(null);
    setErrMsg("");
    try {
      const res = await askMutation.mutateAsync({
        sessionId: sessionIdRef.current,
        question: question.trim(),
      });
      setAnswer(res.answer);
      setStatus(res.limitReached ? "limit" : res.ok ? "done" : "err");
      if (!res.ok && !res.limitReached) setErrMsg(res.answer);
    } catch (e) {
      setStatus("err");
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
    }
  }

  return (
    <StepCard
      testid="try-step-5"
      eyebrow="Ask Ownology · live LLM"
      title="Now ask the assistant — it knows your cellar, not just wine in general."
      onNext={onNext}
      nextLabel="Publish today's lesson →"
    >
      <p>
        Ask Ownology answers using YOUR log entries, YOUR chemistry, YOUR batches. Not a generic sommelier chatbot — a
        winemaker's assistant grounded in your own cellar's history. This is a real Claude Sonnet call, not a canned response.
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
          Ask about Batch 04 (or anything about this cellar)
        </p>
        <textarea
          data-testid="try-step-5-input"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={status === "loading" || status === "limit"}
          rows={2}
          style={{
            width: "100%",
            background: "oklch(0 0 0 / 0.08)",
            color: TEXT_HI,
            border: `1px solid ${BORDER}`,
            borderRadius: 3,
            padding: "0.5rem 0.7rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.9rem",
            resize: "vertical",
          }}
        />
        <button
          type="button"
          onClick={ask}
          disabled={!question.trim() || status === "loading" || status === "limit"}
          data-testid="try-step-5-ask"
          style={{
            background: AMBER,
            color: "white",
            border: "none",
            padding: "0.55rem 1rem",
            borderRadius: 4,
            cursor: status === "loading" || status === "limit" ? "not-allowed" : "pointer",
            opacity: status === "loading" || status === "limit" ? 0.6 : 1,
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.82rem",
            fontWeight: 700,
            marginTop: "0.75rem",
          }}
        >
          {status === "loading" ? "Thinking…" : status === "limit" ? "Limit reached" : "Ask →"}
        </button>
      </div>

      {answer !== null && (
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
            {status === "limit" ? "Demo limit" : status === "err" ? "Error" : "Ownology's answer"}
          </p>
          <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>{answer}</p>
          {status === "done" && (
            <p style={{ margin: "10px 0 0", color: TEXT_LO, fontSize: "0.7rem", fontStyle: "italic" }}>
              Grounded in the sandbox context: Batch 04 Semillon, Tank 7 · YAN 148 ppm · temp 26°C · AWRI / Halliday sourcing.
            </p>
          )}
          {errMsg && status === "err" && (
            <p style={{ margin: "8px 0 0", color: "#ef4444", fontSize: "0.72rem" }}>{errMsg}</p>
          )}
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
        Ownology handles the SEO plumbing — the write-up, the preview card, the sitemap — quietly, in the background. In six months, wine students in New
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
        <Chip>In real Ownology this goes live on your public cellar journal — where Google and wine drinkers find you.</Chip>
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
function Step7Close({ fromRoute }: { fromRoute: string | null }) {
  const unlockLine = fromRoute ? UNLOCK_COPY[fromRoute] : null;
  return (
    <StepCard testid="try-step-7" eyebrow="Ten minutes, one workflow" title={FINAL_CTA_COPY.headline}>
      <p>{FINAL_CTA_COPY.narration}</p>
      <p style={{ marginTop: "1rem" }}>{FINAL_CTA_COPY.offer}</p>

      {/* Day 1 timeline — Lens 1 (Communication): don't ask them to leap
          blindly. Show them exactly what week one looks like. */}
      <div
        data-testid="try-step-7-day-one"
        style={{
          marginTop: "1.75rem",
          background: CARD_BG,
          border: `1px solid ${BORDER}`,
          borderRadius: 4,
          padding: "1.15rem 1.25rem",
        }}
      >
        <p style={{ color: AMBER, fontSize: "0.66rem", letterSpacing: "0.14em", textTransform: "uppercase", fontFamily: "'Lato', sans-serif", fontWeight: 700, margin: 0, marginBottom: "0.75rem" }}>
          What happens when you reserve
        </p>
        <ol style={{ margin: 0, padding: 0, listStyle: "none", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          {[
            { when: "Within 4 hours", what: "Rich replies personally. Books a 20-min call to hear your vintage story." },
            { when: "Day 1", what: "Ownology imports your existing spreadsheet — batches, tanks, logs. Nothing lost." },
            { when: "Day 2 · 7am", what: "Owen sends your first Cellar Brief. Real data, real alerts, real chemistry." },
            { when: "Day 7", what: "First LIP Audit Pack draft is ready — Wine Australia §39F compliant. One click." },
            { when: "Day 30", what: "You notice you've stopped opening the spreadsheet." },
          ].map((row, idx) => (
            <li
              key={idx}
              style={{ display: "grid", gridTemplateColumns: "140px 1fr", gap: "0.75rem", fontFamily: "'Lato', sans-serif" }}
            >
              <span style={{ color: TEXT_LO, fontSize: "0.72rem", fontFamily: "'JetBrains Mono', monospace", paddingTop: "0.15rem", letterSpacing: "0.02em" }}>
                {row.when}
              </span>
              <span style={{ color: TEXT_HI, fontSize: "0.84rem", lineHeight: 1.5 }}>
                {row.what}
              </span>
            </li>
          ))}
        </ol>
      </div>

      <div style={{ marginTop: "1.75rem", display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "center" }}>
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
          href="/cellar-journal"
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
          Or read the Cellar Journal first →
        </Link>
      </div>

      {/* Personalised "you came here for X" close — only surfaces when
          the user arrived via the ?from redirect wall. Placed BELOW the
          primary CTA so it acts as a nudge, not a wall of text before
          the button. */}
      {unlockLine && (
        <p
          data-testid="try-step-7-unlock-line"
          style={{
            marginTop: "1rem",
            padding: "0.75rem 1rem",
            background: "oklch(from var(--ow-amber) l c h / 0.10)",
            borderLeft: `3px solid ${AMBER}`,
            borderRadius: 3,
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.85rem",
            color: TEXT_HI,
            lineHeight: 1.55,
            margin: "1rem 0 0",
          }}
        >
          {unlockLine}
        </p>
      )}

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

// ─── Intro flow (3 auto-cycling story screens) ─────────────────────────
// Before the sandbox proper we run a 3-screen emotional/product intro so
// prospects don't get dumped straight into "you're the winemaker" cold.
// Each screen auto-advances after AUTO_ADVANCE_MS. If the user clicks the
// screen or the "Continue →" button, auto-advance for the remaining
// intro screens is cancelled (they're engaged — respect their pace).
// Once past the intro, the sandbox's 7 steps run as normal.
const AUTO_ADVANCE_MS = 9000; // 9 seconds — comfortable reading pace

interface IntroScreen {
  key: "hook" | "story" | "why";
  eyebrow: string;
  title: string;
  body: React.ReactNode;
}

const INTRO_SCREENS: IntroScreen[] = [
  {
    key: "hook",
    eyebrow: "Ownology",
    title: "Every vintage is a story. Some winemakers have lost theirs.",
    body: (
      <>
        <p>
          Some to lost paper. Some to spreadsheets that fell out of the shared folder. Some to the 3am ferment panic
          that ate the year.
        </p>
        <p style={{ marginTop: "1rem" }}>
          The most valuable thing in a cellar isn't the wine itself — it's what you learned making it. Ownology keeps
          that.
        </p>
      </>
    ),
  },
  {
    key: "story",
    eyebrow: "Our story",
    title: "Rich & Gel. Ownology Cellars, Hunter Valley.",
    body: (
      <>
        <p>
          12 batches. One shed. Three and a half hectares. Vintage 2026 in full swing — Semillon on lees, Shiraz
          through malo, Chardonnay in barrel.
        </p>
        <p style={{ marginTop: "1rem" }}>
          We&apos;re analysts by background — arts and science degrees, years spent inside ISO 9001 and 14001
          quality-and-environment systems, then learning the cellar the way any boutique winemaker does: with our own
          knowledge, our own mistakes, and Owen&apos;s support. What you&apos;re about to see is our own cellar&apos;s
          data, wired to a tool we built for ourselves — and now for you.
        </p>
      </>
    ),
  },
  {
    key: "why",
    eyebrow: "Why Ownology",
    title: "One system. Five surfaces. It fits your day.",
    body: (
      <ul style={{ padding: 0, margin: "0.5rem 0 0", listStyle: "none" }}>
        {[
          ["Cellar Brief", "Owen reads yesterday's logs while you sleep. In your inbox at 7am — what needs doing today, ranked."],
          ["Cellar Journal", "Every lesson you record ranks on Google over time. Your voice, your knowledge, your marketing."],
          ["Batch Book", "Your Wine Australia LIP Audit Pack writes itself from every entry. One click, PDF, compliant."],
          ["Ask Ownology", "A winemaker's assistant that knows YOUR cellar's history — not a generic wine chatbot."],
          ["Import Anything", "Excel, Google Sheets, CSV. Photograph a paper log — OCR digitises it. Record a voice memo — we transcribe it into a proper entry. Your data. Your format. Our job to make it work."],
        ].map(([label, desc]) => (
          <li key={label} style={{ marginBottom: "0.9rem", display: "grid", gridTemplateColumns: "150px 1fr", gap: "0.75rem", alignItems: "baseline" }}>
            <strong style={{ color: TEXT_HI, fontFamily: "'Fraunces', serif", fontSize: "0.98rem" }}>{label}</strong>
            <span style={{ color: TEXT_MID, fontSize: "0.86rem", lineHeight: 1.55 }}>{desc}</span>
          </li>
        ))}
      </ul>
    ),
  },
];

function IntroScreenView({
  screen,
  index,
  total,
  onNext,
  onSkipIntro,
}: {
  screen: IntroScreen;
  index: number;
  total: number;
  onNext: () => void;
  onSkipIntro: () => void;
}) {
  const isLast = index === total - 1;
  return (
    <section
      data-testid={`try-intro-${screen.key}`}
      style={{ maxWidth: 720, margin: "0 auto", padding: "2.5rem 1.5rem 4rem" }}
    >
      {/* Story-dots progress */}
      <div
        data-testid="try-intro-dots"
        style={{ display: "flex", gap: "0.4rem", marginBottom: "1.5rem", alignItems: "center" }}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            style={{
              width: i === index ? 26 : 6,
              height: 6,
              borderRadius: 999,
              background: i <= index ? AMBER : BORDER,
              transition: "width 300ms ease, background 200ms ease",
            }}
          />
        ))}
        <span style={{ marginLeft: "auto", fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: TEXT_LO, letterSpacing: "0.08em" }}>
          Story {index + 1} of {total}
        </span>
      </div>

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
        {screen.eyebrow}
      </p>
      <h1
        data-testid={`try-intro-${screen.key}-title`}
        style={{
          fontFamily: "'Fraunces', serif",
          fontSize: "clamp(1.8rem, 4.5vw, 2.8rem)",
          color: TEXT_HI,
          lineHeight: 1.15,
          marginBottom: "1.5rem",
        }}
      >
        {screen.title}
      </h1>
      <div style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", color: TEXT_MID, lineHeight: 1.65 }}>
        {screen.body}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap", marginTop: "2rem" }}>
        <button
          type="button"
          onClick={onNext}
          data-testid={`try-intro-${screen.key}-next`}
          style={{
            background: AMBER,
            color: "white",
            border: "none",
            padding: "0.85rem 1.6rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.9rem",
            fontWeight: 700,
            borderRadius: 4,
            cursor: "pointer",
          }}
        >
          {isLast ? "Start the sandbox →" : "Continue →"}
        </button>
        {!isLast && (
          <button
            type="button"
            onClick={onSkipIntro}
            data-testid="try-intro-skip"
            style={{
              background: "none",
              border: "none",
              padding: "0.85rem 0.5rem",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.82rem",
              color: TEXT_LO,
              cursor: "pointer",
              textDecoration: "underline",
              textDecorationColor: BORDER,
              textUnderlineOffset: 3,
            }}
          >
            Skip intro
          </button>
        )}
      </div>
      <p style={{ marginTop: "0.85rem", fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: TEXT_LO, fontStyle: "italic" }}>
        {isLast ? "" : "Auto-advances in a few seconds — or tap to continue at your own pace."}
      </p>
    </section>
  );
}

// ─── Main container ─────────────────────────────────────────────────────
/** Friendly labels for the member routes we might have redirected the
 *  user from. Keyed by pathname (matches server/index.ts MEMBER_ONLY_PREFIXES).
 *  Used to show a contextual "you were reaching for X" banner at Step 1. */
const FROM_ROUTE_LABELS: Record<string, string> = {
  "/dashboard": "the Dashboard",
  "/cellar-brief": "the Cellar Brief",
  "/cellar-tasks": "Cellar Tasks",
  "/quick-entry": "Quick Entry",
  "/the-press": "The Press",
  "/batch-book": "the Batch Book",
  "/work-mode": "Work Mode",
  "/orders": "your Orders",
  "/todo": "our internal roadmap",
  "/roadmap": "our internal roadmap",
};

/** Personalised "unlock" line shown above the Step 7 CTA when the user
 *  arrived via the ?from redirect. Each entry is a single sentence that
 *  reinforces "you came here looking for X → reserve = you get X". Keeps
 *  the marketing message tight to the specific hunger they showed. */
const UNLOCK_COPY: Record<string, string> = {
  "/dashboard":
    "You came here looking for the Dashboard. Reserve now and yours goes live within the hour — your batches, your tanks, your alerts.",
  "/cellar-brief":
    "You came here looking for the Cellar Brief. Reserve now and Owen has yours in your inbox tomorrow at 7am — your data, your alerts, one email.",
  "/cellar-tasks":
    "You came here looking for Cellar Tasks. Reserve now and your task list is ready by Day 1 — imported from your existing spreadsheet.",
  "/quick-entry":
    "You came here looking for Quick Entry. Reserve now and you're logging additions in under 40 seconds by tomorrow morning.",
  "/the-press":
    "You came here looking for The Press. Reserve now and your grape-intake ledger is ready before your next vintage.",
  "/batch-book":
    "You came here looking for the Batch Book. Reserve now and your LIP-compliant records write themselves from every entry.",
  "/work-mode":
    "You came here looking for Work Mode. Reserve now and your gloves-friendly cellar-floor UI is ready by Day 1.",
  "/orders":
    "You came here looking for Orders. Reserve now and your merch fulfilment is wired up before your first bottle ships.",
  "/todo":
    "You came here looking for our internal roadmap. That's members-only, but the sandbox above shows you what we've built. Reserve now and you'll see everything else the moment it ships.",
  "/roadmap":
    "You came here looking for our internal roadmap. That's members-only, but the sandbox above shows you what we've built. Reserve now and you'll see everything else the moment it ships.",
};

function readFromParam(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const p = new URLSearchParams(window.location.search).get("from");
    if (!p) return null;
    // Only surface labels we know about — silently ignore anything else so
    // a random `?from=/whatever` doesn't produce a broken banner.
    return FROM_ROUTE_LABELS[p] ? p : null;
  } catch {
    return null;
  }
}

export default function Try() {
  // Hydrate from localStorage on first render — if a prospect got
  // interrupted mid-flow within the last 7 days, drop them back exactly
  // where they were rather than making them re-do everything.
  const initial = typeof window !== "undefined" ? loadResumeState() : null;
  const [step, setStep] = useState(initial?.step ?? 1);
  const [pickedAlert, setPickedAlertState] = useState<string | null>(initial?.pickedAlert ?? null);
  const [pickedDecision, setPickedDecisionState] = useState<DemoDecision | null>(
    initial?.pickedDecision ? (DECISIONS.find((d) => d.key === initial.pickedDecision) ?? null) : null
  );
  const [fromRoute] = useState<string | null>(() => readFromParam());

  // Intro flow — 3 auto-cycling story screens before the sandbox proper.
  // If the visitor has resume state (they've been here before mid-sandbox)
  // we skip the intro entirely and drop them back where they were.
  const [introIdx, setIntroIdx] = useState<number>(() => (initial ? INTRO_SCREENS.length : 0));
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState<boolean>(true);
  const inIntro = introIdx < INTRO_SCREENS.length;

  // Auto-advance the intro screens unless the user has interacted OR
  // prefers-reduced-motion. Each timer runs for AUTO_ADVANCE_MS then bumps
  // to the next intro screen. When we finish intro, the timer stops.
  useEffect(() => {
    if (!inIntro || !autoAdvanceEnabled) return;
    if (typeof window !== "undefined") {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return; // respect accessibility preference
    }
    const t = setTimeout(() => setIntroIdx((i) => i + 1), AUTO_ADVANCE_MS);
    return () => clearTimeout(t);
  }, [inIntro, introIdx, autoAdvanceEnabled]);

  const advanceIntro = useCallback(() => {
    setAutoAdvanceEnabled(false); // user engaged — stop auto-cycle
    setIntroIdx((i) => i + 1);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const skipIntro = useCallback(() => {
    setAutoAdvanceEnabled(false);
    setIntroIdx(INTRO_SCREENS.length);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Show a subtle "welcome back" banner for 4 seconds after a resume,
  // then auto-dismiss. Explains WHY they're not at Step 1.
  const [showResumeBanner, setShowResumeBanner] = useState<boolean>(initial !== null && (initial?.step ?? 1) > 1);

  useEffect(() => {
    if (showResumeBanner) {
      const t = setTimeout(() => setShowResumeBanner(false), 4500);
      return () => clearTimeout(t);
    }
  }, [showResumeBanner]);

  // Persist every state change (throttle unnecessary here — user actions
  // are already sparse).
  useEffect(() => {
    saveResumeState({ step, pickedAlert, pickedDecision: pickedDecision?.key ?? null });
  }, [step, pickedAlert, pickedDecision]);

  const goNext = useCallback(() => {
    setStep((s) => {
      // Alert-branching (C3): amber (scheduled) and low (task_queue) alerts
      // skip the crisis-diagnose + quick-entry crisis flow (Steps 3 + 4)
      // because there's nothing to diagnose — the action is pre-defined.
      // They land straight in Ask Ownology (Step 5) so the prospect still
      // sees the AI-conversation part of the story. Red alert follows the
      // full 7-step crisis flow.
      if (s === 2 && pickedAlert) {
        const res = ALERT_RESOLUTIONS[pickedAlert];
        if (res && res.branch !== "crisis") {
          return 5; // jump to Ask Ownology
        }
      }
      const next = Math.min(TOTAL_STEPS, s + 1);
      // If they hit the final step, clear resume state so a fresh visit
      // doesn't put them straight into the CTA screen.
      if (next === TOTAL_STEPS) clearResumeState();
      return next;
    });
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [pickedAlert]);

  const onPickDecision = useCallback((key: string) => {
    const found = DECISIONS.find((d) => d.key === key) ?? null;
    setPickedDecisionState(found);
  }, []);

  const setPickedAlert = useCallback((id: string) => setPickedAlertState(id), []);

  const handleRestart = useCallback(() => {
    clearResumeState();
    setStep(1);
    setPickedAlertState(null);
    setPickedDecisionState(null);
    setShowResumeBanner(false);
    setIntroIdx(0);
    setAutoAdvanceEnabled(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  // Replay the 3-page story intro WITHOUT clearing sandbox progress. The
  // intro overlays the whole page (see `inIntro` render branch); when the
  // visitor advances past the third screen, `introIdx` reaches
  // INTRO_SCREENS.length and they drop back into their sandbox at exactly
  // the step + picks they had. Non-destructive by design.
  const handleReplayIntro = useCallback(() => {
    setShowResumeBanner(false);
    setIntroIdx(0);
    setAutoAdvanceEnabled(true);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div style={{ minHeight: "100vh", background: BG }}>
      {/* Inline CSS for mobile-only overrides — inline-styles-only files
          can't express media queries without a <style> block. This is the
          minimum needed to unbreak <640px viewports (Lens 6 · Environment). */}
      <style>{`
        @media (max-width: 640px) {
          [data-testid^="try-step-"], [data-testid^="try-intro-"] { padding-left: 1rem !important; padding-right: 1rem !important; }
          [data-testid="try-sticky-cta"] { right: 0.6rem !important; bottom: 0.6rem !important; padding: 0.55rem 0.85rem !important; font-size: 0.75rem !important; }
          [data-testid="try-step-3-chemistry"] { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          [data-testid="try-step-3-chemistry"] table { min-width: 480px; }
          [data-testid="try-progress-bar"] > div > span:first-of-type + span { font-size: 0.62rem !important; letter-spacing: 0.06em !important; }
          .try-restart-btn { font-size: 0.65rem !important; }
        }
      `}</style>

      {/* Intro flow — 3 auto-cycling story screens. Once done, we render
          the sandbox proper below. */}
      {inIntro ? (
        <IntroScreenView
          screen={INTRO_SCREENS[introIdx]}
          index={introIdx}
          total={INTRO_SCREENS.length}
          onNext={advanceIntro}
          onSkipIntro={skipIntro}
        />
      ) : (
        <>
          <ProgressBar step={step} onRestart={handleRestart} onReplayIntro={handleReplayIntro} />

          {showResumeBanner && (
        <div
          data-testid="try-resume-banner"
          style={{
            position: "sticky",
            top: 56,
            zIndex: 39,
            background: "oklch(from var(--ow-amber) l c h / 0.14)",
            borderBottom: `1px solid ${BORDER}`,
            padding: "0.55rem 1rem",
            textAlign: "center",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.78rem",
            color: TEXT_MID,
          }}
        >
          Welcome back — resuming at <strong>Step {step}</strong>.{" "}
          <button
            type="button"
            onClick={handleRestart}
            data-testid="try-resume-restart"
            style={{ background: "none", border: "none", color: AMBER, cursor: "pointer", padding: 0, font: "inherit", textDecoration: "underline" }}
          >
            Start over instead
          </button>
        </div>
      )}

      {step === 1 && (
        <>
          {fromRoute && FROM_ROUTE_LABELS[fromRoute] && (
            <div
              data-testid="try-from-banner"
              style={{
                maxWidth: 720,
                margin: "1.5rem auto 0",
                padding: "0.85rem 1.15rem",
                background: "oklch(from var(--ow-amber) l c h / 0.14)",
                border: `1px solid ${AMBER}`,
                borderRadius: 4,
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.85rem",
                color: TEXT_HI,
                lineHeight: 1.55,
              }}
            >
              You reached for <strong>{FROM_ROUTE_LABELS[fromRoute]}</strong> —{" "}
              <code style={mono}>{fromRoute}</code>. That's members-only, but the sandbox below shows you exactly what
              it looks like end-to-end. Walk through the 7 steps, then reserve to unlock the real one for your winery.
            </div>
          )}
          <Step1Landing onNext={goNext} />
        </>
      )}
      {step === 2 && (
        <Step2Brief onNext={goNext} onPickAlert={setPickedAlert} pickedAlert={pickedAlert} />
      )}
      {step === 3 && (
        <Step3Diagnose onNext={goNext} onPickDecision={onPickDecision} pickedDecision={pickedDecision} />
      )}
      {step === 4 && <Step4Log onNext={goNext} />}
      {step === 5 && <Step5Ask onNext={goNext} />}
      {step === 6 && <Step6Journal onNext={goNext} />}
      {step === 7 && <Step7Close fromRoute={fromRoute} />}
        </>
      )}

      {/* Team-access password prompt — shared-secret wall for members
          and trusted testers before we ship full auth. Deliberately
          quiet: a small text link at the bottom of the page. When the
          visitor arrived via a MEMBER_ONLY_PREFIXES redirect (raw
          ?from=), the link is pre-expanded so they don't have to hunt
          for it. Everyone else gets the discreet collapsed version.
          Reads the raw ?from param — deliberately NOT coupled to
          FROM_ROUTE_LABELS (that filter is for the sales banner). */}
      <TeamAccessPrompt />

      <StickyCta />
    </div>
  );
}

/**
 * TeamAccessPrompt — inline password field for team members / trusted
 * testers. POSTs to /api/gate/verify; on success sets the ow_gate cookie
 * and redirects to `?from` (or home if no from param). Deliberately
 * small + text-only so it doesn't compete with the sales-funnel CTAs.
 *
 * Reads the raw `?from` URL param directly — NOT the FROM_ROUTE_LABELS
 * filter that the sales banner uses. Anyone hitting /try via the wall
 * (regardless of path) should see the pre-expanded password box.
 *
 * NOT a real auth mechanism — see server/gate.ts header. The tRPC
 * auth-scope audit (P0) is what actually protects data.
 */
function TeamAccessPrompt() {
  // Read raw ?from param — decoupled from FROM_ROUTE_LABELS so ANY
  // gated-page redirect pre-expands the box.
  const rawFrom = (() => {
    if (typeof window === "undefined") return null;
    try {
      const p = new URLSearchParams(window.location.search).get("from");
      // Only accept safe same-origin paths starting with /.
      if (p && p.startsWith("/") && !p.startsWith("//")) return p;
      return null;
    } catch {
      return null;
    }
  })();
  const [open, setOpen] = useState<boolean>(Boolean(rawFrom));
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "err" | "ok">("idle");
  const [errMsg, setErrMsg] = useState<string>("");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;
    setStatus("loading");
    setErrMsg("");
    try {
      const res = await fetch("/api/gate/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });
      const data: { ok: boolean; error?: string } = await res.json();
      if (res.ok && data.ok) {
        setStatus("ok");
        const dest = rawFrom && rawFrom.startsWith("/") ? rawFrom : "/";
        window.location.assign(dest);
        return;
      }
      setStatus("err");
      setErrMsg(data.error || "Wrong password.");
    } catch {
      setStatus("err");
      setErrMsg("Network error. Try again.");
    }
  }

  return (
    <div
      data-testid="try-team-access"
      style={{
        marginTop: "3rem",
        paddingTop: "1.4rem",
        borderTop: "1px dashed var(--ow-border)",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.78rem",
        color: "var(--ow-text-lo)",
        maxWidth: 560,
      }}
    >
      {!open ? (
        <button
          type="button"
          data-testid="try-team-access-toggle"
          onClick={() => setOpen(true)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ow-text-lo)",
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.76rem",
            padding: 0,
            cursor: "pointer",
            textDecoration: "underline dotted",
            textUnderlineOffset: 3,
          }}
        >
          Team member? Enter access password →
        </button>
      ) : (
        <form
          data-testid="try-team-access-form"
          onSubmit={submit}
          style={{ display: "flex", flexDirection: "column", gap: 8 }}
        >
          <p style={{ margin: 0, color: "var(--ow-text-mid)" }}>
            {rawFrom ? (
              <>
                You reached for <code style={{ background: "color-mix(in oklch, white 4%, transparent)", padding: "1px 6px", borderRadius: 3, fontSize: "0.75rem" }}>{rawFrom}</code>. Enter the team password to unlock.
              </>
            ) : (
              <>Enter the shared team password to unlock member pages.</>
            )}
          </p>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
            <input
              data-testid="try-team-access-input"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              style={{
                padding: "6px 10px",
                borderRadius: 4,
                border: "1px solid var(--ow-border)",
                background: "var(--ow-bg-card)",
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.85rem",
                minWidth: 180,
              }}
            />
            <button
              type="submit"
              data-testid="try-team-access-submit"
              disabled={status === "loading" || !password.trim()}
              style={{
                padding: "6px 14px",
                borderRadius: 4,
                border: "1px solid var(--ow-amber)",
                background: "var(--ow-amber)",
                color: "#111",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.8rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              {status === "loading" ? "Checking…" : "Unlock"}
            </button>
            <button
              type="button"
              data-testid="try-team-access-cancel"
              onClick={() => {
                setOpen(false);
                setPassword("");
                setStatus("idle");
                setErrMsg("");
              }}
              style={{
                background: "transparent",
                border: "none",
                color: "var(--ow-text-lo)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.76rem",
                cursor: "pointer",
                textDecoration: "underline dotted",
                textUnderlineOffset: 3,
              }}
            >
              Not me
            </button>
          </div>
          {status === "err" && errMsg && (
            <p data-testid="try-team-access-err" style={{ margin: 0, color: "#ef4444", fontFamily: "'Lato',sans-serif", fontSize: "0.75rem" }}>
              {errMsg}
            </p>
          )}
        </form>
      )}
    </div>
  );
}
