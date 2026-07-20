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

  console.log("────────────────────────────────────────────────────────────");
  console.log("  ✅ Done. Copy these lines into Railway env vars:");
  console.log("────────────────────────────────────────────────────────────\n");
  for (const line of envLines) console.log(`  ${line}`);
  console.log("\nThen redeploy Ownology so the tRPC checkout endpoints pick them up.\n");
}

main().catch((err) => {
  console.error("\n❌ Setup failed:", err.message ?? err);
  if (err.type === "StripeAuthenticationError") {
    console.error("   → Your STRIPE_SECRET_KEY is invalid. Check the Dashboard → Developers → API keys.");
  }
  process.exit(1);
});
