/**
 * Operator Guide — bookmarkable "how to run my own site" walkthrough.
 *
 * Structure: Daily rhythm → Sales → Growth → Product → Admin → Troubleshooting.
 * Every section links to the actual URL so it's usable one-handed from a phone.
 *
 * Deliberately plain — this is a manual, not a marketing page.
 */

import { Link } from "wouter";
import {
  Sun,
  MessageCircle,
  Sparkles,
  Mic,
  BookOpen,
  Wrench,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { CrmFlashCards } from "@/components/CrmFlashCards";
import { PipelineFlashCards } from "@/components/PipelineFlashCards";
import { ComplianceFlashCards } from "@/components/ComplianceFlashCards";
import { ImportFlashCards } from "@/components/ImportFlashCards";

type Step = {
  href: string;
  label: string;
  what: string;
};

type Section = {
  id: string;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  steps: Step[];
  note?: string;
};

const SECTIONS: Section[] = [
  {
    id: "morning",
    title: "Your morning ritual",
    subtitle: "5 minutes, every day. Do these three in order.",
    icon: <Sun size={22} />,
    steps: [
      {
        href: "/admin/contacts/pipeline",
        label: "Pipeline board",
        what: "Trello-style board of every SMS prospect. Focus on the Awaiting reply column — nudge anyone who's opened your link but not replied. Drag cards left/right as things change.",
      },
      {
        href: "/admin/contacts",
        label: "Contacts (list view)",
        what: "Same prospects, list layout. Tap Copy SMS draft on a warm row, tweak the message in the inline editor, send it from your iPhone, then click Mark sent. Rows tagged sales or skip are dimmed so you skip them without thinking.",
      },
      {
        href: "/admin/funnel",
        label: "Conversion funnel",
        what: "Which CTAs actually convert? The Conv % column highlights winners in green. If free-paused sits above 5%, lower DAILY_FREE_BUDGET_USD in .env so the upsell surfaces sooner.",
      },
    ],
    note: "That's it for the mandatory daily loop. Everything below is reactive — do it when the situation calls for it.",
  },
  {
    id: "sales",
    title: "When a prospect replies to your SMS",
    subtitle: "They land on /hi/<their-slug>. You just answer the SMS.",
    icon: <MessageCircle size={22} />,
    steps: [
      {
        href: "/hi/nathan-brokenwood-wines",
        label: "Example: /hi/<slug>",
        what: "Personalised landing card with their name, winery, event, and a CTA. The system already picked their crush theme (red/white) and CTA variant (Book demo vs Reply RED) deterministically — you don't touch that logic.",
      },
      {
        href: "/admin/contacts",
        label: "A/B card",
        what: "Between the KPI strip and filter chips on /admin/contacts, a card shows live Book demo vs Reply RED conversion. Uses live data to tell you which variant is winning.",
      },
    ],
  },
  {
    id: "growth",
    title: "Sending the sandbox to a new warm contact",
    subtitle: "One central asset kit — copy and paste.",
    icon: <Sparkles size={22} />,
    steps: [
      {
        href: "/admin/marketing-kit",
        label: "Marketing kit",
        what: "One-click copy for: sample vintage log URLs (Hunter / Boutique / Large), LinkedIn DM templates, and email signature (preview + production versions). Bookmark this on your phone.",
      },
      {
        href: "/admin/contacts",
        label: "Add a new contact",
        what: "Use the Add form at the top of /admin/contacts. Once created, tap Copy SMS on their row to grab the ready-to-send draft.",
      },
      {
        href: "/sample-vintage-log?variant=hunter",
        label: "Sample vintage log (Hunter)",
        what: "The visual mockup cold prospects see. Try the ?variant=hunter, ?variant=boutique and ?variant=large query params — the system serves the right one per contact automatically.",
      },
      {
        href: "/compliance-score",
        label: "Compliance score (SEO lead-gen)",
        what: "Public 8-question audit-readiness checklist. Winemakers searching \"winery compliance checklist\" land here, get a live score (green ≥80 / amber ≥50 / red <50), and can email themselves the write-up. Every completion writes to /admin/contacts as source=compliance-score with tags carrying their score and band.",
      },
    ],
  },
  {
    id: "cellar",
    title: "In the cellar — the flagship feature",
    subtitle: "Muddy hands, hands-free logging.",
    icon: <Mic size={22} />,
    steps: [
      {
        href: "/import",
        label: "Voice tab (default)",
        what: "Tap Start recording, say your log line (\"Tank 7 Shiraz, added 2.6 kilos of DAP, Brix is 14.2, pH 3.42\"), tap Stop, tap Extract entries. Review the parsed rows, tap Save — they land in The Press tagged as voice-imported.",
      },
      {
        href: "/import",
        label: "Camera / Paste / CSV tabs",
        what: "Camera: photograph any notebook or lab report. Paste: paste any text (email, Excel copy, notes). CSV: upload with column mapping. All produce the same review-then-save preview.",
      },
      {
        href: "/the-press",
        label: "The Press",
        what: "The live log. Every voice / camera / paste / CSV import shows up here tagged by source. Rack, edit, or delete inline. Note: while there's no real batch data yet, The Press shows a Sample vintage ribbon at the top (Ownology Cellars 2024 Shiraz demo). Once real batches populate, the ribbon disappears automatically.",
      },
      {
        href: "/quick-entry",
        label: "Quick Entry (manual)",
        what: "For a single event when voice isn't practical. The Confirm screen has decision-logic Why? preset chips so you capture the reasoning behind every add — this is what powers your AI's personalised advice.",
      },
    ],
  },
  {
    id: "content",
    title: "When someone asks a wine question",
    subtitle: "Or when you ask yourself one — the content flywheel.",
    icon: <BookOpen size={22} />,
    steps: [
      {
        href: "/free-run",
        label: "Free Run (ask anything)",
        what: "Type any winemaking question. You get a cited answer from AWRI / the bibles / your own cellar history. Every question auto-saves to a Cellar Journal page — that's your content flywheel.",
      },
      {
        href: "/cellar-journal",
        label: "Cellar Journal",
        what: "Public index of every published Q&A. Each entry has Copy / X / LinkedIn / Reddit share buttons and rich OG meta tags so links unfurl as cards on every platform.",
      },
      {
        href: "/the-press/compare",
        label: "Vintage Comparison",
        what: "Pick 2–6 tanks to compare side-by-side: variety, yeast strain, ferment duration, Brix/YAN/temp curves, and the last 5 decisions (with your Why? reasoning) per tank.",
      },
    ],
  },
  {
    id: "admin",
    title: "Growth surfaces you don't touch daily",
    subtitle: "Know they exist. Peek weekly.",
    icon: <Sparkles size={22} />,
    steps: [
      {
        href: "/pricing",
        label: "Pricing",
        what: "Where paid signups land. Auto-logs source attribution via ?from=<tag> URL params. Every visit becomes a row on /admin/funnel.",
      },
      {
        href: "/try",
        label: "/try sandbox",
        what: "The anonymous 3-screen intro cold prospects see first. All member-only routes redirect anonymous visitors here with a contextual banner.",
      },
      {
        href: "/quiz",
        label: "Wine Quiz",
        what: "Wine Recommender. Still awaiting the Red/White hard-filter refactor — that's on the P1 backlog.",
      },
      {
        href: "/admin/playbook",
        label: "Clickable Playbook",
        what: "Your internal SOP library. Uses localStorage to track which SOPs you've read, so you can see gaps at a glance.",
      },
      {
        href: "/admin/themes-stats",
        label: "Theme telemetry",
        what: "Which themes operators pick after the first-time onboarding card. Not urgent — helps you decide which themes stay enabled.",
      },
    ],
  },
  {
    id: "troubleshoot",
    title: "When something looks off",
    subtitle: "Fast diagnostic map.",
    icon: <Wrench size={22} />,
    steps: [
      {
        href: "/stats",
        label: "LLM budget stats",
        what: "AI answers stopped working? Check Today's Budget + per-tier guard. If exceeded, use admin.resetDailyBudget from /admin or wait until UTC midnight.",
      },
      {
        href: "/admin/health",
        label: "App Health dashboard",
        what: "Live status of the 5 system probes (env vars, MySQL, Resend, Emergent LLM key, Auth) with last-transition timestamps. Three actions: Refresh (re-run probes), Run watch (dry-run — test failure detection without email), Run watch + send (fires a real email if any probe just flipped). Bookmark this — your first stop when anything feels off.",
      },
      {
        href: "/api/scheduled/health-digest",
        label: "Daily health digest (JSON preview)",
        what: "Same 5 probes, JSON form. Add ?send=1 to also email ADMIN_EMAILS. Railway cron fires this at 07:00 AEST daily.",
      },
      {
        href: "/api/scheduled/health-watch",
        label: "Failure-only push (JSON preview)",
        what: "Companion to the daily digest — Railway cron fires this every 15 min. Only emails when a probe transitions OK→FAIL or FAIL→OK. Add ?send=1 to actually send. State persisted in health_probe_state so redeploys don't cause spurious \"just failed\" alerts.",
      },
      {
        href: "/api/scheduled/daily-alert-email?dryRun=1",
        label: "Email dry-run (marketing digest)",
        what: "Different from health emails — this is the daily contact-pipeline nudge digest. Hit this URL to see exactly what would be sent, without sending. Check RESEND_API_KEY in .env if it errors.",
      },
      {
        href: "/admin/dev",
        label: "Dev bypass toggle",
        what: "Toggle the auth dev-bypass on/off at runtime. Useful for testing what an anonymous visitor sees without opening an incognito window.",
      },
      {
        href: "/compliance",
        label: "Compliance / Audit trail PDF",
        what: "Regulator asking? Download the chronological compliance audit trail PDF from the button on this page.",
      },
    ],
    note: "Preview vs production: /todo and /roadmap only work on the preview host — they return 404 on ownology.ai. That's intentional; it keeps your working backlog private. Production env vars live on Railway (not .env) — cleanup steps saved at /app/memory/RAILWAY_ENV_CLEANUP.md. DNS lives at Namecheap (Advanced DNS) with ALIAS @ → aye79ubv.up.railway.app and CNAME www → uj8udgk7.up.railway.app.",
  },
];

// ── Card component ────────────────────────────────────────────────────────────

function StepRow({ step }: { step: Step }) {
  const external = step.href.startsWith("http") || step.href.startsWith("/api/");
  const testid = `op-guide-step-${step.href.replace(/[^a-z0-9]/gi, "-")}`;

  // The whole card is the tap target — user reported that only the label
  // being clickable was easy to miss on desktop and impossible on mobile.
  // Wrap in an <a> for external and /api paths, <Link> for SPA routes so
  // wouter handles client-side navigation without a full page load.
  const cardInner = (
    <div className="flex-1 min-w-0">
      <div className="flex items-center gap-2 flex-wrap">
        <span
          className="font-semibold text-sm inline-flex items-center gap-1.5"
          style={{ color: "var(--ow-amber)" }}
        >
          {step.label}
          {external ? <ExternalLink size={12} /> : <span aria-hidden="true">→</span>}
        </span>
        <code
          className="text-xs px-2 py-0.5 rounded"
          style={{
            color: "var(--ow-text-lo)",
            background: "color-mix(in oklch, var(--ow-text-lo) 12%, transparent)",
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
        >
          {step.href}
        </code>
      </div>
      <p
        className="text-sm mt-2 leading-relaxed"
        style={{ color: "var(--ow-text-mid)" }}
      >
        {step.what}
      </p>
    </div>
  );

  const cardStyle: React.CSSProperties = {
    background: "var(--ow-bg-base)",
    border: "1px solid var(--ow-bg-inset)",
    color: "inherit",
    textDecoration: "none",
    transition: "border-color 120ms ease, background 120ms ease",
    cursor: "pointer",
  };
  const cardClass = "flex gap-4 p-4 rounded-lg hover:opacity-95";

  if (external) {
    return (
      <a
        href={step.href}
        target="_blank"
        rel="noreferrer"
        className={cardClass}
        style={cardStyle}
        data-testid={testid}
      >
        {cardInner}
      </a>
    );
  }
  // Wouter v3 <Link> renders its own <a>. Pass className / style / testid
  // straight through — don't nest another anchor.
  return (
    <Link
      href={step.href}
      className={cardClass}
      style={cardStyle}
      data-testid={testid}
    >
      {cardInner}
    </Link>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminOperatorGuide() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="admin-operator-guide"
    >
      {/* Header */}
      <div
        className="sticky top-0 z-10 border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-bg-inset)" }}
      >
        <div className="container max-w-3xl flex items-center gap-4 py-4">
          <Link href="/admin">
            <button
              className="p-2 rounded-lg transition-colors"
              style={{ color: "var(--ow-text-mid)" }}
              data-testid="op-guide-back"
              aria-label="Back to admin"
            >
              <ArrowLeft size={20} />
            </button>
          </Link>
          <div className="flex-1 min-w-0">
            <h1
              className="text-lg font-bold truncate"
              style={{ fontFamily: "'Fraunces', serif", color: "var(--ow-amber)" }}
            >
              Operator guide
            </h1>
            <p className="text-xs" style={{ color: "var(--ow-text-lo)" }}>
              How to run your own site — daily rhythm and the &ldquo;when I need to&rdquo; tools
            </p>
          </div>
        </div>
      </div>

      <div className="container max-w-3xl py-6 space-y-8">
        {/* Table of contents */}
        <div
          className="rounded-xl p-5"
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          }}
        >
          <p
            className="text-xs uppercase tracking-wide font-semibold mb-3"
            style={{ color: "var(--ow-amber)" }}
          >
            Jump to
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {SECTIONS.map((s) => (
              <li key={s.id}>
                <a
                  href={`#${s.id}`}
                  className="text-sm hover:underline inline-flex items-center gap-2"
                  style={{ color: "var(--ow-text-hi)" }}
                >
                  <span style={{ color: "var(--ow-amber)" }}>{s.icon}</span>
                  {s.title}
                </a>
              </li>
            ))}
          </ul>
          <p
            className="text-xs italic mt-4 pt-4 border-t"
            style={{
              color: "var(--ow-text-lo)",
              borderColor: "color-mix(in oklch, var(--ow-amber) 20%, transparent)",
            }}
          >
            One-line summary: every morning, pipeline board → SMS drafts → funnel. Every cellar visit, voice memo. Everything else is reactive.
          </p>
          <p
            className="text-xs mt-3"
            style={{ color: "var(--ow-text-lo)" }}
          >
            <span style={{ display: "block", marginBottom: "0.35rem" }}>
              <a
                href="#crm-flash-cards"
                data-testid="op-guide-toc-flashcards"
                style={{ color: "var(--ow-amber)", textDecoration: "none", fontWeight: 600 }}
              >
                ★ CRM flash-card deck →
              </a>{" "}
              <span style={{ fontStyle: "italic" }}>
                20 cards · view · call · text · pipeline.
              </span>
            </span>
            <span style={{ display: "block", marginBottom: "0.35rem" }}>
              <a
                href="#pipeline-flash-cards"
                data-testid="op-guide-toc-pipeline-flashcards"
                style={{ color: "var(--ow-amber)", textDecoration: "none", fontWeight: 600 }}
              >
                ★ Pipeline board flash-card deck →
              </a>{" "}
              <span style={{ fontStyle: "italic" }}>
                14 cards · 5 columns · KPIs · morning ritual.
              </span>
            </span>
            <span style={{ display: "block", marginBottom: "0.35rem" }}>
              <a
                href="#compliance-flash-cards"
                data-testid="op-guide-toc-compliance-flashcards"
                style={{ color: "var(--ow-amber)", textDecoration: "none", fontWeight: 600 }}
              >
                ★ Compliance flash-card deck →
              </a>{" "}
              <span style={{ fontStyle: "italic" }}>
                16 cards · Ask · Audit · LIP · APCO · escalate.
              </span>
            </span>
            <span style={{ display: "block" }}>
              <a
                href="#import-flash-cards"
                data-testid="op-guide-toc-import-flashcards"
                style={{ color: "var(--ow-amber)", textDecoration: "none", fontWeight: 600 }}
              >
                ★ Import &amp; OCR flash-card deck →
              </a>{" "}
              <span style={{ fontStyle: "italic" }}>
                19 cards · Voice · Camera · Paste · CSV · Bulk · Review.
              </span>
            </span>
          </p>
        </div>

        {/* CRM Flash Cards — the idiot's guide to viewing, calling, texting */}
        <CrmFlashCards />

        {/* Pipeline board flash-card deck */}
        <PipelineFlashCards />

        {/* Compliance flash-card deck */}
        <ComplianceFlashCards />

        {/* Import & OCR flash-card deck */}
        <ImportFlashCards />

        {/* Sections */}
        {SECTIONS.map((section) => (
          <section
            key={section.id}
            id={section.id}
            className="scroll-mt-24"
            data-testid={`op-guide-section-${section.id}`}
          >
            <div className="flex items-start gap-3 mb-4">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{
                  background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                  color: "var(--ow-amber)",
                }}
              >
                {section.icon}
              </div>
              <div className="flex-1 min-w-0">
                <h2
                  className="text-xl font-bold"
                  style={{
                    fontFamily: "'Fraunces', serif",
                    color: "var(--ow-text-hi)",
                  }}
                >
                  {section.title}
                </h2>
                <p className="text-sm mt-0.5" style={{ color: "var(--ow-text-mid)" }}>
                  {section.subtitle}
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {section.steps.map((step) => (
                <StepRow key={step.href + step.label} step={step} />
              ))}
            </div>

            {section.note && (
              <p
                className="text-xs italic mt-4 pl-13 pr-4"
                style={{ color: "var(--ow-text-lo)" }}
              >
                {section.note}
              </p>
            )}
          </section>
        ))}

        {/* Sharing + print + audit metadata */}
        <div
          className="mt-10 mb-6 p-5 rounded-lg"
          style={{
            background: "var(--ow-bg-base)",
            border: "1px solid var(--ow-bg-inset)",
          }}
          data-testid="op-guide-share-block"
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div
                className="text-xs uppercase tracking-widest mb-1"
                style={{ color: "var(--ow-amber)", fontFamily: "'Fraunces', serif" }}
              >
                Handing this off
              </div>
              <p className="text-sm mb-3" style={{ color: "var(--ow-text-mid)", lineHeight: 1.55 }}>
                This page is admin-gated — new hires and advisors won&apos;t see it by default.
                To share:{" "}
                <strong style={{ color: "var(--ow-text-hi)" }}>Print / Save as PDF</strong>{" "}
                (button below) for anyone offline, or screen-share it live during onboarding.
                For temporary in-app access, create a magic link at{" "}
                <Link
                  href="/admin/gate-invites"
                  className="underline"
                  style={{ color: "var(--ow-amber)" }}
                >
                  /admin/gate-invites
                </Link>{" "}
                — but note that only lets them past the wall, not into admin surfaces.
              </p>
              <button
                type="button"
                onClick={() => window.print()}
                data-testid="op-guide-print-btn"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-semibold"
                style={{
                  background: "var(--ow-amber)",
                  color: "var(--ow-bg-base)",
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                <ExternalLink size={14} strokeWidth={2.4} /> Print / Save as PDF
              </button>
            </div>
          </div>
        </div>

        {/* Audit trail */}
        <div
          className="text-center text-xs pb-4"
          data-testid="op-guide-audit-line"
          style={{ color: "var(--ow-text-lo)" }}
        >
          Last audited{" "}
          <strong style={{ color: "var(--ow-text-mid)" }}>Feb 12, 2026</strong>{" "}
          · Rich · every link verified against App.tsx + Express routes. Re-audit monthly or after any major shipping session.
        </div>

        {/* Footer */}
        <div
          className="text-center text-xs pt-4 pb-4"
          style={{ color: "var(--ow-text-lo)" }}
        >
          Missing something? This page lives at{" "}
          <code style={{ color: "var(--ow-amber)" }}>/admin/operator-guide</code>
          {" — bookmark it on your phone."}
        </div>
      </div>
    </div>
  );
}
