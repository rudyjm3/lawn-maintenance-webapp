"use client"

import { useState, useTransition } from "react"
import { Clock } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { saveWorkScheduleSettings } from "@/app/actions/settings"
import { type WorkScheduleSettings, DEFAULT_WORK_SCHEDULE } from "@/types"

interface Props {
  settings: WorkScheduleSettings
}

export function WorkScheduleCard({ settings }: Props) {
  const [values, setValues] = useState<WorkScheduleSettings>(settings)
  const [isPending, startTransition] = useTransition()

  function set<K extends keyof WorkScheduleSettings>(key: K, raw: string) {
    setValues((prev) => ({
      ...prev,
      [key]: key === "schedule_lunch_duration_min" ? (raw === "" ? 0 : Number(raw)) : raw,
    }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    startTransition(async () => {
      const result = await saveWorkScheduleSettings(values)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  function handleReset() {
    setValues(DEFAULT_WORK_SCHEDULE)
    startTransition(async () => {
      const result = await saveWorkScheduleSettings(DEFAULT_WORK_SCHEDULE)
      if (result.success) {
        toast.success("Work schedule reset to defaults.")
      } else {
        toast.error(result.message)
      }
    })
  }

  const workMinutes =
    timeToMins(values.schedule_end_time) -
    timeToMins(values.schedule_start_time) -
    values.schedule_lunch_duration_min

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-5">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Clock className="h-4.5 w-4.5 text-primary" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">Work Schedule</p>
          <p className="text-xs text-muted-foreground">
            Used to calculate estimated arrival times on routes and to check if a day's
            workload fits within your available hours.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5 border-t border-border pt-5">

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Hours</p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Work starts</Label>
              <Input
                type="time"
                value={values.schedule_start_time}
                onChange={(e) => set("schedule_start_time", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Work ends</Label>
              <Input
                type="time"
                value={values.schedule_end_time}
                onChange={(e) => set("schedule_end_time", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-xs font-semibold text-foreground uppercase tracking-wide">Lunch Break</p>
          <p className="text-xs text-muted-foreground">
            When a job arrives during the lunch window, the ETA will shift to after the break ends.
            Set duration to 0 to skip lunch calculation entirely.
          </p>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs">Lunch starts</Label>
              <Input
                type="time"
                value={values.schedule_lunch_start_time}
                onChange={(e) => set("schedule_lunch_start_time", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Lunch duration (min)</Label>
              <Input
                type="number"
                min="0"
                max="180"
                step="15"
                value={values.schedule_lunch_duration_min}
                onChange={(e) => set("schedule_lunch_duration_min", e.target.value)}
                className="h-8 text-sm"
              />
            </div>
          </div>
        </div>

        {workMinutes > 0 && (
          <div className="rounded-md bg-muted/50 border border-border px-3 py-2 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{formatMins(workMinutes)}</span> of billable
            work time per day (
            {values.schedule_start_time}–{values.schedule_end_time}
            {values.schedule_lunch_duration_min > 0 && `, minus ${values.schedule_lunch_duration_min} min lunch`}
            )
          </div>
        )}

        <div className="flex items-center justify-between pt-1 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={handleReset}
            disabled={isPending}
          >
            Reset to defaults
          </Button>
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Saving…" : "Save Schedule"}
          </Button>
        </div>
      </form>
    </div>
  )
}

function timeToMins(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number)
  return (h ?? 0) * 60 + (m ?? 0)
}

function formatMins(mins: number): string {
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return m > 0 ? `${h}h ${m}m` : `${h}h`
}
