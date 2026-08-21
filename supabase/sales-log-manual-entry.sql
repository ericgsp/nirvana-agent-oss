-- ============================================================
-- SALES LOG — manual (backfilled) entries
-- Lets an agent record a past sale that happened before/outside the app's
-- own quotation flow (no real quote to attach it to). Flagged separately
-- from normal closed sales so it can be deleted/corrected by the agent --
-- real sales generated through the app's own quote flow stay locked once
-- closed, per the existing "closed is final" rule.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE sales_log ADD COLUMN IF NOT EXISTS is_manual_entry boolean NOT NULL DEFAULT false;

-- File Number — required at close time for every sale going forward (real or
-- manually backfilled). Nullable in the schema since older rows predate this
-- field; the app enforces "required" client-side for new entries, not the DB.
ALTER TABLE sales_log ADD COLUMN IF NOT EXISTS file_number text;

GRANT ALL ON TABLE sales_log TO service_role;
