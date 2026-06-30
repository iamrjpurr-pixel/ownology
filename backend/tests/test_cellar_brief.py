"""
Cellar Brief tRPC endpoint tests (Feb 2026).
Validates the new /api/trpc/cellarBrief.{latest,generateNow,history} routes
backing the mobile-first /cellar-brief page.
"""
import os
import json
import requests
import pytest
from urllib.parse import quote

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com").rstrip("/")


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- cellarBrief.latest ----------
class TestCellarBriefLatest:
    def test_latest_returns_200_and_structure(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        assert r.status_code == 200
        body = r.json()["result"]["data"]["json"]
        assert "id" in body and "summary" in body and "generatedAt" in body
        s = body["summary"]
        assert "execSummary" in s and "attentionCount" in s
        assert "decisionsDueCount" in s and "tankCount" in s
        assert isinstance(s["cards"], list)
        assert s["tankCount"] == len(s["cards"])

    def test_latest_tank3_shiraz_is_attention_with_stuck_ferment(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        cards = r.json()["result"]["data"]["json"]["summary"]["cards"]
        t3 = next((c for c in cards if c["vesselId"] == "Tank 3" and c["variety"] == "Shiraz"), None)
        assert t3 is not None, "Tank 3 Shiraz card not found"
        assert t3["status"] == "attention"
        assert t3["stage"] == "primary_slowing"
        assert "stuck ferment" in (t3["decisionDue"] or "").lower()
        work_txt = " ".join(t3["todaysWork"]).lower()
        assert "brix" in work_txt and "12h" in work_txt
        assert "va" in work_txt

    def test_latest_tank1_shiraz_is_primary_active(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        cards = r.json()["result"]["data"]["json"]["summary"]["cards"]
        t1 = next((c for c in cards if c["vesselId"] == "Tank 1" and c["variety"] == "Shiraz"), None)
        assert t1 is not None
        assert t1["stage"] == "primary_active"

    def test_latest_tank2_chardonnay_primary_active(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        cards = r.json()["result"]["data"]["json"]["summary"]["cards"]
        t2 = next((c for c in cards if c["vesselId"] == "Tank 2" and c["variety"] == "Chardonnay"), None)
        assert t2 is not None
        assert t2["stage"] == "primary_active"

    def test_latest_tank4_pinot_noir_mlf_active(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        cards = r.json()["result"]["data"]["json"]["summary"]["cards"]
        t4 = next((c for c in cards if c["vesselId"] == "Tank 4" and c["variety"] == "Pinot Noir"), None)
        assert t4 is not None
        assert t4["stage"] == "mlf_active"
        # Must reference MLF SOP or Red Wine Bible MLF chapter
        ground = " ".join(t4["grounding"])
        assert "SOP 21" in ground or "Malolactic" in ground

    def test_latest_cards_sorted_attention_first(self, api_client):
        r = api_client.get(f"{BASE_URL}/api/trpc/cellarBrief.latest")
        statuses = [c["status"] for c in r.json()["result"]["data"]["json"]["summary"]["cards"]]
        order = {"attention": 0, "watch": 1, "ok": 2}
        ranks = [order[s] for s in statuses]
        assert ranks == sorted(ranks), f"Cards not sorted attention-first: {statuses}"


# ---------- cellarBrief.generateNow ----------
class TestGenerateNow:
    def test_generate_now_manual_returns_id_and_summary(self, api_client):
        r = api_client.post(
            f"{BASE_URL}/api/trpc/cellarBrief.generateNow",
            json={"json": {"trigger": "manual"}},
        )
        assert r.status_code == 200, r.text
        body = r.json()["result"]["data"]["json"]
        assert "id" in body and isinstance(body["id"], int)
        assert "summary" in body
        s = body["summary"]
        assert "execSummary" in s and "cards" in s


# ---------- cellarBrief.history ----------
class TestHistory:
    def test_history_limit_5(self, api_client):
        url = f"{BASE_URL}/api/trpc/cellarBrief.history?input={quote(json.dumps({'json':{'limit':5}}))}"
        r = api_client.get(url)
        assert r.status_code == 200, r.text
        rows = r.json()["result"]["data"]["json"]
        assert isinstance(rows, list)
        assert len(rows) <= 5
        if rows:
            row = rows[0]
            for key in ("id", "trigger", "attentionCount", "decisionsDueCount", "tankCount", "generatedAt"):
                assert key in row
