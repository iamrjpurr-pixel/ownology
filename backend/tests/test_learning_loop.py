"""
Backend regression tests for Ownology (Live Railway deployment).

Validates the core USP — the AI tutor "learning loop":
   tutor.ask is grounded in the user's own cellar history (vintage_log_entries).

Auth is bypassed in production — every request is auto-authenticated as
seed admin user (seed-owner-001). No login needed.
"""

import json
import urllib.parse

import pytest
import requests

BASE_URL = "https://ownology-production.up.railway.app"
TRPC = f"{BASE_URL}/api/trpc"

# Generous timeout — tutor.ask hits an LLM, can take 30-60s
LLM_TIMEOUT = 120


@pytest.fixture
def api_client():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _trpc_post(client, procedure, payload, timeout=LLM_TIMEOUT):
    """POST to a tRPC mutation."""
    return client.post(
        f"{TRPC}/{procedure}",
        data=json.dumps({"json": payload}),
        timeout=timeout,
    )


def _trpc_get(client, procedure, input_payload=None, timeout=30):
    """GET a tRPC query (input must be url-encoded JSON)."""
    url = f"{TRPC}/{procedure}"
    if input_payload is not None:
        url += "?input=" + urllib.parse.quote(json.dumps({"json": input_payload}))
    return client.get(url, timeout=timeout)


def _extract_data(resp_json):
    """Drill into the tRPC envelope: result.data.json"""
    return resp_json["result"]["data"]["json"]


# ---------------------------------------------------------------------------
# P0 — Cellar history backfill (run FIRST, learning loop depends on this)
# ---------------------------------------------------------------------------
class TestVintageLogList:
    """vintageLog.list must return the 16 seeded entries for seed-owner-001."""

    def test_list_returns_seeded_entries(self, api_client):
        resp = _trpc_get(api_client, "vintageLog.list", {})
        assert resp.status_code == 200, resp.text

        entries = _extract_data(resp.json())
        assert isinstance(entries, list), f"Expected list, got {type(entries)}"
        assert len(entries) >= 16, f"Expected >=16 seed entries, got {len(entries)}"

        tanks = {e["tankName"] for e in entries}
        varieties = {e["variety"] for e in entries}
        event_types = {e["eventType"] for e in entries}

        for required_tank in ("Tank 7", "Tank 12", "Tank 3", "Tank 1"):
            assert required_tank in tanks, f"Missing {required_tank} — tanks={tanks}"

        for required_var in ("Shiraz", "Chardonnay", "Pinot Noir"):
            assert required_var in varieties, f"Missing variety {required_var}"

        for required_ev in ("measurement", "addition", "inoculation", "racking", "observation"):
            assert required_ev in event_types, f"Missing event {required_ev}"


# ---------------------------------------------------------------------------
# P0 — Learning loop: tutor.ask cites user's own cellar history
# ---------------------------------------------------------------------------
class TestTutorAskLearningLoop:
    """The core USP — tutor must reference user's seeded Tank 7 Shiraz history."""

    QUESTION = (
        "What did I do last vintage on Tank 7 with the Shiraz? "
        "Should I follow the same DAP protocol this year?"
    )

    def test_tutor_ask_cites_personal_cellar_history(self, api_client):
        resp = _trpc_post(
            api_client,
            "tutor.ask",
            {"question": self.QUESTION, "mode": "winemaking"},
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"

        data = _extract_data(resp.json())
        assert "answer" in data, f"No answer field. keys={list(data.keys())}"
        answer = data["answer"]
        assert isinstance(answer, str) and len(answer) > 50, "Empty / tiny answer"

        # The answer must show evidence the AI read cellar history.
        # ---------- 1) Tank name ----------
        assert "Tank 7" in answer, f"Answer doesn't reference Tank 7. Answer:\n{answer}"

        # ---------- 2) Variety ----------
        assert "Shiraz" in answer, f"Answer doesn't reference Shiraz. Answer:\n{answer}"

        # ---------- 3) At least one specific date from the seed entries ----------
        date_tokens = ["31 Mar", "1 Apr", "3 Apr", "7 Apr", "8 Apr",
                       "31 March", "1 April", "3 April", "7 April", "8 April"]
        assert any(d in answer for d in date_tokens), (
            f"Answer cites no specific seeded date ({date_tokens}). Answer:\n{answer}"
        )

        # ---------- 4) At least one specific measurement ----------
        measurement_tokens = ["24.3", "18.5", "2.0", "120", "0.6"]
        # tighten: must appear with relevant unit nearby OR just the number
        assert any(m in answer for m in measurement_tokens), (
            f"Answer cites no specific measurement ({measurement_tokens}). Answer:\n{answer}"
        )

        # ---------- 5) Product names: EC1118, DAP, or YAN ----------
        product_tokens = ["EC1118", "EC-1118", "DAP", "YAN"]
        assert any(p in answer for p in product_tokens), (
            f"Answer references none of {product_tokens}. Answer:\n{answer}"
        )

        # Print snippet to test logs for human verification
        print("\n=== LEARNING LOOP ANSWER (truncated) ===")
        print(answer[:1500])
        print("=== /ANSWER ===\n")


# ---------------------------------------------------------------------------
# P0 — Non-regression: home_winemaker mode bypasses cellar context
# ---------------------------------------------------------------------------
class TestHomeWinemakerMode:
    def test_home_winemaker_path_works_without_cellar_refs(self, api_client):
        resp = _trpc_post(
            api_client,
            "tutor.ask",
            {
                "question": "My fermentation stopped at 8 Brix. What should I do?",
                "mode": "home_winemaker",
            },
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"

        data = _extract_data(resp.json())
        assert "answer" in data
        answer = data["answer"]
        assert isinstance(answer, str) and len(answer) > 50

        # Should discuss stuck ferment topics
        lower = answer.lower()
        stuck_topics = ["yeast", "nutrient", "temperature", "restart", "ferment", "stuck"]
        hits = [t for t in stuck_topics if t in lower]
        assert len(hits) >= 2, f"Answer doesn't address stuck ferment. Hits={hits}. Answer:\n{answer[:600]}"

        # Should NOT cite Tank 7 (DIY path skips cellar context)
        assert "Tank 7" not in answer, (
            f"home_winemaker path leaked cellar context. Answer:\n{answer[:600]}"
        )

        # disclaimer field must be present
        assert "disclaimer" in data, f"home_winemaker missing disclaimer. keys={list(data.keys())}"
        assert data["disclaimer"], "disclaimer is empty"


# ---------------------------------------------------------------------------
# P0 — Cellar journal SEO flywheel (sitemap + RSS)
# ---------------------------------------------------------------------------
class TestCellarJournalSEO:
    def test_sitemap_xml(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/cellar-journal/sitemap.xml", timeout=30)
        assert resp.status_code == 200, resp.text[:500]
        body = resp.text
        assert "<urlset" in body or "<sitemapindex" in body, "Not a sitemap"
        assert "<url>" in body, "No <url> entries in sitemap"

    def test_rss_xml(self, api_client):
        resp = api_client.get(f"{BASE_URL}/api/cellar-journal/rss.xml", timeout=30)
        assert resp.status_code == 200, resp.text[:500]
        body = resp.text
        assert "<rss" in body, "Not an RSS feed"
        assert 'version="2.0"' in body, "RSS not 2.0"


# ---------------------------------------------------------------------------
# P1 — Free Run (curiosityAsk) is a separate path, no cellar refs
# ---------------------------------------------------------------------------
class TestFreeRunCuriosityAsk:
    def test_curiosity_ask_no_cellar_refs(self, api_client):
        resp = _trpc_post(
            api_client,
            "freeRun.curiosityAsk",
            {"question": "Why does Pinot Noir taste so different from Cabernet?"},
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"

        data = _extract_data(resp.json())
        assert "answer" in data
        answer = data["answer"]
        assert isinstance(answer, str) and len(answer) > 20

        # Should not pull from user cellar
        assert "Tank 7" not in answer, "curiosityAsk leaked cellar history"

        # questionsUsed should be present and numeric
        if "questionsUsed" in data:
            assert isinstance(data["questionsUsed"], (int, float)), (
                f"questionsUsed not numeric: {data['questionsUsed']!r}"
            )


# ---------------------------------------------------------------------------
# P1 — Regulations RAG: SO2 NSW question should reference compliance corpus
# ---------------------------------------------------------------------------
class TestRegulationsRAG:
    def test_so2_nsw_compliance(self, api_client):
        resp = _trpc_post(
            api_client,
            "tutor.ask",
            {
                "question": "What are the SO2 limits for selling wine in New South Wales?",
                "mode": "winemaking",
            },
        )
        assert resp.status_code == 200, f"HTTP {resp.status_code}: {resp.text[:500]}"

        data = _extract_data(resp.json())
        assert "answer" in data
        answer = data["answer"].lower()
        # Loose check: at least mention SO2 and some compliance keyword
        assert "so2" in answer or "sulphur dioxide" in answer or "sulfur dioxide" in answer, (
            f"No SO2 reference. Answer:\n{data['answer'][:600]}"
        )
        compliance_hits = [k for k in ("nsw", "new south wales", "label", "limit", "regulation", "fsanz", "compliance")
                           if k in answer]
        assert len(compliance_hits) >= 1, (
            f"No compliance keywords found. Answer:\n{data['answer'][:600]}"
        )
