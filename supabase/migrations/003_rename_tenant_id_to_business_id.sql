-- Rename tenant_id -> business_id on every table that holds it.
-- The "businesses" table itself is unchanged (its PK is "id").

ALTER TABLE activity_logs RENAME COLUMN tenant_id TO business_id;
ALTER TABLE clients RENAME COLUMN tenant_id TO business_id;
ALTER TABLE communications RENAME COLUMN tenant_id TO business_id;
ALTER TABLE crew_members RENAME COLUMN tenant_id TO business_id;
ALTER TABLE crews RENAME COLUMN tenant_id TO business_id;
ALTER TABLE estimate_items RENAME COLUMN tenant_id TO business_id;
ALTER TABLE estimates RENAME COLUMN tenant_id TO business_id;
ALTER TABLE invoice_items RENAME COLUMN tenant_id TO business_id;
ALTER TABLE invoices RENAME COLUMN tenant_id TO business_id;
ALTER TABLE jobs RENAME COLUMN tenant_id TO business_id;
ALTER TABLE leads RENAME COLUMN tenant_id TO business_id;
ALTER TABLE payments RENAME COLUMN tenant_id TO business_id;
ALTER TABLE properties RENAME COLUMN tenant_id TO business_id;
ALTER TABLE property_photos RENAME COLUMN tenant_id TO business_id;
ALTER TABLE property_services RENAME COLUMN tenant_id TO business_id;
ALTER TABLE recurrence_rules RENAME COLUMN tenant_id TO business_id;
ALTER TABLE route_stops RENAME COLUMN tenant_id TO business_id;
ALTER TABLE routes RENAME COLUMN tenant_id TO business_id;
ALTER TABLE schedule_exceptions RENAME COLUMN tenant_id TO business_id;
ALTER TABLE service_types RENAME COLUMN tenant_id TO business_id;
ALTER TABLE service_zones RENAME COLUMN tenant_id TO business_id;
ALTER TABLE time_logs RENAME COLUMN tenant_id TO business_id;
ALTER TABLE users RENAME COLUMN tenant_id TO business_id;
ALTER TABLE vehicles RENAME COLUMN tenant_id TO business_id;
ALTER TABLE weather_alerts RENAME COLUMN tenant_id TO business_id;

-- Rename helper indexes (if they exist).
ALTER INDEX IF EXISTS idx_clients_tenant_id RENAME TO idx_clients_business_id;
ALTER INDEX IF EXISTS idx_properties_tenant_id RENAME TO idx_properties_business_id;
ALTER INDEX IF EXISTS idx_jobs_tenant_id RENAME TO idx_jobs_business_id;
ALTER INDEX IF EXISTS idx_service_types_tenant_id RENAME TO idx_service_types_business_id;
ALTER INDEX IF EXISTS idx_property_services_tenant_id RENAME TO idx_property_services_business_id;
ALTER INDEX IF EXISTS idx_users_tenant_id RENAME TO idx_users_business_id;

-- Drop policies before dropping the old helper. Policies created in earlier
-- migrations depend on auth_tenant_id(), so dropping the helper first can fail.
DROP POLICY IF EXISTS "own_select" ON businesses;
DROP POLICY IF EXISTS "own_update" ON businesses;
DROP POLICY IF EXISTS "own_delete" ON businesses;
DROP POLICY IF EXISTS "own_insert" ON businesses;

DROP POLICY IF EXISTS "tenant_isolation" ON users;
DROP POLICY IF EXISTS "tenant_isolation_upd" ON users;
DROP POLICY IF EXISTS "tenant_isolation_del" ON users;
DROP POLICY IF EXISTS "own_insert" ON users;

DROP POLICY IF EXISTS "tenant_isolation" ON activity_logs;
DROP POLICY IF EXISTS "tenant_isolation" ON clients;
DROP POLICY IF EXISTS "tenant_isolation" ON communications;
DROP POLICY IF EXISTS "tenant_isolation" ON crew_members;
DROP POLICY IF EXISTS "tenant_isolation" ON crews;
DROP POLICY IF EXISTS "tenant_isolation" ON estimate_items;
DROP POLICY IF EXISTS "tenant_isolation" ON estimates;
DROP POLICY IF EXISTS "tenant_isolation" ON invoice_items;
DROP POLICY IF EXISTS "tenant_isolation" ON invoices;
DROP POLICY IF EXISTS "tenant_isolation" ON jobs;
DROP POLICY IF EXISTS "tenant_isolation" ON leads;
DROP POLICY IF EXISTS "tenant_isolation" ON payments;
DROP POLICY IF EXISTS "tenant_isolation" ON properties;
DROP POLICY IF EXISTS "tenant_isolation" ON property_photos;
DROP POLICY IF EXISTS "tenant_isolation" ON property_services;
DROP POLICY IF EXISTS "tenant_isolation" ON recurrence_rules;
DROP POLICY IF EXISTS "tenant_isolation" ON route_stops;
DROP POLICY IF EXISTS "tenant_isolation" ON routes;
DROP POLICY IF EXISTS "tenant_isolation" ON schedule_exceptions;
DROP POLICY IF EXISTS "tenant_isolation" ON service_types;
DROP POLICY IF EXISTS "tenant_isolation" ON service_zones;
DROP POLICY IF EXISTS "tenant_isolation" ON time_logs;
DROP POLICY IF EXISTS "tenant_isolation" ON vehicles;
DROP POLICY IF EXISTS "tenant_isolation" ON weather_alerts;

-- Drop the old RLS helper and recreate under the new name.
DROP FUNCTION IF EXISTS auth_tenant_id();

CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT business_id
  FROM users
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Recreate RLS policies using business_id/auth_business_id().
CREATE POLICY "own_select" ON businesses
  FOR SELECT USING (id = auth_business_id());

CREATE POLICY "own_update" ON businesses
  FOR UPDATE USING (id = auth_business_id())
  WITH CHECK (id = auth_business_id());

CREATE POLICY "own_delete" ON businesses
  FOR DELETE USING (id = auth_business_id());

CREATE POLICY "own_insert" ON businesses
  FOR INSERT WITH CHECK (true);

CREATE POLICY "business_isolation" ON users
  FOR SELECT USING (business_id = auth_business_id());

CREATE POLICY "business_isolation_upd" ON users
  FOR UPDATE USING (business_id = auth_business_id())
  WITH CHECK (business_id = auth_business_id());

CREATE POLICY "business_isolation_del" ON users
  FOR DELETE USING (business_id = auth_business_id());

CREATE POLICY "own_insert" ON users
  FOR INSERT WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY "business_isolation" ON activity_logs
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON clients
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON communications
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON crew_members
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON crews
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON estimate_items
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON estimates
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON invoice_items
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON invoices
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON jobs
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON leads
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON payments
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON properties
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON property_photos
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON property_services
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON recurrence_rules
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON route_stops
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON routes
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON schedule_exceptions
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON service_types
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON service_zones
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON time_logs
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON vehicles
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
CREATE POLICY "business_isolation" ON weather_alerts
  FOR ALL USING (business_id = auth_business_id()) WITH CHECK (business_id = auth_business_id());
