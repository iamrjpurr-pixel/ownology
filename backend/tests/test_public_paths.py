# Public-page allowlist (server/publicPaths.ts) regression: dev/preview wall + gate cookie + JWT cookie.
# Env: REACT_APP_BACKEND_URL, OWNER_JWT (source /root/e1env.sh)
import os
import pytest
import requests

BASE = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
OWNER = os.environ.get("OWNER_JWT")
HTML = {"Accept": "text/html,application/xhtml+xml"}

PUBLIC = ["/", "/know", "/demo/tour", "/pricing", "/curriculum/about", "/curriculum/some-lesson-slug",
          "/blog", "/try", "/ask", "/login", "/hi/e1test-anything", "/privacy", "/merch",
          "/cookies", "/unlock", "/curriculum/one-page", "/free-run/journal", "/onboarding"]
GATED = ["/brand", "/dashboard", "/branding-mockup", "/cellar-brief", "/import",
         "/todo", "/curriculumx", "/hi"]
ADMIN = ["/admin", "/admin/contacts", "/admin/activity"]


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


# Admin pages anon -> /login?next= (same as prod Express wall)
@pytest.mark.parametrize("path", ADMIN)
def test_admin_anon_302_login(path):
    r = get(path)
    assert r.status_code == 302, f"{path} -> {r.status_code}"
    assert r.headers["location"] == "/login?next=" + requests.utils.quote(path, safe=""), r.headers["location"]


# Preview (Vite wall) vs prod (Express :8001) parity for every listed public/gated path
@pytest.mark.parametrize("path", PUBLIC + GATED + ADMIN)
def test_parity_with_express(path):
    if path == "/unlock":
        pytest.xfail("/unlock is an Express route handler (guest-pass redeem); Vite preview serves SPA instead - wall parity OK")
    try:
        e = requests.get("http://localhost:8001" + path, headers=HTML, allow_redirects=False, timeout=10)
    except Exception:
        pytest.skip("express :8001 not reachable")
    v = get(path)
    ev = (e.status_code if e.status_code in (301, 302) else 200, e.headers.get("location"))
    vv = (v.status_code if v.status_code in (301, 302) else 200, v.headers.get("location"))
    assert ev == vv, f"{path}: express={ev} preview={vv}"


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
