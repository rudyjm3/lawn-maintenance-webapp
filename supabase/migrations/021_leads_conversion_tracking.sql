ALTER TABLE leads
  ADD COLUMN converted_client_id uuid REFERENCES clients (id) ON DELETE SET NULL,
  ADD COLUMN converted_at timestamptz;
