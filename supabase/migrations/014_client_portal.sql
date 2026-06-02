-- Phase 4: Customer self-service portal

CREATE TABLE IF NOT EXISTS client_portal_accounts (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id  uuid        NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  auth_user_id uuid        NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, client_id)
);

CREATE INDEX IF NOT EXISTS client_portal_accounts_auth_user_idx
  ON client_portal_accounts (auth_user_id);

ALTER TABLE client_portal_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "portal_own_account" ON client_portal_accounts
  FOR SELECT USING (auth_user_id = auth.uid());

-- Helper: returns the client_id for the currently authenticated portal user
CREATE OR REPLACE FUNCTION auth_portal_client_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT client_id
  FROM client_portal_accounts
  WHERE auth_user_id = auth.uid()
  LIMIT 1;
$$;

-- Portal users can read their own client record
CREATE POLICY "portal_client_read" ON clients
  FOR SELECT USING (id = auth_portal_client_id());

-- Portal users can read their own jobs
CREATE POLICY "portal_client_read" ON jobs
  FOR SELECT USING (client_id = auth_portal_client_id());

-- Portal users can read their own invoices
CREATE POLICY "portal_client_read" ON invoices
  FOR SELECT USING (client_id = auth_portal_client_id());

-- Portal users can read invoice items for their invoices
CREATE POLICY "portal_client_read" ON invoice_items
  FOR SELECT USING (
    invoice_id IN (
      SELECT id FROM invoices WHERE client_id = auth_portal_client_id()
    )
  );

-- Portal users can read their own properties
CREATE POLICY "portal_client_read" ON properties
  FOR SELECT USING (client_id = auth_portal_client_id());
