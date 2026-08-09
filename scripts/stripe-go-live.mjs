#!/usr/bin/env node
/**
 * scripts/stripe-go-live.mjs
 *
 * One-command Stripe activation for Ownology.
 *
 * What this does (in order):
 *   1. Sanity-checks that STRIPE_SECRET_KEY is present in the current shell.
 *   2. Runs `scripts/stripe-setup.mjs`, which creates/updates all 6 products
 *      (3 tiers × monthly + annual) and writes `.env.stripe` at repo root.
 *   3. If the Railway CLI is installed AND linked to a project, uploads
 *      every line in `.env.stripe` via `railway variables set`.
 *   4. Polls `<APP_URL>/api/trpc/foundingMembers.stripeReady` until it
 *      returns `{ ready: true, hasPriceIds: true }` — proving the deploy
 *      picked up the new env vars and the paywall is live.
 *
 * Skipping steps you don't want:
 *   --skip-setup      : reuse the existing `.env.stripe` file (don't call Stripe)
 *   --skip-railway    : don't attempt Railway upload (print instructions instead)
 *   --skip-poll       : don't wait for the deploy to flip stripeReady=true
 *   --app-url=<url>   : override the polling target (default: env.APP_URL
 *                       or https://www.ownology.ai)
 *   --timeout=<sec>   : how long to wait for the deploy (default: 300 = 5 min)
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-go-live.mjs
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-go-live.mjs --app-url=https://www.ownology.ai
 *
 * Feb 2026 · Rich. Companion to stripe-setup.mjs — this is the operator's
 * "make the paywall go live" button.
 */

import { spawnSync, execSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const __filename = fileURLToPath(import.meta.url);
const repoRoot = resolve(dirname(__filename), "..");
const envStripePath = resolve(repoRoot, ".env.stripe");

// ── Parse flags ─────────────────────────────────────────────────────────
const args = new Set(process.argv.slice(2));
const flag = (name) => args.has(name);
const arg = (name, fallback) => {
  const hit = [...args].find((a) => a.startsWith(`${name}=`));
  return hit ? hit.split("=", 2)[1] : fallback;
};

const skipSetup = flag("--skip-setup");
const skipRailway = flag("--skip-railway");
const skipPoll = flag("--skip-poll");
const appUrl = arg("--app-url", process.env.APP_URL || "https://www.ownology.ai").replace(/\/$/, "");
const timeoutSec = parseInt(arg("--timeout", "300"), 10);

// ── Helpers ─────────────────────────────────────────────────────────────
const c = {
  reset: "\x1b[0m", bold: "\x1b[1m", dim: "\x1b[2m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m",
};
const step = (n, msg) => console.log(`\n${c.bold}${c.cyan}[${n}/4]${c.reset} ${c.bold}${msg}${c.reset}`);
const ok = (msg) => console.log(`  ${c.green}✅${c.reset} ${msg}`);
const warn = (msg) => console.log(`  ${c.yellow}⚠️${c.reset}  ${msg}`);
const err = (msg) => console.log(`  ${c.red}❌${c.reset} ${msg}`);
const info = (msg) => console.log(`  ${c.dim}${msg}${c.reset}`);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const which = (cmd) => {
  try {
    execSync(`command -v ${cmd}`, { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

// ── STEP 1 · Preflight ──────────────────────────────────────────────────
step(1, "Preflight");
if (!process.env.STRIPE_SECRET_KEY && !skipSetup) {
  err("STRIPE_SECRET_KEY is not set. Run:");
  console.log("     STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-go-live.mjs\n");
  process.exit(1);
}
if (process.env.STRIPE_SECRET_KEY) {
  const isLive = process.env.STRIPE_SECRET_KEY.startsWith("sk_live_");
  ok(`STRIPE_SECRET_KEY present · mode: ${isLive ? c.yellow + "LIVE" + c.reset : c.green + "TEST" + c.reset}`);
} else {
  info("Reusing existing .env.stripe (--skip-setup)");
}

// ── STEP 2 · Run stripe-setup.mjs ───────────────────────────────────────
step(2, "Create Stripe products + write .env.stripe");
if (skipSetup) {
  if (!existsSync(envStripePath)) {
    err(".env.stripe not found. Remove --skip-setup or run stripe-setup.mjs manually first.");
    process.exit(1);
  }
  ok("Skipped setup, reusing existing .env.stripe");
} else {
  const result = spawnSync("node", [resolve(repoRoot, "scripts/stripe-setup.mjs")], {
    stdio: "inherit",
    env: process.env,
  });
  if (result.status !== 0) {
    err("stripe-setup.mjs failed. See output above.");
    process.exit(result.status ?? 1);
  }
  if (!existsSync(envStripePath)) {
    err("stripe-setup.mjs completed but .env.stripe was not written.");
    process.exit(1);
  }
  ok(`.env.stripe generated at ${envStripePath}`);
}

// Parse .env.stripe → key/value pairs (comments + blanks skipped)
const envLines = readFileSync(envStripePath, "utf8")
  .split("\n")
  .map((l) => l.trim())
  .filter((l) => l && !l.startsWith("#"));
const envPairs = envLines.map((l) => {
  const [k, ...rest] = l.split("=");
  return [k.trim(), rest.join("=").trim()];
});
info(`${envPairs.length} env vars parsed from .env.stripe`);

// ── STEP 3 · Railway upload ─────────────────────────────────────────────
step(3, "Upload env vars to Railway");
if (skipRailway) {
  warn("--skip-railway set. Import manually:");
  console.log(`     ${c.dim}railway variables set --from-file .env.stripe${c.reset}`);
  console.log(`     ${c.dim}(or paste .env.stripe into Railway → Variables → Raw Editor)${c.reset}`);
} else if (!which("railway")) {
  warn("Railway CLI not installed. Install with: npm i -g @railway/cli");
  warn("Then either re-run this script, or paste .env.stripe into Railway → Variables → Raw Editor.");
} else {
  // Verify project is linked
  const statusRes = spawnSync("railway", ["status"], { encoding: "utf8" });
  if (statusRes.status !== 0) {
    warn("Railway CLI installed but no project is linked. Run: railway link");
    warn("Then re-run this script, or paste .env.stripe into Railway → Variables → Raw Editor.");
  } else {
    info(`Railway project: ${statusRes.stdout.trim().split("\n")[0] || "(linked)"}`);
    // Upload each pair. `railway variables --set KEY=VALUE` (per docs Feb 2026).
    let uploaded = 0;
    for (const [k, v] of envPairs) {
      // `railway variables --set` takes KEY=VALUE as a single argv — spawnSync
      // handles quoting so values with special chars are safe.
      const setRes = spawnSync("railway", ["variables", "--set", `${k}=${v}`], {
        encoding: "utf8",
      });
      if (setRes.status === 0) {
        uploaded++;
        info(`  · ${k}=${v.slice(0, 20)}…`);
      } else {
        err(`Failed to upload ${k}: ${setRes.stderr.trim()}`);
      }
    }
    if (uploaded === envPairs.length) {
      ok(`Uploaded all ${uploaded} env vars to Railway`);
      info("Railway will auto-redeploy in ~30-90s to pick up the new vars.");
    } else {
      warn(`Uploaded ${uploaded}/${envPairs.length}. Check errors above.`);
    }
  }
}

// ── STEP 4 · Poll stripeReady ───────────────────────────────────────────
step(4, `Poll ${appUrl}/api/trpc/foundingMembers.stripeReady`);
if (skipPoll) {
  info("Skipped (--skip-poll)");
  console.log(`\n${c.green}${c.bold}Done.${c.reset} Manually verify at ${appUrl}/pricing when Railway finishes redeploying.\n`);
  process.exit(0);
}

const startedAt = Date.now();
const deadline = startedAt + timeoutSec * 1000;
let lastState = null;
let ready = false;
info(`Waiting up to ${timeoutSec}s for stripeReady → { ready: true, hasPriceIds: true }`);

while (Date.now() < deadline) {
  try {
    const res = await fetch(`${appUrl}/api/trpc/foundingMembers.stripeReady`);
    if (res.ok) {
      const body = await res.json();
      const data = body?.result?.data?.json;
      const stateStr = JSON.stringify(data);
      if (stateStr !== lastState) {
        info(`  ${stateStr}`);
        lastState = stateStr;
      }
      if (data?.ready === true && data?.hasPriceIds === true) {
        ready = true;
        break;
      }
    }
  } catch (e) {
    info(`  fetch error (transient, will retry): ${e.message}`);
  }
  await sleep(5000);
}

if (ready) {
  const elapsed = Math.round((Date.now() - startedAt) / 1000);
  ok(`Paywall is LIVE after ${elapsed}s.`);
  console.log(`\n${c.green}${c.bold}🎉 Stripe checkout is fully wired.${c.reset}`);
  console.log(`   Try it: ${c.cyan}${appUrl}/pricing${c.reset}\n`);
  process.exit(0);
} else {
  warn(`Timed out after ${timeoutSec}s. stripeReady last returned: ${lastState}`);
  console.log(`\n${c.yellow}Not fatal.${c.reset} Common causes:`);
  console.log("  · Railway redeploy still in progress → check Railway dashboard, then retest.");
  console.log(`  · APP_URL is wrong (currently ${appUrl}) → re-run with --app-url=<correct-url>`);
  console.log("  · Env vars didn't upload → check step 3 output above.\n");
  process.exit(2);
}
