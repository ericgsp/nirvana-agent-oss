-- Split comma-separated section rows and remove "Row"/"Lot" prefix words

-- ── NV Dynasty 1 Family: Row FB, FC, FD (08~198) → 3 rows ───
UPDATE promotions SET lot_range = 'FB (08~198)' WHERE id = 'f4af5b89-ccb5-40ee-9ccb-1391b94ef5c3';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'FC (08~198)',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'f4af5b89-ccb5-40ee-9ccb-1391b94ef5c3';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'FD (08~198)',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'f4af5b89-ccb5-40ee-9ccb-1391b94ef5c3';

-- ── NV Grand Imperial 2 Royal: Row RA, RB, RD (8~88) → 3 rows ─
UPDATE promotions SET lot_range = 'RA (8~88)' WHERE id = 'd59cbfe7-ff99-4fe1-835d-e5e5c158488b';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'RB (8~88)',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'd59cbfe7-ff99-4fe1-835d-e5e5c158488b';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'RD (8~88)',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = 'd59cbfe7-ff99-4fe1-835d-e5e5c158488b';

-- ── NV-R Single: Row SAA, SA (Lot 18~388) → 2 rows ───────────
UPDATE promotions SET lot_range = 'SAA (18~388)' WHERE id = '0d6ee5e9-da92-4335-89ff-616886afc03a';
INSERT INTO promotions (memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,lot_range,min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active)
SELECT memo_reference,site_code,promo_start_date,promo_end_date,product_name,lot_type,'SA (18~388)',min_down_payment_pct,min_down_payment_rm,max_instalment_months,discount_pct,discount_rm,dr_plus_eligible,dr_plus_type,dr_plus_fixed_units,is_combo,promo_type,remarks,active FROM promotions WHERE id = '0d6ee5e9-da92-4335-89ff-616886afc03a';
