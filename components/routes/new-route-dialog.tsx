"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createRoute } from "@/app/actions/routes"
import { toast } from "sonner"

type Crew = { id: string; name: string }

interface NewRouteDialogProps {
  crews: Crew[]
}

export function NewRouteDialog({ crews }: NewRouteDialogProps) {
  const [open, setOpen] = useState(false)
  const [crewId, setCrewId] = useState(crews[0]?.id ?? "")
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10))
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!crewId || !date) return

    startTransition(async () => {
      const result = await createRoute({ crew_id: crewId, route_date: date })
      if (result.success && result.routeId) {
        toast.success("Route created.")
        setOpen(false)
        router.push(`/routes/${result.routeId}`)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (!open) {
    return (
      <Button size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" />
        New Route
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-lg space-y-5">
        <div>
          <h2 className="text-base font-semibold text-foreground">New Route</h2>
          <p className="text-sm text-muted-foreground">Assign a crew and pick a date.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="crew">
              Crew
            </label>
            {crews.length === 0 ? (
              <p className="text-sm text-destructive">No active crews. Add one in Crews &amp; Team first.</p>
            ) : (
              <select
                id="crew"
                value={crewId}
                onChange={(e) => setCrewId(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                required
              >
                {crews.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground" htmlFor="date">
              Date
            </label>
            <input
              id="date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isPending || crews.length === 0}>
              {isPending ? "Creating…" : "Create Route"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
