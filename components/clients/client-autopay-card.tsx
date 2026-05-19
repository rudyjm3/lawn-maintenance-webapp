"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { createAutopaySetupSession, setClientAutopayEnabled } from "@/app/actions/billing-settings"

interface Props {
  clientId: string
  autopayEnabled: boolean
  paymentMethodBrand: string | null
  paymentMethodLast4: string | null
}

export function ClientAutopayCard({
  clientId,
  autopayEnabled,
  paymentMethodBrand,
  paymentMethodLast4,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function toggleAutopay(enabled: boolean) {
    startTransition(async () => {
      const result = await setClientAutopayEnabled({ clientId, enabled })
      if (!result.success) {
        toast.error(result.message)
        return
      }
      toast.success(result.message)
      router.refresh()
    })
  }

  function setupMethod() {
    startTransition(async () => {
      const result = await createAutopaySetupSession({ clientId })
      if (!result.success || !result.setupUrl) {
        toast.error(result.message)
        return
      }
      window.location.href = result.setupUrl
    })
  }

  const paymentLabel = paymentMethodLast4
    ? `${paymentMethodBrand?.toUpperCase() ?? "Card"} **** ${paymentMethodLast4}`
    : "No payment method on file"

  return (
    <div className="rounded-xl border border-border bg-card p-5 space-y-3">
      <h3 className="text-sm font-semibold text-foreground">Autopay</h3>
      <p className="text-sm text-muted-foreground">{paymentLabel}</p>
      <div className="flex flex-wrap gap-2">
        <Button
          variant={autopayEnabled ? "secondary" : "default"}
          size="sm"
          disabled={isPending}
          onClick={() => toggleAutopay(!autopayEnabled)}
        >
          {autopayEnabled ? "Disable Autopay" : "Enable Autopay"}
        </Button>
        <Button variant="outline" size="sm" disabled={isPending} onClick={setupMethod}>
          {paymentMethodLast4 ? "Update Payment Method" : "Setup Payment Method"}
        </Button>
      </div>
    </div>
  )
}
