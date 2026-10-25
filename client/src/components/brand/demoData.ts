import type { Activity, Member, Wine, WineLog } from "./types";

export const DEMO_BRAND = "Saltbush Hill Wines";
export const DEMO_OWNER = { name: "Kate Morrow", email: "kate@saltbushhill.example", title: "Owner · B.Oenology" };
export const DEMO_CONTRACTOR = { name: "Dan Reyes", email: "dan@riverbendcrush.example", title: "Contract winemaker · Riverbend Crush Co." };

const day = 86_400_000;
const t0 = Date.UTC(2026, 3, 14, 8);

export const DEMO_WINES: Wine[] = [
  {
    id: 1, name: "Ridgeline Shiraz", vintage: 2026, style: "Cool-climate Shiraz, 20% whole bunch, medium body",
    blend: [
      { variety: "Shiraz", pct: 95, source: "Block 4, east slope" },
      { variety: "Viognier", pct: 5, source: "Block 2, co-fermented" },
    ],
    targets: { alcohol: "13.6%", ph: "3.55", ta: "6.2 g/L", rs: "<1 g/L", so2: "30 mg/L at bottling", va: "<0.5 g/L" },
    regime: {
      yeast: "Wild start 48 h, then inoculate with a Rhône-style strain at 20 g/hL if Baumé drops <0.5",
      fermentTemp: "Peak 28–30°C cap, never above 32°C",
      mlf: "Co-inoculate at 1/3 sugar depletion",
      oak: "11 months, 25% new French 500 L puncheons, tight grain",
      additions: "DAP only if YAN < 180 mg N/L. Tartaric to pH 3.55 at crush, max 1.5 g/L",
      finishing: "No fining unless trials justify it. Coarse pad only",
      bottling: "DO < 1 mg/L, screwcap, Saranex liner",
    },
    protocol: "Two pump-overs a day until 5 Bé, then one a day. Press at dryness. Do not extend maceration without my sign-off.\nSend me Baumé, temperature and a smell note every morning. Flag any H₂S immediately.",
    tastingNotes: "Black pepper and violet lifted by the Viognier. Fine, chalky tannin. Restraint over power.",
    updatedAt: t0,
  },
  {
    id: 2, name: "Quarry Chardonnay", vintage: 2026, style: "Barrel-fermented, mineral, partial MLF",
    blend: [{ variety: "Chardonnay", pct: 100, source: "Dijon 95 & 76, quarry block" }],
    targets: { alcohol: "12.8%", ph: "3.25", ta: "7.0 g/L", rs: "<1 g/L", so2: "35 mg/L" },
    regime: {
      yeast: "Cloudy juice, wild ferment in barrel",
      fermentTemp: "16–20°C cellar ambient",
      mlf: "Block at 30% with SO₂ once tasting supports it",
      oak: "30% new 228 L, light toast, bâtonnage fortnightly to June",
      finishing: "Bentonite to heat-stable (trial first)",
    },
    protocol: "Taste every barrel weekly. Any barrel showing reduction: rack and splash, then tell me which barrel.",
    tastingNotes: "Struck match, white peach, saline line. Keep the reduction just at the edge.",
    updatedAt: t0 - 2 * day,
  },
];

export const DEMO_LOGS: Record<number, WineLog[]> = {
  1: [
    { id: 11, authorEmail: DEMO_CONTRACTOR.email, authorRole: "contractor", kind: "reading", note: "Cap smells clean, dark fruit.", readings: { brix: "4.2 Bé", temp: "29°C", ph: "3.58" }, createdAt: t0 + 3 * day },
    { id: 12, authorEmail: DEMO_CONTRACTOR.email, authorRole: "contractor", kind: "work", note: "Pumped over twice, 15 min each. Added 20 g/hL DAP per spec (YAN 160).", readings: {}, createdAt: t0 + 2 * day },
    { id: 13, authorEmail: DEMO_OWNER.email, authorRole: "owner", kind: "note", note: "Hold press until dry. Taste with me Thursday.", readings: {}, createdAt: t0 + 2.5 * day },
  ],
  2: [
    { id: 21, authorEmail: DEMO_CONTRACTOR.email, authorRole: "contractor", kind: "work", note: "Bâtonnage, all 12 barrels. Barrel 7 slightly reductive, racked and splashed per protocol.", readings: {}, createdAt: t0 + day },
  ],
};

export const DEMO_MEMBERS: Member[] = [
  { id: 1, email: DEMO_CONTRACTOR.email, invitedAt: t0 - 30 * day, status: "active" },
  { id: 2, email: "cellarhand@riverbendcrush.example", invitedAt: t0 - 2 * day, status: "invited" },
];

export const DEMO_ACTIVITY: Activity[] = [
  { id: 1, actorEmail: DEMO_CONTRACTOR.email, actorRole: "contractor", action: "logged reading", target: "Ridgeline Shiraz", createdAt: t0 + 3 * day },
  { id: 2, actorEmail: DEMO_CONTRACTOR.email, actorRole: "contractor", action: "viewed", target: "Ridgeline Shiraz", createdAt: t0 + 3 * day - 600_000 },
  { id: 3, actorEmail: DEMO_CONTRACTOR.email, actorRole: "contractor", action: "blocked", target: "Export attempted", createdAt: t0 + 2 * day },
  { id: 4, actorEmail: DEMO_OWNER.email, actorRole: "owner", action: "edited", target: "Ridgeline Shiraz", createdAt: t0 + day },
  { id: 5, actorEmail: DEMO_OWNER.email, actorRole: "owner", action: "invited", target: "cellarhand@riverbendcrush.example", createdAt: t0 - 2 * day },
];

export const DEMO_TANKS = [
  { id: "T3", wine: "Ridgeline Shiraz", stage: "Primary ferment", reading: "4.2 Bé · 29°C", status: "watch" as const, note: "Cap near the top of spec (28–30°C). Dan is pumping over twice a day." },
  { id: "T4", wine: "Ridgeline Shiraz · whole bunch", stage: "Cold soak, day 2", reading: "12.8 Bé · 9°C", status: "ok" as const, note: "Holding cold until Kate's sign-off to warm up." },
  { id: "B1–12", wine: "Quarry Chardonnay", stage: "Barrel ferment", reading: "1.1 Bé · 18°C", status: "ok" as const, note: "On track. Bâtonnage done for all 12 barrels." },
  { id: "B7", wine: "Quarry Chardonnay", stage: "Barrel ferment", reading: "Slight reduction", status: "alert" as const, note: "Racked and splashed per Kate's protocol. Kate has been told." },
];
