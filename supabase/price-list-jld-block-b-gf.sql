-- ============================================================
-- Ji Le Dian Columbarium — Block B, Ground Floor
-- Site: Semenyih-NMG | Product: JLD-B-GF
-- Sections: D1~D13, D16~D26, D27~D32, S13A, S15
-- WEF: 24.07.2026
-- Notes:
--   a) Urn installation/depository allowed subject to completion of
--      columbarium block expected on 30 September 2027.
-- ============================================================

-- ── Section D27 to D32 ───────────────────────────────────────────
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
SELECT * FROM (VALUES
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '9','51(W)x36(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '8','51(W)x36(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '7','51(W)x36(H)x30(D) cm', 41800, 34800, 3000, 37800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '6','51(W)x32(H)x30(D) cm', 53800, 46800, 3000, 49800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '5','51(W)x32(H)x30(D) cm', 59800, 52800, 3000, 55800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32','3A','51(W)x32(H)x30(D) cm', 53800, 46800, 3000, 49800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '3','51(W)x32(H)x30(D) cm', 53800, 46800, 3000, 49800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '2','51(W)x32(H)x30(D) cm', 41800, 34800, 3000, 37800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D27 to D32', '1','51(W)x32(H)x30(D) cm', 41800, 34800, 3000, 37800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- ── Section D1 to D13 ────────────────────────────────────────────
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
SELECT * FROM (VALUES
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '9','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '8','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '7','51(W)x36(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '6','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '5','51(W)x32(H)x30(D) cm', 55800, 48800, 3000, 51800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13','3A','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '3','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '2','51(W)x32(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D1 to D13', '1','51(W)x32(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- ── Section D16 to D26 ───────────────────────────────────────────
-- Same price tier as D1-D13; stored as a separate range row
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
SELECT * FROM (VALUES
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '9','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '8','51(W)x36(H)x30(D) cm', 33800, 26800, 3000, 29800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '7','51(W)x36(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '6','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '5','51(W)x32(H)x30(D) cm', 55800, 48800, 3000, 51800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26','3A','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '3','51(W)x32(H)x30(D) cm', 49800, 42800, 3000, 45800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '2','51(W)x32(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','D16 to D26', '1','51(W)x32(H)x30(D) cm', 37800, 30800, 3000, 33800, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- ── Sections S13A & S15 ──────────────────────────────────────────
INSERT INTO product_price_list
  (site_code, product_category, product_name, block, floor, section_group, level, size_description,
   as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
SELECT * FROM (VALUES
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '9','32(W)x36(H)x30(D) cm', 21800, 17800, 1500, 19300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '8','32(W)x36(H)x30(D) cm', 21800, 17800, 1500, 19300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '7','32(W)x36(H)x30(D) cm', 23800, 19800, 1500, 21300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '6','32(W)x32(H)x30(D) cm', 29800, 25800, 1500, 27300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '5','32(W)x32(H)x30(D) cm', 32800, 28800, 1500, 30300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15','3A','32(W)x32(H)x30(D) cm', 29800, 25800, 1500, 27300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '3','32(W)x32(H)x30(D) cm', 29800, 25800, 1500, 27300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '2','32(W)x32(H)x30(D) cm', 23800, 19800, 1500, 21300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027'),
  ('Semenyih-NMG','Niche','JLD-B-GF','JLD-B-GF','GF','S13A/S15', '1','32(W)x32(H)x30(D) cm', 23800, 19800, 1500, 21300, '2026-07-24'::date, true, 'Urn installation subject to block completion 30 Sep 2027')
) AS v(site_code, product_category, product_name, block, floor, section_group, level, size_description,
       as_need_price, pre_need_price, trust_account_facility, total_pre_need_price, wef_date, active, notes)
WHERE NOT EXISTS (
  SELECT 1 FROM product_price_list p
  WHERE p.site_code     = v.site_code
    AND p.product_name  = v.product_name
    AND p.block         = v.block
    AND p.section_group = v.section_group
    AND p.level         = v.level
    AND p.wef_date      = v.wef_date
);

-- ── Refresh price match view ──────────────────────────────────────
REFRESH MATERIALIZED VIEW product_availability_with_price;
