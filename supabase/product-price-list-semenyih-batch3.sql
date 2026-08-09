-- ============================================================
-- SEMENYIH — Batch 3: NV-Q, NV-N, NV-M, NV-L
-- NV-F skipped — already in database
-- Run in Supabase SQL Editor
-- ============================================================

-- ── NV-Q BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-Q','DA~DF (8~278)',  '192 sft (12''x16'')',73800,63800,6000,5200,75000,47000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-Q','DG~DM (8~278)', '192 sft (12''x16'')',78800,68800,6000,5200,80000,47000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-Q','DN (8~108)',     '192 sft (12''x16'')',78800,68800,6000,5200,80000,47000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-Q','SA (208~728)',   '96 sft (6''x16'')',  38800,33800,3000,2600,39400,23500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-Q','SB (8~738)',     '96 sft (6''x16'')',  38800,33800,3000,2600,39400,23500,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-Q','SD (8~738)',     '96 sft (6''x16'')',  38800,33800,3000,2600,39400,23500,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-N BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-N','DC~DK (8A~178)',   '192 sft (12''x16'')', 70800,60800,6000,5200, 72000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DC~DK (188 & 198)','192 sft (12''x16'')', 75800,65800,6000,5200, 77000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DC~DK (208~388)',  '192 sft (12''x16'')', 70800,60800,6000,5200, 72000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DL (8A~168)',      '192 sft (12''x16'')', 70800,60800,6000,5200, 72000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DL (178 & 208)',   '192 sft (12''x16'')', 75800,65800,6000,5200, 77000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DL (218~388)',     '192 sft (12''x16'')', 70800,60800,6000,5200, 72000,43000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DM (8A~168)',      '276 sft (12''x23'')', 98800,88800,6000,13000,107800,63000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DM (178 & 208)',   '276 sft (12''x23'')',103800,93800,6000,13000,112800,63000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DM (218~388)',     '276 sft (12''x23'')', 98800,88800,6000,13000,107800,63000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DN-DY (8A~178)',   '192 sft (12''x16'')', 78800,68800,6000,5200, 80000,48000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DN-DY (188 & 198)','192 sft (12''x16'')', 83800,73800,6000,5200, 85000,48000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-N','DN-DY (208~388)',  '192 sft (12''x16'')', 78800,68800,6000,5200, 80000,48000,'2023-07-01','Prices exclude hole excavation & formation charges');


-- ── NV-M BURIAL PLOT (WEF 01.03.2024) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-M','DAJ (18~88)',          '216 sft (12''x18'')',111800, 96800,6000, 8200,111000,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAJ (98~218)',         '216 sft (12''x18'')',106800,101800,6000, 8200,116000,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAJ (268~688)',        '216 sft (12''x18'')',106800,101800,6000, 8200,116000,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAJ (228, 238, 698)',  '216 sft (12''x18'')',111800, 96800,6000, 8200,111000,70000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAH-DF (18~88)',       '192 sft (12''x16'')', 99800, 84800,6000, 5200, 96000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAH-DF (98~218)',      '192 sft (12''x16'')',103800, 88800,6000, 5200,100000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAH-DF (268~688)',     '192 sft (12''x16'')',103800, 88800,6000, 5200,100000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DAH-DF (228, 238, 698)','192 sft (12''x16'')',109800, 94800,6000, 5200,106000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DG (18~88)',           '192 sft (12''x16'')',101800, 86800,6000, 5200, 98000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DG (98~198)',          '192 sft (12''x16'')',106800, 91800,6000, 5200,103000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DG (288~688)',         '192 sft (12''x16'')',106800, 91800,6000, 5200,103000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DG (218, 268, 698)',   '192 sft (12''x16'')',111800, 96800,6000, 5200,108000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DH (18~88)',           '276 sft (12''x23'')',132800,117800,6000,13000,136800,80000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DH (98~198)',          '276 sft (12''x23'')',137800,122800,6000,13000,141800,80000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DH (288~688)',         '276 sft (12''x23'')',137800,122800,6000,13000,141800,80000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DH (218, 268, 698)',   '276 sft (12''x23'')',142800,127800,6000,13000,146800,80000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DJ-DY (18~88)',        '192 sft (12''x16'')', 99800, 84800,6000, 5200, 96000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DJ-DY (98~218)',       '192 sft (12''x16'')',103800, 88800,6000, 5200,100000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DJ-DY (268~688)',      '192 sft (12''x16'')',103800, 88800,6000, 5200,100000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DJ-DY (228, 238, 698)','192 sft (12''x16'')',109800, 94800,6000, 5200,106000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DZ (18~88)',           '192 sft (12''x16'')',101800, 86800,6000, 5200, 98000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DZ (98~218)',          '192 sft (12''x16'')',106800, 91800,6000, 5200,103000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DZ (268~688)',         '192 sft (12''x16'')',106800, 91800,6000, 5200,103000,60000,'2024-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-M','DZ (228, 238, 698)',   '192 sft (12''x16'')',111800, 96800,6000, 5200,108000,60000,'2024-03-01','Prices exclude hole excavation & formation charges');


-- ── NV-L BURIAL PLOT (WEF 01.07.2023) ───────────────────────

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV-L','DAJ (18~228)',         '216 sft (12''x18'')',110800,100800,6000, 8200,115000,70000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DAJ (8, 238, 268)',    '216 sft (12''x18'')',112800,102800,6000, 8200,117000,70000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DAJ (288~898)',        '216 sft (12''x18'')',110800,100800,6000, 8200,115000,70000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DAH-DF (18~228)',      '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DAH-DE (8, 238~268)',  '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DF (8)',               '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DF (238~268)',         '192 sft (12''x16'')',100800, 90800,6000, 5200,102000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DAH-DF (288~898)',     '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DG (18~218)',          '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DG (8, 228, 288)',     '192 sft (12''x16'')',100800, 90800,6000, 5200,102000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DG (298~828)',         '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DH (18~218)',          '276 sft (12''x23'')',128800,118800,6000,13000,137800,80000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DH (8, 228, 288)',     '276 sft (12''x23'')',131800,121800,6000,13000,140800,80000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DH (298~828)',         '276 sft (12''x23'')',128800,118800,6000,13000,137800,80000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DJ (18~228)',          '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DJ (8)',               '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DJ (238, 268)',        '192 sft (12''x16'')',100800, 90800,6000, 5200,102000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DJ (288~828)',         '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DK-DY (18~228)',       '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DK-DY (8, 238, 268)', '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DK-DY (288~828)',      '192 sft (12''x16'')', 96800, 86800,6000, 5200, 98000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DZ (18~228)',          '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DZ (8, 238, 268)',     '192 sft (12''x16'')',100800, 90800,6000, 5200,102000,60000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV-L','DZ (288~828)',         '192 sft (12''x16'')', 98800, 88800,6000, 5200,100000,60000,'2023-07-01','Prices exclude hole excavation & formation charges');
