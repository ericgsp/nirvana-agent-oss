-- ============================================================
-- Oriental Villa Columbarium — Block OV1, Ground Floor (Single 单位)
-- Site: Semenyih | WEF: 01.01.2020
-- Note: Niche price excludes maintenance & facility fees
-- SIDE encoded in section_group; niche_type = SINGLE throughout
-- ============================================================

-- Block B5, Side: SB (CENTER)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '9','29(W)x39(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '8','29(W)x39(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '7','29(W)x39(H)x29(D) cm', 20800, 17800, 1500, 19300, 12460, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '6','29(W)x29(H)x29(D) cm', 24800, 21800, 1500, 23300, 15260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '5','29(W)x29(H)x29(D) cm', 24800, 21800, 1500, 23300, 15260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE','3A','29(W)x29(H)x29(D) cm', 24800, 21800, 1500, 23300, 15260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '3','29(W)x29(H)x29(D) cm', 20800, 17800, 1500, 19300, 12460, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '2','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B5 SB(CENTER)','SINGLE', '1','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL)
) AS v(site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
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

-- Block B2 / B8, Side: SB (LEFT / RIGHT)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '9','29(W)x39(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '8','29(W)x39(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '7','29(W)x39(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '6','29(W)x29(H)x29(D) cm', 22800, 19800, 1500, 21300, 13860, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '5','29(W)x29(H)x29(D) cm', 22800, 19800, 1500, 21300, 13860, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE','3A','29(W)x29(H)x29(D) cm', 22800, 19800, 1500, 21300, 13860, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '3','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '2','29(W)x29(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B2/B8 SB(LEFT/RIGHT)','SINGLE', '1','29(W)x29(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL)
) AS v(site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
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

-- Block B3 / B3a / B6 / B7, Side: SR / SL
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
SELECT * FROM (VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '9','29(W)x39(H)x29(D) cm', 14800, 11800, 1500, 13300,  8260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '8','29(W)x39(H)x29(D) cm', 14800, 11800, 1500, 13300,  8260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '7','29(W)x39(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '6','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '5','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE','3A','29(W)x29(H)x29(D) cm', 18800, 15800, 1500, 17300, 11060, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '3','29(W)x29(H)x29(D) cm', 16800, 13800, 1500, 15300,  9660, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '2','29(W)x29(H)x29(D) cm', 14800, 11800, 1500, 13300,  8260, '2020-01-01'::date, NULL),
  ('Semenyih','Columbarium','Oriental Villa','OV1','GF','B3/B3a/B6/B7 SR/SL','SINGLE', '1','29(W)x29(H)x29(D) cm', 14800, 11800, 1500, 13300,  8260, '2020-01-01'::date, NULL)
) AS v(site_code, product_category, product_name, block, floor, section_group, niche_type, level, size_description,
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
