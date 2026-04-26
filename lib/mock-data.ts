/**
 * MOCK DATA — development only.
 *
 * Replace these with real Supabase queries once the schema is applied.
 * Each function signature matches what a real query hook/server action will return,
 * so swapping is a one-liner.
 *
 * TODO: Delete this file and replace callers with:
 *   - lib/db/jobs.ts    → getJobsForWeek(tenantId, startDate, endDate)
 *   - lib/db/clients.ts → getClients(tenantId)
 *   - lib/db/routes.ts  → getRouteForDay(tenantId, crewId, date)
 *   etc.
 */

import {
  type Job,
  type Client,
  type Property,
  type ServiceType,
  type Crew,
  type Route,
  type RouteStop,
  type Lead,
  type Invoice,
  type DashboardKPIs,
  type WeekDaySnapshot,
  type ActivityItem,
} from "@/types"

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isoDate(daysFromToday: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  return d.toISOString().slice(0, 10)
}

function isoDateTime(daysFromToday: number, hour: number, minute = 0): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromToday)
  d.setHours(hour, minute, 0, 0)
  return d.toISOString()
}

const TODAY = isoDate(0)

// ─── Service types ────────────────────────────────────────────────────────────

export const mockServiceTypes: ServiceType[] = [
  { id: "st-1", business_id: "t-1", name: "Weekly Mow", default_duration_min: 45, default_price: 65, is_recurring: true, is_seasonal: true },
  { id: "st-2", business_id: "t-1", name: "Biweekly Mow", default_duration_min: 60, default_price: 85, is_recurring: true, is_seasonal: true },
  { id: "st-3", business_id: "t-1", name: "Hedge Trim", default_duration_min: 90, default_price: 120, is_recurring: false, is_seasonal: false },
  { id: "st-4", business_id: "t-1", name: "Leaf Cleanup", default_duration_min: 120, default_price: 175, is_recurring: false, is_seasonal: true },
  { id: "st-5", business_id: "t-1", name: "Fertilization", default_duration_min: 30, default_price: 95, is_recurring: true, is_seasonal: true },
  { id: "st-6", business_id: "t-1", name: "Spring Cleanup", default_duration_min: 180, default_price: 250, is_recurring: false, is_seasonal: true },
]

// ─── Clients ──────────────────────────────────────────────────────────────────

export const mockClients: Client[] = [
  { id: "c-1", business_id: "t-1", name: "Jane Smith", email: "jane@example.com", phone: "(555) 201-1234", billing_address: "12 Oak Lane, Springfield, IL 62701", status: "active", source: "referral", notes: "Prefers morning visits", created_at: isoDateTime(-90, 9) },
  { id: "c-2", business_id: "t-1", name: "Bob & Carol Johnson", email: "bob@johnsons.net", phone: "(555) 202-5678", billing_address: "45 Maple Ave, Springfield, IL 62702", status: "active", source: "website", notes: null, created_at: isoDateTime(-60, 10) },
  { id: "c-3", business_id: "t-1", name: "Riverside HOA", email: "mgr@riversidehoa.org", phone: "(555) 203-9012", billing_address: "1 Community Dr, Springfield, IL 62703", status: "active", source: "referral", notes: "Commercial — 3 parcels", created_at: isoDateTime(-45, 8) },
  { id: "c-4", business_id: "t-1", name: "Michael Torres", email: "mtorres@gmail.com", phone: "(555) 204-3456", billing_address: "78 Elm Ct, Springfield, IL 62704", status: "active", source: "website", notes: "Gate code: 4421", created_at: isoDateTime(-30, 11) },
  { id: "c-5", business_id: "t-1", name: "Laura Chen", email: "laura.chen@work.com", phone: "(555) 205-7890", billing_address: "9 Birch Rd, Springfield, IL 62705", status: "active", source: "ad", notes: null, created_at: isoDateTime(-14, 14) },
  { id: "c-6", business_id: "t-1", name: "Greenfield Office Park", email: "facilities@greenfield.com", phone: "(555) 206-2345", billing_address: "200 Commerce Blvd, Springfield, IL 62706", status: "active", source: "referral", notes: "Commercial — biweekly contract", created_at: isoDateTime(-7, 9) },
]

// ─── Properties ───────────────────────────────────────────────────────────────

export const mockProperties: Property[] = [
  { id: "p-1", business_id: "t-1", client_id: "c-1", address: "12 Oak Lane, Springfield, IL 62701", lat: 39.7817, lng: -89.6501, access_notes: null, gate_code: null, pet_notes: "Small dog — Biscuit", lawn_size: "0.25 acres", is_commercial: false },
  { id: "p-2", business_id: "t-1", client_id: "c-2", address: "45 Maple Ave, Springfield, IL 62702", lat: 39.7840, lng: -89.6523, access_notes: "Side gate unlocked", gate_code: null, pet_notes: null, lawn_size: "0.4 acres", is_commercial: false },
  { id: "p-3", business_id: "t-1", client_id: "c-3", address: "1 Community Dr, Springfield, IL 62703", lat: 39.7860, lng: -89.6540, access_notes: "Check in with manager", gate_code: "7755", pet_notes: null, lawn_size: "3.2 acres", is_commercial: true },
  { id: "p-4", business_id: "t-1", client_id: "c-4", address: "78 Elm Ct, Springfield, IL 62704", lat: 39.7795, lng: -89.6480, access_notes: null, gate_code: "4421", pet_notes: null, lawn_size: "0.3 acres", is_commercial: false },
  { id: "p-5", business_id: "t-1", client_id: "c-5", address: "9 Birch Rd, Springfield, IL 62705", lat: 39.7810, lng: -89.6515, access_notes: null, gate_code: null, pet_notes: null, lawn_size: "0.2 acres", is_commercial: false },
  { id: "p-6", business_id: "t-1", client_id: "c-6", address: "200 Commerce Blvd, Springfield, IL 62706", lat: 39.7870, lng: -89.6560, access_notes: "Parking in lot B", gate_code: null, pet_notes: null, lawn_size: "8.0 acres", is_commercial: true },
]

// ─── Crews ────────────────────────────────────────────────────────────────────

export const mockCrews: Crew[] = [
  { id: "crew-1", business_id: "t-1", name: "Team Alpha", description: "Primary residential crew", is_active: true },
  { id: "crew-2", business_id: "t-1", name: "Team Bravo", description: "Commercial & large properties", is_active: true },
]

// ─── Jobs (this week + a few unscheduled) ────────────────────────────────────

function makeJob(
  id: string,
  clientIdx: number,
  propIdx: number,
  svcIdx: number,
  daysOffset: number,
  status: Job["status"] = "scheduled",
  crewIdx = 0,
): Job {
  const client = mockClients[clientIdx]
  const property = { ...mockProperties[propIdx], client }
  const service_type = mockServiceTypes[svcIdx]
  const crew = mockCrews[crewIdx]
  return {
    id,
    business_id: "t-1",
    client_id: client.id,
    property_id: property.id,
    property_service_id: null,
    service_date: daysOffset !== 99 ? isoDate(daysOffset) : null,
    status,
    estimated_duration_min: service_type.default_duration_min,
    actual_duration_min: status === "completed" ? service_type.default_duration_min + Math.floor(Math.random() * 15 - 5) : null,
    price: service_type.default_price,
    photo_required: service_type.name.includes("Cleanup"),
    created_at: isoDateTime(-7, 9),
    client,
    property,
    service_type,
    crew,
  }
}

export const mockJobs: Job[] = [
  // Today
  makeJob("j-1", 0, 0, 0, 0, "completed"),
  makeJob("j-2", 1, 1, 0, 0, "in_progress"),
  makeJob("j-3", 3, 3, 2, 0, "scheduled"),

  // Tomorrow
  makeJob("j-4", 0, 0, 0, 1, "scheduled"),
  makeJob("j-5", 2, 2, 0, 1, "scheduled", 1),
  makeJob("j-6", 4, 4, 1, 1, "scheduled"),
  makeJob("j-7", 5, 5, 3, 1, "scheduled", 1),
  makeJob("j-8", 1, 1, 4, 1, "scheduled", 1),  // overbook day

  // Day after tomorrow
  makeJob("j-9",  2, 2, 0, 2, "scheduled"),
  makeJob("j-10", 3, 3, 1, 2, "scheduled"),

  // 3 days out
  makeJob("j-11", 4, 4, 0, 3, "scheduled"),
  makeJob("j-12", 0, 0, 2, 3, "scheduled"),
  makeJob("j-13", 5, 5, 0, 3, "scheduled"),
  makeJob("j-14", 1, 1, 3, 3, "scheduled", 1),
  makeJob("j-15", 2, 2, 4, 3, "scheduled", 1),

  // 4 days out
  makeJob("j-16", 3, 3, 0, 4, "scheduled"),
  makeJob("j-17", 4, 4, 1, 4, "scheduled"),

  // Yesterday (completed/skipped)
  makeJob("j-18", 0, 0, 0, -1, "completed"),
  makeJob("j-19", 1, 1, 1, -1, "completed"),
  makeJob("j-20", 2, 2, 0, -1, "skipped"),

  // Unscheduled jobs (no date)
  makeJob("j-21", 3, 3, 5, 99, "unscheduled"),
  makeJob("j-22", 4, 4, 2, 99, "unscheduled"),
  makeJob("j-23", 5, 5, 3, 99, "unscheduled"),
]

// ─── Leads ────────────────────────────────────────────────────────────────────

export const mockLeads: Lead[] = [
  { id: "l-1", business_id: "t-1", name: "Amy Walsh", email: "amy@example.com", phone: "(555) 301-1111", service_address: "33 Cedar St, Springfield, IL 62701", requested_services: ["Weekly Mow", "Fertilization"], status: "new", source: "website", created_at: isoDateTime(-1, 14) },
  { id: "l-2", business_id: "t-1", name: "Park Terrace Condos", email: null, phone: "(555) 302-2222", service_address: "400 Park Terrace Blvd, Springfield, IL 62702", requested_services: ["Weekly Mow", "Hedge Trim"], status: "contacted", source: "referral", created_at: isoDateTime(-3, 10) },
  { id: "l-3", business_id: "t-1", name: "David Nguyen", email: "dnguyen@email.net", phone: null, service_address: "21 Pine Dr, Springfield, IL 62703", requested_services: ["Spring Cleanup"], status: "estimate_sent", source: "website", created_at: isoDateTime(-5, 9) },
]

// ─── Invoices (overdue) ───────────────────────────────────────────────────────

export const mockOverdueInvoices: Invoice[] = [
  { id: "inv-1", business_id: "t-1", client_id: "c-2", invoice_number: "INV-041", status: "overdue", subtotal: 340, tax: 0, total: 340, due_date: isoDate(-14), created_at: isoDateTime(-30, 9), client: mockClients[1] },
]

// ─── Dashboard KPIs ───────────────────────────────────────────────────────────

export function getMockDashboardKPIs(): DashboardKPIs {
  const todaysJobs = mockJobs.filter((j) => j.service_date === TODAY)
  const completed = todaysJobs.filter((j) => j.status === "completed")
  const hoursBooked = todaysJobs.reduce((sum, j) => sum + j.estimated_duration_min, 0)
  return {
    todaysJobsCount: todaysJobs.length,
    todaysJobsCompleted: completed.length,
    hoursBookedToday: Math.round(hoursBooked / 60 * 10) / 10,
    capacityMinutesToday: 480, // 8 hours
    openLeadsCount: mockLeads.filter((l) => l.status !== "won" && l.status !== "lost").length,
    unassignedJobsCount: mockJobs.filter((j) => j.status === "unscheduled").length,
  }
}

// ─── Week snapshot ────────────────────────────────────────────────────────────

export function getMockWeekSnapshot(): WeekDaySnapshot[] {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const CAPACITY_MIN = 480 // 8h per day

  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDate(i)
    const jobs = mockJobs.filter((j) => j.service_date === date && j.status !== "cancelled")
    const scheduledMinutes = jobs.reduce((s, j) => s + j.estimated_duration_min, 0)
    const d = new Date(date + "T12:00:00")
    return {
      date,
      label: DAY_LABELS[d.getDay()],
      isToday: date === TODAY,
      jobCount: jobs.length,
      scheduledMinutes,
      capacityMinutes: CAPACITY_MIN,
      isOverbooked: scheduledMinutes > CAPACITY_MIN,
      jobs,
    }
  })
}

// ─── Activity feed ────────────────────────────────────────────────────────────

export function getMockActivity(): ActivityItem[] {
  return [
    { id: "a-1", type: "job_completed", description: "Weekly Mow completed at 12 Oak Lane", timestamp: isoDateTime(0, 10, 30) },
    { id: "a-2", type: "lead_received", description: "New lead: Amy Walsh via website", timestamp: isoDateTime(-1, 14, 5) },
    { id: "a-3", type: "job_completed", description: "Weekly Mow completed at 12 Oak Lane", timestamp: isoDateTime(-1, 11, 0) },
    { id: "a-4", type: "job_completed", description: "Biweekly Mow completed at 45 Maple Ave", timestamp: isoDateTime(-1, 12, 45) },
    { id: "a-5", type: "job_skipped", description: "Job skipped at 9 Birch Rd — rain", timestamp: isoDateTime(-1, 13, 0) },
    { id: "a-6", type: "client_added", description: "New client added: Greenfield Office Park", timestamp: isoDateTime(-7, 9, 0) },
    { id: "a-7", type: "invoice_paid", description: "INV-038 paid — Jane Smith ($65)", timestamp: isoDateTime(-2, 16, 20) },
  ]
}

// ─── Route for today (for route preview widget) ───────────────────────────────

export function getMockTodayRoute(): Route & { stops: (RouteStop & { job: Job })[] } {
  const todayJobs = mockJobs.filter((j) => j.service_date === TODAY && j.crew?.id === "crew-1")

  const stops = todayJobs.map((job, i): RouteStop & { job: Job } => ({
    id: `rs-${i}`,
    business_id: "t-1",
    route_id: "route-1",
    job_id: job.id,
    stop_order: i + 1,
    travel_time_min: i === 0 ? 0 : 12 + Math.floor(Math.random() * 8),
    est_arrival: isoDateTime(0, 8 + i, 15 * i),
    est_finish: isoDateTime(0, 8 + i, 15 * i + (job.estimated_duration_min)),
    actual_arrival: job.status === "completed" ? isoDateTime(0, 8 + i, 15 * i - 2) : null,
    actual_finish: job.status === "completed" ? isoDateTime(0, 8 + i, 15 * i + job.estimated_duration_min - 3) : null,
    status: job.status === "completed" ? "completed" : job.status === "in_progress" ? "in_progress" : "pending",
    job,
  }))

  return {
    id: "route-1",
    business_id: "t-1",
    crew_id: "crew-1",
    route_date: TODAY,
    start_lat: 39.7817,
    start_lng: -89.6501,
    end_lat: null,
    end_lng: null,
    total_job_min: stops.reduce((s, st) => s + st.job.estimated_duration_min, 0),
    total_drive_min: stops.reduce((s, st) => s + st.travel_time_min, 0),
    is_locked: true,
    optimization_status: "optimized",
    crew: mockCrews[0],
    stops,
  }
}
