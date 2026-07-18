# Ownology Curriculum Spine (OCS) — Build Plan

**Date**: 18 Jul 2026
**Owner**: Rich
**Status**: Approved. Execution starts next session.

## Strategic Reframe (this session's key insight)

- **AOC modules give STRUCTURE**, not content — Rich's paid AOC content is generic; useful only as a curriculum layout template
- **MoreWine + AWRI give DEPTH** — already ingested but currently served verbatim (copyright exposure)
- **Adelaide 068885G gives AUTHORITY** — the CRICOS-verified 4-year study plan is the spine to anchor the whole product
- **Ownology synthesises** — Claude generates original Lesson Cards using all three sources as private grounding, publishes ONLY Ownology-original expression

## Copyright Architecture — Four Legally Distinct Layers

```
Layer 1 · OWNOLOGY ORIGINAL         (only surface served to end users)
Layer 2 · PRIVATE GROUNDING          (Claude reads, users never see raw)
Layer 3 · BIBLIOGRAPHIC REFERENCE   (author + title + chapter + link only)
Layer 4 · FAIR DEALING QUOTES       (<50 words attributed, sparingly)
```

## Scouting Data Already Landed (this session)

**Phase A + A.5 + A.6 complete — 27 university units scouted, benchmarked to CSU 4410WS01**

- File: `/app/references/education/scouting-pass-2026-07-17-v2.json`
- 27 units: CSU 10 · Adelaide 12 · Lincoln 4 · Otago 1
- 145 learning outcomes · 301 key concepts · 100 prescribed-text mappings · 192 owned-asset bridges
- Coverage: 100% CSU wine-specific · 100% Adelaide OENOLOGY · 100% Lincoln WINE
- **Gap**: 4 viticulture units still to add (3 Adelaide VITICULT + 1 CSU VIT212)
- Spend: ~$1.04 in Perplexity

**Rich's paid PDFs staged at** `/app/references/`:
- `viticulture-modules/` — 9 AOC modules (1.1-1.9)
- `oenology-modules/` — 11 AOC modules (1.10, 2.1-2.10)

## Execution Order — Next Session

### Step 1 · Copyright Remediation (P0 blocker for shipping OCS)
1. Add `licence` column to `diy_knowledge_chunks`, `sop_library` (values: `ownology_original` | `private_grounding` | `bibliographic_reference` | `fair_dealing`)
2. Flip all MoreWine + AWRI chunks to `private_grounding` (default deny at retrieval)
3. Patch `server/routers/tutor.ts` line 404 area: add **paraphrase-guard** to system prompt — Claude must reformulate every private-grounding chunk in Owen's voice, never quote verbatim, always cite source
4. Add per-response "copyright audit" log — flag any n-gram overlap ≥15 words between response and private-grounding sources
5. Regression-test `/ask` + `/for-home-winemakers` + `/free-run` runtime

### Step 2 · Add 4 viticulture units to scout (~15 min · ~$0.06)
- VITICULT 2500WT / 3021WT / 3044WT (Adelaide, via calendar.adelaide.edu.au)
- VIT212 (CSU, via handbook.csu.edu.au/subject/2025/VIT212)
- Merge into scouting-pass-2026-07-17-v2.json → v3

### Step 3 · Draft the 30-Lesson Spine YAML (I draft, Rich reviews)
- **Level 1 Foundations** (6): Global viticulture · Vine biology · Climate/soils · Wine chemistry · Fermentation fundamentals · Winemaker's toolkit
- **Level 2 Grape to Ferment** (8): Variety selection · Vineyard establishment · Canopy/yield · Ripeness/harvest · Crushing/must · Yeast selection · Fermentation mgmt · MLF
- **Level 3 Cellar Craft** (8): Red production · White production · Sparkling & fortified · SO₂ · Fining · Stabilisation · Barrel program · Blending
- **Level 4 Finishing** (8): Sensory eval · Fault ID · Filtration/bottling · Packaging · Storage/ageing · Compliance · Sustainability · Vintage debrief
- Each spine entry: title, level, WBS domain, target reading time, source-inputs-to-blend list

### Step 4 · Claude Synthesis Pass (~$5 one-off)
- For each of 30 lessons, Claude reads: relevant MoreWine chunks + AOC module + AWRI fact sheets + Adelaide/CSU LOs + textbook citations
- Outputs Ownology-original Lesson Card in Fraunces/Lato voice
- Explicit instruction: NEVER reproduce source text; always paraphrase + cite

### Step 5 · Schema for OCS
```
curriculum_lessons (id, slug, level, wbs_domain, title, aim, body_md, reading_min, published, published_at)
curriculum_lesson_sources (lesson_id, source_type, source_key, chapter_ref, licence)
```

### Step 6 · Surface — /knowledge/curriculum
- Curriculum tree (Level 1-4 × WBS domain)
- Lesson Card component (Aim / Body / Cited In strip)
- Progress ticks (localStorage anon, DB signed-in)
- Basic / Advanced toggle
- Cross-references to vintage log ("Your Tank 4 is at this stage")

### Step 7 · Retag existing corpus
- `sop_library` — add `layer`, retag using bridge-frequency ranking
- `ghost_questions` — same
- Existing `/knowledge`, `/for-home-winemakers/knowledge` — link to OCS

## Cost & Time Budget

| Task | Cost | Time |
|---|---|---|
| Copyright remediation | $0 | 90 min |
| 4 uni-viti units to scout | $0.06 | 15 min |
| 30-lesson spine draft | $0 | 20 min |
| Claude synthesis pass | ~$5 | 15 min run + review |
| Schema + surface build | $0 | 3 hours |
| Retagging | $0 | 60 min |
| **TOTAL** | **~$5.06** | **~1 focused session** |

## What We're NOT Doing (documented refusals)

- ❌ Ingest AOC PDFs as chunks served to users (Rich paid for personal license, not redistribution rights)
- ❌ Ingest StuDocu content (student-uploaded, no lecturer permission)
- ❌ Reproduce Boulton/Iland/Ribéreau/Jackson text (paywalled textbooks — cite only)
- ❌ Reproduce AWRI fact sheet content verbatim (public but copyrighted)
- ❌ Reproduce university LO text verbatim (paraphrase + attribute)

## Success Criteria for Phase B Finish

- ✅ Zero MoreWine/AWRI/AOC text served verbatim to end users
- ✅ 30 Ownology-original Lesson Cards published
- ✅ Every card carries safe "Cited in" strip (bibliographic references only)
- ✅ Basic/Advanced toggle working
- ✅ Copyright-audit log clean on 50 random tutor.ask samples

---

*This file supersedes any earlier plan captured elsewhere in memory for the OCS build.*
