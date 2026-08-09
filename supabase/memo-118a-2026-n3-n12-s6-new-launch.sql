-- ============================================================
-- Memo 118A/2026 — Nirvana 3 N12-S6 Christian Niche New Launch
-- Reference: NVA/CUS/HOD/CIR/118A/2026, dated 27.07.2026
-- Promo period: 28.07.2026 – 31.08.2026
-- site_code: Nirvana 3, product_name: N12-S6
--
-- Table A — Customer Promo:
--   1 niche  → 20% min DP, max 36 mths, discount RM3k(D)/RM2k(S)
--   2+ niche → 10% min DP, max 60 mths, discount RM3k(D)/RM2k(S)
-- Table B+C — Bundle: Niche + NV Gracious NLP (net RM18,000)
--   Double: max 2 NLP; Single: max 1 NLP
-- No DR Plus. Agent Incentive (Table D) not tracked in system.
-- ============================================================

-- Safety: remove any existing rows for this memo
DELETE FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/118A/2026';

DELETE FROM bundle_promo_options
WHERE site_code = 'Nirvana 3'
  AND product_name = 'N12-S6'
  AND promo_start_date = '2026-07-28'
  AND promo_end_date   = '2026-08-31';


-- ── promo_match_rules ────────────────────────────────────────
-- 10% DP = buying 2+ niches → 60 months max
-- 20% DP = buying 1 niche  → 36 months max

-- Double, 10% DP (2+ niches) → RM 3,000 discount, 60 mths
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/118A/2026', 'Nirvana 3', 'New Launch Promo', 'N12-S6', 'Double', 'lot_type',
  10, 3000, 60,
  false, true, '2026-07-28', '2026-08-31'
);

-- Double, 20% DP (1 niche) → RM 3,000 discount, 36 mths
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/118A/2026', 'Nirvana 3', 'New Launch Promo', 'N12-S6', 'Double', 'lot_type',
  20, 3000, 36,
  false, true, '2026-07-28', '2026-08-31'
);

-- Single, 10% DP (2+ niches) → RM 2,000 discount, 60 mths
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/118A/2026', 'Nirvana 3', 'New Launch Promo', 'N12-S6', 'Single', 'lot_type',
  10, 2000, 60,
  false, true, '2026-07-28', '2026-08-31'
);

-- Single, 20% DP (1 niche) → RM 2,000 discount, 36 mths
INSERT INTO promo_match_rules (
  memo_reference, site_code, promo_name, product_name, lot_type, match_scope,
  min_down_payment_pct, discount_rm, max_instalment_months,
  dr_plus_eligible, active, promo_start_date, promo_end_date
) VALUES (
  'NVA/CUS/HOD/CIR/118A/2026', 'Nirvana 3', 'New Launch Promo', 'N12-S6', 'Single', 'lot_type',
  20, 2000, 36,
  false, true, '2026-07-28', '2026-08-31'
);


-- ── bundle_promo_options ─────────────────────────────────────
-- NV Gracious NLP: pre-need RM19,800 → net RM18,000
-- Double: max 2 NLP per transaction
-- Single: max 1 NLP per transaction

INSERT INTO bundle_promo_options
  (site_code, product_name, lot_type, bundle_type, option_name,
   option_pre_need_price, option_special_discount, option_additional_discount,
   option_net_price, option_trust_account,
   min_down_payment_pct, max_instalment_months, max_quantity,
   promo_start_date, promo_end_date, memo_reference)
VALUES
  ('Nirvana 3', 'N12-S6', 'Double', 'nlp', 'NV Gracious',
   19800, 1000, 800, 18000, 0,
   10, 60, 2,
   '2026-07-28', '2026-08-31',
   'NVA/CUS/HOD/CIR/118A/2026'),

  ('Nirvana 3', 'N12-S6', 'Single', 'nlp', 'NV Gracious',
   19800, 1000, 800, 18000, 0,
   10, 60, 1,
   '2026-07-28', '2026-08-31',
   'NVA/CUS/HOD/CIR/118A/2026');


-- ── Verify ───────────────────────────────────────────────────
SELECT 'promo_match_rules' AS tbl, lot_type, min_down_payment_pct, discount_rm, max_instalment_months
FROM promo_match_rules
WHERE memo_reference = 'NVA/CUS/HOD/CIR/118A/2026'
ORDER BY lot_type, min_down_payment_pct;

SELECT 'bundle_promo_options' AS tbl, lot_type, option_name, option_net_price, max_quantity, min_down_payment_pct
FROM bundle_promo_options
WHERE site_code = 'Nirvana 3' AND product_name = 'N12-S6'
ORDER BY lot_type;
