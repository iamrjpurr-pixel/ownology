/**
 * winery.rename — backend regression test.
 *
 * Verifies the new winery.* tRPC procedures:
 *   - winery.current returns the user's winery row
 *   - winery.update writes name/region/brandColor with proper validation
 *   - non-owner team members get FORBIDDEN
 *   - invalid hex colours get BAD_REQUEST
 *
 * Run: node server/tests/test_winery_rename.mjs
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

let passed = 0;
let failed = 0;
function assert(cond, msg) {
  if (!cond) { console.error("❌ ASSERT FAIL:", msg); failed++; }
  else { console.log("  ✓", msg); passed++; }
}

async function signCookie(openId) {
  const jwt = await new SignJWT({
    openId, name: openId, email: `${openId}@test.example`, role: "user",
  })
    .setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("1h")
    .sign(new TextEncoder().encode(JWT_SECRET));
  return `app_session_id=${jwt}`;
}

async function trpcQuery(cookie, proc) {
  const url = `${BASE}/api/trpc/${proc}?batch=1&input=${encodeURIComponent(
    JSON.stringify({ "0": { json: null, meta: { values: ["undefined"] } } })
  )}`;
  const r = await fetch(url, { headers: { cookie } });
  return r.json();
}

async function trpcMutation(cookie, proc, input) {
  const r = await fetch(`${BASE}/api/trpc/${proc}?batch=1`, {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie },
    body: JSON.stringify({ "0": { json: input } }),
  });
  return r.json();
}

async function main() {
  const conn = await mysql.createConnection(DB_URL);
  const cleanup = [];
  try {
    // Owner user + winery
    const ownerOpenId = `test-winery-owner-${NOW}`;
    await conn.execute(
      "INSERT INTO users (open_id, name, email, role, unit_system, created_at) VALUES (?, ?, ?, 'user', 'metric', ?)",
      [ownerOpenId, "Owner U", `${ownerOpenId}@test.example`, NOW]
    );
    const [oRow] = await conn.execute("SELECT id FROM users WHERE open_id = ?", [ownerOpenId]);
    const ownerId = oRow[0].id;
    cleanup.push(["DELETE FROM users WHERE id = ?", [ownerId]]);

    await conn.execute(
      "INSERT INTO wineries (name, slug, owner_user_id, plan, created_at) VALUES (?, ?, ?, 'free', ?)",
      ["Pre-Rename Winery", `pre-rename-${NOW}`, ownerId, NOW]
    );
    const [wRow] = await conn.execute("SELECT id FROM wineries WHERE slug = ?", [`pre-rename-${NOW}`]);
    const wineryId = wRow[0].id;
    cleanup.push(["DELETE FROM wineries WHERE id = ?", [wineryId]]);
    await conn.execute("UPDATE users SET winery_id = ? WHERE id = ?", [wineryId, ownerId]);

    // Non-owner team member (same winery_id, different user_id)
    const memberOpenId = `test-winery-member-${NOW}`;
    await conn.execute(
      "INSERT INTO users (open_id, name, email, role, unit_system, winery_id, created_at) VALUES (?, ?, ?, 'user', 'metric', ?, ?)",
      [memberOpenId, "Member U", `${memberOpenId}@test.example`, wineryId, NOW]
    );
    const [mRow] = await conn.execute("SELECT id FROM users WHERE open_id = ?", [memberOpenId]);
    const memberId = mRow[0].id;
    cleanup.push(["DELETE FROM users WHERE id = ?", [memberId]]);

    const ownerCookie = await signCookie(ownerOpenId);
    const memberCookie = await signCookie(memberOpenId);

    // 1. winery.current — owner sees isOwner=true
    let res = await trpcQuery(ownerCookie, "winery.current");
    const ownerWinery = res[0]?.result?.data?.json;
    assert(ownerWinery?.id === wineryId, "owner sees their winery");
    assert(ownerWinery?.isOwner === true, "owner has isOwner=true");
    assert(ownerWinery?.name === "Pre-Rename Winery", "name reflects DB row");

    // 2. winery.current — member sees the same winery with isOwner=false
    res = await trpcQuery(memberCookie, "winery.current");
    const memberWinery = res[0]?.result?.data?.json;
    assert(memberWinery?.id === wineryId, "member sees the same winery");
    assert(memberWinery?.isOwner === false, "member has isOwner=false");

    // 3. owner can rename + set region + brandColor
    res = await trpcMutation(ownerCookie, "winery.update", {
      name: "Renamed Estate",
      region: "Barossa Valley, SA",
      brandColor: "#7c2d12",
    });
    assert(res[0]?.result?.data?.json?.ok === true, "owner update succeeds");
    res = await trpcQuery(ownerCookie, "winery.current");
    const after = res[0]?.result?.data?.json;
    assert(after?.name === "Renamed Estate", "name persisted");
    assert(after?.region === "Barossa Valley, SA", "region persisted");
    assert(after?.brandColor === "#7c2d12", "brandColor persisted");

    // 4. member cannot rename (FORBIDDEN)
    res = await trpcMutation(memberCookie, "winery.update", { name: "Hostile Takeover" });
    assert(res[0]?.error?.json?.data?.code === "FORBIDDEN", "non-owner gets FORBIDDEN");
    res = await trpcQuery(ownerCookie, "winery.current");
    assert(res[0]?.result?.data?.json?.name === "Renamed Estate", "name unchanged by non-owner attempt");

    // 5. invalid hex rejected
    res = await trpcMutation(ownerCookie, "winery.update", { brandColor: "rouge" });
    assert(res[0]?.error?.json?.data?.code === "BAD_REQUEST", "invalid hex rejected");

    // 5b. invalid logoUrl rejected (must be https://…)
    res = await trpcMutation(ownerCookie, "winery.update", { logoUrl: "javascript:alert(1)" });
    assert(res[0]?.error?.json?.data?.code === "BAD_REQUEST", "non-https logoUrl rejected");

    // 5c. http://… rejected (https only for PDF embedding safety)
    res = await trpcMutation(ownerCookie, "winery.update", { logoUrl: "http://example.com/l.png" });
    assert(res[0]?.error?.json?.data?.code === "BAD_REQUEST", "http logoUrl rejected");

    // 5d. valid https://… accepted + persists
    res = await trpcMutation(ownerCookie, "winery.update", { logoUrl: "https://example.com/logo.png" });
    assert(res[0]?.result?.data?.json?.ok === true, "https logoUrl accepted");
    res = await trpcQuery(ownerCookie, "winery.current");
    assert(res[0]?.result?.data?.json?.logoUrl === "https://example.com/logo.png", "logoUrl persisted");

    // 5e. publicAuditEnabled defaults to false
    assert(res[0]?.result?.data?.json?.publicAuditEnabled === false, "publicAuditEnabled defaults to false");

    // 5f. /audit/:slug returns 404 when not enabled
    const slug = `pre-rename-${NOW}`;
    let r = await fetch(`${BASE}/audit/${slug}`);
    assert(r.status === 404, "GET /audit/:slug → 404 when publicAuditEnabled=false");

    // 5g. owner can enable the public audit
    res = await trpcMutation(ownerCookie, "winery.update", { publicAuditEnabled: true });
    assert(res[0]?.result?.data?.json?.ok === true, "owner can enable publicAuditEnabled");

    // 5h. /audit/:slug now returns 200 with HTML + branding
    r = await fetch(`${BASE}/audit/${slug}`);
    assert(r.status === 200, "GET /audit/:slug → 200 when enabled");
    const html = await r.text();
    assert(html.includes("Renamed Estate"), "page shows winery name (Renamed Estate)");
    assert(html.includes("Verified by Ownology"), "page shows verified badge");
    assert(html.includes("Compliance Audit Trail"), "page shows audit trail heading");
    assert(!html.includes("Cool morning measurement"), "page does NOT leak reasoning text");

    // 5i. non-owner cannot enable on a different winery — covered by FORBIDDEN
    res = await trpcMutation(memberCookie, "winery.update", { publicAuditEnabled: false });
    assert(res[0]?.error?.json?.data?.code === "FORBIDDEN", "non-owner cannot toggle publicAuditEnabled");

    // 5j. unknown slug returns 404
    r = await fetch(`${BASE}/audit/nonexistent-winery-${NOW}`);
    assert(r.status === 404, "unknown slug → 404");

    // 6. clearing region with empty string sets NULL
    res = await trpcMutation(ownerCookie, "winery.update", { region: "" });
    assert(res[0]?.result?.data?.json?.ok === true, "empty region accepted");
    res = await trpcQuery(ownerCookie, "winery.current");
    assert(res[0]?.result?.data?.json?.region === null, "region cleared to null");

    // 7. unchanged update is a no-op
    res = await trpcMutation(ownerCookie, "winery.update", {});
    assert(res[0]?.result?.data?.json?.unchanged === true, "empty patch is no-op");

    console.log(`\n${failed === 0 ? "✅" : "❌"} ${passed} passed / ${failed} failed`);
    if (failed > 0) process.exit(1);
  } finally {
    for (const [sql, params] of cleanup.reverse()) {
      try { await conn.execute(sql, params); } catch (e) { console.warn("[cleanup]", e.message); }
    }
    await conn.end();
  }
}

main().catch((e) => { console.error("❌ TEST FAILED:", e); process.exit(1); });
