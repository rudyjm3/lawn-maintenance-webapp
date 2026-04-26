-- Rename tenant_id → business_id on every table that holds it.
-- The "businesses" table itself is unchanged (its PK is "id").

ALTER TABLE activity_logs    RENAME COLUMN tenant_id TO business_id;
ALTER TABLE clients          RENAME COLUMN tenant_id TO business_id;
ALTER TABLE communications   RENAME COLUMN tenant_id TO business_id;
ALTER TABLE crew_members     RENAME COLUMN tenant_id TO business_id;
ALTER TABLE crews            RENAME COLUMN tenant_id TO business_id;
ALTER TABLE estimate_items   RENAME COLUMN tenant_id TO business_id;
ALTER TABLE estimates        RENAME COLUMN tenant_id TO business_id;
ALTER TABLE invoice_items    RENAME COLUMN tenant_id TO business_id;
ALTER TABLE invoices         RENAME COLUMN tenant_id TO business_id;
ALTER TABLE jobs             RENAME COLUMN tenant_id TO business_id;
ALTER TABLE leads            RENAME COLUMN tenant_id TO business_id;
ALTER TABLE payments         RENAME COLUMN tenant_id TO business_id;
ALTER TABLE properties       RENAME COLUMN tenant_id TO business_id;
ALTER TABLE property_photos  RENAME COLUMN tenant_id TO business_id;
ALTER TABLE property_services RENAME COLUMN tenant_id TO business_id;
ALTER TABLE recurrence_rules RENAME COLUMN tenant_id TO business_id;
ALTER TABLE route_stops      RENAME COLUMN tenant_id TO business_id;
ALTER TABLE routes           RENAME COLUMN tenant_id TO business_id;
ALTER TABLE schedule_exceptions RENAME COLUMN tenant_id TO business_id;
ALTER TABLE service_types    RENAME COLUMN tenant_id TO business_id;
ALTER TABLE service_zones    RENAME COLUMN tenant_id TO business_id;
ALTER TABLE time_logs        RENAME COLUMN tenant_id TO business_id;
ALTER TABLE users            RENAME COLUMN tenant_id TO business_id;
ALTER TABLE vehicles         RENAME COLUMN tenant_id TO business_id;
ALTER TABLE weather_alerts   RENAME COLUMN tenant_id TO business_id;

-- Rename helper indexes (if they exist)
ALTER INDEX IF EXISTS idx_clients_tenant_id         RENAME TO idx_clients_business_id;
ALTER INDEX IF EXISTS idx_properties_tenant_id      RENAME TO idx_properties_business_id;
ALTER INDEX IF EXISTS idx_jobs_tenant_id            RENAME TO idx_jobs_business_id;
ALTER INDEX IF EXISTS idx_service_types_tenant_id   RENAME TO idx_service_types_business_id;
ALTER INDEX IF EXISTS idx_property_services_tenant_id RENAME TO idx_property_services_business_id;
ALTER INDEX IF EXISTS idx_users_tenant_id           RENAME TO idx_users_business_id;

-- Drop the old RLS helper and recreate under the new name.
-- The function reads users.business_id for the currently authenticated user.
DROP FUNCTION IF EXISTS auth_tenant_id();

CREATE OR REPLACE FUNCTION auth_business_id()
RETURNS uuid
LANGUAGE sql
STABLE
AS $$
  SELECT business_id
  FROM   users
  WHERE  auth_user_id = auth.uid()
  LIMIT  1;
$$;
