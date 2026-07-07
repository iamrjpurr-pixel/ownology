/**
 * /join/qr — Printable QR code for /join#book
 *
 * Public page. Designed to be pulled up on Rich's phone or laptop at
 * trade shows, or printed on cards / slides. One tap = winemaker lands
 * on the booking anchor on /join, no typing required.
 *
 * Also exposes a "Download PNG" button so we can drop the QR into decks,
 * handouts, or SMS-friendly image attachments.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { ArrowLeft, Download, Printer } from "lucide-react";
import QRCode from "qrcode";

const HI = "var(--ow-text-hi)";
const MID = "var(--ow-text-mid)";
const LO = "var(--ow-text-lo)";
const AMBER = "var(--ow-amber)";
const CARD = "var(--ow-bg-card)";
const BORDER = "var(--ow-border)";
const SERIF = "'Fraunces', serif";

const QR_TARGET_DEFAULT = "https://ownology.ai/join#book";

export default function JoinQr() {
  // Allow ?url= override so we can regenerate for /ask or other links
  // on the fly without shipping a new page.
  const initialTarget = useMemo(() => {
    if (typeof window === "undefined") return QR_TARGET_DEFAULT;
    const p = new URLSearchParams(window.location.search).get("url");
    return p && p.length > 0 ? p : QR_TARGET_DEFAULT;
  }, []);

  const [target, setTarget] = useState(initialTarget);
  const initialLabel = useMemo(() => {
    if (typeof window === "undefined") return "Book a pilot";
    const p = new URLSearchParams(window.location.search).get("label");
    return p && p.length > 0 ? p.slice(0, 80) : "Book a pilot";
  }, []);
  const [label, setLabel] = useState(initialLabel);
  const [dataUrl, setDataUrl] = useState<string>("");
  const [err, setErr] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    QRCode.toDataURL(target, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 720,
      color: { dark: "#1a1210", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setErr("");
        }
      })
      .catch((e) => {
        if (!cancelled) setErr(String(e?.message ?? e));
      });
    return () => {
      cancelled = true;
    };
  }, [target]);

  const download = () => {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    const slug = target
      .replace(/^https?:\/\//, "")
      .replace(/[^a-z0-9]+/gi, "-")
      .replace(/-+$/g, "")
      .slice(0, 60);
    a.download = `ownology-qr-${slug}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const print = () => window.print();

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: HI,
        padding: "2rem 1.25rem 4rem",
        fontFamily: "'Lato', sans-serif",
      }}
      data-testid="qr-page"
    >
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .qr-card { border: none !important; box-shadow: none !important; background: white !important; }
        }
      `}</style>

      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <Link
          href="/join"
          className="no-print"
          style={{
            color: LO,
            fontSize: "0.8rem",
            textDecoration: "none",
            display: "inline-flex",
            alignItems: "center",
            gap: "0.35rem",
          }}
          data-testid="qr-back"
        >
          <ArrowLeft size={12} /> Back to Founding Partners
        </Link>

        <h1
          className="no-print"
          style={{
            margin: "1rem 0 0.5rem",
            fontFamily: SERIF,
            fontSize: "clamp(1.75rem, 4.5vw, 2.5rem)",
            color: HI,
            lineHeight: 1.15,
          }}
          data-testid="qr-heading"
        >
          One scan. Booked.
        </h1>
        <p
          className="no-print"
          style={{ margin: 0, fontSize: "1rem", color: MID, lineHeight: 1.55 }}
        >
          Show this at a trade show, cellar door, or across a table. Winemakers
          scan it with their camera and land straight on the pilot booking form
          — no typing, no lost URL.
        </p>

        {/* QR card */}
        <div
          className="qr-card"
          style={{
            marginTop: "2rem",
            background: "#ffffff",
            border: `1px solid ${BORDER}`,
            borderRadius: 14,
            padding: "2rem 1.5rem 1.75rem",
            textAlign: "center",
            boxShadow: "0 12px 32px -18px rgba(0,0,0,0.35)",
          }}
          data-testid="qr-card"
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: "1.4rem",
              color: "#1a1210",
              letterSpacing: "0.02em",
            }}
          >
            OWNOLOGY
          </div>
          <div
            style={{
              fontSize: "0.85rem",
              color: "#5a4a45",
              marginTop: 4,
              marginBottom: "1.25rem",
            }}
          >
            The Wine Answer Engine.
          </div>

          {err ? (
            <div
              style={{ color: "#a03030", fontSize: "0.9rem" }}
              data-testid="qr-error"
            >
              Could not generate QR: {err}
            </div>
          ) : dataUrl ? (
            <img
              src={dataUrl}
              alt={`QR code for ${target}`}
              width={320}
              height={320}
              style={{ width: "min(320px, 80vw)", height: "auto", display: "inline-block" }}
              data-testid="qr-image"
            />
          ) : (
            <div style={{ color: "#5a4a45", fontSize: "0.9rem" }}>Generating…</div>
          )}

          <div
            style={{
              marginTop: "1.25rem",
              fontSize: "1.05rem",
              color: "#1a1210",
              fontWeight: 600,
            }}
            data-testid="qr-label"
          >
            {label}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: "0.75rem",
              color: "#7a6a65",
              wordBreak: "break-all",
            }}
            data-testid="qr-target"
          >
            {target}
          </div>
        </div>

        {/* Controls — hidden on print */}
        <div
          className="no-print"
          style={{
            marginTop: "1.5rem",
            display: "flex",
            gap: "0.75rem",
            flexWrap: "wrap",
            justifyContent: "center",
          }}
        >
          <button
            onClick={download}
            disabled={!dataUrl}
            style={btnPrimary}
            data-testid="qr-download-btn"
          >
            <Download size={14} /> Download PNG
          </button>
          <button
            onClick={print}
            disabled={!dataUrl}
            style={btnSecondary}
            data-testid="qr-print-btn"
          >
            <Printer size={14} /> Print card
          </button>
        </div>

        {/* Customise panel */}
        <div
          className="no-print"
          style={{
            marginTop: "2rem",
            background: CARD,
            border: `1px solid ${BORDER}`,
            borderRadius: 10,
            padding: "1.25rem 1.25rem 1rem",
          }}
          data-testid="qr-customise"
        >
          <div
            style={{
              fontFamily: SERIF,
              fontSize: "1rem",
              color: HI,
              marginBottom: "0.75rem",
            }}
          >
            Customise
          </div>

          <label
            style={{ display: "block", fontSize: "0.75rem", color: LO, marginBottom: 4 }}
          >
            Destination URL
          </label>
          <input
            type="text"
            value={target}
            onChange={(e) => setTarget(e.target.value)}
            style={inputStyle}
            data-testid="qr-url-input"
          />

          <label
            style={{
              display: "block",
              fontSize: "0.75rem",
              color: LO,
              margin: "0.9rem 0 4px",
            }}
          >
            Card label
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            style={inputStyle}
            data-testid="qr-label-input"
          />

          <div
            style={{
              marginTop: "0.9rem",
              fontSize: "0.72rem",
              color: LO,
              lineHeight: 1.5,
            }}
          >
            Tip: append <code style={{ color: AMBER }}>?url=…</code> to this page
            URL to preload a different destination (e.g. <code>/join/qr?url=https://ownology.ai/ask</code>).
          </div>
        </div>
      </div>
    </div>
  );
}

const btnPrimary: React.CSSProperties = {
  background: "var(--ow-amber)",
  color: "#1a1210",
  border: "none",
  borderRadius: 999,
  padding: "0.65rem 1.25rem",
  fontSize: "0.9rem",
  fontWeight: 600,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  fontFamily: "'Lato', sans-serif",
};

const btnSecondary: React.CSSProperties = {
  background: "transparent",
  color: HI,
  border: `1px solid ${BORDER}`,
  borderRadius: 999,
  padding: "0.65rem 1.25rem",
  fontSize: "0.9rem",
  fontWeight: 500,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: "0.4rem",
  fontFamily: "'Lato', sans-serif",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: 6,
  border: `1px solid ${BORDER}`,
  background: "var(--ow-bg-base)",
  color: HI,
  fontSize: "0.85rem",
  fontFamily: "'Lato', sans-serif",
  boxSizing: "border-box",
};
