/**
 * OWNOLOGY — "Cellar Intelligence" Dark Artisan Landing Page
 * Design: Dark warm-black backgrounds, amber gold accents, Fraunces serif display,
 *   Lato body, Fira Code for data readouts. Bento-grid features, animated demo.
 */

import { useEffect, useRef, useState, useCallback } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import FounderStory from "@/components/FounderStory";
import FAQ from "@/components/FAQ";
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
          color: "oklch(0.11 0.008 60)",
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
        <strong style={{ fontWeight: 600, color: "var(--ow-text-hi)" }}>Knowledge Platform</strong> is live — 31 industry SOPs, Decision Logic &amp; Tribal Knowledge capture.
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
// Primary links — always visible in desktop nav
const PRIMARY_NAV: NavItem[] = [
  { label: "Features",     href: "#features" },
  { label: "How It Works", href: "#how-it-works" },
  { label: "See Demo",     href: "#demo" },
  { label: "Why Ownology", href: "/why-ownology" },
];
// Secondary links — grouped by four product pillars
// DO pillar: operational cellar tools
const VINTAGE_NAV: NavItem[] = [
  { label: "Dashboard",    href: "/dashboard" },
  { label: "The Press",    href: "/the-press" },
  { label: "Cellar Tasks", href: "/cellar-tasks" },
  { label: "Vineyard",     href: "/vineyard" },
  { label: "Quick Entry",  href: "/quick-entry" },
];
// KNOW pillar: knowledge platform + compliance
const KNOWLEDGE_NAV: NavItem[] = [
  { label: "Knowledge Platform", href: "/knowledge" },
  { label: "Compliance AI",      href: "/compliance" },
];
// LEARN pillar + business
const BUSINESS_NAV: NavItem[] = [
  { label: "Free Run",            href: "/free-run" },
  { label: "Why Ownology",        href: "/why-ownology" },
  { label: "For Home Winemakers", href: "/for-home-winemakers" },
  { label: "Blog",                href: "/blog" },
];
// GUIDE pillar
const GUIDE_NAV: NavItem[] = [
  { label: "Guide — Getting Started", href: "/guide" },
  { label: "Compliance AI",           href: "/compliance" },
  { label: "Regulations Library",     href: "/regulations" },
  { label: "⚙ Build Index",           href: "/build-index" },
];
const MORE_NAV: NavItem[] = [
  { label: "Our Story",    href: "#our-story" },
  { label: "Pricing",      href: "/pricing" },
  { label: "FAQ",          href: "#faq" },
  ...VINTAGE_NAV,
  ...KNOWLEDGE_NAV,
  ...BUSINESS_NAV,
];
const NAV_LINKS: NavItem[] = [...PRIMARY_NAV, ...MORE_NAV];

// ─── More dropdown ───────────────────────────────────────────────────────────
function NavLink({ item, close }: { item: NavItem; close: () => void }) {
  const cls = "block px-4 py-1.5 text-sm transition-colors";
  const sty = {color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", fontWeight: 300 as const};
  const enter = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "var(--ow-amber)");
  const leave = (e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "var(--ow-text-mid)");
  return item.href.startsWith("/") ? (
    <Link href={item.href} onClick={close} className={cls} style={sty} onMouseEnter={enter} onMouseLeave={leave}>{item.label}</Link>
  ) : (
    <a href={item.href} onClick={close} className={cls} style={sty} onMouseEnter={enter} onMouseLeave={leave}>{item.label}</a>
  );
}

function MoreDropdown({ extraItems }: { extraItems?: NavItem[] }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) close();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [close]);

  const generalLinks: NavItem[] = [
    { label: "Our Story", href: "#our-story" },
    { label: "Pricing",   href: "/pricing" },
    { label: "FAQ",       href: "#faq" },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 text-sm font-light tracking-wide transition-colors"
        style={{color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", background: "none", border: "none", cursor: "pointer", padding: 0}}
        onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-mid)")}
        aria-haspopup="true"
        aria-expanded={open}
      >
        More
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{marginTop:"1px", transition:"transform 0.2s", transform: open ? "rotate(180deg)" : "none"}}>
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>
      {open && (
        <div
          className="absolute top-full right-0 mt-2 rounded-sm"
          style={{background: "var(--ow-bg-card)", border: "1px solid var(--ow-border)", minWidth: "320px", boxShadow: "0 8px 24px var(--ow-shadow)", zIndex: 100}}
        >
          {/* General links */}
          <div className="py-2 px-1">
            {generalLinks.map(item => <NavLink key={item.label} item={item} close={close} />)}
          </div>
          {/* Four-column pillar section */}
          <div className="grid grid-cols-4" style={{borderTop: "1px solid var(--ow-border)", minWidth: "420px"}}>
            <div className="py-3 px-1" style={{borderRight: "1px solid var(--ow-border)"}}>
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.6rem", letterSpacing:"0.12em", color:"var(--ow-amber)", textTransform:"uppercase", padding:"0 0.75rem 0.5rem"}}>Do</p>
              {VINTAGE_NAV.map(item => <NavLink key={item.label} item={item} close={close} />)}
            </div>
            <div className="py-3 px-1" style={{borderRight: "1px solid var(--ow-border)"}}>
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.6rem", letterSpacing:"0.12em", color:"var(--ow-amber)", textTransform:"uppercase", padding:"0 0.75rem 0.5rem"}}>Know</p>
              {KNOWLEDGE_NAV.map(item => <NavLink key={item.label} item={item} close={close} />)}
            </div>
            <div className="py-3 px-1" style={{borderRight: "1px solid var(--ow-border)"}}>
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.6rem", letterSpacing:"0.12em", color:"var(--ow-amber)", textTransform:"uppercase", padding:"0 0.75rem 0.5rem"}}>Learn</p>
              {BUSINESS_NAV.map(item => <NavLink key={item.label} item={item} close={close} />)}
            </div>
            <div className="py-3 px-1">
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.6rem", letterSpacing:"0.12em", color:"var(--ow-amber)", textTransform:"uppercase", padding:"0 0.75rem 0.5rem"}}>Guide</p>
              {GUIDE_NAV.map(item => <NavLink key={item.label} item={item} close={close} />)}
              {extraItems?.map(item => <NavLink key={item.label} item={item} close={close} />)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

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
            : "oklch(0.11 0.008 60 / 55%)",
        }}
      >
        <div className="container flex items-center justify-between py-5">
          <OwnologyLogo size={36} />

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
            <MoreDropdown extraItems={isOwner ? [{ label: "Admin", href: "/admin" }, { label: "⚙ Build Index", href: "/build-index" }] : undefined} />
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle compact />
            <a href="/pricing" className="btn-amber text-xs inline-flex items-center">
              Start Free Trial
            </a>
          </div>

          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-1">
            <ThemeToggle compact />
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
                    <path d="M5 5l12 12M17 5L5 17" stroke="oklch(0.72 0.12 75)" strokeWidth="1.8" strokeLinecap="round"/>
                  </>
                ) : (
                  <>
                    <path d="M3 6h16M3 11h16M3 16h16" stroke="oklch(0.72 0.12 75)" strokeWidth="1.8" strokeLinecap="round"/>
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
          <OwnologyLogo size={32} />
          <button
            className="touch-target rounded-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Close menu"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none" aria-hidden="true">
              <path d="M5 5l12 12M17 5L5 17" stroke="oklch(0.72 0.12 75)" strokeWidth="1.8" strokeLinecap="round"/>
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

          {/* Admin — owner only */}
          {isOwner && (
            <div className="pt-2">
              <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.65rem", letterSpacing: "0.14em", color: "var(--ow-text-lo)", textTransform: "uppercase", padding: "0.75rem 0 0.25rem" }}>Owner</p>
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
              <Link
                href="/build-index"
                onClick={handleNavClick}
                className="flex items-center justify-between transition-colors"
                style={{ fontFamily: "'Lato',sans-serif", fontWeight: 400, fontSize: "0.9375rem", color: "var(--ow-text-mid)", borderBottom: "1px solid var(--ow-border)", letterSpacing: "0.01em", minHeight: "48px" }}
              >
                <span className="flex items-center gap-2">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true"><circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.3"/><path d="M5 7h4M7 5v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
                  Build Index
                </span>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true"><path d="M6 4l4 4-4 4" stroke="var(--ow-border)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </Link>
            </div>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* CTA */}
          <div
            style={{
              paddingBottom: "max(2rem, env(safe-area-inset-bottom))",
              paddingTop: "1.5rem",
            }}
          >
            <a
              href="/pricing"
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
  const aiResponse = "Based on your current YAN of 120ppm and a starting Brix of 24.3, I recommend adding 2.6 kg of DAP to Tank 7 — split 50% at inoculation, 50% at ⅓ sugar depletion. This targets a YAN of 200ppm, optimal for your Shiraz house style.";
  const { displayed, done } = useTypewriter(aiResponse, 22, 1200);
  const { contentMap } = useSiteContent();

  return (
    <section className="relative min-h-screen flex items-center overflow-hidden grain-overlay">
      {/* Background image */}
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Wine cellar" className="w-full h-full object-cover" style={{filter:"brightness(0.28)"}} />
        <div className="absolute inset-0" style={{background:"linear-gradient(135deg, var(--ow-bg-base) 0%, transparent 60%, color-mix(in oklch, var(--ow-bg-base) 60%, transparent) 100%)"}} />
        <div className="absolute inset-0" style={{background:"linear-gradient(to top, var(--ow-bg-base) 0%, transparent 50%)"}} />
      </div>

      <div className="container relative z-10 pt-32 pb-24">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left — copy */}
          <div>
            <EditableText contentKey="home.hero.label" defaultValue="Cellar Intelligence Platform for Winemakers" as="p" className="section-label mb-6 fade-up" contentMap={contentMap} />
            <h1 className="fade-up fade-up-delay-1"
              style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"clamp(2rem,5vw,4rem)", lineHeight:1.1, color:"var(--ow-text-hi)", letterSpacing:"-0.02em"}}>
              <EditableText contentKey="home.hero.headline" defaultValue="Your cellar's most knowledgeable apprentice." contentMap={contentMap} />
            </h1>
            <EditableText contentKey="home.hero.subheading" defaultValue="Log cellar readings. Access 31 industry SOPs. Ask the AI anything. Stay compliant. Ownology is the complete intelligence platform for boutique winery teams — on a mobile phone, during harvest." as="p" className="mt-6 fade-up fade-up-delay-2" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"1.125rem", lineHeight:1.7, color:"var(--ow-text-mid)", maxWidth:"480px"}} multiline contentMap={contentMap} />
            <div className="flex flex-col sm:flex-row flex-wrap gap-3 mt-10 fade-up fade-up-delay-3">
              <a href="/pricing" className="btn-amber text-center">Start 14-Day Free Trial</a>
              <a href="#how-it-works" className="btn-ghost text-center">See How It Works</a>
              <Link href="/compliance" className="btn-ghost flex items-center justify-center gap-2" style={{borderColor:"color-mix(in oklch, var(--ow-amber) 30%, transparent)", color:"var(--ow-text-mid)"}}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                  <path d="M7 1C3.69 1 1 3.69 1 7s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6Zm.5 9h-1V6.5h1V10Zm0-4.5h-1V4h1v1.5Z" fill="currentColor"/>
                </svg>
                Ask a Compliance Question
              </Link>
            </div>
            {/* Trust bar */}
            <div className="mt-12 flex items-center gap-4 fade-up fade-up-delay-4">
              <div className="amber-rule flex-1 hidden sm:block" />
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.7rem", color:"var(--ow-text-lo)", letterSpacing:"0.06em", textAlign:"center"}}>
                TRUSTED BY BOUTIQUE WINERIES ACROSS AU · NZ · US
              </p>
              <div className="amber-rule flex-1 hidden sm:block" />
            </div>
          </div>

          {/* Right — live demo card — hidden on mobile to prevent overflow */}
          <div className="hidden lg:block fade-up fade-up-delay-2">
            <div className="cellar-card p-5 max-w-md ml-auto" style={{border:"1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)"}}>
              {/* Header */}
              <div className="flex items-center gap-3 mb-4 pb-4" style={{borderBottom:"1px solid var(--ow-border)"}}>
                <div className="w-2 h-2 rounded-full" style={{background:"oklch(0.72 0.12 75)"}} />
                <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.75rem", color:"var(--ow-text-lo)", letterSpacing:"0.1em", textTransform:"uppercase"}}>Ownology Assistant</span>
                <div className="ml-auto flex gap-1.5">
                  {["oklch(0.72 0.12 75 / 30%)","oklch(0.72 0.12 75 / 50%)","oklch(0.72 0.12 75)"].map((c,i)=>(
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
                <div className="w-6 h-6 rounded-sm flex-shrink-0 flex items-center justify-center mt-0.5" style={{background:"oklch(0.72 0.12 75 / 15%)", border:"1px solid oklch(0.72 0.12 75 / 30%)"}}>
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <circle cx="5" cy="5" r="3.5" stroke="oklch(0.72 0.12 75)" strokeWidth="1.2"/>
                    <path d="M5 3v2l1.5 1" stroke="oklch(0.72 0.12 75)" strokeWidth="1.2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="text-sm leading-relaxed" style={{color:"var(--ow-text-mid)", fontFamily:"'Lato',sans-serif", lineHeight:1.65}}>
                  {displayed}
                  {!done && <span className="cursor-blink" style={{color:"oklch(0.72 0.12 75)"}}>|</span>}
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
                  ↳ Sourced from: <em>Your Shiraz SOP · Scott Labs YAN Guide</em>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
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
              <span className="data-readout text-xs mb-4 block" style={{color:"oklch(0.72 0.12 75 / 60%)"}}>{p.num}</span>
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
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
          Everything your team needs. Nothing they don't.
        </h2>
        <div className="amber-rule mt-8 mb-12" />

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* Feature 1 — large */}
          <div className={`md:col-span-2 cellar-card overflow-hidden ${inView ? "fade-up" : "opacity-0"}`}>
            <div className="p-8">
              <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.72 0.12 75 / 12%)", border:"1px solid oklch(0.72 0.12 75 / 25%)"}}>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                  <path d="M3 9h12M9 3l6 6-6 6" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <EditableText contentKey="home.features.ask.title" defaultValue="AI Knowledge Assistant" as="h3" style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}} contentMap={contentMap} />
              <EditableText contentKey="home.features.ask.body" defaultValue="Ask anything — from complex SO2 calculations to your own harvest protocols. The assistant searches your uploaded documents and world-class wine science literature, then delivers a precise, cited answer in seconds." as="p" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7, maxWidth:"420px"}} multiline contentMap={contentMap} />
              <div className="mt-6 p-4 rounded-sm" style={{background:"var(--ow-bg-base)", border:"1px solid var(--ow-border)"}}>
                <p className="data-readout text-xs mb-2" style={{color:"oklch(0.72 0.12 75 / 60%)"}}>EXAMPLE QUERY</p>
                <p style={{fontFamily:"'Fira Code',monospace", fontSize:"0.8125rem", color:"oklch(0.72 0.12 75)", lineHeight:1.6}}>
                  "What is the target Free SO2 for our barrel-aged Chardonnay before bottling, and how much KMS for a 60-gallon barrel at 15ppm?"
                </p>
              </div>
            </div>
            <img src={LAB_IMG} alt="Winery lab" className="w-full h-48 object-cover" style={{filter:"brightness(0.5) saturate(0.8)"}} />
          </div>

          {/* Feature 2 */}
          <div className={`cellar-card p-8 ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}>
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
            <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.72 0.12 75 / 12%)", border:"1px solid oklch(0.72 0.12 75 / 25%)"}}>
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M3 14 L6 8 L9 11 L12 5 L15 9" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <circle cx="15" cy="9" r="1.5" fill="oklch(0.72 0.12 75)"/>
              </svg>
            </div>
              <EditableText contentKey="home.features.comply.title" defaultValue="Fermentation Dashboard" as="h3" style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}} contentMap={contentMap} />
            <EditableText contentKey="home.features.comply.body" defaultValue="Monitor all active fermentations at a glance. Proactive alerts when a tank deviates from its expected Brix trajectory — before a problem becomes a crisis." as="p" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}} multiline contentMap={contentMap} />
            {/* Mini chart */}
            <div className="mt-6 p-3 rounded-sm" style={{background:"var(--ow-bg-base)"}}>
              <div className="flex justify-between mb-2">
                <span className="data-readout text-xs" style={{color:"oklch(0.72 0.12 75 / 60%)"}}>TANK 7 · SHIRAZ</span>
                <span className="data-readout text-xs" style={{color:"oklch(0.72 0.12 75)"}}>DAY 8</span>
              </div>
              <svg viewBox="0 0 200 60" className="w-full" style={{height:"48px"}}>
                <path d="M0 8 C20 8, 40 14, 60 22 C80 30, 100 38, 120 44 C140 50, 160 54, 200 56" stroke="oklch(0.72 0.12 75 / 30%)" strokeWidth="1" fill="none" strokeDasharray="4 3"/>
                <path d="M0 8 C20 8, 40 15, 60 24 C80 33, 100 42, 130 50" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" fill="none"/>
                <circle cx="130" cy="50" r="3" fill="oklch(0.72 0.12 75)"/>
              </svg>
              <div className="flex justify-between mt-1">
                <span className="data-readout text-xs" style={{color:"oklch(0.50 0.010 75)"}}>24.3 Brix</span>
                <span className="data-readout text-xs" style={{color:"oklch(0.72 0.12 75)"}}>8.4 Brix</span>
              </div>
            </div>
          </div>

          {/* Feature 4 — Knowledge Platform */}
          <div className={`md:col-span-2 cellar-card overflow-hidden ${inView ? "fade-up fade-up-delay-3" : "opacity-0"}`}>
            <div className="grid md:grid-cols-2 gap-0 h-full">
              <div className="p-8">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.62 0.10 45 / 12%)", border:"1px solid oklch(0.62 0.10 45 / 25%)"}}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M3 4h12v10H3z" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M7 4V2M11 4V2" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
                    <path d="M6 8h6M6 11h4" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>Knowledge Platform</h3>
                <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>
                  31 industry-standard SOPs across 8 categories — from fermentation management to bottling. Capture the reasoning behind every decision in Decision Logic. Preserve your team's accumulated experience in Tribal Knowledge. Your winery's institutional memory, searchable and permanent.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  {["Fermentation Management · 6 SOPs","Additions & Nutrients · 5 SOPs","Cleaning & Sanitation · 4 SOPs","Packaging & Bottling · 4 SOPs"].map(f=>(
                    <div key={f} className="flex items-center gap-3 px-3 py-2 rounded-sm" style={{background:"var(--ow-bg-base)"}}>
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <path d="M3 2h5l2 2v6a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z" stroke="oklch(0.62 0.10 45)" strokeWidth="1"/>
                      </svg>
                      <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-mid)"}}>{f}</span>
                      <div className="ml-auto w-1.5 h-1.5 rounded-full" style={{background:"oklch(0.72 0.12 75)"}} />
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
    { n:"01", title:"Do — Log and Track", body:"Record cellar readings by voice or photo in The Press. The Fermentation Dashboard tracks all active tanks. Vineyard and Cellar Tasks keep your team aligned in real time." },
    { n:"02", title:"Know — Access Your SOPs", body:"31 industry-standard SOPs across 8 categories, ready to use on day one. Add your own Decision Logic and Tribal Knowledge. Every protocol is searchable, every decision is documented." },
    { n:"03", title:"Learn — Ask the AI", body:"Open Free Run and ask anything — from SO₂ calculations to stuck fermentation triage. The AI draws on your winery's own SOPs and world-class wine science, then delivers a precise, cited answer." },
    { n:"04", title:"Guide — Stay Compliant", body:"The Compliance AI answers regulatory questions across LIP, FSANZ, and state licensing. Every answer is grounded in current legislation — not generic internet content." },
  ];
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden" style={{background:"var(--ow-bg-raised)"}}>
      <div className="absolute inset-0 opacity-5">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="container relative z-10" ref={ref}>
        <p className="section-label mb-4">How It Works</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
          Do. Know. Learn. Guide.
        </h2>
        <div className="amber-rule mt-8 mb-16" />

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((s, i) => (
            <div key={s.n} className={`relative ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}>
              <div className="flex items-start gap-4 mb-4">
                <span style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"2.5rem", color:"oklch(0.72 0.12 75 / 20%)", lineHeight:1, minWidth:"2.5rem"}}>{s.n}</span>
                {i < steps.length - 1 && (
                  <div className="hidden lg:block absolute top-5 left-full w-full h-px" style={{background:"linear-gradient(to right, oklch(0.72 0.12 75 / 20%), transparent)", transform:"translateX(-50%)"}} />
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
            <div className="absolute -bottom-4 -right-4 px-4 py-2 rounded-sm" style={{background:"oklch(0.72 0.12 75)", fontFamily:"'Lato',sans-serif", fontWeight:700, fontSize:"0.75rem", color:"oklch(0.11 0.008 60)", letterSpacing:"0.04em", textTransform:"uppercase"}}>
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
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
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
  const quotes = [
    { q:"I make wine, I don't do data entry. By the time I update the spreadsheet on Friday, I've already forgotten what I observed on Tuesday. Ownology changed that completely.", name:"Owner-Winemaker", region:"Marlborough, NZ", cases:"6,200 cases" },
    { q:"During harvest I get asked the same questions every single day. Ownology answers them for me. I can finally focus on the wine.", name:"Head Winemaker", region:"Sonoma, CA", cases:"18,000 cases" },
    { q:"I work across eight clients. If I had something that could hold my protocols and answer questions on my behalf, I could take on two more clients. This is that thing.", name:"Consulting Winemaker", region:"Yarra Valley, VIC", cases:"8 clients" },
  ];
  return (
    <section className="py-28">
      <div className="container" ref={ref}>
        <p className="section-label mb-4">From the Cellar</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"480px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
          What winemakers are saying.
        </h2>
        <div className="amber-rule mt-8 mb-12" />
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((t, i) => (
            <div key={i} className={`cellar-card p-8 flex flex-col ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}>
              <div className="mb-5" style={{color:"oklch(0.72 0.12 75)", fontSize:"2rem", lineHeight:1, fontFamily:"'Fraunces',serif"}}>"</div>
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.75, flex:1, fontStyle:"italic"}}>
                {t.q}
              </p>
              <div className="mt-6 pt-5" style={{borderTop:"1px solid var(--ow-border)"}}>
                <p style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"0.9375rem", color:"var(--ow-text-hi)"}}>{t.name}</p>
                <p className="data-readout text-xs mt-1" style={{color:"var(--ow-text-lo)"}}>{t.region} · {t.cases}</p>
              </div>
            </div>
          ))}
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
      name:"Harvest", price:"$99", period:"/month", cases:"Up to 5,000 cases",
      features:["The Press — cellar logbook & fermentation tracking","Knowledge Platform — 31 industry SOPs","Free Run — AI assistant","Compliance AI — regulatory Q&A","2 user seats","14-day free trial"],
      cta:"Start Free Trial", highlight:false,
    },
    {
      name:"Cellar", price:"$249", period:"/month", cases:"5,001–20,000 cases",
      features:["Everything in Harvest","Vineyard & Cellar Tasks modules","Fermentation anomaly alerts","Decision Logic & Tribal Knowledge capture","5 user seats","Priority support"],
      cta:"Start Free Trial", highlight:true,
    },
    {
      name:"Estate", price:"$499", period:"/month", cases:"20,001+ cases",
      features:["Everything in Cellar","Unlimited user seats","Custom SOP library","Dedicated onboarding","API access","SLA guarantee"],
      cta:"Contact Us", highlight:false,
    },
  ];
  return (
    <section id="pricing" className="py-28" style={{background:"var(--ow-bg-raised)"}}>
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Pricing</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.5rem,2.8vw,2.25rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
          Priced by production scale. No surprises.
        </h2>
        <p className="mt-4" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, color:"var(--ow-text-mid)", fontSize:"1rem"}}>
          All plans include a 14-day free trial. No credit card required.
        </p>
        <div className="amber-rule mt-8 mb-12" />

        <div className="grid md:grid-cols-3 gap-6">
          {tiers.map((t, i) => (
            <div key={t.name} className={`relative flex flex-col ${inView ? `fade-up fade-up-delay-${i+1}` : "opacity-0"}`}
              style={{
                background: t.highlight ? "var(--ow-bg-card)" : "var(--ow-bg-raised)",
                border: t.highlight ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)" : "1px solid var(--ow-border)",
                borderRadius:"4px",
                padding:"2rem",
              }}>
              {t.highlight && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-sm text-xs font-bold tracking-widest uppercase"
                  style={{background:"oklch(0.72 0.12 75)", color:"oklch(0.11 0.008 60)", fontFamily:"'Lato',sans-serif"}}>
                  Most Popular
                </div>
              )}
              <p className="section-label mb-2">{t.name}</p>
              <div className="flex items-end gap-1 mb-1">
                <span style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"2.75rem", color:"var(--ow-text-hi)", lineHeight:1}}>{t.price}</span>
                <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.875rem", color:"var(--ow-text-lo)", paddingBottom:"0.35rem"}}>{t.period}</span>
              </div>
              <p className="data-readout text-xs mb-6" style={{color:"oklch(0.55 0.012 75)"}}>{t.cases}</p>
              <div className="amber-rule mb-6" />
              <ul className="flex flex-col gap-3 flex-1 mb-8">
                {t.features.map(f => (
                  <li key={f} className="flex items-start gap-3">
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                      <path d="M2.5 7l3 3 6-6" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <span style={{fontFamily:"'Lato',sans-serif", fontSize:"0.9rem", color:"var(--ow-text-mid)", fontWeight:300}}>{f}</span>
                  </li>
                ))}
              </ul>
              <button className={t.highlight ? "btn-amber w-full" : "btn-ghost w-full"}>
                {t.cta}
              </button>
            </div>
          ))}
        </div>

        {/* Consultant tier note */}
        <div className="mt-8 p-6 rounded-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
          style={{background:"var(--ow-bg-card)", border:"1px solid var(--ow-border)"}}>
          <div>
            <p style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.125rem", color:"var(--ow-text-hi)"}}>Consulting Winemaker?</p>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9rem", color:"var(--ow-text-mid)", marginTop:"0.25rem"}}>
              Manage multiple winery clients from a single account. $149/month per client with full Cellar features.
            </p>
          </div>
          <button className="btn-ghost flex-shrink-0">Learn More</button>
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
          className={`border-l-2 pl-6 max-w-2xl mx-auto text-center ${inView ? "fade-up fade-up-delay-4" : "opacity-0"}`}
          style={{ borderColor: "var(--ow-amber)" }}
        >
          <blockquote
            style={{
              fontFamily: "'Fraunces', serif",
              fontStyle: "italic",
              fontSize: "clamp(1.1rem, 2vw, 1.375rem)",
              lineHeight: 1.5,
              color: "var(--ow-text-hi)",
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
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"clamp(2rem,4.5vw,3.5rem)", color:"var(--ow-text-hi)", lineHeight:1.1, letterSpacing:"-0.02em", maxWidth:"640px", margin:"0 auto"}}>
          Your winery's most knowledgeable apprentice is ready.
        </h2>
        <p className="mt-6 mx-auto" style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"1.125rem", color:"var(--ow-text-mid)", maxWidth:"480px", lineHeight:1.7}}>
          Start your 14-day free trial. No credit card. No setup fee. Cancel anytime.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mt-10">
          <a href="/pricing" className="btn-amber">Start Free Trial</a>
          <a href="mailto:support@ownology.ai" className="btn-ghost">Talk to Us</a>
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
  return (
    <footer className="py-12" style={{borderTop:"1px solid var(--ow-border)"}}>
      <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
        <OwnologyLogo size={28} />
        <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}>
          © 2026 Ownology. AI Knowledge Assistant for Boutique Winemakers.
        </p>
        <div className="flex gap-6">
          {["Privacy","Terms","Contact"].map(l=>(
            <a key={l} href="#" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
              onMouseEnter={e=>(e.currentTarget.style.color="var(--ow-amber)")}
              onMouseLeave={e=>(e.currentTarget.style.color="var(--ow-text-lo)")}>{l}</a>
          ))}
          <Link href="/why-ownology" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Why Ownology</Link>
          <Link href="/for-innovint-users" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>For InnoVint Users</Link>
          <Link href="/for-vintrace-users" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>For Vintrace Users</Link>
          <Link href="/competitive-advantage" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Competitive Advantage</Link>
          <Link href="/blog" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Blog</Link>
          <Link href="/regulations" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Regulations</Link>
          <Link href="/compliance" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Compliance</Link>
          <Link href="/merch" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}
            onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
            onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}>Merch</Link>
        </div>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function Home() {
  return (
    <div className="min-h-screen" style={{background:"var(--ow-bg-base)"}}>
      <Nav />
      <WhatsNewRibbon />
      <Hero />
      <PainPoints />
      <Features />
      <HowItWorks />
      <DemoVideo />
      <Testimonials />
      <FounderStory />
      <Pricing />
      <WeightOfHarvest />
      <WhatOwnologyKnows />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
