"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
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
import {
  saveScheduleException,
  deleteScheduleException,
} from "@/app/actions/service-catalog"
import type { RecurrenceRule, ScheduleException } from "@/types"

const EXCEPTION_TYPE_CONFIG = {
  skip: { label: "Skip", className: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950/50 dark:text-amber-400" },
  reschedule: { label: "Reschedule", className: "bg-blue-100 text-blue-700 border-transparent dark:bg-blue-950/50 dark:text-blue-400" },
  cancel: { label: "Cancel", className: "bg-red-100 text-red-700 border-transparent dark:bg-red-950/50 dark:text-red-400" },
}

function formatUTCDate(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-US", {
    ...options,
    timeZone: "UTC",
  }).format(new Date(`${isoDate}T00:00:00Z`))
}

function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

interface FormValues {
  original_date: string
  exception_type: string
  new_date: string
  reason: string
}

interface ScheduleExceptionsListProps {
  rule: RecurrenceRule
  upcomingDates: Date[]
  clientId: string
}

export function ScheduleExceptionsList({
  rule,
  upcomingDates,
  clientId,
}: ScheduleExceptionsListProps) {
  const [addOpen, setAddOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const exceptions = rule.exceptions ?? []

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: { original_date: "", exception_type: "skip", new_date: "", reason: "" },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const watchedType = watch("exception_type")

  const existingExceptionDates = new Set(exceptions.map((e) => e.original_date))
  const availableDates = upcomingDates.filter(
    (d) => !existingExceptionDates.has(toISODate(d))
  )

  async function handleDelete(id: string) {
    setDeletingId(id)
    const result = await deleteScheduleException(id, clientId)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.message)
    } else {
      toast.success(result.message)
    }
  }

  async function onSubmit(data: FormValues) {
    setIsSubmitting(true)
    const result = await saveScheduleException({
      recurrence_rule_id: rule.id,
      original_date: data.original_date,
      exception_type: data.exception_type as ScheduleException["exception_type"],
      new_date: data.exception_type === "reschedule" ? data.new_date || null : null,
      reason: data.reason || null,
      client_id: clientId,
    })
    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }
    toast.success(result.message)
    reset()
    setAddOpen(false)
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Exceptions
        </p>
        {availableDates.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { reset(); setAddOpen(true) }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>

      {exceptions.length === 0 ? (
        <p className="text-xs text-muted-foreground">No exceptions — all occurrences are active.</p>
      ) : (
        <div className="space-y-1.5">
          {exceptions.map((ex) => {
            const cfg = EXCEPTION_TYPE_CONFIG[ex.exception_type]
            return (
              <div
                key={ex.id}
                className="group flex items-start justify-between gap-3 rounded-lg border border-border bg-muted/20 px-3 py-2"
              >
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-medium text-foreground">
                    {formatUTCDate(ex.original_date, {
                      weekday: "short",
                      month: "short",
                      day: "numeric",
                    })}
                  </span>
                  <Badge variant="outline" className={`text-xs ${cfg.className}`}>
                    {cfg.label}
                  </Badge>
                  {ex.exception_type === "reschedule" && ex.new_date && (
                    <span className="text-xs text-muted-foreground">
                      → {formatUTCDate(ex.new_date, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                  {ex.reason && (
                    <span className="text-xs text-muted-foreground italic">&quot;{ex.reason}&quot;</span>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(ex.id)}
                  disabled={deletingId === ex.id}
                  className="shrink-0 rounded p-0.5 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive transition-all"
                  aria-label="Remove exception"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )
          })}
        </div>
      )}

      {/* Add exception dialog */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Exception</DialogTitle>
          </DialogHeader>

          <form id="exception-form" onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4 py-2">
            <div className="flex flex-col gap-1.5">
              <Label>Date <span className="text-destructive">*</span></Label>
              <Select onValueChange={(v) => setValue("original_date", v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an upcoming date…" />
                </SelectTrigger>
                <SelectContent>
                  {availableDates.map((d) => {
                    const iso = toISODate(d)
                    return (
                      <SelectItem key={iso} value={iso}>
                        {formatUTCDate(iso, {
                          weekday: "short",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
              {errors.original_date && (
                <p className="text-xs text-destructive">Date is required</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label>Exception type</Label>
              <Select
                defaultValue="skip"
                onValueChange={(v) => setValue("exception_type", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="skip">Skip — omit this occurrence</SelectItem>
                  <SelectItem value="reschedule">Reschedule — move to a new date</SelectItem>
                  <SelectItem value="cancel">Cancel — permanently remove</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {watchedType === "reschedule" && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="new_date">
                  New date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="new_date"
                  type="date"
                  {...register("new_date", {
                    required: watchedType === "reschedule" ? "New date required for reschedule" : false,
                  })}
                />
                {errors.new_date && (
                  <p className="text-xs text-destructive">{errors.new_date.message}</p>
                )}
              </div>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Input
                id="reason"
                placeholder="e.g. Customer on vacation, Holiday"
                {...register("reason")}
              />
            </div>
          </form>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAddOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" form="exception-form" disabled={isSubmitting}>
              {isSubmitting ? "Saving…" : "Save Exception"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
