"""
ingest-morewine-pdfs.py — Feb 2026.

Extracts text from all downloaded MoreWine PDFs in /app/data/morewine/ and
publishes them as `diy_knowledge_chunks` rows, WBS-tagged per source doc.
Every chunk becomes citable grounding in the Cellar Brief + Ask Ownology.

Also purges the mislabelled `morew_white_outline` chunks — those were
LLM-synthesised, not real MoreWine content.

Idempotent: any prior chunks with source_doc starting `morew_sparkling_` or
matching the 13 more-manual source_docs are dropped before re-insert.

Run: python3 scripts/ingest-morewine-pdfs.py
     python3 scripts/ingest-morewine-pdfs.py --dry-run
"""
import os
import re
import sys
import time
import pypdf
import pymysql
from urllib.parse import urlparse

DRY = "--dry-run" in sys.argv

# Parse DATABASE_URL from backend env
def load_db_url():
    path = "/app/.env"
    if not os.path.exists(path):
        raise SystemExit("No /app/.env found")
    for line in open(path):
        if line.startswith("DATABASE_URL="):
            return line.strip().split("=", 1)[1].strip('"')
    raise SystemExit("DATABASE_URL not found in .env")

def connect():
    url = load_db_url()
    p = urlparse(url)
    return pymysql.connect(
        host=p.hostname, port=p.port or 3306,
        user=p.username, password=p.password,
        database=p.path.lstrip("/"),
        charset="utf8mb4", autocommit=False,
    )

# ── Source doc mapping ────────────────────────────────────────────────────
# Each source_doc gets:
#   title:        human-readable manual name (used as chapter_title prefix)
#   default_wbs:  the primary WBS code the whole doc grounds
#   secondary:    additional WBS codes to also tag chunks with
SOURCES = {
    # Sparkling
    "morew_sparkling_yeast": {
        "title": "Sparkling Wine Secondary Fermentation Protocol — Prise de Mousse Yeast",
        "default_wbs": "9.3",
        "secondary": ["9.4", "9.1"],
    },
    "morew_sparkling_proelif": {
        "title": "Sparkling Wine Secondary Fermentation Protocol — ProElif",
        "default_wbs": "9.3",
        "secondary": ["9.4", "9.1"],
    },
    # MoreManuals
    "morew_yeast_pairing":   { "title": "Yeast & Grape Pairing Guide",             "default_wbs": "4.2", "secondary": ["4.1"] },
    "morew_yeast_hydration": { "title": "Wine Yeast Rehydration Guide",            "default_wbs": "4.2", "secondary": [] },
    "morew_oxygen_ferment":  { "title": "Macro-Oxygenation & Fermentation (Shea Comfort)", "default_wbs": "4.1", "secondary": ["4.3"] },
    "morew_mlf_paper":       { "title": "Malolactic Bacteria Information Paper",  "default_wbs": "4.8", "secondary": [] },
    "morew_inert_gas":       { "title": "Using Inert Gas in Winemaking",           "default_wbs": "5.4", "secondary": ["5.3"] },
    "morew_so2_mgmt":        { "title": "Guide to SO₂ Management",                 "default_wbs": "3.3", "secondary": ["5.2"] },
    "morew_so2_protocol":    { "title": "SO₂ Management Protocols",                "default_wbs": "5.2", "secondary": ["3.3"] },
    "morew_sanitation":      { "title": "Sanitization in Winemaking",              "default_wbs": "SAN.1", "secondary": [] },
    "morew_oak_info":        { "title": "Oak Information Manual",                  "default_wbs": "5.1", "secondary": [] },
    "morew_oak_barrel_care": { "title": "Oak Barrel Care Guide",                   "default_wbs": "5.4", "secondary": ["5.1"] },
    "morew_ph_meter":        { "title": "Use & Care of a pH Meter",                "default_wbs": "8.1", "secondary": [] },
    "morew_bench_trials":    { "title": "How to Perform Bench Trials",             "default_wbs": "8.1", "secondary": [] },
    "morew_fining_agents":   { "title": "Benchmarking of Fining Agents",           "default_wbs": "5.3", "secondary": ["6.1"] },
}

# ── PDF extraction ────────────────────────────────────────────────────────
def extract_pages(pdf_path):
    """Returns [(page_num, text), …] with cleaned text."""
    reader = pypdf.PdfReader(pdf_path)
    pages = []
    for i, page in enumerate(reader.pages, start=1):
        try:
            text = page.extract_text() or ""
        except Exception:
            text = ""
        text = re.sub(r"\n{3,}", "\n\n", text)
        text = re.sub(r"[ \t]+", " ", text)
        text = text.strip()
        if text:
            pages.append((i, text))
    return pages

def find_section_heading(text):
    """Heuristic: first line that looks like a heading (all-caps ≥3 words,
    or numbered like '1. ' / 'Section 3', or Title Case ≥3 words)."""
    for line in text.split("\n")[:6]:
        stripped = line.strip()
        if len(stripped) < 4 or len(stripped) > 100: continue
        # Numbered
        if re.match(r"^\d+(\.\d+)?[.:\s]", stripped): return stripped
        if re.match(r"^Section\s+\d+", stripped, re.I): return stripped
        # ALL CAPS
        letters = re.sub(r"[^A-Za-z]", "", stripped)
        if len(letters) >= 3 and letters == letters.upper() and len(stripped.split()) >= 2:
            return stripped
        # Title Case with colons
        if ":" in stripped and stripped[0].isupper():
            return stripped
    return None

def chunk_pages(pages, target=1500):
    """Combines adjacent pages into ~1500-char chunks. Each chunk gets a
    chapter_ref (page range) and chapter_title (first found heading)."""
    chunks = []
    buf = []
    buf_pages = []
    for pnum, text in pages:
        buf.append(text)
        buf_pages.append(pnum)
        joined = "\n\n".join(buf)
        if len(joined) >= target:
            heading = find_section_heading(joined) or f"Page {buf_pages[0]}"
            chunks.append({
                "chapter_ref": f"p{buf_pages[0]}" + (f"-{buf_pages[-1]}" if len(buf_pages) > 1 else ""),
                "chapter_title": heading[:200],
                "content": joined,
            })
            buf, buf_pages = [], []
    if buf:
        joined = "\n\n".join(buf)
        heading = find_section_heading(joined) or f"Page {buf_pages[0]}"
        chunks.append({
            "chapter_ref": f"p{buf_pages[0]}" + (f"-{buf_pages[-1]}" if len(buf_pages) > 1 else ""),
            "chapter_title": heading[:200],
            "content": joined,
        })
    return chunks

# ── Main ─────────────────────────────────────────────────────────────────
def main():
    conn = connect()
    cur = conn.cursor()

    # Drop the mislabelled synthesised chunks + any prior morewine re-ingests
    prior_sources = list(SOURCES.keys()) + ["morew_white_outline"]
    fmt = ",".join(["%s"] * len(prior_sources))
    cur.execute(f"SELECT source_doc, COUNT(*) FROM diy_knowledge_chunks WHERE source_doc IN ({fmt}) GROUP BY source_doc", prior_sources)
    print("Existing rows to remove:")
    for row in cur.fetchall(): print(f"  {row[0]}: {row[1]}")
    if not DRY:
        cur.execute(f"DELETE FROM diy_knowledge_chunks WHERE source_doc IN ({fmt})", prior_sources)
        print(f"  → deleted {cur.rowcount} rows\n")
        conn.commit()

    now = int(time.time() * 1000)
    total_inserted = 0
    for src, meta in SOURCES.items():
        path = f"/app/data/morewine/{src}.pdf"
        if not os.path.exists(path):
            print(f"  ✗ {src}: file not found at {path}")
            continue
        pages = extract_pages(path)
        if not pages:
            print(f"  ✗ {src}: no extractable text (may be scanned image PDF)")
            continue
        chunks = chunk_pages(pages, target=1500)
        print(f"  ✓ {src}: {len(pages)} pages → {len(chunks)} chunks")
        if DRY:
            for c in chunks[:1]:
                print(f"      [{c['chapter_ref']}] {c['chapter_title']}")
                print(f"      {c['content'][:180]}…")
            continue
        for c in chunks:
            content = f"{meta['title']}\n\n{c['chapter_title']}\n\n{c['content']}"[:8000]
            cur.execute(
                """INSERT INTO diy_knowledge_chunks
                   (source_doc, chapter_ref, chapter_title, content,
                    wbs_code, published, created_at)
                   VALUES (%s, %s, %s, %s, %s, 1, %s)""",
                (src, c["chapter_ref"], c["chapter_title"], content, meta["default_wbs"], now)
            )
            total_inserted += 1
            # Secondary WBS tags = additional rows tagged with the same content
            # so grounding lookup finds this manual under multiple codes.
            for wbs in meta.get("secondary", []):
                cur.execute(
                    """INSERT INTO diy_knowledge_chunks
                       (source_doc, chapter_ref, chapter_title, content,
                        wbs_code, published, created_at)
                       VALUES (%s, %s, %s, %s, %s, 1, %s)""",
                    (src, c["chapter_ref"], c["chapter_title"], content, wbs, now)
                )
                total_inserted += 1
    if not DRY:
        conn.commit()
    print(f"\n{'DRY-RUN' if DRY else 'INSERTED'}: {total_inserted} chunk rows")

    # Summary
    cur.execute("SELECT source_doc, COUNT(*) FROM diy_knowledge_chunks WHERE source_doc LIKE 'morew_%' GROUP BY source_doc ORDER BY source_doc")
    print("\nFinal morew_* chunk counts:")
    for row in cur.fetchall(): print(f"  {row[0]}: {row[1]}")
    cur.close(); conn.close()

if __name__ == "__main__":
    main()
