# routes.md — API Routes & Server Actions

Mutations happen almost entirely through **Server Actions** (`app/actions/*.ts`), not API routes.
`app/api/**/route.ts` is reserved for: cron jobs, Stripe webhooks, and endpoints that must be plain HTTP
(push subscribe/unsubscribe, public token-based reschedule response, Supabase auth confirm callbacks).

## Cron routes — common pattern
All 6 cron routes: `POST` only, guarded by `Authorization: Bearer ${CRON_SECRET}` (500 if `CRON_SECRET` unset,
401 if mismatched), loop over every row in `businesses`, wrap each business's work in try/catch, return
`{ ...summary, results: [{businessId, ..., error?}] }` — one business's failure doesn't abort the batch.

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/cron/auto-generate-invoices` | CRON_SECRET | Batch-create draft invoices from completed-uninvoiced jobs, grouped by client |
| POST | `/api/cron/generate-jobs` | CRON_SECRET | Generate recurring `jobs` rows 28 days ahead via `generateJobsForBusinessLookahead` (`lib/jobs.ts`) |
| POST | `/api/cron/mark-overdue` | CRON_SECRET | Mark past-due invoices `overdue`, send due/overdue reminders (dedup via `invoice_reminders` unique constraint) |
| POST | `/api/cron/run-autopay` | CRON_SECRET | Stripe off-session `paymentIntents.create` for eligible autopay clients; applies payment via `applyInvoicePayment` |
| POST | `/api/cron/send-appointment-reminders` | CRON_SECRET | Send "day before" reminder emails for tomorrow's jobs; atomic dedup via `job_reminders` upsert (`ignoreDuplicates`) |
| POST | `/api/cron/send-review-requests` | CRON_SECRET | Send review-request emails for jobs completed yesterday, using per-job `review_token` |

## Other API routes

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/api/jobs/[id]/completion-email` | Session (`auth.getUser()`, 401 if none; RLS scopes job so cross-tenant IDs 404) | Send job-completion email, record `communications` row, dedup via `job_reminders` |
| POST | `/api/push/subscribe` | Session required (401) + business membership via `getAuthenticatedBusinessId` (403); role derived server-side from `users.role` | Upsert Web Push subscription (`push_subscriptions`, unique on `endpoint`) |
| POST | `/api/push/unsubscribe` | Session required (401) | Delete caller's push subscription by endpoint |
| POST | `/api/reschedule/respond` | None — public, token-based lookup on `reschedule_requests.token` | Client confirms or requests alternative date for weather reschedule |
| POST | `/api/webhooks/stripe` | Stripe signature (`stripe-signature` header + `STRIPE_WEBHOOK_SECRET`) | Handles `checkout.session.completed`: applies invoice payment (mode `payment`) or stores autopay customer/payment-method (mode `setup`, `purpose=autopay_setup`) |
| GET | `/auth/confirm` | Exchanges `code` or verifies `token_hash`+`type` | Owner/crew auth confirmation; auto-creates `users` row for invited crew (via `user_metadata.business_id`); redirects `/reset-password` for `type=recovery`, else `next` param (default `/onboarding`) |
| GET | `/portal/auth/confirm` | Verifies Supabase OTP (`verifyOtp` via `token_hash`+`type`) | Portal magic-link confirmation; links auth user to `client_portal_accounts` by matching email to a `clients` row; redirects `/portal/dashboard` or `/portal/login?error=invalid_link` |

## Server Actions (`app/actions/*.ts`) — primary mutation layer

Return shape: discriminated union `{success: true; message} | {success: false; message}`. Input validated via `zod .safeParse()` upfront.

| File | Feature area |
|---|---|
| `ai.ts` | Claude-based schedule balancing suggestions (`lib/ai/schedule-balancer.ts`) |
| `auth.ts` | `login`, `signup`, `forgotPassword`, `resetPassword`, `setInitialPassword`, `signOut` |
| `billing-settings.ts` | Client autopay/billing settings (`client_billing_settings`) |
| `campaigns.ts` | Email campaigns (`campaigns` table) |
| `clients.ts` | Client CRUD |
| `communications.ts` | `communications` log entries |
| `crew-invites.ts` | Inviting crew members (auth user creation flow) |
| `crews.ts` | Crew + crew_members CRUD |
| `demo.ts` | Demo/seed data actions |
| `estimates.ts` | Estimate + estimate_items CRUD, send |
| `invoices.ts` | Invoice + invoice_items CRUD, send, batch generation |
| `jobs.ts` | Job CRUD, status transitions |
| `leads.ts` | Lead CRUD, conversion to client |
| `notifications.ts` | Push notification triggers |
| `onboarding.ts` | Business onboarding wizard |
| `payments.ts` | Manual payment recording (`applyInvoicePayment`) |
| `portal.ts` | Client portal actions (reviews, etc.) |
| `properties.ts` | Property CRUD |
| `reviews.ts` | Job review submission |
| `routes.ts` | Route + route_stops CRUD, optimization |
| `send-client-email.ts` | Ad-hoc client email send |
| `service-catalog.ts` | Service types + property_services CRUD |
| `service-templates.ts` | Service templates CRUD |
| `settings.ts` | Business settings (pricing formula, schedule, location) |
| `unsubscribe.ts` | Marketing opt-out |
| `users.ts` | User management |
| `weather-reschedule.ts` | Weather-triggered reschedule flow |
| `zones.ts` | Service zone CRUD |

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate when `app/api/`, `app/actions/`, or auth patterns change materially.
