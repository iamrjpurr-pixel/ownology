/**
 * Multi-Tenant Phase 2 — Cross-Winery Isolation Test
 *
 * Verifies that data written by User A (Winery A) is NOT visible to
 * User B (Winery B) via the tRPC API.
 *
 * Strategy:
 *  - Spin up two ephemeral users + wineries directly via SQL.
 *  - Forge a signed JWT cookie for each, hit /api/trpc/vintageLog.list,
 *    confirm User A's entry is invisible to User B.
 *  - Roll back: delete both ephemeral users + their entries + wineries.
 *
 * Run with: node server/tests/test_multitenant_isolation.mjs
 * Requires env: DATABASE_URL, JWT_SECRET, PORT (default 8001)
 */
import "dotenv/config";
import mysql from "mysql2/promise";
import { SignJWT } from "jose";

const DB_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 8001;
const BASE = `http://127.0.0.1:${PORT}`;
const NOW = Date.now();

if (!DB_URL || !JWT_SECRET) {
  console.error("Missing DATABASE_URL or JWT_SECRET env");
  process.exit(2);
}

function assert(cond, msg) {
  if (!cond) {
    console.error("❌ ASSERT FAIL:", msg);
    process.exit(1);
  } else {
    console.log("  ✓", msg);
  }
}

async function signCookie(openId) {
  const jwt = await new SignJWT({
    openId,
    name: openId,
    email: `${openId}@test.example`,
    role: "user",
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(new TextEncoder().encode(JWT_SECRET));
  return `app_session_id=${jwt}`;
}

async function trpcQuery(cookie, proc, input) {
  const url = `${BASE}/api/trpc/${proc}?batch=1&input=${encodeURIComponent(
    JSON.stringify({ "0": { json: input } })
  )}`;
  const r = await fetch(url, { headers: { cookie } });
  const j = await r.json();
  if (!Array.isArray(j) || !j[0]?.result?.data?.json) {
    throw new Error(`trpc query failed: ${JSON.stringify(j).slice(0, 300)}`);
  }
  return j[0].result.data.json;
}

async function trpcMutation(cookie, proc, input) {
  const r = await fetch(`${BASE}/api/trpc/${proc}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ "0": { json: input } }),
  });
  const j = await r.json();
  if (!Array.isArray(j) || !j[0]?.result?.data?.json) {
    throw new Error(`trpc mutation failed: ${JSON.stringify(j).slice(0, 300)}`);
  }
  return j[0].result.data.json;
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  const cleanup = [];
  try {
    // ── Provision User A + Winery A ──────────────────────────────────
    const openIdA = `test-multitenant-a-${NOW}`;
    const openIdB = `test-multitenant-b-${NOW}`;

    await conn.execute(
      "INSERT INTO users (open_id, name, email, role, unit_system, created_at) VALUES (?, ?, ?, 'user', 'metric', ?)",
      [openIdA, "Test A", `${openIdA}@test.example`, NOW]
    );
    const [rowA] = await conn.execute("SELECT id FROM users WHERE open_id = ?", [openIdA]);
    const userAId = rowA[0].id;
    cleanup.push(["DELETE FROM users WHERE id = ?", [userAId]]);

    await conn.execute(
      "INSERT INTO wineries (name, slug, owner_user_id, plan, created_at) VALUES (?, ?, ?, 'free', ?)",
      ["Test Winery A", `test-winery-a-${NOW}`, userAId, NOW]
    );
    const [winA] = await conn.execute("SELECT id FROM wineries WHERE slug = ?", [`test-winery-a-${NOW}`]);
    const wineryAId = winA[0].id;
    cleanup.push(["DELETE FROM wineries WHERE id = ?", [wineryAId]]);
    await conn.execute("UPDATE users SET winery_id = ? WHERE id = ?", [wineryAId, userAId]);

    // ── Provision User B + Winery B ──────────────────────────────────
    await conn.execute(
      "INSERT INTO users (open_id, name, email, role, unit_system, created_at) VALUES (?, ?, ?, 'user', 'metric', ?)",
      [openIdB, "Test B", `${openIdB}@test.example`, NOW]
    );
    const [rowB] = await conn.execute("SELECT id FROM users WHERE open_id = ?", [openIdB]);
    const userBId = rowB[0].id;
    cleanup.push(["DELETE FROM users WHERE id = ?", [userBId]]);

    await conn.execute(
      "INSERT INTO wineries (name, slug, owner_user_id, plan, created_at) VALUES (?, ?, ?, 'free', ?)",
      ["Test Winery B", `test-winery-b-${NOW}`, userBId, NOW]
    );
    const [winB] = await conn.execute("SELECT id FROM wineries WHERE slug = ?", [`test-winery-b-${NOW}`]);
    const wineryBId = winB[0].id;
    cleanup.push(["DELETE FROM wineries WHERE id = ?", [wineryBId]]);
    await conn.execute("UPDATE users SET winery_id = ? WHERE id = ?", [wineryBId, userBId]);

    console.log(`[setup] User A id=${userAId} wineryId=${wineryAId}, User B id=${userBId} wineryId=${wineryBId}`);

    // ── User A writes a vintage log entry ─────────────────────────────
    const cookieA = await signCookie(openIdA);
    const cookieB = await signCookie(openIdB);

    const writeResult = await trpcMutation(cookieA, "vintageLog.add", {
      tankName: `MTTEST-A-${NOW}`,
      variety: "Shiraz",
      eventType: "measurement",
      details: { what: "Brix", value: "23.5", unit: "°Bx" },
      noteText: `multitenant_test_${NOW}`,
    });
    assert(writeResult.success === true, "User A vintageLog.add returns success");

    // Find the entry by note_text since mysql2/drizzle insertId is unreliable here
    const [insertedRows] = await conn.execute(
      "SELECT id, user_id, winery_id FROM vintage_log_entries WHERE note_text = ? ORDER BY id DESC LIMIT 1",
      [`multitenant_test_${NOW}`]
    );
    assert(insertedRows.length === 1, "exactly one entry was inserted");
    const writtenId = insertedRows[0].id;
    cleanup.push(["DELETE FROM vintage_log_entries WHERE id = ?", [writtenId]]);
    console.log(`[write] entry id=${writtenId}`);

    assert(insertedRows[0].user_id === userAId, "row stored with correct user_id");
    assert(insertedRows[0].winery_id === wineryAId, "row stored with correct winery_id (Phase 2 tagging works)");

    // ── User A's list contains the entry ──────────────────────────────
    const listA = await trpcQuery(cookieA, "vintageLog.list", { limit: 100 });
    const foundA = listA.find((r) => r.id === writtenId);
    assert(!!foundA, "User A's vintageLog.list contains the new entry");

    // ── User B's list DOES NOT contain it (cross-winery isolation) ─
    const listB = await trpcQuery(cookieB, "vintageLog.list", { limit: 100 });
    const foundB = listB.find((r) => r.id === writtenId);
    assert(!foundB, "User B's vintageLog.list does NOT contain User A's entry");

    // ── User B's used-tanks DOES NOT contain User A's tank ─────────
    const tanksB = await trpcQuery(cookieB, "vintageLog.getUsedTanks", undefined);
    assert(!tanksB.includes(`MTTEST-A-${NOW}`), "User B's getUsedTanks does NOT include User A's tank");

    // ── User B's alerts NOT polluted with User A's entries ──────────
    const alertsB = await trpcQuery(cookieB, "vintageLog.alerts", undefined);
    const polluted = alertsB.alerts.some((a) => a.tankName === `MTTEST-A-${NOW}`);
    assert(!polluted, "User B's alerts NOT polluted with User A's entries");

    console.log("\n✅ All cross-winery isolation tests passed.");
  } finally {
    // Roll back
    for (const [sql, params] of cleanup.reverse()) {
      try { await conn.execute(sql, params); } catch (e) { console.warn("[cleanup]", e.message); }
    }
    await conn.end();
  }
}

main().catch((e) => {
  console.error("❌ TEST FAILED:", e);
  process.exit(1);
});
