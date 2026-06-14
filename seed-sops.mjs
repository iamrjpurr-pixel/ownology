/**
 * Seed script — inserts the 7 core DIY winemaker SOPs into sop_library.
 * Run once: node seed-sops.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);

const now = Date.now();

const sops = [
  {
    category: "Cleaning & Sanitation",
    sort_order: 1,
    title: "Tank Cleaning & Sanitisation",
    procedure_text: `**Step 1 — Rinse**
Rinse the tank immediately after emptying with cold water to remove gross lees and wine solids. Do not allow residue to dry — dried tartrate and lees are significantly harder to remove and can harbour spoilage organisms.

**Step 2 — Hot water wash**
Fill the tank with hot water (60–70°C) and allow to soak for 15–20 minutes. Drain completely. For plastic fermenters, use water no hotter than 60°C to avoid deformation.

**Step 3 — Caustic wash (if required)**
For tanks with visible staining, biofilm, or that have held a stuck or spoiled ferment: prepare a 2% sodium hydroxide (caustic soda) solution and circulate or soak for 30 minutes. Rinse thoroughly with cold water — minimum three full rinse cycles. Caustic residue will kill yeast.

**Step 4 — Acid rinse (if caustic used)**
After caustic wash, neutralise with a 1% citric acid or tartaric acid rinse. This removes caustic residue and restores a low-pH surface that is hostile to bacteria. Rinse once with clean water after acid rinse.

**Step 5 — Sulphur dioxide sanitisation**
Prepare a 100–200 ppm SO₂ solution using potassium metabisulphite (KMS): dissolve 1g KMS per 2L water for approximately 100 ppm SO₂. Fill or spray all internal surfaces. Allow to drain — do not rinse. The residual SO₂ will dissipate before must is added.

**Step 6 — Inspection**
Inspect all valves, seals, gaskets, and fittings. Replace any cracked or discoloured seals. Check that the drain valve closes fully. Record the cleaning date and method in the tank log.

**Step 7 — Record**
Record: Tank ID, date cleaned, method used (hot water / caustic / acid), inspector name, seal condition, any defects noted.

**Constraints:**
- Never use bleach (sodium hypochlorite) on wine equipment — chlorine compounds react with phenols in wine to produce TCA (cork taint), even in trace amounts.
- Caustic solutions are corrosive — wear gloves and eye protection.
- Do not use caustic on aluminium tanks — it will corrode the metal.
- Ensure all cleaning chemical residues are fully rinsed before adding must or wine.
- Minimum contact time for SO₂ sanitisation: 10 minutes on all surfaces.`,
    decision_logic: `**Why clean immediately after emptying?** Biofilm formation begins within hours on a wet surface. Dried lees and tartrate crystals provide physical protection for spoilage organisms (Brettanomyces, acetic acid bacteria) against subsequent cleaning. The longer you wait, the harder and less effective the clean.

**Why SO₂ rather than rinsing with wine?** SO₂ is a broad-spectrum antimicrobial that is effective at low concentrations, leaves no harmful residue at correct dosage, and is the industry standard. Rinsing with wine introduces the risk of cross-contamination from the previous batch.

**Why acid rinse after caustic?** Caustic (high pH) and SO₂ (effective at low pH) work in opposite pH ranges. An acid rinse after caustic ensures the surface pH is appropriate for SO₂ to be effective, and removes any caustic residue that would neutralise the SO₂.`,
    tribal_knowledge: `A clean tank smells of nothing. If you put your head inside a clean tank and smell anything — wine, vinegar, must, sulphur, mustiness — it is not clean. The nose is more sensitive than any test kit for detecting residual contamination.

Gaskets and seals are the most common source of contamination in home winery setups. They are cheap to replace and expensive to ignore. Replace any seal that is discoloured, cracked, or has a persistent smell.

In hot weather, clean tanks the same day they are emptied. In cool weather, you have 24 hours. Never longer.

This SOP should be the first document a new cellar hand reads and the first practical task they perform under supervision. A winemaker who cannot clean a tank correctly cannot be trusted with any other cellar task. The standard is: if you would not eat from it, do not make wine in it.`,
    csu_subject_ref: "WSC202",
  },
  {
    category: "Crushing & Fermentation",
    sort_order: 1,
    title: "Red Wine Fermentation",
    procedure_text: `**Step 1 — Tank Preparation**
Verify tank cleaning record (see Tank Cleaning & Sanitisation SOP). Inspect all valves and seals. Confirm tank ID and record it in the vintage log. Confirm tank capacity and target fill volume (leave 15–20% headspace for cap formation).

**Step 2 — Must Intake**
Receive crushed and destemmed must into the prepared tank. Record immediately: vineyard block and variety, date and time of receipt, Brix (target range: 22–26°B for most red varieties), pH (target range: 3.3–3.6), TA (target range: 5.5–7.5 g/L), temperature at receipt, any additions made at crush (SO₂, enzymes), estimated volume (litres).

**Step 3 — Yeast Addition**
Rehydrate yeast according to the Yeast Rehydration & Inoculation SOP. Add rehydrated yeast to the must. Record: yeast strain and supplier, batch number, rehydration temperature, inoculation time, inoculation rate (g/hL).

**Step 4 — Daily Monitoring**
Measure and record twice daily (morning and afternoon) during active fermentation: temperature (target: 22–28°C for most red varieties), Brix (track sugar depletion rate), sensory observations (aroma, cap condition, colour).

Alert conditions requiring immediate action:
- Temperature above 30°C — risk of yeast death and stuck fermentation
- Temperature below 15°C — fermentation may stall
- No Brix drop for 48 hours — potential stuck fermentation
- Off aromas (H₂S, vinegar) — microbial issue

**Step 5 — Cap Management**
Conduct pump-over or plunging according to the Pump-Over Protocol SOP. Record: time and duration, method (pump-over / plunging / rack and return), observations (cap condition, colour extraction, aroma).

**Step 6 — Fermentation Completion**
Confirm residual sugar target achieved (typically ≤2°B for dry red wine, or target Brix for off-dry styles). Confirm by refractometer and, if available, enzymatic glucose/fructose test. Record: final Brix, final temperature, date and time fermentation declared complete, decision: press now / extended maceration / transfer to MLF vessel.

**Constraints:**
- Do not exceed 30°C fermentation temperature — above this threshold, yeast viability drops sharply and stuck fermentation risk increases significantly.
- Do not inoculate yeast into must below 15°C — cold must will shock and kill rehydrated yeast.
- Ensure must temperature at inoculation is within 10°C of yeast rehydration temperature to prevent thermal shock.
- Do not add SO₂ within 24 hours of yeast inoculation — SO₂ inhibits yeast establishment.`,
    decision_logic: `**Why leave 15–20% headspace?** Red wine fermentation produces a cap of grape skins that rises to the top of the tank. This cap can occupy 20–30% of tank volume. Insufficient headspace causes overflow, loss of product, and sanitation problems.

**Why monitor twice daily?** Fermentation temperature can rise 2–4°C per hour during peak activity. A single daily reading can miss a temperature spike that kills the fermentation. Twice daily is the minimum; three times daily during peak fermentation (days 3–6) is better practice.

**Why record sensory observations?** Instruments measure what has happened. The nose detects what is about to happen. H₂S (rotten egg) detected on day 3 indicates yeast nutrient stress — correctable with a DAP addition. Detected on day 7, it may indicate reduction that requires aeration. The timing and character of the observation determines the response.`,
    tribal_knowledge: `The most important day of a red wine fermentation is day 3. By day 3, the fermentation is fully established, the cap is formed, and the temperature is at or near its peak. A winemaker who checks the tank carefully on day 3 and makes any necessary adjustments (temperature, nutrients, pump-over frequency) will have a clean fermentation. One who does not check until day 5 is managing problems, not preventing them.

Brix drops faster than most new winemakers expect. A 24°B must can be at 8°B in 5 days at 26°C. Do not be surprised — be ready with the press.

New cellar hands should shadow an experienced winemaker through at least one complete fermentation before managing one independently. The key skills to demonstrate before solo sign-off: reading a refractometer correctly, identifying a healthy versus stressed fermentation by smell, and recognising the difference between a healthy cap and a stuck or dry cap.`,
    csu_subject_ref: "WSC202, WSC318",
  },
  {
    category: "Crushing & Fermentation",
    sort_order: 2,
    title: "Yeast Rehydration & Inoculation",
    procedure_text: `**Step 1 — Select yeast strain**
Select yeast strain appropriate for the variety, style, and fermentation conditions. Record strain name, supplier, and batch number. Check expiry date.

**Step 2 — Prepare rehydration water**
Heat clean, chlorine-free water to 38–40°C. Use a thermometer — do not estimate. Volume: 10× the weight of yeast (e.g., 50g yeast requires 500mL water).

**Step 3 — Add GoFerm (if using)**
If using GoFerm or equivalent yeast rehydration nutrient: dissolve in the 40°C water before adding yeast, at the rate specified by the supplier (typically 1.25× the weight of yeast). GoFerm provides micronutrients that improve yeast cell membrane integrity during rehydration.

**Step 4 — Rehydrate yeast**
Sprinkle yeast onto the surface of the water. Do not stir immediately — allow yeast to absorb water for 15 minutes. After 15 minutes, stir gently to combine. The suspension should be creamy and uniform with no dry clumps.

**Step 5 — Acclimatise to must temperature**
Add a small volume of must (equal to the volume of yeast suspension) to the yeast suspension. Stir gently. Wait 5 minutes. Repeat once more. This step prevents thermal shock — the temperature difference between rehydration water (38–40°C) and must (typically 18–25°C) can kill a significant proportion of the yeast population if the transition is too rapid.

**Step 6 — Inoculate**
Add the acclimatised yeast suspension to the must. Stir or pump over to distribute evenly through the tank. Record inoculation time.

**Step 7 — Record**
Record: yeast strain, supplier, batch number, expiry date, rehydration water temperature, GoFerm used (Y/N) and rate, inoculation time, must temperature at inoculation, inoculation rate (g/hL).

**Constraints:**
- Rehydration water must be 38–40°C. Below 35°C, rehydration is incomplete. Above 42°C, yeast cells are damaged.
- Temperature difference between yeast suspension and must at inoculation must not exceed 10°C.
- Do not rehydrate yeast in must — grape juice contains sugars and SO₂ that inhibit proper cell membrane rehydration.
- Do not add SO₂ to the must within 24 hours before or after inoculation.
- Use yeast within 30 minutes of rehydration — viability declines rapidly once rehydrated.`,
    decision_logic: `**Why not rehydrate in must?** Grape must contains sugars at concentrations of 200–250 g/L. When a dry yeast cell is placed directly into high-sugar solution, osmotic pressure draws water out of the cell rather than allowing it to rehydrate. The result is incomplete rehydration, damaged cell membranes, and reduced fermentation performance. Clean water allows the cell membrane to rehydrate fully before exposure to the fermentation environment.

**Why does the temperature difference matter?** Yeast cell membranes are fluid at 38–40°C. When rapidly cooled to must temperature, the membrane can become rigid and rupture. The acclimatisation step allows the membrane to adjust gradually. This is the single most commonly skipped step in home winemaking and the most common cause of slow fermentation starts.

**Why use GoFerm?** Commercial yeast is dried under stress conditions. GoFerm provides the micronutrients (particularly pantothenic acid and thiamine) that the yeast needs to rebuild its cell membrane during rehydration. Yeast rehydrated with GoFerm has higher cell viability, better fermentation kinetics, and lower H₂S production.`,
    tribal_knowledge: `A healthy yeast rehydration smells faintly yeasty and slightly sweet — like fresh bread dough. If it smells of nothing, the yeast may be dead. If it smells sour or off, the yeast or the water may be contaminated.

The acclimatisation step feels unnecessary when you are in a hurry during vintage. It is not. The 10 minutes it takes saves the 10 days of a stuck fermentation.

If you are unsure whether your yeast is viable, add a small amount of sugar to the rehydration suspension after 15 minutes and observe for CO₂ production (bubbling) within 10–15 minutes. If no activity, the yeast is dead — do not inoculate.`,
    csu_subject_ref: "WSC202",
  },
  {
    category: "Crushing & Fermentation",
    sort_order: 3,
    title: "Pump-Over Protocol",
    procedure_text: `**Step 1 — Confirm timing**
Pump-overs should be conducted according to the fermentation schedule. Standard frequency for red wine fermentation:
- Days 1–2: 1× daily (gentle — cap is fragile)
- Days 3–7 (peak fermentation): 2–3× daily
- Days 8–completion: 1–2× daily (reducing as fermentation slows)

**Step 2 — Prepare equipment**
Inspect pump, hoses, and fittings for cleanliness. Rinse with SO₂ solution (100 ppm) before use. Confirm drain valve is accessible and functioning.

**Step 3 — Open drain valve**
Open the tank drain valve and allow free-run juice to flow into the pump intake or collection vessel. Do not force — allow gravity to assist.

**Step 4 — Pump over cap**
Pump juice from the bottom of the tank over the top of the cap. Distribute evenly across the entire cap surface. Standard pump-over volume: 20–30% of tank volume per pump-over.

**Step 5 — Observe and record**
During pump-over, observe: cap condition (moist and cohesive vs dry and cracked), colour of juice (intensity, clarity), aroma (fruity, yeasty, clean vs H₂S, VA, brett), temperature of juice, fermentation activity (CO₂ bubbling rate).

**Step 6 — Close drain valve and rinse equipment**
Close drain valve fully. Rinse pump and hoses with clean water, then SO₂ solution. Store clean.

**Step 7 — Record**
Record: tank ID, date and time, pump-over volume, duration, cap condition, colour observation, aroma observation, juice temperature, any anomalies.

**Constraints:**
- Do not allow the cap to dry out between pump-overs — a dry cap is a contamination risk and reduces colour and tannin extraction.
- Do not over-extract — excessive pump-overs in the final days of fermentation extract harsh, drying tannins.
- For delicate varieties (Pinot Noir, Grenache): use gentler, shorter pump-overs or plunging rather than aggressive pump-over.
- Always rinse equipment with SO₂ solution before and after use.`,
    decision_logic: `**Why pump over at all?** The grape skin cap that forms on top of a red wine fermentation contains the colour, tannin, and flavour compounds that define red wine. Without regular wetting, the cap dries out, becomes a habitat for acetic acid bacteria (which produce vinegar), and stops contributing to the wine. Pump-overs keep the cap moist, extract colour and tannin, and oxygenate the fermentation to support yeast health.

**Why reduce pump-over frequency late in fermentation?** In the final days of fermentation, the yeast is stressed and the wine is more vulnerable to oxidation. Excessive pump-overs at this stage extract harsh, green tannins from seeds and stems, and increase the risk of oxidation.

**Why does pump-over volume matter?** Too little: the cap dries between pump-overs, contamination risk increases, extraction is uneven. Too much: over-extraction of harsh tannins, excessive oxygen pickup, increased VA risk. The 20–30% of tank volume guideline is the industry standard for balanced extraction.`,
    tribal_knowledge: `The pump-over is the winemaker's daily conversation with the fermentation. Every pump-over tells you something: the colour of the juice tells you where extraction is; the aroma tells you the health of the fermentation; the cap condition tells you whether your frequency is right. A winemaker who does pump-overs on autopilot misses the information they contain.

H₂S detected during pump-over is an early warning, not a crisis — at this stage, a DAP addition and increased aeration (more aggressive pump-over) will usually resolve it. H₂S detected after fermentation is complete is a much harder problem to fix.

The pump-over is the most frequent cellar task during vintage and the one where new staff make the most mistakes. Common errors: not distributing juice evenly across the cap (leaving dry patches), not observing during the pump-over (treating it as a mechanical task), and not recording observations.`,
    csu_subject_ref: "WSC202, WSC318",
  },
  {
    category: "Crushing & Fermentation",
    sort_order: 4,
    title: "Malolactic Fermentation Management",
    procedure_text: `**Step 1 — Decision: induce or prevent MLF**
For most dry red wines (Shiraz, Cabernet, Merlot, Grenache): induce MLF. MLF reduces perceived acidity, adds complexity, and improves microbial stability. For high-acid reds where freshness is the style goal, or for wines with pH above 3.6: consider preventing MLF with SO₂ addition and cold stabilisation. Record decision and rationale.

**Step 2 — Prepare vessel**
Transfer wine off gross lees into a clean vessel (tank or barrel). The vessel should be full or nearly full to minimise headspace — MLF is an anaerobic process and the wine is vulnerable to oxidation during this period.

**Step 3 — Inoculate with MLF bacteria (if inducing)**
Rehydrate commercial MLF bacteria (e.g., Oenococcus oeni) according to supplier specification. Typical inoculation rate: 1g/hL. Add to wine at 18–22°C. Record strain, batch number, inoculation time, and wine temperature.

**Step 4 — Monitor MLF progress**
Test for malic acid depletion weekly using paper chromatography or enzymatic malic acid test:
- Paper chromatography: malic acid spot present = MLF incomplete; spot absent = MLF complete
- Enzymatic test: malic acid concentration below 0.3 g/L = MLF complete

**Step 5 — Confirm MLF completion**
Confirm malic acid below 0.3 g/L by enzymatic test. Record date of MLF completion.

**Step 6 — Add SO₂ post-MLF**
Immediately after MLF completion, add SO₂ to protect the wine. Target free SO₂:
- pH 3.2–3.4: 25–30 ppm free SO₂
- pH 3.4–3.6: 30–35 ppm free SO₂
- pH above 3.6: 35–40 ppm free SO₂

Dissolve potassium metabisulphite in a small volume of wine before adding to tank. Stir thoroughly. Record addition rate and target free SO₂.

**Constraints:**
- Do not add SO₂ within 48 hours before MLF inoculation — residual SO₂ will inhibit or kill the bacteria.
- MLF will not proceed below 15°C — maintain vessel temperature above 18°C during MLF.
- MLF will not proceed above 0.5 mg/L molecular SO₂ — if wine has elevated free SO₂, MLF will stall.
- Do not leave wine unprotected after MLF completion — without SO₂, the wine is vulnerable to oxidation and spoilage organisms.
- Minimum headspace management: top up vessels weekly during MLF to minimise oxidation risk.`,
    decision_logic: `**Why does MLF matter for red wine?** Malic acid (the sharp, green-apple acid in grapes) is converted by lactic acid bacteria to lactic acid (the softer, creamy acid in milk). This reduces total acidity by approximately 1–2 g/L and raises pH by 0.1–0.3 units. The result is a rounder, softer wine with greater complexity.

**Why add SO₂ immediately after MLF?** MLF completion leaves the wine biologically active — the bacteria that completed MLF are still present and will continue to metabolise if conditions allow. Without SO₂, they can produce off-flavours (geranium taint from sorbate, mannitol, acetic acid). SO₂ arrests biological activity and protects the wine from oxidation during the subsequent maturation phase.

**Why does pH matter for SO₂ dosage?** SO₂ exists in wine in three forms: free, bound, and molecular. Only molecular SO₂ is antimicrobial. The proportion of free SO₂ that is molecular depends on pH — at lower pH, a higher proportion is molecular, so less total SO₂ is needed.`,
    tribal_knowledge: `MLF is the most misunderstood process in home winemaking. Many home winemakers do not know it has happened until they notice a slight fizz in the wine weeks after fermentation — that is MLF occurring spontaneously in the bottle, which is a fault. The solution is to either complete MLF deliberately before bottling, or to prevent it completely with SO₂ and cold stabilisation.

Paper chromatography is the most accessible MLF test for home winemakers and costs almost nothing. Every home winemaker should learn to read it. The malic acid spot is the one that disappears when MLF is complete.

MLF is an invisible process — there is no visible cap, no dramatic CO₂ production, no obvious sign that anything is happening. New winemakers should be taught to test for MLF on a fixed schedule (weekly) rather than waiting for visible signs.`,
    csu_subject_ref: "WSC318",
  },
  {
    category: "Pressing & Juice Handling",
    sort_order: 1,
    title: "Wine Press Operation & Pressing",
    procedure_text: `**Step 1 — Determine pressing time**
Press when fermentation is complete (≤2°B for dry red) or at the target Brix for extended maceration styles. For most DIY red wines: press at 0–2°B. Record the pressing decision and rationale.

**Step 2 — Prepare press and receiving vessel**
Clean and sanitise the press according to the Tank Cleaning & Sanitisation SOP. Prepare the receiving vessel (clean, sanitised tank or barrel). Have SO₂ solution ready for addition to pressed wine.

**Step 3 — Drain free-run wine**
Open the tank drain valve and allow free-run wine to flow into the receiving vessel. Free-run wine is the highest quality fraction — it should be kept separate from pressed wine until a blending decision is made. Record volume of free-run.

**Step 4 — Transfer skins to press**
Transfer the remaining skins and seeds (marc) to the press basket. Minimise splashing and oxidation during transfer.

**Step 5 — First press (light pressure)**
Apply light pressure (first press). Collect this fraction separately — it is typically the highest quality pressed fraction, similar in character to free-run. Record volume.

**Step 6 — Second press (medium pressure)**
Increase pressure for the second press. This fraction is coarser, higher in tannin and colour, and lower in quality than first press. Collect separately. Record volume.

**Step 7 — Hard press (if required)**
A third, hard press produces a coarse, tannic, often bitter fraction. For most DIY red wines, this fraction is not suitable for inclusion in the final blend. Record volume and disposition.

**Step 8 — Blending decision**
Taste each fraction (free-run, first press, second press) and decide on blending. Most DIY red wines are improved by blending free-run with 10–20% first press. Record blending decision and rationale.

**Step 9 — SO₂ addition**
Add SO₂ to the combined wine immediately after pressing. Target free SO₂ appropriate to pH (see MLF Management SOP, Step 6). Record addition.

**Step 10 — Clean press**
Clean the press immediately after use. Remove all marc, rinse with water, and sanitise with SO₂ solution.

**Constraints:**
- Do not press wine with residual sugar above 5°B — the pressed wine will continue fermenting in the receiving vessel.
- Minimise oxygen exposure during pressing — splashing and aeration during transfer increases VA risk.
- Press the same day as draining free-run — do not leave marc in the press overnight without SO₂ protection.
- Clean the press immediately after use — marc left in a press overnight is a significant contamination risk.`,
    decision_logic: `**Why keep fractions separate?** Each pressing fraction has a different character. Free-run is the most aromatic and elegant; first press adds structure and body; second and hard press add coarseness and tannin. Keeping them separate allows the winemaker to taste and decide on the best blend.

**Why press at 0–2°B rather than waiting for 0°B?** Pressing at 0–2°B allows the final fermentation to complete in the receiving vessel with the skins removed. This avoids the risk of pressing a completely dry wine that has been sitting on the skins too long (over-extraction of harsh tannins).

**Why add SO₂ immediately after pressing?** Pressed wine has been exposed to oxygen during the pressing process. Without SO₂, oxidation and microbial activity will begin immediately. The window between pressing and SO₂ addition should be as short as possible.`,
    tribal_knowledge: `The pressing decision is one of the most consequential decisions in red winemaking. Press too early and you sacrifice colour, tannin, and complexity. Press too late and you extract harsh, drying tannins and risk the wine drying out on the skins. The right time is when the wine tastes right — structured but not harsh, coloured but not extracted.

Taste the free-run, first press, and second press separately before blending. The difference between them is often dramatic and instructive. A first-time winemaker who tastes all three fractions learns more about wine structure in five minutes than they would from reading about it for an hour.

Pressing is a physically demanding task and the most time-pressured operation in the cellar — everything needs to happen in sequence without delay. There is no time to look things up once pressing begins.`,
    csu_subject_ref: "WSC202, WSC318",
  },
  {
    category: "Bottling & Packaging",
    sort_order: 1,
    title: "Bottling & Packaging",
    procedure_text: `**Step 1 — Confirm wine is ready to bottle**
Before bottling, confirm:
- Fermentation complete: residual sugar ≤2 g/L (enzymatic test or hydrometer)
- MLF complete: malic acid ≤0.3 g/L (paper chromatography or enzymatic test)
- Free SO₂ at target level (see Step 3)
- Wine is clear and stable (no visible haze, no active fermentation)
- No off-aromas (H₂S, VA, brett, oxidation)

Do not bottle a wine that fails any of these checks.

**Step 2 — Prepare bottles and equipment**
Wash bottles with hot water and inspect for chips, cracks, or contamination. Rinse with SO₂ solution (100 ppm) immediately before filling. Sanitise all filling equipment, hoses, and filler with SO₂ solution.

**Step 3 — Check and adjust free SO₂**
Measure free SO₂ (Ripper titration or Aeration-Oxidation method). Adjust to target:
- pH 3.2–3.4: 25–30 ppm free SO₂
- pH 3.4–3.6: 30–35 ppm free SO₂
- pH above 3.6: 35–40 ppm free SO₂

Allow 24 hours after SO₂ addition before bottling to allow equilibration.

**Step 4 — Filter (if required)**
For clear, stable wines: bottling without filtration is acceptable if the wine has been racked and settled. For wines with visible haze or active yeast: filter through a 0.45 micron membrane filter before bottling.

**Step 5 — Fill bottles**
Fill bottles to within 1.5–2cm of the bottom of the cork (approximately 5–6cm from the top of the bottle). Underfilling increases oxidation risk; overfilling prevents proper cork insertion.

**Step 6 — Cork or cap**
Insert cork or screw cap immediately after filling. For natural cork: use a floor corker or bench corker. For screw caps: apply with a hand capper to the correct torque.

**Step 7 — Label**
Apply labels after bottles have rested upright for 24 hours. Label must include (for Australian compliance): producer name, wine description, vintage, alcohol content, standard drinks, allergen declaration (sulphites), country of origin, and volume.

**Step 8 — Rest and store**
Store bottled wine on its side (for cork-sealed bottles) in a cool, dark location. Allow minimum 2–4 weeks rest before opening.

**Step 9 — Record**
Record: bottling date, wine variety and vintage, number of bottles, bottle size, closure type, free SO₂ at bottling, filtration method (if used), label details, storage location.

**Constraints:**
- Do not bottle wine with active fermentation — CO₂ production in bottle will cause pressure buildup.
- Do not bottle wine with incomplete MLF — spontaneous MLF in bottle produces CO₂, off-flavours, and potential bottle failure.
- Minimum free SO₂ at bottling: 25 ppm (pH-dependent). Wine bottled below this threshold is at risk of premature oxidation.
- Fill bottles to the correct level — underfilling increases oxidation; overfilling prevents proper cork insertion.
- For natural cork: store on side within 24 hours of bottling to keep cork moist and maintain seal.`,
    decision_logic: `**Why check for MLF completion before bottling?** If MLF has not completed and the wine is bottled, the lactic acid bacteria will continue converting malic acid to lactic acid in the bottle. This produces CO₂ (causing fizz in a still wine), off-flavours, and in severe cases, enough pressure to eject the cork or crack the bottle. This is one of the most common and most preventable faults in home winemaking.

**Why does headspace matter?** Too little headspace: cork cannot be fully inserted; wine may seep under the cork. Too much headspace: excessive oxygen in the headspace accelerates oxidation. The 1.5–2cm target is the industry standard for still wine under natural cork.

**Why rest after bottling?** The bottling process introduces a small amount of oxygen and disturbs the wine's chemical equilibrium. This causes a temporary suppression of aroma and flavour known as "bottle shock." Most wines recover within 2–4 weeks.`,
    tribal_knowledge: `The most common bottling fault in home winemaking is not checking for MLF completion. The second most common is bottling with insufficient SO₂. Both are preventable with two simple tests that take 15 minutes. Do not skip them.

A wine that tastes slightly flat or closed immediately after bottling is not a bad wine — it is a wine in shock. Give it time. A wine that smells of vinegar or tastes of fizz immediately after bottling has a problem that time will not fix.

Natural cork is romantic but unforgiving. A poorly inserted cork, a contaminated cork, or a cork stored upright for more than a few weeks will fail. Screw caps are more reliable for home winemakers and there is no quality penalty for red wines intended to be drunk within 5 years.

Bottling day is the culmination of months of work and the highest-risk day in the cellar for irreversible mistakes. The pre-bottling checklist (Step 1) must be completed without exception. A faulty bottle cannot be un-bottled.`,
    csu_subject_ref: "WSC202, WSC318, WSC401",
  },
];

console.log(`Inserting ${sops.length} SOPs into sop_library...`);

for (const sop of sops) {
  await connection.execute(
    `INSERT INTO sop_library 
      (category, sort_order, title, procedure_text, decision_logic, tribal_knowledge, csu_subject_ref, is_template, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, true, ?, ?)`,
    [
      sop.category,
      sop.sort_order,
      sop.title,
      sop.procedure_text,
      sop.decision_logic,
      sop.tribal_knowledge,
      sop.csu_subject_ref,
      now,
      now,
    ]
  );
  console.log(`  ✓ ${sop.title}`);
}

await connection.end();
console.log("\nDone. sop_library now has 7 rows.");
