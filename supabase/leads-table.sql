-- ============================================================
-- LEADS — per-agent contact/prospect list, either added manually
-- or synced in from the phone's own contacts.
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS leads (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name       text NOT NULL,
  phone      text,
  source     text NOT NULL DEFAULT 'manual',  -- 'manual', 'contact_sync'
  notes      text,
  created_at timestamptz DEFAULT now()
);

GRANT ALL ON TABLE leads TO service_role;

CREATE INDEX IF NOT EXISTS idx_leads_user ON leads(user_id);
