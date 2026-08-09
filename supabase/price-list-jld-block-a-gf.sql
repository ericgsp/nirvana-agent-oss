-- ============================================================
-- Ji Le Dian Columbarium — Block A, Ground Floor (Section D1 to D6)
-- Site: Semenyih | WEF: 21.04.2021
-- Notes:
--   a) Niche price excludes maintenance & facility fees
--   b) Urn installation allowed subject to block completion 15 Dec 2021
-- ============================================================

-- Section D2 / D5
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5','10','51(W)x36(H)x30(D) cm', 29800, 22800, 3000, 25800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '9','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '8','51(W)x36(H)x30(D) cm', 37800, 30800, 3000, 33800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '7','51(W)x30(H)x30(D) cm', 41800, 34800, 3000, 37800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '6','51(W)x30(H)x30(D) cm', 41800, 34800, 3000, 37800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '5','51(W)x30(H)x30(D) cm', 44800, 37800, 3000, 40800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5','3A','51(W)x30(H)x30(D) cm', 41800, 34800, 3000, 37800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '3','51(W)x30(H)x30(D) cm', 37800, 30800, 3000, 33800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '2','51(W)x30(H)x30(D) cm', 33800, 26800, 3000, 29800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D2/D5', '1','51(W)x30(H)x30(D) cm', 29800, 22800, 3000, 25800, 21700, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
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

-- Section D1 / D3 / D3A / D6
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6','10','51(W)x36(H)x30(D) cm', 25800, 18800, 3000, 21800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '9','51(W)x36(H)x30(D) cm', 29800, 22800, 3000, 25800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '8','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '7','51(W)x30(H)x30(D) cm', 37800, 30800, 3000, 33800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '6','51(W)x30(H)x30(D) cm', 37800, 30800, 3000, 33800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '5','51(W)x30(H)x30(D) cm', 40800, 33800, 3000, 36800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6','3A','51(W)x30(H)x30(D) cm', 37800, 30800, 3000, 33800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '3','51(W)x30(H)x30(D) cm', 33800, 26800, 3000, 29800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '2','51(W)x30(H)x30(D) cm', 29800, 22800, 3000, 25800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','D1/D3/D3A/D6', '1','51(W)x30(H)x30(D) cm', 25800, 18800, 3000, 21800, 18500, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
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

-- Section S1 / S3 / S3A / S6 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6','10','30(W)x36(H)x30(D) cm', 15800, 11800, 1500, 13300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '9','30(W)x36(H)x30(D) cm', 17800, 13800, 1500, 15300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '8','30(W)x36(H)x30(D) cm', 19800, 15800, 1500, 17300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '7','30(W)x30(H)x30(D) cm', 21800, 17800, 1500, 19300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '6','30(W)x30(H)x30(D) cm', 21800, 17800, 1500, 19300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '5','30(W)x30(H)x30(D) cm', 23800, 19800, 1500, 21300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6','3A','30(W)x30(H)x30(D) cm', 21800, 17800, 1500, 19300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '3','30(W)x30(H)x30(D) cm', 19800, 15800, 1500, 17300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '2','30(W)x30(H)x30(D) cm', 17800, 13800, 1500, 15300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021'),
  ('Semenyih','Columbarium','Ji Le Dian','A','GF','S1/S3/S3A/S6', '1','30(W)x30(H)x30(D) cm', 15800, 11800, 1500, 13300, 11000, '2021-04-21'::date, 'Urn installation subject to block completion 15 Dec 2021')
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
