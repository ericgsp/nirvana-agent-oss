-- ============================================================
-- RECENT QUOTES — Close Sales date tracking
-- closed_at: when the sale was actually marked Close Sales (distinct from
-- created_at, which is when the quote was first generated/shared).
-- last_instalment_date: computed from closed_at + the longest instalment
-- period among the closed items, so agents can see when payments finish.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS closed_at timestamptz;
ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS last_instalment_date date;
