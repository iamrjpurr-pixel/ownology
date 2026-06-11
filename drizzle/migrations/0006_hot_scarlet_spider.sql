CREATE TABLE `doctrine_verified` (
	`id` int AUTO_INCREMENT NOT NULL,
	`doctrine_id` varchar(128) NOT NULL,
	`verified_at` bigint NOT NULL,
	`notes` text,
	CONSTRAINT `doctrine_verified_id` PRIMARY KEY(`id`),
	CONSTRAINT `doctrine_verified_doctrine_id_unique` UNIQUE(`doctrine_id`)
);
--> statement-breakpoint
CREATE INDEX `dv_doctrine_id_idx` ON `doctrine_verified` (`doctrine_id`);--> statement-breakpoint
CREATE INDEX `dv_verified_at_idx` ON `doctrine_verified` (`verified_at`);