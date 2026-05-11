/**
 * FounderStory — Personal origin section for Ownology landing page
 * Design: Asymmetric layout — large pull quote left, body text right.
 * Warm, intimate tone. Amber gold accents. Fraunces italic for the quote.
 */

import { useEffect, useRef, useState } from "react";

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

const VINEYARD_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-vineyard-fbANbzVMm9rGzGepADg7Wn.webp";

export default function FounderStory() {
  const { ref, inView } = useInView(0.1);

  return (
    <section
      className="relative py-28 overflow-hidden"
      style={{ background: "oklch(0.12 0.009 60)" }}
    >
      {/* Subtle background texture */}
      <div className="absolute inset-0 opacity-[0.04]">
        <img src={VINEYARD_IMG} alt="" className="w-full h-full object-cover" />
      </div>

      <div className="container relative z-10" ref={ref}>
        {/* Section label */}
        <p className="section-label mb-12">The Story Behind Ownology</p>

        <div className="grid lg:grid-cols-5 gap-12 lg:gap-20 items-start">

          {/* Left — large pull quote (2 cols) */}
          <div className={`lg:col-span-2 ${inView ? "fade-up" : "opacity-0"}`}>
            {/* Amber key icon as decorative mark */}
            <div className="mb-8">
              <svg width="28" height="60" viewBox="0 0 20 44" fill="none">
                <circle cx="10" cy="9" r="8" stroke="#D4A853" strokeWidth="1.6" fill="none" />
                <circle cx="10" cy="9" r="1.2" fill="#D4A853" />
                <circle cx="10"   cy="3.8"  r="0.9" fill="#D4A853" />
                <circle cx="14.5" cy="6"    r="0.9" fill="#D4A853" />
                <circle cx="14.5" cy="12"   r="0.9" fill="#D4A853" />
                <circle cx="10"   cy="14.2" r="0.9" fill="#D4A853" />
                <circle cx="5.5"  cy="12"   r="0.9" fill="#D4A853" />
                <circle cx="5.5"  cy="6"    r="0.9" fill="#D4A853" />
                <line x1="10" y1="9" x2="10"   y2="3.8"  stroke="#D4A853" strokeWidth="0.7" />
                <line x1="10" y1="9" x2="14.5" y2="6"    stroke="#D4A853" strokeWidth="0.7" />
                <line x1="10" y1="9" x2="14.5" y2="12"   stroke="#D4A853" strokeWidth="0.7" />
                <line x1="10" y1="9" x2="10"   y2="14.2" stroke="#D4A853" strokeWidth="0.7" />
                <line x1="10" y1="9" x2="5.5"  y2="12"   stroke="#D4A853" strokeWidth="0.7" />
                <line x1="10" y1="9" x2="5.5"  y2="6"    stroke="#D4A853" strokeWidth="0.7" />
                <rect x="9.1" y="17" width="1.8" height="18" rx="0.4" fill="#D4A853" />
                <rect x="8.2" y="17" width="3.6" height="1.2" rx="0.3" fill="#D4A853" />
                <rect x="8.6" y="18.8" width="2.8" height="0.7" rx="0.2" fill="#D4A853" />
                <rect x="10.9" y="30" width="3.2" height="1.4" rx="0.3" fill="#D4A853" />
                <rect x="10.9" y="33" width="2.2" height="1.4" rx="0.3" fill="#D4A853" />
                <rect x="9.1" y="35" width="1.8" height="1.2" rx="0.4" fill="#D4A853" />
                <path d="M9.5 36.2 L10 38 L10.5 36.2Z" fill="#D4A853" />
              </svg>
            </div>

            <blockquote
              style={{
                fontFamily: "'Fraunces', serif",
                fontStyle: "italic",
                fontWeight: 300,
                fontSize: "clamp(1.5rem, 2.5vw, 2rem)",
                lineHeight: 1.35,
                color: "oklch(0.88 0.018 75)",
                letterSpacing: "-0.01em",
              }}
            >
              "I first walked into a Hunter Valley production shed in 2005. I was a collector, not a winemaker — but the winemaker was generous enough to explain everything."
            </blockquote>

            <div className="amber-rule mt-8 mb-6" />

            <p
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: "0.75rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                color: "oklch(0.72 0.12 75)",
              }}
            >
              Founder, Ownology
            </p>
            <p
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.75rem",
                color: "oklch(0.48 0.010 75)",
                marginTop: "0.25rem",
              }}
            >
              Hunter Valley · 2005 → 2026
            </p>
          </div>

          {/* Right — body copy (3 cols) */}
          <div className={`lg:col-span-3 flex flex-col gap-6 ${inView ? "fade-up fade-up-delay-2" : "opacity-0"}`}>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "oklch(0.68 0.013 75)" }}>
              When I first arrived in Australia, the Hunter Valley captured my attention immediately. What started as curiosity became a long-term passion — and, admittedly, an expensive one. Around the 2005 vintage, I began collecting and studying wines from the region, drawn first to the whites — Semillon, Chardonnay, the Italian varietals gaining prominence across Australian vineyards.
            </p>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "oklch(0.68 0.013 75)" }}>
              At one point I belonged to close to ten wine clubs in a single year. Cases arrived faster than I could make room for them, but every shipment was part of an ongoing education. Those memberships opened doors to member days, private tastings, vineyard tours, and behind-the-scenes access to winery operations. I spent countless hours speaking directly with winemakers — walking vineyards, standing around barrels in production sheds, learning the practical realities behind each vintage.
            </p>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "oklch(0.68 0.013 75)" }}>
              Over the years, that curiosity expanded well beyond the Hunter Valley. I read extensively on fermentation science, viticulture, climate influence, sensory analysis, and winery economics. What became increasingly clear was that wine sits at the intersection of agriculture, chemistry, craftsmanship, logistics, and storytelling — an industry built on both tradition and data, intuition and precision.
            </p>

            {/* Highlighted insight */}
            <div
              className="p-6 rounded-sm"
              style={{
                background: "oklch(0.16 0.010 60)",
                borderLeft: "2px solid oklch(0.72 0.12 75)",
              }}
            >
              <p
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontStyle: "italic",
                  fontWeight: 400,
                  fontSize: "1.0625rem",
                  lineHeight: 1.65,
                  color: "oklch(0.82 0.016 75)",
                }}
              >
                What I kept noticing was how much knowledge lived only in people's heads — and how much of it was at risk of being lost. Ownology is my attempt to change that.
              </p>
            </div>

            <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "1.0625rem", lineHeight: 1.8, color: "oklch(0.68 0.013 75)" }}>
              Ownology grew from years of genuine immersion in wine culture, extensive self-education, and firsthand exposure to the people and processes behind Australian wine — and probably from spending far too much money on wine memberships along the way.
            </p>

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-px mt-4"
              style={{ background: "oklch(1 0 0 / 6%)" }}
            >
              {[
                { n: "20+", label: "Years in wine culture" },
                { n: "~10", label: "Wine clubs at peak" },
                { n: "2005", label: "First vintage, Hunter Valley" },
              ].map((s) => (
                <div
                  key={s.label}
                  className="p-5 text-center"
                  style={{ background: "oklch(0.12 0.009 60)" }}
                >
                  <p
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 700,
                      fontSize: "1.75rem",
                      color: "oklch(0.72 0.12 75)",
                      lineHeight: 1,
                    }}
                  >
                    {s.n}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Lato', sans-serif",
                      fontWeight: 300,
                      fontSize: "0.75rem",
                      color: "oklch(0.55 0.012 75)",
                      marginTop: "0.375rem",
                      lineHeight: 1.4,
                    }}
                  >
                    {s.label}
                  </p>
                </div>
              ))}
            </div>

          </div>
        </div>
      </div>
    </section>
  );
}
