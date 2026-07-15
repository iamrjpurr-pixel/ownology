"""
Iter-23 Launch-Readiness backend tests
Covers: Founding-Member reservation flow, DevBypass toggle, SEO endpoints,
LIP Audit Pack, admin.list endpoints, 404 handling.

Preview URL from /app/.env: REACT_APP_BACKEND_URL. Dev bypass is ON, so
tRPC calls run as seed admin (cellar@redstoneridge.com.au).
"""
import os
import json
import pytest
import requests
from urllib.parse import quote

BASE = os.environ.get("REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com").rstrip("/")


def trpc_get(procedure: str, input_obj=None):
    """tRPC v10 GET: /api/trpc/<procedure>?input=<json>"""
    url = f"{BASE}/api/trpc/{procedure}"
    if input_obj is not None:
        wrapped = {"json": input_obj}
        url += f"?input={quote(json.dumps(wrapped))}"
    r = requests.get(url, timeout=30)
    return r


def trpc_post(procedure: str, input_obj):
    url = f"{BASE}/api/trpc/{procedure}"
    payload = {"json": input_obj}
    r = requests.post(url, json=payload, timeout=30)
    return r


# ─── Health ─────────────────────────────────────────────────────────────
class TestHealth:
    def test_health(self):
        r = requests.get(f"{BASE}/api/health", timeout=10)
        assert r.status_code == 200
        assert r.json().get("status") == "ok"


# ─── Founding-Member Reservation Flow ──────────────────────────────────
class TestFoundingReservation:
    def test_get_reservation_count_public(self):
        r = trpc_get("foundingMembers.getReservationCount")
        assert r.status_code == 200
        data = r.json()["result"]["data"]["json"]
        assert set(data.keys()) >= {"total", "paid", "reserved", "cap"}
        assert data["cap"] == 99
        assert isinstance(data["total"], int)
        assert data["total"] == data["paid"] + data["reserved"]

    def test_reserve_slot_press_monthly_persists(self):
        # Capture count before
        before = trpc_get("foundingMembers.getReservationCount").json()["result"]["data"]["json"]["total"]

        payload = {
            "name": "Test Launch Winemaker",
            "email": "iamrjpurr@gmail.com",
            "wineryName": "Test Vineyard",
            "phone": "+61400123456",
            "tier": "press",
            "cycle": "monthly",
            "source": "backend_test_iter23",
        }
        r = trpc_post("foundingMembers.reserve", payload)
        assert r.status_code == 200, r.text
        data = r.json()["result"]["data"]["json"]
        assert data["ok"] == True
        assert data["cap"] == 99
        assert isinstance(data["slotNumber"], int) and data["slotNumber"] >= 1
        assert "emails" in data
        pytest.slot_created = data["slotNumber"]

        # Count should increment
        after = trpc_get("foundingMembers.getReservationCount").json()["result"]["data"]["json"]["total"]
        assert after == before + 1

    def test_reserve_invalid_email_rejected(self):
        r = trpc_post("foundingMembers.reserve", {
            "name": "X", "email": "not-an-email",
            "wineryName": "Y", "tier": "cellar", "cycle": "monthly",
        })
        # Zod validation → 400
        assert r.status_code == 400, r.text

    def test_reserve_missing_name_rejected(self):
        r = trpc_post("foundingMembers.reserve", {
            "name": "", "email": "test@ex.com",
            "wineryName": "Y", "tier": "cellar", "cycle": "monthly",
        })
        assert r.status_code == 400

    def test_reserve_missing_winery_rejected(self):
        r = trpc_post("foundingMembers.reserve", {
            "name": "X", "email": "test@ex.com",
            "wineryName": "", "tier": "cellar", "cycle": "monthly",
        })
        assert r.status_code == 400

    def test_reserve_all_tiers(self):
        for tier in ["cellar", "press", "cellar_master"]:
            for cycle in ["monthly", "annual"]:
                r = trpc_post("foundingMembers.reserve", {
                    "name": f"TEST_iter23_{tier}_{cycle}",
                    "email": "iamrjpurr@gmail.com",
                    "wineryName": f"TEST Winery {tier}",
                    "tier": tier,
                    "cycle": cycle,
                    "source": "backend_test_iter23_multi",
                })
                assert r.status_code == 200, f"{tier}/{cycle}: {r.text}"
                d = r.json()["result"]["data"]["json"]
                assert d["ok"] == True and d["slotNumber"] >= 1

    def test_list_reservations_owner_only(self):
        # Dev bypass ON → we ARE the admin owner
        r = trpc_get("foundingMembers.listReservations", {"limit": 100})
        assert r.status_code == 200, r.text
        data = r.json()["result"]["data"]["json"]
        assert isinstance(data, list)
        assert len(data) >= 1
        # Latest reservation should be there
        emails = [row.get("email") for row in data]
        assert "iamrjpurr@gmail.com" in emails


# ─── Admin Dev Bypass Toggle ───────────────────────────────────────────
class TestDevBypassToggle:
    def test_get_state(self):
        r = trpc_get("admin.getDevBypassState")
        assert r.status_code == 200, r.text
        d = r.json()["result"]["data"]["json"]
        assert set(d.keys()) >= {"runtime", "envActive", "effectiveActive", "envValue", "nodeEnv"}
        assert isinstance(d["runtime"], dict)
        assert "active" in d["runtime"]

    def test_enable_runtime_bypass(self):
        r = trpc_post("admin.setDevBypass", {"active": True, "minutes": 15})
        assert r.status_code == 200, r.text
        d = r.json()["result"]["data"]["json"]
        assert d["ok"] == True
        assert d["runtime"]["active"] == True
        assert d["runtime"]["expiresAt"] is not None

        # Verify state reflects it
        st = trpc_get("admin.getDevBypassState").json()["result"]["data"]["json"]
        assert st["runtime"]["active"] == True

    def test_disable_runtime_bypass(self):
        r = trpc_post("admin.setDevBypass", {"active": False, "minutes": 15})
        assert r.status_code == 200
        d = r.json()["result"]["data"]["json"]
        assert d["ok"] == True
        assert d["runtime"]["active"] == False

    def test_setDevBypass_minutes_cap(self):
        # 24h max
        r = trpc_post("admin.setDevBypass", {"active": True, "minutes": 9999})
        assert r.status_code == 400  # Zod max 1440


# ─── SEO endpoints ─────────────────────────────────────────────────────
class TestSEO:
    def test_sitemap_xml(self):
        r = requests.get(f"{BASE}/api/sitemap.xml", timeout=15)
        assert r.status_code == 200
        assert "xml" in r.headers.get("content-type", "").lower()
        assert "<urlset" in r.text
        assert "<loc>" in r.text

    def test_cellar_journal_rss(self):
        r = requests.get(f"{BASE}/api/cellar-journal/rss.xml", timeout=15)
        assert r.status_code == 200
        body = r.text
        assert "<rss" in body or "<feed" in body
        assert "<item" in body or "<entry" in body

    def test_robots_txt(self):
        r = requests.get(f"{BASE}/api/robots.txt", timeout=15)
        assert r.status_code == 200
        assert "User-agent" in r.text or "user-agent" in r.text.lower()


# ─── LIP Audit Pack ────────────────────────────────────────────────────
class TestLIPAuditPack:
    def test_pdf_content(self):
        r = requests.get(f"{BASE}/api/compliance/lip-audit-pack.pdf?vintage=2026", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("content-type") == "application/pdf"
        assert r.content[:4] == b"%PDF"
        assert len(r.content) > 1000

    def test_pdf_invalid_vintage(self):
        r = requests.get(f"{BASE}/api/compliance/lip-audit-pack.pdf?vintage=abc", timeout=15)
        assert r.status_code == 400


# ─── 404 handling ──────────────────────────────────────────────────────
class TestNotFound:
    def test_api_404_json(self):
        r = requests.get(f"{BASE}/api/does-not-exist", timeout=10)
        assert r.status_code == 404
        # Should be JSON, not HTML SPA fallback
        ctype = r.headers.get("content-type", "")
        assert "html" not in ctype.lower(), f"API 404 returned HTML: {ctype}"

    def test_spa_fallback(self):
        r = requests.get(f"{BASE}/this-does-not-exist", timeout=10)
        # SPA should return 200 with index.html for client-side routing
        assert r.status_code in (200, 404)
        assert "html" in r.headers.get("content-type", "").lower()


# ─── Warm-lead capture ─────────────────────────────────────────────────
class TestJoin:
    def test_referrals_track_click(self):
        # /join?ref=X calls referrals.trackClick
        r = trpc_post("referrals.trackClick", {"referralCode": "REDSTO-D671EF"})
        # May or may not exist as-is; we just want to ensure no 500
        assert r.status_code in (200, 400, 404), r.text
