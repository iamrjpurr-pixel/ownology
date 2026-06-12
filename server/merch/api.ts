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

    res.json({ received: true });
  }
);

export default router;
