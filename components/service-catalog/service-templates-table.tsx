"use client"

import { useState, useTransition } from "react"
import { Plus, Pencil, Trash2, CalendarDays, Clock, RefreshCw } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { upsertServiceTemplate, deleteServiceTemplate } from "@/app/actions/service-templates"
import type { ServiceTemplate, ServiceType } from "@/types"

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const FREQUENCY_LABELS: Record<string, string> = {
  weekly: "Weekly",
  biweekly: "Biweekly",
  monthly: "Monthly",
  custom: "Custom / One-time",
}

function seasonLabel(start: number | null, end: number | null) {
  if (!start && !end) return "Year-round"
  const s = start ? MONTH_NAMES[start - 1] : "?"
  const e = end ? MONTH_NAMES[end - 1] : "?"
  return `${s} – ${e}`
}

interface Props {
  templates: ServiceTemplate[]
  serviceTypes: ServiceType[]
}

export function ServiceTemplatesTable({ templates: initial, serviceTypes }: Props) {
  const [templates, setTemplates] = useState(initial)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [editing, setEditing] = useState<ServiceTemplate | undefined>(undefined)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  // Form state
  const [name, setName] = useState("")
  const [frequency, setFrequency] = useState("weekly")
  const [serviceTypeId, setServiceTypeId] = useState<string>("none")
  const [seasonStart, setSeasonStart] = useState<string>("none")
  const [seasonEnd, setSeasonEnd] = useState<string>("none")
  const [durationMin, setDurationMin] = useState("")
  const [defaultPrice, setDefaultPrice] = useState("")
  const [instructions, setInstructions] = useState("")

  function openCreate() {
    setEditing(undefined)
    setName("")
    setFrequency("weekly")
    setServiceTypeId("none")
    setSeasonStart("none")
    setSeasonEnd("none")
    setDurationMin("")
    setDefaultPrice("")
    setInstructions("")
    setSheetOpen(true)
  }

  function openEdit(t: ServiceTemplate) {
    setEditing(t)
    setName(t.name)
    setFrequency(t.frequency)
    setServiceTypeId(t.service_type_id ?? "none")
    setSeasonStart(t.season_start_month ? String(t.season_start_month) : "none")
    setSeasonEnd(t.season_end_month ? String(t.season_end_month) : "none")
    setDurationMin(t.default_duration_min ? String(t.default_duration_min) : "")
    setDefaultPrice(t.default_price ? String(t.default_price) : "")
    setInstructions(t.instructions ?? "")
    setSheetOpen(true)
  }

  function handleSave() {
    if (!name.trim()) { toast.error("Name is required."); return }
    startTransition(async () => {
      const result = await upsertServiceTemplate({
        id: editing?.id,
        name: name.trim(),
        frequency,
        service_type_id: serviceTypeId === "none" ? null : serviceTypeId,
        season_start_month: seasonStart === "none" ? null : Number(seasonStart),
        season_end_month: seasonEnd === "none" ? null : Number(seasonEnd),
        default_duration_min: durationMin ? Number(durationMin) : null,
        default_price: defaultPrice ? Number(defaultPrice) : null,
        instructions: instructions.trim() || null,
      })
      if (!result.success) { toast.error(result.message); return }
      toast.success(editing ? "Template updated." : "Template created.")
      setSheetOpen(false)
      const updated = result.template!
      setTemplates((prev) =>
        editing
          ? prev.map((t) => (t.id === updated.id ? updated : t))
          : [updated, ...prev],
      )
    })
  }

  async function handleDelete(id: string) {
    if (confirmDeleteId !== id) { setConfirmDeleteId(id); return }
    setDeleting(id)
    setConfirmDeleteId(null)
    const result = await deleteServiceTemplate(id)
    setDeleting(null)
    if (!result.success) { toast.error(result.message); return }
    toast.success("Template deleted.")
    setTemplates((prev) => prev.filter((t) => t.id !== id))
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {templates.length} template{templates.length !== 1 ? "s" : ""}
        </p>
        <Button size="sm" onClick={openCreate}>
          <Plus className="mr-1 h-4 w-4" />
          New Template
        </Button>
      </div>

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card py-12 text-center">
          <CalendarDays className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">No templates yet</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Create reusable service patterns to speed up onboarding new properties.
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="px-4 py-3 text-left font-medium text-muted-foreground">Template</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden sm:table-cell">Frequency</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden md:table-cell">Season</th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground hidden lg:table-cell">Duration</th>
                <th className="w-24" />
              </tr>
            </thead>
            <tbody>
              {templates.map((t, i) => (
                <tr
                  key={t.id}
                  className={`border-b border-border last:border-0 ${i % 2 === 0 ? "" : "bg-muted/10"}`}
                >
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-0.5">
                      <span className="font-medium text-foreground">{t.name}</span>
                      {t.service_type && (
                        <span className="text-xs text-muted-foreground">{t.service_type.name}</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell">
                    <Badge variant="secondary" className="text-xs capitalize">
                      {FREQUENCY_LABELS[t.frequency] ?? t.frequency}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">
                    {seasonLabel(t.season_start_month, t.season_end_month)}
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground">
                    {t.default_duration_min ? (
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {t.default_duration_min} min
                      </span>
                    ) : "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7"
                        onClick={() => openEdit(t)}
                        title="Edit"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className={`h-7 w-7 ${confirmDeleteId === t.id ? "text-destructive" : ""}`}
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        title={confirmDeleteId === t.id ? "Click again to confirm" : "Delete"}
                      >
                        {deleting === t.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editing ? "Edit Template" : "New Service Template"}</SheetTitle>
            <SheetDescription>
              Templates let you quickly apply a pre-configured recurring service to any property.
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 flex flex-col gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="tpl-name">Name</Label>
              <Input
                id="tpl-name"
                placeholder="e.g. Weekly Mow (May – Oct)"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-service-type">Service type (optional)</Label>
              <Select value={serviceTypeId} onValueChange={setServiceTypeId}>
                <SelectTrigger id="tpl-service-type">
                  <SelectValue placeholder="Any / unspecified" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Any / unspecified</SelectItem>
                  {serviceTypes.map((st) => (
                    <SelectItem key={st.id} value={st.id}>{st.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-frequency">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger id="tpl-frequency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="biweekly">Biweekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="custom">Custom / One-time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-season-start">Season start</Label>
                <Select value={seasonStart} onValueChange={setSeasonStart}>
                  <SelectTrigger id="tpl-season-start">
                    <SelectValue placeholder="Year-round" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Year-round</SelectItem>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-season-end">Season end</Label>
                <Select value={seasonEnd} onValueChange={setSeasonEnd}>
                  <SelectTrigger id="tpl-season-end">
                    <SelectValue placeholder="Year-round" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Year-round</SelectItem>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={i + 1} value={String(i + 1)}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="tpl-duration">Duration (min)</Label>
                <Input
                  id="tpl-duration"
                  type="number"
                  min={1}
                  placeholder="e.g. 45"
                  value={durationMin}
                  onChange={(e) => setDurationMin(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="tpl-price">Default price ($)</Label>
                <Input
                  id="tpl-price"
                  type="number"
                  min={0}
                  step={0.01}
                  placeholder="e.g. 65.00"
                  value={defaultPrice}
                  onChange={(e) => setDefaultPrice(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="tpl-instructions">Instructions (optional)</Label>
              <Textarea
                id="tpl-instructions"
                placeholder="Step-by-step instructions shown to crew on the job detail page."
                rows={3}
                value={instructions}
                onChange={(e) => setInstructions(e.target.value)}
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={handleSave} disabled={isPending}>
                {isPending ? "Saving…" : editing ? "Save Changes" : "Create Template"}
              </Button>
              <Button variant="outline" onClick={() => setSheetOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
