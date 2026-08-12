-- ============================================================
-- YEARLY GOAL — carry-forward shortfall from missed past months
-- Run in Supabase SQL Editor
-- ============================================================

-- Marks a past month's shortfall as already offered to the agent (accepted
-- or denied), so the carry-forward prompt doesn't ask about it again.
ALTER TABLE sales_goals ADD COLUMN IF NOT EXISTS carry_forward_handled boolean NOT NULL DEFAULT false;
