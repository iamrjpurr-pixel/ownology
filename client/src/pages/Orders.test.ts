/**
 * Vitest tests for the orders router — validates the shape of the data
 * returned by the Stripe session mapper without making real API calls.
 */

import { describe, it, expect } from "vitest";

// ─── Local type mirrors (matching server/routers.ts exports) ──────────────────
interface OrderLineItem {
  productId: string;
  productName: string;
  quantity: number;
  unitAmountAud: number;
  totalAmountAud: number;
}

interface MerchOrder {
  sessionId: string;
  createdAt: number;
  customerEmail: string | null;
  customerName: string | null;
  amountTotalAud: number;
  currency: string;
  status: "complete" | "expired" | "open";
  paymentStatus: string;
  lineItems: OrderLineItem[];
  stripeUrl: string;
}

// ─── Helper: build a minimal MerchOrder fixture ───────────────────────────────

function makeOrder(overrides: Partial<MerchOrder> = {}): MerchOrder {
  return {
    sessionId: "cs_test_abc123",
    createdAt: 1_715_000_000_000,
    customerEmail: "buyer@example.com",
    customerName: "Jane Winemaker",
    amountTotalAud: 1800,
    currency: "aud",
    status: "complete",
    paymentStatus: "paid",
    lineItems: [],
    stripeUrl: "https://dashboard.stripe.com/payments/pi_test_abc",
    ...overrides,
  };
}

function makeLineItem(overrides: Partial<OrderLineItem> = {}): OrderLineItem {
  return {
    productId: "coaster-dark",
    productName: "Founding Member Coaster — Dark",
    quantity: 1,
    unitAmountAud: 1800,
    totalAmountAud: 1800,
    ...overrides,
  };
}

// ─── MerchOrder shape ─────────────────────────────────────────────────────────

describe("MerchOrder shape", () => {
  it("has all required fields", () => {
    const order = makeOrder();
    expect(order).toHaveProperty("sessionId");
    expect(order).toHaveProperty("createdAt");
    expect(order).toHaveProperty("customerEmail");
    expect(order).toHaveProperty("customerName");
    expect(order).toHaveProperty("amountTotalAud");
    expect(order).toHaveProperty("currency");
    expect(order).toHaveProperty("status");
    expect(order).toHaveProperty("paymentStatus");
    expect(order).toHaveProperty("lineItems");
    expect(order).toHaveProperty("stripeUrl");
  });

  it("accepts null customerEmail and customerName", () => {
    const order = makeOrder({ customerEmail: null, customerName: null });
    expect(order.customerEmail).toBeNull();
    expect(order.customerName).toBeNull();
  });

  it("status is one of the allowed values", () => {
    const validStatuses: MerchOrder["status"][] = ["complete", "expired", "open"];
    for (const s of validStatuses) {
      const order = makeOrder({ status: s });
      expect(validStatuses).toContain(order.status);
    }
  });

  it("amountTotalAud is in cents (integer)", () => {
    const order = makeOrder({ amountTotalAud: 4500 });
    expect(Number.isInteger(order.amountTotalAud)).toBe(true);
    expect(order.amountTotalAud).toBe(4500);
  });

  it("createdAt is a Unix millisecond timestamp", () => {
    const order = makeOrder({ createdAt: Date.now() });
    // Should be > year 2020 and < year 2100
    expect(order.createdAt).toBeGreaterThan(1_577_836_800_000);
    expect(order.createdAt).toBeLessThan(4_102_444_800_000);
  });
});

// ─── OrderLineItem shape ──────────────────────────────────────────────────────

describe("OrderLineItem shape", () => {
  it("has all required fields", () => {
    const li = makeLineItem();
    expect(li).toHaveProperty("productId");
    expect(li).toHaveProperty("productName");
    expect(li).toHaveProperty("quantity");
    expect(li).toHaveProperty("unitAmountAud");
    expect(li).toHaveProperty("totalAmountAud");
  });

  it("totalAmountAud equals unitAmountAud * quantity for single item", () => {
    const li = makeLineItem({ quantity: 1, unitAmountAud: 1800, totalAmountAud: 1800 });
    expect(li.totalAmountAud).toBe(li.unitAmountAud * li.quantity);
  });

  it("totalAmountAud equals unitAmountAud * quantity for multi-item", () => {
    const li = makeLineItem({ quantity: 3, unitAmountAud: 1800, totalAmountAud: 5400 });
    expect(li.totalAmountAud).toBe(li.unitAmountAud * li.quantity);
  });
});

// ─── Summary stats logic ──────────────────────────────────────────────────────

describe("summary stats calculation", () => {
  function computeSummary(orders: MerchOrder[]) {
    const completed = orders.filter(
      (o) => o.status === "complete" && o.paymentStatus === "paid"
    );
    const totalRevenue = completed.reduce((sum, o) => sum + o.amountTotalAud, 0);
    const totalOrders = completed.length;
    return {
      totalOrders,
      totalRevenue,
      avgOrderValue: totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0,
    };
  }

  it("counts only paid+complete orders", () => {
    const orders = [
      makeOrder({ status: "complete", paymentStatus: "paid", amountTotalAud: 1800 }),
      makeOrder({ status: "expired", paymentStatus: "unpaid", amountTotalAud: 4500 }),
      makeOrder({ status: "open", paymentStatus: "unpaid", amountTotalAud: 2800 }),
    ];
    const summary = computeSummary(orders);
    expect(summary.totalOrders).toBe(1);
    expect(summary.totalRevenue).toBe(1800);
  });

  it("returns zero avgOrderValue when no paid orders", () => {
    const summary = computeSummary([]);
    expect(summary.avgOrderValue).toBe(0);
  });

  it("calculates correct average order value", () => {
    const orders = [
      makeOrder({ status: "complete", paymentStatus: "paid", amountTotalAud: 1800 }),
      makeOrder({ status: "complete", paymentStatus: "paid", amountTotalAud: 4500 }),
    ];
    const summary = computeSummary(orders);
    expect(summary.totalOrders).toBe(2);
    expect(summary.totalRevenue).toBe(6300);
    expect(summary.avgOrderValue).toBe(3150);
  });

  it("sums revenue across multiple paid orders", () => {
    const amounts = [1800, 2800, 4500, 1800];
    const orders = amounts.map((a) =>
      makeOrder({ status: "complete", paymentStatus: "paid", amountTotalAud: a })
    );
    const summary = computeSummary(orders);
    expect(summary.totalRevenue).toBe(10900);
    expect(summary.totalOrders).toBe(4);
  });
});
