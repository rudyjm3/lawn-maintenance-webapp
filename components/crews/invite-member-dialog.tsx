"use client"

import { useActionState, useState } from "react"
import { UserPlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { inviteCrewMember } from "@/app/actions/crew-invites"
import type { ActionState } from "@/app/actions/auth"

export function InviteMemberDialog() {
  const [open, setOpen] = useState(false)
  const [role, setRole] = useState("")
  const [state, action, pending] = useActionState<ActionState | null, FormData>(
    inviteCrewMember,
    null,
  )

  // Close and reset on success
  const wasSuccess = state?.success === true

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o)
        if (!o) setRole("")
      }}
    >
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Invite Member
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Invite Team Member</DialogTitle>
        </DialogHeader>

        {wasSuccess ? (
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">{state.message}</p>
            <Button className="w-full" onClick={() => { setOpen(false); setRole("") }}>
              Done
            </Button>
          </div>
        ) : (
          <form action={action} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="firstName">First name</Label>
                <Input
                  id="firstName"
                  name="firstName"
                  placeholder="Jane"
                  defaultValue={(state as ActionState & { fields?: Record<string, string> } | null)?.fields?.firstName ?? ""}
                  required
                />
                {!state?.success && state?.errors?.firstName && (
                  <p className="text-xs text-destructive">{state.errors.firstName[0]}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName">Last name</Label>
                <Input
                  id="lastName"
                  name="lastName"
                  placeholder="Smith"
                  defaultValue={(state as ActionState & { fields?: Record<string, string> } | null)?.fields?.lastName ?? ""}
                  required
                />
                {!state?.success && state?.errors?.lastName && (
                  <p className="text-xs text-destructive">{state.errors.lastName[0]}</p>
                )}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email address</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="jane@example.com"
                defaultValue={(state as ActionState & { fields?: Record<string, string> } | null)?.fields?.email ?? ""}
                required
              />
              {!state?.success && state?.errors?.email && (
                <p className="text-xs text-destructive">{state.errors.email[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              {/* Hidden input so FormData has the value */}
              <input type="hidden" name="role" value={role} />
              <Select value={role} onValueChange={setRole}>
                <SelectTrigger id="role">
                  <SelectValue placeholder="Select a role…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="crew_lead">Crew Lead</SelectItem>
                  <SelectItem value="crew_member">Crew Member</SelectItem>
                </SelectContent>
              </Select>
              {!state?.success && state?.errors?.role && (
                <p className="text-xs text-destructive">{state.errors.role[0]}</p>
              )}
            </div>

            {!state?.success && state?.message && !state.errors && (
              <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {state.message}
              </p>
            )}

            <Button type="submit" className="w-full" disabled={pending || !role}>
              {pending ? "Sending invite…" : "Send invite"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
