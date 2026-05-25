"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Plus, Pencil, CalendarDays, Trash2, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import { AssignServiceDialog } from "@/components/service-catalog/assign-service-dialog"
import { RecurrenceRuleDialog } from "@/components/service-catalog/recurrence-rule-dialog"
import { deletePropertyService, savePropertyService } from "@/app/actions/service-catalog"
import type { ServiceType, PropertyService, RecurrenceRule } from "@/types"
import { cn } from "@/lib/utils"

const FREQ_COLORS: Record<string, string> = {
  weekly: "bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-950/50 dark:text-emerald-400",
  biweekly: "bg-blue-100 text-blue-700 border-transparent dark:bg-blue-950/50 dark:text-blue-400",
  monthly: "bg-violet-100 text-violet-700 border-transparent dark:bg-violet-950/50 dark:text-violet-400",
  custom: "bg-amber-100 text-amber-700 border-transparent dark:bg-amber-950/50 dark:text-amber-400",
}

interface PropertyServicesPanelProps {
  propertyId: string
  clientId: string
  propertyServices: PropertyService[]
  serviceTypes: ServiceType[]
}

export function PropertyServicesPanel({
  propertyId,
  clientId,
  propertyServices,
  serviceTypes,
}: PropertyServicesPanelProps) {
  const router = useRouter()
  const [assignOpen, setAssignOpen] = useState(false)
  const [editingService, setEditingService] = useState<PropertyService | undefined>(undefined)
  const [scheduleTarget, setScheduleTarget] = useState<PropertyService | undefined>(undefined)
  const [scheduleOpen, setScheduleOpen] = useState(false)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [togglingId, setTogglingId] = useState<string | null>(null)

  const myServices = propertyServices.filter((ps) => ps.property_id === propertyId)
  const assignedTypeIds = myServices.map((ps) => ps.service_type_id)

  useEffect(() => {
    if (!confirmDeleteId) return
    const t = setTimeout(() => setConfirmDeleteId(null), 3000)
    return () => clearTimeout(t)
  }, [confirmDeleteId])

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) {
      setConfirmDeleteId(id)
      return
    }
    setDeletingId(id)
    setConfirmDeleteId(null)
    const result = await deletePropertyService(id, clientId)
    setDeletingId(null)
    if (!result.success) {
      toast.error(result.message)
    } else {
      toast.success(result.message)
      router.refresh()
    }
  }

  async function handleToggleActive(ps: PropertyService) {
    setTogglingId(ps.id)
    const result = await savePropertyService({
      id: ps.id,
      property_id: ps.property_id,
      service_type_id: ps.service_type_id,
      custom_price: ps.custom_price,
      duration_min: ps.duration_min,
      instructions: ps.instructions,
      is_active: !ps.is_active,
      client_id: clientId,
    })
    setTogglingId(null)
    if (!result.success) toast.error(result.message)
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Assigned Services
        </p>
        {serviceTypes.length > assignedTypeIds.length && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => { setEditingService(undefined); setAssignOpen(true) }}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Assign Service
          </Button>
        )}
      </div>

      {myServices.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">No services assigned</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3"
            onClick={() => { setEditingService(undefined); setAssignOpen(true) }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Assign First Service
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {myServices.map((ps) => {
            const typeName = ps.service_type?.name ?? serviceTypes.find((s) => s.id === ps.service_type_id)?.name ?? "Service"
            const defaultPrice = ps.service_type?.default_price ?? serviceTypes.find((s) => s.id === ps.service_type_id)?.default_price
            const rule: RecurrenceRule | undefined = ps.recurrence_rules?.[0]

            return (
              <div
                key={ps.id}
                className={cn(
                  "group rounded-lg border border-border bg-card p-3 space-y-2 transition-opacity",
                  !ps.is_active && "opacity-60"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex flex-col gap-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-foreground">{typeName}</span>
                      {rule && (
                        <Badge variant="outline" className={cn("text-xs capitalize", FREQ_COLORS[rule.frequency_type])}>
                          <RefreshCw className="mr-1 h-2.5 w-2.5" />
                          {rule.frequency_type}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {ps.custom_price != null ? (
                        <span className="text-emerald-600 font-medium">
                          ${Number(ps.custom_price).toFixed(2)}
                        </span>
                      ) : defaultPrice != null ? (
                        <span>Default ${Number(defaultPrice).toFixed(2)}</span>
                      ) : null}
                      {ps.duration_min != null && (
                        <span>{ps.duration_min} min</span>
                      )}
                    </div>
                    {ps.instructions && (
                      <p className="text-xs text-muted-foreground line-clamp-1 italic">
                        {ps.instructions}
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <Switch
                      checked={ps.is_active}
                      disabled={togglingId === ps.id}
                      onCheckedChange={() => handleToggleActive(ps)}
                      aria-label="Toggle active"
                      className="scale-75"
                    />
                    <button
                      onClick={() => {
                        setScheduleTarget(ps)
                        setScheduleOpen(true)
                      }}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                      aria-label="Manage schedule"
                      title="Manage schedule"
                    >
                      <CalendarDays className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditingService(ps); setAssignOpen(true) }}
                      className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                      aria-label="Edit service"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(ps.id)}
                      disabled={deletingId === ps.id}
                      className={cn(
                        "rounded p-1 transition-all",
                        confirmDeleteId === ps.id
                          ? "text-destructive opacity-100"
                          : "text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-destructive"
                      )}
                      aria-label={confirmDeleteId === ps.id ? "Confirm remove" : "Remove service"}
                      title={confirmDeleteId === ps.id ? "Click again to confirm" : "Remove"}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <AssignServiceDialog
        open={assignOpen}
        onOpenChange={(open) => { setAssignOpen(open); if (!open) setEditingService(undefined) }}
        propertyId={propertyId}
        clientId={clientId}
        serviceTypes={serviceTypes}
        assignedServiceTypeIds={assignedTypeIds}
        existingService={editingService}
      />

      {scheduleTarget && (
        <RecurrenceRuleDialog
          open={scheduleOpen}
          onOpenChange={(open) => { setScheduleOpen(open); if (!open) setScheduleTarget(undefined) }}
          propertyServiceId={scheduleTarget.id}
          clientId={clientId}
          existingRule={scheduleTarget.recurrence_rules?.[0]}
        />
      )}
    </div>
  )
}
