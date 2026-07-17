"""Feb 2026 regression batch for Ownology.

Tests:
- Cellar Book PDF gate + token flow
- Auditor Preview Link (share tokens) CRUD via tRPC
- Terms/Refund/Privacy page HTML text checks (server-rendered index; UI text
  is loaded by SPA, but the pytest here just does raw HTTP; Playwright
  covers rendered-text asserts).
- Ask Owen citations shape
"""
import json
import os
import re
import urllib.parse

import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://private-tutor-2.preview.emergentagent.com").rstrip("/")
# Read from env, never commit. Prefer OWNOLOGY_GATE_PASSWORD (the canonical
# server-side var); fall back to GATE_PASSWORD for CI convenience. Skip the
# whole gated-flow module if unset so CI without the secret still exits
# cleanly rather than 401-ing every test.
GATE_PASSWORD = os.environ.get("OWNOLOGY_GATE_PASSWORD") or os.environ.get("GATE_PASSWORD")
if not GATE_PASSWORD:
    pytest.skip(
        "OWNOLOGY_GATE_PASSWORD not set — export in .env or CI to run gated tests.",
        allow_module_level=True,
    )


# ---------- fixtures ----------
@pytest.fixture(scope="session")
def gate_session():
    s = requests.Session()
    r = s.post(f"{BASE_URL}/api/gate/verify", json={"password": GATE_PASSWORD}, timeout=15)
    assert r.status_code == 200, f"Gate verify failed: {r.status_code} {r.text}"
    assert "ow_gate" in s.cookies.get_dict(), f"ow_gate cookie missing: {s.cookies.get_dict()}"
    return s


@pytest.fixture(scope="session")
def no_auth_session():
    return requests.Session()


def _trpc_input(payload):
    return urllib.parse.quote(json.dumps({"json": payload}))


# ---------- Cellar Book PDF ----------
class TestCellarBookPdf:
    def test_gate_cookie_200_pdf(self, gate_session):
        r = gate_session.get(f"{BASE_URL}/api/compliance/cellar-book.pdf?batchId=1", timeout=30)
        assert r.status_code == 200, f"expected 200, got {r.status_code}: {r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-", f"bad PDF header: {r.content[:10]!r}"

    def test_no_auth_401(self, no_auth_session):
        r = no_auth_session.get(f"{BASE_URL}/api/compliance/cellar-book.pdf?batchId=1", timeout=15, allow_redirects=False)
        assert r.status_code == 401, f"expected 401, got {r.status_code}: {r.text[:200]}"
        try:
            body = r.json()
            assert "error" in body or "message" in body
        except ValueError:
            pytest.fail(f"expected JSON body, got: {r.text[:200]}")

    def test_bad_batch_id_404(self, gate_session):
        r = gate_session.get(f"{BASE_URL}/api/compliance/cellar-book.pdf?batchId=99999", timeout=15)
        assert r.status_code == 404
        assert "not found" in r.text.lower()

    def test_missing_batch_id_400(self, gate_session):
        r = gate_session.get(f"{BASE_URL}/api/compliance/cellar-book.pdf", timeout=15)
        assert r.status_code == 400
        assert "missing" in r.text.lower() or "parameter" in r.text.lower()


# ---------- Auditor Preview Link ----------
_share_state = {}


class TestAuditorPreviewLink:
    def test_01_create_share_link(self, gate_session):
        body = {"json": {"batchId": 1, "ttlDays": 14}}
        r = gate_session.post(
            f"{BASE_URL}/api/trpc/cellarBoard.createShareLink",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=20,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        # tRPC SuperJSON shape: { result: { data: { json: {...} } } }
        result = data.get("result", {}).get("data", {})
        payload = result.get("json", result)
        url = payload.get("url") or payload.get("shareUrl")
        assert url and "token=" in url, f"no token in url: {payload}"
        expires = payload.get("expiresAt")
        assert expires, f"no expiresAt: {payload}"
        # NEW: id must now be returned as a positive int
        row_id = payload.get("id")
        assert isinstance(row_id, int) and row_id > 0, f"expected positive int id in response, got: {payload}"
        _share_state["url"] = url
        _share_state["token"] = re.search(r"token=([^&]+)", url).group(1)
        _share_state["id"] = row_id

    def test_02_fetch_url_no_cookies(self, no_auth_session):
        url = _share_state.get("url")
        assert url, "no share url from previous test"
        r = no_auth_session.get(url, timeout=30)
        assert r.status_code == 200, f"{r.status_code}: {r.text[:200]}"
        assert r.headers.get("content-type", "").startswith("application/pdf")
        assert r.content[:5] == b"%PDF-"

    def test_03_list_shows_view_count(self, gate_session):
        qs = _trpc_input({"batchId": 1})
        r = gate_session.get(
            f"{BASE_URL}/api/trpc/cellarBoard.listShareLinks?input={qs}",
            timeout=15,
        )
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        payload = data.get("result", {}).get("data", {})
        items = payload.get("json", payload)
        # items may be list directly or object with list
        if isinstance(items, dict) and "links" in items:
            items = items["links"]
        assert isinstance(items, list), f"unexpected shape: {items}"
        token = _share_state["token"]
        matching = [it for it in items if token[:16] in json.dumps(it) or it.get("id") == _share_state.get("id")]
        assert matching, f"created share link not found in list: {items}"
        vc = matching[0].get("viewCount", 0)
        assert vc >= 1, f"expected viewCount >= 1, got {vc}: {matching[0]}"

    def test_04_revoke_and_expect_410(self, gate_session, no_auth_session):
        # Resolve id via listShareLinks (createShareLink response does not include id)
        qs = _trpc_input({"batchId": 1})
        rl = gate_session.get(f"{BASE_URL}/api/trpc/cellarBoard.listShareLinks?input={qs}", timeout=15)
        assert rl.status_code == 200
        items = rl.json()["result"]["data"]["json"]
        token = _share_state["token"]
        match = next((it for it in items if it.get("token") == token), None)
        assert match, f"share link with our token not found: {items}"
        share_id = match["id"]
        body = {"json": {"id": share_id}}
        r = gate_session.post(
            f"{BASE_URL}/api/trpc/cellarBoard.revokeShareLink",
            json=body,
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        assert r.status_code == 200, f"revoke failed {r.status_code}: {r.text[:300]}"
        # Try fetching the revoked url
        r2 = no_auth_session.get(_share_state["url"], timeout=15)
        assert r2.status_code == 410, f"expected 410, got {r2.status_code}: {r2.text[:200]}"
        assert "revoked" in r2.text.lower()

    def test_05_bogus_token_404(self, no_auth_session):
        r = no_auth_session.get(f"{BASE_URL}/api/compliance/cellar-book.pdf?token=not-a-real-token", timeout=15)
        assert r.status_code == 404, f"{r.status_code}: {r.text[:200]}"
        assert "not found" in r.text.lower()


# ---------- Ask Owen citations ----------
def _ask_owen(session, question, batch_size=50):
    body = {"json": {"question": question, "mode": "home_winemaker", "batchSizeLitres": batch_size}}
    r = session.post(
        f"{BASE_URL}/api/trpc/tutor.ask",
        json=body,
        headers={"Content-Type": "application/json"},
        timeout=90,
    )
    return r


class TestAskOwenCitations:
    def _extract_sop_titles(self, r):
        assert r.status_code == 200, f"{r.status_code}: {r.text[:400]}"
        data = r.json()
        payload = data.get("result", {}).get("data", {})
        payload = payload.get("json", payload)
        titles = payload.get("sopTitles") or []
        return titles, payload

    def test_so2_target_cites_boulton_and_iland_or_margalit(self, gate_session):
        r = _ask_owen(gate_session, "What is the target molecular SO2 for a red wine at pH 3.5?", 50)
        titles, payload = self._extract_sop_titles(r)
        joined = " || ".join(titles)
        assert re.search(r"boulton", joined, re.I), f"no Boulton citation: {titles}"
        assert re.search(r"iland|margalit", joined, re.I), f"no Iland/Margalit citation: {titles}"
        assert not re.search(r"morewine|red winemaking outline", joined, re.I), f"legacy titles present: {titles}"

    def test_protein_stability_cites_iland_or_awri(self, gate_session):
        r = _ask_owen(gate_session, "How do I test protein stability in white wine before bottling?", 100)
        titles, _ = self._extract_sop_titles(r)
        joined = " || ".join(titles)
        assert re.search(r"iland.*protein heat stability|awri.*protein stability", joined, re.I), (
            f"no Iland/AWRI protein-stability citation: {titles}"
        )
        assert not re.search(r"morewine", joined, re.I), f"MoreWine! title present: {titles}"

    def test_stuck_ferment_cites_awri_and_named_bible(self, gate_session):
        r = _ask_owen(gate_session, "My fermentation is stuck at 8 Brix, what should I check?", 50)
        titles, _ = self._extract_sop_titles(r)
        joined = " || ".join(titles)
        assert re.search(r"AWRI Fact Sheet.*Stuck", joined), f"no AWRI stuck fact-sheet: {titles}"
        assert re.search(r"boulton|zoecklein|jackson", joined, re.I), f"no named-bible citation: {titles}"
        # NEW: no title should end with "Part N/M"
        for t in titles:
            assert not re.search(r"Part\s+\d+/\d+\s*$", t), f"title ends with Part N/M: {t!r} full: {titles}"


# ---------- Legal pages raw HTTP ----------
# These pages are SPA-rendered; the raw GET returns index.html shell.
# We only sanity-check the routes return 200 here; Playwright covers content.
class TestLegalPages:
    @pytest.mark.parametrize("path", ["/terms", "/refund", "/privacy"])
    def test_route_returns_html(self, gate_session, path):
        r = gate_session.get(f"{BASE_URL}{path}", timeout=15)
        assert r.status_code == 200
        assert "text/html" in r.headers.get("content-type", "")
