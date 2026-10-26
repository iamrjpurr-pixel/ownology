import { useEffect } from "react";
import { useLocation } from "wouter";
import { captureInvite, flushNow, track } from "@/lib/track";

let lastView = { key: "", at: 0 };

export function ActivityTracker() {
  const [location] = useLocation();

  useEffect(() => {
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
