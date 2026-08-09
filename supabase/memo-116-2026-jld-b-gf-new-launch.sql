-- ============================================================
-- Memo 116/2026 — Semenyih JLD Block B GF Sec 1-32 New Launch
-- Reference: NVA/CUS/HOD/CIR/116/2026, dated 23.07.2026
-- Promo period: 26.07.2026 – 31.08.2026
-- site_code: Semenyih-NMG, product_name: JLD-B-GF
-- promo_name: New Launch Promo
--
-- Discount = DP% (10%→10%, 20%→20%, 30%→30%)
-- DR Plus: Double only, calculate type (net / 10000)
-- Instalment tiers (Table A): <36k=36m, 36k-60k=48m, 60k+=60m
-- July: DP tiers 10/20/30%; August: DP tiers 20/30% only
-- ============================================================

DELETE FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/116/2026';

-- ── July 2026 (26/07 – 31/07): DP tiers 10%, 20%, 30% ─────────

-- Double, 10% DP → 10% discount + DR Plus
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, dr_plus_type, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Double', 'lot_type',
  10, 10,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  true, 'calculate', true, '2026-07-26', '2026-07-31'
);

-- Double, 20% DP → 20% discount + DR Plus
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, dr_plus_type, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Double', 'lot_type',
  20, 20,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  true, 'calculate', true, '2026-07-26', '2026-07-31'
);

-- Double, 30% DP → 30% discount + DR Plus
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, dr_plus_type, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Double', 'lot_type',
  30, 30,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  true, 'calculate', true, '2026-07-26', '2026-07-31'
);

-- Single, 10% DP → 10% discount (no DR Plus)
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Single', 'lot_type',
  10, 10,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-07-26', '2026-07-31'
);

-- Single, 20% DP → 20% discount
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Single', 'lot_type',
  20, 20,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-07-26', '2026-07-31'
);

-- Single, 30% DP → 30% discount
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Single', 'lot_type',
  30, 30,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-07-26', '2026-07-31'
);


-- ── August 2026 (01/08 – 31/08): DP tiers 20%, 30% only ────────

-- Double, 20% DP → 20% discount + DR Plus
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, dr_plus_type, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Double', 'lot_type',
  20, 20,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  true, 'calculate', true, '2026-08-01', '2026-08-31'
);

-- Double, 30% DP → 30% discount + DR Plus
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, dr_plus_type, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Double', 'lot_type',
  30, 30,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  true, 'calculate', true, '2026-08-01', '2026-08-31'
);

-- Single, 20% DP → 20% discount
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Single', 'lot_type',
  20, 20,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-08-01', '2026-08-31'
);

-- Single, 30% DP → 30% discount
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_pct, instalment_tiers,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/116/2026', 'Semenyih-NMG', 'New Launch Promo', 'JLD-B-GF', 'Single', 'lot_type',
  30, 30,
  '[{"max_price": 36000, "max_months": 36}, {"max_price": 59999, "max_months": 48}, {"max_price": null, "max_months": 60}]'::jsonb,
  false, true, '2026-08-01', '2026-08-31'
);
