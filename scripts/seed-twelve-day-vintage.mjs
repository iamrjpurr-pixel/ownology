/**
 * seed-twelve-day-vintage.mjs — Feb 2026 vintage scenario seed.
 *
 * Populates the Cellar Brief engine with a realistic, climate-region
 * anchored 12-day vintage spread for the dev/demo winery. The scenario
 * is designed to exercise EVERY branch of the Cellar Brief engine so
 * the /cellar-brief page renders meaningful content out of the box:
 *
 *   Tank 1 · Shiraz (red)        → primary_active, HEALTHY trajectory
 *                                  (cold soak day 0–2, inoc day 3, dropping
 *                                  ~3°Bx/day, currently mid-ferment)
 *   Tank 2 · Chardonnay (white)  → primary_active, WATCH (slow but in band)
 *                                  (press day 0, settle 1d, inoc day 2,
 *                                  cool ~1.2°Bx/day, sulphidic observation)
 *   Tank 3 · Shiraz (red)        → primary_slowing, ATTENTION (STUCK)
 *                                  (inoc day 1, dropped quickly to Brix 4,
 *                                  then 4 days of <0.3°Bx/day movement,
 *                                  high-temp event on day 6 → 29°C)
 *   Tank 4 · Pinot Noir (red)    → mlf_active (post-press, MLF inoculated)
 *                                  (started 90 days ago, pressed 25 days
 *                                  ago, MLF inoc 20 days ago, in progress)
 *
 * Climate context: winery.region = "Adelaide Hills" — a cool-climate
 * Australian region currently mid-vintage in Feb 2026. The Wine Bible
 * grounding refs (resolved via WBS codes in the engine) automatically
 * pick the right red/white chapters.
 *
 * Run: node scripts/seed-twelve-day-vintage.mjs
 *
 * Idempotent: deletes any prior `seed-12day-*` import batches first so
 * re-runs don't double-up the data.
 */
import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

// ── Resolve the demo user + their winery ──────────────────────────────────
const [users] = await c.execute(
  "SELECT id, winery_id FROM users WHERE open_id = ? LIMIT 1",
  ["seed-owner-001"]
);
if (users.length === 0) {
  console.error("seed-owner-001 user not found — hit the app once first so the bypass auth provisions the user, then re-run.");
  await c.end();
  process.exit(1);
}
const userId = users[0].id;
let wineryId = users[0].winery_id;
if (!wineryId) {
  const [wRows] = await c.execute(
    "SELECT id FROM wineries WHERE owner_user_id = ? ORDER BY id LIMIT 1",
    [userId]
  );
  if (wRows.length === 0) {
    console.error("No winery found for seed-owner-001 — server bootstrap should auto-create one. Hit the app once and re-run.");
    await c.end();
    process.exit(1);
  }
  wineryId = wRows[0].id;
  await c.execute("UPDATE users SET winery_id = ? WHERE id = ?", [wineryId, userId]);
}
console.log(`Seeding 12-day vintage for user=${userId} winery=${wineryId}`);

// Anchor the winery to a real Australian cool-climate region so the engine
// can later use regional context. Idempotent — only sets if NULL.
await c.execute(
  "UPDATE wineries SET region = COALESCE(region, ?) WHERE id = ?",
  ["Adelaide Hills", wineryId]
);

// ── Clean prior runs of this script ───────────────────────────────────────
await c.execute(
  "DELETE FROM vintage_log_entries WHERE winery_id = ? AND import_batch_id LIKE 'seed-12day-%'",
  [wineryId]
);

// ── Time scaffolding ──────────────────────────────────────────────────────
const now = Date.now();
const day = 86400 * 1000;
const hr = 3600 * 1000;
const batchId = `seed-12day-${Date.now()}`;

/**
 * Insert helper. `offsetHours` is hours-ago-from-now (positive number).
 * Larger offset = further in the past.
 */
async function ins({ offsetHours, tank, variety, type, details, note }) {
  const entryAt = now - offsetHours * hr;
  const tagList = [variety.toLowerCase().replace(/\s+/g, "-"), type, tank.replace(/\s+/g, "-").toLowerCase()];
  await c.execute(
    `INSERT INTO vintage_log_entries
       (user_id, winery_id, tank_name, variety, event_type, details_json,
        note_text, tags_json, entry_at, import_source, import_batch_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId, wineryId, tank, variety, type,
      JSON.stringify(details), note ?? null, JSON.stringify(tagList),
      entryAt, "seed", batchId, now,
    ]
  );
}

// ─────────────────────────────────────────────────────────────────────────
// TANK 1 — Shiraz, HEALTHY red primary, currently mid-ferment.
// Cold soak d0–2, inoc d3 morning, dropping ~3°Bx/day, day 5 currently
// Brix ~11. Healthy trajectory → status ok / watch.
// ─────────────────────────────────────────────────────────────────────────
await ins({ offsetHours: 12 * 24, tank: "Tank 1", variety: "Shiraz",
  type: "measurement",
  details: { what: "Brix", value: "24.6", unit: "°Bx" },
  note: "Receival sample — Adelaide Hills Shiraz, clean fruit" });
await ins({ offsetHours: 12 * 24 - 4, tank: "Tank 1", variety: "Shiraz",
  type: "measurement",
  details: { what: "pH", value: "3.55" },
  note: "Receival pH" });
await ins({ offsetHours: 12 * 24 - 6, tank: "Tank 1", variety: "Shiraz",
  type: "measurement",
  details: { what: "TA", value: "6.2", unit: "g/L" } });
await ins({ offsetHours: 11 * 24, tank: "Tank 1", variety: "Shiraz",
  type: "measurement",
  details: { what: "YAN", value: "215", unit: "ppm" },
  note: "Adequate — no DAP needed" });
await ins({ offsetHours: 10 * 24, tank: "Tank 1", variety: "Shiraz",
  type: "observation",
  details: { text: "Cold soak day 2 — colour developing well, cap firm" } });
await ins({ offsetHours: 9 * 24, tank: "Tank 1", variety: "Shiraz",
  type: "inoculation",
  details: { what: "Yeast", productName: "Lalvin EC1118", ratePerHL: "25g" },
  note: "Hydrated with GoFerm; pitched at 16°C" });
// Daily Brix from day 9 → day 0 (today), dropping ~3°Bx/day
const t1Brix = [
  [9 * 24 - 6, 24.0, 18, "Inoc lag — pre-fermentation"],
  [8 * 24, 22.5, 19, "Lag breaking"],
  [7 * 24, 19.2, 21, "Active ferment under way"],
  [6 * 24, 16.1, 24, "Healthy drop — temp climbing"],
  [5 * 24, 13.0, 25, null],
  [4 * 24, 11.0, 25, "Mid-ferment, cap thick"],
];
for (const [hOff, brix, temp, note] of t1Brix) {
  await ins({ offsetHours: hOff, tank: "Tank 1", variety: "Shiraz",
    type: "measurement",
    details: { what: "Brix", value: String(brix), unit: "°Bx" },
    note });
  await ins({ offsetHours: hOff, tank: "Tank 1", variety: "Shiraz",
    type: "measurement",
    details: { what: "Temperature", value: String(temp), unit: "°C" } });
}
await ins({ offsetHours: 7 * 24 - 1, tank: "Tank 1", variety: "Shiraz",
  type: "addition",
  details: { what: "DAP", quantity: "300", unit: "g" },
  note: "Maintenance split — 1/3 sugar depletion" });
await ins({ offsetHours: 2 * 24, tank: "Tank 1", variety: "Shiraz",
  type: "observation",
  details: { text: "Two pump-overs done; cap soft, good colour" } });

// ─────────────────────────────────────────────────────────────────────────
// TANK 2 — Chardonnay, COOL-CLIMATE WHITE primary, slow but in band.
// Pressed at receival (white flow), settled 24h at 10°C, inoc cool 14°C.
// Slow drop ~1.2°Bx/day (white-band: 0.8–4.0). Status ok / watch.
// One sulphidic note added day 4 → engine should NOT flag it (only logged).
// ─────────────────────────────────────────────────────────────────────────
await ins({ offsetHours: 12 * 24, tank: "Tank 2", variety: "Chardonnay",
  type: "measurement",
  details: { what: "Brix", value: "22.2", unit: "°Bx" },
  note: "Receival — whole-bunch press juice" });
await ins({ offsetHours: 12 * 24 - 1, tank: "Tank 2", variety: "Chardonnay",
  type: "racking",
  details: { fromLocation: "Press tray", toLocation: "Tank 2", volumeL: "950", leesStatus: "gross lees expected" },
  note: "Press to settling tank — white flow" });
await ins({ offsetHours: 11 * 24, tank: "Tank 2", variety: "Chardonnay",
  type: "measurement",
  details: { what: "Temperature", value: "10", unit: "°C" },
  note: "Holding cold for debourbage" });
await ins({ offsetHours: 11 * 24, tank: "Tank 2", variety: "Chardonnay",
  type: "measurement",
  details: { what: "Turbidity", value: "180", unit: "NTU" } });
await ins({ offsetHours: 10 * 24, tank: "Tank 2", variety: "Chardonnay",
  type: "measurement",
  details: { what: "YAN", value: "185", unit: "ppm" } });
await ins({ offsetHours: 10 * 24 - 1, tank: "Tank 2", variety: "Chardonnay",
  type: "inoculation",
  details: { what: "Yeast", productName: "Lalvin QA23", ratePerHL: "20g" },
  note: "Cool aromatic — target 14°C" });
// Slow daily Brix — 1.2°Bx/day in the white-healthy band
const t2Brix = [
  [9 * 24, 21.8, 14],
  [8 * 24, 20.4, 15],
  [7 * 24, 19.0, 15],
  [6 * 24, 17.8, 15],
  [5 * 24, 16.5, 15],
  [4 * 24, 15.2, 16],
  [3 * 24, 14.0, 16],
  [2 * 24, 12.6, 16],
  [1 * 24, 11.4, 16],
];
for (const [hOff, brix, temp] of t2Brix) {
  await ins({ offsetHours: hOff, tank: "Tank 2", variety: "Chardonnay",
    type: "measurement",
    details: { what: "Brix", value: String(brix), unit: "°Bx" } });
  await ins({ offsetHours: hOff, tank: "Tank 2", variety: "Chardonnay",
    type: "measurement",
    details: { what: "Temperature", value: String(temp), unit: "°C" } });
}
await ins({ offsetHours: 5 * 24, tank: "Tank 2", variety: "Chardonnay",
  type: "observation",
  details: { text: "Light sulphidic note on day 5 sample — copper bench trial planned" },
  note: "Watch — schedule copper trial" });

// ─────────────────────────────────────────────────────────────────────────
// TANK 3 — Shiraz, STUCK FERMENT, ATTENTION.
// Inoc d11, dropped to Brix 4 by d6, then 5 days of <0.3°Bx/day movement.
// High-temp spike on d6 (29°C). Brix 3.5 now → primary_slowing + stuck.
// Engine should classify: primary_slowing, status=attention, decision="Possible stuck ferment".
// ─────────────────────────────────────────────────────────────────────────
await ins({ offsetHours: 12 * 24, tank: "Tank 3", variety: "Shiraz",
  type: "measurement",
  details: { what: "Brix", value: "25.4", unit: "°Bx" },
  note: "Receival — higher Baume than Tank 1" });
await ins({ offsetHours: 12 * 24 - 2, tank: "Tank 3", variety: "Shiraz",
  type: "measurement",
  details: { what: "pH", value: "3.72" } });
await ins({ offsetHours: 11 * 24, tank: "Tank 3", variety: "Shiraz",
  type: "measurement",
  details: { what: "YAN", value: "140", unit: "ppm" },
  note: "Low — split DAP planned" });
await ins({ offsetHours: 11 * 24, tank: "Tank 3", variety: "Shiraz",
  type: "addition",
  details: { what: "DAP", quantity: "400", unit: "g" },
  note: "First split — pre-inoculation" });
await ins({ offsetHours: 11 * 24 - 2, tank: "Tank 3", variety: "Shiraz",
  type: "inoculation",
  details: { what: "Yeast", productName: "Lalvin RC212", ratePerHL: "25g" },
  note: "Rehydrated with GoFerm" });
// Healthy start, then runs into trouble
const t3Brix = [
  [10 * 24, 23.0, 22, null],
  [9 * 24, 19.5, 25, "Active — temp rising"],
  [8 * 24, 14.0, 28, "Hot — fans on"],
  [7 * 24, 8.0, 29, "29°C — cooling jacket on"],
  [6 * 24, 5.0, 27, null],
  // Stalled from here on
  [5 * 24, 4.2, 24, "Movement slowing"],
  [4 * 24, 4.0, 22, "Barely dropping"],
  [3 * 24, 3.8, 22, "Same"],
  [2 * 24, 3.7, 21, "Stalled — taste flat"],
  [1 * 24, 3.6, 21, "Still stuck"],
  [4, 3.5, 21, "This morning — no further movement" /* 4h ago */],
];
for (const [hOff, brix, temp, note] of t3Brix) {
  await ins({ offsetHours: hOff, tank: "Tank 3", variety: "Shiraz",
    type: "measurement",
    details: { what: "Brix", value: String(brix), unit: "°Bx" },
    note });
  await ins({ offsetHours: hOff, tank: "Tank 3", variety: "Shiraz",
    type: "measurement",
    details: { what: "Temperature", value: String(temp), unit: "°C" } });
}
await ins({ offsetHours: 6 * 24 - 1, tank: "Tank 3", variety: "Shiraz",
  type: "addition",
  details: { what: "DAP", quantity: "400", unit: "g" },
  note: "Second split — but ferment hit by heat" });
await ins({ offsetHours: 2 * 24, tank: "Tank 3", variety: "Shiraz",
  type: "observation",
  details: { text: "Smelled for VA / H₂S — no off notes; ferment just exhausted" },
  note: "Pre-restart investigation" });

// ─────────────────────────────────────────────────────────────────────────
// TANK 4 — Pinot Noir, MLF ACTIVE (post-press).
// Earlier batch: receival 90d ago, primary done, pressed 25d ago, MLF
// inoculated 20d ago. Engine should classify: mlf_active.
// ─────────────────────────────────────────────────────────────────────────
await ins({ offsetHours: 90 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "measurement",
  details: { what: "Brix", value: "23.2", unit: "°Bx" },
  note: "Receival" });
await ins({ offsetHours: 88 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "inoculation",
  details: { what: "Yeast", productName: "Lalvin RC212", ratePerHL: "20g" },
  note: "Pinot-friendly strain" });
for (const [d, brix] of [[85, 21], [82, 15], [78, 8], [75, 3], [73, 1.2]]) {
  await ins({ offsetHours: d * 24, tank: "Tank 4", variety: "Pinot Noir",
    type: "measurement",
    details: { what: "Brix", value: String(brix), unit: "°Bx" } });
}
await ins({ offsetHours: 25 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "racking",
  details: { fromLocation: "Tank 4", toLocation: "Tank 4", volumeL: "780", leesStatus: "pressed off skins" },
  note: "Press complete — dry at 0.5°Bx" });
await ins({ offsetHours: 20 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "inoculation",
  details: { what: "MLF — Oenococcus oeni", productName: "Lalvin VP41", ratePerHL: "1g" },
  note: "MLF inoculation — holding 20°C" });
await ins({ offsetHours: 14 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "measurement",
  details: { what: "Malic acid", value: "1.4", unit: "g/L" },
  note: "Mid-MLF — paper chromatography" });
await ins({ offsetHours: 5 * 24, tank: "Tank 4", variety: "Pinot Noir",
  type: "measurement",
  details: { what: "Malic acid", value: "0.6", unit: "g/L" },
  note: "Approaching completion" });

// ── Done ──────────────────────────────────────────────────────────────────
const [count] = await c.execute(
  "SELECT COUNT(*) AS c FROM vintage_log_entries WHERE winery_id = ? AND import_batch_id = ?",
  [wineryId, batchId]
);
console.log(`✓ Inserted ${count[0].c} entries across 4 tanks (batch=${batchId})`);

// Clear any cached briefs so the next /cellar-brief load regenerates fresh.
await c.execute("DELETE FROM cellar_briefs WHERE winery_id = ?", [wineryId]);
console.log("✓ Cleared cellar_briefs cache for this winery — next load will regenerate.");

await c.end();
console.log("\nNext: hit /cellar-brief in the app to see the brief.");
