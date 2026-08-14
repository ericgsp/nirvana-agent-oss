-- ============================================================
-- RECENT QUOTES — save the exact rendered quote as it was shared
-- Stores the actual quote-table HTML at Share time, so viewing a past
-- quote later shows exactly what the customer saw, unaffected by any
-- later pricing/promo/rendering changes.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS quote_snapshot_html text;
