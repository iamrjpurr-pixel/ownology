CREATE TABLE `barrels` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`barrel_id` varchar(64) NOT NULL,
	`oak_type` enum('French','American','Hungarian','Slavonian','Other') NOT NULL DEFAULT 'French',
	`format` enum('Barriqu') NOT NULL DEFAULT 'Barrique (225L)',
	`age_years` int NOT NULL DEFAULT 0,
	`fill_date` bigint,
	`last_topped_date` bigint,
	`wine_lot` varchar(256),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `barrels_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `packaging_inventory` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`item_name` varchar(256) NOT NULL,
	`category` enum('bottle','label','capsule','cork','box','other') NOT NULL DEFAULT 'other',
	`quantity_on_hand` int NOT NULL DEFAULT 0,
	`reorder_level` int NOT NULL DEFAULT 0,
	`unit` varchar(32) NOT NULL DEFAULT 'units',
	`notes` text,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `packaging_inventory_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vineyard_blocks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`block_name` varchar(128) NOT NULL,
	`variety` varchar(128) NOT NULL,
	`area_ha` float,
	`planting_year` int,
	`rootstock` varchar(128),
	`training_system` enum('VSP','Scott Henry','Smart-Dyson','Pergola','Bush Vine','Other') DEFAULT 'VSP',
	`soil_type` varchar(256),
	`aspect` varchar(256),
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_at` bigint NOT NULL,
	`updated_at` bigint NOT NULL,
	CONSTRAINT `vineyard_blocks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vineyard_observations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` int NOT NULL,
	`block_id` int NOT NULL,
	`observation_type` enum('budburst','flowering','veraison','harvest_date','spray_application','irrigation','canopy_management','disease_scouting','yield_estimate','other') NOT NULL,
	`observed_at` bigint NOT NULL,
	`vintage_year` int NOT NULL,
	`value` float,
	`unit` varchar(32),
	`notes` text,
	`created_at` bigint NOT NULL,
	CONSTRAINT `vineyard_observations_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `vintage_log_entries` MODIFY COLUMN `event_type` enum('addition','measurement','racking','inoculation','observation','pre_harvest_sample','bottling_run','weather_event','other') NOT NULL;--> statement-breakpoint
ALTER TABLE `cellar_tasks` ADD `vessel_id` varchar(128);--> statement-breakpoint
ALTER TABLE `cellar_tasks` ADD `vessel_type` enum('tank','barrel','other');--> statement-breakpoint
ALTER TABLE `wine_batches` ADD `cost_per_litre` int;--> statement-breakpoint
CREATE INDEX `barrel_user_idx` ON `barrels` (`user_id`);--> statement-breakpoint
CREATE INDEX `barrel_id_user_idx` ON `barrels` (`barrel_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `pkg_user_idx` ON `packaging_inventory` (`user_id`);--> statement-breakpoint
CREATE INDEX `pkg_category_idx` ON `packaging_inventory` (`category`);--> statement-breakpoint
CREATE INDEX `vb_user_idx` ON `vineyard_blocks` (`user_id`);--> statement-breakpoint
CREATE INDEX `vb_block_name_idx` ON `vineyard_blocks` (`block_name`,`user_id`);--> statement-breakpoint
CREATE INDEX `vo_user_idx` ON `vineyard_observations` (`user_id`);--> statement-breakpoint
CREATE INDEX `vo_block_idx` ON `vineyard_observations` (`block_id`);--> statement-breakpoint
CREATE INDEX `vo_vintage_idx` ON `vineyard_observations` (`vintage_year`);--> statement-breakpoint
CREATE INDEX `ct_vessel_idx` ON `cellar_tasks` (`vessel_id`);