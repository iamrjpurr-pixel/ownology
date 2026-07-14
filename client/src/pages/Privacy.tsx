/**
 * Privacy — a plain-language privacy policy for Ownology.
 *
 * Written to be launch-ready, not lawyer-perfect. Covers the actual data we
 * collect (winery info, referral clicks, journal Q&As, LIP audit data) and
 * how we handle it (Railway MySQL in Sydney, Resend for email, no ad
 * networks, no data sale). If the operator ever adds new integrations that
 * touch user data, they should extend the "Who else touches your data" list
 * below rather than replace this doc.
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

export default function Privacy() {
  return (
    <div style={styles.page} data-testid="privacy-page">
      <div style={styles.wrap}>
        <p style={styles.eyebrow}>Ownology · Privacy</p>
        <h1 style={styles.h1}>How we handle your data.</h1>
        <p style={styles.sub}>Last updated · February 2026 · Effective for all users on ownology.ai</p>

        <h2 style={styles.h2}>What we collect</h2>
        <p style={styles.p}>Only what makes Ownology useful to you as a winemaker:</p>
        <ul style={styles.ul}>
          <li><strong>Account</strong>: your name, email, and (optional) first name for warm-intro attribution.</li>
          <li><strong>Winery profile</strong>: winery name, region, logo URL, brand colour, plan tier, and referral code.</li>
          <li><strong>Cellar data</strong>: whatever you log — batches, tanks, vintage-log entries, LIP compliance data, SOP notes, equipment register, and every fill / rack / clean / sanitise event captured by the Cellar Board.</li>
          <li><strong>Compliance records</strong>: the Cellar Book PDF, LIP Audit Pack, Compliance Audit Trail, and any other regulator-facing export are generated on demand from the log data above. They live in memory long enough to serve the download, not on our disks.</li>
          <li><strong>Usage</strong>: page visits, feature clicks (via privacy-friendly analytics — no cookies, no cross-site tracking).</li>
          <li><strong>Referral events</strong>: when someone clicks your <code>/join?ref=CODE</code> link, we log the click (email optional). Only you and the referrer see this.</li>
        </ul>

        <h2 style={styles.h2}>What we don&apos;t collect</h2>
        <ul style={styles.ul}>
          <li>We don&apos;t use ad networks or third-party trackers.</li>
          <li>We don&apos;t sell your data. Ever. To anyone.</li>
          <li>We don&apos;t train third-party AI models on your cellar data, tank logs, or SOPs.</li>
          <li>We don&apos;t read your data unless you ask us to (support ticket, debug session — with your written consent).</li>
        </ul>

        <h2 style={styles.h2}>Where your data lives</h2>
        <ul style={styles.ul}>
          <li><strong>Database</strong>: Railway managed MySQL, hosted in Sydney (AU). Full backups every 24 hours; backup snapshots purge on the standard 30-day rotation.</li>
          <li><strong>Transactional email</strong>: Resend for receipts, digests, nurture sequences, operator alerts. Resend never sees the content of your cellar data — only the subject/body of the messages we send you.</li>
          <li><strong>Newsletter list</strong>: Buttondown holds the email addresses of people who opted into the Ownology newsletter or waitlist. Contains email + tags only; no cellar data.</li>
          <li><strong>AI processing</strong>: When you use Ask Ownology, Owen (AI Tutor), or Cellar Brief, your question and the retrieved SOP / knowledge chunks are sent through the Emergent LLM Gateway to the underlying model (Claude by Anthropic, GPT by OpenAI, or Gemini by Google, depending on the task). No prompt or response data is retained by the model provider after the request completes.</li>
          <li><strong>Research (opt-in)</strong>: A small set of Owen queries can call Perplexity for grounded web research when you explicitly opt in. Perplexity receives the query only — never your cellar data.</li>
          <li><strong>Payments</strong>: Stripe. We never see your card number; Stripe handles the full PCI perimeter.</li>
        </ul>

        <h2 style={styles.h2}>Sub-processors</h2>
        <p style={styles.p}>The list is intentionally short, and it matches the sub-processor block in our <Link href="/terms">Terms of Service</Link>:</p>
        <ul style={styles.ul}>
          <li><strong>Railway</strong> (Sydney) — managed MySQL database.</li>
          <li><strong>Resend</strong> (US) — transactional email delivery.</li>
          <li><strong>Buttondown</strong> (US) — newsletter list management.</li>
          <li><strong>Emergent LLM Gateway</strong> — inference across Anthropic Claude, OpenAI GPT, and Google Gemini.</li>
          <li><strong>Perplexity</strong> (US) — grounded web research on opt-in tutor queries only.</li>
          <li><strong>Stripe</strong> (US/AU) — payments and subscription management.</li>
        </ul>
        <p style={styles.p}>No advertising partners, no data brokers, no analytics companies with tracking pixels. When we add or replace a sub-processor, we email existing customers at least 30 days before the change takes effect.</p>

        <h2 style={styles.h2}>Your rights (GDPR + Australian Privacy Act)</h2>
        <p style={styles.p}>You can:</p>
        <ul style={styles.ul}>
          <li>Access everything we hold about you — email us and we&apos;ll send a JSON / CSV / PDF export within 7 days.</li>
          <li>Correct anything wrong — most of it is editable from <code>/admin/settings</code>; the rest, email us.</li>
          <li>Delete your account — email us and we&apos;ll permanently remove your data within 30 days of the request. Backup snapshots purge on the standard 30-day rotation.</li>
          <li>Object to a specific processing purpose — email us.</li>
          <li>Complain to your local regulator (OAIC in Australia, ICO in the UK, your DPA in the EU) if you think we&apos;re mishandling your data.</li>
        </ul>

        <h2 style={styles.h2}>Cookies</h2>
        <p style={styles.p}>We use two: a session cookie so you stay logged in, and a gate cookie for the pre-launch preview lock. No advertising cookies, no third-party cookies, no cross-site trackers. We don&apos;t need a cookie banner because we don&apos;t set any cookies that require consent under GDPR/AU law.</p>

        <h2 style={styles.h2}>Data retention</h2>
        <p style={styles.p}>We keep your cellar data for as long as your account is active. After cancellation we retain it for 12 months so reactivation is painless — then it&apos;s permanently deleted unless you&apos;ve asked us to sooner. Referral events, audit logs, and compliance exports are kept for 24 months for regulator-defensible traceability, then deleted. Backup snapshots follow their own 30-day rotation.</p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>Data questions, deletion requests, or complaints: <strong>privacy@ownology.ai</strong> — replied to within 48 hours by a real person.</p>

        <Link href="/" data-testid="privacy-back" style={styles.back}>← Back to Ownology</Link>
      </div>
    </div>
  );
}
