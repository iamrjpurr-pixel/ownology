# Site-wide tracking (events.batch / people / person) + Ask Owen orientation answer tests.
# Env: REACT_APP_BACKEND_URL, ADMIN_JWT (scripts/e1-admin-jwt.ts), OUTSIDER_JWT (scripts/e1-test-users.ts seed).
# Uses only e1test-* data. Clean with: npx tsx scripts/e1-admin-jwt.ts clean
import json
import os
import time
import urllib.parse
import uuid

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
ADMIN = os.environ.get("ADMIN_JWT")
OUTSIDER = os.environ.get("OUTSIDER_JWT")
SLUG = "e1test-track"
SID = "e1test-" + uuid.uuid4().hex[:16]


def _s(jwt=None):
    s = requests.Session()
    if jwt:
        s.cookies.set("app_session_id", jwt)
    return s


def q(sess, proc, inp=None):
    params = {"input": json.dumps({"json": inp})}
    return sess.get(f"{BASE_URL}/api/trpc/{proc}?" + urllib.parse.urlencode(params), timeout=60)


def m(sess, proc, inp):
    return sess.post(f"{BASE_URL}/api/trpc/{proc}", json={"json": inp}, timeout=90)


def data(r):
    return r.json()["result"]["data"]["json"]


def ev(event, path, detail="", at=None):
    return {"event": event, "path": path, "detail": detail, "at": at or int(time.time() * 1000)}


@pytest.fixture(scope="module")
def admin():
    if not ADMIN:
        pytest.skip("no ADMIN_JWT")
    return _s(ADMIN)


# --- events.batch ---
class TestBatch:
    def test_batch_with_invite_ok(self):
        now = int(time.time() * 1000)
        events = [
            ev("page_view", "/demo/tour", "?for=e1test-track", now - 3000),
            ev("section_view", "/demo/tour", "tank-brief", now - 2000),
            ev("click", "/demo/tour", "demo-guide-start", now - 1000),
            ev("guide_step", "/demo/tour", "1", now),
        ]
        r = m(_s(), "events.batch", {"sessionId": SID, "invite": SLUG, "events": events})
        assert r.status_code == 200, r.text
        assert data(r)["ok"] is True

    def test_batch_unknown_invite_still_ok(self):
        r = m(_s(), "events.batch", {"sessionId": SID + "x", "invite": "e1test-nope-zzz", "events": [ev("page_view", "/e1test-path")]})
        assert r.status_code == 200
        assert data(r)["ok"] is True

    def test_batch_rejects_over_50(self):
        r = m(_s(), "events.batch", {"sessionId": SID, "events": [ev("click", "/e1test", "x")] * 51})
        assert r.status_code == 400

    def test_batch_rejects_invalid_event_type(self):
        r = m(_s(), "events.batch", {"sessionId": SID, "events": [ev("keystroke", "/e1test", "x")]})
        assert r.status_code == 400

    def test_batch_rejects_empty_and_short_session(self):
        assert m(_s(), "events.batch", {"sessionId": SID, "events": []}).status_code == 400
        assert m(_s(), "events.batch", {"sessionId": "short", "events": [ev("click", "/e1test")]}).status_code == 400


# --- events.people / events.person auth ---
class TestAuth:
    def test_people_anon_rejected(self):
        assert q(_s(), "events.people").status_code in (401, 403)

    def test_person_anon_rejected(self):
        assert q(_s(), "events.person", {"slug": SLUG}).status_code in (401, 403)

    def test_people_non_admin_rejected(self):
        if not OUTSIDER:
            pytest.skip("no OUTSIDER_JWT")
        assert q(_s(OUTSIDER), "events.people").status_code in (401, 403)
        assert q(_s(OUTSIDER), "events.person", {"slug": SLUG}).status_code in (401, 403)


# --- admin read side ---
class TestAdminRead:
    def test_people_lists_invite(self, admin):
        r = q(admin, "events.people")
        assert r.status_code == 200, r.text
        d = data(r)
        assert {"invited", "members", "anonymous"} <= set(d)
        row = next((p for p in d["invited"] if p["slug"] == SLUG), None)
        assert row is not None
        assert row["winery"] == "E1 Track Wines"
        assert row["events"] >= 4
        assert isinstance(d["anonymous"]["sessions"], int)

    def test_person_timeline(self, admin):
        r = q(admin, "events.person", {"slug": SLUG})
        assert r.status_code == 200, r.text
        d = data(r)
        assert d["label"] == "Testy · E1 Track Wines"
        assert d["vault"] is None
        mine = [e for e in d["events"] if e["sessionId"] == SID]
        assert [e["event"] for e in mine] == ["guide_step", "click", "section_view", "page_view"]  # DESC order
        assert mine[1]["detail"] == "demo-guide-start"

    def test_unknown_invite_not_attributed(self, admin):
        d = data(q(admin, "events.person", {"slug": "e1test-nope-zzz"}))
        assert d["events"] == []


# --- Ask Owen orientation (no LLM) ---
class TestOrientation:
    @pytest.mark.parametrize("question", ["im new to the site; where should i start?", "How does this work?", "what is ownology"])
    def test_orientation_returns_welcome(self, question):
        r = m(_s(), "tutor.ask", {"question": question, "mode": "home_winemaker"})
        assert r.status_code == 200, r.text
        d = data(r)
        assert d.get("welcome") is True
        for link in ("/demo/tour", "/curriculum/about", "/cellar-journal", "/guide"):
            assert f"]({link})" in d["answer"]
        assert d["answer"].count("\n- ") == 3

    def test_wine_question_not_welcome(self):
        # single LLM call
        r = m(_s(), "tutor.ask", {"question": "I'm new to winemaking, how do I check my pH?", "mode": "home_winemaker"})
        assert r.status_code in (200, 429), r.text
        if r.status_code == 200:
            d = data(r)
            assert not d.get("welcome")
            assert "Welcome to Ownology" not in d["answer"]
            assert len(d["answer"]) > 50
