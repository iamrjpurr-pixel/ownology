/**
 * Seed script — populates quick_steps for all SOPs in sop_library.
 * Quick steps are 3–5 action-verb bullet points a cellar hand can act on immediately.
 * Run once: node seed-quick-steps.mjs
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const connection = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();

const quickStepsMap = {
  // ── Barrel Management ───────────────────────────────────────────────────────
  1: `- Check barrel is fully drained and inspect for any visible faults or stave damage before filling
- Fill slowly to avoid splashing and oxidation — use a filling wand to the bottom
- Leave 5–10 L headspace to allow for expansion; top up weekly during first month
- Seal bung tightly and mark barrel with variety, vintage, and fill date
- Record fill volume and source batch in the vintage log immediately`,

  2: `- Prepare receiving vessel (clean, sulphured) before starting any transfer
- Pump slowly at first to avoid aeration; switch to gravity or gentle pump once flow is established
- Sample source and destination before and after — record Brix, pH, and free SO₂
- Record source barrel ID, destination vessel, and volume transferred in the vintage log
- Inspect empty barrel for faults; sanitise immediately if not refilling within 24 hours`,

  3: `- Tap the barrel with a mallet and listen for hollow spots indicating air pockets or leaks
- Smell the bung hole — any vinegar, nail polish, or musty aromas indicate a problem barrel
- Check wine colour and clarity through the bung hole using a torch
- Record inspection result (pass/fail) and any sensory observations in the vintage log
- Flag problem barrels immediately — do not blend or transfer without owner sign-off`,

  // ── Bottling Procedures ─────────────────────────────────────────────────────
  15: `- Confirm free SO₂ is at target (25–35 mg/L for most wines) at least 48 hours before bottling
- Check filter integrity — run a bubble point test on membrane filters before the run
- Flush all lines, filler heads, and hoses with sulphured water (100 ppm SO₂) immediately before use
- Verify label compliance: alcohol %, standard drinks, allergen declaration, and lot code
- Record pre-bottling analysis results and sign off on the bottling checklist`,

  16: `- Set fill height and confirm with first 10 bottles before running the full batch
- Monitor fill volume every 50 bottles — adjust filler head pressure if drift occurs
- Check cork/cap insertion on every 20th bottle — reject any with visible faults
- Record lot number, fill date, and volume bottled in the vintage log
- Retain 2 reference bottles per lot for quality archive`,

  17: `- Verify alcohol % on label matches the most recent analysis certificate (within ±0.5%)
- Confirm standard drinks calculation: (volume L × alcohol %) × 0.789 / 10
- Check sulphite declaration is present if free SO₂ > 10 mg/L
- Confirm GI claim matches the grape receival documentation
- Record label version number and sign off before printing the full run`,

  30007: `- Sanitise bottles with 100 ppm SO₂ solution immediately before filling — drain but do not rinse
- Fill to within 2 cm of the cork/cap seating point to minimise headspace
- Insert cork or cap immediately after filling — do not leave bottles open
- Label bottles with variety, vintage year, and bottling date
- Store upright for 48 hours then lay down for cork-sealed bottles`,

  // ── Cleaning & Sanitation ───────────────────────────────────────────────────
  60001: `- Rinse tank immediately after emptying — do not let residue dry
- Hot water wash at 60–70°C for 15–20 minutes, then drain completely
- Prepare 100–200 ppm SO₂ solution (1g KMS per 2L water) and spray all surfaces
- Drain but do not rinse after SO₂ application — residual SO₂ protects the tank
- Record cleaning date, chemicals used, and operator name in the vintage log`,

  // ── Crushing & Fermentation (DIY SOPs) ─────────────────────────────────────
  60002: `- Check must temperature is 18–22°C before inoculating — cold must stresses yeast
- Rehydrate yeast in 10× its weight of water at 38–40°C for 20 minutes before pitching
- Add 50 mg/L SO₂ at crush and wait 4–6 hours before inoculating
- Perform pump-overs twice daily during active fermentation (first 7 days)
- Record Brix and temperature twice daily and log every event in the vintage log`,

  60003: `- Rehydrate yeast in 10× its weight of clean water at 38–40°C for exactly 20 minutes
- Temper the yeast slurry by adding small amounts of must until temperature equalises (within 10°C)
- Pitch yeast slurry evenly across the surface of the must — do not pour into one spot
- Record yeast strain, rate (g/hL), and pitch time in the vintage log
- Monitor Brix within 24 hours to confirm fermentation has started`,

  60004: `- Start pump-overs within 12 hours of inoculation and continue twice daily through active ferment
- Pump over for 15–20 minutes per session — ensure full cap submersion
- Check must temperature during pump-over and record in the vintage log
- Smell the must during pump-over — any H₂S (rotten egg) requires immediate action
- Reduce pump-over frequency to once daily when Brix drops below 5°`,

  60005: `- Confirm primary fermentation is complete (Brix < 0, dryness confirmed by taste and hydrometer)
- Inoculate with MLF bacteria at 1g/hL in 10× their weight of warm water (25°C)
- Maintain tank temperature at 18–20°C — MLF stalls below 15°C
- Test for malic acid weekly using a paper chromatography strip or enzymatic test
- Add 50 mg/L SO₂ immediately after MLF completion to protect the wine`,

  // ── Fermentation Management ─────────────────────────────────────────────────
  26: `- Confirm must temperature is 18–22°C before pitching — cold must stresses yeast
- Rehydrate yeast at 10× weight in water at 38–40°C for 20 minutes; temper before pitching
- Pitch at 20–30 g/hL for standard fermentation; increase to 40 g/hL for high-Brix musts
- Record yeast strain, rate, pitch time, and must temperature in the vintage log
- Check for signs of fermentation (CO₂ release, temperature rise) within 24–36 hours`,

  27: `- Measure and record Brix (or SG) and temperature twice daily during active fermentation
- Monitor for stuck fermentation: no Brix drop over 48 hours requires immediate investigation
- Perform pump-overs or punch-downs twice daily during cap formation
- Record all measurements and observations in the vintage log at time of measurement
- Flag any anomalies (H₂S, stuck, temperature spike) to the head winemaker immediately`,

  28: `- Start pump-overs within 12 hours of inoculation; continue twice daily through active ferment
- Pump for 15–20 minutes per session to fully submerge the cap
- Check temperature during pump-over — target 22–28°C for red fermentation
- Smell the must during pump-over for H₂S (rotten egg) or other off-aromas
- Record pump-over time, duration, and any observations in the vintage log`,

  29: `- Confirm fermentation is genuinely stuck: Brix unchanged for 48+ hours and yeast count < 10⁵ cells/mL
- Warm the must to 22–25°C if temperature has dropped below 18°C
- Add a rehydrated stuck fermentation yeast (e.g. EC1118) at 40 g/hL with GoFerm Protect
- Add a full nutrient addition (DAP + organic nitrogen) at ⅓ sugar depletion rate
- Monitor Brix every 12 hours and record all rescue additions in the vintage log`,

  30: `- Measure YAN using an enzymatic test kit or send to a lab before inoculation
- Calculate DAP addition: target 200 ppm YAN for standard fermentation; adjust for variety
- Split addition: 50% at inoculation, 50% at ⅓ sugar depletion (approximately 16 Brix)
- Dissolve DAP in a small volume of must before adding — never add dry directly to tank
- Record YAN result, DAP addition amount, timing, and operator in the vintage log`,

  31: `- Confirm primary fermentation is complete before inoculating MLF bacteria
- Maintain temperature at 18–20°C throughout MLF — use a heat mat or warm room if needed
- Test for malic acid weekly using paper chromatography or an enzymatic test kit
- Add 50 mg/L SO₂ immediately after MLF completion confirmed
- Record MLF inoculation date, completion date, and SO₂ addition in the vintage log`,

  30002: `- Check must temperature is 18–22°C before inoculating — cold must stresses yeast
- Rehydrate yeast in 10× its weight of water at 38–40°C for 20 minutes before pitching
- Add 50 mg/L SO₂ at crush and wait 4–6 hours before inoculating
- Perform pump-overs twice daily during active fermentation (first 7 days)
- Record Brix and temperature twice daily and log every event`,

  30003: `- Rehydrate yeast in 10× its weight of clean water at 38–40°C for exactly 20 minutes
- Temper the yeast slurry by adding small amounts of must until temperature equalises (within 10°C)
- Pitch yeast slurry evenly across the surface of the must — do not pour into one spot
- Record yeast strain, rate (g/hL), and pitch time
- Monitor Brix within 24 hours to confirm fermentation has started`,

  30004: `- Start pump-overs within 12 hours of inoculation and continue twice daily through active ferment
- Pump over for 15–20 minutes per session — ensure full cap submersion
- Check must temperature during pump-over and record it
- Smell the must during pump-over — any H₂S (rotten egg) requires immediate action
- Reduce pump-over frequency to once daily when Brix drops below 5°`,

  30005: `- Confirm primary fermentation is complete (Brix < 0, confirmed by taste and hydrometer)
- Inoculate with MLF bacteria at 1g/hL in 10× their weight of warm water (25°C)
- Maintain tank temperature at 18–20°C — MLF stalls below 15°C
- Test for malic acid weekly using a paper chromatography strip
- Add 50 mg/L SO₂ immediately after MLF completion to protect the wine`,

  30006: `- Press in stages: free-run first, then light press (0.5–1 bar), then medium press (1–2 bar)
- Keep free-run and press fractions separate until you assess quality
- Clean the press immediately after use — do not let pomace dry in the press
- Record press fractions, volumes, and Brix for each fraction in the vintage log
- Blend press fractions back into free-run only after sensory assessment`,

  // ── Food Safety & Compliance ────────────────────────────────────────────────
  18: `- Identify all critical control points: grape receival, SO₂ addition, filtration, and bottling
- Record all chemical additions with product name, concentration, and lot number
- Verify allergen declarations are correct before each bottling run
- Retain all supplier certificates of analysis for a minimum of 7 years
- Review HACCP plan annually and after any process change`,

  19: `- Declare sulphites on label if free SO₂ exceeds 10 mg/L at bottling
- Check fining agent declarations: isinglass, egg white, casein, and gelatine all require disclosure
- Retain allergen management records for all fining additions with lot numbers
- Confirm with your label printer that allergen text meets FSANZ Standard 1.2.3 requirements
- Record all fining additions in the vintage log with product, rate, and date`,

  20: `- Assign a unique lot code to every wine batch at crush: format YYVAR-NNN (e.g. 26SHZ-001)
- Record lot code on every addition, transfer, and bottling event in the vintage log
- Ensure finished goods labels carry the lot code in a legible format
- Retain grape receival records (supplier, quantity, variety, GI) for 7 years
- Test your traceability system annually: pick a random lot and trace it from grape to bottle`,

  // ── Laboratory Testing ──────────────────────────────────────────────────────
  21: `- Calibrate refractometer with distilled water before each use — adjust to 0.0 Brix
- Take sample from mid-depth in the tank — not from the surface or bottom
- Record Brix and temperature at time of measurement in the vintage log
- Convert Brix to potential alcohol: Brix × 0.55 = approximate % alc/vol
- For SG measurement, ensure hydrometer is clean and sample is at 20°C`,

  22: `- Calibrate pH meter with fresh buffer solutions (pH 4.0 and 7.0) before each use
- Rinse electrode with distilled water between samples — never wipe dry
- Record pH and TA result together — they must be interpreted as a pair
- For TA: titrate 5 mL sample with 0.1N NaOH to endpoint (pH 8.2); TA g/L = mL NaOH × 1.5
- Record all results in the vintage log with sample source and time`,

  23: `- Prepare aspiration apparatus: ensure all glassware is clean and SO₂-free before starting
- Use 5 mL wine sample; aspirate at 1.5 L/min for 10 minutes into 3% H₂O₂ absorber
- Titrate absorbed SO₂ with 0.01N NaOH to endpoint; free SO₂ mg/L = mL NaOH × 32
- Record result immediately in the vintage log with sample source and time
- Compare against target: 25–35 mg/L free SO₂ for most wines at bottling`,

  24: `- Distil 10 mL wine sample using a Cash still or Cazenave apparatus
- Titrate distillate with 0.1N NaOH to endpoint; VA g/L acetic acid = mL NaOH × 0.6
- Record VA result in the vintage log with sample source and time
- Alert head winemaker if VA exceeds 0.8 g/L — this is the action threshold
- Repeat measurement weekly for any wine showing sensory signs of volatile acidity`,

  25: `- Prepare media (MRS agar for LAB, WL agar for yeast) and autoclave before use
- Take 1 mL sample from mid-depth in the tank using a sterile syringe
- Plate in duplicate at appropriate dilutions; incubate at 25°C for 48–72 hours
- Count colonies and calculate cells/mL; record result in the vintage log
- Alert head winemaker if yeast count exceeds 10⁶ cells/mL in a finished wine`,

  // ── Pressing & Juice Handling ───────────────────────────────────────────────
  60006: `- Press in stages: free-run first, then light press (0.5–1 bar), then medium press (1–2 bar)
- Keep free-run and press fractions separate until you assess quality
- Clean the press immediately after use — do not let pomace dry in the press
- Record press fractions, volumes, and Brix for each fraction in the vintage log
- Blend press fractions back into free-run only after sensory assessment`,

  // ── Tank Cleaning & Sanitation ──────────────────────────────────────────────
  8: `- Rinse tank immediately after emptying — do not let residue dry
- Hot water wash at 60–70°C for 15–20 minutes; drain completely
- Caustic wash (2% NaOH) if staining or biofilm present; rinse with minimum 3 full cycles
- Acid rinse (1% citric acid) after caustic to neutralise; rinse once with clean water
- Spray all surfaces with 100–200 ppm SO₂ solution; drain but do not rinse`,

  9: `- Empty barrel completely and inspect for any visible faults or off-aromas
- Steam sanitise at 100°C for 5 minutes minimum — ensure steam reaches all surfaces
- Alternatively: sulphur burn (2g sulphur strip per 225L) — seal bung immediately after lighting
- Cool barrel before filling — hot barrels cause excessive extraction and loss of aromatics
- Record sanitation method, date, and operator in the vintage log`,

  10: `- Flush CIP circuit with cold water for 2 minutes before starting chemical cycle
- Run caustic cycle (1–2% NaOH) at 60–70°C for 20 minutes; check concentration with titration
- Rinse with hot water (3 full circuit volumes) to remove caustic residue
- Run acid rinse (0.5% citric acid) for 10 minutes; final rinse with clean water
- Record CIP cycle time, chemical concentrations, and temperature in the maintenance log`,

  11: `- Calculate SO₂ addition: target free SO₂ based on wine pH (use the SO₂ calculator at awri.com.au)
- Dissolve KMS in a small volume of wine before adding to tank — never add dry powder directly
- Add SO₂ solution slowly through the top of the tank while stirring or recirculating
- Measure free SO₂ 24 hours after addition to confirm target was achieved
- Record SO₂ addition (product, rate, volume), result, and operator in the vintage log`,

  30001: `- Rinse tank immediately after emptying — do not let residue dry
- Hot water wash at 60°C for 15 minutes (plastic fermenters: no hotter than 60°C)
- Prepare 100–200 ppm SO₂ solution (1g KMS per 2L water) and spray all surfaces
- Drain but do not rinse after SO₂ application — residual SO₂ protects the tank
- Record cleaning date and chemicals used`,

  // ── Traceability ─────────────────────────────────────────────────────────────
  12: `- Record supplier name, address, and contact on the grape receival docket at intake
- Weigh and record quantity (kg or tonnes) per variety per load
- Note GI (Geographical Indication) and confirm it matches the purchase order
- Retain original receival dockets for a minimum of 7 years
- Enter all receival data into the vintage log before processing begins`,

  13: `- Record source vessel, destination vessel, and volume (litres) for every transfer
- Note lees status (gross lees, fine lees, clean) for every racking event
- Record SO₂ additions made at time of transfer
- Ensure lot code carries through from source to destination on all records
- Retain transfer records for a minimum of 7 years`,

  14: `- Confirm lot code on finished goods matches the production record before dispatch
- Check label compliance: alcohol %, standard drinks, allergen declaration, and lot code
- Record dispatch date, customer name, quantity, and lot code in the dispatch log
- Retain a reference sample (2 bottles minimum) for each lot dispatched
- Issue a Certificate of Analysis with each commercial dispatch if requested`,

  // ── Vintage Worker Onboarding ────────────────────────────────────────────────
  4: `- Issue PPE on Day 1: steel-cap boots, chemical-resistant gloves, safety glasses
- Walk the cellar and identify all emergency exits, eyewash stations, and first aid kits
- Explain CO₂ hazard: never enter a tank or confined space without gas monitoring
- Demonstrate correct pump operation before the worker operates any equipment unsupervised
- Complete and sign the induction checklist before the worker starts any cellar task`,

  5: `- Identify pump type (centrifugal, peristaltic, or lobe) before connecting hoses
- Connect hoses in the correct direction — check flow arrows on pump body
- Prime pump before starting — never run dry
- Start at low speed and increase gradually; monitor for cavitation or pressure spikes
- Record pump operation and any faults in the equipment log`,

  6: `- Brief all cellar workers on CO₂ hazard at the start of every vintage
- Never enter a tank without a gas monitor reading below 0.5% CO₂ (5,000 ppm)
- Buddy system is mandatory for all confined space entry — never enter alone
- Know the location of the nearest emergency rescue equipment and eyewash station
- If CO₂ alarm sounds: evacuate immediately, do not re-enter until ventilated and cleared`,

  7: `- Read the SDS (Safety Data Sheet) for every chemical before handling
- Wear full PPE when handling SO₂ or caustic: face shield, chemical-resistant gloves, apron
- Never mix SO₂ and caustic — violent reaction produces toxic gas
- Store chemicals in their original labelled containers in a locked, ventilated cabinet
- Know the emergency procedure for chemical splash: 15 minutes at the eyewash station`,

  // ── Bottling & Packaging (DIY) ──────────────────────────────────────────────
  60007: `- Sanitise bottles with 100 ppm SO₂ solution immediately before filling — drain but do not rinse
- Fill to within 2 cm of the cork/cap seating point to minimise headspace
- Insert cork or cap immediately after filling — do not leave bottles open
- Label bottles with variety, vintage year, and bottling date
- Store upright for 48 hours then lay down for cork-sealed bottles`,
};

const updates = Object.entries(quickStepsMap);
let successCount = 0;
let failCount = 0;

for (const [id, quickSteps] of updates) {
  try {
    const [result] = await connection.execute(
      "UPDATE sop_library SET quick_steps = ?, updated_at = ? WHERE id = ?",
      [quickSteps, now, parseInt(id)]
    );
    if (result.affectedRows > 0) {
      successCount++;
    } else {
      console.warn(`⚠️  No row found for id=${id}`);
      failCount++;
    }
  } catch (err) {
    console.error(`❌  Failed for id=${id}: ${err.message}`);
    failCount++;
  }
}

console.log(`\n✅  Quick steps seeded: ${successCount} updated, ${failCount} failed`);
await connection.end();
