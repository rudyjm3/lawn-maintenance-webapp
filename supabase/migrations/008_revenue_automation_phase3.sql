-- Phase 3 revenue automation additions

DO $$ BEGIN
  CREATE TYPE autopay_mode AS ENUM ('invoice_due_date');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE autopay_status AS ENUM ('idle', 'succeeded', 'failed');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE invoice_reminder_type AS ENUM ('due_minus_3', 'due_day', 'overdue_plus_3', 'overdue_plus_7', 'overdue_notice');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS client_billing_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  autopay_enabled boolean NOT NULL DEFAULT false,
  autopay_mode autopay_mode NOT NULL DEFAULT 'invoice_due_date',
  stripe_customer_id text,
  stripe_default_payment_method_id text,
  stripe_default_payment_method_brand text,
  stripe_default_payment_method_last4 text,
  reminder_days_before integer[] NOT NULL DEFAULT '{3}',
  reminder_days_after integer[] NOT NULL DEFAULT '{3,7}',
  next_billing_run_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (business_id, client_id)
);

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS auto_generated boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_generation_batch_date date,
  ADD COLUMN IF NOT EXISTS autopay_attempted_at timestamptz,
  ADD COLUMN IF NOT EXISTS autopay_status autopay_status NOT NULL DEFAULT 'idle';

CREATE TABLE IF NOT EXISTS invoice_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id uuid NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  reminder_type invoice_reminder_type NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_id, reminder_type)
);

CREATE INDEX IF NOT EXISTS client_billing_settings_business_client_idx
  ON client_billing_settings (business_id, client_id);

CREATE INDEX IF NOT EXISTS client_billing_settings_autopay_idx
  ON client_billing_settings (business_id, autopay_enabled);

CREATE INDEX IF NOT EXISTS invoice_reminders_business_invoice_idx
  ON invoice_reminders (business_id, invoice_id);

ALTER TABLE client_billing_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoice_reminders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "business_isolation" ON client_billing_settings;
CREATE POLICY "business_isolation" ON client_billing_settings
  FOR ALL USING (business_id = auth_business_id());

DROP POLICY IF EXISTS "business_isolation" ON invoice_reminders;
CREATE POLICY "business_isolation" ON invoice_reminders
  FOR ALL USING (business_id = auth_business_id());

DROP TRIGGER IF EXISTS set_updated_at ON client_billing_settings;
CREATE TRIGGER set_updated_at BEFORE UPDATE ON client_billing_settings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
