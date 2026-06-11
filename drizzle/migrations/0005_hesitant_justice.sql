CREATE TABLE `regulation_monitor_seen` (
	`id` int AUTO_INCREMENT NOT NULL,
	`publication_url` varchar(1024) NOT NULL,
	`title` varchar(512) NOT NULL,
	`source` varchar(128) NOT NULL,
	`first_seen_at` bigint NOT NULL,
	`notified` int NOT NULL DEFAULT 0,
	CONSTRAINT `regulation_monitor_seen_id` PRIMARY KEY(`id`),
	CONSTRAINT `regulation_monitor_seen_publication_url_unique` UNIQUE(`publication_url`)
);
--> statement-breakpoint
CREATE INDEX `rms_source_idx` ON `regulation_monitor_seen` (`source`);--> statement-breakpoint
CREATE INDEX `rms_seen_at_idx` ON `regulation_monitor_seen` (`first_seen_at`);