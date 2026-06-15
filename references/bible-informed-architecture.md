# Ownology — Bible-Informed Knowledge Architecture
## Design Document — Jun 2026

---

## The Core Idea

The Red Wine Bible (and White Wine Bible) is the **authoritative source of truth** for winemaking knowledge. Everything else — SOPs, Q&A answers, tutor responses — is derived from it.

```
Red Wine Bible (+ White Wine Bible)
        │
        ├──► SOPs (what to do — commercial + DIY)
        │         Grounded in bible chapters
        │         WBS-coded
        │         Published/unpublished per domain
        │
        └──► Home Winemaker Q&A (how and why — colloquial)
                  Colloquial input → normalised → WBS node
                  Bible chunks retrieved (published only)
                  Scale-aware answer (garage, not tank farm)
                  Risk assessment layer
```

---

## Layer 1 — Colloquial Language Normalisation

Home winemakers do not speak in WBS codes. They say:

| What they say | What they mean (WBS) |
|---|---|
| "my bubbles stopped" | D4.2 — Stuck fermentation |
| "it smells like nail polish remover" | D4.3 — VA / ethyl acetate |
| "the cap is getting thick" | D4.1 — Cap management / pump-over |
| "marbles trick" | D4.1 — Headspace management |
| "it tastes sharp / acidic" | D5.1 — TA / acid balance |
| "it's gone cloudy after I racked it" | D6.1 — Protein haze / fining |
| "white powder on the surface" | D4.3 — Film yeast / oxidation |
| "smells like eggs" | D4.3 — H₂S / reductive fault |
| "my hydrometer reads 1.000 but it still tastes sweet" | D4.2 — Residual sugar / dry endpoint |
| "how many campden tablets" | D6.2 — SO₂ / sulphite addition |
| "do I need to add anything" | D4.1 — Nutrient management / YAN |
| "when do I rack" | D5.2 — Racking timing |
| "how long do I leave it" | D4.2 — Fermentation duration |
| "can I drink it yet" | D7.1 — Maturation / readiness |

### Implementation

A **colloquial normalisation prompt** is prepended to the LLM call:

```
You are a winemaking knowledge assistant. The user is a home winemaker 
working at garage scale (10–100L). They may use informal language.

Before answering, internally map their question to the correct winemaking 
concept using this vocabulary:
- "bubbles stopped" → stuck fermentation
- "smells like eggs" → hydrogen sulphide (H₂S)
- "nail polish remover" → ethyl acetate / volatile acidity
- "campden tablets" → potassium metabisulphite / SO₂
- "marbles trick" → headspace management
- "cap" → pomace cap / pump-over
[... full table ...]

Then answer using plain English appropriate for a home winemaker.
Scale all quantities to their batch size if stated.
```

This is a **static prompt injection** — no separate LLM call, no extra latency.

---

## Layer 2 — Bible Informs SOPs

Each SOP in `sop_library` should carry:
- `bible_chapters` — array of chapter refs from the bible that ground this SOP
- `bible_quote` — optional key passage (1–2 sentences) that is the scientific basis

This creates a **traceable chain of authority**:

```
SOP: Red Wine Fermentation
  └── Grounded in: Bible Ch.3 (Yeast), Ch.4 (Fermentation Kinetics), Ch.6 (Nutrient Management)
  └── Key passage: "YAN below 150ppm is the primary cause of stuck fermentation in red wines..."
```

When the tutor answers a commercial question, it can cite both the SOP *and* the bible chapter that backs it.

When the tutor answers a home winemaker question, it retrieves the bible chunks directly (no SOP intermediary needed — the bible is the source).

---

## Layer 3 — Scale-Aware Answer Generation

The LLM must translate commercial-scale bible content to home-winemaker scale.

**Scale translation rules injected into system prompt:**
- If bible says "per hectolitre (hL)" → convert to per litre, then multiply by user's batch size
- If bible says "pump-over" → translate to "punch-down or gentle stir"
- If bible says "laboratory analysis" → translate to "hydrometer / refractometer reading"
- If bible says "inoculation rate in g/hL" → convert to grams for a 23L carboy
- If bible says "tank" → translate to "carboy, bucket, or demijohn"

**Batch size awareness:**
If the user states their batch size ("I have 20 litres"), all quantities are scaled.
If not stated, default to 23L (standard wine kit / carboy size) and state the assumption.

---

## Layer 4 — Q&A Flow (Home Winemaker)

```
User question (colloquial)
        │
        ▼
[Colloquial normalisation — static prompt]
        │
        ▼
[WBS domain classification — LLM, cheap]
        │
        ▼
[Published bible chunk retrieval — keyword + topic tags]
        │
        ▼
[Scale-aware answer generation — LLM with bible context]
        │
        ▼
Answer + chapter citations + risk badge (if chemical addition)
```

---

## What Is Not In Scope (Yet)

- Structured curriculum / lessons / module progression
- Assessments or learning pathways
- White Wine Bible (pipeline ready, ingest when uploaded)
- Domain 1 (Vineyard) and Domain 9 (Maintenance) — schema ready, content parked
- Ghost questions (1,000 WBS-mapped questions) — UI layer only

---

## Immediate Build Priorities

1. **Colloquial normalisation table** — expand the existing keyword map into a full 60-term glossary covering all common home winemaker phrases, mapped to WBS concepts
2. **Bible-to-SOP cross-reference** — add `bible_chapters` column to `sop_library`, backfill the 7 DIY SOPs with their source chapters
3. **Scale-aware system prompt** — inject scale translation rules into the `home_winemaker` tutor path
4. **Batch size extraction** — parse user's stated batch size from question and pass to LLM for quantity scaling
