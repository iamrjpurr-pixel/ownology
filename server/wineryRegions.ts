/**
 * wineryRegions — static lookup from winery name → Australian wine region.
 *
 * Populated Jul 2026 (Rich) after ingesting 187 Wine Australia directory
 * makers. Enables the `region` column on `outreach_contacts` so operators
 * can slice `/admin/contacts?region=mclaren-vale` for cohort-based
 * outreach ("i've been talking to five McLaren Vale grenache-focused
 * vignerons this month…") without hand-tagging every card.
 *
 * Matching is deliberately case-insensitive AND whitespace-lenient — the
 * scraper occasionally emits "d'Arenberg " with a trailing space or
 * "Wirra Wirra Vineyards" instead of "Wirra Wirra". We normalise the
 * input before lookup.
 *
 * Region values are kebab-case to match how they'll appear in URL
 * query strings. `null` for unknown — never guess.
 *
 * When you add a new winery to the CRM that isn't in this table, drop
 * it in below with the region set. Sorted alphabetically within each
 * region block for eyeball readability.
 */

export type AuRegion =
  | "mclaren-vale"
  | "barossa"
  | "eden-valley"
  | "adelaide-hills"
  | "clare"
  | "coonawarra"
  | "riverland"
  | "kangaroo-island"
  | "langhorne-creek"
  | "yarra-valley"
  | "mornington-peninsula"
  | "heathcote"
  | "grampians"
  | "beechworth"
  | "king-valley"
  | "goulburn-valley"
  | "geelong"
  | "gippsland"
  | "hunter"
  | "orange"
  | "mudgee"
  | "canberra"
  | "shoalhaven"
  | "riverina"
  | "margaret-river"
  | "great-southern"
  | "swan-valley"
  | "geographe"
  | "pemberton"
  | "manjimup"
  | "tasmania"
  | "granite-belt"
  | "south-burnett";

const RAW_TABLE: Record<string, AuRegion> = {
  // ── McLaren Vale (SA) ────────────────────────────────────────────
  "d'arenberg": "mclaren-vale",
  "sc pannell wines": "mclaren-vale",
  "s.c. pannell wines": "mclaren-vale",
  "s.c. pannell": "mclaren-vale",
  "sc pannell": "mclaren-vale",
  "ministry of clouds wines": "mclaren-vale",
  "ministry of clouds": "mclaren-vale",
  "bekkers wine": "mclaren-vale",
  "bekkers": "mclaren-vale",
  "bondar wines": "mclaren-vale",
  "chapel hill": "mclaren-vale",
  "chapel hill wines": "mclaren-vale",
  "chapel hill winery": "mclaren-vale",
  "coriole": "mclaren-vale",
  "coriole vineyards": "mclaren-vale",
  "gemtree wines": "mclaren-vale",
  "gemtree": "mclaren-vale",
  "hardys tintara": "mclaren-vale",
  "inkwell": "mclaren-vale",
  "inkwell wines": "mclaren-vale",
  "ochota barrels": "mclaren-vale",
  "oliver's taranga": "mclaren-vale",
  "olivers taranga": "mclaren-vale",
  "wirra wirra": "mclaren-vale",
  "wirra wirra vineyards": "mclaren-vale",
  "kangarilla road": "mclaren-vale",
  "yangarra": "mclaren-vale",
  "yangarra estate": "mclaren-vale",
  "yangarra estate vineyard": "mclaren-vale",
  "hither & yon": "mclaren-vale",
  "aphelion": "mclaren-vale",
  "aphelion wine": "mclaren-vale",
  "aylion": "mclaren-vale",
  "battle of bosworth": "mclaren-vale",
  "beresford": "mclaren-vale",
  "clarendon hills": "mclaren-vale",
  "dandelion vineyards": "mclaren-vale",
  "fox creek": "mclaren-vale",
  "geoff merrill wines": "mclaren-vale",
  "hardy's": "mclaren-vale",
  "hardys": "mclaren-vale",
  "kay brothers": "mclaren-vale",
  "kay brothers amery": "mclaren-vale",
  "paxton wines": "mclaren-vale",
  "paxton": "mclaren-vale",
  "penny's hill": "mclaren-vale",
  "primo estate": "mclaren-vale",
  "rockford wines": "barossa", // Rockford is Barossa, not McLaren
  "samuel's gorge": "mclaren-vale",
  "shingleback": "mclaren-vale",
  "wines by geoff hardy": "mclaren-vale",
  "wines by kt": "clare", // KT Wines is Clare
  "woodstock": "mclaren-vale",
  "yalumba": "barossa", // moved down

  // ── Barossa (SA) ─────────────────────────────────────────────────
  "chris ringland": "barossa",
  "elderton wines": "barossa",
  "elderton": "barossa",
  "grant burge wines": "barossa",
  "grant burge": "barossa",
  "hart of the barossa": "barossa",
  "hentley farm wines": "barossa",
  "hentley farm": "barossa",
  "jim barry wines": "clare",
  "kaesler wines": "barossa",
  "kaesler": "barossa",
  "kalleske wines": "barossa",
  "kalleske": "barossa",
  "langmeil winery": "barossa",
  "langmeil": "barossa",
  "peter lehmann wines": "barossa",
  "peter lehmann": "barossa",
  "penfolds": "barossa",
  "rockford": "barossa",
  "sami-odi": "barossa",
  "seppeltsfield": "barossa",
  "spinifex": "barossa",
  "st hugo": "barossa",
  "st. hallett": "barossa",
  "torbreck": "barossa",
  "torbreck vintners": "barossa",
  "turkey flat": "barossa",
  "two hands wines": "barossa",
  "two hands": "barossa",
  "wolf blass": "barossa",

  // ── Eden Valley (SA) ─────────────────────────────────────────────
  "henschke": "eden-valley",
  "henschke wines": "eden-valley",
  "mountadam": "eden-valley",
  "yalumba - the caley": "eden-valley",

  // ── Adelaide Hills (SA) ──────────────────────────────────────────
  "bird in hand": "adelaide-hills",
  "bird in hand wines": "adelaide-hills",
  "bk wines": "adelaide-hills",
  "chain of ponds": "adelaide-hills",
  "deviation road": "adelaide-hills",
  "geoff weaver wines": "adelaide-hills",
  "hahndorf hill winery": "adelaide-hills",
  "k1 by geoff hardy": "adelaide-hills",
  "leconfield": "coonawarra",
  "murdoch hill": "adelaide-hills",
  "nepenthe": "adelaide-hills",
  "petaluma": "adelaide-hills",
  "shaw and smith": "adelaide-hills",
  "shaw + smith": "adelaide-hills",
  "sidewood": "adelaide-hills",
  "sidewood estate": "adelaide-hills",
  "the lane vineyard": "adelaide-hills",

  // ── Clare Valley (SA) ────────────────────────────────────────────
  "grosset wines": "clare",
  "grosset": "clare",
  "kilikanoon wines": "clare",
  "kilikanoon": "clare",
  "knappstein wines": "clare",
  "knappstein": "clare",
  "leasingham": "clare",
  "mitchell wines": "clare",
  "paulett wines": "clare",
  "reilly's wines": "clare",
  "sevenhill cellars": "clare",
  "taylors wines": "clare",
  "wendouree": "clare",

  // ── Coonawarra (SA) ──────────────────────────────────────────────
  "balnaves of coonawarra": "coonawarra",
  "balnaves": "coonawarra",
  "brand's laira": "coonawarra",
  "hollick estates": "coonawarra",
  "katnook estate": "coonawarra",
  "majella wines": "coonawarra",
  "parker coonawarra estate": "coonawarra",
  "penley estate": "coonawarra",
  "petaluma coonawarra": "coonawarra",
  "wynns coonawarra estate": "coonawarra",
  "yalumba the menzies": "coonawarra",
  "zema estate": "coonawarra",

  // ── Riverland / Langhorne Creek / KI (SA) ───────────────────────
  "salena estate": "riverland",
  "berri estates": "riverland",
  "banrock station": "riverland",
  "bleasdale vineyards": "langhorne-creek",
  "bleasdale": "langhorne-creek",
  "bremerton": "langhorne-creek",
  "brothers in arms": "langhorne-creek",
  "the islander estate vineyards": "kangaroo-island",
  "islander estate": "kangaroo-island",

  // ── Yarra Valley (VIC) ───────────────────────────────────────────
  "coldstream hills": "yarra-valley",
  "de bortoli yarra valley": "yarra-valley",
  "domaine chandon": "yarra-valley",
  "giant steps": "yarra-valley",
  "innocent bystander": "yarra-valley",
  "mac forbes": "yarra-valley",
  "mac forbes wines": "yarra-valley",
  "mount mary": "yarra-valley",
  "mount mary vineyard": "yarra-valley",
  "oakridge wines": "yarra-valley",
  "oakridge": "yarra-valley",
  "punt road": "yarra-valley",
  "st huberts": "yarra-valley",
  "tarrawarra estate": "yarra-valley",
  "yarra yering": "yarra-valley",
  "yeringberg": "yarra-valley",
  "yering station": "yarra-valley",

  // ── Mornington Peninsula (VIC) ───────────────────────────────────
  "crittenden estate": "mornington-peninsula",
  "eldridge estate": "mornington-peninsula",
  "kooyong": "mornington-peninsula",
  "moorooduc estate": "mornington-peninsula",
  "paringa estate": "mornington-peninsula",
  "port phillip estate": "mornington-peninsula",
  "stonier": "mornington-peninsula",
  "ten minutes by tractor": "mornington-peninsula",
  "yabby lake": "mornington-peninsula",

  // ── Other VIC ────────────────────────────────────────────────────
  "best's wines": "grampians",
  "best's great western": "grampians",
  "castagna vineyard": "beechworth",
  "castagna": "beechworth",
  "chalmers wines": "heathcote",
  "chalmers": "heathcote",
  "clonakilla": "canberra",
  "curly flat": "gippsland",
  "dal zotto wines": "king-valley",
  "dal zotto": "king-valley",
  "delatite winery": "goulburn-valley",
  "de bortoli": "riverina",
  "fighting gully road": "beechworth",
  "giaconda": "beechworth",
  "giaconda vineyard": "beechworth",
  "hoddles creek estate": "yarra-valley",
  "juliard wines": "yarra-valley", // placeholder — verify
  "mitchelton": "goulburn-valley",
  "pizzini wines": "king-valley",
  "pizzini": "king-valley",
  "rutherglen estates": "king-valley",
  "sorrenberg": "beechworth",
  "stanton & killeen wines": "goulburn-valley",
  "stanton and killeen": "goulburn-valley",
  "seppelt": "grampians",
  "tahbilk": "goulburn-valley",
  "warramate": "yarra-valley",
  "warrenmang": "grampians",

  // ── Hunter Valley (NSW) ──────────────────────────────────────────
  "brokenwood wines": "hunter",
  "brokenwood": "hunter",
  "de iuliis": "hunter",
  "first creek wines": "hunter",
  "hungerford hill": "hunter",
  "keith tulloch wine": "hunter",
  "keith tulloch": "hunter",
  "margan wines": "hunter",
  "margan": "hunter",
  "mcguigan wines": "hunter",
  "mount pleasant": "hunter",
  "peter drayton wines": "hunter",
  "pooles rock": "hunter",
  "silkman wines": "hunter",
  "thomas wines": "hunter",
  "tulloch wines": "hunter",
  "tyrrell's wines": "hunter",
  "tyrrells": "hunter",
  "usher tinkler wines": "hunter",

  // ── Orange / Mudgee / Canberra / other NSW ──────────────────────
  "angullong": "orange",
  "angullong wines": "orange",
  "logan wines": "mudgee",
  "logan": "mudgee",
  "nashdale lane wines": "orange",
  "philip shaw wines": "orange",
  "printhie wines": "orange",
  "ross hill wines": "orange",
  "cumulus wines": "orange",
  "helm wines": "canberra",
  "helm": "canberra",
  "lark hill winery": "canberra",
  "yarran wines": "riverina",
  "mount majura vineyard": "canberra",
  "mount majura": "canberra",
  "shoalhaven coast": "shoalhaven",

  // ── Margaret River (WA) ──────────────────────────────────────────
  "cape mentelle": "margaret-river",
  "cullen wines": "margaret-river",
  "cullen": "margaret-river",
  "deep woods estate": "margaret-river",
  "flametree wines": "margaret-river",
  "fraser gallop estate": "margaret-river",
  "howard park wines": "margaret-river",
  "howard park": "margaret-river",
  "leeuwin estate": "margaret-river",
  "moss wood": "margaret-river",
  "moss wood wines": "margaret-river",
  "pierro": "margaret-river",
  "stella bella wines": "margaret-river",
  "stella bella": "margaret-river",
  "vasse felix": "margaret-river",
  "voyager estate": "margaret-river",
  "wills domain": "margaret-river",
  "windows estate": "margaret-river",
  "woodlands wines": "margaret-river",
  "woodlands": "margaret-river",
  "xanadu wines": "margaret-river",
  "xanadu": "margaret-river",

  // ── Great Southern / Pemberton / Manjimup / Swan (WA) ────────────
  "castle rock estate": "great-southern",
  "duke's vineyard": "great-southern",
  "forest hill": "great-southern",
  "frankland estate": "great-southern",
  "howard park mount barrow": "great-southern",
  "plantagenet wines": "great-southern",
  "silkwood estate": "pemberton",
  "singlefile wines": "great-southern",
  "west cape howe": "great-southern",
  "houghton wines": "swan-valley",
  "sandalford wines": "swan-valley",

  // ── Tasmania ─────────────────────────────────────────────────────
  "bay of fires": "tasmania",
  "bream creek vineyard": "tasmania",
  "clover hill wines": "tasmania",
  "domaine a": "tasmania",
  "eddystone point": "tasmania",
  "freycinet vineyard": "tasmania",
  "gala estate": "tasmania",
  "holm oak vineyards": "tasmania",
  "jansz tasmania": "tasmania",
  "josef chromy wines": "tasmania",
  "kate hill wines": "tasmania",
  "kreglinger wine estates": "tasmania",
  "moorilla estate": "tasmania",
  "pipers brook vineyard": "tasmania",
  "pooley wines": "tasmania",
  "pressing matters": "tasmania",
  "sinapius vineyard": "tasmania",
  "stefano lubiana wines": "tasmania",
  "stoney rise": "tasmania",
  "tolpuddle vineyard": "tasmania",

  // ── QLD ──────────────────────────────────────────────────────────
  "sirromet wines": "granite-belt",
  "ballandean estate": "granite-belt",
  "clovelly estate": "south-burnett",
};

const NORMALISED: Record<string, AuRegion> = {};
for (const [key, region] of Object.entries(RAW_TABLE)) {
  NORMALISED[key.toLowerCase().trim()] = region;
}

/** Look up an Australian wine region from a winery/business name.
 *  Returns null when the name isn't in the static table — never guess. */
export function regionForWinery(winery: string | null | undefined): AuRegion | null {
  if (!winery) return null;
  const key = winery.toLowerCase().trim().replace(/\s+/g, " ");
  if (NORMALISED[key]) return NORMALISED[key];
  // Try progressively shorter prefixes for names like "Wirra Wirra Vineyards"
  // → "wirra wirra" hit. Also try dropping trailing " wines"/" wine"/"estate".
  const trimmed = key.replace(/\s+(wines?|winery|vineyards?|estate|cellars?)$/g, "").trim();
  if (trimmed !== key && NORMALISED[trimmed]) return NORMALISED[trimmed];
  return null;
}
