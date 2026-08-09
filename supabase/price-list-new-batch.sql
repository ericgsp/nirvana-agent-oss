-- New price list data — batch from PNG uploads
-- Skips duplicates via ON CONFLICT DO NOTHING
-- Run in Supabase SQL Editor

-- ── NV Grand Imperial 2 (Royal Burial Plot, Semenyih, WEF 01.10.2025) ──────
-- Sections RA~RD, 3360 sft
-- Two price tiers: lots 8~68 and lot 88

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Grand Imperial 2','RA~RD (8~68)','Royal','3360 sft',
   3023000,2688000,96000,160000,2944000,1600000,'2025-10-01',NULL),
  ('Semenyih','Burial Plot','NV Grand Imperial 2','RA~RD (88)','Royal','3360 sft',
   3133000,2798000,96000,160000,3054000,1600000,'2025-10-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;


-- ── OV6 Columbarium S/D1–S/D6 (Niche, Semenyih, WEF 25.07.2025) ────────────
-- Note on all rows: Urn installation only allowed after 30 Sep 2026
-- Column mapping: as_need=AS-NEED NICHE PRICE, pre_need=PRE-NEED NICHE PRICE,
--   trust=TRUST ACCOUNT 3, backwall=NULL, total=TOTAL PRE-NEED PRICE

-- TD2 / TD5 — Level 1 only (51x60x40mm)
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV6-TD2','Level 1','Niche','51x60x40mm',
   158800,138800,6000,NULL,144800,100000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-TD5','Level 1','Niche','51x60x40mm',
   158800,138800,6000,NULL,144800,100000,'2025-07-25','Urn installation after 30 Sep 2026')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- D2 / D5 — Levels 1–9
-- Levels 1–6: 51x30x40mm; Levels 7,8,9: 51x36x40mm
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV6-D2','Level 1','Niche','51x30x40mm',58800,50800,3000,NULL,53800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 2','Niche','51x30x40mm',62800,54800,3000,NULL,57800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 3','Niche','51x30x40mm',68800,60800,3000,NULL,63800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 3A','Niche','51x30x40mm',68800,60800,3000,NULL,63800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 4','Niche','51x30x40mm',78800,70800,3000,NULL,73800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 5','Niche','51x30x40mm',88800,80800,3000,NULL,83800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 6','Niche','51x30x40mm',88800,80800,3000,NULL,83800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 7','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 8','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D2','Level 9','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-D5','Level 1','Niche','51x30x40mm',58800,50800,3000,NULL,53800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 2','Niche','51x30x40mm',62800,54800,3000,NULL,57800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 3','Niche','51x30x40mm',68800,60800,3000,NULL,63800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 3A','Niche','51x30x40mm',68800,60800,3000,NULL,63800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 4','Niche','51x30x40mm',78800,70800,3000,NULL,73800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 5','Niche','51x30x40mm',88800,80800,3000,NULL,83800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 6','Niche','51x30x40mm',88800,80800,3000,NULL,83800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 7','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 8','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D5','Level 9','Niche','51x36x40mm',98800,88800,3000,NULL,91800,51000,'2025-07-25','Urn installation after 30 Sep 2026')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- D1 / D3 / D3A / D6 — Levels 1–9
-- Levels 1–6: 51x30x40mm; Levels 7,8,9: 51x36x40mm
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV6-D1','Level 1','Niche','51x30x40mm',60800,52800,3000,NULL,55800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 2','Niche','51x30x40mm',64800,56800,3000,NULL,59800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 3','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 3A','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 4','Niche','51x30x40mm',80800,72800,3000,NULL,75800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 5','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 6','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 7','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 8','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D1','Level 9','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-D3','Level 1','Niche','51x30x40mm',60800,52800,3000,NULL,55800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 2','Niche','51x30x40mm',64800,56800,3000,NULL,59800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 3','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 3A','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 4','Niche','51x30x40mm',80800,72800,3000,NULL,75800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 5','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 6','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 7','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 8','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3','Level 9','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-D3A','Level 1','Niche','51x30x40mm',60800,52800,3000,NULL,55800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 2','Niche','51x30x40mm',64800,56800,3000,NULL,59800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 3','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 3A','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 4','Niche','51x30x40mm',80800,72800,3000,NULL,75800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 5','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 6','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 7','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 8','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D3A','Level 9','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-D6','Level 1','Niche','51x30x40mm',60800,52800,3000,NULL,55800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 2','Niche','51x30x40mm',64800,56800,3000,NULL,59800,45000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 3','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 3A','Niche','51x30x40mm',70800,62800,3000,NULL,65800,48000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 4','Niche','51x30x40mm',80800,72800,3000,NULL,75800,50000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 5','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 6','Niche','51x30x40mm',86800,78800,3000,NULL,81800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 7','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 8','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-D6','Level 9','Niche','51x36x40mm',90800,82800,3000,NULL,85800,51000,'2025-07-25','Urn installation after 30 Sep 2026')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- S1 / S3 / S3A / S6 — Levels 1–9 (smaller niches)
-- Levels 1–6: 51x20x40mm; Levels 7,8,9: 51x24x40mm
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV6-S1','Level 1','Niche','51x20x40mm',38800,32800,2000,NULL,34800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 2','Niche','51x20x40mm',40800,34800,2000,NULL,36800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 3','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 3A','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 4','Niche','51x20x40mm',50800,44800,2000,NULL,46800,34000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 5','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 6','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 7','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 8','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S1','Level 9','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-S3','Level 1','Niche','51x20x40mm',38800,32800,2000,NULL,34800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 2','Niche','51x20x40mm',40800,34800,2000,NULL,36800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 3','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 3A','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 4','Niche','51x20x40mm',50800,44800,2000,NULL,46800,34000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 5','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 6','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 7','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 8','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3','Level 9','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-S3A','Level 1','Niche','51x20x40mm',38800,32800,2000,NULL,34800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 2','Niche','51x20x40mm',40800,34800,2000,NULL,36800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 3','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 3A','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 4','Niche','51x20x40mm',50800,44800,2000,NULL,46800,34000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 5','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 6','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 7','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 8','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S3A','Level 9','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),

  ('Semenyih','Columbarium','OV6-S6','Level 1','Niche','51x20x40mm',38800,32800,2000,NULL,34800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 2','Niche','51x20x40mm',40800,34800,2000,NULL,36800,30000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 3','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 3A','Niche','51x20x40mm',44800,38800,2000,NULL,40800,32000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 4','Niche','51x20x40mm',50800,44800,2000,NULL,46800,34000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 5','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 6','Niche','51x20x40mm',56800,50800,2000,NULL,52800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 7','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 8','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026'),
  ('Semenyih','Columbarium','OV6-S6','Level 9','Niche','51x24x40mm',62800,56800,2000,NULL,58800,35000,'2025-07-25','Urn installation after 30 Sep 2026')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;
