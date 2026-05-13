CREATE TABLE `campaign_metrics_snapshots` (
	`id` int AUTO_INCREMENT NOT NULL,
	`week_label` varchar(10) NOT NULL,
	`snapshot_at` bigint NOT NULL,
	`waitlist_count` int NOT NULL DEFAULT 0,
	`email_open_rate` int NOT NULL DEFAULT 0,
	`email_click_rate` int NOT NULL DEFAULT 0,
	`organic_sessions` int NOT NULL DEFAULT 0,
	`top_keyword_rank` int NOT NULL DEFAULT 0,
	`founding_member_count` int NOT NULL DEFAULT 0,
	`mrr` int NOT NULL DEFAULT 0,
	`merch_orders` int NOT NULL DEFAULT 0,
	`merch_revenue` int NOT NULL DEFAULT 0,
	`compliance_queries` int NOT NULL DEFAULT 0,
	`notes` text,
	CONSTRAINT `campaign_metrics_snapshots_id` PRIMARY KEY(`id`),
	CONSTRAINT `campaign_metrics_snapshots_week_label_unique` UNIQUE(`week_label`)
);
--> statement-breakpoint
CREATE TABLE `founding_members` (
	`id` int AUTO_INCREMENT NOT NULL,
	`email` varchar(256) NOT NULL,
	`name` varchar(256),
	`winery_name` varchar(256),
	`state` varchar(10),
	`tier` enum('cellar','press','cellar_master') NOT NULL DEFAULT 'cellar',
	`stripe_customer_id` varchar(64),
	`joined_at` bigint NOT NULL,
	`notes` text,
	CONSTRAINT `founding_members_id` PRIMARY KEY(`id`),
	CONSTRAINT `founding_members_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`open_id` varchar(128) NOT NULL,
	`name` varchar(256),
	`email` varchar(256),
	`role` enum('admin','user') NOT NULL DEFAULT 'user',
	`created_at` bigint NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_open_id_unique` UNIQUE(`open_id`)
);
--> statement-breakpoint
CREATE INDEX `week_label_idx` ON `campaign_metrics_snapshots` (`week_label`);