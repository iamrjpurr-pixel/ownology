"""
Daily LLM Budget Guard tests — verifies the new daily-budget feature added to
llmMeter.ts and the synthetic 'AI paused' response from forgeShim.ts.

Spec under test:
- admin.llmStats.daily {dateKey, spendUsd, budgetUsd, exceeded, remainingUsd}
- admin.resetDailyBudget mutation
- admin.resetLlmStats also resets daily spend
- forgeShim returns synthetic OpenAI-shaped 'paused' response when over budget
"""

import os
import re
import json
import time
import subprocess
import pytest
import requests

BASE_URL = "https://ownership-dev.preview.emergentagent.com"
TIMEOUT = 120
ENV_PATH = "/app/.env"


# ---------- helpers ----------

def _trpc_post(proc: str, payload):
    return requests.post(
        f"{BASE_URL}/api/trpc/{proc}",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"json": payload}),
        timeout=TIMEOUT,
    )


def _trpc_get(proc: str):
    return requests.get(f"{BASE_URL}/api/trpc/{proc}", timeout=TIMEOUT)


def reset_stats():
    r = _trpc_post("admin.resetLlmStats", None)
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def reset_daily():
    r = _trpc_post("admin.resetDailyBudget", None)
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def get_stats():
    r = _trpc_get("admin.llmStats")
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def ask_tutor(question="What is malolactic fermentation? Answer in one sentence."):
    r = _trpc_post("tutor.ask", {"question": question})
    return r


def set_env_budget(value: str):
    """Set DAILY_LLM_BUDGET_USD in /app/.env and restart backend."""
    with open(ENV_PATH, "r") as f:
        text = f.read()
    if re.search(r"^DAILY_LLM_BUDGET_USD=.*$", text, flags=re.M):
        text = re.sub(r"^DAILY_LLM_BUDGET_USD=.*$", f"DAILY_LLM_BUDGET_USD={value}", text, flags=re.M)
    else:
        text += f"\nDAILY_LLM_BUDGET_USD={value}\n"
    with open(ENV_PATH, "w") as f:
        f.write(text)
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"], check=True, capture_output=True)
    # wait for backend to come up
    for _ in range(30):
        time.sleep(1)
        try:
            r = requests.get(f"{BASE_URL}/api/trpc/admin.llmStats", timeout=10)
            if r.status_code == 200:
                return
        except Exception:
            pass
    raise RuntimeError("Backend did not come back online")


# ---------- TESTS ----------

class TestDailyBudgetStatsShape:
    """admin.llmStats returns the new daily{} sub-object."""

    def test_llm_stats_has_daily_object(self):
        stats = get_stats()
        assert "daily" in stats, f"Missing daily key in stats: {list(stats.keys())}"
        d = stats["daily"]
        for key in ("dateKey", "spendUsd", "budgetUsd", "exceeded", "remainingUsd"):
            assert key in d, f"Missing daily.{key}"
        # dateKey is YYYY-MM-DD
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", d["dateKey"]), d["dateKey"]
        # budgetUsd reflects env value (=10 per current .env)
        assert d["budgetUsd"] == 10, f"Expected budgetUsd=10, got {d['budgetUsd']}"
        assert isinstance(d["exceeded"], bool)
        assert isinstance(d["spendUsd"], (int, float))


class TestResetLlmStatsAlsoResetsDaily:
    def test_reset_llm_stats_zeroes_daily_spend(self):
        reset_stats()
        stats = get_stats()
        assert stats["daily"]["spendUsd"] == 0
        assert stats["daily"]["exceeded"] is False


class TestResetDailyBudgetMutation:
    def test_reset_daily_budget_returns_ok_with_datekey(self):
        r = _trpc_post("admin.resetDailyBudget", None)
        assert r.status_code == 200, r.text
        data = r.json()["result"]["data"]["json"]
        assert data["ok"] is True
        assert re.match(r"^\d{4}-\d{2}-\d{2}$", data["dateKey"])

    def test_reset_daily_budget_clears_spend(self):
        reset_daily()
        stats = get_stats()
        assert stats["daily"]["spendUsd"] == 0
        assert stats["daily"]["exceeded"] is False


class TestNormalLlmCallAccumulatesUnderBudget:
    """With budget=10, a normal tutor.ask should accumulate small spend but stay under."""

    def test_one_call_accumulates_small_spend(self):
        reset_stats()
        before = get_stats()
        assert before["daily"]["spendUsd"] == 0

        r = ask_tutor("Define brix in one short sentence.")
        assert r.status_code == 200, r.text
        body = r.json()["result"]["data"]["json"]
        # Real LLM answer should be a longer string (>50 chars)
        answer = body.get("answer") or body.get("content") or body.get("message") or json.dumps(body)
        assert isinstance(answer, str) and len(answer) > 50, f"Expected real LLM answer, got: {answer!r}"

        # Allow a moment for the async meter to flush
        time.sleep(2)
        after = get_stats()
        assert after["daily"]["spendUsd"] > 0, "Daily spend did not accumulate"
        assert after["daily"]["spendUsd"] < 10, "Daily spend should be well under $10"
        assert after["daily"]["exceeded"] is False


class TestBudgetEnforcement:
    """Set budget to tiny value, fire 2 calls — 2nd must hit synthetic paused response."""

    @classmethod
    def setup_class(cls):
        # Lower budget to a tiny value so 1 real call arms the guard.
        # Single tutor.ask on gpt-5.4-mini spends ~$0.0004; budget=0.0003 guarantees arm
        # after exactly one call, while still letting that first call through.
        set_env_budget("0.0003")

    @classmethod
    def teardown_class(cls):
        # Restore default $10 budget.
        set_env_budget("10")

    def test_synthetic_paused_response_after_threshold(self):
        # After backend restart, stats are reset by process restart. But reset to be safe.
        reset_stats()
        stats0 = get_stats()
        assert stats0["daily"]["budgetUsd"] == 0.0003, f"Budget env not picked up: {stats0['daily']}"
        assert stats0["daily"]["spendUsd"] == 0

        # Call 1 — should succeed with real LLM answer (and arm the guard).
        r1 = ask_tutor("In one short sentence, what is yeast?")
        assert r1.status_code == 200, r1.text
        body1 = r1.json()["result"]["data"]["json"]
        ans1 = body1.get("answer") or body1.get("content") or json.dumps(body1)
        assert isinstance(ans1, str)
        # Real answer is >50 chars and shouldn't contain the paused phrase.
        assert "temporarily paused" not in ans1.lower(), f"Call 1 unexpectedly paused: {ans1!r}"
        assert len(ans1) > 30, f"Call 1 too short: {ans1!r}"

        time.sleep(2)
        mid = get_stats()
        calls_after_real = mid["totals"]["calls"]
        assert calls_after_real >= 1, f"Real call didn't register: {mid['totals']}"
        assert mid["daily"]["spendUsd"] > 0
        # Budget should be exceeded now (spend ≥ $0.0005)
        assert mid["daily"]["exceeded"] is True, f"Guard not armed: {mid['daily']}"

        # Call 2 — should return the synthetic paused response.
        r2 = ask_tutor("In one short sentence, what is fermentation?")
        assert r2.status_code == 200, r2.text
        body2 = r2.json()["result"]["data"]["json"]
        ans2 = body2.get("answer") or body2.get("content") or json.dumps(body2)
        assert "temporarily paused" in ans2.lower(), f"Expected paused message, got: {ans2!r}"

        # Synthetic response must NOT increment totals.calls (usage:0/0/0).
        time.sleep(2)
        after = get_stats()
        assert after["totals"]["calls"] == calls_after_real, (
            f"Synthetic response incremented totals.calls "
            f"({calls_after_real} → {after['totals']['calls']})"
        )

    def test_reset_daily_budget_unpauses(self):
        # We're still in budget=0.0005 state (guard armed from previous test in class).
        # Reset daily and verify next call succeeds again.
        reset_daily()
        stats = get_stats()
        assert stats["daily"]["spendUsd"] == 0
        assert stats["daily"]["exceeded"] is False

        r = ask_tutor("In one short sentence, what is a vintage?")
        assert r.status_code == 200, r.text
        body = r.json()["result"]["data"]["json"]
        ans = body.get("answer") or body.get("content") or json.dumps(body)
        # After reset, next call should be a real answer (before it arms guard again).
        assert "temporarily paused" not in ans.lower(), f"Still paused after reset: {ans!r}"


class TestPostRestoreBudgetIsTen:
    """After teardown of TestBudgetEnforcement, .env should be back to 10."""

    def test_budget_restored_to_ten(self):
        stats = get_stats()
        assert stats["daily"]["budgetUsd"] == 10, f"Budget not restored: {stats['daily']}"
