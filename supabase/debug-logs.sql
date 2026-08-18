-- DEBUG LOGS — generic scratch table for temporary server-side debugging,
-- since console.log output doesn't surface through the Vercel CLI on this
-- plan tier. Not meant to be permanent; individual debug statements that
-- write here should be removed once whatever they're diagnosing is fixed.
CREATE TABLE IF NOT EXISTS debug_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text NOT NULL,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS debug_logs_tag_idx ON debug_logs (tag, created_at DESC);

GRANT ALL ON TABLE debug_logs TO service_role;
