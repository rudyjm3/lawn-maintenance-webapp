"use client"

import { useState, useTransition, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCircle, CloudRain, DollarSign, FileText, MessageSquare, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchNotifications, type NotificationPayload } from "@/app/actions/notifications"
import { cn } from "@/lib/utils"

const LS_KEY = "greenroute-read-notification-ids"

function loadReadIds(): Set<string> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
  } catch {
    return new Set()
  }
}

function saveReadIds(ids: Set<string>) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify([...ids]))
  } catch { /* ignore */ }
}

function allIds(data: NotificationPayload): string[] {
  return [
    ...data.weather.map((w) => w.id),
    ...data.jobs.map((j) => j.id),
    ...data.payments.map((p) => p.id),
    ...data.messages.map((m) => m.id),
    ...data.estimates.map((e) => e.id),
  ]
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60_000)
  if (min < 1) return "just now"
  if (min < 60) return `${min}m ago`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h ago`
  return `${Math.floor(hr / 24)}d ago`
}

const JOB_ACTION_CONFIG: Record<string, { label: string; icon: typeof CheckCircle; color: string }> = {
  completed: { label: "Completed", icon: CheckCircle,  color: "text-emerald-600" },
  skipped:   { label: "Skipped",   icon: XCircle,      color: "text-amber-600"   },
  cancelled: { label: "Cancelled", icon: XCircle,      color: "text-destructive" },
}

function UnreadDot() {
  return <span className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" aria-hidden />
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  )
}

export function NotificationPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationPayload | null>(null)
  const [isPending, startTransition] = useTransition()
  const [readIds, setReadIds] = useState<Set<string>>(new Set())

  // Load persisted read IDs on mount
  useEffect(() => {
    setReadIds(loadReadIds())
  }, [])

  const markRead = useCallback((id: string) => {
    setReadIds((prev) => {
      const next = new Set(prev).add(id)
      saveReadIds(next)
      return next
    })
  }, [])

  const markAllRead = useCallback(() => {
    if (!data) return
    setReadIds((prev) => {
      const next = new Set(prev)
      for (const id of allIds(data)) next.add(id)
      saveReadIds(next)
      return next
    })
  }, [data])

  function handleOpen() {
    setOpen(true)
    if (!data) {
      startTransition(async () => {
        const result = await fetchNotifications()
        setData(result)
      })
    }
  }

  const unreadCount = data
    ? allIds(data).filter((id) => !readIds.has(id)).length
    : null

  const totalCount = data ? allIds(data).length : null

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="relative h-9 w-9"
        onClick={handleOpen}
        aria-label="Open notifications"
      >
        <Bell className="h-4 w-4" />
        {(unreadCount === null || unreadCount > 0) && (
          <span className={cn(
            "absolute right-1 top-1 flex items-center justify-center rounded-full bg-destructive text-white font-bold leading-none",
            unreadCount !== null && unreadCount > 0
              ? "min-w-[14px] h-[14px] px-0.5 text-[9px]"
              : "h-2 w-2"
          )}>
            {unreadCount !== null && unreadCount > 0 ? unreadCount : ""}
          </span>
        )}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <div className="flex items-center justify-between gap-2 pr-10">
              <DialogTitle className="flex items-center gap-2 text-base">
                Notifications
                {totalCount !== null && totalCount > 0 && (
                  <span className="inline-flex items-center justify-center rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground min-w-[18px]">
                    {totalCount}
                  </span>
                )}
              </DialogTitle>
              {data && unreadCount !== null && unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:underline shrink-0"
                >
                  Mark all read
                </button>
              )}
            </div>
          </DialogHeader>

          <div className="overflow-y-auto max-h-[500px]">
            {isPending && (
              <div className="space-y-2 p-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-7 w-7 rounded-full shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-3/4" />
                      <Skeleton className="h-3 w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!isPending && data && (
              <>
                {/* Weather */}
                <SectionHeader label="Weather Alerts" count={data.weather.length} />
                {data.weather.map((w) => {
                  const isUnread = !readIds.has(w.id)
                  return (
                    <button
                      key={w.id}
                      onClick={() => {
                        markRead(w.id)
                        router.push(`/schedule?date=${w.date}`)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors",
                        isUnread && "bg-amber-50/60 dark:bg-amber-950/20"
                      )}
                    >
                      {isUnread && <UnreadDot />}
                      <span className="text-base leading-none mt-0.5 shrink-0">{w.icon}</span>
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {w.label} — {w.severity === "severe" ? "Severe weather" : "Rain expected"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {w.jobCount} job{w.jobCount !== 1 ? "s" : ""} at risk
                        </p>
                      </div>
                    </button>
                  )
                })}

                {/* Jobs */}
                <SectionHeader label="Job Activity" count={data.jobs.length} />
                {data.jobs.map((job) => {
                  const cfg = JOB_ACTION_CONFIG[job.action_type] ?? JOB_ACTION_CONFIG.completed
                  const Icon = cfg.icon
                  const isUnread = !readIds.has(job.id)
                  return (
                    <button
                      key={job.id}
                      onClick={() => {
                        markRead(job.id)
                        const dest = job.client_id
                          ? `/clients/${job.client_id}?tab=history&jobId=${job.job_id}`
                          : "/jobs"
                        router.push(dest)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      {isUnread && <UnreadDot />}
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {job.property_address ?? "Unknown property"} — {cfg.label}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {job.client_name ?? "Unknown client"}{job.service_date ? ` · ${new Date(`${job.service_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}` : ""}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(job.created_at)}</span>
                    </button>
                  )
                })}

                {/* Payments */}
                <SectionHeader label="Payments" count={data.payments.length} />
                {data.payments.map((p) => {
                  const isUnread = !readIds.has(p.id)
                  return (
                    <div
                      key={p.id}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      {isUnread && <UnreadDot />}
                      <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          ${Number(p.amount).toFixed(2)} received
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.client_name ?? "Unknown client"} · {new Date(`${p.payment_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(p.created_at)}</span>
                    </div>
                  )
                })}

                {/* Messages */}
                <SectionHeader label="Client Messages" count={data.messages.length} />
                {data.messages.map((m) => {
                  const isUnread = !readIds.has(m.id)
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        markRead(m.id)
                        if (m.client_id) router.push(`/clients/${m.client_id}?tab=activity`)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      {isUnread && <UnreadDot />}
                      <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {m.client_name ?? "Unknown client"}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{m.message}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(m.sent_at)}</span>
                    </button>
                  )
                })}

                {/* Estimates */}
                <SectionHeader label="Estimate Responses" count={data.estimates.length} />
                {data.estimates.map((e) => {
                  const isUnread = !readIds.has(e.id)
                  return (
                    <button
                      key={e.id}
                      onClick={() => {
                        markRead(e.id)
                        router.push(`/estimates/${e.id}`)
                        setOpen(false)
                      }}
                      className={cn(
                        "flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors",
                        isUnread && "bg-primary/5"
                      )}
                    >
                      {isUnread && <UnreadDot />}
                      <FileText className="h-4 w-4 mt-0.5 shrink-0 text-violet-600" />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm truncate", isUnread ? "font-semibold text-foreground" : "font-medium text-foreground")}>
                          {e.client_name ?? "Unknown client"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Estimate{" "}
                          <span className={cn("font-medium", e.status === "approved" ? "text-emerald-600" : "text-destructive")}>
                            {e.status}
                          </span>
                        </p>
                      </div>
                      <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(e.updated_at)}</span>
                    </button>
                  )
                })}

                {totalCount === 0 && (
                  <div className="flex flex-col items-center gap-2 py-12 text-center">
                    <CloudRain className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No recent activity</p>
                  </div>
                )}
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
