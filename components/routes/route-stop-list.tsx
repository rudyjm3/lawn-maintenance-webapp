"use client"

import { useState, useTransition } from "react"
import { GripVertical, X, MapPin, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { reorderStops, removeStop } from "@/app/actions/routes"
import { formatDuration, formatTime } from "@/lib/dates"
import { toast } from "sonner"
import type { RouteStop } from "@/types"

interface RouteStopListProps {
  routeId: string
  stops: RouteStop[]
  isLocked: boolean
}

export function RouteStopList({ routeId, stops: initialStops, isLocked }: RouteStopListProps) {
  const [stops, setStops] = useState(initialStops)
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [overIndex, setOverIndex] = useState<number | null>(null)
  const [reorderPending, startReorder] = useTransition()
  const [removePending, startRemove] = useTransition()

  function handleDragStart(index: number) {
    setDragIndex(index)
  }

  function handleDragOver(e: React.DragEvent, index: number) {
    e.preventDefault()
    setOverIndex(index)
  }

  function handleDrop(e: React.DragEvent, dropIndex: number) {
    e.preventDefault()
    if (dragIndex === null || dragIndex === dropIndex) {
      setDragIndex(null)
      setOverIndex(null)
      return
    }

    const snapshot = stops
    const reordered = [...stops]
    const [moved] = reordered.splice(dragIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    setStops(reordered)
    setDragIndex(null)
    setOverIndex(null)

    startReorder(async () => {
      const result = await reorderStops(routeId, reordered.map((s) => s.id))
      if (!result.success) {
        setStops(snapshot)
        toast.error(result.message)
      }
    })
  }

  function handleDragEnd() {
    setDragIndex(null)
    setOverIndex(null)
  }

  function handleRemove(stopId: string) {
    const snapshot = stops
    setStops((prev) => prev.filter((s) => s.id !== stopId))

    startRemove(async () => {
      const result = await removeStop(routeId, stopId)
      if (!result.success) {
        setStops(snapshot)
        toast.error(result.message)
      } else {
        toast.success(result.message)
      }
    })
  }

  if (stops.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <MapPin className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">No stops yet</p>
        <p className="text-xs text-muted-foreground">
          {isLocked ? "Unlock the route to add stops." : "Jobs will appear here once added to this route."}
        </p>
      </div>
    )
  }

  const isPending = reorderPending || removePending

  return (
    <div className="space-y-2">
      {stops.map((stop, index) => {
        const job = stop.job
        const isDragging = dragIndex === index
        const isOver = overIndex === index && dragIndex !== index

        return (
          <div
            key={stop.id}
            draggable={!isLocked}
            onDragStart={() => handleDragStart(index)}
            onDragOver={(e) => handleDragOver(e, index)}
            onDrop={(e) => handleDrop(e, index)}
            onDragEnd={handleDragEnd}
            className={`group flex items-start gap-3 rounded-xl border bg-card p-4 transition-all ${
              isDragging ? "opacity-40 scale-95" : ""
            } ${isOver ? "border-primary ring-1 ring-primary" : "border-border"} ${
              !isLocked ? "cursor-grab active:cursor-grabbing" : ""
            }`}
          >
            <div className="flex items-center gap-2 pt-0.5">
              {!isLocked && (
                <GripVertical className="h-4 w-4 text-muted-foreground/50 shrink-0" />
              )}
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground shrink-0">
                {index + 1}
              </div>
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">
                    {job?.client?.name ?? "Unknown client"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {job?.property?.address ?? "No address"}
                  </p>
                </div>
                {!isLocked && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                    onClick={() => handleRemove(stop.id)}
                    disabled={isPending}
                  >
                    <X className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                {job?.service_type?.name && (
                  <span className="font-medium text-foreground">{job.service_type.name}</span>
                )}
                {job?.estimated_duration_min != null && (
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatDuration(job.estimated_duration_min)} job
                  </span>
                )}
                {stop.travel_time_min > 0 && (
                  <span>+{formatDuration(stop.travel_time_min)} drive</span>
                )}
                {stop.est_arrival && (
                  <span>ETA {formatTime(stop.est_arrival)}</span>
                )}
              </div>
            </div>
          </div>
        )
      })}

      {isPending && (
        <p className="text-center text-xs text-muted-foreground">Saving...</p>
      )}
    </div>
  )
}
