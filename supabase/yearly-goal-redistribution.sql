-- ============================================================
-- YEARLY GOAL — per-month editing with redistribution
-- Lets an agent edit one month's target (e.g. a slow season) and have
-- the difference spread evenly across the other months that haven't
-- been manually edited yet, while the yearly total stays fixed.
-- Run in Supabase SQL Editor
-- ============================================================

-- Tracks the fixed yearly target itself, separate from the 12 monthly
-- sales_goals rows (which drift as months get individually edited).
CREATE TABLE IF NOT EXISTS yearly_sales_goals (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  year           int NOT NULL,
  annual_target  numeric NOT NULL,
  PRIMARY KEY (user_id, year)
);

GRANT ALL ON TABLE yearly_sales_goals TO service_role;

-- A locked month was manually edited by the agent and is excluded from
-- future auto-redistribution when other months are edited.
ALTER TABLE sales_goals ADD COLUMN IF NOT EXISTS locked boolean NOT NULL DEFAULT false;
