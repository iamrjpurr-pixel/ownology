/**
 * OWNOLOGY — "For Winemakers" targeted landing page
 * Designed for direct outreach: boutique winery owners, head winemakers, consulting winemakers.
 * Includes a demo request form wired to the backend.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Image URLs ───────────────────────────────────────────────────────────────
const HERO_IMG     = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-hero-HqkryW7dQ2C9TbhdmJ8Kff.webp";
const VINEYARD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-vineyard-fbANbzVMm9rGzGepADg7Wn.webp";
const LAB_IMG      = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-lab-iE8kgBSQPMzX2Riaak43Cz.webp";

// ─── Intersection observer hook ───────────────────────────────────────────────
function useInView(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect(); } },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

// ─── Minimal Nav ──────────────────────────────────────────────────────────────
function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
      scrolled ? "bg-[oklch(0.11_0.008_60/97%)] backdrop-blur-md border-b border-white/5" : ""
    }`}>
      <div className="container flex items-center justify-between py-5">
        <Link href="/">
          <OwnologyLogo size={32} />
        </Link>
        <a
          href="#request-demo"
          className="px-5 py-2.5 rounded-sm text-sm font-semibold transition-all"
          style={{
            background: "oklch(0.72 0.12 75)",
            color: "oklch(0.11 0.008 60)",
            fontFamily: "'Lato', sans-serif",
            letterSpacing: "0.04em",
          }}
        >
          Request a Demo
        </a>
      </div>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <section className="relative min-h-screen flex items-center overflow-hidden">
      <div className="absolute inset-0">
        <img src={HERO_IMG} alt="Wine cellar" className="w-full h-full object-cover" style={{ filter: "brightness(0.22)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, oklch(0.11 0.008 60 / 85%) 0%, transparent 60%, oklch(0.11 0.008 60 / 65%) 100%)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to top, oklch(0.11 0.008 60) 0%, transparent 55%)" }} />
      </div>

      <div className="container relative z-10 pt-32 pb-24">
        <div className="max-w-3xl">
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1.5rem" }}>
            For Boutique Winemakers
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(2.5rem, 5vw, 4.25rem)", lineHeight: 1.06, color: "oklch(0.95 0.018 75)", letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
            Your cellar's knowledge,<br />
            <em style={{ color: "oklch(0.72 0.12 75)", fontStyle: "italic" }}>finally accessible.</em>
          </h1>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.125rem", lineHeight: 1.75, color: "oklch(0.68 0.015 75)", maxWidth: "560px", marginBottom: "2.5rem" }}>
            Ownology gives your team instant, document-grounded answers to every cellar question — from SO₂ calculations to harvest protocols — on a mobile phone, in seconds, without interrupting the winemaker.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <a
              href="#request-demo"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm text-sm font-bold transition-all"
              style={{ background: "oklch(0.72 0.12 75)", color: "oklch(0.11 0.008 60)", fontFamily: "'Lato', sans-serif", letterSpacing: "0.05em", textTransform: "uppercase" }}
            >
              Request a Demo
            </a>
            <Link
              href="/"
              className="inline-flex items-center justify-center px-7 py-3.5 rounded-sm text-sm font-light transition-all"
              style={{ border: "1px solid oklch(0.72 0.12 75 / 35%)", color: "oklch(0.72 0.12 75)", fontFamily: "'Lato', sans-serif" }}
            >
              See Full Overview
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─── Pain Points (winemaker-specific) ────────────────────────────────────────
function PainPoints() {
  const { ref, inView } = useInView();
  const points = [
    {
      icon: "⏱",
      title: "Harvest moves fast. Knowledge shouldn't slow you down.",
      body: "During vintage, junior staff ask the same questions every day. Every interruption costs you focus. Ownology answers them instantly — so you can stay in the cellar.",
    },
    {
      icon: "📄",
      title: "Your SOPs exist. Nobody can find them.",
      body: "Your protocols live in a binder, a shared drive, or someone's memory. Ownology indexes every document you upload and makes it searchable through natural conversation.",
    },
    {
      icon: "🧪",
      title: "Calculations that take minutes should take seconds.",
      body: "SO₂ additions, YAN targets, DAP rates, acid adjustments — Ownology does the maths and shows its working, grounded in your own protocols and world-class wine science.",
    },
    {
      icon: "📱",
      title: "Built for the cellar floor, not the office.",
      body: "Ownology works on any mobile phone. No login friction, no desktop required. Ask a question while you're standing next to the tank.",
    },
  ];

  return (
    <section className="py-24" style={{ background: "oklch(0.13 0.009 60)" }}>
      <div className="container" ref={ref}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1rem" }}>
          Why Ownology
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "oklch(0.92 0.018 75)", maxWidth: "560px", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "3rem" }}>
          Four problems every boutique winery knows.
        </h2>
        <div className="grid md:grid-cols-2 gap-6">
          {points.map((p, i) => (
            <div
              key={i}
              className={`p-8 rounded-sm transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{
                background: "oklch(0.15 0.010 60)",
                border: "1px solid oklch(1 0 0 / 7%)",
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <div className="text-2xl mb-4">{p.icon}</div>
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.125rem", color: "oklch(0.90 0.018 75)", marginBottom: "0.625rem" }}>{p.title}</h3>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "oklch(0.62 0.015 75)", lineHeight: 1.7 }}>{p.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
function SocialProof() {
  const { ref, inView } = useInView();
  const quotes = [
    {
      q: "During harvest I get asked the same questions every single day. Ownology answers them for me. I can finally focus on the wine.",
      name: "Head Winemaker",
      region: "Sonoma, CA",
      cases: "18,000 cases",
    },
    {
      q: "I work across eight clients. If I had something that could hold my protocols and answer questions on my behalf, I could take on two more clients. This is that thing.",
      name: "Consulting Winemaker",
      region: "Yarra Valley, VIC",
      cases: "8 clients",
    },
    {
      q: "The data entry trap is real. Ownology changed that completely — I log by voice while I'm still standing next to the tank.",
      name: "Owner-Winemaker",
      region: "Marlborough, NZ",
      cases: "6,200 cases",
    },
  ];

  return (
    <section className="py-24">
      <div className="container" ref={ref}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1rem" }}>
          From the Cellar
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "oklch(0.92 0.018 75)", maxWidth: "480px", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "3rem" }}>
          What winemakers are saying.
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          {quotes.map((t, i) => (
            <div
              key={i}
              className={`p-8 flex flex-col rounded-sm transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{
                background: "oklch(0.15 0.010 60)",
                border: "1px solid oklch(1 0 0 / 7%)",
                transitionDelay: `${i * 100}ms`,
              }}
            >
              <div style={{ color: "oklch(0.72 0.12 75)", fontSize: "2rem", lineHeight: 1, fontFamily: "'Fraunces', serif", marginBottom: "1.25rem" }}>"</div>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "oklch(0.72 0.015 75)", lineHeight: 1.75, flex: 1, fontStyle: "italic" }}>
                {t.q}
              </p>
              <div style={{ marginTop: "1.5rem", paddingTop: "1.25rem", borderTop: "1px solid oklch(1 0 0 / 8%)" }}>
                <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "0.9375rem", color: "oklch(0.88 0.018 75)" }}>{t.name}</p>
                <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "oklch(0.50 0.012 75)", marginTop: "0.25rem" }}>{t.region} · {t.cases}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Feature Snapshot ─────────────────────────────────────────────────────────
function FeatureSnapshot() {
  const { ref, inView } = useInView();
  const features = [
    { label: "AI Knowledge Assistant", desc: "Ask anything in plain language. Get cited, document-grounded answers in seconds." },
    { label: "Document Vault", desc: "Upload your SOPs, vintage reports, and protocols. Indexed instantly, searchable forever." },
    { label: "Smart Cellar Logbook", desc: "Log by voice or photo. Snap a lab slip — Ownology extracts and structures the data." },
    { label: "Fermentation Dashboard", desc: "Monitor all active tanks at a glance. Proactive alerts before a problem becomes a crisis." },
    { label: "Mobile First", desc: "Works on any phone. No app download. Ask a question while you're next to the tank." },
    { label: "Your Knowledge, Secured", desc: "Your documents and protocols stay private. Ownology never shares your data." },
  ];

  return (
    <section className="py-24 relative overflow-hidden" style={{ background: "oklch(0.13 0.009 60)" }}>
      <div className="absolute inset-0 opacity-4">
        <img src={LAB_IMG} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.3)" }} />
      </div>
      <div className="container relative z-10" ref={ref}>
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1rem" }}>
          What's Included
        </p>
        <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "oklch(0.92 0.018 75)", maxWidth: "520px", lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "3rem" }}>
          Everything your team needs.
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f, i) => (
            <div
              key={i}
              className={`p-6 rounded-sm transition-all duration-500 ${inView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
              style={{
                background: "oklch(0.15 0.010 60)",
                border: "1px solid oklch(1 0 0 / 7%)",
                transitionDelay: `${i * 60}ms`,
              }}
            >
              <div style={{ width: "2rem", height: "2px", background: "oklch(0.72 0.12 75)", marginBottom: "1rem" }} />
              <h3 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1rem", color: "oklch(0.90 0.018 75)", marginBottom: "0.5rem" }}>{f.label}</h3>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.60 0.013 75)", lineHeight: 1.65 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─── Demo Request Form ────────────────────────────────────────────────────────
function DemoRequestForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    winery: "",
    region: "",
    cases: "",
    message: "",
  });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const requestDemo = trpc.demo.request.useMutation({
    onSuccess: () => setSubmitted(true),
    onError: (err) => setError(err.message || "Something went wrong. Please try again."),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!form.name.trim() || !form.email.trim() || !form.winery.trim()) return;
    requestDemo.mutate({
      name: form.name.trim(),
      email: form.email.trim(),
      winery: form.winery.trim(),
      region: form.region.trim() || undefined,
      cases: form.cases || undefined,
      message: form.message.trim() || undefined,
    });
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "oklch(0.15 0.010 60)",
    border: "1px solid oklch(1 0 0 / 12%)",
    borderRadius: "2px",
    padding: "0.75rem 1rem",
    fontFamily: "'Lato', sans-serif",
    fontWeight: 300,
    fontSize: "0.9375rem",
    color: "oklch(0.88 0.015 75)",
    outline: "none",
    transition: "border-color 0.2s",
  };

  const labelStyle: React.CSSProperties = {
    fontFamily: "'Lato', sans-serif",
    fontWeight: 600,
    fontSize: "0.75rem",
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    color: "oklch(0.55 0.012 75)",
    display: "block",
    marginBottom: "0.5rem",
  };

  return (
    <section id="request-demo" className="py-24 relative overflow-hidden">
      <div className="absolute inset-0">
        <img src={VINEYARD_IMG} alt="" className="w-full h-full object-cover" style={{ filter: "brightness(0.15) saturate(0.5)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(to bottom, oklch(0.11 0.008 60), oklch(0.11 0.008 60 / 80%), oklch(0.11 0.008 60))" }} />
      </div>

      <div className="container relative z-10">
        <div className="max-w-2xl mx-auto">
          {submitted ? (
            <div className="text-center py-16">
              {/* Animated checkmark */}
              <div className="mx-auto mb-8 flex items-center justify-center" style={{ width: "72px", height: "72px" }}>
                <svg viewBox="0 0 72 72" fill="none" style={{ width: "72px", height: "72px" }}>
                  <circle cx="36" cy="36" r="33" stroke="oklch(0.72 0.12 75)" strokeWidth="2.5" strokeDasharray="207" strokeDashoffset="0" style={{ animation: "circleIn 0.5s ease-out forwards" }} />
                  <path d="M22 36 L32 46 L50 28" stroke="oklch(0.72 0.12 75)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="40" strokeDashoffset="0" style={{ animation: "checkIn 0.4s 0.4s ease-out forwards" }} />
                </svg>
              </div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "2rem", color: "oklch(0.92 0.018 75)", marginBottom: "1rem" }}>
                Demo request received.
              </h2>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", color: "oklch(0.65 0.015 75)", lineHeight: 1.7, maxWidth: "420px", margin: "0 auto 2rem" }}>
                Rich or Gel will be in touch within 24 hours to schedule your personal walkthrough.
              </p>
              <Link
                href="/"
                style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "oklch(0.72 0.12 75)", textDecoration: "underline", textUnderlineOffset: "3px" }}
              >
                ← Back to Ownology
              </Link>
            </div>
          ) : (
            <>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "oklch(0.72 0.12 75)", marginBottom: "1rem" }}>
                Book a Demo
              </p>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.75rem)", color: "oklch(0.92 0.018 75)", lineHeight: 1.15, letterSpacing: "-0.01em", marginBottom: "1rem" }}>
                See Ownology in your cellar.
              </h2>
              <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1rem", color: "oklch(0.62 0.013 75)", lineHeight: 1.7, marginBottom: "2.5rem" }}>
                We'll walk you through a personalised demo using your own winery's context — no generic slides. Rich or Gel will be in touch within 24 hours.
              </p>

              <form onSubmit={handleSubmit} className="flex flex-col gap-5">
                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label style={labelStyle}>Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="Jane Smith"
                      value={form.name}
                      onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                      onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Email Address *</label>
                    <input
                      type="email"
                      required
                      placeholder="jane@winery.com.au"
                      value={form.email}
                      onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                      onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                    />
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Winery Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Hunter Valley Estate"
                    value={form.winery}
                    onChange={e => setForm(f => ({ ...f, winery: e.target.value }))}
                    style={inputStyle}
                    onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                    onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-5">
                  <div>
                    <label style={labelStyle}>Region</label>
                    <input
                      type="text"
                      placeholder="Hunter Valley, NSW"
                      value={form.region}
                      onChange={e => setForm(f => ({ ...f, region: e.target.value }))}
                      style={inputStyle}
                      onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                      onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Annual Production</label>
                    <select
                      value={form.cases}
                      onChange={e => setForm(f => ({ ...f, cases: e.target.value }))}
                      style={{ ...inputStyle, cursor: "pointer" }}
                      onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                      onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                    >
                      <option value="" style={{ background: "oklch(0.15 0.010 60)" }}>Select range</option>
                      <option value="Under 1,000 cases" style={{ background: "oklch(0.15 0.010 60)" }}>Under 1,000 cases</option>
                      <option value="1,000–5,000 cases" style={{ background: "oklch(0.15 0.010 60)" }}>1,000–5,000 cases</option>
                      <option value="5,001–20,000 cases" style={{ background: "oklch(0.15 0.010 60)" }}>5,001–20,000 cases</option>
                      <option value="20,000+ cases" style={{ background: "oklch(0.15 0.010 60)" }}>20,000+ cases</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}>Anything you'd like us to know?</label>
                  <textarea
                    rows={4}
                    placeholder="Tell us about your biggest cellar challenge, or what you'd most like to see in the demo..."
                    value={form.message}
                    onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                    style={{ ...inputStyle, resize: "vertical" }}
                    onFocus={e => (e.target.style.borderColor = "oklch(0.72 0.12 75 / 50%)")}
                    onBlur={e => (e.target.style.borderColor = "oklch(1 0 0 / 12%)")}
                  />
                </div>

                {error && (
                  <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "oklch(0.65 0.18 25)" }}>
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={requestDemo.isPending}
                  className="flex items-center justify-center gap-3 py-4 rounded-sm text-sm font-bold transition-all disabled:opacity-70"
                  style={{
                    background: requestDemo.isPending ? "oklch(0.60 0.10 75)" : "oklch(0.72 0.12 75)",
                    color: "oklch(0.11 0.008 60)",
                    fontFamily: "'Lato', sans-serif",
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                    cursor: requestDemo.isPending ? "not-allowed" : "pointer",
                  }}
                >
                  {requestDemo.isPending ? (
                    <>
                      <svg className="animate-spin" width="16" height="16" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="6" stroke="oklch(0.11 0.008 60 / 40%)" strokeWidth="2" />
                        <path d="M8 2a6 6 0 0 1 6 6" stroke="oklch(0.11 0.008 60)" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Sending Request…
                    </>
                  ) : (
                    "Request My Demo"
                  )}
                </button>

                <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "oklch(0.42 0.010 75)", textAlign: "center" }}>
                  No commitment required. Rich or Gel will be in touch within 24 hours.
                </p>
              </form>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer() {
  return (
    <footer className="py-10" style={{ borderTop: "1px solid oklch(1 0 0 / 6%)" }}>
      <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
        <OwnologyLogo size={26} />
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "oklch(0.40 0.010 75)" }}>
          © 2026 Ownology. AI Knowledge Assistant for Boutique Winemakers.
        </p>
        <a
          href="mailto:hello@ownology.ai"
          style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "oklch(0.48 0.010 75)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "oklch(0.72 0.12 75)")}
          onMouseLeave={e => (e.currentTarget.style.color = "oklch(0.48 0.010 75)")}
        >
          hello@ownology.ai
        </a>
      </div>
    </footer>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ForWinemakers() {
  return (
    <div className="min-h-screen" style={{ background: "oklch(0.11 0.008 60)" }}>
      <Nav />
      <Hero />
      <PainPoints />
      <SocialProof />
      <FeatureSnapshot />
      <DemoRequestForm />
      <Footer />
    </div>
  );
}
