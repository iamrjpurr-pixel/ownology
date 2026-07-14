/**
 * AdminPlaybook — Rich & Gel's clickable SOP index.
 *
 * The point: LEARN the app by doing, not by reading. Every row is a single-
 * sentence prompt with a button that opens the actual URL where the work
 * happens. No page-turn. No long paragraphs. Just:
 *
 *     [ ] 1. Skim alerts, click any red  →  /dashboard
 *
 * Check-off state is client-only (localStorage) and resets each morning so
 * "Daily" rows go back to unchecked at midnight. Weekly resets on Monday.
 * Nothing hits the backend.
 *
 * Once Rich has done every SOP once and internalised it, a public/customer
 * version can be built from the same shape at /how-to-use (Phase 2).
 *
 * Mounted at /admin/playbook.
 */
import { useState, useEffect, useCallback } from "react";
import { Link } from "wouter";

// ─── Data model ──────────────────────────────────────────────────────────
type Cadence = "daily" | "weekly" | "vintage" | "sop" | "break";

interface Step {
  /** Short sentence — what to do in one breath. */
  what: string;
  /** URL to open. Prefer in-app routes. External links get target=_blank. */
  href: string;
  /** Optional "why this matters" — surfaced as small grey text under the row. */
  why?: string;
  /** Rough time estimate for the step. Kept short — "2 min", "1 hr". */
  time?: string;
}

interface Section {
  id: string;
  cadence: Cadence;
  title: string;
  blurb: string;
  steps: Step[];
}

// ─── Content — pulled from /app/memory/PLAYBOOK.md ────────────────────────
// If the doc changes, update here too. Deliberately hand-maintained: the
// clickable index is opinionated and shorter than the source document.
const SECTIONS: Section[] = [
  {
    id: "daily-10",
    cadence: "daily",
    title: "The Daily 10 Minutes",
    blurb:
      "Every morning, in order. Timer at the top of your phone. If any single item takes >5 min, log a task and move on.",
    steps: [
      { what: "Open today's Cellar Brief — the AI's morning summary.", href: "/cellar-brief", time: "2 min", why: "One-line summaries of every alert. Click any red one to drill in." },
      { what: "Glance at the Cellar Board — every vessel Red/Amber/Green/Grey. Anything Grey (fault) or unexpectedly Red gets triaged first.", href: "/admin/cellar-board", time: "1 min", why: "State is computed from event log — Green = sanitised in last 72h + empty. Green vessels are safe to fill." },
      { what: "Look at the dashboard — see live tank/batch status and any alerts.", href: "/dashboard", time: "3 min", why: "Alerts banner sits at the top. Click a red alert → opens the batch context." },
      { what: "Log anything you added or measured yesterday but forgot to record.", href: "/quick-entry", time: "2 min", why: "Chemistry values, additions, observations. Reused tags = better search later." },
      { what: "Check today's tasks — do the ones due today, snooze the rest.", href: "/cellar-tasks", time: "2 min" },
      { what: "One glance at funnel numbers — visits, quiz completions, reservations.", href: "/admin/funnel", time: "1 min", why: "Not to obsess. Just to notice patterns week over week." },
    ],
  },
  {
    id: "weekly-30",
    cadence: "weekly",
    title: "The Weekly 30 Minutes",
    blurb:
      "Every Monday 9am (or first working morning of the week). Skip 2 weeks in a row and both the vintage AND the sales pipeline slip.",
    steps: [
      { what: "Plan the week — filter tasks by 'next 7 days', assign tank/barrel to each.", href: "/cellar-tasks", time: "5 min" },
      { what: "Work the sales pipeline — reply/bump/drop for every contact in Reached out >5 days; send SMS to New.", href: "/admin/contacts/pipeline", time: "10 min", why: "31 VIVID contacts seeded. First outreach is the highest-leverage thing you can do this month." },
      { what: "Reply to every Founding Reservation from the last 7 days you haven't personally replied to.", href: "/admin/settings", time: "5 min", why: "Recent Reservations widget lives at top of Admin Settings. Reply within 4 hours = 3× close rate." },
      { what: "Publish 1 Cellar Journal entry — even 200 words. This is the SEO compounder.", href: "/admin/cellar-journal/new", time: "10-20 min", why: "Every entry ranks for a long-tail winemaking question over time. Voice: amateur, curious, honest." },
      { what: "Notes pulse — write a one-line thought on visits, quiz completions, reservation rate.", href: "/admin/funnel", time: "2 min" },
    ],
  },
  {
    id: "vintage-critical",
    cadence: "vintage",
    title: "Vintage-Critical Checkpoints",
    blurb:
      "These are the moments where letting a day slip actually damages wine. When these fire, the Daily 10 becomes the Daily 30.",
    steps: [
      { what: "Fermentation Brix stalled ≥2 days → intervene in 24 hours (check YAN, temp, yeast).", href: "/cellar-brief", time: "24hr window" },
      { what: "MLF complete (malic <0.15 g/L) → add SO₂ within 48 hours.", href: "/quick-entry", time: "48hr window" },
      { what: "Barrel topping — weekly recurring task.", href: "/cellar-tasks", time: "weekly" },
      { what: "Cold-stab test — one-off before bottling.", href: "/cellar-tasks", time: "before bottling" },
      { what: "Free SO₂ recheck on reds — fortnightly during aging.", href: "/cellar-tasks", time: "fortnightly" },
      { what: "Founding member reservation received → reply personally within 4 hours.", href: "/admin/settings", time: "4hr window" },
    ],
  },
  {
    id: "sop-1",
    cadence: "sop",
    title: "SOP 1 — Log a bench trial or addition",
    blurb: "When: any time you add SO₂, DAP, PMS, bentonite, fining agent OR run a bench trial. ~2 min per entry.",
    steps: [
      { what: "Open Quick Entry — pick the tank/barrel from the dropdown.", href: "/quick-entry", time: "10 sec" },
      { what: "Choose event type: addition · measurement · bench_trial · observation · racking.", href: "/quick-entry", time: "5 sec" },
      { what: "Fill the JSON fields exactly as the form asks. Chemistry values only, no fluff.", href: "/quick-entry", time: "60 sec", why: "Tasting notes belong in the Cellar Journal (SOP 4), not here. This field is chemistry + immediate context." },
      { what: "Add tags — SO2, bottling-prep, MLF, stuck-ferment. Reuse existing tags.", href: "/quick-entry", time: "10 sec" },
      { what: "Save. If the addition was above your usual rate, the AI will flag it in tomorrow's Brief.", href: "/quick-entry", time: "5 sec" },
    ],
  },
  {
    id: "sop-2",
    cadence: "sop",
    title: "SOP 2 — Act on a Cellar Brief alert",
    blurb: "When: every morning, from the Cellar Brief email or /cellar-brief. ~3-5 min per alert.",
    steps: [
      { what: "Open the Cellar Brief. Read the alert's one-line summary.", href: "/cellar-brief", time: "30 sec" },
      { what: "Click the alert → opens the batch/tank detail with recent log entries.", href: "/dashboard", time: "1 min" },
      { what: "Cross-check chemistry: does the AI's diagnosis match the last 3 entries?", href: "/dashboard", time: "2 min" },
      { what: "If acting now: perform the action, then log it via SOP 1. That closes the alert.", href: "/quick-entry", time: "as needed" },
      { what: "If deferring: click 'Convert to task' — assign due date + owner (Rich or Gel).", href: "/cellar-tasks", time: "30 sec", why: "If an alert is stale because you already fixed it but haven't logged the fix — log the fix. The alert vanishes on the next scheduled run." },
    ],
  },
  {
    id: "sop-3",
    cadence: "sop",
    title: "SOP 3 — Send VIVID outreach",
    blurb: "When: Monday weekly sweep, or ad-hoc when you meet someone. ~3 min per contact.",
    steps: [
      { what: "Open the pipeline — filter by status = New.", href: "/admin/contacts/pipeline", time: "10 sec" },
      { what: "Click a contact → the pre-written SMS draft loads on the right.", href: "/admin/contacts/pipeline", time: "10 sec" },
      { what: "Personalise the FIRST LINE ONLY — mention what caught your eye about their winery.", href: "/admin/contacts/pipeline", time: "60 sec", why: "First line personalisation is what makes them reply. Skip the contact if you can't personalise — sending the generic template WILL burn them for good." },
      { what: "Copy the draft. Paste into your SMS app. Send.", href: "/admin/contacts/pipeline", time: "30 sec" },
      { what: "Back in Ownology, click 'Mark sent' — moves them to Reached out, timestamps.", href: "/admin/contacts/pipeline", time: "5 sec" },
    ],
  },
  {
    id: "sop-4",
    cadence: "sop",
    title: "SOP 4 — Publish a Cellar Journal entry",
    blurb: "When: weekly, minimum once. This is your SEO flywheel — every entry ranks a long-tail question over time. ~10-20 min.",
    steps: [
      { what: "Pick a question you actually answered this week — Why did X? How much Y? What's the difference between A and B?", href: "/cellar-journal", time: "2 min" },
      { what: "Open the editor. Write in your own voice — amateur, curious, honest. 200-500 words.", href: "/admin/cellar-journal/new", time: "10-15 min", why: "Include one specific chemistry number (SO₂ ppm, TA g/L, pH) and one specific producer or region. Cite AWRI/WSET where relevant." },
      { what: "Add 3-5 tags. Reuse existing tags where you can.", href: "/admin/cellar-journal/new", time: "30 sec" },
      { what: "Preview. Fix typos. Publish. OG image + RSS ping happen automatically.", href: "/admin/cellar-journal/new", time: "2 min", why: "Don't over-edit. The point is compounding volume, not perfect posts. If it took >30 min, ship it and move on." },
    ],
  },
  {
    id: "sop-5",
    cadence: "sop",
    title: "SOP 5 — Handle a Founding Member reservation",
    blurb: "When: as soon as one lands. You'll get an email + the widget updates. ~10 min per reservation.",
    steps: [
      { what: "Open the reservation email in Gmail, or the Recent Reservations widget.", href: "/admin/settings", time: "30 sec" },
      { what: "Reply within 4 hours from support@ownology.ai. Personal, short.", href: "https://mail.google.com/mail/u/0/#inbox", time: "5 min", why: "Use: 'Rich here — Gel's on the way in. We saw your reservation. Free for a 20-min call this week?'" },
      { what: "Schedule the call (Calendly or manual). Add to your calendar.", href: "https://calendly.com", time: "2 min" },
      { what: "On the call: hear their story. Don't pitch. Ask about vintage, bottleneck, tools. Close on founding-member offer only if it fits.", href: "#", time: "20 min", why: "Founding members convert when they FEEL you're the real deal. First 4 hours matter more than any offer terms." },
      { what: "Update reservation status: contacted → booked → paid.", href: "/admin/settings", time: "20 sec" },
    ],
  },
  {
    id: "sop-6",
    cadence: "sop",
    title: "SOP 6 — Log equipment use during vintage",
    blurb: "When: every time a pump/hose/tank/press touches a batch. ~30 sec per event. This is the traceability thread FSANZ 3.2.2 auditors want.",
    steps: [
      { what: "Open the Cellar Board. Find the vessel you just used.", href: "/admin/cellar-board", time: "5 sec", why: "Green = sanitised in last 72h + empty. Amber = needs clean. Red = holding wine. Grey = fault." },
      { what: "Expand the vessel drawer → hit '+ Log equipment use'.", href: "/admin/cellar-board", time: "5 sec" },
      { what: "If a RED SANITATION BANNER fires (amber/red vessel), pause. Either clean + sanitise before logging, OR tick the acknowledgement checkbox to log against warnings.", href: "/admin/cellar-board", time: "as needed", why: "Ticking the checkbox is auditable — it's evidence you saw the risk. If you clean first, log a 'sanitise' cellar task via SOP 1 to flip the vessel green, THEN log the use." },
      { what: "Pick the batch, direction (in/out/pass), phase (auto-fills from vessel), notes if useful. Submit.", href: "/admin/cellar-board", time: "20 sec" },
      { what: "Board refreshes automatically — the vessel flips to Red if the batch is now inside it.", href: "/admin/cellar-board", time: "instant", why: "That flip IS your recall-readiness evidence." },
    ],
  },
  {
    id: "sop-7",
    cadence: "sop",
    title: "SOP 7 — Weekly BD Digest triage (Monday)",
    blurb: "When: Monday 05:30 AEST the digest hits your inbox. ~15 min to work the reply samples + hot prospects.",
    steps: [
      { what: "Open the digest email. Scan the funnel chips (sends / opens / clicks / hot alerts / booked).", href: "https://mail.google.com/mail/u/0/#inbox", time: "1 min", why: "Digest is generated by /api/scheduled/weekly-bd-digest — env vars RESEND_API_KEY + OPERATOR_ALERT_EMAIL must be set on Railway." },
      { what: "Reply first to every 'Interested' sentiment sample — those are your warmest leads this week.", href: "/admin/contacts/pipeline", time: "5 min" },
      { what: "Bump every 'Not-now' with a soft one-liner ('Circling back when you're through vintage — no pressure').", href: "/admin/contacts/pipeline", time: "3 min" },
      { what: "Open each of the Top 3 Hottest Un-booked — send a follow-up SMS if they haven't been touched in >5 days.", href: "/admin/contacts/pipeline", time: "5 min", why: "'Un-booked with 3+ views' is the highest-conversion cohort. Ignore for 2 weeks and they cool to zero." },
      { what: "If the digest didn't fire at 05:30 → dry-run it manually + check Railway env vars.", href: "/api/scheduled/weekly-bd-digest?dryRun=1", time: "1 min" },
    ],
  },
  {
    id: "break",
    cadence: "break",
    title: "When things break",
    blurb: "Fast triage. Each row is a one-shot fix. If none work, screenshot the console and send to Rich.",
    steps: [
      { what: "Emails not sending? Dry-run the Resend cron and check the response for 'not verified'.", href: "/api/scheduled/daily-alert-email?dryRun=1", why: "If verified but silent, check spam. First 20 emails from a new domain sometimes ghost-drop." },
      { what: "Theme stuck / site looks wrong? Hard refresh (⌘⇧R), then cycle theme via the pill (bottom-right).", href: "/", why: "If a red console error appears, screenshot and send to Rich for triage." },
      { what: "Changes not showing at ownology.ai? Preview vs prod check — if visible in preview, redeploy from Emergent Dashboard.", href: "https://ownology.ai", why: "Cloudflare cache is 5 min so you may see stale for a few more min after deploy." },
      { what: "Reservation not visible? Check the Recent Reservations widget first, then Gmail spam.", href: "/admin/settings" },
      { what: "Emergent LLM key balance zero? Go to Emergent Dashboard → Profile → Universal Key → Add balance + auto-topup.", href: "https://app.emergent.sh", why: "Cellar Brief AI generation pauses until balance restored. Chemistry logs still work." },
    ],
  },
];

// ─── Reset scheduling ────────────────────────────────────────────────────
// Daily rows reset at midnight local. Weekly rows reset every Monday.
// We keyx the localStorage entry by cadence + reset-window so it just
// auto-clears when the window rolls over.
function dailyKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
function weeklyKey(): string {
  const d = new Date();
  const day = d.getDay(); // 0=Sun 1=Mon
  const daysSinceMon = (day + 6) % 7;
  const monday = new Date(d);
  monday.setDate(d.getDate() - daysSinceMon);
  const y = monday.getFullYear();
  const m = String(monday.getMonth() + 1).padStart(2, "0");
  const dd = String(monday.getDate()).padStart(2, "0");
  return `week-${y}-${m}-${dd}`;
}
/** SOP + vintage + break checkboxes are permanent per-section (they're
 *  "have I ever done this" not "did I do this today"). */
function stableKey(): string {
  return "stable";
}
function windowForCadence(c: Cadence): string {
  if (c === "daily") return dailyKey();
  if (c === "weekly") return weeklyKey();
  return stableKey();
}
function storageKey(sectionId: string, cadence: Cadence): string {
  return `ownology_playbook_${sectionId}_${windowForCadence(cadence)}`;
}

// ─── Component ──────────────────────────────────────────────────────────
const AMBER = "var(--ow-amber)";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";
const BORDER = "var(--ow-border)";
const CARD_BG = "var(--ow-card-bg)";

function cadenceLabel(c: Cadence): string {
  return { daily: "DAILY", weekly: "WEEKLY", vintage: "VINTAGE-CRITICAL", sop: "WORKFLOW SOP", break: "TROUBLESHOOTING" }[c];
}
function cadenceColor(c: Cadence): string {
  return {
    daily: "oklch(0.62 0.16 145)",     // green
    weekly: "oklch(0.62 0.13 220)",    // teal
    vintage: "oklch(0.62 0.20 25)",    // red
    sop: AMBER,                          // amber
    break: "oklch(0.55 0.02 260)",     // grey
  }[c];
}

function useChecklist(sectionId: string, cadence: Cadence, count: number) {
  const key = storageKey(sectionId, cadence);
  const [checked, setChecked] = useState<boolean[]>(() => new Array(count).fill(false));

  // On mount: hydrate from localStorage. Also, once per second check if the
  // storage window rolled over (crossed midnight / new week) and if so, wipe.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length === count) {
          setChecked(parsed.map(Boolean));
        }
      }
    } catch {
      // ignore corrupt storage
    }
  }, [key, count]);

  const toggle = useCallback(
    (idx: number) => {
      setChecked((prev) => {
        const next = prev.slice();
        next[idx] = !next[idx];
        try {
          localStorage.setItem(key, JSON.stringify(next));
        } catch {
          // storage quota / private mode — silent fallback
        }
        return next;
      });
    },
    [key]
  );

  const done = checked.filter(Boolean).length;
  return { checked, toggle, done };
}

function SectionCard({ section }: { section: Section }) {
  const { checked, toggle, done } = useChecklist(section.id, section.cadence, section.steps.length);
  const pct = section.steps.length === 0 ? 0 : Math.round((done / section.steps.length) * 100);

  return (
    <section
      data-testid={`playbook-section-${section.id}`}
      style={{ marginBottom: "2rem", background: CARD_BG, border: `1px solid ${BORDER}`, borderRadius: 4, padding: "1.25rem 1.25rem 0.75rem" }}
    >
      {/* Header row */}
      <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.3rem" }}>
        <span
          style={{
            fontSize: "0.55rem",
            letterSpacing: "0.14em",
            textTransform: "uppercase",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            padding: "0.15rem 0.4rem",
            borderRadius: 3,
            background: cadenceColor(section.cadence),
            color: "white",
          }}
        >
          {cadenceLabel(section.cadence)}
        </span>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.15rem", color: TEXT_HI, margin: 0 }}>
          {section.title}
        </h2>
        <span
          data-testid={`playbook-progress-${section.id}`}
          style={{ marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem", color: pct === 100 ? cadenceColor(section.cadence) : TEXT_LO }}
        >
          {done}/{section.steps.length}
        </span>
      </div>
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.78rem", color: TEXT_LO, marginBottom: "0.85rem", lineHeight: 1.55 }}>
        {section.blurb}
      </p>

      {/* Steps */}
      <ol style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {section.steps.map((step, idx) => {
          const isChecked = checked[idx];
          const isExternal = step.href.startsWith("http") || step.href.startsWith("/api/");
          const isPlaceholder = step.href === "#";
          return (
            <li
              key={idx}
              data-testid={`playbook-step-${section.id}-${idx}`}
              style={{
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: "0.75rem",
                padding: "0.7rem 0",
                borderBottom: idx === section.steps.length - 1 ? "none" : `1px solid ${BORDER}`,
                alignItems: "start",
              }}
            >
              {/* Checkbox */}
              <button
                type="button"
                onClick={() => toggle(idx)}
                data-testid={`playbook-check-${section.id}-${idx}`}
                aria-label={isChecked ? "Mark step incomplete" : "Mark step complete"}
                style={{
                  marginTop: "0.15rem",
                  width: 20,
                  height: 20,
                  border: `1.5px solid ${isChecked ? cadenceColor(section.cadence) : BORDER}`,
                  borderRadius: 3,
                  background: isChecked ? cadenceColor(section.cadence) : "transparent",
                  color: "white",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "0.75rem",
                  fontWeight: 700,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                {isChecked ? "✓" : ""}
              </button>

              {/* Content */}
              <div>
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontSize: "0.9rem",
                    color: isChecked ? TEXT_LO : TEXT_HI,
                    textDecoration: isChecked ? "line-through" : "none",
                    margin: 0,
                    lineHeight: 1.45,
                  }}
                >
                  <span style={{ color: TEXT_MID, marginRight: "0.4rem", fontFamily: "'JetBrains Mono', monospace", fontSize: "0.75rem" }}>
                    {idx + 1}.
                  </span>
                  {step.what}
                </p>
                {step.why && (
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontSize: "0.74rem",
                      color: TEXT_LO,
                      margin: "0.3rem 0 0",
                      lineHeight: 1.5,
                      fontStyle: "italic",
                    }}
                  >
                    {step.why}
                  </p>
                )}
              </div>

              {/* CTA */}
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.25rem", minWidth: 100 }}>
                {step.time && (
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.65rem", color: TEXT_LO }}>
                    {step.time}
                  </span>
                )}
                {isPlaceholder ? (
                  <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.72rem", color: TEXT_LO, fontStyle: "italic" }}>
                    (offline)
                  </span>
                ) : isExternal ? (
                  <a
                    href={step.href}
                    target="_blank"
                    rel="noreferrer"
                    data-testid={`playbook-link-${section.id}-${idx}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: AMBER, textDecoration: "none", borderBottom: `1px dotted ${AMBER}`, padding: "0.05rem 0" }}
                  >
                    open ↗
                  </a>
                ) : (
                  <Link
                    href={step.href}
                    data-testid={`playbook-link-${section.id}-${idx}`}
                    style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem", color: AMBER, textDecoration: "none", borderBottom: `1px dotted ${AMBER}`, padding: "0.05rem 0" }}
                  >
                    {step.href} →
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

export default function AdminPlaybook() {
  const totalSteps = SECTIONS.reduce((n, s) => n + s.steps.length, 0);

  // Group tabs — kept as a scroll-jump index at the top, since we don't
  // want a modal or a page-turn. Everything's on one scroll.
  const jumps = SECTIONS.map((s) => ({ id: s.id, label: s.title.split("—")[0].trim() }));

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg)", paddingBottom: "4rem" }}>
      <div style={{ maxWidth: 820, margin: "0 auto", padding: "3rem 1.5rem 1rem" }}>
        {/* Eyebrow */}
        <p
          data-testid="playbook-eyebrow"
          style={{ color: AMBER, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", fontFamily: "'Lato', sans-serif", marginBottom: "0.6rem" }}
        >
          Playbook · {totalSteps} steps · clickable
        </p>

        {/* Title */}
        <h1
          data-testid="playbook-title"
          style={{ fontFamily: "'Fraunces', serif", fontSize: "clamp(2rem, 5vw, 3rem)", color: TEXT_HI, lineHeight: 1.1, marginBottom: "1rem" }}
        >
          Learn Ownology by clicking through it.
        </h1>

        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.95rem", color: TEXT_MID, lineHeight: 1.6, maxWidth: 620, marginBottom: "0.6rem" }}>
          Every step is a link. Tick the box when you've done it — daily rows reset at midnight, weekly rows reset each Monday. SOPs, vintage checkpoints, and troubleshooting stay ticked once you've done them.
        </p>

        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: TEXT_LO, marginBottom: "2rem" }}>
          Not a document. A working checklist. Once you've been through every section once and know it in your body, the customer-facing version at <span style={{ color: AMBER }}>/how-to-use</span> becomes trivial to write.
        </p>

        {/* Jump index */}
        <nav
          data-testid="playbook-jumps"
          style={{
            display: "flex",
            gap: "0.4rem",
            flexWrap: "wrap",
            marginBottom: "2rem",
            padding: "0.75rem",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
          }}
        >
          {jumps.map((j) => (
            <a
              key={j.id}
              href={`#${j.id}`}
              data-testid={`playbook-jump-${j.id}`}
              style={{
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.72rem",
                color: TEXT_MID,
                textDecoration: "none",
                padding: "0.35rem 0.65rem",
                border: `1px solid ${BORDER}`,
                borderRadius: 3,
              }}
            >
              {j.label}
            </a>
          ))}
        </nav>

        {/* Sections */}
        {SECTIONS.map((s) => (
          <div key={s.id} id={s.id}>
            <SectionCard section={s} />
          </div>
        ))}

        {/* Footer note */}
        <div
          style={{
            marginTop: "2rem",
            padding: "1rem",
            background: CARD_BG,
            border: `1px solid ${BORDER}`,
            borderRadius: 4,
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.8rem",
            color: TEXT_LO,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: TEXT_HI }}>Living document.</strong> When a step no longer matches the app, edit
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.35rem", margin: "0 0.25rem", borderRadius: 2 }}>
            client/src/pages/AdminPlaybook.tsx
          </code>
          — the full-length reference lives in
          <code style={{ background: "oklch(0 0 0 / 0.15)", padding: "0.05rem 0.35rem", margin: "0 0.25rem", borderRadius: 2 }}>
            memory/PLAYBOOK.md
          </code>
          if you ever need the long-form paragraphs.
        </div>
      </div>
    </div>
  );
}
