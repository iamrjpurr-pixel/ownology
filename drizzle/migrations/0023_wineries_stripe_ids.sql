-- 0023 · Add Stripe identifiers to wineries
--
-- Why: the /api/stripe/webhook code (server/merch/api.ts, Feb 2026) writes
-- wineries.stripe_customer_id on subscription checkout completion and reads
-- it back on customer.subscription.deleted / .updated events to keep
-- wineries.plan in sync with Stripe. Those columns previously only existed
-- on `founding_members` and `leads` — the tenant-level (wineries) columns
-- were missing, so the webhook would silently no-op on all update paths.
--
-- stripe_subscription_id: optional but useful for admin lookups + prorate
-- calculations on tier switches. Set on checkout.session.completed via the
-- session.subscription field.
--
-- Feb 2026 · Rich.

ALTER TABLE `wineries` ADD `stripe_customer_id` varchar(64);--> statement-breakpoint
ALTER TABLE `wineries` ADD `stripe_subscription_id` varchar(64);--> statement-breakpoint
CREATE INDEX `wineries_stripe_customer_idx` ON `wineries` (`stripe_customer_id`);
