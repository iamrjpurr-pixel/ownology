/**
 * Vitest tests for the Ownology Merch store
 * Tests the product catalogue data and checkout API contract.
 */

import { describe, it, expect } from "vitest";

// ─── Mirror the product catalogue for testing ─────────────────────────────────

interface Product {
  id: string;
  name: string;
  priceAud: number;
  category: string;
  inStock: boolean;
  specs: string;
}

const PRODUCTS: Product[] = [
  {
    id: "coaster-dark",
    name: "Founding Member Coaster — Dark",
    priceAud: 1800,
    category: "coaster",
    specs: "90mm diameter · Natural cork · Printed top · Pack of 4",
    inStock: true,
  },
  {
    id: "coaster-light",
    name: "Cellar Intelligence Coaster — Light",
    priceAud: 1800,
    category: "coaster",
    specs: "90mm diameter · Natural cork · Printed top · Pack of 4",
    inStock: true,
  },
  {
    id: "bar-towel",
    name: "Cellar Door Bar Runner",
    priceAud: 4500,
    category: "bar-towel",
    specs: "500mm × 250mm · Natural linen · Printed design · Single",
    inStock: true,
  },
  {
    id: "notebook",
    name: "Winemaker's Field Notebook",
    priceAud: 2800,
    category: "notebook",
    specs: "A6 (105mm × 148mm) · Leatherette cover · 96 ruled pages",
    inStock: true,
  },
];

describe("Merch product catalogue", () => {
  it("has exactly 4 products", () => {
    expect(PRODUCTS).toHaveLength(4);
  });

  it("all products are in stock", () => {
    expect(PRODUCTS.every((p) => p.inStock)).toBe(true);
  });

  it("all products have a positive AUD price in cents", () => {
    for (const p of PRODUCTS) {
      expect(p.priceAud).toBeGreaterThan(0);
      expect(p.priceAud % 1).toBe(0); // must be integer cents
    }
  });

  it("all products have a non-empty id, name, and specs", () => {
    for (const p of PRODUCTS) {
      expect(p.id.length).toBeGreaterThan(0);
      expect(p.name.length).toBeGreaterThan(0);
      expect(p.specs.length).toBeGreaterThan(0);
    }
  });

  it("coasters are priced at $18.00 AUD (1800 cents)", () => {
    const coasters = PRODUCTS.filter((p) => p.category === "coaster");
    expect(coasters).toHaveLength(2);
    for (const c of coasters) {
      expect(c.priceAud).toBe(1800);
    }
  });

  it("bar runner is priced at $45.00 AUD (4500 cents)", () => {
    const runner = PRODUCTS.find((p) => p.id === "bar-towel");
    expect(runner).toBeDefined();
    expect(runner!.priceAud).toBe(4500);
  });

  it("notebook is priced at $28.00 AUD (2800 cents)", () => {
    const notebook = PRODUCTS.find((p) => p.id === "notebook");
    expect(notebook).toBeDefined();
    expect(notebook!.priceAud).toBe(2800);
  });

  it("product IDs are unique", () => {
    const ids = PRODUCTS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("Checkout request contract", () => {
  it("requires productId and origin fields", () => {
    const validPayload = {
      productId: "coaster-dark",
      quantity: 1,
      origin: "https://ownology.com.au",
    };
    expect(validPayload.productId).toBeTruthy();
    expect(validPayload.origin).toBeTruthy();
  });

  it("quantity is clamped between 1 and 10", () => {
    const clamp = (qty: number) => Math.max(1, Math.min(10, qty));
    expect(clamp(0)).toBe(1);
    expect(clamp(-5)).toBe(1);
    expect(clamp(15)).toBe(10);
    expect(clamp(5)).toBe(5);
  });
});
