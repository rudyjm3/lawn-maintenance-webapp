# architecture.md — Project Architecture Reference

## ⚠️ This is not the Next.js you know
This repo uses a modified/fictional Next.js build. **`middleware.ts` is renamed to `proxy.ts`, and `middleware()`
is renamed to `export async function proxy(request: NextRequest)`.** Config export (`config.matcher`) is unchanged.
Confirmed in `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`. `AGENTS.md`
instructs reading `node_modules/next/dist/docs/` before writing code — do that before assuming any standard
Next.js convention holds. No other renamed conventions found (`route.ts`, `page.tsx`, `layout.tsx` are standard).

## Tech stack

| Layer | Choice |
|---|---|
| Framework | Next.js 16.2.4 (fictional/modified build — see above), React 19.2.4 |
| Auth + DB | Supabase (`@supabase/ssr`, `@supabase/supabase-js`) — Postgres + Supabase Auth + RLS. No NextAuth/Clerk. |
| ORM | None — raw Supabase client calls, typed via generated `types/supabase.ts` |
| Payments | Stripe (checkout sessions, webhooks, saved-payment-method autopay) |
| Email | Resend |
| Push notifications | `web-push` (VAPID) |
| AI | `@anthropic-ai/sdk` — schedule-balancing suggestions only (`claude-haiku-4-5-20251001`) |
| Maps | Leaflet + react-leaflet (**not** Google Maps — README is stale on this) |
| Weather | Open-Meteo (**not** OpenWeatherMap — README is stale on this) |
| Drive-time routing | OpenRouteService Matrix API (`ORS_API_KEY`) |
| Forms/validation | react-hook-form + @hookform/resolvers + zod v4 |
| Data fetching/cache | @tanstack/react-query, @tanstack/react-table |
| Styling | Tailwind CSS v4 + shadcn/ui (`components.json`, style `radix-nova`, baseColor `neutral`), radix-ui primitives, class-variance-authority, `cn()` (clsx + tailwind-merge), lucide-react icons, sonner toasts, next-themes |
| Testing | Vitest — only `tests/billing/*.test.ts` exist (pure-function unit tests: autopay eligibility, auto-invoice grouping, reminders) |

**README.md discrepancy**: its "Tech Stack" table claims Google Maps and OpenWeatherMap. Actual implementation
uses Leaflet/react-leaflet and Open-Meteo + OpenRouteService. Trust this file, not the README, for stack facts.

## Why Server Actions over API routes
Nearly all mutations go through Server Actions (`app/actions/*.ts`, 26 files, all `"use server"`), not API
routes. `app/api/**/route.ts` is reserved for cases that must be plain HTTP: cron jobs (need bearer-token auth,
not a browser session), Stripe webhooks (need raw signature verification), and public token-based endpoints
(push subscribe/unsubscribe, reschedule response, Supabase auth confirm callbacks). See `routes.md` for the
full list.

## Auth model
Supabase Auth (cookie-session via `@supabase/ssr`). Two auth "domains" share the same `auth.users` table:
1. **Owner/manager/crew** — linked via `public.users.auth_user_id`; role stored in `users.role` and mirrored
   into `user_metadata.role`.
2. **Portal (client-facing)** — linked via `client_portal_accounts.auth_user_id`.

No JWT custom claims — role/business resolution happens via DB lookups (`lib/auth/business.ts
getAuthenticatedBusinessId`) or `user_metadata`, not token claims.

**Route protection**: centralized in root `proxy.ts` — refreshes Supabase session, redirects unauthenticated
users away from protected prefixes (dashboard/crew/portal routes) to `/login` (with `redirectTo`) or
`/portal/login`, redirects crew-role users away from dashboard routes to `/crew/today` and vice versa,
redirects already-authenticated users away from auth routes (`/login`, `/signup`, `/forgot-password`). Matcher
excludes `_next/static`, `_next/image`, `favicon.ico`, image assets.

## No ORM — known tech debt
Direct Supabase JS client calls everywhere (`supabase.from(table).select/insert/update/delete`), typed against
generated `types/supabase.ts`. Frequent pattern: `// eslint-disable-next-line @typescript-eslint/no-explicit-any`
+ `const db = supabase as any` to bypass generated types for tables/joins not yet reflected in codegen — a
notable type-safety gap. Regenerate `types/supabase.ts` after schema changes rather than hand-patching types.

## Error handling conventions
- **Server Actions**: return discriminated union `{success: true; message} | {success: false; message}` (e.g.
  `ClientActionState`) rather than throwing. Input validated via zod `.safeParse()` up front.
- **API routes**: `NextResponse.json({error: "..."}, {status: N})` on failure, `NextResponse.json({...data})`
  on success. No shared error-response helper — each route hand-rolls this, but consistently uses `{error: string}`.
- **Cron routes**: wrap per-business loop body in try/catch, push `{businessId, ..., error?}` into a `results`
  array so one business's failure doesn't abort the batch — deliberate partial-success pattern.
- **Idempotency**: side-effecting cron/notification actions use DB unique constraints +
  `upsert(..., {onConflict, ignoreDuplicates: true})` as an atomic-reservation pattern (`job_reminders`,
  `invoice_reminders`) — explicitly guards against concurrent cron double-sends.

## Naming / folder conventions
- Kebab-case file names throughout (`add-client-sheet.tsx`, `send-appointment-reminder.ts`).
- Feature-based grouping mirrored across `app/actions/`, `components/`, and dashboard route segments (e.g.
  "invoices" appears as a route group, an actions file, and a components subfolder).
- Parenthesized route groups for layout-only grouping: `(auth)`, `(crew)`, `(dashboard)`, `(marketing)`, `(portal)`.
- Path alias `@/*` → repo root (`tsconfig.json`, `strict: true`).

## Multi-tenancy
Every business-scoped table has `business_id uuid FK→businesses`. RLS policy `business_isolation` on
`auth_business_id()`. See `schema.md` for full table list and the separate portal-account RLS model.

## Env vars (names only — see `.env.example`/DEV_STARTUP.md for values)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`,
`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `RESEND_API_KEY`,
`RESEND_FROM_EMAIL`, `ANTHROPIC_API_KEY`, `ORS_API_KEY`, `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`,
`NEXT_PUBLIC_APP_URL`.

## See also
`routes.md` (API routes + Server Actions), `schema.md` (DB tables), `lib.md` (shared lib exports),
`components.md` (UI component index), `pages.md` (full route tree).

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate when
tech stack, auth model, or core conventions change materially.
