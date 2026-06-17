/**
 * OWNOLOGY — /orders
 * Owner-only page: merch order history pulled live from Stripe Checkout sessions.
 * No local DB table — all data comes from the Stripe API via tRPC ownerProcedure.
 */

import { useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { getLoginUrl } from "@/const";
import OwnologyLogo from "@/components/OwnologyLogo";
import ThemeToggle from "@/components/ThemeToggle";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAud(cents: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString("en-AU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatTime(ms: number): string {
  return new Date(ms).toLocaleTimeString("en-AU", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

type StatusBadgeProps = { status: string; paymentStatus: string };
function StatusBadge({ status, paymentStatus }: StatusBadgeProps) {
  const paid = status === "complete" && paymentStatus === "paid";
  const expired = status === "expired";
  const open = status === "open";

  const label = paid ? "Paid" : expired ? "Expired" : open ? "Pending" : status;
  const bg = paid
    ? "oklch(0.35 0.08 145 / 25%)"
    : expired
    ? "oklch(0.30 0.05 25 / 25%)"
    : "oklch(0.35 0.08 75 / 25%)";
  const border = paid
    ? "oklch(0.55 0.12 145 / 40%)"
    : expired
    ? "oklch(0.50 0.10 25 / 40%)"
    : "oklch(0.55 0.10 75 / 40%)";
  const color = paid
    ? "oklch(0.75 0.12 145)"
    : expired
    ? "oklch(0.70 0.10 25)"
    : "oklch(0.80 0.10 75)";

  return (
    <span
      className="inline-flex items-center px-2 py-0.5 rounded-sm text-xs"
      style={{
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontFamily: "'Fira Code', monospace",
        fontSize: "0.68rem",
        letterSpacing: "0.04em",
      }}
    >
      {label}
    </span>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div
      className="rounded-sm px-5 py-4"
      style={{
        background: "var(--ow-bg-card)",
        border: "1px solid var(--ow-border)",
      }}
    >
      <p
        className="text-xs tracking-wider uppercase mb-1"
        style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.1em" }}
      >
        {label}
      </p>
      <p
        style={{
          fontFamily: "'Fraunces',serif",
          fontWeight: 600,
          fontSize: "1.6rem",
          color: "var(--ow-amber)",
          lineHeight: 1.1,
        }}
      >
        {value}
      </p>
      {sub && (
        <p
          className="mt-1 text-xs"
          style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
        >
          {sub}
        </p>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Orders() {
  const [statusFilter, setStatusFilter] = useState<"all" | "paid" | "pending" | "expired">("all");

  const { data, isLoading, error, refetch } = trpc.orders.list.useQuery(
    { limit: 50 },
    { retry: false }
  );

  // ── Auth / owner guard ────────────────────────────────────────────────────────────
  // The ownerProcedure on the server throws FORBIDDEN if not the owner.
  // We surface that as a friendly message rather than crashing.
  if (isLoading) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: "var(--ow-bg-base)" }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 animate-spin"
          style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }}
        />
      </div>
    );
  }

  const isForbidden = error?.data?.code === "FORBIDDEN";
  const isUnauthorized = error?.data?.code === "UNAUTHORIZED" || error?.message?.includes("login");

  if (isForbidden || isUnauthorized) {
    return (
      <div
        className="min-h-screen flex flex-col items-center justify-center gap-6"
        style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}
      >
        <p style={{ fontFamily: "'Lato',sans-serif", color: "var(--ow-text-lo)" }}>
          {isForbidden
            ? "This page is restricted to the site owner."
            : "Please sign in to view orders."}
        </p>
        {isUnauthorized && (
          <a
            href={getLoginUrl()}
            className="px-6 py-2.5 rounded-sm text-sm font-medium"
            style={{
              background: "var(--ow-amber)",
              color: "oklch(0.12 0.01 60)",
              fontFamily: "'Lato',sans-serif",
            }}
          >
            Sign in
          </a>
        )}
      </div>
    );
  }

  // ── Filter orders ─────────────────────────────────────────────────────────────
  const allOrders = data?.orders ?? [];
  const filteredOrders = allOrders.filter((o) => {
    if (statusFilter === "paid") return o.status === "complete" && o.paymentStatus === "paid";
    if (statusFilter === "pending") return o.status === "open";
    if (statusFilter === "expired") return o.status === "expired";
    return true;
  });

  const summary = data?.summary;

  return (
    <div className="min-h-screen" style={{ background: "var(--ow-bg-base)", color: "var(--ow-text-hi)" }}>
      {/* Nav */}
      <nav
        className="fixed top-0 left-0 right-0 z-50 backdrop-blur-md border-b"
        style={{ background: "var(--ow-nav-bg)", borderColor: "var(--ow-border)" }}
      >
        <div className="container flex items-center justify-between py-4">
          <Link href="/">
            <OwnologyLogo size={30} />
          </Link>
          <div className="flex items-center gap-4">
            <span
              className="text-xs tracking-widest uppercase"
              style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif", letterSpacing: "0.12em" }}
            >
              Merch Orders
            </span>
            <Link
              href="/campaign-metrics"
              className="text-xs transition-colors hidden sm:block"
              style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
            >
              ← Metrics
            </Link>
            <ThemeToggle compact />
          </div>
        </div>
      </nav>

      <div className="container pt-24 pb-12" style={{ maxWidth: "1000px", margin: "0 auto" }}>
        {/* Header */}
        <div className="mb-8">
          <p
            className="section-label mb-3"
            style={{ fontFamily: "'Lato',sans-serif", fontSize: "0.7rem", letterSpacing: "0.12em" }}
          >
            Owner Dashboard · Stripe Live Data
          </p>
          <div className="flex items-center justify-between flex-wrap gap-4">
            <h1
              style={{
                fontFamily: "'Fraunces',serif",
                fontWeight: 700,
                fontSize: "clamp(1.75rem,4vw,2.5rem)",
                lineHeight: 1.1,
                color: "var(--ow-text-hi)",
                textWrap: "balance" as "balance",
              }}
            >
              Merch <em style={{ color: "var(--ow-amber)", fontStyle: "italic" }}>Orders</em>
            </h1>
            <button
              onClick={() => refetch()}
              className="flex items-center gap-2 px-4 py-2 rounded-sm text-xs transition-all"
              style={{
                background: "var(--ow-bg-card)",
                border: "1px solid var(--ow-border)",
                color: "var(--ow-text-lo)",
                fontFamily: "'Lato',sans-serif",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ow-amber)")}
              onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ow-border)")}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <path d="M10 6A4 4 0 112 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
                <path d="M10 3v3H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Refresh
            </button>
          </div>
        </div>

        {/* KPI summary row */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-8">
            <KpiCard
              label="Paid Orders"
              value={String(summary.totalOrders)}
              sub="Completed checkouts"
            />
            <KpiCard
              label="Total Revenue"
              value={formatAud(summary.totalRevenue)}
              sub="AUD incl. GST"
            />
            <KpiCard
              label="Avg Order Value"
              value={summary.totalOrders > 0 ? formatAud(summary.avgOrderValue) : "—"}
              sub="Per paid order"
            />
          </div>
        )}

        {/* Status filter pills */}
        <div className="flex flex-wrap gap-2 mb-5">
          {(["all", "paid", "pending", "expired"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className="px-3 py-1.5 rounded-sm text-xs transition-all capitalize"
              style={{
                fontFamily: "'Lato',sans-serif",
                letterSpacing: "0.06em",
                fontWeight: statusFilter === f ? 600 : 300,
                background:
                  statusFilter === f
                    ? "color-mix(in oklch, var(--ow-amber) 15%, transparent)"
                    : "var(--ow-bg-card)",
                border:
                  statusFilter === f
                    ? "1px solid var(--ow-amber)"
                    : "1px solid var(--ow-border)",
                color: statusFilter === f ? "var(--ow-amber)" : "var(--ow-text-lo)",
                cursor: "pointer",
              }}
            >
              {f === "all" ? `All (${allOrders.length})` : f}
            </button>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <div
              className="w-8 h-8 rounded-full border-2 animate-spin"
              style={{ borderColor: "var(--ow-amber)", borderTopColor: "transparent" }}
            />
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            className="px-5 py-4 rounded-sm text-sm"
            style={{
              background: "oklch(0.3 0.08 25 / 20%)",
              border: "1px solid oklch(0.5 0.12 25 / 40%)",
              color: "oklch(0.75 0.08 25)",
              fontFamily: "'Lato',sans-serif",
            }}
          >
            <strong>Could not load orders.</strong> {error.message}
            <br />
            <span style={{ fontSize: "0.8rem", opacity: 0.8 }}>
              Make sure STRIPE_SECRET_KEY is configured and you are signed in as the site owner.
            </span>
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 gap-4 rounded-sm"
            style={{ border: "1px dashed var(--ow-border)" }}
          >
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none" aria-hidden="true">
              <rect x="8" y="12" width="24" height="20" rx="2" stroke="var(--ow-amber)" strokeWidth="1.5" strokeOpacity="0.5"/>
              <path d="M14 12V10a6 6 0 0112 0v2" stroke="var(--ow-amber)" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round"/>
              <path d="M16 20h8M16 25h5" stroke="var(--ow-amber)" strokeWidth="1.5" strokeOpacity="0.5" strokeLinecap="round"/>
            </svg>
            <p style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", fontSize: "0.9rem" }}>
              {statusFilter === "all" ? "No orders yet — test with card 4242 4242 4242 4242" : `No ${statusFilter} orders`}
            </p>
            <Link
              href="/merch"
              className="text-xs underline"
              style={{ color: "var(--ow-amber)", fontFamily: "'Lato',sans-serif" }}
            >
              Go to Merch store →
            </Link>
          </div>
        )}

        {/* Orders table */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div
            className="rounded-sm overflow-hidden"
            style={{ border: "1px solid var(--ow-border)" }}
          >
            {/* Table header */}
            <div
              className="grid items-center px-4 py-3 text-xs tracking-wider uppercase"
              style={{
                gridTemplateColumns: "1fr 2fr 1.5fr 1fr 1fr",
                background: "var(--ow-bg-card)",
                borderBottom: "1px solid var(--ow-border)",
                color: "var(--ow-text-lo)",
                fontFamily: "'Lato',sans-serif",
                letterSpacing: "0.08em",
              }}
            >
              <span>Date</span>
              <span>Customer</span>
              <span>Items</span>
              <span>Amount</span>
              <span>Status</span>
            </div>

            {/* Table rows */}
            {filteredOrders.map((order, i) => (
              <div
                key={order.sessionId}
                className="grid items-start px-4 py-4 transition-colors"
                style={{
                  gridTemplateColumns: "1fr 2fr 1.5fr 1fr 1fr",
                  borderBottom:
                    i < filteredOrders.length - 1 ? "1px solid var(--ow-border)" : "none",
                  background: "transparent",
                }}
                onMouseEnter={e =>
                  (e.currentTarget.style.background =
                    "color-mix(in oklch, var(--ow-amber) 4%, transparent)")
                }
                onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
              >
                {/* Date */}
                <div>
                  <p
                    className="text-sm"
                    style={{ color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif", fontWeight: 400 }}
                  >
                    {formatDate(order.createdAt)}
                  </p>
                  <p
                    className="text-xs mt-0.5"
                    style={{ color: "var(--ow-text-lo)", fontFamily: "'Fira Code',monospace" }}
                  >
                    {formatTime(order.createdAt)}
                  </p>
                </div>

                {/* Customer */}
                <div>
                  <p
                    className="text-sm truncate"
                    style={{ color: "var(--ow-text-hi)", fontFamily: "'Lato',sans-serif" }}
                  >
                    {order.customerName ?? "—"}
                  </p>
                  <p
                    className="text-xs mt-0.5 truncate"
                    style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
                  >
                    {order.customerEmail ?? "No email"}
                  </p>
                </div>

                {/* Line items */}
                <div className="space-y-1">
                  {order.lineItems.length === 0 ? (
                    <p
                      className="text-xs"
                      style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
                    >
                      No items
                    </p>
                  ) : (
                    order.lineItems.map((li, j) => (
                      <p
                        key={j}
                        className="text-xs leading-snug"
                        style={{ color: "var(--ow-text-mid)", fontFamily: "'Lato',sans-serif" }}
                      >
                        {li.quantity > 1 && (
                          <span
                            className="mr-1 px-1 rounded-sm"
                            style={{
                              background: "color-mix(in oklch, var(--ow-amber) 12%, transparent)",
                              color: "var(--ow-amber)",
                              fontFamily: "'Fira Code',monospace",
                              fontSize: "0.65rem",
                            }}
                          >
                            ×{li.quantity}
                          </span>
                        )}
                        {li.productName}
                      </p>
                    ))
                  )}
                </div>

                {/* Amount */}
                <div>
                  <p
                    className="text-sm font-medium"
                    style={{ color: "var(--ow-text-hi)", fontFamily: "'Fira Code',monospace" }}
                  >
                    {formatAud(order.amountTotalAud)}
                  </p>
                  <p
                    className="text-xs mt-0.5 uppercase"
                    style={{ color: "var(--ow-text-lo)", fontFamily: "'Fira Code',monospace", fontSize: "0.65rem" }}
                  >
                    {order.currency}
                  </p>
                </div>

                {/* Status + Stripe link */}
                <div className="flex flex-col gap-1.5 items-start">
                  <StatusBadge status={order.status} paymentStatus={order.paymentStatus} />
                  {order.status === "complete" && (
                    <a
                      href={order.stripeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs transition-colors"
                      style={{
                        color: "var(--ow-text-lo)",
                        fontFamily: "'Lato',sans-serif",
                        textDecoration: "underline",
                        textDecorationColor: "var(--ow-border)",
                      }}
                      onMouseEnter={e => (e.currentTarget.style.color = "var(--ow-amber)")}
                      onMouseLeave={e => (e.currentTarget.style.color = "var(--ow-text-lo)")}
                    >
                      Stripe ↗
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination hint */}
        {data?.hasMore && (
          <p
            className="mt-4 text-xs text-center"
            style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif" }}
          >
            Showing the most recent 50 orders. Older orders are available in the{" "}
            <a
              href="https://dashboard.stripe.com/payments"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: "var(--ow-amber)" }}
            >
              Stripe Dashboard
            </a>
            .
          </p>
        )}

        {/* Footer note */}
        <p
          className="mt-8 text-xs text-center"
          style={{ color: "var(--ow-text-lo)", fontFamily: "'Lato',sans-serif", opacity: 0.6 }}
        >
          Data fetched live from Stripe · No local database · Owner access only
        </p>
      </div>
    </div>
  );
}
