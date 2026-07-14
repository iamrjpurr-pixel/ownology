# Ownology Changelog

Growing log of shipped work, most recent first. PRD.md holds the static
problem statement + long-form architecture; ROADMAP.md holds P0/P1/P2
backlog. This file just records what actually shipped, and when.

### Auto-Rewrite on Ingest — SMS draft warm from birth (Feb 2026)

Rich's ask: when a new contact gets added (via Perplexity, URL Quick-Add, or manual form), auto-fire the AI rewrite so the SMS draft is already warm — no separate "✨ Rewrite with AI" button click needed. Everything a new contact needs is generated in one atomic save.

**Backend** (`server/routers/outreach.ts::create`):
- Added optional `autoRewrite: z.boolean().default(true)` input flag.
- After the DB insert, if `autoRewrite=true` AND research signals exist (winery + at least one of painPoint / hookText / notes) AND the LLM service is configured, the mutation runs two extra steps inline:
  1. **Region inference** — calls `regionForWinery(winery)` against the static wineryRegions table; if hit, UPDATEs the row's `region` column. This gives the AI rewrite regional context to work with.
  2. **Claude rewrite** — calls the shared `claudeRewriteOne()` helper (same one used by single + bulk) with the just-inferred region. Saves result to `smsDraftOverride`.
- Silent-fail on Claude errors: the contact is already committed, so we don't roll back — the operator can hit "Rewrite with AI" manually if needed. Error surfaced in the response as `autoRewriteError`.
- Response now returns `{ ok, slug, autoRewrote, autoRewriteError }` so the UI knows what happened.
- Added `import { regionForWinery } from "../wineryRegions.js"`.

**Frontend** (`client/src/pages/AdminContacts.tsx`):
- `createMutation.mutateAsync` now captures the `result` and inspects `autoRewrote` / `autoRewriteError`.
- New "auto-rewrite toast" component below the Add form:
  - Green tint + "✨ SMS draft warm from birth — {FirstName} · {Winery}" on success.
  - Orange tint + "Auto-rewrite skipped: {reason}. Hit 'Rewrite with AI' on the card to try again." on Claude failure.
  - Auto-dismisses after 4s.
- Zero UX friction: the operator just clicks Save, waits ~2s extra, and the new contact appears in the list with a natural SMS already loaded in the draft box.

**Verified end-to-end via curl**:
```
POST outreach.create {firstName: "AutoTest", winery: "Wirra Wirra", painPoint: "Balancing bottle-shop distribution with cellar-door growth in McLaren Vale", hookText: "just crushed the last block of grenache", hookTier: "recent_signal"}
→ { ok: true, slug: "autotest-wirra-wirra", autoRewrote: true, autoRewriteError: null }
```
DB post-insert:
- region: `mclaren-vale` ✓ (auto-inferred from winery lookup)
- sms_draft_override: *"gday — saw you just wrapped grenache crush. built a cellar-intelligence tool that helps winemakers in mclaren vale (and elsewhere) track stock + plan bottling runs without spreadsheet hell. worth 90 sec if useful: … — Jamie"* ✓ (regional context + hook acknowledged, no parroting)

Cost: ~$0.005 extra per ingest for Claude call. Adds ~2s to the save latency (barely noticeable after the 15-30s Perplexity deep research the operator just watched).

[shipped: auto-rewrite-on-ingest, auto-region-inference-on-ingest]



### Region-aware cohort bulk — AI rewrite + TSV copy (Feb 2026)

Rich asked to scope bulk rewrite to a single region cohort (McLaren Vale / Hunter / Barossa) so a whole batch shares a story arc, AND clarified how "bulk send" actually works today — the existing `Copy N SMS drafts` button dumps a TSV to clipboard for Messages/iOS paste. No SMS gateway. Both flows now region-scoped.

**Backend** (`server/routers/outreach.ts`):
- Added optional `region: string` input to `bulkRewriteSmsAI` (Zod max 40 chars).
- SQL where-clause narrows to `region = <kebab>` when set: `(status IN ('cold','lukewarm')) AND sms_sent_at IS NULL AND region = ?`.
- Same Claude prompt + skip-existing behaviour; the only change is the query filter.
- Verified: `region: "hunter", tone: "regional", limit: 2` returned `{ rewritten: 1, skippedExisting: 1, failed: 0 }`. Allanna De Iuliis rewrite: *"gday allanna — hunter's had a wild run with the wet. built a cellar-intel tool that helps small makers track stock and plan releases without spreadsheet hell..."* — regional context captured cleanly.

**Frontend — `/admin/contacts/outbound-queue`** (`AdminOutboundQueue.tsx`):
- Region filter chips REWORKED to use the real DB `region` column (kebab-case) instead of winery-name substring. Chip values now match `AuRegion` enum (`mclaren-vale`, `hunter`, `barossa`, `yarra-valley`, `adelaide-hills`, `coonawarra`, `orange`, `tasmania`, `margaret-river`, `mornington-peninsula`, `clare`, `beechworth`, `grampians`).
- Each chip shows a count badge (e.g. `Hunter (14) · Barossa (16)`). Empty-cohort chips auto-hide.
- **Bulk AI rewrite strip is now context-aware**: when a region cohort is selected, the amber "HUNTER COHORT" (etc.) badge appears next to the title, and the copy switches to: *"Rewrite the 14-contact hunter cohort with a shared story arc. Regional tone gives them a common voice."* The `region` param is passed through to the backend automatically.
- Confirm dialog also names the scope: *"Rewrite SMS drafts for the hunter cohort (14 contacts) via Claude (regional tone)?"* — no surprise-billing.
- **NEW: "Copy cohort to Messages" strip** (teal accent) below the bulk-rewrite strip. Button label is dynamic: `Copy 8 SMSes as TSV` for the current region filter (only counts SMS-ready contacts with mobile numbers). TSV format is `Name\tMobile\tSMS draft` — paste straight into Messages on Mac/iOS to spawn a thread per row. Uses each contact's `smsDraftOverride` (the AI-rewritten version if present) or falls back to the auto-generated template.
- Buttons disable + dim when cohort is empty.

**End-to-end flow for a region-scoped BD session**:
1. Open `/admin/contacts/outbound-queue`
2. Tap `Hunter (14)` filter chip
3. Tap "Warm tone" (or Regional) on the Bulk AI rewrite strip → confirm → 14 drafts spun in ~30s
4. Tap `Copy 8 SMSes as TSV` → paste into Messages → one thread per Hunter maker
5. Tap `Mark all N as sent` back on `/admin/contacts` (or per-row on the queue) once sent

**Verified live via screenshot**: Hunter chip shows count 14, region badge visible in bulk-rewrite header, cohort copy button reads `Copy 8 SMSes as TSV`, all disable states correct when filter reduces to zero.

[shipped: region-cohort-bulk-rewrite, cohort-tsv-copy, region-chip-counts]



### Theme picker auto-close + Esc + outside-click (Feb 2026)

Rich reported this again — the floating bottom-left theme picker was NOT closing after a theme was selected. Root cause: `onClick={() => set(t.id)}` in `App.tsx::ThemePicker` was persisting `set(...)` without ever calling `setOpen(false)`. Every selection required a manual click on the ×.

**Fix** (`client/src/App.tsx::ThemePicker`):
- Selection now closes the panel (`onClick` calls `set(t.id)` then `setOpen(false)`).
- Added `useEffect` with `mousedown` + `keydown` listeners for outside-click and Escape-to-close (standard picker UX pattern, matches `components/ThemeToggle.tsx` which already had this).
- Attached `rootRef` to the picker root `<div>` so outside-click detection works.
- Added `useRef` to the App.tsx import.

**Verified live**: click theme option → panel closes AND theme applies in one gesture. Escape closes. Outside click closes. All three flows green in Playwright test.

[shipped: theme-picker-auto-close, theme-picker-esc, theme-picker-outside-click]


### Bulk AI Rewrite + Region Auto-Fill (Feb 2026)

Two BD-velocity unblockers shipped in one batch.

**A) Region auto-fill** (backfill scripts `/app/scripts/backfill-region-*.mts`, 3 rounds):
- Round 1 — regex against painPoint + notes text → 43 matched (Barossa/Tasmania/Adelaide Hills/Grampians/Hunter/Clare/Coonawarra…).
- Round 2 — winery-name lookup via existing `wineryRegions.ts` → 25 more matched.
- Round 3 — paren-stripped winery lookup + Hunter/Orange/Canberra fallback markers → 16 more matched.
- **Total: 84 contacts backfilled** (68 previously tagged + 84 new = 152 with region; 64 still null, mostly boutique/spirits labels).
- Overall distribution now: McLaren Vale 20 · Hunter 18 · Barossa 16 · Yarra Valley 12 · Adelaide Hills 11 · Coonawarra 11 · Orange 10 · Tasmania 10 · Margaret River 9 · Mornington Peninsula 9 · Clare 8, etc.
- Unlocks: region filter chips on Outbound Queue now cover 2× as many contacts; "regional" AI rewrites have accurate context to work with.

**B) Bulk AI Rewrite** (`outreach.bulkRewriteSmsAI` + Outbound Queue strip):
- New `ownerProcedure` iterates the outbound-queue set (cold/lukewarm, smsSentAt null), calls Claude via the same `claudeRewriteOne` helper that powers the single-contact rewrite, saves each result to `smsDraftOverride`.
- Refactor: extracted `claudeRewriteOne()` helper at the top of `outreach.ts` so single + bulk share one system prompt / model config / anti-parrot rules. Zero duplication.
- Respects hand-crafted overrides: skips any contact with existing `smsDraftOverride` unless `force=true`. Failures on individual rows don't abort the batch — collected in `failures[]` for retry.
- 3-tone chooser in UI (Warm / Brief / Regional) matches the single-contact rewrite.
- Serial (not parallel) — 1.5-2s per contact, ~6-7 min for a full 220-contact queue. Gentle on the LLM proxy.
- Cost: ~$0.005 per contact = ~$1.10 for a full queue rewrite.
- Verified: 3-contact test batch returned `{ rewritten: 2, skippedExisting: 1, failed: 0 }` — the 2 fresh rewrites are Andrew Pike + one other; Bernice/Matteo (with existing overrides) correctly skipped.

**Frontend strip on `/admin/contacts/outbound-queue`**:
- New "✨ Bulk AI rewrite" panel below the region filter row.
- Copy explains the deal ("Pre-warm every unsent SMS via Claude. Skips hand-crafted overrides. ~$0.005 per contact").
- Warm / Brief / Regional buttons + confirmation prompt.
- Result summary badge after run: "✓ N rewritten · M skipped · X failed".

**Deferred (from Rich's 4-item value-check)**:
- Save AI Draft History (3-version rollback) — LOW ROI, re-spinning on Claude is $0.01, not revenue-critical.
- View-Event Timeline (per-view timestamps) — requires new `outreach_view_events` table + backfill; no immediate BD ROI when viewCount + hotAlert already cover the "who's circling" question.

[shipped: bulk-rewrite-sms-ai, region-backfill-3-rounds, claude-helper-refactor]



### SMS draft "acknowledge, don't quote" — AI rewrite + Research Context box (Feb 2026)

Rich flagged the SMS drafts as unusable: Perplexity's `hookText` was getting spliced verbatim into every SMS ("g'day Andrew (Pikes Wines) — juggling growing demand with keeping it all feeling family-run is the real trick") which parrots research back and reads like an AI wrote it. Every send needed a manual rewrite → killing BD velocity.

**Fix — new `outreach.rewriteSmsAI` mutation** (`server/routers/outreach.ts`):
- Uses Claude Sonnet 4.5 via Emergent LLM Key (Built-in Forge shim).
- Feeds Claude the RAW research (winery, region, event, painPoint, hookText, notes, persona) with a strict prompt: acknowledge three signals (A: winery business, B: winemaker as a person, C: their region + current challenges) WITHOUT directly quoting.
- Explicit anti-parroting rule: "If the research says 'juggling growing demand with keeping it all feeling family-run', DO NOT write 'juggling growing demand' back to them. Instead acknowledge the underlying tension."
- Three tones: `warm` (default, mate-to-mate), `brief` (< 220 chars), `regional` (leads with regional context).
- Returns `{ sms, signalsAcknowledged: ["winery" | "winemaker" | "region"], research }` — audit-transparent (operator sees exactly what Claude worked with).
- Persists to `smsDraftOverride` so downstream Copy SMS / mailto: / /hi/:slug flows pick it up automatically.

**Frontend — Research Context box** (`SmsDraftEditor` in `AdminContacts.tsx`):
- New collapsible "Research context" panel above every SMS draft box.
- **Signal chips** in the header at all times: `✓ WINERY  ✓ WINEMAKER  ○ REGION  ✓ HOOK` — operator sees at a glance which signals the AI has to work with, no need to open the panel.
- Expanded panel shows every research field (Winery, Region, Role, Event/Where, Hook + tier, Business summary, Notes) as a labelled 2-col grid.
- **✨ Rewrite with AI** primary button + Brief / Regional side buttons on the SMS DRAFT toolbar.
- Post-rewrite the SMS box updates in-place with the new draft, "✨ Rewritten & saved" confirmation appears, plus "Acknowledged: ✓ winery ✓ region" chip so operator knows what Claude actually pulled off.
- Char counter + 1/2/3-SMS estimator preserved from existing editor.

**Before/After on Andrew Pike (Pikes Wines)**:
- OLD: "g'day Andrew (Pikes Wines) — juggling growing demand with keeping it all feeling family-run is the real trick. i've been building a cellar AI grounded in your own vintage logs — 90 sec look: … — Jamie"
- NEW (warm): "gday Andrew — scaling a Clare Valley family label without losing that hands-on feel is a real trick. built a cellar-intelligence tool that takes the admin load off winemakers so you can stay in the vineyards. worth 90 sec if useful … — Jamie"
- NEW (regional): "gday Andrew — clare's had a cracker run but scaling a family label without losing the feel is a real trick. built something for winemakers who want cellar intelligence without the faff. worth 90 sec if useful: … — Jamie"

Note: even though `region` was null in the DB for Andrew, Claude correctly inferred "Clare Valley" from the painPoint text — the model synthesises, doesn't just template-fill.

**Verified live end-to-end**: TS compiles clean, lint clean, endpoint returns valid JSON for all 3 tones on real contact, UI screenshot shows signal chips + audit panel + rewrite buttons all rendered. Draft persisted to DB via `smsDraftOverride`.

[shipped: sms-rewrite-ai, research-context-box, signal-chips]



### 🔥 Auto Hot Alert — Resend email fires on view #3 (Feb 2026)

Extended `outreach.markViewed` to fire a second, higher-urgency Resend alert email the moment a prospect crosses 3+ total views on their /hi/&lt;slug&gt; page. Idempotent — the "hot" email fires exactly once per contact, no matter how many times they re-visit after that.

**New schema column** (`drizzle/schema.ts` + live ALTER on Railway MySQL): `outreach_contacts.hot_alert_sent_at BIGINT NULL`.

**`markViewed` mutation** (`server/routers/outreach.ts`):
- Reads current `viewCount` + `hotAlertSentAt` before the update.
- Computes `newViewCount = prev + 1`.
- Fires the hot alert iff `newViewCount >= 3 AND hotAlertSentAt IS NULL`. Same `UPDATE` also stamps `hot_alert_sent_at = now` so the check returns false on future views.
- Response payload now returns `{ ok, viewCount, hotAlertFired }` (useful for debugging + potential frontend confetti later).

**Hot-alert email body** — distinct from the first-view alert:
- Subject: `🔥 {FirstName} {LastName} is circling — view #{N} — {Winery}`
- Body: urgency framing ("A prospect on view 3+ is almost always mid-decision"), mobile number, ready-to-copy follow-up SMS, hook text (if present), links to `/admin/contacts/engagement` + the specific admin card.

**Backfill** (`scripts/backfill-hot-alert-sent-at.mjs`): stamped `hot_alert_sent_at = first_viewed_at` on 7 pre-existing contacts already at viewCount ≥ 3 (Sally, Jane, Nathan, Lou, Bryan, Simon, Matteo) so the feature doesn't retro-fire noisy alerts on their next visit.

**Engagement page**:
- New `🔥 Alerted` KPI showing count of hot-alert-fired contacts (currently 2 sent + alerted = 2).
- Every row in the Hot bucket now shows a red "🔥 alerted Nd ago" chip in the engagement timeline.

**Verified end-to-end** via `scripts/test_hot_alert.mjs`:
```
view 1: {"viewCount":1, "hotAlertFired":false}
view 2: {"viewCount":2, "hotAlertFired":false}
view 3: {"viewCount":3, "hotAlertFired":true}  ← 🔥 email sent
view 4: {"viewCount":4, "hotAlertFired":false} ← idempotent (already alerted)
```

Resend email delivery is best-effort (silent on quota/network errors — same pattern as the first-view alert). Requires `OPERATOR_ALERT_EMAIL` + `RESEND_API_KEY` env vars; auto-no-ops in dev when either is missing.

[shipped: auto-hot-alert, hot-alert-sent-at-column, hot-alert-backfill]



### Contact engagement analytics view — `/admin/contacts/engagement` (Feb 2026)

Rich asked for a "contact-me-back" landing analytics view to close the loop after the Outbound Queue tells you *who to touch next*. This new page tells you *who to touch again* based on real engagement signals (viewCount / firstViewedAt / ctaClickedAt / repliedAt / demoBookedAt).

**New backend procedure** (`server/routers/outreach.ts`):
- `outreach.engagementAnalytics` (`ownerProcedure`) — returns aggregate funnel totals (sent / viewed / re-opened / clicked / replied / booked) computed on SENT contacts only (honest denominator, doesn't inflate rates with test-page visits), plus per-contact rows bucketed by follow-up priority. Also returns `generatedAt` for cache-freshness display.
- `outreach.markFollowedUp` (`ownerProcedure`) — bumps `smsSentAt` to now so the "Ghosts" bucket clears out after operator sends a second SMS/email.

**Six follow-up buckets** (top = strike now, bottom = celebrate):
- **🔥 Hot** — viewed 2+ times, no reply, no book → obsessive re-read = ready to talk
- **✳ Clicked, no book** — tapped the CTA but didn't book → nudge with direct SMS
- **👀 Viewed, no click** — opened but bounced off CTA → try a second angle
- **💬 Replied** — reply in hand, no booking → keep it warm
- **✓ Booked** — demo on the calendar (surface for confirmation cadence)
- **👻 Ghosted** — sent 3+ days ago, never opened → SMS may not have landed

**Frontend** (`client/src/pages/AdminEngagement.tsx`, ~320 LOC):
- KPI strip: Sent / Viewed (with open rate %) / Re-opened / Clicked CTA / Replied / Booked with rates between each stage
- Collapsible buckets, "Hot" auto-expanded on load
- Every row: bucket-specific pre-written follow-up SMS + email templates (context-aware — the Hot template says "noticed you had another look", Ghosted says "first SMS may not have landed", etc.), Copy SMS button, Draft email mailto:, Mark followed up, Preview ↗ to /hi/<slug>
- Row footer shows engagement timeline: "📤 sent 14d ago · 👀 opened 14d ago · 69× total · ✳ CTA 2d ago"

**Route wiring**: `/admin/contacts/engagement` added to App.tsx (gated by default-deny wall). Nav pills added to `AdminContacts` header (Pipeline / Outbound queue / Engagement) and back-link in `AdminOutboundQueue`.

**Verified live**: engagement endpoint returns clean data with honest funnel math (Sent=2 → Viewed=2 = 100% open rate — no inflation from test visits). Sally Rainbows (69 views) + Jane Tyrrells (3 views) both land in the Hot bucket as expected. Copy SMS + Mark followed up + email drafts all wire through.

[shipped: engagement-analytics-view, follow-up-templates]



### Audit fix — Owen positioning + outbound queue + region column (Jul 2026)

Rich called out three unshipped promises from earlier this session. All three shipped in one batch:

1. **Owen blurb — MoreWine/Wine Bibles purged from public copy** (5 files). New voice: "read the finest wine-science books ever published, cross-referenced with AWRI's technical library — cited on every answer. Coached by an advanced-certificate oenologist." Files updated: Home.tsx (×2), Guide.tsx, Roadmap.tsx, cellarJournalRouter.ts (LinkedIn social template). Backend RAG source identifiers deliberately unchanged (those are internal chunk labels, not marketing copy). Public-copy grep count now zero.

2. **Outbound queue view** — `/admin/contacts/outbound-queue` page + `outreach.outboundQueue` + `outreach.markSent` procedures. Sequences contacts by score = (hook tier × 10) + channel availability + IG bonus. Row shows: score badge, name, tier, channel chips, Copy SMS + Draft email side-by-side + Mark sent. Top 5 in the queue currently all score 36-37 (Tier-2 hook + both channels + personal IG). Region filter chips top of page.

3. **Region column** — `outreach_contacts.region` VARCHAR(40) added via ALTER TABLE. 79 contacts tagged via static wineryRegions lookup: 18 mclaren-vale, 8 yarra-valley, 8 coonawarra, 7 mornington-peninsula, 6 barossa/beechworth each, plus tail regions. 148 wineries still unknown (not in lookup table) — future LLM classification pass will finish this.

[shipped: owen-positioning-fix, outbound-queue-view, region-column-backfill]


### transcriptEnrich UI wired + Wine Australia directory identified (Jul 2026)

Following the transcriptEnrich backend from the previous entry, wired the full frontend:

- Extended `outreach.mergeFields` to accept `painPoint`, `hookTier`/`hookText`/`hookSourceUrl` (updated as a unit), and `appendNotes`. Discipline preserved: hand-typed fields never clobbered.
- New `TranscriptEnrichPanel` inside `AdminContacts` — collapsible textarea + source-URL field per contact card, wired to `outreach.transcriptEnrich`. Returns get rendered as:
  - Summary (one-click "Append to notes")
  - Refined pain-point (one-click "Overwrite pain-point")
  - 5 hook candidates (per-line "Use as hook" — sets hookText/hookTier="quoted_voice"/hookSourceUrl in one merge call)
  - 5 blog pull-quotes (per-line "Copy" to clipboard)
  - Philosophy tags (visual chips — search-facet groundwork)
- New `EnrichRow` helper component (top of AdminContacts.tsx).
- Verified end-to-end on Chester Osborn's transcript: 5 hooks, 5 pull-quotes, 8 philosophy tags including `sense-of-place` — a tag that also appears on Stephen Pannell, proving the CRM search-facet cohort concept works.

Also identified a strategic prospect source: `https://www.australianwine.com/experience/our-makers` — the Wine Australia trade body's directory of ~180 named Australian winemakers with individual profile URLs. This is the shortlist for a future bulk-ingest flow (see ROADMAP: `bulkIngestDirectory` proposal).

[shipped: transcript-enrichment-ui]


### transcriptEnrich — turn a podcast/YouTube transcript into 4 CRM+blog artefacts (Jul 2026)

Rich pasted the Stephen Pannell (SC Pannell Wines, McLaren Vale) YouTube interview transcript and asked what we can do with it beyond an SMS hook. Answer shipped: a new `outreach.transcriptEnrich` procedure that takes `{ transcriptText, sourceUrl, contactFirstName, contactWinery }` and returns FIVE structured artefacts in one Claude call via forge:

1. **`summary`** — 120-160 word third-person CRM notes paragraph capturing story, philosophy, and distinctive lines.
2. **`hookCandidates[]`** — 3-5 Tier-2 "quoted_voice" SMS/email opener lines, Australian idiom, lower-case, cite-able against the transcript.
3. **`painPointRefined`** — one sentence, evidence-backed, replaces the generic CRM string.
4. **`blogQuotes[]`** — 3-5 verbatim pull-quotes suitable for a long-form Cellar Journal post.
5. **`philosophyTags[]`** — kebab-case CRM search facets ("sense-of-place", "grenache-focus", "forest-vineyard", "no-acid-addition", etc.).

Discipline: fabrication forbidden. Every quote must appear near-verbatim in the transcript. Candidates only — never auto-merges. Rich reviews and hand-picks what to save.

Demonstrated on Stephen Pannell's transcript. Sample output:
- Refined pain: "Juggling a grenache-led, 85% self-sufficient operation across McLaren Vale and the Adelaide Hills while shifting Chameleia from vineyard management to forest management…"
- Sample hook: "read what you said about wine tasting like it comes from somewhere — that sense of place line really lands"
- Sample blog quote: "I've moved away from managing a vineyard to managing a forest."

Backend only for now — Rich can call it via the tRPC panel or a follow-up UI wire-up (small collapsible textarea on each contact card) is the natural next step.

[shipped: transcript-enrichment]


### Contact-add — multi-person cascade, Draft email, Preview post link (Jul 2026)

Three connected upgrades to the /admin/contacts flow, all triggered by Rich pasting the Ministry of Clouds URL:

1. **Multi-person static extraction** — Rich pointed out that Julian@ministryofclouds.com.au was on the same page as Bernice, but the old extractor picked ONE person (winemaker/founder) and dropped the rest. `parseFromUrl` now returns an `otherPeople[]` array (up to 4 extras), each with `firstName / lastName / email / mobileAu / role`. Backend cross-matches every extra against `outreach_contacts` by (winery LOWER equality + firstName / lastName / first-3-chars similarity) and sets `matchedSlug` when an existing card is found.

2. **`mergeFields` mutation** — new ownerProcedure that patches an existing contact with additional channels (email, mobile, personal IG, role, sourceUrl). Discipline: never overwrites hand-typed fields (`mobileAu` only fills when the current cell is empty); channel data (email, IG-personal, role, source URL) is APPENDED to `notes` using the recognised `Email:` / `Role:` / `Source:` labels that `extractChannels()` already parses — so the existing UI chips light up automatically.

3. **Frontend "Also found on this page" panel** — appears under the URL quick-add form whenever `otherPeople.length > 0`. Each row shows name + role + email + mobile, plus a one-click button:
   - "Update <name>'s card" (amber) when `matchedSlug` is set — fires `mergeFields` immediately.
   - "Add as new contact" when unmatched — pre-populates the Add form with the person's data and scrolls to it.

4. **Draft email button** (companion to Copy SMS) — new `emailDraft()` helper mirrors `smsDraft()` with a longer body suited to email. `buildMailto()` opens the operator's default mail client via `mailto:` with subject + body pre-filled. Same 3-tier discipline (hookText → painPoint → honest fallback). Only rendered when we have an email on the contact (parsed from notes by `extractChannels()`). Deliberately does NOT auto-send — Rich keeps signature/tracking/threading in Gmail or Apple Mail.

5. **"Preview post ↗"** — relabelled the `hookSourceUrl` link on the contact card from the diagnostic "verify source" to the action-y "Preview post". Already had `target="_blank"` — opens the cited IG post in a new tab so Rich can double-check the post is still up before sending.

Verified end-to-end on Rich's Ministry of Clouds URL:
- Primary contact: Bernice Ong / bernice@ministryofclouds.com.au / 0417 087 023 / hook = "saw you wrap up vintage saying 2025 was a grind and the toughest year yet in 13 years"
- otherPeople[0]: Julian Forwood / Co-founder / julian@ministryofclouds.com.au / +61417864615 / matched to his existing card. Merge fires successfully — email + role + source URL appended to notes, existing mobile preserved.

[shipped: contact-add-multi-person-cascade]


### Contact-add SMS auto-draft · IG mining wired into parseFromUrl (Jul 2026)

Rich smoke-tested the /admin/contacts URL-add flow against the Ministry of Clouds winery profile at `https://www.ministryofclouds.com.au/bernice-ong-and-julian-forwood-are-the-duo-behind-ministry-of-clouds/` — called the URL "gold" but the auto-drafted SMS was unimpressive because parseFromUrl was falling back to the generic Tier-3 template ("we crossed paths the other day…").

Root cause: parseFromUrl scraped the URL, extracted up to 3 IG handles as data points but never READ those accounts. So the resulting draft had no hookText → smsDraft's Tier-1 branch was starved → Tier-3 generic fired.

Fix — new backend helper + prompt design:

- New `mineInstagramHooks()` in `server/routers/outreach.ts` (top-level, before the router). Given firstName/lastName/winery/region/handles, calls Perplexity Sonar with a prompt that:
  1. First DISCOVERS missing personal-founder handles by searching IG (e.g. "@berniceong___" for Bernice Ong). Winery brand accounts are treated as tertiary.
  2. Reads the last ~90 days of posts across the discovered handles.
  3. Prioritises PAIN-POINT signals over celebration signals (weather rants, freight cost, tank shortage, MLF headaches, DBS/APCO paperwork).
  4. Returns hookTier + hookText + hookSourceUrl + a sharper painPoint. Null-over-fabrication remains the discipline.
- parseFromUrl now runs `mineInstagramHooks` as a follow-up when the URL scrape yielded ≥1 IG handle. Best-effort — enrichment failure never breaks the outer flow.
- Frontend: `AdminContacts` form state now carries hookTier/hookText/hookSourceUrl. Adds an amber-tinted preview panel inside the add form so Rich can SEE, EDIT, or CLEAR the auto-drafted hook before saving.

Verified end-to-end against the Ministry of Clouds URL:

BEFORE (Tier-3 generic):
> G'day Bernice — we crossed paths the other day, sending this to Ministry of Clouds Wines too. I've since built a cellar AI grounded in your own vintage logs — figured you might find it useful.

AFTER (Tier-1 recent_signal, sourced from real IG post DYDj_x9SLes):
> g'day Bernice (Ministry of Clouds Wines) — saw your post about juggling vintage, the kids and the dog while chasing that perfect 2025 balance. i've been building a cellar AI grounded in your own vintage logs — 90 sec look: …

Sharpened painPoint also lands in the CRM: "Publicly shares how exhausting it is to juggle 2025 vintage work with family life and limited time while still chasing precise stylistic balance in the wines." Compared to the previous "small McLaren Vale winery with an established dual-founder team" fluff — night and day.

Cost: one extra ~15-30s Perplexity Sonar call per URL that yields IG handles. Skipped when the scrape yields zero handles.

[shipped: contact-add-ig-mining]


### Pricing drift between /waitlist and /pricing · single source of truth extracted (Jul 2026)

Rich spotted the /waitlist page quoting stale annual prices while /pricing had the EOFY promo running. Digging in:

- `/pricing` used `ANNUAL_MULTIPLIER = 9` (EOFY promo — 3 months free) with all four tiers Free Run · Cellar Hand · Press · Vigneron.
- `/waitlist` hard-coded `$440/yr` and `$880/yr` (× 10) and was missing The Cellar Hand entirely — a prospect recommended Cellar Hand via the TierChooser had no way to sign up for it from the waitlist.
- Additional pre-existing bug: the `/waitlist` tier card template rendered `{tier.annual}/yr` on top of an already-formatted `"$440/yr"` string, so annual line was `$44/mo · $440/yr/yr` (double suffix).

Fix — extracted all tier + credit-pack data to a single source of truth:

- New file `client/src/data/pricing.ts` — exports `TIERS`, `PAID_TIERS`, `CREDIT_PACKS`, `EOFY_ACTIVE`, `ANNUAL_MULTIPLIER`, `monthlyLabel()`, `annualLabel()`, `type TierId`.
- `Pricing.tsx` — removed 131 lines of duplicate `TIERS` + `CREDIT_PACKS` constants; now imports from `data/pricing`. Behaviour identical.
- `Waitlist.tsx` — replaced the 2-tier hardcoded array with a `PAID_TIERS.map(...)` projection. Now renders 3 cards (Cellar Hand · Press · Vigneron), with The Press pre-selected (matches the "MOST POPULAR" badge on `/pricing`). Fixed the `/yr/yr` template bug. Backend already accepts all 3 tier IDs — no server change needed.
- Verified visually on preview: /waitlist now shows `$22/mo · $198/yr`, `$44/mo · $396/yr`, `$88/mo · $792/yr` — perfectly matching `/pricing`. Old strings `$440/yr` and `$880/yr` no longer exist anywhere on the page.

Rule from now on: any page that quotes a subscription price MUST import from `client/src/data/pricing.ts`. Never redeclare a monthly/annual number locally.

Follow-up (not blocking): `PricingComparison.tsx` still hard-codes `$22 / mo`, `$44 / mo`, `$88 / mo` — currently correct but a drift risk. Refactor to import when next touched.

[shipped: pricing-single-source-of-truth]


### Session-expired auto-logout · admin pages no longer ghost-render (Jul 2026)

Rich reported `/admin/contacts` was showing empty on prod — his "34 contacts" appeared missing. Data was actually intact (38 rows verified in Railway DB). Root cause: the earlier `JWT_SECRET` rotation invalidated his `app_session_id` cookie signature, so `ownerProcedure` returned 401, and 21 of 22 admin pages destructure `{ data, isLoading }` without reading `isError` — silently rendering as empty.

- Added a global 401 interceptor in `client/src/main.tsx` (`authAwareFetch`) that catches UNAUTHORIZED responses, best-effort `POST /api/auth/logout`, and hard-redirects to `/login?next=<path>&reason=session_expired`.
- Only fires on paths that need auth (`/admin`, `/dashboard`, `/cellar-brief`, etc.) so public-page background tRPC calls aren't affected.
- `Login.tsx` now shows a "Session expired" banner when `reason=session_expired` is present, so the bounce is explained instead of feeling like a bug.
- Guarded by a module-level `redirectedOnce` flag — an outage doesn't trigger a redirect storm.

[shipped: rotate-jwt-secret]

Also added `viteTodoSync` plugin (`/app/viteTodoSync.ts`, wired in `vite.config.ts`) — on dev server start and on every `memory/CHANGELOG.md` change, the plugin scans for `[shipped: <id-list>]` markers and auto-marks matching TODO items as `status: "done"` in `client/src/data/todoData.ts`. Idempotent, fails soft, no dirty writes. `/todo` now stays in sync without manual editing.

[shipped: custom-domain-dns]


### Gate wall lockout fixed · correct password now always wins (Feb 2026)

Rich was locked out of `/site-map` on prod despite typing `middx99` correctly. Root cause: the rate limiter ran BEFORE the password check, so once 5 typos tripped the 15-min bucket, even a correct password got blocked. Fixed by inverting the flow:

- `POST /api/gate/verify` now checks the password FIRST. A correct password always issues the cookie and calls the new `resetGateAttempts(ip)` to wipe the counter — humans who fat-finger 5x then remember it on the 6th try get through immediately.
- The rate limiter now only counts failed attempts, still 5/15min/IP.
- `checkGateRateLimit()` short-circuits for IPs listed in `OWNOLOGY_GATE_IP_ALLOWLIST` (env), so the owner can permanently immunise a home/office IP.
- Same treatment for `/i/:token` — a valid invite wipes the caller's IP counter.

Files touched: `server/gate.ts`, `server/index.ts`, `memory/test_credentials.md`. Verified locally via curl: 6th attempt with correct pw returns 200 even after being 429'd.


### Prod cutover · Ownology.ai now served by new Railway build (Feb 2026, Rich)

Full end-to-end wire-through completed. Prod was previously serving a stale build via Cloudflare-fronted DNS; now `ownology.ai` and `www.ownology.ai` route directly to the fresh Railway service.

**DNS surgery (at Namecheap):**
- Deleted 3 stale records: `A @ → 162.159.142.117`, `A @ → 172.66.2.113`, `CNAME www → ownology.ai.` (all leftover Cloudflare edge IPs).
- Added 4 new records:
  - `ALIAS @ → aye79ubv.up.railway.app`
  - `TXT _railway-verify → railway-verify=4e0da…` (apex verification)
  - `CNAME www → uj8udgk7.up.railway.app`
  - `TXT _railway-verify.www → railway-verify=c3b70…` (www verification)
- Preserved: Google Search Console TXT, `_dmarc`, `default._domainkey`, `resend._domainkey`, SPF for Amazon SES.

**Env var cleanup (on Railway):**
- Deleted `ALERT_TEST_TO` — email redirect to test inbox removed. All transactional emails now go to real recipients.
- Regenerated `JWT_SECRET` (was flagged for leading/trailing whitespace by health probe).
- Confirmed `ALERT_FROM_EMAIL=owen@ownology.ai`.
- Rotated `RESEND_API_KEY` from a Bondi Roam-scoped key to a new `railway-prod` key scoped to Rich's Ownology Resend workspace (where `ownology.ai` is verified).
- Deferred (per Rich): `STRIPE_SECRET_KEY` (waiting on live keys), `OAUTH_SERVER_URL` (waiting on public-signup readiness).

**Verification:**
- `/api/health` uptime dropped from 128,927s (stale process) to 127s post-redeploy.
- `/api/scheduled/health-digest?send=1` returned Resend message-id `7f28118c-3ef7-4c47-9996-8d7d8bb684d6`.
- Real email from `owen@ownology.ai` landed in Rich's inbox — first production email under proper `ALERT_FROM_EMAIL` config.
- Final probe status: 3 OK · 2 WARN (STRIPE + OAUTH stubs, both intentional deferrals) · 0 FAIL.

**Also shipped in this session:**
- `/admin/health` React dashboard (live probe status + last-transition timestamps + "Run watch" actions)
- Failure-only push detector (`/api/scheduled/health-watch` + `health_probe_state` table)
- Textbook-jargon sweep — Bucket B (10 rewrites) + C3 audience split (winemaker-facing surfaces migrated to "the standard cellar references your team already trusts", enthusiast surfaces kept for SEO). Hero renamed: **"The cellar you can talk to"** (was "The oenology you can talk to").
- Style rule captured in `INDUCTION_STYLE_GUIDE.md` §7 to prevent regressions.

---


### Failure-only push alert for App Health · `/api/scheduled/health-watch` (Feb 2026, Rich)

Companion to the daily health digest. Rich no longer has to wait until 07:00 AEST to hear that Resend/MySQL/LLM died at midnight — a 15-min Railway cron now fires an **immediate** Resend email the moment any probe transitions.

- **New table** `health_probe_state` — one row per probe (Env vars · MySQL · Resend · Emergent LLM key · Auth), persisted so redeploys don't cause spurious "just failed" alerts. Bootstrapped via `CREATE TABLE IF NOT EXISTS` on server boot; also exists in Drizzle schema.
- **New endpoint** `GET /api/scheduled/health-watch` — reuses the same probe set as `healthDigest.ts` (extracted `runAllProbes()` + shared types). Compares each observation against the last-known row, emits **failure** alerts on OK/WARN/SKIP → FAIL and **recovery** alerts on FAIL → OK/WARN. Same `CRON_SECRET` + `ADMIN_EMAILS` config as the daily digest.
- **Suppression window**: 30 min per probe (via `lastAlertedAt`) to prevent duplicate emails inside a settling event. `?force=1` overrides. Dry-run by default; `?send=1` actually mails.
- **Email format**: distinct "JUST FAILED" / "RECOVERED" badges, previous→current status arrow, detail line, hint. Subject line lists the failing probe(s) directly (`[Ownology ALERT] MySQL just failed`) so a phone lock-screen preview is enough context.
- **Railway cron entry** added to `DEPLOY_TO_RAILWAY.md`: `*/15 * * * *` UTC.

**Verified**: initial state seeded, recovery transition detected via forced DB flip, repeat runs correctly silent, dry-run default respected, no lint issues.

---



### Jargon audit sweep · `/guide` + email templates (Feb 2026, Rich)

Applied same lens as the `/try` audit. Six changes across four surfaces.

**`/guide` (Guide.tsx):**
- "Dashboard — KPIs & tank status" → **"Dashboard — your cellar at a glance"** (removed enterprise "KPIs" language)
- Cellar Manager tagline "Production visibility, cost intelligence, and compliance readiness" → **"See the whole cellar. Know what it cost. Know it's audit-ready."** (winemaker verbs, not consultant nouns)
- Head Winemaker tagline "Fermentation control, protocol management, and decision capture" → **"Ferment control, protocols at hand, decisions captured for next vintage."** (grounded in daily reality)
- "Free Run — AI assistant" → **"Free Run — Owen, your AI apprentice"** (Owen brand consistency)
- Pillar card description rewritten around **"Ask Owen anything… He reads your SOPs, cross-references the Red & White Wine Bibles and MoreWine, and cites every source back to you."** (personalised, source-cited framing)
- LIP-audit blurb "exports directly to this schema" → **"exports match this format field-for-field"** (killed "schema")
- WineMaker Magazine blurb "pre-Ownology stage debugging" → **"pre-Ownology reading if you're just starting out"** (killed "debugging")

**Email templates:**
- `foundingReservationEmail.ts` — 5 rewrites: "Founding-Member" → **"Founding Cohort · 2026"** across subject line, HTML header, HTML paragraph, text body, and owner-side notification. Bonus: "the 60-second onboarding" → **"your first login — about 60 seconds"** (removed "onboarding" jargon).
- `nurtureEmail.ts` — HTML + text sync: "at 7am" → **"at 5:30am"** (aligned with Cellar Brief cadence everywhere else), "Ask Ownology" → **"Ask Owen"** (brand consistency).
- `marketingCoachEmail.ts` — audited but not touched. Owner-only internal email (Rich is the audience), winemaker-facing language doesn't apply.
- `dailyAlertEmail.ts` — audited, clean. Already in Owen voice with cellar-native language.

**Verified**: `/guide` renders correctly with new copy ("SEE YOUR VINTAGE" pill, "Ask Owen" pillar). Zero TS regressions. Lint clean.

---

### Weekly Cellar Digest email + User Journey Deck (Feb 2026, Rich)

**Weekly Cellar Digest — SHIPPED end-to-end**
- New `server/scheduled/weeklyCellarDigest.ts` — Monday 05:30 AEST digest email built from `generateCellarBrief(wineryId, "weekly")`. Same data shape as the homepage teaser + `/cellar-brief` page.
- Reused existing Resend integration (`RESEND_API_KEY` already in env), existing `ALERT_FROM_EMAIL=owen@ownology.ai`, existing test-to override, existing CRON_SECRET pattern.
- HTML template + text fallback + winery-name sender personalisation ("Owen · Chalk Hill" style) + STOP-to-pause opt-out language.
- Registered at `/api/scheduled/weekly-cellar-digest` (GET+POST). Owner-triggerable via new `/admin` tile "Weekly Cellar Digest — send now" (opens dry-run in a new tab).
- Dry-run tested live: 6 users scanned, 2 dry-run sends queued for iamrjpurr@gmail.com (testTo override working), 31 cards computed, zero errors.
- Value-engineering: zero new schema, zero new env vars, zero new dependencies. Copy-adapted from `dailyAlertEmail.ts`.

**User Journey Deck — SHIPPED**
- New `client/src/pages/UserJourneyDeck.tsx` — publication-format 9-slide deck at `/admin/deck/user-journey`. Cover + at-a-glance strip + 9 stage slides + colophon. A4 landscape print CSS. Each slide: eyebrow, title, primary CTA card (dashed amber), page reference, "what's on the page" bullets, "human factors" pull-block. Linked from Admin Guide submenu.

---

### Positioning audit execution · Batches 1-4 (Feb 2026, Rich)

Delivered the positioning audit's "this-week" P0 items in full plus all "next-30-days" P1 items including the biggest visual upgrade — live Cellar Brief teaser on homepage.

**Batch 4 — Cellar Brief live-demo hero on homepage:**
- New `client/src/components/CellarBriefTeaser.tsx` — compact 3-row live preview of the /cellar-brief page. Fetches `trpc.cellarBrief.latest`, renders vessel · variety · status pill · stage + days-in-stage.
- Dynamic headline computed from card statuses ("N vessel needs attention today." / "One tank to watch. Everything else steady." / "All clear. Steady vintage.").
- Falls back to a curated 3-card sample from our own cellar (Shiraz T-04 attention · Grenache T-11 watch · Cabernet B-27 ok) when unauthenticated so the marketing surface never breaks.
- Replaces the Manus-era "Demo video coming soon" placeholder in Home.tsx `#demo` section.
- Verified live rendering real data — Barrel 12A · Burgundy 228L (2nd fill) Pinot Noir · pre-ferment day 18 · WATCH; Barrel Rack A · 3× Burgundy 228L Chardonnay · pre-ferment day 9 · WATCH; Barrel Rack B · 4× hogshead + 1× puncheon Shiraz · pre-ferment day 8 · WATCH.

**Enemy line — HF-analysed and locked:** *"The spreadsheet in your winery is lying to you."* — inserted into hero between H1 and subheading. Concrete + universal + emotionally-loaded + product-truth aligned. Beat "Built for cellars, not corporations" on van der Meer's concreteness-emotion research and Sherif in-group bonding.

**Owen keep-decision — HF-analysed:** Owen name kept. The team-of-three story we just landed requires three named characters — killing the name kills the story. Zero rebrand cost. Familiarity effect (Zajonc) means existing beta users already know him. Reposition-only was sufficient.

**Total this session:**
- Homepage hero: category noun + audience + enemy line
- Meet the Cellar (Rich · Gel · Owen apprentice) section
- Founding Cohort · 2026 rename across 5 surfaces
- `/roadmap` → `/your-vintage` rename with legacy alias
- Pricing tier chooser (3-question wizard)
- Live Cellar Brief teaser replacing the placeholder

**Verified live**: `/home` renders hero → team → live-cellar-teaser → pricing → tier-chooser. `/your-vintage` renders progressive gates with correct title. `/pricing` chooser end-to-end tested (boutique/daily/critical → Vigneron recommendation). Zero tsc errors. All new components lint-clean.

**Deferred to afternoon (optional Batch 5/6):**
- `/compliance-score` tool (~90 min · lead-gen + SEO)
- Jargon audit sweep on `/guide` + `/pricing` + email templates (~30 min)

---

### Induction system — P0→P2 fixes shipped (Feb 2026, Rich · human-factors round-2)

Round-2 of the induction system after Rich's human-factors challenge. Value-engineered the deferred list into a single shipped batch.

**P0 — reveal-law compliance on `/the-press`.** Page now consults `roadmapStatus` at render top. Three states:
- **Locked** (no racking, no bottling, no bypass) → new `ThePressLockedPlaceholder` renders instead of the mock batch. Copy explains the reveal law honestly, offers two paths out ("earn it" → `/quick-entry` · "request preview access" → `/roadmap`).
- **Preview access** (bypass granted, no racking) → mock batch renders WITH an amber `preview-ribbon` at the top explaining "curated sample, not your own vintage."
- **Naturally unlocked** (racking or bottling logged) → mock batch renders unchanged (still mock — the real-data refactor is a separate future task).

Files: `client/src/pages/ThePress.tsx` (renamed inner body to `ThePressContent`, wrapped default export with gate check + skeleton loader).

**P0 — first-invite redirect.** `/i/<token>` route in `server/index.ts` now checks `invite.firstUsedAt`. First use → `302 /roadmap?welcome=1`. Repeat uses → `/admin` as before. New `Roadmap` renders a welcome banner when the query flag is present.

**P1 — owner UI to grant press bypass.** New `/admin/press-bypass` page + two new tRPC procedures (both `ownerProcedure`):
- `listPressBypassRequests` → groups `press_bypass_request` + `press_bypass_granted` events by userId, returns pending-first / granted-second.
- `grantPressBypass({userId})` → writes idempotent `press_bypass_granted` event.

One-click grant, no modal, no confirmation dance. Also listed in `/admin` hub. Files: `client/src/pages/AdminPressBypass.tsx`, `server/routers/onboarding.ts`, `client/src/App.tsx`, `client/src/pages/Admin.tsx`.

**P1 — Skim mode visibility indicator.** Fixes the hidden-state UX risk (Nielsen H1). New `GuideSkimIndicator` small dashed-amber pill on `/guide` renders only when localStorage `ow_skim_mode === "1"`. Links back to `/roadmap` where the toggle lives.

**P1 — bypass request confirmation loop.** Already partially shipped in round 1 (persistent "Requested — we'll be in touch" state). Round 2 added the visible admin queue AND the closable loop (grant → `roadmapStatus.pressBypassGranted:true` → Press card flips to "Preview access" ribbon variant).

**P2 — varied locked-gate CTAs.** Softens reactance risk (Brehm). Each gate now has an optional secondary `learnCta` linking to the "why" — `/guide#pillar-journal`, `/cellar-journal`, `/guide#pillar-copilot`, `/ask`, `/the-press`, `/regulations` — so skimmers have a route to context, not always `/quick-entry`.

**Bonus — `/try` copy jargon audit.** Rich spotted "🔒 In real Ownology this hits the sitemap, RSS, and OG image queue" as engineer-speak leaking to prospects on the public sandbox. Fixed three chips + one blurb:
- Step 1: "Same schema" → "Same layout"
- Step 4 lock chip: "In real Ownology this saves. Here it's the demo" → "…saves to your vintage log — searchable, cited, and yours."
- Step 6 blurb: "meta tags, pings the sitemap, adds it to your RSS" → "handles the SEO plumbing — the write-up, the preview card, the sitemap — quietly, in the background."
- Step 6 lock chip: "hits the sitemap, RSS, and OG image queue" → "goes live on your public cellar journal — where Google and wine drinkers find you."

**Verified live**: seed admin request/grant flow → `listPressBypassRequests` returns 1 pending → click "Grant preview access" → row flips to "Granted" with timestamp → `roadmapStatus.pressBypassGranted:true`. `/the-press` correctly renders three states. Lint + tsc clean.

**Still deferred** (small, non-blocking):
- Auto-confirmation email/SMS on bypass request submit (in-app pending banner covers this for now).
- `/roadmap-preview` public sample variant for pitches/SEO.
- `/admin/deck-editor` — DB-backed flashcards.

---

### `/roadmap` conditional-flow gate graph + floating "Back to Admin" pill + Skim Mode + Press Bypass — SHIPPED (Feb 2026, Rich)

**Why:** Rich flagged progressive-disclosure UX — *"we must be careful not to go too deep into The Press too soon"* — but also flagged the dual need: *"we must allow for wine professionals to ingest info and want to bypass all the detail"*. So the induction system has to serve novices (earn depth) AND experts (skim + request bypass) without picking one.

**Two-lens design:**
- **Novice lens (default)** — 7-gate progressive spine. Locked cards show one-line "Unlocks →" summaries. Full description hidden until earned.
- **Expert lens (opt-in "Skim mode")** — client-side toggle on `/roadmap`. Every gate's full description paragraph becomes visible even when locked. Features stay gated — only the *reading* is unlocked, not the *doing*. LocalStorage `ow_skim_mode`.
- **Wine-professional / press bypass** — locked Press card shows an inline "I'm a wine professional — request preview access" form (role · publication/winery · optional note). Writes `press_bypass_request` to `member_activity`. Rich grants by writing a matching `press_bypass_granted` event. Once granted, the Press card unlocks regardless of Gate 6/7 with a "Preview access" ribbon and preview-sample copy.

**Files:**
- `server/routers/onboarding.ts` — `roadmapStatus` (protectedProcedure) now returns `pressBypassRequested` + `pressBypassGranted` derived from `member_activity` events. New `requestPressBypass` (publicProcedure) mutation. Fermentation proxy = any inoculation OR ≥3 measurements.
- `server/memberActivity.ts` — added `press_bypass_request` and `press_bypass_granted` to `ActivityKind`.
- `client/src/pages/Roadmap.tsx` — new page. 7-node spine, Skim toggle (Eye/EyeOff icons), extracted `<PressReveal>` sub-component with 4 states (naturallyUnlocked · bypassGranted · bypassRequested · locked). Bypass request form: role required, pub/note optional, no email (gate cookie identifies).
- `client/src/components/BackToAdminBadge.tsx` — floating pill, mounted once in `App.tsx`. Uses cached `admin.summary` probe. Auto-hides on `/admin/*`, Work Mode, `/free-run`, `/login`, `/join/qr`, `/try`.
- `client/src/pages/StyleGuideInduction.tsx` — publication-format print page at `/admin/style-guide/induction`. Cover / TOC / 9 sections / colophon. `@media print` rules produce clean A4 PDF via browser Print → Save as PDF.
- `client/src/App.tsx` — mounted `<BackToAdminBadge />`; repointed `/roadmap` → Roadmap component; added `/admin/style-guide/induction` route.
- `client/src/pages/Admin.tsx` — added Roadmap + Induction Style Guide links to the Guide submenu.
- `client/src/pages/Guide.tsx` — amber pill "→ SEE YOUR ROADMAP" under the intro paragraph.
- `server/index.ts` — removed `/roadmap` from `DEV_ONLY_PATHS`. `/todo` stays dev-only.
- `memory/INDUCTION_STYLE_GUIDE.md` — publication-format source doc (Markdown).

**Verified live on preview**: `/api/trpc/onboarding.requestPressBypass` returns `{ok:true}`; a subsequent `roadmapStatus` returns `pressBypassRequested:true`. Roadmap page renders correctly, Skim toggle persists to localStorage, TypeScript + lint clean.

**Deferred**:
- **`ThePress.tsx` in-page gating** — page still uses demo/mock batch. Best addressed alongside a real batch-lifecycle refactor.
- **Owner UI to grant bypass** — currently a SQL insert. Small admin panel needed at `/admin/members` (list pending `press_bypass_request` events, one-click grant).
- **First-invite redirect to `/roadmap`** — first-time invite still lands on `/admin` or `/guide`.

---

### `/admin/audio-hook` tool — Whisper + Claude turn any IG reel into a tier-2 SMS opener (Feb 2026, Rich)

**The problem this solves:**
Perplexity Sonar is text-only and IG is login-walled — social video content is dark to any generic outreach AI. Rich can screen-record or export the audio manually; this tool closes the loop.

**Pipeline:**
1. Drop audio file (m4a/mp3/mp4/wav/webm, ≤25MB) at `/admin/audio-hook`.
2. Optionally paste source URL (IG post, YouTube episode) → becomes `hookSourceUrl` for later verify-source link.
3. Optionally add context ("Matteo from Primo Estate, pitching cellar AI") → sharpens Claude's angle.
4. Backend `outreach.audioHookPropose` runs Whisper → Claude → returns transcript + 3 hook candidates (technique / quoted_voice / question angles).
5. Operator picks/edits, filters contacts by name/winery, hits "Save hook to contact".
6. `outreach.audioHookSave` writes `hookTier=quoted_voice` + `hookText` + `hookSourceUrl` to the chosen row. SMS template + `/hi/:slug` amber hero automatically use it.

**Voice rules baked into the Claude system prompt:**
- Lower-case start, no exclamation marks, no emoji.
- Max 140 chars, Australian idiom OK, never fabricate — only echo transcript details.
- Three angles must attack DIFFERENT hooks (technique · quoted_voice · question).

**Backend procedures added to `outreach` router:**
- `audioHookPropose` (ownerProcedure): base64 audio + optional context → `{ transcription, candidates: [{angle, text}] }`. 60s Whisper timeout, 25MB payload cap.
- `audioHookSave` (ownerProcedure): writes hook fields against an existing contact by slug.

**Frontend:**
- New page `AdminAudioHook.tsx` with 3-step wizard (drop → review → save), inline editable final hook textarea, contact-filter list.
- New "+ Audio hook →" pill button on `/admin/contacts` header (next to Event ingest / Pipeline).
- Route registered in `App.tsx`: `/admin/audio-hook`.

**Verified E2E:** Real Primo Estate 2024 Pecorino tasting reel (795KB m4a) → Whisper transcribed cleanly ("I mean seriously that is awesome…") → Claude returned three usable hooks in Rich's voice. Matteo Grilli's contact row (`matteo-primo-estate-wines`) manually seeded with a hookText derived from cross-referencing both his IG reels + the primoestate.com.au product page.


### Hook Waterfall — Perplexity outreach opener v2 + operator-guide auto-links (Feb 2026, Rich)

**Hook Waterfall (kills generic "family-owned winery" AI slop):**
- Perplexity `deepResearch` prompt rewritten to hunt FOUR tiers in strict priority, returning whichever tier can be sourced with a real citation:
  1. `recent_signal` — a dated event in the last ~90 days (award, review, release, IG post)
  2. `quoted_voice` — a direct quote from the winemaker (podcast, newsletter, blog)
  3. `peer_signal` — a specific thing a neighbouring producer just did
  4. `vintage_pain` — current regional vintage conditions (smoke, drought, rainfall)
- Fabrication guardrail: if none of the four tiers can be cited, all hook fields return `null`. No made-up quotes, scores, or dates.
- Voice rules baked into the prompt: lower-case start, no exclamation marks, max 140 chars, Australian idiom OK.
- Response schema extended: `hookTier`, `hookText`, `hookSourceUrl` (all-or-nothing linked).

**DB + persistence wiring:**
- Migration `scripts/add-outreach-hook-columns.mjs` adds `hook_tier` (VARCHAR 32), `hook_text` (VARCHAR 400), `hook_source_url` (VARCHAR 500) to `outreach_contacts`.
- Drizzle schema updated with matching column types.
- `outreach.create` / `outreach.importContacts` / `outreach.exportAllContacts` all accept + persist + emit the new fields.
- `outreach.bySlug` returns them so `/hi/:slug` can render the same opener the SMS used.
- `AdminEventIngest.tsx` passes hook fields through when saving deep-researched leads.

**SMS template + admin UX:**
- `smsDraft()` in `AdminContacts.tsx` now prefers `hookText` over `painPoint`. Fallback chain: hookText → painPoint → generic honest cold-open.
- Admin row shows the polished hook line in italics with an amber tier badge (`recent signal` / `quoted voice` / etc.) and a "verify source ↗" link to the citation URL. Operator can sanity-check before sending.
- `HiContact.tsx` renders the hook in the amber hero card (takes precedence over painPoint) so the landing-page opener matches the SMS opener — reinforces the "someone who did their homework" impression.

**Operator-guide flashcards auto-linkify internal paths:**
- New `linkifyPaths()` helper in `components/FlashCardDeck.tsx` turns any occurrence of `/admin/...`, `/hi/...`, `/apprentice`, `/import`, etc. inside step text, outcome lines, or gotcha boxes into a clickable amber-underlined wouter `<Link>`.
- Root-relative paths resolve against the current origin — works identically in dev preview and production, zero env-var plumbing.
- Placeholder paths containing `<` (e.g. `/hi/<slug>`) are intentionally NOT linkified — they're templates, not URLs.


### Deck 2 · Vineyard & Viticulture (20 cards) + Dev-only theme picker (Feb 2026, Rich)

**Deck 2 · Vineyard & Viticulture — 20 cards:**
- New `viticulture` category in `client/src/content/oenologyFlashcards.ts`.
- Deck total now **95 cards** across 12 categories.
- Cards cover Site & Soil (4), Vine Genetics (4), Canopy & Vine Management (5), Phenology & Ripening (3), and Vineyard Health (4):
  - Aspect · Soil types · Water availability · Elevation & mesoclimate · Rootstock selection · Clonal selection · Own-rooted vs grafted · Variety-site matching · Canopy management (VSP/sprawl/Scott Henry) · Pruning styles (spur/cane/cordon) · Vine balance (Ravaz index) · Yield restriction · Bud fruitfulness · Phenology stages · GDD · Water stress / regulated deficit irrigation · Powdery mildew · Downy mildew · Botrytis (noble vs bunch rot) · Spray programs.
- Same dual-language SOP + plain format as prior decks. Completes Rich's stated learning-goal spectrum (chemistry ✓ · consulting ✓ · business ✓ · viticulture ✓).

**Dev-only theme picker** (`DevThemePicker` component in `App.tsx`):
- Floating pill in bottom-left corner: `🎨 theme`. Expands to 3 options — Auto (time + weather) · Parchment (day) · Soft Cellar (night).
- Renders **ONLY** when Vite dev mode is active (`import.meta.env.DEV === true`) OR URL contains `?dev=1`. Never renders in production builds — respects Rich's "no theme toggles in prod" rule.
- Writes to `window.__ownologyThemeOverride`; `AutoThemeByTime` reads that variable and uses it as-is when set, ignoring time-of-day mapping. Dispatches `ownology:dev-theme-override` event so the theme applies instantly on click without a page reload.
- Rationale: Rich was iterating on component colours and the auto-theme was flipping erratically. Now he can freeze the theme in dev without waiting on Open-Meteo.
- Testids: `dev-theme-picker`, `dev-theme-picker-toggle`, `dev-theme-{auto,parchment,soft-cellar}`.


### WhatsApp channel on `/hi/:slug` + Deck 4 · Business of Wine (Feb 2026, Rich)

**WhatsApp option on outreach landing:**
- New helper `buildWaHref()` in `server/routers/outreach.ts` — returns `wa.me/[digits]?text=...` link with same pre-filled body as SMS reply. Falls back to `SMS_INBOUND_NUMBER` if `WHATSAPP_INBOUND_NUMBER` not set (same SIM covers both).
- `outreach.bySlug` now returns `waHref` alongside `smsReplyHref`. Shown regardless of A/B `ctaVariant` — always offered when a number is configured.
- `HiContact.tsx` renders a quieter green-tinted button under the primary CTA: *"Have WhatsApp? Easier for photos & docs →"* with `data-testid="hi-cta-whatsapp"` and `data-cta-channel="whatsapp"` for analytics splits.
- Doctrine: SMS = universal door, WhatsApp = richer couch. Zero API cost, no approval needed — pure URL scheme.

**Deck 4 · Business of Wine (10 cards)** added to `/apprentice`:
- New `business` category. Deck total now **75 cards** across 11 categories.
- Cards: COGS · 3-tier margin stack · DTC vs Trade · Cellar door economics · Wine club economics · APCO · WET · Winery liability & liquor licensing · Vintage yield economics · Vintage cash cycle.
- Same dual-language SOP + plain format. Emphasis on the money side of a winery — what a consultant must be conversant on to be trusted.

Verified both via lint (zero errors).


### Deck 3 · Consultant's Toolkit — 15 cards for sales calls (Feb 2026, Rich · URGENT for tomorrow's calls)
- **Context**: Rich has sales calls tomorrow. Needed a cheat-sheet of what to actually SAY when a prospect asks common questions.
- **Change**: added `consulting` category to `FlashcardCategory` + `CATEGORY_META` in `client/src/content/oenologyFlashcards.ts`.
- **15 new cards, split**:
  - **10 objection-handlers** — Elevator pitch · Hallucination worry · vs InnoVint/Vintrace · Data privacy · Replaces consultant? · Import story · Pricing · Who is Owen · AI wrong risk · SOP onboarding · Team access.
  - **5 decision-frameworks** — When to press · When to blend · When to hold vs release · When to escalate (know Rich's own limit) · (Bench trial discipline folded into When-to-blend).
- **SOP field** on consulting cards = the actual phrases Rich can say aloud on a call. Written to be scanned mid-conversation.
- **Deck totals now**: 65 cards across 10 categories.
- Verified via screenshot on `/apprentice` — filter shows Consultant's Toolkit, first card renders correctly, dual-language format preserved.


### `/learn` · Owen Deck — 50-card SRS flashcards (Feb 2026, Rich)
- **Context**: Rich starting his oenology education. Needs both technical fluency (to talk with winemakers) AND consultant-level knowledge (for customer conversations). This is Deck 1 of a planned multi-deck curriculum.
- **New route**: `/learn` → `client/src/pages/Learn.tsx`. Unlinked from nav, gated behind existing site password. Localstorage-persisted progress.
- **Content**: `client/src/content/oenologyFlashcards.ts` — 50 cards across 9 categories (Sugar/Ferment ×10, Acid/pH ×7, SO₂ ×6, MLF ×4, Oak ×5, Faults ×6, Sensory ×4, Regions ×5, Pairing ×3).
- **Dual-language format on every card**:
  - `sop`: SOP / technical language as it would appear in a cellar procedure or AWRI reference — Rich uses this to sound fluent with winemakers.
  - `plain`: plain-English translation — how Rich actually learns it.
  - Plus `why` / `when` / `ruleOfThumb` / `cited` fields.
- **SRS**: Leitner box scheduler (`client/src/lib/leitnerScheduler.ts`) — 5 boxes with 1/2/4/7/14 day intervals. Grade: Again / Good / Easy. Two study modes: `Due today` (SRS-scheduled) and `All cards` (shuffle). Category filter.
- **Testids**: `learn-page`, `learn-card`, `learn-card-term`, `learn-card-sop`, `learn-card-plain`, `learn-reveal-btn`, `learn-grade-{again,good,easy}`, `learn-mode-{due,all}`, `learn-category-filter`, `progress-{due,reviewing,mastered,total}`, `learn-reset`, `learn-skip`.
- **Phase 2 decks noted for backlog** (Rich's stated learning goals):
  - **Deck 2 — Vineyard & Viticulture** (~20 cards): canopy management, phenology, water stress, disease pressure, rootstocks, spray programs, clones, pruning styles.
  - **Deck 3 — Consultant's Toolkit** (~15 cards): client objections, decision frameworks, when-to-blend / when-to-hold / when-to-release, sensory evaluation for consulting.
  - **Deck 4 — Business of Wine** (~10 cards): pricing/margins, distribution, DTC vs trade, cellar door economics, insurance, compliance overview.
- Verified via screenshot: reveal, grade, next-card advance, filter, and localStorage all working.


### Why-window rotating technical Q&As (Feb 2026, Rich)
- **Change**: the "window" in `WhyOwnologyBoxes.tsx` now cycles through 3 realistic cellar-diagnostic Q&As on an 8s cadence (pauses on hover, clickable dot nav).
- **Scenes**:
  1. **MLF stall** (mid-vintage) — pH 3.42, 14°C. Cited: Zoecklein ch.8 + AWRI MLF bulletin.
  2. **SO₂ dosing** (pre-bottling) — Chardonnay, molecular target 0.8 mg/L → 26-28 mg/L free at pH 3.40. Cited: Boulton et al ch.12 + AWRI SO₂ calculator.
  3. **Stuck ferment restart** — Shiraz at 8.4 Brix, YAN test + Uvaferm 43 restart. Cited: Fugelsang & Edwards ch.5 + Lallemand restart protocol.
- Each question spans a different vintage-timeline moment so a returning visitor sees varied proof.
- Testids: `why-ownology-window-scene-{id}`, `why-ownology-window-dot-{id}`, `why-ownology-window-dots`, `why-ownology-window-citation` + `-1` for second citation pill.
- Answered Rich's separate question about pricing in the hero slides: **Scene 2 placement is correct** (answers the cost objection primed by naming InnoVint/Vintrace); don't spread pricing to other scenes; use `/pricing-comparison` for the deep dive.


### Owen positioning shift · "con·science" motif + Why-section product window (Feb 2026, Rich)
- **Positioning change**: Rich pulled Owen away from "apprentice / never leaves the cellar" (junior/loyalty framing) toward experience + competence + science.
- **New Hero Scene 1 copy** (`HeroCarousel.tsx`):
  - H1: **"The oenology you can talk to."** (amber emphasis on "talk to")
  - Sub: *"Your con·science, cellar-side."* (amber-bold "con·science", middle-dot)
  - Micro monospace: `not internet CON · backed IN SCIENCE` — CON dimmed + strikethrough, SCIENCE amber-bold, unpacks the wordplay in one glance.
  - Wordplay logic: **CON + SCIENCE = CONSCIENCE** (Owen is not internet snake-oil; he's science, made conversational).
- **New "window" in Why Ownology section** (`WhyOwnologyBoxes.tsx` addition, placed above the 3 boxes):
  - Rendered mock (no image asset) — browser chrome (3 dots + `ownology.com/ask` URL bar) + user question in amber bubble + Owen answer with amber "O" avatar.
  - Question: *"MLF stuck at pH 3.42, temp dropped to 14°C. Restart or wait?"* (cellar-realistic technical diagnostic).
  - Answer references *Oenococcus oeni* activity threshold, 18–20°C rewarm, nutrient re-check.
  - **Two amber citation pills** — `Zoecklein · Wine Analysis & Production, ch. 8` + `AWRI · MLF technical bulletin`.
  - Footer strip echoes the hero wordplay: `EVERY ANSWER CITED · NOT INTERNET CON · BACKED IN SCIENCE`.
  - This is the "window" Rich sensed the section was missing — visual proof of the science-backed positioning, not marketing prose.
- **Testids added**: `hero-scene-owen-subline`, `hero-scene-owen-wordplay`, `why-ownology-window`, `why-ownology-window-question|answer|citation`.
- Verified via screenshot.


### `/pricing-comparison` — sales-defense receipt page (Feb 2026, Rich)
- **Context**: Scene 2 of the hero carousel now claims "~95% less" vs InnoVint/Vintrace. Rich wanted a defensible receipt he can share with skeptical prospects mid-sales-call.
- **New route**: `/pricing-comparison` → `client/src/pages/PricingComparison.tsx`. Unlinked from all nav, direct-URL only, "RATE SHEET · SHAREABLE" banner at top.
- **Content**:
  1. Header: "The pricing math · on the record — What a boutique winery actually pays."
  2. Claim box: "For a typical mid-tier boutique winery, Ownology comes in at roughly one-tenth the loaded cost of a Vintrace or InnoVint quote."
  3. **6-row side-by-side comparison table**: Home DIY → Serious home → Boutique starter → Boutique typical → Owner-operator vigneron → Enterprise. Each row shows InnoVint / Vintrace / Ownology price + tier + note + savings percentage.
  4. Two disclosed footnotes (loaded-cost caveat, enterprise-quote caveat).
  5. 4-box "Why we can price this low" rational-proof (no per-user fees, no implementation consultant, AI where it earns keep, built by a winemaker not a boardroom).
  6. **Sources cited inline**: SoftwareAdvice, Capterra, GetApp + link back to own `/pricing`.
  7. Quiet exit CTAs (Ask Owen free / See pricing page).
- **Pricing intel** (verified via web search Feb 2026):
  - InnoVint: $99 / $169 / $299 monthly tiers (public list).
  - Vintrace: from ~$95/mo, mid-tier $200–500 loaded, enterprise $500–2000+ (quote-only, from customer reports).
  - Ownology (from `/pricing`): Cellar Hand $22 / The Press $44 / Vigneron $88 monthly (annual billing).
- **Marketer's rewrite** of Rich's literal instruction: replaced "95% cheaper" with "roughly one-tenth the loaded cost" for the claim block, but the table still displays the true math per row (`~54%`, `~74–91%`, `~70–85%`, `90%+`). Honest math beats a slogan.
- **Testids**: `pricing-comparison-page`, `pc-header`, `pc-claim-box`, `pc-comparison-table`, `pc-row-0..5`, `pc-sources`, `pc-cta-ask`, `pc-cta-pricing`.
- Verified via screenshot: all sections render, table shows all 6 rows correctly, zero nav links point at the page.


### HeroCarousel Scene 2 · pricing "noise" injection (Feb 2026, Rich)
- **Problem** (Rich's insight): Scene 2 names InnoVint & Vintrace, which primes visitors to think "$$$". Without an immediate cost counter, the visitor's expectation collapses to "same category = same price" → bounce. Rich's ask: make a noise that we're **~95% cheaper for commercial teams** and **on par (or better) for home winemakers**.
- **Change** (`HeroCarousel.tsx` scene "gap"): replaced the "Ownology is the same category / cellar intelligence" paragraph with a two-column **price-differential card** (amber-bordered, scannable within one visual beat).
  - Column 1 — `COMMERCIAL TEAMS` · **~95% less** · "than InnoVint or Vintrace"
  - Column 2 — `HOME WINEMAKERS` · **On par (or better)** · "than any DIY tool"
- Closing italic tightened: "Same category. Different math. Before you spend another year on the wrong tool."
- **No specific competitor $ amounts named** (comparative-advertising safety). Percentage claim is qualitative ("~95%") not a formal comparison.
- Testids: `hero-scene-gap-pricing`, `hero-scene-gap-price-commercial`, `hero-scene-gap-price-diy`.
- Verified via screenshot on preview.


### `/our-story` standalone page — quiet rebuild for iteration (Feb 2026, Rich)
- **Context**: Rich uploaded `ownology-our-story.zip` — component + copy but no image binaries. Zip's 3 `/manus-storage/*` image paths (founders-couple, vineyard, lab) are dead in the Emergent build; only the 2 Cloudfront portraits (Rich, Geraldine — the "AI photos" from Manus) still resolve. Rich's ask: rebuild as a **dedicated page**, kept unlinked, structured for a future founder video, no home-page changes.
- **New route**: `/our-story` → `client/src/pages/OurStory.tsx`. Added to `App.tsx` route table but **not linked from Nav, Footer, or any content page** — direct-URL access only.
- **Page structure** (top → bottom):
  1. Video hero slot — 16:9 placeholder card with amber play icon + drop-in instructions (`/media/our-story.mp4`).
  2. Pull quote — Rich's 2005 boutique-shed anchor line, cellar-key SVG mark above.
  3. Founder portraits — Rich + Geraldine, 3:4 side-by-side, both Cloudfront (`d2xsxph8kpxj0f.cloudfront.net`, 200 OK verified).
  4. 4-paragraph body copy verbatim from Rich's upload with amber-left highlighted insight card.
  5. Education credential card (Advanced Cert Viticulture & Winemaking — Oenology).
  6. Back-to-home footer link.
- **What's NOT included** (deliberate — Rich to fill later): founders-couple hero photo, vineyard + lab small gallery. Structure supports adding them back once assets are shot.
- **Testids**: `our-story-page|video-slot|pullquote|founder-rich|founder-geraldine|body|highlight|credential|back-home|return-home`.
- **Header**: sticky "Ownology ← / PREVIEW · UNLINKED" banner so Rich knows it's not live.
- **Verified via screenshot**: all sections render, both portraits load from Cloudfront, video placeholder shows drop-in hint.


### HeroCarousel v4 · "The Apprentice Arc" — reordered 4-scene carousel + `WhyOwnologyBoxes` below-fold (Feb 2026, Rich)
- **Problem**: v3 opened on 3:47am panic → gap → Owen. Rich wanted to reverse the emotional arc: lead with warmth (Owen), then category (Gap), then pain (3:47am), then invite (Get Started). Also wanted rational-proof boxes below-fold.
- **v4 carousel scenes** (`client/src/components/HeroCarousel.tsx`, full rewrite):
  1. **Meet Owen** (5s) — persona/identity anchor. Amber apprentice mark + "The apprentice who never leaves the cellar."
  2. **The Gap** (6s) — unchanged from v3 Angle D (InnoVint/Vintrace category chips + "Before you spend another year on the wrong tool.").
  3. **3:47am** (5s) — pain peak, same copy as v3 opener.
  4. **Get Started** (6s) — invite close. Body pulled from old Owen-CTA scene; primary CTA testids preserved so bookmarked analytics survive.
- **Below-fold `WhyOwnologyBoxes.tsx`** (new component) — 3 rational-proof cards with Rich's own copy verbatim:
  - "The problem we're solving" (Notebook icon) — institutional knowledge loss / SOPs in binders.
  - "Built for mobile, during harvest" (Smartphone icon) — one-handed, wet-gloves, grounded in own docs.
  - "Your data stays yours" (Lock icon) — never used to train AI models, searchable only by team.
- **Wire-up**: `Home.tsx` now renders `HeroCarousel → WhyOwnologyBoxes → TrustChips → …`. FAQ section (`<FAQ />`) untouched — deferred per Rich ("skip FAQs entirely for now").
- **Data-testids**: `hero-scene-owen|gap|panic|start`, `hero-carousel-dot-*`, `hero-carousel-cta-pro|curious`, `why-ownology-boxes`, `why-ownology-box-{problem,mobile,data}`.
- **Verified via screenshot**: all 4 scenes cycle + dot-jump correctly on load; Why boxes render below fold with amber accent bars.


### `Import.tsx` split into per-tab modules — code-hygiene refactor  (Feb 2026, Rich)
- **Problem**: `client/src/pages/Import.tsx` had grown to 2,236 lines — five tab implementations (Voice/Camera/Paste/CSV/Bulk) + shared helpers + main composer, all in one file. Painful to navigate, review, or hand off.
- **Solution**: moved to `client/src/pages/Import/` directory with one file per concern:
  - `shared.tsx` — types (`EventType`, `ParsedEntry`, `Tab`, `ImportSource`), helpers (`eventLabel`, `eventColor`, `detailSummary`, `assignIds`, `parseCSVText`), and the shared `PreviewTable` component.
  - `VoiceTab.tsx` — MediaRecorder + Whisper flow.
  - `CameraTab.tsx` — phone camera + Claude Sonnet vision.
  - `PasteTab.tsx` — text + clipboard-image OCR + side-by-side reference view.
  - `CsvTab.tsx` — column-mapped CSV import.
  - `BulkTab.tsx` — folder drop + parallel multi-file router (image/text/pdf/xlsx/whatsapp/audio) with RAG confidence badges.
  - `index.tsx` — thin composer (tab selector + preview + save).
- **Public surface unchanged**: `import("./pages/Import")` in `App.tsx` still resolves via Node module resolution to `pages/Import/index.tsx`. All `data-testid` selectors preserved so existing tests don't break.
- **Zero new TypeScript errors** (pre-existing `App.tsx` Promise widening + `Guide.tsx` RevealCard prop issue remain untouched).
- **Result**: largest file dropped from 2,236 → 220 lines (index.tsx); each tab now edits/reviews independently.

### Auto-theme fallback moved from Barossa Valley → Hunter Valley (Pokolbin)  (Feb 2026, Rich)
- Open-Meteo fallback coords in `AutoThemeByTime` updated from Barossa (−34.53, 138.95) to Pokolbin (−32.78, 151.29). Localises the default weather-driven accent to Rich's home region for visitors who haven't granted geolocation.


## Feb 2026
### HeroCarousel Scene 2 refactored to Angle D (recognition-anchor) — data-picked  (Feb 2026, Rich)
- **Problem**: original Scene 2 was abstract stats ("40 hrs / 3:47am / $50k+ / 0") — Rich flagged as "tech heavy" and reminded me the original doctrine positioned Ownology vs InnoVint/Vintrace.
- **Solution**: applied 6-principle psychology matrix (choice overload · loss aversion · anchoring · cognitive load · craft-identity respect · F-pattern scan time) against 4 candidate framings. Angle D — "You already know InnoVint & Vintrace. You've probably priced them." — won on 5/6 axes.
- **Copy landed**:
  - Eyebrow: "The gap · where you sit"
  - H2: "You already know InnoVint & Vintrace. You've probably priced them."
  - Chip row: three category peers — InnoVint · Vintrace · **Ownology** (amber-lit)
  - Paragraph: "Ownology is the same category — cellar intelligence — priced and paced for boutique winemakers. Every answer cited, every SOP editable, APCO built in."
  - Loss-aversion italic footer: "Before you spend another year on the wrong tool."
- **Design choices**: recognition memory as anchor (not attack), respects Australian winemaker collegiality (industry <2k producers), mirrors how winemakers themselves sell (story + recognition > spec sheets).


### Cycling landing hero + /guide progressive reveal — cognitive-overload fix  (Feb 2026, Rich, post-deploy iteration)
- **HeroCarousel** replaces the dense pillars hero on `/home` — three auto-cycling scenes: (1) 3:47am ferment panic cold open (3s), (2) market-gap analysis with 4 stat cards — 40hrs/yr · 3:47am · $50k+ · 0 (6s), (3) Meet Owen apprentice reveal + dual CTA (6s). Auto-cycles 15s loop · pauses on hover · dots for manual jump · skip-intro button.
- **FounderStory temporarily hidden** on `/home` — Rich flagged the Rich+Gel winery photos as visually broken. Section commented out until reshoot/restyle.
- **`/guide` progressive reveal** — only Four Pillars visible above the fold; Workflow Map · Getting Started Checklist · Role Paths · Tier Access · First Fermentation · Further Reading all sit behind amber "Reveal →" cards. Persisted via localStorage.
- **Reusable `RevealCard`** at module scope in Guide.tsx (satisfies `react/no-unstable-nested-components`).
- **Doctrine restored**: fewer things visible on first landing, respect the visitor's attention, reveal complexity only on explicit user intent.

### Contact migration bridge + Namecheap → Emergent domain switch  (Feb 2026, Rich)
- **`/admin/contacts-migrate`** — two-button flow: download all contacts as JSON on dev, upload JSON on prod. Volatile pipeline state (sms/reply/booking timestamps · view counts) stripped so prod starts with fresh state. Upsert-by-slug (skips duplicates).
- **Backend**: `outreach.exportAllContacts` (query, ownerProcedure) + `outreach.importContacts` (mutation, ownerProcedure, upserts by slug, max 500 per batch).
- **Domain unlinked** from `ownership-dev` (preview) and linked to production Emergent app pointing at `ownology.ai`. Stale bundle bug (React hook order) resolved. Namecheap DNS auto-updated via Emergent's Entri integration. All 5 TXT records (Google verification + email DKIM/SPF/DMARC) preserved.


### CRM business-card / email-signature OCR + Import side-by-side layout  (Feb 2026, Rich)
- **CRM OCR panel** on `/admin/contacts` — new dashed-amber container ABOVE the Add contact form. Paste a screenshot (or click to upload) → 2-stage vision-LLM pipeline (verbatim OCR → structured extraction) auto-fills firstName, lastName, mobileAu, winery, notes (email + address if present), persona.
- **Backend**: new `outreach.ocrContactCard` ownerProcedure. Returns `{ rawOcrText, fields, totalWords, recognisedWords, confidencePct }` with the same colour-coded quality score model as `vintageLog.ocrImageToCleanText`.
- **Quality score card**: green ≥85% · amber 60–84% · red <60%, matching the Import Paste tab so operator UX is consistent.
- **Auto-fill discipline**: MERGE not overwrite — anything the operator already typed is preserved. Persona only gets overridden if the operator hadn't set a non-default persona. Discard clears the OCR result but keeps the form fields.
- **Import Paste side-by-side layout**: original image (up to 340px, click-to-enlarge in new tab) on the LEFT, cleaned OCR text on the RIGHT — a proper reference layout so winemakers can visually cross-check and hand-type any words the OCR missed. Rich's stated 80%-recognition + hand-fill-delta workflow.
- **Testing**: `testing_agent_v3_fork` iteration_35 — 100% pass both features. Business-card image (Nathan Bailey / Brokenwood Wines) → 9/9 words · 100% confidence · all form fields auto-populated correctly. Side-by-side layout verified via bounding-rect x-coords (preview left, text right).
- **Regression rescue**: my initial `search_replace` accidentally dropped `parseFromUrl: ownerProcedure` when inserting the new endpoint above it → backend crashed on boot → gate unlock returned 502 "Network error". Testing agent identified the orphaned `.input(...)` block, restored the missing procedure declaration. Fix landed at line 588 of `outreach.ts`.


### Import surface: Paste tab accepts clipboard IMAGES + OCR + spell-check + quality score  (Feb 2026)
- **Backend**: New tRPC mutation `vintageLog.ocrImageToCleanText` — 2-stage pipeline. Stage 1 = verbatim vision OCR (marks uncertain words with `[unclear?]`). Stage 2 = spell/grammar clean-up returning JSON with `cleanedText` + a `corrections[]` array of `{original, corrected, reason}`.
- **Frontend PasteTab**: `onPaste` handler detects `clipboardData.items` containing `image/*`, prevents default text-paste, converts to base64, calls the new endpoint.
- **Score card UI** renders after OCR: "N / M words recognised · X%" — green ≥85, amber 60–84, red <60. Colour-coded per Rich's ask ("47 out of 234 words maybe??").
- **Raw vs Cleaned toggle** — operators can flip between the verbatim OCR and the spell-checked version. Disabled + tooltipped when no corrections were needed (nit from testing agent, addressed).
- **Corrections list** — shows the first 8 word-level corrections inline (e.g. "shrza → Shiraz — spelling"), collapsible if more.
- **Image preview** — pasted screenshot renders as a thumbnail so operators can see what they pasted.
- **Auto-fills the textarea** with cleaned text so the existing `Extract Entries` flow just works. No new save path.
- **Testing**: end-to-end validated via testing_agent_v3_fork — 100% pass on frontend + backend. Simulated ClipboardEvent → OCR round-trip (~30s) → score card renders → discard clears state.

### Operator Guide: 4 flash-card decks · 69 cards total  (Feb 2026)
- **CRM deck** (20 cards) — Add · Prep · Send SMS · Call · Track · Bulk · Fix.
- **Pipeline board deck** (14 cards) — 5 columns · KPIs · drag rules · morning ritual · common pitfalls.
- **Compliance deck** (16 cards) — Ask · Audit trail PDF · LIP Audit Pack · APCO · Regulations · When to escalate.
- **Import & OCR deck** (19 cards) — Voice · Camera OCR · Paste (now with image + OCR score) · CSV · Bulk · Review · Fix.
- Reusable `FlashCardDeck.tsx` renderer — future decks are ~200 lines of typed data instead of 500 lines of UI + data.
- Live at `/admin/operator-guide` with `#crm-flash-cards`, `#pipeline-flash-cards`, `#compliance-flash-cards`, `#import-flash-cards` anchors.

### /home-v3 mockup — "The Storytelling Scroll"  (Feb 2026)
- Third homepage experiment: cinematic dark palette, cold-open at 3:47am, 7-chapter narrative (old way → transition → the answer → four chapters → cost → the choice).
- Live at `/home-v3` behind the gate (allowlisted). `/home-v2` remains as reference.


### Home 1 shop-window polish — trust chips · APCO strip · sync pricing · bookend router  (Feb 2026)
- **Audience router pill strip** added under the 4-pillar hero grid ("Which are you? 🍷 Just curious about wine → · 🍇 Making wine yourself →"). Borrowed the self-sort UX from `/home-v2` mockup without importing the Owen-heavy framing Rich flagged.
- **Trust chip strip** — compact credibility band directly below the hero: 🇦🇺 Australian-built · Wine Australia LIP-audit ready · APCO Assistant · Founding cohort 99.
- **APCO strip** — new compliance-wedge section between FounderStory and Pricing. Two-column layout: strip narrative + "What Ownology handles" bullet card. Deep-links to `/apco` and `/pricing`.
- **Home Pricing block synced** — was showing stale $16 / $41 / $83; now correctly reflects `/pricing` values with founding-→-retail ladder: $22/$28 · $44/$59 · $88/$124 + inline strikethrough retail chip.
- **Final CTA enhanced** — replaced generic "Talk to Us" mailto with "Play the 10-min sandbox" + bookend audience-router chips ("Not sure yet? 🍷 Try answer engine · 🍇 Book a winemaker call").
- **Verdict from user**: Home V2 was "very Owen", Home 1 "very rich and gel when you scrolled". Kept Home 1's density, added V2's best structural moves (self-sort + trust chips + APCO strip). `/home-v2` remains as hidden reference mockup.



### Nav slim-down — public gets 3 links, operator quick-links move to /admin  (Feb 2026)
- **C. Public "More" dropdown deleted from desktop chrome entirely.** Old
  version had 6 links (Our Story, Pricing, Getting Started, Blog, For
  Home Winemakers, FAQ). Prospects now see just PRIMARY_NAV (Ask Owen ·
  For winemakers · Pricing) + the hero pillar cards. Mobile drawer
  keeps a compact 3-item MORE_NAV (Our Story · Getting Started · FAQ)
  for touch users.
- **B. 4-column DO/KNOW/LEARN/GUIDE mega-menu moved to `/admin`.** Now
  lives as a "Marketing Quick-Links" panel below the Owner Tools grid,
  with the Clear Cache & Reload button relocated to its top-right.
  Public visitors never see a sitemap-style menu; operator keeps
  one-click access from the admin dashboard.
- **Mobile "Clear Cache" gated to admins only** — was globally visible
  before, no reason a prospect ever needs it.
- Dead code removed from Home.tsx: `MoreDropdown`, `NavLink`,
  `VINTAGE_NAV`, `KNOWLEDGE_NAV`, `BUSINESS_NAV`, `GUIDE_NAV`,
  `publicLinks`, `NAV_LINKS` (~130 LOC).

### Pre-redeploy de-risk sweep — public-surface audit  (Feb 2026)
- **Fake social proof killed**: removed the "N of 99 claimed" progress
  bar + counter from `/pricing`. Kept the founding-member offer copy
  itself. Stripe is still `sk_test_stub`, so the live counter was going
  to embarrass us the moment a savvy prospect clicked View Source.
- **Third-party manual name-drop swept**: `MoreWine and Scott Labs
  manuals` removed from every public-facing meta description, OG tag,
  and outbound email. Replaced with "industry-standard oenology
  references". Internal RAG code still references the actual manuals
  (correct — that's the ground truth). Files touched:
  `client/index.html`, `server/index.ts` (ROUTE_META + journal meta),
  `server/foundingReservationEmail.ts`.
- **Competitor-migration pages pulled from public**: `/for-innovint-users`
  and `/for-vintrace-users` removed from `PUBLIC_EXACT`, from the
  sitemap `STATIC_PAGES`, and explicitly `Disallow`-ed in both
  `client/public/robots.txt` and the dynamic `/api/robots.txt`. Routes
  still work for warm-outreach links; a raw crawler now hits the gate
  wall instead of a legally-adjacent competitor takeover page.
- **Pricing reconciled across `/guide` and `/pricing`**: `/guide` tier
  card prices updated from stale $41/$83 to matching $34/$69.
- **12 vs 99 founding-partner contradiction fixed**: "twelve founding
  partners" replaced with "a small circle of founding partners" on
  `FoundingPartners.tsx` + both `ROUTE_META` blocks. Keeps the
  exclusivity feel without contradicting the 99-subscriber offer on
  `/pricing`.
- **Undelivered feature claims trimmed**: The Press dropped "Phone &
  chat support" → "Email support" (no phone line wired). The Vigneron
  dropped "3 team seats included" + "Onboarding call — 30 min" →
  "Team seats (roll-out with multi-tenant)" (honest about status). FAQ
  answer on team seats updated to match.

### Event Ingest tool — `/admin/event-ingest`  (Feb 2026)
- New admin surface: paste any wine-event URL (Humanitix, Eventbrite,
  festival page). LLM extracts event metadata + full producer lineup,
  operator ticks who to research, per-row Perplexity deep-research fills
  in each contact draft, then batch-save into the CRM with the `event`
  field pre-filled.
- Backend: `outreach.parseEventUrl` tRPC procedure (built-in Claude
  Sonnet forge; no Perplexity credits burned at parse time).
- **Persistent ingest history**: every parse is upserted into a new
  `event_ingests` table (schema v22). Powers a forthcoming "Recent
  event ingests" panel + one-click "Add more from this event" — full
  producer snapshot re-hydrates without another LLM call.
- Backend also ships `outreach.listIngests` / `outreach.getIngest` /
  `outreach.deleteIngest` for the history UI.
- HiContact `/hi/:slug` warm-open copy is now future-aware: when the
  contact's notes carry a future `EventDate:`, the greeting flips from
  past-tense "We crossed paths at ___" to forward-tense "Looking forward
  to catching you at ___".
- First seed use case: Lost in the F.O.G. (Sat 1 Aug 2026, Sydney) —
  20+ Grenache producers ready to research.

### Sort selector on `/admin/contacts`  (Feb 2026)
- New dropdown next to the status-filter chips: Newest, Oldest,
  Name (A→Z), Winery (A→Z), Region (A→Z), State (A→Z), Status
  (Warm→Cold).
- Region parsed from `Region:` field in notes (populated by
  deep-research + event-ingest). State inferred from a curated
  AU-region→state map covering NSW/VIC/SA/WA/TAS/QLD/ACT/NT.
- Preference persists to `localStorage` under `ow_contacts_sort` so
  the operator's choice survives page reloads.

### Floating badge stack cleanup  (Feb 2026)
- Bug: The bottom-left `AdminQrBadge` and `GlobalThemeToggle` collided
  because both anchored to the same corner. QR badge now sits ~3.25rem
  above the theme pill (and lifts an extra 3.5rem when the PWA install
  banner is visible), so the two never overlap.

### Build manifest + `/admin/build-check`  (Feb 2026)
- New public endpoint `GET /api/build-info` returning commit hash, SW
  cache version, tRPC procedure count, DB table count, page count, top
  CHANGELOG entry, package.json version, and NODE_ENV. Cached 60s
  in-process.
- New `/admin/build-check` page fetches the manifest from both this
  build and the prod URL (default `https://ownology.app`, persisted per
  operator to localStorage) and diffs them field-by-field, refreshing
  every 30s. Any mismatch turns red with a plain-English hint. Answers
  "is prod current?" without waiting on a human.
- Backing files: `server/buildInfo.ts` (compute), `server/index.ts`
  (endpoint registered before `adminGate` so it's publicly readable —
  no secrets exposed), `client/src/pages/AdminBuildCheck.tsx` (UI).
- Root doc: `/app/BUILD_MANIFEST.md` — human-readable snapshot of the
  scope currently in this build + how the diff loop works.

### Cellar Board (RAG traceability)  (Feb 2026)
- Schema v23. `cellar_equipment.equipment_type` enum expanded from 9 →
  19 values to match the AWRI Practices Survey 2019 + Iland & Boulton
  WBS: adds hopper, scale, punch_down_rig, racking_cane, storage_tank,
  carboy, filter, bottling_filler, corker, labeller.
- New `cellar_equipment.wbs_phase` column (nullable enum:
  receival, crushing, fermentation, pressing_transfer, storage_ageing,
  bottling, other) auto-inferred from equipment type via
  `server/wbsPhase.ts` on insert.
- New table `batch_equipment_uses` — the traceability thread. One row
  per equipment-use event on a batch with direction (in/out/pass/note),
  phase, sanitation snapshot (task id + ok-flag + age-hours) captured
  at the moment of use so later cellar_task edits can't rewrite the
  audit trail. Ties to FSANZ 3.2.2 Clause 20 evidence requirements.
- Computed vessel RAG state (never stored — no drift):
  - 🟢 **Green** — sanitised, empty, within 72h freshness window
    (default from AWRI post-clean guidance; per-winery override to
    come via `winery_settings`).
  - 🟡 **Amber** — empty but sanitation expired or never done.
  - 🔴 **Red** — currently holding wine/must (last event = `in` with
    no matching `out`).
  - ⚫ **Grey** — open `fault_log` task on the vessel.
- New tRPC router `cellarBoard` with procedures:
  `board` (RAG wall + counts), `vesselStatus` (single-vessel drawer),
  `logUse` (fill/empty/pass event), `batchEquipment` (per-batch
  traceability sheet input), `equipmentHistory` (reverse lookup —
  every batch a piece of equipment touched).
- New page `/admin/cellar-board` — vessels grouped by WBS phase,
  filterable by state, per-vessel drawer shows recent uses with
  sanitation verification badges. Auto-refreshes every 30s. Discoverable
  from `/admin/dev` card.
- Backing files: `drizzle/schema.ts`, `server/db.ts`, `server/wbsPhase.ts`,
  `server/routers.ts` (new `cellarBoardRouter`), `server/index.ts`
  (idempotent ALTER + CREATE migration), `client/src/pages/AdminCellarBoard.tsx`.
- Smoke tested: board endpoint returns 10 correctly WBS-phased vessels
  in initial amber state (never sanitised → clean + sanitise before
  next use), with phase auto-inference working across all 5 equipment
  categories present in seed data (fermentation_tank → fermentation,
  press/pump → pressing_transfer, barrel → storage_ageing, destemmer
  → crushing, cold_room → fermentation).

---

Older shipped work lives inline in PRD.md (pre-Feb-2026); future entries
should land here so PRD.md can stay a spec, not a diary.

### Weekly BD Digest email  (Feb 2026)
- New scheduled handler `/api/scheduled/weekly-bd-digest` — Monday
  05:30 AEST Resend cron. Reads directly from `outreach_contacts` (no
  new tables, no LLM calls at digest time) and sends ONE HTML+text
  summary to `OPERATOR_ALERT_EMAIL` / `OWNER_EMAIL` covering the last
  7 days: sends (SMS/email breakdown), opens + view events, CTA
  clicks, hot alerts fired, demos booked, replies grouped by
  Claude-classified sentiment, up to 5 reply samples, and top 3
  hottest un-booked prospects (highest view count).
- Same env-var + secret + dry-run contract as `daily-alert-email` and
  `weekly-cellar-digest` (RESEND_API_KEY, ALERT_FROM_EMAIL, CRON_SECRET,
  ALERT_TEST_TO override). GET with `?dryRun=1` allowed for safe manual
  trigger; live send requires `x-cron-secret` header match if the env
  var is set.
- Backing file: `server/scheduled/weeklyBdDigest.ts`. Verified via curl
  — dry-run returns valid digest with 7-day window and correctly
  scoped counts.

### Public "How we trace" sales page  (Feb 2026)
- New public route `/how-we-trace`. Renders the exact same cellar-board
  UI (grouped by WBS phase, colour-coded RAG state, per-vessel drawer
  with sanitation badges) as the operator view at `/admin/cellar-board`
  — but points at a hand-tuned in-memory demo scenario ("Ownology
  Cellars — 2026 Vintage") so prospects can *see* the traceability
  machinery without signing up.
- Sells the recall-readiness story: one live batch (26SHZ-001) flows
  through Hopper → Sorting Table → Destemmer → Pump #1 → Hose #A →
  Tank 3, each step with sanitation timestamps. If the batch faulted
  tomorrow, every touch point is auditable in ten seconds.
- FSANZ 3.2.2 Clause 20 pull-quote positions Ownology as the recall
  answer that pours itself. SEO angle: "winery traceability software",
  "batch recall traceability", "FSANZ 3.2.2 winery evidence" — long-tail
  terms no AU vineyard-management ERP is ranking for yet.
- Added to `PUBLIC_EXACT` allowlists in both `server/index.ts` and
  `viteGateWall.ts`, and to the main `sitemap.xml` (priority 0.9).
- SW cache bumped to `ow-v6` so the new bundle lands with next deploy.
- Backing file: `client/src/pages/HowWeTrace.tsx`. Smoke-tested — page
  renders publicly (no gate redirect), correct `<title>` for SEO, all
  four RAG states visible in the sample data.

### Owen citations — homebrew-supplier scrub  (Feb 2026)
- Bug: `/ask` page's "Cited from" block was showing homebrew-supplier
  titles ("MoreWine! Red Winemaking Outline", "White Winemaking
  Outline") which undermined the "cited from the bibles" positioning.
- Fix (server + client + prompt, three-layer belt-and-braces):
  1. New `server/premiumCitations.ts` with `HOMEBREW_SUPPRESS_PATTERNS`
     denylist covering MoreWine, Northern Brewer, MidWest, E.C. Kraus,
     Winexpert, Winemaker Magazine, Amateur Winemaker, BeerSmith,
     Brulosophy, BrewersFriend, and the specific document titles "Red
     Winemaking Outline" / "White Winemaking Outline".
  2. `filterPremiumCitations()` applied at BOTH return points in
     `server/routers/tutor.ts` (commercial + DIY paths) — the block
     never shows suppressed titles.
  3. `scrubHomebrewMentions()` post-processor on the answer prose —
     replaces LLM name-drops like "the red winemaking outline" with
     generic phrasing ("the home-scale winemaking guide") so the body
     text is on-positioning too.
  4. DIY system prompt at `tutor.ts:502` tightened with an explicit
     "CITATION LANE" rule listing forbidden names and preferring the
     PREMIUM_BIBLES_LIST (AWRI, Boulton, Iland, Zoecklein, Ribéreau-
     Gayon, Australian Wine Regulations, FSANZ, OIV).
  5. Client-side mirror filter in `Ask.tsx` — belt-and-braces if a bad
     title ever slips through the server.
- Verified via curl: identical DIY question that previously returned
  "MoreWine! Red Winemaking Outline" now returns only "Australian Wine
  Regulations — Federal Regulatory Requirements For Australian
  Wineries", and the answer prose no longer names any suppressed
  source.

