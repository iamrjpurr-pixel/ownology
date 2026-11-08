# Curriculum: free Level 1 unlock (email -> cookie) and server-side tier gating
import json
import os
import time
import urllib.parse

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
L1_COOKIE = "ow_curriculum_l1"
GUEST_COOKIE = "ow_curriculum_guest"
TEST_EMAIL = f"test_l1_{int(time.time())}@example.com"
CREATED_EMAILS_FILE = "/tmp/curriculum_l1_test_emails.txt"


def q(proc, inp=None, cookies=None):
    url = f"{BASE_URL}/api/trpc/{proc}"
    if inp is not None:
        url += "?input=" + urllib.parse.quote(json.dumps({"json": inp}))
    return requests.get(url, cookies=cookies or {}, timeout=30)


def m(proc, inp, cookies=None):
    return requests.post(f"{BASE_URL}/api/trpc/{proc}", json={"json": inp}, cookies=cookies or {}, timeout=30)


def data(r):
    return r.json()["result"]["data"]["json"]


@pytest.fixture(scope="module")
def lessons():
    r = q("curriculum.list")
    assert r.status_code == 200
    return data(r)["lessons"]


@pytest.fixture(scope="module")
def unlock_token():
    r = m("curriculum.unlockLevel1", {"email": TEST_EMAIL, "name": "TEST_L1", "role": "team"})
    assert r.status_code == 200, r.text
    with open(CREATED_EMAILS_FILE, "a") as f:
        f.write(TEST_EMAIL + "\n")
    assert data(r) == {"ok": True}
    cookies = [v for k, v in r.raw.headers.items() if k.lower() == "set-cookie"]
    sc = next((c for c in r.raw.headers.getlist("set-cookie") if c.startswith(L1_COOKIE)), "")
    assert sc, cookies
    low = sc.lower()
    # preview ingress rewrites SameSite=Lax -> None; just require HttpOnly + Secure + ~1y lifetime
    assert "httponly" in low and "secure" in low
    assert "max-age=315" in low
    tok = r.cookies.get(L1_COOKIE)
    assert tok and "." in tok
    return tok


# --- Anonymous visitor ---
class TestAnonymous:
    def test_list_free(self, lessons):
        d = data(q("curriculum.list"))
        assert d["tier"] == "free"
        assert d["level1Unlocked"] is False
        assert len(lessons) == 30
        assert len([l for l in lessons if l["level"] == 1]) >= 1

    def test_l1_lesson_redacted(self, lessons):
        slug = next(l["slug"] for l in lessons if l["level"] == 1)
        d = data(q("curriculum.bySlug", {"slug": slug}))
        assert d["tier"] == "free"
        assert d["level1Unlocked"] is False
        les = d["lesson"]
        assert les["flashcards"] is None and les["mcqs"] is None
        assert all(s["body_md"] == "" for s in (les["sections"] or []))
        assert les["cited_in"] == []


# --- Validation ---
class TestValidation:
    @pytest.mark.parametrize("payload", [
        {"email": "not-an-email"},
        {"email": ""},
        {"email": "a@b.co", "role": "hacker"},
        {"email": "a" * 200 + "@example.com"},
    ])
    def test_bad_input_rejected(self, payload):
        r = m("curriculum.unlockLevel1", payload)
        assert r.status_code == 400, r.text
        assert L1_COOKIE not in r.headers.get("set-cookie", "")


# --- Unlocked visitor ---
class TestUnlocked:
    def test_list_reports_unlocked(self, unlock_token):
        d = data(q("curriculum.list", cookies={L1_COOKIE: unlock_token}))
        assert d["level1Unlocked"] is True
        assert d["tier"] == "free"  # real tier stays free

    def test_all_l1_lessons_full(self, unlock_token, lessons):
        for l in [x for x in lessons if x["level"] == 1]:
            d = data(q("curriculum.bySlug", {"slug": l["slug"]}, cookies={L1_COOKIE: unlock_token}))
            assert d["tier"] == "cellar_hand", l["slug"]
            les = d["lesson"]
            if les["version"] == "v2":
                assert any(s["body_md"] for s in les["sections"]), l["slug"]
            else:
                assert les["body_md"], l["slug"]

    def test_l2_plus_still_locked(self, unlock_token, lessons):
        for l in [x for x in lessons if x["level"] >= 2][:5]:
            d = data(q("curriculum.bySlug", {"slug": l["slug"]}, cookies={L1_COOKIE: unlock_token}))
            assert d["tier"] == "free", l["slug"]
            assert d["lesson"]["flashcards"] is None
            assert all(s["body_md"] == "" for s in (d["lesson"]["sections"] or []))

    def test_l1_token_in_guest_cookie_does_not_escalate(self, unlock_token, lessons):
        slug = next(l["slug"] for l in lessons if l["level"] == 3)
        d = data(q("curriculum.bySlug", {"slug": slug}, cookies={GUEST_COOKIE: unlock_token}))
        assert d["tier"] == "free"

    def test_tampered_token_rejected(self, unlock_token, lessons):
        body, sig = unlock_token.split(".")
        bad = body + "." + ("A" if sig[0] != "A" else "B") + sig[1:]
        slug = next(l["slug"] for l in lessons if l["level"] == 1)
        d = data(q("curriculum.bySlug", {"slug": slug}, cookies={L1_COOKIE: bad}))
        assert d["tier"] == "free"
        assert d["level1Unlocked"] is False

    def test_repeat_unlock_same_email_ok(self, unlock_token):
        # same email again must not error (addLead dedupes on email+source)
        r = m("curriculum.unlockLevel1", {"email": TEST_EMAIL.upper(), "role": "owner"})
        assert r.status_code == 200, r.text
        assert data(r)["ok"] is True
