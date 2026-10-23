// Seeds/cleans Brand Vault test users in the shared DB and prints session JWTs.
// Usage: npx tsx scripts/e1-test-users.ts [seed|clean]
import "dotenv/config";
import { SignJWT } from "jose";
import { sql } from "drizzle-orm";
import { db } from "../server/db.js";

const USERS = [
  { openId: "e1test-owner-001", email: "e1test-owner@example.com", name: "E1 Test Owner", winery: "E1 Test Brand Co", slug: "e1test-brand" },
  { openId: "e1test-contractor-001", email: "e1test-contractor@example.com", name: "E1 Test Contractor", winery: "E1 Test Crush Co", slug: "e1test-crush" },
  { openId: "e1test-outsider-001", email: "e1test-outsider@example.com", name: "E1 Test Outsider", winery: "E1 Test Outsider Wines", slug: "e1test-outsider" },
];

async function q<T>(s: ReturnType<typeof sql>): Promise<T[]> {
  const [r] = await db.execute(s);
  return r as unknown as T[];
}

async function seed() {
  const secret = new TextEncoder().encode(process.env.JWT_SECRET!);
  for (const u of USERS) {
    const now = Date.now();
    await db.execute(sql`INSERT IGNORE INTO users (open_id, name, email, role, unit_system, created_at) VALUES (${u.openId}, ${u.name}, ${u.email}, 'user', 'metric', ${now})`);
    const [user] = await q<{ id: number; winery_id: number | null }>(sql`SELECT id, winery_id FROM users WHERE open_id = ${u.openId}`);
    if (!user.winery_id) {
      await db.execute(sql`INSERT IGNORE INTO wineries (name, slug, owner_user_id, plan, created_at) VALUES (${u.winery}, ${u.slug}, ${user.id}, 'free', ${now})`);
      const [w] = await q<{ id: number }>(sql`SELECT id FROM wineries WHERE slug = ${u.slug}`);
      await db.execute(sql`UPDATE users SET winery_id = ${w.id} WHERE id = ${user.id}`);
    }
    const [final] = await q<{ id: number; winery_id: number }>(sql`SELECT id, winery_id FROM users WHERE open_id = ${u.openId}`);
    const jwt = await new SignJWT({ openId: u.openId, email: u.email, name: u.name, role: "user" })
      .setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(secret);
    console.log(`${u.email}\tuserId=${final.id}\twineryId=${final.winery_id}\tJWT=${jwt}`);
  }
}

async function clean() {
  const ids = await q<{ id: number }>(sql`SELECT id FROM wineries WHERE slug IN ('e1test-brand','e1test-crush','e1test-outsider')`);
  for (const { id } of ids) {
    for (const t of ["brand_members", "brand_wines", "brand_wine_logs", "brand_activity"]) {
      await db.execute(sql`DELETE FROM ${sql.raw(t)} WHERE winery_id = ${id}`);
    }
  }
  await db.execute(sql`DELETE FROM brand_members WHERE email LIKE 'e1test-%@example.com'`);
  await db.execute(sql`DELETE FROM users WHERE open_id LIKE 'e1test-%'`);
  await db.execute(sql`DELETE FROM wineries WHERE slug IN ('e1test-brand','e1test-crush','e1test-outsider')`);
  await db.execute(sql`DELETE FROM demo_ask_usage WHERE email LIKE 'e1-test%' OR email LIKE 'e1test%'`);
  await db.execute(sql`DELETE FROM leads WHERE email LIKE 'e1-test%' OR email LIKE 'e1test%'`);
  console.log("cleaned");
}

(process.argv[2] === "clean" ? clean() : seed()).then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1); });
