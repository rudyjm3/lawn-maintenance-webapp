-- Push notification subscriptions
-- Stores Web Push API subscription objects per user/device.

CREATE TABLE push_subscriptions (
  id           uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
  business_id  uuid NOT NULL REFERENCES tenants (id) ON DELETE CASCADE,
  auth_user_id uuid NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,
  role         text NOT NULL DEFAULT 'owner',  -- 'owner' | 'crew'
  endpoint     text NOT NULL,
  p256dh       text NOT NULL,
  auth_key     text NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (endpoint)
);

CREATE INDEX push_subscriptions_business_id_idx ON push_subscriptions (business_id);
CREATE INDEX push_subscriptions_auth_user_id_idx ON push_subscriptions (auth_user_id);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_subscriptions" ON push_subscriptions
  FOR ALL USING (auth_user_id = auth.uid());
