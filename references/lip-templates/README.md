# Wine Australia LIP Templates — Reference Library

Downloaded 30 June 2026 from <https://www.wineaustralia.com/labelling/label-integrity-program/lip-templates>.
These are the **current, official** templates that NSW (and all Australian) wineries
must use to satisfy Label Integrity Program record-keeping obligations.

Saved here so the build agent has the exact field structure when greenlit to
ship the LIP Audit Pack PDF generator (see `/app/memory/COMPLIANCE_REPORTS_BUILD_DOC.md`).

## Files

| File | Title | Use |
|---|---|---|
| `01_Grower_Guide_to_LIP.pdf` | Grower Guide | Reference for grower-side obligations (one-step forward) |
| `02_Packager_Guide_to_LIP.pdf` | Packager's Guide | Reference for packager obligations |
| **`03_Wine_Goods_Supply_Statement_Template.pdf`** | **Supply Statement** | **Mandatory form when supplying wine goods. PRIMARY TARGET — every batch sold needs this generated.** |
| **`04_Record_Keeping_Template.pdf`** | **Record Keeping Template** | **The audit trail — 4 sub-templates Ownology must auto-generate (see schema below).** |
| `05_Winery_Record_Keeping_Tutorial.pdf` | Recording instructions tutorial | Reference for what each field means |
| `06_Label_Opinion_Request_Form.pdf` | Label opinion form | Pre-bottle label compliance check (Phase 3 target) |

## Schema extracted from Record Keeping Template (file 04)

### Section A · Wine Goods Supply Statement

```
- Date, Supplier Name, ABN, Address, Phone, Contact
- Customer Name, ABN, Address, Phone, Contact
- Reference Name of Wine Goods
- Tonnes of [kind]  (Fresh Grapes / Grape Juice / Wine)
- VINTAGE, VARIETY, GEOGRAPHICAL INDICATION
- Name, Title, Signed, Date
```

### Section B · Wine Goods Receival Register

```
Per receival row:
- Vintage, Date, Type of Goods, Variety, GI
- Vineyard/Grower Name, Amount, Seq/Docket #
- Analysis: Baume, pH, TA, SO2, Other
```

### Section C · Wine Processing Record

```
Per processing event:
- Date, Variety, Region/GI, Amount
- Vineyard/Grower details, Seq/Docket #
- From Vessel:    Date, Vessel, Start Vol, End Vol
- To Vessel:      Operation, Vessel, Start Vol, End Vol
- Wine Code:      Gain/Loss, FSO2, TSO2, pH, TA, Temp, Be, Other
- Additions/Comments/Notes
```

### Section D · Individual Receival Docket

```
- Sequence / Docket #
- Mandatory: Date, Vintage, Variety, Region, Amount, Supplier details
- Analysis: Baume/Alc, pH, TA, SO2, Other
```

## Mapping to Ownology's existing data model

| LIP field | Ownology source |
|---|---|
| Date | `vintage_log_entries.entry_date` |
| Vintage | `vintage_log_entries.vintage` |
| Variety | `vintage_log_entries.variety` |
| GI / Region | `users.region` + future `vintage_log_entries.gi_claim` |
| Amount / Volume | `vintage_log_entries.volume_l` |
| Be / pH / TA / SO2 / Temp | `vintage_log_entries.brix`, `.ph`, `.ta_g_l`, `.so2_ppm`, `.temp_c` |
| Vessel (From/To) | `vintage_log_entries.tank_name` |
| Operation | `vintage_log_entries.operation_type` |
| Supplier details | **MISSING** — needs new `suppliers` table + FK on grape receival entries |
| Customer details | **MISSING** — needs new `customers` / `wine_sales` table |
| Seq / Docket # | **MISSING** — needs auto-incrementing docket per receival |
| ABN | **MISSING** — needs `users.abn` or `winery_profile.abn` field |
| Notes / Additions | `vintage_log_entries.notes` + tribal knowledge from related SOPs |

## What's needed before the LIP Audit Pack PDF generator can ship

1. **Supplier / Customer FK relationships** — multi-tenant winery model (P3 dependency)
2. **ABN field** on winery profile (5 min add)
3. **Auto-docket numbering** for receival entries (~30 min)
4. **PDF generation library** — recommend `pdf-lib` or `puppeteer` for HTML→PDF
5. **Branding feature shipped** — for the winery logo + colours on the export (mockup at `/branding-mockup`)

## Phase 1 build estimate

| Task | Effort |
|---|---|
| Add 3 missing fields (`abn`, `gi_claim`, `docket_number`) + migration | 1 hr |
| `compliance.lipAuditPack({ winerySlug, vintageYear })` tRPC procedure | 4 hrs |
| PDF template renderer matching Section A-D layouts | 4 hrs |
| Branded header + footer (Ownology attribution per tier) | 1 hr |
| 85%-rule compliance verifier per claim | 1 hr |
| Sign-off page + admin preview | 1 hr |
| **Total** | **~12 hrs** |

---

*Pre-fetched 30 June 2026 by the build agent during P0 scope work, on Roy's
request. These PDFs match the live Wine Australia versions as of fetch date —
re-validate against current URLs before shipping production exports.*
