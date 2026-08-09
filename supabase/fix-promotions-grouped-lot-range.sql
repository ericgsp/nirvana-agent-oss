-- Split grouped lot_range levels in promotions table into individual rows

-- ── Ming Court MC1 Double: Level 3, 3A, 5, 6 ─────────────────
UPDATE promotions SET lot_range = 'Level 3' WHERE id = 'bc3b70a1-07e0-4833-a399-ed9f47fa79c7';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 3A',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'bc3b70a1-07e0-4833-a399-ed9f47fa79c7';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 5',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'bc3b70a1-07e0-4833-a399-ed9f47fa79c7';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 6',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'bc3b70a1-07e0-4833-a399-ed9f47fa79c7';

-- ── Ming Court MC1 Double: Level 1, 2, 7 ─────────────────────
UPDATE promotions SET lot_range = 'Level 1' WHERE id = 'b5b650b5-0164-40dd-a59f-68ab1a8a712d';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 2',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'b5b650b5-0164-40dd-a59f-68ab1a8a712d';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 7',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'b5b650b5-0164-40dd-a59f-68ab1a8a712d';

-- ── Ming Court MC1 Double: Level 8, 9 ────────────────────────
UPDATE promotions SET lot_range = 'Level 8' WHERE id = '8128c4d6-3430-4eff-8d28-c14ca5f9fa2d';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 9',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '8128c4d6-3430-4eff-8d28-c14ca5f9fa2d';

-- ── Ming Court MC1 Single: Level 3, 3A, 5, 6 ─────────────────
UPDATE promotions SET lot_range = 'Level 3' WHERE id = '94bb6374-c45b-4d10-938a-4faf4eef1679';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 3A',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '94bb6374-c45b-4d10-938a-4faf4eef1679';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 5',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '94bb6374-c45b-4d10-938a-4faf4eef1679';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 6',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '94bb6374-c45b-4d10-938a-4faf4eef1679';

-- ── Ming Court MC1 Single: Level 1, 2, 7 ─────────────────────
UPDATE promotions SET lot_range = 'Level 1' WHERE id = '365655d7-d567-4577-8280-c1679494458c';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 2',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '365655d7-d567-4577-8280-c1679494458c';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 7',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '365655d7-d567-4577-8280-c1679494458c';

-- ── Ming Court MC1 Single: Level 8, 9 ────────────────────────
UPDATE promotions SET lot_range = 'Level 8' WHERE id = '3dd2c797-4c74-4911-b66b-41ee8e0e1c0d';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'Level 9',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '3dd2c797-4c74-4911-b66b-41ee8e0e1c0d';
