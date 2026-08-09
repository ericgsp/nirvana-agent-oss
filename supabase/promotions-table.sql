-- ============================================================
-- PROMOTIONS TABLE
-- Stores all promotion rows extracted from Nirvana memo PDFs.
-- One row per product × lot_type × down_payment_scenario.
-- Run in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS promotions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Memo metadata
  memo_reference      text NOT NULL,        -- e.g. 'NVA/CUS/HOD/CIR/078/2026'
  site_code           text NOT NULL,        -- e.g. 'Semenyih'
  promo_start_date    date NOT NULL,        -- e.g. 2026-05-01
  promo_end_date      date NOT NULL,        -- e.g. 2026-06-30

  -- Product targeting (matches product_price_list.product_name / availability zone)
  product_name        text NOT NULL,        -- e.g. 'NV-S', 'NV Dynasty 1'
  lot_type            text,                 -- Double, Single, Royal, Super Family, Family, etc.
  lot_range           text,                 -- optional restriction: 'Row FB~FD (08~198)'

  -- Payment terms
  min_down_payment_pct  numeric,            -- e.g. 10, 20  (as percentage)
  min_down_payment_rm   numeric,            -- e.g. 4000    (fixed RM — used when dp is not a %)
  max_instalment_months integer,            -- 12, 24, 36, 48, 60

  -- Discount off pre-need price (only one of these will be set per row)
  discount_pct        numeric,              -- e.g. 10, 20, 35
  discount_rm         numeric,              -- e.g. 2500, 5000, 10000

  -- DR Plus entitlement
  dr_plus_eligible    boolean DEFAULT false,
  dr_plus_type        text,                 -- 'calc' (net/10000 rounded up) or 'fixed'
  dr_plus_fixed_units integer,              -- populated when dr_plus_type = 'fixed'

  -- Combo promotion (burial plot + tomb package bundled at special price)
  is_combo            boolean DEFAULT false,
  combo_land_price    numeric,              -- special land price under combo
  combo_tomb_price    numeric,              -- tomb package price under combo
  combo_total_price   numeric,              -- total combo price (land + trust + backwall + tomb)

  -- Misc
  promo_type          text NOT NULL DEFAULT 'standard',
  -- 'standard'  → normal discount/instalment row
  -- 'combo'     → burial plot + tomb bundle deal
  remarks             text,                 -- e.g. 'No Booking & No Reservation'
  active              boolean DEFAULT true,
  created_at          timestamptz DEFAULT now()
);

-- Grants
GRANT ALL ON TABLE promotions TO service_role;
GRANT SELECT ON TABLE promotions TO authenticated, anon;

-- Instalment tenure rules (global, from Table A of each memo)
-- Separate table because these apply to ALL products, not per product
CREATE TABLE IF NOT EXISTS instalment_tenure_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  memo_reference        text NOT NULL,
  site_code             text NOT NULL,
  promo_start_date      date NOT NULL,
  promo_end_date        date NOT NULL,
  price_from            numeric,            -- null = no lower bound
  price_to              numeric,            -- null = no upper bound
  max_instalment_months integer NOT NULL,
  active                boolean DEFAULT true,
  created_at            timestamptz DEFAULT now()
);

GRANT ALL ON TABLE instalment_tenure_rules TO service_role;
GRANT SELECT ON TABLE instalment_tenure_rules TO authenticated, anon;
