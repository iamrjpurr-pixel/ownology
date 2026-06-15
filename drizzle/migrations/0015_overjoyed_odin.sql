CREATE TABLE `diy_knowledge_chunks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`source_doc` varchar(64) NOT NULL,
	`wine_type` varchar(16) NOT NULL DEFAULT 'general',
	`chapter_ref` varchar(32),
	`chapter_title` varchar(256),
	`topic_tags` varchar(512),
	`content` text NOT NULL,
	`chunk_index` int NOT NULL DEFAULT 0,
	`created_at` bigint NOT NULL,
	CONSTRAINT `diy_knowledge_chunks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `dkc_source_doc_idx` ON `diy_knowledge_chunks` (`source_doc`);--> statement-breakpoint
CREATE INDEX `dkc_wine_type_idx` ON `diy_knowledge_chunks` (`wine_type`);--> statement-breakpoint
CREATE INDEX `dkc_chapter_idx` ON `diy_knowledge_chunks` (`chapter_ref`);