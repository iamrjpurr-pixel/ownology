# Ownology Copilot — Vintage-Grounded Caption Generator
## Strategic Build Doc

**Created**: 29 June 2026  
**Status**: Scoped, awaiting build green-light  
**Priority**: P1 (deferrable behind P0 ship blockers, but ready to ship in 1.5 days when triggered)

---

## 1. The Insight

A winemaker won't naturally recall vintage data ("Brix dropped 5.6 points in 4 days, ML inoculated yesterday"), but they'll naturally say something **romantic** about their cellar ("proud of the team after a long picking week").

**The unlock**: Combine the winemaker's emotion with Ownology's structured vintage data → captions that no other AI tool can write, because no other tool has the cellar data.

> **Winemaker provides the soul. Ownology provides the substance. The caption has both.**

This is the **same Learning Loop moat** that grounds Ownology's cellar advice in personal vintage logs — applied to a new job (storytelling).

---

## 2. Two-Layer Value Stack

```
                ┌─────────────────────────────────┐
                │   LAYER 2 — Distribution        │  ← Ownology's growth engine
                │   (SEO + viral on-platform)     │
                └─────────────────────────────────┘
                               ▲
                               │ every published caption
                               │ carries Ownology DNA
                               │
                ┌─────────────────────────────────┐
                │   LAYER 1 — Customer feature    │  ← Drives $99/mo retention
                │   (vintage-grounded captions)   │
                └─────────────────────────────────┘
```

- **Layer 1**: Keeps a winery paying you for the cellar tool, with captions as the sticky add-on
- **Layer 2**: Each published caption compounds Ownology's organic acquisition channel

Build Layer 1 without Layer 2 thinking = the feature becomes a commodity. Bake Layer 2 in from day one = it becomes a growth engine.

---

## 3. The Gen Z / Millennial Wedge

| | Older winemaker (>55) | Gen Z / Millennial winemaker |
|---|---|---|
| Personal brand on Instagram | None | **IS the winery's brand** |
| Switching software | Resistant | Will try if it helps personal brand |
| Will share/tag tools they love | No | **Instinctively** |
| Posts/vintage | 0–3 (delegated) | 30–100 (self-driven) |
| Influence on industry purchasing | Indirect | **Direct — peers watch what they use** |

**Strategic implication**: 5 millennial winemaker customers each posting Ownology-generated content to 800–3000 wine-industry followers = effective billboard for Ownology to the exact prospect pool. This is the right wedge audience.

---

## 4. Layer 2 — The Four Distribution Engines

### Engine 1: Backlink farm (opt-in attribution)
- Optional caption footer: *"↪ Stories powered by my cellar data — ownology.ai"*
- 30 customers × ~150 posts/yr × Instagram bios/profiles linking back = **~4,500 backlinks/year minimum**

### Engine 2: SEO story pages
- Every published caption becomes a server-rendered page at `ownology.ai/stories/<winery-slug>/<vintage>/<post-slug>`
- Each page = original UGC, ranks for long-tail searches (`"2026 vintage barossa shiraz"`, `"chardonnay malolactic completion"`)
- Each page has a "Want captions like this from YOUR cellar?" CTA at the bottom

### Engine 3: Hashtag aggregation
- Captions include `#poweredbyownology` (default on, opt-out)
- After one vintage, `#ownology` hashtag has hundreds of authentic vintage posts under it
- `ownology.ai/community` mirrors the hashtag — prospects see live customer activity

### Engine 4: Caption gallery / press hook
- `ownology.ai/best-captions-of-vintage-2026` — curated best work
- Press hook for WSJ wine columnist / wine trade media during vintage season

### Compounding math
| Year | Customers | Captions | Backlinks | Organic searches/mo |
|---|---|---|---|---|
| 1 | 30 | 4,700 | 750 | 2,000 |
| 2 | 80 | 12,500 | 2,400 | 8,000 |
| 3 | 200 | 31,000 | 6,000 | 30,000+ |

This is the SEO flywheel from the original PRD — **captions are the fuel that makes it actually flow**.

---

## 5. The 3-Phase Implementation Ladder

| Phase | Build | When | Proves |
|---|---|---|---|
| **1. Lite + SEO Hub** | `/captions` page + AI generation + SEO story pages + community feed | This sprint (~1.5 days) | Demand + SEO scaffolding ready for Day 1 |
| **2. SMS Bridge** | "Send to my phone" + deep links to IG/FB/LinkedIn apps | After Twilio is wired | Mobile-first publishing pipeline, no Meta API needed |
| **3. Hub (full Meta integration)** | Connect IG accounts, auto-post, schedule, analytics dashboard | After 50 paying customers | The full "channel everything through Ownology" vision |

**Why NOT skip ahead to Phase 3 first**: Instagram Graph API requires Meta App Review. 4–8 week timeline if you don't get rejected. Realistic to assume 2 rejection rounds. Plus token rotation, security liability (holding posting tokens for prospects' Instagram accounts), and competing with Buffer/Later on scheduling UX which is their core moat.

**Why Phase 2 (SMS bridge) is the clever middle path**: delivers ~90% of the "channel through Ownology" feeling without Meta API entanglement. User taps "Send to my phone" → SMS arrives → tap deep link → IG opens with clipboard pre-filled. Multi-platform free. No security risk.

---

## 6. Phase 1 — Detailed Build Scope (this sprint)

### Routes
- `/captions` — generate page (form + 3-card output)
- `/stories/:winerySlug/:vintage/:postSlug` — server-rendered SEO story page
- `/community` — live feed of recent public stories across all customers
- `/c/:hashtag` — hashtag aggregation pages for long-tail SEO

### Database — new tables

```typescript
captions: {
  id: serial PK
  userId: varchar (FK users.openId)
  tankRef: varchar (links to vintage_log_entries.tank_name)
  emotionalPrompt: text          // "proud of the team after a long picking week"
  voice: enum('casual','poetic','educational')
  generatedAt: bigint            // epoch ms
  variants: json                 // [{text, hashtags, length}, ×3]
  selectedVariantIdx: int        // which one they kept
  publishedAt: bigint nullable
  visibility: enum('public','public-no-attribution','private')
  attribution: boolean default true
  postSlug: varchar (unique)     // url segment for /stories
  copiedAt: bigint nullable      // when they hit copy
  sentToPhoneAt: bigint nullable // when they used SMS bridge
}

caption_engagement: {            // populated when winery shares back metrics
  captionId: int FK
  platform: enum('instagram','facebook','linkedin','x','other')
  likes: int
  comments: int  
  reach: int
  reportedAt: bigint
}
```

### tRPC procedures

```typescript
// captions.ts router
captions.generate({
  tankRef: string,
  emotionalPrompt: string (min 5 chars, max 280),
  voice: 'casual'|'poetic'|'educational'
}) → { variants: [{text, hashtags, length}, ×3], captionId }

captions.publish({
  captionId: int,
  selectedVariantIdx: 0|1|2,
  visibility: 'public'|'public-no-attribution'|'private'
}) → { postUrl: '/stories/...' or null }

captions.markCopied({captionId, variantIdx}) → mutation
captions.markSentToPhone({captionId}) → mutation (Phase 2)

captions.publicFeed({limit?, winerySlug?}) → for /community + /stories pages
captions.byHashtag({tag, limit?}) → for /c/:hashtag pages

// Admin
captions.adminStats() → ownerProcedure → top voices, top tanks, copy-rate, publish-rate
```

### AI prompt assembly (server-side, in captions.generate)

```
Input the LLM receives:

WINEMAKER'S EMOTION: <user-typed emotionalPrompt>
VOICE: <casual|poetic|educational>

CELLAR FACTS (from latest 5 vintage_log_entries for tankRef):
- Tank 7 — Block 4 Shiraz 2026
- 4 days ago: Brix 24.3 at picking, pH 3.55
- 3 days ago: cap punched, observation "huge colour extraction"
- 2 days ago: Brix 21.1, ferment kinetics good
- Yesterday: Brix 18.7, ML inoculated
- This morning: pH 3.62, colour "leaping out of the cap"

WINEMAKER VOICE NOTES (if provided):
<paste their last 3 captions for style mimicry — V1.5 feature>

OUTPUT: 3 caption variants in the chosen voice.
- Variant 1: short (Instagram primary feed, ~125 chars)
- Variant 2: medium (Facebook/general, ~280 chars)
- Variant 3: long-form (LinkedIn, ~600 chars, more reflective)
Each MUST weave 1-2 specific cellar facts into the emotional thread.
Each ends with 4-6 hashtags including #vintage2026 + region-specific tags.
```

Model: `claude-sonnet-4-6` (best on poetic/casual voice tasks).

### UI shape

```
/captions page (auth-required)

┌──────────────────────────────────────────────────────────────┐
│  Generate captions from your cellar                          │
│                                                              │
│  Tank/wine        ▼  Tank 7 — Block 4 Shiraz 2026           │
│                                                              │
│  How are you feeling?                                        │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ proud of the team after a long picking week           │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Voice            ▼  Poetic                                  │
│                                                              │
│             [ ✦ Generate 3 captions ]                       │
└──────────────────────────────────────────────────────────────┘

After generation, 3 cards stacked vertically:

┌──────────────────────────────────────────────────────────────┐
│  Variant 1 · Short (Instagram primary feed)                  │
│                                                              │
│  "Four days ago, Block 4 was still on the vine. Tonight,    │
│   Tank 7 is two-thirds through ferment — the cap leaps with │
│   colour every pump-over. Proud of the team. 🍷             │
│   #vintage2026 #shiraz #blockstory #cellarwork"            │
│                                                              │
│  [📋 Copy]  [🔄 Regenerate this one]  [📱 Send to phone]    │
│                                                              │
│  Visibility: ◉ Public  ○ Public no attribution  ○ Private  │
│  [📤 Publish to ownology.ai/stories/<my-winery>]            │
└──────────────────────────────────────────────────────────────┘
```

### SEO story page shape

`/stories/brokenwood-wines/2026/four-days-ago-block-4`

```html
<head>
  <title>Block 4 Shiraz · Day 4 of ferment · Brokenwood Wines · Vintage 2026 | Ownology</title>
  <meta name="description" content="Four days ago, Block 4 was still on the vine..."/>
  <link rel="canonical" href="https://ownology.ai/stories/brokenwood-wines/2026/four-days-ago-block-4"/>
  <meta property="og:image" content="..."/>
  <script type="application/ld+json">
    { "@context": "https://schema.org", "@type": "Article", ... }
  </script>
</head>
<body>
  <article>
    <h1>Four days ago, Block 4 was still on the vine...</h1>
    <p>{caption text}</p>
    <aside>From Brokenwood Wines · Vintage 2026 · Block 4 Shiraz · {dateStr}</aside>
    
    <!-- This is the conversion CTA on every story page -->
    <section class="cta">
      <h2>Want captions like this from your cellar?</h2>
      <p>Ownology writes stories grounded in your actual tank data + your voice.</p>
      <a href="/free-run">Try the cellar copilot free →</a>
    </section>
    
    <!-- Related stories from this winery -->
    <section class="related">
      <h3>More from Brokenwood Wines · Vintage 2026</h3>
      <ul>{3-5 sibling stories}</ul>
    </section>
  </article>
</body>
```

### Sitemap integration
- `/sitemap.xml` auto-updates whenever a caption is published with `visibility !== 'private'`
- New sitemap entry: `<url><loc>{full url}</loc><lastmod>{ISO}</lastmod></url>`
- Pings Google Search Console on each new publish via existing seo router

---

## 7. Quality Bar (must-haves before this ships)

The captions MUST actually be good — otherwise no winemaker will publish them, the SEO engine has no fuel, and the entire flywheel dies. Acceptance criteria:

- ✅ Every variant weaves at least ONE specific cellar fact (Brix number, ferment day, tank name, ML status, etc.) into the emotional thread
- ✅ Voice consistency: same emotion + same voice + different tanks should still feel like the same brand
- ✅ Hashtags are real, regionally accurate, and topical (no `#wine #wineporn #winelife` slop)
- ✅ Generated copy never contains tokens like "[winery name]" or "[insert detail here]" — sanity check in the LLM response parser
- ✅ Max 280 chars (variant 1), 280–500 (variant 2), 500–800 (variant 3) — enforce in code, regenerate if violated

**Pre-launch validation**: Generate 30 captions across 3 voices × 10 fictional cellar scenarios. Manually rate each on 1–5 (publishable vs slop). Need average ≥ 4 on each voice before shipping.

---

## 8. Phasing & Dependencies

### Phase 1 dependencies (this sprint)
- ✅ Existing `vintage_log_entries` table (tank data source — already populated for dev users via `seed-mock-data.mjs`)
- ✅ Existing LLM router + Emergent LLM key + Claude Sonnet 4.6 access
- ✅ Existing `users` table for auth scoping
- ✅ Existing site-rendered marketing routes (Express + Vite static)
- ⏳ **Auth (P0 #1)** — `/captions` should be authenticated; relies on real auth landing first OR uses the existing dev-bypass user

### Phase 1 effort estimate
| Task | Effort |
|---|---|
| DB migrations (captions + caption_engagement tables) | 1 hr |
| Schema.ts updates | 0.5 hr |
| `captions.ts` tRPC router (generate, publish, markCopied, publicFeed, byHashtag, adminStats) | 4 hrs |
| LLM prompt assembly + variant parsing + voice validation | 2 hrs |
| `/captions` page (form + result cards + voice toggle) | 3 hrs |
| `/stories/:winery/:vintage/:slug` page (SSR-ready) | 2 hrs |
| `/community` feed page | 1 hr |
| `/c/:hashtag` aggregation page | 1 hr |
| Sitemap auto-update hook | 1 hr |
| Quality validation pass (30 captions × manual rating) | 1.5 hrs |
| **Total** | **~17 hrs ≈ 1.5 days** |

### Phase 2 dependencies (SMS bridge)
- Twilio account + AU number provisioned
- `SMS_INBOUND_NUMBER` env var set (already prepared from the A/B test work)
- Captions endpoint `markSentToPhone` mutation (already designed above)

### Phase 3 dependencies (full Meta integration)
- 50+ paying customers (to justify the 6-week investment + give Meta App Review reviewers something to look at)
- Meta App Review submission with privacy policy + ToS + business verification
- Token rotation + refresh infrastructure
- Security audit / SOC 2 prep (we're now holding posting tokens for customers' Instagram accounts)

---

## 9. Open strategic decisions (to revisit before greenlight)

1. **Pricing**: Bundle into Premium $99/mo (recommended) vs `$19 for 10-pack` add-on vs free-forever-for-attribution
2. **Default visibility**: Public + attributed (fastest SEO flywheel) vs Private by default (most respectful) — recommend Public + attributed because winery is getting it free initially, fair trade
3. **Attribution copy**: needs winemaker focus group input. Candidates:
   - *"↪ Story powered by my cellar data — ownology.ai"*
   - *"via @ownology"*
   - *"Cellar story by Ownology"*
4. **Hashtag default**: `#poweredbyownology` (clearer attribution) vs `#ownology` (cleaner) vs both
5. **Auto-generate from cellar events?** — V2 idea: when a tank hits ML completion, Ownology pre-drafts a caption automatically and notifies the winemaker. Removes the "open the captions tab" friction.

---

## 10. Risks / Watch-outs

| Risk | Mitigation |
|---|---|
| Captions are AI-slop, no one publishes | Pre-launch quality validation (§7); voice diversity; fact-grounding enforcement |
| Wineries resent forced attribution | Make it opt-in/opt-out per caption, default opt-in but never required |
| Meta penalises auto-generated content (if we add API integration in Phase 3) | Phase 2 SMS bridge sidesteps this entirely; Phase 3 captions look identical to human-written |
| Captions plagiarise from training data | Disclaimer in ToS; LLM prompt explicitly instructs "original phrasing, no quotes" |
| SEO pages get penalised as "doorway pages" | Each story page is genuinely unique UGC; not just template + variables; Google distinguishes |
| Distracts from P0 ship blockers | This doc is PARKED until P0 done OR user explicitly greenlights (currently parked) |

---

## 11. Success Metrics (post-launch)

| Metric | Target after 30 days | Target after 6 months |
|---|---|---|
| Captions generated/customer/month | 5 | 15 |
| Publish-rate (gen → public published) | 30% | 50% |
| Story pages indexed by Google | 50 | 500 |
| Organic searches to ownology.ai from caption-driven keywords | 50/mo | 1,000/mo |
| Customers attributing posts back to Ownology (hashtag/footer) | 60% | 80% |
| Direct sign-ups attributed to story page CTAs | 1 | 10 |

---

## 12. Triggers to ship

Ship Phase 1 immediately when ANY of these are true:
- P0 ship blockers (auth, Stripe, DNS) are complete → next priority
- A specific VIVID prospect explicitly asks "does this also help me with social?"
- You decide the SEO flywheel needs to start compounding NOW (every week of delay costs you backlinks you'll never get back)

**Until then**: this doc is the contract. When you say "build Copilot", I read this doc and execute exactly. No re-spec needed.

---

## Cross-references

- Original problem statement & SEO flywheel context: `/app/memory/PRD.md` § "Goals"
- Auth status (P0 blocker): `/app/memory/PRD.md` § P0 #1
- Existing cellar data source: `vintage_log_entries` table (schema.ts L500-540)
- Existing LLM infrastructure: `server/_core/forgeShim.ts` + `server/_core/llmMeter.ts`
- Existing SEO router (sitemap, search console ping): `server/routers/seo.ts` (if present — verify)
- Related CRM/funnel infrastructure (for measuring story-page conversions): `server/routers/funnel.ts`, `pricing_views` table

---

*This doc represents ~1 hour of strategic conversation between Roy (founder) and the Emergent build agent on 29 June 2026, distilled into actionable build scope. The technical implementation in §6 is fully ready to execute on greenlight — no re-design pass needed.*
