/**
 * hi-personas.ts — persona-tuned bullet variants for /hi/:slug landings.
 *
 * Four roles, five variants each. Each variant follows the
 * Feel-Like → Look-Like → Save-You arc so the pitch opens with an
 * emotional anchor (relief, pride, control), grounds in one concrete
 * scene (tank 4, muddy hands, 3am), and closes with the outcome in
 * the winemaker's own words (time, sleep, arguments avoided).
 *
 * Voice rules (Rich, Feb 2026 — after James Wilkinson / Poole's Rock review):
 *   - No developer jargon ("chunks", "pipelines", "40 open tabs" is out)
 *   - No PhD-author name-drops in first touch (moved to /why-ownology)
 *   - Max one acronym per variant, and only if it's the regulator's own
 *     ("Wine Australia" > "LIP audit" > "FSANZ ceiling").
 *   - Every bullet grounds the promise in a winery artefact — tank number,
 *     racking day, vintage year, cellar door, distributor.
 *
 * Selection: outreach.bySlug reads `persona` from outreach_contacts,
 * defaults to "winemaker" when null, and the client rotates through
 * variants by (slugHash + viewCount) % 5.
 */

export type HiPersona = "md" | "winemaker" | "owner" | "sales-rep";

export const HI_PERSONA_LABELS: Record<HiPersona, string> = {
  md: "MD / GM",
  winemaker: "Winemaker",
  owner: "Owner / Founder",
  "sales-rep": "Sales Rep",
};

/**
 * Auto-suggest a persona from Perplexity's returned `role` + `notes`.
 * Called from outreach.deepResearch to seed the field for the operator.
 * Bias: return "winemaker" when uncertain — it's the safest default that
 * doesn't over-promise or under-promise.
 */
export function suggestPersonaFromResearch(
  role: string | null | undefined,
  notes: string | null | undefined,
): HiPersona {
  const r = (role ?? "").toLowerCase();
  const n = (notes ?? "").toLowerCase();
  const blob = `${r} ${n}`;

  if (/\b(managing director|general manager|md|gm|ceo)\b/.test(blob)) return "md";
  if (/\b(owner|founder|proprietor|principal|5th[- ]generation|family[- ]owned|patriarch)\b/.test(blob)) return "owner";
  if (/\b(sales rep|sales representative|brand ambassador|trade|distribution|cellar door manager|events)\b/.test(blob)) return "sales-rep";
  // Default — the largest bucket by cold-call volume.
  return "winemaker";
}

export const HI_VARIANTS_BY_PERSONA: Record<HiPersona, string[][]> = {
  // ── MD — Managing Director / GM ──────────────────────────────────
  // Cares about: cashflow, staff hours, board reporting, margin.
  // Voice: business owner, not chemist. Numbers > adjectives.
  md: [
    // 0 — Team hours back
    [
      "Every hour your winemaker spends chasing a spreadsheet is an hour off the tanks. Ownology writes the audit trail as they work.",
      "One tap → the LIP paperwork when Wine Australia knocks. Your consultant retainer earned somewhere else.",
      "Board-ready vintage summary generated from your team's daily entries — no month-end scramble.",
    ],
    // 1 — Compliance without the cost
    [
      "Compliance quietly handled in the background. Not another line item on the P&L.",
      "SO₂, additions, racking dates — all timestamped as the team logs. The paper trail your accountant wishes existed.",
      "Regulator audit prep drops from a week to an afternoon. Ask the wineries who've been through one.",
    ],
    // 2 — The lift on the whole team
    [
      "Your winemaker gets a second pair of hands. Your cellar hand gets clarity. Your GM gets a live picture at 5:30am.",
      "One tool the whole team actually uses — because it lives on their phone, not on the office desktop.",
      "Every question anyone on the team asks becomes a permanent asset. Institutional memory that doesn't leave when staff do.",
    ],
    // 3 — Cashflow-friendly
    [
      "Founding-partner pricing is $9/month during pilot — costs less than the coffees your winemaker buys on the way to the cellar.",
      "No install, no consultant, no per-seat licence. One number, one payment, one tool.",
      "If it doesn't save your team five hours in the first vintage, cancel. That's the deal.",
    ],
    // 4 — Growth-ready
    [
      "Scale from 12 tanks to 120 without swapping systems. The tool grows with the winery.",
      "Multi-vineyard, multi-region, multi-vintage — one library, one Q&A, one story.",
      "When you're ready to sell, the vintage history is a real asset. Ownology keeps it clean, searchable, transferable.",
    ],
    // 5 — APCO deadline (Feb 2026 wedge)
    [
      "APCO's Annual Report is due 31 March. Ownology's Assistant drafts it from your bottle, closure, label, and carton data — in the format APCO expects.",
      "Consultants charge $5-15K/yr for APCO compliance. The Vigneron founding tier is $88/mo — same job, ~1/6 the cost, forever.",
      "Dan's, Coles and Endeavour ask what APCO tier you're on. Ownology tells you — and tells you what closes the gap.",
    ],
  ],

  // ── WINEMAKER — Chief / Assistant Winemaker ──────────────────────
  // Cares about: cellar chemistry, quality decisions, avoiding disasters at 3am.
  // Voice: peer, muddy hands, human. Kill the jargon.
  winemaker: [
    // 0 — Off your shoulders
    [
      "Vintage is chaos. Ownology is the quiet, patient assistant who remembers what you did to tank 4 on Tuesday — and reminds you when you ask.",
      "Every question answered against your actual wines: this year's Semillon, last year's Shiraz. Not a forum guess.",
      "Nothing to install. Ask from the crush pad. Answer on your phone.",
    ],
    // 1 — Peace of mind at 3am
    [
      "The audit trail writes itself as you log. When Wine Australia asks, one tap → the paperwork.",
      "Sulphur numbers watched quietly in the background — you hear about a drift before it's a problem, not after.",
      "Every decision timestamped and reasoned. The clipboard you always meant to keep.",
    ],
    // 2 — Learn from your own vintages
    [
      "Compares this ferment to your last three — flags a slow rise before it becomes a stall.",
      "Which Shiraz batch outperformed last year, and what was different? Answer's there in seconds.",
      "Your data teaching you what your data always knew. No consultant call. No lost afternoon in a spreadsheet.",
    ],
    // 3 — Like a second winemaker on the floor
    [
      "Like a quiet-competent second pair of hands you always wished you could hire — on the phone, always on.",
      "Grounded in the standard oenology references your team already trusts, with your specific tank pulled up alongside.",
      "Captures the <em>why</em> behind decisions — because \"we did this because\" is the story a good winery tells.",
    ],
    // 4 — Muddy hands, calm mind
    [
      "Say what you did. Ownology hears it, writes it up, files it. Muddy hands, gloves on, kids yelling in the background.",
      "Notebook photos, spreadsheets, voice notes — whatever's already in your workflow, in. No new habit to learn.",
      "By lights-out: your day's on your phone, your laptop, and (when the regulator asks) a clean signed PDF.",
    ],
  ],

  // ── OWNER — Founder / Family / Brand ─────────────────────────────
  // Cares about: legacy, story, staff loyalty, "when I hand this over".
  // Voice: patient, respectful, generational. Long game.
  owner: [
    // 0 — A record worth handing over
    [
      "A winery is a story told over generations. Ownology is the place every decision this vintage joins that record — searchable by whoever comes next, if they ever want to know why 2026 mattered.",
      "Not a filing cabinet no-one opens. A living library — every ferment, every racking, every question your team asked, kept for good.",
      "When you hand the cellar over, you're handing over the reasoning, not just the wines.",
    ],
    // 1 — Your story, told properly
    [
      "The story behind every bottle you sell is worth telling. Ownology captures it as it happens, in your team's own words.",
      "\"Why did we pick early in 2026?\" — the answer's there, five years later, with the weather chart alongside.",
      "Marketing, cellar door, sommeliers — they all get the real story, sourced from the cellar, not a copywriter.",
    ],
    // 2 — Staff loyalty and lift
    [
      "Your winemaker's decisions get remembered. Their reasoning outlasts any single vintage. That's respect.",
      "New staff onboard by reading — not by asking the same questions the previous three assistants asked.",
      "Institutional memory that doesn't walk out when your chief winemaker retires.",
    ],
    // 3 — Sleep-at-night compliance
    [
      "Regulator paperwork done as your team logs. When the audit comes, you're not the one making phone calls at midnight.",
      "One tool watching every ferment, every addition, every decision — quietly, in the background, always.",
      "The peace that comes from knowing the trail is there, whether anyone ever asks or not.",
    ],
    // 4 — The 3am confidence
    [
      "The next generation of your winery will inherit clean records, not shoeboxes of paper. Ownology is the archive that writes itself.",
      "Your name on the bottle deserves better than 40 open tabs. This is where the craft lives now.",
      "Founding-partner pilot: $9/month, shape the tool with us, keep the founder's rate forever.",
    ],
    // 5 — APCO deadline (Feb 2026 wedge)
    [
      "APCO's 31 March deadline is looming. Ownology drafts the Annual Report + Action Plan from your packaging data — no consultant, no scramble.",
      "Every APCO criterion — Governance, Design, Recycled Content, Recoverability, Labelling, Waste, Problematic Materials — handled in one flow.",
      "Retailers ask what APCO tier you're on before they extend the range. Ownology shows the number and closes the gap.",
    ],
  ],

  // ── SALES REP — Cellar door / Trade / Distribution ───────────────
  // Cares about: what's in the tank, why this vintage is different,
  // what to say to a somm, pocket-native at trade shows.
  // Voice: friendly, story-first, phone-in-hand.
  "sales-rep": [
    // 0 — The story of every wine, in your pocket
    [
      "Every wine you sell has a story — the vintage weather, the ferment call, the block it came from. Ownology puts that story on your phone at the tasting bench.",
      "A somm asks \"what's different about the 2026 Sem?\" — you've got the answer, in your winemaker's own words, in three seconds.",
      "No more \"I'll get back to you.\" No more \"I think it was oak-aged.\" You know, because your winery's daily log lives here.",
    ],
    // 1 — Trade-show ready
    [
      "Cellar door, trade event, distributor visit — Ownology is the pocket cheat-sheet your winemaker wishes you had.",
      "Every tank's current status, every recent decision, every reason a vintage tasted the way it did — searchable, in seconds.",
      "Show a buyer the QR code, they scan, they see your Cellar Journal — no glossy brochure needed.",
    ],
    // 2 — Never caught out
    [
      "The moment you don't know the answer is the moment you lost the buyer. Ownology closes that gap.",
      "Ask Owen: <em>\"What's the residual sugar on the 2025 Riesling?\"</em> — the answer's grounded in the actual harvest log, not a guess.",
      "You look prepared. Your winery looks prepared. Because they are.",
    ],
    // 3 — Faster onboarding, sharper story
    [
      "New wines in the range? Read them in ten minutes on your phone — not by cornering the winemaker for an hour.",
      "Every vintage's key decisions summarised in plain language. The bridge between cellar and cellar door.",
      "Your talking points aren't guesses. They're the record.",
    ],
    // 4 — The good rep advantage
    [
      "Good reps are the ones who tell the true story of the wine. Ownology is where the true story lives, updated as your team logs.",
      "One tap → your winemaker's answer to \"why did you do MLF on the Chardonnay this year?\" — direct, current, honest.",
      "Every event you work, every rep you tell, every buyer you close — this is your unfair advantage.",
    ],
  ],
};
