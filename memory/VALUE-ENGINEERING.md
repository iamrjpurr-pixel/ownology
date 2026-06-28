# Ownology — Value Engineering Doctrine

> *"Do the most with the least. Extend before building new."*
> — Value Engineering Roadmap v2

This file is a hard constraint on every agent decision and every code change. Future agent sessions MUST read this before proposing or building anything.

Last updated: 28 Jun 2026.

---

## The Cost Surfaces We're Defending

Every feature trades against one or more of these. Name the cost before you build:

| Cost | What burns it | Sensitivity |
|---|---|---|
| **Emergent LLM credits** | tutor.ask, freeRun.curiosityAsk, parseFromImage (vision = expensive), parseFromText, generateVintageCard, Trinity clustering, SOP embedding backfill | **HIGH** — uncapped, scales with users |
| **Railway compute** | Always-on Express container, background jobs, frequent polls (e.g. Dashboard `refetchInterval: 60s`) | Medium — billed per hour |
| **Railway MySQL** | Storage tier + read/write IOPS; vector storage if added | Medium |
| **Agent build credits** | Every feature you build/refactor in this chat | **HIGH** — finite, user pays |
| **Dev cognitive cost** | Code volume, file count, refactor risk | Compounds with all the above |

---

## The 5-Question Filter (run BEFORE you build)

For any proposed feature, refactor, or new file, the agent MUST be able to answer YES to ≥3 of these:

1. **Is the same value already in the codebase?** Search first. Extend an existing router/component/helper before adding a new one.
2. **Does this earn its LLM-cost?** If it makes an extra LLM call, what's the unit economics? Could a cached/templated answer do 80% of the job?
3. **Can a cheaper model do this?** Default to the smallest model (`gpt-5.2-mini` / `claude-haiku`) and only escalate to Claude-Sonnet / GPT-5.4 when the smaller model demonstrably fails.
4. **Is this needed NOW, or is it speculative?** Speculative features = future agent credits with zero validation. Defer until a real user (or the strategy doc) names it as urgent.
5. **Does this remove more code than it adds?** Refactors that net-add LOC without removing duplication should be paused.

If <3 YES, the answer is **defer to ROADMAP.md** with priority tag, not build.

---

## Concrete Cost-Saving Levers (apply on every feature)

### LLM calls
- **Model defaults**: `gpt-5.2-mini` for routine Q&A. `claude-sonnet-4.6` ONLY for complex/multi-step reasoning. Never default to `gpt-5.4` or `claude-opus-*` without a measured reason.
- **Cache aggressively**: Trinity clustering already de-dupes Q&A. Extend this — same question from anyone should return the same cached answer.
- **Trim context**: `getUserCellarContext` caps at 25 entries × ~250 chars = ~6KB. Audit other prompt builders for similar caps.
- **Combine calls**: e.g. `parseFromImage` + `parseFromText` should be ONE vision call when the image is provided — never two.
- **Skip when not needed**: don't call LLM for purely deterministic things (date formatting, regex matching, JSON validation).

### Polling / cron
- **No polling at <60s** unless harvest-critical. Dashboard alerts at `refetchInterval: 60_000` is the absolute floor.
- **No background cron** unless it pays back in user value. Trinity clustering refresh = yes (compounds SEO). Vintage reminders = yes (engagement). Generic "data sync" jobs = no.

### Code volume
- **Extend > Build new.** Before creating a new file, ask: "can this go into an existing file in the same directory?"
- **Refactors must net-remove code** (or the regression risk must be paid back by an obvious cleanup win).
- **`server/routers/` Phase 2 split** (compliance, siteContent, cellarTasks, cellarEquipment) is value-positive only if the file is touched often enough to make navigation cost > extraction cost. If not — leave it.

### Storage
- **No new tables** unless an existing one can't represent the data. The `vintage_log_entries.details_json` field absorbed the "Why?" reasoning capture without a schema change. That's the model.
- **No raw file storage** (Cloudinary, S3) until a user explicitly requests it AND the extracted-text path can't deliver the value.

### Testing
- **Reuse existing pytest files** (`/app/backend/tests/test_*.py`). Don't generate new ones unless behaviour is genuinely new.
- **One testing-agent invocation per shippable feature batch.** Not per file change.

---

## Retroactive audit of recent suggestions (against the filter)

| Suggestion (from ROADMAP.md) | Filter score | Verdict |
|---|---:|---|
| **Demo to a real winemaker** | 5/5 | KEEP — zero build cost, validates moat |
| **"Past-vintage notes" demo form** | 4/5 | KEEP — reuses tutor.ask + parseFromText (extension, not new) |
| **Cellar-Journal SEO `/ask` page** | 3/5 | KEEP but cap LLM cost: cache before LLM call, rate-limit per IP |
| **Daily 7am alert email** | 4/5 | KEEP — but use Emergent's Resend integration only, no new cron infra |
| **Push notifications** | 2/5 | **DEFER** — speculative, no user has asked, requires new integration |
| **Custom domain ownology.ai** | 5/5 | KEEP — DNS-only, zero build cost |
| **Real Stripe price IDs** | 5/5 | KEEP when revenue is real, not before |
| **Post-harvest correlation engine** | 4/5 | KEEP — high-value, strategy-doc P0 |
| **Multi-tenant winery model** | 3/5 | **DEFER UNTIL FIRST WINERY** — building it before there's a customer is speculative |
| **Voice input on QuickEntry** | 3/5 | **DEFER** — Web Speech API is free if used; only call Whisper if speech recognition fails. Build only when a real user asks. |
| **Phase 2 router refactor** | 2/5 | **DEFER** — net-adds LOC, low immediate user value |
| **Router perf dashboard `/admin/perf`** | 2/5 | **DEFER** — speculative; add tRPC middleware first to *measure* costs without a UI surface |
| **Native iOS/Android apps** | 1/5 | **DEFER UNTIL 50+ WINERIES** — strategy doc agrees |
| **File/image upload archive** | 1/5 | **DEFER INDEFINITELY** — extracted-text path covers the value |
| **Compliance audit trail PDF** | 4/5 | KEEP — high trust signal at low cost (reuses existing data) |
| **Winery onboarding wizard** | 3/5 | KEEP after first paying winery confirms friction |

**Net effect of running the filter:** ~7 items demoted from "build" to "defer". That's the doctrine working.

---

## Standing rules for the agent

1. **Before writing ANY new file**: grep the codebase for the symbol/function you're about to create. Extend it if it exists.
2. **Before adding ANY new LLM call**: name the model, name the cost, name the cache strategy. Never `gpt-5.4` as default.
3. **Before adding ANY new tRPC procedure**: confirm it can't live as a query parameter on an existing procedure.
4. **Before any refactor**: confirm it net-removes LOC OR resolves a measured regression risk. "Cleanliness" alone isn't enough.
5. **When asked "should we build X?"**: run the 5-question filter, show the score, and recommend defer-to-ROADMAP if <3 YES.

---

## How to keep this honest

Future agent sessions should append a one-line "value engineering check" inside each `finish` summary. Format:
```
Value-engineering check: [score]/5. Cost burned: ~[N] LLM calls + [M] LOC added/removed.
```

If the agent can't be bothered to compute it, the agent shouldn't have built it.
