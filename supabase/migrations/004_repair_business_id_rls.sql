-- Forward-only repair for databases that already applied the tenant_id ->
-- business_id rename before RLS policies were rebuilt.

DO $$
DECLARE
  item text[];
BEGIN
  FOREACH item SLICE 1 IN ARRAY ARRAY[
    ARRAY['activity_logs', 'activity_logs_tenant_id_fkey', 'activity_logs_business_id_fkey'],
    ARRAY['clients', 'clients_tenant_id_fkey', 'clients_business_id_fkey'],
    ARRAY['communications', 'communications_tenant_id_fkey', 'communications_business_id_fkey'],
    ARRAY['crew_members', 'crew_members_tenant_id_fkey', 'crew_members_business_id_fkey'],
    ARRAY['crews', 'crews_tenant_id_fkey', 'crews_business_id_fkey'],
    ARRAY['estimate_items', 'estimate_items_tenant_id_fkey', 'estimate_items_business_id_fkey'],
    ARRAY['estimates', 'estimates_tenant_id_fkey', 'estimates_business_id_fkey'],
    ARRAY['invoice_items', 'invoice_items_tenant_id_fkey', 'invoice_items_business_id_fkey'],
    ARRAY['invoices', 'invoices_tenant_id_fkey', 'invoices_business_id_fkey'],
    ARRAY['jobs', 'jobs_tenant_id_fkey', 'jobs_business_id_fkey'],
    ARRAY['leads', 'leads_tenant_id_fkey', 'leads_business_id_fkey'],
    ARRAY['payments', 'payments_tenant_id_fkey', 'payments_business_id_fkey'],
    ARRAY['properties', 'properties_tenant_id_fkey', 'properties_business_id_fkey'],
    ARRAY['property_photos', 'property_photos_tenant_id_fkey', 'property_photos_business_id_fkey'],
    ARRAY['property_services', 'property_services_tenant_id_fkey', 'property_services_business_id_fkey'],
    ARRAY['recurrence_rules', 'recurrence_rules_tenant_id_fkey', 'recurrence_rules_business_id_fkey'],
    ARRAY['route_stops', 'route_stops_tenant_id_fkey', 'route_stops_business_id_fkey'],
    ARRAY['routes', 'routes_tenant_id_fkey', 'routes_business_id_fkey'],
    ARRAY['schedule_exceptions', 'schedule_exceptions_tenant_id_fkey', 'schedule_exceptions_business_id_fkey'],
    ARRAY['service_types', 'service_types_tenant_id_fkey', 'service_types_business_id_fkey'],
    ARRAY['service_zones', 'service_zones_tenant_id_fkey', 'service_zones_business_id_fkey'],
    ARRAY['time_logs', 'time_logs_tenant_id_fkey', 'time_logs_business_id_fkey'],
    ARRAY['users', 'users_tenant_id_fkey', 'users_business_id_fkey'],
    ARRAY['vehicles', 'vehicles_tenant_id_fkey', 'vehicles_business_id_fkey'],
    ARRAY['weather_alerts', 'weather_alerts_tenant_id_fkey', 'weather_alerts_business_id_fkey']
  ]
  LOOP
    IF EXISTS (
      SELECT 1
      FROM pg_constraint c
      JOIN pg_class t ON t.oid = c.conrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
      WHERE n.nspname = 'public'
        AND t.relname = item[1]
        AND c.conname = item[2]
    ) THEN
      EXECUTE format(
        'ALTER TABLE public.%I RENAME CONSTRAINT %I TO %I',
        item[1],
        item[2],
        item[3]
      );
    END IF;
  END LOOP;
END $$;

DROP POLICY IF EXISTS "own_select" ON businesses;
DROP POLICY IF EXISTS "own_update" ON businesses;
DROP POLICY IF EXISTS "own_delete" ON businesses;
DROP POLICY IF EXISTS "own_insert" ON businesses;

DROP POLICY IF EXISTS "tenant_isolation" ON users;
DROP POLICY IF EXISTS "tenant_isolation_upd" ON users;
DROP POLICY IF EXISTS "tenant_isolation_del" ON users;
DROP POLICY IF EXISTS "business_isolation" ON users;
DROP POLICY IF EXISTS "business_isolation_upd" ON users;
DROP POLICY IF EXISTS "business_isolation_del" ON users;
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

DROP POLICY IF EXISTS "business_isolation" ON activity_logs;
DROP POLICY IF EXISTS "business_isolation" ON clients;
DROP POLICY IF EXISTS "business_isolation" ON communications;
DROP POLICY IF EXISTS "business_isolation" ON crew_members;
DROP POLICY IF EXISTS "business_isolation" ON crews;
DROP POLICY IF EXISTS "business_isolation" ON estimate_items;
DROP POLICY IF EXISTS "business_isolation" ON estimates;
DROP POLICY IF EXISTS "business_isolation" ON invoice_items;
DROP POLICY IF EXISTS "business_isolation" ON invoices;
DROP POLICY IF EXISTS "business_isolation" ON jobs;
DROP POLICY IF EXISTS "business_isolation" ON leads;
DROP POLICY IF EXISTS "business_isolation" ON payments;
DROP POLICY IF EXISTS "business_isolation" ON properties;
DROP POLICY IF EXISTS "business_isolation" ON property_photos;
DROP POLICY IF EXISTS "business_isolation" ON property_services;
DROP POLICY IF EXISTS "business_isolation" ON recurrence_rules;
DROP POLICY IF EXISTS "business_isolation" ON route_stops;
DROP POLICY IF EXISTS "business_isolation" ON routes;
DROP POLICY IF EXISTS "business_isolation" ON schedule_exceptions;
DROP POLICY IF EXISTS "business_isolation" ON service_types;
DROP POLICY IF EXISTS "business_isolation" ON service_zones;
DROP POLICY IF EXISTS "business_isolation" ON time_logs;
DROP POLICY IF EXISTS "business_isolation" ON vehicles;
DROP POLICY IF EXISTS "business_isolation" ON weather_alerts;

DROP FUNCTION IF EXISTS auth_tenant_id() CASCADE;

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
