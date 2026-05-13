/**
 * Ownology Merch Store — /merch
 * Features:
 *   • Slide-out cart drawer with multi-item review before Stripe checkout
 *   • Tap-to-zoom modal for mobile artwork inspection (+ desktop magnifier lens on hover)
 *   • Customer review & star-rating section per product (seed reviews + submit form)
 * Design: dark artisan theme — warm black, amber gold, Fraunces/Lato/Fira Code.
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { toast } from "sonner";
import OwnologyLogo from "@/components/OwnologyLogo";

// ─── Types ────────────────────────────────────────────────────────────────────

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

interface CartItem {
  product: Product;
  qty: number;
}

interface Review {
  id: string;
  author: string;
  rating: number; // 1–5
  body: string;
  date: string; // ISO date string
}

// ─── Product data ─────────────────────────────────────────────────────────────

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

// ─── Seed reviews ─────────────────────────────────────────────────────────────

const SEED_REVIEWS: Record<string, Review[]> = {
  "coaster-dark": [
    {
      id: "r1",
      author: "James R., Barossa Valley",
      rating: 5,
      body: "These sit on every tasting table at our cellar door. Guests always ask about them — great conversation starter and the print quality is exceptional.",
      date: "2026-04-12",
    },
    {
      id: "r2",
      author: "Sophie M., McLaren Vale",
      rating: 5,
      body: "The amber gold on black is exactly the right weight. Not flashy — just quietly confident. Exactly what we needed.",
      date: "2026-04-28",
    },
  ],
  "coaster-light": [
    {
      id: "r3",
      author: "Tom W., Yarra Valley",
      rating: 4,
      body: "Love the cream/parchment look. Pairs beautifully with our tasting room aesthetic. Would love a slightly larger size option.",
      date: "2026-05-02",
    },
  ],
  "bar-towel": [
    {
      id: "r4",
      author: "Claire D., Margaret River",
      rating: 5,
      body: "The linen quality is superb. Sits flat on the bar, the print hasn't faded after two weeks of daily use. Worth every cent.",
      date: "2026-05-05",
    },
    {
      id: "r5",
      author: "Ben K., Hunter Valley",
      rating: 5,
      body: "Ordered two. One for the cellar door bar, one for the barrel hall bench. The Founding Member seal detail is crisp at this scale.",
      date: "2026-05-08",
    },
  ],
  notebook: [
    {
      id: "r6",
      author: "Anna L., Clare Valley",
      rating: 5,
      body: "This is the notebook I've been waiting for. Lay-flat binding is essential during ferment when your hands are full. The foil stamp is a beautiful touch.",
      date: "2026-05-01",
    },
  ],
};

// ─── Checkout helpers ─────────────────────────────────────────────────────────

async function startSingleCheckout(productId: string, quantity: number): Promise<void> {
  const res = await fetch("/api/merch/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ productId, quantity, origin: window.location.origin }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    throw new Error(err.error ?? "Checkout failed");
  }
  const { url } = await res.json();
  if (!url) throw new Error("No checkout URL returned");
  window.open(url, "_blank");
}

// Multi-item cart checkout — sends all cart line items to the server in a single request.
// The server creates a Stripe Checkout Session with a full line_items array.
async function startCartCheckout(items: CartItem[]): Promise<void> {
  if (items.length === 0) return;
  const res = await fetch("/api/merch/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      items: items.map((i) => ({ productId: i.product.id, quantity: i.qty })),
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

// ─── Star Rating display ──────────────────────────────────────────────────────

function Stars({ rating, interactive = false, onRate }: { rating: number; interactive?: boolean; onRate?: (r: number) => void }) {
  const [hoverRating, setHoverRating] = useState(0);
  return (
    <div className="flex gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((s) => {
        const filled = interactive ? (hoverRating || rating) >= s : rating >= s;
        return (
          <svg
            key={s}
            width="14"
            height="14"
            viewBox="0 0 14 14"
            fill={filled ? "oklch(0.72 0.12 75)" : "none"}
            stroke="oklch(0.72 0.12 75)"
            strokeWidth="1.2"
            style={{ cursor: interactive ? "pointer" : "default", flexShrink: 0 }}
            onMouseEnter={() => interactive && setHoverRating(s)}
            onMouseLeave={() => interactive && setHoverRating(0)}
            onClick={() => interactive && onRate && onRate(s)}
          >
            <polygon points="7,1 8.8,5.2 13.4,5.6 10,8.6 11,13 7,10.6 3,13 4,8.6 0.6,5.6 5.2,5.2" />
          </svg>
        );
      })}
    </div>
  );
}

// ─── Review Section ───────────────────────────────────────────────────────────

function ReviewSection({ productId }: { productId: string }) {
  const [reviews, setReviews] = useState<Review[]>(SEED_REVIEWS[productId] ?? []);
  const [showForm, setShowForm] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formAuthor, setFormAuthor] = useState("");
  const [formBody, setFormBody] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const avgRating = reviews.length
    ? Math.round((reviews.reduce((s, r) => s + r.rating, 0) / reviews.length) * 10) / 10
    : 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formRating) { toast.error("Please select a star rating."); return; }
    if (!formAuthor.trim()) { toast.error("Please enter your name."); return; }
    if (!formBody.trim()) { toast.error("Please write a short review."); return; }
    setSubmitting(true);
    setTimeout(() => {
      const newReview: Review = {
        id: `r-${Date.now()}`,
        author: formAuthor.trim(),
        rating: formRating,
        body: formBody.trim(),
        date: new Date().toISOString().slice(0, 10),
      };
      setReviews((prev) => [newReview, ...prev]);
      setShowForm(false);
      setFormRating(0);
      setFormAuthor("");
      setFormBody("");
      setSubmitting(false);
      toast.success("Thank you for your review!");
    }, 600);
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    background: "oklch(0.11 0.008 60)",
    border: "1px solid oklch(0.72 0.12 75 / 20%)",
    borderRadius: "2px",
    padding: "8px 12px",
    fontFamily: "'Lato', sans-serif",
    fontSize: "0.85rem",
    color: "oklch(0.88 0.015 75)",
    outline: "none",
  };

  return (
    <div
      className="mt-4 pt-4"
      style={{ borderTop: "1px solid oklch(0.72 0.12 75 / 10%)" }}
    >
      {/* Summary row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Stars rating={Math.round(avgRating)} />
          <span
            style={{
              fontFamily: "'Fira Code', monospace",
              fontSize: "0.72rem",
              color: "oklch(0.55 0.010 75)",
              letterSpacing: "0.04em",
            }}
          >
            {reviews.length > 0 ? `${avgRating} · ${reviews.length} review${reviews.length !== 1 ? "s" : ""}` : "No reviews yet"}
          </span>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          style={{
            fontFamily: "'Lato', sans-serif",
            fontSize: "0.72rem",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "oklch(0.72 0.12 75)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: 0,
          }}
        >
          {showForm ? "Cancel" : "+ Write a review"}
        </button>
      </div>

      {/* Submit form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-4 flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <Stars rating={formRating} interactive onRate={setFormRating} />
            <span style={{ fontFamily: "'Lato', sans-serif", fontSize: "0.75rem", color: "oklch(0.55 0.010 75)" }}>
              {formRating ? `${formRating} star${formRating !== 1 ? "s" : ""}` : "Select rating"}
            </span>
          </div>
          <input
            type="text"
            placeholder="Your name (e.g. James R., Barossa Valley)"
            value={formAuthor}
            onChange={(e) => setFormAuthor(e.target.value)}
            style={inputStyle}
            maxLength={60}
          />
          <textarea
            placeholder="Share your experience with this product…"
            value={formBody}
            onChange={(e) => setFormBody(e.target.value)}
            rows={3}
            style={{ ...inputStyle, resize: "vertical" }}
            maxLength={400}
          />
          <button
            type="submit"
            disabled={submitting}
            style={{
              alignSelf: "flex-start",
              padding: "7px 18px",
              background: submitting ? "oklch(0.55 0.08 75)" : "oklch(0.72 0.12 75)",
              color: "oklch(0.10 0.008 60)",
              border: "none",
              borderRadius: "2px",
              fontFamily: "'Lato', sans-serif",
              fontWeight: 600,
              fontSize: "0.75rem",
              letterSpacing: "0.10em",
              textTransform: "uppercase",
              cursor: submitting ? "not-allowed" : "pointer",
            }}
          >
            {submitting ? "Submitting…" : "Submit Review"}
          </button>
        </form>
      )}

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div
              key={r.id}
              className="p-3 rounded-sm"
              style={{ background: "oklch(0.11 0.008 60)", border: "1px solid oklch(0.72 0.12 75 / 8%)" }}
            >
              <div className="flex items-center justify-between mb-1">
                <Stars rating={r.rating} />
                <span
                  style={{
                    fontFamily: "'Fira Code', monospace",
                    fontSize: "0.65rem",
                    color: "oklch(0.45 0.008 75)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {r.date}
                </span>
              </div>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.82rem",
                  color: "oklch(0.70 0.012 75)",
                  lineHeight: 1.6,
                  margin: "4px 0 2px",
                }}
              >
                {r.body}
              </p>
              <p
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontSize: "0.72rem",
                  color: "oklch(0.50 0.010 75)",
                  fontStyle: "italic",
                }}
              >
                — {r.author}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Zoom Modal (tap-to-zoom for mobile) ──────────────────────────────────────

function ZoomModal({ imageUrl, alt, onClose }: { imageUrl: string; alt: string; onClose: () => void }) {
  const [scale, setScale] = useState(1);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const imgRef = useRef<HTMLImageElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleTap = (e: React.MouseEvent<HTMLImageElement> | React.TouchEvent<HTMLImageElement>) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    let clientX: number, clientY: number;
    if ("touches" in e) {
      clientX = e.touches[0]?.clientX ?? rect.left + rect.width / 2;
      clientY = e.touches[0]?.clientY ?? rect.top + rect.height / 2;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const x = ((clientX - rect.left) / rect.width) * 100;
    const y = ((clientY - rect.top) / rect.height) * 100;
    setOrigin({ x, y });
    setScale((s) => (s === 1 ? 2.5 : 1));
  };

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center"
      style={{ background: "oklch(0 0 0 / 92%)", backdropFilter: "blur(8px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        aria-label="Close image viewer"
        style={{
          position: "absolute",
          top: "16px",
          right: "20px",
          background: "oklch(0.14 0.008 60)",
          border: "1px solid oklch(0.72 0.12 75 / 30%)",
          color: "oklch(0.72 0.12 75)",
          borderRadius: "2px",
          padding: "6px 14px",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.75rem",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          cursor: "pointer",
          zIndex: 201,
        }}
      >
        ✕ Close
      </button>

      {/* Hint */}
      <p
        style={{
          position: "absolute",
          bottom: "20px",
          left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Lato', sans-serif",
          fontSize: "0.7rem",
          letterSpacing: "0.10em",
          textTransform: "uppercase",
          color: "oklch(0.55 0.010 75)",
          whiteSpace: "nowrap",
          pointerEvents: "none",
        }}
      >
        {scale === 1 ? "Tap to zoom in" : "Tap to zoom out"}
      </p>

      {/* Image */}
      <div
        style={{
          maxWidth: "min(90vw, 600px)",
          maxHeight: "80vh",
          overflow: "hidden",
          borderRadius: "4px",
          border: "1px solid oklch(0.72 0.12 75 / 20%)",
          cursor: scale === 1 ? "zoom-in" : "zoom-out",
        }}
      >
        <img
          ref={imgRef}
          src={imageUrl}
          alt={alt}
          draggable={false}
          onClick={handleTap}
          onTouchStart={handleTap}
          style={{
            display: "block",
            width: "100%",
            height: "auto",
            transition: "transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
            transform: `scale(${scale})`,
            transformOrigin: `${origin.x}% ${origin.y}%`,
            userSelect: "none",
          }}
        />
      </div>
    </div>
  );
}

// ─── Cart Drawer ──────────────────────────────────────────────────────────────

function CartDrawer({
  items,
  onClose,
  onUpdateQty,
  onRemove,
}: {
  items: CartItem[];
  onClose: () => void;
  onUpdateQty: (productId: string, qty: number) => void;
  onRemove: (productId: string) => void;
}) {
  const [checkingOut, setCheckingOut] = useState(false);
  const total = items.reduce((s, i) => s + i.product.priceAud * i.qty, 0);

  // Lock body scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleCheckout = async () => {
    if (items.length === 0) return;
    setCheckingOut(true);
    try {
      toast.info("Redirecting to secure checkout…");
      await startCartCheckout(items);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed. Please try again.");
    } finally {
      setCheckingOut(false);
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-[100]"
        style={{ background: "oklch(0 0 0 / 60%)", backdropFilter: "blur(2px)" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <div
        className="fixed top-0 right-0 h-full z-[101] flex flex-col"
        style={{
          width: "min(420px, 100vw)",
          background: "oklch(0.13 0.008 60)",
          borderLeft: "1px solid oklch(0.72 0.12 75 / 15%)",
          boxShadow: "-8px 0 40px oklch(0 0 0 / 50%)",
        }}
        role="dialog"
        aria-label="Shopping cart"
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-6 py-4"
          style={{ borderBottom: "1px solid oklch(0.72 0.12 75 / 12%)" }}
        >
          <div>
            <h2
              style={{
                fontFamily: "'Fraunces', serif",
                fontWeight: 600,
                fontSize: "1.1rem",
                color: "oklch(0.92 0.018 75)",
              }}
            >
              Your Cart
            </h2>
            <p
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.68rem",
                color: "oklch(0.50 0.010 75)",
                letterSpacing: "0.04em",
                marginTop: "2px",
              }}
            >
              {items.length} item{items.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close cart"
            style={{
              background: "none",
              border: "1px solid oklch(0.72 0.12 75 / 20%)",
              color: "oklch(0.65 0.012 75)",
              borderRadius: "2px",
              padding: "4px 10px",
              fontFamily: "'Lato', sans-serif",
              fontSize: "0.75rem",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-4">
          {items.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center h-full gap-3"
              style={{ color: "oklch(0.50 0.010 75)", fontFamily: "'Lato', sans-serif", fontSize: "0.9rem" }}
            >
              <span style={{ fontSize: "2rem" }}>🛒</span>
              <p>Your cart is empty.</p>
            </div>
          ) : (
            items.map((item) => (
              <div
                key={item.product.id}
                className="flex gap-4 items-start"
                style={{
                  paddingBottom: "16px",
                  borderBottom: "1px solid oklch(0.72 0.12 75 / 8%)",
                }}
              >
                {/* Thumbnail */}
                <img
                  src={item.product.imageUrl}
                  alt={item.product.name}
                  style={{
                    width: "64px",
                    height: "64px",
                    objectFit: "cover",
                    borderRadius: "2px",
                    border: "1px solid oklch(0.72 0.12 75 / 15%)",
                    flexShrink: 0,
                  }}
                />
                {/* Details */}
                <div className="flex-1 min-w-0">
                  <p
                    style={{
                      fontFamily: "'Fraunces', serif",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "oklch(0.90 0.018 75)",
                      lineHeight: 1.3,
                    }}
                  >
                    {item.product.name}
                  </p>
                  <p
                    style={{
                      fontFamily: "'Fira Code', monospace",
                      fontSize: "0.68rem",
                      color: "oklch(0.50 0.010 75)",
                      letterSpacing: "0.04em",
                      marginTop: "2px",
                    }}
                  >
                    ${(item.product.priceAud / 100).toFixed(2)} AUD each
                  </p>

                  {/* Qty controls + remove */}
                  <div className="flex items-center gap-3 mt-2">
                    <div
                      className="flex items-center gap-1 rounded-sm"
                      style={{ border: "1px solid oklch(0.72 0.12 75 / 20%)" }}
                    >
                      <button
                        onClick={() => onUpdateQty(item.product.id, Math.max(1, item.qty - 1))}
                        className="w-6 h-6 flex items-center justify-center"
                        style={{ color: "oklch(0.65 0.012 75)", cursor: "pointer", background: "none", border: "none" }}
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span
                        className="w-5 text-center text-sm"
                        style={{ color: "oklch(0.85 0.015 75)", fontFamily: "'Lato', sans-serif" }}
                      >
                        {item.qty}
                      </span>
                      <button
                        onClick={() => onUpdateQty(item.product.id, Math.min(10, item.qty + 1))}
                        className="w-6 h-6 flex items-center justify-center"
                        style={{ color: "oklch(0.65 0.012 75)", cursor: "pointer", background: "none", border: "none" }}
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => onRemove(item.product.id)}
                      style={{
                        background: "none",
                        border: "none",
                        fontFamily: "'Lato', sans-serif",
                        fontSize: "0.72rem",
                        color: "oklch(0.50 0.010 75)",
                        cursor: "pointer",
                        textDecoration: "underline",
                        padding: 0,
                      }}
                    >
                      Remove
                    </button>
                  </div>
                </div>

                {/* Line total */}
                <p
                  style={{
                    fontFamily: "'Fraunces', serif",
                    fontWeight: 700,
                    fontSize: "1rem",
                    color: "oklch(0.72 0.12 75)",
                    flexShrink: 0,
                  }}
                >
                  ${((item.product.priceAud * item.qty) / 100).toFixed(2)}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div
            className="px-6 py-5 flex flex-col gap-3"
            style={{ borderTop: "1px solid oklch(0.72 0.12 75 / 12%)" }}
          >
            <div className="flex items-center justify-between">
              <span
                style={{
                  fontFamily: "'Lato', sans-serif",
                  fontWeight: 300,
                  fontSize: "0.875rem",
                  color: "oklch(0.65 0.012 75)",
                }}
              >
                Subtotal (excl. shipping)
              </span>
              <span
                style={{
                  fontFamily: "'Fraunces', serif",
                  fontWeight: 700,
                  fontSize: "1.3rem",
                  color: "oklch(0.72 0.12 75)",
                }}
              >
                ${(total / 100).toFixed(2)} AUD
              </span>
            </div>
            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              style={{
                width: "100%",
                padding: "14px",
                background: checkingOut ? "oklch(0.55 0.08 75)" : "oklch(0.72 0.12 75)",
                color: "oklch(0.10 0.008 60)",
                border: "none",
                borderRadius: "2px",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 700,
                fontSize: "0.875rem",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
                cursor: checkingOut ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { if (!checkingOut) e.currentTarget.style.background = "oklch(0.78 0.14 75)"; }}
              onMouseLeave={(e) => { if (!checkingOut) e.currentTarget.style.background = "oklch(0.72 0.12 75)"; }}
            >
              {checkingOut ? "Opening checkout…" : "Proceed to Checkout →"}
            </button>
            <p
              style={{
                fontFamily: "'Fira Code', monospace",
                fontSize: "0.65rem",
                color: "oklch(0.40 0.008 75)",
                letterSpacing: "0.04em",
                textAlign: "center",
              }}
            >
              Secure checkout via Stripe · Test card: 4242 4242 4242 4242
            </p>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Product Card ─────────────────────────────────────────────────────────────

function ProductCard({
  product,
  onAddToCart,
}: {
  product: Product;
  onAddToCart: (product: Product, qty: number) => void;
}) {
  const [qty, setQty] = useState(1);
  const [hovered, setHovered] = useState(false);
  const [lensPos, setLensPos] = useState({ x: 50, y: 50 });
  const [zoomOpen, setZoomOpen] = useState(false);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = imgContainerRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;
    setLensPos({ x: Math.max(0, Math.min(100, x)), y: Math.max(0, Math.min(100, y)) });
  }, []);

  const price = (product.priceAud / 100).toFixed(2);
  const ZOOM = 2.8;
  const LENS = 120;

  const categoryLabel =
    product.category === "coaster"
      ? "Coaster"
      : product.category === "bar-towel"
      ? "Bar Runner"
      : product.category === "notebook"
      ? "Notebook"
      : "Merch";

  return (
    <>
      {zoomOpen && (
        <ZoomModal
          imageUrl={product.imageUrl}
          alt={product.name}
          onClose={() => setZoomOpen(false)}
        />
      )}

      <div
        className="flex flex-col rounded-sm overflow-hidden"
        style={{
          background: "oklch(0.14 0.008 60)",
          border: "1px solid oklch(0.72 0.12 75 / 15%)",
          transition: "border-color 0.25s",
          ...(hovered ? { borderColor: "oklch(0.72 0.12 75 / 45%)" } : {}),
        }}
      >
        {/* Image area — desktop: magnifier lens; mobile: tap to open zoom modal */}
        <div
          ref={imgContainerRef}
          className="relative aspect-square overflow-hidden"
          style={{ cursor: "crosshair" }}
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          onMouseMove={handleMouseMove}
          // Mobile tap opens the zoom modal
          onClick={() => setZoomOpen(true)}
        >
          {/* Base image */}
          <img
            src={product.imageUrl}
            alt={product.name}
            className="w-full h-full object-cover"
            style={{
              transition: "transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
              transform: hovered ? "scale(1.04)" : "scale(1)",
              pointerEvents: "none",
            }}
          />

          {/* Desktop magnifier lens */}
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
                left: `calc(${lensPos.x}% - ${LENS / 2}px)`,
                top: `calc(${lensPos.y}% - ${LENS / 2}px)`,
                overflow: "hidden",
                backgroundImage: `url(${product.imageUrl})`,
                backgroundSize: `${ZOOM * 100}%`,
                backgroundPosition: `${lensPos.x}% ${lensPos.y}%`,
                backgroundRepeat: "no-repeat",
              }}
            />
          )}

          {/* Hover / tap hint */}
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
            Tap to inspect
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
              pointerEvents: "none",
            }}
          >
            {categoryLabel}
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

          {/* Price + quantity */}
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

            <div
              className="flex items-center gap-1 rounded-sm"
              style={{ border: "1px solid oklch(0.72 0.12 75 / 20%)" }}
            >
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="w-7 h-7 flex items-center justify-center"
                style={{ color: "oklch(0.65 0.012 75)", background: "none", border: "none", cursor: "pointer" }}
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
                className="w-7 h-7 flex items-center justify-center"
                style={{ color: "oklch(0.65 0.012 75)", background: "none", border: "none", cursor: "pointer" }}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Add to cart button */}
          <button
            onClick={() => {
              onAddToCart(product, qty);
              toast.success(`${product.name} added to cart.`);
            }}
            disabled={!product.inStock}
            className="w-full py-3 text-sm tracking-widest uppercase transition-all duration-200 rounded-sm"
            style={{
              fontFamily: "'Lato', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.12em",
              background: "transparent",
              color: "oklch(0.72 0.12 75)",
              border: "1px solid oklch(0.72 0.12 75 / 50%)",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "oklch(0.72 0.12 75 / 10%)";
              e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 80%)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
              e.currentTarget.style.borderColor = "oklch(0.72 0.12 75 / 50%)";
            }}
          >
            Add to Cart
          </button>

          {/* Reviews */}
          <ReviewSection productId={product.id} />
        </div>
      </div>
    </>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function Merch() {
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const addToCart = useCallback((product: Product, qty: number) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id
            ? { ...i, qty: Math.min(10, i.qty + qty) }
            : i
        );
      }
      return [...prev, { product, qty }];
    });
  }, []);

  const updateQty = useCallback((productId: string, qty: number) => {
    setCart((prev) => prev.map((i) => i.product.id === productId ? { ...i, qty } : i));
  }, []);

  const removeItem = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  return (
    <div
      className="min-h-screen"
      style={{ background: "oklch(0.11 0.008 60)", color: "oklch(0.90 0.015 75)" }}
    >
      {/* Cart drawer */}
      {cartOpen && (
        <CartDrawer
          items={cart}
          onClose={() => setCartOpen(false)}
          onUpdateQty={updateQty}
          onRemove={removeItem}
        />
      )}

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
          <div className="flex items-center gap-4">
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

            {/* Cart button */}
            <button
              onClick={() => setCartOpen(true)}
              aria-label={`Open cart — ${cartCount} item${cartCount !== 1 ? "s" : ""}`}
              style={{
                position: "relative",
                background: cartCount > 0 ? "oklch(0.72 0.12 75 / 12%)" : "none",
                border: `1px solid ${cartCount > 0 ? "oklch(0.72 0.12 75 / 40%)" : "oklch(0.72 0.12 75 / 20%)"}`,
                color: "oklch(0.72 0.12 75)",
                borderRadius: "2px",
                padding: "6px 14px",
                fontFamily: "'Lato', sans-serif",
                fontWeight: 600,
                fontSize: "0.8rem",
                letterSpacing: "0.08em",
                textTransform: "uppercase",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M1 1h2l1.5 7h7l1.5-5H4" strokeLinecap="round" strokeLinejoin="round" />
                <circle cx="6" cy="12" r="0.8" fill="currentColor" />
                <circle cx="11" cy="12" r="0.8" fill="currentColor" />
              </svg>
              Cart
              {cartCount > 0 && (
                <span
                  style={{
                    background: "oklch(0.72 0.12 75)",
                    color: "oklch(0.10 0.008 60)",
                    borderRadius: "50%",
                    width: "18px",
                    height: "18px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "0.65rem",
                    fontWeight: 700,
                    flexShrink: 0,
                  }}
                >
                  {cartCount}
                </span>
              )}
            </button>
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
        <div
          className="mt-8"
          style={{ height: "1px", background: "oklch(0.72 0.12 75 / 20%)" }}
        />
      </header>

      {/* Product grid */}
      <main className="container pb-24">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {PRODUCTS.map((p) => (
            <ProductCard key={p.id} product={p} onAddToCart={addToCart} />
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
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>Australia</p>
              <p>Standard shipping 5–8 business days. Express available at checkout. All orders fulfilled via Vistaprint AU.</p>
            </div>
            <div>
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>New Zealand & International</p>
              <p>International shipping available. Rates calculated at checkout based on destination and weight.</p>
            </div>
            <div>
              <p style={{ color: "oklch(0.72 0.12 75)", fontWeight: 600, marginBottom: "4px" }}>Founding Member Packs</p>
              <p>Founding member subscribers receive a complimentary notebook and bottle label sticker with their welcome pack.</p>
            </div>
          </div>
        </div>

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
