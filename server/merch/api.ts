/**
 * Ownology Merch API — Express routes for Stripe Checkout
 * Mounted at /api/merch by the Vite dev server plugin and production server.
 */

import express from "express";
import Stripe from "stripe";
import { MERCH_PRODUCTS, getProductById } from "./products.js";

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
router.post("/checkout", express.json(), async (req, res) => {
  try {
    const { productId, quantity = 1, customerEmail, origin } = req.body as {
      productId: string;
      quantity?: number;
      customerEmail?: string;
      origin: string;
    };

    if (!productId || !origin) {
      res.status(400).json({ error: "productId and origin are required" });
      return;
    }

    const product = getProductById(productId);
    if (!product) {
      res.status(404).json({ error: "Product not found" });
      return;
    }

    const qty = Math.max(1, Math.min(20, Number(quantity) || 1));
    const stripe = getStripe();

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      allow_promotion_codes: true,
      ...(customerEmail ? { customer_email: customerEmail } : {}),
      line_items: [
        {
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
        },
      ],
      metadata: {
        product_id: product.id,
        product_name: product.name,
        quantity: qty.toString(),
        customer_email: customerEmail ?? "",
      },
      success_url: `${origin}/merch/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/merch?cancelled=1`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("[Merch Checkout Error]", err);
    res.status(500).json({ error: "Failed to create checkout session" });
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

      console.log(
        `[Webhook] Order completed — product: ${meta.product_id}, qty: ${meta.quantity}, email: ${meta.customer_email}`
      );

      // Notify the owner
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

    res.json({ received: true });
  }
);

export default router;
