CREATE TABLE `vintage_intelligence` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region` varchar(128) NOT NULL,
	`year` int NOT NULL,
	`state` varchar(10) NOT NULL,
	`country` varchar(64) NOT NULL DEFAULT 'Australia',
	`conditions` text NOT NULL,
	`standout_varieties` varchar(512),
	`quality_rating` int NOT NULL DEFAULT 3,
	`yield_assessment` varchar(256),
	`winemaking_notes` text,
	`source` varchar(512),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `vintage_intelligence_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `sop_library` ADD `audience` varchar(20) DEFAULT 'commercial' NOT NULL;--> statement-breakpoint
ALTER TABLE `vintage_log_entries` ADD `import_source` varchar(32);--> statement-breakpoint
ALTER TABLE `vintage_log_entries` ADD `import_batch_id` varchar(64);--> statement-breakpoint
CREATE INDEX `vi_region_year_idx` ON `vintage_intelligence` (`region`,`year`);--> statement-breakpoint
CREATE INDEX `vi_state_idx` ON `vintage_intelligence` (`state`);--> statement-breakpoint
CREATE INDEX `vi_year_idx` ON `vintage_intelligence` (`year`);