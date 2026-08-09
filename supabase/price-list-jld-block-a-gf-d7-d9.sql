-- ============================================================
-- Ji Le Dian Columbarium — Block A, Ground Floor (Section D7 to D9)
-- Site: Semenyih | WEF: 21.04.2021
-- Notes:
--   a) Niche price excludes maintenance & facility fees
--   b) Urn installation allowed subject to block completion 15 Dec 2021
-- ============================================================

-- Section D8
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8','10','51(W)x36(H)x30(D) cm', 31800, 24800, 3000, 27800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '9','51(W)x36(H)x30(D) cm', 35800, 28800, 3000, 31800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '8','51(W)x36(H)x30(D) cm', 39800, 32800, 3000, 35800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '7','51(W)x30(H)x30(D) cm', 43800, 36800, 3000, 39800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '6','51(W)x30(H)x30(D) cm', 43800, 36800, 3000, 39800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '5','51(W)x30(H)x30(D) cm', 46800, 39800, 3000, 42800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8','3A','51(W)x30(H)x30(D) cm', 43800, 36800, 3000, 39800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '3','51(W)x30(H)x30(D) cm', 39800, 32800, 3000, 35800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '2','51(W)x30(H)x30(D) cm', 35800, 28800, 3000, 31800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D8', '1','51(W)x30(H)x30(D) cm', 31800, 24800, 3000, 27800, 23000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.floor = v.floor
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);

-- Section D7 / D9
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9','10','51(W)x36(H)x30(D) cm', 27800, 20800, 3000, 23800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '9','51(W)x36(H)x30(D) cm', 31800, 24800, 3000, 27800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '8','51(W)x36(H)x30(D) cm', 35800, 28800, 3000, 31800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '7','51(W)x30(H)x30(D) cm', 39800, 32800, 3000, 35800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '6','51(W)x30(H)x30(D) cm', 39800, 32800, 3000, 35800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '5','51(W)x30(H)x30(D) cm', 42800, 35800, 3000, 38800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9','3A','51(W)x30(H)x30(D) cm', 39800, 32800, 3000, 35800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '3','51(W)x30(H)x30(D) cm', 35800, 28800, 3000, 31800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '2','51(W)x30(H)x30(D) cm', 31800, 24800, 3000, 27800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D7/D9', '1','51(W)x30(H)x30(D) cm', 27800, 20800, 3000, 23800, 19800, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.floor = v.floor
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);

-- Section S7 / S9 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9','10','30(W)x36(H)x30(D) cm', 16800, 12800, 1500, 14300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '9','30(W)x36(H)x30(D) cm', 18800, 14800, 1500, 16300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '8','30(W)x36(H)x30(D) cm', 20800, 16800, 1500, 18300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '7','30(W)x30(H)x30(D) cm', 22800, 18800, 1500, 20300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '6','30(W)x30(H)x30(D) cm', 22800, 18800, 1500, 20300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '5','30(W)x30(H)x30(D) cm', 24800, 20800, 1500, 22300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9','3A','30(W)x30(H)x30(D) cm', 22800, 18800, 1500, 20300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '3','30(W)x30(H)x30(D) cm', 20800, 16800, 1500, 18300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '2','30(W)x30(H)x30(D) cm', 18800, 14800, 1500, 16300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S7/S9', '1','30(W)x30(H)x30(D) cm', 16800, 12800, 1500, 14300, 11700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.floor = v.floor
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);
