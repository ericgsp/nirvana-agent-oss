-- ============================================================
-- RECENT QUOTES — customer info, itemized breakdown, valid-until
-- Adds the fields needed for the Me tab to actually be useful for
-- follow-up: who the quote was for, what was quoted (per item), the
-- real total (was never being sent from the client before this), and
-- the earliest promo expiry across the quoted items.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS customer_name  text;
ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS valid_until    date;
ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS items          jsonb;
