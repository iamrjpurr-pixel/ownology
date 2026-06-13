import { mysqlTable, varchar, int, bigint, text, mysqlEnum, index, boolean } from "drizzle-orm/mysql-core";

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

// ─── Tank Reminders ──────────────────────────────────────────────────────────────────────────────
// One row per (user, tank, eventType) reminder. A Heartbeat cron fires hourly
// and checks whether any active reminder's tank is overdue.
export const tankReminders = mysqlTable(
  "tank_reminders",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    tankName: varchar("tank_name", { length: 128 }).notNull(),
    // Which event type to watch for; 'any' means any event type resets the clock
    eventType: mysqlEnum("event_type", [
      "addition",
      "measurement",
      "racking",
      "inoculation",
      "observation",
      "any",
    ])
      .notNull()
      .default("any"),
    // Hours without a matching entry before the warning fires
    thresholdHours: int("threshold_hours").notNull().default(24),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("tr_user_idx").on(t.userId),
    index("tr_tank_idx").on(t.tankName),
  ]
);

// ─── Leads (CRM) ─────────────────────────────────────────────────────────────
// Every email sign-up captured from any page is stored here.
// source: which page/event triggered the capture (e.g. "preview", "pricing", "event")
// tagsJson: JSON array of string tags (e.g. '["preview","founding"]')

export const leads = mysqlTable(
  "leads",
  {
    id: int("id").autoincrement().primaryKey(),
    email: varchar("email", { length: 256 }).notNull(),
    // Where the sign-up originated
    source: varchar("source", { length: 64 }).notNull().default("unknown"),
    // JSON array of string tags
    tagsJson: text("tags_json").notNull().default("[]"),
    // Optional contact details (filled in later or from form)
    name: varchar("name", { length: 256 }),
    wineryName: varchar("winery_name", { length: 256 }),
    // Phone number (optional, captured from in-person contact)
    phone: varchar("phone", { length: 64 }),
    // Stripe integration — set when a payment is completed
    stripeCustomerId: varchar("stripe_customer_id", { length: 64 }),
    stripePaid: boolean("stripe_paid").notNull().default(false),
    // Free-text notes editable from the CRM
    notes: text("notes"),
    // UTC ms timestamp of sign-up
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    // UTC ms timestamp of last update
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("leads_email_idx").on(t.email),
    index("leads_source_idx").on(t.source),
    index("leads_created_at_idx").on(t.createdAt),
  ]
);

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

// ─── Wine Batches (Winemaker's Batch Book) ──────────────────────────────────────
// One row per wine batch. Satisfies LIP (Wine Australia Act 2013 s.39F) mandatory
// fields: vintage, variety, GI, supplier, receival date, quantity.
// notesJson stores per-phase notes: { receival, fermentation, postFerment, stabilising, bottling }
export const wineBatches = mysqlTable(
  "wine_batches",
  {
    id: int("id").autoincrement().primaryKey(),
    // Owner of this batch — links to users.id
    userId: int("user_id").notNull(),
    // LIP-mandatory: Wine Batch ID (e.g. "26SHZ-001")
    batchId: varchar("batch_id", { length: 32 }).notNull(),
    // LIP-mandatory: vintage year (e.g. 2026)
    vintage: int("vintage").notNull(),
    // LIP-mandatory: full variety name (e.g. "Shiraz", not "Shz")
    variety: varchar("variety", { length: 128 }).notNull(),
    // LIP-mandatory: Geographical Indication (e.g. "Barossa Valley")
    gi: varchar("gi", { length: 128 }).notNull().default(""),
    // LIP-mandatory: grower/supplier name and address
    growerDetails: text("grower_details"),
    // LIP-mandatory: date fruit/juice was received (UTC ms)
    receivedAt: bigint("received_at", { mode: "number" }),
    // LIP-mandatory: quantity received (kg for grapes, L for juice/wine)
    quantityValue: varchar("quantity_value", { length: 32 }),
    quantityUnit: mysqlEnum("quantity_unit", ["kg", "t", "L"]).default("kg"),
    // Optional: linked tank name from the vintage log
    tankName: varchar("tank_name", { length: 128 }),
    // Per-phase winemaker notes stored as JSON:
    // { receival: string, fermentation: string, postFerment: string, stabilising: string, bottling: string }
    notesJson: text("notes_json").notNull(),
    // UTC ms timestamps
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("wb_user_idx").on(t.userId),
    index("wb_vintage_idx").on(t.vintage),
    index("wb_batch_id_idx").on(t.batchId),
  ]
);

// ─── Site Content (Owner Inline Editing) ─────────────────────────────────────
// Stores owner-editable text overrides keyed by a content_key string.
// If no row exists for a key, the hardcoded default in the component is used.

export const siteContent = mysqlTable("site_content", {
  id: int("id").autoincrement().primaryKey(),
  contentKey: varchar("content_key", { length: 256 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
});

// ─── Compliance Doctrine — Verified Dates ───────────────────────────────────
// Tracks when each Q&A doctrine entry was last manually verified by the owner.
// One row per doctrine entry ID. If no row exists, the entry is unverified.
export const doctrineVerified = mysqlTable(
  "doctrine_verified",
  {
    id: int("id").autoincrement().primaryKey(),
    // The doctrine entry ID from complianceQADoctrine.ts (e.g. "sa-cellar-door")
    doctrineId: varchar("doctrine_id", { length: 128 }).notNull().unique(),
    // UTC ms timestamp of the last verification
    verifiedAt: bigint("verified_at", { mode: "number" }).notNull(),
    // Optional note about what was checked (e.g. "Confirmed SA Liquor Licensing Act unchanged")
    notes: text("notes"),
  },
  (t) => [
    index("dv_doctrine_id_idx").on(t.doctrineId),
    index("dv_verified_at_idx").on(t.verifiedAt),
  ]
);

// ─── Cellar Equipment Register ──────────────────────────────────────────────
// One row per piece of equipment registered by a user.
// material: stainless | wood | concrete | fibreglass | other
// Tasks are generated from this register by the AI task generator.
export const cellarEquipment = mysqlTable(
  "cellar_equipment",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    // Equipment name (e.g. "Tank 7", "Bladder Press", "Basket Press")
    name: varchar("name", { length: 128 }).notNull(),
    // Equipment type — drives default task templates
    equipmentType: mysqlEnum("equipment_type", [
      "fermentation_tank",
      "barrel",
      "press",
      "pump",
      "sorting_table",
      "destemmer",
      "cold_room",
      "hose",
      "other",
    ]).notNull(),
    // Material of construction
    material: mysqlEnum("material", [
      "stainless",
      "wood",
      "concrete",
      "fibreglass",
      "other",
    ]).notNull().default("stainless"),
    // Capacity in litres (optional)
    capacityL: int("capacity_l"),
    // Quantity of this item (e.g. 24 barrels)
    quantity: int("quantity").notNull().default(1),
    // Optional notes (e.g. "French oak, 2021 vintage, Seguin Moreau")
    notes: text("notes"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("ce_user_idx").on(t.userId),
    index("ce_type_idx").on(t.equipmentType),
  ]
);

// ─── Cellar Tasks ─────────────────────────────────────────────────────────────
// One row per cleaning/maintenance task. Tasks are either AI-generated from the
// equipment register or manually added by the user.
// completedAt: null = pending, set = completed.
export const cellarTasks = mysqlTable(
  "cellar_tasks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    // Optional link to the equipment item that generated this task
    equipmentId: int("equipment_id"),
    // Equipment display name (denormalised for display without join)
    equipmentName: varchar("equipment_name", { length: 128 }).notNull(),
    // Task category
    taskType: mysqlEnum("task_type", [
      "clean",
      "sanitise",
      "inspect",
      "maintain",
      "other",
    ]).notNull(),
    // Short task title (e.g. "Post-ferment clean")
    title: varchar("title", { length: 256 }).notNull(),
    // Detailed method notes (AI-generated or user-written)
    methodNotes: text("method_notes"),
    // Frequency label (e.g. "Before use", "After use", "Weekly", "Monthly", "Annual")
    frequency: varchar("frequency", { length: 64 }).notNull().default("After use"),
    // Due date (UTC ms) — optional, set when task is scheduled
    dueAt: bigint("due_at", { mode: "number" }),
    // Completion timestamp (UTC ms) — null = pending
    completedAt: bigint("completed_at", { mode: "number" }),
    // Name of person who completed the task
    completedBy: varchar("completed_by", { length: 256 }),
    // Whether this task was AI-generated (1) or manually added (0)
    aiGenerated: int("ai_generated").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("ct_user_idx").on(t.userId),
    index("ct_equipment_idx").on(t.equipmentId),
    index("ct_due_at_idx").on(t.dueAt),
    index("ct_completed_at_idx").on(t.completedAt),
  ]
);

// ─── Regulation Monitor — Seen Publications ─────────────────────────────────
// Tracks which regulation update URLs have already been notified to the owner.
// The weekly scheduled monitor inserts a row when it first sees a new publication,
// preventing duplicate notifications across runs.
export const regulationMonitorSeen = mysqlTable(
  "regulation_monitor_seen",
  {
    id: int("id").autoincrement().primaryKey(),
    // Unique identifier for the publication — typically the URL or a stable ID
    publicationUrl: varchar("publication_url", { length: 1024 }).notNull().unique(),
    // Human-readable title of the publication
    title: varchar("title", { length: 512 }).notNull(),
    // Source feed (e.g. "FSANZ", "WineAustralia", "legislation.gov.au")
    source: varchar("source", { length: 128 }).notNull(),
    // UTC ms timestamp when this publication was first seen
    firstSeenAt: bigint("first_seen_at", { mode: "number" }).notNull(),
    // Whether the owner has been notified (1 = yes, 0 = no)
    notified: int("notified").notNull().default(0),
  },
  (t) => [
    index("rms_source_idx").on(t.source),
    index("rms_seen_at_idx").on(t.firstSeenAt),
  ]
);
