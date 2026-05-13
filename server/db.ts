import { drizzle } from "drizzle-orm/mysql2";
import mysql from "mysql2/promise";
import * as schema from "../drizzle/schema.js";
import { desc, eq } from "drizzle-orm";

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
