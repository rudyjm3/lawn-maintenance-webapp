"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { CalendarDays, ChevronDown, ChevronUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { saveRecurrenceRule } from "@/app/actions/service-catalog"
import { computeOccurrences } from "@/lib/scheduling/recurrence"
import { ScheduleExceptionsList } from "@/components/service-catalog/schedule-exceptions-list"
import type { RecurrenceRule } from "@/types"
import { cn } from "@/lib/utils"

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

function formatPreviewDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

interface FormValues {
  frequency_type: string
  interval: string
  start_date: string
  end_date: string
}

interface RecurrenceRuleDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  propertyServiceId: string
  clientId: string
  existingRule?: RecurrenceRule
}

export function RecurrenceRuleDialog({
  open,
  onOpenChange,
  propertyServiceId,
  clientId,
  existingRule,
}: RecurrenceRuleDialogProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedDow, setSelectedDow] = useState<number | null>(null)
  const [selectedMonths, setSelectedMonths] = useState<number[]>([])
  const [exceptionsExpanded, setExceptionsExpanded] = useState(false)
  const isEditing = !!existingRule

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      frequency_type: "weekly",
      interval: "2",
      start_date: "",
      end_date: "",
    },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchFrequency = watch("frequency_type")
  const watchInterval = watch("interval")
  const watchStartDate = watch("start_date")
  const watchEndDate = watch("end_date")

  useEffect(() => {
    if (open) {
      if (existingRule) {
        reset({
          frequency_type: existingRule.frequency_type,
          interval: String(existingRule.interval),
          start_date: existingRule.start_date,
          end_date: existingRule.end_date ?? "",
        })
        setSelectedDow(existingRule.day_of_week ?? null)
        setSelectedMonths(existingRule.active_months ?? [])
      } else {
        reset({ frequency_type: "weekly", interval: "2", start_date: "", end_date: "" })
        setSelectedDow(null)
        setSelectedMonths([])
      }
      setExceptionsExpanded(false)
    }
  }, [open, existingRule, reset])

  const previewDates = useMemo(() => {
    if (!watchStartDate) return []
    try {
      return computeOccurrences(
        {
          frequency_type: watchFrequency as RecurrenceRule["frequency_type"],
          interval: Number(watchInterval) || 1,
          day_of_week: selectedDow,
          start_date: watchStartDate,
          end_date: watchEndDate || null,
          active_months: selectedMonths.length > 0 ? selectedMonths : null,
        },
        10,
        existingRule?.exceptions ?? []
      )
    } catch {
      return []
    }
  }, [watchFrequency, watchInterval, selectedDow, watchStartDate, watchEndDate, selectedMonths, existingRule])

  function toggleMonth(m: number) {
    setSelectedMonths((prev) =>
      prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m].sort((a, b) => a - b)
    )
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    const result = await saveRecurrenceRule({
      id: existingRule?.id,
      property_service_id: propertyServiceId,
      frequency_type: data.frequency_type as RecurrenceRule["frequency_type"],
      interval: Number(data.interval) || 1,
      day_of_week: selectedDow,
      start_date: data.start_date,
      end_date: data.end_date || null,
      active_months: selectedMonths.length > 0 ? selectedMonths : null,
      client_id: clientId,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            {isEditing ? "Edit Schedule" : "Set Up Schedule"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-0 sm:flex-row sm:gap-0">
          {/* ── Form (left) ── */}
          <form
            id="recurrence-form"
            onSubmit={handleSubmit(onSubmit)}
            className="flex flex-col gap-4 py-2 sm:w-[55%] sm:pr-5"
          >
            {/* Frequency */}
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select
                key={existingRule?.frequency_type ?? "weekly"}
                defaultValue={existingRule?.frequency_type ?? "weekly"}
                onValueChange={(v) => setValue("frequency_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly (every 2 weeks)</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom interval</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Interval (custom only) */}
            {watchFrequency === "custom" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="interval">Every X weeks</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="interval"
                    type="number"
                    min={2}
                    step={1}
                    className="w-24"
                    {...register("interval")}
                  />
                  <span className="text-sm text-muted-foreground">weeks</span>
                </div>
              </div>
            )}

            {/* Day of week */}
            <div className="flex flex-col gap-1.5">
              <Label>Day of week</Label>
              <div className="flex flex-wrap gap-1.5">
                {DAYS.map((day, idx) => (
                  <button
                    key={day}
                    type="button"
                    onClick={() => setSelectedDow(selectedDow === idx ? null : idx)}
                    className={cn(
                      "rounded-md border px-2.5 py-1 text-xs font-medium transition-colors",
                      selectedDow === idx
                        ? "bg-primary text-primary-foreground border-primary"
                        : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                    )}
                  >
                    {day}
                  </button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Leave unset to use the start date&apos;s day of week
              </p>
            </div>

            {/* Start / End date */}
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="start_date">
                  Start date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="start_date"
                  type="date"
                  {...register("start_date", { required: true })}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="end_date">End date (optional)</Label>
                <div className="relative">
                  <Input
                    id="end_date"
                    type="date"
                    {...register("end_date")}
                  />
                  {watchEndDate && (
                    <button
                      type="button"
                      onClick={() => setValue("end_date", "")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label="Clear end date"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Active months */}
            <div className="flex flex-col gap-1.5">
              <Label>Active months (leave all off for year-round)</Label>
              <div className="grid grid-cols-6 gap-1.5">
                {MONTHS.map((m, idx) => {
                  const num = idx + 1
                  return (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMonth(num)}
                      className={cn(
                        "rounded-md border px-1 py-1 text-xs font-medium transition-colors",
                        selectedMonths.includes(num)
                          ? "bg-primary text-primary-foreground border-primary"
                          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
                      )}
                    >
                      {m}
                    </button>
                  )
                })}
              </div>
            </div>
          </form>

          {/* ── Divider ── */}
          <Separator orientation="vertical" className="hidden sm:block mx-0 self-stretch" />
          <Separator orientation="horizontal" className="block sm:hidden my-3" />

          {/* ── Preview (right) ── */}
          <div className="flex flex-col gap-3 py-2 sm:w-[45%] sm:pl-5">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Next {previewDates.length > 0 ? previewDates.length : "10"} Occurrences
            </p>
            {!watchStartDate ? (
              <p className="text-xs text-muted-foreground">Set a start date to preview.</p>
            ) : previewDates.length === 0 ? (
              <p className="text-xs text-amber-600">
                No occurrences found — check active months or end date.
              </p>
            ) : (
              <div className="space-y-1.5">
                {previewDates.map((d, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="w-4 text-right text-xs text-muted-foreground">{i + 1}.</span>
                    <Badge variant="secondary" className="text-xs font-normal">
                      {formatPreviewDate(d)}
                    </Badge>
                  </div>
                ))}
              </div>
            )}

            {/* Exceptions (collapsible, edit mode only) */}
            {isEditing && existingRule && (
              <div className="mt-2 border-t border-border pt-3">
                <button
                  type="button"
                  onClick={() => setExceptionsExpanded((v) => !v)}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  {exceptionsExpanded ? (
                    <ChevronUp className="h-3.5 w-3.5" />
                  ) : (
                    <ChevronDown className="h-3.5 w-3.5" />
                  )}
                  {existingRule.exceptions?.length
                    ? `${existingRule.exceptions.length} exception${existingRule.exceptions.length !== 1 ? "s" : ""}`
                    : "Manage exceptions"}
                </button>
                {exceptionsExpanded && (
                  <div className="mt-3">
                    <ScheduleExceptionsList
                      rule={existingRule}
                      upcomingDates={previewDates}
                      clientId={clientId}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" type="button" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="submit" form="recurrence-form" disabled={isSubmitting}>
            <CalendarDays className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : isEditing ? "Save Schedule" : "Set Schedule"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
