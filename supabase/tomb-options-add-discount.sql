-- Add discount column to tomb_options
-- Run in Supabase SQL Editor

ALTER TABLE tomb_options ADD COLUMN IF NOT EXISTS discount numeric NOT NULL DEFAULT 0;

-- Set RM 3,000 discount for Melaka Zone B (both BG and G654)
UPDATE tomb_options
SET discount = 3000
WHERE site_code = 'Melaka' AND product_name = 'B';

-- Verify
SELECT site_code, product_name, tomb_code, tomb_name, price, discount, price - discount AS net_price
FROM tomb_options
WHERE site_code = 'Melaka';
