-- Fix grouped lot_type rows — split each into individual rows

-- ── Horizon 3: Super Family & Family ─────────────────────────

-- Update existing rows to Super Family
UPDATE promotions SET lot_type = 'Super Family'
WHERE id IN ('26c47b59-e835-451d-9761-3f6373dae7ae','a6660537-906a-4435-b944-2dfe2673b869');

-- Insert Family copies
INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, promo_type, remarks, active)
SELECT memo_reference, site_code, promo_start_date, promo_end_date,
       product_name, 'Family', lot_range,
       min_down_payment_pct, min_down_payment_rm, max_instalment_months,
       discount_pct, discount_rm,
       dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
       is_combo, promo_type, remarks, active
FROM promotions
WHERE id IN ('26c47b59-e835-451d-9761-3f6373dae7ae','a6660537-906a-4435-b944-2dfe2673b869');


-- ── NV Grand Imperial 1: Royal & Super Family ─────────────────

UPDATE promotions SET lot_type = 'Royal'
WHERE id = 'e8a1d5ad-19c2-4527-a639-b01b73694c6f';

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, promo_type, remarks, active)
SELECT memo_reference, site_code, promo_start_date, promo_end_date,
       product_name, 'Super Family', lot_range,
       min_down_payment_pct, min_down_payment_rm, max_instalment_months,
       discount_pct, discount_rm,
       dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
       is_combo, promo_type, remarks, active
FROM promotions
WHERE id = 'e8a1d5ad-19c2-4527-a639-b01b73694c6f';


-- ── NV Imperial: Royal & Super Family ────────────────────────

UPDATE promotions SET lot_type = 'Royal'
WHERE id = 'a3c4226d-2631-48be-8726-a237606b8ea6';

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, promo_type, remarks, active)
SELECT memo_reference, site_code, promo_start_date, promo_end_date,
       product_name, 'Super Family', lot_range,
       min_down_payment_pct, min_down_payment_rm, max_instalment_months,
       discount_pct, discount_rm,
       dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
       is_combo, promo_type, remarks, active
FROM promotions
WHERE id = 'a3c4226d-2631-48be-8726-a237606b8ea6';


-- ── NV Imperial 3: Royal & Super Family ──────────────────────

UPDATE promotions SET lot_type = 'Royal'
WHERE id = 'd66caca5-f225-436d-9df7-cf20ef28cca2';

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, promo_type, remarks, active)
SELECT memo_reference, site_code, promo_start_date, promo_end_date,
       product_name, 'Super Family', lot_range,
       min_down_payment_pct, min_down_payment_rm, max_instalment_months,
       discount_pct, discount_rm,
       dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
       is_combo, promo_type, remarks, active
FROM promotions
WHERE id = 'd66caca5-f225-436d-9df7-cf20ef28cca2';


-- ── NV Majestic 1: Super Family & Family ─────────────────────

UPDATE promotions SET lot_type = 'Super Family'
WHERE id = 'ccb76eb9-375f-4967-b714-668b75f38d42';

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, promo_type, remarks, active)
SELECT memo_reference, site_code, promo_start_date, promo_end_date,
       product_name, 'Family', lot_range,
       min_down_payment_pct, min_down_payment_rm, max_instalment_months,
       discount_pct, discount_rm,
       dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
       is_combo, promo_type, remarks, active
FROM promotions
WHERE id = 'ccb76eb9-375f-4967-b714-668b75f38d42';
