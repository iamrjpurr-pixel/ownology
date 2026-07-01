/**
 * Onboarding — value-engineered version of the Founding-Member wizard.
 *
 * What ships in v1 (this file):
 *   Step 1  Name       → winery.update({wineryName, contactName, region})   ← real
 *   Step 2  Brand      → manual paste of logoUrl + brandColor hex           ← real
 *                        (no automated scrape — deferred to v2, saves 5hr)
 *   Step 3  Use case   → stored in localStorage as `ow-primary-use-case`    ← client-only
 *                        (no new DB column — surface it to the dashboard in v2)
 *   Step 4  Vintage    → deep-links out to /import or /the-press            ← no wiring needed
 *   Step 5  Complete   → auto-fires referrals.applyToCurrent if a stored    ← real
 *                        `ow-referral-code` exists, then routes to /cellar-brief
 *
 * What was cut vs the original 15hr spec (and why):
 *   ✗ Domain scraper (node-vibrant + SSRF guard + fallback UX) — 5hr of one-off
 *     work for a scrape that fires once per lifetime. Users paste their own
 *     hex + logo URL for now. Value/effort ratio didn't justify pre-launch.
 *   ✗ `onboarding_events` table + funnel measurement — nice to have but not
 *     the wizard's job to build the analytics table. Add PostHog/Plausible
 *     post-launch and get the same signal.
 *   ✗ `users.primary_use_case` column — localStorage is fine for the first
 *     30 users. When there's real signal, migrate to DB.
 *
 * Route: `/onboarding` (Stripe success_url should be changed to point here).
 * Legacy `/founding-member/success` stays reachable as a fallback surface.
 */
import { useState, useEffect } from "react";
import { Link } from "wouter";
import { trpc } from "../lib/trpc";
import {
  ArrowLeft, ArrowRight, Check, ChevronRight,
  Wine, ShieldCheck, FlaskConical, Camera, Users, Compass,
  Upload, Sparkles, RotateCcw, Palette,
} from "lucide-react";

const REF_STORAGE_KEY = "ow-referral-code";
const USECASE_STORAGE_KEY = "ow-primary-use-case";

type StepId = "name" | "brand" | "usecase" | "import" | "complete";
type UseCase = "lip_audit" | "cellar_decisions" | "marketing" | "team_memory" | "exploring";

type WizardState = {
  step: StepId;
  wineryName: string;
  contactName: string;
  region: string;
  logoUrl: string;
  brandColor: string;
  useCase: UseCase | null;
  saveStatus: "idle" | "saving" | "saved" | "error";
  saveError: string | null;
  attribution: string | null;
  rewardGranted: number;
};

const INITIAL: WizardState = {
  step: "name",
  wineryName: "",
  contactName: "",
  region: "",
  logoUrl: "",
  brandColor: "#b45309",
  useCase: null,
  saveStatus: "idle",
  saveError: null,
  attribution: null,
  rewardGranted: 0,
};

const STEP_ORDER: StepId[] = ["name", "brand", "usecase", "import"];
const STEP_LABELS: Record<StepId, string> = {
  name: "About your winery",
  brand: "Your branding",
  usecase: "What brings you here",
  import: "Bring in your first vintage",
  complete: "Ready",
};
const STEP_SECS: Record<StepId, number> = { name: 5, brand: 10, usecase: 10, import: 10, complete: 0 };

export default function Onboarding() {
  const [s, setS] = useState<WizardState>(INITIAL);
  const { data: winery, refetch: refetchWinery } = trpc.winery.current.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const updateWinery = trpc.winery.update.useMutation();
  const applyReferral = trpc.referrals.applyToCurrent.useMutation();

  // Hydrate defaults from current winery on first load — a Founding Member
  // may already have some fields set from Stripe checkout or a prior visit.
  useEffect(() => {
    if (!winery) return;
    setS((x) => x.wineryName === "" ? {
      ...x,
      wineryName: winery.name ?? "",
      contactName: winery.contactName ?? "",
      region: winery.region ?? "",
      logoUrl: winery.logoUrl ?? "",
      brandColor: winery.brandColor ?? "#b45309",
    } : x);
  }, [winery]);

  const currentIdx = STEP_ORDER.indexOf(s.step);
  const secsLeft = STEP_ORDER
    .slice(Math.max(0, currentIdx))
    .reduce((n, k) => n + STEP_SECS[k], 0);

  const goto = (step: StepId) => setS((x) => ({ ...x, step }));
  const advance = () => {
    const next = STEP_ORDER[currentIdx + 1];
    if (next) goto(next);
    else finish();
  };
  const back = () => {
    const prev = STEP_ORDER[currentIdx - 1];
    if (prev) goto(prev);
  };
  const reset = () => setS(INITIAL);

  const saveNameStep = async () => {
    setS((x) => ({ ...x, saveStatus: "saving", saveError: null }));
    try {
      await updateWinery.mutateAsync({
        name: s.wineryName.trim() || undefined,
        contactName: s.contactName.trim(),
        region: s.region.trim(),
      });
      setS((x) => ({ ...x, saveStatus: "saved" }));
      await refetchWinery();
      advance();
    } catch (err) {
      setS((x) => ({
        ...x,
        saveStatus: "error",
        saveError: err instanceof Error ? err.message : "Save failed — check your connection.",
      }));
    }
  };

  const saveBrandStep = async () => {
    setS((x) => ({ ...x, saveStatus: "saving", saveError: null }));
    try {
      await updateWinery.mutateAsync({
        logoUrl: s.logoUrl.trim() || null,
        brandColor: s.brandColor.trim() || null,
      });
      setS((x) => ({ ...x, saveStatus: "saved" }));
      await refetchWinery();
      advance();
    } catch (err) {
      setS((x) => ({
        ...x,
        saveStatus: "error",
        saveError: err instanceof Error ? err.message : "Save failed.",
      }));
    }
  };

  const persistUseCaseAndAdvance = () => {
    if (s.useCase) {
      try { localStorage.setItem(USECASE_STORAGE_KEY, s.useCase); } catch { /* private mode */ }
    }
    advance();
  };

  const finish = async () => {
    // Close the referral loop if the visitor arrived via /join?ref=CODE
    // before checkout — we stashed the code in localStorage there.
    let code: string | null = null;
    try { code = localStorage.getItem(REF_STORAGE_KEY); } catch { /* private mode */ }
    if (code) {
      try {
        const res = await applyReferral.mutateAsync({ code });
        if (res.ok) {
          const attribution = res.referrerContact && res.referrerName
            ? `${res.referrerContact} at ${res.referrerName}`
            : res.referrerName ?? null;
          setS((x) => ({
            ...x,
            attribution,
            rewardGranted: (res as { rewardDaysGranted?: number }).rewardDaysGranted ?? 0,
          }));
          try { localStorage.removeItem(REF_STORAGE_KEY); } catch { /* private mode */ }
        }
      } catch { /* soft-fail — completion still works */ }
    }
    goto("complete");
  };

  return (
    <div
      data-testid="onboarding"
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
          <>
            <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginTop: "0.5rem" }}>
              <p
                data-testid="onboarding-progress"
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
          </>
        )}
      </header>

      <main style={{ maxWidth: 560, width: "100%" }}>
        {s.step === "name" && (
          <StepName
            state={s}
            setState={setS}
            onNext={saveNameStep}
            saving={s.saveStatus === "saving"}
          />
        )}
        {s.step === "brand" && (
          <StepBrand
            state={s}
            setState={setS}
            onNext={saveBrandStep}
            onSkip={advance}
            onBack={back}
            saving={s.saveStatus === "saving"}
          />
        )}
        {s.step === "usecase" && (
          <StepUseCase state={s} setState={setS} onNext={persistUseCaseAndAdvance} onBack={back} />
        )}
        {s.step === "import" && <StepImport onNext={finish} onBack={back} />}
        {s.step === "complete" && <StepComplete state={s} onReset={reset} />}
      </main>

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
        <Link href="/cellar-brief" data-testid="onboarding-exit" style={{ color: "var(--ow-text-lo)" }}>
          Skip onboarding →
        </Link>
        {s.step !== "complete" && (
          <button
            onClick={reset}
            data-testid="onboarding-reset"
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
            Restart
          </button>
        )}
      </footer>
    </div>
  );
}

// ─── Step 1 · Name ────────────────────────────────────────────────────────
function StepName({ state, setState, onNext, saving }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void;
  onNext: () => void; saving: boolean;
}) {
  const canContinue = state.wineryName.trim().length > 0 && !saving;
  return (
    <Card>
      <StepIcon><Wine size={28} /></StepIcon>
      <Heading>So Ownology knows what to call you.</Heading>
      <Sub>Takes about 5 seconds. Every field except the winery name is optional — you can change any of it later from Settings.</Sub>

      <Field label="Winery name" required>
        <input
          data-testid="onb-name-winery"
          value={state.wineryName}
          onChange={(e) => setState((s) => ({ ...s, wineryName: e.target.value }))}
          placeholder="Redstone Ridge Wines"
          style={inputStyle}
          disabled={saving}
        />
      </Field>

      <Field label="Your first name" hint='Used in warm-intro links ("Sarah at Redstone Ridge invited you") and nurture emails.'>
        <input
          data-testid="onb-name-contact"
          value={state.contactName}
          onChange={(e) => setState((s) => ({ ...s, contactName: e.target.value }))}
          placeholder="Sarah"
          style={inputStyle}
          disabled={saving}
        />
      </Field>

      <Field label="Region" hint="Wine Australia GI or equivalent — used on your LIP Audit Pack header.">
        <input
          data-testid="onb-name-region"
          value={state.region}
          onChange={(e) => setState((s) => ({ ...s, region: e.target.value }))}
          placeholder="Barossa Valley"
          style={inputStyle}
          disabled={saving}
        />
      </Field>

      {state.saveError && <ErrorLine>{state.saveError}</ErrorLine>}

      <ButtonRow>
        <span />
        <PrimaryButton data-testid="onb-name-continue" onClick={onNext} disabled={!canContinue}>
          {saving ? "Saving…" : "Continue"} <ArrowRight size={16} />
        </PrimaryButton>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 2 · Brand (manual paste — no scraper in v1) ────────────────────
function StepBrand({ state, setState, onNext, onSkip, onBack, saving }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void;
  onNext: () => void; onSkip: () => void; onBack: () => void; saving: boolean;
}) {
  return (
    <Card>
      <StepIcon accent><Palette size={28} /></StepIcon>
      <Heading>Your branding.</Heading>
      <Sub>
        Every LIP Audit Pack and Cellar Brief PDF renders with your logo and brand colour. Paste them once, and every future export is on-brand automatically.
      </Sub>

      <Field label="Logo URL" hint="Direct link to a PNG or JPG. Skip this if you don&#39;t have one to hand.">
        <input
          data-testid="onb-brand-logo-url"
          value={state.logoUrl}
          onChange={(e) => setState((s) => ({ ...s, logoUrl: e.target.value }))}
          placeholder="https://yourwinery.com/logo.png"
          style={inputStyle}
          disabled={saving}
        />
      </Field>

      <Field label="Brand colour (hex)" hint="Six-character hex code — used for headers, dividers, and status accents.">
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <input
            data-testid="onb-brand-color-hex"
            value={state.brandColor}
            onChange={(e) => setState((s) => ({ ...s, brandColor: e.target.value }))}
            placeholder="#b45309"
            style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace" }}
            disabled={saving}
            maxLength={7}
          />
          <input
            type="color"
            value={/^#[0-9a-f]{6}$/i.test(state.brandColor) ? state.brandColor : "#b45309"}
            onChange={(e) => setState((s) => ({ ...s, brandColor: e.target.value }))}
            data-testid="onb-brand-color-picker"
            aria-label="Pick brand colour"
            disabled={saving}
            style={{
              width: 44,
              height: 40,
              padding: 0,
              border: "1px solid var(--ow-border)",
              borderRadius: 4,
              cursor: "pointer",
              background: "transparent",
            }}
          />
        </div>
      </Field>

      {/* Live preview */}
      <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-text-lo)", margin: "1.25rem 0 0.5rem" }}>
        Sample LIP Audit Pack header — live preview
      </p>
      <div
        data-testid="onb-brand-preview"
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
        {state.logoUrl.trim() ? (
          <img
            src={state.logoUrl}
            alt=""
            style={{ width: 40, height: 40, borderRadius: 3, objectFit: "cover" }}
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
          />
        ) : (
          <div style={{ width: 40, height: 40, borderRadius: 3, background: "#f5f5f4", display: "flex", alignItems: "center", justifyContent: "center", color: "#a8a29e", fontSize: "0.65rem" }}>
            logo
          </div>
        )}
        <div style={{ flex: 1 }}>
          <p style={{
            fontFamily: "'Fraunces', serif",
            fontSize: "1.05rem",
            fontWeight: 700,
            color: /^#[0-9a-f]{6}$/i.test(state.brandColor) ? state.brandColor : "#111",
            margin: 0,
          }}>
            {state.wineryName || "Your Winery"}
          </p>
          <p style={{ fontSize: "0.72rem", color: "#555", margin: "0.15rem 0 0" }}>
            {state.region || "Region"} · Vintage 2026 · LIP Audit Pack
          </p>
          <div style={{ height: 2, background: /^#[0-9a-f]{6}$/i.test(state.brandColor) ? state.brandColor : "#111", marginTop: "0.4rem", width: "100%" }} />
        </div>
      </div>

      {state.saveError && <ErrorLine>{state.saveError}</ErrorLine>}

      <ButtonRow>
        <SecondaryButton data-testid="onb-brand-back" onClick={onBack} disabled={saving}>
          <ArrowLeft size={16} /> Back
        </SecondaryButton>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <SecondaryButton data-testid="onb-brand-skip" onClick={onSkip} disabled={saving}>
            Skip
          </SecondaryButton>
          <PrimaryButton data-testid="onb-brand-continue" onClick={onNext} disabled={saving}>
            {saving ? "Saving…" : "Save & continue"} <ArrowRight size={16} />
          </PrimaryButton>
        </div>
      </ButtonRow>
    </Card>
  );
}

// ─── Step 3 · Use case (localStorage only) ─────────────────────────────────
function StepUseCase({ state, setState, onNext, onBack }: {
  state: WizardState; setState: (fn: (s: WizardState) => WizardState) => void;
  onNext: () => void; onBack: () => void;
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
      <Sub>Pick one — we&apos;ll promote the parts of Ownology that solve this first on your dashboard. You can always change it later.</Sub>

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

// ─── Step 4 · Import (deep-link out, no in-wizard wiring) ─────────────────
function StepImport({ onNext, onBack }: { onNext: () => void; onBack: () => void }) {
  const options: Array<{ id: string; icon: React.ReactNode; label: string; sub: string; href: string }> = [
    { id: "csv",   icon: <Upload size={20} />,       label: "Import from CSV",     sub: "Your last 30\u201390 days of vintage-log entries. We\u2019ll parse it.", href: "/import" },
    { id: "fresh", icon: <FlaskConical size={20} />, label: "Start fresh",         sub: "Log your first entry manually. The Cellar Brief comes alive after ~5 entries.", href: "/the-press" },
    { id: "demo",  icon: <Sparkles size={20} />,     label: "Use demo data",       sub: "Preview a fully-populated 12-day vintage before touching real cellar data.", href: "/cellar-brief" },
  ];
  return (
    <Card>
      <StepIcon><Upload size={28} /></StepIcon>
      <Heading>Bring in your first vintage.</Heading>
      <Sub>Pick a starting point — you can do this later too. Each option opens in the same tab.</Sub>

      <div style={{ display: "grid", gap: "0.5rem" }}>
        {options.map((opt) => (
          <Link
            key={opt.id}
            href={opt.href}
            data-testid={`onb-import-${opt.id}`}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.9rem",
              padding: "0.9rem 1rem",
              background: "var(--ow-bg-card)",
              border: "1px solid var(--ow-border)",
              borderRadius: 6,
              textDecoration: "none",
              color: "inherit",
              fontFamily: "inherit",
            }}
          >
            <span style={{ color: "var(--ow-text-lo)", flexShrink: 0 }}>{opt.icon}</span>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: "var(--ow-text-hi)" }}>{opt.label}</p>
              <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "var(--ow-text-mid)" }}>{opt.sub}</p>
            </div>
            <ChevronRight size={16} style={{ color: "var(--ow-text-lo)" }} />
          </Link>
        ))}
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
      <Heading>You&apos;re set{state.contactName ? `, ${state.contactName}` : ""}.</Heading>
      <Sub>
        Everything is tuned for {attribution}. Your daily Cellar Brief lands at 5:30am, and any pillar you promoted is now the top of the dashboard.
      </Sub>

      {/* Delight moment — referrer congrats. Only renders when the wizard
          successfully closed the referral loop via referrals.applyToCurrent. */}
      {state.attribution && state.rewardGranted > 0 && (
        <div
          data-testid="onboarding-referral-congrats"
          style={{
            marginTop: "1rem",
            padding: "0.9rem 1.1rem",
            background: "color-mix(in oklch, #166534 8%, transparent)",
            border: "1px solid #16653455",
            borderRadius: 6,
          }}
        >
          <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "#166534", margin: 0, fontWeight: 700 }}>
            Referral closed
          </p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.9rem", color: "var(--ow-text-mid)", lineHeight: 1.5 }}>
            {state.attribution} just earned <strong>+{state.rewardGranted} free trial days</strong> for referring you. We&apos;ll let them know.
          </p>
        </div>
      )}

      <div style={{
        marginTop: "1.25rem",
        padding: "1rem 1.25rem",
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
        borderRadius: 6,
      }}>
        <p style={{ fontSize: "0.72rem", textTransform: "uppercase", letterSpacing: "0.1em", color: "var(--ow-amber)", margin: 0 }}>
          What happens next
        </p>
        <ul style={{ margin: "0.75rem 0 0", paddingLeft: "1.2rem", fontSize: "0.9rem", lineHeight: 1.6, color: "var(--ow-text-mid)" }}>
          <li>Open your Cellar Brief now to see today&apos;s attention items.</li>
          <li>All LIP Audit Packs and exports will render with the branding you saved.</li>
          <li>Your referral link is on the /invite page — every winemaker you refer earns you +30 trial days.</li>
        </ul>
      </div>

      <ButtonRow>
        <SecondaryButton data-testid="onb-complete-reset" onClick={onReset}>
          <RotateCcw size={14} /> Replay
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

// ─── Shared UI (identical to the mockup for visual parity) ────────────────
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
function ErrorLine({ children }: { children: React.ReactNode }) {
  return (
    <p data-testid="onboarding-error" style={{
      fontSize: "0.8rem",
      color: "#b91c1c",
      margin: "0.5rem 0 0",
    }}>
      {children}
    </p>
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
