"use client"

import { useState, useMemo, useTransition } from "react"
import Link from "next/link"
import { Search, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { EstimateStatusBadge } from "@/components/estimates/estimate-status-badge"
import { deleteEstimate } from "@/app/actions/estimates"
import { type Estimate, type EstimateStatus } from "@/types"
import { cn } from "@/lib/utils"

const STATUS_FILTERS: { label: string; value: EstimateStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Draft", value: "draft" },
  { label: "Sent", value: "sent" },
  { label: "Approved", value: "approved" },
  { label: "Rejected", value: "rejected" },
  { label: "Expired", value: "expired" },
]

interface Props {
  estimates: Estimate[]
}

export function EstimatesTable({ estimates }: Props) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<EstimateStatus | "all">("all")
  const [isPending, startTransition] = useTransition()

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return estimates.filter((e) => {
      const matchesSearch =
        !q ||
        e.estimate_number.toLowerCase().includes(q) ||
        e.client?.name.toLowerCase().includes(q)
      const matchesStatus = statusFilter === "all" || e.status === statusFilter
      return matchesSearch && matchesStatus
    })
  }, [estimates, search, statusFilter])

  function handleDelete(id: string, number: string) {
    if (!confirm(`Delete estimate ${number}? This cannot be undone.`)) return
    startTransition(async () => {
      const result = await deleteEstimate(id)
      if (result.success) toast.success(result.message)
      else toast.error(result.message)
    })
  }

  return (
    <>
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search estimates…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1 border-b border-border overflow-x-auto">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count =
            value === "all"
              ? estimates.length
              : estimates.filter((e) => e.status === value).length
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
                statusFilter === value
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {label}
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-xs font-semibold",
                  statusFilter === value
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground",
                )}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <p className="text-sm font-medium text-foreground">No estimates found</p>
            <p className="text-xs text-muted-foreground">
              {search ? "Try a different search term" : "Create your first estimate to get started"}
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Estimate #</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Client</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden sm:table-cell">Total</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Valid Until</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((est, i) => (
                <tr
                  key={est.id}
                  className={cn(
                    "group border-b border-border last:border-0 hover:bg-muted/30 transition-colors",
                    i % 2 === 0 ? "" : "bg-muted/10",
                  )}
                >
                  <td className="px-4 py-3">
                    <Link
                      href={`/estimates/${est.id}`}
                      className="font-medium text-foreground hover:text-primary transition-colors"
                    >
                      {est.estimate_number}
                    </Link>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {est.client?.name ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <EstimateStatusBadge status={est.status} />
                  </td>
                  <td className="px-4 py-3 text-right hidden sm:table-cell font-medium tabular-nums">
                    ${Number(est.total).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {est.valid_until
                      ? new Date(est.valid_until).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                      : "—"}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {new Date(est.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-4 py-3">
                    {est.status === "draft" && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                        disabled={isPending}
                        onClick={() => handleDelete(est.id, est.estimate_number)}
                        title="Delete estimate"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Showing {filtered.length} of {estimates.length} estimate{estimates.length !== 1 ? "s" : ""}
        </p>
      )}
    </>
  )
}
