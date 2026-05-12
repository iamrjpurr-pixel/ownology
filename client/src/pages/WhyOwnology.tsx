/**
 * OWNOLOGY — Why Ownology / Comparison Page
 * Positions Ownology as the AI knowledge layer that sits on top of production
 * management systems and clearly distinguishes it from marketing content tools.
 */
import { useEffect, useRef, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Link } from "wouter";

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

const BG_BASE   = "oklch(0.11 0.008 60)";
const BG_RAISED = "oklch(0.14 0.009 60)";
const BG_CARD   = "oklch(0.16 0.010 60)";
const AMBER     = "oklch(0.72 0.12 75)";
const TEXT_HI   = "oklch(0.92 0.018 75)";
const TEXT_MID  = "oklch(0.68 0.013 75)";
const TEXT_LO   = "oklch(0.50 0.010 75)";
const BORDER    = "oklch(1 0 0 / 0.08)";
const SERIF     = "'Fraunces', serif";
const SANS      = "'Lato', sans-serif";
const MONO      = "'Fira Code', monospace";
const BLUE      = "oklch(0.65 0.10 230)";

function Nav() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? "bg-[oklch(0.11_0.008_60/97%)] backdrop-blur-md border-b border-white/5" : ""}`}>
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
    <section className="pt-36 pb-20" style={{ background: BG_BASE }}>
      <div className="container max-w-4xl">
        <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>
          Why Ownology
        </p>
        <h1 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2.25rem, 5vw, 3.75rem)", lineHeight: 1.08, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.5rem" }}>
          The AI knowledge layer your production software was never designed to be.
        </h1>
        <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.125rem", lineHeight: 1.75, color: TEXT_MID, maxWidth: "640px" }}>
          Ownology does not replace InnoVint, vintrace, or WineDirect. It sits on top of them — answering the questions your production system records but cannot answer, grounded in your own documents, accessible from your phone in the cellar.
        </p>
      </div>
    </section>
  );
}

function TwoSystems() {
  const { ref, inView } = useInView();
  const erpItems = ["Cellar logs and tank records","TTB / regulatory compliance","Inventory and COGS tracking","Lab analysis history","Bottling and packaging records"];
  const ownItems = ["Natural language cellar Q&A","Answers from your own SOPs and protocols","SO₂, YAN, and fermentation calculations","Mobile-first — works with wet hands","Every answer cites its source"];
  return (
    <section className="py-20" style={{ background: BG_RAISED }}>
      <div className="container" ref={ref}>
        <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
          <div className={`p-8 rounded-sm ${inView ? "fade-up" : "opacity-0"}`} style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: BLUE, marginBottom: "0.75rem" }}>Your Production System</p>
            <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.375rem", color: TEXT_HI, marginBottom: "0.75rem" }}>InnoVint, vintrace, WineDirect</h3>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.75, marginBottom: "1.5rem" }}>
              Your production system is your <strong style={{ color: TEXT_HI, fontWeight: 400 }}>record-keeper</strong>. It logs what happened, tracks compliance, manages inventory, and produces the reports your accountant and regulator need.
            </p>
            <ul className="flex flex-col gap-3">
              {erpItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0"><path d="M2.5 7l3 3 6-6" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: SANS, fontSize: "0.9rem", color: TEXT_MID, fontWeight: 300 }}>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 rounded-sm" style={{ background: BG_BASE, border: `1px solid ${BORDER}` }}>
              <p style={{ fontFamily: MONO, fontSize: "0.8125rem", color: BLUE, lineHeight: 1.6 }}>"Tank 7 Brix reading: 8.4 at 06:00"</p>
              <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO, marginTop: "0.5rem" }}>Records the fact. Cannot advise on it.</p>
            </div>
          </div>

          <div className={`p-8 rounded-sm ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`} style={{ background: BG_CARD, border: `1px solid ${AMBER}33` }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: AMBER, marginBottom: "0.75rem" }}>Ownology</p>
            <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.375rem", color: TEXT_HI, marginBottom: "0.75rem" }}>The knowledge layer on top</h3>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9375rem", color: TEXT_MID, lineHeight: 1.75, marginBottom: "1.5rem" }}>
              Ownology is your <strong style={{ color: TEXT_HI, fontWeight: 400 }}>decision-support layer</strong>. It answers questions, surfaces protocols, and helps every person in your cellar make better decisions — grounded in your own documents and verified wine science.
            </p>
            <ul className="flex flex-col gap-3">
              {ownItems.map(item => (
                <li key={item} className="flex items-start gap-3">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0"><path d="M2.5 7l3 3 6-6" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: SANS, fontSize: "0.9rem", color: TEXT_MID, fontWeight: 300 }}>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 p-4 rounded-sm" style={{ background: BG_BASE, border: `1px solid ${AMBER}25` }}>
              <p style={{ fontFamily: MONO, fontSize: "0.8125rem", color: AMBER, lineHeight: 1.6 }}>"Tank 7 is at 8.4 Brix — should I add more yeast nutrient?"</p>
              <p style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_MID, marginTop: "0.5rem" }}>Answers from your Shiraz SOP + Scott Labs YAN guide.</p>
            </div>
          </div>
        </div>

        <div className={`mt-10 max-w-5xl mx-auto p-6 rounded-sm text-center ${inView ? "fade-up fade-up-delay-2" : "opacity-0"}`}
          style={{ background: `${AMBER}0D`, border: `1px solid ${AMBER}25` }}>
          <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI, lineHeight: 1.6 }}>
            InnoVint tells you <em style={{ color: AMBER }}>what happened</em>. Ownology tells you <em style={{ color: AMBER }}>what to do about it</em>. Most Ownology customers use both.
          </p>
        </div>
      </div>
    </section>
  );
}

function ComparisonTable() {
  const { ref, inView } = useInView();
  const rows = [
    { c: "Answers cellar production questions", o: true, e: false, m: false },
    { c: "Grounded in your own SOPs and documents", o: true, e: false, m: false },
    { c: "Cites the source of every answer", o: true, e: false, m: false },
    { c: "Mobile-first — designed for the cellar floor", o: true, e: "Partial", m: false },
    { c: "SO₂, YAN, and fermentation calculations", o: true, e: false, m: false },
    { c: "Regulatory compliance and TTB records", o: false, e: true, m: false },
    { c: "Inventory and COGS tracking", o: false, e: true, m: false },
    { c: "Tasting room copy and social media content", o: false, e: false, m: true },
    { c: "Works alongside your existing production system", o: true, e: "—", m: "—" },
    { c: "Designed for boutique wineries (< 20,000 cases)", o: true, e: "Partial", m: "Partial" },
  ];
  const Check = ({ val }: { val: boolean | string }) => {
    if (val === true) return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mx-auto">
        <circle cx="9" cy="9" r="8" fill={`${AMBER}20`} stroke={AMBER} strokeWidth="1"/>
        <path d="M5.5 9l2.5 2.5 4.5-4.5" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
    if (val === false) return (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="mx-auto">
        <circle cx="9" cy="9" r="8" stroke="oklch(1 0 0 / 0.12)" strokeWidth="1"/>
        <path d="M6.5 6.5l5 5M11.5 6.5l-5 5" stroke="oklch(1 0 0 / 0.20)" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    );
    return <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: TEXT_LO }}>{val}</span>;
  };
  return (
    <section className="py-20" style={{ background: BG_BASE }}>
      <div className="container" ref={ref}>
        <div className={`max-w-5xl mx-auto ${inView ? "fade-up" : "opacity-0"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>How It Compares</p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "2.5rem" }}>
            Different tools. Different jobs.
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  <th style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.8125rem", color: TEXT_LO, textAlign: "left", paddingBottom: "1rem", paddingRight: "2rem", width: "46%" }}>Capability</th>
                  <th style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.8125rem", color: AMBER, textAlign: "center", paddingBottom: "1rem", paddingRight: "1.5rem", width: "18%" }}>Ownology</th>
                  <th style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.8125rem", color: TEXT_LO, textAlign: "center", paddingBottom: "1rem", paddingRight: "1.5rem", width: "18%" }}>
                    Production ERP<br/><span style={{ fontSize: "0.7rem", fontWeight: 300 }}>(InnoVint, vintrace)</span>
                  </th>
                  <th style={{ fontFamily: SANS, fontWeight: 400, fontSize: "0.8125rem", color: TEXT_LO, textAlign: "center", paddingBottom: "1rem", width: "18%" }}>
                    Marketing AI<br/><span style={{ fontSize: "0.7rem", fontWeight: 300 }}>(WineryCopilot, etc.)</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} style={{ borderTop: `1px solid ${BORDER}` }}>
                    <td style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.9rem", color: TEXT_MID, padding: "0.875rem 2rem 0.875rem 0", lineHeight: 1.5 }}>{row.c}</td>
                    <td style={{ textAlign: "center", padding: "0.875rem 1.5rem 0.875rem 0" }}><Check val={row.o} /></td>
                    <td style={{ textAlign: "center", padding: "0.875rem 1.5rem 0.875rem 0" }}><Check val={row.e} /></td>
                    <td style={{ textAlign: "center", padding: "0.875rem 0" }}><Check val={row.m} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function NotAReplacement() {
  const { ref, inView } = useInView();
  const timeline = [
    { time: "06:00", system: "InnoVint", action: "Brix reading logged: 8.4 — Tank 7 Shiraz", type: "record" },
    { time: "06:03", system: "Ownology", action: "At 8.4 Brix on Day 8, your Shiraz protocol targets 6–8 Brix by Day 10. Current trajectory is slightly slow — consider a pump-over to homogenise temperature. Source: Shiraz Harvest SOP 2024, §3.2", type: "insight" },
    { time: "06:15", system: "InnoVint", action: "Pump-over logged: Tank 7, 15 min, 06:15", type: "record" },
  ];
  return (
    <section className="py-20" style={{ background: BG_RAISED }}>
      <div className="container max-w-5xl" ref={ref}>
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className={inView ? "fade-up" : "opacity-0"}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>Complementary, Not Competitive</p>
            <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, letterSpacing: "-0.02em", lineHeight: 1.15, marginBottom: "1.25rem" }}>
              Already using InnoVint? Good — Ownology makes it more useful.
            </h2>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", color: TEXT_MID, lineHeight: 1.8, marginBottom: "1rem" }}>
              Your production system is the source of record. Ownology is the layer that makes your team smarter about what to do with that record. They serve different moments in the winemaker's day.
            </p>
            <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1rem", color: TEXT_MID, lineHeight: 1.8 }}>
              InnoVint logs that Tank 7 hit 8.4 Brix at 6am. Ownology answers the question your team asks next: <em style={{ color: TEXT_HI }}>"Based on our Shiraz protocol, is this on track — and what should we do if it stalls?"</em>
            </p>
          </div>
          <div className={`flex flex-col gap-4 ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}>
            {timeline.map((item, i) => (
              <div key={i} className="flex gap-4 p-4 rounded-sm"
                style={{ background: BG_BASE, border: `1px solid ${item.type === "insight" ? `${AMBER}30` : BORDER}` }}>
                <div className="flex flex-col items-center gap-1 flex-shrink-0">
                  <span style={{ fontFamily: MONO, fontSize: "0.75rem", color: item.type === "insight" ? AMBER : TEXT_LO }}>{item.time}</span>
                  <div className="w-px flex-1" style={{ background: item.type === "insight" ? `${AMBER}30` : BORDER, minHeight: "1rem" }} />
                </div>
                <div>
                  <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: item.type === "insight" ? AMBER : TEXT_LO, marginBottom: "0.375rem" }}>{item.system}</p>
                  <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: item.type === "insight" ? TEXT_HI : TEXT_MID, lineHeight: 1.65 }}>{item.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function VsMarketing() {
  const { ref, inView } = useInView();
  const mktQs = ["Write a tasting note for our 2023 Shiraz","Create a Facebook post for our harvest dinner","Draft a wine club newsletter for October","Generate a job ad for a cellar hand","Write product descriptions for our online store"];
  const ownQs = ["What's the target free SO₂ for our barrel-aged Chardonnay before bottling?","My Shiraz is at 8.4 Brix on Day 8 — is this on track?","How much KMS for a 60-gallon barrel at 15ppm?","What does our Pinot Noir protocol say about cold soak duration?","YAN is 120ppm — what DAP addition do I need for Tank 7?"];
  return (
    <section className="py-20" style={{ background: BG_BASE }}>
      <div className="container max-w-5xl" ref={ref}>
        <div className={`mb-12 ${inView ? "fade-up" : "opacity-0"}`}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1rem" }}>Not a Marketing Tool</p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)", color: TEXT_HI, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
            WineryCopilot writes your Instagram captions.<br />
            <em style={{ color: AMBER }}>Ownology answers your cellar questions.</em>
          </h2>
        </div>
        <div className={`grid md:grid-cols-2 gap-6 ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}>
          <div className="p-8 rounded-sm" style={{ background: BG_CARD, border: `1px solid ${BORDER}` }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: TEXT_LO, marginBottom: "1.25rem" }}>Marketing AI Tools (WineryCopilot, etc.)</p>
            <div className="flex flex-col gap-3">
              {mktQs.map(q => (
                <div key={q} className="flex items-start gap-3 p-3 rounded-sm" style={{ background: BG_BASE }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0"><path d="M2.5 7l3 3 6-6" stroke={BLUE} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: SANS, fontSize: "0.875rem", color: TEXT_MID, fontWeight: 300 }}>{q}</span>
                </div>
              ))}
            </div>
            <p className="mt-5" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_LO, lineHeight: 1.7 }}>
              Excellent tools for your marketing coordinator. Cannot answer a production question.
            </p>
          </div>
          <div className="p-8 rounded-sm" style={{ background: BG_CARD, border: `1px solid ${AMBER}33` }}>
            <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.15em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>Ownology — Cellar Intelligence</p>
            <div className="flex flex-col gap-3">
              {ownQs.map(q => (
                <div key={q} className="flex items-start gap-3 p-3 rounded-sm" style={{ background: BG_BASE }}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0"><path d="M2.5 7l3 3 6-6" stroke={AMBER} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                  <span style={{ fontFamily: SANS, fontSize: "0.875rem", color: TEXT_MID, fontWeight: 300 }}>{q}</span>
                </div>
              ))}
            </div>
            <p className="mt-5" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_MID, lineHeight: 1.7 }}>
              Every answer is grounded in your documents and cites its source. Built for the cellar floor, not the marketing office.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTA() {
  const { ref, inView } = useInView();
  return (
    <section className="py-24" style={{ background: BG_RAISED }}>
      <div className="container max-w-3xl text-center" ref={ref}>
        <div className={inView ? "fade-up" : "opacity-0"}>
          <p style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.7rem", letterSpacing: "0.18em", textTransform: "uppercase", color: AMBER, marginBottom: "1.25rem" }}>Ready to Add the Knowledge Layer?</p>
          <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3rem)", color: TEXT_HI, letterSpacing: "-0.02em", lineHeight: 1.1, marginBottom: "1.25rem" }}>
            Start your 14-day free trial.
          </h2>
          <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.0625rem", color: TEXT_MID, lineHeight: 1.75, marginBottom: "2.5rem" }}>
            No credit card. No setup fee. Works alongside whatever production system you already use.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <a href="/#pricing" className="btn-amber">Start Free Trial</a>
            <a href="mailto:hello@ownology.ai" className="btn-ghost">Talk to Us</a>
          </div>
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
          <a href="mailto:hello@ownology.ai" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>Contact</a>
          <Link href="/" style={{ fontFamily: SANS, fontSize: "0.8125rem", color: TEXT_LO }}>Home</Link>
        </div>
      </div>
    </footer>
  );
}

export default function WhyOwnology() {
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = "Why Ownology — The AI Knowledge Layer for Boutique Winemakers";
  }, []);
  return (
    <div className="min-h-screen" style={{ background: BG_BASE }}>
      <Nav />
      <Hero />
      <TwoSystems />
      <ComparisonTable />
      <NotAReplacement />
      <VsMarketing />
      <CTA />
      <Footer />
    </div>
  );
}
