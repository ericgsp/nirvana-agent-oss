-- ============================================================
-- Expand compressed/grouped promotion rows into individual rows
-- Run in Supabase SQL Editor
-- ============================================================

-- ── 1. Delete the compressed rows ────────────────────────────

DELETE FROM promotions
WHERE memo_reference = 'NVA/CUS/HOD/CIR/078/2026'
  AND product_name IN ('DZW-A, D & E', 'NV Seed 1, 2, 3');


-- ── 2. Re-insert as individual product rows ───────────────────

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   promo_type, remarks)
VALUES

-- DZW-A (Pedestal) — 20% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-A','Pedestal',null, 20,null,24, null,500, false,null,null, 'standard',null),

-- DZW-A (Pedestal) — 30% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-A','Pedestal',null, 30,null,24, null,1500, false,null,null, 'standard',null),

-- DZW-D (Pedestal) — 20% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-D','Pedestal',null, 20,null,24, null,500, false,null,null, 'standard',null),

-- DZW-D (Pedestal) — 30% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-D','Pedestal',null, 30,null,24, null,1500, false,null,null, 'standard',null),

-- DZW-E (Pedestal) — 20% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-E','Pedestal',null, 20,null,24, null,500, false,null,null, 'standard',null),

-- DZW-E (Pedestal) — 30% dp
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-E','Pedestal',null, 30,null,24, null,1500, false,null,null, 'standard',null),

-- NV Seed 1
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Seed 1',null,null, 20,null,24, null,1000, true,'fixed',2, 'standard',null),

-- NV Seed 2
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Seed 2',null,null, 20,null,24, null,1000, true,'fixed',2, 'standard',null),

-- NV Seed 3 (already covered by 'NV Seed 3' in price list)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Seed 3',null,null, 20,null,24, null,1000, true,'fixed',2, 'standard',null);
