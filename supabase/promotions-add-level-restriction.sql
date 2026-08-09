-- ============================================================
-- Add level_restriction column to promotions table
-- For columbarium promos where discount varies by level group
-- e.g. '1,2,7,8,9' or '3,3A,5,6' (NULL = applies to all levels)
-- Run FIRST before recreating views
-- ============================================================

ALTER TABLE promotions
  ADD COLUMN IF NOT EXISTS level_restriction text;

COMMENT ON COLUMN promotions.level_restriction IS
  'Comma-separated level values this promo applies to (columbarium only). NULL = all levels.';
