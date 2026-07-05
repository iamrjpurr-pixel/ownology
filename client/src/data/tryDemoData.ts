/**
 * tryDemoData.ts — hand-authored data for the `/try` conversion sandbox.
 *
 * Everything here is static. Zero DB reads. Zero LLM calls. The `/try`
 * route is a stress test of the *story*, not the app — so we hand-curate
 * a mini-narrative around Ownology Cellars (Rich & Gel's seeded winery)
 * that a prospect can walk through in 10 minutes and feel what a good
 * daily runbook looks like without needing an account.
 *
 * If a step's copy or numbers stop matching how the real product works,
 * update here — this is the single source of truth for the demo flow.
 */

export interface DemoAlert {
  id: string;
  severity: "high" | "medium" | "low";
  batch: string;
  tank: string;
  headline: string;
  detail: string;
  age: string;
}

/** A citeable reference behind a piece of winemaking advice. We aim for
 *  primary sources (manufacturer product sheets, peer-reviewed publications,
 *  industry-body technical bulletins) — not general blogs. `url` optional
 *  because some references are books; we still want to show the citation
 *  even without a clickable link. */
export interface DemoSource {
  publisher: string;
  title: string;
  detail?: string;
  url?: string;
}

export interface DemoDecision {
  key: string;
  label: string;
  outcome: "correct" | "risky" | "wrong";
  gelSays: string;
  /** Real sources backing the recommendation (or the correction, for
   *  wrong/risky answers). Rendered as a compact "Cited from" panel below
   *  Gel's voice. Every piece of advice in the demo should be defensible. */
  sources: DemoSource[];
}

export interface DemoScriptedAnswer {
  question: string;
  answer: string;
  citations: string[];
}

export const WINERY = {
  name: "Ownology Cellars",
  region: "Hunter Valley, NSW",
  vintage: 2026,
  batches: 12,
  hectares: 3.4,
};

export const ALERTS: DemoAlert[] = [
  {
    id: "alert-1",
    severity: "high",
    batch: "Batch 04 — Semillon",
    tank: "Tank 7",
    headline: "Stuck ferment — Brix hasn't moved in 3 days",
    detail: "Last three readings: 8.2°Bx → 8.1°Bx → 8.0°Bx over 72h. YAN was 148 ppm at inoculation (marginal). Cellar temp on Tank 7 hit 26°C at 2pm yesterday.",
    age: "12 min ago",
  },
  {
    id: "alert-2",
    severity: "medium",
    batch: "Batch 09 — Shiraz",
    tank: "Tank 2",
    headline: "MLF complete — SO₂ addition due within 48h",
    detail: "Malic dropped from 1.8 → 0.09 g/L. Free SO₂ last measured 8 ppm. Recommend +30 ppm to protect against oxidation and volatile acidity.",
    age: "1h ago",
  },
  {
    id: "alert-3",
    severity: "low",
    batch: "Batch 11 — Chardonnay",
    tank: "Barrel A3",
    headline: "Weekly topping due",
    detail: "Last top-up 8 days ago. Estimated headspace ~250mL based on evaporation rate.",
    age: "4h ago",
  },
];

/**
 * ALERT_RESOLUTIONS — what Ownology *does* about each alert, shown as an
 * inline expanded card in Step 2 after the visitor clicks. Each severity
 * teaches a different pattern of the product story:
 *   red   — "drop everything, diagnose, decide, log" (crisis mode)
 *   amber — "scheduled task added to your day, done" (routine)
 *   low   — "task queue, weekly cadence, done" (background)
 *
 * ctaLabel + branch determine what happens when you click Next. Red follows
 * the full crisis flow (Steps 3-7). Amber and grey skip straight to Ask
 * Ownology (Step 5) because there's nothing to diagnose — the action is
 * defined.
 */
export const ALERT_RESOLUTIONS: Record<
  string,
  {
    heading: string;
    lines: string[];
    citation?: { source: string; url?: string };
    ctaLabel: string;
    branch: "crisis" | "scheduled" | "task_queue";
  }
> = {
  "alert-1": {
    heading: "Crisis mode",
    lines: [
      "Ownology already flagged Tank 7 at 3:47am when the third static Brix reading landed.",
      "Next 3 minutes: we'll walk you through the vintage log, diagnose the cause (YAN + temp), and pick a repair.",
    ],
    citation: {
      source: "AWRI Fact Sheet 5.7 — Stuck & Sluggish Fermentation",
      url: "https://www.awri.com.au",
    },
    ctaLabel: "Investigate the red alert →",
    branch: "crisis",
  },
  "alert-2": {
    heading: "Scheduled action",
    lines: [
      "MLF endpoint reached (malic < 0.1 g/L is AWRI's completion threshold).",
      "Ownology has pre-drafted the addition: +30 ppm free SO₂ to Batch 09 within 48h.",
      "Tap Schedule and it drops into your task list for 5pm today — with the exact grams of KMS to weigh out for the tank volume.",
    ],
    citation: {
      source: "AWRI Fact Sheet 4.1 — Sulfur dioxide use in wine",
      url: "https://www.awri.com.au",
    },
    ctaLabel: "Schedule the SO₂ addition →",
    branch: "scheduled",
  },
  "alert-3": {
    heading: "Task queue",
    lines: [
      "Barrel A3 evaporation rate is normal for our cellar humidity (68%). No urgency.",
      "Ownology adds this to your weekly task list — it groups with the other 3 barrels due for topping this week so you fill them in one trip.",
    ],
    citation: {
      source: "Halliday Wine Companion — Barrel maintenance chapter",
    },
    ctaLabel: "Add topping to task list →",
    branch: "task_queue",
  },
};

/** Chemistry context surfaced when the user clicks the stuck-ferment alert. */
export const BATCH_04_CONTEXT = {
  tank: "Tank 7 · Semillon · 800L",
  inoculationDate: "18 Feb 2026",
  yeast: "Lalvin QA23",
  targetABV: "11.8%",
  history: [
    { day: "Day 0", brix: "22.4°Bx", temp: "18°C", event: "Inoculated · YAN 148 ppm · DAP +12g/hL added" },
    { day: "Day 2", brix: "18.6°Bx", temp: "19°C", event: "Ferment active, aromatic lift, no notes" },
    { day: "Day 4", brix: "13.1°Bx", temp: "22°C", event: "Approaching midpoint" },
    { day: "Day 6", brix: "9.4°Bx",  temp: "24°C", event: "Slowdown noted, no action" },
    { day: "Day 7", brix: "8.2°Bx",  temp: "26°C", event: "First stall reading — TEMP HIGH" },
    { day: "Day 8", brix: "8.1°Bx",  temp: "25°C", event: "No movement" },
    { day: "Day 9", brix: "8.0°Bx",  temp: "24°C", event: "Confirmed stuck · today" },
  ],
};

export const DECISIONS: DemoDecision[] = [
  {
    key: "dap",
    label: "Add DAP (diammonium phosphate) — the yeast is out of nitrogen",
    outcome: "risky",
    gelSays: "Half right. YAN was marginal at inoculation, but DAP alone won't restart a ferment that stalled from combined stress (nitrogen + temp). You'd add DAP AND cool the tank AND consider rehydrating a stress-tolerant yeast strain. Order matters.",
    sources: [
      {
        publisher: "AWRI",
        title: "Fact Sheet — Managing Stuck and Sluggish Fermentations",
        detail: "Nitrogen supplementation to a stalled ferment above the safe temperature range risks acetic acid production; cool the tank before adding YAN.",
        url: "https://www.awri.com.au/industry_support/winemaking_resources/",
      },
      {
        publisher: "Scott Laboratories",
        title: "Fermentation Handbook — Nutrient Management (annual)",
        detail: "DAP is one nitrogen input, not a rescue tool. Fermaid-K or organic-nitrogen products cover the full amino-acid spectrum needed by stressed yeast.",
        url: "https://scottlab.com/handbook",
      },
    ],
  },
  {
    key: "cool",
    label: "Cool the tank to 18°C — temp is too high for QA23",
    outcome: "correct",
    gelSays: "Yes — this is the first move. QA23 tolerates 24°C but at 26°C you lose viability fast. Cool to 18°C first, then reassess YAN and consider a Fermaid-K addition. Never do the fix all at once.",
    sources: [
      {
        publisher: "Lallemand Œnology",
        title: "Lalvin QA23® Product Data Sheet",
        detail: "Recommended fermentation range 15–24°C. Viability degrades sharply above 26°C. Cool-first restart protocol referenced explicitly on the technical sheet.",
        url: "https://www.lallemandwine.com/en/wine-yeasts/lalvin-qa23/",
      },
      {
        publisher: "AWRI",
        title: "Fact Sheet — Managing Stuck and Sluggish Fermentations",
        detail: "Recommends triage order: (1) temperature, (2) nitrogen, (3) yeast restart. Skipping (1) makes (2) and (3) less effective.",
        url: "https://www.awri.com.au/industry_support/winemaking_resources/",
      },
      {
        publisher: "Waterhouse, Sacks & Jeffery",
        title: "Understanding Wine Chemistry (Wiley, 2016) — §3.2.4",
        detail: "Academic reference on yeast thermal-stress kinetics: viability drops non-linearly above species-specific thresholds.",
      },
    ],
  },
  {
    key: "wait",
    label: "Wait another 48 hours — sometimes ferments restart on their own",
    outcome: "wrong",
    gelSays: "This is how you get a wine with volatile acidity and residual sugar you didn't plan for. A ferment that hasn't moved in 3 days won't restart on its own. Every 24h of stall doubles the risk of Brettanomyces getting a foothold. Move now.",
    sources: [
      {
        publisher: "AWRI",
        title: "Wine Microbiology Report — Brettanomyces and Stuck Ferments",
        detail: "Warm, low-SO₂, mid-Brix wine is the ideal Brett substrate. Every day of stall multiplies contamination risk.",
        url: "https://www.awri.com.au/industry_support/winemaking_resources/",
      },
      {
        publisher: "Boulton, Singleton, Bisson & Kunkee",
        title: "Principles and Practices of Winemaking (Springer) — Ch. 4",
        detail: "Documented mechanism: incomplete ferments accumulate acetic acid via yeast metabolic shifts under stress. Volatile acidity above 0.7 g/L is faulty for most styles.",
      },
    ],
  },
];

/** The user's Quick Entry after they picked the correct decision.
 *  Pre-filled — the demo user only has to hit "Save" to feel the flow. */
export const QUICK_ENTRY_DRAFT = {
  batch: "Batch 04 — Semillon (Tank 7)",
  eventType: "action",
  action: "Cool tank to 18°C, then re-measure YAN",
  chemistryFields: [
    { label: "Target temp", value: "18°C" },
    { label: "Current temp", value: "24°C" },
    { label: "Cooling rate", value: "~2°C/hr via jacket" },
  ],
  tags: ["stuck-ferment", "temp-management", "batch-04"],
  reasoning: "Alert triggered — QA23 viability drops above 24°C. First move is temperature, then chemistry.",
};

/** The one AI question a prospect will ask in Step 5. Hardcoded scripted
 *  answer that cites the winery's actual demo data — feels like a real
 *  answer from an assistant that knows this specific cellar. */
export const SCRIPTED_QA: DemoScriptedAnswer = {
  question: "Why is Batch 04 stuck at 8°Bx?",
  answer: `Three converging causes, in order of likely severity:

**1. Temperature stress.** Tank 7 hit 26°C on Day 7 — that's above the safe operating window for Lalvin QA23 (18-24°C). Viability drops off a cliff above 24°C, and once it does, you're not just slow — you're losing cell count. Your data shows the temp spike preceded the stall by 24 hours, which is textbook cause-and-effect.

**2. Marginal YAN at inoculation.** Yeast Assimilable Nitrogen was 148 ppm at Day 0. QA23 wants ≥180 ppm for a clean 22.4°Bx ferment. The DAP addition on Day 0 (12 g/hL) helped, but by 8°Bx the yeast has burned through most of it. This alone wouldn't have stalled you — but combined with the temp stress, it did.

**3. Nothing else is obviously wrong.** No SO₂ addition, no pH swing, no reported infection. This is a nutrient + temperature story.

**What to do**: Cool to 18°C first (over ~2 hours, not shocked). Re-measure YAN. If YAN is <60 ppm, add Fermaid-K at 25 g/hL. Consider a rehydration + inoculation of a stress-tolerant yeast (Lalvin EC-1118) as an insurance restart if brix hasn't moved 24h after the cool.`,
  citations: [
    "Ownology Cellars · Batch 04 — Semillon · Tank 7 · 800L",
    "Vintage-log entries Day 0–9 · YAN 148 ppm at inoculation",
    "Cellar Journal SOP: Stuck ferment triage",
    "AWRI Factsheet — Nutrient management in stressed ferments",
  ],
};

/** The Cellar Journal entry the demo publishes in Step 6.
 *  Pre-written so the user just clicks "Publish" and sees the output. */
export const JOURNAL_DRAFT = {
  title: "How we restarted a stuck Semillon ferment",
  slug: "restarted-stuck-semillon-2026",
  tags: ["stuck-ferment", "semillon", "temperature", "yan", "2026-vintage"],
  bodyMd: `Vintage 2026 · Batch 04 · Tank 7

Semillon at 22.4°Bx inoculated with Lalvin QA23. Day 7 the ferment stalled at 8°Bx. Cellar log showed the tank hit 26°C the previous afternoon — outside QA23's safe range.

**What we did**
1. Cooled to 18°C over 2 hours (tank jacket, no shock)
2. Re-measured YAN — 42 ppm. Added Fermaid-K at 25 g/hL.
3. Waited 24 hours. No movement. Rehydrated Lalvin EC-1118 as a restart.
4. Brix moved 8.0 → 6.4 within 48h. Restart successful.

**What we'd do differently next time**
Push YAN to ≥180 ppm at inoculation for Semillon on QA23. The 148 ppm we had was marginal, and once the temp went sideways we had no reserve to absorb it.

The bill: ~$8 in Fermaid-K, ~$4 in EC-1118, one extra day of vigilance. Beats losing 800L of Semillon.`,
};

/** Rich's closing narration on the final CTA screen. */
export const FINAL_CTA_COPY = {
  headline: "You just ran a winery for 10 minutes.",
  narration:
    "That was a real workflow — stuck ferment, 3-way triage, correct decision, logged action, published lesson. In Ownology it takes 4 clicks. Without it, that story takes a spreadsheet, a paper log, an email to your consultant, and a lost Sunday.",
  offer:
    "First 99 Founding Members lock $49/mo for life. That's less than one bottle of decent Barossa Shiraz. You get everything you just used, plus the LIP Audit Pack, plus Rich and Gel on speed-dial when your ferment goes sideways.",
  ctaLabel: "Reserve my Founding Member spot",
};
