-- ============================================================
-- OV6 1ST FLOOR SECTION A — PEDESTAL PRICE LIST
-- product_name = 'OV6-1F-AT' (matches portal zone name)
-- WEF 01.08.2025
--
-- Column mapping for pedestal (different from burial plot):
--   as_need_price         = Original Pedestal Price
--   pre_need_price        = Pre-Launch Pedestal Price
--   trust_account_facility = null (not applicable)
--   backwall_cost          = null (not applicable)
--   total_pre_need_price  = Special Promotion Price
--   point_value           = PV
-- ============================================================

-- Remove old OV6 Pedestal rows if they exist under the wrong product_name
DELETE FROM product_price_list
WHERE site_code = 'Semenyih'
  AND product_name = 'OV6 Pedestal';

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Pedestal','OV6-1F-AT','Level 1,2,3,3A,5,6,7',   '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01',
   'Original=33800 | Pre-Launch=25800 | Special Promo=20800. No Ancestral Tablet till 30 Sep 2026'),

  ('Semenyih','Pedestal','OV6-1F-AT','Level 8,9,10,11,12,13,13A','138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01',
   'Original=29800 | Pre-Launch=21800 | Special Promo=16800. No Ancestral Tablet till 30 Sep 2026'),

  ('Semenyih','Pedestal','OV6-1F-AT','Level 15,16,17',           '200(W)x379(H)x106(D) mm',31800,23800,null,null,18800,14000,'2025-08-01',
   'Original=31800 | Pre-Launch=23800 | Special Promo=18800. No Ancestral Tablet till 30 Sep 2026');
