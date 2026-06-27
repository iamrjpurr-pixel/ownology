/**
 * Cellar Journal — public, SEO-friendly Q&A library.
 *
 *   /cellar-journal             → index of all entries (topic filter + search)
 *   /cellar-journal/:slug       → single entry: teaser + wax-sealed wall + CTAs
 *
 * SEO strategy: every entry page injects JSON-LD `Article` markup with
 * `isAccessibleForFree: false` + `hasPart` so Google sees the full answer
 * (legal flexible-sampling pattern, no cloaking risk).
 */
import React, { useEffect, useMemo } from "react";
import { Link, useLocation } from "wouter";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { trpc } from "@/lib/trpc";
import { Helmet } from "react-helmet";
import { ChevronRight, BookOpen, Wine, Search, Sparkles, ArrowRight, Lock } from "lucide-react";

/* ─────────────── INDEX ─────────────── */

export function CellarJournalIndex() {
  const [, setLoc] = useLocation();
  const [topic, setTopic] = React.useState<string | undefined>(undefined);
  const [search, setSearch] = React.useState("");

  const topicsQ = trpc.cellarJournal.topics.useQuery();
  const listQ = trpc.cellarJournal.list.useQuery({
    topic,
    search: search.trim() || undefined,
    limit: 48,
  });

  const topics = topicsQ.data ?? [];
  const rows = listQ.data?.rows ?? [];
  const total = listQ.data?.total ?? 0;

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg)" }}>
      <Helmet>
        <title>Cellar Journal · Ownology — Winemaking answers, indexed.</title>
        <meta
          name="description"
          content="A growing library of cellar-floor Q&A — fermentation, MLF, racking, faults, and more. Answers grounded in real winemaking references."
        />
        <link rel="canonical" href="https://ownology.ai/cellar-journal" />
      </Helmet>

      {/* ── Hero ── */}
      <section className="px-6 md:px-12 pt-14 pb-10 max-w-6xl mx-auto">
        <Link href="/" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100" data-testid="cj-back">
          ← Back to Ownology
        </Link>
        <div className="mt-8 flex items-center gap-3 font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--ow-amber, #b8924a)" }}>
          <BookOpen className="w-4 h-4" /> Vol. 01 — Cellar Journal
        </div>
        <h1 className="font-serif italic text-5xl md:text-7xl leading-[0.95] mt-4 tracking-tight" data-testid="cj-title">
          Notes from the<br />cellar floor.
        </h1>
        <p className="mt-6 text-lg md:text-xl max-w-2xl leading-relaxed opacity-80">
          Every question a winemaker asks Ownology becomes a page here — grounded in
          real references, written for the cellar at 2&nbsp;am.
        </p>

        {/* search + counts */}
        <div className="mt-10 flex flex-wrap items-center gap-4">
          <div className="relative flex-1 min-w-[280px] max-w-xl">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 opacity-50" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="search the journal…"
              data-testid="cj-search"
              className="w-full pl-10 pr-4 py-3 rounded-full bg-transparent border focus:outline-none focus:ring-2 italic"
              style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.2))" }}
            />
          </div>
          <div className="font-mono text-xs uppercase tracking-[0.18em] opacity-70">
            <span data-testid="cj-total">{total}</span> entries
            {topic ? ` · ${topic}` : ""}
          </div>
        </div>

        {/* topic chips */}
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            onClick={() => setTopic(undefined)}
            data-testid="cj-topic-all"
            className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-[0.15em] border transition ${
              !topic ? "bg-[var(--ow-amber)] text-black border-transparent" : "opacity-70 hover:opacity-100"
            }`}
            style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.2))" }}
          >
            All
          </button>
          {topics.map((t) => (
            <button
              key={t.topic}
              onClick={() => setTopic(t.topic === topic ? undefined : t.topic)}
              data-testid={`cj-topic-${t.topic.toLowerCase().replace(/\s+/g, "-")}`}
              className={`px-3 py-1.5 rounded-full text-xs font-mono uppercase tracking-[0.15em] border transition ${
                topic === t.topic ? "bg-[var(--ow-amber)] text-black border-transparent" : "opacity-70 hover:opacity-100"
              }`}
              style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.2))" }}
            >
              {t.topic} <span className="opacity-60">· {t.count}</span>
            </button>
          ))}
        </div>
      </section>

      {/* ── Entry grid ── */}
      <section className="px-6 md:px-12 pb-20 max-w-6xl mx-auto">
        {listQ.isLoading ? (
          <p className="opacity-60 font-mono text-sm">Loading the cellar…</p>
        ) : rows.length === 0 ? (
          <div className="py-16 text-center opacity-70">
            <p className="font-serif italic text-2xl">Nothing here yet for that filter.</p>
            <p className="mt-2 text-sm">Ask Free Run a question — your answer might be the first entry.</p>
            <Link href="/free-run" className="inline-block mt-6 px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] border" style={{ borderColor: "var(--ow-amber)", color: "var(--ow-amber)" }}>
              Ask Free Run →
            </Link>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((r) => (
              <Link
                key={r.id}
                href={`/cellar-journal/${r.slug}`}
                data-testid={`cj-entry-${r.slug}`}
                className="group block p-5 md:p-6 border rounded-lg transition hover:translate-y-[-2px] hover:shadow-lg"
                style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.15))" }}
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-[0.22em]" style={{ color: "var(--ow-amber)" }}>
                    {r.topicTag}
                  </span>
                  <span className="font-mono text-[10px] opacity-50">
                    asked {r.askedCount}×
                  </span>
                </div>
                <h3 className="font-serif italic text-xl md:text-2xl mt-3 leading-snug group-hover:opacity-90">
                  {r.question}
                </h3>
                {r.diagnosis && (
                  <p className="mt-3 text-sm leading-relaxed opacity-75 line-clamp-3">
                    {r.diagnosis}
                  </p>
                )}
                <span className="inline-flex items-center gap-1 mt-4 text-xs font-mono opacity-70 group-hover:opacity-100">
                  Read the entry <ChevronRight className="w-3 h-3" />
                </span>
              </Link>
            ))}
          </div>
        )}

        {/* footer CTA */}
        <div className="mt-16 p-8 border rounded-lg" style={{ borderColor: "var(--ow-amber)", background: "rgba(184,146,74,0.05)" }}>
          <div className="flex flex-wrap items-center gap-6 justify-between">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--ow-amber)" }}>
                Your turn
              </p>
              <p className="font-serif italic text-2xl md:text-3xl mt-2">
                Ask Free Run a question — see your answer become a journal entry.
              </p>
              <p className="opacity-70 text-sm mt-2">5 free questions a month. No sign-up required to read.</p>
            </div>
            <button
              onClick={() => setLoc("/free-run")}
              data-testid="cj-cta-freerun"
              className="px-6 py-3 rounded-full font-mono text-[11px] uppercase tracking-[0.2em]"
              style={{ background: "var(--ow-amber)", color: "#1a1410" }}
            >
              Open Free Run →
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ─────────────── ENTRY (single page) ─────────────── */

export function CellarJournalEntry({ slug }: { slug: string }) {
  const [, setLoc] = useLocation();
  const q = trpc.cellarJournal.getBySlug.useQuery({ slug });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug]);

  const entry = q.data?.entry;
  const related = q.data?.related ?? [];
  const teaser = entry?.teaserAnswer || entry?.fullAnswer?.slice(0, 600) || "";
  const fullForBots = entry?.fullAnswer || "";

  // JSON-LD per Google's flexible sampling spec — must be declared
  // unconditionally to keep hook order stable across renders.
  const ldJson = useMemo(() => {
    if (!entry) return null;
    return {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: entry.question,
      description: entry.diagnosis || teaser.slice(0, 200),
      author: { "@type": "Organization", name: "Ownology" },
      publisher: {
        "@type": "Organization",
        name: "Ownology",
        logo: { "@type": "ImageObject", url: "https://ownology.ai/logo.png" },
      },
      datePublished: new Date(entry.firstAskedAt).toISOString(),
      dateModified: new Date(entry.lastAskedAt).toISOString(),
      isAccessibleForFree: false,
      hasPart: {
        "@type": "WebPageElement",
        isAccessibleForFree: false,
        cssSelector: ".cj-paid-content",
      },
      articleBody: fullForBots,
      keywords: entry.topicTag,
    };
  }, [entry, teaser, fullForBots]);

  if (q.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center opacity-60 font-mono text-sm">
        Decanting the answer…
      </div>
    );
  }
  if (!entry) {
    return (
      <div className="min-h-screen px-6 py-24 max-w-2xl mx-auto text-center">
        <p className="font-serif italic text-3xl">Not in the cellar.</p>
        <p className="mt-3 opacity-70">This entry was un-shelved or never logged.</p>
        <Link href="/cellar-journal" className="inline-block mt-6 px-5 py-2.5 rounded-full font-mono text-[11px] uppercase tracking-[0.2em] border">
          Back to the journal
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg)" }}>
      <Helmet>
        <title>{entry.question} · Cellar Journal · Ownology</title>
        <meta name="description" content={entry.diagnosis || teaser.slice(0, 180)} />
        <link rel="canonical" href={`https://ownology.ai/cellar-journal/${entry.slug}`} />
        <script type="application/ld+json">{JSON.stringify(ldJson)}</script>
      </Helmet>

      {/* Hidden full content for bots that don't parse JSON-LD article body */}
      <div className="cj-paid-content" style={{ position: "absolute", left: "-9999px", width: 1, height: 1, overflow: "hidden" }} aria-hidden="true">
        {fullForBots}
      </div>

      <article className="px-6 md:px-12 pt-12 pb-24 max-w-3xl mx-auto">
        <Link href="/cellar-journal" data-testid="cj-back-to-index" className="inline-flex items-center gap-2 text-sm opacity-70 hover:opacity-100">
          ← Cellar Journal
        </Link>

        <div className="mt-8 flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.24em]" style={{ color: "var(--ow-amber, #b8924a)" }}>
          <span>{entry.topicTag}</span>
          <span className="opacity-50">·</span>
          <span className="opacity-60">Asked {entry.askedCount}× · Viewed {entry.viewCount + 1}</span>
        </div>

        <h1 className="font-serif italic text-4xl md:text-6xl mt-4 leading-[1.05] tracking-tight" data-testid="cj-entry-question">
          {entry.question}
        </h1>

        {entry.diagnosis && (
          <p className="mt-6 text-xl md:text-2xl font-serif leading-snug opacity-90 border-l-2 pl-4" style={{ borderColor: "var(--ow-amber)" }}>
            {entry.diagnosis}
          </p>
        )}

        {/* Teaser content (visible to humans) */}
        <div className="prose prose-invert mt-10 max-w-none cj-teaser" data-testid="cj-teaser-content">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{teaser}</ReactMarkdown>
        </div>

        {/* Wax-sealed wall */}
        <div className="mt-8 relative">
          {/* gradient fade above the seal */}
          <div className="absolute -top-24 left-0 right-0 h-24 pointer-events-none"
               style={{ background: "linear-gradient(to bottom, transparent, var(--ow-bg) 90%)" }} />
          <div className="relative p-8 md:p-10 border rounded-lg overflow-hidden" style={{
                 background: "linear-gradient(135deg, rgba(184,146,74,0.06), rgba(122,42,37,0.06))",
                 borderColor: "var(--ow-amber, #b8924a)",
               }}
               data-testid="cj-paywall"
          >
            {/* wax seal */}
            <div className="absolute -top-6 -right-6 w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
                 style={{ background: "radial-gradient(circle at 30% 30%, #a4623a, #2A0F14)" }}>
              <Lock className="w-7 h-7 text-[var(--ow-amber,#c39b5a)]" />
            </div>

            <p className="font-mono text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--ow-amber)" }}>
              ↓ The exact protocol, sealed
            </p>
            <h3 className="font-serif italic text-2xl md:text-3xl mt-3 leading-snug">
              The numbers live below — members see the full answer.
            </h3>
            <p className="mt-4 text-base md:text-lg leading-relaxed opacity-90 max-w-xl">
              The protocol above is the general approach. The exact doses,
              the temperature ranges, the timing windows, and the bible
              citations — scaled to your batch size — are reserved for Ownology members.
            </p>

            <div className="mt-7 grid sm:grid-cols-2 gap-3">
              <button
                onClick={() => setLoc("/free-run")}
                data-testid="cj-cta-free"
                className="px-5 py-3 rounded-full font-mono text-[11px] uppercase tracking-[0.22em] text-left flex items-center justify-between border transition hover:bg-white/5"
                style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.2))" }}
              >
                <span>
                  <span className="block text-[10px] opacity-60">Free</span>
                  Ask your own — 5 / month
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
              <button
                onClick={() => setLoc("/pricing")}
                data-testid="cj-cta-paid"
                className="px-5 py-3 rounded-full font-mono text-[11px] uppercase tracking-[0.22em] text-left flex items-center justify-between"
                style={{ background: "var(--ow-amber)", color: "#1a1410" }}
              >
                <span>
                  <span className="block text-[10px] opacity-70">From $16/mo</span>
                  Unlock the full cellar
                </span>
                <Sparkles className="w-4 h-4" />
              </button>
            </div>

            <p className="mt-5 text-xs opacity-60 font-mono tracking-wide">
              Bible-grade citations · 38 SOPs · AI tutor scaled to your tanks
            </p>
          </div>
        </div>

        {/* Citations */}
        {entry.citations && entry.citations.length > 0 && (
          <div className="mt-10">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-70">
              ↳ Grounding references
            </p>
            <ul className="mt-3 space-y-1 text-sm">
              {entry.citations.map((c, i) => (
                <li key={i} className="font-serif italic opacity-80">
                  {c.label}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Related */}
        {related.length > 0 && (
          <div className="mt-14">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] opacity-70">
              ↳ More from "{entry.topicTag}"
            </p>
            <div className="mt-4 grid sm:grid-cols-3 gap-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/cellar-journal/${r.slug}`}
                  data-testid={`cj-related-${r.slug}`}
                  className="block p-4 border rounded-lg hover:translate-y-[-2px] transition"
                  style={{ borderColor: "var(--ow-border, rgba(255,255,255,0.15))" }}
                >
                  <p className="font-serif italic text-base leading-snug">{r.question}</p>
                  {r.diagnosis && <p className="mt-2 text-xs opacity-70 line-clamp-2">{r.diagnosis}</p>}
                </Link>
              ))}
            </div>
          </div>
        )}
      </article>
    </div>
  );
}

/* ─────────────── route wrapper ─────────────── */

export function CellarJournalRoute({ slug }: { slug?: string }) {
  if (slug) return <CellarJournalEntry slug={decodeURIComponent(slug)} />;
  return <CellarJournalIndex />;
}
