/**
 * OWNOLOGY — For InnoVint Users Landing Page
 * Targets winemakers already using InnoVint, positioning Ownology as the
 * AI knowledge layer that sits on top of their existing production system.
 */
import { useEffect, useRef, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

function useInView(threshold = 0.12) {
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

const BG_BASE   = "var(--ow-bg-base)";
const BG_RAISED = "var(--ow-bg-raised)";
const BG_CARD   = "var(--ow-bg-card)";
const BG_INSET  = "var(--ow-bg-inset)";
const AMBER     = "var(--ow-amber)";
const TEXT_HI   = "var(--ow-text-hi)";
const TEXT_MID  = "var(--ow-text-mid)";
const TEXT_LO   = "var(--ow-text-lo)";
const BORDER    = "var(--ow-border)";
const BORDER_MD = "var(--ow-border-md)";
const SERIF     = "'Fraunces', serif";
const SANS      = "'Lato', sans-serif";
const MONO      = "'Fira Code', monospace";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "backdrop-blur-md border-b border-white/5" : ""}`}
      style={scrolled ? { background: "var(--ow-nav-bg)" } : {}}
    >
      <div className="container flex items-center justify-between py-5">
        <Link href="/"><OwnologyLogo size={32} /></Link>
        <div className="flex items-center gap-6">
          <Link href="/" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_LO }}>
            Back to Home
          </Link>
          <a href="/#pricing" className="btn-amber" style={{ fontSize: "0.8125rem", padding: "0.5rem 1.25rem" }}>
            Start Free Trial
          </a>
        </div>
      </div>
    </nav>
  );
}

function Hero() {
  return (
    <section className="pt-36 pb-24" style={{ background: BG_BASE }}>
      <div className="container max-w-4xl">
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>
          For InnoVint Users
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2.25rem, 5vw, 3.75rem)", color: TEXT_HI, letterSpacing: "-0.02em", lineHeight: 1.08, marginBottom: "1.5rem" }}>
          InnoVint tracks your cellar.<br />
          <em style={{ color: AMBER, fontStyle: "italic" }}>Ownology answers your questions.</em>
        </h1>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.125rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: "600px", marginBottom: "2.5rem" }}>
          You already have a world-class production management system. Ownology adds the one thing InnoVint doesn't have: an AI assistant that reads your own protocols, SOPs, and vintage notes — and answers your team's questions in plain language, on the cellar floor, in seconds.
        </p>
        <div className="flex flex-wrap gap-4">
          <a href="/#pricing" className="btn-amber">Start Free Trial — No Credit Card</a>
          <Link href="/why-ownology" className="btn-ghost">See Full Comparison</Link>
        </div>
        {/* Trust line */}
        <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO, marginTop: "2rem" }}>
          Works alongside InnoVint, Vintrace, VinoERP, and any production system you already use.
        </p>
      </div>
    </section>
  );
}

function GapSection() {
  const { ref, inView } = useInView();
  const gaps = [
    {
      q: "What's the target free SO₂ for our barrel-aged Chardonnay at this pH?",
      note: "InnoVint stores your SO₂ additions. It doesn't know your target.",
    },
    {
      q: "Our Shiraz is stuck at 4.2 Brix — what does our protocol say to do?",
      note: "InnoVint logs the reading. Ownology reads your stuck ferment SOP.",
    },
    {
      q: "How much DAP does the Scott Labs guide recommend for a YAN of 120ppm?",
      note: "InnoVint tracks your additions. Ownology answers the 'how much' question.",
    },
    {
      q: "What were the sensory notes on the 2022 Pinot Noir at 6 months?",
      note: "InnoVint may have the data if it was entered. Ownology finds it in your tasting notes PDF.",
    },
  ];
  return (
    <section className="py-24" style={{ background: BG_RAISED }}>
      <div className="container max-w-4xl" ref={ref}>
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          The Gap InnoVint Leaves Open
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "1rem", maxWidth: "560px" }}>
          InnoVint tells you what happened. Ownology tells you what to do about it.
        </h2>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", color: TEXT_MID, lineHeight: 1.75, maxWidth: "540px", marginBottom: "3rem" }}>
          These are the questions your team asks every day during harvest — questions that InnoVint wasn't designed to answer.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          {gaps.map((g, i) => (
            <div
              key={i}
              className={`p-6 rounded-sm ${inView ? `fade-up fade-up-delay-${i + 1}` : "opacity-0"}`}
              style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}
            >
              <p style={{ fontFamily: MONO, fontSize: "0.875rem", color: AMBER, lineHeight: 1.6, marginBottom: "0.75rem" }}>
                "{g.q}"
              </p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_LO, lineHeight: 1.6 }}>
                {g.note}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItFits() {
  const { ref, inView } = useInView();
  return (
    <section className="py-24" style={{ background: BG_BASE }}>
      <div className="container max-w-4xl" ref={ref}>
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          How They Work Together
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "3rem", maxWidth: "560px" }}>
          Two tools. One complete cellar intelligence stack.
        </h2>

        <div className={`grid md:grid-cols-2 gap-6 ${inView ? "fade-up" : "opacity-0"}`}>
          {/* InnoVint column */}
          <div className="p-8 rounded-sm" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: "color-mix(in oklch, var(--ow-blue) 15%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-blue) 30%, transparent)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="2" y="2" width="10" height="10" rx="1" stroke="var(--ow-blue)" strokeWidth="1.3" />
                  <path d="M5 5h4M5 7h4M5 9h2" stroke="var(--ow-blue)" strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI }}>InnoVint</span>
              <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: TEXT_LO, marginLeft: "auto" }}>Production ERP</span>
            </div>
            <ul className="flex flex-col gap-3">
              {[
                "Cellar task management & scheduling",
                "Lab analysis records & lot tracking",
                "Inventory, barrels & tank management",
                "TTB compliance & regulatory reporting",
                "Blend calculations & COGS tracking",
                "Vintage history & production audit trail",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
                    <path d="M2 6l3 3 5-5" stroke="var(--ow-blue)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: TEXT_MID, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Ownology column */}
          <div className="p-8 rounded-sm" style={{ background: BG_CARD, border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-8 h-8 rounded-sm flex items-center justify-center" style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="7" cy="7" r="5" stroke={AMBER} strokeWidth="1.3" />
                  <path d="M7 4.5v2.5l1.5 1.5" stroke={AMBER} strokeWidth="1.3" strokeLinecap="round" />
                </svg>
              </div>
              <span style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI }}>Ownology</span>
              <span style={{ fontFamily: SANS, fontSize: "0.75rem", color: TEXT_LO, marginLeft: "auto" }}>AI Knowledge Layer</span>
            </div>
            <ul className="flex flex-col gap-3">
              {[
                "Natural language Q&A from your own SOPs",
                "Document vault — upload protocols & reports",
                "Cellar-floor answers in seconds on mobile",
                "Cited responses grounded in your documents",
                "Wine science knowledge base built-in",
                "Onboards seasonal staff without interrupting you",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="mt-0.5 flex-shrink-0">
                    <path d="M2 6l3 3 5-5" stroke={AMBER} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <span style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: TEXT_MID, lineHeight: 1.5 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Connector callout */}
        <div
          className={`mt-8 p-6 rounded-sm text-center ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}
          style={{ background: "color-mix(in oklch, var(--ow-amber) 5%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}
        >
          <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.0625rem", color: TEXT_HI, lineHeight: 1.6 }}>
            InnoVint is your <em style={{ color: AMBER }}>system of record</em>. Ownology is your <em style={{ color: AMBER }}>system of knowledge</em>. Most Ownology customers use both — they complement each other perfectly.
          </p>
        </div>
      </div>
    </section>
  );
}

function Workflow() {
  const { ref, inView } = useInView();
  const steps = [
    { n: "01", title: "Upload your SOPs and protocols", body: "Add your harvest protocols, SO₂ management guides, variety-specific SOPs, and vintage reports to the Ownology Document Vault. Takes 10 minutes." },
    { n: "02", title: "Your team asks questions on the floor", body: "During harvest, instead of calling you, your cellar hands open Ownology on their phone and ask in plain language. The answer comes from your own documents." },
    { n: "03", title: "Log readings in InnoVint as normal", body: "Nothing changes in your InnoVint workflow. Brix, pH, SO₂, tank notes — all still go into InnoVint. Ownology doesn't replace that; it answers the questions that come before and after the data entry." },
    { n: "04", title: "You stay focused on the wine", body: "The interruptions stop. Your junior staff are self-sufficient. Your institutional knowledge is accessible to everyone on the team, not just you." },
  ];
  return (
    <section className="py-24" style={{ background: BG_RAISED }}>
      <div className="container max-w-4xl" ref={ref}>
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>
          The Combined Workflow
        </p>
        <h2 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, lineHeight: 1.2, letterSpacing: "-0.01em", marginBottom: "3rem", maxWidth: "520px" }}>
          How InnoVint and Ownology work together in practice.
        </h2>
        <div className="grid md:grid-cols-2 gap-8">
          {steps.map((s, i) => (
            <div key={s.n} className={inView ? `fade-up fade-up-delay-${i + 1}` : "opacity-0"}>
              <span style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "2.25rem", color: "color-mix(in oklch, var(--ow-amber) 20%, transparent)", lineHeight: 1, display: "block", marginBottom: "0.75rem" }}>{s.n}</span>
              <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.125rem", color: TEXT_HI, marginBottom: "0.625rem" }}>{s.title}</h3>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.7 }}>{s.body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonial() {
  const { ref, inView } = useInView();
  return (
    <section className="py-20" style={{ background: BG_BASE }}>
      <div className="container max-w-3xl" ref={ref}>
        <div className={`p-10 rounded-sm ${inView ? "fade-up" : "opacity-0"}`} style={{ background: BG_CARD, border: `1px solid ${BORDER_MD}` }}>
          <div style={{ fontFamily: SERIF, fontSize: "2.5rem", color: AMBER, lineHeight: 1, marginBottom: "1.25rem" }}>"</div>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", color: TEXT_MID, lineHeight: 1.8, fontStyle: "italic", marginBottom: "1.5rem" }}>
            We've used InnoVint for three vintages. It's excellent for what it does. But every time a new cellar hand asked me a protocol question, I had to stop what I was doing. Ownology solved that. They can ask the question, get a cited answer from our own SOP, and I stay focused on the wine.
          </p>
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "1.25rem" }}>
            <p style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "0.9375rem", color: TEXT_HI }}>Head Winemaker</p>
            <p style={{ fontFamily: MONO, fontSize: "0.75rem", color: TEXT_LO, marginTop: "0.25rem" }}>Boutique Estate · 12,000 cases · InnoVint user since 2021</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { ref, inView } = useInView();
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const subscribeMutation = trpc.email.subscribe.useMutation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    setErrorMsg("");
    try {
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        source: "innovint-users",
        tags: ["waitlist", "innovint-users"],
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Please try again or email support@ownology.ai");
    }
  };

  return (
    <section className="py-24" style={{ background: BG_RAISED }}>
      <div className="container max-w-3xl text-center" ref={ref}>
        <div className={inView ? "fade-up" : "opacity-0"}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>
            Add the Knowledge Layer to Your InnoVint Setup
          </p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3rem)", color: TEXT_HI, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            14-day free trial. No credit card.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", color: TEXT_MID, lineHeight: 1.75, marginBottom: "2.5rem" }}>
            Set up in under 10 minutes. Upload your first SOP and ask your first question before your next tank walk.
          </p>

          {status === "success" ? (
            <div className="py-6 px-8 rounded-sm inline-block" style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}>
              <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI }}>
                You're on the list. We'll be in touch shortly.
              </p>
              <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, marginTop: "0.5rem" }}>
                Questions? Email us at <a href="mailto:support@ownology.ai" style={{ color: AMBER }}>support@ownology.ai</a>
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-6">
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@winery.com"
                disabled={status === "loading"}
                style={{
                  flex: 1,
                  background: BG_BASE,
                  border: `1px solid ${BORDER_MD}`,
                  borderRadius: "2px",
                  padding: "0.75rem 1rem",
                  fontFamily: SANS,
                  fontSize: "0.9375rem",
                  color: TEXT_HI,
                  outline: "none",
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = AMBER)}
                onBlur={(e) => (e.currentTarget.style.borderColor = BORDER_MD)}
              />
              <button
                type="submit"
                disabled={status === "loading"}
                className="btn-amber flex-shrink-0"
                style={{ opacity: status === "loading" ? 0.7 : 1 }}
              >
                {status === "loading" ? "Joining..." : "Join Waitlist"}
              </button>
            </form>
          )}

          {status === "error" && (
            <p style={{ fontFamily: SANS, fontSize: "0.875rem", color: "oklch(0.65 0.15 30)", marginBottom: "1rem" }}>{errorMsg}</p>
          )}

          <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>
            Or <a href="mailto:support@ownology.ai" style={{ color: AMBER }}>talk to us directly</a> — we respond within one business day.
          </p>
        </div>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="py-10" style={{ borderTop: `1px solid ${BORDER}`, background: BG_BASE }}>
      <div className="container flex flex-col md:flex-row items-center justify-between gap-6">
        <OwnologyLogo size={26} />
        <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>
          © 2026 Ownology. AI Knowledge Assistant for Boutique Winemakers.
        </p>
        <div className="flex gap-6">
          <a href="mailto:support@ownology.ai" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>Contact</a>
          <Link href="/why-ownology" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>Why Ownology</Link>
          <Link href="/" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>Home</Link>
        </div>
      </div>
    </footer>
  );
}

export default function ForInnoVintUsers() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "For InnoVint Users — Add AI Knowledge to Your Cellar Stack | Ownology";
  }, []);
  return (
    <div className="min-h-screen" style={{ background: BG_BASE }}>
      <Nav />
      <Hero />
      <GapSection />
      <HowItFits />
      <Workflow />
      <Testimonial />
      <CTA />
      <Footer />
    </div>
  );
}
