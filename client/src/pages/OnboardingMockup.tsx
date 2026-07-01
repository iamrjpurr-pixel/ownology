/**
 * OnboardingMockup — clickable visual preview of the Founding-Member
 * Onboarding Wizard spec (see /app/memory/FOUNDING_MEMBER_ONBOARDING_SPEC.md).
 *
 * NOT WIRED TO ANY BACKEND. Purpose: let the user feel the flow before
 * committing to the ~15hr production build. State resets on refresh.
 *
 * Design notes:
 *  - 5 steps in a reducer state machine (name → brand → use-case → import → complete)
 *  - Progress indicator at the top: "Step N of 4 · About X seconds left"
 *  - Skip button on every step, same visual weight as Continue (skippable ≠ optional feel)
 *  - Uses existing theme tokens so it looks native across parchment / cellar-night / soft-cellar
 *  - The "brand scrape" step is faked with a setTimeout — real version calls
 *    `winery.scrapeBranding` which delegates to node-vibrant + SSRF-guarded fetch
 *  - No routes are pushed, no data persists; a "Reset walkthrough" button in the
 *    footer restarts from Step 1
 *
 * When we build the real version, this file becomes the visual reference —
 * copy stays, wiring changes.
 */
import { useState } from "react";
import { Link } from "wouter";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronRight,
  Wine,
  ShieldCheck,
  FlaskConical,
  Camera,
  Users,
  Compass,
  Upload,
  Sparkles,
  RotateCcw,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────────────
type StepId = "name" | "brand" | "usecase" | "import" | "complete";
type UseCase = "lip_audit" | "cellar_decisions" | "marketing" | "team_memory" | "exploring";
type BrandStatus = "idle" | "loading" | "found" | "failed";

type WizardState = {
  step: StepId;
  wineryName: string;
  contactName: string;
  region: string;
  websiteUrl: string;
  logoUrl: string | null;
  brandColor: string;
  colorCandidates: string[];
  useCase: UseCase | null;
  importChoice: "csv" | "fresh" | "demo" | null;
  brandStatus: BrandStatus;
};

const INITIAL: WizardState = {
  step: "name",
  wineryName: "",
  contactName: "",
  region: "",
  websiteUrl: "",
  logoUrl: null,
  brandColor: "#b45309",
  colorCandidates: [],
  useCase: null,
  importChoice: null,
  brandStatus: "idle",
};

const STEP_ORDER: StepId[] = ["name", "brand", "usecase", "import"];
const STEP_LABELS: Record<StepId, string> = {
  name: "About your winery",
  brand: "Grab your branding",
  usecase: "What brings you here",
  import: "Bring in your first vintage",
  complete: "You're set",
};
const STEP_SECS: Record<StepId, number> = {
  name: 5, brand: 15, usecase: 10, import: 15, complete: 0,
};

// Faux scrape response — real version hits `winery.scrapeBranding({url})`.
// We echo a warm palette so the visual matches the Ownology aesthetic.
const FAUX_SCRAPE: Record<string, { logo: string; colors: string[]; detectedName?: string }> = {
  DEFAULT: {
    logo: "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=200&h=200&fit=crop&auto=format",
    colors: ["#8b2635", "#c17817", "#3d5a3d"],
    detectedName: "Redstone Ridge Wines",
  },
};

// ── Component ────────────────────────────────────────────────────────────
export default function OnboardingMockup() {
  const [s, setS] = useState<WizardState>(INITIAL);

  const currentIdx = STEP_ORDER.indexOf(s.step);
  const secsLeft = STEP_ORDER
    .slice(Math.max(0, currentIdx))
    .reduce((n, k) => n + STEP_SECS[k], 0);

  const goto = (step: StepId) => setS((x) => ({ ...x, step }));
  const advance = () => {
    const next = STEP_ORDER[currentIdx + 1];
    goto(next ?? "complete");
  };
  const back = () => {
    const prev = STEP_ORDER[currentIdx - 1];
    if (prev) goto(prev);
  };
  const reset = () => setS(INITIAL);

  const runFakeScrape = () => {
    setS((x) => ({ ...x, brandStatus: "loading" }));
    // 1.6s to feel real without being annoying. Real version awaits network.
    setTimeout(() => {
      const r = FAUX_SCRAPE.DEFAULT;
      setS((x) => ({
        ...x,
        brandStatus: "found",
        logoUrl: r.logo,
        brandColor: r.colors[0],
        colorCandidates: r.colors,
      }));
    }, 1600);
  };

  return (
    <div
      data-testid="onboarding-mockup"
      style={{
        minHeight: "100dvh",
        background: "var(--ow-bg-base, #FAFAF9)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "1.5rem 1.25rem 3rem",
        fontFamily: "'Lato', sans-serif",
        color: "var(--ow-text-hi, #111827)",
      }}
    >
      {/* MOCKUP banner — makes clear this isn't the real thing */}
      <div
        data-testid="onboarding-mockup-banner"
        style={{
          maxWidth: 560,
          width: "100%",
          padding: "0.5rem 0.75rem",
          background: "color-mix(in oklch, var(--ow-amber) 15%, transparent)",
          border: "1px dashed var(--ow-amber)",
          borderRadius: 6,
          fontSize: "0.75rem",
          color: "var(--ow-amber)",
          marginBottom: "1.5rem",
          textAlign: "center",
        }}
      >
        <strong>MOCKUP</strong> — this is a clickable preview of the Founding-Member Onboarding Wizard. Nothing is saved. Refresh to reset.
      </div>

      {/* Header — Ownology mark + step counter */}
      <header style={{ maxWidth: 560, width: "100%", marginBottom: "2rem" }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: "0.6rem",
          letterSpacing: "0.14em",
          textTransform: "uppercase",
          color: "var(--ow-amber)",
          margin: 0,
        }}>
          Ownology · Founding-Member Onboarding
        </p>
        {s.step !== "complete" && (
          <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: "0.5rem" }}>
            <p
              data-testid="onboarding-mockup-progress"
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 700,
                fontSize: "1.5rem",
                color: "var(--ow-text-hi)",
                margin: 0,
              }}
            >
              Step {currentIdx + 1} of {STEP_ORDER.length}
            </p>
            <p style={{ fontSize: "0.8rem", color: "var(--ow-text-lo)", margin: 0 }}>
              About {secsLeft} seconds left · {STEP_LABELS[s.step]}
            </p>
          </div>
        )}
        {/* Progress bar */}
        {s.step !== "complete" && (
          <div style={{ marginTop: "0.75rem", display: "flex", gap: 4 }}>
            {STEP_ORDER.map((id, i) => (
              <div
                key={id}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 2,
                  background: i <= currentIdx ? "var(--ow-amber)" : "var(--ow-border)",
                  transition: "background 300ms",
                }}
              />
            ))}
          </div>
        )}
      </header>

      {/* Step body */}
      <main style={{ maxWidth: 560, width: "100%" }}>
        {s.step === "name" && <StepName state={s} setState={setS} onNext={advance} />}
        {s.step === "brand" && (
          <StepBrand
            state={s}
            setState={setS}
            onScrape={runFakeScrape}
            onNext={advance}
            onBack={back}
          />
        )}
        {s.step === "usecase" && <StepUseCase state={s} setState={setS} onNext={advance} onBack={back} />}
        {s.step === "import" && <StepImport state={s} setState={setS} onNext={advance} onBack={back} />}
        {s.step === "complete" && <StepComplete state={s} onReset={reset} />}
      </main>

      {/* Reset walkthrough footer — visible on every step */}
      <footer style={{
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid var(--ow-border)",
        maxWidth: 560,
        width: "100%",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: "0.72rem",
        color: "var(--ow-text-lo)",
      }}>
        <Link href="/guide" data-testid="onboarding-mockup-exit" style={{ color: "var(--ow-text-lo)" }}>
          ← Back to Guide
        </Link>
        <button
          onClick={reset}
          data-testid="onboarding-mockup-reset"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            background: "transparent",
            border: "1px solid var(--ow-border)",
            padding: "0.35rem 0.75rem",
            borderRadius: 4,
            fontSize: "0.72rem",
            color: "var(--ow-text-mid)",
            cursor: "pointer",
            fontFamily: "inherit",
          }}
        >
          <RotateCcw size={12} />
          Reset walkthrough
        </button>
      </footer>
    </div>
  );
}

// ─── Step 1 · Name ────────────────────────────────────────────────────────
function StepName({ state, setState, onNext }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; onNext: () => void;
}) {
  const canContinue = state.wineryName.trim().length > 0;
  return (
    <Card>
      <StepIcon><Wine size={28} /></StepIcon>
      <Heading>So Ownology knows what to call you.</Heading>
      <Sub>Takes about 5 seconds. Every field except the winery name is optional — you can fill them in later from Settings.</Sub>

      <Field label="Winery name" required>
        <input
          data-testid="onb-name-winery"
          value={state.wineryName}
          onChange={(e) => setState((s) => ({ ...s, wineryName: e.target.value }))}
          placeholder="Redstone Ridge Wines"
          style={inputStyle}
        />
      </Field>

      <Field label="Your first name" hint="Used in warm-intro links (e.g. &quot;Sarah at Redstone Ridge invited you&quot;) and nurture emails.">
        <input
          data-testid="onb-name-contact"
          value={state.contactName}
          onChange={(e) => setState((s) => ({ ...s, contactName: e.target.value }))}
          placeholder="Sarah"
          style={inputStyle}
        />
      </Field>

      <Field label="Region" hint="Wine Australia GI or equivalent — used on your LIP Audit Pack header.">
        <input
          data-testid="onb-name-region"
          value={state.region}
          onChange={(e) => setState((s) => ({ ...s, region: e.target.value }))}
          placeholder="Barossa Valley"
          style={inputStyle}
        />
      </Field>

      <ButtonRow>
        <PrimaryButton data-testid="onb-name-continue" onClick={onNext} disabled={!canContinue}>
          Continue <ArrowRight size={16} />
        </PrimaryButton>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 2 · Brand ─────────────────────────────────────────────────────────
function StepBrand({ state, setState, onScrape, onNext, onBack }: {
  state: WizardState;
  setState: (fn: (s: WizardState) => WizardState) => void;
  onScrape: () => void; onNext: () => void; onBack: () => void;
}) {
  return (
    <Card>
      <StepIcon accent><Sparkles size={28} /></StepIcon>
      <Heading>The magic moment.</Heading>
      <Sub>
        Paste your winery&apos;s website URL — we&apos;ll grab your logo and brand colours so every PDF you export is instantly on-brand.
      </Sub>

      {state.brandStatus !== "found" && (
        <>
          <Field label="Your website URL">
            <input
              data-testid="onb-brand-url"
              value={state.websiteUrl}
              onChange={(e) => setState((s) => ({ ...s, websiteUrl: e.target.value }))}
              placeholder="https://redstoneridgewines.com.au"
              style={inputStyle}
              disabled={state.brandStatus === "loading"}
            />
          </Field>
          <PrimaryButton
            data-testid="onb-brand-scrape"
            onClick={onScrape}
            disabled={state.brandStatus === "loading" || state.websiteUrl.trim().length === 0}
            wide
          >
            {state.brandStatus === "loading" ? "🎨 Analysing your site…" : "Grab my branding"}
          </PrimaryButton>
        </>
      )}

      {state.brandStatus === "found" && state.logoUrl && (
        <>
          <p style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "1.05rem",
            color: "var(--ow-text-hi)",
            margin: "1rem 0 0.75rem",
          }}>
            We found this.
          </p>
          {/* Logo + colour preview */}
          <div style={{
            display: "flex",
            gap: "1rem",
            padding: "1rem",
            border: "1px solid var(--ow-border)",
            borderRadius: 6,
            background: "var(--ow-bg-card)",
            marginBottom: "1rem",
          }}>
            <img
              data-testid="onb-brand-logo-preview"
              src={state.logoUrl}
              alt="Detected logo"
              style={{ width: 72, height: 72, objectFit: "cover", borderRadius: 4, flexShrink: 0 }}
            />
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-text-lo)", margin: 0 }}>
                Colour palette · pick one
              </p>
              <div style={{ display: "flex", gap: 8, marginTop: "0.5rem" }}>
                {state.colorCandidates.map((c) => (
                  <button
                    key={c}
                    onClick={() => setState((s) => ({ ...s, brandColor: c }))}
                    data-testid={`onb-brand-swatch-${c.replace("#", "")}`}
                    aria-label={`Use colour ${c}`}
                    style={{
                      width: 32, height: 32, borderRadius: "50%", background: c,
                      border: state.brandColor === c ? "3px solid var(--ow-text-hi)" : "2px solid var(--ow-border)",
                      cursor: "pointer",
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.5rem 0 0" }}>
                Selected: <span style={{ fontFamily: "'JetBrains Mono', monospace", color: state.brandColor }}>{state.brandColor}</span>
              </p>
            </div>
          </div>

          {/* Live preview — mini PDF header */}
          <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-text-lo)", margin: "1.25rem 0 0.5rem" }}>
            Sample LIP Audit Pack header with your branding
          </p>
          <div
            data-testid="onb-brand-pdf-preview"
            style={{
              padding: "1rem 1.25rem",
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              background: "#FFFFFF",
              display: "flex",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <img src={state.logoUrl} alt="" style={{ width: 40, height: 40, borderRadius: 3, objectFit: "cover" }} />
            <div style={{ flex: 1 }}>
              <p style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", fontWeight: 700, color: state.brandColor, margin: 0 }}>
                {state.wineryName || "Your Winery"}
              </p>
              <p style={{ fontSize: "0.72rem", color: "#555", margin: "0.15rem 0 0" }}>
                {state.region || "Region"} · Vintage 2026 · LIP Audit Pack
              </p>
              <div style={{ height: 2, background: state.brandColor, marginTop: "0.4rem", width: "100%" }} />
            </div>
          </div>
        </>
      )}

      <ButtonRow>
        <SecondaryButton data-testid="onb-brand-back" onClick={onBack}><ArrowLeft size={16} /> Back</SecondaryButton>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SecondaryButton data-testid="onb-brand-skip" onClick={onNext}>Skip, I&apos;ll do it later</SecondaryButton>
          {state.brandStatus === "found" && (
            <PrimaryButton data-testid="onb-brand-continue" onClick={onNext}>
              Looks great <ArrowRight size={16} />
            </PrimaryButton>
          )}
        </div>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 3 · Use case ────────────────────────────────────────────────────
function StepUseCase({ state, setState, onNext, onBack }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; onNext: () => void; onBack: () => void;
}) {
  const options: Array<{ id: UseCase; icon: React.ReactNode; label: string; sub: string }> = [
    { id: "lip_audit",         icon: <ShieldCheck size={20} />, label: "LIP audit prep",      sub: "I dread audit week. Make it painless." },
    { id: "cellar_decisions",  icon: <FlaskConical size={20} />, label: "Cellar decisions",   sub: "Ask Ownology anything, get grounded answers." },
    { id: "marketing",         icon: <Camera size={20} />,       label: "Marketing / IG",     sub: "Turn cellar work into stories." },
    { id: "team_memory",       icon: <Users size={20} />,        label: "Team memory",        sub: "Multiple winemakers, one source of truth." },
    { id: "exploring",         icon: <Compass size={20} />,      label: "Just exploring",     sub: "Show me what you\u2019ve got." },
  ];
  return (
    <Card>
      <StepIcon><Compass size={28} /></StepIcon>
      <Heading>What are you here to solve?</Heading>
      <Sub>Pick one — we&apos;ll surface the parts of Ownology that solve this first. You can always change it later.</Sub>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {options.map((opt) => {
          const active = state.useCase === opt.id;
          return (
            <button
              key={opt.id}
              data-testid={`onb-usecase-${opt.id}`}
              onClick={() => setState((s) => ({ ...s, useCase: opt.id }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                padding: "0.9rem 1rem",
                background: active ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "var(--ow-bg-card)",
                border: `1px solid ${active ? "var(--ow-amber)" : "var(--ow-border)"}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                color: "inherit",
              }}
            >
              <span style={{ color: active ? "var(--ow-amber)" : "var(--ow-text-lo)", flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--ow-text-hi)" }}>{opt.label}</p>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "var(--ow-text-mid)" }}>{opt.sub}</p>
              </div>
              {active && <Check size={18} style={{ color: "var(--ow-amber)" }} />}
            </button>
          );
        })}
      </div>

      <ButtonRow>
        <SecondaryButton data-testid="onb-usecase-back" onClick={onBack}><ArrowLeft size={16} /> Back</SecondaryButton>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SecondaryButton data-testid="onb-usecase-skip" onClick={onNext}>Skip</SecondaryButton>
          <PrimaryButton data-testid="onb-usecase-continue" onClick={onNext} disabled={!state.useCase}>
            Continue <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 4 · Import ──────────────────────────────────────────────────────
function StepImport({ state, setState, onNext, onBack }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void; onNext: () => void; onBack: () => void;
}) {
  const options: Array<{ id: "csv" | "fresh" | "demo"; icon: React.ReactNode; label: string; sub: string }> = [
    { id: "csv",   icon: <Upload size={20} />,       label: "Import from CSV",     sub: "Your last 30\u201390 days of vintage-log entries. We\u2019ll parse it." },
    { id: "fresh", icon: <FlaskConical size={20} />, label: "Start fresh",         sub: "Log your first entry manually. The Cellar Brief comes alive after ~5 entries." },
    { id: "demo",  icon: <Sparkles size={20} />,     label: "Use demo data",       sub: "Preview a fully-populated 12-day vintage before touching real cellar data." },
  ];
  return (
    <Card>
      <StepIcon><Upload size={28} /></StepIcon>
      <Heading>Bring in your first vintage.</Heading>
      <Sub>The Cellar Brief needs a few entries to feel alive. Pick a starting point — none of them are permanent.</Sub>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {options.map((opt) => {
          const active = state.importChoice === opt.id;
          return (
            <button
              key={opt.id}
              data-testid={`onb-import-${opt.id}`}
              onClick={() => setState((s) => ({ ...s, importChoice: opt.id }))}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.9rem",
                padding: "0.9rem 1rem",
                background: active ? "color-mix(in oklch, var(--ow-amber) 12%, transparent)" : "var(--ow-bg-card)",
                border: `1px solid ${active ? "var(--ow-amber)" : "var(--ow-border)"}`,
                borderRadius: 6,
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "left",
                color: "inherit",
              }}
            >
              <span style={{ color: active ? "var(--ow-amber)" : "var(--ow-text-lo)", flexShrink: 0 }}>{opt.icon}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: 700, color: "var(--ow-text-hi)" }}>{opt.label}</p>
                <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "var(--ow-text-mid)" }}>{opt.sub}</p>
              </div>
              {active && <Check size={18} style={{ color: "var(--ow-amber)" }} />}
            </button>
          );
        })}
      </div>

      <ButtonRow>
        <SecondaryButton data-testid="onb-import-back" onClick={onBack}><ArrowLeft size={16} /> Back</SecondaryButton>
        <PrimaryButton data-testid="onb-import-continue" onClick={onNext}>
          Finish setup <ArrowRight size={16} />
        </PrimaryButton>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 5 · Complete ────────────────────────────────────────────────────
function StepComplete({ state, onReset }: { state: WizardState; onReset: () => void }) {
  const attribution = state.contactName && state.wineryName
    ? `${state.contactName} at ${state.wineryName}`
    : state.wineryName || "your winery";
  return (
    <Card>
      <div style={{
        width: 56, height: 56, borderRadius: "50%",
        background: "color-mix(in oklch, var(--ow-amber) 20%, transparent)",
        display: "flex", alignItems: "center", justifyContent: "center",
        color: "var(--ow-amber)", marginBottom: "1rem",
      }}>
        <Check size={32} />
      </div>
      <Heading>You&apos;re set, {state.contactName || "winemaker"}.</Heading>
      <Sub>
        Everything is tuned for {attribution}. Your daily Cellar Brief lands at 5:30am, and the pillar you cared about most is promoted at the top.
      </Sub>

      <div style={{
        marginTop: "1.5rem",
        padding: "1rem 1.25rem",
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
        borderRadius: 6,
      }}>
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-amber)", margin: 0 }}>
          What happens next
        </p>
        <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--ow-text-mid)" }}>
          <li>Your first Cellar Brief is being prepared — open it now to see today&apos;s attention items.</li>
          <li>All LIP Audit Packs and exports will render with the {state.logoUrl ? "branding we grabbed" : "default Ownology branding — set it later in /admin/settings"}.</li>
          <li>Your referral link is <strong>ownology.ai/join?ref=YOUR-CODE</strong> — every winemaker you invite gives you +30 trial days.</li>
        </ul>
      </div>

      <ButtonRow>
        <SecondaryButton data-testid="onb-complete-reset" onClick={onReset}>
          <RotateCcw size={14} /> Replay walkthrough
        </SecondaryButton>
        <Link
          href="/cellar-brief"
          data-testid="onb-complete-brief"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.7rem 1.1rem",
            background: "var(--ow-amber)",
            color: "#111",
            fontWeight: 700,
            fontSize: "0.9rem",
            borderRadius: 4,
            textDecoration: "none",
          }}
        >
          Open my Cellar Brief <ChevronRight size={16} />
        </Link>
      </ButtonRow>
    </Card>
  );
}

// ─── Small shared UI ──────────────────────────────────────────────────────
function Card({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "var(--ow-bg-card, #FFFFFF)",
      border: "1px solid var(--ow-border, #E8EAED)",
      borderRadius: 8,
      padding: "1.75rem 1.5rem",
      boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
    }}>{children}</div>
  );
}
function StepIcon({ children, accent }: { children: React.ReactNode; accent?: boolean }) {
  return (
    <div style={{
      width: 48, height: 48, borderRadius: "50%",
      background: accent
        ? "color-mix(in oklch, var(--ow-amber) 25%, transparent)"
        : "color-mix(in oklch, var(--ow-amber) 10%, transparent)",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "var(--ow-amber)", marginBottom: "0.75rem",
    }}>{children}</div>
  );
}
function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 style={{
      fontFamily: "'Fraunces', serif",
      fontSize: "1.5rem",
      fontWeight: 700,
      color: "var(--ow-text-hi)",
      lineHeight: 1.25,
      margin: "0 0 0.5rem",
    }}>{children}</h2>
  );
}
function Sub({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      color: "var(--ow-text-mid)",
      fontSize: "0.9rem",
      lineHeight: 1.55,
      margin: "0 0 1.5rem",
    }}>{children}</p>
  );
}
function Field({ label, hint, required, children }: {
  label: string; hint?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1rem" }}>
      <label style={{
        display: "block",
        fontSize: "0.72rem",
        textTransform: "uppercase",
        letterSpacing: "0.08em",
        color: "var(--ow-text-lo)",
        fontWeight: 700,
        marginBottom: "0.35rem",
      }}>
        {label}{required && <span style={{ color: "var(--ow-amber)" }}> *</span>}
      </label>
      {children}
      {hint && <p style={{ fontSize: "0.72rem", color: "var(--ow-text-lo)", margin: "0.35rem 0 0", lineHeight: 1.4 }}>{hint}</p>}
    </div>
  );
}
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.65rem 0.75rem",
  border: "1px solid var(--ow-border)",
  borderRadius: 4,
  fontSize: "0.95rem",
  fontFamily: "inherit",
  background: "var(--ow-bg-card)",
  color: "var(--ow-text-hi)",
};
function ButtonRow({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "0.5rem",
      marginTop: "1.5rem",
      flexWrap: "wrap",
    }}>{children}</div>
  );
}
function PrimaryButton(
  { children, onClick, disabled, wide, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { wide?: boolean }
) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.7rem 1.1rem",
        background: "var(--ow-amber)",
        color: "#111",
        fontWeight: 700,
        fontSize: "0.9rem",
        border: 0,
        borderRadius: 4,
        cursor: disabled ? "not-allowed" : "pointer",
        opacity: disabled ? 0.5 : 1,
        fontFamily: "inherit",
        width: wide ? "100%" : undefined,
        justifyContent: wide ? "center" : undefined,
      }}
    >
      {children}
    </button>
  );
}
function SecondaryButton({ children, onClick, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      onClick={onClick}
      {...rest}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "0.4rem",
        padding: "0.7rem 1rem",
        background: "transparent",
        color: "var(--ow-text-mid)",
        fontWeight: 600,
        fontSize: "0.85rem",
        border: "1px solid var(--ow-border)",
        borderRadius: 4,
        cursor: "pointer",
        fontFamily: "inherit",
      }}
    >
      {children}
    </button>
  );
}
