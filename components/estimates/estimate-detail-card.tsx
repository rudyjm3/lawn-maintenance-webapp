"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { Send, CheckCircle, XCircle, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { EstimateStatusBadge } from "@/components/estimates/estimate-status-badge"
import { ConvertToPlanModal } from "@/components/estimates/convert-to-plan-modal"
import { updateEstimateStatus, deleteEstimate } from "@/app/actions/estimates"
import { type Estimate, type Property } from "@/types"

interface Props {
  estimate: Estimate
  properties: Property[]
  onSendEstimate?: (id: string) => void
}

export function EstimateDetailCard({ estimate, properties, onSendEstimate }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleStatus(status: Estimate["status"]) {
    startTransition(async () => {
      const result = await updateEstimateStatus(estimate.id, status)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  function handleDelete() {
    if (!confirm(`Delete estimate ${estimate.estimate_number}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteEstimate(estimate.id)
      if (result.success) {
        toast.success(result.message)
        router.push("/estimates")
      } else {
        toast.error(result.message)
      }
    })
  }

  const items = estimate.items ?? []

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 border-b border-border p-6">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-foreground">{estimate.estimate_number}</h2>
            <EstimateStatusBadge status={estimate.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            Client: <span className="text-foreground">{estimate.client?.name ?? "—"}</span>
          </p>
          {estimate.valid_until && (
            <p className="text-sm text-muted-foreground">
              Valid until:{" "}
              <span className="text-foreground">
                {new Date(estimate.valid_until).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2 justify-end">
          {estimate.status === "draft" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                disabled={isPending}
                onClick={() => onSendEstimate?.(estimate.id)}
              >
                <Send className="h-3.5 w-3.5" />
                Send
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="gap-1.5 text-destructive hover:text-destructive"
                disabled={isPending}
                onClick={handleDelete}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </Button>
            </>
          )}
          {estimate.status === "sent" && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-emerald-600 border-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/30"
                disabled={isPending}
                onClick={() => handleStatus("approved")}
              >
                <CheckCircle className="h-3.5 w-3.5" />
                Approve
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5 text-destructive border-destructive hover:bg-red-50 dark:hover:bg-red-950/30"
                disabled={isPending}
                onClick={() => handleStatus("rejected")}
              >
                <XCircle className="h-3.5 w-3.5" />
                Reject
              </Button>
            </>
          )}
          {estimate.status === "approved" && (
            <ConvertToPlanModal estimateId={estimate.id} properties={properties} />
          )}
        </div>
      </div>

      {/* Line items */}
      <div className="p-6 space-y-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="pb-2 text-left font-medium text-muted-foreground">Description</th>
              <th className="pb-2 text-right font-medium text-muted-foreground w-16">Qty</th>
              <th className="pb-2 text-right font-medium text-muted-foreground w-24">Unit Price</th>
              <th className="pb-2 text-right font-medium text-muted-foreground w-24">Total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-border/50 last:border-0">
                <td className="py-2.5 text-foreground">{item.description}</td>
                <td className="py-2.5 text-right text-muted-foreground tabular-nums">{Number(item.qty).toFixed(2)}</td>
                <td className="py-2.5 text-right text-muted-foreground tabular-nums">${Number(item.unit_price).toFixed(2)}</td>
                <td className="py-2.5 text-right font-medium tabular-nums">${Number(item.total_price).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span className="tabular-nums">${Number(estimate.subtotal).toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>Tax</span>
              <span className="tabular-nums">${Number(estimate.tax).toFixed(2)}</span>
            </div>
            <div className="flex justify-between font-semibold text-foreground border-t border-border pt-1.5">
              <span>Total</span>
              <span className="tabular-nums">${Number(estimate.total).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        {estimate.notes && (
          <div className="rounded-lg bg-muted/40 p-4">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notes</p>
            <p className="text-sm text-foreground whitespace-pre-wrap">{estimate.notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}
