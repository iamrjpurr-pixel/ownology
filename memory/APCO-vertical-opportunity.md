# APCO Vertical — Opportunity Doc

**Status**: Marketing wedge live (Feb 2026). Product MVP scoped, not built.
**Owner**: Rich (business), Codex (build)
**Priority**: P1 — wedge unlocks cold-call conversations; Phase-2 MVP earns Vigneron tier.

---

## What is APCO?

The **Australian Packaging Covenant Organisation** is a co-regulatory not-for-profit
that governs branded-packaging sustainability in Australia. Under the National
Environment Protection Measure, APCO membership requirements are now transitioning
from voluntary to **co-regulatory (enforceable) in 2026** — which means the year
we're launching Ownology is the year every serious Australian winery has to file.

## Who has to file

Two channels force wineries into APCO:

1. **Legal** — Turnover > **$100M/yr** → mandatory membership + reporting or referral
   to state EPA.
2. **Commercial (the real driver)** — Retailers **Dan Murphy's, Vintage Cellars,
   Coles Liquor, ALM, Endeavour Group** now require APCO membership as a supplier
   condition. Boutique wineries wanting shelf space are getting sucked in via
   distribution channel pressure — not just legal.

## Reporting cycle

| Milestone | Deadline |
|---|---|
| Reporting period | 1 July – 30 June (Aussie FY) |
| Annual Report submission | **31 March** each year (via APCO Reporting Tool) |
| Action Plan submission | **31 May** each year (built off the Annual Report) |
| Membership fee | Sliding scale by turnover, paid annually |

**Right now (Feb 2026), boutique wineries are staring down the 31 March deadline.**
Two-month window. Perfect timing for a wedge.

## The 7 Criteria (Action Plan structure)

Every Action Plan must commit to actions across these 7 criteria of the Packaging
Sustainability Framework:

1. **Governance & Strategy** — executive-approved sustainability strategy, goals,
   targets, internal + external communication
2. **Design & Procurement** — using the Sustainable Packaging Guidelines (SPGs)
   to review packaging; tracking % of packaging reviewed
3. **Recycled Content** — policy + numeric targets for recycled content across
   primary / secondary / tertiary packaging
4. **Recoverability** — investigating recyclability at end-of-life, identifying
   gaps, joining closed-loop recovery programs
5. **Disposal Labelling** — adding on-pack Australasian Recycling Label (ARL)
   as packaging is refreshed
6. **On-site Waste** — winery waste diversion rate (paper/glass/plastic)
7. **Problematic Materials** — phasing out single-use plastics; litter prevention

**Performance is graded on 5 tiers**:
Getting Started → Good Progress → Advanced → Leading → Beyond Best Practice.

## The 10 SPG Principles (design rubric)

Every packaging component gets scored against these ten principles for the
"Design & Procurement" criterion:

1. Design for Recovery (reusable/recyclable/compostable)
2. Optimise Material Efficiency (reduce weight/volume)
3. Design to Reduce Product Waste (right-sizing)
4. Eliminate Hazardous Materials (PFAS, heavy metals)
5. Use Recycled Materials
6. Use Renewable Materials
7. Design to Minimise Litter
8. Design for Transport Efficiency (dense packing, weight)
9. Provide Consumer Information (ARL labels)
10. Design for Accessibility (easy-open, legible text)

## ARL rules for wine packaging

| Component | Material | ARL classification |
|---|---|---|
| Bottle | Glass | Recyclable |
| Screw cap | Aluminium | Recyclable |
| Foil skirt (screw cap) | Metal | Recyclable |
| Capsule (tin/poly) | Metal or laminate | Recyclable |
| Capsule (PVC) | Plastic | **Contaminant** (in most streams) |
| Natural cork | Cork | **Contaminant** (unless dedicated stream) |
| Synthetic cork | Plastic | **Contaminant** |
| Glass stopper (Vinolok) | Glass | Recyclable |

## Winery-specific pain points

1. **Data collection across suppliers** — bottle weight/colour/glass %, closure,
   label material/adhesive, capsule, cartons, dividers, pallet wrap. Vintage-tagged.
2. **Interpreting SPG + PREP** — not their day job
3. **Formal governance sign-off** — small teams don't have "executive committees"
4. **Report writing in APCO's format** — the PDF layout matters
5. **Supplier chase** — needing weight/composition data from Amcor, O-I, etc.
6. **Ongoing recalibration** — the standards evolve every year

## Consultant cost benchmark

Boutique wineries who outsource APCO compliance pay **$5,000 – $15,000/year**
depending on SKU count. That's the anchor Ownology's Vigneron ($1,056/yr founding,
$1,488/yr retail) has to beat — and it does, by ~4-14x.

## Ownology positioning

**APCO Assistant becomes the flagship feature of The Vigneron.** Rationale:

- The MD-persona buyer (who Rich pitches on `/hi/:slug`) *owns* the APCO burden
- One saved consultant fee pays for the sub 5-14x over
- Gives Vigneron a clear "why not just The Press?" narrative
- Locks the tier at the price point Vintrace can't undercut

## Cold-outreach hook (immediate lift)

Warm-open line for MD + Owner personas on `/hi/:slug`:

> "APCO's 31 March deadline is right around the corner — we've built the
> assistant that drafts the Action Plan from your bottle/closure/label data
> in the format APCO expects. Consultants charge $5-15K/year for it. Want a
> look before the crunch?"

## Product MVP scope (Phase 2 — 2-3 focused days)

Ship when the first Vigneron founder is confirmed. Not before.

**Backend**:
- `apco_packaging_components` table — per-SKU packaging inventory (bottle,
  closure, capsule, label, carton, multipack, pallet wrap) versioned by vintage
- `apco_reports` table — saved draft reports, per reporting year
- New tRPC router `apcoRouter` — CRUD on components, report generator endpoint
- Report generator = 1 Claude call per criterion (7 calls total, ~$0.30 per report)

**Frontend (admin-only for Vignerons)**:
- `/admin/apco/vault` — packaging data entry, one row per SKU
- `/admin/apco/report` — generate + preview + download PDF
- Deadline countdown chip on `/admin` dashboard (31 March / 31 May)

**Data sources**:
- Seed ARL classification table (already have it above)
- Seed 10 SPG Principles scoring rubric
- SPG assessment template (from apco.org.au public docs)
- APCO PDF layout reference (Agnew Wines example already analysed)

**Cost/margin math**:
- ~$0.30 in Claude calls per full report generated
- Vigneron founding at $1,056/yr → gross margin ~99.97% on APCO alone
- Even at Cellar Hand $22/mo, a one-time APCO report at cost still leaves
  99%+ margin

## Post-MVP (Phase 3)

- Supplier data auto-import (parse Amcor/O-I product sheets)
- Multi-year performance-tier progression chart
- APCO Action Plan template library (anonymised best-in-class examples =
  SEO flywheel content on `/apco/templates`)
- ARL badge auto-generator per SKU
- Integration hint for PREP (their paid recyclability tool)

## Source material

- **Agnew Wines 2026 APCO Action Plan** — reference PDF, digested via
  `analyze_file_tool` (see /app/customer-assets uploads for the file)
- **APCO Packaging Sustainability Framework** — apco.org.au/packaging-sustainability-framework
- **10 SPG Principles** — apco.org.au/sustainable-packaging-guidelines
- **National Packaging Targets** — apco.org.au/national-packaging-targets
- **Circular Blueprint's APCO Action Plan Guide** — circularblueprint.com
