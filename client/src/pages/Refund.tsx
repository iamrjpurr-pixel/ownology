/**
 * Refund — a plain-language refund policy.
 *
 * Written to be generous — because a boutique winemaker is not going to
 * refund-abuse a $997 SaaS. The 30-day guarantee is stronger than what
 * most competitors offer, which reduces the "is this real?" objection
 * during the Founding-Member checkout. Founding-Member locked pricing is
 * NOT refundable after 30 days because that&apos;s the whole point of the
 * lifetime lock-in — no take-backsies once we hit the 99 cap.
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
  hero: { padding: "1.25rem 1.5rem", background: "color-mix(in oklch, #166534 8%, transparent)", border: "1px solid #16653455", borderRadius: 6, marginTop: "1.5rem" },
  back: { display: "inline-block", marginTop: "3rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-amber)" },
};

export default function Refund() {
  return (
    <div style={styles.page} data-testid="refund-page">
      <div style={styles.wrap}>
        <p style={styles.eyebrow}>Ownology · Refund policy</p>
        <h1 style={styles.h1}>30 days. No questions asked.</h1>
        <p style={styles.sub}>Last updated · February 2026 · Applies to every paying customer</p>

        <div style={styles.hero}>
          <p style={{ ...styles.p, margin: 0, color: "#166534", fontWeight: 700 }}>
            If Ownology doesn&apos;t earn its keep in your first 30 days, email us and we&apos;ll refund every cent. No forms, no questions, no "what could we have done better" survey.
          </p>
        </div>

        <h2 style={styles.h2}>How the guarantee works</h2>
        <ul style={styles.ul}>
          <li>Applies to every paid tier: monthly, annual, and Founding Member.</li>
          <li>Window: 30 days from the date of your first paid charge.</li>
          <li>How to claim: email <strong>refunds@ownology.ai</strong> from the same email address you paid with. Include your name and reason (optional but appreciated — helps us improve).</li>
          <li>Turnaround: refunds are processed within 3 business days. Stripe usually clears them to your card within 5–10 more days depending on your bank.</li>
          <li>After the refund clears, we delete your account and all cellar data within 30 days (per <Link href="/privacy">Privacy Policy</Link>).</li>
        </ul>

        <h2 style={styles.h2}>What&apos;s not refundable</h2>
        <ul style={styles.ul}>
          <li><strong>Founding Member after day 30</strong> — the whole point of the Founding-Member tier is locked-in lifetime pricing. Once the 30-day window closes, the $997 becomes a permanent commitment (and gets you the permanently-locked rate). We&apos;ll never re-open this offer, so we can&apos;t undo it either.</li>
          <li><strong>Merch orders</strong> — apparel and printed materials follow the printer&apos;s standard return policy (usually not returnable once shipped). Contact us if there&apos;s a defect and we&apos;ll sort it.</li>
          <li><strong>Free plan usage</strong> — nothing to refund.</li>
        </ul>

        <h2 style={styles.h2}>What about pro-rata refunds?</h2>
        <p style={styles.p}>If you cancel an annual plan mid-year (outside the 30-day guarantee window), we&apos;ll pro-rate the unused months and refund the balance. Monthly plans just stop at the end of the current billing cycle — no partial refund needed.</p>

        <h2 style={styles.h2}>Chargebacks</h2>
        <p style={styles.p}>We&apos;d always rather refund you directly than fight a chargeback — it&apos;s cheaper for both of us. If something&apos;s gone wrong, email us first. We answer within 48 hours.</p>

        <h2 style={styles.h2}>Your consumer rights come first</h2>
        <p style={styles.p}>This policy sits on top of your rights under Australian Consumer Law (or the equivalent in your jurisdiction). If our refund policy is ever less generous than what the law requires, the law wins.</p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>Refund questions: <strong>refunds@ownology.ai</strong>. Real human, ≤48 hour response.</p>

        <Link href="/" data-testid="refund-back" style={styles.back}>← Back to Ownology</Link>
      </div>
    </div>
  );
}
