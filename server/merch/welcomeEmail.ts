/**
 * server/merch/welcomeEmail.ts — post-checkout warm welcome emails.
 *
 * Fired from the Stripe webhook (server/merch/api.ts) on
 * checkout.session.completed for BOTH subscription tiers AND credit
 * pack top-ups. Fire-and-forget — never blocks the webhook 200 OK.
 *
 * Tone: warm, personal, first-name only, no exclamation points, no
 * marketing bloat. This is the first inbox touch after they've paid —
 * it should read like Rich wrote it, not a SaaS drip.
 *
 * Env deps:
 *   RESEND_API_KEY       (required to send; falls back to console.log)
 *   ALERT_FROM_EMAIL     (default: onboarding@resend.dev)
 *   OWNOLOGY_PROD_URL    (default: https://www.ownology.ai)
 */

const PROD_URL = (process.env.OWNOLOGY_PROD_URL || "https://www.ownology.ai").replace(/\/$/, "");
const FROM_EMAIL = process.env.ALERT_FROM_EMAIL || "onboarding@resend.dev";
const FROM_NAME = process.env.ALERT_FROM_NAME || "Rich at Ownology";

// ─── Tier metadata (matches server/routers.ts::createCheckout) ──────────
// Kept local — the copy is prose that needs hand-tuning per tier, not
// data we want in a shared constant.
const TIER_META: Record<string, {
  name: string;
  greeting: string;
  unlocks: string[];
}> = {
  cellar: {
    name: "The Cellar Hand",
    greeting: "You're in as a Cellar Hand.",
    unlocks: [
      "Ask Owen — unlimited curiosity questions, grounded in real oenology",
      "The full Curriculum — 30 lessons in Deep, Skim, and Flash reading modes",
      "Compliance AI — unlimited FSANZ / LIP / export questions",
      "Vintage log — unlimited batches, tanks, and readings",
    ],
  },
  cellar_hand: {
    name: "The Cellar Hand",
    greeting: "You're in as a Cellar Hand.",
    unlocks: [
      "Ask Owen — unlimited curiosity questions, grounded in real oenology",
      "The full Curriculum — 30 lessons in Deep, Skim, and Flash reading modes",
      "Compliance AI — unlimited FSANZ / LIP / export questions",
      "Vintage log — unlimited batches, tanks, and readings",
    ],
  },
  press: {
    name: "The Press",
    greeting: "You're in as a Press member.",
    unlocks: [
      "Everything in The Cellar Hand",
      "Full cellar operations — 38 SOPs, Decision Logic, Divine Trinity unlimited",
      "Scored MCQs on every Curriculum lesson + branded attainment PDF",
      "The Press debrief — per-batch traceability from crush to bottle",
    ],
  },
  cellar_master: {
    name: "The Vigneron",
    greeting: "You're in as a Vigneron.",
    unlocks: [
      "Everything in The Press",
      "Team seats — bring your assistant winemaker and cellar hands",
      "Branded team attainment PDFs — one per staff member",
      "Annual knowledge-base review + dedicated onboarding call with Rich",
    ],
  },
  vigneron: {
    name: "The Vigneron",
    greeting: "You're in as a Vigneron.",
    unlocks: [
      "Everything in The Press",
      "Team seats — bring your assistant winemaker and cellar hands",
      "Branded team attainment PDFs — one per staff member",
      "Annual knowledge-base review + dedicated onboarding call with Rich",
    ],
  },
};

function firstNameFromEmail(email: string): string {
  const local = email.split("@")[0] ?? "";
  const raw = local.split(/[._+-]/)[0] ?? local;
  // Cap at 24 chars, strip anything non-alpha (numbers in emails ≠ names).
  const clean = raw.replace(/[^a-zA-Z]/g, "").slice(0, 24);
  if (!clean) return "there";
  return clean.charAt(0).toUpperCase() + clean.slice(1).toLowerCase();
}

function baseTemplate(opts: {
  firstName: string;
  headline: string;
  intro: string;
  bulletsHtml: string;
  ctaLabel: string;
  ctaHref: string;
  outro: string;
}): string {
  return `<!doctype html><html><body style="margin:0;padding:32px 16px;background:#f6f4ef;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif;color:#1f2937">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06)">
    <tr><td style="padding:32px 32px 8px;border-top:6px solid #b8860b">
      <h1 style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:22px;color:#b8860b;font-weight:700">Ownology</h1>
    </td></tr>
    <tr><td style="padding:8px 32px 24px">
      <p style="margin:0 0 12px;font-size:16px">G'day ${opts.firstName},</p>
      <h2 style="margin:0 0 12px;font-family:'Fraunces',Georgia,serif;font-size:20px;font-weight:600;color:#1f2937">${opts.headline}</h2>
      <p style="margin:0 0 20px;font-size:15px;line-height:1.55;color:#374151">${opts.intro}</p>
      ${opts.bulletsHtml}
      <p style="margin:24px 0 24px;text-align:center">
        <a href="${opts.ctaHref}" style="display:inline-block;padding:12px 28px;background:#b8860b;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:700;font-size:15px">${opts.ctaLabel}</a>
      </p>
      <p style="margin:0 0 8px;font-size:14px;line-height:1.55;color:#374151">${opts.outro}</p>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5">Rich Purr<br>Founder, Ownology<br><a href="mailto:rich@ownology.ai" style="color:#b8860b;text-decoration:none">rich@ownology.ai</a></p>
    </td></tr>
  </table>
</body></html>`;
}

/** Fire a subscription-welcome email. Never throws — always safe to call. */
export async function sendSubscriptionWelcome(params: {
  email: string;
  tier: string;
  cycle: string; // "monthly" | "annual"
  isReturningBuyer?: boolean; // true = already had a paid plan; send tier-switch receipt
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!params.email) return;

  const meta = TIER_META[params.tier.toLowerCase()] ?? TIER_META.cellar;
  const firstName = firstNameFromEmail(params.email);
  const cycleLabel = params.cycle === "annual" ? "annual" : "monthly";

  // ── Returning buyer path — short receipt, no product tour ────────
  // Fires when the buyer already had a paid tier before this checkout
  // (e.g. Cellar Hand → Press upgrade, or annual renewal from monthly).
  if (params.isReturningBuyer) {
    const html = baseTemplate({
      firstName,
      headline: `You're on ${meta.name} now.`,
      intro: `Your ${cycleLabel} subscription switched to ${meta.name}. Everything already unlocked stays unlocked — plus whatever this tier adds.`,
      bulletsHtml: "",
      ctaLabel: "Open dashboard",
      ctaHref: `${PROD_URL}/dashboard`,
      outro: `Any questions about the switch, just hit reply.`,
    });
    if (!resendKey) {
      console.log(`[Welcome] (dev) tier-switch receipt for ${params.email} — tier=${params.tier}`);
      return;
    }
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: params.email,
        subject: `Your Ownology tier is now ${meta.name}`,
        html,
        replyTo: "rich@ownology.ai",
      });
      console.log(`[Welcome] Tier-switch receipt sent to ${params.email} (${params.tier})`);
    } catch (err) {
      console.error(`[Welcome] Tier-switch send failed for ${params.email}:`, (err as Error).message);
    }
    return;
  }

  // ── First-time buyer — full warm welcome ─────────────────────────
  const bulletsHtml = `<div style="background:#faf7f0;border-left:3px solid #b8860b;padding:16px 20px;margin:20px 0;border-radius:4px">
    <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#b8860b;letter-spacing:0.04em;text-transform:uppercase">What just unlocked</p>
    <ul style="margin:0;padding-left:20px;font-size:14px;line-height:1.7;color:#374151">
      ${meta.unlocks.map((b) => `<li>${b}</li>`).join("")}
    </ul>
  </div>`;

  const html = baseTemplate({
    firstName,
    headline: meta.greeting,
    intro: `Your ${cycleLabel} subscription is live. Founding member pricing is locked to your account for as long as you stay subscribed — no rate hikes, no small print.`,
    bulletsHtml,
    ctaLabel: "Take me to my dashboard",
    ctaHref: `${PROD_URL}/dashboard`,
    outro: `Two quick notes before you dive in. First — I read every reply to this email, so if you get stuck or want a feature just hit reply. Second — the Curriculum works best on desktop first time through (30 lessons in Deep mode, then Flash mode for revision on your phone). Have a proper look around. It's your platform now.`,
  });

  if (!resendKey) {
    console.log(`[Welcome] (dev) subscription welcome for ${params.email} — tier=${params.tier}, cycle=${params.cycle}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `Welcome to Ownology · ${meta.name}`,
      html,
      replyTo: "rich@ownology.ai",
    });
    console.log(`[Welcome] Subscription welcome sent to ${params.email} (${params.tier})`);
  } catch (err) {
    console.error(`[Welcome] Subscription send failed for ${params.email}:`, (err as Error).message);
  }
}

/** Fire a credit-pack-purchase welcome email. Never throws. */
export async function sendCreditPackWelcome(params: {
  email: string;
  packName: string; // "Pour" | "Glass" | "Flight" | "Cellar"
  credits: number;
  isReturningBuyer?: boolean; // true = has bought credits before; send short top-up receipt
  newBalance?: number; // total balance AFTER this top-up (used in receipt copy)
}): Promise<void> {
  const resendKey = process.env.RESEND_API_KEY;
  if (!params.email) return;

  const firstName = firstNameFromEmail(params.email);

  // ── Returning buyer path — short top-up receipt ──────────────────
  if (params.isReturningBuyer) {
    const balanceLine = params.newBalance != null
      ? `You now have <strong>${params.newBalance.toLocaleString()} credits</strong> in the bank.`
      : "";
    const html = baseTemplate({
      firstName,
      headline: `${params.credits} credits topped up.`,
      intro: `Your ${params.packName} pack landed. ${balanceLine} Never expire, never reset.`,
      bulletsHtml: "",
      ctaLabel: "Ask a question",
      ctaHref: `${PROD_URL}/free-run`,
      outro: `Reply here if anything's off. Otherwise, back to the ferment.`,
    });
    if (!resendKey) {
      console.log(`[Welcome] (dev) credit top-up receipt for ${params.email} — +${params.credits}`);
      return;
    }
    try {
      const { Resend } = await import("resend");
      const resend = new Resend(resendKey);
      await resend.emails.send({
        from: `${FROM_NAME} <${FROM_EMAIL}>`,
        to: params.email,
        subject: `+${params.credits} Ownology credits`,
        html,
        replyTo: "rich@ownology.ai",
      });
      console.log(`[Welcome] Credit top-up receipt sent to ${params.email} (+${params.credits})`);
    } catch (err) {
      console.error(`[Welcome] Credit top-up send failed for ${params.email}:`, (err as Error).message);
    }
    return;
  }

  // ── First-time buyer — full warm welcome ─────────────────────────
  const bulletsHtml = `<div style="background:#faf7f0;border-left:3px solid #b8860b;padding:16px 20px;margin:20px 0;border-radius:4px">
    <p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#b8860b;letter-spacing:0.04em;text-transform:uppercase">Balance</p>
    <p style="margin:0;font-family:'Fraunces',Georgia,serif;font-size:28px;font-weight:700;color:#1f2937">${params.credits.toLocaleString()} credits</p>
    <p style="margin:4px 0 0;font-size:12px;color:#6b7280">Never expire · one credit unlocks a full Divine Trinity (Science · Vineyard · Craft)</p>
  </div>`;

  const html = baseTemplate({
    firstName,
    headline: `Your ${params.packName} pack is loaded.`,
    intro: `Credits are ready to spend. Each one unlocks a full Divine Trinity reveal — a question taken all the way to The Science, The Vineyard, and The Craft. No monthly reset, no expiry, no small print.`,
    bulletsHtml,
    ctaLabel: "Ask a question",
    ctaHref: `${PROD_URL}/free-run`,
    outro: `If you burn through these and want a subscription for unlimited access, the tiers are at <a href="${PROD_URL}/pricing" style="color:#b8860b">/pricing</a> — your pack purchase doesn't lock you out of upgrading. Hit reply to this email if you have any questions.`,
  });

  if (!resendKey) {
    console.log(`[Welcome] (dev) credit pack welcome for ${params.email} — pack=${params.packName}, credits=${params.credits}`);
    return;
  }

  try {
    const { Resend } = await import("resend");
    const resend = new Resend(resendKey);
    await resend.emails.send({
      from: `${FROM_NAME} <${FROM_EMAIL}>`,
      to: params.email,
      subject: `Your ${params.credits} Ownology credits are ready`,
      html,
      replyTo: "rich@ownology.ai",
    });
    console.log(`[Welcome] Credit pack welcome sent to ${params.email} (${params.packName})`);
  } catch (err) {
    console.error(`[Welcome] Credit pack send failed for ${params.email}:`, (err as Error).message);
  }
}
