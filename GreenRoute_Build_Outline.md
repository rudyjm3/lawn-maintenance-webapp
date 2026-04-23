# GREENROUTE
## Lawn & Grounds Maintenance Platform
### Complete Build Outline — Version 1.0

> **Planning-First Operations for Lawn & Property Maintenance Businesses**
> *Schedule smarter. Route efficiently. Never overbook again.*

*Prepared April 2026*

---

## 1. Executive Summary & Product Vision

GreenRoute is a planning-first SaaS platform built specifically for lawn care and property grounds maintenance businesses. Unlike generic field service tools, GreenRoute starts with capacity and workload planning before scheduling jobs — preventing overbooking, optimizing routes, and giving operators a true command center for their daily operations.

The platform consists of three tightly integrated products:

- **Public Marketing Website** — Lead generation, service pages, quote requests, and SEO landing pages
- **Owner/Admin Dashboard** — Client management, recurring schedule engine, capacity planner, route optimizer, crew assignment, invoicing, and reporting
- **Crew Mobile View** — Field-optimized daily route, job completion, photo logs, and real-time status updates

> **Core Positioning: "Plan your workload first, then schedule intelligently" — the only lawn care platform built around capacity and route logic from day one.**

### Suggested Product Name

Working title: **GreenRoute** — conveys both the green industry focus and the routing/planning core of the platform. Alternative names worth considering: GroundPlan, RouteKeeper, LawnOps.

### Key Differentiators vs. Competitors

| Feature | GreenRoute | Jobber | Housecall Pro | Service Autopilot |
|---|---|---|---|---|
| Capacity-first scheduling | Yes (core) | No | No | Partial |
| Overbooking protection | Yes (built-in) | No | No | No |
| Route + time + frequency planning | Yes | Basic | Basic | Partial |
| Grounds/commercial focus | Yes | Partial | No | Partial |
| Modular add-on pricing | Yes | No (tiered) | No (tiered) | No (tiered) |
| Crew mobile-first workflow | Yes | Yes | Yes | Partial |
| Built-in lead gen website | Yes (add-on) | Yes | Partial | No |

---

## 2. Review Suggestions & Recommended Additions

Based on a full review of all three planning chats and competitor research, the following additions and refinements are recommended beyond what was already outlined.

### 2A. New Feature Suggestions

**1. Onboarding Wizard (Critical for Adoption)**

A guided setup wizard is missing from the current plan and is critical for day-one activation. New users should be walked through: business profile + service area setup, service catalog creation (with preloaded lawn care templates), first client + property import (CSV upload or manual), working hours + crew capacity rules, and route start/end location defaults.

This directly reduces churn from users who get lost after signup. Jobber's strength is fast time-to-value — your onboarding wizard should match or beat it.

**2. Smart Schedule Templates**

Pre-built schedule templates for common lawn care patterns (e.g., 'Weekly Mowing Season May–Oct', 'Biweekly April–November', 'Monthly Cleanup + Quarterly Fertilization') that an owner can apply to a property in one click rather than building recurrence rules from scratch.

**3. Seasonal Service Calendar View**

A macro-level calendar showing which months are active for each service type across the entire client base. This gives the owner a revenue and workload forecast across the full year — not just week-to-week. No competitor does this well at the SMB level.

**4. Route Zone / Territory Builder**

A map-based zone builder where the owner draws service territories (north side, south side, commercial district, etc.) and assigns clients to zones. Route planning then clusters work by zone by default, dramatically cutting drive time. This should be elevated to a core Phase 2 feature — not an add-on.

**5. Actual vs. Estimated Time Tracking**

When crew marks a job complete, capture actual time spent. Over time, build a comparison report: estimated duration vs. actual duration per service type and per property. This data lets the system auto-suggest better time estimates, which improves route accuracy and capacity calculations. This is a strong long-term differentiator.

**6. Weather Integration & Rescheduling Assistant**

Integrate a weather API (e.g., OpenWeatherMap or Tomorrow.io) to flag days with rain probability above a configurable threshold. When a weather day is flagged, the system should show a 'Reschedule affected jobs' modal that suggests the next best open slot per crew — factoring in existing capacity. This is a genuine pain point in lawn care that no current tool solves elegantly.

**7. Client Communication Log**

A lightweight communication timeline on each client profile showing all SMS, email, and notes exchanged. This keeps the owner informed when a crew member has communicated with a customer about a rescheduled visit, issue, or complaint. Can be Phase 2, but should be planned for in the data model now.

**8. Service Completion Proof (Photo Required Mode)**

An optional setting per property or service type that requires the crew to upload at least one before/after photo before the job can be marked complete. This is a quality control feature that high-end residential and commercial clients expect — and it's a strong upsell differentiator for the Crew Management module.

**9. HOA / Commercial Property Mode**

A property flag for commercial or HOA accounts that unlocks: multi-zone site maps, recurring contract management, inspection checklists, and multi-area service tracking within one property. This should be a dedicated add-on module with its own UI.

**10. Owner Mobile Dashboard (Quick View)**

While the full dashboard is desktop-focused, the owner often checks status from their phone. A simplified mobile owner view should show: today's route progress per crew, job status counts, revenue estimate for the day, and any alerts. This is separate from the crew mobile view.

### 2B. Pricing Model Refinements

The modular pricing concept is strong. Here is a refined and more specific structure:

| Tier / Module | Price (Monthly) | What's Included |
|---|---|---|
| Core Platform | $59/mo | CRM, clients, properties, recurring scheduling, job list, mobile job completion, basic dashboard |
| + Smart Route Engine | +$39/mo | Map-based route planner, Google Maps travel time, stop reordering, route lock, daily route export |
| + Capacity Planner | +$49/mo | Crew capacity rules, overbooking alerts, weekly load view, zone clustering, forecasting |
| + Invoicing & Payments | +$25/mo | Invoice generation, payment tracking, Stripe integration, recurring billing, overdue alerts |
| + Crew Management | +$29/mo | Crew accounts, mobile job workflow, GPS check-in, photo proof, time tracking, crew reports |
| + Lead Gen Website | +$29/mo | Marketing site, quote request form, service pages, SEO basics, lead pipeline |
| + Commercial / HOA Module | +$49/mo | Multi-zone properties, inspection checklists, contract management, site maps |
| + Analytics Pro | +$29/mo | Revenue reports, route efficiency, crew productivity, job profitability, retention metrics |
| **All-In Bundle** | **$199/mo** | **All modules included — best for established businesses (saves $80+/mo vs. à la carte)** |

Annual billing discount: 20% off all plans. Free 14-day trial on Core + Route Engine. No credit card required at signup.

### 2C. Data Model Additions

The existing schema is strong. The following tables or fields should be added or flagged for inclusion:

- `communications` table — log all SMS, email, and in-app messages per client/job
- `weather_alerts` table — store flagged weather days and associated job impact records
- `time_logs` table — store actual start/end per job stop for actuals vs. estimates tracking
- `service_templates` table — prebuilt recurrence templates the owner can apply to a property
- `zones` table (rename from `service_zones`) — add geometry/polygon field for map-drawn zones
- `property.is_commercial` boolean — triggers HOA/commercial mode on that property
- `job.photo_required` boolean — enforces photo upload before completion on crew mobile

---

## 3. Recommended Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14+ (App Router) | Marketing site + admin dashboard in one codebase |
| Language | TypeScript | Type safety across frontend and backend |
| Styling | Tailwind CSS | Utility-first responsive design |
| UI Components | shadcn/ui | Accessible, composable component library |
| Forms | React Hook Form + Zod | Form state and schema validation |
| Data Tables | TanStack Table | Sortable, filterable data tables throughout app |
| Calendar/Scheduler | FullCalendar or custom | Week/day planner view |
| Data Fetching | TanStack Query | Server state, caching, background refresh |
| Database | PostgreSQL (via Supabase) | Relational data, row-level security, tenant isolation |
| Auth | Supabase Auth | Email/password, magic link, role-based access |
| File Storage | Supabase Storage | Property photos, before/after images, invoice PDFs |
| Realtime | Supabase Realtime | Live route/job status updates for owner dashboard |
| Maps & Routing | Google Maps Platform | Geocoding, Routes API, Route Optimization API |
| Weather | OpenWeatherMap API | Rain/weather flagging for rescheduling assistant |
| Payments | Stripe | Invoice payments, recurring billing (Phase 3) |
| Email | Resend or Postmark | Transactional emails — invoices, reminders, alerts |
| SMS (optional) | Twilio | Appointment reminders, crew notifications (Phase 4) |
| Hosting (Frontend) | Vercel | Next.js deployment, edge network, preview environments |
| Hosting (Backend) | Supabase | DB, auth, storage, serverless edge functions |
| ORM (optional) | Prisma | Type-safe DB queries if using server actions directly |

---

## 4. Full Feature Roadmap by Phase

### Phase 1 — Core MVP (Months 1–3)

> **Goal: Replace paper/spreadsheet workflows for a small lawn operation. Prove core value.**

**Auth & Account**
- Email/password login and signup
- Onboarding wizard — business profile, services, working hours, first client
- Single-tenant account (multi-tenant data model ready underneath)

**Client & Property Management**
- Client list with search and filter
- Add/edit client — contact info, billing address, notes, status
- Property management — address, access notes, gate code, pet warning, lawn size
- Google Maps geocoding on address save
- One client → multiple properties

**Service Catalog**
- Create service types — name, default duration, default price, recurrence toggle
- Pre-loaded templates: Weekly Mow, Biweekly Mow, Hedge Trim, Leaf Cleanup, Fertilization, Spring/Fall Cleanup
- Assign services to property with custom price and duration override

**Recurring Schedule Engine**
- Recurrence rules — weekly, biweekly, monthly, custom interval
- Day of week, preferred time window, active months
- Start/end date per schedule
- Schedule exceptions — skip, reschedule, cancel with reason
- 'Next 10 occurrences' preview before saving

**Job Generation & Management**
- Automated job generation from recurrence rules (cron/scheduled worker — 4 weeks ahead)
- Job statuses: Unscheduled, Scheduled, In Progress, Completed, Skipped, Cancelled
- Jobs list — filterable by date, status, crew, service type
- Create one-off jobs manually
- Job detail — services, property notes, instructions, status history

**Weekly Planner / Schedule View**
- Day and week calendar view of all jobs
- Capacity bar per day showing total estimated hours
- Color-coded jobs by status
- Overbooking warning when day exceeds crew capacity threshold
- Drag-and-drop job rescheduling between days
- Unscheduled jobs sidebar

**Basic Dashboard**
- Today's jobs count and status
- Hours booked today vs. capacity
- Overbooked day alerts
- Unassigned jobs count
- Quick actions: Add Client, Create Job

**Mobile Job Completion View (Crew)**
- Today's job list — mobile-optimized, large tap targets
- Job card: client, address, service, notes, access info
- Start job / Complete job buttons
- Add completion notes
- Mark skip with reason
- Basic photo upload (before/after)

**Public Website (Basic)**
- Home page with hero, services, CTA
- Services page
- Contact / quote request form
- Lead saved to admin dashboard

---

### Phase 2 — Operational Upgrade (Months 4–6)

> **Goal: Add route intelligence and team management. This is where you beat Jobber/Housecall Pro.**

**Smart Route Planner**
- Map-based route builder for a selected date + crew
- Google Maps Routes API — travel time between all stops
- Auto-optimize stop order via Route Optimization API
- Manual drag-to-reorder stops
- ETA per stop, total route time, total drive time, total distance
- Route summary bar — stops, job minutes, drive minutes, estimated finish
- Route lock after approval
- Print/export route sheet
- Send route to crew mobile view

**Capacity & Workload Planner**
- Crew capacity rules — hours per day, buffer time, lunch break
- Per-day load percentage visualization
- Overbooking alert details — which jobs exceed capacity and by how much
- Weekly revenue forecast from scheduled jobs
- Zone clustering — group jobs by geographic territory to minimize drive time
- Route zone / territory builder on map

**Crew Management**
- Crew accounts with role-based access (owner, manager, crew lead, crew member)
- Assign jobs and routes to specific crews
- Crew workload view — jobs assigned this week
- GPS check-in when job started (optional)
- Actual time tracking per job vs. estimated

**Weather Rescheduling Assistant**
- Weather API integration — daily forecast for service area
- Flag days with rain probability > configurable threshold (default 60%)
- 'Reschedule affected jobs' modal — one-click reschedule to next open slot
- Weather alert banner on dashboard

**Enhanced Client & Property Features**
- Full client detail page with tabs: Overview, Services, Job History, Invoices, Notes
- Photo history per property — organized by visit date
- Communication log timeline per client
- Service pattern intelligence — flag frequent reschedules, most profitable clients

**Lead CRM**
- Lead list with kanban pipeline view
- Lead statuses: New, Contacted, Site Visit, Estimate Sent, Won, Lost
- Lead source tracking (website form, referral, ad, walk-in)
- Convert lead to client in one click
- Follow-up reminder dates

**Enhanced Public Website**
- Full marketing site — Home, Services, Service Areas, About, Gallery, Reviews, Quote, Contact
- Online booking / quote request with service area checker
- SEO service + city landing pages

---

### Phase 3 — Revenue Layer (Months 7–9)

> **Goal: Connect completed work to cash flow. Owner can manage the full business in one place.**

- Estimate / quote builder — line items, frequency, one-time vs. recurring toggle
- Estimate statuses: Draft, Sent, Approved, Rejected, Expired
- Convert approved estimate to recurring service plan
- Invoice generation — auto-create from completed jobs
- Batch invoicing — invoice multiple clients at once
- Invoice statuses: Draft, Sent, Partial, Paid, Overdue, Void
- Stripe payment integration — online payment link in emailed invoices
- Recurring billing / autopay setup per client
- Payment tracking and overdue alerts
- Automated payment reminders via email
- Service history per client with revenue totals

---

### Phase 4 — Smart Automation (Months 10–12)

> **Goal: Reduce manual work and create meaningful product differentiation at scale.**

- Actual vs. estimated time comparison reports — auto-improve duration estimates per property
- Automated appointment reminder emails/SMS to customers
- Service completion email with before/after photos to client
- Review request automation after job completion
- Seasonal service push notifications to clients (e.g., 'Fall cleanup season starting soon')
- AI-assisted schedule balancing suggestions — flag imbalanced weeks and suggest redistribution
- Customer portal — service history, invoices, upcoming appointments, photo gallery
- Offline-capable PWA mode for crew mobile view

---

### Phase 5 — SaaS Scale (Year 2+)

> **Goal: Sell to multiple businesses. Multi-tenant SaaS product.**

- Full multi-tenant architecture with tenant isolation
- HOA / Commercial Module — multi-zone properties, inspection checklists, recurring contracts
- Multiple crew / vehicle management with route zone assignment
- QuickBooks / Xero integration
- White-label option for larger operators or franchise networks
- API and webhook access for integrations
- Audit logs and admin controls
- Advanced analytics — zone profitability, client LTV, crew efficiency benchmarks
- Multi-location business support

---

## 5. Core Database Schema (PostgreSQL / Supabase)

All tables include `tenant_id` for future multi-tenant support. All primary keys are UUID. Timestamps use `created_at` / `updated_at` on every table.

### Core Tables

| Table | Key Fields | Notes |
|---|---|---|
| `tenants` | id, business_name, slug, timezone, phone, email | Multi-tenant foundation — add from day one even for single-tenant MVP |
| `users` | id, tenant_id, auth_user_id, first/last_name, role, is_active | Roles: owner, manager, crew_lead, crew_member |
| `clients` | id, tenant_id, name, contact info, billing address, status, source, notes | Status: lead, active, inactive, archived |
| `properties` | id, tenant_id, client_id, address, lat, lng, access_notes, gate_code, pet_notes, lawn_size, is_commercial | Geocode lat/lng on save. is_commercial enables HOA mode |
| `service_types` | id, tenant_id, name, default_duration_min, default_price, is_recurring, is_seasonal | Owner-defined service catalog. Pre-seed with lawn care defaults |
| `property_services` | id, tenant_id, property_id, service_type_id, custom_price, duration_min, instructions, is_active | Links a service to a property with overrides |
| `recurrence_rules` | id, tenant_id, property_service_id, frequency_type, interval, day_of_week, start_date, end_date, active_months | Frequency: weekly, biweekly, monthly, custom |
| `schedule_exceptions` | id, tenant_id, recurrence_rule_id, original_date, exception_type, new_date, reason | Types: skip, reschedule, cancel |
| `jobs` | id, tenant_id, client_id, property_id, property_service_id, service_date, status, estimated_duration_min, actual_duration_min, price, photo_required | Status: scheduled, in_progress, completed, skipped, cancelled |
| `crews` | id, tenant_id, name, description, is_active | A crew can have multiple members |
| `crew_members` | id, tenant_id, crew_id, user_id, is_lead | Join table — user can be in multiple crews |
| `vehicles` | id, tenant_id, crew_id, name, plate, is_active | Optional but useful for routing |
| `routes` | id, tenant_id, crew_id, route_date, start/end lat/lng, total_job_min, total_drive_min, is_locked, optimization_status | One route per crew per day |
| `route_stops` | id, tenant_id, route_id, job_id, stop_order, travel_time_min, est_arrival, est_finish, actual_arrival, actual_finish, status | Route stop with travel time from previous stop |
| `service_zones` | id, tenant_id, name, color, description, geometry | Map-drawn polygon zones for territory clustering |
| `leads` | id, tenant_id, name, contact info, service address, requested_services jsonb, status, source | From public quote form or manual entry |
| `estimates` | id, tenant_id, client_id, lead_id, estimate_number, status, subtotal, tax, total, valid_until | Status: draft, sent, approved, rejected, expired |
| `estimate_items` | id, tenant_id, estimate_id, service_type_id, description, qty, unit_price, total_price, duration_min | Line items per estimate |
| `invoices` | id, tenant_id, client_id, invoice_number, status, subtotal, tax, total, due_date | Status: draft, sent, partial, paid, overdue, void |
| `invoice_items` | id, tenant_id, invoice_id, job_id, description, qty, unit_price, total_price | Can link to a job for job-based invoicing |
| `payments` | id, tenant_id, invoice_id, amount, method, payment_date, reference, notes | Track payments against invoices |
| `property_photos` | id, tenant_id, property_id, job_id, user_id, photo_url, photo_type, caption | Types: before, after, reference, issue |
| `communications` | id, tenant_id, client_id, job_id, channel, direction, message, sent_at | Log of all client-facing messages. Channel: email, sms, app |
| `time_logs` | id, tenant_id, job_id, user_id, start_time, end_time, duration_min, notes | Actual time tracking per crew member per job |
| `weather_alerts` | id, tenant_id, alert_date, rain_probability, affected_jobs jsonb, resolved | Store flagged weather days and impacted jobs |
| `activity_logs` | id, tenant_id, user_id, entity_type, entity_id, action_type, metadata jsonb | Audit trail for all data changes |

---

## 6. Complete Page Map & Navigation Structure

### Public Marketing Site

| Page | Route | Purpose |
|---|---|---|
| Home | `/` | Hero, features, social proof, pricing preview, CTA |
| Services | `/services` | All service types with descriptions and pricing guide |
| Service Areas | `/service-areas` | City/area pages for local SEO |
| About | `/about` | Company story, team, values |
| Gallery | `/gallery` | Before/after photos |
| Reviews | `/reviews` | Testimonials and review widgets |
| Pricing | `/pricing` | Plan cards, module add-ons, FAQ |
| Request a Quote | `/quote` | Lead capture form — property, services, contact |
| Contact | `/contact` | Phone, email, contact form, map |
| Login | `/login` | Auth — email/password, magic link |
| Signup / Trial | `/signup` | Trial registration with onboarding wizard |

### Admin Dashboard — Navigation

| Section | Route | Phase |
|---|---|---|
| Dashboard | `/dashboard` | MVP |
| Schedule / Planner | `/dashboard/schedule` | MVP |
| Route Planner | `/dashboard/routes` | Phase 2 |
| Jobs | `/dashboard/jobs` | MVP |
| Clients | `/dashboard/clients` | MVP |
| Properties | `/dashboard/properties` | MVP |
| Service Catalog | `/dashboard/services` | MVP |
| Recurring Schedules | `/dashboard/schedules` | MVP |
| Crews & Team | `/dashboard/crews` | Phase 2 |
| Leads / CRM | `/dashboard/leads` | Phase 2 |
| Estimates | `/dashboard/estimates` | Phase 3 |
| Invoices | `/dashboard/invoices` | Phase 3 |
| Payments | `/dashboard/payments` | Phase 3 |
| Reports | `/dashboard/reports` | Phase 2 (basic) / Phase 4 (advanced) |
| Settings | `/dashboard/settings` | MVP |

### Crew Mobile View — Navigation

| Screen | Route | Purpose |
|---|---|---|
| Today | `/crew/today` | Daily summary — job count, progress, quick start |
| Route | `/crew/route` | Ordered stop list with navigation buttons |
| Job Detail | `/crew/job/:id` | Job instructions, checklist, photos, completion |
| History | `/crew/history` | Today's completed and skipped jobs |
| Profile | `/crew/profile` | User info, crew, logout |

---

## 7. Key Dashboard Page Layouts

### Dashboard / Home

**Top bar:** Search | Notifications | Quick Add button | User menu

**Left sidebar:** Full navigation

**Main content area:**
- Row 1 — KPI Cards (4): Today's Jobs | Hours Booked Today | Capacity Remaining | Open Leads
- Row 2 — Alert Cards: Overbooked days warning | Unassigned jobs | Overdue invoices | Weather alert banner
- Row 3 Left — Today's Route Preview: Mini map + first 5 stops with ETA
- Row 3 Right — Week Schedule Snapshot: Day-by-day capacity bars for current week
- Row 4 Left — Recent Activity Feed: Job completions, new clients, invoice paid
- Row 4 Right — Quick Actions: Add Client, Create Job, Build Route, Send Invoice

### Schedule / Planner Page

**Top controls:** Date picker | Day/Week/Month toggle | Crew filter | Status filter | Optimize button | Add Job

**Main layout (split):**
- Left — Calendar Grid: Color-coded job blocks, drag-to-reschedule, capacity bar per day, recurring indicators, overbooking highlight
- Right Drawer — Unscheduled Jobs: List of jobs without a date, quick-assign drag targets, recommended open slots

**Job card tooltip:** Client name | Service | Estimated time | Crew assigned | Status badge

### Route Planner Page

**Header:** Date selector | Crew selector | Optimize Route button | Recalculate | Print/Export | Lock Route

**Main layout (two-column):**
- Left — Stop List: Stop number, client name, service type, estimated job time, travel time to next, drag handle for reorder, status badge
- Right — Map: Pins for all stops, route lines drawn, total at-a-glance stats overlay

**Bottom summary bar:** Total Stops | Estimated Start Time | Estimated Finish Time | Total Miles | Route Efficiency Score

### Client Detail Page

**Top summary card:** Client name | Contact info | Status badge | Account balance | Quick actions (Call, Email, Create Job, Create Invoice)

**Tab navigation:** Overview | Properties | Scheduled Services | Job History | Estimates | Invoices | Notes | Activity

**Overview tab:** Service frequency summary | Assigned services | Property notes | Preferred day/time | Last + next service

### Crew Mobile — Today View

**Header:** Date | Crew name | Total jobs today

**Progress strip:** Jobs completed / remaining (visual bar)

**Job cards list:** Time | Client | Address | Service summary | Start Navigation button | Start Job button

**UX rules:** One-handed use, large tap targets (min 44px), no dense text, sticky action buttons at bottom

### Crew Mobile — Job Completion View

- Checklist at top (checkboxes for each service task)
- Photo upload section — Before photo (required if setting enabled) | After photo
- Notes field — crew can add completion notes or flag issues
- Time worked summary — auto-calculated from start tap
- Complete Job button — sticky at bottom
- Skip / Report Issue — secondary action

---

## 8. Core System Workflows

### Workflow 1 — Lead to Active Client

1. Visitor submits quote request on public website
2. Lead created in admin CRM with status 'New'
3. Admin reviews lead, updates status to 'Contacted'
4. Site visit scheduled — status updates to 'Site Visit'
5. Estimate built and sent — status updates to 'Estimate Sent'
6. Lead approves estimate — admin clicks 'Convert to Client'
7. Client + property created automatically from lead data
8. Service plan created, recurrence rule saved
9. Jobs auto-generated for next 4 weeks
10. First route includes new client on appropriate day

### Workflow 2 — Weekly Planning

1. Admin opens Planner — sees auto-generated jobs for the week
2. Capacity bars show load per day — overbooking highlighted in red
3. Admin drags overbooked jobs to lighter days or adjusts crew capacity
4. Admin assigns jobs to crews (or uses auto-assign by zone)
5. Admin opens Route Planner per crew per day
6. Clicks 'Optimize Route' — Google Maps calculates best stop order
7. Admin reviews and manually reorders any exceptions
8. Route is locked — crews see it in mobile view next morning

### Workflow 3 — Crew Daily Execution

1. Crew opens mobile app — Today view shows route summary
2. First stop card shows address, service, notes, access code
3. Crew taps 'Start Navigation' — opens Google Maps
4. Crew arrives, taps 'Mark Arrived'
5. Crew taps 'Start Job' — timer begins, status updates to In Progress
6. Crew completes checklist, uploads before/after photos
7. Crew taps 'Complete Job' — actual time logged, status updated
8. Admin dashboard updates in real time via Supabase Realtime
9. Route progress bar advances automatically

### Workflow 4 — Weather Rescheduling

1. Weather API flags rain probability > 60% for tomorrow
2. Dashboard shows weather alert banner
3. Admin clicks 'View Affected Jobs' — sees all scheduled jobs for that day
4. Admin clicks 'Reschedule All' — modal shows next available slot per job
5. Admin confirms — jobs moved, route regenerated, client communication log updated
6. Optional: automated email to clients notifying of reschedule

### Workflow 5 — Invoice & Payment

1. Jobs completed auto-flag as 'Ready to Invoice'
2. Admin opens Invoices — sees 'Uninvoiced Completed Jobs' count
3. Admin selects client and clicks 'Generate Invoice from Jobs'
4. Invoice auto-populated with completed job line items and prices
5. Admin reviews, edits if needed, clicks 'Send Invoice'
6. Client receives email with invoice + online payment link (Stripe)
7. Client pays online — invoice status updates to 'Paid' automatically
8. Admin dashboard revenue numbers update

---

## 9. Development Build Order

Follow this order to maintain a working product at each stage and avoid rework.

### Sprint 1 — App Shell & Auth (Week 1–2)

- Next.js project setup with TypeScript, Tailwind, shadcn/ui
- Supabase project setup — DB, auth, storage
- App layout: sidebar, topbar, mobile nav shell
- Design system: buttons, inputs, cards, badges, tables, modals
- Auth: login, signup, forgot password, session handling
- Onboarding wizard: business profile, services, hours, first client

### Sprint 2 — Clients & Properties (Week 3–4)

- Clients list page with search and filter
- Add/edit client form with validation
- Properties list and add/edit form
- Google Maps geocoding on address save
- Client detail page with tab navigation shell

### Sprint 3 — Services & Schedules (Week 5–6)

- Service catalog management with pre-loaded templates
- Assign services to properties
- Recurrence rule builder with 'Next 10 occurrences' preview
- Schedule exception management (skip, reschedule)

### Sprint 4 — Jobs & Planner (Week 7–9)

- Automated job generation cron job (4-week lookahead)
- Jobs list with status tabs and filters
- Create one-off job form
- Weekly calendar planner view
- Drag-and-drop job scheduling
- Capacity bars and overbooking warnings
- Unscheduled jobs sidebar

### Sprint 5 — Mobile Crew View (Week 10–11)

- Mobile-optimized layout with bottom nav
- Today view — job cards, progress strip
- Job detail — checklist, notes, access info
- Job start / complete / skip flow
- Photo upload (before/after)
- Basic dashboard KPIs

### Sprint 6 — Public Website & Leads (Week 12)

- Marketing site — home, services, quote form
- Quote request → lead creation in admin
- Lead list and basic status pipeline

> After Sprint 6, you have a complete **Phase 1 MVP** ready for a real pilot customer.

### Sprint 7–9 — Phase 2 (Route Planner, Crews, Weather)

- Google Maps Platform integration — Routes API + Route Optimization API
- Route planner page — map, stop list, optimize, lock
- Crew accounts and role-based access
- Crew assignment to jobs and routes
- Service zone builder on map
- Weather API integration and rescheduling assistant
- Client detail full build — all tabs
- Communication log
- Basic reports page

### Sprint 10–12 — Phase 3 (Billing)

- Estimate builder and send flow
- Invoice generation from completed jobs
- Stripe payment integration
- Recurring billing setup
- Payment tracking and overdue alerts

---

## 10. MVP Success Checklist

A business can declare Phase 1 complete when ALL of the following work end-to-end:

| # | Capability | Test Scenario |
|---|---|---|
| 1 | Add all active clients and properties | Owner imports 20 clients with addresses and property notes in under 30 minutes |
| 2 | Define recurring lawn services | Set weekly mowing for 20 clients — all jobs generate correctly for next 4 weeks |
| 3 | View weekly workload | Week planner shows all jobs, capacity bars, and any overbooking |
| 4 | Avoid overbooking | Adding a job to an already-full day triggers a clear warning with details |
| 5 | View today's jobs on a phone | Crew member opens mobile view — sees correct job list in correct order |
| 6 | Complete a job in the field | Crew taps Start, adds notes and photo, taps Complete — status updates in admin dashboard |
| 7 | Review completed work | Owner sees completed jobs, actual times, and crew notes from yesterday |

### Things to Avoid in Version 1

- Over-filtering — keep filter options to 2–3 per list in v1
- Heavy accounting features before job workflow is solid
- Complex user permissions before multi-user is validated
- Advanced AI/ML features before scheduling basics are reliable
- Native iOS/Android apps before PWA is validated — start with mobile-responsive web
- Building customer portal before owner dashboard is complete

---

## 11. Suggested Project Folder Structure

```
app/
  (marketing)/          # Public site routes
    page.tsx            # Home page
    services/
    quote/
    contact/
    pricing/
  (auth)/               # Login, signup, onboarding
  (dashboard)/          # Admin app routes
    dashboard/
    schedule/
    routes/
    jobs/
    clients/
    properties/
    services/
    schedules/
    crews/
    leads/
    estimates/
    invoices/
    reports/
    settings/
  (crew)/               # Mobile crew routes
    today/
    route/
    job/[id]/
    history/

components/
  ui/
  dashboard/
  planner/
  routes/
  jobs/
  clients/
  maps/
  forms/

lib/
  db/                   # Supabase client, queries
  auth/                 # Session, roles, middleware
  maps/                 # Google Maps API wrappers
  scheduling/
    schedule-generator.ts
    capacity-calculator.ts
    recurrence-engine.ts
  routing/
    route-optimizer.ts
    travel-time.ts
  billing/
  weather/
  validations/
  utils/

types/
supabase/
public/
```

---

## 12. Final Notes & Key Decisions

### Most Important Technical Decision

> **Recurring rules generate jobs. Jobs get assigned to routes. Routes get executed by crews. This is the backbone — design everything else around it.**

### Most Important Design Decisions

- Always separate `recurrence_rules` from `jobs` — never conflate the template with the instance
- Store lat/lng on property creation — do not re-geocode on every route calculation
- Add `tenant_id` to every table from day one — multi-tenant later costs 10x more to add retroactively
- Use `route_stops` instead of a `route_id` field on jobs — stop order and ETA data belongs on the stop, not the job
- Log actual time on every job — this data becomes the product's AI advantage over time

### Biggest Technical Challenges

- **Recurring schedule complexity** — model recurrence rules carefully; skips and exceptions get messy fast
- **Route optimization expectations** — users expect Google Maps magic, but manual override is always needed; design the UI for both
- **Mobile crew UX** — field users have dirty hands, bright sun, and need large targets and minimal typing
- **Capacity calculation accuracy** — crew hours, drive time, buffer time, and job estimates all feed into overbooking logic

### Competitive Positioning Summary

Do not try to out-feature Jobber on day one. Instead, be the tool that lawn care operators immediately trust for one thing: knowing that their week is planned correctly before it starts.

**Own this message:**

> *"GreenRoute is the only lawn care platform that plans your capacity before it schedules your week — so you never overbook, never waste drive time, and always know exactly what the day looks like before you start it."*

---

*— End of Build Outline —*

*GreenRoute v1.0 | Built with Next.js + Supabase + Google Maps Platform*
