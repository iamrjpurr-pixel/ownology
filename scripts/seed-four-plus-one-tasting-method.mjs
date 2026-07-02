/**
 * seed-four-plus-one-tasting-method.mjs — Feb 2026.
 *
 * Companion piece to sensory-evaluation-for-home-winemakers. Uses Wine Folly's
 * famous 4-step tasting method (Look/Smell/Taste/Conclude) as scaffolding,
 * then adds Ownology's owned 5th step: DECIDE. Cross-links to the SOP.
 *
 * SEO play: "wine tasting method" ranks Wine Folly #1 globally. This entry
 * targets the long-tail winemaker query ("wine tasting method for home
 * winemakers" / "how to taste your own wine") which Wine Folly doesn't own.
 * Honest hat-tip to Puckette + WSET keeps us on the right side of E-E-A-T.
 *
 * Idempotent: deletes any prior row with this slug before re-inserting.
 * Run: node scripts/seed-four-plus-one-tasting-method.mjs
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

const SLUG = "the-winemakers-fifth-step";
const QUESTION = "How do I adapt the 4-step wine tasting method for my own home-made wines?";
const TOPIC_TAG = "Faults & Off-Flavours";
const DIAGNOSIS =
  "The 4-step tasting method (Look, Smell, Taste, Conclude) — popularised by Wine Folly and codified by WSET — is designed for drinkers deciding whether they like a wine. Home winemakers need a 5th step: DECIDE. Every taste is a data point that triggers an action.";

const FULL_ANSWER = `
The most-taught wine tasting framework on the internet is Wine Folly's *Look → Smell → Taste → Conclude* — a beautifully-simplified take on the WSET Systematic Approach to Tasting. It works. It's the right teaching model for someone who wants to enjoy wine more thoughtfully.

But it stops one step short of what a home winemaker needs.

When you taste a bottle at dinner, the final question is: *"Do I like this?"* When you taste **your own wine** — still in a demijohn, on its lees, mid-MLF, waiting to be racked — the final question is: *"What do I do about this?"*

That's the fifth step. **Decide.** Every taste is a data point. Every data point triggers an action.

Here's the 4-step method adapted, section by section, for your home cellar. Where the classic model is quoted, the *winemaker's twist* follows in italics.

---

## Step 1 — Look

**Classic** (Wine Folly / WSET):
- Hue and intensity — identify the wine's dominant colour.
- Tears / legs — the Gibbs-Marangoni effect. More tears = higher alcohol.

*Winemaker's twist — colour is a stability signal, not a style question:*
- **Whites**: if it's browning at the rim, oxygen has gotten in. Rack under gas, top up, adjust SO₂ before it gets worse.
- **Reds**: bricking or orange at the rim before its time (a 6-month-old Shiraz shouldn't look like a 15-year-old Shiraz) means the same story.
- **Clarity**: if it's hazy, ask *why*. Protein instability (whites), incomplete fining, unfinished MLF, or a spoilage organism. Each has a different fix.

Log the observation. Don't just note "medium ruby" — note "medium ruby, slight brick at rim, day 45 post-MLF". Colour without context is data without direction.

---

## Step 2 — Smell

**Classic**:
- Intensity — quick sniff first, then position glass for detail.
- Fruit — identify 3 fruit aromas (fresh / ripe / dried?).
- Herb, oak, earth — the descriptive layers.

*Winemaker's twist — run the fault filter BEFORE the fruit filter:*

Before you notice "cassis and black cherry," run through the five faults from the [Sensory Evaluation SOP](/cellar-journal/sensory-evaluation-for-home-winemakers). Ninety seconds:

- Nutty / bruised apple / sherry → **oxidation**
- Nail polish / vinegar → **VA**
- Rotten egg / struck match / boiled cabbage → **reduction**
- Barnyard / band-aid / horse-stable → **Brett**
- Wet cardboard / damp basement → **TCA**

If any of these light up, that's your headline. The fruit is a side note until the fault is resolved. This inverts the drinker's order for a reason: a wine can smell beautifully like cassis AND be about to go sherry-nutty in a month if you miss the early oxidation cue.

Only after the fault filter clears do you switch to the classic descriptors: fruit → herb → oak → earth. And then you're back on the Wine Folly track.

---

## Step 3 — Taste

**Classic**:
- Sweetness (residual sugar)
- Tannin — fine, medium, gritty, grippy (great vocabulary from Madeline Puckette)
- Acidity — makes you salivate
- Alcohol — warmth in the throat
- Body — light, medium, full
- Retronasal — breathe out through your nose

*Winemaker's twist — the palate is where decisions get triggered:*

- **Sweetness**: if you can taste residual sugar and you didn't plan for it, MLF may not be finished OR primary stalled. Check with a Clinitest strip or a hydrometer + refractometer combo. Do not bottle until you know.
- **Tannin**: green / stalky tannin → over-extraction from stems, or press cut too late. Options: bench-trial a light fining with gelatin or PVPP.
- **Acidity**: if it feels flat pre-bottling, measure TA and pH. Adjust with tartaric before cold stabilisation, not after. Every 1 g/L tartaric addition ≈ 0.1 unit TA drop, 0.05 unit pH drop (approximate; bench-trial to confirm).
- **Alcohol**: hot / burning finish? You're probably above your intended ABV. Blend with a lower-alcohol lot if you have one, or accept it as a stylistic signature. Can't be reduced except by reverse osmosis (which you don't have at home).
- **Body**: too thin? Extended lees contact + bâtonnage might build mid-palate.

Each palate observation maps to an intervention. Log **both** the observation *and* the intervention in your cellar app — six months from now during a Wine Australia LIP audit or DA-Notice inquiry, this is your defensible record.

---

## Step 4 — Conclude

**Classic** (Wine Folly's 3-point system): *"ew, meh, yay!"* + is it balanced? complex?

*Winemaker's twist — re-frame the conclusion question:*

Instead of *"do I like it?"* — ask **"is this what I intended for this batch?"**

- If yes → move to Step 5.
- If no → is the gap within intervention range? (E.g. "I wanted brighter acidity" is fixable; "I wanted a different variety" is not.)
- Complexity is not necessarily your goal. A crisp, simple Riesling is a triumph if that's what you intended.

Quality bands (WSET SAT-adapted):
- **Faulty** — undrinkable, unfixable
- **Poor** — flawed but stable
- **Acceptable** — drinkable, no memory
- **Good** — enjoyable, some character
- **Very Good** — expressive, well-balanced
- **Outstanding** — memorable, complex, long

Be honest. A Founding Member who over-scores their own wine misses the intervention that would have made it a category better.

---

## Step 5 — DECIDE (this is the one they don't teach you)

Every taste ends here. Pick one:

| Decision | When |
|---|---|
| **Rack** | Wine has thrown gross lees or you smell reduction — get it off the sediment. |
| **Sulphite** | Free SO₂ is below target (30-50 ppm reds, 50-70 ppm whites, pH-adjusted). |
| **Fine** | Green tannin, protein haze, or a specific fault fining can address. Bench trial first. |
| **Blend** | Component tastes unbalanced but pairs with a complementary lot. |
| **Cold-stabilise** | Tartrate haze risk before bottling (whites/rosé especially). |
| **Bottle** | It hits your intended style and lab numbers are stable. |
| **Cull** | Fault is unfixable OR intervention cost exceeds batch value. |
| **Re-taste in 4 weeks** | Uncertain — set a reminder, come back with fresh senses and a clean control. |

Log the decision. If the batch was on autopilot for two weeks and this is the first time you tasted it, that's a system failure. Every cellar batch should get a tasting log at every WBS milestone: post-crush, primary mid-way, primary end, post-press, mid-MLF, post-MLF, post-rack, pre-bottling. Eight tastes minimum per batch. Ownology's Cellar Brief engine surfaces the "you haven't tasted this batch in 12 days" flag on the dashboard — that's your prompt to open a glass.

---

## Putting it together

Wine Folly's 4-step method is your baseline. It calibrates your palate on finished wine and teaches you the vocabulary. Use it when you drink other people's wines — that's how you build the mental library of what "good Barossa Shiraz" or "good Adelaide Hills Chardonnay" tastes like.

Ownology's 5th step is where your calibration meets your cellar. Every taste of *your* wine ends with an action. That's the winemaker's job.

For the full protocol — the fault-detection triangulation kit, the WSET SAT-adapted evaluation grid, when to trust your nose vs. send to a lab — read the [Sensory Evaluation SOP](/cellar-journal/sensory-evaluation-for-home-winemakers).

---

### Sources & further reading
- **Wine Folly** — *The Wine Tasting Method*, Madeline Puckette (winefolly.com/tips/the-wine-tasting-method-video)
- **WSET** — Systematic Approach to Tasting Level 2, Issue 1
- **AWRI** — Sensory Assessment fact sheets
- **Ownology** — [Sensory Evaluation SOP](/cellar-journal/sensory-evaluation-for-home-winemakers)
`.trim();

// Teaser = intro + Step 1 preview, ends with a "read on" invitation.
const TEASER_ANSWER = `
The most-taught wine tasting framework on the internet is Wine Folly's *Look → Smell → Taste → Conclude*. It works. It's the right teaching model for someone who wants to enjoy wine more thoughtfully.

But it stops one step short of what a home winemaker needs.

When you taste a bottle at dinner, the final question is: *"Do I like this?"* When you taste **your own wine** — still in a demijohn, on its lees, mid-MLF, waiting to be racked — the final question is: *"What do I do about this?"*

That's the fifth step. **Decide.** Every taste is a data point. Every data point triggers an action.

## Step 1 — Look

**Classic**: hue, intensity, tears/legs.

*Winemaker's twist — colour is a stability signal, not a style question:*
- **Whites**: browning at the rim → oxygen ingress. Rack under gas, top up, adjust SO₂ before it worsens.
- **Reds**: premature bricking → the same story.
- **Clarity**: haziness has a specific *why* (protein instability, unfinished MLF, spoilage). Each has a different fix.

*[The full method continues through Smell (with the fault-filter you must run BEFORE fruit descriptors), Taste (where every palate observation triggers a decision), Conclude (re-framed for winemakers), and the 5th step — DECIDE — with the full 8-action decision matrix. Available to trial members.]*
`.trim();

const CITATIONS = [
  { label: "Wine Folly — The Wine Tasting Method (video + article)", source_doc: "winefolly.com/tips/the-wine-tasting-method-video/", chapter: "The 4-Step Method" },
  { label: "WSET — Systematic Approach to Tasting Level 2", source_doc: "wsetglobal.com — SAT Issue 1", chapter: "Level 2 SAT" },
  { label: "AWRI — Sensory Assessment fact sheets", source_doc: "awri.com.au/industry_support/winemaking_resources/sensory_assessment/", chapter: "Sensory Assessment" },
  { label: "Ownology — Sensory Evaluation SOP (companion)", source_doc: "/cellar-journal/sensory-evaluation-for-home-winemakers", chapter: "Ownology" },
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
      SLUG, QUESTION, TOPIC_TAG, FULL_ANSWER, TEASER_ANSWER, DIAGNOSIS,
      "curated_sop", "home_winemaker", JSON.stringify(CITATIONS), "both",
      now, now, now, now,
    ]
  );

  console.log(`✅ Inserted companion entry as cellar_journal row #${ins.insertId}`);
  console.log(`   URL: /cellar-journal/${SLUG}`);
  console.log(`   Cross-linked to: /cellar-journal/sensory-evaluation-for-home-winemakers`);

  await conn.end();
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
