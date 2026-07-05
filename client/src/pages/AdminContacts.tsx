/**
 * /admin/contacts — owner-only outreach pipeline.
 *
 * Workflow: paste a winemaker's details → get a /hi/:slug landing-page URL
 * + an SMS draft ready to copy & send. Tracks who opened the link and who
 * booked a demo.
 */
import { useMemo, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const PREVIEW_BASE = typeof window !== "undefined" ? window.location.origin : "";

function fmtAgo(ms: number | null | undefined): string {
  if (!ms) return "—";
  const diff = Date.now() - ms;
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

/**
 * Deep-research and URL-quick-add flows stash extra channels
 * (Instagram, LinkedIn, email, website) into `notes` as a "Label: value · "
 * separated list. Parse them back out so we can render each as a
 * distinct chip on the contact row.
 */
function extractChannels(notes: string | null | undefined): {
  instagram: string | null;
  instagramPersonal: string | null;
  linkedin: string | null;
  email: string | null;
  website: string | null;
} {
  if (!notes) return { instagram: null, instagramPersonal: null, linkedin: null, email: null, website: null };
  // "IG-personal:" MUST match before the generic "IG:" — same prefix.
  const igPersonalMatch = notes.match(/IG-personal:\s*@?([A-Za-z0-9_.]+)/i);
  // Match the winery IG but exclude the "IG-personal:" prefix collision.
  const igMatch = notes.match(/(?<!IG-personal:\s*)(?<![A-Za-z-])IG:\s*@?([A-Za-z0-9_.]+)/i);
  const liMatch = notes.match(/LinkedIn:\s*([^\s·|]+)/i);
  const emMatch = notes.match(/Email:\s*([^\s·|]+@[^\s·|]+)/i);
  const wbMatch = notes.match(/Web:\s*([^\s·|]+)/i);
  return {
    instagram: igMatch?.[1] ?? null,
    instagramPersonal: igPersonalMatch?.[1] ?? null,
    linkedin: liMatch?.[1] ?? null,
    email: emMatch?.[1] ?? null,
    website: wbMatch?.[1] ?? null,
  };
}

function smsDraft(c: { firstName: string; winery?: string | null; event?: string | null; painPoint?: string | null; slug: string }): string {
  const where = c.event ? `at ${c.event}` : "the other day";
  const url = `${PREVIEW_BASE}/hi/${c.slug}`;
  if (c.painPoint) {
    const wineryBit = c.winery ? ` (${c.winery})` : "";
    return `G'day ${c.firstName} — we crossed paths ${where}${wineryBit}. You mentioned ${c.painPoint}; I've since built a cellar AI that answers exactly that, grounded in your own vintage logs. 90 sec look: ${url} — Jamie`;
  }
  // Honest cold-contact version — no faux familiarity
  const wineryBit = c.winery ? `, sending this to ${c.winery} too` : "";
  return `G'day ${c.firstName} — we crossed paths ${where}${wineryBit}. I've since built a cellar AI grounded in your own vintage logs — figured you might find it useful. 90 sec look: ${url} — Jamie`;
}

type ContactStatus = "warm" | "lukewarm" | "cold" | "sales" | "skip";

const STATUS_OPTIONS: { value: ContactStatus; label: string; color: string }[] = [
  { value: "warm",     label: "Warm",     color: "#16a34a" },
  { value: "lukewarm", label: "Lukewarm", color: "#ca8a04" },
  { value: "cold",     label: "Cold",     color: "#6b7280" },
  { value: "sales",    label: "Sales/Vendor", color: "#7c3aed" },
  { value: "skip",     label: "Skip",     color: "#9ca3af" },
];

const STATUS_META: Record<ContactStatus, { label: string; color: string }> = Object.fromEntries(
  STATUS_OPTIONS.map((o) => [o.value, { label: o.label, color: o.color }])
) as Record<ContactStatus, { label: string; color: string }>;

export default function AdminContacts() {
  const utils = trpc.useUtils();
  // Disable auto-refetch on window focus. tRPC's react-query defaults refetch
  // every time the tab gets focus — with an SMS-editor open, a mid-typed draft
  // in the Add form, or the voice recorder mid-recording, the refetch resets
  // component state and looks/feels like the page is "refreshing". Owner
  // manually pulls fresh data via a Refresh button below.
  const { data, isLoading, refetch } = trpc.outreach.list.useQuery(undefined, {
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    refetchOnMount: false,
    staleTime: 60_000, // 1 min — the pipeline changes are user-driven, not real-time
  });
  const createMutation = trpc.outreach.create.useMutation();
  const parseFromVoiceMutation = trpc.outreach.parseFromVoice.useMutation();
  const parseFromUrlMutation = trpc.outreach.parseFromUrl.useMutation();
  const deepResearchMutation = trpc.outreach.deepResearch.useMutation();
  const markSmsSentMutation = trpc.outreach.markSmsSent.useMutation();
  const markBookedMutation = trpc.outreach.markBooked.useMutation();
  const setStatusMutation = trpc.outreach.setStatus.useMutation();
  const setSmsDraftMutation = trpc.outreach.setSmsDraft.useMutation();
  const setNotesMutation = trpc.outreach.setNotes.useMutation();
  const removeMutation = trpc.outreach.remove.useMutation();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    mobileAu: "",
    winery: "",
    event: "",
    painPoint: "",
    calendlyOverride: "",
    notes: "",
  });
  const [err, setErr] = useState<string | null>(null);
  const [copyState, setCopyState] = useState<Record<string, "url" | "sms" | null>>({});
  const [statusFilter, setStatusFilter] = useState<ContactStatus | "all">("all");
  const [urlQuickAdd, setUrlQuickAdd] = useState("");
  const [urlErr, setUrlErr] = useState<string | null>(null);
  const [urlLastFetched, setUrlLastFetched] = useState<string | null>(null);
  const [deepSearchName, setDeepSearchName] = useState("");
  const [deepSearchErr, setDeepSearchErr] = useState<string | null>(null);
  const [deepSearchCitations, setDeepSearchCitations] = useState<string[]>([]);
  const [deepSearchConfidence, setDeepSearchConfidence] = useState<string | null>(null);
  const [deepSearchEmailGuesses, setDeepSearchEmailGuesses] = useState<string[]>([]);
  const [editingNotes, setEditingNotes] = useState<string | null>(null); // slug being edited
  const [notesBuffer, setNotesBuffer] = useState("");

  const allContacts = useMemo(() => data?.contacts ?? [], [data]);
  const contacts = useMemo(() => {
    if (statusFilter === "all") return allContacts;
    return allContacts.filter((c) => (c.status ?? "cold") === statusFilter);
  }, [allContacts, statusFilter]);

  const statusCounts = useMemo(() => {
    const counts: Record<ContactStatus, number> = { warm: 0, lukewarm: 0, cold: 0, sales: 0, skip: 0 };
    for (const c of allContacts) {
      const s = (c.status ?? "cold") as ContactStatus;
      if (counts[s] !== undefined) counts[s]++;
    }
    return counts;
  }, [allContacts]);

  const stats = useMemo(() => {
    // KPIs are computed over the FULL list (not the filtered view) so the
    // headline numbers stay stable as the operator clicks filter chips.
    const total = allContacts.length;
    const sent = allContacts.filter((c) => c.smsSentAt).length;
    const opened = allContacts.filter((c) => (c.viewCount ?? 0) > 0).length;
    const booked = allContacts.filter((c) => c.demoBookedAt).length;
    return { total, sent, opened, booked };
  }, [allContacts]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!form.firstName.trim()) {
      setErr("First name is required.");
      return;
    }
    try {
      await createMutation.mutateAsync(form);
      setForm({ firstName: "", lastName: "", mobileAu: "", winery: "", event: form.event, painPoint: "", calendlyOverride: form.calendlyOverride, notes: "" });
      utils.outreach.list.invalidate();
    } catch (e2) {
      setErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  // ── Deep research from just a name ─────────────────────────────────────
  // Perplexity Sonar-Pro multi-hop web research. Same review-then-Save UX
  // as the URL flow, but the input is just the business name.
  async function handleDeepSearch(e: React.FormEvent) {
    e.preventDefault();
    setDeepSearchErr(null);
    setDeepSearchCitations([]);
    setDeepSearchConfidence(null);
    setDeepSearchEmailGuesses([]);
    const name = deepSearchName.trim();
    if (!name || name.length < 2) {
      setDeepSearchErr("Enter a winery or business name (2+ characters).");
      return;
    }
    try {
      const result = await deepResearchMutation.mutateAsync({ businessName: name });
      if (!result.draft || !result.draft.firstName) {
        setDeepSearchErr("Perplexity couldn't confirm a contact for that name. Try adding the region (e.g. 'Les Fruits Adelaide Hills') or paste a direct URL instead.");
        setDeepSearchCitations(result.citations || []);
        return;
      }
      const d = result.draft as Record<string, unknown>;
      // Merge extras that don't map to form fields into notes.
      const extras: string[] = [];
      if (typeof d.email === "string" && d.email) extras.push(`Email: ${d.email}`);
      if (typeof d.instagram === "string" && d.instagram) extras.push(`IG: @${d.instagram}`);
      if (typeof d.instagramPersonal === "string" && d.instagramPersonal) extras.push(`IG-personal: @${d.instagramPersonal}`);
      if (typeof d.linkedin === "string" && d.linkedin) extras.push(`LinkedIn: ${d.linkedin}`);
      if (typeof d.website === "string" && d.website) extras.push(`Web: ${d.website}`);
      if (typeof d.address === "string" && d.address) extras.push(`Addr: ${d.address}`);
      if (typeof d.role === "string" && d.role) extras.push(`Role: ${d.role}`);
      if (typeof d.region === "string" && d.region) extras.push(`Region: ${d.region}`);
      const notesBase = typeof d.notes === "string" ? d.notes : "";
      const combinedNotes = [notesBase, ...extras].filter(Boolean).join(" · ");

      setForm({
        firstName: typeof d.firstName === "string" ? d.firstName : "",
        lastName: typeof d.lastName === "string" ? d.lastName : "",
        mobileAu: typeof d.mobileAu === "string" ? d.mobileAu : "",
        winery: typeof d.winery === "string" ? d.winery : "",
        event: form.event,
        painPoint: typeof d.painPoint === "string" ? d.painPoint : "",
        calendlyOverride: form.calendlyOverride,
        notes: combinedNotes,
      });
      setDeepSearchCitations(result.citations || []);
      setDeepSearchConfidence(typeof d.confidence === "string" ? d.confidence : null);
      setDeepSearchEmailGuesses(result.emailGuesses || []);
      setDeepSearchName("");
    } catch (e2) {
      setDeepSearchErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  // ── URL Quick-Add ─────────────────────────────────────────────────────
  // Paste a URL (winery site, Google Business listing, LinkedIn, Instagram)
  // and we fetch + extract → pre-fills the Add form below. User reviews and
  // taps Save. Zero-keyboard prospecting.
  async function handleUrlQuickAdd(e: React.FormEvent) {
    e.preventDefault();
    setUrlErr(null);
    const url = urlQuickAdd.trim();
    if (!url) {
      setUrlErr("Paste a URL to fetch from.");
      return;
    }
    // Search-engine guard — Google/DDG/Bing all bot-detect server fetches
    // and return CAPTCHAs. Save the user a wasted round-trip.
    try {
      const host = new URL(url).hostname.toLowerCase();
      const searchHosts = [
        "google.com", "www.google.com", "google.com.au",
        "duckduckgo.com", "html.duckduckgo.com",
        "bing.com", "www.bing.com",
        "search.yahoo.com", "yahoo.com",
      ];
      if (searchHosts.some((h) => host === h || host.endsWith(`.${h}`))) {
        setUrlErr("That's a search-results page — search engines block server-side scrapers with CAPTCHAs. Click through to the actual site (the top result), then paste that URL.");
        return;
      }
    } catch { /* invalid URL — let the server give the error message */ }
    try {
      const result = await parseFromUrlMutation.mutateAsync({ url });
      if (!result.draft || !result.draft.firstName) {
        setUrlErr("Couldn't find contact details on that page. Try one with a phone, email, or a named contact person.");
        return;
      }
      const d = result.draft as Record<string, unknown>;
      // Extras that don't map to form fields go into notes so nothing is lost.
      const extras: string[] = [];
      if (typeof d.email === "string" && d.email) extras.push(`Email: ${d.email}`);
      if (typeof d.instagram === "string" && d.instagram) extras.push(`IG: @${d.instagram}`);
      if (typeof d.website === "string" && d.website) extras.push(`Web: ${d.website}`);
      const notesBase = typeof d.notes === "string" ? d.notes : "";
      const combinedNotes = [notesBase, ...extras].filter(Boolean).join(" · ");

      setForm({
        firstName: typeof d.firstName === "string" ? d.firstName : "",
        lastName: typeof d.lastName === "string" ? d.lastName : "",
        mobileAu: typeof d.mobileAu === "string" ? d.mobileAu : "",
        winery: typeof d.winery === "string" ? d.winery : "",
        event: typeof d.event === "string" ? d.event : form.event,
        painPoint: typeof d.painPoint === "string" ? d.painPoint : "",
        calendlyOverride: form.calendlyOverride,
        notes: combinedNotes,
      });
      setUrlLastFetched(url);
      setUrlQuickAdd("");
    } catch (e2) {
      setUrlErr(e2 instanceof Error ? e2.message : String(e2));
    }
  }

  async function copy(slug: string, kind: "url" | "sms", text: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopyState((s) => ({ ...s, [slug]: kind }));
      setTimeout(() => setCopyState((s) => ({ ...s, [slug]: null })), 1600);
    } catch {
      window.prompt("Copy:", text);
    }
  }

  return (
    <div data-testid="admin-contacts-page" className="container py-8" style={{ maxWidth: 1100 }}>
      <div className="mb-6">
        <Link href="/admin" style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em" }}>
          ← Back to Admin hub
        </Link>
        <p className="text-xs uppercase tracking-widest mt-3" style={{ color: "var(--ow-amber)" }}>
          Outreach pipeline
        </p>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 className="text-3xl font-semibold mt-1" style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces',serif" }}>
              Personal SMS contacts
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--ow-text-mid)", maxWidth: 720 }}>
              Add a winemaker from your event notes → get a personalised <code>/hi/&lt;slug&gt;</code> URL + ready-to-send SMS draft. Track who opened the link and who booked a demo.
            </p>
          </div>
          <Link
            href="/admin/contacts/pipeline"
            data-testid="link-to-pipeline"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              fontWeight: 700,
              letterSpacing: "0.04em",
              padding: "8px 14px",
              border: "1px solid var(--ow-amber)",
              borderRadius: 6,
              color: "var(--ow-amber)",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            Pipeline board →
          </Link>
        </div>
      </div>

      {/* Headline stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <Kpi label="Contacts" value={stats.total} testid="contacts-kpi-total" />
        <Kpi label="SMS sent" value={stats.sent} testid="contacts-kpi-sent" />
        <Kpi label="Opened link" value={stats.opened} testid="contacts-kpi-opened" />
        <Kpi label="Demo booked" value={stats.booked} testid="contacts-kpi-booked" />
      </div>

      {/* A/B CTA stats — book demo vs reply RED */}
      <CtaAbCard />

      {/* Triage filter chips */}
      <div className="flex flex-wrap gap-2 mb-6" data-testid="status-filter-bar">
        <FilterChip
          label={`All (${allContacts.length})`}
          active={statusFilter === "all"}
          color="#b45309"
          onClick={() => setStatusFilter("all")}
          testid="filter-all"
        />
        {STATUS_OPTIONS.map((s) => (
          <FilterChip
            key={s.value}
            label={`${s.label} (${statusCounts[s.value]})`}
            active={statusFilter === s.value}
            color={s.color}
            onClick={() => setStatusFilter(s.value)}
            testid={`filter-${s.value}`}
          />
        ))}
      </div>

      {/* Deep Research from a name — Perplexity Sonar-Pro multi-hop research */}
      <form
        onSubmit={handleDeepSearch}
        className="mb-3 rounded p-4"
        data-testid="deep-research-panel"
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
          border: "1.5px solid color-mix(in oklch, var(--ow-amber) 55%, transparent)",
        }}
      >
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)" }}>
            Deep research — just a name
          </p>
          <p className="text-xs" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>
            Perplexity Sonar · ~15–30s · &lt; 1¢ per lookup
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={deepSearchName}
            onChange={(e) => setDeepSearchName(e.target.value)}
            placeholder="e.g. Les Fruits Adelaide Hills"
            disabled={deepResearchMutation.isPending}
            data-testid="deep-research-input"
            style={{
              flex: 1,
              padding: "0.6rem 0.8rem",
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              color: "var(--ow-text-hi)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.9rem",
            }}
          />
          <button
            type="submit"
            disabled={deepResearchMutation.isPending || deepSearchName.trim().length < 2}
            data-testid="deep-research-btn"
            style={{
              padding: "0.6rem 1.2rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: deepResearchMutation.isPending ? "wait" : "pointer",
              opacity: deepResearchMutation.isPending || deepSearchName.trim().length < 2 ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {deepResearchMutation.isPending ? "Researching…" : "Research →"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", lineHeight: 1.5 }}>
          Type any winery / winemaker name and we&apos;ll deep-search the web for their contact details, painpoint, and role.
          Adding the region (Adelaide Hills, McLaren Vale) improves accuracy.
        </p>
        {deepSearchErr && (
          <p data-testid="deep-research-error" style={{ marginTop: 8, color: "#b91c1c", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem" }}>
            {deepSearchErr}
          </p>
        )}
        {deepSearchCitations.length > 0 && (
          <details
            data-testid="deep-research-citations"
            style={{ marginTop: 10, padding: "0.5rem 0.8rem", background: "var(--ow-bg-card)", borderRadius: 4, border: "1px solid var(--ow-border)" }}
          >
            <summary style={{ cursor: "pointer", fontSize: "0.78rem", color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif" }}>
              {deepSearchConfidence && (
                <span
                  style={{
                    display: "inline-block",
                    marginRight: 8,
                    padding: "0.1rem 0.5rem",
                    borderRadius: 3,
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    background:
                      deepSearchConfidence === "high" ? "#16a34a" :
                      deepSearchConfidence === "medium" ? "#ca8a04" : "#9ca3af",
                    color: "white",
                  }}
                >
                  {deepSearchConfidence} confidence
                </span>
              )}
              {deepSearchCitations.length} source{deepSearchCitations.length === 1 ? "" : "s"} — tap to verify before saving
            </summary>
            <ul style={{ margin: "0.6rem 0 0", padding: "0 0 0 1.2rem", fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", lineHeight: 1.7 }}>
              {deepSearchCitations.map((c, i) => (
                <li key={i}>
                  <a href={c} target="_blank" rel="noreferrer" style={{ color: "var(--ow-amber)", textDecoration: "underline" }}>
                    {c.length > 90 ? c.slice(0, 90) + "…" : c}
                  </a>
                </li>
              ))}
            </ul>
          </details>
        )}
        {deepSearchEmailGuesses.length > 0 && (
          <div
            data-testid="deep-research-email-guesses"
            style={{ marginTop: 10, padding: "0.6rem 0.8rem", background: "var(--ow-bg-card)", borderRadius: 4, border: "1px solid var(--ow-border)" }}
          >
            <p style={{ fontSize: "0.72rem", color: "var(--ow-amber)", letterSpacing: "0.08em", textTransform: "uppercase", fontWeight: 700, fontFamily: "'Lato',sans-serif", margin: "0 0 6px" }}>
              Email pattern guesses — try in order
            </p>
            <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", lineHeight: 1.5, margin: "0 0 8px" }}>
              Unverified — send a quick test to the first one; watch for a bounce or reply. Small AU businesses use these patterns ~80% of the time.
            </p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
              {deepSearchEmailGuesses.map((email) => (
                <button
                  key={email}
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(email).catch(() => {});
                  }}
                  data-testid={`deep-research-email-${email}`}
                  title="Copy to clipboard"
                  style={{
                    padding: "0.3rem 0.55rem",
                    background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)",
                    borderRadius: 3,
                    color: "var(--ow-text-hi)",
                    fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                    fontSize: "0.72rem",
                    cursor: "pointer",
                  }}
                >
                  {email}
                </button>
              ))}
            </div>
          </div>
        )}
      </form>
      <form
        onSubmit={handleUrlQuickAdd}
        className="mb-4 rounded p-4"
        data-testid="url-quickadd-panel"
        style={{
          background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
        }}
      >
        <div className="flex items-baseline justify-between mb-2">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-amber)" }}>
            Quick-add from a URL
          </p>
          <p className="text-xs" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}>
            Winery site · LinkedIn · Instagram · Google Business
          </p>
        </div>
        <div className="flex gap-2">
          <input
            type="url"
            value={urlQuickAdd}
            onChange={(e) => setUrlQuickAdd(e.target.value)}
            placeholder="https://www.brokenwood.com.au/contact"
            disabled={parseFromUrlMutation.isPending}
            data-testid="url-quickadd-input"
            style={{
              flex: 1,
              padding: "0.6rem 0.8rem",
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              color: "var(--ow-text-hi)",
              fontFamily: "'JetBrains Mono', ui-monospace, monospace",
              fontSize: "0.85rem",
            }}
          />
          <button
            type="submit"
            disabled={parseFromUrlMutation.isPending || !urlQuickAdd.trim()}
            data-testid="url-quickadd-fetch-btn"
            style={{
              padding: "0.6rem 1.2rem",
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: 4,
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.82rem",
              cursor: parseFromUrlMutation.isPending ? "wait" : "pointer",
              opacity: parseFromUrlMutation.isPending || !urlQuickAdd.trim() ? 0.6 : 1,
              whiteSpace: "nowrap",
            }}
          >
            {parseFromUrlMutation.isPending ? "Fetching…" : "Fetch details →"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", lineHeight: 1.5 }}>
          We scrape phone, email, Instagram, address, and any named contact — then pre-fill the form below. You review and hit Save.
        </p>
        {urlErr && (
          <p data-testid="url-quickadd-error" style={{ marginTop: 8, color: "#b91c1c", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem" }}>
            {urlErr}
          </p>
        )}
        {urlLastFetched && !urlErr && !parseFromUrlMutation.isPending && (
          <p data-testid="url-quickadd-success" style={{ marginTop: 8, color: "#16a34a", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem" }}>
            ✓ Prefilled the form below from <code style={{ fontSize: "0.75rem" }}>{urlLastFetched.slice(0, 80)}</code>{urlLastFetched.length > 80 ? "…" : ""} — review, edit if needed, then Save.
          </p>
        )}
      </form>

      {/* Add form */}
      <form onSubmit={handleCreate} className="mb-8 rounded p-5" style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
        <p className="text-xs uppercase tracking-widest mb-3" style={{ color: "var(--ow-amber)" }}>Add contact</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="First name *" testid="form-firstName" value={form.firstName} onChange={(v) => setForm({ ...form, firstName: v })} />
          <Field label="Last name" testid="form-lastName" value={form.lastName} onChange={(v) => setForm({ ...form, lastName: v })} />
          <Field label="Mobile (AU)" placeholder="0412 345 678" testid="form-mobile" value={form.mobileAu} onChange={(v) => setForm({ ...form, mobileAu: v })} />
          <Field label="Winery" testid="form-winery" value={form.winery} onChange={(v) => setForm({ ...form, winery: v })} />
          <Field label="Event" placeholder="McLaren Vale 2025" testid="form-event" value={form.event} onChange={(v) => setForm({ ...form, event: v })} />
          <Field label="Calendly URL (optional override)" testid="form-calendly" value={form.calendlyOverride} onChange={(v) => setForm({ ...form, calendlyOverride: v })} />
        </div>
        <Field label="Pain point they mentioned" testid="form-pain" value={form.painPoint} placeholder="VA issues on Tank 9 last year" onChange={(v) => setForm({ ...form, painPoint: v })} />
        <Field label="Private notes" testid="form-notes" value={form.notes} onChange={(v) => setForm({ ...form, notes: v })} />
        {err && <p data-testid="form-error" style={{ color: "#b91c1c", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", marginTop: 8 }}>{err}</p>}
        <button
          type="submit"
          disabled={createMutation.isPending}
          data-testid="form-submit"
          style={{
            marginTop: 12,
            padding: "0.7rem 1.5rem",
            background: "var(--ow-amber)",
            color: "oklch(0.10 0.008 60)",
            fontFamily: "'Lato',sans-serif",
            fontWeight: 700,
            fontSize: "0.85rem",
            border: "none",
            borderRadius: 4,
            cursor: createMutation.isPending ? "wait" : "pointer",
            opacity: createMutation.isPending ? 0.6 : 1,
          }}
        >
          {createMutation.isPending ? "Saving…" : "Save contact"}
        </button>
      </form>

      {/* Table */}
      {isLoading && <p style={{ color: "var(--ow-text-mid)" }}>Loading…</p>}
      {!isLoading && contacts.length === 0 && (
        <p data-testid="contacts-empty" style={{ color: "var(--ow-text-lo)", fontStyle: "italic" }}>
          No contacts yet — add one above to generate your first SMS-ready landing page.
        </p>
      )}
      <div className="flex flex-col gap-3">
        {contacts.map((c) => {
          const url = `${PREVIEW_BASE}/hi/${c.slug}`;
          const templateSms = smsDraft({ firstName: c.firstName, winery: c.winery, event: c.event, painPoint: c.painPoint, slug: c.slug });
          const effectiveSms = c.smsDraftOverride ?? templateSms;
          const copied = copyState[c.slug];
          const status = ((c.status ?? "cold") as ContactStatus);
          const meta = STATUS_META[status] ?? STATUS_META.cold;
          const isSilent = status === "sales" || status === "skip";
          return (
            <div
              key={c.slug}
              data-testid={`contact-row-${c.slug}`}
              className="rounded p-4"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                opacity: isSilent ? 0.55 : 1,
              }}
            >
              <div className="flex items-baseline justify-between flex-wrap gap-2 mb-2">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", color: "var(--ow-text-hi)", margin: 0 }}>
                    {c.firstName} {c.lastName ?? ""}
                  </h3>
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", margin: "2px 0 6px" }}>
                    {c.winery ?? "—"} · {c.event ?? "—"}
                  </p>
                  {/* Mobile — front-and-centre so you can copy or call in one tap.
                      Falls back to a clear "no mobile" chip so missing numbers
                      are visually obvious across the pipeline. */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, alignItems: "center" }}>
                    {c.mobileAu ? (
                      <button
                        type="button"
                        data-testid={`mobile-chip-${c.slug}`}
                        onClick={() => copy(c.slug, "url", c.mobileAu!)}
                        title="Tap to copy · long-press on mobile to call"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: 6,
                          padding: "0.28rem 0.6rem",
                          background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
                          border: "1px solid color-mix(in oklch, var(--ow-amber) 45%, transparent)",
                          borderRadius: 4,
                          color: "var(--ow-text-hi)",
                          fontFamily: "'JetBrains Mono', ui-monospace, monospace",
                          fontSize: "0.86rem",
                          fontWeight: 600,
                          cursor: "pointer",
                        }}
                      >
                        📱 {c.mobileAu}
                      </button>
                    ) : (
                      <span
                        data-testid={`mobile-missing-${c.slug}`}
                        style={{
                          display: "inline-block",
                          padding: "0.28rem 0.6rem",
                          background: "color-mix(in oklch, white 4%, transparent)",
                          border: "1px dashed var(--ow-border)",
                          borderRadius: 4,
                          color: "var(--ow-text-lo)",
                          fontFamily: "'Lato',sans-serif",
                          fontSize: "0.75rem",
                          fontStyle: "italic",
                        }}
                      >
                        no mobile yet
                      </span>
                    )}
                    {(() => {
                      const ch = extractChannels(c.notes);
                      const chipStyle: React.CSSProperties = {
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "0.28rem 0.55rem",
                        background: "color-mix(in oklch, white 4%, transparent)",
                        border: "1px solid var(--ow-border)",
                        borderRadius: 4,
                        color: "var(--ow-text-hi)",
                        fontFamily: "'Lato',sans-serif",
                        fontSize: "0.78rem",
                        textDecoration: "none",
                        cursor: "pointer",
                      };
                      return (
                        <>
                          {ch.instagram && (
                            <a
                              href={`https://instagram.com/${ch.instagram}`}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`ig-chip-${c.slug}`}
                              style={chipStyle}
                              title={`Open @${ch.instagram} on Instagram · winery / business account`}
                            >
                              📷 @{ch.instagram}
                            </a>
                          )}
                          {ch.instagramPersonal && (
                            <a
                              href={`https://instagram.com/${ch.instagramPersonal}`}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`ig-personal-chip-${c.slug}`}
                              style={{
                                ...chipStyle,
                                background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
                                border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                              }}
                              title={`Open @${ch.instagramPersonal} · PERSONAL account · use only with a specific hook`}
                            >
                              📷 @{ch.instagramPersonal} · personal
                            </a>
                          )}
                          {ch.linkedin && (
                            <a
                              href={ch.linkedin.startsWith("http") ? ch.linkedin : `https://linkedin.com/in/${ch.linkedin}`}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`linkedin-chip-${c.slug}`}
                              style={chipStyle}
                              title="Open LinkedIn"
                            >
                              💼 LinkedIn
                            </a>
                          )}
                          {ch.email && (
                            <button
                              type="button"
                              data-testid={`email-chip-${c.slug}`}
                              onClick={() => copy(c.slug, "url", ch.email!)}
                              style={{ ...chipStyle, border: "1px solid var(--ow-border)" }}
                              title="Tap to copy email"
                            >
                              ✉ {ch.email}
                            </button>
                          )}
                          {ch.website && (
                            <a
                              href={ch.website.startsWith("http") ? ch.website : `https://${ch.website}`}
                              target="_blank"
                              rel="noreferrer"
                              data-testid={`web-chip-${c.slug}`}
                              style={chipStyle}
                              title="Open website"
                            >
                              🌐 site
                            </a>
                          )}
                          <button
                            type="button"
                            data-testid={`edit-notes-btn-${c.slug}`}
                            onClick={() => {
                              setEditingNotes(c.slug);
                              setNotesBuffer(c.notes ?? "");
                            }}
                            style={{
                              ...chipStyle,
                              background: "transparent",
                              border: "1px dashed var(--ow-border)",
                              color: "var(--ow-text-lo)",
                              fontSize: "0.72rem",
                            }}
                            title="Edit notes — add IG-personal: @handle, LinkedIn:, Email:, Web:, or free text"
                          >
                            ✏️ Edit
                          </button>
                        </>
                      );
                    })()}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>
                  <Pill color={meta.color}>{meta.label}</Pill>
                  <select
                    data-testid={`status-select-${c.slug}`}
                    value={status}
                    onChange={(e) =>
                      setStatusMutation.mutate(
                        { slug: c.slug, status: e.target.value as ContactStatus },
                        { onSuccess: () => utils.outreach.list.invalidate() }
                      )
                    }
                    style={{
                      padding: "4px 8px",
                      borderRadius: 4,
                      border: "1px solid var(--ow-border)",
                      background: "var(--ow-bg-card)",
                      color: "var(--ow-text-mid)",
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.72rem",
                      cursor: "pointer",
                    }}
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s.value} value={s.value}>{s.label}</option>
                    ))}
                  </select>
                  {c.smsSentAt && <Pill color="#6b7280">SMS sent {fmtAgo(c.smsSentAt)}</Pill>}
                  {(c.viewCount ?? 0) > 0 && <Pill color="#b45309">{c.viewCount} view{c.viewCount === 1 ? "" : "s"}</Pill>}
                  {c.demoBookedAt && <Pill color="#10b981">Booked {fmtAgo(c.demoBookedAt)}</Pill>}
                </div>
              </div>
              {/* Inline notes editor. Opens when user clicks ✏️ Edit chip.
                  Free-form textarea — user can add IG-personal:, LinkedIn:,
                  Email:, Web:, Addr: labels or any private prose. Notes
                  are the source-of-truth for the channel chips above. */}
              {editingNotes === c.slug && (
                <div
                  data-testid={`notes-editor-${c.slug}`}
                  style={{
                    marginTop: 6,
                    marginBottom: 10,
                    padding: 10,
                    background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)",
                    border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                    borderRadius: 4,
                  }}
                >
                  <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0 0 6px", lineHeight: 1.5 }}>
                    Free text plus channel labels. Recognised labels: <code>IG:</code>, <code>IG-personal:</code>, <code>LinkedIn:</code>, <code>Email:</code>, <code>Web:</code>, <code>Addr:</code>, <code>Role:</code>, <code>Region:</code>. Separate multiple with <code> · </code>.
                  </p>
                  <textarea
                    value={notesBuffer}
                    onChange={(e) => setNotesBuffer(e.target.value)}
                    rows={4}
                    data-testid={`notes-textarea-${c.slug}`}
                    style={{
                      width: "100%",
                      padding: "0.5rem 0.7rem",
                      background: "var(--ow-bg-card)",
                      border: "1px solid var(--ow-border)",
                      borderRadius: 3,
                      color: "var(--ow-text-hi)",
                      fontFamily: "'Lato',sans-serif",
                      fontSize: "0.85rem",
                      resize: "vertical",
                    }}
                  />
                  <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
                    <button
                      type="button"
                      data-testid={`notes-save-${c.slug}`}
                      disabled={setNotesMutation.isPending}
                      onClick={() => {
                        setNotesMutation.mutate(
                          { slug: c.slug, notes: notesBuffer },
                          {
                            onSuccess: () => {
                              setEditingNotes(null);
                              utils.outreach.list.invalidate();
                            },
                          }
                        );
                      }}
                      style={{
                        padding: "0.4rem 0.9rem",
                        background: "var(--ow-amber)",
                        color: "oklch(0.10 0.008 60)",
                        border: "none",
                        borderRadius: 3,
                        fontFamily: "'Lato',sans-serif",
                        fontSize: "0.78rem",
                        fontWeight: 700,
                        cursor: setNotesMutation.isPending ? "wait" : "pointer",
                      }}
                    >
                      {setNotesMutation.isPending ? "Saving…" : "Save notes"}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setEditingNotes(null); setNotesBuffer(""); }}
                      style={{
                        padding: "0.4rem 0.9rem",
                        background: "transparent",
                        color: "var(--ow-text-mid)",
                        border: "1px solid var(--ow-border)",
                        borderRadius: 3,
                        fontFamily: "'Lato',sans-serif",
                        fontSize: "0.78rem",
                        cursor: "pointer",
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
              {c.painPoint && <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", color: "var(--ow-text-mid)", fontStyle: "italic", marginBottom: 8 }}>“{c.painPoint}”</p>}
              {isSilent ? (
                <p
                  data-testid={`silent-note-${c.slug}`}
                  style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)", fontStyle: "italic", marginTop: 8 }}
                >
                  {status === "sales" ? "Sales/vendor — SMS draft hidden so you don't accidentally pitch a rep." : "Marked skip — kept for reference only."}
                </p>
              ) : (
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    data-testid={`copy-url-${c.slug}`}
                    onClick={() => copy(c.slug, "url", url)}
                    style={btn}
                  >
                    {copied === "url" ? "✓ URL copied" : `Copy link`}
                  </button>
                  <button
                    data-testid={`copy-sms-${c.slug}`}
                    onClick={() => copy(c.slug, "sms", effectiveSms)}
                    style={{ ...btn, background: "var(--ow-amber)", color: "oklch(0.10 0.008 60)", fontWeight: 700 }}
                  >
                    {copied === "sms" ? "✓ SMS copied" : "Copy SMS draft"}
                  </button>
                  <a href={url} target="_blank" rel="noopener noreferrer" style={{ ...btn, textDecoration: "none" }}>
                    Preview /hi/{c.slug}
                  </a>
                  {!c.smsSentAt && (
                    <button
                      data-testid={`mark-sent-${c.slug}`}
                      onClick={() => markSmsSentMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() })}
                      style={btn}
                    >
                      Mark SMS sent
                    </button>
                  )}
                  {!c.demoBookedAt && (
                    <button
                      data-testid={`mark-booked-${c.slug}`}
                      onClick={() => markBookedMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() })}
                      style={btn}
                    >
                      Mark booked
                    </button>
                  )}
                  <button
                    data-testid={`remove-${c.slug}`}
                    onClick={() => {
                      if (confirm(`Delete ${c.firstName}?`)) {
                        removeMutation.mutate({ slug: c.slug }, { onSuccess: () => utils.outreach.list.invalidate() });
                      }
                    }}
                    style={{ ...btn, color: "#b91c1c" }}
                  >
                    Delete
                  </button>
                </div>
              )}
              {!isSilent && (
                <SmsDraftEditor
                  slug={c.slug}
                  templateSms={templateSms}
                  override={c.smsDraftOverride ?? null}
                  onSave={(draft) =>
                    setSmsDraftMutation.mutate(
                      { slug: c.slug, draft },
                      { onSuccess: () => utils.outreach.list.invalidate() }
                    )
                  }
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Kpi({ label, value, testid }: { label: string; value: number; testid: string }) {
  return (
    <div className="rounded p-3" data-testid={testid} style={{ background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)" }}>
      <p className="text-xs uppercase tracking-widest" style={{ color: "var(--ow-text-lo)" }}>{label}</p>
      <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.8rem", fontWeight: 700, color: "var(--ow-text-hi)", margin: 0 }}>{value}</p>
    </div>
  );
}

function Field({ label, value, onChange, testid, placeholder }: { label: string; value: string; onChange: (v: string) => void; testid: string; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 4, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
      {label}
      <input
        type="text"
        data-testid={testid}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        style={{
          padding: "0.55rem 0.7rem",
          borderRadius: 4,
          border: "1px solid var(--ow-border)",
          background: "color-mix(in oklch, var(--ow-bg-card) 70%, white)",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.9rem",
          color: "var(--ow-text-hi)",
        }}
      />
    </label>
  );
}

function SmsDraftEditor({
  slug,
  templateSms,
  override,
  onSave,
}: {
  slug: string;
  templateSms: string;
  override: string | null;
  onSave: (draft: string | null) => void;
}) {
  const [value, setValue] = useState<string>(override ?? templateSms);
  const [savedHint, setSavedHint] = useState<"saved" | "reset" | null>(null);
  const isOverride = override !== null && override.length > 0;
  const dirty = value !== (override ?? templateSms);

  function handleBlur() {
    if (!dirty) return;
    const trimmed = value.trim();
    // Treat "same as template" as a reset (clears override so future
    // template changes auto-apply to this contact).
    if (trimmed === templateSms.trim()) {
      onSave(null);
      setSavedHint("reset");
    } else {
      onSave(trimmed.length > 0 ? trimmed : null);
      setSavedHint(trimmed.length > 0 ? "saved" : "reset");
    }
    setTimeout(() => setSavedHint(null), 2200);
  }

  function handleReset() {
    setValue(templateSms);
    onSave(null);
    setSavedHint("reset");
    setTimeout(() => setSavedHint(null), 2200);
  }

  return (
    <div data-testid={`sms-editor-${slug}`} style={{ marginTop: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", letterSpacing: "0.05em", textTransform: "uppercase" }}>
          SMS Draft
        </span>
        {isOverride && (
          <span
            data-testid={`sms-editor-badge-${slug}`}
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.65rem",
              padding: "1px 6px",
              borderRadius: 8,
              background: "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              fontWeight: 700,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
            }}
          >
            Custom
          </span>
        )}
        <span style={{ flexGrow: 1 }} />
        <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.68rem", color: value.length > 160 ? "#dc2626" : "var(--ow-text-lo)" }}>
          {value.length} chars · {value.length <= 160 ? "1 SMS" : value.length <= 306 ? "2 SMS" : `${Math.ceil(value.length / 153)} SMS`}
        </span>
      </div>
      <textarea
        data-testid={`sms-editor-input-${slug}`}
        value={value}
        onChange={(e) => setValue(e.target.value.slice(0, 500))}
        onBlur={handleBlur}
        rows={4}
        style={{
          width: "100%",
          padding: 10,
          background: "color-mix(in oklch, var(--ow-amber) 4%, transparent)",
          border: `1px solid ${dirty ? "var(--ow-amber)" : "var(--ow-border)"}`,
          borderRadius: 4,
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.78rem",
          color: "var(--ow-text-hi)",
          lineHeight: 1.5,
          resize: "vertical",
          outline: "none",
          transition: "border-color 120ms ease",
        }}
      />
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 4 }}>
        {isOverride && (
          <button
            type="button"
            data-testid={`sms-editor-reset-${slug}`}
            onClick={handleReset}
            style={{
              background: "transparent",
              border: "none",
              padding: 0,
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              color: "var(--ow-text-lo)",
              cursor: "pointer",
              textDecoration: "underline",
            }}
          >
            Reset to template
          </button>
        )}
        <span style={{ flexGrow: 1 }} />
        {savedHint === "saved" && (
          <span data-testid={`sms-editor-saved-${slug}`} style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "#10b981" }}>
            ✓ Saved
          </span>
        )}
        {savedHint === "reset" && (
          <span data-testid={`sms-editor-reset-confirm-${slug}`} style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
            ↺ Reverted to template
          </span>
        )}
        {dirty && !savedHint && (
          <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-amber)" }}>
            Click outside to save
          </span>
        )}
      </div>
    </div>
  );
}

function FilterChip({
  label,
  active,
  color,
  onClick,
  testid,
}: {
  label: string;
  active: boolean;
  color: string;
  onClick: () => void;
  testid: string;
}) {
  return (
    <button
      type="button"
      data-testid={testid}
      onClick={onClick}
      style={{
        padding: "6px 12px",
        borderRadius: 16,
        border: `1px solid ${active ? color : "var(--ow-border)"}`,
        background: active ? color : "transparent",
        color: active ? "white" : "var(--ow-text-mid)",
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.78rem",
        fontWeight: active ? 700 : 500,
        letterSpacing: "0.02em",
        cursor: "pointer",
        transition: "all 120ms ease",
      }}
    >
      {label}
    </button>
  );
}

function Pill({ children, color }: { children: React.ReactNode; color: string }) {
  return (
    <span
      style={{
        fontFamily: "'Lato',sans-serif",
        fontSize: "0.7rem",
        letterSpacing: "0.05em",
        textTransform: "uppercase",
        color: "white",
        background: color,
        padding: "2px 8px",
        borderRadius: 10,
        fontWeight: 600,
      }}
    >
      {children}
    </span>
  );
}

const btn: React.CSSProperties = {
  padding: "0.5rem 0.9rem",
  background: "var(--ow-bg-card)",
  color: "var(--ow-text-mid)",
  fontFamily: "'Lato',sans-serif",
  fontSize: "0.78rem",
  fontWeight: 600,
  border: "1px solid var(--ow-border)",
  borderRadius: 4,
  cursor: "pointer",
};

function CtaAbCard() {
  const { data, isLoading } = trpc.outreach.ctaStats.useQuery();
  if (isLoading || !data) return null;
  const [bookB, replyB] = [
    data.buckets.find((b) => b.variant === "book"),
    data.buckets.find((b) => b.variant === "reply"),
  ];
  const pct = (n: number, d: number) => (d > 0 ? `${Math.round((n / d) * 100)}%` : "—");

  return (
    <div
      className="mb-6 rounded-md p-4"
      data-testid="cta-ab-card"
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0 }}>
          A/B test · CTA on /hi/
        </p>
        {!data.enabled && (
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "#dc2626", fontWeight: 600, margin: 0 }}>
            ⚠ SMS_INBOUND_NUMBER not set — all prospects see &quot;book&quot; variant
          </p>
        )}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[bookB, replyB].map((b, i) => {
          if (!b) return null;
          const label = b.variant === "book" ? "📅 Book demo" : "💬 Reply RED";
          return (
            <div
              key={b.variant}
              data-testid={`cta-variant-${b.variant}`}
              style={{
                background: "var(--ow-bg-base)",
                border: `1px solid ${b.variant === "reply" ? "color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "var(--ow-border)"}`,
                padding: "0.9rem 1rem",
                borderRadius: 6,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontFamily: "'Lato',sans-serif", fontWeight: 700, color: "var(--ow-text-hi)", fontSize: "0.92rem" }}>
                  {label}
                </span>
                <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.72rem", color: "var(--ow-text-lo)" }}>
                  {b.total} prospects
                </span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 8, fontFamily: "'Lato',sans-serif", fontSize: "0.78rem" }}>
                <span style={{ color: "var(--ow-text-mid)" }}>
                  Viewed <strong style={{ color: "var(--ow-text-hi)" }}>{b.viewed}</strong> · {pct(b.viewed, b.total)}
                </span>
                <span style={{ color: "var(--ow-text-mid)" }}>
                  Clicked <strong style={{ color: "var(--ow-amber)" }}>{b.clicked}</strong> · {pct(b.clicked, b.viewed)}
                </span>
                <span style={{ color: "var(--ow-text-mid)" }}>
                  Booked <strong style={{ color: "#059669" }}>{b.booked}</strong> · {pct(b.booked, b.total)}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

