/**
 * /admin/contacts/engagement — post-send follow-up analytics.
 *
 * Rich, Feb 2026 — after 187 winemakers were seeded + enriched, the
 * outbound queue tells us who to touch NEXT. This page tells us who to
 * touch AGAIN. Reads viewCount / firstViewedAt / ctaClickedAt / repliedAt
 * / demoBookedAt and buckets sent contacts into follow-up priority tiers.
 *
 * Buckets (top = strike now, bottom = celebrate):
 *   HOT              viewed 2+ times, no reply → they're circling, close the loop
 *   CLICKED-NO-BOOK  hit CTA but didn't book → nudge with a direct SMS
 *   VIEWED-NO-CLICK  opened but bounced off → try a second angle
 *   REPLIED          reply in hand, no booking → keep it warm
 *   BOOKED           won (surface for confirmation cadence)
 *   GHOSTED          sent 3+ days ago, never opened → SMS may not have landed
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";

type BucketKey = "hot" | "clickedNoBook" | "viewedNoClick" | "replied" | "booked" | "ghosted";

type Contact = {
  slug: string;
  firstName: string;
  lastName: string | null;
  winery: string | null;
  region: string | null;
  mobileAu: string | null;
  notes: string | null;
  hookText: string | null;
  painPoint: string | null;
  smsSentAt: number | null;
  firstViewedAt: number | null;
  viewCount: number;
  ctaClickedAt: number | null;
  repliedAt: number | null;
  demoBookedAt: number | null;
};

const PREVIEW_BASE = typeof window !== "undefined" ? window.location.origin : "";

const BUCKET_META: Record<BucketKey, { label: string; sub: string; accent: string; icon: string }> = {
  hot:            { label: "Hot",              sub: "Viewed 2+ times · strike now",           accent: "#dc2626", icon: "🔥" },
  clickedNoBook:  { label: "Clicked, no book", sub: "Tapped CTA but didn't book",             accent: "#f59e0b", icon: "✳" },
  viewedNoClick:  { label: "Viewed, no click", sub: "Opened but bounced off CTA",             accent: "#0ea5e9", icon: "👀" },
  replied:        { label: "Replied",          sub: "Reply in hand · keep it warm",           accent: "#7c3aed", icon: "💬" },
  booked:         { label: "Booked",           sub: "Demo on the calendar",                    accent: "#16a34a", icon: "✓" },
  ghosted:        { label: "Ghosted",          sub: "Sent 3+ days ago, never opened",         accent: "#6b7280", icon: "👻" },
};

const BUCKET_ORDER: BucketKey[] = ["hot", "clickedNoBook", "viewedNoClick", "replied", "booked", "ghosted"];

function fmtAgo(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function extractEmailFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  const m = notes.match(/email:\s*(\S+@\S+?)(?:\s|$|·)/i);
  return m ? m[1].replace(/[.,;]+$/, "") : null;
}

function buildFollowupSms(c: Contact, bucket: BucketKey): string {
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  const first = c.firstName;
  const winery = c.winery ? ` (${c.winery})` : "";
  if (bucket === "hot") {
    return `hey ${first}${winery} — noticed you had another look at that link i sent. happy to answer any Qs directly, or i can walk you through it live in 15 min. what works? — Jamie`;
  }
  if (bucket === "clickedNoBook") {
    return `hey ${first} — you tapped through to Ownology the other day. any reservations i can address? happy to grab 15 min live if it's easier than reading — ${url} — Jamie`;
  }
  if (bucket === "viewedNoClick") {
    return `hey ${first} — sent that ownology link the other day, wanted to double-check it landed. if the pitch missed the mark, tell me straight — i'd rather know than guess: ${url} — Jamie`;
  }
  if (bucket === "ghosted") {
    return `hey ${first}${winery} — first SMS may not have landed. quick recap: cellar AI grounded in a winery's own vintage logs, not a textbook. 90-sec look ${url} — Jamie`;
  }
  if (bucket === "replied") {
    return `hey ${first} — following up from your earlier reply. still keen to grab 15 min to walk you through Ownology? happy to do it whenever suits — Jamie`;
  }
  // booked
  return `hey ${first} — looking forward to our chat. i'll send a calendar reminder + zoom link the day before. if anything shifts on your end just ping. — Jamie`;
}

function buildFollowupEmail(email: string, c: Contact, bucket: BucketKey): string {
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  const first = c.firstName;
  const wineryPhrase = c.winery ? ` at ${c.winery}` : "";
  let subject = "";
  let body = "";
  if (bucket === "hot") {
    subject = `${first} — happy to answer questions directly`;
    body = `G'day ${first},\n\nNoticed you had another look at the Ownology link I sent. Rather than let you keep circling the pitch, let me know if there's anything specific you want answered — happy to jump on a 15-minute call whenever suits, or answer via email if that's easier.\n\nLink again for reference: ${url}\n\nCheers,\nJamie`;
  } else if (bucket === "clickedNoBook") {
    subject = `${first} — a quick 15 min?`;
    body = `G'day ${first},\n\nYou tapped through to Ownology the other day but didn't book — any reservations I can address directly? If reading isn't landing, happy to walk you through it live in 15 minutes.\n\n${url}\n\nCheers,\nJamie`;
  } else if (bucket === "viewedNoClick") {
    subject = `${first} — did the pitch miss the mark?`;
    body = `G'day ${first},\n\nSent an Ownology link the other day, wanted to double-check it landed and that the pitch made sense${wineryPhrase}. If it missed the mark, I'd rather hear it straight than guess.\n\n${url}\n\nCheers,\nJamie`;
  } else if (bucket === "ghosted") {
    subject = `${first} — trying again${wineryPhrase}`;
    body = `G'day ${first},\n\nFirst SMS/email may not have landed. Quick recap: I've been quietly building Ownology — a cellar AI grounded in a winery's own vintage logs rather than a textbook. Ask it "why did tank 9 stick this year" and it walks you through your actual data first.\n\n90-second landing tuned to ${c.winery ?? "your operation"}:\n\n${url}\n\nCheers,\nJamie`;
  } else if (bucket === "replied") {
    subject = `${first} — following up on your reply`;
    body = `G'day ${first},\n\nFollowing up from your earlier reply. Still keen to grab 15 min to walk you through Ownology? Happy to do it whenever suits.\n\nLink to your personal page: ${url}\n\nCheers,\nJamie`;
  } else {
    subject = `${first} — looking forward to our chat`;
    body = `G'day ${first},\n\nJust confirming we're set for the demo. I'll send a calendar reminder + Zoom link the day before. If anything shifts on your end just ping.\n\nCheers,\nJamie`;
  }
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function pct(num: number, denom: number): number {
  if (!denom) return 0;
  return Math.round((num / denom) * 1000) / 10;
}

function KpiCell({ label, value, sub, testid }: { label: string; value: string | number; sub?: string; testid: string }) {
  return (
    <div data-testid={testid} style={{ padding: "10px 14px", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4, minWidth: 120, flex: 1 }}>
      <div style={{ fontSize: "0.62rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.08em", fontFamily: "'Lato',sans-serif" }}>{label}</div>
      <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.55rem", fontWeight: 700, color: "var(--ow-text-hi)", lineHeight: 1.1 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.68rem", color: "var(--ow-text-lo)", marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

export default function AdminEngagement() {
  const { data, isLoading, refetch } = trpc.outreach.engagementAnalytics.useQuery();
  const markFollowedUp = trpc.outreach.markFollowedUp.useMutation();
  const [copied, setCopied] = useState<Record<string, "sms" | "done" | undefined>>({});
  const [openBucket, setOpenBucket] = useState<BucketKey | null>("hot");

  async function copySms(slug: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied((s) => ({ ...s, [slug]: "sms" })); } catch { /* no-op */ }
  }
  async function stampFollowedUp(slug: string) {
    await markFollowedUp.mutateAsync({ slug });
    setCopied((s) => ({ ...s, [slug]: "done" }));
    setTimeout(() => refetch(), 400);
  }

  const totals = data?.totals ?? { total: 0, sent: 0, viewed: 0, multiViewed: 0, clicked: 0, replied: 0, booked: 0 };
  const buckets = data?.buckets ?? { hot: [], clickedNoBook: [], viewedNoClick: [], replied: [], booked: [], ghosted: [] };

  return (
    <div data-testid="admin-engagement-page" style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: "0.68rem", color: "var(--ow-amber)", textTransform: "uppercase", letterSpacing: "0.1em", margin: 0 }}>Post-send follow-up</p>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>Contact engagement</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Who opened their /hi/&lt;slug&gt; link, who tapped the CTA, who&apos;s gone quiet. Sorted by follow-up urgency.
          </p>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <Link href="/admin/contacts/outbound-queue" style={{ color: "var(--ow-text-mid)", fontSize: "0.8rem", textDecoration: "none" }}>Outbound queue →</Link>
          <Link href="/admin/contacts" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>← back to contacts</Link>
        </div>
      </header>

      {/* KPI strip */}
      <section style={{ padding: "20px 24px 12px" }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <KpiCell testid="kpi-sent" label="Sent" value={totals.sent} sub={`of ${totals.total} total`} />
          <KpiCell testid="kpi-viewed" label="Viewed" value={totals.viewed} sub={`${pct(totals.viewed, totals.sent)}% open rate`} />
          <KpiCell testid="kpi-multi-viewed" label="Re-opened" value={totals.multiViewed} sub={`${pct(totals.multiViewed, totals.viewed)}% of viewers`} />
          <KpiCell testid="kpi-clicked" label="Clicked CTA" value={totals.clicked} sub={`${pct(totals.clicked, totals.viewed)}% of viewers`} />
          <KpiCell testid="kpi-replied" label="Replied" value={totals.replied} sub={`${pct(totals.replied, totals.sent)}% reply rate`} />
          <KpiCell testid="kpi-booked" label="Booked" value={totals.booked} sub={`${pct(totals.booked, totals.sent)}% conversion`} />
        </div>
      </section>

      {isLoading && <p style={{ padding: 24, color: "var(--ow-text-mid)" }}>Loading engagement…</p>}

      {/* Buckets */}
      {!isLoading && data && (
        <div style={{ padding: "8px 24px 32px" }}>
          {BUCKET_ORDER.map((key) => {
            const meta = BUCKET_META[key];
            const list = buckets[key] as Contact[];
            const isOpen = openBucket === key;
            return (
              <div key={key} data-testid={`bucket-${key}`} style={{ marginTop: 14, border: "1px solid var(--ow-border)", borderRadius: 4, background: "var(--ow-bg-card)" }}>
                <button
                  onClick={() => setOpenBucket(isOpen ? null : key)}
                  data-testid={`bucket-toggle-${key}`}
                  style={{
                    width: "100%", padding: "14px 16px", display: "flex", alignItems: "center", gap: 14,
                    background: "transparent", border: "none", cursor: "pointer", color: "inherit", textAlign: "left",
                    borderLeft: `4px solid ${meta.accent}`,
                  }}
                >
                  <span style={{ fontSize: "1.3rem" }}>{meta.icon}</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", fontWeight: 600, color: meta.accent }}>
                      {meta.label}
                      <span style={{ marginLeft: 10, fontSize: "0.85rem", color: "var(--ow-text-lo)", fontWeight: 400 }}>({list.length})</span>
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--ow-text-mid)", marginTop: 1 }}>{meta.sub}</div>
                  </div>
                  <span style={{ fontSize: "0.9rem", color: "var(--ow-text-lo)" }}>{isOpen ? "▾" : "▸"}</span>
                </button>

                {isOpen && list.length === 0 && (
                  <p style={{ padding: "6px 20px 20px", color: "var(--ow-text-lo)", fontSize: "0.85rem", fontStyle: "italic" }}>
                    Nothing here right now.
                  </p>
                )}

                {isOpen && list.length > 0 && (
                  <ul style={{ listStyle: "none", padding: 0, margin: 0, borderTop: "1px solid var(--ow-border)" }}>
                    {list.map((c) => {
                      const email = extractEmailFromNotes(c.notes);
                      const sms = buildFollowupSms(c, key);
                      const state = copied[c.slug];
                      return (
                        <li
                          key={c.slug}
                          data-testid={`engagement-row-${c.slug}`}
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--ow-border)",
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 12,
                            alignItems: "flex-start",
                            opacity: state === "done" ? 0.55 : 1,
                          }}
                        >
                          <div>
                            <div style={{ display: "flex", gap: 10, alignItems: "baseline", flexWrap: "wrap" }}>
                              <span style={{ fontFamily: "'Fraunces',serif", fontSize: "1.02rem", fontWeight: 600 }}>
                                {c.firstName} {c.lastName ?? ""}
                              </span>
                              {c.winery && <span style={{ fontSize: "0.82rem", color: "var(--ow-text-mid)" }}>· {c.winery}</span>}
                              {c.region && <span style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>· {c.region}</span>}
                            </div>
                            <div style={{ marginTop: 4, display: "flex", gap: 12, fontSize: "0.72rem", color: "var(--ow-text-lo)", flexWrap: "wrap" }}>
                              <span data-testid={`row-sent-${c.slug}`}>📤 sent {fmtAgo(c.smsSentAt)}</span>
                              {c.firstViewedAt && <span data-testid={`row-viewed-${c.slug}`}>👀 opened {fmtAgo(c.firstViewedAt)} · {c.viewCount}× total</span>}
                              {c.ctaClickedAt && <span data-testid={`row-clicked-${c.slug}`}>✳ CTA {fmtAgo(c.ctaClickedAt)}</span>}
                              {c.repliedAt && <span data-testid={`row-replied-${c.slug}`}>💬 replied {fmtAgo(c.repliedAt)}</span>}
                              {c.demoBookedAt && <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ booked {fmtAgo(c.demoBookedAt)}</span>}
                            </div>
                            {c.hookText && (
                              <p style={{ margin: "6px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)", fontStyle: "italic", lineHeight: 1.5 }}>
                                &ldquo;{c.hookText}&rdquo;
                              </p>
                            )}
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 210 }}>
                            {state === "done" ? (
                              <span data-testid={`engagement-done-${c.slug}`} style={{ color: "#16a34a", fontSize: "0.8rem", fontWeight: 600 }}>✓ follow-up logged</span>
                            ) : (
                              <>
                                <div style={{ display: "flex", gap: 6 }}>
                                  {c.mobileAu && (
                                    <button
                                      data-testid={`engagement-copy-sms-${c.slug}`}
                                      onClick={() => copySms(c.slug, sms)}
                                      style={{ padding: "4px 12px", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 3, fontSize: "0.72rem", fontWeight: 700, cursor: "pointer" }}
                                    >
                                      {state === "sms" ? "✓ SMS copied" : "Copy follow-up SMS"}
                                    </button>
                                  )}
                                  {email && (
                                    <a
                                      data-testid={`engagement-email-${c.slug}`}
                                      href={buildFollowupEmail(email, c, key)}
                                      style={{ padding: "4px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.72rem", textDecoration: "none" }}
                                    >
                                      Draft email
                                    </a>
                                  )}
                                </div>
                                <div style={{ display: "flex", gap: 8 }}>
                                  <button
                                    data-testid={`engagement-mark-followed-${c.slug}`}
                                    onClick={() => stampFollowedUp(c.slug)}
                                    disabled={markFollowedUp.isPending}
                                    style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-lo)", border: "1px dashed var(--ow-border)", borderRadius: 3, fontSize: "0.68rem", cursor: markFollowedUp.isPending ? "wait" : "pointer" }}
                                  >
                                    Mark followed up
                                  </button>
                                  <a
                                    href={`${PREVIEW_BASE}/hi/${c.slug}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    data-testid={`engagement-preview-${c.slug}`}
                                    style={{ fontSize: "0.68rem", color: "var(--ow-text-lo)", textDecoration: "none", alignSelf: "center" }}
                                  >
                                    Preview ↗
                                  </a>
                                </div>
                              </>
                            )}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
