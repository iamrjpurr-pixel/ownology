CREATE TABLE `ghost_questions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wbs_code` varchar(10) NOT NULL,
	`wine_type` varchar(10) NOT NULL DEFAULT 'general',
	`question` text NOT NULL,
	`difficulty` varchar(20) NOT NULL DEFAULT 'beginner',
	`category` varchar(50),
	`active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	CONSTRAINT `ghost_questions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `diy_knowledge_chunks` ADD `wbs_domain` varchar(10);--> statement-breakpoint
ALTER TABLE `diy_knowledge_chunks` ADD `wbs_process_family` varchar(10);--> statement-breakpoint
ALTER TABLE `diy_knowledge_chunks` ADD `wbs_code` varchar(10);--> statement-breakpoint
ALTER TABLE `diy_knowledge_chunks` ADD `published` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `diy_knowledge_chunks` ADD `published_at` bigint;--> statement-breakpoint
ALTER TABLE `sop_library` ADD `wbs_domain` varchar(10);--> statement-breakpoint
ALTER TABLE `sop_library` ADD `wbs_process_family` varchar(10);--> statement-breakpoint
ALTER TABLE `sop_library` ADD `wbs_code` varchar(10);--> statement-breakpoint
ALTER TABLE `sop_library` ADD `bible_chapters` varchar(255);--> statement-breakpoint
ALTER TABLE `sop_library` ADD `published` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `sop_library` ADD `published_at` bigint;--> statement-breakpoint
CREATE INDEX `gq_wbs_code_idx` ON `ghost_questions` (`wbs_code`);--> statement-breakpoint
CREATE INDEX `gq_wine_type_idx` ON `ghost_questions` (`wine_type`);--> statement-breakpoint
CREATE INDEX `gq_difficulty_idx` ON `ghost_questions` (`difficulty`);--> statement-breakpoint
CREATE INDEX `gq_active_idx` ON `ghost_questions` (`active`);--> statement-breakpoint
CREATE INDEX `dkc_wbs_code_idx` ON `diy_knowledge_chunks` (`wbs_code`);--> statement-breakpoint
CREATE INDEX `dkc_published_idx` ON `diy_knowledge_chunks` (`published`);--> statement-breakpoint
CREATE INDEX `sop_wbs_code_idx` ON `sop_library` (`wbs_code`);--> statement-breakpoint
CREATE INDEX `sop_published_idx` ON `sop_library` (`published`);