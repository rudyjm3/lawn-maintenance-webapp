-- Add Stripe payment fields to invoices table
ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS stripe_payment_link        text,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   text,
  ADD COLUMN IF NOT EXISTS notes                      text;

-- Index for webhook lookups by payment intent
CREATE INDEX IF NOT EXISTS invoices_stripe_payment_intent_id_idx
  ON invoices (stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;
