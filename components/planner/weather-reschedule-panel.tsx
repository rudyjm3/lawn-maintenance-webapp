"use client"

import { useEffect, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CloudRain, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import {
  fetchJobsForDate,
  fetchDateCapacities,
  rescheduleSelectedJobs,
  type RescheduleJob,
  type DateCapacity,
} from "@/app/actions/weather-reschedule"

interface WeatherReschedulePanelProps {
  fromDate: string
  open: boolean
  onOpenChange: (open: boolean) => void
  weatherLabel?: string
}

function fmt(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    weekday: "long", month: "short", day: "numeric",
  })
}

function nextDay(iso: string) {
  const d = new Date(`${iso}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

function arrivalGroup(job: RescheduleJob): "morning" | "afternoon" | "unrouted" {
  if (!job.est_arrival) return "unrouted"
  const hour = parseInt(job.est_arrival.split(":")[0] ?? "0", 10)
  return hour < 12 ? "morning" : "afternoon"
}

export function WeatherReschedulePanel({
  fromDate,
  open,
  onOpenChange,
  weatherLabel,
}: WeatherReschedulePanelProps) {
  const router = useRouter()
  const [step, setStep] = useState<1 | 2>(1)
  const [jobs, setJobs] = useState<RescheduleJob[]>([])
  const [loadingJobs, setLoadingJobs] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [toDate, setToDate] = useState(nextDay(fromDate))
  const [capacities, setCapacities] = useState<DateCapacity[]>([])
  const [sendNotifications, setSendNotifications] = useState(true)
  const [isPending, startTransition] = useTransition()

  // Load jobs when modal opens
  useEffect(() => {
    if (!open) return
    setStep(1)
    setLoadingJobs(true)
    setSelectedIds(new Set())
    setToDate(nextDay(fromDate))
    fetchJobsForDate(fromDate).then((data) => {
      setJobs(data)
      setSelectedIds(new Set(data.map((j) => j.id)))
      setLoadingJobs(false)
    })
  }, [open, fromDate])

  // Load capacity data when moving to step 2
  useEffect(() => {
    if (step !== 2) return
    const dates: string[] = []
    const base = new Date(`${fromDate}T12:00:00Z`)
    for (let i = 1; i <= 14; i++) {
      const d = new Date(base)
      d.setUTCDate(d.getUTCDate() + i)
      dates.push(d.toISOString().slice(0, 10))
    }
    fetchDateCapacities(dates).then(setCapacities)
  }, [step, fromDate])

  const capacityMap = new Map(capacities.map((c) => [c.date, c.jobCount]))
  const toDateCapacity = capacityMap.get(toDate) ?? 0

  const morning = jobs.filter((j) => arrivalGroup(j) === "morning")
  const afternoon = jobs.filter((j) => arrivalGroup(j) === "afternoon")
  const unrouted = jobs.filter((j) => arrivalGroup(j) === "unrouted")
  const hasGroups = morning.length > 0 || afternoon.length > 0

  function toggleJob(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleGroup(groupJobs: RescheduleJob[]) {
    const ids = groupJobs.map((j) => j.id)
    const allSelected = ids.every((id) => selectedIds.has(id))
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => allSelected ? next.delete(id) : next.add(id))
      return next
    })
  }

  function handleReschedule() {
    if (selectedIds.size === 0) return
    startTransition(async () => {
      const result = await rescheduleSelectedJobs({
        jobIds: Array.from(selectedIds),
        fromDate,
        toDate,
        sendNotifications,
      })
      if (result.success) {
        toast.success(result.message)
        onOpenChange(false)
        router.refresh()
      } else {
        toast.error(result.message)
      }
    })
  }

  const canProceed = selectedIds.size > 0
  const selectedWithEmail = jobs.filter(
    (j) => selectedIds.has(j.id) && j.client_email
  ).length
  const uniqueClients = new Set(
    jobs.filter((j) => selectedIds.has(j.id) && j.client_email).map((j) => j.client_id)
  ).size

  function JobRow({ job }: { job: RescheduleJob }) {
    return (
      <label
        key={job.id}
        className="flex items-start gap-3 cursor-pointer rounded-lg px-2 py-2 hover:bg-muted/50 transition-colors"
      >
        <input
          type="checkbox"
          checked={selectedIds.has(job.id)}
          onChange={() => toggleJob(job.id)}
          className="mt-1 h-4 w-4 rounded border-gray-300 text-primary accent-primary cursor-pointer"
        />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-foreground leading-tight truncate">
            {job.client_name}
            {job.on_route && (
              <span className="ml-1.5 text-[10px] font-normal text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 py-0.5">
                on route
              </span>
            )}
          </p>
          <p className="text-xs text-muted-foreground truncate">{job.property_address}</p>
          {job.service_name && (
            <p className="text-xs text-muted-foreground/70">{job.service_name}</p>
          )}
        </div>
        {job.est_arrival && (
          <span className="text-xs text-muted-foreground shrink-0">{job.est_arrival}</span>
        )}
      </label>
    )
  }

  function GroupHeader({ label, groupJobs }: { label: string; groupJobs: RescheduleJob[] }) {
    const allSelected = groupJobs.every((j) => selectedIds.has(j.id))
    return (
      <div className="flex items-center justify-between px-2 pt-2 pb-1">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
        <button
          onClick={() => toggleGroup(groupJobs)}
          className="text-xs text-primary hover:underline"
        >
          {allSelected ? "Deselect all" : "Select all"}
        </button>
      </div>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CloudRain className="h-4 w-4 text-amber-500" />
            Reschedule — {fmt(fromDate)}
          </DialogTitle>
          {weatherLabel && (
            <p className="text-sm text-muted-foreground">{weatherLabel}</p>
          )}
        </DialogHeader>

        {/* ── Step 1: Select jobs ── */}
        {step === 1 && (
          <div className="space-y-1">
            {loadingJobs ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">Loading jobs…</span>
              </div>
            ) : jobs.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">
                No movable scheduled jobs on this date.
              </p>
            ) : (
              <div className="max-h-72 overflow-y-auto -mx-1 px-1">
                {hasGroups ? (
                  <>
                    {morning.length > 0 && (
                      <>
                        <GroupHeader label="🌅 Morning" groupJobs={morning} />
                        {morning.map((j) => <JobRow key={j.id} job={j} />)}
                      </>
                    )}
                    {afternoon.length > 0 && (
                      <>
                        <GroupHeader label="🌇 Afternoon" groupJobs={afternoon} />
                        {afternoon.map((j) => <JobRow key={j.id} job={j} />)}
                      </>
                    )}
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-between px-2 pt-1 pb-1">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {jobs.length} job{jobs.length !== 1 ? "s" : ""} on this day
                      </p>
                      <button
                        onClick={() => toggleGroup(jobs)}
                        className="text-xs text-primary hover:underline"
                      >
                        {jobs.every((j) => selectedIds.has(j.id)) ? "Deselect all" : "Select all"}
                      </button>
                    </div>
                    {unrouted.map((j) => <JobRow key={j.id} job={j} />)}
                  </>
                )}
              </div>
            )}
            <p className="text-xs text-muted-foreground px-2 pt-1">
              {selectedIds.size} of {jobs.length} job{jobs.length !== 1 ? "s" : ""} selected
            </p>
          </div>
        )}

        {/* ── Step 2: New date + options ── */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="toDate">New date</Label>
              <input
                id="toDate"
                type="date"
                value={toDate}
                min={nextDay(fromDate)}
                onChange={(e) => setToDate(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {toDate && (
                <p className={`text-xs ${toDateCapacity >= 8 ? "text-amber-600" : "text-muted-foreground"}`}>
                  {toDateCapacity === 0
                    ? "No jobs yet on this date — plenty of room."
                    : `${toDateCapacity} job${toDateCapacity !== 1 ? "s" : ""} already scheduled on this date.`}
                </p>
              )}
            </div>

            <div className="rounded-lg border border-border bg-muted/30 px-3 py-3 space-y-2">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={sendNotifications}
                  onChange={(e) => setSendNotifications(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
                />
                <div>
                  <p className="text-sm font-medium text-foreground">Notify clients by email</p>
                  <p className="text-xs text-muted-foreground">
                    {uniqueClients > 0
                      ? `${uniqueClients} client${uniqueClients !== 1 ? "s" : ""} with email on file will receive a reschedule notice with a link to confirm or request a different date.`
                      : "No clients with email addresses in this selection."}
                    {selectedWithEmail !== selectedIds.size && selectedIds.size > 0 && (
                      <> ({selectedIds.size - selectedWithEmail} client{selectedIds.size - selectedWithEmail !== 1 ? "s" : ""} without email will not be notified.)</>
                    )}
                  </p>
                </div>
              </label>
            </div>

            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 text-xs text-muted-foreground space-y-1">
              <p>Moving <strong>{selectedIds.size} job{selectedIds.size !== 1 ? "s" : ""}</strong> from <strong>{fmt(fromDate)}</strong> → <strong>{toDate ? fmt(toDate) : "…"}</strong></p>
              {jobs.some((j) => selectedIds.has(j.id) && j.on_route) && (
                <p className="text-amber-600">⚠️ Some selected jobs are on a route. You may need to update the route manually.</p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
            Cancel
          </Button>
          {step === 1 ? (
            <Button onClick={() => setStep(2)} disabled={!canProceed || loadingJobs}>
              Next — Pick Date
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStep(1)} disabled={isPending}>
                Back
              </Button>
              <Button
                onClick={handleReschedule}
                disabled={!toDate || selectedIds.size === 0 || isPending}
              >
                {isPending ? (
                  <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />Rescheduling…</>
                ) : (
                  `Reschedule ${selectedIds.size} job${selectedIds.size !== 1 ? "s" : ""}`
                )}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
