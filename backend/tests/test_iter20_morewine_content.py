"""Iteration-20: Real MoreWine PDF ingestion + sparkling grounding order.

Tests:
  - 15 distinct morew_* source_docs present (real MoreWine PDFs), morew_white_outline GONE
  - Sparkling protocol chunks tagged at WBS 9.1 / 9.3 / 9.4 across the 2 sparkling docs
  - Content quality: WBS 9.3 sparkling yeast chunk contains real MoreWine numeric protocol data
  - Cellar Brief Tank 20 sparkling card grounding includes 'Sparkling Wine Protocol — Yeast'
    with zero red-flow contamination
  - White Chardonnay cards still get White Wine Bible in grounding (D-prefix priority)
  - Red-variety cards still get Red-flow SOPs + Red Wine Bible, no sparkling manuals leaking
  - Journal >= 305 rows, sitemap >= 305 <loc>
"""

import os
import urllib.parse
import pytest
import pymysql
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")

DB_CFG = dict(
    host="reseau.proxy.rlwy.net",
    port=34291,
    user="root",
    password="xkNuWbTXhvXfStocRRFpWeWRllLJBCmJ",
    database="railway",
    cursorclass=pymysql.cursors.DictCursor,
    autocommit=True,
)


@pytest.fixture(scope="module")
def db():
    conn = pymysql.connect(**DB_CFG)
    yield conn
    conn.close()


@pytest.fixture(scope="module")
def brief_cards():
    r = requests.get(f"{BASE_URL}/api/trpc/cellarBrief.latest", timeout=30)
    r.raise_for_status()
    return r.json()["result"]["data"]["json"]["summary"]["cards"]


# ---------- DB state: MoreWine ingestion ----------

EXPECTED_MOREW_DOCS = {
    "morew_bench_trials", "morew_fining_agents", "morew_inert_gas",
    "morew_mlf_paper", "morew_oak_barrel_care", "morew_oak_info",
    "morew_oxygen_ferment", "morew_ph_meter", "morew_red_outline",
    "morew_sanitation", "morew_so2_mgmt", "morew_so2_protocol",
    "morew_sparkling_proelif", "morew_sparkling_yeast",
    "morew_yeast_hydration", "morew_yeast_pairing",
}


def test_morewine_source_docs_present(db):
    with db.cursor() as c:
        c.execute(
            "SELECT DISTINCT source_doc FROM diy_knowledge_chunks WHERE source_doc LIKE 'morew_%'"
        )
        docs = {r["source_doc"] for r in c.fetchall()}
    missing = EXPECTED_MOREW_DOCS - docs
    assert not missing, f"missing morew_ source_docs: {missing}"


def test_morew_white_outline_removed(db):
    with db.cursor() as c:
        c.execute(
            "SELECT COUNT(*) c FROM diy_knowledge_chunks WHERE source_doc='morew_white_outline'"
        )
        row = c.fetchone()
    assert row["c"] == 0, "morew_white_outline should be gone (0 rows)"


def test_sparkling_chunks_wbs_tags(db):
    """9.1, 9.3, 9.4 all present across morew_sparkling_yeast + morew_sparkling_proelif."""
    with db.cursor() as c:
        c.execute(
            "SELECT wbs_code, COUNT(*) c FROM diy_knowledge_chunks "
            "WHERE source_doc IN ('morew_sparkling_yeast','morew_sparkling_proelif') "
            "GROUP BY wbs_code ORDER BY wbs_code"
        )
        rows = {r["wbs_code"]: r["c"] for r in c.fetchall()}
    for w in ("9.1", "9.3", "9.4"):
        assert rows.get(w, 0) >= 2, f"expected chunks at WBS {w}, got {rows}"
    total = sum(rows.values())
    assert total >= 8, f"expected ~9 sparkling chunks total, got {total}"


def test_sparkling_content_has_real_protocol_numbers(db):
    """WBS 9.3 chunk from morew_sparkling_yeast must contain concrete MoreWine numbers."""
    with db.cursor() as c:
        c.execute(
            "SELECT content FROM diy_knowledge_chunks "
            "WHERE source_doc='morew_sparkling_yeast' AND wbs_code='9.3'"
        )
        contents = " ".join(r["content"] for r in c.fetchall()).lower()
    # Concrete protocol markers from the real MoreWine PDF
    assert "ph>2.9" in contents or "ph > 2.9" in contents, "missing pH>2.9"
    assert "15ppm" in contents or "15 ppm" in contents, "missing FSO2<15ppm"
    assert "5%" in contents, "missing ~5% starter volume"
    assert "cells/ml" in contents, "missing cells/mL density spec"


# ---------- Cellar Brief grounding order ----------

def _card(cards, vessel_id, variety_contains):
    for c in cards:
        if c["vesselId"] == vessel_id and variety_contains.lower() in c["variety"].lower():
            return c
    pytest.fail(f"card not found: {vessel_id} / {variety_contains}")


def _chip_text(c):
    return " || ".join(
        g.get("title", "") if isinstance(g, dict) else str(g)
        for g in c.get("grounding", [])
    ).lower()


def test_tank20_sparkling_grounding_has_sparkling_protocol(brief_cards):
    c = _card(brief_cards, "Tank 20", "Sparkling Chardonnay")
    chips = _chip_text(c)
    assert "sparkling wine protocol" in chips, f"missing sparkling protocol chip: {chips}"
    # yeast method preferred first per new engine order
    assert "yeast" in chips
    # no red-flow contamination
    for bad in ("red wine fermentation", "pump-over", "cap management", "red wine bible"):
        assert bad not in chips, f"red-flow leak: {bad} in {chips}"


def test_white_chardonnay_grounding_has_white_bible(brief_cards):
    # Any still-white Chardonnay: Tank 2 or Tank 3
    matches = [
        c for c in brief_cards
        if c["variety"].strip().lower() == "chardonnay"
    ]
    assert matches, "no still-white Chardonnay card found"
    saw_bible = False
    for c in matches:
        chips = _chip_text(c)
        # no red or sparkling leakage on still whites
        assert "red wine bible" not in chips, f"red leak on white: {chips}"
        assert "sparkling wine protocol" not in chips, f"sparkling leak on white: {chips}"
        if "white wine bible" in chips:
            saw_bible = True
    assert saw_bible, "no White Wine Bible chip on any still-white Chardonnay card"


def test_red_variety_cards_no_sparkling_leakage(brief_cards):
    red_varieties = {"shiraz", "pinot noir", "cabernet sauvignon", "merlot",
                     "grenache", "tempranillo", "syrah"}
    checked = 0
    for c in brief_cards:
        v = c["variety"].strip().lower()
        if v in red_varieties:
            chips = _chip_text(c)
            assert "sparkling wine protocol" not in chips, f"sparkling leak on {v}: {chips}"
            assert "white wine bible" not in chips, f"white leak on {v}: {chips}"
            # should have some red grounding
            assert ("red wine" in chips) or ("pump-over" in chips) or ("cap management" in chips) \
                or ("so₂" in chips) or ("so2" in chips) or ("malolactic" in chips) \
                or ("mlf" in chips) or ("cold soak" in chips), f"no red flow on {v}: {chips}"
            checked += 1
    assert checked >= 3, f"expected multiple red cards, checked {checked}"


# ---------- Regression: journal + sitemap ----------

def test_journal_row_count(db):
    with db.cursor() as c:
        c.execute("SELECT COUNT(*) c FROM cellar_journal")
        n = c.fetchone()["c"]
    assert n >= 305, f"journal rows regressed: {n}"


def test_sitemap_locs():
    r = requests.get(f"{BASE_URL}/api/sitemap.xml", timeout=30)
    assert r.status_code == 200
    assert "xml" in r.headers.get("content-type", "")
    n = r.text.count("<loc>")
    assert n >= 305, f"sitemap regressed: {n} <loc>"


def test_tank20_ghost_still_routes_sparkling(brief_cards):
    c = _card(brief_cards, "Tank 20", "Sparkling Chardonnay")
    gq = c.get("ghostQuestion") or {}
    assert gq.get("category") == "sparkling"
    slug = gq.get("journalSlug", "")
    assert slug.startswith("sparkling-bubbles-"), f"unexpected slug: {slug}"
