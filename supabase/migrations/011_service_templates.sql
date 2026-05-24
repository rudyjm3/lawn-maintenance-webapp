-- Service templates: pre-built recurring service patterns an owner can apply
-- to a property during onboarding or job creation, reducing manual setup.

CREATE TABLE service_templates (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id          uuid NOT NULL REFERENCES businesses (id) ON DELETE CASCADE,
  name                 text NOT NULL,
  service_type_id      uuid REFERENCES service_types (id) ON DELETE SET NULL,
  frequency            text NOT NULL DEFAULT 'weekly',  -- weekly|biweekly|monthly|custom
  -- Seasonal bounds (null = year-round)
  season_start_month   integer CHECK (season_start_month BETWEEN 1 AND 12),
  season_end_month     integer CHECK (season_end_month BETWEEN 1 AND 12),
  default_duration_min integer,
  default_price        numeric(10, 2),
  instructions         text,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX ON service_templates (business_id);

ALTER TABLE service_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tenant_isolation" ON service_templates
  FOR ALL USING (business_id = auth_business_id());

-- Seed built-in templates for every new business via a trigger so that
-- new businesses get a sensible starting set automatically.
CREATE OR REPLACE FUNCTION seed_service_templates()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  INSERT INTO service_templates (business_id, name, frequency, season_start_month, season_end_month, default_duration_min, instructions)
  VALUES
    (NEW.id, 'Weekly Mow (May – Oct)',      'weekly',    5, 10, 45, 'Mow all lawn areas, edge along paths, blow clippings off hard surfaces.'),
    (NEW.id, 'Biweekly Mow (May – Oct)',    'biweekly',  5, 10, 45, 'Mow all lawn areas, edge along paths, blow clippings off hard surfaces.'),
    (NEW.id, 'Spring Cleanup',              'custom',    3,  4, 90, 'Rake winter debris, dethatch if needed, edge beds, apply pre-emergent.'),
    (NEW.id, 'Fall Cleanup',               'custom',   10, 11, 90, 'Leaf removal, final mow, cut back perennials, winterize beds.'),
    (NEW.id, 'Monthly Lawn Treatment',     'monthly',   4, 10, 30, 'Apply seasonal fertilizer or weed treatment per property plan.'),
    (NEW.id, 'Biweekly Trim & Blow',       'biweekly',  4, 10, 30, 'String-trim lawn edges and hard surfaces, blow off driveways and walkways.');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_business_created_seed_templates
  AFTER INSERT ON businesses
  FOR EACH ROW EXECUTE FUNCTION seed_service_templates();
