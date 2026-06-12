"use client"

import { useEffect, useState } from "react"
import { Bell, BellOff, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"

function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const rawData = window.atob(base64)
  const output = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; i++) output[i] = rawData.charCodeAt(i)
  return output
}

export function PushNotificationCard() {
  const [supported, setSupported] = useState<boolean | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setSupported(false)
      return
    }
    setSupported(true)
    navigator.serviceWorker.ready.then(async (reg) => {
      const sub = await reg.pushManager.getSubscription()
      setSubscribed(!!sub)
    })
  }, [])

  async function handleEnable() {
    setLoading(true)
    try {
      const permission = await Notification.requestPermission()
      if (permission !== "granted") {
        toast.error("Notification permission denied. Enable it in your browser settings.")
        return
      }

      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        toast.error("Push notifications are not configured.")
        return
      }

      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey),
      })

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(JSON.parse(JSON.stringify(sub))),
      })

      if (res.ok) {
        setSubscribed(true)
        toast.success("Push notifications enabled.")
      } else {
        toast.error("Failed to save subscription.")
      }
    } catch {
      toast.error("Could not enable notifications.")
    } finally {
      setLoading(false)
    }
  }

  async function handleDisable() {
    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.getSubscription()
      if (sub) {
        await fetch("/api/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        })
        await sub.unsubscribe()
      }
      setSubscribed(false)
      toast.success("Push notifications disabled.")
    } catch {
      toast.error("Could not disable notifications.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
            {subscribed ? (
              <Bell className="h-4.5 w-4.5 text-primary" />
            ) : (
              <BellOff className="h-4.5 w-4.5 text-muted-foreground" />
            )}
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">Browser Push Notifications</p>
            <p className="text-xs text-muted-foreground">
              {supported === false
                ? "Your browser does not support push notifications."
                : subscribed
                  ? "You will receive job updates and alerts in this browser."
                  : "Get notified about job activity and alerts directly in this browser."}
            </p>
          </div>
        </div>

        {supported !== false && (
          <Button
            size="sm"
            variant={subscribed ? "outline" : "default"}
            disabled={loading || supported === null}
            onClick={subscribed ? handleDisable : handleEnable}
            className="shrink-0"
          >
            {loading && <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />}
            {loading ? "Saving…" : subscribed ? "Disable" : "Enable"}
          </Button>
        )}
      </div>
    </div>
  )
}
