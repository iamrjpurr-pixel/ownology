CREATE TABLE `wine_batches` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`batch_id` varchar(32) NOT NULL,
	`vintage` int NOT NULL,
	`variety` varchar(128) NOT NULL,
	`gi` varchar(128) NOT NULL DEFAULT '',
	`grower_details` text,
	`received_at` bigint,
	`quantity_value` varchar(32),
	`quantity_unit` enum('kg','t','L') DEFAULT 'kg',
	`tank_name` varchar(128),
	`notes_json` text NOT NULL DEFAULT ('{}'),
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `wine_batches_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE INDEX `wb_user_idx` ON `wine_batches` (`user_id`);--> statement-breakpoint
CREATE INDEX `wb_vintage_idx` ON `wine_batches` (`vintage`);--> statement-breakpoint
CREATE INDEX `wb_batch_id_idx` ON `wine_batches` (`batch_id`);