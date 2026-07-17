/**
 * AdminIndustryNews — /admin/industry-news
 *
 * Inverted BD workflow (Feb 2026, Rich): look at 10 fresh WBM headlines,
 * pick one, see the region-matched contacts pre-attached, one-click a
 * Claude-drafted news-anchored SMS. Beats hunting for angles across
 * 2000 contact cards.
 *
 * Design: dense left-to-right list, expandable news card, per-item
 * "matching contacts" panel with generate/copy/preview inline.
 */

import { useEffect, useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc";

const CARD = "var(--ow-bg-card)";
const RAISED = "var(--ow-bg-raised)";
const BASE = "var(--ow-bg-base)";
const BORDER = "var(--ow-border)";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const SANS = "'Lato', system-ui, sans-serif";
const SERIF = "'Fraunces', 'Cormorant Garamond', serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, monospace";

function fmtRelative(ms: number): string {
  const now = Date.now();
  const diff = Math.max(0, now - ms);
  const days = Math.floor(diff / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "1 day ago";
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks === 1) return "1 week ago";
  if (weeks < 6) return `${weeks} weeks ago`;
  const months = Math.floor(days / 30);
  return months <= 1 ? "1 month ago" : `${months} months ago`;
}

export default function AdminIndustryNews() {
  const [regionFilter, setRegionFilter] = useState<string>("");
  const list = trpc.industryNews.list.useQuery({
    limit: 60,
    maxAgeDays: 45,
    region: regionFilter || undefined,
  });
  const refresh = trpc.industryNews.refresh.useMutation({
    onSuccess: () => list.refetch(),
  });
  const archive = trpc.industryNews.archive.useMutation({
    onSuccess: () => list.refetch(),
  });

  // ── Stale-check auto-refresh (Feb 2026) ─────────────────────────────
  // Rich opens this screen roughly once a day when he does BD. If the
  // newest `fetched_at` is > 4h old, silently kick off a refresh in the
  // background so the page always feels current WITHOUT the ops burden
  // of a Railway cron + CRON_SECRET. Guarded by a ref so it fires at
  // most once per mount; user can always hit the button to force.
  const STALE_THRESHOLD_MS = 4 * 60 * 60 * 1000; // 4 hours
  const autoRefreshedRef = useRef(false);
  useEffect(() => {
    if (autoRefreshedRef.current) return;
    if (list.isLoading || !list.data) return;
    const lastFetched = list.data.lastFetchedAt;
    // Never fetched OR older than the threshold → auto-refresh.
    if (lastFetched === null || Date.now() - lastFetched > STALE_THRESHOLD_MS) {
      autoRefreshedRef.current = true;
      refresh.mutate();
    }
  }, [list.data, list.isLoading, refresh, STALE_THRESHOLD_MS]);

  const [expandedItemId, setExpandedItemId] = useState<number | null>(null);

  const items = list.data?.items ?? [];
  const lastFetchedAt = list.data?.lastFetchedAt ?? null;
  const isAutoRefreshing = refresh.isPending && autoRefreshedRef.current && !refresh.data;
  const regionOptions = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of items) {
      if (i.region) map.set(i.region, (map.get(i.region) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [items]);

  const refreshStatus = refresh.data
    ? `Fetched ${refresh.data.wbm.scraped} · ${refresh.data.totalInserted} new · ${refresh.data.totalUpdated} updated`
    : refresh.error
      ? `Error: ${refresh.error.message}`
      : null;

  return (
    <div
      data-testid="admin-industry-news"
      style={{ background: BASE, minHeight: "100vh", padding: "32px 24px 80px", color: MID, fontFamily: SANS }}
    >
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: 16, marginBottom: 24 }}>
          <div>
            <p style={{ fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: AMBER, margin: 0, fontFamily: MONO }}>
              Industry news · WBM
            </p>
            <h1 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "2rem", color: HI, margin: "6px 0 0", letterSpacing: "-0.01em" }}>
              What the trade press is saying this week
            </h1>
            <p style={{ fontFamily: SANS, fontSize: "0.9rem", color: LO, margin: "6px 0 0", maxWidth: 620, lineHeight: 1.55 }}>
              Fresh WBM headlines mapped to contact regions. Click a card to see who in your list is in that region, then one-tap a news-anchored SMS opener via Claude.
            </p>
          </div>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
            {lastFetchedAt !== null && (
              <span
                data-testid="last-fetched-chip"
                style={{
                  fontFamily: MONO,
                  fontSize: "0.7rem",
                  color: isAutoRefreshing ? AMBER : LO,
                  padding: "5px 10px",
                  borderRadius: 4,
                  border: `1px solid ${BORDER}`,
                  background: RAISED,
                  whiteSpace: "nowrap",
                }}
              >
                {isAutoRefreshing ? "auto-refreshing…" : `fetched ${fmtRelative(lastFetchedAt)}`}
              </span>
            )}
            <button
              data-testid="refresh-wbm-btn"
              onClick={() => refresh.mutate()}
              disabled={refresh.isPending}
              style={{
                background: AMBER,
                color: "#2A1E0A",
                fontFamily: SANS,
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "9px 16px",
                borderRadius: 6,
                border: "none",
                cursor: refresh.isPending ? "wait" : "pointer",
                letterSpacing: "0.02em",
              }}
            >
              {refresh.isPending ? "Fetching WBM…" : "Refresh WBM"}
            </button>
          </div>
        </div>

        {refreshStatus && (
          <div
            data-testid="refresh-status"
            style={{
              padding: "8px 12px",
              marginBottom: 16,
              borderRadius: 4,
              fontFamily: MONO,
              fontSize: "0.75rem",
              background: refresh.error ? "color-mix(in oklch, oklch(0.65 0.20 25) 15%, transparent)" : "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
              color: refresh.error ? "oklch(0.75 0.18 25)" : AMBER,
              border: `1px solid ${refresh.error ? "oklch(0.65 0.20 25)" : AMBER}`,
            }}
          >
            {refreshStatus}
          </div>
        )}

        {regionOptions.length > 0 && (
          <div style={{ marginBottom: 20, display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
            <span style={{ fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: LO }}>
              Filter by region:
            </span>
            <button
              data-testid="region-filter-all"
              onClick={() => setRegionFilter("")}
              style={{
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${regionFilter === "" ? AMBER : BORDER}`,
                background: regionFilter === "" ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                color: regionFilter === "" ? AMBER : MID,
                fontFamily: SANS,
                fontSize: "0.75rem",
                cursor: "pointer",
              }}
            >
              All ({items.length})
            </button>
            {regionOptions.map(([slug, n]) => (
              <button
                key={slug}
                data-testid={`region-filter-${slug}`}
                onClick={() => setRegionFilter(slug === regionFilter ? "" : slug)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 999,
                  border: `1px solid ${regionFilter === slug ? AMBER : BORDER}`,
                  background: regionFilter === slug ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)" : "transparent",
                  color: regionFilter === slug ? AMBER : MID,
                  fontFamily: SANS,
                  fontSize: "0.75rem",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                {slug.replaceAll("-", " ")} ({n})
              </button>
            ))}
          </div>
        )}

        {list.isLoading && (
          <p style={{ color: LO, fontFamily: MONO, fontSize: "0.8rem" }}>Loading news items…</p>
        )}
        {!list.isLoading && items.length === 0 && (
          <div style={{ padding: 24, border: `1px dashed ${BORDER}`, borderRadius: 6, background: RAISED, textAlign: "center" }}>
            <p style={{ color: MID, margin: 0, fontSize: "0.95rem" }}>
              No news items yet. Hit <strong style={{ color: HI, fontWeight: 500 }}>Refresh WBM</strong> to scrape the latest headlines.
            </p>
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {items.map((item) => (
            <NewsItemCard
              key={item.id}
              item={item}
              expanded={expandedItemId === item.id}
              onToggle={() => setExpandedItemId(expandedItemId === item.id ? null : item.id)}
              onArchive={() => archive.mutate({ itemId: item.id })}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

interface NewsItem {
  id: number;
  source: string;
  url: string;
  headline: string;
  dek: string | null;
  imageUrl: string | null;
  region: string | null;
  categories: string[];
  author: string | null;
  publishedAt: number;
  fetchedAt: number;
  matchedContactCount: number;
}

function NewsItemCard({
  item,
  expanded,
  onToggle,
  onArchive,
}: {
  item: NewsItem;
  expanded: boolean;
  onToggle: () => void;
  onArchive: () => void;
}) {
  return (
    <div
      data-testid={`news-item-${item.id}`}
      style={{
        background: CARD,
        border: `1px solid ${BORDER}`,
        borderRadius: 6,
        padding: "14px 16px",
        transition: "border-color 200ms",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start", cursor: "pointer" }} onClick={onToggle}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 4 }}>
            <span style={{ fontSize: "0.6rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, fontWeight: 700, fontFamily: MONO }}>
              {item.source.toUpperCase()}
            </span>
            {item.region && (
              <span style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: AMBER, textTransform: "capitalize" }}>
                {item.region.replaceAll("-", " ")}
              </span>
            )}
            {item.matchedContactCount > 0 && (
              <span data-testid={`match-count-${item.id}`} style={{ fontSize: "0.65rem", padding: "2px 8px", borderRadius: 999, background: RAISED, color: MID, border: `1px solid ${BORDER}` }}>
                {item.matchedContactCount} contact{item.matchedContactCount === 1 ? "" : "s"} in list
              </span>
            )}
            <span style={{ fontSize: "0.65rem", color: LO }}>
              {fmtRelative(item.publishedAt)} · {item.author ?? "Unknown"}
            </span>
          </div>
          <h3 style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.05rem", color: HI, margin: "2px 0 4px", lineHeight: 1.3 }}>
            {item.headline}
          </h3>
          {item.dek && (
            <p style={{ fontSize: "0.82rem", color: MID, margin: 0, lineHeight: 1.55 }}>
              {item.dek}
            </p>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, alignItems: "flex-end" }}>
          <a
            data-testid={`read-article-${item.id}`}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            style={{ fontSize: "0.7rem", color: LO, fontFamily: MONO, textDecoration: "underline" }}
          >
            read on WBM ↗
          </a>
          <button
            data-testid={`archive-${item.id}`}
            onClick={(e) => { e.stopPropagation(); onArchive(); }}
            style={{
              fontSize: "0.65rem",
              padding: "3px 8px",
              borderRadius: 3,
              border: `1px solid ${BORDER}`,
              background: "transparent",
              color: LO,
              cursor: "pointer",
              fontFamily: MONO,
            }}
          >
            dismiss
          </button>
        </div>
      </div>
      {expanded && <ExpandedMatchList itemId={item.id} />}
    </div>
  );
}

function ExpandedMatchList({ itemId }: { itemId: number }) {
  const q = trpc.industryNews.itemContacts.useQuery({ itemId });

  if (q.isLoading) {
    return (
      <p style={{ marginTop: 14, color: LO, fontFamily: MONO, fontSize: "0.75rem" }}>Loading matches…</p>
    );
  }
  const item = q.data?.item;
  const contacts = q.data?.contacts ?? [];
  if (!item?.region) {
    return (
      <p style={{ marginTop: 14, color: LO, fontFamily: SANS, fontSize: "0.8rem" }}>
        This item isn&rsquo;t tagged with a region — no auto-matches. You can still copy the headline and paste it into any contact card manually.
      </p>
    );
  }
  if (contacts.length === 0) {
    return (
      <p style={{ marginTop: 14, color: LO, fontFamily: SANS, fontSize: "0.8rem" }}>
        No contacts in <strong style={{ color: MID, fontWeight: 500 }}>{item.region.replaceAll("-", " ")}</strong> yet.
      </p>
    );
  }
  return (
    <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
      <p style={{ fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: LO, margin: "0 0 8px", fontFamily: MONO }}>
        {contacts.length} match{contacts.length === 1 ? "" : "es"} · SMS-ready first
      </p>
      <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        {contacts.slice(0, 20).map((c) => (
          <ContactMatchRow key={c.slug} contact={c} itemId={itemId} />
        ))}
        {contacts.length > 20 && (
          <p style={{ fontSize: "0.7rem", color: LO, marginTop: 6 }}>
            +{contacts.length - 20} more matches — refine by tightening the news item.
          </p>
        )}
      </div>
    </div>
  );
}

function ContactMatchRow({
  contact,
  itemId,
}: {
  contact: {
    slug: string;
    firstName: string;
    lastName: string | null;
    winery: string | null;
    mobileAu: string | null;
    status: string | null;
    smsSentAt: number | null;
    smsDraftOverride: string | null;
    hookText: string | null;
  };
  itemId: number;
}) {
  const generate = trpc.industryNews.generateOpener.useMutation();
  const [showFull, setShowFull] = useState(false);
  const smsRef = generate.data?.sms ?? null;
  const hasMobile = !!(contact.mobileAu && /^\+614\d{8}$/.test(contact.mobileAu));

  async function onGenerate() {
    await generate.mutateAsync({ itemId, contactSlug: contact.slug, tone: "regional" });
    setShowFull(true);
  }
  async function onCopy() {
    if (!smsRef) return;
    await navigator.clipboard.writeText(smsRef);
  }
  async function onSms() {
    if (!smsRef || !contact.mobileAu) return;
    const body = encodeURIComponent(smsRef);
    window.location.href = `sms:${contact.mobileAu}?body=${body}`;
  }

  return (
    <div
      data-testid={`contact-match-${contact.slug}`}
      style={{
        display: "flex",
        gap: 10,
        alignItems: "flex-start",
        padding: "8px 10px",
        background: RAISED,
        borderRadius: 4,
        border: `1px solid ${BORDER}`,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: "1 1 240px", minWidth: 180 }}>
        <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
          <a
            href={`/admin/contacts?slug=${contact.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ fontFamily: SERIF, fontSize: "0.9rem", color: HI, fontWeight: 500, textDecoration: "none" }}
          >
            {contact.firstName}{contact.lastName ? ` ${contact.lastName}` : ""}
          </a>
          {contact.winery && (
            <span style={{ fontSize: "0.72rem", color: LO }}>· {contact.winery}</span>
          )}
          {hasMobile && (
            <span style={{ fontSize: "0.62rem", padding: "1px 6px", borderRadius: 3, background: "color-mix(in oklch, oklch(0.75 0.15 145) 15%, transparent)", color: "oklch(0.85 0.15 145)" }}>
              SMS-ready
            </span>
          )}
          {contact.smsSentAt && (
            <span style={{ fontSize: "0.62rem", color: LO }}>
              · sent {fmtRelative(contact.smsSentAt)}
            </span>
          )}
        </div>
        {smsRef && showFull && (
          <div
            data-testid={`generated-sms-${contact.slug}`}
            style={{ marginTop: 6, padding: 8, background: BASE, border: `1px solid ${BORDER}`, borderRadius: 3, fontFamily: MONO, fontSize: "0.72rem", color: MID, lineHeight: 1.5, whiteSpace: "pre-wrap" }}
          >
            {smsRef}
          </div>
        )}
        {generate.error && (
          <p style={{ marginTop: 6, color: "oklch(0.75 0.18 25)", fontFamily: MONO, fontSize: "0.7rem" }}>
            Error: {generate.error.message}
          </p>
        )}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button
          data-testid={`gen-opener-${contact.slug}`}
          onClick={onGenerate}
          disabled={generate.isPending}
          style={{
            padding: "5px 11px",
            fontSize: "0.72rem",
            background: smsRef ? "transparent" : AMBER,
            color: smsRef ? MID : "#2A1E0A",
            border: `1px solid ${smsRef ? BORDER : AMBER}`,
            borderRadius: 4,
            cursor: generate.isPending ? "wait" : "pointer",
            fontFamily: SANS,
            fontWeight: smsRef ? 400 : 600,
          }}
        >
          {generate.isPending ? "Claude…" : smsRef ? "Regenerate" : "Draft opener"}
        </button>
        {smsRef && (
          <>
            <button
              data-testid={`copy-sms-${contact.slug}`}
              onClick={onCopy}
              style={{
                padding: "5px 11px",
                fontSize: "0.72rem",
                background: "transparent",
                color: MID,
                border: `1px solid ${BORDER}`,
                borderRadius: 4,
                cursor: "pointer",
                fontFamily: SANS,
              }}
            >
              Copy
            </button>
            {hasMobile && (
              <button
                data-testid={`send-sms-${contact.slug}`}
                onClick={onSms}
                style={{
                  padding: "5px 11px",
                  fontSize: "0.72rem",
                  background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)",
                  color: AMBER,
                  border: `1px solid ${AMBER}`,
                  borderRadius: 4,
                  cursor: "pointer",
                  fontFamily: SANS,
                  fontWeight: 600,
                }}
              >
                SMS
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
