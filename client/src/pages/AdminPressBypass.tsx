/**
 * AdminPressBypass — owner UI for granting wine-professional preview
 * access to The Press. Lists all pending + granted `press_bypass_request`
 * events and lets Rich one-click grant.
 *
 * Feb 2026, Rich. Value-engineered UX:
 *  - No modal, no confirmation dance — grant is idempotent, one button.
 *  - Ordering: pending requests first (freshest at top), then granted.
 *  - Displays the three fields the requester submitted: role, publication,
 *    note. Enough context for Rich to decide without email round-trip.
 *  - No revoke button yet — if we ever need it, a `press_bypass_revoked`
 *    event kind is the pattern to follow.
 */
import { Link } from "wouter";
import { ArrowLeft, CheckCircle2, Clock, ShieldCheck } from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function AdminPressBypass() {
  const listQ = trpc.onboarding.listPressBypassRequests.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const grantMut = trpc.onboarding.grantPressBypass.useMutation({
    onSuccess: () => listQ.refetch(),
  });

  const rows = listQ.data ?? [];
  const pending = rows.filter((r) => r.requestedAt && !r.grantedAt);
  const granted = rows.filter((r) => r.grantedAt);

  return (
    <div
      data-testid="admin-press-bypass"
      style={{
        maxWidth: 860,
        margin: "0 auto",
        padding: "2rem 1.25rem 4rem",
        color: "var(--ow-text-hi, #1a1210)",
      }}
    >
      <Link
        href="/admin"
        data-testid="admin-press-bypass-back"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.35rem",
          color: "var(--ow-text-mid, rgba(0,0,0,0.6))",
          textDecoration: "none",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.8rem",
          marginBottom: "1.5rem",
        }}
      >
        <ArrowLeft size={14} strokeWidth={2.2} /> Admin
      </Link>

      <h1
        style={{
          margin: 0,
          fontFamily: "'Fraunces', Georgia, serif",
          fontSize: "clamp(1.6rem, 4vw, 2rem)",
          fontWeight: 600,
          letterSpacing: "-0.01em",
        }}
      >
        Press bypass requests
      </h1>
      <p
        style={{
          margin: "0.5rem 0 2rem 0",
          fontSize: "0.9rem",
          color: "var(--ow-text-mid, rgba(0,0,0,0.6))",
          fontFamily: "'Lato', sans-serif",
          maxWidth: "62ch",
          lineHeight: 1.55,
        }}
      >
        Wine professionals evaluating Ownology can request preview access to
        The Press without racking a batch. Granting opens The Press for that
        user with a curated sample vintage and a &ldquo;Preview access&rdquo; ribbon.
      </p>

      {listQ.isLoading && (
        <p style={{ fontFamily: "'Lato', sans-serif", opacity: 0.6 }}>Loading requests…</p>
      )}
      {listQ.error && (
        <p style={{ color: "#a33", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem" }} data-testid="admin-press-bypass-error">
          {listQ.error.message}
        </p>
      )}

      {!listQ.isLoading && !listQ.error && rows.length === 0 && (
        <div
          data-testid="admin-press-bypass-empty"
          style={{
            padding: "1.25rem 1.5rem",
            borderRadius: "0.6rem",
            border: "1px dashed rgba(0,0,0,0.15)",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.9rem",
            color: "var(--ow-text-mid, rgba(0,0,0,0.55))",
          }}
        >
          No requests yet. When a wine writer, judge, or evaluator submits
          the preview-access form on <code>/roadmap</code>, they&apos;ll appear here.
        </div>
      )}

      {pending.length > 0 && (
        <>
          <SectionHead icon={<Clock size={14} strokeWidth={2.2} />} label={`Pending · ${pending.length}`} />
          {pending.map((r) => (
            <Row key={r.key} r={r} onGrant={() => r.userId && grantMut.mutate({ userId: r.userId })} isGranting={grantMut.isPending} />
          ))}
        </>
      )}

      {granted.length > 0 && (
        <>
          <SectionHead icon={<ShieldCheck size={14} strokeWidth={2.2} />} label={`Granted · ${granted.length}`} />
          {granted.map((r) => (
            <Row key={r.key} r={r} onGrant={() => {}} isGranting={false} />
          ))}
        </>
      )}
    </div>
  );
}

function SectionHead({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        marginTop: "2rem",
        marginBottom: "0.75rem",
        color: "#B0741A",
        fontFamily: "'Lato', sans-serif",
        fontSize: "0.68rem",
        fontWeight: 700,
        letterSpacing: "0.14em",
        textTransform: "uppercase",
      }}
    >
      {icon}
      {label}
    </div>
  );
}

type Row = {
  key: string;
  userId: number | null;
  gateInviteId: number | null;
  requestedAt: number | null;
  grantedAt: number | null;
  role: string | null;
  publication: string | null;
  note: string | null;
};

function Row({ r, onGrant, isGranting }: { r: Row; onGrant: () => void; isGranting: boolean }) {
  const isGranted = !!r.grantedAt;
  return (
    <div
      data-testid={`admin-press-bypass-row-${r.key}`}
      style={{
        padding: "1rem 1.25rem",
        borderRadius: "0.6rem",
        background: isGranted ? "rgba(176,116,26,0.05)" : "rgba(0,0,0,0.02)",
        border: isGranted ? "1px solid rgba(176,116,26,0.25)" : "1px solid rgba(0,0,0,0.08)",
        marginBottom: "0.6rem",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        gap: "1rem",
        alignItems: "flex-start",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", alignItems: "baseline" }}>
          <span
            style={{
              fontWeight: 700,
              fontSize: "0.95rem",
              color: "var(--ow-text-hi, #1a1210)",
            }}
          >
            {r.role || "Wine professional"}
          </span>
          {r.publication && (
            <span style={{ fontSize: "0.82rem", color: "var(--ow-text-mid, rgba(0,0,0,0.6))" }}>
              · {r.publication}
            </span>
          )}
        </div>
        <div style={{ fontSize: "0.72rem", color: "var(--ow-text-mid, rgba(0,0,0,0.55))", marginTop: "0.15rem" }}>
          {r.userId ? `user #${r.userId}` : r.gateInviteId ? `invite #${r.gateInviteId}` : "unknown identity"}
          {r.requestedAt && ` · requested ${new Date(r.requestedAt).toLocaleString()}`}
          {r.grantedAt && ` · granted ${new Date(r.grantedAt).toLocaleString()}`}
        </div>
        {r.note && (
          <p
            style={{
              margin: "0.5rem 0 0 0",
              fontSize: "0.82rem",
              color: "var(--ow-text-mid, rgba(0,0,0,0.65))",
              fontStyle: "italic",
              lineHeight: 1.5,
            }}
          >
            &ldquo;{r.note}&rdquo;
          </p>
        )}
      </div>
      <div>
        {isGranted ? (
          <span
            data-testid={`admin-press-bypass-granted-badge-${r.key}`}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.3rem",
              fontSize: "0.68rem",
              letterSpacing: "0.1em",
              textTransform: "uppercase",
              fontWeight: 700,
              color: "#B0741A",
              padding: "0.4rem 0.7rem",
              borderRadius: 999,
              border: "1px solid rgba(176,116,26,0.55)",
              background: "rgba(176,116,26,0.15)",
            }}
          >
            <CheckCircle2 size={12} strokeWidth={2.2} /> Granted
          </span>
        ) : r.userId ? (
          <button
            type="button"
            onClick={onGrant}
            disabled={isGranting}
            data-testid={`admin-press-bypass-grant-${r.key}`}
            style={{
              fontSize: "0.78rem",
              fontWeight: 600,
              color: "#2A1E0A",
              background: "#B0741A",
              border: "none",
              padding: "0.5rem 1rem",
              borderRadius: 999,
              cursor: isGranting ? "wait" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {isGranting ? "Granting…" : "Grant preview access"}
          </button>
        ) : (
          <span
            style={{
              fontSize: "0.68rem",
              color: "var(--ow-text-mid, rgba(0,0,0,0.5))",
              fontStyle: "italic",
            }}
            data-testid={`admin-press-bypass-noaccount-${r.key}`}
            title="This request came from a pre-account visitor. Ask them to sign up first, then grant."
          >
            Pre-account · sign up required
          </span>
        )}
      </div>
    </div>
  );
}
