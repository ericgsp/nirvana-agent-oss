-- Memo 121/2026 — Enlightenment Ceremony 2026 Bundle Offer
-- Promo period: 2026-08-01 to 2026-09-30
-- Expires automatically on 2026-10-01 (API date filter stops returning rows).
-- To permanently remove rows from DB after expiry, run:
--   DELETE FROM bundle_promo_options WHERE memo_reference = 'NVA/CUS/HOD/CIR/121/2026';
--
-- Central-Region catch-all: applies to all land & niche products
-- Exclusions handled in JS: Pedestal, Pet Niche, EBL, and products with active New Launch bundle
-- Two rows per NLP (10% DP tier and 20% DP tier with different special discounts)
-- Non-Christian products: Honour A, Elegant A, Emerald  |  Christian products: Gracious only
-- Discounts: Table D (special, DP-tier dependent) + Table B (additional, fixed per NLP)

INSERT INTO bundle_promo_options
  (site_code, product_name, lot_type, bundle_type, is_christian,
   option_name, option_pre_need_price, option_special_discount, option_additional_discount,
   option_net_price, option_trust_account, min_down_payment_pct, max_instalment_months,
   max_quantity, promo_start_date, promo_end_date, memo_reference, active)
VALUES
  -- NV Honour (A) — 10% DP tier: spec 1500 + add 1000 = net 35300
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Honour (A)', 37800, 1500, 1000, 35300, 0, 10, 60,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Honour (A) — 20% DP tier: spec 3500 + add 1000 = net 33300
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Honour (A)', 37800, 3500, 1000, 33300, 0, 20, 60,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Elegant (A) — 10% DP tier: spec 1000 + add 1000 = net 28800
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Elegant (A)', 30800, 1000, 1000, 28800, 0, 10, 60,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Elegant (A) — 20% DP tier: spec 2500 + add 1000 = net 27300
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Elegant (A)', 30800, 2500, 1000, 27300, 0, 20, 60,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Emerald — 10% DP tier: spec 500 + add 500 = net 22800
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Emerald', 23800, 500, 500, 22800, 0, 10, 48,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Emerald — 20% DP tier: spec 1000 + add 500 = net 22300
  ('Central-Region', 'ALL', NULL, 'enlightenment', false,
   'NV Emerald', 23800, 1000, 500, 22300, 0, 20, 48,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Gracious — 10% DP tier: spec 500 + add 800 = net 18500
  ('Central-Region', 'ALL', NULL, 'enlightenment', true,
   'NV Gracious', 19800, 500, 800, 18500, 0, 10, 48,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true),

  -- NV Gracious — 20% DP tier: spec 1000 + add 800 = net 18000
  ('Central-Region', 'ALL', NULL, 'enlightenment', true,
   'NV Gracious', 19800, 1000, 800, 18000, 0, 20, 48,
   1, '2026-08-01', '2026-09-30', 'NVA/CUS/HOD/CIR/121/2026', true);
