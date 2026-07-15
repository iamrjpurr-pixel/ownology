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
/** Hard filter that runs BEFORE palate scoring — eliminates Red/White
 *  crossovers (the #1 quiz-result WTF). Set on Q1. Curveball wines
 *  (rosé, sparkling, dessert, fortified, vermouth) are excluded from
 *  both main pools and only surface via the "wildcards" reveal on the
 *  result page. */
export type WineType = "red" | "white" | "curveball";

export type QuizAnswers = {
  wineType: "red" | "white"; // Q1 — hard filter, no curveball choice at Q1
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
  /** Hard-filter category from Q1. Curveballs (rosé, sparkling, dessert,
   *  fortified, vermouth) are excluded from the main red/white pool and
   *  only surface via the "wildcards" reveal on the result page. */
  wineType: WineType;
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
    wineType: "white",
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
    wineType: "white",
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
    wineType: "white",
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
    wineType: "white",
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
    wineType: "white",
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
    wineType: "red",
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
    wineType: "red",
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
    wineType: "red",
    region: "McLaren Vale",
    country: "Australia",
    ageWindow: "3–8 years",
    price: "25_50",
    richsPick: "Old-bush-vine Grenache is doing the same thing here that Pinot did 20 years ago — quietly getting brilliant. Perfumed, spicy, tart red fruit, low-alcohol restraint. Gel says the tannin curve looks nothing like Shiraz. I say it drinks like it should cost twice as much.",
    gelsNote: "Whole-bunch, ambient yeast, moderate extraction — 13.5–14% ABV is now the norm.",
    producers: ["Yangarra Old Vine", "SC Pannell", "Aphelion"],
    alsoTry: ["Southern Rhône Grenache", "Priorat"],
    // Feb 2026 Wave E — palate signature was colliding with Pinot Noir
    // Mornington on red/medium/bone_dry/bright/developed. Grenache's
    // tannin is genuinely softer than Pinot's (whole-bunch stems give
    // grip texture, not mid-palate tightness), so nudged grip to "soft"
    // to disambiguate scoring without misrepresenting the variety.
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "soft", age: "developed" },
  },
  {
    slug: "nebbiolo-barolo",
    variety: "Nebbiolo (Barolo)",
    wineType: "red",
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
    wineType: "red",
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
    wineType: "red",
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
    wineType: "red",
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
    wineType: "red",
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
    wineType: "red",
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
    wineType: "curveball",
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
    wineType: "curveball",
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
    wineType: "curveball",
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
    wineType: "white",
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
    wineType: "white",
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
    // Feb 2026 — Australian Gewürz added so the home-market swap picks a
    // like-for-like variety instead of jumping to Riesling. Riesling shares
    // "aromatic white" tag with Gewürz but LACKS the cis-rose-oxide marker
    // (the lychee/rose signature). Palate tags mirror the Alsace entry
    // exactly so scoring is identical — the AU/NZ home-market bonus in
    // pickWine() then breaks the tie in this variety's favour.
    //
    // Producers verified (Feb 2026): Delatite in Mansfield VIC has been
    // making the Aus benchmark since the '70s; Pizzini in King Valley
    // does an aromatic style; Bream Creek + Frogmore in Tas run cool-
    // climate versions with elevated rose-oxide expression.
    slug: "gewurztraminer-au-alpine",
    variety: "Gewürztraminer",
    wineType: "white",
    region: "Alpine Valleys / King Valley / Tasmania",
    country: "Australia",
    ageWindow: "1–5 years",
    price: "under_25",
    richsPick: "The Aus Gewürz nobody talks about. Delatite has made the definitive bottling since the '70s — Mansfield alpine site, cool nights preserving the rose oxide. Pizzini does a King Valley style, Bream Creek runs the Tassie cool-climate version. Half the price of Alsace, better cellar temp between here and your bottle-o, no freight-and-tariff surcharge.",
    gelsNote: "Same cis-rose-oxide + terpene profile as Alsace when cool-fermented (14-16°C). Naturally low acid — many producers block MLF to keep the aromatic lift; AWRI aromatic-white protocols apply directly.",
    producers: ["Delatite (VIC alpine)", "Pizzini (King Valley)", "Bream Creek (Tas)", "Ashton Hills (Adelaide Hills)", "Frogmore Creek (Tas)"],
    alsoTry: ["Pinot Gris (Mornington / Tas)", "Viognier (Adelaide Hills / Yarra)"],
    palate: { fruit: "citrus", body: "full", sweetness: "off_dry", grip: "soft", age: "developed" },
  },
  {
    slug: "port-vintage",
    variety: "Port (Vintage)",
    wineType: "curveball",
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
    wineType: "curveball",
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
    wineType: "red",
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
    wineType: "curveball",
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
    wineType: "red",
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
    wineType: "red",
    region: "Beaujolais",
    country: "France",
    ageWindow: "1–3 years",
    price: "under_25",
    richsPick: "The Tuesday-night red for people who don't want a heavy wine. Bright red cherry, a whisper of earth, almost weightless tannin. Serve slightly chilled — a proper 15°C, not fridge-cold — and it drinks like something twice the price. Perfect with roast chicken or a cheese board.",
    gelsNote: "Semi-carbonic maceration preserves fresh primary fruit; low alcohol, low extract, high drinkability.",
    producers: ["Georges Duboeuf", "Louis Jadot", "Domaine Dupeuble"],
    alsoTry: ["Cru Beaujolais (Fleurie)", "Loire Pinot Noir"],
    // Feb 2026 Wave E — was colliding with Yarra entry Pinot on light/soft/young.
    // Nouveau-adjacent Villages carries brighter primary fruit than the more
    // textural Cru Beaujolais tier, so "bright" better represents the style.
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
  },
  {
    slug: "pinot-noir-yarra-entry",
    variety: "Pinot Noir (entry-level)",
    wineType: "red",
    region: "Yarra Valley or Tasmania",
    country: "Australia",
    ageWindow: "1–3 years",
    price: "under_25",
    richsPick: "Under $25 Aussie Pinot used to be a gamble — thin, herbal, disappointing. That's changed. Second-label bottlings from serious cool-climate producers now deliver bright red cherry, faint sous-bois, gentle grip. Not a Grand Cru moment, but honest Pinot for a Wednesday. Serve cool.",
    gelsNote: "Entry-tier fruit off cool-climate vineyards; minimal oak, short maceration, drink young.",
    producers: ["De Bortoli Villages", "Delatite", "Josef Chromy"],
    alsoTry: ["Mornington entry Pinot", "Central Otago Pinot second labels"],
    // Feb 2026 Wave E — was colliding with Beaujolais-Villages on
    // red/light/bone_dry/soft/young. Villages is now bumped to "bright"
    // (more accurate for primary-fruit Nouveau-adjacent style); Yarra
    // entry Pinot stays "soft" as the more textural cool-climate red.
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "soft", age: "young" },
  },
  {
    slug: "burgundy-old-white",
    variety: "Chardonnay (Meursault or Puligny-Montrachet)",
    wineType: "white",
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

  // ── Feb 2026 Wave A · Australian same-variety twins ─────────────────────
  // Added so the AU/NZ home-market swap can prefer a same-grape local wine
  // over drifting to an unrelated variety. Each entry mirrors the Old-World
  // palate signature of its twin so twin-search + score-tolerance in
  // pickWineWithHonesty picks it cleanly. Producers verified Feb 2026.

  {
    slug: "nebbiolo-au-alpine",
    variety: "Nebbiolo",
    wineType: "red",
    region: "King Valley / Alpine Victoria",
    country: "Australia",
    ageWindow: "5–12 years",
    price: "25_50",
    richsPick: "Pizzini in the King Valley started planting Nebbiolo in the '80s and now makes the definitive Aus expression. Rose petal, tar, dried cherry — the same aromatic playbook as Barolo, at half the price and 5 years earlier drinkability. Luke Lambert (Yarra) and Vinea Marson do more Piedmont-faithful versions. This is the sleeper wine of Aus varietals.",
    gelsNote: "Aus Nebbiolo carries high natural tannin like Piedmont — extended maceration + old oak, drink cellared 5+ years for tannin polymerisation.",
    producers: ["Pizzini (King Valley)", "Luke Lambert (Yarra)", "Vinea Marson (Heathcote)", "Sam Miranda (King Valley)"],
    alsoTry: ["Langhe Nebbiolo (Piedmont entry)", "Aged Sangiovese"],
    palate: { fruit: "savoury", body: "full", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },

  {
    slug: "sangiovese-au",
    variety: "Sangiovese",
    wineType: "red",
    region: "McLaren Vale / Heathcote / King Valley",
    country: "Australia",
    ageWindow: "3–8 years",
    price: "25_50",
    richsPick: "Sangio has quietly become one of Australia's most exciting Italian varieties. Coriole in McLaren Vale, Chalmers in Heathcote, Pizzini in the King Valley — all making bright, dusty, sour-cherry Aus interpretations that drink like Chianti at Chianti Classico prices. Better with tomato-based food than a lot of the Aus reds you're used to.",
    gelsNote: "Sangio's high natural acidity survives the warmer Aus climate when picked early — 13-13.5% ABV target keeps the sour-cherry line intact.",
    producers: ["Coriole (McLaren Vale)", "Chalmers (Heathcote)", "Pizzini (King Valley)", "Vinea Marson"],
    alsoTry: ["Aged Chianti Classico", "Montepulciano d'Abruzzo"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "grippy", age: "developed" },
  },

  {
    slug: "malbec-au-rutherglen",
    variety: "Malbec",
    wineType: "red",
    region: "Rutherglen / Wrattonbully",
    country: "Australia",
    ageWindow: "3–8 years",
    price: "under_25",
    richsPick: "Rutherglen's warm continental climate is essentially Mendoza with different soils. Campbells and Buller have made Malbec since the '60s — plush black plum, violet, forgiving tannin, but with more savoury complexity than most Argentine bottlings. All Saints does a serious single-vineyard version worth the splurge. Value's better than Mendoza once you factor in freight.",
    gelsNote: "Rutherglen's diurnal range preserves acidity in a warm-climate Malbec — no need for altitude when the nights drop enough.",
    producers: ["Campbells (Rutherglen)", "All Saints Estate", "Buller Wines", "Anthony Munro (Wrattonbully)"],
    alsoTry: ["Cahors (French Malbec)", "Petit Verdot from Langhorne Creek"],
    palate: { fruit: "dark", body: "full", sweetness: "bone_dry", grip: "soft", age: "young" },
  },

  {
    slug: "sparkling-tasmanian-vintage",
    variety: "Vintage Sparkling (Chardonnay-Pinot Noir)",
    wineType: "curveball",
    region: "Tasmania",
    country: "Australia",
    ageWindow: "6–15 years",
    price: "50_100",
    richsPick: "Tasmania is now producing the closest thing to vintage Champagne outside Champagne itself — House of Arras EJ Carr sits alongside Bollinger and Krug in blind tastings and holds its own. Cool-climate Chardonnay-Pinot base, extended lees ageing (5-10+ years), the whole traditional method playbook. At $80-140, better value than any equivalent French bottling landing here after freight.",
    gelsNote: "Traditional method, tirage 5-10+ years, autolytic mannoprotein release drives the brioche/toast character — same chemistry as Champagne.",
    producers: ["House of Arras (Bay of Fires)", "Jansz Tasmania", "Deviation Road (Adelaide Hills)", "Clover Hill (Tas)"],
    alsoTry: ["Vintage Champagne", "Franciacorta Riserva"],
    palate: { fruit: "citrus", body: "medium", sweetness: "hint", grip: "bright", age: "old" },
  },

  {
    slug: "vintage-fortified-au",
    variety: "Vintage Fortified (Shiraz / Grenache)",
    wineType: "curveball",
    region: "Barossa / Rutherglen",
    country: "Australia",
    ageWindow: "15–40 years",
    price: "50_100",
    richsPick: "Australia used to legally call these 'Vintage Port' before the EU GI rules changed that in 2010. What we now call 'Vintage Fortified' from Seppeltsfield or All Saints is chemically and stylistically indistinguishable from Douro Vintage Port — blackberry, chocolate, cedar, 20% ABV. Half the price of Portuguese, and Seppeltsfield's 100-year Para tawny library is a national treasure.",
    gelsNote: "Grape brandy arrest at ~8-10°Brix, RS 100+ g/L, 20% ABV — same fortification chemistry as Douro Port. Aged in seasoned oak for 15+ years for premium bottlings.",
    producers: ["Seppeltsfield Vintage Fortified", "All Saints Estate", "Chambers Rosewood", "Yalumba Museum Reserve"],
    alsoTry: ["Rutherglen Muscat (sweeter)", "Rare Tawny (aged)"],
    palate: { fruit: "dark", body: "full", sweetness: "sweet", grip: "grippy", age: "old" },
  },

  // ── Feb 2026 Wave B · Remaining AU/NZ same-variety twins ────────────────
  // Round two of the Wave A pattern — closes the last 8 Old-World entries
  // that would swap to unrelated varieties under home-market bias.

  {
    slug: "chenin-blanc-au",
    variety: "Chenin Blanc",
    wineType: "white",
    region: "Margaret River / Canberra District",
    country: "Australia",
    ageWindow: "2–8 years",
    price: "25_50",
    richsPick: "Aus Chenin is one of the great sleeper categories — nobody sees it coming. Nick O'Leary in Canberra makes a bone-dry, textural, Vouvray-adjacent bottling under $30. McHenry Hohnen's Rocky Road down in Margaret River goes off-dry with real weight. L.A.S. Vino does a natural-wine-adjacent skin-contact version if you want to nerd out.",
    gelsNote: "Chenin's high natural TA (7-9 g/L) transposes to warm-Aus climates when picked cool — retain acidity by early morning fruit intake and short skin contact.",
    producers: ["Nick O'Leary (Canberra)", "McHenry Hohnen (Margaret River)", "L.A.S. Vino (Margaret River)", "Coriole (McLaren Vale)"],
    alsoTry: ["Vouvray (Loire off-dry)", "South African Chenin (Ken Forrester)"],
    palate: { fruit: "citrus", body: "medium", sweetness: "off_dry", grip: "bright", age: "developed" },
  },

  {
    slug: "gamay-au-beechworth",
    variety: "Gamay",
    wineType: "red",
    region: "Beechworth / Yarra Valley / Tasmania",
    country: "Australia",
    ageWindow: "2–5 years",
    price: "25_50",
    richsPick: "Sorrenberg in Beechworth has quietly made Australia's best Gamay for 30 years — semi-carbonic, bright cherry, feather tannin, a genuine Beaujolais-Villages replica at $45 with none of the freight surcharge. Bass Phillip and Sailor Seeks Horse (Tas) are the newer cool-climate expressions. Serve slightly chilled and prepare for compliments.",
    gelsNote: "Semi-carbonic maceration preserves primary fruit + drops harsh tannin; Aus cool-climate Gamay tracks the Beaujolais phenolic curve almost exactly.",
    producers: ["Sorrenberg (Beechworth)", "Bass Phillip (Gippsland)", "Sailor Seeks Horse (Tas)", "Chapel Hill (McLaren Vale)"],
    alsoTry: ["Cru Beaujolais (Fleurie)", "Yarra entry Pinot Noir"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "soft", age: "young" },
  },

  {
    slug: "prosecco-king-valley",
    variety: "Prosecco (Glera)",
    wineType: "curveball",
    region: "King Valley",
    country: "Australia",
    ageWindow: "1–2 years",
    price: "under_25",
    richsPick: "The King Valley Italian-Australian community started planting Glera in the '90s and now makes some of the best Prosecco outside Italy. Dal Zotto and Chrismont's bottlings sit at $22-28 — pear, green apple, chalk, fine mousse. Better than most Valdobbiadene bottlings that land in Aus after freight and duty.",
    gelsNote: "Charmat/Martinotti method — pressure-tank secondary fermentation preserves primary fruit. Aus Glera clone is directly descended from Veneto vines.",
    producers: ["Dal Zotto (King Valley)", "Chrismont", "Pizzini", "Brown Brothers"],
    alsoTry: ["Valdobbiadene DOCG Prosecco", "Tasmanian Vintage Sparkling"],
    palate: { fruit: "citrus", body: "light", sweetness: "hint", grip: "bright", age: "young" },
  },

  {
    slug: "noble-one-au",
    variety: "Sémillon (Botrytis)",
    wineType: "curveball",
    region: "Riverina",
    country: "Australia",
    ageWindow: "8–20 years",
    price: "50_100",
    richsPick: "De Bortoli Noble One is Australia's answer to Sauternes and it's not close — this is one of the world's great botrytised wines full stop. Honey, apricot, saffron, marmalade, all the noble-rot magic at half the price of Château d'Yquem. Brown Brothers Patricia is the entry-level version. Buy a half-bottle, save it for a serious dessert.",
    gelsNote: "Botrytis cinerea concentration in Riverina's morning fog / afternoon sun cycle mimics the Sauternes botrytis pattern. RS 150-200 g/L, 10-11% ABV.",
    producers: ["De Bortoli Noble One", "Brown Brothers Patricia", "Yalumba FSE Botrytis", "Peter Lehmann Botrytis"],
    alsoTry: ["Sauternes (Bordeaux)", "Tokaji Aszú (Hungary)"],
    palate: { fruit: "citrus", body: "full", sweetness: "sweet", grip: "soft", age: "old" },
  },

  {
    slug: "rose-au-dry",
    variety: "Grenache Rosé (dry)",
    wineType: "curveball",
    region: "Barossa / McLaren Vale / Adelaide Hills",
    country: "Australia",
    ageWindow: "Current vintage only",
    price: "25_50",
    richsPick: "Charles Melton 'Rose of Virginia' has been Aus's benchmark dry Rosé since the 90s — pale, savoury, dry, watermelon and rose petal. Turkey Flat Rosé and Bekkers are the natural progression. Provence-style dry Rosé grown here for half the freight — drink very cold, drink young, no need to import.",
    gelsNote: "Direct-press or short 4-8 hour maceration; minimal skin phenolic extraction gives the pale colour + dry finish.",
    producers: ["Charles Melton Rose of Virginia (Barossa)", "Turkey Flat", "Bekkers (McLaren Vale)", "The Pawn Wine Co (Adelaide Hills)"],
    alsoTry: ["Provence Rosé", "Tavel (heavier French style)"],
    palate: { fruit: "red", body: "light", sweetness: "bone_dry", grip: "bright", age: "young" },
  },

  {
    slug: "assyrtiko-au-clare",
    variety: "Assyrtiko",
    wineType: "white",
    region: "Clare Valley",
    country: "Australia",
    ageWindow: "2–5 years",
    price: "25_50",
    richsPick: "Jim Barry planted Assyrtiko in the Clare Valley in 2006 — the first commercial planting outside Greece. The 'Clare Valley Assyrtiko' at ~$35 is the closest thing you'll get to a Santorini bottle without booking a flight. Lemon, chalk, sea-salt minerality, laser acid. Nobody at your dinner will have tried it. Bring it to a Clare tasting and watch people re-think what the region can do.",
    gelsNote: "Aus Assyrtiko retains the varietal's TA 8+ g/L profile in warm-continental Clare — early morning picking + reductive winemaking preserves the marine mineral character.",
    producers: ["Jim Barry Assyrtiko (Clare Valley)"],
    alsoTry: ["Santorini Assyrtiko (Greek)", "Albariño (Rías Baixas)"],
    palate: { fruit: "citrus", body: "medium", sweetness: "bone_dry", grip: "bright", age: "developed" },
  },

  {
    slug: "montepulciano-au",
    variety: "Montepulciano",
    wineType: "red",
    region: "Heathcote / McLaren Vale",
    country: "Australia",
    ageWindow: "2–5 years",
    price: "under_25",
    richsPick: "Chalmers in Heathcote is doing more for Italian varieties in Australia than any other family — their Montepulciano at $22 outperforms most $20 Chianti landing here. Coriole runs a McLaren Vale version. Dark cherry, gentle grip, honest table red. Drink with pasta, don't overthink.",
    gelsNote: "Aus Montepulciano tracks the Abruzzo phenolic curve — medium extraction, ambient MLF softens the palate quickly.",
    producers: ["Chalmers (Heathcote)", "Coriole (McLaren Vale)", "Vinea Marson", "S.C. Pannell"],
    alsoTry: ["Montepulciano d'Abruzzo (Italy)", "Nero d'Avola"],
    palate: { fruit: "red", body: "medium", sweetness: "bone_dry", grip: "soft", age: "young" },
  },

  {
    slug: "vermouth-au",
    variety: "Vermouth (Australian)",
    wineType: "curveball",
    region: "Adelaide Hills / Yarra Valley",
    country: "Australia",
    ageWindow: "Non-vintage, drink fresh",
    price: "25_50",
    richsPick: "Regal Rogue (Adelaide Hills) and Maidenii (Yarra Valley) are making Aus native-botanical vermouths that beat Italian imports on both quality and price. Wormwood + native lemon myrtle / strawberry gum / wattle seed instead of alpine botanicals — a genuinely different + genuinely Australian aromatic profile. Serve over ice with a twist. Buy Aussie.",
    gelsNote: "Aromatised fortified wine — Aus versions typically use Verdelho or Riesling base + native botanical maceration instead of Piedmont wormwood alone.",
    producers: ["Regal Rogue (Adelaide Hills)", "Maidenii (Yarra Valley)", "Poor Toms", "Adelaide Hills Distillery Native"],
    alsoTry: ["Vermouth di Torino", "Punt e Mes"],
    palate: { fruit: "savoury", body: "medium", sweetness: "off_dry", grip: "soft", age: "young" },
    specialty: true,
  },

  // Feb 2026 — experimental Amarone-adjacent AU entry. Amarone-style
  // partial-appassimento is now practised by a small circle of Barossa
  // producers (Mitolo Serpico is the pioneer; Peter Lehmann has run trial
  // desiccated-Shiraz lots since 2019). Chemistry parallels Valpolicella:
  // grape drying → sugar concentration → 15-16% ABV → long extended
  // maceration → aged in Slavonian or French oak. Not a 1:1 palate match
  // (Grenache/Shiraz vs Corvina/Rondinella) but drinks in the same
  // "big-savoury-warming-slightly-raisiny" territory Amarone lovers
  // recognise. Deliberately flagged specialty so the quiz surfaces it
  // as a curiosity, not a mainstream pick.
  {
    slug: "amarone-style-au",
    variety: "Shiraz / Grenache (Amarone-style, partial appassimento)",
    wineType: "red",
    region: "Barossa Valley",
    country: "Australia",
    ageWindow: "5–12 years",
    price: "50_100",
    richsPick: "Amarone in Aus is a small experimental scene led by Mitolo's Serpico — Shiraz picked ripe, then partially dried on racks for 30-60 days before fermentation. The result: raisined dark fruit, chocolate, warm spice, 15-16% ABV, oak-aged 2+ years. Not identical to Corvina-based Amarone (different variety spine) but drinks in the same territory at ~$70 vs $140+ for classical Valpolicella. Peter Lehmann and Alkoomi have run smaller-batch versions. Buy on release, cellar 5 years.",
    gelsNote: "Partial-appassimento Barossa Shiraz — grape drying concentrates sugar to ~26-28°Brix pre-ferment, producing 15-16% ABV with residual sweetness balanced by extended maceration tannin. Chemistry parallels Corvina appassimento but with varietal-driven differences in the phenolic profile.",
    producers: ["Mitolo Serpico (Barossa)", "Peter Lehmann Wigan", "Alkoomi Late Harvest", "Pikes Beloved (Clare)"],
    alsoTry: ["Amarone della Valpolicella (Italy)", "Barossa Old Vine Shiraz"],
    // Mirror Corvina Amarone palate exactly so the twin-search fires:
    // dark | full | hint | grippy | old. Real Aus Amarone-style wines
    // are drinking-mature by 5-8 years; setting age=old matches the
    // Valpolicella entry's positioning even if Aus bottlings peak sooner.
    palate: { fruit: "dark", body: "full", sweetness: "hint", grip: "grippy", age: "old" },
    // No specialty flag — Mitolo Serpico has been in commercial production
    // since 2007, this is an established category not an experiment.
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

// Home-market bonus — nudges the winner toward wines the user can actually
// buy at Dan Murphy's / First Choice (AU) or Glengarry / New World (NZ)
// when browsing from Australia or New Zealand. Sized deliberately:
//   +6 = beats one full non-fruit axis mismatch (body 3, grip 3, age 2)
//        AND edges past the cross-family penalty (6), so an AU/NZ wine
//        with a *slightly* off fruit family still won't outrank a
//        genuine Old-World palate match. Fruit (12) still dominates —
//        which preserves Red/White integrity and prevents a Sicilian
//        white winning for someone who asked for a Barossa Shiraz style.
// This runs in `scoreWine` for the RETURNED WINNER only. The "true palate
// match" narration inside pickWineWithHonesty explicitly recomputes WITHOUT
// the bonus, so we can still tell the user honestly: "Your true match is
// Chablis — but here's an Adelaide Hills Chard you can actually get for
// half the freight." That honest framing is the whole point of the layer.
const HOME_MARKET_BONUS = 6;

/** Extract a normalised variety root for cross-region matching. Handles
 *  parenthesised region qualifiers (e.g. "Gamay (Cru Beaujolais)" → "gamay")
 *  and Aus's Shiraz vs Old World's Syrah synonym. Also aliases stylistic
 *  category names (Champagne/Vintage Sparkling, Port/Vintage Fortified,
 *  Sauternes/Botrytis, Glera/Prosecco) so the twin-search picks up
 *  fortified/sparkling/dessert-style AU alternatives to Old-World bottlings.
 *  Used by the same-variety home-market preference in pickWineWithHonesty
 *  (Wave C, Feb 2026). */
function varietyRoot(variety: string): string {
  const head = variety
    .toLowerCase()
    .replace(/\s*\([^)]*\)/g, "")
    .replace(/\s*-\s*/g, "-")
    .trim()
    .split(/[\s/,]/)
    .filter(Boolean)[0] || variety.toLowerCase();
  // Shiraz and Syrah are the same grape — one variety string in the AU
  // catalogue, another in the Rhône. Fold both to a single key so the
  // twin-search can cross-match.
  if (head === "syrah" || head === "shiraz") return "syrah";
  // Stylistic aliases — bottled as different variety strings but the
  // same drinking category, so a home-market twin lookup should cross
  // them. AU makes credible parallels for each.
  if (head === "champagne" || head === "vintage") return "champagne-family";
  if (head === "port") return "vintage-fortified-family";
  if (head === "sémillon-sauvignon" || head === "sémillon") return "botrytis-family";
  if (head === "glera" || head === "prosecco") return "prosecco-family";
  // Grenache-based dry rosé — Provence's "Grenache-Cinsault Rosé" and AU's
  // "Grenache Rosé (dry)" are the same drinking category. Both surface here.
  if (variety.toLowerCase().includes("rosé") || variety.toLowerCase().includes("rose")) return "dry-rosé-family";
  // Amarone-style — Feb 2026 experimental cross-match. Corvina blend
  // Valpolicella and Barossa Shiraz partial-appassimento are palate cousins.
  if (variety.toLowerCase().includes("amarone") || variety.toLowerCase().includes("appassimento")) return "amarone-family";
  return head;
}
const AUSTRALASIAN_COUNTRIES: ReadonlySet<string> = new Set(["Australia", "New Zealand"]);
function homeMarketBonus(w: Wine, region?: Region): number {
  if (!region) return 0;
  if (region !== "AU" && region !== "NZ") return 0;
  return AUSTRALASIAN_COUNTRIES.has(w.country) ? HOME_MARKET_BONUS : 0;
}

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

export function scoreWine(w: Wine, a: QuizAnswers, region?: Region): number {
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
  score += homeMarketBonus(w, region);
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

export function pickWine(a: QuizAnswers, region?: Region): Wine {
  // ── Q1 HARD filter — never cross Red/White boundary ────────────────────
  // This is the #1 quiz UX fix: someone who says "Red" should NEVER receive
  // a white wine, even if the remaining palate axes happen to align with
  // one. Cross-type recommendations were the biggest source of confused
  // result-page reactions. Curveballs (rosé, sparkling, dessert, vermouth,
  // fortified) are excluded here entirely — they surface via getCurveballs
  // on the result page as an opt-in "wildcards" reveal.
  const byType = WINES.filter((w) => w.wineType === a.wineType);

  // HARD budget filter — never suggest above the user's stated tier.
  // This is non-negotiable: if a user says "$25-50", showing them a $100
  // wine is bad advice, not "the best fit". Budget wins over palate.
  const allowed = acceptableTiers(a.budget);
  const inBudget = byType.filter((w) => allowed.has(w.price));
  // If somehow no wines match (shouldn't happen — we always have under_25),
  // fall back to the by-type list (still respects Red/White) or full list.
  const pool = inBudget.length > 0 ? inBudget : (byType.length > 0 ? byType : WINES);
  const scored = pool.map((w) => ({ w, s: scoreWine(w, a, region) }));
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

/** Detect the user's region from browser locale.
 *  Ownology's primary market right now is Australia + New Zealand — we
 *  sell to AU/NZ winemakers, and we want the quiz to recommend wines
 *  they can actually walk into Dan Murphy's / Glengarry and buy.
 *
 *  So the detection is DELIBERATELY biased: only an explicit `en-NZ`
 *  locale escapes to NZ. Everything else — including en-US / en-GB
 *  browsers used by expat Aussies, en-AU Chrome installs, unknown
 *  locales, server-side rendering — defaults to AU. US and UK are
 *  still reachable via the "travelling?" toggle on the result page
 *  so overseas visitors aren't stranded, they're just not the
 *  default audience the algorithm optimises for. */
export function detectRegion(): Region {
  if (typeof navigator === "undefined") return "AU";
  const lang = (navigator.language || "").toUpperCase();
  const langs = (navigator.languages || []).map((l) => l.toUpperCase());
  const all = [lang, ...langs].join(" ");
  if (/\bEN-NZ\b|-NZ\b/.test(all)) return "NZ";
  // AU is the default for everyone else — including en-US / en-GB —
  // because that's the market Ownology is currently selling to. Users
  // who want US or UK context can flip explicitly via the region chip.
  return "AU";
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
  "vermouth-di-torino": {
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

  // ── Feb 2026 Wave D · Regional notes for previously-fallback wines ────
  // Fills the gaps so no wine falls back to generic "check specialist
  // merchants" prose. Written honestly with 2026 tariff/duty context.

  "chardonnay-adelaide-hills": {
    AU: { availability: "easy", priceRange: "$28-60", advice: "Shaw + Smith M3, Ashton Hills, Tapanappa all at Dan Murphy's Premium, Prince Wine Store. This IS your local — no import surcharge, freshest bottles. Vintage Cellars runs regular Adelaide Hills specials." },
    NZ: { availability: "easy", priceRange: "NZ$32-70", advice: "Glengarry, Fine Wine Delivery carry the top Adelaide Hills producers. Trans-Tasman trade is friction-free. NZ Chardonnay (Kumeu River, Neudorf) is the closest local alternative." },
    US: { availability: "moderate", priceRange: "US$25-55", advice: "Old Bridge Cellars imports Shaw + Smith. Available at K&L, quality wine shops. Sonoma Coast Chardonnay is the domestic parallel at similar price." },
    UK: { availability: "moderate", priceRange: "£22-45", advice: "Wine Society, Berry Bros carry Australian Chardonnay. Post-2023 duty at 12-13% ABV is reasonable. Chablis at £25-40 is the geographical alternative." },
  },
  "sauvignon-blanc-marlborough": {
    AU: { availability: "easy", priceRange: "$18-32", advice: "Cloudy Bay, Greywacke, Dog Point everywhere from Dan Murphy's to Aldi. NZ imports flow freely — ANZCERTA means no tariff. Buy young, drink cold. Adelaide Hills Sauv Blanc (Shaw + Smith, Grosset Alea) is the domestic parallel." },
    NZ: { availability: "easy", priceRange: "NZ$18-32", advice: "This is your backyard. Every supermarket, every wine shop. Cloudy Bay from Auckland to Invercargill. Directly from cellar door if you're passing through Marlborough — same price, fresher stock." },
    US: { availability: "easy", priceRange: "US$14-24", advice: "Total Wine, Costco, every wine shop. Kim Crawford is the volume brand; step up to Cloudy Bay or Greywacke for actual craft. Post-tariff situation stable — NZ has never been a target." },
    UK: { availability: "easy", priceRange: "£10-18", advice: "Marlborough Sauv is on every supermarket shelf. Waitrose, Tesco, M&S all stock the majors. Post-2023 duty at 12.5% ABV is a mid-tier hit but volumes keep pricing sharp." },
  },
  "shiraz-barossa": {
    AU: { availability: "easy", priceRange: "$45-120", advice: "Torbreck, Rockford Basket Press, Standish at Prince Wine Store and Dan Murphy's Premium. Under $45 the Barossa turns into supermarket blends — jump up to $60+ for real character. Cellar door tastings are the best value if you can get there." },
    NZ: { availability: "easy", priceRange: "NZ$50-140", advice: "Aus Shiraz crosses freely — Glengarry, Fine Wine Delivery stock the top names. Trans-Tasman trade is friction-free. Central Otago Syrah (Trinity Hill, Bilancia) is the boutique NZ alternative." },
    US: { availability: "moderate", priceRange: "US$40-110", advice: "Old Bridge Cellars imports the majors. Available at K&L, quality wine shops. Washington State Syrah (Cayuse, Betz) is the domestic parallel — often better value." },
    UK: { availability: "moderate", priceRange: "£30-90", advice: "Wine Society, Berry Bros, Majestic stock rotating Aus Shiraz. Post-2023 duty on 14-14.5% ABV is punishing — highest tax bracket. Northern Rhône or Priorat at similar price may drink better after tax." },
  },
  "grenache-mclaren-vale": {
    AU: { availability: "easy", priceRange: "$28-55", advice: "Yangarra Old Vine, SC Pannell, Aphelion at Dan Murphy's Premium, Prince Wine Store. Under $30 the quality has jumped dramatically — this is the current Aus sweet spot for craft red. Buy on cellar door specials if you can." },
    NZ: { availability: "moderate", priceRange: "NZ$32-65", advice: "Glengarry carries the McLaren Vale Grenache range. Growing category as NZ palates open up beyond Pinot. Trans-Tasman friction-free." },
    US: { availability: "moderate", priceRange: "US$25-55", advice: "Old Bridge Cellars imports Yangarra. Available at K&L, Chambers Street. Southern Rhône (Châteauneuf, Gigondas) at similar price is the classical parallel." },
    UK: { availability: "moderate", priceRange: "£22-50", advice: "Wine Society, Berry Bros. Southern Rhône Grenache at £20-40 is the closer-to-home alternative. Aus Grenache is having a UK moment but stock is patchy." },
  },
  "beaujolais-cru": {
    AU: { availability: "moderate", priceRange: "$32-55", advice: "Cru Beaujolais (Morgon, Fleurie, Moulin-à-Vent) is a step up from the Villages tier — Prince Wine Store, Blackhearts & Sparrows, City Wine Shop. Marcel Lapierre, Jean Foillard, Château Thivin — natural-wine icons. Serve slightly chilled." },
    NZ: { availability: "moderate", priceRange: "NZ$38-65", advice: "Glengarry, Regional Wines stock the top Cru Beaujolais producers. Growing category. Post-2023 EU tariffs on NZ are nil (FTA in force)." },
    US: { availability: "moderate", priceRange: "US$25-50", advice: "K&L, Chambers Street, Astor have deep Beaujolais lists. Post-2025 EU tariff instability applies — buy on dips. Kermit Lynch import portfolio is the gold standard." },
    UK: { availability: "easy", priceRange: "£18-38", advice: "Wine Society, Berry Bros, Majestic — Cru Beaujolais is well-served in UK retail. Post-2023 duty hit mid-tier hardest; £22-32 is the value sweet spot for the top Crus." },
  },
  "chianti-classico": {
    AU: { availability: "easy", priceRange: "$28-60", advice: "Fontodi, Castello di Ama, Isole e Olena at Prince Wine Store, Vintage Cellars. Under $40 you're at Classico DOCG tier; over $60 Riserva territory. Excellent value category — some of the best mid-priced reds landing in Aus." },
    NZ: { availability: "moderate", priceRange: "NZ$32-70", advice: "Glengarry, Caro's, Regional Wines stock the majors. Trans-Tasman + EU FTA means minimal friction on Italian wines to NZ." },
    US: { availability: "easy", priceRange: "US$22-55", advice: "Total Wine, K&L, wine.com. Chianti Classico is a US staple — dozens of producers on shelves. Post-2021 EU tariffs lifted; pricing has normalised." },
    UK: { availability: "easy", priceRange: "£18-45", advice: "Waitrose, M&S, Berry Bros — Chianti is a UK household name. Post-2023 duty on 13-13.5% ABV is manageable. Riserva at £30-45 is the sweet spot for structure and complexity." },
  },
  "champagne-vintage": {
    AU: { availability: "moderate", priceRange: "$120-350", advice: "Roederer, Bollinger, Pol Roger vintage bottlings at Prince Wine Store, Dan Murphy's Premium. Non-vintage from $60. Aus Vintage Sparkling (House of Arras, Jansz) delivers 85% of the drinking at half the price — worth considering as your regular sparkling." },
    NZ: { availability: "moderate", priceRange: "NZ$140-400", advice: "Glengarry, Fine Wine Delivery carry the top houses. NZ makes stellar traditional-method sparkling (Quartz Reef, No. 1 Family Estate) as an accessible alternative." },
    US: { availability: "easy", priceRange: "US$90-280", advice: "K&L, Total Wine, wine.com — vintage Champagne is a US staple. Post-2025 EU tariff instability applies. Domestic vintage sparkling (Schramsberg, Roederer Estate CA) is the value alternative." },
    UK: { availability: "easy", priceRange: "£75-260", advice: "Berry Bros, Wine Society, Waitrose. UK is a major Champagne market — best-priced outside France. English sparkling (Nyetimber, Gusbourne) at £45-90 is the domestic alternative at genuine competitive quality." },
  },
  "rose-provence": {
    AU: { availability: "easy", priceRange: "$28-60", advice: "Whispering Angel is at every wine shop from Dan Murphy's to Aldi. Domaines Ott, Château Miraval at Prince Wine Store, Vintage Cellars. Charles Melton 'Rose of Virginia' is the equivalent-quality AU dry Rosé at half the price." },
    NZ: { availability: "moderate", priceRange: "NZ$32-70", advice: "Glengarry, Fine Wine Delivery carry the essentials. NZ dry Rosé (Man O' War, Te Whare Ra) is growing as a local alternative." },
    US: { availability: "easy", priceRange: "US$18-45", advice: "Whispering Angel is a US phenomenon — every retailer stocks it. Post-2021 EU tariffs lifted; pricing stable. Domestic dry Rosé (Wölffer Estate, Bonny Doon) at $18-28 is the accessible alternative." },
    UK: { availability: "easy", priceRange: "£15-40", advice: "Waitrose, M&S, Berry Bros — Provence Rosé is a UK summer staple. Post-2023 duty on 12-13% ABV is manageable. English dry Rosé (Nyetimber, Ridgeview) is the domestic alternative worth trying." },
  },
  "pinot-noir-yarra-entry": {
    AU: { availability: "easy", priceRange: "$18-25", advice: "De Bortoli Villages, Delatite, Josef Chromy all at Dan Murphy's, First Choice around $20-25. This is honest under-$25 Pinot — no gambling required anymore. Cellar door specials at Yarra Valley can drop below $18." },
    NZ: { availability: "easy", priceRange: "NZ$22-32", advice: "AU Pinot flows freely to NZ. Glengarry stocks the range. NZ also does entry-tier Pinot brilliantly — Framingham, Ata Rangi second labels around NZ$25-35." },
    US: { availability: "hard", priceRange: "US$18-30", advice: "Rare in US retail — entry-tier Aus wines don't ship well economically. Domestic entry Pinot from Oregon (King Estate, A to Z, Willamette Valley Vineyards) is your accessible alternative under $25." },
    UK: { availability: "hard", priceRange: "£18-28", advice: "Wine Society occasional, otherwise rare. Post-2023 duty and freight make entry-tier Aus a hard sell in UK. Loire Pinot or Beaujolais at similar price is the closer-to-home alternative." },
  },
  "burgundy-old-white": {
    AU: { availability: "hard", priceRange: "$150-450", advice: "Aged Meursault / Puligny is Prince Wine Store, Randall's, Dan Murphy's Fine Wine territory. Coche-Dury, Roulot are allocation-only — book years in advance. Aged Adelaide Hills Chardonnay from Tapanappa Tiers at $80-140 is the smart local alternative." },
    NZ: { availability: "hard", priceRange: "NZ$180-500", advice: "Specialist merchants only — Fine Wine Delivery, Caro's. Small NZ market limits allocations. NZ premium Chardonnay (Kumeu River, Neudorf) is the accessible alternative at half the price." },
    US: { availability: "moderate", priceRange: "US$120-380", advice: "K&L, Zachys, Chambers Street. Post-2025 EU tariff volatility hits Burgundy hardest — 2019-2021 saw 25% duties. Buy on dips. Sonoma Coast top-tier Chardonnay is the domestic parallel." },
    UK: { availability: "moderate", priceRange: "£95-320", advice: "Berry Bros, Wine Society, Justerini & Brooks — Burgundy is a UK institution. Post-2023 duty at 13-13.5% ABV is manageable. English top-tier Chardonnay (Wiston, Gusbourne) at £45-70 is the interesting domestic alternative." },
  },
  "gewurztraminer-alsace": {
    AU: { availability: "moderate", priceRange: "$45-95", advice: "Trimbach, Zind-Humbrecht, Domaine Weinbach at Prince Wine Store, Randall's. Grand Cru bottlings command $70+. AU Alpine Gewürz (Delatite, Pizzini) is the value alternative at half the price — same variety, no import surcharge." },
    NZ: { availability: "moderate", priceRange: "NZ$50-110", advice: "Glengarry, Fine Wine Delivery stock the top houses. Central Otago and Marlborough are experimenting with Gewürz — worth checking Waipara Springs for a local alternative." },
    US: { availability: "moderate", priceRange: "US$28-75", advice: "K&L, wine.com — Alsace Gewürz has a small but loyal US following. Post-2025 EU tariff instability applies. Domestic Gewürz from Oregon or Anderson Valley (Navarro, Handley) is the local alternative." },
    UK: { availability: "moderate", priceRange: "£20-55", advice: "Wine Society, Berry Bros — Alsace is a UK favourite. Post-2023 duty at 13-14% ABV pushes Gewürz into the higher tax bracket. Off-dry to sweet expressions carry a bit more duty than bone-dry equivalents." },
  },
  "gewurztraminer-au-alpine": {
    AU: { availability: "easy", priceRange: "$22-35", advice: "Delatite is a Dan Murphy's / First Choice staple at ~$24. Pizzini range at $28-35 across all mainstream bottle shops. Bream Creek (Tas) and Frogmore Creek are cellar-door + specialty stores. Better cellar temp on this journey than any Alsace bottle." },
    NZ: { availability: "moderate", priceRange: "NZ$28-45", advice: "Glengarry, Fine Wine Delivery carry the top Aus Gewürz names. Trans-Tasman ANZCERTA means no tariff — pricing is competitive. NZ Waipara Springs Gewürz is the domestic alternative." },
    US: { availability: "hard", priceRange: "US$22-40", advice: "Rare in US — Aus Gewürz is a specialty import (Old Bridge Cellars occasional). Domestic Oregon Gewürz (Navarro, Handley) is your accessible alternative at similar price and quality." },
    UK: { availability: "hard", priceRange: "£22-40", advice: "Aus Gewürz is niche in UK retail — Wine Society occasional. Alsace at £20-35 is the standard UK option." },
  },
  "prosecco-superiore": {
    AU: { availability: "moderate", priceRange: "$28-55", advice: "Actual DOCG Valdobbiadene (Nino Franco, Bisol, Ruggeri) at Prince Wine Store, Vintage Cellars — much better than the $15 servo Prosecco. AU King Valley Prosecco (Dal Zotto, Chrismont) at $22-28 is the local alternative at similar quality." },
    NZ: { availability: "moderate", priceRange: "NZ$32-65", advice: "Glengarry, Fine Wine Delivery stock the top Valdobbiadene producers. Aus King Valley Prosecco crosses the Tasman freely as a local alternative." },
    US: { availability: "easy", priceRange: "US$18-40", advice: "Total Wine, K&L, wine.com. Prosecco Superiore DOCG (the good stuff) is well-labelled in US retail. Post-2021 EU tariff situation stable — Italian wines re-priced normally." },
    UK: { availability: "easy", priceRange: "£12-30", advice: "Waitrose, M&S — DOCG Prosecco is a UK favourite. Post-2023 duty on 11-12% ABV is one of the most favourable brackets — Prosecco is priced very competitively vs Champagne." },
  },
  "assyrtiko-santorini": {
    AU: { availability: "moderate", priceRange: "$32-55", advice: "Sigalas, Gaia, Argyros at Prince Wine Store, Blackhearts & Sparrows. Greek wines are a growing niche in AU. AU Clare Valley Assyrtiko (Jim Barry) at ~$35 is the local alternative — the first commercial planting outside Greece." },
    NZ: { availability: "hard", priceRange: "NZ$40-70", advice: "Regional Wines, Caro's stock rotating Greek producers. Small category. Greek imports pricier in NZ due to volumes." },
    US: { availability: "moderate", priceRange: "US$22-45", advice: "K&L, Astor Wines, Whole Foods better locations. Greek wines have grown in US shelf space over the last 5 years. Sigalas is the accessible entry point." },
    UK: { availability: "moderate", priceRange: "£18-40", advice: "Wine Society, Berry Bros — Greek wine has a loyal UK following. Post-2023 duty at 12-13% ABV is manageable. Sicilian white or Albariño at similar price is the closer-to-home alternative." },
  },
  // Wave B twin regional notes
  "chenin-blanc-au": {
    AU: { availability: "moderate", priceRange: "$25-45", advice: "Nick O'Leary Canberra Chenin at ~$28 through cellar door + specialty (Prince Wine Store). McHenry Hohnen Margaret River at Vintage Cellars. L.A.S. Vino allocation-based — Blackhearts & Sparrows worth checking. Better than most Loire Chenin landing here after freight." },
    NZ: { availability: "hard", priceRange: "NZ$32-55", advice: "Aus Chenin is a small allocation category in NZ — Glengarry occasional. NZ Millton Vineyards makes a local Chenin worth seeking." },
    US: { availability: "hard", priceRange: "US$22-42", advice: "Rare — Old Bridge Cellars imports L.A.S. Vino sporadically. South African Chenin (Ken Forrester, Mullineux) at similar price is the far more accessible parallel." },
    UK: { availability: "hard", priceRange: "£22-45", advice: "Aus Chenin is niche in UK retail. Loire Chenin (Vouvray, Chinon Blanc) at £18-35 or SA Chenin at £12-25 are the accessible alternatives." },
  },
  "gamay-au-beechworth": {
    AU: { availability: "moderate", priceRange: "$32-55", advice: "Sorrenberg is cellar-door + Prince Wine Store + City Wine Shop — allocation-based, book ahead. Bass Phillip at $40-50 through Blackhearts. Sailor Seeks Horse (Tas) is the newer expression. Genuine Beaujolais replica — no freight surcharge." },
    NZ: { availability: "hard", priceRange: "NZ$38-70", advice: "Aus Gamay is very niche in NZ — Glengarry very occasional. NZ Pinot Noir at NZ$30-50 is the closer-to-hand cool-climate light red." },
    US: { availability: "hard", priceRange: "US$30-55", advice: "Rare in US — specialist Australian importers only. Domestic Gamay from Willamette Valley (Brick House, Division) is your accessible parallel." },
    UK: { availability: "hard", priceRange: "£28-55", advice: "Aus Gamay is niche in UK. Cru Beaujolais at £22-40 is the obvious closer-to-home alternative." },
  },
  "prosecco-king-valley": {
    AU: { availability: "easy", priceRange: "$18-28", advice: "Dal Zotto and Chrismont are Dan Murphy's / First Choice regulars at $20-25. Brown Brothers volume brand at supermarkets under $18. Pizzini boutique at $25-30. Better than most Italian Prosecco landing after freight — and the King Valley Italian-Australian culture is worth supporting." },
    NZ: { availability: "moderate", priceRange: "NZ$22-32", advice: "Trans-Tasman friction-free. Glengarry, Fine Wine Delivery stock the King Valley range. Solid local alternative to Italian Prosecco." },
    US: { availability: "hard", priceRange: "US$18-32", advice: "Rare in US retail — Aus Prosecco is a specialty item. Italian Prosecco Superiore DOCG at similar price is the widely-available parallel." },
    UK: { availability: "hard", priceRange: "£18-32", advice: "Aus Prosecco is very niche in UK — Italian Prosecco dominates. Wine Society occasional." },
  },
  "noble-one-au": {
    AU: { availability: "easy", priceRange: "$45-90 (375ml)", advice: "De Bortoli Noble One at Dan Murphy's, Vintage Cellars, First Choice — around $50 for a 375ml. Brown Brothers Patricia at ~$45. This is one of the world's great botrytised wines and Australians can buy it at half the price of equivalent Sauternes." },
    NZ: { availability: "moderate", priceRange: "NZ$55-110 (375ml)", advice: "Glengarry, Fine Wine Delivery stock De Bortoli Noble One. Trans-Tasman friction-free. NZ Framingham F-Series late-harvest Riesling is the local alternative." },
    US: { availability: "moderate", priceRange: "US$40-85 (375ml)", advice: "Old Bridge Cellars imports Noble One — K&L, Chambers Street, quality wine shops. Domestic ice wine (Inniskillin Canada, Kiona WA) is the local alternative." },
    UK: { availability: "moderate", priceRange: "£35-80 (375ml)", advice: "Wine Society, Berry Bros stock Noble One. Post-2023 duty on 10-11% ABV is favourable — one of the more sensibly-taxed sweet wine brackets." },
  },
  "rose-au-dry": {
    AU: { availability: "easy", priceRange: "$28-45", advice: "Charles Melton Rose of Virginia at Dan Murphy's Premium, Prince Wine Store — the Aus benchmark since the '90s. Turkey Flat and Bekkers at specialty wine shops. AU dry Rosé is having its moment — great alternative to expensive Provence imports." },
    NZ: { availability: "moderate", priceRange: "NZ$32-55", advice: "Glengarry, Fine Wine Delivery stock the top Aus Rosé names. Trans-Tasman friction-free. NZ Man O' War dry Rosé is the domestic alternative." },
    US: { availability: "hard", priceRange: "US$25-45", advice: "Rare in US retail — Aus Rosé is a specialty import. Provence Rosé (Whispering Angel, etc.) at similar price dominates. Domestic dry Rosé (Wölffer Estate, Bonny Doon) is the accessible alternative." },
    UK: { availability: "hard", priceRange: "£22-45", advice: "Aus dry Rosé is niche in UK — Provence dominates. Wine Society occasional. English dry Rosé from Nyetimber or Ridgeview is the domestic alternative." },
  },
  "assyrtiko-au-clare": {
    AU: { availability: "moderate", priceRange: "$32-45", advice: "Jim Barry Clare Valley Assyrtiko at Prince Wine Store, Vintage Cellars, cellar door — this is Australia's ONLY commercial Assyrtiko planting outside Greece. Around $35. Novelty + quality combined." },
    NZ: { availability: "hard", priceRange: "NZ$38-55", advice: "Very rare in NZ — Glengarry very occasional allocations. Greek Assyrtiko from Sigalas etc. at similar NZ price is the alternative." },
    US: { availability: "hard", priceRange: "US$30-50", advice: "Rare in US — Old Bridge Cellars imports Jim Barry sporadically. Domestic Assyrtiko is basically non-existent; Greek imports (Sigalas, Gaia) at similar price are the parallel." },
    UK: { availability: "hard", priceRange: "£25-50", advice: "Very niche in UK. Wine Society occasional. Greek Assyrtiko at £18-32 is the far more accessible option." },
  },
  "montepulciano-au": {
    AU: { availability: "moderate", priceRange: "$20-32", advice: "Chalmers Heathcote at Prince Wine Store, Blackhearts around $22. Coriole McLaren Vale at Dan Murphy's around $25. S.C. Pannell at Vintage Cellars. Better than most $20 Italian Montepulciano landing here after freight." },
    NZ: { availability: "hard", priceRange: "NZ$25-38", advice: "Aus Italian varietals cross the Tasman but volume is limited. Glengarry, Regional Wines occasional. Italian Montepulciano at NZ$22-32 is the more common alternative." },
    US: { availability: "hard", priceRange: "US$18-35", advice: "Rare in US — Old Bridge Cellars imports Coriole occasionally. Italian Montepulciano at $14-22 is the mass-market parallel." },
    UK: { availability: "hard", priceRange: "£20-35", advice: "Aus Montepulciano is niche in UK retail. Italian Montepulciano d'Abruzzo at £10-18 is far more accessible and comparably priced/quality." },
  },
  "vermouth-au": {
    AU: { availability: "moderate", priceRange: "$45-75", advice: "Regal Rogue and Maidenii at Dan Murphy's Premium, Vintage Cellars, cocktail-focused specialists. Poor Toms and other native-botanical labels growing quickly. Better than most Italian vermouth for the same price — and you're supporting Aus native-botanical distilling." },
    NZ: { availability: "hard", priceRange: "NZ$55-90", advice: "Regal Rogue crosses the Tasman — Regional Wines, cocktail-focused merchants. Small category in NZ but growing." },
    US: { availability: "hard", priceRange: "US$35-70", advice: "Rare in US — Aus vermouth is a specialty import. Domestic vermouth (Ransom, Vya) from Oregon/California at similar price is the accessible parallel." },
    UK: { availability: "hard", priceRange: "£30-60", advice: "Very niche in UK — Italian vermouth (Carpano, Cocchi) dominates. Whisky Exchange occasional stock." },
  },
  "amarone-style-au": {
    AU: { availability: "moderate", priceRange: "$55-95", advice: "Mitolo Serpico is around $75-85 through Prince Wine Store, Randall's, Dan Murphy's Premium. Peter Lehmann Wigan at $60-70 through Vintage Cellars. Small production category so allocations run out — cellar door specials are the best value if you're passing through the Barossa. Half the price of Valpolicella Amarone landing here after freight + EU duty." },
    NZ: { availability: "hard", priceRange: "NZ$70-120", advice: "Aus Amarone-style is a niche category — Glengarry occasional allocations. Italian Amarone at NZ$90-180 is the mainstream alternative." },
    US: { availability: "hard", priceRange: "US$45-95", advice: "Rare in US — Old Bridge Cellars imports Mitolo Serpico sporadically. Italian Amarone dominates US retail at similar price points." },
    UK: { availability: "hard", priceRange: "£45-90", advice: "Aus Amarone-style is niche in UK. Wine Society, Berry Bros occasional. Italian Amarone at £30-80 with EU-nil-tariff status is the mainstream choice." },
  },
  "amarone": {
    AU: { availability: "moderate", priceRange: "$85-220", advice: "Prince Wine Store, Randall's for the top Amarone producers (Allegrini, Masi, Tommasi, Quintarelli — the last is allocation-only). Post-2025 EU tariff instability applies. AU Amarone-style from Mitolo Serpico at $75-85 is the local alternative at half the price." },
    NZ: { availability: "moderate", priceRange: "NZ$100-260", advice: "Glengarry, Fine Wine Delivery stock the mainstream Amarone producers. NZ-EU FTA means no tariff on Italian wine — pricing has been steadily improving." },
    US: { availability: "easy", priceRange: "US$65-180", advice: "K&L, Total Wine, wine.com — Amarone is a US retail staple. Post-2021 EU tariff situation stable. Ripasso (Amarone's lighter cousin) at $25-45 is the accessible entry point." },
    UK: { availability: "easy", priceRange: "£45-160", advice: "Berry Bros, Wine Society, Waitrose — Amarone is well-served in UK retail. Post-2023 duty on 15-16% ABV Amarone is punishing — highest tax bracket. Buy for special occasions only." },
  },
  // ── Feb 2026 Wave A regional notes — AU twins ────────────────────────
  "nebbiolo-au-alpine": {
    AU: { availability: "moderate", priceRange: "$32-55", advice: "Pizzini's flagship King Valley Nebbiolo is around $50 at Prince Wine Store, Vintage Cellars. Luke Lambert (Yarra) is allocation-based — try Blackhearts & Sparrows or the winery direct. Better value than any Langhe Nebbiolo landing in AU." },
    NZ: { availability: "hard", priceRange: "NZ$40-70", advice: "Aus Nebbiolo trickles across the Tasman — Glengarry has occasional Pizzini allocations. Very niche category in NZ." },
    US: { availability: "hard", priceRange: "US$28-55", advice: "Rare in US retail — Old Bridge Cellars imports Pizzini sporadically. Try direct-ship states via WineBid or Vinous. Domestic Nebbiolo (Palmina in CA, Idlewild) is the accessible alternative." },
    UK: { availability: "hard", priceRange: "£28-55", advice: "Aus Nebbiolo is a specialist find — Wine Society, Roberson Wine occasional. Langhe Nebbiolo at £25-40 is easier and closer to source." },
  },
  "sangiovese-au": {
    AU: { availability: "easy", priceRange: "$22-42", advice: "Coriole Sangiovese is a Dan Murphy's / First Choice staple around $25. Chalmers Heathcote at Prince Wine Store, Blackhearts. Pizzini range at $30-45. Better with pasta than most Aus reds you're used to." },
    NZ: { availability: "moderate", priceRange: "NZ$28-48", advice: "Aus Italian varietals cross freely — Glengarry, Regional Wines stock Coriole and Pizzini. Growing category as NZ palates diversify." },
    US: { availability: "hard", priceRange: "US$22-45", advice: "Rare — specialist Australian importers only (Old Bridge Cellars occasional). Californian Sangiovese (Seghesio, Ferrari-Carano) is your domestic alternative." },
    UK: { availability: "hard", priceRange: "£22-45", advice: "Australian Italian varietals are niche in UK retail. Wine Society occasionally lists Coriole. Aged Chianti Classico at similar price point is easier to find." },
  },
  "malbec-au-rutherglen": {
    AU: { availability: "moderate", priceRange: "$22-45", advice: "Campbells Malbec is around $28 at Dan Murphy's, First Choice. All Saints and Buller through winery direct or Vintage Cellars. Rutherglen wineries are also great cellar-door destinations for tastings." },
    NZ: { availability: "moderate", priceRange: "NZ$28-50", advice: "Glengarry, Regional Wines carry the Rutherglen essentials. NZ market prefers Mendoza — Aus Malbec is a small niche but growing." },
    US: { availability: "hard", priceRange: "US$22-42", advice: "Rare in US — Mendoza Malbec dominates. Old Bridge Cellars imports Campbells occasionally. If Argentine Malbec is your reference, this is a savoury cousin worth seeking through specialists." },
    UK: { availability: "hard", priceRange: "£22-45", advice: "Australian Malbec is not widely stocked — Wine Society, Berry Bros occasional. Cahors (French Malbec) or Mendoza (Argentine) is the standard UK option." },
  },
  "sparkling-tasmanian-vintage": {
    AU: { availability: "easy", priceRange: "$65-140", advice: "House of Arras EJ Carr around $130 at Dan Murphy's Premium, Prince Wine Store. Jansz Vintage $50-80, everywhere. Deviation Road Beltana at cellar door or specialist retailers. Half the price of equivalent Champagne after freight lands here." },
    NZ: { availability: "moderate", priceRange: "NZ$70-160", advice: "Fine Wine Delivery, Glengarry carry the top Tas sparklings. NZ also makes excellent traditional-method (Quartz Reef, No. 1 Family Estate) as a local alternative." },
    US: { availability: "hard", priceRange: "US$55-140", advice: "Rare in US retail — Old Bridge Cellars imports Arras and Jansz sporadically. Domestic vintage sparkling (Schramsberg, Roederer Estate) at similar price is the accessible parallel." },
    UK: { availability: "moderate", priceRange: "£50-120", advice: "Wine Society, Berry Bros — Aus sparkling has a small but loyal UK following. English sparkling (Nyetimber, Gusbourne) is the domestic alternative at comparable quality." },
  },
  "vintage-fortified-au": {
    AU: { availability: "easy", priceRange: "$50-160", advice: "Seppeltsfield Vintage Fortified is on Dan Murphy's / First Choice shelves at $60-90. The Para 100-year library and Rare Tawny are direct-from-cellar-door institutions. Half the price of vintage Douro Port for near-identical drinking." },
    NZ: { availability: "moderate", priceRange: "NZ$60-180", advice: "Aus fortified crosses the Tasman freely. Glengarry stocks Seppeltsfield. Small NZ market for fortified means limited range — but the Aus imports are excellent value." },
    US: { availability: "hard", priceRange: "US$45-150", advice: "Very rare in US — Old Bridge Cellars imports Seppeltsfield range for specialty retailers (K&L, Chambers Street). If you love vintage Port and can find these, buy on sight — half the equivalent Douro price." },
    UK: { availability: "hard", priceRange: "£40-140", advice: "Berry Bros, Fortnum & Mason occasionally list. UK fortified drinking overwhelmingly favours Portuguese Port — Aus fortified is niche despite excellent quality." },
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
  // Winner uses the home-market bias so the recommendation is something the
  // user can actually walk into a local bottle-o and buy.
  let winner = pickWine(a, r);

  // Find the palate-only best (ignore budget AND home-market bias) — but
  // STAY inside the user's wineType so we don't narrate "your true match
  // is Champagne" when they picked Red. This preserves the Q1 hard-filter
  // integrity everywhere. Deliberately NOT passing `region` here so the
  // honest framing can say "your true palate match is Chablis — but…"
  // without the AU/NZ nudge muddying the water.
  const inType = WINES.filter((w) => w.wineType === a.wineType);
  const allScores = inType.map((w) => ({ w, s: scoreWine(w, a) }));
  allScores.sort((x, y) => y.s - x.s);
  const trueMatch = allScores.length > 0 ? allScores[0].w : winner;

  // ── Wave C · Same-variety home-market preference ────────────────────────
  // Feb 2026, added after we caught the quiz swapping Alsatian Gewürz to
  // Clare Riesling instead of Aus Gewürz. If the true palate match is an
  // Old-World wine AND we have the SAME variety grown in Aus/NZ within
  // budget, prefer the home-market twin over any different-variety pick —
  // even if the twin scores slightly lower on the raw palate. Users
  // fundamentally trust "same grape, closer to home" more than "different
  // grape, adjacent-ish flavour profile."
  //
  // Threshold: twin's palate score must be within TWIN_SCORE_TOLERANCE of
  // the current winner's. Set loose (5 points) so any legitimately
  // decent same-variety twin gets picked. If the twin is a dud, the
  // original algorithm wins.
  const TWIN_SCORE_TOLERANCE = 5;
  if ((r === "AU" || r === "NZ") && !AUSTRALASIAN_COUNTRIES.has(trueMatch.country)) {
    const trueVarietyRoot = varietyRoot(trueMatch.variety);
    const allowedBudget = acceptableTiers(a.budget);
    const twinCandidates = WINES
      .filter((w) => w.wineType === a.wineType)
      .filter((w) => AUSTRALASIAN_COUNTRIES.has(w.country))
      .filter((w) => varietyRoot(w.variety) === trueVarietyRoot)
      .filter((w) => allowedBudget.has(w.price));
    if (twinCandidates.length > 0) {
      const twinScores = twinCandidates.map((w) => ({ w, s: scoreWine(w, a, r) }));
      twinScores.sort((x, y) => y.s - x.s);
      const bestTwin = twinScores[0];
      const currentWinnerScore = scoreWine(winner, a, r);
      if (bestTwin.s + TWIN_SCORE_TOLERANCE >= currentWinnerScore) {
        winner = bestTwin.w;
      }
    }
  }

  const budgetConstrained =
    BUDGET_RANK[trueMatch.price] > BUDGET_RANK[a.budget] && trueMatch.slug !== winner.slug;

  const trueMatchNote = regionalNoteFor(trueMatch, r);
  const regionallyRare = trueMatchNote.availability === "hard" || trueMatchNote.availability === "rare";
  const regionalNote = regionalNoteFor(winner, r);

  // Home-market swap detection — when the pure-palate best is Old World
  // but we picked an AU/NZ winner (because of the home-market bonus), we
  // want to be honest about that swap too, not just budget/rare cases.
  const isAusOrKiwi = (w: Wine) => AUSTRALASIAN_COUNTRIES.has(w.country);
  const homeMarketSwap =
    (r === "AU" || r === "NZ") &&
    trueMatch.slug !== winner.slug &&
    !isAusOrKiwi(trueMatch) &&
    isAusOrKiwi(winner);

  let honestFraming = "";
  if (budgetConstrained || (regionallyRare && trueMatch.slug !== winner.slug) || homeMarketSwap) {
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
    if (homeMarketSwap && !budgetConstrained && !regionallyRare) {
      const homeName = r === "AU" ? "Australia" : "New Zealand";
      const homeArticle = r === "AU" ? "an Australia" : "a New Zealand";
      const sameVariety = trueMatch.variety === winner.variety;
      if (sameVariety) {
        // Same-variety home-market swap — Feb 2026, added when we
        // learned the quiz was jumping from Alsatian Gewürz to Clare
        // Riesling instead of Aus Gewürz. Now the copy honours the
        // "same variety, grown here" story properly.
        parts.push(`Same grape grows brilliantly here too — freight, tariffs, and cellar temp between there and ${homeName} all add up on the Old World bottle.`);
        parts.push(`So we're picking a ${winner.variety} from **${winner.region}** for you instead — ${homeArticle}-grown version of exactly the same variety, no import surcharge.`);
      } else {
        parts.push(`It's Old World though — freight, tariffs, and cellar temp between there and here all add up.`);
        parts.push(`So we're picking **${winner.variety}** from ${winner.region} for you instead — ${homeArticle}-grown wine that hits the same notes and you can actually get your hands on this week.`);
      }
    } else {
      parts.push(`So we're picking **${winner.variety}** for you instead — hits most of your marks at your budget.`);
    }
    honestFraming = parts.join(" ");
  }

  return { winner, trueMatch, budgetConstrained, regionallyRare, region: r, regionalNote, honestFraming };
}

// ─── Curveballs — the "wildcards" reveal on the result page ─────────────
// Rosé, sparkling, dessert, fortified, and vermouth are excluded from the
// main Q1 red/white pool so the primary recommendation stays clean and
// predictable. But they're too interesting to drop entirely — a user who
// picks Red + light + off-dry + bright + young might genuinely enjoy a
// Prosecco Superiore, and telling them so is delightful.
//
// The result page shows a hidden "Feeling adventurous? Show me the
// wildcards →" toggle; clicking it reveals the top 3 curveballs ranked
// by palate score (budget still respected). Zero re-quiz needed.
export function getCurveballs(a: QuizAnswers, limit = 3): Wine[] {
  const allowed = acceptableTiers(a.budget);
  const pool = WINES.filter((w) => w.wineType === "curveball" && allowed.has(w.price));
  const scored = pool.map((w) => ({ w, s: scoreWine(w, a) }));
  scored.sort((x, y) => y.s - x.s);
  return scored.slice(0, limit).map((s) => s.w);
}

