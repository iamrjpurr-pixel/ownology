# /admin/crm "Your CRM" page backend — crmHome.home/stage/search/person/watch/notFit + outreach copilot public endpoints
# DB IS LIVE PRODUCTION: mutations only touch a self-created E1TEST contact. Never calls sendToTelegram or non-dryRun cron.
import os
import json
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_JWT = open("/root/admin.jwt").read().strip()
OWNER_JWT_FILE = "/tmp/owner.jwt"
DAY = 86_400_000
STAGES = ["not_contacted", "contacted", "opened", "replied", "signed_up", "paying"]


def _jwt_cookie(jwt):
    return {"app_session_id": jwt} if jwt else {}


def q(proc, inp=None, jwt=ADMIN_JWT):
    params = {"input": json.dumps({"json": inp})} if inp is not None else {}
    return requests.get(f"{BASE_URL}/api/trpc/{proc}", params=params, cookies=_jwt_cookie(jwt), timeout=60)


def m(proc, inp, jwt=ADMIN_JWT):
    return requests.post(f"{BASE_URL}/api/trpc/{proc}", json={"json": inp}, cookies=_jwt_cookie(jwt), timeout=60)


def data(r):
    assert r.status_code == 200, f"{r.status_code} {r.text[:400]}"
    d = r.json()["result"]["data"]
    return d.get("json", d) if isinstance(d, dict) else d


@pytest.fixture(scope="module")
def home():
    return data(q("crmHome.home"))


# --- auth gating
class TestAuth:
    @pytest.mark.parametrize("proc,inp", [("crmHome.home", None), ("crmHome.stage", {"stage": "opened"}), ("crmHome.search", {"q": "rod"}), ("crmHome.person", {"userId": 52})])
    def test_anonymous_rejected(self, proc, inp):
        assert q(proc, inp, jwt=None).status_code in (401, 403)

    def test_non_admin_rejected(self):
        jwt = open(OWNER_JWT_FILE).read().strip() if os.path.exists(OWNER_JWT_FILE) else None
        if not jwt:
            pytest.skip("no owner jwt")
        assert q("crmHome.home", jwt=jwt).status_code in (401, 403)

    def test_anonymous_mutation_rejected(self):
        assert m("crmHome.notFit", {"contactId": 999999999}, jwt=None).status_code in (401, 403)


# --- home: funnel + needsYou
class TestHome:
    def test_funnel_shape(self, home):
        assert [f["id"] for f in home["funnel"]] == STAGES
        assert all(isinstance(f["count"], int) and f["count"] >= 0 for f in home["funnel"])

    def test_needs_you_shape_and_cap(self, home):
        n = home["needsYou"]
        assert isinstance(n, list) and len(n) <= 10
        keys = [r["key"] for r in n]
        assert len(keys) == len(set(keys))
        for r in n:
            assert r["reason"] and r["name"]

    def test_needs_you_recency_rules(self, home):
        now = time.time() * 1000
        for r in home["needsYou"]:
            reason = r["reason"]
            if reason.startswith("Came back"):
                assert now - r["at"] <= 3 * DAY + 60_000, r
            elif reason.startswith("Replied"):
                assert now - r["at"] <= 30 * DAY + 60_000, r
            elif reason.startswith("Warm"):
                assert 3 * DAY - 60_000 <= now - r["at"] <= 30 * DAY + 60_000, r
            elif reason.startswith("Signed up"):
                assert r["userId"] is not None
            else:
                pytest.fail(f"unknown reason {reason}")


# --- stage lists
class TestStage:
    @pytest.mark.parametrize("stage", STAGES)
    def test_stage_rows(self, stage, home):
        rows = data(q("crmHome.stage", {"stage": stage}))
        assert isinstance(rows, list)
        count = next(f["count"] for f in home["funnel"] if f["id"] == stage)
        assert len(rows) == min(count, 300 if stage not in ("signed_up", "paying") else 200) or stage == "paying", (stage, len(rows), count)
        for r in rows[:5]:
            assert r["key"] and "line" in r

    def test_bad_stage_400(self):
        assert q("crmHome.stage", {"stage": "bogus"}).status_code == 400


# --- search
class TestSearch:
    def test_search_rod(self):
        rows = data(q("crmHome.search", {"q": "rod"}))
        assert len(rows) > 0
        assert any("rod" in (r["name"] + r["winery"]).lower() for r in rows)

    def test_search_region(self):
        rows = data(q("crmHome.search", {"q": "barossa"}))
        assert isinstance(rows, list) and len(rows) > 0

    def test_search_nonsense_empty(self):
        assert data(q("crmHome.search", {"q": "zzqxjv-nothing-9x"})) == []

    def test_search_too_short_400(self):
        assert q("crmHome.search", {"q": "r"}).status_code == 400


# --- person
class TestPerson:
    def test_rod_user_52(self):
        p = data(q("crmHome.person", {"userId": 52}))
        assert p["userId"] == 52
        assert p["canCard"] is False
        assert p["story"] and all("day" in s and "text" in s for s in p["story"])
        ats = [s["at"] for s in p["story"]]
        assert ats == sorted(ats)

    def test_person_not_found(self):
        assert q("crmHome.person", {"contactId": 999999999}).status_code == 404


# --- outreach copilot public endpoints (safe)
class TestCopilotPublic:
    def test_dryrun(self):
        r = requests.get(f"{BASE_URL}/api/scheduled/outreach-cards", params={"dryRun": "1"}, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert d["dryRun"] is True
        assert len(d["picks"]) <= 5 and len(d["autos"]) <= 10
        assert all(a["kind"] in ("revive", "auto1", "auto2") for a in d["autos"])
        slugs = [p["slug"] for p in d["picks"]] + [a["slug"] for a in d["autos"]]
        assert "rod-patina-wines" not in slugs

    def test_unsubscribe_bad_token(self):
        assert requests.get(f"{BASE_URL}/api/outreach/unsubscribe", params={"c": "rod-patina-wines", "t": "bad"}, timeout=30).status_code == 400

    def test_sms_bad_token(self):
        assert requests.get(f"{BASE_URL}/api/outreach/sms/1", params={"t": "bad"}, timeout=30, allow_redirects=False).status_code == 403

    def test_webhook_no_secret(self):
        r = requests.post(f"{BASE_URL}/api/telegram/webhook", json={"message": {"text": "/more", "chat": {"id": 1}}}, timeout=30)
        assert r.status_code == 200 and r.json() == {"ok": True}


# --- mutations on self-created E1TEST contact only
class TestMutationsOnTestContact:
    def test_watch_and_notfit(self):
        slug = f"e1test-crm-{int(time.time())}"
        r = m("outreach.create", {"firstName": "E1TEST", "winery": "E1TEST Winery", "slug": slug, "autoRewrite": False})
        assert r.status_code == 200, r.text[:300]
        try:
            rows = data(q("crmHome.search", {"q": "E1TEST Winery"}))
            mine = [x for x in rows if x["contactId"] and x["winery"] == "E1TEST Winery"]
            assert mine, rows
            cid = max(x["contactId"] for x in mine)
            p = data(q("crmHome.person", {"contactId": cid}))
            assert p["slug"] == slug and p["watching"] is False and p["notFit"] is False and p["canCard"] is False
            assert data(m("crmHome.watch", {"contactId": cid}))["ok"] is True
            assert data(q("crmHome.person", {"contactId": cid}))["watching"] is True
            assert data(m("crmHome.notFit", {"contactId": cid}))["ok"] is True
            assert data(q("crmHome.person", {"contactId": cid}))["notFit"] is True
            assert m("crmHome.watch", {}).status_code == 400
        finally:
            data(m("outreach.remove", {"slug": slug}))
            open("/tmp/e1test_crm_slug.txt", "a").write(slug + "\n")
