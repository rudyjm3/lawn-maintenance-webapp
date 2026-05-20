"use client"

import { useTransition } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendEstimate } from "@/app/actions/estimates"

export function SendEstimateButton({ estimateId }: { estimateId: string }) {
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!confirm("Send this estimate to the client via email? The status will change to Sent.")) return
    startTransition(async () => {
      const result = await sendEstimate(estimateId)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <Button size="sm" className="gap-1.5" disabled={isPending} onClick={handleSend}>
      <Send className="h-4 w-4" />
      {isPending ? "Sending…" : "Send to Client"}
    </Button>
  )
}
