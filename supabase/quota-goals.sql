-- ============================================================
-- QUOTA GOALS — separate from sales_goals/yearly_sales_goals.
-- Sales Goal tracks the actual quotation total; Quota tracks the net
-- pre_need_price figure (minus discount, trust, backwall) -- two
-- different numbers an agent can be measured against. Kept as its own
-- simple monthly target for now (no yearly redistribution/carry-forward
-- machinery like Sales Goal has -- can be added later if wanted).
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS quota_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period        text NOT NULL,                   -- 'YYYY-MM'
  target_amount numeric NOT NULL,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, period)
);

GRANT ALL ON TABLE quota_goals TO service_role;
