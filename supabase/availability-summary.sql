-- Step 1: Create the summary table
CREATE TABLE IF NOT EXISTS product_availability_summary (
  site           text        NOT NULL,
  product_type   text        NOT NULL,
  zone           text        NOT NULL,
  total_lots     integer     NOT NULL DEFAULT 0,
  available_lots integer     NOT NULL DEFAULT 0,
  synced_at      timestamptz,
  PRIMARY KEY (site, product_type, zone)
);

-- Step 2: Populate from existing product_availability data
INSERT INTO product_availability_summary (site, product_type, zone, total_lots, available_lots, synced_at)
SELECT
  site,
  product_type,
  zone,
  COUNT(*)                                 AS total_lots,
  COUNT(*) FILTER (WHERE available = true) AS available_lots,
  MAX(synced_at)                           AS synced_at
FROM product_availability
GROUP BY site, product_type, zone
ON CONFLICT (site, product_type, zone) DO UPDATE
  SET total_lots     = EXCLUDED.total_lots,
      available_lots = EXCLUDED.available_lots,
      synced_at      = EXCLUDED.synced_at;

-- Step 3: Remove all unavailable rows from the main table (they are now captured in summary)
DELETE FROM product_availability WHERE available = false;

-- Verify: how many rows remain
SELECT site, COUNT(*) AS rows FROM product_availability GROUP BY site ORDER BY site;
