/**
 * Seed the Ownology Cellars demo winery (id=1) with a realistic
 * 2026 Hunter Valley vintage: 10 wine batches + one contextual
 * vintage-log entry + one pending cellar task per batch.
 *
 * Timeline reference: today is early July 2026 in the demo timeline.
 * All whites are through ferment; reds are in MLF or early aging;
 * sparkling has completed tirage; rosé has been bottled.
 *
 * Idempotent — every row is tagged with `[OC-SEED]` in a stable
 * field so re-runs update in place rather than duplicating.
 *
 * Run: `node --env-file=.env scripts/seed-ownology-cellars-vintage.mjs`
 */
import mysql from "mysql2/promise";
import { config } from "dotenv";
config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const now = Date.now();
const day = 86_400_000;

// Seed winery + user identity (set by earlier rename migration)
const WINERY_ID = 1;
const USER_ID = 1;

// ── The 10-wine Ownology Cellars lineup (System 1 naming) ────────────────
// Each wine encodes: variety, wine name (echoes an Ownology page), batch
// state at 3 Jul 2026, one realistic recent event, and one upcoming task.
const WINES = [
  {
    batchId: "26SEM-001", wineName: "First Row", variety: "Semillon",
    receivedAt: new Date("2026-02-06T04:00:00Z").getTime(),
    volumeLitres: 850, currentVolumeLitres: 830, costPerLitre: 480,
    tankName: "Tank 3",
    grower: "Broke-Fordwich vineyard block · Semillon own-roots · 2t/ha",
    quantityValue: "1200", quantityUnit: "kg",
    fermentationNote: "12°C cool ferment · EC1118 · 14 days · dry to 0.0 g/L RS",
    // Recent event: post-MLF blocked (whites don't do MLF), so a stabilising measurement
    logEvent: {
      type: "measurement",
      details: { what: "Free SO₂", value: "32", unit: "ppm" },
      note: "Pre-bottling adjustment target — molecular SO₂ ~0.6ppm at pH 3.05",
      tags: ["SO2", "bottling-prep", "pre-bottling"],
      daysAgo: 2,
    },
    task: {
      taskType: "inspect",
      title: "Semillon 'First Row' — bottling bench trial",
      method: "Bench trial: 3 SO₂ dose rates (25 / 32 / 40 ppm free) x 2 fining trials (nil / Cufex 3 g/hL). Taste blind at 48h. Confirm final adjustment before Aug bottling.",
      frequency: "Once",
      dueInDays: 5,
    },
  },
  {
    batchId: "26CHD-001", wineName: "Free Run", variety: "Chardonnay",
    receivedAt: new Date("2026-02-12T04:00:00Z").getTime(),
    volumeLitres: 600, currentVolumeLitres: 588, costPerLitre: 620,
    tankName: "Barrel Rack A · 3× Burgundy 228L",
    grower: "Pokolbin ridge · Chardonnay P58 · gravity-press free-run only",
    quantityValue: "820", quantityUnit: "kg",
    fermentationNote: "Wild-yeast primary in barrel · 21 days · 30% new French oak · full MLF complete",
    logEvent: {
      type: "measurement",
      details: { what: "Malic acid", value: "0.08", unit: "g/L" },
      note: "MLF confirmed complete. Chromatography clean. Ready to sulfur.",
      tags: ["MLF", "chromatography", "post-ferment"],
      daysAgo: 5,
    },
    task: {
      taskType: "other",
      title: "Chardonnay 'Free Run' — post-MLF SO₂ addition",
      method: "Target 30ppm free after loss to bound; expect 60ppm total addition given pH 3.35. Bâtonnage 1x/week for 8 more weeks then rack off gross lees.",
      frequency: "Once",
      dueInDays: 2,
    },
  },
  {
    batchId: "26VER-001", wineName: "Cellar Journal", variety: "Vermentino",
    receivedAt: new Date("2026-02-22T04:00:00Z").getTime(),
    volumeLitres: 450, currentVolumeLitres: 445, costPerLitre: 380,
    tankName: "Tank 7",
    grower: "Broke sub-region · Vermentino grafted onto Ramsey · 8t/ha",
    quantityValue: "620", quantityUnit: "kg",
    fermentationNote: "14°C stainless · QA23 · 12 days · dry · no MLF (retain acidity)",
    logEvent: {
      type: "measurement",
      details: { what: "TA", value: "6.8", unit: "g/L" },
      note: "Post cold-stab. TA held. Salinity note retained on palate. Ready for prep-fine.",
      tags: ["TA", "cold-stab", "post-stab"],
      daysAgo: 8,
    },
    task: {
      taskType: "other",
      title: "Vermentino 'Cellar Journal' — bentonite heat-stab trial",
      method: "Bench trial: 4 rates (30 / 50 / 70 / 90 g/hL). Boil 30min, chill, check haze. Prefer minimum passing rate to preserve texture.",
      frequency: "Once",
      dueInDays: 3,
    },
  },
  {
    batchId: "26RSL-001", wineName: "Small Hours", variety: "Riesling",
    receivedAt: new Date("2026-03-03T04:00:00Z").getTime(),
    volumeLitres: 500, currentVolumeLitres: 495, costPerLitre: 420,
    tankName: "Tank 9",
    grower: "Mount View elevated site · Riesling · hand-picked at 20°Bx",
    quantityValue: "680", quantityUnit: "kg",
    fermentationNote: "10°C long cool ferment · X5 yeast · stopped at 4 g/L RS · 21 days",
    logEvent: {
      type: "measurement",
      details: { what: "pH", value: "3.02", unit: "" },
      note: "Bracing acid line held. Molecular SO₂ target ~0.8ppm at this pH — easy to protect.",
      tags: ["pH", "acid-balance", "pre-bottling"],
      daysAgo: 6,
    },
    task: {
      taskType: "other",
      title: "Riesling 'Small Hours' — screw-cap oxygen ingress spec",
      method: "Order Saranex tin-liners (low OTR ~0.5mg/L/yr) for slow reductive development. Confirm with bottler 4 weeks before Aug run.",
      frequency: "Once",
      dueInDays: 12,
    },
  },
  {
    batchId: "26SHZ-001", wineName: "The Press", variety: "Shiraz",
    receivedAt: new Date("2026-03-01T04:00:00Z").getTime(),
    volumeLitres: 1200, currentVolumeLitres: 1160, costPerLitre: 720,
    tankName: "Barrel Rack B · 4× hogshead 300L + 1× puncheon 500L",
    grower: "Wollombi Brook · old-vine Shiraz (1968 plantings) · 3.5t/ha",
    quantityValue: "1650", quantityUnit: "kg",
    fermentationNote: "Open-top ferment · RC212 yeast · 12 days on skins · pressed at 0.5°Bx · MLF complete",
    logEvent: {
      type: "addition",
      details: { what: "PMS (potassium metabisulfite)", quantity: "48", unit: "g", timing: "post-MLF" },
      note: "Target 25ppm free after bound losses. Reds heavy in polyphenols bind 40-50% of SO₂ initially.",
      tags: ["SO2", "PMS", "post-MLF", "addition"],
      daysAgo: 4,
    },
    task: {
      taskType: "inspect",
      title: "Shiraz 'The Press' — topping schedule + free SO₂ recheck",
      method: "Top all barrels weekly with reserved topping wine (same lot 30L set-aside). Recheck free SO₂ in 3 weeks — expect 20ppm after bind-down, decide re-adjust.",
      frequency: "Weekly",
      dueInDays: 7,
    },
  },
  {
    batchId: "26CAB-001", wineName: "The Vineyard", variety: "Cabernet Sauvignon",
    receivedAt: new Date("2026-03-15T04:00:00Z").getTime(),
    volumeLitres: 900, currentVolumeLitres: 880, costPerLitre: 680,
    tankName: "Barrel Rack C · 3× American oak 225L",
    grower: "Upper Hunter warm-slope Cab · own vineyard row 12-14",
    quantityValue: "1240", quantityUnit: "kg",
    fermentationNote: "Extended maceration 21 days · CY3079 · pressed to barrel · MLF ongoing",
    logEvent: {
      type: "measurement",
      details: { what: "Malic acid", value: "0.6", unit: "g/L" },
      note: "MLF ~70% complete. Steady progress. Keep cellar at 18°C, no SO₂ additions until <0.15 g/L.",
      tags: ["MLF", "malic", "in-progress"],
      daysAgo: 3,
    },
    task: {
      taskType: "inspect",
      title: "Cabernet 'The Vineyard' — MLF completion check",
      method: "Chromatography every 10 days. When malic <0.15 g/L across 3 barrels, add PMS at 45g/hL total to arrest and set free SO₂ 25ppm.",
      frequency: "Fortnightly",
      dueInDays: 10,
    },
  },
  {
    batchId: "26PNR-001", wineName: "The Curl", variety: "Pinot Noir",
    receivedAt: new Date("2026-02-20T04:00:00Z").getTime(),
    volumeLitres: 400, currentVolumeLitres: 388, costPerLitre: 850,
    tankName: "Barrel 12A · Burgundy 228L (2nd fill)",
    grower: "Bulga cool-pocket · Pinot Noir MV6 · whole-bunch 30%",
    quantityValue: "545", quantityUnit: "kg",
    fermentationNote: "Whole-bunch 30% · foot-tread · wild yeast · 14 days · gentle basket press",
    logEvent: {
      type: "racking",
      details: { fromLocation: "Fermenter 5", toLocation: "Barrel 12A", volumeL: "388", leesStatus: "gross lees left behind" },
      note: "First racking post-primary. Kept 2mm fine lees for texture. Very light-touch move.",
      tags: ["racking", "post-ferment", "lees"],
      daysAgo: 14,
    },
    task: {
      taskType: "inspect",
      title: "Pinot 'The Curl' — MLF start check + bâtonnage plan",
      method: "Warm cellar corner to 20°C to encourage native MLF. Bâtonnage 1x/fortnight for first 2 months post-racking. Taste weekly for reduction — pull cork if H₂S detected.",
      frequency: "Weekly",
      dueInDays: 4,
    },
  },
  {
    batchId: "26NEB-001", wineName: "The Craft", variety: "Nebbiolo",
    receivedAt: new Date("2026-03-25T04:00:00Z").getTime(),
    volumeLitres: 300, currentVolumeLitres: 292, costPerLitre: 780,
    tankName: "Botti 1 · Slavonian oak 500L (neutral)",
    grower: "Denman experimental block · Nebbiolo Lampia · own · 1.8t/ha",
    quantityValue: "410", quantityUnit: "kg",
    fermentationNote: "Long maceration 28 days · pied de cuve · pressed hard · MLF ongoing in botti",
    logEvent: {
      type: "observation",
      details: { text: "Tar/rose aroma emerging. Grippy tannin, still primary red-fruit. Colour surprisingly pale — classic Neb." },
      note: "Aged wine. Long haul ahead. Plan 24+ months in botti before assessing bottling.",
      tags: ["observation", "sensory", "tannin", "aroma"],
      daysAgo: 10,
    },
    task: {
      taskType: "inspect",
      title: "Nebbiolo 'The Craft' — MLF confirmation + botti topping",
      method: "Chromatography monthly. Top botti weekly with reserved topping (kept in demi at cellar temp). Botti is high oxygen — expect faster micro-ox development than barrique.",
      frequency: "Monthly",
      dueInDays: 21,
    },
  },
  {
    batchId: "26SPK-001", wineName: "Convergence", variety: "Chardonnay (Blanc de Blancs base)",
    receivedAt: new Date("2026-01-28T04:00:00Z").getTime(),
    volumeLitres: 500, currentVolumeLitres: 500, costPerLitre: 560,
    tankName: "Tirage cage · 700 bottles horizontal",
    grower: "Cool-site early-harvest Chard · picked at 18°Bx for high acid",
    quantityValue: "680", quantityUnit: "kg",
    fermentationNote: "Base wine to dryness · liqueur de tirage 22g/L sugar · EC1118 · bottled 6 May 2026",
    logEvent: {
      type: "bottling_run",
      details: { volumeL: "500", lotNumber: "26SPK-TIR-01", format: "750ml", labelName: "Convergence — Tirage Batch 1", notes: "Crown cap + bidule; racked to horizontal cage" },
      note: "Second fermentation in bottle underway. Cellar 12°C. Riddle in 18 months (Nov 2027).",
      tags: ["bottling", "tirage", "traditional-method", "in-bottle"],
      daysAgo: 58,
    },
    task: {
      taskType: "inspect",
      title: "Convergence — second-ferment progress check",
      method: "Sample 2 bottles at 30 / 60 / 90 days. Measure pressure (aphrometer) and residual sugar. Target completion: 3-4 bar, RS <2 g/L, by mid-Aug.",
      frequency: "Monthly",
      dueInDays: 15,
    },
  },
  {
    batchId: "26GRE-001", wineName: "First Light", variety: "Grenache Rosé",
    receivedAt: new Date("2026-02-08T04:00:00Z").getTime(),
    volumeLitres: 350, currentVolumeLitres: 0, costPerLitre: 340,
    tankName: "BOTTLED — 465 bottles + 40L keg",
    grower: "Cessnock warm plots · Grenache old-vine · direct-press pale style",
    quantityValue: "480", quantityUnit: "kg",
    fermentationNote: "Direct-press · 12°C · X5 · dry (0.8 g/L RS) · cold-stab · Kieselsol fined · bottled 5 Jun 2026",
    logEvent: {
      type: "bottling_run",
      details: { volumeL: "350", lotNumber: "26GRE-BOT-01", format: "750ml + 20L keg", labelName: "First Light — Grenache Rosé 2026", notes: "Screwcap · 30ppm free SO₂ · 20 dz released to trade" },
      note: "First bottled wine of the season. Pink so pale it looks Provence-adjacent. Ready to drink.",
      tags: ["bottling", "released", "rosé"],
      daysAgo: 28,
    },
    task: {
      taskType: "other",
      title: "First Light Rosé — release-day check + tasting notes upload",
      method: "Open a bottle. Confirm: no bottle shock, correct SO₂ headspace, screwcap seal integrity. Upload tasting note to Cellar Journal for the vintage record.",
      frequency: "Once",
      dueInDays: 1,
    },
  },
];

// ── Idempotent upsert helpers ────────────────────────────────────────────

async function upsertBatch(w) {
  const notesJson = JSON.stringify({
    receival: `[OC-SEED] ${w.wineName} · ${w.grower}`,
    fermentation: w.fermentationNote,
    postFerment: "",
    stabilising: "",
    bottling: "",
  });
  const existing = await conn.execute(
    "SELECT id FROM wine_batches WHERE winery_id=? AND batch_id=?",
    [WINERY_ID, w.batchId]
  );
  if (existing[0].length) {
    const id = existing[0][0].id;
    await conn.execute(
      `UPDATE wine_batches
         SET variety=?, vintage=2026, gi='Hunter Valley', grower_details=?,
             received_at=?, quantity_value=?, quantity_unit=?, tank_name=?,
             volume_litres=?, current_volume_litres=?, cost_per_litre=?,
             notes_json=?, updated_at=?
       WHERE id=?`,
      [w.variety, w.grower, w.receivedAt, w.quantityValue, w.quantityUnit,
       w.tankName, w.volumeLitres, w.currentVolumeLitres, w.costPerLitre,
       notesJson, now, id]
    );
    return { id, action: "updated" };
  }
  const [r] = await conn.execute(
    `INSERT INTO wine_batches
       (user_id, winery_id, batch_id, vintage, variety, gi, grower_details,
        received_at, quantity_value, quantity_unit, tank_name,
        volume_litres, current_volume_litres, cost_per_litre,
        notes_json, created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [USER_ID, WINERY_ID, w.batchId, 2026, w.variety, "Hunter Valley", w.grower,
     w.receivedAt, w.quantityValue, w.quantityUnit, w.tankName,
     w.volumeLitres, w.currentVolumeLitres, w.costPerLitre,
     notesJson, now, now]
  );
  return { id: r.insertId, action: "inserted" };
}

async function upsertLogEntry(w) {
  const entryAt = now - w.logEvent.daysAgo * day;
  const tags = JSON.stringify([`[OC-SEED]`, `batch:${w.batchId}`, ...w.logEvent.tags]);
  const details = JSON.stringify(w.logEvent.details);
  // Idempotency: match on (winery_id, tank, event_type, tag)
  const [existing] = await conn.execute(
    `SELECT id FROM vintage_log_entries
       WHERE winery_id=? AND tank_name=? AND event_type=?
         AND tags_json LIKE ?`,
    [WINERY_ID, w.tankName, w.logEvent.type, `%batch:${w.batchId}%`]
  );
  if (existing.length) {
    await conn.execute(
      `UPDATE vintage_log_entries
         SET details_json=?, note_text=?, tags_json=?, entry_at=?
       WHERE id=?`,
      [details, w.logEvent.note, tags, entryAt, existing[0].id]
    );
    return { action: "updated" };
  }
  await conn.execute(
    `INSERT INTO vintage_log_entries
       (user_id, winery_id, tank_name, variety, event_type,
        details_json, note_text, tags_json, entry_at, created_at)
     VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [USER_ID, WINERY_ID, w.tankName, w.variety, w.logEvent.type,
     details, w.logEvent.note, tags, entryAt, now]
  );
  return { action: "inserted" };
}

async function upsertTask(w) {
  const dueAt = now + w.task.dueInDays * day;
  const titleWithMarker = `${w.task.title}`;
  const methodWithMarker = `[OC-SEED · batch:${w.batchId}] ${w.task.method}`;
  const equipmentName = w.tankName;
  const [existing] = await conn.execute(
    `SELECT id FROM cellar_tasks
       WHERE winery_id=? AND title=? AND task_type=?`,
    [WINERY_ID, titleWithMarker, w.task.taskType]
  );
  if (existing.length) {
    await conn.execute(
      `UPDATE cellar_tasks
         SET method_notes=?, frequency=?, due_at=?, equipment_name=?, updated_at=?
       WHERE id=?`,
      [methodWithMarker, w.task.frequency, dueAt, equipmentName, now, existing[0].id]
    );
    return { action: "updated" };
  }
  await conn.execute(
    `INSERT INTO cellar_tasks
       (user_id, winery_id, equipment_name, task_type, title,
        method_notes, frequency, due_at, ai_generated,
        created_at, updated_at)
     VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
    [USER_ID, WINERY_ID, equipmentName, w.task.taskType, titleWithMarker,
     methodWithMarker, w.task.frequency, dueAt, 0, now, now]
  );
  return { action: "inserted" };
}

// ── Run ──────────────────────────────────────────────────────────────────

try {
  console.log(`Seeding ${WINES.length} Ownology Cellars 2026 vintage wines...\n`);
  for (const w of WINES) {
    const b = await upsertBatch(w);
    const l = await upsertLogEntry(w);
    const t = await upsertTask(w);
    console.log(`  ${w.batchId} ${w.wineName.padEnd(15)} · batch ${b.action} · log ${l.action} · task ${t.action}`);
  }
  const [counts] = await conn.execute(
    `SELECT
       (SELECT COUNT(*) FROM wine_batches WHERE winery_id=?) AS batches,
       (SELECT COUNT(*) FROM vintage_log_entries WHERE winery_id=?) AS entries,
       (SELECT COUNT(*) FROM cellar_tasks WHERE winery_id=? AND completed_at IS NULL) AS pending_tasks`,
    [WINERY_ID, WINERY_ID, WINERY_ID]
  );
  console.log(`\nOwnology Cellars totals: ${JSON.stringify(counts[0])}`);
} finally {
  await conn.end();
}
