-- ============================================================
-- product_availability_with_price — v2
-- Supports both columbarium (niche) and burial plot matching.
--
-- Columbarium lot code format: SECTION-LEVEL-NICHE  e.g. D1-01-108
-- Columbarium zone format:     BLOCK-FLOOR          e.g. OV6-GF, OV5-1F
--
-- Burial plot lot code format: LETTERS+DIGITS       e.g. FA108, DAE88
-- Burial plot zone:            product_name         e.g. NV-R, NV-S
-- ============================================================

-- Must drop first — PostgreSQL won't replace a view with a different column list
DROP VIEW IF EXISTS product_availability_with_price CASCADE;

CREATE VIEW product_availability_with_price AS
WITH parsed AS (
  SELECT
    pa.*,

    -- ── Columbarium: lot code has exactly 3 hyphen-separated parts ───────────
    -- e.g. 'D1-01-108' → section='D1', level='1' (strip leading zeros)
    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 3
      THEN split_part(pa.lot_code, '-', 1)
    END AS niche_section,

    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 3
      THEN COALESCE(
             NULLIF(ltrim(split_part(pa.lot_code, '-', 2), '0'), ''),
             split_part(pa.lot_code, '-', 2)  -- fallback if all chars were '0' (shouldn't happen)
           )
    END AS niche_level,

    -- ── Columbarium: zone ends in -GF or -<digit>F e.g. OV6-GF, OV5-1F ─────
    CASE
      WHEN pa.zone ~ '-(GF|\d+F)$'
      THEN split_part(pa.zone, '-', 1)
    END AS zone_block,

    -- ── Burial plot: lot code starts with letters then digits, no 3 parts ────
    -- e.g. 'FA108', 'DAE88'
    CASE
      WHEN pa.lot_code ~ '^[A-Za-z]+\d'
        AND array_length(string_to_array(pa.lot_code, '-'), 1) < 3
      THEN upper(regexp_replace(pa.lot_code, '^([A-Za-z]+).*', '\1'))
    END AS lot_section,

    CASE
      WHEN pa.lot_code ~ '^[A-Za-z]+\d'
        AND array_length(string_to_array(pa.lot_code, '-'), 1) < 3
      THEN (regexp_replace(pa.lot_code, '^[A-Za-z]+(\d+).*', '\1'))::integer
    END AS lot_num

  FROM product_availability pa
)
SELECT
  p.id,
  p.site,
  p.product_type,
  p.zone,
  p.section,
  p.lot_code,
  p.niche_section,
  p.niche_level,
  p.lot_section,
  p.lot_num,
  p.available,
  p.synced_at,

  -- Prefer columbarium match (nm), fall back to burial match (bm)
  COALESCE(nm.id,                    bm.id)                    AS price_list_id,
  COALESCE(nm.product_name,          bm.product_name)          AS product_name,
  COALESCE(nm.product_category,      bm.product_category)      AS product_category,
  COALESCE(nm.block,                 bm.block)                 AS price_block,
  COALESCE(nm.section_group,         bm.section_group)         AS price_section_group,
  COALESCE(nm.level,                 bm.level)                 AS price_level,
  bm.lot_no                                                    AS price_lot_no,
  COALESCE(nm.size_description,      bm.size_description)      AS size_description,
  COALESCE(nm.as_need_price,         bm.as_need_price)         AS as_need_price,
  COALESCE(nm.pre_need_price,        bm.pre_need_price)        AS pre_need_price,
  COALESCE(nm.trust_account_facility,bm.trust_account_facility)AS trust_account_facility,
  bm.backwall_cost                                             AS backwall_cost,
  COALESCE(nm.total_pre_need_price,  bm.total_pre_need_price)  AS total_pre_need_price,
  COALESCE(nm.point_value,           bm.point_value)           AS point_value,
  COALESCE(nm.wef_date,              bm.wef_date)              AS wef_date,
  COALESCE(nm.notes,                 bm.notes)                 AS notes,
  CASE WHEN nm.id IS NOT NULL THEN 1 ELSE bm.match_priority END AS match_priority

FROM parsed p

-- ── Columbarium match ─────────────────────────────────────────────────────────
-- Matches on block + section (within section_group) + level
-- When multiple price lists exist for same section/level, pick most recent wef_date
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code        = p.site
    AND ppl.block            = p.zone_block
    AND ppl.product_category = 'Columbarium'
    AND ('/' || ppl.section_group || '/') LIKE ('%/' || p.niche_section || '/%')
    AND ppl.level = p.niche_level
  ORDER BY ppl.wef_date DESC
  LIMIT 1
) nm ON true

-- ── Burial plot match ─────────────────────────────────────────────────────────
-- Matches on product_name = zone, then lot_no range check
LEFT JOIN LATERAL (
  SELECT
    ppl.*,
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code    = p.site
    AND ppl.product_name = p.zone
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
  ORDER BY lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC
  LIMIT 1
) bm ON true;


-- ── Quick validation query ────────────────────────────────────────────────────
-- Run this after creating the view to confirm OV6 niches are matching:
--
-- SELECT lot_code, niche_section, niche_level, price_list_id,
--        price_section_group, price_level, as_need_price
-- FROM product_availability_with_price
-- WHERE zone = 'OV6-GF'
-- LIMIT 20;
