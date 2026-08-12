-- ============================================================
-- RECENT QUOTES — status tracking (Close / Lost / Follow-up)
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS status text; -- 'followup' | 'lost' | 'closed' | null (not yet actioned)
