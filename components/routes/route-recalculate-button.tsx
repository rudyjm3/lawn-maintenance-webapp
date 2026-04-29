"use client"

import { useTransition } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { recalculateDriveTimes } from "@/app/actions/routes"
import { toast } from "sonner"

interface RouteRecalculateButtonProps {
  routeId: string
  isLocked: boolean
}

export function RouteRecalculateButton({ routeId, isLocked }: RouteRecalculateButtonProps) {
  const [pending, startTransition] = useTransition()

  function handleClick() {
    startTransition(async () => {
      const result = await recalculateDriveTimes(routeId)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  if (isLocked) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleClick}
      disabled={pending}
    >
      <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${pending ? "animate-spin" : ""}`} />
      {pending ? "Calculating…" : "Recalculate"}
    </Button>
  )
}
