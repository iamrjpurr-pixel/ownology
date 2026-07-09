/**
 * Oenology Flashcards — 50-card foundational deck (Feb 2026, Rich).
 *
 * Dual-language format on every card:
 *   • `sop`   — SOP / technical language, as it would appear in a cellar
 *                procedure document or AWRI reference. Reads like real
 *                winemaker-speak. Rich uses this to sound fluent on calls.
 *   • `plain` — plain-English translation, as if a working winemaker
 *                explained it to a mate over a pint. This is how Rich
 *                actually learns it.
 *
 * Rich's mental model: "Say it SOP; understand it plain."
 *
 * Scope matches the site promise from /ask:
 *   "Ask anything about wine science, flavours, regions, or pairings.
 *    Powered by real oenology."
 *
 * Editing: change any card's `id` and you erase learner progress on it.
 * Add new cards freely; the Leitner scheduler picks them up automatically.
 */

export type FlashcardCategory =
  | "sugar-ferment"
  | "acid-ph"
  | "so2"
  | "mlf"
  | "oak-aging"
  | "faults"
  | "sensory"
  | "regions"
  | "pairing";

export interface Flashcard {
  id: string;
  term: string;
  category: FlashcardCategory;
  sop: string;           // SOP / technical
  plain: string;         // plain-English translation
  why: string;           // winemaker relevance (plain)
  when: string;          // decision / measurement point (plain)
  ruleOfThumb?: string;  // optional numeric heuristic
  cited?: string;        // optional academic source
}

export const CATEGORY_META: Record<
  FlashcardCategory,
  { label: string; short: string }
> = {
  "sugar-ferment": { label: "Sugar & Fermentation", short: "Sugar" },
  "acid-ph":       { label: "Acid & pH",             short: "Acid" },
  so2:             { label: "SO₂ & Preservation",   short: "SO₂" },
  mlf:             { label: "Malolactic",            short: "MLF" },
  "oak-aging":     { label: "Oak & Aging",          short: "Oak" },
  faults:          { label: "Faults",                short: "Faults" },
  sensory:         { label: "Sensory & Flavour",    short: "Sensory" },
  regions:         { label: "Regions & Climate",    short: "Regions" },
  pairing:         { label: "Pairing Principles",   short: "Pairing" },
};

export const FLASHCARDS: Flashcard[] = [
  // ── SUGAR & FERMENTATION (10) ─────────────────────────────────────────
  {
    id: "brix",
    term: "Brix (°Bx)",
    category: "sugar-ferment",
    sop: "Refractometric or hydrometric measurement of dissolved soluble solids in grape juice, expressed as °Brix; approximates sucrose grams per 100g solution. Refractometer readings require temperature compensation from the 20°C reference.",
    plain: "It's the sugar in the juice. Higher number = more sugar = higher potential alcohol. Put a drop on a refractometer, read the number.",
    why: "Sets the ceiling for potential alcohol. Tracks ripeness pre-harvest and how far along your ferment is.",
    when: "Weekly during ripening; twice daily during peak ferment.",
    ruleOfThumb: "1°Bx ≈ 0.55–0.60% v/v potential alcohol.",
    cited: "Zoecklein · Wine Analysis & Production, ch. 3",
  },
  {
    id: "baume",
    term: "Baumé (°Bé)",
    category: "sugar-ferment",
    sop: "Density-based sugar scale used predominantly in Australia and France. Directly relates to potential alcohol yield at approximately 1:1 by volume.",
    plain: "Australia's version of Brix. Same idea (measuring sugar), different scale. 1 degree Baumé = about 1% alcohol in the finished wine.",
    why: "You'll see Baumé quoted on Aussie sites way more than Brix. Same info, different unit.",
    when: "Pre-harvest sampling and ferment tracking on Australian wineries.",
    ruleOfThumb: "1°Bé ≈ 1.8°Bx · 1°Bé ≈ 1.0% v/v potential alcohol.",
  },
  {
    id: "sg",
    term: "Specific Gravity (SG)",
    category: "sugar-ferment",
    sop: "Ratio of the density of the wine/juice to the density of water at reference temperature. Measured by hydrometer or densitometer. Water = 1.000; grape juice starts approximately 1.080–1.110.",
    plain: "Cheap way to measure how dense the juice is. Water is 1.000. Juice starts around 1.100 (heavy with sugar) and finishes below 1.000 (dry) as yeast eats the sugar.",
    why: "Works in murky red ferments where a refractometer gets fooled by suspended solids.",
    when: "Ferment tracking, especially reds. SG below 1.000 = dry.",
    ruleOfThumb: "Every 10 SG points drop ≈ 1.3% v/v alcohol produced.",
  },
  {
    id: "yan",
    term: "YAN — Yeast Assimilable Nitrogen",
    category: "sugar-ferment",
    sop: "Sum of primary amino nitrogen (PAN, via formol titration) and NH₄⁺-N (via enzymatic assay or ion-selective electrode), expressed as mg/L N. Represents nitrogen forms metabolisable by Saccharomyces cerevisiae during fermentation.",
    plain: "The food yeast can actually eat. Not all nitrogen counts — it has to be a form the yeast can digest. Test the juice before you inoculate.",
    why: "Too little food = stuck ferment or a rotten-egg smell (H₂S). A cheap YAN test now saves a rescue restart later.",
    when: "Pre-inoculation on juice. Address any deficit at 1/3 sugar depletion, not later.",
    ruleOfThumb: "Target 150–250 mg/L. Below 140 mg/L = intervene.",
    cited: "Fugelsang & Edwards · Wine Microbiology, ch. 5",
  },
  {
    id: "dap",
    term: "DAP — Diammonium Phosphate",
    category: "sugar-ferment",
    sop: "Inorganic fermentation nutrient (NH₄)₂HPO₄. Delivers ammonium-N directly. Approximately 50 mg/L YAN uplift per 100 g/hL addition. Not to be used at inoculation — favours VA production and can promote spoilage flora.",
    plain: "Cheap, fast yeast food. Add it a third of the way through ferment (not at the start — that causes problems). 100 grams per hectolitre boosts YAN by about 50.",
    why: "The quickest fix when your juice is low on nitrogen. Just don't dump it in on day one.",
    when: "At 1/3 sugar depletion. Split into two doses if you need more than 40g/hL total.",
    ruleOfThumb: "100 g DAP / hL ≈ +50 mg/L YAN. Cap total N contribution around 40 g/hL.",
  },
  {
    id: "ferment-temp",
    term: "Fermentation temperature range",
    category: "sugar-ferment",
    sop: "Red fermentation typically 22–30°C for tannin and pigment extraction; white fermentation 12–18°C for thiol and ester preservation. Self-heating exotherm on batches ≥1000L requires active cooling to maintain setpoint.",
    plain: "Reds ferment warmer (helps pull out colour and structure). Whites ferment colder (keeps the fresh fruit smells intact). Big red ferments heat themselves up — you'll need to cool them.",
    why: "Wrong temperature = wrong style. Cool white ferment = crisp and aromatic. Hot red ferment = extractive and structured.",
    when: "Set at inoculation. Monitor daily during peak activity.",
    ruleOfThumb: "Whites <20°C to preserve thiols. Reds >25°C for tannin/colour extraction.",
  },
  {
    id: "stuck-ferment",
    term: "Stuck fermentation",
    category: "sugar-ferment",
    sop: "Cessation of yeast activity prior to sugar depletion. Diagnostic: flat SG over 48h with residual sugar > 5 g/L. Etiology includes YAN deficit, temperature excursion, ethanol shock, or micronutrient depletion.",
    plain: "The yeast quits before all the sugar is gone. Bad news — the wine's now vulnerable to spoilage. Find the cause fast: usually not enough food, wrong temperature, or the alcohol got too high for that yeast.",
    why: "Residual sugar + reduced SO₂ tolerance = wide-open spoilage window. Restart fast.",
    when: "Diagnose within 48h of a flat SG. Confirm YAN, temperature, and any inhibitors.",
    ruleOfThumb: "Restart with Uvaferm 43, rehydrated with GoFerm, step-fed 1:10 acclimation.",
    cited: "Lallemand · Stuck ferment restart protocol",
  },
  {
    id: "cap-mgmt",
    term: "Cap management — pumpover / punchdown / délestage",
    category: "sugar-ferment",
    sop: "Techniques for maintaining skin-juice contact during red fermentation. Pumpover: recirculation of juice over the skin cap. Punchdown (pigeage): mechanical submersion of the cap. Délestage: rack-and-return with full separation of juice and pomace.",
    plain: "You have to keep the grape skins mixed with the juice, or the wine ends up thin. Three ways: spray juice over the cap (gentle), punch it down (medium), or drain + return everything (aggressive).",
    why: "How you handle the cap decides how much colour, tannin and structure end up in the wine.",
    when: "Twice daily during peak ferment. Frequency drops as ferment slows.",
    ruleOfThumb: "Pinot: gentle punchdowns. Cabernet: pumpovers. Big Shiraz: délestage mid-ferment for structure.",
  },
  {
    id: "alcohol-tolerance",
    term: "Yeast alcohol tolerance",
    category: "sugar-ferment",
    sop: "Maximum ethanol concentration a given Saccharomyces strain can survive and continue fermenting through. Strain-specific; ranges from ~12% v/v (wild ferment average) to 18% v/v (fortified/late-harvest specialists).",
    plain: "Every yeast strain gives up at a different alcohol level. Some die at 12%, some push through 18%. Pick one that can finish the wine you're making with a safety margin.",
    why: "Choose wrong = stuck ferment. Simple as that.",
    when: "Strain selection stage, before inoculation.",
    ruleOfThumb: "EC1118: 18% · Uvaferm 43: 16% · D254: 14–15% · wild ferment: unpredictable.",
  },
  {
    id: "cold-soak",
    term: "Cold soak / pre-ferment maceration",
    category: "sugar-ferment",
    sop: "Extended aqueous maceration of crushed red must at 8–12°C for 3–7 days prior to inoculation. Purpose: aqueous extraction of anthocyanins and hydrophilic aroma precursors without ethanol-mediated tannin extraction.",
    plain: "Hold the crushed reds cold for a few days before starting the ferment. Water pulls out colour and fruit aromas without pulling out harsh tannins yet.",
    why: "Common tool for Pinot Noir. Adds colour and lift without heavy structure.",
    when: "Optional. Standard for Pinot Noir; used selectively for lighter reds.",
    ruleOfThumb: "SO₂ addition 24h before cold soak deters wild ferment and Brett during the hold.",
  },

  // ── ACID & pH (7) ─────────────────────────────────────────────────────
  {
    id: "ph",
    term: "pH (winemaking)",
    category: "acid-ph",
    sop: "Negative logarithm of hydrogen-ion activity in the wine matrix. Governs anthocyanin ionisation, SO₂ speciation, microbial thermodynamics, and enzymatic activity.",
    plain: "How acidic the wine is, on a log scale. Lower = more acidic. It's the single most important number in winemaking chemistry.",
    why: "pH controls SO₂ effectiveness, colour stability, and microbial safety. Two wines at the same SO₂ but different pH have wildly different protection.",
    when: "Every juice sample. Every ferment stage. Every pre-bottling check.",
    ruleOfThumb: "Reds: 3.4–3.7. Whites: 3.0–3.4. Above 3.6 = SO₂ efficacy craters.",
    cited: "Boulton et al · Principles & Practices of Winemaking, ch. 4",
  },
  {
    id: "ta",
    term: "TA — Titratable Acidity",
    category: "acid-ph",
    sop: "Total organic acid content in wine, determined by titration with standardised NaOH to endpoint pH 8.2 (Aus/US convention) or pH 7.0 (EU convention). Reported as g/L tartaric acid equivalent.",
    plain: "How much acid is in the wine total. pH tells you how *strong* it feels. TA tells you how *much* is there. They're not the same thing.",
    why: "TA drives mouthfeel and taste of freshness. pH drives chemistry. You need both numbers to know a wine.",
    when: "Every juice sample. Pre- and post-any acid adjustment.",
    ruleOfThumb: "Reds: 5.5–7 g/L. Whites: 6–8 g/L. Sparkling base: 8–10 g/L.",
  },
  {
    id: "va",
    term: "VA — Volatile Acidity",
    category: "acid-ph",
    sop: "Steam-distillable acid fraction, primarily acetic acid. Determined by cash still distillation or enzymatic assay. Independent from TA. Regulatory maximum typically 1.2 g/L (Aus/EU).",
    plain: "The vinegar smell. Small amount is normal. Above 0.7 g/L, you can smell it and the wine's got a problem — usually chronic Brett or bad bacteria.",
    why: "Above ~0.7 g/L it turns the wine towards vinegar. Legal ceiling stops your wine going to market at all.",
    when: "Test if you smell it. Test pre-bottling regardless. Test any suspected spoilage.",
    ruleOfThumb: "<0.4 g/L = clean · 0.4–0.7 = detectable · >0.7 = flaw territory.",
  },
  {
    id: "tartaric-malic",
    term: "Tartaric vs Malic acid",
    category: "acid-ph",
    sop: "Grape must contains two dominant organic acids. Tartaric acid: grape-endemic, resistant to bacterial degradation. Malic acid: metabolised by malolactic bacteria and depleted through respiration in warm climates.",
    plain: "Grape juice has two main acids. Tartaric is grape's own — stays put. Malic is sharper — it gets eaten by MLF bacteria or by heat during ripening. Cool climates keep more malic.",
    why: "How much malic is left tells you if MLF will work and how much softening it'll give you.",
    when: "Check on ripening samples. Confirm post-MLF via paper chromatography.",
    ruleOfThumb: "Cool climate juice: malic > 3 g/L. Warm climate: often < 1.5 g/L.",
  },
  {
    id: "buffering",
    term: "Buffering capacity",
    category: "acid-ph",
    sop: "The resistance of the wine matrix to pH change upon addition of acid or base. Governed by the concentration and pKa of weak acid/conjugate base pairs (primarily tartrate and organic acid buffers).",
    plain: "Some wines fight back when you add acid — the pH barely moves. Others shift easily. Always do a small-volume trial before dumping additions into a tank.",
    why: "Explains why 1 g/L of tartaric drops one wine 0.15 pH and another only 0.05 pH.",
    when: "Any acid adjustment. Any deacidification decision.",
    ruleOfThumb: "Bench-trial 100 mL before dosing the tank.",
  },
  {
    id: "acid-adjustment",
    term: "Acid adjustment",
    category: "acid-ph",
    sop: "Acidulation: addition of L-tartaric acid to lower pH and raise TA. Deacidification: addition of KHCO₃ or CaCO₃ to raise pH and lower TA. Pre-ferment additions preferred due to buffering advantage during active fermentation.",
    plain: "Adding tartaric acid lowers pH and adds tang. Adding potassium bicarbonate does the opposite. Best done pre-ferment — the yeast smooths it out.",
    why: "High-pH wines are microbially fragile and colour-thin. Adjustment protects long-term stability.",
    when: "Pre-ferment (best). Post-ferment if needed. Small trim only pre-bottling.",
    ruleOfThumb: "1 g/L tartaric ≈ +1.0 g/L TA. pH drop varies with buffering (~0.05–0.10 units).",
  },
  {
    id: "cold-stab",
    term: "Cold stabilisation",
    category: "acid-ph",
    sop: "Precipitation of potassium bitartrate (KHT) crystals via storage at −3 to −4°C for 7–14 days. Confirmed via conductivity delta or seeded mini-freeze test. Alternative technologies: electrodialysis, CMC addition, metatartaric acid.",
    plain: "Chill the wine to just above freezing for a week or two. Excess tartrate falls out as crystals. Rack it off before those crystals show up in the customer's glass.",
    why: "Consumers see crystals in-glass as a fault (they're not — but perception rules retail).",
    when: "Post-ferment, pre-bottling. Skip only if using CMC or electrodialysis.",
    ruleOfThumb: "Confirm stability with the conductivity or seed test before racking.",
  },

  // ── SO₂ & PRESERVATION (6) ────────────────────────────────────────────
  {
    id: "free-so2",
    term: "Free SO₂",
    category: "so2",
    sop: "The unbound sulfite fraction (SO₂ + HSO₃⁻ + SO₃²⁻) available for antimicrobial and antioxidant activity. Measured via aeration-oxidation, Ripper titration, or enzymatic assay.",
    plain: "The SO₂ that's actually doing work right now. The rest is spent. Keep this number where you need it based on your pH.",
    why: "Free SO₂ is what protects the wine. Bound SO₂ is already used up.",
    when: "Every 2–4 weeks in bulk storage. Pre-bottling confirmation 48h before.",
    ruleOfThumb: "Reds: 25–35 mg/L free. Whites: 30–45 mg/L free. Adjusted for pH via molecular target.",
  },
  {
    id: "bound-so2",
    term: "Bound SO₂",
    category: "so2",
    sop: "Sulfite that has undergone irreversible adduct formation with acetaldehyde, anthocyanins, sugars, and other electrophilic wine constituents. Not recoverable via standard vinification.",
    plain: "SO₂ that already reacted with something in the wine and is used up. You can't get it back. Wines with lots of bound SO₂ demand more free SO₂ to compensate.",
    why: "Wines with high bound require higher additions to maintain molecular target.",
    when: "Assessed via Free vs Total SO₂ delta (Total − Free = Bound).",
    ruleOfThumb: "Bound climbs post-MLF and after oxidative events. Expect +20–40 mg/L addition to restore free.",
  },
  {
    id: "molecular-so2",
    term: "Molecular SO₂",
    category: "so2",
    sop: "The neutral aqueous SO₂ species (as opposed to bisulfite HSO₃⁻ or sulfite SO₃²⁻) responsible for antimicrobial activity. Fraction of free SO₂ present as molecular is pH-dependent per the Henderson-Hasselbalch equilibrium.",
    plain: "The version of SO₂ that actually kills yeast and bacteria. Depends heavily on pH. Same free SO₂ number can be great protection at low pH and useless at high pH.",
    why: "Free SO₂ alone tells you nothing without pH. Molecular is the number that matters.",
    when: "Calculate every time you set an SO₂ target. Use a chart or app.",
    ruleOfThumb: "Whites: 0.8 mg/L molecular target. Reds: 0.5 mg/L. Higher for Brett-risk wines.",
    cited: "Boulton et al · Principles & Practices of Winemaking, ch. 12",
  },
  {
    id: "so2-ph",
    term: "SO₂ effectiveness by pH",
    category: "so2",
    sop: "At pH 3.0, approximately 6% of free SO₂ exists in molecular form; at pH 3.6, only ~1%. A 0.6 pH unit differential thus represents a 6× swing in antimicrobial potency at identical free SO₂ concentration.",
    plain: "Every 0.1 pH higher, your SO₂ is about 25% weaker. Two wines with the same free SO₂ number can have wildly different protection based on pH alone.",
    why: "This is why 'just add 30 ppm SO₂' is a lazy answer without checking pH first.",
    when: "Any comparison of two wines. Any decision to skip a pH check.",
    ruleOfThumb: "Every 0.1 pH up = add ~5 mg/L free SO₂ to maintain molecular target.",
  },
  {
    id: "so2-legal",
    term: "Legal SO₂ limits",
    category: "so2",
    sop: "Total SO₂ regulatory ceilings vary by jurisdiction. Aus/NZ: 250 mg/L (dry) / 300 mg/L (sweet). EU: 150 mg/L (dry red) / 200 mg/L (dry white). USA: 350 mg/L. Organic certification bodies impose lower ceilings.",
    plain: "Every market has a legal cap. Go over it and you can't sell there. Organic and export specs are tighter than domestic conventional.",
    why: "Exceeding limits blocks export and triggers label recalls. Non-negotiable at commercial scale.",
    when: "Pre-bottling. Any export lot. Any organic-certified wine.",
    ruleOfThumb: "Aus: 250/300 · EU: 150/200 · USA: 350 · Organic Aus: 150.",
  },
  {
    id: "potassium-sorbate",
    term: "Potassium sorbate",
    category: "so2",
    sop: "Antifungal preservative (E202) used adjunctively with SO₂ in residual-sugar wines to inhibit yeast refermentation. Ineffective against lactic bacteria and forms geranium-off-note (2-ethoxyhexa-3,5-diene) in the presence of active LAB.",
    plain: "Extra insurance against the wine starting a second ferment in bottle. Only use in sweet wines. NEVER add if you have live lactic bacteria — creates a nasty geranium smell.",
    why: "SO₂ alone struggles to inhibit yeast in sweet wines. Sorbate closes that gap.",
    when: "Pre-bottling, only if residual sugar >4 g/L. Confirm MLF complete or blocked first.",
    ruleOfThumb: "150–200 mg/L. Never with active LAB. Confirm sterile-filter or full inhibition.",
  },

  // ── MALOLACTIC (4) ────────────────────────────────────────────────────
  {
    id: "mlf",
    term: "Malolactic fermentation (MLF)",
    category: "mlf",
    sop: "Bacterial decarboxylation of L-malic acid to L-lactic acid + CO₂ mediated primarily by Oenococcus oeni. Reduces titratable acidity ~2 g/L; softens perceived acidity; contributes diacetyl and buttery volatiles.",
    plain: "Bacteria (not yeast) convert sharp malic acid into softer lactic acid. Softens the wine's edge. Standard for most reds and oaked Chardonnay. Suppress it in aromatic whites.",
    why: "Softens acid, adds buttery notes, and stabilises the wine against later bacterial mischief.",
    when: "Post-primary ferment for most reds and oaked whites. Blocked for aromatics.",
    ruleOfThumb: "Confirm complete via paper chromatography: no malic spot = done. Then SO₂ to lock.",
    cited: "AWRI · MLF technical bulletin",
  },
  {
    id: "oenococcus",
    term: "Oenococcus oeni",
    category: "mlf",
    sop: "Gram-positive, catalase-negative, heterofermentative lactic acid bacterium. Tolerant of ethanol (up to 15% v/v), low pH (3.2+), and moderate SO₂ (bound tolerance up to 40 mg/L). Commercial preparations available as freeze-dried or liquid starter cultures.",
    plain: "The friendly bacteria that runs MLF. Tough — survives low pH, decent alcohol, and some SO₂. Buy a commercial strain; wild MLF is a gamble.",
    why: "Commercial strains give predictable MLF without the off-flavours wild lactics can throw.",
    when: "Inoculate at end of primary ferment (co-inoc) or when SG stabilises near 1.000.",
    ruleOfThumb: "Optimal: 18–22°C, pH 3.3–3.7, alcohol <14.5%, free SO₂ <15 mg/L.",
  },
  {
    id: "diacetyl",
    term: "Diacetyl",
    category: "mlf",
    sop: "2,3-butanedione. Vicinal diketone produced during MLF via citrate metabolism. Sensory threshold ~0.2 mg/L; peaks at 2–4 mg/L then declines via yeast reduction to acetoin.",
    plain: "That buttery smell in Chardonnay comes from this. Grows during MLF, then fades if you leave the wine on the lees. Wanted in Chardonnay; unwanted in reds.",
    why: "Signature of Chardonnay style. Warning flag in reds where fruit clarity is preferred.",
    when: "Monitor sensory through and post-MLF. Pump over with air to knock it back if too high.",
    ruleOfThumb: "Lean Chardonnay: stop MLF at 30–50%. Buttery Chardonnay: full MLF + extended lees.",
  },
  {
    id: "mlf-inhibit",
    term: "MLF inhibition (blocking)",
    category: "mlf",
    sop: "Prevention of malolactic activity via multiple pathways: pH depression <3.2, molecular SO₂ >0.8 mg/L (free >30 mg/L at typical pH), temperature <15°C, or enzymatic disruption via lysozyme (250–500 mg/L) or chitosan.",
    plain: "How to stop MLF from happening. Aromatic whites lose too much aroma if they go through MLF. Sweet wines can get bacterial spoilage. Block it with pH, SO₂, cold, or lysozyme.",
    why: "Aromatic whites (Riesling, SB) lose too much aroma. Sweet wines invite VA if left open.",
    when: "Immediately post-primary ferment. Waiting invites uninvited MLF.",
    ruleOfThumb: "Lysozyme 250–500 mg/L (fast). SO₂ + pH (passive). Cold (temporary).",
  },

  // ── OAK & AGING (5) ───────────────────────────────────────────────────
  {
    id: "oak-types",
    term: "Oak types — French / American / Hungarian",
    category: "oak-aging",
    sop: "Cooperage species: Quercus robur / Quercus petraea (French, tight grain, subtle spice, elevated extractable tannin). Quercus alba (American, loose grain, elevated cis- and trans-methyl-γ-octalactone giving coconut/vanilla). Quercus petraea (Hungarian, French-analogue at reduced cost).",
    plain: "French oak: subtle, spicy, expensive. American oak: sweet, coconut, vanilla, cheaper. Hungarian: French-like flavour at Hungarian prices. Choose based on the wine's style and your budget.",
    why: "Oak choice is a stylistic and financial decision. Wood chemistry drives flavour.",
    when: "Species selected at cooperage order. Match to variety and target style.",
    ruleOfThumb: "Pinot/Chardonnay: French. Bold bourbon-style reds: American. Volume Cab: Hungarian or blend.",
  },
  {
    id: "toast-levels",
    term: "Toasting levels",
    category: "oak-aging",
    sop: "Coopering process wherein barrel interior is exposed to controlled radiant heat, modifying lignin and cellulose degradation products. Toast levels — Light (L), Medium (M), Medium+ (M+), Heavy (H), Heavy Toast (HT) — control vanillin, guaiacol, furfural, and lactone profiles.",
    plain: "How much the cooper burned the inside of the barrel. Light = vanilla. Medium = coconut and toast. Heavy = coffee, smoke. Different levels change the flavour you get from the barrel.",
    why: "Toast controls vanillin, coconut lactones, coffee/smoke, and clove balance.",
    when: "Barrel purchase decision. Blend toast levels within a program for complexity.",
    ruleOfThumb: "M (Medium): universal. M+: fruit-forward reds. H: oxidative whites, ripe reds. HT: rare — smoke risk.",
  },
  {
    id: "oak-alternatives",
    term: "Oak alternatives — chips / staves / cubes / dust",
    category: "oak-aging",
    sop: "Non-barrel oak formats providing extractable phenolics and aromatics. Chips: <10 mm, rapid extraction. Staves: rack-mounted planks, sustained release. Cubes: intermediate kinetics. Dust: fining and blending.",
    plain: "Barrel wood in cheaper shapes. Chips work fast. Staves work slow. Cubes are in the middle. All of them give you 60–80% of barrel character at 10% of the cost.",
    why: "Barrels cost $800–1,800 each. Alternatives free budget for other winemaking priorities.",
    when: "Cost-conscious commercial wines. Volume programs. Stylistic infill.",
    ruleOfThumb: "Chips: 2–4 g/L, 4–8 weeks. Staves: 3–6 per barrel-equivalent, 8–16 weeks.",
  },
  {
    id: "mox",
    term: "Micro-oxygenation (MOx)",
    category: "oak-aging",
    sop: "Controlled dosing of gaseous oxygen into wine matrix at ~1–5 mL/L/month. Accelerates tannin polymerisation and colour stabilisation. Requires close monitoring of dissolved oxygen, VA, and Brettanomyces activity.",
    plain: "Feed the wine tiny bubbles of oxygen. Speeds up what barrel aging does naturally — softens tannin, stabilises colour. Overdo it and you get oxidation.",
    why: "Delivers barrel-aging results in months instead of years. But it's a skill — over-dosing kills the wine.",
    when: "Reds, post-ferment through pre-bottling.",
    ruleOfThumb: "Start 1–2 mL/L/month, taper down. Watch VA and Brett aggressively.",
  },
  {
    id: "extraction",
    term: "Extraction dynamics",
    category: "oak-aging",
    sop: "Solubilisation of grape-solid compounds into the fermenting matrix. Anthocyanins (aqueous-soluble) extract early. Tannins (ethanol-soluble) extract in mid-to-late ferment. Seed tannin extraction accelerates post-dryness at high ethanol.",
    plain: "Colour comes out early in ferment. Soft tannins come out in the middle. Harsh seed tannins come out at the end. Time your pressing based on which stage you want to lock in.",
    why: "Knowing extraction curves = knowing when to press. Too early = thin. Too late = harsh.",
    when: "Cap management + press timing — two big decisions per red batch.",
    ruleOfThumb: "Colour peaks mid-ferment; tannin continues post-ferment. Press between 0 and +5°Bx for balance.",
  },

  // ── FAULTS (6) ────────────────────────────────────────────────────────
  {
    id: "brett",
    term: "Brettanomyces (Brett)",
    category: "faults",
    sop: "Brettanomyces bruxellensis — spoilage yeast producing 4-ethylphenol (barnyard, sensory threshold ~600 μg/L) and 4-ethylguaiacol (smoky/bacon, ~110 μg/L). Establishes chronic infection in wood, requires molecular SO₂ maintenance >0.6 mg/L for control.",
    plain: "Wild yeast that lives in barrels and stinks the wine up with barnyard and bacon smells. Once it's in your cellar, it's hell to get rid of. Prevention (SO₂, sanitation, cool cellar) is everything.",
    why: "Chronic Brett kills fruit clarity and drives VA up over time.",
    when: "Highest risk: dry reds in barrel, warm cellars, low free SO₂.",
    ruleOfThumb: "Maintain molecular SO₂ ≥0.5 mg/L, cellar <18°C, sanitise between vintages.",
    cited: "Fugelsang & Edwards · Wine Microbiology, ch. 6",
  },
  {
    id: "reduction",
    term: "Reduction — H₂S / mercaptans",
    category: "faults",
    sop: "Volatile sulfur compounds (VSCs) formed via yeast metabolism under nitrogen limitation or extended lees contact. Species include H₂S (rotten egg, threshold ~50 μg/L), ethanethiol (garlic, ~1 μg/L), methanethiol (matchstick).",
    plain: "Smells like rotten eggs, garlic, or struck matches. Caused by stressed yeast or too much time on lees. Sometimes it's a stylistic choice; usually it's a problem. Test with a copper coin — if the smell lifts, copper fining will work.",
    why: "Can be a fault (blocked fruit) or a stylistic choice (matchstick in white Burgundy).",
    when: "At racking, pre-bottling. Copper coin test: if the smell lifts, copper will work.",
    ruleOfThumb: "Aerate first. If persistent: copper sulfate 0.2–0.5 mg/L (Cu). Bench-trial mandatory.",
  },
  {
    id: "oxidation",
    term: "Oxidation",
    category: "faults",
    sop: "Cumulative degradation via O₂ exposure. Manifests as browning (phenolic oxidation), prune/sherry aldehyde notes, and loss of primary fruit character. Dissolved oxygen target: <0.6 mg/L bulk; <1.0 mg/L at bottling.",
    plain: "The wine got too much air. Turns brown, tastes like sherry or dried fruit, loses freshness. Every open valve, every headspace, every pump-over adds to it. You can't reverse it — only prevent it.",
    why: "Every headspace, every open valve is a cumulative loss. Impossible to reverse.",
    when: "Prevention: manage headspace, inert-gas cover (N₂/Ar), maintain SO₂.",
    ruleOfThumb: "DO <0.6 mg/L bulk. DO <1.0 mg/L at bottling. Above 2 = red flag.",
  },
  {
    id: "tca",
    term: "Cork taint (TCA)",
    category: "faults",
    sop: "2,4,6-trichloroanisole. Chlorophenol-derived off-compound bio-methylated in cork substrate. Sensory threshold ~2 ng/L (parts per trillion). Not degradable; adsorbs onto pallets, cardboard, and cellar surfaces.",
    plain: "The wet cardboard smell that ruins a bottle. Detectable at parts per trillion — one contaminated bottle is enough for anyone to notice. Screw caps eliminate the risk almost entirely.",
    why: "Blindsides a whole cellar quickly — TCA is airborne and clings to cardboard and wood.",
    when: "Any 'off' bottle. Any suspect batch. Spot checks on cork closure lines.",
    ruleOfThumb: "3–5% of natural cork closures show detectable TCA. Screw caps ~0%.",
  },
  {
    id: "mousiness",
    term: "Mousiness",
    category: "faults",
    sop: "Palate-only fault from tetrahydropyridines (2-acetyl-tetrahydropyridine most common). Produced by lactic acid bacteria or Brettanomyces at low free SO₂. Undetectable on nose; presents on the palate as a lingering acrid aftertaste, often several seconds after the swallow.",
    plain: "You can't smell it — you taste it. A weird acrid aftertaste that shows up 5–10 seconds after the sip. Comes from lactic bacteria or Brett when SO₂ is low. Taste, don't just sniff.",
    why: "Under-appreciated because it's tasted, not smelled — a blind spot for nose-only tasters.",
    when: "Taste every wine post-MLF. Or add a drop of pH-8 buffer to lift the compound.",
    ruleOfThumb: "SO₂ + pH control prevents. Once present, no reliable remediation.",
  },
  {
    id: "refermentation",
    term: "Refermentation in bottle",
    category: "faults",
    sop: "Renewed fermentation activity post-bottling driven by residual fermentable sugar in presence of viable yeast. Results in CO₂ pressurisation, cork ejection, or bottle failure. Prevention requires either dryness (<2 g/L RS), sterile filtration (≤0.45 μm), or synergistic SO₂ + sorbate stabilisation.",
    plain: "The wine starts fermenting again in the bottle. CO₂ builds, corks push out, bottles explode. Only way to prevent: get it dry, sterile-filter it, or preserve properly with SO₂ + sorbate. Verify with more than one method.",
    why: "Small oversights compound: unfinished ferment + weak SO₂ + no filtration + warm storage = disaster.",
    when: "Any wine >4 g/L RS not sterile-filtered or preserved.",
    ruleOfThumb: "Sterile filter (0.45 μm) OR full dryness OR sorbate + adequate SO₂. Pick one, verify twice.",
  },

  // ── SENSORY & FLAVOUR (4) ─────────────────────────────────────────────
  {
    id: "diacetyl-sensory",
    term: "Diacetyl → buttery",
    category: "sensory",
    sop: "2,3-butanedione. Vicinal diketone from lactic bacterial citrate metabolism. Threshold ~0.2 mg/L; buttery / popcorn / butterscotch descriptors above threshold.",
    plain: "Butter and popcorn smell. Comes from MLF. Signature of oaked Chardonnay. If you smell it in a red, something's wrong.",
    why: "Buttery notes signal Chardonnay MLF. Popping up in reds = warning.",
    when: "Sensory panel post-MLF. Threshold ~0.2 mg/L.",
  },
  {
    id: "esters",
    term: "Esters → fruity",
    category: "sensory",
    sop: "Acid-alcohol condensation products from yeast metabolism. Isoamyl acetate → banana. Ethyl hexanoate → apple/pineapple. Ethyl butyrate → strawberry. Peak concentration at ferment end; hydrolyse over 6–18 months in bottle.",
    plain: "Fresh fruit smells in young wines — banana, apple, strawberry. Yeast makes them during ferment. They fade over the first year in bottle, so young-drinking wines aim to maximise them.",
    why: "The fresh fruit character of young whites and light reds. Fades within 6–18 months.",
    when: "Maximised via cool ferment + ester-forward yeast (VL3, X5).",
  },
  {
    id: "pyrazines",
    term: "Pyrazines → green pepper",
    category: "sensory",
    sop: "Methoxypyrazines. IBMP (isobutyl methoxypyrazine) most abundant. Aroma of capsicum, green pepper, cut grass. Concentrations inversely correlated with grape ripeness and sun exposure.",
    plain: "Green pepper and capsicum smells. Signature of Sauvignon Blanc; a fault in under-ripe Cabernet. Cool climates and less sun exposure keep more pyrazine.",
    why: "Cool-climate signature. Tracks inversely with ripeness — hang time reduces pyrazine.",
    when: "Sensory check at ripening. Blend or hang longer if pyrazine dominates.",
    ruleOfThumb: "SB threshold ~2 ng/L. Cabernet: >15 ng/L = green fault.",
  },
  {
    id: "rotundone",
    term: "Rotundone → peppery",
    category: "sensory",
    sop: "Sesquiterpene ((-)-rotundone). Aroma of freshly ground black pepper. Genetic olfactory polymorphism at OR7D4 renders ~50% of the tasting population anosmic to it.",
    plain: "The black pepper smell in cool-climate Shiraz. About half of humans can't smell it — genetic. If you can't detect pepper in Grampians Shiraz, that's you, not the wine.",
    why: "Signature of cool-climate Shiraz (Grampians, Canberra). Can't be added — only preserved.",
    when: "Handling matters: avoid pumping over with air; keep ferment temps moderate.",
    ruleOfThumb: "Half the tasting population can't detect it — polymorphism at OR7D4.",
  },

  // ── REGIONS & CLIMATE (5) ─────────────────────────────────────────────
  {
    id: "climate",
    term: "Cool vs warm climate viticulture",
    category: "regions",
    sop: "Growing-Season Temperature (GST) classification per Jones et al: cool <17°C, moderate 17–19°C, warm 19–21°C, hot >21°C. GST correlates with variety suitability, ripening potential, and stylistic tendencies.",
    plain: "Cool regions ripen grapes slowly, keeping fresh acid. Warm regions ripen fast, keeping more sugar and fruit. Same grape variety tastes wildly different in each — Chardonnay in Yarra vs Napa vs Marlborough are three different wines.",
    why: "Determines variety suitability, style tendencies, and ripening risk.",
    when: "Site selection. Variety matching. Ripening decisions.",
    ruleOfThumb: "Cool: retained acid, esters, ripening risk. Warm: alcohol, ripe fruit, ripening surety.",
  },
  {
    id: "terroir",
    term: "Terroir",
    category: "regions",
    sop: "Working definition: the interaction of physical (soil, aspect, elevation, mesoclimate), biological (rootstock, clone, canopy), and human (tradition, decisions) factors that yield site-specific wine expression. Not a mystical property; a shorthand for compound decisions.",
    plain: "The combination of soil, climate, slope, and choices that make one vineyard produce different wine than the neighbour's. Not magic — just a lot of specifics under one word.",
    why: "Explains why the same variety, vinified similarly, tastes different across parcels 100m apart.",
    when: "Vineyard planning, single-vineyard designations, marketing narrative.",
    ruleOfThumb: "Soil + aspect + microclimate dominate. Marketing loves mystery; winemakers should love specifics.",
  },
  {
    id: "bordeaux",
    term: "Bordeaux — blends and style",
    category: "regions",
    sop: "Left Bank (Médoc, Graves) — Cabernet Sauvignon dominant, gravel-derived soils, structured tannin. Right Bank (Saint-Émilion, Pomerol) — Merlot dominant, clay/limestone, plusher tannin architecture. Historical reference for Bordeaux-style blend construction.",
    plain: "Bordeaux has two sides. Left Bank is Cabernet-dominant, structured, ages long. Right Bank is Merlot-led, softer, drinks earlier. Almost every 'Bordeaux blend' anywhere in the world is one style or the other.",
    why: "Global reference for red blends. Australian analogues: Coonawarra, Margaret River, Yarra.",
    when: "Blend architecture decisions. Understanding the reference for structured reds.",
    ruleOfThumb: "Cab-Merlot 60/40 to 80/20 typical. Petit Verdot 3–5% for lift. Cab Franc for perfume.",
  },
  {
    id: "barossa",
    term: "Barossa Valley (South Australia)",
    category: "regions",
    sop: "Warm-Mediterranean South Australian region, established 1840s. Signature Shiraz on ancient own-rooted vines (many 100+ years). Grenache and Cabernet Sauvignon supporting. GST ~20°C, aspect-dependent site selection critical.",
    plain: "Old Australian region, hot climate, home of big Shiraz on very old vines. Barossa reds are famous for dense, ripe, structured styles — and 100+ year old vines are almost unique in the wine world.",
    why: "One of the oldest continuously-producing regions globally. Vine age is defining.",
    when: "Reference for old-vine, ripe, oaked reds. Contrast with cool-climate Shiraz.",
    ruleOfThumb: "Old-vine Shiraz: dense, savoury, black-fruited. Grenache: bright, moderate structure.",
  },
  {
    id: "hunter",
    term: "Hunter Valley (New South Wales)",
    category: "regions",
    sop: "Australia's oldest continuously producing wine region (established 1820s). Warm humid subtropical climate; ripening pressure from January-February rainfall risk. Signature: unoaked Semillon (10–11% ABV, taut acid, decade-plus ageing curve) and earthy Shiraz.",
    plain: "Australia's oldest wine region — up in NSW. Hot and humid, so rain at harvest is a constant threat. Famous for a Semillon style found nowhere else — low alcohol, sharp acid, ages 10+ years into honey. Pokolbin is the heart of it.",
    why: "The Hunter Semillon style has no true global parallel — a genuine Australian idiom.",
    when: "Reference for aged unoaked whites and earthy/savoury Shiraz styles.",
    ruleOfThumb: "Pokolbin sub-region: heart of the Hunter. Vintage highly variable.",
  },

  // ── PAIRING PRINCIPLES (3) ────────────────────────────────────────────
  {
    id: "tannin-protein",
    term: "Tannin + protein pairing",
    category: "pairing",
    sop: "Protein-tannin binding: dietary proteins (particularly muscle collagen, casein) form insoluble complexes with polyphenolic tannins in the oral cavity, reducing perceived astringency. Underpins the classic red-wine-with-red-meat pairing.",
    plain: "Tannin grips protein. So a tannic wine feels smoother with steak than on its own. That's why Cabernet works with beef and falls flat with a salad.",
    why: "Explains why steak works with Cabernet and the same wine falls flat with a light salad.",
    when: "Any red-wine pairing decision.",
    ruleOfThumb: "Higher tannin → fattier / protein-forward dish. Pinot with duck. Cabernet with beef.",
  },
  {
    id: "acid-fat",
    term: "Acid + fat pairing",
    category: "pairing",
    sop: "Acid-mediated palate cleansing: acidic wines cut lipid film on the palate, refreshing between bites of fatty food. Independent of wine colour; drives Champagne with fried food and Riesling with pork belly.",
    plain: "Acidic wines cut through fat. Champagne with fried chicken. Sancerre with oysters. Riesling with pork belly. When food is rich, reach for something with brisk acid.",
    why: "One of the most reliable food/wine principles. Works across cuisines.",
    when: "Any dish where the fat sits heavy on the palate.",
    ruleOfThumb: "Higher fat → higher-acid wine.",
  },
  {
    id: "sweetness-match",
    term: "Sweetness matching",
    category: "pairing",
    sop: "Perceived sweetness parity: the wine's residual sugar must equal or exceed that of the dessert, or the wine will read as bitter/tart against the sweeter reference. Most-broken pairing principle in on-premise service.",
    plain: "Your dessert wine has to be at least as sweet as the dessert. Otherwise the wine feels thin and sour next to the food. Ordering Sauternes with a lemon tart doesn't work — the tart is sweeter.",
    why: "Most-broken pairing rule in restaurants.",
    when: "Any dessert course.",
    ruleOfThumb: "Chocolate = fortified sweet (PX, Rutherglen Muscat). Tart = late-harvest Riesling.",
  },
];
