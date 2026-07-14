/**
 * Build a Gmail compose URL that opens directly in the browser tab
 * (Chrome opens https://mail.google.com/... without needing a system-level
 * mail handler). Rich, Feb 2026 — mailto: was silently failing on his PC
 * because Gmail wasn't registered as Chrome's protocol handler for mailto.
 *
 * Falls back to a plain mailto: string if the browser opts out. Returns
 * BOTH so callers can offer a primary Gmail button and a fallback mailto:
 * link for anyone using Apple Mail / Outlook / Thunderbird.
 */
export function buildEmailLinks(args: {
  to: string;
  subject: string;
  body: string;
}): { gmail: string; mailto: string } {
  const to = encodeURIComponent(args.to.trim());
  const su = encodeURIComponent(args.subject);
  const body = encodeURIComponent(args.body);
  // Gmail's stable compose URL. `view=cm` = compose, `fs=1` = full-screen.
  // Works whether you're signed into one account or many (uses the last-
  // active account by default; add `&authuser=0` if you want the first).
  const gmail = `https://mail.google.com/mail/?view=cm&fs=1&to=${to}&su=${su}&body=${body}`;
  const mailto = `mailto:${to}?subject=${su}&body=${body}`;
  return { gmail, mailto };
}

/**
 * Default: return Gmail URL. All outreach surfaces use this because Rich
 * uses Gmail and clicking `mailto:` on his PC opens Chrome-blank-tab
 * without ever loading Gmail. If a user needs the OS default mail client
 * instead, use `buildEmailLinks(...).mailto` directly.
 */
export function buildEmailUrl(args: {
  to: string;
  subject: string;
  body: string;
}): string {
  return buildEmailLinks(args).gmail;
}
