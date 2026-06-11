"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendPushToMany, type PushPayload, type StoredSubscription } from "./send-push"

export async function notifyBusiness(businessId: string, payload: PushPayload) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("business_id", businessId)
    .eq("role", "owner")

  if (!subs || subs.length === 0) return

  const goneEndpoints = await sendPushToMany(subs as StoredSubscription[], payload)

  // Clean up expired subscriptions
  if (goneEndpoints.length > 0) {
    await db.from("push_subscriptions").delete().in("endpoint", goneEndpoints)
  }
}

export async function notifyCrewForBusiness(businessId: string, payload: PushPayload) {
  if (!process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) return

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: subs } = await db
    .from("push_subscriptions")
    .select("endpoint, p256dh, auth_key")
    .eq("business_id", businessId)
    .eq("role", "crew")

  if (!subs || subs.length === 0) return

  const goneEndpoints = await sendPushToMany(subs as StoredSubscription[], payload)

  if (goneEndpoints.length > 0) {
    await db.from("push_subscriptions").delete().in("endpoint", goneEndpoints)
  }
}
