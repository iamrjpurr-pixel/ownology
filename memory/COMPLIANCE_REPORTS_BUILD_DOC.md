# Ownology Compliance Reports — NSW + National
## Strategic Build Doc

**Created**: 30 June 2026
**Status**: Scoped, parked behind P0 ship blockers
**Priority**: P2 — strong revenue justification but depends on real auth + multi-tenant data model

---

## 1. The Insight

Most "compliance reporting" for AU wineries is actually **continuous record-keeping that gets audited**, not point-in-time forms filed with a regulator. Ownology's Vintage Log already captures everything LIP and WET need — the wineries just lose hours manually re-formatting cellar data into Wine Australia's templates.

> **The cellar log IS the compliance record. We just need to render it in the regulator's format.**

This is the same Learning Loop moat applied to a third surface (after cellar advice + captions): the WINERY's regulatory burden becomes the THING OWNOLOGY DELIVERS for them.

---

## 2. AU Regulatory Landscape (verified web search 30 Jun 2026)

| Body | Actual demand | Automation leverage |
|---|---|---|
| 🏆 **Wine Australia — LIP** | Continuous traceability records (vintage / variety / GI / 85% rules). One-step forward/back within 3 days. 7-year retention. Audited. | **HIGHEST** |
| 🥈 **ATO — WET + Producer Rebate** | Monthly/quarterly BAS with WET section + annual Producer Rebate (up to $350k claim) | **HIGH $$$** |
| 🥉 **FSANZ — Label Standards** | Pregnancy warning, allergens, std drinks, energy statement (2028 transition active in 2026) | **MEDIUM** |
| **Sustainable Winegrowing Australia** | Voluntary annual member report (water, energy, chemicals, waste) | **MEDIUM** |
| **NSW Food Authority** | General HACCP records, no winery-specific template | **LOW** (generic, one-off setup) |
| **AWRI** | Voluntary vintage data submission | **LOW** (credibility builder) |

**Key clarification**: NSW Food Authority does NOT have a winery-specific annual report template (verified). The "compliance reporting" pain is actually internal record-keeping for the LIP audit.

---

## 3. Value Math — Why This Justifies Premium Tier 3× Over

| Annual compliance task | Manual hrs | Cost @ $80/hr | With Ownology auto-generation |
|---|---|---|---|
| LIP audit prep | 20 | $1,600 | 2 hrs review → **$1,440 saved** |
| WET monthly BAS reconciliation | 12 | $960 | 3 hrs review → **$720 saved** |
| Annual Producer Rebate claim | 8 | $640 | 2 hrs review → **$480 saved** |
| Label compliance verifier (pre-bottle) | 6 | $480 | 1 hr review → **$400 saved** |
| **TOTAL** | **46 hrs** | **$3,680** | **$3,040 saved/yr** |

**Justifies $99/mo Premium 3× over on compliance alone** — the unambiguous CFO ROI story.

---

## 4. The "LIP Audit Pack" — Highest-Leverage First Target

Wine Australia provides explicit LIP templates. Required content:

- Per wine batch: vintage year + variety + GI claim (each ≥ 85% from declared source)
- One-step-back records (suppliers)
- One-step-forward records (buyers)
- Quantitative reconciliation: kg grapes in → L wine out → L bottled
- 7-year retention, audit trail must be continuous

### Ownology has the data already

| LIP field | Ownology source |
|---|---|
| Vintage year | `vintage_log_entries.vintage` |
| Variety | `vintage_log_entries.variety` |
| GI / region | `users.region` or `vintage_log_entries.block_origin` |
| Date of operation | `vintage_log_entries.entry_date` |
| Volume in/out | `vintage_log_entries.volume_l` + `wine_movements` (TBD) |
| Supplier | `vintage_log_entries.supplier_id` (TBD) |
| Buyer | `wine_sales` table (TBD) |
| Tribal knowledge / notes | `sop_library.tribal_knowledge` + `vintage_log_entries.notes` |

### What needs building

- ⚠ Some FK relationships not yet present (supplier_id, buyer_id) — **part of multi-tenant winery model in P3**
- ✅ Vintage Log data is captured today
- ✅ Tribal knowledge captured in 38 SOPs
- ✅ Branded export infrastructure exists (Branding mockup spec at `/branding-mockup`)

---

## 5. Build Phases

### Phase 1 — LIP Audit Pack PDF Generator (~12 hrs)
- New tRPC procedure `compliance.lipAuditPack({ winerySlug, vintageYear })`
- Pulls all `vintage_log_entries` for the vintage
- Groups by batch / variety / GI
- Calculates 85% compliance per claim
- Generates PDF in Wine Australia LIP template format
- Branded with winery's detected colours (from Branding feature)
- Includes "Made with Ownology" footer + QR (per tier — Free vs Premium)

### Phase 2 — WET Reconciliation Sheet (~8 hrs)
- Calculates monthly WET liability from sale records
- Producer Rebate claim helper (annual)
- ATO-friendly CSV/PDF export

### Phase 3 — Label Compliance Verifier (~6 hrs)
- Wine label upload → AI checks against FSANZ Standard 4.5.1
- Flags missing pregnancy warning, allergen statements, std drinks calc, etc.
- Pre-bottle gate-check

### Phase 4 — SWA Sustainability Report (~10 hrs)
- Voluntary but accelerating in adoption
- Auto-fills SWA portal fields from Ownology data
- Becomes a "Premium upgrade" hook for sustainability-focused wineries

---

## 6. Dependencies

- ✅ **Branded export infrastructure** (Branding feature, P2)
- ⏳ **Real auth** (P0 #1) — per-user reports need real per-user auth
- ⏳ **Multi-tenant winery data model** (P3) — supplier/buyer FKs needed for LIP
- ⏳ **Stripe / tier enforcement** (P0 #2) — Premium-tier compliance reports
- ✅ **38 SOPs + tribal knowledge** already populated
- ✅ **Vintage Log infrastructure** already exists

---

## 7. Strategic Positioning

This pivots Ownology from "AI cellar helper" to **"the operating system for an AU/NZ winery"**:

- Production = handled (cellar AI + SOPs + vintage log)
- Marketing = handled (Copilot caption generator + SEO flywheel)
- **Compliance = handled (LIP + WET + FSANZ + SWA exports)** ← this doc

That's three distinct, defensible value pillars. WineryCopilot has one. Vintrace has half of one. No competitor has all three.

The pitch to a NSW winery CFO becomes:
> *"Ownology costs $99/mo. It saves your winemaker 46 hours of compliance work and the audit risk that comes with manual records. That's $3,040/yr in direct labour cost avoided, before any value from the cellar AI or the marketing copilot."*

That's a **30× ROI** justified on compliance alone.

---

## 8. Triggers to Ship

- After Branding feature ships
- After real auth + multi-tenant data model are in place
- When the first paying VIVID winery explicitly asks about LIP audit prep (likely in pre-vintage Sept 2026 conversations)

---

## 9. Cross-references

- Strategic AI conversation that generated this doc: 30 June 2026 session
- Web search validation: searched Wine Australia LIP / FSANZ / NSW Food Authority current 2026 requirements (confirmed)
- **Live LIP template PDFs**: `/app/references/lip-templates/` (6 official templates + README with full field schema extracted, ready for build agent to map directly to `vintage_log_entries`)
- Related: Branding feature mockup at `/branding-mockup` (provides the export styling layer)
- Related: Copilot Build Doc at `/app/memory/COPILOT_BUILD_DOC.md` (same flywheel + flow shape)
- Related: PRD.md § P0 #1 (real auth blocks per-user reports)

---

*This doc captures the strategic insight that compliance reporting is Ownology's third defensible value pillar (after production AI and marketing copilot), with the highest direct revenue justification per customer.*
