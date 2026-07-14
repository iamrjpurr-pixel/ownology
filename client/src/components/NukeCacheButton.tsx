/**
 * NukeCacheButton — one-click "make it work" for stale service-worker /
 * localStorage / IndexedDB moments. Unregisters SWs, clears every storage
 * scope, and hard-reloads. Lives on /admin/dev so it stays out of the way
 * of normal ops.
 *
 * Rich, Feb 2026 — after multiple "the theme picker won't close" reports
 * that turned out to be sw.js serving stale JS. Auto-purge shipped via
 * CACHE_VERSION bump, but a manual escape hatch is invaluable when a fix
 * lands mid-session and you need the new code NOW.
 */
import { useState } from "react";

export function NukeCacheButton() {
  const [state, setState] = useState<"idle" | "working" | "done">("idle");
  const [details, setDetails] = useState<string[]>([]);

  async function nuke() {
    setState("working");
    const log: string[] = [];
    try {
      // 1. Unregister every service worker
      if ("serviceWorker" in navigator) {
        const regs = await navigator.serviceWorker.getRegistrations();
        log.push(`Service workers found: ${regs.length}`);
        for (const r of regs) {
          const ok = await r.unregister();
          log.push(`  ${ok ? "✓" : "✗"} unregistered ${r.scope}`);
        }
      }
      // 2. Clear the CacheStorage buckets (SW cache lives here)
      if ("caches" in window) {
        const keys = await caches.keys();
        log.push(`Cache buckets found: ${keys.length}`);
        for (const k of keys) {
          const ok = await caches.delete(k);
          log.push(`  ${ok ? "✓" : "✗"} deleted cache "${k}"`);
        }
      }
      // 3. Clear localStorage + sessionStorage
      try {
        const lsCount = localStorage.length;
        localStorage.clear();
        log.push(`✓ localStorage cleared (${lsCount} keys)`);
      } catch {
        log.push("✗ localStorage clear failed");
      }
      try {
        const ssCount = sessionStorage.length;
        sessionStorage.clear();
        log.push(`✓ sessionStorage cleared (${ssCount} keys)`);
      } catch {
        log.push("✗ sessionStorage clear failed");
      }
      // 4. Delete IndexedDB databases (Vite / React-Query persistence)
      if ("indexedDB" in window && "databases" in indexedDB) {
        try {
          const dbs = await indexedDB.databases();
          log.push(`IndexedDB databases: ${dbs.length}`);
          for (const db of dbs) {
            if (db.name) {
              indexedDB.deleteDatabase(db.name);
              log.push(`  ✓ deleted DB "${db.name}"`);
            }
          }
        } catch {
          log.push("✗ IndexedDB enumeration unsupported (fine on some Firefox)");
        }
      }
      setDetails(log);
      setState("done");
      // Hard reload after a brief pause so the user sees the log
      setTimeout(() => window.location.reload(), 1200);
    } catch (err) {
      log.push(`✗ NUKE FAILED: ${err instanceof Error ? err.message : String(err)}`);
      setDetails(log);
      setState("idle");
    }
  }

  return (
    <div data-testid="nuke-cache-widget" style={{ padding: "14px 16px", border: "1px solid #dc2626", borderRadius: 6, background: "color-mix(in oklch, #dc2626 6%, transparent)" }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 14 }}>
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: "'Fraunces',serif", fontSize: "1rem", fontWeight: 700, color: "#dc2626" }}>💥 Nuke browser cache</div>
          <p style={{ margin: "4px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
            Unregisters service workers, wipes localStorage / sessionStorage / IndexedDB, hard-reloads. Use when a fix just landed but the browser is serving stale JS. Safe — it only affects the current origin.
          </p>
        </div>
        <button
          data-testid="nuke-cache-button"
          type="button"
          onClick={nuke}
          disabled={state === "working"}
          style={{
            padding: "8px 16px",
            background: state === "done" ? "#16a34a" : "#dc2626",
            color: "white",
            border: "none",
            borderRadius: 4,
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.82rem",
            fontWeight: 700,
            letterSpacing: "0.03em",
            cursor: state === "working" ? "wait" : "pointer",
            whiteSpace: "nowrap",
          }}
        >
          {state === "working" ? "Nuking…" : state === "done" ? "✓ Nuked · reloading" : "Nuke it"}
        </button>
      </div>
      {details.length > 0 && (
        <pre data-testid="nuke-cache-log" style={{ marginTop: 10, padding: 10, background: "var(--ow-bg-base)", border: "1px solid var(--ow-border)", borderRadius: 4, fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-mid)", whiteSpace: "pre-wrap", maxHeight: 200, overflowY: "auto" }}>
          {details.join("\n")}
        </pre>
      )}
    </div>
  );
}
