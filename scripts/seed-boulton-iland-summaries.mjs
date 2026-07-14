/**
 * Seed 12 attributed summary chunks for Boulton (Principles and Practices
 * of Winemaking) and Iland (Chemical Analysis of Grapes and Wine) into
 * diy_knowledge_chunks.
 *
 * These chunks are ORIGINAL SUMMARY PROSE with explicit source attribution
 * — the legal analogue of a lecturer's course-notes bibliography. NO
 * verbatim book text is reproduced. Each chunk names the source, the
 * chapter/section, and the page range so readers can go to the primary
 * text for the full treatment.
 *
 * Feb 2026, Reference Ingest Phase C.
 * Usage: node scripts/seed-boulton-iland-summaries.mjs
 */
import mysql from "mysql2/promise";
import * as dotenv from "dotenv";

dotenv.config();

const CHUNKS = [
  // ─── Boulton, Singleton, Bisson & Kunkee — Principles and Practices of Winemaking ───
  {
    sourceDoc: "boulton_ppw",
    wineType: "general",
    chapterRef: "Ch. 7",
    chapterTitle: "Boulton et al. — Sulphur Dioxide in Winemaking",
    topicTags: "SO2,sulphur dioxide,sulphite,molecular SO2,free SO2,bound SO2,pH,binding,dosage,antimicrobial,antioxidant",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.5",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, Chapter 7 (Sulphur Dioxide in Winemaking, pp 448–473).

The antimicrobial and antioxidant power of SO2 in wine comes almost entirely from its molecular form (unbound SO2 gas dissolved in the wine), not from total or free SO2 as reported by standard laboratory titration. Molecular SO2 is a small fraction of the free SO2 pool, and the fraction is set by the wine's pH: as pH rises, the equilibrium shifts sharply toward bisulphite (HSO3−) which is far less biologically active. A wine at pH 3.2 has roughly ten times more molecular SO2 (for the same free SO2 reading) than a wine at pH 3.6.

Practical implication: dose to the target molecular concentration (0.5 mg/L for red wine, 0.8 mg/L for white and rosé), not to a fixed free-SO2 number. Rankine's derived tables and every modern winemaking calculator take pH and desired molecular SO2 as inputs and return the free-SO2 target.

Binding is the second key concept. SO2 forms addition compounds with acetaldehyde, pyruvic acid, ketoglutarate, and other carbonyls generated during fermentation. Bound SO2 has essentially no antimicrobial value, so wines high in these carbonyls (stressed ferments, oxidised must, malolactic-fermented reds) need more total SO2 to hit the same molecular target. Refer to the primary text for the full binding-constant tables and the reasoning behind ~50 mg/L 'reserve' doses at bottling.`,
  },
  {
    sourceDoc: "boulton_ppw",
    wineType: "general",
    chapterRef: "Ch. 3",
    chapterTitle: "Boulton et al. — Yeasts and Biochemistry of Ethanol Fermentation",
    topicTags: "yeast,fermentation,ethanol,glycolysis,YAN,nitrogen,stuck fermentation,sluggish,strain selection,DAP,rehydration",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.1",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, Chapter 3 (Yeasts and Biochemistry of Ethanol Fermentation, pp 102–192).

Ethanol fermentation is glycolysis under anaerobic conditions: one mole of glucose yields two moles of pyruvate, decarboxylated to acetaldehyde and reduced to ethanol via alcohol dehydrogenase. The theoretical yield is 0.511 g ethanol per g of sugar, but real yields are lower because the yeast diverts carbon into biomass, glycerol, succinate, and other metabolites.

Yeast health depends on three variables in roughly this order of impact: temperature, nitrogen supply, and oxygen at inoculation. Yeast Assimilable Nitrogen (YAN) — the sum of ammonia and alpha-amino nitrogen — must be at least 140–200 mg/L for a routine 22–24 Brix ferment; higher Brix and less-tolerant strains push the required YAN toward 250–300. Below 140 mg/L, the ferment slows sharply late in the sugar curve and often stalls between 3 and 8 Brix.

Stress compounds early stress: heat, ethanol toxicity, and killer-yeast factors from wild strains all accumulate. The book's classic 'stuck ferment' decision tree — check temperature, YAN residual, then step-restart with an ethanol-tolerant strain like EC-1118 in a small starter, doubled progressively into the stuck volume — remains the standard-of-care in Australian cellars today.`,
  },
  {
    sourceDoc: "boulton_ppw",
    wineType: "general",
    chapterRef: "Ch. 4",
    chapterTitle: "Boulton et al. — Malolactic Fermentation",
    topicTags: "malolactic,MLF,oenococcus,lactic acid bacteria,malic acid,inoculation,co-inoculation,pH,SO2,diacetyl,temperature",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.3",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, Chapter 4 (Malolactic Fermentation, pp 244–273).

Malolactic fermentation is the decarboxylation of L-malic acid to L-lactic acid plus CO2, catalysed by lactic acid bacteria (predominantly Oenococcus oeni in commercial practice). The reaction reduces titratable acidity by roughly the mass difference between malic and lactic acid — typically 1.5–3.0 g/L drop in TA — and raises pH by 0.1–0.3 units. Diacetyl (buttery aroma) is a co-metabolite whose concentration depends on citrate availability, oxygen exposure, and strain choice.

Boulton lays out the four MLF gating factors: pH must be above ~3.2 for reliable bacterial activity, free SO2 must be below ~10 mg/L (molecular SO2 below ~0.5 mg/L), temperature must be 18–22°C for most strains, and ethanol tolerance of the chosen strain must exceed the finished ABV.

The book distinguishes co-inoculation (bacteria added within 24–48 h of yeast) from sequential inoculation (bacteria added after alcoholic fermentation finishes). Co-inoculation is faster and often more reliable at low pH, but produces less diacetyl. Sequential is safer against yeast-bacteria antagonism but slower and more prone to stalling in high-alcohol wines. Choice is a stylistic and risk-management call, not a chemistry one.`,
  },
  {
    sourceDoc: "boulton_ppw",
    wineType: "general",
    chapterRef: "§5.3",
    chapterTitle: "Boulton et al. — Cold Stabilisation of Wines",
    topicTags: "cold stabilisation,tartrate,potassium bitartrate,crystallisation,contact process,seeding,mannoprotein,CMC,metatartaric",
    wbsDomain: "D5",
    wbsProcessFamily: "Post-Fermentation",
    wbsCode: "D5.3",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, §5.3 (Cold Stabilisation of Wines, pp 322–338).

Tartrate instability is potassium bitartrate (KHT) coming out of supersaturation as the wine cools in the bottle. The driver is temperature: KHT solubility drops sharply below 5°C, so a wine that looks bright at 15°C can throw crystals in the retailer's fridge. Boulton frames the whole chapter around the difference between thermodynamic stability (no crystals form no matter how cold) and kinetic stability (crystals form so slowly they're not a marketing problem).

Three cold-stabilisation approaches are compared. Static cold storage at −4°C for two to four weeks lets crystals grow slowly on tank walls — reliable but slow and energy-hungry. The contact process seeds the chilled wine with 3–4 g/L of powdered KHT under vigorous agitation for 1–2 hours at 0°C; it's fast but requires precise filtration afterward. Electrodialysis removes potassium ions from the wine at ambient temperature and is now the industry benchmark for large volumes.

Additive-based approaches — CMC (carboxymethylcellulose), metatartaric acid, mannoproteins — inhibit crystal growth rather than remove the substrate. They deliver kinetic stability, not thermodynamic stability, so their protection is time-limited (metatartaric ~12 months, CMC and mannoproteins somewhat longer). Choose the approach based on style, volume, and how long the wine needs to sit on shelf.`,
  },
  {
    sourceDoc: "boulton_ppw",
    wineType: "red",
    chapterRef: "Ch. 6",
    chapterTitle: "Boulton et al. — Phenolic Chemistry of Wines",
    topicTags: "phenolics,tannin,anthocyanin,polymeric pigment,extraction,maceration,phenolic maturity,cap management,pump-over,punch-down",
    wbsDomain: "D4",
    wbsProcessFamily: "Fermentation",
    wbsCode: "D4.2",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, Chapter 6 (Phenolic Chemistry of Wines, pp 381–431).

Grape phenolics split into two structural classes: flavonoids (anthocyanins in skins, catechins and proanthocyanidins in skins and seeds) and non-flavonoids (hydroxycinnamic acids, stilbenes like resveratrol). Red wine sensory character — colour, bitterness, astringency, ageability — is almost entirely a flavonoid story.

During maceration, anthocyanins and skin tannins extract quickly (peak by day 4–6), while seed tannins extract more slowly and continuously as ethanol rises. Boulton's classic extraction curves show that extended maceration (skin contact 20+ days) shifts the phenolic profile toward higher seed-tannin and lower monomeric anthocyanin because free anthocyanin is progressively lost to polymerisation and adsorption onto skin cell walls.

Colour stability in the finished wine depends on polymeric pigment formation — anthocyanins covalently linking to tannins via acetaldehyde bridges. This is why micro-oxygenation during ferment or early ageing accelerates colour stabilisation: it feeds the acetaldehyde bridge. Cap management technique matters less than total maceration time and total oxygen exposure. Punch-down, pump-over, and rack-and-return all extract; the differences are subtle mouthfeel effects rather than magnitude-of-extraction effects.`,
  },
  {
    sourceDoc: "boulton_ppw",
    wineType: "general",
    chapterRef: "Ch. 8",
    chapterTitle: "Boulton et al. — Clarification, Fining and Filtration",
    topicTags: "fining,bentonite,protein,heat stability,PVPP,gelatin,egg white,isinglass,casein,filtration,membrane,cross-flow",
    wbsDomain: "D5",
    wbsProcessFamily: "Post-Fermentation",
    wbsCode: "D5.2",
    content: `Summary — Boulton, Singleton, Bisson & Kunkee, Principles and Practices of Winemaking, Chapter 8 (Clarification, Fining and Filtration, pp 479–518).

Fining is targeted removal of a specific dissolved compound by an adsorbent or a precipitant. Bentonite (a sodium or calcium montmorillonite clay) binds positively charged wine proteins electrostatically and drops them out — the standard treatment for haze-forming pathogenesis-related proteins in white wine. PVPP (polyvinylpolypyrrolidone) is a hydrogen-bond scavenger that pulls out low-molecular-weight phenolics, useful for oxidised or overly bitter whites. Gelatin, egg-white albumen, isinglass, and casein each remove tannins at different molecular-weight ranges via protein-tannin cross-linking.

Boulton's operational rule: always bench-trial. A 3 × 3 matrix (three doses × three replicates) run against your actual wine takes half a day and prevents both under-dose (the fault persists) and over-dose (stripping of desirable phenolics or aroma). Heat-stability trials for bentonite dose (see Iland Ch. G) are the industry standard.

Filtration is size exclusion, not adsorption. Pad and DE (diatomaceous earth) filtration polishes at ~1 µm; membrane filtration at 0.45 µm is the standard sterile-filtration cut for microbial stability. Cross-flow filtration is the modern replacement for DE — no consumable waste and gentler on the wine, at higher capital cost.`,
  },
  // ─── Iland, Bruer, Edwards, Weeks & Wilkes — Chemical Analysis of Grapes and Wine ───
  {
    sourceDoc: "iland_cagw",
    wineType: "general",
    chapterRef: "Ch. A",
    chapterTitle: "Iland et al. — pH and Titratable Acidity Measurement",
    topicTags: "pH,TA,titratable acidity,titration,pH meter,calibration,acid adjustment,tartaric,tartaric acid,endpoint,buffer",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter A (pH and Titratable Acidity, pp 16–24).

pH and titratable acidity (TA) are the two most-used measurements in an Australian winery lab, and they are not the same thing. TA measures the total concentration of acids in the wine (mostly tartaric, malic, lactic, succinic) and is expressed as g/L of tartaric acid equivalent. pH measures the free hydrogen ion activity — how acidic the wine 'feels' biologically to yeast, bacteria, and SO2 equilibria. The two correlate loosely because potassium binding to acids shifts pH without changing TA.

The Iland method for pH: calibrate the meter with pH 4.00 and pH 7.00 buffers at 20°C every day of use, allow the electrode to equilibrate for 60 seconds in the sample, and report to two decimal places. The method for TA: dilute 5 mL of degassed wine with 20 mL of CO2-free water, add phenolphthalein indicator, titrate with 0.1 M NaOH to a persistent pink endpoint at pH 8.2. Automated titrators using a pH endpoint at 8.2 give the same answer without the indicator.

Practical interpretation: a table-wine pH of 3.3–3.6 is the sweet spot for SO2 efficacy, MLF completion, and colour stability. TA of 6.0–7.5 g/L is the palate-balanced range; below 5.0 g/L the wine tastes flabby, above 8.0 g/L it tastes sharp.`,
  },
  {
    sourceDoc: "iland_cagw",
    wineType: "general",
    chapterRef: "Ch. C.1",
    chapterTitle: "Iland et al. — Free and Total Sulphur Dioxide Analysis",
    topicTags: "SO2,free SO2,total SO2,aeration oxidation,ripper,titration,sulphite,method,laboratory,winery lab",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter C.1 (Free and Total Sulphur Dioxide, pp 52–61).

Two methods are in routine Australian use: the aeration-oxidation (A-O) method and the Ripper titration. Both estimate free SO2 as the fraction not bound to acetaldehyde or other carbonyls, but they use different chemistry.

The A-O method acidifies the wine sample to shift the equilibrium toward molecular SO2, sweeps the SO2 gas out of the acidified sample with a stream of air, and traps it in a hydrogen peroxide solution where it oxidises to sulphuric acid. The trapped acid is titrated with sodium hydroxide against a mixed indicator. A-O is more accurate on red wines (colour and phenolics don't interfere) but requires a purpose-built apparatus.

The Ripper method titrates the acidified wine directly with an iodine solution against a starch indicator; the iodine oxidises free SO2 to sulphate. Ripper is fast and cheap and works well on white wines, but red-wine phenolics react with iodine and inflate the apparent SO2 reading. Iland recommends A-O for reds and Ripper for whites in a busy winery lab.

Total SO2 requires an extra step: alkaline hydrolysis at 40°C for 30 minutes to release bound SO2 back into the free pool before titration. Free + bound = total. Molecular SO2 is then calculated from free SO2, pH, and temperature.`,
  },
  {
    sourceDoc: "iland_cagw",
    wineType: "general",
    chapterRef: "Ch. D",
    chapterTitle: "Iland et al. — Yeast Assimilable Nitrogen (YAN) Measurement",
    topicTags: "YAN,nitrogen,ammonia,alpha amino,formol,DAP,fermaid,nutrient,marginal,deficiency,yeast health",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter D (Yeast Assimilable Nitrogen, pp 88–95).

YAN is the sum of the two nitrogen forms yeast can actually use during fermentation: ammonia (NH4+, measured as ammonium nitrogen) and free alpha-amino nitrogen (FAN, from free amino acids excluding proline). Total nitrogen — which also includes proteins and proline — overstates what the yeast can access, so a wine with plenty of total nitrogen and low YAN will still stall.

The Iland method for FAN is the formol titration: the primary-amine groups of free amino acids react with formaldehyde to release protons, which are titrated with NaOH. Ammonia nitrogen is measured separately either by an ammonia-selective ion electrode or by an enzymatic spectrophotometric assay. YAN in mg/L equals ammonia-N plus FAN-N.

Interpretation follows a Brix-scaled scale. At 22 Brix, healthy fermentation needs 140–160 mg/L YAN minimum, comfortably 200 mg/L. At 25 Brix, the target rises to 250 mg/L or more because of ethanol stress on yeast. Below the minimum, add DAP (diammonium phosphate) or complex nutrients like Fermaid-K to close the gap — half at inoculation, half at one-third depletion. Above 400 mg/L can produce excess biomass, elevated volatile acidity, and undesirable aromatics; more is not always better.`,
  },
  {
    sourceDoc: "iland_cagw",
    wineType: "general",
    chapterRef: "Ch. C.4",
    chapterTitle: "Iland et al. — Volatile Acidity Analysis",
    topicTags: "volatile acidity,VA,acetic acid,vinegar,steam distillation,cash still,ethyl acetate,spoilage,threshold",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter C.4 (Volatile Acidity, pp 70–75).

Volatile acidity (VA) is the fraction of the wine's total acidity that can be steam-distilled — essentially acetic acid, with small contributions from butyric and propionic acids. Ethyl acetate (the solvent-note ester of acetic acid) tracks VA and adds sensory penalty at similar thresholds.

The standard method is cash-still steam distillation: 5 mL of wine plus tartaric acid to release bound acetic acid is distilled at 100°C for 4 minutes, the distillate is collected, and it is titrated with 0.02 M NaOH against phenolphthalein. Iland reports VA as g/L of acetic acid equivalent. A correction subtracts the free SO2 contribution because SO2 also carries into the distillate.

Sensory threshold sits at 0.7 g/L acetic acid for a red table wine, 0.6 g/L for white. Australian legal limits are 1.5 g/L for red and 1.2 g/L for white. VA above 0.8 g/L is a clear signal of microbial spoilage — usually Acetobacter, Brettanomyces, or lactic acid bacteria feeding on residual sugar or malic acid — and the winemaker should investigate SO2 management, temperature control, and hygiene immediately.`,
  },
  {
    sourceDoc: "iland_cagw",
    wineType: "general",
    chapterRef: "Ch. E",
    chapterTitle: "Iland et al. — Malic and Lactic Acid Monitoring for MLF",
    topicTags: "malic acid,lactic acid,paper chromatography,enzymatic assay,MLF completion,MLF monitoring,residual malic",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter E (Malic and Lactic Acid, pp 100–108).

Two methods are used to track malolactic fermentation, at different points in the cycle. Paper chromatography is the quick screening method: a drop of wine is spotted on chromatography paper alongside standards of malic, lactic, and tartaric acid, developed in a solvent tank with a pH indicator, and the resulting spots are visually compared. Paper chromatography confirms MLF is progressing and gives a rough sense of completion but does not quantify residual malic acid.

For confirmed completion, Iland recommends an enzymatic assay. L-malic acid is oxidised by L-malate dehydrogenase in the presence of NAD+ to produce NADH, which is measured spectrophotometrically at 340 nm. Commercial kits (Vintessential, Megazyme) automate the workflow and give quantitative residual-malic readings down to 0.05 g/L. MLF is considered complete at residual malic below 0.1 g/L — safe for bottling under SO2 protection without risk of in-bottle refermentation.

Timing: run paper chromatography weekly from 10 days post-inoculation. Once the malic spot has faded to near-invisible against the standard, switch to enzymatic assay to confirm the drop below the 0.1 g/L threshold before adding SO2 to lock the wine.`,
  },
  {
    sourceDoc: "iland_cagw",
    wineType: "white",
    chapterRef: "Ch. G",
    chapterTitle: "Iland et al. — Protein Heat Stability Testing and Bentonite Bench Trials",
    topicTags: "protein,heat stability,heat test,bentonite,fining,haze,white wine,thermal test,bench trial",
    wbsDomain: "D6",
    wbsProcessFamily: "Laboratory",
    wbsCode: "D6.1",
    content: `Summary — Iland, Bruer, Edwards, Weeks & Wilkes, Chemical Analysis of Grapes and Wine, Chapter G (Protein Heat Stability Testing, pp 132–139).

The heat test predicts whether a white wine will throw a protein haze in the bottle under warm shipping or retail conditions. A 25 mL wine sample is filtered through a 0.45 µm membrane to remove any existing particulate, held at 80°C for 6 hours (or 90°C for 2 hours in the accelerated variant), then cooled to 20°C. Turbidity is measured before and after in Nephelometric Turbidity Units (NTU) with a bench turbidimeter. A change greater than 2 NTU indicates the wine is protein-unstable and will need fining.

The bentonite bench-trial protocol turns a heat-test failure into a firm dose rate. Prepare a 5% (w/v) bentonite slurry, hydrated for at least 24 hours in warm water. Dose the wine at increasing rates — typically 0.3, 0.5, 0.7, 1.0, 1.5 g/L — mix well, let settle 2 hours, and rerun the heat test on each treatment. The lowest dose that returns a passing heat test is the operational dose for the tank, plus 10% safety margin.

Interpretation caveats: sulfation, oak lignins, and pectinase treatment can all affect the test. Iland recommends running the heat test on wine that has undergone all its planned treatments — a heat test on unfined juice will typically overestimate the final bentonite requirement.`,
  },
];

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) { console.error("DATABASE_URL not set"); process.exit(1); }
  const conn = await mysql.createConnection(dbUrl);

  // Wipe prior Phase-C summaries so re-runs are idempotent.
  const [del] = await conn.execute(
    "DELETE FROM diy_knowledge_chunks WHERE source_doc IN ('boulton_ppw','iland_cagw')"
  );
  console.log(`[Seed] Cleared ${del.affectedRows} existing Boulton/Iland summary chunks`);

  let inserted = 0;
  for (let i = 0; i < CHUNKS.length; i++) {
    const c = CHUNKS[i];
    await conn.execute(
      `INSERT INTO diy_knowledge_chunks
        (source_doc, wine_type, chapter_ref, chapter_title, topic_tags, content, chunk_index,
         wbs_domain, wbs_process_family, wbs_code, published, published_at, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`,
      [
        c.sourceDoc,
        c.wineType,
        c.chapterRef,
        c.chapterTitle,
        c.topicTags,
        c.content,
        i,
        c.wbsDomain,
        c.wbsProcessFamily ?? null,
        c.wbsCode ?? null,
        Date.now(),
        Date.now(),
      ]
    );
    inserted++;
  }
  console.log(`[Seed] Inserted ${inserted} Boulton/Iland attributed summary chunks (all published)`);
  await conn.end();
}

main().catch((e) => { console.error(e); process.exit(1); });
