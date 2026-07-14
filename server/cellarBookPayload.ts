/**
 * Cellar Book payload — single source of truth for the batch-equipment
 * traceability record. Consumed by:
 *   1. /api/compliance/cellar-book.pdf  (renders as branded PDF)
 *   2. /api/trpc/cellarBoard.getBatchBook{,ByToken} (returned as JSON to the
 *      live browser Batch Book Landing page — see /app/client/src/pages/BatchBook.tsx)
 *
 * Feb 2026, Batch Book Landing feature. Deliberately kept as plain data so
 * the PDF renderer, the React page, and any future JSON API consumers all
 * agree on the shape and semantics of the record.
 */
import { db } from "./db.js";
import * as schema from "../drizzle/schema.js";
import { and, asc, eq } from "drizzle-orm";

export type CellarBookUse = {
  id: number;
  usedAt: number;
  phase: string;
  direction: string;
  equipmentId: number;
  equipmentName: string;
  equipmentType: string | null;
  equipmentMaterial: string | null;
  sanitiseOkAtUse: number;
  sanitiseAgeHours: number | null;
  notes: string | null;
};

export type CellarBookPayload = {
  winery: {
    name: string;
    region: string | null;
    brandColor: string;
    logoUrl: string | null;
  };
  batch: {
    id: number;
    batchId: string;
    vintage: number;
    variety: string;
    gi: string | null;
    growerDetails: string | null;
    tankName: string | null;
    quantityValue: string | null;
    quantityUnit: string | null;
    volumeLitres: number | null;
    receivedAt: number | null;
  };
  uses: CellarBookUse[];
  summary: {
    totalUses: number;
    uniqueVessels: number;
    sanitisedAtUseCount: number;
    breachCount: number;
  };
  generatedAt: number;
};

const BRAND_HEX_RE = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Load the full Cellar Book payload for a batch, scoped to a specific
 * owner user. Returns null if the batch doesn't exist or belongs to
 * someone else — callers should 404.
 */
export async function loadCellarBookPayload(
  batchId: number,
  ownerUserId: number
): Promise<CellarBookPayload | null> {
  // Owner + winery header — batch is scoped to the owner so tenancy is preserved.
  const [owner] = await db
    .select({ id: schema.users.id, wineryId: schema.users.wineryId, name: schema.users.name })
    .from(schema.users)
    .where(eq(schema.users.id, ownerUserId))
    .limit(1);
  if (!owner) return null;

  const winery = owner.wineryId
    ? await db.query.wineries.findFirst({ where: eq(schema.wineries.id, owner.wineryId) })
    : null;

  const batch = await db.query.wineBatches.findFirst({
    where: and(eq(schema.wineBatches.id, batchId), eq(schema.wineBatches.userId, owner.id)),
  });
  if (!batch) return null;

  const uses = await db.query.batchEquipmentUses.findMany({
    where: and(
      eq(schema.batchEquipmentUses.batchId, batchId),
      eq(schema.batchEquipmentUses.userId, owner.id)
    ),
    orderBy: [asc(schema.batchEquipmentUses.usedAt)],
  });

  // Pull owner's cellar equipment once for the metadata join. Cheaper than
  // one query per use and the row-count is small (dozens at most).
  const equipmentRows = await db.query.cellarEquipment.findMany({
    where: eq(schema.cellarEquipment.userId, owner.id),
  });
  const eqById = new Map<number, typeof equipmentRows[number]>();
  for (const e of equipmentRows) eqById.set(e.id, e);

  const useRows: CellarBookUse[] = uses.map((u) => {
    const eq = eqById.get(u.equipmentId);
    return {
      id: u.id,
      usedAt: u.usedAt,
      phase: u.phase,
      direction: u.direction,
      equipmentId: u.equipmentId,
      equipmentName: u.equipmentName,
      equipmentType: eq?.equipmentType ?? null,
      equipmentMaterial: eq?.material ?? null,
      sanitiseOkAtUse: u.sanitiseOkAtUse,
      sanitiseAgeHours: u.sanitiseAgeHours,
      notes: u.notes,
    };
  });

  const sanitisedAtUseCount = useRows.filter((u) => u.sanitiseOkAtUse === 1).length;
  const breachCount = useRows.filter(
    (u) => u.sanitiseOkAtUse === 0 && (u.direction === "in" || u.direction === "pass")
  ).length;
  const uniqueVessels = new Set(useRows.map((u) => u.equipmentId)).size;

  const brandColor = winery?.brandColor && BRAND_HEX_RE.test(winery.brandColor)
    ? winery.brandColor
    : "#78350f";

  return {
    winery: {
      name: winery?.name ?? owner.name ?? "Ownology",
      region: winery?.region ?? null,
      brandColor,
      logoUrl: winery?.logoUrl ?? null,
    },
    batch: {
      id: batch.id,
      batchId: batch.batchId,
      vintage: batch.vintage,
      variety: batch.variety,
      gi: batch.gi,
      growerDetails: batch.growerDetails,
      tankName: batch.tankName,
      quantityValue: batch.quantityValue,
      quantityUnit: batch.quantityUnit,
      volumeLitres: batch.volumeLitres,
      receivedAt: batch.receivedAt,
    },
    uses: useRows,
    summary: {
      totalUses: useRows.length,
      uniqueVessels,
      sanitisedAtUseCount,
      breachCount,
    },
    generatedAt: Date.now(),
  };
}

/**
 * Resolve a share token → CellarBookPayload. Returns the payload plus
 * enough of the token row for the caller to render token-specific UI
 * (expiry countdown, revoked banner). Returns { status: "not_found" |
 * "revoked" | "expired" | "ok" }.
 */
export async function loadCellarBookByToken(token: string): Promise<
  | { status: "not_found" | "revoked" | "expired" }
  | {
      status: "ok";
      payload: CellarBookPayload;
      token: {
        id: number;
        label: string | null;
        expiresAt: number;
        viewCount: number;
      };
    }
> {
  const [row] = await db
    .select()
    .from(schema.cellarBookShareTokens)
    .where(eq(schema.cellarBookShareTokens.token, token))
    .limit(1);
  if (!row) return { status: "not_found" };
  if (row.revoked === 1) return { status: "revoked" };
  if (row.expiresAt < Date.now()) return { status: "expired" };

  const payload = await loadCellarBookPayload(row.batchId, row.userId);
  if (!payload) return { status: "not_found" };

  return {
    status: "ok",
    payload,
    token: {
      id: row.id,
      label: row.label,
      expiresAt: row.expiresAt,
      viewCount: row.viewCount,
    },
  };
}
