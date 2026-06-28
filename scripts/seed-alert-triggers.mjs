import "dotenv/config";
import mysql from "mysql2/promise";

const c = await mysql.createConnection(process.env.DATABASE_URL);

const [users] = await c.execute(
  "SELECT id FROM users WHERE open_id = ? LIMIT 1",
  ["seed-owner-001"]
);
const userId = users[0].id;
console.log(`Seeding ACTIVE-vintage alert triggers for user id=${userId}`);

const now = Date.now();
const hr = 3600 * 1000;
const day = 86400 * 1000;

// Tank 9 (Shiraz) — DAP due: YAN low, no DAP since. Active vintage.
// Tank 5 (Cabernet) — high temp: just measured 24.5°C.
// Tank 2 (Merlot) — ready to rack: Brix at 1.5 today, dry. No racking.
// Tank 8 (Tempranillo) — stuck ferment: Brix stalled at 8 for 3 days.
// Tank 4 (Grenache) — tank quiet: inoculated, last log 7 days ago.
const events = [
  // Tank 9 — DAP due
  { offset: 4 * day, tank: "Tank 9", variety: "Shiraz", type: "inoculation", details: { what: "EC1118 yeast", productName: "Lalvin EC1118", rate: "25", unit: "g/hL" }, note: "Vintage 2026 first ferment" },
  { offset: 2 * day, tank: "Tank 9", variety: "Shiraz", type: "measurement", details: { what: "Brix", value: "21.5", unit: "°Bx" }, note: "" },
  { offset: 1 * day, tank: "Tank 9", variety: "Shiraz", type: "measurement", details: { what: "YAN", value: "130", unit: "ppm" }, note: "Below target — need to add DAP" },

  // Tank 5 — high temp
  { offset: 3 * day, tank: "Tank 5", variety: "Cabernet Sauvignon", type: "inoculation", details: { what: "BDX yeast", productName: "Lalvin BDX", rate: "25", unit: "g/hL" }, note: "" },
  { offset: 6 * hr, tank: "Tank 5", variety: "Cabernet Sauvignon", type: "measurement", details: { what: "Temperature", value: "24.5", unit: "°C" }, note: "Running hot — need to cool" },

  // Tank 2 — ready to rack
  { offset: 14 * day, tank: "Tank 2", variety: "Merlot", type: "inoculation", details: { what: "RC212", productName: "Lalvin RC212" }, note: "" },
  { offset: 18 * hr, tank: "Tank 2", variety: "Merlot", type: "measurement", details: { what: "Brix", value: "1.5", unit: "°Bx" }, note: "Dry — ready to press" },

  // Tank 8 — stuck ferment
  { offset: 8 * day, tank: "Tank 8", variety: "Tempranillo", type: "inoculation", details: { what: "EC1118", productName: "Lalvin EC1118" }, note: "" },
  { offset: 4 * day, tank: "Tank 8", variety: "Tempranillo", type: "measurement", details: { what: "Brix", value: "8.1", unit: "°Bx" }, note: "" },
  { offset: 2 * day, tank: "Tank 8", variety: "Tempranillo", type: "measurement", details: { what: "Brix", value: "8.0", unit: "°Bx" }, note: "Not moving" },
  { offset: 12 * hr, tank: "Tank 8", variety: "Tempranillo", type: "measurement", details: { what: "Brix", value: "7.9", unit: "°Bx" }, note: "Possibly stuck" },

  // Tank 4 — quiet
  { offset: 9 * day, tank: "Tank 4", variety: "Grenache", type: "inoculation", details: { what: "GRE yeast", productName: "Lalvin GRE" }, note: "" },
  { offset: 7 * day, tank: "Tank 4", variety: "Grenache", type: "measurement", details: { what: "Brix", value: "18.0", unit: "°Bx" }, note: "" },
];

const batchId = `alerts-seed-${Date.now()}`;
let inserted = 0;
for (const e of events) {
  const entryAt = now - e.offset;
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
console.log(`✓ Inserted ${inserted} active-vintage entries across Tanks 2/4/5/8/9.`);
await c.end();
