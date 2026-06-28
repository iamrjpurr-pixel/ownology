"""
Batch 2 backend regression tests:
  #3 Tank QR (vintageLog.list returns rows for tank cards)
  #7 Compliance audit-trail PDF endpoint
  #9 Public Stats (admin.llmStats tRPC)
Auth is bypassed in this environment (seed-owner-001 auto-injected).
"""
import os
import json
import urllib.parse
import pytest
import requests

BASE_URL = "https://ownership-dev.preview.emergentagent.com"


# ── Compliance Audit Trail PDF ────────────────────────────────────────
class TestAuditTrailPdf:
    def test_pdf_default_days(self):
        r = requests.get(f"{BASE_URL}/api/compliance/audit-trail.pdf?days=365", timeout=30)
        assert r.status_code == 200
        assert r.headers.get("Content-Type") == "application/pdf"
        assert "attachment" in r.headers.get("Content-Disposition", "")
        assert len(r.content) > 1024, f"PDF too small ({len(r.content)} bytes)"
        assert r.content[:5] == b"%PDF-", "PDF magic bytes missing"

    def test_pdf_small_days_window(self):
        r = requests.get(f"{BASE_URL}/api/compliance/audit-trail.pdf?days=7", timeout=30)
        assert r.status_code == 200
        assert r.content[:5] == b"%PDF-"
        assert len(r.content) > 500

    def test_pdf_contains_filename_with_date(self):
        r = requests.get(f"{BASE_URL}/api/compliance/audit-trail.pdf?days=365", timeout=30)
        cd = r.headers.get("Content-Disposition", "")
        assert "ownology-audit-trail-" in cd
        assert ".pdf" in cd


# ── vintageLog.list (drives TankQr page) ──────────────────────────────
class TestVintageLogList:
    def _call(self, limit=200):
        payload = {"json": {"limit": limit}}
        q = urllib.parse.quote(json.dumps(payload))
        r = requests.get(f"{BASE_URL}/api/trpc/vintageLog.list?input={q}", timeout=15)
        return r

    def test_list_returns_rows(self):
        r = self._call(200)
        assert r.status_code == 200
        data = r.json()["result"]["data"]["json"]
        assert isinstance(data, list)
        assert len(data) > 0

    def test_list_has_required_fields_for_qr(self):
        r = self._call(200)
        data = r.json()["result"]["data"]["json"]
        sample = data[0]
        for key in ("tankName", "variety", "eventType"):
            assert key in sample, f"Missing field {key} in vintageLog row"

    def test_list_unique_tanks_count(self):
        r = self._call(200)
        data = r.json()["result"]["data"]["json"]
        tanks = {row["tankName"] for row in data}
        # Spec says ~10 cards expected
        assert len(tanks) >= 5, f"Expected >=5 unique tanks, got {len(tanks)}: {tanks}"


# ── admin.llmStats (drives Stats page) ─────────────────────────────────
class TestAdminLlmStats:
    def test_stats_shape(self):
        payload = {"json": None, "meta": {"values": ["undefined"]}}
        q = urllib.parse.quote(json.dumps(payload))
        r = requests.get(f"{BASE_URL}/api/trpc/admin.llmStats?input={q}", timeout=15)
        assert r.status_code == 200
        body = r.json()["result"]["data"]["json"]
        for key in ("startedAt", "uptimeSec", "totals", "byModel", "bySource"):
            assert key in body, f"missing key {key}"
        totals = body["totals"]
        for k in ("calls", "tokensIn", "tokensOut", "costUsd"):
            assert k in totals


# ── Regression: legacy routes still reachable ─────────────────────────
@pytest.mark.parametrize("path", [
    "/", "/free-run", "/the-press", "/dashboard", "/cellar-journal",
    "/stats", "/tank-qr", "/compliance",
])
def test_frontend_routes_load(path):
    r = requests.get(f"{BASE_URL}{path}", timeout=15)
    assert r.status_code == 200
    assert "<!doctype html" in r.text.lower() or "<html" in r.text.lower()
