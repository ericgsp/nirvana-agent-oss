-- ============================================================
-- LEADS — labels + next-action date, for real follow-up management
-- label: agent-set tag, fixed set (not free text) so filtering works
-- next_action_date: when the agent should next follow up this lead
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE leads ADD COLUMN IF NOT EXISTS label text NOT NULL DEFAULT 'prospect'
  CHECK (label IN ('prospect', 'hot', 'cold', 'customer'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS next_action_date date;

CREATE INDEX IF NOT EXISTS idx_leads_next_action ON leads(next_action_date);
