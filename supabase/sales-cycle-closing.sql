-- SALES CYCLE CLOSING DATE — admin-set cutoff date per month period, since
-- the company sometimes extends the closing date past calendar month-end.
-- One row per period ("YYYY-MM"); admin can update it anytime, including
-- mid-month extensions.
CREATE TABLE IF NOT EXISTS sales_cycle_closing (
  period text PRIMARY KEY,
  closing_date date NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON TABLE sales_cycle_closing TO service_role;
