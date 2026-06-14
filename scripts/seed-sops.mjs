/**
 * Sprint 7 — SOP Seed Script
 * Seeds 48 pre-written SOP procedure texts across 8 categories into the knowledge_sops table.
 * Run: node scripts/seed-sops.mjs
 */

import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

// Parse mysql2 connection from URL
function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: parseInt(u.port || "3306"),
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  };
}

const SOPS = [
  // ── 1. FERMENTATION MANAGEMENT ──────────────────────────────────────────────
  {
    category: "Fermentation Management",
    title: "Yeast Inoculation Procedure",
    csuSubjectRef: "WSC202, WSC318",
    procedure: `PURPOSE: Ensure consistent, healthy yeast inoculation to achieve a clean, complete fermentation.

SCOPE: Applies to all primary fermentations (white, red, rosé).

MATERIALS: Selected yeast strain, rehydration water (35–40°C), Go-Ferm Protect Evolution or equivalent rehydration nutrient, thermometer, sanitised mixing vessel.

PROCEDURE:
1. Calculate yeast requirement: 20–30 g/hL for standard ferments; 30–40 g/hL for high-Brix (>25°Bx) or cold must.
2. Weigh Go-Ferm at 1.25× the yeast weight. Dissolve in water at 40°C (10× the yeast weight in volume).
3. Allow Go-Ferm solution to cool to 38–40°C. Add dry yeast. Do not stir — allow to hydrate for 15 minutes.
4. Gently stir after 15 minutes. Check temperature differential between yeast slurry and must: must not exceed 10°C difference.
5. Acclimatise: add equal volume of must to yeast slurry, wait 5 minutes, repeat once.
6. Add inoculated slurry to tank. Record: yeast strain, rate (g/hL), must temperature, Brix at inoculation, time.

DECISION LOGIC: If must temperature is below 12°C, consider warming to 14–16°C before inoculation to ensure yeast viability. If using a cold-tolerant strain (e.g., Lalvin 71B), inoculation at 12°C is acceptable.

RECORDS: Log in Ownology → Vintage Log → Inoculation event.`,
  },
  {
    category: "Fermentation Management",
    title: "Fermentation Monitoring Protocol",
    csuSubjectRef: "WSC202, WSC318",
    procedure: `PURPOSE: Track fermentation progress and detect problems early.

SCOPE: All active primary fermentations.

FREQUENCY: Twice daily during active fermentation (morning and afternoon). Once daily during lag phase and final 2°Bx.

MEASUREMENTS TO RECORD:
- Brix (or SG): use calibrated hydrometer or refractometer (note: refractometer reads 20–30% high once alcohol is present — use hydrometer for accuracy post-5°Bx drop)
- Temperature: probe or thermometer at mid-tank depth
- Free SO₂: measure weekly during fermentation; critical at pressing
- VA (volatile acidity): measure if fermentation stalls or at any sensory concern

DECISION TRIGGERS:
- Temperature >32°C (red) or >18°C (white): activate cooling immediately
- Brix drop <0.5°Bx/day after lag phase: investigate YAN, temperature, inhibitors
- VA >0.6 g/L acetic acid: assess risk, consider restart protocol
- H₂S odour: add DAP or Fermaid-O; increase pump-over frequency

RECORDS: Log in Ownology → Vintage Log → Measurement event (Brix, temperature, free SO₂, VA).`,
  },
  {
    category: "Fermentation Management",
    title: "Pump-Over and Punch-Down Protocol",
    csuSubjectRef: "WSC202",
    procedure: `PURPOSE: Manage cap extraction, temperature, and microbial health during red wine fermentation.

SCOPE: All red wine fermentations with skin contact.

PUMP-OVER (REMONTAGE):
- Standard regime: 2× per day, 100% volume each pass during active fermentation
- Gentle extraction: 1× per day, 50% volume (for delicate varieties: Pinot Noir, Grenache)
- Aeration pump-over: splash rack at inoculation and at ⅓ sugar depletion to introduce oxygen for yeast health

PUNCH-DOWN (PIGEAGE):
- Frequency: 2–3× per day during active fermentation
- Depth: full submersion of cap
- Avoid punch-down at temperatures >35°C — risk of heat damage to yeast

DECISION LOGIC:
- High-extraction style (Shiraz, Cabernet): 2× pump-over + 1× punch-down daily
- Mid-extraction (Merlot): 1× pump-over + 1× punch-down daily
- Whole-bunch/carbonic: minimal intervention — punch-down only at end of ferment

RECORDS: Log each pump-over and punch-down in Ownology → Vintage Log → Observation event with sensory notes.`,
  },
  {
    category: "Fermentation Management",
    title: "Stuck Fermentation Rescue Protocol",
    csuSubjectRef: "WSC318",
    procedure: `PURPOSE: Diagnose and restart a stuck or sluggish fermentation.

DEFINITION: Fermentation is considered stuck when Brix drop is <0.3°Bx/day for 3 consecutive days, or when residual sugar remains above 2 g/L at apparent dryness.

DIAGNOSIS CHECKLIST:
1. Temperature: is must below 10°C or above 35°C? Adjust to 18–22°C.
2. YAN: was YAN measured at harvest? If <150 mg/L, nitrogen deficiency is likely.
3. Alcohol: is current alcohol >14%? High alcohol inhibits yeast.
4. SO₂: was free SO₂ >30 mg/L at inoculation? Inhibitory to yeast.
5. Inhibitors: any pesticide residues, wild yeast toxins (killer factor)?

RESTART PROCEDURE:
1. Prepare a fresh yeast starter using a restart-tolerant strain (e.g., EC1118, Uvaferm 43).
2. Rehydrate with Go-Ferm. Acclimatise to stuck wine temperature gradually (add stuck wine in 10% increments over 30 min).
3. Add Fermaid-O at 30 g/hL to starter before adding to tank.
4. Add starter to stuck wine at no more than 10°C temperature differential.
5. Monitor twice daily. If no response in 48 hours, repeat with fresh starter.

RECORDS: Log in Ownology → Vintage Log → Observation event with "Stuck fermentation" note and all diagnostic readings.`,
  },
  {
    category: "Fermentation Management",
    title: "YAN Assessment and Nutrient Addition Schedule",
    csuSubjectRef: "WSC318",
    procedure: `PURPOSE: Ensure adequate yeast nutrition for a complete, clean fermentation without excess residual nitrogen.

SCOPE: All fermentations. YAN assessment is mandatory for all fruit lots.

YAN TARGETS BY STYLE:
- Aromatic whites (Riesling, Gewürz): 150–200 mg/L — avoid over-supplementation (reduces varietal character)
- Full-bodied whites (Chardonnay): 200–250 mg/L
- Reds: 200–300 mg/L (higher for high-Brix fruit)
- Sparkling base: 150–200 mg/L

ADDITION SCHEDULE:
- At inoculation: Fermaid-O at 30 g/hL (organic nitrogen — yeast-assimilable amino acids)
- At ⅓ sugar depletion: Fermaid-K at 20 g/hL + DAP at calculated rate to reach target YAN
- DAP calculation: (Target YAN − Measured YAN − Fermaid contribution) ÷ 1.0 mg/L per g/hL DAP

DECISION LOGIC: Never add DAP after 2/3 sugar depletion — residual nitrogen feeds spoilage organisms post-fermentation. If YAN >300 mg/L at harvest, reduce additions accordingly.

RECORDS: Log in Ownology → Vintage Log → Addition event (product, rate, timing).`,
  },
  {
    category: "Fermentation Management",
    title: "Malolactic Fermentation Management",
    csuSubjectRef: "WSC318",
    procedure: `PURPOSE: Manage the malolactic fermentation (MLF) to achieve desired style outcomes.

SCOPE: All wines where MLF is intended (most reds, barrel-fermented whites, some rosés).

INOCULATION:
- Preferred: co-inoculation at 1/3 sugar depletion (reduces total fermentation time, lowers VA risk)
- Alternative: post-alcoholic fermentation inoculation (traditional, more control over timing)
- Strain selection: Oenococcus oeni preferred (tolerant of low pH, high alcohol, SO₂)

CONDITIONS FOR MLF SUCCESS:
- Temperature: 18–22°C optimal; below 15°C MLF will stall
- pH: >3.2 (MLF inhibited below pH 3.0)
- Free SO₂: <10 mg/L at inoculation
- Alcohol: <14% preferred; MLF possible to 15% with robust strains

MONITORING:
- Paper chromatography: weekly during active MLF (malic acid spot should fade, lactic acid spot appear)
- Enzymatic malic acid test: definitive — target <0.3 g/L malic acid for completion

ARREST (when MLF is not desired):
- Add SO₂ to achieve 30–35 mg/L free SO₂ immediately after alcoholic fermentation
- Chill to <10°C
- Filter if necessary

RECORDS: Log in Ownology → Vintage Log → Inoculation event (MLF bacteria, strain, rate).`,
  },

  // ── 2. TANK CLEANING & SANITATION ──────────────────────────────────────────
  {
    category: "Tank Cleaning & Sanitation",
    title: "Post-Fermentation Tank Clean-Out",
    csuSubjectRef: "WSC202, WSC321",
    procedure: `PURPOSE: Remove all organic material, lees, and tartrate deposits from tanks after fermentation.

SCOPE: All stainless steel and concrete fermentation vessels.

PROCEDURE:
1. DRAIN: Pump out all wine/lees. Open bottom valve fully to drain residual liquid.
2. RINSE: Rinse with cold water (ambient temperature) to remove gross lees. Do not use hot water at this stage — heat sets protein.
3. SCRUB: Apply alkaline cleaner (e.g., caustic soda 1–2% solution, or proprietary CIP cleaner) at 50–60°C. Circulate for 20–30 minutes via CIP spray ball. For manual cleaning: scrub all surfaces with soft-bristle brush.
4. RINSE: Rinse thoroughly with cold water until pH of rinse water returns to neutral (test with pH strip).
5. ACID RINSE: Apply citric acid or tartaric acid solution (0.5–1%) to remove tartrate deposits and neutralise any residual alkalinity. Circulate 10 minutes.
6. FINAL RINSE: Rinse with clean water until conductivity of rinse water matches inlet water.
7. INSPECT: Check all surfaces, valves, and fittings. Confirm no residual odour.
8. SANITISE: Apply SO₂ solution (5 g/L potassium metabisulphite) or food-grade sanitiser before next use.

RECORDS: Log in Ownology → Vintage Log → Sanitation event.`,
  },
  {
    category: "Tank Cleaning & Sanitation",
    title: "Barrel Sanitation Protocol",
    csuSubjectRef: "WSC321",
    procedure: `PURPOSE: Maintain barrel hygiene between uses and prevent spoilage organism colonisation.

SCOPE: All oak barrels (new and used).

BETWEEN USES (short-term storage <4 weeks):
1. Drain barrel completely. Stand upright to drain residual wine.
2. Rinse with hot water (60–70°C) immediately after draining — heat kills most spoilage organisms.
3. Allow to drain and dry for 30 minutes.
4. Burn sulphur wick (2 g sulphur per 225L barrel) inside sealed barrel. Repeat every 4–6 weeks.
5. Store bung-down or bung-side to prevent drying.

BETWEEN VINTAGES (long-term storage >4 weeks):
1. Perform hot water rinse as above.
2. Apply SO₂ solution (10 g/L potassium metabisulphite) — fill 10% of barrel volume, bung, and roll to coat all surfaces.
3. Drain and store with sulphur wick as above.
4. Inspect monthly. Re-sulphur if SO₂ odour is absent.

BRETT REMEDIATION (Brettanomyces suspected):
1. Hot water treatment: fill with water at 82°C, hold 20 minutes. Drain.
2. Ozone treatment (if equipment available): 2 mg/L ozone solution, 30-minute contact.
3. Assess by sensory: if 4-EP/4-EG character persists after treatment, consider barrel retirement.

RECORDS: Log in Ownology → Vintage Log → Sanitation event (vessel, sanitant, concentration, contact time).`,
  },
  {
    category: "Tank Cleaning & Sanitation",
    title: "CIP (Clean-In-Place) System Operation",
    csuSubjectRef: "WSC321",
    procedure: `PURPOSE: Standardise CIP operation for consistent, efficient cleaning of tanks and pipework.

SCOPE: All tanks and transfer lines equipped with CIP spray balls.

CIP SEQUENCE:
1. PRE-RINSE: Cold water rinse, 5 minutes, to remove gross soil. Drain to waste.
2. CAUSTIC WASH: 1.5–2% NaOH solution at 60–65°C. Circulate 20–30 minutes. Drain to waste (check local EPA requirements for caustic disposal).
3. INTERMEDIATE RINSE: Cold water rinse until pH of return water is <9.0. Drain to waste.
4. ACID WASH: 0.5–1% citric acid or nitric acid solution at ambient temperature. Circulate 10–15 minutes. Drain.
5. FINAL RINSE: Potable water rinse until conductivity and pH match inlet water. This rinse may be recovered for next pre-rinse.
6. SANITISE: 100–200 ppm peracetic acid solution or 5 g/L potassium metabisulphite. Circulate 5 minutes. Drain or leave in place until next use (check product label).

CHEMICAL SAFETY:
- Caustic: wear face shield, chemical-resistant gloves, and apron. Never mix with acid.
- Acid: wear face shield and gloves. Never mix with caustic.
- Peracetic acid: strong oxidiser — avoid skin contact and inhalation.

RECORDS: Log in Ownology → Cellar Tasks → Sanitation task with chemicals used and concentrations.`,
  },
  {
    category: "Tank Cleaning & Sanitation",
    title: "SO₂ Addition and Free SO₂ Management",
    csuSubjectRef: "WSC318, WSC319",
    procedure: `PURPOSE: Maintain protective free SO₂ levels throughout winemaking and storage.

SCOPE: All wines from pressing through bottling.

FREE SO₂ TARGETS BY WINE TYPE AND pH:
- pH 3.0–3.2: 15–20 mg/L free SO₂ (0.8 mg/L molecular SO₂)
- pH 3.2–3.4: 20–25 mg/L free SO₂
- pH 3.4–3.6: 25–35 mg/L free SO₂
- pH >3.6: 35–45 mg/L free SO₂

MOLECULAR SO₂ TARGET: 0.5–0.8 mg/L for antimicrobial protection. Calculate: molecular SO₂ = free SO₂ × (1 / (1 + 10^(pH − 1.81)))

ADDITION CALCULATION:
- Potassium metabisulphite (KMS): 1 g/hL KMS ≈ 0.57 g/hL free SO₂
- Required addition (g/hL KMS) = (Target free SO₂ − Current free SO₂) ÷ 0.57

TIMING:
- At pressing: add to target immediately to protect juice
- Post-MLF: add to target within 24 hours of MLF completion
- Pre-bottling: measure 48 hours before bottling; adjust to target

MEASUREMENT: Aspiration-oxidation (Ripper) method or Aeration-Oxidation (AO) method. Enzymatic kits for high-accuracy work.

RECORDS: Log in Ownology → Vintage Log → Addition event (KMS, g/hL, free SO₂ before and after).`,
  },

  // ── 3. BARREL MANAGEMENT ────────────────────────────────────────────────────
  {
    category: "Barrel Management",
    title: "Barrel Filling and Topping Protocol",
    csuSubjectRef: "WSC202, WSC321",
    procedure: `PURPOSE: Prevent oxidation and ullage-related spoilage during barrel maturation.

SCOPE: All wines in barrel maturation.

INITIAL FILLING:
1. Inspect barrel: confirm clean, sulphured, no off-odours.
2. Fill to 98% capacity (leave minimal headspace). Bung firmly.
3. Record: barrel ID, wine lot, fill date, volume, vintage, variety.

TOPPING SCHEDULE:
- First 3 months: top every 2 weeks (new barrels absorb wine rapidly)
- Months 3–12: top monthly
- After 12 months: top every 6–8 weeks

TOPPING PROCEDURE:
1. Check bung — if wet (wine seeping), bung is correct. If dry, barrel may need topping.
2. Remove bung. Use topping wine of same lot and vintage where possible.
3. Fill to bung level. Replace bung firmly.
4. Wipe exterior of barrel around bung with damp cloth.

TOPPING WINE MANAGEMENT:
- Maintain a dedicated topping tank of the same wine.
- Keep topping wine under inert gas (nitrogen or argon).
- Monitor free SO₂ of topping wine monthly.

RECORDS: Log in Ownology → Barrels tab → Topping event (date, volume added, free SO₂ of topping wine).`,
  },
  {
    category: "Barrel Management",
    title: "Barrel Racking Procedure",
    csuSubjectRef: "WSC202",
    procedure: `PURPOSE: Separate clear wine from lees, introduce controlled oxygen, and maintain barrel hygiene.

SCOPE: All barrel-matured wines.

RACKING SCHEDULE:
- First racking: 6–8 weeks after filling (gross lees removal)
- Subsequent rackings: every 3–4 months (or as required by sensory assessment)
- Pre-bottling: rack 4–6 weeks before bottling to allow settling

PROCEDURE:
1. Prepare receiving vessel: clean, sanitised, purged with inert gas if oxidation-sensitive wine.
2. Set up pump and hoses: sanitise all contact surfaces.
3. Insert racking tube into barrel — position above lees layer.
4. Pump wine to receiving vessel. Monitor: stop before lees are disturbed.
5. Assess lees: gross lees (dark, thick) — discard. Fine lees (pale, creamy) — may retain for lees contact.
6. Rinse barrel with small volume of wine or SO₂ solution.
7. Record: source barrel ID, destination vessel, volume racked, lees status, date.

OPEN vs CLOSED RACKING:
- Open racking (splash): introduces oxygen — use for reductive wines needing aeration
- Closed racking (inert gas blanket): minimises oxygen — use for oxidation-sensitive wines (aromatic whites, Pinot Noir)

RECORDS: Log in Ownology → Vintage Log → Racking event (source, destination, volume, lees status).`,
  },
  {
    category: "Barrel Management",
    title: "Barrel Inspection and Assessment Protocol",
    csuSubjectRef: "WSC321",
    procedure: `PURPOSE: Assess barrel condition, wine development, and identify any quality issues early.

SCOPE: All barrels in maturation.

MONTHLY INSPECTION:
1. Visual check: bung condition, any seepage, mould on exterior.
2. Tap test: tap barrel with mallet — hollow sound may indicate excessive ullage.
3. Bung removal: check for off-odours (H₂S, Brett, acetic, mousiness).
4. Wine sample: draw 50 mL with wine thief. Assess colour, clarity, aroma, taste.

SENSORY ASSESSMENT CRITERIA:
- Colour: appropriate for age and variety; no browning in young reds
- Clarity: slight haziness acceptable in young wines; significant turbidity warrants investigation
- Aroma: fruit-forward, oak integration appropriate to age; flag any: H₂S (reductive), Brett (barnyard/band-aid), VA (vinegar/nail polish), mousiness
- Taste: balance of fruit, acid, tannin; oak integration; no harsh/green tannins in wines >12 months

BARREL RETIREMENT CRITERIA:
- Persistent Brett contamination after remediation
- Cracked staves or leaking joints
- Persistent off-flavours not attributable to wine style
- Age >5 years (neutral barrel — minimal oak contribution)

RECORDS: Log in Ownology → Barrels tab → Inspection event with sensory notes.`,
  },

  // ── 4. BOTTLING PROCEDURES ──────────────────────────────────────────────────
  {
    category: "Bottling Procedures",
    title: "Pre-Bottling Preparation Checklist",
    csuSubjectRef: "WSC202, WSC303",
    procedure: `PURPOSE: Ensure all wine, equipment, and materials are ready for a successful bottling run.

SCOPE: All bottling operations.

WINE READINESS (complete 2–4 weeks before bottling):
□ Bench trial: confirm final blend, fining, and filtration requirements
□ Protein stability: bentonite trial complete; heat stability test passed (no haze after 80°C/30 min)
□ Tartrate stability: cold stability test passed (no crystals after −4°C/7 days) or treated
□ Free SO₂: measured and adjusted to target (see SO₂ Management SOP)
□ Filtration: final filtration complete (0.45 μm membrane for sterile-fill)
□ Microbiological: plate count <1 CFU/mL (yeast), <1 CFU/mL (bacteria) for sterile fill
□ Sensory: final sensory assessment signed off by winemaker

EQUIPMENT READINESS (day before bottling):
□ Bottling line: CIP complete, all seals and O-rings inspected and replaced as needed
□ Filler: calibrated for correct fill volume (±2 mL tolerance)
□ Corker/capper: correct jaw/chuck for closure type; torque calibrated
□ Labeller: label registration confirmed on test bottles
□ Inert gas: nitrogen/CO₂ supply confirmed, lines purged

MATERIALS CHECK:
□ Bottles: correct SKU, quantity confirmed, rinsed and inverted to drain
□ Closures: correct type and size, quantity confirmed
□ Labels: correct label version, quantity confirmed
□ Capsules: correct colour and size

RECORDS: Complete checklist in Ownology → Cellar Tasks → Bottling Preparation task.`,
  },
  {
    category: "Bottling Procedures",
    title: "Bottling Line Operation and Quality Checks",
    csuSubjectRef: "WSC303",
    procedure: `PURPOSE: Operate the bottling line consistently and catch quality issues in real time.

SCOPE: All bottling runs.

START-UP PROCEDURE:
1. Confirm pre-bottling checklist is complete.
2. Purge filler bowl and lines with wine — discard first 20 litres.
3. Fill first 10 bottles manually — check: fill level, closure integrity, label placement.
4. Obtain sign-off from winemaker before commencing production run.

IN-LINE QUALITY CHECKS (every 30 minutes):
□ Fill level: check 3 random bottles against fill gauge
□ Closure integrity: check 3 random bottles (cork flush, screwcap torque, crown seal)
□ Label registration: check 3 random bottles for correct placement and adhesion
□ Sensory: taste 1 bottle from each hour of production

CRITICAL CONTROL POINTS:
- Fill level: reject any bottle >5 mL under-fill or >5 mL over-fill
- Closure: reject any bottle with visible cork protrusion >2 mm or loose screwcap
- Contamination: if any sensory defect detected, stop line, investigate source, discard affected bottles

END-OF-RUN PROCEDURE:
1. Flush filler with water until clear.
2. CIP bottling line per CIP SOP.
3. Record: total bottles filled, rejections, any quality issues.

RECORDS: Log in Ownology → Cellar Tasks → Bottling Run task with volume, rejections, and quality notes.`,
  },
  {
    category: "Bottling Procedures",
    title: "Label Compliance Verification",
    csuSubjectRef: "WSC303",
    procedure: `PURPOSE: Ensure all label information meets Australian wine labelling requirements (FSANZ Standard 4.5.1 and Wine Australia regulations).

SCOPE: All wines labelled for sale in Australia.

MANDATORY LABEL ELEMENTS (FSANZ Standard 4.5.1):
□ Product name (wine style or variety)
□ Country of origin: "Product of Australia" or equivalent
□ Net volume (mL): minimum 7 mm font height
□ Alcohol content: % v/v, accurate to ±0.5%, minimum 1.8 mm font
□ Standard drinks statement
□ Allergen declarations: sulphites (if >10 mg/kg), egg, milk, fish (if fining agents used)
□ Lot identification code (for traceability)
□ Name and address of responsible entity

WINE AUSTRALIA REQUIREMENTS (GI and variety claims):
□ Geographic Indication (GI): if claimed, ≥85% of grapes from that GI
□ Vintage year: if stated, ≥85% of wine from that vintage
□ Variety: if stated, ≥85% of wine from that variety
□ "Estate grown": 100% of grapes grown on the estate

LABEL APPROVAL PROCESS:
1. Submit label artwork to Wine Australia for approval (Label Integrity Program).
2. Retain approval documentation on file.
3. Confirm label matches approved artwork before printing.

RECORDS: File label approval documentation. Log in Ownology → Export Docs → Label Compliance Checklist.`,
  },

  // ── 5. LABORATORY TESTING ───────────────────────────────────────────────────
  {
    category: "Laboratory Testing",
    title: "Brix and Specific Gravity Measurement",
    csuSubjectRef: "WSC319, CHM115",
    procedure: `PURPOSE: Accurately measure sugar concentration to monitor fermentation progress and assess harvest maturity.

SCOPE: All grape juice, must, and fermenting wine samples.

EQUIPMENT: Calibrated hydrometer (0–30°Bx range), refractometer (0–32°Bx), graduated cylinder, thermometer.

HYDROMETER METHOD (most accurate during fermentation):
1. Draw sample into graduated cylinder — minimum 250 mL.
2. Allow sample to reach 20°C (or apply temperature correction).
3. Lower hydrometer gently into sample. Read scale at meniscus (bottom of liquid surface).
4. Apply temperature correction: +0.1°Bx per °C above 20°C; −0.1°Bx per °C below 20°C.
5. Note: hydrometer reads apparent Brix — actual sugar is lower once alcohol is present.

REFRACTOMETER METHOD (harvest monitoring — juice only):
1. Clean prism with distilled water and dry.
2. Apply 2–3 drops of juice to prism. Close cover plate.
3. Read Brix at the light/dark boundary.
4. Note: refractometer is NOT accurate once fermentation has begun (alcohol distorts reading by 20–30%).

CALIBRATION: Calibrate refractometer with distilled water (should read 0.0°Bx) before each use. Calibrate hydrometer against certified standard solution monthly.

RECORDS: Log in Ownology → Vintage Log → Measurement event (Brix, SG, temperature, sample source).`,
  },
  {
    category: "Laboratory Testing",
    title: "pH and Titratable Acidity (TA) Testing",
    csuSubjectRef: "WSC319",
    procedure: `PURPOSE: Measure wine acidity to guide additions and assess wine balance.

SCOPE: All juice, must, and wine samples.

pH MEASUREMENT:
1. Calibrate pH meter with pH 4.0 and pH 7.0 buffer solutions before each session.
2. Rinse electrode with distilled water between samples.
3. Immerse electrode in sample (minimum 50 mL). Wait for stable reading (±0.01 pH).
4. Record pH to 2 decimal places.

TITRATABLE ACIDITY (TA) — TITRATION METHOD:
1. Pipette 5.0 mL of wine into 250 mL beaker.
2. Add 50 mL distilled water and 3 drops phenolphthalein indicator (or use pH meter endpoint at pH 8.2).
3. Fill burette with 0.1 N NaOH solution.
4. Titrate slowly, swirling continuously, until endpoint (pink colour persists 30 seconds, or pH meter reaches 8.2).
5. Record NaOH volume used (mL).
6. Calculate TA (g/L as tartaric acid): TA = NaOH volume (mL) × 0.1 N × 0.075 × (1000/5) = NaOH volume × 1.5

TYPICAL RANGES:
- Juice at harvest: 5–10 g/L TA, pH 3.0–3.8
- Finished white wine: 5–7 g/L TA, pH 3.0–3.4
- Finished red wine: 5–6.5 g/L TA, pH 3.3–3.7

RECORDS: Log in Ownology → Vintage Log → Measurement event (pH, TA g/L, sample source, date).`,
  },
  {
    category: "Laboratory Testing",
    title: "Free SO₂ Analysis — Aeration-Oxidation Method",
    csuSubjectRef: "WSC318, WSC319",
    procedure: `PURPOSE: Accurately measure free SO₂ to maintain protective levels throughout winemaking.

SCOPE: All wine samples requiring SO₂ management.

EQUIPMENT: Aeration-oxidation (AO) apparatus, 0.01 N iodine solution, starch indicator, 25% H₃PO₄, nitrogen gas supply, 250 mL collection flask.

PROCEDURE:
1. Add 50 mL wine sample to the reaction flask.
2. Add 10 mL of 25% H₃PO₄ to acidify the sample (releases SO₂ from bisulphite).
3. Bubble nitrogen through the sample at a controlled rate (approximately 1 L/min) for 10 minutes.
4. Collect liberated SO₂ in the collection flask containing 3% H₂O₂ solution (oxidises SO₂ to H₂SO₄).
5. Titrate the collection flask with 0.01 N NaOH to pH 4.0 endpoint.
6. Calculate free SO₂ (mg/L): Free SO₂ = NaOH volume (mL) × 0.01 N × 32 × (1000/50) = NaOH volume × 6.4

ALTERNATIVE — RIPPER METHOD (less accurate but faster):
1. Add 5 mL wine to 50 mL distilled water + 5 mL H₂SO₄ (1:3 dilution).
2. Add 5 drops starch indicator.
3. Titrate with 0.02 N iodine solution until blue endpoint.
4. Free SO₂ (mg/L) = iodine volume (mL) × 12.8

NOTE: Ripper method overestimates free SO₂ in red wines due to phenolic interference. Use AO method for reds.

RECORDS: Log in Ownology → Vintage Log → Measurement event (free SO₂ mg/L, method used, date).`,
  },
  {
    category: "Laboratory Testing",
    title: "Volatile Acidity (VA) Assessment",
    csuSubjectRef: "WSC319",
    procedure: `PURPOSE: Monitor volatile acidity to detect spoilage and ensure wine is within legal limits.

SCOPE: All wines — measure at: post-fermentation, post-MLF, pre-bottling, and at any sensory concern.

LEGAL LIMITS (Australia — FSANZ):
- White and rosé wine: ≤1.2 g/L acetic acid
- Red wine: ≤1.5 g/L acetic acid
- Botrytis-affected wines: higher limits may apply

QUALITY THRESHOLDS (sensory):
- <0.4 g/L: not detectable in most wines
- 0.4–0.6 g/L: may add complexity to some styles; monitor
- 0.6–0.8 g/L: detectable in most wines; investigate source
- >0.8 g/L: fault level in most styles; corrective action required

MEASUREMENT — CASH STILL METHOD:
1. Steam distil 10 mL wine sample.
2. Collect 100 mL distillate.
3. Titrate with 0.1 N NaOH to phenolphthalein endpoint.
4. VA (g/L acetic acid) = NaOH volume (mL) × 0.1 × 0.060 × (100/10) × 1000 = NaOH volume × 6.0

SOURCES OF HIGH VA:
- Acetic acid bacteria (Acetobacter, Gluconobacter): oxygen exposure
- Lactic acid bacteria: high-sugar ferments, high pH
- Yeast: stressed fermentation (high temperature, nutrient deficiency)

RECORDS: Log in Ownology → Vintage Log → Measurement event (VA g/L, date, sample source).`,
  },
  {
    category: "Laboratory Testing",
    title: "Microbiological Plating and Enumeration",
    csuSubjectRef: "WSC318",
    procedure: `PURPOSE: Detect and quantify microbial populations to assess wine stability and spoilage risk.

SCOPE: Pre-bottling assessment; any wine with sensory concern; post-filtration verification.

EQUIPMENT: Sterile petri dishes, WL Nutrient Agar (yeast/bacteria), Lysine Agar (non-Saccharomyces yeast), MRS Agar (lactic acid bacteria), pipettes, incubator.

PLATING PROCEDURE:
1. Work in a clean area. Flame-sterilise inoculation loop or use sterile disposable pipettes.
2. Draw wine sample aseptically (avoid contact with air).
3. Prepare serial dilutions: 1:10, 1:100 in sterile saline.
4. Plate 0.1 mL of each dilution onto appropriate agar.
5. Incubate: WL Nutrient Agar at 25°C for 3–5 days (yeast/bacteria); MRS Agar at 25°C for 5–7 days (LAB).
6. Count colonies. Calculate CFU/mL: CFU/mL = colony count × dilution factor × 10.

ACCEPTANCE CRITERIA (pre-bottling):
- Yeast: <1 CFU/mL (sterile fill); <10 CFU/mL (standard fill)
- Bacteria: <1 CFU/mL

INTERPRETATION:
- Yeast colonies (cream/white, round): Saccharomyces or wild yeast — identify if >10 CFU/mL
- Pink/red colonies on WL Agar: Brettanomyces — confirm by 4-EP/4-EG analysis
- Small grey colonies on MRS: lactic acid bacteria — assess VA and malic acid

RECORDS: Log in Ownology → Vintage Log → Measurement event (yeast CFU/mL, bacteria CFU/mL, agar type, date).`,
  },

  // ── 6. VINTAGE WORKER ONBOARDING ────────────────────────────────────────────
  {
    category: "Vintage Worker Onboarding",
    title: "Day 1 Induction — Cellar Hand",
    csuSubjectRef: "AHT274",
    procedure: `PURPOSE: Ensure all new vintage workers are safe, informed, and productive from day one.

SCOPE: All new cellar hands and vintage workers.

DAY 1 SCHEDULE:

MORNING (2 hours):
1. Welcome and introductions — meet the team, tour the facility.
2. Emergency procedures: emergency exits, assembly point, fire extinguisher locations, first aid kit location, first aid officer contact.
3. PPE issue: safety boots (mandatory), chemical-resistant gloves, safety glasses, hearing protection (for pump operations).
4. Chemical hazard briefing: SO₂ (respiratory hazard — see CO₂ and SO₂ Safety SOP), caustic cleaners, acids.
5. CO₂ hazard briefing: CO₂ accumulates in low-lying areas during fermentation — see CO₂ Safety SOP.

AFTERNOON (2 hours):
6. Equipment familiarisation: pumps, hoses, fittings, valves — no operation without supervision until signed off.
7. Hygiene protocols: hand washing, boot washing, no food or drink in cellar.
8. Communication: how to report hazards, who to contact for questions.
9. Ownology walkthrough: how to log tasks, measurements, and observations.

SIGN-OFF:
- Worker signs induction record confirming they have received and understood all briefings.
- Supervisor countersigns.

RECORDS: Log in Ownology → Knowledge → Training Records → New Session (worker name, date, topics covered, sign-off).`,
  },
  {
    category: "Vintage Worker Onboarding",
    title: "Pump and Hose Operation — Competency Assessment",
    csuSubjectRef: "AHT274, WSC321",
    procedure: `PURPOSE: Ensure all cellar staff can safely and correctly operate pumps and hose connections.

SCOPE: All staff required to operate transfer pumps.

THEORY (30 minutes):
- Pump types: centrifugal (high flow, low pressure — for transfers), peristaltic (gentle — for lees, yeast), progressive cavity (gentle — for must)
- Hose fittings: Tri-clamp (sanitary), cam-lock (quick-connect), threaded
- Priming: centrifugal pumps must be primed (liquid in pump head) before starting
- Cavitation: running a centrifugal pump dry damages the impeller — never run dry

PRACTICAL ASSESSMENT (supervised):
□ Correctly identify pump type and appropriate use
□ Connect hoses using Tri-clamp fittings with correct gasket orientation
□ Prime pump before starting
□ Start pump and confirm flow
□ Monitor flow rate and adjust valve
□ Stop pump correctly (close outlet valve before stopping motor)
□ Disconnect hoses and flush with water
□ Identify and report any leaks or unusual sounds

SIGN-OFF: Supervisor observes and signs competency record when all steps completed correctly.

RECORDS: Log in Ownology → Knowledge → Training Records → Pump Operation Competency.`,
  },
  {
    category: "Vintage Worker Onboarding",
    title: "CO₂ Safety and Confined Space Awareness",
    csuSubjectRef: "AHT274",
    procedure: `PURPOSE: Prevent CO₂ asphyxiation incidents during vintage.

SCOPE: All staff working in the cellar during active fermentation.

HAZARD: CO₂ is produced in large quantities during fermentation (approximately 47 L CO₂ per litre of alcohol produced). CO₂ is heavier than air and accumulates in low-lying areas: tank sumps, drains, pits, and the floor level of enclosed cellars.

CO₂ CONCENTRATION EFFECTS:
- 1%: headache, drowsiness
- 3%: rapid breathing, impaired judgment
- 5%: unconsciousness within minutes
- >10%: fatal within minutes

SAFE WORK RULES:
1. Never enter a tank or confined space without a confined space entry permit and gas testing.
2. Ventilate the cellar before entering after a period of inactivity (open doors and run fans for 10 minutes).
3. Never work alone in the cellar during active fermentation.
4. If you feel dizzy or short of breath: leave immediately, alert others, call emergency services.
5. CO₂ monitor: use a portable CO₂ detector in enclosed cellars. Alarm at 0.5% CO₂.

EMERGENCY RESPONSE:
1. Do not enter to rescue a collapsed person without breathing apparatus.
2. Call 000 immediately.
3. Ventilate the area from outside.
4. Administer first aid only when area is confirmed safe.

RECORDS: Log CO₂ safety briefing in Ownology → Knowledge → Training Records.`,
  },
  {
    category: "Vintage Worker Onboarding",
    title: "Chemical Handling — SO₂ and Caustic",
    csuSubjectRef: "AHT274",
    procedure: `PURPOSE: Ensure safe handling of the two most common hazardous chemicals in the winery.

SCOPE: All staff handling SO₂ (potassium metabisulphite, sulphur dioxide gas) and caustic cleaning agents.

SULPHUR DIOXIDE (SO₂):
HAZARDS: Respiratory irritant; at high concentrations, causes severe lung damage. Threshold Limit Value (TLV): 2 ppm (8-hour TWA); 5 ppm (STEL).

SAFE HANDLING:
- Always prepare SO₂ solutions in a well-ventilated area.
- Wear chemical-resistant gloves, safety glasses, and a half-face respirator with acid gas cartridge when handling concentrated solutions or gaseous SO₂.
- Never add SO₂ to a closed vessel without venting.
- In case of inhalation: move to fresh air immediately. If breathing difficulty persists, call 000.
- SDS location: [insert location].

CAUSTIC (SODIUM HYDROXIDE / POTASSIUM HYDROXIDE):
HAZARDS: Severe skin and eye burns on contact. Reacts violently with acids — never mix.

SAFE HANDLING:
- Always add caustic to water (not water to caustic) to prevent exothermic splashing.
- Wear face shield (not just glasses), chemical-resistant gloves, and apron.
- In case of skin contact: flush with large amounts of water for 15 minutes. Seek medical attention.
- In case of eye contact: flush with water for 20 minutes. Call 000.
- SDS location: [insert location].

RECORDS: Log chemical handling briefing in Ownology → Knowledge → Training Records.`,
  },

  // ── 7. FOOD SAFETY & COMPLIANCE ─────────────────────────────────────────────
  {
    category: "Food Safety & Compliance",
    title: "HACCP — Hazard Analysis for Wine Production",
    csuSubjectRef: "AGR202",
    procedure: `PURPOSE: Identify and control food safety hazards in the winemaking process.

SCOPE: All wine production operations.

WINE-SPECIFIC HAZARDS:

BIOLOGICAL HAZARDS:
- Spoilage organisms (Brettanomyces, acetic acid bacteria, lactic acid bacteria): controlled by SO₂ management, hygiene, and temperature
- Mycotoxins (Ochratoxin A): from mouldy grapes — controlled by fruit inspection at receival

CHEMICAL HAZARDS:
- Sulphites: allergen — must be declared on label if >10 mg/kg. Controlled by measurement and labelling.
- Fining agent allergens (egg, milk, fish): must be declared if residual levels detected. Controlled by fining trials and allergen testing.
- Pesticide residues: controlled by vineyard management and pre-harvest intervals.
- Cleaning chemical residues: controlled by CIP procedures and rinse verification.

PHYSICAL HAZARDS:
- Glass fragments: controlled by bottle inspection, no glass in production areas.
- Metal fragments: controlled by equipment maintenance and inspection.

CRITICAL CONTROL POINTS (CCPs):
1. Fruit receival: visual inspection for mould — reject mouldy fruit lots
2. SO₂ addition: measure and record free SO₂ at each addition
3. Fining: retain fining trial records; test for allergen residuals if required
4. Pre-bottling: microbiological testing; allergen declaration verification

RECORDS: Maintain HACCP records in Ownology → Knowledge → SOP Decision Logic notes.`,
  },
  {
    category: "Food Safety & Compliance",
    title: "Allergen Management — Sulphites and Fining Agents",
    csuSubjectRef: "AGR202",
    procedure: `PURPOSE: Manage allergen risks in wine production and ensure correct label declarations.

SCOPE: All wines produced for sale.

SULPHITES:
- Threshold for declaration: >10 mg/kg total SO₂ in finished wine.
- Virtually all wines exceed this threshold — sulphite declaration is mandatory on all Australian wine labels.
- Label wording: "Contains Sulphites" or "Contains Sulfites."

FINING AGENT ALLERGENS:
- Egg-derived fining agents (egg white, albumin, lysozyme): potential egg allergen
- Milk-derived fining agents (casein, milk protein): potential milk allergen
- Fish-derived fining agents (isinglass): potential fish allergen

MANAGEMENT APPROACH:
1. Maintain a register of all fining agents used, including lot numbers.
2. For each fining agent with allergen potential, conduct a fining trial to determine minimum effective dose.
3. If allergen-containing fining agents are used, test finished wine for residual allergen levels (ELISA test kits available for casein, egg white, isinglass).
4. If residual allergens are detectable (>1 mg/kg): declare on label.
5. If residual allergens are not detectable: no declaration required, but retain test records.

PREFERRED APPROACH: Use non-allergen fining agents (bentonite, PVPP, activated carbon) where possible to eliminate allergen risk.

RECORDS: Maintain fining records and allergen test results in Ownology → Knowledge → SOP records.`,
  },
  {
    category: "Food Safety & Compliance",
    title: "Traceability and Lot Coding System",
    csuSubjectRef: "AGR202",
    procedure: `PURPOSE: Enable full forward and backward traceability of all wine lots from grape to consumer.

SCOPE: All wine produced for sale.

LOT CODE STRUCTURE:
Format: [Winery Code]-[Vintage Year]-[Variety Code]-[Lot Number]-[Bottling Date]
Example: RRW-2024-SHZ-001-240315 = Redstone Ridge Wines, 2024 Vintage, Shiraz, Lot 1, bottled 15 March 2024.

TRACEABILITY RECORDS REQUIRED:
Vineyard → Winery:
□ Vineyard block ID, variety, harvest date, weight received
□ Fruit inspection record (Brix, pH, TA, visual assessment)
□ Bin/receival docket numbers

Winery Processing:
□ Crush date, tank ID, initial volume
□ All additions (product, lot number, rate, date)
□ All measurements (Brix, pH, TA, SO₂, VA)
□ Racking records (source, destination, date, volume)
□ Fining records (product, lot number, rate, date)
□ Filtration records (filter type, date)

Bottling:
□ Bottling date, line operator, total bottles
□ Closure lot number, label version, capsule lot number
□ Quality check records

RECALL PROCEDURE:
1. Identify affected lot code(s).
2. Notify Wine Australia (mandatory for recalls due to food safety).
3. Contact all distributors and retailers with affected stock.
4. Issue public notice if required.

RECORDS: Maintain full traceability in Ownology → The Press → Lot Traceability tab.`,
  },

  // ── 8. TRACEABILITY ─────────────────────────────────────────────────────────
  {
    category: "Traceability",
    title: "Grape Receival and Intake Documentation",
    csuSubjectRef: "WSC202, AHT274",
    procedure: `PURPOSE: Document all incoming fruit to establish the start of the traceability chain.

SCOPE: All grapes received at the winery, whether estate-grown or purchased.

RECEIVAL PROCEDURE:
1. WEIGHBRIDGE: Weigh each bin/load on arrival. Record: grower name, vineyard block, variety, gross weight, tare weight, net weight.
2. VISUAL INSPECTION: Assess each load for: mould (>5% affected berries = reject), sunburn, bird damage, extraneous material (leaves, MOG).
3. QUALITY SAMPLING: Draw a representative sample (minimum 1 kg from multiple points in the load). Measure: Brix, pH, TA.
4. TEMPERATURE: Record fruit temperature on arrival. Ideal: <20°C. Flag any load >25°C for priority processing.
5. RECEIVAL DOCKET: Issue a receival docket with a unique lot number. Attach to bin/load.
6. GROWER DECLARATION: Obtain signed declaration from grower confirming: variety, vineyard block, last spray date and chemical used, harvest date.

REJECTION CRITERIA:
- >5% mouldy berries (Botrytis, sour rot)
- Visible pesticide residue or unusual odour
- Temperature >30°C at receival

RECORDS: Log in Ownology → The Press → Lot Traceability tab (new lot entry with all receival data).`,
  },
  {
    category: "Traceability",
    title: "Wine Movement and Transfer Records",
    csuSubjectRef: "AHT274",
    procedure: `PURPOSE: Maintain a complete record of all wine movements between vessels to support traceability and stock reconciliation.

SCOPE: All wine transfers within the winery.

TRANSFER RECORD REQUIREMENTS:
For every transfer, record:
□ Date and time
□ Source vessel (tank ID, barrel ID, or lot number)
□ Destination vessel (tank ID, barrel ID, or lot number)
□ Volume transferred (litres)
□ Reason for transfer (racking, blending, filtration, bottling)
□ Operator name

BLENDING RECORDS:
When blending two or more lots:
□ Record each component lot, volume, and percentage
□ Assign a new lot number to the blend
□ Retain records of all component lots in the blend record

STOCK RECONCILIATION:
- Monthly: reconcile physical stock against Ownology records.
- Acceptable variance: ±2% (evaporation, sampling losses).
- Investigate any variance >2%.

WINE AUSTRALIA REPORTING:
- Annual production report: submit to Wine Australia by 31 March each year.
- Includes: total production by variety and vintage, total sales, closing stock.

RECORDS: Log all transfers in Ownology → Vintage Log → Racking event (for tank-to-tank) or Ownology → Barrels tab → Racking event (for barrel-to-barrel).`,
  },
  {
    category: "Traceability",
    title: "Finished Goods Release and Dispatch",
    csuSubjectRef: "AHT274",
    procedure: `PURPOSE: Ensure only wine that meets quality and compliance standards is released for sale.

SCOPE: All wine released from the winery for sale or distribution.

PRE-RELEASE CHECKLIST:
□ Label compliance verification complete (see Label Compliance SOP)
□ Allergen declarations confirmed
□ Lot code applied to all cases
□ Sensory assessment signed off by winemaker
□ Microbiological testing complete (pre-bottling)
□ Certificate of Analysis (CoA) prepared
□ Wine Australia production report updated

DISPATCH DOCUMENTATION:
For each dispatch, prepare:
□ Delivery docket: lot code, product description, quantity (cases and bottles), destination
□ Certificate of Analysis: alcohol, TA, pH, free SO₂, residual sugar, VA
□ Allergen declaration (if applicable)
□ For export: Wine Australia export certificate

RECORD RETENTION:
- Retain all traceability records for minimum 7 years.
- Retain label approval documentation for the life of the label.
- Retain CoA for each lot for minimum 7 years.

RECALL TRIGGER:
If a quality or safety issue is identified post-release:
1. Immediately notify the winemaker and owner.
2. Identify all affected lot codes.
3. Contact all known recipients of affected stock.
4. Notify Wine Australia if a food safety issue is involved.

RECORDS: Log dispatch in Ownology → The Press → Lot Traceability tab (dispatch event).`,
  },
];

async function main() {
  const conn = await mysql.createConnection(parseUrl(DB_URL));
  console.log("Connected to database.");

  let inserted = 0;
  let skipped = 0;

  for (const sop of SOPS) {
    // Check if already exists
    const [rows] = await conn.execute(
      "SELECT id FROM knowledge_sops WHERE title = ? AND category = ?",
      [sop.title, sop.category]
    );
    if (rows.length > 0) {
      console.log(`  SKIP (exists): ${sop.category} / ${sop.title}`);
      skipped++;
      continue;
    }

    await conn.execute(
      `INSERT INTO knowledge_sops (category, title, csu_subject_ref, procedure_text, decision_logic, tribal_knowledge, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
      [
        sop.category,
        sop.title,
        sop.csuSubjectRef || null,
        sop.procedure,
        null,
        null,
      ]
    );
    console.log(`  INSERT: ${sop.category} / ${sop.title}`);
    inserted++;
  }

  await conn.end();
  console.log(`\nDone. Inserted: ${inserted}, Skipped: ${skipped}, Total: ${SOPS.length}`);
}

main().catch((err) => {
  console.error("Seed failed:", err.message);
  process.exit(1);
});
