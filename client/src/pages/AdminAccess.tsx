import { Link, useLocation, useSearch } from "wouter";
import { ArrowLeft } from "lucide-react";
import AdminMembers from "./AdminMembers";
import AdminGateInvites from "./AdminGateInvites";

const TABS = [
  { id: "members", label: "Members", hint: "Who has access, their progress, pause or remove" },
  { id: "invites", label: "Invite links", hint: "Personal /i/ links for testers and prospects" },
];

// One Access page for the shared gate_invites list (was /admin/members + /admin/gate-invites).
export default function AdminAccess() {
  const tab = new URLSearchParams(useSearch()).get("tab") === "invites" ? "invites" : "members";
  const [, navigate] = useLocation();
  return (
    <div className="min-h-screen bg-[var(--ow-bg-base)]" data-testid="admin-access-page">
      <div className="mx-auto max-w-6xl px-4 pt-8 sm:px-6">
        <Link href="/admin" className="mb-3 inline-flex items-center gap-1.5 text-sm text-[var(--ow-amber)]" data-testid="access-back"><ArrowLeft className="h-4 w-4" /> Admin</Link>
        <h1 className="font-['Fraunces',serif] text-4xl text-[var(--ow-text-hi)]">Access</h1>
        <div className="mt-5 flex flex-wrap gap-2 border-b border-[var(--ow-border)] pb-3" role="tablist">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => navigate(`/admin/access?tab=${t.id}`)} data-testid={`access-tab-${t.id}`}
              className={`rounded-full border px-3.5 py-1.5 text-sm transition-colors ${tab === t.id ? "border-[var(--ow-amber)] bg-[var(--ow-amber)] text-[var(--ow-bg-base)]" : "border-[var(--ow-border-md)] text-[var(--ow-text-mid)] hover:border-[var(--ow-amber)]"}`}>
              {t.label}
            </button>
          ))}
          <span className="self-center text-xs text-[var(--ow-text-lo)]">{TABS.find((t) => t.id === tab)?.hint}</span>
        </div>
      </div>
      {tab === "members" ? <AdminMembers embedded /> : <AdminGateInvites embedded />}
    </div>
  );
}
