-- ── 1. Create table ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bundle_promo_options (
  id                       bigserial PRIMARY KEY,
  site_code                text        NOT NULL,
  product_name             text        NOT NULL,   -- e.g. 'JLD-B-GF' or prefix 'JLD'
  option_name              text        NOT NULL,   -- e.g. 'NV Honour (A)'
  option_pre_need_price    numeric     NOT NULL DEFAULT 0,
  option_special_discount  numeric     NOT NULL DEFAULT 0,
  option_additional_discount numeric   NOT NULL DEFAULT 0,
  option_net_price         numeric     NOT NULL DEFAULT 0,
  option_trust_account     numeric     NOT NULL DEFAULT 0,
  min_down_payment_pct     numeric     NOT NULL DEFAULT 10,
  max_instalment_months    int         NOT NULL DEFAULT 0,  -- 0 = no instalment shown
  promo_start_date         date        NOT NULL,
  promo_end_date           date        NOT NULL,
  active                   boolean     NOT NULL DEFAULT true,
  memo_ref                 text,
  remarks                  text,
  created_at               timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bpo_site_product
  ON bundle_promo_options (site_code, product_name);

-- RLS: agents can read active options (same pattern as other promo tables)
ALTER TABLE bundle_promo_options ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "agents can read bundle promo options" ON bundle_promo_options;
CREATE POLICY "agents can read bundle promo options"
  ON bundle_promo_options FOR SELECT
  TO authenticated
  USING (active = true);

-- Admin (service role) can do everything — handled by supabaseAdmin client, no policy needed.

-- ── 2. Insert Memo 117/2026 — JLD-B-GF Bundle Offer ─────────────
-- Ref: NVA/CUS/HOD/CIR/117/2026, dated 24.07.2026
-- Promo period: 26.07.2026 – 31.07.2026
-- site_code: Semenyih-NMG, product_name: JLD-B-GF

INSERT INTO bundle_promo_options
  (site_code, product_name, option_name,
   option_pre_need_price, option_special_discount, option_additional_discount,
   option_net_price, option_trust_account,
   min_down_payment_pct, max_instalment_months,
   promo_start_date, promo_end_date,
   memo_ref)
VALUES
  ('Semenyih-NMG', 'JLD-B-GF', 'NV Honour (A)',
   37800, 3500, 1000, 33300, 0,
   10, 0,
   '2026-07-26', '2026-07-31',
   'NVA/CUS/HOD/CIR/117/2026'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Elegant (A)',
   30800, 2500, 1000, 27300, 0,
   10, 0,
   '2026-07-26', '2026-07-31',
   'NVA/CUS/HOD/CIR/117/2026'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Emerald',
   23800, 1000, 500, 22300, 0,
   10, 0,
   '2026-07-26', '2026-07-31',
   'NVA/CUS/HOD/CIR/117/2026'),

  ('Semenyih-NMG', 'JLD-B-GF', 'NV Essential',
   21800, 500, 500, 20800, 0,
   10, 0,
   '2026-07-26', '2026-07-31',
   'NVA/CUS/HOD/CIR/117/2026');
