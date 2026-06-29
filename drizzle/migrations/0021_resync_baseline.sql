CREATE TABLE `outreach_contacts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(80) NOT NULL,
	`first_name` varchar(80) NOT NULL,
	`last_name` varchar(80),
	`mobile_au` varchar(20),
	`winery` varchar(120),
	`event` varchar(120),
	`pain_point` varchar(300),
	`calendly_override` varchar(300),
	`sms_sent_at` bigint,
	`first_viewed_at` bigint,
	`view_count` int NOT NULL DEFAULT 0,
	`demo_booked_at` bigint,
	`replied_at` bigint,
	`notes` varchar(500),
	`sms_draft_override` varchar(500),
	`status` varchar(16) NOT NULL DEFAULT 'cold',
	`created_at` bigint NOT NULL,
	CONSTRAINT `outreach_contacts_id` PRIMARY KEY(`id`),
	CONSTRAINT `outreach_contacts_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `theme_picks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`theme_id` varchar(32) NOT NULL,
	`session_id` varchar(64) NOT NULL,
	`is_first_pick` boolean NOT NULL DEFAULT false,
	`picked_at` bigint NOT NULL,
	CONSTRAINT `theme_picks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `oc_slug_idx` ON `outreach_contacts` (`slug`);--> statement-breakpoint
CREATE INDEX `oc_event_idx` ON `outreach_contacts` (`event`);--> statement-breakpoint
CREATE INDEX `oc_status_idx` ON `outreach_contacts` (`status`);--> statement-breakpoint
CREATE INDEX `tp_theme_idx` ON `theme_picks` (`theme_id`);--> statement-breakpoint
CREATE INDEX `tp_picked_at_idx` ON `theme_picks` (`picked_at`);