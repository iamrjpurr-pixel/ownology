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

export type EventType = "addition" | "measurement" | "racking" | "inoculation" | "observation" | "other";

export async function addVintageLogEntry(data: {
  userId: number;
  tankName: string;
  variety: string;
  eventType: EventType;
  detailsJson: string;
  noteText?: string;
  tagsJson: string;
  entryAt?: number;
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

export async function updateLead(id: number, data: {
  name?: string;
  wineryName?: string;
  notes?: string;
  source?: string;
  tagsJson?: string;
}) {
  await db
    .update(schema.leads)
    .set({ ...data, updatedAt: Date.now() })
    .where(eq(schema.leads.id, id));
}

export async function deleteLead(id: number) {
  await db.delete(schema.leads).where(eq(schema.leads.id, id));
}
