/**
 * seed-sensory-evaluation-sop.mjs — Feb 2026.
 *
 * Publishes the flagship "Sensory Evaluation for Home Winemakers" SOP as a
 * curated /cellar-journal/<slug> entry. This is the cornerstone answer to
 * "how do I taste-evaluate my wine like a winemaker, not a drinker" — the
 * launch-critical piece separating Ownology's evaluation grid from the
 * consumer-oriented "5 S's of wine tasting" that dominates page-one Google.
 *
 * Grounded in:
 *   - AWRI (Australian Wine Research Institute) fault taxonomy
 *   - WSET Level 2 Systematic Approach to Tasting (SAT)
 *   - WineMaker Magazine troubleshooting guide
 *   - Mitchell Katz Winery "faults vs flaws" framework
 *
 * Idempotent: deletes any prior row with this slug before re-inserting.
 *
 * Run: node scripts/seed-sensory-evaluation-sop.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { URL } from "node:url";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL missing in .env");
  process.exit(1);
}
const u = new URL(DATABASE_URL);

const SLUG = "sensory-evaluation-for-home-winemakers";
const QUESTION = "How do I taste-evaluate my wine like a winemaker instead of a drinker?";
const TOPIC_TAG = "Faults & Off-Flavours";
const DIAGNOSIS =
  "The 5 S's ('swirl, sniff, sip') are for people enjoying wine. Home winemakers need a different tool: a systematic evaluation grid that flags four fault categories BEFORE the wine finishes primary — because after that, most faults are unfixable.";

const FULL_ANSWER = `
Most home-winemaker "tasting guides" you'll find on Google are written for wine drinkers — they teach you to swirl, sniff, and enjoy. That's useful if you're picking a bottle for dinner. It's the wrong tool if you're deciding whether to rack, sulphite, blend, or cull the batch sitting in your fermenter right now.

Winemakers need a different discipline: **sensory evaluation**. The job is not to *enjoy* the wine — it's to answer three questions on every taste:

1. Is anything **wrong**? (Fault detection)
2. Is it **on track** for the intended style? (Typicity)
3. What do I **do next**? (Intervention decision)

This SOP gives you the training kit, the four fault signatures every home winemaker must recognise, and the two-column evaluation grid the AWRI teaches its cadets.

---

## Faults vs. flaws — the single distinction that matters

**Flaws** are minor imperfections. They dissipate with air. Example: a whiff of struck match on pour that vanishes after 20 minutes in the glass.

**Faults** are chemical defects. They persist or worsen. Example: rotten-egg reduction that gets *stronger* after aeration.

Every taste you do, apply the **Wait-and-Compare test**:

1. Pour 50 ml. Taste immediately.
2. Wait 20 minutes.
3. Taste the same glass again, alongside a clean control (a commercial wine of the same variety, uncorked at the same time).
4. If the offending note faded → **flaw**, move on.
5. If it persisted or got worse → **fault**, act now.

This one test separates about 80% of amateur misdiagnoses.

---

## The four faults every home winemaker must recognise

### 1. Oxidation
**Smell**: nutty, sherry, bruised apple, honey.
**Look**: whites turn deep gold or brown; reds go from ruby to brick/orange.
**Cause**: air exposure (barrel not topped up, cracked closure, bulk stored with headspace).
**Fixable**: **No**. Oxidation is a permanent chemical change.
**Prevent**: keep barrels topped up weekly (5.4 SOP), maintain free SO₂ at 30-50 ppm for reds, 50-70 ppm for whites (pH-adjusted), minimise headspace on transfer.

### 2. Volatile Acidity (VA)
**Smell**: vinegar, nail-polish remover, ethyl acetate.
**Cause**: *Acetobacter* bacteria consuming oxygen and ethanol to produce acetic acid.
**Fixable**: **Not really.** Low-level VA can sometimes be blended out. High-level VA is a discard.
**Prevent**: eliminate oxygen, keep vessels topped up, hold SO₂ above 30 ppm free.

### 3. Reduction (H₂S)
**Smell**: rotten eggs, boiled cabbage, struck match, clogged drain.
**Cause**: hydrogen sulphide from stressed yeast (usually low nitrogen).
**Fixable**: **Yes — often.** This is the one to catch early.
- Splash-rack aggressively to introduce oxygen. Test the wine 24 hours later.
- If unchanged, add copper sulphate at ~0.2 mg/L Cu²⁺ (bench-trial first). Copper binds sulphide compounds.
- If STILL unchanged and now smells like garlic/onion, it's mercaptans — much harder, needs professional help.
**Prevent**: feed yeast properly (DAP + Fermaid at the right YAN target for your Brix), don't let temperature spike, first-rack aeration.

### 4. Brettanomyces ("Brett")
**Smell**: barnyard, band-aid, horse-stable, spicy clove, wet leather.
**Look**: dulled fruit character, dusty finish.
**Cause**: *Brett* yeast infection thriving in aerobic pockets or on residual sugar.
**Fixable**: **No**. Some winemakers embrace low levels ("terroir"); most consider it spoiled.
**Prevent**: strict sanitation (no chlorine — see TCA below), maintain molecular SO₂ ≥ 0.5 ppm (this is a pH-and-free-SO₂ calculation), sterile-filter before bottling if you've had Brett before.

### 5. TCA (cork taint)
**Smell**: wet cardboard, damp basement, moldy newspaper, wet dog.
**Look**: none — TCA is invisible.
**Cause**: 2,4,6-trichloroanisole. Formed when chlorine (from cleaners, tap water treatment, cork) reacts with mold on organic surfaces (oak, corks).
**Fixable**: **No**. Discard the bottle. If widespread, the barrel is the source — retire it.
**Prevent**: **NEVER use chlorine-based cleaners** anywhere near your winery. Use peracetic acid, sodium percarbonate, or citric-acid-based sanitisers instead. Rinse corks with clean water, not chlorinated tap.

---

## Build your fault library (a $15, weekend project)

You cannot train your palate on wine alone — you need reference spikes. Here's a food-safe kit:

| Fault | Analog | Where to source |
|---|---|---|
| Oxidation | 1 mL medium-sweet sherry per 50 mL wine | Bottle shop |
| VA | 2-3 drops white vinegar per 50 mL wine | Pantry |
| Reduction (H₂S) | Rub a struck match, waft into the glass | Matches |
| Brett | Trace of 4-ethyl phenol solution (from a lab supply — the only tricky one) | Cheap alternative: sniff a wet, well-used leather glove |
| TCA | Small piece of wet cardboard soaked overnight | Recycling bin |

Set up **aroma triangulation** with a friend:

1. Pour 3 identical glasses of clean wine.
2. Friend spikes ONE with a single analog while you're not looking.
3. Sniff all three. Identify the odd one.
4. Repeat until you get 90%+ right at low spike levels.

This is exactly what WSET candidates and AWRI sensory panelists do in training. Two weekend sessions and your palate is calibrated for life.

---

## The evaluation grid (WSET SAT adapted for winemakers)

For every wine you evaluate — post-fermentation, pre-bottling, in-barrel — fill out this grid:

**Appearance**
- Clarity: clear / hazy *(haze = protein instability, unfinished fining, or spoilage)*
- Colour intensity: pale / medium / deep
- Colour hue: describe honestly *(browning white or bricking young red = warning)*

**Nose**
- Condition: clean / faulty *(← the fault check above)*
- Intensity: light / medium / pronounced *(dumb nose can mean reduction or bottle shock)*
- Aromas: primary (fruit, floral) / secondary (yeast, oak) / tertiary (age, oxidation)

**Palate**
- Sweetness: dry / off-dry / medium / sweet
- Acidity: low / medium / high *(and: does it feel balanced against sweetness?)*
- Tannin: low / medium / high; grippy or ripe? *(reds only)*
- Alcohol: low / medium / high; hot? *(feel warmth in back of throat)*
- Body: light / medium / full
- Flavour intensity: light / medium / pronounced
- Finish: short / medium / long

**Conclusion**
- Quality: faulty / poor / acceptable / good / very good / outstanding
- Typicity: does it taste like the variety and style you intended?
- **Action**: rack / sulphite / fine / blend / bottle / cull / re-taste in 4 weeks

The action column is the reason winemakers evaluate — everything else feeds that decision.

---

## When to trust your nose. When to send to a lab.

Trust your nose for the four fault categories above once you've done the fault-library training. Send to a lab when:

- You suspect Brett and want to bottle within 6 weeks — a HPLC 4-ethyl phenol test is $30-50 AUD and definitive.
- You detect VA and want to know if it's above the AU 1.5 g/L legal ceiling before selling.
- Free SO₂ / TA / pH / VA — the four numbers you should be measuring monthly regardless of tasting.

AWRI's Adelaide lab and Vinquiry (via Grape and Wine Research) offer this to boutique members. Budget $150-300 for a full pre-bottling panel.

---

## Ownology's role

The Cellar Brief engine flags **"attention needed"** cards when your tasting notes (logged inside the app) match fault signatures. Ghost Questions in the guide surface the *right* SOP at the right stage — so when you smell reduction on day 8 of primary, you don't scramble; you get the aeration + copper protocol inline.

**Log every taste in the app.** Two clicks, 30 seconds. Six months in, you have a defensible sensory history for any Wine Australia LIP audit or DA Notice inquiry — and a searchable memory of every intervention decision you've made.

---

### Sources & further reading
- **AWRI Fact Sheet — Recognition of Wine Faults and Taints** (awri.com.au)
- **WSET Level 2 Systematic Approach to Tasting (SAT)** — Issue 1, current
- **WineMaker Magazine — Troubleshooting Guide for Home Winemakers**
- **Mitchell Katz Winery — Faults vs. Flaws framework**
`.trim();

// Teaser = first ~40% of the answer, cutting cleanly at a paragraph break.
const TEASER_ANSWER = FULL_ANSWER.split("---")[0].trim() + "\n\n---\n\n## The four faults every home winemaker must recognise\n\n### 1. Oxidation\n**Smell**: nutty, sherry, bruised apple, honey.\n**Look**: whites turn deep gold or brown; reds go from ruby to brick/orange.\n**Cause**: air exposure (barrel not topped up, cracked closure, bulk stored with headspace).\n**Fixable**: **No**. Oxidation is a permanent chemical change.\n\n*[The full guide covers VA, Reduction, Brett, TCA, the fault-library training kit, the WSET evaluation grid adapted for winemakers, and when to send to a lab. Available to trial members.]*";

const CITATIONS = [
  { label: "AWRI — Recognition of Wine Faults and Taints", source_doc: "awri.com.au/industry_support/winemaking_resources/sensory_assessment/", chapter: "Sensory Assessment" },
  { label: "WSET Level 2 Systematic Approach to Tasting", source_doc: "wsetglobal.com — SAT Issue 1", chapter: "Level 2 SAT" },
  { label: "WineMaker Magazine — Troubleshooting Guide", source_doc: "winemakermag.com/technique/troubleshooting-guide-for-home-winemaking", chapter: "Home Winemaker Faults" },
  { label: "Mitchell Katz Winery — Faults vs Flaws framework", source_doc: "mitchellkatzwinery.com", chapter: "Wine Faults vs Flaws" },
];

async function main() {
  const conn = await mysql.createConnection({
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.slice(1) || "railway",
  });

  const now = Date.now();

  // Idempotent — delete any prior version of this slug first.
  const [del] = await conn.execute("DELETE FROM cellar_journal WHERE slug = ?", [SLUG]);
  console.log(`Deleted ${del.affectedRows} prior row(s) with slug=${SLUG}`);

  const [ins] = await conn.execute(
    `INSERT INTO cellar_journal
       (slug, question, topic_tag, full_answer, teaser_answer, diagnosis,
        source, audience, citations, wine_type,
        view_count, asked_count, embedding, variants,
        featured, published, first_asked_at, last_asked_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 1, NULL, NULL, 1, 1, ?, ?, ?, ?)`,
    [
      SLUG,
      QUESTION,
      TOPIC_TAG,
      FULL_ANSWER,
      TEASER_ANSWER,
      DIAGNOSIS,
      "curated_sop", // source
      "home_winemaker", // audience
      JSON.stringify(CITATIONS),
      "both",
      now, now, now, now,
    ]
  );

  console.log(`✅ Inserted flagship SOP as cellar_journal row #${ins.insertId}`);
  console.log(`   URL: /cellar-journal/${SLUG}`);
  console.log(`   Featured: yes  ·  Published: yes  ·  Topic: ${TOPIC_TAG}`);

  await conn.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
