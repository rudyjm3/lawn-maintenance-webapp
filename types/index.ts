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

export type CommChannel = "email" | "sms" | "app"
export type AutopayMode = "invoice_due_date"
export type AutopayStatus = "idle" | "succeeded" | "failed"
export type InvoiceReminderType =
  | "due_minus_3"
  | "due_day"
  | "overdue_plus_3"
  | "overdue_plus_7"
  | "overdue_notice"

export type JobReminderType = "day_before" | "completion" | "review_request"

export type CampaignStatus = "draft" | "sent"

// ─── Core entities ────────────────────────────────────────────────────────────

export interface Business {
  id: string
  business_name: string
  slug: string
  timezone: string
  phone: string | null
  email: string | null
}

export interface User {
  id: string
  business_id: string
  auth_user_id: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
}

export interface Client {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  billing_address: string | null
  status: ClientStatus
  source: string | null
  notes: string | null
  marketing_opt_out?: boolean
  created_at: string
}

export interface Property {
  id: string
  business_id: string
  client_id: string
  address: string
  lat: number | null
  lng: number | null
  access_notes: string | null
  gate_code: string | null
  pet_notes: string | null
  lawn_size: string | null
  is_commercial: boolean
  photo_required: boolean
  // Joined
  client?: Client
}

export interface ServiceType {
  id: string
  business_id: string
  name: string
  default_duration_min: number
  default_price: number
  is_recurring: boolean
  is_seasonal: boolean
}

export interface ServiceTemplate {
  id: string
  business_id: string
  name: string
  service_type_id: string | null
  frequency: string
  season_start_month: number | null
  season_end_month: number | null
  default_duration_min: number | null
  default_price: number | null
  instructions: string | null
  is_active: boolean
  created_at: string
  // Joined
  service_type?: ServiceType
}

export interface PropertyService {
  id: string
  business_id: string
  property_id: string
  service_type_id: string
  custom_price: number | null
  duration_min: number | null
  instructions: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined
  service_type?: ServiceType
  recurrence_rules?: RecurrenceRule[]
}

export interface RecurrenceRule {
  id: string
  business_id: string
  property_service_id: string
  frequency_type: FrequencyType
  interval: number
  day_of_week: number | null
  start_date: string
  end_date: string | null
  active_months: number[] | null
  created_at: string
  updated_at: string
  // Joined
  exceptions?: ScheduleException[]
}

export interface ScheduleException {
  id: string
  business_id: string
  recurrence_rule_id: string
  original_date: string
  exception_type: "skip" | "reschedule" | "cancel"
  new_date: string | null
  reason: string | null
  created_at: string
}

export interface Job {
  id: string
  business_id: string
  client_id: string
  property_id: string
  property_service_id: string | null
  title: string | null
  description: string | null
  service_date: string | null        // ISO date "YYYY-MM-DD"
  status: JobStatus
  estimated_duration_min: number
  actual_duration_min: number | null
  price: number
  photo_required: boolean
  review_token?: string | null
  review_requested_at?: string | null
  review_rating?: number | null
  review_text?: string | null
  review_submitted_at?: string | null
  created_at: string
  // Joined
  client?: Client
  property?: Property
  service_type?: ServiceType
  crew?: Crew
  route_stops?: { stop_order: number }[]
}

export interface Crew {
  id: string
  business_id: string
  name: string
  description: string | null
  is_active: boolean
  color?: string | null
  // Joined
  members?: User[]
}

export interface Vehicle {
  id: string
  business_id: string
  crew_id: string
  name: string
  plate: string | null
  is_active: boolean
}

export interface Route {
  id: string
  business_id: string
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
  business_id: string
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
  business_id: string
  name: string
  color: string
  description: string | null
}

export interface Lead {
  id: string
  business_id: string
  name: string
  email: string | null
  phone: string | null
  service_address: string | null
  requested_services: string[]
  status: LeadStatus
  source: string | null
  created_at: string
}

export interface Estimate {
  id: string
  business_id: string
  client_id: string | null
  lead_id: string | null
  estimate_number: string
  status: EstimateStatus
  subtotal: number
  tax: number
  total: number
  valid_until: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined
  client?: Client
  items?: EstimateItem[]
}

export interface EstimateItem {
  id: string
  business_id: string
  estimate_id: string
  service_type_id: string | null
  description: string
  qty: number
  unit_price: number
  total_price: number
  duration_min: number | null
}

export interface InvoiceItem {
  id: string
  business_id: string
  invoice_id: string
  job_id: string | null
  description: string
  qty: number
  unit_price: number
  total_price: number
}

export interface Payment {
  id: string
  business_id: string
  invoice_id: string
  amount: number
  method: string | null
  payment_date: string
  reference: string | null
  notes: string | null
  created_at: string
  // Joined
  invoice?: Invoice
}

export interface Invoice {
  id: string
  business_id: string
  client_id: string
  invoice_number: string
  status: InvoiceStatus
  subtotal: number
  tax: number
  total: number
  due_date: string | null
  notes: string | null
  stripe_payment_link: string | null
  stripe_payment_intent_id: string | null
  auto_generated?: boolean
  auto_generation_batch_date?: string | null
  autopay_attempted_at?: string | null
  autopay_status?: AutopayStatus
  created_at: string
  updated_at: string
  // Joined
  client?: Client
  items?: InvoiceItem[]
  payments?: Payment[]
}

export interface ClientBillingSettings {
  id: string
  business_id: string
  client_id: string
  autopay_enabled: boolean
  autopay_mode: AutopayMode
  stripe_customer_id: string | null
  stripe_default_payment_method_id: string | null
  stripe_default_payment_method_brand: string | null
  stripe_default_payment_method_last4: string | null
  reminder_days_before: number[]
  reminder_days_after: number[]
  next_billing_run_at: string | null
  created_at: string
  updated_at: string
}

export interface InvoiceReminder {
  id: string
  business_id: string
  invoice_id: string
  reminder_type: InvoiceReminderType
  sent_at: string
}

export interface Communication {
  id: string
  business_id: string
  client_id: string | null
  job_id: string | null
  channel: CommChannel
  direction: "inbound" | "outbound"
  message: string
  sent_at: string  // ISO timestamptz
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

export interface Campaign {
  id: string
  business_id: string
  subject: string
  body: string
  status: CampaignStatus
  recipient_count: number
  sent_at: string | null
  created_at: string
  updated_at: string
}

export interface ScheduleSuggestion {
  jobId: string
  jobTitle: string
  currentDate: string
  suggestedDate: string
  currentCrewName: string
  reason: string
}
