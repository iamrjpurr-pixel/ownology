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
    palate: { fruit: "citrus", body: "light", sweetness: "bone_dry", grip: "bright", age: "developed" },
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
    palate: { fruit: "citrus", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
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
    palate: { fruit: "citrus", body: "medium", sweetness: "bone_dry", grip: "bright", age: "developed" },
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
// Each axis has a small score contribution. Best-fit wine wins.
const AXIS_WEIGHTS = { fruit: 3, body: 2, sweetness: 3, grip: 2, age: 2, budget: 5 };

export function scoreWine(w: Wine, a: QuizAnswers): number {
  let score = 0;
  if (w.palate.fruit === a.fruit) score += AXIS_WEIGHTS.fruit;
  if (w.palate.body === a.body) score += AXIS_WEIGHTS.body;
  if (w.palate.sweetness === a.sweetness) score += AXIS_WEIGHTS.sweetness;
  if (w.palate.grip === a.grip) score += AXIS_WEIGHTS.grip;
  if (w.palate.age === a.age) score += AXIS_WEIGHTS.age;
  if (w.price === a.budget) score += AXIS_WEIGHTS.budget;
  return score;
}

export function pickWine(a: QuizAnswers): Wine {
  const scored = WINES.map((w) => ({ w, s: scoreWine(w, a) }));
  scored.sort((x, y) => y.s - x.s);
  return scored[0].w;
}
