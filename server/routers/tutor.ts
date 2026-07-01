import { z } from "zod";
import { router, publicProcedure, ownerProcedure } from "../trpc.js";
import { eq, or, like, and } from "drizzle-orm";
import {
  getUserByOpenId,
  getUserCellarContext,
  db,
} from "../db.js";
import * as schema from "../../drizzle/schema.js";
import { routeQuery } from "../queryRouter.js";
import { backfillSopEmbeddings } from "../sopEmbeddings.js";
import { persistJournalEntry } from "../cellarJournalRouter.js";

// ─── Tutor Router (Scoped RAG — SOP-backed winemaking AI) ──────────────────────

// Keyword → SOP category mapping for fast retrieval
const KEYWORD_CATEGORY_MAP: Record<string, string[]> = {
  // Fermentation
  ferment: ["Fermentation Management", "Yeast & Fermentation"],
  fermentation: ["Fermentation Management", "Yeast & Fermentation"],
  stuck: ["Fermentation Management"],
  stall: ["Fermentation Management"],
  brix: ["Fermentation Management", "Harvest & Receival"],
  sg: ["Fermentation Management"],
  gravity: ["Fermentation Management"],
  temperature: ["Fermentation Management"],
  cap: ["Fermentation Management"],
  punchdown: ["Fermentation Management"],
  pump: ["Fermentation Management"],
  // Yeast & Nutrition
  yeast: ["Yeast & Fermentation", "Fermentation Management"],
  yan: ["Yeast & Fermentation"],
  dap: ["Yeast & Fermentation"],
  nutrient: ["Yeast & Fermentation"],
  inoculation: ["Yeast & Fermentation"],
  rehydration: ["Yeast & Fermentation"],
  strain: ["Yeast & Fermentation"],
  // SO2 / Sulphur
  so2: ["SO₂ Management", "Additions & Chemistry"],
  sulphur: ["SO₂ Management"],
  sulfur: ["SO₂ Management"],
  "k-meta": ["SO₂ Management"],
  kmeta: ["SO₂ Management"],
  metabisulphite: ["SO₂ Management"],
  molecular: ["SO₂ Management"],
  // MLF
  mlf: ["Malolactic Fermentation"],
  malolactic: ["Malolactic Fermentation"],
  malic: ["Malolactic Fermentation"],
  lactic: ["Malolactic Fermentation"],
  bacteria: ["Malolactic Fermentation"],
  // Racking & Clarification
  rack: ["Racking & Clarification"],
  racking: ["Racking & Clarification"],
  lees: ["Racking & Clarification"],
  fining: ["Racking & Clarification", "Additions & Chemistry"],
  bentonite: ["Racking & Clarification", "Additions & Chemistry"],
  gelatin: ["Racking & Clarification"],
  clarity: ["Racking & Clarification"],
  haze: ["Racking & Clarification"],
  filter: ["Racking & Clarification"],
  // Additions & Chemistry
  addition: ["Additions & Chemistry"],
  tartaric: ["Additions & Chemistry"],
  acid: ["Additions & Chemistry"],
  ph: ["Additions & Chemistry"],
  ta: ["Additions & Chemistry"],
  tannin: ["Additions & Chemistry"],
  oak: ["Additions & Chemistry"],
  // Harvest
  harvest: ["Harvest & Receival"],
  pick: ["Harvest & Receival"],
  receival: ["Harvest & Receival"],
  crush: ["Harvest & Receival"],
  press: ["Harvest & Receival", "Pressing & Free-Run"],
  pressing: ["Pressing & Free-Run"],
  "free-run": ["Pressing & Free-Run"],
  // Bottling & Packaging
  bottle: ["Bottling & Packaging"],
  bottling: ["Bottling & Packaging"],
  cork: ["Bottling & Packaging"],
  label: ["Bottling & Packaging"],
  packaging: ["Bottling & Packaging"],
  // Sanitation & Equipment
  sanitise: ["Sanitation & Equipment"],
  sanitize: ["Sanitation & Equipment"],
  sanitising: ["Sanitation & Equipment"],
  clean: ["Sanitation & Equipment"],
  cleaning: ["Sanitation & Equipment"],
  equipment: ["Sanitation & Equipment"],
  carboy: ["Sanitation & Equipment"],
  bubbler: ["Sanitation & Equipment"],
  demijohn: ["Sanitation & Equipment"],
  // Faults
  fault: ["Fault Diagnosis", "Fermentation Management"],
  h2s: ["Fault Diagnosis"],
  "rotten egg": ["Fault Diagnosis"],
  brett: ["Fault Diagnosis"],
  va: ["Fault Diagnosis"],
  volatile: ["Fault Diagnosis"],
  oxidation: ["Fault Diagnosis"],
  oxidised: ["Fault Diagnosis"],
};

function detectSopCategories(question: string): string[] {
  const lower = question.toLowerCase();
  const matched = new Set<string>();
  for (const [keyword, categories] of Object.entries(KEYWORD_CATEGORY_MAP)) {
    if (lower.includes(keyword)) {
      categories.forEach((c) => matched.add(c));
    }
  }
  return Array.from(matched);
}

const tutorRouter = router({
  ask: publicProcedure
    .input(
      z.object({
        question: z.string().min(1).max(2000),
        mode: z.enum(["winemaking", "home_winemaker"]).optional().default("winemaking"),
        batchSizeLitres: z.number().min(1).max(9999).optional(),
        history: z
          .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string() }))
          .max(10)
          .optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");

      const isHomeWinemaker = input.mode === "home_winemaker";

      // ═══════════════════════════════════════════════════════════════════════
      // DIY HOME WINEMAKER PATH — Document-grounded bible chunk retrieval
      // Only uses published chunks from diy_knowledge_chunks.
      // Applies reasoning layer + risk assessment. Cites chapter in answer.
      // ═══════════════════════════════════════════════════════════════════════
      if (isHomeWinemaker) {
        // ── Colloquial normalisation map ──────────────────────────────────────
        // Maps home winemaker slang to technical winemaking concepts.
        // Used to expand keyword search — NOT shown to the user.
        const COLLOQUIAL_MAP: Record<string, string[]> = {
          "bubbles stopped": ["stuck fermentation", "fermentation stalled", "activity"],
          "bubbles": ["fermentation", "CO2", "activity", "yeast"],
          "stopped bubbling": ["stuck fermentation", "fermentation complete", "activity"],
          "not bubbling": ["fermentation", "MLF", "activity", "stuck"],
          "smells like eggs": ["hydrogen sulphide", "H2S", "reductive", "sulphur"],
          "egg smell": ["hydrogen sulphide", "H2S", "reductive"],
          "smells like nail polish": ["ethyl acetate", "volatile acidity", "VA"],
          "nail polish remover": ["ethyl acetate", "volatile acidity", "VA"],
          "smells off": ["fault", "volatile acidity", "H2S", "oxidation"],
          "tastes sharp": ["acidity", "TA", "pH", "tartaric"],
          "too acidic": ["TA", "pH", "acid adjustment", "calcium carbonate"],
          "too sweet": ["residual sugar", "Brix", "stuck fermentation", "dry"],
          "not dry": ["residual sugar", "stuck fermentation", "Brix"],
          "campden tablets": ["potassium metabisulphite", "SO2", "sulphite"],
          "campden": ["potassium metabisulphite", "SO2", "sulphite"],
          "marbles trick": ["headspace", "oxidation", "top-up"],
          "cap": ["pomace cap", "punch down", "cap management"],
          "punch down": ["cap management", "punch down", "extraction"],
          "pump over": ["cap management", "extraction", "oxygen"],
          "rack": ["racking", "siphon", "lees", "sediment"],
          "racking": ["racking", "lees", "siphon", "sediment"],
          "sediment": ["lees", "gross lees", "fine lees", "racking"],
          "cloudy": ["haze", "clarity", "fining", "protein", "bentonite"],
          "gone cloudy": ["haze", "clarity", "fining", "protein"],
          "white powder": ["film yeast", "oxidation", "Kahm yeast"],
          "film on surface": ["film yeast", "oxidation", "Kahm yeast"],
          "how many campden": ["SO2", "sulphite", "potassium metabisulphite", "ppm"],
          "how much sulphite": ["SO2", "sulphite", "ppm", "free SO2"],
          "when do i rack": ["racking timing", "lees", "gross lees", "sediment"],
          "when to rack": ["racking timing", "lees", "gross lees"],
          "how long do i leave it": ["fermentation duration", "aging", "maturation"],
          "can i drink it": ["maturation", "readiness", "aging", "bottle"],
          "is it ready": ["maturation", "readiness", "aging"],
          "hydrometer": ["Brix", "specific gravity", "sugar", "fermentation"],
          "refractometer": ["Brix", "sugar", "alcohol correction"],
          "carboy": ["fermenter", "vessel", "storage", "headspace"],
          "demijohn": ["fermenter", "vessel", "storage", "headspace"],
          "bucket": ["fermenter", "vessel", "primary fermentation"],
          "airlock": ["CO2", "oxygen", "fermentation", "headspace"],
          "stuck": ["stuck fermentation", "stalled", "YAN", "nutrient"],
          "mlf": ["malolactic fermentation", "lactic acid", "malic acid", "bacteria"],
          "malo": ["malolactic fermentation", "lactic acid", "malic acid"],
          "lees": ["gross lees", "fine lees", "sediment", "racking"],
          "gross lees": ["gross lees", "racking", "sediment", "pressing"],
          "press": ["pressing", "extraction", "skins", "juice"],
          "pressing": ["pressing", "extraction", "bladder press"],
          "dap": ["DAP", "diammonium phosphate", "YAN", "nutrient"],
          "fermaid": ["Fermaid-O", "Fermaid-K", "nutrient", "YAN"],
          "goferm": ["GoFerm", "yeast rehydration", "yeast hydration"],
          "oak chips": ["oak", "aging", "tannin", "flavor"],
          "oak cubes": ["oak", "aging", "tannin", "flavor"],
          "bottle shock": ["bottle shock", "sulfite", "bottling"],
          "corking": ["cork", "bottling", "sealing"],
          "fining": ["fining", "clarity", "bentonite", "gelatin"],
          "bentonite": ["fining", "protein", "clarity", "bentonite"],
          "isinglass": ["fining", "clarity", "isinglass"],
          "ph": ["pH", "acidity", "tartaric", "calcium carbonate"],
          "ta": ["TA", "total acidity", "tartaric", "acid"],
          "brix": ["Brix", "sugar", "refractometer", "hydrometer"],
          "specific gravity": ["Brix", "sugar", "hydrometer", "fermentation"],
          "sg": ["specific gravity", "Brix", "hydrometer"],
          "temperature": ["fermentation temperature", "temperature control", "cooling"],
          "too hot": ["fermentation temperature", "temperature", "cooling"],
          "too cold": ["fermentation temperature", "temperature", "yeast"],
          "yeast": ["yeast", "inoculation", "fermentation", "Saccharomyces"],
          "inoculate": ["inoculation", "yeast", "pitch"],
          "pitch": ["inoculation", "yeast", "pitch rate"],
          "sulphur": ["sulphur", "SO2", "H2S", "sulphite"],
          "sulfur": ["sulphur", "SO2", "H2S", "sulphite"],
          "oxidation": ["oxidation", "oxygen", "browning", "SO2"],
          "browning": ["oxidation", "browning", "SO2", "colour"],
          "color": ["colour", "extraction", "anthocyanins", "tannin"],
          "colour": ["colour", "extraction", "anthocyanins", "tannin"],
          "tannin": ["tannin", "structure", "mouthfeel", "extraction"],
          "mouthfeel": ["mouthfeel", "tannin", "body", "texture"],
          "flat": ["mouthfeel", "acidity", "CO2", "body"],
          "thin": ["body", "mouthfeel", "tannin", "extract"],
          "headspace": ["headspace", "oxygen", "top-up", "oxidation"],
          "top up": ["headspace", "top-up", "oxidation", "oxygen"],
          "top-up": ["headspace", "top-up", "oxidation"],
          "siphon": ["racking", "siphon", "transfer", "lees"],
          "transfer": ["racking", "transfer", "lees", "vessel"],
          // ── White wine specific ───────────────────────────────────────────
          "cold settling": ["settling", "cold settling", "solids", "juice clarity", "fining"],
          "cold soak": ["cold soaking", "skin contact", "maceration", "phenolics"],
          "skin contact": ["skin contact", "maceration", "phenolics", "cold soak"],
          "whole cluster": ["whole cluster", "pressing", "crush", "destem"],
          "pressing white": ["pressing", "press", "juice", "extraction"],
          "reductive": ["reductive", "inert gas", "oxidation", "sulphur", "H2S"],
          "inert gas": ["inert gas", "argon", "nitrogen", "CO2", "oxidation", "headspace"],
          "argon": ["argon", "inert gas", "oxidation protection", "headspace"],
          "nitrogen": ["nitrogen", "inert gas", "oxidation", "headspace"],
          "sur lie": ["sur-lie", "lees ageing", "lees contact", "autolysis", "texture"],
          "sur-lie": ["sur-lie", "lees ageing", "lees contact", "autolysis"],
          "lees ageing": ["sur-lie", "lees ageing", "autolysis", "texture", "complexity"],
          "cold stable": ["cold stability", "tartrate", "tartaric", "crystals", "stabilisation"],
          "crystals": ["tartrate crystals", "cold stability", "tartaric", "stabilisation"],
          "tartrate": ["tartrate", "cold stability", "tartaric acid", "crystals"],
          "protein stable": ["protein stability", "bentonite", "haze", "fining"],
          "protein haze": ["protein haze", "bentonite", "protein stability", "fining"],
          "heat test": ["protein stability", "heat test", "bentonite", "haze"],
          "crisp": ["acidity", "TA", "pH", "tartaric", "malic", "freshness"],
          "green": ["malic acid", "acidity", "unripe", "pH", "TA"],
          "flabby": ["low acidity", "TA", "pH", "acid addition", "tartaric"],
          "oxidised": ["oxidation", "browning", "SO2", "inert gas", "colour"],
          "oxidized": ["oxidation", "browning", "SO2", "inert gas", "colour"],
          "brett": ["Brettanomyces", "fault", "barnyard", "phenolic", "contamination"],
          "barnyard": ["Brettanomyces", "brett", "fault", "contamination"],
          "mousy": ["mousiness", "fault", "MLF", "bacteria", "contamination"],
          "geranium": ["geranium taint", "sorbate", "MLF", "fault"],
          "sorbate": ["potassium sorbate", "geranium taint", "MLF", "stabilisation"],
          "chardonnay": ["Chardonnay", "white wine", "oak", "MLF", "sur-lie"],
          "sauvignon blanc": ["Sauvignon Blanc", "white wine", "reductive", "acidity", "thiols"],
          "riesling": ["Riesling", "white wine", "acidity", "residual sugar", "low pH"],
          "pinot gris": ["Pinot Gris", "Pinot Grigio", "white wine", "skin contact"],
          "white wine": ["white wine", "white", "juice", "pressing", "cold settling"],
          "juice": ["juice", "must", "pressing", "white wine", "settling"],
          "must": ["must", "juice", "Brix", "pH", "TA", "adjustment"],
          "chromatography": ["chromatography", "MLF", "malic acid", "lactic acid", "MLF completion"],
          "paper chromatography": ["chromatography", "MLF", "malic acid", "MLF completion"],
        };

        // Expand the question with colloquial synonyms for better keyword matching
        const questionLower = input.question.toLowerCase();
        const expandedTerms = new Set<string>();
        // Add original question words
        questionLower.split(/\s+/).filter(w => w.length > 2).forEach(w => expandedTerms.add(w));
        // Add colloquial expansions
        for (const [phrase, synonyms] of Object.entries(COLLOQUIAL_MAP)) {
          if (questionLower.includes(phrase)) {
            synonyms.forEach(s => s.toLowerCase().split(/\s+/).forEach(w => expandedTerms.add(w)));
          }
        }
        const questionWords = Array.from(expandedTerms).filter(w => w.length > 2).slice(0, 20);

        // ── Wine type auto-detection ──────────────────────────────────────────
        // Detect red or white wine from question keywords. Defaults to 'both' if ambiguous.
        const RED_VARIETY_SIGNALS = [
          "shiraz", "cabernet", "merlot", "pinot noir", "grenache", "malbec", "tempranillo",
          "sangiovese", "zinfandel", "mourvedre", "nebbiolo", "barbera", "dolcetto",
          "red wine", "red grape", "red kit", "cap management", "punch down", "pump over",
          "pomace", "skin contact red", "maceration", "anthocyanin",
        ];
        const WHITE_VARIETY_SIGNALS = [
          "chardonnay", "sauvignon blanc", "riesling", "pinot gris", "pinot grigio",
          "gewurztraminer", "viognier", "semillon", "muscat", "verdejo", "albarino",
          "white wine", "white grape", "white kit", "cold settling", "cold soak",
          "sur lie", "sur-lie", "cold stable", "cold stab", "tartrate", "protein haze",
          "free-run", "press juice", "reductive", "inert gas", "argon", "nitrogen flush",
        ];
        const isRedSignal = RED_VARIETY_SIGNALS.some(s => questionLower.includes(s));
        const isWhiteSignal = WHITE_VARIETY_SIGNALS.some(s => questionLower.includes(s));
        // Determine detected wine type
        let detectedWineType: "red" | "white" | "both" = "both";
        if (isRedSignal && !isWhiteSignal) detectedWineType = "red";
        else if (isWhiteSignal && !isRedSignal) detectedWineType = "white";
        // else both (ambiguous — search all sources)
        console.log(`[DIYTutor] Detected wine type: ${detectedWineType} | red signal: ${isRedSignal} | white signal: ${isWhiteSignal}`);

        // Step 1: Retrieve published chunks — scoped to detected wine type
        const allPublishedChunks = await db
          .select({
            id: schema.diyKnowledgeChunks.id,
            chapterRef: schema.diyKnowledgeChunks.chapterRef,
            chapterTitle: schema.diyKnowledgeChunks.chapterTitle,
            topicTags: schema.diyKnowledgeChunks.topicTags,
            wbsCode: schema.diyKnowledgeChunks.wbsCode,
            content: schema.diyKnowledgeChunks.content,
            sourceDoc: schema.diyKnowledgeChunks.sourceDoc,
            wineType: schema.diyKnowledgeChunks.wineType,
          })
          .from(schema.diyKnowledgeChunks)
          .where(eq(schema.diyKnowledgeChunks.published, true))
          .limit(300);

        // Filter by detected wine type — if 'both', include all. Specialist
        // MoreWine manuals (SO₂, MLF, yeast, oak, sanitation, bench trials,
        // pH meter, fining, oxygen) are colour-agnostic and always included.
        // Sparkling manuals join the pool for sparkling AND white queries
        // (sparkling base wine = white-wine flow).
        const SPECIALIST_MANUALS_SET = new Set([
          "morew_so2_mgmt", "morew_so2_protocol", "morew_mlf_paper",
          "morew_yeast_pairing", "morew_yeast_hydration", "morew_oxygen_ferment",
          "morew_inert_gas", "morew_sanitation", "morew_oak_info",
          "morew_oak_barrel_care", "morew_ph_meter", "morew_bench_trials",
          "morew_fining_agents",
        ]);
        const SPARKLING_SOURCES = new Set([
          "morew_sparkling_yeast", "morew_sparkling_proelif",
        ]);
        const scopedChunks = detectedWineType === "both"
          ? allPublishedChunks
          : allPublishedChunks.filter(c =>
              c.wineType === detectedWineType ||
              (c.sourceDoc && SPECIALIST_MANUALS_SET.has(c.sourceDoc)) ||
              (c.sourceDoc && SPARKLING_SOURCES.has(c.sourceDoc) && detectedWineType !== "red") ||
              (c.sourceDoc === "morew_red_outline" && detectedWineType === "red")
            );

        // Score each chunk by expanded keyword overlap
        const scored = scopedChunks.map((chunk) => {
          const haystack = [
            (chunk.topicTags ?? "").toLowerCase(),
            (chunk.chapterTitle ?? "").toLowerCase(),
            chunk.content.toLowerCase().slice(0, 800),
          ].join(" ");
          const score = questionWords.reduce((acc, word) => acc + (haystack.includes(word) ? 1 : 0), 0);
          // Boost home-scale outlines + the MoreWine specialist manuals — they
          // are the highest-density practical content in the corpus.
          const src = chunk.sourceDoc ?? "";
          const sourceBoost =
            src === "morew_red_outline" ? 0.5 :
            SPECIALIST_MANUALS_SET.has(src) ? 0.4 :
            SPARKLING_SOURCES.has(src) ? 0.6 :  // supplier-grade sparkling data
            0;
          return { ...chunk, score: score + sourceBoost };
        });

        // Take top 6 most relevant chunks (mix of sources)
        const topChunks = scored
          .filter((c) => c.score > 0)
          .sort((a, b) => b.score - a.score)
          .slice(0, 6);

        // If no keyword match, take fermentation intro chunks from both sources
        const relevantChunks = topChunks.length > 0 ? topChunks : allPublishedChunks.slice(0, 4);

        console.log(`[DIYTutor] Retrieved ${relevantChunks.length} published chunks (top score: ${topChunks[0]?.score ?? 0}) | sources: ${Array.from(new Set<string>(relevantChunks.map(c => c.sourceDoc ?? ''))).join(', ')}`);

        // Step 2: Build document context with source labels — every MoreWine
        // manual gets a proper human name so the LLM can cite it accurately.
        const DOC_LABELS: Record<string, string> = {
          red_wine_bible:          "MoreWine! Guide to Red Winemaking",
          white_wine_bible:        "MoreWine! Guide to White Winemaking",
          morew_red_outline:       "MoreWine! Red Winemaking Outline (home scale)",
          morew_sparkling_yeast:   "MoreWine! Sparkling Wine Protocol — Prise de Mousse Yeast Method",
          morew_sparkling_proelif: "MoreWine! Sparkling Wine Protocol — ProElif Method",
          morew_so2_mgmt:          "MoreWine! Guide to SO₂ Management",
          morew_so2_protocol:      "MoreWine! SO₂ Management Protocols",
          morew_mlf_paper:         "MoreWine! Malolactic Bacteria Information Paper",
          morew_yeast_pairing:     "MoreWine! Yeast & Grape Pairing Guide",
          morew_yeast_hydration:   "MoreWine! Wine Yeast Rehydration Guide",
          morew_oxygen_ferment:    "MoreWine! Macro-Oxygenation & Fermentation (Shea Comfort)",
          morew_inert_gas:         "MoreWine! Using Inert Gas in Winemaking",
          morew_sanitation:        "MoreWine! Sanitization in Winemaking",
          morew_oak_info:          "MoreWine! Oak Information Manual",
          morew_oak_barrel_care:   "MoreWine! Oak Barrel Care Guide",
          morew_ph_meter:          "MoreWine! Use & Care of a pH Meter",
          morew_bench_trials:      "MoreWine! How to Perform Bench Trials",
          morew_fining_agents:     "MoreWine! Benchmarking of Fining Agents",
        };
        const docContext = relevantChunks
          .map((chunk) => {
            const src = chunk.sourceDoc ?? "";
            const docLabel = DOC_LABELS[src] ?? (src.startsWith("au_regulations__") ? "Australian Wine Regulations" : src.startsWith("oenology_education__") ? "Oenology Curriculum Reference" : src || "Reference Document");
            return `## ${docLabel} — ${chunk.chapterTitle ?? `Chapter ${chunk.chapterRef}`}\n${chunk.content.slice(0, 2000)}`;
          })
          .join("\n\n---\n\n");

        const sourceRefs = Array.from(new Set<string>(relevantChunks.map((c) => c.chapterTitle ?? `Chapter ${c.chapterRef}`))).slice(0, 4);

        // Step 3: Batch size extraction — use explicit input if provided, else parse from question text
        let batchSizeContext: string;
        if (input.batchSizeLitres) {
          batchSizeContext = `The user has selected a batch size of ${input.batchSizeLitres} litres. Scale ALL quantities, dosages, and measurements to this exact volume. Always state "for your ${input.batchSizeLitres}L batch" when giving quantities.`;
        } else {
          const batchSizeMatch = questionLower.match(/(\d+(?:\.\d+)?)\s*(litre|liter|l\b|gallon|gal|L)/);
          const batchSize = batchSizeMatch ? `${batchSizeMatch[1]} ${batchSizeMatch[2]}` : null;
          batchSizeContext = batchSize
            ? `The user has stated their batch size is ${batchSize}. Scale all quantities and dosages to this volume.`
            : `The user has not stated their batch size. Assume a standard home winemaker batch of 23 litres (5 gallons) and state this assumption in your answer.`;
        }

        // Step 4: Risk classification — detect high-risk topics
        const highRiskKeywords = ["so2", "sulfite", "sulphite", "metabisulphite", "metabisulfite",
          "campden", "potassium", "sorbate", "bentonite", "tartaric", "citric", "acid addition",
          "dap", "yan", "nutrient", "dosage", "ppm", "grams per", "g/l", "mg/l",
          "fining", "isinglass", "gelatin", "casein", "food safe", "how much", "how many"];
        const isHighRisk = highRiskKeywords.some((kw) => questionLower.includes(kw));

        // Step 5: Build DIY system prompt — colloquial, scale-aware, document-grounded
        const diySystemPrompt = `You are a friendly, knowledgeable home winemaking assistant. You help home winemakers at garage scale (typically 10–100 litres). You speak in plain, everyday English — not textbook language.

COLLOQUIAL LANGUAGE RULES:
- If the user says "bubbles stopped" they mean stuck or completed fermentation
- If they say "smells like eggs" they mean hydrogen sulphide (H2S)
- If they say "nail polish remover" they mean ethyl acetate or volatile acidity
- If they say "campden tablets" they mean potassium metabisulphite (SO2 source)
- If they say "cap" they mean the pomace cap that forms during red wine fermentation
- If they say "rack" or "racking" they mean siphoning wine off the sediment
- If they say "marbles trick" they mean filling headspace to prevent oxidation
- Translate any commercial-scale language in the documents to home-scale equivalents

SCALE TRANSLATION RULES:
- Convert all quantities from per hectolitre (hL) to per litre, then scale to the user's batch
- "Pump-over" → "punch-down or gentle stir with a spoon"
- "Laboratory analysis" → "hydrometer or refractometer reading"
- "Tank" → "carboy, bucket, or demijohn"
- "Inoculation rate in g/hL" → convert to grams for the user's batch size
- Always state the assumed or stated batch size in your answer

BATCH SIZE: ${batchSizeContext}

WINE TYPE CONTEXT: The user appears to be asking about ${detectedWineType === 'both' ? 'general winemaking (could be red or white)' : detectedWineType + ' wine'}. Tailor your answer to ${detectedWineType === 'both' ? 'the applicable wine type, or both if relevant' : detectedWineType + ' wine specifically'}.

DOCUMENT-GROUNDED RULES:
1. Answer from the reference documents provided. If the exact answer is not there, reason from the principles in the documents and say so.
2. Cite the source document and section (e.g. "According to the MoreWine! Outline, Section C...").
3. If the question is outside the scope of all provided documents, say so honestly and suggest what topics are covered.

RISK GUIDANCE:
${isHighRisk ? '- This question involves chemical additions or dosages. Provide the document guidance, scale the quantities to the user\'s batch size, and add: "Always do a bench trial on a small sample before treating the whole batch. Verify products with your homebrew supplier."' : '- This is a process or technique question. Answer confidently and practically.'}

RESPONSE FORMAT — respond with a JSON object only, no markdown fences:
{
  "answer": "<plain English answer, scaled to batch size, citing source>",
  "sourceChapters": ["<source and section 1>", "<source and section 2>"],
  "riskLevel": "${isHighRisk ? 'high' : 'low'}",
  "disclaimer": "${isHighRisk ? 'Scale quantities to your batch size. Do a bench trial before treating the whole batch. Verify products with your homebrew supplier.' : 'Home winemaking varies — always taste and trust your senses.'}"
}

REFERENCE DOCUMENTS:
${docContext}`;

        const diyMessages = [
          { role: "system" as const, content: diySystemPrompt },
          ...(input.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
          { role: "user" as const, content: input.question },
        ];

        const diyResponse = await fetch(`${forgeUrl}/v1/chat/completions`, {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
          body: JSON.stringify({ messages: diyMessages, stream: false, response_format: { type: "json_object" } }),
        });

        if (!diyResponse.ok) {
          const errText = await diyResponse.text();
          console.error("[DIYTutor] LLM error:", diyResponse.status, errText);
          throw new Error(`LLM error: ${diyResponse.status}`);
        }

        const diyData = await diyResponse.json();
        const diyRawContent = diyData.choices?.[0]?.message?.content || "{}";

        let diyAnswer = "No response received.";
        let diySourceChapters: string[] = sourceRefs;
        let diyDisclaimer = isHighRisk
          ? "Verify chemical quantities and products with your homebrew supplier before use."
          : "Home winemaking practices vary — always taste and judge your wine yourself.";
        let diyRiskLevel = isHighRisk ? "high" : "low";

        try {
          const parsed = JSON.parse(diyRawContent);
          if (parsed.answer) diyAnswer = parsed.answer;
          if (Array.isArray(parsed.sourceChapters)) diySourceChapters = parsed.sourceChapters;
          if (parsed.disclaimer) diyDisclaimer = parsed.disclaimer;
          if (parsed.riskLevel) diyRiskLevel = parsed.riskLevel;
        } catch {
          diyAnswer = diyRawContent;
        }

        // ── Persist to Cellar Journal (fire-and-forget) ──
        persistJournalEntry({
          question: input.question,
          topicTag:
            Array.isArray(diySourceChapters) && diySourceChapters.length > 0
              ? diySourceChapters[0]
              : "Home Winemaking",
          fullAnswer: diyAnswer,
          source: "tutor.ask",
          audience: "home_winemaker",
          wineType: detectedWineType ?? "unknown",
          citations: (diySourceChapters || []).map((c) => ({ label: c })),
        }).catch((e) => console.warn("[CellarJournal] persist failed:", e?.message));

        return {
          answer: diyAnswer,
          sopTitles: diySourceChapters,
          disclaimer: diyDisclaimer,
          riskLevel: diyRiskLevel,
        };
      }

      // ═══════════════════════════════════════════════════════════════════════
      // COMMERCIAL WINEMAKER PATH — SOP-based retrieval (unchanged)
      // ═══════════════════════════════════════════════════════════════════════

      // ── Step 1: Query Router — classify intent and determine retrieval strategy ────
      const routerDecision = await routeQuery(input.question, forgeUrl, forgeKey);
      console.log(`[QueryRouter] intents=${routerDecision.intents.join(",")} categories=${routerDecision.sopCategories.join(",")} confidence=${routerDecision.confidence} | ${routerDecision.reasoning}`);

      // If compliance question, signal to the LLM to redirect
      const isComplianceRedirect = routerDecision.isCompliance;

      // ── Step 2: SOP Retriever ─────────────────────────────────────────────────
      let sops: Array<{ title: string; category: string; procedureText: string | null; decisionLogic: string | null; tribalKnowledge: string | null }> = [];

      if (routerDecision.sopCategories.length > 0) {
        // Commercial: Router-guided category retrieval
        const categoryConditions = routerDecision.sopCategories.map((cat) =>
          like(schema.sopLibrary.category, `%${cat}%`)
        );
        sops = await db
          .select({
            title: schema.sopLibrary.title,
            category: schema.sopLibrary.category,
            procedureText: schema.sopLibrary.procedureText,
            decisionLogic: schema.sopLibrary.decisionLogic,
            tribalKnowledge: schema.sopLibrary.tribalKnowledge,
          })
          .from(schema.sopLibrary)
          .where(and(eq(schema.sopLibrary.audience, "commercial"), or(...categoryConditions)))
          .limit(3);
      }

      // Fallback: keyword search on title if no results yet
      if (sops.length === 0) {
        const words = input.question.toLowerCase().split(/\s+/).filter((w) => w.length > 4).slice(0, 3);
        if (words.length > 0) {
          const titleConditions = words.map((w) => like(schema.sopLibrary.title, `%${w}%`));
          sops = await db
            .select({
              title: schema.sopLibrary.title,
              category: schema.sopLibrary.category,
              procedureText: schema.sopLibrary.procedureText,
              decisionLogic: schema.sopLibrary.decisionLogic,
              tribalKnowledge: schema.sopLibrary.tribalKnowledge,
            })
            .from(schema.sopLibrary)
            .where(and(eq(schema.sopLibrary.audience, "commercial"), or(...titleConditions)))
            .limit(3);
        }
      }

      // ── Step 2b: Live Cellar Retriever — inject this winemaker's own history ─
      // Pulls last ~120 vintage_log entries + tank/variety inventory + event mix
      // so the AI grounds advice in THEIR cellar, not just generic SOPs.
      let liveCellarContext = "";
      if (ctx.user) {
        try {
          const dbUser = await getUserByOpenId(ctx.user.openId);
          if (dbUser) {
            liveCellarContext = await getUserCellarContext(dbUser.id, dbUser.wineryId ?? null);
          }
        } catch (e) {
          console.warn("[Tutor] cellar context fetch failed:", (e as Error)?.message);
        }
      }

      // ── Step 3: Build scoped context from retrieved SOPs ────────────────────

      let sopContext = "";

      if (sops.length > 0) {
        sopContext = sops
          .map((sop) => {
            const parts = [`## ${sop.title} (${sop.category})`];
            if (sop.procedureText) parts.push(`### Procedure\n${sop.procedureText.slice(0, 1500)}`);
            if (sop.decisionLogic) parts.push(`### Decision Logic\n${sop.decisionLogic.slice(0, 800)}`);
            if (sop.tribalKnowledge) parts.push(`### Tribal Knowledge\n${sop.tribalKnowledge.slice(0, 500)}`);
            return parts.join("\n");
          })
          .join("\n\n---\n\n");
      } else {
        // No SOPs found — use general winemaking knowledge
        sopContext = "No specific SOP found for this topic. Answer from general oenological knowledge.";
      }

      // ── Step 3b: Detect vintage year and region mentions; inject vintage context ─
      // Known Australian wine regions for detection
      const KNOWN_REGIONS = [
        "Barossa Valley", "Barossa",
        "Eden Valley",
        "McLaren Vale",
        "Margaret River",
        "Hunter Valley", "Hunter",
        "Yarra Valley", "Yarra",
        "Mudgee",
        "Orange",
        "Canberra District", "Canberra",
        "Clare Valley", "Clare",
        "Coonawarra",
        "Mornington Peninsula", "Mornington",
        "Heathcote",
        "Grampians",
        "Rutherglen",
        "Langhorne Creek",
        "Padthaway",
        "Wrattonbully",
        "Adelaide Hills",
        "Riverland",
        "Riverina",
        "King Valley",
      ];

      // Detect year mentions (e.g. "2024", "2023 vintage", "'24")
      const yearMatches = input.question.match(/\b(20[0-9]{2})\b/);
      const mentionedYear = yearMatches ? parseInt(yearMatches[1]) : null;

      // Detect region mentions
      const questionLower = input.question.toLowerCase();
      const mentionedRegion = KNOWN_REGIONS.find((r) => questionLower.includes(r.toLowerCase()));

      let vintageContext = "";
      if (mentionedRegion || mentionedYear) {
        // Try to find a matching vintage intelligence entry
        const targetYear = mentionedYear ?? new Date().getFullYear();
        let vintageRows: Array<{
          region: string;
          year: number;
          state: string;
          conditions: string;
          standoutVarieties: string | null;
          qualityRating: number;
          yieldAssessment: string | null;
          winemakingNotes: string | null;
          source: string | null;
        }> = [];

        if (mentionedRegion) {
          // Try exact region match first
          const exactRow = await db
            .select({
              region: schema.vintageIntelligence.region,
              year: schema.vintageIntelligence.year,
              state: schema.vintageIntelligence.state,
              conditions: schema.vintageIntelligence.conditions,
              standoutVarieties: schema.vintageIntelligence.standoutVarieties,
              qualityRating: schema.vintageIntelligence.qualityRating,
              yieldAssessment: schema.vintageIntelligence.yieldAssessment,
              winemakingNotes: schema.vintageIntelligence.winemakingNotes,
              source: schema.vintageIntelligence.source,
            })
            .from(schema.vintageIntelligence)
            .where(
              and(
                like(schema.vintageIntelligence.region, `%${mentionedRegion}%`),
                eq(schema.vintageIntelligence.year, targetYear)
              )
            )
            .limit(1);
          if (exactRow.length > 0) vintageRows = exactRow;
        }

        // If no region match but year mentioned, get national overview
        if (vintageRows.length === 0 && mentionedYear) {
          const nationalRow = await db
            .select({
              region: schema.vintageIntelligence.region,
              year: schema.vintageIntelligence.year,
              state: schema.vintageIntelligence.state,
              conditions: schema.vintageIntelligence.conditions,
              standoutVarieties: schema.vintageIntelligence.standoutVarieties,
              qualityRating: schema.vintageIntelligence.qualityRating,
              yieldAssessment: schema.vintageIntelligence.yieldAssessment,
              winemakingNotes: schema.vintageIntelligence.winemakingNotes,
              source: schema.vintageIntelligence.source,
            })
            .from(schema.vintageIntelligence)
            .where(
              and(
                eq(schema.vintageIntelligence.year, mentionedYear),
                like(schema.vintageIntelligence.region, "%National%")
              )
            )
            .limit(1);
          if (nationalRow.length > 0) vintageRows = nationalRow;
        }

        if (vintageRows.length > 0) {
          const vi = vintageRows[0];
          const ratingLabels: Record<number, string> = { 1: "Poor", 2: "Below Average", 3: "Average", 4: "Excellent", 5: "Exceptional" };
          const parts = [
            `## ${vi.region} ${vi.year} Vintage Intelligence`,
            `**Quality Rating:** ${vi.qualityRating}/5 — ${ratingLabels[vi.qualityRating] ?? "Unknown"}`,
          ];
          if (vi.yieldAssessment) parts.push(`**Yield:** ${vi.yieldAssessment}`);
          if (vi.standoutVarieties) parts.push(`**Standout Varieties:** ${vi.standoutVarieties}`);
          parts.push(`\n### Growing Season Conditions\n${vi.conditions.slice(0, 1200)}`);
          if (vi.winemakingNotes) parts.push(`\n### Winemaking Implications\n${vi.winemakingNotes.slice(0, 800)}`);
          if (vi.source) parts.push(`\n*Source: ${vi.source}*`);
          vintageContext = parts.join("\n");
        }
      }

      const personaLine = isHomeWinemaker
        ? "You are a friendly, practical home winemaking assistant helping a home winemaker in their garage or cellar."
        : "You are an expert winemaking assistant helping a professional winemaker or cellar hand.";

      const complianceNote = isComplianceRedirect
        ? "\n- IMPORTANT: This question involves regulatory compliance, licensing, or labelling law. Answer briefly then explicitly direct the user to the Compliance AI at /compliance for authoritative guidance."
        : "";

      const systemPrompt = `${personaLine}
You answer questions about winemaking based on the Standard Operating Procedures (SOPs) provided below.

Rules:
- Answer from the SOPs provided. If the SOPs don't cover the question, use sound oenological knowledge and say so.
- Be specific and actionable. Give numbers, ranges, and decision criteria where relevant.
- ${isHomeWinemaker ? "Keep language accessible — avoid jargon where possible, or explain it briefly." : "Use professional winemaking terminology."}${complianceNote}
- ${liveCellarContext ? "PERSONAL HISTORY PRIORITY: A 'THIS WINEMAKER'S CELLAR HISTORY' block is provided below with this winemaker's own logged entries. When the question relates to a tank/variety/event in their history, CITE specific past entries by date + tank — e.g. 'Looking at your 18 Mar entry on Tank 7 (Shiraz), you measured…'. Ground your numbers in their actual data when possible. Never expose source labels (no 'CELLAR HISTORY says…'); speak naturally as their assistant." : ""}
- UNITS: This user is in Australia / New Zealand. ALWAYS answer in METRIC units (kg, L, mL, g, °C, ppm, mg/L). If a referenced SOP or knowledge chunk uses imperial (gallons, lbs, °F, tsp/tbsp), SILENTLY convert before quoting. Conversion table: 1 US gal ≈ 3.785 L · 1 lb ≈ 0.454 kg · °F→°C: (F−32)×5/9 · 1 tsp ≈ 5 g K-meta (close approx). Never expose the conversion to the reader; just present the metric figure as if it were native to the source.
- Respond with a JSON object only, no markdown fences:
{
  "answer": "<your full answer, may include newlines>",
  "sopTitles": ["<SOP title 1>", "<SOP title 2>"],
  "disclaimer": "${isHomeWinemaker ? "Home winemaking practices vary — always taste and judge your wine yourself." : "Always validate decisions against your own vintage data and consult a qualified winemaker for critical decisions."}"
}

SOPs:
${sopContext}${vintageContext ? `\n\n---\n\n## Regional Vintage Context\n${vintageContext}` : ""}${liveCellarContext ? `\n\n---\n\n${liveCellarContext}` : ""}`;

      const messages = [
        { role: "system" as const, content: systemPrompt },
        ...(input.history ?? []).map((m) => ({ role: m.role as "user" | "assistant", content: m.content })),
        { role: "user" as const, content: input.question },
      ];

      const response = await fetch(`${forgeUrl}/v1/chat/completions`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
        body: JSON.stringify({ messages, stream: false, response_format: { type: "json_object" } }),
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error("[Tutor] LLM error:", response.status, errText);
        throw new Error(`LLM error: ${response.status}`);
      }

      const data = await response.json();
      const rawContent = data.choices?.[0]?.message?.content || "{}";

      let answer = "No response received.";
      let sopTitles: string[] = [];
      let disclaimer = isHomeWinemaker
        ? "Home winemaking practices vary — always taste and judge your wine yourself."
        : "Always validate decisions against your own vintage data.";

      try {
        const parsed = JSON.parse(rawContent);
        if (parsed.answer) answer = parsed.answer;
        if (Array.isArray(parsed.sopTitles)) sopTitles = parsed.sopTitles;
        if (parsed.disclaimer) disclaimer = parsed.disclaimer;
      } catch {
        answer = rawContent;
      }

            return { answer, sopTitles, disclaimer };
    }),

  // Owner-only: backfill embedding vectors for all SOPs that don't have them
  backfillEmbeddings: ownerProcedure
    .input(z.object({ audience: z.enum(["diy", "commercial"]).optional() }).optional())
    .mutation(async ({ input }) => {
      const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
      const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
      if (!forgeUrl || !forgeKey) throw new Error("LLM service not configured");
      const result = await backfillSopEmbeddings(forgeUrl, forgeKey, input?.audience);
      return result;
    }),

  /**
   * Capture thumbs-up / thumbs-down feedback on an AI answer.
   * Used to identify weak prompts/RAG gaps over time. Public — any user can rate.
   * Stored in ai_answer_feedback (schema.aiAnswerFeedback).
   */
  rateAnswer: publicProcedure
    .input(
      z.object({
        procName: z.string().min(1).max(64),
        question: z.string().min(1).max(2000),
        answerHash: z.string().min(1).max(32),
        score: z.union([z.literal(1), z.literal(-1)]),
        note: z.string().max(500).optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      let userId: number | null = null;
      if (ctx.user) {
        const u = await getUserByOpenId(ctx.user.openId);
        if (u) userId = u.id;
      }
      await db.insert(schema.aiAnswerFeedback).values({
        userId,
        procName: input.procName,
        question: input.question.slice(0, 2000),
        answerHash: input.answerHash,
        score: input.score,
        note: input.note ?? null,
        createdAt: Date.now(),
      });
      return { ok: true };
    }),
});

export { tutorRouter };
