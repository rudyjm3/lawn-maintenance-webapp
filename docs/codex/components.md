# components.md — UI Component Index

108 `.tsx` files under `components/`. **Default is `"use client"`** — server components are the minority,
listed explicitly below. All paths relative to `components/`.

## Server components (no "use client" directive)
- `ui/button.tsx`, `ui/textarea.tsx`, `ui/badge.tsx`, `ui/input.tsx`, `ui/card.tsx`, `ui/skeleton.tsx` — shadcn primitives
- `jobs/job-status-badge.tsx`, `invoices/invoice-status-badge.tsx`, `estimates/estimate-status-badge.tsx`, `leads/lead-status-badge.tsx`, `clients/client-status-badge.tsx` — status badge components
- `planner/capacity-bar.tsx`, `crew/crew-route-picker.tsx`, `marketing/footer.tsx`
- `dashboard/week-snapshot.tsx`, `dashboard/kpi-card.tsx`, `dashboard/activity-feed.tsx`, `dashboard/route-preview.tsx`

All other component files below are `"use client"` unless noted.

## Notable prop shapes
`dashboard/kpi-card.tsx` — `KpiCardProps { title: string; value: string|number; sub?: string; icon: LucideIcon; trend?: "up"|"down"|"neutral"; className?: string }`

## By directory

**campaigns/** — `campaign-composer-sheet.tsx`, `campaigns-table.tsx`

**clients/** — `add-client-sheet.tsx`, `client-autopay-card.tsx`, `client-detail-tabs.tsx`, `client-status-badge.tsx` (server), `clients-table.tsx`, `send-email-dialog.tsx`

**crew/** — `bottom-nav.tsx`, `crew-route-picker.tsx` (server), `photo-upload.tsx`, `sw-register.tsx` (service worker registration, crew view)

**crews/** — `crew-sheet.tsx`, `crews-table.tsx`, `invite-member-dialog.tsx`, `member-sheet.tsx`, `members-table.tsx`

**dashboard/** — `activity-feed.tsx` (server), `kpi-card.tsx` (server), `notification-panel.tsx`, `route-preview.tsx` (server), `sidebar.tsx`, `sw-register-dashboard.tsx` (service worker registration, owner/dashboard), `topbar.tsx`, `weather-alert-banner.tsx`, `week-snapshot.tsx` (server)

**estimates/** — `convert-to-plan-modal.tsx`, `create-estimate-sheet.tsx`, `estimate-detail-card.tsx`, `estimate-line-items-editor.tsx`, `estimate-status-badge.tsx` (server), `estimates-table.tsx`, `price-recommendation-engine.tsx`, `send-estimate-button.tsx`

**invoices/** — `batch-invoice-form.tsx`, `generate-from-jobs-dialog.tsx`, `invoice-detail-card.tsx`, `invoice-status-badge.tsx` (server), `invoices-table.tsx`, `record-payment-dialog.tsx`, `send-invoice-button.tsx`

**jobs/** — `add-job-sheet.tsx`, `job-status-badge.tsx` (server), `jobs-table.tsx`

**leads/** — `lead-status-badge.tsx` (server), `leads-kanban.tsx`, `leads-table.tsx`, `leads-view.tsx`

**marketing/** — `footer.tsx` (server), `nav.tsx`, `quote-form.tsx` (calls `submitQuote` action)

**onboarding/** — `wizard.tsx` (business onboarding flow)

**payments/** — `payments-table.tsx`

**planner/** — `balancing-suggestions-dialog.tsx`, `capacity-bar.tsx` (server), `job-chip.tsx`, `weather-reschedule-panel.tsx`, `week-planner.tsx`

**properties/** — `add-property-sheet.tsx`, `properties-table.tsx`, `property-photo-gallery.tsx`

**routes/** — `add-stops-panel.tsx`, `new-route-dialog.tsx`, `route-crew-select.tsx`, `route-lock-toggle.tsx`, `route-map.tsx` + `route-map-leaflet.tsx` (wrapper/impl split), `route-optimize-button.tsx`, `route-recalculate-button.tsx`, `route-stop-list.tsx`

**service-catalog/** — `assign-service-dialog.tsx`, `property-services-panel.tsx`, `recurrence-rule-dialog.tsx`, `schedule-exceptions-list.tsx`, `service-templates-table.tsx`, `service-type-sheet.tsx`, `service-types-table.tsx`

**settings/** — `business-location-card.tsx`, `collapsible-pricing-section.tsx`, `geocode-properties-card.tsx`, `pricing-formula-card.tsx`, `push-notification-card.tsx`, `work-schedule-card.tsx`

**ui/** (shadcn primitives) — `avatar.tsx`, `badge.tsx` (server), `button.tsx` (server), `card.tsx` (server), `dialog.tsx`, `dropdown-menu.tsx`, `input.tsx` (server), `label.tsx`, `select.tsx`, `separator.tsx`, `sheet.tsx`, `skeleton.tsx` (server), `sonner.tsx`, `switch.tsx`, `table.tsx`, `tabs.tsx`, `textarea.tsx` (server)

**zones/** — `zone-map.tsx` + `zone-map-leaflet.tsx` (wrapper/impl split), `zone-sheet.tsx`, `zones-panel.tsx`

**top-level** — `providers.tsx` — wraps app with React Query (`@tanstack/react-query`), `next-themes`, toast providers; used in root `app/layout.tsx`.

## Patterns
- **Map component split**: `*-map.tsx` (thin wrapper) + `*-map-leaflet.tsx` (Leaflet impl), pattern used in both `routes/` and `zones/` — likely dynamic-imported to avoid SSR issues with `leaflet`/`react-leaflet`.
- Feature areas map 1:1 to `app/actions/*.ts` files (e.g. `components/invoices/*` ↔ `app/actions/invoices.ts`) and to dashboard route segments.

---
**Last generated:** 2026-07-23 — initial codex generation from full-codebase exploration. Regenerate when `components/` files are added/removed/renamed.
