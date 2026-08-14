-- ============================================================
-- RECENT QUOTES — record exactly which items were closed
-- The Mark Sold checklist lets an agent select a subset of a quote's
-- items (they might not have sold everything quoted); until now only the
-- summed amount was recorded, not which items that amount came from.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS closed_items jsonb;
