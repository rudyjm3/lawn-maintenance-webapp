"use client"

import { use, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckSquare,
  Square,
  Clock,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { PhotoUpload } from "@/components/crew/photo-upload"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SKIP_REASONS = [
  "No access",
  "Customer request",
  "Weather",
  "Equipment issue",
  "No one home",
  "Other",
]

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  if (m === 0) return `${s}s`
  return `${m}m ${s}s`
}

// ─── Timer (client-only) ──────────────────────────────────────────────────────

function useElapsedTimer(startMs: number | null) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    if (startMs === null) return
    // Defer first tick via setTimeout so it is not a synchronous setState in
    // the effect body, and Date.now() is not called during render.
    const initialId = setTimeout(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 0)
    const intervalId = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 10_000)
    return () => { clearTimeout(initialId); clearInterval(intervalId) }
  }, [startMs])

  return elapsed
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: jobId } = use(params)
  const searchParams = useSearchParams()
  const stopId = searchParams.get("stopId")
  const router = useRouter()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [job, setJob]          = useState<any | null>(null)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [currentUser, setCurrentUser] = useState<any | null>(null)
  const [loading, setLoading]  = useState(true)
  const [error, setError]      = useState<string | null>(null)

  // UI state
  const [accessExpanded, setAccessExpanded] = useState(false)
  const [checklist, setChecklist]           = useState<Record<number, boolean>>({})
  const [notes, setNotes]                   = useState("")
  const [beforeUrl, setBeforeUrl]           = useState<string | null>(null)
  const [afterUrl, setAfterUrl]             = useState<string | null>(null)
  const [submitting, setSubmitting]         = useState(false)
  const [submittingAction, setSubmittingAction] = useState<"complete" | "skip" | null>(null)
  const [submitError, setSubmitError]       = useState<string | null>(null)
  const [showSkipSheet, setShowSkipSheet]   = useState(false)
  const [skipReason, setSkipReason]         = useState(SKIP_REASONS[0])
  const [reloadKey, setReloadKey]           = useState(0)

  // Start time — persisted in localStorage so navigation doesn't reset the timer.
  // Initialized to null and set in a useEffect so this is SSR-safe (localStorage
  // is unavailable during prerender). setState is deferred via setTimeout to
  // satisfy react-hooks/set-state-in-effect.
  const [startMs, setStartMs] = useState<number | null>(null)
  const elapsedSec = useElapsedTimer(startMs)

  useEffect(() => {
    const key = `job-start-${jobId}`
    const stored = localStorage.getItem(key)
    const ms = stored ? parseInt(stored, 10) : Date.now()
    if (!stored) localStorage.setItem(key, String(ms))
    setTimeout(() => setStartMs(ms), 0)
  }, [jobId])

  useEffect(() => {
    if (!showSkipSheet) return
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [showSkipSheet])

  // ── Data load ──────────────────────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const db = supabase as any

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setError("Not signed in."); setLoading(false); return }

      const [userRes, jobRes, stopRes] = await Promise.all([
        db.from("users")
          .select("id, first_name, last_name, business_id")
          .eq("auth_user_id", user.id)
          .single(),
        db.from("jobs")
          .select(`
            id, status, estimated_duration_min, photo_required, business_id,
            title, description,
            client:clients(id, name, phone),
            property:properties(
              id, address, access_notes, gate_code, pet_notes, lawn_size,
              property_services(id, instructions, service_type:service_types(id, name))
            ),
            property_service:property_services(
              id, instructions,
              service_type:service_types(id, name, default_duration_min)
            )
          `)
          .eq("id", jobId)
          .single(),
        stopId
          ? db.from("route_stops")
              .select("id, status, actual_arrival, est_arrival, est_finish, stop_order")
              .eq("id", stopId)
              .single()
          : Promise.resolve({ data: null }),
      ])

      if (userRes.error || !userRes.data) {
        setError(userRes.error?.message ?? "Could not load crew profile.")
        setLoading(false)
        return
      }
      if (jobRes.error || !jobRes.data) {
        setError(jobRes.error?.message ?? "Job not found.")
        setLoading(false)
        return
      }
      if (stopId && stopRes?.error) {
        setError(stopRes.error.message)
        setLoading(false)
        return
      }

      setCurrentUser(userRes.data)
      setJob(jobRes.data)
      setLoading(false)

      // Stamp actual_arrival the first time a crew member opens this stop,
      // provided the job isn't already finished and no arrival is recorded.
      if (stopId && stopRes?.data && !stopRes.data.actual_arrival) {
        const now = new Date().toISOString()
        await db
          .from("route_stops")
          .update({ actual_arrival: now, status: "in_progress" })
          .eq("id", stopId)
          .eq("job_id", jobId)
        // Also mark the job in_progress if still scheduled
        if (jobRes.data.status === "scheduled" || jobRes.data.status === "unscheduled") {
          await db.from("jobs").update({ status: "in_progress" }).eq("id", jobId)
        }
      }
    }

    load()
  }, [jobId, stopId, reloadKey])

  // ── Complete flow ──────────────────────────────────────────────────────────

  async function handleComplete() {
    if (!job || !currentUser) {
      setSubmitError("Could not load crew profile for this action.")
      return
    }
    if (job.photo_required && (!beforeUrl || !afterUrl)) {
      setSubmitError("Both before and after photos are required before completing.")
      return
    }

    setSubmitting(true)
    setSubmittingAction("complete")
    setSubmitError(null)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const now = new Date().toISOString()
    const elapsedMin = Math.max(1, Math.round(elapsedSec / 60))
    localStorage.removeItem(`job-start-${jobId}`)

    try {
      // Update job status
      const { error: e1 } = await db.from("jobs").update({
        status: "completed",
        actual_duration_min: elapsedMin,
      }).eq("id", job.id)
      if (e1) throw new Error(e1.message)

      // Update route stop — filter by both id and job_id to prevent stop/job mismatch
      if (stopId) {
        const { error: e2 } = await db.from("route_stops").update({
          status: "completed",
          actual_finish: now,
        }).eq("id", stopId).eq("job_id", job.id)
        if (e2) throw new Error(e2.message)
      }

      // Insert time log
      const startIso = new Date(startMs ?? Date.now()).toISOString()
      const { error: e3 } = await db.from("time_logs").insert({
        job_id:      job.id,
        user_id:     currentUser.id,
        start_time:  startIso,
        end_time:    now,
        duration_min: elapsedMin,
        notes:       notes || null,
        business_id: job.business_id,
      })
      if (e3) throw new Error(e3.message)

      // Insert activity log
      const { error: e4 } = await db.from("activity_logs").insert({
        entity_type: "job",
        entity_id:   job.id,
        action_type: "completed",
        user_id:     currentUser.id,
        business_id: job.business_id,
        metadata:    { notes: notes || null, duration_min: elapsedMin },
      })
      if (e4) throw new Error(e4.message)

      toast.success("Job completed.")
      // Fire-and-forget — email failure must not block navigation
      fetch(`/api/jobs/${job.id}/completion-email`, { method: "POST" }).catch(() => {})
      router.push("/crew/today")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to complete job.")
      setSubmitting(false)
      setSubmittingAction(null)
    }
  }

  // ── Skip flow ──────────────────────────────────────────────────────────────

  async function handleSkip() {
    if (!job || !currentUser) {
      setSubmitError("Could not load crew profile for this action.")
      return
    }
    setSubmitting(true)
    setSubmittingAction("skip")
    setSubmitError(null)

    const supabase = createClient()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const db = supabase as any
    const now = new Date().toISOString()
    localStorage.removeItem(`job-start-${jobId}`)

    try {
      const { error: s1 } = await db.from("jobs").update({ status: "skipped" }).eq("id", job.id)
      if (s1) throw new Error(s1.message)

      if (stopId) {
        // Filter by both id and job_id to prevent stop/job mismatch from crafted URLs
        const { error: s2 } = await db.from("route_stops").update({
          status: "skipped",
          actual_finish: now,
        }).eq("id", stopId).eq("job_id", job.id)
        if (s2) throw new Error(s2.message)
      }

      const { error: s3 } = await db.from("activity_logs").insert({
        entity_type: "job",
        entity_id:   job.id,
        action_type: "skipped",
        user_id:     currentUser.id,
        business_id: job.business_id,
        metadata:    { reason: skipReason },
      })
      if (s3) throw new Error(s3.message)

      toast.success("Job skipped.")
      router.push("/crew/today")
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to skip job.")
      setSubmitting(false)
      setSubmittingAction(null)
    }
  }

  // ── Checklist helpers ──────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function buildChecklist(job: any): string[] {
    // Priority: job description → property service instructions → property-level service instructions
    const instructions: string =
      job?.description ??
      job?.property_service?.instructions ??
      job?.property?.property_services?.[0]?.instructions ??
      ""
    if (!instructions) {
      const svcName: string =
        job?.property_service?.service_type?.name ??
        job?.property?.property_services?.[0]?.service_type?.name ??
        ""
      if (svcName.toLowerCase().includes("mow"))
        return ["Mow all lawn areas", "Edge along paths and borders", "Blow clippings off hard surfaces", "Check for debris or obstacles"]
      return [
        svcName ? `Complete ${svcName}` : "Complete assigned service",
        "Check area for issues",
        "Clean up before leaving",
      ]
    }
    return instructions
      .split("\n")
      .map((l: string) => l.trim())
      .filter(Boolean)
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (error || !job) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 px-6 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
        <p className="text-base font-medium">{error ?? "Job not found."}</p>
        <Button variant="outline" onClick={() => setReloadKey((v) => v + 1)}>
          Retry
        </Button>
      </div>
    )
  }

  const property       = job.property
  const client         = job.client
  // Primary: the specific service this job was created for
  const svc            = job.property_service?.service_type
  // Fallback: all services configured for this property (shown when job has no linked service)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const propertySvcs: any[] = svc ? [] : (property?.property_services ?? [])
  const hasAccessInfo  = property?.access_notes || property?.gate_code || property?.pet_notes
  const checklistItems = buildChecklist(job)
  const alreadyDone    = job.status === "completed" || job.status === "skipped"
  const photosReady    = !job.photo_required || (!!beforeUrl && !!afterUrl)

  return (
    <>
      {/* ── Main scrollable content ── */}
      <div className="flex flex-col gap-0 pb-36">

        {/* Header card */}
        <div className="border-b border-border bg-background px-4 py-4">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-foreground leading-tight">
                {client?.name ?? "Client"}
              </h1>
              {job.title && (
                <p className="mt-0.5 text-sm font-medium text-foreground">{job.title}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-1">
                {svc?.name ? (
                  <Badge variant="secondary" className="text-xs font-medium">
                    {svc.name}
                  </Badge>
                ) : job.title ? (
                  <Badge variant="secondary" className="text-xs font-medium">
                    One-Off Job
                  </Badge>
                ) : propertySvcs.length > 0 ? (
                  propertySvcs.map((ps) =>
                    ps.service_type?.name ? (
                      <Badge key={ps.id} variant="secondary" className="text-xs font-medium">
                        {ps.service_type.name}
                      </Badge>
                    ) : null
                  )
                ) : (
                  <span className="text-xs text-muted-foreground">No service assigned</span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{property?.address ?? "No address"}</p>
              {property?.lawn_size && (
                <p className="mt-0.5 text-xs text-muted-foreground">Lawn size: {property.lawn_size}</p>
              )}
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1">
              {alreadyDone && (
                <Badge variant={job.status === "completed" ? "outline" : "destructive"} className="capitalize text-xs">
                  {job.status}
                </Badge>
              )}
              <span className="text-xs text-muted-foreground">
                Est. {job.estimated_duration_min}m
              </span>
            </div>
          </div>

          {/* Access notes toggle */}
          {hasAccessInfo && (
            <button
              onClick={() => setAccessExpanded((p) => !p)}
              className="mt-3 flex w-full items-center justify-between rounded-md bg-muted/60 px-3 py-2 text-sm font-medium text-foreground"
            >
              <span>Access info</span>
              {accessExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
          )}
          {accessExpanded && hasAccessInfo && (
            <div className="mt-1 rounded-md border border-border bg-muted/30 px-3 py-3 text-sm space-y-1.5">
              {property?.access_notes && (
                <p><span className="font-medium">Access: </span>{property.access_notes}</p>
              )}
              {property?.gate_code && (
                <p><span className="font-medium">Gate code: </span>{property.gate_code}</p>
              )}
              {property?.pet_notes && (
                <p><span className="font-medium">Pets: </span>{property.pet_notes}</p>
              )}
            </div>
          )}
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Time on site:</span>
          <span className="text-sm font-semibold text-foreground tabular-nums">
            {formatElapsed(elapsedSec)}
          </span>
        </div>

        {/* Checklist */}
        <div className="border-b border-border px-4 py-4">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Checklist</h2>
          <div className="flex flex-col gap-3">
            {checklistItems.map((item, i) => (
              <button
                key={i}
                onClick={() => setChecklist((prev) => ({ ...prev, [i]: !prev[i] }))}
                className="flex items-start gap-3 text-left"
              >
                {checklist[i] ? (
                  <CheckSquare className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
                ) : (
                  <Square className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
                )}
                <span className={`text-sm leading-snug ${checklist[i] ? "line-through text-muted-foreground" : "text-foreground"}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Photos */}
        {currentUser && (
          <div className="border-b border-border px-4 py-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">
              Photos
              {job.photo_required && (
                <span className="ml-2 text-xs font-normal text-destructive">Required</span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-3">
              <PhotoUpload
                jobId={job.id}
                propertyId={job.property?.id ?? ""}
                businessId={job.business_id}
                userId={currentUser?.id ?? ""}
                photoType="before"
                required={job.photo_required}
                onUploadComplete={setBeforeUrl}
              />
              <PhotoUpload
                jobId={job.id}
                propertyId={job.property?.id ?? ""}
                businessId={job.business_id}
                userId={currentUser?.id ?? ""}
                photoType="after"
                required={job.photo_required}
                onUploadComplete={setAfterUrl}
              />
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-4 py-4">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Notes / Issues</h2>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add notes about the visit, issues found, or anything else the owner should know…"
            rows={4}
            className="resize-none text-base"
          />
        </div>
      </div>

      {/* ── Sticky bottom action bar ── */}
      {!alreadyDone && (
        <div className="fixed bottom-20 left-0 right-0 z-20 border-t border-border bg-background px-4 py-3 space-y-2">
          {submitError && (
            <p className="flex items-center gap-1.5 text-xs text-destructive">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {submitError}
            </p>
          )}

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="h-12 flex-none"
              onClick={() => setShowSkipSheet(true)}
              disabled={submitting}
            >
              Skip
            </Button>
            <Button
              className="h-12 flex-1"
              onClick={handleComplete}
              disabled={submitting || !photosReady}
            >
              {submitting ? (
                <span className="flex items-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Saving…
                </span>
              ) : (
                "Complete Job"
              )}
            </Button>
          </div>
          {submitting && submittingAction && (
            <div className="text-center">
              <Badge variant="secondary" className="text-xs">
                {submittingAction === "complete" ? "Completing job..." : "Skipping job..."}
              </Badge>
            </div>
          )}

          {job.photo_required && (!beforeUrl || !afterUrl) && (
            <p className="text-center text-xs text-muted-foreground">
              Upload both photos to enable completion
            </p>
          )}
        </div>
      )}

      {/* ── Skip sheet (modal overlay) ── */}
      {showSkipSheet && (
        <div className="fixed inset-x-0 top-0 bottom-20 z-[60]">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setShowSkipSheet(false)}
          />
          <div className="relative z-10 flex h-full w-full flex-col bg-background">
            <div className="border-b border-border px-4 py-4">
              <h2 className="text-base font-semibold text-foreground">Skip this job?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Select a reason:</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="flex flex-col gap-2">
                {SKIP_REASONS.map((reason) => (
                  <button
                    key={reason}
                    onClick={() => setSkipReason(reason)}
                    className={`flex min-h-11 items-center rounded-lg border px-4 py-2 text-sm font-medium transition-colors ${
                      skipReason === reason
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-foreground hover:bg-muted"
                    }`}
                  >
                    {reason}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-border bg-background px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="h-12 flex-1"
                  onClick={() => setShowSkipSheet(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  className="h-12 flex-1"
                  onClick={handleSkip}
                  disabled={submitting}
                >
                  {submittingAction === "skip" ? "Skipping…" : "Skip Job"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
