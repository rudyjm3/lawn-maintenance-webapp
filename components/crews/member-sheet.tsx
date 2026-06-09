"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Pencil, Plus, Users, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet"
import { saveUser, removeFromCrew, addToCrew } from "@/app/actions/users"
import type { UserRole } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MemberWithCrews {
  id: string
  auth_user_id: string
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  email?: string
  crews: {
    id: string
    name: string
    is_active: boolean
    is_lead: boolean
    color: string | null
  }[]
}

export interface AvailableCrew {
  id: string
  name: string
  color: string | null
  is_active: boolean
}

interface MemberSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  member?: MemberWithCrews
  availableCrews?: AvailableCrew[]
}

interface MemberFormValues {
  first_name: string
  last_name: string
  role: UserRole
  is_active: boolean
  email: string
}

const ROLE_OPTIONS: { value: UserRole; label: string }[] = [
  { value: "owner",       label: "Owner" },
  { value: "manager",     label: "Manager" },
  { value: "crew_lead",   label: "Crew Lead" },
  { value: "crew_member", label: "Crew Member" },
]

// ─── Component ────────────────────────────────────────────────────────────────

export function MemberSheet({ open, onOpenChange, member, availableCrews = [] }: MemberSheetProps) {
  const [isSubmitting, setIsSubmitting]     = useState(false)
  const [removingCrewId, setRemovingCrewId] = useState<string | null>(null)
  const [localCrews, setLocalCrews]         = useState<MemberWithCrews["crews"]>([])
  const [addingCrew, setAddingCrew]         = useState(false)
  const [selectedCrewId, setSelectedCrewId] = useState<string>("")
  const [addAsLead, setAddAsLead]           = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<MemberFormValues>({
    defaultValues: { first_name: "", last_name: "", role: "crew_member", is_active: true, email: "" },
  })

  // eslint-disable-next-line react-hooks/incompatible-library
  const isActive = watch("is_active")
  // eslint-disable-next-line react-hooks/incompatible-library
  const role = watch("role")

  useEffect(() => {
    if (!open || !member) return
    reset({
      first_name: member.first_name,
      last_name:  member.last_name,
      role:       member.role,
      is_active:  member.is_active,
      email:      member.email ?? "",
    })
    setLocalCrews(member.crews)
    setAddingCrew(false)
    setSelectedCrewId("")
    setAddAsLead(false)
  }, [open, member, reset])

  async function handleRemoveFromCrew(crewId: string) {
    if (!member) return
    setRemovingCrewId(crewId)
    const result = await removeFromCrew(member.id, crewId)
    setRemovingCrewId(null)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    setLocalCrews((prev) => prev.filter((c) => c.id !== crewId))
    toast.success(result.message)
  }

  async function handleAddToCrew() {
    if (!member || !selectedCrewId) return
    setIsSubmitting(true)
    const result = await addToCrew(member.id, selectedCrewId, addAsLead)
    setIsSubmitting(false)
    if (!result.success) {
      toast.error(result.message)
      return
    }
    const crew = availableCrews.find((c) => c.id === selectedCrewId)
    if (crew) {
      setLocalCrews((prev) => [
        ...prev,
        { id: crew.id, name: crew.name, is_active: crew.is_active, is_lead: addAsLead, color: crew.color },
      ])
    }
    setAddingCrew(false)
    setSelectedCrewId("")
    setAddAsLead(false)
    toast.success(result.message)
  }

  async function onSubmit(data: MemberFormValues) {
    if (!member) return
    setIsSubmitting(true)

    const result = await saveUser({
      id:           member.id,
      first_name:   data.first_name,
      last_name:    data.last_name,
      role:         data.role,
      is_active:    data.is_active,
      email:        data.email.trim() || undefined,
    })

    setIsSubmitting(false)

    if (!result.success) {
      toast.error(result.message)
      return
    }

    toast.success(result.message)
    onOpenChange(false)
  }

  const activeCrews = localCrews
  const assignedCrewIds = new Set(localCrews.map((c) => c.id))
  const unassignedCrews = availableCrews.filter((c) => c.is_active && !assignedCrewIds.has(c.id))

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>Edit Member</SheetTitle>
          <SheetDescription>
            Update this team member&apos;s details and status.
          </SheetDescription>
        </SheetHeader>

        <form
          id="member-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          {/* First Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="first_name">
              First name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="first_name"
              {...register("first_name", { required: "First name is required" })}
            />
            {errors.first_name && (
              <p className="text-xs text-destructive">{errors.first_name.message}</p>
            )}
          </div>

          {/* Last Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="last_name">
              Last name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="last_name"
              {...register("last_name", { required: "Last name is required" })}
            />
            {errors.last_name && (
              <p className="text-xs text-destructive">{errors.last_name.message}</p>
            )}
          </div>

          {/* Email */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="crew@example.com"
              {...register("email", {
                validate: (v) =>
                  !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) || "Enter a valid email address.",
              })}
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
            <p className="text-xs text-muted-foreground">
              Changing this updates their login email.
            </p>
          </div>

          {/* Role */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="role">Role</Label>
            <Select value={role} onValueChange={(v) => setValue("role", v as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ROLE_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active member</p>
              <p className="text-xs text-muted-foreground">
                Inactive members cannot log in and are hidden from scheduling.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>

          {/* Crew assignments */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                <Label>Crew assignments</Label>
              </div>
              {!addingCrew && unassignedCrews.length > 0 && (
                <button
                  type="button"
                  onClick={() => setAddingCrew(true)}
                  className="flex items-center gap-1 rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  <Plus className="h-3 w-3" />
                  Add to crew
                </button>
              )}
            </div>

            {activeCrews.length === 0 ? (
              <div className="rounded-lg border border-dashed border-border px-3 py-3 text-center">
                <p className="text-sm text-muted-foreground">Not assigned to any crew</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {activeCrews.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
                  >
                    <span
                      className="inline-block h-3 w-3 shrink-0 rounded-full border border-border"
                      style={{ backgroundColor: c.color ?? "#6b7280" }}
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">{c.name}</span>
                    {c.is_lead && (
                      <Badge variant="default" className="text-xs">Lead</Badge>
                    )}
                    <button
                      type="button"
                      onClick={() => handleRemoveFromCrew(c.id)}
                      disabled={removingCrewId === c.id}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive disabled:opacity-50 transition-colors"
                      aria-label={`Remove from ${c.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {addingCrew && (
              <div className="flex flex-col gap-2 rounded-lg border border-border px-3 py-3">
                <Select value={selectedCrewId} onValueChange={setSelectedCrewId}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue placeholder="Select a crew…" />
                  </SelectTrigger>
                  <SelectContent>
                    {unassignedCrews.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        <span className="flex items-center gap-2">
                          <span
                            className="inline-block h-2.5 w-2.5 rounded-full"
                            style={{ backgroundColor: c.color ?? "#6b7280" }}
                          />
                          {c.name}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Switch
                      id="add-as-lead"
                      checked={addAsLead}
                      onCheckedChange={setAddAsLead}
                    />
                    <Label htmlFor="add-as-lead" className="text-sm font-normal">Add as crew lead</Label>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => { setAddingCrew(false); setSelectedCrewId(""); setAddAsLead(false) }}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={!selectedCrewId || isSubmitting}
                      onClick={handleAddToCrew}
                    >
                      Add
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="member-form" disabled={isSubmitting}>
            <Pencil className="mr-2 h-4 w-4" />
            {isSubmitting ? "Saving…" : "Save Changes"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
