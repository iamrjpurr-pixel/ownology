"""Backend tests for voice-memo -> Whisper -> structured entry pipeline (vintageLog.parseFromVoice)
and bulkSave importSource='voice' regression.
"""
import base64
import os
import json
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://private-tutor-2.preview.emergentagent.com").rstrip("/")
AUDIO_PATH = "/tmp/voice-test.mp3"


def _trpc_call(procedure: str, payload: dict):
    url = f"{BASE_URL}/api/trpc/{procedure}"
    return requests.post(url, json={"json": payload}, headers={"Content-Type": "application/json"}, timeout=120)


@pytest.fixture(scope="module")
def audio_b64():
    assert os.path.exists(AUDIO_PATH), f"Missing test audio at {AUDIO_PATH}"
    with open(AUDIO_PATH, "rb") as f:
        return base64.b64encode(f.read()).decode("ascii")


# --- Feature: parseFromVoice happy path ---
class TestParseFromVoice:
    def test_transcribes_and_structures(self, audio_b64):
        r = _trpc_call("vintageLog.parseFromVoice", {
            "audioBase64": audio_b64,
            "mimeType": "audio/mpeg",
            "language": "en",
        })
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text[:400]}"
        body = r.json()
        # tRPC v10 response shape: { result: { data: { json: {...} } } }
        data = body.get("result", {}).get("data", {})
        data = data.get("json", data)
        assert "transcription" in data, f"No transcription key in: {data}"
        assert isinstance(data["transcription"], str) and len(data["transcription"]) > 0, \
            f"Empty transcription: {data}"
        assert "entries" in data and isinstance(data["entries"], list), f"Bad entries: {data}"
        assert len(data["entries"]) >= 1, f"Expected >=1 entry, got {data['entries']}"

        # Verify at least one entry references Tank 7 + Shiraz
        found = False
        for e in data["entries"]:
            tn = str(e.get("tankName", "")).lower()
            v = str(e.get("variety", "")).lower()
            if "tank 7" in tn and "shiraz" in v:
                found = True
                break
        assert found, f"No Tank 7 / Shiraz entry found. Entries: {json.dumps(data['entries'])[:800]}"
        # Save for downstream test
        TestParseFromVoice._entries = data["entries"]

    def test_empty_audio_rejected(self):
        r = _trpc_call("vintageLog.parseFromVoice", {
            "audioBase64": "",
            "mimeType": "audio/mpeg",
        })
        # zod min(1) → tRPC returns 400
        assert r.status_code >= 400, f"Empty audio should error, got {r.status_code}: {r.text[:200]}"

    def test_invalid_base64_rejected(self):
        # Non-base64 chars → decodes to empty/garbage → server rejects
        r = _trpc_call("vintageLog.parseFromVoice", {
            "audioBase64": "!!!not-base64!!!",
            "mimeType": "audio/mpeg",
        })
        # Either 400 from validation or 500 from Whisper — must NOT be 200 with success
        assert r.status_code >= 400, f"Invalid audio should error, got {r.status_code}: {r.text[:300]}"

    def test_oversize_audio_rejected(self):
        # Base64 that decodes to >25 MB (26 MB of zeros)
        big = base64.b64encode(b"\x00" * (26 * 1024 * 1024)).decode("ascii")
        r = _trpc_call("vintageLog.parseFromVoice", {
            "audioBase64": big,
            "mimeType": "audio/mpeg",
        })
        # Accept either express 413 (payload too large) or 400 from server-side 25MB check.
        assert r.status_code in (400, 413) or r.status_code >= 400, \
            f"Oversize should error, got {r.status_code}"


# --- Feature: bulkSave accepts importSource='voice' ---
class TestBulkSaveVoice:
    def test_bulk_save_voice_source(self):
        payload = {
            "entries": [{
                "tankName": "Tank 7",
                "variety": "Shiraz",
                "eventType": "addition",
                "details": {"what": "DAP", "quantity": "2.6", "unit": "kg"},
                "entryDate": None,
                "noteText": "TEST_voice_import",
            }],
            "importSource": "voice",
        }
        r = _trpc_call("vintageLog.bulkSave", payload)
        assert r.status_code == 200, f"HTTP {r.status_code}: {r.text[:400]}"
        body = r.json()
        data = body.get("result", {}).get("data", {})
        data = data.get("json", data)
        # Should have saved count or similar
        assert data is not None, f"No data in response: {body}"

    def test_bulk_save_rejects_unknown_source(self):
        payload = {
            "entries": [{
                "tankName": "Tank X",
                "variety": "Shiraz",
                "eventType": "addition",
                "details": {"what": "test", "quantity": "1", "unit": "kg"},
            }],
            "importSource": "bogus_source",
        }
        r = _trpc_call("vintageLog.bulkSave", payload)
        assert r.status_code >= 400, f"Unknown source should error, got {r.status_code}"


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
