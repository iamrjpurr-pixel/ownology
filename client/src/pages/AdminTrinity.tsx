/**
 * OWNOLOGY — /admin/trinity
 * Owner-only Trinity Review. The nightly pipeline turns clusters of real Free Run
 * "Go Deeper" reveals into pending community blog pieces; this screen lets the
 * owner review accuracy flags, promote the best to Featured (which makes them
 * eligible for the blog + newsletter), suppress duplicates, and trigger a run.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";

type Status = "pending" | "featured" | "suppressed";

const ACT_LABEL: Record<string, string> = {
  science: "The Science",
  vineyard: "The Vineyard",
  craft: "The Craft",
};

function Spinner() {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--ow-bg-base)" }}>
      <div className="w-8 h-8 rounded-full border-2 animate-spin" style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }} />
    </div>
  );
}

function AccessDenied({ isForbidden }: { isForbidden: boolean }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.5rem" }}>
        {isForbidden ? "Owner access required" : "Sign in required"}
      </h1>
      {!isForbidden && (
        <a href={getLoginUrl()} className="px-6 py-2.5 rounded-sm text-sm" style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", textDecoration: "none" }}>
          Sign in
        </a>
      )}
      <Link href="/admin"><a style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", textDecoration: "none" }}>← Back to Admin</a></Link>
    </div>
  );
}

interface Piece {
  id: number;
  questionCanonical: string;
  excerpt: string | null;
  contentScience: string | null;
  contentVineyard: string | null;
  contentCraft: string | null;
  primaryAct: string;
  topicTag: string | null;
  status: string;
  clusterSize: number;
  accuracyFlag: boolean;
  accuracyNote: string | null;
  createdAt: number;
}

function PieceCard({
  piece,
  onPromote,
  onSuppress,
  onUnsuppress,
  busy,
}: {
  piece: Piece;
  onPromote: (id: number) => void;
  onSuppress: (id: number) => void;
  onUnsuppress: (id: number) => void;
  busy: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div
      className="rounded-sm p-5"
      style={{
        background: "var(--ow-bg-card)",
        border: piece.accuracyFlag ? "1px solid oklch(0.65 0.18 50)" : "1px solid var(--ow-border-md)",
      }}
    >
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div style={{ flex: "1 1 320px", minWidth: 0 }}>
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span
              className="px-2 py-0.5 rounded-sm text-xs"
              style={{ background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}
            >
              {ACT_LABEL[piece.primaryAct] ?? piece.primaryAct}
            </span>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
              {piece.clusterSize} asks
            </span>
            {piece.topicTag && (
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                · {piece.topicTag}
              </span>
            )}
            {piece.accuracyFlag && (
              <span
                className="px-2 py-0.5 rounded-sm text-xs"
                style={{ background: "oklch(0.65 0.18 50 / 20%)", color: "oklch(0.72 0.18 50)", fontFamily: "'Lato',sans-serif" }}
              >
                ⚠ Accuracy review
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1.05rem", color: "var(--ow-text-hi)", lineHeight: 1.35 }}>
            {piece.questionCanonical}
          </h3>
          {piece.excerpt && (
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", marginTop: "0.4rem", lineHeight: 1.5 }}>
              {piece.excerpt}
            </p>
          )}
          {piece.accuracyFlag && piece.accuracyNote && (
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "oklch(0.72 0.18 50)", marginTop: "0.5rem", lineHeight: 1.5 }}>
              Flagged: {piece.accuracyNote}
            </p>
          )}
        </div>
      </div>

      <button
        onClick={() => setExpanded((e) => !e)}
        className="mt-3 text-xs"
        style={{ background: "none", border: "none", color: "var(--ow-amber)", cursor: "pointer", fontFamily: "'Lato',sans-serif" }}
      >
        {expanded ? "Hide panels ▲" : "Preview the three panels ▼"}
      </button>

      {expanded && (
        <div className="grid md:grid-cols-3 gap-3 mt-3">
          {([["The Science", piece.contentScience], ["The Vineyard", piece.contentVineyard], ["The Craft", piece.contentCraft]] as const).map(
            ([label, body]) => (
              <div key={label} className="rounded-sm p-3" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)" }}>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-amber)", marginBottom: "0.4rem" }}>
                  {label}
                </p>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-mid)", lineHeight: 1.5, whiteSpace: "pre-wrap" }}>
                  {body || "—"}
                </p>
              </div>
            )
          )}
        </div>
      )}

      <div className="flex gap-2 mt-4 flex-wrap">
        {piece.status !== "featured" && (
          <button
            onClick={() => onPromote(piece.id)}
            disabled={busy}
            className="px-4 py-2 rounded-sm text-xs font-medium"
            style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
          >
            Promote to Featured
          </button>
        )}
        {piece.status !== "suppressed" ? (
          <button
            onClick={() => onSuppress(piece.id)}
            disabled={busy}
            className="px-4 py-2 rounded-sm text-xs"
            style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-lo)", border: "1px solid var(--ow-border)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer" }}
          >
            Suppress
          </button>
        ) : (
          <button
            onClick={() => onUnsuppress(piece.id)}
            disabled={busy}
            className="px-4 py-2 rounded-sm text-xs"
            style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-lo)", border: "1px solid var(--ow-border)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer" }}
          >
            Restore to Pending
          </button>
        )}
      </div>
    </div>
  );
}

function NewsletterPanel() {
  const utils = trpc.useUtils();
  const draft = trpc.trinity.latestNewsletter.useQuery();
  const [showBody, setShowBody] = useState(false);

  const refresh = () => utils.trinity.latestNewsletter.invalidate();
  const compose = trpc.trinity.composeNewsletterNow.useMutation({ onSuccess: refresh });
  const approve = trpc.trinity.approveNewsletter.useMutation({ onSuccess: refresh });
  const skip = trpc.trinity.skipNewsletter.useMutation({ onSuccess: refresh });
  const busy = compose.isPending || approve.isPending || skip.isPending;

  const d = draft.data;
  const STATUS_LABEL: Record<string, string> = {
    preview: "In 24h preview",
    approved: "Approved",
    sent: "Sent",
    skipped: "Skipped",
  };

  return (
    <div
      className="rounded-sm p-5 mb-2"
      style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border-md)" }}
    >
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-amber)" }}>
            Monthly Newsletter
          </p>
          <h2 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1.05rem", color: "var(--ow-text-hi)", marginTop: "0.2rem" }}>
            Cellar Notes — from your top featured pieces
          </h2>
        </div>
        <button
          onClick={() => compose.mutate()}
          disabled={busy}
          className="px-4 py-2 rounded-sm text-xs font-medium"
          style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border-md)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer" }}
        >
          {compose.isPending ? "Composing…" : "Compose this month's issue"}
        </button>
      </div>

      {compose.data && !compose.data.created && (
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", marginTop: "0.75rem" }}>
          No issue composed: {compose.data.reason ?? "nothing to send"}.
        </p>
      )}

      {draft.isLoading ? (
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", color: "var(--ow-text-lo)", marginTop: "0.75rem" }}>Loading…</p>
      ) : !d || !d.exists ? (
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-lo)", marginTop: "0.75rem", lineHeight: 1.6 }}>
          No newsletter drafted yet. The monthly job composes an issue from your top featured pieces and holds it in a 24-hour preview window before sending. You can also compose one now.
        </p>
      ) : (
        <div className="mt-4">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="px-2 py-0.5 rounded-sm text-xs" style={{ background: "color-mix(in oklch, var(--ow-amber) 18%, transparent)", color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}>
              {d.period}
            </span>
            <span className="px-2 py-0.5 rounded-sm text-xs" style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", fontFamily: "'Lato',sans-serif" }}>
              {STATUS_LABEL[d.status] ?? d.status}
            </span>
            {d.status === "preview" && d.previewUntil && (
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                auto-sends {new Date(d.previewUntil).toLocaleString()}
              </span>
            )}
            {d.status === "sent" && d.sentAt && (
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                sent {new Date(d.sentAt).toLocaleString()}
              </span>
            )}
          </div>
          <h3 style={{ fontFamily: "'Fraunces',serif", fontWeight: 600, fontSize: "1rem", color: "var(--ow-text-hi)", lineHeight: 1.35 }}>
            {d.subject}
          </h3>

          <button
            onClick={() => setShowBody((s) => !s)}
            className="mt-2 text-xs"
            style={{ background: "none", border: "none", color: "var(--ow-amber)", cursor: "pointer", fontFamily: "'Lato',sans-serif" }}
          >
            {showBody ? "Hide preview ▲" : "Preview email body ▼"}
          </button>
          {showBody && (
            <pre
              className="mt-2 rounded-sm p-3"
              style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", fontSize: "0.8rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}
            >
              {d.body}
            </pre>
          )}

          {d.status === "preview" && (
            <div className="flex gap-2 mt-4 flex-wrap">
              <button
                onClick={() => approve.mutate({ id: d.id })}
                disabled={busy}
                className="px-4 py-2 rounded-sm text-xs font-medium"
                style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer", opacity: busy ? 0.6 : 1 }}
              >
                {approve.isPending ? "Sending…" : "Approve & send now"}
              </button>
              <button
                onClick={() => skip.mutate({ id: d.id })}
                disabled={busy}
                className="px-4 py-2 rounded-sm text-xs"
                style={{ background: "var(--ow-bg-raised)", color: "var(--ow-text-lo)", border: "1px solid var(--ow-border)", fontFamily: "'Lato',sans-serif", cursor: busy ? "wait" : "pointer" }}
              >
                Skip this issue
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AdminTrinity() {
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<Status>("pending");

  const counts = trpc.trinity.statusCounts.useQuery();
  const pending = trpc.trinity.listPending.useQuery(undefined, { enabled: tab === "pending" });
  const featured = trpc.trinity.listFeatured.useQuery(undefined, { enabled: tab === "featured" });
  const suppressed = trpc.trinity.listSuppressed.useQuery(undefined, { enabled: tab === "suppressed" });

  const refresh = () => {
    utils.trinity.statusCounts.invalidate();
    utils.trinity.listPending.invalidate();
    utils.trinity.listFeatured.invalidate();
    utils.trinity.listSuppressed.invalidate();
  };

  const promote = trpc.trinity.promoteToFeatured.useMutation({ onSuccess: refresh });
  const suppress = trpc.trinity.suppress.useMutation({ onSuccess: refresh });
  const unsuppress = trpc.trinity.unsuppress.useMutation({ onSuccess: refresh });
  const runNow = trpc.trinity.runNow.useMutation({ onSuccess: refresh });

  const error = counts.error;
  if (counts.isLoading) return <Spinner />;
  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized = error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");
  if (isForbidden || isUnauthorized) return <AccessDenied isForbidden={!!isForbidden} />;

  const active =
    tab === "pending" ? pending : tab === "featured" ? featured : suppressed;
  const pieces = (active.data ?? []) as Piece[];
  const busy = promote.isPending || suppress.isPending || unsuppress.isPending;

  const c = counts.data ?? { pending: 0, featured: 0, suppressed: 0, flagged: 0 };

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      <div style={{ borderBottom: "1px solid var(--ow-border)" }}>
        <div className="container py-5">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-4">
              <Link href="/admin"><a style={{ textDecoration: "none" }}><OwnologyLogo size={28} /></a></Link>
              <div style={{ width: "1px", height: "24px", background: "var(--ow-border-md)" }} />
              <div>
                <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-text-lo)" }}>
                  Trinity Review
                </p>
                <h1 style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "1.25rem", color: "var(--ow-text-hi)" }}>
                  Community Content Pipeline
                </h1>
              </div>
            </div>
            <button
              onClick={() => runNow.mutate()}
              disabled={runNow.isPending}
              className="px-4 py-2.5 rounded-sm text-sm font-medium"
              style={{ background: "var(--ow-amber)", color: "oklch(0.12 0.01 60)", fontFamily: "'Lato',sans-serif", cursor: runNow.isPending ? "wait" : "pointer", opacity: runNow.isPending ? 0.7 : 1 }}
            >
              {runNow.isPending ? "Running pipeline…" : "Run pipeline now"}
            </button>
          </div>
      {runNow.data && (
          <p style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.75rem", color: "var(--ow-text-mid)", marginTop: "0.75rem" }}>
              Scanned {runNow.data.scanned} · {runNow.data.clusters} clusters · {runNow.data.published} published · {runNow.data.flagged} flagged · {runNow.data.suppressedDuplicates} dupes suppressed · FAQ {runNow.data.faqCount}
            </p>
          )}
        </div>
      </div>

      <div className="container pt-6">
        <NewsletterPanel />
      </div>

      <div className="container py-6">
        {/* Tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {([["pending", `Pending (${c.pending})`], ["featured", `Featured (${c.featured})`], ["suppressed", `Suppressed (${c.suppressed})`]] as const).map(
            ([key, label]) => (
              <button
                key={key}
                onClick={() => setTab(key as Status)}
                className="px-4 py-2 rounded-sm text-sm"
                style={{
                  background: tab === key ? "var(--ow-amber)" : "var(--ow-bg-card)",
                  color: tab === key ? "oklch(0.12 0.01 60)" : "var(--ow-text-mid)",
                  border: "1px solid var(--ow-border-md)",
                  fontFamily: "'Lato',sans-serif",
                  cursor: "pointer",
                }}
              >
                {label}
              </button>
            )
          )}
          {c.flagged > 0 && (
            <span
              className="px-3 py-2 rounded-sm text-sm self-center"
              style={{ background: "oklch(0.65 0.18 50 / 18%)", color: "oklch(0.72 0.18 50)", fontFamily: "'Lato',sans-serif" }}
            >
              {c.flagged} flagged for accuracy
            </span>
          )}
        </div>

        {active.isLoading ? (
          <Spinner />
        ) : pieces.length === 0 ? (
          <div className="rounded-sm p-10 text-center" style={{ background: "var(--ow-bg-card)", border: "1px dashed var(--ow-border-md)" }}>
            <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)" }}>
              {tab === "pending"
                ? "No pending pieces yet. The nightly pipeline publishes here once enough similar questions accumulate, or use “Run pipeline now”."
                : tab === "featured"
                ? "No featured pieces yet. Promote pending pieces to feature them on the community blog and newsletter."
                : "Nothing suppressed."}
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            {pieces.map((p) => (
              <PieceCard
                key={p.id}
                piece={p}
                busy={busy}
                onPromote={(id) => promote.mutate({ id })}
                onSuppress={(id) => suppress.mutate({ id })}
                onUnsuppress={(id) => unsuppress.mutate({ id })}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
