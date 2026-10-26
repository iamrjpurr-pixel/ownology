import { useEffect, useState } from "react";
import { Link } from "wouter";
import { Helmet } from "react-helmet";
import { ArrowRight, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import { sessionId } from "@/lib/track";
import { SURVEY, ANSWER_LABEL, type SurveyAnswer } from "@/components/survey/surveyData";

const eyebrow = "text-xs font-semibold uppercase tracking-[0.16em] text-[var(--ow-amber)]";
const ANSWERS: SurveyAnswer[] = ["yes", "unsure", "no"];

function HelpCard({ i, answer }: { i: number; answer: SurveyAnswer }) {
  const s = SURVEY[i];
  return (
    <div className="mt-6 rounded-lg border border-[var(--ow-amber)] bg-[color-mix(in_oklch,var(--ow-amber)_7%,transparent)] p-5" data-testid={`survey-help-${s.id}`}>
      <p className="text-sm font-semibold text-[var(--ow-text-hi)]">{answer === "yes" ? s.yes : s.notYet}</p>
      <p className="mt-2 text-sm leading-relaxed text-[var(--ow-text-mid)]">{s.help}</p>
      <a href={s.cta.href} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--ow-amber)] underline underline-offset-4" data-testid={`survey-cta-${s.id}`}>
        {s.cta.label} <ArrowRight className="h-3.5 w-3.5" />
      </a>
    </div>
  );
}

function Summary({ answers, name }: { answers: Record<string, SurveyAnswer>; name?: string }) {
  const gaps = SURVEY.filter((s) => answers[s.id] && answers[s.id] !== "yes").length;
  return (
    <section data-testid="survey-summary">
      <div className={eyebrow}>All done</div>
      <h2 className="mt-3 font-['Fraunces',serif] text-3xl text-[var(--ow-text-hi)] md:text-4xl">Thanks{name ? `, ${name}` : ""}. Here's where Ownology fits.</h2>
      <p className="mt-3 text-sm text-[var(--ow-text-mid)]">
        {gaps ? `${gaps} of ${SURVEY.length} are worth a closer look. Each one links straight to the part of the site that helps.` : "You've got it all covered. Here's how Ownology keeps it that way with less effort."}
      </p>
      <ol className="mt-8 space-y-3">
        {SURVEY.map((s) => (
          <li key={s.id} className="rounded-lg border border-[var(--ow-border)] bg-[var(--ow-bg-card)] p-4">
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm text-[var(--ow-text-hi)]">{s.q}</p>
              <span className={`shrink-0 rounded px-2 py-0.5 text-[0.65rem] font-bold uppercase tracking-wider ${answers[s.id] === "yes" ? "bg-emerald-600/10 text-emerald-700" : "bg-[color-mix(in_oklch,var(--ow-amber)_15%,transparent)] text-[var(--ow-amber)]"}`}>
                {answers[s.id] ? ANSWER_LABEL[answers[s.id]] : "Skipped"}
              </span>
            </div>
            <a href={s.cta.href} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-[var(--ow-amber)] underline underline-offset-4">{s.cta.label} <ArrowRight className="h-3 w-3" /></a>
          </li>
        ))}
      </ol>
      <div className="mt-10 flex flex-wrap gap-3">
        <Link href="/login?next=/brand"><Button size="lg" className="gap-2" data-testid="survey-open-vault">Open my Brand Vault <ArrowRight className="h-4 w-4" /></Button></Link>
        <Link href="/demo/tour"><Button size="lg" variant="outline" data-testid="survey-take-tour">Take the 3-minute tour</Button></Link>
      </div>
    </section>
  );
}

export default function KnowSurvey() {
  const params = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : new URLSearchParams();
  const invite = params.get("for") ?? undefined;
  const who = trpc.demo.personalise.useQuery({ invite: invite ?? "" }, { enabled: !!invite });
  const save = trpc.demo.surveyAnswer.useMutation();
  const complete = trpc.demo.surveyComplete.useMutation();
  const [i, setI] = useState(0);
  const [answers, setAnswers] = useState<Record<string, SurveyAnswer>>({});
  const done = i >= SURVEY.length;
  const s = SURVEY[Math.min(i, SURVEY.length - 1)];
  const name = who.data?.firstName;

  const answer = (a: SurveyAnswer, idx = i) => {
    const q = SURVEY[idx];
    setAnswers((prev) => ({ ...prev, [q.id]: a }));
    save.mutate({ invite, sessionId: sessionId(), questionId: q.id as never, answer: a });
  };

  useEffect(() => {
    const pre = params.get("a1");
    if (pre === "yes" || pre === "unsure" || pre === "no") answer(pre, 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (done) complete.mutate({ invite, sessionId: sessionId() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="know-survey-page">
      <Helmet><title>If you don't already know… · Ownology</title></Helmet>
      <div className="mx-auto max-w-2xl px-6 py-14 md:py-20">
        <Link href="/" className="font-['Fraunces',serif] text-xl font-bold text-[var(--ow-amber)]">Ownology</Link>
        {done ? <div className="mt-10"><Summary answers={answers} name={name} /></div> : (
          <>
            <div className="mt-10" data-testid="survey-progress">
              <div className="flex justify-between text-xs text-[var(--ow-text-lo)]"><span>Question {i + 1} of {SURVEY.length}</span><span>About 2 minutes</span></div>
              <div className="mt-2 h-1.5 rounded-full bg-[var(--ow-bg-inset)]"><div className="h-1.5 rounded-full bg-[var(--ow-amber)] transition-[width] duration-500" style={{ width: `${(i / SURVEY.length) * 100}%` }} /></div>
            </div>
            {i === 0 && (
              <p className="mt-8 text-sm text-[var(--ow-text-mid)]" data-testid="survey-intro">
                {name ? `${name}, eight quick questions.` : "Eight quick questions."} If you don't already know the answer, here's how Ownology can help. And if you do, here's how it makes it easier.
              </p>
            )}
            <h1 className="mt-6 font-['Fraunces',serif] text-3xl leading-tight text-[var(--ow-text-hi)] md:text-4xl" data-testid="survey-question">{s.q}</h1>
            <div className="mt-8 grid gap-3 sm:grid-cols-3">
              {ANSWERS.map((a) => (
                <button key={a} type="button" onClick={() => answer(a)} data-testid={`survey-answer-${a}`}
                  className={`flex items-center justify-center gap-2 rounded-lg border px-4 py-3.5 text-sm font-semibold transition-[border-color,background-color,transform] duration-150 hover:-translate-y-0.5 ${answers[s.id] === a ? "border-[var(--ow-amber)] bg-[var(--ow-amber)] text-white" : "border-[var(--ow-border-md)] bg-[var(--ow-bg-card)] text-[var(--ow-text-hi)] hover:border-[var(--ow-amber)]"}`}>
                  {answers[s.id] === a && <Check className="h-4 w-4" />} {ANSWER_LABEL[a]}
                </button>
              ))}
            </div>
            {answers[s.id] && <HelpCard i={i} answer={answers[s.id]} />}
            <div className="mt-8 flex justify-between">
              <Button variant="ghost" disabled={i === 0} onClick={() => setI(i - 1)} data-testid="survey-back">Back</Button>
              <Button onClick={() => setI(i + 1)} disabled={!answers[s.id]} className="gap-1.5" data-testid="survey-next">
                {i === SURVEY.length - 1 ? "See my summary" : "Next"} <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
