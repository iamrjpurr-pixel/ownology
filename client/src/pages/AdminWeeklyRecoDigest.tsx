/**
 * /admin/digests/weekly-reco — Feb 2026
 * Preview + approve + send the weekly Aus-wine digest.
 */
import { useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

const sectionPanel: React.CSSProperties = {
  background: "var(--ow-bg-card)",
  border: "1px solid var(--ow-border)",
  borderTop: "2px solid color-mix(in oklch, var(--ow-amber) 55%, transparent)",
  borderRadius: 6,
  padding: "1rem 1.15rem",
};
const eyebrow: React.CSSProperties = {
  fontFamily: "'Lato',sans-serif", fontSize: 11, letterSpacing: "0.14em",
  textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0,
};

export default function AdminWeeklyRecoDigest() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [slugOverride, setSlugOverride] = useState<string | undefined>();
  const draft = trpc.weeklyRecoDigest.previewDraft.useQuery({ weekOffset, slugOverride });
  const subs = trpc.weeklyRecoDigest.subscribers.useQuery();
  const history = trpc.weeklyRecoDigest.history.useQuery();
  const sendMutation = trpc.weeklyRecoDigest.send.useMutation();
  const [bulkText, setBulkText] = useState("");
  const bulkAdd = trpc.weeklyRecoDigest.bulkAdd.useMutation();

  async function handleSend() {
    if (!draft.data) return;
    const confirmMsg = `Send this week's digest (${draft.data.weekOf}: ${draft.data.wine.variety}) to ${subs.data?.active.length ?? 0} subscribers?`;
    if (!confirm(confirmMsg)) return;
    try {
      const r = await sendMutation.mutateAsync({ weekOf: draft.data.weekOf, slug: draft.data.chosenSlug, html: draft.data.html });
      alert(`Sent to ${r.sent}. Failed: ${r.failed}.`);
      history.refetch();
      draft.refetch();
    } catch (e) {
      alert("Send failed: " + (e instanceof Error ? e.message : String(e)));
    }
  }

  async function handleBulkAdd() {
    const emails = bulkText.split(/[\s,;\n]+/).map((s) => s.trim()).filter((s) => /@/.test(s));
    if (emails.length === 0) { alert("No valid emails found."); return; }
    if (!confirm(`Add ${emails.length} emails as weekly-reco subscribers?`)) return;
    const r = await bulkAdd.mutateAsync({ emails });
    alert(`Added: ${r.added}. Already existed: ${r.skipped}.`);
    setBulkText("");
    subs.refetch();
  }

  return (
    <div style={{ background: "var(--ow-bg-base)", minHeight: "100dvh", padding: "2rem 1.5rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>
        <OwnologyLogo />
        <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.8rem", color: "var(--ow-text-hi)", margin: "1rem 0 0.5rem" }}>Weekly Reco Digest</h1>
        <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-mid)", margin: "0 0 1.5rem", fontSize: "0.9rem" }}>
          Preview → approve → send. Seasonal picks rotate through the quiz catalogue with 90-day no-repeat guard.
        </p>

        {/* Subscriber summary */}
        <div style={{ ...sectionPanel, marginBottom: "1rem" }} data-testid="digest-subs-panel">
          <p style={eyebrow}>Subscribers</p>
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "2rem", margin: "0.4rem 0 0", color: "var(--ow-text-hi)" }}>
            {subs.data?.active.length ?? "…"} <span style={{ fontSize: "0.9rem", color: "var(--ow-text-lo)" }}>active</span>
            <span style={{ marginLeft: 18, fontSize: "0.9rem", color: "var(--ow-text-lo)" }}>· {subs.data?.inactive.length ?? 0} unsubscribed</span>
          </p>
          <details style={{ marginTop: 12 }}>
            <summary style={{ cursor: "pointer", fontSize: "0.82rem", color: "var(--ow-amber)" }}>Bulk-add from paste →</summary>
            <textarea value={bulkText} onChange={(e) => setBulkText(e.target.value)} placeholder="Paste emails separated by commas, spaces, or new lines" style={{ width: "100%", minHeight: 80, marginTop: 8, padding: 8, background: "var(--ow-bg-base)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)", borderRadius: 4, fontFamily: "'JetBrains Mono',monospace", fontSize: "0.82rem" }} />
            <button onClick={handleBulkAdd} disabled={bulkAdd.isPending} data-testid="digest-bulk-add" style={{ marginTop: 6, padding: "5px 14px", background: "var(--ow-amber)", color: "#000", border: "none", borderRadius: 3, fontWeight: 700, fontSize: "0.78rem", cursor: "pointer" }}>
              {bulkAdd.isPending ? "Adding…" : "Add subscribers"}
            </button>
          </details>
        </div>

        {/* Draft preview */}
        <div style={{ ...sectionPanel, marginBottom: "1rem" }} data-testid="digest-draft-panel">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 12 }}>
            <p style={eyebrow}>Draft · {draft.data?.weekOf ?? "…"} · {draft.data?.monthName}</p>
            <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
              <button onClick={() => setWeekOffset(weekOffset - 1)} style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", borderRadius: 3, cursor: "pointer", fontSize: "0.78rem" }}>← Prev</button>
              <button onClick={() => setWeekOffset(0)} style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", borderRadius: 3, cursor: "pointer", fontSize: "0.78rem" }}>This week</button>
              <button onClick={() => setWeekOffset(weekOffset + 1)} style={{ padding: "3px 10px", background: "transparent", color: "var(--ow-text-mid)", border: "1px solid var(--ow-border)", borderRadius: 3, cursor: "pointer", fontSize: "0.78rem" }}>Next →</button>
            </div>
          </div>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "var(--ow-text-mid)", fontStyle: "italic", margin: "6px 0 8px" }}>{draft.data?.theme}</p>
          {draft.data?.alreadySent && (
            <p style={{ background: "color-mix(in oklch, #dc2626 12%, transparent)", color: "#dc2626", padding: 8, borderRadius: 4, fontSize: "0.82rem", fontWeight: 600 }}>
              ⚠ This week&#39;s digest was already sent.
            </p>
          )}
          {draft.data && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 8 }}>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>Pick override</label>
                <select value={draft.data.chosenSlug} onChange={(e) => setSlugOverride(e.target.value)} style={{ display: "block", width: "100%", padding: 6, marginTop: 4, background: "var(--ow-bg-base)", border: "1px solid var(--ow-border)", color: "var(--ow-text-hi)", borderRadius: 3, fontSize: "0.85rem" }} data-testid="digest-pick-select">
                  {draft.data.rotationCatalogue.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label style={{ fontSize: "0.76rem", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>Winning pick</label>
                <p style={{ margin: "4px 0 0", fontFamily: "'Fraunces',serif", color: "var(--ow-text-hi)", fontSize: "0.98rem" }}>{draft.data.wine.variety} · {draft.data.wine.region}</p>
              </div>
            </div>
          )}
          <iframe title="Digest preview" srcDoc={draft.data?.html} style={{ width: "100%", height: 640, marginTop: 14, background: "#f4efe7", border: "1px solid var(--ow-border)", borderRadius: 4 }} data-testid="digest-preview-iframe" />
          <button onClick={handleSend} disabled={sendMutation.isPending || draft.data?.alreadySent || !subs.data?.active.length} data-testid="digest-send-btn" style={{ marginTop: 14, padding: "10px 18px", background: draft.data?.alreadySent ? "var(--ow-border)" : "var(--ow-amber)", color: "#000", border: "none", borderRadius: 4, fontWeight: 700, fontSize: "0.9rem", cursor: draft.data?.alreadySent ? "not-allowed" : "pointer" }}>
            {sendMutation.isPending ? "Sending…" : draft.data?.alreadySent ? "Already sent" : `Send to ${subs.data?.active.length ?? 0} subscribers →`}
          </button>
        </div>

        {/* Send history */}
        <div style={sectionPanel} data-testid="digest-history-panel">
          <p style={eyebrow}>Send history (last 52 weeks)</p>
          <table style={{ width: "100%", marginTop: 10, borderCollapse: "collapse", fontSize: "0.82rem", fontFamily: "'Lato',sans-serif" }}>
            <thead>
              <tr style={{ color: "var(--ow-text-lo)", textAlign: "left" }}>
                <th style={{ padding: "4px 8px" }}>Week</th><th style={{ padding: "4px 8px" }}>Pick</th><th style={{ padding: "4px 8px" }}>Sent to</th><th style={{ padding: "4px 8px" }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {(history.data ?? []).map((h) => (
                <tr key={h.id} style={{ borderTop: "1px solid var(--ow-border)", color: "var(--ow-text-mid)" }}>
                  <td style={{ padding: "6px 8px", fontFamily: "'JetBrains Mono',monospace" }}>{h.weekOf}</td>
                  <td style={{ padding: "6px 8px", color: "var(--ow-text-hi)" }}>{h.pickSlug}</td>
                  <td style={{ padding: "6px 8px" }}>{h.recipientCount}</td>
                  <td style={{ padding: "6px 8px" }}>{new Date(h.sentAt).toLocaleString("en-AU", { day: "2-digit", month: "short", year: "numeric" })}</td>
                </tr>
              ))}
              {(history.data ?? []).length === 0 && (
                <tr><td colSpan={4} style={{ padding: 16, color: "var(--ow-text-lo)", fontStyle: "italic", textAlign: "center" }}>No digests sent yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
