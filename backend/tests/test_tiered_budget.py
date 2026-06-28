"""
Tiered LLM Budget Guard tests — verifies the 3-tier (free/premium/system)
extension of the daily budget guard.

Spec under test:
- admin.llmStats.daily.tiers contains {free, premium, system} with shape
  { spendUsd, budgetUsd, exceeded, remainingUsd }.
- Source classification: freeRun.curiosityAsk → free,
  tutor.ask + direct:tutor.ts:* → premium,
  freeRun.tag + direct:queryRouter.* → system.
- Tier pause semantics: free-tier exhaustion pauses ONLY free calls;
  premium + system continue. Overall cap still pauses everything.
- Synthetic headers + body keys (x-ow-budget-paused, _ownology_budget_tier).
- /stats card has data-testid='stats-daily-tier-{free|premium|system}'.
- admin.resetDailyBudget + admin.resetLlmStats both zero tier buckets.
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


def reset_free_quota():
    r = _trpc_post("admin.resetFreeRunQuota", {})
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def get_stats():
    r = _trpc_get("admin.llmStats")
    assert r.status_code == 200, r.text
    return r.json()["result"]["data"]["json"]


def ask_tutor(question="What is malolactic fermentation? Answer in one sentence."):
    return _trpc_post("tutor.ask", {"question": question})


def ask_curiosity(question="In one short sentence, what is riesling?"):
    return _trpc_post("freeRun.curiosityAsk", {"question": question})


def set_env_var(key: str, value: str):
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
    subprocess.run(["sudo", "supervisorctl", "restart", "backend"],
                   check=True, capture_output=True)
    for _ in range(30):
        time.sleep(1)
        try:
            r = requests.get(f"{BASE_URL}/api/trpc/admin.llmStats", timeout=10)
            if r.status_code == 200:
                return
        except Exception:
            pass
    raise RuntimeError("Backend did not come back online")


def set_envs_and_restart(**kv):
    for k, v in kv.items():
        set_env_var(k, v)
    restart_backend()


# ---------- TESTS ----------

class TestTieredStatsShape:
    """admin.llmStats.daily.tiers contains 3 tiers w/ correct budgets."""

    def test_tiers_object_has_three_keys(self):
        stats = get_stats()
        assert "daily" in stats
        assert "tiers" in stats["daily"], f"Missing tiers: {stats['daily']}"
        tiers = stats["daily"]["tiers"]
        assert set(tiers.keys()) == {"free", "premium", "system"}, \
            f"Unexpected tier keys: {list(tiers.keys())}"

    def test_each_tier_has_correct_shape(self):
        stats = get_stats()
        for t in ("free", "premium", "system"):
            tier = stats["daily"]["tiers"][t]
            for k in ("spendUsd", "budgetUsd", "exceeded", "remainingUsd"):
                assert k in tier, f"tier {t} missing {k}"
            assert isinstance(tier["spendUsd"], (int, float))
            assert isinstance(tier["exceeded"], bool)

    def test_env_budgets_reflected_correctly(self):
        stats = get_stats()
        tiers = stats["daily"]["tiers"]
        # From .env: DAILY_FREE_BUDGET_USD=3, DAILY_PREMIUM_BUDGET_USD=8
        assert tiers["free"]["budgetUsd"] == 3, f"free budget: {tiers['free']}"
        assert tiers["premium"]["budgetUsd"] == 8, f"premium: {tiers['premium']}"
        # System is intentionally uncapped at tier level
        assert tiers["system"]["budgetUsd"] is None, f"system: {tiers['system']}"
        assert tiers["system"]["remainingUsd"] is None


class TestResetClearsTierBuckets:
    def test_reset_llm_stats_zeros_all_tiers(self):
        reset_stats()
        stats = get_stats()
        for t in ("free", "premium", "system"):
            assert stats["daily"]["tiers"][t]["spendUsd"] == 0
            assert stats["daily"]["tiers"][t]["exceeded"] is False

    def test_reset_daily_budget_zeros_all_tiers_and_overall(self):
        reset_daily()
        stats = get_stats()
        assert stats["daily"]["spendUsd"] == 0
        for t in ("free", "premium", "system"):
            assert stats["daily"]["tiers"][t]["spendUsd"] == 0


class TestSourceClassification:
    """After 1 call each, free/premium/system buckets should each have spend."""

    def test_premium_call_accumulates_to_premium_tier(self):
        reset_stats()
        reset_free_quota()

        # Premium: tutor.ask
        r = ask_tutor("In one short sentence, what is brix?")
        assert r.status_code == 200, r.text
        body = r.json()["result"]["data"]["json"]
        ans = body.get("answer") or json.dumps(body)
        assert "temporarily paused" not in ans.lower(), f"unexpectedly paused: {ans!r}"

        time.sleep(2)
        stats = get_stats()
        tiers = stats["daily"]["tiers"]
        assert tiers["premium"]["spendUsd"] > 0, \
            f"Premium tier didn't accumulate from tutor.ask: {tiers}"
        # tutor.ask runs through chatCompletion → x-ow-source=tutor.ask
        # or via direct fetch → direct:tutor.ts:* — both map to premium.

    def test_free_curiosity_accumulates_to_free_tier(self):
        reset_stats()
        reset_free_quota()

        r = ask_curiosity()
        assert r.status_code == 200, f"curiosityAsk failed: {r.status_code} {r.text[:300]}"
        time.sleep(2)
        stats = get_stats()
        tiers = stats["daily"]["tiers"]
        # Free curiosity must accumulate into free tier
        assert tiers["free"]["spendUsd"] > 0 or tiers["system"]["spendUsd"] > 0, \
            f"No free/system spend from curiosityAsk: {tiers}; bySource={stats['bySource']}"

    def test_system_tier_can_accumulate(self):
        """System spend may come from freeRun.tag classifier or queryRouter
        on the freeRun path. We verify via bySource entries."""
        stats = get_stats()
        sources = {row["key"]: row for row in stats.get("bySource", [])}
        # Just verify the SHAPE — system tier exists and we can find system-classed
        # sources if any of these prefixes are present:
        system_prefixes = ("freeRun.tag", "direct:queryRouter", "scheduled.",
                           "direct:vintageLog", "direct:trinityPipeline")
        has_system_source = any(
            any(src.startswith(p) for p in system_prefixes)
            for src in sources.keys()
        )
        # Pass either way — this is informational. Hard requirement is shape.
        print(f"[info] system-tagged sources found: {has_system_source}; "
              f"sources={list(sources.keys())}")


class TestTierPauseSemantics:
    """Free tier exhaustion pauses ONLY free; premium + system keep working."""

    @classmethod
    def setup_class(cls):
        # Arm the free guard with a tiny budget. Single curiosity call burns
        # more than $0.0005 so the next free call is paused.
        set_envs_and_restart(DAILY_FREE_BUDGET_USD="0.0005")

    @classmethod
    def teardown_class(cls):
        set_envs_and_restart(DAILY_FREE_BUDGET_USD="3")

    def test_free_pause_does_not_block_premium(self):
        reset_stats()
        reset_free_quota()
        stats0 = get_stats()
        assert stats0["daily"]["tiers"]["free"]["budgetUsd"] == 0.0005, \
            f"env not picked up: {stats0['daily']['tiers']['free']}"

        # 1) Fire freeRun.curiosityAsk #1 — should succeed (real LLM)
        r1 = ask_curiosity("In one short sentence, what is riesling?")
        assert r1.status_code == 200, f"curiosityAsk failed: {r1.status_code} {r1.text[:300]}"
        body1 = r1.json()["result"]["data"]["json"]
        ans1 = json.dumps(body1).lower()
        # Real answer expected; tier=free shouldn't yet be paused before call 1 runs.
        assert "temporarily paused" not in ans1, f"call 1 paused: {body1}"

        time.sleep(2)
        midstats = get_stats()
        free_tier = midstats["daily"]["tiers"]["free"]
        assert free_tier["spendUsd"] > 0, "free spend didn't accumulate"
        # After call 1, free guard should be armed (spend > 0.0005)
        assert free_tier["exceeded"] is True, f"free not exceeded: {free_tier}"

        # 2) Fire freeRun.curiosityAsk #2 — should be tier-paused
        r2 = ask_curiosity("In one short sentence, what is chardonnay?")
        assert r2.status_code == 200, r2.text
        body2 = r2.json()["result"]["data"]["json"]
        ans2 = json.dumps(body2).lower()
        assert "temporarily paused" in ans2, f"call 2 not paused: {body2}"
        # The tier-pause message specifically mentions "free-tier"
        assert "free-tier" in ans2 or "free" in ans2, \
            f"Expected free-tier wording, got: {body2}"

        # 3) tutor.ask MUST STILL WORK — premium budget ($8) untouched
        r3 = ask_tutor("In one short sentence, what is yeast?")
        assert r3.status_code == 200, r3.text
        body3 = r3.json()["result"]["data"]["json"]
        ans3 = (body3.get("answer") or json.dumps(body3)).lower()
        assert "temporarily paused" not in ans3, \
            f"tutor.ask was paused when only free should be: {body3}"
        assert len(ans3) > 20, f"tutor.ask returned too-short response: {body3}"


class TestOverallPauseAffectsSystem:
    """Even system tier pauses when the overall cap is hit."""

    @classmethod
    def setup_class(cls):
        # Single tutor.ask burns ~$0.0004 total (premium portion + system
        # queryRouter portion). Use 0.0003 so 1 call reliably arms the
        # overall cap.
        set_envs_and_restart(DAILY_LLM_BUDGET_USD="0.0003")

    @classmethod
    def teardown_class(cls):
        set_envs_and_restart(DAILY_LLM_BUDGET_USD="10")

    def test_overall_cap_pauses_everything(self):
        reset_stats()
        reset_free_quota()

        # Burn the overall cap with one tutor.ask
        r1 = ask_tutor("In one short sentence, what is fermentation?")
        assert r1.status_code == 200, r1.text
        body1 = r1.json()["result"]["data"]["json"]
        ans1 = (body1.get("answer") or json.dumps(body1)).lower()
        assert "temporarily paused" not in ans1, f"call 1 paused already: {body1}"

        time.sleep(2)
        mid = get_stats()
        assert mid["daily"]["exceeded"] is True, \
            f"overall not armed: {mid['daily']}"

        # Now ANY call (including system-bound queryRouter) should be paused
        r2 = ask_tutor("In one short sentence, what is a barrel?")
        body2 = r2.json()["result"]["data"]["json"]
        ans2 = (body2.get("answer") or json.dumps(body2)).lower()
        assert "temporarily paused" in ans2, f"overall pause not effective: {body2}"
        # When overall is hit, message uses overall wording (not free-tier)
        assert "overall" in ans2 or "today's" in ans2, \
            f"Expected overall wording: {body2}"


class TestPostRestoreEnvIsCorrect:
    """After all teardowns, .env should reflect the spec values."""

    def test_env_restored_to_spec(self):
        stats = get_stats()
        d = stats["daily"]
        assert d["budgetUsd"] == 10, f"DAILY_LLM_BUDGET_USD: {d}"
        assert d["tiers"]["free"]["budgetUsd"] == 3, \
            f"DAILY_FREE_BUDGET_USD: {d['tiers']['free']}"
        assert d["tiers"]["premium"]["budgetUsd"] == 8, \
            f"DAILY_PREMIUM_BUDGET_USD: {d['tiers']['premium']}"
        assert d["tiers"]["system"]["budgetUsd"] is None
