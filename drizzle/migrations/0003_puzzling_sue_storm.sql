ALTER TABLE `leads` ADD `stripe_customer_id` varchar(64);--> statement-breakpoint
ALTER TABLE `leads` ADD `stripe_paid` boolean DEFAULT false NOT NULL;