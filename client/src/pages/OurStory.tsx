/**
 * OurStory — Standalone founder-story page (Feb 2026, Rich).
 *
 * Status: UNLINKED from all nav on purpose. Rich wants to iterate on this
 * quietly, add proper photography + a founder video, then unhide when
 * ready. Direct URL only: /our-story.
 *
 * The page structure (top → bottom):
 *   1. Video hero slot         — placeholder card for future founder video
 *   2. Pull quote              — Rich's 2005 anchor line
 *   3. Founder portraits row   — Rich + Geraldine (the two working assets)
 *   4. Body copy (4 paragraphs) with amber-left highlighted insight
 *   5. Education credential card
 *   6. Back-to-home footer link
 *
 * All copy is verbatim from Rich's Feb 2026 upload (see /tmp/ownology-story
 * during the build session). Do not rewrite without his approval.
 *
 * When Rich provides a founder video (mp4/webm), drop it in
 * /app/client/public/media/our-story.mp4 and swap the placeholder card
 * for a <video> tag — the surrounding layout will accept it as-is.
 */

import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { GraduationCap, PlayCircle, ArrowLeft } from "lucide-react";

// ── Working portrait assets (Cloudfront, 200 OK as of Feb 2026 review). ──
// Rich and Geraldine — the two "AI photos" Rich liked from the Manus era.
const RICH_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-rich-portrait-VfvrGF78hUnSKCT9KWUNEb.webp";
const GERALDINE_IMG =
  "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/ownology-geraldine-v2-m57Nkp7FDBsiZ4EGyESMwQ.webp";

function useInView(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setInView(true);
          obs.disconnect();
        }
      },
      { threshold }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [threshold]);
  return { ref, inView };
}

export default function OurStory() {
  const bodyRef = useInView(0.05);

  return (
    <div
      className="min-h-screen"
      style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      data-testid="our-story-page"
    >
      {/* Quiet header — no nav, just a subtle back link so Rich can preview
           without the marketing site chrome pulling focus. */}
      <div
        className="sticky top-0 z-10"
        style={{
          background: "color-mix(in oklch, var(--ow-bg-base) 92%, transparent)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid var(--ow-bg-inset)",
        }}
      >
        <div className="container max-w-6xl flex items-center justify-between py-4">
          <Link
            href="/"
            data-testid="our-story-back-home"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.82rem",
              color: "var(--ow-text-mid)",
              textDecoration: "none",
              letterSpacing: "0.03em",
            }}
          >
            <ArrowLeft size={14} /> Ownology
          </Link>
          <span
            style={{
              fontFamily: "'Fira Code',monospace",
              fontSize: "0.65rem",
              letterSpacing: "0.14em",
              color: "var(--ow-text-lo)",
              textTransform: "uppercase",
            }}
          >
            Preview · unlinked
          </span>
        </div>
      </div>

      {/* Subtle grain overlay (kept from the original FounderStory design). */}
      <div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.04'/%3E%3C/svg%3E")`,
          opacity: 0.28,
          position: "fixed",
          zIndex: 0,
        }}
      />

      <div className="container max-w-6xl relative z-1 py-16 md:py-24 space-y-20">
        {/* ── 1. Video hero slot ────────────────────────────────────────── */}
        {/* Placeholder card the same aspect ratio as a landscape video       */}
        {/* (16:9). When Rich has a founder video, replace the inner div with */}
        {/* <video src="/media/our-story.mp4" poster="/media/our-story.jpg"    */}
        {/*        autoPlay muted loop playsInline /> and everything below    */}
        {/* it stays put. Amber border on hover hints at "coming soon".       */}
        <section data-testid="our-story-video-hero">
          <p style={eyebrow}>Our Story</p>
          <h1
            style={{
              fontFamily: "'Fraunces',serif",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 5vw, 3.75rem)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              margin: "0 0 2.5rem",
              textWrap: "balance" as "balance",
            }}
          >
            A collector who wouldn&rsquo;t stop
            <br />
            <span style={{ color: "var(--ow-amber)" }}>asking why.</span>
          </h1>
          <div
            data-testid="our-story-video-slot"
            style={{
              position: "relative",
              width: "100%",
              aspectRatio: "16/9",
              borderRadius: 4,
              overflow: "hidden",
              background: "var(--ow-bg-raised)",
              border: "1px solid var(--ow-bg-inset)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: "0.75rem",
            }}
          >
            <PlayCircle
              size={64}
              strokeWidth={1}
              style={{ color: "color-mix(in oklch, var(--ow-amber) 55%, transparent)" }}
            />
            <p
              style={{
                fontFamily: "'Fraunces',serif",
                fontStyle: "italic",
                fontSize: "1.1rem",
                color: "var(--ow-text-mid)",
                margin: 0,
              }}
            >
              Founder video · coming soon
            </p>
            <p
              style={{
                fontFamily: "'Fira Code',monospace",
                fontSize: "0.68rem",
                letterSpacing: "0.12em",
                color: "var(--ow-text-lo)",
                textTransform: "uppercase",
                margin: 0,
              }}
            >
              Drop <code style={{ background: "var(--ow-bg-inset)", padding: "1px 6px", borderRadius: 3 }}>/media/our-story.mp4</code> to swap in
            </p>
          </div>
        </section>

        {/* ── 2. Pull quote ─────────────────────────────────────────────── */}
        <section
          data-testid="our-story-pullquote"
          style={{ maxWidth: 820, margin: "0 auto", textAlign: "center" }}
        >
          {/* Cellar-key decorative mark from the original FounderStory. */}
          <svg
            width="24"
            height="52"
            viewBox="0 0 20 44"
            fill="none"
            aria-hidden="true"
            style={{ margin: "0 auto 2rem", display: "block" }}
          >
            <circle cx="10" cy="9" r="8" stroke="#c9853a" strokeWidth="1.6" fill="none" />
            <circle cx="10" cy="9" r="1.2" fill="#c9853a" />
            <circle cx="10" cy="3.8" r="0.9" fill="#c9853a" />
            <circle cx="14.5" cy="6" r="0.9" fill="#c9853a" />
            <circle cx="14.5" cy="12" r="0.9" fill="#c9853a" />
            <circle cx="10" cy="14.2" r="0.9" fill="#c9853a" />
            <circle cx="5.5" cy="12" r="0.9" fill="#c9853a" />
            <circle cx="5.5" cy="6" r="0.9" fill="#c9853a" />
            <line x1="10" y1="9" x2="10" y2="3.8" stroke="#c9853a" strokeWidth="0.7" />
            <line x1="10" y1="9" x2="14.5" y2="6" stroke="#c9853a" strokeWidth="0.7" />
            <line x1="10" y1="9" x2="14.5" y2="12" stroke="#c9853a" strokeWidth="0.7" />
            <line x1="10" y1="9" x2="10" y2="14.2" stroke="#c9853a" strokeWidth="0.7" />
            <line x1="10" y1="9" x2="5.5" y2="12" stroke="#c9853a" strokeWidth="0.7" />
            <line x1="10" y1="9" x2="5.5" y2="6" stroke="#c9853a" strokeWidth="0.7" />
            <rect x="9.1" y="17" width="1.8" height="18" rx="0.4" fill="#c9853a" />
            <rect x="10.9" y="27" width="3.2" height="1.4" rx="0.3" fill="#c9853a" />
            <rect x="10.9" y="30" width="2.2" height="1.4" rx="0.3" fill="#c9853a" />
            <path d="M9.5 35 L10 38 L10.5 35Z" fill="#c9853a" />
          </svg>
          <blockquote
            style={{
              fontFamily: "'Fraunces',serif",
              fontStyle: "italic",
              fontWeight: 300,
              fontSize: "clamp(1.5rem, 2.8vw, 2.2rem)",
              lineHeight: 1.3,
              color: "var(--ow-text-hi)",
              letterSpacing: "-0.01em",
              margin: 0,
              textWrap: "balance" as "balance",
            }}
          >
            &ldquo;I first walked into a boutique production shed in 2005. I was a collector, not a winemaker &mdash; but the winemaker was generous enough to explain everything.&rdquo;
          </blockquote>
          <p
            style={{
              fontFamily: "'Lato',sans-serif",
              fontWeight: 700,
              fontSize: "0.72rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "var(--ow-amber)",
              marginTop: "1.75rem",
            }}
          >
            Rich, Co-Founder &amp; CEO
          </p>
        </section>

        {/* ── 3. Founder portraits row — two portraits, side by side ────── */}
        <section data-testid="our-story-founders">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              gap: "1.5rem",
              maxWidth: 820,
              margin: "0 auto",
            }}
          >
            {[
              { img: RICH_IMG, name: "Rich", role: "CEO & Founder", testId: "our-story-founder-rich" },
              { img: GERALDINE_IMG, name: "Geraldine", role: "Chemistry & Science Lead", testId: "our-story-founder-geraldine" },
            ].map((f) => (
              <figure
                key={f.name}
                data-testid={f.testId}
                style={{
                  position: "relative",
                  overflow: "hidden",
                  borderRadius: 4,
                  boxShadow: "0 24px 60px oklch(0 0 0 / 0.5), 0 0 0 1px oklch(1 0 0 / 0.06)",
                  margin: 0,
                }}
              >
                <img
                  src={f.img}
                  alt={`${f.name}, co-founder of Ownology`}
                  style={{ width: "100%", aspectRatio: "3/4", objectFit: "cover", display: "block" }}
                  loading="lazy"
                />
                <div
                  aria-hidden
                  style={{
                    position: "absolute",
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: "40%",
                    background: "linear-gradient(to top, oklch(0.10 0.008 60) 0%, transparent 100%)",
                  }}
                />
                <figcaption
                  style={{
                    position: "absolute",
                    bottom: "1.25rem",
                    left: "1.25rem",
                    right: "1.25rem",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "'Lato',sans-serif",
                      fontWeight: 700,
                      fontSize: "0.72rem",
                      letterSpacing: "0.14em",
                      textTransform: "uppercase",
                      color: "var(--ow-amber)",
                      margin: 0,
                    }}
                  >
                    {f.name}, Co-Founder
                  </p>
                  <p
                    style={{
                      fontFamily: "'Fira Code',monospace",
                      fontSize: "0.68rem",
                      color: "var(--ow-text-lo)",
                      marginTop: "0.25rem",
                      margin: 0,
                    }}
                  >
                    {f.role}
                  </p>
                </figcaption>
              </figure>
            ))}
          </div>
        </section>

        {/* ── 4. Body copy ──────────────────────────────────────────────── */}
        <section
          ref={bodyRef.ref}
          data-testid="our-story-body"
          className={bodyRef.inView ? "fade-up" : "opacity-0"}
          style={{ maxWidth: 720, margin: "0 auto", display: "flex", flexDirection: "column", gap: "1.75rem" }}
        >
          <p style={bodyP}>
            What started as curiosity became a long-term passion &mdash; and, admittedly, an expensive one.
            Around the 2005 vintage, I began collecting and studying wines from boutique producers, drawn
            first to the whites &mdash; Chardonnay, the Italian varietals, the old-vine varieties gaining
            prominence in small-batch cellars.
          </p>
          <p style={bodyP}>
            At one point I belonged to close to ten wine clubs in a single year. Cases arrived faster than
            I could make room for them, but every shipment was part of an ongoing education. Those
            memberships opened doors to member days, private tastings, vineyard tours, and behind-the-scenes
            access to winery operations. I spent countless hours speaking directly with winemakers &mdash;
            walking vineyards, standing around barrels in production sheds, learning the practical realities
            behind each vintage.
          </p>

          {/* Highlighted insight card */}
          <div
            data-testid="our-story-highlight"
            style={{
              background: "var(--ow-bg-card, var(--ow-bg-raised))",
              borderLeft: "2px solid var(--ow-amber)",
              padding: "1.5rem 1.5rem 1.5rem 1.75rem",
              borderRadius: 2,
            }}
          >
            <p
              style={{
                fontFamily: "'Fraunces',serif",
                fontStyle: "italic",
                fontWeight: 400,
                fontSize: "1.125rem",
                lineHeight: 1.65,
                color: "var(--ow-text-hi)",
                margin: 0,
              }}
            >
              What I kept noticing was how much knowledge lived only in people&rsquo;s heads &mdash; and how
              much of it was at risk of being lost. Ownology is Rich and Geraldine&rsquo;s attempt to change that.
            </p>
          </div>

          <p style={bodyP}>
            Ownology grew from years of genuine immersion in wine culture, extensive self-education, and
            firsthand exposure to the people and processes behind boutique winemaking &mdash; and probably
            from spending far too much money on wine memberships along the way.
          </p>
          <p style={bodyP}>
            There is one more thread to this story. My co-founder Geraldine brings a deep passion for
            chemistry and science &mdash; and somewhere along the way, we began sharing a quiet dream:
            what would it look like to bring science, agriculture, systems thinking, and wine together in a
            single platform? As Chemistry &amp; Science Lead, Geraldine ensures that every answer Ownology
            gives is grounded in real winemaking science, not just pattern-matching. Ownology is, in part,
            an answer to that shared question. A project built on curiosity, shaped by two people who
            refused to stop asking why.
          </p>
        </section>

        {/* ── 5. Education credential card ──────────────────────────────── */}
        <section
          data-testid="our-story-credential"
          style={{ maxWidth: 720, margin: "0 auto" }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "1rem",
              padding: "1.5rem",
              background: "var(--ow-bg-raised)",
              border: "1px solid var(--ow-bg-inset)",
              borderRadius: 4,
            }}
          >
            <div
              aria-hidden
              style={{
                width: 44,
                height: 44,
                borderRadius: 8,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
                color: "var(--ow-amber)",
                flexShrink: 0,
              }}
            >
              <GraduationCap size={22} strokeWidth={1.6} />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 700,
                  fontSize: "0.72rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber)",
                  margin: 0,
                }}
              >
                Formal Education
              </p>
              <p
                style={{
                  fontFamily: "'Fraunces',serif",
                  fontWeight: 400,
                  fontSize: "1.05rem",
                  lineHeight: 1.45,
                  color: "var(--ow-text-hi)",
                  margin: "0.4rem 0 0.4rem",
                }}
              >
                Advanced Certificate of Viticulture and Winemaking &mdash; Oenology
              </p>
              <p
                style={{
                  fontFamily: "'Lato',sans-serif",
                  fontWeight: 300,
                  fontStyle: "italic",
                  fontSize: "0.85rem",
                  color: "var(--ow-text-lo)",
                  margin: 0,
                }}
              >
                The knowledge behind Ownology is not borrowed &mdash; it is earned.
              </p>
            </div>
          </div>
        </section>

        {/* ── 6. Footer — quiet return home ─────────────────────────────── */}
        <section style={{ textAlign: "center", paddingTop: "2rem" }}>
          <Link
            href="/"
            data-testid="our-story-return-home"
            style={{
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.85rem",
              color: "var(--ow-text-mid)",
              textDecoration: "none",
              letterSpacing: "0.03em",
              display: "inline-flex",
              alignItems: "center",
              gap: "0.4rem",
            }}
          >
            <ArrowLeft size={14} /> Back to Ownology
          </Link>
        </section>
      </div>
    </div>
  );
}

// ── Shared inline styles ─────────────────────────────────────────────────
const eyebrow: React.CSSProperties = {
  fontFamily: "'Fira Code',monospace",
  fontSize: "0.7rem",
  letterSpacing: "0.24em",
  color: "var(--ow-amber)",
  textTransform: "uppercase",
  marginBottom: "1.5rem",
};

const bodyP: React.CSSProperties = {
  fontFamily: "'Lato',sans-serif",
  fontWeight: 300,
  fontSize: "1.0625rem",
  lineHeight: 1.8,
  color: "var(--ow-text-mid)",
  margin: 0,
};
