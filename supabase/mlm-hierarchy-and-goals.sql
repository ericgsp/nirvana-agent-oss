-- ============================================================
-- MLM HIERARCHY, SALES GOALS, SALES LOG
-- 5-tier structure: CBDD > BDD > DSD > SD > AGENT.
-- Visibility rule (enforced in app code via lib/supabase/get-hierarchy.ts,
-- NOT via RLS — matches this project's existing convention of doing access
-- control in server actions/route handlers with the service-role client):
--   - Every tier, including CBDD, sees only their own direct downline
--     (leader_id = me), never the tier above or a peer's team.
--   - Only the "admin" app role (separate from MLM tier) sees everyone.
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_profiles (
  user_id       uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tier          text NOT NULL CHECK (tier IN ('CBDD', 'BDD', 'DSD', 'SD', 'AGENT')),
  leader_id     uuid REFERENCES auth.users(id),  -- who this person reports to; null for CBDD (top of org)
  agent_code    text,                            -- e.g. 'KL14843', matches Nirvana portal agent code where applicable
  display_name  text,
  created_at    timestamptz DEFAULT now()
);

-- Only the service-role client (server actions / route handlers) touches this
-- table directly -- tier-scoped visibility is application logic, not RLS.
GRANT ALL ON TABLE agent_profiles TO service_role;

CREATE TABLE IF NOT EXISTS sales_goals (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period        text NOT NULL,                   -- 'YYYY-MM', e.g. '2026-08'
  target_amount numeric NOT NULL,
  set_by        uuid REFERENCES auth.users(id),   -- the leader who set this goal
  created_at    timestamptz DEFAULT now(),
  UNIQUE (user_id, period)
  -- No row for the current period == no goal shown for that agent.
  -- Never invent a default target -- see plan decision on goal framing.
);

GRANT ALL ON TABLE sales_goals TO service_role;

CREATE TABLE IF NOT EXISTS sales_log (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quotation_ref  text,                            -- loose reference to the generated quote (site/product/lot snapshot)
  amount         numeric NOT NULL,
  sold_at        date NOT NULL DEFAULT current_date,
  recorded_by    uuid REFERENCES auth.users(id),  -- the agent or leader who logged it (manual entry, v1)
  created_at     timestamptz DEFAULT now()
);

GRANT ALL ON TABLE sales_log TO service_role;

CREATE INDEX IF NOT EXISTS idx_agent_profiles_leader ON agent_profiles(leader_id);
CREATE INDEX IF NOT EXISTS idx_sales_goals_user_period ON sales_goals(user_id, period);
CREATE INDEX IF NOT EXISTS idx_sales_log_user ON sales_log(user_id);
