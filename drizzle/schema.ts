import { mysqlTable, varchar, int, bigint, text, mysqlEnum, index } from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }),
  role: mysqlEnum("role", ["admin", "user"]).notNull().default("user"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Campaign Metrics Snapshots ───────────────────────────────────────────────
// One row per weekly snapshot. All counts are cumulative totals at snapshot time.
// The weekly Heartbeat cron inserts a new row every Monday 09:00 AEST (23:00 UTC Sun).

export const campaignMetricsSnapshots = mysqlTable(
  "campaign_metrics_snapshots",
  {
    id: int("id").autoincrement().primaryKey(),
    // ISO week label e.g. "2026-W20" — used as the x-axis label in charts
    weekLabel: varchar("week_label", { length: 10 }).notNull().unique(),
    // Snapshot timestamp (UTC ms)
    snapshotAt: bigint("snapshot_at", { mode: "number" }).notNull(),

    // ── Waitlist / email ──────────────────────────────────────────────────────
    waitlistCount: int("waitlist_count").notNull().default(0),
    emailOpenRate: int("email_open_rate").notNull().default(0), // basis points (e.g. 4250 = 42.50%)
    emailClickRate: int("email_click_rate").notNull().default(0), // basis points

    // ── SEO ───────────────────────────────────────────────────────────────────
    organicSessions: int("organic_sessions").notNull().default(0),
    topKeywordRank: int("top_keyword_rank").notNull().default(0), // 0 = not ranked

    // ── Founding members ─────────────────────────────────────────────────────
    foundingMemberCount: int("founding_member_count").notNull().default(0),
    mrr: int("mrr").notNull().default(0), // AUD cents

    // ── Merch ─────────────────────────────────────────────────────────────────
    merchOrders: int("merch_orders").notNull().default(0),
    merchRevenue: int("merch_revenue").notNull().default(0), // AUD cents

    // ── Compliance agent ─────────────────────────────────────────────────────
    complianceQueries: int("compliance_queries").notNull().default(0),

    // ── Notes ─────────────────────────────────────────────────────────────────
    notes: text("notes"),
  },
  (t) => [index("week_label_idx").on(t.weekLabel)]
);

// ─── Founding Members ─────────────────────────────────────────────────────────
// Tracks founding member subscriptions (pre-launch, manual entry until Stripe is live)

export const foundingMembers = mysqlTable("founding_members", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 256 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  wineryName: varchar("winery_name", { length: 256 }),
  state: varchar("state", { length: 10 }),
  tier: mysqlEnum("tier", ["cellar", "press", "cellar_master"]).notNull().default("cellar"),
  stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
  joinedAt: bigint("joined_at", { mode: "number" }).notNull(),
  notes: text("notes"),
});

// ─── Vintage Log Entries ──────────────────────────────────────────────────────
// One row per cellar event recorded by a user in The Press → Vintage Log tab.
// detailsJson and tagsJson are stored as text; application layer always provides
// a valid JSON string (no DB-level DEFAULT needed — server always supplies values).

export const vintageLogEntries = mysqlTable(
  "vintage_log_entries",
  {
    id: int("id").autoincrement().primaryKey(),
    // Owner of this entry — links to users.id
    userId: int("user_id").notNull(),
    // Tank identifier (free text, e.g. "Tank 7", "Barrel 12A")
    tankName: varchar("tank_name", { length: 128 }).notNull(),
    // Grape variety (e.g. "Shiraz", "Chardonnay")
    variety: varchar("variety", { length: 128 }).notNull(),
    // Event type — drives which contextual detail fields are shown
    eventType: mysqlEnum("event_type", [
      "addition",
      "measurement",
      "racking",
      "inoculation",
      "observation",
      "other",
    ]).notNull(),
    // Structured event-specific fields stored as JSON string
    // Addition:    { what, quantity, unit, timing }
    // Measurement: { what, value, unit }
    // Racking:     { fromLocation, toLocation, volumeL, leesStatus }
    // Inoculation: { what, productName, ratePerHL }
    // Observation: { text }
    // Other:       { text }
    detailsJson: text("details_json").notNull(),
    // Optional free-text note appended to the entry
    noteText: text("note_text"),
    // Auto-generated tags as JSON array of strings e.g. '["DAP addition","YAN","inoculation"]'
    tagsJson: text("tags_json").notNull(),
    // UTC ms timestamp of when the event occurred (defaults to entry creation time)
    entryAt: bigint("entry_at", { mode: "number" }).notNull(),
    // UTC ms timestamp of when the row was created
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("vle_user_idx").on(t.userId),
    index("vle_entry_at_idx").on(t.entryAt),
    index("vle_tank_idx").on(t.tankName),
  ]
);
