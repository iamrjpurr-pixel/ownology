/**
 * Cookies — plain-language cookie policy for Ownology.
 *
 * Written to match the voice + structure of Privacy.tsx (see /privacy) so
 * the two docs read like siblings. Reflects the actual cookies we set:
 *   - app_session_id (auth session, HttpOnly + Secure + SameSite=Lax)
 *   - ow_gate        (pre-launch gate token, expires with the campaign)
 *   - No third-party cookies, no ad/analytics tracking, no cross-site
 *     pixels. That's a deliberate product choice, not just a design gap.
 *
 * Feb 2026, Rich.
 */
import { Link } from "wouter";
import { Helmet } from "react-helmet";

const styles = {
  page: { minHeight: "100dvh", background: "var(--ow-bg-base)", padding: "3rem 1.5rem 4rem", color: "var(--ow-text-hi)" },
  wrap: { maxWidth: 720, margin: "0 auto" },
  eyebrow: { fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase" as const, color: "var(--ow-amber)", margin: 0 },
  h1: { fontFamily: "'Fraunces',serif", fontSize: "2.25rem", fontWeight: 700, lineHeight: 1.15, margin: "0.5rem 0 0.75rem" },
  sub: { fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)", fontSize: "0.85rem", margin: 0 },
  h2: { fontFamily: "'Fraunces',serif", fontSize: "1.35rem", fontWeight: 700, marginTop: "2.5rem", marginBottom: "0.75rem" },
  p: { fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", lineHeight: 1.65, color: "var(--ow-text-mid)", margin: "0 0 1rem" },
  ul: { fontFamily: "'Lato',sans-serif", fontSize: "0.95rem", lineHeight: 1.7, color: "var(--ow-text-mid)", paddingLeft: "1.25rem", margin: "0 0 1rem" },
  table: { width: "100%", borderCollapse: "collapse" as const, fontFamily: "'Lato',sans-serif", fontSize: "0.88rem", color: "var(--ow-text-mid)", margin: "0 0 1rem" },
  th: { textAlign: "left" as const, padding: "0.6rem 0.75rem", borderBottom: "1px solid var(--ow-border)", fontFamily: "'JetBrains Mono',monospace", fontSize: "0.7rem", letterSpacing: "0.08em", textTransform: "uppercase" as const, color: "var(--ow-text-lo)" },
  td: { padding: "0.65rem 0.75rem", borderBottom: "1px solid var(--ow-border)", verticalAlign: "top" as const, lineHeight: 1.55 },
  code: { fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem", color: "var(--ow-text-hi)" },
  back: { display: "inline-block", marginTop: "3rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-amber)" },
};

export default function Cookies() {
  return (
    <div style={styles.page} data-testid="cookies-page">
      <Helmet>
        <title>Cookie Policy · Ownology</title>
        <meta name="description" content="What cookies Ownology sets and why. Two cookies, both essential — no advertising cookies, no third-party trackers, no cross-site pixels." />
      </Helmet>
      <div style={styles.wrap}>
        <p style={styles.eyebrow}>Ownology · Cookies</p>
        <h1 style={styles.h1}>What we set, and why.</h1>
        <p style={styles.sub}>Last updated · February 2026 · Effective for all visitors to ownology.ai</p>

        <h2 style={styles.h2}>The short version</h2>
        <p style={styles.p}>
          Ownology sets two cookies — both strictly essential to the site working. We don&apos;t use advertising cookies, third-party trackers, cross-site pixels, or session-replay tools. That&apos;s why there&apos;s no consent banner: under GDPR and Australian Privacy Act rules, cookies that are essential to a service you&apos;ve asked for don&apos;t require opt-in.
        </p>

        <h2 style={styles.h2}>The cookies we set</h2>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={styles.th}>Cookie</th>
              <th style={styles.th}>Purpose</th>
              <th style={styles.th}>Lifetime</th>
              <th style={styles.th}>Flags</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={styles.td}><code style={styles.code}>app_session_id</code></td>
              <td style={styles.td}>Keeps you signed in after login. Contains a signed session JWT — no personal data readable client-side.</td>
              <td style={styles.td}>7 days rolling</td>
              <td style={styles.td}><code style={styles.code}>HttpOnly</code> <code style={styles.code}>Secure</code> <code style={styles.code}>SameSite=Lax</code></td>
            </tr>
            <tr>
              <td style={styles.td}><code style={styles.code}>ow_gate</code></td>
              <td style={styles.td}>Unlocks pre-launch pages when set via a magic-link invite. Prevents cold visitors from seeing partner-only surfaces during warm outreach campaigns.</td>
              <td style={styles.td}>Campaign-scoped (typically 30 days)</td>
              <td style={styles.td}><code style={styles.code}>HttpOnly</code> <code style={styles.code}>Secure</code> <code style={styles.code}>SameSite=Lax</code></td>
            </tr>
          </tbody>
        </table>
        <p style={styles.p}>Cloudflare, our edge provider, may also set a <code style={styles.code}>__cf_bm</code> bot-management cookie for security. It expires within 30 minutes, is scoped to the request only, and doesn&apos;t identify you — it identifies whether the request looks like a scripted bot.</p>

        <h2 style={styles.h2}>What we don&apos;t set</h2>
        <ul style={styles.ul}>
          <li>No advertising cookies. We don&apos;t sell ads and we don&apos;t buy them, so there&apos;s nothing to attribute.</li>
          <li>No cross-site tracking pixels. Facebook Pixel, Google Ads Pixel, TikTok Pixel — none of them are on the site.</li>
          <li>No session-replay cookies. Hotjar, FullStory, LogRocket — none present. We don&apos;t need to watch you use the app.</li>
          <li>No third-party analytics cookies. Our analytics is <Link href="/privacy" style={{ color: "var(--ow-amber)" }}>privacy-friendly and cookie-free</Link> — page visits and feature clicks, aggregated, nothing identifying.</li>
        </ul>

        <h2 style={styles.h2}>Third parties (only when you use their feature)</h2>
        <p style={styles.p}>Some pages embed a third-party widget only when you interact with it. When you do, those services may set their own cookies:</p>
        <ul style={styles.ul}>
          <li><strong>Stripe Checkout</strong> — sets Stripe&apos;s own cookies during the payment flow. Governed by <a href="https://stripe.com/privacy" style={{ color: "var(--ow-amber)" }}>Stripe&apos;s privacy policy</a>. If you don&apos;t start a payment, no Stripe cookies are ever set.</li>
          <li><strong>Google Sign-in</strong> — if you choose to log in with Google, Google sets its own cookies on <code style={styles.code}>accounts.google.com</code>. Governed by <a href="https://policies.google.com/privacy" style={{ color: "var(--ow-amber)" }}>Google&apos;s privacy policy</a>. If you use email + password, no Google cookies are set.</li>
        </ul>

        <h2 style={styles.h2}>Controlling cookies</h2>
        <p style={styles.p}>
          You can clear or block cookies at any time in your browser settings. Blocking <code style={styles.code}>app_session_id</code> will log you out and prevent login. Blocking <code style={styles.code}>ow_gate</code> will re-lock any pre-launch pages you&apos;d unlocked via magic link. Nothing else breaks.
        </p>

        <h2 style={styles.h2}>Changes to this policy</h2>
        <p style={styles.p}>
          If we add a new cookie, we&apos;ll update the table above and update the &ldquo;Last updated&rdquo; date at the top. If a new cookie is non-essential (i.e. requires consent), we&apos;ll add a consent banner at that time — but as of Feb 2026 we don&apos;t plan to set any.
        </p>

        <h2 style={styles.h2}>Contact</h2>
        <p style={styles.p}>Cookie questions, or to report a tracker you think we&apos;ve missed: <strong>privacy@ownology.ai</strong> — replied to within 48 hours by a real person.</p>

        <Link href="/" data-testid="cookies-back" style={styles.back}>← Back to Ownology</Link>
      </div>
    </div>
  );
}
