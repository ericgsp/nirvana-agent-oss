-- ============================================================
-- Oriental Villa Columbarium — OV5, Section S10 / D11 to D18
-- Site: Semenyih | WEF: 18.08.2022
-- Notes:
--   a) Niche price excludes maintenance & facility fees
--   b) Urn installation subject to block completion 30 Jun 2023
-- ============================================================

-- Section D11 / D17 (double niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '9','51(W)x36(H)x40(D) cm',  75800, 65800, 3000,  68800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '8','51(W)x36(H)x40(D) cm',  85800, 75800, 3000,  78800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '7','51(W)x36(H)x40(D) cm',  95800, 85800, 3000,  88800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '6','51(W)x30(H)x40(D) cm', 105800, 95800, 3000,  98800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '5','51(W)x30(H)x40(D) cm', 113800,103800, 3000, 106800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17','3A','51(W)x30(H)x40(D) cm', 105800, 95800, 3000,  98800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '3','51(W)x30(H)x40(D) cm',  95800, 85800, 3000,  88800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '2','51(W)x30(H)x40(D) cm',  85800, 75800, 3000,  78800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D11/D17', '1','51(W)x30(H)x40(D) cm',  75800, 65800, 3000,  68800, 58500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
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

-- Section D12 / D16 / D18 (double niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '9','51(W)x36(H)x40(D) cm',  65800, 55800, 3000, 58800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '8','51(W)x36(H)x40(D) cm',  75800, 65800, 3000, 68800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '7','51(W)x36(H)x40(D) cm',  85800, 75800, 3000, 78800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '6','51(W)x30(H)x40(D) cm',  95800, 85800, 3000, 88800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '5','51(W)x30(H)x40(D) cm', 103800, 93800, 3000, 96800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18','3A','51(W)x30(H)x40(D) cm',  95800, 85800, 3000, 88800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '3','51(W)x30(H)x40(D) cm',  85800, 75800, 3000, 78800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '2','51(W)x30(H)x40(D) cm',  75800, 65800, 3000, 68800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','D12/D16/D18', '1','51(W)x30(H)x40(D) cm',  65800, 55800, 3000, 58800, 51500, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
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

-- Section S10 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '9','36(W)x36(H)x40(D) cm', 33800, 28800, 1500, 30300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '8','36(W)x36(H)x40(D) cm', 38800, 33800, 1500, 35300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '7','36(W)x36(H)x40(D) cm', 43800, 38800, 1500, 40300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '6','36(W)x30(H)x40(D) cm', 48800, 43800, 1500, 45300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '5','36(W)x30(H)x40(D) cm', 53800, 48800, 1500, 50300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10','3A','36(W)x30(H)x40(D) cm', 48800, 43800, 1500, 45300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '3','36(W)x30(H)x40(D) cm', 43800, 38800, 1500, 40300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '2','36(W)x30(H)x40(D) cm', 38800, 33800, 1500, 35300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023'),
  ('Semenyih','Columbarium','Oriental Villa','OV5','S10', '1','36(W)x30(H)x40(D) cm', 33800, 28800, 1500, 30300, 26000, '2022-08-18'::date, 'Urn installation subject to block completion 30 Jun 2023')
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
