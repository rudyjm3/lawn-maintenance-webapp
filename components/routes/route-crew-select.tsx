"use client"

import { useState, useTransition } from "react"
import { Check, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { updateRouteCrew } from "@/app/actions/routes"
import { toast } from "sonner"

type Crew = { id: string; name: string }

interface RouteCrewSelectProps {
  routeId: string
  currentCrewId: string | null
  crews: Crew[]
  isLocked: boolean
}

export function RouteCrewSelect({ routeId, currentCrewId, crews, isLocked }: RouteCrewSelectProps) {
  const [open, setOpen] = useState(false)
  const [selectedId, setSelectedId] = useState(currentCrewId)
  const [isPending, startTransition] = useTransition()

  const currentCrew = crews.find((c) => c.id === selectedId)

  function handleSelect(crewId: string) {
    if (crewId === selectedId) { setOpen(false); return }
    setSelectedId(crewId)
    setOpen(false)
    startTransition(async () => {
      const result = await updateRouteCrew(routeId, crewId)
      if (result.success) {
        toast.success(result.message)
      } else {
        setSelectedId(currentCrewId)
        toast.error(result.message)
      }
    })
  }

  if (isLocked || crews.length <= 1) {
    return (
      <span className="text-xl font-semibold text-foreground">
        {currentCrew?.name ?? "Unassigned Crew"}
      </span>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        disabled={isPending}
        className="flex items-center gap-1.5 text-xl font-semibold text-foreground hover:text-primary transition-colors"
      >
        {currentCrew?.name ?? "Unassigned Crew"}
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-full z-50 mt-1 w-48 rounded-lg border border-border bg-popover shadow-md">
            {crews.map((crew) => (
              <button
                key={crew.id}
                onClick={() => handleSelect(crew.id)}
                className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-muted/50 first:rounded-t-lg last:rounded-b-lg transition-colors"
              >
                {crew.name}
                {crew.id === selectedId && <Check className="h-3.5 w-3.5 text-primary" />}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
