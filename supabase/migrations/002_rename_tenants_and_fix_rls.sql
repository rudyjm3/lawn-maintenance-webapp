-- Fix RLS on tenants: FOR ALL with only a USING clause creates an implicit
-- WITH CHECK that blocks INSERT when auth_tenant_id() returns NULL (no users
-- row yet during onboarding). Split into explicit per-command policies.
DROP POLICY "own_tenant"  ON tenants;
DROP POLICY "own_insert"  ON tenants;

CREATE POLICY "own_select" ON tenants
  FOR SELECT USING (id = auth_tenant_id());

CREATE POLICY "own_update" ON tenants
  FOR UPDATE USING (id = auth_tenant_id())
             WITH CHECK (id = auth_tenant_id());

CREATE POLICY "own_delete" ON tenants
  FOR DELETE USING (id = auth_tenant_id());

-- Any authenticated user can create their first business row during onboarding.
CREATE POLICY "own_insert" ON tenants
  FOR INSERT WITH CHECK (true);

-- Rename the table to something more meaningful for a lawn-care product.
ALTER TABLE tenants RENAME TO businesses;
