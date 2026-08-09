-- Semenyih price list batch 5
-- New products: NV Imperial, NV Imperial 2, NV Imperial 3, Emperor Hill, OV3 E2 columbarium
-- WEF dates as per price list headers
-- Duplicates skipped via ON CONFLICT DO NOTHING

-- ── NV Imperial (WEF 05.07.2023) ─────────────────────────────────────────────
-- Royal burial plots, 3120 sft (48'x65') / 5760 sft (48'x120')
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Imperial','RA (138 & 268)',    'Royal','3120 sft (48''x65'')',1989800,1793800,96000,137000,2026800,1060000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RA (168~238)',      'Royal','3120 sft (48''x65'')',1959800,1763800,96000,137000,1996800,1060000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RB~RC (138 & 268)', 'Royal','3120 sft (48''x65'')',1959800,1763800,96000,137000,1996800,1060000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RB~RC (168~238)',   'Royal','3120 sft (48''x65'')',1909800,1713800,96000,137000,1946800,1060000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RD~RE (138 & 268)', 'Royal','3120 sft (48''x65'')',2220800,2003800,96000,137000,2236800,1170000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RD~RE (168~238)',   'Royal','3120 sft (48''x65'')',2170800,1953800,96000,137000,2186800,1170000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RF (138 & 268)',    'Royal','5760 sft (48''x120'')',4093800,3693800,165000,137000,3995800,2160000,'2023-07-05','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial','RF (168~238)',      'Royal','5760 sft (48''x120'')',4003800,3603800,165000,137000,3905800,2160000,'2023-07-05','Prices exclude hole excavation & formation charges')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;


-- ── NV Imperial 2 (WEF 01.07.2023) ──────────────────────────────────────────
-- Royal burial plots, RA=3840 sft (48'x80'), RB~RJ=3360 sft (48'x70')
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Imperial 2','RA (8~98)',    'Royal','3840 sft (48''x80'')',2418800,2176800,96000,137000,2409800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RA (118)',     'Royal','3840 sft (48''x80'')',2468800,2226800,96000,137000,2459800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RB~RD (8~98)','Royal','3360 sft (48''x70'')',2052800,1846800,96000,137000,2079800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RB~RD (118)', 'Royal','3360 sft (48''x70'')',2102800,1896800,96000,137000,2129800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RE~RG (8~98)','Royal','3360 sft (48''x70'')',2140800,1926800,96000,137000,2159800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RE~RG (118)', 'Royal','3360 sft (48''x70'')',2190800,1976800,96000,137000,2209800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RH~RJ (8~98)','Royal','3360 sft (48''x70'')',2185800,1966800,96000,137000,2199800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 2','RH~RJ (118)', 'Royal','3360 sft (48''x70'')',2235800,2016800,96000,137000,2249800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;


-- ── NV Imperial 3 (WEF 01.07.2023) ──────────────────────────────────────────
-- Royal + Super Family burial plots
-- SFA~SFB = 2080 sft (32'x65')
-- RA/RB~RC standard = 3360 sft (48'x70'), corner lot 178 = 3850 sft (55'x70')
-- RD~RE standard = 3360 sft (48'x70'), corner lot 178 = 3850 sft (55'x70')
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Imperial 3','SFA~SFB (8~98)',    'Super Family','2080 sft (32''x65'')',1318800,1185800,60000,98000,1343800,710000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','SFA~SFB (108~118)', 'Super Family','2080 sft (32''x65'')',1353800,1220800,60000,98000,1378800,710000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','SFA~SFB (128~218)', 'Super Family','2080 sft (32''x65'')',1318800,1185800,60000,98000,1343800,710000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RA (8~68, 98~168)', 'Royal','3360 sft (48''x70'')',2125800,1912800,96000,147000,2155800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RA (78~88)',        'Royal','3360 sft (48''x70'')',2175800,1962800,96000,147000,2205800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RA (178)',          'Royal','3850 sft (55''x70'')',2333800,2190800,96000,169000,2455800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RB~RC (8~68, 98~168)','Royal','3360 sft (48''x70'')',2125800,1912800,96000,147000,2155800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RB~RC (78~88)',     'Royal','3360 sft (48''x70'')',2175800,1962800,96000,147000,2205800,1150000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RB~RC (178)',       'Royal','3850 sft (55''x70'')',2333800,2190800,96000,169000,2455800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RD~RE (8~68, 98~168)','Royal','3360 sft (48''x70'')',2363800,2126800,96000,147000,2369800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RD~RE (78~88)',     'Royal','3360 sft (48''x70'')',2413800,2176800,96000,147000,2419800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Imperial 3','RD~RE (178)',       'Royal','3850 sft (55''x70'')',2706800,2436800,96000,169000,2701800,1300000,'2023-07-01','Prices exclude hole excavation & formation charges')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;


-- ── Emperor Hill (WEF 20.07.2023) ────────────────────────────────────────────
-- Sizes are unique per lot — size_description uses sq ft area
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','Emperor Hill','SFB 18',     'Super Family','4311 sft',2371800,1983800,108000,53000,2144800,1388660,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFB 28~38',  'Super Family','4019 sft',2210800,1848800,108000,48000,2004800,1294160,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFB 68~88',  'Super Family','4140 sft',2276800,1903800,108000,48000,2059800,1332660,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFB 98',     'Super Family','4209 sft',2313800,1936800,108000,59000,2103800,1355760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFC 18',     'Super Family','4167 sft',2291800,1916800,108000,54000,2078800,1341760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFC 28',     'Super Family','4403 sft',2421800,2026800,108000,54000,2188800,1418760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFC 38',     'Super Family','4403 sft',2421800,2026800,108000,54000,2188800,1418760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFC 68',     'Super Family','3860 sft',2122800,1776800,96000, 48000,1920800,1243760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFD 18',     'Super Family','4465 sft',2053800,2053800,108000,66000,2227800,1437660,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFD 28',     'Super Family','4412 sft',2426800,2029800,108000,61000,2198800,1420860,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','SFD 38',     'Super Family','4603 sft',2531800,2116800,108000,68000,2292800,1481760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 18',      'Family',      '2191 sft',1206800,1007800,60000, 41000,1108800, 705460,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 28',      'Family',      '1722 sft', 946800, 792800,48000, 32000, 872800, 554960,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 38~98',   'Family',      '1712 sft', 941800, 788800,48000, 32000, 868800, 552160,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 118',     'Family',      '1722 sft', 946800, 792800,48000, 32000, 872800, 554960,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 128~168', 'Family',      '1669 sft', 918800, 768800,48000, 32000, 848800, 538160,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 188',     'Family',      '1722 sft', 946800, 792800,48000, 32000, 872800, 554960,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FA 198',     'Family',      '2582 sft',1420800,1188800,72000, 62000,1322800, 832160,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 18',      'Family',      '1829 sft',1006800, 841800,48000, 53000, 942800, 589260,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 28',      'Family',      '1509 sft', 829800, 694800,42000, 46000, 782800, 486360,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 38',      'Family',      '1513 sft', 832800, 696800,42000, 46000, 784800, 487760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 68',      'Family',      '1449 sft', 723800, 666800,42000, 46000, 754800, 466760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 88',      'Family',      '1513 sft', 832800, 696800,42000, 46000, 784800, 487760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 98',      'Family',      '1449 sft', 723800, 666800,42000, 46000, 754800, 466760,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 118~188', 'Family',      '1509 sft', 829800, 694800,42000, 46000, 782800, 486360,'2023-07-20','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','Emperor Hill','FB 198',     'Family',      '2024 sft',1113800, 930800,60000, 53000,1043800, 651560,'2023-07-20','Prices exclude hole excavation & formation charges')
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;


-- ── OV3 Columbarium — Block E2 (WEF 01.12.2020) ──────────────────────────────
-- Column mapping: as_need=AS-NEED NICHE PRICE, pre_need=PRE-NEED NICHE PRICE,
--   trust=MAINTENANCE & FACILITY FEES, backwall=NULL, total=TOTAL PRE-NEED PRICE
-- Note: total = pre_need + trust (no backwall)

-- Section D13A — Levels 1–9
-- Levels 1–6: 51(W)x30(H)x40(D)mm; Levels 7–9: 51(W)x36(H)x40(D)mm
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-D13A','Level 1','Niche','51x30x40mm',60800,52800,3000,NULL,55800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 2','Niche','51x30x40mm',68800,62800,3000,NULL,65800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 3','Niche','51x30x40mm',80800,72800,3000,NULL,75800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 3A','Niche','51x30x40mm',90800,82800,3000,NULL,85800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 5','Niche','51x30x40mm',90800,82800,3000,NULL,85800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 6','Niche','51x30x40mm',90800,82800,3000,NULL,85800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 7','Niche','51x36x40mm',80800,72800,3000,NULL,75800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 8','Niche','51x36x40mm',68800,62800,3000,NULL,65800,50000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13A','Level 9','Niche','51x36x40mm',60800,52800,3000,NULL,55800,50000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- Sections D13 / D15 — Levels 1–9 (same prices, separate product names)
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-D13','Level 1','Niche','51x30x40mm',51800,43800,3000,NULL,46800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 2','Niche','51x30x40mm',61800,53800,3000,NULL,56800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 3','Niche','51x30x40mm',71800,63800,3000,NULL,66800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 3A','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 5','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 6','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 7','Niche','51x36x40mm',71800,63800,3000,NULL,66800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 8','Niche','51x36x40mm',61800,53800,3000,NULL,56800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D13','Level 9','Niche','51x36x40mm',51800,43800,3000,NULL,46800,44000,'2020-12-01',NULL),

  ('Semenyih','Columbarium','OV3-D15','Level 1','Niche','51x30x40mm',51800,43800,3000,NULL,46800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 2','Niche','51x30x40mm',61800,53800,3000,NULL,56800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 3','Niche','51x30x40mm',71800,63800,3000,NULL,66800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 3A','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 5','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 6','Niche','51x30x40mm',81800,73800,3000,NULL,76800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 7','Niche','51x36x40mm',71800,63800,3000,NULL,66800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 8','Niche','51x36x40mm',61800,53800,3000,NULL,56800,44000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D15','Level 9','Niche','51x36x40mm',51800,43800,3000,NULL,46800,44000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- Sections S13 / S13A / S15 — Levels 1–9 (same prices, separate product names)
-- Levels 1–6: 36(W)x30(H)x40(D)mm; Levels 7–9: 36(W)x36(H)x40(D)mm
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-S13','Level 1','Niche','36x30x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 2','Niche','36x30x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 3','Niche','36x30x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 3A','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 5','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 6','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 7','Niche','36x36x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 8','Niche','36x36x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13','Level 9','Niche','36x36x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL),

  ('Semenyih','Columbarium','OV3-S13A','Level 1','Niche','36x30x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 2','Niche','36x30x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 3','Niche','36x30x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 3A','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 5','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 6','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 7','Niche','36x36x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 8','Niche','36x36x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S13A','Level 9','Niche','36x36x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL),

  ('Semenyih','Columbarium','OV3-S15','Level 1','Niche','36x30x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 2','Niche','36x30x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 3','Niche','36x30x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 3A','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 5','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 6','Niche','36x30x40mm',45800,41800,1500,NULL,43300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 7','Niche','36x36x40mm',40800,36800,1500,NULL,38300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 8','Niche','36x36x40mm',35800,31800,1500,NULL,33300,25000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S15','Level 9','Niche','36x36x40mm',30800,26800,1500,NULL,28300,25000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- ── OV3 Block E2 — Section D3A TO D6 (WEF 01.12.2020) ───────────────────────

-- Section D5 — Levels 1–9
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-D5','Level 1','Niche','51x30x40mm',50800,42800,3000,NULL,45800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 2','Niche','51x30x40mm',58800,50800,3000,NULL,53800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 3','Niche','51x30x40mm',66800,58800,3000,NULL,61800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 3A','Niche','51x30x40mm',74800,66800,3000,NULL,69800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 5','Niche','51x30x40mm',74800,66800,3000,NULL,69800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 6','Niche','51x30x40mm',74800,66800,3000,NULL,69800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 7','Niche','51x36x40mm',66800,58800,3000,NULL,61800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 8','Niche','51x36x40mm',58800,50800,3000,NULL,53800,40000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D5','Level 9','Niche','51x36x40mm',50800,42800,3000,NULL,45800,40000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- Sections D3A / D6 — Levels 1–9 (same prices)
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-D3A','Level 1','Niche','51x30x40mm',41800,33800,3000,NULL,36800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 2','Niche','51x30x40mm',49800,41800,3000,NULL,44800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 3','Niche','51x30x40mm',57800,49800,3000,NULL,52800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 3A','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 5','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 6','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 7','Niche','51x36x40mm',57800,49800,3000,NULL,52800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 8','Niche','51x36x40mm',49800,41800,3000,NULL,44800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D3A','Level 9','Niche','51x36x40mm',41800,33800,3000,NULL,36800,34000,'2020-12-01',NULL),

  ('Semenyih','Columbarium','OV3-D6','Level 1','Niche','51x30x40mm',41800,33800,3000,NULL,36800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 2','Niche','51x30x40mm',49800,41800,3000,NULL,44800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 3','Niche','51x30x40mm',57800,49800,3000,NULL,52800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 3A','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 5','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 6','Niche','51x30x40mm',66800,57800,3000,NULL,60800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 7','Niche','51x36x40mm',57800,49800,3000,NULL,52800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 8','Niche','51x36x40mm',49800,41800,3000,NULL,44800,34000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-D6','Level 9','Niche','51x36x40mm',41800,33800,3000,NULL,36800,34000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;

-- Section S5 — Levels 1–9
INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, lot_type, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','OV3-S5','Level 1','Niche','36x30x40mm',25800,21800,1500,NULL,23300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 2','Niche','36x30x40mm',29800,25800,1500,NULL,27300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 3','Niche','36x30x40mm',33800,29800,1500,NULL,31300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 3A','Niche','36x30x40mm',37800,33800,1500,NULL,35300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 5','Niche','36x30x40mm',37800,33800,1500,NULL,35300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 6','Niche','36x30x40mm',37800,33800,1500,NULL,35300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 7','Niche','36x36x40mm',33800,29800,1500,NULL,31300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 8','Niche','36x36x40mm',29800,25800,1500,NULL,27300,20000,'2020-12-01',NULL),
  ('Semenyih','Columbarium','OV3-S5','Level 9','Niche','36x36x40mm',25800,21800,1500,NULL,23300,20000,'2020-12-01',NULL)
ON CONFLICT (site_code, product_name, lot_no) DO NOTHING;
