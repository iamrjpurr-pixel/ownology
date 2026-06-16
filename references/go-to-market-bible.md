# Ownology — Go-To-Market Bible
**Version:** 1.0  
**Created:** June 2026  
**Status:** Living document — update as strategy evolves

> This document is a permanent strategic reference. It must never be lost, rebuilt from scratch, or reconstructed from conversation history. Every future session should read this file before making any product, pricing, or marketing decisions.

---

## 1. The Product Vision

Ownology is a **cellar intelligence platform** — an AI knowledge assistant for winemakers. Its core value proposition is **cognitive load relief**: giving winemakers instant, document-grounded answers to their toughest cellar questions, from a mobile phone, in seconds, during harvest.

The tool is not a complex application. It is a **notepad, pen and paper equivalent** — simple, uncomplicated, and immediately useful. It must remain so as it scales.

---

## 2. The Knowledge Architecture — The Bible Triangle

Ownology's AI is grounded in three knowledge sources that form a triangle. SOPs are the **output** of the triangle, not a side of it.

```
        FOUNDER'S BIBLES
        (Side 1 — Your voice)
              /\
             /  \
            /    \
           / SOPs \
          /   &    \
         / AI Output\
        /____________\
  AOC CURRICULUM    VINE ET AL.
  (Side 2 — Structure) (Side 3 — Science)
```

| Side | Source | Role |
|---|---|---|
| **1** | Founder's personal winery bibles, outlines, authored content | The doctrine — your voice, your philosophy, your process |
| **2** | AOC Advanced Certificate of Viticulture, Winemaking & Oenology | The vocational learning structure — how the industry teaches it |
| **3** | *Winemaking: From Grape Growing to Marketplace* — Vine, Harkness, Browning & Wagner (Chapman & Hall Enology Library, 427pp) | The scientific/industry reference — the academic anchor |

**SOPs sit inside the triangle.** They are the crystallised operational outputs derived from all three sides.

### Side 2 — Internal Note
CSU (Charles Sturt University) Bachelor of Wine Science subject codes (WSC series) are used internally as the curriculum backbone for Side 2. They are **not surfaced to users** anywhere in the UI. The AOC Advanced Certificate is the public-facing curriculum reference. CSU is the quiet structural scaffold the AI uses to organise knowledge.

### Future Input Layer — Viticulture Data (Year 2+)
Tiers 3–5 will eventually ingest viticulture data (vineyard inputs, canopy management, soil analysis, seasonal data). This is a 2-year build. When it arrives, it becomes a **fourth input layer** feeding into Side 1 and enriching outputs — not a fourth circle in the triangle. The science layer (Side 3, Vine et al. Ch.2 Viticulture) already covers the theory; the data ingestion layer will connect real vineyard data to cellar decisions.

---

## 3. The Vine et al. Reference Index

**Full title:** *Winemaking: From Grape Growing to Marketplace*  
**Authors:** Richard P. Vine, Ellen M. Harkness, Theresa Browning, Cheri Wagner  
**Publisher:** Chapman & Hall Enology Library  
**Pages:** 427  

### Chapter Map

| Chapter | Title | Pages | Ownology Category |
|---|---|---|---|
| 1 | History of Wine in America | 1–23 | Context |
| 2 | Viticulture (Grape Growing) | 24–72 | Viticulture (future) |
| 3 | Wine Microbiology | 73–94 | Fermentation Science |
| 4 | Enology (Winemaking) | 95–147 | Core Winemaking |
| 5 | Wine Classification | 148–152 | Wine Classification |
| 6 | Winery Design | 153–168 | Winery Operations |
| 7 | Requirements, Restrictions & Regulations | 169–175 | Compliance |
| 8 | Getting Started | 176–210 | Equipment & Materials |
| 9 | White Table Wines | 211–235 | White Wine Production |
| 10 | Red Table Wines | 236–254 | Red Wine Production |
| 11 | Blush Table Wines | 255–260 | Rosé Production |
| 12 | Fruit & Berry Wines | 261–269 | Alternative Wines |
| 13 | Marketing | 270–304 | Marketing |
| App. A | Sources | 305–308 | Reference |
| App. B | Analytical Procedures | 309–361 | Laboratory & Analytics |
| App. C | Charts and Tables | 362–413 | Reference |
| App. D | Glossary | 414–424 | Reference |
| — | Bibliography | 425–426 | Reference |
| — | Index | 427 | Reference |

### Key Analytical Procedures (Appendix B)
Microscopy (309), Gram Stain (312), Malolactic Fermentation by Paper Chromatography (314), Bottle Sterility (315), Winery Sanitation Swab Test (317), pH Meter (319), Brix by Hydrometer (320), Brix by Refractometer (321), Alcohol by Ebulliometer (336), Extract by Nomograph (338), Total Acidity (338), Volatile Acidity by Cash Still (342), Free Sulfur Dioxide (344), Total Sulfur Dioxide (347), Sensory Evaluation (348).

---

## 4. Tier Architecture

### Naming Convention
Tier names follow the winery career ladder and the winemaking process. Every winemaker immediately understands where they sit.

| Tier | Name | Process Reference | Status |
|---|---|---|---|
| **0** | **Free Run** | First juice — no pressure, pure and free | **Live forever** |
| **1** | **The Press** | Where real extraction begins — pressure applied, more gained | **Launch tier** |
| **2** | **Cellar Hand** | Working the cellar full time | Coming Soon |
| **3** | **Winemaker** | The craft practitioner | Coming Soon |
| **4** | **Head Winemaker** | Running the program | Coming Soon |
| **5** | **Estate** | The full operation | Hidden / custom |

### Free Run (Tier 0) — Permanent Free Tier
**Purpose:** Addiction hook. Brand ambassador. Conversion engine.

| Feature | Detail |
|---|---|
| AI questions | 3 per day |
| SOPs | 5 read-only |
| Knowledge categories | 1 (Fermentation) |
| SOP creation | None |
| Bible Triangle | No direct access |
| Users | 1 |

**The 3 questions/day mechanic is deliberate.** Winemakers will hit the limit mid-harvest at 11pm and immediately feel the pain of not having more. That is the conversion moment.

### The Press (Tier 1) — Launch Paid Tier
**Audience at launch:** Home winemakers. Boutique winery owners who are also home winemakers.  
**Price:** ~$9–12/month or $89/year (TBC)

| Feature | Detail |
|---|---|
| AI questions | 10 per day |
| SOPs | All home winemaking SOPs (white, red, rosé, fruit) |
| Knowledge categories | Home winemaking categories |
| SOP creation | 1 custom SOP (taste the builder) |
| Bible Triangle | Read access — Vine et al. chapter references |
| Users | 1 |

### Tiers 2–4 (Coming Soon — Visible but Locked)
These tiers are **visible in the UI with feature previews** but locked. They serve two purposes:
1. Show boutique winery professionals what's coming
2. Capture "Notify me when available" clicks — building the commercial pipeline automatically

Features to preview (blurred/locked):
- Barrel Aging SOP Library
- Fermentation Decision Engine
- Team Knowledge Sharing
- Custom SOP Builder (full)
- Multi-user access
- Viticulture integration (Year 2+)

### Tier 5 — Estate (Hidden)
Not shown publicly. Custom pricing. Multi-site, white label, API access.

---

## 5. Go-To-Market Strategy — Phase 1

### The Trojan Horse
Launch publicly with **Home Winemaker (The Press)** only. Boutique winery owners *are* home winemakers — they started there, they think there, they still make wine at home. We are not excluding them; we are meeting them where they live.

### The Glimpse Mechanic
Locked tiers are visible but tantalising — not just greyed-out buttons. Show:
- Feature names they cannot access yet
- Blurred preview of a commercial-tier SOP
- "Notify me when available" button

Every boutique winery owner who clicks "Notify me" on Cellar Hand tier is a **pre-qualified commercial lead**.

### The Conversion Moments
1. **Harvest panic** — 3 questions used, fermentation stuck at 2am
2. **SOP wall** — found a category they need but cannot open it
3. **Team moment** — want to share an answer with a colleague
4. **Tribal knowledge fear** — realise they need to capture what they know before they forget it

### The Commercial Launch (Phase 2)
When Cellar Hand is ready, do not announce broadly. Email the waitlist first:  
*"You asked to be notified. It's ready."*  
That list is warm, pre-qualified, and already paying.

---

## 6. The Science Commitment

The Vine et al. scientific depth is **woven into every AI answer from day one** — even at Free Run and The Press. A home winemaker asking "why is my red wine too astringent?" gets an answer that references phenols, tannin extraction, and maceration time. We do not dumb it down.

This is how we capture professionals early. A professional winemaker who gets an answer that correctly cites phenolic extraction, YAN management, and malolactic fermentation science immediately knows this is not a toy.

The message to professionals: *"The science is already inside. The vineyard data layer is coming — and when it does, your whole operation connects."*

---

## 7. AI Gap-Fill Layer

For content the Bible Triangle does not natively cover, the AI uses live internet search:
- Commercial-tier winery operations (large-scale, industrial)
- Regulatory updates (ATF, FSANZ, Wine Australia, state ABC regulations)
- New product releases (commercial yeast strains, fining agents, equipment)
- Emerging research (climate adaptation, new varietals)

This layer is invisible to users — it simply enriches answers when the triangle alone is insufficient.

---

## 8. Brand Principles

- **Ownology** — the platform name. Never abbreviated.
- **Free Run** — permanent free tier. Never renamed.
- **The Press** — first paid tier. Never renamed.
- The tier naming ladder (Cellar Hand → Winemaker → Head Winemaker → Estate) follows the winery career path. It is aspirational as well as functional.
- The tool must remain **simple and uncomplicated** — a notepad, pen and paper equivalent. Complexity is the enemy.
- Every AI answer should feel like it came from a knowledgeable colleague, not a search engine.

---

## 9. Legal & IP Notes

- Terms of Service and Privacy Policy must be in place to create contractual obligations around methodology and data
- Document creation dates — project history, git commits, and session records serve as timestamped evidence of prior art
- Copyright notice in footer: © 2026 Ownology
- The Bible Triangle architecture, tier naming convention, and addiction mechanic design are proprietary

---

## 10. Future Work Backlog

| Item | Priority | Timeline |
|---|---|---|
| Cellar Hand tier build-out | High | 6–12 months |
| Winemaker tier build-out | Medium | 12–18 months |
| Viticulture data ingestion layer | Medium | 24 months |
| Head Winemaker tier | Low | 18–24 months |
| Estate / white label / API | Low | 24+ months |
| AOC curriculum deep integration | Medium | 12 months |
| Vine et al. full chapter content seeding | High | Ongoing |
| Commercial winery SOP library | High | 6–12 months |
| Team / multi-user features | Medium | 12 months |
| Mobile app (iOS/Android) | Medium | 18 months |

---

*This document is the Go-To-Market Bible. It is a living reference. Update it as strategy evolves. Never lose it.*
