-- ============================================================
-- Memo 099/2026 — Central Region Customer Promotion Jul–Aug 2026
-- Reference: NVA/CUS/HOD/CIR/099/2026
--
-- Run this AFTER product-promo-options.sql has been run
-- (view must already have exclusion filter logic)
-- ============================================================


-- ── Step 1: Add exclusion columns ────────────────────────────
ALTER TABLE promo_match_rules
  ADD COLUMN IF NOT EXISTS excluded_site_codes    text[],
  ADD COLUMN IF NOT EXISTS excluded_product_names text[];


-- ── Step 2: Delete ALL existing Central Promo rows from this memo
-- (replacing with corrected data below)
DELETE FROM promo_match_rules
WHERE promo_name IN ('Central Promo', 'As Need Promo')
  AND memo_reference = 'NVA/CUS/HOD/CIR/099/2026';


-- ── Step 3: Insert corrected rows ─────────────────────────────

-- Block 1: Table B + Table A
-- Single & Double burial plots + All Niches
-- Excluded sites: Kuantan, Semenyih-NMP, Nirvana 3
-- Instalment months follow Table A (price-based tiers stored in instalment_tiers)
-- 2 rows: July has 3 DP tiers [10,20,30]; August has 2 DP tiers [20,30] only

-- July 2026: DP tiers 10%, 20%, 30%
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dp_tiers, min_down_payment_pct, max_instalment_months, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date,
  excluded_site_codes
) VALUES (
  'NVA/CUS/HOD/CIR/099/2026',
  'Central Region', 'Central Promo', 'Central Region',
  'Single, Double', 'lot_type',
  '[10, 20, 30]'::jsonb, NULL, NULL,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-07-01', '2026-07-31',
  ARRAY['Kuantan', 'Semenyih-NMP', 'Nirvana 3']
);

-- August 2026: DP tiers 20%, 30% only (10% not available in August)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dp_tiers, min_down_payment_pct, max_instalment_months, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date,
  excluded_site_codes
) VALUES (
  'NVA/CUS/HOD/CIR/099/2026',
  'Central Region', 'Central Promo', 'Central Region',
  'Single, Double', 'lot_type',
  '[20, 30]'::jsonb, NULL, NULL,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-08-01', '2026-08-31',
  ARRAY['Kuantan', 'Semenyih-NMP', 'Nirvana 3']
);


-- Block 2: Table D — Family Lot & Above
-- Family, Super Family, Royal burial plots
-- Excluded sites: Kuantan, Ijok, Semenyih-NMP
-- Excluded products (zones): NV-ROYAL, NV-EMPEROR

INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  discount_pct, min_down_payment_pct, max_instalment_months,
  dr_plus_eligible, active, promo_start_date, promo_end_date,
  excluded_site_codes, excluded_product_names
) VALUES (
  'NVA/CUS/HOD/CIR/099/2026',
  'Central Region', 'Central Promo', 'Central Region',
  'Family, Super Family, Royal', 'lot_type',
  10, 10, 60,
  false, true, '2026-07-01', '2026-08-31',
  ARRAY['Kuantan', 'Ijok', 'Semenyih-NMP'],
  ARRAY['NV-ROYAL', 'NV-EMPEROR']
);


-- Block 3: Table D — As Need (Instant Case)
-- Single & Double burial plots + All Niches, As Need price basis
-- Excluded sites: Semenyih-NMP
-- NOT entitled to DR Plus, NOT entitled to other discounts

INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  discount_pct, purchase_condition,
  dr_plus_eligible, active, promo_start_date, promo_end_date,
  excluded_site_codes
) VALUES (
  'NVA/CUS/HOD/CIR/099/2026',
  'Central Region', 'As Need Promo', 'Central Region',
  'Single, Double', 'lot_type',
  10, 'as_need',
  false, true, '2026-07-01', '2026-08-31',
  ARRAY['Semenyih-NMP']
);


-- ── Step 4: Verify inserted rows ──────────────────────────────
SELECT promo_name, lot_type, discount_pct, min_down_payment_pct,
       max_instalment_months, promo_start_date, promo_end_date,
       excluded_site_codes, excluded_product_names, purchase_condition
FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/099/2026'
ORDER BY promo_name, min_down_payment_pct;
