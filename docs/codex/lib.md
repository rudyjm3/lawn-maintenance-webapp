# lib.md — Shared Library Exports

All paths relative to `/home/user/lawn-maintenance-webapp/lib/`.

## auth/
- `business.ts` — `getAuthenticatedBusinessId(supabase): Promise<{businessId: string|null; error: string|null}>` — resolves caller's `business_id` from `user_metadata.business_id` or `users` table lookup.

## supabase/
- `admin.ts` — `createAdminClient()` — service-role client, bypasses RLS (`SUPABASE_SERVICE_ROLE_KEY`).
- `client.ts` — `createClient()` — browser client via `createBrowserClient`.
- `server.ts` — `async createClient()` — server client using `next/headers` cookies, RLS-scoped to logged-in session.

## portal/
- `auth.ts` — `getPortalClientId(supabase): Promise<string|null>` — resolves authenticated portal client's `client_id` via `client_portal_accounts`.

## Top-level utilities
- `dates.ts` — `formatUtcDate(date)`, `parseUtcDate(isoDate)`, `addUtcDays(date, days)`, `addUtcDaysToIso(isoDate, days)`, `todayUtc()`, `startOfWeekUtc(date)`, `formatLocalDate(date)`, `formatDuration(minutes)`, `formatTime(iso, fallback?)`, `localMinsToUTCISO(routeDate, minutesSinceMidnight, timezone)` — timezone-aware conversions for route scheduling.
- `utils.ts` — `cn(...inputs: ClassValue[])` — clsx + tailwind-merge helper (shadcn convention).
- `jobs.ts` — `PLANNER_CAPACITY_MINUTES = 480`; `getJobServiceLabel(job): string`; `normalizeJobRow(row)` / `normalizeJobRows(rows)`; `buildWeekSnapshot(jobs, weekStart, capacityMinutes?): WeekDaySnapshot[]`; `generateJobsForBusinessLookahead(supabase, businessId, {startDate, endDate}): Promise<{createdCount, skippedCount}>` — core recurring-job generator; also deletes stale unrouted generated jobs whose recurrence no longer matches.
- `routing.ts` — `getSequentialDriveTimes(stops: Coord[]): Promise<DriveTimeResult|null>` — calls OpenRouteService Matrix API (`ORS_API_KEY`), returns per-leg drive minutes.
- `weather.ts` — `fetchWeekForecast(lat, lng): Promise<DayWeather[]>` — Open-Meteo 14-day forecast, maps WMO codes to `WeatherSeverity` (clear\|watch\|rain\|severe).

## scheduling/
- `recurrence.ts` — `computeOccurrences(rule: RecurrenceRuleInput, count?, exceptions?, rangeStart?): Date[]` — recurrence-rule occurrence generator (weekly/biweekly/monthly/custom), handles skip/cancel/reschedule exceptions and active-month seasonal filters.

## billing/
- `tax.ts` — `roundCents(value): number`, `calculateTax(subtotal, taxRatePercent): number`.
- `invoice-numbers.ts` — `getNextInvoiceNumber(db, businessId): Promise<string>` (format `INV-0001`).
- `estimate-numbers.ts` — `getNextEstimateNumber(db, businessId): Promise<string>` (format `EST-0001`).
- `payments.ts` — `applyInvoicePayment(db, {businessId, invoiceId, amount, method, paymentDate, reference?, notes?}): Promise<{status, paid, total}>` — inserts payment row, recomputes invoice status (paid\|partial\|sent).
- `auto-invoice.ts` — `getUninvoicedCompletedJobs`, `groupJobsByClient`, `buildInvoiceItemsFromCompletedJobs`, `sumInvoiceItems(items, taxRate?)`.
- `autopay.ts` — `evaluateAutopayEligibility({invoice, billing, today}): {eligible, reason?} | {eligible: true, outstanding}` — pure eligibility logic, unit-tested (`tests/billing/`).
- `reminders.ts` — `getReminderTypeForDate(dueDate, date?): ReminderType|null`, `getReminderEmailSubjectPrefix(type): string`.

## ai/
- `schedule-balancer.ts` — `getScheduleSuggestions(weekStart, businessId): Promise<ScheduleSuggestion[]>` — uses `@anthropic-ai/sdk` (`claude-haiku-4-5-20251001`) to suggest job rebalancing across crews based on weekly load.

## push/
- `send-push.ts` — `sendPushToSubscription(sub, payload): Promise<{success, gone?}>`, `sendPushToMany(subs, payload): Promise<string[]>` (returns gone/expired endpoints) — uses `web-push` with VAPID keys.
- `notify-business.ts` (`"use server"`) — `notifyBusiness(businessId, payload)`, `notifyCrewForBusiness(businessId, payload)` — fan-out push to owner-role or crew-role subscribers, cleans up expired endpoints.

## stripe/
- `client.ts` — `stripe: Stripe` — lazy Proxy singleton (avoids build-time failure if `STRIPE_SECRET_KEY` absent), apiVersion `"2026-04-22.dahlia"`.
- `customers.ts` — `ensureStripeCustomer({existingCustomerId?, email?, name, clientId, businessId}): Promise<string>`.

## email/
- `client.ts` — `resend: Resend` — same lazy Proxy pattern for `RESEND_API_KEY`.
- `send-*.ts` (8 files, each `Promise<{success, message}>`): `sendAppointmentReminderEmail`, `sendCampaignEmail`, `sendClientMessage`, `sendEstimateEmail(estimate: Estimate)`, `sendInvoiceEmail(invoice: Invoice)`, `sendJobCompletionEmail`, `sendOverdueReminderEmail(invoice: Invoice)`, `sendReviewRequestEmail`, `sendRescheduleNotification` — all wrap `resend.emails.send`.

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate when `lib/` exports change materially.
