# Ownology — Backlog & Ideas

Living document. Every "Potential improvement 💡" and "Next Action Item" from agent sessions lands here so nothing gets lost across forks/sessions.

Last consolidated: 28 Jun 2026.

---

## 🎯 P0 — Strategic / Revenue

### Demo to a real winemaker
The full moat (personal history + reasoning + alerts + bibles + AU/NZ regulations) is **end-to-end demoable** on the live URL right now. Outreach targets:
- Tamburlaine (Orange, NSW) — boutique premium
- Tyrrell's (Hunter Valley) — heritage
- Brokenwood, Yarrh, Murray Street — boutique
- Tom Carson / Yabby Lake (Mornington) — Pinot
- Any cellar-floor team running 50–300+ tanks during a vintage

The pitch: "Send me one past vintage's notes. I'll show you the AI tutor citing your own decisions back to you within 15 minutes."

### "Past-vintage notes" homepage demo form 💡
A single `/demo` page on the homepage: visitor pastes any old harvest notebook → system parses → asks them one Tank-specific question → AI replies with their own data cited. Zero-friction demo of the moat, with the parsed data optionally seeding their trial account. **Single best conversion flow** — outperforms any pricing page.

### Cellar-Journal SEO flywheel: `/ask` page 💡
A single new public page `/ask` where ANY visitor types any winemaking question → AI answers grounded in our private bible-RAG → every Q auto-saves to `cellar_journal` as a gated public SEO page. Trinity clustering already handles canonicalisation. Each answer = 1 new SEO entry growing organic traffic for free.

---

## 🟠 P1 — Engagement / Retention

### Daily 7am alert email (via Resend) 💡
Wire a daily cron that scans each user's `vintageLog.alerts` and sends a morning briefing email: *"Good morning — Tank 9 Shiraz needs DAP today, Tank 5 Cab is running hot, Tank 2 Merlot is ready to rack."* The "AI assistant who actually walks the cellar with you" moment that investors and winemakers both fall in love with. Drives app-open frequency.

### Real-time push notifications
Once the email loop works, add browser push / SMS (Twilio) for high-severity alerts (stuck ferment, high temp >26°C). Cellar floor doesn't always check email.

### Custom domain `ownology.ai`
Point DNS to Railway. ~10 minutes on your DNS provider. Step-by-step:
1. In Railway → ownology service → Settings → Networking → Custom Domain
2. Add `ownology.ai` (and optionally `www.ownology.ai`)
3. Railway gives you a CNAME / A record value
4. In your DNS host, create the record and wait 5–60 min for propagation

### Real Stripe price IDs + product setup
Currently using stubbed test keys. Need:
- Real Stripe account at stripe.com
- Create 3 products: Free, Premium ($99/mo), Enterprise ($499/mo)
- Add Price IDs to Railway env vars (`STRIPE_PREMIUM_PRICE_ID`, `STRIPE_ENTERPRISE_PRICE_ID`)
- Switch keys from `sk_test_*` → `sk_live_*`

---

## 🟡 P2 — Product depth

### The Press post-harvest correlation engine
Strategy-doc P0 for vintage debrief. For each finished batch, generate a debrief: *"Your tanks fermented at 18°C averaged 1.5 days faster than 19°C tanks. Recommend 18°C as 2027 standard."* Needs:
- A `vintage_summaries` table (winery_id, vintage_year, batch_id, final_metrics_json, quality_score, AI_debrief_md)
- Cron job that runs after a batch is marked Complete
- LLM call that correlates events + final metrics + quality scores → narrative debrief
- UI surface at `/the-press/vintage/{year}`

### Multi-tenant winery model
Strategy doc calls for `wineries` table + cellar-team roles. Build when the first winery onboards multiple staff. Schema additions:
- `wineries` (id, owner_id, name, region, total_tanks)
- `winery_members` (winery_id, user_id, role: owner/cellar_lead/harvest_intern)
- Add `winery_id` FK to `vintage_log_entries`, `sop_library`, `cellar_journal`
- Role-based gating in `trpc.ts` (e.g. only owner can edit SOPs; cellar_lead can log; intern can only view)

### Voice input on QuickEntry
Strategy doc lists it as a must-have. Web Speech API for browsers, fall back to OpenAI Whisper via Emergent integration for accuracy. "Tank 7 Shiraz, Brix 24.3, time 14:30" → parsed and pre-filled.

### Phase 2 router refactor
Continue the `routers.ts` split (1,556 LOC remaining). Next 4 extraction targets:
- `complianceRouter` (~212 LOC)
- `siteContentRouter` (~213 LOC)
- `cellarTasksRouter` (~148 LOC)
- `cellarEquipmentRouter` (~98 LOC)
**Playbook (learnt from Phase 1 regression):** BEFORE deleting a sub-router from `routers.ts`, grep the moved router for ALL `from "../db.js"` and `from "./trpc.js"` symbol references AND audit which symbols are still needed by the routers staying behind. The Phase 1 regression (`listVintageLogEntries` dropped from imports → dashboard.getStats 500) was caused by skipping this step.

### Router-level performance dashboard `/admin/perf` 💡
tRPC middleware tracking p50/p95/p99 latency + cost per procedure. Each extracted sub-router file becomes a measurable unit. Useful for the investor pitch ("our most expensive AI call is X ms; cost per query is Y").

---

## 🟢 P3 — Polish / Future

### Native mobile apps (iOS / Android)
Strategy doc has these as Q4 2026 / Q1 2027 goal. React Native — share most of the business logic. Worth it once 50+ wineries onboard and they're complaining about iPad-only cellar use.

### File/image upload archive (Cloudinary or Emergent storage)
Originally requested but deferred — current AI flow extracts structured data straight to `vintage_log_entries`, so raw PDFs/photos aren't strictly needed. Add only if winemakers want a permanent archive of original lab slips, vintage photos, etc.

### Compliance audit trail PDF export
Strategy doc lists: regulator turns up, "generate audit trail" button on Compliance page → exports all `vintage_log_entries` with `compliance_records` matched, formatted for inspection. Big trust signal.

### Winery onboarding wizard
First-time setup: name, region, tank count, varieties grown → seeds initial SOPs filtered by region. Make the first 5 minutes feel magical.

---

## 📦 Mocked / Stubbed (not actively built)

| Feature | State |
|---|---|
| Authentication | **Fully bypassed** (auto-injects seed admin) — restore via `NODE_ENV` check in `server/trpc.ts` when ready |
| Stripe payments | Test keys only |
| File uploads | Disabled |
| Push notifications | Not wired |
| SMS alerts (Twilio) | Not wired |
| Email (Resend) | Not wired |

---

## 🔁 Discoverability rules for future agent sessions

When the agent finishes a feature and writes a "Potential improvement 💡" or "Next Action Items" block:
1. The block goes into the chat (user sees it once)
2. **AND** it must be appended/merged here in `/app/memory/ROADMAP.md`
3. Each item: title + priority + 1–2 sentence why + acceptance criteria if obvious

This way new forks pick up the full backlog by reading this file alongside `PRD.md`.
