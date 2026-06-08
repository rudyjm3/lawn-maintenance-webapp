"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Bell, CheckCircle, CloudRain, DollarSign, FileText, MessageSquare, XCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Skeleton } from "@/components/ui/skeleton"
import { fetchNotifications, type NotificationPayload } from "@/app/actions/notifications"
import { cn } from "@/lib/utils"

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
  completed: { label: "Completed",  icon: CheckCircle,  color: "text-emerald-600" },
  skipped:   { label: "Skipped",    icon: XCircle,      color: "text-amber-600"   },
  cancelled: { label: "Cancelled",  icon: XCircle,      color: "text-destructive" },
}

function SectionHeader({ label, count }: { label: string; count: number }) {
  if (count === 0) return null
  return (
    <p className="px-4 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
      {label}
    </p>
  )
}

function EmptySection({ label }: { label: string }) {
  return (
    <p className="px-4 py-2 text-xs text-muted-foreground italic">{label}</p>
  )
}

export function NotificationPanel() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [data, setData] = useState<NotificationPayload | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleOpen() {
    setOpen(true)
    if (!data) {
      startTransition(async () => {
        const result = await fetchNotifications()
        setData(result)
      })
    }
  }

  const totalCount = data
    ? data.jobs.length + data.payments.length + data.messages.length + data.estimates.length
    : null

  return (
    <>
      <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={handleOpen} aria-label="Open notifications">
        <Bell className="h-4 w-4" />
        <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-destructive" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-4 pt-4 pb-3 border-b border-border">
            <DialogTitle className="flex items-center gap-2 text-base">
              Notifications
              {totalCount !== null && totalCount > 0 && (
                <span className="inline-flex items-center justify-center rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-bold text-destructive-foreground min-w-[18px]">
                  {totalCount}
                </span>
              )}
            </DialogTitle>
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
                {/* Jobs */}
                <SectionHeader label="Job Activity" count={data.jobs.length} />
                {data.jobs.length === 0 && <EmptySection label="No recent job activity" />}
                {data.jobs.map((job) => {
                  const cfg = JOB_ACTION_CONFIG[job.action_type] ?? JOB_ACTION_CONFIG.completed
                  const Icon = cfg.icon
                  return (
                    <button
                      key={job.id}
                      onClick={() => {
                        const dest = job.client_id
                          ? `/clients/${job.client_id}?tab=history`
                          : "/jobs"
                        router.push(dest)
                        setOpen(false)
                      }}
                      className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                    >
                      <Icon className={cn("h-4 w-4 mt-0.5 shrink-0", cfg.color)} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
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
                {data.payments.length === 0 && <EmptySection label="No recent payments" />}
                {data.payments.map((p) => (
                  <div key={p.id} className="flex w-full items-start gap-3 px-4 py-2.5">
                    <DollarSign className="h-4 w-4 mt-0.5 shrink-0 text-emerald-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        ${Number(p.amount).toFixed(2)} received
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {p.client_name ?? "Unknown client"} · {new Date(`${p.payment_date}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(p.created_at)}</span>
                  </div>
                ))}

                {/* Messages */}
                <SectionHeader label="Client Messages" count={data.messages.length} />
                {data.messages.length === 0 && <EmptySection label="No recent inbound messages" />}
                {data.messages.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => { if (m.client_id) router.push(`/clients/${m.client_id}?tab=activity`); setOpen(false) }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0 text-sky-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{m.client_name ?? "Unknown client"}</p>
                      <p className="text-xs text-muted-foreground truncate">{m.message}</p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(m.sent_at)}</span>
                  </button>
                ))}

                {/* Estimates */}
                <SectionHeader label="Estimate Responses" count={data.estimates.length} />
                {data.estimates.length === 0 && <EmptySection label="No recent estimate responses" />}
                {data.estimates.map((e) => (
                  <button
                    key={e.id}
                    onClick={() => { router.push(`/estimates/${e.id}`); setOpen(false) }}
                    className="flex w-full items-start gap-3 px-4 py-2.5 text-left hover:bg-muted/50 transition-colors"
                  >
                    <FileText className="h-4 w-4 mt-0.5 shrink-0 text-violet-600" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{e.client_name ?? "Unknown client"}</p>
                      <p className="text-xs text-muted-foreground">
                        Estimate{" "}
                        <span className={cn("font-medium", e.status === "approved" ? "text-emerald-600" : "text-destructive")}>
                          {e.status}
                        </span>
                      </p>
                    </div>
                    <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(e.updated_at)}</span>
                  </button>
                ))}

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
