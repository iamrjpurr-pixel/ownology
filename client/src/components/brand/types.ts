export type Role = "owner" | "contractor";
export type BlendPart = { variety: string; pct: number; source: string };
export type Wine = {
  id: number;
  name: string;
  vintage: number | null;
  style: string;
  blend: BlendPart[];
  targets: Record<string, string | undefined>;
  regime: Record<string, string | undefined>;
  protocol: string;
  tastingNotes: string;
  updatedAt: number;
};
export type WineInput = Omit<Wine, "id" | "updatedAt">;
export type WineLog = {
  id: number;
  authorEmail: string;
  authorRole: Role;
  kind: string;
  note: string;
  readings: Record<string, string | undefined>;
  createdAt: number;
};
export type Member = { id: number; email: string; invitedAt: number; status: string };
export type Activity = { id: number; actorEmail: string; actorRole: Role; action: string; target: string; createdAt: number };
export type LogKind = "work" | "reading" | "note";

export const TARGET_LABELS: Record<string, string> = {
  alcohol: "Alcohol", ph: "pH", ta: "TA", rs: "RS", so2: "Free SO₂", va: "VA",
};
export const REGIME_LABELS: Record<string, string> = {
  yeast: "Yeast & inoculation",
  fermentTemp: "Ferment temperature",
  mlf: "Malolactic",
  oak: "Oak regime",
  additions: "Additions plan",
  finishing: "Fining & filtration",
  bottling: "Bottling",
};
export const READING_LABELS: Record<string, string> = {
  brix: "Baumé / Brix", ph: "pH", ta: "TA", so2: "Free SO₂", temp: "Temp",
};

export const fmtDate = (ms: number) =>
  new Date(ms).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

export const emptyWine = (): WineInput => ({
  name: "", vintage: new Date().getFullYear(), style: "",
  blend: [{ variety: "", pct: 100, source: "" }],
  targets: {}, regime: {}, protocol: "", tastingNotes: "",
});
