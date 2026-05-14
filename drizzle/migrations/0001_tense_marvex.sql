CREATE TABLE `vintage_log_entries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`tank_name` varchar(128) NOT NULL,
	`variety` varchar(128) NOT NULL,
	`event_type` enum('addition','measurement','racking','inoculation','observation','other') NOT NULL,
	`details_json` text NOT NULL DEFAULT ('{}'),
	`note_text` text,
	`tags_json` text NOT NULL DEFAULT ('[]'),
	`entry_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `vintage_log_entries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `vle_user_idx` ON `vintage_log_entries` (`user_id`);--> statement-breakpoint
CREATE INDEX `vle_entry_at_idx` ON `vintage_log_entries` (`entry_at`);--> statement-breakpoint
CREATE INDEX `vle_tank_idx` ON `vintage_log_entries` (`tank_name`);