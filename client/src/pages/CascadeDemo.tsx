/**
 * CascadeDemo — visible proof page for the theatrical theme transitions.
 *
 * Hit /cascade-demo on any deployment to verify the Red Crush / White Crush
 * cascade animations are firing in this environment. Two large buttons fire
 * the cascade WITHOUT switching the theme (so you can hammer them
 * repeatedly to test the animation in isolation), plus two "Switch + Cascade"
 * buttons that do the full real flow.
 */
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { applyThemeToDom } from "@/lib/themes";

type LogLine = { ts: string; msg: string };

export default function CascadeDemo() {
  const [log, setLog] = useState<LogLine[]>([]);
  const logRef = useRef<HTMLDivElement>(null);

  function append(msg: string) {
    const ts = new Date().toISOString().slice(11, 23);
    setLog((p) => [...p.slice(-19), { ts, msg }]);
  }

  // Listen for the cascade event for diagnostics
  useEffect(() => {
    function onCrush(e: Event) {
      const id = (e as CustomEvent<{ themeId?: string }>).detail?.themeId;
      append(`◉ ownology:crush event detail.themeId = "${id}"`);
    }
    window.addEventListener("ownology:crush", onCrush as EventListener);
    return () => window.removeEventListener("ownology:crush", onCrush as EventListener);
  }, []);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [log]);

  function fireEventOnly(themeId: "red-crush" | "white-crush") {
    append(`▶ dispatching ownology:crush(${themeId}) — event-only mode (theme NOT switched)`);
    window.dispatchEvent(new CustomEvent("ownology:crush", { detail: { themeId } }));
  }

  function fireViaClassObserver(themeId: "red-crush" | "white-crush") {
    append(`▶ adding class theme-${themeId} to <html> — MutationObserver path`);
    const cls = `theme-${themeId}`;
    document.documentElement.classList.add(cls);
    // Remove after 5s so the page doesn't get stuck in the crush theme
    window.setTimeout(() => {
      document.documentElement.classList.remove(cls);
      append(`  · removed class theme-${themeId} (page reverted)`);
    }, 5000);
  }

  function switchTheme(themeId: "red-crush" | "white-crush" | "soft-cellar") {
    append(`▶ applyThemeToDom("${themeId}") + persist + dispatch`);
    applyThemeToDom(themeId);
    window.localStorage.setItem("ownology-theme", themeId);
    if (themeId === "red-crush" || themeId === "white-crush") {
      window.dispatchEvent(new CustomEvent("ownology:crush", { detail: { themeId } }));
    }
  }

  function reset() {
    append(`▶ reset → soft-cellar`);
    applyThemeToDom("soft-cellar");
    window.localStorage.setItem("ownology-theme", "soft-cellar");
  }

  function clearLog() {
    setLog([]);
  }

  const btn: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.85rem",
    fontWeight: 700,
    padding: "0.9rem 1.4rem",
    borderRadius: 6,
    border: "1px solid var(--ow-border-md)",
    background: "var(--ow-bg-card)",
    color: "var(--ow-text-hi)",
    cursor: "pointer",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
    transition: "transform 120ms ease, border-color 120ms ease",
  };

  const btnRed: React.CSSProperties = {
    ...btn,
    background: "linear-gradient(180deg, oklch(0.48 0.22 12) 0%, oklch(0.34 0.18 10) 100%)",
    color: "white",
    borderColor: "oklch(0.58 0.24 5)",
  };
  const btnWhite: React.CSSProperties = {
    ...btn,
    background: "linear-gradient(180deg, oklch(0.55 0.18 138) 0%, oklch(0.4 0.15 138) 100%)",
    color: "white",
    borderColor: "oklch(0.66 0.18 140)",
  };

  return (
    <div
      data-testid="cascade-demo-page"
      style={{
        minHeight: "100vh",
        padding: "3rem 1.5rem 5rem",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p
          style={{
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          Diagnostic · Crush Cascade
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "clamp(1.8rem, 4vw, 2.6rem)",
            fontWeight: 700,
            lineHeight: 1.1,
            marginBottom: "1rem",
            color: "var(--ow-text-hi)",
            letterSpacing: "-0.02em",
          }}
        >
          Crush Cascade — visible proof
        </h1>
        <p style={{ color: "var(--ow-text-mid)", fontSize: "1rem", lineHeight: 1.6, maxWidth: 640, marginBottom: "2rem" }}>
          Click any button below to fire the cascade. The overlay should sweep down from
          the top of your viewport in a deep wine-rose (Red Crush) or apple-green (White
          Crush) wave, hold a full-screen wash with the centred title, then drain off the
          bottom. The full experience runs about 4&nbsp;seconds — look for a ~2&nbsp;second hold
          on the solid wash where the title is fully visible.
        </p>

        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
            1. Event-only — fire the cascade without switching the theme
          </h2>
          <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Uses{" "}
            <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.78rem" }}>
              window.dispatchEvent(new CustomEvent(&apos;ownology:crush&apos;, …))
            </code>
            Hammer these to verify the listener works in this environment.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button data-testid="cd-fire-red-event" type="button" style={btnRed} onClick={() => fireEventOnly("red-crush")}>
              🍇 Fire Red Crush cascade
            </button>
            <button data-testid="cd-fire-white-event" type="button" style={btnWhite} onClick={() => fireEventOnly("white-crush")}>
              🍏 Fire White Crush cascade
            </button>
          </div>
        </section>

        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
            2. MutationObserver path — class change only, no event
          </h2>
          <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Adds <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.78rem" }}>theme-red-crush</code> / 
            {" "}<code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.78rem" }}>theme-white-crush</code> to{" "}
            <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.78rem" }}>&lt;html&gt;</code>. Verifies the observer fallback fires when the event is missed.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button data-testid="cd-fire-red-class" type="button" style={btnRed} onClick={() => fireViaClassObserver("red-crush")}>
              🍇 Class only — Red
            </button>
            <button data-testid="cd-fire-white-class" type="button" style={btnWhite} onClick={() => fireViaClassObserver("white-crush")}>
              🍏 Class only — White
            </button>
          </div>
        </section>

        <section
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.5rem",
            marginBottom: "1.5rem",
          }}
        >
          <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "1.1rem", marginBottom: "0.25rem" }}>
            3. Full flow — switch theme + fire cascade (real picker behaviour)
          </h2>
          <p style={{ color: "var(--ow-text-lo)", fontSize: "0.85rem", marginBottom: "1rem" }}>
            Persists the theme to localStorage and fires the cascade. This is what the
            nav picker does when you select a theme.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            <button data-testid="cd-switch-red" type="button" style={btnRed} onClick={() => switchTheme("red-crush")}>
              Switch + Cascade · Red
            </button>
            <button data-testid="cd-switch-white" type="button" style={btnWhite} onClick={() => switchTheme("white-crush")}>
              Switch + Cascade · White
            </button>
            <button data-testid="cd-reset" type="button" style={btn} onClick={reset}>
              ↺ Reset to soft-cellar
            </button>
          </div>
        </section>

        <section
          style={{
            background: "var(--ow-bg-inset, var(--ow-bg-raised))",
            border: "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1rem 1.25rem",
            marginBottom: "1.5rem",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "0.95rem", margin: 0 }}>
              Event log
            </h2>
            <button data-testid="cd-clear-log" type="button" onClick={clearLog} style={{ ...btn, padding: "0.4rem 0.7rem", fontSize: "0.7rem" }}>
              Clear
            </button>
          </div>
          <div
            ref={logRef}
            data-testid="cd-log"
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.78rem",
              lineHeight: 1.7,
              maxHeight: 240,
              overflowY: "auto",
              color: "var(--ow-text-mid)",
              background: "var(--ow-bg-base)",
              padding: "0.75rem 1rem",
              borderRadius: 4,
              border: "1px solid var(--ow-border-md)",
            }}
          >
            {log.length === 0 ? (
              <div style={{ color: "var(--ow-text-lo)" }}>(no events yet — click a button)</div>
            ) : (
              log.map((l, i) => (
                <div key={i}>
                  <span style={{ color: "var(--ow-text-lo)" }}>{l.ts}</span>
                  {" · "}
                  <span>{l.msg}</span>
                </div>
              ))
            )}
          </div>
        </section>

        <p style={{ color: "var(--ow-text-lo)", fontSize: "0.8rem", lineHeight: 1.6 }}>
          Tip · if the cascade is NOT visible when you click any button, your browser is
          likely caching an old bundle. Hard-refresh (Ctrl+Shift+R / Cmd+Shift+R) and try
          again. The animation respects{" "}
          <code style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.74rem" }}>prefers-reduced-motion</code> —
          if your OS has that enabled, the cascade is intentionally suppressed.
        </p>
        <p style={{ marginTop: "2rem" }}>
          <Link href="/home" style={{ color: "var(--ow-amber)", fontWeight: 700, fontSize: "0.85rem" }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}
