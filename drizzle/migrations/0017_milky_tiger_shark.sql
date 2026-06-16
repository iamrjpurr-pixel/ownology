CREATE TABLE `free_run_credits` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`balance` int NOT NULL DEFAULT 0,
	`total_purchased` int NOT NULL DEFAULT 0,
	`total_consumed` int NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `free_run_credits_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `free_run_daily_usage` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`date_key` varchar(10) NOT NULL,
	`question_count` int NOT NULL DEFAULT 0,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `free_run_daily_usage_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `go_deeper_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`reveal_id` int NOT NULL,
	`panel` enum('science','vineyard','craft') NOT NULL,
	`thumbs_up` boolean NOT NULL,
	`created_at` bigint NOT NULL,
	CONSTRAINT `go_deeper_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `go_deeper_reveals` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`question` text NOT NULL,
	`topic_tag` varchar(100),
	`surface_answer` text NOT NULL,
	`science_panel` text,
	`vineyard_panel` text,
	`craft_panel` text,
	`was_free_hook` boolean NOT NULL DEFAULT false,
	`credits_consumed` int NOT NULL DEFAULT 1,
	`created_at` bigint NOT NULL,
	CONSTRAINT `go_deeper_reveals_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `fru_user_date_idx` ON `free_run_daily_usage` (`user_id`,`date_key`);--> statement-breakpoint
CREATE INDEX `gdf_reveal_idx` ON `go_deeper_feedback` (`reveal_id`);--> statement-breakpoint
CREATE INDEX `gdf_panel_idx` ON `go_deeper_feedback` (`panel`);--> statement-breakpoint
CREATE INDEX `gdf_user_idx` ON `go_deeper_feedback` (`user_id`);--> statement-breakpoint
CREATE INDEX `gdr_user_idx` ON `go_deeper_reveals` (`user_id`);--> statement-breakpoint
CREATE INDEX `gdr_topic_idx` ON `go_deeper_reveals` (`topic_tag`);