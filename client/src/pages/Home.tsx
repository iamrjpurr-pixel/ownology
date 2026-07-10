/**
 * OWNOLOGY — "Cellar Intelligence" Dark Artisan Landing Page
 * Design: Dark warm-black backgrounds, amber gold accents, Fraunces serif display,
 *   Lato body, Fira Code for data readouts. Bento-grid features, animated demo.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import FounderStory from "@/components/FounderStory";
import FAQ from "@/components/FAQ";
import HeroTheatricalPattern from "@/components/HeroTheatricalPattern";
import { HeroPillarsSection } from "@/components/HeroPillarsSection";
import HeroCarousel from "@/components/HeroCarousel";
import WhyOwnologyBoxes from "@/components/WhyOwnologyBoxes";
import { useUiPillarsV1 } from "@/config/ui";
import { useAutoCascade, pickCrushByDay } from "@/hooks/useAutoCascade";
import { Link } from "wouter";
import ThemeToggle, { useOwnologyTheme } from "@/components/ThemeToggle";
import { trpc } from "@/lib/trpc";
import { EditableText, useSiteContent } from "@/components/EditableText";

// ─── Image URLs ───────────────────────────────────────────────────────────────
const HERO_IMG    = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-hero-HqkryW7dQ2C9TbhdmJ8Kff.webp";
const PHONE_IMG   = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-phone-B8NBtDGaypkAQaVPkNmBw6.webp";
const VINEYARD_IMG= "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-vineyard-fbANbzVMm9rGzGepADg7Wn.webp";
const LAB_IMG     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-lab-iE8kgBSQPMzX2Riaak43Cz.webp";

// ─── Typewriter hook ──────────────────────────────────────────────────────────
function useTypewriter(text: string, speed = 28, startDelay = 400) {
  const [displayed, setDisplayed] = useState("");
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplayed("");
    setDone(false);
    let i = 0;
    const timeout = setTimeout(() => {
      const interval = setInterval(() => {
        i++;
        setDisplayed(text.slice(0, i));
        if (i >= text.length) { clearInterval(interval); setDone(true); }
      }, speed);
      return () => clearInterval(interval);
    }, startDelay);
    return () => clearTimeout(timeout);
  }, [text, speed, startDelay]);
  return { displayed, done };
}

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } }, { threshold });
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── What's New ribbon ──────────────────────────────────────────────────────
const WHATS_NEW_KEY = "ownology-whats-new-v2";

function WhatsNewRibbon() {
  const [dismissed, setDismissed] = useState(() => {
    try { return localStorage.getItem(WHATS_NEW_KEY) === "1"; } catch { return false; }
  });

  const dismiss = useCallback(() => {
    setDismissed(true);
    try { localStorage.setItem(WHATS_NEW_KEY, "1"); } catch { /* ignore */ }
  }, []);

  if (dismissed) return null;

  return (
    <div
      className="relative z-40 flex items-center justify-center gap-3 px-4 py-2.5"
      style={{
        background: "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-base))",
        borderBottom: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
      }}
    >
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-sm"
        style={{
          fontFamily: "'Fira Code',monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.12em",
          color: "var(--ow-bg-base)",
          background: "var(--ow-amber)",
          fontWeight: 700,
          whiteSpace: "nowrap",
        }}
      >
        NEW
      </span>
      <p
        style={{
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.8125rem",
          fontWeight: 300,
          color: "var(--ow-text-mid)",
          lineHeight: 1.4,
          margin: 0,
        }}
      >
        <strong style={{ fontWeight: 600, color: "var(--ow-text-hi)" }}>Knowledge Platform</strong> is live — 38 industry SOPs across 12 categories, Decision Logic &amp; Tribal Knowledge capture.
        {" "}
        <Link
          href="/knowledge"
          style={{ color: "var(--ow-amber)", textDecoration: "none", borderBottom: "1px solid var(--ow-amber)" }}
        >
          Explore the platform
        </Link>
      </p>
      <button
        onClick={dismiss}
        aria-label="Dismiss announcement"
        style={{
          background: "none",
          border: "none",
          cursor: "pointer",
          color: "var(--ow-text-lo)",
          fontFamily: "'Lato',sans-serif",
          fontSize: "1.1rem",
          lineHeight: 1,
          padding: "0.25rem 0.5rem",
          marginLeft: "auto",
          flexShrink: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Nav ──────────────────────────────────────────────────────────────────────
type NavItem = { label: string; href: string; external?: boolean };
// Primary links — always visible in desktop nav.
// Two-funnel discipline (Feb 2026, Rich):
//   1. DIY consumer  → /ask (the answer engine = the moat)
//   2. Winemaker pro → /join (Founding Partner cold-call landing)
//   3. Anyone ready to buy → /pricing
// Everything else stays indexed by Google (footer + sitemap intact) but
// gets out of the primary path so a cold-called visitor who types
// ownology.ai lands on ONE clear next step, not five parallel doors.
const PRIMARY_NAV: NavItem[] = [
  { label: "Ask Owen",         href: "/ask" },
  { label: "Founding",   href: "/join" },
  { label: "Pricing",          href: "/pricing" },
];

// Mobile-only "More" section — public visitors see just these three.
// Feb 2026 (Rich): dropped the marketing "More ▾" mega-menu entirely from
// the desktop chrome. Anything an operator needs lives in /admin. Anything
// a prospect needs lives in the hero pillars, primary nav, or the footer.
const MORE_NAV: NavItem[] = [
  { label: "Our Story",       href: "#our-story" },
  { label: "Getting Started", href: "/guide" },
  { label: "FAQ",             href: "#faq" },
];

// ─── Nav ─────────────────────────────────────────────────────────────────────
// Feb 2026 (Rich): the old MoreDropdown mega-menu was removed. Public
// visitors get just PRIMARY_NAV (3 links) on desktop; a compact "More"
// section with MORE_NAV lives in the mobile drawer only. Operator quick-
// links moved to /admin.

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Silently check owner status. FORBIDDEN for non-owners (no crash), data defined for owner.
  const { data: adminData } = trpc.admin.summary.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const isOwner = !!adminData;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Lock body scroll when mobile menu is open
  useEffect(() => {
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [menuOpen]);

  const handleNavClick = () => setMenuOpen(false);

  return (
    <>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 backdrop-blur-md border-b ${
        scrolled || menuOpen ? "border-white/5" : "border-transparent"
      }`}
        style={{
          background: scrolled || menuOpen
            ? "var(--ow-nav-bg)"
            : "var(--ow-nav-bg)",
        }}
      >
        <div className="container flex items-center justify-between py-5">
          <OwnologyLogo size={36} showIABadge showTheoryCard />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-6">
            {PRIMARY_NAV.map(item => (
              item.href.startsWith("/") ? (
                <Link key={item.label} href={item.href}
                  className="text-sm font-light tracking-wide transition-colors"
                  style={{color:"var(--ow-text-mid)", fontFamily:"'Lato',sans-serif"}}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-mid)")}
                >{item.label}</Link>
              ) : (
                <a key={item.label} href={item.href}
                  className="text-sm font-light tracking-wide transition-colors"
                  style={{color:"var(--ow-text-mid)", fontFamily:"'Lato',sans-serif"}}
                  onMouseEnter={e=>(e.currentTarget.style.color="var(--ow-amber)")}
                  onMouseLeave={e=>(e.currentTarget.style.color="var(--ow-text-mid)")}
                >{item.label}</a>
              )
            ))}
            {/* More dropdown */}
            {/* S8-B/J: Build Index removed from nav (internal only — still reachable via direct URL /build-index) */}
            {/* Feb 2026 (Rich): the desktop "More" mega-menu was removed entirely.
                Public visitors get PRIMARY_NAV only + hero pillar cards + footer.
                Admin quick-links moved to /admin. Mobile drawer still exposes a
                compact 3-item More section (MORE_NAV) for touch users. */}
          </div>

          <div className="hidden md:flex items-center gap-2">
            {/* Symmetric CTA pair — Feb 2026 (Rich).
                Both pills share shape, padding, typography, and border-radius.
                Left pill (Enthusiasts) = soft/transparent amber → the curiosity
                surface (Free Run: Ask Owen anything).
                Right pill (Professionals) = full amber fill → the commercial
                surface (Cellar Brief / Founding-partner join flow).
                Both fully theme-aware via var(--ow-amber). */}
            <Link
              href="/free-run"
              data-testid="nav-enthusiasts"
              title="For Wine Enthusiasts — Ask Owen anything about wine science, style, and story. Free-tier curiosity flow."
              aria-label="For Wine Enthusiasts — open Free Run"
              className="inline-flex items-center rounded-full transition-colors"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 55%, transparent)",
                background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                color: "var(--ow-amber)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 700,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "color-mix(in oklch, var(--ow-amber) 22%, transparent)";
                e.currentTarget.style.borderColor = "var(--ow-amber)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "color-mix(in oklch, var(--ow-amber) 12%, transparent)";
                e.currentTarget.style.borderColor = "color-mix(in oklch, var(--ow-amber) 55%, transparent)";
              }}
            >
              For Wine Enthusiasts
            </Link>
            <a
              href="/join?from=homepage-nav"
              data-testid="nav-professionals"
              title="For Wine Professionals — Cellar Brief, vintage logs, APCO, and the founding-partner tier."
              aria-label="For Wine Professionals — open founding-partner join flow"
              className="inline-flex items-center rounded-full transition-opacity"
              style={{
                padding: "0.5rem 1rem",
                border: "1px solid var(--ow-amber)",
                background: "var(--ow-amber)",
                color: "oklch(0.14 0.008 60)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.72rem",
                letterSpacing: "0.06em",
                textTransform: "uppercase",
                fontWeight: 700,
                textDecoration: "none",
              }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.9"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = "1"; }}
            >
              For Wine Professionals
            </a>
          </div>

          {/* Mobile: hamburger only — theme toggle removed (Feb 2026, Rich). */}
          <div className="md:hidden flex items-center gap-1">
            <button
              className="touch-target rounded-sm transition-colors"
              style={{background: menuOpen ? "var(--ow-bg-card)" : "transparent"}}
              onClick={() => setMenuOpen(o => !o)}
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              aria-controls="mobile-nav-drawer"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
                {menuOpen ? (
                  <>
                    <path d="M5 5l12 12M17 5L5 17" stroke="var(--ow-amber)" strokeWidth="1.8" strokeLinecap="round"/>
                  </>
                ) : (
                  <>
                    <path d="M3 6h16M3 11h16M3 16h16" stroke="var(--ow-amber)" strokeWidth="1.8" strokeLinecap="round"/>
                  </>
                )}
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer — full-screen overlay */}
      <div
        id="mobile-nav-drawer"
        className="fixed inset-0 z-40 md:hidden flex flex-col"
        style={{
          background: "var(--ow-bg-base)",
          transform: menuOpen ? "translateX(0)" : "translateX(100%)",
          transition: "transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)",
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
        }}
        aria-hidden={!menuOpen}
        aria-label="Navigation menu"
        role="dialog"
        aria-modal="true"
      >
        {/* Drawer header */}
        <div
          className="flex items-center justify-between"
          style={{
            paddingTop: "max(1.25rem, env(safe-area-inset-top))",
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
            paddingBottom: "1rem",
            borderBottom: "1px solid var(--ow-border)",
          }}
        >
          <OwnologyLogo size={32} showIABadge showTheoryCard />
          <button
            className="touch-target rounded-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M5 5l12 12M17 5L5 17" stroke="var(--ow-amber)" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Drawer body */}
        <div
          className="flex flex-col flex-1"
          style={{
            paddingLeft: "max(1.25rem, env(safe-area-inset-left))",
            paddingRight: "max(1.25rem, env(safe-area-inset-right))",
          }}
        >
          {/* Primary nav group */}
          <div className="pt-2">
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em", color: "var(--ow-text-lo)", textTransform: "uppercase", padding: "0.75rem 0 0.25rem" }}>Explore</p>
            {PRIMARY_NAV.map((item) => (
              item.href.startsWith("/") ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex items-center justify-between transition-colors"
                  style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "1.0625rem", color: "var(--ow-text-hi)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "52px" }}
                >
                  {item.label}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex items-center justify-between transition-colors"
                  style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "1.0625rem", color: "var(--ow-text-hi)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "52px" }}
                >
                  {item.label}
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )
            ))}
          </div>

          {/* More nav group */}
          <div className="pt-2">
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em", color: "var(--ow-text-lo)", textTransform: "uppercase", padding: "0.75rem 0 0.25rem" }}>More</p>
            {MORE_NAV.map((item) => (
              item.href.startsWith("/") ? (
                <Link
                  key={item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex items-center justify-between transition-colors"
                  style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "var(--ow-text-mid)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "48px" }}
                >
                  {item.label}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </Link>
              ) : (
                <a
                  key={item.label}
                  href={item.href}
                  onClick={handleNavClick}
                  className="flex items-center justify-between transition-colors"
                  style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "var(--ow-text-mid)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "48px" }}
                >
                  {item.label}
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                </a>
              )
            ))}
          </div>

          {/* Internal nav — always visible */}
          <div className="pt-2">
            <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em", color: "var(--ow-text-lo)", textTransform: "uppercase", padding: "0.75rem 0 0.25rem" }}>Internal</p>
            {isOwner && (
              <Link
                href="/admin"
                onClick={handleNavClick}
                className="flex items-center justify-between transition-colors"
                style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "0.9375rem", color: "var(--ow-amber)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "48px" }}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><rect x="1" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="1" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="1" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/><rect x="8" y="8" width="5" height="5" rx="1" stroke="currentColor" strokeWidth="1.3"/></svg>
                  Admin
                </span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            )}
            {/* S8-B/J: Build Index removed from mobile nav (internal only — still reachable via /build-index direct URL) */}
          </div>

          {/* Cache clear button — admin-only utility */}
          {isOwner && (
            <div className="pt-2 pb-2">
              <button
                onClick={() => { localStorage.clear(); sessionStorage.clear(); document.cookie.split(";").forEach(c => { document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); }); setMenuOpen(false); window.location.reload(); }}
              className="flex items-center gap-2 w-full transition-colors"
              style={{ fontFamily: "'Lato',sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", background: "none", border: "none", cursor: "pointer", borderBottom: "1px solid var(--ow-border)", minHeight: "44px", padding: 0 }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M7 2a5 5 0 1 0 4.33 2.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/><path d="M11 2v2.5H8.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
              Clear Cache &amp; Reload
            </button>
          </div>
          )}
          <div className="flex-1" />

          {/* CTA */}
          <div
            style={{
              paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
              paddingTop: "1.5rem",
            }}
          >
            <a
              href="/pricing?from=homepage-mobile"
              onClick={handleNavClick}
              className="btn-amber w-full text-center block"
            >
              Start Free Trial
            </a>
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const usePillarsV1 = useUiPillarsV1();
  const aiResponse = "Based on your current YAN of 120ppm and a starting Brix of 24.3, I recommend adding 2.6 kg of DAP to Tank 7 — split 50% at inoculation, 50% at ⅓ sugar depletion. This targets a YAN of 200ppm, optimal for your Shiraz house style.";
  const { displayed, done } = useTypewriter(aiResponse, 22, 1200);
  const { contentMap } = useSiteContent();

  // Auto-fire the harvest crush cascade for organic visitors who arrived
  // with an attribution param (?from=*). Day-of-week alternator keeps the
  // colour mix even across social shares without random per-tab volatility.
  const hasAttribution = typeof window !== "undefined"
    && new URLSearchParams(window.location.search).has("from");
  useAutoCascade({
    themeId: pickCrushByDay(),
    enabled: hasAttribution,
    sessionKey: "ow_home_cascade_played",
  });

  function replayHarvestPreview() {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent("ownology:crush", { detail: { themeId: pickCrushByDay() } })
    );
  }

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden grain-overlay">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Wine cellar" className="w-full h-full object-cover" style={{filter:"brightness(0.28)"}} />
        <div className="absolute inset-0" style={{background:"linear-gradient(135deg, var(--ow-bg-base) 0%, transparent 60%, color-mix(in oklch, var(--ow-bg-base) 60%, transparent) 100%)"}} />
        <div className="absolute inset-0" style={{background:"linear-gradient(to top, var(--ow-bg-base) 0%, transparent 50%)"}} />
      </div>

      {/* Theatrical juice-trail pattern — sits above the bg image, below copy */}
      <HeroTheatricalPattern />

      {/* ── Hero body — flag-gated. UI_PILLARS_V1 (Feb 2026):
             new 4-pillar flash-card variant ships live; append ?ui=v0 to
             any URL to preview the original apprentice hero side-by-side.
             See /app/client/src/config/ui.ts for the flag definition +
             kill-switch strategy. ─────────────────────────────────────── */}
      {usePillarsV1 ? (
        <HeroPillarsSection />
      ) : (
      <div className="container relative z-10 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <EditableText contentKey="home.hero.label" defaultValue="Cellar Intelligence Platform for Winemakers" as="p" className="section-label mb-6 fade-up" contentMap={contentMap} />
            <p
              data-testid="hero-strapline"
              className="fade-up fade-up-delay-1"
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontSize: "clamp(1.05rem, 1.6vw, 1.3rem)",
                color: "var(--ow-amber)",
                lineHeight: 1.35,
                margin: "0 0 1.25rem",
                letterSpacing: "0.005em",
                maxWidth: "480px",
              }}
            >
              You are the must. Ownology is the ferment.
            </p>
            <h1 className="fade-up fade-up-delay-1"
              style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"clamp(2rem,5vw,4rem)", lineHeight:1.1, color:"var(--ow-text-hi)", letterSpacing:"-0.02em", textWrap: "balance" as "balance" }}>
              <EditableText contentKey="home.hero.headline" defaultValue="Your cellar's most knowledgeable apprentice." contentMap={contentMap} />
            </h1>
            <EditableText contentKey="home.hero.subheading" defaultValue="Log cellar readings. Access 38 industry SOPs across 12 categories. Ask the AI anything. Stay compliant. Ownology is the complete intelligence platform for boutique winery teams — on a mobile phone, during harvest." as="p" className="mt-6 fade-up fade-up-delay-2" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"1.125rem", lineHeight:1.7, color:"var(--ow-text-mid)", maxWidth:"480px"}} multiline contentMap={contentMap} />
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-10 fade-up fade-up-delay-3">
              <a href="/pricing?from=homepage-hero" className="btn-amber text-center">Start 14-Day Free Trial</a>
              <Link
                href="/cellar-brief?from=homepage-hero"
                data-testid="hero-cellar-brief-cta"
                className="btn-ghost text-center flex items-center justify-center gap-2"
                style={{
                  borderColor: "var(--ow-amber)",
                  color: "var(--ow-amber)",
                  fontWeight: 600,
                }}
              >
                <span aria-hidden="true">✦</span>
                See a live Cellar Brief
              </Link>
              <a href="#how-it-works" className="btn-ghost text-center">See How It Works</a>
              <Link href="/compliance" className="btn-ghost flex items-center justify-center gap-2" style={{borderColor:"color-mix(in oklch, var(--ow-amber) 30%, transparent)", color:"var(--ow-text-mid)"}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1C3.69 1 1 3.69 1 7s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Zm.5 9h-1V6.5h1V10Zm0-4.5h-1V4h1v1.5Z" fill="currentColor"/>
                </svg>
                Ask a Compliance Question
              </Link>
            </div>
            {/* Discoverable "wow moment" trigger for organic visitors who
                missed the auto-fire (or want to replay it). Subtle enough
                not to compete with the primary CTAs. */}
            <button
              type="button"
              data-testid="hero-replay-harvest"
              onClick={replayHarvestPreview}
              className="mt-4 fade-up fade-up-delay-3"
              style={{
                background: "transparent",
                border: "none",
                padding: 0,
                cursor: "pointer",
                color: "var(--ow-text-lo)",
                fontFamily: "'Lato', sans-serif",
                fontSize: "0.78rem",
                fontWeight: 400,
                letterSpacing: "0.06em",
                textDecoration: "none",
                opacity: 0.85,
                transition: "color 180ms ease, opacity 180ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-amber)";
                (e.currentTarget as HTMLButtonElement).style.opacity = "1";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "var(--ow-text-lo)";
                (e.currentTarget as HTMLButtonElement).style.opacity = "0.85";
              }}
            >
              ✦ Preview harvest mode →
            </button>
            {/* Cellar Journal library link — soft entry point for organic
                visitors + SEO-curious winemakers. Feeds them into the 250+
                Q&A library which then cross-links back into /pricing. */}
            <div className="mt-3 fade-up fade-up-delay-3">
              <Link
                href="/cellar-journal?from=homepage-hero"
                data-testid="hero-journal-link"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  color: "var(--ow-text-lo)",
                  textDecoration: "none",
                  opacity: 0.85,
                  transition: "color 180ms ease, opacity 180ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ow-amber)";
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ow-text-lo)";
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
                }}
              >
                📚 Or browse 250+ winemaking Q&amp;As in the Cellar Journal →
              </Link>
            </div>
            {/* Wine Quiz teaser — viral lead-magnet, human-curated by Gel & Rich */}
            <div className="mt-2 fade-up fade-up-delay-3">
              <Link
                href="/quiz?from=homepage-hero"
                data-testid="hero-quiz-link"
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.78rem",
                  letterSpacing: "0.04em",
                  color: "var(--ow-text-lo)",
                  textDecoration: "none",
                  opacity: 0.85,
                  transition: "color 180ms ease, opacity 180ms ease",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ow-amber)";
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "1";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLAnchorElement).style.color = "var(--ow-text-lo)";
                  (e.currentTarget as HTMLAnchorElement).style.opacity = "0.85";
                }}
              >
                🍷 Take our 6-question wine quiz — Gel &amp; Rich pick one for you →
              </Link>
            </div>
            {/* Trust bar */}
            <div className="mt-12 flex items-center gap-4 fade-up fade-up-delay-4">
              <div className="amber-rule flex-1 hidden sm:block" />
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.7rem", color:"var(--ow-text-lo)", letterSpacing:"0.06em", textAlign:"center"}}>
                BUILT FOR BOUTIQUE WINERIES ACROSS AU · NZ · US
              </p>
              <div className="amber-rule flex-1 hidden sm:block" />
            </div>
          </div>

          {/* Right — live demo card — hidden on mobile to prevent overflow */}
          <div className="hidden lg:block fade-up fade-up-delay-2">
            <div className="cellar-card p-5 max-w-md ml-auto" style={{border:"1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)"}}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-4" style={{borderBottom:"1px solid var(--ow-border)"}}>
                <div className="w-2 h-2 rounded-full" style={{background:"var(--ow-amber)"}} />
                <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.75rem", color:"var(--ow-text-lo)", letterSpacing:"0.1em", textTransform:"uppercase"}}>Ownology Assistant</span>
                <div className="ml-auto flex gap-1.5">
                  {["color-mix(in oklch, var(--ow-amber) 30%, transparent)","color-mix(in oklch, var(--ow-amber) 50%, transparent)","var(--ow-amber)"].map((c,i)=>(
                    <div key={i} className="w-1.5 h-1.5 rounded-full" style={{background:c}} />
                  ))}
                </div>
              </div>
              {/* User message */}
              <div className="mb-4">
                <div className="inline-block px-4 py-2.5 rounded text-sm" style={{background:"var(--ow-bg-inset)", color:"var(--ow-text-hi)", fontFamily:"'Lato',sans-serif", lineHeight:1.5}}>
                  My Shiraz is at 24.3 Brix, YAN is 120ppm. What DAP addition do I need for Tank 7?
                </div>
              </div>
              {/* AI response */}
              <div className="flex gap-3">
                <div className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"color-mix(in oklch, var(--ow-amber) 15%, transparent)", border:"1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)"}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="var(--ow-amber)" strokeWidth="1.2"/>
                    <path d="M5 3v2l1.5 1" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-sm leading-relaxed" style={{color:"var(--ow-text-mid)", fontFamily:"'Lato',sans-serif", lineHeight:1.65}}>
                  {displayed}
                  {!done && <span className="cursor-blink" style={{color:"var(--ow-amber)"}}>|</span>}
                </div>
              </div>
              {/* Data chips */}
              {done && (
                <div className="mt-4 pt-4 flex flex-wrap gap-2" style={{borderTop:"1px solid var(--ow-border)"}}>
                  {["Brix: 24.3","YAN: 120ppm","DAP: 2.6kg","Tank 7 · Shiraz"].map(d=>(
                    <span key={d} className="data-readout px-2.5 py-1 rounded-sm text-xs" style={{background:"color-mix(in oklch, var(--ow-amber) 10%, transparent)", border:"1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)"}}>
                      {d}
                    </span>
                  ))}
                </div>
              )}
              {/* Source citation */}
              {done && (
                <p className="mt-3 text-xs" style={{color:"var(--ow-text-lo)", fontFamily:"'Lato',sans-serif"}}>
                  ↳ Sourced from: <em>Your Shiraz SOP · Industry YAN Guidance</em>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
      )}
    </section>
  );
}

// ─── Pain Points ──────────────────────────────────────────────────────────────
function PainPoints() {
  const { ref, inView } = useInView();
  const points = [
    { num: "01", title: "The Data Entry Trap", body: "Winemakers scribble Brix readings on whiteboards and paper. Digital systems get updated days later — if at all. The data is always a reconstruction, never a real-time record." },
    { num: "02", title: "The Knowledge Bottleneck", body: "During harvest, junior staff constantly interrupt the head winemaker with questions a knowledge base could answer instantly. The winemaker becomes the single point of failure." },
    { num: "03", title: "Inaccessible SOPs", body: "Your SOPs exist — in a binder on a shelf nobody opens. When a seasonal worker needs a protocol, they ask a colleague who might remember incorrectly." },
    { num: "04", title: "No Benchmarking", body: "You know your own numbers intimately, but have no visibility into how your practices compare to regional peers. You're flying blind relative to the vintage." },
  ];
  return (
    <section className="py-28" style={{background:"var(--ow-bg-raised)"}}>
      <div className="container" ref={ref}>
        <p className="section-label mb-4">The Problem</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.25rem,2.2vw,2rem)", color:"var(--ow-text-hi)", maxWidth:"420px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap:"balance"} as React.CSSProperties}>
          Four problems every boutique winery knows too well.
        </h2>
        <div className="amber-rule mt-8 mb-12" />
        <div className="grid md:grid-cols-2 gap-px" style={{background:"var(--ow-border-md)"}}>
          {points.map((p, i) => (
            <div key={p.num} className={`p-8 ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}
              style={{background:"var(--ow-bg-raised)"}}>
              <span className="data-readout text-xs mb-4 block" style={{color:"color-mix(in oklch, var(--ow-amber) 60%, transparent)"}}>{p.num}</span>
              <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>{p.title}</h3>
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Features (Bento Grid) ────────────────────────────────────────────────────
function Features() {
  const { ref, inView } = useInView();
  const { contentMap } = useSiteContent();
  return (
    <section id="features" className="py-28">
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Features</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap: 'balance' as 'balance'}}>
          Everything your team needs. Nothing they don't.
        </h2>
        <div className="amber-rule mt-8 mb-12" />

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Feature 1 — large */}
          <div className={`md:col-span-2 cellar-card overflow-hidden ${inView ? "fade-up" : "opacity-0"}`}>
            <div className="p-8">
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ow-amber)", marginBottom:"1rem"}}>LEARN — Free Run</p>
              <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"color-mix(in oklch, var(--ow-amber) 12%, transparent)", border:"1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)"}}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 3l6 6-6 6" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <EditableText contentKey="home.features.ask.title" defaultValue="AI Knowledge Assistant" as="h3" style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}} contentMap={contentMap} />
              <EditableText contentKey="home.features.ask.body" defaultValue="Ask anything — from complex SO2 calculations to your own harvest protocols. The assistant searches your uploaded documents and world-class wine science literature, then delivers a precise, cited answer in seconds." as="p" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7, maxWidth:"420px"}} multiline contentMap={contentMap} />
              <div className="mt-6 p-4 rounded-sm" style={{background:"var(--ow-bg-base)", border:"1px solid var(--ow-border)"}}>
                <p className="data-readout text-xs mb-2" style={{color:"color-mix(in oklch, var(--ow-amber) 60%, transparent)"}}>EXAMPLE QUERY</p>
                <p style={{fontFamily:"'Fira Code',monospace", fontSize:"0.8125rem", color:"var(--ow-amber)", lineHeight:1.6}}>
                  "What is the target Free SO2 for our barrel-aged Chardonnay before bottling, and how much KMS for a 60-gallon barrel at 15ppm?"
                </p>
              </div>
            </div>
            <img src={LAB_IMG} alt="Winery lab" className="w-full h-48 object-cover" style={{filter:"brightness(0.5) saturate(0.8)"}} />
          </div>

          {/* Feature 2 */}
          <div className={`cellar-card p-8 ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ow-amber)", marginBottom:"1rem"}}>DO — The Press</p>
            <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.62 0.10 45 / 12%)", border:"1px solid oklch(0.62 0.10 45 / 25%)"}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <rect x="3" y="3" width="12" height="12" rx="1" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5"/>
                <path d="M6 9h6M6 6h6M6 12h4" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
              <EditableText contentKey="home.features.log.title" defaultValue="Smart Cellar Logbook" as="h3" style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}} contentMap={contentMap} />
            <EditableText contentKey="home.features.log.body" defaultValue="Log by voice or photo. Snap a handwritten lab slip — Ownology extracts and structures the data automatically. No keyboard. No delay." as="p" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}} multiline contentMap={contentMap} />
            <div className="mt-6 flex flex-col gap-2">
              {[["Brix","14.2"],["Temp","22°C"],["pH","3.61"],["Free SO₂","28ppm"]].map(([k,v])=>(
                <div key={k} className="flex justify-between items-center px-3 py-2 rounded-sm" style={{background:"var(--ow-bg-base)"}}>
                  <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}>{k}</span>
                  <span className="data-readout text-sm">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Feature 3 */}
          <div className={`cellar-card p-8 ${inView ? "fade-up fade-up-delay-2" : "opacity-0"}`}>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ow-amber)", marginBottom:"1rem"}}>DO — The Press</p>
            <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"color-mix(in oklch, var(--ow-amber) 12%, transparent)", border:"1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)"}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 14 L6 8 L9 11 L12 5 L15 9" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="15" cy="9" r="1.5" fill="var(--ow-amber)"/>
              </svg>
            </div>
              <EditableText contentKey="home.features.comply.title" defaultValue="Fermentation Dashboard" as="h3" style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}} contentMap={contentMap} />
            <EditableText contentKey="home.features.comply.body" defaultValue="Monitor all active fermentations at a glance. Proactive alerts when a tank deviates from its expected Brix trajectory — before a problem becomes a crisis." as="p" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}} multiline contentMap={contentMap} />
            {/* Mini chart */}
            <div className="mt-6 p-3 rounded-sm" style={{background:"var(--ow-bg-base)"}}>
              <div className="flex justify-between mb-2">
                <span className="data-readout text-xs" style={{color:"color-mix(in oklch, var(--ow-amber) 60%, transparent)"}}>TANK 7 · SHIRAZ</span>
                <span className="data-readout text-xs" style={{color:"var(--ow-amber)"}}>DAY 8</span>
              </div>
              <svg viewBox="0 0 200 60" className="w-full" style={{height:"48px"}}>
                <path d="M0 8 C20 8, 40 14, 60 22 C80 30, 100 38, 120 44 C140 50, 160 54, 200 56" stroke="color-mix(in oklch, var(--ow-amber) 30%, transparent)" strokeWidth="1" fill="none" strokeDasharray="4 3"/>
                <path d="M0 8 C20 8, 40 15, 60 24 C80 33, 100 42, 130 50" stroke="var(--ow-amber)" strokeWidth="1.5" fill="none"/>
                <circle cx="130" cy="50" r="3" fill="var(--ow-amber)"/>
              </svg>
              <div className="flex justify-between mt-1">
                <span className="data-readout text-xs" style={{color:"var(--ow-text-lo)"}}>24.3 Brix</span>
                <span className="data-readout text-xs" style={{color:"var(--ow-amber)"}}>8.4 Brix</span>
              </div>
            </div>
          </div>

          {/* Feature 4 — Knowledge Platform */}
          <div className={`md:col-span-2 cellar-card overflow-hidden ${inView ? "fade-up fade-up-delay-3" : "opacity-0"}`}>
            <div className="grid md:grid-cols-2 gap-0 h-full">
              <div className="p-8">
                <p style={{fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.6rem", letterSpacing:"0.14em", textTransform:"uppercase", color:"var(--ow-amber)", marginBottom:"1rem"}}>KNOW — Knowledge Platform</p>
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.62 0.10 45 / 12%)", border:"1px solid oklch(0.62 0.10 45 / 25%)"}}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 4h12v10H3z" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M7 4V2M11 4V2" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M6 8h6M6 11h4" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>Knowledge Platform</h3>
                <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>
                  38 industry-standard SOPs across 12 categories — from fermentation management to bottling. Capture the reasoning behind every decision in Decision Logic. Preserve your team's accumulated experience in Tribal Knowledge. Your winery's institutional memory, searchable and permanent.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  {["Fermentation Management · 6 SOPs","Laboratory Testing · 5 SOPs","Tank Cleaning & Sanitation · 4 SOPs","Bottling Procedures · 3 SOPs"].map(f=>(
                    <div key={f} className="flex items-center gap-3 px-3 py-2 rounded-sm" style={{background:"var(--ow-bg-base)"}}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 2h5l2 2v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="oklch(0.62 0.10 45)" strokeWidth="1"/>
                      </svg>
                      <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-mid)"}}>{f}</span>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:"var(--ow-amber)"}} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="relative hidden md:block">
                <img src={VINEYARD_IMG} alt="Vineyard" className="absolute inset-0 w-full h-full object-cover" style={{filter:"brightness(0.35) saturate(0.7)"}} />
                <div className="absolute inset-0" style={{background:"linear-gradient(to right, var(--ow-bg-card), transparent)"}} />
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
}

// ─── How It Works ─────────────────────────────────────────────────────────────
function HowItWorks() {
  const { ref, inView } = useInView();
  const steps = [
    { n:"01", title:"Do — Run Your Cellar", body:"Voice logs, tank readings, barrel tracking, task lists. Everything your team needs to stay aligned from crush to cork — in the pocket, in the cellar, in real time." },
    { n:"02", title:"Know — Your Intelligence Layer", body:"38 industry-standard SOPs, your own Decision Logic, your Tribal Knowledge — all searchable, all cited. When the answer matters, Ownology draws from your protocols first." },
    { n:"03", title:"Learn — Ask Anything About Wine", body:"From SO₂ calculations to stuck fermentation triage to understanding what terroir actually means. Free Run is open to everyone — winemakers, wine lovers, and the genuinely curious." },
    { n:"04", title:"Guide — Find Your Footing", body:"New to Ownology? Start here. The Getting Started guide walks you through every feature at your own pace. Compliance answers are here too — grounded in current legislation, not generic internet content." },
  ];
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden" style={{background:"var(--ow-bg-raised)"}}>
      <div className="absolute inset-0 opacity-5">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="container relative z-10" ref={ref}>
        <p className="section-label mb-4">How It Works</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap: 'balance' as 'balance'}}>
          Do. Know. Learn. Guide.
        </h2>
        <div className="amber-rule mt-8 mb-16" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.n} className={`relative ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}>
              <div className="flex items-start gap-4 mb-4">
                <span style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"2.5rem", color:"color-mix(in oklch, var(--ow-amber) 20%, transparent)", lineHeight:1, minWidth:"2.5rem"}}>{s.n}</span>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px" style={{background:"linear-gradient(to right, color-mix(in oklch, var(--ow-amber) 20%, transparent), transparent)", transform:"translateX(-50%)"}} />
                )}
              </div>
              <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.125rem", color:"var(--ow-text-hi)", marginBottom:"0.625rem"}}>{s.title}</h3>
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>{s.body}</p>
            </div>
          ))}
        </div>

        {/* Phone mockup */}
        <div className="mt-20 flex justify-center">
          <div className="relative max-w-xs w-full">
            <div className="rounded-2xl overflow-hidden shadow-2xl" style={{border:"1px solid color-mix(in oklch, var(--ow-amber) 15%, transparent)"}}>
              <img src={PHONE_IMG} alt="Ownology on mobile" className="w-full" />
            </div>
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-sm" style={{background:"var(--ow-amber)", fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.75rem", color:"var(--ow-bg-base)", letterSpacing:"0.04em", textTransform:"uppercase"}}>
              Mobile First
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Demo Video ─────────────────────────────────────────────────────────────
function DemoVideo() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <section id="demo" className="py-28" style={{background:"var(--ow-bg-raised)"}}>
      <div className="container" ref={ref}>
        <p className="section-label mb-4">See It In Action</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap: 'balance' as 'balance'}}>
          60 seconds. A real cellar question. A real answer.
        </h2>
        <div className="amber-rule mt-8 mb-12" />
        {/* Video placeholder — replace src with actual video URL when ready */}
        <div
          className={`relative mx-auto max-w-3xl rounded-sm overflow-hidden ${inView ? "fade-up" : "opacity-0"}`}
          style={{border:"1px solid var(--ow-border-md)", aspectRatio:"16/9", background:"var(--ow-bg-card)"}}
        >
          {/* Placeholder overlay — remove this div and uncomment the iframe below when the video is ready */}
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center"
              style={{background:"color-mix(in oklch, var(--ow-amber) 12%, transparent)", border:"2px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)"}}
            >
              <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
                <path d="M10 8l12 6-12 6V8z" fill="var(--ow-amber)" />
              </svg>
            </div>
            <p style={{fontFamily:"'Fraunces',serif", fontWeight:500, fontSize:"1.125rem", color:"var(--ow-text-hi)"}}>Demo video coming soon</p>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9rem", color:"var(--ow-text-lo)", maxWidth:"360px", textAlign:"center", lineHeight:1.6}}>
              A 60-second walkthrough showing Ownology answering a real cellar question from an uploaded SOP — on mobile, during harvest.
            </p>
          </div>
          {/* Uncomment and replace VIDEO_URL when ready:
          <iframe
            src="VIDEO_URL"
            title="Ownology demo — 60 seconds, real cellar question"
            className="absolute inset-0 w-full h-full"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
          */}
        </div>
        <p className="text-center mt-6" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.875rem", color:"var(--ow-text-lo)"}}>
          Want an early preview? <a href="mailto:support@ownology.ai" style={{color:"var(--ow-amber)"}}>Email us</a> and we'll walk you through it live.
        </p>
      </div>
    </section>
  );
}

// ─── Testimonials ─────────────────────────────────────────────────────────────
function Testimonials() {
  const { ref, inView } = useInView();
  const cards = [
    {
      icon: "🍷",
      title: "The problem we're solving",
      body: "Boutique winery teams lose institutional knowledge every vintage. SOPs live in binders. Decisions aren't documented. New staff ask the same questions every harvest. Ownology fixes that.",
    },
    {
      icon: "📱",
      title: "Built for mobile, during harvest",
      body: "Designed to be used one-handed, in a cold cellar, with wet gloves. Every answer is grounded in your own documents — not generic internet content.",
    },
    {
      icon: "🔒",
      title: "Your data stays yours",
      body: "Your SOPs, vintage records, and tribal knowledge are never used to train AI models. They stay in your account, searchable only by your team.",
    },
  ];
  return (
    <section className="py-28">
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Why Ownology</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"480px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap: 'balance' as 'balance'}}>
          Built by winemakers, for winemakers.
        </h2>
        <div className="amber-rule mt-8 mb-12" />
        <div className="grid md:grid-cols-3 gap-6">
          {cards.map((c, i) => (
            <div key={i} className={`cellar-card p-8 flex flex-col ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}>
              <div className="mb-4 text-3xl">{c.icon}</div>
              <p style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>{c.title}</p>
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.75, flex:1}}>
                {c.body}
              </p>
            </div>
          ))}
        </div>
        <p className="text-center mt-10" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.875rem", color:"var(--ow-text-lo)", fontStyle:"italic"}}>
          Founding member access open now — be among the first wineries to use Ownology in the 2025–26 vintage.
        </p>
      </div>
    </section>
  );
}

// ─── Trust chips ─────────────────────────────────────────────────────────────
// Compact credibility strip, borrowed from the /home-v2 experiment. Placed
// directly below the hero on a wide viewport so a cold visitor sees the
// four credentials that matter (Australian-built · LIP-audit ready · APCO
// Assistant · Founding cohort 99) before scrolling to any prose.
function TrustChips() {
  const chips = [
    { icon: "🇦🇺", label: "Australian-built" },
    { icon: "🍇", label: "Wine Australia LIP-audit ready" },
    { icon: "📋", label: "APCO Assistant · Compliance-first" },
    { icon: "✦",  label: "Founding cohort · first 99 partners" },
  ];
  return (
    <section
      data-testid="home-trust-chips"
      style={{
        background: "var(--ow-bg-card)",
        borderTop: "1px solid var(--ow-border)",
        borderBottom: "1px solid var(--ow-border)",
        padding: "1.1rem 1rem",
      }}
    >
      <div
        className="container flex flex-wrap justify-center items-center"
        style={{
          gap: "1rem 2.25rem",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.72rem",
          color: "var(--ow-text-lo)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          fontWeight: 500,
        }}
      >
        {chips.map((c) => (
          <span
            key={c.label}
            data-testid={`trust-chip-${c.label.replace(/[^a-z0-9]+/gi,'-').toLowerCase()}`}
            style={{ display: "inline-flex", alignItems: "center", gap: "0.5rem" }}
          >
            <span aria-hidden="true" style={{ fontSize: "0.95rem" }}>{c.icon}</span>
            {c.label}
          </span>
        ))}
      </div>
    </section>
  );
}

// ─── APCO strip ──────────────────────────────────────────────────────────────
// Compact compliance-wedge section on the home page. Captures winemakers
// googling APCO / packaging compliance panic. Deep-links to the full
// /apco marketing page. Placed between Testimonials and Pricing so the
// visitor is warm on story before hitting the pitch.
function ApcoStrip() {
  const { ref, inView } = useInView(0.15);
  return (
    <section
      ref={ref}
      data-testid="home-apco-strip"
      style={{
        background: "var(--ow-bg-raised)",
        borderTop: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
        borderBottom: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
        padding: "3.5rem 1rem",
      }}
    >
      <div className={`container grid md:grid-cols-[1.4fr_1fr] gap-8 items-center ${inView ? "fade-up" : "opacity-0"}`}>
        <div>
          <p
            className="section-label mb-3"
            style={{ color: "var(--ow-amber)" }}
          >
            NEW · APCO Assistant · Compliance wedge
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(1.5rem, 2.6vw, 2rem)",
              lineHeight: 1.15,
              color: "var(--ow-text-hi)",
              margin: 0,
              letterSpacing: "-0.01em",
              textWrap: "balance" as "balance",
            }}
          >
            The APCO Annual Report is due 31 March.
            <br />
            Ownology drafts yours in an afternoon.
          </h2>
          <p
            className="mt-4"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 300,
              fontSize: "0.98rem",
              lineHeight: 1.7,
              color: "var(--ow-text-mid)",
              maxWidth: "560px",
            }}
          >
            Boutique winemakers lose 15–40 hours a year to APCO packaging reporting.
            Ownology's APCO Assistant vaults your bottle · closure · carton data
            once, then generates the Action Plan and Annual Report on demand —
            included with The Press ($44/mo founding · $59 retail).
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/apco?from=home-apco-strip"
              data-testid="home-apco-cta"
              className="btn-amber inline-flex items-center"
            >
              See how APCO Assistant works →
            </Link>
            <Link
              href="/pricing?from=home-apco-strip"
              data-testid="home-apco-pricing"
              className="btn-ghost inline-flex items-center"
              style={{ borderColor: "var(--ow-border-md)" }}
            >
              Pricing
            </Link>
          </div>
        </div>
        {/* Compliance stat card */}
        <div
          style={{
            background: "var(--ow-bg-card)",
            border: "1px solid var(--ow-border)",
            borderRadius: 6,
            padding: "1.5rem",
            fontFamily: "'Lato',sans-serif",
          }}
        >
          <p
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.62rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              fontWeight: 700,
              marginBottom: "1rem",
            }}
          >
            What Ownology handles
          </p>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {[
              "Bottle, closure & label data vault",
              "Sustainable Packaging Guidelines self-audit",
              "Auto-drafted Action Plan (Claude Sonnet 4.6)",
              "Annual Report → APCO portal-ready format",
            ].map((line) => (
              <li key={line} style={{ display: "flex", alignItems: "flex-start", gap: "0.55rem", fontSize: "0.87rem", color: "var(--ow-text-mid)", lineHeight: 1.55 }}>
                <span style={{ color: "var(--ow-amber)", fontWeight: 700, flexShrink: 0 }}>✓</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}

// ─── Pricing ──────────────────────────────────────────────────────────────────
function Pricing() {
  const { ref, inView } = useInView();
  const tiers = [
    {
      name:"Free Run", price:"Free", period:"", retail:"", sub:"No credit card needed",
      features:["3 curiosity questions / day","Flavour science & varietals","Divine Trinity — first reveal free","Free account — no card needed"],
      cta:"Start Exploring", href:"/free-run", highlight:false,
    },
    {
      name:"The Cellar Hand", price:"$22", period:"/mo", retail:"$28/mo retail",
      sub:"Founding · $220/yr · save 21%",
      features:["Full curiosity AI — 40+ subjects","30 Divine Trinity reveals per month","Unlimited Compliance AI","Vintage log (unlimited entries)","Email support","Founding member badge (first 99)"],
      cta:"Join The Cellar Hand", href:"/pricing", highlight:false,
    },
    {
      name:"The Press", price:"$44", period:"/mo", retail:"$59/mo retail",
      sub:"Founding · $440/yr · save 25%",
      features:["Full cellar operations suite","38 SOPs across 12 categories","Decision Logic + Tribal Knowledge","Priority Compliance AI","Vintage log PDF export","Phone & chat support"],
      cta:"Enter The Press", href:"/pricing", highlight:true,
    },
    {
      name:"The Vigneron", price:"$88", period:"/mo", retail:"$124/mo retail",
      sub:"Founding · $880/yr · save 29%",
      features:["Everything in The Press","Unlimited Divine Trinity reveals","3 team seats included","Onboarding call — 30 min","Annual knowledge base review","Vigneron badge + number"],
      cta:"Claim The Vigneron", href:"/pricing", highlight:false,
    },
  ];
  return (
    <section id="pricing" className="py-28" style={{background:"var(--ow-bg-raised)"}}>
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Pricing</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em", textWrap: 'balance' as 'balance'}}>
          From Free Run to The Vigneron.
        </h2>
        <p className="mt-4" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, color:"var(--ow-text-mid)", fontSize:"1rem"}}>
          Start free. No credit card required. Founding member pricing locked for life for the first 99 subscribers.
        </p>
        <div className="amber-rule mt-8 mb-12" />

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {tiers.map((t, i) => (
            <div key={t.name} className={`relative flex flex-col ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}
              style={{
                background: t.highlight ? "oklch(0.16 0.012 60)" : "var(--ow-bg-card)",
                border: t.highlight ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                borderRadius:"4px",
                padding:"1.75rem",
              }}>
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-sm text-xs font-bold tracking-widest uppercase"
                  style={{background:"var(--ow-amber)", color:"oklch(0.16 0.012 60)", fontFamily:"'Lato',sans-serif"}}>
                  Most Popular
                </div>
              )}
              <p className="section-label mb-2" style={{color: t.highlight ? "oklch(0.72 0.12 75)" : undefined}}>{t.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"2.25rem", color: t.highlight ? "oklch(0.92 0.018 75)" : "var(--ow-text-hi)", lineHeight:1}}>{t.price}</span>
                {t.period && <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.875rem", color: t.highlight ? "oklch(0.70 0.015 75)" : "var(--ow-text-lo)", paddingBottom:"0.35rem"}}>{t.period}</span>}
              </div>
              {t.retail && (
                <p
                  data-testid={`home-tier-retail-${t.name.replace(/\s+/g,'-').toLowerCase()}`}
                  style={{
                    fontFamily: "'Fira Code',monospace",
                    fontSize: "0.68rem",
                    letterSpacing: "0.04em",
                    color: t.highlight ? "oklch(0.60 0.015 75)" : "var(--ow-text-lo)",
                    marginBottom: "0.25rem",
                    textDecoration: "line-through",
                    opacity: 0.7,
                  }}
                >
                  {t.retail}
                </p>
              )}
              <p className="data-readout text-xs mb-5" style={{color: t.highlight ? "oklch(0.60 0.015 75)" : "var(--ow-text-lo)"}}>{t.sub}</p>
              <div className="amber-rule mb-5" />
              <ul className="flex flex-col gap-2.5 flex-1 mb-7">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-2.5">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                      <path d="M2.5 7l3 3 6-6" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.875rem", color: t.highlight ? "oklch(0.78 0.015 75)" : "var(--ow-text-mid)", fontWeight:300}}>{f}</span>
                  </li>
                ))}
              </ul>
              <a href={t.href} className={t.highlight ? "btn-amber w-full text-center" : "btn-ghost w-full text-center"}>
                {t.cta}
              </a>
            </div>
          ))}
        </div>

        {/* Full pricing details link */}
        <div className="mt-8 text-center">
          <a href="/pricing" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.9rem", color:"var(--ow-amber)", textDecoration:"underline", textUnderlineOffset:"3px"}}>
            View full pricing details, credit packs, and founding member offer →
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── Weight of Harvest ───────────────────────────────────────────────────────
function WeightOfHarvest() {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);

  const pillars = [
    {
      number: "01",
      heading: "Cognitive Overload",
      body: "During harvest, a winemaker makes hundreds of high-stakes decisions in six weeks — often simultaneously, often alone, often at 2am. When working memory is saturated, decision quality degrades. The knowledge is there. The bandwidth is not.",
    },
    {
      number: "02",
      heading: "The Single Point of Failure",
      body: "In most boutique wineries, the depth of operational knowledge lives in one person's head. When that person is unavailable, a significant portion of the winery's accumulated intelligence goes with them. This is not a failure of documentation. It is a structural reality of small, craft-focused operations.",
    },
    {
      number: "03",
      heading: "The Lookup Problem",
      body: "The question at 2am is not 'what kind of wine do I want to make?' It is 'what is the correct DAP addition for this tank right now?' That is a lookup problem — and lookup problems are precisely what well-designed AI systems solve, freeing the winemaker's judgment for decisions that genuinely require it.",
    },
  ];

  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{ background: "var(--ow-bg-raised)" }}
    >
      {/* Subtle top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in oklch, var(--ow-amber) 25%, transparent), transparent)",
        }}
      />

      <div className="container relative z-10" ref={ref}>
        {/* Section label + headline */}
        <div className={`max-w-2xl mb-16 ${inView ? "fade-up" : "opacity-0"}`}>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1.25rem",
            }}
          >
            The Psychology of Harvest
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.9rem, 3.5vw, 2.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--ow-text-hi)",
              textWrap: 'balance' as 'balance',
            }}
          >
            The Weight of Harvest
          </h2>
          <p
            className="mt-5"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
              maxWidth: "560px",
            }}
          >
            Harvest is a six-week sprint where a winemaker makes hundreds of high-stakes decisions — often alone, often at 2am, often with incomplete information. The fear is not just making the wrong call. It is the fear of being the only person who knows what the right call even looks like.
          </p>
        </div>

        {/* Three-column pillar grid */}
        <div className="grid md:grid-cols-3 gap-8 mb-16">
          {pillars.map((p, i) => (
            <div
              key={p.number}
              className={inView ? `fade-up fade-up-delay-${i + 1}` : "opacity-0"}
              style={{
                borderTop: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                paddingTop: "1.5rem",
              }}
            >
              <span
                style={{
                  fontFamily: "'Fira Code', monospace",
                  fontSize: "0.7rem",
                  letterSpacing: "0.12em",
                  color: "var(--ow-amber)",
                  display: "block",
                  marginBottom: "0.75rem",
                }}
              >
                {p.number}
              </span>
              <h3
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 600,
                  fontSize: "1.125rem",
                  color: "var(--ow-text-hi)",
                  marginBottom: "0.75rem",
                  lineHeight: 1.2,
                }}
              >
                {p.heading}
              </h3>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  fontSize: "0.9375rem",
                  lineHeight: 1.7,
                  color: "var(--ow-text-mid)",
                }}
              >
                {p.body}
              </p>
            </div>
          ))}
        </div>

        {/* Pull quote */}
        <div
          className={`max-w-2xl mx-auto text-center ${inView ? "fade-up fade-up-delay-4" : "opacity-0"}`}
          style={{ borderTop: "1px solid var(--ow-amber)", paddingTop: "1.5rem" }}
        >
          <blockquote
            style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2vw, 1.375rem)",
              lineHeight: 1.5,
              color: "var(--ow-text-hi)",
              textWrap: "balance" as "balance",
            }}
          >
            "Ownology does not replace that person. It makes sure their knowledge is never the single point of failure."
          </blockquote>
        </div>
      </div>
    </section>
  );
}

// ─── What Ownology Knows ─────────────────────────────────────────────────────
function WhatOwnologyKnows() {
  const { ref, inView } = useInView(0.12);

  const domains = [
    {
      icon: "⚗️",
      title: "Winemaking Chemistry",
      items: ["Fermentation kinetics & YAN management", "SO₂ chemistry & molecular fractions", "Malolactic fermentation biology", "Fining agent interactions", "Tartrate stabilisation"],
    },
    {
      icon: "🍇",
      title: "Viticulture & Fruit Assessment",
      items: ["Brix, pH, TA at receival", "Grape maturity indicators", "Botrytis & disease management", "Vineyard to tank traceability", "Vintage planning & scheduling"],
    },
    {
      icon: "🏛️",
      title: "Regulatory Compliance",
      items: ["Label Integrity Program (LIP)", "FSANZ Standard 4.5.1 additives", "Wine Australia registration", "State liquor licensing (SA, VIC, NSW)", "EPA environmental obligations"],
    },
    {
      icon: "🔬",
      title: "Cellar Laboratory",
      items: ["pH, TA & residual sugar analysis", "Free & total SO₂ titration", "Volatile acidity measurement", "Alcohol determination", "Microbial spoilage identification"],
    },
    {
      icon: "📋",
      title: "Cellar Operations",
      items: ["Pump-over & plunging regimes", "Racking & lees management", "Barrel maturation protocols", "Blending trial methodology", "Bottling line preparation"],
    },
    {
      icon: "🛡️",
      title: "Safety & WHS",
      items: ["CO₂ confined space protocols", "Chemical handling (SO₂, caustic)", "Bunding & spill containment", "Emergency response procedures", "SafeWork SA obligations"],
    },
  ];

  return (
    <section
      className="py-28 relative overflow-hidden"
      style={{ background: "var(--ow-bg-base)" }}
    >
      {/* Subtle amber gradient top rule */}
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{
          background:
            "linear-gradient(to right, transparent, color-mix(in oklch, var(--ow-amber) 30%, transparent), transparent)",
        }}
      />

      <div className="container relative z-10" ref={ref}>
        {/* Header */}
        <div className={`max-w-2xl mb-4 ${inView ? "fade-up" : "opacity-0"}`}>
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.7rem",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginBottom: "1.25rem",
            }}
          >
            The Knowledge Base
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.9rem, 3.5vw, 2.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              color: "var(--ow-text-hi)",
              textWrap: 'balance' as 'balance',
            }}
          >
            What Ownology Knows
          </h2>
          <p
            className="mt-5"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.0625rem",
              lineHeight: 1.75,
              color: "var(--ow-text-mid)",
              maxWidth: "600px",
            }}
          >
            Ownology is trained on the same body of knowledge as a formally qualified winemaker — the equivalent of a Bachelor of Oenology — and is available at 2am during vintage, on a mobile phone, in the middle of a stuck fermentation.
          </p>
        </div>

        {/* 24/7 availability callout */}
        <div
          className={`inline-flex items-center gap-3 mb-14 px-5 py-3 rounded-sm ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          }}
        >
          <span style={{ fontSize: "1.1rem" }}>🕐</span>
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.8125rem",
              color: "var(--ow-amber)",
              letterSpacing: "0.06em",
            }}
          >
            Available 24 / 7 · 365 days · including vintage
          </span>
        </div>

        {/* Domain grid */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {domains.map((d, i) => (
            <div
              key={d.title}
              className={inView ? `fade-up fade-up-delay-${Math.min(i + 1, 4)}` : "opacity-0"}
              style={{
                background: "var(--ow-bg-raised)",
                border: "1px solid var(--ow-border)",
                borderRadius: "2px",
                padding: "1.5rem",
              }}
            >
              <div className="flex items-center gap-3 mb-4">
                <span style={{ fontSize: "1.375rem" }}>{d.icon}</span>
                <h3
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 600,
                    fontSize: "1rem",
                    color: "var(--ow-text-hi)",
                    lineHeight: 1.2,
                  }}
                >
                  {d.title}
                </h3>
              </div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
                {d.items.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2 mb-2"
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.875rem",
                      lineHeight: 1.55,
                      color: "var(--ow-text-mid)",
                    }}
                  >
                    <span
                      style={{
                        color: "var(--ow-amber)",
                        marginTop: "0.2rem",
                        flexShrink: 0,
                        fontSize: "0.6rem",
                      }}
                    >
                      ◆
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom CTA strip */}
        <div
          className={`mt-14 flex flex-col sm:flex-row items-center justify-between gap-6 pt-8 ${inView ? "fade-up fade-up-delay-4" : "opacity-0"}`}
          style={{ borderTop: "1px solid var(--ow-border)" }}
        >
          <p
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1rem",
              color: "var(--ow-text-mid)",
              maxWidth: "480px",
              lineHeight: 1.65,
            }}
          >
            Every answer is grounded in your winery's own documents — standard operating procedures, vintage records, supplier sheets — not generic internet content.
          </p>
          <a href="/pricing" className="btn-amber">
            Start Free Trial
          </a>
        </div>
      </div>
    </section>
  );
}

// ─── CTA ──────────────────────────────────────────────────────────────────────
function CTA() {
  return (
    <section className="relative py-32 overflow-hidden">
      <div className="absolute inset-0">
        <img src={VINEYARD_IMG} alt="Vineyard" className="w-full h-full object-cover" style={{filter:"brightness(0.2) saturate(0.6)"}} />
        <div className="absolute inset-0" style={{background:"linear-gradient(to bottom, var(--ow-bg-base), color-mix(in oklch, var(--ow-bg-base) 70%, transparent), var(--ow-bg-base))"}} />
      </div>
      <div className="container relative z-10 text-center">
        <p className="section-label mb-6">Get Started</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"clamp(2rem,4.5vw,3.5rem)", color:"var(--ow-text-hi)", lineHeight:1.1, letterSpacing:"-0.02em", maxWidth:"640px", margin:"0 auto", textWrap: 'balance' as 'balance'}}>
          Your winery's most knowledgeable apprentice is ready.
        </h2>
        <p className="mt-6 mx-auto" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"1.125rem", color:"var(--ow-text-mid)", maxWidth:"480px", lineHeight:1.7}}>
          Start your 14-day free trial. No credit card. No setup fee. Cancel anytime.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a href="/pricing?from=home-final-cta" className="btn-amber" data-testid="home-final-cta-trial">Start 14-Day Free Trial</a>
          <Link href="/try?from=home-final-cta" className="btn-ghost" data-testid="home-final-cta-sandbox" style={{ borderColor: "var(--ow-amber)", color: "var(--ow-amber)", fontWeight: 600 }}>
            Play the 10-min sandbox
          </Link>
        </div>
        {/* Bookend audience router — mirrors the hero pill strip so we
            end the page with the same "which are you?" self-sort. */}
        <div
          className="mt-8 flex flex-wrap justify-center items-center gap-3"
          data-testid="home-final-cta-audience-router"
        >
          <span
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.72rem",
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--ow-text-lo)",
              fontWeight: 600,
            }}
          >
            Not sure yet?
          </span>
          <Link
            href="/ask?from=home-final-router-curious"
            data-testid="home-final-router-curious"
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "999px",
              border: "1px solid var(--ow-border-md)",
              color: "var(--ow-text-mid)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            🍷 Try the answer engine (free) →
          </Link>
          <Link
            href="/join?from=home-final-router-pro"
            data-testid="home-final-router-pro"
            style={{
              padding: "0.4rem 0.85rem",
              borderRadius: "999px",
              border: "1px solid var(--ow-border-md)",
              color: "var(--ow-text-mid)",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              textDecoration: "none",
            }}
          >
            🍇 Book a winemaker call →
          </Link>
        </div>
        <p className="mt-8" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}>
          Questions? Email us at <span style={{color:"var(--ow-amber)"}}>support@ownology.ai</span>
        </p>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  // Column-based structure prevents the horizontal-scroll mess of the
  // previous 10-link row. Each link group has a clear purpose; the
  // "learn" column surfaces the Cellar Journal prominently.
  const footerLinkStyle: React.CSSProperties = {
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.8125rem",
    color: "var(--ow-text-lo)",
    textDecoration: "none",
    display: "block",
    padding: "0.15rem 0",
    transition: "color 180ms ease",
  };
  const hover = (e: React.MouseEvent<HTMLAnchorElement>) =>
    (e.currentTarget.style.color = "var(--ow-amber)");
  const unhover = (e: React.MouseEvent<HTMLAnchorElement>) =>
    (e.currentTarget.style.color = "var(--ow-text-lo)");

  const columns: Array<{ heading: string; links: Array<{ label: string; href: string; testid?: string }> }> = [
    {
      heading: "Product",
      links: [
        { label: "Pricing", href: "/pricing" },
        { label: "Cellar Brief", href: "/cellar-brief", testid: "footer-cellar-brief" },
        { label: "Ask Ownology", href: "/free-run" },
        { label: "Sample vintage log", href: "/sample-vintage-log" },
        { label: "Merch", href: "/merch" },
      ],
    },
    {
      heading: "Library",
      links: [
        { label: "Cellar Journal", href: "/cellar-journal", testid: "footer-cellar-journal" },
        { label: "Knowledge base", href: "/knowledge" },
        { label: "Regulations", href: "/regulations" },
        { label: "Compliance", href: "/compliance" },
        { label: "Blog", href: "/blog" },
      ],
    },
    {
      heading: "For",
      links: [
        { label: "Home winemakers", href: "/for-home-winemakers" },
        { label: "InnoVint users", href: "/for-innovint-users" },
        { label: "Vintrace users", href: "/for-vintrace-users" },
        { label: "Why Ownology", href: "/why-ownology" },
      ],
    },
    {
      heading: "Legal",
      links: [
        { label: "Privacy policy", href: "/privacy", testid: "footer-privacy" },
        { label: "Terms of service", href: "/terms", testid: "footer-terms" },
        { label: "Refund policy", href: "/refund", testid: "footer-refund" },
      ],
    },
  ];

  return (
    <footer className="py-12" style={{ borderTop: "1px solid var(--ow-border)" }}>
      <div className="container">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-8 md:gap-10">
          <div>
            <OwnologyLogo size={28} />
            <p
              className="mt-4"
              style={{
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.8125rem",
                color: "var(--ow-text-lo)",
                lineHeight: 1.55,
                margin: "1rem 0 0",
              }}
            >
              AI knowledge assistant for boutique winemakers.
              <br />
              Aus &middot; NZ &middot; US.
            </p>
          </div>
          {columns.map((col) => (
            <div key={col.heading}>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.72rem",
                  textTransform: "uppercase",
                  letterSpacing: "0.1em",
                  color: "var(--ow-text-mid)",
                  margin: "0 0 0.75rem 0",
                  fontWeight: 700,
                }}
              >
                {col.heading}
              </p>
              {col.links.map((l) => (
                <Link
                  key={l.href}
                  href={l.href}
                  data-testid={l.testid}
                  style={footerLinkStyle}
                  onMouseEnter={hover}
                  onMouseLeave={unhover}
                >
                  {l.label}
                </Link>
              ))}
            </div>
          ))}
        </div>
        <div
          className="mt-10 pt-6 flex flex-col sm:flex-row justify-between gap-3"
          style={{ borderTop: "1px solid var(--ow-border)" }}
        >
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.75rem",
              color: "var(--ow-text-lo)",
              margin: 0,
            }}
          >
            © 2026 Ownology.
          </p>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  // ── UI_PILLARS_V1 · Feb 2026 · flag-gated section pruning ──
  // When the 4-pillar hero is live, the top-fold already IS the "How It
  // Works" story (Do · Know · Learn · Guide with 4 flash-cards each linking
  // to a live surface). Rendering the legacy <HowItWorks/> section right
  // below would repeat the same 4 pillars a second time — cognitive
  // duplication that undermines the simplicity the hero just promised.
  //
  // Also pruned when flag ON: <PainPoints/>, <WeightOfHarvest/>,
  // <WhatOwnologyKnows/>. All three are prose-heavy scroll-forever blocks
  // that dilute the ruthless top-fold discipline we're testing this cycle.
  // The core marketing story becomes: Hero → Features → Demo → Testimonials
  // → Founder → Pricing → CTA → FAQ. Old page returns instantly on ?ui=v0.
  const pillarsV1 = useUiPillarsV1();
  return (
    <div className="min-h-screen" style={{background:"var(--ow-bg-base)"}}>
      <Nav />
      <WhatsNewRibbon />
      {/* Cycling 3-scene hero — panic → market gap → Owen (Feb 2026, Rich).
          Replaces the dense V1 Hero on the primary landing surface.
          The old <Hero /> component still exists but is no longer
          rendered here. If you want to preview it, append ?ui=v0 and
          the site will fall back to the pillars flag branch. */}
      <HeroCarousel onSkip={() => { const el = document.getElementById("home-below-fold"); if (el) el.scrollIntoView({ behavior: "smooth" }); }} />
      <div id="home-below-fold" />
      <WhyOwnologyBoxes />
      <TrustChips />
      {!pillarsV1 && <PainPoints />}
      <Features />
      {!pillarsV1 && <HowItWorks />}
      <DemoVideo />
      <Testimonials />
      {/* FounderStory temporarily hidden (Feb 2026, Rich) — photos flagged
          as "broken/rich+gel in winery". Restore after reshoot or restyle. */}
      {/* <FounderStory /> */}
      <ApcoStrip />
      <Pricing />
      {!pillarsV1 && <WeightOfHarvest />}
      {!pillarsV1 && <WhatOwnologyKnows />}
      <CTA />
      <FAQ />
      {/* Footer is now mounted site-wide via App.tsx > SiteFooter */}
    </div>
  );
}
