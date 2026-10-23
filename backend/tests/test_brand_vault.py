# Brand Vault (brandPortal tRPC router) + demo Ask Owen gate regression tests.
# Requires env OWNER_JWT / CONTRACTOR_JWT / OUTSIDER_JWT / OWNER_WINERY (from scripts/e1-test-users.ts seed).
import json
import os
import urllib.parse

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
OWNER = os.environ.get("OWNER_JWT")
CONTRACTOR = os.environ.get("CONTRACTOR_JWT")
OUTSIDER = os.environ.get("OUTSIDER_JWT")
WINERY = int(os.environ.get("OWNER_WINERY", "0"))
CONTRACTOR_EMAIL = "e1test-contractor@example.com"


def _s(jwt=None):
    s = requests.Session()
    if jwt:
        s.cookies.set("app_session_id", jwt)
    return s


def q(sess, proc, inp=None):
    params = {"input": json.dumps({"json": inp})}
    r = sess.get(f"{BASE_URL}/api/trpc/{proc}?" + urllib.parse.urlencode(params), timeout=60)
    return r


def m(sess, proc, inp):
    return sess.post(f"{BASE_URL}/api/trpc/{proc}", json={"json": inp}, timeout=90)


def data(r):
    return r.json()["result"]["data"]["json"]


def err(r):
    return r.json()["error"]["json"]


@pytest.fixture(scope="module")
def owner():
    if not OWNER:
        pytest.skip("no OWNER_JWT")
    return _s(OWNER)


@pytest.fixture(scope="module")
def contractor():
    return _s(CONTRACTOR)


@pytest.fixture(scope="module")
def outsider():
    return _s(OUTSIDER)


def _member_id(owner, email=CONTRACTOR_EMAIL):
    ms = data(q(owner, "brandPortal.members", {"wineryId": WINERY}))
    for x in ms:
        if x["email"].lower() == email:
            return x
    return None


# --- auth ---
def test_unauthenticated_myBrands_rejected():
    r = q(_s(), "brandPortal.myBrands")
    assert r.status_code == 401


# --- owner CRUD ---
class TestOwnerWines:
    wine_id = None

    def test_my_brands_owner(self, owner):
        d = data(q(owner, "brandPortal.myBrands"))
        assert d["email"] == "e1test-owner@example.com"
        assert any(b["wineryId"] == WINERY and b["role"] == "owner" for b in d["brands"])

    def test_save_and_get_wine(self, owner):
        wine = {"name": "TEST_Pytest Grenache", "vintage": 2024, "style": "Dry red",
                "blend": [{"variety": "Grenache", "pct": 85, "source": "Block A"}, {"variety": "Mataro", "pct": 15, "source": ""}],
                "targets": {"ph": "3.55", "alcohol": "14.0"}, "regime": {"yeast": "RC212"},
                "protocol": "Cold soak 3 days", "tastingNotes": "Raspberry, spice"}
        r = m(owner, "brandPortal.saveWine", {"wineryId": WINERY, "wine": wine})
        assert r.status_code == 200, r.text
        TestOwnerWines.wine_id = data(r)["id"]
        g = data(q(owner, "brandPortal.getWine", {"wineryId": WINERY, "wineId": TestOwnerWines.wine_id}))
        assert g["role"] == "owner"
        assert g["wine"]["name"] == "TEST_Pytest Grenache"
        assert g["wine"]["blend"][0]["pct"] == 85
        assert g["wine"]["targets"]["ph"] == "3.55"
        assert g["wine"]["regime"]["yeast"] == "RC212"

    def test_edit_wine(self, owner):
        wid = TestOwnerWines.wine_id
        wine = {"name": "TEST_Pytest Grenache v2", "vintage": 2024, "style": "Dry red", "blend": [], "targets": {}, "regime": {}, "protocol": "", "tastingNotes": ""}
        r = m(owner, "brandPortal.saveWine", {"wineryId": WINERY, "wineId": wid, "wine": wine})
        assert r.status_code == 200
        g = data(q(owner, "brandPortal.getWine", {"wineryId": WINERY, "wineId": wid}))
        assert g["wine"]["name"] == "TEST_Pytest Grenache v2"

    def test_invalid_vintage_rejected(self, owner):
        wine = {"name": "X", "vintage": 1800, "blend": []}
        r = m(owner, "brandPortal.saveWine", {"wineryId": WINERY, "wine": wine})
        assert r.status_code == 400

    def test_addlog_requires_content(self, owner):
        r = m(owner, "brandPortal.addLog", {"wineryId": WINERY, "wineId": TestOwnerWines.wine_id, "kind": "note", "note": "", "readings": {}})
        assert r.status_code == 400
        assert "Add a note" in err(r)["message"]

    def test_export_contains_wine(self, owner):
        d = data(m(owner, "brandPortal.exportVault", {"wineryId": WINERY}))
        assert d["brand"] == "E1 Test Brand Co"
        assert any(w["id"] == TestOwnerWines.wine_id for w in d["wines"])

    def test_archive_wine_hides_it(self, owner):
        wid = TestOwnerWines.wine_id
        r = m(owner, "brandPortal.archiveWine", {"wineryId": WINERY, "wineId": wid})
        assert r.status_code == 200
        lst = data(q(owner, "brandPortal.listWines", {"wineryId": WINERY}))
        assert all(w["id"] != wid for w in lst["wines"])
        g = q(owner, "brandPortal.getWine", {"wineryId": WINERY, "wineId": wid})
        assert g.status_code == 404


# --- outsider / contractor permissions, invite / revoke lifecycle ---
class TestAccessLifecycle:
    def test_outsider_forbidden(self, outsider):
        r = q(outsider, "brandPortal.listWines", {"wineryId": WINERY})
        assert r.status_code == 403
        assert err(r)["message"] == "You don't have access to this brand."
        r = m(outsider, "brandPortal.exportVault", {"wineryId": WINERY})
        assert r.status_code == 403

    def test_invite_contractor_case_insensitive(self, owner, contractor):
        mem = _member_id(owner)
        if mem and mem["status"] != "revoked":
            m(owner, "brandPortal.revoke", {"wineryId": WINERY, "memberId": mem["id"]})
        r = m(owner, "brandPortal.invite", {"wineryId": WINERY, "email": "E1Test-Contractor@Example.COM"})
        assert r.status_code == 200, r.text
        d = data(q(contractor, "brandPortal.myBrands"))
        assert any(b["wineryId"] == WINERY and b["role"] == "contractor" for b in d["brands"])
        # duplicate invite -> CONFLICT
        r2 = m(owner, "brandPortal.invite", {"wineryId": WINERY, "email": CONTRACTOR_EMAIL})
        assert r2.status_code == 409

    def test_self_invite_rejected(self, owner):
        r = m(owner, "brandPortal.invite", {"wineryId": WINERY, "email": "e1test-owner@example.com"})
        assert r.status_code == 400

    def test_contractor_view_and_log(self, contractor, owner):
        lst = data(q(contractor, "brandPortal.listWines", {"wineryId": WINERY}))
        assert lst["role"] == "contractor"
        assert len(lst["wines"]) >= 1
        wid = lst["wines"][0]["id"]
        g = data(q(contractor, "brandPortal.getWine", {"wineryId": WINERY, "wineId": wid}))
        assert g["role"] == "contractor"
        r = m(contractor, "brandPortal.addLog", {"wineryId": WINERY, "wineId": wid, "kind": "reading", "note": "TEST_pytest reading", "readings": {"brix": "12.5"}})
        assert r.status_code == 200
        g = data(q(contractor, "brandPortal.getWine", {"wineryId": WINERY, "wineId": wid}))
        assert g["logs"][0]["authorRole"] == "contractor"
        assert g["logs"][0]["readings"]["brix"] == "12.5"
        acts = data(q(owner, "brandPortal.activity", {"wineryId": WINERY}))
        mine = [a for a in acts if a["actorEmail"] == CONTRACTOR_EMAIL]
        assert any(a["action"] == "viewed" for a in mine)
        assert any(a["action"] == "logged reading" for a in mine)

    def test_contractor_owner_only_forbidden(self, contractor, owner):
        wine = {"name": "Hack", "vintage": None, "blend": []}
        for proc, inp in [("brandPortal.saveWine", {"wineryId": WINERY, "wine": wine}),
                          ("brandPortal.exportVault", {"wineryId": WINERY}),
                          ("brandPortal.invite", {"wineryId": WINERY, "email": "e1test-x@example.com"}),
                          ("brandPortal.archiveWine", {"wineryId": WINERY, "wineId": 1})]:
            r = m(contractor, proc, inp)
            assert r.status_code == 403, proc
            assert err(r)["message"] == "Only the brand owner can do this."
        for proc in ["brandPortal.members", "brandPortal.activity"]:
            r = q(contractor, proc, {"wineryId": WINERY})
            assert r.status_code == 403
        acts = data(q(owner, "brandPortal.activity", {"wineryId": WINERY}))
        assert any(a["action"] == "blocked" and a["actorEmail"] == CONTRACTOR_EMAIL for a in acts)

    def test_revoke_removes_access_immediately(self, owner, contractor):
        mem = _member_id(owner)
        assert mem["status"] == "active"
        r = m(owner, "brandPortal.revoke", {"wineryId": WINERY, "memberId": mem["id"]})
        assert r.status_code == 200
        assert _member_id(owner)["status"] == "revoked"
        r = q(contractor, "brandPortal.listWines", {"wineryId": WINERY})
        assert r.status_code == 403
        d = data(q(contractor, "brandPortal.myBrands"))
        assert all(b["wineryId"] != WINERY for b in d["brands"])
        # contractor still owns their own winery
        assert any(b["role"] == "owner" for b in d["brands"])


# --- demo Ask Owen gate (no LLM calls here) ---
def test_ask_owen_without_start_rejected():
    r = m(_s(), "demo.askOwen", {"email": "e1-test-never-started-zz@example.com", "question": "How much SO2?"})
    assert r.status_code == 400
    assert err(r)["message"] == "Enter your email to start the demo."


def test_ask_owen_invalid_email():
    r = m(_s(), "demo.askOwenStart", {"email": "not-an-email"})
    assert r.status_code == 400
