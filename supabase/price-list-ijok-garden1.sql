-- ============================================================
-- Ijok — GARDEN 1 (Burial Plot)
-- WEF: 17.03.2026
-- Sections: DB~DH (Double 12'x18'), DJ~DR (Double), DS~DZ (Double), SB~SH (Single 6'x18')
-- Note: lot 8D is a special lot number prefix before normal numbering (8A→8B→8C→8D→8→18→28...)
-- ============================================================

INSERT INTO product_price_list
  (site_code, product_category, product_name, section_group, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, active)
SELECT * FROM (VALUES
  ('Ijok','Burial Plot','GARDEN 1','DB~DH','378~788', '216sft (12''x18'')', 69800,59800,6000,6000,71800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DB~DH','368 & 798','216sft (12''x18'')', 72800,62800,6000,6000,74800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DJ~DR','18~328',   '216sft (12''x18'')', 66800,56800,6000,6000,68800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DJ~DR','338',       '216sft (12''x18'')', 69800,59800,6000,6000,71800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DJ~DR','378~788',   '216sft (12''x18'')', 72800,62800,6000,6000,74800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DJ~DR','368 & 798', '216sft (12''x18'')', 75800,65800,6000,6000,77800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DS~DZ','8D~328',   '216sft (12''x18'')', 69800,59800,6000,6000,71800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DS~DZ','338',       '216sft (12''x18'')', 72800,62800,6000,6000,74800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DS~DZ','378~788',   '216sft (12''x18'')', 72800,62800,6000,6000,74800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','DS~DZ','368 & 798', '216sft (12''x18'')', 75800,65800,6000,6000,77800,45000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','SB~SH','8~608',    '108sft (6''x18'')',  35800,30800,3000,3500,37300,23000,'2026-03-17'::date,true),
  ('Ijok','Burial Plot','GARDEN 1','SB~SH','618',       '108sft (6''x18'')',  37800,32800,3000,3500,39300,23000,'2026-03-17'::date,true)
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
