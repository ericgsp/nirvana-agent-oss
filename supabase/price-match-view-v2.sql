-- ============================================================
-- product_availability_with_price — v3 (site-isolated paths)
--
-- Every matching path is hard-scoped to a single site_code.
-- No general/shared paths — each site has its own named block.
--
-- Path layout:
--   smg_niche    Semenyih-NMG  Niche (3/4-part lot codes)
--   smg_burial   Semenyih-NMG  Burial Plot (letter+digit lot codes)
--   smg_ebl      Semenyih-NMG  EBL
--   smg_pedestal Semenyih-NMG  Pedestal + NV Seed + misc product_name=zone
--
--   snmp_pedestal Semenyih-NMP Pedestal (3-part, floor+level from unit)
--   snmp_niche    Semenyih-NMP Niche + Pet Niche (3/4-part lot codes)
--   snmp_burial   Semenyih-NMP Burial Plot
--
--   klg_niche    Klang         Niche (block = full zone name)
--   klg_burial   Klang         Burial + Burial Plot + Package Plot
--   klg_pedestal Klang         Pedestal (product_name = zone)
--
--   nckl_niche   Nckl          Niche (block = zone, section + level)
--   nckl_ebl     Nckl          EBL (level = niche_section)
--   nckl_pedestal Nckl         Pedestal (product_name = zone)
--
--   n3_niche     Nirvana 3     Niche
--   nlp          Nirvana Life Planning  NLP
--
--   shah_niche   Shah Alam     Niche
--   shah_burial  Shah Alam     Burial + Urn Burial (section_group range)
--   shah_pedestal Shah Alam    Pedestal
--
--   ijok_burial  Ijok          Burial Plot (section_group uses ~ range separator)
--   ijok_niche   Ijok          Niche (block + section_group / level)
--
--   melaka_burial Melaka        Burial Plot (lot_no encodes section e.g. FA(8~198))
-- ============================================================

DROP MATERIALIZED VIEW IF EXISTS product_availability_with_price CASCADE;

CREATE MATERIALIZED VIEW product_availability_with_price AS
WITH parsed AS (
  SELECT
    pa.*,

    -- ── 3 or 4-part lot codes (columbarium / EBL / NMP pedestal) ─────────────
    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) IN (3, 4)
      THEN split_part(pa.lot_code, '-', 1)
    END AS niche_section,

    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 3
      THEN COALESCE(NULLIF(ltrim(split_part(pa.lot_code, '-', 2), '0'), ''), split_part(pa.lot_code, '-', 2))
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 4
      THEN COALESCE(NULLIF(ltrim(split_part(pa.lot_code, '-', 3), '0'), ''), split_part(pa.lot_code, '-', 3))
    END AS niche_level,

    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 3
      THEN COALESCE(NULLIF(ltrim(split_part(pa.lot_code, '-', 3), '0'), ''), split_part(pa.lot_code, '-', 3))
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 4
      THEN COALESCE(NULLIF(ltrim(split_part(pa.lot_code, '-', 4), '0'), ''), split_part(pa.lot_code, '-', 4))
    END AS niche_lot_num,

    -- ── zone_block: strip floor suffix from zone for block lookup ─────────────
    CASE
      WHEN pa.zone ~ '-(GF|\d+F)$'
      THEN split_part(pa.zone, '-', 1)
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) IN (3, 4)
      THEN pa.zone
    END AS zone_block,

    -- ── Burial plot: letter-prefix + digit lot codes (no 3+ parts) ───────────
    CASE
      WHEN pa.lot_code ~ '^[A-Za-z]+\d'
        AND array_length(string_to_array(pa.lot_code, '-'), 1) < 3
      THEN upper(regexp_replace(pa.lot_code, '^([A-Za-z]+).*', '\1'))
    END AS lot_section,

    CASE
      WHEN pa.lot_code ~ '^[A-Za-z]+\d'
        AND array_length(string_to_array(pa.lot_code, '-'), 1) < 3
      THEN (regexp_replace(pa.lot_code, '^[A-Za-z]+(\d+).*', '\1'))::integer
    END AS lot_num,

    -- ── Pedestal: exactly 2 hyphen-separated parts (e.g. 15-08 → level '15') ─
    CASE
      WHEN array_length(string_to_array(pa.lot_code, '-'), 1) = 2
      THEN COALESCE(NULLIF(ltrim(split_part(pa.lot_code, '-', 1), '0'), ''), split_part(pa.lot_code, '-', 1))
    END AS ped_level

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

  -- ── Price list match: first non-null across all site paths ───────────────────
  COALESCE(
    smg_niche.id, smg_burial.id, smg_ebl.id, smg_pedestal.id,
    snmp_pedestal.id, snmp_niche.id, snmp_burial.id, snmp_pet.id,
    klg_niche.id, klg_burial.id, klg_pedestal.id,
    nckl_niche.id, nckl_ebl.id, nckl_pedestal.id,
    n3_niche.id,
    nlp.id,
    shah_niche.id, shah_burial.id, shah_pedestal.id,
    ijok_burial.id, ijok_niche.id,
    melaka_burial.id
  ) AS price_list_id,

  COALESCE(
    smg_niche.product_name, smg_burial.product_name, smg_ebl.product_name, smg_pedestal.product_name,
    snmp_pedestal.product_name, snmp_niche.product_name, snmp_burial.product_name, snmp_pet.product_name,
    klg_niche.product_name, klg_burial.product_name, klg_pedestal.product_name,
    nckl_niche.product_name, nckl_ebl.product_name, nckl_pedestal.product_name,
    n3_niche.product_name,
    nlp.product_name,
    shah_niche.product_name, shah_burial.product_name, shah_pedestal.product_name,
    ijok_burial.product_name, ijok_niche.product_name,
    melaka_burial.product_name
  ) AS product_name,

  COALESCE(
    smg_niche.product_category, smg_burial.product_category, smg_ebl.product_category, smg_pedestal.product_category,
    snmp_pedestal.product_category, snmp_niche.product_category, snmp_burial.product_category, snmp_pet.product_category,
    klg_niche.product_category, klg_burial.product_category, klg_pedestal.product_category,
    nckl_niche.product_category, nckl_ebl.product_category, nckl_pedestal.product_category,
    n3_niche.product_category,
    nlp.product_category,
    shah_niche.product_category, shah_burial.product_category, shah_pedestal.product_category,
    ijok_burial.product_category, ijok_niche.product_category,
    melaka_burial.product_category
  ) AS product_category,

  COALESCE(
    smg_niche.block, smg_burial.block, smg_ebl.block, smg_pedestal.block,
    snmp_pedestal.block, snmp_niche.block, snmp_burial.block, snmp_pet.block,
    klg_niche.block, klg_burial.block, klg_pedestal.block,
    nckl_niche.block, nckl_ebl.block, nckl_pedestal.block,
    n3_niche.block,
    nlp.block,
    shah_niche.block, shah_burial.block, shah_pedestal.block,
    ijok_burial.block, ijok_niche.block,
    melaka_burial.block
  ) AS price_block,

  COALESCE(
    smg_niche.section_group, smg_burial.section_group, smg_ebl.section_group, smg_pedestal.section_group,
    snmp_pedestal.section_group, snmp_niche.section_group, snmp_burial.section_group, snmp_pet.section_group,
    klg_niche.section_group, klg_burial.section_group, klg_pedestal.section_group,
    nckl_niche.section_group, nckl_ebl.section_group, nckl_pedestal.section_group,
    n3_niche.section_group,
    nlp.section_group,
    shah_niche.section_group, shah_burial.section_group, shah_pedestal.section_group,
    ijok_burial.section_group, ijok_niche.section_group,
    melaka_burial.section_group
  ) AS price_section_group,

  COALESCE(
    smg_niche.level, smg_burial.level, smg_ebl.level, smg_pedestal.level,
    snmp_pedestal.level, snmp_niche.level, snmp_burial.level, snmp_pet.level,
    klg_niche.level, klg_burial.level, klg_pedestal.level,
    nckl_niche.level, nckl_ebl.level, nckl_pedestal.level,
    n3_niche.level,
    nlp.level,
    shah_niche.level, shah_burial.level,
    COALESCE(shah_pedestal.level, CASE WHEN shah_pedestal.id IS NOT NULL THEN p.niche_level END),
    ijok_burial.level, ijok_niche.level,
    melaka_burial.level
  ) AS price_level,

  -- lot_no only relevant for niche and burial paths
  COALESCE(
    smg_niche.lot_no, smg_burial.lot_no,
    snmp_niche.lot_no, snmp_burial.lot_no, snmp_pet.lot_no,
    klg_burial.lot_no,
    nckl_niche.lot_no,
    n3_niche.lot_no,
    shah_burial.lot_no,
    ijok_burial.lot_no,
    melaka_burial.lot_no
  ) AS price_lot_no,

  COALESCE(
    smg_niche.size_description, smg_burial.size_description, smg_ebl.size_description, smg_pedestal.size_description,
    snmp_pedestal.size_description, snmp_niche.size_description, snmp_burial.size_description, snmp_pet.size_description,
    klg_niche.size_description, klg_burial.size_description, klg_pedestal.size_description,
    nckl_niche.size_description, nckl_ebl.size_description, nckl_pedestal.size_description,
    n3_niche.size_description,
    nlp.size_description,
    shah_niche.size_description, shah_burial.size_description, shah_pedestal.size_description,
    ijok_burial.size_description, ijok_niche.size_description,
    melaka_burial.size_description
  ) AS size_description,

  COALESCE(
    smg_niche.as_need_price, smg_burial.as_need_price, smg_ebl.as_need_price, smg_pedestal.as_need_price,
    snmp_pedestal.as_need_price, snmp_niche.as_need_price, snmp_burial.as_need_price, snmp_pet.as_need_price,
    klg_niche.as_need_price, klg_burial.as_need_price, klg_pedestal.as_need_price,
    nckl_niche.as_need_price, nckl_ebl.as_need_price, nckl_pedestal.as_need_price,
    n3_niche.as_need_price,
    nlp.as_need_price,
    shah_niche.as_need_price, shah_burial.as_need_price, shah_pedestal.as_need_price,
    ijok_burial.as_need_price, ijok_niche.as_need_price,
    melaka_burial.as_need_price
  ) AS as_need_price,

  COALESCE(
    smg_niche.pre_need_price, smg_burial.pre_need_price, smg_ebl.pre_need_price, smg_pedestal.pre_need_price,
    snmp_pedestal.pre_need_price, snmp_niche.pre_need_price, snmp_burial.pre_need_price, snmp_pet.pre_need_price,
    klg_niche.pre_need_price, klg_burial.pre_need_price, klg_pedestal.pre_need_price,
    nckl_niche.pre_need_price, nckl_ebl.pre_need_price, nckl_pedestal.pre_need_price,
    n3_niche.pre_need_price,
    nlp.pre_need_price,
    shah_niche.pre_need_price, shah_burial.pre_need_price, shah_pedestal.pre_need_price,
    ijok_burial.pre_need_price, ijok_niche.pre_need_price,
    melaka_burial.pre_need_price
  ) AS pre_need_price,

  COALESCE(
    smg_niche.total_pre_need_price, smg_burial.total_pre_need_price, smg_ebl.total_pre_need_price, smg_pedestal.total_pre_need_price,
    snmp_pedestal.total_pre_need_price, snmp_niche.total_pre_need_price, snmp_burial.total_pre_need_price, snmp_pet.total_pre_need_price,
    klg_niche.total_pre_need_price, klg_burial.total_pre_need_price, klg_pedestal.total_pre_need_price,
    nckl_niche.total_pre_need_price, nckl_ebl.total_pre_need_price, nckl_pedestal.total_pre_need_price,
    n3_niche.total_pre_need_price,
    nlp.total_pre_need_price,
    shah_niche.total_pre_need_price, shah_burial.total_pre_need_price, shah_pedestal.total_pre_need_price,
    ijok_burial.total_pre_need_price, ijok_niche.total_pre_need_price,
    melaka_burial.total_pre_need_price
  ) AS total_pre_need_price,

  COALESCE(
    smg_niche.trust_account_facility, smg_burial.trust_account_facility, smg_ebl.trust_account_facility, smg_pedestal.trust_account_facility,
    snmp_pedestal.trust_account_facility, snmp_niche.trust_account_facility, snmp_burial.trust_account_facility, snmp_pet.trust_account_facility,
    klg_niche.trust_account_facility, klg_burial.trust_account_facility, klg_pedestal.trust_account_facility,
    nckl_niche.trust_account_facility, nckl_ebl.trust_account_facility, nckl_pedestal.trust_account_facility,
    n3_niche.trust_account_facility,
    nlp.trust_account_facility,
    shah_niche.trust_account_facility, shah_burial.trust_account_facility, shah_pedestal.trust_account_facility,
    ijok_burial.trust_account_facility, ijok_niche.trust_account_facility,
    melaka_burial.trust_account_facility
  ) AS trust_account_facility,

  -- backwall_cost: burial paths only
  COALESCE(
    smg_burial.backwall_cost,
    snmp_burial.backwall_cost,
    klg_burial.backwall_cost,
    shah_burial.backwall_cost,
    ijok_burial.backwall_cost,
    melaka_burial.backwall_cost
  ) AS backwall_cost,

  COALESCE(
    smg_niche.point_value, smg_burial.point_value, smg_ebl.point_value, smg_pedestal.point_value,
    snmp_pedestal.point_value, snmp_niche.point_value, snmp_burial.point_value, snmp_pet.point_value,
    klg_niche.point_value, klg_burial.point_value, klg_pedestal.point_value,
    nckl_niche.point_value, nckl_ebl.point_value, nckl_pedestal.point_value,
    n3_niche.point_value,
    nlp.point_value,
    shah_niche.point_value, shah_burial.point_value, shah_pedestal.point_value,
    ijok_burial.point_value, ijok_niche.point_value,
    melaka_burial.point_value
  ) AS point_value,

  COALESCE(
    smg_niche.wef_date, smg_burial.wef_date, smg_ebl.wef_date, smg_pedestal.wef_date,
    snmp_pedestal.wef_date, snmp_niche.wef_date, snmp_burial.wef_date, snmp_pet.wef_date,
    klg_niche.wef_date, klg_burial.wef_date, klg_pedestal.wef_date,
    nckl_niche.wef_date, nckl_ebl.wef_date, nckl_pedestal.wef_date,
    n3_niche.wef_date,
    nlp.wef_date,
    shah_niche.wef_date, shah_burial.wef_date, shah_pedestal.wef_date,
    ijok_burial.wef_date, ijok_niche.wef_date,
    melaka_burial.wef_date
  ) AS wef_date,

  COALESCE(
    smg_niche.notes, smg_burial.notes, smg_ebl.notes, smg_pedestal.notes,
    snmp_pedestal.notes, snmp_niche.notes, snmp_burial.notes, snmp_pet.notes,
    klg_niche.notes, klg_burial.notes, klg_pedestal.notes,
    nckl_niche.notes, nckl_ebl.notes, nckl_pedestal.notes,
    n3_niche.notes,
    nlp.notes,
    shah_niche.notes, shah_burial.notes, shah_pedestal.notes,
    ijok_burial.notes, ijok_niche.notes,
    melaka_burial.notes
  ) AS notes,

  CASE
    WHEN smg_niche.id    IS NOT NULL THEN 1
    WHEN smg_burial.id   IS NOT NULL THEN smg_burial.match_priority
    WHEN smg_ebl.id      IS NOT NULL THEN 3
    WHEN smg_pedestal.id IS NOT NULL THEN 4
    WHEN snmp_pedestal.id IS NOT NULL THEN 5
    WHEN snmp_niche.id   IS NOT NULL THEN 6
    WHEN snmp_burial.id  IS NOT NULL THEN 7
    WHEN snmp_pet.id     IS NOT NULL THEN 8
    WHEN klg_niche.id    IS NOT NULL THEN 9
    WHEN klg_burial.id   IS NOT NULL THEN klg_burial.match_priority + 9
    WHEN klg_pedestal.id IS NOT NULL THEN 11
    WHEN nckl_niche.id   IS NOT NULL THEN 12
    WHEN nckl_ebl.id     IS NOT NULL THEN 13
    WHEN nckl_pedestal.id IS NOT NULL THEN 14
    WHEN n3_niche.id     IS NOT NULL THEN 15
    WHEN nlp.id          IS NOT NULL THEN 16
    WHEN shah_niche.id   IS NOT NULL THEN 17
    WHEN shah_burial.id  IS NOT NULL THEN shah_burial.match_priority + 17
    WHEN shah_pedestal.id IS NOT NULL THEN 19
    WHEN ijok_burial.id  IS NOT NULL THEN ijok_burial.match_priority + 19
    WHEN ijok_niche.id   IS NOT NULL THEN 21
    WHEN melaka_burial.id IS NOT NULL THEN melaka_burial.match_priority + 21
  END AS match_priority,

  CASE
    WHEN smg_niche.id IS NOT NULL THEN
      CASE
        WHEN left(p.niche_section, 2) = 'TD' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'D'  THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S'  THEN 'Single'
      END
    WHEN smg_burial.id   IS NOT NULL THEN smg_burial.lot_type
    WHEN snmp_niche.id   IS NOT NULL THEN
      CASE
        WHEN left(p.niche_section, 1) = 'D' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S' THEN 'Single'
      END
    WHEN klg_niche.id    IS NOT NULL THEN
      CASE
        WHEN klg_niche.level = '1M'      THEN 'Maisonette'
        WHEN left(p.niche_section, 1) = 'D' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S' THEN 'Single'
      END
    WHEN klg_burial.id   IS NOT NULL THEN klg_burial.lot_type
    WHEN nckl_niche.id IS NOT NULL THEN
      CASE
        WHEN nckl_niche.level = '1M'         THEN 'Maisonette'
        WHEN left(p.niche_section, 2) = 'TD' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'D'  THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S'  THEN 'Single'
      END
    WHEN n3_niche.id IS NOT NULL THEN
      CASE
        WHEN left(p.niche_section, 2) = 'TD' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'D'  THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S'  THEN 'Single'
      END
    WHEN shah_burial.id IS NOT NULL THEN shah_burial.lot_type
    WHEN ijok_burial.id IS NOT NULL THEN
      CASE
        WHEN left(p.lot_section, 1) = 'D' THEN 'Double'
        WHEN left(p.lot_section, 1) = 'S' THEN 'Single'
        WHEN left(p.lot_section, 1) = 'F' THEN 'Family'
        WHEN left(p.lot_section, 1) = 'R' THEN 'Royal'
      END
    WHEN ijok_niche.id  IS NOT NULL THEN
      CASE
        WHEN left(p.niche_section, 1) = 'D' THEN 'Double'
        WHEN left(p.niche_section, 1) = 'S' THEN 'Single'
      END
    WHEN melaka_burial.id IS NOT NULL THEN melaka_burial.lot_type
  END AS lot_type

FROM parsed p

-- ════════════════════════════════════════════════════════════════════════════════
-- SEMENYIH-NMG PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── smg_niche: Semenyih-NMG columbarium niches ───────────────────────────────
-- 3/4-part lot codes. Match block + section_group + level + optional lot_no.
-- Zones: EPHESIANS, ES, OV3-*, OV5, OV6-*, JLD-*, SSL, PHILIPPIANS, Ji Le Dian, etc.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Semenyih-NMG'
    AND (ppl.block = p.zone_block OR ppl.block = p.zone)
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.niche_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.niche_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.niche_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.niche_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
    AND (
      ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
    AND (
      ppl.lot_no IS NULL
      OR (p.niche_lot_num IS NOT NULL AND (',' || ppl.lot_no || ',') LIKE ('%,' || p.niche_lot_num || ',%'))
    )
  ORDER BY
    (ppl.lot_no IS NOT NULL AND p.niche_lot_num IS NOT NULL) DESC,
    (SELECT COALESCE(NULLIF(regexp_replace(split_part(tok.token, '-', 1), '[^0-9]', '', 'g'), '')::int, 0)
     FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
     WHERE tok.token LIKE '%-%'
       AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1') = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
       AND lower(p.niche_section) BETWEEN lower(split_part(tok.token, '-', 1)) AND lower(split_part(tok.token, '-', 2))
     ORDER BY COALESCE(NULLIF(regexp_replace(split_part(tok.token, '-', 1), '[^0-9]', '', 'g'), '')::int, 0) DESC
     LIMIT 1
    ) DESC NULLS LAST,
    (ppl.block = p.zone) DESC,
    ppl.wef_date DESC
  LIMIT 1
) smg_niche ON true

-- ── smg_burial: Semenyih-NMG burial plots ────────────────────────────────────
-- Letter+digit lot codes (e.g. FA108, DAE88). product_name = zone.
-- section_group discriminates lot type (Family, Single, Double, Royal, etc.)
LEFT JOIN LATERAL (
  SELECT
    ppl.*,
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE smg_niche.id IS NULL
    AND p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Semenyih-NMG'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.lot_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.lot_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.lot_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.lot_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.lot_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.lot_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
  ORDER BY
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC,
    (ppl.section_group IS NOT NULL) DESC
  LIMIT 1
) smg_burial ON true

-- ── smg_ebl: Semenyih-NMG EBL ────────────────────────────────────────────────
-- 3-part lot code; lot code part 1 = level code (AA, GA, CA, etc.)
-- Price list matches on level = niche_section.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE smg_niche.id  IS NULL
    AND smg_burial.id IS NULL
    AND p.niche_section IS NOT NULL
    AND ppl.site_code        = p.site
    AND p.site               = 'Semenyih-NMG'
    AND ppl.product_category = 'EBL'
    AND ppl.level            = p.niche_section
  ORDER BY ppl.wef_date DESC
  LIMIT 1
) smg_ebl ON true

-- ── smg_pedestal: Semenyih-NMG pedestals, NV Seed, and misc zones ────────────
-- Covers DZW-A/B/D, Oriental Villa, OV6-1F-AT, Shan Shen Dian, NV Seed 1-6, etc.
-- Match on product_name = zone. Level from ped_level (2-part) or niche_level (3-part).
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE smg_niche.id  IS NULL
    AND smg_burial.id IS NULL
    AND smg_ebl.id    IS NULL
    AND ppl.site_code = p.site
    AND p.site        = 'Semenyih-NMG'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.level IS NULL
      OR ppl.level = p.niche_level
      OR ppl.level = p.ped_level
      OR (',' || ppl.level || ',') LIKE ('%,' || COALESCE(p.niche_level, p.ped_level) || ',%')
    )
  ORDER BY
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) smg_pedestal ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- SEMENYIH-NMP PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── snmp_pedestal: Semenyih-NMP pedestals ────────────────────────────────────
-- Lot code: LF-L-107 → floor=LF (part 1 = niche_section), position=L (part 2), unit=107 (part 3).
-- Price level = first digit of unit number (e.g. unit 107 → level '1').
-- Price list section_group = floor (LF/UF); level = price tier (1-8).
-- Checked BEFORE snmp_niche because both have 3-part lot codes —
-- discriminated by product_category in price list.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND ppl.site_code        = p.site
    AND p.site               = 'Semenyih-NMP'
    AND ppl.product_category = 'Pedestal'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.section_group IS NULL
      OR ppl.section_group = p.niche_section
    )
    AND (
      ppl.level IS NULL
      OR ppl.level = left(p.niche_lot_num, 1)
    )
  ORDER BY
    (ppl.section_group IS NOT NULL) DESC,
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) snmp_pedestal ON true

-- ── snmp_niche: Semenyih-NMP columbarium niches and pet niches ───────────────
-- Covers Chinese Dynasty Columbarium, MC1, MC2, PET-H, PET-J, etc.
-- Standard 3/4-part lot code niche matching: block + section + level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE snmp_pedestal.id IS NULL
    AND p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Semenyih-NMP'
    AND ppl.product_category IN ('Niche', 'Pet Niche')
    AND (ppl.block = p.zone_block OR ppl.block = p.zone)
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.niche_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.niche_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.niche_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.niche_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
    AND (
      ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
    AND (
      ppl.lot_no IS NULL
      OR (p.niche_lot_num IS NOT NULL AND (',' || ppl.lot_no || ',') LIKE ('%,' || p.niche_lot_num || ',%'))
    )
  ORDER BY
    (ppl.lot_no IS NOT NULL AND p.niche_lot_num IS NOT NULL) DESC,
    (ppl.block = p.zone) DESC,
    ppl.wef_date DESC
  LIMIT 1
) snmp_niche ON true

-- ── snmp_burial: Semenyih-NMP burial plot ────────────────────────────────────
-- Covers IMPERIAL. Letter+digit lot codes; product_name = zone.
LEFT JOIN LATERAL (
  SELECT
    ppl.*,
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE snmp_pedestal.id IS NULL
    AND snmp_niche.id    IS NULL
    AND p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Semenyih-NMP'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.lot_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.lot_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.lot_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.lot_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.lot_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.lot_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
  ORDER BY
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC,
    (ppl.section_group IS NOT NULL) DESC
  LIMIT 1
) snmp_burial ON true


-- ── snmp_pet: Semenyih-NMP pet niches ────────────────────────────────────────
-- Zones: PET-H, PET-J. 2-part lot codes (e.g. 01-18) → ped_level set, niche_section NULL.
-- Match on product_name = zone + level from ped_level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE snmp_pedestal.id IS NULL
    AND snmp_niche.id    IS NULL
    AND snmp_burial.id   IS NULL
    AND p.ped_level IS NOT NULL
    AND ppl.site_code        = p.site
    AND p.site               = 'Semenyih-NMP'
    AND ppl.product_category = 'Pet Niche'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.level IS NULL
      OR ppl.level = p.ped_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.ped_level || ',%')
    )
  ORDER BY (ppl.level IS NOT NULL) DESC, ppl.wef_date DESC
  LIMIT 1
) snmp_pet ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- KLANG PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── klg_niche: Klang columbarium niches ──────────────────────────────────────
-- Zones: BK-A-LG1-HD-S1, BK-A-LG1-HD-S2, BK-A-LG1-HB-*, BK-A-LG1-HG, GS, STUPA.
-- Price list uses block = full zone name (e.g. block='BK-A-LG1-HD-S1').
-- Section group formats handled:
--   D2/D3/D3A/...              slash-delimited list
--   D7 (18~38/118~138)         section name + parenthetical lot-number ranges
--   S1 to S17                  text range (covers S1-S17 including S3A, S13A)
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Klang'
    AND (ppl.block = p.zone OR p.zone LIKE (ppl.block || '-%'))
    AND (
      ppl.section_group IS NULL
      -- Slash-delimited list: strip parentheticals first (e.g. 'D7 (18~38/...)' → 'D7')
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/')
         LIKE ('%/' || lower(p.niche_section) || '/%')
      -- Text range: 'S1 to S17' — check same letter prefix and numeric part in bounds
      OR (
        ppl.section_group LIKE '% to %'
        AND left(lower(p.niche_section), 1) = left(lower(trim(ppl.section_group)), 1)
        AND NULLIF(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '') IS NOT NULL
        AND (regexp_replace(p.niche_section, '[^0-9]', '', 'g'))::int
            BETWEEN (regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'))::int
                AND (regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'))::int
      )
    )
    AND (
      ppl.level IS NULL
      OR ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
  ORDER BY
    -- Prefer the row whose parenthetical lot-number range matches niche_lot_num
    -- (e.g. 'D7 (18~38/118~138)' vs 'D7 (68~108)' — pick by actual lot number)
    CASE
      WHEN ppl.section_group ~ '\([0-9]'
        AND p.niche_lot_num IS NOT NULL
        AND NULLIF(regexp_replace(p.niche_lot_num, '[^0-9]', '', 'g'), '') IS NOT NULL
      THEN (
        SELECT bool_or(
          (split_part(r, '~', 1))::int
            <= (regexp_replace(p.niche_lot_num, '[^0-9]', '', 'g'))::int
          AND (regexp_replace(p.niche_lot_num, '[^0-9]', '', 'g'))::int
            <= (split_part(r, '~', 2))::int
        )
        FROM unnest(
          string_to_array(
            regexp_replace(ppl.section_group, '^[^(]*\(([^)]*)\).*$', '\1'),
            '/'
          )
        ) AS r
        WHERE r ~ '^\d+~\d+$'
      )
      ELSE TRUE
    END DESC NULLS LAST,
    (ppl.section_group IS NOT NULL) DESC,
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) klg_niche ON true

-- ── klg_burial: Klang burial, burial plot, and package plot ──────────────────
-- Zones: D, Dynasty, E, F, G, H, J, K, L, M, N, P, Q, R, GRACE 1/2,
--        MAJESTIC 1/2/3, ROYAL 1/2/3, Q (Burial Plot), R (Package Plot).
-- Letter+digit lot codes; product_name = zone.
LEFT JOIN LATERAL (
  SELECT
    ppl.*,
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE klg_niche.id IS NULL
    AND p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Klang'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.lot_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.lot_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.lot_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.lot_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.lot_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.lot_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
  ORDER BY
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC,
    (ppl.section_group IS NOT NULL) DESC
  LIMIT 1
) klg_burial ON true

-- ── klg_pedestal: Klang pedestals ────────────────────────────────────────────
-- Zones: BK-A-MH-AT-A/B/D/E/F/G. 2-part lot codes (01-08).
-- Price list level = comma-separated level group (e.g. "1,2,3,3A,5,6,6A").
-- Match ped_level against level using comma-contains, same as NCKL/Shah Alam.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE klg_niche.id  IS NULL
    AND klg_burial.id IS NULL
    AND p.ped_level IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Klang'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.level IS NULL
      OR ppl.level = p.ped_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.ped_level || ',%')
    )
  ORDER BY
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) klg_pedestal ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- NCKL PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── nckl_niche: Nckl columbarium niches ──────────────────────────────────────
-- Zones: A1-S1 through D5-S16, SKY-S8/S18/S38 etc.
-- Price list uses block = full zone name. Level stored in ppl.level.
-- A2-S1 lots may have lot_type=NULL (Super Double/Super Single use different lot_type aliases —
-- see NCKL Lot Type Aliases memory).
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Nckl'
    AND (ppl.block = p.zone_block OR ppl.block = p.zone)
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.niche_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.niche_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.niche_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.niche_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
    AND (
      ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
    AND (
      ppl.lot_no IS NULL
      OR (p.niche_lot_num IS NOT NULL AND (',' || ppl.lot_no || ',') LIKE ('%,' || p.niche_lot_num || ',%'))
    )
  ORDER BY
    (ppl.lot_no IS NOT NULL AND p.niche_lot_num IS NOT NULL) DESC,
    (ppl.block = p.zone) DESC,
    ppl.wef_date DESC
  LIMIT 1
) nckl_niche ON true

-- ── nckl_ebl: Nckl EBL ───────────────────────────────────────────────────────
-- Zones: WFA, WFB, WFD (product_availability.zone).
-- Price list EBL-WFA/WFB/WFD are PRICING TIERS, not physical zones:
--   EBL-WFA (AA/AB/AD sections) = RM2888, EBL-WFB (GA/GB/GD) = RM2488, EBL-WFD (CA/CB/CD) = RM1988.
-- Each physical zone contains one section from each tier (e.g. WFA has AA+CA+GA).
-- Match by level = niche_section — no zone filter, intentional cross-zone tier matching.
-- section_group must be NULL in product_price_list so lot click does not extract a wrong level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE nckl_niche.id IS NULL
    AND p.niche_section IS NOT NULL
    AND ppl.site_code        = p.site
    AND p.site               = 'Nckl'
    AND ppl.product_category = 'EBL'
    AND ppl.level            = p.niche_section
  ORDER BY ppl.wef_date DESC
  LIMIT 1
) nckl_ebl ON true

-- ── nckl_pedestal: Nckl pedestals ────────────────────────────────────────────
-- Zones: SSD-A, SSD-J, SSD-Q.
-- Match on product_name = zone + level from ped_level (2-part) or niche_level (3-part).
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE nckl_niche.id IS NULL
    AND nckl_ebl.id   IS NULL
    AND ppl.site_code = p.site
    AND p.site        = 'Nckl'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.level IS NULL
      OR ppl.level = p.niche_level
      OR ppl.level = p.ped_level
      OR (',' || ppl.level || ',') LIKE ('%,' || COALESCE(p.niche_level, p.ped_level) || ',%')
    )
  ORDER BY
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) nckl_pedestal ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- NIRVANA 3 PATH
-- ════════════════════════════════════════════════════════════════════════════════

-- ── n3_niche: Nirvana 3 niches ───────────────────────────────────────────────
-- Zones: N7-S3, ZN-N7-S1, ZV-V7-S2. 3/4-part lot codes.
-- Standard niche matching: block + section + level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Nirvana 3'
    AND (ppl.block = p.zone_block OR ppl.block = p.zone)
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.niche_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.niche_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.niche_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.niche_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
    AND (
      ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
    AND (
      ppl.lot_no IS NULL
      OR (p.niche_lot_num IS NOT NULL AND (',' || ppl.lot_no || ',') LIKE ('%,' || p.niche_lot_num || ',%'))
    )
  ORDER BY
    (ppl.lot_no IS NOT NULL AND p.niche_lot_num IS NOT NULL) DESC,
    (ppl.block = p.zone) DESC,
    ppl.wef_date DESC
  LIMIT 1
) n3_niche ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- NIRVANA LIFE PLANNING PATH
-- ════════════════════════════════════════════════════════════════════════════════

-- ── nlp: Nirvana Life Planning NLP ───────────────────────────────────────────
-- Zone: NLP. Match on product_name = zone only.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE ppl.site_code = p.site
    AND p.site = 'Nirvana Life Planning'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
  ORDER BY ppl.wef_date DESC
  LIMIT 1
) nlp ON true


-- ════════════════════════════════════════════════════════════════════════════════
-- SHAH ALAM PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── shah_niche: Shah Alam niches ─────────────────────────────────────────────
-- Zones: Heritage Court, Ming Palace, Ming Palace Columbarium, Perpetual Garden, Song Villa.
-- Standard niche matching: block + section + level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE p.niche_section IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Shah Alam'
    AND (
      ppl.block = p.zone_block
      OR ppl.block = p.zone
      -- HC2/HC3/HC3A zones share the same price list as HC1
      OR (p.zone LIKE 'HC%' AND ppl.block = 'HC1')
    )
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.niche_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.niche_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.niche_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.niche_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.niche_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.niche_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
    AND (
      ppl.level = p.niche_level
      OR (',' || ppl.level || ',') LIKE ('%,' || p.niche_level || ',%')
    )
    AND (
      ppl.lot_no IS NULL
      OR (p.niche_lot_num IS NOT NULL AND (',' || ppl.lot_no || ',') LIKE ('%,' || p.niche_lot_num || ',%'))
    )
  ORDER BY
    (ppl.lot_no IS NOT NULL AND p.niche_lot_num IS NOT NULL) DESC,
    (ppl.block = p.zone) DESC,
    ppl.wef_date DESC
  LIMIT 1
) shah_niche ON true

-- ── shah_burial: Shah Alam burial and urn burial ──────────────────────────────
-- Zones: A, E, F (Burial); D (Urn Burial).
-- Letter+digit lot codes (FC198). section_group range (e.g. "FB to FE") picks
-- correct lot type row when a zone has multiple price rows.
LEFT JOIN LATERAL (
  SELECT
    ppl.*,
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE shah_niche.id IS NULL
    AND p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Shah Alam'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
    AND (
      ppl.section_group IS NULL
      OR lower('/' || regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g') || '/') LIKE ('%/' || lower(p.lot_section) || '/%')
      OR lower(split_part(ppl.section_group, ' ', 1)) = lower(p.lot_section)
      OR (
        ppl.section_group LIKE '% to %'
        AND regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^A-Za-z]', '', 'g')
            = regexp_replace(p.lot_section, '[^A-Za-z]', '', 'g')
        AND nullif(regexp_replace(p.lot_section, '[^0-9]', '', 'g'), '')::int
            BETWEEN nullif(regexp_replace(split_part(ppl.section_group, ' to ', 1), '[^0-9]', '', 'g'), '')::int
                AND nullif(regexp_replace(split_part(ppl.section_group, ' to ', 2), '[^0-9]', '', 'g'), '')::int
      )
      OR EXISTS (
        SELECT 1
        FROM unnest(string_to_array(regexp_replace(ppl.section_group, '\s*\([^)]*\)', '', 'g'), '/')) AS tok(token)
        WHERE tok.token LIKE '%-%'
          AND regexp_replace(split_part(tok.token, '-', 1), '^([A-Za-z]*).*', '\1')
              = regexp_replace(p.lot_section, '^([A-Za-z]*).*', '\1')
          AND lower(p.lot_section)
              BETWEEN lower(split_part(tok.token, '-', 1))
                  AND lower(split_part(tok.token, '-', 2))
      )
    )
  ORDER BY
    lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC,
    (ppl.section_group IS NOT NULL) DESC
  LIMIT 1
) shah_burial ON true

-- ── shah_pedestal: Shah Alam pedestals ───────────────────────────────────────
-- Zones: Ming Palace, Tang Villa.
-- Match on product_name = zone + level from ped_level or niche_level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE shah_niche.id  IS NULL
    AND shah_burial.id IS NULL
    AND ppl.site_code = p.site
    AND p.site = 'Shah Alam'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND (
      ppl.level IS NULL
      OR ppl.level = p.niche_level
      OR ppl.level = p.ped_level
      OR (',' || ppl.level || ',') LIKE ('%,' || COALESCE(p.niche_level, p.ped_level) || ',%')
    )
  ORDER BY
    (ppl.level IS NOT NULL) DESC,
    ppl.wef_date DESC
  LIMIT 1
) shah_pedestal ON true

-- ════════════════════════════════════════════════════════════════════════════════
-- IJOK PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── ijok_burial: Ijok burial plots ───────────────────────────────────────────
-- section_group uses ~ as range separator (e.g. DA~DC, DJ~DP); single = exact (e.g. RA, SB).
-- lot_no formats: NULL (catch-all, priority 99), exact '338' (1), list '368 & 798' or '8/18/28' (2),
--   range '378~788' or '8A~128' — numeric parts extracted via regexp (3).
LEFT JOIN LATERAL (
  SELECT *
  FROM (
    SELECT
      ppl.*,
      CASE
        WHEN ppl.lot_no IS NULL THEN 99
        WHEN ppl.lot_no ~ '^\d+$'
          AND p.lot_num = ppl.lot_no::integer THEN 1
        WHEN ppl.lot_no LIKE '%&%'
          AND p.lot_num = ANY(
            ARRAY(SELECT trim(x)::integer
                  FROM unnest(string_to_array(ppl.lot_no, '&')) x
                  WHERE trim(x) ~ '^\d+$')
          ) THEN 2
        WHEN ppl.lot_no LIKE '%/%'
          AND p.lot_num = ANY(
            ARRAY(SELECT trim(x)::integer
                  FROM unnest(string_to_array(ppl.lot_no, '/')) x
                  WHERE trim(x) ~ '^\d+$')
          ) THEN 2
        WHEN ppl.lot_no LIKE '%~%'
          AND NULLIF(regexp_replace(split_part(ppl.lot_no, '~', 1), '[^0-9]', '', 'g'), '') IS NOT NULL
          AND p.lot_num BETWEEN
              regexp_replace(split_part(ppl.lot_no, '~', 1), '[^0-9]', '', 'g')::integer
          AND regexp_replace(split_part(ppl.lot_no, '~', 2), '[^0-9]', '', 'g')::integer
          THEN 3
      END AS match_priority
    FROM product_price_list ppl
    WHERE p.lot_section IS NOT NULL
      AND p.lot_num     IS NOT NULL
      AND ppl.site_code = p.site
      AND p.site = 'Ijok'
      AND ppl.product_name = p.zone
      AND (
        -- exact single-section (no ~)
        (ppl.section_group NOT LIKE '%~%' AND upper(ppl.section_group) = p.lot_section)
        OR
        -- range: lot_section BETWEEN start AND end of DA~DC style
        (ppl.section_group LIKE '%~%'
         AND p.lot_section BETWEEN upper(split_part(ppl.section_group, '~', 1))
                                 AND upper(split_part(ppl.section_group, '~', 2)))
      )
  ) scored
  WHERE scored.match_priority IS NOT NULL
  ORDER BY scored.match_priority ASC, scored.wef_date DESC
  LIMIT 1
) ijok_burial ON true

-- ── ijok_niche: Ijok niches (Mansion 1-GF, Suite 1) ─────────────────────────
-- 3-part lot codes (e.g. D2-03-108). block = zone_block, section in section_group (/),
-- level = niche_level.
LEFT JOIN LATERAL (
  SELECT ppl.*
  FROM product_price_list ppl
  WHERE ijok_burial.id IS NULL
    AND p.niche_section IS NOT NULL
    AND p.niche_level   IS NOT NULL
    AND p.zone_block    IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site = 'Ijok'
    AND ppl.block = p.zone_block
    AND ppl.level = p.niche_level
    AND ('/' || ppl.section_group || '/') LIKE ('%/' || p.niche_section || '/%')
  ORDER BY ppl.wef_date DESC
  LIMIT 1
) ijok_niche ON true

-- ════════════════════════════════════════════════════════════════════════════════
-- MELAKA PATHS
-- ════════════════════════════════════════════════════════════════════════════════

-- ── melaka_burial: Melaka burial plots ───────────────────────────────────────
-- lot_no encodes section + lot range e.g. 'FA(8~198)', 'FA(208)'.
-- section_group IS NULL — section matching is handled inside lot_match_priority.
LEFT JOIN LATERAL (
  SELECT ppl.*, lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) AS match_priority
  FROM product_price_list ppl
  WHERE p.lot_section IS NOT NULL
    AND p.lot_num     IS NOT NULL
    AND ppl.site_code = p.site
    AND p.site        = 'Melaka'
    AND LOWER(ppl.product_name) = LOWER(p.zone)
    AND lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) > 0
  ORDER BY lot_match_priority(ppl.lot_no, p.lot_section, p.lot_num) ASC, ppl.wef_date DESC
  LIMIT 1
) melaka_burial ON true;

-- Always re-grant after recreating — DROP CASCADE resets permissions
GRANT SELECT ON product_availability_with_price TO authenticated, anon, service_role;
