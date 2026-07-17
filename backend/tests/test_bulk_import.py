"""Backend tests for the new Bulk Import feature.

Verifies:
- vintageLog.bulkSave accepts importSource='bulk' (new source)
- vintageLog.bulkSave still rejects unknown importSource values
- vintageLog.parseFromText still functions (regression — bulk tab reuses it)
"""
import os
import pytest
import requests

BASE_URL = os.environ.get(
    "REACT_APP_BACKEND_URL",
    "https://private-tutor-2.preview.emergentagent.com",
).rstrip("/")


def _trpc_call(procedure: str, payload: dict):
    url = f"{BASE_URL}/api/trpc/{procedure}"
    return requests.post(
        url,
        json={"json": payload},
        headers={"Content-Type": "application/json"},
        timeout=120,
    )


def _unwrap(resp_json):
    data = resp_json.get("result", {}).get("data", {})
    return data.get("json", data)


# --- Feature: bulkSave accepts importSource='bulk' ---
class TestBulkSaveBulkSource:
    def test_bulk_save_bulk_source(self):
        payload = {
            "entries": [{
                "tankName": "Tank 7",
                "variety": "Shiraz",
                "eventType": "addition",
                "details": {"what": "DAP", "quantity": "30", "unit": "g"},
                "entryDate": "2024-03-12",
                "noteText": "TEST_bulk_import iter29",
            }],
            "importSource": "bulk",
        }
        r = _trpc_call("vintageLog.bulkSave", payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text[:400]}"
        data = _unwrap(r.json())
        assert data is not None, f"No data: {r.json()}"
        assert data.get("saved") == 1, f"Expected saved=1, got {data}"
        assert isinstance(data.get("batchId"), str) and len(data["batchId"]) > 0, \
            f"Missing/invalid batchId: {data}"

    def test_bulk_save_multi_entries(self):
        entries = [
            {
                "tankName": f"TEST_Tank {i}",
                "variety": "Shiraz",
                "eventType": "measurement",
                "details": {"metric": "brix", "value": 22.0 + i},
                "noteText": f"TEST_bulk multi #{i}",
            }
            for i in range(3)
        ]
        r = _trpc_call("vintageLog.bulkSave", {"entries": entries, "importSource": "bulk"})
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text[:400]}"
        data = _unwrap(r.json())
        assert data.get("saved") == 3, f"Expected saved=3, got {data}"

    def test_bulk_save_rejects_unknown_source(self):
        payload = {
            "entries": [{
                "tankName": "Tank X",
                "variety": "Shiraz",
                "eventType": "addition",
                "details": {"what": "test"},
            }],
            "importSource": "bogus_source",
        }
        r = _trpc_call("vintageLog.bulkSave", payload)
        assert r.status_code >= 400, f"Unknown source should error, got {r.status_code}"

    def test_bulk_save_still_accepts_legacy_sources(self):
        for src in ["paste", "csv", "image", "voice"]:
            payload = {
                "entries": [{
                    "tankName": "TEST_LegacyTank",
                    "variety": "Shiraz",
                    "eventType": "observation",
                    "details": {"note": f"legacy source {src}"},
                    "noteText": f"TEST_legacy_{src}",
                }],
                "importSource": src,
            }
            r = _trpc_call("vintageLog.bulkSave", payload)
            assert r.status_code == 200, f"src={src} HTTP {r.status_code}: {r.text[:300]}"


# --- Regression: parseFromText still works (bulk tab reuses it) ---
class TestParseFromTextRegression:
    def test_parse_from_text_extracts(self):
        payload = {
            "rawText": "Tank 7 Shiraz - 30g DAP added on 12 March 2024. YAN reading 180 ppm.",
        }
        r = _trpc_call("vintageLog.parseFromText", payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text[:400]}"
        data = _unwrap(r.json())
        assert "entries" in data, f"Missing entries: {data}"
        assert isinstance(data["entries"], list), f"entries not a list: {data}"
        # LLM should extract at least one entry from this rich text
        assert len(data["entries"]) >= 1, f"Expected >=1 entry from text, got {data}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
