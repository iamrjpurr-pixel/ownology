CREATE TABLE `published_trinity_responses` (
	`id` int AUTO_INCREMENT NOT NULL,
	`question_canonical` text NOT NULL,
	`excerpt` text,
	`content_science` text,
	`content_vineyard` text,
	`content_craft` text,
	`primary_act` enum('science','vineyard','craft') NOT NULL DEFAULT 'science',
	`topic_tag` varchar(100),
	`status` enum('pending','featured','suppressed') NOT NULL DEFAULT 'pending',
	`cluster_size` int NOT NULL DEFAULT 1,
	`member_reveal_ids_json` text NOT NULL DEFAULT ('[]'),
	`source_reveal_id` int,
	`accuracy_flag` boolean NOT NULL DEFAULT false,
	`accuracy_note` text,
	`published_at` bigint,
	`featured_at` bigint,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `published_trinity_responses_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `trinity_faq_clusters` (
	`id` int AUTO_INCREMENT NOT NULL,
	`canonical_question` text NOT NULL,
	`answer` text NOT NULL,
	`cluster_size` int NOT NULL DEFAULT 1,
	`rank` int NOT NULL DEFAULT 0,
	`active` boolean NOT NULL DEFAULT true,
	`generated_at` bigint NOT NULL,
	CONSTRAINT `trinity_faq_clusters_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `go_deeper_reveals` ADD `clustered_at` bigint;--> statement-breakpoint
ALTER TABLE `go_deeper_reveals` ADD `published_trinity_id` int;--> statement-breakpoint
CREATE INDEX `ptr_status_idx` ON `published_trinity_responses` (`status`);--> statement-breakpoint
CREATE INDEX `ptr_primary_act_idx` ON `published_trinity_responses` (`primary_act`);--> statement-breakpoint
CREATE INDEX `ptr_published_at_idx` ON `published_trinity_responses` (`published_at`);--> statement-breakpoint
CREATE INDEX `ptr_accuracy_idx` ON `published_trinity_responses` (`accuracy_flag`);--> statement-breakpoint
CREATE INDEX `tfc_rank_idx` ON `trinity_faq_clusters` (`rank`);--> statement-breakpoint
CREATE INDEX `tfc_active_idx` ON `trinity_faq_clusters` (`active`);--> statement-breakpoint
CREATE INDEX `gdr_clustered_idx` ON `go_deeper_reveals` (`clustered_at`);