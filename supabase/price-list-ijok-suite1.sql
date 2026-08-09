-- ============================================================
-- Ijok — SUITE 1 (Niche)
-- Block: SUITE 1, Sections S1 to D16
-- WEF: 01.07.2022
-- Note: trust_account_facility converted from "Maintenance & Facility Fees"
-- ============================================================

-- Section D16
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','9',  '51(W)x36(H)x40(D)', 23800, 17800, 4000, 21800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','8',  '51(W)x36(H)x40(D)', 23800, 17800, 4000, 21800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','7',  '51(W)x36(H)x40(D)', 25800, 19800, 4000, 23800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','6',  '51(W)x30(H)x40(D)', 29800, 23800, 4000, 27800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','5',  '51(W)x30(H)x40(D)', 31800, 25800, 4000, 29800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','3A', '51(W)x30(H)x40(D)', 29800, 23800, 4000, 27800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','3',  '51(W)x30(H)x40(D)', 29800, 23800, 4000, 27800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','2',  '51(W)x30(H)x40(D)', 25800, 19800, 4000, 23800, 15000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D16','1',  '51(W)x30(H)x40(D)', 25800, 19800, 4000, 23800, 15000, '2022-07-01'::date)
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

-- Section D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','9',  '51(W)x36(H)x40(D)', 19800, 14800, 4000, 18800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','8',  '51(W)x36(H)x40(D)', 19800, 14800, 4000, 18800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','7',  '51(W)x36(H)x40(D)', 21800, 16800, 4000, 20800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','6',  '51(W)x30(H)x40(D)', 25800, 20800, 4000, 24800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','5',  '51(W)x30(H)x40(D)', 27800, 22800, 4000, 26800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','3A', '51(W)x30(H)x40(D)', 25800, 20800, 4000, 24800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','3',  '51(W)x30(H)x40(D)', 25800, 20800, 4000, 24800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','2',  '51(W)x30(H)x40(D)', 21800, 16800, 4000, 20800, 13000, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','D3/D5/D6/D7/D8/D9/D10/D11/D12/D13/D13A/D15','1',  '51(W)x30(H)x40(D)', 21800, 16800, 4000, 20800, 13000, '2022-07-01'::date)
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

-- Section S1/S2/S3A
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level,
   size_description, as_need_price, pre_need_price, trust_account_facility,
   total_pre_need_price, point_value, wef_date)
SELECT * FROM (VALUES
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','9',  '32(W)x36(H)x40(D)', 11800,  8800, 2000, 10800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','8',  '32(W)x36(H)x40(D)', 11800,  8800, 2000, 10800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','7',  '32(W)x36(H)x40(D)', 12800,  9800, 2000, 11800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','6',  '32(W)x30(H)x40(D)', 14800, 11800, 2000, 13800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','5',  '32(W)x30(H)x40(D)', 15800, 12800, 2000, 14800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','3A', '32(W)x30(H)x40(D)', 14800, 11800, 2000, 13800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','3',  '32(W)x30(H)x40(D)', 14800, 11800, 2000, 13800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','2',  '32(W)x30(H)x40(D)', 12800,  9800, 2000, 11800, 7500, '2022-07-01'::date),
  ('Ijok','Niche','SUITE 1','SUITE 1','S1/S2/S3A','1',  '32(W)x30(H)x40(D)', 12800,  9800, 2000, 11800, 7500, '2022-07-01'::date)
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
