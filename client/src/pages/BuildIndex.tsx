/**
 * BUILD INDEX — Internal testing page only.
 * Remove the /build-index route in App.tsx before going live.
 */

import { Link } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Colour tokens (matches Ownology dark theme) ──────────────────────────────
const BG       = "var(--ow-bg-base)";
const BG_CARD  = "var(--ow-bg-raised)";
const BORDER   = "var(--ow-border)";
const AMBER    = "var(--ow-amber)";
const TEXT_HI  = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO  = "var(--ow-text-lo)";

// ─── Types ────────────────────────────────────────────────────────────────────
type FeatureItem = {
  label: string;
  href?: string;           // direct link
  anchor?: string;         // instruction for tab/section (no link)
  sprint?: string;         // sprint tag
  dr?: string;             // design requirement reference
  desc: string;
  status: "live" | "partial" | "stub";
};

type Section = {
  title: string;
  icon: string;
  items: FeatureItem[];
};

// ─── Feature map ─────────────────────────────────────────────────────────────
const SECTIONS: Section[] = [
  {
    title: "Top-level Pages",
    icon: "🗺",
    items: [
      { label: "Home / Landing",          href: "/",                   desc: "Dark artisan landing page — hero, features, demo, FAQ, waitlist.", status: "live" },
      { label: "Production Dashboard",    href: "/dashboard",          sprint: "S1", dr: "DR-19", desc: "KPI cards: active tanks, litres in ferment, bottling queue, per-tank status grid.", status: "live" },
      { label: "The Press",               href: "/the-press",          desc: "Main winery operations hub — 6 tabs (see below).", status: "live" },
      { label: "Quick Entry",             href: "/quick-entry",        desc: "Mobile-first rapid log entry form — no auth wall in build phase.", status: "live" },
      { label: "Cellar Tasks",            href: "/cellar-tasks",       dr: "DR-03", desc: "Equipment register, AI-generated cleaning/maintenance tasks, vessel badges.", status: "live" },
      { label: "Free Run",                href: "/free-run",           desc: "Compliance AI chat — ask any winemaking regulatory question.", status: "live" },
      { label: "Compliance",              href: "/compliance",         dr: "DR-11", desc: "Jurisdiction-filtered regulatory Q&A with source citations.", status: "live" },
      { label: "Regulations",             href: "/regulations",        desc: "Regulation library browser by jurisdiction.", status: "live" },
      { label: "Resources",               href: "/resources",          desc: "Resource hub — links to Home Winemaker kit, compliance guides.", status: "live" },
      { label: "Why Ownology",            href: "/why-ownology",       desc: "Value proposition and competitive positioning page.", status: "live" },
      { label: "Pricing",                 href: "/pricing",            desc: "Founding member pricing tiers and Stripe checkout.", status: "live" },
      { label: "Blog",                    href: "/blog",               desc: "Editorial blog — Trinity filter tabs (The Science / The Vineyard / The Craft).", status: "live" },
      { label: "Blog Article — Weight of Harvest", href: "/blog/weight-of-harvest", desc: "Full article: The Weight of Harvest — cognitive load relief framing.", status: "live" },
      { label: "Blog Article — Two Philosophies",  href: "/blog/two-philosophies",  desc: "Full article: Two Philosophies, One Grape — boutique vs commercial winemaking.", status: "live" },
      { label: "Merch",                   href: "/merch",              desc: "Branded merchandise store with Stripe checkout.", status: "live" },
      { label: "Preview (customer)",      href: "/preview",            desc: "Email-gated customer brochure — do not edit.", status: "live" },
    ],
  },
  {
    title: "The Press — Tabs",
    icon: "📋",
    items: [
      { label: "Vintage Log tab",         href: "/the-press",          anchor: "Open The Press → Vintage Log (default tab)", sprint: "S1", dr: "DR-01", desc: "Log entries per tank: inoculation, measurement, addition, racking, observation, pre-harvest sample, bottling run.", status: "live" },
      { label: "Milestones tab",          href: "/the-press",          anchor: "Open The Press → Milestones tab", dr: "DR-06", desc: "Calendar view of fermentation milestones per tank. Kit Wine variety included.", status: "live" },
      { label: "Barrels tab",             href: "/the-press",          anchor: "Open The Press → Barrels tab", sprint: "S2", dr: "DR-08", desc: "Barrel register: oak type, age, fill date, wine lot, topping log. Add/edit/delete.", status: "live" },
      { label: "Calculations tab",        href: "/the-press",          anchor: "Open The Press → Calculations tab", desc: "Winemaking calculators: SO₂, acid, sugar, YAN.", status: "live" },
      { label: "Cellar Scenarios tab",    href: "/the-press",          anchor: "Open The Press → Cellar Scenarios tab", desc: "AI scenario planner — describe a problem, get a structured cellar response plan.", status: "live" },
      { label: "Batch Book tab",          href: "/the-press",          anchor: "Open The Press → Batch Book tab", dr: "DR-12", desc: "Batch register with variety, GI, grower, volume. Lot Traceability panel below.", status: "live" },
    ],
  },
  {
    title: "The Press — Sprint 1 Features",
    icon: "⚗",
    items: [
      { label: "Inline AI Interpretation", href: "/the-press",         anchor: "Log a measurement entry → click 'Interpret' button", sprint: "S1", dr: "DR-01", desc: "LLM interprets any measurement in context of variety + days since inoculation.", status: "live" },
      { label: "Export Log PDF",           href: "/the-press",         anchor: "Vintage Log tab → 'Export Log PDF' button above the list", sprint: "S1", dr: "DR-20", desc: "LIP-compliant Winemaker's Log PDF — lot number, variety, GI, all events with dates and quantities.", status: "live" },
      { label: "Volume field on batches",  href: "/the-press",         anchor: "Batch Book tab → register or edit a batch", sprint: "S1", dr: "DR-04", desc: "Volume Litres field on every batch record.", status: "live" },
      { label: "Kit Wine Tracker",         href: "/the-press",         anchor: "Log a Kit Wine inoculation → tracker auto-appears", dr: "DR-05", desc: "Day-by-day checklist: bentonite, sorbate, fining, bottling. Progress saved in localStorage.", status: "live" },
    ],
  },
  {
    title: "The Press — Sprint 2 Features",
    icon: "🪵",
    items: [
      { label: "Pre-Harvest Sample event", href: "/the-press",         anchor: "New Log Entry → Event Type → Pre-Harvest Sample", sprint: "S2", dr: "DR-07", desc: "Fields: block name, Brix, TA, pH, YAN, phenolics, notes.", status: "live" },
      { label: "Bottling Run event",       href: "/the-press",         anchor: "New Log Entry → Event Type → Bottling Run", sprint: "S2", dr: "DR-12", desc: "Fields: volume, lot number, bottle format, label name, notes.", status: "live" },
      { label: "Lot Traceability panel",   href: "/the-press",         anchor: "Batch Book tab → scroll to 'Lot Traceability' section", sprint: "S2", dr: "DR-12", desc: "Lists all bottling runs linked to their registered batch — lot → batch trace.", status: "live" },
      { label: "Reminders & Alarms",       href: "/the-press",         anchor: "Tank card → bell icon to set reminder", dr: "DR-02", desc: "Per-tank reminders with interval, Heartbeat handler fires owner notification when overdue.", status: "live" },
    ],
  },
  {
    title: "Cellar Tasks — Sprint 2 Features",
    icon: "🛢",
    items: [
      { label: "Vessel linkage on tasks",  href: "/cellar-tasks",      anchor: "Task cards show vessel badge (tank/barrel/other)", sprint: "S2", dr: "DR-03", desc: "vessel_id and vessel_type fields on cellar_tasks; badge shown on every task card.", status: "live" },
      { label: "Equipment maintenance",    href: "/cellar-tasks",      anchor: "Generate Tasks on equipment → includes 'maintain' type", sprint: "S2", dr: "DR-10", desc: "AI task generator includes maintenance tasks; vessel badge links task to specific vessel.", status: "live" },
    ],
  },
  {
    title: "Home Winemaker Section",
    icon: "🏠",
    items: [
      { label: "For Home Winemakers",      href: "/for-home-winemakers",              desc: "Landing page: feature grid, sample questions, resource strip.", status: "live" },
      { label: "DIY Knowledge Hub",        href: "/for-home-winemakers/knowledge",     desc: "Home winemaker knowledge library — guides, tips, recipes.", status: "live" },
      { label: "Home Winery Kit",          href: "/resources/home-winery-kit",        desc: "Kit checklist, AI CTA pre-filled with HomeWinemaker filter.", status: "live" },
      { label: "Troubleshooting Guide",    href: "/for-home-winemakers/troubleshooting", desc: "8-fault searchable accordion: stuck ferment, H₂S, VA, Brett, oxidation, etc.", status: "live" },
      { label: "Glossary",                 href: "/for-home-winemakers/glossary",      desc: "50+ terms, A-Z filter, live search.", status: "live" },
      { label: "Vessel type on log entry", href: "/the-press",         anchor: "New Log Entry → Step 1 → Vessel Type selector", desc: "Tank / Carboy / Barrel / Demijohn toggle saved in entry details.", status: "live" },
      { label: "Kit Wine variety",         href: "/the-press",         anchor: "New Log Entry → Variety → Kit Wine option", desc: "Kit Wine in COMMON_VARIETIES with amber badge in Milestones calendar.", status: "live" },
    ],
  },
  {
    title: "Commercial & Admin",
    icon: "💼",
    items: [
      { label: "Admin Panel",                     href: "/admin",                          desc: "Owner-only hub: links to all admin sub-pages.", status: "live" },
      { label: "Admin — Leads",                    href: "/admin/leads",                    desc: "Waitlist lead management — view, export, manage signups.", status: "live" },
      { label: "Admin — Compliance Doctrine",      href: "/admin/compliance-doctrine",      desc: "Owner editor for the compliance AI knowledge base.", status: "live" },
      { label: "Admin — Vintage Intelligence",     href: "/admin/vintage-intelligence",     desc: "Owner view of vintage log intelligence and analytics.", status: "live" },
      { label: "Admin — WBS",                      href: "/admin/wbs",                      desc: "Work breakdown structure / project tracking view.", status: "live" },
      { label: "Campaign Metrics",                 href: "/campaign-metrics",               desc: "Email campaign analytics dashboard with trend charts and KPI cards.", status: "live" },
      { label: "Orders / Payments",                href: "/orders",                         desc: "Stripe payment history — last 50 sessions with line items.", status: "live" },
      { label: "Competitive Advantage",            href: "/competitive-advantage",          desc: "7-competitor grid, feature matrix, Australian compliance moat, investment thesis.", status: "live" },
      { label: "For Vintrace Users",               href: "/for-vintrace-users",             desc: "Migration landing page targeting Vintrace users.", status: "live" },
      { label: "For InnoVint Users",               href: "/for-innovint-users",             desc: "Migration landing page targeting InnoVint users.", status: "live" },
    ],
  },
  {
    title: "Sprint 3 — Completed",
    icon: "✅",
    items: [
      { label: "Packaging Inventory",         href: "/the-press",         anchor: "Open The Press → Packaging tab", sprint: "S3", dr: "DR-15", desc: "Bottle/closure/label/capsule/carton stock tracking with low-stock alerts and usage log.", status: "live" },
      { label: "Weather Event logging",       href: "/the-press",         anchor: "New Log Entry → Event Type → Weather Event", sprint: "S3", dr: "DR-16", desc: "Structured weather event: frost, hail, heat event, rain, wind, other — with severity and affected area.", status: "live" },
      { label: "Vintage Card PDF",            href: "/the-press",         anchor: "Batch Book tab → select a batch → 'Vintage Card' button", sprint: "S3", dr: "DR-18", desc: "LLM-generated shareable vintage summary PDF from the batch's observation log.", status: "live" },
      { label: "Cellar Value widget",         href: "/dashboard",         anchor: "Production Dashboard → scroll to Cellar Value section", sprint: "S3", dr: "DR-17", desc: "Tied capital estimate from active ferment volumes × cost-per-litre (industry range or user-entered).", status: "live" },
    ],
  },
  {
    title: "Sprint 4 — Completed",
    icon: "✅",
    items: [
      { label: "Vineyard page",               href: "/vineyard",          sprint: "S4", dr: "DR-21", desc: "Vineyard block register with variety, area, rootstock, trellis, irrigation, soil type.", status: "live" },
      { label: "Production Planning cards",   href: "/dashboard",         anchor: "Production Dashboard → Production Planning section", sprint: "S4", dr: "DR-19", desc: "Bottling Queue, Active Ferments, and AI Cellar Tasks cards on the Dashboard.", status: "live" },
    ],
  },
  {
    title: "Sprint 5 — Completed",
    icon: "✅",
    items: [
      { label: "Cost-per-litre on batches",   href: "/the-press",         anchor: "Batch Book tab → register a batch → Cost Per Litre field", sprint: "S5", dr: "DR-17", desc: "Optional $/L field on every wine batch; Dashboard Cellar Value shows ACTUAL vs estimate when set.", status: "live" },
      { label: "Multi-Vintage Comparison",    href: "/dashboard",         anchor: "Production Dashboard → Multi-Vintage Comparison section", sprint: "S5", dr: "DR-15", desc: "Table grouping all batches by vintage with variety, tank, volume, inoculation date, and status badge.", status: "live" },
      { label: "PWA Install Prompt",          anchor: "Visit the app on mobile Chrome/Edge → install banner appears at bottom", sprint: "S5", dr: "DR-23", desc: "manifest.json, theme-color meta, Apple PWA tags, and custom install banner with localStorage dismiss.", status: "live" },
    ],
  },
  {
    title: "Sprint 6 — Completed (All 27 DRs now Full coverage)",
    icon: "✅",
    items: [
      { label: "Live tank volume balance",         href: "/the-press",     anchor: "New Log Entry → Racking → log a racking event; Current Volume on batch header updates automatically", sprint: "S6", dr: "DR-04", desc: "Auto-update current volume on racking events; live CURRENT VOL badge on each batch header card in Batch Book.", status: "live" },
      { label: "Sanitation event type",            href: "/the-press",     anchor: "New Log Entry → Event Type → Sanitation", sprint: "S6", dr: "DR-03", desc: "‘Sanitation’ event type with fields: equipment/vessel, sanitant, concentration, contact time, and notes.", status: "live" },
      { label: "Export documentation generator",  href: "/the-press",     anchor: "The Press → Export Docs tab", sprint: "S6", dr: "DR-11", desc: "AWBC-style Movement Advice (pre-filled from batch data, downloadable .txt) and Label Compliance Checklist (15 items, progress bar).", status: "live" },
      { label: "Vineyard disease/pest event type", href: "/vineyard",      anchor: "Vineyard → expand a block → Add Observation → Pest Scouting or Disease/Pest Event", sprint: "S6", dr: "DR-06", desc: "Two new structured observation types: Pest Scouting and Disease/Pest Event, alongside existing Disease Scouting.", status: "live" },
      { label: "Equipment fault log",              href: "/cellar-tasks",  anchor: "Cellar Tasks → expand equipment → Log Fault button", sprint: "S6", dr: "DR-10", desc: "Fault log task type (red badge) with fault description, downtime hours, resolution, and notes fields. Inline form per equipment item.", status: "live" },
    ],
  },
  {
    title: "Sprint 7 — Knowledge Platform (SOP Library, Decision Logic, Vintage Notes, Training Records)",
    icon: "📚",
    items: [
      { label: "Knowledge Platform home",        href: "/knowledge",      sprint: "S7", desc: "8-category SOP library grid with search, category filter, and quick-access cards. Seeded with 31 pre-written SOPs across Fermentation, Sanitation, Barrels, Bottling, Lab, Onboarding, Food Safety, and Traceability.", status: "live" },
      { label: "Guide — Getting Started",          href: "/guide",          sprint: "S7", desc: "Onboarding guide: step-by-step walkthrough of Ownology features for new users.", status: "live" },
      { label: "Import",                           href: "/import",         sprint: "S7", desc: "Data import tool — bulk import vintage log entries or batch records.", status: "live" },
      { label: "Vine Reference",                   href: "/reference/vine", sprint: "S7", desc: "Vine variety reference library — variety cards with characteristics and notes.", status: "live" },
      { label: "Waitlist page",                    href: "/waitlist",                     desc: "Standalone waitlist signup page.", status: "live" },
      { label: "Founding Member Success",          href: "/founding-member/success",      desc: "Post-checkout founding member confirmation page.", status: "live" },
      { label: "SOP detail view",                href: "/knowledge",      anchor: "Knowledge → any category → click any SOP card", sprint: "S7", desc: "Full SOP procedure text, Decision Logic notes (winemaker reasoning), Tribal Knowledge field (equipment quirks, supplier preferences), and Vintage Notes history.", status: "live" },
      { label: "Vintage Lessons Log",            href: "/knowledge",      anchor: "Knowledge → any SOP → Vintage Notes tab → Add Note", sprint: "S7", desc: "Per-SOP vintage notes with What Worked, What Failed, Seasonal Observations, and Winemaker Notes fields. Grouped by vintage year.", status: "live" },
      { label: "Training Records module",        href: "/knowledge",      anchor: "Knowledge → Training Records tab → New Session", sprint: "S7", desc: "Create training sessions with title, date, trainer, trainees, and topics covered. Downloadable sign-off record. Full session history.", status: "live" },
      { label: "Tribal Knowledge capture",       href: "/knowledge",      anchor: "Knowledge → any SOP → Tribal Knowledge field → Edit", sprint: "S7", desc: "Per-SOP free-text field for equipment quirks, preferred suppliers, site-specific practices, and winemaker preferences — the knowledge that never makes it into formal SOPs.", status: "live" },
      { label: "CSU Academic Backbone",          href: "/free-run",       anchor: "Free Run → scroll to 'The Academic Backbone' section", sprint: "S7", desc: "6 CSU Bachelor of Wine Science subject cards (WSC202, WSC318, WSC319, WSC303, WSC321, MCR101) with key topics and links to corresponding Ownology SOPs. Sourced from CSU Handbook 2026 (public information only).", status: "live" },
      { label: "Free Run → Knowledge bridge",    href: "/free-run",       anchor: "Free Run → 'From learning to doing' banner", sprint: "S7", desc: "Banner linking Free Run lessons to live SOPs in the Knowledge Platform — closing the loop between education and operations.", status: "live" },
    ],
  },
];

// ─── Status badge ─────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: FeatureItem["status"] }) {
  const map = {
    live:    { label: "LIVE",    bg: "oklch(0.25 0.06 145)", color: "oklch(0.75 0.15 145)" },
    partial: { label: "PARTIAL", bg: "oklch(0.22 0.06 75)",  color: AMBER },
    stub:    { label: "PLANNED", bg: "oklch(0.18 0.005 60)", color: TEXT_LO },
  };
  const s = map[status];
  return (
    <span style={{
      fontFamily: "'Fira Code', monospace",
      fontSize: "0.6rem",
      letterSpacing: "0.1em",
      padding: "0.15rem 0.45rem",
      borderRadius: "2px",
      background: s.bg,
      color: s.color,
      flexShrink: 0,
    }}>
      {s.label}
    </span>
  );
}

// ─── Feature row ──────────────────────────────────────────────────────────────
function FeatureRow({ item }: { item: FeatureItem }) {
  const inner = (
    <div
      className="flex items-start gap-3 px-4 py-3 rounded-sm"
      style={{
        background: item.href ? BG_CARD : "transparent",
        border: `1px solid ${item.href ? BORDER : "transparent"}`,
        cursor: item.href ? "pointer" : "default",
        transition: "border-color 0.15s",
      }}
      onMouseEnter={e => { if (item.href) (e.currentTarget as HTMLDivElement).style.borderColor = "color-mix(in oklch, var(--ow-amber) 40%, transparent)"; }}
      onMouseLeave={e => { if (item.href) (e.currentTarget as HTMLDivElement).style.borderColor = BORDER; }}
    >
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 600, fontSize: "0.875rem", color: item.href ? AMBER : TEXT_MID }}>
            {item.label}
          </span>
          {item.sprint && (
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.6rem", color: TEXT_LO, letterSpacing: "0.08em" }}>
              {item.sprint}
            </span>
          )}
          {item.dr && (
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.6rem", color: "color-mix(in oklch, var(--ow-amber) 70%, var(--ow-bg-base))", letterSpacing: "0.08em" }}>
              {item.dr}
            </span>
          )}
          <StatusBadge status={item.status} />
        </div>
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8125rem", color: TEXT_MID, marginTop: "0.2rem", lineHeight: 1.5 }}>
          {item.desc}
        </p>
        {item.anchor && (
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: TEXT_LO, marginTop: "0.25rem" }}>
            ↳ {item.anchor}
          </p>
        )}
      </div>
      {item.href && (
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" style={{ flexShrink: 0, marginTop: "2px", color: TEXT_LO }}>
          <path d="M3 7h8M7 3l4 4-4 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      )}
    </div>
  );

  return item.href ? (
    <Link href={item.href}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function BuildIndex() {
  return (
    <div style={{ background: BG, minHeight: "100vh", paddingBottom: "4rem" }}>
      {/* Header */}
      <div
        className="sticky top-0 z-40 px-6 py-3 flex items-center justify-between"
        style={{ background: "var(--ow-nav-bg)", backdropFilter: "blur(8px)", borderBottom: `1px solid ${BORDER}` }}
      >
        <div className="flex items-center gap-3">
          <OwnologyLogo size={28} />
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", letterSpacing: "0.12em", color: AMBER }}>
            BUILD INDEX
          </span>
          <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", color: TEXT_LO, letterSpacing: "0.08em" }}>
            v5 · 7 sprints · 27/27 DRs met · 31 SOPs seeded — remove before launch
          </span>
        </div>
        <Link href="/" style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", fontWeight: 300, color: TEXT_LO, textDecoration: "none" }}>
          ← Home
        </Link>
      </div>

      {/* Summary bar */}
      <div className="px-6 py-5 max-w-4xl mx-auto">
        <div
          className="flex flex-wrap gap-4 px-5 py-4 rounded-sm"
          style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
        >
          {[
            { label: "Pages & Features", value: "84" },
            { label: "Sprints completed", value: "7" },
            { label: "DRs fully met", value: "27 / 27" },
            { label: "SOPs seeded", value: "31" },
          ].map(s => (
            <div key={s.label} className="flex flex-col">
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "1.1rem", color: AMBER, fontWeight: 700 }}>{s.value}</span>
              <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.7rem", color: TEXT_LO, letterSpacing: "0.06em" }}>{s.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Sections */}
      <div className="px-6 max-w-4xl mx-auto flex flex-col gap-10">
        {SECTIONS.map(section => (
          <div key={section.title}>
            <div className="flex items-center gap-2 mb-3">
              <span style={{ fontSize: "1rem" }}>{section.icon}</span>
              <h2 style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: "1rem",
                color: TEXT_HI,
                letterSpacing: "-0.01em",
              }}>
                {section.title}
              </h2>
              <div style={{ flex: 1, height: "1px", background: BORDER, marginLeft: "0.5rem" }} />
            </div>
            <div className="flex flex-col gap-1.5">
              {section.items.map(item => (
                <FeatureRow key={item.label} item={item} />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Footer note */}
      <div className="px-6 max-w-4xl mx-auto mt-12">
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8rem", color: TEXT_LO, textAlign: "center" }}>
          This page is for internal build testing only. Remove the <code style={{ color: AMBER }}>/build-index</code> route from App.tsx before publishing.
        </p>
      </div>
    </div>
  );
}
