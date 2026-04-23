// ─── Enums / union types ──────────────────────────────────────────────────────

export type UserRole = "owner" | "manager" | "crew_lead" | "crew_member"

export type ClientStatus = "lead" | "active" | "inactive" | "archived"

export type JobStatus =
  | "unscheduled"
  | "scheduled"
  | "in_progress"
  | "completed"
  | "skipped"
  | "cancelled"

export type LeadStatus =
  | "new"
  | "contacted"
  | "site_visit"
  | "estimate_sent"
  | "won"
  | "lost"

export type FrequencyType = "weekly" | "biweekly" | "monthly" | "custom"

export type InvoiceStatus = "draft" | "sent" | "partial" | "paid" | "overdue" | "void"

export type EstimateStatus = "draft" | "sent" | "approved" | "rejected" | "expired"

export type PhotoType = "before" | "after" | "reference" | "issue"

export type OptimizationStatus = "pending" | "optimized" | "manual"

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Tenant {
  id: string
  business_name: string
  slug: string
  timezone: string
  phone: string | null
  email: string | null
}

export interface User {
  id: string
  tenant_id: string
  auth_user_id: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
}

export interface Client {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  billing_address: string | null
  status: ClientStatus
  source: string | null
  notes: string | null
  created_at: string
}

export interface Property {
  id: string
  tenant_id: string
  client_id: string
  address: string
  lat: number | null
  lng: number | null
  access_notes: string | null
  gate_code: string | null
  pet_notes: string | null
  lawn_size: string | null
  is_commercial: boolean
  // Joined
  client?: Client
}

export interface ServiceType {
  id: string
  tenant_id: string
  name: string
  default_duration_min: number
  default_price: number
  is_recurring: boolean
  is_seasonal: boolean
}

export interface Job {
  id: string
  tenant_id: string
  client_id: string
  property_id: string
  property_service_id: string | null
  service_date: string | null        // ISO date "YYYY-MM-DD"
  status: JobStatus
  estimated_duration_min: number
  actual_duration_min: number | null
  price: number
  photo_required: boolean
  created_at: string
  // Joined
  client?: Client
  property?: Property
  service_type?: ServiceType
  crew?: Crew
}

export interface Crew {
  id: string
  tenant_id: string
  name: string
  description: string | null
  is_active: boolean
  // Joined
  members?: User[]
}

export interface Vehicle {
  id: string
  tenant_id: string
  crew_id: string
  name: string
  plate: string | null
  is_active: boolean
}

export interface Route {
  id: string
  tenant_id: string
  crew_id: string
  route_date: string   // ISO date "YYYY-MM-DD"
  start_lat: number | null
  start_lng: number | null
  end_lat: number | null
  end_lng: number | null
  total_job_min: number
  total_drive_min: number
  is_locked: boolean
  optimization_status: OptimizationStatus
  // Joined
  crew?: Crew
  stops?: RouteStop[]
}

export interface RouteStop {
  id: string
  tenant_id: string
  route_id: string
  job_id: string
  stop_order: number
  travel_time_min: number
  est_arrival: string | null   // ISO datetime
  est_finish: string | null
  actual_arrival: string | null
  actual_finish: string | null
  status: "pending" | "arrived" | "in_progress" | "completed" | "skipped"
  // Joined
  job?: Job
}

export interface ServiceZone {
  id: string
  tenant_id: string
  name: string
  color: string
  description: string | null
}

export interface Lead {
  id: string
  tenant_id: string
  name: string
  email: string | null
  phone: string | null
  service_address: string | null
  requested_services: string[]
  status: LeadStatus
  source: string | null
  created_at: string
}

export interface Invoice {
  id: string
  tenant_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  total: number
  due_date: string
  created_at: string
  // Joined
  client?: Client
}

// ─── Dashboard-specific view types ───────────────────────────────────────────

export interface DashboardKPIs {
  todaysJobsCount: number
  todaysJobsCompleted: number
  hoursBookedToday: number
  capacityMinutesToday: number
  openLeadsCount: number
  unassignedJobsCount: number
}

export interface WeekDaySnapshot {
  date: string          // "YYYY-MM-DD"
  label: string         // "Mon", "Tue", …
  isToday: boolean
  jobCount: number
  scheduledMinutes: number
  capacityMinutes: number
  isOverbooked: boolean
  jobs: Job[]
}

export interface ActivityItem {
  id: string
  type: "job_completed" | "client_added" | "invoice_paid" | "lead_received" | "job_skipped"
  description: string
  timestamp: string
  meta?: Record<string, string>
}
