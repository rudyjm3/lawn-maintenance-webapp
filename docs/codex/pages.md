# pages.md — Page/Route Tree

App Router only, no `pages/`, no `src/`. Route groups (parenthesized dirs) don't affect the URL.
Auth/role gating for all protected groups is centralized in root `proxy.ts` (see architecture.md).
Only `loading.tsx` in the repo: `(dashboard)/schedule/loading.tsx`.

## (marketing) — public site, all server components
Shared `layout.tsx`: `marketing/nav.tsx` + `marketing/footer.tsx`.

| Route | Type | Notes |
|---|---|---|
| `/` | server | home |
| `/about` | server | |
| `/contact` | server | |
| `/gallery` | server | |
| `/pricing` | server | |
| `/quote` | server | uses client subcomponent `marketing/quote-form.tsx` → `submitQuote` action |
| `/reschedule/[token]` | server | + client subcomponent `response-form.tsx` → `/api/reschedule/respond` |
| `/review/[token]` | server | + client subcomponent `review-form.tsx` → `submitReview` action |
| `/reviews` | server | |
| `/service-areas` | server | |
| `/services` | server | |
| `/unsubscribe/[token]` | server | |

## (auth) — login/signup/onboarding
All actions via `app/actions/auth.ts`.

| Route | Type | Notes |
|---|---|---|
| `/crew-setup` | client | |
| `/forgot-password` | client | |
| `/login` | client | |
| `/onboarding` | server | wraps `components/onboarding/wizard.tsx` (client) |
| `/reset-password` | client | |
| `/signup` | client | |

## (dashboard) — owner/manager portal
Gated: unauthenticated → `/login`; crew-role users redirected to `/crew/today`. Shared `layout.tsx`: `Sidebar` + `Topbar` + `SwRegisterDashboard` (push SW registration). All server components fetching data server-side, delegating interactivity to client subcomponents (e.g. `jobs-table.tsx`) and `app/actions/*`.

| Route | Type | Notes |
|---|---|---|
| `/campaigns` | server | |
| `/clients` | server | |
| `/clients/[id]` | server | |
| `/crews` | server | |
| `/dashboard` | server | home KPIs |
| `/estimates` | server | |
| `/estimates/[id]` | server | |
| `/invoices` | server | |
| `/invoices/[id]` | server | |
| `/invoices/batch` | server | |
| `/jobs` | server | |
| `/leads` | server | |
| `/owner/today` | server | |
| `/payments` | server | |
| `/properties` | server | |
| `/reports` | server | |
| `/reports/time-analysis` | server | |
| `/routes` | server | |
| `/routes/[id]` | server | |
| `/schedule` | server | has `loading.tsx` |
| `/schedules` | server | |
| `/service-catalog` | server | |
| `/settings` | server | |
| `/zones` | server | |

## (crew) — mobile crew view
Gated: crew-role only (owner/manager bounced to dashboard). Shared `layout.tsx`.

| Route | Type | Notes |
|---|---|---|
| `/crew/history` | client | |
| `/crew/job` | server | |
| `/crew/job/[id]` | client | |
| `/crew/offline` | server | |
| `/crew/profile` | client | |
| `/crew/route` | client | |
| `/crew/today` | server | crew landing page |

## (portal) — client self-service portal
Separate auth domain: Supabase auth scoped to `client_portal_accounts`, not `public.users`. Callback: `/portal/auth/confirm/route.ts`.

| Route | Type | Notes |
|---|---|---|
| `/portal/dashboard` | server | |
| `/portal/invoices/[id]` | server | |
| `/portal/login` | client | |
| `/portal/reviews` | server | |

## Root
`app/layout.tsx` — RootLayout, Inter + Geist Mono fonts, wraps `<Providers>`. `app/globals.css`. `app/favicon.ico`.

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate when routes are added/removed or route groups restructured.
