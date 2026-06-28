"""
Iteration 10 — freeRun.curiosityAsk "Daily AI budget reached" funnel.

Verifies that when the free-tier LLM budget is exhausted:
  1. POST freeRun.curiosityAsk returns paused:true, structured payload.
  2. The user's daily 3/3 quota is NOT charged (quota stays at currentCount).
  3. The synthetic paused message is NOT persisted to the Cellar Journal.
  4. Normal (non-paused) flow regression still works after restoring budget.

Mutates /app/.env DAILY_FREE_BUDGET_USD between 0.0005 and 3 and restarts
backend via supervisorctl. Restores defaults at teardown_class.
"""

import json
import os
import re
import subprocess
import time

import pytest
import requests

BASE_URL = "https://ownership-dev.preview.emergentagent.com"
TIMEOUT = 120
ENV_PATH = "/app/.env"

PAUSED_REGEX = re.compile(r"temporarily paused — Ownology has reached today", re.I)


# ---------- helpers ----------

def _trpc_post(proc, payload):
    return requests.post(
        f"{BASE_URL}/api/trpc/{proc}",
        headers={"Content-Type": "application/json"},
        data=json.dumps({"json": payload}),
        timeout=TIMEOUT,
    )


def _trpc_get(proc):
    return requests.get(f"{BASE_URL}/api/trpc/{proc}", timeout=TIMEOUT)


def reset_stats():
    r = _trpc_post("admin.resetLlmStats", None)
    assert r.status_code == 200, r.text


def reset_daily():
    r = _trpc_post("admin.resetDailyBudget", None)
    assert r.status_code == 200, r.text


def reset_free_quota():
    r = _trpc_post("admin.resetFreeRunQuota", {})
    assert r.status_code == 200, r.text


def ask_curiosity(question):
    r = _trpc_post("freeRun.curiosityAsk", {"question": question})
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def get_status():
    r = _trpc_get("freeRun.status")
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def get_journal_count():
    """Count cellar journal entries for the dev-bypass seed user."""
    r = _trpc_get("cellarJournal.list")
    # If the endpoint requires input, fall back; otherwise expect 200.
    if r.status_code != 200:
        # tRPC list with no input — try with empty
        r = requests.get(
            f"{BASE_URL}/api/trpc/cellarJournal.list?input=" + json.dumps({"json": {}}),
            timeout=TIMEOUT,
        )
    assert r.status_code == 200, r.text
    data = r.json()["result"]["data"]["json"]
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict) and "entries" in data:
        return len(data["entries"])
    if isinstance(data, dict) and "items" in data:
        return len(data["items"])
    if isinstance(data, dict) and "rows" in data:
        return len(data["rows"])
    return -1  # unknown shape — will skip persistence assertion


def set_env_var(key, value):
    with open(ENV_PATH, "r") as f:
        text = f.read()
    pattern = rf"^{re.escape(key)}=.*$"
    if re.search(pattern, text, flags=re.M):
        text = re.sub(pattern, f"{key}={value}", text, flags=re.M)
    else:
        text += f"\n{key}={value}\n"
    with open(ENV_PATH, "w") as f:
        f.write(text)


def restart_backend():
    subprocess.run(
        ["sudo", "supervisorctl", "restart", "backend"],
        check=True, capture_output=True,
    )
    for _ in range(30):
        time.sleep(1)
        try:
            r = requests.get(f"{BASE_URL}/api/trpc/admin.llmStats", timeout=10)
            if r.status_code == 200:
                return
        except Exception:
            pass
    raise RuntimeError("Backend did not come back online")


# ---------- fixtures ----------

@pytest.fixture(scope="module", autouse=True)
def restore_env_after_module():
    """Always restore DAILY_FREE_BUDGET_USD=3 at the end of the module."""
    yield
    set_env_var("DAILY_FREE_BUDGET_USD", "3")
    restart_backend()


# ---------- Normal flow regression ----------

class TestNormalFlow:
    """Free budget = $3 (default). Confirm answer is real + quota bumped."""

    @classmethod
    def setup_class(cls):
        set_env_var("DAILY_FREE_BUDGET_USD", "3")
        restart_backend()
        reset_daily()
        reset_stats()
        reset_free_quota()

    def test_normal_call_returns_real_answer_and_bumps_quota(self):
        before = get_status()
        used_before = before["questionsUsedToday"]

        data = ask_curiosity("What is malic acid? Answer in one short paragraph.")

        # Shape check (non-paused path)
        assert "answer" in data and "limitReached" in data
        assert "paused" in data, f"missing paused key: {data}"
        assert data["paused"] is False, f"unexpectedly paused: {data}"
        assert data["limitReached"] is False
        assert isinstance(data["answer"], str) and len(data["answer"]) > 50, \
            f"answer too short: {data['answer']!r}"
        assert data["questionsUsed"] == used_before + 1, \
            f"quota not bumped: was {used_before}, now {data['questionsUsed']}"
        assert data["questionsTotal"] == 3

        # topicTag may be null if classification failed, but field should be there
        assert "topicTag" in data


# ---------- Paused flow ----------

class TestPausedFlow:
    """Free budget = $0.0005. Confirm structured paused payload + no quota bump."""

    @classmethod
    def setup_class(cls):
        # Burn no spend before lowering budget
        reset_daily()
        reset_stats()
        reset_free_quota()
        set_env_var("DAILY_FREE_BUDGET_USD", "0.0005")
        restart_backend()
        # Reset again after restart (in-memory state)
        reset_daily()
        reset_stats()
        reset_free_quota()

    def test_first_call_real_then_subsequent_paused(self):
        # ── Call 1: should be a real answer, arms the guard
        first = ask_curiosity("In one sentence, what is tannin?")
        assert first["paused"] is False, f"call 1 unexpectedly paused: {first}"
        assert len(first["answer"]) > 30
        assert first["questionsUsed"] == 1

        time.sleep(2)

        # ── Call 2: budget exhausted → paused payload
        second = ask_curiosity("In one sentence, what is acidity?")

        # Structured paused shape
        for key in ("answer", "topicTag", "limitReached", "paused",
                    "pausedTier", "pausedMessage", "retryAt",
                    "questionsUsed", "questionsTotal"):
            assert key in second, f"paused payload missing {key}: {second}"

        assert second["paused"] is True, f"call 2 not paused: {second}"
        assert second["pausedTier"] in ("free", "overall"), \
            f"bad pausedTier: {second['pausedTier']}"
        assert isinstance(second["pausedMessage"], str) and second["pausedMessage"]
        assert second["answer"] == "", f"paused answer should be empty: {second['answer']!r}"
        assert second["topicTag"] is None
        assert second["limitReached"] is False

        # retryAt is a valid ISO with UTC midnight
        retry = second["retryAt"]
        assert isinstance(retry, str)
        assert retry.endswith("T00:00:00.000Z"), f"retryAt not UTC midnight: {retry!r}"

        # ── Critical: quota NOT bumped from paused call
        assert second["questionsUsed"] == 1, \
            f"quota was bumped on paused call: {second['questionsUsed']}"
        assert second["questionsTotal"] == 3

    def test_multiple_paused_calls_do_not_bump_quota(self):
        # Make 3 more paused calls in a row
        for i in range(3):
            r = ask_curiosity(f"In one sentence, what is fermentation {i}?")
            assert r["paused"] is True, f"call {i} should be paused: {r}"
            assert r["questionsUsed"] == 1, \
                f"call {i} bumped quota to {r['questionsUsed']}"

        # Verify via /freeRun.status (DB-backed) that quota is still 1
        status = get_status()
        assert status["questionsUsedToday"] == 1, \
            f"DB quota bumped: {status['questionsUsedToday']}"

    def test_journal_not_persisted_on_paused_calls(self):
        # Snapshot count
        before = get_journal_count()
        if before < 0:
            pytest.skip("cellarJournal.list shape unknown — skipping persistence assertion")

        # Fire 3 paused calls
        for i in range(3):
            r = ask_curiosity(f"In one sentence, what is sulfite {i}?")
            assert r["paused"] is True

        time.sleep(2)  # give any (incorrect) fire-and-forget writes time to land

        after = get_journal_count()
        assert after == before, \
            f"Journal grew during paused calls: before={before} after={after}"


# ---------- End-of-test cleanup verification ----------

class TestCleanupRestoresNormalFlow:
    """After restoring DAILY_FREE_BUDGET_USD=3, fresh call returns real answer."""

    @classmethod
    def setup_class(cls):
        set_env_var("DAILY_FREE_BUDGET_USD", "3")
        restart_backend()
        reset_daily()
        reset_stats()
        reset_free_quota()

    def test_restored_budget_returns_real_answer(self):
        data = ask_curiosity("What is malic acid? Answer in one short paragraph.")
        assert data["paused"] is False, f"still paused after restore: {data}"
        assert len(data["answer"]) > 50
        assert data["questionsUsed"] == 1
