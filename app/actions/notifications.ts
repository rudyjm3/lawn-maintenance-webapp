"use server"

import { createClient as createSupabaseClient } from "@/lib/supabase/server"
import { getAuthenticatedBusinessId } from "@/lib/auth/business"

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

export interface NotificationPayload {
  jobs: JobNotification[]
  payments: PaymentNotification[]
  messages: MessageNotification[]
  estimates: EstimateNotification[]
}

export async function fetchNotifications(): Promise<NotificationPayload> {
  const supabase = await createSupabaseClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any
  const { businessId, error: bizError } = await getAuthenticatedBusinessId(supabase)
  if (!businessId || bizError) return { jobs: [], payments: [], messages: [], estimates: [] }

  const [logsResult, paymentsResult, messagesResult, estimatesResult] = await Promise.all([
    db
      .from("activity_logs")
      .select("id, action_type, created_at, entity_id, user_id")
      .eq("business_id", businessId)
      .eq("entity_type", "job")
      .in("action_type", ["completed", "skipped", "cancelled"])
      .order("created_at", { ascending: false })
      .limit(20),

    db
      .from("payments")
      .select("id, amount, payment_date, created_at, invoice_id, invoice:invoices(id, client:clients(id, name))")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(10),

    db
      .from("communications")
      .select("id, message, sent_at, client_id, client:clients(id, name)")
      .eq("business_id", businessId)
      .eq("direction", "inbound")
      .order("sent_at", { ascending: false })
      .limit(10),

    db
      .from("estimates")
      .select("id, status, updated_at, client_id, client:clients(id, name)")
      .eq("business_id", businessId)
      .in("status", ["approved", "rejected"])
      .order("updated_at", { ascending: false })
      .limit(10),
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

  return { jobs, payments, messages, estimates }
}
