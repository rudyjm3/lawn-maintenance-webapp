"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { toast } from "sonner"
import { Plus, X, Shield, Pencil, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
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
import { saveCrew, saveCrewMembers } from "@/app/actions/crews"
import type { Crew, User } from "@/types"

// ─── Types ────────────────────────────────────────────────────────────────────

interface MemberEntry {
  userId: string
  isLead: boolean
  user: User
}

interface CrewWithMembers extends Crew {
  members?: (User & { is_lead?: boolean })[]
}

interface CrewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  crew?: CrewWithMembers
  allUsers: User[]
}

interface CrewFormValues {
  name: string
  description: string
  is_active: boolean
}

// ─── Component ────────────────────────────────────────────────────────────────

export function CrewSheet({ open, onOpenChange, crew, allUsers }: CrewSheetProps) {
  const isEditing   = !!crew
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [members, setMembers]           = useState<MemberEntry[]>([])
  const [addUserId, setAddUserId]       = useState<string>("")

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CrewFormValues>({
    defaultValues: { name: "", description: "", is_active: true },
  })

  const isActive = watch("is_active")

  // Seed form when opening
  useEffect(() => {
    if (!open) return
    if (crew) {
      reset({
        name:        crew.name,
        description: crew.description ?? "",
        is_active:   crew.is_active,
      })
      setMembers(
        (crew.members ?? []).map((u) => ({
          userId: u.id,
          isLead: u.is_lead ?? false,
          user:   u,
        })),
      )
    } else {
      reset({ name: "", description: "", is_active: true })
      setMembers([])
    }
    setAddUserId("")
  }, [open, crew, reset])

  // Users not already in the member list
  const availableUsers = allUsers.filter(
    (u) => !members.some((m) => m.userId === u.id),
  )

  function addMember() {
    const user = availableUsers.find((u) => u.id === addUserId)
    if (!user) return
    setMembers((prev) => [...prev, { userId: user.id, isLead: false, user }])
    setAddUserId("")
  }

  function removeMember(userId: string) {
    setMembers((prev) => prev.filter((m) => m.userId !== userId))
  }

  function toggleLead(userId: string) {
    setMembers((prev) =>
      prev.map((m) => (m.userId === userId ? { ...m, isLead: !m.isLead } : m)),
    )
  }

  async function onSubmit(data: CrewFormValues) {
    setIsSubmitting(true)

    const crewResult = await saveCrew({
      id:          crew?.id,
      name:        data.name,
      description: data.description,
      is_active:   data.is_active,
    })

    if (!crewResult.success) {
      toast.error(crewResult.message)
      setIsSubmitting(false)
      return
    }

    const crewId = crewResult.crewId!
    const membersResult = await saveCrewMembers({
      crewId,
      members: members.map((m) => ({ userId: m.userId, isLead: m.isLead })),
    })

    setIsSubmitting(false)

    if (!membersResult.success) {
      toast.error(membersResult.message)
      return
    }

    toast.success(crewResult.message)
    onOpenChange(false)
  }

  const roleLabel = (role: string) => {
    const labels: Record<string, string> = {
      owner: "Owner", manager: "Manager", crew_lead: "Crew Lead", crew_member: "Crew",
    }
    return labels[role] ?? role
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEditing ? "Edit Crew" : "New Crew"}</SheetTitle>
          <SheetDescription>
            {isEditing
              ? "Update crew details and manage members."
              : "Create a crew and assign team members."}
          </SheetDescription>
        </SheetHeader>

        <form
          id="crew-form"
          onSubmit={handleSubmit(onSubmit)}
          className="flex flex-col gap-5 px-4 py-2"
        >
          {/* Name */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">
              Crew name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="name"
              placeholder="e.g. Crew A, North Team"
              {...register("name", { required: "Crew name is required" })}
            />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* Description */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              rows={2}
              placeholder="Optional notes about this crew…"
              {...register("description")}
            />
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">Active crew</p>
              <p className="text-xs text-muted-foreground">
                Inactive crews are hidden from route planning.
              </p>
            </div>
            <Switch
              checked={isActive}
              onCheckedChange={(v) => setValue("is_active", v)}
            />
          </div>

          {/* ── Members ── */}
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <Label>Members ({members.length})</Label>
            </div>

            {/* Member list */}
            {members.length > 0 && (
              <div className="flex flex-col gap-2">
                {members.map((m) => (
                  <div
                    key={m.userId}
                    className="flex items-center gap-2 rounded-lg border border-border px-3 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {m.user.first_name} {m.user.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground capitalize">
                        {roleLabel(m.user.role)}
                      </p>
                    </div>
                    {/* Lead toggle */}
                    <button
                      type="button"
                      onClick={() => toggleLead(m.userId)}
                      title={m.isLead ? "Remove lead" : "Set as lead"}
                      className={`flex h-7 items-center gap-1 rounded px-2 text-xs font-medium transition-colors ${
                        m.isLead
                          ? "bg-primary text-primary-foreground"
                          : "border border-border text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      <Shield className="h-3 w-3" />
                      Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => removeMember(m.userId)}
                      className="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      aria-label="Remove member"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add member row */}
            {availableUsers.length > 0 && (
              <div className="flex gap-2">
                <Select value={addUserId} onValueChange={setAddUserId}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select a user to add…" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>
                        {u.first_name} {u.last_name}{" "}
                        <span className="text-muted-foreground">· {roleLabel(u.role)}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="outline"
                  onClick={addMember}
                  disabled={!addUserId}
                  className="shrink-0"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            )}

            {availableUsers.length === 0 && members.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No users available. Add users under Settings first.
              </p>
            )}
            {availableUsers.length === 0 && members.length > 0 && (
              <p className="text-xs text-muted-foreground">All users are assigned to this crew.</p>
            )}
          </div>
        </form>

        <SheetFooter className="border-t pt-4">
          <SheetClose asChild>
            <Button variant="outline" type="button">Cancel</Button>
          </SheetClose>
          <Button type="submit" form="crew-form" disabled={isSubmitting}>
            {isEditing ? <Pencil className="mr-2 h-4 w-4" /> : <Plus className="mr-2 h-4 w-4" />}
            {isSubmitting ? "Saving…" : isEditing ? "Save Changes" : "Create Crew"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
