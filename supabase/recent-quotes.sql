-- ============================================================
-- RECENT QUOTES
-- Logged once per deliberate action (agent taps "Print/Share" on a
-- generated quotation), not per intermediate lot selection -- keeps
-- this a low-noise "quotes generated" signal for the Home tab.
-- user_id is nullable because /agent is usable without login.
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS recent_quotes (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  site        text,
  product     text,
  section     text,
  net_total   numeric,
  created_at  timestamptz DEFAULT now()
);

GRANT ALL ON TABLE recent_quotes TO service_role;

CREATE INDEX IF NOT EXISTS idx_recent_quotes_user_created ON recent_quotes(user_id, created_at DESC);
