import { useEffect } from "react";
import { useLocation } from "wouter";
import { captureInvite, flushNow, track } from "@/lib/track";

let lastView = { key: "", at: 0 };

// Once per browser session: where did this visitor come from?
function landingSource(): string {
  const q = new URLSearchParams(window.location.search);
  const tag = q.get("utm_source") || q.get("from") || q.get("ref");
  if (tag) return `campaign:${tag.slice(0, 60)}`;
  if (window.location.pathname.startsWith("/hi/")) return "campaign:prospect-page";
  let host = "";
  try { host = document.referrer ? new URL(document.referrer).hostname.replace(/^www\./, "") : ""; } catch { /* bad referrer */ }
  if (!host || host === window.location.hostname.replace(/^www\./, "")) return "direct";
  if (/mail\.|outlook|gmail/.test(host)) return `email:${host}`;
  if (/(^|\.)(google|bing|duckduckgo|yahoo|ecosia|brave)\./.test(host)) return `search:${host.split(".")[0]}`;
  if (/instagram|facebook|fb\.|linkedin|t\.co$|twitter|x\.com|threads|tiktok|reddit|youtube/.test(host)) return `social:${host}`;
  return `ref:${host}`;
}

export function ActivityTracker() {
  const [location] = useLocation();

  useEffect(() => {
    if (!sessionStorage.getItem("ow_landing")) {
      sessionStorage.setItem("ow_landing", "1");
      track("custom", `landing ${landingSource()} ${window.location.pathname}`.slice(0, 300));
    }
    const onClick = (e: MouseEvent) => {
      const el = (e.target as HTMLElement | null)?.closest?.("[data-testid]");
      if (el) track("click", el.getAttribute("data-testid") ?? "");
    };
    const onHide = () => { if (document.visibilityState === "hidden") flushNow(); };
    document.addEventListener("click", onClick, true);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, []);

  useEffect(() => {
    captureInvite();
    const key = window.location.pathname + window.location.search;
    if (lastView.key !== key || Date.now() - lastView.at > 2000) track("page_view", window.location.search.slice(0, 200));
    lastView = { key, at: Date.now() };
    const seen = new Set<string>();
    const io = new IntersectionObserver((entries) => {
      for (const en of entries) {
        const name = (en.target as HTMLElement).dataset.trackSection;
        if (en.isIntersecting && name && !seen.has(name)) {
          seen.add(name);
          track("section_view", name);
        }
      }
    }, { threshold: 0.35 });
    const scan = setTimeout(() => document.querySelectorAll("[data-track-section]").forEach((n) => io.observe(n)), 800);
    return () => { clearTimeout(scan); io.disconnect(); };
  }, [location]);

  return null;
}
