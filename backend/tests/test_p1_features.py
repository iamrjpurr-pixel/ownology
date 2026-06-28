"""
Regression coverage for Batch P1 features:
  1. Daily alert email cron (/api/scheduled/daily-alert-email)
  2. Vintage comparison tRPC (vintageLog.compareTanks)
  3. admin.resetFreeRunQuota mutation
  4. vintageLog.alerts behavioural parity with computeAlertsForUser refactor
  5. LLM cost meter regression — cron must not record LLM calls
"""
import json
import os
import re
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com"
).rstrip("/")


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _trpc_get(session, proc, input_obj=None):
    url = f"{BASE_URL}/api/trpc/{proc}"
    if input_obj is not None:
        url += "?input=" + urllib.parse.quote(json.dumps(input_obj))
    return session.get(url, timeout=30)


def _trpc_mut(session, proc, body):
    return session.post(
        f"{BASE_URL}/api/trpc/{proc}", json=body, timeout=30
    )


# ---------------- Daily Alert Email cron ----------------
class TestDailyAlertEmailCron:
    def test_dry_run_returns_alerts(self, session):
        r = session.get(f"{BASE_URL}/api/scheduled/daily-alert-email?dryRun=1", timeout=30)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["dryRun"] is True
        assert body["totals"]["dryRun"] >= 1
        assert body["totals"]["sent"] == 0  # dry-run must not send
        assert body["totals"]["errors"] == 0
        # At least one result row, alert count >= 1 (seed user has 5)
        assert any(r["status"] == "dry_run" and r["alerts"] >= 1 for r in body["results"])
        assert body["testToOverride"] == "iamrjpurr@gmail.com"

    def test_dry_run_recipient_uses_alert_test_to(self, session):
        r = session.get(f"{BASE_URL}/api/scheduled/daily-alert-email?dryRun=1", timeout=30)
        body = r.json()
        dry_rows = [x for x in body["results"] if x["status"] == "dry_run"]
        assert dry_rows, "expected at least one dry-run row"
        for row in dry_rows:
            assert row["email"] == "iamrjpurr@gmail.com"

    def test_live_send_returns_resend_id(self, session):
        """ONE live send to confirm Resend integration path. Skips if rate-limited."""
        r = session.get(f"{BASE_URL}/api/scheduled/daily-alert-email", timeout=60)
        assert r.status_code == 200, r.text
        body = r.json()
        assert body["dryRun"] is False
        sent_rows = [x for x in body["results"] if x["status"] == "sent"]
        err_rows = [x for x in body["results"] if x["status"] == "error"]
        if not sent_rows and err_rows:
            # Resend sandbox commonly rate-limits at 2 req/sec.
            msgs = " | ".join(x.get("error", "") for x in err_rows)
            if "rate" in msgs.lower() or "429" in msgs:
                pytest.skip(f"Resend rate limited: {msgs}")
        assert len(sent_rows) >= 1, f"no sent rows; body={body}"
        sent = sent_rows[0]
        assert sent["email"] == "iamrjpurr@gmail.com"
        assert sent["resendId"]
        # UUID-ish
        assert re.match(r"^[0-9a-f-]{20,}$", sent["resendId"]), sent["resendId"]


# ---------------- admin.resetFreeRunQuota ----------------
class TestAdminResetFreeRunQuota:
    def test_reset_all_scope(self, session):
        r = _trpc_mut(session, "admin.resetFreeRunQuota", {"json": {}})
        assert r.status_code == 200, r.text
        data = r.json()["result"]["data"]["json"]
        assert data["ok"] is True
        assert data["scope"] == "all"
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", data["dateKey"])

    def test_reset_user_scope(self, session):
        r = _trpc_mut(session, "admin.resetFreeRunQuota", {"json": {"userId": 1}})
        assert r.status_code == 200, r.text
        data = r.json()["result"]["data"]["json"]
        assert data["ok"] is True
        assert data["scope"] == "user"
        assert data["userId"] == 1
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", data["dateKey"])

    def test_quota_actually_reset_allows_new_freerun(self, session):
        """After reset, curiosityAsk should be allowed (not 'quota exceeded')."""
        _trpc_mut(session, "admin.resetFreeRunQuota", {"json": {}})
        # Probe quota state — calling curiosityAsk should NOT immediately
        # return a quota error. We don't need it to succeed end-to-end
        # (LLM may be slow); we just need to ensure the error string isn't a
        # quota refusal.
        r = _trpc_mut(
            session,
            "freeRun.curiosityAsk",
            {"json": {"question": "ping test"}},
        )
        if r.status_code >= 400:
            txt = r.text.lower()
            assert "quota" not in txt and "limit" not in txt, txt


# ---------------- vintageLog.compareTanks ----------------
class TestCompareTanks:
    def test_compare_tank7_tank9_returns_expected_fields(self, session):
        r = _trpc_get(
            session,
            "vintageLog.compareTanks",
            {"json": {"tankNames": ["Tank 7", "Tank 9"]}},
        )
        assert r.status_code == 200, r.text
        tanks = r.json()["result"]["data"]["json"]["tanks"]
        by_name = {t["tankName"]: t for t in tanks}
        assert "Tank 7" in by_name and "Tank 9" in by_name
        t7 = by_name["Tank 7"]
        assert t7["variety"] == "Shiraz"
        assert t7["yeastStrain"] == "Lalvin EC1118"
        assert t7["fermentDays"] == 6
        assert abs(float(t7["startBrix"]) - 24.3) < 0.01
        assert abs(float(t7["finalBrix"]) - 2) < 0.01

    def test_compare_includes_required_keys(self, session):
        r = _trpc_get(
            session,
            "vintageLog.compareTanks",
            {"json": {"tankNames": ["Tank 7", "Tank 9"]}},
        )
        assert r.status_code == 200, r.text
        t = r.json()["result"]["data"]["json"]["tanks"][0]
        expected_keys = {
            "tankName", "variety", "firstAt", "lastAt", "totalEvents",
            "yeastStrain", "fermentDays", "startBrix", "finalBrix",
            "minYan", "maxYan", "peakTemp", "avgPh", "dapAdditions",
            "so2Additions", "reasonings",
        }
        missing = expected_keys - set(t.keys())
        assert not missing, f"missing keys: {missing}"


# ---------------- alerts behavioural parity ----------------
class TestAlertsRefactor:
    def test_alerts_still_returns_5(self, session):
        r = _trpc_get(session, "vintageLog.alerts")
        assert r.status_code == 200, r.text
        payload = r.json()["result"]["data"]["json"]
        alerts = payload["alerts"] if isinstance(payload, dict) else payload
        assert isinstance(alerts, list)
        assert len(alerts) == 5, f"expected 5 alerts, got {len(alerts)}"
        for a in alerts:
            assert a["severity"] in ("high", "medium", "low")
            assert a.get("title") and a.get("detail") and a.get("action")


# ---------------- LLM cost-meter regression ----------------
class TestLlmMeterRegression:
    def _calls(self, session):
        r = _trpc_get(session, "admin.llmStats")
        return r.json()["result"]["data"]["json"]["totals"]["calls"]

    def test_cron_does_not_increment_llm_calls(self, session):
        before = self._calls(session)
        # Two dry-runs back-to-back
        session.get(f"{BASE_URL}/api/scheduled/daily-alert-email?dryRun=1", timeout=30)
        session.get(f"{BASE_URL}/api/scheduled/daily-alert-email?dryRun=1", timeout=30)
        after = self._calls(session)
        assert after == before, f"cron incremented LLM calls: before={before}, after={after}"
