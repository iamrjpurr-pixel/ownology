import { useEffect, useRef, useState } from "react";
import { Link, useSearch } from "wouter";
import OwnologyLogo from "@/components/OwnologyLogo";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc";

// ─── Waitlist CTA ─────────────────────────────────────────────────────────────
function WaitlistCapture() {
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
        source: "pricing",
        tags: ["waitlist", "pricing"],
      });
      setStatus("success");
      setEmail("");
    } catch {
      setStatus("error");
      setErrorMsg("Something went wrong. Try again or email support@ownology.ai");
    }
  };

  if (status === "success") {
    return (
      <div className="py-6 px-8 rounded-sm inline-block" style={{ background: "color-mix(in oklch, var(--ow-amber) 10%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)" }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontWeight: 500, fontSize: "1.125rem", color: "var(--ow-text-hi)" }}>
          You're on the list. We'll be in touch.
        </p>
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", marginTop: "0.5rem" }}>
          Founding member pricing locked for the first 99 subscribers.
        </p>
      </div>
    );
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto mb-4">
        <input
          type="email"
          required
          value={email}
          onChange={e => setEmail(e.target.value)}
          placeholder="your@winery.com"
          disabled={status === "loading"}
          style={{
            flex: 1,
            background: "var(--ow-bg-raised)",
            border: "1px solid var(--ow-border)",
            borderRadius: "2px",
            padding: "0.75rem 1rem",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.9375rem",
            color: "var(--ow-text-hi)",
            outline: "none",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
          onBlur={e => (e.currentTarget.style.borderColor = "var(--ow-border)")}
        />
        <button
          type="submit"
          disabled={status === "loading"}
          className="btn-amber flex-shrink-0"
          style={{ opacity: status === "loading" ? 0.7 : 1 }}
        >
          {status === "loading" ? "Joining..." : "Start Free Trial"}
        </button>
      </form>
      {status === "error" && (
        <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.875rem", color: "oklch(0.65 0.15 30)", marginBottom: "0.75rem" }}>{errorMsg}</p>
      )}
      <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "var(--ow-text-lo)" }}>
        No credit card required. Or <a href="mailto:support@ownology.ai" style={{ color: "var(--ow-amber)" }}>talk to us directly</a>.
      </p>
    </>
  );
}

/**
 * Ownology Pricing Page
 * Tiers: Free Run / The Cellar Hand / The Press / The Vigneron
 * Credit Packs: The Measure / The Vintage / The Reserve / The Magnum
 * Founding member strategy: first 99 paid subscribers, locked pricing
 *
 * Mobile enhancements (Round 2):
 *  - Billing toggle on mobile cards (synced with hero toggle)
 *  - Info icon popovers on complex features in collapsible list
 *  - Amber pulse animation on The Press card when scrolled to via sticky CTA
 */

// ─── Types ────────────────────────────────────────────────────────────────────
type BillingCycle = "monthly" | "annual";

// ─── Data ─────────────────────────────────────────────────────────────────────
const FOUNDING_SPOTS_REMAINING = 99;

// Feature explanations for info icon popovers — keyed by exact feature string
const FEATURE_EXPLANATIONS: Record<string, string> = {
  // Free Run
  "3 curiosity questions / day": "Ask Ownology three wine questions every day — the counter resets at midnight. No credit card, no commitment.",
  "Flavour science, varietals & regions": "Explore why Shiraz tastes different from Pinot Noir, how tannins work, what makes a wine 'mineral', and how climate shapes flavour. Wine knowledge for curious drinkers, not just winemakers.",
  "Divine Trinity — Science, Vineyard, Craft": "Every answer has a hidden depth layer. Tap Deep Dive to unlock the Divine Trinity: three acts on the same question — The Science (the chemistry behind it), The Vineyard (where it begins in the ground), and The Craft (how the winemaker shaped it). One credit unlocks all three.",
  "First Divine Trinity reveal free": "Your first Divine Trinity is on us — no credits needed. Try it on any answer to see how much deeper the rabbit hole goes.",
  "Free account — no card needed": "Sign up with your email and start immediately. No trial period, no credit card, no catch.",
  "5 Compliance AI queries per month": "Ask up to 5 regulatory questions per month across LIP, FSANZ, and state liquor licensing — no credit card required.",
  "Vintage log (5 entries per month)": "Log up to 5 cellar events per month — enough to follow a single fermentation from inoculation to press.",
  // The Cellar Hand
  "Full Free Run AI tutor — 40+ subjects": "Unlimited access to the full lesson library covering fermentation chemistry, microbiology, sensory science, viticulture, and regulatory compliance.",
  "30 Divine Trinity reveals / mo": "Each credit unlocks the full Divine Trinity for one question — The Science, The Vineyard, and The Craft. One credit = three panels of depth. 30 credits = 30 questions taken all the way to the bottom. Credits reset monthly.",
  "Unlimited Compliance AI queries": "No monthly cap on regulatory questions. Ask anything across LIP, FSANZ, state licensing, and export requirements.",
  // The Press
  "Full cellar operations suite": "The complete Do pillar: The Press (Vintage Log, Batch Book, Barrels, Packaging, Calculations, Export Docs), Cellar Tasks, Vineyard, Quick Entry, and Dashboard.",
  "Knowledge Platform — 38 SOPs, 12 categories": "The full Know pillar: 38 industry-standard SOPs across 12 categories including Fermentation, Sanitation, Barrels, Bottling, Lab, Onboarding, Food Safety, and Traceability. Add Decision Logic, Tribal Knowledge, and Vintage Notes to each SOP.",
  "Priority Compliance AI responses": "Your compliance queries jump the queue — faster response times during busy harvest periods when you need answers in seconds, not minutes.",
  "Vintage log PDF export": "Export your full vintage log as a formatted PDF — useful for audits, cellar notes, and end-of-vintage records.",
  // The Vigneron
  "3 team seats included": "One Vigneron account covers you plus two additional team members — cellar hands, assistant winemakers, or vineyard staff.",
  "Annual knowledge base review alert": "Each year, Ownology flags any regulatory changes in your state jurisdictions so your compliance knowledge stays current without manual checking.",
  "Onboarding call \u2014 30 min": "A 30-minute video call with the Ownology team to configure your Knowledge Platform, set up team seats, and walk through the platform for your specific winery.",
  "Unlimited Divine Trinity reveals": "No monthly cap on Deep Dive credits. Every question you ask can be taken all the way to the Divine Trinity — The Science, The Vineyard, and The Craft — without counting the cost.",
};

// Pillar tags shown on each tier card
type PillarTag = { label: string; color: string };
const PILLAR_TAGS: Record<string, PillarTag[]> = {
  free_run:     [{ label: "GUIDE", color: "oklch(0.65 0.10 160)" }],
  cellar:       [{ label: "LEARN", color: "oklch(0.65 0.10 220)" }, { label: "GUIDE", color: "oklch(0.65 0.10 160)" }],
  press:        [{ label: "DO", color: "var(--ow-amber)" }, { label: "KNOW", color: "oklch(0.62 0.10 45)" }, { label: "GUIDE", color: "oklch(0.65 0.10 160)" }],
  cellar_master:[{ label: "DO", color: "var(--ow-amber)" }, { label: "KNOW", color: "oklch(0.62 0.10 45)" }, { label: "LEARN", color: "oklch(0.65 0.10 220)" }, { label: "GUIDE", color: "oklch(0.65 0.10 160)" }],
};

const TIERS = [
  {
    id: "free_run",
    name: "Free Run",
    tagline: "Understand wine from the inside out.",
    audience: "Wine lovers, curious drinkers, food & wine enthusiasts.",
    monthlyPrice: 0,
    annualPrice: 0,
    highlight: false,
    badge: null,
    color: "var(--ow-text-lo)",
    features: [
      "3 curiosity questions / day",
      "Flavour science, varietals & regions",
      "Divine Trinity — Science, Vineyard, Craft",
      "First Divine Trinity reveal free",
      "Free account — no card needed",
    ],
    cta: "Start Exploring",
    ctaHref: "/free-run",
    note: null,
  },
  {
    id: "cellar",
    name: "The Cellar Hand",
    tagline: "Learn the science. Stay compliant.",
    audience: "Home winemakers and wine students who want to learn.",
    monthlyPrice: 19,
    annualPrice: 190,
    highlight: false,
    badge: "FOUNDING MEMBER",
    color: "oklch(0.65 0.08 75)",
    features: [
      "Full curiosity AI \u2014 40+ subjects",
      "30 Divine Trinity reveals / mo",
      "Unlimited Compliance AI",
      "Vintage log \u2014 unlimited entries",
      "Email support",
      "Founding member badge",
    ],
    cta: "Join The Cellar Hand",
    ctaHref: "#waitlist",
    note: "Less than a bottle of decent Shiraz per month.",
  },
  {
    id: "press",
    name: "The Press",
    tagline: "Full cellar operations + institutional knowledge.",
    audience: "Boutique winery teams who need operations and protocol management.",
    monthlyPrice: 41,
    annualPrice: 410,
    highlight: true,
    badge: "MOST POPULAR",
    color: "var(--ow-amber)",
    features: [
      "Full cellar operations suite",
      "38 SOPs across 12 categories",
      "Decision Logic + Tribal Knowledge",
      "Priority Compliance AI",
      "Vintage log PDF export",
      "Phone & chat support",
    ],
    cta: "Enter The Press",
    ctaHref: "#waitlist",
    note: null,
  },
  {
    id: "cellar_master",
    name: "The Vigneron",
    tagline: "Your whole operation. Your whole team. Your institutional knowledge.",
    audience: "Owner-operator boutique vignerons — you grow the grapes and make the wine.",
    monthlyPrice: 83,
    annualPrice: 830,
    highlight: false,
    badge: "TEAM",
    color: "oklch(0.80 0.14 75)",
    features: [
      "Everything in The Press",
      "Unlimited Divine Trinity reveals",
      "3 team seats included",
      "Onboarding call \u2014 30 min",
      "Annual knowledge base review",
      "Vigneron badge + number",
    ],
    cta: "Claim The Vigneron",
    ctaHref: "#waitlist",
    note: null,
  },
];

const CREDIT_PACKS = [
  {
    id: "starter",
    name: "A Bottle of Curiosity",
    credits: 5,
    price: 4,
    perCredit: "$0.80",
    tagline: "Five Divine Trinity reveals. Packs never expire.",
    badge: null,
  },
  {
    id: "curious",
    name: "A Case of Questions",
    credits: 15,
    price: 9,
    perCredit: "$0.60",
    tagline: "Same price as The Press \u2014 or go unlimited.",
    badge: "MOST POPULAR",
  },
  {
    id: "obsessed",
    name: "The Obsessive",
    credits: 40,
    price: 16,
    perCredit: "$0.40",
    tagline: "For the genuinely wine-obsessed.",
    badge: "BEST VALUE",
  },
];

const FAQS = [
  {
    q: "What is a credit?",
    a: "One credit unlocks the Divine Trinity for one question \u2014 three acts (The Science, The Vineyard, The Craft) that take your curiosity one level deeper. Credits never expire; your knowledge investment has no use-by date.",
  },
  {
    q: "Do credits expire?",
    a: "No. Credit pack credits never expire. We designed it this way deliberately \u2014 curiosity doesn't have a use-by date.",
  },
  {
    q: "What is the Founding Member offer?",
    a: "The first 99 paid subscribers (member numbers 11–99) receive founding member status: pricing locked for life, a permanent founding member badge, direct input into the product roadmap, and their name in the Our Story section (optional). Numbers 1–9 are reserved.",
  },
  {
    q: "Can I change tiers?",
    a: "Yes. You can upgrade or downgrade at any time. Upgrades take effect immediately; downgrades take effect at the next billing cycle. Founding member pricing is locked regardless of tier changes.",
  },
  {
    q: "What is the difference between Free Run and The Press?",
    a: "Free Run is for wine lovers who want to understand wine \u2014 its flavours, science, and origins. It's curiosity-led, free, and requires an account. The Press is for people who make or want to make wine \u2014 full winemaking AI, SOPs, vintage log, and cellar operations. If you've spent $1,000 on equipment, The Press pays for itself in the first harvest.",
  },
  {
    q: "Is there a team plan?",
    a: "Yes — The Vigneron includes 3 team seats. For larger teams (4+ users), contact us for an enterprise quote.",
  },
];

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Nav() {
  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 border-b"
      style={{
        background: "var(--ow-nav-bg)",
        borderColor: "var(--ow-border)",
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="container flex items-center justify-between py-4">
        <Link href="/">
          <OwnologyLogo size={32} showIABadge showTheoryCard />
        </Link>
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-sm transition-colors"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato', sans-serif" }}
          >
            ← Back to Home
          </Link>
        </div>
      </div>
    </nav>
  );
}

// ─── Billing toggle ───────────────────────────────────────────────────────────
function BillingToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  return (
    <div className="flex items-center gap-3 justify-center">
      <button
        onClick={() => onChange("monthly")}
        className="text-sm transition-colors"
        style={{
          fontFamily: "'Lato', sans-serif",
          color: cycle === "monthly" ? "var(--ow-amber)" : "var(--ow-text-lo)",
          fontWeight: cycle === "monthly" ? 600 : 300,
        }}
      >
        Monthly
      </button>
      <button
        onClick={() => onChange(cycle === "monthly" ? "annual" : "monthly")}
        className="relative w-12 h-6 rounded-full transition-colors flex-shrink-0"
        style={{ background: cycle === "annual" ? "var(--ow-amber)" : "var(--ow-bg-inset)" }}
        aria-label="Toggle billing cycle"
      >
        <span
          className="absolute top-1 left-1 w-4 h-4 rounded-full transition-transform"
          style={{
            background: "oklch(0.96 0.010 75)",
            transform: cycle === "annual" ? "translateX(20px)" : "translateX(0px)",
          }}
        />
      </button>
      <button
        onClick={() => onChange("annual")}
        className="text-sm transition-colors flex items-center gap-2"
        style={{
          fontFamily: "'Lato', sans-serif",
          color: cycle === "annual" ? "var(--ow-amber)" : "var(--ow-text-lo)",
          fontWeight: cycle === "annual" ? 600 : 300,
        }}
      >
        Annual
        <span
          className="text-xs px-2 py-0.5 rounded"
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
            color: "var(--ow-amber)",
            fontFamily: "'Fira Code', monospace",
          }}
        >
          SAVE 2 MONTHS
        </span>
      </button>
    </div>
  );
}

// ─── Mini billing toggle for mobile cards ─────────────────────────────────────
// Compact pill switcher that sits inside each mobile tier card
function MiniCycleToggle({
  cycle,
  onChange,
}: {
  cycle: BillingCycle;
  onChange: (c: BillingCycle) => void;
}) {
  return (
    <div
      className="flex items-center rounded-sm overflow-hidden self-start"
      style={{ border: "1px solid var(--ow-border)", background: "var(--ow-bg-raised)" }}
      role="group"
      aria-label="Billing cycle"
    >
      {(["monthly", "annual"] as BillingCycle[]).map(c => (
        <button
          key={c}
          onClick={() => onChange(c)}
          className="px-2.5 py-1 text-xs transition-all duration-150"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: cycle === c ? 600 : 300,
            background: cycle === c ? "var(--ow-amber)" : "transparent",
            color: cycle === c ? "var(--ow-bg-base)" : "var(--ow-text-lo)",
            letterSpacing: "0.04em",
          }}
        >
          {c === "monthly" ? "Mo" : "Yr"}
        </button>
      ))}
    </div>
  );
}

// ─── Feature info icon with popover ──────────────────────────────────────────
function FeatureInfoIcon({ explanation }: { explanation: string }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="inline-flex items-center justify-center flex-shrink-0 w-4 h-4 rounded-full ml-1 align-middle"
          style={{
            background: "var(--ow-bg-inset)",
            border: "1px solid var(--ow-border)",
            verticalAlign: "middle",
          }}
          aria-label="More information"
          onClick={e => e.stopPropagation()}
        >
          <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
            <circle cx="4" cy="2.5" r="0.7" fill="var(--ow-amber)" />
            <path d="M4 4v2.5" stroke="var(--ow-amber)" strokeWidth="1.1" strokeLinecap="round" />
          </svg>
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="max-w-[240px] text-xs p-3"
        style={{
          background: "var(--ow-bg-raised)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)",
          color: "var(--ow-text-mid)",
          fontFamily: "'Lato', sans-serif",
          fontWeight: 300,
          lineHeight: 1.6,
          borderRadius: "4px",
          boxShadow: "0 8px 24px oklch(0 0 0 / 0.6)",
        }}
        sideOffset={6}
      >
        {explanation}
      </PopoverContent>
    </Popover>
  );
}

// ─── Tier card ────────────────────────────────────────────────────────────────
function TierCard({
  tier,
  cycle,
  onCycleChange,
  cardRef,
  flashRef,
}: {
  tier: (typeof TIERS)[0];
  cycle: BillingCycle;
  onCycleChange: (c: BillingCycle) => void;
  cardRef?: React.RefObject<HTMLDivElement | null>;
  flashRef?: React.RefObject<(() => void) | null>;
}) {
  const price = cycle === "annual" ? tier.annualPrice : tier.monthlyPrice;
  const displayPrice =
    cycle === "annual" && tier.annualPrice > 0
      ? Math.round(tier.annualPrice / 12)
      : price;

  // Mobile feature list: collapsed by default for non-highlighted tiers
  const [featuresOpen, setFeaturesOpen] = useState(tier.highlight);

  // Highlight/pulse animation state — triggered by sticky CTA "See Plan"
  const [pulsing, setPulsing] = useState(false);

  // Expose a flash() function via flashRef so StickyMobileCTA can trigger it
  useEffect(() => {
    if (!flashRef) return;
    flashRef.current = () => {
      setPulsing(true);
      setTimeout(() => setPulsing(false), 1600);
    };
  }, [flashRef]);

  // Stripe checkout for paid tiers
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const checkoutMutation = trpc.foundingMembers.createCheckout.useMutation();

  const handleCheckout = async () => {
    if (tier.monthlyPrice === 0) {
      // Free tier — scroll to waitlist
      document.querySelector("#waitlist")?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    setCheckoutLoading(true);
    try {
      const tierId = tier.id as "cellar" | "press" | "cellar_master";
      const result = await checkoutMutation.mutateAsync({
        tier: tierId,
        cycle: cycle === "annual" ? "annual" : "monthly",
        origin: window.location.origin,
      });
      if (result.url) {
        window.open(result.url, "_blank");
      }
    } catch (err) {
      console.error("[Checkout Error]", err);
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div
      ref={cardRef}
      id={`tier-${tier.id}`}
      className="relative flex flex-col rounded-sm transition-all duration-300"
      style={{
        background: tier.highlight ? "oklch(0.16 0.012 60)" : "var(--ow-bg-base)",
        border: pulsing
          ? "1px solid color-mix(in oklch, var(--ow-amber) 90%, transparent)"
          : tier.highlight
            ? "1px solid color-mix(in oklch, var(--ow-amber) 40%, transparent)"
            : "1px solid var(--ow-border)",
        boxShadow: pulsing
          ? "0 0 0 3px color-mix(in oklch, var(--ow-amber) 25%, transparent), 0 0 40px color-mix(in oklch, var(--ow-amber) 20%, transparent)"
          : tier.highlight
            ? "0 4px 32px color-mix(in oklch, var(--ow-amber) 12%, transparent), 0 0 0 1px color-mix(in oklch, var(--ow-amber) 40%, transparent)"
            : "none",
        borderLeft: tier.highlight
          ? "3px solid var(--ow-amber)"
          : pulsing
            ? "3px solid color-mix(in oklch, var(--ow-amber) 90%, transparent)"
            : "1px solid var(--ow-border)",
      }}
    >
      {/* Amber top accent bar for highlighted card */}
      {tier.highlight && (
        <div style={{ height: "3px", background: "var(--ow-amber)", borderRadius: "2px 2px 0 0", marginLeft: "-1px", marginRight: "-1px", marginTop: "-1px" }} />
      )}
      {/* Badge */}
      {tier.badge && (
        <div
          className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs rounded-sm whitespace-nowrap"
          style={{
            background: tier.highlight ? "var(--ow-amber)" : "var(--ow-bg-inset)",
            color: tier.highlight ? "var(--ow-bg-base)" : "var(--ow-amber)",
            fontFamily: "'Fira Code', monospace",
            letterSpacing: "0.08em",
            border: tier.highlight ? "none" : "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          }}
        >
          {tier.badge}
        </div>
      )}

      {/* ── Mobile layout ── */}
      <div className="sm:hidden p-4 pt-5">
        {/* Top row: name + price + mini cycle toggle */}
        <div className="flex items-start justify-between mb-1 gap-2">
          <h3 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.25rem", fontWeight: 600, color: tier.color, lineHeight: 1.2 }}>
            {tier.name}
          </h3>
          <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
            {/* Price display */}
            {tier.monthlyPrice === 0 ? (
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", fontWeight: 700, color: "var(--ow-text-hi)", lineHeight: 1 }}>
                Free
              </span>
            ) : (
              <div className="flex items-end gap-0.5">
                <span style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", fontWeight: 700, color: tier.highlight ? "oklch(0.96 0.010 75)" : "var(--ow-text-hi)", lineHeight: 1 }}>
                  ${displayPrice}
                </span>
                <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: tier.highlight ? "oklch(0.70 0.015 75)" : "var(--ow-text-lo)", marginBottom: "2px" }}>
                  /mo
                </span>
              </div>
            )}
            {/* Mini cycle toggle — only show for paid tiers */}
            {tier.monthlyPrice > 0 && (
              <MiniCycleToggle cycle={cycle} onChange={onCycleChange} />
            )}
          </div>
        </div>

        {/* Annual savings callout */}
        {tier.monthlyPrice > 0 && cycle === "annual" && (
          <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", color: "var(--ow-amber)", marginBottom: "0.375rem", letterSpacing: "0.04em" }}>
            ${tier.annualPrice}/yr · save ${(tier.monthlyPrice * 12) - tier.annualPrice}
          </p>
        )}

        {/* Tagline */}
        <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8125rem", color: "var(--ow-text-lo)", fontStyle: "italic", marginBottom: "0.875rem" }}>
          {tier.tagline}
        </p>

        {/* Feature toggle */}
        <button
          className="w-full flex items-center justify-between py-2 text-left"
          style={{ borderTop: "1px solid var(--ow-border)", borderBottom: featuresOpen ? "none" : "1px solid var(--ow-border)" }}
          onClick={() => setFeaturesOpen(o => !o)}
          aria-expanded={featuresOpen}
        >
          <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.8125rem", color: "oklch(0.60 0.012 75)" }}>
            {featuresOpen ? "Hide features" : `${tier.features.length} features included`}
          </span>
          <svg
            width="14" height="14" viewBox="0 0 14 14" fill="none"
            style={{ transition: "transform 0.2s", transform: featuresOpen ? "rotate(180deg)" : "rotate(0deg)", flexShrink: 0 }}
          >
            <path d="M3 5l4 4 4-4" stroke="var(--ow-amber)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        {/* Collapsible features with info icons */}
        {featuresOpen && (
          <ul className="pt-3 pb-2 space-y-2.5">
            {tier.features.map(f => (
              <li key={f} className="flex items-start gap-2">
                <svg width="13" height="13" viewBox="0 0 14 14" fill="none" className="mt-0.5 flex-shrink-0">
                  <circle cx="7" cy="7" r="6" stroke={tier.color} strokeWidth="1.2" />
                  <path d="M4.5 7l2 2 3-3" stroke={tier.color} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.8125rem", color: tier.highlight ? "oklch(0.82 0.015 75)" : "var(--ow-text-mid)", lineHeight: 1.5 }}>
                  {f}
                  {FEATURE_EXPLANATIONS[f] && (
                    <FeatureInfoIcon explanation={FEATURE_EXPLANATIONS[f]} />
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}

        {/* Note */}
        {tier.note && (
          <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", fontStyle: "italic", color: "var(--ow-text-lo)", marginTop: "0.5rem", marginBottom: "0.75rem" }}>
            {tier.note}
          </p>
        )}

        {/* CTA */}
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="block w-full text-center py-3 rounded-sm text-sm mt-3 transition-all duration-200 cursor-pointer"
          style={
            tier.highlight
              ? {
                  background: checkoutLoading ? "oklch(0.60 0.10 75)" : "var(--ow-amber)",
                  color: "var(--ow-bg-base)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "none",
                  opacity: checkoutLoading ? 0.8 : 1,
                }
              : {
                  background: "transparent",
                  color: "var(--ow-amber)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                  opacity: checkoutLoading ? 0.7 : 1,
                }
          }
        >
          {checkoutLoading ? "Opening checkout…" : tier.cta}
        </button>
      </div>

      {/* ── Desktop layout ── */}
      <div className="hidden sm:flex flex-col flex-1 p-7">
        <div className="mb-6">
          <h3 className="mb-1" style={{ fontFamily: "'Fraunces', serif", fontSize: "1.5rem", fontWeight: 600, color: tier.color }}>
            {tier.name}
          </h3>
          {/* Pillar tags */}
          <div className="flex flex-wrap gap-1 mb-2">
            {(PILLAR_TAGS[tier.id] ?? []).map(tag => (
              <span key={tag.label} style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.6rem", letterSpacing: "0.1em", color: tag.color, border: `1px solid ${tag.color}`, borderRadius: "2px", padding: "1px 5px" }}>
                {tag.label}
              </span>
            ))}
          </div>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "var(--ow-text-lo)", fontStyle: "italic", lineHeight: 1.5 }}>
            {tier.tagline}
          </p>

        </div>
        <div className="mb-7">
          {tier.monthlyPrice === 0 ? (
            <div style={{ fontFamily: "'Fraunces', serif", fontSize: "3.25rem", fontWeight: 700, color: "var(--ow-text-hi)", lineHeight: 1 }}>
              Free
            </div>
          ) : (
            <div className="flex items-end gap-1">
              <span style={{ fontFamily: "'Fraunces', serif", fontSize: "3.25rem", fontWeight: 700, color: tier.highlight ? "oklch(0.96 0.010 75)" : "var(--ow-text-hi)", lineHeight: 1 }}>
                ${displayPrice}
              </span>
              <span className="mb-2" style={{ fontFamily: "'Lato', sans-serif", fontSize: "1rem", color: tier.highlight ? "oklch(0.70 0.015 75)" : "var(--ow-text-lo)" }}>
                /mo
              </span>
            </div>
          )}
          {tier.monthlyPrice > 0 && cycle === "annual" && (
            <p className="mt-1" style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.65rem", color: "var(--ow-amber)", letterSpacing: "0.03em", whiteSpace: "nowrap" }}>
              ${tier.annualPrice}/yr · save ${(tier.monthlyPrice * 12) - tier.annualPrice}
            </p>
          )}
          {tier.note && (
            <p className="mt-2 text-xs" style={{ fontFamily: "'Lato', sans-serif", fontStyle: "italic", color: "var(--ow-text-lo)" }}>
              {tier.note}
            </p>
          )}
        </div>
        <ul className="flex-1 mb-7" style={{ borderTop: "1px solid var(--ow-border)", paddingTop: "1.25rem" }}>
          {tier.features.map((f, i) => (
            <li
              key={f}
              className="flex items-center gap-3 py-2.5"
              style={{
                borderBottom: i < tier.features.length - 1 ? "1px solid color-mix(in oklch, var(--ow-border) 60%, transparent)" : "none",
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="flex-shrink-0">
                <path d="M2.5 6l2.5 2.5 4.5-5" stroke={tier.color} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: tier.highlight ? "oklch(0.85 0.015 75)" : "var(--ow-text-mid)", lineHeight: 1.5 }}>
                {f}
                {FEATURE_EXPLANATIONS[f] && (
                  <FeatureInfoIcon explanation={FEATURE_EXPLANATIONS[f]} />
                )}
              </span>
            </li>
          ))}
        </ul>
        <button
          onClick={handleCheckout}
          disabled={checkoutLoading}
          className="block w-full text-center py-3 rounded-sm text-sm transition-all duration-200 cursor-pointer"
          style={
            tier.highlight
              ? {
                  background: checkoutLoading ? "oklch(0.60 0.10 75)" : "var(--ow-amber)",
                  color: "var(--ow-bg-base)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "none",
                  opacity: checkoutLoading ? 0.8 : 1,
                }
              : {
                  background: "transparent",
                  color: "var(--ow-amber)",
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 400,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                  opacity: checkoutLoading ? 0.7 : 1,
                }
          }
          onMouseEnter={e => { if (!tier.highlight) (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in oklch, var(--ow-amber) 10%, transparent)"; }}
          onMouseLeave={e => { if (!tier.highlight) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          {checkoutLoading ? "Opening checkout…" : tier.cta}
        </button>
      </div>
    </div>
  );
}

// ─── Credit pack card ─────────────────────────────────────────────────────────
function CreditPackCard({ pack }: { pack: (typeof CREDIT_PACKS)[0] }) {
  return (
    <div
      className="relative rounded-sm p-5"
      style={{
        background: "var(--ow-bg-base)",
        border: pack.badge === "BEST VALUE"
          ? "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)"
          : "1px solid var(--ow-border)",
      }}
    >
      {pack.badge && (
        <div
          className="absolute -top-3 left-4 px-2 py-0.5 text-xs rounded-sm"
          style={{
            background: pack.badge === "BEST VALUE" ? "var(--ow-amber)" : "var(--ow-bg-inset)",
            color: pack.badge === "BEST VALUE" ? "var(--ow-bg-base)" : "var(--ow-amber)",
            fontFamily: "'Fira Code', monospace",
            letterSpacing: "0.08em",
            border: pack.badge === "BEST VALUE" ? "none" : "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          }}
        >
          {pack.badge}
        </div>
      )}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h4 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.125rem", fontWeight: 600, color: "var(--ow-text-hi)" }}>
            {pack.name}
          </h4>
          <p className="text-xs mt-0.5" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "var(--ow-text-lo)", fontStyle: "italic" }}>
            {pack.tagline}
          </p>
        </div>
        <div className="text-right">
          <div style={{ fontFamily: "'Fraunces', serif", fontSize: "1.75rem", fontWeight: 700, color: "var(--ow-amber)", lineHeight: 1 }}>
            ${pack.price}
          </div>
          <div className="text-xs mt-0.5" style={{ fontFamily: "'Fira Code', monospace", color: "var(--ow-text-lo)" }}>
            {pack.perCredit}/credit
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between py-2.5 px-3 rounded-sm" style={{ background: "var(--ow-bg-raised)" }}>
        <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.875rem", color: "var(--ow-amber)" }}>
          {pack.credits.toLocaleString()} credits
        </span>
        <span className="text-xs" style={{ fontFamily: "'Lato', sans-serif", color: "var(--ow-text-lo)" }}>
          Never expire
        </span>
      </div>
      <a
        href="#waitlist"
        className="block text-center mt-4 py-2.5 rounded-sm text-sm transition-colors"
        style={{
          background: "transparent",
          color: "var(--ow-amber)",
          fontFamily: "'Lato', sans-serif",
          fontWeight: 400,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          fontSize: "0.75rem",
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = "color-mix(in oklch, var(--ow-amber) 10%, transparent)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = "transparent"; }}
      >
        Purchase Pack
      </a>
    </div>
  );
}

// ─── FAQ item ─────────────────────────────────────────────────────────────────
function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b" style={{ borderColor: "var(--ow-border)" }}>
      <button
        className="w-full flex items-start justify-between py-4 text-left gap-4"
        onClick={() => setOpen(o => !o)}
      >
        <span style={{ fontFamily: "'Lato', sans-serif", fontWeight: 400, fontSize: "0.9375rem", color: "var(--ow-text-mid)" }}>
          {q}
        </span>
        <svg
          width="16" height="16" viewBox="0 0 16 16" fill="none"
          className="flex-shrink-0 mt-0.5 transition-transform"
          style={{ transform: open ? "rotate(45deg)" : "rotate(0deg)" }}
        >
          <path d="M8 3v10M3 8h10" stroke="var(--ow-amber)" strokeWidth="1.4" strokeLinecap="round" />
        </svg>
      </button>
      {open && (
        <p className="pb-4" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.875rem", color: "oklch(0.60 0.012 75)", lineHeight: 1.7 }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ─── Scroll-to-top button ────────────────────────────────────────────────────
// Mobile only. Appears when the user has scrolled past 60% of the page.
// Fades in/out with a CSS transition. Positioned just above the sticky CTA bar.
function ScrollToTopButton({ hasStickyBar }: { hasStickyBar: boolean }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      setVisible(total > 0 && scrolled / total > 0.6);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    // sm:hidden — mobile only
    <button
      onClick={scrollToTop}
      className="sm:hidden fixed z-40 w-11 h-11 rounded-full flex items-center justify-center transition-all duration-300"
      style={{
        right: "1rem",
        // Sit above the sticky CTA bar (≈ 64px) + safe area, or near bottom if bar is gone
        bottom: hasStickyBar
          ? "calc(64px + env(safe-area-inset-bottom, 0px) + 0.75rem)"
          : "calc(env(safe-area-inset-bottom, 0px) + 1rem)",
        background: "var(--ow-bg-inset)",
        border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
        boxShadow: "0 4px 16px oklch(0 0 0 / 0.5)",
        opacity: visible ? 1 : 0,
        pointerEvents: visible ? "auto" : "none",
        transform: visible ? "translateY(0) scale(1)" : "translateY(8px) scale(0.9)",
      }}
      aria-label="Scroll to top"
    >
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <path d="M4 10l4-4 4 4" stroke="var(--ow-amber)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

// ─── Sticky mobile CTA bar ────────────────────────────────────────────────────
function StickyMobileCTA({
  cycle,
  onFlashPress,
  onVisibilityChange,
}: {
  cycle: BillingCycle;
  onFlashPress: () => void;
  onVisibilityChange?: (visible: boolean) => void;
}) {
  const [visible, setVisible] = useState(true);
  const [dismissed, setDismissed] = useState(false);
  const [nearBottom, setNearBottom] = useState(false);

  const highlightedTier = TIERS.find(t => t.highlight)!;
  const price = cycle === "annual"
    ? Math.round(highlightedTier.annualPrice / 12)
    : highlightedTier.monthlyPrice;

  useEffect(() => {
    const waitlistEl = document.getElementById("waitlist");
    if (!waitlistEl) return;
    const observer = new IntersectionObserver(
      ([entry]) => setNearBottom(entry.isIntersecting),
      { rootMargin: "0px 0px -20% 0px", threshold: 0 }
    );
    observer.observe(waitlistEl);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const next = !dismissed && !nearBottom;
    setVisible(next);
    onVisibilityChange?.(next);
  }, [dismissed, nearBottom, onVisibilityChange]);

  const scrollToTier = () => {
    const el = document.getElementById(`tier-${highlightedTier.id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "center" });
    // Trigger the highlight animation on The Press card
    onFlashPress();
  };

  if (!visible) return null;

  return (
    <div
      className="sm:hidden fixed left-0 right-0 z-40"
      style={{
        bottom: 0,
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        background: "var(--ow-nav-bg)",
        borderTop: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
        backdropFilter: "blur(12px)",
        boxShadow: "0 -8px 32px oklch(0 0 0 / 0.5)",
      }}
      role="complementary"
      aria-label="Pricing quick action"
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-1.5">
            <span style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1rem", color: "var(--ow-amber)" }}>
              {highlightedTier.name}
            </span>
            <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.75rem", color: "var(--ow-text-lo)" }}>
              · ${price}/mo
            </span>
          </div>
          <p style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.7rem", color: "var(--ow-text-lo)", lineHeight: 1.3, marginTop: "1px" }}>
            {cycle === "annual" ? "Billed annually · " : ""}Most popular tier
          </p>
        </div>
        <button
          onClick={scrollToTier}
          className="flex-shrink-0 px-4 py-2.5 rounded-sm text-sm font-semibold transition-opacity"
          style={{
            background: "var(--ow-amber)",
            color: "var(--ow-bg-base)",
            fontFamily: "'Lato', sans-serif",
            letterSpacing: "0.05em",
            textTransform: "uppercase",
            fontSize: "0.75rem",
          }}
        >
          See Plan
        </button>
        <button
          onClick={() => setDismissed(true)}
          className="flex-shrink-0 w-7 h-7 flex items-center justify-center rounded-full"
          style={{ background: "var(--ow-bg-inset)", border: "1px solid var(--ow-border)" }}
          aria-label="Dismiss pricing bar"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M2 2l6 6M8 2l-6 6" stroke="var(--ow-text-lo)" strokeWidth="1.4" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Pricing() {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  // flashRef holds the flash() callback registered by The Press TierCard
  const flashRef = useRef<(() => void) | null>(null);
  const pressCardRef = useRef<HTMLDivElement | null>(null);

  // Track whether the sticky CTA bar is visible so the scroll-to-top button
  // can position itself correctly (above the bar vs. near the bottom edge)
  const [stickyBarVisible, setStickyBarVisible] = useState(true);

  // Abandoned Stripe checkout — show a dismissible inline notice
  const search = useSearch();
  const wasCancelled = new URLSearchParams(search).get("cancelled") === "1";
  const [showCancelledBanner, setShowCancelledBanner] = useState(wasCancelled);

  // ── Conversion-attribution: log this /pricing visit once per mount ─────
  // Source comes from `?from=<src>` query param; defaults to "direct" when
  // a visitor lands without a tagged CTA. Powers /admin/funnel.
  const logViewMutation = trpc.pricing.logView.useMutation();
  const loggedRef = useRef(false);
  useEffect(() => {
    if (loggedRef.current) return;
    loggedRef.current = true;
    const params = new URLSearchParams(search);
    const fromRaw = params.get("from")?.trim() || "direct";
    logViewMutation.mutate({
      source: fromRaw,
      referer: typeof document !== "undefined" ? document.referrer.slice(0, 500) : undefined,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent.slice(0, 500) : undefined,
    });
    // Stash for the conversion link — success pages read this within 24h.
    if (typeof window !== "undefined") {
      try {
        window.localStorage.setItem("ow_pricing_source", JSON.stringify({ source: fromRaw, at: Date.now() }));
      } catch { /* private mode or quota — non-fatal */ }
    }
  }, []);

  const handleFlashPress = () => {
    // Small delay to let scroll animation finish before flashing
    setTimeout(() => {
      flashRef.current?.();
    }, 500);
  };

  return (
    <div
      className="min-h-screen"
      style={{
        background: "var(--ow-bg-base)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
      }}
    >
      <Nav />

      {/* Abandoned checkout notice */}
      {showCancelledBanner && (
        <div
          role="status"
          aria-live="polite"
          style={{
            background: "var(--ow-bg-raised)",
            borderBottom: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)",
          }}
        >
          <div
            className="container max-w-5xl mx-auto"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              padding: "0.875rem 1rem",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" style={{ flexShrink: 0 }}>
                <circle cx="8" cy="8" r="7" stroke="var(--ow-amber)" strokeWidth="1.5" />
                <path d="M8 5v3.5" stroke="var(--ow-amber)" strokeWidth="1.5" strokeLinecap="round" />
                <circle cx="8" cy="11" r="0.75" fill="var(--ow-amber)" />
              </svg>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  fontSize: "0.875rem",
                  color: "var(--ow-text-mid)",
                  lineHeight: 1.5,
                }}
              >
                No charge was made — you can subscribe any time.
              </p>
            </div>
            <button
              onClick={() => setShowCancelledBanner(false)}
              aria-label="Dismiss"
              style={{
                background: "transparent",
                border: "none",
                cursor: "pointer",
                padding: "0.25rem",
                color: "var(--ow-text-lo)",
                flexShrink: 0,
                lineHeight: 0,
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M2 2l10 10M12 2L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Hero */}
      <section className="pt-32 pb-20 text-center">
        <div className="container max-w-3xl mx-auto px-4">
          <p className="section-label mb-4" style={{ fontFamily: "'Lato', sans-serif" }}>
            Pricing
          </p>
          <h1
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(2.25rem, 4.5vw, 3.5rem)",
              color: "var(--ow-text-hi)",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
              textWrap: "balance" as "balance",
            }}
          >
            From Free Run to{" "}
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>
              The Vigneron.
            </em>
          </h1>
          <p
            className="mt-4 mb-10"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              fontSize: "1.125rem",
              color: "var(--ow-text-lo)",
              lineHeight: 1.75,
            }}
          >
            Start with free run juice — unforced, natural, no commitment. When you are ready to deep dive, step into The Press. Every tier is designed around the winemaker's working rhythm, not a generic SaaS model.
          </p>
          <BillingToggle cycle={cycle} onChange={setCycle} />
        </div>
      </section>

      {/* Founding member banner */}
      <div className="container max-w-7xl mx-auto mb-8 px-4 sm:px-6">
        <div
          className="rounded-sm px-6 py-5"
          style={{ background: "color-mix(in oklch, var(--ow-amber) 8%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 25%, transparent)" }}
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
            <div className="w-8 h-8 rounded-sm flex items-center justify-center flex-shrink-0" style={{ background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)" }}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2l1.5 3.5L13 6l-2.5 2.5.5 3.5L8 10.5 5 12l.5-3.5L3 6l3.5-.5L8 2z" stroke="var(--ow-amber)" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium" style={{ fontFamily: "'Lato', sans-serif", color: "var(--ow-text-mid)" }}>
                Founding Member Offer — First 99 paid subscribers
              </p>
              <p className="text-xs mt-0.5" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "var(--ow-text-lo)" }}>
                Pricing locked for life · Permanent founding badge · Direct product input · Name in Our Story (optional).
                Numbers 1–9 reserved; public subscriptions begin at #11.
              </p>
            </div>
            <div className="flex-shrink-0 text-center px-5 py-3 rounded-sm" style={{ background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", border: "1px solid color-mix(in oklch, var(--ow-amber) 20%, transparent)" }}>
              <p style={{ fontFamily: "'Fira Code', monospace", fontSize: "2rem", fontWeight: 700, color: "var(--ow-amber)", lineHeight: 1 }}>
                {FOUNDING_SPOTS_REMAINING}
              </p>
              <p style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.65rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", textTransform: "uppercase", marginTop: "0.25rem" }}>
                spots remaining
              </p>
            </div>
          </div>
          <div>
            <div className="flex justify-between mb-1.5">
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
                {99 - FOUNDING_SPOTS_REMAINING} of 99 founding spots claimed
              </span>
              <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.7rem", color: "var(--ow-amber)" }}>
                {Math.round(((99 - FOUNDING_SPOTS_REMAINING) / 99) * 100)}% claimed
              </span>
            </div>
            <div className="w-full h-1.5 rounded-full overflow-hidden" style={{ background: "var(--ow-bg-inset)" }}>
              <div
                className="h-full rounded-full transition-all duration-1000"
                style={{
                  width: `${Math.max(2, ((99 - FOUNDING_SPOTS_REMAINING) / 99) * 100)}%`,
                  background: "linear-gradient(90deg, oklch(0.65 0.10 75), var(--ow-amber))",
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tier cards */}
      <section className="container max-w-7xl mx-auto mb-16 sm:mb-20 px-4 sm:px-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6 pb-24 sm:pb-0">
          {TIERS.map(tier => (
            <TierCard
              key={tier.id}
              tier={tier}
              cycle={cycle}
              onCycleChange={setCycle}
              cardRef={tier.highlight ? pressCardRef : undefined}
              flashRef={tier.highlight ? flashRef : undefined}
            />
          ))}
        </div>
      </section>

      {/* Credit packs */}
      <div className="container max-w-7xl mx-auto mb-16 px-4 sm:px-6">
        <div className="flex items-center gap-4" style={{ borderTop: "1px solid var(--ow-border)" }}>
          <div className="pt-8 flex-1">
            <p className="section-label mb-2" style={{ fontFamily: "'Lato', sans-serif" }}>
              Credit Packs
            </p>
            <h2 style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.75rem", color: "var(--ow-text-hi)" }}>
              Top up when you need it.
            </h2>
            <p className="mt-2 max-w-xl" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "var(--ow-text-lo)", lineHeight: 1.7 }}>
              One credit unlocks the Divine Trinity for one question — The Science, The Vineyard, and The Craft — three acts that take your curiosity one level deeper. Packs never expire. Your knowledge investment has no use-by date.
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-8">
          {CREDIT_PACKS.map(pack => (
            <CreditPackCard key={pack.id} pack={pack} />
          ))}
        </div>
      </div>

      {/* What does one credit get you */}
      <section className="py-16" style={{ background: "var(--ow-bg-base)" }}>
        <div className="container max-w-4xl mx-auto">
          <h2 className="mb-2 text-center" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.5rem", color: "var(--ow-text-hi)" }}>
            What does one credit get you?
          </h2>
          <p className="text-center mb-8" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontSize: "0.9375rem", color: "var(--ow-text-lo)" }}>
              One credit unlocks the full Divine Trinity for one question.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[
              {
                icon: "🔬",
                panel: "The Science",
                desc: "The chemistry, biology, and physics behind what you taste. Why diacetyl makes Chardonnay buttery. What tannins actually are at a molecular level.",
                example: '"Why does this wine taste like this?" — answered at the cellular level.',
              },
              {
                icon: "🌿",
                panel: "The Vineyard",
                desc: "How it starts in the fruit. Soil, climate, variety, canopy — the invisible forces that shape every glass before the winemaker touches it.",
                example: '"Where does this flavour come from?" — traced back to the vine.',
              },
              {
                icon: "🍷",
                panel: "The Craft",
                desc: "How the winemaker shapes, controls, or exploits this characteristic. The decisions that turn grapes into the wine in your glass.",
                example: '"How do winemakers make this happen?" — the artistry explained.',
              },
            ].map(item => (
              <div key={item.panel} className="p-5" style={{ background: "var(--ow-bg-raised)", border: "1px solid var(--ow-border)", borderRadius: "2px" }}>
                <div className="flex items-center gap-3 mb-3">
                  <span style={{ fontSize: "1.5rem" }}>{item.icon}</span>
                  <span className="font-medium" style={{ fontFamily: "'Fraunces', serif", fontSize: "1.0625rem", color: "var(--ow-text-hi)" }}>{item.panel}</span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-sm" style={{ fontFamily: "'Fira Code', monospace", background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)", color: "var(--ow-amber)" }}>1 credit</span>
                </div>
                <p className="text-sm mb-3" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "var(--ow-text-mid)", lineHeight: 1.6 }}>{item.desc}</p>
                <p className="text-xs" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, fontStyle: "italic", color: "var(--ow-text-lo)", lineHeight: 1.5 }}>{item.example}</p>
              </div>
            ))}
          </div>
          <p className="text-center mt-6 text-sm" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "var(--ow-text-lo)", fontStyle: "italic" }}>
            All three panels unlock for one credit. First reveal ever is always free.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-20">
        <div className="container max-w-2xl mx-auto">
          <h2 className="mb-8 text-center" style={{ fontFamily: "'Fraunces', serif", fontWeight: 600, fontSize: "1.75rem", color: "var(--ow-text-hi)" }}>
            Common questions
          </h2>
          <div>
            {FAQS.map(faq => (
              <FaqItem key={faq.q} q={faq.q} a={faq.a} />
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section
        id="waitlist"
        className="py-20 text-center"
        style={{ background: "var(--ow-bg-base)" }}
      >
        <div className="container max-w-2xl mx-auto">
          <p className="section-label mb-4" style={{ fontFamily: "'Lato', sans-serif" }}>
            Early Access
          </p>
          <h2
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "clamp(1.75rem, 3vw, 2.5rem)",
              color: "var(--ow-text-hi)",
              lineHeight: 1.1,
              textWrap: "balance" as "balance",
            }}
          >
            You are the must.
            <br />
            <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>
              Ownology is the ferment.
            </em>
          </h2>
          <p
            className="mt-4 mb-8"
            style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "var(--ow-text-lo)", lineHeight: 1.7 }}
          >
            Join the waitlist for early access and founding member pricing. First 99 paid subscribers receive lifetime locked rates and a permanent founding badge.
          </p>
          <WaitlistCapture />
        </div>
      </section>

      {/* Footer note */}
      <div className="py-6 text-center" style={{ borderTop: "1px solid var(--ow-border)" }}>
        <p className="text-xs" style={{ fontFamily: "'Lato', sans-serif", fontWeight: 300, color: "oklch(0.40 0.010 75)" }}>
          All prices in AUD. USD pricing available for international customers. Founding member pricing locked for life. No credit card required for Free Run.
        </p>
      </div>

      {/* Sticky mobile CTA bar */}
      <StickyMobileCTA cycle={cycle} onFlashPress={handleFlashPress} onVisibilityChange={setStickyBarVisible} />

      {/* Scroll-to-top button — mobile only, appears after 60% scroll */}
      <ScrollToTopButton hasStickyBar={stickyBarVisible} />
    </div>
  );
}
