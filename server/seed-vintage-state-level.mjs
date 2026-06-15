/**
 * Seed script: Australian state-level vintage intelligence 2021–2025
 * Source: Wine Australia National Vintage Reports (public domain)
 * Run: node server/seed-vintage-state-level.mjs
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();

// Helper: upsert a row (insert or update if region+year already exists)
async function upsert(row) {
  const [existing] = await conn.execute(
    "SELECT id FROM vintage_intelligence WHERE region = ? AND year = ?",
    [row.region, row.year]
  );
  if (existing.length > 0) {
    await conn.execute(
      `UPDATE vintage_intelligence SET
        state=?, country=?, conditions=?, standout_varieties=?,
        quality_rating=?, yield_assessment=?, winemaking_notes=?,
        source=?, updated_at=?
       WHERE region=? AND year=?`,
      [
        row.state, row.country, row.conditions, row.standoutVarieties ?? null,
        row.qualityRating, row.yieldAssessment ?? null, row.winemakingNotes ?? null,
        row.source ?? null, now,
        row.region, row.year,
      ]
    );
    console.log(`  Updated: ${row.region} ${row.year}`);
  } else {
    await conn.execute(
      `INSERT INTO vintage_intelligence
        (region, year, state, country, conditions, standout_varieties,
         quality_rating, yield_assessment, winemaking_notes, source, created_at, updated_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [
        row.region, row.year, row.state, row.country, row.conditions,
        row.standoutVarieties ?? null, row.qualityRating,
        row.yieldAssessment ?? null, row.winemakingNotes ?? null,
        row.source ?? null, now, now,
      ]
    );
    console.log(`  Inserted: ${row.region} ${row.year}`);
  }
}

const SOURCE_2025 = "Wine Australia National Vintage Report 2025 (public domain)";
const SOURCE_2024 = "Wine Australia National Vintage Report 2024 (public domain)";
const SOURCE_2023 = "Wine Australia National Vintage Report 2023 (public domain)";
const SOURCE_2022 = "Wine Australia National Vintage Report 2022 (public domain)";
const SOURCE_2021 = "Wine Australia National Vintage Report 2021 (public domain)";

const rows = [

  // ═══════════════════════════════════════════════════════════════════════════
  // 2025 — STATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    region: "South Australia", year: 2025, state: "SA", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Below 10-year average — 747,688 t (−13% vs 10yr avg); +8% vs 2024",
    standoutVarieties: "Shiraz, Cabernet Sauvignon, Grenache, Riesling, Chardonnay",
    conditions: `Australia had its second-hottest year on record in 2024, feeding into the 2025 growing season. Rainfall distribution was uneven: southern and south-eastern South Australia received well below-average rainfall, while the national total was the wettest since 2011. An isolated cold snap in mid-September produced the coldest spring temperatures on record across SA, causing widespread frost damage particularly to early-ripening white varieties such as Chardonnay and Colombard. A mid-December heatwave then drove temperatures well above average across SA and Victoria. Despite these extremes, many respondents to the 2025 National Vintage Survey reported more positive conditions than in recent years, with dry conditions reducing disease pressure. Wrattonbully was singled out as a standout region for good seasonal conditions. Economic headwinds — low demand, unsustainable grape prices — continued to drive deliberate production reductions by growers.`,
    winemakingNotes: `Frost damage to early-ripening whites (especially Chardonnay) means reduced white volumes from cool-climate SA subregions. Dry conditions lowered disease pressure, favouring clean fruit. Red varieties benefited from warm summer conditions. Expect concentrated, flavour-forward reds from premium subregions. The overall SA crush of 747,688 t was 48% of the national total, down from a 10-year average of 857,640 t.`,
    source: SOURCE_2025,
  },

  {
    region: "New South Wales", year: 2025, state: "NSW", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "In line with 10-year average — 478,186 t (+16% vs 2024)",
    standoutVarieties: "Shiraz, Chardonnay, Semillon, Cabernet Sauvignon",
    conditions: `NSW had high rainfall across inland areas in 2024–25, while south-eastern NSW experienced below-average rainfall. The 2025 crush of 478,186 tonnes was 31% of the national total and in line with the 10-year average — a notable recovery after the very low 2024 crush. Orange was singled out as a standout region for good seasonal conditions. The warm inland regions (Riverina, Murray Darling–Swan Hill) drove much of the recovery in red variety volumes. The Riverina increased by 15% in 2024 and continued to be a major contributor. Economic factors — low grape prices and reduced winery intake — continued to suppress potential volumes.`,
    winemakingNotes: `Riverina and Murray Darling–Swan Hill bulk production recovered strongly. Premium regions like Orange and Hunter Valley reported cleaner fruit after the challenging 2023–24 seasons. Semillon from Hunter Valley continues to be a benchmark variety. Expect good value from inland reds (Shiraz, Cabernet) and structured whites from cool-climate Orange.`,
    source: SOURCE_2025,
  },

  {
    region: "Victoria", year: 2025, state: "VIC", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Near 10-year average — 277,701 t (+13% vs 2024; −1% vs 10yr avg)",
    standoutVarieties: "Pinot Noir, Chardonnay, Shiraz, Cabernet Sauvignon",
    conditions: `Victoria experienced below-average rainfall across most wine regions in 2024–25, with the mid-September cold snap causing widespread frost damage — particularly severe in early-ripening white varieties. A mid-December heatwave and a major bushfire in the Grampians National Park (Western Victoria) had a devastating impact on vineyards in that region. Despite these events, the overall Victorian crush recovered to 277,701 tonnes, up 13% year-on-year and only 1% below the 10-year average. Murray Darling–Swan Hill (shared with NSW) drove much of the volume recovery. Cool-climate regions including Yarra Valley, Mornington Peninsula, and King Valley reported mixed outcomes.`,
    winemakingNotes: `Grampians region severely impacted by bushfire — expect reduced volumes and potential smoke-taint issues from affected vineyards. Frost damage to early whites in Yarra Valley and Mornington Peninsula. Murray Darling–Swan Hill bulk reds recovered well. Pinot Noir and Chardonnay from premium cool-climate regions (Yarra, Mornington) may show lower yields but good concentration where fruit was clean.`,
    source: SOURCE_2025,
  },

  {
    region: "Western Australia", year: 2025, state: "WA", country: "Australia",
    qualityRating: 5,
    yieldAssessment: "Above 10-year average — 42,019 t (+3% vs 2024; +5% vs 10yr avg)",
    standoutVarieties: "Cabernet Sauvignon, Chardonnay, Shiraz, Sauvignon Blanc",
    conditions: `Western Australia had high rainfall across most of the state in 2024–25, providing excellent soil moisture reserves heading into the growing season. Geographe and Margaret River were specifically singled out by Wine Australia as standout regions for good reported seasonal conditions in 2025. The WA crush of 42,019 tonnes was 3% above the previous year and 5% above the 10-year average — continuing WA's trend of outperforming the national average. Margaret River, the state's flagship premium region, reported clean fruit and excellent ripening conditions.`,
    winemakingNotes: `Margaret River Cabernet Sauvignon and Chardonnay expected to be exceptional — clean fruit, good natural acidity, excellent structure. Geographe also reported strong conditions. WA continues to be the most consistent high-quality state in recent vintages. Expect premium pricing and strong critical reception for 2025 WA reds and whites.`,
    source: SOURCE_2025,
  },

  {
    region: "Tasmania", year: 2025, state: "TAS", country: "Australia",
    qualityRating: 5,
    yieldAssessment: "Record crush — 18,764 t (+12% vs 2024 record; +77% vs 10yr avg)",
    standoutVarieties: "Pinot Noir, Chardonnay, Riesling, Pinot Gris",
    conditions: `Tasmania recorded its second consecutive record crush in 2025, with 18,764 tonnes — 12% above the 2024 record of 16,804 tonnes. Two consecutive years of very good flowering conditions, combined with ongoing new vineyard plantings, drove a 61% increase in crush over just two years (since 2023). The 2025 crush was 77% above the 10-year average of 10,614 tonnes. Tasmania's cool maritime climate continued to produce wines of exceptional natural acidity and aromatic precision. Below-average rainfall in parts of Tasmania was noted, but overall conditions were favourable.`,
    winemakingNotes: `Two consecutive record harvests signal a step-change in Tasmanian production capacity. Expect high-quality Pinot Noir and Chardonnay with excellent natural acidity and fine structure. Sparkling wine base material (Pinot Noir, Chardonnay, Pinot Meunier) continues to be a major use of Tasmanian fruit. Riesling and Pinot Gris also performing well. Premium pricing justified by quality and limited volumes relative to national production.`,
    source: SOURCE_2025,
  },

  {
    region: "Queensland", year: 2025, state: "QLD", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Slight increase — small base; +1% vs 2024",
    standoutVarieties: "Shiraz, Verdelho, Chardonnay",
    conditions: `Queensland's crush increased slightly in 2025, up 1% compared with 2024, but from a very small base. The Granite Belt region, Queensland's premium wine zone, benefits from its high altitude (800–1,000m) which provides cool temperatures despite the subtropical latitude. Wine Australia notes that variations in response rates from year to year likely have a particularly large impact on Queensland figures given the small number of wineries. The South Burnett region also contributes to Queensland production.`,
    winemakingNotes: `Granite Belt continues to be Queensland's quality benchmark — altitude-driven cool nights produce wines with good natural acidity. Verdelho performs well in Queensland's warmer conditions. Small production volumes mean Queensland wines are largely consumed domestically. Limited data available at state level due to small respondent base.`,
    source: SOURCE_2025,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2024 — STATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    region: "South Australia", year: 2024, state: "SA", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Below 10-year average — 702,344 t (−4% vs 2023; −19% vs 10yr avg)",
    standoutVarieties: "Grenache, Shiraz, Cabernet Sauvignon, Riesling",
    conditions: `The 2024 vintage was shaped by a complex mix of climate drivers. Australia's eighth-hottest year on record in 2023 led into the 2024 growing season. Autumn 2024 was relatively cool — the coolest since 2012 nationally. Rainfall was below average for south-western South Australia. Many regions experienced a compressed vintage due to dry conditions and heat in late summer/early autumn. The Riverland saw a further 5% decrease in crush to 391,248 tonnes — the lowest in over a decade. Coonawarra was a notable bright spot, reporting long-term average or high yields. Deliberate yield reductions by growers due to low grape prices and stock overhangs significantly suppressed the potential crush.`,
    winemakingNotes: `Cool autumn conditions favoured slow, even ripening in premium subregions (Barossa Valley, Clare Valley, McLaren Vale, Coonawarra). Compressed vintage timeline in warmer areas required careful harvest timing. Grenache from old-vine Barossa and McLaren Vale expected to be outstanding. Riesling from Clare and Eden Valley benefited from cool conditions. Riverland bulk production down significantly.`,
    source: SOURCE_2024,
  },

  {
    region: "New South Wales", year: 2024, state: "NSW", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Below 10-year average — 417,965 t (+18% vs 2023; −21% vs 10yr avg)",
    standoutVarieties: "Shiraz, Chardonnay, Semillon, Cabernet Sauvignon",
    conditions: `NSW experienced a significant recovery in 2024 after the very low 2023 vintage, with crush up 18% year-on-year to 417,965 tonnes. However, this was still 21% below the 10-year average. The Riverina increased by 15% from its very low 2023 base, while Murray Darling–Swan Hill increased by 38%. Cool autumn conditions nationally favoured quality in premium regions. The Hunter Valley, Orange, and Mudgee all reported improved conditions compared with the challenging 2023 season.`,
    winemakingNotes: `Recovery vintage after the very difficult 2023. Hunter Valley Semillon and Shiraz expected to show good structure. Orange Chardonnay and Pinot Noir benefited from cool conditions. Riverina and Murray Darling–Swan Hill bulk production recovered but remained below historical averages. Expect good value from NSW reds and whites across the board.`,
    source: SOURCE_2024,
  },

  {
    region: "Victoria", year: 2024, state: "VIC", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Below 10-year average — 248,105 t (+43% vs 2023; −13% vs 10yr avg)",
    standoutVarieties: "Pinot Noir, Chardonnay, Shiraz, Cabernet Sauvignon",
    conditions: `Victoria saw the largest year-on-year increase of any state in 2024, with crush up 43% to 248,105 tonnes — a major recovery after the catastrophic 2023 vintage (down 40%). Murray Darling–Swan Hill increased by 38% to 282,338 tonnes. Cool autumn conditions benefited premium cool-climate regions including Yarra Valley, Mornington Peninsula, and King Valley. The Barossa-style warm regions of NE Victoria also recovered well. Despite the large increase, the Victorian crush remained 13% below its 10-year average.`,
    winemakingNotes: `Major recovery vintage for Victoria. Yarra Valley Pinot Noir and Chardonnay expected to be excellent — cool autumn extended the ripening window. Mornington Peninsula also benefited from cool conditions. King Valley Italian varieties (Sangiovese, Pinot Grigio) performed well. Murray Darling–Swan Hill bulk production recovered strongly. Overall a high-quality vintage for premium Victorian regions.`,
    source: SOURCE_2024,
  },

  {
    region: "Western Australia", year: 2024, state: "WA", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Above 10-year average — 41,113 t (−10% vs 2023; +5% vs 10yr avg)",
    standoutVarieties: "Cabernet Sauvignon, Chardonnay, Shiraz, Sauvignon Blanc",
    conditions: `Western Australia experienced a very dry vintage in 2024, leading to a 10% decrease in crush year-on-year to 41,113 tonnes. Despite the decrease, WA remained 5% above its 10-year average — reflecting the state's consistent performance. Margaret River, which accounts for the majority of WA's premium production, managed the dry conditions well due to its maritime climate influence. The dry conditions reduced disease pressure and concentrated flavours in the fruit.`,
    winemakingNotes: `Dry conditions concentrated flavours in Margaret River Cabernet Sauvignon and Chardonnay — expect wines of excellent intensity and structure. Lower yields mean premium pricing is justified. Disease pressure was minimal, producing clean fruit. WA continues to be Australia's most consistent premium wine state.`,
    source: SOURCE_2024,
  },

  {
    region: "Tasmania", year: 2024, state: "TAS", country: "Australia",
    qualityRating: 5,
    yieldAssessment: "Record crush — 16,702 t (+42% vs 2023; +57% vs 10yr avg)",
    standoutVarieties: "Pinot Noir, Chardonnay, Riesling, Pinot Gris",
    conditions: `Tasmania recorded a historic record crush in 2024, with 16,702 tonnes — 42% above the 2023 crush and 57% above the 10-year average of 10,614 tonnes. This was driven by improved yields after four consecutive low-yielding years, combined with continued new vineyard plantings. The cool maritime climate provided excellent conditions for aromatic varieties and sparkling wine base material. Tasmania's growing reputation as a world-class cool-climate wine region continued to attract investment and new plantings.`,
    winemakingNotes: `Record harvest with excellent quality. Pinot Noir and Chardonnay from Tamar Valley, Coal River Valley, and Huon Valley all reported excellent conditions. Sparkling wine base material of exceptional quality. Riesling showing classic Tasmanian precision and longevity. This vintage marks a coming-of-age for Tasmanian wine production at scale.`,
    source: SOURCE_2024,
  },

  {
    region: "Queensland", year: 2024, state: "QLD", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Increased — small base; +45% vs 2023",
    standoutVarieties: "Shiraz, Verdelho, Chardonnay",
    conditions: `Queensland's crush increased by 45% in 2024 compared with 2023, but from a very small base. The Granite Belt region benefited from its high-altitude cool climate. Wine Australia notes that variations in response rates may have had a particularly large impact on Queensland figures. The 2024 vintage nationally was characterised by cool autumn conditions, which benefited Queensland's premium Granite Belt region.`,
    winemakingNotes: `Granite Belt Shiraz and alternative varieties (Tempranillo, Verdelho) performed well in the cool autumn conditions. Small production volumes. Limited state-level data available.`,
    source: SOURCE_2024,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2023 — STATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    region: "South Australia", year: 2023, state: "SA", country: "Australia",
    qualityRating: 2,
    yieldAssessment: "Lowest since 2007 — 730,019 t (−18% vs 2022; −17% vs 10yr avg)",
    standoutVarieties: "Grenache, Riesling, Shiraz",
    conditions: `The 2023 vintage was widely reported as the most difficult and challenging in at least 20 years for South Australia. A third consecutive La Niña event produced the wettest year since 2011 and the ninth wettest on record since 1900 (rainfall 26% above the 1961–1990 average). Persistent rainfall led to major flooding in the Riverland, with secondary effects including loss of power and inability to access waterlogged vineyards for essential spraying. Continuing rain, staff shortages, and lack of spray chemicals exacerbated disease management. Some growers resorted to aerial spraying. The SA crush of 730,019 tonnes was the equal smallest since 2007 and 17% below the 10-year average, yet SA increased its share of the national crush by 4 percentage points to 55% as other states declined more sharply.`,
    winemakingNotes: `Extremely challenging vintage. Disease pressure (Downy Mildew, Botrytis) was severe across many regions. The Riverland was particularly impacted by flooding. However, the Barossa Valley, Clare Valley, and Coonawarra reported mainly positive outcomes — cool conditions and low yields produced wines of excellent concentration and flavour. Riesling from Clare and Eden Valley was a standout. Grenache from old-vine Barossa showed exceptional quality despite low yields.`,
    source: SOURCE_2023,
  },

  {
    region: "New South Wales", year: 2023, state: "NSW", country: "Australia",
    qualityRating: 2,
    yieldAssessment: "36% below 10-year average — 355,083 t (−28% vs 2022)",
    standoutVarieties: "Semillon, Chardonnay, Shiraz",
    conditions: `NSW experienced a catastrophic 2023 vintage, with crush down 28% year-on-year to 355,083 tonnes — 36% below the 10-year average. The Riverina and Murray Darling–Swan Hill were severely impacted by the wet conditions. The Hunter Valley, while also affected by rain, managed to produce some excellent Semillon and Shiraz. Orange and Mudgee reported difficult conditions with disease pressure. The start of vintage was delayed in most regions and the duration prolonged, causing difficulties in achieving target baumés for late-ripening varieties.`,
    winemakingNotes: `Very difficult vintage. Riverina and Murray Darling–Swan Hill bulk production severely impacted. Hunter Valley Semillon showed resilience — the variety's natural high acidity and thin skins helped manage disease pressure. Orange Pinot Noir and Chardonnay from clean parcels showed excellent quality. Careful fruit selection and sorting essential for all varieties.`,
    source: SOURCE_2023,
  },

  {
    region: "Victoria", year: 2023, state: "VIC", country: "Australia",
    qualityRating: 2,
    yieldAssessment: "43% below 10-year average — 173,959 t (−40% vs 2022)",
    standoutVarieties: "Pinot Noir, Chardonnay",
    conditions: `Victoria suffered the most severe decline of any state in 2023, with crush down 40% year-on-year to 173,959 tonnes — 43% below the 10-year average. Murray Darling–Swan Hill was severely impacted by flooding and wet conditions. The Goulburn River regions experienced significant flooding. Cool-climate regions including Yarra Valley and Mornington Peninsula reported difficult conditions but some positive outcomes for Pinot Noir and Chardonnay where fruit was clean. The King Valley was the only cool-climate region apart from Murray Darling–Swan Hill to show significant volumes.`,
    winemakingNotes: `Catastrophic vintage for bulk production. Murray Darling–Swan Hill severely impacted. Premium cool-climate regions (Yarra Valley, Mornington Peninsula) produced some excellent wines from carefully selected fruit — the cool, wet conditions that caused problems for disease management also produced wines of exceptional natural acidity and longevity. Pinot Noir and Chardonnay from clean parcels are highly recommended.`,
    source: SOURCE_2023,
  },

  {
    region: "Western Australia", year: 2023, state: "WA", country: "Australia",
    qualityRating: 5,
    yieldAssessment: "24% above 10-year average — 45,710 t (similar to 2022)",
    standoutVarieties: "Cabernet Sauvignon, Chardonnay, Shiraz, Sauvignon Blanc",
    conditions: `Western Australia was the standout performer of the 2023 vintage nationally, with the crush remaining very similar to 2022 at 45,710 tonnes — 24% above the 10-year average. While the eastern states were devastated by La Niña rainfall, WA's Mediterranean climate provided excellent growing conditions. Margaret River in particular reported a generally good season, with clean fruit and excellent ripening. The Barossa Valley and Clare Valley in SA also reported mainly positive outcomes, but WA was the clear national star of 2023.`,
    winemakingNotes: `Exceptional vintage for Western Australia, particularly Margaret River. Cabernet Sauvignon showed excellent structure, concentration, and ageing potential. Chardonnay was bright, precise, and well-balanced. This is a vintage to seek out for WA premium reds and whites. Sauvignon Blanc and Semillon blends from Margaret River also excellent.`,
    source: SOURCE_2023,
  },

  {
    region: "Tasmania", year: 2023, state: "TAS", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Below average — 11,762 t (fourth consecutive low-yield year)",
    standoutVarieties: "Pinot Noir, Chardonnay, Riesling",
    conditions: `Tasmania had its fourth consecutive low-yielding vintage in 2023, with an estimated crush of approximately 11,762 tonnes — below the 10-year average. The wet La Niña conditions affected parts of Tasmania, though the state's cool maritime climate provided some buffer against the worst of the disease pressure experienced on the mainland. Despite the low yields, quality was generally good, with cool conditions favouring aromatic precision in Pinot Noir and Chardonnay.`,
    winemakingNotes: `Low yields but good quality. Pinot Noir and Chardonnay from clean parcels showed excellent natural acidity and fine structure. Sparkling wine base material of high quality. The four consecutive low-yield years set the stage for the record 2024 vintage as vines recovered and new plantings came into production.`,
    source: SOURCE_2023,
  },

  {
    region: "Queensland", year: 2023, state: "QLD", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Small base — limited data available",
    standoutVarieties: "Shiraz, Verdelho",
    conditions: `Queensland's 2023 vintage was affected by the national La Niña conditions, though the Granite Belt's high altitude provided some protection. The region reported difficult conditions but managed to produce wines of reasonable quality. Limited state-level data available from Wine Australia due to small respondent base.`,
    winemakingNotes: `Granite Belt Shiraz showed resilience. Limited data available. Small production volumes mean Queensland wines are largely consumed domestically.`,
    source: SOURCE_2023,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2022 — STATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    region: "South Australia", year: 2022, state: "SA", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Near 5-year average — 889,254 t (−15% vs 2021 record; in line with 5yr avg)",
    standoutVarieties: "Shiraz, Cabernet Sauvignon, Grenache, Riesling, Chardonnay",
    conditions: `The 2022 vintage followed the record 2021 harvest and was shaped by a second consecutive La Niña, producing above-average rainfall across much of eastern Australia. November 2021 was Australia's wettest November since records began in 1900. Heavy spring and summer rainfall made vineyard management difficult across many SA regions. Severe hailstorms reduced crop potential in the Barossa and Riverland. A cool summer and low February rainfall generally favoured ripening and provided good conditions for harvesting. The SA crush of 889,254 tonnes was down 15% from the 2021 record but closely in line with the five-year average of 901,062 tonnes. The Riverland saw a decrease but remained the largest single region nationally (32% of national crush).`,
    winemakingNotes: `A return to more typical conditions after the exceptional 2021. Barossa Valley Shiraz and Grenache showed good concentration despite lower yields. Clare Valley Riesling benefited from cool ripening conditions. Adelaide Hills Chardonnay and Sauvignon Blanc showed excellent natural acidity. Hail damage in some Barossa and Riverland blocks required careful fruit selection. Overall a solid, reliable vintage.`,
    source: SOURCE_2022,
  },

  {
    region: "New South Wales", year: 2022, state: "NSW", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "11% below 5-year average — 495,088 t (−14% vs 2021)",
    standoutVarieties: "Shiraz, Chardonnay, Semillon, Cabernet Sauvignon",
    conditions: `NSW experienced significant rainfall challenges in 2022, with the second consecutive La Niña producing above-average rainfall. Substantial flooding occurred on the eastern coast of NSW and southern Queensland in late November/early December 2021. While flooding did not directly affect many vineyards, the heavy ongoing rain made vineyard management difficult. The Riverina and Murray Darling–Swan Hill were impacted by wet conditions. The Hunter Valley managed the conditions reasonably well, while Orange and Mudgee reported mixed outcomes. The NSW crush of 495,088 tonnes was down 14% from 2021 and 11% below the five-year average.`,
    winemakingNotes: `Challenging vintage due to wet conditions. Hunter Valley Semillon showed good resilience — the variety's thin skins and high natural acidity helped manage disease pressure. Orange Chardonnay and Pinot Noir from clean parcels were excellent. Riverina and Murray Darling–Swan Hill bulk production impacted by wet conditions. Careful fruit selection essential.`,
    source: SOURCE_2022,
  },

  {
    region: "Victoria", year: 2022, state: "VIC", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Near 5-year average — 291,847 t (−12% vs 2021; −2% vs 5yr avg)",
    standoutVarieties: "Pinot Noir, Chardonnay, Shiraz, Cabernet Sauvignon",
    conditions: `Victoria experienced its second consecutive wet vintage in 2022, with La Niña conditions producing above-average rainfall. Murray Darling–Swan Hill was impacted by wet conditions, while cool-climate regions including Yarra Valley and Mornington Peninsula managed the conditions reasonably well. The King Valley reported good conditions for Italian varieties. The Victorian crush of 291,847 tonnes was down 12% from 2021 but only 2% below the five-year average. Cool summer conditions generally favoured quality in premium regions.`,
    winemakingNotes: `Cool summer conditions benefited premium cool-climate regions. Yarra Valley Pinot Noir and Chardonnay showed excellent natural acidity and fine structure. Mornington Peninsula also performed well. King Valley Italian varieties (Sangiovese, Pinot Grigio, Prosecco) showed good quality. Murray Darling–Swan Hill bulk production impacted by wet conditions.`,
    source: SOURCE_2022,
  },

  {
    region: "Western Australia", year: 2022, state: "WA", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "16% above 5-year average — 45,546 t (+3% vs 2021)",
    standoutVarieties: "Cabernet Sauvignon, Chardonnay, Shiraz, Sauvignon Blanc",
    conditions: `Western Australia bucked the national trend in 2022, with crush up 3% to 45,546 tonnes — 16% above the five-year average. Wine Australia notes that an improvement in survey participation by WA wineries (from 80 respondents in 2017 to 113 in 2022) accounts for some of the increase. Margaret River reported excellent conditions, with its Mediterranean climate providing a buffer against the La Niña rainfall that affected eastern states. The dry summer conditions in WA favoured clean fruit and excellent ripening.`,
    winemakingNotes: `Excellent vintage for WA, particularly Margaret River. Cabernet Sauvignon showed outstanding structure and concentration. Chardonnay was precise and well-balanced. The contrast between WA's excellent conditions and the challenging eastern states highlights the diversity of Australian wine regions. Margaret River 2022 reds are highly recommended for cellaring.`,
    source: SOURCE_2022,
  },

  {
    region: "Tasmania", year: 2022, state: "TAS", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Below average — third low-yield year; good quality",
    standoutVarieties: "Pinot Noir, Chardonnay, Riesling",
    conditions: `Tasmania experienced its third consecutive below-average yield in 2022, though quality remained high. The cool maritime climate provided excellent conditions for aromatic varieties. Western Tasmania had below-average spring rainfall, while the rest of the state was more variable. Despite the low yields, the 2022 vintage produced wines of excellent quality, with Pinot Noir and Chardonnay showing exceptional natural acidity and fine structure.`,
    winemakingNotes: `Low yields but high quality. Pinot Noir and Chardonnay from Tamar Valley and Coal River Valley showed excellent concentration and natural acidity. Sparkling wine base material of high quality. Riesling showing classic Tasmanian precision. The ongoing low-yield period was building towards the record 2024 harvest.`,
    source: SOURCE_2022,
  },

  {
    region: "Queensland", year: 2022, state: "QLD", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Small base — limited data; affected by La Niña",
    standoutVarieties: "Shiraz, Verdelho",
    conditions: `Queensland was affected by the La Niña conditions in 2022, with flooding occurring on the eastern coast in late November/early December 2021. The Granite Belt's high altitude provided some protection, but the wet conditions made vineyard management challenging. Limited state-level data available.`,
    winemakingNotes: `Granite Belt managed the wet conditions reasonably well due to its altitude and cool temperatures. Verdelho and Shiraz performed adequately. Limited data available.`,
    source: SOURCE_2022,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // 2021 — STATE LEVEL
  // ═══════════════════════════════════════════════════════════════════════════

  {
    region: "South Australia", year: 2021, state: "SA", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Record or near-record crush — 1.04 million t nationally; SA largest contributor",
    standoutVarieties: "Shiraz, Cabernet Sauvignon, Grenache, Riesling, Chardonnay",
    conditions: `The 2021 vintage was a record or near-record year for Australian wine production, with the national crush estimated at approximately 1.74 million tonnes — the largest in many years. South Australia was the largest contributor, accounting for approximately 51% of the national crush. Conditions were generally favourable across most SA regions, with a warm, dry growing season producing excellent fruit quality. The Barossa Valley, McLaren Vale, Clare Valley, and Coonawarra all reported excellent conditions. The Riverland also had a strong year, contributing significantly to the record national crush.`,
    winemakingNotes: `Exceptional vintage for SA. Barossa Valley Shiraz and Grenache of outstanding quality — concentrated, rich, and age-worthy. Clare Valley Riesling showing excellent structure and longevity. McLaren Vale Grenache and Shiraz also excellent. Coonawarra Cabernet Sauvignon of very high quality. The record 2021 vintage set the stage for the subsequent capacity challenges and deliberate production reductions in 2022–24.`,
    source: SOURCE_2021,
  },

  {
    region: "New South Wales", year: 2021, state: "NSW", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Record or near-record — strong recovery after 2020 drought",
    standoutVarieties: "Shiraz, Chardonnay, Semillon, Cabernet Sauvignon",
    conditions: `NSW participated in the 2021 record national harvest, with a strong recovery from the drought-affected 2020 vintage. The Riverina and Murray Darling–Swan Hill drove much of the volume increase. The Hunter Valley reported good conditions for Semillon and Shiraz. Orange and Mudgee also had strong vintages. The end of the multi-year drought provided excellent soil moisture reserves heading into the 2021 growing season.`,
    winemakingNotes: `Strong recovery vintage. Hunter Valley Semillon of excellent quality — good natural acidity and structure for long-term ageing. Orange Chardonnay and Pinot Noir showed excellent concentration. Riverina and Murray Darling–Swan Hill bulk production at record levels. The 2021 vintage created significant tank capacity challenges for wineries heading into 2022.`,
    source: SOURCE_2021,
  },

  {
    region: "Victoria", year: 2021, state: "VIC", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Record or near-record — strong recovery",
    standoutVarieties: "Pinot Noir, Chardonnay, Shiraz, Cabernet Sauvignon",
    conditions: `Victoria participated in the 2021 record national harvest, with Murray Darling–Swan Hill driving much of the volume increase. Cool-climate regions including Yarra Valley and Mornington Peninsula also had excellent vintages. The end of the drought provided excellent soil moisture, and the 2020–21 season had generally favourable growing conditions. The King Valley reported strong conditions for Italian varieties.`,
    winemakingNotes: `Excellent vintage across Victoria. Yarra Valley Pinot Noir and Chardonnay of outstanding quality. Mornington Peninsula also excellent. Murray Darling–Swan Hill bulk production at record levels. The record 2021 vintage created significant capacity challenges for Victorian wineries, contributing to the deliberate production reductions in subsequent years.`,
    source: SOURCE_2021,
  },

  {
    region: "Western Australia", year: 2021, state: "WA", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Strong vintage — continued growth trend",
    standoutVarieties: "Cabernet Sauvignon, Chardonnay, Shiraz, Sauvignon Blanc",
    conditions: `Western Australia had an excellent 2021 vintage, with Margaret River in particular reporting outstanding conditions. The Mediterranean climate provided warm, dry growing conditions that favoured full ripening and clean fruit. WA continued its trend of consistent high-quality production, with crush increasing relative to the 10-year average.`,
    winemakingNotes: `Excellent vintage for WA. Margaret River Cabernet Sauvignon of outstanding quality — rich, concentrated, and age-worthy. Chardonnay showing excellent natural acidity and complexity. WA 2021 reds are highly recommended for cellaring. The state's consistent performance across multiple challenging vintages for eastern states highlights its unique climatic advantages.`,
    source: SOURCE_2021,
  },

  {
    region: "Tasmania", year: 2021, state: "TAS", country: "Australia",
    qualityRating: 4,
    yieldAssessment: "Below national average — first of four low-yield years; high quality",
    standoutVarieties: "Pinot Noir, Chardonnay, Riesling",
    conditions: `Tasmania began a four-year period of below-average yields in 2021, though quality remained high. The cool maritime climate continued to produce wines of exceptional natural acidity and aromatic precision. New vineyard plantings were underway, setting the stage for the record harvests of 2024 and 2025. Despite the low yields, the 2021 vintage produced wines of excellent quality.`,
    winemakingNotes: `Low yields but high quality. Pinot Noir and Chardonnay showing excellent natural acidity and fine structure. Sparkling wine base material of high quality. Riesling and Pinot Gris also performing well. The four-year low-yield period was a result of poor flowering conditions, which resolved dramatically in 2024.`,
    source: SOURCE_2021,
  },

  {
    region: "Queensland", year: 2021, state: "QLD", country: "Australia",
    qualityRating: 3,
    yieldAssessment: "Small base — limited data",
    standoutVarieties: "Shiraz, Verdelho",
    conditions: `Queensland participated in the national 2021 recovery vintage, with the Granite Belt reporting good conditions. The high altitude of the Granite Belt (800–1,000m) continues to provide cool temperatures for quality wine production. Limited state-level data available from Wine Australia.`,
    winemakingNotes: `Granite Belt Shiraz and alternative varieties performed well. Limited data available. Small production volumes.`,
    source: SOURCE_2021,
  },
];

console.log(`\nSeeding ${rows.length} state-level vintage intelligence rows...\n`);

for (const row of rows) {
  await upsert(row);
}

await conn.end();
console.log(`\n✓ Done — ${rows.length} rows processed.\n`);
