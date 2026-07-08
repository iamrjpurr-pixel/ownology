/**
 * /install-ios — step-by-step guide for adding Ownology to the iPhone
 * home screen. Linked from PwaInstallBanner when the visitor is on iOS.
 *
 * Why a whole page: iOS still doesn't fire `beforeinstallprompt`, so the
 * only path to install is the OS Share Sheet. Winemakers (median tech
 * comfort: moderate) need a walkthrough, not a hint. This page gets us
 * the app-like retention (fullscreen, home-screen icon, no browser
 * chrome) without paying the 30% App Store tax or waiting for review.
 */
import { Link } from "wouter";
import { ArrowLeft, Share, Plus, Check } from "lucide-react";

const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";
const SERIF = "'Fraunces', serif";

const STEPS = [
  {
    n: 1,
    title: "Open Ownology in Safari",
    body: "This install only works from Safari, not Chrome or Firefox. If you're reading this in another browser, tap the address bar, copy the URL, and paste it into Safari.",
    icon: null,
  },
  {
    n: 2,
    title: "Tap the Share button",
    body: "It's the square with an arrow pointing up. On iPhone it's at the bottom of the screen; on iPad, top-right.",
    icon: <Share size={16} />,
  },
  {
    n: 3,
    title: 'Tap "Add to Home Screen"',
    body: "Scroll down in the Share Sheet if you don't see it. It has a small plus-square icon.",
    icon: <Plus size={16} />,
  },
  {
    n: 4,
    title: 'Tap "Add" in the top-right',
    body: "You can rename it if you want — the default is just \"Ownology\". Once you tap Add, the icon appears on your home screen.",
    icon: <Check size={16} />,
  },
];

const WHY_BULLETS = [
  "Fullscreen — no browser chrome eating half the screen in the cellar",
  "Works offline — the Cellar Brief, journal entries, and last-24h logs stay accessible in the shed",
  "One-tap open from the home screen — no fumbling with Safari tabs while wearing gloves",
  "No App Store review, no 30% tax — just a free web install",
];

export default function InstallIos() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: HI,
        padding: "2rem 1.25rem 4rem",
        fontFamily: "'Lato', sans-serif",
      }}
      data-testid="install-ios-page"
    >
      <div style={{ maxWidth: 640, margin: "0 auto" }}>
        <Link
          href="/"
          style={{
            color: LO,
            fontSize: "0.8rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
          data-testid="install-ios-back"
        >
          <ArrowLeft size={12} /> Back
        </Link>

        <h1
          style={{
            margin: "1rem 0 0.5rem",
            fontFamily: SERIF,
            fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
            color: HI,
            lineHeight: 1.15,
          }}
          data-testid="install-ios-heading"
        >
          Add Ownology to your iPhone home screen.
        </h1>
        <p style={{ margin: 0, fontSize: "1rem", color: MID, lineHeight: 1.55 }}>
          Four taps. No App Store. Once installed, Ownology behaves like a
          native app — full-screen, offline-capable, one-tap from your home
          screen.
        </p>

        {/* Steps */}
        <ol
          style={{
            listStyle: "none",
            padding: 0,
            margin: "2rem 0 0",
            display: "flex",
            flexDirection: "column",
            gap: "1rem",
          }}
          data-testid="install-ios-steps"
        >
          {STEPS.map((s) => (
            <li
              key={s.n}
              style={{
                background: CARD,
                border: `1px solid ${BORDER}`,
                borderRadius: 10,
                padding: "1.1rem 1.15rem",
                display: "grid",
                gridTemplateColumns: "auto 1fr",
                gap: "0.9rem",
                alignItems: "start",
              }}
              data-testid={`install-ios-step-${s.n}`}
            >
              <div
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 999,
                  background: "var(--ow-bg-base)",
                  border: `1px solid ${BORDER}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: SERIF,
                  color: AMBER,
                  fontSize: "0.95rem",
                  fontWeight: 600,
                }}
              >
                {s.n}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: SERIF,
                    fontSize: "1.05rem",
                    color: HI,
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    marginBottom: "0.35rem",
                  }}
                >
                  {s.icon && (
                    <span style={{ color: AMBER, display: "inline-flex" }}>
                      {s.icon}
                    </span>
                  )}
                  {s.title}
                </div>
                <div style={{ fontSize: "0.9rem", color: MID, lineHeight: 1.5 }}>
                  {s.body}
                </div>
              </div>
            </li>
          ))}
        </ol>

        {/* Why */}
        <section
          style={{
            marginTop: "2.5rem",
            padding: "1.25rem 1.25rem 1rem",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
          }}
          data-testid="install-ios-why"
        >
          <h2
            style={{
              margin: "0 0 0.75rem",
              fontFamily: SERIF,
              fontSize: "1.05rem",
              color: HI,
            }}
          >
            Why install?
          </h2>
          <ul
            style={{
              listStyle: "none",
              padding: 0,
              margin: 0,
              display: "flex",
              flexDirection: "column",
              gap: "0.55rem",
              fontSize: "0.9rem",
              color: MID,
              lineHeight: 1.5,
            }}
          >
            {WHY_BULLETS.map((b, i) => (
              <li
                key={i}
                style={{ display: "flex", gap: "0.5rem", alignItems: "start" }}
              >
                <Check
                  size={14}
                  style={{ color: AMBER, marginTop: 3, flexShrink: 0 }}
                />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>

        <p
          style={{
            marginTop: "1.5rem",
            fontSize: "0.78rem",
            color: LO,
            lineHeight: 1.5,
          }}
        >
          Trouble? Reply to any Ownology email or SMS and Rich will walk you
          through it. Installs never fail — Safari just sometimes hides the
          "Add to Home Screen" option further down the Share Sheet than you'd
          expect.
        </p>
      </div>
    </div>
  );
}
