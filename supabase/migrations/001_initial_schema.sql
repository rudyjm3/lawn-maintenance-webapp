-- =============================================================================
-- GreenRoute — Initial Schema
-- Paste this entire file into Supabase Dashboard → SQL Editor and run it.
-- =============================================================================

-- ─── Extensions ───────────────────────────────────────────────────────────────

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── Enum types ───────────────────────────────────────────────────────────────

CREATE TYPE client_status       AS ENUM ('lead', 'active', 'inactive', 'archived');
CREATE TYPE job_status          AS ENUM ('unscheduled', 'scheduled', 'in_progress', 'completed', 'skipped', 'cancelled');
CREATE TYPE lead_status         AS ENUM ('new', 'contacted', 'site_visit', 'estimate_sent', 'won', 'lost');
CREATE TYPE frequency_type      AS ENUM ('weekly', 'biweekly', 'monthly', 'custom');
CREATE TYPE invoice_status      AS ENUM ('draft', 'sent', 'partial', 'paid', 'overdue', 'void');
CREATE TYPE estimate_status     AS ENUM ('draft', 'sent', 'approved', 'rejected', 'expired');
CREATE TYPE photo_type          AS ENUM ('before', 'after', 'reference', 'issue');
CREATE TYPE optimization_status AS ENUM ('pending', 'optimized', 'manual');
CREATE TYPE route_stop_status   AS ENUM ('pending', 'arrived', 'in_progress', 'completed', 'skipped');
CREATE TYPE user_role           AS ENUM ('owner', 'manager', 'crew_lead', 'crew_member');
CREATE TYPE exception_type      AS ENUM ('skip', 'reschedule', 'cancel');
CREATE TYPE comm_channel        AS ENUM ('email', 'sms', 'app');

-- ─── updated_at trigger ───────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- ─── Tables ───────────────────────────────────────────────────────────────────
-- Created in foreign-key dependency order.

-- tenants
CREATE TABLE tenants (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_name text NOT NULL,
  slug          text NOT NULL UNIQUE,
  timezone      text NOT NULL DEFAULT 'America/Chicago',
  phone         text,
  email         text,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- users (profiles — linked to Supabase auth.users)
CREATE TABLE users (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL UNIQUE REFERENCES auth.users (id) ON DELETE CASCADE,
  first_name   text NOT NULL DEFAULT '',
  last_name    text NOT NULL DEFAULT '',
  role         user_role NOT NULL DEFAULT 'owner',
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

-- clients
CREATE TABLE clients (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name            text NOT NULL,
  email           text,
  phone           text,
  billing_address text,
  status          client_status NOT NULL DEFAULT 'active',
  source          text,
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- properties
CREATE TABLE properties (
  id            uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id     uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  client_id     uuid NOT NULL REFERENCES clients (id) ON DELETE CASCADE,
  address       text NOT NULL,
  lat           float8,
  lng           float8,
  access_notes  text,
  gate_code     text,
  pet_notes     text,
  lawn_size     text,
  is_commercial boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- service_types
CREATE TABLE service_types (
  id                   uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id            uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name                 text NOT NULL,
  default_duration_min integer NOT NULL DEFAULT 60,
  default_price        numeric(10, 2) NOT NULL DEFAULT 0,
  is_recurring         boolean NOT NULL DEFAULT false,
  is_seasonal          boolean NOT NULL DEFAULT false,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- property_services (assigns a service type to a property with optional overrides)
CREATE TABLE property_services (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  property_id     uuid NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  service_type_id uuid NOT NULL REFERENCES service_types (id) ON DELETE RESTRICT,
  custom_price    numeric(10, 2),
  duration_min    integer,
  instructions    text,
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- recurrence_rules
CREATE TABLE recurrence_rules (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  property_service_id uuid NOT NULL REFERENCES property_services (id) ON DELETE CASCADE,
  frequency_type      frequency_type NOT NULL,
  interval            integer NOT NULL DEFAULT 1,
  day_of_week         integer,           -- 0=Sun … 6=Sat
  start_date          date NOT NULL,
  end_date            date,
  active_months       integer[],         -- 1–12; null = all months
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- schedule_exceptions
CREATE TABLE schedule_exceptions (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  recurrence_rule_id uuid NOT NULL REFERENCES recurrence_rules (id) ON DELETE CASCADE,
  original_date      date NOT NULL,
  exception_type     exception_type NOT NULL,
  new_date           date,
  reason             text,
  created_at         timestamptz NOT NULL DEFAULT now()
);

-- jobs
CREATE TABLE jobs (
  id                    uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id             uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  client_id             uuid NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  property_id           uuid NOT NULL REFERENCES properties (id) ON DELETE RESTRICT,
  property_service_id   uuid REFERENCES property_services (id) ON DELETE SET NULL,
  service_date          date,
  status                job_status NOT NULL DEFAULT 'unscheduled',
  estimated_duration_min integer NOT NULL DEFAULT 60,
  actual_duration_min   integer,
  price                 numeric(10, 2) NOT NULL DEFAULT 0,
  photo_required        boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- crews
CREATE TABLE crews (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name        text NOT NULL,
  description text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- crew_members
CREATE TABLE crew_members (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  crew_id   uuid NOT NULL REFERENCES crews (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  is_lead   boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (crew_id, user_id)
);

-- vehicles
CREATE TABLE vehicles (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  crew_id   uuid NOT NULL REFERENCES crews (id) ON DELETE CASCADE,
  name      text NOT NULL,
  plate     text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- routes
CREATE TABLE routes (
  id                  uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id           uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  crew_id             uuid NOT NULL REFERENCES crews (id) ON DELETE RESTRICT,
  route_date          date NOT NULL,
  start_lat           float8,
  start_lng           float8,
  end_lat             float8,
  end_lng             float8,
  total_job_min       integer NOT NULL DEFAULT 0,
  total_drive_min     integer NOT NULL DEFAULT 0,
  is_locked           boolean NOT NULL DEFAULT false,
  optimization_status optimization_status NOT NULL DEFAULT 'pending',
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, crew_id, route_date)
);

-- route_stops
CREATE TABLE route_stops (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  route_id        uuid NOT NULL REFERENCES routes (id) ON DELETE CASCADE,
  job_id          uuid NOT NULL REFERENCES jobs (id) ON DELETE RESTRICT,
  stop_order      integer NOT NULL,
  travel_time_min integer NOT NULL DEFAULT 0,
  est_arrival     timestamptz,
  est_finish      timestamptz,
  actual_arrival  timestamptz,
  actual_finish   timestamptz,
  status          route_stop_status NOT NULL DEFAULT 'pending',
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- service_zones
CREATE TABLE service_zones (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name        text NOT NULL,
  color       text NOT NULL DEFAULT '#22c55e',
  description text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- leads
CREATE TABLE leads (
  id                 uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id          uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  name               text NOT NULL,
  email              text,
  phone              text,
  service_address    text,
  requested_services jsonb NOT NULL DEFAULT '[]',
  status             lead_status NOT NULL DEFAULT 'new',
  source             text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- estimates
CREATE TABLE estimates (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  client_id       uuid REFERENCES clients (id) ON DELETE SET NULL,
  lead_id         uuid REFERENCES leads (id) ON DELETE SET NULL,
  estimate_number text NOT NULL UNIQUE,
  status          estimate_status NOT NULL DEFAULT 'draft',
  subtotal        numeric(10, 2) NOT NULL DEFAULT 0,
  tax             numeric(10, 2) NOT NULL DEFAULT 0,
  total           numeric(10, 2) NOT NULL DEFAULT 0,
  valid_until     date,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- estimate_items
CREATE TABLE estimate_items (
  id              uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id       uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  estimate_id     uuid NOT NULL REFERENCES estimates (id) ON DELETE CASCADE,
  service_type_id uuid REFERENCES service_types (id) ON DELETE SET NULL,
  description     text NOT NULL,
  qty             numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price      numeric(10, 2) NOT NULL DEFAULT 0,
  total_price     numeric(10, 2) NOT NULL DEFAULT 0,
  duration_min    integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- invoices
CREATE TABLE invoices (
  id             uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id      uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  client_id      uuid NOT NULL REFERENCES clients (id) ON DELETE RESTRICT,
  invoice_number text NOT NULL UNIQUE,
  status         invoice_status NOT NULL DEFAULT 'draft',
  subtotal       numeric(10, 2) NOT NULL DEFAULT 0,
  tax            numeric(10, 2) NOT NULL DEFAULT 0,
  total          numeric(10, 2) NOT NULL DEFAULT 0,
  due_date       date,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- invoice_items
CREATE TABLE invoice_items (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  invoice_id  uuid NOT NULL REFERENCES invoices (id) ON DELETE CASCADE,
  job_id      uuid REFERENCES jobs (id) ON DELETE SET NULL,
  description text NOT NULL,
  qty         numeric(10, 2) NOT NULL DEFAULT 1,
  unit_price  numeric(10, 2) NOT NULL DEFAULT 0,
  total_price numeric(10, 2) NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- payments
CREATE TABLE payments (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  invoice_id   uuid NOT NULL REFERENCES invoices (id) ON DELETE RESTRICT,
  amount       numeric(10, 2) NOT NULL,
  method       text,
  payment_date date NOT NULL DEFAULT CURRENT_DATE,
  reference    text,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- property_photos
CREATE TABLE property_photos (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  property_id uuid NOT NULL REFERENCES properties (id) ON DELETE CASCADE,
  job_id      uuid REFERENCES jobs (id) ON DELETE SET NULL,
  user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  photo_url   text NOT NULL,
  photo_type  photo_type NOT NULL DEFAULT 'reference',
  caption     text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- communications
CREATE TABLE communications (
  id        uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  client_id uuid REFERENCES clients (id) ON DELETE SET NULL,
  job_id    uuid REFERENCES jobs (id) ON DELETE SET NULL,
  channel   comm_channel NOT NULL,
  direction text NOT NULL DEFAULT 'outbound',  -- 'inbound' | 'outbound'
  message   text NOT NULL,
  sent_at   timestamptz NOT NULL DEFAULT now()
);

-- time_logs
CREATE TABLE time_logs (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id    uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  job_id       uuid NOT NULL REFERENCES jobs (id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
  start_time   timestamptz NOT NULL,
  end_time     timestamptz,
  duration_min integer,
  notes        text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- weather_alerts
CREATE TABLE weather_alerts (
  id               uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id        uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  alert_date       date NOT NULL,
  rain_probability integer NOT NULL DEFAULT 0,
  affected_jobs    jsonb NOT NULL DEFAULT '[]',
  resolved         boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- activity_logs
CREATE TABLE activity_logs (
  id          uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  tenant_id   uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  entity_type text NOT NULL,
  entity_id   uuid,
  action_type text NOT NULL,
  metadata    jsonb NOT NULL DEFAULT '{}',
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ─── updated_at triggers ──────────────────────────────────────────────────────

CREATE TRIGGER set_updated_at BEFORE UPDATE ON tenants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON service_types
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON property_services
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON recurrence_rules
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON routes
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON estimates
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ─── Indexes ──────────────────────────────────────────────────────────────────

-- tenant_id on every table (most queries filter by this)
CREATE INDEX ON users           (tenant_id);
CREATE INDEX ON clients         (tenant_id);
CREATE INDEX ON properties      (tenant_id, client_id);
CREATE INDEX ON service_types   (tenant_id);
CREATE INDEX ON property_services (tenant_id, property_id);
CREATE INDEX ON recurrence_rules  (tenant_id, property_service_id);
CREATE INDEX ON schedule_exceptions (tenant_id, recurrence_rule_id);
CREATE INDEX ON jobs            (tenant_id, service_date, status);
CREATE INDEX ON jobs            (tenant_id, client_id);
CREATE INDEX ON jobs            (tenant_id, property_id);
CREATE INDEX ON crews           (tenant_id);
CREATE INDEX ON crew_members    (tenant_id, crew_id);
CREATE INDEX ON crew_members    (tenant_id, user_id);
CREATE INDEX ON vehicles        (tenant_id, crew_id);
CREATE INDEX ON routes          (tenant_id, route_date);
CREATE INDEX ON routes          (tenant_id, crew_id);
CREATE INDEX ON route_stops     (route_id, stop_order);
CREATE INDEX ON route_stops     (tenant_id, job_id);
CREATE INDEX ON leads           (tenant_id, status);
CREATE INDEX ON estimates       (tenant_id, client_id);
CREATE INDEX ON invoices        (tenant_id, client_id, status);
CREATE INDEX ON payments        (tenant_id, invoice_id);
CREATE INDEX ON property_photos (tenant_id, property_id);
CREATE INDEX ON communications  (tenant_id, client_id);
CREATE INDEX ON time_logs       (tenant_id, job_id);
CREATE INDEX ON activity_logs   (tenant_id, created_at DESC);

-- auth_user_id lookup (used constantly by auth_tenant_id())
CREATE INDEX ON users (auth_user_id);

-- ─── RLS ──────────────────────────────────────────────────────────────────────

-- Helper: returns the tenant_id of the currently authenticated user.
-- SECURITY DEFINER so it can read the users table without recursive RLS.
CREATE OR REPLACE FUNCTION auth_tenant_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT tenant_id FROM public.users WHERE auth_user_id = auth.uid()
$$;

-- Enable RLS on every table
ALTER TABLE tenants           ENABLE ROW LEVEL SECURITY;
ALTER TABLE users             ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties        ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_types     ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE recurrence_rules  ENABLE ROW LEVEL SECURITY;
ALTER TABLE schedule_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs              ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews             ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members      ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE routes            ENABLE ROW LEVEL SECURITY;
ALTER TABLE route_stops       ENABLE ROW LEVEL SECURITY;
ALTER TABLE service_zones     ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads             ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimates         ENABLE ROW LEVEL SECURITY;
ALTER TABLE estimate_items    ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices          ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_photos   ENABLE ROW LEVEL SECURITY;
ALTER TABLE communications    ENABLE ROW LEVEL SECURITY;
ALTER TABLE time_logs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE weather_alerts    ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs     ENABLE ROW LEVEL SECURITY;

-- tenants: each user sees only their own tenant row
CREATE POLICY "own_tenant" ON tenants
  FOR ALL USING (id = auth_tenant_id());

-- users: INSERT policy bypasses auth_tenant_id() so onboarding can create the
-- first user row before the tenant_id is resolvable from the JWT.
-- The INSERT check enforces auth_user_id = auth.uid() instead.
CREATE POLICY "tenant_isolation"      ON users FOR SELECT USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation_upd"  ON users FOR UPDATE USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation_del"  ON users FOR DELETE USING (tenant_id = auth_tenant_id());
CREATE POLICY "own_insert"            ON users FOR INSERT WITH CHECK (auth_user_id = auth.uid());

-- Standard tenant isolation for every other table
CREATE POLICY "tenant_isolation" ON clients           FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON properties        FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON service_types     FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON property_services FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON recurrence_rules  FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON schedule_exceptions FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON jobs              FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON crews             FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON crew_members      FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON vehicles          FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON routes            FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON route_stops       FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON service_zones     FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON leads             FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON estimates         FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON estimate_items    FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON invoices          FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON invoice_items     FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON payments          FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON property_photos   FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON communications    FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON time_logs         FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON weather_alerts    FOR ALL USING (tenant_id = auth_tenant_id());
CREATE POLICY "tenant_isolation" ON activity_logs     FOR ALL USING (tenant_id = auth_tenant_id());

-- tenants INSERT: allow during onboarding (auth user exists but no users row yet)
CREATE POLICY "own_insert" ON tenants
  FOR INSERT WITH CHECK (true);
