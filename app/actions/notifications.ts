"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"
import { fetchWeekForecast } from "@/lib/weather"

export interface JobNotification {
  id: string
  action_type: string
  created_at: string
  job_id: string | null
  job_title: string | null
  service_date: string | null
  client_id: string | null
  client_name: string | null
  property_address: string | null
}

export interface PaymentNotification {
  id: string
  amount: number
  payment_date: string
  created_at: string
  client_id: string | null
  client_name: string | null
  invoice_id: string | null
}

export interface MessageNotification {
  id: string
  message: string
  sent_at: string
  client_id: string | null
  client_name: string | null
}

export interface EstimateNotification {
  id: string
  status: string
  updated_at: string
  client_id: string | null
  client_name: string | null
}

export interface WeatherNotification {
  id: string        // stable: "weather-YYYY-MM-DD"
  date: string
  label: string
  icon: string
  severity: "rain" | "severe"
  jobCount: number
}

export interface NotificationPayload {
  jobs: JobNotification[]
  payments: PaymentNotification[]
  messages: MessageNotification[]
  estimates: EstimateNotification[]
  weather: WeatherNotification[]
}

export async function fetchNotifications(): Promise<NotificationPayload> {
  const supabase = await createSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId || bizError) return { jobs: [], payments: [], messages: [], estimates: [], weather: [] }

  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()

  const [logsResult, paymentsResult, messagesResult, estimatesResult, geoResult] = await Promise.all([
    db
      .from("activity_logs")
      .select("id, action_type, created_at, entity_id, user_id")
      .eq("business_id", businessId)
      .eq("entity_type", "job")
      .in("action_type", ["completed", "skipped", "cancelled"])
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(20),

    db
      .from("payments")
      .select("id, amount, payment_date, created_at, invoice_id, invoice:invoices(id, client:clients(id, name))")
      .eq("business_id", businessId)
      .gte("created_at", cutoff)
      .order("created_at", { ascending: false })
      .limit(10),

    db
      .from("communications")
      .select("id, message, sent_at, client_id, client:clients(id, name)")
      .eq("business_id", businessId)
      .eq("direction", "inbound")
      .gte("sent_at", cutoff)
      .order("sent_at", { ascending: false })
      .limit(10),

    db
      .from("estimates")
      .select("id, status, updated_at, client_id, client:clients(id, name)")
      .eq("business_id", businessId)
      .in("status", ["approved", "rejected"])
      .gte("updated_at", cutoff)
      .order("updated_at", { ascending: false })
      .limit(10),

    db
      .from("properties")
      .select("lat, lng")
      .eq("business_id", businessId)
      .not("lat", "is", null)
      .not("lng", "is", null)
      .limit(50),
  ])

  // Resolve job details from activity_logs entity_ids
  const logs = (logsResult.data ?? []) as { id: string; action_type: string; created_at: string; entity_id: string | null }[]
  const jobIds = [...new Set(logs.map((l) => l.entity_id).filter(Boolean))] as string[]

  let jobMap: Record<string, { id: string; title: string | null; service_date: string | null; client_id: string | null; client_name: string | null; property_address: string | null }> = {}
  if (jobIds.length > 0) {
    const { data: jobRows } = await db
      .from("jobs")
      .select("id, title, service_date, client_id, client:clients(id, name), property:properties(address)")
      .in("id", jobIds)
    for (const j of (jobRows ?? []) as { id: string; title: string | null; service_date: string | null; client_id: string | null; client: { id: string; name: string } | null; property: { address: string } | null }[]) {
      jobMap[j.id] = {
        id: j.id,
        title: j.title,
        service_date: j.service_date,
        client_id: j.client_id,
        client_name: j.client?.name ?? null,
        property_address: j.property?.address ?? null,
      }
    }
  }

  const jobs: JobNotification[] = logs.map((log) => {
    const job = log.entity_id ? jobMap[log.entity_id] : null
    return {
      id: log.id,
      action_type: log.action_type,
      created_at: log.created_at,
      job_id: log.entity_id ?? null,
      job_title: job?.title ?? null,
      service_date: job?.service_date ?? null,
      client_id: job?.client_id ?? null,
      client_name: job?.client_name ?? null,
      property_address: job?.property_address ?? null,
    }
  })

  const rawPayments = (paymentsResult.data ?? []) as {
    id: string; amount: number; payment_date: string; created_at: string; invoice_id: string | null;
    invoice: { id: string; client: { id: string; name: string } | null } | null
  }[]
  const payments: PaymentNotification[] = rawPayments.map((p) => ({
    id: p.id,
    amount: p.amount,
    payment_date: p.payment_date,
    created_at: p.created_at,
    client_id: p.invoice?.client?.id ?? null,
    client_name: p.invoice?.client?.name ?? null,
    invoice_id: p.invoice_id,
  }))

  const rawMessages = (messagesResult.data ?? []) as {
    id: string; message: string; sent_at: string; client_id: string | null;
    client: { id: string; name: string } | null
  }[]
  const messages: MessageNotification[] = rawMessages.map((m) => ({
    id: m.id,
    message: m.message,
    sent_at: m.sent_at,
    client_id: m.client_id,
    client_name: m.client?.name ?? null,
  }))

  const rawEstimates = (estimatesResult.data ?? []) as {
    id: string; status: string; updated_at: string; client_id: string | null;
    client: { id: string; name: string } | null
  }[]
  const estimates: EstimateNotification[] = rawEstimates.map((e) => ({
    id: e.id,
    status: e.status,
    updated_at: e.updated_at,
    client_id: e.client_id,
    client_name: e.client?.name ?? null,
  }))

  // Weather alerts
  let weather: WeatherNotification[] = []
  const geoProps = (geoResult.data ?? []) as { lat: number; lng: number }[]
  if (geoProps.length > 0) {
    const avgLat = geoProps.reduce((s, p) => s + p.lat, 0) / geoProps.length
    const avgLng = geoProps.reduce((s, p) => s + p.lng, 0) / geoProps.length

    const now = new Date()
    const weekStart = new Date(now)
    weekStart.setDate(now.getDate() - now.getDay())
    weekStart.setHours(0, 0, 0, 0)
    const weekEnd = new Date(weekStart.getTime() + 7 * 86_400_000)
    const wsIso = weekStart.toISOString().slice(0, 10)
    const weIso = weekEnd.toISOString().slice(0, 10)

    const [forecast, weekJobsResult] = await Promise.all([
      fetchWeekForecast(avgLat, avgLng),
      db
        .from("jobs")
        .select("service_date")
        .eq("business_id", businessId)
        .gte("service_date", wsIso)
        .lte("service_date", weIso)
        .in("status", ["scheduled", "in_progress"]),
    ])

    const jobCountByDate = new Map<string, number>()
    for (const j of (weekJobsResult.data ?? []) as { service_date: string | null }[]) {
      if (j.service_date) jobCountByDate.set(j.service_date, (jobCountByDate.get(j.service_date) ?? 0) + 1)
    }

    weather = forecast
      .slice(0, 7)
      .filter((d) => (d.severity === "rain" || d.severity === "severe") && (jobCountByDate.get(d.date) ?? 0) > 0)
      .map((d) => ({
        id: `weather-${d.date}`,
        date: d.date,
        label: new Date(`${d.date}T12:00:00`).toLocaleDateString("en-US", {
          weekday: "short", month: "short", day: "numeric",
        }),
        icon: d.icon,
        severity: d.severity as "rain" | "severe",
        jobCount: jobCountByDate.get(d.date) ?? 0,
      }))
  }

  return { jobs, payments, messages, estimates, weather }
}
