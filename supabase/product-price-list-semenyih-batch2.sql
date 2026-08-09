-- ============================================================
-- SEMENYIH — Batch 2 price list data
-- New products not yet in product_price_list
-- Run in Supabase SQL Editor
-- ============================================================

-- ── NV-F BURIAL PLOT (WEF 01.07.2023) ───────────────────────
-- Note: prices exclude hole excavation & formation charges

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-F','SA-SD (18)',        '96 sft (6''x16'')',  23800,19800,3000,2500,25300,14000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','SA-SD (28~1198)',   '96 sft (6''x16'')',  22800,18800,3000,2500,24300,14000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DAA-DL (18)',       '192 sft (12''x16'')',45800,37800,6000,5000,48800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DM (18)',           '192 sft (12''x16'')',48800,40800,6000,5000,51800,29000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DAA-DF (28~388)',   '192 sft (12''x16'')',43800,35800,6000,5000,46800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DAA (398)',         '192 sft (12''x16'')',45800,37800,6000,5000,48800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DA-DC (398)',       '256 sft (16''x16'')',63800,50800,7000,6000,63800,36000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DD-DE (398)',       '320 sft (20''x16'')',79800,63800,8000,7000,78800,45000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DF (398)',          '352 sft (22''x16'')',87800,69800,9000,8000,86800,45000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DG-DM (28~398)',   '192 sft (12''x16'')',43800,35800,6000,5000,46800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DG-DL (618)',      '192 sft (12''x16'')',45800,37800,6000,5000,48800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DN (18)',           '312 sft (12''x26'')',77800,62800,8000,13000,83800,45000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DN (28~318)',       '312 sft (12''x26'')',72800,57800,8000,13000,78800,40500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DN (328)',          '520 sft (20''x26'')',122800,98800,12000,15000,125800,69000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DP-DZ (18)',       '192 sft (12''x16'')',48800,40800,6000,5000,51800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DP-DR (28~318)',   '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DS-DU (28~238)',   '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DS (268)',         '320 sft (20''x16'')',81800,65800,8000,7000,80800,45000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DT (268)',         '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DV-DX (28~198)',  '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DV (218)',         '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DV (228)',         '256 sft (16''x16'')',65800,52800,7000,6000,65800,36000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DW (218)',         '320 sft (20''x16'')',81800,65800,8000,7000,80800,45000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DX (218)',         '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DY-DZ (28~188)',  '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DY (198)',         '256 sft (16''x16'')',65800,52800,7000,6000,65800,36000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','DZ (198)',         '192 sft (12''x16'')',46800,38800,6000,5000,49800,27500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','FA-FB (28~88)',    '768 sft (24''x32'')',220800,176800,24000,19000,219800,122500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-F','FA-FB (18, 98)',   '768 sft (24''x32'')',225800,181800,24000,19000,224800,122500,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-E BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-E','DAE-DD (08-298/338-938)',  '192 sft (12''x16'')',  60800, 52800,6000,5000, 63800, 36960,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DA-DD (318-328)',          '192 sft (12''x16'')',  63800, 55800,6000,5000, 66800, 39060,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DE-DR (08-298/338-938)',   '192 sft (12''x16'')',  71800, 63800,6000,5000, 74800, 44660,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DE-DR (318-328)',          '192 sft (12''x16'')',  74800, 66800,6000,5000, 77800, 46760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DS-DT (08-288/368-938)',   '192 sft (12''x16'')',  71800, 63800,6000,5000, 74800, 44660,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DS-DT (298-338)',          '256 sft (16''x16'')',  98800, 85800,7000,6000, 98800, 60060,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DU-DZ (08-298/338-938)',   '192 sft (12''x16'')',  71800, 63800,6000,5000, 74800, 44660,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','DU-DZ (318-328)',          '192 sft (12''x16'')',  74800, 66800,6000,5000, 77800, 46760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','FA (8-128/188-318)',       '912 sft (24''x38'')', 302800,272800,28000,20000,320800,190960,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','FA (138-168)',             '912 sft (24''x38'')', 312800,282800,28000,20000,330800,197960,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','FB-FG (8-128/188-318)',    '768 sft (24''x32'')', 253800,229800,24000,13000,266800,160860,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','FB-FG (138-168)',          '768 sft (24''x32'')', 263800,239800,24000,13000,276800,167860,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','SFA (68-88)',              '3456 sft (48''x72'')',1178800,1071800,96000,68000,1235800,750260,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-E','SFA (8-38/98-138)',        '3456 sft (48''x72'')',1140800,1036800,96000,68000,1200800,725760,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-D BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-D','DA-DZ (08A-318/368-968)',  '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DA-DZ (328-338)',          '216 sft (12''x18'')', 58800,49880,6000,5000, 60880, 34916,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAA (08A-268)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAA (288-968)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAB (08A-218)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAB (228-268)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAC (08A-188)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAC (198-218)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAD (08A-168)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAD (188-198)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAE (08A-138)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAE (168-188)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAF-DAG (08A-128)',        '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAF (138-168)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAG (138)',                '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAH (08A-118)',            '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAH (128)',                '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAJ-DAL (08A-98A)',        '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAJ-DAL (118)',            '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAM (08A-68)',             '216 sft (12''x18'')', 53800,45880,6000,5000, 56880, 32116,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAM (88-118)',             '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','DAN (08-68)',              '216 sft (12''x18'')', 59800,50880,6000,5000, 61880, 35616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','FA 8',                    '1512 sft (36''x42'')',403800,322880,42000,24000,388880,226016,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','FA (18-138/198-328)',      '1008 sft (24''x42'')',276800,220880,28000,18000,266880,154616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','FA (168-188)',             '1008 sft (24''x42'')',286800,228880,28000,18000,274880,160216,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','FB-FG (8-138/198-328)',    '864 sft (24''x36'')', 238800,190880,24000,11000,225880,133616,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','FB-FG (168-188)',          '864 sft (24''x36'')', 248800,198880,24000,11000,233880,139216,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','SFA 18',                  '4032 sft (72''x56'')',1043800,834880,108000,85000,1027880,584416,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-D','SFA (28-68/118-168)',      '2688 sft (48''x56'')', 702800,561880,72000,64000,697880,393316,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-G BURIAL PLOT (WEF 01.07.2023) ───────────────────────
-- Rows from two separate screenshots combined

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-G','DG 8',                     '409 sft',             82000, 69000,12000,5000, 86000, 48300,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DH 8',                     '445 sft',             93000, 78000,12000,5000, 95000, 54600,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DJ 8',                     '499 sft',            103000, 87000,14000,6000,107000, 60900,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DK 8',                     '562 sft',            113000, 97000,16000,7000,120000, 67900,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DL 8',                     '558 sft',            112000, 96000,16000,7000,119000, 67200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DM 8',                     '810 sft (45''x18'')',148000,134000,24000,11000,169000, 93800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DN 8',                     '810 sft (45''x18'')',148000,134000,24000,11000,169000, 93800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DP 8',                     '432 sft (24''x18'')', 92000, 76000,12000,6000, 94000, 53200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DAB-DL (18-298/338-938)',  '216 sft (12''x18'')', 46000, 38000,6000,4000, 48000, 26600,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DAB-DL (318-328)',         '216 sft (12''x18'')', 49000, 41000,6000,4000, 51000, 28700,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DM-DP (18-128/188-288)',   '432 sft (24''x18'')', 91000, 76000,12000,6000, 94000, 53200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DM-DP (138-168)',          '432 sft (24''x18'')', 97000, 82000,12000,6000,100000, 57400,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FA 8',                     '1840 sft',           435000,395000,50000,12000,457000,276500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FA (18-288)',              '1104 sft (24''x46'')',265000,240000,30000,14000,284000,168000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FB 18',                    '1845 sft',           435000,396000,50000,12000,458000,277200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FD 18',                    '1233 sft',           293000,267000,36000,12000,315000,186900,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FB-FD (28-128/188-288)',   '864 sft (24''x36'')',210000,190000,24000,9000,223000,133000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FE 28',                    '1395 sft',           330000,301000,39000,12000,352000,210700,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FE (38-128/188-288)',      '864 sft (24''x36'')',210000,190000,24000,9000,223000,133000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FF 38',                    '1467 sft',           346000,316000,42000,12000,370000,221200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FF-FJ (68-128/188-288)',   '864 sft (24''x36'')',210000,190000,24000,9000,223000,133000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','FB-FJ (138-168)',          '864 sft (24''x36'')',225000,205000,24000,9000,238000,143500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  -- Additional NV-G lots from second screenshot
  ('Semenyih','Burial Plot','NV-G','DAB-DA (8)',               '216 sft (12''x18'')', 46000, 38000,6000,4000, 48000, 26600,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DB 8',                     '256 sft',             52000, 44000,7000,4000, 55000, 30800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DD 8',                     '297 sft',             60000, 50000,8000,5000, 63000, 35000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DE 8',                     '333 sft',             68000, 57000,9000,5000, 71000, 39900,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-G','DF 8',                     '373 sft',             75000, 63000,10000,5000, 78000, 44100,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-A BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-A','DAE-DZ',             '216 sft (12''x18'')',   62000,  54000, 6000, 5000,  65000,  37800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','DU',                 '336 sft (12''x28'')',   96000,  84000, 9000, 8000, 101000,  58800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','FA-FD (198-328)',    '864 sft (24''x36'')',  276800, 246800,24000,13000, 283800, 172760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','FA-FD (188)',        '864 sft (24''x36'')',  286800, 256800,24000,13000, 293800, 179760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','FA-FB (18-138)',     '864 sft (24''x36'')',  276800, 246800,24000,13000, 283800, 172760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','FA-FB (168)',        '864 sft (24''x36'')',  286800, 256800,24000,13000, 293800, 179760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','SFA-SFB (18-68)',   '3456 sft (48''x72'')',1445800,1313800,96000,68000,1477800, 919660,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','SFA-SFB (88-98)',   '3456 sft (48''x72'')',1459800,1326800,96000,68000,1490800, 928760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-A','SFA (118-168)',      '3456 sft (48''x72'')',1445800,1313800,96000,68000,1477800, 919660,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-B BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-B','SA-SD 18-968',      '96 sft (6''x16'')',    14000, 12000, 3000, 3000,  18000,   8400,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DA-DD 838-1168',    '144 sft (9''x16'')',   22000, 18000, 3000, 3000,  24000,  12600,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DA-DM 668-828',     '192 sft (12''x16'')',  28000, 24000, 6000, 4000,  34000,  16800,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DP-DZ 668-828',     '192 sft (12''x16'')',  30000, 25000, 6000, 4000,  35000,  17500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DE-DM 838-998',     '288 sft (18''x16'')',  43000, 36000, 8000, 5000,  49000,  25200,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DP-DZ 838-998',     '288 sft (18''x16'')',  45000, 38000, 8000, 5000,  51000,  26600,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DN 668-828',        '312 sft (12''x26'')',  48000, 41000, 9000, 5000,  55000,  28700,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','DN 838-998',        '468 sft (18''x26'')',  73000, 61000,12000, 6000,  79000,  42700,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','FB-FD 28-168',      '768 sft (24''x32'')', 195000,176800,24000,19000, 219800, 123760,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','FB-FD 18',          '768 sft (24''x32'')', 200000,181800,24000,19000, 224800, 127260,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','FA 28-218',         '612 sft (18''x34'')', 158800,140800,18000,11000, 169800,  98560,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-B','FA 18',             '816 sft (24''x34'')', 270000,244800,24000,13000, 281800, 171360,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-J & NV-K BURIAL PLOTS (WEF 01.08.2024) ───────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-J','DA-DP/DR-DV',  '216 sft (12''x18'')', 97800, 86800,6000, 6000, 98800,210000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-J','DQ',            '336 sft (12''x28'')',151800,133800,9000,14500,157300, 90000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-J','FA-FC',         '864 sft (24''x36'')',388800,345800,24000,20000,389800,210000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-K','DG-DP/DR-DT',  '216 sft (12''x18'')', 97800, 86800,6000, 6000, 98800, 60000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-K','DQ',            '336 sft (12''x28'')',151800,133800,9000,14500,157300, 90000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-K','FA-FD',         '864 sft (24''x36'')',388800,345800,24000,20000,389800,210000,'2024-08-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-K','FAA',           '864 sft (24''x36'')',388800,345800,24000,20000,389800,210000,'2024-08-01','Prices exclude hole excavation & formation charges');


-- ── HORIZON 3 BURIAL PLOT — PAGE 1 (WEF 05.04.2025) ─────────
-- Note: No interment allowed till 31 Dec 2025

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','Horizon 3','DA-DL (278~738)',   '216 sft (12''x18'')',  171800, 136800, 6000,  6300, 149100,  95000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','DA-DL (268)',       '216 sft (12''x18'')',  176800, 141800, 6000,  6300, 154100,  95000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FG (108,138~278)',  '864 sft (24''x36'')',  668800, 538800,24000, 20000, 582800, 350000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FG (118 & 128)',    '864 sft (24''x36'')',  688800, 558800,24000, 20000, 602800, 350000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FH (168~278)',      '864 sft (24''x36'')',  668800, 538800,24000, 20000, 582800, 350000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FH (108 & 138)',   '1296 sft (36''x36'')', 1038800, 838800,36000, 30000, 904800, 500000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FJ (138~278)',     '1008 sft (24''x42'')',  818800, 651800,28000, 28000, 707800, 400000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FJ (128)',         '1008 sft (24''x42'')',  838800, 671800,28000, 28000, 727800, 400000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FK-FL (138~278)',   '864 sft (24''x36'')',  688800, 558800,24000, 20000, 602800, 350000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FK-FL (128)',       '864 sft (24''x36'')',  708800, 578800,24000, 20000, 622800, 350000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFA (108~198)',    '1920 sft (32''x60'')', 1561800,1248800,54000,110000,1412800, 800000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFA (98)',         '1920 sft (32''x60'')', 1611800,1298800,54000,110000,1462800, 800000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFB (108~198)',    '1920 sft (32''x60'')', 1611800,1298800,54000,110000,1462800, 800000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFB (98)',         '1920 sft (32''x60'')', 1661800,1348800,54000,110000,1512800, 800000,'2025-04-05','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges');


-- ── HORIZON 3 BURIAL PLOT — PAGE 2 (WEF 01.07.2024) ─────────
-- Note: No interment allowed till 31 Dec 2025

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','Horizon 3','FA-FE',              '864 sft (24''x36'')',  648800, 518800,24000, 20000, 562800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FA-FE (118 & 128)',  '864 sft (24''x36'')',  668800, 538800,24000, 20000, 582800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FF-FH',              '864 sft (24''x36'')',  668800, 538800,24000, 20000, 582800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FF-FG (118 & 128)',  '864 sft (24''x36'')',  688800, 558800,24000, 20000, 602800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FH (108 & 138)',    '1296 sft (36''x36'')', 1038800, 838800,36000, 30000, 904800, 500000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FJ',               '1008 sft (24''x42'')',  818800, 651800,28000, 28000, 707800, 400000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FJ (118 & 128)',   '1008 sft (24''x42'')',  838800, 671800,28000, 28000, 727800, 400000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FK-FL',             '864 sft (24''x36'')',  688800, 558800,24000, 20000, 602800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','FK-FL (118 & 128)', '864 sft (24''x36'')',  708800, 578800,24000, 20000, 622800, 350000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFA',              '1920 sft (32''x60'')', 1561800,1248800,54000,110000,1412800, 800000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFA (88 & 98)',    '1920 sft (32''x60'')', 1611800,1298800,54000,110000,1462800, 800000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFB',              '1920 sft (32''x60'')', 1611800,1298800,54000,110000,1462800, 800000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Horizon 3','SFB (88 & 98)',    '1920 sft (32''x60'')', 1661800,1348800,54000,110000,1512800, 800000,'2024-07-01','No interment till 31 Dec 2025. Prices exclude hole excavation & formation charges');


-- ── GARDEN 6 BURIAL PLOT (WEF 06.06.2025) ────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','Garden 6','DAM-DAA (308)',      '192 sft (12''x16'')',141800,128800,6000,6000,140800,88000,'2025-06-06','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Garden 6','DAM-DAA (318~798)', '192 sft (12''x16'')',136800,123800,6000,6000,135800,88000,'2025-06-06','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Garden 6','DA-DG (308)',       '192 sft (12''x16'')',146800,133800,6000,6000,145800,90000,'2025-06-06','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Garden 6','DA-DG (318~798)',   '192 sft (12''x16'')',141800,128800,6000,6000,140800,90000,'2025-06-06','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Garden 6','DH (318)',          '192 sft (12''x16'')',146800,133800,6000,6000,145800,90000,'2025-06-06','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Garden 6','DH (328~798)',      '192 sft (12''x16'')',141800,128800,6000,6000,140800,90000,'2025-06-06','Prices exclude hole excavation & formation charges');


-- ── OV6 COLUMBARIUM — SECTION S/D1 TO S/D6 (WEF 25.07.2025) ─
-- Different sections from the already-inserted S/D16-S/D26 sheet

-- TD2/TD5, Level 1 only
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','TD2/TD5','1','51(W)x60(H)x40(D) cm',158800,138800,6000,144800,100000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- D2/D5 sections
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','9','51(W)x36(H)x40(D) cm',68800,58800,3000,61800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','8','51(W)x36(H)x40(D) cm',68800,58800,3000,61800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','7','51(W)x36(H)x40(D) cm',81800,71800,3000,74800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','6','51(W)x30(H)x40(D) cm',93800,83800,3000,86800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','5','51(W)x30(H)x40(D) cm',98800,88800,3000,91800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','3A','51(W)x30(H)x40(D) cm',93800,83800,3000,86800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','3','51(W)x30(H)x40(D) cm',81800,71800,3000,74800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','2','51(W)x30(H)x40(D) cm',73800,63800,3000,66800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D2/D5','1','51(W)x30(H)x40(D) cm',73800,63800,3000,66800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- D1/D3/D3A/D6 sections
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','9','51(W)x36(H)x40(D) cm',60800,50800,3000,53800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','8','51(W)x36(H)x40(D) cm',60800,50800,3000,53800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','7','51(W)x36(H)x40(D) cm',73800,63800,3000,66800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','6','51(W)x30(H)x40(D) cm',85800,75800,3000,78800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','5','51(W)x30(H)x40(D) cm',90800,80800,3000,83800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','3A','51(W)x30(H)x40(D) cm',85800,75800,3000,78800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','3','51(W)x30(H)x40(D) cm',73800,63800,3000,66800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','2','51(W)x30(H)x40(D) cm',65800,55800,3000,58800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D1/D3/D3A/D6','1','51(W)x30(H)x40(D) cm',65800,55800,3000,58800,45000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- S1/S3/S3A/S6 sections (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','9','32(W)x36(H)x40(D) cm',31800,26800,1500,28300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','8','32(W)x36(H)x40(D) cm',31800,26800,1500,28300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','7','32(W)x36(H)x40(D) cm',38800,33800,1500,35300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','6','32(W)x30(H)x40(D) cm',44800,39800,1500,41300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','5','32(W)x30(H)x40(D) cm',47800,42800,1500,44300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','3A','32(W)x30(H)x40(D) cm',44800,39800,1500,41300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','3','32(W)x30(H)x40(D) cm',38800,33800,1500,35300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','2','32(W)x30(H)x40(D) cm',34800,29800,1500,31300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S1/S3/S3A/S6','1','32(W)x30(H)x40(D) cm',34800,29800,1500,31300,24000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');


-- ── NV GRAND IMPERIAL 2 BURIAL PLOT (WEF 01.10.2025) ─────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Grand Imperial 2','RA~RD (8~68)', '3360 sft (48''x70'')',3023000,2688000,96000,160000,2944000,1600000,'2025-10-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Grand Imperial 2','RA~RD (88)',   '3360 sft (48''x70'')',3133000,2798000,96000,160000,3054000,1600000,'2025-10-01','Prices exclude hole excavation & formation charges');
