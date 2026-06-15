/**
 * Ingest the Ownology White Wine Home Winemaker Outline into diy_knowledge_chunks.
 * Source: morew_white_outline (Ownology synthesis, grounded in Guide to White Wine Making)
 * Home-scale procedural checklist — quantities in gallons/litres, home equipment throughout.
 * Reductive handling thread runs through all sections.
 * WBS-mapped by section. Published = true for all sections.
 *
 * Usage: node scripts/ingest-morew-white-outline.mjs
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
import { readFileSync } from "fs";

dotenv.config();

const SOURCE_DOC = "morew_white_outline";
const WINE_TYPE = "white";

const SECTIONS = [
  {
    chapterRef: "A",
    chapterTitle: "Before You Begin — Preparation & Equipment",
    wbsDomain: "D3",
    wbsProcessFamily: "Harvest & Crush",
    wbsCode: "D3.0",
    topicTags: "equipment,sanitation,oxygen,reductive,airlock,carboy,hydrometer,pH meter,TA test,campden,potassium metabisulphite,SO2,inert gas,argon,nitrogen,headspace",
    content: `A. Before You Begin — Preparation & Equipment

1. Equipment Checklist: You will need a primary fermenter (bucket or wide-mouth vessel, minimum 8-gallon capacity for a 5-gallon batch), a secondary fermenter (glass carboy or food-grade plastic vessel, 5-gallon), airlocks and stoppers, a hydrometer and test jar, a pH meter or pH strips, a TA test kit, a siphon and racking cane, a fine-mesh straining bag or press bag, a wine thief for sampling, campden tablets or potassium metabisulphite powder, and wine bottles, corks, and a corker for bottling. For temperature control during fermentation, a cold water bath or a cool room (55–65°F / 13–18°C) is ideal. White wine fermentation is more temperature-sensitive than red — a consistent cool temperature preserves fresh fruit aromas and prevents premature oxidation.

2. Oxygen Management — The White Wine Principle: White wine is made reductively. Unlike red wine, where oxygen contact is used to extract colour and tannin from skins, white wine must be protected from oxygen at every stage — from pressing through to bottling. Before you begin, have a plan for minimising headspace, using airlocks at all times, and topping up vessels promptly after every racking. If you have access to inert gas (argon or nitrogen), use it to blanket vessels before filling. If not, minimise the time wine is exposed to air and work quickly during transfers.

3. Sanitation: Sanitise all equipment thoroughly before use. Use potassium metabisulphite solution (1 tsp per gallon of water) to rinse all contact surfaces. Rinse with clean water and allow to drain. Unsanitary equipment is the single most common cause of wine faults in home winemaking.`
  },
  {
    chapterRef: "B",
    chapterTitle: "Pressing & Juice Preparation",
    wbsDomain: "D3",
    wbsProcessFamily: "Harvest & Crush",
    wbsCode: "D3.1",
    topicTags: "pressing,white grapes,free-run juice,SO2,sulphite,campden,Brix,sugar,pH,TA,tartaric acid,cold settling,clarification,juice,oxidation,press bag,phenolics",
    content: `B. Pressing & Juice Preparation

1. Pressing White Grapes: White grapes are pressed before fermentation — the opposite of red wine. Crush and press the grapes as gently as possible to avoid extracting harsh phenolics from the skins and seeds. A fine-mesh press bag in a bucket press is adequate for home volumes. Press in stages: collect the free-run juice first (highest quality), then the first press fraction. Avoid pressing too hard — the last fraction of juice from heavy pressing is bitter and astringent. For a 23-litre (5-gallon) batch, you will need approximately 35–40 kg (75–90 lbs) of white grapes.

2. Immediate SO2 Addition: Add SO2 to the juice immediately after pressing to prevent oxidation and inhibit wild yeast and bacteria. Add 50 ppm: dissolve 1/4 teaspoon (1.65 g) of potassium metabisulphite per 5 gallons (23 litres) of juice and stir thoroughly. Do not skip this step — white juice oxidises rapidly and will turn brown within minutes of air exposure without SO2 protection.

3. Test and Correct Brix (Sugar): Take a juice sample and measure Brix with a refractometer or hydrometer. White wines are typically made from juice at 20–24° Brix. If Brix is too high (above 25°), dilute with a small amount of acidulated water (water with a pinch of tartaric acid). If Brix is too low (below 19°), chaptalisation (adding sugar) may be necessary — dissolve sugar in a small amount of warm juice before adding. Target starting Brix of 21–23° for a balanced white wine at 11–13% alcohol.

4. Test and Correct pH and TA: Test pH and Total Acidity. White wines generally perform best at a pH of 3.1–3.4 and a TA of 6–8 g/L. White wine acidity is critical — it provides freshness, structure, and protection against oxidation. If pH is too high (above 3.5) or TA is too low (below 5.5 g/L), add tartaric acid: dissolve in a small amount of juice before adding to the batch. Make small adjustments and retest between them. If pH is too low (below 3.0), add potassium carbonate or calcium carbonate in small amounts. Always bench trial before adjusting the full batch.

5. Cold Settling (Juice Clarification): After pressing and SO2 addition, allow the juice to cold settle for 12–24 hours before adding yeast. Place the vessel in a cool location (40–50°F / 4–10°C) or submerge in a cold water bath with ice. During this time, grape solids (pulp, skin fragments, grape proteins) will sink to the bottom. After settling, carefully rack the clear juice off the sediment into a clean vessel, leaving the gross solids behind. Starting fermentation with clarified juice produces cleaner, more aromatic white wine. Do not skip cold settling — it is one of the most important steps in white winemaking.`
  },
  {
    chapterRef: "C",
    chapterTitle: "Yeast Inoculation & Fermentation Start",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.1",
    topicTags: "yeast,inoculation,GoFerm,rehydration,Fermaid-O,Fermaid-K,nutrients,YAN,temperature,fermentation,aromatic,Chardonnay,Sauvignon Blanc,Riesling,EC-1118,71B,VL3,stuck fermentation,H2S",
    content: `C. Yeast Inoculation & Fermentation Start

1. Choosing a Yeast: White wine yeast selection matters more than in red wine because the yeast contributes directly to the aromatic profile. For neutral whites (Chardonnay, Pinot Gris), choose a neutral yeast such as EC-1118, QA23, or 71B. For aromatic whites (Sauvignon Blanc, Riesling, Gewurztraminer), choose a thiol-releasing or terpene-enhancing yeast such as Alchemy I, VL3, or Uvaferm 43. For Chardonnay with MLF, choose a yeast compatible with Oenococcus oeni bacteria (e.g., CY3079, BM4x4). Consult your yeast supplier's data sheet for alcohol tolerance, temperature range, and nutrient requirements.

2. Yeast Rehydration: Use 1 gram of yeast per gallon (4 litres) of juice. For a 5-gallon (23-litre) batch, use 5–6 grams of yeast. Rehydrate using GoFerm Protect/Evolution: add 1.25 grams of GoFerm per gram of yeast to 25 mL of 110°F (43°C) water per gram of yeast. Stir gently to dissolve. When the mixture cools to below 104°F (40°C), add the dry yeast. Wait 15–20 minutes. Gradually add small amounts of juice to the slurry to acclimatise the yeast to the juice temperature (temperature difference between slurry and juice should not exceed 10°F / 6°C). Then add the slurry to the full juice volume and stir gently.

3. Fermentation Temperature: White wine ferments best at cool temperatures — 55–65°F (13–18°C) for aromatic whites, up to 68°F (20°C) for fuller-bodied styles such as Chardonnay. Cool fermentation preserves volatile aromatics (esters, thiols, terpenes) that would be driven off at higher temperatures. Place the fermenter in a cool room, a cold water bath, or a temperature-controlled space. Monitor temperature daily — if it drops below 50°F (10°C), fermentation may stall.

4. Nutrient Additions: White wine juice is often nutrient-deficient, especially after cold settling removes solids. Add Fermaid-O at first signs of fermentation activity (small bubbles, slight foam): 1.5 grams per gallon (0.4 g/L). At one-third sugar depletion (approximately 8–10° Brix consumed), add Fermaid-K: 1 gram per gallon (0.25 g/L). Dissolve each addition in a small amount of juice before adding to the batch. Adequate YAN (Yeast Assimilable Nitrogen) prevents stuck fermentation and reduces the risk of hydrogen sulphide (H2S) production — the rotten egg fault.`
  },
  {
    chapterRef: "D",
    chapterTitle: "Monitoring Fermentation",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.2",
    topicTags: "fermentation monitoring,Brix,hydrometer,temperature,stuck fermentation,H2S,hydrogen sulphide,rotten egg,copper sulphate,activity,bubbles,airlock,daily check,log",
    content: `D. Monitoring Fermentation

1. Daily Checks: Monitor fermentation daily. Check temperature, observe CO2 activity (bubbling through airlock), and take a Brix reading every 2–3 days. Keep a log. Fermentation typically takes 10–21 days at cool temperatures. Do not stir or disturb the fermenter unnecessarily — white wine ferments without cap management (there are no skins to submerge).

2. Signs of Healthy Fermentation: Active bubbling through the airlock, a slight yeasty aroma, and a steady Brix decline of 1–3° per day indicate healthy fermentation. A sulphur or egg smell indicates H2S production — rack the wine off the lees immediately and consider a copper sulphate addition (1–2 drops of a 1% copper sulphate solution per 5 gallons, bench trial first).

3. Signs of Stuck Fermentation: If Brix stops declining above 2° Brix and there is no CO2 activity, fermentation may be stuck. Check temperature (too cold is the most common cause in white wine), check YAN (add Fermaid-O if not already done), and check SO2 (excessive SO2 at inoculation can inhibit yeast). Warm the vessel gradually to 65–68°F (18–20°C) and stir gently to re-suspend the yeast. If fermentation does not restart within 24 hours, prepare a restart yeast culture.

4. Fermentation Completion: Fermentation is complete when Brix reaches -1° to 0° on a hydrometer (compensating for alcohol), there is no CO2 activity for 48 hours, and the wine tastes dry (no residual sweetness). Confirm with a residual sugar test if available. Do not bottle before fermentation is fully complete.`
  },
  {
    chapterRef: "E",
    chapterTitle: "Post-Fermentation — Racking & MLF Decision",
    wbsDomain: "D5",
    wbsProcessFamily: "Post-Fermentation",
    wbsCode: "D5.1",
    topicTags: "racking,gross lees,MLF,malolactic fermentation,Chardonnay,Riesling,Sauvignon Blanc,lactic acid,malic acid,acidity,sur-lie,batonnage,lees stirring,Oenococcus,VP41,chromatography,oxygen,headspace",
    content: `E. Post-Fermentation — Racking & MLF Decision

1. Racking Off the Gross Lees: Within 1–3 days of fermentation completion, a large amount of dead yeast cells and grape solids (gross lees) will settle to the bottom. Rack the wine off the gross lees into a clean vessel with minimal headspace. Work quickly and minimise oxygen exposure — use a siphon and keep the racking cane below the surface of the wine in the receiving vessel. Top up with a similar wine or inert gas to eliminate headspace. Fit an airlock immediately.

2. MLF Decision — White Wine Specifics: Malolactic fermentation (MLF) converts sharp malic acid to softer lactic acid, lowering acidity and adding a creamy, buttery character. For white wine, MLF is a stylistic choice — not always desirable. Proceed with MLF for: Chardonnay (especially if you want a full-bodied, buttery style), Viognier, or any white wine with very high acidity (TA above 8 g/L, pH below 3.1). Do NOT proceed with MLF for: Riesling, Sauvignon Blanc, Pinot Gris, Gewurztraminer, or any wine where you want to preserve fresh, crisp, fruity acidity. If you do not want MLF, add SO2 immediately after racking (see Section F) to inhibit lactic acid bacteria.

3. If Proceeding with MLF: Inoculate with Oenococcus oeni bacteria (e.g., VP41, Enoferm Alpha, Lactoenos 450). Prepare the bacteria according to the supplier's instructions — most require rehydration in a warm water/Acti-ML nutrient solution. Add to the wine at 65–70°F (18–21°C). Maintain this temperature throughout MLF. Stir the lees gently twice per week with a lees stirrer. Monitor progress with a paper chromatography test kit — MLF is complete when the malic acid spot disappears. MLF typically takes 3–8 weeks. Do not add SO2 during MLF.

4. Sur-Lie Ageing (Optional): For Chardonnay and other full-bodied whites, ageing on the fine lees (the thin layer of yeast sediment remaining after gross lees racking) adds complexity, mouthfeel, and a creamy texture. Stir the lees gently once or twice per week (bâtonnage) with a lees stirrer for 1–4 months. This technique is optional and not appropriate for aromatic whites where freshness is the goal.`
  },
  {
    chapterRef: "F",
    chapterTitle: "Stabilisation & Clarification",
    wbsDomain: "D6",
    wbsProcessFamily: "Stabilisation",
    wbsCode: "D6.1",
    topicTags: "SO2,sulphite,free SO2,pH,cold stabilisation,tartrate,crystals,bentonite,protein haze,fining,clarity,filtration,potassium bitartrate,stabilisation,oxidation protection",
    content: `F. Stabilisation & Clarification

1. SO2 Adjustment After MLF (or After Racking if No MLF): Once MLF is confirmed complete (or if you chose not to do MLF), adjust SO2 to protect the wine during ageing. The correct SO2 addition depends on pH — use the following as a guide for a free SO2 target of 25–35 ppm: pH 3.0–3.1: add 25 ppm (0.83 g / 5 gallons); pH 3.1–3.2: add 30 ppm (1.0 g / 5 gallons); pH 3.2–3.3: add 35 ppm (1.15 g / 5 gallons); pH 3.3–3.4: add 40 ppm (1.32 g / 5 gallons); pH 3.4–3.5: add 50 ppm (1.65 g / 5 gallons). Dissolve potassium metabisulphite in a small amount of wine before adding to the batch. Retest free SO2 every 6–8 weeks and top up as needed.

2. Cold Stabilisation (Tartrate Crystals): White wine naturally contains tartrate crystals (potassium bitartrate) that can precipitate in the bottle as harmless but unattractive white crystals. To prevent this, cold stabilise the wine: place the sealed vessel in a refrigerator or cold space at 28–32°F (-2 to 0°C) for 1–2 weeks. Tartrate crystals will precipitate and settle. Rack the wine off the crystals before bottling. This step is optional but strongly recommended for white wines.

3. Fining for Protein Stability: White wine is prone to protein haze — a cloudiness that develops when proteins from the grapes react with heat. To prevent this, fine with bentonite: prepare a bentonite slurry (2–4 grams per gallon / 0.5–1 g/L) by sprinkling bentonite powder into 10 times its weight of warm water, stirring vigorously, and allowing to hydrate for 12–24 hours. Add the slurry to the wine and stir gently. Allow 1–2 weeks for the bentonite to settle, then rack the wine off the sediment. Always bench trial before fining the full batch — overdosing bentonite strips aroma and flavour.

4. Final Clarity Check: After fining and cold stabilisation, the wine should be brilliantly clear. If any haze remains, a light filtration through a pad filter (0.45–1 micron) will polish the wine before bottling. Filtration is a cosmetic step — it does not improve wine quality, only appearance.`
  },
  {
    chapterRef: "G",
    chapterTitle: "Bottling",
    wbsDomain: "D7",
    wbsProcessFamily: "Packaging",
    wbsCode: "D7.1",
    topicTags: "bottling,corking,bottle shock,headspace,SO2,clarity,cork,screw cap,storage,labelling,vintage,packaging,finishing,pre-bottle,readiness",
    content: `G. Bottling

1. Pre-Bottle Checks: Before bottling, confirm: Brix is at or below 0° (fermentation fully complete), free SO2 is at the correct level for the wine's pH (see Section F), the wine is clear and stable, and the wine tastes balanced and ready. Make any final TA or pH adjustments now — it is much harder to adjust after bottling.

2. Bottling Procedure: Sanitise all bottles, a bottling wand, and the siphon with potassium metabisulphite solution. Fill bottles to within 1/2 inch (1.5 cm) of the bottom of the cork position — this leaves the correct headspace. Cork immediately after filling. Work quickly to minimise oxygen exposure. For still white wine, natural corks or synthetic corks are both appropriate. Screw caps are excellent for aromatic whites where you want to preserve freshness.

3. Bottle Shock: Newly bottled wine often tastes closed, flat, or slightly off for 1–4 weeks after bottling — this is bottle shock, caused by the physical disruption of bottling. Store bottles upright for the first 2–3 days, then lay on their sides in a cool, dark place. Allow at least 2–4 weeks before opening the first bottle. White wines are generally ready to drink sooner than reds — most home-made white wines are at their best within 6–18 months of bottling.

4. Labelling and Storage: Label bottles with the grape variety, vintage year, and bottling date. Store in a cool (50–60°F / 10–15°C), dark, vibration-free location. Avoid storing near strong odours — corks are permeable and the wine can absorb off-aromas from the environment.`
  }
];

async function main() {
  const db = await mysql.createConnection(process.env.DATABASE_URL);
  console.log("Connected to database.");

  // Remove any existing morew_white_outline chunks
  const [del] = await db.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc = ?",
    [SOURCE_DOC]
  );
  console.log(`Deleted ${del.affectedRows} existing morew_white_outline chunks.`);

  let inserted = 0;
  for (const section of SECTIONS) {
    await db.execute(
      `INSERT INTO diy_knowledge_chunks
        (source_doc, wine_type, chapter_ref, chapter_title, topic_tags, content, chunk_index,
         wbs_domain, wbs_process_family, wbs_code, published, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW())`,
      [
        SOURCE_DOC,
        WINE_TYPE,
        section.chapterRef,
        section.chapterTitle,
        section.topicTags,
        section.content,
        inserted,
        section.wbsDomain,
        section.wbsProcessFamily,
        section.wbsCode,
        Date.now()
      ]
    );
    inserted++;
    console.log(`  Inserted: ${section.chapterRef}. ${section.chapterTitle} [${section.wbsCode}] — published`);
  }

  console.log(`\nDone. Inserted ${inserted} morew_white_outline sections (all published).`);
  await db.end();
}

main().catch((err) => {
  console.error("Ingestion failed:", err.message);
  process.exit(1);
});
