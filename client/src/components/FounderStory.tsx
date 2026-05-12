/**
 * FounderStory — Personal origin section for Ownology landing page
 * Design: Asymmetric layout — portrait photograph left, pull quote + body text right.
 * Warm, intimate tone. Amber gold accents. Fraunces italic for the quote.
 * Photography: Atmospheric cellar portrait — dark, cinematic, editorial quality.
 */

import { useEffect, useRef, useState } from "react";

function useInView(threshold = 0.1) {
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

const FOUNDER_IMG = "/manus-storage/ownology-founders-couple_a5b472c2.jpg";
const GERALDINE_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-geraldine-v2-m57Nkp7FDBsiZ4EGyESMwQ.webp";
const VINEYARD_IMG = "/manus-storage/ownology-vineyard_a3c0d545.jpg";
const LAB_IMG = "/manus-storage/ownology-lab_cf4a25db.jpg";

export default function FounderStory() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      id="our-story"
      className="relative py-28 overflow-hidden"
      style={{ background: "var(--ow-bg-base)" }}
    >
      {/* Subtle grain overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.35,
        }}
      />

      <div className="container relative z-10" ref={ref}>
        {/* Section label */}
        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 700,
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "oklch(0.72 0.12 75)",
            marginBottom: "3.5rem",
          }}
        >
          Our Story
        </p>

        <div className="grid lg:grid-cols-12 gap-12 lg:gap-16 items-start">

          {/* Left — founder portrait (4 cols) */}
          <div
            className={`lg:col-span-4 ${inView ? "fade-up" : "opacity-0"}`}
            style={{ transitionDelay: "0ms" }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "2px",
                boxShadow: "0 32px 80px oklch(0 0 0 / 0.6), 0 0 0 1px oklch(1 0 0 / 0.06)",
              }}
            >
              <img
                src={FOUNDER_IMG}
                alt="Ownology founders in a wine cellar barrel room"
                className="w-full object-cover"
                style={{ aspectRatio: "3/4", display: "block" }}
              />
              {/* Amber gradient overlay at bottom */}
              <div
                className="absolute bottom-0 left-0 right-0 h-32"
                style={{
                  background: "linear-gradient(to top, var(--ow-bg-base) 0%, transparent 100%)",
                }}
              />
              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-5">
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ow-amber)",
                  }}
                >
                  Founders, Ownology
                </p>
                <p
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.7rem",
                    color: "var(--ow-text-lo)",
                    marginTop: "0.2rem",
                  }}
                >
                  Boutique Wine Country · 2005 → 2026
                </p>
              </div>
            </div>

            {/* Credential stats below portrait */}
            <div className="grid grid-cols-3 gap-px mt-3" style={{ background: "var(--ow-border-md)" }}>
              {[
                { n: "20+", label: "Years" },
                { n: "~10", label: "Wine clubs" },
                { n: "2005", label: "First vintage" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-4 text-center"
                  style={{ background: "var(--ow-bg-raised)" }}
                >
                  <p
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 700,
                      fontSize: "1.4rem",
                      color: "var(--ow-amber)",
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.65rem",
                      color: "var(--ow-text-lo)",
                      marginTop: "0.3rem",
                      lineHeight: 1.35,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

            {/* Small vineyard + lab gallery below founders' portrait */}
            <div className="grid grid-cols-2 gap-1.5 mt-1.5">
              {[{ src: VINEYARD_IMG, alt: "Vineyard rows at golden hour" }, { src: LAB_IMG, alt: "Cellar lab analysis" }].map((img) => (
                <div
                  key={img.alt}
                  className="overflow-hidden"
                  style={{ borderRadius: "2px" }}
                >
                  <img
                    src={img.src}
                    alt={img.alt}
                    className="w-full object-cover"
                    style={{ aspectRatio: "1/1", display: "block" }}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Centre — Geraldine portrait (3 cols) */}
          <div
            className={`lg:col-span-3 ${inView ? "fade-up fade-up-delay-1" : "opacity-0"}`}
            style={{ transitionDelay: "80ms" }}
          >
            <div
              className="relative overflow-hidden"
              style={{
                borderRadius: "2px",
                boxShadow: "0 24px 60px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.06)",
              }}
            >
              <img
                src={GERALDINE_IMG}
                alt="Geraldine, co-founder of Ownology, in a wine cellar laboratory"
                className="w-full object-cover"
                style={{ aspectRatio: "3/4", display: "block" }}
              />
              {/* Gradient overlay */}
              <div
                className="absolute bottom-0 left-0 right-0 h-28"
                style={{
                  background: "linear-gradient(to top, var(--ow-bg-base) 0%, transparent 100%)",
                }}
              />
              {/* Caption */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <p
                  style={{
                    fontFamily: "'Lato', sans-serif",
                    fontWeight: 700,
                    fontSize: "0.7rem",
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: "var(--ow-amber)",
                  }}
                >
                  Geraldine, Co-Founder
                </p>
                <p
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.65rem",
                    color: "var(--ow-text-lo)",
                    marginTop: "0.2rem",
                  }}
                >
                  Chemistry & Science Lead
                </p>
              </div>
            </div>

          </div>

          {/* Right — quote + body copy (5 cols) */}
          <div
            className={`lg:col-span-5 flex flex-col gap-7 ${inView ? "fade-up fade-up-delay-2" : "opacity-0"}`}
          >
            {/* Cellar key decorative mark */}
            <svg width="24" height="52" viewBox="0 0 20 44" fill="none" aria-hidden="true">
              <circle cx="10" cy="9" r="8" stroke="#c9853a" strokeWidth="1.6" fill="none" />
              <circle cx="10" cy="9" r="1.2" fill="#c9853a" />
              <circle cx="10"   cy="3.8"  r="0.9" fill="#c9853a" />
              <circle cx="14.5" cy="6"    r="0.9" fill="#c9853a" />
              <circle cx="14.5" cy="12"   r="0.9" fill="#c9853a" />
              <circle cx="10"   cy="14.2" r="0.9" fill="#c9853a" />
              <circle cx="5.5"  cy="12"   r="0.9" fill="#c9853a" />
              <circle cx="5.5"  cy="6"    r="0.9" fill="#c9853a" />
              <line x1="10" y1="9" x2="10"   y2="3.8"  stroke="#c9853a" strokeWidth="0.7" />
              <line x1="10" y1="9" x2="14.5" y2="6"    stroke="#c9853a" strokeWidth="0.7" />
              <line x1="10" y1="9" x2="14.5" y2="12"   stroke="#c9853a" strokeWidth="0.7" />
              <line x1="10" y1="9" x2="10"   y2="14.2" stroke="#c9853a" strokeWidth="0.7" />
              <line x1="10" y1="9" x2="5.5"  y2="12"   stroke="#c9853a" strokeWidth="0.7" />
              <line x1="10" y1="9" x2="5.5"  y2="6"    stroke="#c9853a" strokeWidth="0.7" />
              <rect x="9.1" y="17" width="1.8" height="18" rx="0.4" fill="#c9853a" />
              <rect x="10.9" y="27" width="3.2" height="1.4" rx="0.3" fill="#c9853a" />
              <rect x="10.9" y="30" width="2.2" height="1.4" rx="0.3" fill="#c9853a" />
              <path d="M9.5 35 L10 38 L10.5 35Z" fill="#c9853a" />
            </svg>

            {/* Pull quote */}
            <blockquote
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
                lineHeight: 1.3,
                color: "var(--ow-text-hi)",
                letterSpacing: "-0.01em",
              }}
            >
              "I first walked into a Hunter Valley production shed in 2005. I was a collector, not a winemaker — but the winemaker was generous enough to explain everything."
            </blockquote>

            {/* Amber rule */}
            <div style={{ width: "3rem", height: "1px", background: "var(--ow-amber)" }} />

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "var(--ow-text-mid)" }}>
              When I first arrived in Australia, the Hunter Valley captured my attention immediately. What started as curiosity became a long-term passion — and, admittedly, an expensive one. Around the 2005 vintage, I began collecting and studying wines from the region, drawn first to the whites — Semillon, Chardonnay, the Italian varietals gaining prominence across Australian vineyards.
            </p>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "var(--ow-text-mid)" }}>
              At one point I belonged to close to ten wine clubs in a single year. Cases arrived faster than I could make room for them, but every shipment was part of an ongoing education. Those memberships opened doors to member days, private tastings, vineyard tours, and behind-the-scenes access to winery operations. I spent countless hours speaking directly with winemakers — walking vineyards, standing around barrels in production sheds, learning the practical realities behind each vintage.
            </p>

            {/* Highlighted insight */}
            <div
              className="p-6"
              style={{
                background: "var(--ow-bg-card)",
                borderLeft: "2px solid var(--ow-amber)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "1.125rem",
                  lineHeight: 1.65,
                  color: "var(--ow-text-hi)",
                }}
              >
                What I kept noticing was how much knowledge lived only in people's heads — and how much of it was at risk of being lost. Ownology is my attempt to change that.
              </p>
            </div>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "var(--ow-text-mid)" }}>
              Ownology grew from years of genuine immersion in wine culture, extensive self-education, and firsthand exposure to the people and processes behind Australian wine — and probably from spending far too much money on wine memberships along the way.
            </p>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "var(--ow-text-mid)" }}>
              There is one more thread to this story. My daughter has a deep passion for chemistry and science — and somewhere along the way, we began sharing a quiet dream: what would it look like to bring science, agriculture, systems thinking, and wine together in a single platform? Ownology is, in part, an answer to that question. A project built on curiosity, shaped by two generations of it.
            </p>
          </div>

        </div>
      </div>
    </section>
  );
}
