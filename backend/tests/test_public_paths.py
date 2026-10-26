# Public-page allowlist (server/publicPaths.ts) regression: dev/preview wall + gate cookie + JWT cookie.
# Env: REACT_APP_BACKEND_URL, OWNER_JWT (source /root/e1env.sh)
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
OWNER = os.environ.get("OWNER_JWT")
HTML = {"Accept": "text/html,application/xhtml+xml"}

PUBLIC = ["/", "/know", "/demo/tour", "/pricing", "/curriculum/about", "/curriculum/some-lesson-slug",
          "/blog", "/try", "/ask", "/login", "/hi/e1test-anything", "/privacy", "/merch"]
GATED = ["/brand", "/dashboard", "/admin/contacts", "/admin/activity", "/branding-mockup", "/cellar-brief", "/import",
         "/admin", "/todo", "/curriculumx", "/hi"]


def get(path, cookies=None):
    return requests.get(BASE + path, headers=HTML, cookies=cookies or {}, allow_redirects=False, timeout=30)


@pytest.mark.parametrize("path", PUBLIC)
def test_public_anon_200(path):
    r = get(path)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.headers.get('location')}"
    assert "<html" in r.text.lower()


@pytest.mark.parametrize("path", GATED)
def test_gated_anon_302(path):
    r = get(path)
    assert r.status_code == 302, f"{path} -> {r.status_code}"
    assert r.headers["location"] == "/try?from=" + requests.utils.quote(path, safe="")


def test_gated_query_string_stripped():
    r = get("/brand?x=1")
    assert r.status_code == 302 and r.headers["location"] == "/try?from=%2Fbrand"


def test_assets_not_walled():
    r = requests.get(BASE + "/brand", headers={"Accept": "*/*"}, allow_redirects=False, timeout=30)
    assert r.status_code != 302


@pytest.fixture(scope="module")
def gate_cookies():
    r = requests.post(BASE + "/api/gate/verify", json={"password": "middx99"}, timeout=30)
    assert r.status_code == 200, r.text
    assert "ow_gate" in r.cookies
    return {"ow_gate": r.cookies["ow_gate"]}


def test_gate_wrong_password():
    r = requests.post(BASE + "/api/gate/verify", json={"password": "nope-e1test"}, timeout=30)
    assert r.status_code in (400, 401, 403, 429)
    assert "ow_gate" not in r.cookies


@pytest.mark.parametrize("path", ["/brand", "/dashboard", "/admin/contacts", "/import", "/cellar-brief"])
def test_gated_with_gate_cookie(gate_cookies, path):
    r = get(path, gate_cookies)
    assert r.status_code == 200, f"{path} -> {r.status_code} {r.headers.get('location')}"


@pytest.mark.parametrize("path", ["/brand", "/dashboard", "/admin/activity", "/branding-mockup"])
def test_gated_with_jwt_cookie(path):
    if not OWNER:
        pytest.skip("no OWNER_JWT")
    r = get(path, {"app_session_id": OWNER})
    assert r.status_code == 200, f"{path} -> {r.status_code}"
