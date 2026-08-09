-- ============================================================
-- Columbarium -- Ming Court 2 (MC2)
-- Site: Semenyih | WEF: 29.04.2026
-- Sections: D3 | D2/D3A | S1/S5
-- Note: Block completion expected 30 Jun 2027
-- ============================================================

-- Section D3
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','MC2','MC2','D3','9',  '50(W)x36(H)x30(D)', 23800, 18800, 3000, 21800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','8',  '50(W)x36(H)x30(D)', 23800, 18800, 3000, 21800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','7',  '50(W)x36(H)x30(D)', 25800, 20800, 3000, 23800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','6',  '50(W)x30(H)x30(D)', 29800, 24800, 3000, 27800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','5',  '50(W)x30(H)x30(D)', 30800, 25800, 3000, 28800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','3A', '50(W)x30(H)x30(D)', 30800, 25800, 3000, 28800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','3',  '50(W)x30(H)x30(D)', 29800, 24800, 3000, 27800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','2',  '50(W)x30(H)x30(D)', 25800, 20800, 3000, 23800, 15700, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D3','1',  '50(W)x30(H)x30(D)', 25800, 20800, 3000, 23800, 15700, '2026-04-29'::date)
) AS v(site_code, product_category, product_name, block, section_group, level,
       size_description, as_need_price, pre_need_price, trust_account_facility,
       total_pre_need_price, point_value, wef_date)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- Section D2/D3A
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','9',  '50(W)x36(H)x30(D)', 22800, 17800, 3000, 20800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','8',  '50(W)x36(H)x30(D)', 22800, 17800, 3000, 20800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','7',  '50(W)x36(H)x30(D)', 24800, 19800, 3000, 22800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','6',  '50(W)x30(H)x30(D)', 28800, 23800, 3000, 26800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','5',  '50(W)x30(H)x30(D)', 29800, 24800, 3000, 27800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','3A', '50(W)x30(H)x30(D)', 29800, 24800, 3000, 27800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','3',  '50(W)x30(H)x30(D)', 28800, 23800, 3000, 26800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','2',  '50(W)x30(H)x30(D)', 24800, 19800, 3000, 22800, 15000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','D2/D3A','1',  '50(W)x30(H)x30(D)', 24800, 19800, 3000, 22800, 15000, '2026-04-29'::date)
) AS v(site_code, product_category, product_name, block, section_group, level,
       size_description, as_need_price, pre_need_price, trust_account_facility,
       total_pre_need_price, point_value, wef_date)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- Section S1/S5
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','9',  '30(W)x36(H)x30(D)', 12800,  9800, 1500, 11300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','8',  '30(W)x36(H)x30(D)', 12800,  9800, 1500, 11300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','7',  '30(W)x36(H)x30(D)', 13800, 10800, 1500, 12300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','6',  '30(W)x30(H)x30(D)', 15800, 12800, 1500, 14300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','5',  '30(W)x30(H)x30(D)', 16800, 13800, 1500, 15300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','3A', '30(W)x30(H)x30(D)', 16800, 13800, 1500, 15300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','3',  '30(W)x30(H)x30(D)', 15800, 12800, 1500, 14300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','2',  '30(W)x30(H)x30(D)', 13800, 10800, 1500, 12300, 8000, '2026-04-29'::date),
  ('Semenyih','Columbarium','MC2','MC2','S1/S5','1',  '30(W)x30(H)x30(D)', 13800, 10800, 1500, 12300, 8000, '2026-04-29'::date)
) AS v(site_code, product_category, product_name, block, section_group, level,
       size_description, as_need_price, pre_need_price, trust_account_facility,
       total_pre_need_price, point_value, wef_date)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);
