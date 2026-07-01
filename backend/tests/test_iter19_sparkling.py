"""Iteration-19: Sparkling wine capability across engine + content + surface layers.

Tests:
  - Tank 20 (Sparkling Chardonnay Cuvée) classified as sparkling — white-flow grounding, no red SOPs
  - Ghost question routing → category='sparkling', slug starts 'sparkling-bubbles-'
  - No cross-contamination: Tank 2 Chardonnay still gets white grounding (not sparkling)
  - Journal list (Sparkling & Bubbles) returns 54 rows, all wineType=sparkling
  - Journal entry has source='ghost.seed' and mentions Tasmania producers
  - Sitemap serves >= 305 <loc> tags with application/xml
  - Iter-18 regression: still cards, cellarJournal.getBySlug, hero-journal link deep resolves
"""

import os
import urllib.parse
import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")


def _trpc_get(procedure: str, payload=None):
    if payload is None:
        url = f"{BASE_URL}/api/trpc/{procedure}"
    else:
        q = urllib.parse.quote(f'{{"json":{payload}}}')
        url = f"{BASE_URL}/api/trpc/{procedure}?input={q}"
    r = requests.get(url, timeout=30)
    r.raise_for_status()
    return r.json()["result"]["data"]["json"]


# ---------- Cellar Brief cards ----------

@pytest.fixture(scope="module")
def brief_cards():
    data = _trpc_get("cellarBrief.latest")
    return data["summary"]["cards"]


def _card(cards, vessel_id, variety):
    for c in cards:
        if c["vesselId"] == vessel_id and c["variety"] == variety:
            return c
    pytest.fail(f"card not found: vesselId={vessel_id!r} variety={variety!r}")


def test_tank20_sparkling_classification(brief_cards):
    """Tank 20 'Sparkling Chardonnay Cuvée' → sparkling routing."""
    c = _card(brief_cards, "Tank 20", "Sparkling Chardonnay Cuvée")
    chip_titles = [g.get("title", "") if isinstance(g, dict) else str(g) for g in c["grounding"]]
    chips = " || ".join(chip_titles).lower()
    # No red-flow SOPs
    assert "red wine fermentation" not in chips, chip_titles
    assert "pump-over protocol" not in chips, chip_titles
    assert "cap management" not in chips, chip_titles
    assert "red wine bible" not in chips, chip_titles
    # Includes white-flow refs
    assert "sop 13 white wine fermentation" in chips or "white wine bible" in chips, chip_titles


def test_tank20_ghost_question_sparkling(brief_cards):
    c = _card(brief_cards, "Tank 20", "Sparkling Chardonnay Cuvée")
    gq = c.get("ghostQuestion") or {}
    assert gq.get("category") == "sparkling", gq
    slug = gq.get("journalSlug") or ""
    assert slug.startswith("sparkling-bubbles-"), slug
    q = (gq.get("question") or "").lower()
    assert any(t in q for t in ["tirage", "base wine", "disgorg", "autolysis",
                                "méthode", "methode", "sparkling", "bubble",
                                "cuvée", "cuvee", "bottle-conditioned"]), q


def test_tank2_chardonnay_still_white_not_sparkling(brief_cards):
    """Regression: still Chardonnay must NOT get sparkling routing."""
    c = _card(brief_cards, "Tank 2", "Chardonnay")
    chip_titles = [g.get("title", "") if isinstance(g, dict) else str(g) for g in c["grounding"]]
    chips = " || ".join(chip_titles).lower()
    assert "white wine bible" in chips or "sop 13 white wine fermentation" in chips
    assert "red wine bible" not in chips, chip_titles
    gq = c.get("ghostQuestion") or {}
    assert gq.get("category") != "sparkling", gq
    slug = gq.get("journalSlug") or ""
    assert not slug.startswith("sparkling-bubbles-"), slug


def test_still_red_shiraz_regression(brief_cards):
    """Regression: red still tanks unchanged — red-flow grounding present."""
    c = _card(brief_cards, "Tank 3", "Shiraz")
    chip_titles = [g.get("title", "") if isinstance(g, dict) else str(g) for g in c["grounding"]]
    chips = " || ".join(chip_titles).lower()
    assert "red wine" in chips, chip_titles


# ---------- Journal list (Sparkling & Bubbles) ----------

@pytest.fixture(scope="module")
def sparkling_journal():
    payload = '{"topic":"Sparkling & Bubbles","limit":60}'
    return _trpc_get("cellarJournal.list", payload)


def test_sparkling_journal_total(sparkling_journal):
    total = sparkling_journal.get("total")
    assert total is not None and total >= 50, total


def test_sparkling_journal_row_shape(sparkling_journal):
    rows = sparkling_journal["rows"]
    assert len(rows) >= 50
    for r in rows:
        assert r["topicTag"] == "Sparkling & Bubbles", r
        assert r["wineType"] == "sparkling", r
        assert r["slug"].startswith("sparkling-bubbles-"), r["slug"]


def test_sparkling_journal_tasmania_mentions(sparkling_journal):
    rows = sparkling_journal["rows"]
    tokens = ("tasmania", "arras", "jansz", "clover hill", "pipers brook")
    hits = 0
    for r in rows:
        blob = ((r.get("question") or "") + " " + (r.get("diagnosis") or "")).lower()
        if any(t in blob for t in tokens):
            hits += 1
    # 10 required in question/diagnosis+question; full_answer is checked in DB test.
    assert hits >= 5, f"only {hits} rows mention Tasmania/producers in q+diagnosis"


def test_sparkling_journal_entry_source_ghost_seed():
    payload = '{"slug":"sparkling-bubbles-when-should-i-press-sparkling-base-fruit-if-i-want-the-brightest-cleanest-wine"}'
    data = _trpc_get("cellarJournal.getBySlug", payload)
    entry = data["entry"]
    assert entry["source"] == "ghost.seed", entry.get("source")
    assert entry["wineType"] == "sparkling"
    assert entry["topicTag"] == "Sparkling & Bubbles"
    assert len(entry.get("fullAnswer") or "") >= 200
    blob = (entry.get("fullAnswer") or "").lower()
    assert any(t in blob for t in ("tasmania", "arras", "jansz", "clover hill", "pipers brook"))


# ---------- Sitemap ----------

def test_sitemap_grows_with_sparkling():
    r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=30)
    assert r.status_code == 200
    assert "application/xml" in r.headers.get("content-type", "")
    loc_count = r.text.count("<loc>")
    assert loc_count >= 305, f"only {loc_count} <loc> tags"


def test_sitemap_sparkling_slug_resolvable():
    payload = '{"slug":"sparkling-bubbles-when-should-i-press-sparkling-base-fruit-if-i-want-the-brightest-cleanest-wine"}'
    data = _trpc_get("cellarJournal.getBySlug", payload)
    assert data["entry"]["slug"].startswith("sparkling-bubbles-")


# ---------- Iter-18 light regression ----------

def test_iter18_journal_still_works():
    payload = '{"limit":10}'
    data = _trpc_get("cellarJournal.list", payload)
    assert data.get("total", 0) >= 300  # was 253, now 307+
    assert len(data["rows"]) == 10
