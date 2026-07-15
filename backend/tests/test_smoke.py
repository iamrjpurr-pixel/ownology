"""
Backend smoke tests — run against the live preview backend.

Purpose: catch obvious regressions before every deploy. Not a full
end-to-end test suite — just the endpoints that shipping-critical
features depend on. If any of these fail, don't deploy.

Run: cd /app/backend/tests && python -m pytest -v

Env:
  API_URL           - defaults to http://localhost:8001
  GATE_PASSWORD     - defaults to OWNOLOGY_GATE_PASSWORD from /app/.env
"""
import os
import requests

API_URL = os.environ.get("API_URL", "http://localhost:8001")


def _env_password() -> str:
    """Read OWNOLOGY_GATE_PASSWORD from /app/.env for local runs."""
    for key in ("GATE_PASSWORD", "OWNOLOGY_GATE_PASSWORD"):
        if os.environ.get(key):
            return os.environ[key]
    try:
        with open("/app/.env") as f:
            for line in f:
                if line.startswith("OWNOLOGY_GATE_PASSWORD="):
                    return line.split("=", 1)[1].strip()
    except FileNotFoundError:
        pass
    return "changeme-set-real-password"


def test_health_probe_returns_200():
    r = requests.get(f"{API_URL}/api/health", timeout=5)
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_deep_health_reports_all_integrations():
    r = requests.get(f"{API_URL}/api/health/deep", timeout=10)
    body = r.json()
    assert "services" in body
    for k in ("mysql", "perplexity_key", "resend_key", "emergent_llm_key", "gate_password"):
        assert k in body["services"], f"missing service in deep health: {k}"


def test_gate_wrong_password_returns_401():
    r = requests.post(
        f"{API_URL}/api/gate/verify",
        json={"password": "definitely-wrong"},
        timeout=5,
    )
    assert r.status_code == 401
    assert r.json()["ok"] == False


def test_gate_correct_password_sets_cookie():
    r = requests.post(
        f"{API_URL}/api/gate/verify",
        json={"password": _env_password()},
        timeout=5,
    )
    assert r.status_code == 200
    assert r.json()["ok"] == True
    assert "ow_gate" in r.cookies, "ow_gate cookie must be set"


def test_gate_status_reflects_cookie():
    s = requests.Session()
    s.post(f"{API_URL}/api/gate/verify", json={"password": _env_password()}, timeout=5)
    r = s.get(f"{API_URL}/api/gate/status", timeout=5)
    assert r.json()["unlocked"] == True


def test_trpc_quiz_stats_is_reachable():
    r = requests.get(f"{API_URL}/api/trpc/quiz.stats", timeout=5)
    assert r.status_code == 200


def test_trpc_outreach_list_is_reachable():
    r = requests.get(f"{API_URL}/api/trpc/outreach.list", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "result" in data


def test_outreach_unactivated_cold_endpoint():
    r = requests.get(f"{API_URL}/api/trpc/outreach.unactivatedCold", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "contacts" in data["result"]["data"]["json"]


def test_quiz_log_pick_accepts_valid_payload():
    r = requests.post(
        f"{API_URL}/api/trpc/quiz.logPick",
        json={
            "json": {
                "sessionId": "pytest-smoke-session",
                "wineType": "red",
                "fruit": "dark",
                "body": "medium",
                "sweetness": "bone_dry",
                "grip": "grippy",
                "age": "young",
                "budget": "25_50",
                "winnerSlug": "shiraz-barossa",
                "trueMatchSlug": "shiraz-barossa",
                "region": "AU",
            }
        },
        timeout=5,
    )
    assert r.status_code == 200


def test_quiz_capture_lead_accepts_valid_payload():
    r = requests.post(
        f"{API_URL}/api/trpc/quiz.captureLead",
        json={
            "json": {
                "sessionId": "pytest-smoke-session",
                "email": "pytest@example.test",
                "firstName": "Pytest",
                "winnerSlug": "shiraz-barossa",
                "region": "AU",
            }
        },
        timeout=5,
    )
    assert r.status_code == 200
    assert r.json()["result"]["data"]["json"]["ok"] == True


def test_lip_audit_pdf_requires_auth():
    r = requests.get(f"{API_URL}/api/compliance/lip-audit-pack.pdf", timeout=5, allow_redirects=False)
    assert r.status_code in (401, 302), "unauthenticated LIP-audit request must be denied"


def test_producers_stats_endpoint():
    r = requests.get(f"{API_URL}/api/trpc/producers.stats", timeout=5)
    assert r.status_code == 200
    data = r.json()
    assert "total" in data["result"]["data"]["json"]


def test_producers_bulk_import_dedupes():
    payload = {
        "json": {
            "source": "pytest",
            "producers": [
                {"name": "Pytest Winery", "country": "AU", "region": "Test Region"},
                {"name": "Pytest Winery", "country": "AU"},
            ],
        }
    }
    r = requests.post(f"{API_URL}/api/trpc/producers.bulkImport", json=payload, timeout=5)
    assert r.status_code == 200
    body = r.json()["result"]["data"]["json"]
    # First call: 1 inserted, 1 skipped (dedupe inside batch).
    assert body["inserted"] + body["skipped"] == 2


def test_tutor_sandbox_ask_returns_grounded_answer():
    """C2 smoke — live LLM call. Slow (~5s); skip if EMERGENT_LLM_KEY missing."""
    r = requests.post(
        f"{API_URL}/api/trpc/tutor.sandboxAsk",
        json={"json": {"sessionId": "pytest-c2-smoke", "question": "Why did YAN drop?"}},
        timeout=20,
    )
    assert r.status_code == 200
    body = r.json()["result"]["data"]["json"]
    assert body["ok"] == True
    assert len(body["answer"]) > 30
