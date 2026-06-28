"""Backend tests for iteration_13 new features:
  - pricing.logConversion mutation (suffixes source with ':converted')
  - pricing.funnelStats: per-row conversions + conversionPct, totals.conversions + conversionPct,
    canonical-source merging (e.g. 'free-paused:converted' folds into 'free-paused')
  - outreach.bySlug returns NEW field `calendlyUrl` resolved server-side
    (per-contact calendlyOverride wins, else CALENDLY_DEFAULT_URL env)
  - Regression: pricing.logView still inserts a non-converted row.
"""
import json
import os
import time
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com").rstrip("/")
TRPC = f"{BASE_URL}/api/trpc"
DEFAULT_CALENDLY = "https://calendly.com/ownology"


# ---------- helpers (non-batched tRPC, matches existing test_conversion_funnel.py) ----------
def trpc_query(proc, payload):
    qs = urllib.parse.quote(json.dumps({"json": payload}))
    r = requests.get(f"{TRPC}/{proc}?input={qs}", timeout=20)
    try:
        return {"status": r.status_code, "json": r.json(), "text": r.text}
    except Exception:
        return {"status": r.status_code, "json": None, "text": r.text}


def trpc_mutation(proc, payload):
    r = requests.post(f"{TRPC}/{proc}",
                      json={"json": payload},
                      headers={"Content-Type": "application/json"},
                      timeout=20)
    try:
        return {"status": r.status_code, "json": r.json(), "text": r.text}
    except Exception:
        return {"status": r.status_code, "json": None, "text": r.text}


def data_of(resp):
    return resp["json"]["result"]["data"]["json"]


def funnel_stats(days=30):
    resp = trpc_query("pricing.funnelStats", {"days": days})
    assert resp["status"] == 200, f"funnelStats failed: {resp}"
    return data_of(resp)


# ---------- pricing.logConversion ----------
class TestLogConversion:
    def test_returns_ok_and_suffixed_source(self):
        resp = trpc_mutation("pricing.logConversion", {"source": "free-paused"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d["ok"] is True, d
        assert d["source"] == "free-paused:converted", d

    def test_normalisation_lowercase_and_punctuation(self):
        resp = trpc_mutation("pricing.logConversion", {"source": "Homepage-Hero"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d["source"] == "homepage-hero:converted", d

    def test_zod_rejects_empty(self):
        resp = trpc_mutation("pricing.logConversion", {"source": ""})
        assert resp["status"] in (400, 422), resp

    def test_zod_rejects_oversize(self):
        resp = trpc_mutation("pricing.logConversion", {"source": "x" * 33})
        assert resp["status"] in (400, 422), resp

    def test_inserts_row_observable_via_funnelstats(self):
        # Unique source to avoid contention with seeded data
        tag = f"cv-tst-{int(time.time())}"[:20]  # leaves room for ':converted'
        # First, log 2 views so conv% math is meaningful
        for _ in range(2):
            r = trpc_mutation("pricing.logView", {"source": tag})
            assert r["status"] == 200, r
        # Then log 1 conversion
        r = trpc_mutation("pricing.logConversion", {"source": tag})
        assert r["status"] == 200, r
        d = data_of(r)
        assert d["source"] == f"{tag}:converted"

        # Verify funnelStats merges + computes correctly
        time.sleep(0.5)
        stats = funnel_stats(30)
        rows = {r["source"]: r for r in stats["bySource"]}
        assert tag in rows, f"canonical tag missing from bySource: {list(rows.keys())}"
        row = rows[tag]
        assert row["count"] == 2, f"views: {row}"
        assert row["conversions"] == 1, f"conversions: {row}"
        # conversionPct = 1/2*100 = 50.0
        assert row["conversionPct"] == 50.0, f"conv%: {row}"
        # canonical merge: no row named '<tag>:converted'
        assert f"{tag}:converted" not in rows, f"converted row leaked as separate: {list(rows.keys())}"


# ---------- pricing.funnelStats new fields ----------
class TestFunnelStatsShape:
    def test_totals_includes_conversions_and_pct_as_numbers(self):
        stats = funnel_stats(30)
        assert "totals" in stats
        t = stats["totals"]
        assert "conversions" in t, t
        assert "conversionPct" in t, t
        assert "views" in t
        assert isinstance(t["conversions"], (int, float))
        assert isinstance(t["conversionPct"], (int, float))
        # If there are conversions, pct should be > 0
        if t["views"] > 0 and t["conversions"] > 0:
            assert t["conversionPct"] > 0

    def test_each_bysource_row_has_conversions_and_pct(self):
        stats = funnel_stats(30)
        assert len(stats["bySource"]) > 0, "expected seeded data"
        for row in stats["bySource"]:
            assert "conversions" in row, row
            assert "conversionPct" in row, row
            assert isinstance(row["conversions"], (int, float)), row
            assert isinstance(row["conversionPct"], (int, float)), row
            # Math sanity: pct = conversions/views*100 (rounded 1dp)
            if row["count"] > 0:
                expected = round(row["conversions"] / row["count"] * 100, 1)
                assert abs(row["conversionPct"] - expected) < 0.05, (
                    f"row {row['source']}: conv% {row['conversionPct']} ≠ expected {expected}"
                )

    def test_increment_persists(self):
        # Pick existing seeded source 'free-paused' (per agent context already has views & convs)
        # Log one more conversion and verify counter increments
        stats_before = funnel_stats(30)
        bs = {r["source"]: r for r in stats_before["bySource"]}
        if "free-paused" not in bs:
            # seed a view first so the canonical row exists
            trpc_mutation("pricing.logView", {"source": "free-paused"})
            time.sleep(0.3)
            stats_before = funnel_stats(30)
            bs = {r["source"]: r for r in stats_before["bySource"]}
        before_conv = bs["free-paused"]["conversions"]
        before_total_conv = stats_before["totals"]["conversions"]

        r = trpc_mutation("pricing.logConversion", {"source": "free-paused"})
        assert r["status"] == 200, r
        time.sleep(0.4)

        stats_after = funnel_stats(30)
        after = {r2["source"]: r2 for r2 in stats_after["bySource"]}["free-paused"]
        assert after["conversions"] == before_conv + 1, (
            f"free-paused conv {before_conv} → {after['conversions']}"
        )
        assert stats_after["totals"]["conversions"] == before_total_conv + 1


# ---------- pricing.logView still works (regression) ----------
class TestLogViewRegression:
    def test_logview_inserts_non_converted(self):
        tag = f"rg-{int(time.time())}"
        r = trpc_mutation("pricing.logView", {"source": tag})
        assert r["status"] == 200, r
        d = data_of(r)
        assert d["ok"] is True
        # source field NOT suffixed with :converted
        assert ":converted" not in d["source"], d
        time.sleep(0.3)
        stats = funnel_stats(30)
        rows = {r2["source"]: r2 for r2 in stats["bySource"]}
        assert tag in rows
        assert rows[tag]["count"] >= 1
        assert rows[tag]["conversions"] == 0


# ---------- outreach.bySlug now returns calendlyUrl ----------
class TestBySlugCalendly:
    def test_bySlug_returns_calendlyUrl_from_env_when_no_override(self):
        # nathan-brokenwood-wines per spec has calendlyOverride=null
        resp = trpc_query("outreach.bySlug", {"slug": "nathan-brokenwood-wines"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        if d is None:
            pytest.skip("nathan-brokenwood-wines not seeded")
        assert "calendlyUrl" in d, f"calendlyUrl missing: {d}"
        assert d["calendlyUrl"] == DEFAULT_CALENDLY, f"expected env default, got {d['calendlyUrl']}"
        # backward compat: calendlyOverride still returned
        assert "calendlyOverride" in d, f"calendlyOverride dropped: {d}"

    def test_bySlug_per_contact_override_wins(self):
        # Create a contact with calendlyOverride, then check bySlug returns the override (not env default)
        slug = f"test-cal-{int(time.time())}"
        override_url = "https://calendly.com/test-override-iter13"
        cr = trpc_mutation("outreach.create", {
            "firstName": "CalTest",
            "winery": f"CW{int(time.time())}",
            "slug": slug,
            "calendlyOverride": override_url,
        })
        if cr["status"] != 200:
            pytest.skip(f"outreach.create not accepting calendlyOverride or other failure: {cr}")
        try:
            resp = trpc_query("outreach.bySlug", {"slug": slug})
            assert resp["status"] == 200, resp
            d = data_of(resp)
            assert d is not None
            assert d["calendlyUrl"] == override_url, f"override should win, got {d['calendlyUrl']}"
            assert d["calendlyOverride"] == override_url
        finally:
            trpc_mutation("outreach.remove", {"slug": slug})

    def test_bySlug_unknown_still_null(self):
        resp = trpc_query("outreach.bySlug", {"slug": "totally-bogus-zzz-iter13"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        assert d is None


# ---------- Light regression: outreach mutations untouched ----------
class TestOutreachRegression:
    def test_list_create_status_remove(self):
        slug = f"test-iter13-{int(time.time())}"
        cr = trpc_mutation("outreach.create", {"firstName": "I13", "winery": f"W{int(time.time())}", "slug": slug})
        assert cr["status"] == 200, cr
        try:
            ls = trpc_query("outreach.list", {})
            assert ls["status"] == 200, ls
            contacts = data_of(ls)["contacts"]
            assert any(c["slug"] == slug for c in contacts)

            ss = trpc_mutation("outreach.setStatus", {"slug": slug, "status": "warm"})
            assert ss["status"] == 200, ss

            mv = trpc_mutation("outreach.markViewed", {"slug": slug})
            assert mv["status"] == 200, mv
            ms = trpc_mutation("outreach.markSmsSent", {"slug": slug})
            assert ms["status"] == 200, ms
            mb = trpc_mutation("outreach.markBooked", {"slug": slug})
            assert mb["status"] == 200, mb
        finally:
            trpc_mutation("outreach.remove", {"slug": slug})
