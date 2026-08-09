-- ============================================================
-- Melaka Zone B Burial Plot — Setup SQL
-- Run each section in Supabase SQL Editor
-- ============================================================

-- ── Step 0: Ensure Melaka site exists ────────────────────────
INSERT INTO sites (site_code, site_name_en, site_name_zh)
VALUES ('Melaka', 'Nirvana Memorial Park (Melaka)', '富贵山庄 (马六甲)')
ON CONFLICT (site_code) DO NOTHING;

-- ── Step 1: Verify Zone B zone string (run first) ────────────
-- Check the exact value in the 'zone' column for Melaka Zone B lots.
-- The product_name in Step 4 must match this value exactly.
--
-- SELECT DISTINCT site, zone, COUNT(*) AS lot_count
-- FROM product_availability
-- WHERE site = 'Melaka'
-- GROUP BY site, zone;

-- ── Step 2: Create tomb_options table ────────────────────────
CREATE TABLE IF NOT EXISTS tomb_options (
  id           uuid    PRIMARY KEY DEFAULT gen_random_uuid(),
  site_code    text    NOT NULL REFERENCES sites(site_code),
  product_name text    NOT NULL,
  tomb_code    text    NOT NULL,
  tomb_name    text    NOT NULL,
  price        numeric NOT NULL,
  sort_order   int     DEFAULT 0,
  created_at   timestamptz DEFAULT now(),
  UNIQUE (site_code, product_name, tomb_code)
);

-- Ensure anon/authenticated can read tomb_options
GRANT SELECT ON tomb_options TO authenticated, anon, service_role;

-- ── Step 3: Insert Melaka Zone B tomb types ───────────────────
INSERT INTO tomb_options (site_code, product_name, tomb_code, tomb_name, price, sort_order)
VALUES
  ('Melaka', 'B', 'BG',   'Black Granite (BG)',  46800, 1),
  ('Melaka', 'B', 'G654', 'Grey Granite (G654)', 40800, 2)
ON CONFLICT (site_code, product_name, tomb_code) DO NOTHING;

-- ── Step 4: Insert product_price_list for Zone B ─────────────
-- NOTE: If Step 1 shows a different zone string (e.g. 'Zone B'), replace 'B' below.
-- total_pre_need_price = pre_need + trust + backwall (tomb price added by UI at selection time)

INSERT INTO product_price_list
  (site_code, product_category, product_name, lot_no, size_description,
   as_need_price, pre_need_price, trust_account_facility, backwall_cost,
   total_pre_need_price, wef_date, active)
VALUES
-- ── DA (264SF 12"×22", backwall 6,300) ──────────────────────
('Melaka','Burial Plot','B','DA(8)',     '264SF (12"×22")', 80500, 75500, 6000, 6300, 87800, '2023-07-10', true),
('Melaka','Burial Plot','B','DA(178)',   '264SF (12"×22")', 80500, 75500, 6000, 6300, 87800, '2023-07-10', true),
('Melaka','Burial Plot','B','DA(188)',   '264SF (12"×22")', 80500, 75500, 6000, 6300, 87800, '2023-07-10', true),
('Melaka','Burial Plot','B','DA(368)',   '264SF (12"×22")', 80500, 75500, 6000, 6300, 87800, '2023-07-10', true),
('Melaka','Burial Plot','B','DA(18~338)','264SF (12"×22")', 75500, 70500, 6000, 6300, 82800, '2023-07-10', true),
-- ── DB (216SF 12"×18", backwall 4,500) ──────────────────────
('Melaka','Burial Plot','B','DB(8)',     '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DB(178)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DB(188)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DB(368)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DB(18~338)','216SF (12"×18")', 63300, 58300, 6000, 4500, 68800, '2023-07-10', true),
-- ── DC ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DC(8)',     '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DC(178)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DC(188)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DC(368)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DC(18~338)','216SF (12"×18")', 63300, 58300, 6000, 4500, 68800, '2023-07-10', true),
-- ── DD ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DD(8)',     '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DD(178)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DD(188)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DD(368)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DD(18~338)','216SF (12"×18")', 63300, 58300, 6000, 4500, 68800, '2023-07-10', true),
-- ── DE ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DE(8)',     '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DE(178)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DE(188)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DE(368)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DE(18~338)','216SF (12"×18")', 63300, 58300, 6000, 4500, 68800, '2023-07-10', true),
-- ── DF ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DF(8)',     '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DF(178)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DF(188)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DF(368)',   '216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
('Melaka','Burial Plot','B','DF(18~338)','216SF (12"×18")', 63300, 58300, 6000, 4500, 68800, '2023-07-10', true),
-- ── DG ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DG(8)',     '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DG(178)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DG(188)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DG(368)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DG(18~338)','216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
-- ── DH ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DH(8)',     '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DH(178)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DH(188)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DH(368)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DH(18~338)','216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
-- ── DJ ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DJ(8)',     '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DJ(178)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DJ(188)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DJ(368)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DJ(18~338)','216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
-- ── DK ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DK(8)',     '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DK(178)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DK(188)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DK(368)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DK(18~338)','216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
-- ── DL ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DL(8)',     '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DL(178)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DL(188)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DL(368)',   '216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
('Melaka','Burial Plot','B','DL(18~338)','216SF (12"×18")', 68300, 63300, 6000, 4500, 73800, '2023-07-10', true),
-- ── DM ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DM(8)',     '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DM(178)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DM(188)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DM(368)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DM(18~338)','216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
-- ── DN ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DN(8)',     '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DN(178)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DN(188)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DN(368)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DN(18~338)','216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
-- ── DP ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DP(8)',     '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DP(178)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DP(188)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DP(368)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DP(18~338)','216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
-- ── DQ ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DQ(8)',     '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DQ(178)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DQ(188)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DQ(368)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DQ(18~338)','216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
-- ── DR ──────────────────────────────────────────────────────
('Melaka','Burial Plot','B','DR(8)',     '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DR(178)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DR(188)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DR(368)',   '216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true),
('Melaka','Burial Plot','B','DR(18~338)','216SF (12"×18")', 73300, 68300, 6000, 4500, 78800, '2023-07-10', true),
-- ── DS (corner lots 8,178,188,328; regular range 18~318) ────
('Melaka','Burial Plot','B','DS(8)',     '216SF (12"×18")', 83300, 78300, 6000, 4500, 88800, '2023-07-10', true),
('Melaka','Burial Plot','B','DS(178)',   '216SF (12"×18")', 83300, 78300, 6000, 4500, 88800, '2023-07-10', true),
('Melaka','Burial Plot','B','DS(188)',   '216SF (12"×18")', 83300, 78300, 6000, 4500, 88800, '2023-07-10', true),
('Melaka','Burial Plot','B','DS(328)',   '216SF (12"×18")', 83300, 78300, 6000, 4500, 88800, '2023-07-10', true),
('Melaka','Burial Plot','B','DS(18~318)','216SF (12"×18")', 78300, 73300, 6000, 4500, 83800, '2023-07-10', true);
