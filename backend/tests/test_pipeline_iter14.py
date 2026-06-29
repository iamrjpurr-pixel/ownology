"""Backend tests for iteration_14 pipeline board features:
  - outreach.bySlug returns updated CALENDLY_DEFAULT_URL
  - outreach.setPipelineStage: all 5 stages with correct timestamp side-effects
  - Idempotency: re-applying 'sent' preserves the original smsSentAt
  - Invalid stage rejected by zod (400/422)
  - Unknown slug throws not-found
  - outreach.list rows include repliedAt field
"""
import json
import os
import time
import urllib.parse
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://ownership-dev.preview.emergentagent.com").rstrip("/")
TRPC = f"{BASE_URL}/api/trpc"
EXPECTED_CALENDLY = "https://calendly.com/ownology/new-meeting"


def trpc_query(proc, payload):
    qs = urllib.parse.quote(json.dumps({"json": payload}))
    r = requests.get(f"{TRPC}/{proc}?input={qs}", timeout=20)
    try:
        return {"status": r.status_code, "json": r.json(), "text": r.text}
    except Exception:
        return {"status": r.status_code, "json": None, "text": r.text}


def trpc_mutation(proc, payload):
    r = requests.post(f"{TRPC}/{proc}",
                      json={"json": payload},
                      headers={"Content-Type": "application/json"},
                      timeout=20)
    try:
        return {"status": r.status_code, "json": r.json(), "text": r.text}
    except Exception:
        return {"status": r.status_code, "json": None, "text": r.text}


def data_of(resp):
    return resp["json"]["result"]["data"]["json"]


def fetch_by_slug_raw(slug):
    """Fetch the contact's raw row via outreach.list (since bySlug is trimmed)."""
    ls = trpc_query("outreach.list", {})
    assert ls["status"] == 200, ls
    contacts = data_of(ls)["contacts"]
    for c in contacts:
        if c["slug"] == slug:
            return c
    return None


@pytest.fixture
def temp_contact():
    """Create a transient contact and yield its slug; clean up after."""
    slug = f"test-pipe-{int(time.time()*1000)}"
    cr = trpc_mutation("outreach.create", {
        "firstName": "Pipe",
        "winery": f"PW{int(time.time())}",
        "slug": slug,
    })
    assert cr["status"] == 200, cr
    yield slug
    trpc_mutation("outreach.remove", {"slug": slug})


# ---------- Updated default Calendly URL ----------
class TestCalendlyDefault:
    def test_bySlug_returns_new_meeting_url(self):
        resp = trpc_query("outreach.bySlug", {"slug": "nathan-brokenwood-wines"})
        assert resp["status"] == 200, resp
        d = data_of(resp)
        if d is None:
            pytest.skip("nathan-brokenwood-wines not seeded")
        assert d.get("calendlyUrl") == EXPECTED_CALENDLY, (
            f"expected {EXPECTED_CALENDLY}, got {d.get('calendlyUrl')}"
        )


# ---------- outreach.list includes repliedAt field ----------
class TestListRepliedAtField:
    def test_repliedAt_field_present_on_every_row(self):
        ls = trpc_query("outreach.list", {})
        assert ls["status"] == 200, ls
        contacts = data_of(ls)["contacts"]
        assert len(contacts) > 0
        for c in contacts:
            assert "repliedAt" in c, f"repliedAt missing on {c.get('slug')}: keys={list(c.keys())}"


# ---------- setPipelineStage: full traversal ----------
class TestSetPipelineStage:
    def test_stage_lead_clears_all_timestamps(self, temp_contact):
        slug = temp_contact
        # Pre-set some timestamps by going to booked first
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "booked"})
        assert r["status"] == 200, r
        # Now back to lead
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "lead"})
        assert r["status"] == 200, r
        assert data_of(r)["stage"] == "lead"
        row = fetch_by_slug_raw(slug)
        assert row is not None
        assert row["smsSentAt"] is None, row
        assert row["repliedAt"] is None, row
        assert row["demoBookedAt"] is None, row

    def test_stage_sent_stamps_smsSentAt_only(self, temp_contact):
        slug = temp_contact
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "sent"})
        assert r["status"] == 200, r
        row = fetch_by_slug_raw(slug)
        assert row["smsSentAt"] is not None and row["smsSentAt"] > 0, row
        assert row["repliedAt"] is None, row
        assert row["demoBookedAt"] is None, row

    def test_stage_awaiting_same_state_as_sent(self, temp_contact):
        slug = temp_contact
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "awaiting"})
        assert r["status"] == 200, r
        row = fetch_by_slug_raw(slug)
        assert row["smsSentAt"] is not None, row
        assert row["repliedAt"] is None, row
        assert row["demoBookedAt"] is None, row

    def test_stage_replied_stamps_sms_and_replied(self, temp_contact):
        slug = temp_contact
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "replied"})
        assert r["status"] == 200, r
        row = fetch_by_slug_raw(slug)
        assert row["smsSentAt"] is not None, row
        assert row["repliedAt"] is not None, row
        assert row["demoBookedAt"] is None, row

    def test_stage_booked_stamps_sms_and_booked(self, temp_contact):
        slug = temp_contact
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "booked"})
        assert r["status"] == 200, r
        row = fetch_by_slug_raw(slug)
        assert row["smsSentAt"] is not None, row
        assert row["demoBookedAt"] is not None, row

    def test_full_traversal_lead_sent_awaiting_replied_booked_lead(self, temp_contact):
        slug = temp_contact
        for stage in ["lead", "sent", "awaiting", "replied", "booked", "lead"]:
            r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": stage})
            assert r["status"] == 200, f"stage={stage}: {r}"
            assert data_of(r)["stage"] == stage
        # Final state: lead clears all
        row = fetch_by_slug_raw(slug)
        assert row["smsSentAt"] is None
        assert row["repliedAt"] is None
        assert row["demoBookedAt"] is None

    def test_idempotent_sent_preserves_original_timestamp(self, temp_contact):
        slug = temp_contact
        r1 = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "sent"})
        assert r1["status"] == 200, r1
        row1 = fetch_by_slug_raw(slug)
        ts1 = row1["smsSentAt"]
        assert ts1 is not None
        # Sleep so a fresh Date.now() would differ
        time.sleep(1.2)
        r2 = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "sent"})
        assert r2["status"] == 200, r2
        row2 = fetch_by_slug_raw(slug)
        ts2 = row2["smsSentAt"]
        assert ts2 == ts1, f"smsSentAt should be preserved: {ts1} -> {ts2}"

    def test_invalid_stage_rejected(self, temp_contact):
        slug = temp_contact
        r = trpc_mutation("outreach.setPipelineStage", {"slug": slug, "stage": "won"})
        assert r["status"] in (400, 422), r

    def test_unknown_slug_throws(self):
        r = trpc_mutation("outreach.setPipelineStage", {
            "slug": f"totally-bogus-zzz-{int(time.time())}",
            "stage": "sent",
        })
        # tRPC errors typically come back as 500 (INTERNAL_SERVER_ERROR) for
        # `throw new Error(...)` in a mutation; assert it is NOT 200
        assert r["status"] != 200, r
        # Check the message bubbled through somewhere
        text_blob = (r.get("text") or "") + json.dumps(r.get("json") or {})
        assert "not found" in text_blob.lower(), r
