-- ============================================================
-- Ijok — MAJESTIC 1 (Burial Plot)
-- WEF: 17.03.2026
-- Note: prices exclude hole excavation & formation charges
-- Note: FA lot 8A~128 uses special lot numbering (8A→8B→...→8→18→28...)
-- ============================================================

INSERT INTO product_price_list
  (site_code, product_category, product_name, section_group, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, active)
SELECT * FROM (VALUES
  ('Ijok','Burial Plot','MAJESTIC 1','FB~FH','18~128',    '864sft (24''x36'')', 348800,258800,24000,20000,302800,175000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FB~FH','138',        '864sft (24''x36'')', 358800,268800,24000,20000,312800,175000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FB~FD','178~268',    '864sft (24''x36'')', 368800,278800,24000,20000,322800,185000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FB~FD','168 & 278',  '864sft (24''x36'')', 378800,288800,24000,20000,332800,185000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FE~FJ','178~268',    '864sft (24''x36'')', 388800,298800,24000,20000,342800,195000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FE~FJ','168 & 278',  '864sft (24''x36'')', 398800,308800,24000,20000,352800,195000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FA',   '8A~128',     '1008sft (24''x42'')',402800,302800,26000,30000,358800,195000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FA',   '138',        '1008sft (24''x42'')',412800,312800,26000,30000,368800,195000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FA',   '178~268',    '1008sft (24''x42'')',425800,322800,26000,30000,378800,205000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','MAJESTIC 1','FA',   '168 & 278',  '1008sft (24''x42'')',435800,332800,26000,30000,388800,205000,'2026-03-17'::date,true)
) AS v(site_code, product_category, product_name, section_group, lot_no, size_description,
       as_need_price, pre_need_price, trust_account_facility, backwall_cost,
       total_pre_need_price, point_value, wef_date, active)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.section_group = v.section_group
    AND p.lot_no        = v.lot_no
);
