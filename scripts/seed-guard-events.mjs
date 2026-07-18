// Seed a few demo copyright_guard_events rows so /admin/health has data to show.
// Run: cd /app && DATABASE_URL="..." node scripts/seed-guard-events.mjs
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const conn = await mysql.createPool(DATABASE_URL);
const now = Date.now();

const events = [
  {
    at: now - 1000 * 60 * 30,
    snippet: "How do I control Brettanomyces in my home cellar?",
    hits: [
      "free sulphur dioxide in the ppm range provides the antimicrobial",
      "protection needed against brettanomyces contamination in red wine",
    ],
    sources: ["AWRI Fact Sheet — Controlling Brettanomyces"],
    outcome: "clean",
    primary: "AWRI Fact Sheet — Controlling Brettanomyces",
    len: 3200,
  },
  {
    at: now - 1000 * 60 * 60 * 4,
    snippet: "Explain in detail how MoreWine manages SO2 for sparkling wine",
    hits: ["add potassium metabisulphite at rate of five grams per hectolitre"],
    sources: ["MoreWine! Guide to SO₂ Management"],
    outcome: "clean",
    primary: "MoreWine! Guide to SO₂ Management",
    len: 2100,
  },
  {
    at: now - 1000 * 60 * 60 * 26,
    snippet: "What does Iland say about protein stability in white wine?",
    hits: ["heat unstable proteins in the wine result in haze formation"],
    sources: ["Iland, Bruer, Edwards, Weeks & Wilkes — Chemical Analysis of Grapes and Wine"],
    outcome: "still_leaking",
    primary: "Iland, Bruer, Edwards, Weeks & Wilkes — Chemical Analysis of Grapes and Wine",
    len: 4200,
  },
];

for (const e of events) {
  await conn.execute(
    "INSERT INTO copyright_guard_events (occurred_at, question_snippet, hits_json, source_hits_json, outcome, primary_source, original_answer_len) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [e.at, e.snippet, JSON.stringify(e.hits), JSON.stringify(e.sources), e.outcome, e.primary, e.len],
  );
}

const [rows] = await conn.execute("SELECT COUNT(*) as c FROM copyright_guard_events");
console.log("Total rows in copyright_guard_events:", rows[0].c);
await conn.end();
