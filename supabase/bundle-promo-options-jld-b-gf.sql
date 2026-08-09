-- Memo 117/2026 — JLD-B-GF Bundle Offer
-- Promo period: 26.07.2026 – 31.07.2026

INSERT INTO bundle_promo_options
  (site_code, product_name, option_name,
   option_pre_need_price, option_special_discount, option_additional_discount,
   option_net_price, option_trust_account,
   min_down_payment_pct, max_instalment_months,
   promo_start_date, promo_end_date)
VALUES
  ('Semenyih-NMG', 'JLD-B-GF', 'NV Honour (A)',
   37800, 3500, 1000, 33300, 0, 10, 0, '2026-07-26', '2026-07-31'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Elegant (A)',
   30800, 2500, 1000, 27300, 0, 10, 0, '2026-07-26', '2026-07-31'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Emerald',
   23800, 1000, 500, 22300, 0, 10, 0, '2026-07-26', '2026-07-31'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Essential',
   21800, 500, 500, 20800, 0, 10, 0, '2026-07-26', '2026-07-31');
