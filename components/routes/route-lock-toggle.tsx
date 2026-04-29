"use client"

import { useTransition } from "react"
import { Lock, Unlock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { setRouteLocked } from "@/app/actions/routes"
import { toast } from "sonner"

interface RouteLockToggleProps {
  routeId: string
  isLocked: boolean
}

export function RouteLockToggle({ routeId, isLocked }: RouteLockToggleProps) {
  const [pending, startTransition] = useTransition()

  function handleToggle() {
    startTransition(async () => {
      const result = await setRouteLocked(routeId, !isLocked)
      if (result.success) {
        toast.success(result.message)
      } else {
        toast.error(result.message)
      }
    })
  }

  return (
    <Button
      variant={isLocked ? "outline" : "secondary"}
      size="sm"
      onClick={handleToggle}
      disabled={pending}
    >
      {isLocked ? (
        <>
          <Unlock className="mr-1.5 h-3.5 w-3.5" />
          Unlock
        </>
      ) : (
        <>
          <Lock className="mr-1.5 h-3.5 w-3.5" />
          Lock Route
        </>
      )}
    </Button>
  )
}
