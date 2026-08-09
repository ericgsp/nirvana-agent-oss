-- Zone layout snapshots — one row per (site, zone)
-- Generated automatically during product sync from the Nirvana portal HTML export.
-- The layout_html column stores a cleaned, annotated HTML table that mirrors
-- the exact cell positions from the portal (gaps, structure, column groups).

CREATE TABLE IF NOT EXISTS zone_layouts (
  id          uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  site_code   text        NOT NULL,
  zone        text        NOT NULL,
  layout_html text        NOT NULL,
  synced_at   timestamptz DEFAULT now(),
  UNIQUE (site_code, zone)
);

GRANT SELECT ON zone_layouts TO authenticated, anon, service_role;
GRANT INSERT, UPDATE ON zone_layouts TO service_role;
