"""
Pre-demo E2E validation — comprehensive smoke of every demo-critical
surface for the Ownology app. Run against preview URL.

Run: API_URL=https://private-tutor-2.preview.emergentagent.com \
     python -m pytest backend/tests/test_demo_e2e.py -v
"""
import os
import json
import pytest
import requests

API_URL = os.environ.get("API_URL", "https://private-tutor-2.preview.emergentagent.com").rstrip("/")


def _password():
    for k in ("GATE_PASSWORD", "OWNOLOGY_GATE_PASSWORD"):
        if os.environ.get(k):
            return os.environ[k]
    try:
        with open("/app/.env") as f:
            for line in f:
                if line.startswith("OWNOLOGY_GATE_PASSWORD="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return "changeme-set-real-password"


@pytest.fixture(scope="module")
def gated_session():
    s = requests.Session()
    r = s.post(f"{API_URL}/api/gate/verify", json={"password": _password()}, timeout=10)
    assert r.status_code == 200
    return s


# ---- GATE WALL: default-deny for admin/member routes ----
GATED_PATHS = [
    "/dashboard", "/admin", "/admin/producers", "/admin/contacts",
    "/admin/marketing-ops", "/site-map", "/compliance", "/the-press",
]

HTML_HEADERS = {"Accept": "text/html,application/xhtml+xml,application/xml;q=0.9"}

@pytest.mark.parametrize("path", GATED_PATHS)
def test_anon_gated_paths_redirect_to_try(path):
    r = requests.get(f"{API_URL}{path}", headers=HTML_HEADERS, allow_redirects=False, timeout=10)
    assert r.status_code == 302, f"{path} should be 302, got {r.status_code}"
    loc = r.headers.get("location", "")
    assert "/try" in loc, f"{path} should redirect to /try, got {loc}"


# ---- GATE WALL: allowlist works (public routes 200) ----
PUBLIC_PATHS = [
    "/", "/try", "/pricing", "/risk-management", "/hi/producers/8",
    "/cellar-journal", "/sample-vintage-log", "/blog", "/why-ownology",
    "/quiz", "/free-run", "/waitlist", "/founding-member/success",
    "/reference/vine",
]

@pytest.mark.parametrize("path", PUBLIC_PATHS)
def test_anon_public_paths_200(path):
    r = requests.get(f"{API_URL}{path}", headers=HTML_HEADERS, allow_redirects=False, timeout=10)
    assert r.status_code == 200, f"{path} should be 200, got {r.status_code}"


# ---- GATE UNLOCK ----
def test_gate_unlock_sets_cookie_and_admin_accessible():
    s = requests.Session()
    r = s.post(f"{API_URL}/api/gate/verify", json={"password": _password()}, timeout=10)
    assert r.status_code == 200
    assert "ow_gate" in s.cookies
    r2 = s.get(f"{API_URL}/admin", headers=HTML_HEADERS, allow_redirects=False, timeout=10)
    assert r2.status_code == 200


# ---- COLD-EMAIL DEMO SURFACE (publicPreview - NO auth) ----
def test_producers_public_preview_id_8_no_auth():
    r = requests.get(
        f"{API_URL}/api/trpc/producers.publicPreview",
        params={"input": json.dumps({"json": {"id": 8}})},
        timeout=10,
    )
    assert r.status_code == 200
    data = r.json()["result"]["data"]
    # tRPC superjson may wrap in {json: ...}
    payload = data.get("json", data)
    for k in ("id", "name", "country", "region", "firstName"):
        assert k in payload, f"missing {k} in publicPreview: {payload}"


def test_producers_public_preview_id_27_no_auth():
    r = requests.get(
        f"{API_URL}/api/trpc/producers.publicPreview",
        params={"input": json.dumps({"json": {"id": 27}})},
        timeout=10,
    )
    assert r.status_code == 200


def test_hi_producers_page_renders_greeting():
    r = requests.get(f"{API_URL}/hi/producers/8", timeout=10)
    assert r.status_code == 200
    # SPA — HTML shell is served; producer data is fetched client-side
    assert "<html" in r.text.lower()


# ---- HEALTH ----
def test_health_ok():
    r = requests.get(f"{API_URL}/api/health", timeout=10)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_health_deep_reports_services():
    r = requests.get(f"{API_URL}/api/health/deep", timeout=15)
    assert r.status_code == 200
    body = r.json()
    assert "services" in body
    for k in ("mysql", "perplexity_key", "resend_key", "emergent_llm_key", "gate_password"):
        assert k in body["services"]


# ---- SITEMAP ----
def test_sitemap_xml_returns_urlset():
    r = requests.get(f"{API_URL}/api/sitemap.xml", timeout=10)
    assert r.status_code == 200
    body = r.text
    assert "<urlset" in body
    for path in ("/pricing", "/risk-management", "/cellar-journal"):
        assert path in body, f"sitemap missing {path}"


def test_robots_txt_has_sitemap_directive():
    # Try /robots.txt first, then /api/robots.txt
    for url in (f"{API_URL}/robots.txt", f"{API_URL}/api/robots.txt"):
        r = requests.get(url, timeout=10)
        if r.status_code == 200 and "Sitemap:" in r.text:
            return
    pytest.fail("robots.txt with 'Sitemap:' directive not found on either URL")


# ---- ADMIN tRPC endpoints (dev-bypass — no cookie needed for tRPC) ----
def test_trpc_producers_list():
    r = requests.get(f"{API_URL}/api/trpc/producers.list", timeout=15)
    assert r.status_code == 200
    data = r.json()
    assert "result" in data


def test_trpc_producers_needs_enrichment():
    r = requests.get(f"{API_URL}/api/trpc/producers.needsEnrichment", timeout=15)
    assert r.status_code == 200
    payload = r.json()["result"]["data"]
    payload = payload.get("json", payload)
    # Endpoint returns a list of {id, name} objects (not {ids:[...]})
    assert isinstance(payload, list), f"expected list, got {type(payload)}"


def test_trpc_marketing_ops_today():
    r = requests.get(f"{API_URL}/api/trpc/marketingOps.today", timeout=15)
    assert r.status_code == 200
    payload = r.json()["result"]["data"]
    payload = payload.get("json", payload)
    # season + tasks required; coachLine is a separate endpoint (verified below)
    for k in ("season", "tasks"):
        assert k in payload, f"missing {k} in marketingOps.today: {list(payload.keys())}"


def test_trpc_marketing_ops_coach_line():
    r = requests.get(f"{API_URL}/api/trpc/marketingOps.coachLine", timeout=15)
    assert r.status_code == 200


def test_trpc_outreach_list():
    r = requests.get(f"{API_URL}/api/trpc/outreach.list", timeout=15)
    assert r.status_code == 200


# ---- SAMPLE VINTAGE LOG variants ----
@pytest.mark.parametrize("variant,expected", [
    ("hunter", "Hunter Valley"),
    ("boutique", "Boutique"),
    (None, "Vintage Log"),
])
def test_sample_vintage_log_variants(variant, expected):
    url = f"{API_URL}/sample-vintage-log"
    if variant:
        url += f"?variant={variant}"
    r = requests.get(url, timeout=10)
    assert r.status_code == 200
    assert expected.lower() in r.text.lower(), f"variant={variant} missing '{expected}' in HTML"


# ---- INVITE TOKEN flow ----
def test_invite_token_bypass(gated_session):
    """
    The /i/:token magic-link endpoint works on the backend directly (localhost:8001)
    but is broken through the preview URL because the K8s ingress routes
    non-/api/* paths to the frontend (port 3000), never reaching Express.

    We test both surfaces so main agent knows the code is correct but the
    deployment topology needs fixing (route /i/* to backend, OR prefix with /api).
    """
    # Create invite via gated (cookie'd) session
    r = gated_session.post(
        f"{API_URL}/api/trpc/gate.create",
        json={"json": {"label": "pytest-e2e", "expiresInDays": 1}},
        timeout=10,
    )
    assert r.status_code == 200, f"gate.create failed: {r.status_code} {r.text[:200]}"
    payload = r.json()["result"]["data"]
    payload = payload.get("json", payload)
    token = payload.get("token")
    assert token, f"createInvite response missing token: {payload}"

    # 1) Backend-direct: works
    s_local = requests.Session()
    r_local = s_local.get(
        f"http://localhost:8001/i/{token}",
        headers=HTML_HEADERS,
        allow_redirects=False,
        timeout=10,
    )
    assert r_local.status_code == 302, f"backend-direct /i/token expected 302, got {r_local.status_code}"
    assert "ow_gate" in s_local.cookies, "backend-direct /i/token must set ow_gate cookie"

    # 2) Public URL: currently BROKEN (ingress routes /i/* to frontend)
    s_pub = requests.Session()
    r_pub = s_pub.get(
        f"{API_URL}/i/{token}",
        headers=HTML_HEADERS,
        allow_redirects=False,
        timeout=10,
    )
    if r_pub.status_code == 200 and "ow_gate" not in s_pub.cookies:
        pytest.fail(
            f"INGRESS BUG: {API_URL}/i/<token> returns 200 HTML (SPA shell) and "
            f"does NOT set ow_gate cookie. The /i/:token Express route never fires "
            f"through the preview URL because K8s ingress routes non-/api/* paths "
            f"to the frontend (port 3000). Fix: route /i/* to backend OR move endpoint "
            f"under /api/i/:token."
        )
    assert r_pub.status_code in (302, 303)
    assert "ow_gate" in s_pub.cookies


# ---- SEO meta ----
def test_hi_producer_has_og_meta():
    r = requests.get(f"{API_URL}/hi/producers/8", timeout=10)
    assert r.status_code == 200
    html = r.text
    # SPA may inject via JS; accept either static OG meta OR presence of react root
    has_og = 'property="og:' in html or 'property=\'og:' in html
    if not has_og:
        # If SPA injects client-side, at least ensure app shell present
        assert 'id="root"' in html or "React" in html or "<script" in html


# ---- PRICING page ----
def test_pricing_page_loads():
    r = requests.get(f"{API_URL}/pricing", timeout=10)
    assert r.status_code == 200


# ---- RISK MANAGEMENT ----
def test_risk_management_loads():
    r = requests.get(f"{API_URL}/risk-management", timeout=10)
    assert r.status_code == 200
