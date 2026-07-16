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
import { buildEmailUrl } from "@/lib/emailCompose";
import { exportContactsAsVcard } from "@/lib/vcardExport";

const PREVIEW_BASE = typeof window !== "undefined" ? window.location.origin : "";

// ── SMS + email drafters — mirror the shape used in AdminContacts.tsx ─
// (Kept duplicated here rather than shared because AdminContacts's copies
// are inside its own module scope. Refactoring to a shared lib is a
// clean follow-up; not blocking today's outbound-queue ship.)
function smsDraft(c: { firstName: string; winery?: string | null; painPoint?: string | null; hookText?: string | null; slug: string }): string {
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  if (c.hookText) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `g'day ${c.firstName}${wineryBit} — ${c.hookText}. i've been building a cellar AI grounded in your own vintage logs — 90 sec look: ${url} — Rich`;
  }
  if (c.painPoint) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `G'day ${c.firstName} — we crossed paths the other day${wineryBit}. You mentioned ${c.painPoint}; I've since built a cellar AI that answers exactly that, grounded in your own vintage logs. 90 sec look: ${url} — Rich`;
  }
  const wineryBit = c.winery ? `, sending this to ${c.winery} too` : "";
  return `G'day ${c.firstName} — we crossed paths the other day${wineryBit}. I've since built a cellar AI grounded in your own vintage logs — figured you might find it useful. 90 sec look: ${url} — Rich`;
}

// ── Instagram / LinkedIn extraction from the notes field ────────────────
// The enrichment pipeline writes "IG: handle" and "LinkedIn: url-or-slug"
// into notes. Pull them out so IG-only prospects (Tim Stock, Sarah Feehan,
// ~30% of the queue) aren't dead-ends when they have no mobile + no email.
function extractInstagramFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  // Match "IG: @handle" | "IG: handle" | "Instagram: @handle" | "instagram.com/handle"
  const m =
    notes.match(/\b(?:IG|Instagram|Insta)\s*:\s*@?([a-z0-9._]{2,32})\b/i) ||
    notes.match(/instagram\.com\/([a-z0-9._]{2,32})\b/i);
  return m ? m[1].replace(/[.,;)]+$/, "").toLowerCase() : null;
}
function extractLinkedinFromNotes(notes: string | null | undefined): string | null {
  if (!notes) return null;
  // Match "LinkedIn: https://linkedin.com/in/slug" or "LinkedIn: slug" or bare URL
  const urlMatch = notes.match(/linkedin\.com\/in\/([a-z0-9-]+)/i);
  if (urlMatch) return `https://www.linkedin.com/in/${urlMatch[1]}`;
  const slugMatch = notes.match(/\bLinkedIn\s*:\s*([a-z0-9-]{3,60})\b/i);
  if (slugMatch && !slugMatch[1].toLowerCase().startsWith("http")) {
    return `https://www.linkedin.com/in/${slugMatch[1]}`;
  }
  return null;
}

// Shorter, Instagram-DM-appropriate hook: no landing URL in the first
// message (Insta buries first-message links and marks them spammy). We
// lead with the hook and invite a reply so it lands in Primary, not
// Requests.
function igDmDraft(c: { firstName: string; winery?: string | null; hookText?: string | null; painPoint?: string | null }): string {
  if (c.hookText) {
    return `hey ${c.firstName} — ${c.hookText}. been quietly building a cellar AI grounded in a winery's own vintage logs (not a textbook). happy to send you the 90 sec look if useful? — Rich`;
  }
  if (c.painPoint) {
    return `hey ${c.firstName} — noticed ${c.painPoint}. been building a cellar AI grounded in a winery's own vintage logs. reckon it might scratch that itch — worth a 90 sec look? — Rich`;
  }
  const wineryBit = c.winery ? ` — ${c.winery}'s wines have been on my mind` : "";
  return `hey ${c.firstName}${wineryBit}. been building a cellar AI grounded in a winery's own vintage logs. curious if it'd be useful for you — happy to send a 90 sec look? — Rich`;
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
  return buildEmailUrl({ to: email, subject, body });
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
  const bulkRewrite = trpc.outreach.bulkRewriteSmsAI.useMutation();
  const [copied, setCopied] = useState<Record<string, "sms" | "email" | "done" | undefined>>({});
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [bulkResult, setBulkResult] = useState<{ rewritten: number; skippedExisting: number; failed: number } | null>(null);
  const [cohortCopied, setCohortCopied] = useState(false);
  const [vcardCount, setVcardCount] = useState<number | null>(null);
  const [forceRewrite, setForceRewrite] = useState(false);

  async function copySms(slug: string, text: string) {
    try { await navigator.clipboard.writeText(text); setCopied((s) => ({ ...s, [slug]: "sms" })); } catch { /* no-op */ }
  }
  async function copyAndOpen(slug: string, text: string, url: string, kind: "insta" | "linkedin") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied((s) => ({ ...s, [slug]: kind === "insta" ? "sms" : "sms" }));
    } catch { /* no-op */ }
    window.open(url, "_blank", "noopener,noreferrer");
  }
  async function stampSent(slug: string, channel: "sms" | "email" | "both") {
    await markSent.mutateAsync({ slug, channel });
    setCopied((s) => ({ ...s, [slug]: "done" }));
    setTimeout(() => refetch(), 400);
  }

  async function runBulkRewrite(tone: "warm" | "brief" | "regional") {
    const regionLabel = regionFilter === "all" ? "the whole queue" : `the ${regionFilter.replace(/-/g, " ")} cohort (${filtered.length} contacts)`;
    const forceMsg = forceRewrite
      ? "\n\n⚠ FORCE mode is ON — this WILL overwrite existing hand-crafted drafts."
      : "\n\nExisting hand-crafted drafts are skipped.";
    if (!confirm(`Rewrite SMS drafts for ${regionLabel} via Claude (${tone} tone)?\n\nThis will take ~1.5-2s per contact and cost ~$0.005 each.${forceMsg}`)) return;
    setBulkResult(null);
    try {
      const result = await bulkRewrite.mutateAsync({
        tone,
        force: forceRewrite,
        limit: 500,
        region: regionFilter === "all" ? undefined : regionFilter,
      });
      setBulkResult(result);
      refetch();
    } catch (err) {
      alert(`Bulk rewrite failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function copyCohortTsv() {
    const rows = filtered
      .filter((c) => c.mobileAu && c.mobileAu.trim().length > 0)
      .map((c) => {
        const draft = (c as { smsDraftOverride?: string | null }).smsDraftOverride
          ?? smsDraft({ firstName: c.firstName, winery: c.winery, painPoint: c.painPoint, hookText: c.hookText, slug: c.slug });
        const name = `${c.firstName}${c.lastName ? ` ${c.lastName}` : ""}`;
        return `${name}\t${c.mobileAu}\t${draft}`;
      });
    if (rows.length === 0) {
      alert(`No SMS-ready contacts in this cohort (need a mobile number).`);
      return;
    }
    const blob = `Name\tMobile\tSMS draft\n${rows.join("\n")}`;
    try {
      await navigator.clipboard.writeText(blob);
      setCohortCopied(true);
      setTimeout(() => setCohortCopied(false), 2400);
    } catch {
      alert("Clipboard write failed. Try again or use per-row copy buttons.");
    }
  }

  /** vCard export — downloads a .vcf for the current filtered cohort.
   *  Includes anyone with a mobile OR an email (unlike the TSV copy which
   *  is SMS-only). AirDrop / Gmail the file to your phone → tap → iOS /
   *  Android Contacts absorb it → Google Messages + WhatsApp autocomplete
   *  the winemaker names when you start typing. */
  function exportCohortVcard() {
    const routable = filtered.filter((c) =>
      (c.mobileAu && c.mobileAu.trim().length > 0) ||
      Boolean((c as { email?: string | null }).email),
    );
    if (routable.length === 0) {
      alert("No routable contacts in this cohort (need mobile or email).");
      return;
    }
    const count = exportContactsAsVcard(
      routable.map((c) => ({
        firstName: c.firstName,
        lastName: c.lastName,
        winery: c.winery,
        mobileAu: c.mobileAu,
        email: (c as { email?: string | null }).email ?? null,
        slug: c.slug,
        region: (c as { region?: string | null }).region ?? null,
        event: (c as { event?: string | null }).event ?? null,
        hookText: c.hookText,
        painPoint: c.painPoint,
      })),
      {
        filenameHint: regionFilter === "all" ? "queue" : regionFilter,
      },
    );
    setVcardCount(count);
    setTimeout(() => setVcardCount(null), 3500);
  }

  const queue = data?.queue ?? [];
  // Region filter now uses the DB region column (kebab-case) so cohorts
  // are precise. Chip values match wineryRegions.ts AuRegion enum.
  const filtered = regionFilter === "all"
    ? queue
    : queue.filter((c) => ((c as { region?: string | null }).region ?? "").toLowerCase() === regionFilter.toLowerCase());

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>Outbound queue</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Your daily 5 sit at the top. Tap one primary button per contact. Everything else lives under &ldquo;Advanced tools&rdquo; below.
          </p>
        </div>
        <Link href="/admin/contacts/engagement" data-testid="link-to-engagement-from-queue" style={{ color: "var(--ow-text-mid)", fontSize: "0.8rem", textDecoration: "none", marginRight: 12 }}>Engagement →</Link>
        <Link href="/admin/contacts" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>← back to contacts</Link>
      </header>

      {/* ── Today's top 5 hero — simple, one primary CTA per contact ─────── */}
      <section
        data-testid="daily-top-five"
        style={{
          margin: "20px 24px 8px",
          padding: "20px 22px 18px",
          background: "color-mix(in oklch, var(--ow-amber) 8%, var(--ow-bg-card))",
          border: "1px solid var(--ow-amber)",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 14, flexWrap: "wrap" }}>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.25rem", margin: 0, fontWeight: 700, color: "var(--ow-text-hi)" }}>
            Today&apos;s top 5
          </h2>
          <span style={{ fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Do just these. That&apos;s the whole day&apos;s outbound.
          </span>
        </div>
        {isLoading ? (
          <p style={{ margin: 0, color: "var(--ow-text-lo)", fontSize: "0.85rem" }}>Loading…</p>
        ) : filtered.length === 0 ? (
          <p style={{ margin: 0, color: "var(--ow-text-lo)", fontSize: "0.85rem" }}>Queue is empty — nice work.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {filtered.slice(0, 5).map((c, idx) => {
              const email = extractEmailFromNotes(c.notes);
              const igHandle = extractInstagramFromNotes(c.notes);
              const linkedin = extractLinkedinFromNotes(c.notes);
              const sms = smsDraft({ firstName: c.firstName, winery: c.winery, painPoint: c.painPoint, hookText: c.hookText, slug: c.slug });
              const igMsg = igDmDraft({ firstName: c.firstName, winery: c.winery, hookText: c.hookText, painPoint: c.painPoint });
              const state = copied[c.slug];

              // Primary channel priority: SMS → email → Insta DM → LinkedIn → open card
              let primary: { label: string; onClick: () => void; testid: string; markChannel: "sms" | "email" | "both" } | null = null;
              if (c.hasMobile) {
                primary = { label: state === "sms" ? "✓ SMS copied — paste in Messages" : "Copy SMS", onClick: () => copySms(c.slug, sms), testid: `top5-sms-${c.slug}`, markChannel: "sms" };
              } else if (email) {
                primary = { label: "Open email draft", onClick: () => window.open(buildMailto(email, c.firstName, c.winery, c.painPoint, c.hookText, c.slug), "_blank", "noopener,noreferrer"), testid: `top5-email-${c.slug}`, markChannel: "email" };
              } else if (igHandle) {
                primary = { label: state === "sms" ? "✓ DM copied — paste in Insta" : `DM @${igHandle} on Instagram`, onClick: () => copyAndOpen(c.slug, igMsg, `https://www.instagram.com/${igHandle}/`, "insta"), testid: `top5-insta-${c.slug}`, markChannel: "sms" };
              } else if (linkedin) {
                primary = { label: state === "sms" ? "✓ Message copied — paste in LinkedIn" : "Message on LinkedIn", onClick: () => copyAndOpen(c.slug, igMsg, linkedin, "linkedin"), testid: `top5-linkedin-${c.slug}`, markChannel: "email" };
              }

              return (
                <div
                  key={c.slug}
                  data-testid={`top5-row-${c.slug}`}
                  style={{
                    background: state === "done" ? "color-mix(in oklch, #16a34a 8%, transparent)" : "var(--ow-bg-base)",
                    border: "1px solid var(--ow-border)",
                    borderRadius: 6,
                    padding: "12px 14px",
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 14,
                    alignItems: "center",
                    opacity: state === "done" ? 0.6 : 1,
                  }}
                >
                  <div style={{ minWidth: 30, textAlign: "center" }}>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.6rem", fontWeight: 700, color: "var(--ow-amber)", lineHeight: 1 }}>{idx + 1}</div>
                  </div>
                  <div>
                    <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1.05rem", fontWeight: 600, marginBottom: 3 }}>
                      {c.firstName} {c.lastName ?? ""}
                      {c.winery && <span style={{ fontSize: "0.85rem", color: "var(--ow-text-mid)", fontWeight: 400 }}> · {c.winery}</span>}
                    </div>
                    {c.hookText && (
                      <p style={{ margin: "2px 0 6px", fontSize: "0.82rem", color: "var(--ow-text-mid)", fontStyle: "italic", lineHeight: 1.45 }}>
                        &ldquo;{c.hookText}&rdquo;
                      </p>
                    )}
                    <div style={{ display: "flex", gap: 8, fontSize: "0.7rem", color: "var(--ow-text-lo)", flexWrap: "wrap" }}>
                      {c.hasMobile && <span data-testid={`chan-sms-${c.slug}`}>📱 SMS</span>}
                      {email && <span data-testid={`chan-email-${c.slug}`}>✉ email</span>}
                      {igHandle && <span data-testid={`chan-insta-${c.slug}`}>📸 @{igHandle}</span>}
                      {linkedin && <span data-testid={`chan-linkedin-${c.slug}`}>🔗 LinkedIn</span>}
                      {!c.hasMobile && !email && !igHandle && !linkedin && <span style={{ color: "#dc2626" }}>no channel — enrich first</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "flex-end", minWidth: 220 }}>
                    {state === "done" ? (
                      <span data-testid={`top5-done-${c.slug}`} style={{ color: "#16a34a", fontSize: "0.85rem", fontWeight: 600 }}>✓ sent — nice</span>
                    ) : primary ? (
                      <>
                        <button
                          data-testid={primary.testid}
                          onClick={primary.onClick}
                          style={{
                            padding: "8px 14px",
                            background: state === "sms" ? "#16a34a" : "var(--ow-amber)",
                            color: "oklch(0.10 0.008 60)",
                            border: "none",
                            borderRadius: 4,
                            fontSize: "0.85rem",
                            fontWeight: 700,
                            cursor: "pointer",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {primary.label}
                        </button>
                        <button
                          data-testid={`top5-mark-sent-${c.slug}`}
                          onClick={() => stampSent(c.slug, primary!.markChannel)}
                          disabled={markSent.isPending}
                          style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-lo)", border: "1px dashed var(--ow-border)", borderRadius: 3, fontSize: "0.7rem", cursor: markSent.isPending ? "wait" : "pointer" }}
                        >
                          Mark sent, next →
                        </button>
                      </>
                    ) : (
                      <Link
                        href={`/admin/contacts?slug=${c.slug}`}
                        data-testid={`top5-open-${c.slug}`}
                        style={{ padding: "6px 12px", border: "1px solid var(--ow-border)", borderRadius: 4, fontSize: "0.78rem", color: "var(--ow-text-hi)", textDecoration: "none" }}
                      >
                        Enrich this contact →
                      </Link>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <details data-testid="advanced-tools-details" style={{ margin: "0 24px 8px" }}>
        <summary style={{ cursor: "pointer", padding: "10px 4px", fontSize: "0.82rem", color: "var(--ow-text-mid)", fontFamily: "'Fraunces',serif" }}>
          Advanced tools · region filter · bulk AI rewrite · vCard export · full queue
        </summary>
        <div style={{ paddingTop: 8 }}>

      <div style={{ padding: "16px 0 8px", display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
        <span style={{ fontSize: "0.75rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.05em" }}>Filter region:</span>
        {["all", "mclaren-vale", "hunter", "barossa", "yarra-valley", "adelaide-hills", "coonawarra", "orange", "tasmania", "margaret-river", "mornington-peninsula", "clare", "beechworth", "grampians"].map((r) => {
          const label = r === "all" ? "All" : r.replace(/-/g, " ");
          const cohortCount = r === "all" ? queue.length : queue.filter((c) => ((c as { region?: string | null }).region ?? "") === r).length;
          if (r !== "all" && cohortCount === 0) return null;
          return (
            <button
              key={r}
              data-testid={`filter-${r}`}
              onClick={() => setRegionFilter(r)}
              style={{
                padding: "3px 10px", borderRadius: 3, border: "1px solid var(--ow-border)",
                background: regionFilter === r ? "var(--ow-amber)" : "transparent",
                color: regionFilter === r ? "oklch(0.10 0.008 60)" : "var(--ow-text-mid)",
                fontSize: "0.72rem", cursor: "pointer", textTransform: "capitalize",
              }}
            >
              {label} <span style={{ opacity: 0.6, fontSize: "0.65rem" }}>({cohortCount})</span>
            </button>
          );
        })}
        <span style={{ marginLeft: "auto", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
          {filtered.length} of {queue.length} in queue
        </span>
      </div>

      {/* Bulk AI Rewrite strip — scoped to current region filter */}
      <div
        data-testid="bulk-ai-rewrite-strip"
        style={{
          margin: "0 0 8px",
          padding: "10px 14px",
          background: "color-mix(in oklch, var(--ow-amber) 5%, transparent)",
          border: "1px solid var(--ow-border)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.95rem", color: "var(--ow-text-hi)" }}>
          ✨ Bulk AI rewrite {regionFilter !== "all" && <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-amber)", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", marginLeft: 6 }}>{regionFilter.replace(/-/g, " ")} cohort</span>}
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--ow-text-mid)", flex: 1, minWidth: 240 }}>
          {regionFilter === "all"
            ? `Pre-warm every unsent SMS in the queue via Claude. ${forceRewrite ? "Force mode ON — will overwrite existing drafts." : "Skips hand-crafted overrides."} ~$0.005 per contact.`
            : `Rewrite the ${filtered.length}-contact ${regionFilter.replace(/-/g, " ")} cohort with a shared story arc. ${forceRewrite ? "Force mode ON — will overwrite existing drafts." : "Skips existing drafts."}`}
        </span>
        <button
          data-testid="bulk-rewrite-warm"
          onClick={() => runBulkRewrite("warm")}
          disabled={bulkRewrite.isPending || filtered.length === 0}
          style={{ padding: "5px 12px", background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", border: "none", borderRadius: 3, fontSize: "0.75rem", fontWeight: 700, cursor: bulkRewrite.isPending ? "wait" : "pointer", opacity: bulkRewrite.isPending || filtered.length === 0 ? 0.6 : 1 }}
        >
          {bulkRewrite.isPending ? "Rewriting…" : "Warm tone"}
        </button>
        <button
          data-testid="bulk-rewrite-brief"
          onClick={() => runBulkRewrite("brief")}
          disabled={bulkRewrite.isPending || filtered.length === 0}
          style={{ padding: "5px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: bulkRewrite.isPending ? "wait" : "pointer", opacity: filtered.length === 0 ? 0.5 : 1 }}
        >
          Brief
        </button>
        <button
          data-testid="bulk-rewrite-regional"
          onClick={() => runBulkRewrite("regional")}
          disabled={bulkRewrite.isPending || filtered.length === 0}
          style={{ padding: "5px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: bulkRewrite.isPending ? "wait" : "pointer", opacity: filtered.length === 0 ? 0.5 : 1 }}
        >
          Regional
        </button>
        <label
          data-testid="bulk-rewrite-force-toggle"
          title="Off (default): keeps existing hand-crafted drafts untouched. On: overwrites them with a fresh Claude rewrite. Use when you want to refresh the whole cohort."
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
            padding: "4px 10px",
            background: forceRewrite ? "color-mix(in oklch, #dc2626 12%, transparent)" : "transparent",
            border: `1px solid ${forceRewrite ? "#dc2626" : "var(--ow-border)"}`,
            borderRadius: 3,
            fontSize: "0.72rem",
            color: forceRewrite ? "#dc2626" : "var(--ow-text-mid)",
            cursor: "pointer",
            fontWeight: forceRewrite ? 700 : 500,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={forceRewrite}
            onChange={(e) => setForceRewrite(e.target.checked)}
            style={{ margin: 0, accentColor: "#dc2626" }}
          />
          Force · overwrite existing
        </label>
        {bulkResult && (
          <span data-testid="bulk-rewrite-result" style={{ fontSize: "0.78rem", color: "#16a34a", fontWeight: 600 }}>
            ✓ {bulkResult.rewritten} rewritten · {bulkResult.skippedExisting} skipped · {bulkResult.failed} failed
          </span>
        )}
      </div>

      {/* Cohort Copy strip — TSV clipboard for the current filter */}
      <div
        data-testid="cohort-copy-strip"
        style={{
          margin: "0 0 12px",
          padding: "10px 14px",
          background: "color-mix(in oklch, oklch(0.65 0.14 200) 4%, transparent)",
          border: "1px solid var(--ow-border)",
          borderRadius: 4,
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "0.95rem", color: "var(--ow-text-hi)" }}>
          📋 Send to your phone
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--ow-text-mid)", flex: 1, minWidth: 240 }}>
          <strong>Copy TSV</strong> for iMessage / spreadsheet paste. <strong>Export vCard</strong> to import all contacts into your phone (Android + iOS) so Google Messages + WhatsApp autocomplete the names.
        </span>
        <button
          data-testid="cohort-copy-btn"
          onClick={copyCohortTsv}
          disabled={filtered.length === 0}
          style={{
            padding: "5px 14px",
            background: cohortCopied ? "#16a34a" : "oklch(0.65 0.14 200)",
            color: "oklch(0.10 0.008 60)",
            border: "none",
            borderRadius: 3,
            fontSize: "0.78rem",
            fontWeight: 700,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            opacity: filtered.length === 0 ? 0.5 : 1,
          }}
        >
          {cohortCopied ? "✓ Copied — paste into Messages" : `Copy ${filtered.filter((c) => c.mobileAu).length} SMSes as TSV`}
        </button>
        <button
          data-testid="cohort-vcard-btn"
          onClick={exportCohortVcard}
          disabled={filtered.length === 0}
          title="Download a .vcf you can AirDrop / email to your phone. iOS + Android Contacts absorb it; Google Messages + WhatsApp autocomplete winemaker names when you start typing."
          style={{
            padding: "5px 14px",
            background: vcardCount !== null ? "#16a34a" : "transparent",
            color: vcardCount !== null ? "oklch(0.10 0.008 60)" : "var(--ow-text-hi)",
            border: "1px solid var(--ow-border)",
            borderRadius: 3,
            fontSize: "0.78rem",
            fontWeight: 600,
            cursor: filtered.length === 0 ? "not-allowed" : "pointer",
            opacity: filtered.length === 0 ? 0.5 : 1,
          }}
        >
          {vcardCount !== null
            ? `✓ ${vcardCount} contacts exported`
            : `Export ${filtered.filter((c) => c.mobileAu || (c as { email?: string | null }).email).length} as vCard`}
        </button>
      </div>

      {isLoading && <p style={{ padding: 24 }}>Loading queue…</p>}
      {!isLoading && filtered.length === 0 && <p style={{ padding: 24, color: "var(--ow-text-lo)" }}>Nothing in queue for this filter.</p>}

      <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
        {filtered.map((c, idx) => {
          const email = extractEmailFromNotes(c.notes);
          const igHandle = extractInstagramFromNotes(c.notes);
          const linkedin = extractLinkedinFromNotes(c.notes);
          const sms = smsDraft({ firstName: c.firstName, winery: c.winery, painPoint: c.painPoint, hookText: c.hookText, slug: c.slug });
          const igMsg = igDmDraft({ firstName: c.firstName, winery: c.winery, hookText: c.hookText, painPoint: c.painPoint });
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
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
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
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ padding: "4px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", textDecoration: "none" }}
                        >
                          Draft in Gmail
                        </a>
                      )}
                      {igHandle && (
                        <button
                          data-testid={`queue-insta-${c.slug}`}
                          onClick={() => copyAndOpen(c.slug, igMsg, `https://www.instagram.com/${igHandle}/`, "insta")}
                          title={`Copies a short DM to your clipboard, then opens instagram.com/${igHandle} in a new tab. Paste into the DM box.`}
                          style={{ padding: "4px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          📸 DM @{igHandle}
                        </button>
                      )}
                      {linkedin && (
                        <button
                          data-testid={`queue-linkedin-${c.slug}`}
                          onClick={() => copyAndOpen(c.slug, igMsg, linkedin, "linkedin")}
                          title="Copies a short message to your clipboard, then opens the LinkedIn profile in a new tab."
                          style={{ padding: "4px 12px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          🔗 LinkedIn
                        </button>
                      )}
                      {!c.hasMobile && !email && !igHandle && !linkedin && (
                        <span style={{ fontSize: "0.72rem", color: "#dc2626", fontStyle: "italic" }}>no channel — enrich first</span>
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
      </details>
    </div>
  );
}
