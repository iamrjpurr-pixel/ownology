/**
 * OWNOLOGY — /competitive-advantage
 *
 * Retired Feb 2026. The original 983-line page claimed "0 direct competitors
 * found" which was factually stale after InnoVint shipped its AI Copilot in
 * January 2026. Rather than rewriting that entire page, we consolidated the
 * competitive positioning into a single canonical page at:
 *
 *     /vs/innovint-vintrace
 *
 * This route now redirects there — preserves any inbound links from cold
 * outreach, keeps the route registration in App.tsx intact, and consolidates
 * SEO signal on the new page.
 */
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function CompetitiveAdvantage() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    // Set the canonical hint before we navigate — helps any crawler that
    // caches this URL briefly during the transition.
    const link = document.createElement("link");
    link.rel = "canonical";
    link.href = "https://ownology.ai/vs/innovint-vintrace";
    document.head.appendChild(link);
    setLocation("/vs/innovint-vintrace", { replace: true });
    return () => { document.head.removeChild(link); };
  }, [setLocation]);
  return (
    <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Lato', sans-serif", color: "var(--ow-text-mid)", padding: "2rem" }}>
      Redirecting to the honest three-way comparison…
    </div>
  );
}
