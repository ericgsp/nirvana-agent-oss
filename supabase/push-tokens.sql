-- PUSH TOKENS — one row per (user, device). A user can have multiple
-- devices; a token is replaced if the same device re-registers (FCM
-- tokens can rotate).
CREATE TABLE IF NOT EXISTS push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  platform text NOT NULL DEFAULT 'android',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS push_tokens_user_idx ON push_tokens (user_id);

GRANT ALL ON TABLE push_tokens TO service_role;
