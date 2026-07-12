# Railway env var cleanup — 3 fixes, ~5 minutes

**Where you're going:** [railway.app](https://railway.app) → open your Ownology project → click the **web service** (not the MySQL one) → **Variables** tab.

Do them in order. After each save, Railway auto-redeploys in ~1 min. You can verify each fix on **`https://ownology.ai/admin/health`**.

---

## ① Delete `ALERT_TEST_TO` — 30 seconds

**Why:** Right now every email (Weekly Cellar Digest, Daily Alerts, Health Digest) is being redirected to your test inbox instead of real recipients. Kill this and emails will go where they should.

**Steps:**
1. In the Variables tab, find the row `ALERT_TEST_TO` (value is probably `iamrjpurr@gmail.com`)
2. Click the **⋮** (three dots) on that row → **Delete**
3. Confirm

**Verify:** After redeploy (~1 min), open [ownology.ai/admin/health](https://ownology.ai/admin/health) → the **Env vars** row should no longer mention `ALERT_TEST_TO`.

---

## ② Fix the whitespace in `JWT_SECRET` — 30 seconds

**Why:** Your `JWT_SECRET` has an invisible leading or trailing space. JWT auth silently breaks when this happens — logins fail intermittently in weird ways.

**Steps (option A — clean the existing value):**
1. Find `JWT_SECRET` in Variables
2. Click the row to open the edit box
3. **Triple-click** the value to select the whole thing
4. Paste it into a text editor (VS Code / Sublime / TextEdit) to see the spaces
5. Delete any leading/trailing space, paste back into Railway, save

**Steps (option B — regenerate from scratch, cleaner):**
1. On your Mac Terminal, run: `openssl rand -hex 32`
2. Copy the output → paste as the new `JWT_SECRET` value in Railway → save
3. ⚠️ Doing this logs everyone out (including you). Fine if it's just you right now. You'll re-login on next visit.

**Verify:** `/admin/health` → **Env vars** probe should show `OK`, not `WARN`.

---

## ③ Confirm `ALERT_FROM_EMAIL=owen@ownology.ai` — 15 seconds

**Why:** Your Resend domain (`ownology.ai`) is already verified. Just make sure the sender email matches.

**Steps:**
1. In Variables, find `ALERT_FROM_EMAIL`
2. Value should be exactly: `owen@ownology.ai`
3. If it's anything else (like `onboarding@resend.dev` or empty), update it and save

**Verify:** `/admin/health` → **Resend** row should read `Sender owen@ownology.ai · 1 verified domain(s): ownology.ai` and be **green OK**.

---

## When all 3 are done

Ping Rich's agent. Agent will run the health digest end-to-end from `/admin/health` → **Run watch + send** — a real email should land in the admin inbox from `owen@ownology.ai`. That's the proof production emails are now live and going to the right place.

**Deferred (not doing now):**
- Stripe live keys — waiting on Rich
- Real OAuth (currently stubbed at `example.invalid`) — parking until public signups
