-- ============================================================
-- Memo 107/2026 — Ijok Customer Promotion Q3 2026
-- Reference: NVA/CUS/HOD/CIR/107/2026, dated 28.06.2026
-- Period: 2026-07-01 to 2026-09-30
-- Site: Ijok
--
-- Table A — DRPlus Promo (DR+ entitlement only, no discount):
--   Garden 1: Double & Single → calculate type
--   Mansion 1-GF: Double → fixed 3, Single → fixed 2 (cash purchase)
--   Suite 1: Double → fixed 2 (cash purchase)
--
-- Table B — Customer Promo (fixed RM rebate + fixed DR+):
--   Royal 1: Royal, 10% DP → RM 64,000 rebate, 35 DR+ units, 60 mths
--   Royal 1: Royal, 20% DP → RM 128,000 rebate, 35 DR+ units, 60 mths
--   Majestic 1: Family, 10% DP → RM 15,000 rebate, 10 DR+ units, 60 mths
--   Majestic 1: Family, 20% DP → RM 30,000 rebate, 10 DR+ units, 60 mths
--
-- Section 3 — Combo Lot Promo (Garden 5, burial plot + Standard Tomb):
--   Min 20% DP, max 60 mths
-- ============================================================

DELETE FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/107/2026';


-- ════════════════════════════════════════════════════════════════
-- TABLE A — DRPlus Promo
-- ════════════════════════════════════════════════════════════════

-- Garden 1 — Double (calculate)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'DRPlus Promo', 'GARDEN 1', 'Double', 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- Garden 1 — Single (calculate)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'DRPlus Promo', 'GARDEN 1', 'Single', 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- Mansion 1-GF — Double, fixed 3 units (cash purchase condition)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units, purchase_condition,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'DRPlus Promo', 'MANSION 1-GF', 'Double', 'lot_type',
  true, 'fixed', 3, 'cash_purchase',
  true, '2026-07-01', '2026-09-30'
);

-- Mansion 1-GF — Single, fixed 2 units (cash purchase condition)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units, purchase_condition,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'DRPlus Promo', 'MANSION 1-GF', 'Single', 'lot_type',
  true, 'fixed', 2, 'cash_purchase',
  true, '2026-07-01', '2026-09-30'
);

-- Suite 1 — Double, fixed 2 units (cash purchase condition)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units, purchase_condition,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'DRPlus Promo', 'SUITE 1', 'Double', 'lot_type',
  true, 'fixed', 2, 'cash_purchase',
  true, '2026-07-01', '2026-09-30'
);


-- ════════════════════════════════════════════════════════════════
-- TABLE B — Customer Promo (fixed RM rebate + fixed DR+)
-- ════════════════════════════════════════════════════════════════

-- Royal 1 — Royal, 10% DP → RM 64,000 rebate, 35 DR+ units
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Customer Promo', 'ROYAL 1', 'Royal', 'lot_type',
  10, 64000, 60,
  true, 'fixed', 35,
  true, '2026-07-01', '2026-09-30'
);

-- Royal 1 — Royal, 20% DP → RM 128,000 rebate, 35 DR+ units
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Customer Promo', 'ROYAL 1', 'Royal', 'lot_type',
  20, 128000, 60,
  true, 'fixed', 35,
  true, '2026-07-01', '2026-09-30'
);

-- Majestic 1 — Family, 10% DP → RM 15,000 rebate, 10 DR+ units
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Customer Promo', 'MAJESTIC 1', 'Family', 'lot_type',
  10, 15000, 60,
  true, 'fixed', 10,
  true, '2026-07-01', '2026-09-30'
);

-- Majestic 1 — Family, 20% DP → RM 30,000 rebate, 10 DR+ units
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Customer Promo', 'MAJESTIC 1', 'Family', 'lot_type',
  20, 30000, 60,
  true, 'fixed', 10,
  true, '2026-07-01', '2026-09-30'
);


-- ════════════════════════════════════════════════════════════════
-- SECTION 3 — Combo Lot Promo (Garden 5, burial plot + Standard Tomb)
-- Min 20% DP, max 60 mths instalment
-- combo_total_price = land promo + trust + backwall + tomb
-- ════════════════════════════════════════════════════════════════

-- DA~DC regular lots (8~228, 278~818) — land combo 23,800 + 5,000 + 5,000 + 35,800 = 69,600
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  lot_range, min_down_payment_pct, max_instalment_months,
  is_combo, combo_total_price, combo_product_name, combo_product_price,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Combo Lot', 'GARDEN 5', 'Double', 'lot_type',
  'DA~DC (8~228, 278~818)', 20, 60,
  true, 69600, 'Standard Tomb Package', 35800,
  true, '2026-07-01', '2026-09-30'
);

-- DA~DC premium lots (238 & 268) — land combo 26,800 + 5,000 + 5,000 + 35,800 = 72,600
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  lot_range, min_down_payment_pct, max_instalment_months,
  is_combo, combo_total_price, combo_product_name, combo_product_price,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Combo Lot', 'GARDEN 5', 'Double', 'lot_type',
  'DA~DC (238 & 268)', 20, 60,
  true, 72600, 'Standard Tomb Package', 35800,
  true, '2026-07-01', '2026-09-30'
);

-- SB regular lots (18~788, 818~1738) — land combo 12,800 + 2,500 + 2,500 + 24,800 = 42,600
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  lot_range, min_down_payment_pct, max_instalment_months,
  is_combo, combo_total_price, combo_product_name, combo_product_price,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Combo Lot', 'GARDEN 5', 'Single', 'lot_type',
  'SB (18~788, 818~1738)', 20, 60,
  true, 42600, 'Standard Tomb Package', 24800,
  true, '2026-07-01', '2026-09-30'
);

-- SB premium lots (798 & 808) — land combo 14,800 + 2,500 + 2,500 + 24,800 = 44,600
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  lot_range, min_down_payment_pct, max_instalment_months,
  is_combo, combo_total_price, combo_product_name, combo_product_price,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/107/2026', 'Ijok', 'Combo Lot', 'GARDEN 5', 'Single', 'lot_type',
  'SB (798 & 808)', 20, 60,
  true, 44600, 'Standard Tomb Package', 24800,
  true, '2026-07-01', '2026-09-30'
);


-- ── After running: refresh both views ────────────────────────────
-- REFRESH MATERIALIZED VIEW product_availability_with_price;
-- REFRESH MATERIALIZED VIEW product_promo_options;
