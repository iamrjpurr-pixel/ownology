import 'dotenv/config';
import { db } from '/app/server/db.js';
import { sql } from 'drizzle-orm';
import { createHash, randomBytes } from 'node:crypto';

// Inject a known-plaintext token so we can call verify with it directly.
const plaintext = randomBytes(32).toString('hex');
const hash = createHash('sha256').update(plaintext).digest('hex');
const now = Date.now();
await db.execute(sql`
  INSERT INTO magic_login_tokens (token_hash, email, user_id, expires_at, consumed_at, created_at, request_ip)
  VALUES (${hash}, 'iamrjpurr@gmail.com', 2, ${now + 15*60*1000}, NULL, ${now}, 'admin-test')
`);
console.log('Injected test token · plaintext:', plaintext);
process.exit(0);
