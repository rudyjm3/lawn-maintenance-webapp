"use client"

import { useMemo, useState, Fragment } from "react"
import { useRouter } from "next/navigation"
import { ArrowUpDown, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, ChevronUp, ClipboardPlus, Pencil, Search } from "lucide-react"
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

function startOfWeekSun(d: Date): Date {
  const date = new Date(d)
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - date.getDay())
  return date
}

function toIso(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

function weekRangeLabel(sun: Date): string {
  const sat = new Date(sun.getTime() + 6 * 86_400_000)
  const sunLabel = sun.toLocaleDateString("en-US", { month: "short", day: "numeric" })
  const satLabel = sat.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  return `${sunLabel} – ${satLabel}`
}

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
  const [weekAnchor, setWeekAnchor] = useState<Date>(() => startOfWeekSun(new Date()))
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [sheetOpen, setSheetOpen] = useState(initialOpenNew)
  const [sheetInstance, setSheetInstance] = useState(0)
  const [editingJob, setEditingJob] = useState<Job | undefined>(undefined)
  const [sortCol, setSortCol] = useState<"client" | "date" | null>("date")
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc")
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null)
  const router = useRouter()

  const weekStart = toIso(weekAnchor)
  const weekEnd = toIso(new Date(weekAnchor.getTime() + 6 * 86_400_000))

  function prevWeek() {
    setWeekAnchor((d) => new Date(d.getTime() - 7 * 86_400_000))
  }

  function nextWeek() {
    setWeekAnchor((d) => new Date(d.getTime() + 7 * 86_400_000))
  }

  function goToday() {
    setWeekAnchor(startOfWeekSun(new Date()))
  }

  function toggleSort(col: "client" | "date") {
    if (sortCol === col) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"))
    } else {
      setSortCol(col)
      setSortDir("asc")
    }
  }

  function openAddJobSheet() {
    setEditingJob(undefined)
    setSheetInstance((value) => value + 1)
    setSheetOpen(true)
  }

  function openEditJobSheet(job: Job) {
    setEditingJob(job)
    setSheetOpen(true)
  }

  const filteredProperties = useMemo(
    () =>
      properties.filter((property) =>
        clientFilter === "all" ? true : property.client_id === clientFilter,
      ),
    [clientFilter, properties],
  )

  // Jobs matching all filters except status — used for tab counts so badges reflect
  // the active client/property/date/search context rather than all jobs.
  const contextFilteredJobs = useMemo(() => {
    const query = search.trim().toLowerCase()
    return jobs.filter((job) => {
      const serviceLabel = getJobServiceLabel(job).toLowerCase()
      const matchesSearch =
        !query ||
        job.client?.name?.toLowerCase().includes(query) ||
        job.property?.address?.toLowerCase().includes(query) ||
        serviceLabel.includes(query)
      const matchesClient = clientFilter === "all" || job.client_id === clientFilter
      const matchesProperty = propertyFilter === "all" || job.property_id === propertyFilter
      const matchesWeek = !!job.service_date && job.service_date >= weekStart && job.service_date <= weekEnd
      const matchesDateFrom = !dateFrom || (!!job.service_date && job.service_date >= dateFrom)
      const matchesDateTo = !dateTo || (!!job.service_date && job.service_date <= dateTo)
      return matchesSearch && matchesClient && matchesProperty && matchesWeek && matchesDateFrom && matchesDateTo
    })
  }, [clientFilter, dateFrom, dateTo, jobs, propertyFilter, search, weekEnd, weekStart])

  const filteredJobs = useMemo(() => {
    const base =
      statusFilter === "all"
        ? contextFilteredJobs
        : contextFilteredJobs.filter((job) => job.status === statusFilter)

    if (!sortCol) return base

    return [...base].sort((a, b) => {
      let cmp = 0
      if (sortCol === "client") {
        cmp = (a.client?.name ?? "").localeCompare(b.client?.name ?? "")
      } else if (sortCol === "date") {
        const aDate = a.service_date ?? ""
        const bDate = b.service_date ?? ""
        cmp = aDate < bDate ? -1 : aDate > bDate ? 1 : 0
      }
      return sortDir === "asc" ? cmp : -cmp
    })
  }, [contextFilteredJobs, sortCol, sortDir, statusFilter])

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
            value === "all"
              ? contextFilteredJobs.length
              : contextFilteredJobs.filter((job) => job.status === value).length
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
            <SelectTrigger className="w-full">
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
            <SelectTrigger className="w-full">
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

      <div className="flex items-center gap-1">
        <Button variant="outline" size="icon" className="h-8 w-8 bg-muted/60 hover:bg-muted" onClick={prevWeek} aria-label="Previous week">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs bg-muted/60 hover:bg-muted" onClick={goToday}>
          Today
        </Button>
        <Button variant="outline" size="icon" className="h-8 w-8 bg-muted/60 hover:bg-muted" onClick={nextWeek} aria-label="Next week">
          <ChevronRight className="h-4 w-4" />
        </Button>
        <span className="ml-1 text-sm font-medium text-foreground">{weekRangeLabel(weekAnchor)}</span>
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
                <TableHead className="px-4">
                  <button
                    onClick={() => toggleSort("client")}
                    className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                  >
                    Client
                    {sortCol === "client" ? (
                      sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4">Property</TableHead>
                <TableHead className="px-4">Service</TableHead>
                <TableHead className="px-4">
                  <button
                    onClick={() => toggleSort("date")}
                    className="flex items-center gap-1 font-medium hover:text-foreground transition-colors"
                  >
                    Date
                    {sortCol === "date" ? (
                      sortDir === "asc" ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />
                    ) : (
                      <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
                    )}
                  </button>
                </TableHead>
                <TableHead className="px-4">Status</TableHead>
                <TableHead className="px-4">Crew</TableHead>
                <TableHead className="px-4">Duration</TableHead>
                <TableHead className="px-4">Price</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.map((job) => {
                const displayTitle = job.title || getJobServiceLabel(job)
                const hasCustomTitle = !!job.title
                const isExpanded = expandedJobId === job.id
                const colSpan = 9

                return (
                  <Fragment key={job.id}>
                    <TableRow
                      className={cn("group", hasCustomTitle && "cursor-pointer")}
                      onClick={hasCustomTitle ? () => setExpandedJobId(isExpanded ? null : job.id) : undefined}
                    >
                      <TableCell className="px-4 py-3 font-medium">{job.client?.name ?? "Unknown client"}</TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {job.property?.address ?? "Unknown property"}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {hasCustomTitle && (
                            <ChevronDown className={cn("h-3.5 w-3.5 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
                          )}
                          <span>{displayTitle}</span>
                        </div>
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {job.service_date ? (
                          <button
                            onClick={(e) => { e.stopPropagation(); router.push(`/schedule?date=${job.service_date}`) }}
                            className="hover:text-foreground hover:underline transition-colors"
                          >
                            {new Date(`${job.service_date}T12:00:00`).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </button>
                        ) : (
                          "Unscheduled"
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        <JobStatusBadge status={job.status} />
                      </TableCell>
                      <TableCell className="px-4 py-3">
                        {job.crew ? (
                          <span
                            className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium text-white"
                            style={{ backgroundColor: job.crew.color ?? "#6b7280" }}
                          >
                            {job.crew.name}
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground/50">—</span>
                        )}
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        {job.estimated_duration_min} min
                      </TableCell>
                      <TableCell className="px-4 py-3 text-muted-foreground">
                        ${job.price.toFixed(2)}
                      </TableCell>
                      <TableCell className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => openEditJobSheet(job)}
                          className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-muted hover:text-foreground transition-all"
                          aria-label="Edit job"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </TableCell>
                    </TableRow>
                    {hasCustomTitle && isExpanded && (
                      <TableRow className="bg-muted/30 hover:bg-muted/30">
                        <TableCell colSpan={colSpan} className="px-8 py-3">
                          <p className="text-sm font-medium text-foreground">{job.title}</p>
                          {job.description && (
                            <p className="mt-1 text-xs text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                          )}
                        </TableCell>
                      </TableRow>
                    )}
                  </Fragment>
                )
              })}
            </TableBody>
          </Table>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Showing {filteredJobs.length} of {contextFilteredJobs.length} job{contextFilteredJobs.length !== 1 ? "s" : ""}
      </p>

      <AddJobSheet
        key={editingJob ? editingJob.id : sheetInstance}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        clients={clients}
        properties={properties}
        defaultClientId={clientFilter !== "all" ? clientFilter : initialClientId}
        job={editingJob}
      />
    </>
  )
}
