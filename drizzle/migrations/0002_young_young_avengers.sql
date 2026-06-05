CREATE TABLE `leads` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256) NOT NULL,
	`source` varchar(64) NOT NULL DEFAULT 'unknown',
	`tags_json` text NOT NULL DEFAULT ('[]'),
	`name` varchar(256),
	`winery_name` varchar(256),
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `leads_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tank_reminders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tank_name` varchar(128) NOT NULL,
	`event_type` enum('addition','measurement','racking','inoculation','observation','any') NOT NULL DEFAULT 'any',
	`threshold_hours` int NOT NULL DEFAULT 24,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `tank_reminders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vintage_log_entries` MODIFY COLUMN `details_json` text NOT NULL;--> statement-breakpoint
ALTER TABLE `vintage_log_entries` MODIFY COLUMN `tags_json` text NOT NULL;--> statement-breakpoint
CREATE INDEX `leads_email_idx` ON `leads` (`email`);--> statement-breakpoint
CREATE INDEX `leads_source_idx` ON `leads` (`source`);--> statement-breakpoint
CREATE INDEX `leads_created_at_idx` ON `leads` (`created_at`);--> statement-breakpoint
CREATE INDEX `tr_user_idx` ON `tank_reminders` (`user_id`);--> statement-breakpoint
CREATE INDEX `tr_tank_idx` ON `tank_reminders` (`tank_name`);