ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS pricing_sqft_per_min             NUMERIC  DEFAULT 400   NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_complexity_easy_mult     NUMERIC  DEFAULT 0.8   NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_complexity_normal_mult   NUMERIC  DEFAULT 1.0   NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_complexity_difficult_mult NUMERIC DEFAULT 1.35  NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_edge_add_min             INTEGER  DEFAULT 7     NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_blow_add_min             INTEGER  DEFAULT 5     NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_default_crew_rate        NUMERIC  DEFAULT 90    NOT NULL,
  ADD COLUMN IF NOT EXISTS pricing_range_pct                INTEGER  DEFAULT 10    NOT NULL;
