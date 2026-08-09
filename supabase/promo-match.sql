-- ============================================================
-- Stage 5: Promotion matching
-- Run in Supabase SQL Editor
-- ============================================================


-- ── Step 1: Add lot_type column to product_price_list ────────

ALTER TABLE product_price_list
  ADD COLUMN IF NOT EXISTS lot_type text;

-- Grant stays via existing table grants
-- lot_type values: 'Single', 'Double', 'Family', 'Super Family', 'Royal', 'Pedestal', 'Niche'


-- ── Step 2: Promotion lot range match function ────────────────
-- Returns true if an available lot (section + lot_num) falls
-- within a promotion's lot_range string.
--
-- lot_range formats:
--   null                        → matches all lots (no restriction)
--   'SAA (18~388)'              → section SAA, lots 18–388
--   'DAB~DB (218 & 228)'        → sections DAB–DB, lots 218 or 228 only
--   'DAB~DB (88~208, 238~278)'  → sections DAB–DB, lots 88–208 OR 238–278
--   'FC~FE (118~198)'           → sections FC–FE, lots 118–198
--   'FC~FE (108)'               → sections FC–FE, lot 108 only
--   'Level 3'                   → pedestal level — match section exactly
-- ─────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION promo_lot_range_match(
  p_section   text,     -- e.g. 'DA', 'SAA', 'FC'
  p_lot_num   integer,  -- e.g. 108
  p_lot_range text      -- promotion lot_range value
) RETURNS boolean
LANGUAGE plpgsql IMMUTABLE AS $$
DECLARE
  v_section_part text;
  v_lot_part     text;
  v_sec_from     text;
  v_sec_to       text;
  v_section_ok   boolean;
  v_range_item   text;
  v_lo           integer;
  v_hi           integer;
  v_lot_ok       boolean;
BEGIN
  -- null = applies to all lots
  IF p_lot_range IS NULL THEN RETURN true; END IF;

  -- Split: 'SECTION_PART (LOT_PART)' or just 'SECTION_PART'
  IF p_lot_range ~ '\(' THEN
    v_section_part := upper(trim(split_part(p_lot_range, '(', 1)));
    v_lot_part     := trim(replace(split_part(p_lot_range, '(', 2), ')', ''));
  ELSE
    v_section_part := upper(trim(p_lot_range));
    v_lot_part     := null;
  END IF;

  -- ── Section matching ────────────────────────────────────────
  IF v_section_part ~ '~' THEN
    v_sec_from   := upper(trim(split_part(v_section_part, '~', 1)));
    v_sec_to     := upper(trim(split_part(v_section_part, '~', 2)));
    v_section_ok := upper(p_section) >= v_sec_from AND upper(p_section) <= v_sec_to;
  ELSE
    v_section_ok := upper(p_section) = v_section_part;
  END IF;

  IF NOT v_section_ok THEN RETURN false; END IF;

  -- No lot restriction → section match is enough
  IF v_lot_part IS NULL OR v_lot_part = '' THEN RETURN true; END IF;

  -- No lot_num available → can't verify lot range
  IF p_lot_num IS NULL THEN RETURN false; END IF;

  -- ── Lot number matching ─────────────────────────────────────

  -- Specific lots with '&': e.g. '218 & 228'
  IF v_lot_part ~ '&' THEN
    FOREACH v_range_item IN ARRAY string_to_array(v_lot_part, '&') LOOP
      BEGIN
        IF p_lot_num = trim(v_range_item)::integer THEN RETURN true; END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
    RETURN false;
  END IF;

  -- Comma-separated ranges or a single range/number: e.g. '88~208, 238~278' or '18~388' or '108'
  v_lot_ok := false;
  FOREACH v_range_item IN ARRAY string_to_array(v_lot_part, ',') LOOP
    v_range_item := trim(v_range_item);
    IF v_range_item ~ '~' THEN
      BEGIN
        v_lo := trim(split_part(v_range_item, '~', 1))::integer;
        v_hi := trim(split_part(v_range_item, '~', 2))::integer;
        IF p_lot_num >= v_lo AND p_lot_num <= v_hi THEN
          v_lot_ok := true;
          EXIT;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    ELSE
      BEGIN
        IF p_lot_num = v_range_item::integer THEN
          v_lot_ok := true;
          EXIT;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;

  RETURN v_lot_ok;
END;
$$;


-- ── Step 3: Extended view with promo matching ─────────────────
-- Extends product_availability_with_price to find the best
-- matching active promotion for each lot.
-- Handles both columbarium (level_restriction) and burial plot (lot_range).

CREATE OR REPLACE VIEW product_availability_with_promo AS
SELECT
  base.*,
  -- Best matching promotion (most specific discount wins)
  promo.id                    AS promo_id,
  promo.memo_reference        AS promo_memo,
  promo.promo_start_date,
  promo.promo_end_date,
  promo.lot_type              AS promo_lot_type,
  promo.lot_range             AS promo_lot_range,
  promo.level_restriction     AS promo_level_restriction,
  promo.min_down_payment_pct,
  promo.min_down_payment_rm,
  promo.max_instalment_months,
  promo.discount_pct,
  promo.discount_rm,
  promo.dr_plus_eligible,
  promo.dr_plus_type,
  promo.dr_plus_fixed_units,
  promo.is_combo,
  promo.combo_total_price,
  promo.remarks               AS promo_remarks,
  -- Calculated promo price (discount off pre_need only, then add trust + backwall)
  CASE
    WHEN promo.discount_pct IS NOT NULL AND base.pre_need_price IS NOT NULL THEN
      ROUND(base.pre_need_price * (1 - promo.discount_pct / 100.0))
      + COALESCE(base.trust_account_facility, 0)
      + COALESCE(base.backwall_cost, 0)
    WHEN promo.discount_rm IS NOT NULL AND base.pre_need_price IS NOT NULL THEN
      (base.pre_need_price - promo.discount_rm)
      + COALESCE(base.trust_account_facility, 0)
      + COALESCE(base.backwall_cost, 0)
    ELSE NULL
  END                         AS promo_total_price
FROM product_availability_with_price base
LEFT JOIN LATERAL (
  SELECT p.*
  FROM promotions p
  WHERE p.active = true
    AND p.site_code    = base.site
    -- Match on product_name (works for both columbarium and burial plot)
    AND p.product_name = base.product_name
    AND p.promo_end_date   >= CURRENT_DATE
    AND p.promo_start_date <= CURRENT_DATE
    -- lot_type: null in promo = applies to all lot types
    AND (p.lot_type IS NULL OR p.lot_type = base.lot_type)
    -- level_restriction: for columbarium promos (null = all levels)
    AND (p.level_restriction IS NULL OR
         base.niche_level = ANY(string_to_array(replace(p.level_restriction, ' ', ''), ',')))
    -- lot_range: for burial plot promos (null = all lots)
    AND (p.lot_range IS NULL OR
         promo_lot_range_match(base.lot_section, base.lot_num, p.lot_range))
  -- Pick highest discount first
  ORDER BY
    COALESCE(p.discount_rm, p.discount_pct * (base.pre_need_price / 100.0), 0) DESC
  LIMIT 1
) promo ON true;

GRANT SELECT ON product_availability_with_promo TO service_role, authenticated, anon;


-- ── Step 4: Verify — check NV-S available lots with promos ───

SELECT
  lot_code,
  lot_section,
  lot_num,
  lot_type,
  pre_need_price,
  promo_lot_type,
  discount_rm,
  promo_total_price
FROM product_availability_with_promo
WHERE site = 'Semenyih'
  AND zone  = 'NV-S'
  AND available = true
ORDER BY lot_section, lot_num
LIMIT 20;
