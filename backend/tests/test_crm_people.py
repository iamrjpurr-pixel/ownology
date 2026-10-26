# CRM "one person, one card" — crm.people tRPC query (read-only) + auth gating
import os
import re
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "").rstrip("/")
ADMIN_JWT_FILE = "/root/admin.jwt"
OWNER_JWT_FILE = "/tmp/owner.jwt"  # e1test-owner (non-admin), seeded via scripts/e1-test-users.ts

TEST_EMAIL_RE = re.compile(r"[@.]example(\.|$)|@test\.|^(e1-?test|pytest|cs-|test-)|-test@|e1test")
KINDS = {"contact", "lead", "quiz", "demo", "survey", "reservation", "member", "access", "referral", "account"}


def _read(p):
    try:
        return open(p).read().strip()
    except FileNotFoundError:
        return None


def _get(jwt=None):
    cookies = {"app_session_id": jwt} if jwt else {}
    return requests.get(f"{BASE_URL}/api/trpc/crm.people", cookies=cookies, timeout=60)


def _data(r):
    body = r.json()
    if isinstance(body, list):
        body = body[0]
    d = body["result"]["data"]
    return d.get("json", d) if isinstance(d, dict) else d


@pytest.fixture(scope="module")
def people():
    jwt = _read(ADMIN_JWT_FILE)
    if not jwt:
        pytest.skip("no admin jwt")
    r = _get(jwt)
    assert r.status_code == 200, r.text[:300]
    return _data(r)


class TestCrmPeopleAuth:
    def test_anonymous_rejected(self):
        r = _get()
        assert r.status_code in (401, 403), r.status_code

    def test_non_admin_rejected(self):
        jwt = _read(OWNER_JWT_FILE)
        if not jwt:
            pytest.skip("no e1test owner jwt")
        r = _get(jwt)
        assert r.status_code in (401, 403), r.status_code


class TestCrmPeopleData:
    def test_count_reasonable(self, people):
        assert isinstance(people, list)
        print("people count:", len(people))
        assert 200 <= len(people) <= 400

    def test_shape(self, people):
        for p in people:
            for k in ("key", "email", "name", "winery", "slug", "userId", "kinds", "reservation", "lastAt", "records"):
                assert k in p, (k, p.get("key"))
            assert isinstance(p["kinds"], list) and p["kinds"]
            assert set(p["kinds"]) <= KINDS
            assert isinstance(p["records"], list) and p["records"]
            assert p["name"]

    def test_sorted_by_last_at_desc(self, people):
        ats = [p["lastAt"] for p in people]
        assert ats == sorted(ats, reverse=True)

    def test_records_sorted_and_lastat_matches(self, people):
        for p in people:
            rs = [r["at"] for r in p["records"]]
            assert rs == sorted(rs, reverse=True)
            assert p["lastAt"] == max(rs)

    def test_no_test_emails(self, people):
        bad = [p["email"] for p in people if p["email"] and TEST_EMAIL_RE.search(p["email"])]
        assert not bad, bad[:10]

    def test_unique_keys_and_emails_lowercase(self, people):
        keys = [p["key"] for p in people]
        assert len(keys) == len(set(keys))
        for p in people:
            if p["email"]:
                assert p["email"] == p["email"].lower().strip()
                assert p["key"] == p["email"]
            else:
                assert p["key"].startswith("slug:")

    def test_kinds_consistency(self, people):
        for p in people:
            if p["userId"] is not None:
                assert "account" in p["kinds"]
            if p["slug"]:
                assert "contact" in p["kinds"]
            if "survey" in p["kinds"]:
                assert p["slug"]

    def test_zero_reservations(self, people):
        res = [p for p in people if p["reservation"] or "reservation" in p["kinds"]]
        print("reservations:", len(res))
        assert len(res) == 0

    def test_kind_distribution(self, people):
        dist = {}
        for p in people:
            for k in p["kinds"]:
                dist[k] = dist.get(k, 0) + 1
        print("kind distribution:", json.dumps(dist))
        assert dist.get("contact", 0) > 0
