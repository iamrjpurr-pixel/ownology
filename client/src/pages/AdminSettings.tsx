/**
 * AdminSettings — operator-facing preferences. Single source of truth for
 * per-user toggles (unit system, theme suggestions, future: branding).
 *
 * Surfaces are organised "what they control" not "where they live in the DB"
 * — winemakers don't care that unit_system is a column. They care that
 * "this app shows me metric numbers."
 *
 * Mounted at /admin/settings (admin-only because it operates on the
 * currently-signed-in user; tomorrow this becomes per-winery settings).
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

type UnitSystem = "metric" | "imperial";

export default function AdminSettings() {
  const { data: me, refetch } = trpc.admin.me.useQuery();
  const updateUnits = trpc.admin.updateUnitSystem.useMutation({
    onSuccess: () => refetch(),
  });
  const [unitSystem, setUnitSystem] = useState<UnitSystem>("metric");
  const [savedFlash, setSavedFlash] = useState(false);

  useEffect(() => {
    if (me?.unitSystem === "imperial" || me?.unitSystem === "metric") {
      setUnitSystem(me.unitSystem);
    }
  }, [me?.unitSystem]);

  function pick(u: UnitSystem) {
    if (u === unitSystem) return;
    setUnitSystem(u);
    updateUnits.mutate(
      { unitSystem: u },
      {
        onSuccess: () => {
          setSavedFlash(true);
          window.setTimeout(() => setSavedFlash(false), 1800);
        },
      }
    );
  }
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        padding: "2rem 1.5rem 4rem",
        fontFamily: "'Lato',sans-serif",
      }}
      data-testid="admin-settings"
    >
      <div style={{ maxWidth: 760, margin: "0 auto" }}>
        <Link to="/admin" style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", textDecoration: "none", letterSpacing: "0.06em", textTransform: "uppercase", fontWeight: 700 }}>
          ← Admin
        </Link>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "2rem",
            fontWeight: 700,
            margin: "0.5rem 0 2rem",
            letterSpacing: "-0.01em",
          }}
        >
          Settings
        </h1>

        {/* Unit system */}
        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.4rem 1.4rem 1.2rem",
            marginBottom: "1.4rem",
          }}
          data-testid="settings-unit-system"
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
            Units of measurement
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: "0 0 1rem", lineHeight: 1.5 }}>
            How Ownology talks to you and prints exports. Boutique-scale defaults assume metric (L, kg, °C). The AI silently converts imperial to metric on input so this affects display, not data.
          </p>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            {[
              { id: "metric" as const, label: "Metric", subtitle: "L · kg · °C · g/L" },
              { id: "imperial" as const, label: "Imperial", subtitle: "gal · lb · °F" },
            ].map((opt) => {
              const active = unitSystem === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  data-testid={`unit-${opt.id}`}
                  onClick={() => pick(opt.id)}
                  disabled={updateUnits.isPending}
                  style={{
                    flexBasis: 200,
                    flexGrow: 1,
                    minHeight: 44,
                    padding: "0.7rem 1rem",
                    background: active ? "color-mix(in oklch, var(--ow-amber) 14%, transparent)" : "transparent",
                    border: active ? "1.5px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
                    borderRadius: 6,
                    cursor: updateUnits.isPending ? "wait" : "pointer",
                    textAlign: "left",
                    color: "var(--ow-text-hi)",
                  }}
                >
                  <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.96rem" }}>
                    {opt.label} {active && <span style={{ color: "var(--ow-amber)", marginLeft: 4 }}>✓</span>}
                  </div>
                  <div style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", marginTop: 2 }}>
                    {opt.subtitle}
                  </div>
                </button>
              );
            })}
          </div>
          {savedFlash && (
            <div data-testid="settings-saved" style={{ marginTop: "0.9rem", fontSize: "0.78rem", color: "var(--ow-amber)" }}>
              Saved.
            </div>
          )}
        </section>

        {/* Winery — name, region, brand colour. Phase 2 multi-tenant container. */}
        <WinerySection />

        {/* Theme suggestion opt-out (reads localStorage) */}
        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.4rem",
            marginBottom: "1.4rem",
          }}
          data-testid="settings-theme-suggestions"
        >
          <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
            Theme suggestions
          </h2>
          <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: "0 0 0.9rem", lineHeight: 1.5 }}>
            Once-a-day banner that recommends a theme based on local time (e.g. Soft Cellar at dawn, Cellar Night after 7pm).
          </p>
          <ThemeSuggestionOptOutToggle />
        </section>

        {/* Account */}
        {me && (
          <section
            style={{
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 8,
              padding: "1.4rem",
            }}
            data-testid="settings-account"
          >
            <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.6rem" }}>
              Account
            </h2>
            <div style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", lineHeight: 1.7 }}>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Name</span> · {me.name || "—"}</div>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Email</span> · {me.email || "—"}</div>
              <div><span style={{ color: "var(--ow-text-lo)" }}>Role</span> · {me.role || "user"}</div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

function WinerySection() {
  const { data: winery, refetch, isLoading } = trpc.winery.current.useQuery();
  const update = trpc.winery.update.useMutation({
    onSuccess: () => {
      refetch();
      setStatus("saved");
      window.setTimeout(() => setStatus("idle"), 1800);
    },
    onError: (err) => {
      setStatus("error");
      setErrorMsg(err.message || "Could not save");
    },
  });

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [region, setRegion] = useState("");
  const [brandColor, setBrandColor] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  // Hydrate form when winery loads / refetches
  useEffect(() => {
    if (winery) {
      setName(winery.name);
      setContactName(winery.contactName ?? "");
      setRegion(winery.region ?? "");
      setBrandColor(winery.brandColor ?? "");
      setLogoUrl(winery.logoUrl ?? "");
    }
  }, [winery]);

  if (isLoading) return null;
  if (!winery) return null;

  const dirty = winery.name !== name
    || (winery.contactName ?? "") !== contactName
    || (winery.region ?? "") !== region
    || (winery.brandColor ?? "") !== brandColor
    || (winery.logoUrl ?? "") !== logoUrl;

  function save() {
    if (!dirty || update.isPending) return;
    setStatus("saving");
    setErrorMsg("");
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      setStatus("error");
      setErrorMsg("Winery name cannot be empty");
      return;
    }
    update.mutate({
      name: winery!.name !== trimmedName ? trimmedName : undefined,
      contactName: (winery!.contactName ?? "") !== contactName ? contactName : undefined,
      region: (winery!.region ?? "") !== region ? region : undefined,
      brandColor: (winery!.brandColor ?? "") !== brandColor ? brandColor : undefined,
      logoUrl: (winery!.logoUrl ?? "") !== logoUrl ? logoUrl : undefined,
    });
  }

  function revert() {
    if (!winery) return;
    setName(winery.name);
    setContactName(winery.contactName ?? "");
    setRegion(winery.region ?? "");
    setBrandColor(winery.brandColor ?? "");
    setLogoUrl(winery.logoUrl ?? "");
    setStatus("idle");
    setErrorMsg("");
  }

  const labelStyle = {
    display: "block" as const,
    fontSize: "0.74rem",
    color: "var(--ow-text-lo)",
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
    fontWeight: 700,
    marginBottom: 6,
  };
  const inputStyle = {
    width: "100%",
    minHeight: 44,
    padding: "0.55rem 0.75rem",
    background: "var(--ow-bg-base)",
    border: "1px solid var(--ow-border-md)",
    borderRadius: 6,
    color: "var(--ow-text-hi)",
    fontFamily: "inherit",
    fontSize: "0.92rem",
    boxSizing: "border-box" as const,
  };
  const readOnly = !winery.isOwner;

  return (
    <section
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border-md)",
        borderRadius: 8,
        padding: "1.4rem",
        marginBottom: "1.4rem",
      }}
      data-testid="settings-winery"
    >
      <h2 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, margin: "0 0 0.2rem" }}>
        Winery
      </h2>
      <p style={{ fontSize: "0.86rem", color: "var(--ow-text-mid)", margin: "0 0 1rem", lineHeight: 1.5 }}>
        {readOnly
          ? "You're a member of this winery. Only the owner can edit these details."
          : "Your winery's name, region, and brand colour. Used in document exports and the UserMenu."}
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: "1rem" }}>
        <div>
          <label htmlFor="winery-name" style={labelStyle}>Name</label>
          <input
            id="winery-name"
            data-testid="winery-name-input"
            type="text"
            value={name}
            disabled={readOnly || update.isPending}
            maxLength={255}
            onChange={(e) => setName(e.target.value)}
            style={inputStyle}
          />
        </div>

        <div>
          <label htmlFor="winery-contact-name" style={labelStyle}>Your first name (optional)</label>
          <input
            id="winery-contact-name"
            data-testid="winery-contact-name-input"
            type="text"
            value={contactName}
            disabled={readOnly || update.isPending}
            maxLength={128}
            placeholder="e.g. Sarah"
            onChange={(e) => setContactName(e.target.value)}
            style={inputStyle}
          />
          <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.4rem 0 0", lineHeight: 1.4 }}>
            Personalises invite links (&quot;{contactName.trim() || "Sarah"} at {name.trim() || "your winery"} invited you&quot;) and any nurture emails sent to leads you refer.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 180px", gap: "1rem" }}>
          <div>
            <label htmlFor="winery-region" style={labelStyle}>Region (optional)</label>
            <input
              id="winery-region"
              data-testid="winery-region-input"
              type="text"
              value={region}
              disabled={readOnly || update.isPending}
              maxLength={128}
              placeholder="e.g. Hunter Valley, NSW"
              onChange={(e) => setRegion(e.target.value)}
              style={inputStyle}
            />
          </div>
          <div>
            <label htmlFor="winery-brand-color" style={labelStyle}>Brand colour</label>
            <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
              <input
                id="winery-brand-color"
                data-testid="winery-brand-color-input"
                type="text"
                value={brandColor}
                disabled={readOnly || update.isPending}
                maxLength={16}
                placeholder="#b45309"
                onChange={(e) => setBrandColor(e.target.value)}
                style={{ ...inputStyle, fontFamily: "ui-monospace, monospace", fontSize: "0.85rem" }}
              />
              <div
                aria-hidden
                data-testid="winery-brand-color-swatch"
                style={{
                  width: 44,
                  minHeight: 44,
                  borderRadius: 6,
                  border: "1px solid var(--ow-border-md)",
                  background: /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(brandColor)
                    ? brandColor
                    : "var(--ow-bg-base)",
                  flexShrink: 0,
                }}
              />
            </div>
          </div>
        </div>

        <div>
          <label htmlFor="winery-logo-url" style={labelStyle}>Logo URL (optional)</label>
          <div style={{ display: "flex", gap: 8, alignItems: "stretch" }}>
            <input
              id="winery-logo-url"
              data-testid="winery-logo-url-input"
              type="url"
              value={logoUrl}
              disabled={readOnly || update.isPending}
              maxLength={512}
              placeholder="https://yourwinery.com/logo.png"
              onChange={(e) => setLogoUrl(e.target.value)}
              style={inputStyle}
            />
            {/^https:\/\/[^\s]{4,}$/i.test(logoUrl) && (
              <img
                src={logoUrl}
                alt=""
                data-testid="winery-logo-preview"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                style={{
                  width: 44,
                  height: 44,
                  objectFit: "contain",
                  borderRadius: 6,
                  border: "1px solid var(--ow-border-md)",
                  background: "var(--ow-bg-base)",
                  flexShrink: 0,
                }}
              />
            )}
          </div>
          <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.4rem 0 0", lineHeight: 1.4 }}>
            Paste an https://… URL to your existing hosted logo. Used on compliance audit PDFs and SOP exports.
          </p>
        </div>
      </div>

      {/* Public audit toggle — opt-in, owner-only, big privacy callout */}
      <div
        data-testid="winery-public-audit-section"
        style={{
          marginTop: "1.6rem",
          padding: "1rem 1.1rem",
          background: winery.publicAuditEnabled
            ? "color-mix(in oklch, var(--ow-amber) 8%, transparent)"
            : "var(--ow-bg-base)",
          border: `1px solid ${winery.publicAuditEnabled ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
          borderRadius: 6,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
          <div style={{ flex: "1 1 320px" }}>
            <div style={{ fontFamily: "'Fraunces',serif", fontWeight: 700, fontSize: "0.96rem", marginBottom: 4 }}>
              Public audit page
              {winery.publicAuditEnabled && (
                <span style={{ marginLeft: 8, fontSize: "0.62rem", padding: "2px 7px", background: "var(--ow-amber)", color: "white", borderRadius: 3, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", fontFamily: "'Lato',sans-serif" }}>
                  Published
                </span>
              )}
            </div>
            <p style={{ fontSize: "0.82rem", color: "var(--ow-text-mid)", margin: "0 0 0.5rem", lineHeight: 1.55 }}>
              Publish a live, branded audit page at <code style={{ fontFamily: "ui-monospace,monospace", fontSize: "0.84rem", background: "var(--ow-bg-card)", padding: "1px 6px", borderRadius: 3 }}>/audit/{winery.slug}</code> showing your last 90 days of compliance-relevant cellar activity. Link it from your About page; share with regulators.
            </p>
            <p style={{ fontSize: "0.74rem", color: "var(--ow-text-lo)", margin: 0, lineHeight: 1.5 }}>
              Privacy: only event date · tank · variety · event type + structured measurement values are shown. Operator-private notes and decision reasoning are <strong>never</strong> exposed.
            </p>
          </div>
          {!readOnly && (
            <button
              type="button"
              data-testid="winery-public-audit-toggle"
              disabled={update.isPending}
              onClick={() => {
                update.mutate({ publicAuditEnabled: !winery.publicAuditEnabled });
              }}
              style={{
                minHeight: 36,
                padding: "0.4rem 1rem",
                background: winery.publicAuditEnabled ? "transparent" : "var(--ow-amber)",
                color: winery.publicAuditEnabled ? "var(--ow-text-mid)" : "white",
                border: winery.publicAuditEnabled ? "1px solid var(--ow-border-md)" : "none",
                borderRadius: 4,
                cursor: update.isPending ? "wait" : "pointer",
                fontSize: "0.74rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                whiteSpace: "nowrap",
                flexShrink: 0,
              }}
            >
              {winery.publicAuditEnabled ? "Unpublish" : "Publish public audit"}
            </button>
          )}
        </div>
        {winery.publicAuditEnabled && (
          <div style={{ marginTop: "0.8rem", paddingTop: "0.8rem", borderTop: "1px dashed var(--ow-border-md)", fontSize: "0.8rem" }}>
            <a
              href={`/audit/${winery.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              data-testid="winery-public-audit-link"
              style={{ color: "var(--ow-amber)", fontWeight: 700, textDecoration: "none" }}
            >
              View live audit page →
            </a>
          </div>
        )}
      </div>

      <div style={{ marginTop: "1.2rem", fontSize: "0.78rem", color: "var(--ow-text-lo)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
        <div>
          <span>Plan · </span>
          <strong style={{ color: "var(--ow-text-mid)", textTransform: "capitalize" }}>
            {winery.plan.replace("_", " ")}
          </strong>
        </div>
        {!readOnly && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {status === "saved" && (
              <span data-testid="winery-saved" style={{ color: "var(--ow-amber)" }}>Saved.</span>
            )}
            {status === "error" && (
              <span data-testid="winery-error" style={{ color: "#b91c1c" }}>{errorMsg}</span>
            )}
            {dirty && (
              <button
                type="button"
                onClick={revert}
                data-testid="winery-revert-btn"
                style={{
                  minHeight: 36,
                  padding: "0.4rem 0.9rem",
                  background: "transparent",
                  color: "var(--ow-text-mid)",
                  border: "1px solid var(--ow-border-md)",
                  borderRadius: 4,
                  cursor: "pointer",
                  fontSize: "0.78rem",
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Revert
              </button>
            )}
            <button
              type="button"
              onClick={save}
              disabled={!dirty || update.isPending}
              data-testid="winery-save-btn"
              style={{
                minHeight: 36,
                padding: "0.4rem 1.2rem",
                background: dirty && !update.isPending ? "var(--ow-amber)" : "var(--ow-bg-base)",
                color: dirty && !update.isPending ? "white" : "var(--ow-text-lo)",
                border: "none",
                borderRadius: 4,
                cursor: dirty && !update.isPending ? "pointer" : "not-allowed",
                fontSize: "0.78rem",
                fontWeight: 700,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {update.isPending ? "Saving…" : "Save changes"}
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function ThemeSuggestionOptOutToggle() {  const [optedOut, setOptedOut] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    setOptedOut(window.localStorage.getItem("ownology-theme-suggest-opt-out") === "1");
  }, []);
  function toggle() {
    const next = !optedOut;
    setOptedOut(next);
    try {
      if (next) window.localStorage.setItem("ownology-theme-suggest-opt-out", "1");
      else window.localStorage.removeItem("ownology-theme-suggest-opt-out");
    } catch { /* noop */ }
  }
  return (
    <button
      type="button"
      data-testid="theme-suggest-toggle"
      onClick={toggle}
      style={{
        minHeight: 44,
        padding: "0.6rem 1.2rem",
        background: optedOut ? "transparent" : "var(--ow-amber)",
        color: optedOut ? "var(--ow-text-mid)" : "white",
        border: optedOut ? "1px solid var(--ow-border-md)" : "none",
        borderRadius: 4,
        cursor: "pointer",
        fontSize: "0.78rem",
        fontWeight: 700,
        letterSpacing: "0.06em",
        textTransform: "uppercase",
      }}
    >
      {optedOut ? "Currently off — Turn on" : "Currently on — Turn off"}
    </button>
  );
}
