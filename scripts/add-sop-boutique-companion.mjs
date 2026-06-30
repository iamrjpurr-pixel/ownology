/**
 * Add boutique-scale companion content to 7 SOPs.
 *
 * Source: morew_red_outline / Red Wine Making Outline PDF (MoreFlavor! Inc. 2014)
 * Maps the 7 procedural sections of the outline onto the 7 most relevant SOPs
 * in sop_library so that boutique winemakers (most of your VIVID prospects)
 * see scale-appropriate guidance alongside the commercial procedure.
 *
 * Schema change: adds `boutique_companion` TEXT column to sop_library.
 *
 * Usage: node scripts/add-sop-boutique-companion.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Add column if not present
try {
  await c.execute("ALTER TABLE sop_library ADD COLUMN boutique_companion TEXT NULL");
  console.log("✓ Added boutique_companion column");
} catch (e) {
  if (e.code === "ER_DUP_FIELDNAME") console.log("· Column already exists");
  else throw e;
}

// 2. Boutique companion content per SOP — extracted + lightly edited from
//    the Red Wine Making Outline PDF (which is already ingested at
//    `morew_red_outline` for AI grounding). Each block uses imperial home
//    units (gallons, lbs, tsp) and references hand-tool models from
//    MoreWine's catalogue. Reference batch size is 5 US gallons of finished
//    wine (≈ 19 L) — the standard home/boutique unit.
const COMPANIONS = {
  18: {
    // SO₂ at the Crush
    scale: "5 US gal (≈19 L) batch · ~100 lbs grapes",
    text: `Add 50 ppm (1.65 g or ¼ tsp potassium metabisulphite) per 5 gallons of must to inhibit wild yeast and bacteria. Add SO₂ as soon as the fruit is crushed. Mix completely throughout the entire volume by hand-stirring with a sanitised paddle. Allow approximately 4–24 hours for the SO₂ to work before adding yeast or enzymes.

For a 100 lb pick (≈ 8 gal must → ≈ 5 gal finished wine), the K-meta dose works out to roughly 2.6 g.`,
    chapter: "Guide to Red Winemaking · §A2",
  },
  15: {
    // Yeast Rehydration & Inoculation
    scale: "5 US gal (≈19 L) batch",
    text: `Use 1 gram of yeast per gallon of must. For every 1 g of yeast, dissolve 1.25 g GoFerm Protect/Evolution in 25 mL of 110°F (43°C) water. Stir gently to break up any clumps. When the slurry falls below 104°F (40°C), add the yeast to the mixture. Wait 15–20 minutes — at this point you may start to see yeast activity.

Add some of your must/juice into the slurry equal to half the volume of the slurry. After 10–15 minutes, add the yeast slurry to the entire must volume.

⚠ Pour the slurry evenly on top of your must without stirring it in. This gives the yeast some oxygen while also giving it sugar — better viability than dumping and mixing.`,
    chapter: "Guide to Red Winemaking · §B1",
  },
  14: {
    // Cap Management & Extraction Strategy
    scale: "5 US gal (≈19 L) batch · 1 ferment vessel",
    text: `Hand-punch the cap with a sanitised wooden or stainless punch-down tool (e.g. WE530) **2–4 times per day** during active fermentation. Re-submerge the cap completely each time — this protects against oxygen, aids colour/flavour extraction, and deters airborne bacteria from colonising the dry cap.

Target ambient room temperature 70–85°F (21–29°C). Ferment heat will push the must 10–15°F (5–8°C) above ambient — if your room is at 80°F, must will hit 90–95°F at peak. Move the vessel to a cooler space if it gets too hot.

**Nutrient additions (5 gal batch):**
- 1st dose (at first cap): 7.5 g Fermaid-O dissolved in water
- 2nd dose (after 8-10° Brix consumed, ~⅓ through): 5 g Fermaid-K dissolved in water`,
    chapter: "Guide to Red Winemaking · §C1–C4",
  },
  23: {
    // Wine Press Operation & Pressing
    scale: "5 US gal (≈19 L) batch · bladder press or basket press",
    text: `**When to press:** Take a Brix reading with hydrometer or refractometer (compensate refractometer reading for alcohol). With a hydrometer, –1.5° to –2° Brix indicates all sugars consumed. Most home pressings happen at 0° Brix.

**Equipment:** Speidel bladder press (e.g. GER102 for 5-gal scale) gives the gentlest extraction — uses household tap-water pressure to expand a bladder against the skins. For smaller batches a basket press works but extracts harder tannins; press lightly.

Collect the wine in a shallow open container beneath the press, then transfer to a 5-gal carboy or bucket with **minimal head-space** to minimise oxygen pickup. Fit an airlock — fresh wine off the press will continue off-gassing CO₂ for several days.`,
    chapter: "Guide to Red Winemaking · §D1–D2, Ch. 4",
  },
  21: {
    // Malolactic Fermentation Management
    scale: "5 US gal (≈19 L) batch",
    text: `**Bacteria inoculation (Lallemand DYWM strains):**
For every 1 g of ML bacteria, dissolve 20 g of Acti-ML nutrient in 100 mL of distilled water at 77°F (25°C). Stir until fully dissolved. Add the bacteria to the Acti-ML slurry. Wait 15 minutes, then stir thoroughly into the wine.

After bacteria added: mix 5 g Opti-Malo Plus per 5 gal in a small amount of water and add to the entire volume.

**For Christian Hansen strains:** add directly to the wine without stirring. Then add Opti-Malo Plus as above.

**Managing MLF:** Maintain temperature ~70°F (21°C). Stir lees back into wine twice a week with a sanitised lees stirrer (e.g. WE590). Add oak cubes/staves during MLF for better integration. Fit an airlock — MLF produces CO₂.

⚠ Lack of visible bubbling does NOT mean MLF has stalled. If no activity after 3 weeks, start chromatography testing (kit MT930) to verify malic → lactic conversion. A finished MLF shows malic acid below 30 mg/L.`,
    chapter: "Guide to Red Winemaking · §C-MLF, Ch. 6",
  },
  19: {
    // Post-MLF SO₂ Adjustment
    scale: "5 US gal (≈19 L) batch",
    text: `**SO₂ at MLF completion:** the amount of free SO₂ needed depends on wine pH. As a rule of thumb without a meter, add 50 ppm SO₂ (1.65 g K-meta or ¼ tsp per 5 gal). With a pH meter, use the molecular SO₂ chart in Guide to Red Winemaking Ch. 10.7 to target 0.6–0.8 mg/L molecular.

**Re-test and re-dose schedule (young wine consumes SO₂ faster):**
- Now (post-MLF) → starting dose
- 2 weeks → re-test, top up
- 6 weeks → re-test, top up
- 10 weeks → re-test, top up
- 16 weeks → re-test, top up
- Every 8 weeks thereafter

**TA / pH adjustment:** test wine's TA and pH. Target pH 3.4–3.65, TA 6–9 g/L. Tartaric acid for TA up / pH down. Calcium or potassium carbonate for TA down / pH up. **Bench-trial small samples** before adjusting the entire batch.

**Long-term storage:** ~55–60°F (13–16°C). Top up after every opening to eliminate head-space. Taste every 2–4 months.`,
    chapter: "Guide to Red Winemaking · §F1–F3, Ch. 10.7",
  },
  7: {
    // Bottling & Packaging
    scale: "5 US gal (≈19 L) batch → ~25 × 750mL bottles",
    text: `**Pre-bottle preparation:** After ~12 months, take final pH/TA + SO₂ readings and taste. Adjust if needed. Assess clarity — if not satisfactory, use fining agents at the LOWEST possible dose for the desired effect (over-fining costs mouthfeel, aroma, flavour). Bench-trial first. Filtration is purely cosmetic — most boutique reds don't need it.

**Bottling equipment for 5 gal scale:**
- Simple gravity-feed bottling bucket + single-spout filler is fine
- Hand corker for smaller volumes, floor corker for 50+ bottles
- Match cork grade to intended cellar life (4-year vs 10-year corks differ significantly)

**Bottle shock:** after corking, stand bottles upright for 3 days so the corks fully re-expand and seal. Then lay them on their side. Wait **at least 2 months** before opening — wine needs time to recover from the SO₂ addition + bottling agitation. After 2 months, the wine has cleared the shock and will only improve.`,
    chapter: "Guide to Red Winemaking · §G1–G3, Ch. 9",
  },
};

// 3. Update each row
let updated = 0;
for (const [sopId, comp] of Object.entries(COMPANIONS)) {
  const payload = `**Scale:** ${comp.scale}\n\n${comp.text}\n\n_Source: ${comp.chapter}_`;
  const [res] = await c.execute(
    "UPDATE sop_library SET boutique_companion = ?, updated_at = ? WHERE id = ?",
    [payload, Date.now(), Number(sopId)]
  );
  if (res.affectedRows > 0) {
    updated++;
    console.log(`  ✓ SOP ${sopId} updated (${payload.length} chars)`);
  } else {
    console.log(`  · SOP ${sopId} not found, skipped`);
  }
}

console.log(`\nDone. ${updated}/7 SOPs now have boutique-scale companions.`);
await c.end();
