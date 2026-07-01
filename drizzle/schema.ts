import { mysqlTable, varchar, int, bigint, text, mysqlEnum, index, boolean, float } from "drizzle-orm/mysql-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("open_id", { length: 128 }).notNull().unique(),
  name: varchar("name", { length: 256 }),
  email: varchar("email", { length: 256 }),
  role: mysqlEnum("role", ["admin", "user"]).notNull().default("user"),
  // 'metric' (AU/NZ default) | 'imperial' (US/legacy preference). Controls
  // AI answer conversion + SOP boutique companion rendering.
  unitSystem: varchar("unit_system", { length: 16 }).notNull().default("metric"),
  // Multi-tenant container — Phase 1 (Feb 2026): nullable for legacy rows;
  // Phase 2 will flip to NOT NULL once query refactor is complete.
  wineryId: int("winery_id"),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Free Run Credits ────────────────────────────────────────────────────────
// Tracks purchased credit balance per user. Credits never expire.
export const freeRunCredits = mysqlTable("free_run_credits", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("user_id").notNull(),
  // Current credit balance
  balance: int("balance").notNull().default(0),
  // Total credits ever purchased (for analytics)
  totalPurchased: int("total_purchased").notNull().default(0),
  // Total credits ever consumed
  totalConsumed: int("total_consumed").notNull().default(0),
  updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  createdAt: bigint("created_at", { mode: "number" }).notNull(),
});

// ─── Free Run Daily Usage ─────────────────────────────────────────────────────
// Tracks daily question count per user. Resets at midnight UTC.
export const freeRunDailyUsage = mysqlTable(
  "free_run_daily_usage",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    // Date string YYYY-MM-DD UTC
    dateKey: varchar("date_key", { length: 10 }).notNull(),
    // Number of curiosity questions asked today
    questionCount: int("question_count").notNull().default(0),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [index("fru_user_date_idx").on(t.userId, t.dateKey)]
);

// ─── Go Deeper Reveals ────────────────────────────────────────────────────────
// Tracks each Go Deeper unlock (1 credit per question). Stores the triangle
// content for all three panels so they can be retrieved without re-calling LLM.
export const goDeeperReveals = mysqlTable(
  "go_deeper_reveals",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    // The original curiosity question
    question: text("question").notNull(),
    // Detected topic tag (e.g. "MLF", "Tannins", "Chardonnay") for analytics
    topicTag: varchar("topic_tag", { length: 100 }),
    // The surface answer (free tier)
    surfaceAnswer: text("surface_answer").notNull(),
    // Triangle panels — generated when credit is consumed
    sciencePanel: text("science_panel"),
    vineyardPanel: text("vineyard_panel"),
    craftPanel: text("craft_panel"),
    // Whether this was the user's first free reveal (hook)
    wasFreeHook: boolean("was_free_hook").notNull().default(false),
    // Credits consumed (0 for free hook, 1 for paid)
    creditsConsumed: int("credits_consumed").notNull().default(1),
    // ── Trinity content pipeline candidacy ──────────────────────────────────
    // UTC ms timestamp when the nightly clustering job processed this reveal.
    // Null = not yet clustered (eligible for the next clustering run).
    clusteredAt: bigint("clustered_at", { mode: "number" }),
    // If this reveal was folded into a published Trinity piece, the id of that
    // published_trinity_responses row. Null otherwise.
    publishedTrinityId: int("published_trinity_id"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("gdr_user_idx").on(t.userId),
    index("gdr_topic_idx").on(t.topicTag),
    index("gdr_clustered_idx").on(t.clusteredAt),
  ]
);

// ─── Go Deeper Panel Feedback ─────────────────────────────────────────────────
// Thumbs up/down per panel per reveal. Powers quality analytics and viticulture
// demand signal.
export const goDeeperFeedback = mysqlTable(
  "go_deeper_feedback",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    revealId: int("reveal_id").notNull(),
    // Which panel: "science" | "vineyard" | "craft"
    panel: mysqlEnum("panel", ["science", "vineyard", "craft"]).notNull(),
    // true = thumbs up, false = thumbs down
    thumbsUp: boolean("thumbs_up").notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("gdf_reveal_idx").on(t.revealId),
    index("gdf_panel_idx").on(t.panel),
    index("gdf_user_idx").on(t.userId),
  ]
);

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
    wineryId: int("winery_id"),
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
    index("tr_winery_idx").on(t.wineryId),
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
    // Multi-tenant container — Phase 2 (Feb 2026): nullable for legacy rows;
    // backfilled on bootstrap from users.winery_id. Flips to NOT NULL once
    // refactor has been live and stable for 24h.
    wineryId: int("winery_id"),
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
      "pre_harvest_sample",
      "bottling_run",
      "weather_event",
      "sanitation",
      "other",
    ]).notNull(),
    // Structured event-specific fields stored as JSON string
    // Addition:          { what, quantity, unit, timing }
    // Measurement:       { what, value, unit }
    // Racking:           { fromLocation, toLocation, volumeL, leesStatus }
    // Inoculation:       { what, productName, ratePerHL }
    // Observation:       { text }
    // PreHarvestSample:  { blockName, brix, ta, ph, phenolics, notes }
    // BottlingRun:       { volumeL, lotNumber, format, labelName, notes }
    // Other:             { text }
    detailsJson: text("details_json").notNull(),
    // Optional free-text note appended to the entry
    noteText: text("note_text"),
    // Auto-generated tags as JSON array of strings e.g. '["DAP addition","YAN","inoculation"]'
    tagsJson: text("tags_json").notNull(),
    // UTC ms timestamp of when the event occurred (defaults to entry creation time)
    entryAt: bigint("entry_at", { mode: "number" }).notNull(),
    // UTC ms timestamp of when the row was created
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    // Import provenance — null for live cellar entries
    // "paste" = AI-assisted paste import, "csv" = CSV/Excel upload
    importSource: varchar("import_source", { length: 32 }),
    // UUID grouping all entries from a single import session
    importBatchId: varchar("import_batch_id", { length: 64 }),
  },
  (t) => [
    index("vle_user_idx").on(t.userId),
    index("vle_winery_idx").on(t.wineryId),
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
    // Multi-tenant container — Phase 2.
    wineryId: int("winery_id"),
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
    // Volume in litres at start of fermentation (optional — entered by winemaker)
    volumeLitres: int("volume_litres"),
    // DR-04: Live current volume — auto-updated on each Racking log entry.
    // Starts equal to volumeLitres at inoculation; decremented on rack-out, incremented on rack-in.
    currentVolumeLitres: int("current_volume_litres"),
    // Cost per litre (AUD) — entered by owner for Cellar Value calculation
    costPerLitre: int("cost_per_litre"),
    // Per-phase winemaker notes stored as JSON:
    // { receival: string, fermentation: string, postFerment: string, stabilising: string, bottling: string }
    notesJson: text("notes_json").notNull(),
    // UTC ms timestamps
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("wb_user_idx").on(t.userId),
    index("wb_winery_idx").on(t.wineryId),
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
    wineryId: int("winery_id"),
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
    index("ce_winery_idx").on(t.wineryId),
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
    wineryId: int("winery_id"),
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
      // DR-10: Equipment fault log entry
      "fault_log",
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
    // DR-03: Optional vessel linkage — links cleaning/sanitation events to a specific tank or barrel
    vesselId: varchar("vessel_id", { length: 128 }),
    vesselType: mysqlEnum("vessel_type", ["tank", "barrel", "other"]),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("ct_user_idx").on(t.userId),
    index("ct_winery_idx").on(t.wineryId),
    index("ct_equipment_idx").on(t.equipmentId),
    index("ct_due_at_idx").on(t.dueAt),
    index("ct_completed_at_idx").on(t.completedAt),
    index("ct_vessel_idx").on(t.vesselId),
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
    publicationUrl: varchar("publication_url", { length: 512 }).notNull().unique(),
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

// ─── Barrels ──────────────────────────────────────────────────────────────────
// DR-08: Barrel sub-module. One row per barrel. Topping, fill, and wine lot
// tracked here; cellar events are logged via vintage_log_entries with
// tankName set to the barrel's barrelId.
export const barrels = mysqlTable(
  "barrels",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    wineryId: int("winery_id"),
    // User-facing barrel identifier, e.g. "B-001" or "FR-2024-01"
    barrelId: varchar("barrel_id", { length: 64 }).notNull(),
    // Oak origin / type
    oakType: mysqlEnum("oak_type", [
      "French",
      "American",
      "Hungarian",
      "Slavonian",
      "Other",
    ])
      .notNull()
      .default("French"),
    // Barrel format
    format: varchar("format", { length: 64 })
      .notNull()
      .default("Barrique (225L)"),
    // Age in years at time of first fill (0 = new oak)
    ageYears: int("age_years").notNull().default(0),
    // UTC ms timestamp of first fill
    fillDate: bigint("fill_date", { mode: "number" }),
    // UTC ms timestamp of most recent topping
    lastToppedDate: bigint("last_topped_date", { mode: "number" }),
    // Wine lot / batch currently in barrel (free text)
    wineLot: varchar("wine_lot", { length: 256 }),
    // Free-form notes
    notes: text("notes"),
    // Whether barrel is currently in use
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("barrel_user_idx").on(t.userId),
    index("barrel_winery_idx").on(t.wineryId),
    index("barrel_id_user_idx").on(t.barrelId, t.userId),
  ]
);

// ─── Packaging Inventory (DR-13) ─────────────────────────────────────────────
// Tracks consumable packaging stock: bottles, labels, capsules, corks, boxes.

export const packagingInventory = mysqlTable(
  "packaging_inventory",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id").notNull(),
    wineryId: int("winery_id"),
    // Item name e.g. "750mL Bordeaux Bottle", "Screwcap 30mm", "Shiraz Front Label"
    itemName: varchar("item_name", { length: 256 }).notNull(),
    // Category for filtering
    category: mysqlEnum("category", [
      "bottle",
      "label",
      "capsule",
      "cork",
      "box",
      "other",
    ]).notNull().default("other"),
    // Current stock quantity
    quantityOnHand: int("quantity_on_hand").notNull().default(0),
    // Reorder trigger level — alert when stock falls below this
    reorderLevel: int("reorder_level").notNull().default(0),
    // Unit of measure (e.g. "units", "sheets", "rolls")
    unit: varchar("unit", { length: 32 }).notNull().default("units"),
    // Supplier / notes
    notes: text("notes"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("pkg_user_idx").on(t.userId),
    index("pkg_winery_idx").on(t.wineryId),
    index("pkg_category_idx").on(t.category),
  ]
);

// ─── Vineyard Blocks (DR-06) ──────────────────────────────────────────────────
// Tracks individual vineyard blocks: variety, area, rootstock, training system,
// soil type, and key phenological observations per block per season.
export const vineyardBlocks = mysqlTable(
  "vineyard_blocks",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    wineryId: int("winery_id"),
    // User-facing block identifier, e.g. "Block A", "North Slope"
    blockName: varchar("block_name", { length: 128 }).notNull(),
    variety: varchar("variety", { length: 128 }).notNull(),
    // Area in hectares
    areaHa: float("area_ha"),
    // Planting year
    plantingYear: int("planting_year"),
    rootstock: varchar("rootstock", { length: 128 }),
    trainingSystem: mysqlEnum("training_system", [
      "VSP",
      "Scott Henry",
      "Smart-Dyson",
      "Pergola",
      "Bush Vine",
      "Other",
    ]).default("VSP"),
    soilType: varchar("soil_type", { length: 256 }),
    // Aspect / orientation (free text, e.g. "North-facing slope")
    aspect: varchar("aspect", { length: 256 }),
    // General notes
    notes: text("notes"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("vb_user_idx").on(t.userId),
    index("vb_winery_idx").on(t.wineryId),
    index("vb_block_name_idx").on(t.blockName, t.userId),
  ]
);

// ─── Vineyard Block Observations (DR-06) ──────────────────────────────────────
// Phenological and agronomic observations per block per season.
export const vineyardObservations = mysqlTable(
  "vineyard_observations",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
    wineryId: int("winery_id"),
    blockId: int("block_id").notNull(),
    // Observation type
    observationType: mysqlEnum("observation_type", [
      "budburst",
      "flowering",
      "veraison",
      "harvest_date",
      "spray_application",
      "irrigation",
      "canopy_management",
      "disease_scouting",
      "pest_scouting",
      "disease_pest_event",
      "yield_estimate",
      "other",
    ]).notNull(),
    // UTC ms timestamp of the observation
    observedAt: bigint("observed_at", { mode: "number" }).notNull(),
    // Vintage year (e.g. 2026)
    vintageYear: int("vintage_year").notNull(),
    // Numeric value if applicable (e.g. Brix at harvest, kg/vine yield)
    value: float("value"),
    unit: varchar("unit", { length: 32 }),
    notes: text("notes"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("vo_user_idx").on(t.userId),
    index("vo_winery_idx").on(t.wineryId),
    index("vo_block_idx").on(t.blockId),
    index("vo_vintage_idx").on(t.vintageYear),
  ]
);

// ─── Knowledge Platform — SOP Library (Sprint 7) ────────────────────────────
// One row per SOP. Pre-seeded with 8 categories × 4–6 SOPs each.
// is_template = true means the procedure_text was platform-authored and can be
// overridden by the winery owner. decision_logic and tribal_knowledge are always
// owner-authored.
export const sopLibrary = mysqlTable(
  "sop_library",
  {
    id: int("id").autoincrement().primaryKey(),
    // SOP category (one of the 8 high-value categories)
    category: varchar("category", { length: 100 }).notNull(),
    // Sort order within category (1-based)
    sortOrder: int("sort_order").notNull().default(1),
    // Short title (e.g. "Yeast Selection Criteria")
    title: varchar("title", { length: 255 }).notNull(),
    // Full step-by-step procedure text (Markdown)
    procedureText: text("procedure_text"),
    // Winemaker's decision logic — why this approach was chosen
    decisionLogic: text("decision_logic"),
    // Tribal knowledge — equipment quirks, supplier preferences, site practices
    tribalKnowledge: text("tribal_knowledge"),
    // CSU subject reference code(s) e.g. "WSC202, WSC318"
    csuSubjectRef: varchar("csu_subject_ref", { length: 100 }),
    // Cellar-ready quick steps: 3–5 action-verb bullet points (Markdown list)
    quickSteps: text("quick_steps"),
    // Whether this SOP was platform-authored (true) or fully custom (false)
    isTemplate: boolean("is_template").notNull().default(true),
    // Audience: 'commercial' = professional winery platform, 'diy' = home winemaker tier
    audience: varchar("audience", { length: 20 }).notNull().default("commercial"),
    // Vector embedding for semantic search (JSON array of 1536 floats, text-embedding-3-small)
    // Null until backfill script runs. Used for DIY semantic SOP retrieval.
    embeddingVector: text("embedding_vector"),
    // WBS domain code (e.g. "4" = Fermentation & Winemaking)
    wbsDomain: varchar("wbs_domain", { length: 10 }),
    // WBS process family code (e.g. "4.1" = Alcoholic Fermentation SOP)
    wbsProcessFamily: varchar("wbs_process_family", { length: 10 }),
    // Full WBS code (e.g. "4.1", "5.3") — canonical reference
    wbsCode: varchar("wbs_code", { length: 10 }),
    // Bible chapter cross-references — comma-separated chapter refs from diy_knowledge_chunks
    // e.g. "3,4,6" means this SOP is grounded in Red Wine Bible chapters 3, 4, and 6
    bibleChapters: varchar("bible_chapters", { length: 255 }),
    // Boutique-scale (5 US gal / ~19 L) companion content for the 7 SOPs that
    // map onto Red Wine Making Outline sections. Rendered as a sidebar on the
    // SOP detail page so boutique winemakers see scale-appropriate guidance
    // alongside the commercial procedure. Null for the other 31 SOPs.
    boutiqueCompanion: text("boutique_companion"),
    // Whether this SOP is published/visible in the DIY tutor context
    published: boolean("published").notNull().default(false),
    // UTC ms timestamp when published (null if not yet published)
    publishedAt: bigint("published_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("sop_category_idx").on(t.category),
    index("sop_sort_idx").on(t.category, t.sortOrder),
    index("sop_wbs_code_idx").on(t.wbsCode),
    index("sop_published_idx").on(t.published),
  ]
);

// ─── Knowledge Platform — SOP Vintage Notes (Sprint 7) ──────────────────────
// One row per (sop_id, vintage_year) entry. Captures what worked, what failed,
// and what to change next vintage. Optionally linked to a wine batch.
export const sopVintageNotes = mysqlTable(
  "sop_vintage_notes",
  {
    id: int("id").autoincrement().primaryKey(),
    wineryId: int("winery_id"),
    sopId: int("sop_id").notNull(),
    vintageYear: int("vintage_year").notNull(),
    whatWorked: text("what_worked"),
    whatFailed: text("what_failed"),
    whatToChange: text("what_to_change"),
    // Optional link to a wine_batches row
    linkedBatchId: int("linked_batch_id"),
    createdBy: varchar("created_by", { length: 255 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("svn_sop_idx").on(t.sopId),
    index("svn_winery_idx").on(t.wineryId),
    index("svn_vintage_idx").on(t.vintageYear),
  ]
);

// ─── Knowledge Platform — SOP Training Records (Sprint 7) ───────────────────
// One row per trainee per training session. Multiple trainees per session are
// stored as multiple rows sharing the same sop_id + trained_at + trainer_name.
export const sopTrainingRecords = mysqlTable(
  "sop_training_records",
  {
    id: int("id").autoincrement().primaryKey(),
    wineryId: int("winery_id"),
    sopId: int("sop_id").notNull(),
    // UTC ms timestamp of the training session
    trainedAt: bigint("trained_at", { mode: "number" }).notNull(),
    trainerName: varchar("trainer_name", { length: 255 }).notNull(),
    traineeName: varchar("trainee_name", { length: 255 }).notNull(),
    traineeRole: varchar("trainee_role", { length: 100 }),
    // completed | in_progress | not_started
    status: mysqlEnum("status", ["completed", "in_progress", "not_started"])
      .notNull()
      .default("completed"),
    notes: text("notes"),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("str_sop_idx").on(t.sopId),
    index("str_winery_idx").on(t.wineryId),
    index("str_trainee_idx").on(t.traineeName),
    index("str_trained_at_idx").on(t.trainedAt),
  ]
);

// ─── Vintage Intelligence (Regional Vintage Context) ────────────────────────
// One row per (region, year). Stores regional vintage conditions, quality
// assessment, and standout varieties. Used to inject context into the Free Run
// AI Tutor system prompt when a user asks about a specific region or vintage.
export const vintageIntelligence = mysqlTable(
  "vintage_intelligence",
  {
    id: int("id").autoincrement().primaryKey(),
    // Region name (e.g. "Barossa Valley", "Margaret River")
    region: varchar("region", { length: 128 }).notNull(),
    // Vintage year (e.g. 2024)
    year: int("year").notNull(),
    // Australian state abbreviation (e.g. "SA", "WA", "VIC", "NSW")
    state: varchar("state", { length: 10 }).notNull(),
    // Country (default "Australia")
    country: varchar("country", { length: 64 }).notNull().default("Australia"),
    // Full narrative of growing season conditions (Markdown)
    conditions: text("conditions").notNull(),
    // Comma-separated list of standout varieties (e.g. "Grenache, Shiraz, Riesling")
    standoutVarieties: varchar("standout_varieties", { length: 512 }),
    // Overall quality rating 1–5 (1=Poor, 2=Below Average, 3=Average, 4=Excellent, 5=Exceptional)
    qualityRating: int("quality_rating").notNull().default(3),
    // Yield assessment relative to average (e.g. "Below average — 50–90% of normal")
    yieldAssessment: varchar("yield_assessment", { length: 256 }),
    // Key winemaking implications for this vintage
    winemakingNotes: text("winemaking_notes"),
    // Data source attribution (e.g. "Barossa Australia Vintage Report 2024")
    source: varchar("source", { length: 512 }),
    // UTC ms timestamp
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("vi_region_year_idx").on(t.region, t.year),
    index("vi_state_idx").on(t.state),
    index("vi_year_idx").on(t.year),
  ]
);

// ─── DIY Knowledge Chunks (Home Winemaker Bible Documents) ──────────────────
// Stores chunked passages from home winemaking reference documents (e.g. the
// Red Wine Bible, White Wine Bible). Each chunk is a ~400-word passage with
// chapter/section metadata for context injection into the DIY AI tutor.
export const diyKnowledgeChunks = mysqlTable(
  "diy_knowledge_chunks",
  {
    id: int("id").autoincrement().primaryKey(),
    // Source document identifier (e.g. "red_wine_bible", "white_wine_bible")
    sourceDoc: varchar("source_doc", { length: 64 }).notNull(),
    // Wine type: "red", "white", "general"
    wineType: varchar("wine_type", { length: 16 }).notNull().default("general"),
    // Chapter number or section identifier (e.g. "3", "10.4")
    chapterRef: varchar("chapter_ref", { length: 32 }),
    // Chapter/section title (e.g. "The Fermentation", "Yeast Nutrition")
    chapterTitle: varchar("chapter_title", { length: 256 }),
    // Comma-separated topic tags for keyword routing (e.g. "fermentation,yeast,nutrition")
    topicTags: varchar("topic_tags", { length: 512 }),
    // WBS domain code (e.g. "4" = Fermentation & Winemaking)
    wbsDomain: varchar("wbs_domain", { length: 10 }),
    // WBS process family code (e.g. "4.1" = Alcoholic Fermentation SOP)
    wbsProcessFamily: varchar("wbs_process_family", { length: 10 }),
    // Full WBS code (e.g. "4.1", "5.3") — canonical reference
    wbsCode: varchar("wbs_code", { length: 10 }),
    // Whether this chunk is published/visible in the DIY tutor
    // Controlled release: Domain 4 published at launch, others unpublished
    published: boolean("published").notNull().default(false),
    // UTC ms timestamp when published (null if not yet published)
    publishedAt: bigint("published_at", { mode: "number" }),
    // The actual text passage (~400 words)
    content: text("content").notNull(),
    // Chunk sequence number within the source doc (for ordering)
    chunkIndex: int("chunk_index").notNull().default(0),
    // UTC ms timestamp
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("dkc_source_doc_idx").on(t.sourceDoc),
    index("dkc_wine_type_idx").on(t.wineType),
    index("dkc_chapter_idx").on(t.chapterRef),
    index("dkc_wbs_code_idx").on(t.wbsCode),
    index("dkc_published_idx").on(t.published),
  ]
);

// ─── Ghost Questions ───────────────────────────────────────────────────────────
// AI-generated questions mapped to WBS nodes for the home winemaker knowledge hub.
// These "ghost questions" surface naturally through the AI journey rather than
// being shown as static chips. They are used for:
//   1. SEO — question-answer pairs for search indexing
//   2. AI context — pre-seeded Q&A pairs to improve retrieval quality
//   3. Future "suggested questions" feature — surfaced contextually after answers
export const ghostQuestions = mysqlTable(
  "ghost_questions",
  {
    id: int("id").primaryKey().autoincrement(),
    // WBS node this question maps to (e.g. "D4.2", "5.1")
    wbsCode: varchar("wbs_code", { length: 10 }).notNull(),
    // Wine type: "red", "white", or "general"
    wineType: varchar("wine_type", { length: 10 }).notNull().default("general"),
    // The question text (plain language, home winemaker voice)
    question: text("question").notNull(),
    // Short teaching answer (≈80–140 words) — surfaced under each
    // Cellar Brief card to deepen educational context. Nullable so we
    // can ship a question without an answer if regeneration fails.
    answer: text("answer"),
    // Slug of the public /cellar-journal/<slug> entry mirroring this
    // ghost question. Populated by migrate-ghost-questions-to-journal.mjs
    // — gives the Cellar Brief "Worth knowing" block a deep-link target.
    journalSlug: varchar("journal_slug", { length: 200 }),
    // Difficulty level: "beginner", "intermediate", "advanced"
    difficulty: varchar("difficulty", { length: 20 }).notNull().default("beginner"),
    // Category tag for grouping (e.g. "fermentation", "sanitation", "bottling")
    category: varchar("category", { length: 50 }),
    // Whether this question is active/visible
    active: boolean("active").notNull().default(true),
    // UTC ms timestamp
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("gq_wbs_code_idx").on(t.wbsCode),
    index("gq_wine_type_idx").on(t.wineType),
    index("gq_difficulty_idx").on(t.difficulty),
    index("gq_active_idx").on(t.active),
  ]
);

// ─── Published Trinity Responses (Trinity Content Pipeline) ──────────────────
// One row per community Trinity piece produced by the nightly clustering +
// editorial job. Each piece is a canonicalised Free Run question with three
// polished panels (Science / Vineyard / Craft) sourced from the highest-rated
// reveal in a cluster of 3+ similar questions.
//
// status lifecycle:
//   pending    → auto-published community draft (visible to members, not featured)
//   featured   → owner-promoted (top of Trinity tab, amber badge)
//   suppressed → hidden (duplicate of an existing piece or owner-rejected)
//
// The bibles (diy_knowledge_chunks) are used privately for the accuracy pass.
// accuracyFlag/accuracyNote capture any unsupported or contradicted claims for
// owner review. Bible names are NEVER exposed to end users.
export const publishedTrinityResponses = mysqlTable(
  "published_trinity_responses",
  {
    id: int("id").autoincrement().primaryKey(),
    // Canonicalised, editorially-polished question (the piece title)
    questionCanonical: text("question_canonical").notNull(),
    // One-sentence excerpt for cards / list views
    excerpt: text("excerpt"),
    // The three polished Trinity panels (Markdown)
    contentScience: text("content_science"),
    contentVineyard: text("content_vineyard"),
    contentCraft: text("content_craft"),
    // Which Trinity act this piece leads with for tab placement:
    // "science" | "vineyard" | "craft" — drives Blog tab grouping
    primaryAct: mysqlEnum("primary_act", ["science", "vineyard", "craft"])
      .notNull()
      .default("science"),
    // Topic tag carried over from the source reveal (for grouping / FAQ)
    topicTag: varchar("topic_tag", { length: 100 }),
    // Workflow status
    status: mysqlEnum("status", ["pending", "featured", "suppressed"])
      .notNull()
      .default("pending"),
    // How many reveals were clustered into this piece (>=3 to publish)
    clusterSize: int("cluster_size").notNull().default(1),
    // JSON array of goDeeperReveals.id that formed this cluster
    memberRevealIdsJson: text("member_reveal_ids_json").notNull().default("[]"),
    // The reveal whose panels were selected as the canonical source
    sourceRevealId: int("source_reveal_id"),
    // Private accuracy review (bible cross-reference). true = a claim was
    // flagged as unsupported/contradicted and needs owner review.
    accuracyFlag: boolean("accuracy_flag").notNull().default(false),
    // Human-readable note describing the flagged claim(s) (owner-only)
    accuracyNote: text("accuracy_note"),
    // UTC ms timestamps
    publishedAt: bigint("published_at", { mode: "number" }),
    featuredAt: bigint("featured_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("ptr_status_idx").on(t.status),
    index("ptr_primary_act_idx").on(t.primaryAct),
    index("ptr_published_at_idx").on(t.publishedAt),
    index("ptr_accuracy_idx").on(t.accuracyFlag),
  ]
);

// ─── Trinity FAQ Clusters (Auto-generated FAQ) ───────────────────────────────
// One row per high-volume question cluster. Populated by the nightly job (top
// clusters by member count). Surfaced as auto-FAQ entries in FAQ.tsx. Kept
// separate from publishedTrinityResponses because FAQ entries are short Q&A
// pairs, not full Trinity pieces, and ranking is by raw question volume.
export const trinityFaqClusters = mysqlTable(
  "trinity_faq_clusters",
  {
    id: int("id").autoincrement().primaryKey(),
    // Canonicalised question (the FAQ question)
    canonicalQuestion: text("canonical_question").notNull(),
    // Concise FAQ answer (editorially generated, 1–2 short paragraphs)
    answer: text("answer").notNull(),
    // Number of similar questions in this cluster (drives ranking)
    clusterSize: int("cluster_size").notNull().default(1),
    // 1-based rank among published FAQ clusters (lower = higher volume)
    rank: int("rank").notNull().default(0),
    // Whether this FAQ entry is currently shown
    active: boolean("active").notNull().default(true),
    // UTC ms timestamp when the cluster was generated
    generatedAt: bigint("generated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("tfc_rank_idx").on(t.rank),
    index("tfc_active_idx").on(t.active),
  ]
);

// ─── Trinity Newsletter Drafts (Monthly newsletter, 24h owner preview) ───────
// One row per monthly newsletter run. The monthly Heartbeat composes a draft
// from the top featured Trinity pieces (one per act), creates it in Buttondown
// as a draft, and notifies the owner. The draft sits in "preview" for a 24h
// window; the owner can approve (send immediately) or skip. A daily pass
// auto-sends a still-"preview" draft once previewUntil has passed and it was
// not skipped. Buttondown stores the actual email; we keep only draft metadata.
export const trinityNewsletterDrafts = mysqlTable(
  "trinity_newsletter_drafts",
  {
    id: int("id").autoincrement().primaryKey(),
    // Period label this newsletter covers, e.g. "2026-06" (one per month)
    periodLabel: varchar("period_label", { length: 20 }).notNull(),
    // Composed email subject + Markdown body (kept for owner preview + audit)
    subject: text("subject").notNull(),
    body: text("body").notNull(),
    // JSON array of publishedTrinityResponses.id featured in this issue.
    // No DB DEFAULT (TiDB rejects DEFAULT on TEXT); the app layer always
    // supplies a valid JSON string.
    featuredIdsJson: text("featured_ids_json").notNull(),
    // Buttondown email id once the draft is created upstream (nullable)
    buttondownEmailId: varchar("buttondown_email_id", { length: 128 }),
    // Workflow status:
    //  preview  → in the 24h owner-preview window
    //  approved → owner approved; send in progress / done
    //  sent     → published to Buttondown
    //  skipped  → owner chose not to send this issue
    //  failed   → send attempt failed (see error log)
    status: mysqlEnum("status", [
      "preview",
      "approved",
      "sent",
      "skipped",
      "failed",
    ])
      .notNull()
      .default("preview"),
    // UTC ms: end of the 24h owner-preview window (auto-send after this)
    previewUntil: bigint("preview_until", { mode: "number" }).notNull(),
    // UTC ms: when the issue was actually sent
    sentAt: bigint("sent_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("tnd_status_idx").on(t.status),
    index("tnd_period_idx").on(t.periodLabel),
    index("tnd_preview_until_idx").on(t.previewUntil),
  ]
);


/**
 * Cellar Journal — public, SEO-indexable Q&A entries.
 *
 * Every time the AI tutor or Free Run answers a question, we persist a
 * canonicalised version here. The public site renders a teaser (~40% of the
 * answer) with a wax-sealed wall and CTA to upgrade. Googlebot is given the
 * full answer marked with `isAccessibleForFree: false` + `hasPart` (per
 * Google's flexible sampling spec) so we avoid cloaking while still gating
 * the body for human visitors.
 */
export const cellarJournal = mysqlTable(
  "cellar_journal",
  {
    id: int("id").primaryKey().autoincrement(),
    // URL slug — derived from question + topicTag, unique
    slug: varchar("slug", { length: 200 }).notNull().unique(),
    // The question as displayed (cleaned, sentence-cased)
    question: varchar("question", { length: 500 }).notNull(),
    // Topic tag from Free Run / tutor (e.g. "Stuck Fermentation", "MLF")
    topicTag: varchar("topic_tag", { length: 100 }).notNull(),
    // Full markdown answer (what Google sees)
    fullAnswer: text("full_answer").notNull(),
    // Teaser — first ~40% of the answer (what humans see before the wall)
    teaserAnswer: text("teaser_answer").notNull(),
    // Diagnosis sentence — the "first finding" before the procedural part
    diagnosis: varchar("diagnosis", { length: 600 }),
    // Source — which procedure generated this ('tutor.ask', 'freeRun.curiosityAsk')
    source: varchar("source", { length: 50 }).notNull(),
    // Audience this Q targeted ('home_winemaker', 'commercial', 'curious')
    audience: varchar("audience", { length: 30 }),
    // Citations — JSON array of {label, source_doc, chapter} pulled from chunks
    citations: text("citations"), // JSON string
    // Wine type if detected
    wineType: mysqlEnum("wine_type", ["red", "white", "both", "unknown", "sparkling"])
      .notNull()
      .default("unknown"),
    // Engagement metrics
    viewCount: int("view_count").notNull().default(0),
    askedCount: int("asked_count").notNull().default(1),
    /* Trinity-style clustering: 1536-dim embedding (text-embedding-3-small)
     * stored as JSON array. Used for cosine-similarity dedup so variants of
     * the same question funnel into ONE canonical entry. */
    embedding: text("embedding"),
    /* Variant questions that mapped to this canonical entry — JSON array of
     * { q: string, askedAt: number }. */
    variants: text("variants"),
    // Curation
    featured: boolean("featured").notNull().default(false),
    published: boolean("published").notNull().default(true),
    // Timestamps (epoch ms)
    firstAskedAt: bigint("first_asked_at", { mode: "number" }).notNull(),
    lastAskedAt: bigint("last_asked_at", { mode: "number" }).notNull(),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("cj_topic_idx").on(t.topicTag),
    index("cj_published_idx").on(t.published, t.lastAskedAt),
    index("cj_featured_idx").on(t.featured, t.lastAskedAt),
    index("cj_views_idx").on(t.viewCount),
  ]
);

/**
 * AI answer feedback — thumbs up/down captured under tutor.ask + freeRun answers.
 * Used to identify weak prompts/RAG gaps over time. The data moat.
 */
export const aiAnswerFeedback = mysqlTable(
  "ai_answer_feedback",
  {
    id: int("id").primaryKey().autoincrement(),
    userId: int("user_id"),
    procName: varchar("proc_name", { length: 64 }).notNull(), // e.g. "tutor.ask", "freeRun.curiosityAsk"
    question: text("question").notNull(),
    answerHash: varchar("answer_hash", { length: 32 }).notNull(),
    score: int("score").notNull(), // 1 = thumbs up, -1 = thumbs down
    note: varchar("note", { length: 500 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("aaf_proc_idx").on(t.procName, t.createdAt),
    index("aaf_score_idx").on(t.score),
  ]
);

/**
 * Pricing-page visit log — powers the /admin/funnel conversion-attribution
 * dashboard. Every visit to /pricing is logged with the originating source
 * (`?from=<source>`) so we can measure which acquisition channel converts.
 *
 * Sources currently tagged: free-paused, free-quota, homepage, press,
 * cellar-journal, competitive-advantage, preview, stats, direct (untagged).
 */
export const pricingViews = mysqlTable(
  "pricing_views",
  {
    id: int("id").primaryKey().autoincrement(),
    source: varchar("source", { length: 32 }).notNull(), // e.g. "free-paused"
    userId: int("user_id"), // null = anonymous visitor
    referer: varchar("referer", { length: 500 }),
    userAgent: varchar("user_agent", { length: 500 }),
    viewedAt: bigint("viewed_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("pv_source_idx").on(t.source, t.viewedAt),
    index("pv_viewed_idx").on(t.viewedAt),
  ]
);

/**
 * Outreach contacts — winemakers met in person (e.g. wine events). Each
 * contact gets a personalised landing page at /hi/:slug. The slug + opened/
 * booked timestamps let us track which warm SMS leads actually engaged.
 */
export const outreachContacts = mysqlTable(
  "outreach_contacts",
  {
    id: int("id").primaryKey().autoincrement(),
    slug: varchar("slug", { length: 80 }).notNull().unique(), // e.g. "sarah-brokenwood"
    firstName: varchar("first_name", { length: 80 }).notNull(),
    lastName: varchar("last_name", { length: 80 }),
    mobileAu: varchar("mobile_au", { length: 20 }), // +61 4XX XXX XXX
    winery: varchar("winery", { length: 120 }),
    event: varchar("event", { length: 120 }), // e.g. "McLaren Vale 2025"
    painPoint: varchar("pain_point", { length: 300 }), // what they complained about
    calendlyOverride: varchar("calendly_override", { length: 300 }),
    smsSentAt: bigint("sms_sent_at", { mode: "number" }),
    firstViewedAt: bigint("first_viewed_at", { mode: "number" }),
    viewCount: int("view_count").notNull().default(0),
    demoBookedAt: bigint("demo_booked_at", { mode: "number" }),
    // Reply pipeline timestamp — set when the operator marks the prospect
    // replied to the SMS but hasn't booked yet. Used by the pipeline-board
    // view to derive the "Replied" column.
    repliedAt: bigint("replied_at", { mode: "number" }),
    notes: varchar("notes", { length: 500 }),
    // Per-contact SMS draft override. When null, AdminContacts.tsx falls
    // back to the auto-generated template (smsDraft() helper). Set when
    // the operator hand-edits the message for a specific person.
    smsDraftOverride: varchar("sms_draft_override", { length: 500 }),
    // Triage state — warm = had a real conversation, lukewarm = brief positive,
    // cold = just collected card, sales = vendor/rep not a winemaker, skip = ignore
    status: varchar("status", { length: 16 }).notNull().default("cold"),
    // CTA A/B-test: timestamp set when the prospect taps the (deterministically
    // assigned) primary CTA on /hi/:slug. The variant they saw is computed
    // server-side from a hash of the slug — no storage needed.
    ctaClickedAt: bigint("cta_clicked_at", { mode: "number" }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("oc_slug_idx").on(t.slug),
    index("oc_event_idx").on(t.event),
    index("oc_status_idx").on(t.status),
  ]
);


/**
 * theme_picks — anonymous telemetry of theme selections.
 *
 * Logged whenever a visitor picks a theme via the onboarding card or the
 * nav picker. `session_id` is a random per-browser cookie/localStorage id
 * (not tied to a user account — fine for cohort sizing). `is_first_pick`
 * flags the first selection per session so we can split "what new users
 * picked" from "what existing users switched to". Used by /admin/themes-stats.
 */
/**
 * wineries — the tenancy container. Every paying customer = 1 winery row.
 *
 * Phase 1 (Feb 2026): table exists, every user gets one via auth flow,
 * but existing queries do NOT yet filter by winery_id. Data is still
 * shared across users until Phase 2 ships query-level enforcement.
 *
 * Bootstrap: created on server boot via CREATE TABLE IF NOT EXISTS in
 * server/index.ts, plus a Default Winery row containing legacy seed
 * data so nothing breaks.
 */
export const wineries = mysqlTable(
  "wineries",
  {
    id: int("id").primaryKey().autoincrement(),
    name: varchar("name", { length: 255 }).notNull(),
    contactName: varchar("contact_name", { length: 128 }),
    slug: varchar("slug", { length: 64 }).notNull().unique(),
    ownerUserId: int("owner_user_id").notNull(),
    plan: mysqlEnum("plan", ["free", "press", "amphora", "coopers", "founding_member"]).notNull().default("free"),
    region: varchar("region", { length: 128 }),
    brandColor: varchar("brand_color", { length: 16 }),
    logoUrl: varchar("logo_url", { length: 512 }),
    // Opt-in publication of /audit/<slug> public-facing audit page. Default
    // false — no operational data leaves the winery without explicit consent.
    publicAuditEnabled: boolean("public_audit_enabled").notNull().default(false),
    // Trial end timestamp (ms). Backfilled as created_at + 14 days by the
    // migration; extended by trial_credits_days when referrals convert.
    trialEndsAt: bigint("trial_ends_at", { mode: "number" }),
    trialCreditsDays: int("trial_credits_days").notNull().default(0),
    // Unique per-winery invite code (shape: SLUGPREFIX-XXXXXX). Referrals
    // land as `/hi/:slug?ref=<code>` — click captured, sign-up attributed.
    referralCode: varchar("referral_code", { length: 16 }),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("wineries_owner_idx").on(t.ownerUserId),
  ]
);

export const themePicks = mysqlTable(
  "theme_picks",
  {
    id: int("id").primaryKey().autoincrement(),
    themeId: varchar("theme_id", { length: 32 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    isFirstPick: boolean("is_first_pick").notNull().default(false),
    pickedAt: bigint("picked_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("tp_theme_idx").on(t.themeId),
    index("tp_picked_at_idx").on(t.pickedAt),
  ]
);

/**
 * theme_suggestions — events fired by the once-a-day ThemeSuggestion banner.
 *
 * Logged each time the banner is shown to a session and the user takes
 * an action (accepted | dismissed-today | opt-out). Captures the LOCAL
 * hour of day (0–23) the suggestion fired at so we can compute
 * acceptance rates by hour for the boutique-winery rhythm story.
 *
 * Created at runtime via `CREATE TABLE IF NOT EXISTS` on server boot
 * (see ensureThemeSuggestionsTable in server/index.ts) so deployments
 * don't need to run a separate migration step.
 */
export const themeSuggestions = mysqlTable(
  "theme_suggestions",
  {
    id: int("id").primaryKey().autoincrement(),
    suggestedThemeId: varchar("suggested_theme_id", { length: 32 }).notNull(),
    sessionId: varchar("session_id", { length: 64 }).notNull(),
    hourLocal: int("hour_local").notNull(),       // 0–23 in the user's local time
    isHarvestMonth: boolean("is_harvest_month").notNull().default(false),
    action: mysqlEnum("action", ["accepted", "dismissed", "opted_out"]).notNull(),
    loggedAt: bigint("logged_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("ts_theme_idx").on(t.suggestedThemeId),
    index("ts_hour_idx").on(t.hourLocal),
    index("ts_logged_at_idx").on(t.loggedAt),
  ]
);

// ─── Cellar Briefs (Feb 2026) ────────────────────────────────────────────────
//
// Persists every auto-generated Cellar Brief — twice-daily during vintage,
// weekly during maturation. Forms the customer's audit trail AND your
// marketing/case-study data layer. Owned by the winery (winery_id FK).
//
// summary_json shape:
//   {
//     execSummary: string,        // 2-sentence LLM-written headline
//     attentionCount: number,
//     decisionsDueCount: number,
//     cards: Array<{
//       vesselId: string,           // tank name or barrel id
//       vesselType: "tank" | "barrel",
//       variety: string,
//       stage: string,              // pre_ferment | primary_active | ...
//       daysInStage: number,
//       status: "ok" | "watch" | "attention",
//       trajectory: string,         // human-readable
//       todaysWork: string[],       // action items
//       decisionDue: string | null,
//       grounding: string[],        // e.g. ["SOP 11", "Red Wine Bible Ch.3"]
//     }>
//   }
export const cellarBriefs = mysqlTable(
  "cellar_briefs",
  {
    id: int("id").autoincrement().primaryKey(),
    wineryId: int("winery_id").notNull(),
    // Trigger window: 'morning' | 'evening' | 'weekly' | 'manual'
    trigger: varchar("trigger", { length: 16 }).notNull(),
    // Roll-up counts (denormalised from summary_json for fast list queries)
    attentionCount: int("attention_count").notNull().default(0),
    decisionsDueCount: int("decisions_due_count").notNull().default(0),
    tankCount: int("tank_count").notNull().default(0),
    // Full structured payload (cards + executive summary). Text not JSON
    // because MySQL JSON column has finicky version support; we parse it
    // in the application layer.
    summaryJson: text("summary_json").notNull(),
    // 2-sentence LLM-written headline pulled out for fast list display.
    execSummary: varchar("exec_summary", { length: 512 }),
    generatedAt: bigint("generated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("cb_winery_idx").on(t.wineryId),
    index("cb_generated_at_idx").on(t.generatedAt),
    index("cb_winery_generated_idx").on(t.wineryId, t.generatedAt),
  ]
);

/**
 * referrals — invite-a-winemaker growth loop.
 * Every winery has a unique referral_code; sharing /join?ref=CODE creates a
 * pending row; when the referred user signs up + converts to paid, referrer
 * earns 30 days trial credit.
 */
export const referrals = mysqlTable(
  "referrals",
  {
    id: int("id").autoincrement().primaryKey(),
    referrerWineryId: int("referrer_winery_id").notNull(),
    referralCode: varchar("referral_code", { length: 16 }).notNull(),
    referredEmail: varchar("referred_email", { length: 255 }),
    referredWineryId: int("referred_winery_id"),
    status: mysqlEnum("status", ["pending", "signed_up", "converted"]).notNull().default("pending"),
    rewardDaysGranted: int("reward_days_granted").notNull().default(0),
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    signedUpAt: bigint("signed_up_at", { mode: "number" }),
    convertedAt: bigint("converted_at", { mode: "number" }),
    nurturedAt: bigint("nurtured_at", { mode: "number" }),
  },
  (t) => [
    index("ref_referrer_idx").on(t.referrerWineryId),
    index("ref_code_idx").on(t.referralCode),
    index("ref_referred_idx").on(t.referredWineryId),
  ]
);
