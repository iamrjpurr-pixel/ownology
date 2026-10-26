// Preview-only helper: prints a 1h admin JWT, or cleans e1test tracking rows.
import "dotenv/config";
import { SignJWT } from "jose";
import { sql } from "drizzle-orm";
import { db } from "../server/db.js";
if (process.argv[2] === "clean") {
  await db.execute(sql`DELETE FROM user_events WHERE slug LIKE 'e1test%' OR session_id LIKE 'e1test%' OR path LIKE '/e1test%'`);
  await db.execute(sql`DELETE FROM outreach_contacts WHERE slug LIKE 'e1test%'`);
  await db.execute(sql`DELETE FROM demo_ask_usage WHERE email LIKE 'e1test%'`);
  await db.execute(sql`DELETE FROM invite_alerts WHERE slug LIKE 'e1test%'`);
  console.log("cleaned");
} else {
  const [u] = await db.execute(sql`SELECT open_id, email, name FROM users WHERE role='admin' AND LOWER(email) IN ('iamrjpurr@gmail.com','richard@ownology.ai') LIMIT 1`);
  const a = (u as any[])[0];
  console.log(await new SignJWT({ openId: a.open_id, email: a.email, name: a.name, role: "admin" }).setProtectedHeader({ alg: "HS256" }).setExpirationTime("1h").sign(new TextEncoder().encode(process.env.JWT_SECRET!)));
}
process.exit(0);
