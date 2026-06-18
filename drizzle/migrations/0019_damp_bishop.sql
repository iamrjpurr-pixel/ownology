CREATE TABLE `trinity_newsletter_drafts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`period_label` varchar(20) NOT NULL,
	`subject` text NOT NULL,
	`body` text NOT NULL,
	`featured_ids_json` text NOT NULL DEFAULT ('[]'),
	`buttondown_email_id` varchar(128),
	`status` enum('preview','approved','sent','skipped','failed') NOT NULL DEFAULT 'preview',
	`preview_until` bigint NOT NULL,
	`sent_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `trinity_newsletter_drafts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `tnd_status_idx` ON `trinity_newsletter_drafts` (`status`);--> statement-breakpoint
CREATE INDEX `tnd_period_idx` ON `trinity_newsletter_drafts` (`period_label`);--> statement-breakpoint
CREATE INDEX `tnd_preview_until_idx` ON `trinity_newsletter_drafts` (`preview_until`);