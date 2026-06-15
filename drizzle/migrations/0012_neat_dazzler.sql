-- Migration 0012: Add quick_steps column to sop_library
-- Note: sop_library, sop_training_records, sop_vintage_notes tables were
-- created manually in a prior session and already exist in the database.
-- This migration only adds the new quick_steps column.
ALTER TABLE `sop_library` ADD `quick_steps` text;