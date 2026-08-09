-- ============================================================
-- product_promo_options — materialized view
--
-- Returns ONE ROW PER LOT PER PROMO NAME for every available lot.
-- promo_name values come directly from promo_match_rules — no
-- hardcoded mapping. New promo types (As-Need, Parent's Day,
-- Purchase with Purchase, etc.) are picked up automatically when
-- added to promo_match_rules.
--
-- Special cases:
--   cash_purchase rows → promo_name becomes "<promo_name> - Cash Purchase"
--   Central Promo      → suppressed for lots that already have a Customer Promo match
--
-- When a new promo memo is uploaded, run:
--   REFRESH MATERIALIZED VIEW product_promo_options;
-- ============================================================


-- ── Step 1: Extend promo_lot_range_match to support CD* wildcard ──

CREATE OR REPLACE FUNCTION promo_lot_range_match(
  p_section   text,
  p_lot_num   integer,
  p_lot_range text
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
  IF p_lot_range IS NULL THEN RETURN true; END IF;

  IF p_lot_range LIKE '%*' THEN
    RETURN upper(p_section) LIKE upper(rtrim(p_lot_range, '*')) || '%';
  END IF;

  IF p_lot_range ~ '\(' THEN
    v_section_part := upper(trim(split_part(p_lot_range, '(', 1)));
    v_lot_part     := trim(replace(split_part(p_lot_range, '(', 2), ')', ''));
  ELSE
    v_section_part := upper(trim(p_lot_range));
    v_lot_part     := null;
  END IF;

  IF v_section_part ~ '~' THEN
    v_sec_from   := upper(trim(split_part(v_section_part, '~', 1)));
    v_sec_to     := upper(trim(split_part(v_section_part, '~', 2)));
    v_section_ok := upper(p_section) >= v_sec_from AND upper(p_section) <= v_sec_to;
  ELSE
    v_section_ok := upper(p_section) = v_section_part;
  END IF;

  IF NOT v_section_ok THEN RETURN false; END IF;
  IF v_lot_part IS NULL OR v_lot_part = '' THEN RETURN true; END IF;
  IF p_lot_num IS NULL THEN RETURN false; END IF;

  IF v_lot_part ~ '&' THEN
    FOREACH v_range_item IN ARRAY string_to_array(v_lot_part, '&') LOOP
      BEGIN
        IF p_lot_num = trim(v_range_item)::integer THEN RETURN true; END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END LOOP;
    RETURN false;
  END IF;

  v_lot_ok := false;
  FOREACH v_range_item IN ARRAY string_to_array(v_lot_part, ',') LOOP
    v_range_item := trim(v_range_item);
    IF v_range_item ~ '~' THEN
      BEGIN
        v_lo := trim(split_part(v_range_item, '~', 1))::integer;
        v_hi := trim(split_part(v_range_item, '~', 2))::integer;
        IF p_lot_num >= v_lo AND p_lot_num <= v_hi THEN
          v_lot_ok := true; EXIT;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    ELSE
      BEGIN
        IF p_lot_num = v_range_item::integer THEN
          v_lot_ok := true; EXIT;
        END IF;
      EXCEPTION WHEN OTHERS THEN NULL; END;
    END IF;
  END LOOP;

  RETURN v_lot_ok;
END;
$$;


-- ── Step 2: Ensure exclusion columns exist on promo_match_rules ─
ALTER TABLE promo_match_rules
  ADD COLUMN IF NOT EXISTS excluded_site_codes    text[],
  ADD COLUMN IF NOT EXISTS excluded_product_names text[];


-- ── Step 3: Create product_promo_options ──────────────────────

DROP MATERIALIZED VIEW IF EXISTS product_promo_options;

CREATE MATERIALIZED VIEW product_promo_options AS
WITH matches AS (
  SELECT
    base.id AS lot_id, base.site, base.zone, base.lot_code,
    base.niche_section, base.niche_level, base.lot_section, base.lot_num,
    base.product_name, base.product_category, base.lot_type, base.size_description, base.available,
    base.pre_need_price, base.as_need_price, base.trust_account_facility, base.backwall_cost,
    p.id               AS promo_rule_id,
    p.purchase_condition,
    p.level_restriction AS promo_level_restriction,
    p.lot_range         AS promo_lot_range,
    p.memo_reference,
    p.is_combo,
    p.combo_total_price,
    p.combo_product_name,
    p.combo_product_price,

    -- promo_name: use DB name directly; cash purchase rows get a suffix
    CASE
      WHEN p.purchase_condition = 'cash_purchase'
        THEN p.promo_name || ' - Cash Purchase'
      ELSE p.promo_name
    END AS promo_name,

    p.discount_pct, p.discount_rm, p.min_down_payment_pct, p.max_instalment_months,
    p.dr_plus_eligible, p.dr_plus_type, p.dr_plus_fixed_units,
    p.dp_tiers, p.instalment_tiers, p.remarks AS promo_remarks,
    p.promo_start_date, p.promo_end_date,

    -- Pre-calculated promo price
    CASE
      WHEN p.is_combo = true
        THEN p.combo_total_price
      WHEN p.purchase_condition = 'as_need' AND p.discount_pct IS NOT NULL AND base.as_need_price IS NOT NULL
        THEN ROUND(base.as_need_price * (1 - p.discount_pct / 100.0))
             + COALESCE(base.trust_account_facility, 0) + COALESCE(base.backwall_cost, 0)
      WHEN p.discount_pct IS NOT NULL AND base.pre_need_price IS NOT NULL
        THEN ROUND(base.pre_need_price * (1 - p.discount_pct / 100.0))
             + COALESCE(base.trust_account_facility, 0) + COALESCE(base.backwall_cost, 0)
      WHEN p.discount_rm IS NOT NULL AND base.pre_need_price IS NOT NULL
        THEN (base.pre_need_price - p.discount_rm)
             + COALESCE(base.trust_account_facility, 0) + COALESCE(base.backwall_cost, 0)
      ELSE NULL
    END AS promo_price,

    -- Pre-calculated DP amount
    CASE
      WHEN p.discount_pct IS NOT NULL AND base.pre_need_price IS NOT NULL
        AND p.min_down_payment_pct IS NOT NULL
        THEN ROUND(
          (ROUND(base.pre_need_price * (1 - p.discount_pct / 100.0))
           + COALESCE(base.trust_account_facility, 0) + COALESCE(base.backwall_cost, 0))
          * p.min_down_payment_pct / 100.0)
      ELSE NULL
    END AS dp_amount,

    -- Pre-calculated monthly instalment
    -- Resolves months from max_instalment_months or instalment_tiers (key: max_months)
    CASE
      WHEN p.discount_pct IS NOT NULL AND base.pre_need_price IS NOT NULL
        AND p.min_down_payment_pct IS NOT NULL
        AND COALESCE(p.max_instalment_months,
              (SELECT (t->>'max_months')::int FROM jsonb_array_elements(p.instalment_tiers) t
               WHERE t->>'max_months' IS NOT NULL
                 AND ((t->>'max_price') IS NULL OR base.pre_need_price <= (t->>'max_price')::numeric)
               LIMIT 1)) > 0
        THEN ROUND(
          (ROUND(base.pre_need_price * (1 - p.discount_pct / 100.0))
           + COALESCE(base.trust_account_facility, 0) + COALESCE(base.backwall_cost, 0))
          * (1 - p.min_down_payment_pct / 100.0)
          / COALESCE(p.max_instalment_months,
              (SELECT (t->>'max_months')::int FROM jsonb_array_elements(p.instalment_tiers) t
               WHERE t->>'max_months' IS NOT NULL
                 AND ((t->>'max_price') IS NULL OR base.pre_need_price <= (t->>'max_price')::numeric)
               LIMIT 1)))
      ELSE NULL
    END AS monthly_instalment,

    -- Flags for priority suppression — partitioned by base.id (unique per lot-in-zone row)
    -- to prevent cross-site/cross-zone contamination when the same lot_code exists elsewhere
    MAX(CASE WHEN p.promo_name = 'Customer Promo' THEN 1 ELSE 0 END)
      OVER (PARTITION BY base.id) AS _has_customer_promo,
    MAX(CASE WHEN p.promo_name = 'DRPlus Promo' THEN 1 ELSE 0 END)
      OVER (PARTITION BY base.id) AS _has_drplus_promo,

    -- Rank within (lot row, promo_name): highest discount → lowest DP → stable ID
    ROW_NUMBER() OVER (
      PARTITION BY base.id,
        CASE
          WHEN p.purchase_condition = 'cash_purchase' THEN p.promo_name || ' - Cash Purchase'
          ELSE p.promo_name
        END
      ORDER BY
        p.discount_pct DESC NULLS LAST,
        p.min_down_payment_pct ASC NULLS LAST,
        p.id
    ) AS _rn

  FROM product_availability_with_price base
  JOIN promo_match_rules p ON (
    p.active = true
    AND p.promo_start_date <= CURRENT_DATE
    AND p.promo_end_date   >= CURRENT_DATE
    AND (
      lower(p.product_name) = 'central region'
      OR lower(p.site_code) = lower(base.site)
    )
    AND (
      lower(p.product_name) = 'central region'
      OR lower(p.product_name) = lower(base.zone)
      OR lower(base.zone)      LIKE lower(p.product_name) || '-%'
      OR lower(p.product_name) LIKE lower(base.zone)      || '-%'
    )
    AND (
      p.lot_type IS NULL
      OR base.lot_type IS NULL
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(
          regexp_replace(p.lot_type, '\s*[&,]\s*', ',', 'g'), ',')) AS t(lt)
        WHERE lower(trim(t.lt)) = lower(base.lot_type)
      )
    )
    AND (
      p.level_restriction IS NULL
      OR base.niche_level::text = ANY(
        string_to_array(replace(p.level_restriction, ' ', ''), ',')
      )
    )
    AND promo_lot_range_match(
      COALESCE(base.niche_section, base.lot_section),
      base.lot_num,
      p.lot_range
    )
    -- Exclusion filters: skip this rule if lot's site or zone is excluded
    AND (p.excluded_site_codes    IS NULL OR base.site NOT LIKE ALL(p.excluded_site_codes))
    AND (p.excluded_product_names IS NULL OR base.zone NOT LIKE ALL(p.excluded_product_names))
  )
  WHERE base.available = true
    AND base.price_list_id IS NOT NULL
),
-- base_promos: Central Promo pricing for DRPlus to inherit.
-- DRPlus only appears when there is NO Customer Promo, so it always inherits Central Promo.
base_promos AS (
  SELECT DISTINCT ON (lot_id)
    lot_id,
    discount_pct, discount_rm, min_down_payment_pct, max_instalment_months,
    dp_tiers, instalment_tiers, promo_price, dp_amount, monthly_instalment
  FROM matches
  WHERE promo_name = 'Central Promo'
    AND (purchase_condition IS NULL OR purchase_condition <> 'cash_purchase')
    AND _rn = 1
  ORDER BY lot_id, discount_pct DESC NULLS LAST
),
-- best: deduplicated rows, one per (lot, promo_name)
best AS (
  SELECT * FROM matches
  WHERE _rn = 1
    -- Priority 1: Customer Promo wins — suppress Central Promo AND DRPlus Promo
    AND NOT (promo_name = 'Central Promo' AND (_has_customer_promo = 1 OR _has_drplus_promo = 1))
    AND NOT (promo_name = 'DRPlus Promo'  AND _has_customer_promo = 1)
)
-- Final: DRPlus rows inherit pricing from base_promos via a simple join
SELECT
  b.lot_id, b.site, b.zone, b.lot_code, b.niche_section, b.niche_level, b.lot_section, b.lot_num,
  b.product_name, b.product_category, b.lot_type, b.size_description, b.available,
  b.pre_need_price, b.as_need_price, b.trust_account_facility, b.backwall_cost,
  b.promo_rule_id, b.promo_name, b.purchase_condition,
  b.promo_level_restriction, b.promo_lot_range, b.memo_reference,
  b.is_combo, b.combo_total_price, b.combo_product_name, b.combo_product_price,
  -- Pricing: DRPlus has no pricing of its own — inherit from base promo via COALESCE
  COALESCE(b.discount_pct,          bp.discount_pct)          AS discount_pct,
  COALESCE(b.discount_rm,           bp.discount_rm)           AS discount_rm,
  COALESCE(b.min_down_payment_pct,  bp.min_down_payment_pct)  AS min_down_payment_pct,
  COALESCE(b.max_instalment_months, bp.max_instalment_months) AS max_instalment_months,
  b.dr_plus_eligible, b.dr_plus_type, b.dr_plus_fixed_units,
  COALESCE(b.dp_tiers,              bp.dp_tiers)              AS dp_tiers,
  COALESCE(b.instalment_tiers,      bp.instalment_tiers)      AS instalment_tiers,
  b.promo_remarks, b.promo_start_date, b.promo_end_date,
  COALESCE(b.promo_price,           bp.promo_price)           AS promo_price,
  COALESCE(b.dp_amount,             bp.dp_amount)             AS dp_amount,
  COALESCE(b.monthly_instalment,    bp.monthly_instalment)    AS monthly_instalment
FROM best b
LEFT JOIN base_promos bp ON bp.lot_id = b.lot_id AND b.promo_name = 'DRPlus Promo';


-- ── Step 4: Indexes ───────────────────────────────────────────
CREATE INDEX ON product_promo_options (site, zone);
CREATE INDEX ON product_promo_options (lot_code);
CREATE INDEX ON product_promo_options (site, zone, promo_name);


-- ── Step 5: Grant access ──────────────────────────────────────
GRANT SELECT ON product_promo_options TO service_role, authenticated, anon;


-- ── Step 6: Verify ────────────────────────────────────────────
SELECT promo_name, purchase_condition, discount_pct, min_down_payment_pct,
       max_instalment_months, promo_price, dp_amount, monthly_instalment
FROM product_promo_options
WHERE lot_code = 'CD1-01-08'
ORDER BY promo_name;
