/**
 * OWNOLOGY — "Cellar Intelligence" Dark Artisan Landing Page
 * Design: Dark warm-black backgrounds, amber gold accents, Fraunces serif display,
 *   Lato body, Fira Code for data readouts. Bento-grid features, animated demo.
 */

import { useEffect, useRef, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import FounderStory from "@/components/FounderStory";
import FAQ from "@/components/FAQ";
import { Link } from "wouter";
import ThemeToggle, { useOwnologyTheme } from "@/components/ThemeToggle";

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

// ─── Nav ──────────────────────────────────────────────────────────────────────
type NavItem = { label: string; href: string; external?: boolean };
const NAV_LINKS: NavItem[] = [
  { label: "Features",      href: "#features" },
  { label: "How It Works",  href: "#how-it-works" },
  { label: "Why Ownology",  href: "/why-ownology", external: false },
  { label: "Our Story",     href: "#our-story" },
  { label: "Pricing",       href: "#pricing" },
  { label: "FAQ",           href: "#faq" },
];

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

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
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || menuOpen ? "backdrop-blur-md border-b border-white/5" : ""
      }`}
        style={scrolled || menuOpen ? {background: "var(--ow-nav-bg)"} : undefined}
      >
        <div className="container flex items-center justify-between py-5">
          <OwnologyLogo size={36} />

          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-8">
            {NAV_LINKS.map(item => (
              item.href.startsWith("/") ? (
                <Link key={item.label} href={item.href}
                  className="text-sm font-light tracking-wide transition-colors"
                  style={{color:"var(--ow-text-lo)", fontFamily:"'Lato',sans-serif"}}
                  onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-amber)")}
                  onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color="var(--ow-text-lo)")}
                >{item.label}</Link>
              ) : (
                <a key={item.label} href={item.href}
                  className="text-sm font-light tracking-wide transition-colors"
                  style={{color:"var(--ow-text-lo)", fontFamily:"'Lato',sans-serif"}}
                  onMouseEnter={e=>(e.currentTarget.style.color="var(--ow-amber)")}
                  onMouseLeave={e=>(e.currentTarget.style.color="var(--ow-text-lo)")}
                >{item.label}</a>
              )
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <ThemeToggle compact />
            <a href="#pricing" className="btn-amber text-xs inline-flex items-center">
              Start Free Trial
            </a>
          </div>

          {/* Hamburger button — mobile only */}
          {/* Mobile: theme toggle + hamburger */}
          <div className="md:hidden flex items-center gap-2">
          <ThemeToggle compact />
          <button
            className="flex flex-col justify-center items-center w-10 h-10 gap-1.5 rounded-sm transition-colors"
            style={{background: menuOpen ? "var(--ow-bg-card)" : "transparent"}}
            onClick={() => setMenuOpen(o => !o)}
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
          >
            <span
              className="block w-5 h-px transition-all duration-300 origin-center"
              style={{
                background: "oklch(0.72 0.12 75)",
                transform: menuOpen ? "translateY(4px) rotate(45deg)" : "none",
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300"
              style={{
                background: "oklch(0.72 0.12 75)",
                opacity: menuOpen ? 0 : 1,
                transform: menuOpen ? "scaleX(0)" : "scaleX(1)",
              }}
            />
            <span
              className="block w-5 h-px transition-all duration-300 origin-center"
              style={{
                background: "oklch(0.72 0.12 75)",
                transform: menuOpen ? "translateY(-4px) rotate(-45deg)" : "none",
              }}
            />
          </button>
          </div>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className="fixed inset-0 z-40 md:hidden transition-opacity duration-300"
        style={{
          background: "oklch(0 0 0 / 0.6)",
          opacity: menuOpen ? 1 : 0,
          pointerEvents: menuOpen ? "auto" : "none",
        }}
        onClick={() => setMenuOpen(false)}
        aria-hidden="true"
      />

      {/* Mobile drawer panel */}
      <div
        className="fixed top-0 left-0 right-0 z-40 md:hidden transition-transform duration-300 ease-out"
        style={{
          background: "var(--ow-bg-base)",
          borderBottom: "1px solid var(--ow-border)",
          transform: menuOpen ? "translateY(0)" : "translateY(-100%)",
          paddingTop: "80px",
          paddingBottom: "2rem",
          boxShadow: "0 24px 60px var(--ow-shadow)",
        }}
      >
        <div className="container flex flex-col gap-1">
          {NAV_LINKS.map((item, i) => {
            const sharedStyle = {
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "var(--ow-text-mid)",
              borderBottom: i < NAV_LINKS.length - 1 ? "1px solid var(--ow-border)" : "none",
              letterSpacing: "0.01em",
            };
            const chevron = (
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M6 4l4 4-4 4" stroke="oklch(0.72 0.12 75)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            );
            return item.href.startsWith("/") ? (
              <Link
                key={item.label}
                href={item.href}
                onClick={handleNavClick}
                className="flex items-center justify-between py-4 transition-colors"
                style={sharedStyle}
                onMouseEnter={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "var(--ow-amber)")}
                onMouseLeave={(e: React.MouseEvent<HTMLAnchorElement>) => (e.currentTarget.style.color = "var(--ow-text-mid)")}
              >
                {item.label}{chevron}
              </Link>
            ) : (
              <a
                key={item.label}
                href={item.href}
                onClick={handleNavClick}
                className="flex items-center justify-between py-4 transition-colors"
                style={sharedStyle}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-mid)")}
              >
                {item.label}{chevron}
              </a>
            );
          })}

          {/* CTA in mobile menu */}
          <a
            href="#pricing"
            onClick={handleNavClick}
            className="btn-amber w-full text-center mt-4"
            style={{display: "block", textAlign: "center"}}
          >
            Start Free Trial
          </a>
        </div>
      </div>
    </>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  const aiResponse = "Based on your current YAN of 120ppm and a starting Brix of 24.3, I recommend adding 2.6 kg of DAP to Tank 7 — split 50% at inoculation, 50% at ⅓ sugar depletion. This targets a YAN of 200ppm, optimal for your Shiraz house style.";
  const { displayed, done } = useTypewriter(aiResponse, 22, 1200);

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
            <p className="section-label mb-6 fade-up">AI Knowledge Assistant for Winemakers</p>
            <h1 className="fade-up fade-up-delay-1"
              style={{fontFamily:"'Fraunces',serif", fontWeight:700, fontSize:"clamp(2.5rem,5vw,4rem)", lineHeight:1.08, color:"var(--ow-text-hi)", letterSpacing:"-0.02em"}}>
              Your cellar's<br/>
              <em style={{color:"var(--ow-amber)", fontStyle:"italic"}}>most knowledgeable</em><br/>
              apprentice.
            </h1>
            <p className="mt-6 fade-up fade-up-delay-2"
              style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"1.125rem", lineHeight:1.7, color:"var(--ow-text-mid)", maxWidth:"480px"}}>
              Ownology gives boutique winery teams instant, document-grounded answers to their toughest cellar questions — from a mobile phone, in seconds, during harvest.
            </p>
            <div className="flex flex-wrap gap-4 mt-10 fade-up fade-up-delay-3">
              <a href="#pricing" className="btn-amber">Start 14-Day Free Trial</a>
              <a href="#how-it-works" className="btn-ghost">See How It Works</a>
            </div>
            {/* Trust bar */}
            <div className="mt-12 flex items-center gap-6 fade-up fade-up-delay-4">
              <div className="amber-rule flex-1" />
              <p style={{fontFamily:"'Lato',sans-serif", fontSize:"0.75rem", color:"var(--ow-text-lo)", letterSpacing:"0.08em", whiteSpace:"nowrap"}}>
                TRUSTED BY BOUTIQUE WINERIES ACROSS AU · NZ · US
              </p>
              <div className="amber-rule flex-1" />
            </div>
          </div>

          {/* Right — live demo card */}
          <div className="fade-up fade-up-delay-2">
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
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.75rem,3.5vw,2.75rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
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
  return (
    <section id="features" className="py-28">
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Features</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.75rem,3.5vw,2.75rem)", color:"var(--ow-text-hi)", maxWidth:"560px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
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
              <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>AI Knowledge Assistant</h3>
              <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7, maxWidth:"420px"}}>
                Ask anything — from complex SO2 calculations to your own harvest protocols. The assistant searches your uploaded documents and world-class wine science literature, then delivers a precise, cited answer in seconds.
              </p>
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
              <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>Smart Cellar Logbook</h3>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>
              Log by voice or photo. Snap a handwritten lab slip — Ownology extracts and structures the data automatically. No keyboard. No delay.
            </p>
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
              <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.25rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>Fermentation Dashboard</h3>
            <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>
              Monitor all active fermentations at a glance. Proactive alerts when a tank deviates from its expected Brix trajectory — before a problem becomes a crisis.
            </p>
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

          {/* Feature 4 — Document Vault */}
          <div className={`md:col-span-2 cellar-card overflow-hidden ${inView ? "fade-up fade-up-delay-3" : "opacity-0"}`}>
            <div className="grid md:grid-cols-2 gap-0 h-full">
              <div className="p-8">
                <div className="w-10 h-10 rounded-sm flex items-center justify-center mb-5" style={{background:"oklch(0.62 0.10 45 / 12%)", border:"1px solid oklch(0.62 0.10 45 / 25%)"}}>
                  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                    <path d="M4 3h7l3 3v9a1 1 0 01-1 1H4a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5"/>
                    <path d="M11 3v4h3" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinejoin="round"/>
                    <path d="M6 10h6M6 13h4" stroke="oklch(0.62 0.10 45)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <h3 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"1.375rem", color:"var(--ow-text-hi)", marginBottom:"0.75rem"}}>Document Vault</h3>
                <p style={{fontFamily:"'Lato',sans-serif", fontWeight:300, fontSize:"0.9375rem", color:"var(--ow-text-mid)", lineHeight:1.7}}>
                  Upload your SOPs, vintage reports, sensory notes, and protocols. Ownology indexes them instantly — making every document searchable through natural conversation. Your institutional memory, finally accessible.
                </p>
                <div className="mt-6 flex flex-col gap-2">
                  {["Shiraz Harvest Protocol 2024.pdf","SO2 Management SOP.docx","Fermentation Targets — All Varieties.pdf","Bottling Line Cleaning Procedure.pdf"].map(f=>(
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
    { n:"01", title:"Upload Your Documents", body:"Add your SOPs, vintage reports, and protocols to the Document Vault. Ownology indexes them automatically — no setup required." },
    { n:"02", title:"Ask Anything", body:"Open the assistant on your phone in the cellar or vineyard. Ask in plain language — voice or text. No special commands, no menus." },
    { n:"03", title:"Get Grounded Answers", body:"The assistant searches your documents and wine science literature simultaneously, then generates a precise, cited answer. Every response shows its source." },
    { n:"04", title:"Log and Track", body:"Use the Smart Logbook to record daily readings by voice or photo. The Fermentation Dashboard tracks all active tanks and alerts you to anomalies." },
  ];
  return (
    <section id="how-it-works" className="py-28 relative overflow-hidden" style={{background:"var(--ow-bg-raised)"}}>
      <div className="absolute inset-0 opacity-5">
        <img src={HERO_IMG} alt="" className="w-full h-full object-cover" />
      </div>
      <div className="container relative z-10" ref={ref}>
        <p className="section-label mb-4">How It Works</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.75rem,3.5vw,2.75rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
          From upload to answer in under a minute.
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
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.75rem,3.5vw,2.75rem)", color:"var(--ow-text-hi)", maxWidth:"480px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
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
      features:["AI Knowledge Assistant","Document Vault (10 documents)","Smart Cellar Logbook","Fermentation Dashboard","2 user seats","14-day free trial"],
      cta:"Start Free Trial", highlight:false,
    },
    {
      name:"Cellar", price:"$249", period:"/month", cases:"5,001–20,000 cases",
      features:["Everything in Harvest","Unlimited documents","Fermentation anomaly alerts","5 user seats","Email & SMS notifications","Priority support"],
      cta:"Start Free Trial", highlight:true,
    },
    {
      name:"Estate", price:"$499", period:"/month", cases:"20,001+ cases",
      features:["Everything in Cellar","Unlimited user seats","API access","Custom knowledge corpus","Dedicated onboarding","SLA guarantee"],
      cta:"Contact Us", highlight:false,
    },
  ];
  return (
    <section id="pricing" className="py-28" style={{background:"var(--ow-bg-raised)"}}>
      <div className="container" ref={ref}>
        <p className="section-label mb-4">Pricing</p>
        <h2 style={{fontFamily:"'Fraunces',serif", fontWeight:600, fontSize:"clamp(1.75rem,3.5vw,2.75rem)", color:"var(--ow-text-hi)", maxWidth:"520px", lineHeight:1.2, letterSpacing:"-0.01em"}}>
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
          <a href="#pricing" className="btn-amber">Start Free Trial</a>
          <a href="mailto:hello@ownology.ai" className="btn-ghost">Talk to Us</a>
        </div>
        <p className="mt-8" style={{fontFamily:"'Lato',sans-serif", fontSize:"0.8125rem", color:"var(--ow-text-lo)"}}>
          Questions? Email us at <span style={{color:"var(--ow-amber)"}}>hello@ownology.ai</span>
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
      <Hero />
      <PainPoints />
      <Features />
      <HowItWorks />
      <Testimonials />
      <FounderStory />
      <Pricing />
      <CTA />
      <FAQ />
      <Footer />
    </div>
  );
}
