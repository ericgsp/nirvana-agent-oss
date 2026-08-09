-- ============================================================
-- Oriental Villa Columbarium — OV5, Section S1 to S9 / D2 to D8
-- Site: Semenyih | WEF: 18.08.2022
-- Notes:
--   a) Niche price excludes maintenance & facility fees
--   b) Urn installation subject to block completion 30 Jun 2023
-- ============================================================

-- Section D5 (double niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '9','51(W)x36(H)x40(D) cm',  65800, 55800, 3000, 58800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '8','51(W)x36(H)x40(D) cm',  75800, 65800, 3000, 68800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '7','51(W)x36(H)x40(D) cm',  85800, 75800, 3000, 78800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '6','51(W)x30(H)x40(D) cm',  95800, 85800, 3000, 88800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '5','51(W)x30(H)x40(D) cm', 103800, 93800, 3000, 96800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5','3A','51(W)x30(H)x40(D) cm',  95800, 85800, 3000, 88800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '3','51(W)x30(H)x40(D) cm',  85800, 75800, 3000, 78800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '2','51(W)x30(H)x40(D) cm',  75800, 65800, 3000, 68800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D5', '1','51(W)x30(H)x40(D) cm',  65800, 55800, 3000, 58800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
) AS v(site_code, product_category, product_name, block, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);

-- Section D2 / D8 (double niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '9','51(W)x36(H)x40(D) cm', 60800, 50800, 3000, 53800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '8','51(W)x36(H)x40(D) cm', 70800, 60800, 3000, 63800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '7','51(W)x36(H)x40(D) cm', 80800, 70800, 3000, 73800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '6','51(W)x30(H)x40(D) cm', 90800, 80800, 3000, 83800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '5','51(W)x30(H)x40(D) cm', 98800, 88800, 3000, 91800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8','3A','51(W)x30(H)x40(D) cm', 90800, 80800, 3000, 83800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '3','51(W)x30(H)x40(D) cm', 80800, 70800, 3000, 73800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '2','51(W)x30(H)x40(D) cm', 70800, 60800, 3000, 63800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D2/D8', '1','51(W)x30(H)x40(D) cm', 60800, 50800, 3000, 53800, 48000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
) AS v(site_code, product_category, product_name, block, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);

-- Section S1 / S3 / S3A / S6 / S7 / S9 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '9','36(W)x36(H)x40(D) cm', 30800, 25800, 1500, 27300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '8','36(W)x36(H)x40(D) cm', 35800, 30800, 1500, 32300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '7','36(W)x36(H)x40(D) cm', 40800, 35800, 1500, 37300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '6','36(W)x30(H)x40(D) cm', 45800, 40800, 1500, 42300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '5','36(W)x30(H)x40(D) cm', 50800, 45800, 1500, 47300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9','3A','36(W)x30(H)x40(D) cm', 45800, 40800, 1500, 42300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '3','36(W)x30(H)x40(D) cm', 40800, 35800, 1500, 37300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '2','36(W)x30(H)x40(D) cm', 35800, 30800, 1500, 32300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S1/S3/S3A/S6/S7/S9', '1','36(W)x30(H)x40(D) cm', 30800, 25800, 1500, 27300, 24000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
) AS v(site_code, product_category, product_name, block, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code = v.site_code
    AND p.product_name = v.product_name
    AND p.block = v.block
    AND p.section_group = v.section_group
    AND p.level = v.level
    AND p.wef_date = v.wef_date
);
