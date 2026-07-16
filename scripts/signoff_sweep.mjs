import 'dotenv/config';
import { db } from '/app/server/db.js';
import { sql } from 'drizzle-orm';

// Two-pass update: swap trailing sign-offs to the canonical form.
// Pass 1: "— Jamie" (any position at end) → "— Rich P · 0408 105 067"
// Pass 2: "— Rich"  (bare — no "P ·")     → "— Rich P · 0408 105 067"
// Runs against BOTH sms_draft_override and hook_text columns.
// Guarded with LIKE filters so untouched rows never rewrite.

const r1 = await db.execute(sql`
  UPDATE outreach_contacts
  SET sms_draft_override = REPLACE(sms_draft_override, '— Jamie', '— Rich P · 0408 105 067')
  WHERE sms_draft_override LIKE '%— Jamie%'
`);
console.log('sms_draft_override · Jamie → Rich P:', r1[0]?.affectedRows ?? '?');

const r2 = await db.execute(sql`
  UPDATE outreach_contacts
  SET sms_draft_override = REPLACE(sms_draft_override, '— Rich', '— Rich P · 0408 105 067')
  WHERE sms_draft_override LIKE '%— Rich'
    AND sms_draft_override NOT LIKE '%— Rich P%'
`);
console.log('sms_draft_override · trailing Rich → Rich P:', r2[0]?.affectedRows ?? '?');

// Also fix `notes` field which some templates append to
const r3 = await db.execute(sql`
  UPDATE outreach_contacts
  SET notes = REPLACE(notes, '— Jamie', '— Rich P · 0408 105 067')
  WHERE notes LIKE '%— Jamie%'
`);
console.log('notes · Jamie → Rich P:', r3[0]?.affectedRows ?? '?');

process.exit(0);
