-- ============================================================
-- RECENT QUOTES — link each quote to a lead
-- First step of moving quote/follow-up management into the Leads tab.
-- Nullable: existing quotes stay unlinked (lead_id = null) and keep
-- working exactly as before until the quote-logging flow is updated
-- to actually populate this column.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE recent_quotes ADD COLUMN IF NOT EXISTS lead_id uuid REFERENCES leads(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_recent_quotes_lead_id ON recent_quotes(lead_id);
