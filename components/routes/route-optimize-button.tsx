"use client"

import { useTransition } from "react"
import { Wand2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { optimizeRoute } from "@/app/actions/routes"
import { toast } from "sonner"

interface RouteOptimizeButtonProps {
  routeId: string
  isLocked: boolean
  geocodedStopCount: number
}

export function RouteOptimizeButton({ routeId, isLocked, geocodedStopCount }: RouteOptimizeButtonProps) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await optimizeRoute(routeId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (isLocked || geocodedStopCount < 2) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <Wand2 className="mr-1.5 h-3.5 w-3.5" />
      {pending ? "Optimizing…" : "Optimize Order"}
    </Button>
  )
}
