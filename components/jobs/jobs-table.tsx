"use client"

import { useMemo, useState } from "react"
import { CalendarDays, ClipboardPlus, Search } from "lucide-react"
import { AddJobSheet } from "@/components/jobs/add-job-sheet"
import { JobStatusBadge } from "@/components/jobs/job-status-badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { getJobServiceLabel } from "@/lib/jobs"
import { cn } from "@/lib/utils"
import type { Client, Job, JobStatus, Property } from "@/types"

const STATUS_FILTERS: { label: string; value: JobStatus | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Unscheduled", value: "unscheduled" },
  { label: "Scheduled", value: "scheduled" },
  { label: "In Progress", value: "in_progress" },
  { label: "Completed", value: "completed" },
  { label: "Skipped", value: "skipped" },
  { label: "Cancelled", value: "cancelled" },
]

interface JobsTableProps {
  jobs: Job[]
  clients: Client[]
  properties: Property[]
  initialOpenNew?: boolean
  initialClientId?: string
}

export function JobsTable({
  jobs,
  clients,
  properties,
  initialOpenNew = false,
  initialClientId,
}: JobsTableProps) {
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<JobStatus | "all">("all")
  const [clientFilter, setClientFilter] = useState(initialClientId ?? "all")
  const [propertyFilter, setPropertyFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sheetOpen, setSheetOpen] = useState(initialOpenNew)
  const [sheetInstance, setSheetInstance] = useState(0)

  function openAddJobSheet() {
    setSheetInstance((value) => value + 1)
    setSheetOpen(true)
  }

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) =>
        clientFilter === "all" ? true : property.client_id === clientFilter,
      ),
    [clientFilter, properties],
  )

  const filteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()

    return jobs.filter((job) => {
      const serviceLabel = getJobServiceLabel(job).toLowerCase()
      const matchesSearch =
        !query ||
        job.client?.name?.toLowerCase().includes(query) ||
        job.property?.address?.toLowerCase().includes(query) ||
        serviceLabel.includes(query)

      const matchesStatus = statusFilter === "all" || job.status === statusFilter
      const matchesClient = clientFilter === "all" || job.client_id === clientFilter
      const matchesProperty = propertyFilter === "all" || job.property_id === propertyFilter
      const matchesDateFrom = !dateFrom || (!!job.service_date && job.service_date >= dateFrom)
      const matchesDateTo = !dateTo || (!!job.service_date && job.service_date <= dateTo)

      return (
        matchesSearch &&
        matchesStatus &&
        matchesClient &&
        matchesProperty &&
        matchesDateFrom &&
        matchesDateTo
      )
    })
  }, [clientFilter, dateFrom, dateTo, jobs, propertyFilter, search, statusFilter])

  return (
    <>
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="pl-9"
            placeholder="Search jobs…"
          />
        </div>
        <Button onClick={openAddJobSheet}>
          <ClipboardPlus className="mr-2 h-4 w-4" />
          Add Job
        </Button>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-border">
        {STATUS_FILTERS.map(({ label, value }) => {
          const count =
            value === "all" ? jobs.length : jobs.filter((job) => job.status === value).length
          return (
            <button
              key={value}
              onClick={() => setStatusFilter(value)}
              className={cn(
                "flex items-center gap-1.5 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors",
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

      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Client
          </span>
          <Select value={clientFilter} onValueChange={setClientFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All clients</SelectItem>
              {clients.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {client.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Property
          </span>
          <Select value={propertyFilter} onValueChange={setPropertyFilter}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All properties</SelectItem>
              {filteredProperties.map((property) => (
                <SelectItem key={property.id} value={property.id}>
                  {property.address}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            From
          </span>
          <Input type="date" value={dateFrom} onChange={(event) => setDateFrom(event.target.value)} />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            To
          </span>
          <Input type="date" value={dateTo} onChange={(event) => setDateTo(event.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card">
        {filteredJobs.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
            <CalendarDays className="h-5 w-5 text-muted-foreground/60" />
            <p className="text-sm font-medium text-foreground">No jobs found</p>
            <p className="text-xs text-muted-foreground">
              Adjust your filters or create a one-off job.
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="px-4">Client</TableHead>
                <TableHead className="px-4">Property</TableHead>
                <TableHead className="px-4">Service</TableHead>
                <TableHead className="px-4">Date</TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Duration</TableHead>
                <TableHead className="px-4">Price</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => (
                <TableRow key={job.id}>
                  <TableCell className="px-4 py-3 font-medium">{job.client?.name ?? "Unknown client"}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {job.property?.address ?? "Unknown property"}
                  </TableCell>
                  <TableCell className="px-4 py-3">{getJobServiceLabel(job)}</TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {job.service_date
                      ? new Date(`${job.service_date}T12:00:00`).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "Unscheduled"}
                  </TableCell>
                  <TableCell className="px-4 py-3">
                    <JobStatusBadge status={job.status} />
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    {job.estimated_duration_min} min
                  </TableCell>
                  <TableCell className="px-4 py-3 text-muted-foreground">
                    ${job.price.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredJobs.length} of {jobs.length} job{jobs.length !== 1 ? "s" : ""}
      </p>

      <AddJobSheet
        key={sheetInstance}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clients={clients}
        properties={properties}
        defaultClientId={clientFilter !== "all" ? clientFilter : initialClientId}
      />
    </>
  )
}
