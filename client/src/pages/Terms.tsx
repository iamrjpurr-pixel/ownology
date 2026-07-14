/**
 * Terms — plain-language terms of service.
 *
 * Written to be readable by a human winemaker, not a lawyer. Refreshed
 * Feb 2026 to match what the product actually does: RAG Cellar Board,
 * Cellar Book PDF, Owen AI Tutor, Weekly Cellar Digest, LIP Audit Pack,
 * Cellar Journal, and three-tier Founding-Member subscriptions.
 *
 * Governing law: South Australia. Cheapest sensible jurisdiction for the
 * operator; users can still enforce local consumer rights on top of these
 * terms per Australian Consumer Law.
 */
import { Link } from "wouter";

const styles = {
  page: { minHeight: "100dvh", background: "var(--ow-bg-base)", padding: "3rem 1.5rem 4rem", color: "var(--ow-text-hi)" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  eyebrow: { fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ow-amber)", margin: 0 },
  h1: { fontFamily: "'Fraunces',serif", fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.15, margin: "0.5rem 0 0.75rem" },
  sub: { fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", fontSize: "0.85rem", margin: 0 },
  h2: { fontFamily: "'Fraunces',serif", fontSize: "1.35rem", fontWeight: 700, marginTop: "2.5rem", marginBottom: "0.75rem" },
  p: { fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", lineHeight: 1.65, color: "var(--ow-text-mid)", margin: "0 0 1rem" },
  ul: { fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ow-text-mid)", paddingLeft: "1.25rem", margin: "0 0 1rem" },
  back: { display: "inline-block", marginTop: "3rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-amber)" },
};

export default function Terms() {
  return (
    <div style={styles.page} data-testid="terms-page">
      <div style={styles.wrap}>
        <p style={styles.eyebrow}>Ownology · Terms</p>
        <h1 style={styles.h1}>The deal, in plain language.</h1>
        <p style={styles.sub}>Last updated · February 2026 · By using Ownology, you agree to these terms.</p>

        <h2 style={styles.h2}>What Ownology is</h2>
        <p style={styles.p}>
          Ownology is a web-based cellar-intelligence platform for winemakers. What&apos;s in the box today:
        </p>
        <ul style={styles.ul}>
          <li><strong>Cellar Board & Equipment Traceability</strong> — RAG (Red/Amber/Green) status for every vessel, computed from your cleaning and rack events.</li>
          <li><strong>Cellar Book PDF & LIP Audit Pack</strong> — audit-ready deliverables per batch and per vintage, generated from your own log.</li>
          <li><strong>Vintage Log & Batch Book</strong> — event capture (additions, racking, MLF, bottling), tank volume balance, and lot traceability.</li>
          <li><strong>Owen (AI Tutor) & Ask Ownology</strong> — grounded, source-cited answers to compliance and winemaking questions.</li>
          <li><strong>Cellar Brief & Weekly Cellar Digest</strong> — a live operations summary in-app and a weekly email.</li>
          <li><strong>Cellar Journal</strong> — a public, SEO-indexed journal you can opt into for each entry.</li>
        </ul>
        <p style={styles.p}>
          We&apos;re not selling wine, we&apos;re not consulting, and we&apos;re not a regulator. Features may change during pre-1.0 (see <em>Beta status</em> below).
        </p>

        <h2 style={styles.h2}>What you agree to when you use it</h2>
        <ul style={styles.ul}>
          <li>You&apos;re at least 18.</li>
          <li>You have the legal right to use the winery data you upload (it&apos;s yours, or you have permission).</li>
          <li>You won&apos;t use Ownology to break the law, defraud regulators, or fabricate compliance documents.</li>
          <li>You&apos;re responsible for the accuracy of what you log. Ownology&apos;s outputs (LIP compliance calc, Cellar Book PDF, Cellar Brief, Ask Ownology answers) are only as good as the data you put in.</li>
          <li>You&apos;ll keep your gate password, login credentials, and account access confidential. One paid seat per account, except The Vigneron tier which includes three seats.</li>
          <li>You won&apos;t abuse the AI features — no bulk-generating spam, no scraping our LLM outputs to train competing models.</li>
        </ul>

        <h2 style={styles.h2}>Compliance record-keeping</h2>
        <p style={styles.p}>
          The Cellar Book PDF, LIP Audit Pack, Compliance Audit Trail, and any other regulator-facing export are records <em>you</em> generate from data <em>you</em> logged. When you sign or produce one of these to a regulator (FSANZ, Wine Australia, state liquor licensing), <strong>you</strong> attest to its accuracy — Ownology does not certify, warrant, or vouch for the underlying data.
        </p>
        <p style={styles.p}>
          We make the report shape correct and the calculations transparent. What you put in the log, and what you tell an auditor, is on you.
        </p>

        <h2 style={styles.h2}>AI and LLM use</h2>
        <ul style={styles.ul}>
          <li>Owen (AI Tutor), Ask Ownology, and the Cellar Brief summaries use large language models grounded on our SOP library, Australian regulatory doctrine, and cited sources. Answers are advisory — verify anything material before you act on it in the cellar or in a compliance filing.</li>
          <li>We do <strong>not</strong> use your cellar data, tank logs, or private notes to train foundation models. Your data is used only to answer <em>your</em> queries and generate <em>your</em> reports.</li>
          <li>Sources are cited so you can check the primary reference yourself. When the model can&apos;t find a grounded answer, it says so.</li>
        </ul>

        <h2 style={styles.h2}>Payment</h2>
        <ul style={styles.ul}>
          <li><strong>The Cellar Hand</strong> — AUD $19/month or $190/year. Unlimited Compliance Agent queries, full lesson library, working board, 30 AI-tutor credits/month.</li>
          <li><strong>The Press</strong> — AUD $49/month or $490/year. Everything in The Cellar Hand plus 150 AI-tutor credits/month, custom document upload, priority responses, vintage log PDF export.</li>
          <li><strong>The Vigneron</strong> — AUD $99/month or $990/year. Everything in The Press plus unlimited AI credits, three team seats, dedicated onboarding, and an annual knowledge-base review alert.</li>
          <li><strong>Founding Members</strong> (the first 99 subscribers) lock the above rates for the lifetime of their subscription. See <Link href="/pricing">/pricing</Link> for current availability.</li>
          <li><strong>Billing</strong> — monthly or annual via Stripe. Cancel any time from <code>/admin/settings</code> or by emailing us; you keep access to the end of the current period.</li>
          <li><strong>Tax</strong> — Australian customers see GST-inclusive prices at checkout. Non-Australian customers are billed exclusive of local taxes.</li>
          <li><strong>Refunds</strong> — see the <Link href="/refund">Refund Policy</Link> for the 30-day money-back guarantee.</li>
        </ul>

        <h2 style={styles.h2}>What we owe you</h2>
        <ul style={styles.ul}>
          <li><strong>Best-effort uptime</strong> — we target 99.5% monthly availability. If we have a material outage that interrupts your work, email us and we&apos;ll credit your account fairly. No auto-triggered SLA maths; we&apos;ll deal with you in good faith.</li>
          <li><strong>Honest change communication</strong> — we&apos;ll email you at least 30 days before shipping anything that changes how your data is handled, priced, or exported. Cosmetic tweaks and normal feature releases don&apos;t trigger notice.</li>
          <li><strong>A working export</strong> — you can always get your cellar data out. Structured JSON, CSV, or the PDF reports we already generate (Audit Trail, LIP Audit Pack, Cellar Book, Vintage Card). No lock-in.</li>
          <li><strong>Founding-Member price lock</strong> — anyone who bought a Founding-Member subscription before we hit 99 sold keeps their locked tier price for as long as their subscription stays active.</li>
        </ul>

        <h2 style={styles.h2}>What we don&apos;t owe you</h2>
        <ul style={styles.ul}>
          <li><strong>Regulatory certification.</strong> The Cellar Book PDF, LIP Audit Pack, and Compliance Audit Trail are records generated from your data. Ownology is not accredited by FSANZ, Wine Australia, or any state licensing body — see <em>Compliance record-keeping</em> above.</li>
          <li><strong>Legal or oenological advice.</strong> Ask Ownology and Owen are research tools, not licensed consultants. Verify anything material before acting on it.</li>
          <li><strong>Perfect AI.</strong> Sometimes the LLM will be wrong. We cite our sources — check them.</li>
          <li><strong>Third-party integrations</strong> outside our control — Stripe checkout, Resend email delivery, upstream LLM providers, etc. We&apos;ll route around outages where we can, but we don&apos;t warrant every downstream service.</li>
        </ul>

        <h2 style={styles.h2}>Your content & our IP</h2>
        <p style={styles.p}>
          Everything you enter — batch data, tank logs, vessel register, journal entries, uploaded documents — remains yours. You grant Ownology a limited licence to store, process, and display that content for the sole purpose of running the service for you (including generating reports, computing RAG status, and answering your queries).
        </p>
        <p style={styles.p}>
          The Ownology platform itself — code, UI, SOP library, doctrine base, model prompts, brand — remains ours. You get a licence to use it, not to copy, resell, or scrape it.
        </p>

        <h2 style={styles.h2}>Sub-processors</h2>
        <p style={styles.p}>
          We rely on a small set of vetted third parties to run the service. As of the last-updated date:
        </p>
        <ul style={styles.ul}>
          <li><strong>Stripe</strong> — payments and subscription management.</li>
          <li><strong>Resend</strong> — transactional and digest emails.</li>
          <li><strong>Buttondown</strong> — newsletter list management.</li>
          <li><strong>Emergent LLM Gateway</strong> — inference across Claude, Gemini, and OpenAI models for Owen, Ask Ownology, and Cellar Brief.</li>
          <li><strong>Perplexity</strong> — grounded web research for a small set of tutor queries (opt-in).</li>
          <li><strong>Railway</strong> — managed MySQL host for your cellar data.</li>
        </ul>
        <p style={styles.p}>
          See the <Link href="/privacy">Privacy Policy</Link> for how these processors handle your data and where it&apos;s stored.
        </p>

        <h2 style={styles.h2}>Data retention</h2>
        <p style={styles.p}>
          While your subscription is active, we keep your data indefinitely so your logbook and reports stay intact. After cancellation we retain your data for 12 months to make reactivation painless, then hard-delete unless you&apos;ve asked us to sooner. You can request an export or immediate deletion at any time (see Contact).
        </p>

        <h2 style={styles.h2}>Beta status</h2>
        <p style={styles.p}>
          Ownology is pre-1.0. During the Founding-Member period we ship weekly, occasionally deprecate features that aren&apos;t landing, and rename UI as we sharpen the language. Material changes to data handling, pricing, or exports still trigger the 30-day email notice above. Cosmetic shipping is continuous.
        </p>

        <h2 style={styles.h2}>Termination</h2>
        <p style={styles.p}>
          You can cancel any time from <code>/admin/settings</code> or by emailing us. We can terminate your account if you materially breach these terms (fabricated compliance data, LLM abuse, non-payment after 14 days). In either case, we&apos;ll offer you an export of your data within 7 days of termination.
        </p>

        <h2 style={styles.h2}>Liability</h2>
        <p style={styles.p}>
          To the extent allowed by law, our total liability to you for any claim relating to Ownology is capped at what you&apos;ve paid us in the previous 12 months (or AUD $200, whichever is higher). This doesn&apos;t override any non-excludable rights you have under Australian Consumer Law or your local equivalent.
        </p>

        <h2 style={styles.h2}>Changes to these terms</h2>
        <p style={styles.p}>
          We&apos;ll email you at least 30 days before any material change (pricing, data handling, export format, sub-processor list). Typos, restructures, and clarifications that don&apos;t change your rights or ours don&apos;t require notice. If you don&apos;t like a material change, you can cancel and get a pro-rata refund for the unused period.
        </p>

        <h2 style={styles.h2}>Governing law</h2>
        <p style={styles.p}>
          These terms are governed by the laws of South Australia. Both parties agree to try mediation before litigation; if that fails, disputes go to the courts of Adelaide.
        </p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>
          Anything terms-related: <strong>legal@ownology.ai</strong>. Data export or deletion requests: <strong>privacy@ownology.ai</strong>. We reply within 48 hours.
        </p>

        <Link href="/" data-testid="terms-back" style={styles.back}>← Back to Ownology</Link>
      </div>
    </div>
  );
}
