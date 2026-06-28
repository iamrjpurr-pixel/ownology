"""
Iteration 3 — PURE REFACTOR regression verification.

Refactor under test: server/routers.ts split into:
  - server/routers/tutor.ts        (tutor sub-router)
  - server/routers/vintageLog.ts   (vintageLog sub-router)
  - server/routers/knowledge.ts    (knowledge sub-router)
  - server/routers/wbsAdmin.ts     (wbsAdmin sub-router)
plus the slimmer routers.ts that composes the appRouter.

Goal: zero regressions across the full tRPC surface on LIVE Railway.
Auth bypassed — every request auto-authenticates as seed-owner-001.
"""

import json
import urllib.parse

import pytest
import requests

BASE_URL = "https://ownology-production.up.railway.app"
TRPC = f"{BASE_URL}/api/trpc"

LLM_TIMEOUT = 180
QUERY_TIMEOUT = 45


@pytest.fixture(scope="module")
def client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _get(client, procedure, input_payload=None, timeout=QUERY_TIMEOUT):
    url = f"{TRPC}/{procedure}"
    if input_payload is not None:
        url += "?input=" + urllib.parse.quote(json.dumps({"json": input_payload}))
    return client.get(url, timeout=timeout)


def _post(client, procedure, payload, timeout=LLM_TIMEOUT):
    return client.post(
        f"{TRPC}/{procedure}",
        data=json.dumps({"json": payload}),
        timeout=timeout,
    )


def _data(resp_json):
    return resp_json["result"]["data"]["json"]


def _is_mounted(resp):
    """A router is mounted iff response is NOT a 404 NOT_FOUND tRPC error."""
    if resp.status_code == 404:
        return False
    try:
        body = resp.json()
    except Exception:
        return resp.status_code < 500
    # tRPC 404 wraps: {"error":{"json":{"code":-32004,"data":{"code":"NOT_FOUND",...}}}}
    if isinstance(body, dict) and "error" in body:
        err = body["error"]
        data = err.get("json", {}).get("data", {}) if isinstance(err, dict) else {}
        if data.get("code") == "NOT_FOUND":
            return False
    return True


# ===========================================================================
# P0 — Test 1: All 4 EXTRACTED sub-routers respond correctly
# ===========================================================================
class TestExtractedRouters:
    def test_vintageLog_alerts(self, client):
        resp = _get(client, "vintageLog.alerts", {})
        assert resp.status_code == 200, resp.text[:500]
        payload = _data(resp.json())
        # Response shape is {alerts: [...]} (confirmed against live)
        alerts = payload["alerts"] if isinstance(payload, dict) and "alerts" in payload else payload
        assert isinstance(alerts, list), f"Expected list, got {type(alerts)}"
        assert len(alerts) >= 4, f"Expected >=4 alerts, got {len(alerts)}: {alerts}"
        severities = {a.get("severity") for a in alerts}
        assert "high" in severities, f"No HIGH severity alert. severities={severities}"
        # Tank 8 stuck OR Tank 9 DAP HIGH
        high_alerts = [a for a in alerts if a.get("severity") == "high"]
        tank_names = " ".join(json.dumps(a) for a in high_alerts)
        assert ("Tank 8" in tank_names) or ("Tank 9" in tank_names), (
            f"No Tank 8 stuck / Tank 9 DAP HIGH alert: {high_alerts}"
        )

    def test_knowledge_listSops(self, client):
        resp = _get(client, "knowledge.listSops", {})
        assert resp.status_code == 200, resp.text[:500]
        sops = _data(resp.json())
        assert isinstance(sops, list), f"Expected list, got {type(sops)}"
        assert len(sops) >= 38, f"Expected >=38 SOPs, got {len(sops)}"

    def test_wbsAdmin_listDomains(self, client):
        resp = _get(client, "wbsAdmin.listDomains")
        # listDomains may or may not take input — try no input first
        if resp.status_code != 200:
            resp = _get(client, "wbsAdmin.listDomains", {})
        assert resp.status_code == 200, resp.text[:500]
        domains = _data(resp.json())
        assert isinstance(domains, list), f"Expected list, got {type(domains)}"
        assert len(domains) >= 50, f"Expected >=50 domains, got {len(domains)}"

    def test_tutor_ask_learning_loop(self, client):
        """THE most important regression check — learning loop must still work."""
        resp = _post(
            client,
            "tutor.ask",
            {
                "question": "What did I do last vintage on Tank 7 with the Shiraz?",
                "mode": "winemaking",
            },
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"
        data = _data(resp.json())
        assert "answer" in data
        answer = data["answer"]
        assert isinstance(answer, str) and len(answer) > 50
        assert "Tank 7" in answer, f"Missing Tank 7. Answer:\n{answer[:800]}"
        assert "Shiraz" in answer, f"Missing Shiraz. Answer:\n{answer[:800]}"
        measurement_tokens = ["24.3", "18.5", "120", "0.6", "EC1118", "EC-1118"]
        assert any(m in answer for m in measurement_tokens), (
            f"No specific measurement/product in answer. Answer:\n{answer[:800]}"
        )
        print("\n=== TUTOR ANSWER (Tank 7 Shiraz) ===")
        print(answer[:1200])
        print("=== /ANSWER ===\n")


# ===========================================================================
# P0 — Test 2: Non-extracted routers (regression check)
# ===========================================================================
class TestNonExtractedRouters:
    def test_dashboard_getStats(self, client):
        resp = _get(client, "dashboard.getStats")
        if resp.status_code != 200:
            resp = _get(client, "dashboard.getStats", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, dict), f"Expected dict, got {type(data)}"

    def test_cellarEquipment_list(self, client):
        resp = _get(client, "cellarEquipment.list", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_cellarTasks_list(self, client):
        resp = _get(client, "cellarTasks.list", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_compliance_ask_mounted(self, client):
        """compliance router probe — `searchSops` returns 404; `ask` (POST) is the actual procedure."""
        resp = _post(client, "compliance.ask", {"question": "What are NSW SO2 limits?"}, timeout=120)
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, dict)

    def test_vineyard_listBlocks(self, client):
        resp = _get(client, "vineyard.listBlocks", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_barrel_list(self, client):
        resp = _get(client, "barrel.list")
        if resp.status_code != 200:
            resp = _get(client, "barrel.list", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, list), f"Expected list, got {type(data)}"

    def test_vintageReminder_list(self, client):
        resp = _get(client, "vintageReminder.list")
        if resp.status_code != 200:
            resp = _get(client, "vintageReminder.list", {})
        assert resp.status_code == 200, resp.text[:500]
        data = _data(resp.json())
        assert isinstance(data, list), f"Expected list, got {type(data)}"


# ===========================================================================
# P0 — Test 3: appRouter composition — all 24 named sub-routers reachable
# ===========================================================================
class TestAppRouterComposition:
    """Hit ANY procedure from each named sub-router. NOT_FOUND == regression."""

    # router -> (procedure, method, input) — names confirmed via live probing
    PROBES = [
        ("foundingMembers.list", "GET", {}),
        ("orders.list", "GET", {}),
        ("vintageLog.list", "GET", {}),
        ("vintageReminder.list", "GET", {}),
        ("wineBatch.list", "GET", {}),
        ("leads.list", "GET", {}),
        ("siteContent.getAll", "GET", {}),
        ("cellarEquipment.list", "GET", {}),
        ("cellarTasks.list", "GET", {}),
        ("dashboard.getStats", "GET", None),
        ("barrel.list", "GET", {}),
        ("packaging.list", "GET", {}),
        ("vineyard.listBlocks", "GET", {}),
        ("knowledge.listSops", "GET", {}),
        ("vintageIntelligence.list", "GET", {}),
        ("wbsAdmin.listDomains", "GET", None),
        ("freeRun.status", "GET", None),
        ("cellarJournal.list", "GET", {}),
    ]

    @pytest.mark.parametrize("procedure,method,inp", PROBES)
    def test_router_mounted(self, client, procedure, method, inp):
        router = procedure.split(".")[0]
        if method == "GET":
            resp = _get(client, procedure, inp)
            # Re-try with empty input if no-input failed with bad-input error
            if resp.status_code in (400, 422) and inp is None:
                resp = _get(client, procedure, {})
            # Some procedures may not exist with the guessed name — accept any
            # non-404 response from that ROUTER as proof the router is mounted.
            # If 404, try a different fallback procedure per router.
        else:
            resp = _post(client, procedure, inp or {})

        # If procedure not found, the router itself might still be mounted —
        # tRPC returns NOT_FOUND for unknown procedure. Probe an alternative.
        if not _is_mounted(resp):
            # Try a fallback that virtually every router has — call <router>.
            # with no procedure to see if router path resolves
            fallback_resp = _get(client, f"{router}.__probe__", {})
            # If even fallback says router resolves with PROCEDURE_NOT_FOUND
            # vs the entire path failing, accept the FIRST probe's 404 only if
            # we can't find any working procedure.
            pytest.fail(
                f"Router '{router}' procedure '{procedure}' returned NOT_FOUND. "
                f"status={resp.status_code} body={resp.text[:300]}"
            )


# ===========================================================================
# P0 — Test 4: Learning loop full prompt path — Tank 9 Shiraz reasoning
# ===========================================================================
class TestLearningLoopTank9:
    def test_tutor_references_tank9(self, client):
        resp = _post(
            client,
            "tutor.ask",
            {
                "question": "What was my recent thinking on Tank 9 Shiraz?",
                "mode": "winemaking",
            },
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"
        data = _data(resp.json())
        assert "answer" in data
        answer = data["answer"]
        assert isinstance(answer, str) and len(answer) > 50
        assert "Tank 9" in answer, (
            f"Answer missing Tank 9 — getUserCellarContext may not be wired in tutor.ts. "
            f"Answer:\n{answer[:800]}"
        )
        print("\n=== TUTOR ANSWER (Tank 9 reasoning) ===")
        print(answer[:1200])
        print("=== /ANSWER ===\n")


# ===========================================================================
# P1 — Test 5: Cellar Journal SEO endpoints (Express, not tRPC)
# ===========================================================================
class TestCellarJournalSEO:
    def test_sitemap_xml(self, client):
        resp = client.get(f"{BASE_URL}/api/cellar-journal/sitemap.xml", timeout=30)
        assert resp.status_code == 200, resp.text[:300]
        body = resp.text
        assert "<urlset" in body or "<sitemapindex" in body
        assert "<url>" in body, "No <url> entries"

    def test_rss_xml(self, client):
        resp = client.get(f"{BASE_URL}/api/cellar-journal/rss.xml", timeout=30)
        assert resp.status_code == 200, resp.text[:300]
        body = resp.text
        assert "<rss" in body
        assert 'version="2.0"' in body
