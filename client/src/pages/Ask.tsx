/**
 * /ask — the public Ownology SEO flywheel.
 *
 * Any visitor (no signup) can ask a winemaking question. Owen answers from
 * the bible-RAG corpus (published technical references curated privately).
 * answer is auto-saved as a permanent `/cellar-journal/:slug` page with
 * Trinity dedupe clustering (see server/cellarJournalRouter.ts), so the
 * long tail of winemaking questions compounds into indexable pages over
 * time. Anonymous callers are rate-limited to 5 questions/hour/IP at the
 * tRPC layer (see server/routers/tutor.ts::checkPublicAskRate).
 *
 * SEO priorities:
 *   - Public route (in PUBLIC_EXACT allowlist)
 *   - Descriptive H1 + intro paragraph indexable by Google
 *   - Every answer produces a canonical journal URL surfaced in-page as
 *     a permanent link, which the sitemap picks up on the next crawl.
 */
import React from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trpc } from "@/lib/trpc";
import { Sparkles, BookOpen, ArrowRight, AlertTriangle } from "lucide-react";
import { OwenDisclaimer } from "@/components/OwenDisclaimer";

// Sample prompts to seed curiosity + kickstart the flywheel with high-value
// topics for both the LLM (they hit rich chapters) and SEO (long-tail keywords).
const SAMPLE_QUESTIONS: Array<{ q: string; topic: string }> = [
  { q: "My fermentation has stopped moving. What do I do?", topic: "Stuck ferment" },
  { q: "How much potassium metabisulphite for a 23L batch of white?", topic: "SO₂ dosing" },
  { q: "When should I rack off the gross lees?", topic: "Racking timing" },
  { q: "What does H2S smell like and how do I fix it?", topic: "Faults" },
  { q: "How do I know when MLF is complete?", topic: "Malolactic" },
  { q: "My wine tastes too acidic — can I fix it?", topic: "Acid adjustment" },
];

export default function Ask() {
  const [question, setQuestion] = React.useState("");
  const [submitted, setSubmitted] = React.useState<string | null>(null);
  const askMutation = trpc.tutor.ask.useMutation();

  const submit = (q: string) => {
    const cleaned = q.trim();
    if (cleaned.length < 5) return;
    setSubmitted(cleaned);
    askMutation.mutate({ question: cleaned, mode: "home_winemaker" });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submit(question);
  };

  const onSample = (q: string) => {
    setQuestion(q);
    submit(q);
    // Scroll to answer area for mobile flow
    if (typeof window !== "undefined") {
      setTimeout(() => window.scrollTo({ top: 300, behavior: "smooth" }), 100);
    }
  };

  // Type-narrowed result — tutor.ask returns { journalSlug?, journalIsNew?, ... }
  // Only home_winemaker mode returns the slug; commercial mode does not.
  const result = askMutation.data as
    | {
        answer: string;
        sopTitles: string[];
        disclaimer: string;
        riskLevel?: string;
        journalSlug?: string | null;
        journalIsNew?: boolean;
      }
    | undefined;

  const rateLimited = askMutation.error?.data?.code === "TOO_MANY_REQUESTS";

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg)" }}>
      <Helmet>
        <title>Ask Ownology — free winemaking answers, cited from the bibles.</title>
        <meta
          name="description"
          content="Ask any winemaking question — fermentation, SO₂, MLF, faults, racking, acid, oak. Owen answers from grounded industry references — the technical libraries boutique winemakers actually use. Free. No signup. Every answer becomes a permanent Cellar Journal entry."
        />
        <link rel="canonical" href="https://ownology.ai/ask" />
        <meta property="og:title" content="Ask Ownology — free winemaking answers" />
        <meta
          property="og:description"
          content="Any winemaking question, answered by Owen from real oenology references. Free, no signup, every answer indexed forever."
        />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://ownology.ai/ask" />
      </Helmet>

      <section className="px-6 md:px-12 pt-14 pb-16 max-w-3xl mx-auto">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100"
          data-testid="ask-back"
        >
          ← Back to Ownology
        </Link>

        <div
          className="mt-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em]"
          style={{ color: "var(--ow-amber, #b8924a)" }}
        >
          <Sparkles className="w-4 h-4" /> Ask Owen · Free · No signup
        </div>

        <h1
          className="font-serif italic text-5xl md:text-6xl leading-[0.98] mt-4 tracking-tight"
          data-testid="ask-h1"
          style={{ color: "var(--ow-text-hi)" }}
        >
          Any winemaking<br />question. Answered.
        </h1>

        <p className="mt-6 text-lg md:text-xl leading-relaxed opacity-80">
          Owen — Ownology&apos;s AI cellar-hand — is grounded in the technical
          references boutique winemakers actually use, distilled into an
          instantly answerable form. Every answer is saved forever as a
          permanent{" "}
          <Link
            href="/cellar-journal"
            className="underline decoration-dotted underline-offset-4"
            style={{ textDecorationColor: "var(--ow-amber)" }}
          >
            Cellar Journal
          </Link>{" "}
          entry.
        </p>

        {/* ── Question box ────────────────────────────────────────────── */}
        <form onSubmit={onSubmit} className="mt-10" data-testid="ask-form">
          <label
            htmlFor="ask-question"
            className="block font-mono text-[11px] uppercase tracking-[0.22em] opacity-70 mb-3"
          >
            Ask Owen
          </label>
          <textarea
            id="ask-question"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="e.g. My Shiraz has been stuck at 8 Brix for 3 days — YAN was 148 at inoculation, tank hit 26°C yesterday. What do I do?"
            rows={5}
            maxLength={500}
            data-testid="ask-input"
            className="w-full px-5 py-4 rounded-lg bg-transparent border-2 focus:outline-none focus:ring-2 focus:ring-offset-0 resize-vertical"
            style={{
              borderColor: "var(--ow-border, rgba(255,255,255,0.2))",
              color: "var(--ow-text-hi)",
              fontFamily: "'Lato', sans-serif",
              fontSize: "1rem",
              lineHeight: 1.55,
              minHeight: "140px",
            }}
          />
          <div className="mt-3 flex items-center justify-between gap-4 flex-wrap">
            <p className="text-xs opacity-60" style={{ fontFamily: "'Lato', sans-serif" }}>
              {question.length}/500 · Free tier: 5 questions/hour
            </p>
            <button
              type="submit"
              disabled={askMutation.isPending || question.trim().length < 5}
              data-testid="ask-submit"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full font-mono text-xs uppercase tracking-[0.18em] transition-opacity disabled:opacity-40"
              style={{
                background: "var(--ow-amber)",
                color: "var(--ow-bg)",
                fontWeight: 700,
              }}
            >
              {askMutation.isPending ? (
                <>Owen is reading…</>
              ) : (
                <>
                  Ask Owen <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* ── Sample prompts (shown only pre-submit) ───────────────────── */}
        {!submitted && (
          <div className="mt-10" data-testid="ask-samples">
            <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-60 mb-3">
              Or try one of these
            </p>
            <div className="flex flex-wrap gap-2">
              {SAMPLE_QUESTIONS.map((s) => (
                <button
                  key={s.q}
                  type="button"
                  onClick={() => onSample(s.q)}
                  data-testid={`ask-sample-${s.topic.toLowerCase().replace(/\s+/g, "-")}`}
                  className="text-sm px-4 py-2 rounded-full border transition-opacity hover:opacity-100 opacity-80"
                  style={{
                    borderColor: "var(--ow-border, rgba(255,255,255,0.18))",
                    background: "transparent",
                    color: "var(--ow-text-mid, var(--ow-text-hi))",
                    fontFamily: "'Lato', sans-serif",
                  }}
                >
                  {s.q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Rate-limit error ─────────────────────────────────────────── */}
        {rateLimited && (
          <div
            className="mt-10 p-5 rounded-lg border-l-4"
            data-testid="ask-rate-limited"
            style={{
              borderColor: "var(--ow-amber)",
              background: "oklch(from var(--ow-amber) l c h / 0.08)",
            }}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className="w-5 h-5 mt-0.5 flex-shrink-0"
                style={{ color: "var(--ow-amber)" }}
              />
              <div>
                <p className="font-serif italic text-lg" style={{ color: "var(--ow-text-hi)" }}>
                  You&apos;ve used your 5 free questions this hour.
                </p>
                <p className="mt-2 text-sm opacity-80" style={{ fontFamily: "'Lato', sans-serif" }}>
                  {askMutation.error?.message}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  <Link
                    href="/pricing"
                    data-testid="ask-rate-cta-pricing"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-[0.18em]"
                    style={{
                      background: "var(--ow-amber)",
                      color: "var(--ow-bg)",
                      fontWeight: 700,
                    }}
                  >
                    See pricing <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/cellar-journal"
                    data-testid="ask-rate-cta-journal"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-[0.18em] border"
                    style={{
                      borderColor: "var(--ow-border)",
                      color: "var(--ow-text-hi)",
                    }}
                  >
                    Browse the Cellar Journal
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Other errors ─────────────────────────────────────────────── */}
        {askMutation.isError && !rateLimited && (
          <div
            className="mt-10 p-4 rounded-lg border"
            data-testid="ask-error"
            style={{
              borderColor: "oklch(0.62 0.20 25)",
              color: "oklch(0.72 0.18 25)",
            }}
          >
            <p className="text-sm">
              Owen couldn&apos;t answer that one — {askMutation.error?.message}. Try again in a moment.
            </p>
          </div>
        )}

        {/* ── Answer ───────────────────────────────────────────────────── */}
        {result && !rateLimited && (
          <div className="mt-12" data-testid="ask-answer">
            <div
              className="pb-2 mb-6 border-b flex items-center justify-between gap-3 flex-wrap"
              style={{ borderColor: "var(--ow-border)" }}
            >
              <div className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--ow-amber)" }}>
                <BookOpen className="w-4 h-4" /> Owen answered
              </div>
              {result.riskLevel === "high" && (
                <span
                  data-testid="ask-risk-badge"
                  className="text-[10px] font-mono uppercase tracking-[0.18em] px-2 py-1 rounded"
                  style={{
                    background: "oklch(0.62 0.20 25 / 0.15)",
                    color: "oklch(0.72 0.18 25)",
                  }}
                >
                  High-risk topic
                </span>
              )}
            </div>

            <p className="font-serif italic text-lg opacity-70 mb-4" style={{ color: "var(--ow-text-mid, var(--ow-text-hi))" }}>
              &ldquo;{submitted}&rdquo;
            </p>

            <div
              className="prose max-w-none"
              data-testid="ask-answer-body"
              style={{
                color: "var(--ow-text-hi)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "1.02rem",
                lineHeight: 1.7,
              }}
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.answer}</ReactMarkdown>
            </div>

            {result.sopTitles && result.sopTitles.length > 0 && (
              <div className="mt-8" data-testid="ask-sources">
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-60 mb-2">
                  Cited from
                </p>
                <ul className="space-y-1 text-sm opacity-80">
                  {result.sopTitles.map((t, i) => (
                    <li key={i}>· {t}</li>
                  ))}
                </ul>
              </div>
            )}

            {result.disclaimer && (
              <p
                className="mt-6 text-xs italic opacity-60"
                data-testid="ask-disclaimer"
                style={{ fontFamily: "'Lato', sans-serif" }}
              >
                {result.disclaimer}
              </p>
            )}

            {/* DESIGN_RULES.md Rule 3 — mandatory Owen disclosure on every answer. */}
            <OwenDisclaimer testid="ask-owen-disclaimer" />

            {/* ── SEO flywheel payoff — permanent journal link ─────────── */}
            {result.journalSlug && (
              <div
                className="mt-10 p-5 rounded-lg"
                data-testid="ask-journal-link"
                style={{
                  background: "var(--ow-card-bg, rgba(255,255,255,0.03))",
                  border: "1px solid var(--ow-border)",
                }}
              >
                <p className="font-mono text-[11px] uppercase tracking-[0.22em] opacity-60 mb-2">
                  Saved forever
                </p>
                <p className="text-sm opacity-90" style={{ fontFamily: "'Lato', sans-serif" }}>
                  {result.journalIsNew
                    ? "This answer just became a permanent Cellar Journal entry. Bookmark or share the canonical link:"
                    : "This question has been asked before — Owen folded yours into the canonical entry:"}
                </p>
                <Link
                  href={`/cellar-journal/${result.journalSlug}`}
                  data-testid="ask-journal-permalink"
                  className="inline-flex items-center gap-2 mt-3 text-sm font-mono underline decoration-dotted underline-offset-4"
                  style={{
                    color: "var(--ow-amber)",
                    textDecorationColor: "var(--ow-amber)",
                  }}
                >
                  /cellar-journal/{result.journalSlug} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            )}

            {/* ── CTA: ask another / reserve ──────────────────────────── */}
            <div className="mt-10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => {
                  setSubmitted(null);
                  setQuestion("");
                  askMutation.reset();
                  if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                data-testid="ask-again"
                className="px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-[0.18em]"
                style={{
                  background: "var(--ow-amber)",
                  color: "var(--ow-bg)",
                  fontWeight: 700,
                }}
              >
                Ask another
              </button>
              <Link
                href="/try"
                data-testid="ask-cta-try"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full font-mono text-xs uppercase tracking-[0.18em] border"
                style={{
                  borderColor: "var(--ow-border)",
                  color: "var(--ow-text-hi)",
                }}
              >
                See Ownology in action <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}

        {/* ── Footer link back to journal ─────────────────────────────── */}
        <div className="mt-16 pt-8 border-t" style={{ borderColor: "var(--ow-border)" }}>
          <p
            data-testid="ask-strapline"
            className="text-center mb-6"
            style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: "italic",
              fontSize: "1.1rem",
              color: "var(--ow-amber)",
              letterSpacing: "0.01em",
              lineHeight: 1.4,
            }}
          >
            You are the must. Ownology is the ferment.
          </p>
          <p className="text-sm opacity-70" style={{ fontFamily: "'Lato', sans-serif" }}>
            Every answer here compounds into a searchable library. Browse the{" "}
            <Link
              href="/cellar-journal"
              className="underline decoration-dotted underline-offset-4"
              style={{ textDecorationColor: "var(--ow-amber)", color: "var(--ow-amber)" }}
              data-testid="ask-footer-journal-link"
            >
              full Cellar Journal
            </Link>{" "}
            — hundreds of cellar-floor questions, all cited from the bibles.
          </p>
        </div>
      </section>
    </div>
  );
}
