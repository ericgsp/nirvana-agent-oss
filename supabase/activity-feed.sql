-- ACTIVITY FEED — company-wide "xyz closed a case" events (Facebook-style
-- notification feed), plus per-user read tracking for the unread badge.
CREATE TABLE IF NOT EXISTS activity_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL DEFAULT 'case_closed',
  user_id uuid NOT NULL,
  display_name text NOT NULL,
  site text,
  product text,
  section text,
  category text,
  amount numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS activity_events_created_idx ON activity_events (created_at DESC);

GRANT ALL ON TABLE activity_events TO service_role;

-- One row per user: the last time they opened the activity feed. Unread
-- count = events created after this timestamp.
CREATE TABLE IF NOT EXISTS activity_reads (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON TABLE activity_reads TO service_role;
