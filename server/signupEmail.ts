/**
 * signupEmail.ts — on a brand-new free account: a warm welcome to the user
 * and an alert to the owner (ALERT_TEST_TO). Fire-and-forget; never blocks sign-in.
 */
import { Resend } from "resend";
import { isTestEmail } from "../shared/testEmails.js";

const SITE = process.env.PUBLIC_SITE_URL ?? "https://ownology.ai";

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

function welcomeHtml(first: string) {
  return `<!doctype html><html><body style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1f2937;line-height:1.6">
  <p>Hi ${esc(first)},</p>
  <p>Welcome to Ownology. Your Brand Vault is set up and ready. It's the place your wine specs live, owned by you, with contract winemakers logging their work against them.</p>
  <p style="margin:20px 0;padding:16px;background:#fef3c7;border-left:3px solid #b45309;border-radius:4px">
    <strong>Three things to try first:</strong><br>
    1. Add the sample wine to see how a spec and cellar record look.<br>
    2. Add your flagship wine: blend, vineyard sources, targets.<br>
    3. Invite your contract winemaker, if you use one.
  </p>
  <p><a href="${SITE}/brand" style="display:inline-block;background:#b45309;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none;font-weight:600">Open my Brand Vault</a></p>
  <p>Prefer to look before you touch anything? The <a href="${SITE}/demo/tour" style="color:#78350f">3-minute tour</a> shows it all with sample data.</p>
  <p>Sign in with the same Google account you used today. Any questions, just reply. It comes straight to me.</p>
  <p>Cheers,<br>Rich<br>Ownology</p>
</body></html>`;
}

const welcomeText = (first: string) => [
  `Hi ${first},`, ``,
  `Welcome to Ownology. Your Brand Vault is set up and ready.`, ``,
  `Three things to try first:`,
  `1. Add the sample wine to see how a spec and cellar record look.`,
  `2. Add your flagship wine: blend, vineyard sources, targets.`,
  `3. Invite your contract winemaker, if you use one.`, ``,
  `Open it: ${SITE}/brand`,
  `Or take the 3-minute tour first: ${SITE}/demo/tour`, ``,
  `Sign in with the same Google account you used today. Any questions, just reply.`, ``,
  `Cheers,`, `Rich`, `Ownology`,
].join("\n");

export async function sendSignupEmails(user: { name: string; email: string; via: string }): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const email = user.email.trim();
  if (!apiKey || !email || isTestEmail(email)) return;
  const from = `${process.env.ALERT_FROM_NAME ?? "Ownology"} <${process.env.ALERT_FROM_EMAIL ?? "onboarding@resend.dev"}>`;
  const alertTo = process.env.ALERT_TEST_TO?.trim() || null;
  const first = (user.name || "there").split(/\s+/)[0];
  const resend = new Resend(apiKey);

  try {
    const r = await resend.emails.send({ from, to: [email], subject: "Welcome to Ownology — your Brand Vault is ready", html: welcomeHtml(first), text: welcomeText(first), replyTo: alertTo ?? undefined });
    if (r.error) throw new Error(r.error.message);
    console.log(`[signup-email] welcome sent to ${email}`);
  } catch (err) {
    console.error(`[signup-email] welcome FAILED for ${email}:`, (err as Error).message);
  }

  if (!alertTo) return;
  try {
    const r = await resend.emails.send({
      from, to: [alertTo], replyTo: email,
      subject: `[Ownology] New sign-up — ${user.name || email}`,
      text: [`${user.name || "(no name)"} <${email}> just created a free account via ${user.via}.`, ``, `Their card: ${SITE}/admin/people?q=${encodeURIComponent(email)}`, `Reply to this email to write to them directly.`].join("\n"),
    });
    if (r.error) throw new Error(r.error.message);
  } catch (err) {
    console.error("[signup-email] owner alert FAILED:", (err as Error).message);
  }
}
