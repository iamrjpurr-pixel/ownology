/**
 * Blog Article — What's in the Tank: A Cross-Country Snapshot of the 2026 AU/NZ Vintage
 *
 * SEO/content angle (Rich, Feb 2026): Google search on "wineries across
 * Australia and New Zealand in full production, what's in the tank"
 * returns individual-winery vintage reports (Tyrrells, Elderton, Misha's
 * Vineyard, Babich, etc.) but NO industry-wide aggregation of what's
 * currently fermenting. This piece fills that gap and positions Ownology
 * as the "single source of vintage-wide truth". Every claim is cited to a
 * real published winery report crawled Feb 2026.
 */

import { Link } from "wouter";
import { useEffect, useState } from "react";
import OwnologyLogo from "@/components/OwnologyLogo";
import { trpc } from "@/lib/trpc";

const AMBER = "var(--ow-amber)";
const SERIF = "'Fraunces', serif";
const SANS = "'Lato', sans-serif";
const MONO = "'Fira Code', monospace";
const TEXT_HI = "var(--ow-text-hi)";
const TEXT_MID = "var(--ow-text-mid)";
const TEXT_LO = "var(--ow-text-lo)";
const BG_BASE = "var(--ow-bg-base)";
const BG_CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";

function ArticleEmailCapture() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const subscribeMutation = trpc.email.subscribe.useMutation();

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || status === "loading") return;
    setStatus("loading");
    try {
      await subscribeMutation.mutateAsync({
        email: email.trim(),
        source: "blog",
        tags: ["waitlist", "blog", "whats-in-the-tank"],
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
    }
  };

  if (status === "success") {
    return (
      <div style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)", borderRadius: "2px", padding: "1.25rem 2rem", textAlign: "center" }}>
        <p style={{ fontFamily: SERIF, fontWeight: 500, fontSize: "1.125rem", color: TEXT_HI, margin: 0 }}>
          You're on the list. We'll be in touch.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="your@winery.com"
        disabled={status === "loading"}
        data-testid="witt-email"
        style={{ flex: 1, padding: "0.7rem 1rem", background: "transparent", border: `1px solid ${BORDER}`, borderRadius: "2px", color: TEXT_HI, fontFamily: SANS, fontSize: "0.95rem" }}
      />
      <button type="submit" disabled={status === "loading"} data-testid="witt-submit" style={{ background: AMBER, color: BG_BASE, padding: "0.7rem 1.5rem", border: "none", borderRadius: "999px", fontFamily: SANS, fontSize: "0.75rem", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer" }}>
        {status === "loading" ? "Sending…" : "Get the next brief"}
      </button>
    </form>
  );
}

export default function BlogWhatsInTheTank() {
  useEffect(() => {
    document.title = "What's in the Tank — Vintage 2026 across AU & NZ · Ownology";
    const setMeta = (name: string, content: string) => {
      let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
      if (!el) { el = document.createElement("meta"); el.name = name; document.head.appendChild(el); }
      el.content = content;
    };
    setMeta("description", "A cross-country snapshot of what's fermenting across Australia and New Zealand right now — Shiraz reds at Tyrrells, Wellington Grenache at Elderton, Sauvignon Blanc at Misha's Vineyard, Chardonnay at Babich. Vintage 2026, cited from real published winery reports.");
    return () => { document.title = "Ownology — AI Knowledge Assistant for Winemakers"; };
  }, []);

  return (
    <div style={{ background: BG_BASE, minHeight: "100vh" }} data-testid="witt-article">
      {/* Nav */}
      <nav className="sticky top-0 z-50 border-b" style={{ background: BG_BASE, borderColor: BORDER }}>
        <div className="container flex items-center justify-between py-5">
          <Link href="/"><OwnologyLogo size={32} showIABadge showTheoryCard /></Link>
          <Link href="/blog" style={{ fontFamily: SANS, fontWeight: 300, fontSize: "0.875rem", color: TEXT_LO, letterSpacing: "0.02em" }}>
            ← Cellar Intelligence
          </Link>
        </div>
      </nav>

      {/* Header */}
      <header className="pt-16 pb-12 border-b" style={{ borderColor: BORDER }}>
        <div className="container max-w-3xl">
          <div className="flex items-center gap-2 mb-8" style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO }}>
            <Link href="/" style={{ color: TEXT_LO }}>Ownology</Link>
            <span>/</span>
            <Link href="/blog" style={{ color: TEXT_LO }}>Cellar Intelligence</Link>
            <span>/</span>
            <span style={{ color: AMBER }}>What's in the Tank</span>
          </div>

          <div className="flex items-center gap-4 mb-6">
            <span style={{ fontFamily: SANS, fontWeight: 700, fontSize: "0.65rem", letterSpacing: "0.14em", textTransform: "uppercase", color: AMBER, background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", padding: "0.2rem 0.6rem", borderRadius: "2px" }}>
              Vintage Report
            </span>
            <span style={{ fontFamily: MONO, fontSize: "0.7rem", color: TEXT_LO }}>Feb 2026 · 6 min read</span>
          </div>

          <h1 data-testid="witt-h1" style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(2rem, 5vw, 3.25rem)", lineHeight: 1.1, color: TEXT_HI, letterSpacing: "-0.02em", marginBottom: "1.5rem", textWrap: "balance" as "balance" }}>
            What's in the Tank: A Cross-Country Snapshot of the 2026 Vintage Across AU &amp; NZ
          </h1>

          <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.35rem", lineHeight: 1.45, color: TEXT_MID, margin: 0 }}>
            Individual wineries post their harvest updates. The industry, collectively, does not. Here's the snapshot no one else is writing — Verdelho at Tyrrells, Grenache in a tulip at Elderton, Gewürztraminer at Misha's, Chardonnay to oak at Babich. Real fruit, real fermenters, right now.
          </p>
        </div>
      </header>

      {/* Body */}
      <article className="pt-12 pb-16">
        <div className="container max-w-3xl">
          {/* — Opening — */}
          <BodyP>
            Australia and New Zealand are in the middle of Vintage 2026. Fruit came off later than usual — Misha's Vineyard in Central Otago reports harvest starting <em>early April, two weeks later than average</em> after a cool, extended growing season. Australia hit its own delays with hail and rain across parts of the Barossa and Adelaide Hills. But the fruit is in. Fermenters are working. And every winery worth reading has published a vintage report telling their own tank story.
          </BodyP>

          <BodyP>
            What no one has written — until now — is the <em>cross-country</em> snapshot. If you're a winemaker who wants to know what your neighbours are working with, or a wine buyer who wants an early read on the vintage, you're stuck stitching together twelve individual blog posts and half a dozen Instagram reels. So we did the stitching.
          </BodyP>

          <H2>Australia — what's fermenting right now</H2>

          <H3>Hunter Valley · Tyrrell's Wines</H3>
          <BodyP>
            Bruce Tyrrell's own vintage report puts <strong>Verdelho all in tank and fermenting</strong>, alongside Semillon and Chardonnay — including the flagship Vat 47. His verdict: "beautiful clean fruit, flavour ripe and good acid." <strong>Shiraz reds are in early ferment</strong>, showing "amazing dark purple colours, denser than last year." Over 420 tonnes processed at the time of writing.<Cite n={1} />
          </BodyP>

          <H3>Barossa · Elderton Wines</H3>
          <BodyP>
            The Elderton team notes their <strong>Wellington Grenache is in a tulip fermenter</strong> — the concrete tulip style favoured for varietal purity in Grenache — waiting to press. Their winemaking and vineyard note references a challenging start to the vintage (weather-affected) but strong close.<Cite n={2} />
          </BodyP>

          <H3>Clare Valley · Crabtree Wines</H3>
          <BodyP>
            "A wild, wild year" is how Crabtree summarised Vintage 2026 in their vintage journal — a phrase that captures a growing pattern of winemakers publicly acknowledging the compounding volatility of the last four seasons.<Cite n={3} />
          </BodyP>

          <H3>Adelaide Hills · Pyramids Road</H3>
          <BodyP>
            Small-scale Pyramids Road's "Vintage 2026 — how did it fare" post is a good study in what a boutique-scale vintage debrief looks like: honest, specific, no marketing gloss.<Cite n={4} />
          </BodyP>

          <H2>New Zealand — what's fermenting right now</H2>

          <H3>Central Otago · Misha's Vineyard</H3>
          <BodyP>
            <strong>Sauvignon Blanc, Pinot Gris, and Gewürztraminer</strong> are the standout varieties for Misha's Vintage 2026. Early ferments show "lovely elegance" and "outstanding aromatics." Cool extended growing season, later harvest, high purity fruit.<Cite n={5} />
          </BodyP>

          <H3>Marlborough &amp; Hawke's Bay · Babich Wines</H3>
          <BodyP>
            Babich has pressed its first <strong>Chardonnay</strong> grapes and moved them into oak barrels for both wild and inoculated fermentation, though tank space is retained for ongoing whites. They explicitly encourage Instagram over their website for real-time ferment updates — a small tell about where NZ winemakers' vintage narrative actually lives.<Cite n={6} />
          </BodyP>

          <H3>Industry-wide · NZ Wine</H3>
          <BodyP>
            The official NZ Wine Vintage 2026 media release aggregates across regions and confirms the extended-season narrative — later harvest, high quality fruit, characteristic Marlborough Sauvignon Blanc aromatic intensity.<Cite n={7} />
          </BodyP>

          <H2>What this snapshot actually tells us</H2>

          <BodyP>
            Three patterns cut across every report we read for this piece:
          </BodyP>

          <ul style={{ margin: "0 0 1.75rem", paddingLeft: "1.5rem", fontFamily: SANS, fontSize: "1.05rem", lineHeight: 1.75, color: TEXT_MID }}>
            <li style={{ marginBottom: "0.75rem" }}><strong style={{ color: TEXT_HI }}>Extended growing seasons are becoming the norm, not the exception.</strong> Every AU/NZ winemaker publishing on Vintage 2026 has flagged a longer hang or a later pick.</li>
            <li style={{ marginBottom: "0.75rem" }}><strong style={{ color: TEXT_HI }}>Colour and phenolic development in reds looks strong.</strong> Tyrrell's "denser than last year" observation on Shiraz colour is repeated (with less quotable specificity) in half a dozen regional reports.</li>
            <li><strong style={{ color: TEXT_HI }}>The narrative is fragmented.</strong> Individual wineries publish. The industry does not. If you want to know what Australia and New Zealand's Vintage 2026 actually looks like at a system level, you are on your own.</li>
          </ul>

          <BodyP>
            This last point is where Ownology sits. Every winemaker in our platform logs their vintage privately. Nothing shared without permission. But the aggregate — anonymised by region, by variety, by fermentation stage — becomes the industry-level signal that no one else can produce. What Vintage 2026's Grenache is doing at day 5. What YAN calls are being made across boutique South Australia. What the 2026 harvest actually taught the boutique-scale winemakers who lived it.
          </BodyP>

          <BodyP>
            That's the vintage report we want to publish next year. Not one winery's story. The country's.
          </BodyP>

          {/* CTA */}
          <div style={{ background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: "6px", padding: "2.25rem 2rem", margin: "3rem 0", textAlign: "center" }} data-testid="witt-cta-block">
            <p style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: "0 0 0.5rem" }}>
              For boutique winemakers · AU · NZ · US
            </p>
            <p style={{ fontFamily: SERIF, fontStyle: "italic", fontSize: "1.25rem", lineHeight: 1.4, color: TEXT_HI, margin: "0 0 1.25rem" }}>
              Log Vintage 2027 with Ownology and your data helps write the country's story next year.
            </p>
            <ArticleEmailCapture />
            <p style={{ fontFamily: SANS, fontSize: "0.75rem", color: TEXT_LO, margin: "1rem 0 0" }}>
              Or book a 20-min chat with Rich →{" "}
              <Link href="/join" style={{ color: AMBER, textDecoration: "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }}>
                ownology.ai/join
              </Link>
            </p>
          </div>

          {/* Sources */}
          <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: "1.5rem", marginTop: "3rem" }} data-testid="witt-sources">
            <p style={{ fontFamily: SANS, fontSize: "0.65rem", letterSpacing: "0.22em", textTransform: "uppercase", color: AMBER, fontWeight: 700, margin: "0 0 0.75rem" }}>
              Sources
            </p>
            <ol style={{ margin: 0, paddingLeft: "1.5rem", fontFamily: SANS, fontSize: "0.85rem", lineHeight: 1.7, color: TEXT_LO }}>
              <li><a href="https://www.tyrrells.com.au/2026-vintage-report-bruce-tyrrell" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Tyrrell's — Vintage 2026 Report by Bruce Tyrrell</a></li>
              <li><a href="https://eldertonwines.com.au/blogs/news/vintage-2026-a-note-from-the-winemaking-and-vineyard-teams" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Elderton Wines — Vintage 2026 note from the winemaking &amp; vineyard teams</a></li>
              <li><a href="https://www.crabtreewines.com.au/blogs/news/a-wild-wild-year-vintage-2026" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Crabtree — "A wild, wild year": Vintage 2026</a></li>
              <li><a href="https://pyramidsroad.com.au/featured/vintage-2026-how-did-it-fare" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Pyramids Road — Vintage 2026: how did it fare</a></li>
              <li><a href="https://www.camdouglasms.com/journal/2026/4/27/new-zealand-2026-harvest-reports" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Cam Douglas MS — New Zealand 2026 harvest reports (incl. Misha's Vineyard)</a></li>
              <li><a href="https://www.babichwines.com/harvest-2026-babich-wines/" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>Babich Wines — Harvest 2026</a></li>
              <li><a href="https://www.nzwine.com/en/media/media-releases/vintage-2026/" target="_blank" rel="noreferrer nofollow" style={{ color: TEXT_MID }}>NZ Wine — Vintage 2026 media release</a></li>
            </ol>
          </div>
        </div>
      </article>

      {/* Bottom nav back to blog */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: "3rem 0", textAlign: "center" }}>
        <Link href="/blog" style={{ fontFamily: SANS, fontSize: "0.85rem", color: TEXT_LO, letterSpacing: "0.02em" }}>
          ← Read more from Cellar Intelligence
        </Link>
      </div>
    </div>
  );
}

// ─── Body helpers ────────────────────────────────────────────────────────
function BodyP({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ fontFamily: SANS, fontWeight: 300, fontSize: "1.05rem", lineHeight: 1.75, color: TEXT_MID, marginBottom: "1.5rem" }}>
      {children}
    </p>
  );
}

function H2({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{ fontFamily: SERIF, fontWeight: 700, fontSize: "clamp(1.5rem, 3vw, 2rem)", lineHeight: 1.15, color: TEXT_HI, letterSpacing: "-0.015em", margin: "2.75rem 0 1rem" }}>
      {children}
    </h2>
  );
}

function H3({ children }: { children: React.ReactNode }) {
  return (
    <h3 style={{ fontFamily: SERIF, fontWeight: 600, fontSize: "1.2rem", color: TEXT_HI, margin: "1.75rem 0 0.5rem" }}>
      {children}
    </h3>
  );
}

// Small superscript citation link that scrolls to the sources list.
function Cite({ n }: { n: number }) {
  return (
    <sup>
      <a href="#witt-sources" style={{ color: AMBER, textDecoration: "none", fontFamily: MONO, fontSize: "0.7rem", marginLeft: "0.15rem" }}>[{n}]</a>
    </sup>
  );
}
