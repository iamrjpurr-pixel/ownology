/**
 * quizData.ts — the curated 25 wines for /quiz.
 * Each wine has a palate signature; the scoring algorithm maps quiz answers
 * to axis values and picks the closest match. Zero LLM at runtime.
 *
 * Voice: Rich narrates ("we", "us", "I"), Gel adds a one-line technical note.
 */

export type Fruit = "red" | "dark" | "citrus" | "savoury";
export type Body = "light" | "medium" | "full";
export type Sweetness = "bone_dry" | "hint" | "off_dry" | "sweet";
export type Grip = "bright" | "grippy" | "soft" | "both";
export type Age = "young" | "developed" | "old";
export type Budget = "under_25" | "25_50" | "50_100" | "100_plus";

export type QuizAnswers = {
  fruit: Fruit;
  body: Body;
  sweetness: Sweetness;
  grip: Grip;
  age: Age;
  budget: Budget;
};

export type Region = "AU" | "NZ" | "US" | "UK" | "OTHER";

/** Region-specific availability + tariff/tax context. Written honestly —
 *  what a friend would tell you before you drove to the bottle shop. */
export type RegionalNote = {
  /** "easy" = in every major bottle shop; "moderate" = specialist stores;
   *  "hard" = order online / direct import; "rare" = you're chasing unicorns */
  availability: "easy" | "moderate" | "hard" | "rare";
  /** Local price range for a decent bottle in this region, in local currency
   *  string (with $ sign). Reflects retail after all local duties/tariffs. */
  priceRange: string;
  /** One-line honest advice: where to buy, tariff/tax context, seasonality,
   *  or a "wait for X sale" note. Written in Rich's voice. */
  advice: string;
};

export type Wine = {
  slug: string;
  variety: string;
  region: string;
  country: string;
  ageWindow: string;
  price: Budget;
  richsPick: string; // 60-120 words, Rich's voice
  gelsNote: string;  // 1 line, technical
  producers: string[];
  alsoTry: string[];
  palate: {
    fruit: Fruit;
    body: Body;
    sweetness: Sweetness;
    grip: Grip;
    age: Age;
  };
  /** Optional per-region availability/price advice. If missing for a region,
   *  the quiz uses a generic fallback. Populate honestly. */
  regional?: Partial<Record<Region, RegionalNote>>;
  /** Specialty/aperitif wines that shouldn't dominate the recommendation
   *  space. Applies a small score penalty so they only win on very close
   *  palate matches, not by mopping up under-represented axis combos. */
  specialty?: boolean;
};

export const WINES: Wine[] = [
  {
    slug: "grillo-sicily",
    variety: "Grillo",
    region: "Western Sicily",
    country: "Italy",
    ageWindow: "4–8 years old",
    price: "25_50",
    richsPick: "We drank one on a Tuesday in October and I still won't shut up about it. Bright, salty, feels like it's been swimming in the Mediterranean. Grillo used to be the base for Marsala — now the good producers are making single-varietal bottlings that are bone dry, mineral, and taste like sunshine on stone. Drink slightly chilled with anything from the sea.",
    gelsNote: "Aromatic thiols carry the tropical + salt character. High TA, low RS, minimal oak.",
    producers: ["COS", "Marco De Bartoli", "Cusumano Alta Mora"],
    alsoTry: ["Assyrtiko (Santorini)", "Vermentino (Sardinia)"],
    palate: { fruit: "citrus", body: "light", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },
  {
    slug: "riesling-clare",
    variety: "Riesling",
    region: "Clare Valley",
    country: "Australia",
    ageWindow: "Current vintage or up to 5 years",
    price: "under_25",
    richsPick: "Our national treasure and nobody talks about it. Clare Rieslings are electric — lime, chalk, laser acid. Gel says the pH profile is why they age like they do. I say they're the best $22 you can spend on wine in this country. Buy a case, drink one now, hide the rest for five years.",
    gelsNote: "pH < 3.0 typical; high tartaric preserves aromatic precursors for decades.",
    producers: ["Grosset", "Jim Barry Florita", "Pikes"],
    alsoTry: ["Eden Valley Riesling", "Mosel Kabinett"],
    palate: { fruit: "citrus", body: "light", sweetness: "bone_dry", grip: "bright", age: "developed" },
  },
  {
    slug: "chardonnay-adelaide-hills",
    variety: "Chardonnay",
    region: "Adelaide Hills",
    country: "Australia",
    ageWindow: "2–6 years",
    price: "25_50",
    richsPick: "Our backyard — literally. Adelaide Hills Chardonnay circa 2020 onwards is a different animal from the buttery '90s stuff. It's tight, oyster-shell driven, restrained oak, seaside minerality. If you liked Chablis 15 years ago and hated Aussie Chardy, come back — it's changed.",
    gelsNote: "Partial MLF, older oak, extended lees contact — the modern Aus playbook.",
    producers: ["Shaw + Smith M3", "Ashton Hills", "Tapanappa Tiers"],
    alsoTry: ["Chablis (Burgundy)", "Yarra Valley Chardonnay"],
    palate: { fruit: "citrus", body: "medium", sweetness: "bone_dry", grip: "both", age: "developed" },
  },
  {
    slug: "sauvignon-blanc-marlborough",
    variety: "Sauvignon Blanc",
    region: "Marlborough",
    country: "New Zealand",
    ageWindow: "1–2 years, drink young",
    price: "under_25",
    richsPick: "The one everyone drinks and nobody admits to. Passionfruit, cut grass, gooseberry — big aromatic hit for $18. Drink it very cold, don't age it. Perfect for a warm afternoon on the deck when nobody wants to think about wine.",
    gelsNote: "Thiols (3MH, 4MMP) at their peak in the first 18 months. Age it and they fade.",
    producers: ["Cloudy Bay", "Greywacke", "Dog Point"],
    alsoTry: ["Sancerre (Loire)", "Adelaide Hills Sauv Blanc"],
    palate: { fruit: "citrus", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
  },
  {
    slug: "chenin-blanc-loire",
    variety: "Chenin Blanc",
    region: "Vouvray, Loire Valley",
    country: "France",
    ageWindow: "5–15 years",
    price: "25_50",
    richsPick: "The most underrated white in France. Off-dry Chenin from Vouvray tastes like honey and quince and wet stone. Gel loves the pH curve. I love that a 10-year-old bottle costs less than a decent Sydney lunch.",
    gelsNote: "Slight RS balances high natural acidity — ~9 g/L TA is common.",
    producers: ["Domaine Huet", "François Chidaine", "Vincent Carême"],
    alsoTry: ["Riesling Spätlese (Mosel)", "South African Chenin"],
    palate: { fruit: "citrus", body: "medium", sweetness: "off_dry", grip: "bright", age: "developed" },
  },
  {
    slug: "pinot-noir-mornington",
    variety: "Pinot Noir",
    region: "Mornington Peninsula",
    country: "Australia",
    ageWindow: "3–8 years",
    price: "50_100",
    richsPick: "If you're new to Pinot, start here — cooler and more approachable than Yarra, cheaper than proper Burgundy. Red cherry, sous bois, silk. The best examples make Gel go quiet, which is a rare thing.",
    gelsNote: "Whole-bunch inclusion for aromatic lift; low extraction, no new oak dominance.",
    producers: ["Ten Minutes By Tractor", "Kooyong", "Paringa Estate"],
    alsoTry: ["Bourgogne Rouge", "Tasmanian Pinot"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "bright", age: "developed" },
  },
  {
    slug: "beaujolais-cru",
    variety: "Gamay (Cru Beaujolais)",
    region: "Morgon or Fleurie",
    country: "France",
    ageWindow: "2–6 years",
    price: "25_50",
    richsPick: "Forget the Nouveau. Cru Beaujolais is what happens when Gamay is taken seriously — bright cherry, gentle earth, feather-light tannin. Chill it slightly. Drink with charcuterie. Feel smug that you know the difference.",
    gelsNote: "Semi-carbonic maceration preserves fresh fruit; minimal tannin extraction.",
    producers: ["Marcel Lapierre", "Jean Foillard", "Château Thivin"],
    alsoTry: ["Loire Pinot Noir", "Etna Rosso"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "soft", age: "young" },
  },
  {
    slug: "grenache-mclaren-vale",
    variety: "Grenache",
    region: "McLaren Vale",
    country: "Australia",
    ageWindow: "3–8 years",
    price: "25_50",
    richsPick: "Old-bush-vine Grenache is doing the same thing here that Pinot did 20 years ago — quietly getting brilliant. Perfumed, spicy, tart red fruit, low-alcohol restraint. Gel says the tannin curve looks nothing like Shiraz. I say it drinks like it should cost twice as much.",
    gelsNote: "Whole-bunch, ambient yeast, moderate extraction — 13.5–14% ABV is now the norm.",
    producers: ["Yangarra Old Vine", "SC Pannell", "Aphelion"],
    alsoTry: ["Southern Rhône Grenache", "Priorat"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "bright", age: "developed" },
  },
  {
    slug: "nebbiolo-barolo",
    variety: "Nebbiolo (Barolo)",
    region: "Piedmont",
    country: "Italy",
    ageWindow: "10–20 years",
    price: "100_plus",
    richsPick: "Rose petals, tar, dried cherries, dust. Barolo is the most demanding wine on this list — pale, aggressive tannin when young, ethereal when old. Save your $150 for a producer with 12+ years on the bottle. It will change your life.",
    gelsNote: "Very high tannin index; needs a decade minimum to polymerise and soften.",
    producers: ["Vietti", "Giacomo Conterno", "Elio Grasso"],
    alsoTry: ["Barbaresco", "Aged Rioja Gran Reserva"],
    palate: { fruit: "savoury", body: "full", sweetness: "bone_dry", grip: "grippy", age: "old" },
  },
  {
    slug: "shiraz-barossa",
    variety: "Shiraz",
    region: "Barossa Valley",
    country: "Australia",
    ageWindow: "5–15 years",
    price: "50_100",
    richsPick: "The wine that put Australia on the map. Barossa Shiraz done well is dense but not fat — blueberry, black pepper, chocolate, old leather. Rich says you want mid-tier ($60-90) not entry — the character shows up above that price. Gel says do the numbers on TA before you commit.",
    gelsNote: "Warm-climate; TA-corrected + extended maceration for structure; ~14.5% ABV.",
    producers: ["Torbreck", "Rockford Basket Press", "Standish"],
    alsoTry: ["Northern Rhône Syrah", "Californian Syrah"],
    palate: { fruit: "dark", body: "full", sweetness: "bone_dry", grip: "both", age: "developed" },
  },
  {
    slug: "cabernet-coonawarra",
    variety: "Cabernet Sauvignon",
    region: "Coonawarra",
    country: "Australia",
    ageWindow: "6–18 years",
    price: "50_100",
    richsPick: "Terra Rossa soil is a real thing and you can taste it. Coonawarra Cab has this mint-and-eucalypt lift over cassis and cedar oak. Age it. A well-cellared 2010 will out-drink most Bordeaux at the same price.",
    gelsNote: "Iron-rich clay over limestone gives distinctive mint/eucalypt marker compounds.",
    producers: ["Wynns Black Label", "Katnook Odyssey", "Balnaves Tally"],
    alsoTry: ["Left Bank Bordeaux", "Margaret River Cab"],
    palate: { fruit: "dark", body: "full", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },
  {
    slug: "malbec-mendoza",
    variety: "Malbec",
    region: "Uco Valley, Mendoza",
    country: "Argentina",
    ageWindow: "3–8 years",
    price: "under_25",
    richsPick: "The Tuesday-night steak wine. Plush, black-plum, violet, forgiving tannin, easy alcohol. High-altitude Uco Valley bottlings are the ones — they've got acid to match the fruit. Under $25 delivers enormous drinking here.",
    gelsNote: "1000m+ altitude preserves natural acidity in a warm climate.",
    producers: ["Catena", "Zuccardi", "Bodega Colomé"],
    alsoTry: ["Cahors Malbec (France)", "Petit Verdot"],
    palate: { fruit: "dark", body: "full", sweetness: "bone_dry", grip: "soft", age: "young" },
  },
  {
    slug: "chianti-classico",
    variety: "Sangiovese (Chianti Classico)",
    region: "Tuscany",
    country: "Italy",
    ageWindow: "3–10 years",
    price: "25_50",
    richsPick: "Cherry pit, dried herbs, leather, sour-cherry acid. Chianti Classico Riserva at $40 is one of the best red wine deals in the world. Drink with tomato-based food and it disappears in ways cheaper wine cannot.",
    gelsNote: "High malic pre-MLF; sour-cherry marker from succinic + lactic post-MLF.",
    producers: ["Fontodi", "Castello di Ama", "Isole e Olena"],
    alsoTry: ["Brunello di Montalcino", "Aged Rioja"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },
  {
    slug: "amarone",
    variety: "Corvina blend (Amarone)",
    region: "Valpolicella",
    country: "Italy",
    ageWindow: "8–20 years",
    price: "100_plus",
    richsPick: "Concentrated to insanity by drying grapes on straw mats for months. Fig, raisin, chocolate, coffee, savoury complexity. 15%+ ABV — a two-glass wine at most. When you want maximum flavour for a special dinner, this is the answer.",
    gelsNote: "Appassimento raises Brix to ~28°; residual sugar + high glycerol give the texture.",
    producers: ["Quintarelli", "Allegrini", "Masi Costasera"],
    alsoTry: ["Vintage Port", "Priorat"],
    palate: { fruit: "dark", body: "full", sweetness: "hint", grip: "grippy", age: "old" },
  },
  {
    slug: "champagne-vintage",
    variety: "Champagne (Vintage)",
    region: "Champagne",
    country: "France",
    ageWindow: "8–15 years",
    price: "100_plus",
    richsPick: "The only wine where the older it looks the more we get excited. Aged vintage Champagne (2008 is having a moment) is toast, hazelnut, honey, oyster brine. Nothing else does what this does. Worth every dollar.",
    gelsNote: "Extended lees ageing releases mannoproteins → creamy mid-palate + brioche autolysis.",
    producers: ["Louis Roederer", "Bollinger Grande Année", "Pol Roger Sir Winston"],
    alsoTry: ["Blanc de Blancs Grand Cru", "Vintage Tasmanian sparkling"],
    palate: { fruit: "citrus", body: "medium", sweetness: "hint", grip: "bright", age: "old" },
  },
  {
    slug: "sauternes",
    variety: "Sémillon-Sauvignon (Sauternes)",
    region: "Bordeaux",
    country: "France",
    ageWindow: "10–30 years",
    price: "100_plus",
    richsPick: "Honeyed, apricot, saffron, marmalade. Noble-rot magic. A half-bottle of aged Sauternes ($120-180) is the perfect end to a serious meal — cheese, foie gras, or on its own after dinner. Drinks like liquid gold.",
    gelsNote: "Botrytis cinerea concentrates sugar, acid, and glycerol simultaneously — a rare compound event.",
    producers: ["Château d'Yquem", "Château Rieussec", "Château Suduiraut"],
    alsoTry: ["Tokaji Aszú", "German Trockenbeerenauslese"],
    palate: { fruit: "citrus", body: "full", sweetness: "sweet", grip: "soft", age: "old" },
  },
  {
    slug: "vermouth-di-torino",
    variety: "Vermouth di Torino",
    region: "Piedmont",
    country: "Italy",
    ageWindow: "Non-vintage, drink fresh",
    price: "under_25",
    richsPick: "Not technically wine, but not going to be an ass about it. Good vermouth (real Vermouth di Torino, not the supermarket stuff) served with an ice cube and a twist is one of the great pre-dinner drinks. Herbal, bittersweet, complex. Buy Cocchi or Carpano.",
    gelsNote: "Aromatised, fortified wine — botanicals + wormwood + moscato base.",
    producers: ["Cocchi Storico", "Carpano Antica Formula", "Mancino"],
    alsoTry: ["Sherry Amontillado", "Madeira Sercial"],
    palate: { fruit: "savoury", body: "medium", sweetness: "off_dry", grip: "soft", age: "young" },
    specialty: true,
  },
  {
    slug: "assyrtiko-santorini",
    variety: "Assyrtiko",
    region: "Santorini",
    country: "Greece",
    ageWindow: "2–6 years",
    price: "25_50",
    richsPick: "Volcanic-soil white from Greek islands that pierces like a laser. Lemon, sea salt, chalk, smoke. Basket-trained vines survive winds we can't imagine. If you like Riesling and Sauv Blanc but want something nobody at the dinner has heard of — this is it.",
    gelsNote: "TA 8+ g/L; volcanic pumice soils drive the marine/mineral character.",
    producers: ["Sigalas", "Gaia Wines", "Argyros"],
    alsoTry: ["Albariño (Rías Baixas)", "Muscadet Sèvre-et-Maine"],
    palate: { fruit: "citrus", body: "medium", sweetness: "bone_dry", grip: "bright", age: "developed" },
  },
  {
    slug: "gewurztraminer-alsace",
    variety: "Gewürztraminer",
    region: "Alsace",
    country: "France",
    ageWindow: "3–8 years",
    price: "25_50",
    richsPick: "Lychee, rose petal, ginger, Turkish delight. Off-dry, heady, unlike anything else. Not for every meal — pair with Thai food or blue cheese and it's magic. Get a Grand Cru bottling for the real experience.",
    gelsNote: "High cis-rose-oxide (the lychee marker) + terpenes. Naturally low acid.",
    producers: ["Zind-Humbrecht", "Trimbach", "Domaine Weinbach"],
    alsoTry: ["Torrontés (Argentina)", "Muscat d'Alsace"],
    palate: { fruit: "citrus", body: "full", sweetness: "off_dry", grip: "soft", age: "developed" },
  },
  {
    slug: "port-vintage",
    variety: "Port (Vintage)",
    region: "Douro Valley",
    country: "Portugal",
    ageWindow: "20–40 years",
    price: "100_plus",
    richsPick: "The last wine of the night. Vintage Port takes decades to open up — the '85, '94, and '00 are drinking beautifully now. Blackberry, chocolate, cedar, and enough alcohol (20%) to warm your soul.",
    gelsNote: "Fermentation arrested with grape brandy at ~8° Brix — RS 100+ g/L, ABV 20%.",
    producers: ["Taylor's", "Graham's", "Warre's"],
    alsoTry: ["Madeira Bual", "Rutherglen Muscat"],
    palate: { fruit: "dark", body: "full", sweetness: "sweet", grip: "grippy", age: "old" },
  },
  {
    slug: "prosecco-superiore",
    variety: "Glera (Prosecco Superiore DOCG)",
    region: "Valdobbiadene",
    country: "Italy",
    ageWindow: "1–2 years",
    price: "25_50",
    richsPick: "Not the $15 Prosecco at the servo. Actual Valdobbiadene DOCG Prosecco Superiore is a different wine — pear, green apple, chalk, fine mousse. A great bottle-shop find under $30.",
    gelsNote: "Charmat/Martinotti method preserves primary fruit — no bottle autolysis complexity.",
    producers: ["Nino Franco", "Bisol", "Ruggeri"],
    alsoTry: ["Franciacorta", "Crémant d'Alsace"],
    palate: { fruit: "citrus", body: "light", sweetness: "hint", grip: "bright", age: "young" },
  },
  {
    slug: "syrah-northern-rhone",
    variety: "Syrah",
    region: "Northern Rhône (Crozes-Hermitage / St-Joseph)",
    country: "France",
    ageWindow: "5–15 years",
    price: "50_100",
    richsPick: "Same grape as Aussie Shiraz, completely different wine. Cool-climate, savoury, olive, cracked pepper, iodine, violet. If Barossa Shiraz is a heavyweight boxer, Northern Rhône Syrah is a fencer. Start with Crozes-Hermitage under $80.",
    gelsNote: "Cool-climate low ripeness → rotundone (pepper marker) preserved; lower ABV than Aus.",
    producers: ["Jean-Louis Chave", "Domaine Combier", "Alain Graillot"],
    alsoTry: ["Coonawarra Shiraz (Aus cool-climate)", "Central Otago Syrah"],
    palate: { fruit: "savoury", body: "full", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },
  {
    slug: "rose-provence",
    variety: "Grenache-Cinsault Rosé",
    region: "Provence",
    country: "France",
    ageWindow: "Current vintage only",
    price: "25_50",
    richsPick: "Pale pink, bone dry, watermelon, strawberry, sea spray. Drink young, drink cold. Provence Rosé is the perfect afternoon-into-evening wine. Doesn't get better than this.",
    gelsNote: "Direct-press or short maceration; minimal skin phenolics — hence pale colour.",
    producers: ["Whispering Angel", "Domaines Ott", "Château Miraval"],
    alsoTry: ["Tavel Rosé (heavier)", "Australian dry Rosé (Sangiovese)"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
  },
  {
    slug: "montepulciano-abruzzo",
    variety: "Montepulciano d'Abruzzo",
    region: "Abruzzo",
    country: "Italy",
    ageWindow: "2–5 years",
    price: "under_25",
    richsPick: "Under $20 delivers real drinking here. Dark cherry, dried herb, gentle grip. Nothing complicated, just honest Italian red for pasta night. Buy a case.",
    gelsNote: "Warm-climate, medium extraction; malolactic softens the palate quickly.",
    producers: ["Masciarelli", "Emidio Pepe", "Valentini (splurge)"],
    alsoTry: ["Primitivo di Manduria", "Nero d'Avola"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "soft", age: "young" },
  },
  {
    slug: "beaujolais-villages",
    variety: "Gamay (Beaujolais-Villages)",
    region: "Beaujolais",
    country: "France",
    ageWindow: "1–3 years",
    price: "under_25",
    richsPick: "The Tuesday-night red for people who don't want a heavy wine. Bright red cherry, a whisper of earth, almost weightless tannin. Serve slightly chilled — a proper 15°C, not fridge-cold — and it drinks like something twice the price. Perfect with roast chicken or a cheese board.",
    gelsNote: "Semi-carbonic maceration preserves fresh primary fruit; low alcohol, low extract, high drinkability.",
    producers: ["Georges Duboeuf", "Louis Jadot", "Domaine Dupeuble"],
    alsoTry: ["Cru Beaujolais (Fleurie)", "Loire Pinot Noir"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
  },
  {
    slug: "pinot-noir-yarra-entry",
    variety: "Pinot Noir (entry-level)",
    region: "Yarra Valley or Tasmania",
    country: "Australia",
    ageWindow: "1–3 years",
    price: "under_25",
    richsPick: "Under $25 Aussie Pinot used to be a gamble — thin, herbal, disappointing. That's changed. Second-label bottlings from serious cool-climate producers now deliver bright red cherry, faint sous-bois, gentle grip. Not a Grand Cru moment, but honest Pinot for a Wednesday. Serve cool.",
    gelsNote: "Entry-tier fruit off cool-climate vineyards; minimal oak, short maceration, drink young.",
    producers: ["De Bortoli Villages", "Delatite", "Josef Chromy"],
    alsoTry: ["Mornington entry Pinot", "Central Otago Pinot second labels"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "soft", age: "young" },
  },
  {
    slug: "burgundy-old-white",
    variety: "Chardonnay (Meursault or Puligny-Montrachet)",
    region: "Côte de Beaune, Burgundy",
    country: "France",
    ageWindow: "8–15 years",
    price: "100_plus",
    richsPick: "The last frontier of great Chardonnay. Aged Meursault — nut, honey, hazelnut, wet stone, gentle oxidative complexity. Expensive and worth it once a year. The wine every Adelaide Hills Chardonnay producer secretly aspires to.",
    gelsNote: "Extended lees + partial malolactic + old oak — the reference for restrained Chardonnay.",
    producers: ["Domaine Roulot", "Coche-Dury", "François Carillon"],
    alsoTry: ["Aged Adelaide Hills Chardonnay", "Chablis Grand Cru"],
    palate: { fruit: "citrus", body: "full", sweetness: "bone_dry", grip: "bright", age: "old" },
  },
];

// ─── Scoring — deterministic, zero LLM ────────────────────────────────────
// Weights: fruit is the primary style signal (red/dark/citrus/savoury
// essentially locks the wine's colour and family). A user who says "dark
// fruit — blackberry, plum" is picking a red — no combination of matching
// body/grip/age/budget should override that into a white. Fruit weight is
// deliberately dominant (12) — larger than the sum of any single other
// axis but not by so much that a perfect 5/6 match on a slightly-off fruit
// (savoury vs dark) still loses to a 1/6 match with the exact fruit.
const AXIS_WEIGHTS = { fruit: 12, body: 3, sweetness: 4, grip: 3, age: 2, budget: 4 };

// Family bonus / cross-family penalty — enforce the colour-family line.
// A user asking for red fruit and getting a Gewürztraminer is being
// mis-advised no matter how many other axes align. Family match earns a
// modest bonus (below exact-fruit but above no-signal); cross-family
// receives an explicit penalty so it can only win when there is literally
// no in-family option at the user's budget + axes.
const FAMILY_BONUS = 5;
const CROSS_FAMILY_PENALTY = 6;
const RED_FAMILY: ReadonlySet<Fruit> = new Set(["red", "dark", "savoury"] as Fruit[]);
const WHITE_FAMILY: ReadonlySet<Fruit> = new Set(["citrus"] as Fruit[]);
function sameFamily(a: Fruit, b: Fruit): boolean {
  if (a === b) return true;
  if (RED_FAMILY.has(a) && RED_FAMILY.has(b)) return true;
  if (WHITE_FAMILY.has(a) && WHITE_FAMILY.has(b)) return true;
  return false;
}

// Specialty penalty — applied to aperitif/oddity wines (currently only
// Vermouth) so they only surface on very close palate matches instead of
// mopping up under-represented axis combos and dominating the result set.
const SPECIALTY_PENALTY = 5;

// Sweetness is a scale, not a category. Someone who asks for "sweet" and
// gets a bone-dry wine is being mis-advised in a way that matching "light"
// body against "medium" body isn't. Score by distance on a 0–3 scale so
// adjacent picks (hint↔off_dry) are near-neutral, opposite-end mismatches
// (bone_dry↔sweet) carry a real penalty.
const SWEETNESS_LEVEL: Record<Sweetness, number> = {
  bone_dry: 0, hint: 1, off_dry: 2, sweet: 3,
};
function sweetnessScore(userS: Sweetness, wineS: Sweetness): number {
  const diff = Math.abs(SWEETNESS_LEVEL[userS] - SWEETNESS_LEVEL[wineS]);
  if (diff === 0) return AXIS_WEIGHTS.sweetness; // exact = +4
  if (diff === 1) return 1;                       // adjacent = tiny partial
  if (diff === 2) return -3;                      // clear mismatch
  return -8;                                       // opposite ends (bone_dry↔sweet)
}

export function scoreWine(w: Wine, a: QuizAnswers): number {
  let score = 0;
  if (w.palate.fruit === a.fruit) {
    score += AXIS_WEIGHTS.fruit;
  } else if (sameFamily(w.palate.fruit, a.fruit)) {
    score += FAMILY_BONUS;
  } else {
    score -= CROSS_FAMILY_PENALTY;
  }
  if (w.palate.body === a.body) score += AXIS_WEIGHTS.body;
  score += sweetnessScore(a.sweetness, w.palate.sweetness);
  if (w.palate.grip === a.grip) score += AXIS_WEIGHTS.grip;
  if (w.palate.age === a.age) score += AXIS_WEIGHTS.age;
  if (w.price === a.budget) score += AXIS_WEIGHTS.budget;
  if (w.specialty) score -= SPECIALTY_PENALTY;
  return score;
}

// Budget-tier ordering — higher-priced tiers include lower-priced ones only
// when the user picks the top tier. Anyone under $50 should NEVER see a
// $100+ wine (that's not "close enough", that's out of budget entirely).
const BUDGET_RANK: Record<Budget, number> = {
  under_25: 0,
  "25_50": 1,
  "50_100": 2,
  "100_plus": 3,
};

/** Which price tiers are acceptable given the user's budget answer.
 *  Rule: never recommend ABOVE the user's tier (that's bad shopping advice).
 *  Below their tier is fine — a great $22 bottle beats a mediocre $45 one. */
function acceptableTiers(budget: Budget): Set<Budget> {
  const max = BUDGET_RANK[budget];
  return new Set(
    (Object.keys(BUDGET_RANK) as Budget[]).filter((b) => BUDGET_RANK[b] <= max)
  );
}

export function pickWine(a: QuizAnswers): Wine {
  // HARD budget filter — never suggest above the user's stated tier.
  // This is non-negotiable: if a user says "$25-50", showing them a $100
  // wine is bad advice, not "the best fit". Budget wins over palate.
  const allowed = acceptableTiers(a.budget);
  const inBudget = WINES.filter((w) => allowed.has(w.price));
  // If somehow no wines match (shouldn't happen — we always have under_25),
  // fall back to the full list rather than crash.
  const pool = inBudget.length > 0 ? inBudget : WINES;
  const scored = pool.map((w) => ({ w, s: scoreWine(w, a) }));
  scored.sort((x, y) => y.s - x.s);
  const winner = scored[0].w;

  // ── Defensive runtime assertion ─────────────────────────────────────────
  // Guarantees no future edit can accidentally return an above-budget wine.
  // If this ever throws in production, we WANT to know — surface a loud
  // error via console instead of silently mis-advising a user.
  if (BUDGET_RANK[winner.price] > BUDGET_RANK[a.budget]) {
    // eslint-disable-next-line no-console
    console.error(
      `[quiz] BUDGET ASSERTION FAILED: user budget=${a.budget}, picked ${winner.variety} (${winner.price}). This should be impossible — check acceptableTiers / BUDGET_RANK.`
    );
    // Fall back to the highest-scoring in-budget wine we can find. If NONE
    // exists (impossible unless WINES is empty), return the cheapest wine.
    const safeInBudget = scored.filter((s) => BUDGET_RANK[s.w.price] <= BUDGET_RANK[a.budget]);
    if (safeInBudget.length > 0) return safeInBudget[0].w;
    const cheapest = [...WINES].sort((x, y) => BUDGET_RANK[x.price] - BUDGET_RANK[y.price])[0];
    return cheapest;
  }
  return winner;
}

// ─── Region detection + Honest trade-off layer ───────────────────────────
// Rationale: even inside a budget cap, the wine that BEST matches a user's
// palate might be regionally rare / heavily tariffed / seasonal. Instead of
// silently returning "second-best", we surface the honest trade-off:
//
//   "Your true match is X. But in your region it's <hard to find / above
//    budget after tariffs / seasonal>. So we're picking Y for you instead."
//
// This is what makes the quiz feel like a friend, not an algorithm.

/** Detect the user's region from browser locale. Falls back to OTHER.
 *  Safe on server (returns OTHER when window undefined). */
export function detectRegion(): Region {
  if (typeof navigator === "undefined") return "OTHER";
  const lang = (navigator.language || "").toUpperCase();
  const langs = (navigator.languages || []).map((l) => l.toUpperCase());
  const all = [lang, ...langs].join(" ");
  if (/\bEN-AU\b|-AU\b/.test(all)) return "AU";
  if (/\bEN-NZ\b|-NZ\b/.test(all)) return "NZ";
  if (/\bEN-GB\b|-GB\b|-UK\b/.test(all)) return "UK";
  if (/\bEN-US\b|-US\b/.test(all)) return "US";
  return "OTHER";
}

/** Fallback regional note used when a wine doesn't have an explicit entry
 *  for the user's region. Written honestly rather than overpromising. */
function fallbackRegionalNote(w: Wine, region: Region): RegionalNote {
  const regionLabel: Record<Region, string> = { AU: "Australia", NZ: "New Zealand", US: "the US", UK: "the UK", OTHER: "your region" };
  return {
    availability: "moderate",
    priceRange: `~${w.price === "under_25" ? "$25" : w.price === "25_50" ? "$25-50" : w.price === "50_100" ? "$50-100" : "$100+"} (local currency)`,
    advice: `Check specialist wine merchants or direct import in ${regionLabel[region]}. Local taxes/duties may push the shelf price above our estimate — worth checking a couple of shops before buying.`,
  };
}

/** Curated per-wine regional notes for the most-frequently-picked wines.
 *  Written honestly with real tariff/tax/availability context as of 2026.
 *  Keyed by wine slug. Wines not in this map get the generic fallback.
 *
 *  If any of this becomes stale (tariffs shift, retailers rebrand), update
 *  here — it's the single source of truth for buying advice. */
const REGIONAL_NOTES: Record<string, Partial<Record<Region, RegionalNote>>> = {
  "beaujolais-villages": {
    AU: { availability: "easy", priceRange: "$22-30", advice: "Widely available at Dan Murphy's, First Choice, Vintage Cellars. Louis Jadot and Georges Duboeuf are the reliable supermarket-tier bottlings. Serve slightly chilled (~15°C)." },
    NZ: { availability: "moderate", priceRange: "NZ$28-38", advice: "Glengarry and Fine Wine Delivery stock rotating Beaujolais. Not on every shelf but easy to order online. FTA with EU means no meaningful tariff — you're mostly paying freight + GST." },
    US: { availability: "easy", priceRange: "US$18-28", advice: "Duboeuf and Jadot are Total Wine / BevMo staples. Post-2025 EU tariff instability means keep an eye on shelf prices — some importers pass through, some absorb. Trader Joe's often has entry-level Beaujolais under $12." },
    UK: { availability: "easy", priceRange: "£12-18", advice: "Every major supermarket and Majestic stocks Beaujolais-Villages. Post-Brexit still-wine duty went up in 2023 (~£2.67/bottle now) which hit mid-tier hardest. Cru Beaujolais is the value sweet spot right now." },
  },
  "malbec-mendoza": {
    AU: { availability: "easy", priceRange: "$18-28", advice: "Argentina's Malbec is the value king in AU. Catena, Trapiche, Norton at Dan Murphy's; Susana Balbi and Zuccardi at Vintage Cellars. Argentina isn't in the FTA queue — freight + WET + 5% duty adds up but volumes keep prices competitive." },
    NZ: { availability: "moderate", priceRange: "NZ$22-32", advice: "Glengarry, Regional Wines stock a rotating range. NZ market is smaller — fewer Argentine imports than AU, but the top brands (Catena, Zuccardi) are usually findable online." },
    US: { availability: "easy", priceRange: "US$15-25", advice: "Malbec's booming in the US — every supermarket and Costco carries Catena / Trapiche / Alamos. No US-Argentina tariff friction. Best mid-tier value on shelves under $25." },
    UK: { availability: "easy", priceRange: "£12-20", advice: "Waitrose, Marks & Spencer, Majestic all stock quality Argentine Malbec. Post-2023 duty structure favours Malbec's typical 13-14% ABV — priced very competitively vs Bordeaux." },
  },
  "riesling-clare": {
    AU: { availability: "easy", priceRange: "$22-35", advice: "This is your backyard. Grosset, Pikes, Kilikanoon, Pewsey Vale all at Dan Murphy's / Prince Wine Store. Pewsey Vale Contours (5-year library release) is stupidly good value at ~$45. No import costs — you're basically buying at the source." },
    NZ: { availability: "moderate", priceRange: "NZ$28-40", advice: "AU Rieslings cross the Tasman freely (ANZCERTA — no tariff). Glengarry stocks the top names. NZ also makes brilliant Riesling of its own (Framingham, Felton Road) — worth considering too." },
    US: { availability: "hard", priceRange: "US$28-45", advice: "Rare in mainstream US stores — this is a specialist-order item. Grosset lands via Old Bridge Cellars distribution; try K&L, Chambers Street Wines, or direct-ship states via WineBid. German Rieslings are far easier to find." },
    UK: { availability: "moderate", priceRange: "£20-32", advice: "Australian Riesling exists but isn't front-of-shelf — try Wine Society, Berry Bros, or Handford. Post-2023 duty on dry <11.5% ABV is favourable, so pricing is reasonable when you find it. Otherwise consider Mosel or Rheingau Riesling — both easier here." },
  },
  "pinot-noir-mornington": {
    AU: { availability: "easy", priceRange: "$45-75", advice: "Ten Minutes by Tractor, Yabby Lake, Paringa, Kooyong all at Prince Wine Store, Vintage Cellars. Under $45 is a value hunt — Yarra Valley entry-tier (De Bortoli, Innocent Bystander) is your friend for that price point." },
    NZ: { availability: "easy", priceRange: "NZ$40-70", advice: "NZ's home turf for Pinot. Central Otago and Martinborough dominate. Felton Road, Rippon, Ata Rangi — every quality retailer stocks them. AU Pinots also freely traded — no tariff." },
    US: { availability: "moderate", priceRange: "US$55-95", advice: "Aus/NZ Pinot is available but pricey after freight. Domestic OR / CA Pinot (Adelsheim, Bethel Heights, Sea Smoke, Belle Glos) is often the better value play. Post-2025 EU tariff uncertainty has actually helped Aus/NZ imports look competitive." },
    UK: { availability: "moderate", priceRange: "£35-60", advice: "Berry Bros and Wine Society carry Australian and NZ Pinot. Burgundy is right there — for £35-60 you could also drink Village-level Burgundy which is a different (and arguably better) experience for the money. Depends what you're chasing." },
  },
  "montepulciano-abruzzo": {
    AU: { availability: "easy", priceRange: "$18-28", advice: "Masciarelli is the workhorse — under $20 at most bottle shops. Emidio Pepe (the natural-wine benchmark) available at Prince Wine Store, Blackhearts & Sparrows. Italy-AU trade is smooth — no meaningful tariff friction." },
    NZ: { availability: "moderate", priceRange: "NZ$22-32", advice: "Regional Wines, Glengarry stock the essentials. Italian imports slightly pricier in NZ vs AU due to smaller volumes, but still one of the best value-red categories." },
    US: { availability: "easy", priceRange: "US$14-22", advice: "Trader Joe's, Total Wine — everywhere. Masciarelli, Umani Ronchi, Cataldi Madonna are all common. 2019-2021 tariff on Italian wines was 25% — that's since ended, prices have normalised. Great $15 red." },
    UK: { availability: "easy", priceRange: "£10-18", advice: "Waitrose, M&S, Aldi all stock Montepulciano d'Abruzzo. Post-2023 duty hit mid-tier — but Montepulciano at 13% ABV is priced sensibly. Best sub-£15 red option going." },
  },
  "nebbiolo-barolo": {
    AU: { availability: "moderate", priceRange: "$95-180", advice: "Prince Wine Store, Dan Murphy's Premium, Randall's. Top houses (Giacosa, Vietti, Bartolo Mascarello) command Bordeaux-level pricing. Second-tier (Fontanafredda, Marchesi di Barolo) is more reachable. Look for Langhe Nebbiolo <$50 as an intro." },
    NZ: { availability: "hard", priceRange: "NZ$110-200", advice: "Specialist merchants only — Glengarry Fine Wine, Caro's. Smaller market means fewer top-tier producers on shelf; you may need to pre-order or wait for allocation." },
    US: { availability: "moderate", priceRange: "US$70-160", advice: "Post-2025 EU tariff instability threatens this category — buying window matters. K&L, Zachys, Wine.com. Italian tariff was 25% in 2019-2021 (now lifted). Watch news; buy on dips." },
    UK: { availability: "moderate", priceRange: "£55-140", advice: "Berry Bros, Justerini & Brooks, Handford Wines — deep Barolo lists. Post-Brexit tariffs on EU still wines are zero (FTA-adjacent), but 2023 duty reform pushed high-ABV Barolo (14-14.5%) up ~£1.50/bottle. Still fair value for what it is." },
  },
  "amarone": {
    AU: { availability: "moderate", priceRange: "$65-140", advice: "Amarone is expensive in AU — big producers (Masi, Zenato, Allegrini) around $70-90. Rarely under $50 unless it's a discount. If you're on a mid-budget and want Amarone-style, look for Valpolicella Ripasso — same style, half the price." },
    NZ: { availability: "hard", priceRange: "NZ$85-160", advice: "Speciality Italian merchants (Regional Wines) and top hotels. Not a supermarket item. Small market means limited allocation — consider Ripasso as the accessible cousin." },
    US: { availability: "moderate", priceRange: "US$50-120", advice: "Total Wine and Costco stock volume-brand Amarone (Zenato, Cesari). Post-2025 EU tariff situation is the big variable — Italian wines faced 25% tariffs in 2019-2021. Watch for tariff news before splurging." },
    UK: { availability: "moderate", priceRange: "£45-100", advice: "Wine Society, Majestic, most quality wine merchants. Post-2023 duty hit high-ABV wines hard — Amarone at 15-16% ABV now carries the maximum duty (£3.21/bottle). That's the biggest reason a £30 Amarone doesn't really exist here anymore." },
  },
  "sauternes": {
    AU: { availability: "moderate", priceRange: "$60-180", advice: "Half-bottles are common (375ml at $30-50). Château d'Yquem at $600+ is silly money; Château Guiraud and Château Rieussec are the accessible fine tier at $80-140. Prince Wine Store, Randall's. Watch the alcohol duty — 14% ABV plus sugar = fully-taxed." },
    NZ: { availability: "hard", priceRange: "NZ$80-220", advice: "Specialist only — sweet wine is a niche in NZ. Consider Framingham F-Series Riesling (lush late-harvest, NZ-made, half the price). Or Kracher Beerenauslese from Austria, easier to find." },
    US: { availability: "moderate", priceRange: "US$40-140", advice: "K&L, Wine.com, high-end grocery. Half-bottles are the entry — under $40 for a 375ml Guiraud. Post-2025 EU tariff uncertainty applies. Also consider Tokaji Aszú from Hungary as an alternative — often exempt from EU-wide tariffs." },
    UK: { availability: "easy", priceRange: "£25-80 (half-bottle) / £45-160 (full)", advice: "Berry Bros, Wine Society, most fine wine merchants. UK is the biggest historical Sauternes market outside France — best selection outside the EU itself." },
  },
  "port-vintage": {
    AU: { availability: "easy", priceRange: "$50-160", advice: "Dan Murphy's stocks Graham's, Taylor's, Warre's. Australia also makes exceptional 'Vintage Fortified' (formerly 'Vintage Port' before EU GI restrictions) — Seppeltsfield, Yalumba Museum, All Saints. Local versions are often better value and taste basically identical." },
    NZ: { availability: "moderate", priceRange: "NZ$60-180", advice: "Fortified wine is a small category in NZ. Glengarry stocks the major Portuguese houses. Consider AU 'Vintage Fortified' as a value alternative — freely traded across the Tasman." },
    US: { availability: "easy", priceRange: "US$40-140", advice: "Total Wine, K&L, wine.com. Portugal isn't affected by EU-wide tariff drama the same way France/Italy are — Port has been stable. 20-year Tawny is the reliable go-to at $50-70." },
    UK: { availability: "easy", priceRange: "£25-100", advice: "Berry Bros, Fortnum & Mason, Waitrose. UK has a 300-year love affair with Port — best-priced market outside Portugal itself. Post-2023 duty on fortified wine hit sub-£20 bracket the hardest; premium Port still fair value." },
  },
  "vermouth-torino": {
    AU: { availability: "moderate", priceRange: "$45-90", advice: "Specialty wine and spirits merchants — Vintage Cellars, Prince Wine Store, cocktail-focused liquor stores (Cellarmaster). Carpano Antica, Cocchi Storico, Punt e Mes are the essentials. Not a supermarket item in AU yet." },
    NZ: { availability: "hard", priceRange: "NZ$55-110", advice: "Cocktail bars and specialist merchants (Regional Wines). Vermouth is under-represented in NZ retail; you may need to order online. Cocchi Americano is worth the hunt for cocktails." },
    US: { availability: "easy", priceRange: "US$25-60", advice: "Booming cocktail culture means Total Wine, BevMo, Whole Foods all carry premium vermouth. Carpano Antica, Cocchi, Dolin, Punt e Mes — spoiled for choice. Under $30 for excellent quality." },
    UK: { availability: "moderate", priceRange: "£20-45", advice: "The Whisky Exchange, Master of Malt, Fortnum & Mason. Not on every supermarket shelf but well-stocked online. Post-2023 spirits duty is more punishing than wine duty — vermouth sits in a favourable bracket." },
  },
  "cabernet-coonawarra": {
    AU: { availability: "easy", priceRange: "$28-95", advice: "Coonawarra Cab is quintessentially Australian — every bottle shop stocks Wynns, Katnook, Balnaves. Wynns Black Label ($30-40) is the value gold standard. Coonawarra region has a fanatical following in AU." },
    NZ: { availability: "easy", priceRange: "NZ$32-110", advice: "Kiwi retailers love AU Cabernet — Glengarry, Fine Wine Delivery, Regional Wines carry the top Coonawarra names. Trans-Tasman trade is friction-free." },
    US: { availability: "moderate", priceRange: "US$25-90", advice: "Old Bridge Cellars imports Wynns and Balnaves. Available at K&L, better wine shops. Napa Cab is your obvious competitor at the same price point — different style, similar bracket." },
    UK: { availability: "moderate", priceRange: "£22-70", advice: "Wine Society, Berry Bros, Majestic (larger stores). Coonawarra is niche in the UK — you'll find one or two producers rather than the full range. Bordeaux at this price is the alternative." },
  },
  "syrah-northern-rhone": {
    AU: { availability: "hard", priceRange: "$90-250", advice: "Northern Rhône Syrah is niche in AU — Prince Wine Store, City Wine Shop, specialty merchants. Consider Aussie Shiraz alternatives: Barossa Old Vine (Rockford, Torbreck), or cool-climate Aussie Shiraz (Yering Station, Craiglee) for similar profile at half the price." },
    NZ: { availability: "hard", priceRange: "NZ$110-300", advice: "Fine-wine merchants only. NZ also makes stellar Syrah — Trinity Hill, Man O' War, Bilancia — worth considering as a locally-produced alternative that's easier to source." },
    US: { availability: "moderate", priceRange: "US$65-220", advice: "K&L, Zachys, Chambers Street. Post-2025 EU tariff instability — Northern Rhône was hit by the 2019-2021 25% tariff and could be again. Buy on dips. Washington State Syrah (Cayuse, K Vintners) is the domestic parallel." },
    UK: { availability: "moderate", priceRange: "£55-180", advice: "Berry Bros, Wine Society, Justerini & Brooks. UK loves the Rhône — deeper selection than most anywhere outside France. Post-2023 duty on ~13% ABV Syrah is manageable." },
  },
  "grillo-sicily": {
    AU: { availability: "moderate", priceRange: "$22-38", advice: "Sicilian whites are growing in AU — Dan Murphy's Premium, Prince Wine Store. Planeta, Tasca d'Almerita are the reliable names. Under $30 you're getting Sicilian sunshine in a bottle." },
    NZ: { availability: "moderate", priceRange: "NZ$28-42", advice: "Glengarry, Regional Wines carry the main Sicilian producers. Fewer options than AU but the top brands are available." },
    US: { availability: "easy", priceRange: "US$16-28", advice: "Trader Joe's, Total Wine, most Italian-focused retailers. Sicily has been growing in US shelf space. Planeta and Donnafugata are the volume options." },
    UK: { availability: "easy", priceRange: "£12-22", advice: "Waitrose, M&S, Sainsbury's Taste the Difference. Sicilian whites are trending — best value alternative to Sauvignon Blanc at similar price points." },
  },
  "chenin-blanc-loire": {
    AU: { availability: "moderate", priceRange: "$32-70", advice: "Loire wines are specialist territory in AU — Prince Wine Store, Blackhearts & Sparrows. Domaine Huët, Vincent Carême are the top names. Off-dry (demi-sec) is the sweet spot — pairs with anything spicy." },
    NZ: { availability: "moderate", priceRange: "NZ$38-80", advice: "Glengarry, Caro's for the top houses. NZ also grows Chenin (small quantities — Millton Vineyards is worth seeking) as a local alternative." },
    US: { availability: "moderate", priceRange: "US$25-55", advice: "K&L, Chambers Street, Astor Wines have deep Loire selections. South African Chenin (Ken Forrester, Mullineux) is the underrated alternative — half the price, comparable quality." },
    UK: { availability: "easy", priceRange: "£18-40", advice: "Wine Society, Waitrose, Berry Bros — Loire is well-served in UK retail. Post-Brexit tariff on EU wine is nil; Chenin at 12-13% ABV benefits from the 2023 duty structure." },
  },
};

/** Return the regional note for a wine + region, using fallback if needed. */
export function regionalNoteFor(w: Wine, region: Region): RegionalNote {
  return REGIONAL_NOTES[w.slug]?.[region]
    || w.regional?.[region]
    || fallbackRegionalNote(w, region);
}

/** The full quiz result — winner AND honest trade-off narration. */
export type QuizResult = {
  winner: Wine;
  /** The palate-only best match, ignoring budget. If different from winner,
   *  we're constraining below the user's dream wine — narrate honestly. */
  trueMatch: Wine;
  /** True when budget forced us to pick something other than trueMatch. */
  budgetConstrained: boolean;
  /** True when trueMatch has "hard" or "rare" availability in this region. */
  regionallyRare: boolean;
  region: Region;
  regionalNote: RegionalNote;
  /** Rich's one-paragraph honest narration when constrained. Empty when the
   *  winner IS the true match — no need to over-narrate. */
  honestFraming: string;
};

/** Enhanced pick that returns the full honest picture. Use this in the
 *  Quiz UI. Backwards-compatible with pickWine — just call .winner. */
export function pickWineWithHonesty(a: QuizAnswers, region?: Region): QuizResult {
  const r = region ?? detectRegion();
  const winner = pickWine(a);

  // Find the palate-only best (ignore budget). This is the "true match".
  const allScores = WINES.map((w) => ({ w, s: scoreWine(w, a) }));
  allScores.sort((x, y) => y.s - x.s);
  const trueMatch = allScores[0].w;

  const budgetConstrained =
    BUDGET_RANK[trueMatch.price] > BUDGET_RANK[a.budget] && trueMatch.slug !== winner.slug;

  const trueMatchNote = regionalNoteFor(trueMatch, r);
  const regionallyRare = trueMatchNote.availability === "hard" || trueMatchNote.availability === "rare";
  const regionalNote = regionalNoteFor(winner, r);

  let honestFraming = "";
  if (budgetConstrained || (regionallyRare && trueMatch.slug !== winner.slug)) {
    const priceGap = BUDGET_RANK[trueMatch.price] - BUDGET_RANK[a.budget];
    const budgetLabel: Record<Budget, string> = {
      under_25: "under $25", "25_50": "$25-50", "50_100": "$50-100", "100_plus": "$100+",
    };
    const parts: string[] = [];
    parts.push(`Your true palate match is **${trueMatch.variety}** from ${trueMatch.region}.`);
    if (priceGap > 0) {
      parts.push(`But it sits at ${budgetLabel[trueMatch.price]} — above your ${budgetLabel[a.budget]} budget.`);
    }
    if (regionallyRare) {
      parts.push(trueMatchNote.advice);
    }
    parts.push(`So we're picking **${winner.variety}** for you instead — hits most of your marks at your budget.`);
    honestFraming = parts.join(" ");
  }

  return { winner, trueMatch, budgetConstrained, regionallyRare, region: r, regionalNote, honestFraming };
}

