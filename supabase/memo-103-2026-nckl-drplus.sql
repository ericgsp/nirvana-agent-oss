-- ============================================================
-- Memo 103/2026 — NCKL DRPlus Promo rows
-- Reference: NVA/CUS/HOD/CIR/103/2026
-- Period: 2026-07-01 to 2026-09-30
--
-- Adds DRPlus Promo rows for the 6 eligible NCKL zones per Table B.
-- Pricing (dp_tiers, instalment_tiers) is inherited from Central Promo
-- via the base_promos CTE in product_promo_options — no discount columns needed.
-- ============================================================


-- ── Step 1: Remove any existing DRPlus rows for this memo ────
DELETE FROM promo_match_rules
WHERE promo_name = 'DRPlus Promo'
  AND site_code  = 'Nckl'
  AND memo_reference = 'NVA/CUS/HOD/CIR/103/2026';


-- ── Step 2: Insert DRPlus rows ────────────────────────────────

-- A1-S11: Maisonette, Double, Single
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'A1-S11', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- A1-S12: Maisonette, Double, Single
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'A1-S12', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- A2 (prefix matches A2-S1, S2, S7, S8, S9):
-- Family, Maisonette, Super Single, Super Double, Double, Single — all types
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'A2', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- B2 (prefix matches B2-S1 through S9): Maisonette, Double, Single
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'B2', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- D2 (prefix matches D2-S1 through S20): Double, Single
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'D2', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);

-- SKY (prefix matches SKY-S8, SKY-S18, SKY-S38): Family, Double, Single
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  dr_plus_eligible, dr_plus_type,
  active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/103/2026', 'Nckl', 'DRPlus Promo', 'SKY', NULL, 'lot_type',
  true, 'calculate',
  true, '2026-07-01', '2026-09-30'
);


-- ── Step 3: Verify inserted rows ──────────────────────────────
SELECT promo_name, product_name, lot_type, dr_plus_type,
       promo_start_date, promo_end_date, active
FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/103/2026'
  AND promo_name = 'DRPlus Promo'
ORDER BY product_name;


-- ── Step 4: Refresh the materialized view ─────────────────────
REFRESH MATERIALIZED VIEW product_promo_options;


-- ── Step 5: Spot-check — A2-S1 should now show DRPlus Promo ──
SELECT lot_code, zone, promo_name, dr_plus_eligible, dr_plus_type
FROM product_promo_options
WHERE site = 'Nckl'
  AND zone LIKE 'A2%'
  AND promo_name = 'DRPlus Promo'
LIMIT 10;
