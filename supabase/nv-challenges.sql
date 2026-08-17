-- NV CHALLENGE — admin-set challenge window + target, so the Home tab can
-- show accumulated quota vs. the challenge target (challenges run 2-3
-- months, so this is not the same figure as the monthly/yearly quota).
CREATE TABLE IF NOT EXISTS nv_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  target_amount numeric NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON TABLE nv_challenges TO service_role;

CREATE INDEX IF NOT EXISTS nv_challenges_dates_idx ON nv_challenges (start_date, end_date);
