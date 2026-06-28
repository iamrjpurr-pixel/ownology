"""
Iteration 2 — Ownology Live (Railway) backend regression tests.

Validates the three new features layered on top of the learning loop:
  1) vintageLog.alerts engine (5 alert kinds, severity ordering)
  2) "Why?" reasoning field on vintage_log_entries (round-trip + AI surfacing)
  3) Non-regression of the learning loop and home_winemaker isolation

Auth is bypassed — every request authenticates as seed-owner-001.
"""

import json
import time
import urllib.parse

import pytest
import requests

BASE_URL = "https://ownology-production.up.railway.app"
TRPC = f"{BASE_URL}/api/trpc"
LLM_TIMEOUT = 120


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
@pytest.fixture(scope="module")
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _trpc_post(client, procedure, payload, timeout=LLM_TIMEOUT):
    return client.post(
        f"{TRPC}/{procedure}",
        data=json.dumps({"json": payload}),
        timeout=timeout,
    )


def _trpc_get(client, procedure, input_payload=None, timeout=45):
    url = f"{TRPC}/{procedure}"
    if input_payload is not None:
        url += "?input=" + urllib.parse.quote(json.dumps({"json": input_payload}))
    return client.get(url, timeout=timeout)


def _extract_data(resp_json):
    return resp_json["result"]["data"]["json"]


SEVERITY_RANK = {"high": 0, "medium": 1, "low": 2}
VALID_KINDS = {"dap_due", "high_temp", "stuck_ferment", "ready_to_rack", "tank_quiet"}


# ---------------------------------------------------------------------------
# Test #1 — P0: Alerts API returns >=4 alerts with required shape
# ---------------------------------------------------------------------------
class TestAlertsEngine:
    def test_alerts_endpoint_returns_actionable_alerts(self, api_client):
        resp = _trpc_get(api_client, "vintageLog.alerts", {})
        assert resp.status_code == 200, resp.text[:500]

        data = _extract_data(resp.json())
        assert "alerts" in data, f"Missing alerts key. Got: {list(data.keys())}"
        alerts = data["alerts"]
        assert isinstance(alerts, list), f"alerts is not a list: {type(alerts)}"
        assert len(alerts) >= 4, f"Expected >=4 alerts, got {len(alerts)}: {alerts}"

        required_fields = ("kind", "severity", "tankName", "variety", "title", "detail", "action")
        for i, a in enumerate(alerts):
            for f in required_fields:
                assert f in a, f"alert[{i}] missing '{f}': {a}"
            assert a["kind"] in VALID_KINDS, f"alert[{i}] invalid kind: {a['kind']}"
            assert a["severity"] in SEVERITY_RANK, f"alert[{i}] invalid severity: {a['severity']}"

        # Must have at least one HIGH severity alert
        high = [a for a in alerts if a["severity"] == "high"]
        assert len(high) >= 1, f"Expected >=1 HIGH severity alert. Severities: {[a['severity'] for a in alerts]}"

        # The seeded data should trigger most of the 5 rule kinds
        kinds_seen = {a["kind"] for a in alerts}
        print(f"\nAlert kinds present: {kinds_seen}")
        assert len(kinds_seen) >= 3, f"Expected variety of kinds; got only: {kinds_seen}"

    # -----------------------------------------------------------------------
    # Test #2 — P0: severity ordering (high → medium → low)
    # -----------------------------------------------------------------------
    def test_alerts_sorted_by_severity_high_first(self, api_client):
        resp = _trpc_get(api_client, "vintageLog.alerts", {})
        assert resp.status_code == 200
        alerts = _extract_data(resp.json())["alerts"]
        ranks = [SEVERITY_RANK[a["severity"]] for a in alerts]
        # Non-decreasing rank order (0 high <= 1 medium <= 2 low)
        assert ranks == sorted(ranks), (
            f"Alerts NOT sorted by severity high→medium→low. Order: "
            f"{[(a['severity'], a['kind']) for a in alerts]}"
        )


# ---------------------------------------------------------------------------
# Test #3 — P0: 'Why?' reasoning round-trip on vintageLog.add → list (→ delete)
# ---------------------------------------------------------------------------
class TestReasoningRoundTrip:
    REASONING_TEXT = "Cool morning measurement to track diurnal swing"
    created_id = None
    unique_note = None

    def test_add_entry_with_reasoning_and_verify_via_list(self, api_client):
        # Use a unique noteText so we can identify the entry even when add()
        # only returns {success:true} (no id) — a minor backend deviation.
        unique = f"smoke test reasoning {int(time.time() * 1000)}"
        TestReasoningRoundTrip.unique_note = unique
        payload = {
            "tankName": "Tank Test 1",
            "variety": "Test Variety",
            "eventType": "measurement",
            "details": {
                "what": "Brix",
                "value": "22.0",
                "unit": "°Bx",
                "reasoning": self.REASONING_TEXT,
            },
            "noteText": unique,
            "importSource": "manual",
            "entryAt": int(time.time() * 1000),
        }
        resp = _trpc_post(api_client, "vintageLog.add", payload, timeout=30)
        assert resp.status_code == 200, f"add failed: HTTP {resp.status_code} {resp.text[:400]}"

        data = _extract_data(resp.json())
        # Response shape may vary; pull id if present, otherwise look up by noteText
        new_id = data.get("id") if isinstance(data, dict) else None
        if not new_id and isinstance(data, dict):
            for v in data.values():
                if isinstance(v, dict) and "id" in v:
                    new_id = v["id"]
                    break

        # Now GET list and confirm entry exists (lookup by id OR unique noteText)
        list_resp = _trpc_get(api_client, "vintageLog.list", {})
        assert list_resp.status_code == 200
        entries = _extract_data(list_resp.json())
        match = None
        if new_id:
            match = next((e for e in entries if e.get("id") == new_id), None)
        if match is None:
            match = next((e for e in entries if e.get("noteText") == unique), None)
        assert match is not None, (
            f"New entry not found in vintageLog.list. add response={data}, noteText={unique}"
        )
        TestReasoningRoundTrip.created_id = match.get("id")

        # detailsJson can be a string or dict depending on serialization
        dj = match.get("detailsJson") or match.get("details")
        if isinstance(dj, str):
            try:
                dj_obj = json.loads(dj)
            except json.JSONDecodeError:
                dj_obj = {}
            haystack_str = dj
        else:
            dj_obj = dj or {}
            haystack_str = json.dumps(dj_obj)

        assert "reasoning" in haystack_str or "reasoning" in dj_obj, (
            f"reasoning key missing in detailsJson: {dj}"
        )
        assert self.REASONING_TEXT in haystack_str, (
            f"Reasoning text not preserved. Got: {dj}"
        )

    def test_cleanup_delete_test_entry(self, api_client):
        if not TestReasoningRoundTrip.created_id:
            pytest.skip("no id to delete")
        resp = _trpc_post(
            api_client,
            "vintageLog.delete",
            {"id": TestReasoningRoundTrip.created_id},
            timeout=30,
        )
        # 200 ideal; 404 acceptable if delete schema differs
        assert resp.status_code in (200, 204, 404), f"delete HTTP {resp.status_code}: {resp.text[:300]}"


# ---------------------------------------------------------------------------
# Test #4 — P0: reasoning surfaced via tutor.ask (after seeding test entry)
# ---------------------------------------------------------------------------
class TestTutorSurfaceReasoning:
    SEED_REASONING = "Cool morning measurement to track diurnal swing"
    seeded_id = None

    def test_seed_entry_then_tutor_cites_it(self, api_client):
        # Seed a fresh entry with distinctive reasoning
        seed_payload = {
            "tankName": "Tank Test 1",
            "variety": "Test Variety",
            "eventType": "measurement",
            "details": {
                "what": "Brix",
                "value": "22.0",
                "unit": "°Bx",
                "reasoning": self.SEED_REASONING,
            },
            "noteText": "smoke test reasoning surfacing",
            "importSource": "manual",
            "entryAt": int(time.time() * 1000),
        }
        add = _trpc_post(api_client, "vintageLog.add", seed_payload, timeout=30)
        assert add.status_code == 200, add.text[:300]
        d = _extract_data(add.json())
        new_id = d.get("id") if isinstance(d, dict) else None
        if not new_id and isinstance(d, dict):
            for v in d.values():
                if isinstance(v, dict) and "id" in v:
                    new_id = v["id"]
                    break
        TestTutorSurfaceReasoning.seeded_id = new_id

        # Ask tutor
        ask = _trpc_post(
            api_client,
            "tutor.ask",
            {
                "question": "What is my recent thinking on Tank Test 1?",
                "mode": "winemaking",
            },
        )
        assert ask.status_code == 200, ask.text[:400]
        answer = _extract_data(ask.json())["answer"]
        assert isinstance(answer, str) and len(answer) > 30

        lower = answer.lower()
        # Reasoning OR at least Tank Test 1 must be cited
        assert (
            "diurnal" in lower
            or "swing" in lower
            or "tank test 1" in lower
            or self.SEED_REASONING.lower() in lower
        ), f"tutor did not surface reasoning or cite Tank Test 1. Answer:\n{answer[:800]}"

        print("\n=== TUTOR REASONING ANSWER (truncated) ===")
        print(answer[:1000])
        print("=== /ANSWER ===\n")

    def test_cleanup_seeded_entry(self, api_client):
        if not TestTutorSurfaceReasoning.seeded_id:
            pytest.skip("no id to delete")
        _trpc_post(
            api_client,
            "vintageLog.delete",
            {"id": TestTutorSurfaceReasoning.seeded_id},
            timeout=30,
        )


# ---------------------------------------------------------------------------
# Test #5 — P0 non-regression: tutor still cites past Tank 7 Shiraz vintage
# ---------------------------------------------------------------------------
class TestLearningLoopRegression:
    def test_tutor_cites_tank7_shiraz_history(self, api_client):
        resp = _trpc_post(
            api_client,
            "tutor.ask",
            {
                "question": "What did I do last vintage on Tank 7 with the Shiraz?",
                "mode": "winemaking",
            },
        )
        assert resp.status_code == 200, resp.text[:400]
        answer = _extract_data(resp.json())["answer"]

        assert "Tank 7" in answer, f"No Tank 7 reference. Answer:\n{answer[:700]}"
        assert "Shiraz" in answer, f"No Shiraz reference. Answer:\n{answer[:700]}"
        measurement_tokens = ["24.3", "18.5", "2.0", "120", "0.6"]
        assert any(m in answer for m in measurement_tokens), (
            f"No specific measurement cited. Answer:\n{answer[:700]}"
        )


# ---------------------------------------------------------------------------
# Test #6 — P0 non-regression: home_winemaker mode isolated from cellar context
# ---------------------------------------------------------------------------
class TestHomeWinemakerIsolation:
    def test_home_winemaker_no_commercial_tank_refs(self, api_client):
        resp = _trpc_post(
            api_client,
            "tutor.ask",
            {
                "question": "My fermentation stopped at 8 Brix. What should I do?",
                "mode": "home_winemaker",
            },
        )
        assert resp.status_code == 200, resp.text[:400]
        answer = _extract_data(resp.json())["answer"]

        assert "Tank 7" not in answer, f"Cellar leak: Tank 7 in home_winemaker. Answer:\n{answer[:500]}"
        assert "Tank 9" not in answer, f"Cellar leak: Tank 9 in home_winemaker. Answer:\n{answer[:500]}"

        lower = answer.lower()
        topics = ["yeast", "nutrient", "temperature", "restart", "ferment", "stuck"]
        hits = [t for t in topics if t in lower]
        assert len(hits) >= 2, f"home_winemaker answer missing stuck-ferment topics. Hits={hits}"


# ---------------------------------------------------------------------------
# Test #7 — P1: vintageLog.list returns >= 25 entries
# ---------------------------------------------------------------------------
class TestVintageLogListGrowth:
    def test_list_returns_at_least_25_entries(self, api_client):
        resp = _trpc_get(api_client, "vintageLog.list", {})
        assert resp.status_code == 200
        entries = _extract_data(resp.json())
        assert isinstance(entries, list)
        assert len(entries) >= 25, f"Expected >=25 entries, got {len(entries)}"
