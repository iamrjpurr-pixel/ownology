// Dry run: look up email/mobile for Wine Australia directory prospects with no contact details. Writes nothing to the DB.
import dotenv from "dotenv"; dotenv.config({ path: ["/app/.env", "/app/backend/.env"], quiet: true });
import mysql from "mysql2/promise";
import { writeFileSync } from "fs";

type Row = { id: number; first_name: string; last_name: string | null; winery: string | null; region: string | null };
const schema = {
  type: "object",
  properties: {
    personEmail: { type: ["string", "null"] }, personEmailSource: { type: ["string", "null"] },
    wineryEmail: { type: ["string", "null"] }, wineryEmailSource: { type: ["string", "null"] },
    mobileAu: { type: ["string", "null"] }, mobileSource: { type: ["string", "null"] },
    instagram: { type: ["string", "null"] },
    stillAtWinery: { type: ["boolean", "null"] },
  },
  required: ["personEmail", "personEmailSource", "wineryEmail", "wineryEmailSource", "mobileAu", "mobileSource", "instagram", "stillAtWinery"],
  additionalProperties: false,
};
const system = `You find PUBLIC business contact details for Australian winemakers, for a polite one-to-one business email. Search the winery's own website (contact, team, cellar door pages), regional wine association pages, trade-event exhibitor lists and LinkedIn.
Return:
- personEmail: an email that is clearly THIS person's (e.g. name@winery.com.au) and published on a page you cite. Never guess a pattern.
- wineryEmail: the winery's general published email (info@, cellardoor@, wine@). Must appear on a cited page.
- mobileAu: an Australian mobile (04xx / +614) published next to THIS person's name. Never a landline, 1300/1800 or a shared cellar-door number.
- instagram: the winery's or person's Instagram handle if found (without @).
- stillAtWinery: true if a recent (2025-2026) source shows them still working there, false if they moved on, null if unknown.
Each *Source is the exact URL where that detail appears. NULL IS ALWAYS BETTER THAN A GUESS. Return only the JSON.`;

const norm = (m: string | null) => {
  const d = (m ?? "").replace(/[^\d+]/g, "");
  if (/^\+614\d{8}$/.test(d)) return d;
  if (/^614\d{8}$/.test(d)) return "+" + d;
  if (/^04\d{8}$/.test(d)) return "+61" + d.slice(1);
  return null;
};
const okEmail = (e: string | null) => (e && /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i.test(e.trim()) ? e.trim().toLowerCase() : null);

async function lookup(r: Row, attempt = 0): Promise<Record<string, unknown>> {
  const user = `Person: ${r.first_name} ${r.last_name ?? ""}\nWinery: ${r.winery ?? ""}\nRegion: ${r.region ?? ""}`;
  const resp = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model: "sonar-pro", max_tokens: 600, messages: [{ role: "system", content: system }, { role: "user", content: user }],
      response_format: { type: "json_schema", json_schema: { schema } } }),
    signal: AbortSignal.timeout(60_000),
  });
  if (resp.status === 429 && attempt < 5) { await new Promise((ok) => setTimeout(ok, 15_000 * (attempt + 1))); return lookup(r, attempt + 1); }
  if (!resp.ok) return { error: `${resp.status} ${(await resp.text()).slice(0, 120)}` };
  const j: any = await resp.json();
  const p = JSON.parse((j.choices?.[0]?.message?.content ?? "{}").replace(/^```json\s*|```\s*$/g, ""));
  return { personEmail: okEmail(p.personEmail), personEmailSource: p.personEmailSource, wineryEmail: okEmail(p.wineryEmail), wineryEmailSource: p.wineryEmailSource,
    mobileAu: norm(p.mobileAu), mobileSource: p.mobileSource, instagram: p.instagram?.replace(/^@/, "") || null, stillAtWinery: p.stillAtWinery };
}

const c = await mysql.createConnection(process.env.DATABASE_URL!);
const [rows] = await c.query(`SELECT id, first_name, last_name, winery, region FROM outreach_contacts
  WHERE event='Wine Australia directory' AND COALESCE(email,'')='' AND COALESCE(mobile_au,'')='' AND unsubscribed_at IS NULL ORDER BY id`) as unknown as [Row[]];
await c.end();
const out: any[] = [];
const queue = [...rows];
await Promise.all(Array.from({ length: 1 }, async () => {
  for (let r = queue.shift(); r; r = queue.shift()) {
    try { out.push({ id: r.id, name: `${r.first_name} ${r.last_name ?? ""}`.trim(), winery: r.winery, ...(await lookup(r)) }); }
    catch (e) { out.push({ id: r.id, name: r.first_name, winery: r.winery, error: String(e) }); }
    console.log(`${out.length}/${rows.length}`);
    await new Promise((ok) => setTimeout(ok, 4_000));
  }
}));
out.sort((a, b) => a.id - b.id);
writeFileSync("/app/memory/wa-lookup-dryrun.json", JSON.stringify(out, null, 1));
console.log("DONE", out.length);
