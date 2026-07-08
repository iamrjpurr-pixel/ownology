CREATE TABLE `admin_actions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`actor_email` varchar(200) NOT NULL,
	`target_gate_invite_id` int,
	`target_label` varchar(200),
	`action` varchar(40) NOT NULL,
	`payload` text,
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `admin_actions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cellar_briefs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`winery_id` int NOT NULL,
	`trigger` varchar(16) NOT NULL,
	`attention_count` int NOT NULL DEFAULT 0,
	`decisions_due_count` int NOT NULL DEFAULT 0,
	`tank_count` int NOT NULL DEFAULT 0,
	`summary_json` text NOT NULL,
	`exec_summary` varchar(512),
	`generated_at` bigint NOT NULL,
	CONSTRAINT `cellar_briefs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `event_ingests` (
	`id` int AUTO_INCREMENT NOT NULL,
	`url` varchar(500) NOT NULL,
	`event_name` varchar(200),
	`event_date_iso` varchar(12),
	`event_date_display` varchar(120),
	`venue` varchar(200),
	`address` varchar(300),
	`city` varchar(80),
	`tickets_url` varchar(500),
	`event_kind` varchar(32),
	`producers_json` text,
	`producer_count` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	`last_used_at` bigint,
	CONSTRAINT `event_ingests_id` PRIMARY KEY(`id`),
	CONSTRAINT `event_ingests_url_unique` UNIQUE(`url`)
);
--> statement-breakpoint
CREATE TABLE `founding_reservations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256) NOT NULL,
	`name` varchar(256) NOT NULL,
	`winery_name` varchar(256) NOT NULL,
	`phone` varchar(64),
	`tier` enum('cellar','press','cellar_master') NOT NULL DEFAULT 'cellar',
	`cycle` enum('monthly','annual') NOT NULL DEFAULT 'monthly',
	`referral_code` varchar(64),
	`source` varchar(64) NOT NULL DEFAULT 'pricing_modal',
	`status` enum('pending','contacted','paid','cancelled') NOT NULL DEFAULT 'pending',
	`reserved_at` bigint NOT NULL,
	`contacted_at` bigint,
	`notes` text,
	CONSTRAINT `founding_reservations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gate_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`kind` varchar(24) NOT NULL,
	`ip` varchar(64) NOT NULL,
	`user_agent` varchar(300),
	`path` varchar(300),
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `gate_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `gate_invites` (
	`id` int AUTO_INCREMENT NOT NULL,
	`token` varchar(48) NOT NULL,
	`label` varchar(120) NOT NULL,
	`tier` varchar(12) NOT NULL DEFAULT 'gate',
	`member_name` varchar(120),
	`winery_name` varchar(120),
	`private_note` text,
	`paused_at` bigint,
	`created_at` bigint NOT NULL,
	`expires_at` bigint,
	`first_used_at` bigint,
	`last_used_at` bigint,
	`use_count` int NOT NULL DEFAULT 0,
	`revoked_at` bigint,
	CONSTRAINT `gate_invites_id` PRIMARY KEY(`id`),
	CONSTRAINT `gate_invites_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `marketing_coach_lines` (
	`id` int AUTO_INCREMENT NOT NULL,
	`local_date` varchar(10) NOT NULL,
	`line` varchar(800) NOT NULL,
	`season` varchar(24),
	`generated_at` bigint NOT NULL,
	CONSTRAINT `marketing_coach_lines_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `marketing_task_completions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_slug` varchar(64) NOT NULL,
	`completed_at` bigint NOT NULL,
	`local_date` varchar(10) NOT NULL,
	`iso_week` varchar(8) NOT NULL,
	`notes` varchar(500),
	CONSTRAINT `marketing_task_completions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `member_activity` (
	`id` int AUTO_INCREMENT NOT NULL,
	`gate_invite_id` int,
	`user_id` int,
	`kind` varchar(40) NOT NULL,
	`details` text,
	`device_fp` varchar(64),
	`ip` varchar(64),
	`user_agent` varchar(300),
	`occurred_at` bigint NOT NULL,
	CONSTRAINT `member_activity_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`email` varchar(200) NOT NULL,
	`first_name` varchar(80),
	`winery` varchar(120),
	`winner_slug` varchar(80),
	`region` varchar(8),
	`captured_at` bigint NOT NULL,
	CONSTRAINT `quiz_leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `quiz_picks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`wine_type` varchar(16) NOT NULL,
	`fruit` varchar(16) NOT NULL,
	`body` varchar(16) NOT NULL,
	`sweetness` varchar(16) NOT NULL,
	`grip` varchar(16) NOT NULL,
	`age` varchar(16) NOT NULL,
	`budget` varchar(16) NOT NULL,
	`winner_slug` varchar(80) NOT NULL,
	`true_match_slug` varchar(80) NOT NULL,
	`region` varchar(8) NOT NULL,
	`cta_clicked_at` bigint,
	`picked_at` bigint NOT NULL,
	CONSTRAINT `quiz_picks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `referrals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`referrer_winery_id` int NOT NULL,
	`referral_code` varchar(16) NOT NULL,
	`referred_email` varchar(255),
	`referred_winery_id` int,
	`status` enum('pending','signed_up','converted') NOT NULL DEFAULT 'pending',
	`reward_days_granted` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`signed_up_at` bigint,
	`converted_at` bigint,
	`nurtured_at` bigint,
	CONSTRAINT `referrals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `theme_suggestions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`suggested_theme_id` varchar(32) NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`hour_local` int NOT NULL,
	`is_harvest_month` boolean NOT NULL DEFAULT false,
	`action` enum('accepted','dismissed','opted_out') NOT NULL,
	`logged_at` bigint NOT NULL,
	CONSTRAINT `theme_suggestions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vessel_qual_flags` (
	`id` int AUTO_INCREMENT NOT NULL,
	`winery_id` int NOT NULL,
	`vessel_id` varchar(40) NOT NULL,
	`flag_type` varchar(32) NOT NULL,
	`note` varchar(500),
	`flagged_at` bigint NOT NULL,
	`resolved_at` bigint,
	`resolved_note` varchar(500),
	CONSTRAINT `vessel_qual_flags_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wine_producers` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(200) NOT NULL,
	`country` varchar(4) NOT NULL,
	`region` varchar(120),
	`website` varchar(300),
	`email` varchar(200),
	`contact_name` varchar(120),
	`contact_role` varchar(120),
	`size_bracket` varchar(24),
	`phase1_source` varchar(60),
	`last_touched_at` bigint,
	`touch_count` int NOT NULL DEFAULT 0,
	`outreach_status` varchar(24) NOT NULL DEFAULT 'untouched',
	`created_at` bigint NOT NULL,
	CONSTRAINT `wine_producers_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wineries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`contact_name` varchar(128),
	`slug` varchar(64) NOT NULL,
	`owner_user_id` int NOT NULL,
	`plan` enum('free','press','amphora','coopers','founding_member') NOT NULL DEFAULT 'free',
	`region` varchar(128),
	`brand_color` varchar(16),
	`logo_url` varchar(512),
	`public_audit_enabled` boolean NOT NULL DEFAULT false,
	`trial_ends_at` bigint,
	`trial_credits_days` int NOT NULL DEFAULT 0,
	`referral_code` varchar(16),
	`created_at` bigint NOT NULL,
	CONSTRAINT `wineries_id` PRIMARY KEY(`id`),
	CONSTRAINT `wineries_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
ALTER TABLE `cellar_journal` MODIFY COLUMN `wine_type` enum('red','white','both','unknown','sparkling') NOT NULL DEFAULT 'unknown';--> statement-breakpoint
ALTER TABLE `barrels` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `cellar_equipment` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `cellar_tasks` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `ghost_questions` ADD `answer` text;--> statement-breakpoint
ALTER TABLE `ghost_questions` ADD `journal_slug` varchar(200);--> statement-breakpoint
ALTER TABLE `outreach_contacts` ADD `cta_clicked_at` bigint;--> statement-breakpoint
ALTER TABLE `outreach_contacts` ADD `persona` varchar(32);--> statement-breakpoint
ALTER TABLE `packaging_inventory` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `sop_library` ADD `boutique_companion` text;--> statement-breakpoint
ALTER TABLE `sop_training_records` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `sop_vintage_notes` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `tank_reminders` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `users` ADD `unit_system` varchar(16) DEFAULT 'metric' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `vineyard_blocks` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `vineyard_observations` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `vintage_log_entries` ADD `winery_id` int;--> statement-breakpoint
ALTER TABLE `wine_batches` ADD `winery_id` int;--> statement-breakpoint
CREATE INDEX `aa_target_idx` ON `admin_actions` (`target_gate_invite_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `aa_actor_idx` ON `admin_actions` (`actor_email`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `aa_recent_idx` ON `admin_actions` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `cb_winery_idx` ON `cellar_briefs` (`winery_id`);--> statement-breakpoint
CREATE INDEX `cb_generated_at_idx` ON `cellar_briefs` (`generated_at`);--> statement-breakpoint
CREATE INDEX `cb_winery_generated_idx` ON `cellar_briefs` (`winery_id`,`generated_at`);--> statement-breakpoint
CREATE INDEX `ei_created_idx` ON `event_ingests` (`created_at`);--> statement-breakpoint
CREATE INDEX `ei_event_name_idx` ON `event_ingests` (`event_name`);--> statement-breakpoint
CREATE INDEX `fr_email_idx` ON `founding_reservations` (`email`);--> statement-breakpoint
CREATE INDEX `fr_status_idx` ON `founding_reservations` (`status`);--> statement-breakpoint
CREATE INDEX `fr_reserved_at_idx` ON `founding_reservations` (`reserved_at`);--> statement-breakpoint
CREATE INDEX `ge_occurred_idx` ON `gate_events` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `ge_kind_idx` ON `gate_events` (`kind`);--> statement-breakpoint
CREATE INDEX `ge_ip_idx` ON `gate_events` (`ip`);--> statement-breakpoint
CREATE INDEX `gi_token_idx` ON `gate_invites` (`token`);--> statement-breakpoint
CREATE INDEX `gi_revoked_idx` ON `gate_invites` (`revoked_at`);--> statement-breakpoint
CREATE INDEX `gi_tier_idx` ON `gate_invites` (`tier`);--> statement-breakpoint
CREATE INDEX `mcl_localdate_idx` ON `marketing_coach_lines` (`local_date`);--> statement-breakpoint
CREATE INDEX `mtc_task_idx` ON `marketing_task_completions` (`task_slug`);--> statement-breakpoint
CREATE INDEX `mtc_localdate_idx` ON `marketing_task_completions` (`local_date`);--> statement-breakpoint
CREATE INDEX `mtc_isoweek_idx` ON `marketing_task_completions` (`iso_week`);--> statement-breakpoint
CREATE INDEX `ma_invite_idx` ON `member_activity` (`gate_invite_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ma_user_idx` ON `member_activity` (`user_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ma_kind_idx` ON `member_activity` (`kind`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `ma_recent_idx` ON `member_activity` (`occurred_at`);--> statement-breakpoint
CREATE INDEX `ql_captured_idx` ON `quiz_leads` (`captured_at`);--> statement-breakpoint
CREATE INDEX `ql_email_idx` ON `quiz_leads` (`email`);--> statement-breakpoint
CREATE INDEX `qp_picked_at_idx` ON `quiz_picks` (`picked_at`);--> statement-breakpoint
CREATE INDEX `qp_winner_idx` ON `quiz_picks` (`winner_slug`);--> statement-breakpoint
CREATE INDEX `qp_session_idx` ON `quiz_picks` (`session_id`);--> statement-breakpoint
CREATE INDEX `ref_referrer_idx` ON `referrals` (`referrer_winery_id`);--> statement-breakpoint
CREATE INDEX `ref_code_idx` ON `referrals` (`referral_code`);--> statement-breakpoint
CREATE INDEX `ref_referred_idx` ON `referrals` (`referred_winery_id`);--> statement-breakpoint
CREATE INDEX `ts_theme_idx` ON `theme_suggestions` (`suggested_theme_id`);--> statement-breakpoint
CREATE INDEX `ts_hour_idx` ON `theme_suggestions` (`hour_local`);--> statement-breakpoint
CREATE INDEX `ts_logged_at_idx` ON `theme_suggestions` (`logged_at`);--> statement-breakpoint
CREATE INDEX `vqf_winery_vessel_idx` ON `vessel_qual_flags` (`winery_id`,`vessel_id`);--> statement-breakpoint
CREATE INDEX `vqf_active_idx` ON `vessel_qual_flags` (`winery_id`,`resolved_at`);--> statement-breakpoint
CREATE INDEX `wp_country_idx` ON `wine_producers` (`country`);--> statement-breakpoint
CREATE INDEX `wp_region_idx` ON `wine_producers` (`region`);--> statement-breakpoint
CREATE INDEX `wp_outreach_idx` ON `wine_producers` (`outreach_status`);--> statement-breakpoint
CREATE INDEX `wineries_owner_idx` ON `wineries` (`owner_user_id`);--> statement-breakpoint
CREATE INDEX `barrel_winery_idx` ON `barrels` (`winery_id`);--> statement-breakpoint
CREATE INDEX `ce_winery_idx` ON `cellar_equipment` (`winery_id`);--> statement-breakpoint
CREATE INDEX `ct_winery_idx` ON `cellar_tasks` (`winery_id`);--> statement-breakpoint
CREATE INDEX `pkg_winery_idx` ON `packaging_inventory` (`winery_id`);--> statement-breakpoint
CREATE INDEX `str_winery_idx` ON `sop_training_records` (`winery_id`);--> statement-breakpoint
CREATE INDEX `svn_winery_idx` ON `sop_vintage_notes` (`winery_id`);--> statement-breakpoint
CREATE INDEX `tr_winery_idx` ON `tank_reminders` (`winery_id`);--> statement-breakpoint
CREATE INDEX `vb_winery_idx` ON `vineyard_blocks` (`winery_id`);--> statement-breakpoint
CREATE INDEX `vo_winery_idx` ON `vineyard_observations` (`winery_id`);--> statement-breakpoint
CREATE INDEX `vle_winery_idx` ON `vintage_log_entries` (`winery_id`);--> statement-breakpoint
CREATE INDEX `wb_winery_idx` ON `wine_batches` (`winery_id`);