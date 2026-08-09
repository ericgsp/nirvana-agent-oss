-- ============================================================
-- NIRVANA QUOTATION — Product Price List Schema & Seed Data
-- Run this in Supabase SQL Editor
-- ============================================================

-- ── 1. Sites reference table ─────────────────────────────────
-- site_code matches the sync DB (scripts/sync.ts site names)
-- site_name_en / zh used for customer-facing quotation display

CREATE TABLE IF NOT EXISTS sites (
  site_code    text PRIMARY KEY,
  site_name_en text NOT NULL,
  site_name_zh text,
  active       boolean DEFAULT true
);

INSERT INTO sites (site_code, site_name_en, site_name_zh) VALUES
  ('Semenyih',  'Nirvana Memorial Park (Semenyih)',  '富贵山庄 (世外桃源)'),
  ('Klang',     'Nirvana Memorial Park (Klang)',     '富贵山庄 (巴生)'),
  ('Shah Alam', 'Nirvana Memorial Park (Shah Alam)', '富贵山庄 (莎阿南)'),
  ('Ipoh',      'Nirvana Memorial Park (Ipoh)',      '富贵山庄 (怡保)'),
  ('Kuantan',   'Nirvana Memorial Park (Kuantan)',   '富贵山庄 (关丹)'),
  ('Karak',     'Nirvana Memorial Park (Karak)',     '富贵山庄 (卡拉)'),
  ('Nckl',      'Nirvana Memorial Park (NCKL)',      '富贵山庄 (南马)'),
  ('Nirvana 3', 'Nirvana Memorial Park 3',           '富贵山庄 3'),
  ('Ijok',      'Nirvana Memorial Park (Ijok)',      '富贵山庄 (依约)')
ON CONFLICT (site_code) DO NOTHING;


-- ── 2. Unified product price list ────────────────────────────
--
-- One row = one priceable unit (niche level, burial lot, pedestal level group)
-- Unused price columns are NULL — category determines which columns apply:
--
--  Columbarium : as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value
--  Burial Plot : as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value
--  Pedestal    : original_price, pre_launch_price, special_promo_price, point_value
--  NV Seed     : package_price, trust_account_facility, total_pre_need_price, point_value

CREATE TABLE IF NOT EXISTS product_price_list (
  id                     uuid    PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Location (FK to sites)
  site_code              text    NOT NULL REFERENCES sites(site_code),

  -- What is it?
  product_category       text    NOT NULL,  -- 'Columbarium', 'Burial Plot', 'Pedestal', 'NV Seed'
  product_name           text    NOT NULL,  -- 'Oriental Villa', 'Ji Le Dian', 'Ming Court', 'NV Emperor', etc.

  -- Structural identifiers
  block                  text,             -- 'OV6', 'B', 'MC1'
  floor                  text,             -- '1F', '1st Floor'
  section_group          text,             -- as shown on price list e.g. 'D16 (78~88, 128~138)'
  niche_type             text,             -- 'DOUBLE', 'SINGLE'  (columbarium only)
  level                  text,             -- '1'–'9', '3A'       (columbarium / pedestal)
  lot_no                 text,             -- burial/seed lot range e.g. 'FA (18-168)'
  size_description       text,             -- dimension string as printed on price list

  -- Prices — only relevant columns filled per category, rest NULL
  as_need_price          numeric,          -- Columbarium, Burial Plot
  pre_need_price         numeric,          -- Columbarium, Burial Plot
  original_price         numeric,          -- Pedestal: original/standard price
  pre_launch_price       numeric,          -- Pedestal: pre-launch promotional price
  special_promo_price    numeric,          -- Pedestal: special promotion price
  package_price          numeric,          -- NV Seed
  trust_account_facility numeric,          -- Columbarium, Burial Plot, NV Seed
  backwall_cost          numeric,          -- Burial Plot only
  total_pre_need_price   numeric,          -- Columbarium (pre_need+trust), Burial (pre_need+trust+backwall), NV Seed (package+trust)

  point_value            integer,          -- PV — all categories

  wef_date               date    NOT NULL, -- effective date from price list header
  notes                  text,             -- footnotes (urn installation restrictions, etc.)

  created_at             timestamptz DEFAULT now(),
  updated_at             timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ppl_site        ON product_price_list(site_code);
CREATE INDEX IF NOT EXISTS idx_ppl_category    ON product_price_list(product_category);
CREATE INDEX IF NOT EXISTS idx_ppl_name        ON product_price_list(product_name);
CREATE INDEX IF NOT EXISTS idx_ppl_section     ON product_price_list(section_group);


-- ── 3. Seed data from uploaded price list screenshots ────────
--
-- All 8 screenshots below are from SEMENYIH site.
-- WEF dates are taken from the footer of each price list sheet.
--
-- Sections that share the same price are stored as one row with
-- section_group describing the group (e.g. 'D21/D22/D23/D23A/D25/D26').
-- When looking up a specific section like 'D22', query:
--   WHERE section_group LIKE '%D22%'
-- ─────────────────────────────────────────────────────────────


-- ── 3A. OV6 ORIENTAL VILLA COLUMBARIUM — NICHE (WEF 25.07.2025)
-- Section S/D16 to S/D26
-- Note: urn installation subject to block completion 30 Sep 2026

-- Group: TD16 (lot 98~118) — 3 levels only
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','TD16 (98~118)','3','51(W)x30(H)x73.6(D) cm', 210800,180800,8000,188800,120000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','TD16 (98~118)','2','51(W)x30(H)x73.6(D) cm', 200800,170800,8000,178800,120000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','TD16 (98~118)','1','51(W)x30(H)x73.6(D) cm', 190800,160800,8000,168800,120000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- Group: D16 (lot 78~88, 128~138) — premium D16 lots
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','9','51(W)x36(H)x40(D) cm', 85800, 75800,4000, 79800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','8','51(W)x36(H)x40(D) cm', 85800, 75800,4000, 79800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','7','51(W)x36(H)x40(D) cm',100800, 90800,4000, 94800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','6','51(W)x30(H)x40(D) cm',115800,105800,4000,109800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','5','51(W)x30(H)x40(D) cm',120800,110800,4000,114800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','3A','51(W)x30(H)x40(D) cm',115800,105800,4000,109800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','3','51(W)x30(H)x40(D) cm',100800, 90800,4000, 94800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','2','51(W)x30(H)x40(D) cm', 90800, 80800,4000, 84800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (78~88, 128~138)','1','51(W)x30(H)x40(D) cm', 90800, 80800,4000, 84800,64000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- Group: D16 (18~38, 178~198) / D17 / D18 / D19 / D20
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','9','51(W)x36(H)x40(D) cm', 70800,60800,4000,64800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','8','51(W)x36(H)x40(D) cm', 70800,60800,4000,64800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','7','51(W)x36(H)x40(D) cm', 85800,75800,4000,79800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','6','51(W)x30(H)x40(D) cm',100800,90800,4000,94800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','5','51(W)x30(H)x40(D) cm',105800,95800,4000,99800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','3A','51(W)x30(H)x40(D) cm',100800,90800,4000,94800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','3','51(W)x30(H)x40(D) cm', 85800,75800,4000,79800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','2','51(W)x30(H)x40(D) cm', 75800,65800,4000,69800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D16 (18~38,178~198)/D17/D18/D19/D20','1','51(W)x30(H)x40(D) cm', 75800,65800,4000,69800,54000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- Group: D21 / D22 / D23 / D23A / D25 / D26
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','9','51(W)x36(H)x40(D) cm',65800,55800,4000,59800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','8','51(W)x36(H)x40(D) cm',65800,55800,4000,59800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','7','51(W)x36(H)x40(D) cm',80800,70800,4000,74800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','6','51(W)x30(H)x40(D) cm',95800,85800,4000,89800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','5','51(W)x30(H)x40(D) cm',100800,90800,4000,94800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','3A','51(W)x30(H)x40(D) cm',95800,85800,4000,89800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','3','51(W)x30(H)x40(D) cm',80800,70800,4000,74800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','2','51(W)x30(H)x40(D) cm',70800,60800,4000,64800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','D21/D22/D23/D23A/D25/D26','1','51(W)x30(H)x40(D) cm',70800,60800,4000,64800,51000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');

-- Group: S16 / S17 / S20 / S23A / S25 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','9','32(W)x36(H)x40(D) cm',35800,30800,2000,32800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','8','32(W)x36(H)x40(D) cm',35800,30800,2000,32800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','7','32(W)x36(H)x40(D) cm',43800,38800,2000,40800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','6','32(W)x30(H)x40(D) cm',51800,46800,2000,48800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','5','32(W)x30(H)x40(D) cm',54800,49800,2000,51800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','3A','32(W)x30(H)x40(D) cm',51800,46800,2000,48800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','3','32(W)x30(H)x40(D) cm',43800,38800,2000,40800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','2','32(W)x30(H)x40(D) cm',38800,33800,2000,35800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026'),
  ('Semenyih','Columbarium','Oriental Villa','OV6','S16/S17/S20/S23A/S25','1','32(W)x30(H)x40(D) cm',38800,33800,2000,35800,28000,'2025-07-25','Urn installation subject to block completion 30 Sep 2026');


-- ── 3B. OV6 ORIENTAL VILLA PEDESTAL — 1ST FLOOR SECTION A (WEF 01.08.2025)
-- Note: No Ancestral Tablet installation till 30 Sep 2026

INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   original_price, pre_launch_price, special_promo_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Pedestal','Oriental Villa','OV6','1st Floor','A','1,2,3,3A,5,6,7','138(W)x250(H)x55(D) mm',
   33800,25800,20800,14000,'2025-08-01','No Ancestral Tablet installation till 30 Sep 2026'),
  ('Semenyih','Pedestal','Oriental Villa','OV6','1st Floor','A','8,9,10,11,12,13,13A','138(W)x250(H)x55(D) mm',
   29800,21800,16800,14000,'2025-08-01','No Ancestral Tablet installation till 30 Sep 2026'),
  ('Semenyih','Pedestal','Oriental Villa','OV6','1st Floor','A','15,16,17','200(W)x379(H)x106(D) mm',
   31800,23800,18800,14000,'2025-08-01','No Ancestral Tablet installation till 30 Sep 2026');


-- ── 3C. ETERNAL SUITE 3 (ES3) — CHRISTIAN COLUMBARIUM (WEF 01.03.2026)
-- Note: Urn installation subject to block completion 31 Mar 2027

-- DOUBLE D3
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','9','45(W)x30(H)x30(D) mm',33800,27800,3000,30800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','8','45(W)x30(H)x30(D) mm',33800,27800,3000,30800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','7','45(W)x30(H)x30(D) mm',36800,30800,3000,33800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','6','45(W)x30(H)x30(D) mm',44800,38800,3000,41800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','5','45(W)x30(H)x30(D) mm',48800,42800,3000,45800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','3A','45(W)x30(H)x30(D) mm',48800,42800,3000,45800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','3','45(W)x30(H)x30(D) mm',44800,38800,3000,41800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','2','45(W)x30(H)x30(D) mm',36800,30800,3000,33800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D3','DOUBLE','1','45(W)x30(H)x30(D) mm',36800,30800,3000,33800,24500,'2026-03-01','Urn installation subject to block completion 31 Mar 2027');

-- DOUBLE D2 / D3A
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','9','45(W)x30(H)x30(D) mm',28800,22800,3000,25800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','8','45(W)x30(H)x30(D) mm',28800,22800,3000,25800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','7','45(W)x30(H)x30(D) mm',31800,25800,3000,28800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','6','45(W)x30(H)x30(D) mm',39800,33800,3000,36800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','5','45(W)x30(H)x30(D) mm',43800,37800,3000,40800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','3A','45(W)x30(H)x30(D) mm',43800,37800,3000,40800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','3','45(W)x30(H)x30(D) mm',39800,33800,3000,36800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','2','45(W)x30(H)x30(D) mm',31800,25800,3000,28800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','D2/D3A','DOUBLE','1','45(W)x30(H)x30(D) mm',31800,25800,3000,28800,21000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027');

-- SINGLE S1 / S5
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, niche_type, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','9','31(W)x30(H)x30(D) mm',17800,14800,1500,16300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','8','31(W)x30(H)x30(D) mm',17800,14800,1500,16300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','7','31(W)x30(H)x30(D) mm',19800,16800,1500,18300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','6','31(W)x30(H)x30(D) mm',23800,20800,1500,22300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','5','31(W)x30(H)x30(D) mm',25800,22800,1500,24300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','3A','31(W)x30(H)x30(D) mm',25800,22800,1500,24300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','3','31(W)x30(H)x30(D) mm',23800,20800,1500,22300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','2','31(W)x30(H)x30(D) mm',19800,16800,1500,18300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027'),
  ('Semenyih','Columbarium','Eternal Suite 3 (Christian)','ES3','S1/S5','SINGLE','1','31(W)x30(H)x30(D) mm',19800,16800,1500,18300,13000,'2026-03-01','Urn installation subject to block completion 31 Mar 2027');


-- ── 3D. JI LE DIAN COLUMBARIUM — BLOCK B, 1ST FLOOR (WEF 10.12.2025)
-- Section 31 to 65
-- Note: above niche price excludes Trust Account 3 & facility cost
-- Urn installation subject to block completion 31 Dec 2026

-- Section D61
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','9','51(W)x36(H)x30(D) cm',32800,25800,3000,28800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','8','51(W)x36(H)x30(D) cm',32800,25800,3000,28800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','7','51(W)x36(H)x30(D) cm',36800,29800,3000,32800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','6','51(W)x30(H)x30(D) cm',44800,37800,3000,40800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','5','51(W)x30(H)x30(D) cm',47800,40800,3000,43800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','3A','51(W)x30(H)x30(D) cm',44800,37800,3000,40800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','3','51(W)x30(H)x30(D) cm',44800,37800,3000,40800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','2','51(W)x30(H)x30(D) cm',36800,29800,3000,32800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D61','1','51(W)x30(H)x30(D) cm',36800,29800,3000,32800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026');

-- Sections D36/D37, D38/D39, D60, D62/D63
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','9','51(W)x36(H)x30(D) cm',29800,22800,3000,25800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','8','51(W)x36(H)x30(D) cm',29800,22800,3000,25800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','7','51(W)x36(H)x30(D) cm',33800,26800,3000,29800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','6','51(W)x30(H)x30(D) cm',41800,34800,3000,37800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','5','51(W)x30(H)x30(D) cm',44800,37800,3000,40800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','3A','51(W)x30(H)x30(D) cm',41800,34800,3000,37800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','3','51(W)x30(H)x30(D) cm',41800,34800,3000,37800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','2','51(W)x30(H)x30(D) cm',33800,26800,3000,29800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D36/D37/D38/D39/D60/D62/D63','1','51(W)x30(H)x30(D) cm',33800,26800,3000,29800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026');

-- Sections D31, D65
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','9','51(W)x36(H)x30(D) cm',27800,20800,3000,23800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','8','51(W)x36(H)x30(D) cm',27800,20800,3000,23800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','7','51(W)x36(H)x30(D) cm',31800,24800,3000,27800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','6','51(W)x30(H)x30(D) cm',39800,32800,3000,35800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','5','51(W)x30(H)x30(D) cm',42800,35800,3000,38800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','3A','51(W)x30(H)x30(D) cm',39800,32800,3000,35800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','3','51(W)x30(H)x30(D) cm',39800,32800,3000,35800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','2','51(W)x30(H)x30(D) cm',31800,24800,3000,27800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','D31/D65','1','51(W)x30(H)x30(D) cm',31800,24800,3000,27800,'2025-12-10','Urn installation subject to block completion 31 Dec 2026');

-- Sections S31, S32/S33, S33A/S35, S65 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','9','32(W)x36(H)x30(D) cm',18800,14800,1500,16300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','8','32(W)x36(H)x30(D) cm',18800,14800,1500,16300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','7','32(W)x36(H)x30(D) cm',20800,16800,1500,18300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','6','32(W)x30(H)x30(D) cm',24800,20800,1500,22300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','5','32(W)x30(H)x30(D) cm',26800,22800,1500,24300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','3A','32(W)x30(H)x30(D) cm',24800,20800,1500,22300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','3','32(W)x30(H)x30(D) cm',24800,20800,1500,22300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','2','32(W)x30(H)x30(D) cm',20800,16800,1500,18300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ji Le Dian','B','1F','S31/S32/S33/S33A/S35/S65','1','32(W)x30(H)x30(D) cm',20800,16800,1500,18300,'2025-12-10','Urn installation subject to block completion 31 Dec 2026');


-- ── 3E. MING COURT COLUMBARIUM — MC1 (WEF 20.12.2025)
-- Urn installation subject to block completion 31 Dec 2026

-- Section D3
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ming Court','MC1','D3','9','50(W)x36(H)x30(D) cm',23800,18800,3000,21800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','8','50(W)x36(H)x30(D) cm',23800,18800,3000,21800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','7','50(W)x36(H)x30(D) cm',25800,20800,3000,23800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','6','50(W)x30(H)x30(D) cm',29800,24800,3000,27800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','5','50(W)x30(H)x30(D) cm',30800,25800,3000,28800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','3A','50(W)x30(H)x30(D) cm',30800,25800,3000,28800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','3','50(W)x30(H)x30(D) cm',29800,24800,3000,27800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','2','50(W)x30(H)x30(D) cm',25800,20800,3000,23800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D3','1','50(W)x30(H)x30(D) cm',25800,20800,3000,23800,15700,'2025-12-20','Urn installation subject to block completion 31 Dec 2026');

-- Sections D2 / D3A
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','9','50(W)x36(H)x30(D) cm',22800,17800,3000,20800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','8','50(W)x36(H)x30(D) cm',22800,17800,3000,20800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','7','50(W)x36(H)x30(D) cm',24800,19800,3000,22800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','6','50(W)x30(H)x30(D) cm',28800,23800,3000,26800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','5','50(W)x30(H)x30(D) cm',29800,24800,3000,27800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','3A','50(W)x30(H)x30(D) cm',29800,24800,3000,27800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','3','50(W)x30(H)x30(D) cm',28800,23800,3000,26800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','2','50(W)x30(H)x30(D) cm',24800,19800,3000,22800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','D2/D3A','1','50(W)x30(H)x30(D) cm',24800,19800,3000,22800,15000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026');

-- Sections S1 / S5 (single niches)
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','9','30(W)x36(H)x30(D) cm',12800, 9800,1500,11300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','8','30(W)x36(H)x30(D) cm',12800, 9800,1500,11300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','7','30(W)x36(H)x30(D) cm',13800,10800,1500,12300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','6','30(W)x30(H)x30(D) cm',15800,12800,1500,14300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','5','30(W)x30(H)x30(D) cm',16800,13800,1500,15300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','3A','30(W)x30(H)x30(D) cm',16800,13800,1500,15300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','3','30(W)x30(H)x30(D) cm',15800,12800,1500,14300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','2','30(W)x30(H)x30(D) cm',13800,10800,1500,12300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026'),
  ('Semenyih','Columbarium','Ming Court','MC1','S1/S5','1','30(W)x30(H)x30(D) cm',13800,10800,1500,12300,8000,'2025-12-20','Urn installation subject to block completion 31 Dec 2026');


-- ── 3F. NV EMPEROR ZONE — BURIAL PLOTS (WEF 01.03.2026)
-- Note: prices exclude hole excavation & formation charges

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','Burial Plot','NV Emperor Zone','FA (18-168)',  '888 sft (24''x37'')',  331800,301800,24000,33000,358800,211260,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FA (188,198)', '888 sft (24''x37'')',  341800,311800,24000,33000,368800,218260,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FA (218-338)', '888 sft (24''x37'')',  331800,301800,24000,33000,358800,211260,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FA (368)',     '1332 sft (36''x37'')', 498800,452800,36000,43000,531800,316960,'2026-03-01','Prices exclude hole excavation & formation charges'),

  ('Semenyih','Burial Plot','NV Emperor Zone','FB-FD (18-168)',  '864 sft (24''x36'')',  323800,293800,24000,23000,340800,205660,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FB-FD (188,198)', '864 sft (24''x36'')',  333800,303800,24000,23000,350800,212660,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FB-FD (218-338)', '864 sft (24''x36'')',  323800,293800,24000,23000,340800,205660,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FB-FD (368)',     '1296 sft (36''x36'')', 486800,440800,36000,43000,519800,308560,'2026-03-01','Prices exclude hole excavation & formation charges'),

  ('Semenyih','Burial Plot','NV Emperor Zone','FE (18-168)',  '912 sft (24''x38'')',  340800,310800,28000,23000,361800,217560,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FE (188,198)', '912 sft (24''x38'')',  350800,320800,28000,23000,371800,224560,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FE (218-338)', '912 sft (24''x38'')',  340800,310800,28000,23000,361800,217560,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','FE (368)',     '1368 sft (36''x38'')', 511800,465800,36000,43000,544800,326060,'2026-03-01','Prices exclude hole excavation & formation charges'),

  ('Semenyih','Burial Plot','NV Emperor Zone','RA (18)',       '3816 sft (53''x72'')', 2300000,2220000,96000,132000,2448000,1332000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RA (28-68)',    '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RA (88-98)',    '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RA (118-138)',  '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RA (168,188)',  '2880 sft (40''x72'')', 1720000,1680000,80000,102000,1862000,1008000,'2026-03-01','Prices exclude hole excavation & formation charges'),

  ('Semenyih','Burial Plot','NV Emperor Zone','RB (28)',       '3816 sft (53''x72'')', 2300000,2220000,96000,132000,2448000,1332000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RB (38-68)',    '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RB (88-98)',    '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RB (118-138)',  '3456 sft (48''x72'')', 2070000,2000000,96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RB (168,188)',  '2880 sft (40''x72'')', 1720000,1680000,80000,102000,1862000,1008000,'2026-03-01','Prices exclude hole excavation & formation charges'),

  ('Semenyih','Burial Plot','NV Emperor Zone','RC (88)',       '5616 sft (78''x72'')', 3370000,3250000,156000,192000,3598000,1950000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RC (98)',       '3456 sft (48''x72'')', 2070000,2000000, 96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RC (118-138)',  '3456 sft (48''x72'')', 2070000,2000000, 96000,120000,2216000,1200000,'2026-03-01','Prices exclude hole excavation & formation charges'),
  ('Semenyih','Burial Plot','NV Emperor Zone','RC (168,188)',  '2880 sft (40''x72'')', 1720000,1680000, 80000,102000,1862000,1008000,'2026-03-01','Prices exclude hole excavation & formation charges');


-- ── 3G. NV SEED 3 (WEF 28.11.2025)
-- Note: NV Seed total price excludes Shengji installation ceremony charges
-- No Shengji installation till 31 Oct 2026

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   package_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','NV Seed','NV Seed 3','SN-SZ','8 sft (2''x4'')',
   22800,1000,23800,15700,'2025-11-28','Price excludes Shengji installation ceremony charges. No Shengji installation till 31 Oct 2026');


-- ── 3H. NV SEED 6 (WEF 10.11.2025)
-- Note: NV Seed total price excludes Shengji installation ceremony charges
-- No Shengji installation till 31 May 2026

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   package_price, trust_account_facility, total_pre_need_price, point_value, wef_date, notes)
VALUES
  ('Semenyih','NV Seed','NV Seed 6','SJ-SX','8 sft (2''x4'')',
   22800,1000,23800,15700,'2025-11-10','Price excludes Shengji installation ceremony charges. No Shengji installation till 31 May 2026');
