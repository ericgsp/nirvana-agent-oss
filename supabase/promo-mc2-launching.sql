-- ============================================================
-- Promotions -- Ming Court 2 New Launch
-- Ref: NVA/CUS/HOD/CIR/88/2026 | Date: 04.05.2026
-- Site: Semenyih | Period: 06.05.2026 - 30.06.2026
-- Pre-need sales only. No booking/reservation allowed.
-- ============================================================

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, level_restriction,
   min_down_payment_pct, max_instalment_months,
   discount_rm, promo_type, remarks, active)
VALUES
  -- Double niches, levels 1/2/7/8/9
  ('NVA/CUS/HOD/CIR/88/2026', 'Semenyih', '2026-05-06', '2026-06-30',
   'MC2', 'Double', '1,2,7,8,9',
   10, 48,
   6000, 'standard', 'No booking and reservation allowed', true),

  -- Double niches, levels 3/3A/5/6
  ('NVA/CUS/HOD/CIR/88/2026', 'Semenyih', '2026-05-06', '2026-06-30',
   'MC2', 'Double', '3,3A,5,6',
   10, 48,
   4000, 'standard', 'No booking and reservation allowed', true),

  -- Single niches, levels 1/2/7/8/9
  ('NVA/CUS/HOD/CIR/88/2026', 'Semenyih', '2026-05-06', '2026-06-30',
   'MC2', 'Single', '1,2,7,8,9',
   10, 36,
   3000, 'standard', 'No booking and reservation allowed', true),

  -- Single niches, levels 3/3A/5/6
  ('NVA/CUS/HOD/CIR/88/2026', 'Semenyih', '2026-05-06', '2026-06-30',
   'MC2', 'Single', '3,3A,5,6',
   10, 36,
   2000, 'standard', 'No booking and reservation allowed', true);
