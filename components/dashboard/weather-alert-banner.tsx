"use client"

import { useState } from "react"
import { CloudRain, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeatherReschedulePanel } from "@/components/planner/weather-reschedule-panel"

export interface AffectedDay {
  date: string
  label: string
  jobCount: number
  severity: "rain" | "severe"
  icon: string
  weatherLabel: string
}

export function WeatherAlertBanner({ affectedDays }: { affectedDays: AffectedDay[] }) {
  const [dismissed, setDismissed] = useState(false)
  const [activeDate, setActiveDate] = useState<string | null>(null)

  if (affectedDays.length === 0 || dismissed) return null

  const totalJobs = affectedDays.reduce((sum, d) => sum + d.jobCount, 0)
  const activeDay = affectedDays.find((d) => d.date === activeDate)

  return (
    <>
      <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/30 dark:border-amber-800 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400">
            <CloudRain className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
              {affectedDays.length} day{affectedDays.length > 1 ? "s" : ""} with weather risk this week
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-300">
              {totalJobs} job{totalJobs !== 1 ? "s" : ""} at risk —{" "}
              {affectedDays.map((d) => d.icon + " " + d.label).join(", ")}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {affectedDays.length === 1 ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60 text-xs"
              onClick={() => setActiveDate(affectedDays[0]!.date)}
            >
              Reschedule affected jobs
            </Button>
          ) : (
            affectedDays.map((day) => (
              <Button
                key={day.date}
                size="sm"
                variant="outline"
                className="h-8 border-amber-300 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:border-amber-700 dark:bg-amber-900/40 dark:text-amber-200 dark:hover:bg-amber-900/60 text-xs"
                onClick={() => setActiveDate(day.date)}
              >
                {day.icon} {day.label}
              </Button>
            ))
          )}
          <button
            onClick={() => setDismissed(true)}
            className="text-amber-600 hover:text-amber-800 dark:text-amber-400 dark:hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {activeDay && (
        <WeatherReschedulePanel
          fromDate={activeDay.date}
          open={activeDate !== null}
          onOpenChange={(open) => { if (!open) setActiveDate(null) }}
          weatherLabel={`${activeDay.icon} ${activeDay.weatherLabel} — ${activeDay.jobCount} job${activeDay.jobCount !== 1 ? "s" : ""} affected`}
        />
      )}
    </>
  )
}
