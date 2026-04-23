"use client"

import { useState, useCallback } from "react"
import { cn } from "@/lib/utils"
import { JobChip } from "./job-chip"
import { CapacityBar } from "./capacity-bar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Plus, ChevronLeft, ChevronRight, X } from "lucide-react"
import type { Job, WeekDaySnapshot } from "@/types"

const CAPACITY_MIN = 480 // 8h default

interface WeekPlannerProps {
  initialDays: WeekDaySnapshot[]
  initialUnscheduled: Job[]
}

function isoDate(base: Date, offsetDays: number): string {
  const d = new Date(base)
  d.setDate(d.getDate() + offsetDays)
  return d.toISOString().slice(0, 10)
}

function buildWeekDays(anchor: Date, allJobs: Job[]): WeekDaySnapshot[] {
  const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const todayStr = new Date().toISOString().slice(0, 10)

  return Array.from({ length: 7 }, (_, i) => {
    const date = isoDate(anchor, i)
    const jobs = allJobs.filter((j) => j.service_date === date && j.status !== "cancelled")
    const scheduledMinutes = jobs.reduce((s, j) => s + j.estimated_duration_min, 0)
    const d = new Date(date + "T12:00:00")
    return {
      date,
      label: DAY_LABELS[d.getDay()],
      isToday: date === todayStr,
      jobCount: jobs.length,
      scheduledMinutes,
      capacityMinutes: CAPACITY_MIN,
      isOverbooked: scheduledMinutes > CAPACITY_MIN,
      jobs,
    }
  })
}

export function WeekPlanner({ initialDays, initialUnscheduled }: WeekPlannerProps) {
  // All jobs in a flat mutable list (replaces DB in dev)
  const [allJobs, setAllJobs] = useState<Job[]>([
    ...initialDays.flatMap((d) => d.jobs),
    ...initialUnscheduled,
  ])
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => {
    // Start on Monday of the current week
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    return d
  })

  // Drag state
  const [draggingJobId, setDraggingJobId] = useState<string | null>(null)
  const [dropTargetDate, setDropTargetDate] = useState<string | null>(null)

  // Sidebar visibility
  const [sidebarOpen, setSidebarOpen] = useState(true)

  const days = buildWeekDays(weekAnchor, allJobs)
  const unscheduled = allJobs.filter((j) => j.service_date === null || j.service_date === undefined)

  function prevWeek() {
    setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() - 7); return n })
  }
  function nextWeek() {
    setWeekAnchor((d) => { const n = new Date(d); n.setDate(n.getDate() + 7); return n })
  }
  function goToday() {
    const d = new Date()
    const day = d.getDay()
    d.setDate(d.getDate() - (day === 0 ? 6 : day - 1))
    d.setHours(0, 0, 0, 0)
    setWeekAnchor(d)
  }

  // ── Drag-and-drop handlers ──────────────────────────────────────────────────

  const handleDragStart = useCallback((e: React.DragEvent, jobId: string) => {
    setDraggingJobId(jobId)
    e.dataTransfer.effectAllowed = "move"
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent, date: string | null) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDropTargetDate(date)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent, targetDate: string | null) => {
      e.preventDefault()
      if (!draggingJobId) return
      setAllJobs((prev) =>
        prev.map((j) =>
          j.id === draggingJobId
            ? { ...j, service_date: targetDate, status: targetDate ? "scheduled" : "unscheduled" }
            : j,
        ),
      )
      setDraggingJobId(null)
      setDropTargetDate(null)
      // TODO: persist to Supabase — supabase.from('jobs').update({ service_date: targetDate }).eq('id', draggingJobId)
    },
    [draggingJobId],
  )

  const handleDragEnd = useCallback(() => {
    setDraggingJobId(null)
    setDropTargetDate(null)
  }, [])

  // ── Week range label ────────────────────────────────────────────────────────
  const endAnchor = new Date(weekAnchor)
  endAnchor.setDate(endAnchor.getDate() + 6)
  const rangeLabel = `${weekAnchor.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${endAnchor.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

  return (
    <div className="flex h-full flex-col gap-4">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={prevWeek}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={goToday}>
            Today
          </Button>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={nextWeek}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <span className="text-sm font-medium text-foreground">{rangeLabel}</span>

        <div className="ml-auto flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs gap-1"
            onClick={() => setSidebarOpen((v) => !v)}
          >
            <span>{unscheduled.length}</span> Unscheduled
          </Button>
          <Button size="sm" className="h-8 gap-1 text-xs">
            <Plus className="h-3.5 w-3.5" />
            Add Job
          </Button>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* ── Week grid ── */}
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {days.map((day) => {
            const isDropTarget = dropTargetDate === day.date
            return (
              <div
                key={day.date}
                onDragOver={(e) => handleDragOver(e, day.date)}
                onDrop={(e) => handleDrop(e, day.date)}
                onDragLeave={() => setDropTargetDate(null)}
                className={cn(
                  "flex min-w-[120px] flex-1 flex-col rounded-xl border bg-card transition-colors",
                  day.isToday ? "border-primary/50" : "border-border",
                  isDropTarget && "border-primary bg-primary/5 ring-1 ring-primary",
                  day.isOverbooked && !isDropTarget && "border-destructive/40",
                )}
              >
                {/* Day header */}
                <div
                  className={cn(
                    "flex items-center justify-between rounded-t-xl px-3 py-2",
                    day.isToday ? "bg-primary/10" : "bg-muted/40",
                    day.isOverbooked && "bg-destructive/10",
                  )}
                >
                  <div>
                    <p
                      className={cn(
                        "text-xs font-semibold",
                        day.isToday ? "text-primary" : "text-foreground",
                        day.isOverbooked && "text-destructive",
                      )}
                    >
                      {day.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(day.date + "T12:00:00").toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                  </div>
                  {day.isOverbooked && (
                    <Badge variant="destructive" className="h-5 text-[10px] px-1.5">
                      Over
                    </Badge>
                  )}
                </div>

                {/* Capacity bar */}
                <div className="px-3 pt-2">
                  <CapacityBar
                    scheduledMinutes={day.scheduledMinutes}
                    capacityMinutes={CAPACITY_MIN}
                  />
                </div>

                {/* Job chips */}
                <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
                  {day.jobs.length === 0 && !isDropTarget && (
                    <p className="pt-2 text-center text-[11px] text-muted-foreground/50">
                      No jobs
                    </p>
                  )}
                  {day.jobs.map((job) => (
                    <JobChip
                      key={job.id}
                      job={job}
                      draggable
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>

        {/* ── Unscheduled sidebar ── */}
        {sidebarOpen && (
          <div
            className="flex w-52 shrink-0 flex-col rounded-xl border border-border bg-card"
            onDragOver={(e) => handleDragOver(e, null)}
            onDrop={(e) => handleDrop(e, null)}
            onDragLeave={() => setDropTargetDate(null)}
          >
            <div className={cn(
              "flex items-center justify-between rounded-t-xl px-3 py-2 bg-muted/40 border-b border-border",
              dropTargetDate === null && draggingJobId && "bg-primary/10",
            )}>
              <p className="text-xs font-semibold text-foreground">
                Unscheduled
                {unscheduled.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-normal text-muted-foreground">
                    {unscheduled.length}
                  </span>
                )}
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => setSidebarOpen(false)}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>

            <div className="flex flex-1 flex-col gap-1.5 overflow-y-auto p-2">
              {unscheduled.length === 0 && (
                <p className="pt-4 text-center text-xs text-muted-foreground">
                  All jobs have dates
                </p>
              )}
              {unscheduled.map((job) => (
                <JobChip
                  key={job.id}
                  job={job}
                  draggable
                  onDragStart={handleDragStart}
                />
              ))}
            </div>

            <div className="border-t border-border p-2">
              <p className="text-[11px] text-muted-foreground text-center leading-tight">
                Drag a job onto a day to schedule it
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
