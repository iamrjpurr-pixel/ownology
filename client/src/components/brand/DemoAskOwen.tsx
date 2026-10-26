import { useEffect, useState } from "react";
import { AnswerMarkdown } from "@/components/AnswerMarkdown";
import { Link } from "wouter";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { trpc } from "@/lib/trpc";
import { OwenDisclaimer } from "@/components/OwenDisclaimer";

const EMAIL_KEY = "ow_demo_email";
const SAMPLES = [
  "Free SO₂ dropped from 28 to 14 mg/L in a Pinot barrel after MLF. How much do I add?",
  "Shiraz ferment stuck at 2 Baumé, 31°C on the cap. What should I check first?",
  "When should I rack a Chardonnay off gross lees after barrel ferment?",
];

export function DemoAskOwen({ invite }: { invite?: string }) {
  const [email, setEmail] = useState(() => (typeof window !== "undefined" ? localStorage.getItem(EMAIL_KEY) ?? "" : ""));
  const [started, setStarted] = useState<number | null>(null);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<{ q: string; a: string; sources: string[] } | null>(null);
  const [error, setError] = useState("");
  const start = trpc.demo.askOwenStart.useMutation();
  const ask = trpc.demo.askOwen.useMutation();
  const who = invite ? { invite } : { email };

  useEffect(() => {
    if (!invite) return;
    start.mutateAsync({ invite }).then((r) => setStarted(r.remaining ?? 0)).catch(() => setStarted(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invite]);

  const onStart = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const r = await start.mutateAsync({ email });
      localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
      setStarted(r.remaining ?? 0);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const onAsk = async (q: string) => {
    if (!q.trim()) return;
    setError("");
    try {
      const r = await ask.mutateAsync({ ...who, question: q.trim() });
      setAnswer({ q: q.trim(), a: r.answer, sources: r.sopTitles });
      setStarted(r.remaining);
      setQuestion("");
    } catch (err) {
      setError((err as Error).message);
    }
  };

  return (
    <div className="rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-6 md:p-8" data-testid="demo-ask-owen">
      <div className="flex items-center gap-2 text-[var(--ow-amber)]"><Sparkles className="h-4 w-4" /><span className="text-xs font-semibold uppercase tracking-[0.14em]">Ask Owen · 3 free questions</span></div>
      <h3 className="mt-3 font-['Fraunces',serif] text-2xl text-[var(--ow-text-hi)] md:text-3xl">Ask a real cellar question.</h3>
      <p className="mt-2 max-w-2xl text-sm text-[var(--ow-text-mid)]">Owen answers from Ownology's winemaking SOP library, written for working winemakers. {invite ? "Your three questions are ready." : "Enter your email to unlock three questions."}</p>

      {started === null ? (
        <form onSubmit={onStart} className="mt-6 flex max-w-lg flex-col gap-2 sm:flex-row">
          <Input type="email" required placeholder="you@winery.com" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="demo-ask-email-input" />
          <Button type="submit" disabled={start.isPending} data-testid="demo-ask-start-button">{start.isPending ? "Unlocking…" : "Unlock 3 questions"}</Button>
        </form>
      ) : (
        <div className="mt-6 space-y-4">
          <div className="text-sm text-[var(--ow-text-mid)]" data-testid="demo-ask-remaining">
            <strong className="text-[var(--ow-text-hi)]">{started}</strong> of 3 questions left
          </div>
          {started > 0 ? (
            <>
              <div className="flex flex-wrap gap-2">
                {SAMPLES.map((s, i) => (
                  <button key={i} type="button" onClick={() => setQuestion(s)} data-testid={`demo-ask-sample-${i}`}
                    className="rounded-full border border-[var(--ow-border-md)] px-3 py-1.5 text-left text-xs text-[var(--ow-text-mid)] transition-colors duration-150 hover:border-[var(--ow-amber)] hover:text-[var(--ow-text-hi)]">{s}</button>
                ))}
              </div>
              <form onSubmit={(e) => { e.preventDefault(); onAsk(question); }} className="flex flex-col gap-2 sm:flex-row">
                <Input maxLength={600} placeholder="Type your question…" value={question} onChange={(e) => setQuestion(e.target.value)} data-testid="demo-ask-question-input" />
                <Button type="submit" disabled={ask.isPending || question.trim().length < 3} data-testid="demo-ask-submit-button">{ask.isPending ? "Owen is thinking…" : "Ask Owen"}</Button>
              </form>
            </>
          ) : (
            <div className="rounded-md border border-[var(--ow-amber)] p-4 text-sm text-[var(--ow-text-mid)]" data-testid="demo-ask-limit-reached">
              That's your three free questions. <Link href="/pricing?from=demo-tour" className="font-semibold text-[var(--ow-amber)] underline">See membership options</Link> for unlimited Owen.
            </div>
          )}
        </div>
      )}

      {error && <p className="mt-4 text-sm text-red-600" data-testid="demo-ask-error">{error}</p>}

      {answer && (
        <div className="mt-6 border-t border-[var(--ow-border)] pt-6" data-testid="demo-ask-answer">
          <p className="text-sm font-semibold text-[var(--ow-text-hi)]">{answer.q}</p>
          <div className="prose prose-sm mt-3 max-w-none text-[var(--ow-text-hi)] prose-headings:text-[var(--ow-text-hi)] prose-strong:text-[var(--ow-text-hi)]">
            <AnswerMarkdown>{answer.a}</AnswerMarkdown>
          </div>
          {answer.sources.length > 0 && <p className="mt-3 text-xs text-[var(--ow-text-lo)]">Grounded in: {answer.sources.join(" · ")}</p>}
          <div className="mt-4"><OwenDisclaimer /></div>
        </div>
      )}
    </div>
  );
}
