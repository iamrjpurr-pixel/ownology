/**
 * Ownology Merch API — Express routes for Stripe Checkout
 * Mounted at /api/merch by the Vite dev server plugin and production server.
 */

import express from "express";
import Stripe from "stripe";
import { MERCH_PRODUCTS, getProductById } from "./products.js";
// NOTE: db.ts is NOT imported at the top level — doing so would pull mysql2 pool
// creation into the Vite config evaluation path and break `vite build`.
// Instead, addFoundingMember is dynamically imported inside the webhook handler.

const router = express.Router();

function getStripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2026-04-22.dahlia" });
}

// GET /api/merch/products — list all in-stock products
router.get("/products", (_req, res) => {
  res.json(MERCH_PRODUCTS.filter((p) => p.inStock));
});

// POST /api/merch/checkout — create a Stripe Checkout session
// Supports both single-item { productId, quantity } and multi-item { items: [{productId, quantity}] }
router.post("/checkout", express.json(), async (req, res) => {
  try {
    const { productId, quantity = 1, items, customerEmail, origin } = req.body as {
      productId?: string;
      quantity?: number;
      items?: Array<{ productId: string; quantity: number }>;
      customerEmail?: string;
      origin: string;
    };

    if (!origin) {
      res.status(400).json({ error: "origin is required" });
      return;
    }

    // Normalise to a list of line items
    const lineItemRequests: Array<{ productId: string; quantity: number }> = items
      ? items
      : productId
      ? [{ productId, quantity: Number(quantity) || 1 }]
      : [];

    if (lineItemRequests.length === 0) {
      res.status(400).json({ error: "No items provided" });
      return;
    }

    // Resolve products
    const resolvedItems = lineItemRequests.map(({ productId: pid, quantity: q }) => {
      const product = getProductById(pid);
      if (!product) throw Object.assign(new Error(`Product not found: ${pid}`), { status: 404 });
      return { product, qty: Math.max(1, Math.min(20, Number(q) || 1)) };
    });

    const stripe = getStripe();

    // Build Stripe line_items array — typed inline to avoid Stripe version namespace differences
    const stripeLineItems = resolvedItems.map(
      ({ product, qty }) => ({
        quantity: qty,
        price_data: {
          currency: "aud",
          unit_amount: product.priceAud,
          product_data: {
            name: product.name,
            description: product.description,
            images: [product.imageUrl],
          },
        },
      })
    );

    // Build metadata summary (Stripe metadata values must be strings ≤500 chars)
    const orderSummary = resolvedItems
      .map(({ product, qty }) => `${qty}× ${product.name}`)
      .join(", ")
      .slice(0, 490);

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: stripeLineItems,
      metadata: {
        order_summary: orderSummary,
        item_count: resolvedItems.length.toString(),
        customer_email: customerEmail ?? "",
      },
      success_url: `${origin}/merch/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/merch?cancelled=1`,
    });

    res.json({ url: session.url });
  } catch (err: unknown) {
    console.error("[Merch Checkout Error]", err);
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Failed to create checkout session";
    res.status(status).json({ error: message });
  }
});

// POST /api/stripe/webhook — Stripe webhook handler
router.post(
  "/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const sig = req.headers["stripe-signature"] as string;
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    try {
      if (!webhookSecret) {
        // Dev mode: parse raw body as JSON
        event = JSON.parse(req.body.toString()) as Stripe.Event;
      } else {
        const stripe = getStripe();
        event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
      }
    } catch (err) {
      console.error("[Webhook] Signature verification failed:", err);
      res.status(400).json({ error: "Webhook signature verification failed" });
      return;
    }

    // Handle test events
    if (event.id.startsWith("evt_test_")) {
      console.log("[Webhook] Test event detected, returning verification response");
      res.json({ verified: true });
      return;
    }

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const meta = session.metadata ?? {};

      // ── Update wineries.plan for ANY completed subscription checkout ────
      // Runs BEFORE the founding-member branch so both share this path.
      // Maps tier string (from session metadata) → wineries.plan enum,
      // then looks up the winery by client_reference_id OR by matching a
      // user's email → user.wineryId. First hit wins.
      // Feb 2026 — closing the revenue loop (audit P0).
      if (session.mode === "subscription") {
        const tierRaw = String(meta.tier ?? "").toLowerCase();
        // Map incoming tier label → wineries.plan enum value.
        const planForTier: Record<string, string> = {
          cellar: "amphora",
          cellar_hand: "amphora",
          amphora: "amphora",
          press: "press",
          the_press: "press",
          cellar_master: "coopers",
          vigneron: "coopers",
          the_vigneron: "coopers",
          coopers: "coopers",
        };
        const newPlan = planForTier[tierRaw];
        const email = String(meta.customer_email || session.customer_email || "").trim().toLowerCase();
        const clientRef = String(session.client_reference_id ?? "").trim();
        if (newPlan && (email || clientRef)) {
          try {
            const { db } = await import("../db.js");
            const { wineries, users } = await import("../../drizzle/schema.js");
            const { eq } = await import("drizzle-orm");
            let wineryId: number | null = null;
            if (clientRef && /^\d+$/.test(clientRef)) {
              wineryId = Number(clientRef);
            } else if (email) {
              const rows = await db.select({ wineryId: users.wineryId }).from(users).where(eq(users.email, email)).limit(1);
              wineryId = rows[0]?.wineryId ?? null;
            }
            if (wineryId !== null) {
              const stripeCustomerId = typeof session.customer === "string" ? session.customer : null;
              const stripeSubscriptionId = typeof session.subscription === "string" ? session.subscription : null;
              // Detect returning subscriber — if they already had a paid
              // plan before this checkout, send the tier-switch receipt
              // instead of the full onboarding welcome.
              const [prior] = await db.select({ plan: wineries.plan })
                .from(wineries).where(eq(wineries.id, wineryId)).limit(1);
              const wasPaid = prior && prior.plan && prior.plan !== "free";
              await db.update(wineries).set({
                plan: newPlan as never,
                ...(stripeCustomerId ? { stripeCustomerId } : {}),
                ...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
              }).where(eq(wineries.id, wineryId));
              console.log(`[Webhook] wineries.plan updated → ${newPlan} for winery ${wineryId} (session ${session.id})`);
              // Store the returning-buyer flag on the session for the warm
              // email downstream. Attached to session object via meta so the
              // founding-member branch below can read it without another SELECT.
              (session as unknown as { _ownologyIsReturning: boolean })._ownologyIsReturning = !!wasPaid;
            } else {
              console.warn(`[Webhook] No winery matched for subscription checkout (email=${email}, ref=${clientRef})`);
            }
          } catch (dbErr) {
            console.error("[Webhook] wineries.plan update failed:", dbErr);
          }
        }
      }

      // ── Founding Member subscription checkout ─────────────────────────────
      if (meta.founding_member === "true" && session.mode === "subscription") {
        const email = meta.customer_email || session.customer_email || "";
        const tier = (meta.tier as "cellar" | "press" | "cellar_master") ?? "cellar";
        const stripeCustomerId = typeof session.customer === "string" ? session.customer : undefined;

        console.log(`[Webhook] Founding member subscription — tier: ${tier}, email: ${email}`);

        if (email) {
          try {
            // Dynamic import keeps mysql2 pool creation out of Vite config evaluation
            const { addFoundingMember } = await import("../db.js");
            await addFoundingMember({ email, tier, stripeCustomerId });
          } catch (dbErr) {
            // Duplicate email is fine — member already exists
            console.warn("[Webhook] addFoundingMember skipped (may already exist):", dbErr);
          }

          // Fire warm welcome email — fire-and-forget, never blocks webhook.
          // Runs alongside Stripe's automatic receipt (different purpose:
          // theirs is a payment receipt, ours is a product welcome).
          // Returning subscribers get the tier-switch receipt (short),
          // first-timers get the full onboarding welcome.
          try {
            const { sendSubscriptionWelcome } = await import("./welcomeEmail.js");
            const isReturning = !!(session as unknown as { _ownologyIsReturning?: boolean })._ownologyIsReturning;
            await sendSubscriptionWelcome({
              email,
              tier: String(meta.tier ?? tier),
              cycle: String(meta.cycle ?? "monthly"),
              isReturningBuyer: isReturning,
            });
          } catch (emailErr) {
            console.error("[Webhook] sendSubscriptionWelcome failed:", emailErr);
          }
        }

        // Notify owner
        try {
          const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
          const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
          const appId = process.env.VITE_APP_ID;
          const ownerOpenId = process.env.OWNER_OPEN_ID;

          if (forgeUrl && forgeKey && appId && ownerOpenId) {
            await fetch(`${forgeUrl}/v1/notification/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${forgeKey}`,
              },
              body: JSON.stringify({
                app_id: appId,
                open_id: ownerOpenId,
                title: `🍷 New Founding Member — ${meta.tier_label ?? tier}`,
                content: `${email} subscribed to ${meta.tier_label ?? tier} (${meta.cycle ?? "monthly"}). Session: ${session.id}`,
              }),
            });
          }
        } catch (notifyErr) {
          console.error("[Webhook] Owner notification failed:", notifyErr);
        }
      } else if (meta.credit_pack === "true") {
        // ── Free Run credit pack purchase ─────────────────────────────────────
        const credits = parseInt(meta.credits ?? "0", 10);
        const userOpenId = meta.user_open_id ?? "";
        const email = meta.customer_email || session.customer_email || "";
        console.log(`[Webhook] Credit pack purchase — pack: ${meta.pack_id}, credits: ${credits}, user: ${userOpenId}`);

        if (userOpenId && credits > 0) {
          try {
            const { db } = await import("../db.js");
            const { freeRunCredits } = await import("../../drizzle/schema.js");
            const { eq } = await import("drizzle-orm");
            const { getUserByOpenId } = await import("../db.js");

            const dbUser = await getUserByOpenId(userOpenId);
            if (dbUser) {
              const now = Date.now();
              const [existing] = await db
                .select()
                .from(freeRunCredits)
                .where(eq(freeRunCredits.userId, dbUser.id))
                .limit(1);

              if (existing) {
                await db
                  .update(freeRunCredits)
                  .set({
                    balance: existing.balance + credits,
                    totalPurchased: (existing.totalPurchased ?? 0) + credits,
                    updatedAt: now,
                  })
                  .where(eq(freeRunCredits.id, existing.id));
              } else {
                await db.insert(freeRunCredits).values({
                  userId: dbUser.id,
                  balance: credits,
                  totalPurchased: credits,
                  totalConsumed: 0,
                  updatedAt: now,
                  createdAt: now,
                });
              }
              console.log(`[Webhook] Topped up ${credits} credits for user ${dbUser.id}`);
            }
          } catch (dbErr) {
            console.error("[Webhook] Credit top-up failed:", dbErr);
          }
        }

        // Warm welcome email for pack purchase — fire-and-forget.
        if (email && credits > 0) {
          try {
            const { sendCreditPackWelcome } = await import("./welcomeEmail.js");
            const packName = (meta.pack_id ?? "")
              .replace(/^./, (c) => c.toUpperCase()); // "pour" → "Pour"
            await sendCreditPackWelcome({ email, packName, credits });
          } catch (emailErr) {
            console.error("[Webhook] sendCreditPackWelcome failed:", emailErr);
          }
        }

        // Notify owner
        try {
          const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
          const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
          const appId = process.env.VITE_APP_ID;
          const ownerOpenId = process.env.OWNER_OPEN_ID;
          if (forgeUrl && forgeKey && appId && ownerOpenId) {
            await fetch(`${forgeUrl}/v1/notification/send`, {
              method: "POST",
              headers: { "Content-Type": "application/json", Authorization: `Bearer ${forgeKey}` },
              body: JSON.stringify({
                app_id: appId,
                open_id: ownerOpenId,
                title: `🍷 Credit Pack Purchased — ${meta.pack_id}`,
                content: `${email || "guest"} bought ${credits} credits (${meta.pack_id}). Session: ${session.id}`,
              }),
            });
          }
        } catch (notifyErr) {
          console.error("[Webhook] Owner notification failed:", notifyErr);
        }
      } else {
        // ── Merch order ──────────────────────────────────────────────────────
        console.log(
          `[Webhook] Merch order completed — product: ${meta.product_id}, qty: ${meta.quantity}, email: ${meta.customer_email}`
        );

        try {
          const forgeUrl = process.env.BUILT_IN_FORGE_API_URL;
          const forgeKey = process.env.BUILT_IN_FORGE_API_KEY;
          const appId = process.env.VITE_APP_ID;
          const ownerOpenId = process.env.OWNER_OPEN_ID;

          if (forgeUrl && forgeKey && appId && ownerOpenId) {
            await fetch(`${forgeUrl}/v1/notification/send`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${forgeKey}`,
              },
              body: JSON.stringify({
                app_id: appId,
                open_id: ownerOpenId,
                title: `New Merch Order — ${meta.product_name}`,
                content: `${meta.quantity}× ${meta.product_name} ordered by ${meta.customer_email || "guest"}. Session: ${session.id}`,
              }),
            });
          }
        } catch (notifyErr) {
          console.error("[Webhook] Owner notification failed:", notifyErr);
        }
      }
    }

    // ── Subscription lifecycle: downgrade to free on cancellation ───────────
    // Fires when a customer cancels or their subscription is deleted for any
    // reason (chargeback, dunning failure after retries, admin cancel). We
    // downgrade wineries.plan to 'free' to reflect real access status.
    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : null;
      if (stripeCustomerId) {
        try {
          const { db } = await import("../db.js");
          const { wineries } = await import("../../drizzle/schema.js");
          const { eq } = await import("drizzle-orm");
          const upd = await db.update(wineries)
            .set({ plan: "free" as never })
            .where(eq(wineries.stripeCustomerId, stripeCustomerId));
          console.log(`[Webhook] Subscription deleted → downgraded to free for customer ${stripeCustomerId}`, upd);
        } catch (err) {
          console.error("[Webhook] subscription.deleted downgrade failed:", err);
        }
      }
    }

    // ── Subscription lifecycle: tier change / re-activation ──────────────────
    // Fires when a customer upgrades/downgrades between tiers, or when a
    // paused subscription resumes. Re-syncs wineries.plan from the current
    // active price via metadata (set at checkout time in metadata.tier).
    if (event.type === "customer.subscription.updated") {
      const sub = event.data.object as Stripe.Subscription;
      const stripeCustomerId = typeof sub.customer === "string" ? sub.customer : null;
      const tierRaw = String(sub.metadata?.tier ?? "").toLowerCase();
      const planForTier: Record<string, string> = {
        cellar: "amphora", cellar_hand: "amphora", amphora: "amphora",
        press: "press", the_press: "press",
        cellar_master: "coopers", vigneron: "coopers", the_vigneron: "coopers", coopers: "coopers",
      };
      // Only touch plan if the subscription is currently in a paying state.
      const activeStatuses = new Set(["active", "trialing", "past_due"]);
      const newPlan = planForTier[tierRaw];
      if (stripeCustomerId && newPlan && activeStatuses.has(sub.status)) {
        try {
          const { db } = await import("../db.js");
          const { wineries } = await import("../../drizzle/schema.js");
          const { eq } = await import("drizzle-orm");
          await db.update(wineries)
            .set({ plan: newPlan as never })
            .where(eq(wineries.stripeCustomerId, stripeCustomerId));
          console.log(`[Webhook] subscription.updated → wineries.plan = ${newPlan} for customer ${stripeCustomerId}`);
        } catch (err) {
          console.error("[Webhook] subscription.updated sync failed:", err);
        }
      }
    }

    res.json({ received: true });
  }
);

export default router;
