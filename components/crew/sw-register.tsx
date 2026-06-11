"use client"

import { useEffect } from "react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

async function subscribeToPush(registration: ServiceWorkerRegistration) {
  const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  if (!vapidKey) return

  try {
    const existing = await registration.pushManager.getSubscription()
    const sub = existing ?? await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidKey),
    })

    const serialized = JSON.parse(JSON.stringify(sub))
    await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...serialized, role: "crew" }),
    })
  } catch {
    // Push subscription is best-effort
  }
}

export function SwRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return

    navigator.serviceWorker
      .register("/sw.js")
      .then(async (registration) => {
        const permission = await Notification.requestPermission()
        if (permission === "granted") {
          await subscribeToPush(registration)
        }
      })
      .catch(() => {
        // SW registration is best-effort; ignore failures in dev
      })
  }, [])

  return null
}
