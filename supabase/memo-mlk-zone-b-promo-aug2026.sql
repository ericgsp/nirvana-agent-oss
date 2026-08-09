-- ============================================================
-- Melaka Zone B Bundle Plot Promotion — August 2026
-- Reference: MLK/ZONE-B/2026-08 (no official memo number on image)
-- Promo period: 01.08.2026 – 31.08.2026
-- site_code: Melaka, product_name: B
-- Promo: RM 27,800 off land price (applies to both BG and G654 tomb options)
-- Min DP: 10% of original price, Max instalment: 48 months
-- New pre-need purchases only
-- ============================================================

DELETE FROM promo_match_rules
WHERE memo_reference = 'MLK/ZONE-B/2026-08';

INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  active, promo_start_date, promo_end_date
) VALUES (
  'MLK/ZONE-B/2026-08', 'Melaka', 'Zone B Bundle Promo', 'B', 'Double', 'lot_type',
  10, 27800, 48,
  true, '2026-08-01', '2026-08-31'
);

-- Verify
SELECT memo_reference, site_code, product_name, lot_type, discount_rm,
       min_down_payment_pct, max_instalment_months, promo_start_date, promo_end_date
FROM promo_match_rules
WHERE memo_reference = 'MLK/ZONE-B/2026-08';
