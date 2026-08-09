-- ============================================================
-- PROMOTIONS DATA: NVA/CUS/HOD/CIR/078/2026
-- Semenyih — Customer Promotion May to June 2026
-- ============================================================

-- ── Table A: Instalment Tenure Rules ─────────────────────────

INSERT INTO instalment_tenure_rules
  (memo_reference, site_code, promo_start_date, promo_end_date, price_from, price_to, max_instalment_months)
VALUES
  ('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30', null,   35999,  36),
  ('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30', 36001, 59999,  48),
  ('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30', 60000,  null,   60);


-- ── Standard Customer Promotions ─────────────────────────────

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   promo_type, remarks)
VALUES

-- NV Imperial, NV Imperial 3, NV Grand Imperial 1 — grouped together in memo
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Imperial','Royal & Super Family',null, 10,null,60, 20,null, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Imperial 3','Royal & Super Family',null, 10,null,60, 20,null, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Grand Imperial 1','Royal & Super Family',null, 10,null,60, 20,null, true,'calc',null, 'standard',null),

-- NV Imperial 2
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Imperial 2','Royal',null, 10,null,60, 20,null, false,null,null, 'standard',null),

-- NV Grand Imperial 2 (Row RA, RB, RD 8-88)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Grand Imperial 2','Royal','Row RA, RB, RD (8~88)', 10,null,60, 10,null, false,null,null, 'standard',null),

-- Horizon 3 — two rows (10% dp and 20% dp)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Horizon 3','Super Family & Family',null, 10,null,60, 10,null, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Horizon 3','Super Family & Family',null, 20,null,60, 20,null, true,'calc',null, 'standard',null),

-- NV Majestic 1
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Majestic 1','Super Family & Family',null, 20,null,48, 35,null, false,null,null, 'standard',
 'No Booking & No Reservation for 35% discount'),

-- NV Dynasty 1 (Row FB, FC, FD 08 to 198)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Dynasty 1','Family','Row FB, FC, FD (08~198)', 10,null,60, 35,null, false,null,null, 'standard',
 'No Booking & No Reservation for 35% discount'),

-- NV-S — 4 rows (Double/Single × 10%/20% dp)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Double',null, 10,null,60, null,2500, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Double',null, 20,null,60, null,5000, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Single',null, 10,null,60, null,1000, true,'calc',null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Single',null, 20,null,60, null,2000, true,'calc',null, 'standard',null),

-- NV-R (Row SAA, SA Lot 18-388) — Single only
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-R','Single','Row SAA, SA (Lot 18~388)', 10,null,48, null,10000, false,null,null, 'standard',null),

-- Ming Court 1 — 6 rows (Double/Single × 3 level groups)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Double','Level 3, 3A, 5, 6', 10,null,48, null,4000, false,null,null, 'standard',
 'No Booking & No Reservation'),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Double','Level 1, 2, 7', 10,null,48, null,6000, false,null,null, 'standard',
 'No Booking & No Reservation'),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Double','Level 8, 9', 10,null,48, null,8000, false,null,null, 'standard',
 'No Booking & No Reservation'),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Single','Level 3, 3A, 5, 6', 10,null,36, null,2000, false,null,null, 'standard',
 'No Booking & No Reservation'),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Single','Level 1, 2, 7', 10,null,36, null,3000, false,null,null, 'standard',
 'No Booking & No Reservation'),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Ming Court MC1','Single','Level 8, 9', 10,null,36, null,4000, false,null,null, 'standard',
 'No Booking & No Reservation'),

-- Eternal Suite 3 — Double and Single
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Eternal Suite 3','Double',null, 10,null,60, 20,null, true,'fixed',2, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'Eternal Suite 3','Single',null, 10,null,36, null,null, false,null,null, 'standard',null),

-- OV6 1st Floor Sec A — Pedestal (instalment and cash purchase)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'OV6 1st Flr Sec A','Pedestal',null, null,4000,24, null,4000, false,null,null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'OV6 1st Flr Sec A','Pedestal',null, null,null,null, null,5000, false,null,null, 'standard',
 'Cash Purchase'),

-- DZW-A, D & E — Pedestal (20% and 30% dp)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-A, D & E','Pedestal',null, 20,null,24, null,500, false,null,null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-A, D & E','Pedestal',null, 30,null,24, null,1500, false,null,null, 'standard',null),

-- DZW-B — Pedestal (20% dp and cash purchase)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-B','Pedestal',null, 20,null,24, null,2000, false,null,null, 'standard',null),

('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'DZW-B','Pedestal',null, null,null,null, null,4000, false,null,null, 'standard',
 'Cash Purchase'),

-- NV Seed 1, 2, 3
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Seed 1, 2, 3',null,null, 20,null,24, null,1000, true,'fixed',2, 'standard',null),

-- NV Seed 6
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Seed 6',null,null, 20,null,24, null,2000, true,'fixed',2, 'standard',null);


-- ── Combo Promotions ──────────────────────────────────────────

INSERT INTO promotions
  (memo_reference, site_code, promo_start_date, promo_end_date,
   product_name, lot_type, lot_range,
   min_down_payment_pct, min_down_payment_rm, max_instalment_months,
   discount_pct, discount_rm,
   dr_plus_eligible, dr_plus_type, dr_plus_fixed_units,
   is_combo, combo_land_price, combo_tomb_price, combo_total_price,
   promo_type, remarks)
VALUES

-- NV Dynasty 2 Combo: FC~FE (118~198)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Dynasty 2','Double','FC~FE (118~198)',
 10,null,60, null,null,
 false,null,null,
 true, 197000, 198800, 438800,
 'combo','Not entitled to DR Plus; requires Burial Plot PO + Tomb Package Contract PO'),

-- NV Dynasty 2 Combo: FC~FE (108)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV Dynasty 2','Double','FC~FE (108)',
 10,null,60, null,null,
 false,null,null,
 true, 217000, 198800, 458800,
 'combo','Not entitled to DR Plus; requires Burial Plot PO + Tomb Package Contract PO'),

-- NV-S Combo: DAB~DB (88~208, 238~278)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Double','DAB~DB (88~208, 238~278)',
 10,null,60, null,null,
 true,'fixed',5,
 true, 52800, 47800, 112600,
 'combo','5 DR Plus units; requires Burial Plot PO + Tomb Package Contract PO'),

-- NV-S Combo: DAB~DB (218 & 228)
('NVA/CUS/HOD/CIR/078/2026','Semenyih','2026-05-01','2026-06-30',
 'NV-S','Double','DAB~DB (218 & 228)',
 10,null,60, null,null,
 true,'fixed',5,
 true, 57800, 47800, 117600,
 'combo','5 DR Plus units; requires Burial Plot PO + Tomb Package Contract PO');
