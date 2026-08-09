-- ============================================================
-- Ijok — ROYAL 1 (Burial Plot)
-- WEF: 17.03.2026
-- Note: prices exclude hole excavation & formation charges
-- ============================================================

INSERT INTO product_price_list
  (site_code, product_category, product_name, section_group, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, active)
SELECT * FROM (VALUES
  ('Ijok','Burial Plot','ROYAL 1','RA','8/18/28',  '3456sft (48''x72'')', 1900800, 1554800, 96000, 150000, 1800800, 900000,  '2026-03-17'::date, true),
  ('Ijok','Burial Plot','ROYAL 1','RA','38',        '3456sft (48''x72'')', 2000800, 1654800, 96000, 150000, 1900800, 900000,  '2026-03-17'::date, true),
  ('Ijok','Burial Plot','ROYAL 1','RB','28',        '3456sft (48''x72'')', 2170800, 1724800, 96000, 150000, 1970800, 1000000, '2026-03-17'::date, true),
  ('Ijok','Burial Plot','ROYAL 1','RB','38',        '3456sft (48''x72'')', 2270800, 1824800, 96000, 150000, 2070800, 1000000, '2026-03-17'::date, true)
) AS v(site_code, product_category, product_name, section_group, lot_no, size_description,
       as_need_price, pre_need_price, trust_account_facility, backwall_cost,
       total_pre_need_price, point_value, wef_date, active)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.section_group = v.section_group
    AND p.lot_no        = v.lot_no
);
