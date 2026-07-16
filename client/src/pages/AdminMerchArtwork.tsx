/**
 * /admin/merch-artwork — print-ready artwork generator for VistaPrint uploads.
 *
 * Reuses existing brand assets from /client/public/ (ownology-logo-mark-512.png,
 * ownology-profile-icon-*-1024.png, ownology-logo-1024*.png) and composes them
 * onto canvases at exact VistaPrint bleed dimensions @ 300 DPI.
 *
 * Two SKUs supported at launch (from Rich's VistaPrint spec sheet, Feb 2026):
 *   • Pro Felt Bar Runner — bleed 856 × 225 mm  → 10110 × 2657 px @ 300 DPI
 *   • Square Coaster       — bleed 100 × 100 mm  →  1181 × 1181 px @ 300 DPI
 *
 * Preview shows toggleable bleed / trim / safety guides. Guides are stripped
 * before PNG export so the downloaded file is upload-ready.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "wouter";
import QRCode from "qrcode";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── SKU spec sheet (VistaPrint) ─────────────────────────────────────────────
type SkuSpec = {
  id: string;
  name: string;
  vistaprintSku: string;
  // Dimensions in millimetres — bleed is the artwork surface, trim is the cut,
  // safety is the inset for text and critical marks.
  bleedMm: { w: number; h: number };
  trimMm: { w: number; h: number };
  safetyMm?: { w: number; h: number };
  // Recommended default layout hint (bar runner is landscape strip, coaster is square).
  layout: "landscape" | "square";
};

const SKUS: SkuSpec[] = [
  {
    id: "pro-felt-bar-runner",
    name: "Pro Felt Bar Runner",
    vistaprintSku: "VP-BARRUN-PROFELT",
    bleedMm: { w: 856, h: 225 },
    trimMm: { w: 836, h: 203 },
    layout: "landscape",
  },
  {
    id: "square-coaster",
    name: "Square Coaster",
    vistaprintSku: "VP-COASTER-SQ100",
    bleedMm: { w: 100, h: 100 },
    trimMm: { w: 95, h: 95 },
    safetyMm: { w: 90, h: 90 },
    layout: "square",
  },
];

const DPI = 300;
const MM_PER_INCH = 25.4;
const mmToPx = (mm: number) => Math.round((mm / MM_PER_INCH) * DPI);

// ─── Brand assets available for composition ─────────────────────────────────
type MarkAsset = { id: string; label: string; url: string; recommendedBg: "dark" | "light" };
const MARK_ASSETS: MarkAsset[] = [
  { id: "mark-dark",         label: "Trinity mark (dark bg)",     url: "/ownology-logo-mark-512.png",         recommendedBg: "dark" },
  { id: "profile-dark",      label: "Profile icon · dark",        url: "/ownology-profile-icon-dark-1024.png",  recommendedBg: "dark" },
  { id: "profile-light",     label: "Profile icon · light",       url: "/ownology-profile-icon-light-1024.png", recommendedBg: "light" },
  { id: "profile-mono",      label: "Profile icon · mono amber",  url: "/ownology-profile-icon-mono-1024.png",  recommendedBg: "dark" },
  { id: "logo-dark",         label: "Full lockup (dark bg)",      url: "/ownology-logo-1024.png",              recommendedBg: "dark" },
  { id: "logo-light",        label: "Full lockup (light bg)",     url: "/ownology-logo-1024-light.png",        recommendedBg: "light" },
];

// ─── Background presets ─────────────────────────────────────────────────────
type BgPreset = { id: string; label: string; css: string; kind: "dark" | "light" };
const BG_PRESETS: BgPreset[] = [
  { id: "warm-black",       label: "Warm black",      css: "#181410", kind: "dark" },
  { id: "cellar-charcoal",  label: "Cellar charcoal", css: "#242019", kind: "dark" },
  { id: "amber-black",      label: "Amber-tinted black", css: "#1e1810", kind: "dark" },
  { id: "parchment",        label: "Parchment cream", css: "#f4ecd8", kind: "light" },
  { id: "linen",            label: "Natural linen",   css: "#e8dcc3", kind: "light" },
];

// Amber accent for wordmarks / borders / rules
const AMBER = "#c98a4b";
const AMBER_LIGHT = "#d9a77a";

// ─── Utility: load image once and cache ─────────────────────────────────────
function useImage(url: string): HTMLImageElement | null {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  useEffect(() => {
    let alive = true;
    const el = new Image();
    el.crossOrigin = "anonymous";
    el.onload = () => { if (alive) setImg(el); };
    el.src = url;
    return () => { alive = false; };
  }, [url]);
  return img;
}

// ─── Canvas composer ─────────────────────────────────────────────────────────
type ComposeOptions = {
  sku: SkuSpec;
  bg: BgPreset;
  mark: MarkAsset;
  markImg: HTMLImageElement | null;
  wordmark: string;          // e.g. "OWNOLOGY"
  tagline: string;           // e.g. "THE WINEMAKER'S SECOND BRAIN"
  showGuides: boolean;       // preview only — never true when exporting
  markScale: number;         // 0.1 – 1.0 relative to short side
  showBorder: boolean;
  qrImg: HTMLImageElement | null;  // pre-rendered QR (dark modules on transparent)
  qrUrl: string;                    // human-readable URL to render alongside QR
  showQr: boolean;
};

function composeArtwork(canvas: HTMLCanvasElement, opts: ComposeOptions): void {
  const { sku, bg, markImg, wordmark, tagline, showGuides, markScale, showBorder, qrImg, qrUrl, showQr } = opts;

  const wPx = mmToPx(sku.bleedMm.w);
  const hPx = mmToPx(sku.bleedMm.h);
  canvas.width = wPx;
  canvas.height = hPx;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // 1. Background flood
  ctx.fillStyle = bg.css;
  ctx.fillRect(0, 0, wPx, hPx);

  // Subtle amber grain overlay for dark backgrounds
  if (bg.kind === "dark") {
    const grad = ctx.createRadialGradient(wPx / 2, hPx / 2, 0, wPx / 2, hPx / 2, Math.max(wPx, hPx) * 0.7);
    grad.addColorStop(0, "rgba(201, 138, 75, 0.10)");
    grad.addColorStop(1, "rgba(201, 138, 75, 0)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, wPx, hPx);
  }

  // 2. Layout-specific composition
  const textColor = bg.kind === "dark" ? "#f5e9d3" : "#2a1f14";
  const accentColor = bg.kind === "dark" ? AMBER_LIGHT : AMBER;

  if (sku.layout === "landscape") {
    // Bar runner: [mark on left · double-rule · wordmark centre · tagline · QR right]
    const centreY = hPx / 2;
    const markSize = Math.round(hPx * 0.75 * markScale);
    const padding = Math.round(hPx * 0.15);

    // Left mark
    if (markImg) {
      ctx.drawImage(markImg, padding, centreY - markSize / 2, markSize, markSize);
    }

    // Right side: QR badge if enabled, otherwise mirror mark for symmetry
    const rightX = wPx - padding - markSize;
    if (showQr && qrImg) {
      // QR sits on a light square so it always scans, regardless of background darkness
      const qrPad = Math.round(markSize * 0.08);
      const qrPlateSize = markSize;
      const qrInner = qrPlateSize - qrPad * 2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(rightX, centreY - qrPlateSize / 2, qrPlateSize, qrPlateSize);
      ctx.drawImage(qrImg, rightX + qrPad, centreY - qrPlateSize / 2 + qrPad, qrInner, qrInner);

      // URL label under the QR
      const urlLabelSize = Math.round(hPx * 0.055);
      ctx.fillStyle = accentColor;
      ctx.font = `700 ${urlLabelSize}px "Fira Code", monospace`;
      ctx.textAlign = "center";
      ctx.textBaseline = "top";
      ctx.fillText("SCAN →", rightX + qrPlateSize / 2, centreY + qrPlateSize / 2 + urlLabelSize * 0.4);
    } else if (markImg) {
      ctx.drawImage(markImg, rightX, centreY - markSize / 2, markSize, markSize);
    }

    // Centre wordmark
    const wordmarkSize = Math.round(hPx * 0.28);
    ctx.fillStyle = textColor;
    ctx.font = `700 ${wordmarkSize}px "Fraunces", "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wordmark, wPx / 2, centreY - wordmarkSize * 0.55);

    // Tagline
    const taglineSize = Math.round(hPx * 0.10);
    ctx.fillStyle = accentColor;
    ctx.font = `400 ${taglineSize}px "Lato", "Helvetica Neue", sans-serif`;
    const trackedTagline = tagline.split("").join(" ");
    ctx.fillText(trackedTagline, wPx / 2, centreY + wordmarkSize * 0.25);

    // URL under tagline (small, tracked)
    if (showQr && qrUrl.trim().length > 0) {
      const urlSize = Math.round(hPx * 0.06);
      ctx.fillStyle = textColor;
      ctx.font = `400 ${urlSize}px "Fira Code", monospace`;
      ctx.fillText(qrUrl, wPx / 2, centreY + wordmarkSize * 0.75);
    }

    // Double-rule border
    if (showBorder) {
      const borderInset = Math.round(hPx * 0.10);
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3, Math.round(hPx * 0.008));
      ctx.strokeRect(borderInset, borderInset, wPx - borderInset * 2, hPx - borderInset * 2);
      const inner = borderInset + Math.round(hPx * 0.025);
      ctx.lineWidth = Math.max(2, Math.round(hPx * 0.004));
      ctx.strokeRect(inner, inner, wPx - inner * 2, hPx - inner * 2);
    }
  } else {
    // Square coaster: mark top · wordmark · tagline · QR + URL bottom
    const shortSide = Math.min(wPx, hPx);
    const markSize = Math.round(shortSide * 0.42 * markScale);
    const centreX = wPx / 2;
    const centreY = hPx / 2;

    // Mark sits slightly above centre to leave room for QR under wordmark
    if (markImg) {
      ctx.drawImage(markImg, centreX - markSize / 2, centreY - markSize / 2 - shortSide * 0.14, markSize, markSize);
    }

    // Wordmark
    const wordmarkSize = Math.round(shortSide * 0.085);
    ctx.fillStyle = textColor;
    ctx.font = `700 ${wordmarkSize}px "Fraunces", "Times New Roman", serif`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(wordmark, centreX, centreY + shortSide * 0.16);

    // Tagline
    const taglineSize = Math.round(shortSide * 0.035);
    ctx.fillStyle = accentColor;
    ctx.font = `400 ${taglineSize}px "Lato", "Helvetica Neue", sans-serif`;
    ctx.fillText(tagline.toUpperCase().split("").join(" "), centreX, centreY + shortSide * 0.24);

    // QR + URL under tagline
    if (showQr && qrImg) {
      const qrSize = Math.round(shortSide * 0.18);
      const qrPad = Math.round(qrSize * 0.10);
      const qrPlate = qrSize + qrPad * 2;
      const qrY = centreY + shortSide * 0.30;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(centreX - qrPlate / 2, qrY, qrPlate, qrPlate);
      ctx.drawImage(qrImg, centreX - qrSize / 2, qrY + qrPad, qrSize, qrSize);

      if (qrUrl.trim().length > 0) {
        const urlSize = Math.round(shortSide * 0.028);
        ctx.fillStyle = accentColor;
        ctx.font = `700 ${urlSize}px "Fira Code", monospace`;
        ctx.fillText(qrUrl, centreX, qrY + qrPlate + urlSize * 0.8);
      }
    }

    // Circular ring border (respects safety area)
    if (showBorder) {
      const safetyPx = sku.safetyMm ? mmToPx(sku.safetyMm.w) : shortSide * 0.82;
      const radius = safetyPx / 2;
      ctx.strokeStyle = accentColor;
      ctx.lineWidth = Math.max(3, Math.round(shortSide * 0.006));
      ctx.beginPath();
      ctx.arc(centreX, centreY, radius, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  // 3. Guide overlays (preview only)
  if (showGuides) {
    const trimX = mmToPx((sku.bleedMm.w - sku.trimMm.w) / 2);
    const trimY = mmToPx((sku.bleedMm.h - sku.trimMm.h) / 2);
    const trimW = mmToPx(sku.trimMm.w);
    const trimH = mmToPx(sku.trimMm.h);

    // Bleed = full canvas (magenta)
    ctx.strokeStyle = "rgba(255, 0, 128, 0.9)";
    ctx.setLineDash([]);
    ctx.lineWidth = 6;
    ctx.strokeRect(3, 3, wPx - 6, hPx - 6);

    // Trim (cyan)
    ctx.strokeStyle = "rgba(0, 180, 220, 0.9)";
    ctx.setLineDash([24, 12]);
    ctx.lineWidth = 4;
    ctx.strokeRect(trimX, trimY, trimW, trimH);

    // Safety (green) — only if the SKU defines it
    if (sku.safetyMm) {
      const sfX = mmToPx((sku.bleedMm.w - sku.safetyMm.w) / 2);
      const sfY = mmToPx((sku.bleedMm.h - sku.safetyMm.h) / 2);
      const sfW = mmToPx(sku.safetyMm.w);
      const sfH = mmToPx(sku.safetyMm.h);
      ctx.strokeStyle = "rgba(80, 220, 120, 0.9)";
      ctx.setLineDash([12, 8]);
      ctx.lineWidth = 4;
      ctx.strokeRect(sfX, sfY, sfW, sfH);
    }
    ctx.setLineDash([]);

    // Legend
    const legendPad = 24;
    const legendSize = Math.round(hPx * 0.028);
    ctx.font = `700 ${legendSize}px "Fira Code", monospace`;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    ctx.fillStyle = "rgba(255, 0, 128, 1)";
    ctx.fillText("■ BLEED", legendPad, legendPad);
    ctx.fillStyle = "rgba(0, 180, 220, 1)";
    ctx.fillText("■ TRIM", legendPad, legendPad + legendSize * 1.3);
    if (sku.safetyMm) {
      ctx.fillStyle = "rgba(80, 220, 120, 1)";
      ctx.fillText("■ SAFETY", legendPad, legendPad + legendSize * 2.6);
    }
  }
}

// ─── Default QR landing per SKU ─────────────────────────────────────────────
// All merch QRs land on the /vs/innovint-vintrace comparison page — the
// SEO front-door + honest positioning story that converts cellar-door scans
// into quiz-takers or founding members. UTMs baked in per SKU for attribution.
const DEFAULT_QR_URL = "https://ownology.ai/vs/innovint-vintrace";
function qrTargetFor(skuId: string): string {
  const params = new URLSearchParams({
    utm_source: skuId,
    utm_medium: "merch",
    utm_campaign: "cellar-door",
  });
  return `${DEFAULT_QR_URL}?${params.toString()}`;
}
// Human-readable version rendered on the artwork (no UTM noise on the print)
const QR_DISPLAY_URL = "ownology.ai/vs";

// ─── Page ────────────────────────────────────────────────────────────────────
export default function AdminMerchArtwork() {
  const [skuId, setSkuId] = useState<string>(SKUS[0].id);
  const [bgId, setBgId] = useState<string>(BG_PRESETS[0].id);
  const [markId, setMarkId] = useState<string>(MARK_ASSETS[0].id);
  const [wordmark, setWordmark] = useState("OWNOLOGY");
  const [tagline, setTagline] = useState("THE WINEMAKER'S SECOND BRAIN");
  const [markScale, setMarkScale] = useState(1.0);
  const [showBorder, setShowBorder] = useState(true);
  const [showGuides, setShowGuides] = useState(true);
  const [showQr, setShowQr] = useState(true);
  const [qrDisplayUrl, setQrDisplayUrl] = useState(QR_DISPLAY_URL);
  const [downloading, setDownloading] = useState(false);
  const [qrImg, setQrImg] = useState<HTMLImageElement | null>(null);

  const sku = useMemo(() => SKUS.find((s) => s.id === skuId) ?? SKUS[0], [skuId]);
  const bg = useMemo(() => BG_PRESETS.find((b) => b.id === bgId) ?? BG_PRESETS[0], [bgId]);
  const mark = useMemo(() => MARK_ASSETS.find((m) => m.id === markId) ?? MARK_ASSETS[0], [markId]);
  const markImg = useImage(mark.url);

  // The URL that gets ENCODED into the QR (UTM-tagged per SKU for attribution)
  const qrEncodedUrl = useMemo(() => qrTargetFor(skuId), [skuId]);

  // Regenerate QR any time the encoded URL changes. Uses high error-correction
  // so scans still work through print variance / cork surface texture.
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const dataUrl = await QRCode.toDataURL(qrEncodedUrl, {
          errorCorrectionLevel: "H",
          margin: 1,
          scale: 20,
          color: { dark: "#000000", light: "#ffffff" },
        });
        const img = new Image();
        img.onload = () => { if (alive) setQrImg(img); };
        img.src = dataUrl;
      } catch (err) {
        console.error("QR generation failed", err);
      }
    })();
    return () => { alive = false; };
  }, [qrEncodedUrl]);

  const previewCanvasRef = useRef<HTMLCanvasElement>(null);

  // Re-render preview whenever inputs change
  useEffect(() => {
    if (!previewCanvasRef.current) return;
    composeArtwork(previewCanvasRef.current, {
      sku, bg, mark, markImg,
      wordmark, tagline,
      showGuides,
      markScale,
      showBorder,
      qrImg,
      qrUrl: qrDisplayUrl,
      showQr,
    });
  }, [sku, bg, mark, markImg, wordmark, tagline, showGuides, markScale, showBorder, qrImg, qrDisplayUrl, showQr]);

  async function handleDownload() {
    setDownloading(true);
    try {
      // Compose to an off-DOM canvas without guides
      const off = document.createElement("canvas");
      composeArtwork(off, {
        sku, bg, mark, markImg,
        wordmark, tagline,
        showGuides: false,
        markScale,
        showBorder,
        qrImg,
        qrUrl: qrDisplayUrl,
        showQr,
      });
      const blob = await new Promise<Blob | null>((res) => off.toBlob(res, "image/png", 1.0));
      if (!blob) throw new Error("Canvas export failed");
      const a = document.createElement("a");
      const filename = `ownology-${sku.id}-${bg.id}-${mark.id}-${off.width}x${off.height}px.png`;
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(a.href);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }

  const wPx = mmToPx(sku.bleedMm.w);
  const hPx = mmToPx(sku.bleedMm.h);

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "var(--ow-bg-base)",
    border: "1px solid var(--ow-border)",
    borderRadius: 3,
    padding: "8px 10px",
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.85rem",
    color: "var(--ow-text-hi)",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontFamily: "'Fira Code', monospace",
    fontSize: "0.68rem",
    letterSpacing: "0.06em",
    textTransform: "uppercase",
    color: "var(--ow-text-lo)",
    marginBottom: 6,
  };

  return (
    <div
      data-testid="admin-merch-artwork"
      style={{
        minHeight: "100vh",
        background: "var(--ow-bg-base)",
        color: "var(--ow-text-hi)",
        fontFamily: "'Lato', sans-serif",
      }}
    >
      {/* ─── Header ─── */}
      <header
        style={{
          borderBottom: "1px solid var(--ow-border)",
          padding: "16px 24px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <OwnologyLogo variant="gold" />
        <div style={{ flex: 1 }}>
          <p
            style={{
              fontSize: "0.68rem",
              color: "var(--ow-amber)",
              textTransform: "uppercase",
              letterSpacing: "0.10em",
              margin: 0,
            }}
          >
            Print artwork · VistaPrint
          </p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.4rem", margin: 0, fontWeight: 700 }}>
            Merch artwork downloader
          </h1>
          <p style={{ margin: "2px 0 0", fontSize: "0.78rem", color: "var(--ow-text-mid)" }}>
            Compose print-ready PNGs at exact VistaPrint bleed dimensions @ 300 DPI. Pick a SKU, choose brand asset + background, download → upload straight into VistaPrint.
          </p>
        </div>
        <Link
          href="/admin/brand-assets"
          style={{ color: "var(--ow-amber)", fontSize: "0.85rem", textDecoration: "none" }}
        >
          ← brand assets
        </Link>
      </header>

      {/* ─── Body ─── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(260px, 320px) 1fr",
          gap: 24,
          padding: 24,
          alignItems: "start",
        }}
      >
        {/* ─── Controls ─── */}
        <aside
          data-testid="artwork-controls"
          style={{
            border: "1px solid var(--ow-border)",
            borderRadius: 4,
            background: "var(--ow-bg-card)",
            padding: 16,
            position: "sticky",
            top: 16,
            display: "flex",
            flexDirection: "column",
            gap: 14,
          }}
        >
          {/* SKU */}
          <div>
            <label htmlFor="sku" style={labelStyle}>Product (SKU)</label>
            <select
              id="sku"
              data-testid="sku-select"
              value={skuId}
              onChange={(e) => setSkuId(e.target.value)}
              style={inputStyle}
            >
              {SKUS.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.bleedMm.w}×{s.bleedMm.h}mm
                </option>
              ))}
            </select>
            <p style={{ margin: "6px 0 0", fontSize: "0.7rem", color: "var(--ow-text-lo)", fontFamily: "'Fira Code', monospace" }}>
              Export → {wPx.toLocaleString()} × {hPx.toLocaleString()} px @ 300 DPI
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "0.65rem", color: "var(--ow-text-lo)", fontFamily: "'Fira Code', monospace" }}>
              Trim {sku.trimMm.w}×{sku.trimMm.h}mm{sku.safetyMm ? ` · Safety ${sku.safetyMm.w}×${sku.safetyMm.h}mm` : ""}
            </p>
          </div>

          {/* Background */}
          <div>
            <label htmlFor="bg" style={labelStyle}>Background</label>
            <select
              id="bg"
              data-testid="bg-select"
              value={bgId}
              onChange={(e) => setBgId(e.target.value)}
              style={inputStyle}
            >
              {BG_PRESETS.map((b) => (
                <option key={b.id} value={b.id}>{b.label} ({b.kind})</option>
              ))}
            </select>
          </div>

          {/* Brand mark */}
          <div>
            <label htmlFor="mark" style={labelStyle}>Brand mark</label>
            <select
              id="mark"
              data-testid="mark-select"
              value={markId}
              onChange={(e) => setMarkId(e.target.value)}
              style={inputStyle}
            >
              {MARK_ASSETS.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
            {mark.recommendedBg !== bg.kind && (
              <p style={{ margin: "6px 0 0", fontSize: "0.68rem", color: "#e2a04a" }}>
                ⚠ This mark is optimised for a {mark.recommendedBg} background — current is {bg.kind}.
              </p>
            )}
          </div>

          {/* Mark scale */}
          <div>
            <label htmlFor="scale" style={labelStyle}>Mark scale — {Math.round(markScale * 100)}%</label>
            <input
              id="scale"
              data-testid="mark-scale"
              type="range"
              min={0.4}
              max={1.4}
              step={0.05}
              value={markScale}
              onChange={(e) => setMarkScale(parseFloat(e.target.value))}
              style={{ width: "100%", accentColor: "var(--ow-amber)" }}
            />
          </div>

          {/* Wordmark */}
          <div>
            <label htmlFor="wordmark" style={labelStyle}>Wordmark</label>
            <input
              id="wordmark"
              data-testid="wordmark-input"
              type="text"
              value={wordmark}
              onChange={(e) => setWordmark(e.target.value)}
              maxLength={40}
              style={inputStyle}
            />
          </div>

          {/* Tagline */}
          <div>
            <label htmlFor="tagline" style={labelStyle}>Tagline</label>
            <input
              id="tagline"
              data-testid="tagline-input"
              type="text"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              maxLength={80}
              style={inputStyle}
            />
          </div>

          {/* QR display URL */}
          <div>
            <label htmlFor="qrurl" style={labelStyle}>QR display URL</label>
            <input
              id="qrurl"
              data-testid="qr-url-input"
              type="text"
              value={qrDisplayUrl}
              onChange={(e) => setQrDisplayUrl(e.target.value)}
              maxLength={60}
              style={inputStyle}
              placeholder="ownology.ai/vs"
            />
            <p style={{ margin: "6px 0 0", fontSize: "0.68rem", color: "var(--ow-text-lo)", lineHeight: 1.5 }}>
              <strong style={{ color: "var(--ow-amber)" }}>Scan target:</strong> <span style={{ fontFamily: "'Fira Code', monospace", fontSize: "0.66rem", wordBreak: "break-all" }}>{qrEncodedUrl}</span>
              <br />
              <em>The QR encodes the full UTM-tagged URL for attribution. The clean version above is what prints on the artwork.</em>
            </p>
          </div>

          {/* Toggles */}
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                data-testid="toggle-qr"
                type="checkbox"
                checked={showQr}
                onChange={(e) => setShowQr(e.target.checked)}
              />
              Show QR code + URL <span style={{ color: "var(--ow-text-lo)", fontSize: "0.7rem" }}>(recommended)</span>
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                data-testid="toggle-border"
                type="checkbox"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
              />
              Draw amber border rule
            </label>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: "0.82rem", cursor: "pointer" }}>
              <input
                data-testid="toggle-guides"
                type="checkbox"
                checked={showGuides}
                onChange={(e) => setShowGuides(e.target.checked)}
              />
              Show bleed / trim / safety guides <span style={{ color: "var(--ow-text-lo)", fontSize: "0.7rem" }}>(preview only)</span>
            </label>
          </div>

          {/* Download */}
          <button
            data-testid="download-artwork"
            onClick={handleDownload}
            disabled={downloading || !markImg}
            style={{
              width: "100%",
              padding: "12px",
              background: downloading ? "color-mix(in oklch, var(--ow-amber) 70%, var(--ow-bg-base))" : "var(--ow-amber)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: 2,
              fontFamily: "'Lato', sans-serif",
              fontWeight: 700,
              fontSize: "0.85rem",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              cursor: downloading ? "not-allowed" : "pointer",
              marginTop: 6,
            }}
          >
            {downloading ? "Rendering…" : `↓ Download ${wPx.toLocaleString()}×${hPx.toLocaleString()} PNG`}
          </button>

          <p
            style={{
              margin: 0,
              fontSize: "0.68rem",
              color: "var(--ow-text-lo)",
              lineHeight: 1.5,
              fontStyle: "italic",
            }}
          >
            Extend design to the bleed edge; keep text inside the safety area. Guides are stripped from the exported PNG.
          </p>
        </aside>

        {/* ─── Preview ─── */}
        <main
          data-testid="artwork-preview"
          style={{
            border: "1px solid var(--ow-border)",
            borderRadius: 4,
            background: "var(--ow-bg-card)",
            padding: 16,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: 12,
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div>
              <h2 style={{ fontFamily: "'Fraunces', serif", fontSize: "1.05rem", margin: 0 }}>
                {sku.name}
              </h2>
              <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "var(--ow-text-lo)", fontFamily: "'Fira Code', monospace" }}>
                SKU {sku.vistaprintSku}
              </p>
            </div>
            {!markImg && (
              <span style={{ color: "var(--ow-amber)", fontSize: "0.72rem" }}>
                Loading brand mark…
              </span>
            )}
          </div>

          <div
            style={{
              background: "repeating-conic-gradient(#1a1612 0% 25%, #221d16 0% 50%) 50% / 24px 24px",
              padding: 16,
              borderRadius: 3,
              overflow: "auto",
            }}
          >
            <canvas
              ref={previewCanvasRef}
              data-testid="artwork-canvas"
              style={{
                display: "block",
                maxWidth: "100%",
                height: "auto",
                margin: "0 auto",
                boxShadow: "0 8px 40px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          <div
            style={{
              marginTop: 14,
              padding: 12,
              borderRadius: 3,
              background: "var(--ow-bg-base)",
              border: "1px solid var(--ow-border)",
              fontSize: "0.75rem",
              color: "var(--ow-text-mid)",
              lineHeight: 1.6,
            }}
          >
            <strong style={{ color: "var(--ow-text-hi)", fontFamily: "'Fraunces', serif" }}>
              VistaPrint upload checklist
            </strong>
            <ol style={{ margin: "6px 0 0 18px", padding: 0 }}>
              <li>Confirm the SKU in the dropdown matches the product you&apos;re ordering.</li>
              <li>Check bleed / trim / safety guides — critical text must sit inside the green safety rectangle.</li>
              <li>Hit <em>Download PNG</em>. Guides are stripped automatically.</li>
              <li>Upload the resulting PNG to VistaPrint&apos;s &ldquo;upload your own design&rdquo; step — no scaling needed.</li>
            </ol>
          </div>
        </main>
      </div>
    </div>
  );
}
