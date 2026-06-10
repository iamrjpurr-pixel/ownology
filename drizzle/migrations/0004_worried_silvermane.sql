CREATE TABLE `site_content` (
	`id` int AUTO_INCREMENT NOT NULL,
	`content_key` varchar(256) NOT NULL,
	`value` text NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `site_content_id` PRIMARY KEY(`id`),
	CONSTRAINT `site_content_content_key_unique` UNIQUE(`content_key`)
);
