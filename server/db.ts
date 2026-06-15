import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";
import { desc, eq, and, gte } from "drizzle-orm";

// ─── Connection pool ──────────────────────────────────────────────────────────

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  waitForConnections: true,
  connectionLimit: 10,
});

export const db = drizzle(pool, { schema, mode: "default" });

// ─── Users ────────────────────────────────────────────────────────────────────

export async function upsertUser(openId: string, name?: string, email?: string) {
  const existing = await db.query.users.findFirst({
    where: eq(schema.users.openId, openId),
  });
  if (existing) return existing;
  await db.insert(schema.users).values({
    openId,
    name: name ?? null,
    email: email ?? null,
    createdAt: Date.now(),
  });
  return db.query.users.findFirst({ where: eq(schema.users.openId, openId) });
}

export async function getUserByOpenId(openId: string) {
  return db.query.users.findFirst({ where: eq(schema.users.openId, openId) });
}

// ─── Campaign Metrics ─────────────────────────────────────────────────────────

export async function getCampaignMetricsHistory(limit = 26) {
  return db.query.campaignMetricsSnapshots.findMany({
    orderBy: [desc(schema.campaignMetricsSnapshots.snapshotAt)],
    limit,
  });
}

export async function getLatestCampaignMetrics() {
  return db.query.campaignMetricsSnapshots.findFirst({
    orderBy: [desc(schema.campaignMetricsSnapshots.snapshotAt)],
  });
}

export async function upsertCampaignMetricsSnapshot(data: {
  weekLabel: string;
  snapshotAt: number;
  waitlistCount?: number;
  emailOpenRate?: number;
  emailClickRate?: number;
  organicSessions?: number;
  topKeywordRank?: number;
  foundingMemberCount?: number;
  mrr?: number;
  merchOrders?: number;
  merchRevenue?: number;
  complianceQueries?: number;
  notes?: string;
}) {
  const existing = await db.query.campaignMetricsSnapshots.findFirst({
    where: eq(schema.campaignMetricsSnapshots.weekLabel, data.weekLabel),
  });
  if (existing) {
    await db
      .update(schema.campaignMetricsSnapshots)
      .set({ ...data })
      .where(eq(schema.campaignMetricsSnapshots.weekLabel, data.weekLabel));
  } else {
    await db.insert(schema.campaignMetricsSnapshots).values({
      weekLabel: data.weekLabel,
      snapshotAt: data.snapshotAt,
      waitlistCount: data.waitlistCount ?? 0,
      emailOpenRate: data.emailOpenRate ?? 0,
      emailClickRate: data.emailClickRate ?? 0,
      organicSessions: data.organicSessions ?? 0,
      topKeywordRank: data.topKeywordRank ?? 0,
      foundingMemberCount: data.foundingMemberCount ?? 0,
      mrr: data.mrr ?? 0,
      merchOrders: data.merchOrders ?? 0,
      merchRevenue: data.merchRevenue ?? 0,
      complianceQueries: data.complianceQueries ?? 0,
      notes: data.notes ?? null,
    });
  }
}

// ─── Founding Members ─────────────────────────────────────────────────────────

export async function getFoundingMemberCount() {
  const rows = await db.query.foundingMembers.findMany();
  return rows.length;
}

export async function listFoundingMembers() {
  return db.query.foundingMembers.findMany({
    orderBy: [desc(schema.foundingMembers.joinedAt)],
  });
}

export async function addFoundingMember(data: {
  email: string;
  name?: string;
  wineryName?: string;
  state?: string;
  tier?: "cellar" | "press" | "cellar_master";
  stripeCustomerId?: string;
  notes?: string;
}) {
  await db.insert(schema.foundingMembers).values({
    email: data.email,
    name: data.name ?? null,
    wineryName: data.wineryName ?? null,
    state: data.state ?? null,
    tier: data.tier ?? "cellar",
    stripeCustomerId: data.stripeCustomerId ?? null,
    joinedAt: Date.now(),
    notes: data.notes ?? null,
  });
}

// ─── Vintage Log ──────────────────────────────────────────────────────────────

export type EventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "pre_harvest_sample" | "bottling_run" | "weather_event" | "sanitation" | "other";

export async function addVintageLogEntry(data: {
  userId: number;
  tankName: string;
  variety: string;
  eventType: EventType;
  detailsJson: string;
  noteText?: string;
  tagsJson: string;
  entryAt?: number;
  importSource?: string;
  importBatchId?: string;
}) {
  const now = Date.now();
  const result = await db.insert(schema.vintageLogEntries).values({
    userId: data.userId,
    tankName: data.tankName.trim(),
    variety: data.variety.trim(),
    eventType: data.eventType,
    detailsJson: data.detailsJson,
    noteText: data.noteText ?? null,
    tagsJson: data.tagsJson,
    entryAt: data.entryAt ?? now,
    createdAt: now,
    importSource: data.importSource ?? null,
    importBatchId: data.importBatchId ?? null,
  });
  return result;
}

export async function listVintageLogEntries(userId: number, limit = 50) {
  return db.query.vintageLogEntries.findMany({
    where: eq(schema.vintageLogEntries.userId, userId),
    orderBy: [desc(schema.vintageLogEntries.entryAt)],
    limit,
  });
}

export async function getUsedTankNames(userId: number): Promise<string[]> {
  const rows = await db.query.vintageLogEntries.findMany({
    where: eq(schema.vintageLogEntries.userId, userId),
    columns: { tankName: true },
  });
  // Return unique tank names sorted alphabetically
  return Array.from(new Set(rows.map((r) => r.tankName))).sort();
}

export async function deleteVintageLogEntry(id: number, userId: number) {
  await db
    .delete(schema.vintageLogEntries)
    .where(
      and(
        eq(schema.vintageLogEntries.id, id),
        eq(schema.vintageLogEntries.userId, userId)
      )
    );
}

// ─── Tank Reminders ──────────────────────────────────────────────────────

export type ReminderEventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "any";

export async function upsertTankReminder(data: {
  userId: number;
  tankName: string;
  eventType: ReminderEventType;
  thresholdHours: number;
  isActive: boolean;
}) {
  const existing = await db.query.tankReminders.findFirst({
    where: and(
      eq(schema.tankReminders.userId, data.userId),
      eq(schema.tankReminders.tankName, data.tankName),
      eq(schema.tankReminders.eventType, data.eventType)
    ),
  });
  const now = Date.now();
  if (existing) {
    await db
      .update(schema.tankReminders)
      .set({
        thresholdHours: data.thresholdHours,
        isActive: data.isActive,
        updatedAt: now,
      })
      .where(eq(schema.tankReminders.id, existing.id));
    return existing.id;
  } else {
    const result = await db.insert(schema.tankReminders).values({
      userId: data.userId,
      tankName: data.tankName,
      eventType: data.eventType,
      thresholdHours: data.thresholdHours,
      isActive: data.isActive,
      createdAt: now,
      updatedAt: now,
    });
    return (result as unknown as { insertId: number }).insertId;
  }
}

export async function listTankReminders(userId: number) {
  return db.query.tankReminders.findMany({
    where: eq(schema.tankReminders.userId, userId),
    orderBy: [desc(schema.tankReminders.updatedAt)],
  });
}

export async function deleteTankReminder(id: number, userId: number) {
  await db
    .delete(schema.tankReminders)
    .where(
      and(
        eq(schema.tankReminders.id, id),
        eq(schema.tankReminders.userId, userId)
      )
    );
}

export async function getAllActiveReminders() {
  return db.query.tankReminders.findMany({
    where: eq(schema.tankReminders.isActive, true),
  });
}

/**
 * Returns the most recent vintage log entry for a given user+tank+eventType.
 * If eventType is 'any', returns the most recent entry regardless of type.
 */
export async function getLastEntryForTank(
  userId: number,
  tankName: string,
  eventType: ReminderEventType
) {
  if (eventType === "any") {
    return db.query.vintageLogEntries.findFirst({
      where: and(
        eq(schema.vintageLogEntries.userId, userId),
        eq(schema.vintageLogEntries.tankName, tankName)
      ),
      orderBy: [desc(schema.vintageLogEntries.entryAt)],
    });
  }
  return db.query.vintageLogEntries.findFirst({
    where: and(
      eq(schema.vintageLogEntries.userId, userId),
      eq(schema.vintageLogEntries.tankName, tankName),
      eq(schema.vintageLogEntries.eventType, eventType as EventType)
    ),
    orderBy: [desc(schema.vintageLogEntries.entryAt)],
  });
}

// ─── Leads (CRM) ─────────────────────────────────────────────────────────────

/**
 * Add a new lead. If the email already exists for the same source, returns the
 * existing lead id without creating a duplicate. If the email exists from a
 * different source, creates a new row (same person, different touch-point).
 */
export async function addLead(data: {
  email: string;
  source: string;
  tags?: string[];
  name?: string;
  wineryName?: string;
  phone?: string;
}) {
  const now = Date.now();
  // Check for exact email+source duplicate
  const existing = await db.query.leads.findFirst({
    where: and(
      eq(schema.leads.email, data.email.toLowerCase().trim()),
      eq(schema.leads.source, data.source)
    ),
  });
  if (existing) return existing.id;

  const result = await db.insert(schema.leads).values({
    email: data.email.toLowerCase().trim(),
    source: data.source,
    tagsJson: JSON.stringify(data.tags ?? []),
    name: data.name ?? null,
    wineryName: data.wineryName ?? null,
    phone: data.phone ?? null,
    notes: null,
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function listLeads(limit = 500) {
  return db.query.leads.findMany({
    orderBy: [desc(schema.leads.createdAt)],
    limit,
  });
}

export async function updateLeadNotes(id: number, notes: string) {
  await db
    .update(schema.leads)
    .set({ notes, updatedAt: Date.now() })
    .where(eq(schema.leads.id, id));
}

/**
 * Upsert a lead by email — if the email already exists (any source), update the
 * fields that are provided; otherwise insert a new row. Returns the lead id.
 * Used by the Stripe webhook and external API to avoid duplicates.
 */
export async function upsertLeadByEmail(data: {
  email: string;
  source: string;
  tags?: string[];
  name?: string;
  wineryName?: string;
  phone?: string;
  notes?: string;
  stripeCustomerId?: string;
  stripePaid?: boolean;
}) {
  const now = Date.now();
  const existing = await db.query.leads.findFirst({
    where: eq(schema.leads.email, data.email.toLowerCase().trim()),
  });
  if (existing) {
    // Update fields that are newly provided
    await db
      .update(schema.leads)
      .set({
        name: data.name ?? existing.name,
        wineryName: data.wineryName ?? existing.wineryName,
        phone: data.phone ?? existing.phone,
        notes: data.notes ?? existing.notes,
        stripeCustomerId: data.stripeCustomerId ?? existing.stripeCustomerId,
        stripePaid: data.stripePaid !== undefined ? data.stripePaid : existing.stripePaid,
        updatedAt: now,
      })
      .where(eq(schema.leads.id, existing.id));
    return existing.id;
  }
  const result = await db.insert(schema.leads).values({
    email: data.email.toLowerCase().trim(),
    source: data.source,
    tagsJson: JSON.stringify(data.tags ?? []),
    name: data.name ?? null,
    wineryName: data.wineryName ?? null,
    phone: data.phone ?? null,
    notes: data.notes ?? null,
    stripeCustomerId: data.stripeCustomerId ?? null,
    stripePaid: data.stripePaid ?? false,
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function updateLead(id: number, data: {
  name?: string;
  wineryName?: string;
  phone?: string;
  notes?: string;
  source?: string;
  tagsJson?: string;
  stripeCustomerId?: string;
  stripePaid?: boolean;
}) {
  await db
    .update(schema.leads)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(schema.leads.id, id));
}

export async function deleteLead(id: number) {
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
}

// ─── Wine Batches ─────────────────────────────────────────────────────────────

export type WineBatchPhaseNotes = {
  receival?: string;
  fermentation?: string;
  postFerment?: string;
  stabilising?: string;
  bottling?: string;
};

export async function createWineBatch(data: {
  userId: number;
  batchId: string;
  vintage: number;
  variety: string;
  gi: string;
  growerDetails?: string;
  receivedAt?: number;
  quantityValue?: string;
  quantityUnit?: "kg" | "t" | "L";
  tankName?: string;
  volumeLitres?: number;
  costPerLitre?: number;
}) {
  const now = Date.now();
  const result = await db.insert(schema.wineBatches).values({
    userId: data.userId,
    batchId: data.batchId,
    vintage: data.vintage,
    variety: data.variety,
    gi: data.gi,
    growerDetails: data.growerDetails ?? null,
    receivedAt: data.receivedAt ?? null,
    quantityValue: data.quantityValue ?? null,
    quantityUnit: data.quantityUnit ?? "kg",
    tankName: data.tankName ?? null,
    volumeLitres: data.volumeLitres ?? null,
    // DR-04: initialise currentVolumeLitres to match volumeLitres at creation
    currentVolumeLitres: data.volumeLitres ?? null,
    costPerLitre: data.costPerLitre ?? null,
    notesJson: "{}",
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function listWineBatches(userId: number) {
  return db.query.wineBatches.findMany({
    where: eq(schema.wineBatches.userId, userId),
    orderBy: [desc(schema.wineBatches.vintage), desc(schema.wineBatches.createdAt)],
  });
}

export async function getWineBatch(id: number, userId: number) {
  return db.query.wineBatches.findFirst({
    where: and(eq(schema.wineBatches.id, id), eq(schema.wineBatches.userId, userId)),
  });
}

export async function updateWineBatchNotes(id: number, userId: number, notesJson: string) {
  await db
    .update(schema.wineBatches)
    .set({ notesJson, updatedAt: Date.now() })
    .where(and(eq(schema.wineBatches.id, id), eq(schema.wineBatches.userId, userId)));
}

export async function updateWineBatch(id: number, userId: number, data: {
  batchId?: string;
  vintage?: number;
  variety?: string;
  gi?: string;
  growerDetails?: string;
  receivedAt?: number;
  quantityValue?: string;
  quantityUnit?: "kg" | "t" | "L";
  tankName?: string;
  volumeLitres?: number;
  currentVolumeLitres?: number;
  costPerLitre?: number;
}) {
  await db
    .update(schema.wineBatches)
    .set({ ...data, updatedAt: Date.now() })
    .where(and(eq(schema.wineBatches.id, id), eq(schema.wineBatches.userId, userId)));
}

/**
 * DR-04: Auto-update currentVolumeLitres when a Racking event is logged.
 * Finds the batch by tankName (source or destination) and adjusts volume.
 * - source tank: decrement by volumeL (wine leaves)
 * - destination tank: increment by volumeL (wine arrives)
 */
export async function updateTankVolumeOnRacking(
  userId: number,
  sourceTank: string,
  destTank: string,
  volumeL: number
) {
  const now = Date.now();
  // Decrement source tank batch volume
  const sourceBatch = await db.query.wineBatches.findFirst({
    where: and(
      eq(schema.wineBatches.userId, userId),
      eq(schema.wineBatches.tankName, sourceTank)
    ),
    orderBy: [desc(schema.wineBatches.createdAt)],
  });
  if (sourceBatch) {
    const newVol = Math.max(0, (sourceBatch.currentVolumeLitres ?? sourceBatch.volumeLitres ?? 0) - volumeL);
    await db
      .update(schema.wineBatches)
      .set({ currentVolumeLitres: newVol, updatedAt: now })
      .where(eq(schema.wineBatches.id, sourceBatch.id));
  }
  // Increment destination tank batch volume (if different tank)
  if (destTank && destTank !== sourceTank) {
    const destBatch = await db.query.wineBatches.findFirst({
      where: and(
        eq(schema.wineBatches.userId, userId),
        eq(schema.wineBatches.tankName, destTank)
      ),
      orderBy: [desc(schema.wineBatches.createdAt)],
    });
    if (destBatch) {
      const newVol = (destBatch.currentVolumeLitres ?? destBatch.volumeLitres ?? 0) + volumeL;
      await db
        .update(schema.wineBatches)
        .set({ currentVolumeLitres: newVol, updatedAt: now })
        .where(eq(schema.wineBatches.id, destBatch.id));
    }
  }
}

export async function deleteWineBatch(id: number, userId: number) {
  await db.delete(schema.wineBatches).where(
    and(eq(schema.wineBatches.id, id), eq(schema.wineBatches.userId, userId))
  );
}

// ─── Cellar Equipment Register ────────────────────────────────────────────────

export type EquipmentType =
  | "fermentation_tank"
  | "barrel"
  | "press"
  | "pump"
  | "sorting_table"
  | "destemmer"
  | "cold_room"
  | "hose"
  | "other";

export type EquipmentMaterial =
  | "stainless"
  | "wood"
  | "concrete"
  | "fibreglass"
  | "other";

export async function listCellarEquipment(userId: number) {
  return db.query.cellarEquipment.findMany({
    where: eq(schema.cellarEquipment.userId, userId),
    orderBy: [desc(schema.cellarEquipment.createdAt)],
  });
}

export async function addCellarEquipment(data: {
  userId: number;
  name: string;
  equipmentType: EquipmentType;
  material: EquipmentMaterial;
  capacityL?: number;
  quantity?: number;
  notes?: string;
}) {
  const now = Date.now();
  const result = await db.insert(schema.cellarEquipment).values({
    userId: data.userId,
    name: data.name,
    equipmentType: data.equipmentType,
    material: data.material,
    capacityL: data.capacityL ?? null,
    quantity: data.quantity ?? 1,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function updateCellarEquipment(
  id: number,
  userId: number,
  data: {
    name?: string;
    equipmentType?: EquipmentType;
    material?: EquipmentMaterial;
    capacityL?: number | null;
    quantity?: number;
    notes?: string | null;
  }
) {
  await db
    .update(schema.cellarEquipment)
    .set({ ...data, updatedAt: Date.now() })
    .where(
      and(
        eq(schema.cellarEquipment.id, id),
        eq(schema.cellarEquipment.userId, userId)
      )
    );
}

export async function deleteCellarEquipment(id: number, userId: number) {
  await db
    .delete(schema.cellarEquipment)
    .where(
      and(
        eq(schema.cellarEquipment.id, id),
        eq(schema.cellarEquipment.userId, userId)
      )
    );
}

// ─── Cellar Tasks ─────────────────────────────────────────────────────────────

export type TaskType = "clean" | "sanitise" | "inspect" | "maintain" | "fault_log" | "other";

export async function listCellarTasks(userId: number) {
  return db.query.cellarTasks.findMany({
    where: eq(schema.cellarTasks.userId, userId),
    orderBy: [desc(schema.cellarTasks.createdAt)],
  });
}

export async function addCellarTask(data: {
  userId: number;
  equipmentId?: number;
  equipmentName: string;
  taskType: TaskType;
  title: string;
  methodNotes?: string;
  frequency?: string;
  dueAt?: number;
  aiGenerated?: boolean;
  vesselId?: string;
  vesselType?: "tank" | "barrel" | "other";
}) {
  const now = Date.now();
  const result = await db.insert(schema.cellarTasks).values({
    userId: data.userId,
    equipmentId: data.equipmentId ?? null,
    equipmentName: data.equipmentName,
    taskType: data.taskType,
    title: data.title,
    methodNotes: data.methodNotes ?? null,
    frequency: data.frequency ?? "After use",
    dueAt: data.dueAt ?? null,
    completedAt: null,
    completedBy: null,
    aiGenerated: data.aiGenerated ? 1 : 0,
    vesselId: data.vesselId ?? null,
    vesselType: data.vesselType ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function completeCellarTask(
  id: number,
  userId: number,
  completedBy: string
) {
  const now = Date.now();
  await db
    .update(schema.cellarTasks)
    .set({ completedAt: now, completedBy, updatedAt: now })
    .where(
      and(
        eq(schema.cellarTasks.id, id),
        eq(schema.cellarTasks.userId, userId)
      )
    );
}

export async function uncompleteCellarTask(id: number, userId: number) {
  const now = Date.now();
  await db
    .update(schema.cellarTasks)
    .set({ completedAt: null, completedBy: null, updatedAt: now })
    .where(
      and(
        eq(schema.cellarTasks.id, id),
        eq(schema.cellarTasks.userId, userId)
      )
    );
}

export async function deleteCellarTask(id: number, userId: number) {
  await db
    .delete(schema.cellarTasks)
    .where(
      and(
        eq(schema.cellarTasks.id, id),
        eq(schema.cellarTasks.userId, userId)
      )
    );
}

export async function deleteTasksByEquipment(
  equipmentId: number,
  userId: number
) {
  await db
    .delete(schema.cellarTasks)
    .where(
      and(
        eq(schema.cellarTasks.equipmentId, equipmentId),
        eq(schema.cellarTasks.userId, userId)
      )
    );
}

// ─── Barrels (DR-08) ──────────────────────────────────────────────────────────

type OakType = "French" | "American" | "Hungarian" | "Slavonian" | "Other";
type BarrelFormat =
  | "Barrique (225L)"
  | "Hogshead (300L)"
  | "Puncheon (500L)"
  | "Foudre (>500L)"
  | "Other";

export async function listBarrels(userId: number) {
  return db.query.barrels.findMany({
    where: eq(schema.barrels.userId, userId),
    orderBy: [desc(schema.barrels.createdAt)],
  });
}

export async function createBarrel(input: {
  userId: number;
  barrelId: string;
  oakType: OakType;
  format: BarrelFormat;
  ageYears: number;
  fillDate?: number;
  wineLot?: string;
  notes?: string;
}) {
  const now = Date.now();
  const [result] = await db.insert(schema.barrels).values({
    userId: input.userId,
    barrelId: input.barrelId,
    oakType: input.oakType,
    format: input.format,
    ageYears: input.ageYears,
    fillDate: input.fillDate ?? null,
    wineLot: input.wineLot ?? null,
    notes: input.notes ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
  return (result as { insertId: number }).insertId;
}

export async function updateBarrel(
  id: number,
  userId: number,
  input: Partial<{
    barrelId: string;
    oakType: OakType;
    format: BarrelFormat;
    ageYears: number;
    fillDate: number | null;
    lastToppedDate: number | null;
    wineLot: string | null;
    notes: string | null;
    isActive: boolean;
  }>
) {
  await db
    .update(schema.barrels)
    .set({ ...input, updatedAt: Date.now() })
    .where(and(eq(schema.barrels.id, id), eq(schema.barrels.userId, userId)));
}

export async function deleteBarrel(id: number, userId: number) {
  await db
    .delete(schema.barrels)
    .where(and(eq(schema.barrels.id, id), eq(schema.barrels.userId, userId)));
}

// ─── Packaging Inventory (DR-13) ─────────────────────────────────────────────

export type PackagingCategory = "bottle" | "label" | "capsule" | "cork" | "box" | "other";

export async function listPackagingInventory(userId: number) {
  return db.query.packagingInventory.findMany({
    where: eq(schema.packagingInventory.userId, userId),
    orderBy: [desc(schema.packagingInventory.category)],
  });
}

export async function addPackagingItem(data: {
  userId: number;
  itemName: string;
  category: PackagingCategory;
  quantityOnHand: number;
  reorderLevel: number;
  unit: string;
  notes?: string;
}) {
  const now = Date.now();
  const result = await db.insert(schema.packagingInventory).values({
    userId: data.userId,
    itemName: data.itemName,
    category: data.category,
    quantityOnHand: data.quantityOnHand,
    reorderLevel: data.reorderLevel,
    unit: data.unit,
    notes: data.notes ?? null,
    createdAt: now,
    updatedAt: now,
  });
  return (result as unknown as { insertId: number }).insertId;
}

export async function updatePackagingItem(
  id: number,
  userId: number,
  input: Partial<{
    itemName: string;
    category: PackagingCategory;
    quantityOnHand: number;
    reorderLevel: number;
    unit: string;
    notes: string | null;
  }>
) {
  await db
    .update(schema.packagingInventory)
    .set({ ...input, updatedAt: Date.now() })
    .where(and(eq(schema.packagingInventory.id, id), eq(schema.packagingInventory.userId, userId)));
}

export async function deletePackagingItem(id: number, userId: number) {
  await db
    .delete(schema.packagingInventory)
    .where(and(eq(schema.packagingInventory.id, id), eq(schema.packagingInventory.userId, userId)));
}

// ─── Vineyard Blocks (DR-06) ──────────────────────────────────────────────────

export async function listVineyardBlocks(userId: number) {
  return db.query.vineyardBlocks.findMany({
    where: eq(schema.vineyardBlocks.userId, userId),
    orderBy: [schema.vineyardBlocks.blockName],
  });
}

export async function createVineyardBlock(
  userId: number,
  data: {
    blockName: string;
    variety: string;
    areaHa?: number | null;
    plantingYear?: number | null;
    rootstock?: string | null;
    trainingSystem?: "VSP" | "Scott Henry" | "Smart-Dyson" | "Pergola" | "Bush Vine" | "Other";
    soilType?: string | null;
    aspect?: string | null;
    notes?: string | null;
  }
) {
  const now = Date.now();
  await db.insert(schema.vineyardBlocks).values({
    userId,
    blockName: data.blockName,
    variety: data.variety,
    areaHa: data.areaHa ?? null,
    plantingYear: data.plantingYear ?? null,
    rootstock: data.rootstock ?? null,
    trainingSystem: data.trainingSystem ?? "VSP",
    soilType: data.soilType ?? null,
    aspect: data.aspect ?? null,
    notes: data.notes ?? null,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  });
}

export async function updateVineyardBlock(
  id: number,
  userId: number,
  data: Partial<{
    blockName: string;
    variety: string;
    areaHa: number | null;
    plantingYear: number | null;
    rootstock: string | null;
    trainingSystem: "VSP" | "Scott Henry" | "Smart-Dyson" | "Pergola" | "Bush Vine" | "Other";
    soilType: string | null;
    aspect: string | null;
    notes: string | null;
    isActive: boolean;
  }>
) {
  await db
    .update(schema.vineyardBlocks)
    .set({ ...data, updatedAt: Date.now() })
    .where(and(eq(schema.vineyardBlocks.id, id), eq(schema.vineyardBlocks.userId, userId)));
}

export async function deleteVineyardBlock(id: number, userId: number) {
  await db
    .delete(schema.vineyardBlocks)
    .where(and(eq(schema.vineyardBlocks.id, id), eq(schema.vineyardBlocks.userId, userId)));
}

export async function listVineyardObservations(userId: number, blockId?: number, vintageYear?: number) {
  const conditions: ReturnType<typeof eq>[] = [eq(schema.vineyardObservations.userId, userId)];
  if (blockId !== undefined) conditions.push(eq(schema.vineyardObservations.blockId, blockId));
  if (vintageYear !== undefined) conditions.push(eq(schema.vineyardObservations.vintageYear, vintageYear));
  return db.query.vineyardObservations.findMany({
    where: and(...conditions),
    orderBy: [desc(schema.vineyardObservations.observedAt)],
  });
}

export async function createVineyardObservation(
  userId: number,
  data: {
    blockId: number;
    observationType: "budburst" | "flowering" | "veraison" | "harvest_date" | "spray_application" | "irrigation" | "canopy_management" | "disease_scouting" | "pest_scouting" | "disease_pest_event" | "yield_estimate" | "other";
    observedAt: number;
    vintageYear: number;
    value?: number | null;
    unit?: string | null;
    notes?: string | null;
  }
) {
  await db.insert(schema.vineyardObservations).values({
    userId,
    blockId: data.blockId,
    observationType: data.observationType,
    observedAt: data.observedAt,
    vintageYear: data.vintageYear,
    value: data.value ?? null,
    unit: data.unit ?? null,
    notes: data.notes ?? null,
    createdAt: Date.now(),
  });
}

export async function deleteVineyardObservation(id: number, userId: number) {
  await db
    .delete(schema.vineyardObservations)
    .where(and(eq(schema.vineyardObservations.id, id), eq(schema.vineyardObservations.userId, userId)));
}
