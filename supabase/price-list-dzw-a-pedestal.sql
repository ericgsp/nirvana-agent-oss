-- ============================================================
-- Pedestal (神主灵位) — DiZhangWang Block DZW-A
-- Site: Semenyih | WEF: 01.01.2023
-- Columns used: original_price (原价), pre_launch_price (推介价)
-- Level field stores level range as printed on price list
-- Future blocks: DZW-B, DZW-D, DZW-E follow same structure
-- ============================================================

-- Section LF
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   original_price, pre_launch_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','LF','1,2,3,3A,5',   22800, 15800, 11000, '2023-01-01'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','LF','6,7,8,9,10',   20800, 13800, 11000, '2023-01-01'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','LF','11,12,13,13A', 18800, 11800, 11000, '2023-01-01'::date)
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
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','UF','1,2,3,3A,5',   17800, 10800, 8000, '2023-01-01'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','UF','6,7,8,9,10',   16800,  9800, 8000, '2023-01-01'::date),
  ('Semenyih','Pedestal','DiZhangWang','DZW-A','UF','11,12,13,13A', 15800,  8800, 8000, '2023-01-01'::date)
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
