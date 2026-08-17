-- ============================================================
-- SALES LOG — quota figure alongside the sales figure
-- amount = the actual quotation total (includes trust, backwall, discount).
-- quota_amount = pre_need_price minus discount minus trust minus backwall --
-- the net figure quota targets are measured against, distinct from sales.
-- Run in Supabase SQL Editor
-- ============================================================

ALTER TABLE sales_log ADD COLUMN IF NOT EXISTS quota_amount numeric;
