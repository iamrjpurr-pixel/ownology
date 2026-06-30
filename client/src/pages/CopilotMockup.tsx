/**
 * CopilotMockup — visual storyboard of the Ownology Copilot caption flow.
 *
 * NOT a working feature — pure mockup with hardcoded example content so
 * Roy can preview the end-to-end UX before greenlighting the real build.
 *
 * Sections (top to bottom):
 *   1. The /captions form
 *   2. The 3 caption variants returned
 *   3. The published Instagram post preview (mock IG mobile frame)
 *   4. The Ownology story page that captures the SEO surface
 */
import { Link } from "wouter";

// ─── Mock example payload ──────────────────────────────────────────────
const MOCK = {
  tank: "Tank 7 · Block 4 Shiraz 2026",
  winery: "Brokenwood Wines",
  winemaker: "Nathan",
  emotion: "proud of the team after a long picking week",
  voice: "Poetic",
  cellarFacts: [
    "Picked Mon 6am · Brix 24.3, pH 3.55",
    "Day 1: cap punched, colour extraction observed",
    "Day 2: Brix 21.1 · ferment kinetics strong",
    "Day 3: Brix 18.7 · ML inoculated",
    "Today: pH 3.62 · 'colour leaping out of the cap'",
  ],
  variants: [
    {
      label: "Short · Instagram primary",
      chars: 218,
      text:
        "Four days ago, Block 4 was still on the vine. Tonight, Tank 7 is two-thirds through ferment — the cap leaps with colour every pump-over. We picked at first light Monday after a week the team won't soon forget. This is what proud looks like.",
      hashtags: "#vintage2026 #brokenwoodwines #block4 #shiraz #huntervalley #cellarwork",
    },
    {
      label: "Medium · Facebook / general",
      chars: 412,
      text:
        "There's a particular kind of tired you only earn during picking week. Five days, three growers, one weather window that wouldn't quit. Block 4 fruit came in at 24.3 Brix on Monday morning. Tonight, Tank 7 is already at 18.7, ML inoculated yesterday, and the colour is doing things I haven't seen since 2018. The cap leaps every pump-over. You can smell blueberry and warm stone from the door.",
      hashtags: "#brokenwoodwines #vintage2026 #huntervalleyshiraz #cellarstories #harvestlife",
    },
    {
      label: "Long · LinkedIn reflection",
      chars: 712,
      text:
        "Five days into harvest 2026 and Block 4 is teaching us something. We picked at 24.3 Brix on Monday — earlier than 2024, later than 2023, right in the pocket we'd hoped for. Tank 7 dropped four Brix in 36 hours; we've inoculated for ML; colour is jumping out of the cap on every pump-over. None of those numbers are the story though. The story is the team that showed up at 5:30am for five mornings running, drove the picker for sixteen hours, and still had patience for a second sort table at 9pm. The wine tells us what the vintage was. The team tells us what the winery is.",
      hashtags: "#vintage2026 #brokenwoodwines #winemaking #huntervalley #leadership #cellarwork",
    },
  ],
};

const ATTRIB = "↪ Story powered by my cellar data — ownology.ai";

// ─── Section wrapper ───────────────────────────────────────────────────
function SectionLabel({ step, title, subtitle }: { step: number; title: string; subtitle: string }) {
  return (
    <div style={{ marginBottom: "1.25rem", display: "flex", alignItems: "baseline", gap: "0.9rem" }}>
      <span
        style={{
          background: "var(--ow-amber)",
          color: "white",
          fontFamily: "'Lato',sans-serif",
          fontSize: "0.72rem",
          fontWeight: 800,
          letterSpacing: "0.1em",
          padding: "0.18rem 0.55rem",
          borderRadius: 4,
        }}
      >
        STEP {step}
      </span>
      <div>
        <h2
          style={{
            fontFamily: "'Fraunces',serif",
            fontWeight: 700,
            fontSize: "1.5rem",
            lineHeight: 1.15,
            color: "var(--ow-text-hi)",
            margin: 0,
          }}
        >
          {title}
        </h2>
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.85rem",
            color: "var(--ow-text-mid)",
            marginTop: 4,
            marginBottom: 0,
          }}
        >
          {subtitle}
        </p>
      </div>
    </div>
  );
}

// ─── Step 1 — The form ─────────────────────────────────────────────────
function FormMock() {
  const lbl: React.CSSProperties = {
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.72rem",
    color: "var(--ow-text-lo)",
    fontWeight: 600,
    letterSpacing: "0.08em",
    textTransform: "uppercase",
    marginBottom: 6,
    display: "block",
  };
  const input: React.CSSProperties = {
    background: "var(--ow-bg-base)",
    border: "1px solid var(--ow-border-md)",
    borderRadius: 4,
    padding: "0.7rem 0.85rem",
    fontFamily: "'Lato',sans-serif",
    fontSize: "0.92rem",
    color: "var(--ow-text-hi)",
    width: "100%",
    boxSizing: "border-box",
  };
  return (
    <div
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border-md)",
        borderRadius: 8,
        padding: "1.6rem",
      }}
    >
      <div style={{ display: "grid", gap: "1rem" }}>
        <div>
          <label style={lbl}>Tank / wine</label>
          <div style={input}>▼ {MOCK.tank}</div>
        </div>
        <div>
          <label style={lbl}>How are you feeling?</label>
          <div style={{ ...input, fontStyle: "italic", color: "var(--ow-text-mid)" }}>{MOCK.emotion}</div>
        </div>
        <div>
          <label style={lbl}>Voice</label>
          <div style={input}>▼ {MOCK.voice}</div>
        </div>
        <div>
          <button
            type="button"
            disabled
            style={{
              background: "linear-gradient(180deg, var(--ow-amber-light) 0%, var(--ow-amber) 100%)",
              color: "white",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.9rem",
              fontWeight: 700,
              padding: "0.85rem 1.5rem",
              border: "none",
              borderRadius: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              cursor: "not-allowed",
              opacity: 0.95,
            }}
          >
            ✦ Generate 3 captions
          </button>
        </div>
      </div>

      {/* Sidebar showing what Ownology will weave in */}
      <div
        style={{
          marginTop: "1.5rem",
          background: "var(--ow-bg-base)",
          border: "1px dashed var(--ow-border-md)",
          padding: "0.9rem 1rem",
          borderRadius: 6,
        }}
      >
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", color: "var(--ow-text-lo)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 700, margin: 0, marginBottom: 6 }}>
          Ownology will weave in (from your vintage log)
        </p>
        <ul style={{ margin: 0, paddingLeft: "1.1rem", color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", lineHeight: 1.6 }}>
          {MOCK.cellarFacts.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ─── Step 2 — The 3 caption variants ───────────────────────────────────
function VariantCards() {
  return (
    <div style={{ display: "grid", gap: "1rem" }}>
      {MOCK.variants.map((v, i) => (
        <div
          key={i}
          style={{
            background: "var(--ow-bg-card)",
            border: i === 0 ? "1px solid var(--ow-amber)" : "1px solid var(--ow-border-md)",
            borderRadius: 8,
            padding: "1.2rem 1.4rem",
            position: "relative",
          }}
        >
          {i === 0 && (
            <span
              style={{
                position: "absolute",
                top: -10,
                right: 14,
                background: "var(--ow-amber)",
                color: "white",
                fontFamily: "'Lato',sans-serif",
                fontSize: "0.62rem",
                fontWeight: 800,
                letterSpacing: "0.1em",
                padding: "0.18rem 0.5rem",
                borderRadius: 3,
              }}
            >
              MOST COPIED
            </span>
          )}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
            <span style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700 }}>
              {v.label}
            </span>
            <span style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.7rem", color: "var(--ow-text-lo)" }}>
              {v.chars} chars
            </span>
          </div>
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "0.98rem", lineHeight: 1.55, color: "var(--ow-text-hi)", margin: 0 }}>
            {v.text}
          </p>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "color-mix(in oklch, var(--ow-amber) 70%, var(--ow-text-mid))", marginTop: 10, marginBottom: 0, fontWeight: 500 }}>
            {v.hashtags}
          </p>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.72rem", color: "var(--ow-text-lo)", marginTop: 10, marginBottom: 0, fontStyle: "italic" }}>
            {ATTRIB}
          </p>

          {/* Action row */}
          <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
            {["📋 Copy", "🔄 Regenerate", "📱 Send to phone", "📤 Publish"].map((label) => (
              <button
                key={label}
                type="button"
                style={{
                  background: "var(--ow-bg-base)",
                  border: "1px solid var(--ow-border-md)",
                  color: "var(--ow-text-mid)",
                  fontFamily: "'Lato',sans-serif",
                  fontSize: "0.74rem",
                  fontWeight: 600,
                  padding: "0.4rem 0.7rem",
                  borderRadius: 4,
                  cursor: "default",
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Step 3 — Instagram post preview (mock mobile frame) ───────────────
function InstagramPreview() {
  const v = MOCK.variants[0];
  return (
    <div style={{ display: "flex", gap: "1.5rem", flexWrap: "wrap", alignItems: "flex-start" }}>
      {/* The mock iPhone frame */}
      <div
        style={{
          width: 320,
          background: "black",
          borderRadius: 32,
          padding: "12px 10px",
          boxShadow: "0 18px 60px rgba(0,0,0,0.35), 0 6px 16px rgba(0,0,0,0.25)",
        }}
      >
        {/* Phone notch */}
        <div
          style={{
            background: "black",
            margin: "0 auto 8px",
            width: 100,
            height: 22,
            borderBottomLeftRadius: 14,
            borderBottomRightRadius: 14,
          }}
        />
        {/* Phone screen */}
        <div
          style={{
            background: "#fff",
            borderRadius: 24,
            overflow: "hidden",
            color: "#000",
            fontFamily: "-apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: "0.85rem",
          }}
        >
          {/* IG header */}
          <div style={{ display: "flex", alignItems: "center", padding: "10px 12px", borderBottom: "1px solid #efefef" }}>
            <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #a40d40 0%, #6a032a 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontWeight: 700, fontSize: "0.78rem" }}>
              BW
            </div>
            <div style={{ marginLeft: 10, flex: 1 }}>
              <div style={{ fontWeight: 700, fontSize: "0.85rem" }}>brokenwoodwines</div>
              <div style={{ fontSize: "0.7rem", color: "#888" }}>Hunter Valley, Australia</div>
            </div>
            <span style={{ fontWeight: 700, fontSize: "1rem", letterSpacing: "0.15em" }}>· · ·</span>
          </div>

          {/* IG image — actual cellar photo would go here; using a gradient placeholder */}
          <div
            style={{
              aspectRatio: "1 / 1",
              background:
                "linear-gradient(135deg, oklch(0.35 0.18 12) 0%, oklch(0.22 0.12 8) 50%, oklch(0.18 0.08 4) 100%)",
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "flex-start",
              padding: 14,
              color: "white",
              fontFamily: "'Fraunces',serif",
              fontStyle: "italic",
              fontSize: "0.8rem",
              opacity: 0.95,
            }}
          >
            ⊕ tank 7 — block 4 shiraz, 6.40am
          </div>

          {/* IG action bar */}
          <div style={{ display: "flex", padding: "8px 12px", gap: 14, fontSize: "1.15rem" }}>
            <span>♡</span><span>💬</span><span>↗</span>
            <span style={{ marginLeft: "auto" }}>⌒</span>
          </div>

          {/* Likes count */}
          <div style={{ padding: "0 12px", fontWeight: 700, fontSize: "0.78rem" }}>418 likes</div>

          {/* Caption body */}
          <div style={{ padding: "6px 12px 4px", fontSize: "0.78rem", lineHeight: 1.45 }}>
            <span style={{ fontWeight: 700 }}>brokenwoodwines</span>{" "}
            {v.text}{" "}
            <span style={{ color: "#1a4a7a" }}>{v.hashtags}</span>
          </div>

          {/* Attribution micro-line */}
          <div style={{ padding: "0 12px 4px", fontSize: "0.7rem", color: "#999", fontStyle: "italic" }}>
            {ATTRIB}
          </div>

          {/* IG time */}
          <div style={{ padding: "4px 12px 12px", fontSize: "0.66rem", color: "#999", textTransform: "uppercase" }}>
            2 hours ago · View 23 comments
          </div>
        </div>
      </div>

      {/* Annotation panel */}
      <div style={{ flex: 1, minWidth: 280, paddingTop: 8 }}>
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            fontWeight: 700,
            margin: 0,
            marginBottom: 8,
          }}
        >
          What this post is doing for Ownology
        </p>
        <ul style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.85rem", lineHeight: 1.7, color: "var(--ow-text-mid)", paddingLeft: "1.1rem", margin: 0 }}>
          <li>
            <strong style={{ color: "var(--ow-text-hi)" }}>Attribution line</strong> at the bottom of the caption — discreet, opt-in, links back to ownology.ai
          </li>
          <li>
            <strong style={{ color: "var(--ow-text-hi)" }}>Authentic cellar facts</strong> ({"\u201C"}two-thirds through ferment{"\u201D"}, {"\u201C"}cap leaps with colour{"\u201D"}) = post couldn{"\u2019"}t have been written without Ownology
          </li>
          <li>
            <strong style={{ color: "var(--ow-text-hi)" }}>Hashtags</strong> include winery-specific + region-specific (#brokenwoodwines #huntervalley) for local SEO + community discoverability
          </li>
          <li>
            <strong style={{ color: "var(--ow-text-hi)" }}>Other winemakers who see this post</strong> ask Nathan how he wrote it — Nathan tells them about Ownology
          </li>
          <li>
            Every published post auto-saves to{" "}
            <code style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.74rem", color: "var(--ow-amber)" }}>
              ownology.ai/stories/brokenwood/2026/block-4-day-4
            </code>{" "}
            — that page accrues SEO juice from day one
          </li>
        </ul>
      </div>
    </div>
  );
}

// ─── Step 4 — The Ownology story page that captures the SEO ───────────
function StoryPagePreview() {
  const v = MOCK.variants[2]; // long form for the story page
  return (
    <div style={{ background: "white", borderRadius: 8, border: "1px solid var(--ow-border-md)", overflow: "hidden", color: "#111" }}>
      {/* URL bar mock */}
      <div style={{ background: "#f4f1ec", padding: "8px 14px", borderBottom: "1px solid #e6dfd2", fontFamily: "'Fira Code',monospace", fontSize: "0.74rem", color: "#7a6e57" }}>
        🔒 ownology.ai/stories/brokenwood-wines/2026/block-4-day-4
      </div>
      <div style={{ padding: "2rem 2.5rem", fontFamily: "'Fraunces',serif" }}>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em", textTransform: "uppercase", color: "#b45309", fontWeight: 700, margin: 0, marginBottom: 10 }}>
          Brokenwood Wines · Vintage 2026 · Block 4 Shiraz
        </p>
        <h1 style={{ fontSize: "1.8rem", fontWeight: 700, lineHeight: 1.18, margin: 0, marginBottom: 18, color: "#1a1512", letterSpacing: "-0.01em" }}>
          Five days into harvest, Block 4 is teaching us something.
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.97rem", lineHeight: 1.7, color: "#3a3530", margin: 0, marginBottom: 22 }}>
          {v.text}
        </p>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "#8a7e6b", fontStyle: "italic", margin: 0, marginBottom: 22 }}>
          Published 29 June 2026 · By Nathan, Brokenwood Wines
        </p>

        {/* The crucial CTA — every story page is a prospect funnel */}
        <div style={{ background: "#fff7e8", border: "1px solid #f4d8a3", borderRadius: 6, padding: "1.1rem 1.2rem", marginBottom: 18 }}>
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.1rem", fontWeight: 700, color: "#5c3a06", margin: 0, marginBottom: 6 }}>
            Want captions like this from YOUR cellar?
          </p>
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.82rem", color: "#5c3a06", margin: 0, marginBottom: 10, opacity: 0.85 }}>
            Ownology writes stories grounded in your actual tank data + your voice. Free for the first month.
          </p>
          <span
            style={{
              display: "inline-block",
              background: "#b45309",
              color: "white",
              fontFamily: "'Lato',sans-serif",
              fontSize: "0.78rem",
              fontWeight: 700,
              padding: "0.55rem 1rem",
              borderRadius: 4,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Try the cellar copilot free →
          </span>
        </div>

        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.78rem", color: "#999", margin: 0 }}>
          More from Brokenwood Wines · Vintage 2026 — Day 8 racking notes · Day 12 first taste · Day 18 to barrel
        </p>
      </div>
    </div>
  );
}

// ─── Top-level ─────────────────────────────────────────────────────────
export default function CopilotMockup() {
  return (
    <div
      data-testid="copilot-mockup-page"
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        padding: "3rem 1.5rem 6rem",
        color: "var(--ow-text-hi)",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <p
          style={{
            fontFamily: "'Lato',sans-serif",
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "var(--ow-amber)",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          Storyboard · Ownology Copilot
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces',serif",
            fontSize: "clamp(2rem, 4vw, 2.8rem)",
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: "-0.02em",
            margin: 0,
            marginBottom: "1rem",
            color: "var(--ow-text-hi)",
          }}
        >
          From cellar moment to published story — in four taps.
        </h1>
        <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "1rem", lineHeight: 1.6, color: "var(--ow-text-mid)", maxWidth: 640, marginBottom: "2.5rem" }}>
          Walking storyboard of how a winemaker uses Ownology Copilot to turn a tank moment + a feeling into a published Instagram post AND a public story page on ownology.ai.
          Mockup content only — no AI calls yet.
        </p>

        {/* STEP 1 */}
        <SectionLabel
          step={1}
          title="Open Copilot, pick a tank, type the feeling"
          subtitle="Two dropdowns + one sentence. Whole input takes ~15 seconds."
        />
        <FormMock />

        <Spacer />

        {/* STEP 2 */}
        <SectionLabel
          step={2}
          title="Three caption variants in your chosen voice"
          subtitle="Cellar facts woven in automatically. Each variant tuned to a different platform's optimal length."
        />
        <VariantCards />

        <Spacer />

        {/* STEP 3 */}
        <SectionLabel
          step={3}
          title="Published to Instagram (copy-paste, no Meta integration needed)"
          subtitle="Winemaker taps Copy, switches to IG, pastes. Whole publish flow is ~8 seconds."
        />
        <InstagramPreview />

        <Spacer />

        {/* STEP 4 */}
        <SectionLabel
          step={4}
          title="Same caption becomes a public story page on ownology.ai"
          subtitle="This is where the SEO flywheel starts compounding. Every published post = one indexable, ranking page on Ownology's domain."
        />
        <StoryPagePreview />

        <Spacer />

        {/* Outro */}
        <div
          style={{
            background: "color-mix(in oklch, var(--ow-amber) 12%, var(--ow-bg-card))",
            border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
            borderRadius: 8,
            padding: "1.5rem 1.7rem",
            marginTop: "2rem",
          }}
        >
          <p style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--ow-amber)", fontWeight: 700, margin: 0, marginBottom: 8 }}>
            The flywheel in one sentence
          </p>
          <p style={{ fontFamily: "'Fraunces',serif", fontSize: "1.2rem", lineHeight: 1.45, color: "var(--ow-text-hi)", margin: 0 }}>
            Winemaker uses Ownology → caption auto-published to <code style={{ fontFamily: "'Fira Code',monospace", fontSize: "0.85rem", color: "var(--ow-amber)" }}>ownology.ai/stories</code> → that page ranks for long-tail wine searches → new prospects land on Ownology → some convert to paying customers → who post more captions → which create more story pages → which rank for more searches.
          </p>
        </div>

        <p style={{ marginTop: "2.5rem", fontFamily: "'Lato',sans-serif", fontSize: "0.85rem" }}>
          <Link href="/home" style={{ color: "var(--ow-amber)", fontWeight: 700 }}>
            ← Back to home
          </Link>
        </p>
      </div>
    </div>
  );
}

function Spacer() {
  return <div style={{ height: 48 }} />;
}
