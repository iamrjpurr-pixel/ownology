/**
 * Ownology Merch Product Catalogue
 * Prices are in AUD cents (Stripe uses smallest currency unit).
 * stripePriceId is populated after creating products in Stripe Dashboard.
 * For now we use price_data in checkout sessions (no pre-created Stripe products needed).
 */

export interface MerchProduct {
  id: string;
  name: string;
  description: string;
  priceAud: number; // cents
  imageUrl: string;
  category: "coaster" | "bar-towel" | "notebook" | "sticker";
  specs: string;
  inStock: boolean;
}

export const MERCH_PRODUCTS: MerchProduct[] = [
  {
    id: "coaster-dark",
    name: "Founding Member Coaster — Dark",
    description:
      "Natural cork coaster, 90mm diameter. Deep warm-black background with the Ownology Founding Member seal in amber gold. Printed top surface, natural cork edge. A cellar door essential.",
    priceAud: 1800, // $18.00 AUD
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
    priceAud: 1800, // $18.00 AUD
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
      "Natural linen bar runner, 500mm × 250mm. The Founding Member seal on the left, OWNOLOGY centred in large small-caps, CELLAR INTELLIGENCE on the right. Double-rule border. Premium cellar door presentation.",
    priceAud: 4500, // $45.00 AUD
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
    priceAud: 2800, // $28.00 AUD
    imageUrl:
      "https://d2xsxph8kpxj0f.cloudfront.net/310519663548872701/kjXA9MRaPtPLGHog5yynHZ/notebook-cover-Rtj6XWkC484DVSGy8mPryH.png",
    category: "notebook",
    specs: "A6 (105mm × 148mm) · Leatherette cover · 96 ruled pages",
    inStock: true,
  },
];

export function getProductById(id: string): MerchProduct | undefined {
  return MERCH_PRODUCTS.find((p) => p.id === id);
}
