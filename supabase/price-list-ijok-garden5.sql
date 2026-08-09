-- ============================================================
-- Ijok — GARDEN 5 (Burial Plot)
-- WEF: 22.04.2025
-- Note: prices exclude hole excavation & formation charges
-- Note: lot_no = NULL rows are catch-all (any lot not matched by a specific row)
-- ============================================================

INSERT INTO product_price_list
  (site_code, product_category, product_name, section_group, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, active)
SELECT * FROM (VALUES
  ('Ijok','Burial Plot','GARDEN 5','DA~DC', NULL,        '160sft (10''x16'')', 45800, 35800, 5000, 5000, 45800, 28000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','DA~DC', '238 & 268', '160sft (10''x16'')', 48800, 38800, 5000, 5000, 48800, 28000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','DD~DH', NULL,        '160sft (10''x16'')', 48800, 38800, 5000, 5000, 48800, 30000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','DD~DH', '238 & 268', '160sft (10''x16'')', 51800, 41800, 5000, 5000, 51800, 30000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','DJ~DP', NULL,        '160sft (10''x16'')', 51800, 41800, 5000, 5000, 51800, 30000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','DJ~DM', '238 & 268', '160sft (10''x16'')', 54800, 44800, 5000, 5000, 54800, 30000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','SB',    NULL,        '80sft (5''x16'')',   24800, 18800, 2500, 2500, 23800, 15000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','SB',    '798 & 808', '80sft (5''x16'')',   26800, 20800, 2500, 2500, 25800, 15000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','SC~SD', NULL,        '80sft (5''x16'')',   26800, 20800, 2500, 2500, 25800, 15000, '2025-04-22'::date, true),
  ('Ijok','Burial Plot','GARDEN 5','SC~SD', '798 & 808', '80sft (5''x16'')',   28800, 22800, 2500, 2500, 27800, 15000, '2025-04-22'::date, true)
) AS v(site_code, product_category, product_name, section_group, lot_no, size_description,
       as_need_price, pre_need_price, trust_account_facility, backwall_cost,
       total_pre_need_price, point_value, wef_date, active)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.section_group = v.section_group
    AND (p.lot_no = v.lot_no OR (p.lot_no IS NULL AND v.lot_no IS NULL))
);
