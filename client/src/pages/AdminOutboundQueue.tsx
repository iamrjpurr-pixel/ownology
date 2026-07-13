/**
 * /admin/contacts/outbound-queue — sequenced outreach queue.
 *
 * Rich, Jul 2026 — after enriching 187 Wine Australia makers (51 mobiles,
 * 133 emails, 151 hooks), the CRM is bottle-necked on "which prospect to
 * touch first". This page ranks by (hook tier × channel availability),
 * showing the highest-yield first-touches at the top with SMS + email
 * side-by-side and a single "Mark sent" action to advance to the next.
 *
 * Scoring lives on the backend (outreach.outboundQueue). Frontend is
 * dumb-render — no re-sorting or filtering client-side beyond a status
 * chip. This matters because ranking depends on hook-quality assumptions
 * that must stay consistent with smsDraft()'s 3-tier waterfall.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";

const PREVIEW_BASE = typeof window !== "undefined" ? window.location.origin : "";

// ── SMS + email drafters — mirror the shape used in AdminContacts.tsx ─
// (Kept duplicated here rather than shared because AdminContacts's copies
// are inside its own module scope. Refactoring to a shared lib is a
// clean follow-up; not blocking today's outbound-queue ship.)
function smsDraft(c: { firstName: string; winery?: string | null; painPoint?: string | null; hookText?: string | null; slug: string }): string {
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  if (c.hookText) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `g'day ${c.firstName}${wineryBit} — ${c.hookText}. i've been building a cellar AI grounded in your own vintage logs — 90 sec look: ${url} — Jamie`;
  }
  if (c.painPoint) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `G'day ${c.firstName} — we crossed paths the other day${wineryBit}. You mentioned ${c.painPoint}; I've since built a cellar AI that answers exactly that, grounded in your own vintage logs. 90 sec look: ${url} — Jamie`;
  }
  const wineryBit = c.winery ? `, sending this to ${c.winery} too` : "";
  return `G'day ${c.firstName} — we crossed paths the other day${wineryBit}. I've since built a cellar AI grounded in your own vintage logs — figured you might find it useful. 90 sec look: ${url} — Jamie`;
}

function extractEmailFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/email:\s*(\S+@\S+?)(?:\s|$|·)/i);
  return m ? m[1].replace(/[.,;]+$/, "") : null;
}

function buildMailto(email: string, firstName: string, winery: string | null, painPoint: string | null, hookText: string | null, slug: string): string {
  const url = `${PREVIEW_BASE}/hi/${slug}`;
  const wineryPhrase = winery ? ` at ${winery}` : "";
  const subject = hookText
    ? `${firstName} — ${hookText.slice(0, 60)}${hookText.length > 60 ? "…" : ""}`
    : `${firstName}${wineryPhrase} — a cellar apprentice grounded in your own logs`;
  const body = hookText
    ? `G'day ${firstName},\n\n${hookText.charAt(0).toUpperCase() + hookText.slice(1)} — reading that hit home.\n\nI've been quietly building Ownology: a cellar AI grounded in a winery's own vintage logs, not a textbook. Ask it "why did tank 9 stick this year" and it walks you through the actual data before it reaches for theory.\n\n90-second landing page tuned to you${wineryPhrase}:\n\n${url}\n\nNo pressure — happy to be told to bugger off. But if it lands, I'd rather hear it directly than through a form.\n\nCheers,\nJamie\nOwnology`
    : `G'day ${firstName},\n\nI've been building Ownology — a small AI cellar apprentice grounded in a winery's own vintage logs rather than a textbook. Figured you might find it useful.\n\n90-second look, tuned to your operation${wineryPhrase}:\n\n${url}\n\nCheers,\nJamie\nOwnology`;
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function TierBadge({ tier }: { tier: string | null | undefined }) {
  if (!tier) return <span style={{ fontSize: "0.65rem", color: "var(--ow-text-lo)", fontStyle: "italic" }}>no hook</span>;
  const label = tier === "recent_signal" ? "T1 · recent" : tier === "quoted_voice" ? "T2 · voice" : tier === "peer_signal" ? "T3 · peer" : "T4 · vintage";
  const bg = tier === "recent_signal" ? "oklch(0.75 0.15 130)" : tier === "quoted_voice" ? "var(--ow-amber)" : "var(--ow-border)";
  const fg = tier === "recent_signal" || tier === "quoted_voice" ? "oklch(0.10 0.008 60)" : "var(--ow-text-hi)";
  return <span style={{ background: bg, color: fg, padding: "2px 8px", borderRadius: 10, fontSize: "0.65rem", fontWeight: 700, letterSpacing: "0.04em", textTransform: "uppercase" }}>{label}</span>;
}

export default function AdminOutboundQueue() {
  const { data, isLoading, refetch } = trpc.outreach.outboundQueue.useQuery();
  const markSent = trpc.outreach.markSent.useMutation();
  const [copied, setCopied] = useState<Record<string, "sms" | "email" | "done" | undefined>>({});
  const [regionFilter, setRegionFilter] = useState<string>("all");

  async function copySms(slug: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied((s) => ({ ...s, [slug]: "sms" })); } catch { /* no-op */ }
  }
  async function stampSent(slug: string, channel: "sms" | "email" | "both") {
    await markSent.mutateAsync({ slug, channel });
    setCopied((s) => ({ ...s, [slug]: "done" }));
    setTimeout(() => refetch(), 400);
  }

  const queue = data?.queue ?? [];
  // Client-side region filter — cheap, works off winery name substring
  const filtered = regionFilter === "all"
    ? queue
    : queue.filter((c) => (c.winery ?? "").toLowerCase().includes(regionFilter.toLowerCase()));

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>Outbound queue</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Ranked by hook quality × channel availability. Highest-yield first-touch at the top.
          </p>
        </div>
        <Link href="/admin/contacts/engagement" data-testid="link-to-engagement-from-queue" style={{ color: "var(--ow-text-mid)", fontSize: "0.8rem", textDecoration: "none", marginRight: 12 }}>Engagement →</Link>
        <Link href="/admin/contacts" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>← back to contacts</Link>
      </header>

      <div style={{ padding: "16px 24px 8px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter region:</span>
        {["all", "mclaren", "barossa", "adelaide hills", "yarra", "margaret river", "tasmania", "hunter"].map((r) => (
          <button
            key={r}
            data-testid={`filter-${r.replace(/\s+/g, "-")}`}
            onClick={() => setRegionFilter(r)}
            style={{
              padding: "3px 10px", borderRadius: 3, border: "1px solid var(--ow-border)",
              background: regionFilter === r ? "var(--ow-amber)" : "transparent",
              color: regionFilter === r ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
              fontSize: "0.72rem", cursor: "pointer", textTransform: "capitalize",
            }}
          >
            {r}
          </button>
        ))}
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
          {filtered.length} of {queue.length} in queue
        </span>
      </div>

      {isLoading && <p style={{ padding: 24 }}>Loading queue…</p>}
      {!isLoading && filtered.length === 0 && <p style={{ padding: 24, color: "var(--ow-text-lo)" }}>Nothing in queue for this filter.</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filtered.map((c, idx) => {
          const email = extractEmailFromNotes(c.notes);
          const sms = smsDraft({ firstName: c.firstName, winery: c.winery, painPoint: c.painPoint, hookText: c.hookText, slug: c.slug });
          const state = copied[c.slug];
          return (
            <li
              key={c.slug}
              data-testid={`queue-row-${c.slug}`}
              style={{
                borderBottom: "1px solid var(--ow-border)",
                padding: "12px 24px",
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 12,
                alignItems: "flex-start",
                opacity: state === "done" ? 0.5 : 1,
                background: idx < 5 ? "color-mix(in oklch, var(--ow-amber) 3%, transparent)" : "transparent",
              }}
            >
              <div style={{ minWidth: 44, textAlign: "center" }}>
                <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", fontWeight: 700, color: "var(--ow-amber)" }}>{c.score}</div>
                <div style={{ fontSize: "0.6rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>score</div>
              </div>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                  <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", fontWeight: 600 }}>
                    {c.firstName} {c.lastName ?? ""}
                  </span>
                  {c.winery && <span style={{ fontSize: "0.85rem", color: "var(--ow-text-mid)" }}>· {c.winery}</span>}
                  <TierBadge tier={c.hookTier} />
                  {c.hasMobile && <span style={{ padding: "2px 8px", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 10, fontSize: "0.65rem", color: "var(--ow-text-mid)" }}>📱 SMS</span>}
                  {c.hasEmail && <span style={{ padding: "2px 8px", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 10, fontSize: "0.65rem", color: "var(--ow-text-mid)" }}>✉ email</span>}
                </div>
                {c.hookText && (
                  <p style={{ margin: "6px 0 0", fontSize: "0.85rem", color: "var(--ow-text-mid)", fontStyle: "italic", lineHeight: 1.5 }}>
                    &ldquo;{c.hookText}&rdquo;
                    {c.hookSourceUrl && (
                      <a href={c.hookSourceUrl} target="_blank" rel="noopener noreferrer" style={{ marginLeft: 8, color: "var(--ow-amber)", fontSize: "0.72rem", textDecoration: "none" }} data-testid={`queue-preview-${c.slug}`}>
                        Preview post ↗
                      </a>
                    )}
                  </p>
                )}
                {!c.hookText && c.painPoint && (
                  <p style={{ margin: "6px 0 0", fontSize: "0.82rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
                    {c.painPoint}
                  </p>
                )}
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end", minWidth: 200 }}>
                {state === "done" ? (
                  <span data-testid={`queue-done-${c.slug}`} style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>✓ sent — advancing</span>
                ) : (
                  <>
                    <div style={{ display: "flex", gap: 6 }}>
                      {c.hasMobile && (
                        <button
                          data-testid={`queue-copy-sms-${c.slug}`}
                          onClick={() => copySms(c.slug, sms)}
                          style={{ padding: "4px 12px", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 3, fontSize: "0.75rem", fontWeight: 700, cursor: "pointer" }}
                        >
                          {state === "sms" ? "✓ SMS copied" : "Copy SMS"}
                        </button>
                      )}
                      {email && (
                        <a
                          data-testid={`queue-email-${c.slug}`}
                          href={buildMailto(email, c.firstName, c.winery, c.painPoint, c.hookText, c.slug)}
                          style={{ padding: "4px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", textDecoration: "none" }}
                        >
                          Draft email
                        </a>
                      )}
                    </div>
                    <button
                      data-testid={`queue-mark-sent-${c.slug}`}
                      onClick={() => stampSent(c.slug, c.hasMobile && c.hasEmail ? "both" : c.hasMobile ? "sms" : "email")}
                      disabled={markSent.isPending}
                      style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-lo)", border: "1px dashed var(--ow-border)", borderRadius: 3, fontSize: "0.7rem", cursor: markSent.isPending ? "wait" : "pointer" }}
                    >
                      Mark sent, next →
                    </button>
                    <Link
                      href={`/admin/contacts?slug=${c.slug}`}
                      data-testid={`queue-open-${c.slug}`}
                      style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)", textDecoration: "none" }}
                    >
                      Open card ↗
                    </Link>
                  </>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
