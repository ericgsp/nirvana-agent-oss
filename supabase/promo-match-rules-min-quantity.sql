-- Add min_quantity column to promo_match_rules
-- Used for quantity-based promo tiers (e.g. N12-S6: 1 niche vs 2+ niches)
ALTER TABLE promo_match_rules
  ADD COLUMN IF NOT EXISTS min_quantity integer;

-- Update N12-S6: the 10%-DP rows require 2+ niches
UPDATE promo_match_rules
SET min_quantity = 2
WHERE memo_reference = 'NVA/CUS/HOD/CIR/118A/2026'
  AND min_down_payment_pct = 10;

-- Verify
SELECT lot_type, min_down_payment_pct, discount_rm, max_instalment_months, min_quantity
FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/118A/2026'
ORDER BY lot_type, min_down_payment_pct;
