/**
 * /admin/users — owner/admin surface for managing sign-ups + magic-link
 * troubleshooting.
 *
 * Live surfaces:
 *   - Total / admins / last-30d signup KPI strip
 *   - Search box (email · name · winery name)
 *   - Table of the last 200 users with role badge, winery slug, signed-in-via
 *   - Per-row expandable panel: last 10 magic-link tokens (status
 *     pending/consumed/expired) + a "Send fresh login link" button that
 *     bypasses the public 3/hr rate-limit.
 *
 * Deliberately does NOT do: role promotion (env-managed via ADMIN_EMAILS
 * to avoid two sources of truth) or user delete (data preservation).
 *
 * Jul 2026: introduced alongside open magic-link signup so Rich can see
 * who's signed up and unblock stuck sign-ins without opening the DB console.
 */
import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { OwnologyLogo } from "@/components/OwnologyLogo";

function fmtDateTime(ms: number | null | undefined): string {
  if (!ms) return "—";
  const d = new Date(ms);
  return d.toLocaleString("en-AU", { day: "2-digit", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
}

export default function AdminUsers() {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);

  const { data: statsData } = trpc.adminUsers.stats.useQuery();
  const { data, isLoading, refetch } = trpc.adminUsers.list.useQuery({ search: search || undefined });
  const resendMutation = trpc.adminUsers.sendFreshMagicLink.useMutation();
  const [resendState, setResendState] = useState<Record<string, "idle" | "sending" | "sent" | "error">>({});

  async function resendLink(email: string) {
    setResendState((s) => ({ ...s, [email]: "sending" }));
    try {
      const r = await resendMutation.mutateAsync({ email });
      setResendState((s) => ({ ...s, [email]: r.sent ? "sent" : "error" }));
    } catch (err) {
      setResendState((s) => ({ ...s, [email]: "error" }));
      alert(`Resend failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      <header style={{ borderBottom: "1px solid var(--ow-border)", padding: "16px 24px", display: "flex", alignItems: "center", gap: 16 }}>
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>Users</h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Every signup + a resend button for stuck sign-ins. Role changes live in <code>ADMIN_EMAILS</code> env.
          </p>
        </div>
        <Link href="/admin" style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}>← back to admin</Link>
      </header>

      <div style={{ padding: "20px 24px 8px", display: "grid", gridTemplateColumns: "repeat(3, minmax(0,1fr))", gap: 12 }}>
        {[
          { label: "Total users", value: statsData?.total ?? "…" },
          { label: "Admins", value: statsData?.admins ?? "…" },
          { label: "Last 30 days", value: statsData?.last30d ?? "…" },
        ].map((k) => (
          <div key={k.label} data-testid={`user-kpi-${k.label.replace(/\s+/g, '-').toLowerCase()}`} style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 6, padding: "12px 16px" }}>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--ow-text-lo)", textTransform: "uppercase", letterSpacing: "0.08em" }}>{k.label}</p>
            <p style={{ margin: "4px 0 0", fontFamily: "'Fraunces',serif", fontSize: "1.7rem", fontWeight: 700, color: "var(--ow-amber)" }}>{k.value}</p>
          </div>
        ))}
      </div>

      <div style={{ padding: "8px 24px 12px" }}>
        <input
          type="search"
          data-testid="user-search-input"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search email · name · winery"
          style={{ width: "100%", boxSizing: "border-box", padding: "8px 12px", background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", borderRadius: 4, color: "var(--ow-text-hi)", fontSize: "0.9rem" }}
        />
      </div>

      <div style={{ padding: "0 24px 40px" }}>
        {isLoading ? (
          <p style={{ color: "var(--ow-text-lo)" }}>Loading…</p>
        ) : !data?.rows?.length ? (
          <p style={{ color: "var(--ow-text-lo)" }}>No users match.</p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
            <thead>
              <tr style={{ background: "var(--ow-bg-card)", textAlign: "left" }}>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)" }}>Email · Name</th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)" }}>Winery</th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)" }}>Role</th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)" }}>Signed up</th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)" }}>Signup path</th>
                <th style={{ padding: "8px 12px", borderBottom: "1px solid var(--ow-border)", textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map((u) => {
                const isExpanded = expanded === u.email;
                const path = u.openId?.startsWith("emergent:") ? "Google" : u.openId?.startsWith("email:") ? "Email" : u.openId;
                const rs = resendState[u.email] || "idle";
                return (
                  <>
                    <tr key={u.id} data-testid={`user-row-${u.id}`} style={{ borderBottom: "1px solid var(--ow-border)" }}>
                      <td style={{ padding: "10px 12px" }}>
                        <div style={{ fontWeight: 600 }}>{u.name || "—"}</div>
                        <div style={{ fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>{u.email}</div>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.82rem" }}>
                        {u.wineryName ? (
                          <>
                            <div>{u.wineryName}</div>
                            <div style={{ fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>/{u.winerySlug}</div>
                          </>
                        ) : <span style={{ color: "var(--ow-text-lo)" }}>—</span>}
                      </td>
                      <td style={{ padding: "10px 12px" }}>
                        <span
                          data-testid={`user-role-${u.id}`}
                          style={{
                            fontSize: "0.7rem",
                            padding: "2px 8px",
                            background: u.role === "admin" ? "color-mix(in oklch, var(--ow-amber) 20%, transparent)" : "color-mix(in oklch, oklch(0.55 0.05 220) 15%, transparent)",
                            color: u.role === "admin" ? "var(--ow-amber)" : "var(--ow-text-hi)",
                            border: `1px solid ${u.role === "admin" ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
                            borderRadius: 3,
                            fontWeight: 700,
                            textTransform: "uppercase",
                            letterSpacing: "0.06em",
                          }}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
                        {fmtDateTime(u.createdAt)}
                      </td>
                      <td style={{ padding: "10px 12px", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
                        {path}
                      </td>
                      <td style={{ padding: "10px 12px", textAlign: "right" }}>
                        <button
                          data-testid={`resend-magic-${u.id}`}
                          onClick={() => resendLink(u.email)}
                          disabled={rs === "sending"}
                          title={`Send a fresh magic-link to ${u.email} — bypasses the public 3/hr rate-limit`}
                          style={{ padding: "4px 10px", background: rs === "sent" ? "#16a34a" : "transparent", color: rs === "sent" ? "oklch(0.10 0.008 60)" : "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: rs === "sending" ? "wait" : "pointer", marginRight: 6 }}
                        >
                          {rs === "sending" ? "Sending…" : rs === "sent" ? "✓ Sent" : "Send fresh link"}
                        </button>
                        <button
                          data-testid={`expand-user-${u.id}`}
                          onClick={() => setExpanded(isExpanded ? null : u.email)}
                          style={{ padding: "4px 10px", background: "transparent", color: "var(--ow-text-hi)", border: "1px solid var(--ow-border)", borderRadius: 3, fontSize: "0.75rem", cursor: "pointer" }}
                        >
                          {isExpanded ? "Hide" : "Tokens"}
                        </button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr key={`${u.id}-tokens`} data-testid={`token-panel-${u.id}`}>
                        <td colSpan={6} style={{ padding: "0 12px 16px", background: "color-mix(in oklch, var(--ow-bg-card) 60%, transparent)" }}>
                          <TokenPanel email={u.email} />
                        </td>
                      </tr>
                    )}
                  </>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ padding: "0 24px 40px", fontSize: "0.75rem", color: "var(--ow-text-lo)", lineHeight: 1.55 }}>
        <p style={{ margin: 0 }}>
          Note: role changes are driven by the <code>ADMIN_EMAILS</code> env var (comma-separated). Adding an email there
          promotes it on next login. To demote someone, remove their email and either wait for their next login or manually
          flip <code>users.role</code> in the DB. Never delete a user row — cellar logs, invoices, and content ownership FK
          back to it.
        </p>
      </div>
    </div>
  );
}

function TokenPanel({ email }: { email: string }) {
  const { data, isLoading, refetch } = trpc.adminUsers.recentLoginTokens.useQuery({ email });
  return (
    <div style={{ padding: "12px 4px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 8 }}>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "var(--ow-text-mid)", textTransform: "uppercase", letterSpacing: "0.08em" }}>Last 10 magic-link tokens</p>
        <button onClick={() => refetch()} style={{ fontSize: "0.7rem", color: "var(--ow-text-mid)", background: "transparent", border: "none", cursor: "pointer", textDecoration: "underline" }}>refresh</button>
      </div>
      {isLoading ? (
        <p style={{ color: "var(--ow-text-lo)", fontSize: "0.8rem", margin: 0 }}>Loading…</p>
      ) : !data?.tokens?.length ? (
        <p style={{ color: "var(--ow-text-lo)", fontSize: "0.8rem", margin: 0 }}>No tokens issued yet — send them a link with the button above.</p>
      ) : (
        <table style={{ width: "100%", fontSize: "0.78rem", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ textAlign: "left", color: "var(--ow-text-lo)" }}>
              <th style={{ padding: "4px 8px" }}>Issued</th>
              <th style={{ padding: "4px 8px" }}>Expires</th>
              <th style={{ padding: "4px 8px" }}>Consumed</th>
              <th style={{ padding: "4px 8px" }}>Status</th>
              <th style={{ padding: "4px 8px" }}>Requested from</th>
            </tr>
          </thead>
          <tbody>
            {data.tokens.map((t) => (
              <tr key={t.id} style={{ borderTop: "1px solid var(--ow-border)" }}>
                <td style={{ padding: "4px 8px" }}>{fmtDateTime(t.createdAt)}</td>
                <td style={{ padding: "4px 8px" }}>{fmtDateTime(t.expiresAt)}</td>
                <td style={{ padding: "4px 8px" }}>{fmtDateTime(t.consumedAt)}</td>
                <td style={{ padding: "4px 8px" }}>
                  <span style={{
                    color: t.status === "consumed" ? "#16a34a" : t.status === "expired" ? "var(--ow-text-lo)" : "var(--ow-amber)",
                    fontWeight: 600,
                  }}>
                    {t.status}
                  </span>
                </td>
                <td style={{ padding: "4px 8px", color: "var(--ow-text-lo)", fontFamily: "monospace" }}>{t.requestIp || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
