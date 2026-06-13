CREATE TABLE `cellar_equipment` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`name` varchar(128) NOT NULL,
	`equipment_type` enum('fermentation_tank','barrel','press','pump','sorting_table','destemmer','cold_room','hose','other') NOT NULL,
	`material` enum('stainless','wood','concrete','fibreglass','other') NOT NULL DEFAULT 'stainless',
	`capacity_l` int,
	`quantity` int NOT NULL DEFAULT 1,
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `cellar_equipment_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cellar_tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`equipment_id` int,
	`equipment_name` varchar(128) NOT NULL,
	`task_type` enum('clean','sanitise','inspect','maintain','other') NOT NULL,
	`title` varchar(256) NOT NULL,
	`method_notes` text,
	`frequency` varchar(64) NOT NULL DEFAULT 'After use',
	`due_at` bigint,
	`completed_at` bigint,
	`completed_by` varchar(256),
	`ai_generated` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `cellar_tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `wine_batches` MODIFY COLUMN `notes_json` text NOT NULL;--> statement-breakpoint
CREATE INDEX `ce_user_idx` ON `cellar_equipment` (`user_id`);--> statement-breakpoint
CREATE INDEX `ce_type_idx` ON `cellar_equipment` (`equipment_type`);--> statement-breakpoint
CREATE INDEX `ct_user_idx` ON `cellar_tasks` (`user_id`);--> statement-breakpoint
CREATE INDEX `ct_equipment_idx` ON `cellar_tasks` (`equipment_id`);--> statement-breakpoint
CREATE INDEX `ct_due_at_idx` ON `cellar_tasks` (`due_at`);--> statement-breakpoint
CREATE INDEX `ct_completed_at_idx` ON `cellar_tasks` (`completed_at`);