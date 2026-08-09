-- ============================================================
-- Pedestal (神主灵位) — DiZhangWang Block DZW-B
-- Site: Semenyih | WEF: 05.11.2024
-- ============================================================

-- Section LF
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   original_price, pre_launch_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','LF','1,2,3,3A,5',   30800, 25800, 18000, '2024-11-05'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','LF','6,7,8,9,10',   28800, 23800, 18000, '2024-11-05'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','LF','11,12,13,13A', 26800, 21800, 18000, '2024-11-05'::date)
) AS v(site_code, product_category, product_name, block, section_group, level,
       original_price, pre_launch_price, point_value, wef_date)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);

-- Section UF
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   original_price, pre_launch_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','UF','1,2,3,3A,5',   25800, 20800, 14000, '2024-11-05'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','UF','6,7,8,9,10',   23800, 18800, 14000, '2024-11-05'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-B','UF','11,12,13,13A', 21800, 16800, 14000, '2024-11-05'::date)
) AS v(site_code, product_category, product_name, block, section_group, level,
       original_price, pre_launch_price, point_value, wef_date)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);
