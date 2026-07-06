/**
 * /admin/gate-invites — magic-link management (Feb 2026).
 *
 * Rich types a label ("Sarah @ Brokenwood"), clicks Create, gets a copy-
 * paste-ready /i/<token> URL to share via SMS or email. Table below
 * shows every invite ever created with live usage stats (first click,
 * last click, use count) and a one-click revoke.
 *
 * Revocation is instant: verifyGateCookie in server/gate.ts hits the DB
 * row on every gate-check and sees revoked_at != null. Same story in
 * viteGateWall (dev preview) — beta testers get locked out on their next
 * page navigation.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const SERIF = "'Fraunces',serif";
const SANS = "'Lato',sans-serif";
const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const BORDER = "var(--ow-border)";
const CARD = "var(--ow-bg-card)";

function timeAgo(ms: number | null): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  const days = Math.floor(diff / 86_400_000);
  if (days < 30) return `${days}d ago`;
  return new Date(ms).toLocaleDateString("en-AU", { day: "numeric", month: "short", year: "numeric" });
}

function statusOf(invite: {
  revokedAt: number | null;
  expiresAt: number | null;
  firstUsedAt: number | null;
}): { label: string; color: string } {
  if (invite.revokedAt) return { label: "REVOKED", color: "#b91c1c" };
  if (invite.expiresAt && invite.expiresAt < Date.now()) return { label: "EXPIRED", color: "#78350f" };
  if (invite.firstUsedAt) return { label: "ACTIVE", color: "#059669" };
  return { label: "UNCLAIMED", color: "#6b7280" };
}

export default function AdminGateInvites() {
  const utils = trpc.useUtils();
  const listQ = trpc.gate.list.useQuery();
  const createMut = trpc.gate.create.useMutation({
    onSuccess: () => utils.gate.list.invalidate(),
  });
  const revokeMut = trpc.gate.revoke.useMutation({
    onSuccess: () => utils.gate.list.invalidate(),
  });
  const unrevokeMut = trpc.gate.unrevoke.useMutation({
    onSuccess: () => utils.gate.list.invalidate(),
  });

  const [label, setLabel] = useState("");
  const [expiryOpt, setExpiryOpt] = useState<"none" | 7 | 30 | 90>("none");
  const [lastCreated, setLastCreated] = useState<{ label: string; url: string } | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!label.trim()) return;
    const expiresInDays = expiryOpt === "none" ? null : expiryOpt;
    const result = await createMut.mutateAsync({ label: label.trim(), expiresInDays });
    const url = `${origin}/i/${result.token}`;
    setLastCreated({ label: result.label, url });
    setLabel("");
    // Auto-copy to clipboard for immediate paste
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // ignore — banner still shows the URL to copy manually
    }
  }

  async function copyUrl(id: number, token: string) {
    const url = `${origin}/i/${token}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  return (
    <div data-testid="admin-gate-invites-page" className="container py-8" style={{ maxWidth: 1100 }}>
      <Link href="/admin" style={{ fontFamily: SANS, fontSize: "0.78rem", color: LO }} data-testid="gate-invites-back">
        ← Back to admin
      </Link>
      <p className="text-xs uppercase tracking-widest mt-3" style={{ color: AMBER, fontFamily: SANS }}>
        Ownology · Gate invites
      </p>
      <h1 style={{ fontFamily: SERIF, fontSize: "2.1rem", color: HI, margin: "8px 0 6px" }}>
        Per-tester magic links
      </h1>
      <p style={{ fontFamily: SANS, color: MID, fontSize: "0.92rem", maxWidth: 720, lineHeight: 1.55 }}>
        Better hygiene than sharing the gate password. Each invite is a unique link (
        <code style={{ background: CARD, padding: "0 4px", borderRadius: 2 }}>/i/&lt;token&gt;</code>
        ) — revoke one tester without disturbing anyone else. Clicks are tracked so you can see who&apos;s active.
      </p>

      {/* Create form */}
      <section
        style={{
          marginTop: 24,
          padding: "18px 20px",
          background: CARD,
          border: `1px solid ${BORDER}`,
          borderRadius: 10,
        }}
      >
        <p className="text-xs uppercase tracking-widest" style={{ color: LO, fontFamily: SANS, letterSpacing: "0.12em", margin: 0 }}>
          New invite
        </p>
        <form onSubmit={onCreate} style={{ marginTop: 12, display: "flex", flexWrap: "wrap", gap: 10, alignItems: "flex-end" }}>
          <div style={{ flex: "1 1 280px" }}>
            <label style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>
              Label (who this is for)
            </label>
            <input
              data-testid="gate-invite-label"
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Sarah @ Brokenwood"
              required
              maxLength={120}
              style={{ display: "block", width: "100%", marginTop: 4, padding: "8px 10px", background: "var(--ow-bg-inset)", border: `1px solid ${BORDER}`, borderRadius: 6, color: HI, fontFamily: SANS, fontSize: "0.9rem" }}
            />
          </div>
          <div>
            <label style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.08em", textTransform: "uppercase", color: LO, fontWeight: 700 }}>
              Expires
            </label>
            <select
              data-testid="gate-invite-expires"
              value={String(expiryOpt)}
              onChange={(e) => {
                const v = e.target.value;
                setExpiryOpt(v === "none" ? "none" : (Number(v) as 7 | 30 | 90));
              }}
              style={{ display: "block", marginTop: 4, padding: "8px 10px", background: "var(--ow-bg-inset)", border: `1px solid ${BORDER}`, borderRadius: 6, color: HI, fontFamily: SANS, fontSize: "0.9rem" }}
            >
              <option value="none">Never (revoke manually)</option>
              <option value="7">7 days</option>
              <option value="30">30 days</option>
              <option value="90">90 days</option>
            </select>
          </div>
          <button
            type="submit"
            data-testid="gate-invite-create"
            disabled={createMut.isPending || !label.trim()}
            style={{ padding: "9px 18px", background: AMBER, color: "oklch(0.10 0.008 60)", fontFamily: SANS, fontSize: "0.82rem", fontWeight: 700, border: "none", borderRadius: 4, cursor: createMut.isPending ? "wait" : "pointer" }}
          >
            {createMut.isPending ? "Creating…" : "▶ Create invite"}
          </button>
        </form>
        {lastCreated && (
          <div
            data-testid="gate-invite-last-created"
            style={{
              marginTop: 14,
              padding: "10px 14px",
              background: "color-mix(in oklch, gold 8%, transparent)",
              border: `1px solid ${AMBER}`,
              borderRadius: 6,
              fontFamily: SANS,
              fontSize: "0.82rem",
              color: HI,
              wordBreak: "break-all",
            }}
          >
            ✓ Invite created for <strong>{lastCreated.label}</strong> — <span style={{ color: AMBER }}>copied to clipboard</span>
            <div style={{ marginTop: 4, fontSize: "0.75rem", color: MID }}>{lastCreated.url}</div>
          </div>
        )}
      </section>

      {/* Invites table */}
      <section style={{ marginTop: 28 }} data-testid="gate-invites-table-section">
        <h2 style={{ fontFamily: SERIF, fontSize: "1.3rem", color: HI, margin: "0 0 12px" }}>
          All invites {listQ.data ? `(${listQ.data.length})` : ""}
        </h2>
        {listQ.isLoading ? (
          <p style={{ fontFamily: SANS, color: LO }}>Loading…</p>
        ) : !listQ.data || listQ.data.length === 0 ? (
          <p style={{ fontFamily: SANS, color: MID }}>No invites yet. Create one above.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontFamily: SANS, fontSize: "0.82rem" }}>
              <thead>
                <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                  <Th>Label</Th>
                  <Th>Status</Th>
                  <Th>Created</Th>
                  <Th>First used</Th>
                  <Th>Last used</Th>
                  <Th>Uses</Th>
                  <Th>Expires</Th>
                  <Th>Action</Th>
                </tr>
              </thead>
              <tbody>
                {listQ.data.map((inv) => {
                  const st = statusOf(inv);
                  return (
                    <tr key={inv.id} data-testid={`gate-invite-row-${inv.id}`} style={{ borderBottom: `1px solid ${BORDER}` }}>
                      <Td><strong style={{ color: HI }}>{inv.label}</strong></Td>
                      <Td>
                        <span style={{ fontSize: "0.65rem", padding: "2px 6px", borderRadius: 3, background: `color-mix(in oklch, ${st.color} 15%, transparent)`, color: st.color, fontWeight: 700, letterSpacing: "0.06em" }}>
                          {st.label}
                        </span>
                      </Td>
                      <Td>{timeAgo(inv.createdAt)}</Td>
                      <Td>{timeAgo(inv.firstUsedAt)}</Td>
                      <Td>{timeAgo(inv.lastUsedAt)}</Td>
                      <Td><span style={{ color: inv.useCount > 0 ? HI : LO }}>{inv.useCount}</span></Td>
                      <Td>{inv.expiresAt ? new Date(inv.expiresAt).toLocaleDateString("en-AU", { day: "numeric", month: "short" }) : "never"}</Td>
                      <Td>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          <button
                            type="button"
                            data-testid={`gate-invite-copy-${inv.id}`}
                            onClick={() => copyUrl(inv.id, inv.token)}
                            disabled={Boolean(inv.revokedAt)}
                            style={{ background: "transparent", border: "none", color: inv.revokedAt ? LO : AMBER, fontFamily: SANS, fontSize: "0.72rem", cursor: inv.revokedAt ? "not-allowed" : "pointer", textDecoration: "underline dotted", padding: 0 }}
                          >
                            {copiedId === inv.id ? "✓ Copied" : "Copy URL"}
                          </button>
                          {inv.revokedAt ? (
                            <button
                              type="button"
                              data-testid={`gate-invite-unrevoke-${inv.id}`}
                              onClick={() => unrevokeMut.mutate({ id: inv.id })}
                              style={{ background: "transparent", border: "none", color: MID, fontFamily: SANS, fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline dotted", padding: 0 }}
                            >
                              Un-revoke
                            </button>
                          ) : (
                            <button
                              type="button"
                              data-testid={`gate-invite-revoke-${inv.id}`}
                              onClick={() => {
                                if (confirm(`Revoke access for "${inv.label}"?\n\nThey&apos;ll be locked out on their next page navigation.`)) revokeMut.mutate({ id: inv.id });
                              }}
                              style={{ background: "transparent", border: "none", color: "#b91c1c", fontFamily: SANS, fontSize: "0.72rem", cursor: "pointer", textDecoration: "underline dotted", padding: 0 }}
                            >
                              Revoke
                            </button>
                          )}
                        </div>
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p style={{ marginTop: 24, fontFamily: SANS, fontSize: "0.72rem", color: LO }}>
        Under the hood: each invite is a JWT-signed cookie whose payload embeds the invite ID.
        The gate wall queries this table on every request — revocation is immediate.
      </p>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "6px 8px", textAlign: "left", fontFamily: SANS, fontSize: "0.68rem", color: LO, letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700 }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "8px 8px", color: MID, verticalAlign: "top" }}>
      {children}
    </td>
  );
}
