# Deploying Ownology to Railway

Step-by-step guide to go from preview → production on `ownology.ai`.
The MySQL database is already on Railway, so this just adds the web service
into the same project.

---

## Before you start

You'll need:
- Your existing Railway project (the one with the MySQL service).
- Access to the DNS for `ownology.ai` (probably on whoever currently hosts your domain — Cloudflare, Manus, Namecheap, etc.).
- The `.env` values from `/app/.env` (we'll copy them over).
- ~15 minutes.

---

## 1. Push your code to GitHub

Your repo is already at https://github.com/iamrjpurr-pixel/ownology — Railway will pull from there.

Make sure the latest changes (everything we built in Emergent) are pushed to `main`:

```bash
# In Emergent: click the "Save to GitHub" button in the chat input,
# then verify on GitHub that the latest commits are there.
```

> ⚠️ Make sure **`.env` is in `.gitignore`** — never commit secrets. We'll set them via Railway dashboard instead.

---

## 2. Add the web service to Railway

1. Open your Railway project (the one with MySQL).
2. Click **+ New** → **GitHub Repo** → select `iamrjpurr-pixel/ownology`.
3. Railway auto-detects Node via the `nixpacks.toml` we shipped. The build will be:
   - `pnpm install --frozen-lockfile`
   - `pnpm build` (Vite + esbuild)
   - `pnpm start` (`node dist/index.js`)
4. Wait ~3 minutes for the first deploy to complete.

---

## 3. Set environment variables

In the new web service → **Variables** tab, add these.

The DB connection uses Railway's **internal** network for lower latency between services in the same project.

```env
# ── Database (Railway will autocomplete from the MySQL service)
DATABASE_URL=${{ MySQL.MYSQL_URL }}

# ── Runtime
NODE_ENV=production
PORT=8080
JWT_SECRET=<generate a random 64-char hex string>

# ── Identity
OWNER_OPEN_ID=<your stable user id>
OWNER_NAME=<your name>

# ── LLM (Emergent universal key — covers Claude + GPT + embeddings)
EMERGENT_LLM_KEY=sk-emergent-09cDbE821B070A4291
BUILT_IN_FORGE_API_URL=https://integrations.emergentagent.com/llm
BUILT_IN_FORGE_API_KEY=sk-emergent-09cDbE821B070A4291

# ── Public site URL (used in sitemap/RSS/social drafts)
PUBLIC_SITE_URL=https://ownology.ai

# ── Optional: social flywheel webhook (Zapier/Make/n8n) — leave empty for now
CELLAR_JOURNAL_WEBHOOK_URL=

# ── Stubbed until you decide (not blocking)
STRIPE_SECRET_KEY=sk_test_stub
STRIPE_WEBHOOK_SECRET=whsec_stub
BUILT_IN_FORGE_API_KEY=sk-emergent-09cDbE821B070A4291
BUTTONDOWN_API_KEY=
OAUTH_SERVER_URL=https://example.invalid

# ── Frontend env (Vite — these get baked into the bundle at build time,
#    so add them BEFORE the first build)
VITE_APP_ID=ownology
VITE_OAUTH_PORTAL_URL=https://example.invalid
VITE_FRONTEND_FORGE_API_URL=https://example.invalid
VITE_FRONTEND_FORGE_API_KEY=stub
```

**Tip**: generate `JWT_SECRET` locally with:
```bash
openssl rand -hex 32
```

After adding the vars, click **Deploy** to trigger a rebuild with the new env.

---

## 4. Confirm DB schema is up to date

We pushed all the schema changes (cellar_journal, embedding columns, etc.) during dev — so this is just a verification:

In Railway's MySQL service, open the database CLI tab and run:
```sql
SHOW TABLES;
DESCRIBE cellar_journal;
```

You should see `cellar_journal`, `sop_library`, `diy_knowledge_chunks`, `users`, etc.

If you ever want to re-run a schema push from your laptop:
```bash
git clone https://github.com/iamrjpurr-pixel/ownology
cd ownology
pnpm install
echo "DATABASE_URL=<your_railway_mysql_public_url>" > .env
pnpm drizzle-kit push
```

---

## 5. Add the domain `ownology.ai`

### 5a. In Railway
1. Web service → **Settings** → **Domains** → **Custom Domain**.
2. Enter `ownology.ai` (and add `www.ownology.ai` as a second domain if you want www).
3. Railway gives you a CNAME target like `xxxx.up.railway.app`.

### 5b. In your DNS provider (Manus / Cloudflare / wherever)
Add the records Railway tells you. Typically:
- `ownology.ai` → ALIAS / ANAME / CNAME-flat → `xxxx.up.railway.app`
- `www.ownology.ai` → CNAME → `xxxx.up.railway.app`

If your current DNS is at **Manus**, you may need to move DNS to Cloudflare (free) or Railway itself first, because some providers don't support ALIAS records at the apex.

### 5c. Wait
- TLS cert issuance: 1–5 minutes after DNS propagates
- DNS propagation: anywhere from instant to 24h depending on TTL

---

## 6. Smoke test the live site

Once you see "Active" with TLS on the Railway domain:

```bash
curl -I https://ownology.ai/                          # 200
curl -I https://ownology.ai/cellar-journal            # 200
curl    https://ownology.ai/api/trpc/cellarJournal.topics
curl    https://ownology.ai/sitemap.xml               # XML sitemap-index
curl    https://ownology.ai/api/cellar-journal/sitemap.xml  # dynamic XML
curl    https://ownology.ai/api/cellar-journal/rss.xml       # RSS 2.0
curl    https://ownology.ai/robots.txt                # robots
```

All should return 200 with the correct content.

---

## 7. Submit to Google

1. **Google Search Console** → add `ownology.ai` as a property (verify via DNS TXT).
2. Submit your sitemap: `https://ownology.ai/sitemap.xml`
3. Google will start crawling within a few hours.

---

## 8. Things to do AFTER first successful deploy

- [ ] Generate a real `JWT_SECRET` (don't reuse the dev one)
- [ ] Pick real auth (Emergent Google login / email-password) — currently dev-bypass = OFF in production, so login routes will fail. Decide soon.
- [ ] Wire Stripe (real test keys → live keys when ready)
- [ ] Pick storage (Cloudinary or skip)
- [ ] Set `CELLAR_JOURNAL_WEBHOOK_URL` to your Zapier hook for auto-social-posting
- [ ] **Add the Railway Cron jobs (see Section 8.1 below).**

---

## 8.1 Railway Cron Jobs — schedule for all scheduled endpoints

Railway's built-in Cron feature lives at **Railway dashboard → your service → Settings → Cron Schedule**. Add one cron entry per scheduled endpoint below. Times are UTC; the AEST equivalents shown are non-DST (add 1h during Sydney summer).

For each entry: **HTTP method: GET**, **URL: `https://www.ownology.ai/api/scheduled/<endpoint>`**, and (if you set `CRON_SECRET`) add header `x-cron-secret: <your-secret>`.

| Endpoint | Cron (UTC) | AEST equivalent | Purpose |
|---|---|---|---|
| `/api/scheduled/health-digest?send=1` | `0 20 * * *` | 07:00 daily | System health digest emailed to `ADMIN_EMAILS` (env vars · DB · Resend · LLM · auth) |
| `/api/scheduled/daily-alert-email` | `30 18 * * *` | 05:30 daily | Daily alerts (stuck ferment · temp excursion · SO₂ decay) |
| `/api/scheduled/weekly-cellar-digest` | `30 18 * * 0` | 05:30 Monday | Weekly Cellar Digest email to all winery users |
| `/api/scheduled/nurture-email` | `0 22 * * 2` | 09:00 Wednesday | Nurture drip to prospects who haven't signed up |
| `/api/scheduled/marketing-coach-email` | `0 21 * * 1` | 08:00 Tuesday | Marketing coach cadence (Rich-only owner email) |
| `/api/scheduled/trinity-newsletter` | `0 22 * * 4` | 09:00 Friday | Trinity Newsletter weekly cluster |

**Env vars this depends on** (all already set — verify on Railway before enabling crons):
- `RESEND_API_KEY` · `ALERT_FROM_EMAIL` · `ALERT_REPLY_TO` · `CRON_SECRET` (optional but recommended)
- `ALERT_TEST_TO` — **unset this on production** so emails go to real user inboxes, not your test inbox. Currently `iamrjpurr@gmail.com` in dev.

**Verification pattern:** trigger any cron manually first as a dry-run: visit `https://www.ownology.ai/api/scheduled/weekly-cellar-digest?dryRun=1` in your browser. You'll see a JSON summary of who would have received it, with zero emails actually sent. Once that looks right, enable the Railway cron.

---

## Rollback

If a deploy breaks production: Railway → web service → **Deployments** tab → click the previous successful deployment → **Redeploy**. Instant rollback. No data loss.

---

## Pricing rough estimate (Jan 2026)

- Web service: $5/mo + usage (typically $5–15/mo for a small site)
- MySQL: $5/mo + storage (you already pay this)
- Bandwidth: included up to 100GB/mo
- **Total: ~$10–20/mo while small. Scales with traffic.**

---

Built and tested in Emergent · January 2026.
