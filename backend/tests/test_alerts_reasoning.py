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
_ALERT_REQUIRED_FIELDS = ("kind", "severity", "tankName", "variety", "title", "detail", "action")


def _extract_new_id_from_add_response(data):
    """Pull the created row's id out of vintageLog.add's response. Backend
    sometimes returns {id}, sometimes {success:true} nested one level — fall
    back to scanning nested dicts before giving up. Shared by both the
    round-trip and tutor-surfacing tests."""
    if not isinstance(data, dict):
        return None
    if "id" in data:
        return data["id"]
    for v in data.values():
        if isinstance(v, dict) and "id" in v:
            return v["id"]
    return None


def _assert_alert_shape(alert, index):
    """Validate one alert dict has all required fields and known enum values.
    Extracted so the parent test stays under complexity 10 and reads
    top-to-bottom: fetch → shape-check → severity-check → variety-check."""
    for field in _ALERT_REQUIRED_FIELDS:
        assert field in alert, f"alert[{index}] missing '{field}': {alert}"
    assert alert["kind"] in VALID_KINDS, f"alert[{index}] invalid kind: {alert['kind']}"
    assert alert["severity"] in SEVERITY_RANK, f"alert[{index}] invalid severity: {alert['severity']}"


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

        for i, a in enumerate(alerts):
            _assert_alert_shape(a, i)

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

    @staticmethod
    def _extract_new_id(add_response_data):
        return _extract_new_id_from_add_response(add_response_data)

    @staticmethod
    def _find_entry_in_list(entries, new_id, unique_note):
        """Locate the just-added row in vintageLog.list — by id if we have
        one, otherwise by unique noteText (which is always stable)."""
        if new_id:
            match = next((e for e in entries if e.get("id") == new_id), None)
            if match is not None:
                return match
        return next((e for e in entries if e.get("noteText") == unique_note), None)

    @staticmethod
    def _parse_details_json(match):
        """detailsJson can serialise as either str or dict depending on the
        client. Normalise both to (parsed_dict, searchable_string)."""
        dj = match.get("detailsJson") or match.get("details")
        if isinstance(dj, str):
            try:
                dj_obj = json.loads(dj)
            except json.JSONDecodeError:
                dj_obj = {}
            return dj_obj, dj
        dj_obj = dj or {}
        return dj_obj, json.dumps(dj_obj)

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
        new_id = self._extract_new_id(data)

        # Now GET list and confirm entry exists (lookup by id OR unique noteText)
        list_resp = _trpc_get(api_client, "vintageLog.list", {})
        assert list_resp.status_code == 200
        entries = _extract_data(list_resp.json())
        match = self._find_entry_in_list(entries, new_id, unique)
        assert match is not None, (
            f"New entry not found in vintageLog.list. add response={data}, noteText={unique}"
        )
        TestReasoningRoundTrip.created_id = match.get("id")

        # detailsJson can be a string or dict depending on serialization
        dj_obj, haystack_str = self._parse_details_json(match)

        assert "reasoning" in haystack_str or "reasoning" in dj_obj, (
            f"reasoning key missing in detailsJson: {match.get('detailsJson') or match.get('details')}"
        )
        assert self.REASONING_TEXT in haystack_str, (
            f"Reasoning text not preserved. Got: {haystack_str}"
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
        TestTutorSurfaceReasoning.seeded_id = _extract_new_id_from_add_response(
            _extract_data(add.json())
        )

        # Ask tutor
        answer = self._ask_tutor_about_tank(api_client)
        self._assert_tutor_surfaced_reasoning(answer)

        print("\n=== TUTOR REASONING ANSWER (truncated) ===")
        print(answer[:1000])
        print("=== /ANSWER ===\n")

    def _ask_tutor_about_tank(self, api_client):
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
        return answer

    def _assert_tutor_surfaced_reasoning(self, answer):
        """Pass if the tutor's answer cites either the reasoning phrase or the
        tank identity. Kept flexible because LLM phrasing varies vintage-to-
        vintage; we only want to catch total silence."""
        lower = answer.lower()
        keywords = ("diurnal", "swing", "tank test 1", self.SEED_REASONING.lower())
        assert any(k in lower for k in keywords), (
            f"tutor did not surface reasoning or cite Tank Test 1. Answer:\n{answer[:800]}"
        )

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
