/**
 * Terms — plain-language terms of service.
 *
 * Written to be readable by a human winemaker, not a lawyer. Covers the
 * things that actually matter for a SaaS at launch: what the service does,
 * what you owe us (payment, honest use), what we owe you (uptime, honesty),
 * what happens when things go wrong, and how disputes get resolved.
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
        <p style={styles.p}>Ownology is a web-based cellar-intelligence tool for winemakers. We help you log fermentation events, ask AI-grounded questions, generate compliance PDFs (LIP Audit Pack), and share your cellar journal publicly. That&apos;s it. We&apos;re not selling wine, we&apos;re not consulting, and we&apos;re not a regulator.</p>

        <h2 style={styles.h2}>What you agree to when you use it</h2>
        <ul style={styles.ul}>
          <li>You&apos;re at least 18.</li>
          <li>You have the legal right to use the winery data you upload (it&apos;s yours, or you have permission).</li>
          <li>You won&apos;t use Ownology to break the law, defraud regulators, or generate fake compliance documents.</li>
          <li>You&apos;re responsible for the accuracy of what you log. Ownology&apos;s outputs (LIP compliance calc, Cellar Brief summaries, Ask Ownology answers) are only as good as the data you put in.</li>
          <li>You won&apos;t abuse the AI features — no bulk-generating spam, no scraping our LLM outputs to train competing models.</li>
        </ul>

        <h2 style={styles.h2}>What we owe you</h2>
        <ul style={styles.ul}>
          <li>Best-effort uptime (target 99.5% — we&apos;ll credit you pro-rata if we miss it for a full month).</li>
          <li>Honest change communication — we&apos;ll email you before we ship anything that changes how your data is handled.</li>
          <li>A working export — you can always get your cellar data out as a JSON dump. No lock-in.</li>
          <li>Founding-Member commitments — locked pricing forever for anyone who bought a Founding-Member slot before we hit 99 sold.</li>
        </ul>

        <h2 style={styles.h2}>What we don&apos;t owe you</h2>
        <ul style={styles.ul}>
          <li>Regulatory certification. The LIP Audit Pack is a record you generate from your own data. If a regulator disputes it, that&apos;s between you and the regulator — we make the report shape correct, we don&apos;t vouch for the underlying data.</li>
          <li>Legal or oenological advice. Ask Ownology is a research tool, not a licensed consultant. Verify anything material before acting on it.</li>
          <li>Perfect AI. Sometimes the LLM will be wrong. We cite our sources — check them.</li>
        </ul>

        <h2 style={styles.h2}>Payment</h2>
        <ul style={styles.ul}>
          <li><strong>Free trial</strong>: 14 days from signup, no credit card required. Extended by referral credits when your invites convert.</li>
          <li><strong>Paid plans</strong>: billed monthly or annually via Stripe. Cancel any time; you keep access to end of the current period.</li>
          <li><strong>Founding Member</strong>: $997 AUD one-off. Locks in the paid tier at a permanent Founding-Member rate. See <Link href="/refund">Refund Policy</Link> for the 30-day guarantee.</li>
          <li><strong>Tax</strong>: prices exclude GST for non-Australian customers. Australian customers see GST-inclusive pricing at checkout.</li>
        </ul>

        <h2 style={styles.h2}>Termination</h2>
        <p style={styles.p}>You can cancel any time from /admin/settings or by emailing us. We can terminate your account if you materially breach these terms (fake compliance data, LLM abuse, non-payment after 14 days). In either case, we&apos;ll give you a JSON export of your data within 7 days of termination.</p>

        <h2 style={styles.h2}>Liability</h2>
        <p style={styles.p}>To the extent allowed by law, our total liability to you for any claim relating to Ownology is capped at what you&apos;ve paid us in the previous 12 months (or $200 AUD, whichever is higher). This doesn&apos;t override any non-excludable rights you have under Australian Consumer Law or your local equivalent.</p>

        <h2 style={styles.h2}>Changes to these terms</h2>
        <p style={styles.p}>We&apos;ll email you 30 days before any material change. If you don&apos;t like it, you can cancel and get a pro-rata refund for the unused period.</p>

        <h2 style={styles.h2}>Governing law</h2>
        <p style={styles.p}>These terms are governed by the laws of South Australia. Both parties agree to try mediation before litigation; if that fails, disputes go to the courts of Adelaide.</p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>Anything terms-related: <strong>legal@ownology.ai</strong> — reply within 48 hours.</p>

        <Link href="/" data-testid="terms-back" style={styles.back}>← Back to Ownology</Link>
      </div>
    </div>
  );
}
