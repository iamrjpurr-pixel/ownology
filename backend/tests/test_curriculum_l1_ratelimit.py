# Curriculum Level 1 unlock: per-IP rate limit (5/hr) + XFF spoof bypass check (iteration_53)
import json
import os
import time
import urllib.parse

import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL").rstrip("/")
EMAIL = f"test_l1_rl_{int(time.time())}@example.com"
CREATED_EMAILS_FILE = "/tmp/curriculum_l1_test_emails.txt"


def unlock(headers=None):
    return requests.post(f"{BASE_URL}/api/trpc/curriculum.unlockLevel1",
                         json={"json": {"email": EMAIL, "role": "team"}}, headers=headers or {}, timeout=30)


def test_rate_limit_and_spoof():
    with open(CREATED_EMAILS_FILE, "a") as f:
        f.write(EMAIL + "\n")
    codes = [unlock().status_code for _ in range(7)]
    print("codes (no XFF):", codes)
    assert 429 in codes, f"no 429 after 7 calls: {codes}"
    first429 = codes.index(429)
    assert all(c == 200 for c in codes[:first429])
    r = unlock()
    assert r.status_code == 429
    body = r.json()
    print("429 body:", json.dumps(body)[:300])
    assert "Too many" in json.dumps(body)
    # Spoof: client-supplied X-Forwarded-For with a fresh IP
    spoofed = [unlock({"X-Forwarded-For": f"10.9.{i}.{int(time.time()) % 250}"}).status_code for i in range(3)]
    print("codes (spoofed XFF):", spoofed)
    assert all(c == 429 for c in spoofed), f"XFF spoof bypasses rate limit: {spoofed}"
