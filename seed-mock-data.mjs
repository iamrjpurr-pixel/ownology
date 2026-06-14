/**
 * OWNOLOGY — Mock Data Seed Script
 * Populates Sprint 1 & 2 tables with realistic 2026 vintage data for a
 * boutique Barossa Valley winery (Redstone Ridge Wines).
 *
 * Run: node seed-mock-data.mjs
 * Safe to re-run: checks for existing data before inserting.
 */

import mysql from "mysql2/promise";
import * as dotenv from "dotenv";
dotenv.config();

const DB_URL = process.env.DATABASE_URL;
if (!DB_URL) throw new Error("DATABASE_URL not set");

// ─── Helpers ──────────────────────────────────────────────────────────────────
const now = Date.now();
const daysAgo = (d) => now - d * 86_400_000;
const daysFromNow = (d) => now + d * 86_400_000;

// Parse mysql2 connection from DATABASE_URL
function parseUrl(url) {
  const u = new URL(url);
  return {
    host: u.hostname,
    port: Number(u.port) || 3306,
    user: u.username,
    password: u.password,
    database: u.pathname.replace(/^\//, ""),
    ssl: { rejectUnauthorized: false },
  };
}

// ─── Winery context ───────────────────────────────────────────────────────────
// We seed against userId = 1 (the owner account).
// If no user exists yet, we create a placeholder.
const OWNER_USER_ID = 1;

// ─── Tanks (used as tankName in vintage_log_entries) ─────────────────────────
const TANKS = [
  { name: "Tank 1",  variety: "Shiraz",       gi: "Barossa Valley", grower: "Kalimna Estate, Para Rd, Nuriootpa SA 5355" },
  { name: "Tank 2",  variety: "Grenache",      gi: "Barossa Valley", grower: "Seppeltsfield Rd Growers, Seppeltsfield SA 5355" },
  { name: "Tank 3",  variety: "Cabernet Sauvignon", gi: "Coonawarra", grower: "Wynns Block 3, Memorial Drive, Coonawarra SA 5263" },
  { name: "Tank 4",  variety: "Kit Wine",      gi: "South Australia", grower: "Cellar Craft Premium Kit — Merlot" },
];

// ─── Batch IDs ────────────────────────────────────────────────────────────────
const BATCHES = [
  { batchId: "26SHZ-001", tankName: "Tank 1", variety: "Shiraz",       vintage: 2026, gi: "Barossa Valley", volumeLitres: 4200, grower: "Kalimna Estate, Para Rd, Nuriootpa SA 5355",             quantityValue: "6800", quantityUnit: "kg", receivedAt: daysAgo(84) },
  { batchId: "26GRN-001", tankName: "Tank 2", variety: "Grenache",     vintage: 2026, gi: "Barossa Valley", volumeLitres: 2800, grower: "Seppeltsfield Rd Growers, Seppeltsfield SA 5355",       quantityValue: "4500", quantityUnit: "kg", receivedAt: daysAgo(77) },
  { batchId: "26CAB-001", tankName: "Tank 3", variety: "Cabernet Sauvignon", vintage: 2026, gi: "Coonawarra", volumeLitres: 3500, grower: "Wynns Block 3, Memorial Drive, Coonawarra SA 5263", quantityValue: "5600", quantityUnit: "kg", receivedAt: daysAgo(70) },
  { batchId: "26KIT-001", tankName: "Tank 4", variety: "Kit Wine",     vintage: 2026, gi: "South Australia", volumeLitres: 23,  grower: "Cellar Craft Premium Kit — Merlot",                    quantityValue: "23",   quantityUnit: "L",  receivedAt: daysAgo(28) },
];

// ─── Vintage log entries ──────────────────────────────────────────────────────
// Realistic 12-week fermentation arc for Tank 1 (Shiraz) — most complete
// Shorter arcs for Tank 2 (Grenache) and Tank 3 (Cab Sauv)
// Kit Wine arc for Tank 4

function makeEntry(tankName, variety, eventType, details, note, daysBack, tags) {
  return {
    userId: OWNER_USER_ID,
    tankName,
    variety,
    eventType,
    detailsJson: JSON.stringify(details),
    noteText: note || null,
    tagsJson: JSON.stringify(tags || []),
    entryAt: daysAgo(daysBack),
    createdAt: daysAgo(daysBack),
  };
}

const LOG_ENTRIES = [
  // ── Tank 1 — Shiraz ─────────────────────────────────────────────────────────
  // Pre-harvest sample
  makeEntry("Tank 1", "Shiraz", "pre_harvest_sample",
    { blockName: "Kalimna Block 7", brix: "24.8", ta: "6.2", ph: "3.41", yan: "145", phenolics: "ripe", notes: "Seeds fully brown, skin tannins silky. Ready to pick." },
    "Picked 3 days later — ideal window.", 87, ["pre-harvest", "Brix 24.8", "pH 3.41"]),

  // Inoculation
  makeEntry("Tank 1", "Shiraz", "inoculation",
    { what: "yeast", productName: "Lalvin RC212", ratePerHL: "25" },
    "Rehydrated with GoFerm Protect Evolution at 37°C. Temp 18°C at inoculation.", 84, ["inoculation", "RC212", "Lalvin"]),

  // Measurements — daily Brix arc
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "23.1", unit: "°Brix" }, null, 83, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "21.4", unit: "°Brix" }, null, 82, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Temperature", value: "22.3", unit: "°C" }, "Peaked overnight — adjusted cooling.", 82, ["temperature", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "18.9", unit: "°Brix" }, null, 81, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "16.2", unit: "°Brix" }, null, 80, ["Brix", "measurement"]),

  // DAP addition at 1/3 sugar depletion
  makeEntry("Tank 1", "Shiraz", "addition",
    { what: "DAP (diammonium phosphate)", quantity: "2.6", unit: "kg", timing: "⅓ sugar depletion" },
    "YAN was 145 ppm — targeting 200 ppm. Added as slurry in warm water.", 80, ["DAP", "YAN", "nutrient addition"]),

  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "13.1", unit: "°Brix" }, null, 79, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "9.8", unit: "°Brix" }, null, 78, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "5.2", unit: "°Brix" }, null, 77, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "1.9", unit: "°Brix" }, null, 76, ["Brix", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Brix", value: "-0.4", unit: "°Brix" }, "Fermentation complete.", 75, ["Brix", "dry", "measurement"]),

  // Free SO2 measurement
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "Free SO₂", value: "8", unit: "mg/L" }, "Low — needs SO₂ addition before racking.", 74, ["SO₂", "free SO₂", "measurement"]),

  // SO2 addition
  makeEntry("Tank 1", "Shiraz", "addition",
    { what: "Potassium Metabisulphite (K-meta)", quantity: "85", unit: "g", timing: "post-ferment" },
    "Targeting 35 mg/L free SO₂ at pH 3.41. Added as 10% solution.", 74, ["K-meta", "SO₂", "addition"]),

  // Sensory observation
  makeEntry("Tank 1", "Shiraz", "observation",
    { text: "Deep purple-black. Intense blackberry, dark plum, cracked pepper. Tannins grippy but ripe. Good length. Classic Barossa Shiraz profile." },
    null, 73, ["observation", "sensory", "colour"]),

  // Racking — gross lees
  makeEntry("Tank 1", "Shiraz", "racking",
    { fromLocation: "Tank 1", toLocation: "Tank 1 (clean)", volumeL: "4050", leesStatus: "gross lees" },
    "Left 150L of gross lees behind. Clean wine transferred.", 70, ["racking", "gross lees"]),

  // MLF inoculation
  makeEntry("Tank 1", "Shiraz", "inoculation",
    { what: "MLF bacteria", productName: "Lalvin VP41", ratePerHL: "1" },
    "Co-inoculation timing missed — inoculating post-AF. Temp raised to 20°C.", 69, ["MLF", "VP41", "inoculation"]),

  // TA measurement mid-MLF
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "TA", value: "5.8", unit: "g/L" }, "MLF progressing — TA dropping.", 55, ["TA", "MLF", "measurement"]),
  makeEntry("Tank 1", "Shiraz", "measurement", { what: "TA", value: "5.1", unit: "g/L" }, "MLF complete — paper chromatography confirmed.", 42, ["TA", "MLF complete", "measurement"]),

  // Post-MLF SO2
  makeEntry("Tank 1", "Shiraz", "addition",
    { what: "Potassium Metabisulphite (K-meta)", quantity: "120", unit: "g", timing: "post-MLF" },
    "Targeting 40 mg/L free SO₂ for winter storage. pH now 3.52.", 42, ["K-meta", "SO₂", "post-MLF"]),

  // Racking to barrel
  makeEntry("Tank 1", "Shiraz", "racking",
    { fromLocation: "Tank 1 (clean)", toLocation: "B-001, B-002, B-003, B-004 (French oak)", volumeL: "3800", leesStatus: "fine lees" },
    "4 × 225L barriques + 3400L back to tank. Fine lees retained.", 35, ["racking", "barrel", "fine lees"]),

  // Barrel observation
  makeEntry("Tank 1", "Shiraz", "observation",
    { text: "Toasty vanilla integrating well. Fruit still dominant. Tannins softening. On track for 18-month barrel program." },
    null, 14, ["observation", "barrel", "sensory"]),

  // Bottling run (lot traceability test)
  makeEntry("Tank 1", "Shiraz", "bottling_run",
    { volumeL: "3200", lotNumber: "26SHZ-001-BTL-A", format: "750mL Bordeaux", labelName: "Redstone Ridge Shiraz 2026", notes: "First bottling run. Sterile filtered. 35 mg/L free SO₂ confirmed." },
    "920 cases. Labelled and palletised.", 7, ["bottling", "lot 26SHZ-001-BTL-A", "Shiraz 2026"]),

  // ── Tank 2 — Grenache ────────────────────────────────────────────────────────
  makeEntry("Tank 2", "Grenache", "inoculation",
    { what: "yeast", productName: "Lalvin 71B", ratePerHL: "20" },
    "Whole-bunch component 30%. Temp 16°C at inoculation.", 77, ["inoculation", "71B", "whole bunch"]),

  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "22.4", unit: "°Brix" }, null, 76, ["Brix", "measurement"]),
  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "19.1", unit: "°Brix" }, null, 75, ["Brix", "measurement"]),
  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "14.3", unit: "°Brix" }, null, 74, ["Brix", "measurement"]),

  makeEntry("Tank 2", "Grenache", "addition",
    { what: "Tartaric Acid", quantity: "18", unit: "kg", timing: "mid-ferment" },
    "pH was 3.68 — too high for Grenache. Targeting 3.45.", 73, ["tartaric acid", "pH adjustment", "addition"]),

  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "8.2", unit: "°Brix" }, null, 73, ["Brix", "measurement"]),
  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "2.1", unit: "°Brix" }, null, 72, ["Brix", "measurement"]),
  makeEntry("Tank 2", "Grenache", "measurement", { what: "Brix", value: "-0.2", unit: "°Brix" }, "Dry.", 71, ["Brix", "dry", "measurement"]),

  makeEntry("Tank 2", "Grenache", "observation",
    { text: "Pale ruby. Lifted strawberry, rose petal, white pepper. Light body, fine tannins. Excellent Grenache character." },
    null, 65, ["observation", "sensory"]),

  makeEntry("Tank 2", "Grenache", "racking",
    { fromLocation: "Tank 2", toLocation: "Tank 2 (clean)", volumeL: "2700", leesStatus: "gross lees" },
    null, 63, ["racking", "gross lees"]),

  makeEntry("Tank 2", "Grenache", "measurement", { what: "Free SO₂", value: "32", unit: "mg/L" }, "Good — no addition needed.", 28, ["SO₂", "measurement"]),

  // Pre-harvest sample (for next vintage planning)
  makeEntry("Tank 2", "Grenache", "pre_harvest_sample",
    { blockName: "Seppeltsfield Block 12", brix: "23.2", ta: "5.8", ph: "3.55", yan: "118", phenolics: "developing", notes: "Needs another 5-7 days. Phenolic ripeness not quite there." },
    "Picked 6 days after this sample.", 84, ["pre-harvest", "Brix 23.2", "Grenache"]),

  // ── Tank 3 — Cabernet Sauvignon ──────────────────────────────────────────────
  makeEntry("Tank 3", "Cabernet Sauvignon", "inoculation",
    { what: "yeast", productName: "Lalvin CY3079", ratePerHL: "25" },
    "Extended maceration planned — 28 days skin contact.", 70, ["inoculation", "CY3079", "Coonawarra"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "24.1", unit: "°Brix" }, null, 69, ["Brix", "measurement"]),
  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "20.8", unit: "°Brix" }, null, 68, ["Brix", "measurement"]),
  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "16.2", unit: "°Brix" }, null, 67, ["Brix", "measurement"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "addition",
    { what: "DAP (diammonium phosphate)", quantity: "3.1", unit: "kg", timing: "⅓ sugar depletion" },
    "YAN 138 ppm — targeting 210 ppm for Cab.", 67, ["DAP", "YAN", "addition"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "addition",
    { what: "Oak Chips (French, medium toast)", quantity: "2.5", unit: "kg", timing: "mid-ferment" },
    "Adds complexity during fermentation. Remove at press.", 65, ["oak chips", "addition"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "10.1", unit: "°Brix" }, null, 65, ["Brix", "measurement"]),
  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "4.4", unit: "°Brix" }, null, 64, ["Brix", "measurement"]),
  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "0.8", unit: "°Brix" }, null, 63, ["Brix", "measurement"]),
  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Brix", value: "-0.3", unit: "°Brix" }, "Dry. Extending maceration.", 62, ["Brix", "dry", "extended maceration"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "observation",
    { text: "Dense ruby-black. Cassis, cedar, graphite, dark chocolate. Tannins firm and structured — needs time. Classic Coonawarra Cab profile." },
    null, 56, ["observation", "sensory", "extended maceration"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "racking",
    { fromLocation: "Tank 3", toLocation: "B-005, B-006, B-007, B-008 (French oak)", volumeL: "3350", leesStatus: "fine lees" },
    "Pressed at 28 days. 4 × 225L barriques + 2450L back to tank.", 42, ["racking", "press", "barrel"]),

  makeEntry("Tank 3", "Cabernet Sauvignon", "measurement", { what: "Free SO₂", value: "28", unit: "mg/L" }, "Slightly low — addition scheduled.", 21, ["SO₂", "measurement"]),

  // ── Tank 4 — Kit Wine ────────────────────────────────────────────────────────
  makeEntry("Tank 4", "Kit Wine", "inoculation",
    { what: "yeast", productName: "Included kit yeast (EC-1118)", ratePerHL: "20" },
    "Reconstituted juice bag. Added bentonite sachet at inoculation as per kit instructions. 23L carboy.", 28, ["inoculation", "kit wine", "EC-1118"]),

  makeEntry("Tank 4", "Kit Wine", "measurement", { what: "SG (Specific Gravity)", value: "1.082", unit: "SG" }, null, 27, ["SG", "measurement", "kit wine"]),
  makeEntry("Tank 4", "Kit Wine", "measurement", { what: "SG (Specific Gravity)", value: "1.048", unit: "SG" }, null, 25, ["SG", "measurement"]),
  makeEntry("Tank 4", "Kit Wine", "measurement", { what: "SG (Specific Gravity)", value: "1.012", unit: "SG" }, null, 23, ["SG", "measurement"]),
  makeEntry("Tank 4", "Kit Wine", "measurement", { what: "SG (Specific Gravity)", value: "0.998", unit: "SG" }, "Fermentation complete.", 21, ["SG", "dry", "measurement"]),

  makeEntry("Tank 4", "Kit Wine", "addition",
    { what: "Potassium Sorbate", quantity: "3.75", unit: "g", timing: "post-ferment stabilisation" },
    "Kit step: add sorbate + K-meta together to prevent re-fermentation.", 21, ["sorbate", "stabilisation", "kit wine"]),

  makeEntry("Tank 4", "Kit Wine", "addition",
    { what: "Potassium Metabisulphite (K-meta)", quantity: "3", unit: "g", timing: "post-ferment stabilisation" },
    "Added with sorbate as per kit instructions.", 21, ["K-meta", "SO₂", "kit wine"]),

  makeEntry("Tank 4", "Kit Wine", "addition",
    { what: "Kieselsol (fining agent)", quantity: "30", unit: "mL", timing: "fining" },
    "Kit step: add kieselsol, stir vigorously. Chitosan to follow in 2 hours.", 18, ["fining", "kieselsol", "kit wine"]),

  makeEntry("Tank 4", "Kit Wine", "observation",
    { text: "Clearing well. Pale ruby colour. Cherry, plum, light vanilla. Clean and approachable. Kit wine performing as expected." },
    null, 14, ["observation", "sensory", "kit wine"]),
];

// ─── Barrels ──────────────────────────────────────────────────────────────────
const BARRELS = [
  // Shiraz barrels (B-001 to B-004)
  { barrelId: "B-001", oakType: "French", format: "Barrique (225L)", ageYears: 0, fillDate: daysAgo(35), lastToppedDate: daysAgo(14), wineLot: "26SHZ-001", notes: "New French oak, Seguin Moreau. Medium+ toast. Shiraz 2026.", isActive: true },
  { barrelId: "B-002", oakType: "French", format: "Barrique (225L)", ageYears: 1, fillDate: daysAgo(35), lastToppedDate: daysAgo(14), wineLot: "26SHZ-001", notes: "1yo French oak. Medium toast. Shiraz 2026.", isActive: true },
  { barrelId: "B-003", oakType: "French", format: "Barrique (225L)", ageYears: 2, fillDate: daysAgo(35), lastToppedDate: daysAgo(7),  wineLot: "26SHZ-001", notes: "2yo French oak. Shiraz 2026.", isActive: true },
  { barrelId: "B-004", oakType: "American", format: "Barrique (225L)", ageYears: 1, fillDate: daysAgo(35), lastToppedDate: daysAgo(7), wineLot: "26SHZ-001", notes: "1yo American oak. Adds coconut/vanilla. Shiraz 2026 trial.", isActive: true },
  // Cabernet barrels (B-005 to B-008)
  { barrelId: "B-005", oakType: "French", format: "Barrique (225L)", ageYears: 0, fillDate: daysAgo(42), lastToppedDate: daysAgo(21), wineLot: "26CAB-001", notes: "New French oak, Taransaud. Heavy toast. Cabernet 2026.", isActive: true },
  { barrelId: "B-006", oakType: "French", format: "Barrique (225L)", ageYears: 1, fillDate: daysAgo(42), lastToppedDate: daysAgo(21), wineLot: "26CAB-001", notes: "1yo French oak. Cabernet 2026.", isActive: true },
  { barrelId: "B-007", oakType: "French", format: "Hogshead (300L)", ageYears: 2, fillDate: daysAgo(42), lastToppedDate: daysAgo(14), wineLot: "26CAB-001", notes: "2yo French hogshead. Cabernet 2026.", isActive: true },
  { barrelId: "B-008", oakType: "Hungarian", format: "Barrique (225L)", ageYears: 0, fillDate: daysAgo(42), lastToppedDate: daysAgo(14), wineLot: "26CAB-001", notes: "New Hungarian oak trial. Cabernet 2026.", isActive: true },
];

// ─── Cellar Equipment ─────────────────────────────────────────────────────────
const EQUIPMENT = [
  { name: "Tank 1", equipmentType: "fermentation_tank", material: "stainless", capacityL: 5000, quantity: 1, notes: "Variable capacity tank. Fitted with cooling jacket and pneumatic lid." },
  { name: "Tank 2", equipmentType: "fermentation_tank", material: "stainless", capacityL: 3500, quantity: 1, notes: "Open-top fermenter. Used for Grenache whole-bunch." },
  { name: "Tank 3", equipmentType: "fermentation_tank", material: "stainless", capacityL: 4000, quantity: 1, notes: "Variable capacity. Extended maceration tank." },
  { name: "Tank 4 (Carboy)", equipmentType: "fermentation_tank", material: "other", capacityL: 23, quantity: 1, notes: "23L glass carboy for home winemaking / kit wine." },
  { name: "Bladder Press", equipmentType: "press", material: "stainless", capacityL: 2000, quantity: 1, notes: "Bucher Vaslin 20HL. Last serviced March 2026." },
  { name: "Peristaltic Pump", equipmentType: "pump", material: "stainless", capacityL: null, quantity: 2, notes: "Mono pumps × 2. Used for all transfers." },
  { name: "French Oak Barrels", equipmentType: "barrel", material: "wood", capacityL: 225, quantity: 6, notes: "Mix of new and 1yo. Seguin Moreau and Taransaud." },
  { name: "American Oak Barrels", equipmentType: "barrel", material: "wood", capacityL: 225, quantity: 2, notes: "1yo American oak. Bourbon barrel origin." },
  { name: "Destemmer-Crusher", equipmentType: "destemmer", material: "stainless", capacityL: null, quantity: 1, notes: "Diemme 50HL/hr. Annual service due June 2026." },
  { name: "Cold Room", equipmentType: "cold_room", material: "other", capacityL: null, quantity: 1, notes: "Holds 8°C. Used for cold stabilisation and storage." },
];

// ─── Cellar Tasks ─────────────────────────────────────────────────────────────
const TASKS = [
  // Completed tasks
  { equipmentName: "Tank 1", taskType: "clean", title: "Post-ferment clean — Tank 1", methodNotes: "1. Rinse with cold water to remove gross lees. 2. Hot caustic wash (2% NaOH, 65°C, 20 min). 3. Rinse × 3. 4. Citric acid rinse (0.5%). 5. Final cold water rinse. 6. Drain and leave open.", frequency: "After use", dueAt: daysAgo(70), completedAt: daysAgo(69), completedBy: "James R.", aiGenerated: 1, vesselId: "Tank 1", vesselType: "tank" },
  { equipmentName: "Bladder Press", taskType: "clean", title: "Post-press clean — Bladder Press", methodNotes: "1. Remove all pomace. 2. Rinse bladder and drum with cold water. 3. Hot water rinse (60°C). 4. Inspect bladder for tears. 5. Leave drain open overnight.", frequency: "After use", dueAt: daysAgo(69), completedAt: daysAgo(68), completedBy: "Sarah M.", aiGenerated: 1, vesselId: null, vesselType: null },
  { equipmentName: "Peristaltic Pump", taskType: "sanitise", title: "Pre-transfer sanitise — Pump 1", methodNotes: "1. Flush with cold water. 2. Circulate 100ppm SO₂ solution for 5 min. 3. Drain. 4. Flush with wine-grade water. Ready for use.", frequency: "Before use", dueAt: daysAgo(35), completedAt: daysAgo(35), completedBy: "James R.", aiGenerated: 1, vesselId: null, vesselType: null },
  { equipmentName: "Tank 2", taskType: "clean", title: "Post-ferment clean — Tank 2", methodNotes: "1. Remove whole bunches and pomace. 2. Hot caustic wash. 3. Triple rinse. 4. Citric acid rinse. 5. Final rinse.", frequency: "After use", dueAt: daysAgo(63), completedAt: daysAgo(62), completedBy: "Sarah M.", aiGenerated: 1, vesselId: "Tank 2", vesselType: "tank" },
  // Pending tasks
  { equipmentName: "Tank 3", taskType: "clean", title: "Post-racking clean — Tank 3", methodNotes: "1. Rinse with cold water. 2. Hot caustic wash (2% NaOH, 65°C). 3. Triple rinse. 4. Citric acid rinse. 5. Drain.", frequency: "After use", dueAt: daysAgo(5), completedAt: null, completedBy: null, aiGenerated: 1, vesselId: "Tank 3", vesselType: "tank" },
  { equipmentName: "French Oak Barrels", taskType: "maintain", title: "Barrel topping — B-001 to B-004", methodNotes: "1. Check ullage on each barrel. 2. Top with same-lot wine to exclude air. 3. Re-bung securely. 4. Record date in barrel log. Target: top every 2 weeks.", frequency: "Fortnightly", dueAt: daysAgo(0), completedAt: null, completedBy: null, aiGenerated: 1, vesselId: "B-001", vesselType: "barrel" },
  { equipmentName: "French Oak Barrels", taskType: "maintain", title: "Barrel topping — B-005 to B-008", methodNotes: "1. Check ullage. 2. Top with same-lot Cabernet. 3. Re-bung. 4. Record.", frequency: "Fortnightly", dueAt: daysAgo(0), completedAt: null, completedBy: null, aiGenerated: 1, vesselId: "B-005", vesselType: "barrel" },
  { equipmentName: "Destemmer-Crusher", taskType: "maintain", title: "Annual service — Destemmer-Crusher", methodNotes: "1. Inspect roller bearings. 2. Check destemmer cage for wear. 3. Lubricate all grease points. 4. Test run at low speed. 5. Service record to be filed.", frequency: "Annual", dueAt: daysFromNow(14), completedAt: null, completedBy: null, aiGenerated: 0, vesselId: null, vesselType: null },
  { equipmentName: "Cold Room", taskType: "inspect", title: "Cold room temperature check", methodNotes: "1. Verify thermostat reading matches calibrated probe. 2. Check door seals. 3. Log temperature in cellar diary.", frequency: "Weekly", dueAt: daysFromNow(2), completedAt: null, completedBy: null, aiGenerated: 0, vesselId: null, vesselType: null },
  { equipmentName: "Tank 4 (Carboy)", taskType: "sanitise", title: "Carboy sanitise before racking", methodNotes: "1. Rinse with cold water. 2. Dissolve 1/4 tsp K-meta in 1L water, swirl to coat. 3. Drain. 4. Do not rinse — residual SO₂ protects wine.", frequency: "Before use", dueAt: daysFromNow(7), completedAt: null, completedBy: null, aiGenerated: 1, vesselId: "Tank 4", vesselType: "tank" },
];

// ─── Tank Reminders ───────────────────────────────────────────────────────────
const REMINDERS = [
  { tankName: "Tank 1", eventType: "measurement", thresholdHours: 48, isActive: true },
  { tankName: "Tank 2", eventType: "measurement", thresholdHours: 72, isActive: true },
  { tankName: "Tank 3", eventType: "any",         thresholdHours: 168, isActive: true },
  { tankName: "Tank 4", eventType: "measurement", thresholdHours: 48, isActive: true },
];

// ─── Main seed function ───────────────────────────────────────────────────────
async function seed() {
  const conn = await mysql.createConnection(parseUrl(DB_URL));
  console.log("✓ Connected to database");

  try {
    // 1. Ensure owner user exists
    const [existingUsers] = await conn.execute("SELECT id FROM users WHERE id = ?", [OWNER_USER_ID]);
    if (existingUsers.length === 0) {
      await conn.execute(
        "INSERT INTO users (id, openId, name, email, role, createdAt) VALUES (?, ?, ?, ?, ?, NOW())",
        [OWNER_USER_ID, "seed-owner-001", "Redstone Ridge Wines", "cellar@redstoneridge.com.au", "admin"]
      );
      console.log("✓ Created owner user (id=1)");
    } else {
      console.log("✓ Owner user already exists");
    }

    // 2. Wine Batches
    const [existingBatches] = await conn.execute("SELECT COUNT(*) as cnt FROM wine_batches WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingBatches[0].cnt === 0) {
      for (const b of BATCHES) {
        await conn.execute(
          `INSERT INTO wine_batches (user_id, batch_id, vintage, variety, gi, grower_details, received_at, quantity_value, quantity_unit, tank_name, volume_litres, notes_json, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [OWNER_USER_ID, b.batchId, b.vintage, b.variety, b.gi, b.grower, b.receivedAt, b.quantityValue, b.quantityUnit, b.tankName, b.volumeLitres,
           JSON.stringify({ receival: "", fermentation: "", postFerment: "", stabilising: "", bottling: "" }), now, now]
        );
      }
      console.log(`✓ Inserted ${BATCHES.length} wine batches`);
    } else {
      console.log(`- Wine batches already exist (${existingBatches[0].cnt} rows) — skipping`);
    }

    // 3. Vintage Log Entries
    const [existingLogs] = await conn.execute("SELECT COUNT(*) as cnt FROM vintage_log_entries WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingLogs[0].cnt === 0) {
      for (const e of LOG_ENTRIES) {
        await conn.execute(
          `INSERT INTO vintage_log_entries (user_id, tank_name, variety, event_type, details_json, note_text, tags_json, entry_at, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [e.userId, e.tankName, e.variety, e.eventType, e.detailsJson, e.noteText, e.tagsJson, e.entryAt, e.createdAt]
        );
      }
      console.log(`✓ Inserted ${LOG_ENTRIES.length} vintage log entries`);
    } else {
      console.log(`- Vintage log entries already exist (${existingLogs[0].cnt} rows) — skipping`);
    }

    // 4. Barrels
    const [existingBarrels] = await conn.execute("SELECT COUNT(*) as cnt FROM barrels WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingBarrels[0].cnt === 0) {
      for (const b of BARRELS) {
        await conn.execute(
          `INSERT INTO barrels (user_id, barrel_id, oak_type, format, age_years, fill_date, last_topped_date, wine_lot, notes, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [OWNER_USER_ID, b.barrelId, b.oakType, b.format, b.ageYears, b.fillDate, b.lastToppedDate, b.wineLot, b.notes, b.isActive ? 1 : 0, now, now]
        );
      }
      console.log(`✓ Inserted ${BARRELS.length} barrels`);
    } else {
      console.log(`- Barrels already exist (${existingBarrels[0].cnt} rows) — skipping`);
    }

    // 5. Cellar Equipment
    const [existingEquip] = await conn.execute("SELECT COUNT(*) as cnt FROM cellar_equipment WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingEquip[0].cnt === 0) {
      for (const e of EQUIPMENT) {
        await conn.execute(
          `INSERT INTO cellar_equipment (user_id, name, equipment_type, material, capacity_l, quantity, notes, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [OWNER_USER_ID, e.name, e.equipmentType, e.material, e.capacityL || null, e.quantity, e.notes, now, now]
        );
      }
      console.log(`✓ Inserted ${EQUIPMENT.length} equipment items`);
    } else {
      console.log(`- Equipment already exists (${existingEquip[0].cnt} rows) — skipping`);
    }

    // 6. Cellar Tasks
    const [existingTasks] = await conn.execute("SELECT COUNT(*) as cnt FROM cellar_tasks WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingTasks[0].cnt === 0) {
      for (const t of TASKS) {
        await conn.execute(
          `INSERT INTO cellar_tasks (user_id, equipment_name, task_type, title, method_notes, frequency, due_at, completed_at, completed_by, ai_generated, vessel_id, vessel_type, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [OWNER_USER_ID, t.equipmentName, t.taskType, t.title, t.methodNotes, t.frequency,
           t.dueAt || null, t.completedAt || null, t.completedBy || null, t.aiGenerated,
           t.vesselId || null, t.vesselType || null, now, now]
        );
      }
      console.log(`✓ Inserted ${TASKS.length} cellar tasks`);
    } else {
      console.log(`- Cellar tasks already exist (${existingTasks[0].cnt} rows) — skipping`);
    }

    // 7. Tank Reminders
    const [existingReminders] = await conn.execute("SELECT COUNT(*) as cnt FROM tank_reminders WHERE user_id = ?", [OWNER_USER_ID]);
    if (existingReminders[0].cnt === 0) {
      for (const r of REMINDERS) {
        await conn.execute(
          `INSERT INTO tank_reminders (user_id, tank_name, event_type, threshold_hours, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [OWNER_USER_ID, r.tankName, r.eventType, r.thresholdHours, r.isActive ? 1 : 0, now, now]
        );
      }
      console.log(`✓ Inserted ${REMINDERS.length} tank reminders`);
    } else {
      console.log(`- Tank reminders already exist (${existingReminders[0].cnt} rows) — skipping`);
    }

    console.log("\n✅ Seed complete. Winery: Redstone Ridge Wines (Barossa Valley)");
    console.log("   Tanks: Tank 1 (Shiraz), Tank 2 (Grenache), Tank 3 (Cab Sauv), Tank 4 (Kit Wine)");
    console.log("   Batches: 4 | Log entries: " + LOG_ENTRIES.length + " | Barrels: " + BARRELS.length);
    console.log("   Equipment: " + EQUIPMENT.length + " | Tasks: " + TASKS.length + " | Reminders: " + REMINDERS.length);

  } finally {
    await conn.end();
  }
}

seed().catch(err => {
  console.error("❌ Seed failed:", err.message);
  process.exit(1);
});
