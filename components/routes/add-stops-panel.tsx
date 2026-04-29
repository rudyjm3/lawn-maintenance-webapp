"use client"

import { useTransition } from "react"
import { Plus, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addJobToRoute } from "@/app/actions/routes"
import { formatDuration } from "@/lib/dates"
import { toast } from "sonner"

type UnroutedJob = {
  id: string
  estimated_duration_min: number
  client: { id: string; name: string | null } | null
  property: { id: string; address: string | null } | null
  property_service: { service_type: { id: string; name: string } | null } | null
}

interface AddStopsPanelProps {
  routeId: string
  unroutedJobs: UnroutedJob[]
}

function AddJobRow({ routeId, job }: { routeId: string; job: UnroutedJob }) {
  const [isPending, startTransition] = useTransition()

  function handleAdd() {
    startTransition(async () => {
      const result = await addJobToRoute(routeId, job.id)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border bg-muted/30 px-4 py-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">
          {job.client?.name ?? "Unknown client"}
        </p>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          {job.property?.address && (
            <span className="truncate">{job.property.address}</span>
          )}
          {job.property_service?.service_type?.name && (
            <span className="font-medium text-foreground">
              {job.property_service.service_type.name}
            </span>
          )}
          {job.estimated_duration_min > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(job.estimated_duration_min)}
            </span>
          )}
        </div>
      </div>
      <Button
        size="sm"
        variant="outline"
        className="shrink-0 gap-1.5"
        onClick={handleAdd}
        disabled={isPending}
      >
        <Plus className="h-3.5 w-3.5" />
        Add
      </Button>
    </div>
  )
}

export function AddStopsPanel({ routeId, unroutedJobs }: AddStopsPanelProps) {
  if (unroutedJobs.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {unroutedJobs.length} job{unroutedJobs.length !== 1 ? "s" : ""} not on this route
      </p>
      {unroutedJobs.map((job) => (
        <AddJobRow key={job.id} routeId={routeId} job={job} />
      ))}
    </div>
  )
}
