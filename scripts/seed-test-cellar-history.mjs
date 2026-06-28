import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

// Find the seed-owner-001 user
const [users] = await c.execute(
  "SELECT id FROM users WHERE open_id = ? LIMIT 1",
  ["seed-owner-001"]
);
if (users.length === 0) {
  console.error("seed-owner-001 user not found — make a request first.");
  await c.end();
  process.exit(1);
}
const userId = users[0].id;
console.log(`Seeding test cellar history for user id=${userId}`);

const now = Date.now();
const day = 86400 * 1000;
const sampleEntries = [
  { offset: 90, tank: "Tank 7", variety: "Shiraz", type: "measurement", details: { what: "Brix", value: "24.3", unit: "°Bx" }, note: "Day 1 measurement at crush — Orange region grapes" },
  { offset: 89, tank: "Tank 7", variety: "Shiraz", type: "measurement", details: { what: "YAN", value: "120", unit: "ppm" }, note: "Below 200ppm target" },
  { offset: 89, tank: "Tank 7", variety: "Shiraz", type: "addition", details: { what: "DAP", quantity: "0.6", unit: "kg" }, note: "Split addition planned — 50% at 1/3 sugar depletion" },
  { offset: 88, tank: "Tank 7", variety: "Shiraz", type: "inoculation", details: { what: "Lalvin EC1118", productName: "Lalvin EC1118", ratePerHL: "25g" }, note: "Hydrated with GoFerm" },
  { offset: 86, tank: "Tank 7", variety: "Shiraz", type: "measurement", details: { what: "Brix", value: "18.5", unit: "°Bx" }, note: "1/3 sugar depleted — second DAP addition" },
  { offset: 86, tank: "Tank 7", variety: "Shiraz", type: "addition", details: { what: "DAP", quantity: "0.6", unit: "kg" }, note: "Second split per plan" },
  { offset: 82, tank: "Tank 7", variety: "Shiraz", type: "measurement", details: { what: "Brix", value: "2.0", unit: "°Bx" }, note: "Dry — ready to press" },
  { offset: 81, tank: "Tank 7", variety: "Shiraz", type: "racking", details: { fromLocation: "Tank 7", toLocation: "Tank 12", volumeL: "850", leesStatus: "gross lees left behind" }, note: "Press complete, transferred to maturation" },
  { offset: 60, tank: "Tank 12", variety: "Shiraz", type: "inoculation", details: { what: "MLF — Lalvin VP41", productName: "VP41" }, note: "MLF inoculation post-press" },
  { offset: 30, tank: "Tank 12", variety: "Shiraz", type: "measurement", details: { what: "Malic acid", value: "0.1", unit: "g/L" }, note: "MLF complete by paper chromatography" },
  { offset: 95, tank: "Tank 3", variety: "Chardonnay", type: "measurement", details: { what: "Brix", value: "22.8", unit: "°Bx" }, note: "Cold-soaked overnight" },
  { offset: 94, tank: "Tank 3", variety: "Chardonnay", type: "inoculation", details: { what: "EC1118", productName: "Lalvin EC1118" }, note: "Cool ferment target 16°C" },
  { offset: 80, tank: "Tank 3", variety: "Chardonnay", type: "observation", details: { text: "Sulphidic note appeared" }, note: "H2S detected — copper trial planned" },
  { offset: 65, tank: "Tank 3", variety: "Chardonnay", type: "addition", details: { what: "Bentonite", quantity: "60", unit: "g/hL" }, note: "Heat test failed — protein stabilising" },
  { offset: 120, tank: "Tank 1", variety: "Pinot Noir", type: "measurement", details: { what: "pH", value: "3.65" }, note: "2024 vintage — Yarra Valley fruit" },
  { offset: 119, tank: "Tank 1", variety: "Pinot Noir", type: "addition", details: { what: "Tartaric acid", quantity: "1.2", unit: "g/L" }, note: "Acid adjustment to pH 3.50" },
];

const batchId = `seed-${Date.now()}`;
let inserted = 0;
for (const e of sampleEntries) {
  const entryAt = now - e.offset * day;
  await c.execute(
    `INSERT INTO vintage_log_entries
       (user_id, tank_name, variety, event_type, details_json, note_text, tags_json,
        entry_at, import_source, import_batch_id, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      userId,
      e.tank,
      e.variety,
      e.type,
      JSON.stringify(e.details),
      e.note,
      JSON.stringify([e.variety.toLowerCase(), e.type, e.tank.replace(/\s+/g, "")]),
      entryAt,
      "paste",
      batchId,
      now,
    ]
  );
  inserted++;
}
console.log(`✓ Inserted ${inserted} test vintage_log entries.`);

const [count] = await c.execute(
  "SELECT COUNT(*) as c FROM vintage_log_entries WHERE user_id = ?",
  [userId]
);
console.log(`Total entries now for seed-owner-001: ${count[0].c}`);
await c.end();
