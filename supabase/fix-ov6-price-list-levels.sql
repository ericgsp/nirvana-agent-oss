-- Split OV6-1F-AT grouped lot_no rows into individual level rows

-- Delete the 3 grouped rows
DELETE FROM product_price_list
WHERE site_code = 'Semenyih'
  AND product_name = 'OV6-1F-AT';

-- Re-insert as individual level rows
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  -- Level 1,2,3,3A,5,6,7 → individual rows (138x250x55 mm, Original=33800, Pre-Launch=25800, Special=20800)
  ('Semenyih','Pedestal','OV6-1F-AT','Level 1', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 2', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 3', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 3A','138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 5', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 6', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 7', '138(W)x250(H)x55(D) mm',33800,25800,null,null,20800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),

  -- Level 8,9,10,11,12,13,13A → individual rows (138x250x55 mm, Original=29800, Pre-Launch=21800, Special=16800)
  ('Semenyih','Pedestal','OV6-1F-AT','Level 8',  '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 9',  '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 10', '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 11', '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 12', '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 13', '138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 13A','138(W)x250(H)x55(D) mm',29800,21800,null,null,16800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),

  -- Level 15,16,17 → individual rows (200x379x106 mm, Original=31800, Pre-Launch=23800, Special=18800)
  ('Semenyih','Pedestal','OV6-1F-AT','Level 15','200(W)x379(H)x106(D) mm',31800,23800,null,null,18800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 16','200(W)x379(H)x106(D) mm',31800,23800,null,null,18800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026'),
  ('Semenyih','Pedestal','OV6-1F-AT','Level 17','200(W)x379(H)x106(D) mm',31800,23800,null,null,18800,14000,'2025-08-01','No Ancestral Tablet till 30 Sep 2026');
