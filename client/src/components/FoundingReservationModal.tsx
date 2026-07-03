/**
 * FoundingReservationModal — captures a warm Founding-Member lead without
 * requiring live Stripe. Opened by the Pricing "Start Founding Member" CTA
 * while `STRIPE_SECRET_KEY=sk_test_stub` blocks real checkout.
 *
 * Flow:
 *   1. User fills name / email / winery / phone (optional)
 *   2. `foundingMembers.reserve` mutation writes the row, sends Resend
 *      confirmation to the customer + owner alert
 *   3. Success state shows "Slot #X of 99 reserved — I'll DM you in 24hrs"
 *
 * Data-testids follow the reservation-modal-* prefix so launch tests
 * (see GO_LIVE_PLAN §6 Saturday-morning smoke test) can drive it.
 */
import { useEffect, useState } from "react";
import { trpc } from "../lib/trpc";

type Tier = "cellar" | "press" | "cellar_master";
type Cycle = "monthly" | "annual";

const TIER_LABEL: Record<Tier, string> = {
  cellar: "The Cellar Hand",
  press: "The Press",
  cellar_master: "The Vigneron",
};

export function FoundingReservationModal({
  open,
  onClose,
  tier = "cellar",
  cycle = "monthly",
  referralCode,
}: {
  open: boolean;
  onClose: () => void;
  tier?: Tier;
  cycle?: Cycle;
  referralCode?: string;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [wineryName, setWineryName] = useState("");
  const [phone, setPhone] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ slotNumber: number; cap: number } | null>(null);

  const utils = trpc.useUtils();
  const count = trpc.foundingMembers.getReservationCount.useQuery(undefined, {
    enabled: open,
  });
  const reserve = trpc.foundingMembers.reserve.useMutation({
    onSuccess: (data) => {
      setSuccess({ slotNumber: data.slotNumber, cap: data.cap });
      setErrorMsg(null);
      utils.foundingMembers.getReservationCount.invalidate();
    },
    onError: (err) => {
      setErrorMsg(err.message || "Something went wrong — please try again.");
    },
  });

  // Reset when the modal is re-opened for a new attempt.
  useEffect(() => {
    if (!open) {
      setSuccess(null);
      setErrorMsg(null);
    }
  }, [open]);

  // Escape-key close — required for a11y and expected UX. Listener only
  // active while modal is open to avoid interfering with page-level shortcuts.
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    if (!name.trim() || !email.trim() || !wineryName.trim()) {
      setErrorMsg("Name, email and winery name are required.");
      return;
    }
    reserve.mutate({
      name: name.trim(),
      email: email.trim(),
      wineryName: wineryName.trim(),
      phone: phone.trim() || undefined,
      tier,
      cycle,
      referralCode: referralCode?.trim() || undefined,
      source: "pricing_modal",
    });
  };

  const remaining = count.data ? Math.max(0, count.data.cap - count.data.total) : null;

  return (
    <div
      data-testid="reservation-modal-backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      style={{
        position: "fixed",
        inset: 0,
        background: "color-mix(in oklch, black 65%, transparent)",
        backdropFilter: "blur(4px)",
        zIndex: 9999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1rem",
      }}
    >
      <div
        data-testid="reservation-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-modal-title"
        style={{
          background: "var(--ow-bg-base, #1a1512)",
          color: "var(--ow-text-hi, #f4ede4)",
          border: "1px solid color-mix(in oklch, var(--ow-amber) 30%, transparent)",
          borderRadius: 8,
          padding: "1.75rem 1.6rem 1.5rem",
          width: "100%",
          maxWidth: 480,
          maxHeight: "92vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,0.55), 0 0 0 1px color-mix(in oklch, var(--ow-amber) 40%, transparent)",
          fontFamily: "'Lato', sans-serif",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          data-testid="reservation-modal-close"
          aria-label="Close"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            background: "transparent",
            border: "none",
            color: "var(--ow-text-lo, #a09383)",
            fontSize: 22,
            cursor: "pointer",
            lineHeight: 1,
            padding: "4px 8px",
          }}
        >
          ×
        </button>

        {!success ? (
          <>
            <div style={{ marginBottom: "1.1rem" }}>
              <p
                style={{
                  fontSize: "0.68rem",
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "var(--ow-amber, #d97706)",
                  fontWeight: 700,
                  margin: "0 0 6px",
                }}
              >
                Reserve your Founding-Member slot
              </p>
              <h2
                id="reservation-modal-title"
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontSize: "1.55rem",
                  fontWeight: 700,
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                {TIER_LABEL[tier]} · {cycle === "annual" ? "Annual" : "Monthly"}
              </h2>
              <p
                data-testid="reservation-modal-slot-counter"
                style={{
                  fontSize: "0.82rem",
                  color: "var(--ow-text-mid, #cbb99f)",
                  marginTop: 8,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                {count.data
                  ? remaining !== null && remaining > 0
                    ? `${count.data.total} of ${count.data.cap} spots claimed — ${remaining} left. Lock yours in below; I'll DM you within 24hrs to arrange payment.`
                    : `All ${count.data.cap} Founding-Member spots are claimed — joining the waitlist for the next cohort.`
                  : "Locked-in pricing forever · 44-day trial · Personal onboarding call."}
              </p>
            </div>

            <form onSubmit={handleSubmit} data-testid="reservation-form">
              <div style={{ display: "grid", gap: "0.7rem" }}>
                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle}>Your name</span>
                  <input
                    data-testid="reservation-name-input"
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    style={fieldInputStyle}
                    placeholder="Sarah Winemaker"
                    autoFocus
                    maxLength={256}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle}>Email</span>
                  <input
                    data-testid="reservation-email-input"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    style={fieldInputStyle}
                    placeholder="you@yourwinery.com.au"
                    maxLength={256}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle}>Winery name</span>
                  <input
                    data-testid="reservation-winery-input"
                    type="text"
                    required
                    value={wineryName}
                    onChange={(e) => setWineryName(e.target.value)}
                    style={fieldInputStyle}
                    placeholder="Ownology Cellars"
                    maxLength={256}
                  />
                </label>
                <label style={{ display: "block" }}>
                  <span style={fieldLabelStyle}>
                    Phone <span style={{ color: "var(--ow-text-lo, #a09383)", fontWeight: 400 }}>(optional — for the DM)</span>
                  </span>
                  <input
                    data-testid="reservation-phone-input"
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    style={fieldInputStyle}
                    placeholder="+61 4XX XXX XXX"
                    maxLength={64}
                  />
                </label>
              </div>

              {errorMsg && (
                <div
                  data-testid="reservation-error"
                  style={{
                    marginTop: 12,
                    padding: "0.6rem 0.8rem",
                    background: "color-mix(in oklch, #b23a3a 15%, transparent)",
                    border: "1px solid color-mix(in oklch, #b23a3a 40%, transparent)",
                    borderRadius: 4,
                    color: "#f4a5a5",
                    fontSize: "0.82rem",
                  }}
                >
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                data-testid="reservation-submit-btn"
                disabled={reserve.isPending}
                style={{
                  marginTop: "1.1rem",
                  width: "100%",
                  background: reserve.isPending ? "color-mix(in oklch, var(--ow-amber) 60%, black)" : "var(--ow-amber, #d97706)",
                  color: "var(--ow-bg-base, #1a1512)",
                  border: "none",
                  borderRadius: 4,
                  padding: "0.85rem 1rem",
                  fontSize: "0.82rem",
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  cursor: reserve.isPending ? "not-allowed" : "pointer",
                  opacity: reserve.isPending ? 0.8 : 1,
                  fontFamily: "'Lato', sans-serif",
                }}
              >
                {reserve.isPending ? "Reserving…" : "Reserve my slot"}
              </button>

              <p
                style={{
                  fontSize: "0.7rem",
                  color: "var(--ow-text-lo, #a09383)",
                  marginTop: 12,
                  marginBottom: 0,
                  lineHeight: 1.5,
                }}
              >
                No card required now. Payment link sent by DM after we chat. Your data lives in Sydney (Railway MySQL) and never trains an LLM. See <a href="/privacy" style={{ color: "var(--ow-amber, #d97706)" }}>Privacy</a> · <a href="/terms" style={{ color: "var(--ow-amber, #d97706)" }}>Terms</a>.
              </p>
            </form>
          </>
        ) : (
          <div data-testid="reservation-success" style={{ padding: "0.5rem 0" }}>
            <p
              style={{
                fontSize: "0.68rem",
                letterSpacing: "0.14em",
                textTransform: "uppercase",
                color: "var(--ow-amber, #d97706)",
                fontWeight: 700,
                margin: "0 0 8px",
              }}
            >
              Reserved · Slot #{success.slotNumber} of {success.cap}
            </p>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontSize: "1.7rem",
                fontWeight: 700,
                margin: "0 0 12px",
                lineHeight: 1.2,
              }}
            >
              You're in the club.
            </h2>
            <p style={{ fontSize: "0.92rem", color: "var(--ow-text-mid, #cbb99f)", lineHeight: 1.55, marginBottom: 12 }}>
              I'll personally DM or email you within <strong style={{ color: "var(--ow-text-hi, #f4ede4)" }}>24 hours</strong> to arrange payment. Your locked-in tier pricing is fixed for life — no annual increases, ever.
            </p>
            <ul
              style={{
                fontSize: "0.86rem",
                color: "var(--ow-text-mid, #cbb99f)",
                lineHeight: 1.6,
                paddingLeft: 20,
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              <li>44-day trial (14 standard + 30 Founding bonus)</li>
              <li>Direct input on what I build next</li>
              <li>Your name in Our Story section (optional)</li>
            </ul>
            <p style={{ fontSize: "0.82rem", color: "var(--ow-text-lo, #a09383)", marginBottom: 18 }}>
              Confirmation email on its way. While you wait, browse <a href="/cellar-journal" style={{ color: "var(--ow-amber, #d97706)" }}>236 winemaker Q&amp;As</a> — free, no signup.
            </p>
            <button
              onClick={onClose}
              data-testid="reservation-close-btn"
              style={{
                width: "100%",
                background: "transparent",
                color: "var(--ow-amber, #d97706)",
                border: "1px solid color-mix(in oklch, var(--ow-amber) 35%, transparent)",
                borderRadius: 4,
                padding: "0.75rem 1rem",
                fontSize: "0.82rem",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                fontFamily: "'Lato', sans-serif",
              }}
            >
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

const fieldLabelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.72rem",
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ow-text-lo, #a09383)",
  fontWeight: 700,
  marginBottom: 4,
};

const fieldInputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.6rem 0.75rem",
  background: "color-mix(in oklch, white 4%, transparent)",
  border: "1px solid var(--ow-border, #3a2f28)",
  borderRadius: 4,
  color: "var(--ow-text-hi, #f4ede4)",
  fontSize: "0.9rem",
  fontFamily: "'Lato', sans-serif",
  outline: "none",
  boxSizing: "border-box",
};
