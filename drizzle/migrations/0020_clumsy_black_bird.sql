CREATE TABLE `ai_answer_feedback` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int,
	`proc_name` varchar(64) NOT NULL,
	`question` text NOT NULL,
	`answer_hash` varchar(32) NOT NULL,
	`score` int NOT NULL,
	`note` varchar(500),
	`created_at` bigint NOT NULL,
	CONSTRAINT `ai_answer_feedback_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `cellar_journal` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(200) NOT NULL,
	`question` varchar(500) NOT NULL,
	`topic_tag` varchar(100) NOT NULL,
	`full_answer` text NOT NULL,
	`teaser_answer` text NOT NULL,
	`diagnosis` varchar(600),
	`source` varchar(50) NOT NULL,
	`audience` varchar(30),
	`citations` text,
	`wine_type` enum('red','white','both','unknown') NOT NULL DEFAULT 'unknown',
	`view_count` int NOT NULL DEFAULT 0,
	`asked_count` int NOT NULL DEFAULT 1,
	`embedding` text,
	`variants` text,
	`featured` boolean NOT NULL DEFAULT false,
	`published` boolean NOT NULL DEFAULT true,
	`first_asked_at` bigint NOT NULL,
	`last_asked_at` bigint NOT NULL,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `cellar_journal_id` PRIMARY KEY(`id`),
	CONSTRAINT `cellar_journal_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `pricing_views` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source` varchar(32) NOT NULL,
	`user_id` int,
	`referer` varchar(500),
	`user_agent` varchar(500),
	`viewed_at` bigint NOT NULL,
	CONSTRAINT `pricing_views_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `barrels` MODIFY COLUMN `format` varchar(64) NOT NULL DEFAULT 'Barrique (225L)';--> statement-breakpoint
ALTER TABLE `regulation_monitor_seen` MODIFY COLUMN `publication_url` varchar(512) NOT NULL;--> statement-breakpoint
ALTER TABLE `trinity_newsletter_drafts` MODIFY COLUMN `featured_ids_json` text NOT NULL;--> statement-breakpoint
CREATE INDEX `aaf_proc_idx` ON `ai_answer_feedback` (`proc_name`,`created_at`);--> statement-breakpoint
CREATE INDEX `aaf_score_idx` ON `ai_answer_feedback` (`score`);--> statement-breakpoint
CREATE INDEX `cj_topic_idx` ON `cellar_journal` (`topic_tag`);--> statement-breakpoint
CREATE INDEX `cj_published_idx` ON `cellar_journal` (`published`,`last_asked_at`);--> statement-breakpoint
CREATE INDEX `cj_featured_idx` ON `cellar_journal` (`featured`,`last_asked_at`);--> statement-breakpoint
CREATE INDEX `cj_views_idx` ON `cellar_journal` (`view_count`);--> statement-breakpoint
CREATE INDEX `pv_source_idx` ON `pricing_views` (`source`,`viewed_at`);--> statement-breakpoint
CREATE INDEX `pv_viewed_idx` ON `pricing_views` (`viewed_at`);