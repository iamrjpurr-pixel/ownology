/**
 * Re-write the 7 boutique-scale SOP companions in METRIC PRIMARY, imperial
 * shown only as a small bracketed courtesy for the rare US-trained reader.
 *
 * Reason: Ownology's user base is Australia + New Zealand. Both countries
 * are metric-native — winemakers do NOT think in gallons / lbs / °F.
 * The original PDF (MoreWine, USA) was imperial; my first pass kept that
 * verbatim, which felt foreign. This corrects it.
 *
 * Reference batch size: 20 L of finished wine (≈ 5 US gal — close enough
 * for the same scale family). Quantities tuned for hand-scale boutique work.
 *
 * Usage: node scripts/normalise-sop-boutique-metric.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const COMPANIONS = {
  18: {
    // SO₂ at the Crush
    scale: "20 L (~5 US gal) batch · ~45 kg grapes",
    text: `Add 50 ppm potassium metabisulphite as soon as the fruit is crushed. For a 20 L must this is **0.9 g K-meta** (≈ ¼ tsp); for a 100 L must, **4.5 g**. Dissolve in a small amount of cool clean water, then mix thoroughly through the must with a sanitised stainless paddle.

Allow **4–24 hours** for the SO₂ to bind and inhibit wild yeast / bacteria before adding cultured yeast or enzymes.

**Quick reckoner** for a typical 45 kg pick (≈ 30 L must → ≈ 20 L finished wine): K-meta dose ≈ **1.4 g**.`,
    chapter: "Guide to Red Winemaking · §A2",
  },
  15: {
    // Yeast Rehydration & Inoculation
    scale: "20 L (~5 US gal) batch",
    text: `**Dose:** 0.25 g/L of must (so 20 L must → 5 g yeast). For every 1 g of yeast, dissolve **1.25 g GoFerm Protect/Evolution** in **25 mL of water at 43°C** (warm tap, not boiling). Stir gently to break up clumps.

When the slurry cools to **40°C**, sprinkle the yeast in. Wait **15–20 min** — you should see foaming activity start.

Add an equal volume of must/juice to the slurry. After another 10–15 min, **pour the slurry evenly across the top of the must — do NOT stir it in**. The brief oxygen exposure plus sugar contact gives the yeast a far stronger start than dumping and mixing.

**Quick reckoner**: 100 L batch needs 25 g yeast + 31 g GoFerm in 625 mL water.`,
    chapter: "Guide to Red Winemaking · §B1",
  },
  14: {
    // Cap Management & Extraction Strategy
    scale: "20 L (~5 US gal) batch · 1 ferment vessel",
    text: `**Cap punches:** hand-punch with a sanitised stainless or wooden tool **2–4× per day** while ferment is active. Re-submerge the cap completely each time — protects against oxygen, drives colour/flavour extraction, and stops bacteria colonising the dry cap.

**Temperature targets:**
- Ambient: **21–29°C**
- Ferment self-heat: pushes must **5–8°C above ambient**. A 27°C room can drive must to 32–35°C at peak — move to a cooler space if it gets too hot.

**Nutrient additions for a 20 L batch:**
- 1st dose at first cap formation: **8 g Fermaid-O** dissolved in water
- 2nd dose when ⅓ through (after 8–10°Brix consumed): **5 g Fermaid-K** dissolved in water

For other batch sizes: scale linearly (≈ 0.4 g Fermaid-O/L, 0.25 g Fermaid-K/L).`,
    chapter: "Guide to Red Winemaking · §C1–C4",
  },
  23: {
    // Wine Press Operation & Pressing
    scale: "20 L (~5 US gal) batch · bladder press or basket press",
    text: `**When to press:** Take a Brix or specific gravity reading. With a hydrometer, **–1.5° to –2° Brix** confirms all sugars have fermented out. Most boutique pressings happen at **0° Brix** or just below.

**Equipment for 20 L scale:**
- Speidel bladder press (e.g. GER102) — gentlest option, uses household tap-water pressure
- Basket press — usable but extracts harder tannins; press only lightly
- Collect free-run in a sanitised stainless bucket beneath the press

Transfer immediately to a **20 L glass demijohn or stainless** with minimal head-space and fit an airlock — fresh press wine continues off-gassing CO₂ for several days. Top up daily during the first week.`,
    chapter: "Guide to Red Winemaking · §D1–D2, Ch. 4",
  },
  21: {
    // Malolactic Fermentation Management
    scale: "20 L (~5 US gal) batch",
    text: `**Bacteria inoculation (Lallemand strains):** For each 1 g of ML bacteria, dissolve **20 g of Acti-ML nutrient in 100 mL of distilled water at 25°C**. Stir until fully dissolved. Add bacteria to the Acti-ML slurry, wait **15 min**, then stir thoroughly into the wine.

After inoculation add **20 g Opti-Malo Plus per 20 L** (≈ 1 g/L), pre-mixed in a small amount of water.

**For Christian Hansen strains:** add directly to the wine without slurry, then add Opti-Malo Plus as above.

**MLF management:**
- Maintain temperature **~21°C** for the duration
- Stir lees back into the wine **twice a week** with a sanitised lees stirrer
- Add oak cubes / staves during MLF for better integration
- Fit an airlock — MLF produces CO₂

⚠ **Absence of visible bubbling does NOT mean MLF has stalled.** If no apparent activity after 3 weeks, run paper chromatography (kit MT930) to verify malic → lactic conversion. Finished MLF = malic acid below **30 mg/L**.`,
    chapter: "Guide to Red Winemaking · §C-MLF, Ch. 6",
  },
  19: {
    // Post-MLF SO₂ Adjustment
    scale: "20 L (~5 US gal) batch",
    text: `**Post-MLF SO₂:** the dose required depends on the wine's pH. With a pH meter, target **0.6–0.8 mg/L molecular SO₂** using the chart in Guide to Red Winemaking Ch. 10.7. Without a pH meter, default to **50 ppm SO₂** — for a 20 L batch this is **0.9 g K-meta** (≈ ¼ tsp).

**Re-test and re-dose schedule** (young wine binds SO₂ faster than aged):
- Now (post-MLF) → initial dose
- 2 weeks later → re-test, top up
- 6 weeks → re-test, top up
- 10 weeks → re-test, top up
- 16 weeks → re-test, top up
- Every 8 weeks thereafter

**TA & pH targets:** pH **3.4–3.65**, TA **6–9 g/L**. Tartaric acid up TA / down pH. Calcium or potassium carbonate down TA / up pH. **Bench-trial small samples** (100 mL is plenty) before adjusting the whole batch.

**Long-term storage:** **13–16°C**, topped up after every opening (no head-space tolerated). Taste every 2–4 months and re-check SO₂.`,
    chapter: "Guide to Red Winemaking · §F1–F3, Ch. 10.7",
  },
  7: {
    // Bottling & Packaging
    scale: "20 L (~5 US gal) batch → ~26 × 750 mL bottles",
    text: `**Pre-bottle prep:** at ~12 months take final pH/TA + SO₂ readings and taste. Adjust if needed. Assess clarity — if not satisfactory, use fining agents at the **lowest dose** that gets the result (over-fining costs mouthfeel, aroma, flavour). Bench-trial 100 mL samples first. Filtration is purely cosmetic — most boutique reds don't need it.

**Bottling equipment for 20 L scale:**
- Gravity-feed bottling bucket + single-spout filler
- Hand corker for small runs, floor corker once you're doing 50+ bottles
- Match cork grade to intended cellar life — 4-year and 10-year corks differ significantly

**Bottle shock recovery:** after corking, stand bottles **upright for 3 days** so the cork fully re-expands and seals. Then lay on the side. **Wait at least 2 months** before opening — wine needs time to recover from the SO₂ addition and bottling agitation. After two months the shock passes and the wine improves from there.`,
    chapter: "Guide to Red Winemaking · §G1–G3, Ch. 9",
  },
};

let updated = 0;
for (const [sopId, comp] of Object.entries(COMPANIONS)) {
  const payload = `**Scale:** ${comp.scale}\n\n${comp.text}\n\n_Source: ${comp.chapter}_`;
  const [res] = await c.execute(
    "UPDATE sop_library SET boutique_companion = ?, updated_at = ? WHERE id = ?",
    [payload, Date.now(), Number(sopId)]
  );
  if (res.affectedRows > 0) {
    updated++;
    console.log(`  ✓ SOP ${sopId} re-written to METRIC primary (${payload.length} chars)`);
  }
}

console.log(`\nDone. ${updated}/7 SOPs now metric-first.`);

// Audit again
const re = /(US gal|gallon|lbs?|pounds|°F|tsp|tbsp)/gi;
const [rows] = await c.query("SELECT id, title, boutique_companion FROM sop_library WHERE boutique_companion IS NOT NULL");
console.log("\nResidual imperial markers in boutique companions:");
rows.forEach(r => {
  const matches = (r.boutique_companion || "").match(re) || [];
  if (matches.length > 0) console.log(`  SOP ${r.id} (${r.title}): ${matches.length} hits → ${[...new Set(matches)].join(", ")}`);
});

await c.end();
