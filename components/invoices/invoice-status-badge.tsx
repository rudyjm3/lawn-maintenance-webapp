import { type InvoiceStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_MAP: Record<InvoiceStatus, { label: string; className: string }> = {
  draft:   { label: "Draft",   className: "bg-gray-100 text-gray-600" },
  sent:    { label: "Sent",    className: "bg-blue-100 text-blue-700" },
  partial: { label: "Partial", className: "bg-yellow-100 text-yellow-700" },
  paid:    { label: "Paid",    className: "bg-green-100 text-green-700" },
  overdue: { label: "Overdue", className: "bg-red-100 text-red-700" },
  void:    { label: "Void",    className: "bg-gray-100 text-gray-400" },
}

interface Props {
  status: InvoiceStatus
  className?: string
}

export function InvoiceStatusBadge({ status, className }: Props) {
  const { label, className: cls } = STATUS_MAP[status] ?? STATUS_MAP.draft
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", cls, className)}>
      {label}
    </span>
  )
}
