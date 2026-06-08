"use client"

import { useState } from "react"
import {
  Building2,
  ClipboardList,
  MapPin,
  KeyRound,
  PawPrint,
  Ruler,
  FileText,
  CheckCircle2,
  Clock,
  XCircle,
  SkipForward,
  Pencil,
  Plus,
  Mail,
  MessageSquare,
  Smartphone,
  ArrowDownLeft,
  ArrowUpRight,
  Star,
} from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { AddPropertySheet } from "@/components/properties/add-property-sheet"
import { PropertyPhotoGallery } from "@/components/properties/property-photo-gallery"
import { AddClientSheet } from "@/components/clients/add-client-sheet"
import { PropertyServicesPanel } from "@/components/service-catalog/property-services-panel"
import { type Client, type Property, type Job, type ServiceType, type PropertyService, type Communication, type Estimate, type Invoice } from "@/types"

type ReviewJob = { id: string; title: string | null; service_date: string | null; review_rating: number | null; review_text: string | null; review_submitted_at: string | null }
import { EstimatesTable } from "@/components/estimates/estimates-table"
import { InvoicesTable } from "@/components/invoices/invoices-table"
import { logCommunication } from "@/app/actions/communications"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

// ─── Job status display ────────────────────────────────────────────────────────

const JOB_STATUS_CONFIG = {
  completed: { label: "Completed", icon: CheckCircle2, color: "text-emerald-600" },
  in_progress: { label: "In Progress", icon: Clock, color: "text-blue-600" },
  scheduled: { label: "Scheduled", icon: Clock, color: "text-muted-foreground" },
  unscheduled: { label: "Unscheduled", icon: Clock, color: "text-amber-600" },
  skipped: { label: "Skipped", icon: SkipForward, color: "text-amber-600" },
  cancelled: { label: "Cancelled", icon: XCircle, color: "text-destructive" },
} as const

// ─── Overview tab ─────────────────────────────────────────────────────────────

function OverviewTab({
  client,
  properties,
  jobs,
}: {
  client: Client
  properties: Property[]
  jobs: Job[]
}) {
  const [editClientOpen, setEditClientOpen] = useState(false)
  // Use local date so US evening hours don't advance the cutoff to tomorrow (UTC would)
  const now = new Date()
  const todayIso = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
  const completedJobs = jobs.filter((j) => j.status === "completed")
  // Only consider scheduled jobs on or after today — past unactioned jobs are stale
  const scheduledJobs = jobs.filter(
    (j) => j.status === "scheduled" && (j.service_date ?? "") >= todayIso,
  )
  const recentJob = completedJobs.sort(
    (a, b) => (b.service_date ?? "").localeCompare(a.service_date ?? ""),
  )[0]
  const nextJob = scheduledJobs.sort(
    (a, b) => (a.service_date ?? "").localeCompare(b.service_date ?? ""),
  )[0]

  return (
    <>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
      {/* Contact details */}
      <div className="lg:col-span-2 space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-foreground">
              Contact Information
            </h3>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 w-7 p-0"
              onClick={() => setEditClientOpen(true)}
              aria-label="Edit client"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
          <dl className="space-y-3 text-sm">
            {client.phone && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Phone</dt>
                <dd className="font-medium">{client.phone}</dd>
              </div>
            )}
            {client.email && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Email</dt>
                <dd className="font-medium">{client.email}</dd>
              </div>
            )}
            {client.billing_address && (
              <div className="flex justify-between gap-4">
                <dt className="text-muted-foreground shrink-0">
                  Billing address
                </dt>
                <dd className="font-medium text-right">
                  {client.billing_address}
                </dd>
              </div>
            )}
            {client.source && (
              <div className="flex justify-between">
                <dt className="text-muted-foreground">Source</dt>
                <dd className="capitalize font-medium">{client.source}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Client since</dt>
              <dd className="font-medium">
                {new Date(client.created_at).toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </dd>
            </div>
          </dl>
        </div>

        {client.notes && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <h3 className="text-sm font-semibold text-foreground">Notes</h3>
            <p className="text-sm text-muted-foreground whitespace-pre-line">
              {client.notes}
            </p>
          </div>
        )}
      </div>

      {/* Stats sidebar */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 space-y-3">
          <h3 className="text-sm font-semibold text-foreground">Summary</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Properties</span>
              <span className="font-semibold">{properties.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Total jobs</span>
              <span className="font-semibold">{jobs.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Completed</span>
              <span className="font-semibold text-emerald-600">
                {completedJobs.length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Upcoming</span>
              <span className="font-semibold text-blue-600">
                {scheduledJobs.length}
              </span>
            </div>
          </div>
        </div>

        {(recentJob || nextJob) && (
          <div className="rounded-xl border border-border bg-card p-5 space-y-3">
            <h3 className="text-sm font-semibold text-foreground">
              Service Activity
            </h3>
            <div className="space-y-2 text-sm">
              {recentJob && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Last service</span>
                  <span className="font-medium text-right">
                    {recentJob.service_date
                      ? (() => {
                          const [y, m, d] = recentJob.service_date.split("-").map(Number)
                          return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        })()
                      : "—"}
                  </span>
                </div>
              )}
              {nextJob && (
                <div className="flex justify-between gap-2">
                  <span className="text-muted-foreground">Next service</span>
                  <span className="font-medium text-right text-primary">
                    {nextJob.service_date
                      ? (() => {
                          const [y, m, d] = nextJob.service_date.split("-").map(Number)
                          return new Date(y, m - 1, d).toLocaleDateString("en-US", { month: "short", day: "numeric" })
                        })()
                      : "—"}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>

    <AddClientSheet
      open={editClientOpen}
      onOpenChange={setEditClientOpen}
      client={client}
    />
    </>
  )
}

// ─── Properties tab ───────────────────────────────────────────────────────────

function PropertiesTab({
  properties,
  client,
  serviceTypes,
  propertyServices,
}: {
  properties: Property[]
  client: Client
  serviceTypes: ServiceType[]
  propertyServices: PropertyService[]
}) {
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editingProperty, setEditingProperty] = useState<Property | undefined>(undefined)
  const [expandedPropertyId, setExpandedPropertyId] = useState<string | null>(null)

  return (
    <>
      <div className="space-y-3">
        <div className="flex justify-end">
          <Button
            variant="outline"
            size="sm"
            onClick={() => { setEditingProperty(undefined); setSheetOpen(true) }}
          >
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Add Property
          </Button>
        </div>

        {properties.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-10 text-center">
            <Building2 className="mx-auto mb-3 h-8 w-8 text-muted-foreground/50" />
            <p className="text-sm font-medium text-foreground">No properties yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add a property to start scheduling services.
            </p>
          </div>
        ) : (
          properties.map((p) => {
            const isExpanded = expandedPropertyId === p.id
            const serviceCount = propertyServices.filter((ps) => ps.property_id === p.id).length
            return (
              <div
                key={p.id}
                className="group rounded-xl border border-border bg-card p-5 space-y-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-sm text-foreground">
                        {p.address}
                      </p>
                      <div className="mt-1 flex items-center gap-2">
                        {p.is_commercial ? (
                          <Badge
                            variant="outline"
                            className="text-xs bg-violet-100 text-violet-700 border-transparent dark:bg-violet-950/50 dark:text-violet-400"
                          >
                            Commercial
                          </Badge>
                        ) : (
                          <Badge
                            variant="outline"
                            className="text-xs bg-emerald-100 text-emerald-700 border-transparent dark:bg-emerald-950/50 dark:text-emerald-400"
                          >
                            Residential
                          </Badge>
                        )}
                        {p.lawn_size && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Ruler className="h-3 w-3" />
                            {p.lawn_size}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => { setEditingProperty(p); setSheetOpen(true) }}
                    className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                    aria-label="Edit property"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>

                {(p.gate_code || p.access_notes || p.pet_notes) && (
                  <div className="flex flex-wrap gap-3 border-t border-border pt-3">
                    {p.gate_code && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <KeyRound className="h-3.5 w-3.5" />
                        Gate: <span className="font-mono font-semibold text-foreground">{p.gate_code}</span>
                      </div>
                    )}
                    {p.access_notes && (
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <FileText className="h-3.5 w-3.5" />
                        {p.access_notes}
                      </div>
                    )}
                    {p.pet_notes && (
                      <div className="flex items-center gap-1.5 text-xs text-amber-600">
                        <PawPrint className="h-3.5 w-3.5" />
                        {p.pet_notes}
                      </div>
                    )}
                  </div>
                )}

                {/* Services section */}
                <div className="flex items-center justify-between border-t border-border pt-3">
                  <span className="text-xs text-muted-foreground">
                    {serviceCount > 0 ? `${serviceCount} service${serviceCount !== 1 ? "s" : ""}` : "No services"}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setExpandedPropertyId(isExpanded ? null : p.id)}
                  >
                    {isExpanded ? "Hide" : "Manage Services"}
                  </Button>
                </div>

                {isExpanded && (
                  <PropertyServicesPanel
                    propertyId={p.id}
                    clientId={client.id}
                    propertyServices={propertyServices}
                    serviceTypes={serviceTypes}
                  />
                )}

                <div className="border-t border-border pt-3">
                  <PropertyPhotoGallery propertyId={p.id} />
                </div>
              </div>
            )
          })
        )}
      </div>

      <AddPropertySheet
        open={sheetOpen}
        onOpenChange={(open) => { setSheetOpen(open); if (!open) setEditingProperty(undefined) }}
        clients={[client]}
        defaultClientId={client.id}
        property={editingProperty}
      />
    </>
  )
}

// ─── Services tab ─────────────────────────────────────────────────────────────

function ServicesTab({
  client,
  properties,
  propertyServices,
  serviceTypes,
}: {
  client: Client
  properties: Property[]
  propertyServices: PropertyService[]
  serviceTypes: ServiceType[]
}) {
  const totalServices = propertyServices.length
  const activeServices = propertyServices.filter((ps) => ps.is_active).length

  if (properties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
        <Building2 className="h-8 w-8 text-muted-foreground/50" />
        <p className="text-sm font-medium text-foreground">No properties yet</p>
        <p className="text-xs text-muted-foreground">
          Add a property first, then assign recurring services to it.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="flex flex-wrap gap-4 rounded-xl border border-border bg-card p-4 text-sm">
        <div>
          <span className="text-muted-foreground">Total services </span>
          <span className="font-semibold">{totalServices}</span>
        </div>
        <div>
          <span className="text-muted-foreground">Active </span>
          <span className="font-semibold text-emerald-600">{activeServices}</span>
        </div>
        {totalServices - activeServices > 0 && (
          <div>
            <span className="text-muted-foreground">Paused </span>
            <span className="font-semibold text-amber-600">{totalServices - activeServices}</span>
          </div>
        )}
      </div>

      {/* One panel per property */}
      {properties.map((p) => {
        const count = propertyServices.filter((ps) => ps.property_id === p.id).length
        return (
          <div key={p.id} className="rounded-xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="text-sm font-medium text-foreground">{p.address}</span>
              {count > 0 && (
                <Badge variant="secondary" className="ml-auto text-xs">
                  {count} service{count !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
            <PropertyServicesPanel
              propertyId={p.id}
              clientId={client.id}
              propertyServices={propertyServices}
              serviceTypes={serviceTypes}
            />
          </div>
        )
      })}
    </div>
  )
}

// ─── Job history tab ──────────────────────────────────────────────────────────

function JobHistoryTab({ jobs }: { jobs: Job[] }) {
  const sorted = [...jobs].sort((a, b) => {
    const dateA = a.service_date ? new Date(a.service_date).getTime() : 0
    const dateB = b.service_date ? new Date(b.service_date).getTime() : 0
    return dateB - dateA
  })

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {sorted.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
          <ClipboardList className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No jobs yet</p>
          <p className="text-xs text-muted-foreground">
            Jobs will appear here once scheduled.
          </p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Date
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Service
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">
                Property
              </th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">
                Status
              </th>
              <th className="px-4 py-3 text-right font-medium text-muted-foreground hidden lg:table-cell">
                Price
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((job) => {
              const cfg =
                JOB_STATUS_CONFIG[job.status] ?? JOB_STATUS_CONFIG.scheduled
              const StatusIcon = cfg.icon
              return (
                <tr
                  key={job.id}
                  className="border-b border-border last:border-0 hover:bg-muted/30 transition-colors"
                >
                  <td className="px-4 py-3 text-muted-foreground">
                    {job.service_date
                      ? new Date(job.service_date).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unscheduled"}
                  </td>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {job.service_type?.name ?? "—"}
                    <div className="text-xs text-muted-foreground">
                      {job.estimated_duration_min}m est.
                      {job.actual_duration_min != null &&
                        ` · ${job.actual_duration_min}m actual`}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground hidden md:table-cell">
                    <span className="line-clamp-1">
                      {job.property?.address ?? "—"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "flex items-center gap-1.5 text-xs font-medium",
                        cfg.color,
                      )}
                    >
                      <StatusIcon className="h-3.5 w-3.5" />
                      {cfg.label}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium hidden lg:table-cell">
                    ${job.price}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  )
}

function RevenueSummaryStrip({
  summary,
}: {
  summary: { earned: number; collected: number; outstanding: number; paymentCount: number; lastPaymentDate: string | null }
}) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[
        { label: "Revenue Earned",    value: `$${summary.earned.toFixed(2)}`,     color: "bg-emerald-50 border-emerald-200 text-emerald-700" },
        { label: "Revenue Collected", value: `$${summary.collected.toFixed(2)}`,  color: "bg-sky-50 border-sky-200 text-sky-700" },
        { label: "Outstanding",       value: `$${summary.outstanding.toFixed(2)}`,color: "bg-amber-50 border-amber-200 text-amber-700" },
        { label: "Payments",          value: String(summary.paymentCount),         color: "bg-violet-50 border-violet-200 text-violet-700" },
        {
          label: "Last Payment",
          value: summary.lastPaymentDate
            ? new Date(`${summary.lastPaymentDate}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
            : "—",
          color: "border-border bg-card",
        },
      ].map((card) => (
        <div key={card.label} className={`rounded-xl border p-3 ${card.color}`}>
          <p className="text-xs opacity-70">{card.label}</p>
          <p className="text-sm font-semibold mt-1">{card.value}</p>
        </div>
      ))}
    </div>
  )
}

// ─── Activity tab ─────────────────────────────────────────────────────────────

const CHANNEL_CONFIG = {
  email:  { icon: Mail,          label: "Email" },
  sms:    { icon: MessageSquare, label: "SMS" },
  app:    { icon: Smartphone,    label: "App" },
} as const

function ActivityTab({
  client,
  communications,
}: {
  client: Client
  communications: Communication[]
}) {
  const [formOpen, setFormOpen] = useState(false)
  const [channel, setChannel] = useState<"email" | "sms" | "app">("email")
  const [direction, setDirection] = useState<"inbound" | "outbound">("outbound")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!message.trim()) return
    setSubmitting(true)
    const result = await logCommunication({
      client_id: client.id,
      channel,
      direction,
      message: message.trim(),
    })
    setSubmitting(false)
    if (result.success) {
      toast.success(result.message)
      setMessage("")
      setFormOpen(false)
    } else {
      toast.error(result.message)
    }
  }

  return (
    <div className="space-y-4">
      {/* Log button / inline form */}
      {formOpen ? (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-border bg-card p-4 space-y-3"
        >
          <div className="flex flex-wrap gap-2">
            {(["email", "sms", "app"] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setChannel(ch)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium transition-colors",
                  channel === ch
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {CHANNEL_CONFIG[ch].label}
              </button>
            ))}
            <span className="mx-1 border-l border-border" />
            {(["outbound", "inbound"] as const).map((dir) => (
              <button
                key={dir}
                type="button"
                onClick={() => setDirection(dir)}
                className={cn(
                  "rounded-md border px-3 py-1.5 text-xs font-medium capitalize transition-colors",
                  direction === dir
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-transparent text-muted-foreground hover:bg-muted"
                )}
              >
                {dir}
              </button>
            ))}
          </div>

          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Message content or notes…"
            rows={3}
            className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
          />

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => { setFormOpen(false); setMessage("") }}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting || !message.trim()}>
              {submitting ? "Saving…" : "Log"}
            </Button>
          </div>
        </form>
      ) : (
        <div className="flex justify-end">
          <Button variant="outline" size="sm" onClick={() => setFormOpen(true)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            Log Communication
          </Button>
        </div>
      )}

      {/* Feed */}
      {communications.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-card py-16 text-center">
          <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No communications yet</p>
          <p className="text-xs text-muted-foreground">
            Log a call, email, or message to start the activity trail.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {communications.map((c) => {
            const cfg = CHANNEL_CONFIG[c.channel] ?? CHANNEL_CONFIG.email
            const Icon = cfg.icon
            const DirIcon = c.direction === "inbound" ? ArrowDownLeft : ArrowUpRight
            const dirColor = c.direction === "inbound" ? "text-blue-500" : "text-emerald-500"
            return (
              <div
                key={c.id}
                className="flex items-start gap-3 rounded-xl border border-border bg-card p-4"
              >
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
                  <Icon className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-foreground">{cfg.label}</span>
                    <span className={cn("flex items-center gap-0.5 text-xs font-medium capitalize", dirColor)}>
                      <DirIcon className="h-3 w-3" />
                      {c.direction}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Date(c.sent_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <p className="text-sm text-foreground whitespace-pre-line">{c.message}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Notes tab ────────────────────────────────────────────────────────────────

function NotesTab({ client }: { client: Client }) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      {client.notes ? (
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-foreground">Client Notes</h3>
          <p className="text-sm text-muted-foreground whitespace-pre-line">
            {client.notes}
          </p>
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/50" />
          <p className="text-sm font-medium text-foreground">No notes yet</p>
          <p className="text-xs text-muted-foreground">
            Add notes about this client — access codes, preferences, special instructions.
          </p>
        </div>
      )}
    </div>
  )
}

// ─── Estimates tab ────────────────────────────────────────────────────────────

function EstimatesTab({ estimates }: { estimates: Estimate[] }) {
  return <EstimatesTable estimates={estimates} />
}

// ─── Invoices tab ─────────────────────────────────────────────────────────────

function InvoicesTab({ invoices }: { invoices: Invoice[] }) {
  return <InvoicesTable invoices={invoices} />
}

// ─── Reviews tab ──────────────────────────────────────────────────────────────

function ReviewsTab({ reviews }: { reviews: ReviewJob[] }) {
  if (reviews.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-border bg-card py-14 text-center">
        <Star className="h-7 w-7 text-muted-foreground/40" />
        <p className="text-sm font-medium text-foreground">No reviews yet</p>
        <p className="text-xs text-muted-foreground">Reviews appear here after clients submit ratings.</p>
      </div>
    )
  }
  const avg = reviews.reduce((s, r) => s + (r.review_rating ?? 0), 0) / reviews.length
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-1">
          {[1,2,3,4,5].map((s) => (
            <Star key={s} className={`h-4 w-4 ${s <= Math.round(avg) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
          ))}
        </div>
        <span className="text-sm font-semibold">{avg.toFixed(1)}</span>
        <span className="text-xs text-muted-foreground">avg · {reviews.length} review{reviews.length !== 1 ? "s" : ""}</span>
      </div>
      <div className="space-y-3">
        {reviews.map((r) => (
          <div key={r.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {[1,2,3,4,5].map((s) => (
                  <Star key={s} className={`h-4 w-4 ${s <= (r.review_rating ?? 0) ? "fill-amber-400 text-amber-400" : "text-muted-foreground/30"}`} />
                ))}
              </div>
              <span className="text-xs text-muted-foreground">{r.service_date ?? ""}</span>
            </div>
            {r.title && <p className="text-xs text-muted-foreground">{r.title}</p>}
            {r.review_text && <p className="text-sm text-foreground">{r.review_text}</p>}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main exported component ──────────────────────────────────────────────────

interface ClientDetailTabsProps {
  client: Client
  properties: Property[]
  jobs: Job[]
  serviceTypes: ServiceType[]
  propertyServices: PropertyService[]
  communications: Communication[]
  estimates: Estimate[]
  invoices: Invoice[]
  reviews: ReviewJob[]
  revenueSummary: { earned: number; collected: number; outstanding: number; paymentCount: number; lastPaymentDate: string | null }
  initialTab?: string
}

const VALID_TABS = new Set(["overview", "properties", "services", "history", "estimates", "invoices", "reviews", "activity", "notes"])

export function ClientDetailTabs({
  client,
  properties,
  jobs,
  serviceTypes,
  propertyServices,
  communications,
  estimates,
  invoices,
  reviews,
  revenueSummary,
  initialTab,
}: ClientDetailTabsProps) {
  const defaultTab = initialTab && VALID_TABS.has(initialTab) ? initialTab : "overview"
  return (
    <Tabs defaultValue={defaultTab} className="space-y-5">
      <TabsList className="border-b border-border bg-transparent p-0 h-auto rounded-none gap-0">
        {[
          { value: "overview", label: "Overview" },
          { value: "properties", label: `Properties (${properties.length})` },
          { value: "services", label: `Services (${propertyServices.length})` },
          { value: "history", label: `Job History (${jobs.length})` },
          { value: "estimates", label: `Estimates (${estimates.length})` },
          { value: "invoices", label: `Invoices (${invoices.length})` },
          { value: "reviews", label: `Reviews (${reviews.length})` },
          { value: "activity", label: `Activity (${communications.length})` },
          { value: "notes", label: "Notes" },
        ].map(({ value, label }) => (
          <TabsTrigger
            key={value}
            value={value}
            className="rounded-none border-b-2 border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground data-[state=active]:border-primary data-[state=active]:text-foreground data-[state=active]:bg-transparent data-[state=active]:shadow-none"
          >
            {label}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="overview">
        <OverviewTab client={client} properties={properties} jobs={jobs} />
      </TabsContent>
      <TabsContent value="properties">
        <PropertiesTab
          properties={properties}
          client={client}
          serviceTypes={serviceTypes}
          propertyServices={propertyServices}
        />
      </TabsContent>
      <TabsContent value="services">
        <ServicesTab
          client={client}
          properties={properties}
          propertyServices={propertyServices}
          serviceTypes={serviceTypes}
        />
      </TabsContent>
      <TabsContent value="history">
        <div className="space-y-3">
          <RevenueSummaryStrip summary={revenueSummary} />
          <JobHistoryTab jobs={jobs} />
        </div>
      </TabsContent>
      <TabsContent value="estimates">
        <EstimatesTab estimates={estimates} />
      </TabsContent>
      <TabsContent value="invoices">
        <InvoicesTab invoices={invoices} />
      </TabsContent>
      <TabsContent value="reviews">
        <ReviewsTab reviews={reviews} />
      </TabsContent>
      <TabsContent value="activity">
        <ActivityTab client={client} communications={communications} />
      </TabsContent>
      <TabsContent value="notes">
        <NotesTab client={client} />
      </TabsContent>
    </Tabs>
  )
}
