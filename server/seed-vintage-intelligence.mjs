/**
 * Seed script: Vintage Intelligence 2024 Australian Vintage Data
 * Run with: node server/seed-vintage-intelligence.mjs
 *
 * Sources:
 * - Wine Australia National Vintage Report 2024
 * - Barossa Australia Vintage Report 2024 (Louisa Rose, Yalumba)
 * - WA Wines / Wine WA Margaret River Vintage Report 2024
 * - Wine Australia SA Winegrape Crush Survey 2024 — McLaren Vale Regional Summary
 * - Hunter Valley Wine and Tourism Association #V24 Vintage Overview
 * - Yering Station Vintage Summary 2024 / Levantine Hill Vintage 2024 Wrap-Up
 */

import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq, and } from "drizzle-orm";
import dotenv from "dotenv";
dotenv.config();

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  waitForConnections: true,
  connectionLimit: 5,
});

// Minimal schema definition for the seed
const { mysqlTable, varchar, int, text, bigint } = await import("drizzle-orm/mysql-core");

const vintageIntelligence = mysqlTable("vintage_intelligence", {
  id: int("id").autoincrement().primaryKey(),
  region: varchar("region", { length: 128 }).notNull(),
  year: int("year").notNull(),
  state: varchar("state", { length: 10 }).notNull(),
  country: varchar("country", { length: 64 }).notNull().default("Australia"),
  conditions: text("conditions").notNull(),
  standoutVarieties: varchar("standout_varieties", { length: 512 }),
  qualityRating: int("quality_rating").notNull().default(3),
  yieldAssessment: varchar("yield_assessment", { length: 256 }),
  winemakingNotes: text("winemaking_notes"),
  source: varchar("source", { length: 512 }),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

const db = drizzle(pool, { mode: "default" });

const SEED_DATA = [
  {
    region: "Australia (National)",
    year: 2024,
    state: "National",
    country: "Australia",
    conditions: `After 2023 saw the lowest crush in more than 20 years, the 2024 vintage recovered by 9 per cent nationally, though it remained well below the 10-year average. The season was characterised by a dry winter and spring across most major regions, leading to early bud burst, compressed harvest windows, and variable yields. Disease pressure was generally low due to dry conditions. Most regions experienced earlier-than-average harvests. Quality across the board was rated highly, with small berry size contributing to concentration and intensity.`,
    standoutVarieties: "Grenache, Shiraz, Semillon, Riesling, Chardonnay",
    qualityRating: 4,
    yieldAssessment: "Below average — national crush up 9% on 2023 but still well below 10-year average",
    winemakingNotes: `Small berry size from dry conditions means higher skin-to-juice ratios — monitor extraction carefully during fermentation. Early harvest timing compressed winery schedules across most regions. Low disease pressure meant cleaner fruit at intake. Yields 10–40% below average in many regions, so tank utilisation planning important.`,
    source: "Wine Australia National Vintage Report 2024",
  },
  {
    region: "Barossa Valley",
    year: 2024,
    state: "SA",
    country: "Australia",
    conditions: `After a long and late 2023 vintage, 2024 proved to be quite the opposite. Winter had below-average rainfall (-28% Barossa Valley). Spring was even drier (only 56 mm in Barossa Valley, -52% of average). Damaging frosts in September and October caused significant yield damage in some vineyards. Bud burst started three weeks earlier than 2023. A heat spike in mid-November caused issues with flowering and fruit set in some vineyards. December and early January brought some rain and slightly cooler days, allowing vines to flourish and move quickly into ripening. Veraison was a month earlier than 2023. February had no rain and temperatures 2°C above average — harvest was away. Most varieties picked before Easter (end of March), with only late-ripening varieties and sites picking into April. An unseasonal heatwave in early March caused short-lived concern but vines recovered well. Quality across the board looks exceptional, although yields were variable. Depending on site and variety, crops are anywhere between 50 and 90% of normal.`,
    standoutVarieties: "Grenache, Cabernet Sauvignon, Eden Valley Riesling, Semillon, Shiraz",
    qualityRating: 5,
    yieldAssessment: "Variable — 50–90% of normal depending on site and variety",
    winemakingNotes: `Whites ripened quickly, retaining good fragrance and natural acids — pick early to preserve aromatics. Reds show small berries with intensity and vibrancy — high skin-to-juice ratio means careful extraction management. Grenache and Cabernet are particular standouts. Compressed harvest window — scheduling critical. Low disease pressure throughout season.`,
    source: "Barossa Australia Vintage Report 2024 (prepared by Louisa Rose, Yalumba)",
  },
  {
    region: "Eden Valley",
    year: 2024,
    state: "SA",
    country: "Australia",
    conditions: `Eden Valley received -20% winter rainfall and -76% spring rainfall (119 mm for the season). The dry winter and spring led to early bud burst. Frosts in September and October affected some sites. February temperatures were 1.3°C above average, driving rapid ripening. Whites ripened quickly with excellent acid retention due to the elevated altitude and cooler nights. Eden Valley whites described as "electric" — great natural acids and fine aromas. Riesling stands out as the headline variety.`,
    standoutVarieties: "Riesling, Shiraz, Viognier, Semillon",
    qualityRating: 5,
    yieldAssessment: "Variable — similar to Barossa Valley, frost-affected in some sites",
    winemakingNotes: `Eden Valley whites are "electric" — great natural acids and fine aromas. Riesling stands out as the headline variety. Elevated site altitude helps retain natural acidity even in warm years. Small berry size from dry conditions — monitor extraction on reds. Harvest timing critical as ripening was rapid.`,
    source: "Barossa Australia Vintage Report 2024 (Eden Valley section, prepared by Louisa Rose, Yalumba)",
  },
  {
    region: "McLaren Vale",
    year: 2024,
    state: "SA",
    country: "Australia",
    conditions: `McLaren Vale experienced average winter rainfall and a mild winter. Early spring was drier than normal, with higher-than-average daily temperatures and colder-than-average nights, leading to frost damage in some low-lying vineyards (particularly around Kangarilla and along Pedler Creek) and delayed bud burst. Low disease pressure resulted from the dry conditions. From mid-November, rain fell and cool-to-mild temperatures combined with a high wind event and an unusual day reaching 40°C in some vineyards created challenging conditions. Extended flowering due to cooler-than-normal temperatures occurred in October–November. Summer was the wettest since 2002, with rainfall through December and into January. Rain eased in January and was not felt again through autumn. From late January, temperatures climbed and the combination of high temperatures and small bunches (due to poor set) resulted in a short veraison period. Hot dry conditions resulted in a compacted vintage — whites picked in the first two weeks, majority of reds harvested before early Easter. Late-ripening reds including Grenache were picked post-Easter. Total crush was 28,242 tonnes, up 7% on 2023 but 12% below the 5-year average.`,
    standoutVarieties: "Grenache, Fiano, Sangiovese, Shiraz",
    qualityRating: 4,
    yieldAssessment: "Below average — crush 28,242 tonnes, down 12% on 5-year average",
    winemakingNotes: `Grenache crops fared well — good set and veraison occurring after main heat extremes, with higher yields than most varieties. Small bunches from poor set mean high skin-to-juice ratios on reds — monitor extraction carefully. Whites and rosé came in with near-perfect ripeness and great balance. New plantings include 11 ha Grenache, 4 ha Sangiovese, 7 ha Fiano — watch for first commercial volumes of Fiano from this region. Compacted harvest window required careful scheduling.`,
    source: "Wine Australia SA Winegrape Crush Survey 2024 — McLaren Vale Regional Summary Report (July 2024)",
  },
  {
    region: "Margaret River",
    year: 2024,
    state: "WA",
    country: "Australia",
    conditions: `The 2024 vintage in Margaret River was the earliest on record. The cool, wet 2023 winter disappeared quickly and was replaced by a dry, warm spring. Above-average temperatures and almost no rainfall led to early bud burst and perfect growing conditions. Canopy growth was good, and flowering occurred early and went through quickly, leading to good berry set in most varieties. Low disease pressure throughout the season. Consistent above-average temperatures led to early veraison in all varieties — colour could be seen in Cabernet Sauvignon and Shiraz in late December. White grape harvest began in mid-January, four weeks earlier than usual. Vintage was compressed and fast-paced. Precision in harvest timing was crucial as optimal ripeness came and went quickly. Whites were generally picked over two weeks instead of the typical four weeks. An abundant and prolonged marri (Corymbia calophylla) blossom season ("mast year") kept silvereye birds away from vineyards, reducing bird damage. Overall yields approximately 8% down on 2023 and 2% below the 5-year average.`,
    standoutVarieties: "Chardonnay, Sauvignon Blanc, Semillon, Cabernet Sauvignon",
    qualityRating: 5,
    yieldAssessment: "Below average — approximately 8% down on 2023, 2% below 5-year average",
    winemakingNotes: `Whites exceeded expectations with clarity, freshness, and surprisingly good natural acidity — a true strength of Margaret River even in warm years. Cabernet was more challenging and required real rigour in vineyard and winery to achieve best results, but best sites show lovely perfume, varietal expression, and trademark fine tannin. Lower yields in some varieties led to concentration of aromas and flavours. Compressed harvest window required skilful scheduling of vineyard and winery teams. For irrigated vineyards, the dry growing season required early and frequent irrigation.`,
    source: "WA Wines / Wine WA — Margaret River Vintage Report 2024 (April 2024)",
  },
  {
    region: "Hunter Valley",
    year: 2024,
    state: "NSW",
    country: "Australia",
    conditions: `The 2024 growing season in the Hunter Valley was defined by a sustained period of dry weather that led to small crops but wines of high quality. The lack of rain, coupled with hot and windy conditions during the critical flowering period, further contributed to low yields. These factors resulted in accelerated ripening, bringing about one of the earliest starts to harvest in living memory. Harvest concluded in the first half of February, approximately three weeks earlier than 2023. The dry weather provided a stress-free harvest period, albeit compressed. Old-vine Semillon blocks were most affected by the yield reduction. Yields across the Hunter Valley were down by 30–40%.`,
    standoutVarieties: "Semillon, Shiraz, Verdelho, Chardonnay",
    qualityRating: 5,
    yieldAssessment: "Significantly below average — yields down 30–40% across the region",
    winemakingNotes: `Semillon shows added depth and richness similar to the celebrated 2014 vintage — exceptional ageing potential. Shiraz displays remarkable intensity and concentration with deep colour, robust tannins, and rich layered flavours. Verdelho and Chardonnay exhibit full flavours and soft acids, highly approachable upon release. Yields down 30–40% — tank utilisation and blending plans need adjustment. One of the earliest harvests on record — winery scheduling brought forward significantly.`,
    source: "Hunter Valley Wine and Tourism Association — #V24 Vintage Overview (April 2024)",
  },
  {
    region: "Yarra Valley",
    year: 2024,
    state: "VIC",
    country: "Australia",
    conditions: `The Yarra Valley 2024 vintage was characterised by high rainfall and humidity over spring and summer, creating challenging conditions that required intensive vineyard management. Despite these challenges, moderate temperatures during flowering and fruit set in October and November created ideal conditions for fruit development. The season was compressed, with reds coming off thick and fast in the final weeks. The wettest December/January growing season was followed by the driest conditions through harvest. High-vigour vines set the stage for good cane pruning material going into the season. Fruit quality described as "really fantastic" with excellent Chardonnay and Pinot Noir. Shiraz and Cabernet show ripe fruit, silky tannin, and good flavour.`,
    standoutVarieties: "Chardonnay, Pinot Noir, Shiraz, Cabernet Sauvignon",
    qualityRating: 4,
    yieldAssessment: "Average to slightly below average",
    winemakingNotes: `The wet spring/summer required vigilant disease management — botrytis pressure higher than in drier regions. Compressed harvest window in the final weeks. Small, concentrated berries from the dry finish to the season. All varieties described as looking "amazing" with no single standout — broad quality across the spectrum.`,
    source: "Yering Station Vintage Summary 2024; Levantine Hill Vintage 2024 Wrap-Up (April 2024)",
  },
  {
    region: "Mudgee",
    year: 2024,
    state: "NSW",
    country: "Australia",
    conditions: `Mudgee experienced a dry growing season similar to other NSW regions, with below-average rainfall leading to small crops. The elevated altitude of the region (450–850m) provided cooler nights that helped retain natural acidity despite warm days. Early harvest timing consistent with other NSW regions. Good concentration from low yields.`,
    standoutVarieties: "Shiraz, Cabernet Sauvignon, Chardonnay",
    qualityRating: 4,
    yieldAssessment: "Below average — dry conditions reduced yields",
    winemakingNotes: `Elevated site altitude helps retain natural acidity. Small berry size from dry conditions — monitor extraction on reds. Good concentration from low yields.`,
    source: "Wine Australia National Vintage Report 2024 (NSW regional data)",
  },
  {
    region: "Orange",
    year: 2024,
    state: "NSW",
    country: "Australia",
    conditions: `Orange's high altitude (600–1,100m) provided a cooler growing season than lower NSW regions. The dry conditions that affected most of NSW were present, though the altitude moderated temperature extremes. Harvest timing was earlier than average but less compressed than lower-altitude regions. Orange Sauvignon Blanc and Chardonnay particularly benefit from cool-climate conditions even in warm years.`,
    standoutVarieties: "Sauvignon Blanc, Chardonnay, Pinot Noir, Shiraz",
    qualityRating: 4,
    yieldAssessment: "Below average",
    winemakingNotes: `High altitude preserves natural acidity and aromatic freshness. Orange Sauvignon Blanc and Chardonnay particularly benefit from cool-climate conditions even in warm years. Pinot Noir shows good colour and structure from small berries.`,
    source: "Wine Australia National Vintage Report 2024 (NSW regional data)",
  },
  {
    region: "Canberra District",
    year: 2024,
    state: "NSW",
    country: "Australia",
    conditions: `The Canberra District experienced a dry growing season with frost risk in spring. The cool continental climate moderated the heat of the 2024 season, with altitude and inland position providing good diurnal temperature variation. Harvest was earlier than average. Canberra District Riesling retains excellent natural acidity from cool nights. Shiraz shows peppery, cool-climate character even in warm years.`,
    standoutVarieties: "Riesling, Shiraz, Cabernet Sauvignon, Pinot Gris",
    qualityRating: 4,
    yieldAssessment: "Below average — frost risk and dry conditions",
    winemakingNotes: `Canberra District Riesling retains excellent natural acidity from cool nights. Shiraz shows peppery, cool-climate character even in warm years. Frost management critical in spring — some yield loss in lower-lying sites.`,
    source: "Wine Australia National Vintage Report 2024",
  },
];

async function seed() {
  console.log("🍇 Seeding vintage intelligence data...");
  const now = Date.now();
  let inserted = 0;
  let updated = 0;

  for (const entry of SEED_DATA) {
    // Check if exists
    const existing = await db
      .select({ id: vintageIntelligence.id })
      .from(vintageIntelligence)
      .where(
        and(
          eq(vintageIntelligence.region, entry.region),
          eq(vintageIntelligence.year, entry.year)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(vintageIntelligence)
        .set({
          state: entry.state,
          country: entry.country,
          conditions: entry.conditions,
          standoutVarieties: entry.standoutVarieties,
          qualityRating: entry.qualityRating,
          yieldAssessment: entry.yieldAssessment,
          winemakingNotes: entry.winemakingNotes,
          source: entry.source,
          updatedAt: now,
        })
        .where(eq(vintageIntelligence.id, existing[0].id));
      console.log(`  ✓ Updated: ${entry.region} ${entry.year}`);
      updated++;
    } else {
      await db.insert(vintageIntelligence).values({
        ...entry,
        createdAt: now,
        updatedAt: now,
      });
      console.log(`  ✓ Inserted: ${entry.region} ${entry.year}`);
      inserted++;
    }
  }

  console.log(`\n✅ Done — ${inserted} inserted, ${updated} updated`);
  await pool.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
