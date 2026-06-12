import webpush from "web-push"

function getWebPush() {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) throw new Error("VAPID keys are not configured in environment variables")
  webpush.setVapidDetails(
    `mailto:${process.env.RESEND_FROM_EMAIL ?? "notifications@greenroute.app"}`,
    pub,
    priv
  )
  return webpush
}

export interface PushPayload {
  title: string
  body: string
  icon?: string
  url?: string
}

export interface StoredSubscription {
  endpoint: string
  p256dh: string
  auth_key: string
}

export async function sendPushToSubscription(
  sub: StoredSubscription,
  payload: PushPayload
): Promise<{ success: boolean; gone?: boolean }> {
  try {
    await getWebPush().sendNotification(
      {
        endpoint: sub.endpoint,
        keys: { p256dh: sub.p256dh, auth: sub.auth_key },
      },
      JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon ?? "/icon-192x192.png",
        url: payload.url ?? "/",
      })
    )
    return { success: true }
  } catch (err: unknown) {
    const status = (err as { statusCode?: number }).statusCode
    // 404/410 means the subscription is expired/invalid — caller should delete it
    if (status === 404 || status === 410) return { success: false, gone: true }
    console.error("Push send error:", err)
    return { success: false }
  }
}

export async function sendPushToMany(
  subs: StoredSubscription[],
  payload: PushPayload
): Promise<string[]> {
  const goneEndpoints: string[] = []
  await Promise.all(
    subs.map(async (sub) => {
      const result = await sendPushToSubscription(sub, payload)
      if (result.gone) goneEndpoints.push(sub.endpoint)
    })
  )
  return goneEndpoints
}
