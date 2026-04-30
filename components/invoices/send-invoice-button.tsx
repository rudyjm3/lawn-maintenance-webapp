"use client"

import { useTransition } from "react"
import { Send } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { sendInvoice } from "@/app/actions/invoices"

interface Props {
  invoiceId: string
}

export function SendInvoiceButton({ invoiceId }: Props) {
  const [isPending, startTransition] = useTransition()

  function handleSend() {
    if (!confirm("Send this invoice to the client via email?")) return
    startTransition(async () => {
      const result = await sendInvoice(invoiceId)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <Button onClick={handleSend} disabled={isPending}>
      <Send className="h-4 w-4 mr-1.5" />
      {isPending ? "Sending…" : "Send Invoice"}
    </Button>
  )
}
