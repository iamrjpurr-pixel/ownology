/**
 * scripts/stripe-setup.mjs
 *
 * One-command Stripe product/price bootstrap for Ownology.
 *
 * Creates (or updates) the three paid tiers as Products in Stripe, each
 * with two Prices — monthly and annual. All operations are idempotent:
 *   - Products are looked up by metadata.ownology_tier
 *   - Prices are looked up by lookup_key (native Stripe idempotency)
 *
 * Safe to re-run — will not create duplicates.
 *
 * Usage:
 *   STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-setup.mjs
 *   STRIPE_SECRET_KEY=sk_live_xxx node scripts/stripe-setup.mjs
 *
 * On completion, prints the 6 price IDs ready to paste into Railway env vars.
 *
 * Currency: AUD (matches /app/client/src/data/pricing.ts — Australian $).
 * Prices are sourced from that file's TIERS. Update once, run once, done.
 *
 * Feb 2026 — Rich.
 */

import Stripe from "stripe";
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const STRIPE_KEY = process.env.STRIPE_SECRET_KEY;
if (!STRIPE_KEY) {
  console.error("\n❌ Missing STRIPE_SECRET_KEY env var.");
  console.error("\nRun with:");
  console.error("  STRIPE_SECRET_KEY=sk_test_xxx node scripts/stripe-setup.mjs\n");
  process.exit(1);
}

const IS_TEST = STRIPE_KEY.startsWith("sk_test_");
const IS_LIVE = STRIPE_KEY.startsWith("sk_live_");
if (!IS_TEST && !IS_LIVE) {
  console.error("\n❌ STRIPE_SECRET_KEY doesn't look like a Stripe secret key.\n");
  process.exit(1);
}

const stripe = new Stripe(STRIPE_KEY, { apiVersion: "2024-06-20" });

// ─── Tier config — mirror of /app/client/src/data/pricing.ts ───────────────
// Prices in AUD.
// FOUNDING COHORT PROMO (active until 31 July 2026):
//   Annual billing = 9× monthly (3 months free).
// AFTER 31 July 2026:
//   Update ANNUAL_MULTIPLIER to 10 (2 months free — retail rate) and
//   re-run this script. Lookup-keys stay stable, so Stripe prices update
//   in place — no Pricing.tsx or code changes needed elsewhere.
const ANNUAL_MULTIPLIER = 9; // ← 3 months free · founding cohort · expires 2026-07-31
const CURRENCY = "aud";
const TIERS = [
  {
    id: "cellar_hand",
    name: "The Cellar Hand",
    description: "Home winemakers and wine students who want to learn. Full curiosity AI, Compliance AI, unlimited vintage log, and the full Curriculum with Deep, Skim & Flash reading modes.",
    monthlyAud: 22,
  },
  {
    id: "press",
    name: "The Press",
    description: "Boutique winery teams. Full cellar operations, 38 SOPs, Decision Logic, unlimited Divine Trinity, Curriculum with scored MCQs and attainment PDF.",
    monthlyAud: 44,
  },
  {
    id: "vigneron",
    name: "The Vigneron",
    description: "Owner-operator boutique vignerons. Everything in The Press plus team seats, branded team attainment PDFs, annual knowledge-base review.",
    monthlyAud: 88,
  },
];

// Credit packs — one-time top-ups for Free Run users. Product per pack,
// single price per product (no monthly/annual cycle). Kept in sync with
// server/freeRunRouter.ts::CREDIT_PACKS — if you edit the amounts there,
// edit here too (they must match down to the cent).
const CREDIT_PACKS = [
  { id: "pour",   name: "Pour",   priceAud: 2,  credits: 5,  description: "5 Divine Trinity reveals — a taste." },
  { id: "glass",  name: "Glass",  priceAud: 5,  credits: 15, description: "15 Divine Trinity reveals — a working session." },
  { id: "flight", name: "Flight", priceAud: 10, credits: 35, description: "35 Divine Trinity reveals — a vintage's worth of questions." },
  { id: "cellar", name: "Cellar", priceAud: 20, credits: 80, description: "80 Divine Trinity reveals — the obsessive's rate." },
];

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Find an existing product by our metadata tag. */
async function findProductByTier(tierId) {
  // Stripe search API — clean, indexed, idempotent-lookup friendly.
  const res = await stripe.products.search({
    query: `active:'true' AND metadata['ownology_tier']:'${tierId}'`,
    limit: 1,
  });
  return res.data[0] ?? null;
}

/** Find an existing credit-pack product by our metadata tag. */
async function findProductByPack(packId) {
  const res = await stripe.products.search({
    query: `active:'true' AND metadata['ownology_pack']:'${packId}'`,
    limit: 1,
  });
  return res.data[0] ?? null;
}

/** Upsert a Product. Returns the product. */
async function upsertProduct(tier) {
  const existing = await findProductByTier(tier.id);
  if (existing) {
    // Update in place — name / description may have changed.
    const updated = await stripe.products.update(existing.id, {
      name: tier.name,
      description: tier.description,
      metadata: { ownology_tier: tier.id },
    });
    console.log(`  ↻ Updated product: ${tier.name} (${updated.id})`);
    return updated;
  }
  const created = await stripe.products.create({
    name: tier.name,
    description: tier.description,
    metadata: { ownology_tier: tier.id },
  });
  console.log(`  ✓ Created product: ${tier.name} (${created.id})`);
  return created;
}

/** Upsert a credit-pack product. Returns the product. */
async function upsertPackProduct(pack) {
  const existing = await findProductByPack(pack.id);
  const productBody = {
    name: `Ownology Credits — ${pack.name}`,
    description: pack.description,
    metadata: {
      ownology_pack: pack.id,
      credits: String(pack.credits),
    },
  };
  if (existing) {
    const updated = await stripe.products.update(existing.id, productBody);
    console.log(`  ↻ Updated pack product: ${pack.name} (${updated.id})`);
    return updated;
  }
  const created = await stripe.products.create(productBody);
  console.log(`  ✓ Created pack product: ${pack.name} (${created.id})`);
  return created;
}

/** Upsert a one-time Price (no recurring). Returns the price. */
async function upsertOneTimePrice(product, packId, unitAmountAud) {
  const lookupKey = `ownology_pack_${packId}`;
  const existingList = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const existing = existingList.data[0];
  const desiredAmount = unitAmountAud * 100;

  if (existing && existing.unit_amount === desiredAmount && !existing.recurring) {
    console.log(`    · price:  ${existing.id}  (unchanged · ${lookupKey})`);
    return existing;
  }

  if (existing) {
    await stripe.prices.update(existing.id, { lookup_key: null, active: false });
    console.log(`    · price:  archived old ${existing.id} (amount changed)`);
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: desiredAmount,
    lookup_key: lookupKey,
    metadata: { ownology_pack: packId },
  });
  console.log(`    · price:  ${created.id}  (${lookupKey} · A$${unitAmountAud})`);
  return created;
}

/** Upsert a Price by lookup_key. Returns the price. */
async function upsertPrice(product, cycle, unitAmountAud) {
  const lookupKey = `ownology_${product.metadata.ownology_tier}_${cycle}`;
  // Prices in Stripe are immutable once created — but you can toggle active
  // and use lookup_key to point at whichever version is current. On rerun,
  // if the amount hasn't changed, we return the existing one. If it has,
  // we archive the old one and create a new one at the same lookup_key.
  const existingList = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    limit: 1,
  });
  const existing = existingList.data[0];
  const desiredAmount = unitAmountAud * 100; // cents

  if (existing && existing.unit_amount === desiredAmount && existing.recurring?.interval === (cycle === "monthly" ? "month" : "year")) {
    console.log(`    · ${cycle.padEnd(7)}: ${existing.id}  (unchanged · ${lookupKey})`);
    return existing;
  }

  // If an old price with our lookup_key exists but at a different amount,
  // we need to detach the lookup_key from it before reusing it on the
  // new price. Stripe requires unique lookup_keys among active prices.
  if (existing) {
    await stripe.prices.update(existing.id, { lookup_key: null, active: false });
    console.log(`    · ${cycle.padEnd(7)}: archived old ${existing.id} (amount changed)`);
  }

  const created = await stripe.prices.create({
    product: product.id,
    currency: CURRENCY,
    unit_amount: desiredAmount,
    recurring: { interval: cycle === "monthly" ? "month" : "year" },
    lookup_key: lookupKey,
    metadata: { ownology_tier: product.metadata.ownology_tier, cycle },
  });
  console.log(`    · ${cycle.padEnd(7)}: ${created.id}  (${lookupKey} · A$${unitAmountAud})`);
  return created;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log("\n────────────────────────────────────────────────────────────");
  console.log(`  Ownology Stripe setup · ${IS_LIVE ? "🔴 LIVE MODE" : "🧪 TEST MODE"}`);
  console.log(`  Currency: ${CURRENCY.toUpperCase()}   Annual multiplier: ×${ANNUAL_MULTIPLIER}`);
  if (ANNUAL_MULTIPLIER === 9) {
    console.log(`  🍇 Founding-cohort promo ACTIVE: 3 months free on annual · expires 2026-07-31`);
  }
  console.log("────────────────────────────────────────────────────────────\n");

  const envLines = [];

  for (const tier of TIERS) {
    console.log(`▸ ${tier.name}   (A$${tier.monthlyAud}/mo · A$${tier.monthlyAud * ANNUAL_MULTIPLIER}/yr)`);
    const product = await upsertProduct(tier);
    const monthlyPrice = await upsertPrice(product, "monthly", tier.monthlyAud);
    const annualPrice = await upsertPrice(product, "annual", tier.monthlyAud * ANNUAL_MULTIPLIER);
    const upper = tier.id.toUpperCase();
    envLines.push(`STRIPE_${upper}_MONTHLY_PRICE_ID=${monthlyPrice.id}`);
    envLines.push(`STRIPE_${upper}_ANNUAL_PRICE_ID=${annualPrice.id}`);
    console.log("");
  }

  // ── Credit packs (one-time top-ups) ────────────────────────────────────
  // Same idempotent upsert pattern, one product + one price per pack.
  // Kept in sync with server/freeRunRouter.ts::CREDIT_PACKS.
  for (const pack of CREDIT_PACKS) {
    console.log(`▸ Pack · ${pack.name}   (A$${pack.priceAud} · ${pack.credits} credits)`);
    const product = await upsertPackProduct(pack);
    const price = await upsertOneTimePrice(product, pack.id, pack.priceAud);
    envLines.push(`STRIPE_PACK_${pack.id.toUpperCase()}_PRICE_ID=${price.id}`);
    console.log("");
  }

  // ── Create/reuse webhook endpoint ─────────────────────────────────────
  // Zero Stripe Dashboard clicks — the endpoint gets created programmatically,
  // signing secret extracted, appended to .env.stripe. Idempotent: re-runs
  // find the existing endpoint by URL and reuse it (never duplicates).
  //
  // WEBHOOK_URL priority:
  //   1. env WEBHOOK_URL (explicit override — e.g. Railway preview)
  //   2. hardcoded https://www.ownology.ai/api/stripe/webhook (prod default)
  const WEBHOOK_URL = process.env.WEBHOOK_URL || "https://www.ownology.ai/api/stripe/webhook";
  const WEBHOOK_EVENTS = [
    "checkout.session.completed",
    "customer.subscription.updated",
    "customer.subscription.deleted",
  ];

  console.log(`\n▸ Webhook endpoint`);
  console.log(`  URL: ${WEBHOOK_URL}`);

  let webhookSecret = null;
  try {
    // Find existing endpoint with the same URL (idempotency).
    const existing = await stripe.webhookEndpoints.list({ limit: 100 });
    const match = existing.data.find((w) => w.url === WEBHOOK_URL);

    if (match) {
      console.log(`  ✓ Endpoint already exists (${match.id})`);
      // Ensure the enabled_events list is up to date — but never widen scope
      // if the user has customised it in the Dashboard (we only ADD what we
      // need, never remove).
      const missing = WEBHOOK_EVENTS.filter((e) => !match.enabled_events.includes(e));
      if (missing.length > 0) {
        console.log(`  ⤷ Adding missing events: ${missing.join(", ")}`);
        await stripe.webhookEndpoints.update(match.id, {
          enabled_events: [...new Set([...match.enabled_events, ...WEBHOOK_EVENTS])],
        });
      }
      // NOTE: `secret` is only returned on the initial create() call. For an
      // existing endpoint we can't retrieve it — the user either has it in
      // Railway already, or they need to roll it via the Dashboard.
      console.log(`  ⚠️  Signing secret only visible on first creation.`);
      console.log(`     If STRIPE_WEBHOOK_SECRET is not already in Railway,`);
      console.log(`     roll it at: https://dashboard.stripe.com/${IS_LIVE ? "" : "test/"}webhooks/${match.id}`);
    } else {
      const created = await stripe.webhookEndpoints.create({
        url: WEBHOOK_URL,
        enabled_events: WEBHOOK_EVENTS,
        description: "Ownology · subscription lifecycle sync (auto-created by stripe-setup.mjs)",
        api_version: "2024-06-20",
      });
      webhookSecret = created.secret;
      console.log(`  ✓ Created webhook endpoint (${created.id})`);
      console.log(`  ✓ Signing secret captured (${webhookSecret.slice(0, 12)}…)`);
      envLines.push(`STRIPE_WEBHOOK_SECRET=${webhookSecret}`);
    }
  } catch (e) {
    console.log(`  ❌ Webhook setup failed: ${e.message}`);
    console.log(`     Products/prices were still created successfully.`);
    console.log(`     You can create the webhook manually at:`);
    console.log(`     https://dashboard.stripe.com/${IS_LIVE ? "" : "test/"}webhooks/create`);
  }

  console.log("\n────────────────────────────────────────────────────────────");
  console.log("  ✅ Done. Copy these lines into Railway env vars:");
  console.log("────────────────────────────────────────────────────────────\n");
  for (const line of envLines) console.log(`  ${line}`);

  // ── Also write to .env.stripe at repo root ────────────────────────────
  // One-command import: run this script, then either
  //   `railway variables set --from-file .env.stripe`  (Railway CLI)
  // or paste the whole file into the Railway variables raw editor.
  // File is git-ignored to avoid committing test-mode Price IDs.
  const __filename = fileURLToPath(import.meta.url);
  const repoRoot = resolve(dirname(__filename), "..");
  const outPath = resolve(repoRoot, ".env.stripe");
  const header = [
    `# .env.stripe — generated by scripts/stripe-setup.mjs`,
    `# Generated: ${new Date().toISOString()}`,
    `# Mode: ${IS_LIVE ? "LIVE" : "TEST"}   Annual multiplier: x${ANNUAL_MULTIPLIER}`,
    `# Paste this into Railway → Variables → Raw Editor, or:`,
    `#   railway variables set --from-file .env.stripe`,
    ``,
  ].join("\n");
  writeFileSync(outPath, header + envLines.join("\n") + "\n", "utf8");
  console.log(`\n  📄 Also written to: ${outPath}`);
  console.log(`     Import with:      railway variables set --from-file .env.stripe\n`);

  console.log("Then redeploy Ownology so the tRPC checkout endpoints pick them up.\n");
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message ?? err);
  if (err.type === "StripeAuthenticationError") {
    console.error("   → Your STRIPE_SECRET_KEY is invalid. Check the Dashboard → Developers → API keys.");
  }
  process.exit(1);
});
