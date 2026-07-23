# schema.md — Database Schema (Supabase/Postgres, no ORM)

Source: `supabase/migrations/001_initial_schema.sql` → `023_work_schedule_settings.sql` (23 files; **note: two
files both numbered `017`** — `017_pricing_formula_settings.sql` and `017_service_zones_polygon.sql`).
Typed via generated `types/supabase.ts` + hand-written `types/index.ts`.

**Multi-tenancy**: every business-scoped table has `business_id uuid FK→businesses`. RLS policy `business_isolation`
(`USING (business_id = auth_business_id())`) on every such table; `auth_business_id()` is a `SECURITY DEFINER`
SQL function reading `users.business_id` for `auth.uid()`. Most tables indexed on `(business_id, ...)`.

**Enums**: `client_status`, `job_status`, `lead_status`, `frequency_type`, `invoice_status`, `estimate_status`,
`photo_type`, `optimization_status`, `route_stop_status`, `user_role`, `exception_type`, `comm_channel`,
`job_reminder_type` (day_before|completion|review_request), `autopay_mode`, `autopay_status`, `invoice_reminder_type`.

Legend: `FK→table (ACTION)` = ON DELETE action. Optional/module-gated tables marked **[MODULE]**.

## Core tenancy

**businesses** — `id PK` · `business_name text NOT NULL` · `slug text NOT NULL UNIQUE` · `timezone text NOT NULL DEFAULT 'America/Chicago'` · `phone text` · `email text` · `operating_location text` · `operating_lat/lng numeric` · `pricing_sqft_per_min numeric DEFAULT 400 NOT NULL` · `pricing_complexity_{easy,normal,difficult}_mult numeric NOT NULL` · `pricing_edge_add_min int DEFAULT 7 NOT NULL` · `pricing_blow_add_min int DEFAULT 5 NOT NULL` · `pricing_default_crew_rate numeric DEFAULT 90 NOT NULL` · `pricing_range_pct int DEFAULT 10 NOT NULL` · `schedule_start_time/end_time text DEFAULT '08:00'/'17:00'` · `schedule_lunch_start_time text DEFAULT '12:00'` · `schedule_lunch_duration_min int DEFAULT 60` · `created_at/updated_at`. Triggers: `set_updated_at`, `on_business_created_seed_templates` (seeds 6 default `service_templates`).

**users** — `id PK` · `business_id FK→businesses (CASCADE)` · `auth_user_id uuid NOT NULL UNIQUE FK→auth.users (CASCADE)` · `first_name/last_name text NOT NULL DEFAULT ''` · `role user_role NOT NULL DEFAULT 'owner'` · `is_active bool NOT NULL DEFAULT true` · `created_at/updated_at`.

## Clients / properties / services

**clients** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `email text` · `phone text` · `billing_address text` · `status client_status NOT NULL DEFAULT 'active'` · `source text` · `notes text` · `marketing_opt_out bool NOT NULL DEFAULT false` · `created_at/updated_at`.

**properties** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (CASCADE)` · `address text NOT NULL` · `lat/lng float8` · `access_notes text` · `gate_code text` · `pet_notes text` · `lawn_size text` · `is_commercial bool NOT NULL DEFAULT false` · `photo_required bool NOT NULL DEFAULT false` · `zone_id FK→service_zones (SET NULL)` · `created_at/updated_at`.

**service_types** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `default_duration_min int NOT NULL DEFAULT 60` · `default_price numeric(10,2) NOT NULL DEFAULT 0` · `is_recurring bool NOT NULL DEFAULT false` · `is_seasonal bool NOT NULL DEFAULT false` · `default_frequency_type text CHECK IN (weekly,biweekly,monthly,custom)` · `created_at/updated_at`.

**service_templates** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `service_type_id FK→service_types (SET NULL)` · `frequency text NOT NULL DEFAULT 'weekly'` · `season_start_month/season_end_month int CHECK 1-12` · `default_duration_min int` · `default_price numeric(10,2)` · `instructions text` · `is_active bool NOT NULL DEFAULT true` · `created_at`.

**property_services** — `id PK` · `business_id FK→businesses (CASCADE)` · `property_id FK→properties (CASCADE)` · `service_type_id FK→service_types (RESTRICT)` · `custom_price numeric(10,2)` · `duration_min int` · `instructions text` · `is_active bool NOT NULL DEFAULT true` · `created_at/updated_at`.

**recurrence_rules** — `id PK` · `business_id FK→businesses (CASCADE)` · `property_service_id FK→property_services (CASCADE)` · `frequency_type frequency_type NOT NULL` · `interval int NOT NULL DEFAULT 1` · `day_of_week int` (0=Sun..6=Sat) · `start_date date NOT NULL` · `end_date date` · `active_months int[]` (null=all) · `created_at/updated_at`.

**schedule_exceptions** — `id PK` · `business_id FK→businesses (CASCADE)` · `recurrence_rule_id FK→recurrence_rules (CASCADE)` · `original_date date NOT NULL` · `exception_type exception_type NOT NULL` · `new_date date` · `reason text` · `created_at`.

## Jobs / scheduling / routing

**jobs** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (RESTRICT)` · `property_id FK→properties (RESTRICT)` · `property_service_id FK→property_services (SET NULL)` · `service_date date` · `status job_status NOT NULL DEFAULT 'unscheduled'` · `estimated_duration_min int NOT NULL DEFAULT 60` · `actual_duration_min int` · `price numeric(10,2) NOT NULL DEFAULT 0` · `photo_required bool NOT NULL DEFAULT false` · `title text` · `description text` · `review_token uuid DEFAULT gen_random_uuid()` (unique idx) · `review_requested_at timestamptz` · `review_rating smallint CHECK 1-5` · `review_text text` · `review_submitted_at timestamptz` · `created_at/updated_at`.

**crews** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `description text` · `is_active bool NOT NULL DEFAULT true` · `color text` · `created_at/updated_at`.

**crew_members** — `id PK` · `business_id FK→businesses (CASCADE)` · `crew_id FK→crews (CASCADE)` · `user_id FK→users (CASCADE)` · `is_lead bool NOT NULL DEFAULT false` · `created_at` · `UNIQUE(crew_id, user_id)`.

**vehicles** — `id PK` · `business_id FK→businesses (CASCADE)` · `crew_id FK→crews (CASCADE)` · `name text NOT NULL` · `plate text` · `is_active bool NOT NULL DEFAULT true` · `created_at`.

**routes** — `id PK` · `business_id FK→businesses (CASCADE)` · `crew_id FK→crews (RESTRICT)` · `route_date date NOT NULL` · `start_lat/start_lng/end_lat/end_lng float8` · `total_job_min int NOT NULL DEFAULT 0` · `total_drive_min int NOT NULL DEFAULT 0` · `is_locked bool NOT NULL DEFAULT false` · `optimization_status optimization_status NOT NULL DEFAULT 'pending'` · `created_at/updated_at` · `UNIQUE(business_id, crew_id, route_date)`.

**route_stops** — `id PK` · `business_id FK→businesses (CASCADE)` · `route_id FK→routes (CASCADE)` · `job_id FK→jobs (RESTRICT)` · `stop_order int NOT NULL` · `travel_time_min int NOT NULL DEFAULT 0` · `est_arrival/est_finish/actual_arrival/actual_finish timestamptz` · `status route_stop_status NOT NULL DEFAULT 'pending'` · `created_at`.

**service_zones** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `color text NOT NULL DEFAULT '#22c55e'` · `description text` · `polygon_geojson jsonb` · `coordinates jsonb` (ordered `[[lat,lng],...]`) · `created_at`.

## Leads / estimates / invoicing

**leads** — `id PK` · `business_id FK→businesses (CASCADE)` · `name text NOT NULL` · `email text` · `phone text` · `service_address text` · `requested_services jsonb NOT NULL DEFAULT '[]'` · `status lead_status NOT NULL DEFAULT 'new'` · `source text` · `converted_client_id FK→clients (SET NULL)` · `converted_at timestamptz` · `created_at/updated_at`.

**estimates** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (SET NULL)` · `lead_id FK→leads (SET NULL)` · `estimate_number text NOT NULL UNIQUE` (format `EST-0001`) · `status estimate_status NOT NULL DEFAULT 'draft'` · `subtotal/tax/total numeric(10,2) NOT NULL DEFAULT 0` · `valid_until date` · `notes text` · `created_at/updated_at`.

**estimate_items** — `id PK` · `business_id FK→businesses (CASCADE)` · `estimate_id FK→estimates (CASCADE)` · `service_type_id FK→service_types (SET NULL)` · `description text NOT NULL` · `qty numeric(10,2) NOT NULL DEFAULT 1` · `unit_price/total_price numeric(10,2) NOT NULL DEFAULT 0` · `duration_min int` · `created_at`.

**invoices** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (RESTRICT)` · `invoice_number text NOT NULL UNIQUE` (format `INV-0001`) · `status invoice_status NOT NULL DEFAULT 'draft'` · `subtotal/tax/total numeric(10,2) NOT NULL DEFAULT 0` · `due_date date` · `stripe_payment_link text` · `stripe_payment_intent_id text` (indexed where not null) · `notes text` · `auto_generated bool NOT NULL DEFAULT false` · `auto_generation_batch_date date` · `autopay_attempted_at timestamptz` · `autopay_status autopay_status NOT NULL DEFAULT 'idle'` · `created_at/updated_at`.

**invoice_items** — `id PK` · `business_id FK→businesses (CASCADE)` · `invoice_id FK→invoices (CASCADE)` · `job_id FK→jobs (SET NULL)` · `description text NOT NULL` · `qty numeric(10,2) NOT NULL DEFAULT 1` · `unit_price/total_price numeric(10,2) NOT NULL DEFAULT 0` · `created_at`.

**payments** — `id PK` · `business_id FK→businesses (CASCADE)` · `invoice_id FK→invoices (RESTRICT)` · `amount numeric(10,2) NOT NULL` · `method text` · `payment_date date NOT NULL DEFAULT CURRENT_DATE` · `reference text` · `notes text` · `created_at`.

**invoice_reminders** — `id PK` · `business_id FK→businesses (CASCADE)` · `invoice_id FK→invoices (CASCADE)` · `reminder_type invoice_reminder_type NOT NULL` · `sent_at timestamptz NOT NULL DEFAULT now()` · `UNIQUE(invoice_id, reminder_type)` — idempotency lock for reminder cron.

## Misc / logs

**property_photos** — `id PK` · `business_id FK→businesses (CASCADE)` · `property_id FK→properties (CASCADE)` · `job_id FK→jobs (SET NULL)` · `user_id FK→users (SET NULL)` · `photo_url text NOT NULL` · `photo_type photo_type NOT NULL DEFAULT 'reference'` · `caption text` · `created_at`.

**communications** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (SET NULL)` · `job_id FK→jobs (SET NULL)` · `channel comm_channel NOT NULL` · `direction text NOT NULL DEFAULT 'outbound'` · `message text NOT NULL` · `sent_at timestamptz NOT NULL DEFAULT now()`.

**time_logs** — `id PK` · `business_id FK→businesses (CASCADE)` · `job_id FK→jobs (CASCADE)` · `user_id FK→users (RESTRICT)` · `start_time timestamptz NOT NULL` · `end_time timestamptz` · `duration_min int` · `notes text` · `created_at`.

**weather_alerts** — `id PK` · `business_id FK→businesses (CASCADE)` · `alert_date date NOT NULL` · `rain_probability int NOT NULL DEFAULT 0` · `affected_jobs jsonb NOT NULL DEFAULT '[]'` · `resolved bool NOT NULL DEFAULT false` · `created_at`.

**activity_logs** — `id PK` · `business_id FK→businesses (CASCADE)` · `user_id FK→users (SET NULL)` · `entity_type text NOT NULL` · `entity_id uuid` · `action_type text NOT NULL` · `metadata jsonb NOT NULL DEFAULT '{}'` · `created_at`.

**job_reminders** — `id PK` · `business_id FK→businesses (CASCADE)` · `job_id FK→jobs (CASCADE)` · `reminder_type job_reminder_type NOT NULL` (day_before\|completion\|review_request) · `sent_at timestamptz NOT NULL DEFAULT now()` · `UNIQUE(job_id, reminder_type)` — used as atomic idempotency lock via `upsert(..., {onConflict, ignoreDuplicates:true})`.

**campaigns** — `id PK gen_random_uuid()` · `business_id FK→businesses (CASCADE)` · `subject text NOT NULL` · `body text NOT NULL` · `status text NOT NULL DEFAULT 'draft' CHECK IN (draft,sent)` · `recipient_count int NOT NULL DEFAULT 0` · `sent_at timestamptz` · `created_at/updated_at`.

## Module-gated / optional features

**client_portal_accounts** **[MODULE: client self-service portal]** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (CASCADE)` · `auth_user_id uuid NOT NULL UNIQUE FK→auth.users (CASCADE)` · `created_at` · `UNIQUE(business_id, client_id)`. Has `auth_portal_client_id()` RLS helper + `portal_client_read` policies (portal users get SELECT on own `clients`/`jobs`/`invoices`/`invoice_items`/`properties` rows).

**client_billing_settings** **[MODULE: autopay]** — `id PK` · `business_id FK→businesses (CASCADE)` · `client_id FK→clients (CASCADE)` · `autopay_enabled bool NOT NULL DEFAULT false` · `autopay_mode autopay_mode NOT NULL DEFAULT 'invoice_due_date'` · `stripe_customer_id text` · `stripe_default_payment_method_id/brand/last4 text` · `reminder_days_before int[] NOT NULL DEFAULT '{3}'` · `reminder_days_after int[] NOT NULL DEFAULT '{3,7}'` · `next_billing_run_at timestamptz` · `created_at/updated_at` · `UNIQUE(business_id, client_id)`.

**push_subscriptions** **[MODULE: web push notifications]** — `id PK` · `business_id FK→businesses (CASCADE)` · `auth_user_id FK→auth.users (CASCADE)` · `role text NOT NULL DEFAULT 'owner'` (owner\|crew) · `endpoint text NOT NULL UNIQUE` · `p256dh text NOT NULL` · `auth_key text NOT NULL` · `created_at`. RLS: `users_own_subscriptions` (`auth_user_id = auth.uid()`) — **not** business-scoped like other tables.

**reschedule_requests** **[MODULE: weather reschedule flow]** — `id PK` · `business_id FK→businesses (CASCADE)` · `job_id FK→jobs (CASCADE)` · `client_id FK→clients (CASCADE)` · `token uuid NOT NULL UNIQUE DEFAULT uuid_generate_v4()` · `original_date date NOT NULL` · `proposed_date date NOT NULL` · `status text NOT NULL DEFAULT 'pending'` (pending\|confirmed\|alternative_requested) · `client_chosen_date date` · `created_at` · `responded_at timestamptz` · `UNIQUE(job_id, original_date)`.

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate after adding new migrations under `supabase/migrations/`.
