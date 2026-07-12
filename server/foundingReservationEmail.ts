/**
 * foundingReservationEmail.ts — sends two Resend emails on reservation:
 *   1. Confirmation to the customer ("Slot #X reserved · Gel & Rich will DM you")
 *   2. Alert to the owner (ALERT_TEST_TO) with the reservation payload
 *
 * Both are best-effort. A failure here MUST NOT block the reservation write
 * — a warm lead in the DB is more valuable than a stalled UI. Errors are
 * logged for ops but swallowed at the caller.
 */
import { Resend } from "resend";

const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL ?? "https://ownology.ai";

type ReservationPayload = {
  slotNumber: number;
  name: string;
  email: string;
  wineryName: string;
  phone: string | null;
  tier: "cellar" | "press" | "cellar_master";
  cycle: "monthly" | "annual";
  referralCode: string | null;
};

const TIER_LABEL: Record<ReservationPayload["tier"], string> = {
  cellar: "The Cellar Hand",
  press: "The Press",
  cellar_master: "The Vigneron",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function renderCustomerHtml(p: ReservationPayload): string {
  const tierLabel = TIER_LABEL[p.tier];
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #111827; line-height: 1.55;">
  <p style="font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: #b45309; margin: 0 0 8px;">Founding Cohort · 2026 · reservation confirmed</p>
  <h1 style="font-family: Georgia, serif; font-size: 24px; margin: 0 0 16px; line-height: 1.3;">Slot #${p.slotNumber} of 99 — reserved for ${escapeHtml(p.wineryName)}.</h1>
  <p>Hi ${escapeHtml(p.name)},</p>
  <p>Your Founding Cohort · 2026 slot is locked in on the <strong>${escapeHtml(tierLabel)}</strong> tier (${p.cycle === "annual" ? "annual" : "monthly"}). We'll personally reach out within 24 hours to arrange payment and walk you through your first login — about 60 seconds.</p>
  <p style="margin: 24px 0; padding: 16px; background: #fef3c7; border-left: 3px solid #b45309; border-radius: 4px;">
    <strong style="color: #78350f;">What happens next:</strong><br>
    1. We'll DM or email you inside 24hrs to say hi.<br>
    2. Once payment's arranged, you get a 44-day trial (14 standard + 30 Founding Cohort bonus).<br>
    3. Your locked-in tier pricing is <strong>fixed for life</strong> — no annual increases, ever.
  </p>
  <p>While you wait — the ${p.referralCode ? "referrer's" : "public"} <a href="${PUBLIC_SITE_URL}/cellar-journal" style="color: #78350f;">Cellar Journal</a> has 236 winemaker Q&amp;As grounded in industry-standard oenology references. Free, no signup, forever.</p>
  <p style="font-size: 14px; color: #4b5563; margin-top: 32px;">If you didn't request this, just ignore the email — no charge, no follow-up.</p>
  <p style="font-size: 12px; color: #9ca3af; margin-top: 24px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
    Ownology · Geraldine &amp; Richard · Adelaide Hills, SA<br>
    Reply to this email if you have any questions.
  </p>
</body></html>`;
}

function renderCustomerText(p: ReservationPayload): string {
  const tierLabel = TIER_LABEL[p.tier];
  return [
    `Slot #${p.slotNumber} of 99 reserved for ${p.wineryName}.`,
    ``,
    `Hi ${p.name},`,
    ``,
    `Your Founding Cohort · 2026 slot is locked in on the ${tierLabel} tier (${p.cycle}). We'll reach out within 24hrs to arrange payment.`,
    ``,
    `What happens next:`,
    `1. We'll DM or email you inside 24hrs.`,
    `2. Once payment's arranged, you get a 44-day trial (14 + 30 Founding bonus).`,
    `3. Your locked-in pricing is fixed for life — no annual increases.`,
    ``,
    `Free while you wait: ${PUBLIC_SITE_URL}/cellar-journal (236 winemaker Q&As, no signup).`,
    ``,
    `If you didn't request this, just ignore the email.`,
    ``,
    `— Gel & Rich · Ownology`,
  ].join("\n");
}

function renderOwnerAlertHtml(p: ReservationPayload): string {
  return `<!doctype html><html><body style="font-family: -apple-system, Segoe UI, Roboto, monospace; max-width: 520px; margin: 0 auto; padding: 20px; color: #111827; line-height: 1.6;">
  <h2 style="font-family: Georgia, serif; margin: 0 0 12px; color: #78350f;">🍇 Founding Cohort · 2026 · reservation — Slot #${p.slotNumber}</h2>
  <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
    <tr><td style="padding: 4px 0; color: #6b7280; width: 120px;">Name</td><td>${escapeHtml(p.name)}</td></tr>
    <tr><td style="padding: 4px 0; color: #6b7280;">Winery</td><td>${escapeHtml(p.wineryName)}</td></tr>
    <tr><td style="padding: 4px 0; color: #6b7280;">Email</td><td><a href="mailto:${escapeHtml(p.email)}">${escapeHtml(p.email)}</a></td></tr>
    <tr><td style="padding: 4px 0; color: #6b7280;">Phone</td><td>${p.phone ? escapeHtml(p.phone) : "<em>not provided</em>"}</td></tr>
    <tr><td style="padding: 4px 0; color: #6b7280;">Tier / cycle</td><td>${escapeHtml(TIER_LABEL[p.tier])} · ${p.cycle}</td></tr>
    <tr><td style="padding: 4px 0; color: #6b7280;">Referral code</td><td>${p.referralCode ? escapeHtml(p.referralCode) : "<em>none</em>"}</td></tr>
  </table>
  <p style="margin: 20px 0 0; padding: 12px; background: #fef3c7; border-radius: 4px; font-size: 13px;">
    <strong>Action:</strong> DM or email within 24hrs. Once payment's confirmed, add them to <code>founding_members</code> and flip reservation status to <code>paid</code>.
  </p>
</body></html>`;
}

export async function sendReservationEmails(payload: ReservationPayload): Promise<{ customerSent: boolean; ownerSent: boolean }> {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev";
  const fromName = process.env.ALERT_FROM_NAME ?? "Ownology";
  const alertTo = process.env.ALERT_TEST_TO?.trim() || null;

  if (!apiKey) {
    console.warn("[reservation-email] RESEND_API_KEY missing — skipping send.");
    return { customerSent: false, ownerSent: false };
  }
  const resend = new Resend(apiKey);

  let customerSent = false;
  try {
    const send = await resend.emails.send({
      from: `${fromName} <${fromEmail}>`,
      to: [payload.email],
      subject: `Slot #${payload.slotNumber} reserved — Ownology Founding Cohort · 2026`,
      html: renderCustomerHtml(payload),
      text: renderCustomerText(payload),
      replyTo: fromEmail,
    });
    if (send.error) throw new Error(send.error.message ?? "Resend send failed");
    customerSent = true;
    console.log(`[reservation-email] confirmation sent to ${payload.email} (id=${send.data?.id})`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[reservation-email] confirmation FAILED for ${payload.email}: ${msg}`);
  }

  let ownerSent = false;
  if (alertTo) {
    try {
      const send = await resend.emails.send({
        from: `${fromName} <${fromEmail}>`,
        to: [alertTo],
        subject: `[Ownology] Reservation #${payload.slotNumber} — ${payload.wineryName}`,
        html: renderOwnerAlertHtml(payload),
        replyTo: payload.email,
      });
      if (send.error) throw new Error(send.error.message ?? "Resend send failed");
      ownerSent = true;
      console.log(`[reservation-email] owner alert sent to ${alertTo} (id=${send.data?.id})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`[reservation-email] owner alert FAILED: ${msg}`);
    }
  } else {
    console.warn("[reservation-email] ALERT_TEST_TO unset — owner alert skipped.");
  }

  return { customerSent, ownerSent };
}
