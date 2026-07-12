/**
 * ComplianceScore — SEO lead-gen tool.
 *
 * Public page at /compliance-score. Winemakers searching "winery
 * compliance checklist" land here. Answers 8 yes/partial/no questions,
 * gets a live score with band (green/amber/red), can capture email to
 * unlock a mailed follow-up + call booking.
 *
 * Design lens: this is a marketing surface for cold traffic. Copy is
 * winemaker-native (per §7 of INDUCTION_STYLE_GUIDE.md — no textbook
 * jargon). SEO meta set via Helmet-equivalent (index.html swap not
 * needed here because /compliance-score is a public route already, and
 * per-route meta injection can be added later if we want share-card
 * treatment).
 */
import { useState, useMemo } from "react";
import { Link } from "wouter";
import { CheckCircle2, AlertTriangle, XCircle, ArrowRight } from "lucide-react";
import { trpc } from "@/lib/trpc";

type Answer = "yes" | "partial" | "no";
type Q = { id: string; short: string; text: string; hint: string };

// 8-question audit-readiness checklist — mapped to Wine Australia LIP
// + FSANZ + AWRI. Ordered easiest → hardest so respondents don't bounce.
const QUESTIONS: Q[] = [
  { id: "batch-id",     short: "Batch IDs",       text: "Do you track vintage, variety, and Geographical Indication (GI) for every batch?", hint: "Wine Australia LIP requires vintage, variety, and GI on every batch record." },
  { id: "additions",    short: "Additions log",   text: "Do you record every addition — SO₂, DAP, nutrients, fining agents — with quantity and date?", hint: "Regulator-ready records mean date, amount, tank, and operator for every addition." },
  { id: "so2",          short: "SO₂ tracking",    text: "Are SO₂ readings logged at inoculation, mid-ferment, post-MLF, and pre-bottling?", hint: "The four-point SO₂ record is what AWRI recommends for defensible fault diagnosis." },
  { id: "sanitation",   short: "Sanitation SOPs", text: "Do you have written SOPs for cellar cleaning and sanitation, followed by everyone?", hint: "Written SOPs — not just tribal knowledge — are the difference between passing and failing an audit." },
  { id: "grower",       short: "Grower records",  text: "Do you keep grower/supplier contact details linked to fruit intake records?", hint: "LIP requires the grower name and address to appear alongside every intake." },
  { id: "labels",       short: "Label review",    text: "Are your labels checked against Wine Australia LIP requirements before print?", hint: "Label recall due to non-compliance is one of the top three enforcement actions each year." },
  { id: "bottling",     short: "Bottling log",    text: "Do you keep a bottling log with lot numbers, volumes, and dates?", hint: "Lot numbers link finished goods back to batch records — required for recall traceability." },
  { id: "audit-trail",  short: "Audit trail",     text: "Can you produce a complete audit trail for a specific batch within 24 hours?", hint: "The single hardest test. If yes → you're LIP-ready. If no → gaps exist somewhere in the chain." },
];

const SCORE_WEIGHT: Record<Answer, number> = { yes: 100 / 8, partial: 50 / 8, no: 0 };

function bandForScore(score: number): { band: "green" | "amber" | "red"; label: string; color: string; message: string } {
  if (score >= 80) return { band: "green", label: "Audit-ready", color: "#4a7c47", message: "You're in strong shape. A regulator visit tomorrow would find a coherent record chain. The remaining ground is refinement, not remediation." };
  if (score >= 50) return { band: "amber", label: "Getting there", color: "#b57e14", message: "The bones are here but the record chain has gaps. Under a 24-hour audit deadline, some things would be reconstructed on the fly. Worth closing the gaps before you have to." };
  return { band: "red", label: "Significant gaps", color: "#b91c1c", message: "You're carrying risk. In the event of a recall, a label complaint, or a routine LIP audit, missing records could cost you time, money, or product. Not unusual for boutique wineries — but not a place to stay." };
}

export default function ComplianceScore() {
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [wineryName, setWineryName] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = trpc.leads.complianceScore.useMutation({ onSuccess: () => setSubmitted(true) });

  const answered = Object.keys(answers).length;
  const score = useMemo(() => {
    let s = 0;
    for (const a of Object.values(answers)) s += SCORE_WEIGHT[a];
    return Math.round(s);
  }, [answers]);
  const complete = answered === QUESTIONS.length;
  const band = complete ? bandForScore(score) : null;

  return (
    <div
      data-testid="compliance-score"
      style={{
        maxWidth: 720,
        margin: "0 auto",
        padding: "2.5rem 1.25rem 4rem",
        color: "var(--ow-text-hi, #1a1210)",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <div style={{ fontFamily: "'Fraunces', serif", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#B0741A", fontWeight: 700 }}>
        Ownology · Free tool
      </div>
      <h1
        style={{
          margin: "0.6rem 0 0.75rem",
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "clamp(2rem, 5vw, 2.6rem)",
          fontWeight: 600,
          letterSpacing: "-0.015em",
          lineHeight: 1.1,
        }}
      >
        Winery compliance checklist
      </h1>
      <p style={{ margin: "0 0 2rem", color: "var(--ow-text-mid, rgba(0,0,0,0.65))", fontSize: "1rem", lineHeight: 1.55, maxWidth: "60ch" }}>
        Eight questions. Two minutes. A straight answer on whether you&apos;d pass a Wine Australia LIP audit tomorrow — and where the gaps are if you wouldn&apos;t.
      </p>

      {/* Question list */}
      <div style={{ display: "grid", gap: "1rem" }}>
        {QUESTIONS.map((q, i) => (
          <QuestionCard
            key={q.id}
            index={i + 1}
            q={q}
            answer={answers[q.id]}
            onChange={(a) => setAnswers({ ...answers, [q.id]: a })}
          />
        ))}
      </div>

      {/* Live score */}
      {answered > 0 && (
        <div
          data-testid="compliance-score-live"
          style={{
            marginTop: "2rem",
            padding: "1.25rem 1.5rem",
            borderRadius: "0.6rem",
            background: band ? `${band.color}14` : "rgba(0,0,0,0.03)",
            border: `1px solid ${band ? band.color + "55" : "rgba(0,0,0,0.1)"}`,
          }}
        >
          <div style={{ fontSize: "0.72rem", letterSpacing: "0.1em", textTransform: "uppercase", color: band?.color ?? "#B0741A", fontWeight: 700 }}>
            {complete ? band?.label : `Answered ${answered} / ${QUESTIONS.length}`}
          </div>
          <div style={{ marginTop: "0.5rem", fontFamily: "'Fraunces', serif", fontSize: "2.2rem", fontWeight: 600, color: band?.color ?? "#1a1210" }}>
            {complete ? `${score}/100` : `${score} / 100 so far`}
          </div>
          {band && (
            <p style={{ margin: "0.75rem 0 0", color: "var(--ow-text-mid, rgba(0,0,0,0.7))", fontSize: "0.9rem", lineHeight: 1.55 }}>
              {band.message}
            </p>
          )}
        </div>
      )}

      {/* Email capture — appears once all 8 questions answered */}
      {complete && !submitted && (
        <div
          data-testid="compliance-score-capture"
          style={{
            marginTop: "2rem",
            padding: "1.5rem 1.6rem",
            borderRadius: "0.6rem",
            background: "rgba(176,116,26,0.06)",
            border: "1px solid rgba(176,116,26,0.35)",
          }}
        >
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.1rem", fontWeight: 600, marginBottom: "0.4rem" }}>
            Get the full write-up
          </div>
          <p style={{ margin: "0 0 1rem", color: "var(--ow-text-mid, rgba(0,0,0,0.7))", fontSize: "0.9rem", lineHeight: 1.55 }}>
            We&apos;ll email you a plain-English breakdown of where your gaps are, what to fix first, and how Ownology closes each one. No spam. Unsubscribe anytime.
          </p>
          <input
            type="email"
            placeholder="your@winery.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="compliance-score-email"
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="compliance-score-name"
            style={inputStyle}
          />
          <input
            type="text"
            placeholder="Winery name (optional)"
            value={wineryName}
            onChange={(e) => setWineryName(e.target.value)}
            data-testid="compliance-score-winery"
            style={inputStyle}
          />
          {submit.error && (
            <div style={{ color: "#b91c1c", fontSize: "0.8rem", marginBottom: "0.6rem" }}>
              {submit.error.message}
            </div>
          )}
          <button
            type="button"
            disabled={!email.includes("@") || submit.isPending}
            onClick={() =>
              submit.mutate({
                email,
                name: name || undefined,
                wineryName: wineryName || undefined,
                score,
                answers,
              })
            }
            data-testid="compliance-score-submit"
            style={{
              width: "100%",
              padding: "0.85rem 1rem",
              borderRadius: 999,
              background: "#B0741A",
              color: "#2A1E0A",
              border: "none",
              fontFamily: "inherit",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: submit.isPending || !email.includes("@") ? "not-allowed" : "pointer",
              opacity: submit.isPending || !email.includes("@") ? 0.6 : 1,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "0.4rem",
            }}
          >
            {submit.isPending ? "Sending…" : "Send me the write-up"} <ArrowRight size={15} strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* Post-submit thank-you */}
      {submitted && (
        <div
          data-testid="compliance-score-thanks"
          style={{
            marginTop: "2rem",
            padding: "1.5rem 1.6rem",
            borderRadius: "0.6rem",
            background: "rgba(74,124,71,0.08)",
            border: "1px solid rgba(74,124,71,0.4)",
          }}
        >
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.2rem", fontWeight: 600, color: "#4a7c47" }}>
            On its way.
          </div>
          <p style={{ margin: "0.5rem 0 1rem", color: "var(--ow-text-mid, rgba(0,0,0,0.7))", fontSize: "0.9rem", lineHeight: 1.55 }}>
            Check your inbox in the next few minutes. If you&apos;d rather have a 15-min call to walk through the gaps, book direct:
          </p>
          <Link
            href="/founding-partners"
            data-testid="compliance-score-cta-book"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
              padding: "0.7rem 1.2rem",
              borderRadius: 999,
              background: "#1a1210",
              color: "#fff",
              textDecoration: "none",
              fontSize: "0.85rem",
              fontWeight: 600,
            }}
          >
            Talk to Rich <ArrowRight size={14} strokeWidth={2.2} />
          </Link>
        </div>
      )}

      {/* Trust footer */}
      <p style={{ marginTop: "2.5rem", fontSize: "0.75rem", color: "var(--ow-text-mid, rgba(0,0,0,0.5))", lineHeight: 1.5, maxWidth: "60ch" }}>
        This checklist maps to Wine Australia&apos;s Label Integrity Programme (Wine Australia Act 2013 s.39F), FSANZ Standard 4.5.1, and AWRI record-keeping guidelines. Not a substitute for a licensed compliance consultant.
      </p>
    </div>
  );
}

function QuestionCard({ index, q, answer, onChange }: { index: number; q: Q; answer: Answer | undefined; onChange: (a: Answer) => void }) {
  return (
    <div
      data-testid={`compliance-score-q-${q.id}`}
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "0.6rem",
        border: answer ? "1px solid rgba(0,0,0,0.15)" : "1px dashed rgba(0,0,0,0.2)",
        background: answer ? "rgba(0,0,0,0.02)" : "transparent",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", gap: "0.7rem" }}>
        <div
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.72rem",
            fontWeight: 700,
            color: "#B0741A",
            paddingTop: "0.15rem",
            minWidth: 24,
          }}
        >
          {String(index).padStart(2, "0")}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: "0.95rem", fontWeight: 500, color: "var(--ow-text-hi, #1a1210)", lineHeight: 1.4 }}>
            {q.text}
          </div>
          <div style={{ marginTop: "0.35rem", fontSize: "0.78rem", color: "var(--ow-text-mid, rgba(0,0,0,0.55))", lineHeight: 1.5 }}>
            {q.hint}
          </div>
          <div style={{ marginTop: "0.75rem", display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <AnswerButton current={answer} value="yes" label="Yes" icon={<CheckCircle2 size={13} strokeWidth={2.4} />} color="#4a7c47" onClick={() => onChange("yes")} testid={`compliance-score-q-${q.id}-yes`} />
            <AnswerButton current={answer} value="partial" label="Partial" icon={<AlertTriangle size={13} strokeWidth={2.4} />} color="#b57e14" onClick={() => onChange("partial")} testid={`compliance-score-q-${q.id}-partial`} />
            <AnswerButton current={answer} value="no" label="No" icon={<XCircle size={13} strokeWidth={2.4} />} color="#b91c1c" onClick={() => onChange("no")} testid={`compliance-score-q-${q.id}-no`} />
          </div>
        </div>
      </div>
    </div>
  );
}

function AnswerButton({ current, value, label, icon, color, onClick, testid }: { current: Answer | undefined; value: Answer; label: string; icon: React.ReactNode; color: string; onClick: () => void; testid: string }) {
  const active = current === value;
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testid}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.35rem",
        padding: "0.4rem 0.85rem",
        borderRadius: 999,
        border: active ? `1px solid ${color}` : "1px solid rgba(0,0,0,0.15)",
        background: active ? `${color}14` : "#fff",
        color: active ? color : "var(--ow-text-mid, rgba(0,0,0,0.6))",
        fontFamily: "inherit",
        fontSize: "0.78rem",
        fontWeight: active ? 700 : 500,
        cursor: "pointer",
        transition: "all 0.15s",
      }}
    >
      {icon} {label}
    </button>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.7rem 0.9rem",
  borderRadius: "0.4rem",
  border: "1px solid rgba(0,0,0,0.15)",
  fontFamily: "inherit",
  fontSize: "0.9rem",
  marginBottom: "0.6rem",
  background: "#fff",
  color: "var(--ow-text-hi, #1a1210)",
};
