-- ============================================================
-- SEMENYIH — Batch 4: NV-R, NV-S, NV Dynasty 1, NV Dynasty 2,
--                     NV Majestic 1, NV Majestic 2
-- Run in Supabase SQL Editor
-- ============================================================

-- ── NV-R BURIAL PLOT (WEF 01.03.2024) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-R','SAB~SF (8~388)',    '96 sft (6''x16'')',  46800,39800,3000, 3000, 45800,28000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','SAB~SF (398 & 608)','96 sft (6''x16'')',  50800,43800,3000, 3000, 49800,28000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','SAB~SF (618~1078)', '96 sft (6''x16'')',  46800,39800,3000, 3000, 45800,28000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DAE~DE (8~188)',    '192 sft (12''x16'')',87800,72800,6000, 5200, 84000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DAE~DE (198 & 208)','192 sft (12''x16'')',93800,78800,6000, 5200, 90000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DAE~DE (218~618)',  '192 sft (12''x16'')',87800,72800,6000, 5200, 84000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DF (8~178)',        '192 sft (12''x16'')',87800,72800,6000, 5200, 84000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DF (188 & 218)',    '192 sft (12''x16'')',93800,78800,6000, 5200, 90000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DF (228~608)',      '192 sft (12''x16'')',87800,72800,6000, 5200, 84000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DG (8~178)',        '312 sft (12''x26'')',115800,100800,6000,13000,119800,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DG (188 & 218)',    '312 sft (12''x26'')',121800,106800,6000,13000,125800,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DG (228~398)',      '312 sft (12''x26'')',115800,100800,6000,13000,119800,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DH~DY (8~188)',     '192 sft (12''x16'')',91800,76800,6000, 5200, 88000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DH~DY (198 & 208)', '192 sft (12''x16'')',97800,82800,6000, 5200, 94000,50000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-R','DH~DY (218~398)',   '192 sft (12''x16'')',91800,76800,6000, 5200, 88000,50000,'2024-03-01','Prices exclude hole excavation & formation charges');


-- ── NV-S BURIAL PLOT (WEF 08.06.2024) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-S','DAB-DB',            '192 sft (12''x16'')', 67800,57800,6000, 6000, 69800,45000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DAB-DB (218 & 228)','192 sft (12''x16'')', 72800,62800,6000, 6000, 74800,45000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DD-DF',             '192 sft (12''x16'')', 69800,59800,6000, 6000, 71800,45000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DD-DF (218 & 228)', '192 sft (12''x16'')', 74800,64800,6000, 6000, 76800,45000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DG',                '240 sft (12''x20'')',100800,85800,6000,10000,101800,64000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DG (218 & 228)',    '240 sft (12''x20'')',105800,90800,6000,10000,106800,64000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DH-DQ',             '192 sft (12''x16'')', 78800,68800,6000, 6000, 80800,50000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DH-DQ (218 & 228)', '192 sft (12''x16'')', 83800,73800,6000, 6000, 85800,50000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DR-DZ',             '192 sft (12''x16'')', 83800,73800,6000, 6000, 85800,50000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','DR-DZ (218 & 228)', '192 sft (12''x16'')', 88800,78800,6000, 6000, 90800,50000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','SE-SG',             '96 sft (6''x16'')',   36800,30800,3000, 4000, 37800,23000,'2024-06-08','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-S','SE-SG (338 & 368)', '96 sft (6''x16'')',   39800,33800,3000, 4000, 40800,23000,'2024-06-08','Prices exclude hole excavation & formation charges');


-- ── NV DYNASTY 1 BURIAL PLOT (WEF 01.07.2023) ───────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Dynasty 1','SFA & SFB (8~68)',   '1920 sft (32''x60'')', 880800, 800800,60000,92000, 952800,460000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','SFA & SFB (78~88)',  '1920 sft (32''x60'')', 900800, 820800,60000,92000, 972800,460000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','SFA & SFB (98~168)', '1920 sft (32''x60'')', 880800, 800800,60000,92000, 952800,460000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FA-FH (8~88)',        '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FA-FH (98, 108)',     '768 sft (24''x32'')',  338800, 303800,24000,19000, 346800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FA-FH (118~198)',     '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FJ (8~78)',           '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FJ (88, 118)',        '1024 sft (32''x32'')', 448800, 403800,30000,28000, 461800,240000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FJ (128~198)',        '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FK (8~88)',           '912 sft (24''x38'')',  398800, 358800,28000,27000, 413800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FK (98, 108)',        '912 sft (24''x38'')',  408800, 368800,28000,27000, 423800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FK (118~198)',        '912 sft (24''x38'')',  388800, 348800,28000,27000, 403800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FK (208)',            '1216 sft (32''x38'')', 518800, 468800,32000,30000, 530800,270000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FL-FR (8~88)',        '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FL-FR (98, 108)',     '768 sft (24''x32'')',  338800, 303800,24000,19000, 346800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FL-FR (118~198)',     '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 1','FL-FR (208)',         '1024 sft (32''x32'')', 448800, 403800,30000,28000, 461800,240000,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV DYNASTY 2 BURIAL PLOT (WEF 01.07.2023) ───────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Dynasty 2','FC-FH (8~88)',       '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FA (108)',            '768 sft (24''x32'')',  338800, 303800,24000,19000, 346800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FC-FH (98, 108)',    '768 sft (24''x32'')',  338800, 303800,24000,19000, 346800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FC-FH (118~198)',    '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FJ (8~78)',          '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FJ (88, 118)',       '1024 sft (32''x32'')', 448800, 403800,30000,28000, 461800,240000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FJ (128~198)',       '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FK (8~88)',          '912 sft (24''x38'')',  398800, 358800,28000,27000, 413800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FK (98, 108)',       '912 sft (24''x38'')',  408800, 368800,28000,27000, 423800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FK (118~198)',       '912 sft (24''x38'')',  388800, 348800,28000,27000, 403800,210000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FL-FV (8~88)',       '768 sft (24''x32'')',  328800, 293800,24000,19000, 336800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FL-FV (98, 108)',    '768 sft (24''x32'')',  338800, 303800,24000,19000, 346800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','FL-FV (118~198)',    '768 sft (24''x32'')',  318800, 283800,24000,19000, 326800,180000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','TDA-TDB (8~188)',    '384 sft (12''x32'')',  168800, 148800,12000,10000, 170800, 90000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','TDA-TDB (198 & 208)','384 sft (12''x32'')',  173800, 153800,12000,10000, 175800, 90000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Dynasty 2','TDA-TDB (218~398)',  '384 sft (12''x32'')',  163800, 143800,12000,10000, 165800, 90000,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV MAJESTIC 1 BURIAL PLOT (WEF 01.07.2023) ──────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Majestic 1','FA (18~98)',         '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FA (8, 118~128)',    '768 sft (24''x32'')',  368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FA (138~238)',       '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FB-FH (18~98)',      '768 sft (24''x32'')',  350800, 320800,24000,19000, 363800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FB-FH (8, 118~128)','768 sft (24''x32'')',  360800, 330800,24000,19000, 373800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FB-FH (138~238)',    '768 sft (24''x32'')',  350800, 320800,24000,19000, 363800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FJ (8)',             '768 sft (24''x32'')',  368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FJ (18~88)',         '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FJ (98, 138)',       '1024 sft (32''x32'')', 498800, 452800,30000,28000, 510800,265000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FJ (168~238)',       '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FK (18~98)',         '912 sft (24''x38'')',  425800, 389800,28000,27000, 444800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FK (8, 118~128)',    '912 sft (24''x38'')',  435800, 399800,28000,27000, 454800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FK (138~238)',       '912 sft (24''x38'')',  425800, 389800,28000,27000, 444800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FL-FT (18~98)',      '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FL-FT (8, 118~128)','768 sft (24''x32'')',  368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','FL-FT (138~238)',    '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','SFA-SFC (18~68)',    '1920 sft (32''x60'')', 978800, 908800,60000,92000,1060800,520000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','SFA-SFC (8, 88~98)','1920 sft (32''x60'')', 998800, 928800,60000,92000,1080800,520000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 1','SFA-SFC (118~188)', '1920 sft (32''x60'')', 978800, 908800,60000,92000,1060800,520000,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV MAJESTIC 2 BURIAL PLOT (WEF 01.07.2023) ──────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Majestic 2','FA (18~98)',          '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FA (118, 128, 238)',  '768 sft (24''x32'')',  368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FA (138~228)',        '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FB-FH (18~98)',       '768 sft (24''x32'')',  350800, 320800,24000,19000, 363800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FB-FH (118, 128, 238)','768 sft (24''x32'')', 360800, 330800,24000,19000, 373800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FB-FH (138~228)',     '768 sft (24''x32'')',  350800, 320800,24000,19000, 363800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FJ (18~88)',          '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FJ (98)',             '1152 sft (36''x32'')', 560800, 509800,36000,31500, 577300,295000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FJ (138)',            '1024 sft (32''x32'')', 498800, 452800,30000,28000, 510800,265000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FJ (168~228)',        '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FJ (238)',            '768 sft (24''x32'')',  368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FK (18~98)',          '912 sft (24''x38'')',  425800, 389800,28000,27000, 444800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FK (118, 128, 238)', '912 sft (24''x38'')',  435800, 399800,28000,27000, 454800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FK (138~228)',        '912 sft (24''x38'')',  425800, 389800,28000,27000, 444800,230000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FL-FT (18~98)',       '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FL-FT (118, 128, 238)','768 sft (24''x32'')', 368800, 338800,24000,19000, 381800,195000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Majestic 2','FL-FT (138~228)',     '768 sft (24''x32'')',  358800, 328800,24000,19000, 371800,195000,'2023-07-01','Prices exclude hole excavation & formation charges');
