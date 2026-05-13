/**
 * Ownology Merch Store — /merch
 * Cellar door merchandise with Stripe Checkout integration.
 * Design: dark artisan theme matching the main site (warm black, amber gold, Fraunces/Lato).
 */

import { useState, useRef, useCallback } from "react";
import { toast } from "sonner";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Product data (mirrors server/merch/products.ts) ─────────────────────────

interface Product {
  id: string;
  name: string;
  description: string;
  priceAud: number;
  imageUrl: string;
  category: string;
  specs: string;
  inStock: boolean;
}

const PRODUCTS: Product[] = [
  {
    id: "coaster-dark",
    name: "Founding Member Coaster — Dark",
    description:
      "Natural cork coaster, 90mm diameter. Deep warm-black background with the Ownology Founding Member seal in amber gold. A cellar door essential.",
    priceAud: 1800,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/coaster-dark-PhmzQWtVb6xhCMgYChxWVd.png",
    category: "coaster",
    specs: "90mm diameter · Natural cork · Printed top · Pack of 4",
    inStock: true,
  },
  {
    id: "coaster-light",
    name: "Cellar Intelligence Coaster — Light",
    description:
      "Natural cork coaster, 90mm diameter. Warm cream/parchment background with the Ownology O-mark glyph in deep amber brown. Clean, understated, perfect for the tasting room.",
    priceAud: 1800,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/coaster-light-TExvsroqtsxytBqo7L8kAc.png",
    category: "coaster",
    specs: "90mm diameter · Natural cork · Printed top · Pack of 4",
    inStock: true,
  },
  {
    id: "bar-towel",
    name: "Cellar Door Bar Runner",
    description:
      "Natural linen bar runner, 500mm × 250mm. The Founding Member seal, OWNOLOGY wordmark, and CELLAR INTELLIGENCE — double-rule border. Premium cellar door presentation.",
    priceAud: 4500,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/bar-towel-dDXsFNBfGkQ83sDivtesjC.png",
    category: "bar-towel",
    specs: "500mm × 250mm · Natural linen · Printed design · Single",
    inStock: true,
  },
  {
    id: "notebook",
    name: "Winemaker's Field Notebook",
    description:
      "A6 pocket notebook with deep charcoal leatherette cover. Founding Member seal foil-stamped in amber gold. Ruled pages, lay-flat binding. The notebook you carry into the barrel hall.",
    priceAud: 2800,
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/notebook-cover-Rtj6XWkC484DVSGy8mPryH.png",
    category: "notebook",
    specs: "A6 (105mm × 148mm) · Leatherette cover · 96 ruled pages",
    inStock: true,
  },
];

// ─── Checkout helper ──────────────────────────────────────────────────────────

async function startCheckout(productId: string, quantity: number): Promise<void> {
  const res = await fetch("/api/merch/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      productId,
      quantity,
      origin: window.location.origin,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Checkout failed");
  }

  const { url } = await res.json();
  if (!url) throw new Error("No checkout URL returned");
  window.open(url, "_blank");
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({ product }: { product: Product }) {
  const [qty, setQty] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hovered, setHovered] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 }); // % of image
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleBuy = async () => {
    setLoading(true);
    try {
      toast.info("Redirecting to secure checkout…");
      await startCheckout(product.id, qty);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const price = (product.priceAud / 100).toFixed(2);

  // Zoom scale — how much the background image is magnified inside the lens
  const ZOOM = 2.8;
  // Lens size in px
  const LENS = 120;

  return (
    <div
      className="flex flex-col rounded-sm overflow-hidden"
      style={{
        background: "oklch(0.14 0.008 60)",
        border: "1px solid oklch(0.72 0.12 75 / 15%)",
        transition: "border-color 0.25s",
        ...(hovered ? { borderColor: "oklch(0.72 0.12 75 / 45%)" } : {}),
      }}
    >
      {/* Product image with zoom lens */}
      <div
        ref={imgContainerRef}
        className="relative aspect-square overflow-hidden"
        style={{ cursor: "crosshair" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Base image — subtle scale on hover */}
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover"
          style={{
            transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: hovered ? "scale(1.04)" : "scale(1)",
          }}
        />

        {/* Magnifier lens — appears on hover, follows cursor */}
        {hovered && (
          <div
            aria-hidden="true"
            style={{
              position: "absolute",
              width: `${LENS}px`,
              height: `${LENS}px`,
              borderRadius: "50%",
              border: "2px solid oklch(0.72 0.12 75 / 70%)",
              boxShadow: "0 0 0 1px oklch(0 0 0 / 40%), 0 4px 20px oklch(0 0 0 / 60%)",
              pointerEvents: "none",
              // Centre lens on cursor
              left: `calc(${lensPos.x}% - ${LENS / 2}px)`,
              top: `calc(${lensPos.y}% - ${LENS / 2}px)`,
              // Clamp lens to stay within the container
              transform: "translate(0,0)",
              overflow: "hidden",
              // Zoomed background
              backgroundImage: `url(${product.imageUrl})`,
              backgroundSize: `${ZOOM * 100}%`,
              backgroundPosition: `${lensPos.x}% ${lensPos.y}%`,
              backgroundRepeat: "no-repeat",
              // Amber glow ring
              outline: "none",
            }}
          />
        )}

        {/* Hover hint — fades out once user moves cursor */}
        <div
          style={{
            position: "absolute",
            bottom: "10px",
            left: "50%",
            transform: "translateX(-50%)",
            background: "oklch(0 0 0 / 55%)",
            backdropFilter: "blur(6px)",
            border: "1px solid oklch(0.72 0.12 75 / 30%)",
            borderRadius: "2px",
            padding: "3px 10px",
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.65rem",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: "oklch(0.72 0.12 75)",
            pointerEvents: "none",
            opacity: hovered ? 0 : 1,
            transition: "opacity 0.3s",
            whiteSpace: "nowrap",
          }}
        >
          Hover to inspect
        </div>

        {/* Category badge */}
        <div
          className="absolute top-3 left-3 px-2 py-0.5 text-xs tracking-widest uppercase"
          style={{
            background: "oklch(0.72 0.12 75 / 15%)",
            border: "1px solid oklch(0.72 0.12 75 / 40%)",
            color: "oklch(0.72 0.12 75)",
            fontFamily: "'Lato', sans-serif",
            fontWeight: 400,
          }}
        >
          {product.category === "coaster"
            ? "Coaster"
            : product.category === "bar-towel"
            ? "Bar Runner"
            : product.category === "notebook"
            ? "Notebook"
            : "Merch"}
        </div>
      </div>

      {/* Product info */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <h3
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 600,
            fontSize: "1.1rem",
            color: "oklch(0.92 0.018 75)",
            lineHeight: 1.3,
          }}
        >
          {product.name}
        </h3>

        <p
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "0.875rem",
            color: "oklch(0.65 0.012 75)",
            lineHeight: 1.6,
            flexGrow: 1,
          }}
        >
          {product.description}
        </p>

        <p
          style={{
            fontFamily: "'Fira Code', monospace",
            fontSize: "0.72rem",
            color: "oklch(0.50 0.010 75)",
            letterSpacing: "0.04em",
          }}
        >
          {product.specs}
        </p>

        {/* Price + quantity + buy */}
        <div className="flex items-center justify-between gap-3 mt-1">
          <span
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 700,
              fontSize: "1.4rem",
              color: "oklch(0.72 0.12 75)",
            }}
          >
            ${price}
            <span
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.75rem",
                color: "oklch(0.55 0.010 75)",
                marginLeft: "4px",
              }}
            >
              AUD
            </span>
          </span>

          {/* Quantity selector */}
          <div
            className="flex items-center gap-1 rounded-sm"
            style={{ border: "1px solid oklch(0.72 0.12 75 / 20%)" }}
          >
            <button
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="w-7 h-7 flex items-center justify-center transition-colors"
              style={{ color: "oklch(0.65 0.012 75)" }}
              aria-label="Decrease quantity"
            >
              −
            </button>
            <span
              className="w-6 text-center text-sm"
              style={{ color: "oklch(0.85 0.015 75)", fontFamily: "'Lato', sans-serif" }}
            >
              {qty}
            </span>
            <button
              onClick={() => setQty((q) => Math.min(10, q + 1))}
              className="w-7 h-7 flex items-center justify-center transition-colors"
              style={{ color: "oklch(0.65 0.012 75)" }}
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>

        <button
          onClick={handleBuy}
          disabled={loading || !product.inStock}
          className="w-full py-3 text-sm tracking-widest uppercase transition-all duration-200 rounded-sm"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 600,
            letterSpacing: "0.12em",
            background: loading
              ? "oklch(0.55 0.08 75)"
              : "oklch(0.72 0.12 75)",
            color: "oklch(0.10 0.008 60)",
            cursor: loading ? "not-allowed" : "pointer",
            border: "none",
          }}
          onMouseEnter={(e) => {
            if (!loading) e.currentTarget.style.background = "oklch(0.78 0.14 75)";
          }}
          onMouseLeave={(e) => {
            if (!loading) e.currentTarget.style.background = "oklch(0.72 0.12 75)";
          }}
        >
          {loading ? "Opening checkout…" : "Buy Now"}
        </button>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Merch() {
  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.11 0.008 60)", color: "oklch(0.90 0.015 75)" }}
    >
      {/* Nav */}
      <nav
        className="sticky top-0 z-50"
        style={{
          background: "oklch(0.11 0.008 60 / 92%)",
          backdropFilter: "blur(12px)",
          borderBottom: "1px solid oklch(1 0 0 / 6%)",
        }}
      >
        <div className="container flex items-center justify-between py-4">
          <a href="/" aria-label="Ownology home">
            <OwnologyLogo size={32} />
          </a>
          <div className="flex items-center gap-6">
            <a
              href="/"
              style={{
                fontFamily: "'Lato', sans-serif",
                fontWeight: 300,
                fontSize: "0.875rem",
                color: "oklch(0.65 0.015 75)",
                textDecoration: "none",
                letterSpacing: "0.04em",
              }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "oklch(0.72 0.12 75)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "oklch(0.65 0.015 75)")}
            >
              ← Back to Ownology
            </a>
          </div>
        </div>
      </nav>

      {/* Hero header */}
      <header className="container pt-16 pb-10">
        <p
          className="mb-4"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 400,
            fontSize: "0.7rem",
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "oklch(0.72 0.12 75)",
          }}
        >
          Cellar Door · Merch
        </p>
        <h1
          style={{
            fontFamily: "'Fraunces', serif",
            fontWeight: 700,
            fontSize: "clamp(2rem, 4vw, 3rem)",
            color: "oklch(0.95 0.018 75)",
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
          }}
        >
          Wear the knowledge.
        </h1>
        <p
          className="mt-4 max-w-xl"
          style={{
            fontFamily: "'Lato', sans-serif",
            fontWeight: 300,
            fontSize: "1rem",
            color: "oklch(0.65 0.012 75)",
            lineHeight: 1.7,
          }}
        >
          Premium cellar door merchandise for winemakers who take their craft seriously.
          Every piece carries the Ownology Founding Member seal — a mark of the people who
          were here at the beginning.
        </p>

        {/* Divider */}
        <div
          className="mt-8"
          style={{ height: "1px", background: "oklch(0.72 0.12 75 / 20%)" }}
        />
      </header>

      {/* Product grid */}
      <main className="container pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>

        {/* Shipping info */}
        <div
          className="mt-16 p-6 rounded-sm"
          style={{
            background: "oklch(0.14 0.008 60)",
            border: "1px solid oklch(0.72 0.12 75 / 10%)",
          }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: "'Fraunces', serif",
              fontWeight: 600,
              fontSize: "1.1rem",
              color: "oklch(0.90 0.018 75)",
            }}
          >
            Shipping & Fulfilment
          </h2>
          <div
            className="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 300,
              color: "oklch(0.60 0.012 75)",
              lineHeight: 1.7,
            }}
          >
            <div>
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>
                Australia
              </p>
              <p>Standard shipping 5–8 business days. Express available at checkout. All orders fulfilled via Vistaprint AU.</p>
            </div>
            <div>
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>
                New Zealand & International
              </p>
              <p>International shipping available. Rates calculated at checkout based on destination and weight.</p>
            </div>
            <div>
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>
                Founding Member Packs
              </p>
              <p>Founding member subscribers receive a complimentary notebook and bottle label sticker with their welcome pack.</p>
            </div>
          </div>
        </div>

        {/* Test mode notice */}
        <p
          className="mt-6 text-center text-xs"
          style={{
            fontFamily: "'Fira Code', monospace",
            color: "oklch(0.45 0.008 75)",
            letterSpacing: "0.04em",
          }}
        >
          Payments processed securely by Stripe. Test mode active — use card 4242 4242 4242 4242.
        </p>
      </main>
    </div>
  );
}
