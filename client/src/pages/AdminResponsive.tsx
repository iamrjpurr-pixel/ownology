/**
 * AdminResponsive — single-pane UI/UX QA tool.
 *
 * Loads any path of the app in three iframes side-by-side at standard
 * breakpoints (375×812 iPhone, 768×1024 iPad, 1440×900 desktop) so you can
 * spot layout drift across devices without switching hardware.
 *
 * Workflow:
 *   1. Enter a path or click a preset
 *   2. All three iframes load the same path at their respective viewport sizes
 *   3. Scroll inside any iframe independently — no scroll-locking
 *   4. Use "Refresh all" to force-reload after a code change
 *
 * Not behind admin auth in code, but lives at /admin/* so the Basic Auth
 * gate covers it in prod.
 */
import { useState } from "react";
import { Link } from "wouter";

const PRESETS: { label: string; path: string }[] = [
  { label: "Home", path: "/home" },
  { label: "Why Ownology", path: "/why-ownology" },
  { label: "Knowledge index", path: "/knowledge" },
  { label: "SOP detail", path: "/knowledge/sop/18" },
  { label: "Free Run", path: "/free-run" },
  { label: "Hi page", path: "/hi/nathan-brokenwood-wines" },
  { label: "Sample vintage log", path: "/sample-vintage-log" },
  { label: "Cascade demo", path: "/cascade-demo" },
  { label: "Pricing", path: "/pricing" },
  { label: "Compliance", path: "/compliance" },
];

const VIEWPORTS: { label: string; w: number; h: number; icon: string }[] = [
  { label: "iPhone 13/14",  w: 390,  h: 844,  icon: "📱" },
  { label: "iPad portrait", w: 768,  h: 1024, icon: "📱" },
  { label: "Desktop 1440",  w: 1440, h: 900,  icon: "🖥️" },
];

export default function AdminResponsive() {
  const [path, setPath] = useState("/home");
  const [pendingPath, setPendingPath] = useState("/home");
  const [reloadKey, setReloadKey] = useState(0);

  function load() {
    setPath(pendingPath || "/");
    setReloadKey((k) => k + 1);
  }

  function pickPreset(p: string) {
    setPendingPath(p);
    setPath(p);
    setReloadKey((k) => k + 1);
  }

  return (
    <div style={{ minHeight: "100vh", background: "var(--ow-bg-base)", color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}>
      {/* Sticky toolbar */}
      <div
        style={{
          position: "sticky",
          top: 0,
          zIndex: 50,
          background: "var(--ow-bg-card)",
          borderBottom: "1px solid var(--ow-border-md)",
          padding: "1rem 1.25rem",
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: "0.6rem" }}>
          <h1 style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
            Responsive UI check
          </h1>
          <span style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", letterSpacing: "0.08em", textTransform: "uppercase" }}>
            iPhone · iPad · Desktop · all live
          </span>
        </div>

        <form
          onSubmit={(e) => { e.preventDefault(); load(); }}
          style={{ display: "flex", gap: 8, marginBottom: "0.8rem", flexWrap: "wrap" }}
        >
          <input
            type="text"
            value={pendingPath}
            onChange={(e) => setPendingPath(e.target.value)}
            placeholder="/home"
            data-testid="responsive-path-input"
            style={{
              flex: 1,
              minWidth: 220,
              background: "var(--ow-bg-base)",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 4,
              padding: "0.5rem 0.75rem",
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.86rem",
              color: "var(--ow-text-hi)",
            }}
          />
          <button
            type="submit"
            data-testid="responsive-load-btn"
            style={{
              background: "var(--ow-amber)",
              color: "white",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "0.5rem 1.1rem",
              border: "none",
              borderRadius: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "pointer",
            }}
          >
            Load
          </button>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            data-testid="responsive-reload-btn"
            style={{
              background: "var(--ow-bg-base)",
              color: "var(--ow-text-hi)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "0.5rem 1rem",
              border: "1px solid var(--ow-border-md)",
              borderRadius: 4,
              cursor: "pointer",
            }}
          >
            ↻ Refresh all
          </button>
        </form>

        {/* Presets */}
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {PRESETS.map((p) => (
            <button
              key={p.path}
              type="button"
              onClick={() => pickPreset(p.path)}
              data-testid={`responsive-preset-${p.label.toLowerCase().replace(/\s+/g, "-")}`}
              style={{
                background: path === p.path ? "color-mix(in oklch, var(--ow-amber) 15%, var(--ow-bg-base))" : "var(--ow-bg-base)",
                border: `1px solid ${path === p.path ? "var(--ow-amber)" : "var(--ow-border-md)"}`,
                color: "var(--ow-text-mid)",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.72rem",
                fontWeight: 600,
                padding: "0.35rem 0.7rem",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* Three viewports side-by-side, horizontal scroll if needed */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          padding: "1.25rem",
          overflowX: "auto",
          alignItems: "flex-start",
        }}
      >
        {VIEWPORTS.map((vp) => (
          <div key={vp.label} style={{ flexShrink: 0 }}>
            <div style={{
              padding: "0.4rem 0.7rem",
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border-md)",
              borderBottom: "none",
              borderTopLeftRadius: 6,
              borderTopRightRadius: 6,
              display: "flex",
              gap: 10,
              alignItems: "center",
              width: vp.w,
              boxSizing: "border-box",
            }}>
              <span style={{ fontSize: "1rem" }}>{vp.icon}</span>
              <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", fontWeight: 700, color: "var(--ow-text-hi)" }}>
                {vp.label}
              </span>
              <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)", marginLeft: "auto" }}>
                {vp.w} × {vp.h}
              </span>
            </div>
            <iframe
              key={`${reloadKey}-${vp.label}`}
              src={path}
              data-testid={`responsive-iframe-${vp.w}`}
              style={{
                width: vp.w,
                height: vp.h,
                border: "1px solid var(--ow-border-md)",
                borderRadius: "0 0 6px 6px",
                background: "white",
                display: "block",
              }}
              title={`${vp.label} preview`}
            />
          </div>
        ))}
      </div>

      <p style={{ padding: "0 1.25rem 2rem", fontSize: "0.78rem", color: "var(--ow-text-lo)" }}>
        💡 Pages that look &ldquo;phone-narrow&rdquo; on desktop usually have a too-restrictive <code style={{ fontFamily: "'Fira Code',monospace" }}>max-w-*</code> on the main content container. The fix is almost always swapping <code style={{ fontFamily: "'Fira Code',monospace" }}>max-w-md</code> / <code style={{ fontFamily: "'Fira Code',monospace" }}>max-w-2xl</code> for <code style={{ fontFamily: "'Fira Code',monospace" }}>max-w-5xl</code> / <code style={{ fontFamily: "'Fira Code',monospace" }}>max-w-6xl</code> at the page-wrapper level, or removing it entirely on desktop with <code style={{ fontFamily: "'Fira Code',monospace" }}>lg:max-w-none</code>.
        <br /><br />
        <Link href="/admin" style={{ color: "var(--ow-amber)", fontWeight: 700 }}>← Back to admin</Link>
      </p>
    </div>
  );
}
