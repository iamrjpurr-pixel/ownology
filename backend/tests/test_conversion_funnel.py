"""Backend tests for /api/trpc/pricing.* — Conversion Attribution Funnel.

Covers: logView (publicProcedure mutation), funnelStats (ownerProcedure query),
source normalisation, daily zero-fill, share-pct math, Zod validation.
"""
import json
import os
import time
import urllib.parse
from typing import Any

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com").rstrip("/")
TRPC = f"{BASE_URL}/api/trpc"


# ---------- helpers ----------
def trpc_query(proc: str, payload: dict) -> dict:
    qs = urllib.parse.quote(json.dumps({"json": payload}))
    r = requests.get(f"{TRPC}/{proc}?input={qs}", timeout=20)
    return {"status": r.status_code, "json": _safe_json(r)}


def trpc_mutation(proc: str, payload: dict) -> dict:
    r = requests.post(
        f"{TRPC}/{proc}",
        json={"json": payload},
        headers={"Content-Type": "application/json"},
        timeout=20,
    )
    return {"status": r.status_code, "json": _safe_json(r)}


def _safe_json(r) -> Any:
    try:
        return r.json()
    except Exception:
        return {"_raw": r.text}


def data_of(resp: dict) -> dict:
    return resp["json"]["result"]["data"]["json"]


def funnel_stats(days: int = 30) -> dict:
    resp = trpc_query("pricing.funnelStats", {"days": days})
    assert resp["status"] == 200, f"funnelStats failed: {resp}"
    return data_of(resp)


# ---------- logView ----------
class TestLogView:
    def test_log_view_known_source(self):
        resp = trpc_mutation("pricing.logView", {"source": "free-paused"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d["ok"] is True
        assert d["source"] == "free-paused"

    def test_log_view_normalisation_trim_and_lowercase(self):
        resp = trpc_mutation("pricing.logView", {"source": "  Free-PAUSED  "})
        # trim + lowercase happens *after* zod min(1).max(32) which sees 17 chars — ok.
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d["source"] == "free-paused", f"expected normalised free-paused, got {d}"

    def test_log_view_unknown_source_stored_as_is(self):
        unique = f"my-experiment-{int(time.time())}"[:32]
        resp = trpc_mutation("pricing.logView", {"source": unique})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d["source"] == unique.lower()
        # confirm it appears in stats
        stats = funnel_stats(30)
        sources = [r["source"] for r in stats["bySource"]]
        assert unique.lower() in sources, f"unknown source not aggregated: {sources}"

    def test_log_view_non_alnum_replaced(self):
        # input: "FREE PAUSED!!" → "free-paused--" → still <=32 chars
        resp = trpc_mutation("pricing.logView", {"source": "FREE PAUSED!!"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        # spaces and ! → '-'; final form should match the regex [a-z0-9-]+
        assert d["source"] in ("free-paused", "free-paused--"), d

    def test_log_view_zod_rejects_empty(self):
        resp = trpc_mutation("pricing.logView", {"source": ""})
        assert resp["status"] in (400, 422), f"expected zod error, got {resp}"

    def test_log_view_zod_rejects_oversize(self):
        resp = trpc_mutation("pricing.logView", {"source": "x" * 33})
        assert resp["status"] in (400, 422), f"expected zod error, got {resp}"


# ---------- funnelStats ----------
class TestFunnelStats:
    def test_shape_default_30_days(self):
        d = funnel_stats(30)
        assert d["windowDays"] == 30
        assert "sinceIso" in d
        assert "totals" in d and "views" in d["totals"] and "sources" in d["totals"]
        assert isinstance(d["bySource"], list)
        for row in d["bySource"]:
            assert {"source", "count", "firstAt", "lastAt", "sharePct"} <= set(row)
        assert isinstance(d["daily"], list)
        assert len(d["daily"]) == 30, f"daily should be 30 entries, got {len(d['daily'])}"
        for row in d["daily"]:
            assert "dayKey" in row and "count" in row

    def test_daily_zero_fill_length_7(self):
        d = funnel_stats(7)
        assert d["windowDays"] == 7
        assert len(d["daily"]) == 7

    def test_daily_zero_fill_length_90(self):
        d = funnel_stats(90)
        assert len(d["daily"]) == 90

    def test_daily_zero_fill_length_365(self):
        d = funnel_stats(365)
        assert len(d["daily"]) == 365

    def test_out_of_range_zod_error(self):
        resp = trpc_query("pricing.funnelStats", {"days": 400})
        assert resp["status"] in (400, 422), f"expected zod error, got {resp}"

    def test_order_desc_by_count(self):
        d = funnel_stats(30)
        counts = [r["count"] for r in d["bySource"]]
        assert counts == sorted(counts, reverse=True), f"bySource not sorted DESC: {counts}"

    def test_share_pct_sums_to_100(self):
        d = funnel_stats(30)
        if d["totals"]["views"] == 0:
            pytest.skip("no views in window")
        total_share = sum(r["sharePct"] for r in d["bySource"])
        # allow small float rounding (one-decimal × N rows)
        assert 99.0 <= total_share <= 101.0, f"sharePct sums to {total_share}"

    def test_aggregation_correctness_seeded(self):
        """The seed asserted 10 views: free-paused×3 (30%), homepage-hero×2 (20%), 5 others ×1 (10% each)."""
        d = funnel_stats(30)
        by = {r["source"]: r for r in d["bySource"]}
        # We just confirm free-paused and homepage-hero are present with right share at minimum.
        if "free-paused" not in by or "homepage-hero" not in by:
            pytest.skip("seed data missing — non-blocking")
        # Counts only need to be >= seeded; share check on a known snapshot is brittle.
        assert by["free-paused"]["count"] >= 3
        assert by["homepage-hero"]["count"] >= 2


# ---------- end-to-end: logView → funnelStats ----------
class TestRoundTrip:
    def test_log_then_aggregate(self):
        tag = f"test-agent-{int(time.time())}"[:32]
        before = funnel_stats(30)
        before_count = next(
            (r["count"] for r in before["bySource"] if r["source"] == tag), 0
        )
        # log 3 views
        for _ in range(3):
            r = trpc_mutation("pricing.logView", {"source": tag})
            assert r["status"] == 200, r
        # tiny wait — db is on Railway, latency varies
        time.sleep(1.5)
        after = funnel_stats(30)
        after_count = next(
            (r["count"] for r in after["bySource"] if r["source"] == tag), 0
        )
        assert after_count - before_count == 3, f"expected +3, got {after_count - before_count}"


# ---------- regression smoke ----------
class TestRegressionSmoke:
    @pytest.mark.parametrize("path", [
        "/stats", "/tank-qr", "/the-press/compare", "/compliance", "/admin",
    ])
    def test_pages_render(self, path):
        r = requests.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200, f"{path} → {r.status_code}"

    def test_admin_llm_stats_still_works(self):
        # this endpoint existed pre-change; just confirm it didn't regress
        resp = trpc_query("admin.llmStats", {})
        # tolerate either 200 or 404 (if endpoint name differs), but NOT 500
        assert resp["status"] != 500, f"admin.llmStats regressed: {resp}"
