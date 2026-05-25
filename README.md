# GreenRoute — Lawn Maintenance Web App

A full-stack SaaS platform for lawn care businesses. Manages clients, properties, jobs, routes, crews, invoices, payments, and leads — built with Next.js, Supabase, Stripe, and Google Maps.

## Quick Start

See **[DEV_STARTUP.md](./DEV_STARTUP.md)** for the complete setup guide including environment variables, Stripe webhook forwarding, and cron job testing.

### TL;DR

```bash
npm install
# Copy and fill in .env.local (see DEV_STARTUP.md §2)
npm run dev
```

App runs at `http://localhost:3000`.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| Database + Auth | Supabase (Postgres + Row-Level Security) |
| UI | Tailwind CSS + shadcn/ui |
| Payments | Stripe (invoices, subscriptions, webhooks) |
| Maps | Google Maps API |
| Email | Resend |
| Weather | OpenWeatherMap API |

## Project Structure

```
app/
  (dashboard)/     # Owner/manager portal — clients, jobs, routes, reports, leads
  (crew)/          # Crew mobile view — today's jobs, route, history, profile
  (auth)/          # Login / onboarding
  (marketing)/     # Public-facing quote request page
  api/             # Route handlers (webhooks, cron, AI, email)
  actions/         # Server actions
components/        # Shared UI components
lib/               # Supabase client, utilities, date helpers
supabase/
  migrations/      # Ordered SQL migration files
types/             # Shared TypeScript types
```

## Key Commands

```bash
npm run dev          # Start development server
npm run build        # Production build (type-check + compile)
npm run lint         # ESLint
npx tsc --noEmit     # Type-check without build
```

## Roadmap

- **Communications log UI** — The `communications` table is in the DB schema (Phase 1 data model). A full client-facing message timeline (SMS, email, in-app) is planned for Phase 2.
- **Service templates** — Pre-built recurring service patterns (e.g. "Weekly Mow May–Oct") are on the roadmap to streamline onboarding.
- **HOA / Commercial mode** — Multi-zone properties, inspection checklists, recurring contracts.
- **Photo-required mode** — Enforce before/after photos per property or service type before job completion.
