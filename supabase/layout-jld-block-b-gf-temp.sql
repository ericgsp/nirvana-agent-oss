-- Temporary layout for JLD Block B Ground Floor (JLD-B-GF)
-- Source: Launching memo layout images (D30, D31, D32, S13A, S15)
-- Replace with portal-synced data once JLD-B-GF goes live on Nirvana portal
-- product_type = 'Columbarium' matches portal dropdown value
-- zone = 'JLD-B-GF' (Option A: single zone for all sections)
-- Level codes: 09=Level 9 (top), 08,07,06,05,3A,03,02,01=Level 1 (bottom)

-- ── D30 (9 lots × 9 levels = 81 rows) ────────────────────────────
INSERT INTO product_availability (site, product_type, zone, section, lot_code, available, synced_at)
SELECT 'Semenyih-NMG', 'NICHE', 'JLD-B-GF', 'D30', 'D30-' || lv || '-' || ln, true, now()
FROM
  (VALUES ('09'),('08'),('07'),('06'),('05'),('3A'),('03'),('02'),('01')) AS lvl(lv),
  (VALUES ('08'),('18'),('28'),('38'),('68'),('78'),('98'),('108'),('118')) AS lots(ln)
ON CONFLICT (site, product_type, zone, section, lot_code)
DO UPDATE SET available = EXCLUDED.available, synced_at = EXCLUDED.synced_at;

-- ── D31 (5 lots × 9 levels = 45 rows) ────────────────────────────
INSERT INTO product_availability (site, product_type, zone, section, lot_code, available, synced_at)
SELECT 'Semenyih-NMG', 'NICHE', 'JLD-B-GF', 'D31', 'D31-' || lv || '-' || ln, true, now()
FROM
  (VALUES ('09'),('08'),('07'),('06'),('05'),('3A'),('03'),('02'),('01')) AS lvl(lv),
  (VALUES ('18'),('28'),('38'),('68'),('78')) AS lots(ln)
ON CONFLICT (site, product_type, zone, section, lot_code)
DO UPDATE SET available = EXCLUDED.available, synced_at = EXCLUDED.synced_at;

-- ── D32 (9 lots × 9 levels = 81 rows) ────────────────────────────
INSERT INTO product_availability (site, product_type, zone, section, lot_code, available, synced_at)
SELECT 'Semenyih-NMG', 'NICHE', 'JLD-B-GF', 'D32', 'D32-' || lv || '-' || ln, true, now()
FROM
  (VALUES ('09'),('08'),('07'),('06'),('05'),('3A'),('03'),('02'),('01')) AS lvl(lv),
  (VALUES ('18'),('28'),('38'),('78'),('88'),('98'),('108'),('118'),('128')) AS lots(ln)
ON CONFLICT (site, product_type, zone, section, lot_code)
DO UPDATE SET available = EXCLUDED.available, synced_at = EXCLUDED.synced_at;

-- ── S13A (27 lots × 9 levels = 243 rows) ─────────────────────────
-- VERIFY these lot numbers against the S13A layout image before running
INSERT INTO product_availability (site, product_type, zone, section, lot_code, available, synced_at)
SELECT 'Semenyih-NMG', 'NICHE', 'JLD-B-GF', 'S13A', 'S13A-' || lv || '-' || ln, true, now()
FROM
  (VALUES ('09'),('08'),('07'),('06'),('05'),('3A'),('03'),('02'),('01')) AS lvl(lv),
  (VALUES ('08'),('18'),('28'),('38'),('68'),('78'),('88'),('98'),('108'),
          ('118'),('128'),('138'),('168'),('178'),('188'),('198'),
          ('218'),('228'),('238'),('268'),('278'),('288'),('298'),
          ('308'),('318'),('328'),('338')) AS lots(ln)
ON CONFLICT (site, product_type, zone, section, lot_code)
DO UPDATE SET available = EXCLUDED.available, synced_at = EXCLUDED.synced_at;

-- ── S15 (29 lots × 9 levels = 261 rows) ──────────────────────────
-- VERIFY these lot numbers against the S15 layout image before running
INSERT INTO product_availability (site, product_type, zone, section, lot_code, available, synced_at)
SELECT 'Semenyih-NMG', 'NICHE', 'JLD-B-GF', 'S15', 'S15-' || lv || '-' || ln, true, now()
FROM
  (VALUES ('09'),('08'),('07'),('06'),('05'),('3A'),('03'),('02'),('01')) AS lvl(lv),
  (VALUES ('18'),('28'),('38'),('68'),('78'),('88'),('98'),('108'),('118'),
          ('128'),('138'),('178'),('188'),('198'),('208'),('218'),('228'),('238'),
          ('268'),('278'),('288'),('298'),('308'),('318'),('328'),('338'),
          ('348'),('358'),('368')) AS lots(ln)
ON CONFLICT (site, product_type, zone, section, lot_code)
DO UPDATE SET available = EXCLUDED.available, synced_at = EXCLUDED.synced_at;

-- Total rows: D30(81) + D31(45) + D32(81) + S13A(243) + S15(261) = 711 rows
