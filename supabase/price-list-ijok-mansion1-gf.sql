-- ============================================================
-- Ijok — MANSION 1-GF (Niche)
-- Block: MANSION 1, Floor: GF
-- WEF: 01.07.2022
-- Levels: 1,2,3,3A,5,6,7,8,9 (level 4 = 3A per naming convention)
-- Note: trust_account_facility converted from "Maintenance & Facility Fees"
-- ============================================================

-- Section D2/D5
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','9',  '51(W)x36(H)x40(D)', 30800, 24800, 4000, 28800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','8',  '51(W)x36(H)x40(D)', 30800, 24800, 4000, 28800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','7',  '51(W)x36(H)x40(D)', 32800, 26800, 4000, 30800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','6',  '51(W)x30(H)x40(D)', 38800, 32800, 4000, 36800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','5',  '51(W)x30(H)x40(D)', 41800, 35800, 4000, 39800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','3A', '51(W)x30(H)x40(D)', 38800, 32800, 4000, 36800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','3',  '51(W)x30(H)x40(D)', 38800, 32800, 4000, 36800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','2',  '51(W)x30(H)x40(D)', 32800, 26800, 4000, 30800, 21000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D2/D5','1',  '51(W)x30(H)x40(D)', 32800, 26800, 4000, 30800, 21000, '2022-07-01'::date)
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

-- Section D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','9',  '51(W)x36(H)x40(D)', 26800, 20800, 4000, 24800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','8',  '51(W)x36(H)x40(D)', 26800, 20800, 4000, 24800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','7',  '51(W)x36(H)x40(D)', 28800, 22800, 4000, 26800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','6',  '51(W)x30(H)x40(D)', 34800, 28800, 4000, 32800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','5',  '51(W)x30(H)x40(D)', 37800, 31800, 4000, 35800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','3A', '51(W)x30(H)x40(D)', 34800, 28800, 4000, 32800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','3',  '51(W)x30(H)x40(D)', 34800, 28800, 4000, 32800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','2',  '51(W)x30(H)x40(D)', 28800, 22800, 4000, 26800, 18000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','D1/D3/D3A/D6/D7/D8/D9/D10/D13/D15/D16','1',  '51(W)x30(H)x40(D)', 28800, 22800, 4000, 26800, 18000, '2022-07-01'::date)
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

-- Section S11/S12/S13A
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','9',  '32(W)x36(H)x40(D)', 13800, 10800, 2000, 12800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','8',  '32(W)x36(H)x40(D)', 13800, 10800, 2000, 12800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','7',  '32(W)x36(H)x40(D)', 14800, 11800, 2000, 13800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','6',  '32(W)x30(H)x40(D)', 17800, 14800, 2000, 16800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','5',  '32(W)x30(H)x40(D)', 19800, 16800, 2000, 18800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','3A', '32(W)x30(H)x40(D)', 17800, 14800, 2000, 16800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','3',  '32(W)x30(H)x40(D)', 17800, 14800, 2000, 16800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','2',  '32(W)x30(H)x40(D)', 14800, 11800, 2000, 13800, 9000, '2022-07-01'::date),
  ('Ijok','Niche','MANSION 1-GF','MANSION 1','S11/S12/S13A','1',  '32(W)x30(H)x40(D)', 14800, 11800, 2000, 13800, 9000, '2022-07-01'::date)
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
