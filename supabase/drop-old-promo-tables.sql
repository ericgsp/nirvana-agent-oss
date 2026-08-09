-- Drop old promo auto-creation tables (no longer used)
-- Safe to run: these tables belong to the old extraction system

DROP TABLE IF EXISTS promo_parser_rules CASCADE;
DROP TABLE IF EXISTS promo_drafts CASCADE;
DROP TABLE IF EXISTS product_promo_matches CASCADE;
