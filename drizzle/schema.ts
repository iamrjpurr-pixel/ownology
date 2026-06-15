import { mysqlTable, varchar, int, bigint, text, mysqlEnum, index, boolean, float } from "drizzle-orm/mysql-core";

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

// ─── Barrels ──────────────────────────────────────────────────────────────────
// DR-08: Barrel sub-module. One row per barrel. Topping, fill, and wine lot
// tracked here; cellar events are logged via vintage_log_entries with
// tankName set to the barrel's barrelId.
export const barrels = mysqlTable(
  "barrels",
  {
    id: int("id").autoincrement().primaryKey(),
    userId: int("user_id").notNull(),
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
    format: mysqlEnum("format", [
      "Barrique (225L)",
      "Hogshead (300L)",
      "Puncheon (500L)",
      "Foudre (>500L)",
      "Other",
    ])
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
    createdAt: bigint("created_at", { mode: "number" }).notNull(),
    updatedAt: bigint("updated_at", { mode: "number" }).notNull(),
  },
  (t) => [
    index("sop_category_idx").on(t.category),
    index("sop_sort_idx").on(t.category, t.sortOrder),
  ]
);

// ─── Knowledge Platform — SOP Vintage Notes (Sprint 7) ──────────────────────
// One row per (sop_id, vintage_year) entry. Captures what worked, what failed,
// and what to change next vintage. Optionally linked to a wine batch.
export const sopVintageNotes = mysqlTable(
  "sop_vintage_notes",
  {
    id: int("id").autoincrement().primaryKey(),
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
